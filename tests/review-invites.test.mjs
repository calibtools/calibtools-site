import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../scripts/send-review-invites.mjs');
const FIXTURE = resolve(import.meta.dirname, 'fixtures/review-invites.json');

describe('send-review-invites --dry-run', () => {
  it('sends 1, skips 4, errors 0 against the fixture', () => {
    const output = execFileSync('node', [SCRIPT, '--dry-run', `--fixture=${FIXTURE}`], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(output).toContain('[dry-run] Would send: ready@example.com for charuco-ceramic');
    expect(output).toContain('Sent: 1, Skipped: 4, Errors: 0');
  });

  it('does not send already-sent invites', () => {
    const output = execFileSync('node', [SCRIPT, '--dry-run', `--fixture=${FIXTURE}`], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(output).not.toContain('sent@example.com');
  });

  it('does not send already-used invites', () => {
    const output = execFileSync('node', [SCRIPT, '--dry-run', `--fixture=${FIXTURE}`], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(output).not.toContain('used@example.com');
  });

  it('does not send future invites', () => {
    const output = execFileSync('node', [SCRIPT, '--dry-run', `--fixture=${FIXTURE}`], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(output).not.toContain('future@example.com');
  });

  it('does not send expired invites', () => {
    const output = execFileSync('node', [SCRIPT, '--dry-run', `--fixture=${FIXTURE}`], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(output).not.toContain('expired@example.com');
  });
});
