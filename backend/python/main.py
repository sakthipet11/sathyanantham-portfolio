import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.python.api import admin, chat, contact, jobs
from backend.python.services.websocket_service import ws_manager
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.notifications import notify_handoff_requested
from backend.python.services.ai_providers import OpenRouterAIProvider

app = FastAPI(
    title="Sathyanantham V Enterprise AI Twin & Multi-Agent API",
    description="FastAPI Backend for Multi-Agent Workflows, MCP Integration, RAG Ingestion, OpenRouter AI streaming, and live visitor handoff.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(contact.router)
app.include_router(jobs.router)

@app.get("/")
def read_root():
    return {
        "name": "Sathyanantham V Enterprise AI Twin & Multi-Agent API",
        "status": "online",
        "model_configured": os.getenv("OPENROUTER_API_MODEL", "anthropic/claude-3.5-sonnet"),
        "sathyanantham_online": ws_manager.is_sathyanantham_online,
        "database_connected": db_helper.is_configured(),
        "active_agents": [
            "job_discovery_agent",
            "job_scoring_agent",
            "resume_agent",
            "application_agent",
            "email_agent",
            "referral_agent"
        ],
        "mcp_servers": [
            "browserbase",
            "google_drive",
            "gmail",
            "postgres"
        ]
    }

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str = "visitor", role: str = "visitor"):
    if role == "host":
        await ws_manager.connect_sathyanantham(websocket)
        try:
            while True:
                data = await websocket.receive_json()
                target_session = data.get("target_session_id")
                content = data.get("content", "")
                
                if target_session and content:
                    db_helper.insert_chat_message(target_session, "assistant", f"[Live] {content}")
                    await ws_manager.send_to_visitor(target_session, {
                        "type": "human_response",
                        "sender": "Sathyanantham V (Live)",
                        "content": content
                    })
        except WebSocketDisconnect:
            ws_manager.disconnect_sathyanantham(websocket)
    else:
        visitor_info = {}
        await ws_manager.connect_visitor(session_id, websocket, visitor_info)
        db_helper.insert_chat_message(session_id, "system", "Visitor initiated chat session.")
        
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "chat")
                
                if msg_type == "request_handoff":
                    reason = data.get("notes", "Visitor requested live handoff")
                    await notify_handoff_requested(session_id, reason)
                    await ws_manager.broadcast_to_sathyanantham({
                        "type": "handoff_alert",
                        "session_id": session_id,
                        "notes": reason
                    })
                    await websocket.send_json({
                        "type": "system",
                        "content": "Paging Sathyanantham... If he is currently active, he will take over this chat shortly."
                    })

                elif msg_type == "user_message":
                    user_text = data.get("content", "")
                    if not user_text:
                        continue
                    
                    db_helper.insert_chat_message(session_id, "user", user_text)

                    if ws_manager.is_sathyanantham_online:
                        await ws_manager.broadcast_to_sathyanantham({
                            "type": "visitor_message",
                            "session_id": session_id,
                            "content": user_text
                        })
                    else:
                        provider = OpenRouterAIProvider()
                        history = data.get("history", [{"role": "user", "content": user_text}])
                        
                        full_reply = ""
                        async for chunk in provider.chat_completion(history, stream=True):
                            full_reply += chunk
                            await websocket.send_json({
                                "type": "ai_stream_chunk",
                                "chunk": chunk
                            })
                        
                        db_helper.insert_chat_message(session_id, "assistant", full_reply)

                        await websocket.send_json({
                            "type": "ai_stream_end",
                            "full_reply": full_reply
                        })

        except WebSocketDisconnect:
            ws_manager.disconnect_visitor(session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
