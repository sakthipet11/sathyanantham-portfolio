from typing import Dict, List, Any
from fastapi import WebSocket
from backend.python.repositories.supabase_repo import db_helper

class WebSocketConnectionManager:
    def __init__(self):
        self.active_visitors: Dict[str, WebSocket] = {}
        self.sathyanantham_hosts: List[WebSocket] = []
        self.is_sathyanantham_online: bool = False

    async def connect_visitor(self, session_id: str, websocket: WebSocket, visitor_info: Dict[str, Any] = None):
        await websocket.accept()
        self.active_visitors[session_id] = websocket
        db_helper.upsert_chat_session(session_id, visitor_info=visitor_info)
        await self.broadcast_sessions_update()

    def disconnect_visitor(self, session_id: str):
        if session_id in self.active_visitors:
            del self.active_visitors[session_id]

    async def connect_sathyanantham(self, websocket: WebSocket):
        await websocket.accept()
        self.sathyanantham_hosts.append(websocket)
        self.is_sathyanantham_online = True
        await self.broadcast_presence_to_visitors(True)
        await self.broadcast_sessions_update()

    def disconnect_sathyanantham(self, websocket: WebSocket):
        if websocket in self.sathyanantham_hosts:
            self.sathyanantham_hosts.remove(websocket)
        if len(self.sathyanantham_hosts) == 0:
            self.is_sathyanantham_online = False

    async def broadcast_to_sathyanantham(self, message: Dict[str, Any]):
        for host_ws in list(self.sathyanantham_hosts):
            try:
                await host_ws.send_json(message)
            except Exception:
                pass

    async def broadcast_sessions_update(self):
        sessions = db_helper.get_chat_sessions()
        payload = {
            "type": "sessions_update",
            "sessions": sessions,
            "active_visitor_ids": list(self.active_visitors.keys())
        }
        await self.broadcast_to_sathyanantham(payload)

    async def send_to_visitor(self, session_id: str, message: Dict[str, Any]):
        if session_id in self.active_visitors:
            try:
                await self.active_visitors[session_id].send_json(message)
            except Exception:
                pass

    async def broadcast_presence_to_visitors(self, online: bool):
        payload = {
            "type": "presence_update",
            "is_online": online,
            "status": "Sathyanantham V is Online" if online else "AI Digital Twin Active"
        }
        for session_id, visitor_ws in list(self.active_visitors.items()):
            try:
                await visitor_ws.send_json(payload)
            except Exception:
                pass

ws_manager = WebSocketConnectionManager()
