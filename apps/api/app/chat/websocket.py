from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_visitor_connections: Dict[str, WebSocket] = {}
        self.sathyanantham_connections: Set[WebSocket] = set()
        self.is_sathyanantham_online: bool = False

    async def connect_visitor(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_visitor_connections[session_id] = websocket

    def disconnect_visitor(self, session_id: str):
        if session_id in self.active_visitor_connections:
            del self.active_visitor_connections[session_id]

    async def connect_sathyanantham(self, websocket: WebSocket):
        await websocket.accept()
        self.sathyanantham_connections.add(websocket)
        self.is_sathyanantham_online = True
        # Notify all visitors that Sathyanantham is online
        for conn in self.active_visitor_connections.values():
            try:
                await conn.send_json({"type": "presence_update", "is_online": True, "status": "Sathyanantham V is Online"})
            except Exception:
                pass

    def disconnect_sathyanantham(self, websocket: WebSocket):
        if websocket in self.sathyanantham_connections:
            self.sathyanantham_connections.remove(websocket)
        if len(self.sathyanantham_connections) == 0:
            self.is_sathyanantham_online = False

    async def send_to_visitor(self, session_id: str, message: dict):
        if session_id in self.active_visitor_connections:
            await self.active_visitor_connections[session_id].send_json(message)

    async def broadcast_to_sathyanantham(self, message: dict):
        for conn in self.sathyanantham_connections:
            try:
                await conn.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()
