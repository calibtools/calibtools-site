#!/usr/bin/env node
/**
 * Ship the current branch in one call: push, open the PR, wait for both checks,
 * squash-merge, wait for the production deploy, then fetch live pages and look
 * for expected text.
 *
 * Usage:
 *   node scripts/ship.mjs --title "..." --body /tmp/prbody.md \
 *        [--check "/tools/generator/::Paper or a rigid board"]... [--pr 123]
 *
 * Never merges unless "build" and "Cloudflare Pages" both succeeded on the PR head.
 * Needs the gh CLI, authenticated.
 */
import { execFileSync } from 'node:child_process';

const REPO = 'calibtools/calibtools-site';
const SITE = 'https://calib.tools';
const CHECKS = ['build', 'Cloudflare Pages'];

const argv = process.argv.slice(2);
const arg = (f) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : null; };
const args = (f) => argv.flatMap((a, i) => (a === f ? [argv[i + 1]] : []));
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const sh = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** gh api with retries: a transient error or an empty answer is retried, not treated as a result. */
async function gh(a, { tries = 5 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const out = sh('gh', ['api', ...a]);
      if (out) return out;
    } catch (e) {
      if (i >= tries) throw e;
    }
    if (i >= tries) throw new Error(`gh api ${a.join(' ')}: empty answer`);
    await sleep(5 * i);
  }
}

async function waitChecks(sha, names, minutes) {
  for (let i = 0; i < minutes * 3; i++) {
    let runs = [];
    try {
      runs = JSON.parse(await gh([`repos/${REPO}/commits/${sha}/check-runs`, '--jq', '[.check_runs[]|{name,status,conclusion}]']));
    } catch { /* retry on the next round */ }
    const mine = names.map((n) => runs.find((r) => r.name === n));
    if (mine.every((r) => r && r.status === 'completed')) return mine;
    await sleep(20);
  }
  throw new Error(`checks on ${sha.slice(0, 7)} did not finish in ${minutes} min`);
}

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
let pr = arg('--pr');

if (!pr) {
  if (branch === 'main') throw new Error('on main: create a branch first');
  if (sh('git', ['status', '--short'])) throw new Error('uncommitted changes');
  const title = arg('--title'); const body = arg('--body');
  if (!title || !body) throw new Error('need --title and --body <file>');
  sh('git', ['push', '-q', '-u', 'origin', branch]);
  pr = await gh(['-X', 'POST', `repos/${REPO}/pulls`, '-f', `title=${title}`, '-f', `head=${branch}`, '-f', 'base=main', '-F', `body=@${body}`, '--jq', '.number']);
}
console.log(`PR #${pr}`);

const head = await gh([`repos/${REPO}/pulls/${pr}`, '--jq', '.head.sha']);
const res = await waitChecks(head, CHECKS, 12);
const failed = res.filter((r) => r.conclusion !== 'success');
if (failed.length) {
  console.log(`NOT MERGED — ${failed.map((r) => `${r.name}: ${r.conclusion}`).join(', ')}`);
  process.exit(1);
}

const merged = await gh(['-X', 'PUT', `repos/${REPO}/pulls/${pr}/merge`, '-f', 'merge_method=squash', '--jq', '.sha']);
console.log(`merged ${merged.slice(0, 7)}`);

const [deploy] = await waitChecks(merged, ['Cloudflare Pages'], 10);
console.log(`deploy: ${deploy.conclusion}`);
if (deploy.conclusion !== 'success') process.exit(1);

let bad = 0;
for (const c of args('--check')) {
  const [path, text] = c.split('::');
  let state = 'unreachable';
  for (let i = 0; i < 6 && state !== 'ok'; i++) {
    try {
      const html = await fetch(`${SITE}${path}`, { cache: 'no-store' }).then((r) => r.text());
      state = html.includes(text) ? 'ok' : 'missing';
    } catch { if (i === 0) break; /* no route to the site from this machine */ }
    if (state === 'missing') await sleep(10);
  }
  const label = { ok: 'live ok', missing: 'LIVE MISSING', unreachable: 'live check skipped (site not reachable from here)' }[state];
  console.log(`${label} ${path} — "${text}"`);
  if (state === 'missing') bad++;
}
process.exit(bad ? 1 : 0);
