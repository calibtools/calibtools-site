/**
 * Terms that apply to orders, kept apart from claims.ts because that file feeds the datasheet PDFs
 * and a change there marks every PDF as stale.
 */
/**
 * Custom orders are final once paid (owner decision 2026-11-21). One sentence for the returns page,
 * the terms, the quotation PDF, the offer email and the order page; the Shopify offer email template
 * carries the same words (docs/offers/draft-order-invoice-offer.liquid).
 */
export const CUSTOM_ORDER_FINAL =
  'Custom targets are made to your specification, so an order can\u2019t be canceled, returned or exchanged once it is paid. A target that doesn\u2019t meet the agreed specification is repaired or replaced.';

/**
 * Damage caused by the customer is not a defect: repair is offered for a fee (owner decision 2026-11-21).
 * Goes with CUSTOM_ORDER_FINAL on the returns page, in the terms, on the quotation and on the order page.
 */
export const PAID_REPAIR =
  'Damage that happens in use or handling isn\u2019t covered. We can repair the target for a fee, and you pay the repair and shipping both ways.';

/**
 * Every detail of a custom order is in the quotation and confirmed with the customer before it is sent,
 * so paying the order accepts it (owner decision 2026-11-21). On the quotation, in the offer email and in the terms.
 */
export const PAYMENT_ACCEPTS_QUOTATION =
  'Paying the order confirms that you have checked this quotation and accept the specification in it.';
