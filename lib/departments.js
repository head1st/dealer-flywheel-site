// Canonical department names (Dealership Structure & Deal Flow model), in
// handoff order, plus "Not sure". Must match the chips on src/contact.njk.
const DEPARTMENTS = [
  "Used Cars",
  "Marketing",
  "BDC",
  "Sales",
  "Finance",
  "Billing",
  "Accounting",
  "Parts",
  "Service",
  "Not sure",
];

const SET = new Set(DEPARTMENTS);

// Optional field: anything not on the list (including missing) becomes "".
function cleanDepartment(v) {
  return typeof v === "string" && SET.has(v) ? v : "";
}

module.exports = { DEPARTMENTS, cleanDepartment };
