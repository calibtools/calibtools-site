/**
 * Unit tests for check-placeholders.mjs patterns and claims rules.
 * Uses vitest.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const FIXTURE_DIR = resolve(import.meta.dirname, '__fixtures_placeholders');
const SCRIPT = resolve(import.meta.dirname, 'check-placeholders.mjs');

function run(distDir) {
  try {
    const out = execSync(`node ${SCRIPT}`, {
      env: { ...process.env, CHECK_PLACEHOLDERS_DIST: distDir },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
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

describe('check-placeholders', () => {
  it('passes on a clean HTML page', () => {
    const dir = setupFixture('clean', {
      'index.html': '<html><head><title>Test</title></head><body><p>Hello world</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(0);
  });

  it('fails on [BODY COPY]', () => {
    const dir = setupFixture('body-copy', {
      'index.html': '<html><body><p>[BODY COPY — fill this in]</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('BODY COPY');
  });

  it('fails on [CHECK]', () => {
    const dir = setupFixture('check', {
      'index.html': '<html><body><p>Some text [CHECK] here</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on [lab name', () => {
    const dir = setupFixture('lab-name', {
      'index.html': '<html><body><p>[lab name, accreditation no.]</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on PLACEHOLDER', () => {
    const dir = setupFixture('placeholder', {
      'index.html': '<html><body><p>PLACEHOLDER text</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on TODO', () => {
    const dir = setupFixture('todo', {
      'index.html': '<html><body><p>TODO fix this</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on TBD', () => {
    const dir = setupFixture('tbd', {
      'index.html': '<html><body><p>TBD later</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on lorem ipsum', () => {
    const dir = setupFixture('lorem', {
      'index.html': '<html><body><p>Lorem ipsum dolor sit amet</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on [UPPERCASE BRACKET TEXT]', () => {
    const dir = setupFixture('bracket-upper', {
      'index.html': '<html><body><p>[PRODUCT PHOTO]</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });

  it('fails on DAkkS in same sentence as ±2 µm', () => {
    const dir = setupFixture('claims-dakks', {
      'index.html': '<html><body><p>Ceramic targets achieve ±2 µm measured against a DAkkS reference.</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Claims');
  });

  it('fails on "measured" in same sentence as ±2 µm', () => {
    const dir = setupFixture('claims-measured', {
      'index.html': '<html><body><p>Feature accuracy ±2 µm measured against a reference.</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Claims');
  });

  it('fails on µm in same sentence as composite on composite page', () => {
    const dir = setupFixture('claims-composite', {
      'targets/composite-boards/index.html': '<html><body><p>The composite board achieves 2 µm accuracy.</p></body></html>',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Claims');
  });

  it('fails on a hit inside a text file', () => {
    const dir = setupFixture('txt-hit', {
      'data.json': '{"note": "TODO: fill in later"}',
    });
    const r = run(dir);
    expect(r.code).toBe(1);
  });
});
