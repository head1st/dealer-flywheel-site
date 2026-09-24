// Plain-node test, no framework: `node lib/vinDecode.test.js`
// Uses a mocked fetch — the fixture below is a real vPIC response (trimmed)
// for 1HGCM82633A004352, NHTSA's own documentation example VIN.
const assert = require("node:assert/strict");
const {
  decodeVin,
  isValidVinFormat,
  hasValidCheckDigit,
  computeCheckDigit,
  VinDecodeError,
} = require("./vinDecode");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const HONDA_RESULT = {
  ErrorCode: "0",
  ErrorText: "0 - VIN decoded clean. Check Digit (9th position) is correct",
  ModelYear: "2003",
  Make: "HONDA",
  Model: "Accord",
  Trim: "EX-V6",
  Series: "",
  BodyClass: "Coupe",
  DriveType: "",
  EngineCylinders: "6",
  DisplacementL: "2.998832712",
  EngineHP: "240",
  FuelTypePrimary: "Gasoline",
  TransmissionStyle: "Automatic",
  Doors: "2",
  VehicleType: "PASSENGER CAR",
  Manufacturer: "AMERICAN HONDA MOTOR CO., INC.",
  PlantCountry: "UNITED STATES (USA)",
};

function mockFetch(body, { ok = true, status = 200 } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test("format validation accepts a real VIN and rejects bad ones", () => {
  assert.equal(isValidVinFormat("1HGCM82633A004352"), true);
  assert.equal(isValidVinFormat(" 1hgcm82633a004352 "), true); // normalized
  assert.equal(isValidVinFormat("1HGCM82633A00435"), false); // 16 chars
  assert.equal(isValidVinFormat("1HGCM82633A0043521"), false); // 18 chars
  assert.equal(isValidVinFormat("1HGCM8263OA004352"), false); // contains O
  assert.equal(isValidVinFormat(null), false);
});

test("check digit matches NHTSA's example VIN and catches a typo", () => {
  assert.equal(computeCheckDigit("1HGCM82633A004352"), "3");
  assert.equal(hasValidCheckDigit("1HGCM82633A004352"), true);
  assert.equal(hasValidCheckDigit("1HGCM82643A004352"), false);
  assert.equal(hasValidCheckDigit("11111111111111111"), true); // classic valid all-ones VIN
});

test("decodes and maps a clean vPIC response", async () => {
  const fetchImpl = mockFetch({ Count: 1, Results: [HONDA_RESULT] });
  const out = await decodeVin("1hgcm82633a004352", { fetchImpl });
  assert.equal(out.vin, "1HGCM82633A004352");
  assert.deepEqual(out.warnings, []);
  assert.deepEqual(out.vehicle, {
    year: 2003,
    make: "HONDA",
    model: "Accord",
    trim: "EX-V6",
    series: null,
    bodyClass: "Coupe",
    vehicleType: "PASSENGER CAR",
    doors: 2,
    driveType: null,
    engine: { cylinders: 6, displacementL: 3, horsepower: 240, fuelType: "Gasoline" },
    transmission: "Automatic",
    manufacturer: "AMERICAN HONDA MOTOR CO., INC.",
    plantCountry: "UNITED STATES (USA)",
  });
  assert.equal(fetchImpl.calls.length, 1);
  assert.match(fetchImpl.calls[0].url, /DecodeVinValuesExtended\/1HGCM82633A004352\?format=json$/);
});

test("rejects a malformed VIN without calling NHTSA", async () => {
  const fetchImpl = mockFetch({});
  await assert.rejects(decodeVin("NOTAVIN", { fetchImpl }), (err) => {
    assert.ok(err instanceof VinDecodeError);
    assert.equal(err.status, 400);
    return true;
  });
  assert.equal(fetchImpl.calls.length, 0);
});

test("surfaces vPIC warnings on a partial decode", async () => {
  const result = {
    ...HONDA_RESULT,
    ErrorCode: "1",
    ErrorText: "1 - Check Digit (9th position) does not calculate properly",
  };
  const out = await decodeVin("1HGCM82643A004352", {
    fetchImpl: mockFetch({ Results: [result] }),
  });
  assert.equal(out.vehicle.make, "HONDA");
  assert.deepEqual(out.warnings, [result.ErrorText]);
});

test("422 when vPIC can't decode anything", async () => {
  const result = { ErrorCode: "11", ErrorText: "11 - Incorrect Model Year", Make: "", Model: "", ModelYear: "" };
  await assert.rejects(
    decodeVin("ZZZZZZZZZZZZZZZZZ", { fetchImpl: mockFetch({ Results: [result] }) }),
    (err) => err instanceof VinDecodeError && err.status === 422
  );
});

test("502 on HTTP error, network error, or empty results", async () => {
  await assert.rejects(
    decodeVin("1HGCM82633A004352", { fetchImpl: mockFetch({}, { ok: false, status: 500 }) }),
    (err) => err.status === 502
  );
  await assert.rejects(
    decodeVin("1HGCM82633A004352", {
      fetchImpl: async () => {
        throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
      },
    }),
    (err) => err.status === 502 && /TimeoutError/.test(err.message)
  );
  await assert.rejects(
    decodeVin("1HGCM82633A004352", { fetchImpl: mockFetch({ Results: [] }) }),
    (err) => err.status === 502
  );
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      console.error(`FAIL - ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }
})();
