// Generates Ledger's search-engine pages from the card data:
//   c-explorer/public/cards/<id>/index.html   one breakdown page per card
//   c-explorer/public/best/<slug>/index.html  "best card for …" rankings
//   c-explorer/public/sitemap.xml, robots.txt
//   the internal-links block in c-explorer/public/index.html
// Run from the repo root after editing card data:  node scripts/build-ledger-pages.mjs
// Absolute URLs are written as {{SITE}}; the Worker (c-explorer/src/worker.js) fills in the origin.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = "c-explorer/public";
const ctx = { window: {} };
vm.runInNewContext(readFileSync(`${ROOT}/cards.js`, "utf8"), ctx);
const CC = ctx.window.CC;
const { CARDS, CATEGORIES, PERKS, CREDIT_TIERS, REWARD_TYPES, DEFAULT_SPEND, usd } = CC;
const CATS = Object.keys(CATEGORIES);
const ISO_DATE = new Date(CC.AS_OF + " 12:00 UTC").toISOString().slice(0, 10);
const TOTAL = Object.values(DEFAULT_SPEND).reduce((a, b) => a + b, 0);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COBRANDS = ["Marriott", "Hilton", "World of Hyatt", "Delta", "United", "Discover", "Costco", "IHG"];
const fullName = (c) => (COBRANDS.some((b) => c.name.startsWith(b)) || c.name.startsWith(c.issuer) ? c.name : `${c.issuer} ${c.name}`);
const appLink = (spend, extra = {}) => {
  const p = new URLSearchParams({ s: CATS.map((k) => spend[k] || 0).join("."), ...extra });
  return "/#" + p.toString();
};

// ---------- value math (mirrors the app's defaults: typical spend, our point values, realistic credits) ----------
function value(c, spend = DEFAULT_SPEND) {
  const rewards = CC.yearlyRewards(c, spend), credits = CC.creditsValue(c), bonus = CC.bonusValue(c);
  return { bonus, rewards, credits, year1: CC.firstYearValue(c, spend), ongoing: CC.ongoingValue(c, spend) };
}
const bestNoFee = (spend, except) =>
  CARDS.filter((c) => c.annualFee === 0 && c.id !== except).map((c) => ({ c, v: value(c, spend) })).sort((a, b) => b.v.ongoing - a.v.ongoing)[0];

