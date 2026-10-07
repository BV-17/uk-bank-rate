// ─── Public Interface ──────────────────────────────────────────────────────

export { fetchBankRateHistory, getBankRate } from './current.js';
export { SCHEDULED_DECISIONS, SERIES_CODE, SERIES_STARTS_ON, USER_AGENT, bundledHistory } from './generated.js';
export { extendHistory, historyFromObservations } from './history.js';
export { isoFromSeriesDate, parseBankRateCsv } from './parse.js';
export { ratesBetween } from './periods.js';
export { rateOn } from './reading.js';
export { isDecisionAnnounced, isDecisionReflected, londonDate, nextScheduledDecision } from './schedule.js';
export { BankRateSourceError, fetchBankRateObservations, seriesUrl } from './source.js';
export { latePaymentRate } from './statutory.js';

// ─── Public Types ──────────────────────────────────────────────────────────

export type {
  BankRateChange,
  BankRateHistory,
  BankRateObservation,
  BankRatePeriod,
  BankRatePeriods,
  BankRateReading,
  CurrentBankRate,
  CurrentBankRateOptions,
  FetchOptions,
  LatePaymentRate,
  PendingDecision,
  SourceFailure,
} from './types.js';
