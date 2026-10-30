(function () {
  const { CARDS, BENEFITS, CATEGORIES, PERKS, CREDIT_TIERS, REWARD_TYPES, DEFAULT_SPEND, usd } = CC;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = Object.keys(CATEGORIES);

  const PRESETS = {
    Light: { dining: 100, groceries: 250, hotels: 0, airfare: 0, gas: 80, streaming: 20, other: 400 },
    Typical: DEFAULT_SPEND,
    Foodie: { dining: 700, groceries: 800, hotels: 50, airfare: 50, gas: 120, streaming: 40, other: 700 },
    Traveler: { dining: 450, groceries: 400, hotels: 450, airfare: 450, gas: 100, streaming: 30, other: 1200 },
    "Big spender": { dining: 900, groceries: 900, hotels: 400, airfare: 400, gas: 250, streaming: 60, other: 4000 },
  };

  const DEFAULTS = {
    spend: { ...DEFAULT_SPEND }, must: [], maxFee: 900, credit: "excellent", horizon: 1,
    wallet: [], n524: 0, hide524: false, superstore: 0, abroad: 0, pv: "typical", creditMode: "realistic",
  };
  const state = {
    ...DEFAULTS, spend: { ...DEFAULTS.spend },
    q: "", sort: { key: "net", dir: -1 }, open: null, selected: [], diffOnly: false, dockMin: false,
  };

  // ---------- persistence: shareable URL first, then this browser's last setup ----------
  const SHARE_KEYS = { m: "must", f: "maxFee", cr: "credit", h: "horizon", w: "wallet", n: "n524", x: "hide524", g: "superstore", a: "abroad", pv: "pv", cm: "creditMode" };
  const LISTS = ["must", "wallet"];
  function toHash() {
    const p = new URLSearchParams();
    p.set("s", CATS.map((k) => state.spend[k] || 0).join("."));
    for (const [short, key] of Object.entries(SHARE_KEYS)) {
      const v = state[key], d = DEFAULTS[key];
      if (LISTS.includes(key) ? v.length : v !== d) p.set(short, LISTS.includes(key) ? v.join(",") : v);
    }
    return "#" + p.toString();
  }
  function fromHash(h) {
    const p = new URLSearchParams(h.replace(/^#/, ""));
    if (!p.has("s")) return false;
    p.get("s").split(".").forEach((v, i) => { if (CATS[i]) state.spend[CATS[i]] = Math.max(0, +v || 0); });
    for (const [short, key] of Object.entries(SHARE_KEYS)) {
      if (!p.has(short)) continue;
      const v = p.get(short);
      const d = DEFAULTS[key];
      state[key] = LISTS.includes(key) ? v.split(",").filter(Boolean) : typeof d === "number" ? +v || 0 : typeof d === "boolean" ? v === "true" : v;
    }
    return true;
  }
  if (!fromHash(location.hash)) {
    try {
      const saved = JSON.parse(localStorage.getItem("cc-c-state") || "{}");
      Object.assign(state, saved, { open: null, q: "" });
      state.spend = { ...DEFAULTS.spend, ...saved.spend };
    } catch (e) {}
  }
  state.wallet = state.wallet.filter(CC.byId);
  if (!["cash", "typical", "optimistic"].includes(state.pv)) state.pv = "typical";
  if (!["none", "realistic", "full"].includes(state.creditMode)) state.creditMode = "realistic";

  function persist() {
    try {
      const keep = {};
      for (const k of [...Object.keys(DEFAULTS), "sort", "selected"]) keep[k] = state[k];
      localStorage.setItem("cc-c-state", JSON.stringify(keep));
    } catch (e) {}
    try { history.replaceState(null, "", toHash()); } catch (e) {}
  }

  // ---------- math ----------
  // Card copy with the visitor's point-valuation and credit-counting assumptions applied.
  function adjust(c) {
    let f = 1;
    if (c.rewardType !== "cashback") {
      if (state.pv === "cash") f = (c.rewardType === "points" ? 1 : c.pointValue * 0.6) / c.pointValue;
      if (state.pv === "optimistic") f = 1.35;
    }
    const credits = c.credits.map((x) => ({ ...x, value: state.creditMode === "none" ? 0 : state.creditMode === "full" ? x.amount : x.value }));
    const bonus = c.bonus.value != null ? { ...c.bonus, value: c.bonus.value * f } : c.bonus;
    return { ...c, pointValue: c.pointValue * f, credits, bonus };
  }
  function effSpend() {
    const s = { ...state.spend };
    const moved = (s.groceries * state.superstore) / 100;
    s.groceries -= moved;
    s.other += moved;
    return s;
  }
  const catRewards = (a, cat, sp) => CC.yearlyRewards(a, { [cat]: sp[cat] || 0 });
  const ftfPct = (c) => (c.ftf ? parseFloat(c.ftfRate || "3") / 100 : 0);
  // Rewards earned abroad minus foreign transaction fees.
  const abroadNet = (a) => state.abroad * ((CC.rate(a, "other") * a.pointValue) / 100 - ftfPct(a));

  // Best yearly earnings per category across the cards the visitor already has.
  function walletBaseline(sp) {
    const cards = state.wallet.map(CC.byId).map(adjust);
    const best = {};
    for (const k of CATS) best[k] = Math.max(0, ...cards.map((a) => catRewards(a, k, sp)));
    best.abroad = cards.length ? Math.max(...cards.map(abroadNet)) : 0;
    best.total = CATS.reduce((s, k) => s + best[k], 0) + best.abroad;
    return { cards, best };
  }

  let ctx; // per-render: effective spend, wallet baseline, best no-fee card
  function calc(c) {
    const a = adjust(c);
    const H = state.horizon;
    const hasWallet = ctx.wallet.cards.length > 0;
    const perCat = {};
    let rewards = 0;
    for (const k of CATS) {
      const v = catRewards(a, k, ctx.sp);
      perCat[k] = hasWallet ? Math.max(0, v - ctx.wallet.best[k]) : v;
      rewards += perCat[k];
    }
    const ab = abroadNet(a);
    rewards += hasWallet ? Math.max(0, ab - ctx.wallet.best.abroad) : ab;
    const bonus = CC.bonusValue(a), credits = CC.creditsValue(a), fee = c.annualFee;
    const feeTotal = CC.firstYearFee(c) + (H - 1) * fee;
    const ongoing = rewards + credits - fee;
    return {
      c, a, perCat, bonus, rewards, credits, fee, feeTotal, ongoing,
      net: bonus + H * (rewards + credits) - feeTotal,
      pos: bonus + H * Math.max(0, rewards + credits),
      blocked524: likely524(c),
    };
  }
  const likely524 = (c) => c.issuer === "Chase" && state.n524 >= 5;
  const tierOk = { excellent: ["fair", "good", "excellent"], good: ["fair", "good"], fair: ["fair"] };
  function visible(c) {
    if (state.wallet.includes(c.id)) return false;
    if (state.hide524 && likely524(c)) return false;
    if (c.annualFee > state.maxFee) return false;
    if (!tierOk[state.credit].includes(c.creditTier)) return false;
    if (!state.must.every((k) => CC.matches(c, k))) return false;
    if (state.q) {
      const hay = [c.name, c.issuer, c.network, REWARD_TYPES[c.rewardType], ...c.perks.map((p) => PERKS[p]), ...CC.highlights(c)].join(" ").toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    return true;
  }
  function buildCtx() {
    ctx = { sp: effSpend(), wallet: walletBaseline(effSpend()) };
    ctx.noFee = CARDS.filter((c) => c.annualFee === 0 && !state.wallet.includes(c.id))
      .map(calc).sort((x, y) => y.ongoing - x.ongoing)[0];
  }

  // ---------- panel ----------
  function buildPanel() {
    $("#presets").innerHTML = Object.keys(PRESETS).map((k) => `<button data-p="${k}">${k}</button>`).join("");
    $("#sliders").innerHTML = Object.entries(CATEGORIES).map(([k, cat]) => `
      <div class="slider">
        <span class="ic">${CC.icon(cat.icon)}</span>
        <span class="lbl">${cat.label}</span>
        <input type="range" min="0" max="${k === "other" ? 5000 : 1500}" step="10" data-cat="${k}" aria-label="${cat.label} per month" />
        <input type="number" min="0" step="10" data-num="${k}" aria-label="${cat.label} dollars per month" />
      </div>`).join("");
    $("#facets").innerHTML = Object.entries(BENEFITS).map(([k, b]) => `<button class="facet" data-m="${k}" aria-pressed="false">${b.label}</button>`).join("");

    $("#presets").addEventListener("click", (e) => {
      const p = e.target.dataset.p;
      if (!p) return;
      state.spend = { ...PRESETS[p] };
      syncPanel(); render();
    });
    $("#sliders").addEventListener("input", (e) => {
      const k = e.target.dataset.cat || e.target.dataset.num;
      if (!k) return;
      state.spend[k] = Math.max(0, +e.target.value || 0);
      syncPanel(e.target); render();
    });
    $("#facets").addEventListener("click", (e) => {
      const k = e.target.dataset.m;
      if (!k) return;
      state.must = state.must.includes(k) ? state.must.filter((x) => x !== k) : [...state.must, k];
      syncPanel(); render();
    });
    $("#wallet-add").onchange = (e) => { if (e.target.value) addWallet(e.target.value); };
    $("#wallet").addEventListener("click", (e) => {
      const b = e.target.closest("[data-w]");
      if (b) { state.wallet = state.wallet.filter((x) => x !== b.dataset.w); syncPanel(); render(); }
    });
    $("#clear-wallet").onclick = () => { state.wallet = []; syncPanel(); render(); };
    $("#clear-must").onclick = () => { state.must = []; syncPanel(); render(); };
    const num = (id, key) => ($(id).oninput = (e) => { state[key] = Math.max(0, +e.target.value || 0); syncPanel(e.target); render(); });
    num("#n524", "n524");
    num("#abroad", "abroad");
    num("#superstore", "superstore");
    num("#fee", "maxFee");
    $("#hide524").onchange = (e) => { state.hide524 = e.target.checked; render(); };
    $("#credit").onchange = (e) => { state.credit = e.target.value; render(); };
    $("#horizon").onchange = (e) => { state.horizon = +e.target.value; render(); };
    $("#pv").onchange = (e) => { state.pv = e.target.value; render(); };
    $("#creditmode").onchange = (e) => { state.creditMode = e.target.value; render(); };
    $("#q").oninput = (e) => { state.q = e.target.value.trim(); render(); };
    $("#toggle-panel").onclick = () => setPanel(!$("#panel").classList.contains("open"));
    $("#scrim").onclick = () => setPanel(false);
    $("#setbar").onclick = () => setPanel(true);
    $("#panel-done").onclick = () => setPanel(false);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setPanel(false); });
    $("#share").onclick = share;
  }
  // Plain-language list of everything the visitor has changed from the defaults.
  function activeSettings() {
    const out = [];
    const must = state.must.map((k) => BENEFITS[k].label);
    if (must.length) out.push(must.length > 2 ? `${must.slice(0, 2).join(", ")} +${must.length - 2}` : must.join(", "));
    if (state.maxFee < 900) out.push(state.maxFee ? `Fee ≤ ${usd(state.maxFee)}` : "No annual fee");
    if (state.credit !== "excellent") out.push(`${CREDIT_TIERS[state.credit]} credit`);
    if (state.horizon > 1) out.push(`${state.horizon}-year view`);
    if (state.wallet.length) out.push(`${state.wallet.length} card${state.wallet.length > 1 ? "s" : ""} I have`);
    if (state.n524) out.push(`${state.n524} new cards / 24 mo`);
    if (state.superstore) out.push(`${state.superstore}% groceries at superstores`);
    if (state.abroad) out.push(`${usd(state.abroad)}/yr abroad`);
    if (state.pv !== "typical") out.push(state.pv === "cash" ? "Points ≈1¢" : "Points ≈2¢");
    if (state.creditMode !== "realistic") out.push(state.creditMode === "none" ? "Credits ignored" : "Credits at full value");
    return out;
  }
  function renderSetbar() {
    const total = Object.values(state.spend).reduce((a, b) => a + b, 0);
    const preset = Object.keys(PRESETS).find((k) => JSON.stringify(PRESETS[k]) === JSON.stringify(state.spend));
    const tags = activeSettings();
    $("#setbar").innerHTML = `
      <span class="sb-main">Based on <b>${usd(total)}/mo</b> spending${preset ? ` <span class="sb-preset">(${preset})</span>` : ""}</span>
      <span class="sb-tags">${tags.length ? tags.map((t) => `<i>${esc(t)}</i>`).join("") : `<i class="none">No filters</i>`}</span>
      <span class="sb-edit">Edit</span>`;
    const badge = $("#filter-badge");
    badge.hidden = !tags.length;
    badge.textContent = tags.length;
  }

  // Phone/tablet: the settings panel slides over the table.
  function setPanel(open) {
    $("#panel").classList.toggle("open", open);
    document.body.classList.toggle("panel-open", open);
    $("#toggle-panel").setAttribute("aria-expanded", open);
  }
  function addWallet(id) {
    if (!state.wallet.includes(id)) state.wallet.push(id);
    state.selected = state.selected.filter((x) => x !== id);
    if (state.open === id) state.open = null;
    syncPanel(); render();
  }
  function syncPanel(skip) {
    document.querySelectorAll("[data-cat],[data-num]").forEach((el) => {
      if (el !== skip) el.value = state.spend[el.dataset.cat || el.dataset.num];
    });
    const total = Object.values(state.spend).reduce((a, b) => a + b, 0);
    $("#total").textContent = usd(total) + "/mo";
    document.querySelectorAll("[data-p]").forEach((b) => b.classList.toggle("on", JSON.stringify(PRESETS[b.dataset.p]) === JSON.stringify(state.spend)));
    document.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", state.must.includes(b.dataset.m)));
    $("#wallet-add").innerHTML = `<option value="">+ Add a card you have…</option>` +
      CARDS.filter((c) => !state.wallet.includes(c.id)).map((c) => `<option value="${c.id}">${esc(c.issuer)} ${esc(c.name)}</option>`).join("");
    $("#wallet").innerHTML = state.wallet.map(CC.byId).map((c) => `<button data-w="${c.id}" title="Remove">${esc(c.name)} <span>×</span></button>`).join("");
    $("#wallet-hint").hidden = state.wallet.length > 0;
    $("#clear-wallet").hidden = !state.wallet.length;
    $("#wallet-count").textContent = state.wallet.length ? `${state.wallet.length} added` : "optional";
    for (const [id, key] of [["#n524", "n524"], ["#abroad", "abroad"], ["#superstore", "superstore"], ["#fee", "maxFee"]]) {
      if ($(id) !== skip) $(id).value = state[key];
    }
    $("#hide524").checked = state.hide524;
    $("#ss-out").textContent = state.superstore + "%";
    $("#fee-out").textContent = state.maxFee >= 900 ? "any" : "≤ " + usd(state.maxFee);
    $("#credit").value = state.credit;
    $("#horizon").value = state.horizon;
    $("#pv").value = state.pv;
    $("#creditmode").value = state.creditMode;
  }
  // Phones get the native share sheet; desktops copy the link. `btn` shows a "Copied" confirmation.
  async function shareLink({ url, title, text }, btn) {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ url, title, text }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const original = btn.innerHTML;
    const done = () => {
      btn.innerHTML = `${CC.icon("check")} <span>Copied</span>`;
      btn.classList.add("done");
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove("done"); }, 1800);
    };
    try {
      await navigator.clipboard.writeText(url);
      done();
    } catch (e) {
      prompt("Copy this link:", url);
    }
  }
  let lastBest = null;
  function share() {
    persist();
    const text = lastBest
      ? `${lastBest.c.name} comes out on top for my spending on Ledger (${usd(lastBest.net)} in year one). See what each card is worth for yours:`
      : "See what each credit card is actually worth for your spending:";
    shareLink({ url: location.href, title: "Ledger — my card rankings", text }, $("#share"));
  }

  // ---------- table ----------
  const SORTERS = {
    name: (r) => r.c.name, fee: (r) => r.fee, bonus: (r) => r.bonus, rewards: (r) => r.rewards, credits: (r) => r.credits, net: (r) => r.net, ongoing: (r) => r.ongoing,
  };
  document.querySelectorAll("th[data-sort]").forEach((th) =>
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: k === "name" || k === "fee" ? 1 : -1 };
      render();
    })
  );
  const beatsNoFee = (r) => r.fee > 0 && ctx.noFee && r.ongoing > ctx.noFee.ongoing;

  function render() {
    persist();
    buildCtx();
    const rows = CARDS.filter(visible).map(calc);
    const f = SORTERS[state.sort.key] || SORTERS.net;
    rows.sort((a, b) => {
      const x = f(a), y = f(b);
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * state.sort.dir;
    });
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.sort === state.sort.key);
      th.classList.toggle("asc", state.sort.dir === 1);
    });
    const hasWallet = state.wallet.length > 0;
    const H = state.horizon;
    $("th.c-net").textContent = (hasWallet ? "Adds · " : "Net · ") + (H === 1 ? "yr 1" : `${H} yrs`);
    $("th[data-sort=rewards]").textContent = hasWallet ? "Extra rewards" : "Rewards/yr";

    const max = Math.max(1, ...rows.map((r) => r.pos));
    const hidden = CARDS.length - state.wallet.length - rows.length;
    // Headline pick = best card the visitor can likely get.
    const ranked = [...rows].sort((a, b) => b.net - a.net);
    const best = ranked.find((r) => !r.blocked524) || ranked[0];
    lastBest = best;
    const n524 = rows.filter((r) => r.blocked524).length;
    let summary = "No cards pass these filters.";
    if (rows.length) {
      summary = `<b>${rows.length}</b> card${rows.length === 1 ? "" : "s"}${hidden ? ` <span>(${hidden} hidden by filters)</span>` : ""} · `;
      summary += hasWallet
        ? `Your ${state.wallet.length === 1 ? "card earns" : `${state.wallet.length} cards earn`} about <b class="mono">${usd(ctx.wallet.best.total)}/yr</b> on this spending. Best addition: <b class="lead">${esc(best.c.name)}</b>, adding <b class="mono">${usd(best.net)}</b> over ${H === 1 ? "year one" : H + " years"}.`
        : `Best for your spending: <b class="lead">${esc(best.c.name)}</b> at <b class="mono">${usd(best.net)}</b> net over ${H === 1 ? "year one" : H + " years"}.`;
      if (n524) summary += ` <span class="flag warn">5/24</span> ${n524} Chase card${n524 > 1 ? "s" : ""} likely out of reach.`;
    }
    $("#summary").innerHTML = summary;
    renderSetbar();
    $("#panel-done span").textContent = `Show ${rows.length} card${rows.length === 1 ? "" : "s"}`;

    const tbody = $("#grid tbody");
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty"><td colspan="9">Nothing matches. Loosen a must-have or raise the max fee.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map((r, i) => {
        const c = r.c;
        const w = (v) => ((Math.max(0, v) / max) * 100).toFixed(2) + "%";
        const feeSpan = Math.min(r.feeTotal, r.pos);
        const bar = `<div class="bar" title="Bonus ${usd(r.bonus)} · Rewards ${usd(r.rewards * H)} · Credits ${usd(r.credits * H)} · Fee −${usd(r.feeTotal)}">
            <i class="b" style="width:${w(r.bonus)}"></i><i class="r" style="width:${w(r.rewards * H)}"></i><i class="cr" style="width:${w(r.credits * H)}"></i>
            ${feeSpan ? `<i class="f" style="left:${w(r.pos - feeSpan)};width:${w(feeSpan)}"></i>` : ""}
          </div>`;
        return `
        <tr class="row ${state.open === c.id ? "open" : ""}" data-id="${c.id}">
          <td class="c-sel"><input type="checkbox" data-sel="${c.id}" ${state.selected.includes(c.id) ? "checked" : ""} aria-label="Compare ${esc(c.name)}"/></td>
          <td><div class="cname"><span class="rank">${i + 1}</span><span class="chipart" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"></span><span><b>${esc(c.name)}${r.blocked524 ? `<span class="flag warn" title="You've opened 5+ cards in 24 months — Chase usually declines">5/24</span>` : ""}</b><small>${esc(c.issuer)}<span class="rtype"> · ${REWARD_TYPES[c.rewardType]}</span><span class="flag net">${c.network}</span></small><span class="mline"><span>Bonus <b>${r.bonus ? usd(r.bonus) : "—"}</b></span><span>Yr 2+ <b>${usd(r.ongoing)}</b>${beatsNoFee(r) ? " ▲" : ""}</span></span>${bar.replace('class="bar"', 'class="bar mbar"')}</span></div></td>
          <td class="num ${r.fee ? "" : "zero"}">${r.fee ? usd(r.fee) : "$0"}${c.firstYearFee === 0 && r.fee ? `<small class="yr1">$0 yr 1</small>` : ""}</td>
          <td class="num ${r.bonus ? "" : "zero"}">${r.bonus ? usd(r.bonus) : "—"}</td>
          <td class="num">${usd(r.rewards)}</td>
          <td class="num ${r.credits ? "" : "zero"}">${r.credits ? usd(r.credits) : "—"}</td>
          <td class="num net ${r.net < 0 ? "bad" : ""}">${usd(r.net)}</td>
          <td class="num ong ${beatsNoFee(r) ? "beat" : ""}">${usd(r.ongoing)}</td>
          <td class="c-bar">${bar}</td>
        </tr>
        ${state.open === c.id ? expandRow(r) : ""}`;
      }).join("");
    }
    renderDock();
  }

  // "Should I keep paying the fee after year one?" — the most-asked question about fee cards.
  function feeVerdict(r) {
    const nf = ctx.noFee;
    if (!r.fee || !nf) return "";
    const gap = r.ongoing - nf.ongoing;
    const name = esc(nf.c.name);
    if (gap > 0) {
      return `<div class="verdict"><b>Worth keeping after year one.</b> It nets about ${usd(gap)}/yr more than ${name}, the best no-fee card for your spending.</div>`;
    }
    const needed = r.fee + nf.ongoing - r.rewards;
    const face = CC.creditsFace(r.c);
    let s = `<div class="verdict no"><b>Fee probably not worth it after year one.</b> ${name} (no fee) would net about ${usd(-gap)}/yr more. `;
    if (face && needed <= face) s += `It only breaks even if you get at least ${usd(needed)}/yr out of its ${usd(face)} in credits.`;
    else s += `Consider grabbing the bonus, then downgrading to a no-fee card before the second fee posts.`;
    return s + "</div>";
  }

  function expandRow(r) {
    const c = r.c, a = r.a;
    const hasWallet = state.wallet.length > 0;
    const per = CATS.map((k) => [k, r.perCat[k]]);
    const m = Math.max(1, ...per.map((p) => p[1]));
    const pros = [...c.bestFor, ...CC.highlights(a).slice(0, 2)];
    const grocNote = state.superstore > 0 && CC.rate(c, "groceries") > CC.rate(c, "other")
      ? `<p><b>Groceries:</b> ${state.superstore}% of your grocery spend is at Walmart/Target/Costco, so it earns the base rate here.</p>` : "";
    return `<tr class="expand"><td colspan="9"><div class="xgrid four">
      <div><h4>${hasWallet ? "What it adds to your wallet" : "Where your rewards come from"}</h4>
        ${per.map(([k, v]) => `<div class="earnrow"><span>${CC.icon(CATEGORIES[k].icon)} ${CATEGORIES[k].label}</span><span class="rate">${CC.rateLabel(c, k)}</span><span class="m"><i style="width:${(v / m) * 100}%"></i></span><span class="amt">${usd(v)}</span></div>`).join("")}
        ${state.abroad ? `<div class="earnrow"><span>${CC.icon("globe")} Abroad</span><span class="rate" title="Foreign transaction fee">${c.ftf ? "−" + (c.ftfRate || "3%") : "0%"}</span><span></span><span class="amt">${usd(abroadNet(a))}</span></div>` : ""}
        ${c.earnNote ? `<div class="kv" style="border:0;color:var(--muted)">${esc(c.earnNote)}</div>` : ""}
      </div>
      <div><h4>Is it worth it?</h4>
        ${feeVerdict(r) || `<div class="verdict"><b>No annual fee</b> — nothing to lose by keeping it open, which also helps your credit history.</div>`}
        <ul class="xlist">${pros.map((p) => `<li class="p">${esc(p)}</li>`).join("")}${c.notFor.map((p) => `<li class="m">${esc(p)}</li>`).join("")}</ul>
      </div>
      <div class="rules"><h4>Can I get it?</h4>
        <p><b>Credit:</b> ${CREDIT_TIERS[c.creditTier]}${c.secured ? ` · ${esc(c.secured)}` : ""}</p>
        ${r.blocked524 ? `<p><b style="color:#fbbf24">Likely denied:</b> you've opened ${state.n524} cards in 24 months (Chase 5/24).</p>` : ""}
        <p><b>${esc(c.issuer)}:</b> ${esc(CC.issuerRule(c))}</p>
        <p><b>${c.network}:</b> ${esc(CC.networkNote(c))}</p>
        ${grocNote}
      </div>
      <div><h4>Terms</h4>
        <div class="kv"><span>Bonus</span><span>${c.bonus.amount ? `${esc(CC.bonusLabel(c))} / ${usd(c.bonus.spend)} in ${c.bonus.months}mo` : "none"}</span></div>
        <div class="kv"><span>Point value</span><span>${c.rewardType === "cashback" ? "cash" : +a.pointValue.toFixed(2) + "¢"}</span></div>
        ${a.credits.map((x) => `<div class="kv"><span>${esc(x.label)}</span><span>${usd(x.amount)}${x.value !== x.amount ? ` <i class="real">≈${usd(x.value)}</i>` : ""}</span></div>`).join("")}
        ${c.perks.map((p) => `<div class="kv"><span>${PERKS[p]}</span><span class="yes">${CC.icon("check")}</span></div>`).join("")}
        <div class="kv"><span>Intro APR</span><span>${c.introApr ? `0% · ${c.introApr}mo` : "—"}</span></div>
        <div class="kv"><span>Foreign fee</span><span>${c.ftf ? (c.ftfRate || "3%") : "none"}</span></div>
        ${c.offerNote ? `<p class="onote">${esc(c.offerNote)}</p>` : ""}
        <div class="xbtns">
          <button data-have="${c.id}">I already have this</button>
          <a href="/cards/${c.id}/">Full breakdown</a>
          <button data-sharecard="${c.id}">${CC.icon("link")} Share card</button>
        </div>
        <a class="issuer" href="${CC.issuerUrl(c)}" target="_blank" rel="noopener">Check current offer at ${esc(c.issuer)} ${CC.icon("external")}</a>
      </div>
    </div></td></tr>`;
  }

  $("#grid tbody").addEventListener("click", (e) => {
    const sel = e.target.dataset.sel;
    if (sel) {
      if (state.selected.includes(sel)) state.selected = state.selected.filter((x) => x !== sel);
      else if (state.selected.length < 3) state.selected.push(sel);
      else e.target.checked = false;
      state.dockMin = false;
      return render();
    }
    if (e.target.dataset.have) return addWallet(e.target.dataset.have);
    const sc = e.target.closest("[data-sharecard]");
    if (sc) {
      const c = CC.byId(sc.dataset.sharecard);
      return shareLink({ url: `${location.origin}/cards/${c.id}/`, title: `${c.name} — is it worth it?`, text: `What the ${c.issuer} ${c.name} is really worth, in dollars:` }, sc);
    }
    if (e.target.closest("a")) return;
    const row = e.target.closest("tr.row");
    if (!row) return;
    state.open = state.open === row.dataset.id ? null : row.dataset.id;
    render();
  });

  // ---------- compare dock ----------
  function renderDock() {
    const dock = $("#dock");
    state.selected = state.selected.filter((id) => !state.wallet.includes(id));
    const rows = state.selected.map(CC.byId).filter(Boolean).map(calc);
    const main = $(".main");
    if (!rows.length) { dock.hidden = true; main.style.paddingBottom = ""; return; }
    dock.hidden = false;
    dock.classList.toggle("min", state.dockMin || rows.length < 2);
    const H = state.horizon;
    const lines = [
      ["Value", null],
      ["Annual fee", (r) => r.fee, "low"],
      ["Sign-up bonus", (r) => r.bonus, "high"],
      [state.wallet.length ? "Extra rewards / yr" : "Rewards / yr", (r) => r.rewards, "high"],
      ["Credits / yr", (r) => r.credits, "high"],
      [H === 1 ? "Net · year 1" : `Net · ${H} years`, (r) => r.net, "high"],
      ["Net · each later year", (r) => r.ongoing, "high"],
      ["Earning (¢ per $1)", null],
      ...CATS.map((k) => [CATEGORIES[k].label, (r) => +(CC.rate(r.a, k) * r.a.pointValue).toFixed(2), "high", (v) => v.toFixed(1) + "¢"]),
      ["Perks & access", null],
      ["Network", (r) => r.c.network],
      ["Lounge access", (r) => (r.c.perks.includes("lounge") ? "yes" : "—")],
      ["Foreign fee", (r) => (r.c.ftf ? (r.c.ftfRate || "3%") : "none")],
      ["Intro APR", (r) => (r.c.introApr ? r.c.introApr + " mo" : "—")],
    ];
    const body = lines.map(([label, fn, better, fmt]) => {
      if (!fn) return `<tr class="sec"><td colspan="${rows.length + 1}">${label}</td></tr>`;
      const vals = rows.map(fn);
      const same = vals.every((v) => v === vals[0]);
      if (state.diffOnly && same) return "";
      const bestV = better && !same && rows.length > 1 ? (better === "high" ? Math.max(...vals) : Math.min(...vals)) : null;
      return `<tr><td>${label}</td>${vals.map((v) => `<td class="${v === bestV ? "win" : ""}">${fmt ? fmt(v) : typeof v === "number" ? usd(v) : v}</td>`).join("")}</tr>`;
    }).join("");

    dock.innerHTML = `
      <div class="dock-head">
        <h3>Compare · ${rows.length}/3</h3><span class="sp"></span>
        <label><input type="checkbox" id="diffonly" ${state.diffOnly ? "checked" : ""}/> differences only</label>
        ${rows.length < 2 ? `<span style="color:var(--muted);font-size:12px">${esc(rows[0].c.name)} · tick another card to compare</span>` : `<button id="dock-min">${state.dockMin ? "expand" : "minimize"}</button>`}
        <button id="dock-clear">clear</button>
      </div>
      <div class="dock-body">
        <table class="cmpt"><thead><tr><th></th>${rows.map((r) => `<th>${esc(r.c.name)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
        ${rows.length >= 2 ? `<div class="insight">${insight(rows[0], rows[1])}</div>` : ""}
      </div>`;
    $("#diffonly").onchange = (e) => { state.diffOnly = e.target.checked; renderDock(); };
    const mb = $("#dock-min");
    if (mb) mb.onclick = () => { state.dockMin = !state.dockMin; renderDock(); };
    main.style.paddingBottom = dock.offsetHeight + 40 + "px";
    $("#dock-clear").onclick = () => { state.selected = []; render(); };
  }

  // Finds how much extra monthly spend in one category would flip the long-run winner.
  function insight(x, y) {
    const [win, lose] = x.ongoing >= y.ongoing ? [x, y] : [y, x];
    const gap = win.ongoing - lose.ongoing;
    let bestFlip = null;
    for (const k of CATS) {
      const perDollar = ((CC.rate(lose.a, k) * lose.a.pointValue - CC.rate(win.a, k) * win.a.pointValue) * 12) / 100;
      if (perDollar <= 0) continue;
      const extra = gap / perDollar;
      if (!bestFlip || extra < bestFlip.extra) bestFlip = { k, extra };
    }
    let s = `After the bonus year, <b>${esc(win.c.name)}</b> nets <b class="mono">${usd(gap)}</b> more per year than ${esc(lose.c.name)} for your spending.`;
    if (bestFlip && bestFlip.extra < 5000)
      s += ` ${esc(lose.c.name)} would pull ahead if you spent about <b class="mono">${usd(Math.ceil(bestFlip.extra / 10) * 10)}/mo</b> more on ${CATEGORIES[bestFlip.k].label.toLowerCase()}.`;
    else s += ` No realistic change in a single category flips that.`;
    return s;
  }

  buildPanel();
  syncPanel();
  // Collapsed sections start open when they hold something the visitor set (e.g. from a shared link).
  $("#sec-wallet").open = state.wallet.length > 0 || state.n524 > 0;
  $("#sec-assume").open = state.pv !== "typical" || state.creditMode !== "realistic";
  $("#more-spend").open = state.superstore > 0 || state.abroad > 0;
  // Links from card pages (/#…&card=<id>) open that card's details.
  const startCard = new URLSearchParams(location.hash.slice(1)).get("card");
  if (CC.byId(startCard)) state.open = startCard;
  render();
  if (state.open) document.querySelector(`tr.row[data-id="${state.open}"]`)?.scrollIntoView({ block: "center" });
})();
