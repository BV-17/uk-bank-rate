// ─── Series ─────────────────────────────────────────────────────────────────

export interface BankRateObservation {
  date: string;
  rate: number;
}

export interface BankRateChange {
  date: string;
  rate: number;
}

export interface BankRateHistory {
  changes: readonly BankRateChange[];
  observedTo: string;
}

// ─── Readings ───────────────────────────────────────────────────────────────

export interface PendingDecision {
  date: string;
  announced: boolean;
}

export interface BankRateReading {
  rate: number;
  effectiveFrom: string;
  observedTo: string;
  pendingDecision: PendingDecision | null;
  beyondSchedule: boolean;
}

export interface CurrentBankRate extends BankRateReading {
  asOf: string;
  nextDecision: string | null;
}

// ─── Fetching ───────────────────────────────────────────────────────────────

export interface FetchOptions {
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  now?: Date;
}

export interface CurrentBankRateOptions extends FetchOptions {
  history?: BankRateHistory;
}

export type SourceFailure = 'http' | 'not_csv' | 'empty' | 'timeout' | 'network';
