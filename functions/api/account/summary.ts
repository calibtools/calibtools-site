/**
 * GET /api/account/summary
 * The signed-in customer's email, saved patterns, quotes (draft orders) and orders, for /account/.
 */
import { SUMMARY_QUERY, customerGraphQL, json, toSummary, withAccount, type AccountEnv, type SummaryData } from '../../../src/lib/accountApi';

export const onRequestGet: PagesFunction<AccountEnv> = (ctx) =>
  withAccount(ctx.request, ctx.env, async (s) => json(toSummary(await customerGraphQL<SummaryData>(s, SUMMARY_QUERY))));
