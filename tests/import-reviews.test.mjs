import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '../scripts/import-reviews.mjs');

function makeTempXlsx(rows) {
  const dir = mkdtempSync(join(tmpdir(), 'review-import-'));
  const file = join(dir, 'test.xlsx');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('reviews');
  ws.columns = [
    { header: 'product_handle', key: 'product_handle' },
    { header: 'rating', key: 'rating' },
    { header: 'title', key: 'title' },
    { header: 'body', key: 'body' },
    { header: 'reviewer_name', key: 'reviewer_name' },
    { header: 'reviewer_org', key: 'reviewer_org' },
    { header: 'country', key: 'country' },
    { header: 'date', key: 'date' },
    { header: 'material_connection', key: 'material_connection' },
    { header: 'consent', key: 'consent' },
    { header: 'note', key: 'note' },
  ];
  for (const row of rows) ws.addRow(row);
  return { wb, file, dir };
}

function goodRow(overrides = {}) {
  return {
    product_handle: 'charuco-composite-a3',
    rating: 5,
    title: 'Great board',
    body: 'Used this board for a six-camera automotive rig. Corner detection was consistent.',
    reviewer_name: 'Alex Chen',
    reviewer_org: '',
    country: 'US',
    date: '2026-09-15',
    material_connection: 'free_sample',
    consent: 'yes',
    note: 'Sample sent 2026-08-01',
    ...overrides,
  };
}

async function runImport(file, extraArgs = []) {
  try {
    const output = execFileSync('node', [SCRIPT, '--file', file, '--dry-run', ...extraArgs], {
      encoding: 'utf-8',
      timeout: 15_000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
      },
      cwd: tmpdir(),
    });
    return { output, exitCode: 0 };
  } catch (err) {
    return { output: (err.stderr || '') + (err.stdout || ''), exitCode: err.status };
  }
}

describe('import-reviews validation', () => {
  it('rejects rating outside 1-5', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow({ rating: 0 })]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).not.toBe(0);
    expect(output).toContain('rating must be an integer 1-5');
    rmSync(dir, { recursive: true });
  });

  it('rejects body shorter than 20 chars', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow({ body: 'Too short' })]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).not.toBe(0);
    expect(output).toContain('body too short');
    rmSync(dir, { recursive: true });
  });

  it('rejects future date', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow({ date: '2099-01-01' })]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).not.toBe(0);
    expect(output).toContain('date cannot be in the future');
    rmSync(dir, { recursive: true });
  });

  it('rejects consent != yes', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow({ consent: 'no' })]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).not.toBe(0);
    expect(output).toContain('consent must be "yes"');
    rmSync(dir, { recursive: true });
  });

  it('rejects invalid material_connection', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow({ material_connection: 'paid' })]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).not.toBe(0);
    expect(output).toContain('material_connection must be one of');
    rmSync(dir, { recursive: true });
  });

  it('accepts all valid material_connection values', async () => {
    const rows = ['none', 'free_sample', 'discount', 'insider'].map((mc, i) =>
      goodRow({ material_connection: mc, reviewer_name: `Reviewer ${i}`, date: `2026-09-0${i + 1}` }),
    );
    const { wb, file, dir } = makeTempXlsx(rows);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).toBe(0);
    expect(output).toContain('4 review(s) would be written');
    rmSync(dir, { recursive: true });
  });
});

describe('import-reviews de-duplication', () => {
  it('detects intra-file duplicates', async () => {
    const row = goodRow();
    const { wb, file, dir } = makeTempXlsx([row, row]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).toBe(0);
    expect(output).toContain('Skipping duplicate');
    expect(output).toContain('1 review(s) would be written');
    rmSync(dir, { recursive: true });
  });
});

describe('import-reviews dry-run', () => {
  it('writes nothing in dry-run mode', async () => {
    const { wb, file, dir } = makeTempXlsx([goodRow()]);
    await wb.xlsx.writeFile(file);
    const { output, exitCode } = await runImport(file);
    expect(exitCode).toBe(0);
    expect(output).toContain('[dry-run]');
    expect(output).toContain('would be written');
    rmSync(dir, { recursive: true });
  });
});
