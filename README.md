# uk-bank-rate

![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-22%2B-339933?logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab?logo=python&logoColor=white)

![Source](https://img.shields.io/badge/Source-Bank_of_England_Database-1f2937)
![Data](https://img.shields.io/badge/Data-Open_Government_Licence_v3.0-4b5563)

![Vitest](https://img.shields.io/badge/Vitest-5.0-6e9f18?logo=vitest&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-tested-0a9edc?logo=pytest&logoColor=white)

![Status](https://img.shields.io/badge/Status-Pre--release-d29922)
![Version](https://img.shields.io/badge/Version-0.1.0-0a7ea4)
![Changelog](https://img.shields.io/badge/Changelog-Keep_a_Changelog-e05735)
![Claude](https://img.shields.io/badge/Claude-AI_Assisted-cc785c?logo=anthropic&logoColor=white)
![Licence](https://img.shields.io/badge/Licence-MIT-3da639?logo=opensourceinitiative&logoColor=white)

**The UK Bank Rate from the Bank of England's own data, for TypeScript and Python, and honest about the hours after a decision.**

Two small packages that answer the same questions the same way: what Bank Rate is today and since when, what it was on any date since 1975, and when the Monetary Policy Committee decides next. The TypeScript package has no dependencies at all and is tested on Node 22, 24 and 26; it uses only web-standard APIs (`fetch`, `AbortSignal`, `Intl`), so Bun, Deno and edge runtimes should work too, though they are not yet tested. The Python package uses the standard library alone (plus `tzdata` on Windows, which ships no time zone database), returns real `date` objects, and gives every rate as a `Decimal`, because interest worked out in floats drifts. Both read the Bank's own published series, both carry a bundled history of every change so historical lookups need no network, and both pass one shared set of test cases, so neither can quietly disagree with the other.

## Who it is for

Anyone who keeps writing the same fetch against the Bank of England Database: people building loan, mortgage and savings calculators, finance dashboards, and tools that work out statutory interest, which in the UK is so often defined as Bank Rate plus a margin. Web developers tend to want the TypeScript package; analysts and finance teams working locally tend to want the Python one. The answers are identical.

## The hours after a decision

The Committee announces its decision at 12:00 London time, and Bank Rate changes that day. The published series does not. The Bank's own help page says a series can publish one to two working days after the date it covers, and on the afternoon of 17 September 2026 the series still ended on the 16th. A client that simply reads the latest row reports the old rate for that whole window, with nothing to say it might be wrong.

So every reading carries a `pendingDecision`. When it is set, a scheduled decision falls on or before the date you asked about and the published data does not reflect it yet. `announced: true` means the Bank has spoken and the data has not caught up, so the rate you are holding may already be out of date; `announced: false` means the decision is still to come, later today or on a future date. When it is `null`, the answer is settled.

## TypeScript

```bash
npm install uk-bank-rate
```

```ts
import { bundledHistory, getBankRate, rateOn } from 'uk-bank-rate';

const current = await getBankRate();
console.log(current);

const covidLow = rateOn(bundledHistory, '2020-03-15');
console.log(covidLow?.rate, covidLow?.effectiveFrom);
```

`getBankRate()` resolves to an object like this, with every date an ISO string:

```ts
{
  rate: 3.75,
  effectiveFrom: '2025-12-18',
  observedTo: '2026-09-25',
  pendingDecision: null,
  asOf: '2026-09-28',
  nextDecision: '2026-11-05',
}
```

## Python

```bash
pip install uk-bank-rate
```

```python
from uk_bank_rate import bundled_history, get_bank_rate, rate_on

current = get_bank_rate()
print(current.rate, current.effective_from, current.next_decision)

if current.pending_decision and current.pending_decision.announced:
    print("A decision was announced today that the published data does not show yet")

covid_low = rate_on(bundled_history, "2020-03-15")
print(covid_low.rate, covid_low.effective_from)
```

Dates come back as `datetime.date`, rates as `Decimal("3.75")`, and `now` must be timezone-aware, since the package would rather refuse a naive datetime than guess which clock it came from.

## What each package offers

| TypeScript | Python | What it does |
|---|---|---|
| `getBankRate(options)` | `get_bank_rate(...)` | The rate today, with the day it took effect, the last day observed, any pending decision and the next scheduled one |
| `rateOn(history, date, now)` | `rate_on(history, on, now)` | The rate in force on a date, from a history you already hold, with no network call |
| `fetchBankRateHistory(options)` | `fetch_bank_rate_history(...)` | The bundled history brought up to date, fetching only the days since it ends |
| `fetchBankRateObservations(start, end, options)` | `fetch_bank_rate_observations(start, end, ...)` | The daily series for a range, straight from the Bank |
| `bundledHistory` | `bundled_history` | Every change since 2 January 1975, as shipped with the release |
| `SCHEDULED_DECISIONS`, `nextScheduledDecision(now)` | `SCHEDULED_DECISIONS`, `next_scheduled_decision(now)` | The Committee's published decision dates, and the next one |
| `isDecisionAnnounced(date, now)` | `is_decision_announced(date, now)` | Whether 12:00 London time has passed on a decision day |
| `BankRateSourceError` | `BankRateSourceError` | Raised with a `failure` of `http`, `not_csv`, `empty`, `timeout` or `network` |

Pass a history you have cached yourself as `history` and `getBankRate` fetches only the week before it ends onwards. Pass your own `fetch` in TypeScript, or a `transport` callable in Python, to route the request through whatever HTTP client or proxy you already use.

## When the Bank cannot be reached

Nothing guesses. A timeout, a refused connection, a redirect to the Bank's error page, a firewall refusal or a web page served in place of CSV each raise `BankRateSourceError` with its own `failure`, and the rate is never invented. If you would rather fall back than fail, the bundled history answers offline, and its `pendingDecision` still tells you what it cannot know:

```ts
import { bundledHistory, londonDate, rateOn } from 'uk-bank-rate';

const offline = rateOn(bundledHistory, londonDate());
```

## The data

- **Source**: the Bank of England Database, series `IUDBEDR` (Official Bank Rate), daily from 2 January 1975, through the CSV download the Bank documents on its help page for automatic use.
- **Bundled history**: every change since 1975 ships inside both packages and is refreshed at each release, so a live call fetches days, not fifty years.
- **Schedule**: the Committee's decision dates for 2026 and 2027, from the Bank's published dates, added a year at a time as the Bank announces them.
- **Two details learnt the hard way**: the Bank's firewall answers Python's default `urllib` user agent with `403 Access Denied`, so both packages send their own; and a start date before 1975 draws a redirect to an error page that still claims to be CSV, so both packages judge an answer by its status and its body, never by its headers.

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
│   ├── bank-rate-changes.json     # every change since 1975, refreshed from the Bank
│   ├── scheduled-decisions.json   # the Committee's published decision dates
│   └── conformance.json           # test cases both packages must pass
├── scripts/
│   ├── refresh-snapshot.mjs       # fetches the full series into shared/
│   └── sync-shared.mjs            # writes shared/ into both packages, or checks it
├── typescript/                    # the npm package
└── python/                        # the PyPI package
```

| Where | Command | What it does |
|---|---|---|
| root | `npm run sync` | Writes `shared/` into both packages' generated modules |
| root | `npm run sync:check` | Fails if a generated module, licence copy or version has drifted from `shared/` |
| root | `npm run snapshot` | Refreshes the bundled history from the Bank, then syncs |
| `typescript/` | `npm test`, `npm run typecheck`, `npm run build` | The TypeScript suite, strict typecheck and build |
| `python/` | `python -m pytest` | The Python suite |
| either | `LIVE=1` with the test command | Runs the checks against the live Database |

Developed by [Bhupen Varsani](https://github.com/BV-17).

---

Built with [Claude Code](https://claude.com/claude-code).
