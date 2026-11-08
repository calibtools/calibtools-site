/**
 * Work-email check for forms (quote request). Shared by the browser (instant
 * message) and Pages Functions (enforced). Free and disposable mailbox
 * providers are refused; the domain must also accept mail (MX lookup, server side).
 */

/** Free mailbox providers. A domain matches if it equals an entry or any of its parents does. */
const FREE = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'passport.com',
  'yahoo.com', 'ymail.com', 'rocketmail.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me', 'tutanota.com', 'tuta.io', 'zoho.com', 'zohomail.com', 'mail.com',
  'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch', 'web.de', 't-online.de', 'freenet.de', 'posteo.de', 'mailbox.org',
  'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru', 'rambler.ru',
  'qq.com', 'foxmail.com', '163.com', '126.com', 'yeah.net', 'sina.com', 'sina.cn', 'sohu.com', 'aliyun.com', '139.com', '189.cn',
  'naver.com', 'hanmail.net', 'daum.net', 'libero.it', 'virgilio.it', 'orange.fr', 'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr',
  'btinternet.com', 'sky.com', 'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'cox.net', 'earthlink.net',
  'rediffmail.com', 'seznam.cz', 'wp.pl', 'o2.pl', 'interia.pl', 'onet.pl', 'bluewin.ch', 'telenet.be', 'skynet.be', 'ziggo.nl', 'kpnmail.nl',
]);
/** Free providers that are registered under many country domains (outlook.de, yahoo.co.jp …). */
const FREE_BRANDS = ['gmail', 'googlemail', 'outlook', 'hotmail', 'live', 'yahoo', 'aol', 'icloud', 'gmx', 'yandex', 'protonmail', 'zoho'];
const DISPOSABLE = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', 'temp-mail.org',
  'tempmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mohmal.com', 'emailondeck.com',
]);

const EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

export type WorkEmailResult = { ok: true } | { ok: false; reason: 'invalid' | 'free' | 'disposable' };

function parents(domain: string): string[] {
  const parts = domain.split('.');
  return parts.map((_, i) => parts.slice(i).join('.')).slice(0, -1);
}

export function checkWorkEmail(raw: string): WorkEmailResult {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, reason: 'invalid' };
  const domain = email.split('@')[1];
  const chain = parents(domain);
  if (chain.some((d) => DISPOSABLE.has(d))) return { ok: false, reason: 'disposable' };
  if (chain.some((d) => FREE.has(d))) return { ok: false, reason: 'free' };
  // brand.<tld> or brand.co.<cc>, e.g. outlook.de, hotmail.co.uk, yahoo.co.jp
  const label = domain.split('.')[0];
  const rest = domain.split('.').slice(1).join('.');
  if (FREE_BRANDS.includes(label) && /^([a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(rest)) return { ok: false, reason: 'free' };
  return { ok: true };
}

export const WORK_EMAIL_MESSAGE: Record<'invalid' | 'free' | 'disposable' | 'nomx', string> = {
  invalid: 'Please enter a valid email address.',
  free: 'Please use your work email (company or university). No work email? Write to hello@calib.tools.',
  disposable: 'Temporary email addresses are not accepted. Please use your work email.',
  nomx: 'This email domain does not seem to receive mail. Please check the address.',
};

/** True if the domain publishes an MX record. DNS failures do not block (returns true). */
export async function hasMailServer(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: 'application/dns-json' },
    });
    if (!res.ok) return true;
    const data = (await res.json()) as { Status?: number; Answer?: { type: number }[] };
    if (data.Status === 3) return false; // NXDOMAIN
    return (data.Answer ?? []).some((a) => a.type === 15);
  } catch {
    return true;
  }
}
