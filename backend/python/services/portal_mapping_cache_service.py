"""
Portal Mapping Cache Service

Manages CRUD operations for cached portal form field mappings.
Tracks success/failure rates and validation status.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import json


class PortalMappingCacheService:
    """
    Service for managing cached portal form mappings.
    Handles caching, validation, and lifecycle of LLM-generated mappings.
    """

    def __init__(self, repository=None):
        """
        Initialize PortalMappingCacheService.

        Args:
            repository: PortalMappingRepository instance for database operations
        """
        self.repository = repository

        # Import repository here if not provided
        if self.repository is None:
            from backend.python.repositories.portal_mapping_repository import portal_mapping_repository
            self.repository = portal_mapping_repository

    async def get_cached_mapping(self, portal_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached mapping for a portal.

        Args:
            portal_identifier: Unique portal ID (e.g., "greenhouse:acme-corp")

        Returns:
            Cached mapping dict or None if not found/invalid
        """
        if not self.repository:
            return None

        try:
            mapping = self.repository.get_mapping(portal_identifier)

            if not mapping:
                return None

            # Check if mapping is deprecated
            if mapping.get('validation_status') == 'DEPRECATED':
                print(f"[CACHE] Mapping for {portal_identifier} is deprecated")
                return None

            # Parse JSON strings to dicts
            if isinstance(mapping.get('form_structure'), str):
                mapping['form_structure'] = json.loads(mapping['form_structure'])
            if isinstance(mapping.get('field_mapping'), str):
                mapping['field_mapping'] = json.loads(mapping['field_mapping'])

            # Check failure rate - if too high, consider invalid
            success_count = mapping.get('success_count', 0)
            failure_count = mapping.get('failure_count', 0)
            total = success_count + failure_count

            if total > 10 and failure_count / total > 0.3:  # >30% failure rate
                print(f"[CACHE] Mapping for {portal_identifier} has high failure rate: {failure_count}/{total}")
                # Don't return, but log warning
                # Could auto-deprecate here if needed

            return mapping

        except Exception as e:
            print(f"[CACHE] Error retrieving cached mapping: {str(e)}")
            return None

    async def save_mapping(
        self,
        portal_identifier: str,
        portal_type: str,
        portal_url: str,
        form_structure: Dict[str, Any],
        field_mapping: Dict[str, str],
        validation_status: str = 'UNVALIDATED'
    ) -> bool:
        """
        Save or update a portal mapping.

        Args:
            portal_identifier: Unique portal ID
            portal_type: Portal type (greenhouse, lever, etc.)
            portal_url: Portal base URL
            form_structure: Full form structure from Playwright
            field_mapping: Field mapping dictionary
            validation_status: Validation status

        Returns:
            True if saved successfully
        """
        if not self.repository:
            return False

        try:
            self.repository.save_mapping(
                portal_identifier=portal_identifier,
                portal_type=portal_type,
                portal_url=portal_url,
                form_structure=form_structure,
                field_mapping=field_mapping,
                validation_status=validation_status
            )
            return True

        except Exception as e:
            print(f"[CACHE] Error saving mapping: {str(e)}")
            return False

    async def update_success_count(self, portal_identifier: str) -> None:
        """
        Increment success count for a mapping.

        Args:
            portal_identifier: Portal identifier
        """
        if not self.repository:
            return

        try:
            self.repository.update_success_count(portal_identifier)
        except Exception as e:
            print(f"[CACHE] Error updating success count: {str(e)}")

    async def update_failure_count(self, portal_identifier: str) -> None:
        """
        Increment failure count for a mapping.

        Args:
            portal_identifier: Portal identifier
        """
        if not self.repository:
            return

        try:
            self.repository.update_failure_count(portal_identifier)
        except Exception as e:
            print(f"[CACHE] Error updating failure count: {str(e)}")

    async def mark_as_validated(self, portal_identifier: str) -> None:
        """
        Mark mapping as human-reviewed and validated.

        Args:
            portal_identifier: Portal identifier
        """
        if not self.repository:
            return

        try:
            mapping = self.repository.get_mapping(portal_identifier)
            if mapping:
                # Re-save with VALIDATED status
                if isinstance(mapping.get('form_structure'), str):
                    mapping['form_structure'] = json.loads(mapping['form_structure'])
                if isinstance(mapping.get('field_mapping'), str):
                    mapping['field_mapping'] = json.loads(mapping['field_mapping'])

                self.repository.save_mapping(
                    portal_identifier=portal_identifier,
                    portal_type=mapping['portal_type'],
                    portal_url=mapping['portal_url'],
                    form_structure=mapping['form_structure'],
                    field_mapping=mapping['field_mapping'],
                    validation_status='VALIDATED'
                )
        except Exception as e:
            print(f"[CACHE] Error marking as validated: {str(e)}")

    async def mark_as_human_reviewed(self, portal_identifier: str) -> None:
        """
        Mark mapping as human-reviewed (first-time approval).

        Args:
            portal_identifier: Portal identifier
        """
        if not self.repository:
            return

        try:
            mapping = self.repository.get_mapping(portal_identifier)
            if mapping:
                # Re-save with HUMAN_REVIEWED status
                if isinstance(mapping.get('form_structure'), str):
                    mapping['form_structure'] = json.loads(mapping['form_structure'])
                if isinstance(mapping.get('field_mapping'), str):
                    mapping['field_mapping'] = json.loads(mapping['field_mapping'])

                self.repository.save_mapping(
                    portal_identifier=portal_identifier,
                    portal_type=mapping['portal_type'],
                    portal_url=mapping['portal_url'],
                    form_structure=mapping['form_structure'],
                    field_mapping=mapping['field_mapping'],
                    validation_status='HUMAN_REVIEWED'
                )
        except Exception as e:
            print(f"[CACHE] Error marking as human reviewed: {str(e)}")

    async def deprecate_mapping(self, portal_identifier: str, reason: str = '') -> None:
        """
        Mark mapping as deprecated (form changed, no longer valid).

        Args:
            portal_identifier: Portal identifier
            reason: Reason for deprecation
        """
        if not self.repository:
            return

        try:
            self.repository.deprecate_mapping(portal_identifier)
            print(f"[CACHE] Deprecated mapping for {portal_identifier}: {reason}")
        except Exception as e:
            print(f"[CACHE] Error deprecating mapping: {str(e)}")

    async def check_form_changed(
        self,
        portal_identifier: str,
        current_hash: str
    ) -> bool:
        """
        Check if form structure has changed since cached mapping.

        Args:
            portal_identifier: Portal identifier
            current_hash: Current form structure hash

        Returns:
            True if form has changed
        """
        mapping = await self.get_cached_mapping(portal_identifier)

        if not mapping:
            return True  # No cache, consider it changed

        cached_hash = mapping.get('form_structure_hash', '')
        has_changed = cached_hash != current_hash

        if has_changed:
            print(f"[CACHE] Form structure changed for {portal_identifier}")
            # Auto-deprecate old mapping
            await self.deprecate_mapping(
                portal_identifier,
                reason=f"Form hash changed from {cached_hash[:8]} to {current_hash[:8]}"
            )

        return has_changed

    async def get_portal_statistics(self, portal_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get statistics about cached mappings.

        Args:
            portal_type: Optional filter by portal type

        Returns:
            Statistics dictionary
        """
        if not self.repository:
            return {}

        try:
            return self.repository.get_statistics(portal_type=portal_type)
        except Exception as e:
            print(f"[CACHE] Error getting statistics: {str(e)}")
            return {}

    async def get_unreliable_mappings(self, min_attempts: int = 10, max_failure_rate: float = 0.3) -> List[Dict[str, Any]]:
        """
        Get mappings with high failure rates that need attention.

        Args:
            min_attempts: Minimum number of attempts before considering
            max_failure_rate: Maximum acceptable failure rate (0.0-1.0)

        Returns:
            List of unreliable mappings
        """
        if not self.repository:
            return []

        try:
            return self.repository.get_unreliable_mappings(
                min_attempts=min_attempts,
                max_failure_rate=max_failure_rate
            )
        except Exception as e:
            print(f"[CACHE] Error getting unreliable mappings: {str(e)}")
            return []


# Singleton instance
_cache_service: Optional[PortalMappingCacheService] = None


def get_portal_mapping_cache_service(repository=None) -> PortalMappingCacheService:
    """
    Get singleton instance of PortalMappingCacheService.

    Args:
        repository: Optional PortalMappingRepository instance

    Returns:
        PortalMappingCacheService instance
    """
    global _cache_service
    if _cache_service is None:
        _cache_service = PortalMappingCacheService(repository=repository)
    return _cache_service
