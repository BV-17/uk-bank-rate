# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate._dates import as_aware, as_date
from uk_bank_rate._history import change_in_force
from uk_bank_rate._schedule import SCHEDULED_DECISIONS, is_decision_announced, is_decision_reflected
from uk_bank_rate._types import BankRateHistory, BankRateReading, PendingDecision

# ─── Pending Decisions ───────────────────────────────────────────────────────

def pending_decision_by(
    history: BankRateHistory, day: datetime.date, now: datetime.datetime,
) -> PendingDecision | None:
    decision = next(
        (
            candidate for candidate in SCHEDULED_DECISIONS
            if candidate <= day and not is_decision_reflected(candidate, history.observed_to, now)
        ),
        None,
    )
    if decision is None:
        return None
    return PendingDecision(date=decision, announced=is_decision_announced(decision, now))

def is_beyond_schedule(history: BankRateHistory, day: datetime.date) -> bool:
    return day > history.observed_to and (not SCHEDULED_DECISIONS or day > SCHEDULED_DECISIONS[-1])

# ─── Readings ────────────────────────────────────────────────────────────────

def rate_on(
    history: BankRateHistory, on: datetime.date | str, now: datetime.datetime | None = None,
) -> BankRateReading | None:
    day = as_date(on, "on")
    moment = as_aware(now)
    in_force = change_in_force(history, day)
    if in_force is None:
        return None
    return BankRateReading(
        rate=in_force.rate,
        effective_from=in_force.date,
        observed_to=history.observed_to,
        pending_decision=pending_decision_by(history, day, moment),
        beyond_schedule=is_beyond_schedule(history, day),
    )
