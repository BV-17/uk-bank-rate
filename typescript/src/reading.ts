// ─── Local Application Imports ──────────────────────────────────────────────

import { assertIsoDate } from './dates.js';
import { SCHEDULED_DECISIONS } from './generated.js';
import { changeInForce } from './history.js';
import { isDecisionAnnounced, isDecisionReflected } from './schedule.js';

import type { BankRateHistory, BankRateReading, PendingDecision } from './types.js';

// ─── Pending Decisions ──────────────────────────────────────────────────────

const pendingDecisionBy = (history: BankRateHistory, date: string, now: Date): PendingDecision | null => {
  const decisionDate = SCHEDULED_DECISIONS.find(
    (candidate) => candidate <= date && !isDecisionReflected(candidate, history.observedTo, now),
  );
  return decisionDate ? { date: decisionDate, announced: isDecisionAnnounced(decisionDate, now) } : null;
};

// ─── Readings ───────────────────────────────────────────────────────────────

export const rateOn = (history: BankRateHistory, date: string, now: Date = new Date()): BankRateReading | null => {
  assertIsoDate(date, 'date');
  const inForce = changeInForce(history, date);
  if (!inForce) return null;
  return {
    rate: inForce.rate,
    effectiveFrom: inForce.date,
    observedTo: history.observedTo,
    pendingDecision: pendingDecisionBy(history, date, now),
    beyondSchedule: date > history.observedTo && date > (SCHEDULED_DECISIONS.at(-1) ?? ''),
  };
};
