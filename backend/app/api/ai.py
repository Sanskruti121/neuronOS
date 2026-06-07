from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.email_item import EmailItem
from app.models.task import Task
from app.services.ai_service import AIService
from app.services.search_service import SearchService
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class CommandRequest(BaseModel):
    query: str


@router.get("/daily-digest")
def get_daily_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401)

    emails = db.query(EmailItem).filter(EmailItem.user_id == current_user.id).order_by(
        EmailItem.received_at.desc()
    ).limit(20).all()
    tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.status != "done").all()

    email_dicts = [{"subject": e.subject, "priority_score": e.priority_score} for e in emails]
    task_dicts = [{"title": t.title, "status": t.status} for t in tasks]

    ai = AIService()
    digest = ai.generate_daily_digest(email_dicts, task_dicts, {"open_prs": []})
    return {"digest": digest, "generated_at": __import__("datetime").datetime.utcnow().isoformat()}


@router.post("/summarize-email/{email_id}")
def summarize_email(
    email_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = db.query(EmailItem).filter(
        EmailItem.id == email_id, EmailItem.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    ai = AIService()
    result = ai.summarize_email({
        "subject": email.subject,
        "sender": email.sender,
        "body_text": email.body_text,
    })
    email.ai_summary = result.get("summary")
    email.priority_score = result.get("priority_score")
    email.priority_reason = result.get("priority_reason")
    email.action_required = result.get("action_required", False)
    email.is_processed = True
    db.commit()
    return result


@router.post("/command")
def run_command(
    body: CommandRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emails = db.query(EmailItem).filter(EmailItem.user_id == current_user.id).order_by(
        EmailItem.received_at.desc()
    ).limit(10).all()
    tasks = db.query(Task).filter(Task.user_id == current_user.id).limit(10).all()

    context = {
        "emails": [{"subject": e.subject, "sender": e.sender, "priority_score": e.priority_score} for e in emails],
        "tasks": [{"title": t.title, "priority": t.priority, "status": t.status} for t in tasks],
        "github": {},
    }
    ai = AIService()
    return ai.run_command(body.query, context)


@router.get("/search")
def semantic_search(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not q:
        return {"results": []}
    search_svc = SearchService(db)
    results = search_svc.search(q, current_user.id)
    return {"results": results, "query": q}
