import json
import numpy as np
from sqlalchemy.orm import Session
from app.config import settings
from app.models.email_item import Embedding


def _get_embedding_client():
    """Returns OpenAI client for embeddings, or None if no key available."""
    if settings.OPENAI_API_KEY:
        from openai import OpenAI
        return OpenAI(api_key=settings.OPENAI_API_KEY)
    return None


class SearchService:
    def __init__(self, db: Session):
        self.db = db
        self._client = _get_embedding_client()

    def generate_embedding(self, text: str) -> list[float]:
        if not self._client:
            return []
        response = self._client.embeddings.create(
            model="text-embedding-3-small", input=text[:8000]
        )
        return response.data[0].embedding

    def index_email(self, email_id: str) -> None:
        if not self._client:
            return
        from app.models.email_item import EmailItem
        existing = self.db.query(Embedding).filter(
            Embedding.entity_type == "email", Embedding.entity_id == email_id
        ).first()
        if existing:
            return
        email = self.db.query(EmailItem).filter(EmailItem.id == email_id).first()
        if not email:
            return
        text = f"{email.subject or ''} {email.sender or ''} {(email.body_text or '')[:500]}"
        vector = self.generate_embedding(text)
        if not vector:
            return
        emb = Embedding(entity_type="email", entity_id=email_id, vector=json.dumps(vector))
        self.db.add(emb)
        self.db.commit()

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        a_arr = np.array(a)
        b_arr = np.array(b)
        denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
        if denom == 0:
            return 0.0
        return float(np.dot(a_arr, b_arr) / denom)

    def search(self, query: str, user_id: str, limit: int = 10) -> list[dict]:
        if not self._client:
            # Fallback: keyword search when no embedding API available
            return self._keyword_search(query, user_id, limit)

        query_vector = self.generate_embedding(query)
        if not query_vector:
            return self._keyword_search(query, user_id, limit)

        from app.models.email_item import EmailItem
        from app.models.task import Task
        embeddings = self.db.query(Embedding).all()
        results = []
        for emb in embeddings:
            stored_vector = json.loads(emb.vector)
            score = self.cosine_similarity(query_vector, stored_vector)
            if emb.entity_type == "email":
                entity = self.db.query(EmailItem).filter(
                    EmailItem.id == emb.entity_id, EmailItem.user_id == user_id
                ).first()
                if entity:
                    results.append({
                        "entity_type": "email",
                        "entity_id": emb.entity_id,
                        "score": score,
                        "title": entity.subject,
                        "preview": (entity.ai_summary or entity.body_text or "")[:150],
                    })
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def _keyword_search(self, query: str, user_id: str, limit: int) -> list[dict]:
        from app.models.email_item import EmailItem
        from app.models.task import Task
        q = query.lower()
        results = []
        emails = self.db.query(EmailItem).filter(EmailItem.user_id == user_id).all()
        for e in emails:
            text = f"{e.subject or ''} {e.sender or ''} {e.body_text or ''}".lower()
            if q in text:
                results.append({
                    "entity_type": "email",
                    "entity_id": e.id,
                    "score": 1.0,
                    "title": e.subject,
                    "preview": (e.ai_summary or e.body_text or "")[:150],
                })
        tasks = self.db.query(Task).filter(Task.user_id == user_id).all()
        for t in tasks:
            text = f"{t.title or ''} {t.description or ''}".lower()
            if q in text:
                results.append({
                    "entity_type": "task",
                    "entity_id": t.id,
                    "score": 1.0,
                    "title": t.title,
                    "preview": t.description or "",
                })
        return results[:limit]
