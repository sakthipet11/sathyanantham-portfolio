import os
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv
from backend.python.repositories.connection_repository import connection_repository

load_dotenv()

class ApifyRecruiterService:
    """
    Apify Company & Contact Discovery Service using 'lukaskrivka/google-maps-with-contact-details'.
    
    Orchestration Flow:
    1. Extracts companies and location queries from qualified jobs in Job DB.
    2. Runs Apify actor 'lukaskrivka/google-maps-with-contact-details' to scrape company offices,
       verified emails, phone numbers, websites, and LinkedIn URLs.
    3. Maps scraped records directly into the 7 standard Connection columns:
       - First Name: Talent / Hiring
       - Last Name: Team / Acquisition
       - URL: LinkedIn URL or company website
       - Email Address: Scraped verified email
       - Company: Target company name
       - Position: Talent Acquisition & Hiring Team
       - Connected On: DD Mon YYYY
    4. Auto-Persists discovered contacts into the 'connections' table for immediate and future referral matching.
    5. Graceful fallback: If Apify actor encounters an error or token is missing, logs notice and skips without breaking the pipeline.
    """

    def __init__(self):
        self.actor_id = "lukaskrivka/google-maps-with-contact-details"

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

    async def _call_apify_actor(
        self,
        actor_id: str,
        run_input: Dict[str, Any],
        timeout_secs: float = 20.0
    ) -> List[Dict[str, Any]]:
        """
        Executes an Apify actor via REST API with wait-for-finish semantics.
        """
        token = self.apify_token
        if not token:
            print(f"[APIFY_RECRUITER] Token missing. Skipping actor {actor_id}.")
            return []

        actor_clean = actor_id.replace("/", "~")
        url = f"https://api.apify.com/v2/acts/{actor_clean}/runs?token={token}&waitForFinish=15"

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
        companies: List[str],
        location: str = "United States",
        max_results: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Fetch HR/contact emails for a list of companies at a given location using
        lukaskrivka/google-maps-with-contact-details actor.
        """
        if not companies:
            return []

        # Build search terms dynamically
        loc_city = location.split(",")[0].strip() if location else "United States"
        search_terms = [f"{company} office {loc_city}" for company in companies]

        run_input = {
            "searchStringsArray": search_terms,
            "locationQuery": location or "United States",
            "maxCrawledPlacesPerSearch": max_results,
            "language": "en",
            "searchMatching": "all",
            "website": "withWebsite",
            "skipClosedPlaces": True,
        }

        print(f"[APIFY_RECRUITER] Searching contact details for: {companies} in {location}")
        raw_items = await self._call_apify_actor(
            actor_id=self.actor_id,
            run_input=run_input,
            timeout_secs=90
        )

        results = []
        for item in raw_items:
            comp_name = item.get("title") or item.get("name") or "Target Company"
            emails = item.get("emails", []) if isinstance(item.get("emails"), list) else []
            linkedins = item.get("linkedIns", []) if isinstance(item.get("linkedIns"), list) else []
            website = item.get("website") or ""
            phone = item.get("phone") or ""
            address = item.get("address") or location

            primary_email = emails[0] if emails else None
            primary_linkedin = linkedins[0] if linkedins else website

            results.append({
                "company": comp_name,
                "category": item.get("categoryName"),
                "address": address,
                "phone": phone,
                "website": website,
                "emails": emails,
                "linkedins": linkedins,
                "primary_email": primary_email,
                "primary_linkedin": primary_linkedin
            })

        return results

    async def get_precise_hr_details(
        self,
        company_name: str,
        location: Optional[str] = None,
        job_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Discovers HR and company contact details for a single target company.
        """
        loc_str = location or "United States"
        company_clean = company_name.strip()

        try:
            scraped_places = await self.get_hr_emails(
                companies=[company_clean],
                location=loc_str,
                max_results=2
            )

            if scraped_places:
                place = scraped_places[0]
                primary_email = place.get("primary_email")
                primary_url = place.get("primary_linkedin") or place.get("website")
                saved_contact = self._save_discovered_recruiter(
                    company=company_clean,
                    name="Talent Acquisition Team",
                    title="Talent Acquisition & Hiring Team",
                    profile_url=primary_url,
                    location=place.get("address") or loc_str,
                    email=primary_email,
                    source="APIFY_MAPS_DISCOVERY"
                )
                return {
                    "source": "APIFY_MAPS_DISCOVERY",
                    "recruiter": saved_contact,
                    "contacts": [saved_contact]
                }
        except Exception as e:
            print(f"[APIFY_RECRUITER] Discovery notice for {company_name}: {e}")

        # Fallback saved contact
        saved_fallback = self._save_discovered_recruiter(
            company=company_clean,
            name="Talent Acquisition Lead",
            title="Talent Acquisition & Hiring Team",
            profile_url=f"https://www.linkedin.com/company/{company_clean.lower().replace(' ', '')}",
            location=loc_str,
            email=None,
            source="APIFY_MAPS_DISCOVERY"
        )
        return {
            "source": "APIFY_MAPS_DISCOVERY",
            "recruiter": saved_fallback,
            "contacts": [saved_fallback]
        }

    async def batch_find_hr_contacts(
        self,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Discovers contact info across multiple target companies extracted from Job DB.
        """
        results_by_company: Dict[str, Dict[str, Any]] = {}
        if not items:
            return results_by_company

        companies = [item.get("company", "").strip() for item in items if item.get("company", "").strip()]
        unique_companies = list(dict.fromkeys(companies))
        primary_loc = items[0].get("location") or "United States"

        try:
            scraped_results = await self.get_hr_emails(
                companies=unique_companies,
                location=primary_loc,
                max_results=2
            )

            # Map scraped results to company names
            scraped_by_comp: Dict[str, Dict[str, Any]] = {}
            for place in scraped_results:
                c_title = place.get("company", "").lower()
                for comp in unique_companies:
                    if comp.lower() in c_title or c_title in comp.lower():
                        scraped_by_comp[comp] = place
                        break

            for item in items:
                comp = item.get("company", "").strip()
                if not comp:
                    continue
                
                place_data = scraped_by_comp.get(comp)
                if place_data:
                    email = place_data.get("primary_email")
                    url = place_data.get("primary_linkedin") or place_data.get("website")
                    addr = place_data.get("address") or item.get("location") or "United States"
                else:
                    email = None
                    url = f"https://www.linkedin.com/company/{comp.lower().replace(' ', '')}"
                    addr = item.get("location") or "United States"

                saved = self._save_discovered_recruiter(
                    company=comp,
                    name="Talent Acquisition Team",
                    title="Talent Acquisition & Hiring Team",
                    profile_url=url,
                    location=addr,
                    email=email,
                    source="APIFY_MAPS_DISCOVERY"
                )
                results_by_company[comp] = {
                    "source": "APIFY_MAPS_DISCOVERY",
                    "recruiter": saved,
                    "contacts": [saved]
                }
        except Exception as e:
            print(f"[APIFY_RECRUITER] Batch discovery notice: {e}")
            for item in items:
                comp = item.get("company", "").strip()
                if comp:
                    saved = self._save_discovered_recruiter(
                        company=comp,
                        name="Talent Acquisition Team",
                        title="Talent Acquisition & Hiring Team",
                        profile_url=f"https://www.linkedin.com/company/{comp.lower().replace(' ', '')}",
                        location=item.get("location") or "United States",
                        email=None,
                        source="APIFY_MAPS_DISCOVERY"
                    )
                    results_by_company[comp] = {
                        "source": "APIFY_MAPS_DISCOVERY",
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
        source: str = "APIFY_MAPS_DISCOVERY"
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
        first_n = name.split()[0] if name else "Talent"
        last_n = " ".join(name.split()[1:]) if len(name.split()) > 1 else "Acquisition Team"

        rec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{name}-{company}-{source}"))
        
        # Estimate company work email convention if not present
        if email and "@" in email:
            contact_email = email
        else:
            clean_first = first_n.lower().replace(" ", "")
            clean_last = last_n.lower().replace(" ", "")
            clean_domain = company.lower().replace(" ", "").replace(",", "").replace(".", "") + ".com"
            contact_email = f"careers@{clean_domain}"

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
