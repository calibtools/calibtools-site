/**
 * GET /api/account/order?id=<digits>
 * One order of the signed-in customer for /account/order/. Shopify only returns the customer's own orders;
 * anything else is 404.
 */
import { customerGraphQL, json, withAccount, type AccountEnv } from '../../../src/lib/accountApi';
import { ORDER_QUERY, orderGid, toOrderDetail, type OrderData } from '../../../src/lib/accountOrder';

export const onRequestGet: PagesFunction<AccountEnv> = (ctx) =>
  withAccount(ctx.request, ctx.env, async (s) => {
    const id = orderGid(new URL(ctx.request.url).searchParams.get('id'));
    if (!id) return json({ signedIn: true, error: 'notfound' }, 404);
    let data: OrderData;
    try {
      data = await customerGraphQL<OrderData>(s, ORDER_QUERY, { id });
    } catch (e) {
      // an id that is not this customer's order comes back as a GraphQL error, not as null
      if (e instanceof Error && e.message === 'unauthorized') throw e;
      return json({ signedIn: true, error: 'notfound' }, 404);
    }
    const detail = toOrderDetail(data);
    return detail ? json(detail) : json({ signedIn: true, error: 'notfound' }, 404);
  });
