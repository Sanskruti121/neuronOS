from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.email_item import EmailItem
from app.models.task import Task
from app.services.gmail_service import GmailService
from app.services.ai_service import AIService
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/gmail", tags=["gmail"])


@router.post("/sync")
def sync_gmail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Gmail not connected. Please authenticate with Google first.")

    gmail = GmailService(current_user.google_access_token, current_user.google_refresh_token or "")
    ai = AIService()

    emails = gmail.fetch_recent_emails(max_results=20)
    new_count = 0

    for email_data in emails:
        existing = db.query(EmailItem).filter(EmailItem.gmail_id == email_data["gmail_id"]).first()
        if existing:
            continue

        email_item = EmailItem(
            user_id=current_user.id,
            gmail_id=email_data["gmail_id"],
            subject=email_data.get("subject"),
            sender=email_data.get("sender"),
            body_text=email_data.get("body_text"),
            received_at=email_data.get("received_at"),
        )
        db.add(email_item)
        db.flush()

        try:
            analysis = ai.summarize_email(email_data)
            email_item.ai_summary = analysis.get("summary")
            email_item.priority_score = analysis.get("priority_score")
            email_item.priority_reason = analysis.get("priority_reason")
            email_item.action_required = analysis.get("action_required", False)
            email_item.is_processed = True

            if (analysis.get("priority_score") or 0) >= 70:
                extracted = ai.extract_tasks_from_email(email_data)
                for task_data in extracted:
                    task = Task(
                        user_id=current_user.id,
                        source_email_id=email_item.id,
                        title=task_data["title"],
                        description=task_data.get("description"),
                        priority=task_data.get("priority", "medium"),
                        due_date=_parse_date(task_data.get("due_date")),
                    )
                    db.add(task)
        except Exception as e:
            print(f"AI processing error for {email_data['gmail_id']}: {e}")

        new_count += 1

    db.commit()
    return {"synced": len(emails), "new_emails": new_count}


@router.get("/emails")
def get_emails(
    limit: int = 20,
    offset: int = 0,
    min_priority: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(EmailItem).filter(EmailItem.user_id == current_user.id)
    if min_priority > 0:
        query = query.filter(EmailItem.priority_score >= min_priority)
    total = query.count()
    emails = query.order_by(EmailItem.received_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "emails": [_serialize_email(e) for e in emails],
    }


@router.get("/emails/{email_id}")
def get_email(
    email_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = db.query(EmailItem).filter(
        EmailItem.id == email_id, EmailItem.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return _serialize_email(email)


class DraftReplyRequest(BaseModel):
    user_context: Optional[str] = ""


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/draft-reply/{email_id}")
def draft_reply(
    email_id: str,
    body: DraftReplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = db.query(EmailItem).filter(
        EmailItem.id == email_id, EmailItem.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    ai = AIService()
    draft = ai.draft_reply(
        original_email={"sender": email.sender, "subject": email.subject, "body_text": email.body_text},
        user_name=current_user.name or current_user.email,
        user_context=body.user_context or "",
    )
    # Extract reply-to address from sender field
    import re
    match = re.search(r'<(.+?)>', email.sender or "")
    reply_to = match.group(1) if match else email.sender
    return {"draft": draft, "reply_to": reply_to, "subject": f"Re: {email.subject}"}


@router.post("/send")
def send_email(
    body: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Gmail not connected.")
    gmail = GmailService(current_user.google_access_token, current_user.google_refresh_token or "")
    gmail.send_email(to=body.to, subject=body.subject, body=body.body)
    return {"sent": True}


def _serialize_email(e: EmailItem) -> dict:
    return {
        "id": e.id,
        "gmail_id": e.gmail_id,
        "subject": e.subject,
        "sender": e.sender,
        "body_text": e.body_text,
        "received_at": e.received_at.isoformat() if e.received_at else None,
        "ai_summary": e.ai_summary,
        "priority_score": e.priority_score,
        "priority_reason": e.priority_reason,
        "action_required": e.action_required,
        "is_processed": e.is_processed,
        "has_tasks": bool(e.tasks),
    }


def _parse_date(date_str):
    if not date_str:
        return None
    from datetime import date
    try:
        return date.fromisoformat(date_str)
    except Exception:
        return None
