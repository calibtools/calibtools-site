/**
 * Unit tests for check-specs.mjs files_included label matching.
 * Uses vitest.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const FIXTURE_DIR = resolve(import.meta.dirname, '__fixtures_check_specs');
const SCRIPT = resolve(import.meta.dirname, 'check-specs.mjs');

function run(distDir) {
  try {
    const out = execSync(`node ${SCRIPT}`, {
      env: { ...process.env, CHECK_SPECS_DIST: distDir, SKIP_SPECS_CHECK: undefined },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

/** Create a minimal board page HTML with a spec table containing given rows. */
function boardPage(rows) {
  const trs = rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('\n');
  return `<html><body>
<section id="specifications"><table>${trs}</table></section>
<a href="test-datasheet.pdf">Datasheet</a>
</body></html>`;
}

function setupFixture(name, files) {
  const dir = join(FIXTURE_DIR, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

afterAll(() => {
  if (existsSync(FIXTURE_DIR)) rmSync(FIXTURE_DIR, { recursive: true });
});

describe('check-specs files_included', () => {
  it('FAILS when table has "Inspection report" and "In the box" but no Files row', () => {
    const html = boardPage([
      ['Material', 'Ceramic'],
      ['Thickness', '10 mm'],
      ['Feature tolerance', '±5 µm'],
      ['Lead time', '4 weeks'],
      ['Inspection report', 'Included'],
      ['In the box', 'Board + mount'],
    ]);
    const dir = setupFixture('no-files-row', {
      'test-board/index.html': html,
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stdout + r.stderr).toContain('files_included');
  });

  it('PASSES when table has "Files included"', () => {
    const html = boardPage([
      ['Material', 'Ceramic'],
      ['Thickness', '10 mm'],
      ['Feature tolerance', '±5 µm'],
      ['Lead time', '4 weeks'],
      ['Files included', 'DXF, PDF'],
    ]);
    const dir = setupFixture('files-included', {
      'test-board/index.html': html,
    });
    const r = run(dir);
    expect(r.code).toBe(0);
  });

  it('PASSES when table has "Files"', () => {
    const html = boardPage([
      ['Material', 'Ceramic'],
      ['Thickness', '10 mm'],
      ['Feature tolerance', '±5 µm'],
      ['Lead time', '4 weeks'],
      ['Files', 'DXF, PDF'],
    ]);
    const dir = setupFixture('files-label', {
      'test-board/index.html': html,
    });
    const r = run(dir);
    expect(r.code).toBe(0);
  });

  it('FAILS when board page has no datasheet link', () => {
    // Board page with all spec rows but no -datasheet href anywhere
    const html = `<html><body>
<section id="specifications"><table>
<tr><td>Material</td><td>Composite</td></tr>
<tr><td>Thickness</td><td>6 mm</td></tr>
<tr><td>Feature tolerance</td><td>±10 µm</td></tr>
<tr><td>Lead time</td><td>2 weeks</td></tr>
<tr><td>Files included</td><td>DXF</td></tr>
</table></section>
</body></html>`;
    const dir = setupFixture('no-datasheet', {
      'test-board/index.html': html,
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stdout + r.stderr).toContain('datasheet_url');
  });
});
