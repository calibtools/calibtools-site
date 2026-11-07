import { describe, it, expect } from 'vitest';
import { compatRows, digitalFiles, familyOf } from './productCompat';

describe('productCompat', () => {
  it('maps handles to families', () => {
    expect(familyOf('charuco-composite')).toBe('charuco');
    expect(familyOf('charuco-ceramic')).toBe('charuco');
    expect(familyOf('lidar-camera-target')).toBeNull();
  });

  it('never claims a Kalibr file for ChArUco', () => {
    const k = compatRows('charuco-composite').find((r) => r.tool === 'Kalibr')!;
    expect(k.note).toMatch(/No ChArUco/);
    expect(digitalFiles('charuco-composite').join(' ')).not.toMatch(/Kalibr/);
  });

  it('only HALCON plates list a .descr file', () => {
    for (const h of ['charuco-composite', 'checkerboard-composite', 'aprilgrid-composite', 'circlegrid-composite']) {
      expect(digitalFiles(h).join(' ')).not.toMatch(/\.descr/);
    }
    expect(digitalFiles('halcon-composite').join(' ')).toMatch(/\.descr/);
  });

  it('lists no per-feature coordinate CSV and says configs come from the generator', () => {
    for (const h of ['charuco-composite', 'checkerboard-composite', 'aprilgrid-composite', 'circlegrid-composite', 'halcon-composite']) {
      const f = digitalFiles(h).join(' ');
      expect(f).not.toMatch(/coordinates CSV/i);
    }
    expect(digitalFiles('charuco-composite').join(' ')).toMatch(/free pattern generator/);
  });

  it('uses the content override when given and nothing for unknown families', () => {
    expect(compatRows('lidar-camera-target')).toEqual([]);
    expect(compatRows('lidar-camera-target', [{ tool: 'ROS 2', note: 'x' }])).toEqual([{ tool: 'ROS 2', note: 'x' }]);
  });
});
