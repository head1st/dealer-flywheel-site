// Sends the booking confirmation via Resend's HTTPS API. Not SMTP: Railway
// (like most PaaS hosts) blocks outbound SMTP ports 25/465/587 by default,
// so nodemailer-over-SMTP can never actually connect from here. Resend's
// API runs over ordinary HTTPS, so it isn't affected by that.
const { Resend } = require("resend");

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * @param {Object} opts
 * @param {string} opts.to           customer's email
 * @param {string} opts.name         customer's name
 * @param {string} opts.dateLabel    human-readable date, e.g. "Monday, September 28"
 * @param {string} opts.timeLabel    human-readable time, e.g. "9:00 AM"
 */
async function sendConfirmation({ to, name, dateLabel, timeLabel }) {
  if (!isConfigured()) return; // silently skip — booking itself still succeeds

  const resend = getClient();
  const from = process.env.EMAIL_FROM;
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.EMAIL_FROM;

  await resend.emails.send({
    from,
    to,
    subject: `Confirmed: your call with Dealer Flywheel — ${dateLabel} at ${timeLabel}`,
    text:
      `Hi ${name},\n\n` +
      `You're booked for ${dateLabel} at ${timeLabel} (Eastern time).\n\n` +
      `Twenty minutes, no deck, no pitch — just walk us through what happens to a lead ` +
      `from the moment it arrives.\n\n` +
      `Need to reschedule? Just reply to this email.\n\n` +
      `— Dealer Flywheel`,
  });

  // Also notify the business owner, so nothing relies only on remembering to check the calendar.
  await resend.emails.send({
    from,
    to: notifyTo,
    subject: `New booking: ${name} — ${dateLabel} at ${timeLabel}`,
    text: `${name} (${to}) booked ${dateLabel} at ${timeLabel}.`,
  });
}

/**
 * Emails one Discovery Worksheet submission to the business owner. No
 * confirmation email to the respondent — this form isn't customer-facing,
 * it's an internal client-intake tool, so only NOTIFY_EMAIL gets it.
 *
 * @param {Object} a  the validated, sanitized answer object (see server.js)
 */
async function sendDiscoverySubmission(a) {
  if (!isConfigured()) return; // silently skip — the submission itself still succeeds server-side

  const resend = getClient();
  const from = process.env.EMAIL_FROM;
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.EMAIL_FROM;

  const priorityLines = Object.entries(a.priorities || {})
    .map(([label, val]) => `  ${label}: ${val || "(not answered)"}`)
    .join("\n");

  const categoryLine = (a.categories || []).length
    ? a.categories.join(", ")
    : "(none checked)";

  const text =
    `New Discovery Worksheet submission\n` +
    `Business: ${a.business}\n` +
    `Respondent: ${a.respondentName} (${a.role})${a.email ? " — " + a.email : ""}\n` +
    `\n` +
    `— Priorities & dealbreakers —\n` +
    `What matters most to their customers:\n  ${a.q_matters || "(not answered)"}\n\n` +
    `Keep from current site:\n  ${a.q_keep || "(not answered)"}\n\n` +
    `Current site frustration:\n  ${a.q_frustrate || "(not answered)"}\n\n` +
    `Feature priorities:\n${priorityLines || "  (not answered)"}\n\n` +
    `Dealbreaker:\n  ${a.q_dealbreaker || "(not answered)"}\n\n` +
    `— Brand & voice —\n` +
    `"When someone lands on our site, we want them to think —"\n  ${a.q_onesentence || "(not answered)"}\n\n` +
    `Desired voice: ${a.q_voice || "(not answered)"}\n\n` +
    `Reference sites (like/avoid):\n  ${a.q_refs || "(not answered)"}\n\n` +
    `Off-limits (logo/colors/name):\n  ${a.q_offlimits || "(not answered)"}\n\n` +
    `— What they actually sell —\n` +
    `Makes/brands, most to least common:\n  ${a.q_makes || "(not answered)"}\n\n` +
    `Categories customers ask about most:\n  ${categoryLine}\n\n` +
    `What most car sites miss:\n  ${a.q_gap || "(not answered)"}\n`;

  await resend.emails.send({
    from,
    to: notifyTo,
    subject: `${a.trapFilled ? "[Check: possible spam] " : ""}Discovery Worksheet: ${a.business} — ${a.respondentName} (${a.role})`,
    text,
    reply_to: a.email || undefined,
  });
}

/**
 * A booking that filled the hidden spam-trap field. It is NOT put on the
 * calendar, but the owner still gets every detail, so a real lead is never
 * lost to a false positive. No email goes to the submitter.
 */
async function sendSuspectBooking({ name, email, phone, notes, date, time, trap }) {
  if (!isConfigured()) return;
  const resend = getClient();
  const from = process.env.EMAIL_FROM;
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.EMAIL_FROM;
  const s = (v) => (typeof v === "string" ? v.slice(0, 2000) : "");
  await resend.emails.send({
    from,
    to: notifyTo,
    subject: `[Check: possible spam] Booking request: ${s(name) || "(no name)"} — ${s(date)} ${s(time)}`,
    text:
      `This booking request filled the hidden spam-trap field, so it was NOT added to your calendar.\n` +
      `If it's a real person, contact them and book it manually.\n\n` +
      `Name: ${s(name)}\nEmail: ${s(email)}\nPhone: ${s(phone)}\n` +
      `Requested: ${s(date)} at ${s(time)} (Eastern)\nNotes: ${s(notes)}\n\n` +
      `Trap field contained: ${s(trap).slice(0, 200)}`,
    reply_to: typeof email === "string" && email.includes("@") ? email : undefined,
  });
}

module.exports = { isConfigured, sendConfirmation, sendDiscoverySubmission, sendSuspectBooking };
