# uk-bank-rate

![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-22%2B-339933?logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab?logo=python&logoColor=white)

![Source](https://img.shields.io/badge/Source-Bank_of_England_Database-1f2937)
![Data](https://img.shields.io/badge/Data-Open_Government_Licence_v3.0-4b5563)

![Vitest](https://img.shields.io/badge/Vitest-5.0-6e9f18?logo=vitest&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-tested-0a9edc?logo=pytest&logoColor=white)

![Status](https://img.shields.io/badge/Status-Alpha-d29922)
![Version](https://img.shields.io/badge/Version-0.3.1-0a7ea4)
![Changelog](https://img.shields.io/badge/Changelog-Keep_a_Changelog-e05735)
![Claude](https://img.shields.io/badge/Claude-AI_Assisted-cc785c?logo=anthropic&logoColor=white)
![Licence](https://img.shields.io/badge/Licence-MIT-3da639?logo=opensourceinitiative&logoColor=white)

**The UK Bank Rate from the Bank of England's own data, for TypeScript and Python, and honest about the hours after a decision.**

Two small packages that answer the same questions the same way: what Bank Rate is today and since when, what it was on any date or across any span since 1975, and when the Monetary Policy Committee decides next. Both read the Bank's own published series, both carry a bundled history of every change so historical questions need no network, and both pass one shared set of test cases, so neither can quietly disagree with the other.

The TypeScript package has no dependencies at all and is tested on Node 22, 24 and 26. It uses only web-standard APIs (`fetch`, `AbortSignal`, `Intl`), so Bun, Deno and edge runtimes should work too, though they are not yet tested. The Python package uses the standard library alone (plus `tzdata` on Windows, which ships no time zone database), returns real `date` objects, and gives every rate as a `Decimal`, because interest worked out in floats drifts.

## Who it is for

Anyone who keeps writing the same fetch against the Bank of England Database: people building loan, mortgage and savings calculators, finance dashboards, and tools that work out statutory interest, which in the UK is so often defined as Bank Rate plus a margin. Web developers tend to want the TypeScript package; analysts and finance teams working locally tend to want the Python one. The answers are identical.

## The hours after a decision

The Committee announces its decision at 12:00 London time, and Bank Rate changes that day. The published series does not. The Bank's own help page says a series can publish one to two working days after the date it covers, and on the afternoon of 17 September 2026 the series still ended on the 16th. A client that simply reads the latest row reports the old rate for that whole window, with nothing to say it might be wrong.

So every reading carries a `pendingDecision` (`pending_decision` in Python). When it is set, a scheduled decision falls on or before the date you asked about and the published data does not reflect it yet. `announced: true` means the Bank has spoken and the data has not caught up, so the rate you are holding may already be out of date; `announced: false` means the decision is still to come, later today or on a future date. When it is `null`, no scheduled decision stands in the way.

The schedule itself runs out, though: the Bank publishes it a year or so ahead. So every reading also carries `beyondSchedule` (`beyond_schedule`), which is `true` when the date you asked about lies past both the published data and the last scheduled decision. Decisions nobody has scheduled yet may have moved the rate by then, so treat such an answer as the last known rate, not a settled one.

## TypeScript

```bash
npm install uk-bank-rate
```

```ts
import {
  bundledHistory,
  getBankRate,
  rateOn,
} from 'uk-bank-rate';

const current = await getBankRate();
console.log(current.rate, current.effectiveFrom);

// The Covid low: 0.1, in force from 2020-03-19
const covidLow = rateOn(bundledHistory, '2020-06-01');
console.log(covidLow?.rate, covidLow?.effectiveFrom);
```

`getBankRate()` resolves to an object like this, with every date an ISO string:

```ts
{
  rate: 3.75,
  effectiveFrom: '2025-12-18',
  observedTo: '2026-09-25',
  pendingDecision: null,
  beyondSchedule: false,
  asOf: '2026-09-28',
  nextDecision: '2026-11-05',
}
```

## Python

```bash
pip install uk-bank-rate
```

```python
from uk_bank_rate import (
    bundled_history,
    get_bank_rate,
    rate_on,
)

current = get_bank_rate()
print(current.rate, current.effective_from)

pending = current.pending_decision
if pending and pending.announced:
    print("Announced today, not yet in the published data")

# The Covid low: 0.1, in force from 2020-03-19
covid_low = rate_on(bundled_history, "2020-06-01")
print(covid_low.rate, covid_low.effective_from)
```

Dates come back as `datetime.date`, rates as `Decimal("3.75")`, and `now` must be a timezone-aware `datetime`, since the package would rather refuse a naive one than guess which clock it came from.

## Rates across a span

Interest at Bank Rate plus a margin "from time to time", as loan agreements put it, needs the rate on every day of a span rather than on one. `ratesBetween` (`rates_between` in Python) splits a span into the periods over which the rate held, each with its first and last day, both inclusive, and its count of days, so the days add up to the span. It works offline on any history:

```python
from decimal import Decimal
from uk_bank_rate import bundled_history, rates_between

# £10,000 at 2% over Bank Rate through 2025
principal, margin = Decimal("10000"), 2
start, end = "2025-01-01", "2025-12-31"
span = rates_between(bundled_history, start, end)
interest = sum(
    principal * (period.rate + margin) * period.days
    for period in span.periods
) / 100 / 365
print(round(interest, 2))  # 625.14
```

```ts
import { bundledHistory, ratesBetween } from 'uk-bank-rate';

const [start, end] = ['2025-01-01', '2025-12-31'];
const span = ratesBetween(bundledHistory, start, end);
console.table(span?.periods);
```

The 2025 span runs from 4.75% on 1 January to 3.75% from 18 December, one period for each rate. The result carries `pendingDecision` and `beyondSchedule` for the span's last day, so a span that runs into the hours after a decision, or past the published schedule, says so; and like `rateOn`, it answers `null` for a span that starts before the history does.

## What each package offers

Every name below is the TypeScript one first and the Python one second, and the constants and the error are named the same in both.

**Reading the rate**

- `getBankRate`, `get_bank_rate`: the rate today, with the day it took effect, the last day observed, any pending decision and the next scheduled one.
- `rateOn`, `rate_on`: the rate in force on a date, from a history you already hold, with no network call.
- `ratesBetween`, `rates_between`: the periods over which the rate held between two dates, each with its days, with no network call.

**Histories**

- `bundledHistory`, `bundled_history`: every change since 2 January 1975, as shipped with the release.
- `fetchBankRateHistory`, `fetch_bank_rate_history`: the bundled history, or one you hold, brought up to date by fetching only its last week and the days since.
- `fetchBankRateObservations`, `fetch_bank_rate_observations`: the daily series between two dates, straight from the Bank. A range that starts after today has no observations yet, so it is answered without asking.
- `historyFromObservations`, `history_from_observations`: a history built from daily observations.
- `extendHistory`, `extend_history`: a history extended by newer observations.

**The schedule and the clock**

- `SCHEDULED_DECISIONS`: the Committee's published decision dates.
- `nextScheduledDecision`, `next_scheduled_decision`: the next of them.
- `isDecisionAnnounced`, `is_decision_announced`: whether 12:00 London time has passed on a decision day.
- `isDecisionReflected`, `is_decision_reflected`: whether a series ending on a given day shows the decision.
- `londonDate`, `london_date`: the date in London, which is the day every answer is judged by.

**Lower-level pieces**

- `parseBankRateCsv`, `parse_bank_rate_csv`: the Bank's CSV read into observations, the way the fetch reads it.
- `isoFromSeriesDate`, `date_from_series_date`: one of the Bank's dates, such as `18 Dec 2025`, read as a date.
- `seriesUrl`, `series_url`: the download URL for a range.
- `urllib_transport`, in Python alone: the transport used by default, to wrap rather than replace.
- `SERIES_CODE`, `SERIES_STARTS_ON`, `USER_AGENT`: the series (`IUDBEDR`), the day it begins, and the user agent both packages send.
- `BankRateSourceError`: raised with a `failure` of `http`, `not_csv`, `empty`, `timeout` or `network`, and the HTTP `status` where there was one.

Everything that reaches the Bank takes the same options: `timeoutMs` in TypeScript or `timeout` in seconds in Python (15 seconds by default), `now` for the clock, and your own `fetch` in TypeScript or `transport` in Python, to route the request through whatever HTTP client or proxy you already use. A Python transport takes the URL and the timeout and returns the status and the body as text; whatever it raises once the timeout has passed is reported as a `timeout`. It should not follow redirects, since the Bank reports a bad request by redirecting to an error page, and it should send `USER_AGENT`, since the Bank's firewall refuses Python's default:

```python
import httpx
from uk_bank_rate import USER_AGENT, get_bank_rate

HEADERS = {"User-Agent": USER_AGENT}

def via_httpx(url: str, timeout: float) -> tuple[int, str]:
    reply = httpx.get(url, timeout=timeout, headers=HEADERS)
    return reply.status_code, reply.text

current = get_bank_rate(transport=via_httpx)
```

To keep a history of your own between calls, hold what `fetchBankRateHistory` returns and pass it back as `history`; only the days from a week before it ends are fetched. `getBankRate({ history })` reads from it the same way but does not hand back the extended copy, so a long-running service refreshes with `fetchBankRateHistory` and reads with `rateOn(history, londonDate())`.

## When the Bank cannot be reached

Nothing guesses. A timeout, a refused connection, a redirect to the Bank's error page, a firewall refusal, a web page served in place of CSV, and an answer whose first line does not name the series or whose rows cannot be read each raise `BankRateSourceError` with its own `failure`, and the rate is never invented. A change to the Bank's format is reported as one rather than read as a quiet week. If you would rather fall back than fail, the bundled history answers offline, and its `pendingDecision` still tells you what it cannot know:

```ts
import {
  BankRateSourceError,
  bundledHistory,
  getBankRate,
  londonDate,
  rateOn,
} from 'uk-bank-rate';

let reading;
try {
  reading = await getBankRate();
} catch (error) {
  if (!(error instanceof BankRateSourceError)) throw error;
  reading = rateOn(bundledHistory, londonDate());
}
```

```python
from uk_bank_rate import (
    BankRateSourceError,
    bundled_history,
    get_bank_rate,
    london_date,
    rate_on,
)

try:
    reading = get_bank_rate()
except BankRateSourceError:
    reading = rate_on(bundled_history, london_date())
```

## The data

- **Source**: the Bank of England Database, series `IUDBEDR` (Official Bank Rate), daily from 2 January 1975, through the CSV download the Bank documents on its help page for automatic use.
- **Bundled history**: every change since 1975 ships inside both packages and is refreshed at each release, so a live call fetches days, not fifty years. Its first entry, 11.5% on 2 January 1975, is where the series begins rather than a change, so a reading from early 1975 gives that date as `effectiveFrom` although the rate was already in force.
- **Schedule**: the Committee's decision dates from the Bank's published list, which runs a year or so ahead, with each new year added once the Bank announces it.
- **Details learnt the hard way**: the Bank's firewall answers Python's default `urllib` user agent with `403 Access Denied`, so both packages send their own. A start date before 1963, when the Database itself begins, and a range that starts after today, each draw a redirect to an error page that still claims to be CSV, so both packages judge an answer by its status and its body, never by its headers, and accept it only when its first line names the series.

## Limits

- **Unscheduled decisions cannot be flagged in advance.** The cuts of 11 and 19 March 2020 were made between meetings; a change like that appears once the series carries it, and not before.
- **Server-side only.** The Bank's download sends no CORS headers, so a browser cannot call it directly. Server-side code, in either language, can.
- **The Bank promises no stability for the download.** Every failure is typed, and a weekly check runs both packages against the live Database so a change is noticed quickly.
- **No warranty.** The Bank gives none for the Database, and neither does this project.

## Data and attribution

Contains data from the Bank of England Database, licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) and copyright the Governor and Company of the Bank of England. This project is not affiliated with or endorsed by the Bank of England, and "Bank of England" is a registered trade mark of the Bank of England. The code is released under the MIT licence in [`LICENSE`](LICENSE).

## Development

The repository holds both packages and the files they share:

```
uk-bank-rate/
├── shared/
│   ├── bank-rate-changes.json    # every change since 1975
│   ├── scheduled-decisions.json  # the Committee's dates
│   ├── source.json               # where and what to fetch
│   └── conformance.json          # cases both packages pass
├── scripts/
│   ├── refresh-snapshot.mjs      # refreshes the history
│   └── sync-shared.mjs           # writes shared/ into both
├── typescript/                   # the npm package
└── python/                       # the PyPI package
```

| Where | Command | What it does |
|---|---|---|
| root | `npm run sync` | Writes `shared/` into both packages' generated modules |
| root | `npm run sync:check` | Fails if a generated module has drifted from `shared/`, a licence copy from `LICENSE`, or any version disagrees |
| root | `npm run snapshot` | Refreshes the bundled history from the Bank, then syncs |
| `typescript/` | `npm test`, `npm run typecheck`, `npm run build` | The TypeScript suite, strict typecheck and build |
| `python/` | `python -m pytest`, `python -m mypy --strict src` | The Python suite and strict type check |
| either | `LIVE=1` with the test command | Runs the checks against the live Database |

Developed by [Bhupen Varsani](https://github.com/BV-17).

---

Built with [Claude Code](https://claude.com/claude-code).
