# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate._bundled import bundled_history
from uk_bank_rate._dates import as_aware
from uk_bank_rate._history import extend_history
from uk_bank_rate._reading import rate_on
from uk_bank_rate._schedule import london_date, next_scheduled_decision
from uk_bank_rate._source import DEFAULT_TIMEOUT_SECONDS, SERIES_STARTS_ON, fetch_bank_rate_observations
from uk_bank_rate._types import BankRateHistory, CurrentBankRate, Transport

# ─── Constants ───────────────────────────────────────────────────────────────

OVERLAP = datetime.timedelta(days=7)

# ─── History ─────────────────────────────────────────────────────────────────

def fetch_bank_rate_history(
    *,
    now: datetime.datetime | None = None,
    history: BankRateHistory | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    transport: Transport | None = None,
) -> BankRateHistory:
    base = bundled_history if history is None else history
    today = london_date(now)
    start = base.observed_to - OVERLAP if base.changes else SERIES_STARTS_ON
    if start > today:
        return base
    recent = fetch_bank_rate_observations(start, today, timeout=timeout, transport=transport)
    return extend_history(base, recent)

# ─── Current Rate ────────────────────────────────────────────────────────────

def get_bank_rate(
    *,
    now: datetime.datetime | None = None,
    history: BankRateHistory | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    transport: Transport | None = None,
) -> CurrentBankRate:
    moment = as_aware(now)
    current_history = fetch_bank_rate_history(now=moment, history=history, timeout=timeout, transport=transport)
    as_of = london_date(moment)
    reading = rate_on(current_history, as_of, moment)
    if reading is None:
        raise LookupError(f"No Bank Rate is known on or before {as_of}")
    return CurrentBankRate(
        rate=reading.rate,
        effective_from=reading.effective_from,
        observed_to=reading.observed_to,
        pending_decision=reading.pending_decision,
        as_of=as_of,
        next_decision=next_scheduled_decision(moment),
    )
