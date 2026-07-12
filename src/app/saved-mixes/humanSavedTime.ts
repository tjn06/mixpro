import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameMonth,
} from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { sv } from "date-fns/locale/sv";
import type { AppLanguage } from "../i18n/language";
import { APP_LANGUAGE } from "../i18n/language";

type DayPartKey =
  | "earlyMorning"
  | "morning"
  | "beforeLunch"
  | "afternoon"
  | "evening"
  | "lateEvening"
  | "night";

type YesterdayKey = "morning" | "beforeLunch" | "afternoon" | "evening" | "night";

const SAVED_TIME_COPY = {
  sv: {
    prefix: "Sparad",
    justNow: "precis nu",
    momentsAgo: "nyss",
    minutesAgo: (minutes: number) => `för ${minutes} min sen`,
    sameDay: (part: string, time: string) => `${part} · ${time}`,
    yesterday: (part: string, time: string) => `${part} · ${time}`,
    weekday: (weekday: string, part: string, time: string) =>
      `i ${weekday} ${part} · ${time}`,
    dateWithTime: (date: string, time: string) => `${date} · ${time}`,
    dayParts: {
      earlyMorning: "tidigt i morse",
      morning: "i morse",
      beforeLunch: "innan lunch",
      afternoon: "i eftermiddags",
      evening: "ikväll",
      lateEvening: "sent ikväll",
      night: "i natt",
    },
    yesterdayParts: {
      morning: "igår morse",
      beforeLunch: "igår innan lunch",
      afternoon: "igår eftermiddag",
      evening: "igår kväll",
      night: "igår natt",
    },
  },
  en: {
    prefix: "Saved",
    justNow: "just now",
    momentsAgo: "a moment ago",
    minutesAgo: (minutes: number) => `${minutes} min ago`,
    sameDay: (part: string, time: string) => `${part} · ${time}`,
    yesterday: (part: string, time: string) => `${part} · ${time}`,
    weekday: (weekday: string, part: string, time: string) =>
      `on ${weekday} ${part} · ${time}`,
    dateWithTime: (date: string, time: string) => `${date} · ${time}`,
    dayParts: {
      earlyMorning: "early this morning",
      morning: "this morning",
      beforeLunch: "before lunch",
      afternoon: "this afternoon",
      evening: "this evening",
      lateEvening: "late this evening",
      night: "tonight",
    },
    yesterdayParts: {
      morning: "yesterday morning",
      beforeLunch: "yesterday before lunch",
      afternoon: "yesterday afternoon",
      evening: "yesterday evening",
      night: "last night",
    },
  },
} as const;

const DATE_FNS_LOCALE = {
  sv,
  en: enGB,
} as const;

function dateFnsLocale(language: AppLanguage) {
  return DATE_FNS_LOCALE[language];
}

function formatExactTime(date: Date, language: AppLanguage): string {
  return format(date, "HH:mm", { locale: dateFnsLocale(language) });
}

function formatExactDate(date: Date, language: AppLanguage): string {
  return format(date, "d MMMM yyyy", { locale: dateFnsLocale(language) });
}

function formatExactDateWithoutYear(date: Date, language: AppLanguage): string {
  return format(date, "d MMMM", { locale: dateFnsLocale(language) });
}

function getDayPartKey(date: Date): DayPartKey {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const time = hour + minute / 60;

  if (time >= 5 && time < 8) return "earlyMorning";
  if (time >= 8 && time < 11) return "morning";
  if (time >= 11 && time < 13) return "beforeLunch";
  if (time >= 13 && time < 17) return "afternoon";
  if (time >= 17 && time < 21) return "evening";
  if (time >= 21 && time < 24) return "lateEvening";
  return "night";
}

