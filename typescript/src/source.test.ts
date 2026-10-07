// ─── Third-Party Libraries ─────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ─────────────────────────────────────────────

import { USER_AGENT } from './generated.js';
import { fetchBankRateObservations, seriesUrl } from './source.js';

// ─── Fakes ─────────────────────────────────────────────────────────────────

const answering = (body: string, status = 200): typeof globalThis.fetch =>
  async () => new Response(body, { status, headers: { 'content-type': 'application/csv' } });

const hanging: typeof globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
  const signal = init?.signal;
  if (signal?.aborted) {
    reject(signal.reason);
    return;
  }
  signal?.addEventListener('abort', () => reject(signal.reason));
});

// ─── Request ───────────────────────────────────────────────────────────────

describe('seriesUrl', () => {
  it('asks the Database for the Bank Rate series in its own date form', () => {
    const url = new URL(seriesUrl('2026-09-01', '2026-09-28'));
    expect(`${url.origin}${url.pathname}`).toBe('https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp');
    expect(url.searchParams.get('SeriesCodes')).toBe('IUDBEDR');
    expect(url.searchParams.get('Datefrom')).toBe('01/Sep/2026');
    expect(url.searchParams.get('Dateto')).toBe('28/Sep/2026');
    expect(url.searchParams.get('csv.x')).toBe('yes');
  });

  it('starts no earlier than the series itself, since an earlier date draws an error page', () => {
    expect(new URL(seriesUrl('1900-01-01', '1975-12-31')).searchParams.get('Datefrom')).toBe('02/Jan/1975');
  });

  it('refuses a date that is not ISO, and a range that runs backwards', () => {
    expect(() => seriesUrl('28/09/2026', '2026-09-28')).toThrow(TypeError);
    expect(() => seriesUrl('2026-02-30', '2026-09-28')).toThrow(TypeError);
    expect(() => seriesUrl('2026-09-28', '2026-09-01')).toThrow(RangeError);
  });

  it('says when a range ends before the series begins', () => {
    expect(() => seriesUrl('1970-01-01', '1974-12-31')).toThrow('end (1974-12-31) falls before the series starts on 1975-01-02');
  });
});

// ─── Before Asking ─────────────────────────────────────────────────────────

describe('fetchBankRateObservations before it asks', () => {
  const recording = () => {
    const requests: string[] = [];
    const fetch: typeof globalThis.fetch = async (input) => {
      requests.push(String(input));
      return new Response('DATE,IUDBEDR\n');
    };
    return { fetch, requests };
  };

  it('asks nothing for a range that starts after today, which the Bank answers with its error page', async () => {
    const { fetch, requests } = recording();
    const now = new Date('2026-09-29T09:00:00Z');
    await expect(fetchBankRateObservations('2026-10-01', '2026-10-31', { fetch, now })).resolves.toEqual([]);
    expect(requests).toHaveLength(0);
  });

  it('still asks for a range that starts today in London', async () => {
    const { fetch, requests } = recording();
    await fetchBankRateObservations('2026-09-30', '2026-09-30', { fetch, now: new Date('2026-09-29T23:30:00Z') });
    expect(requests).toHaveLength(1);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('refuses a timeout of %s ms', async (timeoutMs) => {
    const { fetch, requests } = recording();
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch, timeoutMs })).rejects.toThrow(RangeError);
    expect(requests).toHaveLength(0);
  });
});

// ─── Answers ───────────────────────────────────────────────────────────────

describe('what a refusal says', () => {
  it('names itself as a BankRateSourceError', async () => {
    const fetch = answering('<body><h1>Object Moved</h1></body>', 302);
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toMatchObject({ name: 'BankRateSourceError' });
  });

  it('reads the status 0 of an opaque redirect as a redirect', async () => {
    const opaque: typeof globalThis.fetch = async () => Object.defineProperty(new Response(''), 'status', { value: 0 });
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: opaque })).rejects.toThrow(/error page/);
  });

  it('names the firewall when it refuses the request', async () => {
    const fetch = answering('<TITLE>Access Denied</TITLE>', 403);
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toThrow(/firewall/);
  });

  it('says when an answer is not the series at all', async () => {
    const fetch = answering('Service temporarily unavailable');
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toThrow(/something other than the IUDBEDR series/);
  });

  it('says when its rows cannot be read, since the format may have changed', async () => {
    const fetch = answering('DATE,IUDBEDR\n2026-09-24,3.75\n');
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toThrow(/cannot read/);
  });
});

// ─── Failures on the Way ───────────────────────────────────────────────────

describe('fetchBankRateObservations on a bad connection', () => {
  it('reports a timeout as its own failure', async () => {
    const attempt = fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: hanging, timeoutMs: 20 });
    await expect(attempt).rejects.toMatchObject({ failure: 'timeout' });
  });

  it('reports a network error as its own failure, keeping the cause', async () => {
    const cause = new TypeError('fetch failed');
    const offline: typeof globalThis.fetch = async () => {
      throw cause;
    };
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: offline })).rejects.toMatchObject({ failure: 'network', cause });
  });

  it('passes the caller\'s own abort straight through', async () => {
    const controller = new AbortController();
    controller.abort(new Error('caller stopped'));
    const attempt = fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: hanging, signal: controller.signal });
    await expect(attempt).rejects.toThrow('caller stopped');
  });

  it('asks without following redirects, and names itself', async () => {
    let seen: RequestInit | undefined;
    const recording: typeof globalThis.fetch = async (_input, init) => {
      seen = init;
      return new Response('DATE,IUDBEDR\n');
    };
    await fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: recording });
    expect(seen?.redirect).toBe('manual');
    expect(new Headers(seen?.headers).get('user-agent')).toBe(USER_AGENT);
    expect(USER_AGENT).toMatch(/^uk-bank-rate /);
  });
});
