(() => {
'use strict';
const hero = document.getElementById('fhero');
if (!hero || !document.getElementById('fhCanvas').getContext) return;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
function mulberry(s){ return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry(112);

/* ---------- the dealership ---------- */
/* ring order follows the handoffs: each department hands work to the next */
const DEP = [
  ['used','Used Cars'], ['mkt','Marketing'], ['bdc','BDC'], ['sal','Sales'], ['fin','Finance'],
  ['bill','Billing'], ['acct','Accounting'], ['parts','Parts'], ['svc','Service']
].map((a, i) => ({ id:a[0], name:a[1], kind:'dep', idx:i, ang:(-170 + i * 40) * DEG }));
const byId = {};
DEP.forEach(d => byId[d.id] = d);

/* tools that mainly serve one department orbit it */
const MOONS = [
  ['inv','Inventory & Appraisal','used'], ['web','Website','mkt'], ['ph','Phones','bdc'],
  ['dsk','Desking','sal'], ['menu','F&I Menu','fin'], ['title','Title & DMV','bill'],
  ['sch','Service Scheduling','svc'], ['body','Body Shop','svc']
].map(a => ({ id:a[0], name:a[1], kind:'moon', host:byId[a[2]], minor:a[0] === 'body' }));
MOONS.forEach(m => { byId[m.id] = m; m.orb0 = m.host.ang + (m.minor ? Math.PI : 0); });

/* the shared core around the logo: systems nearly everyone uses */
const CORE = [
  { id:'crm', name:'CRM', kind:'core', ang:-25 * DEG },
  { id:'dms', name:'DMS', kind:'core', ang:70 * DEG }
];
const VEN = { id:'ven', name:'Third-Party Tools', short:'Tools', kind:'core', ang:180 * DEG };
[...CORE, VEN].forEach(c => byId[c.id] = c);
const USES = { crm:['mkt','bdc','sal','svc'], dms:['used','fin','bill','acct','parts','svc'], ven:['mkt','used','fin','bill','parts'] };
const LINKS = [];
CORE.forEach(c => USES[c.id].forEach(d => LINKS.push({ c, d:byId[d] })));
const VLINKS = USES.ven.map(d => ({ c:VEN, d:byId[d] }));

/* the two handoffs that cross the ring */
const CHORDS = [
  { a:byId.sal, b:byId.used, name:'Trade-in', k:.5, t0:1.7, le:.5 },
  { a:byId.svc, b:byId.sal, name:'Equity mining', k:.62, t0:2.4, le:.28 }
];
const GROUPS = [['Variable ops',0,4],['Office',5,6],['Fixed ops',7,8]]
  .map(g => ({ name:g[0], a:DEP[g[1]].ang, b:DEP[g[2]].ang, mid:(DEP[g[1]].ang + DEP[g[2]].ang) / 2 }));
const NODES = [...DEP, ...MOONS, ...CORE, VEN];

/* chaos seats: jittered grid so the mess spreads across the frame */
(() => {
  const pool = [...DEP, ...MOONS, ...CORE];
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells.push([c, r]);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  pool.forEach((n, i) => {
    const [c, r] = cells[i];
    n.cx = (c + .5 + (rand() - .5) * .55) / 5;
    n.cy = (r + .5 + (rand() - .5) * .5) / 4;
  });
  NODES.forEach(n => { n.ph = rand() * TAU; n.lr = rand(); });
  const perm = DEP.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  DEP.forEach((d, i) => d.looseAng = (-170 + perm[i] * 40 + (rand() - .5) * 18) * DEG);
})();

const WRONG = [];
(() => {
  const pool = [...DEP, ...MOONS, ...CORE];
  while (WRONG.length < 17) {
    const a = pool[Math.floor(rand() * pool.length)], b = pool[Math.floor(rand() * pool.length)];
    if (a !== b && !(a.kind === 'moon' && a.host === b) && !(b.kind === 'moon' && b.host === a)) WRONG.push({ a, b, ph:rand() * TAU, f:1.1 + rand() * 1.6 });
  }
})();

/* ---------- copy ---------- */
const BEATS = [
  { tag:'The store today', h:'Your dealership already has the technology.',
    s:'Nine departments and a stack of systems, all running at once and rarely talking to each other.' },
  { tag:'Pair up', h:'Every department runs on its own tools.',
    s:'Each tool finds the department it serves. DMS and CRM sit at the core, because nearly everyone uses them.' },
  { tag:'Align', h:'Every department in the order the work moves.',
    s:'Variable ops, office and fixed ops, lined up by who hands work to whom.' },
  { tag:'Connect', h:'Every handoff connected, from first lead to next service visit.',
    s:'Trades cross to Used Cars. Service customers cross back to Sales. One deal moves through the store without being typed in twice.' },
  { tag:'Impact', h:'Then you add another tool.',
    s:'Every tool you add knocks the store sideways. We make it fit.' },
  { tag:'Momentum', h:'We make it work <em>together.</em>',
    s:'One connected store. One customer journey.', cta:true }
];
const LAST = BEATS.length - 1;
const T_IN = .3, T_HIT = 1.2, CAP0 = 2.2, CAP1 = 3.4, VS0 = 3.4, PUL = 4.4;
const PATH_A = [1, 2, 3, 4, 5, 6, 7, 8, 0];   // a new customer: lead to service, then recon back to Used Cars
const PATH_B = [8, 3, 4, 5, 6, 7];            // the flywheel: Service crosses to Sales, and the loop repeats
const SEG = 1.5;

/* ---------- DOM ---------- */
const $ = id => document.getElementById(id);
const stage = $('fhStage'), cv = $('fhCanvas'), ctx = cv.getContext('2d');
const copy = $('fhCopy'), glow = $('fhGlow');
const tip = $('fhTip'), tipName = $('fhTipName'), tipText = $('fhTipText');
const bars = $('fhBars'), count = $('fhCount'), nextBtn = $('fhNext');
$('fhHintTxt').textContent = coarse ? 'Swipe up to organize the store' : 'Scroll to organize the store';
BEATS.forEach((b, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + b.tag);
  btn.addEventListener('click', () => go(i));
  bars.appendChild(btn);
});

const pad2 = n => String(n + 1).padStart(2, '0');
function fillCopy(b){
  const B = BEATS[b];
  $('fhIdx').textContent = pad2(b);
  $('fhTag').textContent = B.tag;
  $('fhHl').innerHTML = B.h;
  $('fhSub').textContent = B.s;
  $('fhCtas').hidden = !B.cta;
  $('fhHint').hidden = b !== 0;
}
const ICON_NEXT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 2v11M3.5 8.5 8 13l4.5-4.5"/></svg>';
function updateNav(){
  [...bars.children].forEach((btn, i) => { if (i === beat) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current'); });
  count.innerHTML = '<b>' + pad2(beat) + '</b> / ' + pad2(LAST);
  nextBtn.setAttribute('aria-label', beat === LAST ? 'Continue to the rest of the page' : 'Next step');
  nextBtn.innerHTML = ICON_NEXT;
}
let copyTimer;
function swapCopy(b, dir){
  copy.style.setProperty('--from', (dir > 0 ? 26 : -26) + 'px');
  copy.classList.remove('entering');
  copy.classList.add('leaving');
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    fillCopy(b);
    copy.classList.remove('leaving');
    copy.classList.add('entering');
    void copy.offsetWidth;
    copy.classList.remove('entering');
  }, reduced ? 120 : 280);
}

/* ---------- state ---------- */
let beat = 0, prev = 0, beatStart = -1e9, W = 0, H = 0, R = 100, RM = 14, cx = 0, cy = 0, compact = false, dpr = 1;
let T = 0, last = performance.now(), rot = 0, rotV = 0, pulseT = 0, sel = null, lastTipKey = '';
let mix = 0, tNow = 0;
const DUR = reduced ? 420 : 1150, STAG = reduced ? 0 : 12;

function go(n){
  if (n < 0 || n > LAST || n === beat) return;
  const dir = n > beat ? 1 : -1;
  prev = beat; beat = n; beatStart = performance.now(); sel = null;
  if (n === 3 || n === LAST || n < 3) pulseT = 0;
  swapCopy(n, dir); updateNav();
}
nextBtn.addEventListener('click', () => {
  if (beat < LAST) { go(beat + 1); return; }
  const next = hero.nextElementSibling;
  if (next) next.scrollIntoView({ behavior:reduced ? 'auto' : 'smooth' });
});

/* ---------- geometry ---------- */
function measure(){
  const r = stage.getBoundingClientRect();
  W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  compact = W < 600;
  const rmF = compact ? .15 : .14, labelW = compact ? 16 : 128, tipRoom = compact ? 46 : 0;
  R = Math.max(56, Math.min((W - 2 * labelW) / (2 * (1 + rmF)), (H - (compact ? 36 : 64) - tipRoom) / (2 * (1 + rmF)), 330));
  RM = R * rmF;
  cx = W / 2; cy = (H - tipRoom) / 2;
}
new ResizeObserver(measure).observe(stage);
measure();

const G0 = () => ({ x:cx, y:cy, r:R });
const polar = (g, a, r) => ({ x:g.x + Math.cos(a) * r, y:g.y + Math.sin(a) * r });

function impactEnv(s){
  if (s < 0) return 0;
  if (s < .18) return easeOut(s / .18);
  const back = 1 - ease(clamp((s - .7) / 1.3));
  return back * (1 + .14 * Math.sin(s * 15) * Math.exp(-s * 2.2));
}
const bump = s => s < 0 ? 0 : s < .1 ? s / .1 : 1 - ease(clamp((s - .4) / 1.2));
const capP = (b, t) => b < 4 ? 0 : b === 4 ? ease(clamp((t - CAP0) / (CAP1 - CAP0))) : 1;
const impactPoint = () => polar(G0(), -30 * DEG + rot, R * .97);
const astroStart = () => ({ x:W + 60, y:-60 });

function chaosPos(n){
  const padX = compact ? 20 : 28, padY = 22;
  const spanW = W - padX * 2 - (compact ? 50 : 120);
  const amp = compact ? 12 : 20;
  let x = padX + n.cx * spanW + Math.sin(T * .42 + n.ph) * amp;
  let y = padY + n.cy * (H - padY * 2 - 12) + Math.cos(T * .35 + n.ph * 1.3) * amp * .75;
  if (!reduced) { x += Math.sin(T * 9 + n.ph) * 1.2; y += Math.cos(T * 11 + n.ph) * 1.2; }
  return { x, y };
}
function venPos(b, t){
  const g = G0(), slot = polar(g, VEN.ang + rot, g.r * .32);
  if (b !== 4) return slot;
  const I = impactPoint(), S = astroStart();
  if (t < T_HIT) { const q = clamp((t - T_IN) / (T_HIT - T_IN)); const e = q * q; return { x:lerp(S.x, I.x, e), y:lerp(S.y, I.y, e) }; }
  const ix = g.x - I.x, iy = g.y - I.y, il = Math.hypot(ix, iy) || 1;
  const D = { x:I.x + ix / il * R * .16 * easeOut(clamp((t - T_HIT) / 1)), y:I.y + iy / il * R * .16 * easeOut(clamp((t - T_HIT) / 1)) };
  if (t < CAP0) return D;
  const c = ease(clamp((t - CAP0) / (CAP1 - CAP0)));
  const px = -(slot.y - D.y), py = slot.x - D.x, pl = Math.hypot(px, py) || 1;
  const bow = Math.sin(Math.PI * c) * R * .12;
  return { x:lerp(D.x, slot.x, c) + px / pl * bow, y:lerp(D.y, slot.y, c) + py / pl * bow };
}
const venAlpha = (b, t) => b < 4 ? 0 : b === 4 ? clamp((t - T_IN) / .15) : 1;
const orbA = m => m.orb0 + (reduced ? 0 : T * .12);

function layout(b, n, t){
  if (n === VEN) return venPos(b, t);
  if (b === 0) return chaosPos(n);
  if (n.kind === 'moon') {
    const h = layout(b, n.host, t), r = RM * (n.minor ? .72 : 1), a = orbA(n);
    return { x:h.x + Math.cos(a) * r, y:h.y + Math.sin(a) * r };
  }
  const g = G0();
  let p;
  if (n.kind === 'core') p = polar(g, n.ang + (b >= 2 ? rot : 0), g.r * .32);
  else if (b === 1) {
    p = polar(g, n.looseAng, R * (.84 + n.lr * .18));
    p.x += Math.sin(T * .4 + n.ph) * 6; p.y += Math.cos(T * .33 + n.ph) * 6;
  } else p = polar(g, n.ang + rot, g.r);
  if (b === 4) {
    const e = impactEnv(t - T_HIT);
    if (e > 0) {
      const I = impactPoint(), dx = p.x - I.x, dy = p.y - I.y, d = Math.hypot(dx, dy) || 1;
      const A = R * .42 * e * (.35 + .65 * Math.exp(-d / (R * .8)));
      p = { x:p.x + dx / d * A, y:p.y + dy / d * A };
    }
  }
  return p;
}

/* scalar levels per beat; t = seconds into the beat */
function lv(name, b, t){
  switch (name) {
    case 'wrong': return b === 0 ? 1 : b === 1 ? .2 : b === 4 ? .55 * bump(t - T_HIT) : 0;
    case 'hub': return b === 0 ? 0 : 1;
    case 'tether': return b < 1 ? 0 : b === 1 ? clamp((t - .7) / .5) : 1;
    case 'ring': return b < 2 ? 0 : b === 2 ? easeOut(clamp((t - .3) / .9)) : 1;
    case 'groups': return b < 2 ? 0 : b === 2 ? clamp((t - 1) / .6) : 1;
    case 'coreRing': return b < 3 ? 0 : b === 3 ? clamp(tNow / .6) : 1;
    case 'pulse':
      if (b < 3 || reduced) return 0;
      if (b === 3) return clamp((t - 3) / .4);
      if (b === 4) return t < PUL ? clamp(1 - (t - .95) / .25) : clamp((t - PUL) / .5);
      return clamp((t - .4) / .4);
    case 'ven': return venAlpha(b, t);
    case 'cap': return capP(b, t);
    case 'crown': return b === LAST ? clamp((t - .6) / .8) : 0;
  }
  return 0;
}
const linkLv = (b, k, t) => b < 3 ? 0 : b === 3 ? easeOut(clamp((t - .5 - k * .035) / .4)) : 1;
const chordLv = (b, c, t) => b < 3 ? 0 : b === 3 ? easeOut(clamp((t - c.t0) / .7)) : 1;
const vLinkLv = (b, k, t) => b < 4 ? 0 : b === 4 ? easeOut(clamp((t - VS0 - k * .12) / .5)) : 1;
function breakAmt(k){
  if (beat !== 4 || reduced) return 0;
  const s = tNow - T_HIT;
  if (s < 0) return 0;
  if (s < .08) return s / .08;
  return 1 - ease(clamp((s - 1 - (k % 7) * .06) / .8));
}
function mixLv(name){ return lerp(lv(name, prev, 99), lv(name, beat, tNow), mix); }

/* ---------- ambient particles (slowest parallax layer) ---------- */
const DUST = Array.from({ length:64 }, () => ({ x:rand(), y:rand(), r:.5 + rand() * 1.1, a:.06 + rand() * .22, z:.3 + rand() * .9, v:.003 + rand() * .008 }));

/* ---------- input ----------
   The hero holds the page while it is at the top: one gesture moves one frame.
   Past the last frame, the page scrolls normally; back at the top, scrolling up steps back. */
const atTop = () => window.scrollY < 4;
let wheelAcc = 0, wheelLock = false, lastWheel = 0, wasBelow = false;
window.addEventListener('scroll', () => {
  if (!atTop()) { wasBelow = true; return; }
  if (wasBelow) { wasBelow = false; wheelLock = true; lastWheel = performance.now(); }
}, { passive:true });
const wants = dirn => atTop() && (dirn > 0 ? beat < LAST : beat > 0);
window.addEventListener('wheel', e => {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const dirn = e.deltaY > 0 ? 1 : -1;
  const now = performance.now();
  if (!wants(dirn)) { if (wheelLock) lastWheel = now; return; }
  e.preventDefault();
  if (wheelLock) { lastWheel = now; return; }
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 34) { go(beat + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = true; lastWheel = now; }
}, { passive:false });

let tStart = null, tCapture = null;
hero.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { tStart = null; return; }
  tStart = { x:e.touches[0].clientX, y:e.touches[0].clientY }; tCapture = null;
}, { passive:true });
hero.addEventListener('touchmove', e => {
  if (!tStart) return;
  const dx = e.touches[0].clientX - tStart.x, dy = e.touches[0].clientY - tStart.y;
  if (tCapture === null && Math.hypot(dx, dy) > 8) tCapture = Math.abs(dy) > Math.abs(dx) && wants(dy < 0 ? 1 : -1);
  if (tCapture) e.preventDefault();
}, { passive:false });
hero.addEventListener('touchend', e => {
  if (!tStart) return;
  const t = e.changedTouches[0], dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
  if (Math.hypot(dx, dy) < 10) tapAt(t.clientX, t.clientY, e.target);
  else if (tCapture && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && performance.now() - beatStart > 700) go(beat + (dy < 0 ? 1 : -1));
  tStart = null; tCapture = null;
});

