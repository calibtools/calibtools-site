/**
 * PNG export tests.
 * These test the module's maths and API contract. The actual canvas rasterisation
 * requires a browser; we mock Image/canvas to verify dimensions and blob type.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PX_PER_MM } from './exportPng';

describe('PX_PER_MM constant', () => {
  it('equals 300/25.4', () => {
    expect(PX_PER_MM).toBeCloseTo(11.811, 2);
  });
});

describe('PNG pixel dimensions (unit test)', () => {
  it('A4 at 300 dpi → 2480 × 3508 px', () => {
    expect(Math.round(210 * PX_PER_MM)).toBe(2480);
    expect(Math.round(297 * PX_PER_MM)).toBe(3508);
  });

  it('A3 at 300 dpi → 3508 × 4961 px', () => {
    expect(Math.round(297 * PX_PER_MM)).toBe(3508);
    expect(Math.round(420 * PX_PER_MM)).toBe(4961);
  });

  it('Letter at 300 dpi → 2550 × 3300 px', () => {
    expect(Math.round(215.9 * PX_PER_MM)).toBe(2550);
    expect(Math.round(279.4 * PX_PER_MM)).toBe(3300);
  });
});

describe('exportPng (mocked DOM)', () => {
  let canvasWidth: number;
  let canvasHeight: number;
  let blobType: string;

  beforeEach(() => {
    canvasWidth = 0;
    canvasHeight = 0;
    blobType = '';

    // Mock canvas
    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      get width() { return canvasWidth; },
      set width(v: number) { canvasWidth = v; },
      get height() { return canvasHeight; },
      set height(v: number) { canvasHeight = v; },
      getContext: () => mockCtx,
      toBlob: (cb: (b: Blob | null) => void, type: string) => {
        blobType = type;
        cb(new Blob(['fake'], { type }));
      },
    };
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      },
    });

    // Mock Image
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      get src() { return this._src; }
      set src(v: string) {
        this._src = v;
        // Simulate async load
        queueMicrotask(() => this.onload?.());
      }
    });

    // Mock URL.createObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: vi.fn(),
    });

    // Mock Blob if needed (vitest node should have it, but ensure type works)
    if (typeof Blob === 'undefined') {
      vi.stubGlobal('Blob', class {
        parts: any[];
        type: string;
        constructor(parts: any[], opts?: { type?: string }) {
          this.parts = parts;
          this.type = opts?.type ?? '';
        }
      });
    }
  });

  it('creates a canvas with correct pixel dimensions and returns a PNG blob', async () => {
    // Dynamic import after mocks are set up
    const { exportPng } = await import('./exportPng');
    const blob = await exportPng({ svg: '<svg></svg>', pw: 210, ph: 297 });
    expect(canvasWidth).toBe(2480);
    expect(canvasHeight).toBe(3508);
    expect(blob.type).toBe('image/png');
    expect(blobType).toBe('image/png');
  });
});
