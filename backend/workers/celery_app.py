from celery import Celery
from core.config import settings

celery_app = Celery(
    "reply_guy",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    timezone="America/Los_Angeles",
)