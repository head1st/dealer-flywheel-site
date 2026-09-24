// Decode a VIN into vehicle specs via NHTSA's free vPIC API (no key needed).
//
// This is a $0 substitute for a paid inventory API (e.g. MarketCheck) for one
// specific job: decoding a VIN a dealer already has — from their feed, a
// trade-in, a window sticker. It does NOT do market-wide inventory discovery.
//
// Docs: https://vpic.nhtsa.dot.gov/api/

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended";
const DEFAULT_TIMEOUT_MS = 8000;

// 17 chars, letters I/O/Q never appear in a modern VIN.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

// Check digit (position 9) per 49 CFR 565.15.
const TRANSLIT = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

function normalizeVin(vin) {
  return typeof vin === "string" ? vin.trim().toUpperCase() : "";
}

function isValidVinFormat(vin) {
  return VIN_RE.test(normalizeVin(vin));
}

function computeCheckDigit(vin) {
  const v = normalizeVin(vin);
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = v[i];
    const val = /\d/.test(ch) ? Number(ch) : TRANSLIT[ch];
    sum += val * WEIGHTS[i];
  }
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

function hasValidCheckDigit(vin) {
  const v = normalizeVin(vin);
  return isValidVinFormat(v) && v[8] === computeCheckDigit(v);
}

// vPIC returns "" (and sometimes "Not Applicable") for unknown fields.
function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s === "Not Applicable" || s === "0") return null;
  return s;
}

function toNumber(v) {
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Map vPIC's flat ~150-field result to the handful a dealer actually uses.
function mapResult(r) {
  const displacement = toNumber(r.DisplacementL);
  return {
    year: toNumber(r.ModelYear),
    make: clean(r.Make),
    model: clean(r.Model),
    trim: clean(r.Trim),
    series: clean(r.Series),
    bodyClass: clean(r.BodyClass),
    vehicleType: clean(r.VehicleType),
    doors: toNumber(r.Doors),
    driveType: clean(r.DriveType),
    engine: {
      cylinders: toNumber(r.EngineCylinders),
      displacementL: displacement === null ? null : Math.round(displacement * 10) / 10,
      horsepower: toNumber(r.EngineHP),
      fuelType: clean(r.FuelTypePrimary),
    },
    transmission: clean(r.TransmissionStyle),
    manufacturer: clean(r.Manufacturer),
    plantCountry: clean(r.PlantCountry),
  };
}

class VinDecodeError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "VinDecodeError";
    this.status = status; // suggested HTTP status for the API layer
  }
}

/**
 * Decode a VIN. Resolves to { vin, vehicle, warnings } or throws VinDecodeError.
 * `fetchImpl` is injectable for tests.
 */
async function decodeVin(vin, { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const v = normalizeVin(vin);
  if (!isValidVinFormat(v)) {
    throw new VinDecodeError("VIN must be 17 characters (letters I, O, Q are not allowed).", 400);
  }

  const url = `${VPIC_BASE}/${encodeURIComponent(v)}?format=json`;
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new VinDecodeError(`Couldn't reach the NHTSA VIN service (${err.name || "error"}).`, 502);
  }
  if (!res.ok) {
    throw new VinDecodeError(`NHTSA VIN service returned HTTP ${res.status}.`, 502);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new VinDecodeError("NHTSA VIN service returned an unreadable response.", 502);
  }

  const r = body && Array.isArray(body.Results) ? body.Results[0] : null;
  if (!r) {
    throw new VinDecodeError("NHTSA VIN service returned no results.", 502);
  }

  const vehicle = mapResult(r);
  // ErrorCode is a comma-separated list; "0" alone means a clean decode.
  const codes = String(r.ErrorCode || "").split(",").map((c) => c.trim()).filter(Boolean);
  const warnings = codes.length && !(codes.length === 1 && codes[0] === "0")
    ? [clean(r.ErrorText)].filter(Boolean)
    : [];

  if (!vehicle.make && !vehicle.model && !vehicle.year) {
    throw new VinDecodeError(
      clean(r.ErrorText) || "NHTSA couldn't decode that VIN.",
      422
    );
  }

  return { vin: v, vehicle, warnings };
}

module.exports = {
  decodeVin,
  isValidVinFormat,
  hasValidCheckDigit,
  computeCheckDigit,
  VinDecodeError,
  _mapResult: mapResult,
};
