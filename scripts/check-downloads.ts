/**
 * Build check: every Plumbline file offered on /plumbline/ is there, with the size the page states,
 * and SHA256SUMS.txt lists the same checksums as src/lib/software.ts. A release that was moved or
 * re-uploaded stops the build instead of leaving dead buttons on the page.
 *
 * SKIP_DOWNLOADS_CHECK=1 skips it (offline work only; CI and the deploy run it).
 */
import { RELEASE, fileUrl } from '../src/lib/software';

if (process.env.SKIP_DOWNLOADS_CHECK === '1') {
  console.log('[check-downloads] skipped (SKIP_DOWNLOADS_CHECK=1)');
  process.exit(0);
}

const errors: string[] = [];
const get = (url: string, method: 'HEAD' | 'GET') => fetch(url, { method, redirect: 'follow', headers: { 'user-agent': 'calibtools-site build check' } });

for (const f of RELEASE.files) {
  try {
    const r = await get(fileUrl(f), 'HEAD');
    const len = Number(r.headers.get('content-length'));
    if (r.status !== 200) errors.push(`${f.file}: HTTP ${r.status}`);
    else if (len !== f.bytes) errors.push(`${f.file}: ${len} bytes on the server, ${f.bytes} in software.ts`);
  } catch (e) {
    errors.push(`${f.file}: ${(e as Error).message}`);
  }
}

try {
  const r = await get(fileUrl(RELEASE.checksums), 'GET');
  if (r.status !== 200) errors.push(`${RELEASE.checksums}: HTTP ${r.status}`);
  else {
    const listed = new Map((await r.text()).trim().split('\n').map((l) => l.trim().split(/\s+/).reverse() as [string, string]));
    for (const f of RELEASE.files) if (listed.get(f.file) !== f.sha256) errors.push(`${f.file}: checksum in ${RELEASE.checksums} differs from software.ts`);
  }
} catch (e) {
  errors.push(`${RELEASE.checksums}: ${(e as Error).message}`);
}

if (errors.length) {
  console.error(`\n[check-downloads] ${errors.length} problem(s) with the Plumbline ${RELEASE.version} downloads:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`[check-downloads] OK — ${RELEASE.files.length} files of Plumbline ${RELEASE.version} are downloadable, sizes and checksums match.`);
