import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from pydantic import BaseModel
from backend.python.repositories.connection_repository import connection_repository
from backend.python.services.apify_recruiter_service import apify_recruiter_service

router = APIRouter(prefix="/api/v2/connections", tags=["connections_v2"])

class CreateConnectionRequest(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    company: str
    position: Optional[str] = ""
    location: Optional[str] = ""
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    connection_degree: Optional[str] = "1st"
    source: Optional[str] = "MANUAL_ENTRY"
    tags: Optional[List[str]] = []

class UpdateConnectionRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    connection_degree: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None

class ApifyDiscoveryRequest(BaseModel):
    company: str
    location: Optional[str] = None
    job_url: Optional[str] = None

@router.get("/metrics")
def get_connections_metrics():
    """Returns HUD statistics for connections and network directory."""
    return {"status": "success", "metrics": connection_repository.get_metrics()}

@router.get("")
def list_connections(
    q: Optional[str] = Query(None, description="Search query by name, company, position, or email"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    degree: Optional[str] = Query(None, description="Filter by degree (e.g. '1st', 'Recruiter')"),
    source: Optional[str] = Query(None, description="Filter by source (e.g. 'LINKEDIN_CSV', 'APIFY_RECRUITER')"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Lists connections with optional multi-attribute filters."""
    conns = connection_repository.list_connections(
        query=q,
        company=company,
        connection_degree=degree,
        source=source,
        limit=limit,
        offset=offset
    )
    total_metrics = connection_repository.get_metrics()
    return {
        "status": "success",
        "count": len(conns),
        "total": total_metrics.get("total_connections", 0),
        "connections": conns
    }

@router.get("/{conn_id}")
def get_connection(conn_id: str):
    conn = connection_repository.get_connection_by_id(conn_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connection {conn_id} not found")
    return {"status": "success", "connection": conn}

@router.post("")
def create_connection(req: CreateConnectionRequest):
    created = connection_repository.create_connection(req.dict())
    return {"status": "success", "connection": created}

@router.put("/{conn_id}")
def update_connection(conn_id: str, req: UpdateConnectionRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    updated = connection_repository.update_connection(conn_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Connection {conn_id} not found")
    return {"status": "success", "connection": updated}

@router.delete("/{conn_id}")
def delete_connection(conn_id: str):
    success = connection_repository.delete_connection(conn_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Connection {conn_id} not found")
    return {"status": "success", "message": f"Connection {conn_id} deleted successfully"}

@router.post("/bulk-delete")
def bulk_delete_connections(payload: Dict[str, List[str]] = Body(...)):
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided for deletion")
    deleted_count = connection_repository.bulk_delete_connections(ids)
    return {"status": "success", "deleted_count": deleted_count}

@router.post("/sync-default-csv")
def sync_default_csv():
    """Ingests the authoritative docs/Connections.csv into the database."""
    try:
        res = connection_repository.ingest_default_csv()
        return res
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting Connections.csv: {e}")

@router.post("/import-csv")
async def import_csv_file(file: UploadFile = File(...)):
    """Uploads and ingests a LinkedIn CSV export."""
    try:
        content = await file.read()
        text = content.decode("utf-8", errors="replace")
        records = connection_repository.parse_linkedin_csv(text)
        ingested = 0
        for r in records:
            connection_repository.create_connection(r)
            ingested += 1
        return {
            "status": "success",
            "filename": file.filename,
            "parsed_records": len(records),
            "ingested_count": ingested
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse and import CSV: {e}")

@router.post("/discover-apify-recruiter")
async def discover_apify_recruiter(req: ApifyDiscoveryRequest):
    """Executes live Apify LinkedIn recruiter / HR search for a given company and location."""
    try:
        res = await apify_recruiter_service.get_precise_hr_details(
            company_name=req.company,
            location=req.location,
            job_url=req.job_url
        )
        return {"status": "success", "result": res}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apify discovery failed: {e}")
