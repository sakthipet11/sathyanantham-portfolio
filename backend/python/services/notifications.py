import os
import sys
import ssl
import smtplib
import asyncio
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import httpx

# Ensure Windows console encoding doesn't crash on utf-8 characters
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


load_dotenv()

# Notification Destination
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "v.sathyanantham@gmail.com").strip()

# Primary SMTP Connection Settings
EMAIL_SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER", "smtp.gmail.com").strip()
EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "465"))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "v.sathyanantham@gmail.com").strip()
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "qhvllsexeewpgpww").strip()

# Resilient Backup Relay Connection Settings
BACKUP_EMAIL_ADDRESS = os.getenv("BACKUP_EMAIL_ADDRESS", "v.sathyanantham@gmail.com").strip()
BACKUP_EMAIL_APP_PASSWORD = os.getenv("BACKUP_EMAIL_APP_PASSWORD", "qhvllsexeewpgpww").strip()

# Pushover & Other Integrations
PUSHOVER_USER = os.getenv("PUSHOVER_USER", "").strip()
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN", "").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()


def _send_smtp_sync(
    to: str,
    subject: str,
    html_content: str,
    text_content: str = "",
    reply_to: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synchronous SMTP dispatch with resilient authentication.
    Attempts primary account first, falling back to backup relay if needed.
    """
    # Try primary credentials first, then backup credentials
    credential_pairs = [
        (EMAIL_ADDRESS, EMAIL_APP_PASSWORD, "primary"),
        (BACKUP_EMAIL_ADDRESS, BACKUP_EMAIL_APP_PASSWORD, "backup_relay")
    ]

    last_error = None

    for user, pwd, cred_type in credential_pairs:
        if not user or not pwd:
            continue

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Sathyanantham Portfolio <{user}>"
            msg["To"] = to
            if reply_to:
                msg["Reply-To"] = reply_to

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            if html_content:
                msg.attach(MIMEText(html_content, "html", "utf-8"))

            # Port 465 (SSL)
            context = ssl.create_default_context()
            try:
                with smtplib.SMTP_SSL(EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT, context=context, timeout=12) as server:
                    server.login(user, pwd)
                    server.send_message(msg)
                print(f"[SMTP] Email delivered to {to} via {user} ({cred_type}) on port {EMAIL_SMTP_PORT}")
                return {"status": "success", "user": user, "to": to, "cred_type": cred_type}
            except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, ssl.SSLError) as conn_err:
                print(f"[SMTP] Port {EMAIL_SMTP_PORT} failed ({conn_err}), attempting STARTTLS on port 587...")
                with smtplib.SMTP(EMAIL_SMTP_SERVER, 587, timeout=12) as server:
                    server.starttls(context=context)
                    server.login(user, pwd)
                    server.send_message(msg)
                print(f"[SMTP] Email delivered to {to} via {user} ({cred_type}) on port 587")
                return {"status": "success", "user": user, "to": to, "cred_type": cred_type}

        except smtplib.SMTPAuthenticationError as auth_err:
            print(f"[SMTP] Auth failed for {user} ({cred_type}): {auth_err}. Trying backup credentials if available...")
            last_error = auth_err
        except Exception as ex:
            print(f"[SMTP] Failed sending email via {user} ({cred_type}): {ex}")
            last_error = ex

    return {"status": "error", "error": str(last_error)}


async def send_smtp_email(
    to: str,
    subject: str,
    html_content: str,
    text_content: str = "",
    reply_to: Optional[str] = None
) -> Dict[str, Any]:
    """Async wrapper around sync SMTP dispatch."""
    return await asyncio.to_thread(
        _send_smtp_sync,
        to=to,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        reply_to=reply_to
    )


async def send_pushover_alert(title: str, message: str) -> None:
    """Dispatches real-time mobile push notification via Pushover."""
    if not PUSHOVER_USER or not PUSHOVER_TOKEN:
        return
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                "https://api.pushover.net/1/messages.json",
                data={
                    "token": PUSHOVER_TOKEN,
                    "user": PUSHOVER_USER,
                    "title": title,
                    "message": message,
                    "priority": 1
                }
            )
            print(f"[PUSHOVER] Alert sent: {title}")
    except Exception as e:
        print(f"[PUSHOVER] Failed to send alert: {e}")


async def notify_admin_contact(
    name: str,
    email: str,
    message: str,
    company: str = "",
    budget: str = "",
    purpose: str = ""
) -> None:
    """
    Delivers direct message inquiry to Sathyanantham V (v.sathyanantham@gmail.com)
    and dispatches a confirmation acknowledgment to the sender.
    """
    print(f"[NOTIFICATION] Processing Direct Message from {name} ({email}) - {company or 'Direct Visitor'}")
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # 1. Send Rich Notification Email to v.sathyanantham@gmail.com
    admin_subject = f"[Direct Message] Inquiry from {name} ({company or 'Direct'})"
    admin_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 24px 32px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
        .header p {{ margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; }}
        .content {{ padding: 32px; }}
        .field {{ margin-bottom: 20px; }}
        .label {{ font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }}
        .value {{ font-size: 15px; color: #0f172a; font-weight: 500; }}
        .quote-box {{ background: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; }}
        .btn {{ display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; }}
        .footer {{ border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; background: #fafafa; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Direct Portfolio Message</h1>
          <p>Transmitted via Sathyanantham AI Studio // {now_utc}</p>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Sender Name</div>
            <div class="value">{name}</div>
          </div>
          <div class="field">
            <div class="label">Email Address</div>
            <div class="value"><a href="mailto:{email}" style="color: #2563eb;">{email}</a></div>
          </div>
          {f'<div class="field"><div class="label">Company / Organization</div><div class="value">{company}</div></div>' if company else ''}
          {f'<div class="field"><div class="label">Project Scope / Purpose</div><div class="value">{purpose}</div></div>' if purpose else ''}
          {f'<div class="field"><div class="label">Budget Range</div><div class="value">{budget}</div></div>' if budget else ''}
          <div class="field">
            <div class="label">Message Content</div>
            <div class="quote-box">{message}</div>
          </div>
          <a href="mailto:{email}?subject=Re: Portfolio Inquiry" class="btn">Reply Directly to {name}</a>
        </div>
        <div class="footer">
          Notification intended for Sathyanantham V &bull; Lead Software Engineer & AI Architect<br>
          Coimbatore, Tamil Nadu, India
        </div>
      </div>
    </body>
    </html>
    """

    admin_text = f"""
New Portfolio Direct Message
============================
Time: {now_utc}
Sender: {name} ({email})
Company: {company or 'N/A'}
Scope / Purpose: {purpose or 'N/A'}
Budget: {budget or 'N/A'}

Message:
{message}

Reply to: {email}
    """.strip()

    # Send to Sathyanantham
    await send_smtp_email(
        to=NOTIFICATION_EMAIL,
        subject=admin_subject,
        html_content=admin_html,
        text_content=admin_text,
        reply_to=email
    )

    # 2. Send Courteous Confirmation Acknowledgment to Sender
    sender_subject = f"Message Received — Sathyanantham V"
    sender_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 24px 32px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 18px; font-weight: 700; }}
        .content {{ padding: 28px 32px; font-size: 14px; line-height: 1.6; color: #334155; }}
        .quote-box {{ background: #f8fafc; border-left: 3px solid #64748b; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #475569; }}
        .footer {{ border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 12px; color: #94a3b8; background: #fafafa; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Transmission Received</h1>
        </div>
        <div class="content">
          <p>Hi {name},</p>
          <p>Thank you for reaching out through my portfolio. I have received your message and will review your inquiry shortly.</p>
          <div class="quote-box">
            <strong>Your inquiry:</strong><br>
            {message}
          </div>
          <p>Best regards,<br>
          <strong>Sathyanantham V</strong><br>
          <span style="font-size: 12px; color: #64748b;">Lead Software Engineer & Frontend Architect</span><br>
          <span style="font-size: 12px; color: #64748b;">v.sathyanantham@gmail.com | +91 8870956756</span></p>
        </div>
        <div class="footer">
          Sathyanantham AI Studio &bull; Coimbatore, Tamil Nadu, India
        </div>
      </div>
    </body>
    </html>
    """

    sender_text = f"""
Hi {name},

Thank you for reaching out through my portfolio. I have received your direct message and will review your inquiry shortly.

Summary of your message:
{message}

Best regards,
Sathyanantham V
Lead Software Engineer & Frontend Architect
v.sathyanantham@gmail.com | +91 8870956756
    """.strip()

    try:
        await send_smtp_email(
            to=email,
            subject=sender_subject,
            html_content=sender_html,
            text_content=sender_text,
            reply_to=NOTIFICATION_EMAIL
        )
    except Exception as e:
        print(f"[SMTP] Could not send confirmation receipt to visitor {email}: {e}")

    # 3. Trigger Pushover Alert
    pushover_text = f"{name} ({company or 'Direct'}): {message[:120]}... [Reply: {email}]"
    await send_pushover_alert(f"[Direct Msg] {name}", pushover_text)


async def notify_resume_download(session_id: str, geo: str = "Unknown") -> None:
    """Alerts when a visitor downloads Sathyanantham's resume."""
    print(f"[NOTIFICATION] Resume Downloaded by Visitor session {session_id} from {geo}")
    await send_pushover_alert("Resume Downloaded", f"Visitor session {session_id[:8]} from {geo} downloaded your resume.")


async def notify_handoff_requested(session_id: str, reason: str = "Visitor requested live handoff") -> None:
    """Alerts when a visitor clicks Live Handoff in the AI Twin drawer."""
    print(f"[ALERT] Visitor {session_id} requested Live Handoff: {reason}")
    subject = f"[Live Handoff] Requested by Visitor {session_id[:8]}"
    body_text = f"Visitor session: {session_id}\nReason / Notes: {reason}\nTimestamp: {datetime.now(timezone.utc).isoformat()}"
    html_content = f"""
    <div style="font-family: sans-serif; padding: 20px;">
      <h2 style="color: #dc2626;">Live Human Takeover Requested</h2>
      <p>A visitor on your portfolio has requested to speak with you directly.</p>
      <p><strong>Session ID:</strong> {session_id}</p>
      <p><strong>Notes / Reason:</strong> {reason}</p>
      <p><a href="/admin/dashboard" style="background:#dc2626; color:#fff; padding:10px 18px; text-decoration:none; border-radius:6px; font-weight:bold;">Open Live Chat Console</a></p>
    </div>
    """
    await send_smtp_email(
        to=NOTIFICATION_EMAIL,
        subject=subject,
        html_content=html_content,
        text_content=body_text
    )
    await send_pushover_alert("Live Handoff Requested", f"Visitor {session_id[:8]} wants live chat: {reason}")
