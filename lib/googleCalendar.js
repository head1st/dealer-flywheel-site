// Thin wrapper around the Google Calendar API using a service-account.
// All config comes from env vars — see README.md "Booking setup" for how to get them.
const { google } = require("googleapis");

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID
  );
}

function getAuthClient() {
  // Railway env vars can't hold real newlines cleanly, so the private key is
  // stored with literal "\n" sequences and unescaped here.
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function getCalendarClient() {
  return google.calendar({ version: "v3", auth: getAuthClient() });
}

/**
 * @param {string} timeMinISO
 * @param {string} timeMaxISO
 * @returns {Promise<Array<{start:string,end:string}>>}
 */
async function getBusyPeriods(timeMinISO, timeMaxISO) {
  const calendar = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      items: [{ id: calendarId }],
    },
  });
  const busy = res.data.calendars?.[calendarId]?.busy || [];
  return busy.map((b) => ({ start: b.start, end: b.end }));
}

/**
 * Creates a calendar event and invites the customer, so Google sends the
 * confirmation email itself — no separate email service needed.
 */
async function createBooking({ startISO, endISO, name, email, phone, notes }) {
  const calendar = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const descriptionLines = [
    `Booked via dealerflywheel.com`,
    phone ? `Phone: ${phone}` : null,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean);

  const res = await calendar.events.insert({
    calendarId,
    sendUpdates: "all",
    requestBody: {
      summary: `Dealer Flywheel call — ${name}`,
      description: descriptionLines.join("\n"),
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      attendees: [{ email, displayName: name }],
    },
  });
  return res.data;
}

module.exports = { isConfigured, getBusyPeriods, createBooking };
