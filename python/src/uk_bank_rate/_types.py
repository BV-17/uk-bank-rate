# ─── Python Standard Library ────────────────────────────────────────────────

import datetime
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

# ─── Series ─────────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class BankRateObservation:
    date: datetime.date
    rate: Decimal

@dataclass(frozen=True, slots=True)
class BankRateChange:
    date: datetime.date
    rate: Decimal

@dataclass(frozen=True, slots=True)
class BankRateHistory:
    changes: tuple[BankRateChange, ...]
    observed_to: datetime.date

# ─── Readings ───────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class PendingDecision:
    date: datetime.date
    announced: bool

@dataclass(frozen=True, slots=True)
class BankRateReading:
    rate: Decimal
    effective_from: datetime.date
    observed_to: datetime.date
    pending_decision: PendingDecision | None
    beyond_schedule: bool

@dataclass(frozen=True, slots=True)
class CurrentBankRate(BankRateReading):
    as_of: datetime.date
    next_decision: datetime.date | None

@dataclass(frozen=True, slots=True)
class BankRatePeriod:
    start: datetime.date
    end: datetime.date
    rate: Decimal
    days: int

@dataclass(frozen=True, slots=True)
class BankRatePeriods:
    periods: tuple[BankRatePeriod, ...]
    observed_to: datetime.date
    pending_decision: PendingDecision | None
    beyond_schedule: bool

@dataclass(frozen=True, slots=True)
class LatePaymentRate:
    rate: Decimal
    reference_date: datetime.date
    reference_rate: Decimal
    observed_to: datetime.date
    pending_decision: PendingDecision | None
    beyond_schedule: bool

# ─── Fetching ───────────────────────────────────────────────────────────────

SourceFailure = Literal["http", "not_csv", "empty", "timeout", "network"]

Transport = Callable[[str, float], tuple[int, str]]
