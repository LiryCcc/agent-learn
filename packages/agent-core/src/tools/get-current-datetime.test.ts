import { describe, expect, it } from 'vitest';
import { formatCurrentDatetime, getCurrentDatetime } from './get-current-datetime.js';

const now = new Date('2026-09-20T14:54:32.123Z');
const unixMs = now.getTime();
const unix = Math.floor(unixMs / 1000);

describe('get current datetime', () => {
  it('formats an ISO 8601 datetime with the requested time zone offset', () => {
    expect(formatCurrentDatetime({ format: 'iso8601', timeZone: 'Asia/Shanghai' }, now)).toEqual({
      format: 'iso8601',
      formatted: '2026-09-20T22:54:32.123+08:00',
      iso8601: '2026-09-20T22:54:32.123+08:00',
      offset: '+08:00',
      timeZone: 'Asia/Shanghai',
      unix,
      unixMs
    });
  });

  it('formats UTC, calendar, clock, and unix values', () => {
    expect(formatCurrentDatetime({ format: 'utc', timeZone: 'Asia/Shanghai' }, now).formatted).toBe(
      '2026-09-20T14:54:32.123Z'
    );
    expect(formatCurrentDatetime({ format: 'date', timeZone: 'Pacific/Auckland' }, now).formatted).toBe('2026-09-21');
    expect(formatCurrentDatetime({ format: 'time', timeZone: 'America/New_York' }, now).formatted).toBe('10:54:32');
    expect(formatCurrentDatetime({ format: 'datetime', timeZone: 'UTC' }, now).formatted).toBe('2026-09-20 14:54:32');
    expect(formatCurrentDatetime({ format: 'unix', timeZone: 'UTC' }, now).formatted).toBe(String(unix));
    expect(formatCurrentDatetime({ format: 'unix_ms', timeZone: 'UTC' }, now).formatted).toBe(String(unixMs));
  });

  it('formats an RFC 5322 datetime in the requested time zone', () => {
    expect(formatCurrentDatetime({ format: 'rfc1123', timeZone: 'Asia/Shanghai' }, now).formatted).toBe(
      'Sun, 20 Sep 2026 22:54:32 +0800'
    );
  });

  it('formats a localized datetime that includes the time zone', () => {
    const result = formatCurrentDatetime({ format: 'locale', locale: 'en-US', timeZone: 'UTC' }, now);

    expect(result.formatted).toContain('September');
    expect(result.formatted).toContain('2026');
    expect(result.formatted).toMatch(/UTC|GMT/i);
  });

  it('rejects unknown time zones', () => {
    expect(() => formatCurrentDatetime({ timeZone: 'Not/AZone' }, now)).toThrow(
      'Unknown time zone: Not/AZone. Use an IANA time zone such as Asia/Shanghai or UTC.'
    );
  });

  it('exposes a provider-compatible tool name and returns structured output', async () => {
    const result = await getCurrentDatetime.invoke({ format: 'iso8601', timeZone: 'UTC' });

    expect(getCurrentDatetime.name).toBe('get_current_datetime');
    expect(result).toEqual(
      expect.objectContaining({
        format: 'iso8601',
        offset: '+00:00',
        timeZone: 'UTC'
      })
    );
  });
});
