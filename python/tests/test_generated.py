# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
from decimal import Decimal

# ─── Third-Party Libraries ───────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate import SCHEDULED_DECISIONS, SERIES_STARTS_ON, BankRateChange, __version__, bundled_history

# ─── Bundled History ─────────────────────────────────────────────────────────

def test_the_bundled_history_starts_where_the_series_starts() -> None:
    assert bundled_history.changes[0].date == SERIES_STARTS_ON

def test_the_bundled_history_holds_one_entry_per_change_in_date_order() -> None:
    for previous, change in zip(bundled_history.changes, bundled_history.changes[1:]):
        assert change.date > previous.date
        assert change.rate != previous.rate

def test_the_bundled_history_was_observed_no_earlier_than_its_last_change() -> None:
    assert bundled_history.observed_to >= bundled_history.changes[-1].date

@pytest.mark.parametrize(
    ("changed_on", "rate"),
    [
        ("2009-03-05", "0.5"),
        ("2016-08-04", "0.25"),
        ("2020-03-11", "0.25"),
        ("2020-03-19", "0.1"),
        ("2021-12-16", "0.25"),
        ("2023-08-03", "5.25"),
        ("2024-08-01", "5"),
        ("2025-12-18", "3.75"),
    ],
)
def test_the_bundled_history_carries_known_changes(changed_on: str, rate: str) -> None:
    assert BankRateChange(date=datetime.date.fromisoformat(changed_on), rate=Decimal(rate)) in bundled_history.changes

# ─── Scheduled Decisions ─────────────────────────────────────────────────────

def test_the_schedule_is_in_date_order_with_no_repeats() -> None:
    assert list(SCHEDULED_DECISIONS) == sorted(set(SCHEDULED_DECISIONS))

def test_every_scheduled_decision_falls_on_a_thursday() -> None:
    assert {decision.isoweekday() for decision in SCHEDULED_DECISIONS} == {4}

# ─── Metadata ────────────────────────────────────────────────────────────────

def test_the_version_is_a_release_number() -> None:
    assert all(part.isdigit() for part in __version__.split("."))
