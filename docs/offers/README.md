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
Put the link in a line-item attribute named `_quote_pdf`. The offer email (see "Offer email" below)
attaches the PDF it points to. Attributes whose name starts with `_` are not listed in the email.

## Local commands
    npx tsx scripts/offer.ts check   offer.json
    npx tsx scripts/offer.ts pdf     offer.json out.pdf
    npx tsx scripts/offer.ts encrypt offer.json

## Rules
- Seller name and address come from the offer data. The footer is the shared contact line.
- Signatory: "Kevin Lee", Customer Success. This is the one exception to the no-personal-names rule (see CLAUDE.md); no other name goes on the document.
- To withdraw an offer, delete its metaobject; the link then answers 404.

## Order terms on the quotation
Above the signature lines the PDF prints three sentences from `src/lib/orderTerms.ts` (owner decision 2026-11-21):
`PAYMENT_ACCEPTS_QUOTATION` (paying accepts the quotation), `CUSTOM_ORDER_FINAL` (no cancel, return or exchange
once paid; repair or replacement if the target misses the agreed specification) and `PAID_REPAIR` (damage in use
or handling is repaired for a fee, shipping both ways paid by the customer). Change the wording only in
`orderTerms.ts`, never in `claims.ts` (that would mark every datasheet PDF stale); `policy-consistency.test.ts`
checks the returns page, the terms and the order page use the same words.

The first page also carries `MISSION_LINE` from `src/lib/brand.ts` next to the logo (`letterheadLine`).

## Signature
The signature line shows Kevin Lee's handwritten signature, stored as vector outlines in `src/lib/signature.ts`
and drawn by `offerPdf.ts` on the Signature line, at most 10.5 mm high. To change it, photograph a pen signature on
white paper and run

    pip install pillow numpy potracer
    python3 scripts/trace-signature.py photo.jpg --preview /tmp/sig.png

Check the preview, commit the new `signature.ts`, and render a sample with `offer.ts pdf`. `--crop x0,y0,x1,y1`
picks one of several signatures on the photo. Empty `paths` means no signature is drawn. No other document uses it.

## Showing the quotation on the customer's account page
/account/ lists each quote and order with "Quotation (PDF)" and "Pattern P-XXXXXX" links. They come from
the customer metafield `calibtools.offers` (JSON, read-only for the customer):

    [{ "draft": "#D4", "no": "Q-20261120-AB12", "pdf": "https://calib.tools/q/<id>/<key>.pdf", "pattern": "/tools/generator/?…" }]

The page shows `no` in place of the draft-order name. Add one entry per draft order with `metafieldsSet` (keep the existing entries). The order created from the
draft shows the same links. Only calib.tools quotation links and generator paths are shown.
Put the Pattern ID and the generator link in the offer's annex too, so the PDF names the exact pattern.

## Pattern links
A generator link in an offer (`annex.pattern`, annex notes, `calibtools.offers[].pattern`) must name a paper
the pattern fits on at 100 %. `offer.ts check` refuses a link that does not and prints the paper to use
(`smallestFittingPaper` in `src/lib/patternLinkFit.ts`). The paper is not part of the Pattern ID.

## Offer email
The site sends the offer email itself, so the quotation PDF travels as an attachment (Shopify notifications
can only link to a file). `functions/api/offer-email.ts` receives Shopify's "Draft order update" webhook and
acts on a tag of the draft order:

| Tag | What happens |
|---|---|
| `offer-test` | The email with the PDF goes to hello@calib.tools only, subject starts with `TEST:`. Repeats at most every two minutes. |
| `offer-send` | The email goes to the draft order's customer, with a blind copy to hello@calib.tools. Sent once. |
| `offer-send-2`, `offer-send-3` … | A deliberate resend (after a revision, for example). Each tag sends once. |

Send `offer-test` first, read the email, then add `offer-send`. Editing the draft later does not send again.
The draft order needs: a line item with at least one custom attribute, `Quotation` (the number shown in the
email; the draft name is used without it), `_quote_pdf` (the link from `offer.ts encrypt`), a customer email
and no "completed" status. If something is missing, nothing goes to the customer and hello@calib.tools gets a
note that names the reason. The email has no link to the PDF; the "Confirm your order" button opens Shopify's
invoice page. Shopify does not mark the draft "Invoice sent"; the blind copy is the record.
The line under the total follows the trade term in the name of the draft order's shipping line: with
"DDP" it says freight, clearance and duties are included and nothing is due on delivery; with "DAP" it says
duties and taxes are paid by the recipient on arrival; with neither it says they are not included unless
the quotation says so. Name the shipping line after the term agreed with the customer, and keep it the same
as the Incoterms line in the quotation PDF (the two are filled in separately).

Text and layout live in `src/lib/offerEmail.ts` (paper ground, wordmark on its own white row with the
quotation number below it, red square button, mono labels). `PAYMENT_ACCEPTS_QUOTATION`, `CUSTOM_ORDER_FINAL`
and the sign-off line are imported, not typed. Line items show no picture.

Setup in Shopify, once: Settings → Notifications → Webhooks → Create webhook, event "Draft order update",
format JSON, URL `https://calib.tools/api/offer-email`. It is signed with the same secret as the other
webhooks (`SHOPIFY_WEBHOOK_SECRET`); the function also needs `RESEND_API_KEY` and the `QUOTES` KV binding.

### Shopify's own draft-order invoice email (fallback)
Do not use "Send invoice" in Shopify for a custom offer: the customer would get a second email, without the
attachment. The "Draft order invoice" notification still carries `draft-order-invoice-offer.liquid` for
drafts whose lines have custom attributes (wrapped in `{% if has_custom_spec %} … {% else %} Shopify default
{% endif %}`, placed right before `{% capture email_title %}`), in case the site cannot send. Shopify has no
API for notification templates; paste it in Settings → Notifications → Draft order invoice → Edit code, then
check with `draftOrderInvoicePreview`. The template can't import from the repo, so the order terms are typed
into the `.liquid` file (`policy-consistency.test.ts` fails if they drift): when `orderTerms.ts` changes,
update this file and paste it into Shopify again (then reopen the editor to confirm it saved). Templates
restyled for the site carry a `/* ct-vi */` block before `</style>` and a sign-off line above the footer table.
