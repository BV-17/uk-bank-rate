// ─── Local Application Imports ──────────────────────────────────────────────

import { SCHEDULED_DECISIONS } from './generated.js';

// ─── London Clock ───────────────────────────────────────────────────────────

interface LondonClock {
  date: string;
  minuteOfDay: number;
}

const ANNOUNCEMENT_MINUTE_OF_DAY = 12 * 60;

const LONDON_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const readLondonClock = (now: Date): LondonClock => {
  const parts = LONDON_FORMAT.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minuteOfDay: Number(part('hour')) * 60 + Number(part('minute')),
  };
};

export const londonDate = (now: Date = new Date()): string => readLondonClock(now).date;

// ─── Announcements ──────────────────────────────────────────────────────────

export const isDecisionAnnounced = (decisionDate: string, now: Date = new Date()): boolean => {
  const { date, minuteOfDay } = readLondonClock(now);
  return date > decisionDate || (date === decisionDate && minuteOfDay >= ANNOUNCEMENT_MINUTE_OF_DAY);
};

export const isDecisionReflected = (decisionDate: string, observedTo: string, now: Date = new Date()): boolean =>
  observedTo >= decisionDate && isDecisionAnnounced(decisionDate, now);

export const nextScheduledDecision = (now: Date = new Date()): string | null =>
  SCHEDULED_DECISIONS.find((decisionDate) => !isDecisionAnnounced(decisionDate, now)) ?? null;
