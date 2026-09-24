// Plain-node test, no framework: `node lib/adf.test.js`
const assert = require("node:assert/strict");
const { buildAdf, AdfValidationError, _esc } = require("./adf");

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

const BASE = {
  requestDate: "2026-09-24T22:20:00Z",
  vehicle: { year: 2025, make: "Honda", model: "Accord", trim: "EX", vin: "1HGCM82633A004352", stock: "A1234" },
  customer: { firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "516-555-0100" },
  vendor: { name: "Example Honda" },
  provider: { name: "Dealer Flywheel", url: "https://dealerflywheel.com" },
};

// Tiny well-formedness check: every open tag is closed in order.
function assertWellFormed(xml) {
  const body = xml.replace(/<\?[^?]*\?>/g, "");
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
    const [, closing, tag, selfClose] = m;
    if (selfClose) continue;
    if (closing) assert.equal(stack.pop(), tag, `mismatched </${tag}>`);
    else stack.push(tag);
  }
  assert.deepEqual(stack, [], "unclosed tags");
  assert.doesNotMatch(body.replace(/&(amp|lt|gt|quot|apos);/g, ""), /&/, "unescaped &");
}

test("builds a complete, well-formed ADF 1.0 document", () => {
  const xml = buildAdf(BASE);
  assertWellFormed(xml);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<\?adf version="1\.0"\?>\n<adf>/);
  assert.match(xml, /<prospect status="new">/);
  assert.match(xml, /<requestdate>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}<\/requestdate>/);
  assert.match(xml, /<vehicle interest="buy" status="new">/);
  assert.match(xml, /<year>2025<\/year>/);
  assert.match(xml, /<vin>1HGCM82633A004352<\/vin>/);
  assert.match(xml, /<stock>A1234<\/stock>/);
  assert.match(xml, /<name part="first">Jane<\/name>/);
  assert.match(xml, /<name part="last">Doe<\/name>/);
  assert.match(xml, /<email>jane@example\.com<\/email>/);
  assert.match(xml, /<phone type="voice">516-555-0100<\/phone>/);
  assert.match(xml, /<vendorname>Example Honda<\/vendorname>/);
  assert.match(xml, /<provider>\s*<name part="full">Dealer Flywheel<\/name>/);
});

test("requestdate is the same instant as the input", () => {
  const xml = buildAdf(BASE);
  const stamp = xml.match(/<requestdate>([^<]+)<\/requestdate>/)[1];
  assert.equal(new Date(stamp).toISOString(), "2026-09-24T22:20:00.000Z");
});

test("escapes XML special characters in user input", () => {
  const xml = buildAdf({
    ...BASE,
    customer: {
      ...BASE.customer,
      lastName: `O'Brien & <Sons>`,
      comments: `Want "best" price </comments><injected/>`,
    },
  });
  assertWellFormed(xml);
  assert.match(xml, /<name part="last">O&apos;Brien &amp; &lt;Sons&gt;<\/name>/);
  assert.doesNotMatch(xml, /<injected\/>/);
  assert.equal(_esc("a\u0001b"), "ab"); // control chars stripped
});

test("full-name fallback, multiple vehicles, valid interest/status passthrough", () => {
  const xml = buildAdf({
    ...BASE,
    customer: { name: "Jane Doe", phone: "5165550100", phoneType: "cellphone" },
    vehicle: undefined,
    vehicles: [
      { make: "Honda", model: "CR-V", interest: "lease", status: "new" },
      { year: 2019, make: "Toyota", model: "Camry", interest: "trade-in", status: "used" },
    ],
  });
  assertWellFormed(xml);
  assert.match(xml, /<name part="full">Jane Doe<\/name>/);
  assert.doesNotMatch(xml, /<email>/);
  assert.match(xml, /<phone type="cellphone">/);
  assert.match(xml, /<vehicle interest="lease" status="new">/);
  assert.match(xml, /<vehicle interest="trade-in" status="used">/);
});

test("unknown interest/status fall back to spec defaults", () => {
  const xml = buildAdf({ ...BASE, vehicle: { make: "Honda", interest: "steal", status: "mint" } });
  assert.match(xml, /<vehicle interest="buy" status="new">/);
});

test("omits empty optional elements", () => {
  const xml = buildAdf({ ...BASE, provider: undefined, vehicle: { make: "Honda" } });
  assert.doesNotMatch(xml, /<provider>/);
  assert.doesNotMatch(xml, /<trim>|<stock>|<vin>|<year>/);
});

test("rejects leads missing required ADF fields", () => {
  const bad = [
    [null, /object/],
    [{ ...BASE, customer: { email: "a@b.co" } }, /name/],
    [{ ...BASE, customer: { firstName: "Jane" } }, /email or phone/],
    [{ ...BASE, customer: { firstName: "Jane", email: "nope" } }, /email is invalid/],
    [{ ...BASE, vehicle: undefined }, /vehicle/],
    [{ ...BASE, vehicle: { year: 2025 } }, /make, model, or VIN/],
    [{ ...BASE, vendor: {} }, /vendor/],
    [{ ...BASE, requestDate: "not a date" }, /requestDate/],
  ];
  for (const [lead, msg] of bad) {
    assert.throws(() => buildAdf(lead), (err) => err instanceof AdfValidationError && msg.test(err.message));
  }
});
