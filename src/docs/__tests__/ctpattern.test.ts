import { describe, it, expect } from 'vitest';
import {
  corner_list,
  board_svg,
  axes,
  dim_h,
  dim_v,
  scale_bar,
  RED,
  GREEN,
} from '../ctpattern';

describe('corner_list', () => {
  it('returns 66 corners for 7x12 board with sq=14', () => {
    const cl = corner_list(7, 12, 14);
    expect(cl).toHaveLength(66); // (7-1)*(12-1) = 6*11 = 66
    expect(cl[0]).toEqual([0, 0, 0, 14, 14]);
    expect(cl[cl.length - 1]).toEqual([65, 5, 10, 154, 84]);
  });
});

describe('board_svg', () => {
  it('renders ArUco marker paths with DICT_6X6_250', () => {
    const svg = board_svg({
      W: 200,
      H: 150,
      rows: 5,
      cols: 7,
      sq: 20,
      marker: 15,
      dict_name: 'DICT_6X6_250',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    // ArUco markers are rendered as <path d= via _runs()
    expect(svg).toMatch(/<path d="M[\d.]+/);
  });

  it('uses grey fills in map mode', () => {
    const svg = board_svg({
      W: 200,
      H: 150,
      rows: 5,
      cols: 7,
      sq: 20,
      mode: 'map',
    });
    // map mode uses G10 (#E6E6E6) for squares instead of #000
    expect(svg).toContain('#E6E6E6');
    // Should NOT contain black-filled square path in map mode
    expect(svg).not.toMatch(/fill="#000".*?<path/);
  });
});

describe('axes', () => {
  it('contains red and green colours', () => {
    const svg = axes(4.5, 4.5, 6.5, 0.6);
    expect(svg).toContain(RED);    // #E60012
    expect(svg).toContain(GREEN);  // #00A651
  });
});

describe('dim_h', () => {
  it('returns valid SVG with dimension text', () => {
    const svg = dim_h(10, 80, 120, '70 mm');
    expect(svg).toContain('<line');
    expect(svg).toContain('<text');
    expect(svg).toContain('70 mm');
  });
});

describe('dim_v', () => {
  it('returns valid SVG with rotated label', () => {
    const svg = dim_v(120, 10, 80, '70 mm');
    expect(svg).toContain('<line');
    expect(svg).toContain('rotate(-90');
    expect(svg).toContain('70 mm');
  });
});

describe('scale_bar', () => {
  it('returns SVG with "100 mm" text', () => {
    const svg = scale_bar(10, 200);
    expect(svg).toContain('<rect');
    expect(svg).toContain('100 mm');
  });
});
