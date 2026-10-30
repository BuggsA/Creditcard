# Creditcard — three design directions

Three standalone prototypes of a "find the credit card for you" site. Each one handles the same goal (search by benefits, read and compare cards easily) in a deliberately different way, so you can pick a direction and build from there.

| Dir | Name | Feel | How you find a card |
| --- | --- | --- | --- |
| [`a-finder/`](a-finder) | **CardCompass** | Clean, airy, light blue. Familiar "catalog" UX. | Tap benefit tiles → filter sidebar with chips + sort → card detail → side-by-side compare (up to 4, "only show differences"). |
| [`b-matchmaker/`](b-matchmaker) | **Kindred** | Warm cream & coral, serif type, friendly copy. | 5-question quiz, one question per screen → one top pick with plain-English "why it fits you" → runners-up, head-to-head verdicts, full ranked list. |
| [`c-explorer/`](c-explorer) | **Ledger** | Dark, data-dense, monospace numbers. For power users. | Enter your monthly spending (sliders/presets) + must-have toggles → sortable table of *your* dollar value per card, stacked value bars, expandable rows, compare dock that tells you what spending would flip the winner. |

All card names, issuers and offers are **fictional sample data** (`shared/cards.js`).

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
