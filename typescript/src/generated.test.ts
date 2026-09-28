// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { SCHEDULED_DECISIONS, SERIES_STARTS_ON, bundledHistory } from './generated.js';

// ─── Bundled History ────────────────────────────────────────────────────────

describe('bundledHistory', () => {
  it('starts where the series starts', () => {
    expect(bundledHistory.changes[0]?.date).toBe(SERIES_STARTS_ON);
  });

  it('holds one entry per change, in date order', () => {
    bundledHistory.changes.forEach((change, index) => {
      const previous = bundledHistory.changes[index - 1];
      if (!previous) return;
      expect(change.date > previous.date).toBe(true);
      expect(change.rate).not.toBe(previous.rate);
    });
  });

  it('was observed no earlier than its last change', () => {
    expect(bundledHistory.observedTo >= (bundledHistory.changes.at(-1)?.date ?? '')).toBe(true);
  });

  it.each([
    ['2009-03-05', 0.5],
    ['2016-08-04', 0.25],
    ['2020-03-11', 0.25],
    ['2020-03-19', 0.1],
    ['2021-12-16', 0.25],
    ['2023-08-03', 5.25],
    ['2024-08-01', 5],
    ['2025-12-18', 3.75],
  ])('carries the change of %s to %s%%', (date, rate) => {
    expect(bundledHistory.changes).toContainEqual({ date, rate });
  });
});

// ─── Scheduled Decisions ────────────────────────────────────────────────────

describe('SCHEDULED_DECISIONS', () => {
  it('is in date order with no repeats', () => {
    expect([...new Set(SCHEDULED_DECISIONS)].sort()).toEqual(SCHEDULED_DECISIONS);
  });

  it('falls on Thursdays, as every scheduled decision does', () => {
    for (const date of SCHEDULED_DECISIONS) expect(new Date(`${date}T12:00:00Z`).getUTCDay()).toBe(4);
  });
});
