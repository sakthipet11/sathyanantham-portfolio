import os
import csv
import io
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.company_normalization_service import company_normalization_service

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None

class ConnectionRepository:
    """
    Persistence & Ingestion layer for Sakthi's 1st-degree LinkedIn connections,
    recruiter directory, and Apify-enriched contacts.
    Supports PostgreSQL table 'connections' with high-performance in-memory cache.
    """

    def __init__(self):
        self.db = db_helper
        self._in_memory_connections: Dict[str, Dict[str, Any]] = {}
        self._last_ingested_at: Optional[str] = None
        self._repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    def list_connections(
        self,
        query: Optional[str] = None,
        company: Optional[str] = None,
        connection_degree: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists connections with optional multi-attribute filtering."""
        # Try Supabase if available
        if self.db.client:
            try:
                sb_query = self.db.client.table("connections").select("*")
                if company:
                    sb_query = sb_query.ilike("company", f"%{company}%")
                if connection_degree and connection_degree != "ALL":
                    sb_query = sb_query.eq("connection_degree", connection_degree)
                if source and source != "ALL":
                    if source in ("APIFY_RECRUITER", "APIFY"):
                        sb_query = sb_query.in_("source", ["APIFY_RECRUITER", "APIFY_MAPS_DISCOVERY", "APIFY_HR_DISCOVERY"])
                    else:
                        sb_query = sb_query.eq("source", source)
                if query:
                    sb_query = sb_query.or_(f"full_name.ilike.%{query}%,company.ilike.%{query}%,position.ilike.%{query}%")
                
                res = sb_query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase query error: {e}")

        # Try PostgreSQL direct connection
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    sql = "SELECT * FROM connections"
                    conds = []
                    params = []
                    if company:
                        conds.append("company ILIKE %s")
                        params.append(f"%{company}%")
                    if connection_degree and connection_degree != "ALL":
                        conds.append("connection_degree = %s")
                        params.append(connection_degree)
                    if source and source != "ALL":
                        if source in ("APIFY_RECRUITER", "APIFY"):
                            conds.append("source IN ('APIFY_RECRUITER', 'APIFY_MAPS_DISCOVERY', 'APIFY_HR_DISCOVERY')")
                        else:
                            conds.append("source = %s")
                            params.append(source)
                    if query:
                        conds.append("(full_name ILIKE %s OR company ILIKE %s OR position ILIKE %s OR email ILIKE %s)")
                        q_param = f"%{query}%"
                        params.extend([q_param, q_param, q_param, q_param])
                    
                    if conds:
                        sql += " WHERE " + " AND ".join(conds)
                    sql += " ORDER BY created_at DESC LIMIT %s OFFSET %s;"
                    params.extend([limit, offset])
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
                    if rows:
                        return [dict(r) for r in rows]
            except Exception as e:
                print(f"[CONNECTION_REPO] PG query error: {e}")
            finally:
                pg_conn.close()

        # In-memory / cache query
        results = list(self._in_memory_connections.values())
        if company:
            results = [c for c in results if company.lower() in (c.get("company") or "").lower()]
        if connection_degree and connection_degree != "ALL":
            results = [c for c in results if c.get("connection_degree") == connection_degree]
        if source and source != "ALL":
            results = [c for c in results if c.get("source") == source]
        if query:
            q_lower = query.lower()
            results = [
                c for c in results
                if q_lower in (c.get("full_name") or "").lower()
                or q_lower in (c.get("company") or "").lower()
                or q_lower in (c.get("position") or "").lower()
                or q_lower in (c.get("email") or "").lower()
            ]

        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results[offset:offset + limit]

    def get_connection_by_id(self, conn_id: str) -> Optional[Dict[str, Any]]:
        conn_id_str = str(conn_id)
        if self.db.client:
            try:
                res = self.db.client.table("connections").select("*").eq("id", conn_id_str).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase get error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM connections WHERE id::text = %s LIMIT 1;", (conn_id_str,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print(f"[CONNECTION_REPO] PG get error: {e}")
            finally:
                pg_conn.close()

        return self._in_memory_connections.get(conn_id_str)

    def create_connection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates and stores a single connection."""
        conn_id = data.get("id") or str(uuid.uuid4())
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        full_name = data.get("full_name") or f"{first_name} {last_name}".strip()
        
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "id": conn_id,
            "first_name": first_name or full_name.split()[0] if full_name else "Unknown",
            "last_name": last_name or (" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""),
            "full_name": full_name or "Unknown Contact",
            "company": (data.get("company") or "").strip(),
            "position": (data.get("position") or data.get("role") or "").strip(),
            "location": (data.get("location") or "").strip(),
            "email": (data.get("email") or "").strip() or None,
            "linkedin_url": (data.get("linkedin_url") or data.get("url") or "").strip() or None,
            "connection_degree": data.get("connection_degree") or "1st",
            "connected_on": data.get("connected_on"),
            "source": data.get("source") or "MANUAL_ENTRY",
            "tags": data.get("tags") or [],
            "raw_metadata": data.get("raw_metadata") or {},
            "created_at": data.get("created_at") or now_iso,
            "updated_at": now_iso
        }

        # Cache in memory
        self._in_memory_connections[conn_id] = record

        # Persist to Supabase
        if self.db.client:
            try:
                self.db.client.table("connections").upsert(record).execute()
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase create error: {e}")

        # Persist to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO connections (
                            id, first_name, last_name, full_name, company, position,
                            location, email, linkedin_url, connection_degree, connected_on,
                            source, tags, raw_metadata, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            full_name = EXCLUDED.full_name,
                            company = EXCLUDED.company,
                            position = EXCLUDED.position,
                            location = EXCLUDED.location,
                            email = EXCLUDED.email,
                            linkedin_url = EXCLUDED.linkedin_url,
                            connection_degree = EXCLUDED.connection_degree,
                            updated_at = EXCLUDED.updated_at;
                    """, (
                        record["id"], record["first_name"], record["last_name"], record["full_name"],
                        record["company"], record["position"], record["location"], record["email"],
                        record["linkedin_url"], record["connection_degree"], record["connected_on"],
                        record["source"], record["tags"], psycopg2.extras.Json(record["raw_metadata"]) if hasattr(psycopg2.extras, 'Json') else "{}",
                        record["created_at"], record["updated_at"]
                    ))
                    pg_conn.commit()
            except Exception as e:
                print(f"[CONNECTION_REPO] PG insert error: {e}")
            finally:
                pg_conn.close()

        return record

    def update_connection(self, conn_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_connection_by_id(conn_id)
        if not existing:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        merged = {**existing, **updates, "updated_at": now_iso}
        if "first_name" in updates or "last_name" in updates:
            fn = updates.get("first_name", merged.get("first_name", ""))
            ln = updates.get("last_name", merged.get("last_name", ""))
            merged["full_name"] = f"{fn} {ln}".strip()

        self._in_memory_connections[str(conn_id)] = merged

        if self.db.client:
            try:
                self.db.client.table("connections").update(merged).eq("id", str(conn_id)).execute()
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase update error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("""
                        UPDATE connections SET
                            first_name = %s, last_name = %s, full_name = %s,
                            company = %s, position = %s, location = %s,
                            email = %s, linkedin_url = %s, connection_degree = %s,
                            source = %s, updated_at = %s
                        WHERE id::text = %s;
                    """, (
                        merged["first_name"], merged["last_name"], merged["full_name"],
                        merged["company"], merged["position"], merged.get("location"),
                        merged.get("email"), merged.get("linkedin_url"), merged.get("connection_degree"),
                        merged.get("source"), merged["updated_at"], str(conn_id)
                    ))
                    pg_conn.commit()
            except Exception as e:
                print(f"[CONNECTION_REPO] PG update error: {e}")
            finally:
                pg_conn.close()

        return merged

    def delete_connection(self, conn_id: str) -> bool:
        conn_id_str = str(conn_id)
        self._in_memory_connections.pop(conn_id_str, None)

        if self.db.client:
            try:
                self.db.client.table("connections").delete().eq("id", conn_id_str).execute()
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase delete error: {e}")

        pg_conn = self.db._get_pg_connection()
        if pg_conn:
            try:
                with pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM connections WHERE id::text = %s;", (conn_id_str,))
                    pg_conn.commit()
            except Exception as e:
                print(f"[CONNECTION_REPO] PG delete error: {e}")
            finally:
                pg_conn.close()

        return True

    def bulk_delete_connections(self, conn_ids: List[str]) -> int:
        deleted = 0
        for c_id in conn_ids:
            if self.delete_connection(c_id):
                deleted += 1
        return deleted

    def bulk_upsert_connections(self, records: List[Dict[str, Any]]) -> int:
        """Batch upserts multiple connections to in-memory, Supabase, and PostgreSQL."""
        if not records:
            return 0

        now_iso = datetime.now(timezone.utc).isoformat()
        cleaned_records = []
        for data in records:
            conn_id = data.get("id") or str(uuid.uuid4())
            first_name = (data.get("first_name") or "").strip()
            last_name = (data.get("last_name") or "").strip()
            full_name = data.get("full_name") or f"{first_name} {last_name}".strip()

            rec = {
                "id": conn_id,
                "first_name": first_name or (full_name.split()[0] if full_name else "Unknown"),
                "last_name": last_name or (" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""),
                "full_name": full_name or "Unknown Contact",
                "company": (data.get("company") or "").strip(),
                "position": (data.get("position") or data.get("role") or "").strip(),
                "location": (data.get("location") or "").strip(),
                "email": (data.get("email") or "").strip() or None,
                "linkedin_url": (data.get("linkedin_url") or data.get("url") or "").strip() or None,
                "connection_degree": data.get("connection_degree") or "1st",
                "connected_on": data.get("connected_on"),
                "source": data.get("source") or "MANUAL_ENTRY",
                "tags": data.get("tags") or [],
                "raw_metadata": data.get("raw_metadata") or {},
                "created_at": data.get("created_at") or now_iso,
                "updated_at": now_iso
            }
            self._in_memory_connections[conn_id] = rec
            cleaned_records.append(rec)

        # Batch upsert to Supabase
        if self.db.client:
            try:
                # Chunk in batches of 100 for Supabase
                for i in range(0, len(cleaned_records), 100):
                    chunk = cleaned_records[i:i + 100]
                    self.db.client.table("connections").upsert(chunk).execute()
            except Exception as e:
                print(f"[CONNECTION_REPO] Supabase batch upsert error: {e}")

        # Batch upsert to PostgreSQL
        pg_conn = self.db._get_pg_connection()
        if pg_conn and psycopg2:
            try:
                with pg_conn.cursor() as cur:
                    psycopg2.extras.execute_batch(cur, """
                        INSERT INTO connections (
                            id, first_name, last_name, full_name, company, position,
                            location, email, linkedin_url, connection_degree, connected_on,
                            source, tags, raw_metadata, created_at, updated_at
                        ) VALUES (
                            %(id)s, %(first_name)s, %(last_name)s, %(full_name)s, %(company)s, %(position)s,
                            %(location)s, %(email)s, %(linkedin_url)s, %(connection_degree)s, %(connected_on)s,
                            %(source)s, %(tags)s, %(raw_metadata)s, %(created_at)s, %(updated_at)s
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            full_name = EXCLUDED.full_name,
                            company = EXCLUDED.company,
                            position = EXCLUDED.position,
                            location = EXCLUDED.location,
                            email = EXCLUDED.email,
                            linkedin_url = EXCLUDED.linkedin_url,
                            connection_degree = EXCLUDED.connection_degree,
                            updated_at = EXCLUDED.updated_at;
                    """, [
                        {
                            **r,
                            "raw_metadata": psycopg2.extras.Json(r["raw_metadata"]) if hasattr(psycopg2.extras, 'Json') else "{}"
                        }
                        for r in cleaned_records
                    ])
                    pg_conn.commit()
            except Exception as e:
                print(f"[CONNECTION_REPO] PG batch insert error: {e}")
            finally:
                pg_conn.close()

        return len(cleaned_records)

    def find_connections_by_company(
        self,
        company_name: str,
        connection_degree: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Finds matching connections for a company using normalized company comparisons.
        """
        if not company_name:
            return []

        norm_target = company_normalization_service.normalize(company_name).lower()
        all_conns = self.list_connections(limit=2000)

        matched = []
        for c in all_conns:
            c_comp = c.get("company") or ""
            c_norm = company_normalization_service.normalize(c_comp).lower()
            
            # Exact match or normalized substring match
            is_match = (
                norm_target == c_norm
                or norm_target in c_norm
                or c_norm in norm_target
                or company_name.lower() in c_comp.lower()
            )
            
            if is_match:
                if connection_degree and connection_degree != "ALL":
                    if c.get("connection_degree") != connection_degree:
                        continue
                matched.append(c)

        return matched

    def search_by_company(
        self,
        company_name: str,
        connection_degree: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Alias for find_connections_by_company."""
        return self.find_connections_by_company(company_name, connection_degree)

    def parse_linkedin_csv(self, csv_content_or_path: str) -> List[Dict[str, Any]]:
        """
        Parses LinkedIn Connections.csv, skipping leading notes rows.
        Expected headers: First Name,Last Name,URL,Email Address,Company,Position,Connected On
        """
        raw_lines = []
        if os.path.exists(csv_content_or_path):
            with open(csv_content_or_path, "r", encoding="utf-8", errors="replace") as f:
                raw_lines = f.readlines()
        else:
            raw_lines = csv_content_or_path.splitlines()

        # LinkedIn CSV files start with 3 note rows: find line starting with "First Name"
        header_idx = -1
        for idx, line in enumerate(raw_lines):
            if line.strip().startswith("First Name") or "First Name,Last Name" in line:
                header_idx = idx
                break

        if header_idx == -1:
            # Try reading directly with DictReader
            csv_text = "\n".join(raw_lines)
        else:
            csv_text = "\n".join(raw_lines[header_idx:])

        reader = csv.DictReader(io.StringIO(csv_text))
        parsed_records: List[Dict[str, Any]] = []

        for row in reader:
            first_name = (row.get("First Name") or "").strip()
            last_name = (row.get("Last Name") or "").strip()
            if not first_name and not last_name:
                continue

            full_name = f"{first_name} {last_name}".strip()
            company = (row.get("Company") or "").strip() or "Independent / Unlisted"
            position = (row.get("Position") or "").strip()
            url = (row.get("URL") or "").strip()
            email = (row.get("Email Address") or "").strip()
            connected_on = (row.get("Connected On") or "").strip()

            # Generate deterministic UUID based on profile URL or Name+Company
            id_key = url if url else f"{full_name}-{company}"
            rec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, id_key))

            # Auto-tag skills / roles
            tags = []
            pos_lower = position.lower()
            if any(k in pos_lower for k in ["recruit", "talent", "hr", "human resource", "people"]):
                tags.append("HR/Recruiter")
            if any(k in pos_lower for k in ["engineer", "developer", "architect", "lead", "sde"]):
                tags.append("Engineering")
            if any(k in pos_lower for k in ["director", "vp", "head", "manager", "chief"]):
                tags.append("Leadership")

            conn_record = {
                "id": rec_id,
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name,
                "company": company,
                "position": position,
                "location": "",
                "email": email or None,
                "linkedin_url": url or None,
                "connection_degree": "Recruiter" if "HR/Recruiter" in tags else "1st",
                "connected_on": connected_on,
                "source": "LINKEDIN_CSV",
                "tags": tags,
                "raw_metadata": {"original_row": row},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            parsed_records.append(conn_record)

        return parsed_records

    def ingest_default_csv(self) -> Dict[str, Any]:
        """Ingests default docs/Connections.csv if present."""
        default_path = os.path.join(self._repo_root, "docs", "Connections.csv")
        if not os.path.exists(default_path):
            raise FileNotFoundError(f"Authoritative Connections CSV not found at {default_path}")

        records = self.parse_linkedin_csv(default_path)
        ingested_count = self.bulk_upsert_connections(records)

        self._last_ingested_at = datetime.now(timezone.utc).isoformat()
        return {
            "status": "success",
            "file_path": default_path,
            "total_parsed": len(records),
            "ingested_count": ingested_count,
            "timestamp": self._last_ingested_at
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Calculates HUD metric stats for connections."""
        all_conns = self.list_connections(limit=5000)
        total = len(all_conns)
        first_degree = sum(1 for c in all_conns if c.get("connection_degree") == "1st")
        recruiters = sum(1 for c in all_conns if c.get("connection_degree") == "Recruiter" or "HR/Recruiter" in (c.get("tags") or []))
        unique_companies = len(set((c.get("company") or "").lower() for c in all_conns if c.get("company")))
        with_email = sum(1 for c in all_conns if c.get("email"))

        return {
            "total_connections": total,
            "first_degree_count": first_degree,
            "recruiters_count": recruiters,
            "unique_companies_count": unique_companies,
            "with_email_count": with_email,
            "last_ingested_at": self._last_ingested_at
        }

connection_repository = ConnectionRepository()
