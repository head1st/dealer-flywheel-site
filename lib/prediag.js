// Pre-Diagnostic Questionnaire: input cleaning and email formatting.
//
// The questions live in the browser (src/js/prediag.js). The page sends every
// answered question as { section, label, value }, so the server doesn't have
// to know the question list: it only bounds sizes, strips junk, and formats
// the email. Changing a question never needs a server change.

const MAX_ANSWERS = 200; // the form has well under 100 fields; this only stops abuse
const MAX_SKIPPED = 20;
const MAX_SECTION = 120;
const MAX_LABEL = 300;
const MAX_VALUE = 4000;

function cleanStr(v, max) {
  if (typeof v !== "string") return "";
  // Collapse stray control characters (keep newlines and tabs), then trim.
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function cleanValue(v) {
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((x) => cleanStr(x, 300))
      .filter(Boolean)
      .slice(0, 40)
      .join("; ")
      .slice(0, MAX_VALUE);
  }
  return cleanStr(v, MAX_VALUE);
}

// Returns only answers that have a section, a question and a non-empty answer.
function cleanAnswers(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, MAX_ANSWERS)) {
    if (!item || typeof item !== "object") continue;
    const section = cleanStr(item.section, MAX_SECTION);
    const label = cleanStr(item.label, MAX_LABEL);
    const value = cleanValue(item.value);
    if (!section || !label || !value) continue;
    out.push({ section, label, value });
  }
  return out;
}

function cleanSkipped(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, MAX_SKIPPED)) {
    if (!item || typeof item !== "object") continue;
    const section = cleanStr(item.section, MAX_SECTION);
    if (!section) continue;
    out.push({ section, who: cleanStr(item.who, 300) });
  }
  return out;
}

function formatEmail({ store, respondentName, role, contact, answers, skipped, trapFilled }) {
  const lines = [];
  lines.push("New Pre-Diagnostic Questionnaire submission");
  lines.push(`Store: ${store}`);
  lines.push(`Respondent: ${respondentName} (${role})${contact ? " — " + contact : ""}`);
  lines.push(`Questions answered: ${answers.length}`);
  if (skipped.length) {
    lines.push("");
    lines.push("Sections handed off to someone else:");
    for (const s of skipped) lines.push(`  - ${s.section}${s.who ? ` — ask: ${s.who}` : " — (no name given)"}`);
  }

  let currentSection = null;
  for (const a of answers) {
    if (a.section !== currentSection) {
      currentSection = a.section;
      lines.push("");
      lines.push(`=== ${currentSection} ===`);
    }
    lines.push("");
    lines.push(a.label);
    lines.push(`  → ${a.value.replace(/\n/g, "\n    ")}`);
  }

  return {
    subject: `${trapFilled ? "[Check: possible spam] " : ""}Pre-Diagnostic Questionnaire: ${store} — ${respondentName} (${role})`,
    text: lines.join("\n") + "\n",
  };
}

module.exports = {
  MAX_ANSWERS,
  MAX_VALUE,
  cleanStr,
  cleanAnswers,
  cleanSkipped,
  formatEmail,
};
