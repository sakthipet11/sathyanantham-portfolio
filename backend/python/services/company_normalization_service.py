import re
from typing import Dict, Any, List, Optional, Tuple

class CompanyNormalizationService:
    """
    Normalizes company names and resolves enterprise corporate aliases
    to ensure deterministic, high-accuracy contact matching.
    """

    # Well-known enterprise alias mappings (canonical name -> list of aliases)
    CANONICAL_ALIASES: Dict[str, List[str]] = {
        "Google": ["google", "google llc", "google inc", "alphabet", "alphabet inc", "google cloud", "youtube", "deepmind", "google deepmind"],
        "Meta": ["meta", "meta platforms", "meta platforms inc", "facebook", "facebook inc", "instagram", "whatsapp", "oculus"],
        "Amazon": ["amazon", "amazon.com", "amazon web services", "aws", "amazon corporate llc", "twitch", "audible"],
        "Microsoft": ["microsoft", "microsoft corp", "microsoft corporation", "msft", "github", "linkedin", "nuance"],
        "Apple": ["apple", "apple inc", "apple computer", "apple computer inc"],
        "Netflix": ["netflix", "netflix inc"],
        "Stripe": ["stripe", "stripe inc", "stripe payments"],
        "Figma": ["figma", "figma inc"],
        "Vercel": ["vercel", "vercel inc", "zeit"],
        "Linear": ["linear", "linear app", "linear orbit", "linear orbit inc"],
        "Uber": ["uber", "uber technologies", "uber technologies inc"],
        "Airbnb": ["airbnb", "airbnb inc"],
        "Salesforce": ["salesforce", "salesforce.com", "salesforce inc", "slack", "tableau", "mulesoft"],
        "Databricks": ["databricks", "databricks inc"],
        "Snowflake": ["snowflake", "snowflake inc", "snowflake computing"],
        "Atlassian": ["atlassian", "atlassian inc", "jira", "confluence", "trello"],
        "Canva": ["canva", "canva pty ltd"],
        "Adobe": ["adobe", "adobe inc", "adobe systems"],
        "Coinbase": ["coinbase", "coinbase global", "coinbase inc"],
        "Palantir": ["palantir", "palantir technologies", "palantir technologies inc"],
        "Dropbox": ["dropbox", "dropbox inc"],
        "Spotify": ["spotify", "spotify usa", "spotify ab"],
        "Twitter / X": ["twitter", "x corp", "x", "twitter inc"],
        "ByteDance": ["bytedance", "bytedance ltd", "tiktok", "tiktok inc"]
    }

    # Known domain mappings for major companies
    COMPANY_DOMAINS: Dict[str, str] = {
        "google": "google.com",
        "meta": "meta.com",
        "amazon": "amazon.com",
        "microsoft": "microsoft.com",
        "apple": "apple.com",
        "netflix": "netflix.com",
        "stripe": "stripe.com",
        "figma": "figma.com",
        "vercel": "vercel.com",
        "linear": "linear.app",
        "uber": "uber.com",
        "airbnb": "airbnb.com",
        "salesforce": "salesforce.com",
        "databricks": "databricks.com",
        "snowflake": "snowflake.com",
        "atlassian": "atlassian.com",
        "canva": "canva.com",
        "adobe": "adobe.com",
        "coinbase": "coinbase.com",
        "palantir": "palantir.com",
        "dropbox": "dropbox.com",
        "spotify": "spotify.com"
    }

    # Common corporate suffixes to strip
    SUFFIX_REGEX = re.compile(
        r'\b(llc|inc|corp|corporation|ltd|limited|pvt|private|co|company|holdings|technologies|technology|group|l\.p\.|gmbh|sa|bv|pty)\b\.?',
        re.IGNORECASE
    )

    def normalize(self, raw_company_name: Optional[str]) -> str:
        """
        Normalizes a raw company name into a clean, canonical identity.
        Example: 'Google LLC' -> 'Google', 'Meta Platforms, Inc.' -> 'Meta'
        """
        if not raw_company_name:
            return ""

        clean = raw_company_name.strip()
        lower_clean = clean.lower()

        # 1. Check canonical dictionary
        for canonical, aliases in self.CANONICAL_ALIASES.items():
            for alias in aliases:
                if lower_clean == alias or lower_clean == f"{alias}.com":
                    return canonical

        # 2. Check if alias is a prefix/token match
        for canonical, aliases in self.CANONICAL_ALIASES.items():
            for alias in aliases:
                # Match word boundary
                pattern = rf'^{re.escape(alias)}(\s|$|,|\.)'
                if re.search(pattern, lower_clean):
                    return canonical

        # 3. Strip punctuation and common corporate suffixes
        stripped = re.sub(r'[,|()\[\]{}"\']', ' ', clean)
        stripped = self.SUFFIX_REGEX.sub('', stripped)
        stripped = re.sub(r'\s+', ' ', stripped).strip()

        # Title case if all lower or all upper
        if stripped.isupper() or stripped.islower():
            stripped = stripped.title()

        return stripped or clean

    def extract_domain_from_url(self, url: Optional[str]) -> Optional[str]:
        """Extract clean hostname/domain from a URL, stripping subdomains and paths."""
        if not url or not isinstance(url, str):
            return None
        url_clean = url.strip()
        if not url_clean.startswith(('http://', 'https://')):
            url_clean = f"https://{url_clean}"
        try:
            from urllib.parse import urlparse
            netloc = urlparse(url_clean).netloc.lower()
            if not netloc:
                return None
            # Strip port and www.
            netloc = re.sub(r':\d+$', '', netloc)
            netloc = re.sub(r'^www\d*\.', '', netloc)
            # Filter out generic job boards/aggregators
            aggregators = [
                'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
                'ziprecruiter.com', 'google.com', 'naukri.com', 'hirist.com',
                'shine.com', 'timesjobs.com', 'simplyhired.com', 'talent.com',
                'openwebninja.com', 'rapidapi.com'
            ]
            if any(netloc == agg or netloc.endswith(f".{agg}") for agg in aggregators):
                return None
            if '.' in netloc and len(netloc) > 3:
                return netloc
        except Exception:
            pass
        return None

    def resolve_company_domain(self, company_name: str, employer_website: Optional[str] = None, apply_url: Optional[str] = None) -> str:
        """
        Synchronous resolution: extracts from response if available, checks dictionary, or creates clean slug domain.
        """
        # 1. Direct from API employer_website
        dom = self.extract_domain_from_url(employer_website)
        if dom:
            return dom

        # 2. From direct apply_url if non-aggregator
        dom = self.extract_domain_from_url(apply_url)
        if dom:
            return dom

        # 3. Known dictionary
        canonical = self.normalize(company_name).lower()
        if canonical in self.COMPANY_DOMAINS:
            return self.COMPANY_DOMAINS[canonical]
        
        # 4. Clean slug fallback
        clean_slug = re.sub(r'[^a-zA-Z0-9]', '', canonical)
        return f"{clean_slug}.com" if clean_slug else "company.com"

    async def resolve_company_domain_llm(
        self,
        company_name: str,
        employer_website: Optional[str] = None,
        apply_url: Optional[str] = None
    ) -> str:
        """
        Determines the official company domain.
        Priority:
        1. Direct extraction from API response (employer_website or direct apply_url)
        2. Known Enterprise alias dictionary
        3. LLM resolution (Gemini/Nemotron/OpenAI) for unknown/custom companies
        4. Fallback slug domain (e.g. company.com)
        """
        if not company_name:
            return "company.com"

        # 1. Check direct response
        dom = self.extract_domain_from_url(employer_website)
        if dom:
            return dom

        dom = self.extract_domain_from_url(apply_url)
        if dom:
            return dom

        # 2. Check known dictionary
        canonical = self.normalize(company_name).lower()
        if canonical in self.COMPANY_DOMAINS:
            return self.COMPANY_DOMAINS[canonical]

        # 3. LLM Resolution
        try:
            from backend.python.services.ai_providers import GenericLLMProvider
            llm = GenericLLMProvider()
            if llm.is_configured():
                messages = [
                    {
                        "role": "system",
                        "content": "You are a company domain lookup service. Respond with ONLY the official primary website domain (e.g. 'stripe.com' or 'infosys.com'). Do not add any punctuation, markdown, or explanation."
                    },
                    {
                        "role": "user",
                        "content": f"Company: {company_name}"
                    }
                ]
                llm_response = ""
                async for chunk in llm.chat_completion(messages=messages, stream=False, temperature=0.1, max_tokens=20, timeout=4.0):
                    llm_response += chunk
                
                llm_clean = llm_response.strip().lower().replace("http://", "").replace("https://", "").replace("www.", "").rstrip("/")
                # Extract first word/domain if multiple
                match = re.search(r'[a-zA-Z0-9-]+\.[a-zA-Z]{2,}', llm_clean)
                if match:
                    resolved = match.group(0)
                    # Cache in memory
                    self.COMPANY_DOMAINS[canonical] = resolved
                    return resolved
        except Exception:
            pass

        # 4. Clean slug fallback
        clean_slug = re.sub(r'[^a-zA-Z0-9]', '', canonical)
        return f"{clean_slug}.com" if clean_slug else "company.com"

    def match_company(self, company_a: str, company_b: str) -> bool:
        """
        Determines if two company strings refer to the same corporate entity.
        """
        norm_a = self.normalize(company_a).lower()
        norm_b = self.normalize(company_b).lower()

        if not norm_a or not norm_b:
            return False

        if norm_a == norm_b:
            return True

        if norm_a in norm_b or norm_b in norm_a:
            return True

        # Check canonical mapping overlap
        for canonical, aliases in self.CANONICAL_ALIASES.items():
            if (norm_a in aliases or norm_a == canonical.lower()) and (norm_b in aliases or norm_b == canonical.lower()):
                return True

        return False

company_normalization_service = CompanyNormalizationService()