// ---------- "best for" pages ----------
const cents = (c, cat) => CC.rate(c, cat) * c.pointValue;
const LIST = [
  { slug: "groceries", title: "Best credit cards for groceries", short: "Groceries",
    intro: "Ranked by what each card is worth every year for a household that spends heavily at the supermarket. Walmart, Target and Costco usually don't count as groceries — Ledger lets you adjust for that.",
    spend: { ...DEFAULT_SPEND, groceries: 900 }, filter: (c) => cents(c, "groceries") >= 3, sort: "ongoing" },
  { slug: "dining", title: "Best credit cards for dining and restaurants", short: "Dining",
    intro: "Ranked by yearly value for someone who eats out a lot. Restaurant rewards on these cards range from about 3¢ to 6¢ per dollar once points are valued.",
    spend: { ...DEFAULT_SPEND, dining: 700 }, filter: (c) => cents(c, "dining") >= 3, sort: "ongoing" },
  { slug: "travel", title: "Best travel credit cards", short: "Travel",
    intro: "Points and miles cards ranked by first-year value for a frequent traveler, including the sign-up bonus, travel credits and annual fee.",
    spend: { dining: 450, groceries: 400, hotels: 450, airfare: 450, gas: 100, streaming: 30, other: 1200 }, filter: (c) => c.rewardType !== "cashback", sort: "year1" },
  { slug: "hotels", title: "Best credit cards for hotel stays", short: "Hotels",
    intro: "Cards with hotel credits, free nights or hotel points, ranked by first-year value for someone who stays in hotels several times a year.",
    spend: { dining: 400, groceries: 400, hotels: 500, airfare: 300, gas: 100, streaming: 30, other: 1000 }, filter: (c) => CC.matches(c, "hotel_credit") || c.rewardType === "hotel", sort: "year1" },
  { slug: "airlines", title: "Best airline credit cards and perks", short: "Airline perks",
    intro: "Cards with free checked bags, lounge access or airline credits, ranked by first-year value for a frequent flyer.",
    spend: { dining: 400, groceries: 400, hotels: 300, airfare: 600, gas: 100, streaming: 30, other: 1000 }, filter: (c) => CC.matches(c, "airline_perks") || CC.matches(c, "lounge"), sort: "year1" },
  { slug: "cash-back", title: "Best cash back credit cards", short: "Cash back",
    intro: "Cash back cards ranked by what they're worth every year on typical spending — flat-rate, grocery, and rotating-category cards side by side, in plain dollars.",
    spend: DEFAULT_SPEND, filter: (c) => c.rewardType === "cashback" && CC.rate(c, "other") > 0, sort: "ongoing" },
  { slug: "no-annual-fee", title: "Best no-annual-fee credit cards", short: "No annual fee",
    intro: "Cards that cost nothing to keep, ranked by what they earn each year on typical spending. A no-fee card is also the benchmark Ledger uses to judge whether a fee card is worth it.",
    spend: DEFAULT_SPEND, filter: (c) => c.annualFee === 0 && CC.rate(c, "other") > 0, sort: "ongoing" },
  { slug: "sign-up-bonus", title: "Best credit card sign-up bonuses", short: "Sign-up bonuses",
    intro: "Welcome offers ranked by their estimated dollar value. Offers change often and many vary by applicant — always confirm the current offer with the issuer.",
    spend: DEFAULT_SPEND, filter: (c) => CC.bonusValue(c) > 0, sort: "bonus" },
  { slug: "0-percent-apr", title: "Best 0% intro APR credit cards", short: "0% intro APR",
    intro: "Cards with the longest 0% interest periods on new purchases, for paying off a big purchase over time. Ties are broken by rewards value.",
    spend: DEFAULT_SPEND, filter: (c) => c.introApr >= 12, sort: "apr" },
  { slug: "building-credit", title: "Best credit cards for building credit", short: "Building credit",
    intro: "Cards designed for people with limited or damaged credit, including secured cards that need a refundable deposit.",
    spend: DEFAULT_SPEND, filter: (c) => c.creditTier === "fair", sort: "ongoing" },
];

