# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import math
import urllib.error
import urllib.parse
import urllib.request
from email.message import Message
from typing import IO

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate._dates import as_date
from uk_bank_rate._generated import SERIES_CODE, SERIES_ENDPOINT, SERIES_STARTS_ON, USER_AGENT
from uk_bank_rate._parse import SeriesTable, columns_of, read_series_table
from uk_bank_rate._schedule import london_date
from uk_bank_rate._types import BankRateObservation, SourceFailure, Transport

# ─── Constants ───────────────────────────────────────────────────────────────

DEFAULT_TIMEOUT_SECONDS = 15.0

MONTH_ABBREVIATIONS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

# ─── Errors ──────────────────────────────────────────────────────────────────

class BankRateSourceError(Exception):
    def __init__(self, failure: SourceFailure, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.failure: SourceFailure = failure
        self.status = status

    def __reduce__(self) -> tuple[type["BankRateSourceError"], tuple[SourceFailure, str, int | None]]:
        return type(self), (self.failure, str(self), self.status)

# ─── Request ─────────────────────────────────────────────────────────────────

def _series_date_parameter(day: datetime.date) -> str:
    return f"{day.day:02d}/{MONTH_ABBREVIATIONS[day.month - 1]}/{day.year}"

def series_url(start: datetime.date | str, end: datetime.date | str) -> str:
    requested = as_date(start, "start")
    first_day = max(requested, SERIES_STARTS_ON)
    last_day = as_date(end, "end")
    if last_day < first_day:
        bound = f"the series starts on {SERIES_STARTS_ON}" if requested < SERIES_STARTS_ON else f"start ({requested})"
        raise ValueError(f"end ({last_day}) falls before {bound}")
    parameters = {
        "csv.x": "yes",
        "Datefrom": _series_date_parameter(first_day),
        "Dateto": _series_date_parameter(last_day),
        "SeriesCodes": SERIES_CODE,
        "CSVF": "TN",
        "UsingCodes": "Y",
        "VPD": "Y",
        "VFD": "N",
    }
    return f"{SERIES_ENDPOINT}?{urllib.parse.urlencode(parameters)}"

# ─── Transport ───────────────────────────────────────────────────────────────

class _RefuseRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self, req: urllib.request.Request, fp: IO[bytes], code: int, msg: str, headers: Message, newurl: str,
    ) -> urllib.request.Request | None:
        return None

_OPENER = urllib.request.build_opener(_RefuseRedirects)

def urllib_transport(url: str, timeout: float) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"Accept": "text/csv, application/csv", "User-Agent": USER_AGENT})
    try:
        with _OPENER.open(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        with error:
            return error.code, error.read().decode("utf-8", errors="replace")

# ─── Response ────────────────────────────────────────────────────────────────

def _status_explanation(status: int) -> str:
    if status == 0 or 300 <= status < 400:
        return ", redirecting to its error page"
    if status == 403:
        return ", its firewall refusing the request"
    return ""

def _refusal_of(table: SeriesTable) -> tuple[SourceFailure, str] | None:
    if table.header is None:
        return "empty", "returned an empty response"
    if table.header.startswith("<"):
        return "not_csv", "returned a web page instead of CSV"
    if SERIES_CODE not in columns_of(table.header):
        return "not_csv", f"returned something other than the {SERIES_CODE} series"
    if table.rows and not table.observations:
        return "not_csv", "returned rows this package cannot read, so its format may have changed"
    return None

def _read_series_body(status: int, body: str) -> list[BankRateObservation]:
    if status != 200:
        message = f"The Bank of England Database answered HTTP {status}{_status_explanation(status)}"
        raise BankRateSourceError("http", message, status)
    table = read_series_table(body)
    refused = _refusal_of(table)
    if refused is not None:
        raise BankRateSourceError(refused[0], f"The Bank of England Database {refused[1]}", status)
    return table.observations

# ─── Fetch ───────────────────────────────────────────────────────────────────

def _check_timeout(timeout: float) -> None:
    if not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or timeout <= 0:
        raise ValueError(f"timeout must be a positive number of seconds, received {timeout!r}")

def fetch_bank_rate_observations(
    start: datetime.date | str,
    end: datetime.date | str,
    *,
    now: datetime.datetime | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    transport: Transport | None = None,
) -> list[BankRateObservation]:
    url = series_url(start, end)
    _check_timeout(timeout)
    if as_date(start, "start") > london_date(now):
        return []
    send = transport or urllib_transport
    timed_out = f"The Bank of England Database did not answer within {timeout:g} seconds"
    try:
        status, body = send(url, timeout)
    except TimeoutError as error:
        raise BankRateSourceError("timeout", timed_out) from error
    except urllib.error.URLError as error:
        if isinstance(error.reason, TimeoutError):
            raise BankRateSourceError("timeout", timed_out) from error
        raise BankRateSourceError("network", f"Could not reach the Bank of England Database: {error.reason}") from error
    except Exception as error:
        raise BankRateSourceError("network", f"Could not reach the Bank of England Database: {error}") from error
    return _read_series_body(status, body)
