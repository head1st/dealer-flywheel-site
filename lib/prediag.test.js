// Plain-node test, no framework: `node lib/prediag.test.js`
const assert = require("node:assert/strict");
const { MAX_ANSWERS, MAX_VALUE, cleanStr, cleanAnswers, cleanSkipped, formatEmail } = require("./prediag");

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

test("cleanStr trims, bounds and rejects non-strings", () => {
  assert.equal(cleanStr("  hi  ", 10), "hi");
  assert.equal(cleanStr("abcdef", 3), "abc");
  assert.equal(cleanStr(42, 10), "");
  assert.equal(cleanStr(undefined, 10), "");
});

test("cleanStr strips control characters but keeps newlines", () => {
  assert.equal(cleanStr("a\u0000b\nc\u0007d", 20), "ab\ncd");
});

test("cleanAnswers keeps only complete, non-empty answers", () => {
  const out = cleanAnswers([
    { section: "S", label: "Q1", value: "yes" },
    { section: "S", label: "Q2", value: "   " },
    { section: "", label: "Q3", value: "x" },
    { section: "S", label: "", value: "x" },
    null,
    "junk",
  ]);
  assert.deepEqual(out, [{ section: "S", label: "Q1", value: "yes" }]);
});

test("cleanAnswers joins multi-select arrays", () => {
  const out = cleanAnswers([{ section: "S", label: "Q", value: ["A", "B", 7, ""] }]);
  assert.deepEqual(out, [{ section: "S", label: "Q", value: "A; B" }]);
});

test("cleanAnswers bounds count and value length", () => {
  const many = Array.from({ length: MAX_ANSWERS + 50 }, (_, i) => ({ section: "S", label: `Q${i}`, value: "v" }));
  assert.equal(cleanAnswers(many).length, MAX_ANSWERS);
  const long = cleanAnswers([{ section: "S", label: "Q", value: "x".repeat(MAX_VALUE + 500) }]);
  assert.equal(long[0].value.length, MAX_VALUE);
});

test("cleanAnswers and cleanSkipped tolerate non-arrays", () => {
  assert.deepEqual(cleanAnswers(undefined), []);
  assert.deepEqual(cleanAnswers({}), []);
  assert.deepEqual(cleanSkipped("x"), []);
});

test("cleanSkipped keeps section and optional name", () => {
  assert.deepEqual(cleanSkipped([{ section: "4. Service", who: " Pat, Service Director " }, { section: "" }]), [
    { section: "4. Service", who: "Pat, Service Director" },
  ]);
});

test("formatEmail groups by section and lists handed-off sections", () => {
  const { subject, text } = formatEmail({
    store: "Nissan 112",
    respondentName: "Kenny",
    role: "GSM",
    contact: "kenny@example.com",
    answers: [
      { section: "1. Store", label: "Headcount", value: "50-100" },
      { section: "1. Store", label: "Group?", value: "Independent" },
      { section: "3. Leads", label: "Sources", value: "Website; Phone" },
    ],
    skipped: [{ section: "5. Billing", who: "Dana" }],
    trapFilled: false,
  });
  assert.equal(subject, "Pre-Diagnostic Questionnaire: Nissan 112 — Kenny (GSM)");
  assert.match(text, /Respondent: Kenny \(GSM\) — kenny@example\.com/);
  assert.match(text, /Questions answered: 3/);
  assert.match(text, /5\. Billing — ask: Dana/);
  assert.equal((text.match(/=== 1\. Store ===/g) || []).length, 1);
  assert.ok(text.indexOf("=== 1. Store ===") < text.indexOf("=== 3. Leads ==="));
});

test("formatEmail flags a filled spam trap in the subject", () => {
  const { subject } = formatEmail({
    store: "X", respondentName: "Y", role: "Z", contact: "", answers: [], skipped: [], trapFilled: true,
  });
  assert.match(subject, /^\[Check: possible spam\] /);
});
