/**
 * Cloudflare Turnstile (human check) — server-side verification for Pages Functions.
 * Until TURNSTILE_SECRET_KEY is set in Cloudflare, checks are skipped so live
 * forms keep working; once it is set, a missing or failed token is refused.
 */
export type TurnstileResult = { ok: true; skipped?: true } | { ok: false; message: string };

export const TURNSTILE_FIELD = 'cf-turnstile-response';

export async function verifyTurnstile(token: string, secret: string | undefined, ip: string): Promise<TurnstileResult> {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, message: 'Please complete the human check.' };
  try {
    const body = new FormData();
    body.set('secret', secret);
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? { ok: true } : { ok: false, message: 'The human check failed. Please try again.' };
  } catch {
    return { ok: false, message: 'The human check could not be completed. Please try again.' };
  }
}
