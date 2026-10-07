# ─── Python Standard Library ────────────────────────────────────────────────

import datetime
import json
import time
from decimal import Decimal
from pathlib import Path
from typing import Any

# ─── Third-Party Libraries ──────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate import (
    BankRateChange,
    BankRateHistory,
    BankRateObservation,
    BankRatePeriod,
    BankRateSourceError,
    LatePaymentRate,
    PendingDecision,
    date_from_series_date,
    extend_history,
    fetch_bank_rate_observations,
    history_from_observations,
    is_decision_announced,
    is_decision_reflected,
    late_payment_rate,
    london_date,
    next_scheduled_decision,
    parse_bank_rate_csv,
    rate_on,
    rates_between,
)

# ─── Shared Cases ───────────────────────────────────────────────────────────

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

def _pending(shape: dict[str, Any] | None) -> PendingDecision | None:
    if shape is None:
        return None
    return PendingDecision(date=datetime.date.fromisoformat(shape["date"]), announced=shape["announced"])

# ─── Parsing ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("seriesDates"))
def test_series_dates(case: dict[str, Any]) -> None:
    assert date_from_series_date(case["input"]) == _day(case["expected"])

@pytest.mark.parametrize("case", _cases("csv"))
def test_csv(case: dict[str, Any]) -> None:
    assert parse_bank_rate_csv(case["input"]) == _observations(case["expected"])

# ─── History ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("historyFromObservations"))
def test_building_a_history(case: dict[str, Any]) -> None:
    expected = None if case["expected"] is None else _history(case["expected"])
    assert history_from_observations(_observations(case["observations"])) == expected

@pytest.mark.parametrize("case", _cases("extendHistory"))
def test_extending_a_history(case: dict[str, Any]) -> None:
    assert extend_history(_history(case["history"]), _observations(case["observations"])) == _history(case["expected"])

# ─── Schedule ───────────────────────────────────────────────────────────────

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

# ─── Readings ───────────────────────────────────────────────────────────────

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
    assert reading.pending_decision == _pending(expected["pendingDecision"])
    assert reading.beyond_schedule is expected["beyondSchedule"]

# ─── Periods ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("periods"))
def test_periods(case: dict[str, Any]) -> None:
    span = rates_between(_history(case["history"]), case["start"], case["end"], _moment(case["now"]))
    expected = case["expected"]
    if expected is None:
        assert span is None
        return
    assert span is not None
    assert span.periods == tuple(
        BankRatePeriod(start=datetime.date.fromisoformat(start), end=datetime.date.fromisoformat(end), rate=Decimal(rate), days=days)
        for start, end, rate, days in expected["periods"]
    )
    assert span.observed_to == _day(expected["observedTo"])
    assert span.pending_decision == _pending(expected["pendingDecision"])
    assert span.beyond_schedule is expected["beyondSchedule"]

# ─── Late Payment ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("latePaymentRates"))
def test_late_payment_rates(case: dict[str, Any]) -> None:
    history, now = _history(case["history"]), _moment(case["now"])
    if case.get("refused"):
        with pytest.raises(ValueError, match="came into force"):
            late_payment_rate(history, case["startsToRun"], now)
        return
    expected = case["expected"]
    assert late_payment_rate(history, case["startsToRun"], now) == (None if expected is None else LatePaymentRate(
        rate=Decimal(expected["rate"]),
        reference_date=datetime.date.fromisoformat(expected["referenceDate"]),
        reference_rate=Decimal(expected["referenceRate"]),
        observed_to=datetime.date.fromisoformat(expected["observedTo"]),
        pending_decision=_pending(expected["pendingDecision"]),
        beyond_schedule=expected["beyondSchedule"],
    ))

# ─── Answers ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _cases("answers"))
def test_answers(case: dict[str, Any]) -> None:
    def transport(url: str, timeout: float) -> tuple[int, str]:
        return case["status"], case["body"]
    if "failure" not in case:
        assert fetch_bank_rate_observations("2026-09-24", "2026-09-25", transport=transport) == _observations(case["expected"])
        return
    with pytest.raises(BankRateSourceError) as raised:
        fetch_bank_rate_observations("2026-09-24", "2026-09-25", transport=transport)
    assert (raised.value.failure, raised.value.status) == (case["failure"], case["status"])

# ─── Failures on the Way ────────────────────────────────────────────────────

class _ClientTimeout(Exception):
    pass

@pytest.mark.parametrize("case", _cases("connectionFailures"))
def test_connection_failures(case: dict[str, Any]) -> None:
    def transport(url: str, timeout: float) -> tuple[int, str]:
        time.sleep(case["failsAfterMs"] / 1000)
        raise _ClientTimeout("the client gave up")
    with pytest.raises(BankRateSourceError) as raised:
        fetch_bank_rate_observations("2026-09-24", "2026-09-25", timeout=case["timeoutMs"] / 1000, transport=transport)
    assert raised.value.failure == case["failure"]
    assert isinstance(raised.value.__cause__, _ClientTimeout)