window.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  let dirn = 0;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !(e.target.closest && e.target.closest('a,button')))) dirn = 1;
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') dirn = -1;
  if (!dirn || !wants(dirn)) return;
  e.preventDefault(); go(beat + dirn);
});

stage.addEventListener('click', e => { if (!coarse) tapAt(e.clientX, e.clientY, e.target); });
let pointer = { x:0, y:0, has:false };
hero.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = hero.getBoundingClientRect();
  pointer = { x:e.clientX - r.left, y:e.clientY - r.top, has:true };
  sel = hit(e.clientX, e.clientY);
});
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') sel = null; });

const POS = new Map();
const visibleAlpha = n => n === VEN ? mixLv('ven') : 1;
function hit(clientX, clientY){
  const r = stage.getBoundingClientRect();
  const x = clientX - r.left, y = clientY - r.top;
  if (x < 0 || y < 0 || x > W || y > H) return null;
  let best = null, bd = compact ? 24 : 20;
  NODES.forEach(n => {
    const p = POS.get(n); if (!p || visibleAlpha(n) < .4) return;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = n; }
  });
  return best;
}
function tapAt(x, y, target){
  if (!stage.contains(target)) { sel = null; return; }
  sel = hit(x, y);
}

/* ---------- tip ---------- */
const coreFor = d => [...CORE, VEN].filter(c => USES[c.id].includes(d.id) && (c !== VEN || mixLv('cap') > .5));
function tipFor(n){
  if (!n) return null;
  if (n.kind === 'dep') {
    const tools = [...MOONS.filter(m => m.host === n), ...coreFor(n)].map(t => t.name);
    return [n.name, 'Hands work to ' + DEP[(n.idx + 1) % DEP.length].name + '. Runs on ' + tools.join(', ') + '.'];
  }
  if (n.kind === 'moon') return [n.name, 'Orbits ' + n.host.name];
  if (n === VEN && beat === 4 && tNow < CAP1) return ['New tool', 'Just bought, and not connected to anything yet'];
  return [n.name, 'Shared core, used by ' + USES[n.id].map(id => byId[id].name).join(', ')];
}
function setTip(info){
  const key = info ? info.join('|') : '';
  if (key === lastTipKey) return;
  lastTipKey = key;
  if (!info) { tip.hidden = true; return; }
  tipName.textContent = info[0]; tipText.textContent = info[1]; tip.hidden = false;
}

