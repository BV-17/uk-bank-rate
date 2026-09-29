# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import re
from decimal import Decimal

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate._types import BankRateObservation

# ─── Constants ───────────────────────────────────────────────────────────────

MONTH_NUMBERS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

SERIES_DATE = re.compile(r"([0-9]{1,2})[ \t-]+([A-Za-z]{3})[ \t-]+([0-9]{4}|[0-9]{2})")

RATE_VALUE = re.compile(r"-?[0-9]+(?:\.[0-9]+)?")

BYTE_ORDER_MARK = "\ufeff"

LINE_BREAK = re.compile(r"\r\n|\r|\n")

FIELD_SEPARATOR = re.compile(r"[\t,]")

EDGE_BLANKS = " \t"

# ─── Dates ───────────────────────────────────────────────────────────────────

def _full_year(digits: str) -> int:
    year = int(digits)
    if len(digits) == 4:
        return year
    return 1900 + year if year >= 50 else 2000 + year

def date_from_series_date(raw: str) -> datetime.date | None:
    match = SERIES_DATE.fullmatch(raw.strip(EDGE_BLANKS))
    if match is None:
        return None
    day_digits, month_name, year_digits = match.groups()
    month = MONTH_NUMBERS.get(month_name.lower())
    if month is None:
        return None
    try:
        return datetime.date(_full_year(year_digits), month, int(day_digits))
    except ValueError:
        return None

# ─── CSV ─────────────────────────────────────────────────────────────────────

def _observation_from(line: str) -> BankRateObservation | None:
    fields = FIELD_SEPARATOR.split(line)
    observed_on = date_from_series_date(fields[0])
    rate_text = fields[1].strip(EDGE_BLANKS) if len(fields) > 1 else ""
    if observed_on is None or not RATE_VALUE.fullmatch(rate_text):
        return None
    return BankRateObservation(date=observed_on, rate=Decimal(rate_text))

def parse_bank_rate_csv(csv_text: str) -> list[BankRateObservation]:
    observations = []
    for line in LINE_BREAK.split(csv_text.removeprefix(BYTE_ORDER_MARK)):
        observation = _observation_from(line.strip(EDGE_BLANKS))
        if observation is not None:
            observations.append(observation)
    return sorted(observations, key=lambda observation: observation.date)
