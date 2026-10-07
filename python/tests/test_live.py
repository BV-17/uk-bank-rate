# ─── Python Standard Library ────────────────────────────────────────────────

import datetime
import os

# ─── Third-Party Libraries ──────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate import bundled_history, fetch_bank_rate_observations, london_date, rate_on

# ─── Live Database ──────────────────────────────────────────────────────────

pytestmark = pytest.mark.skipif(not os.environ.get("LIVE"), reason="set LIVE=1 to query the Bank of England Database")

def test_the_database_answers_with_recent_observations() -> None:
    today = london_date()
    observations = fetch_bank_rate_observations(today - datetime.timedelta(days=21), today, timeout=30)
    assert len(observations) > 5
    assert observations[-1].date >= today - datetime.timedelta(days=10)

def test_the_database_agrees_with_the_bundled_history_on_every_day_both_cover() -> None:
    start = bundled_history.observed_to - datetime.timedelta(days=60)
    for observation in fetch_bank_rate_observations(start, bundled_history.observed_to, timeout=30):
        reading = rate_on(bundled_history, observation.date)
        assert reading is not None
        assert reading.rate == observation.rate
