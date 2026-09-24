// Build ADF 1.0 (Auto-lead Data Format) XML from a plain lead object.
//
// ADF is the industry-standard XML that dealer CRMs (VinSolutions, ELEAD,
// DealerSocket, etc.) already ingest leads through, usually as the body of an
// email to the store's lead-intake address. Emitting it means a lead we
// capture drops into a dealer's existing CRM with zero integration work.
//
// Spec: ADF 1.0 (AutoLead DTD, v1.0). Required per the DTD:
//   prospect > requestdate, vehicle+, customer, vendor
//   customer > contact > name+ and at least one of email / phone

const INTERESTS = new Set(["buy", "lease", "sell", "trade-in", "test-drive"]);
const STATUSES = new Set(["new", "used"]);
const PHONE_TYPES = new Set(["voice", "fax", "cellphone", "pager"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AdfValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdfValidationError";
  }
}

// Escape for both text nodes and attribute values; strip chars XML 1.0 forbids.
function esc(value) {
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function str(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function el(tag, value, attrs = {}) {
  const v = str(value);
  if (!v) return "";
  const a = Object.entries(attrs)
    .filter(([, val]) => str(val))
    .map(([k, val]) => ` ${k}="${esc(str(val))}"`)
    .join("");
  return `<${tag}${a}>${esc(v)}</${tag}>`;
}

function indent(lines, depth) {
  const pad = "  ".repeat(depth);
  return lines.filter(Boolean).map((l) => pad + l);
}

// ADF wants ISO 8601 with an explicit offset, e.g. 2026-09-24T18:20:00-04:00.
function isoWithOffset(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new AdfValidationError("requestDate is not a valid date.");
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const pad = (n) => String(n).padStart(2, "0");
  const local = new Date(d.getTime() + offMin * 60000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function nameLines(person) {
  const first = str(person.firstName);
  const last = str(person.lastName);
  if (first || last) {
    return [el("name", first, { part: "first" }), el("name", last, { part: "last" })];
  }
  return [el("name", person.name, { part: "full" })];
}

function vehicleBlock(v) {
  const interest = INTERESTS.has(str(v.interest)) ? str(v.interest) : "buy";
  const status = STATUSES.has(str(v.status)) ? str(v.status) : "new";
  const inner = [
    el("id", v.id, { sequence: "1", source: v.idSource }),
    el("year", v.year),
    el("make", v.make),
    el("model", v.model),
    el("vin", v.vin),
    el("stock", v.stock),
    el("trim", v.trim),
    el("comments", v.comments),
  ];
  return [
    `<vehicle interest="${esc(interest)}" status="${esc(status)}">`,
    ...indent(inner, 1),
    `</vehicle>`,
  ];
}

/**
 * Build an ADF 1.0 XML string.
 *
 * lead = {
 *   requestDate?: Date|string (default: now),
 *   id?: string, idSource?: string,          // our lead id
 *   vehicles | vehicle: { year, make, model, vin, stock, trim, interest, status, comments },
 *   customer: { firstName, lastName | name, email, phone, phoneType, comments },
 *   vendor: { name, contactName?, email?, phone? },   // the dealership
 *   provider?: { name, url?, email?, phone? },         // who generated the lead
 * }
 */
function buildAdf(lead, { now = new Date() } = {}) {
  if (!lead || typeof lead !== "object") throw new AdfValidationError("Lead must be an object.");

  const customer = lead.customer || {};
  const hasName = str(customer.firstName) || str(customer.lastName) || str(customer.name);
  if (!hasName) throw new AdfValidationError("customer name is required.");
  const email = str(customer.email);
  const phone = str(customer.phone);
  if (!email && !phone) throw new AdfValidationError("customer email or phone is required.");
  if (email && !EMAIL_RE.test(email)) throw new AdfValidationError("customer email is invalid.");

  const vehicles = Array.isArray(lead.vehicles)
    ? lead.vehicles
    : lead.vehicle
      ? [lead.vehicle]
      : [];
  if (!vehicles.length) throw new AdfValidationError("At least one vehicle is required.");
  for (const v of vehicles) {
    if (!v || typeof v !== "object" || !(str(v.make) || str(v.model) || str(v.vin))) {
      throw new AdfValidationError("Each vehicle needs at least a make, model, or VIN.");
    }
  }

  const vendor = lead.vendor || {};
  if (!str(vendor.name)) throw new AdfValidationError("vendor (dealership) name is required.");

  const phoneType = PHONE_TYPES.has(str(customer.phoneType)) ? str(customer.phoneType) : "voice";

  const customerBlock = [
    `<customer>`,
    `  <contact>`,
    ...indent(
      [...nameLines(customer), el("email", email), el("phone", phone, { type: phoneType })],
      2
    ),
    `  </contact>`,
    ...indent([el("comments", customer.comments)], 1),
    `</customer>`,
  ];

  const vendorContact = str(vendor.contactName) || str(vendor.name);
  const vendorBlock = [
    `<vendor>`,
    ...indent([el("vendorname", vendor.name)], 1),
    `  <contact>`,
    ...indent(
      [
        el("name", vendorContact, { part: "full" }),
        el("email", vendor.email),
        el("phone", vendor.phone, { type: "voice" }),
      ],
      2
    ),
    `  </contact>`,
    `</vendor>`,
  ];

  const provider = lead.provider || {};
  const providerBlock = str(provider.name)
    ? [
        `<provider>`,
        ...indent(
          [
            el("name", provider.name, { part: "full" }),
            el("url", provider.url),
            el("email", provider.email),
            el("phone", provider.phone, { type: "voice" }),
          ],
          1
        ),
        `</provider>`,
      ]
    : [];

  const prospect = [
    el("id", lead.id, { sequence: "1", source: lead.idSource }),
    el("requestdate", isoWithOffset(lead.requestDate || now)),
    ...vehicles.flatMap(vehicleBlock),
    ...customerBlock,
    ...vendorBlock,
    ...providerBlock,
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?adf version="1.0"?>`,
    `<adf>`,
    `  <prospect status="new">`,
    ...indent(prospect, 2),
    `  </prospect>`,
    `</adf>`,
    ``,
  ].join("\n");
}

module.exports = { buildAdf, AdfValidationError, _esc: esc, _isoWithOffset: isoWithOffset };
