(function () {
  const { CARDS, BENEFITS, CATEGORIES, PERKS, CREDIT_TIERS, REWARD_TYPES, usd } = CC;
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- compare selection (kept per-browser) ----------
  let compare = [];
  try { compare = JSON.parse(localStorage.getItem("cc-a-compare") || "[]").filter(CC.byId); } catch (e) {}
  function saveCompare() {
    try { localStorage.setItem("cc-a-compare", JSON.stringify(compare)); } catch (e) {}
    renderTray();
  }
  function toggleCompare(id) {
    if (compare.includes(id)) compare = compare.filter((x) => x !== id);
    else if (compare.length < 4) compare.push(id);
    else alert("You can compare up to 4 cards at a time.");
    saveCompare();
  }

  // ---------- routing ----------
  function parseHash() {
    const h = location.hash.slice(1) || "/";
    const [path, qs] = h.split("?");
    return { path, q: new URLSearchParams(qs || "") };
  }
  function go(path, params) {
    const qs = params ? params.toString() : "";
    location.hash = path + (qs ? "?" + qs : "");
  }
  window.addEventListener("hashchange", route);

  function route() {
    const { path, q } = parseHash();
    if (path.startsWith("/card/")) renderDetail(path.slice(6));
    else if (path === "/cards") renderResults(q);
    else if (path === "/compare") renderCompare();
    else renderHome();
    renderTray();
  }

  const art = (c, cls = "") =>
    `<div class="art ${cls}" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${esc(c.issuer)}<div class="nm">${esc(c.name)}</div></div>`;

  // ---------- home ----------
  function renderHome() {
    document.title = "CardCompass — Find your card";
    const picked = new Set();
    app.innerHTML = `
      <section class="hero">
        <h1>Find the card that fits<br/>how you spend.</h1>
        <p>Pick the perks you care about. We'll show you the cards that deliver them — in plain English.</p>
        <form class="search" id="search"><input type="search" name="q" placeholder="Search a card or issuer, e.g. “Harbor” or “hotel”" aria-label="Search cards" /></form>
      </section>
      <div class="section-label">Or choose what matters to you</div>
      <div class="tiles">
        ${Object.entries(BENEFITS).map(([k, b]) => `
          <button class="tile" data-k="${k}" aria-pressed="false">
            <span class="ico">${b.icon}</span><strong>${b.label}</strong><small>${b.blurb}</small>
          </button>`).join("")}
      </div>
      <div class="home-cta"><button class="btn" id="go">Show all ${CARDS.length} cards →</button></div>`;

    const btn = app.querySelector("#go");
    const update = () => {
      const n = CARDS.filter((c) => [...picked].every((k) => CC.matches(c, k))).length;
      btn.textContent = picked.size ? `Show ${n} matching card${n === 1 ? "" : "s"} →` : `Show all ${CARDS.length} cards →`;
    };
    app.querySelectorAll(".tile").forEach((t) =>
      t.addEventListener("click", () => {
        const k = t.dataset.k;
        picked.has(k) ? picked.delete(k) : picked.add(k);
        t.setAttribute("aria-pressed", picked.has(k));
        update();
      })
    );
    btn.addEventListener("click", () => go("/cards", new URLSearchParams(picked.size ? { b: [...picked].join(",") } : {})));
    app.querySelector("#search").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = e.target.q.value.trim();
      go("/cards", new URLSearchParams(v ? { q: v } : {}));
    });
  }

  // ---------- results ----------
  const FILTERS = {
    b: { title: "Perks you want", opts: Object.fromEntries(Object.entries(BENEFITS).map(([k, b]) => [k, b.label])), test: (c, v) => CC.matches(c, v), all: true },
    fee: { title: "Annual fee", opts: { "0": "No fee", "100": "Under $100", "300": "Under $300" }, test: (c, v) => c.annualFee <= (v === "0" ? 0 : +v - 1), single: true },
    credit: { title: "Your credit", opts: CREDIT_TIERS, test: (c, v) => c.creditTier === v },
    type: { title: "Reward type", opts: REWARD_TYPES, test: (c, v) => c.rewardType === v },
    issuer: { title: "Issuer", opts: Object.fromEntries([...new Set(CARDS.map((c) => c.issuer))].map((i) => [i, i])), test: (c, v) => c.issuer === v },
  };
  const SORTS = {
    match: "Best match",
    value: "First-year value",
    bonus: "Sign-up bonus",
    fee: "Lowest annual fee",
  };

  function readState(q) {
    const s = { q: q.get("q") || "", sort: q.get("sort") || "match" };
    for (const k of Object.keys(FILTERS)) s[k] = (q.get(k) || "").split(",").filter(Boolean);
    return s;
  }
  function writeState(s) {
    const p = new URLSearchParams();
    if (s.q) p.set("q", s.q);
    for (const k of Object.keys(FILTERS)) if (s[k].length) p.set(k, s[k].join(","));
    if (s.sort !== "match") p.set("sort", s.sort);
    go("/cards", p);
  }
  function applyFilters(s, skip) {
    const term = s.q.toLowerCase();
    return CARDS.filter((c) => {
      if (term) {
        const hay = [c.name, c.issuer, REWARD_TYPES[c.rewardType], ...CC.highlights(c), ...c.perks.map((p) => PERKS[p])].join(" ").toLowerCase();
        if (!term.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      for (const [k, f] of Object.entries(FILTERS)) {
        if (k === skip || !s[k].length) continue;
        const ok = f.all ? s[k].every((v) => f.test(c, v)) : s[k].some((v) => f.test(c, v));
        if (!ok) return false;
      }
      return true;
    });
  }

  function renderResults(q) {
    document.title = "Browse cards — CardCompass";
    const s = readState(q);
    let list = applyFilters(s);
    const sorters = {
      match: (a, b) => CC.firstYearValue(b) - CC.firstYearValue(a),
      value: (a, b) => CC.firstYearValue(b) - CC.firstYearValue(a),
      bonus: (a, b) => CC.bonusValue(b) - CC.bonusValue(a),
      fee: (a, b) => a.annualFee - b.annualFee || CC.firstYearValue(b) - CC.firstYearValue(a),
    };
    list = list.sort(sorters[s.sort] || sorters.match);

    const chips = [];
    if (s.q) chips.push({ k: "q", v: s.q, label: `“${s.q}”` });
    for (const [k, f] of Object.entries(FILTERS)) for (const v of s[k]) chips.push({ k, v, label: f.opts[v] });

    app.innerHTML = `
      <div class="results-layout">
        <aside class="filters" id="filters">
          <h2>Filters</h2>
          ${Object.entries(FILTERS).map(([k, f]) => `
            <details class="fgroup" ${k === "b" || k === "fee" || s[k].length ? "open" : ""}>
              <summary>${f.title}</summary>
              <div class="opts">
                ${Object.entries(f.opts).map(([v, label]) => {
                  const n = applyFilters({ ...s, [k]: f.all ? [...new Set([...s[k], v])] : [v] }).length;
                  return `<label class="check"><input type="${f.single ? "radio" : "checkbox"}" name="${k}" value="${esc(v)}" ${s[k].includes(v) ? "checked" : ""}/> ${esc(label)} <span class="n">${n}</span></label>`;
                }).join("")}
                ${f.single && s[k].length ? `<button class="chip clear" data-clear="${k}">Any fee</button>` : ""}
              </div>
            </details>`).join("")}
          <button class="btn close-filters" hidden>Show ${list.length} cards</button>
        </aside>
        <section>
          <div class="results-head">
            <div>
              <h1>${list.length} card${list.length === 1 ? "" : "s"} for you</h1>
              <div class="sub">Ranked by estimated first-year value <span class="info" title="Sign-up bonus + a year of rewards on typical spending ($2,070/mo) + credits you can use − annual fee.">i</span></div>
            </div>
            <div class="sort">
              <button class="btn ghost small mobile-filter-btn" id="open-filters">Filters${chips.length ? ` (${chips.length})` : ""}</button>
              <label for="sort">Sort</label>
              <select id="sort">${Object.entries(SORTS).map(([k, l]) => `<option value="${k}" ${s.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select>
            </div>
          </div>
          <div class="chips">
            ${chips.map((c) => `<button class="chip" data-k="${c.k}" data-v="${esc(c.v)}">${esc(c.label)} <span>×</span></button>`).join("")}
            ${chips.length ? `<button class="chip clear" id="clear-all">Clear all</button>` : ""}
          </div>
          <div id="list">
            ${list.length ? list.map((c) => resultCard(c, s.b)).join("") : `<div class="empty"><p><strong>No cards match all of those.</strong></p><p>Try removing a filter — each chip above can be cleared individually.</p></div>`}
          </div>
        </section>
      </div>`;

    app.querySelectorAll(".filters input").forEach((inp) =>
      inp.addEventListener("change", () => {
        const k = inp.name;
        if (FILTERS[k].single) s[k] = [inp.value];
        else s[k] = inp.checked ? [...s[k], inp.value] : s[k].filter((v) => v !== inp.value);
        writeState(s);
      })
    );
    app.querySelectorAll("[data-clear]").forEach((b) => b.addEventListener("click", () => { s[b.dataset.clear] = []; writeState(s); }));
    app.querySelectorAll(".chip[data-k]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.k === "q") s.q = "";
        else s[b.dataset.k] = s[b.dataset.k].filter((v) => v !== b.dataset.v);
        writeState(s);
      })
    );
    const clear = app.querySelector("#clear-all");
    if (clear) clear.addEventListener("click", () => go("/cards"));
    app.querySelector("#sort").addEventListener("change", (e) => { s.sort = e.target.value; writeState(s); });
    const panel = app.querySelector("#filters");
    app.querySelector("#open-filters").addEventListener("click", () => panel.classList.add("open"));
    app.querySelector(".close-filters").addEventListener("click", () => panel.classList.remove("open"));
    bindCompareToggles();
  }

  function resultCard(c, wanted) {
    const matched = wanted.filter((k) => CC.matches(c, k)).map((k) => BENEFITS[k].label);
    const hl = CC.highlights(c, wanted).slice(0, 2);
    return `
      <article class="rcard">
        <div class="rcard-top">
          <a href="#/card/${c.id}">${art(c)}</a>
          <div>
            <h3><a href="#/card/${c.id}">${esc(c.name)}</a></h3>
            <div class="meta">${esc(c.issuer)} · ${CREDIT_TIERS[c.creditTier]} credit</div>
            ${matched.length ? `<div class="matchline">★ Matches: <b>${matched.join(" · ")}</b></div>` : ""}
          </div>
          <label class="cmp-toggle"><input type="checkbox" data-cmp="${c.id}" ${compare.includes(c.id) ? "checked" : ""}/> Compare</label>
        </div>
        <div class="stats">
          <div class="stat"><label>Sign-up bonus</label><strong>${CC.bonusValue(c) ? usd(CC.bonusValue(c)) : "—"}</strong><small>${c.bonus.amount ? (c.bonus.unit === "usd" ? "cash" : "value of " + CC.bonusLabel(c)) : "no bonus"}</small></div>
          <div class="stat"><label>Annual fee</label><strong>${c.annualFee ? usd(c.annualFee) : "$0"}</strong><small>${c.annualFee ? "per year" : "free to keep"}</small></div>
          <div class="stat"><label>Earn rate</label><strong>${CC.rateLabel(c, Object.keys(c.earn).sort((a, b) => c.earn[b] - c.earn[a])[0])}</strong><small>${esc(CC.topEarn(c, 2).join(" · "))}</small></div>
        </div>
        ${hl.length ? `<ul class="hl">${hl.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
        <div class="rcard-foot">
          <div class="value">Est. first-year value <strong>${usd(CC.firstYearValue(c))}</strong></div>
          <a class="btn small" href="#/card/${c.id}">View details →</a>
        </div>
      </article>`;
  }

  function bindCompareToggles() {
    app.querySelectorAll("[data-cmp]").forEach((cb) =>
      cb.addEventListener("change", () => {
        toggleCompare(cb.dataset.cmp);
        cb.checked = compare.includes(cb.dataset.cmp);
      })
    );
  }

  function renderTray() {
    const tray = document.getElementById("tray");
    const count = document.getElementById("nav-count");
    count.hidden = !compare.length;
    count.textContent = compare.length;
    const onCompare = parseHash().path === "/compare";
    if (!compare.length || onCompare) { tray.hidden = true; return; }
    tray.hidden = false;
    tray.innerHTML = `
      <div class="minis">${compare.map((id) => art(CC.byId(id))).join("")}</div>
      <span>${compare.length} of 4 selected</span>
      <button class="x" id="tray-clear">Clear</button>
      <a class="btn" href="#/compare">Compare →</a>`;
    tray.querySelector("#tray-clear").addEventListener("click", () => {
      compare = [];
      saveCompare();
      app.querySelectorAll("[data-cmp]").forEach((cb) => (cb.checked = false));
    });
  }

  // ---------- detail ----------
  function renderDetail(id) {
    const c = CC.byId(id);
    if (!c) return renderHome();
    document.title = `${c.name} — CardCompass`;
    const cats = Object.keys(CATEGORIES).filter((k) => k !== "other" && c.earn[k]).concat("other");
    app.innerHTML = `
      <div class="crumbs"><a href="#/cards">← All cards</a></div>
      <section class="detail-hero">
        ${art(c, "lg")}
        <div>
          <div class="meta">${esc(c.issuer)} · ${REWARD_TYPES[c.rewardType]}</div>
          <h1>${esc(c.name)}</h1>
          <div class="stats">
            <div class="stat"><label>Sign-up bonus</label><strong>${CC.bonusValue(c) ? usd(CC.bonusValue(c)) : "—"}</strong></div>
            <div class="stat"><label>Annual fee</label><strong>${usd(c.annualFee)}</strong></div>
            <div class="stat"><label>Est. year-one value</label><strong>${usd(CC.firstYearValue(c))}</strong></div>
          </div>
          <p class="meta">${esc(CC.bonusSentence(c))}.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn" id="cmp-btn">${compare.includes(c.id) ? "✓ Added to compare" : "+ Add to compare"}</button>
            <a class="btn ghost" href="#/cards">Keep browsing</a>
          </div>
        </div>
      </section>
      <section class="detail-body">
        <div class="panel">
          <h2>Who it's for</h2>
          <ul class="fitlist">
            ${c.bestFor.map((x) => `<li><span class="y">✓</span>${esc(x)}</li>`).join("")}
            ${c.notFor.map((x) => `<li><span class="n">✕</span>Not ideal: ${esc(x)}</li>`).join("")}
          </ul>
        </div>
        <div class="panel">
          <h2>How you earn</h2>
          <table class="tbl">
            ${cats.map((k) => `<tr><td>${CATEGORIES[k].icon} ${CATEGORIES[k].label}</td><td>${CC.rateLabel(c, k)}</td><td>${(CC.rate(c, k) * c.pointValue).toFixed(1)}¢ per $1</td></tr>`).join("")}
          </table>
          ${c.earnNote ? `<p class="verified">${esc(c.earnNote)}</p>` : ""}
        </div>
        <div class="panel">
          <h2>Credits & perks</h2>
          ${c.credits.map((cr) => `<div class="credit"><strong>${usd(cr.amount)} ${esc(cr.label.toLowerCase())}</strong><span>${esc(cr.ease)}</span></div>`).join("")}
          ${c.perks.map((p) => `<div class="credit"><strong>${PERKS[p]}</strong></div>`).join("")}
          ${!c.ftf ? `<div class="credit"><strong>No foreign transaction fees</strong></div>` : ""}
          ${!c.credits.length && !c.perks.length && c.ftf ? `<p class="meta">This card keeps it simple — no extra credits or perks.</p>` : ""}
        </div>
        <div class="panel">
          <h2>Rates & fees</h2>
          <table class="tbl">
            <tr><td>Annual fee</td><td></td><td>${usd(c.annualFee)}</td></tr>
            <tr><td>Intro APR</td><td></td><td>${c.introApr ? `0% for ${c.introApr} months` : "None"}</td></tr>
            <tr><td>Regular APR</td><td></td><td>${esc(c.apr)}</td></tr>
            <tr><td>Foreign transaction fee</td><td></td><td>${c.ftf ? "3%" : "None"}</td></tr>
            <tr><td>Recommended credit</td><td></td><td>${CREDIT_TIERS[c.creditTier]}</td></tr>
          </table>
          <p class="verified">Last verified: Oct 2026 · Sample data</p>
        </div>
      </section>`;
    app.querySelector("#cmp-btn").addEventListener("click", (e) => {
      toggleCompare(c.id);
      e.target.textContent = compare.includes(c.id) ? "✓ Added to compare" : "+ Add to compare";
    });
    window.scrollTo(0, 0);
  }

  // ---------- compare ----------
  let diffOnly = false;
  const closedGroups = new Set();
  function renderCompare() {
    document.title = "Compare — CardCompass";
    const cards = compare.map(CC.byId);
    if (cards.length < 2) {
      app.innerHTML = `<div class="cmp-empty"><h1>Compare cards side by side</h1><p>${cards.length ? "Add at least one more card" : "Tick “Compare” on up to 4 cards"} to see them next to each other.</p><a class="btn" href="#/cards">Browse cards</a></div>`;
      return;
    }
    const allPerks = [...new Set(cards.flatMap((c) => c.perks))];
    // [label, value fn, better: "high" | "low" | null]
    const groups = [
      ["The basics", [
        ["Annual fee", (c) => c.annualFee, "low", (v) => usd(v)],
        ["Est. first-year value", (c) => CC.firstYearValue(c), "high", (v) => usd(v)],
        ["Est. value after year one", (c) => CC.ongoingValue(c), "high", (v) => usd(v)],
        ["Credit needed", (c) => CREDIT_TIERS[c.creditTier]],
        ["Reward type", (c) => REWARD_TYPES[c.rewardType]],
      ]],
      ["Sign-up bonus", [
        ["Bonus value", (c) => CC.bonusValue(c), "high", (v) => (v ? usd(v) : "None")],
        ["Spend required", (c) => (c.bonus.amount ? `${usd(c.bonus.spend)} in ${c.bonus.months} mo` : "—")],
      ]],
      ["Earning (cents back per $1)", Object.keys(CATEGORIES).map((k) => [
        `${CATEGORIES[k].icon} ${CATEGORIES[k].label}`, (c) => +(CC.rate(c, k) * c.pointValue).toFixed(1), "high", (v) => v + "¢",
      ])],
      ["Credits & perks", [
        ["Annual credits", (c) => CC.creditsValue(c), "high", (v) => (v ? usd(v) : "None")],
        ...allPerks.map((p) => [PERKS[p], (c) => (c.perks.includes(p) ? "✓" : "—")]),
        ["No foreign fees", (c) => (c.ftf ? "—" : "✓")],
      ]],
      ["Fine print", [
        ["Intro APR", (c) => (c.introApr ? `0% · ${c.introApr} mo` : "None")],
        ["Regular APR", (c) => c.apr],
      ]],
    ];

    const body = groups.map(([g, rows], gi) => {
      const rowHtml = rows.map(([label, fn, better, fmt]) => {
        const vals = cards.map(fn);
        const same = vals.every((v) => v === vals[0]);
        if (diffOnly && same) return "";
        let best = null;
        if (better && !same) best = better === "high" ? Math.max(...vals) : Math.min(...vals);
        return `<tr ${closedGroups.has(gi) ? "hidden" : ""}><th class="rowlabel">${esc(label)}</th>${vals.map((v) => `<td class="${best !== null && v === best ? "best" : ""}">${esc(fmt ? fmt(v) : v)}</td>`).join("")}</tr>`;
      }).join("");
      if (!rowHtml) return "";
      return `<tr class="group ${closedGroups.has(gi) ? "closed" : ""}" data-g="${gi}"><td colspan="${cards.length + 1}">${g}</td></tr>${rowHtml}`;
    }).join("");

    app.innerHTML = `
      <div class="cmp-head">
        <div><div class="crumbs" style="padding:0 0 6px"><a href="#/cards">← Back to results</a></div><h1>Comparing ${cards.length} cards</h1></div>
        <label class="switch"><input type="checkbox" id="diff" ${diffOnly ? "checked" : ""}/> Only show differences</label>
      </div>
      <div class="cmp-scroll">
        <table class="cmp">
          <thead><tr><th></th>${cards.map((c) => `<th><a href="#/card/${c.id}">${art(c)}</a><div class="nm2">${esc(c.name)}</div><div class="meta">${esc(c.issuer)}</div><button class="rm" data-rm="${c.id}">Remove</button></th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    app.querySelector("#diff").addEventListener("change", (e) => { diffOnly = e.target.checked; renderCompare(); });
    app.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { toggleCompare(b.dataset.rm); renderCompare(); }));
    app.querySelectorAll("tr.group").forEach((r) =>
      r.addEventListener("click", () => {
        const g = +r.dataset.g;
        closedGroups.has(g) ? closedGroups.delete(g) : closedGroups.add(g);
        renderCompare();
      })
    );
  }

  route();
})();
