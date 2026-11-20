/**
 * ORDER-1 — the order page under /account/order/ shows one order from the Customer Account API:
 * items, totals, shipments with tracking, addresses and the quotation documents.
 */
import { describe, it, expect } from 'vitest';
import { orderGid, orderPath, toOrderDetail, ORDER_QUERY, type OrderData } from './accountOrder';

const money = (amount: string) => ({ amount, currencyCode: 'USD' });

const base: OrderData = {
  customer: {
    offers: { value: JSON.stringify([{ draft: '#D6', no: 'Q-SIM-20261120', pdf: 'https://calib.tools/q/abc12345/key4567890abcdefgh.pdf', pattern: '/tools/generator/?type=charuco&rows=9&cols=12&square=60&marker=45&dict=DICT_5X5_1000&paper=A0' }]) },
  },
  order: {
    id: 'gid://shopify/Order/7001',
    name: 'CT-1003',
    processedAt: '2026-11-20T12:00:00Z',
    cancelledAt: null,
    financialStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    statusPageUrl: 'https://shopify.com/106560684380/account/orders/7001',
    poNumber: 'PO-88',
    subtotal: money('1.00'),
    totalShipping: money('0.00'),
    totalTax: money('0.00'),
    totalPrice: money('1.00'),
    totalRefunded: money('0.00'),
    draftOrder: { name: '#D6' },
    shippingAddress: { firstName: 'A', lastName: 'B', company: 'Lab', formatted: ['1 Main St', 'Albuquerque NM 87110', 'United States'] },
    billingAddress: null,
    lineItems: {
      nodes: [
        {
          title: 'Custom ChArUco calibration target', variantTitle: 'Default Title', quantity: 2, sku: null,
          image: { url: 'https://cdn.shopify.com/s/files/x.png', altText: null },
          totalPrice: money('1.00'),
          customAttributes: [{ key: '_quote_pdf', value: 'secret' }, { key: 'Quotation', value: 'Q-SIM-20261120' }],
        },
      ],
    },
    fulfillments: {
      nodes: [
        {
          createdAt: '2026-11-22T08:00:00Z', estimatedDeliveryAt: '2026-11-27T00:00:00Z', latestShipmentStatus: 'IN_TRANSIT', status: 'SUCCESS',
          trackingInformation: [
            { company: 'UPS', number: '1Z999', url: 'https://www.ups.com/track?tracknum=1Z999' },
            { company: 'X', number: 'bad', url: 'javascript:alert(1)' },
          ],
        },
      ],
    },
  },
};

describe('order ids', () => {
  it('accepts digits only', () => {
    expect(orderGid('7001')).toBe('gid://shopify/Order/7001');
    expect(orderGid('')).toBeNull();
    expect(orderGid('7001 OR 1')).toBeNull();
    expect(orderGid('gid://shopify/Order/7001')).toBeNull();
    expect(orderGid('1'.repeat(21))).toBeNull();
  });
  it('builds the page link from a gid', () => {
    expect(orderPath('gid://shopify/Order/7001')).toBe('/account/order/?id=7001');
    expect(orderPath('nonsense')).toBe('');
  });
});

describe('toOrderDetail', () => {
  const d = toOrderDetail(base)!;
  it('maps header, statuses and totals', () => {
    expect(d.name).toBe('CT-1003');
    expect(d.date).toBe('2026-11-20T12:00:00Z');
    expect(d.payment).toBe('paid');
    expect(d.fulfillment).toBe('fulfilled');
    expect(d.poNumber).toBe('PO-88');
    expect(d.total.amount).toBe('1.00');
    expect(d.refunded).toBeNull();
    expect(d.shopifyUrl).toBe('https://shopify.com/106560684380/account/orders/7001');
  });
  it('keeps visible line attributes and drops hidden ones and the default variant title', () => {
    expect(d.items).toHaveLength(1);
    expect(d.items[0].variant).toBe('');
    expect(d.items[0].attributes).toEqual([{ key: 'Quotation', value: 'Q-SIM-20261120' }]);
    expect(d.items[0].image).toBe('https://cdn.shopify.com/s/files/x.png');
  });
  it('lists shipments with https tracking links only', () => {
    expect(d.shipments).toHaveLength(1);
    expect(d.shipments[0].status).toBe('in transit');
    expect(d.shipments[0].tracking).toEqual([
      { company: 'UPS', number: '1Z999', url: 'https://www.ups.com/track?tracknum=1Z999' },
      { company: 'X', number: 'bad', url: '' },
    ]);
  });
  it('attaches the quotation documents through the draft order', () => {
    expect(d.no).toBe('Q-SIM-20261120');
    expect(d.pdf).toBe('https://calib.tools/q/abc12345/key4567890abcdefgh.pdf');
    expect(d.patternId).toMatch(/^P-/);
  });
  it('formats the address with name and company first', () => {
    expect(d.shipTo).toEqual(['A B', 'Lab', '1 Main St', 'Albuquerque NM 87110', 'United States']);
    expect(d.billTo).toEqual([]);
  });
  it('derives the four progress steps', () => {
    expect(d.steps.map((s) => [s.label, s.done])).toEqual([
      ['Ordered', true], ['Paid', true], ['Shipped', true], ['Delivered', false],
    ]);
  });
  it('marks a delivered shipment and a refund', () => {
    const x = structuredClone(base);
    x.order!.fulfillments.nodes[0].latestShipmentStatus = 'DELIVERED';
    x.order!.totalRefunded = money('1.00');
    const r = toOrderDetail(x)!;
    expect(r.steps[3].done).toBe(true);
    expect(r.refunded?.amount).toBe('1.00');
  });
  it('returns null when the order is not this customer\'s', () => {
    expect(toOrderDetail({ customer: { offers: null }, order: null })).toBeNull();
  });
});

describe('query', () => {
  it('asks for one order by id and never for the customer email', () => {
    expect(ORDER_QUERY).toContain('order(id: $id)');
    expect(ORDER_QUERY).not.toContain('emailAddress');
  });
});
