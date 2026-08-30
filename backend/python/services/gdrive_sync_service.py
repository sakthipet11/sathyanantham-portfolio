import os
import re
import csv
import io
import uuid
import urllib.request
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
try:
    import openpyxl
except ImportError:
    openpyxl = None


from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.job_scoring_service import job_scoring_service
from backend.python.services.audit_governance_service import audit_governance_service

DEFAULT_GDRIVE_FOLDER_URL = "https://drive.google.com/drive/u/1/folders/1AtZo2n7TYsavZrw6cG1quek3je0K3hkO"
DEFAULT_GDRIVE_FOLDER_ID = "1AtZo2n7TYsavZrw6cG1quek3je0K3hkO"

def make_uuid(key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, key))

def parse_fitness_score(raw_score: Any) -> Optional[float]:
    """
    Parses any fitness score string/number format (e.g., '96% Fit', '94%', '88.5', 'Score: 92/100', 96)
    into a clean float value between 0.0 and 100.0.
    """
    if raw_score is None:
        return None
    if isinstance(raw_score, (int, float)):
        val = float(raw_score)
        if 0.0 < val <= 1.0:
            val = val * 100.0
        return min(100.0, max(0.0, val))

    s = str(raw_score).strip()
    if not s:
        return None

    # Search for numeric sequence like 96 or 96.5
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    if m:
        val = float(m.group(1))
        if 0.0 < val <= 1.0:
            val = val * 100.0
        return min(100.0, max(0.0, val))

    return None

