import os
import decimal
import uuid
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

def _sanitize_record(val: Any) -> Any:
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, dict):
        return {k: _sanitize_record(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_sanitize_record(v) for v in val]
    return val

def _normalize_score_details(score_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not score_data:
        return None

    score = dict(_sanitize_record(score_data))

    breakdown = {}
    sb = score.get("score_breakdown")
    if isinstance(sb, str):
        try:
            breakdown = json.loads(sb)
        except Exception:
            breakdown = {}
    elif isinstance(sb, dict):
        breakdown = sb

    score["overall_score"] = float(score.get("overall_score") or breakdown.get("overall_score") or 0.0)
    score["skills_match"] = float(score.get("skills_match") if score.get("skills_match") is not None else (score.get("skills_match_score") if score.get("skills_match_score") is not None else (breakdown.get("skills_match") if breakdown.get("skills_match") is not None else (score.get("keyword_match") or 0.0))))
    score["experience_match"] = float(score.get("experience_match") if score.get("experience_match") is not None else (score.get("experience_match_score") if score.get("experience_match_score") is not None else (breakdown.get("experience_match") or 0.0)))
    score["title_match"] = float(score.get("title_match") if score.get("title_match") is not None else (score.get("seniority_match_score") if score.get("seniority_match_score") is not None else (breakdown.get("title_match") or 0.0)))
    score["recommendation"] = score.get("recommendation") or score.get("evaluation_summary") or breakdown.get("recommendation") or "Evaluation complete."
    score["strengths"] = score.get("strengths") or breakdown.get("strengths") or []
    score["gaps"] = score.get("gaps") or breakdown.get("gaps") or []
    score["matching_keywords"] = score.get("matching_keywords") or score.get("matching_skills") or breakdown.get("matching_keywords") or []
    score["missing_keywords"] = score.get("missing_keywords") or score.get("missing_skills") or breakdown.get("missing_keywords") or []
    score["match_level"] = score.get("match_level") or breakdown.get("match_level") or "QUALIFIED MATCH"

    return score

class JobRepository:
    def __init__(self):
        self.db = db_helper
        self._in_memory_jobs: Dict[str, Dict[str, Any]] = {}
        self._in_memory_scores: Dict[str, Dict[str, Any]] = {}
        self._in_memory_runs: Dict[str, Dict[str, Any]] = {}
        self._in_memory_tasks: List[Dict[str, Any]] = []

    def get_job_by_idempotency_key(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").select("*").eq("idempotency_key", idempotency_key).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error querying job by idempotency key from Supabase: {e}")
        
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM jobs WHERE idempotency_key = %s LIMIT 1;", (idempotency_key,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[JOB_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

    def get_or_create_job_source(self, source_name: str = "jsearch", base_url: Optional[str] = None, source_type: str = "api") -> Optional[Dict[str, Any]]:
        """
        Ensures the single authoritative JSearch job source exists in job_sources table.
        """
        clean_name = "jsearch"
        url = base_url or os.getenv("JSEARCH_BASE_URL", "https://api.openwebninja.com/jsearch/search-v2")

        if self.db.client:
            try:
                res = self.db.client.table("job_sources").select("*").ilike("name", clean_name).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
                new_src = {"name": clean_name, "base_url": url, "source_type": source_type, "is_active": True}
                insert_res = self.db.client.table("job_sources").insert(new_src).execute()
                if insert_res.data and len(insert_res.data) > 0:
                    return insert_res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Supabase get_or_create_job_source error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM job_sources WHERE LOWER(name) = 'jsearch' LIMIT 1;")
                    row = cur.fetchone()
                    if row:
                        if row.get("base_url") != url:
                            cur.execute("UPDATE job_sources SET base_url = %s, is_active = true WHERE LOWER(name) = 'jsearch' RETURNING *;", (url,))
                            row = cur.fetchone()
                            pg_conn.commit()
                        return dict(row)
                    
                    # Insert single jsearch source
                    source_id = "00000000-0000-0000-0000-000000000010"
                    cur.execute("""
                        INSERT INTO job_sources (id, name, base_url, source_type, is_active, created_at)
                        VALUES (%s, 'jsearch', %s, %s, true, NOW())
                        ON CONFLICT (name) DO UPDATE SET base_url = EXCLUDED.base_url, is_active = true
                        RETURNING *;
                    """, (source_id, url, source_type))
                    new_row = cur.fetchone()
                    pg_conn.commit()
                    if new_row:
                        return dict(new_row)
            except Exception as e:
                print(f"[JOB_REPO] Error in get_or_create_job_source: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        return {"id": "00000000-0000-0000-0000-000000000010", "name": "jsearch", "base_url": url, "source_type": "api", "is_active": True}

    def list_job_sources(self) -> List[Dict[str, Any]]:
        """
        Lists all active job sources with live job counts and health tracking.
        Aggregates both configured API sources and actual portal types from indexed jobs.
        """
        sources_dict: Dict[str, Dict[str, Any]] = {}
        url = os.getenv("JSEARCH_BASE_URL", "https://api.openwebninja.com/jsearch/search-v2")

        # 1. Supabase Client Path
        if self.db.client:
            try:
                # Fetch configured job sources
                js_res = self.db.client.table("job_sources").select("*").execute()
                for js in (js_res.data or []):
                    name = (js.get("name") or "").lower()
                    if name:
                        sources_dict[name] = {
                            "id": js.get("id"),
                            "name": name,
                            "base_url": js.get("base_url", ""),
                            "source_type": js.get("source_type", "api"),
                            "is_active": js.get("is_active", True),
                            "job_count": 0
                        }

                # Query distinct jobs to get real job counts per portal_type/source
                jobs_res = self.db.client.table("jobs").select("portal_type, source").execute()
                for j in (jobs_res.data or []):
                    pt = (j.get("portal_type") or j.get("source") or "unknown").lower()
                    if pt:
                        if pt not in sources_dict:
                            sources_dict[pt] = {
                                "id": f"source-{pt}",
                                "name": pt,
                                "base_url": "",
                                "source_type": "portal",
                                "is_active": True,
                                "job_count": 0
                            }
                        sources_dict[pt]["job_count"] += 1
            except Exception as e:
                print(f"[JOB_REPO] Error in Supabase list_job_sources: {e}")

        # 2. PostgreSQL Direct Connection Path
        if not sources_dict:
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("""
                            SELECT 
                                js.id,
                                js.name,
                                js.base_url,
                                js.source_type,
                                js.is_active,
                                js.last_scanned_at,
                                js.created_at,
                                COUNT(j.id) AS job_count
                            FROM job_sources js
                            LEFT JOIN jobs j ON (j.source_id = js.id OR LOWER(j.source) = LOWER(js.name) OR LOWER(j.portal_type) = LOWER(js.name))
                            GROUP BY js.id, js.name, js.base_url, js.source_type, js.is_active, js.last_scanned_at, js.created_at;
                        """)
                        rows = cur.fetchall()
                        if rows:
                            for r in rows:
                                item = _sanitize_record(dict(r))
                                name = (item.get("name") or "").lower()
                                sources_dict[name] = item
                except Exception as e:
                    print(f"[JOB_REPO] Error in PG list_job_sources: {e}")
                finally:
                    pg_conn.close()

        # 3. Fallback to in-memory jobs if empty
        if not sources_dict:
            for j in self._in_memory_jobs.values():
                pt = (j.get("portal_type") or j.get("source") or "unknown").lower()
                if pt not in sources_dict:
                    sources_dict[pt] = {
                        "id": f"source-{pt}",
                        "name": pt,
                        "base_url": "",
                        "source_type": "portal",
                        "is_active": True,
                        "job_count": 0
                    }
                sources_dict[pt]["job_count"] += 1

        # Always guarantee jsearch is present
        if "jsearch" not in sources_dict:
            sources_dict["jsearch"] = {
                "id": "00000000-0000-0000-0000-000000000010",
                "name": "jsearch",
                "base_url": url,
                "source_type": "api",
                "is_active": True,
                "job_count": 0
            }

        # Sort sources with jobs first, then alphabetically
        return sorted(list(sources_dict.values()), key=lambda s: (-s.get("job_count", 0), s.get("name", "")))

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").select("*").eq("id", job_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error fetching job {job_id} from Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM jobs WHERE id::text = %s LIMIT 1;", (str(job_id),))
                    row = cur.fetchone()
                    if not row:
                        cur.execute("SELECT * FROM job_listings WHERE id::text = %s LIMIT 1;", (str(job_id),))
                        row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[JOB_REPO] PG get_job_by_id error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_jobs.get(job_id)

    def save_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        job_data["updated_at"] = datetime.utcnow().isoformat()
        if not job_data.get("discovered_at"):
            job_data["discovered_at"] = datetime.utcnow().isoformat()

        key_to_hash = job_data.get('idempotency_key') or job_data.get('id') or str(datetime.utcnow().timestamp())
        job_id = job_data.get("id")
        if not job_id:
            job_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(key_to_hash)))
        job_data["id"] = job_id

        # Single Authoritative Job Source: JSearch
        source_rec = self.get_or_create_job_source("jsearch")
        source_id = source_rec.get("id") if (source_rec and source_rec.get("id") != "00000000-0000-0000-0000-000000000010") else None
        job_data["source_id"] = source_id
        job_data["source"] = "jsearch"
        if not job_data.get("portal_type") or job_data.get("portal_type") in ("custom", "undefined"):
            job_data["portal_type"] = "jsearch"

        if self.db.client:
            try:
                allowed_job_cols = {
                    "id", "source_id", "external_job_id", "title", "company", "location",
                    "location_type", "employment_type", "salary_min", "salary_max",
                    "salary_currency", "description_raw", "requirements_clean", "tech_stack",
                    "apply_url", "portal_type", "status", "idempotency_key", "discovered_at",
                    "updated_at", "company_domain", "match_score", "posted_date", "job_url"
                }
                filtered_job = {k: v for k, v in job_data.items() if k in allowed_job_cols}
                res = self.db.client.table("jobs").upsert(filtered_job, on_conflict="idempotency_key").execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_jobs[saved["id"]] = saved
                    return saved
            except Exception as e:
                print(f"[JOB_REPO] Error saving job to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO jobs (
                            id, source_id, title, company, company_domain, location, apply_url, portal_type, status,
                            idempotency_key, description_raw, source, job_url, posted_date,
                            fingerprint, tech_stack, salary_min, salary_max, match_type,
                            reference_jd_summary, match_score, published_time
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (idempotency_key) DO UPDATE SET
                            title = EXCLUDED.title,
                            company = EXCLUDED.company,
                            company_domain = COALESCE(EXCLUDED.company_domain, jobs.company_domain),
                            location = EXCLUDED.location,
                            status = EXCLUDED.status,
                            source_id = COALESCE(EXCLUDED.source_id, jobs.source_id),
                            source = COALESCE(EXCLUDED.source, jobs.source),
                            job_url = COALESCE(EXCLUDED.job_url, jobs.job_url),
                            fingerprint = COALESCE(EXCLUDED.fingerprint, jobs.fingerprint),
                            match_type = COALESCE(EXCLUDED.match_type, jobs.match_type),
                            reference_jd_summary = COALESCE(EXCLUDED.reference_jd_summary, jobs.reference_jd_summary),
                            match_score = COALESCE(EXCLUDED.match_score, jobs.match_score),
                            published_time = COALESCE(EXCLUDED.published_time, jobs.published_time),
                            updated_at = NOW()
                        RETURNING *;
                    """, (
                        job_data["id"],
                        job_data.get("source_id"),
                        job_data.get("title", ""),
                        job_data.get("company", ""),
                        job_data.get("company_domain"),
                        job_data.get("location", "Remote"),
                        job_data.get("apply_url", "https://example.com"),
                        job_data.get("portal_type", "custom"),
                        job_data.get("status", "DISCOVERED"),
                        job_data.get("idempotency_key", str(job_id)),
                        job_data.get("description_raw", job_data.get("description", "")),
                        job_data.get("source"),
                        job_data.get("job_url"),
                        job_data.get("posted_date"),
                        job_data.get("fingerprint"),
                        job_data.get("tech_stack", []),
                        job_data.get("salary_min"),
                        job_data.get("salary_max"),
                        job_data.get("match_type", "PROFILE_MATCH"),
                        job_data.get("reference_jd_summary"),
                        job_data.get("match_score"),
                        job_data.get("published_time")
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()

                    try:
                        with pg_conn.cursor() as cur2:
                            cur2.execute("""
                                INSERT INTO job_listings (id, title, company, location, tech_stack, source, discovered_by_agent)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                            """, (
                                str(job_data["id"]),
                                job_data.get("title", ""),
                                job_data.get("company", ""),
                                job_data.get("location", "Remote"),
                                job_data.get("tech_stack", []),
                                job_data.get("source", "mcp"),
                                "job_discovery_mcp"
                            ))
                            pg_conn.commit()
                    except Exception:
                        pass

                    if row:
                        saved = dict(row)
                        self._in_memory_jobs[saved["id"]] = saved
                        return saved
            except Exception as e:
                print(f"[JOB_REPO] PG save_job error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        self._in_memory_jobs[job_id] = job_data
        return job_data

    def update_job_status(self, job_id: str, status: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("jobs").update({
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", job_id).execute()
                if res.data and len(res.data) > 0:
                    self._in_memory_jobs[job_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                print(f"[JOB_REPO] Error updating job status in Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("UPDATE jobs SET status = %s, updated_at = NOW() WHERE id::text = %s RETURNING *;", (status, str(job_id)))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        res = dict(row)
                        self._in_memory_jobs[str(job_id)] = res
                        return res
            except Exception as e:
                print(f"[JOB_REPO] PG update_job_status error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if job_id in self._in_memory_jobs:
            self._in_memory_jobs[job_id]["status"] = status
            self._in_memory_jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
            return self._in_memory_jobs[job_id]
        return None

    def save_job_score(self, score_data: Dict[str, Any]) -> Dict[str, Any]:
        if not score_data.get("evaluated_at"):
            score_data["evaluated_at"] = datetime.utcnow().isoformat()
        
        score_id = score_data.get("id") or f"score-{hashlib.md5((score_data['job_id'] + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
        score_data["id"] = score_id

        if self.db.client:
            try:
                supabase_score = {
                    "job_id": score_data["job_id"],
                    "overall_score": score_data.get("overall_score", 90.0),
                    "skills_match_score": score_data.get("skills_match_score", score_data.get("skills_match", 90.0)),
                    "experience_match_score": score_data.get("experience_match_score", score_data.get("experience_match", 90.0)),
                    "seniority_match_score": score_data.get("seniority_match_score", score_data.get("seniority_match", 90.0)),
                    "evaluation_summary": score_data.get("evaluation_summary", ""),
                    "score_breakdown": score_data.get("score_breakdown", {}),
                    "llm_model_used": score_data.get("llm_model_used", "scoring_engine"),
                    "evaluated_at": score_data.get("evaluated_at")
                }
                res = self.db.client.table("job_scores").upsert(supabase_score).execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._in_memory_scores[score_data["job_id"]] = saved
                    return saved
            except Exception as e:
                print(f"[JOB_REPO] Error saving score to Supabase: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    score_breakdown = {
                        "responsibility_match": score_data.get("responsibility_match", 85.0),
                        "education_match": score_data.get("education_match", 90.0),
                        "location_match": score_data.get("location_match", 90.0),
                        "keyword_match": score_data.get("keyword_match", 85.0),
                        "strengths": score_data.get("strengths", []),
                        "gaps": score_data.get("gaps", []),
                        "match_type": score_data.get("match_type", "PROFILE_MATCH"),
                        "reference_jd": score_data.get("reference_jd", "")
                    }
                    cur.execute("""
                        INSERT INTO job_scores (
                            job_id, overall_score, skills_match_score, experience_match_score,
                            seniority_match_score, missing_skills, matching_skills,
                            evaluation_summary, score_breakdown, llm_model_used, evaluated_at,
                            match_type, reference_jd
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *;
                    """, (
                        score_data["job_id"],
                        score_data.get("overall_score", 0.0),
                        score_data.get("skills_match", score_data.get("skills_match_score", 0.0)),
                        score_data.get("experience_match", score_data.get("experience_match_score", 0.0)),
                        score_data.get("seniority_match", score_data.get("seniority_match_score", 0.0)),
                        score_data.get("missing_keywords", score_data.get("missing_skills", [])),
                        score_data.get("matching_keywords", score_data.get("matching_skills", [])),
                        score_data.get("recommendation", score_data.get("evaluation_summary", "Evaluation complete")),
                        json.dumps(score_breakdown),
                        score_data.get("llm_model_used", "openrouter/nemotron"),
                        score_data.get("evaluated_at"),
                        score_data.get("match_type", "PROFILE_MATCH"),
                        score_data.get("reference_jd", "")
                    ))
                    row = cur.fetchone()
                    pg_conn.commit()
                    if row:
                        saved = dict(row)
                        self._in_memory_scores[score_data["job_id"]] = saved
                        return saved
            except Exception as e:
                print(f"[JOB_REPO] PG save_job_score error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        self._in_memory_scores[score_data["job_id"]] = score_data
        return score_data

    def get_job_score(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.db.client:
            try:
                res = self.db.client.table("job_scores").select("*").eq("job_id", job_id).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return _normalize_score_details(res.data[0])
            except Exception as e:
                print(f"[JOB_REPO] Error fetching job score: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM job_scores WHERE job_id::text = %s ORDER BY evaluated_at DESC LIMIT 1;", (str(job_id),))
                    row = cur.fetchone()
                    if row:
                        return _normalize_score_details(dict(row))
            except Exception as e:
                print(f"[JOB_REPO] PG get_job_score error: {e}")
            finally:
                pg_conn.close()

        return _normalize_score_details(self._in_memory_scores.get(job_id))

    def list_jobs(
        self,
        status: Optional[str] = None,
        source: Optional[str] = None,
        match_type: Optional[str] = None,
        min_score: Optional[float] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        all_jobs: Optional[List[Dict[str, Any]]] = None
        if self.db.client:
            try:
                query = self.db.client.table("jobs").select("*").order("discovered_at", desc=True).limit(limit)
                if status and status != "ALL":
                    query = query.eq("status", status)
                if source and source != "ALL":
                    query = query.eq("portal_type", source)
                if match_type and match_type != "ALL":
                    query = query.eq("match_type", match_type)
                res = query.execute()
                all_jobs = [_sanitize_record(r) for r in (res.data or [])]
            except Exception as e:
                print(f"[JOB_REPO] Error listing jobs from Supabase: {e}")

        if all_jobs is None:
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("SELECT * FROM jobs ORDER BY discovered_at DESC LIMIT %s;", (limit,))
                        rows = cur.fetchall()
                        all_jobs = [_sanitize_record(dict(r)) for r in rows]
                except Exception as e:
                    print(f"[JOB_REPO] PG list_jobs error: {e}")
                finally:
                    pg_conn.close()

        if all_jobs is None:
            all_jobs = [_sanitize_record(j) for j in self._in_memory_jobs.values()]

        if status and status != "ALL" and (all_jobs and not self.db.client):
            all_jobs = [j for j in all_jobs if j.get("status") == status]
        if source and source != "ALL" and (all_jobs and not self.db.client):
            all_jobs = [j for j in all_jobs if (j.get("portal_type") or j.get("source")) == source]
        if match_type and match_type != "ALL" and (all_jobs and not self.db.client):
            all_jobs = [j for j in all_jobs if j.get("match_type") == match_type]

        # Batch fetch all scores for these jobs in a single query
        job_ids = [str(j.get("id")) for j in all_jobs if j.get("id")]
        scores_by_job_id: Dict[str, Dict[str, Any]] = {}

        if job_ids:
            if self.db.client:
                try:
                    score_res = self.db.client.table("job_scores").select("*").in_("job_id", job_ids).execute()
                    for sc in (score_res.data or []):
                        scores_by_job_id[str(sc.get("job_id"))] = _normalize_score_details(sc) or {}
                except Exception as e:
                    print(f"[JOB_REPO] Error batch-fetching scores: {e}")

            if not scores_by_job_id:
                pg_conn = self.db._get_pg_connection()
                if pg_conn:
                    try:
                        with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                            cur.execute("SELECT * FROM job_scores WHERE job_id::text = ANY(%s);", (job_ids,))
                            for r in cur.fetchall():
                                scores_by_job_id[str(r.get("job_id"))] = _normalize_score_details(dict(r)) or {}
                    except Exception as e:
                        print(f"[JOB_REPO] PG batch get scores error: {e}")
                    finally:
                        pg_conn.close()

            # Merge with in-memory scores if any
            for jid in job_ids:
                if jid not in scores_by_job_id and jid in self._in_memory_scores:
                    scores_by_job_id[jid] = _normalize_score_details(self._in_memory_scores[jid]) or {}

        # Attach score data in O(N) memory lookup
        results = []
        for job in all_jobs:
            job_id_str = str(job.get("id"))
            score = scores_by_job_id.get(job_id_str)
            job_copy = dict(job)
            job_copy["score_details"] = score
            raw_match_score = job_copy.get("match_score")
            if raw_match_score is not None:
                job_copy["match_score"] = float(raw_match_score)
            elif score and score.get("overall_score") is not None:
                job_copy["match_score"] = float(score["overall_score"])
            else:
                job_copy["match_score"] = 0.0

            if score and score.get("match_type"):
                job_copy["match_type"] = score.get("match_type")
            elif not job_copy.get("match_type"):
                job_copy["match_type"] = "PROFILE_MATCH"
            
            if min_score is not None:
                if not job_copy["match_score"] or job_copy["match_score"] < min_score:
                    continue
            results.append(job_copy)

        return results[:limit]

    def get_job_metrics(self) -> Dict[str, Any]:
        jobs = self.list_jobs(limit=200)
        total_discovered = len(jobs)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        discovered_today = sum(1 for j in jobs if (str(j.get("discovered_at") or j.get("created_at") or "")).startswith(today_str))
        
        scores = [_sanitize_record(s) for s in self._in_memory_scores.values()]
        score_values: List[float] = [float(s.get("overall_score", 0.0)) for s in scores if s.get("overall_score") is not None]
        for j in jobs:
            if j.get("match_score") is not None:
                val = float(j["match_score"])
                if val not in score_values and val > 0:
                    score_values.append(val)
                
        avg_score = round(sum(score_values) / len(score_values), 1) if score_values else 0.0
        top_match = round(max(score_values), 1) if score_values else 0.0
        
        # Profile matches (ATS >= 75%)
        profile_matches = sum(1 for j in jobs if (j.get("match_type") in ("PROFILE_MATCH", None) and float(j.get("match_score") or 0.0) >= 75.0))

        # JD matches (Match >= 50%)
        jd_matches = sum(1 for j in jobs if j.get("match_type") == "JD_MATCH" and float(j.get("match_score") or 0.0) >= 50.0)

        # Remote jobs count
        remote_jobs = sum(
            1 for j in jobs
            if (j.get("location_type") or "").lower() == "remote" or "remote" in (j.get("location") or "").lower()
        )

        excellent_matches = sum(1 for s in score_values if s >= 90.0)
        strong_matches = sum(1 for s in score_values if 85.0 <= s < 90.0)
        qualified_jobs = sum(1 for s in score_values if s >= 75.0)
        pending_approval = sum(1 for j in jobs if j.get("status") == "READY_FOR_REVIEW")
        submitted_apps = sum(1 for j in jobs if j.get("status") == "APPLIED")

        return {
            "total_jobs": total_discovered,
            "jobs_found": total_discovered,
            "new_jobs": discovered_today,
            "jobs_discovered_today": discovered_today,
            "profile_matches": profile_matches,
            "jd_matches": jd_matches,
            "top_match": top_match,
            "top_match_score": top_match,
            "remote_jobs": remote_jobs,
            "remote_jobs_count": remote_jobs,
            "qualified_jobs": qualified_jobs,
            "average_ats_score": avg_score,
            "excellent_matches": excellent_matches,
            "strong_matches": strong_matches,
            "applications_pending_approval": pending_approval,
            "applications_submitted": submitted_apps
        }

    # Automation Run Observability Persistence
    def create_automation_run(self, run_id: str, workflow_type: str, triggered_by: str) -> Dict[str, Any]:
        payload = {
            "id": run_id,
            "workflow_type": workflow_type,
            "triggered_by": triggered_by,
            "status": "RUNNING",
            "items_processed": 0,
            "items_succeeded": 0,
            "items_failed": 0,
            "started_at": datetime.utcnow().isoformat(),
            "error_summary": ""
        }
        if self.db.client:
            try:
                self.db.client.table("automation_runs").insert(payload).execute()
            except Exception as e:
                print(f"[JOB_REPO] Error creating automation run in Supabase: {e}")
        self._in_memory_runs[run_id] = payload
        return payload

    def complete_automation_run(self, run_id: str, processed: int, succeeded: int, failed: int, error_summary: str = "") -> Dict[str, Any]:
        update_data = {
            "status": "COMPLETED" if failed == 0 else "PARTIAL_SUCCESS",
            "items_processed": processed,
            "items_succeeded": succeeded,
            "items_failed": failed,
            "error_summary": error_summary,
            "completed_at": datetime.utcnow().isoformat()
        }
        if self.db.client:
            try:
                self.db.client.table("automation_runs").update(update_data).eq("id", run_id).execute()
            except Exception as e:
                print(f"[JOB_REPO] Error completing automation run: {e}")
        if run_id in self._in_memory_runs:
            self._in_memory_runs[run_id].update(update_data)
    def delete_by_id(self, job_id: str, actor: str = "admin_user", action: str = "MANUAL_DELETE") -> bool:
        record = self.get_job_by_id(job_id)
        if not record:
            return False

        # Audit log snapshot BEFORE deletion
        self.db.write_audit_log(
            actor_type="ADMIN_HUMAN" if action == "MANUAL_DELETE" else "SYSTEM_SCHEDULER",
            actor_id=actor,
            action=action,
            entity_type="jobs",
            entity_id=job_id,
            before_state=record,
            after_state=None,
            justification=f"Hard delete job record {job_id}"
        )

        deleted = False
        if self.db.client:
            try:
                self.db.client.table("job_scores").delete().eq("job_id", job_id).execute()
                self.db.client.table("jobs").delete().eq("id", job_id).execute()
                deleted = True
            except Exception as e:
                print(f"[JOB_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM application_events WHERE application_id IN (SELECT id FROM applications_v2 WHERE job_id::text = %s);", (str(job_id),))
                    cur.execute("DELETE FROM applications_v2 WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM applications WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM job_scores WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM job_source_records WHERE job_id::text = %s;", (str(job_id),))
                    cur.execute("DELETE FROM jobs WHERE id::text = %s;", (str(job_id),))
                    deleted_count = cur.rowcount
                    cur.execute("DELETE FROM job_listings WHERE id::text = %s;", (str(job_id),))
                    pg_conn.commit()
                    if deleted_count > 0 or cur.rowcount > 0:
                        deleted = True
            except Exception as e:
                print(f"[JOB_REPO] PG delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if job_id in self._in_memory_jobs:
            del self._in_memory_jobs[job_id]
            deleted = True
        if job_id in self._in_memory_scores:
            del self._in_memory_scores[job_id]

        return deleted

    def delete_bulk(self, job_ids: List[str], actor: str = "admin_user", action: str = "MANUAL_DELETE") -> int:
        clean_ids = [str(j) for j in job_ids if j]
        if not clean_ids:
            return 0

        for j_id in clean_ids:
            if j_id in self._in_memory_jobs:
                del self._in_memory_jobs[j_id]
            if j_id in self._in_memory_scores:
                del self._in_memory_scores[j_id]

        deleted_count = 0
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM application_events WHERE application_id IN (SELECT id FROM applications_v2 WHERE job_id::text = ANY(%s));", (clean_ids,))
                    cur.execute("DELETE FROM applications_v2 WHERE job_id::text = ANY(%s);", (clean_ids,))
                    cur.execute("DELETE FROM applications WHERE job_id::text = ANY(%s);", (clean_ids,))
                    cur.execute("DELETE FROM job_scores WHERE job_id::text = ANY(%s);", (clean_ids,))
                    cur.execute("DELETE FROM job_source_records WHERE job_id::text = ANY(%s);", (clean_ids,))
                    cur.execute("DELETE FROM jobs WHERE id::text = ANY(%s);", (clean_ids,))
                    deleted_count = cur.rowcount
                    cur.execute("DELETE FROM job_listings WHERE id::text = ANY(%s);", (clean_ids,))
                    deleted_count = max(deleted_count, cur.rowcount)
                    pg_conn.commit()
            except Exception as e:
                print(f"[JOB_REPO] PG bulk delete error: {e}")
                pg_conn.rollback()
            finally:
                pg_conn.close()

        if self.db.client:
            try:
                for j_id in clean_ids:
                    try:
                        self.db.client.table("job_scores").delete().eq("job_id", j_id).execute()
                        self.db.client.table("jobs").delete().eq("id", j_id).execute()
                    except Exception:
                        pass
            except Exception:
                pass

        return deleted_count or len(clean_ids)

    def get_expired_jobs(self, cutoff_days: int, status_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        from datetime import datetime, timezone, timedelta
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=cutoff_days)
        all_jobs = self.list_jobs(limit=1000)
        expired = []
        for job in all_jobs:
            created_str = job.get("discovered_at") or job.get("created_at") or job.get("posted_date")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if dt < cutoff_dt:
                job_status = job.get("status", "DISCOVERED")
                if status_filter and len(status_filter) > 0:
                    if job_status in status_filter:
                        expired.append(job)
                else:
                    expired.append(job)
        return expired

job_repository = JobRepository()
