import { describe, it, expect } from 'vitest';
import { offerTriggers, offerModel, offerEmailHtml, offerEmailText, offerEmailSubject, formatMoney, type DraftWebhook } from './offerEmail';
import { CUSTOM_ORDER_FINAL, PAYMENT_ACCEPTS_QUOTATION } from './orderTerms';
import { SIGN_OFF_LINE } from './brand';

const ID = 'abcdefghij0123456789';
const KEY = 'A'.repeat(43);
const PDF = `https://calib.tools/q/${ID}/${KEY}.pdf`;

function sampleDraft(over: Partial<DraftWebhook> = {}): DraftWebhook {
  return {
    id: 1624942149980,
    name: '#D9',
    email: 'buyer@lab.example',
    status: 'open',
    tags: 'offer-test',
    currency: 'USD',
    note: 'Board: 400 x 300 mm.\nPattern: ChArUco 12 x 9.',
    invoice_url: 'https://shop.calib.tools/106560684380/invoices/90572021e5e99b1c0bca243de4d605d7',
    subtotal_price: '1946.00',
    total_tax: '0.00',
    total_price: '1951.00',
    shipping_line: { title: 'Express', price: '5.00' },
    line_items: [
      {
        title: 'Custom ChArUco Calibration Target',
        quantity: 2,
        price: '973.00',
        properties: [
          { name: 'Quotation', value: 'Q-20261123-AB12' },
          { name: 'Board size', value: '400 x 300 mm' },
          { name: 'Dictionary', value: 'DICT_5X5_100' },
          { name: '_quote_pdf', value: PDF },
        ],
      },
    ],
    ...over,
  };
}

describe('offerTriggers', () => {
  it('reads the test tag and the send tags, nothing else', () => {
    expect(offerTriggers('vip, offer-test')).toEqual({ test: true, send: [] });
    expect(offerTriggers('offer-send')).toEqual({ test: false, send: ['offer-send'] });
    expect(offerTriggers('Offer-Send-2, offer-send, offer-test')).toEqual({ test: true, send: ['offer-send', 'offer-send-2'] });
    expect(offerTriggers('offer-sent, offer-sending, offer-send-x, test-email-check')).toEqual({ test: false, send: [] });
    expect(offerTriggers('')).toEqual({ test: false, send: [] });
    expect(offerTriggers(undefined)).toEqual({ test: false, send: [] });
  });
});

describe('formatMoney', () => {
  it('writes US dollars with the sign and other currencies with the code', () => {
    expect(formatMoney('1946', 'USD')).toBe('$1,946.00');
    expect(formatMoney('0.5', 'USD')).toBe('$0.50');
    expect(formatMoney('1234.5', 'EUR')).toBe('1,234.50 EUR');
  });
});

describe('offerModel', () => {
  it('takes the quotation number, the recipient, the items and the totals from the draft order', () => {
    const r = offerModel(sampleDraft());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model.quoteNo).toBe('Q-20261123-AB12');
    expect(r.model.to).toBe('buyer@lab.example');
    expect(r.model.draftName).toBe('#D9');
    expect(r.model.pdf).toEqual({ id: ID, key: KEY });
    expect(r.model.items).toEqual([
      {
        title: 'Custom ChArUco Calibration Target',
        quantity: 2,
        price: '$1,946.00',
        specs: [{ name: 'Board size', value: '400 x 300 mm' }, { name: 'Dictionary', value: 'DICT_5X5_100' }],
      },
    ]);
    expect(r.model.subtotal).toBe('$1,946.00');
    expect(r.model.shipping).toBe('$5.00');
    expect(r.model.tax).toBe('');
    expect(r.model.total).toBe('$1,951.00 USD');
  });
  it('subtracts a line discount and shows taxes when there are any', () => {
    const d = sampleDraft({ total_tax: '2.30' });
    d.line_items![0].applied_discount = { amount: '46.00' };
    const r = offerModel(d);
    expect(r.ok && r.model.items[0].price).toBe('$1,900.00');
    expect(r.ok && r.model.tax).toBe('$2.30');
  });
  it('falls back to the customer email and to the draft name', () => {
    const d = sampleDraft({ email: '', customer: { email: 'second@lab.example' } });
    d.line_items![0].properties = d.line_items![0].properties!.filter((p) => p.name !== 'Quotation');
    const r = offerModel(d);
    expect(r.ok && r.model.to).toBe('second@lab.example');
    expect(r.ok && r.model.quoteNo).toBe('#D9');
  });
  it('refuses a draft that is not a custom offer, has no quotation PDF, no recipient or no order link', () => {
    const plain = sampleDraft();
    plain.line_items![0].properties = [{ name: '_quote_pdf', value: PDF }];
    expect(offerModel(plain)).toEqual({ ok: false, reason: 'not-custom' });

    for (const bad of ['', 'https://evil.example/q/x/y.pdf', `https://calib.tools/q/${ID}/short.pdf`, `http://calib.tools/q/${ID}/${KEY}.pdf`]) {
      const d = sampleDraft();
      d.line_items![0].properties = d.line_items![0].properties!.map((p) => (p.name === '_quote_pdf' ? { ...p, value: bad } : p));
      expect(offerModel(d), bad).toEqual({ ok: false, reason: 'no-pdf' });
    }
    expect(offerModel(sampleDraft({ email: 'not-an-address' }))).toEqual({ ok: false, reason: 'no-recipient' });
    expect(offerModel(sampleDraft({ invoice_url: 'javascript:alert(1)' }))).toEqual({ ok: false, reason: 'no-order-link' });
    expect(offerModel(sampleDraft({ status: 'completed' }))).toEqual({ ok: false, reason: 'completed' });
    expect(offerModel(sampleDraft({ line_items: [] }))).toEqual({ ok: false, reason: 'not-custom' });
  });
});

