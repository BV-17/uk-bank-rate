// ─── Node Standard Library ──────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { extendHistory, historyFromObservations } from './history.js';
import { isoFromSeriesDate, parseBankRateCsv } from './parse.js';
import { ratesBetween } from './periods.js';
import { rateOn } from './reading.js';
import { isDecisionAnnounced, isDecisionReflected, londonDate, nextScheduledDecision } from './schedule.js';
import { fetchBankRateObservations } from './source.js';

import type { BankRateHistory, BankRateObservation, BankRatePeriods, BankRateReading, SourceFailure } from './types.js';

// ─── Case Shapes ────────────────────────────────────────────────────────────

type Row = [string, string];

interface HistoryShape {
  changes: Row[];
  observedTo: string;
}

interface ReadingShape {
  rate: string;
  effectiveFrom: string;
  observedTo: string;
  pendingDecision: { date: string; announced: boolean } | null;
  beyondSchedule: boolean;
}

interface PeriodsShape {
  periods: [string, string, string, number][];
  observedTo: string;
  pendingDecision: { date: string; announced: boolean } | null;
  beyondSchedule: boolean;
}

interface NamedCase {
  name: string;
}

interface ConformanceCases {
  seriesDates: { input: string; expected: string | null }[];
  csv: (NamedCase & { input: string; expected: Row[] })[];
  historyFromObservations: (NamedCase & { observations: Row[]; expected: HistoryShape | null })[];
  extendHistory: (NamedCase & { history: HistoryShape; observations: Row[]; expected: HistoryShape })[];
  londonDates: (NamedCase & { now: string; expected: string })[];
  announcements: (NamedCase & { decision: string; now: string; expected: boolean })[];
  reflections: (NamedCase & { decision: string; observedTo: string; now: string; expected: boolean })[];
  nextDecisions: (NamedCase & { now: string; expected: string | null })[];
  readings: (NamedCase & { history: HistoryShape; date: string; now: string; expected: ReadingShape | null })[];
  periods: (NamedCase & { history: HistoryShape; start: string; end: string; now: string; expected: PeriodsShape | null })[];
  answers: (NamedCase & { status: number; body: string; expected?: Row[]; failure?: SourceFailure })[];
  connectionFailures: (NamedCase & { timeoutMs: number; failsAfterMs: number; failure: SourceFailure })[];
}

// ─── Shared Cases ───────────────────────────────────────────────────────────

const CASES = JSON.parse(
  readFileSync(new URL('../../shared/conformance.json', import.meta.url), 'utf8'),
) as ConformanceCases;

const observationsFrom = (rows: Row[]): BankRateObservation[] =>
  rows.map(([date, rate]) => ({ date, rate: Number(rate) }));

const historyFrom = (shape: HistoryShape): BankRateHistory => ({
  changes: observationsFrom(shape.changes),
  observedTo: shape.observedTo,
});

const readingFrom = (shape: ReadingShape | null): BankRateReading | null =>
  shape === null ? null : { ...shape, rate: Number(shape.rate) };

const periodsFrom = (shape: PeriodsShape | null): BankRatePeriods | null =>
  shape === null ? null : {
    ...shape,
    periods: shape.periods.map(([start, end, rate, days]) => ({ start, end, rate: Number(rate), days })),
  };

const answering = (status: number, body: string): typeof globalThis.fetch => async () => (
  status >= 200 && status <= 599
    ? new Response(body, { status })
    : Object.defineProperty(new Response(body), 'status', { value: status })
);

class ClientTimeout extends Error {}

const failingAfter = (delayMs: number): typeof globalThis.fetch => async () => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  throw new ClientTimeout('the client gave up');
};

// ─── Parsing ────────────────────────────────────────────────────────────────

describe('series dates', () => {
  it.each(CASES.seriesDates)('$input', ({ input, expected }) => {
    expect(isoFromSeriesDate(input)).toBe(expected);
  });
});

describe('CSV', () => {
  it.each(CASES.csv)('$name', ({ input, expected }) => {
    expect(parseBankRateCsv(input)).toEqual(observationsFrom(expected));
  });
});

// ─── History ────────────────────────────────────────────────────────────────

describe('building a history', () => {
  it.each(CASES.historyFromObservations)('$name', ({ observations, expected }) => {
    expect(historyFromObservations(observationsFrom(observations))).toEqual(expected === null ? null : historyFrom(expected));
  });
});

describe('extending a history', () => {
  it.each(CASES.extendHistory)('$name', ({ history, observations, expected }) => {
    expect(extendHistory(historyFrom(history), observationsFrom(observations))).toEqual(historyFrom(expected));
  });
});

// ─── Schedule ───────────────────────────────────────────────────────────────

describe('the London date', () => {
  it.each(CASES.londonDates)('$name', ({ now, expected }) => {
    expect(londonDate(new Date(now))).toBe(expected);
  });
});

describe('announcements', () => {
  it.each(CASES.announcements)('$name', ({ decision, now, expected }) => {
    expect(isDecisionAnnounced(decision, new Date(now))).toBe(expected);
  });
});

describe('reflections', () => {
  it.each(CASES.reflections)('$name', ({ decision, observedTo, now, expected }) => {
    expect(isDecisionReflected(decision, observedTo, new Date(now))).toBe(expected);
  });
});

describe('the next decision', () => {
  it.each(CASES.nextDecisions)('$name', ({ now, expected }) => {
    expect(nextScheduledDecision(new Date(now))).toBe(expected);
  });
});

// ─── Readings ───────────────────────────────────────────────────────────────

describe('readings', () => {
  it.each(CASES.readings)('$name', ({ history, date, now, expected }) => {
    expect(rateOn(historyFrom(history), date, new Date(now))).toEqual(readingFrom(expected));
  });
});

// ─── Periods ────────────────────────────────────────────────────────────────

describe('periods', () => {
  it.each(CASES.periods)('$name', ({ history, start, end, now, expected }) => {
    expect(ratesBetween(historyFrom(history), start, end, new Date(now))).toEqual(periodsFrom(expected));
  });
});

// ─── Answers ────────────────────────────────────────────────────────────────

describe('answers from the Database', () => {
  it.each(CASES.answers)('$name', async ({ status, body, expected, failure }) => {
    const attempt = fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: answering(status, body) });
    if (failure) await expect(attempt).rejects.toMatchObject({ failure, status });
    else await expect(attempt).resolves.toEqual(observationsFrom(expected ?? []));
  });
});

// ─── Failures on the Way ────────────────────────────────────────────────────

describe('failures on the way to the Database', () => {
  it.each(CASES.connectionFailures)('$name', async ({ timeoutMs, failsAfterMs, failure }) => {
    const attempt = fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: failingAfter(failsAfterMs), timeoutMs });
    await expect(attempt).rejects.toMatchObject({ failure, cause: expect.any(ClientTimeout) });
  });
});
