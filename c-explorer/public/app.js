(function () {
  const { CARDS, BENEFITS, CATEGORIES, PERKS, CREDIT_TIERS, REWARD_TYPES, DEFAULT_SPEND, usd } = CC;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const PRESETS = {
    Light: { dining: 100, groceries: 250, hotels: 0, airfare: 0, gas: 80, streaming: 20, other: 400 },
    Typical: DEFAULT_SPEND,
    Foodie: { dining: 700, groceries: 800, hotels: 50, airfare: 50, gas: 120, streaming: 40, other: 700 },
    Traveler: { dining: 450, groceries: 400, hotels: 450, airfare: 450, gas: 100, streaming: 30, other: 1200 },
    "Big spender": { dining: 900, groceries: 900, hotels: 400, airfare: 400, gas: 250, streaming: 60, other: 4000 },
  };

  const state = {
    spend: { ...DEFAULT_SPEND }, must: [], maxFee: 600, credit: "excellent", horizon: 1,
    q: "", sort: { key: "net", dir: -1 }, open: null, selected: [], diffOnly: false, dockMin: false,
  };
  try { Object.assign(state, JSON.parse(localStorage.getItem("cc-c-state") || "{}"), { open: null, q: "" }); } catch (e) {}
  const persist = () => {
    try {
      const { spend, must, maxFee, credit, horizon, sort, selected } = state;
      localStorage.setItem("cc-c-state", JSON.stringify({ spend, must, maxFee, credit, horizon, sort, selected }));
    } catch (e) {}
  };

  // ---------- math ----------
  function calc(c) {
    const H = state.horizon;
    const bonus = CC.bonusValue(c), rewards = CC.yearlyRewards(c, state.spend), credits = CC.creditsValue(c), fee = c.annualFee;
    return { c, bonus, rewards, credits, fee, net: bonus + H * (rewards + credits - fee), pos: bonus + H * (rewards + credits) };
  }
  const tierOk = { excellent: ["fair", "good", "excellent"], good: ["fair", "good"], fair: ["fair"] };
  function visible(c) {
    if (c.annualFee > state.maxFee) return false;
    if (!tierOk[state.credit].includes(c.creditTier)) return false;
    if (!state.must.every((k) => CC.matches(c, k))) return false;
    if (state.q) {
      const hay = [c.name, c.issuer, REWARD_TYPES[c.rewardType], ...c.perks.map((p) => PERKS[p]), ...CC.highlights(c)].join(" ").toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    return true;
  }

  // ---------- panel ----------
  function buildPanel() {
    $("#presets").innerHTML = Object.keys(PRESETS).map((k) => `<button data-p="${k}">${k}</button>`).join("");
    $("#sliders").innerHTML = Object.entries(CATEGORIES).map(([k, cat]) => `
      <div class="slider">
        <span class="ic">${cat.icon}</span>
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
    $("#clear-must").onclick = () => { state.must = []; syncPanel(); render(); };
    $("#fee").oninput = (e) => { state.maxFee = +e.target.value; syncPanel(); render(); };
    $("#credit").onchange = (e) => { state.credit = e.target.value; render(); };
    $("#horizon").onchange = (e) => { state.horizon = +e.target.value; render(); };
    $("#q").oninput = (e) => { state.q = e.target.value.trim(); render(); };
    $("#toggle-panel").onclick = () => $("#panel").classList.toggle("open");
  }
  function syncPanel(skip) {
    document.querySelectorAll("[data-cat],[data-num]").forEach((el) => {
      if (el !== skip) el.value = state.spend[el.dataset.cat || el.dataset.num];
    });
    const total = Object.values(state.spend).reduce((a, b) => a + b, 0);
    $("#total").textContent = usd(total) + "/mo";
    document.querySelectorAll("[data-p]").forEach((b) => b.classList.toggle("on", JSON.stringify(PRESETS[b.dataset.p]) === JSON.stringify(state.spend)));
    document.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", state.must.includes(b.dataset.m)));
    $("#fee").value = state.maxFee;
    $("#fee-out").textContent = state.maxFee >= 600 ? "any" : "≤ " + usd(state.maxFee);
    $("#credit").value = state.credit;
    $("#horizon").value = state.horizon;
  }

  // ---------- table ----------
  const SORTERS = {
    name: (r) => r.c.name, fee: (r) => r.fee, bonus: (r) => r.bonus, rewards: (r) => r.rewards, credits: (r) => r.credits, net: (r) => r.net,
  };
  document.querySelectorAll("th[data-sort]").forEach((th) =>
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: k === "name" || k === "fee" ? 1 : -1 };
      render();
    })
  );

  function render() {
    persist();
    const rows = CARDS.filter(visible).map(calc);
    const f = SORTERS[state.sort.key];
    rows.sort((a, b) => {
      const x = f(a), y = f(b);
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * state.sort.dir;
    });
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.sort === state.sort.key);
      th.classList.toggle("asc", state.sort.dir === 1);
    });
    $("th.c-net").textContent = state.horizon === 1 ? "Net · yr 1" : `Net · ${state.horizon} yrs`;

    const max = Math.max(1, ...rows.map((r) => r.pos));
    const H = state.horizon;
    const hidden = CARDS.length - rows.length;
    const best = [...rows].sort((a, b) => b.net - a.net)[0];
    $("#summary").innerHTML = rows.length
      ? `<b>${rows.length}</b> cards${hidden ? ` <span>(${hidden} hidden by filters)</span>` : ""} · Best for your spending: <b class="lead">${esc(best.c.name)}</b> at <b class="mono">${usd(best.net)}</b> net over ${H === 1 ? "year one" : H + " years"}.`
      : "No cards pass these filters.";

    const tbody = $("#grid tbody");
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty"><td colspan="8">Nothing matches. Loosen a must-have or raise the max fee.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map((r, i) => {
        const c = r.c;
        const w = (v) => ((Math.max(0, v) / max) * 100).toFixed(2) + "%";
        const feeSpan = Math.min(r.fee * H, r.pos);
        return `
        <tr class="row ${state.open === c.id ? "open" : ""}" data-id="${c.id}">
          <td class="c-sel"><input type="checkbox" data-sel="${c.id}" ${state.selected.includes(c.id) ? "checked" : ""} aria-label="Compare ${esc(c.name)}"/></td>
          <td><div class="cname"><span class="rank">${i + 1}</span><span class="chipart" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"></span><span><b>${esc(c.name)}</b><small>${esc(c.issuer)} · ${REWARD_TYPES[c.rewardType]}</small></span></div></td>
          <td class="num ${r.fee ? "" : "zero"}">${r.fee ? usd(r.fee) : "$0"}</td>
          <td class="num ${r.bonus ? "" : "zero"}">${r.bonus ? usd(r.bonus) : "—"}</td>
          <td class="num">${usd(r.rewards)}</td>
          <td class="num ${r.credits ? "" : "zero"}">${r.credits ? usd(r.credits) : "—"}</td>
          <td class="num net ${r.net < 0 ? "bad" : ""}">${usd(r.net)}</td>
          <td class="c-bar"><div class="bar" title="Bonus ${usd(r.bonus)} · Rewards ${usd(r.rewards * H)} · Credits ${usd(r.credits * H)} · Fee −${usd(r.fee * H)}">
            <i class="b" style="width:${w(r.bonus)}"></i><i class="r" style="width:${w(r.rewards * H)}"></i><i class="cr" style="width:${w(r.credits * H)}"></i>
            ${feeSpan ? `<i class="f" style="left:${w(r.pos - feeSpan)};width:${w(feeSpan)}"></i>` : ""}
          </div></td>
        </tr>
        ${state.open === c.id ? expandRow(r) : ""}`;
      }).join("");
    }
    renderDock();
  }

  function expandRow(r) {
    const c = r.c;
    const per = Object.keys(CATEGORIES).map((k) => [k, (state.spend[k] || 0) * 12 * CC.rate(c, k) * c.pointValue / 100]);
    const m = Math.max(1, ...per.map((p) => p[1]));
    const pros = [...c.bestFor, ...CC.highlights(c).slice(0, 3)];
    return `<tr class="expand"><td colspan="8"><div class="xgrid">
      <div><h4>Where your rewards come from</h4>
        ${per.map(([k, v]) => `<div class="earnrow"><span>${CATEGORIES[k].icon} ${CATEGORIES[k].label}</span><span class="rate">${CC.rateLabel(c, k)}</span><span class="m"><i style="width:${(v / m) * 100}%"></i></span><span class="amt">${usd(v)}</span></div>`).join("")}
        ${c.earnNote ? `<div class="kv" style="border:0;color:var(--muted)">${esc(c.earnNote)}</div>` : ""}
      </div>
      <div><h4>Good / not so good</h4><ul class="xlist">${pros.map((p) => `<li class="p">${esc(p)}</li>`).join("")}${c.notFor.map((p) => `<li class="m">${esc(p)}</li>`).join("")}</ul></div>
      <div><h4>Terms</h4>
        <div class="kv"><span>Bonus</span><span>${c.bonus.amount ? `${esc(CC.bonusLabel(c))} / ${usd(c.bonus.spend)} in ${c.bonus.months}mo` : "none"}</span></div>
        <div class="kv"><span>Point value</span><span>${c.rewardType === "cashback" ? "cash" : c.pointValue + "¢"}</span></div>
        ${c.credits.map((x) => `<div class="kv"><span>${esc(x.label)}</span><span>${usd(x.amount)}</span></div>`).join("")}
        ${c.perks.map((p) => `<div class="kv"><span>${PERKS[p]}</span><span>✓</span></div>`).join("")}
        <div class="kv"><span>Intro APR</span><span>${c.introApr ? `0% · ${c.introApr}mo` : "—"}</span></div>
        <div class="kv"><span>APR</span><span>${esc(c.apr)}</span></div>
        <div class="kv"><span>Foreign fee</span><span>${c.ftf ? "3%" : "none"}</span></div>
        <div class="kv"><span>Credit</span><span>${CREDIT_TIERS[c.creditTier]}</span></div>
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
    const row = e.target.closest("tr.row");
    if (!row) return;
    state.open = state.open === row.dataset.id ? null : row.dataset.id;
    render();
  });

  // ---------- compare dock ----------
  function renderDock() {
    const dock = $("#dock");
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
      ["Rewards / yr", (r) => r.rewards, "high"],
      ["Credits / yr", (r) => r.credits, "high"],
      [H === 1 ? "Net · year 1" : `Net · ${H} years`, (r) => r.net, "high"],
      ["Net · each later year", (r) => r.rewards + r.credits - r.fee, "high"],
      ["Earning (¢ per $1)", null],
      ...Object.keys(CATEGORIES).map((k) => [CATEGORIES[k].label, (r) => +(CC.rate(r.c, k) * r.c.pointValue).toFixed(2), "high", (v) => v.toFixed(1) + "¢"]),
      ["Perks", null],
      ["Lounge access", (r) => (r.c.perks.includes("lounge") ? "yes" : "—")],
      ["Foreign fee", (r) => (r.c.ftf ? "3%" : "none")],
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
  function insight(a, b) {
    const ongoing = (r) => r.rewards + r.credits - r.fee;
    let [win, lose] = ongoing(a) >= ongoing(b) ? [a, b] : [b, a];
    const gap = ongoing(win) - ongoing(lose);
    let bestFlip = null;
    for (const k of Object.keys(CATEGORIES)) {
      const perDollar = (CC.rate(lose.c, k) * lose.c.pointValue - CC.rate(win.c, k) * win.c.pointValue) * 12 / 100;
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
  render();
})();
