// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { shiftIsoDate } from './dates.js';
import { SCHEDULED_DECISIONS, bundledHistory } from './generated.js';
import { rateOn } from './reading.js';
import { londonDate } from './schedule.js';
import { fetchBankRateObservations } from './source.js';

// ─── Live Database ──────────────────────────────────────────────────────────

describe.skipIf(!process.env['LIVE'])('the live Bank of England Database', () => {
  it('answers with recent observations, none more than ten days old', async () => {
    const today = londonDate();
    const observations = await fetchBankRateObservations(shiftIsoDate(today, -21), today, { timeoutMs: 30_000 });
    expect(observations.length).toBeGreaterThan(5);
    expect(observations.at(-1)?.date ?? '').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((observations.at(-1)?.date ?? '') >= shiftIsoDate(today, -10)).toBe(true);
  }, 40_000);

  it('agrees with the bundled history on every day both cover', async () => {
    const start = shiftIsoDate(bundledHistory.observedTo, -60);
    const observations = await fetchBankRateObservations(start, bundledHistory.observedTo, { timeoutMs: 30_000 });
    for (const observation of observations) {
      expect(rateOn(bundledHistory, observation.date)?.rate).toBe(observation.rate);
    }
  }, 40_000);

  it('has at least six months of scheduled decisions left', () => {
    const lastScheduled = SCHEDULED_DECISIONS.at(-1) ?? '';
    const sixMonthsOut = shiftIsoDate(londonDate(), 183);
    expect(lastScheduled >= sixMonthsOut, `add the next year's MPC dates; the schedule ends on ${lastScheduled}`).toBe(true);
  });
});
