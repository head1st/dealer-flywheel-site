// Plain-node test, no framework: `node lib/departments.test.js`
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { DEPARTMENTS, cleanDepartment } = require("./departments");

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

test("accepts every canonical department", () => {
  for (const d of DEPARTMENTS) assert.equal(cleanDepartment(d), d);
});

test("optional: missing or unknown values become empty", () => {
  assert.equal(cleanDepartment(undefined), "");
  assert.equal(cleanDepartment(""), "");
  assert.equal(cleanDepartment("F&I"), "");
  assert.equal(cleanDepartment("sales"), "");
  assert.equal(cleanDepartment(["Sales"]), "");
});

test("contact page chips match the server list exactly", () => {
  const njk = fs.readFileSync(path.join(__dirname, "..", "src", "contact.njk"), "utf8");
  const m = njk.match(/for d in (\[[^\]]+\])/);
  assert.ok(m, "chip list not found in contact.njk");
  assert.deepEqual(JSON.parse(m[1]), DEPARTMENTS);
});
