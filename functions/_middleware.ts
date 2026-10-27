/**
 * Cloudflare Pages middleware: 301 redirect www → apex.
 * Runs before any other function or static asset is served.
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace(/^www\./, '');
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString() },
    });
  }
  return context.next();
};
