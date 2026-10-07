// ─── Node Standard Library ─────────────────────────────────────────────────

import { readFile, writeFile } from 'node:fs/promises';

// ─── Local Application Imports ─────────────────────────────────────────────

import {
  SERIES_CODE,
  SERIES_STARTS_ON,
  fetchBankRateObservations,
  historyFromObservations,
  londonDate,
} from '../typescript/dist/index.js';

// ─── Refresh ───────────────────────────────────────────────────────────────

const SHARED_CHANGES = new URL('../shared/bank-rate-changes.json', import.meta.url);

const observations = await fetchBankRateObservations(SERIES_STARTS_ON, londonDate(), { timeoutMs: 60_000 });
const history = historyFromObservations(observations);
if (!history) throw new Error('The Bank of England Database returned no observations');

const bundled = JSON.parse(await readFile(SHARED_CHANGES, 'utf8'));
const fetched = new Map(history.changes.map(({ date, rate }) => [date, String(rate)]));
const lost = bundled.changes.find(([date, rate]) => fetched.get(date) !== rate);
if (lost) throw new Error(`The fetched series does not carry the bundled change to ${lost[1]}% on ${lost[0]}, so nothing is written`);
if (history.observedTo < bundled.observedTo) {
  throw new Error(`The fetched series ends on ${history.observedTo}, before the bundled ${bundled.observedTo}, so nothing is written`);
}

const rows = history.changes.map(({ date, rate }) => `    [${JSON.stringify(date)}, ${JSON.stringify(String(rate))}]`);

const snapshot = [
  '{',
  `  "source": "Bank of England Database, series ${SERIES_CODE}",`,
  '  "licence": "Open Government Licence v3.0",',
  `  "observedTo": ${JSON.stringify(history.observedTo)},`,
  '  "changes": [',
  rows.join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');

await writeFile(SHARED_CHANGES, snapshot);
process.stdout.write(`Wrote ${history.changes.length} changes, observed to ${history.observedTo}\n`);
