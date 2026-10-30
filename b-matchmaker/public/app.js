(function () {
  const { CARDS, BENEFITS, CATEGORIES, PERKS, CREDIT_TIERS, REWARD_TYPES, DEFAULT_SPEND, usd } = CC;
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- questions ----------
  const QUESTIONS = [
    {
      id: "wants", multi: 3, title: "What would make a card feel worth it?", hint: "Pick up to three. There are no wrong answers.",
      options: Object.entries(BENEFITS).map(([k, b]) => ({ v: k, e: b.icon, label: b.label, sub: b.blurb })),
    },
    {
      id: "spend", multi: 3, title: "Where does most of your money go?", hint: "Choose your top spots — we'll favor cards that reward them.",
      options: Object.entries(CATEGORIES).filter(([k]) => k !== "other").map(([k, c]) => ({ v: k, e: c.icon, label: c.label })),
    },
    {
      id: "fee", title: "How do you feel about an annual fee?", hint: "Some cards charge one but give back more than they cost.", stack: true,
      options: [
        { v: "0", e: "🙅", label: "I only want free cards", sub: "$0 annual fee, always" },
        { v: "100", e: "🤔", label: "Up to about $100 is fine", sub: "If the rewards clearly cover it" },
        { v: "any", e: "✨", label: "Whatever it takes", sub: "Premium perks are worth paying for" },
      ],
    },
    {
      id: "credit", title: "How would you describe your credit?", hint: "Just a rough idea — we never check your credit.", stack: true,
      options: [
        { v: "fair", e: "🌱", label: "Still building it", sub: "New to credit, or rebuilding" },
        { v: "good", e: "👍", label: "Pretty good", sub: "Usually on time, a few years of history" },
        { v: "excellent", e: "🏆", label: "Excellent", sub: "Long history, never missed a payment" },
        { v: "unsure", e: "🤷", label: "Honestly not sure", sub: "We'll stick to easier approvals" },
      ],
    },
    {
      id: "travel", title: "How often do you travel?", hint: "Flights or hotel stays — work or fun.", stack: true,
      options: [
        { v: "rarely", e: "🏡", label: "Rarely", sub: "Mostly staying close to home" },
        { v: "sometimes", e: "🧳", label: "A few trips a year", sub: "Holidays and the odd weekend away" },
        { v: "often", e: "🛫", label: "All the time", sub: "I know my seat preferences by heart" },
      ],
    },
  ];
  const EMPTY = { wants: [], spend: [], fee: null, credit: null, travel: null };
  let answers = { ...EMPTY };
  try { answers = { ...EMPTY, ...JSON.parse(localStorage.getItem("cc-b-answers") || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem("cc-b-answers", JSON.stringify(answers)); } catch (e) {} };
  const complete = () => QUESTIONS.every((q) => (q.multi ? answers[q.id].length : answers[q.id]));

  // ---------- scoring ----------
  function spendProfile() {
    const s = { ...DEFAULT_SPEND };
    for (const k of answers.spend) s[k] = Math.round(s[k] * 2.5);
    if (answers.travel === "often") { s.hotels *= 3; s.airfare *= 3; }
    if (answers.travel === "rarely") { s.hotels = 0; s.airfare = 0; }
    return s;
  }
  function eligible(c) {
    if (answers.fee === "0" && c.annualFee > 0) return false;
    if (answers.fee === "100" && c.annualFee > 100) return false;
    const tiers = { fair: ["fair"], good: ["fair", "good"], excellent: ["fair", "good", "excellent"], unsure: ["fair", "good"] }[answers.credit] || ["fair", "good", "excellent"];
    return tiers.includes(c.creditTier);
  }
  function score(c) {
    const spend = spendProfile();
    let s = 0;
    for (const k of answers.wants) if (CC.matches(c, k)) s += 30;
    for (const k of answers.spend) s += CC.rate(c, k) * c.pointValue * 4;
    const travelish = c.rewardType !== "cashback";
    if (answers.travel === "rarely") s -= (travelish ? 12 : 0) + (c.perks.includes("lounge") ? 20 : 0);
    if (answers.travel === "often") s += (travelish ? 15 : 0) + (c.perks.includes("lounge") ? 10 : 0) + (c.ftf ? -10 : 0);
    if (answers.credit === "fair" && c.creditTier === "fair") s += 25;
    s += CC.firstYearValue(c, spend) / 40;
    return s;
  }
  function ranked() {
    const list = CARDS.filter(eligible).map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s);
    if (!list.length) return [];
    const top = list[0].s, low = Math.min(...list.map((x) => x.s));
    return list.map((x) => ({ ...x, pct: Math.round(96 - (top === low ? 0 : ((top - x.s) / (top - low)) * 38)) }));
  }

  // Plain-English reasons tied back to the visitor's own answers.
  function reasons(c) {
    const out = [];
    for (const k of answers.wants) {
      if (!CC.matches(c, k)) continue;
      const h = CC.highlights(c, [k])[0];
      const lines = {
        signup_bonus: `A welcome bonus worth about ${usd(CC.bonusValue(c))} after you spend ${usd(c.bonus.spend)} in the first ${c.bonus.months} months.`,
        travel_points: `Earns ${REWARD_TYPES[c.rewardType].toLowerCase()} you can put toward trips.`,
        cash_back: `Straightforward cash back — no points math.`,
        no_annual_fee: `No annual fee, so it never costs you to keep.`,
        intro_apr: `0% interest on purchases for ${c.introApr} months.`,
        build_credit: `Designed to approve people who are still building credit.`,
      };
      out.push(lines[k] || (h ? h.charAt(0).toUpperCase() + h.slice(1) + "." : null));
    }
    const best = answers.spend.map((k) => [k, CC.rate(c, k) * c.pointValue]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) out.push(`Earns ${CC.rateLabel(c, best[0])} on ${CATEGORIES[best[0]].label.toLowerCase()} — one of your biggest spends.`);
    if (c.annualFee && c.firstYearFee === 0) out.push(`No annual fee the first year, then ${usd(c.annualFee)}.`);
    if (c.annualFee) {
      const v = CC.ongoingValue(c, spendProfile()) + c.annualFee;
      if (v > c.annualFee) out.push(`The ${usd(c.annualFee)} fee is covered by roughly ${usd(v)} a year in rewards and credits for someone like you.`);
    }
    return [...new Set(out.filter(Boolean))].slice(0, 4);
  }
  const oneLiner = (c) => c.bestFor[0] + ".";

  // ---------- render ----------
  const art = (c, cls = "") =>
    `<div class="art ${cls}" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${esc(c.issuer)}<div class="nm">${esc(c.name)}</div></div>`;

  function route() {
    const h = location.hash.slice(1) || "/";
    document.getElementById("bar-results").hidden = !complete() || h === "/results";
    closeDrawer();
    const m = h.match(/^\/q\/(\d)$/);
    if (m) return renderQuestion(+m[1]);
    if (h === "/results") return complete() ? renderResults() : (location.hash = "/q/1");
    renderIntro();
  }
  window.addEventListener("hashchange", route);

  function renderIntro() {
    const picks = [CARDS[2], CARDS[0], CARDS[1]];
    app.innerHTML = `
      <section class="intro fade-in">
        <h1>Meet the card that<br/><em>gets</em> you.</h1>
        <p>Five friendly questions. One clear recommendation — and the reasons why, in plain English.</p>
        <button class="big-btn" id="start">Find my match →</button><br/>
        ${complete() ? `<button class="text-btn" id="resume">See my last matches</button>` : ""}
        <div class="floaters">${picks.map((c) => `<div class="mini">${art(c)}</div>`).join("")}</div>
        <div class="promise"><span>Takes about a minute</span><span>No sign-up</span><span>Never affects your credit</span></div>
      </section>`;
    app.querySelector("#start").onclick = () => { answers = { ...EMPTY }; save(); location.hash = "/q/1"; };
    const r = app.querySelector("#resume");
    if (r) r.onclick = () => (location.hash = "/results");
  }

  function renderQuestion(n) {
    const q = QUESTIONS[n - 1];
    if (!q) return (location.hash = "/");
    const val = answers[q.id];
    const isOn = (v) => (q.multi ? val.includes(v) : val === v);
    app.innerHTML = `
      <section class="q fade-in">
        <div class="progress">${QUESTIONS.map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div>
        <div class="q-step">Question ${n} of ${QUESTIONS.length}</div>
        <h1>${q.title}</h1>
        <p class="hint">${q.hint}</p>
        <div class="opts ${q.stack ? "stack" : ""}">
          ${q.options.map((o) => `<button class="opt" data-v="${o.v}" aria-pressed="${isOn(o.v)}"><span class="e">${o.e}</span><span>${o.label}${o.sub ? `<small>${o.sub}</small>` : ""}</span></button>`).join("")}
        </div>
        <div class="q-nav">
          <button class="back" id="back">← Back</button>
          ${q.multi ? `<button class="big-btn" id="next" ${val.length ? "" : "disabled"}>${n === QUESTIONS.length ? "See my match" : "Next"} →</button>` : ""}
        </div>
      </section>`;
    const next = () => (location.hash = n === QUESTIONS.length ? "/results" : `/q/${n + 1}`);
    app.querySelector("#back").onclick = () => (location.hash = n === 1 ? "/" : `/q/${n - 1}`);
    app.querySelectorAll(".opt").forEach((b) =>
      (b.onclick = () => {
        const v = b.dataset.v;
        if (q.multi) {
          if (val.includes(v)) answers[q.id] = val.filter((x) => x !== v);
          else if (val.length < q.multi) answers[q.id] = [...val, v];
          else return;
          save();
          renderQuestion(n);
        } else {
          answers[q.id] = v;
          save();
          b.setAttribute("aria-pressed", "true");
          setTimeout(next, 220); // brief pause so the tap registers visually
        }
      })
    );
    const nb = app.querySelector("#next");
    if (nb) nb.onclick = next;
    window.scrollTo(0, 0);
  }

  let showAll = false;
  function renderResults() {
    const list = ranked();
    if (!list.length) {
      app.innerHTML = `<section class="intro fade-in"><h1>Hmm, nothing fits <em>all</em> of that.</h1><p>Try loosening the annual-fee answer — that's usually the one ruling cards out.</p><button class="big-btn" onclick="location.hash='/q/3'">Change fee answer</button></section>`;
      return;
    }
    const [top, ...rest] = list;
    const c = top.c;
    const spend = spendProfile();
    const qLabel = (q) => {
      const v = answers[q.id];
      const lab = (x) => q.options.find((o) => o.v === x)?.label;
      return q.multi ? v.map(lab).join(", ") : lab(v);
    };
    app.innerHTML = `
      <section class="fade-in">
        <div class="res-title"><span class="q-step">Your match</span><h1>We think you'll love this one.</h1></div>
        <div class="answers">Based on: ${QUESTIONS.map((q, i) => `<button data-q="${i + 1}" title="Change answer">${esc(qLabel(q))}</button>`).join("")}</div>

        <article class="hero-match">
          <span class="ribbon">Top pick</span>
          ${art(c, "xl")}
          <div>
            <span class="score">${top.pct}% match</span>
            <h2>${esc(c.name)}</h2>
            <div class="issuer">from ${esc(c.issuer)}</div>
            <ul class="why">
              ${reasons(c).map((r) => `<li>${esc(r)}</li>`).join("")}
              ${c.notFor[0] ? `<li class="warn">Worth knowing: not ideal for ${esc(c.notFor[0].charAt(0).toLowerCase() + c.notFor[0].slice(1))}.</li>` : ""}
            </ul>
            <div class="keynums">
              <div><strong>${usd(CC.firstYearValue(c, spend))}</strong>value in year one</div>
              <div><strong>${usd(c.annualFee)}</strong>annual fee</div>
              <div><strong>${CC.bonusValue(c) ? usd(CC.bonusValue(c)) : "—"}</strong>welcome bonus</div>
            </div>
            <div class="row-btns"><button class="pill coral" data-open="${c.id}">See the full picture</button></div>
          </div>
        </article>

        ${rest.length ? `<h2 class="section-h">Also worth a look</h2>
        <div class="runners">
          ${rest.slice(0, 2).map(({ c: r, pct }) => `
            <article class="runner">
              <div class="runner-top">${art(r)}<div><span class="score">${pct}% match</span><h3>${esc(r.name)}</h3></div></div>
              <p class="one-liner">${esc(oneLiner(r))}</p>
              <div class="row-btns"><button class="pill" data-vs="${r.id}">Compare with top pick</button><button class="text-btn" style="margin:0" data-open="${r.id}">Details</button></div>
            </article>`).join("")}
        </div>` : ""}

        ${rest.length > 2 ? `<h2 class="section-h">Every card that fits, ranked</h2>
        <div class="all-list">
          ${list.slice(0, showAll ? list.length : 6).map(({ c: r, pct }, i) => `
            <button class="all-row" data-open="${r.id}">
              <span class="rank">${i + 1}</span>${art(r)}
              <span><strong>${esc(r.name)}</strong><small>${esc(r.issuer)} · ${usd(r.annualFee)} fee</small></span>
              <span class="bar-meter"><i style="width:${pct}%"></i></span><span class="pct">${pct}%</span>
            </button>`).join("")}
        </div>
        ${list.length > 6 && !showAll ? `<button class="pill show-more" id="more">Show all ${list.length}</button>` : ""}` : ""}
      </section>`;

    app.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => (location.hash = `/q/${b.dataset.q}`)));
    app.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openDetail(b.dataset.open)));
    app.querySelectorAll("[data-vs]").forEach((b) => (b.onclick = () => openVs(c.id, b.dataset.vs)));
    const more = app.querySelector("#more");
    if (more) more.onclick = () => { showAll = true; renderResults(); };
  }

  // ---------- drawer ----------
  const drawer = document.getElementById("drawer");
  const dbody = document.getElementById("drawer-body");
  drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  function openDrawer(html) {
    dbody.innerHTML = html;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.querySelector(".drawer-panel").scrollTop = 0;
    dbody.querySelectorAll("[data-vs2]").forEach((b) => (b.onclick = () => openVs(...b.dataset.vs2.split("|"))));
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function openDetail(id) {
    const c = CC.byId(id);
    const spend = spendProfile();
    const top = ranked()[0]?.c;
    const cats = Object.keys(CATEGORIES).filter((k) => k !== "other" && c.earn[k]).concat("other");
    openDrawer(`
      ${art(c, "xl")}
      <h2>${esc(c.name)}</h2>
      <div class="issuer" style="color:var(--ink-soft)">${esc(c.issuer)} · ${REWARD_TYPES[c.rewardType]}</div>
      <div class="dsec"><h3>In a sentence</h3><p>${esc(c.bestFor.join(". "))}. Not ideal for ${esc(c.notFor.join(", ").toLowerCase())}.</p></div>
      <div class="dsec"><h3>What it's worth to you</h3>
        <div class="kv"><span>Welcome bonus</span><span>${CC.bonusValue(c) ? usd(CC.bonusValue(c)) : "None"}</span></div>
        <div class="kv"><span>Rewards on your spending</span><span>${usd(CC.yearlyRewards(c, spend))}/yr</span></div>
        <div class="kv"><span>Credits you can use</span><span>${usd(CC.creditsValue(c))}/yr</span></div>
        <div class="kv"><span>Annual fee${c.firstYearFee === 0 ? " (waived year one)" : ""}</span><span>−${usd(CC.firstYearFee(c))}</span></div>
        <div class="kv"><span><strong>Year one total</strong></span><span>${usd(CC.firstYearValue(c, spend))}</span></div>
      </div>
      ${c.bonus.amount || c.offerNote ? `<div class="dsec"><h3>Welcome bonus</h3><p>${esc(CC.bonusSentence(c))}.</p>${c.offerNote ? `<p class="note">${esc(c.offerNote)}</p>` : ""}</div>` : ""}
      <div class="dsec"><h3>How you earn</h3>${cats.map((k) => `<div class="kv"><span>${CATEGORIES[k].icon} ${CATEGORIES[k].label}</span><span>${CC.rateLabel(c, k)}</span></div>`).join("")}${c.earnNote ? `<p style="font-size:14px;color:var(--ink-soft);margin-top:8px">${esc(c.earnNote)}</p>` : ""}</div>
      ${c.credits.length || c.perks.length ? `<div class="dsec"><h3>Extras</h3>
        ${c.credits.map((x) => `<div class="kv"><span>${esc(x.label)}<br/><small>${esc(x.ease)}</small></span><span>${usd(x.amount)}</span></div>`).join("")}
        ${c.perks.map((p) => `<div class="kv"><span>${PERKS[p]}</span><span>✓</span></div>`).join("")}</div>` : ""}
      <div class="dsec"><h3>The fine print</h3>
        <div class="kv"><span>Intro APR</span><span>${c.introApr ? `0% for ${c.introApr} months` : "None"}</span></div>
        ${c.secured ? `<div class="kv"><span>Security deposit</span><span>${esc(c.secured)}</span></div>` : ""}
        <div class="kv"><span>Regular APR</span><span>Variable — set by ${esc(c.issuer)}</span></div>
        <div class="kv"><span>Foreign transaction fee</span><span>${c.ftf ? (c.ftfRate || "3%") : "None"}</span></div>
        <div class="kv"><span>Credit needed</span><span>${CREDIT_TIERS[c.creditTier]}</span></div>
      </div>
      <div class="row-btns">
        <a class="pill coral" href="${CC.issuerUrl(c)}" target="_blank" rel="noopener" style="text-decoration:none">Check offer at ${esc(c.issuer)} ↗</a>
        ${top && top.id !== c.id ? `<button class="pill" data-vs2="${top.id}|${c.id}">Compare with my top pick</button>` : ""}
      </div>
      <p style="font-size:13px;color:var(--ink-soft);margin-top:16px">Checked ${CC.AS_OF}. Offers change often and may differ for you.</p>
    `);
  }

  function openVs(aId, bId) {
    const a = CC.byId(aId), b = CC.byId(bId);
    const spend = spendProfile();
    const rounds = [
      ["Annual fee", (c) => c.annualFee, "low", "costs less to keep"],
      ["Welcome bonus", (c) => CC.bonusValue(c), "high", "gives a bigger head start"],
      ["Yearly rewards on your spending", (c) => CC.yearlyRewards(c, spend), "high", "earns more on how you spend"],
      ["Credits per year", (c) => CC.creditsValue(c), "high", "has more credits to use"],
      ["Value in year one", (c) => CC.firstYearValue(c, spend), "high", "comes out ahead in year one"],
      ["Value every year after", (c) => CC.ongoingValue(c, spend), "high", "keeps paying off long-term"],
    ];
    let wins = { a: 0, b: 0 };
    const html = rounds.map(([label, fn, better, phrase]) => {
      const va = fn(a), vb = fn(b);
      let w = null;
      if (Math.round(va) !== Math.round(vb)) w = (better === "high" ? va > vb : va < vb) ? "a" : "b";
      if (w) wins[w]++;
      const say = w ? `${(w === "a" ? a : b).name} ${phrase}.` : "It's a tie.";
      return `<div class="round"><div class="lbl">${label}</div><div class="vals"><span class="${w === "a" ? "win" : ""}">${usd(va)}</span><span class="${w === "b" ? "win" : ""}">${usd(vb)}</span></div><div class="say">${esc(say)}</div></div>`;
    }).join("");
    const winner = wins.a >= wins.b ? a : b, loser = winner === a ? b : a;
    openDrawer(`
      <h2>Head to head</h2>
      <div class="h2h-cards">${art(a)}<span class="vs">vs</span>${art(b)}</div>
      <div class="h2h-names"><span>${esc(a.name)}</span><span>${esc(b.name)}</span></div>
      ${html}
      <div class="verdict"><h3>Our take</h3>${esc(winner.name)} wins ${Math.max(wins.a, wins.b)} of ${rounds.length} rounds for the way you spend. Choose ${esc(loser.name)} instead if ${esc(loser.bestFor[0].charAt(0).toLowerCase() + loser.bestFor[0].slice(1))} matters more to you.</div>
    `);
  }

  route();
})();
