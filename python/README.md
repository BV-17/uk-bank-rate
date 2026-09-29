# uk-bank-rate

**The UK Bank Rate from the Bank of England's own data, using the standard library alone, and honest about the hours after a decision.**

```bash
pip install uk-bank-rate
```

```python
from uk_bank_rate import bundled_history, get_bank_rate, rate_on, rates_between

current = get_bank_rate()
covid_low = rate_on(bundled_history, "2020-06-01")
through_2025 = rates_between(bundled_history, "2025-01-01", "2025-12-31")
```

`get_bank_rate()` returns the rate today, the day it took effect, the last day the published series covers, the next scheduled decision, and a `pending_decision` that is set whenever a decision has been announced, or is due, that the published data does not reflect yet, and a `beyond_schedule` flag for dates past both the data and the published schedule. The Committee announces at 12:00 London time and the series can lag by a working day or two, so a client that reads only the latest row reports the old rate for that whole window without knowing it.

`rate_on()` answers the rate on any date since 2 January 1975 from a bundled history of every change, with no network call, and `rates_between()` splits a span into the periods over which the rate held, each with its count of days, for interest at Bank Rate plus a margin. Dates come back as `datetime.date` and rates as `Decimal`, so interest worked out from them does not drift. Every failure to reach the Bank raises `BankRateSourceError` with a `failure` of `http`, `not_csv`, `empty`, `timeout` or `network`, an answer that is not the series or whose rows cannot be read included, so a change to the Bank's format is reported rather than read as no data.

The Bank's firewall refuses Python's default `urllib` user agent with `403 Access Denied`, which is why so many hand-written scripts pretend to be a browser. This package sends its own honest one instead, and exports it as `USER_AGENT` for a custom `transport` to send. It needs Python 3.11 or later and nothing outside the standard library, apart from `tzdata` on Windows, which ships no time zone database.

The full guide, the TypeScript package and the design notes are in the [repository](https://github.com/BV-17/uk-bank-rate).

Contains data from the Bank of England Database, licensed under the Open Government Licence v3.0 and copyright the Governor and Company of the Bank of England. Not affiliated with or endorsed by the Bank of England. Code released under the MIT licence.

Developed by [Bhupen Varsani](https://github.com/BV-17).
