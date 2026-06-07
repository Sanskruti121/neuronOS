import time
import httpx
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.user import User
from app.models.email_item import EmailItem
from app.models.task import Task
from app.services.gmail_service import GmailService
from app.services.ai_service import AIService
from app.services.search_service import SearchService
from app.config import settings


@celery_app.task
def sync_gmail_for_user(user_id: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.google_access_token:
            return

        gmail = GmailService(user.google_access_token, user.google_refresh_token or "")
        emails = gmail.fetch_recent_emails(max_results=20)
        ai = AIService()

        for email_data in emails:
            existing = db.query(EmailItem).filter(EmailItem.gmail_id == email_data["gmail_id"]).first()
            if existing:
                continue

            email_item = EmailItem(
                user_id=user.id,
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

                if (analysis.get("priority_score") or 0) >= 80:
                    send_priority_alert.delay(user.id, email_item.id)

                if (analysis.get("priority_score") or 0) >= 70:
                    extracted = ai.extract_tasks_from_email(email_data)
                    for task_data in extracted:
                        from datetime import date
                        due = None
                        if task_data.get("due_date"):
                            try:
                                due = date.fromisoformat(task_data["due_date"])
                            except Exception:
                                pass
                        task = Task(
                            user_id=user.id,
                            source_email_id=email_item.id,
                            title=task_data["title"],
                            description=task_data.get("description"),
                            priority=task_data.get("priority", "medium"),
                            due_date=due,
                        )
                        db.add(task)
            except Exception as e:
                print(f"AI error: {e}")

        db.commit()
        index_new_emails.delay(user_id)
    finally:
        db.close()


@celery_app.task
def process_email_with_ai(email_id: str):
    db = SessionLocal()
    try:
        email = db.query(EmailItem).filter(EmailItem.id == email_id).first()
        if not email:
            return
        ai = AIService()
        email_dict = {"subject": email.subject, "sender": email.sender, "body_text": email.body_text}
        analysis = ai.summarize_email(email_dict)
        email.ai_summary = analysis.get("summary")
        email.priority_score = analysis.get("priority_score")
        email.priority_reason = analysis.get("priority_reason")
        email.action_required = analysis.get("action_required", False)
        email.is_processed = True

        if (analysis.get("priority_score") or 0) >= 80:
            send_priority_alert.delay(email.user_id, email_id)

        tasks_extracted = ai.extract_tasks_from_email(email_dict)
        for task_data in tasks_extracted:
            from datetime import date
            due = None
            if task_data.get("due_date"):
                try:
                    due = date.fromisoformat(task_data["due_date"])
                except Exception:
                    pass
            task = Task(
                user_id=email.user_id,
                source_email_id=email_id,
                title=task_data["title"],
                description=task_data.get("description"),
                priority=task_data.get("priority", "medium"),
                due_date=due,
            )
            db.add(task)
        db.commit()
    finally:
        db.close()


@celery_app.task
def send_priority_alert(user_id: str, email_id: str):
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        email = db.query(EmailItem).filter(EmailItem.id == email_id).first()
        if not user or not email or not user.telegram_chat_id:
            return
        message = (
            f"🚨 High Priority Email\n"
            f"From: {email.sender}\n"
            f"Subject: {email.subject}\n"
            f"Summary: {email.ai_summary or 'No summary'}"
        )
        with httpx.Client() as client:
            client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": user.telegram_chat_id, "text": message},
            )
    finally:
        db.close()


@celery_app.task
def generate_daily_digest_task(user_id: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        emails = db.query(EmailItem).filter(EmailItem.user_id == user_id).limit(20).all()
        tasks = db.query(Task).filter(Task.user_id == user_id, Task.status != "done").all()
        ai = AIService()
        email_dicts = [{"subject": e.subject, "priority_score": e.priority_score} for e in emails]
        task_dicts = [{"title": t.title, "status": t.status} for t in tasks]
        ai.generate_daily_digest(email_dicts, task_dicts, {"open_prs": []})
    finally:
        db.close()


@celery_app.task
def index_new_emails(user_id: str):
    db = SessionLocal()
    try:
        from app.models.email_item import Embedding
        emails = db.query(EmailItem).filter(EmailItem.user_id == user_id).all()
        search_svc = SearchService(db)
        for email in emails:
            existing = db.query(Embedding).filter(
                Embedding.entity_type == "email", Embedding.entity_id == email.id
            ).first()
            if not existing:
                try:
                    search_svc.index_email(email.id)
                    time.sleep(0.1)
                except Exception as e:
                    print(f"Embedding error: {e}")
    finally:
        db.close()


@celery_app.task
def sync_all_users_gmail():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.google_access_token.isnot(None)).all()
        for user in users:
            sync_gmail_for_user.delay(user.id)
    finally:
        db.close()


@celery_app.task
def generate_all_digests():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            generate_daily_digest_task.delay(user.id)
    finally:
        db.close()
