"""
Portal Mapping Repository

Manages portal_form_mappings table for caching LLM-generated form mappings.
Handles mapping storage, retrieval, validation status, and success/failure tracking.
"""

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


class PortalMappingRepository:
    """Repository for managing portal form mappings"""

    def __init__(self):
        self.db = db_helper

    def get_mapping(self, portal_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get cached mapping for a portal.

        Args:
            portal_identifier: Unique identifier for the portal (e.g., "greenhouse:acme-corp")

        Returns:
            Mapping record if found, None otherwise
        """

        # Try Supabase first
        if self.db.client:
            try:
                result = self.db.client.table("portal_form_mappings").select("*").eq(
                    "portal_identifier", portal_identifier
                ).limit(1).execute()
                if result.data and len(result.data) > 0:
                    return result.data[0]
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] Supabase query error: {e}")

        # Fallback to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "SELECT * FROM portal_form_mappings WHERE portal_identifier = %s LIMIT 1;",
                        (portal_identifier,)
                    )
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return None

    def save_mapping(
        self,
        portal_identifier: str,
        portal_type: str,
        portal_url: str,
        form_structure: Dict[str, Any],
        field_mapping: Dict[str, str],
        validation_status: str = "UNVALIDATED"
    ) -> Dict[str, Any]:
        """
        Save or update a portal mapping.

        Args:
            portal_identifier: Unique identifier (e.g., "greenhouse:acme-corp")
            portal_type: Type (greenhouse, lever, workday, ashby, custom)
            portal_url: Base URL of the portal
            form_structure: Extracted form structure from Playwright
            field_mapping: LLM-generated field mapping
            validation_status: UNVALIDATED, VALIDATED, HUMAN_REVIEWED

        Returns:
            Saved mapping record
        """
        mapping_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        # Calculate form structure hash for change detection
        form_hash = hashlib.sha256(
            json.dumps(form_structure, sort_keys=True).encode()
        ).hexdigest()[:16]

        # Check if mapping already exists
        existing = self.get_mapping(portal_identifier)

        if existing:
            # Update existing mapping
            update_data = {
                "portal_type": portal_type,
                "base_url": portal_url,
                "field_mappings": field_mapping,
                "form_structure_hash": form_hash,
                "validation_status": validation_status,
                "updated_at": now
            }

            # Try Supabase first
            if self.db.client:
                try:
                    result = self.db.client.table("portal_form_mappings").update(update_data).eq(
                        "portal_identifier", portal_identifier
                    ).execute()
                    if result.data and len(result.data) > 0:
                        return result.data[0]
                except Exception as e:
                    print(f"[PORTAL_MAPPING_REPO] Supabase update error: {e}")

            # Fallback to PostgreSQL
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("""
                            UPDATE portal_form_mappings
                            SET portal_type = %s,
                                base_url = %s,
                                field_mappings = %s,
                                form_structure_hash = %s,
                                validation_status = %s,
                                updated_at = %s
                            WHERE portal_identifier = %s
                            RETURNING *;
                        """, (
                            portal_type, portal_url,
                            json.dumps(field_mapping),
                            form_hash, validation_status, now,
                            portal_identifier
                        ))
                        row = cur.fetchone()
                        pg_conn.commit()
                        if row:
                            return dict(row)
                except Exception as e:
                    pg_conn.rollback()
                    print(f"[PORTAL_MAPPING_REPO] PG update error: {e}")
                finally:
                    pg_conn.close()

        else:
            # Insert new mapping
            mapping_data = {
                "id": mapping_id,
                "portal_identifier": portal_identifier,
                "portal_type": portal_type,
                "base_url": portal_url,
                "field_mappings": field_mapping,
                "form_structure_hash": form_hash,
                "validation_status": validation_status,
                "success_count": 0,
                "failure_count": 0,
                "last_used_at": None,
                "created_at": now,
                "updated_at": now
            }

            # Try Supabase first
            if self.db.client:
                try:
                    result = self.db.client.table("portal_form_mappings").insert(mapping_data).execute()
                    if result.data and len(result.data) > 0:
                        return result.data[0]
                except Exception as e:
                    print(f"[PORTAL_MAPPING_REPO] Supabase insert error: {e}")

            # Fallback to PostgreSQL
            pg_conn = self.db._get_pg_connection()
            if pg_conn:
                try:
                    with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute("""
                            INSERT INTO portal_form_mappings
                            (id, portal_identifier, portal_type, base_url,
                             field_mappings, form_structure_hash,
                             validation_status, success_count, failure_count,
                             last_used_at, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING *;
                        """, (
                            mapping_id, portal_identifier, portal_type, portal_url,
                            json.dumps(field_mapping),
                            form_hash, validation_status, 0, 0, None, now, now
                        ))
                        row = cur.fetchone()
                        pg_conn.commit()
                        if row:
                            return dict(row)
                except Exception as e:
                    pg_conn.rollback()
                    print(f"[PORTAL_MAPPING_REPO] PG insert error: {e}")
                finally:
                    pg_conn.close()

        raise Exception("Failed to save mapping - database insert failed")

    def update_success_count(self, portal_identifier: str) -> bool:
        """Increment success count for a mapping"""
        now = datetime.utcnow().isoformat()

        # Try Supabase first
        if self.db.client:
            try:
                # Get current count
                result = self.db.client.table("portal_form_mappings").select("success_count").eq(
                    "portal_identifier", portal_identifier
                ).limit(1).execute()

                if result.data and len(result.data) > 0:
                    current_count = result.data[0].get("success_count", 0)
                    self.db.client.table("portal_form_mappings").update({
                        "success_count": current_count + 1,
                        "last_used_at": now,
                        "updated_at": now
                    }).eq("portal_identifier", portal_identifier).execute()
                    return True
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] Supabase update error: {e}")

        # Fallback to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        UPDATE portal_form_mappings
                        SET success_count = success_count + 1,
                            last_used_at = %s,
                            updated_at = %s
                        WHERE portal_identifier = %s;
                    """, (now, now, portal_identifier))
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[PORTAL_MAPPING_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        return False

    def update_failure_count(self, portal_identifier: str) -> bool:
        """Increment failure count for a mapping"""
        now = datetime.utcnow().isoformat()

        # Try Supabase first
        if self.db.client:
            try:
                # Get current count
                result = self.db.client.table("portal_form_mappings").select("failure_count").eq(
                    "portal_identifier", portal_identifier
                ).limit(1).execute()

                if result.data and len(result.data) > 0:
                    current_count = result.data[0].get("failure_count", 0)
                    self.db.client.table("portal_form_mappings").update({
                        "failure_count": current_count + 1,
                        "last_used_at": now,
                        "updated_at": now
                    }).eq("portal_identifier", portal_identifier).execute()
                    return True
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] Supabase update error: {e}")

        # Fallback to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        UPDATE portal_form_mappings
                        SET failure_count = failure_count + 1,
                            last_used_at = %s,
                            updated_at = %s
                        WHERE portal_identifier = %s;
                    """, (now, now, portal_identifier))
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[PORTAL_MAPPING_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        return False

    def deprecate_mapping(self, portal_identifier: str) -> bool:
        """
        Mark a mapping as deprecated (form structure changed).
        Sets validation_status to DEPRECATED.
        """
        now = datetime.utcnow().isoformat()

        # Try Supabase first
        if self.db.client:
            try:
                self.db.client.table("portal_form_mappings").update({
                    "validation_status": "DEPRECATED",
                    "updated_at": now
                }).eq("portal_identifier", portal_identifier).execute()
                return True
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] Supabase update error: {e}")

        # Fallback to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        UPDATE portal_form_mappings
                        SET validation_status = 'DEPRECATED',
                            updated_at = %s
                        WHERE portal_identifier = %s;
                    """, (now, portal_identifier))
                    pg_conn.commit()
                    return True
            except Exception as e:
                pg_conn.rollback()
                print(f"[PORTAL_MAPPING_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        return False

    def get_statistics(self, portal_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get cache statistics.

        Args:
            portal_type: Optional filter by portal type

        Returns:
            Statistics dictionary
        """
        # Try PostgreSQL for aggregate queries
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    where_clause = ""
                    params = []
                    if portal_type:
                        where_clause = "WHERE portal_type = %s"
                        params.append(portal_type)

                    cur.execute(f"""
                        SELECT
                            COUNT(*) as total_mappings,
                            COUNT(CASE WHEN validation_status = 'VALIDATED' THEN 1 END) as validated_count,
                            COUNT(CASE WHEN validation_status = 'HUMAN_REVIEWED' THEN 1 END) as human_reviewed_count,
                            COUNT(CASE WHEN validation_status = 'UNVALIDATED' THEN 1 END) as unvalidated_count,
                            COUNT(CASE WHEN validation_status = 'DEPRECATED' THEN 1 END) as deprecated_count,
                            AVG(CASE WHEN (success_count + failure_count) > 0
                                THEN (success_count::float / (success_count + failure_count) * 100)
                                ELSE 0 END) as avg_success_rate
                        FROM portal_form_mappings
                        {where_clause};
                    """, params)
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return {
            "total_mappings": 0,
            "validated_count": 0,
            "human_reviewed_count": 0,
            "unvalidated_count": 0,
            "deprecated_count": 0,
            "avg_success_rate": 0.0
        }

    def get_unreliable_mappings(
        self,
        min_attempts: int = 10,
        max_failure_rate: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Get mappings with high failure rates.

        Args:
            min_attempts: Minimum total attempts before considering
            max_failure_rate: Maximum acceptable failure rate (0.0-1.0)

        Returns:
            List of unreliable mappings
        """
        # Try PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT
                            portal_identifier,
                            portal_type,
                            success_count,
                            failure_count,
                            (success_count + failure_count) as total_attempts,
                            (failure_count::float / (success_count + failure_count) * 100) as failure_rate
                        FROM portal_form_mappings
                        WHERE (success_count + failure_count) >= %s
                        AND (failure_count::float / (success_count + failure_count)) > %s
                        ORDER BY failure_rate DESC;
                    """, (min_attempts, max_failure_rate))
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
            except Exception as e:
                print(f"[PORTAL_MAPPING_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        return []


# Singleton instance
portal_mapping_repository = PortalMappingRepository()
