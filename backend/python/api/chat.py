import json
import asyncio
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
    
    last_user_query = ""
    if req.messages:
        last_msg = req.messages[-1]
        if last_msg.role == "user":
            try:
                db_helper.insert_chat_message(req.session_id, "user", last_msg.content)
            except Exception:
                pass
            
    for m in reversed(req.messages):
        if m.role == "user":
            last_user_query = m.content
            break

    system_prompt = kb.build_system_prompt(last_user_query)
    messages_payload = [{"role": "system", "content": system_prompt}] + [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_generator():
        full_reply = ""
        has_yielded_model_chunk = False
        try:
            async for chunk in provider.chat_completion(messages_payload, stream=True):
                if chunk:
                    if not has_yielded_model_chunk:
                        has_yielded_model_chunk = True
                        meta_str = json.dumps({"source_type": "model", "model_name": provider.model})
                        yield f"data: {meta_str}\n\n"
                    full_reply += chunk
                    data_str = json.dumps({"content": chunk})
                    yield f"data: {data_str}\n\n"
        except Exception as err:
            print(f"[CHAT_STREAM] LLM streaming error: {err}. Triggering RAG fallback.")

        # Fallback to intelligent RAG answer if provider yielded no tokens
        if not full_reply.strip():
            meta_str = json.dumps({"source_type": "rag", "model_name": "Verified RAG Knowledge Store"})
            yield f"data: {meta_str}\n\n"
            fallback_text = kb.build_fallback_answer(last_user_query)
            for word in fallback_text.split(" "):
                token = word + " "
                full_reply += token
                data_str = json.dumps({"content": token})
                yield f"data: {data_str}\n\n"
                await asyncio.sleep(0.015)
        
        if full_reply:
            try:
                db_helper.insert_chat_message(req.session_id, "assistant", full_reply)
            except Exception:
                pass
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
