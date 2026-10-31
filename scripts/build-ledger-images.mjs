// Renders Ledger's share-preview images (Open Graph, 1200×630) and app icons with a headless browser:
//   c-explorer/public/og/default.png, og/<card-id>.png
//   c-explorer/public/icons/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png
// Needs Playwright (npm i -D playwright && npx playwright install chromium). Run from the repo root
// after editing card data:  node scripts/build-ledger-images.mjs
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = "c-explorer/public";
const ctx = { window: {} };
vm.runInNewContext(readFileSync(`${ROOT}/cards.js`, "utf8"), ctx);
const CC = ctx.window.CC;
const { CARDS, DEFAULT_SPEND, REWARD_TYPES, usd } = CC;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COBRANDS = ["Marriott", "Hilton", "World of Hyatt", "Delta", "United", "Discover", "Costco", "IHG"];
const fullName = (c) => (COBRANDS.some((b) => c.name.startsWith(b)) || c.name.startsWith(c.issuer) ? c.name : `${c.issuer} ${c.name}`);
const TOTAL = Object.values(DEFAULT_SPEND).reduce((a, b) => a + b, 0);

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=block" rel="stylesheet">`;
const BASE = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #0b0f14; color: #e6edf3; font-family: "Space Grotesk", system-ui, sans-serif; overflow: hidden; position: relative; }
  body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(900px 500px at 100% 0%, rgba(163,230,53,.10), transparent 60%); }
  .brand { position: absolute; left: 72px; top: 60px; display: flex; align-items: center; gap: 14px; font-weight: 700; letter-spacing: .22em; font-size: 26px; }
  .brand svg { width: 38px; height: 38px; color: #a3e635; }
  .mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
  .foot { position: absolute; left: 72px; bottom: 40px; font-size: 22px; color: #8b98a6; }
  .foot b { color: #a3e635; font-weight: 500; }
  .chip { border-radius: 16px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,.5); }
  .chip::after { content: ""; position: absolute; left: 12%; top: 38%; width: 20%; height: 18%; border-radius: 5px; background: #fbbf24; opacity: .85; }
`;
const logo = CC.icon("bars");

function defaultHtml() {
  const top = CARDS.map((c) => ({ c, v: CC.firstYearValue(c) })).sort((a, b) => b.v - a.v).slice(0, 4);
  const max = top[0].v;
  return `<!doctype html><html><head>${FONTS}<style>${BASE}
    h1 { position: absolute; left: 72px; top: 150px; width: 560px; font-size: 64px; line-height: 1.04; letter-spacing: -0.03em; }
    h1 em { font-style: normal; color: #a3e635; }
    .sub { position: absolute; left: 72px; top: 400px; width: 540px; font-size: 26px; color: #b5c0cb; line-height: 1.35; }
    .board { position: absolute; right: 64px; top: 110px; width: 460px; background: #10161d; border: 1px solid #222c38; border-radius: 22px; padding: 28px 30px; }
    .board h2 { font-size: 15px; letter-spacing: .14em; text-transform: uppercase; color: #8b98a6; font-weight: 500; margin-bottom: 16px; }
    .row { display: grid; grid-template-columns: 54px 1fr auto; gap: 16px; align-items: center; padding: 14px 0; border-top: 1px solid #222c38; }
    .row .chip { width: 54px; aspect-ratio: 1.586; border-radius: 7px; box-shadow: none; }
    .row b { font-size: 21px; font-weight: 500; display: block; }
    .bar { height: 8px; border-radius: 4px; background: #a3e635; margin-top: 8px; }
    .row .mono { font-size: 24px; color: #a3e635; }
  </style></head><body>
    <div class="brand">${logo} LEDGER</div>
    <h1>What is each card <em>actually</em> worth to you?</h1>
    <p class="sub">Enter your spending. See every card's real value in dollars — bonus, rewards, credits and fees.</p>
    <div class="board"><h2>Year-one value · typical spending</h2>
      ${top.map(({ c, v }) => `<div class="row"><span class="chip" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"></span><span><b>${esc(c.name)}</b><div class="bar" style="width:${Math.round((v / max) * 100)}%"></div></span><span class="mono">${usd(v)}</span></div>`).join("")}
    </div>
    <p class="foot">Free · never checks your credit · <b>${CARDS.length} cards</b></p>
  </body></html>`;
}

function cardHtml(c) {
  const y1 = CC.firstYearValue(c), on = CC.ongoingValue(c), bonus = CC.bonusValue(c);
  const name = fullName(c);
  return `<!doctype html><html><head>${FONTS}<style>${BASE}
    .card { position: absolute; right: 80px; top: 92px; width: 340px; aspect-ratio: 1.586; transform: rotate(-4deg); }
    .card span { position: absolute; left: 24px; bottom: 20px; font-size: 20px; color: rgba(255,255,255,.9); font-weight: 500; }
    .issuer { position: absolute; left: 72px; top: 136px; font-size: 24px; color: #8b98a6; }
    h1 { position: absolute; left: 72px; top: 172px; width: 640px; font-size: ${name.length > 26 ? 54 : 64}px; line-height: 1.05; letter-spacing: -0.03em; }
    .q { color: #a3e635; }
    .stats { position: absolute; left: 72px; right: 72px; top: 404px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; background: #222c38; border-radius: 18px; overflow: hidden; border: 1px solid #222c38; }
    .stats div { background: #10161d; padding: 22px 26px; }
    .stats small { display: block; font-size: 15px; letter-spacing: .12em; text-transform: uppercase; color: #8b98a6; }
    .stats .mono { display: block; font-size: 40px; margin-top: 6px; }
    .lime { color: #a3e635; }
  </style></head><body>
    <div class="brand">${logo} LEDGER</div>
    <div class="chip card" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"><span>${esc(c.name)}</span></div>
    <p class="issuer">${esc(c.issuer)} · ${REWARD_TYPES[c.rewardType]}</p>
    <h1>${esc(name)}<br><span class="q">Is it worth it?</span></h1>
    <div class="stats">
      <div><small>Annual fee</small><span class="mono">${usd(c.annualFee)}</span></div>
      <div><small>Sign-up bonus</small><span class="mono">${bonus ? usd(bonus) : "—"}</span></div>
      <div><small>Year 1 value</small><span class="mono lime">${usd(y1)}</span></div>
      <div><small>Each year after</small><span class="mono">${usd(on)}</span></div>
    </div>
    <p class="foot">At typical spending (${usd(TOTAL)}/mo) · <b>see what it's worth for yours</b></p>
  </body></html>`;
}

const iconHtml = (size, pad) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:#0b0f14;display:grid;place-items:center}</style></head><body>
  <svg width="${size - pad * 2}" height="${size - pad * 2}" viewBox="0 0 32 32"><rect x="6.5" y="18" width="5" height="8" rx="1.2" fill="#a3e635"/><rect x="13.5" y="12" width="5" height="14" rx="1.2" fill="#a3e635"/><rect x="20.5" y="6" width="5" height="20" rx="1.2" fill="#a3e635"/></svg></body></html>`;

mkdirSync(`${ROOT}/og`, { recursive: true });
mkdirSync(`${ROOT}/icons`, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
async function shot(html, path, size) {
  if (size) await page.setViewportSize({ width: size, height: size });
  else await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: "networkidle" }).catch(() => page.setContent(html));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, type: "png" });
}
await shot(defaultHtml(), `${ROOT}/og/default.png`);
for (const c of CARDS) await shot(cardHtml(c), `${ROOT}/og/${c.id}.png`);
await shot(iconHtml(192, 8), `${ROOT}/icons/icon-192.png`, 192);
await shot(iconHtml(512, 20), `${ROOT}/icons/icon-512.png`, 512);
await shot(iconHtml(512, 96), `${ROOT}/icons/icon-512-maskable.png`, 512);
await shot(iconHtml(180, 14), `${ROOT}/icons/apple-touch-icon.png`, 180);
await browser.close();
console.log(`wrote ${CARDS.length + 1} share images and 4 app icons`);
