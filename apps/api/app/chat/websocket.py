from typing import Dict, Set
from fastapi import WebSocket
from app.database.supabase_client import db_helper

class ConnectionManager:
    def __init__(self):
        # Maps session_id -> WebSocket
        self.active_visitor_connections: Dict[str, WebSocket] = {}
        # Active connections of Sathya (the admin)
        self.sathyanantham_connections: Set[WebSocket] = set()
        self.is_sathyanantham_online: bool = False

    async def connect_visitor(self, session_id: str, websocket: WebSocket, visitor_info: dict = None):
        await websocket.accept()
        self.active_visitor_connections[session_id] = websocket
        
        # Save/upsert chat session in database
        db_helper.upsert_chat_session(session_id, status="ai_twin", visitor_info=visitor_info)

        # Push initial presence state so the visitor knows if Sathya is online/offline
        try:
            await websocket.send_json({
                "type": "presence_update",
                "is_online": self.is_sathyanantham_online,
                "status": "Sathyanantham V is Online" if self.is_sathyanantham_online else "AI Digital Twin Active"
            })
        except Exception:
            pass

    def disconnect_visitor(self, session_id: str):
        if session_id in self.active_visitor_connections:
            del self.active_visitor_connections[session_id]

    async def connect_sathyanantham(self, websocket: WebSocket):
        await websocket.accept()
        self.sathyanantham_connections.add(websocket)
        self.is_sathyanantham_online = True
        
        # Notify all active visitor connections that Sathya is online and available
        for session_id, conn in self.active_visitor_connections.items():
            try:
                await conn.send_json({
                    "type": "presence_update",
                    "is_online": True,
                    "status": "Sathyanantham V is Online"
                })
            except Exception:
                pass

    def disconnect_sathyanantham(self, websocket: WebSocket):
        if websocket in self.sathyanantham_connections:
            self.sathyanantham_connections.remove(websocket)
        # Note: We do NOT automatically set is_sathyanantham_online = False here.
        # This keeps the host online even if the WebSocket temporarily disconnects or tab goes to sleep,
        # ensuring the status is strictly driven by the "GO ONLINE" toggle button.

    async def send_to_visitor(self, session_id: str, message: dict):
        if session_id in self.active_visitor_connections:
            await self.active_visitor_connections[session_id].send_json(message)

    async def broadcast_presence_to_visitors(self, is_online: bool):
        for session_id, conn in list(self.active_visitor_connections.items()):
            try:
                await conn.send_json({
                    "type": "presence_update",
                    "is_online": is_online,
                    "status": "Sathyanantham V is Online" if is_online else "AI Digital Twin Active"
                })
            except Exception:
                pass

    async def broadcast_to_sathyanantham(self, message: dict):
        for conn in self.sathyanantham_connections:
            try:
                await conn.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()
