// Plain-node test, no framework: `node lib/ttlCache.test.js`
const assert = require("node:assert/strict");
const { createTtlCache } = require("./ttlCache");

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

test("stores and returns values", () => {
  const c = createTtlCache();
  assert.equal(c.get("a"), undefined);
  c.set("a", { x: 1 });
  assert.deepEqual(c.get("a"), { x: 1 });
});

test("entries expire after ttl", () => {
  let t = 0;
  const c = createTtlCache({ ttlMs: 1000, now: () => t });
  c.set("a", 1);
  t = 999;
  assert.equal(c.get("a"), 1);
  t = 1999; // read at 999 doesn't extend expiry
  assert.equal(c.get("a"), undefined);
  assert.equal(c.size, 0);
});

test("evicts least recently used past maxEntries", () => {
  const c = createTtlCache({ maxEntries: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.get("a"); // a is now most recent
  c.set("c", 3); // evicts b
  assert.equal(c.get("b"), undefined);
  assert.equal(c.get("a"), 1);
  assert.equal(c.get("c"), 3);
  assert.equal(c.size, 2);
});
