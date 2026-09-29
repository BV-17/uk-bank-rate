# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
from decimal import Decimal

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate._dates import as_date
from uk_bank_rate._reading import rate_on
from uk_bank_rate._types import BankRateHistory, LatePaymentRate

# ─── Constants ───────────────────────────────────────────────────────────────

LATE_PAYMENT_MARGIN = Decimal(8)

LATE_PAYMENT_RULE_STARTS = datetime.date(2002, 8, 7)

# ─── Late Payment ────────────────────────────────────────────────────────────

def _reference_date_for(starts_to_run: datetime.date) -> datetime.date:
    if starts_to_run.month <= 6:
        return datetime.date(starts_to_run.year - 1, 12, 31)
    return datetime.date(starts_to_run.year, 6, 30)

def late_payment_rate(
    history: BankRateHistory, starts_to_run: datetime.date | str, now: datetime.datetime | None = None,
) -> LatePaymentRate | None:
    day = as_date(starts_to_run, "starts_to_run")
    if day < LATE_PAYMENT_RULE_STARTS:
        raise ValueError(
            f"starts_to_run ({day}) falls before {LATE_PAYMENT_RULE_STARTS}, when the late payment rate came into force"
        )
    reference_date = _reference_date_for(day)
    reading = rate_on(history, reference_date, now)
    if reading is None:
        return None
    return LatePaymentRate(
        rate=reading.rate + LATE_PAYMENT_MARGIN,
        reference_date=reference_date,
        reference_rate=reading.rate,
        observed_to=reading.observed_to,
        pending_decision=reading.pending_decision,
        beyond_schedule=reading.beyond_schedule,
    )
