from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.github_service import GitHubService
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/activity")
def get_github_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = current_user.github_token
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Add your GitHub token in settings.")
    gh = GitHubService(token)
    return {
        "commits": gh.get_recent_commits(7),
        "open_prs": gh.get_open_prs(),
    }


@router.get("/stats")
def get_github_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = current_user.github_token
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected.")
    gh = GitHubService(token)
    return gh.get_coding_stats(7)
