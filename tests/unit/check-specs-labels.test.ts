/**
 * Unit test: files_included label matching in check-specs.
 * Mirrors the label-check logic from scripts/check-specs.mjs line ~96-104.
 */
import { describe, it, expect } from 'vitest';

// Replicate the exact label list from check-specs.mjs
const FILES_INCLUDED_LABELS = ['Files included', 'Files'];

function htmlHasFilesRow(html: string): boolean {
  return FILES_INCLUDED_LABELS.some(
    (label) => html.includes(`>${label}<`) || html.includes(`">${label}<`),
  );
}

describe('check-specs files_included labels', () => {
  it('passes when "Files included" row is present', () => {
    const html = '<td>Files included</td><td>DXF, STEP, inspection report</td>';
    expect(htmlHasFilesRow(html)).toBe(true);
  });

  it('passes when "Files" row is present', () => {
    const html = '<td>Files</td><td>DXF + STEP</td>';
    expect(htmlHasFilesRow(html)).toBe(true);
  });

  it('FAILS when only "Inspection report" is present (not a files row)', () => {
    const html = `
      <table>
        <tr><td>Inspection report</td><td>Included</td></tr>
        <tr><td>In the box</td><td>Board, cloth, case</td></tr>
        <tr><td>Material</td><td>Ceramic</td></tr>
      </table>`;
    expect(htmlHasFilesRow(html)).toBe(false);
  });

  it('FAILS when only "In the box" is present (not a files row)', () => {
    const html = '<tr><td>In the box</td><td>Board + mounting fixture</td></tr>';
    expect(htmlHasFilesRow(html)).toBe(false);
  });

  it('FAILS when no files-related row exists at all', () => {
    const html = '<table><tr><td>Material</td><td>Aluminium</td></tr></table>';
    expect(htmlHasFilesRow(html)).toBe(false);
  });
});
