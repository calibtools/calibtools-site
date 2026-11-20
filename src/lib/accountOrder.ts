/**
 * One order for the page under /account/order/ — query, validation and the mapping from the
 * Customer Account API to what the page shows. No customer email or phone leaves the API route.
 */
import { OFFERS_KEY, PATTERNS_NAMESPACE, parseOffers, type OfferDoc } from './account';

export const ORDER_PATH = '/account/order/';

/** Page parameter → order gid. Digits only, so nothing else reaches the query variable. */
export function orderGid(id: string | null | undefined): string | null {
  return typeof id === 'string' && /^\d{1,20}$/.test(id) ? `gid://shopify/Order/${id}` : null;
}

/** Order gid → link to the order page, or '' when the gid is not an order. */
export function orderPath(gid: string): string {
  const m = /^gid:\/\/shopify\/Order\/(\d{1,20})$/.exec(gid);
  return m ? `${ORDER_PATH}?id=${m[1]}` : '';
}

const MONEY = '{ amount currencyCode }';

export const ORDER_QUERY = `query AccountOrder($id: ID!) {
  customer { offers: metafield(namespace: "${PATTERNS_NAMESPACE}", key: "${OFFERS_KEY}") { value } }
  order(id: $id) {
    id name processedAt cancelledAt financialStatus fulfillmentStatus statusPageUrl poNumber
    subtotal ${MONEY} totalShipping ${MONEY} totalTax ${MONEY} totalPrice ${MONEY} totalRefunded ${MONEY}
    draftOrder { name }
    shippingAddress { firstName lastName company formatted }
    billingAddress { firstName lastName company formatted }
    lineItems(first: 50) {
      nodes { title variantTitle quantity sku image { url altText } totalPrice ${MONEY} customAttributes { key value } }
    }
    fulfillments(first: 10) {
      nodes { createdAt estimatedDeliveryAt latestShipmentStatus status trackingInformation { company number url } }
    }
  }
}`;

export interface Money { amount: string; currencyCode: string }
interface Address { firstName: string | null; lastName: string | null; company: string | null; formatted: string[] }

export interface OrderData {
  customer: { offers: { value: string } | null };
  order: {
    id: string;
    name: string;
    processedAt: string;
    cancelledAt: string | null;
    financialStatus: string | null;
    fulfillmentStatus: string;
    statusPageUrl: string;
    poNumber: string | null;
    subtotal: Money | null;
    totalShipping: Money;
    totalTax: Money | null;
    totalPrice: Money;
    totalRefunded: Money;
    draftOrder: { name: string } | null;
    shippingAddress: Address | null;
    billingAddress: Address | null;
    lineItems: {
      nodes: {
        title: string; variantTitle: string | null; quantity: number; sku: string | null;
        image: { url: string; altText: string | null } | null;
        totalPrice: Money | null;
        customAttributes: { key: string; value: string | null }[];
      }[];
    };
    fulfillments: {
      nodes: {
        createdAt: string; estimatedDeliveryAt: string | null; latestShipmentStatus: string | null; status: string | null;
        trackingInformation: { company: string | null; number: string | null; url: string | null }[];
      }[];
    };
  } | null;
}

export interface OrderStep { label: 'Ordered' | 'Paid' | 'Shipped' | 'Delivered'; done: boolean; date: string }

export interface OrderDetail extends OfferDoc {
  signedIn: true;
  name: string;
  date: string;
  cancelled: boolean;
  payment: string;
  fulfillment: string;
  poNumber: string;
  steps: OrderStep[];
  items: { title: string; variant: string; quantity: number; sku: string; image: string; alt: string; total: Money | null; attributes: { key: string; value: string }[] }[];
  shipments: { date: string; eta: string; status: string; tracking: { company: string; number: string; url: string }[] }[];
  subtotal: Money | null;
  shipping: Money;
  tax: Money | null;
  total: Money;
  refunded: Money | null;
  shipTo: string[];
  billTo: string[];
  /** Shopify's own order page, kept as a fallback link. */
  shopifyUrl: string;
}

const words = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/_/g, ' ');
const https = (u: string | null | undefined) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');

function address(a: Address | null): string[] {
  if (!a) return [];
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  return [name, a.company ?? '', ...a.formatted].map((l) => l.trim()).filter(Boolean).filter((l, i, all) => all.indexOf(l) === i);
}

const PAID = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

export function toOrderDetail(d: OrderData): OrderDetail | null {
  const o = d.order;
  if (!o) return null;
  const doc = (o.draftOrder && parseOffers(d.customer.offers?.value).get(o.draftOrder.name)) || { pdf: '', pattern: '', patternId: '', no: '' };
  const ships = o.fulfillments.nodes.filter((f) => f.status !== 'CANCELLED');
  const firstShip = ships.map((f) => f.createdAt).sort()[0] ?? '';
  const delivered = ships.length > 0 && ships.every((f) => f.latestShipmentStatus === 'DELIVERED');
  const refunded = Number(o.totalRefunded.amount) > 0 ? o.totalRefunded : null;
  return {
    signedIn: true,
    ...doc,
    name: o.name,
    date: o.processedAt,
    cancelled: o.cancelledAt !== null,
    payment: words(o.financialStatus),
    fulfillment: words(o.fulfillmentStatus),
    poNumber: o.poNumber ?? '',
    steps: [
      { label: 'Ordered', done: true, date: o.processedAt },
      { label: 'Paid', done: PAID.has(o.financialStatus ?? ''), date: '' },
      { label: 'Shipped', done: firstShip !== '', date: firstShip },
      { label: 'Delivered', done: delivered, date: '' },
    ],
    items: o.lineItems.nodes.map((l) => ({
      title: l.title,
      variant: l.variantTitle && l.variantTitle !== 'Default Title' ? l.variantTitle : '',
      quantity: l.quantity,
      sku: l.sku ?? '',
      image: https(l.image?.url),
      alt: l.image?.altText ?? '',
      total: l.totalPrice,
      attributes: l.customAttributes
        .filter((a) => !a.key.startsWith('_') && a.value)
        .map((a) => ({ key: a.key, value: a.value as string })),
    })),
    shipments: ships.map((f) => ({
      date: f.createdAt,
      eta: f.estimatedDeliveryAt ?? '',
      status: words(f.latestShipmentStatus) || 'shipped',
      tracking: f.trackingInformation.map((t) => ({ company: t.company ?? '', number: t.number ?? '', url: https(t.url) })),
    })),
    subtotal: o.subtotal,
    shipping: o.totalShipping,
    tax: o.totalTax,
    total: o.totalPrice,
    refunded,
    shipTo: address(o.shippingAddress),
    billTo: address(o.billingAddress),
    shopifyUrl: https(o.statusPageUrl),
  };
}
