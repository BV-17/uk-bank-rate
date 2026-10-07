# ─── Python Standard Library ────────────────────────────────────────────────

import datetime
from zoneinfo import ZoneInfo

# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate._dates import as_aware, as_date
from uk_bank_rate._generated import SCHEDULED_DECISION_DATES

# ─── Constants ──────────────────────────────────────────────────────────────

SCHEDULED_DECISIONS: tuple[datetime.date, ...] = SCHEDULED_DECISION_DATES

LONDON = ZoneInfo("Europe/London")

ANNOUNCEMENT_TIME = datetime.time(12, 0)

# ─── London Clock ───────────────────────────────────────────────────────────

def _london_now(now: datetime.datetime | None) -> datetime.datetime:
    return as_aware(now).astimezone(LONDON)

def london_date(now: datetime.datetime | None = None) -> datetime.date:
    return _london_now(now).date()

# ─── Announcements ──────────────────────────────────────────────────────────

def is_decision_announced(decision_date: datetime.date | str, now: datetime.datetime | None = None) -> bool:
    decision = as_date(decision_date, "decision_date")
    london = _london_now(now)
    return london.date() > decision or (london.date() == decision and london.time() >= ANNOUNCEMENT_TIME)

def is_decision_reflected(
    decision_date: datetime.date | str,
    observed_to: datetime.date | str,
    now: datetime.datetime | None = None,
) -> bool:
    decision = as_date(decision_date, "decision_date")
    return as_date(observed_to, "observed_to") >= decision and is_decision_announced(decision, now)

def next_scheduled_decision(now: datetime.datetime | None = None) -> datetime.date | None:
    moment = as_aware(now)
    return next((decision for decision in SCHEDULED_DECISIONS if not is_decision_announced(decision, moment)), None)
