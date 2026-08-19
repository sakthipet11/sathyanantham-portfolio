import os
import httpx
from typing import Dict, Any, Optional

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "v.sathyanantham@gmail.com")

async def notify_admin_contact(name: str, email: str, message: str, company: str = "", budget: str = "", purpose: str = ""):
    print(f"📧 [NOTIFICATION] New Contact Form Submission from {name} ({email}) - {company}")
    if RESEND_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                    json={
                        "from": "Sathya AI Twin <twin@sathya-ai.studio>",
                        "to": [NOTIFICATION_EMAIL],
                        "subject": f"🔥 New Inquiry: {name} ({company or 'Direct Visitor'})",
                        "html": f"""
                        <h2>New Portfolio Contact Form Submission</h2>
                        <p><strong>Name:</strong> {name}</p>
                        <p><strong>Email:</strong> {email}</p>
                        <p><strong>Company:</strong> {company or 'N/A'}</p>
                        <p><strong>Budget:</strong> {budget or 'N/A'}</p>
                        <p><strong>Purpose:</strong> {purpose or 'N/A'}</p>
                        <p><strong>Message:</strong></p>
                        <blockquote style="background:#f4f4f4; padding:12px;">{message}</blockquote>
                        """
                    }
                )
        except Exception as e:
            print(f"Failed sending Resend email notification: {e}")

async def notify_resume_download(session_id: str, geo: str = "Unknown"):
    print(f"📄 [NOTIFICATION] Resume Downloaded by Visitor session {session_id} from {geo}")

async def notify_handoff_requested(session_id: str, reason: str = "Visitor requested live handoff"):
    print(f"🚨 [ALERT] Visitor {session_id} requested Live Handoff: {reason}")
