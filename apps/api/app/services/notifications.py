import os
import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Load credentials from environment
EMAIL_SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "")
USE_EMAIL = os.getenv("USE_EMAIL", "false").lower() in ("true", "1", "yes")

PUSHOVER_USER = os.getenv("PUSHOVER_USER", "")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN", "")

async def send_pushover_notification(message: str, title: str = "Portfolio Alert"):
    """
    Sends a push notification via the Pushover API.
    """
    if not PUSHOVER_USER or not PUSHOVER_TOKEN:
        print("Pushover credentials missing. Skipping push notification.")
        return False
    
    url = "https://api.pushover.net/1/messages.json"
    data = {
        "token": PUSHOVER_TOKEN,
        "user": PUSHOVER_USER,
        "message": message,
        "title": title
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data)
            if res.status_code == 200:
                return True
            else:
                print(f"Pushover notification failed with status code {res.status_code}: {res.text}")
                return False
    except Exception as e:
        print(f"Error sending Pushover notification: {e}")
        return False

def send_email_notification(subject: str, html_body: str):
    """
    Sends an email notification via SMTP (Gmail).
    """
    if not USE_EMAIL:
        print("Email notifications disabled (USE_EMAIL is false).")
        return False
        
    if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD:
        print("Email credentials missing. Skipping email notification.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = EMAIL_ADDRESS  # Send it to ourselves
        msg['Subject'] = subject

        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(EMAIL_SMTP_SERVER, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email notification: {e}")
        return False

async def notify_admin_contact(name: str, email: str, message: str, company: str = "", budget: str = "", purpose: str = ""):
    """
    Helper to trigger notifications when a contact request is submitted.
    """
    title = "Portfolio: New Contact Request!"
    text_summary = f"New contact from {name} ({email}). Message: {message[:100]}..."
    
    # Send Pushover
    await send_pushover_notification(text_summary, title=title)
    
    # Send Email
    html = f"""
    <h2>New Contact Inquiry</h2>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Company:</strong> {company or 'N/A'}</p>
    <p><strong>Purpose:</strong> {purpose or 'N/A'}</p>
    <p><strong>Budget:</strong> {budget or 'N/A'}</p>
    <p><strong>Message:</strong></p>
    <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0;">
        {message}
    </blockquote>
    """
    send_email_notification(title, html)

async def notify_resume_download(session_id: str, geo_info: str = "Unknown location"):
    """
    Helper to log when a resume is downloaded.
    """
    print(f"Resume downloaded by session {session_id} from {geo_info} (Notification skipped).")

async def notify_handoff_requested(session_id: str, reason: str = "No reason provided"):
    """
    Helper to trigger notifications when live chat takeover is requested.
    """
    title = "Portfolio: Live Takeover Requested!"
    msg = f"Visitor session {session_id} has requested to chat live! Reason: {reason}."
    await send_pushover_notification(msg, title=title)
    
    html = f"""
    <h2>Live Chat Takeover Requested</h2>
    <p>Visitor session <strong>{session_id}</strong> is waiting on the chat screen.</p>
    <p><strong>Reason:</strong> {reason}</p>
    <p><a href="http://localhost:3000/admin/chat">Click here to go to the Live Takeover Console</a></p>
    """
    send_email_notification(title, html)