function getYesterdayKey(date: Date): YesterdayKey {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 13) return "beforeLunch";
  if (hour >= 13 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function weekdayLabel(date: Date, language: AppLanguage): string {
  const name = format(date, "EEEE", { locale: dateFnsLocale(language) });
  if (language === "sv") {
    const lower = name.toLowerCase();
    return lower.endsWith("dag") ? `${lower}s` : lower;
  }
  return name;
}

function dayPartLabel(date: Date, language: AppLanguage): string {
  return SAVED_TIME_COPY[language].dayParts[getDayPartKey(date)];
}

function yesterdayPartLabel(date: Date, language: AppLanguage): string {
  return SAVED_TIME_COPY[language].yesterdayParts[getYesterdayKey(date)];
}

export type HumanSavedTime = {
  /** Relative phrase without "Saved" — omitted when only timestamp should show. */
  comment: string | null;
  /** Compact date · time; year omitted in the current month. */
  timestamp: string;
  /** Full card/search line. */
  primary: string;
  exactTime: string;
  exactDate: string;
};

function formatCardTimestamp(
  savedAt: Date,
  now: Date,
  language: AppLanguage,
): string {
  const exactTime = formatExactTime(savedAt, language);
  const dateLabel = isSameMonth(savedAt, now)
    ? formatExactDateWithoutYear(savedAt, language)
    : formatExactDate(savedAt, language);
  return `${dateLabel} · ${exactTime}`;
}

function formatCardComment(
  savedAt: Date,
  now: Date,
  language: AppLanguage,
): string | null {
  const copy = SAVED_TIME_COPY[language];
  const minutesAgo = differenceInMinutes(now, savedAt);
  const daysAgo = differenceInCalendarDays(now, savedAt);

  if (daysAgo >= 7) return null;

  if (minutesAgo < 1) return copy.justNow;
  if (minutesAgo < 10) return copy.momentsAgo;
  if (minutesAgo < 60) return copy.minutesAgo(minutesAgo);
  if (daysAgo === 0) return dayPartLabel(savedAt, language);
  if (daysAgo === 1) return yesterdayPartLabel(savedAt, language);
  if (daysAgo < 7) {
    return `${weekdayLabel(savedAt, language)} ${dayPartLabel(savedAt, language)}`;
  }

  return null;
}

function joinCardLine(comment: string | null, timestamp: string): string {
  return comment ? `${comment} · ${timestamp}` : timestamp;
}

function capitalizeFirst(text: string, language: AppLanguage): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const locale = language === "sv" ? "sv-SE" : "en-GB";
  return trimmed.charAt(0).toLocaleUpperCase(locale) + trimmed.slice(1);
}

/**
 * Human-first saved timestamp. Uses the device local timezone via Date.
 * Store `savedAt` as ISO UTC; pass parsed Date instances here.
 */
export function getHumanSavedTime(
  savedAt: Date,
  now: Date = new Date(),
  language: AppLanguage = APP_LANGUAGE,
): HumanSavedTime {
  const exactTime = formatExactTime(savedAt, language);
  const exactDate = formatExactDate(savedAt, language);
  const timestamp = formatCardTimestamp(savedAt, now, language);
  const rawComment = formatCardComment(savedAt, now, language);
  const comment = rawComment ? capitalizeFirst(rawComment, language) : null;

  return {
    comment,
    timestamp,
    primary: joinCardLine(comment, timestamp),
    exactTime,
    exactDate,
  };
}

function collectStaticSavedTimePhrases(): string[] {
  const phrases: string[] = [];
  for (const language of ["en", "sv"] as const) {
    const copy = SAVED_TIME_COPY[language];
    phrases.push(copy.justNow, copy.momentsAgo);
    phrases.push(...Object.values(copy.dayParts));
    phrases.push(...Object.values(copy.yesterdayParts));
  }
  return phrases;
}

/** Lowercase blob for saved-mix list search (phrases + formatted dates in en/sv). */
export function getSavedMixTimeSearchText(
  savedAt: Date,
  now: Date = new Date(),
): string {
  const chunks: string[] = [...collectStaticSavedTimePhrases()];

  for (const language of ["en", "sv"] as const) {
    const copy = SAVED_TIME_COPY[language];
    const { comment, timestamp, primary, exactDate, exactTime } = getHumanSavedTime(
      savedAt,
      now,
      language,
    );
    chunks.push(
      copy.justNow,
      copy.momentsAgo,
      primary,
      comment ?? "",
      timestamp,
      exactDate,
      exactTime,
    );
    chunks.push(format(savedAt, "EEEE", { locale: dateFnsLocale(language) }));
    chunks.push(format(savedAt, "MMMM", { locale: dateFnsLocale(language) }));
    chunks.push(format(savedAt, "d MMMM", { locale: dateFnsLocale(language) }));
    chunks.push(format(savedAt, "d MMMM yyyy", { locale: dateFnsLocale(language) }));
    if (language === "sv") {
      chunks.push(weekdayLabel(savedAt, language));
    }
  }

  return chunks.join(" ").toLowerCase();
}
