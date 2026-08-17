from typing import Dict, Any

class GmailMCPServer:
    def __init__(self):
        self.name = "mcp_gmail"

    def send_email(self, to_email: str, subject: str, body_html: str) -> Dict[str, Any]:
        return {
            "status": "sent",
            "server": self.name,
            "to": to_email,
            "message_id": "GMAIL_MSG_99318"
        }

gmail_mcp = GmailMCPServer()
