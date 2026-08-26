"""
Form Mapping Service using LLM

Uses LLM to intelligently map candidate profile fields to job application form inputs.
Caches successful mappings per portal to avoid repeated LLM calls.
"""

from typing import Dict, Any, Optional, List
import json
import hashlib
from datetime import datetime

# Import your centralized LLM provider
# Adjust the import path based on your actual LLM setup
# from backend.python.services.llm_service import get_llm_client


class FormMappingService:
    """
    Intelligent form field mapping service powered by LLM.
    Maps candidate profile data to job application form fields.
    """

    def __init__(self, cache_service=None):
        """
        Initialize FormMappingService.

        Args:
            cache_service: PortalMappingCacheService instance for caching
        """
        self.cache_service = cache_service
        # self.llm_client = get_llm_client()  # Your centralized LLM provider

    async def get_or_create_mapping(
        self,
        portal_identifier: str,
        portal_type: str,
        form_structure: Dict[str, Any],
        candidate_fields: List[str]
    ) -> Dict[str, Any]:
        """
        Get cached mapping or create new one via LLM.

        Args:
            portal_identifier: Unique portal ID (e.g., "greenhouse:acme-corp")
            portal_type: Portal type (greenhouse, lever, workday, custom)
            form_structure: Extracted form structure from Playwright
            candidate_fields: List of candidate data fields to map

        Returns:
            Field mapping dictionary
        """
        # Check cache first
        if self.cache_service:
            cached_mapping = await self.cache_service.get_cached_mapping(portal_identifier)

            if cached_mapping:
                # Verify form hasn't changed
                current_hash = form_structure.get('form_hash', '')
                if cached_mapping.get('form_structure_hash') == current_hash:
                    print(f"[FORM_MAPPING] Using cached mapping for {portal_identifier}")
                    return cached_mapping.get('field_mappings', {})
                else:
                    print(f"[FORM_MAPPING] Form structure changed for {portal_identifier}, regenerating...")

        # Generate new mapping via LLM
        print(f"[FORM_MAPPING] Generating new mapping for {portal_identifier}")
        mapping = await self.generate_mapping_via_llm(
            form_structure=form_structure,
            candidate_fields=candidate_fields,
            portal_type=portal_type
        )

        # Cache the mapping
        if self.cache_service and mapping:
            await self.cache_service.save_mapping(
                portal_identifier=portal_identifier,
                portal_type=portal_type,
                form_structure_hash=form_structure.get('form_hash', ''),
                field_mappings=mapping,
                validation_status='UNVALIDATED'
            )

        return mapping

    async def generate_mapping_via_llm(
        self,
        form_structure: Dict[str, Any],
        candidate_fields: List[str],
        portal_type: str = 'custom'
    ) -> Dict[str, str]:
        """
        Generate field mapping using LLM analysis.

        Args:
            form_structure: Form HTML and field information
            candidate_fields: Candidate data fields to map
            portal_type: Type of portal for context

        Returns:
            Field mapping dictionary {field_name: css_selector}
        """
        # Build comprehensive field information
        field_info = self._build_field_info(form_structure.get('fields', []))

        # Create LLM prompt
        prompt = self._create_mapping_prompt(
            form_html=form_structure.get('form_html', ''),
            field_info=field_info,
            candidate_fields=candidate_fields,
            portal_type=portal_type
        )

        try:
            # Call LLM - replace with your actual LLM service
            # response = await self.llm_client.generate(prompt)
            # mapping = self._parse_llm_response(response)

            # TEMPORARY: Return a basic mapping structure
            # This will be replaced with actual LLM call
            mapping = await self._generate_basic_mapping(form_structure.get('fields', []))

            return mapping

        except Exception as e:
            print(f"[FORM_MAPPING] LLM mapping generation failed: {str(e)}")
            # Fallback to heuristic mapping
            return await self._generate_basic_mapping(form_structure.get('fields', []))

    def _build_field_info(self, fields: List[Dict[str, Any]]) -> str:
        """
        Build human-readable field information for LLM.

        Args:
            fields: List of field dictionaries

        Returns:
            Formatted field information string
        """
        field_lines = []
        for i, field in enumerate(fields, 1):
            field_type = field.get('type', 'text')
            field_id = field.get('id', '')
            field_name = field.get('name', '')
            field_label = field.get('label', '')
            field_placeholder = field.get('placeholder', '')
            required = field.get('required', False)

            line = f"{i}. Type: {field_type}"
            if field_id:
                line += f", ID: {field_id}"
            if field_name:
                line += f", Name: {field_name}"
            if field_label:
                line += f", Label: {field_label}"
            if field_placeholder:
                line += f", Placeholder: {field_placeholder}"
            if required:
                line += " [REQUIRED]"

            field_lines.append(line)

        return "\n".join(field_lines)

    def _create_mapping_prompt(
        self,
        form_html: str,
        field_info: str,
        candidate_fields: List[str],
        portal_type: str
    ) -> str:
        """
        Create LLM prompt for field mapping.

        Args:
            form_html: Form HTML snippet
            field_info: Human-readable field information
            candidate_fields: Candidate data fields to map
            portal_type: Portal type for context

        Returns:
            LLM prompt string
        """
        candidate_fields_desc = {
            'full_name': 'Full name (First + Last)',
            'email': 'Email address',
            'phone': 'Phone number',
            'location': 'Location/City',
            'linkedin': 'LinkedIn profile URL',
            'resume': 'Resume file upload',
            'cover_letter': 'Cover letter text or file',
            'years_of_experience': 'Years of experience (number)',
            'current_company': 'Current/most recent company',
            'work_authorization': 'Work authorization status (e.g., US Citizen)',
            'primary_skills': 'Primary technical skills',
            'portfolio_url': 'Portfolio website URL',
            'github_url': 'GitHub profile URL'
        }

        candidate_fields_list = "\n".join([
            f"- {field}: {candidate_fields_desc.get(field, 'Candidate data field')}"
            for field in candidate_fields
        ])

        prompt = f"""You are an expert at analyzing job application forms and mapping data fields.

Portal Type: {portal_type}

Available Form Fields:
{field_info}

Candidate Data Fields to Map:
{candidate_fields_list}

Your task:
1. Analyze the form fields above
2. Map each candidate data field to the most appropriate form field
3. Use CSS selectors (prefer ID > Name > Type)
4. Only map fields that clearly exist in the form
5. Mark required fields

Output ONLY a JSON object with this structure:
{{
  "full_name": "input#applicant-name",
  "email": "input[type='email']#email",
  "phone": "input#phone",
  "resume": "input[type='file']#resume-upload",
  ...
}}

Rules:
- Use specific CSS selectors (ID selector is best: #field-id)
- If no exact match, use closest semantic match
- Omit fields that don't exist in the form
- For file uploads, use input[type='file'] selectors
- For text areas, use textarea selectors

Return ONLY the JSON mapping, no explanation or markdown formatting.
"""

        return prompt

    async def _generate_basic_mapping(self, fields: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Generate basic mapping using heuristic rules (fallback).

        Args:
            fields: List of field dictionaries

        Returns:
            Field mapping dictionary
        """
        mapping = {}

        # Common field patterns
        field_patterns = {
            'full_name': ['name', 'fullname', 'full_name', 'applicant_name'],
            'first_name': ['first_name', 'firstname', 'fname', 'given_name'],
            'last_name': ['last_name', 'lastname', 'lname', 'family_name'],
            'email': ['email', 'e-mail', 'email_address'],
            'phone': ['phone', 'telephone', 'mobile', 'phone_number'],
            'location': ['location', 'city', 'address', 'current_location'],
            'linkedin': ['linkedin', 'linkedin_url', 'linkedin_profile'],
            'resume': ['resume', 'cv', 'curriculum'],
            'cover_letter': ['cover', 'cover_letter', 'coverletter', 'letter'],
            'portfolio_url': ['portfolio', 'website', 'personal_website'],
            'github_url': ['github', 'github_url'],
            'years_of_experience': ['experience', 'years_experience', 'yoe'],
            'current_company': ['company', 'current_company', 'employer']
        }

        for field in fields:
            field_id = field.get('id', '').lower()
            field_name = field.get('name', '').lower()
            field_type = field.get('type', 'text').lower()
            field_label = field.get('label', '').lower()

            # Build selector
            if field_id:
                selector = f"input#{field_id}"
            elif field_name:
                selector = f"input[name='{field_name}']"
            else:
                continue

            # Match to candidate fields
            for candidate_field, patterns in field_patterns.items():
                for pattern in patterns:
                    if (pattern in field_id or
                        pattern in field_name or
                        pattern in field_label):

                        # Adjust selector based on field type
                        if field_type == 'file':
                            selector = f"input[type='file']#{field_id}" if field_id else f"input[type='file'][name='{field_name}']"
                        elif field.get('tag') == 'textarea':
                            selector = f"textarea#{field_id}" if field_id else f"textarea[name='{field_name}']"

                        mapping[candidate_field] = selector
                        break

        return mapping

    async def validate_mapping(
        self,
        page: Any,  # Playwright Page
        mapping: Dict[str, str]
    ) -> tuple[bool, List[str]]:
        """
        Validate that mapping selectors exist on the page.

        Args:
            page: Playwright Page object
            mapping: Field mapping to validate

        Returns:
            Tuple of (is_valid, list of missing selectors)
        """
        missing_selectors = []

        for field_name, selector in mapping.items():
            if field_name.startswith('_'):
                continue

            try:
                element = await page.query_selector(selector)
                if not element:
                    missing_selectors.append(f"{field_name} -> {selector}")
            except Exception as e:
                missing_selectors.append(f"{field_name} -> {selector} (error: {str(e)})")

        is_valid = len(missing_selectors) == 0

        return is_valid, missing_selectors

    def _parse_llm_response(self, response: str) -> Dict[str, str]:
        """
        Parse LLM response to extract JSON mapping.

        Args:
            response: Raw LLM response

        Returns:
            Parsed mapping dictionary
        """
        try:
            # Try to extract JSON from response
            # Handle potential markdown code blocks
            response = response.strip()

            if response.startswith('```'):
                # Remove markdown code block
                lines = response.split('\n')
                json_lines = [line for line in lines if not line.startswith('```')]
                response = '\n'.join(json_lines).strip()

            # Parse JSON
            mapping = json.loads(response)
            return mapping

        except json.JSONDecodeError as e:
            print(f"[FORM_MAPPING] Failed to parse LLM response as JSON: {str(e)}")
            return {}


# Singleton instance
_form_mapping_service: Optional[FormMappingService] = None


def get_form_mapping_service(cache_service=None) -> FormMappingService:
    """
    Get singleton instance of FormMappingService.

    Args:
        cache_service: Optional PortalMappingCacheService instance

    Returns:
        FormMappingService instance
    """
    global _form_mapping_service
    if _form_mapping_service is None:
        _form_mapping_service = FormMappingService(cache_service=cache_service)
    return _form_mapping_service
