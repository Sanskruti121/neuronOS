from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.auth_helpers import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


def _build_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )


@router.get("/google")
def google_login():
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline", include_granted_scopes="true", prompt="consent"
    )
    return RedirectResponse(auth_url)


@router.get("/google/callback")
def google_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    flow = _build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    user_info_svc = build("oauth2", "v2", credentials=creds, cache_discovery=False)
    profile = user_info_svc.userinfo().get().execute()

    email = profile.get("email")
    name = profile.get("name", "")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name)
        db.add(user)

    user.google_access_token = creds.token
    user.google_refresh_token = creds.refresh_token or user.google_refresh_token
    user.name = name
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={token}")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "has_gmail": bool(current_user.google_access_token),
        "has_github": bool(current_user.github_token),
    }
