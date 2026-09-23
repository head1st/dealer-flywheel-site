// Static site + booking API for Dealer Flywheel.
// Railway sets PORT; we bind to it and 0.0.0.0.
const path = require("path");
const express = require("express");
const { DateTime } = require("luxon");
const { getAvailableSlots } = require("./lib/slots");
const googleCalendar = require("./lib/googleCalendar");
const emailer = require("./lib/email");

const app = express();
const DIST = path.join(__dirname, "_site");

const CONFIG = {
  timezone: process.env.BUSINESS_TIMEZONE || "America/New_York",
  startHour: parseInt(process.env.BUSINESS_START_HOUR || "9", 10),
  endHour: parseInt(process.env.BUSINESS_END_HOUR || "17", 10),
  slotMinutes: parseInt(process.env.SLOT_MINUTES || "20", 10),
  leadMinutes: parseInt(process.env.BOOKING_LEAD_MINUTES || "60", 10),
  windowDays: parseInt(process.env.BOOKING_WINDOW_DAYS || "14", 10),
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(express.json());
app.use(
  express.static(DIST, {
    extensions: ["html"],
  })
);

function isDateInBookingWindow(date) {
  const day = DateTime.fromISO(date, { zone: CONFIG.timezone }).startOf("day");
  if (!day.isValid) return false;
  const today = DateTime.now().setZone(CONFIG.timezone).startOf("day");
  const latest = today.plus({ days: CONFIG.windowDays });
  return day >= today && day <= latest;
}

async function fetchBusyForDate(date) {
  const dayStart = DateTime.fromISO(date, { zone: CONFIG.timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });
  return googleCalendar.getBusyPeriods(dayStart.toISO(), dayEnd.toISO());
}

app.get("/api/availability", async (req, res) => {
  const { date } = req.query;
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "Pass a date as YYYY-MM-DD." });
  }
  if (!isDateInBookingWindow(date)) {
    return res.json({ slots: [] });
  }
  if (!googleCalendar.isConfigured()) {
    return res.status(503).json({
      error:
        "Online booking isn't set up yet — email hello@dealerflywheel.com to schedule a call.",
    });
  }
  try {
    const busy = await fetchBusyForDate(date);
    const slots = getAvailableSlots({
      date,
      timezone: CONFIG.timezone,
      startHour: CONFIG.startHour,
      endHour: CONFIG.endHour,
      slotMinutes: CONFIG.slotMinutes,
      leadMinutes: CONFIG.leadMinutes,
      busy,
    });
    res.json({ slots });
  } catch (err) {
    console.error("availability lookup failed:", err);
    res.status(502).json({ error: "Couldn't reach the calendar. Try again shortly." });
  }
});

