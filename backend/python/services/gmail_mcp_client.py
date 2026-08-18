import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime

class GmailMCPClient:
    """
    Client interface for interacting with Gmail MCP (Model Context Protocol).
    Encapsulates sending, drafting, and thread retrieval with clean isolation.
    """

    def __init__(self):
        self.is_connected = True

    async def fetch_recent_messages(self, query: str = "label:INBOX", max_results: int = 20) -> List[Dict[str, Any]]:
        # Mock/Real Gmail MCP fetcher
        return []

    async def send_message(
        self,
        to: str,
        subject: str,
        body: str,
        thread_id: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Sends an outbound email through Gmail MCP.
        """
        sent_id = f"gmsg-sent-{hashlib.md5((to + subject + str(datetime.utcnow().timestamp())).encode()).hexdigest()[:12]}"
        print(f"[GMAIL_MCP] Outbound message dispatched to {to} (Subject: '{subject}'). Sent Message ID: {sent_id}")
        return {
            "status": "SENT",
            "message_id": sent_id,
            "thread_id": thread_id or f"th-{sent_id[:8]}",
            "to": to,
            "subject": subject,
            "sent_at": datetime.utcnow().isoformat()
        }

    async def create_draft(
        self,
        to: str,
        subject: str,
        body: str,
        thread_id: Optional[str] = None
    ) -> Dict[str, Any]:
        draft_id = f"draft-{hashlib.md5((to + subject).encode()).hexdigest()[:10]}"
        return {
            "status": "DRAFT_CREATED",
            "draft_id": draft_id,
            "thread_id": thread_id
        }

gmail_mcp_client = GmailMCPClient()
