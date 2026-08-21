import os
from typing import Dict, Any, List, Optional
from backend.python.repositories.supabase_repo import db_helper

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    psycopg2 = None


class PostgresMCPServer:
    def __init__(self):
        self.name = "mcp_postgres"
        self.db = db_helper

    def execute_query(self, sql_query: str, params: Optional[tuple] = None) -> Dict[str, Any]:
        pg_conn = self.db._get_pg_connection()
        if not pg_conn:
            return {
                "status": "error",
                "server": self.name,
                "error": "PostgreSQL database connection unavailable"
            }
        try:
            with pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if psycopg2 else None) as cur:
                cur.execute(sql_query, params or ())
                rows = []
                if cur.description:
                    rows = [dict(r) for r in cur.fetchall()]
                pg_conn.commit()
                return {
                    "status": "success",
                    "server": self.name,
                    "query": sql_query,
                    "rows_affected": cur.rowcount,
                    "data": rows
                }
        except Exception as e:
            pg_conn.rollback()
            return {
                "status": "error",
                "server": self.name,
                "query": sql_query,
                "error": str(e)
            }
        finally:
            pg_conn.close()


postgres_mcp = PostgresMCPServer()