app.post("/api/book", async (req, res) => {
  const { date, time, name, email, phone, notes, company } = req.body || {};

  // Honeypot: a real visitor never fills the hidden "company" field.
  if (company) {
    return res.json({ success: true });
  }

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "Missing or invalid date." });
  }
  if (typeof time !== "string" || !TIME_RE.test(time)) {
    return res.status(400).json({ error: "Missing or invalid time." });
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (!isDateInBookingWindow(date)) {
    return res.status(400).json({ error: "That date isn't bookable." });
  }
  if (!googleCalendar.isConfigured()) {
    return res.status(503).json({
      error:
        "Online booking isn't set up yet — email hello@dealerflywheel.com to schedule a call.",
    });
  }

  try {
    // Re-check availability right before booking to close the race window
    // between two people looking at the same open slot.
    const busy = await fetchBusyForDate(date);
    const stillOpen = getAvailableSlots({
      date,
      timezone: CONFIG.timezone,
      startHour: CONFIG.startHour,
      endHour: CONFIG.endHour,
      slotMinutes: CONFIG.slotMinutes,
      leadMinutes: CONFIG.leadMinutes,
      busy,
    }).includes(time);

    if (!stillOpen) {
      return res
        .status(409)
        .json({ error: "That time was just booked. Please pick another slot." });
    }

    const start = DateTime.fromISO(`${date}T${time}`, { zone: CONFIG.timezone });
    const end = start.plus({ minutes: CONFIG.slotMinutes });

    await googleCalendar.createBooking({
      startISO: start.toISO(),
      endISO: end.toISO(),
      name: name.trim(),
      email: email.trim(),
      phone: typeof phone === "string" ? phone.trim() : "",
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    // Respond as soon as the calendar booking itself succeeds — don't make
    // the visitor's browser wait on an email send. Fire it in the
    // background instead; a slow or failed email should never look like a
    // failed booking.
    res.json({ success: true });

    emailer
      .sendConfirmation({
        to: email.trim(),
        name: name.trim(),
        dateLabel: start.toFormat("cccc, LLLL d"),
        timeLabel: start.toFormat("h:mm a"),
      })
      .catch((emailErr) => {
        console.error("confirmation email failed:", emailErr);
      });
  } catch (err) {
    console.error("booking failed:", err);
    res.status(502).json({ error: "Couldn't reach the calendar. Try again shortly." });
  }
});

const PRIORITY_VALUES = new Set(["Must have", "Nice to have", "Skip it"]);
const MAX_TEXT = 4000; // generous ceiling per field — guards against a pasted essay/attack, not normal answers

function cleanText(v, max = MAX_TEXT) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

app.post("/api/discovery", async (req, res) => {
  const body = req.body || {};

  // Honeypot: a real visitor never fills the hidden "company" field.
  if (cleanText(body.company)) {
    return res.json({ success: true });
  }

  const business = cleanText(body.business, 200);
  const respondentName = cleanText(body.respondentName, 200);
  const role = cleanText(body.role, 200);
  const email = cleanText(body.email, 254);

  if (!business) return res.status(400).json({ error: "Business name is required." });
  if (!respondentName) return res.status(400).json({ error: "Your name is required." });
  if (!role) return res.status(400).json({ error: "Your role is required." });
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "That email doesn't look right." });
  }

  const priorities = {};
  if (body.priorities && typeof body.priorities === "object") {
    for (const [label, val] of Object.entries(body.priorities)) {
      if (typeof label !== "string") continue;
      const cleanLabel = label.slice(0, 200);
      const cleanVal = typeof val === "string" && PRIORITY_VALUES.has(val) ? val : null;
      priorities[cleanLabel] = cleanVal;
    }
  }

  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c) => typeof c === "string").map((c) => c.slice(0, 60)).slice(0, 30)
    : [];

  const answers = {
    business,
    respondentName,
    role,
    email,
    q_matters: cleanText(body.q_matters),
    q_keep: cleanText(body.q_keep),
    q_frustrate: cleanText(body.q_frustrate),
    priorities,
    q_dealbreaker: cleanText(body.q_dealbreaker),
    q_onesentence: cleanText(body.q_onesentence),
    q_voice: cleanText(body.q_voice, 200),
    q_refs: cleanText(body.q_refs),
    q_offlimits: cleanText(body.q_offlimits),
    q_makes: cleanText(body.q_makes),
    categories,
    q_gap: cleanText(body.q_gap),
  };

  try {
    await emailer.sendDiscoverySubmission(answers);
    res.json({ success: true });
  } catch (err) {
    console.error("discovery submission email failed:", err);
    // The person's answers are real and shouldn't vanish just because email
    // delivery hiccuped — log the full payload server-side so it's recoverable.
    console.error("discovery submission payload:", JSON.stringify(answers));
    res.status(502).json({
      error: "Your answers didn't send — please try again, or email hello@dealerflywheel.com.",
    });
  }
});

// 404s: serve a plain fallback rather than Express's default HTML.
app.use((req, res) => {
  res.status(404).sendFile(path.join(DIST, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Dealer Flywheel site listening on port ${port}`);
  console.log(
    googleCalendar.isConfigured()
      ? "Booking: Google Calendar configured."
      : "Booking: Google Calendar NOT configured — /api endpoints will return 503."
  );
  console.log(
    emailer.isConfigured()
      ? "Confirmation email: Resend configured."
      : "Confirmation email: NOT configured — bookings will still succeed, just without a confirmation email."
  );
});
