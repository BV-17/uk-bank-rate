// ─── Public Interface ───────────────────────────────────────────────────────

export { fetchBankRateHistory, getBankRate } from './current.js';
export { SCHEDULED_DECISIONS, bundledHistory } from './generated.js';
export { extendHistory, historyFromObservations } from './history.js';
export { isoFromSeriesDate, parseBankRateCsv } from './parse.js';
export { rateOn } from './reading.js';
export { isDecisionAnnounced, isDecisionReflected, londonDate, nextScheduledDecision } from './schedule.js';
export {
  BankRateSourceError,
  SERIES_CODE,
  SERIES_STARTS_ON,
  fetchBankRateObservations,
  seriesUrl,
} from './source.js';

// ─── Public Types ───────────────────────────────────────────────────────────

export type {
  BankRateChange,
  BankRateHistory,
  BankRateObservation,
  BankRateReading,
  CurrentBankRate,
  CurrentBankRateOptions,
  FetchOptions,
  PendingDecision,
  SourceFailure,
} from './types.js';