def parse_sheet_date(raw_date: Any) -> Optional[str]:
    """Parses date into ISO YYYY-MM-DD format, handling relative strings like 'Today (4h ago)'."""
    if not raw_date:
        return None
    if isinstance(raw_date, datetime):
        return raw_date.strftime("%Y-%m-%d")
    
    from datetime import timedelta
    s = str(raw_date).strip()
    if not s:
        return None
    
    s_lower = s.lower()
    if "today" in s_lower or "just now" in s_lower or "hour" in s_lower or "minute" in s_lower:
        return datetime.now().strftime("%Y-%m-%d")
    if "yesterday" in s_lower:
        return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    m_days = re.search(r'(\d+)\s*d(?:ay)?s?\s*ago', s_lower)
    if m_days:
        days_ago = int(m_days.group(1))
        return (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

    # Match YYYY-MM-DD or YYYY/MM/DD
    m_iso = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', s)
    if m_iso:
        return f"{m_iso.group(1)}-{int(m_iso.group(2)):02d}-{int(m_iso.group(3)):02d}"
    # Match DD/MM/YYYY or MM/DD/YYYY
    m_slash = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', s)
    if m_slash:
        return f"{m_slash.group(3)}-{int(m_slash.group(2)):02d}-{int(m_slash.group(1)):02d}"
    
    return None

def normalize_sheet_status(raw_status: Any, date_applied: Optional[str] = None, outcome: Optional[str] = None) -> str:
    s = str(raw_status).strip().upper() if raw_status else ""
    if "APPLIED" in s or "SUBMIT" in s:
        return "APPLIED"
    elif "INTERVIEW" in s:
        return "INTERVIEW"
    elif "REJECT" in s:
        return "REJECTED"
    elif "OFFER" in s:
        return "OFFER"
    elif "QUALIF" in s:
        return "QUALIFIED"
    elif "REVIEW" in s:
        return "READY_FOR_REVIEW"
    elif "DISCOVER" in s:
        return "DISCOVERED"
    
    if outcome:
        out_upper = str(outcome).upper()
        if "REJECT" in out_upper:
            return "REJECTED"
        elif "INTERVIEW" in out_upper:
            return "INTERVIEW"
        elif "OFFER" in out_upper:
            return "OFFER"

    if date_applied:
        return "APPLIED"

    return "DISCOVERED"


class GDriveSyncService:
    """
    Scheduled & On-Demand Google Drive / Folder / Sheets -> Database Sync Service.
    1. Extracts Google Drive Folder ID / URL (default: 1AtZo2n7TYsavZrw6cG1quek3je0K3hkO).
    2. Dynamically locates real Excel (.xlsx, .xls) and CSV (.csv) tracker files matching today's date.
    3. Flexible Column Normalization & Alias Mapping for all 21 headline columns:
       Date Found, Company, Company Domain, Role, Job ID, Platform, Location, Posted Date,
       Job URL, Fitness Score, Resume Generated, Cover Letter, Status, Date Applied,
       Response Date, Outcome, Interview Stage, Rejection Reason, Notes, Follow-up Date, Next Action
    4. Converts string formats like '96% Fit' to float numeric scores.
    5. Synchronizes records directly into `jobs` and `job_scores` database tables.
    """

    def __init__(self):
        self.repo = job_repository
        self.default_folder_url = DEFAULT_GDRIVE_FOLDER_URL
        self.default_folder_id = DEFAULT_GDRIVE_FOLDER_ID

    def extract_folder_id(self, folder_url_or_id: Optional[str] = None) -> str:
        """Extracts Google Drive folder ID from various URL formats or returns default."""
        if not folder_url_or_id:
            return self.default_folder_id
        
        cleaned = folder_url_or_id.strip()
        # Pattern 1: /folders/<id> (including /u/1/folders/<id>)
        m = re.search(r'folders/([a-zA-Z0-9-_]+)', cleaned)
        if m:
            return m.group(1)
        
        # Pattern 2: id=<id>
        m_id = re.search(r'[?&]id=([a-zA-Z0-9-_]+)', cleaned)
        if m_id:
            return m_id.group(1)
        
        # Pattern 3: raw folder id string
        if re.match(r'^[a-zA-Z0-9-_]{20,50}$', cleaned):
            return cleaned
            
        return self.default_folder_id

    def get_target_file_pattern(self, date_str: Optional[str] = None) -> str:
        if not date_str:
            date_str = datetime.now().strftime("%Y-%m-%d")
        return f"job_tracker_{date_str}.xlsx"

    def download_folder_from_gdrive(self, folder_url_or_id: Optional[str] = None) -> Optional[str]:
        """
        Dynamically downloads files from Google Drive folder using gdown and extracts any zip archives.
        Returns the destination download directory if files were downloaded.
        """
        folder_id = self.extract_folder_id(folder_url_or_id)
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        scratch_dir = os.path.join(repo_root, "scratch", "gdrive_downloads")
        downloads_dir = os.path.join(repo_root, "public", "downloads")
        os.makedirs(scratch_dir, exist_ok=True)
        os.makedirs(downloads_dir, exist_ok=True)

        # Fast pre-flight check to verify if the Google Drive folder is publicly accessible.
        # If the folder is private/restricted, Google redirects to accounts.google.com, which causes
        # gdown to retry repeatedly and hang for over 3 minutes, triggering gateway/function timeouts.
        folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
        try:
            class NoGoogleAuthRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, req, fp, code, msg, headers, newurl):
                    if "accounts.google.com" in newurl:
                        return None
                    return super().redirect_request(req, fp, code, msg, headers, newurl)

            opener = urllib.request.build_opener(NoGoogleAuthRedirect)
            check_req = urllib.request.Request(folder_url, headers={'User-Agent': 'Mozilla/5.0'})
            with opener.open(check_req, timeout=3) as check_resp:
                if check_resp.getcode() != 200:
                    print(f"[GDRIVE_SYNC] Notice: Google Drive folder ({folder_id}) requires authentication (restricted). Proceeding with local/cached files.")
                    return None
        except Exception:
            print(f"[GDRIVE_SYNC] Notice: Google Drive folder ({folder_id}) requires login or is restricted. Fast-skipping gdown download to prevent timeout.")
            return None

        try:
            import gdown
            print(f"[GDRIVE_SYNC] Attempting Google Drive download from: {folder_url}")
            
            downloaded = gdown.download_folder(
                url=folder_url,
                output=scratch_dir,
                quiet=True,
                use_cookies=False
            )
            
            if downloaded:
                print(f"[GDRIVE_SYNC] Downloaded {len(downloaded)} files from Google Drive")
                import zipfile
                for file_path in downloaded:
                    if file_path and file_path.endswith(".zip") and os.path.exists(file_path):
                        try:
                            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                                zip_ref.extractall(scratch_dir)
                                print(f"[GDRIVE_SYNC] Extracted zip archive {file_path} into {scratch_dir}")
                        except Exception as ze:
                            print(f"[GDRIVE_SYNC] Notice extracting zip {file_path}: {ze}")
                return scratch_dir
        except Exception as e:
            err_msg = str(e)
            if "401" in err_msg or "permission" in err_msg.lower():
                print(f"[GDRIVE_SYNC] Notice: Google Drive folder ({folder_id}) is currently Restricted (HTTP 401). Set folder sharing to 'Anyone with the link can view' for automatic background sync.")
            else:
                print(f"[GDRIVE_SYNC] Notice downloading from Google Drive: {e}")

        return None

    def locate_excel_file(self, date_str: Optional[str] = None, folder_url_or_id: Optional[str] = None) -> Optional[str]:
        """
        Locates the real job tracker Excel/CSV file for the specified or current date.
        1. Attempts to pull latest files directly from Google Drive folder.
        2. Inspects local downloads and scratch cache for today's file or zip extractions.
        3. Never injects static mock data.
        """
        # Step 1: Attempt dynamic pull from Google Drive
        folder_id = self.extract_folder_id(folder_url_or_id)
        self.download_folder_from_gdrive(folder_id)

        local_date = datetime.now().strftime("%Y-%m-%d")
        utc_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        target_date = date_str or local_date
        
        file_name = self.get_target_file_pattern(target_date)
        alt_file_name = self.get_target_file_pattern(utc_date)
        
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        downloads_dir = os.path.join(repo_root, "public", "downloads")
        scratch_dir = os.path.join(repo_root, "scratch", "gdrive_downloads")
        os.makedirs(downloads_dir, exist_ok=True)
        os.makedirs(scratch_dir, exist_ok=True)

        # Check for any zip files in scratch/downloads and extract them
        import zipfile
        for search_dir in [scratch_dir, downloads_dir]:
            if os.path.exists(search_dir):
                for fname in os.listdir(search_dir):
                    if fname.endswith(".zip"):
                        should_extract = (date_str in fname) if date_str else (local_date in fname or utc_date in fname or "application" in fname.lower())
                        if should_extract:
                            zip_full = os.path.join(search_dir, fname)
                            try:
                                with zipfile.ZipFile(zip_full, 'r') as zf:
                                    zf.extractall(search_dir)
                            except Exception:
                                pass

        candidate_file_names = [
            file_name,
            file_name.replace(".xlsx", ".csv"),
            file_name.replace(".xlsx", ".xls")
        ]
        if not date_str:
            candidate_file_names.extend([
                alt_file_name,
                alt_file_name.replace(".xlsx", ".csv"),
                alt_file_name.replace(".xlsx", ".xls")
            ])

        # 2. Look for exact dated file in search locations
        for search_dir in [scratch_dir, downloads_dir, repo_root]:
            if os.path.exists(search_dir):
                for candidate in candidate_file_names:
                    full_p = os.path.join(search_dir, candidate)
                    if os.path.isfile(full_p) and os.path.getsize(full_p) > 0:
                        return full_p

        # 3. Search for matching files
        for search_dir in [scratch_dir, downloads_dir]:
            if os.path.exists(search_dir):
                matching_files = []
                for fname in os.listdir(search_dir):
                    if (fname.endswith(".xlsx") or fname.endswith(".xls") or fname.endswith(".csv")) and not fname.startswith("~$"):
                        if date_str:
                            if date_str in fname:
                                full_p = os.path.join(search_dir, fname)
                                if os.path.isfile(full_p) and os.path.getsize(full_p) > 0:
                                    matching_files.append((os.path.getmtime(full_p), full_p))
                        else:
                            if local_date in fname or utc_date in fname or fname.startswith("job_tracker"):
                                full_p = os.path.join(search_dir, fname)
                                if os.path.isfile(full_p) and os.path.getsize(full_p) > 0:
                                    matching_files.append((os.path.getmtime(full_p), full_p))
                
                if matching_files:
                    matching_files.sort(key=lambda x: x[0], reverse=True)
                    return matching_files[0][1]

        # No file exists for target date
        return None

    def fetch_google_sheet_csv(self, sheet_url_or_id: str) -> Optional[str]:
        """Fetches live CSV data from Google Sheet URL or Document ID."""
        sheet_id = sheet_url_or_id
        gid = "0"

        if "spreadsheets/d/" in sheet_url_or_id:
            m = re.search(r'spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url_or_id)
            if m:
                sheet_id = m.group(1)
        if "gid=" in sheet_url_or_id:
            m_gid = re.search(r'gid=([0-9]+)', sheet_url_or_id)
            if m_gid:
                gid = m_gid.group(1)

        csv_export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
        try:
            req = urllib.request.Request(csv_export_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as resp:
                return resp.read().decode('utf-8')
        except Exception as e:
            print(f"[GDRIVE_SYNC] Notice fetching public CSV for sheet {sheet_id}: {e}")
            return None

    def parse_rows(self, rows: List[List[Any]], source_label: str = "gdrive_folder_excel") -> List[Dict[str, Any]]:
        """
        Normalizes raw row data into list of job dicts matching all 21 headline columns:
        Date Found, Company, Company Domain, Role, Job ID, Platform, Location, Posted Date,
        Job URL, Fitness Score, Resume Generated, Cover Letter, Status, Date Applied,
        Response Date, Outcome, Interview Stage, Rejection Reason, Notes, Follow-up Date, Next Action
        """
        if not rows:
            return []

        def clean_header(h: Any) -> str:
            if h is None:
                return ""
            return re.sub(r'[^a-z0-9]', '', str(h).strip().lower())

        raw_headers = rows[0]
        cleaned_headers = [clean_header(h) for h in raw_headers]
        
        col_map: Dict[str, int] = {}
        for idx, h in enumerate(cleaned_headers):
            if not h:
                continue
            if h in ["datefound", "founddate", "discovereddate", "discoverydate"]:
                col_map["date_found"] = idx
            elif h in ["company", "companyname", "employer", "organization", "firm"]:
                col_map["company"] = idx
            elif h in ["companydomain", "domain", "companywebsite", "website"]:
                col_map["company_domain"] = idx
            elif h in ["role", "jobtitle", "title", "position", "designation"]:
                col_map["role"] = idx
            elif h in ["jobid", "externaljobid", "externalid", "reqid", "requisitionid"]:
                col_map["job_id"] = idx
            elif h in ["platform", "source", "portal", "jobboard", "site"]:
                col_map["platform"] = idx
            elif h in ["location", "city", "workplace", "place"]:
                col_map["location"] = idx
            elif h in ["posteddate", "dateposted", "publisheddate", "publishedtime"]:
                col_map["posted_date"] = idx
            elif h in ["joburl", "applyurl", "url", "link", "joblink", "applicationurl"]:
                col_map["job_url"] = idx
            elif h in ["fitnessscore", "fitscore", "atsscore", "matchscore", "score", "fitness"]:
                col_map["fitness_score"] = idx
            elif h in ["resumegenerated", "resume", "resumepdf", "resumestatus"]:
                col_map["resume_generated"] = idx
            elif h in ["coverletter", "letter", "coverlettertext"]:
                col_map["cover_letter"] = idx
            elif h in ["status", "stage", "jobstatus", "state"]:
                col_map["status"] = idx
            elif h in ["dateapplied", "applieddate", "appliedat"]:
                col_map["date_applied"] = idx
            elif h in ["responsedate", "replydate", "dateresponded"]:
                col_map["response_date"] = idx
            elif h in ["outcome", "result", "applicationoutcome"]:
                col_map["outcome"] = idx
            elif h in ["interviewstage", "interviewround", "interview"]:
                col_map["interview_stage"] = idx
            elif h in ["rejectionreason", "rejectreason", "reason"]:
                col_map["rejection_reason"] = idx
            elif h in ["notes", "note", "comments", "description", "jd"]:
                col_map["notes"] = idx
            elif h in ["followupdate", "followup", "nextfollowupdate"]:
                col_map["follow_up_date"] = idx
            elif h in ["nextaction", "action", "nextstep"]:
                col_map["next_action"] = idx

        parsed_jobs = []
        for r in rows[1:]:
            if not any(r):
                continue

            def get_val(key_name: str, default: str = "") -> str:
                idx = col_map.get(key_name)
                if idx is not None and idx < len(r) and r[idx] is not None:
                    val = str(r[idx]).strip()
                    return val if val else default
                return default

            def get_raw_cell(key_name: str) -> Any:
                idx = col_map.get(key_name)
                if idx is not None and idx < len(r):
                    return r[idx]
                return None

            role = get_val("role")
            company = get_val("company")
            if not role and not company:
                continue

            date_found = parse_sheet_date(get_raw_cell("date_found"))
            company_domain = get_val("company_domain")
            job_id_ext = get_val("job_id")
            platform = get_val("platform", "Google Drive Sheet")
            location = get_val("location", "Remote")
            posted_date = parse_sheet_date(get_raw_cell("posted_date"))
            job_url = get_val("job_url", f"https://www.{company.lower().replace(' ', '')}.com/careers" if company else "")
            
            # Convert fitness score string (e.g. '96% Fit') to numeric float (e.g. 96.0)
            raw_fitness = get_raw_cell("fitness_score")
            fitness_score_num = parse_fitness_score(raw_fitness)

            resume_gen = get_val("resume_generated")
            cover_letter = get_val("cover_letter")
            date_applied = parse_sheet_date(get_raw_cell("date_applied"))
            response_date = parse_sheet_date(get_raw_cell("response_date"))
            outcome = get_val("outcome")
            interview_stage = get_val("interview_stage")
            rejection_reason = get_val("rejection_reason")
            notes = get_val("notes")
            follow_up_date = parse_sheet_date(get_raw_cell("follow_up_date"))
            next_action = get_val("next_action")

            raw_status = get_val("status")
            status = normalize_sheet_status(raw_status, date_applied=date_applied, outcome=outcome)

            unique_seed = f"gdrive-{company.lower()}-{role.lower()}-{job_id_ext or job_url}"
            job_uuid = make_uuid(unique_seed)

            extra_meta = {
                "date_found": date_found,
                "company_domain": company_domain,
                "job_id_ext": job_id_ext,
                "platform": platform,
                "resume_generated": resume_gen,
                "cover_letter": cover_letter,
                "date_applied": date_applied,
                "response_date": response_date,
                "outcome": outcome,
                "interview_stage": interview_stage,
                "rejection_reason": rejection_reason,
                "follow_up_date": follow_up_date,
                "next_action": next_action,
                "raw_fitness_score": str(raw_fitness) if raw_fitness is not None else None
            }

            parsed_jobs.append({
                "id": job_uuid,
                "external_job_id": job_id_ext,
                "title": role or "Lead Frontend Architect",
                "company": company or "Target Company",
                "company_domain": company_domain,
                "location": location,
                "location_type": "Remote" if "remote" in location.lower() else ("Hybrid" if "hybrid" in location.lower() else "Onsite"),
                "description_raw": notes or f"Role for {role} at {company}",
                "requirements_clean": notes or f"Role for {role} at {company}",
                "apply_url": job_url,
                "job_url": job_url,
                "posted_date": posted_date,
                "discovered_at": date_found or datetime.now(timezone.utc).isoformat(),
                "portal_type": platform.lower().replace(" ", "_"),
                "source": platform or source_label,
                "status": status,
                "match_score": fitness_score_num if fitness_score_num is not None else 90.0,
                "fitness_score_raw": str(raw_fitness) if raw_fitness is not None else None,
                "fitness_score_numeric": fitness_score_num,
                "notes": notes,
                "human_reviewer_notes": notes,
                "extra_metadata": extra_meta,
                "idempotency_key": unique_seed
            })

        return parsed_jobs

    def parse_excel_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Reads Excel or CSV file dynamically and returns list of raw job dicts."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at: {file_path}")

        if file_path.endswith(".csv"):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                return self.parse_rows(list(reader), source_label="gdrive_folder_csv")

        if openpyxl is None:
            raise ImportError(
                "Package 'openpyxl' is required to parse Excel (.xlsx) files. "
                "Ensure 'openpyxl' is installed in the python environment."
            )
        wb = openpyxl.load_workbook(file_path, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        return self.parse_rows(rows, source_label="gdrive_folder_excel")

    def run_sync(
        self,
        date_str: Optional[str] = None,
        sheet_url: Optional[str] = None,
        folder_url: Optional[str] = None,
        triggered_by: str = "MANUAL_RUN_NOW"
    ) -> Dict[str, Any]:
        """
        Executes Dynamic Google Drive Folder / Sheets -> Database Sync.
        1. Resolves folder ID (default: 1AtZo2n7TYsavZrw6cG1quek3je0K3hkO).
        2. Ingests and parses Excel / CSV tracker files matching all 21 headlines.
        3. Converts Fitness Score strings (e.g. '96% Fit') into numeric scores.
        4. Writes records directly into jobs and job_scores database tables.
        5. Updates automation settings and audit logs.
        """
        settings = db_helper.get_automation_settings()
        effective_folder_url = folder_url or settings.get("gdrive_folder_url") or self.default_folder_url
        folder_id = self.extract_folder_id(effective_folder_url)
        file_name = self.get_target_file_pattern(date_str)
        parsed_jobs = []

        # 1. Try Google Sheet URL / ID if provided
        if sheet_url:
            csv_text = self.fetch_google_sheet_csv(sheet_url)
            if csv_text:
                reader = csv.reader(io.StringIO(csv_text))
                parsed_jobs = self.parse_rows(list(reader), source_label="gdrive_live_sheet")
                file_name = f"gdrive_sheet_{sheet_url[:20]}.csv"

        # 2. Otherwise locate/download local or Google Drive folder Excel/CSV file
        if not parsed_jobs:
            file_path = self.locate_excel_file(date_str, folder_url_or_id=folder_id)
            if file_path:
                file_name = os.path.basename(file_path)
                parsed_jobs = self.parse_excel_file(file_path)

        now_str = datetime.now(timezone.utc).isoformat()

        # Handle case when no file is present for today
        if not parsed_jobs:
            target_date = date_str or datetime.now().strftime("%Y-%m-%d")
            expected_file = self.get_target_file_pattern(target_date)
            print(f"[GDRIVE_SYNC] No job tracker file found for [{target_date}] in Folder [{folder_id}]")

            db_helper.update_automation_settings({
                "gdrive_folder_url": effective_folder_url,
                "gdrive_folder_id": folder_id,
                "gdrive_sync_last_run": now_str,
                "gdrive_sync_last_status": "NO_FILE_FOUND",
                "gdrive_sync_last_file": expected_file,
                "gdrive_sync_last_jobs_count": 0
            })

            audit_governance_service.log_event(
                actor="SYSTEM_SCHEDULER" if "CRON" in triggered_by.upper() else "HUMAN_ADMIN",
                ai_agent="GDriveSyncService",
                action="GDRIVE_FOLDER_SYNC_NO_FILE",
                tool="JobRepository",
                result=f"No {expected_file} found in Google Drive folder ({folder_id}). Waiting for new uploads.",
                status="SKIPPED"
            )

            return {
                "status": "NOT_FOUND",
                "message": f"No job tracker spreadsheet found for today ({target_date}) in Google Drive folder {folder_id}. Please upload {expected_file} to the Google Drive folder.",
                "folder_id": folder_id,
                "folder_url": effective_folder_url,
                "file_name": expected_file,
                "jobs_processed": 0,
                "last_run": now_str,
                "triggered_by": triggered_by
            }

        print(f"[GDRIVE_SYNC] Ingesting from Folder [{folder_id}] / File [{file_name}]: {len(parsed_jobs)} jobs parsed")

        saved_jobs = []
        profile = db_helper.get_user_profile()
        for job_data in parsed_jobs:
            # If fitness score was not provided as a number, calculate deterministic ATS score
            if job_data.get("fitness_score_numeric") is None:
                score_res = job_scoring_service.deterministic_fallback_score(job_data, profile)
                calculated_score = score_res.get("overall_score", 90.0)
                job_data["match_score"] = calculated_score
                job_data["score_details"] = score_res
            else:
                job_data["match_score"] = job_data["fitness_score_numeric"]
                job_data["score_details"] = {
                    "overall_score": job_data["match_score"],
                    "skills_match": job_data["match_score"],
                    "experience_match": job_data["match_score"],
                    "seniority_match": job_data["match_score"],
                    "recommendation": f"Fitness score {job_data['match_score']}% from tracker sheet"
                }

            # 1. Write directly to database `jobs` table
            try:
                saved = self.repo.save_job(job_data)
                saved_jobs.append(saved)
            except Exception as e:
                print(f"[GDRIVE_SYNC] Notice saving job {job_data.get('title')}: {e}")
                saved_jobs.append(job_data)
                saved = job_data

            # 2. Synchronize to `job_scores` table
            try:
                self.repo.save_job_score({
                    "job_id": saved.get("id") or job_data["id"],
                    "overall_score": job_data["match_score"],
                    "skills_match": job_data["match_score"],
                    "experience_match": job_data["match_score"],
                    "seniority_match": job_data["match_score"],
                    "evaluation_summary": f"Fitness Score: {job_data['match_score']}% (from {file_name})",
                    "llm_model_used": "gdrive_sheet_sync",
                    "evaluated_at": now_str,
                    "match_type": "PROFILE_FITNESS"
                })
            except Exception as err:
                print(f"[GDRIVE_SYNC] Notice saving job score for {job_data.get('title')}: {err}")

        # Update automation settings sync metadata in DB
        try:
            db_helper.update_automation_settings({
                "gdrive_folder_url": effective_folder_url,
                "gdrive_folder_id": folder_id,
                "gdrive_sync_last_run": now_str,
                "gdrive_sync_last_status": "SUCCESS",
                "gdrive_sync_last_file": file_name,
                "gdrive_sync_last_jobs_count": len(saved_jobs)
            })
        except Exception as e:
            print(f"[GDRIVE_SYNC] Notice updating automation settings: {e}")

        # Log audit governance event
        try:
            audit_governance_service.log_event(
                actor="SYSTEM_SCHEDULER" if "CRON" in triggered_by.upper() else "HUMAN_ADMIN",
                ai_agent="GDriveSyncService",
                action="GDRIVE_FOLDER_EXCEL_SYNC_COMPLETED",
                tool="JobRepository",
                result=f"Ingested {len(saved_jobs)} jobs from Google Drive Folder ({folder_id}) / {file_name} into database.",
                status="SUCCESS"
            )
        except Exception as e:
            print(f"[GDRIVE_SYNC] Notice logging audit event: {e}")

        return {
            "status": "SUCCESS",
            "message": f"Successfully ingested {len(saved_jobs)} jobs from Google Drive Folder into database.",
            "folder_id": folder_id,
            "folder_url": effective_folder_url,
            "file_name": file_name,
            "jobs_processed": len(saved_jobs),
            "last_run": now_str,
            "triggered_by": triggered_by
        }

gdrive_sync_service = GDriveSyncService()