// ---------- page shell ----------
function page({ path, title, description, image = "/og/default.png", jsonld, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="{{SITE}}${path}" />
  <meta name="theme-color" content="#0b0f14" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Ledger" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="{{SITE}}${path}" />
  <meta property="og:image" content="{{SITE}}${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="{{SITE}}${image}" />
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/page.css" />
  <script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
</head>
<body>
  <header class="top">
    <a class="brand" href="/">${CC.icon("bars", "glyph")} LEDGER</a>
    <a class="cta-top" href="/">${CC.icon("sliders")} <span class="label-long">Try it with your spending</span><span class="label-short">Try it</span></a>
  </header>
  <main class="wrap">
${body}
  </main>
  <footer class="wrap foot">
    <nav aria-label="Best cards by category"><h2>Best cards for…</h2>${LIST.map((l) => `<a href="/best/${l.slug}/">${esc(l.short)}</a>`).join("")}</nav>
    <p>Offers checked ${esc(CC.AS_OF)}. Terms change often and many vary by applicant — always confirm with the issuer before applying. Values are estimates using our point valuations and a realistic share of each card's credits. Ledger never checks your credit.</p>
  </footer>
</body>
</html>
`;
}
const crumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `{{SITE}}${path}` })),
});
const cardSchema = (c, v) => ({
  "@type": "CreditCard",
  name: fullName(c),
  url: `{{SITE}}/cards/${c.id}/`,
  provider: { "@type": "BankOrCreditUnion", name: c.issuer },
  feesAndCommissionsSpecification: `Annual fee ${usd(c.annualFee)}${c.firstYearFee === 0 && c.annualFee ? " ($0 the first year)" : ""}; foreign transaction fee ${c.ftf ? c.ftfRate || "3%" : "none"}.`,
  description: `${c.bestFor[0]}. Estimated ${usd(v.year1)} net value in year one on typical spending.`,
});

// ---------- card pages ----------
function cardPage(c) {
  const v = value(c);
  const nf = bestNoFee(DEFAULT_SPEND, c.id);
  const name = fullName(c);
  const feeLine = c.annualFee ? `${usd(c.annualFee)} annual fee${c.firstYearFee === 0 ? " ($0 the first year)" : ""}` : "no annual fee";
  let verdict;
  if (!c.annualFee) verdict = `<p class="verdict good"><b>No annual fee</b> — nothing to lose by keeping it open, which also helps your credit history.</p>`;
  else if (v.ongoing > nf.v.ongoing)
    verdict = `<p class="verdict good"><b>Worth keeping after year one</b> for typical spending: it nets about ${usd(v.ongoing - nf.v.ongoing)} a year more than the ${esc(fullName(nf.c))}, the best no-fee card for the same spending.</p>`;
  else
    verdict = `<p class="verdict warn"><b>Probably not worth the fee after year one</b> for typical spending: the no-fee ${esc(fullName(nf.c))} would net about ${usd(nf.v.ongoing - v.ongoing)} a year more. It can still make sense if you spend more in its bonus categories or use more of its credits.</p>`;
  const similar = CARDS.filter((x) => x.id !== c.id && x.rewardType === c.rewardType).slice(0, 4);
  const long = `${name}: is it worth it? Real value calculator`;
  const title = long.length <= 70 ? long : `${name}: is it worth it?`;
  const shortFee = c.annualFee ? `${usd(c.annualFee)} fee${c.firstYearFee === 0 ? " ($0 year 1)" : ""}` : "No annual fee";
  const description = `${name}: ${shortFee}, ${CC.bonusValue(c) ? `≈${usd(CC.bonusValue(c))} sign-up bonus` : "no sign-up bonus"}, ≈${usd(v.year1)} net value in year one. See what it's worth for your spending.`;
  const body = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Ledger</a> › <span>${esc(name)}</span></nav>
    <article>
      <div class="hero">
        <span class="chip" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"></span>
        <div>
          <p class="eyebrow">${esc(c.issuer)} · ${REWARD_TYPES[c.rewardType]} · ${esc(c.network)}</p>
          <h1>${esc(name)}: what it's really worth</h1>
        </div>
      </div>
      <p class="lead">The ${esc(name)} has a ${feeLine}. For a typical household spending ${usd(TOTAL)} a month, it's worth about <b>${usd(v.year1)}</b> in year one and <b>${usd(v.ongoing)}</b> each year after.</p>
      <div class="stats">
        <div><span>Annual fee</span><b>${usd(c.annualFee)}</b>${c.firstYearFee === 0 && c.annualFee ? "<small>$0 the first year</small>" : ""}</div>
        <div><span>Sign-up bonus</span><b>${CC.bonusValue(c) ? usd(CC.bonusValue(c)) : "None"}</b>${c.bonus.amount ? `<small>${esc(CC.bonusLabel(c))} ${CC.bonusTerms(c, true)}</small>` : ""}</div>
        <div><span>Net value · year 1</span><b class="lime">${usd(v.year1)}</b></div>
        <div><span>Net value · each year after</span><b>${usd(v.ongoing)}</b></div>
      </div>
      ${c.offerNote ? `<p class="note">${esc(c.offerNote)}</p>` : ""}
      <a class="cta" href="${appLink(DEFAULT_SPEND, { card: c.id })}">${CC.icon("sliders")} Calculate it with your own spending</a>

      <h2>Is the annual fee worth it?</h2>
      ${verdict}

      <h2>How you earn</h2>
      <table class="t">
        <thead><tr><th>Category</th><th>Rate</th><th>Value per $1</th><th>Per year*</th></tr></thead>
        <tbody>${CATS.map((k) => `<tr><td>${CC.icon(CATEGORIES[k].icon)} ${CATEGORIES[k].label}</td><td>${CC.rateLabel(c, k)}</td><td>${(cents(c, k)).toFixed(1)}¢</td><td>${usd(CC.yearlyRewards(c, { [k]: DEFAULT_SPEND[k] }))}</td></tr>`).join("")}</tbody>
      </table>
      <p class="small">*At typical monthly spending: ${CATS.map((k) => `${CATEGORIES[k].label.toLowerCase()} ${usd(DEFAULT_SPEND[k])}`).join(", ")}. ${c.earnNote ? esc(c.earnNote) : ""}</p>

      ${c.credits.length || c.perks.length ? `<h2>Credits and perks</h2>
      <ul class="list">
        ${c.credits.map((x) => `<li><b>${usd(x.amount)} ${esc(CC.midSentence(x.label))}</b> — ${esc(x.ease)}. <span class="muted">We count about ${usd(x.value)} a year, since most people don't use every dollar.</span></li>`).join("")}
        ${c.perks.map((p) => `<li>${esc(PERKS[p])}</li>`).join("")}
        <li>Foreign transaction fee: ${c.ftf ? c.ftfRate || "3%" : "none"}</li>
      </ul>` : ""}

      <h2>Who it's for</h2>
      <ul class="list pros">${c.bestFor.map((x) => `<li>${CC.icon("check")} ${esc(x)}</li>`).join("")}${c.notFor.map((x) => `<li class="con">${CC.icon("x")} Not ideal: ${esc(x)}</li>`).join("")}</ul>

      <h2>Can I get it?</h2>
      <ul class="list">
        <li><b>Recommended credit:</b> ${CREDIT_TIERS[c.creditTier]}${c.secured ? ` · ${esc(c.secured)}` : ""}</li>
        <li><b>${esc(c.issuer)} rules:</b> ${esc(CC.issuerRule(c))}</li>
        <li><b>${esc(c.network)}:</b> ${esc(CC.networkNote(c))}</li>
      </ul>
      <p><a class="out" href="${CC.issuerUrl(c)}" rel="nofollow noopener" target="_blank">Check the current offer at ${esc(c.issuer)} ${CC.icon("external")}</a></p>

      ${similar.length ? `<h2>Similar cards</h2><div class="similar">${similar.map((x) => `<a href="/cards/${x.id}/"><span class="chip sm" style="background:linear-gradient(135deg,${x.colors[0]},${x.colors[1]})"></span><span><b>${esc(fullName(x))}</b><small>${usd(value(x).year1)} year 1 · ${usd(x.annualFee)} fee</small></span></a>`).join("")}</div>` : ""}
      <p class="small">Updated ${esc(CC.AS_OF)}.</p>
    </article>`;
  const jsonld = { "@context": "https://schema.org", "@graph": [cardSchema(c, v), crumbs([["Ledger", "/"], [name, `/cards/${c.id}/`]])] };
  return page({ path: `/cards/${c.id}/`, title, description, image: `/og/${c.id}.png`, jsonld, body });
}

// ---------- best-for pages ----------
function listPage(l) {
  const sorters = {
    ongoing: (a, b) => b.v.ongoing - a.v.ongoing,
    year1: (a, b) => b.v.year1 - a.v.year1,
    bonus: (a, b) => b.v.bonus - a.v.bonus,
    apr: (a, b) => b.c.introApr - a.c.introApr || b.v.ongoing - a.v.ongoing,
  };
  const rows = CARDS.filter(l.filter).map((c) => ({ c, v: value(c, l.spend) })).sort(sorters[l.sort]);
  const total = Object.values(l.spend).reduce((a, b) => a + b, 0);
  const top = rows[0];
  const title = `${l.title} (${new Date(ISO_DATE).getUTCFullYear()}) — ranked by real value`;
  const description = `${l.title}, ranked by real dollar value. #1: ${fullName(top.c)}. Rerun the ranking with your own spending.`;
  const body = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Ledger</a> › <span>${esc(l.short)}</span></nav>
    <article>
      <h1>${esc(l.title)}</h1>
      <p class="lead">${esc(l.intro)}</p>
      <p class="small">Based on ${usd(total)}/month spending: ${CATS.filter((k) => l.spend[k]).map((k) => `${CATEGORIES[k].label.toLowerCase()} ${usd(l.spend[k])}`).join(", ")}.</p>
      <a class="cta" href="${appLink(l.spend)}">${CC.icon("sliders")} Rerun this ranking with your spending</a>
      <ol class="rank">
        ${rows.map(({ c, v }, i) => `
        <li>
          <span class="n">${i + 1}</span>
          <span class="chip sm" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"></span>
          <div class="who"><a href="/cards/${c.id}/"><b>${esc(fullName(c))}</b></a><small>${esc(c.bestFor[0])}</small></div>
          <dl>
            <div><dt>Fee</dt><dd>${usd(c.annualFee)}</dd></div>
            ${l.sort === "apr" ? `<div><dt>0% APR</dt><dd>${c.introApr} mo</dd></div>` : `<div><dt>Bonus</dt><dd>${v.bonus ? usd(v.bonus) : "—"}</dd></div>`}
            <div><dt>Year 1</dt><dd class="lime">${usd(v.year1)}</dd></div>
            <div><dt>Yr 2+</dt><dd>${usd(v.ongoing)}</dd></div>
          </dl>
        </li>`).join("")}
      </ol>
      <h2>How we rank</h2>
      <p>Ledger adds up each card's sign-up bonus, the rewards it earns on the spending above (respecting caps), and a realistic share of its credits, then subtracts the annual fee. Points are valued at our estimates — in the calculator you can switch to cash-out (≈1¢) or transfer-partner (≈2¢) values, add the cards you already have, and see which new card adds the most.</p>
      <p class="small">Updated ${esc(CC.AS_OF)}.</p>
    </article>`;
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ItemList", name: l.title, itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: rows.map(({ c, v }, i) => ({ "@type": "ListItem", position: i + 1, item: cardSchema(c, v) })) },
      crumbs([["Ledger", "/"], [l.short, `/best/${l.slug}/`]]),
    ],
  };
  return page({ path: `/best/${l.slug}/`, title, description, jsonld, body });
}

// ---------- write everything ----------
for (const dir of ["cards", "best"]) if (existsSync(`${ROOT}/${dir}`)) rmSync(`${ROOT}/${dir}`, { recursive: true });
for (const c of CARDS) {
  mkdirSync(`${ROOT}/cards/${c.id}`, { recursive: true });
  writeFileSync(`${ROOT}/cards/${c.id}/index.html`, cardPage(c));
}
for (const l of LIST) {
  mkdirSync(`${ROOT}/best/${l.slug}`, { recursive: true });
  writeFileSync(`${ROOT}/best/${l.slug}/index.html`, listPage(l));
}

const urls = ["/", ...LIST.map((l) => `/best/${l.slug}/`), ...CARDS.map((c) => `/cards/${c.id}/`)];
writeFileSync(`${ROOT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>{{SITE}}${u}</loc><lastmod>${ISO_DATE}</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(`${ROOT}/robots.txt`, `User-agent: *
Allow: /

Sitemap: {{SITE}}/sitemap.xml
`);

// Crawlable links on the home page (between the seo:links markers).
const index = readFileSync(`${ROOT}/index.html`, "utf8");
const links = `<!-- seo:links -->
      <section class="seo-links" aria-label="Guides">
        <div><h2>Best cards for…</h2>${LIST.map((l) => `<a href="/best/${l.slug}/">${esc(l.short)}</a>`).join("")}</div>
        <div><h2>Card breakdowns</h2>${CARDS.map((c) => `<a href="/cards/${c.id}/">${esc(fullName(c))}</a>`).join("")}</div>
      </section>
      <!-- /seo:links -->`;
writeFileSync(`${ROOT}/index.html`, index
  .replace(/<!-- seo:links -->[\s\S]*?<!-- \/seo:links -->/, links)
  .replace(/\b\d+ popular credit cards\b/g, `${CARDS.length} popular credit cards`));
console.log(`wrote ${CARDS.length} card pages, ${LIST.length} best-for pages, sitemap (${urls.length} URLs), robots.txt`);
