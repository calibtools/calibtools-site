import { describe, it, expect } from 'vitest';
import { parseOffers } from './account';
import { toSummary, type SummaryData } from './accountApi';

const PDF = 'https://calib.tools/q/abcdefgh12345678/Abcdefghijklmnopqrstuvwxyz012345.pdf';
const PATTERN = '/tools/generator/?type=ChArUco&rows=9&cols=12&square=30&marker=22&dict=DICT_5X5_100&paper=A3&startId=0&scaleBar=true';

describe('quotation documents on the account page', () => {
  it('keeps calib.tools quotation links and generator paths, drops anything else', () => {
    const m = parseOffers(JSON.stringify([
      { draft: '#D4', no: 'Q-20261120-AB12', pdf: PDF, pattern: PATTERN },
      { draft: '#D5', pdf: 'https://evil.example/q/x.pdf', pattern: 'https://evil.example/' },
      { draft: 'D6', pdf: PDF },
    ]));
    expect([...m.keys()]).toEqual(['#D4']);
    expect(m.get('#D4')!.pdf).toBe(PDF);
    expect(m.get('#D4')!.pattern).toBe(PATTERN);
    expect(m.get('#D4')!.patternId).toMatch(/^P-/);
    expect(m.get('#D4')!.no).toBe('Q-20261120-AB12');
    expect(parseOffers(JSON.stringify([{ draft: '#D7', no: '<b>x</b>', pdf: PDF }])).get('#D7')!.no).toBe('');
  });

  it('survives a missing or broken metafield', () => {
    expect(parseOffers(null).size).toBe(0);
    expect(parseOffers('not json').size).toBe(0);
  });

  it('links the documents to the quote and to the order made from it', () => {
    const money = { amount: '1.99', currencyCode: 'USD' };
    const data: SummaryData = { customer: {
      id: 'c', firstName: null, emailAddress: { emailAddress: 'a@b.co' }, savedPatterns: null,
      offers: { value: JSON.stringify([{ draft: '#D4', pdf: PDF, pattern: PATTERN }]) },
      orders: { nodes: [
        { id: 'o', name: 'CT-1002', processedAt: '', financialStatus: 'PAID', fulfillmentStatus: 'UNFULFILLED', statusPageUrl: 'https://x', totalPrice: money, draftOrder: { name: '#D4' } },
        { id: 'p', name: 'CT-1003', processedAt: '', financialStatus: 'PAID', fulfillmentStatus: 'UNFULFILLED', statusPageUrl: 'https://x', totalPrice: money, draftOrder: null },
      ] },
      draftOrders: { nodes: [{ id: 'd', name: '#D4', createdAt: '', updatedAt: '', status: 'COMPLETED', invoiceUrl: null, totalPrice: money }] },
    } };
    const s = toSummary(data);
    expect(s.quotes[0].pdf).toBe(PDF);
    expect(s.orders[0].pattern).toBe(PATTERN);
    expect(s.orders[1].pdf).toBe('');
  });
});
