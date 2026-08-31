import os
import ssl
import smtplib
import imaplib
import email
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import hashlib
import asyncio
from dotenv import load_dotenv

load_dotenv()

class GmailMCPClient:
    """
    Production-grade Gmail MCP & Direct SMTP/IMAP Client.
    Supports reading real incoming recruiter messages via IMAP
    and dispatching outbound MIME emails with attached candidate resume PDFs.
    """

    def __init__(self):
        self.repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    @property
    def email_address(self) -> str:
        load_dotenv()
        return (os.getenv("EMAIL_ADDRESS") or "v.sathyanantham@gmail.com").strip()

    @property
    def app_password(self) -> str:
        load_dotenv()
        return (os.getenv("EMAIL_APP_PASSWORD") or "qhvllsexeewpgpww").strip()

    @property
    def smtp_server(self) -> str:
        load_dotenv()
        return (os.getenv("EMAIL_SMTP_SERVER") or "smtp.gmail.com").strip()

    @property
    def imap_server(self) -> str:
        load_dotenv()
        return (os.getenv("EMAIL_IMAP_SERVER") or "imap.gmail.com").strip()

    @property
    def smtp_port(self) -> int:
        return int(os.getenv("EMAIL_SMTP_PORT", 465))

    @property
    def use_email(self) -> bool:
        return (os.getenv("USE_EMAIL", "true")).lower() == "true"

    def is_configured(self) -> bool:
        return bool(self.email_address and self.app_password) and self.use_email

    def _decode_mime_words(self, s: str) -> str:
        if not s:
            return ""
        try:
            decoded_fragments = decode_header(s)
            out = []
            for text, encoding in decoded_fragments:
                if isinstance(text, bytes):
                    out.append(text.decode(encoding or "utf-8", errors="replace"))
                else:
                    out.append(str(text))
            return "".join(out)
        except Exception:
            return str(s)

    async def fetch_recent_messages(
        self,
        folder: str = "INBOX",
        max_results: int = 20,
        since_days: Optional[int] = 2
    ) -> List[Dict[str, Any]]:
        """
        Polls Gmail via IMAP over SSL to fetch real incoming messages.
        Supports filtering by last N days (e.g. last 1 or 2 days).
        """
        if not self.is_configured():
            print(f"[GMAIL_MCP] Gmail credentials not configured (email={self.email_address}); skipping IMAP fetch.")
            return []

        messages_list = []
        try:
            print(f"[GMAIL_MCP] Connecting to IMAP {self.imap_server}:993 as {self.email_address} (since_days={since_days})...")
            mail = imaplib.IMAP4_SSL(self.imap_server, 993)
            mail.login(self.email_address, self.app_password)
            mail.select(folder)

            search_criteria = "ALL"
            if since_days and since_days > 0:
                since_date = (datetime.now(timezone.utc) - timedelta(days=since_days)).strftime("%d-%b-%Y")
                search_criteria = f'(SINCE "{since_date}")'

            status, data = mail.search(None, search_criteria)
            if status != "OK" or not data[0]:
                # Fallback to ALL if no messages in date range
                status, data = mail.search(None, "ALL")

            if status != "OK" or not data[0]:
                mail.logout()
                return []

            mail_ids = data[0].split()
            recent_ids = mail_ids[-max_results:]
            recent_ids.reverse()

            for m_id in recent_ids:
                try:
                    status, msg_data = mail.fetch(m_id, "(RFC822)")
                    if status != "OK" or not msg_data or not msg_data[0]:
                        continue

                    raw_email = msg_data[0][1]
                    if not isinstance(raw_email, bytes):
                        continue

                    msg = email.message_from_bytes(raw_email)

                    subject = self._decode_mime_words(msg.get("Subject", "No Subject"))
                    sender_header = self._decode_mime_words(msg.get("From", "Unknown"))
                    date_str = msg.get("Date", "")
                    raw_msg_id = msg.get("Message-ID")
                    gmail_msg_id = raw_msg_id.strip("<>") if raw_msg_id else f"msg-{m_id.decode()}"
                    thread_id = msg.get("References") or msg.get("In-Reply-To") or gmail_msg_id

                    # Extract sender name and email address
                    sender_name = sender_header
                    sender_email = sender_header
                    if "<" in sender_header and ">" in sender_header:
                        parts = sender_header.split("<")
                        sender_name = parts[0].strip().replace('"', '')
                        sender_email = parts[1].split(">")[0].strip()

                    # Extract plain text & HTML bodies
                    body_text = ""
                    body_html = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            if "attachment" not in content_disposition:
                                payload = part.get_payload(decode=True)
                                if payload:
                                    charset = part.get_content_charset() or "utf-8"
                                    decoded = payload.decode(charset, errors="replace")
                                    if content_type == "text/plain" and not body_text:
                                        body_text = decoded
                                    elif content_type == "text/html" and not body_html:
                                        body_html = decoded
                    else:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            charset = msg.get_content_charset() or "utf-8"
                            body_text = payload.decode(charset, errors="replace")

                    messages_list.append({
                        "gmail_message_id": str(gmail_msg_id),
                        "thread_id": str(thread_id),
                        "sender": sender_email,
                        "sender_name": sender_name,
                        "subject": subject,
                        "body": body_text.strip() or subject,
                        "body_text": body_text.strip() or subject,
                        "body_html": body_html.strip(),
                        "received_at": date_str or datetime.now(timezone.utc).isoformat()
                    })
                except Exception as parse_err:
                    print(f"[GMAIL_MCP] Warning parsing message {m_id}: {parse_err}")

            mail.logout()
            print(f"[GMAIL_MCP] Successfully fetched {len(messages_list)} messages from Gmail IMAP.")
        except Exception as e:
            print(f"[GMAIL_MCP] IMAP Fetch error: {e}")

        return messages_list

    def _send_smtp_sync(self, msg: MIMEMultipart, to: str, attached_files: List[str]) -> None:
        """
        Synchronous SMTP delivery using primary credentials with port fallback (465 SSL -> 587 STARTTLS).
        Executed in threadpool via asyncio.to_thread.
        """
        if not self.is_configured():
            print(f"[GMAIL_MCP] Live email dispatch simulation: Recipient: {to}, Subject: {msg['Subject']}, Attached: {attached_files}")
            return

        user = self.email_address
        pwd = self.app_password

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context, timeout=15) as server:
                server.login(user, pwd)
                server.send_message(msg)
            print(f"[GMAIL_MCP] Successfully transmitted live email to {to} via {user} on {self.smtp_server}:{self.smtp_port}")
            return
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, ssl.SSLError) as conn_err:
            print(f"[GMAIL_MCP] Port {self.smtp_port} failed ({conn_err}), attempting STARTTLS on port 587...")
            try:
                with smtplib.SMTP(self.smtp_server, 587, timeout=15) as server:
                    server.starttls(context=context)
                    server.login(user, pwd)
                    server.send_message(msg)
                print(f"[GMAIL_MCP] Successfully transmitted live email via STARTTLS port 587 using {user}!")
                return
            except Exception as err2:
                print(f"[GMAIL_MCP] SMTP STARTTLS failed for {user}: {err2}")
                raise RuntimeError(f"SMTP transmission failed on port 587 for {to}: {err2}") from err2
        except smtplib.SMTPAuthenticationError as auth_err:
            print(f"[GMAIL_MCP] Auth failed for {user}: {auth_err}")
            raise RuntimeError(f"SMTP authentication failed for {user}: {auth_err}") from auth_err
        except Exception as e:
            print(f"[GMAIL_MCP] Error transmitting via {user}: {e}")
            raise RuntimeError(f"SMTP transmission failed for {to}: {e}") from e

    async def send_message(
        self,
        to: str,
        subject: str,
        body: str,
        thread_id: Optional[str] = None,
        in_reply_to: Optional[str] = None,
        attachment_path: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Sends genuine MIME email via SMTP with candidate resume PDF attached.
        """
        sent_id = f"gmsg-sent-{hashlib.md5((to + subject + str(datetime.now(timezone.utc).timestamp())).encode()).hexdigest()[:12]}"
        
        # Build MIME Message
        msg = MIMEMultipart()
        msg["From"] = f"Sathyanantham V <{self.email_address}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = f"<{sent_id}@{self.smtp_server}>"
        if in_reply_to:
            msg["In-Reply-To"] = f"<{in_reply_to}>" if not in_reply_to.startswith("<") else in_reply_to
            msg["References"] = msg["In-Reply-To"]

        # Attach Plaintext Body
        msg.attach(MIMEText(body, "plain", "utf-8"))

        # Resolve Attachments (Support multiple files: Tailored Resume PDF + Tailored Cover Letter)
        attached_files = []
        files_to_attach = []

        if attachment_path and os.path.exists(attachment_path):
            files_to_attach.append(attachment_path)

        if attachments:
            for att in attachments:
                if isinstance(att, str):
                    cand = att
                elif isinstance(att, dict):
                    cand = att.get("path") or att.get("file_path") or att.get("file_name") or att.get("file_id")
                else:
                    cand = None

                if cand:
                    if os.path.isabs(cand) and os.path.exists(cand):
                        if cand not in files_to_attach:
                            files_to_attach.append(cand)
                    else:
                        cand_p1 = os.path.join(self.repo_root, "public", "downloads", cand)
                        cand_p2 = os.path.join(self.repo_root, "public", "downloads", "cover_letters", cand)
                        cand_p3 = os.path.join(self.repo_root, "public", cand)
                        for cp in [cand_p1, cand_p2, cand_p3]:
                            if os.path.exists(cp) and cp not in files_to_attach:
                                files_to_attach.append(cp)
                                break

        for target_p in files_to_attach:
            try:
                base_name = os.path.basename(target_p)
                with open(target_p, "rb") as f:
                    part = MIMEApplication(f.read(), Name=base_name)
                part["Content-Disposition"] = f'attachment; filename="{base_name}"'
                msg.attach(part)
                attached_files.append(base_name)
                print(f"[GMAIL_MCP] Successfully attached file: {base_name}")
            except Exception as e:
                print(f"[GMAIL_MCP] Error attaching file {target_p}: {e}")

        # Real SMTP Transmission via threadpool to avoid blocking FastAPI event loop
        await asyncio.to_thread(self._send_smtp_sync, msg, to, attached_files)

        return {
            "status": "SENT",
            "message_id": sent_id,
            "thread_id": thread_id or f"th-{sent_id[:8]}",
            "to": to,
            "from": self.email_address,
            "subject": subject,
            "attachments": attached_files,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        thread_id: Optional[str] = None,
        in_reply_to: Optional[str] = None,
        attachment_path: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Alias for send_message."""
        return await self.send_message(
            to=to,
            subject=subject,
            body=body,
            thread_id=thread_id,
            in_reply_to=in_reply_to,
            attachment_path=attachment_path,
            attachments=attachments
        )

gmail_mcp_client = GmailMCPClient()
