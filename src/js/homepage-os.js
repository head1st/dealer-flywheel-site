/* Dealer Flywheel — Operating View prototype
 *
 * Purpose: prove that SYSTEM / DIAGNOSE / DECIDE are transformations of ONE
 * dealership object, not three separate diagrams.
 *
 * Structure is deliberately split three ways:
 *   1. MODEL     the dealership as data (departments, systems, workflows)
 *   2. STATE     the mode machine (mode, selectedWorkflow, cause, intervention)
 *   3. RENDER    a camera over the model; modes differ only by camera + emphasis
 *
 * No node position is ever recomputed per mode. DIAGNOSE and DECIDE move the
 * camera and change what is emphasised. That is the whole point of the test.
 */
(() => {
'use strict';

const root = document.getElementById('os');
if (!root) return;
const cv = document.getElementById('osCanvas');
if (!cv || !cv.getContext) return;

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ══════════════════════════════════════════════════════════════════
   1. MODEL — the dealership
   Departments follow the canonical handoff order from the
   Dealership Structure & Deal Flow model. Positions live here, once.
   ══════════════════════════════════════════════════════════════════ */

const DEPARTMENTS = [
  ['used',  'Used Cars',  'Variable ops'],
  ['mkt',   'Marketing',  'Variable ops'],
  ['bdc',   'BDC',        'Variable ops'],
  ['sal',   'Sales',      'Variable ops'],
  ['fin',   'Finance',    'Variable ops'],
  ['bill',  'Billing',    'Office'],
  ['acct',  'Accounting', 'Office'],
  ['parts', 'Parts',      'Fixed ops'],
  ['svc',   'Service',    'Fixed ops']
].map((d, i) => ({
  id: d[0], name: d[1], group: d[2], kind: 'dep', idx: i,
  ang: (-170 + i * 40) * DEG, r: 1
}));

const byId = {};
DEPARTMENTS.forEach(d => byId[d.id] = d);

/* Systems. Core systems sit near the middle because nearly everyone
   touches them. Department tools orbit the department they serve. */
const SYSTEMS = [
  { id:'crm', name:'CRM', kind:'core', ang:-25 * DEG, r:.34 },
  { id:'dms', name:'DMS', kind:'core', ang: 78 * DEG, r:.34 },
  { id:'inv',   name:'Inventory & Appraisal', kind:'tool', host:'used' },
  { id:'web',   name:'Website',               kind:'tool', host:'mkt'  },
  { id:'ph',    name:'Phones',                kind:'tool', host:'bdc'  },
  { id:'dsk',   name:'Desking',               kind:'tool', host:'sal'  },
  { id:'menu',  name:'F&I Menu',              kind:'tool', host:'fin'  },
  { id:'title', name:'Title & DMV',           kind:'tool', host:'bill' },
  { id:'sch',   name:'Service Scheduling',    kind:'tool', host:'svc'  }
];
SYSTEMS.forEach(s => {
  byId[s.id] = s;
  if (s.kind === 'tool') {
    const h = byId[s.host];
    s.ang = h.ang + 15 * DEG;
    s.r = 1.30;
  }
});

/* Which departments depend on which core system. */
const RELATIONSHIPS = {
  crm: ['mkt', 'bdc', 'sal', 'svc'],
  dms: ['used', 'fin', 'bill', 'acct', 'parts', 'svc']
};

/* Ring adjacency: each department hands work to the next. */
const ADJACENT = DEPARTMENTS.map((d, i) => [d.id, DEPARTMENTS[(i + 1) % 9].id]);

/* Cross-ring handoffs that exist in every store. */
const CHORDS = [
  ['sal', 'used'],   // trade-in
  ['svc', 'sal'],    // equity / service-to-sales
  ['svc', 'bdc']     // declined work follow-up
];

/* ══════════════════════════════════════════════════════════════════
   The four canonical causes. Flat peers — these are tokens, not copy.
   They are the same four the Diagnostic uses.
   ══════════════════════════════════════════════════════════════════ */
const CAUSES = {
  DUPLICATE: 'The same work is happening in two places.',
  UNOWNED:   'No one owns the next action.',
  INVISIBLE: 'The information exists. No one can see what needs attention.',
  WAITING:   'Work has stopped, waiting on something that never arrives.'
};

const INTERVENTIONS = ['PEOPLE', 'PROCESS', 'CONFIGURATION', 'AUTOMATION', 'AI'];

/* ══════════════════════════════════════════════════════════════════
   Workflows. Drawn from the Workflow Library, not invented for the site.
   Each traces a path that already exists in the constellation above.

   Note the pairs: BDC-01 and UC-02 share a cause (UNOWNED) and resolve
   to DIFFERENT interventions. So do SVC-06 and SVC-01 (INVISIBLE).
   Cause constrains the intervention set. It does not determine it.
   That is what the Diagnostic is for.
   ══════════════════════════════════════════════════════════════════ */
const WORKFLOWS = [
  {
    id: 'BDC-01', name: 'Lead response',
    path: ['mkt', 'bdc', 'sal'], breakAfter: 1,
    cause: 'UNOWNED',
    line: 'A lead arrives at 9:40pm. It is still unassigned at 8:15am.',
    context: [
      ['Trigger',  'Lead received outside business hours'],
      ['Systems',  'Website → CRM → Phones'],
      ['Evidence', 'CRM lead log, first-response timestamps'],
      ['Handoff',  'BDC → Sales']
    ],
    decision: [
      ['Existing capability',      'YES', 'The CRM can assign a lead and alert an owner.'],
      ['Process defined',          'YES', 'The store already expects a 15-minute response.'],
      ['Ownership defined',        'NO',  'After hours, nothing assigns the lead to a person.'],
      ['Configuration supports it','NO',  'Round-robin assignment exists but was never enabled.']
    ],
    intervention: 'CONFIGURATION',
    ruledOut: {
      PEOPLE:     'Staff know the rule. The gap is not a knowledge gap.',
      PROCESS:    'The process is already defined and agreed.',
      AUTOMATION: 'Nothing new needs building.',
      AI:         'No judgment is required to route a lead.'
    },
    because: 'The system can already do this. It was never turned on.'
  },
  {
    id: 'UC-02', name: 'Get-ready handoff',
    path: ['used', 'sal'], breakAfter: 0,
    cause: 'UNOWNED',
    line: 'A car finishes recon. Nobody moves it to the front line.',
    context: [
      ['Trigger',  'Reconditioning marked complete'],
      ['Systems',  'Inventory & Appraisal → DMS'],
      ['Evidence', 'Recon completion dates vs. lot-ready dates'],
      ['Handoff',  'Used Cars → Sales']
    ],
    decision: [
      ['Existing capability',      'NO',  'No system tracks physical lot readiness.'],
      ['Process defined',          'NO',  'There is no agreed step between recon and front line.'],
      ['Ownership defined',        'NO',  'Recon says it is done. Sales says it never arrived.'],
      ['Configuration supports it','N/A', 'Nothing to configure — the step does not exist yet.']
    ],
    intervention: 'PEOPLE',
    ruledOut: {
      PROCESS:       'A process cannot be written before someone owns the step.',
      CONFIGURATION: 'There is no system holding this work to configure.',
      AUTOMATION:    'Automating an unowned step just moves the gap.',
      AI:            'The problem is accountability, not judgment.'
    },
    because: 'Same cause as BDC-01. Different answer, because the store has no system holding this work at all.'
  },
  {
    id: 'SVC-06', name: 'Declined service work',
    path: ['svc', 'bdc'], breakAfter: 0,
    cause: 'INVISIBLE',
    line: 'A customer declines $1,400 of work. The record exists. Nobody follows up.',
    context: [
      ['Trigger',  'Line item declined on a repair order'],
      ['Systems',  'Service Scheduling → DMS → CRM'],
      ['Evidence', 'Declined-work lines on closed ROs'],
      ['Handoff',  'Service → BDC']
    ],
    decision: [
      ['Existing capability',      'YES', 'The DMS records every declined line.'],
      ['Process defined',          'NO',  'No follow-up cadence exists for declined work.'],
      ['Ownership defined',        'YES', 'The BDC owns outbound service follow-up.'],
      ['Configuration supports it','NO',  'No report surfaces declined lines to the BDC.']
    ],
    intervention: 'AUTOMATION',
    ruledOut: {
      PEOPLE:        'The BDC already owns this. They cannot see the work.',
      PROCESS:       'A cadence without a list is a meeting, not a workflow.',
      CONFIGURATION: 'The DMS has no native way to push this list out.',
      AI:            'Extracting declined lines is rules-based, not judgment.'
    },
    because: 'The evidence is captured and the owner exists. What is missing is the thing that moves it.'
  },
  {
    id: 'SVC-01', name: 'Equity mining',
    path: ['svc', 'sal'], breakAfter: 0,
    cause: 'INVISIBLE',
    line: 'A customer in a positive-equity position sits in the service lane for two hours.',
    context: [
      ['Trigger',  'Service appointment checked in'],
      ['Systems',  'Service Scheduling → DMS → equity tool'],
      ['Evidence', 'Equity tool output, service appointment log'],
      ['Handoff',  'Service → Sales']
    ],
    decision: [
      ['Existing capability',      'YES', 'The store already pays for an equity tool.'],
      ['Process defined',          'NO',  'No one runs the list against today’s appointments.'],
      ['Ownership defined',        'NO',  'Service assumes Sales. Sales assumes Service.'],
      ['Configuration supports it','YES', 'The tool can produce the daily list as-is.']
    ],
    intervention: 'PROCESS',
    ruledOut: {
      PEOPLE:        'Adding a person to an undefined process just adds a person.',
      CONFIGURATION: 'The tool is already capable and already configured.',
      AUTOMATION:    'Do not build around a tool the store already pays for.',
      AI:            'The list is already calculated. Nothing needs classifying.'
    },
    because: 'Same cause as SVC-06. Different answer, because here the capability is already bought and configured.'
  }
];

/* ══════════════════════════════════════════════════════════════════
   2. STATE — the mode machine
   ══════════════════════════════════════════════════════════════════ */

const MODES = ['SYSTEM', 'DIAGNOSE', 'DECIDE'];
const state = {
  mode: 'SYSTEM',
  selectedWorkflow: null,   // workflow id
  cause: null,              // token
  intervention: null,       // token
  revealed: false           // has the opening sequence finished
};

function workflow() {
  return WORKFLOWS.find(w => w.id === state.selectedWorkflow) || null;
}

function setMode(next, wfId) {
  if (!MODES.includes(next)) return;
  const wf = wfId ? WORKFLOWS.find(w => w.id === wfId) : workflow();

  state.mode = next;
  if (next === 'SYSTEM') {
    state.selectedWorkflow = null; state.cause = null; state.intervention = null;
  } else {
    const w = wf || WORKFLOWS[0];
    state.selectedWorkflow = w.id;
    state.cause = w.cause;
    state.intervention = next === 'DECIDE' ? w.intervention : null;
  }
  render();
  retarget();
  history.replaceState(null, '', '#' + next.toLowerCase());
}

/* ══════════════════════════════════════════════════════════════════
   3. RENDER — canvas
   Camera is the only thing that changes geometry between modes.
   ══════════════════════════════════════════════════════════════════ */

const ctx = cv.getContext('2d');
const stage = document.getElementById('osStage');
let W = 0, H = 0, DPR = 1, unit = 0, originX = 0, originY = 0;

/* camera: current + target, eased each frame */
const cam = { z: 1, x: 0, y: 0 };
const camT = { z: 1, x: 0, y: 0 };

/* per-node emphasis 0..1, eased */
const emph = {};
[...DEPARTMENTS, ...SYSTEMS].forEach(n => emph[n.id] = { v: 1, t: 1 });

let breakAlpha = { v: 0, t: 0 };
let t0 = performance.now();
let intro = reduced ? 1 : 0;       // 0..1 opening sequence
let signal = 0;                    // travelling signal phase

function resize() {
  const rect = stage.getBoundingClientRect();
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = rect.width; H = rect.height;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  unit = Math.min(W, H) * 0.36;
  originX = W / 2; originY = H / 2;
  retarget();
}

/* world position of a node — computed once from the model, never per mode */
function pos(n) {
  const r = (n.r != null ? n.r : 1) * unit;
  return { x: Math.cos(n.ang) * r, y: Math.sin(n.ang) * r };
}

/* screen position after camera */
function screen(n) {
  const p = pos(n);
  return {
    x: originX + (p.x - camT.x) * 0 + (p.x - cam.x) * cam.z,
    y: originY + (p.y - cam.y) * cam.z
  };
}

/* Set camera + emphasis targets from current state.
   This is the transformation. Nothing else moves. */
function retarget() {
  const wf = workflow();

  if (!wf) {
    camT.z = 1; camT.x = 0; camT.y = 0;
    [...DEPARTMENTS, ...SYSTEMS].forEach(n => emph[n.id].t = 1);
    breakAlpha.t = 0;
    return;
  }

  // centre the camera on the centroid of the selected path
  const pts = wf.path.map(id => pos(byId[id]));
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  // zoom so the path fills the frame comfortably
  let spread = 0;
  pts.forEach(a => pts.forEach(b => {
    spread = Math.max(spread, Math.hypot(a.x - b.x, a.y - b.y));
  }));
  const target = Math.min(W, H) * (wf.path.length > 2 ? .42 : .34);
  camT.z = clamp(spread > 0 ? target / spread * 1.35 : 1.8, 1.25, 2.4);
  camT.x = cx; camT.y = cy;

  const onPath = new Set(wf.path);
  // systems that serve a department on the path stay faintly present
  const related = new Set();
  SYSTEMS.forEach(s => {
    if (s.kind === 'tool' && onPath.has(s.host)) related.add(s.id);
    if (s.kind === 'core' && RELATIONSHIPS[s.id].some(d => onPath.has(d))) related.add(s.id);
  });

  [...DEPARTMENTS, ...SYSTEMS].forEach(n => {
    emph[n.id].t = onPath.has(n.id) ? 1 : related.has(n.id) ? .30 : .07;
  });
  breakAlpha.t = 1;
}

function stepEase(o, dt, rate = 7) {
  const k = reduced ? 1 : 1 - Math.exp(-rate * dt);
  o.v += (o.t - o.v) * k;
}

const COL = {
  bone:  '244,243,240',
  mute:  '138,145,153',
  line:  '58,62,68',
  gold:  '201,169,97'
};

function edge(a, b, alpha, opts = {}) {
  if (alpha <= .006) return;
  const A = screen(a), B = screen(b);
  ctx.strokeStyle = `rgba(${opts.color || COL.line},${alpha})`;
  ctx.lineWidth = opts.w || 1;
  if (opts.dash) ctx.setLineDash(opts.dash); else ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  ctx.setLineDash([]);
}

/* a curved chord, so cross-ring handoffs read as crossing the store */
function chord(a, b, alpha, opts = {}) {
  if (alpha <= .006) return;
  const A = screen(a), B = screen(b);
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const k = opts.k != null ? opts.k : .22;
  const cx2 = lerp(mx, originX, k), cy2 = lerp(my, originY, k);
  ctx.strokeStyle = `rgba(${opts.color || COL.line},${alpha})`;
  ctx.lineWidth = opts.w || 1;
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(cx2, cy2, B.x, B.y); ctx.stroke();
}

function node(n, alpha) {
  if (alpha <= .01) return;
  const p = screen(n);
  const dep = n.kind === 'dep';
  const core = n.kind === 'core';
  const scale = clamp(cam.z * .78, .85, 1.5);

  // dot
  const rr = (dep ? 3.4 : core ? 3 : 2.2) * (dep ? scale * .8 : 1);
  ctx.fillStyle = `rgba(${dep ? COL.bone : COL.mute},${alpha * (dep ? .95 : .75)})`;
  ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.fill();

  // label
  const size = dep ? 10.5 * clamp(scale, 1, 1.28) : 8.6;
  ctx.font = `500 ${size}px 'IBM Plex Mono', ui-monospace, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const off = (dep ? 15 : 12) * clamp(scale, 1, 1.2);
  const ux = Math.cos(n.ang), uy = Math.sin(n.ang);
  const label = dep ? n.name.toUpperCase() : n.name.toUpperCase();
  ctx.fillStyle = `rgba(${dep ? COL.bone : COL.mute},${alpha * (dep ? .92 : .6)})`;
  ctx.fillText(label, p.x + ux * off, p.y + uy * off);
}

function draw(now) {
  const dt = Math.min((now - t0) / 1000, .05); t0 = now;
  if (!reduced) intro = clamp(intro + dt / 2.6, 0, 1);
  signal = (signal + dt * .34) % 1;

  // ease camera + emphasis
  cam.z += (camT.z - cam.z) * (reduced ? 1 : 1 - Math.exp(-6 * dt));
  cam.x += (camT.x - cam.x) * (reduced ? 1 : 1 - Math.exp(-6 * dt));
  cam.y += (camT.y - cam.y) * (reduced ? 1 : 1 - Math.exp(-6 * dt));
  [...DEPARTMENTS, ...SYSTEMS].forEach(n => stepEase(emph[n.id], dt));
  stepEase(breakAlpha, dt, 5);

  ctx.clearRect(0, 0, W, H);

  const wf = workflow();
  const intro_e = easeOut(intro);
  const gate = id => emph[id].v * intro_e;

  /* ── system links (core systems to the departments that use them) ── */
  Object.keys(RELATIONSHIPS).forEach(sid => {
    RELATIONSHIPS[sid].forEach(did => {
      const a = Math.min(gate(sid), gate(did)) * .30;
      edge(byId[sid], byId[did], a, { dash: [2, 5] });
    });
  });

  /* ── tool to host department ── */
  SYSTEMS.filter(s => s.kind === 'tool').forEach(s => {
    edge(s, byId[s.host], Math.min(gate(s.id), gate(s.host)) * .34);
  });

  /* ── ring adjacency: the handoff order ── */
  ADJACENT.forEach(([a, b]) => {
    edge(byId[a], byId[b], Math.min(gate(a), gate(b)) * .55, { w: 1 });
  });

  /* ── cross-ring chords ── */
  CHORDS.forEach(([a, b]) => {
    chord(byId[a], byId[b], Math.min(gate(a), gate(b)) * .38);
  });

  /* ── the selected workflow path, drawn over everything ── */
  if (wf) {
    const a = breakAlpha.v;
    for (let i = 0; i < wf.path.length - 1; i++) {
      const A = byId[wf.path[i]], B = byId[wf.path[i + 1]];
      const broken = i === wf.breakAfter;
      const adjacent = ADJACENT.some(([x, y]) =>
        (x === A.id && y === B.id) || (x === B.id && y === A.id));

      if (!broken) {
        const fn = adjacent ? edge : chord;
        fn(A, B, a * .9, { color: COL.bone, w: 1.4 });
      } else {
        // the break: line stops, gap, then resumes
        const P = screen(A), Q = screen(B);
        const mid = .46, gap = .13;
        const seg = (t1, t2) => {
          ctx.strokeStyle = `rgba(${COL.bone},${a * .9})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(lerp(P.x, Q.x, t1), lerp(P.y, Q.y, t1));
          ctx.lineTo(lerp(P.x, Q.x, t2), lerp(P.y, Q.y, t2));
          ctx.stroke();
        };
        seg(0, mid - gap); seg(mid + gap, 1);

        // gold marker at the break — gold means Dealer Flywheel identified something
        const bx = lerp(P.x, Q.x, mid), by = lerp(P.y, Q.y, mid);
        const pulse = reduced ? .5 : (Math.sin(now / 620) * .5 + .5);
        ctx.strokeStyle = `rgba(${COL.gold},${a * (.55 + pulse * .45)})`;
        ctx.lineWidth = 1.3;
        const s = 5.4;
        ctx.beginPath();
        ctx.moveTo(bx - s, by - s); ctx.lineTo(bx + s, by + s);
        ctx.moveTo(bx + s, by - s); ctx.lineTo(bx - s, by + s);
        ctx.stroke();

        if (state.mode === 'DECIDE') {
          ctx.fillStyle = `rgba(${COL.gold},${a * .9})`;
          ctx.font = `500 9px 'IBM Plex Mono', ui-monospace, monospace`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(state.intervention, bx, by - 17);
        }
      }
    }

    /* travelling signal, stops at the break */
    if (!reduced && a > .4) {
      const legs = wf.path.length - 1;
      const total = signal * legs;
      const leg = Math.min(Math.floor(total), legs - 1);
      let tt = total - leg;
      if (leg >= wf.breakAfter) { tt = Math.min(tt, 1); }
      const use = Math.min(leg, wf.breakAfter);
      const stop = leg > wf.breakAfter ? .33 : (leg === wf.breakAfter ? Math.min(tt, .33) : tt);
      const A = screen(byId[wf.path[use]]), B = screen(byId[wf.path[use + 1]]);
      const sx = lerp(A.x, B.x, stop), sy = lerp(A.y, B.y, stop);
      ctx.fillStyle = `rgba(${COL.bone},${a * .85})`;
      ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, TAU); ctx.fill();
    }
  }

  /* ── nodes ── */
  [...SYSTEMS, ...DEPARTMENTS].forEach(n => node(n, gate(n.id)));

  requestAnimationFrame(draw);
}

