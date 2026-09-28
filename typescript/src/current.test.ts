// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { getBankRate } from './current.js';
import { bundledHistory } from './generated.js';

import type { BankRateHistory } from './types.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const history: BankRateHistory = {
  changes: [{ date: '2025-08-07', rate: 4 }, { date: '2025-12-18', rate: 3.75 }],
  observedTo: '2026-09-11',
};

const serving = (csv: string) => {
  const requests: string[] = [];
  const fetch: typeof globalThis.fetch = async (input) => {
    requests.push(String(input));
    return new Response(csv);
  };
  return { fetch, requests };
};

// ─── Current Rate ───────────────────────────────────────────────────────────

describe('getBankRate', () => {
  it('fetches only the days after its history, with a week of overlap', async () => {
    const { fetch, requests } = serving('DATE,IUDBEDR\n25 Sep 2026,3.75\n');
    await getBankRate({ history, fetch, now: new Date('2026-09-28T09:00:00Z') });
    const url = new URL(requests[0] ?? '');
    expect(url.searchParams.get('Datefrom')).toBe('04/Sep/2026');
    expect(url.searchParams.get('Dateto')).toBe('28/Sep/2026');
  });

  it('reports the rate with the day it took effect, the last day observed and the next decision', async () => {
    const { fetch } = serving('DATE,IUDBEDR\n24 Sep 2026,3.75\n25 Sep 2026,3.75\n');
    await expect(getBankRate({ history, fetch, now: new Date('2026-09-28T09:00:00Z') })).resolves.toEqual({
      rate: 3.75,
      effectiveFrom: '2025-12-18',
      observedTo: '2026-09-25',
      pendingDecision: null,
      beyondSchedule: false,
      asOf: '2026-09-28',
      nextDecision: '2026-11-05',
    });
  });

  it('picks up a change the series carries that its history did not', async () => {
    const { fetch } = serving('DATE,IUDBEDR\n04 Nov 2026,3.75\n05 Nov 2026,3.5\n06 Nov 2026,3.5\n');
    const current = await getBankRate({
      history: { ...history, observedTo: '2026-11-02' },
      fetch,
      now: new Date('2026-11-09T09:00:00Z'),
    });
    expect(current).toMatchObject({ rate: 3.5, effectiveFrom: '2026-11-05', pendingDecision: null, nextDecision: '2026-12-17' });
  });

  it('flags a decision announced this afternoon that the series has not caught up with', async () => {
    const { fetch } = serving('DATE,IUDBEDR\n16 Sep 2026,3.75\n');
    const current = await getBankRate({ history, fetch, now: new Date('2026-09-17T12:40:00Z') });
    expect(current).toMatchObject({
      rate: 3.75,
      observedTo: '2026-09-16',
      pendingDecision: { date: '2026-09-17', announced: true },
      nextDecision: '2026-11-05',
    });
  });

  it('starts from the bundled history when given none', async () => {
    const { fetch, requests } = serving('DATE,IUDBEDR\n');
    const current = await getBankRate({ fetch, now: new Date('2026-09-28T09:00:00Z') });
    expect(current.observedTo).toBe(bundledHistory.observedTo);
    expect(requests).toHaveLength(1);
  });

  it('refuses to invent a rate when nothing is known for today', async () => {
    const future: BankRateHistory = { changes: [{ date: '2030-01-02', rate: 2 }], observedTo: '2030-01-03' };
    const { fetch, requests } = serving('DATE,IUDBEDR\n');
    await expect(getBankRate({ history: future, fetch, now: new Date('2026-09-28T09:00:00Z') })).rejects.toThrow(RangeError);
    expect(requests).toHaveLength(0);
  });
});
