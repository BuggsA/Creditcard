/*
 * Card data + helpers shared by all three prototypes.
 *
 * Real US cards, researched from issuer pages and card-review sites on AS_OF below.
 * Welcome offers change often and many vary by applicant: cards with `offerNote`
 * had conflicting or targeted offers across sources. APRs are omitted on purpose
 * (they depend on the applicant) — always send people to the issuer for final terms.
 *
 * Each prototype keeps its own copy in public/cards.js so it deploys standalone;
 * run `node scripts/sync-cards.mjs` from the repo root after editing this file.
 */
(function () {
  const AS_OF = "Oct 30, 2026";

  const CATEGORIES = {
    dining: { label: "Dining", icon: "dining" },
    groceries: { label: "Groceries", icon: "groceries" },
    hotels: { label: "Hotels", icon: "bed" },
    airfare: { label: "Flights", icon: "plane" },
    gas: { label: "Gas", icon: "gas" },
    streaming: { label: "Streaming", icon: "streaming" },
    other: { label: "Everything else", icon: "card" },
  };

  /*
   * Line icons (24×24, drawn with the current text color) used instead of emoji.
   * CC.icon("name") returns an inline <svg>; style size/color with the .i class.
   */
  const ICONS = {
    dining: '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M18 21V3c-2.2 1.4-3.5 4-3.5 7.5 0 1.4 1.1 2.5 2.5 2.5h1"/>',
    groceries: '<path d="M3 4h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6.4"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17.5" cy="20" r="1.2"/>',
    bed: '<path d="M3 19V5M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
    plane: '<path d="M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5v2l7.5-2.5v4l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-4l7.5 2.5z"/>',
    gas: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6.5a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    streaming: '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M8 21h8M10.5 8.4v4.7l4-2.35z"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8C10.5 4.5 6.5 4 6.5 6.5S9 8 12 8zm0 0c1.5-3.5 5.5-4 5.5-1.5S15 8 12 8z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    lounge: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3zM5 17v2M19 17v2"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
    tag: '<path d="M3 11.5v-7A1.5 1.5 0 0 1 4.5 3h7l9.5 9.5-8.5 8.5z"/><circle cx="8" cy="8" r="1.5"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    luggage: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M9 11v5M15 11v5M8 20v1M16 20v1"/>',
    home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M12 21 8.5 9 12 3l3.5 6z"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zm0 2c0-3.5 2.5-5.5 6.5-5.5 0 3.5-2.5 5.5-6.5 5.5z"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8 5.7-5.8"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 17h.01"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    bars: '<rect x="3" y="13" width="4.5" height="8" rx="1" fill="currentColor" stroke="none"/><rect x="9.75" y="8" width="4.5" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="16.5" y="3" width="4.5" height="18" rx="1" fill="currentColor" stroke="none"/>',
  };
  const icon = (name, cls = "") =>
    `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

  const BENEFITS = {
    signup_bonus: { label: "Sign-up bonus", icon: "gift", blurb: "Big reward for new cardholders" },
    hotel_credit: { label: "Hotel credit", icon: "bed", blurb: "Hotel credits or free nights" },
    travel_points: { label: "Travel points", icon: "compass", blurb: "Points & miles for trips" },
    airline_perks: { label: "Airline perks", icon: "plane", blurb: "Free bags, priority boarding" },
    lounge: { label: "Airport lounges", icon: "lounge", blurb: "Relax before your flight" },
    cash_back: { label: "Cash back", icon: "cash", blurb: "Simple money back" },
    dining_groceries: { label: "Dining & groceries", icon: "dining", blurb: "Bonus rewards on food" },
    no_annual_fee: { label: "No annual fee", icon: "tag", blurb: "Costs nothing to keep" },
    intro_apr: { label: "0% intro APR", icon: "percent", blurb: "Pay off purchases over time" },
    no_ftf: { label: "No foreign fees", icon: "globe", blurb: "Use it abroad for free" },
    build_credit: { label: "Build credit", icon: "trend", blurb: "Easier approval, grow your score" },
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

  const ISSUER_URLS = {
    Chase: "https://creditcards.chase.com/",
    "American Express": "https://www.americanexpress.com/us/credit-cards/",
    "Capital One": "https://www.capitalone.com/credit-cards/",
    Citi: "https://www.citi.com/credit-cards/",
    "Wells Fargo": "https://creditcards.wellsfargo.com/",
    Discover: "https://www.discover.com/credit-cards/",
  };

  // Application & bonus rules people ask about most. Issuers don't publish all of these;
  // they are widely reported by applicants, so the wording stays hedged.
  const ISSUER_RULES = {
    Chase: "5/24: usually denied if you've opened 5+ personal cards (any bank) in the last 24 months. The bonus may be unavailable if you've had this card before.",
    "American Express": "Welcome offers are generally once per lifetime per card. Amex usually tells you before approval if you won't get the bonus.",
    "Capital One": "Generally approves about one new Capital One card every 6 months. Bonuses may be limited if you've had the card in the last 48 months.",
    Citi: "One welcome bonus per card family every 48 months. Citi also limits how often you can apply (about 1 card per 8 days, 2 per 65 days).",
    "Wells Fargo": "Bonus and intro APR may be withheld if you opened another Wells Fargo card in the last 6 months.",
    Discover: "Cashback Match is for new Discover cardmembers only.",
  };

  const NETWORK_NOTES = {
    Visa: "Accepted almost everywhere, including Costco warehouses (Visa only).",
    Mastercard: "Accepted almost everywhere — but not at Costco warehouses (Visa only).",
    Amex: "Not accepted everywhere: less common abroad and at some small businesses. Not accepted at Costco warehouses.",
    Discover: "Limited acceptance outside the U.S. Not accepted at Costco warehouses.",
  };

  // Credit helper: `value` is what a typical cardholder actually gets out of it
  // (used in all value math); `amount` is the advertised face value.
  const cr = (type, amount, label, ease, value = amount) => ({ type, amount, label, ease, value });

  /*
   * pointValue = our estimated cents per point/mile (cash back = 1).
   * earn = direct-purchase rates; portal-only rates go in earnNote.
   * caps = yearly spend per category before the rate drops to capRate (default 1).
   * firstYearFee = intro annual fee when the first year is waived.
   * bonus.value/bonus.label override the computed bonus for non-point bonuses (e.g. free nights).
   */
  const CARDS = [
    // ---------- Flexible travel points ----------
    {
      id: "chase-sapphire-preferred", network: "Visa", name: "Sapphire Preferred", issuer: "Chase",
      colors: ["#0b2a4a", "#2d5b8a"], annualFee: 95, creditTier: "good", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 75000, unit: "points", spend: 5000, months: 3 },
      earn: { dining: 3, gas: 3, streaming: 3, airfare: 2, hotels: 2, other: 1 },
      earnNote: "5x on travel booked through Chase Travel; 3x on online groceries (not Walmart, Target or wholesale clubs).",
      credits: [cr("hotel", 100, "Hotel credit", "On hotel stays booked through Chase Travel", 75)],
      perks: ["global_entry", "purchase_protection"], ftf: false, introApr: 0,
      bestFor: ["A first travel card that's easy to get value from", "Diners who also want gas and streaming rewards"],
      notFor: ["People who'd never book travel through Chase"],
    },
    {
      id: "chase-sapphire-reserve", network: "Visa", name: "Sapphire Reserve", issuer: "Chase",
      colors: ["#030712", "#1e293b"], annualFee: 795, creditTier: "excellent", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 100000, unit: "points", spend: 6000, months: 3 },
      offerNote: "Sources reported both 100,000 and 125,000 points in 2026 — check Chase for today's offer.",
      earn: { airfare: 4, hotels: 4, dining: 3, other: 1 },
      earnNote: "8x on everything booked through Chase Travel.",
      credits: [
        cr("travel", 300, "Annual travel credit", "Applied automatically to almost any travel purchase", 300),
        cr("dining", 300, "Dining credit", "$150 twice a year at Sapphire Reserve Exclusive Tables restaurants", 150),
        cr("hotel", 500, "The Edit hotel credit", "$250 twice a year on 2+ night stays booked via The Edit", 200),
        cr("other", 300, "StubHub credit", "$150 twice a year on StubHub / viagogo tickets", 75),
      ],
      perks: ["lounge", "global_entry"], ftf: false, introApr: 0,
      bestFor: ["Frequent travelers who'll use the $300 travel credit", "Lounge access when you fly"],
      notFor: ["Anyone who won't use the semi-annual credits — the fee is $795"],
    },
    {
      id: "amex-platinum", network: "Amex", name: "Platinum Card", issuer: "American Express",
      colors: ["#6b7280", "#d1d5db"], annualFee: 895, creditTier: "excellent", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 80000, unit: "points", spend: 8000, months: 6 },
      offerNote: "Offers vary by applicant — some see up to 175,000 points with higher spend.",
      earn: { airfare: 5, other: 1 },
      earnNote: "5x on flights booked directly with airlines or Amex Travel (up to $500K/yr); 5x on prepaid hotels via Amex Travel.",
      caps: { airfare: 500000 },
      credits: [
        cr("hotel", 600, "Hotel credit", "$300 twice a year on prepaid Fine Hotels + Resorts / Hotel Collection stays", 300),
        cr("dining", 400, "Resy dining credit", "$100 each quarter at U.S. Resy restaurants", 200),
        cr("other", 300, "Digital entertainment credit", "$25/month on select streaming & news subscriptions", 150),
        cr("airline", 200, "Airline fee credit", "Incidental fees on one airline you choose", 100),
        cr("other", 200, "Uber Cash", "$15/month plus $20 in December", 120),
        cr("other", 209, "CLEAR+ credit", "Covers a CLEAR+ membership", 100),
      ],
      perks: ["lounge", "global_entry", "elite_status"], ftf: false, introApr: 0,
      bestFor: ["Lounge lovers — the widest airport lounge access", "People who'll actually use many monthly credits"],
      notFor: ["Everyday spending — only 1x outside flights", "Anyone who doesn't want to track credits"],
    },
    {
      id: "amex-gold", network: "Amex", name: "Gold Card", issuer: "American Express",
      colors: ["#8a6a1f", "#e3c06a"], annualFee: 325, creditTier: "good", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 60000, unit: "points", spend: 6000, months: 6 },
      offerNote: "No public offer confirmed in our sources — Amex offers vary by applicant.",
      earn: { dining: 4, groceries: 4, airfare: 3, other: 1 },
      earnNote: "4x at restaurants (up to $50K/yr) and U.S. supermarkets (up to $25K/yr); 3x on flights booked directly.",
      caps: { dining: 50000, groceries: 25000 },
      credits: [
        cr("dining", 120, "Dining credit", "$10/month at participating partners", 80),
        cr("other", 120, "Uber Cash", "$10/month for Uber rides or Uber Eats", 90),
        cr("dining", 100, "Resy credit", "$50 twice a year at U.S. Resy restaurants", 75),
        cr("dining", 84, "Dunkin' credit", "$7/month at U.S. Dunkin'", 40),
      ],
      perks: ["purchase_protection"], ftf: false, introApr: 0,
      bestFor: ["Big grocery and restaurant spenders", "Foodies who'll use the monthly dining credits"],
      notFor: ["People who won't use monthly credits — the fee is $325"],
    },
    {
      id: "capital-one-venture-x", network: "Visa", name: "Venture X", issuer: "Capital One",
      colors: ["#0f172a", "#334155"], annualFee: 395, creditTier: "excellent", rewardType: "points", pointValue: 1.4,
      bonus: { amount: 75000, unit: "miles", spend: 4000, months: 3 },
      earn: { other: 2 },
      earnNote: "10x on hotels & rental cars and 5x on flights booked through Capital One Travel.",
      credits: [
        cr("travel", 300, "Capital One Travel credit", "On bookings through Capital One Travel", 250),
        cr("travel", 100, "10,000 anniversary miles", "Deposited every account anniversary", 140),
      ],
      perks: ["lounge", "global_entry"], ftf: false, introApr: 0,
      bestFor: ["The cheapest premium card with lounge access", "2x miles on everything"],
      notFor: ["People who won't book through Capital One Travel"],
    },
    {
      id: "capital-one-venture", network: "Visa", name: "Venture Rewards", issuer: "Capital One",
      colors: ["#1e3a5f", "#3b6ea5"], annualFee: 95, creditTier: "good", rewardType: "points", pointValue: 1.4,
      bonus: { amount: 75000, unit: "miles", spend: 4000, months: 3 },
      offerNote: "Some 2026 offers added a $250–$300 Capital One Travel credit.",
      earn: { other: 2 },
      earnNote: "5x on hotels and rental cars booked through Capital One Travel.",
      credits: [],
      perks: ["global_entry"], ftf: false, introApr: 0,
      bestFor: ["Simple 2x miles on every purchase", "Travelers who don't want to track categories"],
      notFor: ["Big diners or grocery shoppers — no bonus categories"],
    },
    {
      id: "citi-strata-premier", network: "Mastercard", name: "Strata Premier", issuer: "Citi",
      colors: ["#0b3d6e", "#1f78c8"], annualFee: 95, creditTier: "good", rewardType: "points", pointValue: 1.5,
      bonus: { amount: 60000, unit: "points", spend: 4000, months: 3 },
      offerNote: "A limited-time 75,000-point offer has also appeared.",
      earn: { airfare: 3, hotels: 3, dining: 3, groceries: 3, gas: 3, other: 1 },
      earnNote: "10x on hotels, car rentals and attractions booked through CitiTravel.com.",
      credits: [cr("hotel", 100, "Hotel credit", "Once a year on a single $500+ stay booked through CitiTravel.com", 50)],
      perks: [], ftf: false, introApr: 0,
      bestFor: ["3x across five everyday categories for $95", "Families who want points on groceries and gas"],
      notFor: ["Anyone wanting lounge access or premium perks"],
    },

    // ---------- Hotel cards ----------
    {
      id: "marriott-boundless", network: "Visa", name: "Marriott Bonvoy Boundless", issuer: "Chase",
      colors: ["#5a1a1a", "#a0412d"], annualFee: 95, creditTier: "good", rewardType: "hotel", pointValue: 0.7,
      bonus: { amount: 3, unit: "free nights", spend: 3000, months: 3, value: 700, label: "3 free nights" },
      offerNote: "Each free night is worth up to 50,000 points. Another 2026 offer was 125,000 points + a free night.",
      earn: { hotels: 6, groceries: 3, gas: 3, dining: 3, other: 2 },
      earnNote: "6x at Marriott hotels; 3x on groceries, gas & dining applies to the first $6,000 combined each year.",
      caps: { groceries: 2000, gas: 2000, dining: 2000 },
      capRate: 2,
      credits: [cr("hotel", 245, "Annual free night", "A free night (up to 35,000 points) every anniversary", 200)],
      perks: ["free_night", "elite_status"], ftf: false, introApr: 0,
      bestFor: ["Marriott regulars — the free night alone beats the $95 fee", "Automatic Silver Elite status"],
      notFor: ["Travelers who switch hotel brands"],
    },
    {
      id: "hilton-surpass", network: "Amex", name: "Hilton Honors Surpass", issuer: "American Express",
      colors: ["#0a2240", "#1d4f91"], annualFee: 150, creditTier: "good", rewardType: "hotel", pointValue: 0.5,
      bonus: { amount: 130000, unit: "points", spend: 3000, months: 6 },
      offerNote: "130K + a free night was a limited-time offer reported through July 2026 — today's offer may be lower.",
      earn: { hotels: 12, dining: 6, groceries: 6, gas: 6, other: 3 },
      earnNote: "12x at Hilton properties; 6x at U.S. restaurants, supermarkets and gas stations.",
      credits: [cr("hotel", 200, "Hilton credit", "$50 each quarter at Hilton properties", 100)],
      perks: ["elite_status"], ftf: false, introApr: 0,
      bestFor: ["Hilton loyalists who want Gold status", "Earning hotel points on everyday spending"],
      notFor: ["People who rarely stay at Hilton"],
    },
    {
      id: "world-of-hyatt", network: "Visa", name: "World of Hyatt", issuer: "Chase",
      colors: ["#3b2a1a", "#8c6a43"], annualFee: 95, creditTier: "good", rewardType: "hotel", pointValue: 1.5,
      bonus: { amount: 60000, unit: "points", spend: 5000, months: 3 },
      offerNote: "Usually split: 30,000 points after the first spend, more points on extra spending.",
      earn: { hotels: 4, dining: 2, airfare: 2, other: 1 },
      earnNote: "4x at Hyatt; 2x on restaurants, airline tickets bought direct, transit and gyms.",
      credits: [cr("hotel", 150, "Annual free night", "A Category 1–4 free night every anniversary", 125)],
      perks: ["free_night", "elite_status"], ftf: false, introApr: 0,
      bestFor: ["Hyatt fans — Hyatt points are worth more than most hotel points", "A yearly free night that covers the fee"],
      notFor: ["Areas without many Hyatt hotels"],
    },

    // ---------- Airline cards ----------
    {
      id: "delta-gold", network: "Amex", name: "Delta SkyMiles Gold", issuer: "American Express",
      colors: ["#7a5b14", "#c9a04a"], annualFee: 150, firstYearFee: 0, creditTier: "good", rewardType: "airline", pointValue: 1.1,
      bonus: { amount: 80000, unit: "miles", spend: 3000, months: 6 },
      offerNote: "Reported as up to 80,000 miles plus a $250 statement credit, ending 11/04/2026. Spend terms vary.",
      earn: { airfare: 2, dining: 2, groceries: 2, other: 1 },
      earnNote: "2x on Delta purchases, restaurants and U.S. supermarkets.",
      credits: [cr("hotel", 100, "Delta Stays credit", "On prepaid hotels booked through Delta Stays", 50)],
      perks: ["free_bag", "priority_boarding"], ftf: false, introApr: 0,
      bestFor: ["Delta flyers — a free checked bag saves $70+ per round trip", "$0 annual fee the first year"],
      notFor: ["People who don't fly Delta"],
    },
    {
      id: "united-explorer", network: "Visa", name: "United Explorer", issuer: "Chase",
      colors: ["#002244", "#0a5ab8"], annualFee: 150, firstYearFee: 0, creditTier: "good", rewardType: "airline", pointValue: 1.2,
      bonus: { amount: 60000, unit: "miles", spend: 3000, months: 3 },
      offerNote: "2026 offers ranged from 50,000 to 80,000 miles.",
      earn: { airfare: 2, dining: 2, hotels: 2, other: 1 },
      earnNote: "Higher rates on eligible United purchases; 2x on dining and hotels booked direct.",
      credits: [cr("hotel", 100, "United Hotels credit", "Two $50 credits on prepaid United Hotels bookings", 50)],
      perks: ["free_bag", "priority_boarding", "global_entry"], ftf: false, introApr: 0,
      bestFor: ["United flyers — free first bag for you and a companion", "Two United Club passes every year"],
      notFor: ["People who don't fly United"],
    },

    // ---------- Cash back ----------
    {
      id: "chase-freedom-unlimited", network: "Visa", name: "Freedom Unlimited", issuer: "Chase",
      colors: ["#123a6b", "#3a7bd5"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 500, months: 3 },
      offerNote: "Some 2026 offers were $250.",
      earn: { dining: 3, other: 1.5 },
      earnNote: "3% on dining and drugstores; 5% on travel through Chase Travel. Pairs with Sapphire cards for more value.",
      credits: [], perks: ["purchase_protection"], ftf: true, introApr: 15,
      bestFor: ["A no-fee everyday card with an easy bonus", "Pairing with a Sapphire card later"],
      notFor: ["Use abroad (3% foreign transaction fee)"],
    },
    {
      id: "wells-fargo-active-cash", network: "Visa", name: "Active Cash", issuer: "Wells Fargo",
      colors: ["#7f1d1d", "#d71e28"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 500, months: 3 },
      earn: { other: 2 },
      credits: [], perks: ["cell_protection"], ftf: true, introApr: 12,
      bestFor: ["Flat 2% back on everything — nothing to track", "An easy $200 bonus"],
      notFor: ["Use abroad (3% foreign transaction fee)"],
    },
    {
      id: "citi-double-cash", network: "Mastercard", name: "Double Cash", issuer: "Citi",
      colors: ["#0f3b63", "#4a90c2"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 1500, months: 6 },
      earn: { other: 2 },
      earnNote: "1% when you buy plus 1% when you pay. 0% intro APR on balance transfers for 18 months (not purchases).",
      credits: [], perks: [], ftf: true, introApr: 0,
      bestFor: ["Flat 2% back", "Moving a balance — 0% on transfers for 18 months"],
      notFor: ["New purchases you want to pay off slowly — no 0% on purchases"],
    },
    {
      id: "capital-one-savor", network: "Mastercard", name: "Savor Cash Rewards", issuer: "Capital One",
      colors: ["#4a1d1d", "#b5543a"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 500, months: 3 },
      earn: { dining: 3, groceries: 3, streaming: 3, other: 1 },
      earnNote: "3% on dining, entertainment, popular streaming and groceries (not superstores like Walmart/Target).",
      credits: [], perks: [], ftf: false, introApr: 0,
      bestFor: ["Food and fun spending with no annual fee", "Travel abroad — no foreign fees"],
      notFor: ["Big spenders on gas or travel"],
    },
    {
      id: "capital-one-quicksilver", network: "Mastercard", name: "Quicksilver", issuer: "Capital One",
      colors: ["#3f3f46", "#a1a1aa"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 200, unit: "usd", spend: 500, months: 3 },
      earn: { other: 1.5 },
      credits: [], perks: [], ftf: false, introApr: 15,
      bestFor: ["Simple 1.5% back with no foreign fees", "0% intro APR for 15 months"],
      notFor: ["Maximizing rewards — 2% cards earn more"],
    },
    {
      id: "amex-blue-cash-preferred", network: "Amex", name: "Blue Cash Preferred", issuer: "American Express",
      colors: ["#0b4f8a", "#4fa3e0"], annualFee: 95, firstYearFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 250, unit: "usd", spend: 3000, months: 6 },
      offerNote: "Offers seen in 2026 ranged from $250 to $350.",
      earn: { groceries: 6, streaming: 6, gas: 3, other: 1 },
      earnNote: "6% at U.S. supermarkets on up to $6,000/year, then 1%. 3% on transit and U.S. gas.",
      caps: { groceries: 6000 },
      credits: [], perks: ["purchase_protection"], ftf: true, ftfRate: "2.7%", introApr: 0,
      bestFor: ["Families spending $300+/month on groceries", "$0 annual fee the first year"],
      notFor: ["Light spenders — the $95 fee eats the rewards", "Use abroad (2.7% foreign fee)"],
    },
    {
      id: "wells-fargo-autograph", network: "Visa", name: "Autograph", issuer: "Wells Fargo",
      colors: ["#1f1f1f", "#7f1d1d"], annualFee: 0, creditTier: "good", rewardType: "points", pointValue: 1,
      bonus: { amount: 20000, unit: "points", spend: 1000, months: 3 },
      earn: { dining: 3, gas: 3, airfare: 3, hotels: 3, streaming: 3, other: 1 },
      earnNote: "3x on restaurants, travel, gas & EV charging, transit, popular streaming and phone plans.",
      credits: [], perks: ["cell_protection"], ftf: false, introApr: 0,
      bestFor: ["The best no-fee card for travel and dining categories", "Using abroad — no foreign fees"],
      notFor: ["Big grocery spenders — groceries earn 1x"],
    },

    // ---------- 0% APR & building credit ----------
    {
      id: "wells-fargo-reflect", network: "Visa", name: "Reflect", issuer: "Wells Fargo",
      colors: ["#4b5563", "#9ca3af"], annualFee: 0, creditTier: "good", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      earn: { other: 0 },
      credits: [], perks: ["cell_protection"], ftf: true, introApr: 21,
      bestFor: ["The longest 0% intro APR — 21 months on purchases and balance transfers"],
      notFor: ["Earning rewards — it has none"],
    },
    {
      id: "discover-it-secured", network: "Discover", name: "Discover it Secured", issuer: "Discover",
      colors: ["#7c2d12", "#f97316"], annualFee: 0, creditTier: "fair", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      offerNote: "Discover matches all the cash back you earn in your first year (Cashback Match).",
      earn: { dining: 2, gas: 2, other: 1 },
      earnNote: "2% at gas stations and restaurants on up to $1,000 combined each quarter, then 1%.",
      caps: { dining: 2000, gas: 2000 },
      secured: "$200 minimum refundable deposit",
      credits: [], perks: ["limit_review"], ftf: false, introApr: 0,
      bestFor: ["Building credit while still earning cash back", "Reviews for an upgrade starting at month 7"],
      notFor: ["Anyone who can't set aside a $200 deposit"],
    },
    {
      id: "capital-one-platinum-secured", network: "Mastercard", name: "Platinum Secured", issuer: "Capital One",
      colors: ["#334155", "#64748b"], annualFee: 0, creditTier: "fair", rewardType: "cashback", pointValue: 1,
      bonus: { amount: 0, unit: "usd", spend: 0, months: 0 },
      earn: { other: 0 },
      secured: "$49, $99 or $200 refundable deposit for a $200 line (based on your credit)",
      credits: [], perks: ["limit_review"], ftf: false, introApr: 0,
      bestFor: ["Starting or rebuilding credit with a deposit as low as $49"],
      notFor: ["Earning rewards — it has none"],
    },
  ];

  // Monthly spend used when the visitor hasn't told us theirs.
  const DEFAULT_SPEND = { dining: 300, groceries: 500, hotels: 80, airfare: 100, gas: 150, streaming: 40, other: 900 };

  const usd = (n) => (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

  function bonusValue(c) {
    if (c.bonus.value != null) return c.bonus.value;
    if (!c.bonus.amount) return 0;
    return c.bonus.unit === "usd" ? c.bonus.amount : (c.bonus.amount * c.pointValue) / 100;
  }
  function bonusLabel(c) {
    if (c.bonus.label) return c.bonus.label;
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
    if (!r) return "—";
    return c.rewardType === "cashback" ? r + "%" : r + "x";
  }
  // Realistic yearly value of the card's credits (not the advertised face value).
  function creditsValue(c) {
    return c.credits.reduce((s, x) => s + x.value, 0);
  }
  function creditsFace(c) {
    return c.credits.reduce((s, x) => s + x.amount, 0);
  }
  function yearlyRewards(c, spend = DEFAULT_SPEND) {
    let cents = 0;
    for (const cat of Object.keys(CATEGORIES)) {
      const yearly = (spend[cat] || 0) * 12;
      const cap = c.caps?.[cat];
      const capped = cap == null ? yearly : Math.min(yearly, cap);
      cents += (capped * rate(c, cat) + (yearly - capped) * (c.capRate ?? 1)) * c.pointValue;
    }
    return cents / 100;
  }
  function firstYearFee(c) {
    return c.firstYearFee ?? c.annualFee;
  }
  function firstYearValue(c, spend) {
    return bonusValue(c) + yearlyRewards(c, spend) + creditsValue(c) - firstYearFee(c);
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
      .concat(rate(c, "other") ? `${rateLabel(c, "other")} everything else` : "No rewards")
      .slice(0, n);
  }

  const MATCHERS = {
    signup_bonus: (c) => bonusValue(c) >= 200,
    hotel_credit: (c) => c.credits.some((x) => x.type === "hotel") || c.perks.includes("free_night"),
    travel_points: (c) => c.rewardType !== "cashback",
    airline_perks: (c) => c.rewardType === "airline" || c.credits.some((x) => x.type === "airline") || c.perks.includes("free_bag"),
    lounge: (c) => c.perks.includes("lounge"),
    cash_back: (c) => c.rewardType === "cashback" && rate(c, "other") > 0,
    dining_groceries: (c) => rate(c, "dining") * c.pointValue >= 3 || rate(c, "groceries") * c.pointValue >= 3,
    no_annual_fee: (c) => c.annualFee === 0,
    intro_apr: (c) => c.introApr >= 12,
    no_ftf: (c) => !c.ftf,
    build_credit: (c) => c.creditTier === "fair",
  };
  const matches = (c, key) => MATCHERS[key](c);

  // Lowercase a label's first letter for use mid-sentence, keeping brand names ("Uber Cash", "The Edit") intact.
  const BRANDS = /^(Uber|Resy|Dunkin|StubHub|The Edit|Hilton|Delta|United|Capital One|CLEAR|Marriott|Hyatt|Chase)/;
  const midSentence = (s) => (BRANDS.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

  // Short, human highlight lines for a card; benefits the visitor asked for come first.
  function highlights(c, wanted = []) {
    const lines = {
      signup_bonus: bonusValue(c) ? `${usd(bonusValue(c))} sign-up bonus value` : null,
      hotel_credit: c.credits.filter((x) => x.type === "hotel").map((x) => `${usd(x.amount)} ${midSentence(x.label)}`)[0] || (c.perks.includes("free_night") ? "Free hotel night every year" : null),
      airline_perks: c.perks.includes("free_bag") ? "First checked bag free" : null,
      lounge: c.perks.includes("lounge") ? "Airport lounge access" : null,
      intro_apr: c.introApr ? `0% intro APR for ${c.introApr} months` : null,
      no_ftf: !c.ftf ? "No foreign transaction fees" : null,
      no_annual_fee: c.annualFee === 0 ? "No annual fee, ever" : c.firstYearFee === 0 ? "$0 annual fee the first year" : null,
      build_credit: c.secured ? `Secured card: ${c.secured}` : null,
      dining_groceries: MATCHERS.dining_groceries(c) ? `${rateLabel(c, "dining")} dining · ${rateLabel(c, "groceries")} groceries` : null,
    };
    const order = [...wanted, ...Object.keys(lines)];
    const out = [];
    for (const k of order) if (lines[k] && !out.includes(lines[k])) out.push(lines[k]);
    for (const x of c.credits) {
      const l = `${usd(x.amount)} ${midSentence(x.label)}`;
      if (!out.includes(l)) out.push(l);
    }
    return out;
  }

  window.CC = {
    AS_OF, ICONS, icon, CATEGORIES, BENEFITS, PERKS, CREDIT_TIERS, REWARD_TYPES, CARDS, DEFAULT_SPEND,
    usd, bonusValue, bonusLabel, bonusSentence, rate, rateLabel, creditsValue, creditsFace, firstYearFee,
    midSentence, yearlyRewards, firstYearValue, ongoingValue, topEarn, matches, highlights,
    issuerUrl: (c) => ISSUER_URLS[c.issuer],
    issuerRule: (c) => ISSUER_RULES[c.issuer],
    networkNote: (c) => NETWORK_NOTES[c.network],
    byId: (id) => CARDS.find((c) => c.id === id),
  };
})();
