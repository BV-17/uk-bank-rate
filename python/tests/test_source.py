# ─── Python Standard Library ─────────────────────────────────────────────────

import datetime
import threading
import urllib.error
import urllib.parse
from collections.abc import Iterator
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, HTTPServer

# ─── Third-Party Libraries ───────────────────────────────────────────────────

import pytest

# ─── Local Application Imports ───────────────────────────────────────────────

from uk_bank_rate import BankRateObservation, BankRateSourceError, fetch_bank_rate_observations, series_url, urllib_transport

# ─── Fakes ───────────────────────────────────────────────────────────────────

def _answering(body: str, status: int = 200):
    return lambda url, timeout: (status, body)

def _raising(error: BaseException):
    def transport(url: str, timeout: float) -> tuple[int, str]:
        raise error
    return transport

class _LocalDatabase(BaseHTTPRequestHandler):
    user_agents: list[str] = []

    def do_GET(self) -> None:
        type(self).user_agents.append(self.headers.get("User-Agent", ""))
        redirecting = self.path.startswith("/redirect")
        body = b"<body><h1>Object Moved</h1></body>" if redirecting else b"DATE,IUDBEDR\n25 Sep 2026,3.75\n"
        self.send_response(302 if redirecting else 200)
        if redirecting:
            self.send_header("Location", "/error")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return None

@pytest.fixture
def local_database() -> Iterator[str]:
    server = HTTPServer(("127.0.0.1", 0), _LocalDatabase)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    server.server_close()

# ─── Request ─────────────────────────────────────────────────────────────────

def test_the_url_asks_for_the_bank_rate_series_in_the_database_date_form() -> None:
    url = urllib.parse.urlsplit(series_url("2026-09-01", datetime.date(2026, 9, 28)))
    parameters = dict(urllib.parse.parse_qsl(url.query))
    assert f"{url.scheme}://{url.netloc}{url.path}" == "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp"
    assert parameters["SeriesCodes"] == "IUDBEDR"
    assert parameters["Datefrom"] == "01/Sep/2026"
    assert parameters["Dateto"] == "28/Sep/2026"
    assert parameters["csv.x"] == "yes"

def test_the_url_starts_no_earlier_than_the_series_itself() -> None:
    parameters = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(series_url("1900-01-01", "1975-12-31")).query))
    assert parameters["Datefrom"] == "02/Jan/1975"

def test_the_url_refuses_bad_dates_and_a_backwards_range() -> None:
    with pytest.raises(ValueError):
        series_url("28/09/2026", "2026-09-28")
    with pytest.raises(ValueError):
        series_url("2026-02-30", "2026-09-28")
    with pytest.raises(TypeError):
        series_url(datetime.datetime(2026, 9, 1, tzinfo=datetime.UTC), "2026-09-28")
    with pytest.raises(ValueError):
        series_url("2026-09-28", "2026-09-01")

# ─── Answers ─────────────────────────────────────────────────────────────────

def test_a_csv_answer_is_read() -> None:
    observations = fetch_bank_rate_observations(
        "2026-09-24", "2026-09-25", transport=_answering("DATE,IUDBEDR\n24 Sep 2026,3.75\n25 Sep 2026,3.75\n"),
    )
    assert observations == [
        BankRateObservation(date=datetime.date(2026, 9, 24), rate=Decimal("3.75")),
        BankRateObservation(date=datetime.date(2026, 9, 25), rate=Decimal("3.75")),
    ]

def test_a_range_with_no_observations_returns_nothing() -> None:
    assert fetch_bank_rate_observations("2026-09-26", "2026-09-27", transport=_answering("DATE,IUDBEDR\n")) == []

@pytest.mark.parametrize(
    ("status", "body", "failure", "wording"),
    [
        (302, "<body><h1>Object Moved</h1></body>", "http", "error page"),
        (403, "<TITLE>Access Denied</TITLE>", "http", "firewall"),
        (200, "<!DOCTYPE html><html><body>Maintenance</body></html>", "not_csv", "web page"),
        (200, "", "empty", "empty"),
    ],
)
def test_a_bad_answer_is_refused(status: int, body: str, failure: str, wording: str) -> None:
    with pytest.raises(BankRateSourceError, match=wording) as raised:
        fetch_bank_rate_observations("2026-09-24", "2026-09-25", transport=_answering(body, status))
    assert raised.value.failure == failure
    assert raised.value.status == status

# ─── Failures on the Way ─────────────────────────────────────────────────────

@pytest.mark.parametrize(
    ("error", "failure"),
    [
        (TimeoutError("timed out"), "timeout"),
        (urllib.error.URLError(TimeoutError("timed out")), "timeout"),
        (urllib.error.URLError("connection refused"), "network"),
        (ConnectionResetError("reset by peer"), "network"),
        (RuntimeError("a custom transport's own error"), "network"),
    ],
)
def test_a_failed_connection_names_its_failure(error: BaseException, failure: str) -> None:
    with pytest.raises(BankRateSourceError) as raised:
        fetch_bank_rate_observations("2026-09-24", "2026-09-25", transport=_raising(error))
    assert raised.value.failure == failure
    assert raised.value.__cause__ is error

# ─── Default Transport ───────────────────────────────────────────────────────

def test_the_default_transport_names_itself_and_reads_the_answer(local_database: str) -> None:
    status, body = urllib_transport(f"{local_database}/csv", 5)
    assert (status, body) == (200, "DATE,IUDBEDR\n25 Sep 2026,3.75\n")
    assert _LocalDatabase.user_agents[-1].startswith("uk-bank-rate ")

def test_the_default_transport_refuses_to_follow_a_redirect(local_database: str) -> None:
    status, body = urllib_transport(f"{local_database}/redirect", 5)
    assert status == 302
    assert "Object Moved" in body
