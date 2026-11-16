// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRecordTime, BOUNCE_CYCLES_OPTIONS, saveOrShareWav } from '../../src/ui/RecordSheet';

describe('formatRecordTime', () => {
  it('formats seconds into MM:SS format', () => {
    expect(formatRecordTime(0)).toBe('00:00');
    expect(formatRecordTime(65)).toBe('01:05');
    expect(formatRecordTime(360)).toBe('06:00');
  });

  it('handles fractional seconds and negative numbers cleanly', () => {
    expect(formatRecordTime(12.8)).toBe('00:12');
    expect(formatRecordTime(-5)).toBe('00:00');
    expect(formatRecordTime(3661)).toBe('61:01');
  });
});

describe('BOUNCE_CYCLES_OPTIONS', () => {
  it('provides required cycle preset options', () => {
    expect(BOUNCE_CYCLES_OPTIONS).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });
});

describe('saveOrShareWav', () => {
  let createdAnchor: any = null;
  let clickCalled = false;

  beforeEach(() => {
    clickCalled = false;
    createdAnchor = null;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = {
        href: '',
        download: '',
        click: vi.fn(() => {
          clickCalled = true;
        }),
      } as any;
      if (tag === 'a') {
        createdAnchor = el;
      }
      return el;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers browser download fallback when navigator.share is absent', async () => {
    const dummyBytes = new Uint8Array([1, 2, 3]);
    const dummyUrl = 'blob:http://localhost/test-uuid';

    await saveOrShareWav(dummyBytes, dummyUrl, 'test-output.wav');

    expect(createdAnchor).toBeDefined();
    expect(createdAnchor.href).toBe(dummyUrl);
    expect(createdAnchor.download).toBe('test-output.wav');
    expect(clickCalled).toBe(true);
  });
});
