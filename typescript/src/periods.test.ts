// ─── Third-Party Libraries ─────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ─────────────────────────────────────────────

import { bundledHistory } from './generated.js';
import { ratesBetween } from './periods.js';

// ─── Refusals ──────────────────────────────────────────────────────────────

describe('ratesBetween', () => {
  it('refuses a span that ends before it starts', () => {
    expect(() => ratesBetween(bundledHistory, '2026-09-28', '2026-09-01')).toThrow(RangeError);
  });

  it('refuses dates that are not ISO rather than comparing them as text', () => {
    expect(() => ratesBetween(bundledHistory, '2026-9-1', '2026-09-28')).toThrow(TypeError);
    expect(() => ratesBetween(bundledHistory, '2026-09-01', '2026-02-30')).toThrow(TypeError);
  });

  it('covers every day of the span exactly once', () => {
    const span = ratesBetween(bundledHistory, '1975-01-02', bundledHistory.observedTo);
    const days = span?.periods.reduce((total, period) => total + period.days, 0);
    const expected = (Date.parse(`${bundledHistory.observedTo}T00:00:00Z`) - Date.parse('1975-01-02T00:00:00Z')) / 86_400_000 + 1;
    expect(days).toBe(expected);
    expect(span?.periods).toHaveLength(bundledHistory.changes.length);
  });
});
