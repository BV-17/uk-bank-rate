// ─── Local Application Imports ──────────────────────────────────────────────

import { assertIsoDate } from './dates.js';
import { rateOn } from './reading.js';

import type { BankRateHistory, LatePaymentRate } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const LATE_PAYMENT_MARGIN = 8;

const LATE_PAYMENT_RULE_STARTS = '2002-08-07';

// ─── Late Payment ───────────────────────────────────────────────────────────

const referenceDateFor = (startsToRun: string): string => {
  const year = Number(startsToRun.slice(0, 4));
  return startsToRun.slice(5, 7) <= '06' ? `${year - 1}-12-31` : `${year}-06-30`;
};

export const latePaymentRate = (
  history: BankRateHistory,
  startsToRun: string,
  now: Date = new Date(),
): LatePaymentRate | null => {
  assertIsoDate(startsToRun, 'startsToRun');
  if (startsToRun < LATE_PAYMENT_RULE_STARTS) {
    throw new RangeError(`startsToRun (${startsToRun}) falls before ${LATE_PAYMENT_RULE_STARTS}, when the late payment rate came into force`);
  }
  const referenceDate = referenceDateFor(startsToRun);
  const reading = rateOn(history, referenceDate, now);
  if (!reading) return null;
  return {
    rate: reading.rate + LATE_PAYMENT_MARGIN,
    referenceDate,
    referenceRate: reading.rate,
    observedTo: reading.observedTo,
    pendingDecision: reading.pendingDecision,
    beyondSchedule: reading.beyondSchedule,
  };
};
