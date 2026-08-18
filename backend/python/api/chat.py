import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse
from backend.python.models.pydantic_models import ChatRequest
from backend.python.services.rag_service import kb
from backend.python.services.ai_providers import GenericLLMProvider, llm_provider
from backend.python.services.websocket_service import ws_manager
from backend.python.services.notifications import notify_handoff_requested
from backend.python.repositories.supabase_repo import db_helper

router = APIRouter(tags=["chat"])

@router.get("/api/presence")
def get_presence():
    return {
        "is_online": ws_manager.is_sathyanantham_online,
        "status": "Sathyanantham V is Online" if ws_manager.is_sathyanantham_online else "AI Digital Twin Active"
    }

@router.get("/api/knowledge/search")
def search_knowledge(q: str = Query(..., description="Query query string")):
    results = kb.retrieve_context(q, top_k=5)
    return {"query": q, "results": results}

@router.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    provider = GenericLLMProvider(model=req.model) if req.model else llm_provider
    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]
    
    if req.messages:
        last_msg = req.messages[-1]
        if last_msg.role == "user":
            db_helper.insert_chat_message(req.session_id, "user", last_msg.content)

    async def event_generator():
        full_reply = ""
        async for chunk in provider.chat_completion(messages_payload, stream=True):
            full_reply += chunk
            data_str = json.dumps({"content": chunk})
            yield f"data: {data_str}\n\n"
        
        if full_reply:
            db_helper.insert_chat_message(req.session_id, "assistant", full_reply)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
