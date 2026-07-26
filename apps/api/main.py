import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.rag.ingestion import kb
from app.ai.providers import OpenRouterAIProvider
from app.ai.tools import recorded_leads, recorded_unknown_questions, handoff_requests, execute_tool_call
from app.chat.websocket import ws_manager

app = FastAPI(
    title="Sathyanantham V AI Digital Twin API",
    description="FastAPI Backend for RAG Ingestion, OpenRouter AI streaming, function tools, and live visitor handoff.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    session_id: Optional[str] = "session-default"

class ContactFormRequest(BaseModel):
    name: str
    email: str
    notes: Optional[str] = ""

@app.get("/")
def read_root():
    return {
        "name": "Sathyanantham V AI Digital Twin API",
        "status": "online",
        "model_configured": os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet"),
        "sathyanantham_online": ws_manager.is_sathyanantham_online
    }

@app.get("/api/presence")
def get_presence():
    return {
        "is_online": ws_manager.is_sathyanantham_online,
        "status": "Sathyanantham V is Online" if ws_manager.is_sathyanantham_online else "AI Digital Twin Active"
    }

@app.post("/api/contact")
def submit_contact(req: ContactFormRequest):
    res = execute_tool_call("record_user_details", {"email": req.email, "name": req.name, "notes": req.notes})
    return res

@app.get("/api/knowledge/search")
def search_knowledge(q: str):
    results = kb.retrieve_context(q, top_k=5)
    return {"query": q, "results": results}

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    provider = OpenRouterAIProvider(model=req.model)
    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_generator():
        async for chunk in provider.chat_completion(messages_payload, stream=True):
            data_str = json.dumps({"content": chunk})
            yield f"data: {data_str}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str = "visitor", role: str = "visitor"):
    if role == "host":
        await ws_manager.connect_sathyanantham(websocket)
        try:
            while True:
                data = await websocket.receive_json()
                # Broadcast host response to target visitor
                target_session = data.get("target_session_id")
                if target_session:
                    await ws_manager.send_to_visitor(target_session, {
                        "type": "human_response",
                        "sender": "Sathyanantham V (Live)",
                        "content": data.get("content", "")
                    })
        except WebSocketDisconnect:
            ws_manager.disconnect_sathyanantham(websocket)
    else:
        await ws_manager.connect_visitor(session_id, websocket)
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "chat")
                
                if msg_type == "request_handoff":
                    await ws_manager.broadcast_to_sathyanantham({
                        "type": "handoff_alert",
                        "session_id": session_id,
                        "notes": data.get("notes", "Visitor requested live handoff")
                    })
                    await websocket.send_json({
                        "type": "system",
                        "content": "Live handoff alert dispatched! If Sathyanantham is at his desk, he will join this session."
                    })

                elif msg_type == "user_message":
                    user_text = data.get("content", "")
                    # Forward to host if online
                    if ws_manager.is_sathyanantham_online:
                        await ws_manager.broadcast_to_sathyanantham({
                            "type": "visitor_message",
                            "session_id": session_id,
                            "content": user_text
                        })

                    # Stream AI Digital Twin Response
                    provider = OpenRouterAIProvider()
                    history = data.get("history", [{"role": "user", "content": user_text}])
                    
                    full_reply = ""
                    async for chunk in provider.chat_completion(history, stream=True):
                        full_reply += chunk
                        await websocket.send_json({
                            "type": "ai_stream_chunk",
                            "chunk": chunk
                        })

                    await websocket.send_json({
                        "type": "ai_stream_end",
                        "full_reply": full_reply
                    })

        except WebSocketDisconnect:
            ws_manager.disconnect_visitor(session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
