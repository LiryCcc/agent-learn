import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportObservabilityLogs } from './observability-log.js';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('observability log export', () => {
  it('downloads jsonl and text files with the matching extension', async () => {
    const blobs: Blob[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return `blob:${String(blobs.length)}`;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const jsonlResult = exportObservabilityLogs('jsonl');
    const textResult = exportObservabilityLogs('text');

    expect(jsonlResult.fileName).toMatch(/\.jsonl$/);
    expect(textResult.fileName).toMatch(/\.log$/);
    expect(jsonlResult.format).toBe('jsonl');
    expect(textResult.format).toBe('text');
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(blobs[0]?.type).toBe('application/jsonl;charset=utf-8');
    expect(blobs[1]?.type).toBe('text/plain;charset=utf-8');

    const jsonlText = await blobs[0]?.text();
    const logText = await blobs[1]?.text();
    const firstJsonlRecord = JSON.parse(jsonlText?.split('\n')[0] ?? '{}') as { recordType?: string };

    expect(firstJsonlRecord.recordType).toBe('header');
    expect(logText?.startsWith('# Liry Agent observability logs\n')).toBe(true);
  });
});
