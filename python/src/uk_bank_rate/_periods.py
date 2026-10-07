# ─── Python Standard Library ────────────────────────────────────────────────

import datetime

# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate._dates import as_aware, as_date
from uk_bank_rate._history import change_in_force
from uk_bank_rate._reading import is_beyond_schedule, pending_decision_by
from uk_bank_rate._types import BankRateChange, BankRateHistory, BankRatePeriod, BankRatePeriods

# ─── Constants ──────────────────────────────────────────────────────────────

ONE_DAY = datetime.timedelta(days=1)

# ─── Periods ────────────────────────────────────────────────────────────────

def _periods_of(changes: list[BankRateChange], end: datetime.date) -> tuple[BankRatePeriod, ...]:
    lasts = [following.date - ONE_DAY for following in changes[1:]] + [end]
    return tuple(
        BankRatePeriod(start=change.date, end=last, rate=change.rate, days=(last - change.date).days + 1)
        for change, last in zip(changes, lasts, strict=True)
    )

def rates_between(
    history: BankRateHistory,
    start: datetime.date | str,
    end: datetime.date | str,
    now: datetime.datetime | None = None,
) -> BankRatePeriods | None:
    first_day = as_date(start, "start")
    last_day = as_date(end, "end")
    if last_day < first_day:
        raise ValueError(f"end ({last_day}) falls before start ({first_day})")
    moment = as_aware(now)
    opening = change_in_force(history, first_day)
    if opening is None:
        return None
    later = [change for change in history.changes if first_day < change.date <= last_day]
    return BankRatePeriods(
        periods=_periods_of([BankRateChange(date=first_day, rate=opening.rate), *later], last_day),
        observed_to=history.observed_to,
        pending_decision=pending_decision_by(history, last_day, moment),
        beyond_schedule=is_beyond_schedule(history, last_day),
    )
