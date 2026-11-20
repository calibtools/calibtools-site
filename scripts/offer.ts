/**
 * Custom-offer helper.
 *
 *   npx tsx scripts/offer.ts check   offer.json           validate the data
 *   npx tsx scripts/offer.ts pdf     offer.json out.pdf   draw the PDF locally
 *   npx tsx scripts/offer.ts encrypt offer.json           print { id, key, payload, url }
 *
 * `encrypt` output: store `payload` in a Shopify metaobject (type offer_doc, handle = id,
 * field payload); `url` is the link for the customer. The key is not stored anywhere.
 */
import { linkFitsItsPaper, smallestFittingPaper } from '../src/lib/patternLinkFit';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encryptOffer, newOfferId } from '../src/lib/offerCrypto';
import { offerPdf, offerProblem } from '../src/lib/offerPdf';

const [cmd, input, output] = process.argv.slice(2);
if (!cmd || !input) {
  console.error('usage: offer.ts check|pdf|encrypt <offer.json> [out.pdf]');
  process.exit(2);
}
const text = readFileSync(input, 'utf8');
const data = JSON.parse(text);
const problem = offerProblem(data);
if (problem) {
  console.error(`offer data is incomplete: ${problem}`);
  process.exit(1);
}

if (cmd === 'check') {
  // A pattern link has to open on a paper the pattern fits on, or the customer sees a cropped preview.
  const links = [data.annex?.pattern, ...(data.annex?.notes ?? []).map(([, v]: [string, string]) => v)].filter((v): v is string => typeof v === 'string' && v.includes('/tools/generator/'));
  for (const link of links) {
    if (!linkFitsItsPaper(link)) {
      console.error(`pattern link opens on a paper that is too small; use paper=${smallestFittingPaper(link) ?? '(none fits: leave the link out)'}\n  ${link}`);
      process.exit(1);
    }
  }
  console.log('ok');
} else if (cmd === 'pdf') {
  const font = (f: string) => {
    const b = readFileSync(resolve(import.meta.dirname, '../public/fonts/pdf', f));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  };
  const pdf = await offerPdf(data, { regular: font('Geist-Regular.ttf'), semiBold: font('Geist-SemiBold.ttf'), mono: font('GeistMono-Regular.ttf') });
  writeFileSync(output ?? 'offer.pdf', pdf);
  console.log(`${output ?? 'offer.pdf'}: ${pdf.length} bytes`);
} else if (cmd === 'encrypt') {
  const id = newOfferId();
  const { payload, key } = await encryptOffer(JSON.stringify(data));
  console.log(JSON.stringify({ id, key, payload, url: `https://calib.tools/q/${id}/${key}.pdf` }, null, 2));
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}