describe('offer email', () => {
  const model = () => {
    const r = offerModel(sampleDraft());
    if (!r.ok) throw new Error(r.reason);
    return r.model;
  };

  it('has the order button, the attachment note and no link to the PDF', () => {
    const html = offerEmailHtml(model());
    expect(html).toContain('>Confirm your order</a>');
    expect(html).toContain('href="https://shop.calib.tools/106560684380/invoices/90572021e5e99b1c0bca243de4d605d7"');
    expect(html).toContain('attached to this email as a PDF');
    expect(html).not.toContain('/q/');
    expect(html).not.toMatch(/Download the quotation/i);
    expect(html).not.toContain(KEY);
  });
  it('shows the letterhead in two rows: wordmark, then the quotation number', () => {
    const html = offerEmailHtml(model());
    const logo = html.indexOf('wordmark-framed-light.png');
    const no = html.indexOf('Q-20261123-AB12', html.indexOf('<body'));
    expect(logo).toBeGreaterThan(0);
    expect(no).toBeGreaterThan(logo);
    expect(html.slice(logo, no)).toContain('</td></tr>');
    expect(html).toContain('linear-gradient(#FFFFFF,#FFFFFF)');
  });
  it('carries the order terms and the sign-off line from the shared constants', () => {
    const html = offerEmailHtml(model());
    expect(html).toContain(PAYMENT_ACCEPTS_QUOTATION);
    expect(html).toContain(CUSTOM_ORDER_FINAL);
    expect(html).toContain(SIGN_OFF_LINE);
    const text = offerEmailText(model());
    expect(text).toContain(PAYMENT_ACCEPTS_QUOTATION);
    expect(text).toContain(CUSTOM_ORDER_FINAL);
    expect(text).toContain(SIGN_OFF_LINE);
  });
  it('lists the items without an image column, the notes and the totals', () => {
    const html = offerEmailHtml(model());
    expect(html).not.toMatch(/<img[^>]+width="56"/);
    expect(html).toContain('Board size:');
    expect(html).toContain('Quantity 2');
    expect(html).toContain('Board: 400 x 300 mm.<br>Pattern: ChArUco 12 x 9.');
    expect(html).toContain('$1,951.00 USD');
    expect(html).not.toContain('>Taxes<');
    expect(html).not.toContain('_quote_pdf');
  });
  it('says duties are not included, unless the shipping line is DDP', () => {
    const plain = offerEmailHtml(model());
    expect(plain).toContain('Import duties and taxes of your country are not included unless the quotation says so.');
    expect(plain).not.toContain('Nothing is due on delivery');

    const r = offerModel(sampleDraft({ shipping_line: { title: 'Delivery DDP Cambridge, MA: air freight, customs clearance, import duties', price: '5.00' } }));
    if (!r.ok) throw new Error(r.reason);
    expect(r.model.dutiesPaid).toBe(true);
    for (const body of [offerEmailHtml(r.model), offerEmailText(r.model)]) {
      expect(body).toContain('Delivered duty paid (DDP): freight, customs clearance and import duties are included. Nothing is due on delivery.');
      expect(body).not.toContain('are not included');
    }
    // the letters inside another word do not count
    const other = offerModel(sampleDraft({ shipping_line: { title: 'Express via DDPX hub', price: '5.00' } }));
    expect(other.ok && other.model.dutiesPaid).toBe(false);
    const none = offerModel(sampleDraft({ shipping_line: null }));
    expect(none.ok && none.model.dutiesPaid).toBe(false);
  });
  it('escapes what comes from the draft order', () => {
    const d = sampleDraft({ note: '<script>alert(1)</script>' });
    d.line_items![0].title = 'Target "A" <b>';
    const r = offerModel(d);
    if (!r.ok) throw new Error(r.reason);
    const html = offerEmailHtml(r.model);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Target &quot;A&quot; &lt;b&gt;');
  });
  it('gives the role mailbox for questions', () => {
    expect(offerEmailHtml(model())).toContain('mailto:hello@calib.tools');
  });
  it('writes the subject with the quotation number and marks a test', () => {
    expect(offerEmailSubject(model(), false)).toBe('Your quotation Q-20261123-AB12 from Calib.Tools');
    expect(offerEmailSubject(model(), true)).toBe('TEST: Your quotation Q-20261123-AB12 from Calib.Tools');
  });
  it('plain-text version has the order link and no PDF link', () => {
    const text = offerEmailText(model());
    expect(text).toContain('https://shop.calib.tools/106560684380/invoices/');
    expect(text).not.toContain('/q/');
    expect(text).toContain('Total: $1,951.00 USD');
  });
});
