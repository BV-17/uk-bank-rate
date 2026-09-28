// ─── Node Standard Library ──────────────────────────────────────────────────

import { writeFile } from 'node:fs/promises';

// ─── Local Application Imports ──────────────────────────────────────────────

import {
  SERIES_CODE,
  SERIES_STARTS_ON,
  fetchBankRateObservations,
  historyFromObservations,
  londonDate,
} from '../typescript/dist/index.js';

// ─── Refresh ────────────────────────────────────────────────────────────────

const SHARED_CHANGES = new URL('../shared/bank-rate-changes.json', import.meta.url);

const observations = await fetchBankRateObservations(SERIES_STARTS_ON, londonDate(), { timeoutMs: 60_000 });
const history = historyFromObservations(observations);
if (!history) throw new Error('The Bank of England Database returned no observations');

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
