/**
 * Cloudflare Pages Function: POST /api/quote
 *
 * Forwards quote requests to hello@calib.tools via MailChannels.
 * Falls back to storing in KV namespace QUOTES if MailChannels fails.
 *
 * Setup required in Cloudflare:
 * 1. DNS: add TXT record for SPF: v=spf1 include:relay.mailchannels.net ~all
 * 2. (Optional) KV namespace: create "QUOTES" and bind as QUOTES in Pages settings
 */

interface Env {
  QUOTES?: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const formData = await ctx.request.formData();

  // Honeypot check
  if (formData.get('website')) {
    return Response.redirect(new URL('/quote/?sent=1', ctx.request.url).toString(), 303);
  }

  const name = String(formData.get('name') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const product = String(formData.get('product') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || !email) {
    return new Response('Name and email are required.', { status: 400 });
  }

  const body = [
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Product: ${product}`,
    `Message:\n${message}`,
  ].join('\n');

  let sent = false;

  // Try MailChannels
  try {
    const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'hello@calib.tools', name: 'Calib.Tools' }] }],
        from: { email: 'noreply@calib.tools', name: 'Calib.Tools Quote Form' },
        reply_to: { email, name },
        subject: `Quote request from ${name} (${company})`,
        content: [{ type: 'text/plain', value: body }],
      }),
    });
    sent = mcRes.ok || mcRes.status === 202;
  } catch {
    // MailChannels unavailable, fall through to KV
  }

  // Fallback: store in KV
  if (!sent && ctx.env.QUOTES) {
    const key = `quote-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await ctx.env.QUOTES.put(key, JSON.stringify({ name, company, email, product, message, ts: new Date().toISOString() }));
    sent = true;
  }

  if (!sent) {
    return new Response('Could not send quote request. Please email hello@calib.tools directly.', { status: 500 });
  }

  return Response.redirect(new URL('/quote/?sent=1', ctx.request.url).toString(), 303);
};
