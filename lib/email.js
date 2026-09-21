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

module.exports = { isConfigured, sendConfirmation };
