// Plain-node test, no framework: `node lib/slots.test.js`
const assert = require("node:assert/strict");
const { DateTime } = require("luxon");
const { getAvailableSlots } = require("./slots");

const TZ = "America/New_York";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("empty day with no busy periods returns full range of slots", () => {
  const slots = getAvailableSlots({
    date: "2026-09-28", // a Monday
    timezone: TZ,
    startHour: 9,
    endHour: 10,
    slotMinutes: 20,
    busy: [],
    now: DateTime.fromISO("2026-09-01T00:00:00", { zone: TZ }),
  });
  assert.deepEqual(slots, ["09:00", "09:20", "09:40"]);
});

test("weekend day returns no slots", () => {
  const slots = getAvailableSlots({
    date: "2026-09-26", // a Saturday
    timezone: TZ,
    startHour: 9,
    endHour: 17,
    slotMinutes: 20,
    busy: [],
    now: DateTime.fromISO("2026-09-01T00:00:00", { zone: TZ }),
  });
  assert.deepEqual(slots, []);
});

test("busy period removes overlapping slots only", () => {
  const slots = getAvailableSlots({
    date: "2026-09-28",
    timezone: TZ,
    startHour: 9,
    endHour: 10,
    slotMinutes: 20,
    busy: [
      {
        start: DateTime.fromISO("2026-09-28T09:20:00", { zone: TZ }).toISO(),
        end: DateTime.fromISO("2026-09-28T09:40:00", { zone: TZ }).toISO(),
      },
    ],
    now: DateTime.fromISO("2026-09-01T00:00:00", { zone: TZ }),
  });
  assert.deepEqual(slots, ["09:00", "09:40"]);
});

test("same-day slots inside the lead-time window are excluded", () => {
  const slots = getAvailableSlots({
    date: "2026-09-28",
    timezone: TZ,
    startHour: 9,
    endHour: 12,
    slotMinutes: 20,
    busy: [],
    now: DateTime.fromISO("2026-09-28T09:30:00", { zone: TZ }),
    leadMinutes: 60,
  });
  // Anything before 10:30 is within the hour of lead time.
  assert.ok(!slots.includes("09:00"));
  assert.ok(!slots.includes("09:40"));
  assert.ok(!slots.includes("10:20"));
  assert.ok(slots.includes("10:40"));
});

test("invalid date returns no slots instead of throwing", () => {
  const slots = getAvailableSlots({
    date: "not-a-date",
    timezone: TZ,
    startHour: 9,
    endHour: 17,
    slotMinutes: 20,
    busy: [],
  });
  assert.deepEqual(slots, []);
});
