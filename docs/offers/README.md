# Custom-offer quotation PDF

A quotation for a custom order is served as a PDF at `https://calib.tools/q/<id>/<key>.pdf`.
No file is uploaded anywhere: the page is drawn on request from the offer data.

## How it works
1. The offer is one JSON file (see `sample-offer.json`; fields in `src/lib/offerPdf.ts`).
2. `npx tsx scripts/offer.ts encrypt offer.json` encrypts it (AES-256-GCM) and prints `id`, `key`,
   `payload` and the link.
3. `payload` is stored in a Shopify metaobject: type `offer_doc`, handle = `id`, field `payload`.
   The type is readable through the Storefront API, so the function needs no new secret.
4. `functions/q/[id]/[file].ts` reads the metaobject, decrypts it with the key from the link and
   draws the PDF with `offerPdf`. A wrong id or key is a 404. Responses are not cached or indexed.

The key exists only in the link. Anyone who lists the metaobjects sees ciphertext; only someone
who can write to the store can publish an offer.

## Using it with a Shopify draft order
Put the link in a line-item attribute named `_quote_pdf`. The draft-order invoice email shows
"Download the quotation (PDF)" above the order button. Attributes whose name starts with `_`
are not listed in the email.

## Local commands
    npx tsx scripts/offer.ts check   offer.json
    npx tsx scripts/offer.ts pdf     offer.json out.pdf
    npx tsx scripts/offer.ts encrypt offer.json

## Rules
- Seller name and address come from the offer data. The footer is the shared contact line.
- No personal names: the signatory is "Calib.Tools" with a role as title.
- To withdraw an offer, delete its metaobject; the link then answers 404.
