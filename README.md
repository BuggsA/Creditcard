# Creditcard — three design directions

Three standalone prototypes of a "find the credit card for you" site. Each one handles the same goal (search by benefits, read and compare cards easily) in a deliberately different way, so you can pick a direction and build from there.

| Dir | Name | Feel | How you find a card |
| --- | --- | --- | --- |
| [`a-finder/`](a-finder) | **CardCompass** | Clean, airy, light blue. Familiar "catalog" UX. | Tap benefit tiles → filter sidebar with chips + sort → card detail → side-by-side compare (up to 4, "only show differences"). |
| [`b-matchmaker/`](b-matchmaker) | **Kindred** | Warm cream & coral, serif type, friendly copy. | 5-question quiz, one question per screen → one top pick with plain-English "why it fits you" → runners-up, head-to-head verdicts, full ranked list. |
| [`c-explorer/`](c-explorer) | **Ledger** | Dark, data-dense, monospace numbers. For power users. | Enter your monthly spending (sliders/presets) + must-have toggles → sortable table of *your* dollar value per card, stacked value bars, expandable rows, compare dock that tells you what spending would flip the winner. See [Ledger features](#ledger-features). |

## Card data

`shared/cards.js` holds 36 real US cards (Chase, American Express, Capital One, Citi, Wells Fargo, Bank of America, Discover), covering travel, hotel, airline, cash back, 0% APR and credit-building cards. Offers were researched from issuer pages and card-review sites on the `AS_OF` date in that file.

- **Welcome offers change often and many vary by applicant.** Cards whose offer conflicted across sources carry an `offerNote` that is shown to visitors. Every card links to its issuer's site.
- **APRs are not listed**, because they depend on the applicant. The sites say "Variable — set by issuer".
- **Values are estimates**: `pointValue` is our cents-per-point estimate, `credits[].value` is a realistic share of each credit's face value, and `caps` / `firstYearFee` are counted in the math.
- Re-check offers regularly (monthly is a reasonable cadence) and update `AS_OF` when you do.

## Ledger features

Built around the questions people ask most on card forums (e.g. r/CreditCards' recommendation template):

- **Cards I already have** — add your current cards and every row shows only what a new card *adds* on top of them ("what should my next card be?").
- **Is the fee worth it after year one?** — a "Yr 2+" column (▲ = beats the best no-fee card for you) and a plain-English verdict in each row, including how much of a card's credits you'd need to use to break even.
- **Can I get it?** — Chase 5/24 check from "cards opened in the last 24 months" (with an option to hide likely denials), plus each issuer's bonus/application rules.
- **Walmart / Target / Costco** — move part of your grocery spend to stores most cards don't count as groceries; network notes flag that Costco warehouses only take Visa.
- **Spending abroad** — foreign transaction fees are subtracted from cards that charge them.
- **Your assumptions** — value points at simple redemptions (≈1¢), our estimate, or transfer partners (≈2¢); count credits at nothing, a realistic share, or full face value.
- **Share setup** — the URL always encodes your spending, wallet and assumptions, so a link reproduces the exact table.

## Ledger: search & sharing

Ledger is built to be found in search and to look good when shared:

- **Guide pages search engines can read** — `c-explorer/public/cards/<id>/` (one "is it worth it?" breakdown per card) and `c-explorer/public/best/<slug>/` (best cards for groceries, dining, travel, hotels, airlines, no annual fee, sign-up bonuses, 0% APR and building credit). Each links into the calculator with the matching spending pre-filled.
- **Tags on every page** — title, description, canonical URL, Open Graph and Twitter/X preview tags, plus schema.org structured data (`CreditCard`, `ItemList`, `BreadcrumbList`, `WebApplication`).
- **Share images** — a 1200×630 preview image for the home page and for every card (`c-explorer/public/og/`), plus app icons and a web app manifest for "Add to Home Screen".
- **`sitemap.xml` and `robots.txt`**, and real 404s for unknown URLs.
- **Sharing in the app** — "Share setup" opens the phone's share sheet (or copies the link on desktop); each expanded card has "Share card" and "Full breakdown" links.

Pages are written with a `{{SITE}}` placeholder. The small Worker in `c-explorer/src/worker.js` replaces it with whatever domain the site is served from, so canonical links, previews and the sitemap are correct on `workers.dev` and on a custom domain without any config.

After editing card data, regenerate from the repo root:

```bash
node scripts/sync-cards.mjs
```

```bash
node scripts/build-ledger-pages.mjs
```

```bash
node scripts/build-ledger-images.mjs
```

The images script needs Playwright (`npm i -D playwright && npx playwright install chromium`). Once the site is live, submit `https://<your-domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Run locally

Each directory is a static site (no build step). From any of the three folders:

```bash
npm install
npm run dev
```

Or just open `public/index.html` with any static file server.

## Deploy to Cloudflare

Each folder is its own Cloudflare Worker that serves static assets (`wrangler.jsonc` → `assets.directory: ./public`). Ledger also has a tiny Worker script for its search and sharing URLs (see above); it needs no extra setup. Worker names: `creditcard-finder`, `creditcard-matchmaker`, `creditcard-explorer`.

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
