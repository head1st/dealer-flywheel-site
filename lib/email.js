// Sends the booking confirmation ourselves via Gmail SMTP, since a plain
// service account can't invite calendar attendees on a free Gmail account
// (that needs paid Google Workspace + domain-wide delegation). Uses a Gmail
// "app password", not the account's real password.
const nodemailer = require("nodemailer");

function isConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
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

  const transport = getTransport();
  const from = `Dealer Flywheel <${process.env.GMAIL_USER}>`;

  await transport.sendMail({
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
  await transport.sendMail({
    from,
    to: process.env.GMAIL_USER,
    subject: `New booking: ${name} — ${dateLabel} at ${timeLabel}`,
    text: `${name} (${to}) booked ${dateLabel} at ${timeLabel}.`,
  });
}

module.exports = { isConfigured, sendConfirmation };
