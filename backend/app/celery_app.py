from celery import Celery
from app.config import settings

celery_app = Celery(
    "neuronos",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_always_eager=False,
    beat_schedule={
        "sync-gmail-every-15-min": {
            "task": "workers.tasks.sync_all_users_gmail",
            "schedule": 900,
        },
        "daily-digest-8am": {
            "task": "workers.tasks.generate_all_digests",
            "schedule": 86400,
        },
    },
)
