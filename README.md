# Creditcard — three design directions

Three standalone prototypes of a "find the credit card for you" site. Each one handles the same goal (search by benefits, read and compare cards easily) in a deliberately different way, so you can pick a direction and build from there.

| Dir | Name | Feel | How you find a card |
| --- | --- | --- | --- |
| [`a-finder/`](a-finder) | **CardCompass** | Clean, airy, light blue. Familiar "catalog" UX. | Tap benefit tiles → filter sidebar with chips + sort → card detail → side-by-side compare (up to 4, "only show differences"). |
| [`b-matchmaker/`](b-matchmaker) | **Kindred** | Warm cream & coral, serif type, friendly copy. | 5-question quiz, one question per screen → one top pick with plain-English "why it fits you" → runners-up, head-to-head verdicts, full ranked list. |
| [`c-explorer/`](c-explorer) | **Ledger** | Dark, data-dense, monospace numbers. For power users. | Enter your monthly spending (sliders/presets) + must-have toggles → sortable table of *your* dollar value per card, stacked value bars, expandable rows, compare dock that tells you what spending would flip the winner. |

## Card data

`shared/cards.js` holds 22 real US cards (Chase, American Express, Capital One, Citi, Wells Fargo, Discover), covering travel, hotel, airline, cash back, 0% APR and credit-building cards. Offers were researched from issuer pages and card-review sites on the `AS_OF` date in that file.

- **Welcome offers change often and many vary by applicant.** Cards whose offer conflicted across sources carry an `offerNote` that is shown to visitors. Every card links to its issuer's site.
- **APRs are not listed**, because they depend on the applicant. The sites say "Variable — set by issuer".
- **Values are estimates**: `pointValue` is our cents-per-point estimate, `credits[].value` is a realistic share of each credit's face value, and `caps` / `firstYearFee` are counted in the math.
- Re-check offers regularly (monthly is a reasonable cadence) and update `AS_OF` when you do.

## Run locally

Each directory is a static site (no build step). From any of the three folders:

```bash
npm install
npm run dev
```

Or just open `public/index.html` with any static file server.

## Deploy to Cloudflare

Each folder is its own Cloudflare Worker that serves static assets only (`wrangler.jsonc` → `assets.directory: ./public`). Worker names: `creditcard-finder`, `creditcard-matchmaker`, `creditcard-explorer`.

**Git-connected (Workers Builds):** create one Worker per prototype, connect this repo, and set:

- **Root directory:** `a-finder` (or `b-matchmaker` / `c-explorer`)
- **Build command:** *(leave empty)*
- **Deploy command:** `npx wrangler deploy`

The Worker name in the dashboard should match the `name` in that folder's `wrangler.jsonc` (or edit the file to match yours).

**Manual:** `cd a-finder && npx wrangler deploy`

## Editing card data

Edit `shared/cards.js`, then copy it into all three prototypes:

```bash
node scripts/sync-cards.mjs
```

Each prototype keeps its own copy in `public/cards.js` so every folder deploys on its own.
