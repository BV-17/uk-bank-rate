// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { rateOn } from './reading.js';
import { isDecisionAnnounced, isDecisionReflected } from './schedule.js';

// ─── Validation ─────────────────────────────────────────────────────────────

describe('dates that are not ISO', () => {
  const history = { changes: [{ date: '2025-12-18', rate: 3.75 }], observedTo: '2026-09-25' };

  it('are refused by rateOn rather than compared as text', () => {
    expect(() => rateOn(history, '2026-9-17')).toThrow(TypeError);
  });

  it('are refused by the decision checks rather than compared as text', () => {
    expect(() => isDecisionAnnounced('2026-9-17')).toThrow(TypeError);
    expect(() => isDecisionReflected('2026-09-17', '2026-9-16')).toThrow(TypeError);
  });
});
