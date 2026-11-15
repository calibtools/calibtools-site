/**
 * POST /api/account/patterns   {"action":"add","name":"…","path":"/tools/generator/?…"}
 *                              {"action":"remove","id":"P-XXXXXX"}
 *                              {"action":"rename","id":"P-XXXXXX","name":"…"}
 * Saves to / removes from the list on the customer's Shopify record (metafield
 * calibtools.saved_patterns). Returns {patterns:[…]}.
 */
import { PATTERNS_KEY, PATTERNS_NAMESPACE, addPattern, parseSavedPatterns, removePattern, renamePattern } from '../../../src/lib/account';
import {
  PATTERNS_QUERY, PATTERNS_SET, customerGraphQL, json, sameOrigin, withAccount, type AccountEnv,
} from '../../../src/lib/accountApi';

interface Current { customer: { id: string; savedPatterns: { value: string } | null } }
interface SetResult { metafieldsSet: { userErrors: { message: string }[] } }

export const onRequestPost: PagesFunction<AccountEnv> = async (ctx) => {
  if (!sameOrigin(ctx.request)) return json({ error: 'origin' }, 403);
  let body: { action?: string; name?: string; path?: string; id?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: 'body' }, 400);
  }
  return withAccount(ctx.request, ctx.env, async (s) => {
    const cur = await customerGraphQL<Current>(s, PATTERNS_QUERY);
    let list = parseSavedPatterns(cur.customer.savedPatterns?.value);
    if (body.action === 'add') {
      try {
        list = addPattern(list, { name: String(body.name ?? ''), path: String(body.path ?? '') });
      } catch {
        return json({ error: 'path' }, 400);
      }
    } else if (body.action === 'remove') {
      list = removePattern(list, String(body.id ?? ''));
    } else if (body.action === 'rename') {
      list = renamePattern(list, String(body.id ?? ''), String(body.name ?? ''));
    } else {
      return json({ error: 'action' }, 400);
    }
    const res = await customerGraphQL<SetResult>(s, PATTERNS_SET, {
      metafields: [{ ownerId: cur.customer.id, namespace: PATTERNS_NAMESPACE, key: PATTERNS_KEY, type: 'json', value: JSON.stringify(list) }],
    });
    if (res.metafieldsSet.userErrors.length) return json({ error: 'shopify', detail: res.metafieldsSet.userErrors[0].message }, 502);
    return json({ patterns: list });
  });
};
