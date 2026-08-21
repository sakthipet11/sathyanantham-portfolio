import os
import re
import httpx
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

class WebsiteContactsEnrichmentService:
    """
    Enriches corporate and recruiter contact details using OpenWeb Ninja Website Contacts Scraper API
    (https://app.openwebninja.com/api/website-contacts-scraper) and intelligent domain email heuristics.
    """

    def __init__(self):
        self.api_key = os.getenv("JSEARCH_API_KEY", "").strip()
        self.api_url = os.getenv("WEBSITE_CONTACTS_API_URL", "https://api.openwebninja.com/website-contacts-scraper/extract").strip()
        self._cache: Dict[str, Dict[str, Any]] = {}

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def scrape_website_contacts(self, domain_or_url: str) -> Dict[str, Any]:
        """
        Calls OpenWeb Ninja Website Contacts Scraper API for a given domain or URL.
        Extracts verified emails, social profiles (LinkedIn, Twitter), and contact points.
        """
        if not domain_or_url:
            return {"emails": [], "linkedin": [], "social": {}}

        clean_domain = domain_or_url.replace("https://", "").replace("http://", "").split("/")[0].strip()
        if clean_domain in self._cache:
            return self._cache[clean_domain]

        if not self.is_configured():
            print(f"[CONTACT_ENRICHMENT] OpenWeb Ninja API key not configured; using domain pattern heuristics.")
            return {"emails": [], "linkedin": [], "social": {}}

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try direct OpenWeb Ninja extract endpoint
                res = await client.get(
                    self.api_url,
                    params={"domain": clean_domain},
                    headers=headers
                )

                if res.status_code == 200:
                    data = res.json()
                    parsed_result = {
                        "emails": data.get("emails", []) or data.get("data", {}).get("emails", []),
                        "linkedin": data.get("linkedin_urls", []) or data.get("data", {}).get("linkedin", []),
                        "phones": data.get("phones", []) or data.get("data", {}).get("phones", []),
                        "social": data.get("social_profiles", {}) or data.get("data", {}).get("social", {})
                    }
                    self._cache[clean_domain] = parsed_result
                    print(f"[CONTACT_ENRICHMENT] OpenWeb Ninja scraped {len(parsed_result['emails'])} emails for {clean_domain}.")
                    return parsed_result
                else:
                    print(f"[CONTACT_ENRICHMENT] OpenWeb Ninja API returned status {res.status_code}: {res.text[:150]}")
        except Exception as e:
            print(f"[CONTACT_ENRICHMENT] Warning calling OpenWeb Ninja scraper for {clean_domain}: {e}")

        return {"emails": [], "linkedin": [], "social": {}}

    def generate_corporate_email(self, person_name: str, domain: str) -> str:
        """
        Generates standard corporate email format for high-accuracy direct outreach.
        Pattern: first.last@domain
        """
        if not person_name or not domain:
            return ""

        parts = [re.sub(r'[^a-zA-Z0-9]', '', p.lower()) for p in person_name.split() if p.strip()]
        if len(parts) >= 2:
            email_local = f"{parts[0]}.{parts[-1]}"
        elif len(parts) == 1:
            email_local = parts[0]
        else:
            email_local = "referrals"

        clean_domain = domain.replace("https://", "").replace("http://", "").split("/")[0].strip()
        return f"{email_local}@{clean_domain}"

    async def resolve_best_contact_email(
        self,
        person_name: str,
        company_domain: str,
        existing_email: Optional[str] = None
    ) -> str:
        """
        Resolves the most reliable direct email address:
        1. Uses existing verified email if already available.
        2. Scrapes website contacts via OpenWeb Ninja.
        3. Falls back to standardized corporate domain email.
        """
        if existing_email and "@" in existing_email and "." in existing_email:
            return existing_email.strip()

        # Try OpenWeb Ninja scraper
        scraped = await self.scrape_website_contacts(company_domain)
        scraped_emails = scraped.get("emails", [])

        # Check if any scraped email matches the person's name
        first_name = (person_name.split()[0] if person_name else "").lower()
        last_name = (person_name.split()[-1] if person_name and len(person_name.split()) > 1 else "").lower()

        for em in scraped_emails:
            em_lower = em.lower()
            if first_name and first_name in em_lower:
                return em
            if last_name and last_name in em_lower:
                return em

        # Fallback to standard corporate email pattern
        return self.generate_corporate_email(person_name, company_domain)

website_contacts_enrichment_service = WebsiteContactsEnrichmentService()
