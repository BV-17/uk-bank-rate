# uk-bank-rate

**The UK Bank Rate from the Bank of England's own data, with no dependencies, and honest about the hours after a decision.**

```bash
npm install uk-bank-rate
```

```ts
import { bundledHistory, getBankRate, rateOn, ratesBetween } from 'uk-bank-rate';

const current = await getBankRate();
const covidLow = rateOn(bundledHistory, '2020-06-01');
const through2025 = ratesBetween(bundledHistory, '2025-01-01', '2025-12-31');
```

`getBankRate()` resolves to the rate today, the day it took effect, the last day the published series covers, the next scheduled decision, and a `pendingDecision` that is set whenever a decision has been announced, or is due, that the published data does not reflect yet, and a `beyondSchedule` flag for dates past both the data and the published schedule. The Committee announces at 12:00 London time and the series can lag by a working day or two, so a client that reads only the latest row reports the old rate for that whole window without knowing it.

`rateOn()` answers the rate on any date since 2 January 1975 from a bundled history of every change, with no network call, and `ratesBetween()` splits a span into the periods over which the rate held, each with its count of days, for interest at Bank Rate plus a margin. `latePaymentRate()` gives the rate of statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998, 8% over the Bank Rate in force on the 30 June or 31 December before interest starts to run. Every date is an ISO string, and every failure to reach the Bank raises `BankRateSourceError` with a `failure` of `http`, `not_csv`, `empty`, `timeout` or `network`, an answer that is not the series or whose rows cannot be read included, so a change to the Bank's format is reported rather than read as no data. It runs server-side and is tested on Node 22, 24 and 26; it uses only web-standard APIs, so Bun, Deno and edge runtimes should work too, though they are not yet tested. The Bank's download sends no CORS headers, so a browser cannot call it.

The full guide, the Python package and the design notes are in the [repository](https://github.com/BV-17/uk-bank-rate).

Contains data from the Bank of England Database, licensed under the Open Government Licence v3.0 and copyright the Governor and Company of the Bank of England. Not affiliated with or endorsed by the Bank of England. Code released under the MIT licence.

Developed by [Bhupen Varsani](https://github.com/BV-17).
