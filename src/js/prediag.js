// Pre-Diagnostic Questionnaire. One step at a time, mostly dropdowns and tap
// chips, autosaved to this browser, sent to /api/pre-diagnostic on the last
// step. The server doesn't know the questions: every answered question goes
// up as { section, label, value } (see lib/prediag.js), so editing a question
// here never needs a server change.
(function () {
  "use strict";

  var root = document.getElementById("pd-root");
  if (!root) return;

  var OTHER = "Other (type it)";
  var NOT_SURE = "Not sure";

  // Optional per-store setup, chosen by ?s=<key> on the link. The vendors
  // listed under `prefill` are ones already visible on that store's public
  // website; they arrive pre-selected and are flagged as "not confirmed" in
  // the email unless the respondent touches them.
  var CLIENTS = {
    nissan112: {
      store: "Nissan 112",
      oemName: "Nissan",
      prefill: {
        website: "Fox Dealer (Catalyst)",
        scheduling: "FlatHat",
        tradein: "AutoMark",
      },
      oemPrograms: [
        "Nissan Dealer Digital Program",
        "Dealer Business System (DBS)",
        "NCAR",
        "Nissan lead management",
        "NMAC tools",
        "Nissan reputation program",
        "Other",
        NOT_SURE,
      ],
    },
  };

  var params = new URLSearchParams(window.location.search);
  var clientKey = (params.get("s") || "").toLowerCase();
  var client = CLIENTS[clientKey] || null;
  var storeFromLink = client ? client.store : (params.get("client") || "").slice(0, 200);
  var oem = client ? client.oemName : "manufacturer";

  // ---------- question definitions ----------

  function opts() {
    return Array.prototype.slice.call(arguments);
  }

  var VERDICT = ["Works well", "Okay", "Frustrating", NOT_SURE];

  function vendor(id, label, short, list, noNone) {
    var o = list.slice();
    o.push(OTHER);
    if (!noNone) o.push("None");
    o.push(NOT_SURE);
    return { type: "vendor", id: id, label: label, short: short, options: o, verdict: VERDICT };
  }

  var LAYERS = [
    vendor("dms", "DMS", "DMS", opts("Reynolds & Reynolds", "CDK Global", "Tekion", "Dealertrack DMS"), true),
    vendor("crm", "CRM (if separate from the DMS)", "CRM",
      opts("Same as our DMS", "VinSolutions", "Elead (CDK)", "DealerSocket", "Reynolds & Reynolds CRM", "Tekion CRM")),
    vendor("website", "Website", "Website",
      opts("Fox Dealer (Catalyst)", "Dealer Inspire", "Dealer.com (Cox Automotive)", "DealerOn", "Dealer eProcess")),
    vendor("scheduling", "Service scheduling", "Service scheduling",
      opts("FlatHat", "Xtime (Cox Automotive)", "Built into our website", "Phone only")),
    vendor("tradein", "Trade-in / digital retailing", "Trade-in tool",
      opts("AutoMark", "Kelley Blue Book Instant Cash Offer", "Built into our website")),
    vendor("phones", "Phones / call tracking", "Phones",
      opts("Basic phone system, no call tracking", "Marchex", "CallRail")),
    vendor("texting", "Texting / chat", "Texting / chat",
      opts("Kenect", "Podium", "Gubagoo", "myKaarma", "Built into our CRM or DMS")),
    vendor("reviews", "Reviews / reputation", "Reviews",
      opts("Reputation.com", "Birdeye", "Podium", "DealerRater only", "No tool, we check Google ourselves")),
    vendor("fni", "F&I menu / credit tools", "F&I tools",
      opts("Reynolds & Reynolds menu", "CDK menu", "Dealertrack", "RouteOne")),
  ];

  var LAYER_SHORTS = LAYERS.map(function (l) { return l.short; });

  var LEAD_SOURCES = [
    oem === "manufacturer" ? "Manufacturer website" : oem + " website / program",
    "Our own website forms",
    "Third-party sites (AutoTrader, Cars.com, CarGurus…)",
    "Phone calls",
    "Chat or text",
    "Walk-ins",
    "Service customers",
    "Other",
  ];

  var FIRST_DAY = opts("BDC / internet team", "The assigned salesperson", "A sales manager", "Automated reply only", "Varies", NOT_SURE);
  var FIRST_OFF = opts("BDC / internet team", "The assigned salesperson", "A sales manager", "Automated reply only",
    "Nobody until the next business day", "Varies", NOT_SURE);
  var STANDARD = opts("Within 5 minutes", "Within 15 minutes", "Within 1 hour", "Same business day", "Next business day",
    "We don't have a set standard", NOT_SURE);

  var STEPS = [
    {
      id: "about",
      title: "About you",
      lede: "So we know whose perspective this is. Every decision-maker sees the store a little differently, and that's useful.",
      fields: [
        { type: "text", id: "store", label: "Store name", required: true, value: storeFromLink },
        { type: "text", id: "respondentName", label: "Your name", required: true },
        {
          type: "select", id: "role", label: "Your role", required: true, other: true,
          options: opts("Dealer principal / owner", "General manager", "General sales manager", "Sales manager",
            "BDC / internet manager", "Service director", "Parts manager", "Controller / office manager", OTHER),
        },
        { type: "text", id: "contact", label: "Best email or phone, in case of a follow-up question", optional: true },
      ],
    },
    {
      id: "store",
      n: 1,
      title: "The store at a glance",
      lede: "Ballparks are fine.",
      fields: [
        {
          type: "chips", id: "depts", label: "Which departments does the store run in-house?",
          options: opts("Sales (new cars)", "Used cars", "BDC / internet", "Finance (F&I)", "Service", "Parts", "Body shop",
            "Billing", "Accounting", "Marketing"),
        },
        { type: "text", id: "outsourced", label: "Anything outsourced, or shared with another store?", optional: true, placeholder: "e.g. accounting handled by the group office" },
        {
          type: "select", id: "headcount", label: "Roughly how many people work at the store?",
          options: opts("Under 25", "25–50", "51–100", "101–150", "Over 150"),
        },
        { type: "text", id: "hours", label: "Typical hours (Sales / Service / Parts)", optional: true, placeholder: "e.g. Sales Mon–Sat 9–8, Service Mon–Fri 7–6" },
        {
          type: "select", id: "newvol", label: "New cars sold per month",
          options: opts("Under 50", "50–100", "101–200", "201–300", "Over 300"),
        },
        {
          type: "select", id: "usedvol", label: "Used cars sold per month",
          options: opts("Under 25", "25–50", "51–100", "101–150", "Over 150"),
        },
        {
          type: "select", id: "rovol", label: "Service repair orders per month",
          options: opts("Under 750", "750–1,500", "1,501–2,500", "2,501–4,000", "Over 4,000"),
        },
        {
          type: "chips", id: "decider", label: "Who makes the call on changing a technology vendor?",
          options: opts("Dealer principal / owner", "General manager", "Group or corporate office", "A department head", "A committee", "Other"),
        },
        {
          type: "select", id: "group", label: "Is the store part of a group?",
          options: opts("Single store, we choose our own vendors", "Part of a group, but we choose our own vendors",
            "Part of a group, and the group sets some vendors", "Part of a group, and the group sets most vendors", NOT_SURE),
        },
      ],
    },
    {
      id: "tech",
      n: 2,
      title: "Technology the store pays for",
      lede: "Pick what you know and leave the rest. For each one, choose the product and how it's working for you.",
      fields: LAYERS.concat([
        {
          type: "chips", id: "unused", label: "Anything you pay for but barely use, or nobody really owns?", exclusive: ["Nothing comes to mind", NOT_SURE],
          options: LAYER_SHORTS.concat(["Something else", "Nothing comes to mind", NOT_SURE]),
        },
        { type: "text", id: "unusedtext", label: "If something else, what?", optional: true },
        {
          type: "chips", id: "renew", label: "Which of these renew in the next 12 months?", exclusive: [NOT_SURE],
          options: LAYER_SHORTS.concat([NOT_SURE]),
        },
        { type: "text", id: "othervendors", label: "Anything else you pay for monthly? (ads, SEO, video, inventory feeds…)", optional: true },
        client && client.oemPrograms
          ? { type: "chips", id: "oemprograms", label: "Which " + oem + " programs or systems does the team use day to day?", options: client.oemPrograms, exclusive: [NOT_SURE] }
          : { type: "text", id: "oemprograms", label: "Which manufacturer programs or systems does the team use day to day?", optional: true },
        { type: "text", id: "reps", label: "Which vendor reps actually call or come by? Name the vendors.", optional: true },
      ]),
    },
    {
      id: "leads",
      n: 3,
      title: "Leads and sales follow-up",
      lede: "How a new lead moves through the store today.",
      fields: [
        { type: "chips", id: "sources", label: "Where do your leads come from?", options: LEAD_SOURCES },
        { type: "chips", id: "topsources", label: "Which lead sources bring in the most?", max: 3, hint: "Pick up to 3.", options: LEAD_SOURCES },
        {
          type: "select", id: "landing", label: "Do all leads land in one system?",
          options: opts("Yes, everything lands in the CRM", "Mostly, but some arrive by email, text or a vendor portal", "No, they come in several places", NOT_SURE),
        },
        {
          type: "select", id: "bdc", label: "Who handles internet leads?",
          options: opts("A dedicated BDC / internet team", "Salespeople handle their own", "A mix of both", "An outside company", NOT_SURE),
        },
        { type: "select", id: "bdcsize", label: "How many people on the BDC / internet team?", options: opts("None", "1–2", "3–5", "6 or more", NOT_SURE) },
        {
          type: "select", id: "bdchours", label: "When is the BDC / internet team covering leads?",
          options: opts("Weekday business hours", "Weekdays plus evenings", "Evenings and weekends too", "Around the clock (outsourced or automated)", NOT_SURE),
        },
        {
          type: "group", title: "Who answers a new lead first?", note: "It can differ by when the lead arrives.",
          fields: [
            { type: "select", id: "first_day", label: "Weekday daytime", options: FIRST_DAY },
            { type: "select", id: "first_eve", label: "Weekday evenings", options: FIRST_OFF },
            { type: "select", id: "first_wkd", label: "Weekends", options: FIRST_OFF },
          ],
        },
        {
          type: "group", title: "How fast should a lead get a real person's reply?", note: "Your standard, not ours. We won't impose one.",
          fields: [
            { type: "select", id: "std_day", label: "Weekday daytime", options: STANDARD },
            { type: "select", id: "std_eve", label: "Weekday evenings", options: STANDARD },
            { type: "select", id: "std_wkd", label: "Weekends", options: STANDARD },
          ],
        },
        {
          type: "select", id: "assign", label: "How are leads assigned to salespeople?", other: true,
          options: opts("Round robin", "A manager assigns them", "First to grab it", "The BDC assigns them", "Whoever the customer asked for", OTHER, NOT_SURE),
        },
        {
          type: "select", id: "reassign", label: "When a salesperson is off or leaves, what happens to their leads?",
          options: opts("They're reassigned right away by a set process", "A manager handles it when someone remembers", "They sit until someone notices", NOT_SURE),
        },
        {
          type: "select", id: "unsold", label: "What happens to a lead that doesn't buy?",
          options: opts("A set follow-up process with a clear owner", "Each rep follows up on their own", "Automated emails or texts only", "No consistent process", NOT_SURE),
        },
        {
          type: "select", id: "noshow", label: "After an appointment no-show, what happens?",
          options: opts("The BDC rebooks", "The salesperson follows up", "A manager reviews no-shows", "Nothing consistent", NOT_SURE),
        },
        {
          type: "chips", id: "slipping", label: "How do you know today if leads are slipping?", exclusive: ["We don't have a way"],
          options: opts("A CRM report I check regularly", "A manager's daily lead check", "Vendor reports", "Customer complaints", "We don't have a way", "Other"),
        },
      ],
    },
    {
      id: "service",
      n: 4,
      title: "Service and Parts",
      lede: "If someone else runs these departments, hand this section to them below.",
      skippable: true,
      fields: [
        { type: "text", id: "svc_who", label: "Who runs Service and who runs Parts? (role is enough)", optional: true },
        {
          type: "chips", id: "booking", label: "How do customers book service?",
          options: opts("Online scheduler", "Phone", "Walk-in", "Text", "Manufacturer app or site", "Other"),
        },
        {
          type: "select", id: "onlineconf", label: "When a customer books online, what happens?",
          options: opts("An advisor sees it automatically and confirms", "Someone checks a queue", "We call to confirm", "No set process", "We don't take online bookings", NOT_SURE),
        },
        {
          type: "select", id: "updates", label: "While a car is in the shop, how does the customer get updates?",
          options: opts("Automated status texts", "The advisor texts or calls", "The customer has to ask", "It depends on the advisor", NOT_SURE),
        },
        {
          type: "select", id: "recalls", label: "Who finds and contacts customers with open recalls?",
          options: opts("Advisors at write-up", "A campaign run by marketing or the BDC", "Only the manufacturer's notices", "No one specific", NOT_SURE),
        },
        {
          type: "select", id: "special", label: "How are Parts special orders tied back to the repair order?",
          options: opts("The system tracks it automatically", "The parts manager tracks it by hand", "The advisors track it", "Not consistently", NOT_SURE),
        },
        {
          type: "select", id: "cores", label: "How are core charges followed up?",
          options: opts("Someone reviews them on a schedule", "Only when someone remembers", NOT_SURE),
        },
        {
          type: "select", id: "firstservice", label: "After a customer buys a car, how does their first service visit get booked?",
          options: opts("It's booked at delivery", "A reminder from the BDC or marketing", "The customer is expected to call", "No set process", NOT_SURE),
        },
        {
          type: "select", id: "tosales", label: "Does Service ever pass a customer to Sales? (lease ending, high equity, aging vehicle)",
          options: opts("A formal process with alerts", "Advisors mention it informally", "Rarely", "Never", NOT_SURE),
        },
        {
          type: "select", id: "warranty", label: "Who tracks warranty claims?",
          options: opts("A dedicated warranty administrator", "The office or accounting", "The service advisors", NOT_SURE),
        },
        {
          type: "select", id: "rejected", label: "How would you notice a rejected or unpaid warranty claim?",
          options: opts("A review on a set schedule", "Only when someone happens to notice", "We don't have a way", NOT_SURE),
        },
      ],
    },
    {
      id: "billing",
      n: 5,
      title: "Billing and Accounting",
      lede: "If someone else runs deal posting and the books, hand this section to them below.",
      skippable: true,
      fields: [
        { type: "text", id: "bill_who", label: "Who handles billing / deal posting, and who handles accounting? (role is enough)", optional: true },
        {
          type: "select", id: "tracking", label: "How do you track deals waiting on funding, a payoff, paperwork or the DMV?",
          options: opts("A system report", "A spreadsheet", "A whiteboard or paper", "Mostly in people's heads", NOT_SURE),
        },
        {
          type: "select", id: "fundtime", label: "Roughly how long from delivery to funded?",
          options: opts("Under 3 days", "3–7 days", "1–2 weeks", "Over 2 weeks", "It varies a lot", NOT_SURE),
        },
        {
          type: "chips", id: "stuck_deals", label: "Where do deals most often get stuck?", exclusive: [NOT_SURE],
          options: opts("Missing paperwork", "Lender stipulations", "Payoffs", "DMV / registration", "Manufacturer incentive reporting",
            "Contracts in transit too long", "Customer signature issues", "Other", NOT_SURE),
        },
        {
          type: "select", id: "weowes", label: "How are \"we owe\" promises to customers tracked?",
          options: opts("In the system, with due dates", "On the deal jacket", "Whoever made the promise remembers", "Not tracked", NOT_SURE),
        },
        {
          type: "chips", id: "monthend", label: "What does month-end look like?", exclusive: ["Nothing major"],
          options: opts("Rushing deliveries to count", "Cleaning up paperwork", "Chasing missing funding", "Reconciling accounting", "Manager overrides", "Nothing major", "Other"),
        },
      ],
    },
    {
      id: "data",
      n: 6,
      title: "Reports and data access",
      lede: "No data is being requested now. These answers just tell us what's possible and who would need to be involved.",
      fields: [
        {
          type: "chips", id: "exporters", label: "Which roles are allowed to run reports and exports from the DMS and CRM?", exclusive: [NOT_SURE],
          options: opts("General manager", "Sales manager", "BDC manager", "Controller / office manager", "IT or vendor rep", "Only the vendor can", NOT_SURE),
        },
        {
          type: "select", id: "savefile", label: "Can they save a report to a file (CSV or Excel) on their own?",
          options: opts("Yes, easily", "Yes, with some trouble", "No, it needs the vendor", NOT_SURE),
        },
        {
          type: "chips", id: "scheduled", label: "Which reports does the store already receive on a schedule?", exclusive: ["None", NOT_SURE],
          options: opts("Daily sales log", "Lead activity report", "Service / repair order reports", "Monthly financial statement", "Manufacturer reports", "Other", "None", NOT_SURE),
        },
        {
          type: "chips", id: "approvers", label: "Who would need to approve sharing store data outside the store?", exclusive: ["Nobody", NOT_SURE],
          options: opts("Dealer principal", "General manager", "Group or corporate office", "The manufacturer", "A vendor contract", "Our IT company", "Nobody", NOT_SURE),
        },
        {
          type: "select", id: "it", label: "IT support",
          options: opts("An in-house person", "An outside IT company", "Group IT", "None", NOT_SURE),
        },
      ],
    },
    {
      id: "stuck",
      n: 7,
      title: "Where work gets stuck",
      lede: "Your gut answers matter most here. Short and honest beats polished. No customer names.",
      fields: [
        {
          type: "chips", id: "slip", label: "Where do you suspect things slip through the cracks, even where it's supposed to be handled?", exclusive: [NOT_SURE],
          options: opts("Lead response", "Appointments and no-shows", "Sold but not delivered", "Funding and billing", "Service updates to customers",
            "Recalls", "Parts orders", "Reviews and reputation", "Month-end", "Something else", NOT_SURE),
        },
        { type: "long", id: "recent", label: "What happened recently that made you ask, \"how did we miss that?\"", optional: true },
        { type: "long", id: "tried", label: "What has the store already tried to fix it, and what happened?", optional: true },
        { type: "long", id: "busiest", label: "When the store is busiest (month-end, big sales weekends), what breaks first?", optional: true },
        { type: "long", id: "wish", label: "If one thing improved over the next 90 days, what would make the biggest difference to your week?", optional: true },
        { type: "long", id: "offlimits", label: "Anything off limits, or a sensitive area we should stay clear of?", optional: true },
      ],
    },
    {
      id: "sitdown",
      n: 8,
      title: "For the sit-down",
      lede: "Last one.",
      fields: [
        {
          type: "chips", id: "room", label: "Who should be in the room?",
          options: opts("Dealer principal", "General manager", "General sales manager", "Service director", "Parts manager", "Controller", "BDC manager", "Other"),
        },
        {
          type: "chips", id: "signer", label: "Who can sign an NDA and a data-handling agreement for the store?", exclusive: [NOT_SURE],
          options: opts("Dealer principal / owner", "General manager", "Group or corporate office", NOT_SURE),
        },
        { type: "text", id: "contactperson", label: "Who would be a good day-to-day contact for a few hours of interviews?", optional: true },
        { type: "chips", id: "days", label: "Best days to meet", options: opts("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun") },
        {
          type: "select", id: "tod", label: "Best time of day",
          options: opts("Early morning", "Mid-morning", "Midday", "Afternoon", "After close"),
        },
        { type: "text", id: "place", label: "Where should we meet?", optional: true },
        {
          type: "chips", id: "upcoming", label: "Anything coming up in the next 90 days that affects timing?", exclusive: ["Nothing major", NOT_SURE],
          options: opts("New facility or renovation", "Staffing changes", "A vendor switch or renewal", "A manufacturer audit or program change", "Nothing major", "Other", NOT_SURE),
        },
        { type: "long", id: "bring", label: "Anything you'd like us to bring or know beforehand?", optional: true },
      ],
    },
  ];

  // ---------- state, autosave ----------

  var STORAGE_KEY = "df-prediag-v1:" + (clientKey || "default");

  var state = { step: 0, v: {}, other: {}, touched: {}, skip: {} };
  var prefilled = {};
  if (client && client.prefill) {
    Object.keys(client.prefill).forEach(function (id) {
      state.v[id] = { v: client.prefill[id], d: "" };
      prefilled[id] = true;
    });
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d || typeof d !== "object") return;
      ["v", "other", "touched", "skip"].forEach(function (k) {
        if (d[k] && typeof d[k] === "object") {
          Object.keys(d[k]).forEach(function (id) { state[k][id] = d[k][id]; });
        }
      });
      if (typeof d.step === "number" && d.step >= 0 && d.step < STEPS.length) state.step = d.step;
    } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }, 150);
  }
  function clearDraft() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  loadDraft();
  // A store name from the link wins over an empty draft value, but never over something the person typed.
  if (storeFromLink && !state.v.store) state.v.store = storeFromLink;

  // ---------- tiny DOM helper ----------

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") n.textContent = attrs[k];
        else if (k === "class") n.className = attrs[k];
        else if (attrs[k] === true) n.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var uid = 0;
  function nextId(prefix) { uid += 1; return prefix + "-" + uid; }

  function touch(id) { state.touched[id] = true; save(); }

  // ---------- field renderers ----------

  function labelNode(f, forId, tag) {
    var lab = el(tag || "label", { class: "booking-label", for: tag ? null : forId });
    lab.appendChild(document.createTextNode(f.label));
    if (f.optional) {
      var o = el("span", { class: "booking-optional", text: " (optional)" });
      lab.appendChild(o);
    }
    return lab;
  }

  function selectControl(f, current, onChange, idHint) {
    var id = idHint || nextId("pd-" + f.id);
    var sel = el("select", { class: "booking-input", id: id, required: Boolean(f.required) });
    sel.appendChild(el("option", { value: "", text: "Choose…" }));
    f.options.forEach(function (o) {
      var opt = el("option", { value: o, text: o });
      if (o === current) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () { onChange(sel.value); });
    return sel;
  }

  function otherInput(id, shown) {
    var inp = el("input", { class: "booking-input pd-other", type: "text", placeholder: "Type it here", "aria-label": "Other, please specify", maxlength: "200" });
    inp.value = state.other[id] || "";
    inp.hidden = !shown;
    inp.addEventListener("input", function () { state.other[id] = inp.value; touch(id); });
    return inp;
  }

  function selectField(f) {
    var wrap = el("div", { class: "pd-field" });
    var selId = nextId("pd-" + f.id);
    wrap.appendChild(labelNode(f, selId));
    var other = f.other ? otherInput(f.id, state.v[f.id] === OTHER) : null;
    var sel = selectControl(f, state.v[f.id] || "", function (val) {
      state.v[f.id] = val;
      if (other) { other.hidden = val !== OTHER; if (val === OTHER) other.focus(); }
      touch(f.id);
    }, selId);
    wrap.appendChild(sel);
    if (other) wrap.appendChild(other);
    return wrap;
  }

  function vendorField(f) {
    var cur = state.v[f.id] || { v: "", d: "" };
    state.v[f.id] = cur;
    var wrap = el("div", { class: "pd-field" });
    var vId = nextId("pd-" + f.id);
    wrap.appendChild(labelNode({ label: f.label }, vId));
    var other = otherInput(f.id, cur.v === OTHER);
    var row = el("div", { class: "pd-vendor" });

    var left = el("div");
    left.appendChild(el("p", { class: "pd-vendor-sub", text: "Product" }));
    left.appendChild(selectControl({ id: f.id, options: f.options }, cur.v, function (val) {
      cur.v = val;
      other.hidden = val !== OTHER;
      if (val === OTHER) other.focus();
      touch(f.id);
    }, vId));
    left.appendChild(other);

    var right = el("div");
    right.appendChild(el("p", { class: "pd-vendor-sub", text: "How is it working?" }));
    right.appendChild(selectControl({ id: f.id + "_d", options: f.verdict }, cur.d, function (val) {
      cur.d = val;
      touch(f.id);
    }));

    row.appendChild(left);
    row.appendChild(right);
    wrap.appendChild(row);
    if (prefilled[f.id] && !state.touched[f.id]) {
      wrap.appendChild(el("span", { class: "pd-seen", text: "Pre-selected from what's visible on your public website. Please correct it if it's wrong." }));
    }
    return wrap;
  }

  function textField(f) {
    var wrap = el("div", { class: "pd-field" });
    var id = nextId("pd-" + f.id);
    wrap.appendChild(labelNode(f, id));
    var inp = el("input", {
      class: "booking-input", type: "text", id: id, maxlength: "300",
      required: Boolean(f.required), placeholder: f.placeholder || null,
      autocomplete: f.id === "respondentName" ? "name" : "off",
    });
    inp.value = state.v[f.id] || "";
    inp.addEventListener("input", function () { state.v[f.id] = inp.value; touch(f.id); });
    wrap.appendChild(inp);
    return wrap;
  }

  function longField(f) {
    var wrap = el("div", { class: "pd-field" });
    var id = nextId("pd-" + f.id);
    wrap.appendChild(labelNode(f, id));
    var ta = el("textarea", { class: "booking-input", id: id, rows: "3", maxlength: "2000" });
    ta.value = state.v[f.id] || "";
    ta.addEventListener("input", function () { state.v[f.id] = ta.value; touch(f.id); });
    wrap.appendChild(ta);
    return wrap;
  }

  function chipsField(f) {
    var wrap = el("fieldset", { class: "pd-field" });
    wrap.appendChild(labelNode(f, null, "legend"));
    var list = Array.isArray(state.v[f.id]) ? state.v[f.id] : [];
    state.v[f.id] = list;
    var exclusive = f.exclusive || [];
    var chips = el("div", { class: "pd-chips" });
    var inputs = [];
    var hasOther = f.options.indexOf("Other") !== -1;
    var other = hasOther ? otherInput(f.id, list.indexOf("Other") !== -1) : null;

    function sync() {
      var count = list.length;
      inputs.forEach(function (inp) {
        inp.checked = list.indexOf(inp.value) !== -1;
        inp.disabled = Boolean(f.max) && count >= f.max && !inp.checked;
      });
      if (other) other.hidden = list.indexOf("Other") === -1;
    }

    f.options.forEach(function (o) {
      var inp = el("input", { type: "checkbox", value: o });
      inp.addEventListener("change", function () {
        var i = list.indexOf(o);
        if (inp.checked && i === -1) {
          if (exclusive.indexOf(o) !== -1) list.length = 0;
          else exclusive.forEach(function (x) { var j = list.indexOf(x); if (j !== -1) list.splice(j, 1); });
          list.push(o);
        } else if (!inp.checked && i !== -1) {
          list.splice(i, 1);
        }
        sync();
        if (o === "Other" && inp.checked && other) other.focus();
        touch(f.id);
      });
      inputs.push(inp);
      chips.appendChild(el("label", { class: "pd-chip" }, [inp, el("span", { text: o })]));
    });
    wrap.appendChild(chips);
    if (f.hint) wrap.appendChild(el("p", { class: "pd-chip-hint", text: f.hint }));
    if (other) wrap.appendChild(other);
    sync();
    return wrap;
  }

  function groupField(f) {
    var wrap = el("div", { class: "pd-group" });
    wrap.appendChild(el("p", { class: "pd-group-title", text: f.title }));
    if (f.note) wrap.appendChild(el("p", { class: "pd-group-note", text: f.note }));
    f.fields.forEach(function (sub) { wrap.appendChild(renderField(sub)); });
    return wrap;
  }

  function renderField(f) {
    switch (f.type) {
      case "select": return selectField(f);
      case "vendor": return vendorField(f);
      case "chips": return chipsField(f);
      case "long": return longField(f);
      case "group": return groupField(f);
      default: return textField(f);
    }
  }

  // ---------- answers ----------

  function plainValue(f) {
    var val = state.v[f.id];
    switch (f.type) {
      case "chips": {
        if (!val || !val.length) return "";
        return val.map(function (x) {
          if (x === "Other") return state.other[f.id] ? "Other: " + state.other[f.id].trim() : "Other";
          return x;
        });
      }
      case "select": {
        if (!val) return "";
        if (val === OTHER) return state.other[f.id] && state.other[f.id].trim() ? "Other: " + state.other[f.id].trim() : "Other";
        return val;
      }
      case "vendor": {
        if (!val || (!val.v && !val.d)) return "";
        var name = val.v === OTHER ? (state.other[f.id] && state.other[f.id].trim() ? "Other: " + state.other[f.id].trim() : "Other") : val.v;
        var out = (name || "(product not given)") + (val.d ? " — " + val.d : "");
        if (prefilled[f.id] && !state.touched[f.id]) out += " [pre-selected from public website, not confirmed by respondent]";
        return out;
      }
      default:
        return typeof val === "string" ? val.trim() : "";
    }
  }

  // Flat list of answerable fields. A field inside a group carries the group's
  // question in its emailLabel, so "Weekday evenings" still reads correctly in
  // the email.
  function flattenFields(fields, groupTitle) {
    var out = [];
    fields.forEach(function (f) {
      if (f.type === "group") {
        out = out.concat(flattenFields(f.fields, f.title));
      } else if (groupTitle) {
        var copy = {};
        Object.keys(f).forEach(function (k) { copy[k] = f[k]; });
        copy.emailLabel = groupTitle + " — " + f.label;
        out.push(copy);
      } else {
        out.push(f);
      }
    });
    return out;
  }

  function sectionLabel(step) { return step.n + ". " + step.title; }

  function buildPayload() {
    var answers = [];
    var skipped = [];
    STEPS.forEach(function (step) {
      if (!step.n) return; // "About you" travels as top-level fields
      var s = state.skip[step.id];
      if (step.skippable && s && s.on) {
        skipped.push({ section: sectionLabel(step), who: s.who || "" });
        return;
      }
      flattenFields(step.fields).forEach(function (f) {
        var v = plainValue(f);
        if (v && v.length) answers.push({ section: sectionLabel(step), label: f.emailLabel || f.label, value: v });
      });
    });
    return { answers: answers, skipped: skipped };
  }

  function metaValue(id) {
    var f = flattenFields(STEPS[0].fields).filter(function (x) { return x.id === id; })[0];
    return plainValue(f);
  }

  // ---------- step rendering ----------

  var form = el("form", { novalidate: false });
  var statusEl = el("p", { class: "pd-status", role: "status", "aria-live": "polite" });
  root.appendChild(form);

  // spam trap: invisible to people, named so browser autofill ignores it.
  var trapWrap = el("div", { class: "booking-hp", "aria-hidden": "true" }, [
    el("label", { for: "pd-hpx", text: "Leave this field empty" }),
    el("input", { type: "text", id: "pd-hpx", name: "hp_x9", tabindex: "-1", autocomplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }),
  ]);

  function setStatus(msg, isErr) {
    statusEl.textContent = msg || "";
    statusEl.className = "pd-status" + (isErr ? " err" : "");
  }

  function countAnswered() { return buildPayload().answers.length; }

  function skipCard(step) {
    var s = state.skip[step.id] || (state.skip[step.id] = { on: false, who: "" });
    var card = el("div", { class: "pd-skip" });
    var chk = el("input", { type: "checkbox", id: "pd-skip-" + step.id });
    chk.checked = Boolean(s.on);
    var lab = el("label", { class: "pd-check", for: "pd-skip-" + step.id }, [
      chk, el("span", { text: "Someone else should answer this section" }),
    ]);
    card.appendChild(lab);
    var whoWrap = el("div", { class: "pd-field" });
    whoWrap.appendChild(el("label", { class: "booking-label", for: "pd-skipwho-" + step.id, text: "Who should we ask? Name or role is fine." }));
    var who = el("input", { class: "booking-input", type: "text", id: "pd-skipwho-" + step.id, maxlength: "200" });
    who.value = s.who || "";
    who.addEventListener("input", function () { s.who = who.value; save(); });
    whoWrap.appendChild(who);
    whoWrap.hidden = !s.on;
    card.appendChild(whoWrap);
    chk.addEventListener("change", function () {
      s.on = chk.checked;
      save();
      render(false);
    });
    return card;
  }

  function render(scroll) {
    var i = state.step;
    var step = STEPS[i];
    var last = i === STEPS.length - 1;
    uid = 0;
    form.innerHTML = "";
    form.appendChild(trapWrap);

    var pct = Math.round((i / (STEPS.length - 1)) * 100);
    var prog = el("div", { class: "pd-progress" });
    var top = el("div", { class: "pd-progress-top" }, [
      el("span", { text: "Step " + (i + 1) + " of " + STEPS.length }),
      el("b", { text: step.title }),
    ]);
    var bar = el("div", { class: "pd-bar", role: "progressbar", "aria-valuemin": "1", "aria-valuemax": String(STEPS.length), "aria-valuenow": String(i + 1), "aria-label": "Questionnaire progress" }, [
      el("i", { style: "width:" + Math.max(pct, 6) + "%" }),
    ]);
    prog.appendChild(top);
    prog.appendChild(bar);
    form.appendChild(prog);

    form.appendChild(el("h2", { class: "pd-title", text: step.title }));
    if (step.lede) form.appendChild(el("p", { class: "pd-lede", text: step.lede }));

    var skipped = step.skippable && state.skip[step.id] && state.skip[step.id].on;
    if (step.skippable) form.appendChild(skipCard(step));
    if (skipped) {
      form.appendChild(el("p", { class: "pd-skipped-msg", text: "Got it. We'll leave this section for them." }));
    } else {
      step.fields.forEach(function (f) { form.appendChild(renderField(f)); });
    }

    if (last) {
      var n = countAnswered();
      form.appendChild(el("p", { class: "pd-count", text: n + (n === 1 ? " question answered" : " questions answered") + ". Anything you skipped is fine." }));
    }

    form.appendChild(statusEl);

    var nav = el("div", { class: "pd-nav" });
    if (i > 0) {
      var back = el("button", { type: "button", class: "btn back", text: "← Back" });
      back.addEventListener("click", function () { go(i - 1); });
      nav.appendChild(back);
    }
    nav.appendChild(el("span", { class: "spacer" }));
    if (last) {
      nav.appendChild(el("button", { type: "submit", class: "btn", id: "pd-send", text: "Send my answers" }));
    } else {
      var next = el("button", { type: "button", class: "btn", text: "Next →" });
      next.addEventListener("click", function () {
        if (i === 0 && !form.reportValidity()) return;
        go(i + 1);
      });
      nav.appendChild(next);
    }
    form.appendChild(nav);
    setStatus("");

    if (scroll) {
      var top0 = root.getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: Math.max(top0, 0), behavior: "auto" });
    }
  }

  function go(n) {
    state.step = Math.max(0, Math.min(STEPS.length - 1, n));
    save();
    render(true);
  }

  // ---------- submit ----------

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = document.getElementById("pd-send");

    var store = metaValue("store");
    var name = metaValue("respondentName");
    var role = metaValue("role");
    if (!store || !name || !role) {
      state.step = 0;
      save();
      render(true);
      setStatus("Please fill in your store, name and role first.", true);
      form.reportValidity();
      return;
    }

    var parts = buildPayload();
    var payload = {
      hp_x9: (document.getElementById("pd-hpx") || {}).value || "",
      store: store,
      respondentName: name,
      role: role,
      contact: metaValue("contact"),
      answers: parts.answers,
      skipped: parts.skipped,
    };

    btn.disabled = true;
    setStatus("Sending…");

    fetch("/api/pre-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(
          function (data) {
            if (!r.ok) throw new Error(data.error || "Something went wrong.");
            return data;
          },
          function () { throw new Error("Something went wrong."); }
        );
      })
      .then(function () {
        clearDraft();
        root.innerHTML = "";
        var done = el("div", { class: "pd-done" }, [
          el("h3", { text: "Sent. Thank you." }),
          el("p", { text: "That's exactly what we needed. We'll review it before we sit down, so the time together goes to your store and not to basics." }),
        ]);
        root.appendChild(done);
        window.scrollTo({ top: Math.max(root.getBoundingClientRect().top + window.pageYOffset - 120, 0), behavior: "auto" });
      })
      .catch(function (err) {
        // The answers are still saved in this browser, so retrying loses nothing.
        setStatus((err && err.message ? err.message : "Your answers didn't send.") + " Your answers are still saved here.", true);
        btn.disabled = false;
      });
  });

  render(false);
})();
