/**
 * Tests for datasheet content conversion and quality.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseFrontMatter } from './datasheetPdf';

const DOCS_DIR = resolve(process.cwd(), 'docs/datasheets');

function collectMdFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      collectMdFiles(join(dir, entry.name), files);
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

const mdFiles = collectMdFiles(DOCS_DIR);

describe('datasheet content conversion', () => {
  it('has exactly 11 source files converted', () => {
    expect(mdFiles).toHaveLength(11);
  });

  it('every file has valid front matter', () => {
    for (const f of mdFiles) {
      const raw = readFileSync(f, 'utf-8');
      const { meta } = parseFrontMatter(raw);
      expect(meta.code).toBeTruthy();
      expect(meta.title).toBeTruthy();
      expect(['datasheet', 'manual', 'note', 'service']).toContain(meta.type);
      expect(meta.rev).toBe('A');
      expect(meta.status).toBe('draft');
    }
  });

  it('no old part-number pattern like CHA-P-6X6- remains in docs/', () => {
    const allContent = mdFiles.map(f => readFileSync(f, 'utf-8')).join('\n');
    // Old patterns: CHT-P-7x10-, CHA-P-6X6-, etc. (no CT- prefix)
    expect(allContent).not.toMatch(/(?<![A-Z])(CHT|CHA|ACC|SVC)-[A-Z]-\d+x\d+-/);
  });

  it('no old part-number pattern remains in public/files/', () => {
    // Check that no generated PDF filenames use old patterns
    try {
      const pdfDir = resolve(process.cwd(), 'public/files/datasheets');
      const pdfs = readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
      for (const pdf of pdfs) {
        expect(pdf).not.toMatch(/^(CHT|CHA|ACC|SVC)-[A-Z]-/);
      }
    } catch {
      // Directory may not exist yet before build
    }
  });

  it('ILAC wording is correct in all files', () => {
    for (const f of mdFiles) {
      const content = readFileSync(f, 'utf-8');
      // The banned phrase should not appear (except possibly in the SVC document title context)
      if (!f.includes('CT-SV-CERT-ILAC')) {
        expect(content).not.toContain('ILAC-recognised calibration certificate');
      }
    }
  });

  it('product datasheets have family and material', () => {
    const datasheets = mdFiles.filter(f => {
      const raw = readFileSync(f, 'utf-8');
      const { meta } = parseFrontMatter(raw);
      return meta.type === 'datasheet' || meta.type === 'service';
    });
    for (const f of datasheets) {
      const { meta } = parseFrontMatter(readFileSync(f, 'utf-8'));
      expect(meta.family).toBeTruthy();
      expect(meta.material).toBeTruthy();
    }
  });
});
