import base64
import re
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from app.config import settings


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "").strip()


class GmailService:
    def __init__(self, access_token: str, refresh_token: str):
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        self.service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        self._creds = creds

    def _get_message_text(self, msg: dict) -> str:
        payload = msg.get("payload", {})
        parts = payload.get("parts", [])
        if parts:
            for part in parts:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            for part in parts:
                if part.get("mimeType") == "text/html":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        return _strip_html(base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore"))
        else:
            body = payload.get("body", {}).get("data", "")
            if body:
                text = base64.urlsafe_b64decode(body).decode("utf-8", errors="ignore")
                return _strip_html(text) if "<" in text else text
        return ""

    def _parse_message(self, msg: dict) -> dict:
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(no subject)")
        sender = headers.get("From", "unknown")
        date_str = headers.get("Date", "")
        try:
            from email.utils import parsedate_to_datetime
            received_at = parsedate_to_datetime(date_str).replace(tzinfo=None)
        except Exception:
            received_at = datetime.utcnow()
        return {
            "gmail_id": msg["id"],
            "subject": subject,
            "sender": sender,
            "body_text": self._get_message_text(msg)[:5000],
            "received_at": received_at,
        }

    def fetch_recent_emails(self, max_results: int = 20) -> list[dict]:
        after = int((datetime.now(timezone.utc) - timedelta(hours=48)).timestamp())
        results = self.service.users().messages().list(
            userId="me", q=f"after:{after}", maxResults=max_results
        ).execute()
        messages = results.get("messages", [])
        emails = []
        for m in messages:
            full = self.service.users().messages().get(userId="me", id=m["id"], format="full").execute()
            emails.append(self._parse_message(full))
        return emails

    def fetch_important_emails(self, max_results: int = 10) -> list[dict]:
        results = self.service.users().messages().list(
            userId="me", labelIds=["IMPORTANT"], maxResults=max_results
        ).execute()
        messages = results.get("messages", [])
        emails = []
        for m in messages:
            full = self.service.users().messages().get(userId="me", id=m["id"], format="full").execute()
            emails.append(self._parse_message(full))
        return emails

    def send_email(self, to: str, subject: str, body: str) -> bool:
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        self.service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return True

    def mark_as_read(self, gmail_id: str) -> bool:
        try:
            self.service.users().messages().modify(
                userId="me", id=gmail_id, body={"removeLabelIds": ["UNREAD"]}
            ).execute()
            return True
        except Exception:
            return False
