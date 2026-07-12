import type { AppLanguage } from "./language";

/** Swedish civil time for saved-mix day boundaries — independent of UI language. */
export const APP_TIME_ZONE = "Europe/Stockholm";

export function appIntlLocale(language: AppLanguage): string {
  return language === "sv" ? "sv-SE" : "en-GB";
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function zonedParts(date: Date, timeZone: string = APP_TIME_ZONE): ZonedParts {
  const values: Record<string, string> = {};
  for (const part of zonedPartsFormatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function zonedCalendarDayDiff(
  later: Date,
  earlier: Date,
  timeZone: string = APP_TIME_ZONE,
): number {
  const a = zonedParts(earlier, timeZone);
  const b = zonedParts(later, timeZone);
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86_400_000);
}

export function zonedSameMonth(
  a: Date,
  b: Date,
  timeZone: string = APP_TIME_ZONE,
): boolean {
  const pa = zonedParts(a, timeZone);
  const pb = zonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month;
}

export function formatZonedDate(
  date: Date,
  language: AppLanguage,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(appIntlLocale(language), {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(date);
}
