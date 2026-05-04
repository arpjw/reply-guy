import random
from celery import Celery
from celery.schedules import crontab
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
    enable_utc=True,
)

# Randomized offset within a 4-hour window so different deployments fire at different times.
# Restarting the beat process picks a new offset; stable for the lifetime of the process.
_offset = random.randint(0, 239)   # 0-239 minutes → 0h 0m to 3h 59m
_hour   = _offset // 60            # 0, 1, 2, or 3
_minute = _offset % 60

# Celery crontab doesn't support step syntax (n/step), so enumerate the 6 fire hours explicitly.
_hours = ",".join(str((_hour + i * 4) % 24) for i in range(6))

celery_app.conf.beat_schedule = {
    "run-pipeline-every-4h": {
        "task": "workers.tasks.run_pipeline",
        "schedule": crontab(minute=str(_minute), hour=_hours),
    }
}
