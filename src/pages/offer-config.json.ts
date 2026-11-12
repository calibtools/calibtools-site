/**
 * Storefront settings for the offer-document function (functions/q). They are the same public
 * values the cart already ships to the browser; the function reads this file when its own
 * environment does not carry them.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      domain: import.meta.env.PUBLIC_SHOPIFY_DOMAIN ?? '',
      token: import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? '',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
