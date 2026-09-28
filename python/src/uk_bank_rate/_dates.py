# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import re

# ─── Validation ──────────────────────────────────────────────────────────────

ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")

def as_date(value: datetime.date | str, name: str) -> datetime.date:
    if isinstance(value, datetime.datetime):
        raise TypeError(f"{name} must be a date, not a datetime")
    if isinstance(value, datetime.date):
        return value
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a date or an ISO date string, not {type(value).__name__}")
    if ISO_DATE.fullmatch(value):
        try:
            return datetime.date.fromisoformat(value)
        except ValueError:
            pass
    raise ValueError(f'{name} must be an ISO date (YYYY-MM-DD), received "{value}"')

def as_aware(now: datetime.datetime | None) -> datetime.datetime:
    if now is None:
        return datetime.datetime.now(datetime.UTC)
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("now must be timezone-aware, for example datetime.now(timezone.utc)")
    return now
