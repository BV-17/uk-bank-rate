# ─── Public Interface ────────────────────────────────────────────────────────

from uk_bank_rate._bundled import bundled_history
from uk_bank_rate._current import fetch_bank_rate_history, get_bank_rate
from uk_bank_rate._generated import SERIES_CODE, SERIES_STARTS_ON, USER_AGENT
from uk_bank_rate._history import extend_history, history_from_observations
from uk_bank_rate._parse import date_from_series_date, parse_bank_rate_csv
from uk_bank_rate._periods import rates_between
from uk_bank_rate._reading import rate_on
from uk_bank_rate._schedule import (
    SCHEDULED_DECISIONS,
    is_decision_announced,
    is_decision_reflected,
    london_date,
    next_scheduled_decision,
)
from uk_bank_rate._source import BankRateSourceError, fetch_bank_rate_observations, series_url, urllib_transport
from uk_bank_rate._types import (
    BankRateChange,
    BankRateHistory,
    BankRateObservation,
    BankRatePeriod,
    BankRatePeriods,
    BankRateReading,
    CurrentBankRate,
    PendingDecision,
    SourceFailure,
    Transport,
)
from uk_bank_rate._version import VERSION

# ─── Metadata ────────────────────────────────────────────────────────────────

__version__ = VERSION

__all__ = [
    "SCHEDULED_DECISIONS",
    "SERIES_CODE",
    "SERIES_STARTS_ON",
    "USER_AGENT",
    "BankRateChange",
    "BankRateHistory",
    "BankRateObservation",
    "BankRatePeriod",
    "BankRatePeriods",
    "BankRateReading",
    "BankRateSourceError",
    "CurrentBankRate",
    "PendingDecision",
    "SourceFailure",
    "Transport",
    "bundled_history",
    "date_from_series_date",
    "extend_history",
    "fetch_bank_rate_history",
    "fetch_bank_rate_observations",
    "get_bank_rate",
    "history_from_observations",
    "is_decision_announced",
    "is_decision_reflected",
    "london_date",
    "next_scheduled_decision",
    "parse_bank_rate_csv",
    "rate_on",
    "rates_between",
    "series_url",
    "urllib_transport",
]