/* ══════════════════════════════════════════════════════════════════
   DOM rendering — rails, dock, readouts
   ══════════════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const elMode   = $('osMode');
const elLeft   = $('osLeft');
const elRight  = $('osRight');
const elCaption= $('osCaption');
const elAlt    = $('osAlt');

const mono = (k, v, cls) =>
  `<div class="os-row${cls ? ' ' + cls : ''}"><span>${k}</span><strong>${v}</strong></div>`;

function render() {
  const wf = workflow();
  const m = state.mode;

  document.querySelectorAll('[data-mode]').forEach(b => {
    const on = b.dataset.mode === m;
    b.setAttribute('aria-selected', String(on));
    b.classList.toggle('on', on);
    b.classList.remove('invite');
  });
  root.dataset.mode = m;
  elMode.textContent = m;

  /* ── SYSTEM ─────────────────────────────────────────────────── */
  if (m === 'SYSTEM') {
    elLeft.innerHTML =
      `<h2 class="os-rail-h">Departments</h2>` +
      `<ol class="os-deps">` +
      DEPARTMENTS.map(d => `<li><span>${String(d.idx + 1).padStart(2,'0')}</span>${d.name}</li>`).join('') +
      `</ol>` +
      `<p class="os-note">In the order work moves through the store.</p>`;

    elRight.innerHTML =
      `<h2 class="os-rail-h">What this shows</h2>` +
      `<p class="os-para">Every department, the systems each one runs on, and the handoffs between them.</p>` +
      `<p class="os-para">No counts. No status. Nothing measured yet — this is the structure of a dealership, not the condition of yours.</p>` +
      `<p class="os-framenote">This is the frame.<br><em>The Diagnostic fills it in with your store.</em></p>`;

    elCaption.textContent = 'Nine departments. Two core systems. The handoffs between them.';
    elAlt.textContent =
      'Diagram: nine dealership departments arranged in handoff order — ' +
      DEPARTMENTS.map(d => d.name).join(', ') +
      ' — with CRM and DMS at the centre and department tools orbiting the department each serves.';
    return;
  }

  /* ── DIAGNOSE ───────────────────────────────────────────────── */
  if (m === 'DIAGNOSE') {
    elLeft.innerHTML =
      `<h2 class="os-rail-h">Where work stops</h2>` +
      `<ul class="os-causes">` +
      Object.keys(CAUSES).map(c =>
        `<li class="${c === state.cause ? 'on' : ''}"><b>${c}</b><span>${CAUSES[c]}</span></li>`
      ).join('') +
      `</ul>` +
      `<h2 class="os-rail-h mt">Workflow</h2>` +
      `<div class="os-wfpick">` +
      WORKFLOWS.map(w =>
        `<button type="button" data-wf="${w.id}" class="${w.id === wf.id ? 'on' : ''}">
           <b>${w.id}</b><span>${w.name}</span></button>`
      ).join('') +
      `</div>`;

    elRight.innerHTML =
      `<h2 class="os-rail-h">Trace</h2>` +
      `<p class="os-line">${wf.line}</p>` +
      `<div class="os-readout">` +
      wf.context.map(r => mono(r[0], r[1])).join('') +
      mono('Cause', wf.cause, 'gold') +
      `</div>` +
      `<p class="os-note">Work stopped at the break. One cause, named from the four.</p>`;

    elCaption.textContent =
      wf.id + ' · ' + wf.path.map(id => byId[id].name).join(' → ') + ' · break after ' +
      byId[wf.path[wf.breakAfter]].name;
    elAlt.textContent =
      'Diagram: the ' + wf.name + ' workflow isolated from the dealership map. ' +
      'Path: ' + wf.path.map(id => byId[id].name).join(' to ') + '. ' +
      'The handoff from ' + byId[wf.path[wf.breakAfter]].name + ' to ' +
      byId[wf.path[wf.breakAfter + 1]].name + ' is broken. Cause: ' + wf.cause + '.';
    return;
  }

  /* ── DECIDE ─────────────────────────────────────────────────── */
  elLeft.innerHTML =
    `<h2 class="os-rail-h">Intervention types</h2>` +
    `<ul class="os-ints">` +
    INTERVENTIONS.map(i => {
      const on = i === state.intervention;
      const why = on ? wf.because : (wf.ruledOut[i] || '');
      return `<li class="${on ? 'on' : 'off'}"><b>${i}</b><span>${why}</span></li>`;
    }).join('') +
    `</ul>` +
    `<h2 class="os-rail-h mt">Workflow</h2>` +
    `<div class="os-wfpick">` +
    WORKFLOWS.map(w =>
      `<button type="button" data-wf="${w.id}" class="${w.id === wf.id ? 'on' : ''}">
         <b>${w.id} · ${w.cause}</b><span>${w.name}</span></button>`
    ).join('') +
    `</div>` +
    `<p class="os-note">Two workflows share each cause and resolve differently.</p>`;

  elRight.innerHTML =
    `<h2 class="os-rail-h">Decision</h2>` +
    `<div class="os-readout">` +
    `<div class="os-row"><span>Workflow</span><strong>${wf.id}</strong></div>` +
    `<div class="os-row gold"><span>Cause</span><strong>${wf.cause}</strong></div>` +
    `</div>` +
    `<div class="os-qs">` +
    wf.decision.map(d =>
      `<div class="os-q ${d[1] === 'NO' ? 'no' : d[1] === 'YES' ? 'yes' : 'na'}">
         <div class="os-qh"><span>${d[0]}</span><b>${d[1]}</b></div>
         <p>${d[2]}</p></div>`
    ).join('') +
    `</div>` +
    `<div class="os-rec"><span>Recommended intervention</span><strong>${wf.intervention}</strong></div>`;

  elCaption.textContent =
    wf.id + ' · cause ' + wf.cause + ' · resolves to ' + wf.intervention;
  elAlt.textContent =
    'Diagram: the same ' + wf.name + ' workflow, with the recommended intervention ' +
    wf.intervention + ' marked at the break. Cause remains ' + wf.cause + '.';
}

