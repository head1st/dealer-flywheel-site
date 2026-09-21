// Pure slot-generation logic: business hours + busy periods -> bookable slots.
// No network calls here, so this is fully unit-testable without real Google credentials.
const { DateTime, Interval } = require("luxon");

/**
 * @param {Object} opts
 * @param {string} opts.date          "YYYY-MM-DD"
 * @param {string} opts.timezone      IANA zone, e.g. "America/New_York"
 * @param {number} opts.startHour     business open hour, 24h (e.g. 9)
 * @param {number} opts.endHour       business close hour, 24h (e.g. 17)
 * @param {number} opts.slotMinutes   slot length in minutes (e.g. 20)
 * @param {Array<{start:string,end:string}>} opts.busy  ISO 8601 busy periods (any zone)
 * @param {DateTime} [opts.now]       injectable "now" for testing
 * @param {number} [opts.leadMinutes] minimum notice required for a same-day slot (default 60)
 * @returns {string[]} slot start times as "HH:mm" in the business timezone
 */
function getAvailableSlots({
  date,
  timezone,
  startHour,
  endHour,
  slotMinutes,
  busy = [],
  now,
  leadMinutes = 60,
}) {
  const zoneNow = now || DateTime.now().setZone(timezone);
  const dayStart = DateTime.fromISO(date, { zone: timezone }).set({
    hour: startHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const dayEnd = dayStart.set({ hour: endHour });

  if (!dayStart.isValid) return [];

  // Weekends: closed (Method is Nassau/Suffolk, in-person first — no weekend calls).
  if (dayStart.weekday === 6 || dayStart.weekday === 7) return [];

  const busyIntervals = busy
    .map((b) => {
      const s = DateTime.fromISO(b.start).setZone(timezone);
      const e = DateTime.fromISO(b.end).setZone(timezone);
      return s.isValid && e.isValid ? Interval.fromDateTimes(s, e) : null;
    })
    .filter(Boolean);

  const earliestBookable = zoneNow.plus({ minutes: leadMinutes });

  const slots = [];
  let cursor = dayStart;
  while (cursor.plus({ minutes: slotMinutes }) <= dayEnd) {
    const slotInterval = Interval.fromDateTimes(
      cursor,
      cursor.plus({ minutes: slotMinutes })
    );
    const inPast = cursor < earliestBookable;
    const overlapsBusy = busyIntervals.some((bi) => bi.overlaps(slotInterval));
    if (!inPast && !overlapsBusy) {
      slots.push(cursor.toFormat("HH:mm"));
    }
    cursor = cursor.plus({ minutes: slotMinutes });
  }
  return slots;
}

module.exports = { getAvailableSlots };
