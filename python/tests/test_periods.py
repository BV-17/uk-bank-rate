# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime

# ─── Third-Party Libraries ───────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate import bundled_history, rates_between

# ─── Refusals ────────────────────────────────────────────────────────────────

def test_a_span_that_ends_before_it_starts_is_refused() -> None:
    with pytest.raises(ValueError, match="falls before start"):
        rates_between(bundled_history, "2026-09-28", "2026-09-01")

def test_dates_that_are_not_iso_are_refused() -> None:
    with pytest.raises(ValueError):
        rates_between(bundled_history, "2026-9-1", "2026-09-28")
    with pytest.raises(TypeError):
        rates_between(bundled_history, datetime.datetime(2026, 9, 1, tzinfo=datetime.UTC), "2026-09-28")

def test_every_day_of_the_span_is_covered_exactly_once() -> None:
    first_day = datetime.date(1975, 1, 2)
    span = rates_between(bundled_history, first_day, bundled_history.observed_to)
    assert span is not None
    assert sum(period.days for period in span.periods) == (bundled_history.observed_to - first_day).days + 1
    assert len(span.periods) == len(bundled_history.changes)