/* ══════════════════════════════════════════════════════════════════
   Events
   ══════════════════════════════════════════════════════════════════ */

document.querySelectorAll('[data-mode]').forEach(b => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
});

/* workflow picker (delegated — the rail re-renders) */
elLeft.addEventListener('click', e => {
  const btn = e.target.closest('[data-wf]');
  if (btn) setMode(state.mode === 'SYSTEM' ? 'DIAGNOSE' : state.mode, btn.dataset.wf);
});

/* keyboard: left/right move through modes */
document.querySelector('.os-dock').addEventListener('keydown', e => {
  const i = MODES.indexOf(state.mode);
  if (e.key === 'ArrowRight') { setMode(MODES[Math.min(i + 1, MODES.length - 1)]); e.preventDefault(); }
  if (e.key === 'ArrowLeft')  { setMode(MODES[Math.max(i - 1, 0)]); e.preventDefault(); }
});

addEventListener('resize', resize);

/* ══════════════════════════════════════════════════════════════════
   First load: SYSTEM demonstrates itself once, settles, then DIAGNOSE
   receives a restrained invitation. No auto-advance beyond that.
   ══════════════════════════════════════════════════════════════════ */
function invite() {
  if (state.revealed) return;
  state.revealed = true;
  const b = document.querySelector('[data-mode="DIAGNOSE"]');
  if (b && state.mode === 'SYSTEM') b.classList.add('invite');
}

resize();
const hash = (location.hash || '').replace('#', '').toUpperCase();
setMode(MODES.includes(hash) ? hash : 'SYSTEM');
requestAnimationFrame(draw);
setTimeout(invite, reduced ? 600 : 3400);

})();
