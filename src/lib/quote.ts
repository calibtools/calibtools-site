/**
 * Quote requests (QUOTE-2): reference numbers, form options, the stored record,
 * email texts and the email-confirmation token. Shared by /quote/ (browser) and
 * functions/api/quote*.ts (server), so both sides validate the same way.
 *
 * No prices here: non-catalog patterns are quoted by hand.
 */

export const MATERIALS = [
  { id: 'composite', label: 'Aluminum composite', note: 'Printed, matte, rigid. Large sizes, lowest cost.' },
  { id: 'ceramic', label: 'Ceramic', note: 'Lithographed pattern, finest features, thermally stable.' },
  { id: 'glass', label: 'Glass', note: 'Lithographed pattern, very flat.' },
  { id: 'unsure', label: 'Not sure yet', note: 'Tell us how you use the target and we will suggest one.' },
] as const;
export type MaterialId = (typeof MATERIALS)[number]['id'];
export const isMaterial = (v: string): v is MaterialId => MATERIALS.some((m) => m.id === v);
export const materialLabel = (v: string): string => MATERIALS.find((m) => m.id === v)?.label ?? '';

export const MAX_QUANTITY = 9999;
/** Whole number of boards (or sets) from 1 to MAX_QUANTITY, else null. */
export function parseQuantity(raw: string): number | null {
  const v = raw.trim();
  if (!/^\d{1,4}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_QUANTITY ? n : null;
}

/** ISO 3166-1 alpha-2 codes offered in the delivery-country list. */
export const COUNTRY_CODES = [
  'AD','AE','AL','AM','AR','AT','AU','AZ','BA','BD','BE','BG','BH','BR','BY','CA','CH','CL','CN','CO','CR','CY','CZ',
  'DE','DK','DZ','EC','EE','EG','ES','FI','FR','GB','GE','GR','HK','HR','HU','ID','IE','IL','IN','IQ','IS','IT','JO',
  'JP','KE','KR','KW','KZ','LB','LI','LK','LT','LU','LV','MA','MC','MD','ME','MK','MO','MT','MX','MY','NG','NL','NO',
  'NZ','OM','PE','PH','PK','PL','PT','QA','RO','RS','SA','SE','SG','SI','SK','SM','TH','TN','TR','TW','UA','US','UY',
  'UZ','VN','ZA',
] as const;
export const isCountry = (v: string): boolean => (COUNTRY_CODES as readonly string[]).includes(v);
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
/** Country options sorted by English name. */
export function countryOptions(): { code: string; name: string }[] {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Unambiguous characters for reference numbers (no 0/O, 1/I/L, U). */
const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const QUOTE_ID_RE = /^Q-\d{8}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/;
export const isQuoteId = (v: string): boolean => QUOTE_ID_RE.test(v);

/** Reference number such as Q-20261109-4K7M (UTC date + 4 random characters). */
export function newQuoteId(now: Date = new Date(), random: (n: number) => Uint8Array = randomBytes): string {
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const bytes = random(4);
  let tail = '';
  for (const b of bytes) tail += ID_ALPHABET[b % ID_ALPHABET.length];
  return `Q-${d}-${tail}`;
}
function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export interface QuoteRecord {
  id: string;
  ts: string;
  name: string;
  company: string;
  email: string;
  /** Free text product line, or the generator summary. */
  product: string;
  material: MaterialId | '';
  quantity: number | null;
  /** Boards per set when the pattern is a multi-board set (1 = single board). */
  boards: number;
  country: string;
  message: string;
  /** Full generator URL that reopens the exact pattern, or ''. */
  pattern: string;
  source_page: string;
  emailVerified: boolean;
  verifiedAt?: string;
  customerEmailSent: boolean;
}

export const KV_PREFIX = 'quote:';
export const kvKey = (id: string) => `${KV_PREFIX}${id}`;

/** One-line summary used in subjects and on the confirmation page. */
export function quoteHeadline(r: Pick<QuoteRecord, 'product' | 'material' | 'quantity' | 'boards'>): string {
  const parts: string[] = [];
  if (r.product) parts.push(r.product);
  if (r.material) parts.push(materialLabel(r.material).toLowerCase());
  if (r.quantity) parts.push(r.boards > 1 ? `×${r.quantity} sets of ${r.boards}` : `×${r.quantity}`);
  return parts.join(' · ');
}

/** Subject of the internal email, e.g. "Q-20261109-4K7M · ChArUco 9 × 12, 30 mm · ceramic · ×5". */
export function internalSubject(r: QuoteRecord): string {
  const head = quoteHeadline(r) || r.company || 'quote request';
  return `${r.id} · ${head}`.slice(0, 200);
}

export function internalBody(r: QuoteRecord, verifyNote: string): string {
  const lines = [
    `Reference: ${r.id}`,
    `Received: ${r.ts}`,
    '',
    `Name: ${r.name}`,
    `Company: ${r.company}`,
    `Email: ${r.email} (${verifyNote})`,
    `Delivery country: ${r.country ? `${countryName(r.country)} (${r.country})` : '—'}`,
    '',
    `Product / pattern: ${r.product || '—'}`,
    `Material: ${materialLabel(r.material) || '—'}`,
    `Quantity: ${r.quantity ?? '—'}${r.boards > 1 ? ` (sets of ${r.boards} boards)` : ''}`,
    '',
    `Message:\n${r.message || '—'}`,
  ];
  if (r.pattern) lines.push('', `Pattern (opens the exact pattern in the generator):\n${r.pattern}`);
  if (r.source_page) lines.push('', `Sent from: ${r.source_page}`);
  return lines.join('\n');
}

export function customerSubject(r: QuoteRecord): string {
  return `We received your quote request ${r.id}`;
}

export function customerBody(r: QuoteRecord, confirmUrl: string): string {
  const lines = [
    `Hello ${r.name},`,
    '',
    `Thank you for your quote request. Your reference number is ${r.id}.`,
    '',
    ...(confirmUrl ? ['Please confirm your email address so we can send the quote to it:', confirmUrl, ''] : []),
    'What you sent us:',
    `- Product / pattern: ${r.product || '—'}`,
    `- Material: ${materialLabel(r.material) || '—'}`,
    `- Quantity: ${r.quantity ?? '—'}${r.boards > 1 ? ` (sets of ${r.boards} boards)` : ''}`,
    `- Delivery country: ${r.country ? countryName(r.country) : '—'}`,
  ];
  if (r.pattern) lines.push(`- Pattern: ${r.pattern}`);
  lines.push(
    '',
    'We reply within one business day. To add details, reply to this email and keep the reference number in the subject.',
    '',
    'Calib.Tools',
    'hello@calib.tools · https://calib.tools',
  );
  return lines.join('\n');
}

/* ---- Email-confirmation token (HMAC-SHA256, domain-separated) ---- */

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 32-hex token that proves the link came from our confirmation email. */
export async function confirmToken(secret: string, id: string): Promise<string> {
  return (await hmacHex(secret, `quote-confirm:${id}`)).slice(0, 32);
}

export async function checkConfirmToken(secret: string, id: string, token: string): Promise<boolean> {
  if (!isQuoteId(id) || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = await confirmToken(secret, id);
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export function confirmUrl(origin: string, id: string, token: string): string {
  return `${origin}/api/quote-confirm?q=${encodeURIComponent(id)}&t=${token}`;
}
