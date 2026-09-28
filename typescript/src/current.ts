// ─── Local Application Imports ──────────────────────────────────────────────

import { shiftIsoDate } from './dates.js';
import { SERIES_STARTS_ON, bundledHistory } from './generated.js';
import { extendHistory } from './history.js';
import { rateOn } from './reading.js';
import { londonDate, nextScheduledDecision } from './schedule.js';
import { fetchBankRateObservations } from './source.js';

import type { BankRateHistory, CurrentBankRate, CurrentBankRateOptions } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const OVERLAP_DAYS = 7;

// ─── History ────────────────────────────────────────────────────────────────

export const fetchBankRateHistory = async (options: CurrentBankRateOptions = {}): Promise<BankRateHistory> => {
  const base = options.history ?? bundledHistory;
  const today = londonDate(options.now ?? new Date());
  const from = base.changes.length === 0 ? SERIES_STARTS_ON : shiftIsoDate(base.observedTo, -OVERLAP_DAYS);
  if (from > today) return base;
  const recent = await fetchBankRateObservations(from, today, options);
  return extendHistory(base, recent);
};

// ─── Current Rate ───────────────────────────────────────────────────────────

export const getBankRate = async (options: CurrentBankRateOptions = {}): Promise<CurrentBankRate> => {
  const now = options.now ?? new Date();
  const history = await fetchBankRateHistory({ ...options, now });
  const asOf = londonDate(now);
  const reading = rateOn(history, asOf, now);
  if (!reading) throw new RangeError(`No Bank Rate is known on or before ${asOf}`);
  return { ...reading, asOf, nextDecision: nextScheduledDecision(now) };
};
