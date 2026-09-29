// ─── Local Application Imports ──────────────────────────────────────────────

import { assertIsoDate } from './dates.js';
import { SERIES_CODE, SERIES_ENDPOINT, SERIES_STARTS_ON, USER_AGENT } from './generated.js';
import { columnsOf, readSeriesTable } from './parse.js';

import type { SeriesTable } from './parse.js';
import type { BankRateObservation, FetchOptions, SourceFailure } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// ─── Errors ─────────────────────────────────────────────────────────────────

export class BankRateSourceError extends Error {
  readonly failure: SourceFailure;
  readonly status: number | null;

  constructor(failure: SourceFailure, message: string, status: number | null = null, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'BankRateSourceError';
    this.failure = failure;
    this.status = status;
  }
}

// ─── Request ────────────────────────────────────────────────────────────────

const seriesDateParameter = (isoDate: string): string => {
  const [year = '', month = '', day = ''] = isoDate.split('-');
  return `${day}/${MONTH_ABBREVIATIONS[Number(month) - 1] ?? ''}/${year}`;
};

export const seriesUrl = (start: string, end: string): string => {
  assertIsoDate(start, 'start');
  assertIsoDate(end, 'end');
  const firstDay = start < SERIES_STARTS_ON ? SERIES_STARTS_ON : start;
  if (end < firstDay) throw new RangeError(`end (${end}) falls before start (${firstDay})`);
  const parameters = new URLSearchParams({
    'csv.x': 'yes',
    Datefrom: seriesDateParameter(firstDay),
    Dateto: seriesDateParameter(end),
    SeriesCodes: SERIES_CODE,
    CSVF: 'TN',
    UsingCodes: 'Y',
    VPD: 'Y',
    VFD: 'N',
  });
  return `${SERIES_ENDPOINT}?${parameters.toString()}`;
};

// ─── Response ───────────────────────────────────────────────────────────────

const statusExplanation = (status: number): string => {
  if (status === 0 || (status >= 300 && status < 400)) return ', redirecting to its error page';
  if (status === 403) return ', its firewall refusing the request';
  return '';
};

const refusalOf = (table: SeriesTable): [SourceFailure, string] | null => {
  if (table.header === null) return ['empty', 'returned an empty response'];
  if (table.header.startsWith('<')) return ['not_csv', 'returned a web page instead of CSV'];
  if (!columnsOf(table.header).includes(SERIES_CODE)) return ['not_csv', `returned something other than the ${SERIES_CODE} series`];
  if (table.rows > 0 && table.observations.length === 0) {
    return ['not_csv', 'returned rows this package cannot read, so its format may have changed'];
  }
  return null;
};

const readSeriesBody = (status: number, body: string): BankRateObservation[] => {
  if (status !== 200) {
    const message = `The Bank of England Database answered HTTP ${status}${statusExplanation(status)}`;
    throw new BankRateSourceError('http', message, status);
  }
  const table = readSeriesTable(body);
  const refused = refusalOf(table);
  if (refused) throw new BankRateSourceError(refused[0], `The Bank of England Database ${refused[1]}`, status);
  return table.observations;
};

// ─── Fetch ──────────────────────────────────────────────────────────────────

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const fetchBankRateObservations = async (
  start: string,
  end: string,
  options: FetchOptions = {},
): Promise<BankRateObservation[]> => {
  const url = seriesUrl(start, end);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const request = options.fetch ?? globalThis.fetch;
  let status: number;
  let body: string;
  try {
    const headers = { accept: 'text/csv, application/csv', 'user-agent': USER_AGENT };
    const response = await request(url, { redirect: 'manual', signal, headers });
    status = response.status;
    body = await response.text();
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new BankRateSourceError('timeout', `The Bank of England Database did not answer within ${timeoutMs} ms`, null, error);
    }
    throw new BankRateSourceError('network', `Could not reach the Bank of England Database: ${messageOf(error)}`, null, error);
  }
  return readSeriesBody(status, body);
};
