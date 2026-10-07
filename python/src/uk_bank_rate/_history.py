# ─── Python Standard Library ────────────────────────────────────────────────

import datetime
from collections.abc import Iterable

# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate._types import BankRateChange, BankRateHistory, BankRateObservation

# ─── Ordering ───────────────────────────────────────────────────────────────

def _by_date(observations: Iterable[BankRateObservation]) -> list[BankRateObservation]:
    return sorted(observations, key=lambda observation: observation.date)

def _append_changes(changes: list[BankRateChange], observations: Iterable[BankRateObservation]) -> None:
    for observation in observations:
        if not changes or changes[-1].rate != observation.rate:
            changes.append(BankRateChange(date=observation.date, rate=observation.rate))

# ─── Building ───────────────────────────────────────────────────────────────

def history_from_observations(observations: Iterable[BankRateObservation]) -> BankRateHistory | None:
    ordered = _by_date(observations)
    if not ordered:
        return None
    changes: list[BankRateChange] = []
    _append_changes(changes, ordered)
    return BankRateHistory(changes=tuple(changes), observed_to=ordered[-1].date)

def extend_history(history: BankRateHistory, observations: Iterable[BankRateObservation]) -> BankRateHistory:
    newer = [observation for observation in _by_date(observations) if observation.date > history.observed_to]
    if not newer:
        return history
    changes = list(history.changes)
    _append_changes(changes, newer)
    return BankRateHistory(changes=tuple(changes), observed_to=newer[-1].date)

# ─── Lookup ─────────────────────────────────────────────────────────────────

def change_in_force(history: BankRateHistory, on: datetime.date) -> BankRateChange | None:
    return next((change for change in reversed(history.changes) if change.date <= on), None)
