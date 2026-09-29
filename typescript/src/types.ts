// ─── Series ─────────────────────────────────────────────────────────────────

export interface BankRateObservation {
  readonly date: string;
  readonly rate: number;
}

export interface BankRateChange {
  readonly date: string;
  readonly rate: number;
}

export interface BankRateHistory {
  readonly changes: readonly BankRateChange[];
  readonly observedTo: string;
}

// ─── Readings ───────────────────────────────────────────────────────────────

export interface PendingDecision {
  readonly date: string;
  readonly announced: boolean;
}

export interface BankRateReading {
  readonly rate: number;
  readonly effectiveFrom: string;
  readonly observedTo: string;
  readonly pendingDecision: PendingDecision | null;
  readonly beyondSchedule: boolean;
}

export interface CurrentBankRate extends BankRateReading {
  readonly asOf: string;
  readonly nextDecision: string | null;
}

export interface BankRatePeriod {
  readonly start: string;
  readonly end: string;
  readonly rate: number;
  readonly days: number;
}

export interface BankRatePeriods {
  readonly periods: readonly BankRatePeriod[];
  readonly observedTo: string;
  readonly pendingDecision: PendingDecision | null;
  readonly beyondSchedule: boolean;
}

export interface LatePaymentRate {
  readonly rate: number;
  readonly referenceDate: string;
  readonly referenceRate: number;
  readonly observedTo: string;
  readonly pendingDecision: PendingDecision | null;
  readonly beyondSchedule: boolean;
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