/* ---------- drawing helpers ---------- */
const MARK = new Path2D('M 151.918,14.533 A 100,100 0 1,0 169.058,27.675 L 142.680,55.300 A 61.8034,61.8034 0 0,0 132.087,47.179 Z M 112.906,39.559 L 112.906,160.441 A 61.8034,61.8034 0 0,0 112.906,39.559 Z');
const C_BONE = '244,243,240', C_GOLD = '201,169,97', C_GOLD_D = '169,139,75', C_GRAPH = '139,145,153';
const MONO = "500 9px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
const rgba = (c, a) => 'rgba(' + c + ',' + clamp(a).toFixed(3) + ')';
function line(a, b, color, w, prog = 1, dash){
  if (prog <= 0) return;
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.setLineDash(dash || []);
  ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, b.x, prog), lerp(a.y, b.y, prog)); ctx.stroke();
  ctx.setLineDash([]);
}
const brokenLine = (a, b, color, w) => { line(a, b, color, w, .3); line(b, a, color, w, .3); };
const bez = (A, C, B, e) => ({ x:(1 - e) * (1 - e) * A.x + 2 * (1 - e) * e * C.x + e * e * B.x, y:(1 - e) * (1 - e) * A.y + 2 * (1 - e) * e * C.y + e * e * B.y });
function curve(A, C, B, color, w, from = 0, to = 1){
  if (to <= from) return;
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w;
  const n = 28;
  for (let i = 0; i <= n; i++) { const p = bez(A, C, B, lerp(from, to, i / n)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke();
}
function label(text, x, y, align, font, color){
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  let left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  left = clamp(left, 6, W - w - 6);
  ctx.textAlign = 'left';
  ctx.fillText(text, left, clamp(y, 8, H - 8));
}
function radialAt(text, p, a, off, font, color){
  const c = Math.cos(a), s = Math.sin(a);
  let x = p.x + c * off, y = p.y + s * off;
  const align = c > .28 ? 'left' : c < -.28 ? 'right' : 'center';
  if (align === 'center') y += s > 0 ? 7 : -7;
  label(text, x, y, align, font, color);
}

/* ---------- frame ---------- */
let visible = true, rafId = 0;
new IntersectionObserver(es => {
  visible = es[0].isIntersecting;
  if (visible && !rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); }
}).observe(hero);
function frame(now){
  rafId = 0;
  if (!visible) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!reduced) T += dt;
  tNow = reduced ? 99 : (now - beatStart) / 1000;
  const pg = clamp((now - beatStart) / DUR);
  mix = reduced ? (pg > .5 ? 1 : 0) : ease(pg);
  if (wheelLock && now - beatStart > 850 && now - lastWheel > 220) { wheelLock = false; wheelAcc = 0; }

  const target = beat === LAST && !reduced ? .09 : 0;
  rotV += (target - rotV) * Math.min(1, dt * .7);
  rot += rotV * dt;
  if (beat >= 3 && !reduced) pulseT += dt;

  const hw = hero.clientWidth, hh = hero.clientHeight;
  const gx = pointer.has && !coarse ? pointer.x : hw * (.62 + .22 * Math.sin(T * .13));
  const gy = pointer.has && !coarse ? pointer.y : hh * (.42 + .18 * Math.cos(T * .11));
  glow.style.transform = 'translate(' + (gx - 360) + 'px,' + (gy - 360) + 'px)';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const dir = beat >= prev ? 1 : -1;
  const beatF = lerp(prev, beat, mix);
  const sHit = beat === 4 && !reduced ? tNow - T_HIT : -1;

  // layer 1: dust, slow parallax
  DUST.forEach(p => {
    let y = ((p.y - T * p.v) % 1 + 1) % 1 * H - beatF * 30 * p.z;
    y = ((y % H) + H) % H;
    ctx.fillStyle = rgba(C_BONE, p.a);
    ctx.beginPath(); ctx.arc(p.x * W + Math.sin(T * .2 + p.x * 10) * 6, y, p.r, 0, TAU); ctx.fill();
  });

  // layer 2: the diagram, mid-speed parallax, camera shake on impact
  let shift = reduced ? 0 : (1 - mix) * dir * 18, shx = 0;
  if (sHit > 0) { const amp = 7 * Math.exp(-sHit * 4.5); shx = Math.sin(sHit * 60) * amp; shift += Math.cos(sHit * 47) * amp; }
  const fade = reduced ? Math.abs(1 - 2 * pg) * .7 + .3 : 1;
  ctx.save();
  ctx.translate(shx, shift);
  ctx.globalAlpha = fade;

  NODES.forEach((n, i) => {
    const p = reduced ? mix : ease(clamp((now - beatStart - i * STAG) / DUR));
    const a = layout(prev, n, 99), b = layout(beat, n, tNow);
    POS.set(n, n === VEN && beat === 4 ? b : { x:lerp(a.x, b.x, p), y:lerp(a.y, b.y, p) });
  });
  const P = n => POS.get(n);
  const G = G0();
  const dirFrom = n => { const p = P(n); return Math.atan2(p.y - G.y, p.x - G.x); };
  const venA = mixLv('ven'), cap = mixLv('cap');
  const bumpNow = sHit > 0 ? bump(sHit) : 0;
  const ordered = (mix > .5 ? beat : prev) >= 2;
  const labelFade = 1 - Math.sin(Math.PI * mix) * .85;
  const chordCtrl = ch => {
    const A = P(ch.a), B = P(ch.b);
    const aa = Math.atan2(A.y - G.y, A.x - G.x), bb = Math.atan2(B.y - G.y, B.x - G.x);
    const bis = aa + Math.atan2(Math.sin(bb - aa), Math.cos(bb - aa)) / 2;
    return polar(G, bis, G.r * ch.k);
  };

  // the gold light: one path per frame
  const pulseA = mixLv('pulse');
  let lit = null, pulsePos = null, seg = null;
  if (pulseA > .01) {
    const path = beat === LAST ? PATH_B : PATH_A, L = path.length;
    const u = pulseT / SEG, k = Math.floor(u) % L, f = u - Math.floor(u);
    const A = DEP[path[k]], B = DEP[path[(k + 1) % L]];
    if (f < .3) { lit = A; pulsePos = P(A); }
    else {
      const e = ease((f - .3) / .7);
      if ((B.idx - A.idx + DEP.length) % DEP.length === 1) {
        const a1 = A.ang + 40 * DEG * e;
        pulsePos = polar(G, a1 + rot, G.r); seg = { type:'arc', a0:A.ang + rot, a1:a1 + rot };
      } else {
        const ch = CHORDS.find(c => (c.a === A && c.b === B) || (c.a === B && c.b === A));
        const C = chordCtrl(ch);
        pulsePos = bez(P(A), C, P(B), e); seg = { type:'chord', A:P(A), B:P(B), C, e };
      }
    }
  }

  // highlight set: white when the viewer points at something, gold when Dealer Flywheel's light is there
  const focus = sel || (lit && pulseA > .5 ? lit : null);
  const HOT = sel ? C_BONE : C_GOLD, HOT_HEX = sel ? '#FFFFFF' : '#C9A961';
  const hiDep = new Set(), hiMoon = new Set(), hiCore = new Set();
  if (focus) {
    if (focus.kind === 'dep') { hiDep.add(focus); MOONS.forEach(m => m.host === focus && hiMoon.add(m)); coreFor(focus).forEach(c => hiCore.add(c)); }
    else if (focus.kind === 'moon') { hiMoon.add(focus); hiDep.add(focus.host); }
    else { hiCore.add(focus); USES[focus.id].forEach(id => hiDep.add(byId[id])); }
  }

  // wrong links: the opening mess, and again for a moment on impact
  const wrongA = mixLv('wrong');
  if (wrongA > .01) WRONG.forEach(w => {
    const a = P(w.a), b = P(w.b);
    const on = reduced ? true : Math.sin(T * w.f + w.ph) > -.25;
    if (on) line(a, b, rgba(C_BONE, .2 * wrongA), 1, 1, [3, 4]);
    else brokenLine(a, b, rgba(C_BONE, .34 * wrongA), 1);
  });

  // ring grows out of the logo; section arcs and labels
  const ringA = mixLv('ring') * (1 - .5 * bumpNow), groupsA = mixLv('groups') * (1 - .7 * bumpNow);
  if (ringA > .01) {
    ctx.strokeStyle = rgba(C_BONE, .12 * Math.min(1, ringA * 1.4)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(G.x, G.y, lerp(G.r * .14, G.r, easeOut(mixLv('ring'))), 0, TAU); ctx.stroke();
  }
  if (groupsA > .01) {
    ctx.strokeStyle = rgba(C_BONE, .34 * groupsA); ctx.lineWidth = 1.5;
    GROUPS.forEach(gr => { ctx.beginPath(); ctx.arc(G.x, G.y, G.r, gr.a - 9 * DEG + rot, gr.b + 9 * DEG + rot); ctx.stroke(); });
    GROUPS.forEach(gr => { const p = polar(G, gr.mid + rot, G.r * .7); label(gr.name.toUpperCase(), p.x, p.y, 'center', MONO, rgba(C_GRAPH, groupsA)); });
  }

  // Dealer Flywheel's layer: the gold core orbit, the opening ripple and sweep of Connect
  const coreRing = mixLv('coreRing');
  if (coreRing > .01) {
    ctx.strokeStyle = rgba(C_GOLD_D, .22 * coreRing); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(G.x, G.y, G.r * .32, 0, TAU); ctx.stroke();
  }
  if (beat === 3 && !reduced) {
    if (tNow < 1.2) {
      const q = clamp(tNow / 1.1);
      ctx.strokeStyle = rgba(C_GOLD, .55 * (1 - q)); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(G.x, G.y, lerp(G.r * .14, G.r, easeOut(q)), 0, TAU); ctx.stroke();
    }
    const q = clamp((tNow - .9) / 1), out = clamp((tNow - 1.9) / .7);
    if (q > 0 && out < 1) {
      const a0 = DEP[1].ang + rot;
      ctx.strokeStyle = rgba(C_GOLD, .75 * (1 - out)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(G.x, G.y, G.r, a0, a0 + TAU * easeOut(q)); ctx.stroke();
    }
  }

  // system use: core to departments, faint until the light arrives
  LINKS.forEach((l, k) => {
    const pr = lerp(linkLv(prev, k, 99), linkLv(beat, k, tNow), mix);
    if (pr <= 0) return;
    const hot = hiDep.has(l.d) && hiCore.has(l.c), brk = breakAmt(k);
    if (brk > .5) brokenLine(P(l.c), P(l.d), rgba(C_BONE, .22), 1);
    else line(P(l.c), P(l.d), hot ? rgba(HOT, .8) : rgba(C_BONE, .08 * (1 - brk)), hot ? 1.3 : 1, pr);
  });
  VLINKS.forEach((l, k) => {
    const pr = lerp(vLinkLv(prev, k, 99), vLinkLv(beat, k, tNow), mix);
    if (pr <= 0) return;
    const hot = hiDep.has(l.d) && hiCore.has(VEN);
    const fresh = beat === 4 ? clamp(1 - (tNow - VS0 - k * .12 - .5) / 1.2) : 0;
    line(P(VEN), P(l.d), hot ? rgba(HOT, .8) : fresh > 0 ? rgba(C_GOLD, .25 + .6 * fresh) : rgba(C_BONE, .08), hot ? 1.3 : 1, pr);
  });

  // tethers: each tool to the department it orbits
  const tetherA = mixLv('tether');
  if (tetherA > .01) MOONS.forEach(m => {
    const hot = hiMoon.has(m);
    line(P(m.host), P(m), hot ? rgba(HOT, .85) : rgba(C_BONE, .2 * tetherA), 1);
  });

  // the two handoffs that cross the ring
  const fChord = compact ? MONO : "500 10px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
  CHORDS.forEach((ch, k) => {
    const pr = lerp(chordLv(prev, ch, 99), chordLv(beat, ch, tNow), mix);
    if (pr <= 0) return;
    const C = chordCtrl(ch), A = P(ch.a), B = P(ch.b);
    const brk = breakAmt(k + 3);
    const hot = sel && hiDep.has(ch.a) && hiDep.has(ch.b);
    if (brk > .5) { curve(A, C, B, rgba(C_BONE, .28), 1, 0, .28); curve(A, C, B, rgba(C_BONE, .28), 1, .72, 1); }
    else curve(A, C, B, hot ? rgba(C_BONE, .8) : rgba(C_BONE, .24 * (1 - brk)), 1.2, 0, pr);
    if (!compact) {
      const m = bez(A, C, B, ch.le);
      label(ch.name.toUpperCase(), m.x, m.y - 9, 'center', fChord, rgba(C_GRAPH, pr * labelFade * (1 - brk)));
    }
  });

  // the path the gold light is traveling
  if (seg && pulseA > .01) {
    if (seg.type === 'arc') {
      ctx.strokeStyle = rgba(C_GOLD, .8 * pulseA); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(G.x, G.y, G.r, seg.a0, seg.a1); ctx.stroke();
    } else curve(seg.A, seg.C, seg.B, rgba(C_GOLD, .8 * pulseA), 2, 0, seg.e);
  }

  // the logo's gold line reaches out and catches the new tool
  if (beat === 4 && !reduced) {
    const grab = clamp((tNow - (CAP0 - .35)) / .35), letGo = clamp((tNow - CAP1) / .5);
    if (grab > 0 && letGo < 1) {
      const v = P(VEN);
      line(G, v, rgba(C_GOLD, .9 * (1 - letGo)), 1.4, easeOut(grab));
      if (grab >= 1) { ctx.fillStyle = rgba(C_GOLD, .35 * (1 - letGo)); ctx.beginPath(); ctx.arc(v.x, v.y, 9, 0, TAU); ctx.fill(); }
    }
  }

  // logo, with a restrained gold ring in Momentum
  const hubA = mixLv('hub'), crown = mixLv('crown');
  const logoS = G.r * (compact ? .25 : .23) * (.7 + .3 * hubA);
  if (crown > .01) {
    const rr = logoS * .78;
    ctx.strokeStyle = rgba(C_GOLD_D, .5 * crown); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(G.x, G.y, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(C_GOLD, .9 * crown); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(G.x, G.y, rr, rot * 3 - .5, rot * 3 + .5); ctx.stroke();
  }
  if (hubA > .01) {
    ctx.save();
    ctx.globalAlpha = fade * hubA;
    ctx.translate(G.x - logoS / 2, G.y - logoS / 2); ctx.scale(logoS / 200, logoS / 200);
    ctx.fillStyle = '#F4F3F0'; ctx.fill(MARK, 'evenodd');
    ctx.restore();
  }

  // shockwave
  if (sHit > 0 && sHit < 1.2) {
    const I = impactPoint();
    ctx.fillStyle = rgba(C_BONE, .55 * Math.exp(-sHit * 7));
    ctx.beginPath(); ctx.arc(I.x, I.y, 14 + sHit * 30, 0, TAU); ctx.fill();
    [0, .16].forEach((d, j) => {
      const ss = sHit - d; if (ss <= 0 || ss > .95) return;
      ctx.strokeStyle = rgba(C_BONE, (1 - ss / .95) * (j ? .25 : .5)); ctx.lineWidth = j ? 1 : 1.6;
      ctx.beginPath(); ctx.arc(I.x, I.y, easeOut(ss / .95) * R * 1.5, 0, TAU); ctx.stroke();
    });
  }

  // nodes
  const fDep = compact ? '500 10px Archivo, Arial, sans-serif' : '500 12.5px Archivo, Arial, sans-serif';
  const fSys = compact ? '400 9.5px Archivo, Arial, sans-serif' : '400 10.5px Archivo, Arial, sans-serif';
  const fCore = compact ? '600 9.5px Archivo, Arial, sans-serif' : '600 11px Archivo, Arial, sans-serif';

  MOONS.forEach(m => {
    const p = P(m), hot = hiMoon.has(m), s = m.minor ? (compact ? 3.5 : 4.5) : (compact ? 5 : 6.5);
    ctx.fillStyle = hot ? HOT_HEX : '#0B0C0E';
    ctx.strokeStyle = hot ? HOT_HEX : rgba(C_BONE, .75); ctx.lineWidth = 1;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
    if (compact) return;
    const col = hot ? rgba(HOT, labelFade) : rgba(C_GRAPH, .9 * labelFade);
    if (beat === 0 && mix > .5 || prev === 0 && mix <= .5) label(m.name, p.x + 8, p.y, 'left', fSys, col);
    else { const h = P(m.host); radialAt(m.name, p, Math.atan2(p.y - h.y, p.x - h.x), 7, fSys, col); }
  });

  CORE.forEach(c => {
    const p = P(c), hot = hiCore.has(c), s = compact ? 8 : 10;
    ctx.fillStyle = hot ? HOT_HEX : '#0B0C0E';
    ctx.strokeStyle = hot ? HOT_HEX : rgba(C_BONE, .9); ctx.lineWidth = 1.4;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
    const col = hot ? rgba(HOT, labelFade) : rgba(C_BONE, .8 * labelFade);
    if (!ordered && (beat === 0 || prev === 0)) label(c.name, p.x + 9, p.y, 'left', fCore, col);
    else radialAt(c.name, p, dirFrom(c), 10, fCore, col);
  });

  if (venA > .01) { // the new tool: an asteroid, then debris, then part of the core
    const p = P(VEN), astro = beat === 4 && tNow < T_HIT && !reduced, loose = beat === 4 && tNow < CAP1;
    ctx.save(); ctx.globalAlpha = fade * venA;
    if (astro) {
      const I = impactPoint(), S = astroStart(), dx = I.x - S.x, dy = I.y - S.y, dl = Math.hypot(dx, dy) || 1;
      for (let j = 1; j <= 16; j++) {
        ctx.fillStyle = rgba(j < 5 ? C_BONE : C_GRAPH, .7 * (1 - j / 17));
        ctx.beginPath(); ctx.arc(p.x - dx / dl * j * 8, p.y - dy / dl * j * 8, Math.max(.6, 4 - j * .22), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = rgba(C_BONE, .14); ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#F4F3F0'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.6, 0, TAU); ctx.fill();
    } else {
      const s = compact ? 8 : 10, hot = hiCore.has(VEN);
      ctx.translate(p.x, p.y);
      if (loose && !reduced) ctx.rotate(tNow * 5 * (1 - cap));
      ctx.fillStyle = hot ? HOT_HEX : loose ? '#F4F3F0' : '#0B0C0E';
      ctx.strokeStyle = hot ? HOT_HEX : rgba(C_BONE, .9); ctx.lineWidth = 1.4;
      ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeRect(-s / 2, -s / 2, s, s);
    }
    ctx.restore();
    const txt = loose ? 'New tool' : compact ? VEN.short : VEN.name;
    const col = rgba(hiCore.has(VEN) ? HOT : C_BONE, venA * (loose ? 1 : .8 * labelFade));
    if (astro) label(txt, p.x - 14, p.y + 18, 'right', fSys, col);
    else radialAt(txt, p, dirFrom(VEN), 10, loose ? fSys : fCore, col);
  }

  DEP.forEach(n => {
    const p = P(n), r = compact ? 5 : 6.5, hot = hiDep.has(n);
    if (hot) { ctx.fillStyle = rgba(HOT, .2); ctx.beginPath(); ctx.arc(p.x, p.y, r + 6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = hot ? HOT_HEX : '#F4F3F0';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    const col = hot ? rgba(HOT, labelFade) : rgba(C_BONE, .92 * labelFade);
    if (!ordered) label(n.name, p.x + 10, p.y, 'left', fDep, col);
    else if (!compact) radialAt(n.name, p, dirFrom(n), RM + 12, fDep, col);
  });

  // the gold light itself
  if (pulsePos && pulseA > .01) {
    ctx.fillStyle = rgba(C_GOLD, .18 * pulseA);
    ctx.beginPath(); ctx.arc(pulsePos.x, pulsePos.y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C_GOLD, pulseA);
    ctx.beginPath(); ctx.arc(pulsePos.x, pulsePos.y, 3.6, 0, TAU); ctx.fill();
  }

  ctx.restore();

  // tip: selection first; on phones the light names each department as it passes
  let info = tipFor(sel);
  if (!info && compact && ordered && lit && pulseA > .5) info = tipFor(lit);
  setTip(info);

  rafId = requestAnimationFrame(frame);
}

fillCopy(0); updateNav();
rafId = requestAnimationFrame(frame);
})();
