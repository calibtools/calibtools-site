/**
 * Preview-only diagnostic (never merged): builds the 1:1 pattern PDF the way the quote
 * function does and reports how long it took. Sends no email and stores nothing.
 */
import { specFromLink } from '../../src/lib/patternLink';

interface Env { ASSETS?: { fetch: (input: Request | string) => Promise<Response> } }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const big = url.searchParams.get('size') === 'big';
  const link = big
    ? '/tools/generator/?type=ChArUco&rows=11&cols=15&square=50&marker=37&dict=DICT_6X6_250&startId=0'
    : '/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_5X5_100&startId=0';
  const spec = specFromLink(link)!;
  const t0 = Date.now();
  const load = async (f: string) => (await ctx.env.ASSETS!.fetch(`${url.origin}/fonts/pdf/${f}`)).arrayBuffer();
  const [regular, semiBold, mono] = await Promise.all([load('Geist-Regular.ttf'), load('Geist-SemiBold.ttf'), load('GeistMono-Regular.ttf')]);
  const t1 = Date.now();
  const [{ factoryPdf }, { quoteAttachments }] = await Promise.all([import('../../src/lib/factoryPdf'), import('../../src/lib/quoteFiles')]);
  const files = quoteAttachments(spec, 'Q-00000000-TEST');
  const pdf = await factoryPdf(spec, { regular, semiBold, mono });
  const t2 = Date.now();
  return new Response(JSON.stringify({ ok: true, fontsMs: t1 - t0, buildMs: t2 - t1, pdfBytes: pdf.length, head: new TextDecoder().decode(pdf.slice(0, 5)), files: files.map((f) => f.filename) }), { headers: { 'Content-Type': 'application/json' } });
};
