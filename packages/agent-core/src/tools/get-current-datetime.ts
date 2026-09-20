import { tool } from 'langchain';
import { z } from 'zod';

export const datetimeFormats = [
  'iso8601',
  'utc',
  'rfc1123',
  'date',
  'time',
  'datetime',
  'unix',
  'unix_ms',
  'locale'
] as const;

export type DatetimeFormat = (typeof datetimeFormats)[number];

export type GetCurrentDatetimeInput = {
  format?: DatetimeFormat;
  locale?: string;
  timeZone?: string;
};

export type GetCurrentDatetimeResult = {
  format: DatetimeFormat;
  formatted: string;
  iso8601: string;
  offset: string;
  timeZone: string;
  unix: number;
  unixMs: number;
};

const datetimeFormatSchema = z.enum(datetimeFormats);

const getCurrentDatetimeSchema = z.object({
  format: datetimeFormatSchema
    .default('iso8601')
    .describe(
      'Output format. iso8601 includes the time-zone offset, utc is ISO-8601 in Zulu time, rfc1123 is an RFC 5322 datetime, date is YYYY-MM-DD, time is HH:mm:ss, datetime is YYYY-MM-DD HH:mm:ss, unix is seconds, unix_ms is milliseconds, and locale is a localized long datetime.'
    ),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'IANA time zone such as Asia/Shanghai, UTC, or America/New_York. Defaults to the runtime local time zone.'
    ),
  locale: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('BCP 47 locale used when format is locale, such as zh-CN or en-US.')
});

const pad = (value: string, length = 2) => value.padStart(length, '0');

const readPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes, fallback = '') => {
  return parts.find((part) => part.type === type)?.value ?? fallback;
};

const resolveTimeZone = (timeZone: string | undefined) => {
  return timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const assertTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`Unknown time zone: ${timeZone}. Use an IANA time zone such as Asia/Shanghai or UTC.`);
  }
};

const assertLocale = (locale: string) => {
  try {
    new Intl.DateTimeFormat(locale).format(new Date(0));
  } catch {
    throw new Error(`Unknown locale: ${locale}. Use a BCP 47 tag such as zh-CN or en-US.`);
  }
};

const normalizeUtcOffset = (timeZoneName: string) => {
  const match = /(?:GMT|UTC)?([+-])(\d{1,2})(?::?(\d{2}))?/.exec(timeZoneName);

  if (!match?.[1] || !match[2]) {
    return '+00:00';
  }

  return `${match[1]}${pad(match[2])}:${pad(match[3] ?? '00')}`;
};

const readUtcOffset = (now: Date, timeZone: string) => {
  const readName = (timeZoneName: 'longOffset' | 'shortOffset') => {
    return readPart(new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName }).formatToParts(now), 'timeZoneName');
  };

  return normalizeUtcOffset(readName('longOffset') || readName('shortOffset') || 'GMT');
};

const readZonedParts = (now: Date, timeZone: string) => {
  const numericParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hourCycle: 'h23'
  }).formatToParts(now);
  const namedParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    hourCycle: 'h23'
  }).formatToParts(now);
  const hourValue = readPart(numericParts, 'hour', '00');

  return {
    year: readPart(numericParts, 'year'),
    month: pad(readPart(numericParts, 'month')),
    day: pad(readPart(numericParts, 'day')),
    hour: pad(hourValue === '24' ? '00' : hourValue),
    minute: pad(readPart(numericParts, 'minute')),
    second: pad(readPart(numericParts, 'second')),
    fractionalSecond: pad(readPart(numericParts, 'fractionalSecond', '000'), 3),
    weekday: readPart(namedParts, 'weekday'),
    monthName: readPart(namedParts, 'month')
  };
};

const formatZonedValue = (
  now: Date,
  format: DatetimeFormat,
  timeZone: string,
  offset: string,
  locale: string | undefined
) => {
  const parts = readZonedParts(now, timeZone);
  const iso8601 = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}${offset}`;

  switch (format) {
    case 'iso8601': {
      return iso8601;
    }
    case 'utc': {
      return now.toISOString();
    }
    case 'rfc1123': {
      return `${parts.weekday}, ${parts.day} ${parts.monthName} ${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ${offset.replace(':', '')}`;
    }
    case 'date': {
      return `${parts.year}-${parts.month}-${parts.day}`;
    }
    case 'time': {
      return `${parts.hour}:${parts.minute}:${parts.second}`;
    }
    case 'datetime': {
      return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }
    case 'unix': {
      return String(Math.floor(now.getTime() / 1000));
    }
    case 'unix_ms': {
      return String(now.getTime());
    }
    case 'locale': {
      if (locale) {
        assertLocale(locale);
      }

      return new Intl.DateTimeFormat(locale, {
        timeZone,
        dateStyle: 'full',
        timeStyle: 'long'
      }).format(now);
    }
  }
};

export const formatCurrentDatetime = (
  input: GetCurrentDatetimeInput = {},
  now = new Date()
): GetCurrentDatetimeResult => {
  const format = input.format ?? 'iso8601';
  const timeZone = resolveTimeZone(input.timeZone);

  assertTimeZone(timeZone);

  const offset = readUtcOffset(now, timeZone);
  const parts = readZonedParts(now, timeZone);
  const iso8601 = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}${offset}`;

  return {
    format,
    formatted: formatZonedValue(now, format, timeZone, offset, input.locale),
    iso8601,
    offset,
    timeZone,
    unix: Math.floor(now.getTime() / 1000),
    unixMs: now.getTime()
  };
};

export const getCurrentDatetime = tool((input: GetCurrentDatetimeInput) => formatCurrentDatetime(input), {
  name: 'get_current_datetime',
  description:
    'Get the current date and time in a chosen format and IANA time zone. Use this instead of guessing the current time.',
  schema: getCurrentDatetimeSchema
});
