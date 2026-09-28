// ─── Third-Party Libraries ──────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// ─── Local Application Imports ──────────────────────────────────────────────

import { fetchBankRateObservations, seriesUrl } from './source.js';

// ─── Fakes ──────────────────────────────────────────────────────────────────

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

// ─── Request ────────────────────────────────────────────────────────────────

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
});

// ─── Answers ────────────────────────────────────────────────────────────────

describe('fetchBankRateObservations', () => {
  it('reads a CSV answer', async () => {
    const fetch = answering('DATE,IUDBEDR\n24 Sep 2026,3.75\n25 Sep 2026,3.75\n');
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).resolves.toEqual([
      { date: '2026-09-24', rate: 3.75 },
      { date: '2026-09-25', rate: 3.75 },
    ]);
  });

  it('returns nothing for a range with no observations, as a weekend is', async () => {
    await expect(fetchBankRateObservations('2026-09-26', '2026-09-27', { fetch: answering('DATE,IUDBEDR\n') })).resolves.toEqual([]);
  });

  it('treats the redirect to the error page as a failure, keeping its status', async () => {
    const fetch = answering('<body><h1>Object Moved</h1></body>', 302);
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toMatchObject({
      name: 'BankRateSourceError',
      failure: 'http',
      status: 302,
    });
  });

  it('names the firewall when it refuses the request', async () => {
    const fetch = answering('<TITLE>Access Denied</TITLE>', 403);
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toThrow(/firewall/);
  });

  it('refuses a web page served as a success', async () => {
    const fetch = answering('<!DOCTYPE html><html><body>Maintenance</body></html>');
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch })).rejects.toMatchObject({ failure: 'not_csv' });
  });

  it('refuses an empty body', async () => {
    await expect(fetchBankRateObservations('2026-09-24', '2026-09-25', { fetch: answering('') })).rejects.toMatchObject({ failure: 'empty' });
  });
});

// ─── Failures on the Way ────────────────────────────────────────────────────

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
    expect(new Headers(seen?.headers).get('user-agent')).toMatch(/^uk-bank-rate /);
  });
});
