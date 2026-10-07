// ─── Validation ────────────────────────────────────────────────────────────

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isRealDate = (year: number, month: number, day: number): boolean => {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
};

export const assertIsoDate = (value: string, name: string): void => {
  const match = ISO_DATE.exec(value);
  if (!match || !isRealDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
    throw new TypeError(`${name} must be an ISO date (YYYY-MM-DD), received "${value}"`);
  }
};

// ─── Arithmetic ────────────────────────────────────────────────────────────

export const shiftIsoDate = (isoDate: string, days: number): string => {
  const shifted = new Date(`${isoDate}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

export const daysBetween = (start: string, end: string): number =>
  Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
