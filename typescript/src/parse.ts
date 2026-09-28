// ─── Local Application Imports ──────────────────────────────────────────────

import { isRealDate } from './dates.js';

import type { BankRateObservation } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTH_NUMBERS: Readonly<Record<string, string>> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const SERIES_DATE = /^(\d{1,2})[\s-]+([A-Za-z]{3})[\s-]+(\d{4}|\d{2})$/;

const RATE_VALUE = /^-?\d+(?:\.\d+)?$/;

const BYTE_ORDER_MARK = /^﻿/;

// ─── Dates ──────────────────────────────────────────────────────────────────

const fullYear = (digits: string): number => {
  const year = Number(digits);
  if (digits.length === 4) return year;
  return year >= 50 ? 1900 + year : 2000 + year;
};

export const isoFromSeriesDate = (raw: string): string | null => {
  const match = SERIES_DATE.exec(raw.trim());
  if (!match) return null;
  const [, dayDigits = '', monthName = '', yearDigits = ''] = match;
  const month = MONTH_NUMBERS[monthName.toLowerCase()];
  if (!month) return null;
  const year = fullYear(yearDigits);
  const day = Number(dayDigits);
  if (!isRealDate(year, Number(month), day)) return null;
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
};

// ─── CSV ────────────────────────────────────────────────────────────────────

const observationFrom = (line: string): BankRateObservation | null => {
  const [dateField = '', rateField = ''] = line.split(/[\t,]/);
  const date = isoFromSeriesDate(dateField);
  const rateText = rateField.trim();
  if (date === null || !RATE_VALUE.test(rateText)) return null;
  return { date, rate: Number(rateText) };
};

export const parseBankRateCsv = (csv: string): BankRateObservation[] => {
  const observations: BankRateObservation[] = [];
  for (const line of csv.replace(BYTE_ORDER_MARK, '').split(/\r?\n/)) {
    const observation = observationFrom(line.trim());
    if (observation) observations.push(observation);
  }
  return observations.sort((left, right) => left.date.localeCompare(right.date));
};
