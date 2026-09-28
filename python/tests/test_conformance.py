# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import json
from decimal import Decimal
from pathlib import Path
from typing import Any

# ─── Third-Party Libraries ───────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate import (
    BankRateChange,
    BankRateHistory,
    BankRateObservation,
    PendingDecision,
    date_from_series_date,
    extend_history,
    history_from_observations,
    is_decision_announced,
    is_decision_reflected,
    london_date,
    next_scheduled_decision,
    parse_bank_rate_csv,
    rate_on,
)

# ─── Shared Cases ────────────────────────────────────────────────────────────

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "conformance.json").read_text(encoding="utf-8"))

def _cases(section: str) -> list[Any]:
    return [pytest.param(case, id=case.get("name", case.get("input"))) for case in CASES[section]]

def _day(iso: str | None) -> datetime.date | None:
    return None if iso is None else datetime.date.fromisoformat(iso)

def _moment(iso: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(iso)

def _observations(rows: list[list[str]]) -> list[BankRateObservation]:
    return [BankRateObservation(date=datetime.date.fromisoformat(day), rate=Decimal(rate)) for day, rate in rows]

def _history(shape: dict[str, Any]) -> BankRateHistory:
    changes = tuple(BankRateChange(date=datetime.date.fromisoformat(day), rate=Decimal(rate)) for day, rate in shape["changes"])
    return BankRateHistory(changes=changes, observed_to=datetime.date.fromisoformat(shape["observedTo"]))

# ─── Parsing ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("seriesDates"))
def test_series_dates(case: dict[str, Any]) -> None:
    assert date_from_series_date(case["input"]) == _day(case["expected"])

@pytest.mark.parametrize("case", _cases("csv"))
def test_csv(case: dict[str, Any]) -> None:
    assert parse_bank_rate_csv(case["input"]) == _observations(case["expected"])

# ─── History ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("historyFromObservations"))
def test_building_a_history(case: dict[str, Any]) -> None:
    expected = None if case["expected"] is None else _history(case["expected"])
    assert history_from_observations(_observations(case["observations"])) == expected

@pytest.mark.parametrize("case", _cases("extendHistory"))
def test_extending_a_history(case: dict[str, Any]) -> None:
    assert extend_history(_history(case["history"]), _observations(case["observations"])) == _history(case["expected"])

# ─── Schedule ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("londonDates"))
def test_the_london_date(case: dict[str, Any]) -> None:
    assert london_date(_moment(case["now"])) == _day(case["expected"])

@pytest.mark.parametrize("case", _cases("announcements"))
def test_announcements(case: dict[str, Any]) -> None:
    assert is_decision_announced(case["decision"], _moment(case["now"])) is case["expected"]

@pytest.mark.parametrize("case", _cases("reflections"))
def test_reflections(case: dict[str, Any]) -> None:
    assert is_decision_reflected(case["decision"], case["observedTo"], _moment(case["now"])) is case["expected"]

@pytest.mark.parametrize("case", _cases("nextDecisions"))
def test_the_next_decision(case: dict[str, Any]) -> None:
    assert next_scheduled_decision(_moment(case["now"])) == _day(case["expected"])

# ─── Readings ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("readings"))
def test_readings(case: dict[str, Any]) -> None:
    reading = rate_on(_history(case["history"]), case["date"], _moment(case["now"]))
    expected = case["expected"]
    if expected is None:
        assert reading is None
        return
    assert reading is not None
    assert reading.rate == Decimal(expected["rate"])
    assert reading.effective_from == _day(expected["effectiveFrom"])
    assert reading.observed_to == _day(expected["observedTo"])
    pending = expected["pendingDecision"]
    expected_pending = None if pending is None else PendingDecision(date=_day(pending["date"]), announced=pending["announced"])
    assert reading.pending_decision == expected_pending
