from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.email_item import EmailItem
from app.models.task import Task
from app.services.ai_service import AIService
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None


@router.get("")
def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    tasks = query.order_by(Task.created_at.desc()).all()
    return [_serialize_task(t) for t in tasks]


@router.post("")
def create_task(
    body: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = Task(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        due_date=body.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.patch("/{task_id}")
def update_task(
    task_id: str,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"deleted": True}


@router.post("/extract-from-email/{email_id}")
def extract_tasks_from_email(
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
    email_dict = {
        "subject": email.subject,
        "sender": email.sender,
        "body_text": email.body_text,
    }
    extracted = ai.extract_tasks_from_email(email_dict)
    created = []
    for task_data in extracted:
        task = Task(
            user_id=current_user.id,
            source_email_id=email.id,
            title=task_data["title"],
            description=task_data.get("description"),
            priority=task_data.get("priority", "medium"),
            due_date=_parse_date(task_data.get("due_date")),
        )
        db.add(task)
        created.append(task)
    db.commit()
    return [_serialize_task(t) for t in created]


def _serialize_task(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "priority": t.priority,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "status": t.status,
        "source_email_id": t.source_email_id,
        "created_at": t.created_at.isoformat(),
    }


def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str)
    except Exception:
        return None
