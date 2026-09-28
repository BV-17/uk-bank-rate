// ─── Local Application Imports ──────────────────────────────────────────────

import type { BankRateChange, BankRateHistory, BankRateObservation } from './types.js';

// ─── Ordering ───────────────────────────────────────────────────────────────

const byDate = (observations: readonly BankRateObservation[]): BankRateObservation[] =>
  [...observations].sort((left, right) => left.date.localeCompare(right.date));

const appendChanges = (changes: BankRateChange[], observations: readonly BankRateObservation[]): void => {
  for (const observation of observations) {
    if (changes.at(-1)?.rate !== observation.rate) changes.push({ date: observation.date, rate: observation.rate });
  }
};

// ─── Building ───────────────────────────────────────────────────────────────

export const historyFromObservations = (observations: readonly BankRateObservation[]): BankRateHistory | null => {
  const ordered = byDate(observations);
  const last = ordered.at(-1);
  if (!last) return null;
  const changes: BankRateChange[] = [];
  appendChanges(changes, ordered);
  return { changes, observedTo: last.date };
};

export const extendHistory = (
  history: BankRateHistory,
  observations: readonly BankRateObservation[],
): BankRateHistory => {
  const newer = byDate(observations).filter((observation) => observation.date > history.observedTo);
  const last = newer.at(-1);
  if (!last) return history;
  const changes = [...history.changes];
  appendChanges(changes, newer);
  return { changes, observedTo: last.date };
};

// ─── Lookup ─────────────────────────────────────────────────────────────────

export const changeInForce = (history: BankRateHistory, date: string): BankRateChange | null =>
  history.changes.findLast((change) => change.date <= date) ?? null;
