/*
 * Sample card data + helpers shared by all three prototypes.
 * All cards, issuers and numbers are FICTIONAL placeholders for design work.
 * Each prototype keeps its own copy in public/cards.js so it deploys standalone;
 * run `node scripts/sync-cards.mjs` from the repo root after editing this file.
 */
(function () {
  const CATEGORIES = {
    dining: { label: "Dining", icon: "🍽" },
    groceries: { label: "Groceries", icon: "🛒" },
    hotels: { label: "Hotels", icon: "🛏" },
    airfare: { label: "Flights", icon: "✈" },
    gas: { label: "Gas", icon: "⛽" },
    streaming: { label: "Streaming", icon: "📺" },
    other: { label: "Everything else", icon: "💳" },
  };

  const BENEFITS = {
    signup_bonus: { label: "Sign-up bonus", icon: "🎁", blurb: "Big reward for new cardholders" },
    hotel_credit: { label: "Hotel credit", icon: "🛏", blurb: "Statement credits for hotel stays" },
    travel_points: { label: "Travel points", icon: "🧭", blurb: "Points & miles for trips" },
    airline_perks: { label: "Airline perks", icon: "✈", blurb: "Free bags, priority boarding" },
    lounge: { label: "Airport lounges", icon: "🛋", blurb: "Relax before your flight" },
    cash_back: { label: "Cash back", icon: "💵", blurb: "Simple money back" },
    dining_groceries: { label: "Dining & groceries", icon: "🍽", blurb: "Bonus rewards on food" },
    no_annual_fee: { label: "No annual fee", icon: "0", blurb: "Costs nothing to keep" },
    intro_apr: { label: "0% intro APR", icon: "%", blurb: "Pay off purchases over time" },
    no_ftf: { label: "No foreign fees", icon: "🌍", blurb: "Use it abroad for free" },
    build_credit: { label: "Build credit", icon: "📈", blurb: "Easier approval, grow your score" },
  };

  const PERKS = {
    lounge: "Airport lounge access",
    global_entry: "Global Entry / TSA PreCheck credit",
    free_bag: "First checked bag free",
    priority_boarding: "Priority boarding",
    free_night: "Free hotel night each year",
    elite_status: "Automatic hotel elite status",
    cell_protection: "Cell phone protection",
    purchase_protection: "Purchase protection",
    limit_review: "Automatic credit-limit reviews",
  };

  const CREDIT_TIERS = {
    fair: "Fair / building",
    good: "Good",
    excellent: "Excellent",
  };

  const REWARD_TYPES = {
    cashback: "Cash back",
    points: "Flexible points",
    airline: "Airline miles",
    hotel: "Hotel points",
  };

  // pointValue = cents per point/mile/percent. Cash back uses 1.
  const CARDS = [
    {
      id: "northstar-reserve", name: "Voyager Reserve", issuer: "Northstar Bank",
      colors: ["#0f172a", "#334155"], annualFee: 395, creditTier: "excellent", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 80000, unit: "points", spend: 4000, months: 3 },
      earn: { airfare: 3, hotels: 3, dining: 3, other: 1 },
      credits: [{ type: "travel", amount: 300, label: "Annual travel credit", ease: "Applied automatically to any travel purchase" }],
      perks: ["lounge", "global_entry", "cell_protection"], ftf: false, introApr: 0, apr: "21.49%–28.49%",
      bestFor: ["Frequent travelers who'll use the $300 credit", "People who want lounge access"],
      notFor: ["Anyone who rarely travels", "First-time cardholders"],
    },
    {
      id: "northstar-everyday", name: "Everyday Cash", issuer: "Northstar Bank",
      colors: ["#0e7490", "#22d3ee"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 500, months: 3 },
      earn: { groceries: 3, dining: 3, other: 1.5 },
      credits: [], perks: ["purchase_protection"], ftf: true, introApr: 15, apr: "19.99%–28.74%",
      bestFor: ["Families with big grocery bills", "Simple, no-fee rewards"],
      notFor: ["International trips (3% foreign fee)"],
    },
    {
      id: "harbor-signature", name: "Harbor Hotels Signature", issuer: "Harbor Bank",
      colors: ["#7c2d12", "#ea580c"], annualFee: 99, creditTier: "good", rewardType: "hotel", pointValue: 0.6,
      bonus: { amount: 100000, unit: "points", spend: 3000, months: 3 },
      earn: { hotels: 10, dining: 4, groceries: 4, other: 2 },
      credits: [{ type: "hotel", amount: 50, label: "Hotel stay credit", ease: "Credited when you book a Harbor property" }],
      perks: ["free_night"], ftf: false, introApr: 0, apr: "20.99%–27.99%",
      bestFor: ["Loyal Harbor Hotels guests", "A yearly free night that covers the fee"],
      notFor: ["Travelers who switch hotel brands"],
    },
    {
      id: "harbor-elite", name: "Harbor Hotels Elite", issuer: "Harbor Bank",
      colors: ["#1c1917", "#a16207"], annualFee: 450, creditTier: "excellent", rewardType: "hotel", pointValue: 0.6,
      bonus: { amount: 150000, unit: "points", spend: 6000, months: 6 },
      earn: { hotels: 14, dining: 6, other: 3 },
      credits: [
        { type: "hotel", amount: 200, label: "Hotel resort credit", ease: "Twice a year, $100 at Harbor resorts" },
        { type: "dining", amount: 120, label: "Dining credit", ease: "$10 monthly at participating restaurants" },
      ],
      perks: ["lounge", "elite_status", "free_night"], ftf: false, introApr: 0, apr: "21.99%–29.24%",
      bestFor: ["Several hotel stays a year", "Wanting room upgrades through elite status"],
      notFor: ["Budget travelers — the fee is steep"],
    },
    {
      id: "skyline-plus", name: "Skyline Miles Plus", issuer: "Skyline Credit",
      colors: ["#1e3a8a", "#3b82f6"], annualFee: 95, creditTier: "good", rewardType: "airline", pointValue: 1.3,
      bonus: { amount: 60000, unit: "miles", spend: 3000, months: 3 },
      earn: { airfare: 3, dining: 2, other: 1 },
      credits: [{ type: "airline", amount: 100, label: "Inflight & seat credit", ease: "Covers Wi-Fi, snacks and seat upgrades" }],
      perks: ["free_bag", "priority_boarding"], ftf: false, introApr: 0, apr: "20.49%–28.49%",
      bestFor: ["Flying Skyline 2+ times a year", "Saving on checked bags"],
      notFor: ["People loyal to another airline"],
    },
    {
      id: "skyline-premier", name: "Skyline Premier", issuer: "Skyline Credit",
      colors: ["#020617", "#1d4ed8"], annualFee: 550, creditTier: "excellent", rewardType: "airline", pointValue: 1.3,
      bonus: { amount: 90000, unit: "miles", spend: 5000, months: 3 },
      earn: { airfare: 4, hotels: 2, dining: 2, other: 1 },
      credits: [{ type: "airline", amount: 250, label: "Airline fee credit", ease: "Bags, seats and change fees on Skyline" }],
      perks: ["lounge", "free_bag", "priority_boarding", "global_entry"], ftf: false, introApr: 0, apr: "21.49%–29.49%",
      bestFor: ["Road warriors who live in airports", "Lounge access on every trip"],
      notFor: ["Occasional flyers"],
    },
    {
      id: "meridian-flat", name: "Flat 2%", issuer: "Meridian",
      colors: ["#14532d", "#22c55e"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      earn: { other: 2 },
      credits: [], perks: ["cell_protection"], ftf: true, introApr: 18, apr: "19.24%–29.24%",
      bestFor: ["Set-it-and-forget-it rewards", "Paying off a big purchase over 18 months"],
      notFor: ["Bonus hunters — there's no sign-up bonus"],
    },
    {
      id: "meridian-starter", name: "Starter", issuer: "Meridian",
      colors: ["#365314", "#84cc16"], annualFee: 0, creditTier: "fair", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      earn: { gas: 2, other: 1 },
      credits: [], perks: ["limit_review"], ftf: false, introApr: 0, apr: "28.99%",
      bestFor: ["Building or rebuilding credit", "No credit history needed"],
      notFor: ["Maximizing rewards"],
    },
    {
      id: "pine-gold", name: "Gold Table", issuer: "Pine Financial",
      colors: ["#713f12", "#eab308"], annualFee: 250, creditTier: "excellent", rewardType: "points", pointValue: 1.6,
      bonus: { amount: 60000, unit: "points", spend: 6000, months: 6 },
      earn: { dining: 4, groceries: 4, airfare: 3, other: 1 },
      credits: [
        { type: "dining", amount: 120, label: "Dining credit", ease: "$10/month at select restaurants & delivery apps" },
        { type: "travel", amount: 100, label: "Hotel collection credit", ease: "On 2+ night stays booked through Pine Travel" },
      ],
      perks: ["purchase_protection"], ftf: false, introApr: 0, apr: "Pay in full (charge card)",
      bestFor: ["Foodies who eat out and cook a lot", "Turning grocery runs into trips"],
      notFor: ["People who won't use the monthly credits"],
    },
    {
      id: "pine-flex", name: "Flex Points", issuer: "Pine Financial",
      colors: ["#4c1d95", "#a78bfa"], annualFee: 0, creditTier: "good", rewardType: "points", pointValue: 1.0,
      bonus: { amount: 20000, unit: "points", spend: 1000, months: 3 },
      earn: { dining: 3, streaming: 3, other: 1 },
      credits: [], perks: ["cell_protection"], ftf: true, introApr: 15, apr: "19.99%–28.99%",
      bestFor: ["A no-fee start to earning points", "Streaming-heavy households"],
      notFor: ["Use abroad (3% foreign fee)"],
    },
    {
      id: "lumen-rotate", name: "Rotate 5", issuer: "Lumen",
      colors: ["#831843", "#f472b6"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 150, unit: "usd", spend: 500, months: 3 },
      earn: { gas: 5, groceries: 5, other: 1 },
      earnNote: "5% categories rotate each quarter (up to $1,500)",
      credits: [], perks: [], ftf: false, introApr: 15, apr: "18.99%–27.99%",
      bestFor: ["People happy to activate categories quarterly"],
      notFor: ["Anyone who wants zero effort"],
    },
    {
      id: "lumen-student", name: "Student Cash", issuer: "Lumen",
      colors: ["#164e63", "#06b6d4"], annualFee: 0, creditTier: "fair", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 50, unit: "usd", spend: 100, months: 3 },
      earn: { other: 1.5 },
      credits: [], perks: ["limit_review"], ftf: false, introApr: 6, apr: "18.99%–27.99%",
      bestFor: ["Students and first cards", "Studying abroad — no foreign fees"],
      notFor: ["High spenders chasing big rewards"],
    },
    {
      id: "atlas-travel", name: "Atlas Travel", issuer: "Atlas Card Co.",
      colors: ["#134e4a", "#14b8a6"], annualFee: 0, creditTier: "good", rewardType: "points", pointValue: 1.0,
      bonus: { amount: 25000, unit: "points", spend: 1000, months: 3 },
      earn: { airfare: 3, hotels: 3, other: 1.5 },
      credits: [], perks: [], ftf: false, introApr: 12, apr: "19.49%–28.49%",
      bestFor: ["Travel rewards without an annual fee"],
      notFor: ["Lounge or luxury perks"],
    },
    {
      id: "atlas-premier", name: "Atlas Premier", issuer: "Atlas Card Co.",
      colors: ["#0c4a6e", "#0ea5e9"], annualFee: 95, creditTier: "good", rewardType: "points", pointValue: 1.25,
      bonus: { amount: 75000, unit: "points", spend: 4000, months: 3 },
      earn: { hotels: 5, airfare: 2, dining: 2, other: 2 },
      credits: [{ type: "hotel", amount: 50, label: "Annual hotel credit", ease: "On any hotel booked through Atlas Travel" }],
      perks: ["global_entry"], ftf: false, introApr: 0, apr: "20.24%–28.24%",
      bestFor: ["A strong all-rounder for travel", "2x on everything you buy"],
      notFor: ["Avoiding annual fees entirely"],
    },
    {
      id: "cove-transfer", name: "Breathing Room", issuer: "Cove Bank",
      colors: ["#334155", "#94a3b8"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      earn: { other: 1 },
      credits: [], perks: [], ftf: true, introApr: 21, apr: "18.24%–28.99%",
      bestFor: ["Paying down existing debt", "Longest 0% intro period"],
      notFor: ["Earning meaningful rewards"],
    },
    {
      id: "cove-grocery", name: "Grocery Plus", issuer: "Cove Bank",
      colors: ["#166534", "#4ade80"], annualFee: 95, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 250, unit: "usd", spend: 3000, months: 6 },
      earn: { groceries: 6, streaming: 6, gas: 3, other: 1 },
      earnNote: "6% groceries on up to $6,000/year",
      credits: [], perks: [], ftf: true, introApr: 12, apr: "19.24%–29.99%",
      bestFor: ["Households spending $400+/month on groceries"],
      notFor: ["Light spenders — the fee eats the rewards"],
    },
  ];

  // Monthly spend used when the visitor hasn't told us theirs.
  const DEFAULT_SPEND = { dining: 300, groceries: 500, hotels: 80, airfare: 100, gas: 150, streaming: 40, other: 900 };

  const usd = (n) => (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

  function bonusValue(c) {
    if (!c.bonus.amount) return 0;
    return c.bonus.unit === "usd" ? c.bonus.amount : (c.bonus.amount * c.pointValue) / 100;
  }
  function bonusLabel(c) {
    if (!c.bonus.amount) return "None";
    return c.bonus.unit === "usd" ? usd(c.bonus.amount) : c.bonus.amount.toLocaleString("en-US") + " " + c.bonus.unit;
  }
  function bonusSentence(c) {
    if (!c.bonus.amount) return "No sign-up bonus";
    return `Earn ${bonusLabel(c)}${c.bonus.unit === "usd" ? "" : ` (≈${usd(bonusValue(c))})`} after spending ${usd(c.bonus.spend)} in ${c.bonus.months} months`;
  }
  function rate(c, cat) {
    return c.earn[cat] ?? c.earn.other ?? 1;
  }
  function rateLabel(c, cat) {
    const r = rate(c, cat);
    return c.rewardType === "cashback" ? r + "%" : r + "x";
  }
  function creditsValue(c) {
    return c.credits.reduce((s, x) => s + x.amount, 0);
  }
  function yearlyRewards(c, spend = DEFAULT_SPEND) {
    let cents = 0;
    for (const cat of Object.keys(CATEGORIES)) cents += (spend[cat] || 0) * 12 * rate(c, cat) * c.pointValue;
    return cents / 100;
  }
  function firstYearValue(c, spend) {
    return bonusValue(c) + yearlyRewards(c, spend) + creditsValue(c) - c.annualFee;
  }
  function ongoingValue(c, spend) {
    return yearlyRewards(c, spend) + creditsValue(c) - c.annualFee;
  }
  function topEarn(c, n = 3) {
    return Object.entries(c.earn)
      .filter(([k]) => k !== "other")
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => `${rateLabel(c, k)} ${CATEGORIES[k].label.toLowerCase()}`)
      .concat(`${rateLabel(c, "other")} everything else`)
      .slice(0, n);
  }

  const MATCHERS = {
    signup_bonus: (c) => bonusValue(c) >= 200,
    hotel_credit: (c) => c.credits.some((x) => x.type === "hotel") || c.perks.includes("free_night"),
    travel_points: (c) => c.rewardType !== "cashback",
    airline_perks: (c) => c.rewardType === "airline" || c.credits.some((x) => x.type === "airline") || c.perks.includes("free_bag"),
    lounge: (c) => c.perks.includes("lounge"),
    cash_back: (c) => c.rewardType === "cashback",
    dining_groceries: (c) => rate(c, "dining") * c.pointValue >= 3 || rate(c, "groceries") * c.pointValue >= 3,
    no_annual_fee: (c) => c.annualFee === 0,
    intro_apr: (c) => c.introApr >= 12,
    no_ftf: (c) => !c.ftf,
    build_credit: (c) => c.creditTier === "fair",
  };
  const matches = (c, key) => MATCHERS[key](c);

  // Short, human highlight lines for a card; benefits the visitor asked for come first.
  function highlights(c, wanted = []) {
    const lines = {
      signup_bonus: bonusValue(c) ? `${usd(bonusValue(c))} sign-up bonus value` : null,
      hotel_credit: c.credits.filter((x) => x.type === "hotel").map((x) => `${usd(x.amount)} ${x.label.toLowerCase()}`)[0] || (c.perks.includes("free_night") ? "Free hotel night every year" : null),
      airline_perks: c.perks.includes("free_bag") ? "First checked bag free" : null,
      lounge: c.perks.includes("lounge") ? "Airport lounge access" : null,
      intro_apr: c.introApr ? `0% intro APR for ${c.introApr} months` : null,
      no_ftf: !c.ftf ? "No foreign transaction fees" : null,
      no_annual_fee: c.annualFee === 0 ? "No annual fee, ever" : null,
      build_credit: c.creditTier === "fair" ? "Approval with limited credit history" : null,
      dining_groceries: MATCHERS.dining_groceries(c) ? `${rateLabel(c, "dining")} dining · ${rateLabel(c, "groceries")} groceries` : null,
    };
    const order = [...wanted, ...Object.keys(lines)];
    const out = [];
    for (const k of order) if (lines[k] && !out.includes(lines[k])) out.push(lines[k]);
    for (const cr of c.credits) {
      const l = `${usd(cr.amount)} ${cr.label.toLowerCase()}`;
      if (!out.includes(l)) out.push(l);
    }
    return out;
  }

  window.CC = {
    CATEGORIES, BENEFITS, PERKS, CREDIT_TIERS, REWARD_TYPES, CARDS, DEFAULT_SPEND,
    usd, bonusValue, bonusLabel, bonusSentence, rate, rateLabel, creditsValue,
    yearlyRewards, firstYearValue, ongoingValue, topEarn, matches, highlights,
    byId: (id) => CARDS.find((c) => c.id === id),
  };
})();
