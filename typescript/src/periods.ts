// ─── Local Application Imports ──────────────────────────────────────────────

import { assertIsoDate, daysBetween, shiftIsoDate } from './dates.js';
import { changeInForce } from './history.js';
import { isBeyondSchedule, pendingDecisionBy } from './reading.js';

import type { BankRateChange, BankRateHistory, BankRatePeriod, BankRatePeriods } from './types.js';

// ─── Periods ────────────────────────────────────────────────────────────────

const periodsOf = (changes: readonly BankRateChange[], end: string): BankRatePeriod[] =>
  changes.map((change, index) => {
    const following = changes[index + 1];
    const last = following ? shiftIsoDate(following.date, -1) : end;
    return { start: change.date, end: last, rate: change.rate, days: daysBetween(change.date, last) + 1 };
  });

export const ratesBetween = (
  history: BankRateHistory,
  start: string,
  end: string,
  now: Date = new Date(),
): BankRatePeriods | null => {
  assertIsoDate(start, 'start');
  assertIsoDate(end, 'end');
  if (end < start) throw new RangeError(`end (${end}) falls before start (${start})`);
  const opening = changeInForce(history, start);
  if (!opening) return null;
  const later = history.changes.filter((change) => change.date > start && change.date <= end);
  return {
    periods: periodsOf([{ date: start, rate: opening.rate }, ...later], end),
    observedTo: history.observedTo,
    pendingDecision: pendingDecisionBy(history, end, now),
    beyondSchedule: isBeyondSchedule(history, end),
  };
};
