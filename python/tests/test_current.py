# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import urllib.parse
from decimal import Decimal
from typing import Any

# ─── Third-Party Libraries ───────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate import BankRateChange, BankRateHistory, PendingDecision, bundled_history, get_bank_rate

# ─── Fixtures ────────────────────────────────────────────────────────────────

HISTORY = BankRateHistory(
    changes=(
        BankRateChange(date=datetime.date(2025, 8, 7), rate=Decimal("4")),
        BankRateChange(date=datetime.date(2025, 12, 18), rate=Decimal("3.75")),
    ),
    observed_to=datetime.date(2026, 9, 11),
)

class _Serving:
    def __init__(self, csv_text: str) -> None:
        self.csv_text = csv_text
        self.requests: list[str] = []

    def __call__(self, url: str, timeout: float) -> tuple[int, str]:
        self.requests.append(url)
        return 200, self.csv_text

def _at(iso: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(iso)

# ─── Current Rate ────────────────────────────────────────────────────────────

def test_only_the_days_after_the_history_are_fetched_with_a_week_of_overlap() -> None:
    serving = _Serving("DATE,IUDBEDR\n25 Sep 2026,3.75\n")
    get_bank_rate(history=HISTORY, transport=serving, now=_at("2026-09-28T09:00:00Z"))
    parameters = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(serving.requests[0]).query))
    assert parameters["Datefrom"] == "04/Sep/2026"
    assert parameters["Dateto"] == "28/Sep/2026"

def test_the_rate_comes_with_its_effective_day_the_last_day_observed_and_the_next_decision() -> None:
    current = get_bank_rate(
        history=HISTORY,
        transport=_Serving("DATE,IUDBEDR\n24 Sep 2026,3.75\n25 Sep 2026,3.75\n"),
        now=_at("2026-09-28T09:00:00Z"),
    )
    assert current.rate == Decimal("3.75")
    assert current.effective_from == datetime.date(2025, 12, 18)
    assert current.observed_to == datetime.date(2026, 9, 25)
    assert current.pending_decision is None
    assert current.as_of == datetime.date(2026, 9, 28)
    assert current.next_decision == datetime.date(2026, 11, 5)

def test_a_change_the_series_carries_is_picked_up() -> None:
    history = BankRateHistory(changes=HISTORY.changes, observed_to=datetime.date(2026, 11, 2))
    current = get_bank_rate(
        history=history,
        transport=_Serving("DATE,IUDBEDR\n04 Nov 2026,3.75\n05 Nov 2026,3.5\n06 Nov 2026,3.5\n"),
        now=_at("2026-11-09T09:00:00Z"),
    )
    assert (current.rate, current.effective_from) == (Decimal("3.5"), datetime.date(2026, 11, 5))
    assert current.pending_decision is None
    assert current.next_decision == datetime.date(2026, 12, 17)

def test_a_decision_announced_this_afternoon_is_flagged_until_the_series_catches_up() -> None:
    current = get_bank_rate(
        history=HISTORY, transport=_Serving("DATE,IUDBEDR\n16 Sep 2026,3.75\n"), now=_at("2026-09-17T12:40:00Z"),
    )
    assert current.rate == Decimal("3.75")
    assert current.observed_to == datetime.date(2026, 9, 16)
    assert current.pending_decision == PendingDecision(date=datetime.date(2026, 9, 17), announced=True)
    assert current.next_decision == datetime.date(2026, 11, 5)

def test_the_bundled_history_is_the_starting_point_when_none_is_given() -> None:
    serving = _Serving("DATE,IUDBEDR\n")
    current = get_bank_rate(transport=serving, now=_at("2026-09-28T09:00:00Z"))
    assert current.observed_to == bundled_history.observed_to
    assert len(serving.requests) == 1

def test_no_rate_is_invented_when_nothing_is_known_for_today() -> None:
    future = BankRateHistory(
        changes=(BankRateChange(date=datetime.date(2030, 1, 2), rate=Decimal("2")),), observed_to=datetime.date(2030, 1, 3),
    )
    serving = _Serving("DATE,IUDBEDR\n")
    with pytest.raises(LookupError):
        get_bank_rate(history=future, transport=serving, now=_at("2026-09-28T09:00:00Z"))
    assert serving.requests == []

def test_a_naive_now_is_refused_rather_than_guessed() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        get_bank_rate(transport=_Serving("DATE,IUDBEDR\n"), now=datetime.datetime(2026, 9, 28, 9, 0))

def test_a_date_passed_as_now_is_refused_as_the_wrong_type() -> None:
    today: Any = datetime.date(2026, 9, 28)
    with pytest.raises(TypeError, match="timezone-aware datetime, not date"):
        get_bank_rate(transport=_Serving("DATE,IUDBEDR\n"), now=today)
