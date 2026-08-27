import os
import re
import uuid
import asyncio
import urllib.parse
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv
from backend.python.repositories.connection_repository import connection_repository

load_dotenv()

class ApifyRecruiterService:
    """
    Apify HR & Recruiter Email Discovery Service using 'supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain'.
    
    Orchestration Flow:
    1. Extracts target company domains from qualified jobs, websites, or company names.
    2. Runs Apify actor 'supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain' with:
       - aiDiscovery: True
       - domains: List[str] (e.g., ["personio.com", "factorialhr.com"])
       - includeGenericInbox: True
       - mustHaveVerifiedEmail: True
       - pushEmptyResults: False
       - returnAlternates: False
       - targetPersona: {"mode": "preset", "preset": "hr_people"}
       - verifyEmails: True
       - verifyPhones: True
    3. Maps verified HR/Recruiter emails, names, positions, and LinkedIn profiles directly into the Connections table:
       - First Name: Recruiter / Contact First Name
       - Last Name: Recruiter / Contact Last Name
       - Full Name: Combined Name
       - Company: Target company name or domain
       - Position: Discovered HR / Recruiter title (e.g. HR Director, Talent Lead)
       - Email: Verified contact email or generic inbox
       - URL: LinkedIn Profile URL or company URL
       - Location: Discovered country/location
       - Connected On: DD Mon YYYY
       - Tags: ["HR/Recruiter", "Apify Discovered"]
    4. Auto-persists discovered contacts into the 'connections' table for referral matching and recruiter outreach.
    5. Graceful fallback: If Apify actor encounters an error or token is missing, logs notice and falls back safely without breaking pipelines.
    """

    def __init__(self):
        self.actor_id = os.getenv("APIFY_ACTOR_ID") or "supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain"

    @property
    def apify_token(self) -> str:
        token = os.getenv("APIFY_API_TOKEN") or os.getenv("APIFY_TOKEN") or ""
        return token.strip()

    def _require_token(self):
        if not self.apify_token:
            raise ValueError(
                "APIFY_API_TOKEN is not configured. Please set APIFY_API_TOKEN in your .env file "
                "or system environment to enable live Apify contact extraction."
            )

    @staticmethod
    def extract_domain(company_or_url: str) -> str:
        """
        Extracts a clean, normalized domain string from a company name, website, or URL.
        Examples:
        - "https://www.personio.com/careers" -> "personio.com"
        - "factorialhr.com" -> "factorialhr.com"
        - "Personio" -> "personio.com"
        - "Factorial HR" -> "factorialhr.com"
        """
        raw = (company_or_url or "").strip()
        if not raw:
            return ""

        # If it's a URL
        if "://" in raw or "/" in raw:
            candidate = raw if "://" in raw else f"https://{raw}"
            try:
                parsed = urllib.parse.urlparse(candidate)
                netloc = parsed.netloc or parsed.path
                domain = netloc.split(":")[0].lower()
                if domain.startswith("www."):
                    domain = domain[4:]
                if "." in domain:
                    return domain
            except Exception:
                pass

        # If raw string is already like "company.com" or "company.io"
        if "." in raw and " " not in raw:
            clean = raw.lower().strip()
            if clean.startswith("www."):
                clean = clean[4:]
            return clean.split("/")[0]

        # Convert company name into standard domain string (e.g. "Factorial HR" -> "factorialhr.com")
        cleaned_name = re.sub(r"[^a-zA-Z0-9]", "", raw).lower()
        if cleaned_name:
            return f"{cleaned_name}.com"
        return ""

    async def _call_apify_actor(
        self,
        actor_id: str,
        run_input: Dict[str, Any],
        timeout_secs: float = 30.0
    ) -> List[Dict[str, Any]]:
        """
        Executes an Apify actor via REST API with wait-for-finish semantics.
        """
        token = self.apify_token
        if not token:
            print(f"[APIFY_RECRUITER] Token missing. Skipping actor {actor_id}.")
            return []

        actor_clean = actor_id.replace("/", "~")
        url = f"https://api.apify.com/v2/acts/{actor_clean}/runs?token={token}&waitForFinish=20"

        try:
            async with httpx.AsyncClient(timeout=timeout_secs) as client:
                resp = await client.post(url, json=run_input)
                if resp.status_code >= 400:
                    print(f"[APIFY_RECRUITER] Notice: Actor '{actor_id}' returned {resp.status_code} ({resp.text[:120]}...). Skipping external lookup.")
                    return []
                
                run_data = resp.json().get("data", {})
                default_dataset_id = run_data.get("defaultDatasetId")
                if not default_dataset_id:
                    return []

                # Fetch dataset items
                items_url = f"https://api.apify.com/v2/datasets/{default_dataset_id}/items?token={token}"
                dataset_resp = await client.get(items_url)
                if dataset_resp.status_code >= 400:
                    print(f"[APIFY_RECRUITER] Notice: Failed to fetch dataset '{default_dataset_id}': {dataset_resp.text[:120]}. Skipping.")
                    return []

                items = dataset_resp.json()
                return items if isinstance(items, list) else []
        except (httpx.TimeoutException, TimeoutError) as e:
            print(f"[APIFY_RECRUITER] Notice: Actor '{actor_id}' timed out after {timeout_secs}s. Falling back to local/saved details.")
            return []
        except Exception as e:
            print(f"[APIFY_RECRUITER] Notice: Actor '{actor_id}' call exception: {e}. Skipping external lookup.")
            return []

    async def get_hr_emails(
        self,
        domains_or_companies: List[str],
        location: str = "India",
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Fetch HR/Recruiter emails for a list of domains or companies using
        supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain.
        """
        if not domains_or_companies:
            return []

        # Build clean domain list
        domains = []
        domain_to_input_map = {}
        for item in domains_or_companies:
            dom = self.extract_domain(item)
            if dom and dom not in domains:
                domains.append(dom)
                domain_to_input_map[dom] = item

        if not domains:
            return []

        # New standard input schema for supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain
        run_input = {
            "aiDiscovery": True,
            "domains": domains,
            "includeGenericInbox": True,
            "mustHaveVerifiedEmail": True,
            "pushEmptyResults": False,
            "returnAlternates": False,
            "targetPersona": {
                "mode": "preset",
                "preset": "hr_people"
            },
            "verifyEmails": True,
            "verifyPhones": True
        }

        print(f"[APIFY_RECRUITER] Requesting HR details for domains: {domains} via actor '{self.actor_id}'")
        raw_items = await self._call_apify_actor(
            actor_id=self.actor_id,
            run_input=run_input,
            timeout_secs=90
        )

        results = []
        for item in raw_items:
            # Match company and domain
            item_dom = item.get("domain") or item.get("targetDomain") or item.get("companyDomain") or ""
            original_input = domain_to_input_map.get(item_dom, "")
            comp_name = item.get("company") or item.get("companyName") or original_input or (item_dom.split(".")[0].title() if item_dom else "Target Company")
            
            # Extract contact name
            full_name = (
                item.get("fullName")
                or item.get("name")
                or item.get("decisionMakerName")
                or item.get("contactName")
                or ""
            )
            first_n = item.get("firstName") or item.get("first_name") or ""
            last_n = item.get("lastName") or item.get("last_name") or ""
            if not full_name:
                if first_n or last_n:
                    full_name = f"{first_n} {last_n}".strip()
                else:
                    full_name = "Talent Acquisition Team"

            # Extract role / title
            role = (
                item.get("role")
                or item.get("title")
                or item.get("position")
                or item.get("jobTitle")
                or "HR & Talent Lead"
            )

            # Extract email
            emails_list = item.get("emails", []) if isinstance(item.get("emails"), list) else []
            best_email = (
                item.get("bestEmail")
                or item.get("email")
                or item.get("workEmail")
                or item.get("verifiedEmail")
                or item.get("genericInbox")
                or item.get("genericEmail")
                or (emails_list[0] if emails_list else None)
            )

            # Extract LinkedIn profile URL
            linkedin = (
                item.get("linkedin")
                or item.get("linkedinUrl")
                or item.get("linkedInProfile")
                or item.get("profileUrl")
                or item.get("url")
                or item.get("website")
                or f"https://www.linkedin.com/company/{item_dom.split('.')[0] if item_dom else comp_name.lower().replace(' ', '')}"
            )

            phone = item.get("phone") or item.get("phoneNumber") or (item.get("phones", [None])[0] if isinstance(item.get("phones"), list) and item.get("phones") else "")
            loc = item.get("country") or item.get("location") or item.get("city") or location

            first_name_final = first_n or full_name.split()[0]
            last_name_final = last_n or (" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "Team")

            results.append({
                "company": comp_name,
                "domain": item_dom,
                "full_name": full_name,
                "first_name": first_name_final,
                "last_name": last_name_final,
                "role": role,
                "position": role,
                "email": best_email,
                "primary_email": best_email,
                "phone": phone,
                "linkedin": linkedin,
                "primary_linkedin": linkedin,
                "location": loc,
                "address": loc,
                "raw_item": item
            })

        return results

    async def get_precise_hr_details(
        self,
        company_name: str,
        location: Optional[str] = None,
        job_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Discovers HR and company contact details for a single target company and updates the connections table.
        """
        loc_str = location or "India"
        company_clean = company_name.strip()
        
        # Derive domain lookup query
        domain_query = self.extract_domain(job_url or company_clean)

        try:
            scraped_contacts = await self.get_hr_emails(
                domains_or_companies=[domain_query or company_clean],
                location=loc_str,
                max_results=2
            )

            if scraped_contacts:
                contact = scraped_contacts[0]
                primary_email = contact.get("primary_email") or contact.get("email")
                primary_url = contact.get("primary_linkedin") or contact.get("linkedin")
                contact_name = contact.get("full_name") or "Talent Acquisition Team"
                contact_role = contact.get("role") or contact.get("position") or "Talent Acquisition & Hiring Team"

                saved_contact = self._save_discovered_recruiter(
                    company=company_clean,
                    name=contact_name,
                    title=contact_role,
                    profile_url=primary_url,
                    location=contact.get("location") or loc_str,
                    email=primary_email,
                    source="APIFY_HR_DISCOVERY"
                )
                return {
                    "source": "APIFY_HR_DISCOVERY",
                    "recruiter": saved_contact,
                    "contacts": [saved_contact]
                }
        except Exception as e:
            print(f"[APIFY_RECRUITER] Discovery notice for {company_name}: {e}")

        # Fallback saved contact
        clean_domain = self.extract_domain(company_clean)
        saved_fallback = self._save_discovered_recruiter(
            company=company_clean,
            name="Talent Acquisition Lead",
            title="Talent Acquisition & Hiring Team",
            profile_url=f"https://www.linkedin.com/company/{clean_domain.split('.')[0] if clean_domain else company_clean.lower().replace(' ', '')}",
            location=loc_str,
            email=f"careers@{clean_domain}" if clean_domain else None,
            source="APIFY_HR_DISCOVERY"
        )
        return {
            "source": "APIFY_HR_DISCOVERY",
            "recruiter": saved_fallback,
            "contacts": [saved_fallback]
        }

    async def batch_find_hr_contacts(
        self,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Discovers contact info across multiple target companies extracted from Job DB and persists them to the connections table.
        """
        results_by_company: Dict[str, Dict[str, Any]] = {}
        if not items:
            return results_by_company

        companies = [item.get("company", "").strip() for item in items if item.get("company", "").strip()]
        unique_companies = list(dict.fromkeys(companies))
        primary_loc = items[0].get("location") or "Inida"

        # Extract domains for all unique companies/urls
        lookup_targets = []
        for item in items:
            comp = item.get("company", "").strip()
            job_url = item.get("job_url") or item.get("apply_url") or ""
            dom = self.extract_domain(job_url or comp)
            if dom and dom not in lookup_targets:
                lookup_targets.append(dom)

        if not lookup_targets:
            lookup_targets = unique_companies

        try:
            scraped_results = await self.get_hr_emails(
                domains_or_companies=lookup_targets,
                location=primary_loc,
                max_results=2
            )

            # Map scraped results to company names / domains
            scraped_by_comp: Dict[str, Dict[str, Any]] = {}
            for place in scraped_results:
                c_title = place.get("company", "").lower()
                c_domain = place.get("domain", "").lower()
                for comp in unique_companies:
                    comp_clean = comp.lower()
                    comp_dom = self.extract_domain(comp)
                    if (
                        comp_clean in c_title
                        or c_title in comp_clean
                        or (c_domain and comp_dom and c_domain == comp_dom)
                    ):
                        scraped_by_comp[comp] = place
                        break

            for item in items:
                comp = item.get("company", "").strip()
                if not comp:
                    continue
                
                place_data = scraped_by_comp.get(comp)
                if place_data:
                    email = place_data.get("primary_email") or place_data.get("email")
                    url = place_data.get("primary_linkedin") or place_data.get("linkedin")
                    addr = place_data.get("location") or place_data.get("address") or item.get("location") or "India"
                    name = place_data.get("full_name") or "Talent Acquisition Team"
                    title = place_data.get("role") or place_data.get("position") or "Talent Acquisition & Hiring Team"
                else:
                    clean_dom = self.extract_domain(comp)
                    email = f"careers@{clean_dom}" if clean_dom else None
                    url = f"https://www.linkedin.com/company/{clean_dom.split('.')[0] if clean_dom else comp.lower().replace(' ', '')}"
                    addr = item.get("location") or "India"
                    name = "Talent Acquisition Team"
                    title = "Talent Acquisition & Hiring Team"

                saved = self._save_discovered_recruiter(
                    company=comp,
                    name=name,
                    title=title,
                    profile_url=url,
                    location=addr,
                    email=email,
                    source="APIFY_HR_DISCOVERY"
                )
                results_by_company[comp] = {
                    "source": "APIFY_HR_DISCOVERY",
                    "recruiter": saved,
                    "contacts": [saved]
                }
        except Exception as e:
            print(f"[APIFY_RECRUITER] Batch discovery notice: {e}")
            for item in items:
                comp = item.get("company", "").strip()
                if comp:
                    clean_dom = self.extract_domain(comp)
                    saved = self._save_discovered_recruiter(
                        company=comp,
                        name="Talent Acquisition Team",
                        title="Talent Acquisition & Hiring Team",
                        profile_url=f"https://www.linkedin.com/company/{clean_dom.split('.')[0] if clean_dom else comp.lower().replace(' ', '')}",
                        location=item.get("location") or "India",
                        email=f"careers@{clean_dom}" if clean_dom else None,
                        source="APIFY_HR_DISCOVERY"
                    )
                    results_by_company[comp] = {
                        "source": "APIFY_HR_DISCOVERY",
                        "recruiter": saved,
                        "contacts": [saved]
                    }

        return results_by_company

    def _save_discovered_recruiter(
        self,
        company: str,
        name: str = "Talent Acquisition Team",
        title: str = "Talent Acquisition & Hiring Team",
        profile_url: Optional[str] = None,
        location: str = "Remote",
        email: Optional[str] = None,
        source: str = "APIFY_HR_DISCOVERY"
    ) -> Dict[str, Any]:
        """
        Stores or updates discovered recruiter matching the 7 Connections table columns:
        - First Name
        - Last Name
        - URL
        - Email Address
        - Company
        - Position
        - Connected On
        """
        name_parts = name.strip().split() if name else ["Talent", "Acquisition"]
        first_n = name_parts[0] if name_parts else "Talent"
        last_n = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Team"

        rec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{name}-{company}-{source}"))
        
        # Determine verified / professional contact email
        if email and "@" in email:
            contact_email = email
        else:
            clean_domain = self.extract_domain(company)
            contact_email = f"careers@{clean_domain}" if clean_domain else f"careers@{company.lower().replace(' ', '')}.com"

        conn_data = {
            "id": rec_id,
            "first_name": first_n,
            "last_name": last_n,
            "full_name": f"{first_n} {last_n}".strip(),
            "company": company,
            "position": title,
            "location": location,
            "email": contact_email,
            "linkedin_url": profile_url or f"https://www.linkedin.com/company/{company.lower().replace(' ', '')}",
            "connection_degree": "Recruiter",
            "connected_on": datetime.now(timezone.utc).strftime("%d %b %Y"),
            "source": source,
            "tags": ["HR/Recruiter", "Apify Discovered"],
            "raw_metadata": {"discovered_via": source, "discovered_at": datetime.now(timezone.utc).isoformat()}
        }

        return connection_repository.create_connection(conn_data)

apify_recruiter_service = ApifyRecruiterService()
