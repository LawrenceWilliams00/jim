// Jim: a simple gym tracker. Plain JS, no build step. State lives in localStorage on this phone.
(function () {
'use strict';

const RAMPS = { 1: [[0.6, 6]], 2: [[0.5, 8], [0.75, 4]], 3: [[0.4, 8], [0.6, 5], [0.8, 3]], 4: [[0.3, 10], [0.5, 6], [0.7, 4], [0.85, 2]] };
const STEPS = [0.5, 1, 1.25, 2, 2.5, 5, 10];
const TYPES = ['Working set', 'Drop set', 'To failure'];
const STORE = 'jim.v3';
const STORE_SESSIONS = 'jim.v3.sessions';
const LETTERS = 'abcdefgh';

// ---------- helpers ----------
const $app = document.getElementById('app');
const r2 = n => Math.round(n * 100) / 100;
const fmt = k => String(r2(k));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const mmss = ms => { let t = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0'); };
const secTxt = s => mmss(s * 1000);
const range = (lo, hi) => (lo === hi ? String(lo) : lo + '–' + hi);
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const isOpen = s => s && !s.done && !s.skipped;
const clone = o => JSON.parse(JSON.stringify(o));
const norm = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
const uid = p => p + now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dateTxt = t => { const d = new Date(t); return d.toLocaleDateString('en-NZ', { weekday: 'short' }) + ' ' + d.getDate() + ' ' + d.toLocaleDateString('en-NZ', { month: 'short' }); };
const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  grip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
  chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:.7"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  dn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  minus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  timer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  later: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h6"/><path d="M17 14v6m0 0l-3-3m3 3l3-3"/></svg>',
  del: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z"/><path d="M13 9l4 6M17 9l-4 6"/></svg>',
};

// ---------- state ----------
let S = { exercises: {}, routines: [], plans: [], weights: [], waists: [], sessions: [], settings: { sound: true, rangeMode: true }, cur: null };
const UI = { screen: 'today', sheet: null, toast: null, sel: null, editId: null, confirm: null, scrollToCard: false, lastLog: null, summary: null };
(function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const o = JSON.parse(raw);
      S = Object.assign(S, o);
      S.exercises = o.exercises || {};
      S.plans = Array.isArray(o.plans) ? o.plans : [];
      S.weights = Array.isArray(o.weights) ? o.weights : [];
      S.waists = Array.isArray(o.waists) ? o.waists : [];
      S.settings = Object.assign({ sound: true, rangeMode: true }, o.settings || {});
    }
    const rs = localStorage.getItem(STORE_SESSIONS);
    S.sessions = rs ? JSON.parse(rs) : [];
  } catch (e) { /* storage blocked: start fresh */ }
})();

// ---------- exercise library + migration from name-based data ----------
const exById = id => S.exercises[id];
const exName = id => (S.exercises[id] && S.exercises[id].name) || 'Untitled exercise';
function slug(n) { return (norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled-exercise').slice(0, 60); }
function findByName(n) { const k = norm(n); return Object.values(S.exercises).find(x => norm(x.name) === k); }
function ensureEx(name, step) {
  const nm = String(name || '').trim() || 'Untitled exercise';
  const found = findByName(nm); if (found) return found;
  let id = 'x-' + slug(nm); if (S.exercises[id]) id = id + '-' + Math.random().toString(36).slice(2, 6);
  const ex = { id, name: nm, step: step || 2.5, notes: '', updatedAt: 0 }, eq = guessEquip(nm);
  if (eq) { ex.equip = eq; if (eq === 'barbell') ex.bar = 20; }
  S.exercises[id] = ex; return ex;
}
// A routine with nothing in it and no name of its own was never really made (New routine, then straight back out).
function blankRoutine(r) { return !!r && !(r.blocks || []).length && (!String(r.name || '').trim() || r.name === 'Untitled routine'); }
function migrate() {
  const dirtyR = new Set(), dirtyX = new Set(), dirtyS = new Set();
  const before = new Set(Object.keys(S.exercises));
  const slot = (s, r) => { if (s.exId) return; const ex = ensureEx(s.name, s.step); s.exId = ex.id; if (s.range == null) s.range = (s.hi || s.lo) !== s.lo; delete s.name; delete s.eq; delete s.step; dirtyR.add(r); };
  S.routines.forEach(r => (r.blocks || []).forEach(b => { if (b.kind === 'lift') slot(b, r); else if (b.kind === 'ss') (b.parts || []).forEach(p => slot(p, r)); }));
  const lifts = sess => { let d = false; (sess.blocks || []).forEach(b => (b.kind === 'ss' ? b.parts : b.kind === 'lift' ? [b] : []).forEach(l => { if (!l.exId) { const ex = ensureEx(l.name, l.step); l.exId = ex.id; l.key = ex.id; l.name = ex.name; delete l.eq; d = true; } })); return d; };
  S.sessions.forEach(s => { if (lifts(s)) dirtyS.add(s); }); if (S.cur) lifts(S.cur);
  if (S.notes) { Object.entries(S.notes).forEach(([k, v]) => { const ex = findByName(k); if (ex && v && !ex.notes) { ex.notes = v; dirtyX.add(ex.id); } }); delete S.notes; }
  let settings = false; if (S.settings.rest) { delete S.settings.rest; settings = true; }
  ['ui', 'look', 'opt'].forEach(k => { if (S.settings[k]) { delete S.settings[k]; settings = true; } }); // left over from trying layouts
  if (!S.settings.equipGuessed) { Object.values(S.exercises).forEach(x => { if (x.equip) return; const g = guessEquip(x.name); if (g) { x.equip = g; if (g === 'barbell' && x.bar == null) x.bar = 20; dirtyX.add(x.id); } }); S.settings.equipGuessed = 1; settings = true; }
  if (S.routines.some(blankRoutine)) { S.routines = S.routines.filter(r => !blankRoutine(r)); settings = true; } // older versions kept these
  Object.keys(S.exercises).forEach(id => { if (!before.has(id)) dirtyX.add(id); });
  return { routines: [...dirtyR], exercises: [...dirtyX], sessions: [...dirtyS], settings };
}
migrate();
if (S.cur && now() - (S.cur.updatedAt || 0) < 6 * 3600 * 1000) UI.screen = 'train';

const routinesSorted = () => S.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
const routineById = id => S.routines.find(r => r.id === id);
// Plans are folders of routines. The one you're using (settings.plan) runs Today: Next up rotates through its routines.
const plansSorted = () => (S.plans || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
const planById = id => (id && (S.plans || []).find(p => p.id === id)) || null;
const activePlan = () => planById(S.settings.plan);
const planOf = r => (r && r.planId && planById(r.planId) ? r.planId : null);
const routinesIn = pid => routinesSorted().filter(r => planOf(r) === (pid || null));
const nextOrder = list => Math.max(0, ...list.map(x => x.order || 0)) + 1;
function savePlan(pl) { pl.updatedAt = now(); saveLocal(); }
function suggestedRoutine() {
  const ap = activePlan(), inPlan = ap ? routinesIn(ap.id) : [], rs = inPlan.length ? inPlan : routinesSorted(); if (!rs.length) return null;
  const last = sortedSessions().find(s => rs.some(r => r.id === s.routineId)); if (!last) return rs[0];
  return rs[(rs.findIndex(r => r.id === last.routineId) + 1) % rs.length];
}
function slotsOf(r) { const out = []; (r.blocks || []).forEach(b => { if (b.kind === 'lift') out.push(b); else if (b.kind === 'ss') (b.parts || []).forEach(p => out.push(p)); }); return out; }

// ---------- history (shared by exercise across routines) ----------
function sortedSessions() { return S.sessions.slice().sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)); }
function liftsOf(sess) { const out = []; (sess.blocks || []).forEach(b => { if (b.kind === 'lift') out.push(b); else if (b.kind === 'ss') b.parts.forEach(p => out.push(p)); }); return out; }
function lastFor(exId, lo, hi) {
  let any = null;
  for (const s of sortedSessions()) for (const b of liftsOf(s)) {
    if (b.exId !== exId) continue;
    const work = b.sets.filter(x => x.kind === 'work'), done = work.filter(x => x.done);
    if (!done.length) continue;
    const rec = { at: s.endedAt, sets: done, all: work, kg: Math.max(...done.map(x => x.kg || 0)), allTop: work.every(x => x.done && x.reps >= b.hi), same: b.lo === lo && b.hi === hi };
    if (rec.same) return rec;
    if (!any) any = rec;
  }
  return any;
}
function historyFor(exId, n) {
  const out = [];
  for (const s of sortedSessions()) for (const b of liftsOf(s)) if (b.exId === exId) { const d = b.sets.filter(x => x.kind === 'work' && x.done); if (d.length) out.push({ at: s.endedAt, sets: d, name: s.name }); }
  return out.slice(0, n || 6);
}
const e1 = (reps, kg) => (kg || 0) * (1 + reps / 30);

// ---------- building a session ----------
function workKg(b) { const w = b.sets.find(y => y.kind === 'work'); return w ? w.kg : null; }
// Warm-ups, worked out from the working weight W (the first working set), not a 1-rep max:
// barbell lifts start with the empty bar; the rest climb evenly to a last warm-up that's closer for heavier, low-rep work
// (85% of W for up to 6 reps, 80% to 8, 75% to 12, 70% above); reps fall as the weight climbs; a warm-up never repeats
// a weight or reaches W, so light lifts get fewer. Bodyweight lifts get easy sets.
function warmPlan(W, n, lo, step, bar) {
  if (!n || W == null) return [];
  if (W === 0) return Array.from({ length: n }, () => ({ kg: 0, reps: Math.max(3, lo - 2), frac: 'easy' }));
  const top = W * (lo <= 6 ? 0.85 : lo <= 8 ? 0.8 : lo <= 12 ? 0.75 : 0.7);
  const start = bar || W * (n === 1 ? 0.6 : n === 2 ? 0.5 : 0.4);
  const aims = n === 1 ? [bar ? Math.max(bar, Math.min(W * 0.6, top)) : Math.min(start, top)] : Array.from({ length: n }, (_, k) => start + (top - start) * k / (n - 1));
  const gap = Math.max(step, W * 0.08), out = [];
  aims.forEach(v => {
    const kg = bar && v === bar ? bar : r2(Math.round(v / step) * step);
    if (kg <= 0 || kg >= W || (out.length && kg < out[out.length - 1].kg + gap)) return;
    const f = kg / W;
    out.push({ kg, reps: bar && kg === bar ? 10 : f <= 0.5 ? 6 : f <= 0.65 ? 4 : f <= 0.8 ? 3 : 2, frac: bar && kg === bar ? 'bar' : f });
  });
  return out;
}
// Auto warm-ups follow the working weight. While none of the block is done they're rebuilt outright (a light weight
// can mean fewer); after that only the ones still to do are updated in place.
function refreshWarm(b) {
  if (b.kind !== 'lift' || b.warmAuto === false) return;
  const warms = b.sets.filter(x => x.kind === 'warm'), n = b.warmN != null ? b.warmN : warms.length, W = workKg(b);
  if (!n || W == null) return;
  const plan = warmPlan(W, n, b.lo, b.step, b.bar || 0);
  if (b.sets.every(x => isOpen(x) && !(x.kind === 'warm' && x.touched))) { b.sets = plan.map(p => ({ kind: 'warm', frac: p.frac, reps: p.reps, kg: p.kg, done: false, skipped: false, touched: false })).concat(b.sets.filter(x => x.kind !== 'warm')); return; }
  warms.forEach((x, k) => { if (isOpen(x) && !x.touched && plan[k]) Object.assign(x, plan[k]); });
}
// Last time's warm-ups for an exercise, for warm-ups you set yourself.
function lastWarmFor(exId) { for (const s of sortedSessions()) for (const b of liftsOf(s)) if (b.exId === exId) { const d = b.sets.filter(x => x.kind === 'warm' && x.done); if (d.length) return d; } return []; }
// Equipment, guessed from an exercise's name when it's clear; it's a setting you can change or clear.
const EQUIP = { barbell: 'Barbell', dumbbell: 'Dumbbells', machine: 'Machine', bodyweight: 'Bodyweight' };
function guessEquip(name) {
  const n = norm(name);
  if (/\b(split squats?|lunges?|step-?ups?|goblet)\b/.test(n)) return /\b(barbell|bb)\b/.test(n) ? 'barbell' : /\b(db|dumbbells?|goblet)\b/.test(n) ? 'dumbbell' : undefined;
  if (/\b(db|dumbbells?|kettlebells?|kb)\b/.test(n)) return 'dumbbell';
  if (/\b(barbell|bb)\b/.test(n)) return 'barbell';
  if (/\b(machine|cable|smith|pulldowns?|pushdowns?|leg press|leg extensions?|leg curls?|hack squats?|pec deck|abductions?|adductions?|chest press|seated rows?)\b/.test(n)) return 'machine';
  if (/\b(pull-?ups?|chin-?ups?|push-?ups?|dips?|glute ham raises?|ghr|nordic curls?|inverted rows?|hanging leg raises?|planks?|sit-?ups?)\b/.test(n)) return 'bodyweight';
  if (/\b(bench press|back squats?|front squats?|squats?|deadlifts?|rdls?|overhead press|ohp|military press|bent[- ]over rows?|pendlay rows?|hip thrusts?|good mornings?)\b/.test(n)) return 'barbell';
  return undefined;
}
function liftBlock(slot, ssRest, src) {
  const ex = exById(slot.exId) || { id: slot.exId, name: 'Untitled exercise', step: 2.5 };
  const step = ex.step || 2.5, lo = slot.lo || 8, hi = slot.range ? Math.max(lo, slot.hi || lo) : lo;
  const n = clamp(slot.sets || 3, 1, 12);
  const last = lastFor(ex.id, lo, hi);
  let kg = null, reps = [];
  if (last) { kg = last.same && last.allTop ? r2(last.kg + step) : last.kg; reps = last.same && !last.allTop ? last.sets.map(x => x.reps) : []; }
  const b = { kind: 'lift', exId: ex.id, key: ex.id, name: ex.name, step, lo, hi, rest: ssRest != null ? ssRest : (slot.rest != null ? slot.rest : 90), src, sets: [] };
  // Equipment: barbell warm-ups start at the bar; a bodyweight lift starts at bodyweight rather than asking for a weight.
  if (kg == null && ex.equip === 'bodyweight') kg = 0;
  // No warm-ups inside a superset: its rounds pair sets up by position.
  const w = ssRest != null ? 0 : clamp(slot.warm || 0, 0, 4), auto = slot.warmMode !== 'manual', was = auto ? [] : lastWarmFor(ex.id);
  Object.assign(b, { warmN: w, warmAuto: auto, bar: ex.equip === 'barbell' ? (ex.bar != null ? ex.bar : 20) : 0, equip: ex.equip || null });
  for (let i = 0; i < w; i++) b.sets.push({ kind: 'warm', frac: auto ? null : 'manual', reps: was[i] ? was[i].reps : RAMPS[w][i][1], kg: was[i] ? was[i].kg : null, done: false, skipped: false, touched: false });
  for (let i = 0; i < n; i++) b.sets.push({ kind: 'work', reps: reps[i] != null ? reps[i] : (reps.length ? reps[reps.length - 1] : lo), kg, done: false, skipped: false, touched: false, type: 0 });
  refreshWarm(b);
  return b;
}
function checkBlock(bl) {
  const items = (bl.items || []).filter(it => String(it.text || '').trim()).map(it => ({ text: it.text.trim(), detail: it.detail || '', timer: it.timer ? Math.round(it.timer * 60) : 0, ticks: Array(clamp(it.ticks || 1, 1, 6)).fill(false) }));
  const mins = items.reduce((a, it) => a + (it.timer ? it.timer / 60 : 0.75 * it.ticks.length), 0);
  return { kind: 'check', name: String(bl.name || '').trim() || 'Checklist', sub: items.length ? 'About ' + Math.max(1, Math.round(mins)) + ' min' : '', items, done: false, skipped: false };
}
function makeSession(r) {
  const blocks = [];
  (r.blocks || []).forEach((bl, bi) => {
    if (bl.kind === 'check') blocks.push(checkBlock(bl));
    else if (bl.kind === 'ss') { const parts = (bl.parts || []).map((p, pi) => liftBlock(p, bl.rest != null ? bl.rest : 90, { rid: r.id, bi, p: pi })); if (parts.length) blocks.push({ kind: 'ss', rest: bl.rest != null ? bl.rest : 90, src: { rid: r.id, bi }, parts }); }
    else blocks.push(liftBlock(bl, null, { rid: r.id, bi }));
  });
  return { id: uid('s'), routineId: r.id, name: String(r.name || '').trim() || 'Workout', startedAt: now(), blocks, rest: null, over: null, pick: null, fix: null, cardio: null, updatedAt: now() };
}
function estimateMin(r) {
  let s = 0;
  (r.blocks || []).forEach(b => {
    if (b.kind === 'check') s += (b.items || []).reduce((a, it) => a + (it.timer ? it.timer * 60 : 45 * (it.ticks || 1)), 0);
    else if (b.kind === 'ss') { const R = Math.max(1, ...(b.parts || []).map(p => p.sets || 1)); s += R * ((b.parts || []).length * 45 + (b.rest || 0)); }
    else s += (b.sets || 1) * (45 + (b.rest || 0)) + (b.warm || 0) * 60;
  });
  return Math.max(5, Math.round(s / 300) * 5);
}
function routineSummary(r) { const n = slotsOf(r).length; return n ? plural(n, 'exercise') + ', about ' + estimateMin(r) + ' min' : 'No exercises yet'; }
const repsTxt = s => (s.range ? range(s.lo, Math.max(s.lo, s.hi || s.lo)) : String(s.lo));

// ---------- position in the workout ----------
function nextOpen(cur) {
  if (!cur) return null;
  for (let bi = 0; bi < cur.blocks.length; bi++) {
    const b = cur.blocks[bi];
    if (b.kind === 'check') { if (!b.done && !b.skipped) return { bi }; continue; }
    if (b.kind === 'lift') { const i = b.sets.findIndex(isOpen); if (i >= 0) return { bi, i }; continue; }
    if (cur.pick && cur.pick.bi === bi && b.parts[cur.pick.p]) { const i = b.parts[cur.pick.p].sets.findIndex(isOpen); if (i >= 0) return { bi, p: cur.pick.p, i }; }
    const R = Math.max(...b.parts.map(p => p.sets.length));
    for (let r = 0; r < R; r++) for (let p = 0; p < b.parts.length; p++) if (isOpen(b.parts[p].sets[r])) return { bi, p, i: r };
  }
  return null;
}
const liftAt = (cur, pos) => { const b = cur.blocks[pos.bi]; return b.kind === 'ss' ? b.parts[pos.p] : b; };
const target = cur => (cur && cur.fix) || nextOpen(cur);
const blockTitle = b => (b.kind === 'ss' ? b.parts.map(p => p.name).join(' + ') : b.name);

// ---------- weight text ----------
const kgVal = kg => (kg == null ? '—' : kg === 0 ? 'BW' : fmt(kg));
const setTxt = x => x.reps + ' × ' + kgVal(x.kg);
const unit = kg => (kg ? ' kg' : '');
function compare(b, x, idx) {
  const last = lastFor(b.exId, b.lo, b.hi);
  if (!last) return { txt: 'first time', good: false };
  const lw = last.all.filter(y => y.done)[idx];
  if (!lw) return { txt: 'a new set', good: false };
  const dk = r2((x.kg || 0) - (lw.kg || 0)), dr = x.reps - lw.reps;
  if (dk > 0) return { txt: '+' + fmt(dk) + ' kg' + (dr > 0 ? ', +' + plural(dr, 'rep') : dr < 0 ? ', ' + plural(-dr, 'rep') + ' short' : ''), good: dr >= 0 };
  if (dk < 0) return { txt: '−' + fmt(-dk) + ' kg on last time', good: false };
  if (dr > 0) return { txt: '+' + plural(dr, 'rep') + ' on last time', good: true };
  if (dr === 0) return { txt: 'same as last time', good: false };
  return { txt: plural(-dr, 'rep') + ' short of last time', good: false };
}

// ---------- saving (everything stays on this phone; sessions kept in their own key so a tap doesn't rewrite all history) ----------
function saveLocal() {
  try { const core = Object.assign({}, S); delete core.sessions; localStorage.setItem(STORE, JSON.stringify(core)); }
  catch (e) { storageFull(); }
}
function saveSessionsLocal() { try { localStorage.setItem(STORE_SESSIONS, JSON.stringify(S.sessions)); } catch (e) { storageFull(); } }
function storageFull() { if (!storageFull.told) { storageFull.told = true; toast('Couldn’t save on this phone. Back up now.'); } }
function touchCur() { if (S.cur) S.cur.updatedAt = now(); saveLocal(); }
function saveSettings() { saveLocal(); }
function saveRoutine(r) { r.updatedAt = now(); saveLocal(); }
function saveEx(ex) { ex.updatedAt = now(); saveLocal(); }
function removeRoutineStore() { saveLocal(); }
function saveSession() { saveLocal(); saveSessionsLocal(); }
function deleteSession(id) { S.sessions = S.sessions.filter(s => s.id !== id); saveSessionsLocal(); }

// ---------- backup ----------
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function backupFile() {
  const data = { app: 'jim', version: 3, exportedAt: now(), exercises: S.exercises, routines: S.routines, plans: S.plans, weights: S.weights, waists: S.waists, sessions: S.sessions, settings: S.settings };
  return new File([JSON.stringify(data)], 'jim-backup-' + ymd(new Date()) + '.json', { type: 'application/json' });
}
const canShareFile = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [backupFile()] })); } catch (e) { return false; } };
function markBackedUp() { S.settings.lastBackup = now(); saveSettings(); UI.sheet = null; render(); toast('Backed up.'); }
// Merges a backup into what's here: anything missing is added, and where both have it the newer copy wins.
function restoreFrom(o) {
  if (!o || typeof o !== 'object' || o.app !== 'jim') throw new Error('not a Jim backup');
  const stamp = x => x.updatedAt || x.endedAt || 0;
  const merge = (local, incoming) => { const by = new Map(local.map(x => [x.id, x])); let added = 0; (incoming || []).forEach(x => { if (!x || !x.id) return; const l = by.get(x.id); if (!l) added++; if (!l || stamp(x) > stamp(l)) by.set(x.id, x); }); return [[...by.values()], added]; };
  const [xs] = merge(Object.values(S.exercises), Object.values(o.exercises || {}));
  const [rs, nr] = merge(S.routines, o.routines);
  const [ps, np] = merge(S.plans || [], o.plans); S.plans = ps;
  const [wts, nw] = merge(S.weights || [], o.weights); S.weights = wts;
  const [wai, nwa] = merge(S.waists || [], o.waists); S.waists = wai;
  if (!activePlan() && o.settings && planById(o.settings.plan)) S.settings.plan = o.settings.plan;
  const [ss, ns] = merge(S.sessions, o.sessions);
  S.exercises = Object.fromEntries(xs.map(x => [x.id, x])); S.routines = rs; S.sessions = ss;
  if (o.notes) S.notes = o.notes;
  migrate(); saveLocal(); saveSessionsLocal();
  return { plans: np, routines: nr, sessions: ns, weights: nw, waists: nwa };
}

// ---------- sound + screen ----------
let actx = null, wake = null;
function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } }
function beep() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* no vibration */ }
  if (!S.settings.sound || !actx) return;
  try { if (actx.state !== 'running') actx.resume(); } catch (e) { /* stays asleep */ }
  try { [0, 0.22].forEach(t => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.16); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.18); }); } catch (e) { /* audio blocked */ }
}
async function keepAwake() { if (!S.cur || wake || !('wakeLock' in navigator)) return; try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch (e) { wake = null; } }
function letSleep() { try { if (wake) wake.release(); } catch (e) { /* already released */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); tick(); } });

// ---------- training ----------
function toast(text, act) {
  clearTimeout(toast.t); UI.toast = { text, act: act || null }; render();
  toast.t = setTimeout(dropToast, act ? 5000 : 3000);
}
function dropToast() { clearTimeout(toast.t); UI.toast = null; const el = document.querySelector('.toast'); if (el) el.remove(); }
function edit(fn) { const c = S.cur, t = target(c); if (!t) return; const b = liftAt(c, t), x = b.sets[t.i]; fn(x, b); x.touched = true; refreshWarm(b); touchCur(); render(); }
function needsWork() { const c = S.cur, t = target(c); if (!t || c.blocks[t.bi].kind === 'check') return false; const b = liftAt(c, t), x = b.sets[t.i]; return x.kind === 'warm' && x.kg == null && b.warmAuto !== false; }
function logSet() {
  const c = S.cur; if (!c) return;
  if (c.fix) { c.fix = null; touchCur(); render(); return; }
  const t = nextOpen(c); if (!t) return;
  const b = liftAt(c, t), x = b.sets[t.i], blk = c.blocks[t.bi];
  if (x.kg == null) { openSheet({ type: 'pad', field: 'kg', buf: '', work: needsWork() }); return; }
  x.done = true; x.skipped = false; x.at = now();
  if (x.kind === 'work') for (let j = t.i + 1; j < b.sets.length; j++) { const y = b.sets[j]; if (isOpen(y) && !y.touched && y.kind === 'work') { y.reps = x.reps; y.kg = x.kg; } }
  refreshWarm(b);
  c.over = null; c.pick = null; UI.lastLog = t;
  let rest;
  if (blk.kind === 'ss') rest = blk.parts.some((p, pi) => pi !== t.p && isOpen(p.sets[t.i])) ? 0 : blk.rest;
  else if (x.kind === 'warm') rest = b.sets.slice(t.i + 1).some(y => y.kind === 'warm' && isOpen(y)) ? 0 : Math.min(120, b.rest);
  else rest = b.rest;
  if (!nextOpen(c)) { finish(); return; }
  if (rest > 0) { c.rest = { endsAt: now() + rest * 1000, total: rest, from: t }; UI.toast = null; touchCur(); render(); return; }
  c.rest = null; UI.scrollToCard = true; touchCur(); render();
}
// Start fixing a logged set, remembering what it was so Cancel can put it back.
function fixSet(pos) {
  const x = liftAt(S.cur, pos).sets[pos.i];
  S.cur.fix = Object.assign({}, pos, { was: { reps: x.reps, kg: x.kg, type: x.type || 0, touched: !!x.touched } });
}
const padParent = () => (UI.sheet && UI.sheet.type === 'change' ? UI.sheet : null);
function skipSet() {
  const c = S.cur, t = nextOpen(c); if (!t) return;
  const b = c.blocks[t.bi];
  if (b.kind === 'check') b.skipped = true; else liftAt(c, t).sets[t.i].skipped = true;
  c.over = null; c.pick = null; touchCur();
  if (!nextOpen(c)) { finish(); return; }
  UI.scrollToCard = true; render();
}
function closeCur(endAt) {
  const c = S.cur;
  c.blocks.forEach(b => { if (b.kind === 'check') { if (!b.done) b.skipped = true; } else (b.kind === 'ss' ? b.parts : [b]).forEach(p => p.sets.forEach(x => { if (isOpen(x)) x.skipped = true; })); });
  const sess = { id: c.id, routineId: c.routineId, name: c.name, startedAt: c.startedAt, endedAt: endAt, blocks: c.blocks, updatedAt: now() };
  S.sessions = S.sessions.filter(s => s.id !== sess.id).concat([sess]);
  S.cur = null; return sess;
}
// A workout left open for 12 hours was forgotten: keep it if anything was logged, otherwise drop it.
function settleStale() {
  const c = S.cur; if (!c || now() - (c.updatedAt || 0) < 12 * 3600 * 1000) return;
  const logged = liftsOf(c).some(b => b.sets.some(x => x.done)) || c.blocks.some(b => b.kind === 'check' && b.done);
  if (logged) { closeCur(c.updatedAt || now()); saveSession(); }
  else { const ids = liftsOf(c).map(b => b.exId); S.cur = null; pruneEx(ids); }
  if (UI.screen === 'train') UI.screen = 'today';
  touchCur();
}
function finish() {
  const c = S.cur; if (!c) return;
  const sess = closeCur(now());
  UI.summary = sess; UI.screen = 'summary'; UI.sheet = null; UI.sel = null; UI.toast = null; UI.lastLog = null;
  letSleep(); saveSession(); touchCur(); render();
}
function startWorkout(r) {
  unlockAudio();
  const cur = makeSession(r);
  if (!cur.blocks.length) { toast('This routine is empty.'); return; }
  S.cur = cur; UI.screen = 'train'; UI.sheet = null; UI.lastLog = null; UI.toast = null; UI.showWarm = false;
  touchCur(); keepAwake(); render();
}
function slotFromSrc(src) { const r = src && routineById(src.rid); const bl = r && r.blocks[src.bi]; if (!bl) return null; return { r, bl }; }

// ---------- routine editing ----------
const curRoutine = () => routineById(UI.editId);
function openSheet(sh) { UI.sheet = sh; UI.confirm = null; render(); }
function sheetBlock() { const r = curRoutine(), sh = UI.sheet; return r && sh && r.blocks[sh.bi]; }
function sheetSlot() { const bl = sheetBlock(), sh = UI.sheet; if (!bl) return null; return sh.p != null ? (bl.parts || [])[sh.p] : bl; }
function slotDefaults(exId) {
  for (const r of S.routines) for (const s of slotsOf(r)) if (s.exId === exId) return { sets: s.sets, lo: s.lo, hi: s.hi, range: !!s.range, rest: s.rest != null ? s.rest : 90, warm: s.warm || 0, warmMode: s.warmMode };
  const rm = S.settings.rangeMode !== false;
  return { sets: 3, lo: rm ? 8 : 10, hi: rm ? 12 : 10, range: rm, rest: 90, warm: 0 };
}
function exUsage(exId) { return S.routines.filter(r => slotsOf(r).some(s => s.exId === exId)).map(r => r.name || 'Untitled routine'); }
function changed() { const r = curRoutine(); if (r) saveRoutine(r); render(); }
function snapshot() { return { block: clone(sheetBlock()), exercises: clone(S.exercises) }; }
function blockExIds(bl) { return !bl ? [] : bl.kind === 'lift' ? [bl.exId] : bl.kind === 'ss' ? (bl.parts || []).map(p => p.exId) : []; }
function pruneEx(ids) {
  const gone = [];
  ids.forEach(id => {
    const ex = S.exercises[id]; if (!ex || ex.notes) return;
    if (S.routines.some(r => slotsOf(r).some(s => s.exId === id))) return;
    if (S.sessions.some(s => liftsOf(s).some(b => b.exId === id)) || (S.cur && liftsOf(S.cur).some(b => b.exId === id))) return;
    gone.push(ex); delete S.exercises[id];
  });
  saveLocal(); return gone;
}
function restoreExercises(snapEx) {
  const added = Object.keys(S.exercises).filter(id => !snapEx[id]);
  Object.values(snapEx).forEach(x => { const c = S.exercises[x.id]; if (!c || c.name !== x.name || c.step !== x.step || (c.notes || '') !== (x.notes || '')) { S.exercises[x.id] = x; saveEx(x); } });
  return added;
}
function restoreSnap(sh) { const r = curRoutine(); if (!r || !sh.snap) return; const was = blockExIds(r.blocks[sh.bi]); r.blocks[sh.bi] = sh.snap.block; pruneEx(restoreExercises(sh.snap.exercises).concat(was)); }

// ---------- a routine from pasted JSON ----------
// Forgiving on purpose: it'll usually come from an AI chat or a notes app, so code fences, chatter around the JSON,
// curly quotes and trailing commas are all fine, and the field names can vary ("reps": "6-8", "rest": "2 min", …).
const PASTE_PLAN_EXAMPLE = JSON.stringify({
  plan: 'Push Pull Legs',
  routines: [
    { name: 'Push', items: [{ exercise: 'Bench press', equipment: 'barbell', sets: 4, reps: '4-6', rest: 180, warmups: 3 }, { exercise: 'Incline dumbbell press', equipment: 'dumbbell', sets: 3, reps: '8-12', rest: 120 }, { superset: [{ exercise: 'Lateral raise', sets: 3, reps: '12-15' }, { exercise: 'Triceps pushdown', sets: 3, reps: '10-12' }], rest: 90 }] },
    { name: 'Pull', items: [{ exercise: 'Deadlift', equipment: 'barbell', sets: 3, reps: '3-5', rest: 180, warmups: 3 }, { exercise: 'Lat pulldown', equipment: 'machine', sets: 3, reps: '8-12', rest: 120 }, { exercise: 'Curl', sets: 3, reps: '10-12', rest: 60 }] },
    { name: 'Legs', items: [{ checklist: 'Warm-up', items: [{ text: 'Bike', timer: 5 }] }, { exercise: 'Back squat', equipment: 'barbell', sets: 3, reps: '5-8', rest: 180, warmups: 4 }, { exercise: 'Leg curl', equipment: 'machine', sets: 3, reps: '10-12', rest: 90 }] },
  ],
}, null, 2);
const PASTE_EXAMPLE = JSON.stringify({
  name: 'Push day',
  items: [
    { checklist: 'Warm-up', items: [{ text: 'Easy bike', timer: 5 }, 'Band pull-aparts | 2 × 15'] },
    { exercise: 'Bench press', sets: 4, reps: '4-6', rest: '3:00', warmups: 3, notes: 'Pause the first rep' },
    { exercise: 'Incline dumbbell press', sets: 3, reps: '8-12', rest: 120 },
    { superset: [{ exercise: 'Lateral raise', sets: 3, reps: '12-15' }, { exercise: 'Triceps pushdown', sets: 3, reps: '10-12' }], rest: 90 },
  ],
}, null, 2);
const firstOf = (x, keys) => { for (const k of keys) if (x[k] != null && x[k] !== '') return x[k]; return null; };
const numOf = v => { if (typeof v === 'number') return isFinite(v) ? v : null; const m = String(v == null ? '' : v).match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
// Rest in seconds. Plain numbers follow the editor's rule: 9 or less is minutes, more is seconds.
function restFrom(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return clamp(Math.round(v <= 9 ? v * 60 : v), 0, 600);
  const s = String(v).toLowerCase(), mm = s.match(/(\d+):(\d{2})/);
  if (mm) return clamp(+mm[1] * 60 + +mm[2], 0, 600);
  const ns = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number); if (!ns.length) return null;
  const n = ns[ns.length - 1]; // "2-3 min": the top of the range
  return clamp(Math.round(/\d\s*m(?:in|ins|inute|inutes)?\b/.test(s) ? n * 60 : /\d\s*s(?:ec|ecs|econd|econds)?\b/.test(s) ? n : n <= 9 ? n * 60 : n), 0, 600);
}
function liftFrom(x, label) {
  if (typeof x === 'string') x = { exercise: x };
  const nm = String(firstOf(x, ['exercise', 'name', 'title', 'exercise_name', 'exerciseName', 'movement']) || (x.exId && S.exercises[x.exId] && S.exercises[x.exId].name) || '').trim();
  if (!nm) throw new Error(label + ' has no exercise name.');
  const p = { name: nm }, sets = numOf(firstOf(x, ['sets', 'set_count', 'setCount', 'rounds']));
  if (sets != null) p.sets = clamp(Math.round(sets), 1, 12);
  const reps = firstOf(x, ['reps', 'rep', 'rep_range', 'repRange', 'repetitions']);
  const lo = numOf(firstOf(x, ['lo', 'min', 'reps_min', 'repsMin', 'min_reps', 'minReps'])), hi = numOf(firstOf(x, ['hi', 'max', 'reps_max', 'repsMax', 'max_reps', 'maxReps']));
  const rm = reps == null ? null : String(reps).match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/i);
  if (rm) Object.assign(p, { lo: +rm[1], hi: Math.max(+rm[1], +rm[2]), range: +rm[2] > +rm[1] });
  else if (numOf(reps) != null) Object.assign(p, { lo: Math.round(numOf(reps)), hi: Math.round(numOf(reps)), range: false });
  else if (lo != null) Object.assign(p, { lo: Math.round(lo), hi: Math.round(Math.max(lo, hi == null ? lo : hi)), range: hi != null && hi > lo });
  if (p.lo != null) { p.lo = clamp(p.lo, 1, 100); p.hi = clamp(p.hi, p.lo, 100); }
  if (typeof x.range === 'boolean' && p.lo != null) p.range = x.range && p.hi > p.lo;
  const rest = restFrom(firstOf(x, ['rest', 'rest_seconds', 'restSeconds', 'rest_sec', 'restSec', 'rest_time', 'restTime']));
  if (rest != null) p.rest = rest;
  const warm = numOf(firstOf(x, ['warmups', 'warm_ups', 'warmUps', 'warmup_sets', 'warmupSets', 'warm', 'warmup']));
  if (warm != null) p.warm = clamp(Math.round(warm), 0, 4);
  const eq = String(firstOf(x, ['equipment', 'equip']) || '').toLowerCase();
  p.equip = /bar ?bell|^bb$|^bar$/.test(eq) ? 'barbell' : /dumb ?bell|^db$|kettle/.test(eq) ? 'dumbbell' : /machine|cable|smith/.test(eq) ? 'machine' : /body|^bw$/.test(eq) ? 'bodyweight' : undefined;
  const bar = numOf(firstOf(x, ['bar', 'bar_weight', 'barWeight'])); if (bar != null) { p.bar = clamp(bar, 0, 50); p.equip = p.equip || 'barbell'; }
  const wm = String(firstOf(x, ['warmup_mode', 'warmupMode', 'warmup_weights']) || '').toLowerCase();
  if (wm === 'manual' || x.manual_warmups === true || x.auto_warmups === false) p.warmMode = 'manual';
  const notes = firstOf(x, ['notes', 'note', 'cues', 'cue']); if (notes != null) p.notes = String(notes);
  const step = numOf(firstOf(x, ['step', 'increment', 'kg_step'])); if (step) p.step = clamp(step, 0.25, 50);
  return p;
}
function checkItemFrom(x) {
  if (typeof x === 'string') { const m = x.split(/\s+[—–-]\s+|\s*\|\s*|:\s+/); return { text: m[0].trim(), detail: m.slice(1).join(' ').trim(), ticks: 1, timer: 0 }; }
  const text = String(firstOf(x, ['text', 'name', 'item', 'exercise', 'title']) || '').trim();
  let timer = firstOf(x, ['timer', 'minutes', 'duration', 'time']);
  if (timer != null) { const sec = typeof timer === 'number' ? (timer > 60 ? timer : timer * 60) : restFrom(String(timer).replace(/^(\d+(?:\.\d+)?)$/, '$1 min')); timer = sec ? clamp(Math.round(sec / 60) || 1, 1, 60) : 0; }
  const detail = firstOf(x, ['detail', 'details', 'note', 'notes', 'reps']);
  return { text, detail: detail == null ? '' : String(detail), ticks: timer ? 1 : clamp(Math.round(numOf(firstOf(x, ['ticks', 'rounds', 'sets'])) || 1), 1, 6), timer: timer || 0 };
}
// Text → { kind: 'routine', name, blocks } or { kind: 'plan', name, routines: [{ name, blocks }] }, exercises still as
// names. A plan is several days: { "plan": "…", "routines": [ { "name": "…", "items": [ … ] }, … ] }, or just a list of them.
// Throws an Error with a message fit to show.
const routineLike = x => !!x && typeof x === 'object' && !Array.isArray(x) && ['items', 'blocks', 'exercises', 'workout'].some(k => Array.isArray(x[k]));
function readPasteJson(text) {
  let s = String(text || '').trim();
  if (!s) throw new Error('Paste a routine or a plan first.');
  const a = s.search(/[[{]/), z = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (a < 0 || z < a) throw new Error('That isn’t JSON. It should start with { or [.');
  s = s.slice(a, z + 1).replace(/[“”]/g, '"').replace(/[‘’]/g, '\'').replace(/,(\s*[}\]])/g, '$1');
  let o; try { o = JSON.parse(s); } catch (e) { throw new Error('That isn’t valid JSON: ' + e.message.replace(/^JSON\.parse: /, '')); }
  if (o && !Array.isArray(o) && o.plan && typeof o.plan === 'object' && !Array.isArray(o.plan)) o = o.plan;
  if (o && !Array.isArray(o) && o.routine && typeof o.routine === 'object') o = o.routine;
  const days = Array.isArray(o) ? (o.length && o.every(routineLike) ? o : null) : o && [o.routines, o.days, o.workouts].find(Array.isArray);
  if (days) {
    if (!days.length) throw new Error('That plan has no routines in it.');
    const routines = days.map((d, k) => { if (!routineLike(d)) throw new Error('Routine ' + (k + 1) + ' has no list of exercises ("items").'); const nm = String(firstOf(d, ['name', 'title', 'day']) || 'Day ' + (k + 1)).trim(); return Object.assign(readRoutineObj(d, nm + ', item '), { name: nm }); });
    return { kind: 'plan', name: Array.isArray(o) ? '' : String((typeof o.plan === 'string' && o.plan) || firstOf(o, ['name', 'title', 'program', 'programme']) || '').trim(), routines };
  }
  return Object.assign({ kind: 'routine' }, readRoutineObj(o, 'Item '));
}
function readRoutineObj(o, label0) {
  const list = Array.isArray(o) ? o : o && (o.items || o.blocks || o.exercises || o.workout);
  if (!Array.isArray(list) || !list.length) throw new Error('Couldn’t find the exercises. Put them in a list called "items".');
  const blocks = list.map((x, k) => {
    const label = label0 + (k + 1), kind = x && typeof x === 'object' ? String(x.kind || x.type || '').toLowerCase() : '';
    if (x && typeof x === 'object' && (Array.isArray(x.superset) || kind === 'ss' || kind === 'superset')) {
      const parts = (Array.isArray(x.superset) ? x.superset : x.parts || x.exercises || x.items || []).map((p, j) => liftFrom(p, label + ', exercise ' + (j + 1)));
      if (!parts.length) throw new Error(label + ' is a superset with no exercises.');
      const given = restFrom(firstOf(x, ['rest', 'rest_seconds', 'restSeconds', 'rest_after_round'])), rest = given != null ? given : parts.reduce((m, p) => Math.max(m, p.rest || 0), 0) || null;
      if (parts.length === 1) return Object.assign({ kind: 'lift' }, parts[0], rest != null ? { rest } : {});
      parts.forEach(p => { delete p.rest; });
      return { kind: 'ss', rest: rest ?? 90, parts };
    }
    if (x && typeof x === 'object' && (x.checklist != null || kind === 'check' || kind === 'checklist')) {
      const raw = Array.isArray(x.checklist) ? x.checklist : x.items || [];
      const items = raw.map(checkItemFrom).filter(it => it.text);
      if (!items.length) throw new Error(label + ' is a checklist with nothing in it.');
      return { kind: 'check', name: String((typeof x.checklist === 'string' && x.checklist) || x.name || x.title || 'Warm-up').trim(), items };
    }
    return Object.assign({ kind: 'lift' }, liftFrom(x, label));
  });
  const name = Array.isArray(o) ? '' : String(firstOf(o, ['name', 'title', 'routine_name', 'routineName']) || '').trim();
  return { name, blocks };
}
const itemName = b => (b.kind === 'check' ? b.name : b.kind === 'ss' ? b.parts.map(p => p.name).join(' + ') : b.name);
// The plan as routine blocks: exercises found by name (any case), new ones added, the rest from the usual defaults.
function blocksFromPlan(plan) {
  const slot = (p, inSs) => {
    const ex = ensureEx(p.name, p.step); if (p.notes && !ex.notes) ex.notes = p.notes;
    if (p.equip) { ex.equip = p.equip; if (p.equip === 'barbell') ex.bar = p.bar != null ? p.bar : ex.bar != null ? ex.bar : 20; }
    saveEx(ex);
    const o = Object.assign({ exId: ex.id }, slotDefaults(ex.id));
    ['sets', 'lo', 'hi', 'range', 'rest', 'warm', 'warmMode'].forEach(k => { if (p[k] != null) o[k] = p[k]; });
    if (o.hi < o.lo) o.hi = o.lo;
    if (inSs) { delete o.rest; o.warm = 0; delete o.warmMode; }
    return o;
  };
  return plan.blocks.map(b => b.kind === 'check' ? { kind: 'check', name: b.name, items: b.items } : b.kind === 'ss' ? { kind: 'ss', rest: b.rest, parts: b.parts.map(p => slot(p, true)) } : Object.assign({ kind: 'lift' }, slot(b, false)));
}
function pasteStatusHtml(sh) {
  if (!String(sh.text || '').trim()) return '';
  try {
    const p = readPasteJson(sh.text);
    const txt = p.kind === 'plan' && (p.routines.length > 1 || sh.plan) ? (p.name ? 'Plan “' + p.name + '”, ' : 'A plan with ') + plural(p.routines.length, 'routine') + ': ' + p.routines.map(r => r.name).join(', ')
      : (b => plural(b.length, 'item') + ': ' + b.map(itemName).join(', '))(p.kind === 'plan' ? p.routines[0].blocks : p.blocks);
    return '<span class="ok">' + ICON.check + esc(txt) + '</span>';
  }
  catch (e) { return '<span class="' + (sh.tried ? 'bad' : '') + '">' + esc(e.message) + '</span>'; }
}

const A = {
  // today
  start: () => { const r = routineById(UI.sel) || suggestedRoutine(); if (r) startWorkout(r); },
  pickRoutine: d => { UI.sel = d.id; render(); },
  sound: () => { S.settings.sound = !S.settings.sound; unlockAudio(); saveSettings(); render(); },
  resume: () => { unlockAudio(); UI.screen = 'train'; keepAwake(); render(); },
  toToday: () => { UI.screen = 'today'; UI.sheet = null; if (S.cur) S.cur.fix = null; render(); },
  openSession: d => openSheet({ type: 'session', id: d.id }),
  // Fixing a set in a finished workout: tap it, then its weight or reps on the pad.
  sSet: d => openSheet({ type: 'sset', id: UI.sheet.id, k: +d.k, i: +d.i, field: 'kg', buf: '', parent: UI.sheet }),
  ssetField: d => { ssetCommit(); UI.sheet.field = d.v === 'reps' ? 'reps' : 'kg'; render(); },
  ssetDone: () => { ssetCommit(); UI.sheet = UI.sheet.parent || null; render(); },
  delSession: d => { if (UI.confirm !== 'del') { UI.confirm = 'del'; render(); return; } deleteSession(d.id); UI.sheet = null; UI.confirm = null; render(); },
  close: () => { UI.sheet = (UI.sheet && UI.sheet.parent) || null; UI.confirm = null; render(); },
  // routines
  newRoutine: () => {
    const fromPlan = UI.screen === 'plan', pid = fromPlan ? UI.planId : (activePlan() || {}).id;
    const r = { id: uid('r'), name: '', order: nextOrder(S.routines), blocks: [], updatedAt: now() }; if (pid) r.planId = pid;
    S.routines.push(r); saveRoutine(r); UI.editId = r.id; if (!fromPlan || pid === S.settings.plan) UI.sel = r.id; UI.from = fromPlan ? 'plan' : null; UI.sheet = null; UI.screen = 'edit'; UI.focus = '#r-name'; render();
  },
  editRoutine: d => { UI.editId = d.id; UI.screen = 'edit'; UI.sheet = null; render(); },
  editDone: () => {
    const r = curRoutine();
    if (blankRoutine(r)) { S.routines = S.routines.filter(x => x !== r); if (UI.sel === r.id) UI.sel = null; UI.editId = null; removeRoutineStore(r.id); }
    else if (r && !String(r.name).trim()) { r.name = 'Untitled routine'; saveRoutine(r); }
    UI.screen = UI.from === 'plan' && planById(UI.planId) ? 'plan' : 'today'; UI.from = null; UI.sheet = null; render();
  },
  dupRoutine: () => { const r = curRoutine(); if (!r) return; UI.sheet = null; const c = clone(r); c.id = uid('r'); c.name = (r.name || 'Routine') + ' copy'; c.order = (r.order || 0) + 0.5; S.routines.push(c); routinesSorted().forEach((x, i) => { x.order = i; saveRoutine(x); }); UI.editId = c.id; UI.sel = c.id; UI.focus = '#r-name'; toast('Copied. You’re editing the copy.'); },
  delRoutine: () => { const r = curRoutine(); if (!r) return; UI.sheet = null; S.routines = S.routines.filter(x => x.id !== r.id); removeRoutineStore(r.id); UI.undoRoutine = r; UI.undoEx = pruneEx(slotsOf(r).map(s => s.exId)); UI.editId = null; UI.sel = null; UI.screen = UI.from === 'plan' && planById(UI.planId) ? 'plan' : 'today'; UI.from = null; toast('Deleted ' + (r.name || 'routine') + '.', 'undoDelRoutine'); },
  undoDelRoutine: () => { const r = UI.undoRoutine; if (!r) return; (UI.undoEx || []).forEach(x => { S.exercises[x.id] = x; saveEx(x); }); S.routines.push(r); saveRoutine(r); UI.undoRoutine = null; UI.toast = null; UI.sel = r.id; render(); },
  moveRoutine: d => { const rs = routinesIn(planOf(curRoutine())), i = rs.findIndex(x => x.id === UI.editId), j = i + +d.d; if (i < 0 || j < 0 || j >= rs.length) return; [rs[i], rs[j]] = [rs[j], rs[i]]; rs.forEach((x, k) => { if (x.order !== k) { x.order = k; saveRoutine(x); } }); render(); },
  addExercise: () => { UI.focus = '#pick-q'; openSheet({ type: 'pick', mode: 'add', q: '' }); },
  addSuperset: () => { const r = curRoutine(); r.blocks.push({ kind: 'ss', rest: 90, parts: [] }); saveRoutine(r); openSheet({ type: 'ss', bi: r.blocks.length - 1, isNew: true, snap: null }); },
  addChecklist: () => { const r = curRoutine(); r.blocks.push({ kind: 'check', name: 'Warm-up', items: [{ text: '', detail: '', ticks: 1, timer: 0 }] }); saveRoutine(r); UI.focus = '[data-ci="0"][data-cf="text"]'; openSheet({ type: 'check', bi: r.blocks.length - 1, isNew: true, snap: null }); },
  openBlock: d => { UI.slotMore = false; UI.ckSel = null; const r = curRoutine(), bi = +d.bi, bl = r.blocks[bi]; UI.sheet = { type: bl.kind === 'ss' ? 'ss' : bl.kind === 'check' ? 'check' : 'slot', bi, isNew: false }; UI.sheet.snap = snapshot(); render(); },
  openPart: d => { const sh = UI.sheet, part = sheetBlock().parts[+d.p]; UI.sheet = { type: 'slot', bi: sh.bi, p: +d.p, parent: sh, partSnap: { part: clone(part), exercises: clone(S.exercises) } }; render(); },
  pickEx: d => {
    UI.slotMore = false;
    const sh = UI.sheet, r = curRoutine();
    let exId = d.id;
    if (!exId) { const ex = ensureEx(sh.q); saveEx(ex); exId = ex.id; }
    const def = slotDefaults(exId);
    if (sh.mode === 'add') { r.blocks.push(Object.assign({ kind: 'lift', exId }, def)); saveRoutine(r); UI.sheet = { type: 'slot', bi: r.blocks.length - 1, isNew: true, snap: null }; render(); return; }
    if (sh.mode === 'part') { const bl = r.blocks[sh.parent.bi]; const pd = Object.assign({ exId }, def); delete pd.rest; bl.parts.push(pd); saveRoutine(r); UI.sheet = sh.parent; render(); return; }
    if (sh.mode === 'swap') { const back = sh.parent, bl = r.blocks[back.bi], s = back.p != null ? bl.parts[back.p] : bl, old = s.exId; s.exId = exId; saveRoutine(r); pruneEx([old]); UI.sheet = back; render(); }
  },
  pickCancel: () => { UI.sheet = UI.sheet.parent || null; render(); },
  swapEx: () => { UI.focus = '#pick-q'; UI.sheet = { type: 'pick', mode: 'swap', q: '', parent: UI.sheet }; render(); },
  addPart: () => { UI.focus = '#pick-q'; UI.sheet = { type: 'pick', mode: 'part', q: '', parent: UI.sheet }; render(); },
  ef: d => { const t = sheetSlot(); if (!t) return; const f = d.f, dv = +d.d;
    if (f === 'sets') t.sets = clamp((t.sets || 3) + dv, 1, 12);
    else if (f === 'lo') { t.lo = clamp((t.lo || 8) + dv, 1, 100); if ((t.hi || 0) < t.lo) t.hi = t.lo; }
    else if (f === 'hi') t.hi = clamp((t.hi || t.lo || 8) + dv, t.lo || 1, 100);
    else if (f === 'rest') t.rest = clamp((t.rest || 0) + dv * 15, 0, 600);
    else if (f === 'ssrest') { const bl = sheetBlock(); bl.rest = clamp((bl.rest || 0) + dv * 15, 0, 600); }
    else if (f === 'warm') t.warm = clamp((t.warm || 0) + dv, 0, 4);
    else if (f === 'bar') { const ex = exById(t.exId); if (ex) { ex.bar = clamp(r2((ex.bar != null ? ex.bar : 20) + dv * 2.5), 0, 50); saveEx(ex); } }
    else if (f === 'step') { const ex = exById(t.exId); if (ex) { const cur = ex.step || 2.5; ex.step = dv > 0 ? (STEPS.find(x => x > cur + 1e-9) || STEPS[STEPS.length - 1]) : (STEPS.slice().reverse().find(x => x < cur - 1e-9) || STEPS[0]); saveEx(ex); } }
    changed(); },
  repMode: d => { const t = sheetSlot(); if (!t) return; t.range = d.v === 'range'; if (t.range && (t.hi || 0) <= t.lo) t.hi = t.lo + 2; S.settings.rangeMode = t.range; saveSettings(); changed(); },
  item: d => { const bl = sheetBlock(); if (!bl) return; const it = bl.items[+d.i]; if (d.f === 'ticks') it.ticks = clamp((it.ticks || 1) + +d.d, 1, 6); if (d.f === 'timer') it.timer = clamp((it.timer || 0) + +d.d, 1, 60); changed(); },
  itemKind: d => { const bl = sheetBlock(); if (!bl) return; const it = bl.items[+d.i]; if (d.v === 'timer') { it.timer = it.timer || 5; it.ticks = 1; } else it.timer = 0; changed(); },
  addItem: () => { const bl = sheetBlock(); bl.items.push({ text: '', detail: '', ticks: 1, timer: 0 }); UI.focus = '[data-ci="' + (bl.items.length - 1) + '"][data-cf="text"]'; changed(); },
  delItem: d => { const bl = sheetBlock(); bl.items.splice(+d.i, 1); changed(); },
  remove: () => {
    const r = curRoutine(), sh = UI.sheet;
    if (sh.p != null) { const bl = r.blocks[sh.bi]; const [gone] = bl.parts.splice(sh.p, 1); saveRoutine(r); UI.sheet = sh.parent; UI.undoBlock = { kind: 'part', bi: sh.bi, p: sh.p, item: gone }; toast('Removed ' + exName(gone.exId) + '.', 'undoRemove'); return; }
    const [gone] = r.blocks.splice(sh.bi, 1); saveRoutine(r); UI.sheet = null;
    UI.undoBlock = { kind: 'block', bi: sh.bi, item: gone };
    toast('Removed ' + (gone.kind === 'check' ? gone.name || 'checklist' : gone.kind === 'ss' ? 'superset' : exName(gone.exId)) + '.', 'undoRemove');
  },
  undoRemove: () => { const u = UI.undoBlock, r = curRoutine(); if (!u || !r) return; if (u.kind === 'part') { const bl = r.blocks[u.bi]; if (bl && bl.parts) bl.parts.splice(u.p, 0, u.item); } else r.blocks.splice(u.bi, 0, u.item); UI.undoBlock = null; UI.toast = null; changed(); },
  cancel: () => {
    const r = curRoutine(), sh = UI.sheet;
    if (sh.p != null) { const bl = r.blocks[sh.bi]; if (sh.partSnap) { const was = bl.parts[sh.p].exId; bl.parts[sh.p] = sh.partSnap.part; pruneEx(restoreExercises(sh.partSnap.exercises).concat([was])); } UI.sheet = sh.parent; changed(); return; }
    if (sh.isNew) { const [gone] = r.blocks.splice(sh.bi, 1); pruneEx(blockExIds(gone)); } else restoreSnap(sh);
    UI.sheet = null; changed();
  },
  done: () => {
    const r = curRoutine(), sh = UI.sheet;
    if (sh.p != null) { UI.sheet = sh.parent; render(); return; }
    const bl = r.blocks[sh.bi];
    if (bl && bl.kind === 'ss' && bl.parts.length < 2) {
      if (!bl.parts.length) { r.blocks.splice(sh.bi, 1); UI.sheet = null; changed(); return; }
      else { r.blocks[sh.bi] = Object.assign({ kind: 'lift', rest: bl.rest }, bl.parts[0]); UI.sheet = null; changed(); toast('A superset needs two, so ' + exName(bl.parts[0].exId) + ' was added on its own.'); return; }
    }
    UI.sheet = null; changed();
  },
  // checklist during training
  tick: d => { const b = S.cur.blocks[+d.bi], it = b.items[+d.it]; it.ticks[+d.k] = !it.ticks[+d.k]; touchCur(); render(); },
  cardio: d => { const c = S.cur; unlockAudio(); if (c.cardio) c.cardio = null; else { const it = c.blocks[+d.bi].items[+d.it]; c.cardio = { bi: +d.bi, it: +d.it, endsAt: now() + it.timer * 1000 }; } touchCur(); render(); },
  checkDone: () => { const t = nextOpen(S.cur); if (!t) return; S.cur.blocks[t.bi].done = true; S.cur.cardio = null; touchCur(); if (!nextOpen(S.cur)) { finish(); return; } render(); },
  // set editing
  repsDn: () => edit(x => { x.reps = Math.max(0, x.reps - 1); }),
  repsUp: () => edit(x => { x.reps += 1; }),
  kgDn: () => edit((x, b) => { x.kg = x.kg == null ? null : Math.max(0, r2(x.kg - b.step)); }),
  kgUp: () => edit((x, b) => { x.kg = x.kg == null ? b.step : r2(x.kg + b.step); }),
  type: () => edit(x => { x.type = ((x.type || 0) + 1) % TYPES.length; }),
  // from the Change sheet, the pad goes back to it when done
  padReps: () => openSheet({ type: 'pad', field: 'reps', buf: '', parent: padParent() }),
  padKg: () => openSheet({ type: 'pad', field: 'kg', buf: '', work: needsWork(), parent: padParent() }),
  row: d => { const c = S.cur, pos = { bi: +d.bi, i: +d.i }; if (d.p != null && d.p !== '') pos.p = +d.p; const x = liftAt(c, pos).sets[pos.i]; if (x.done) { if (c.fix && c.fix.bi === pos.bi && c.fix.i === pos.i && c.fix.p === pos.p) c.fix = null; else fixSet(pos); } else { x.skipped = false; c.fix = null; } UI.scrollToCard = true; touchCur(); render(); },
  // Edit on the rest screen: fix the set while the rest keeps counting; Save or Cancel goes back to it.
  restEdit: () => { const c = S.cur, f = c.rest && c.rest.from; if (!f) return; fixSet(f); UI.scrollToCard = true; touchCur(); render(); },
  fixCancel: () => { const c = S.cur, f = c.fix; if (!f) return; const b = liftAt(c, f), x = b.sets[f.i]; if (f.was) Object.assign(x, f.was); refreshWarm(b); c.fix = null; touchCur(); render(); },
  log: () => logSet(),
  skip: () => skipSet(),
  add: () => { const c = S.cur, t = target(c); if (!t) return; const b = liftAt(c, t), src = b.sets[b.sets.length - 1]; b.sets.push({ kind: 'work', reps: src.reps, kg: src.kg, done: false, skipped: false, touched: false, type: 0 }); touchCur(); render(); },
  plan: () => openSheet({ type: 'plan' }),
  slotMore: () => { UI.slotMore = true; render(); },
  // equipment is optional: tapping the chosen one again clears it
  equip: d => { const t = sheetSlot(), ex = t && exById(t.exId); if (!ex) return; if (ex.equip === d.v) delete ex.equip; else { ex.equip = d.v; if (d.v === 'barbell' && ex.bar == null) ex.bar = 20; } saveEx(ex); changed(); },
  warmMode: d => { const t = sheetSlot(); if (!t) return; if (d.v === 'manual') t.warmMode = 'manual'; else delete t.warmMode; changed(); },
  ckSel: d => { UI.ckSel = UI.ckSel === +d.i ? null : +d.i; render(); },
  addMenu: () => openSheet({ type: 'addmenu' }),
  // the Progress tab and its pages
  tab: d => { UI.screen = d.v === 'progress' ? 'progress' : 'today'; UI.sheet = null; render(); },
  // A page opened from a workout or the editor goes back there, sheet and all.
  pOpen: d => { const from = UI.screen; commitPending(); UI.pFrom = from === 'progress' ? null : from; UI.pSheet = PSCREENS[from] ? null : UI.sheet; if (d.id) { if (UI.pex !== d.id) UI.pexMetric = null; UI.pex = d.id; } UI.pexAll = false; UI.bwAll = false; UI.screen = d.v; UI.sheet = null; render(); },
  pBack: () => { const to = UI.screen === 'pex' && UI.pFrom ? UI.pFrom : 'progress'; UI.screen = to; UI.sheet = PSCREENS[to] ? null : UI.pSheet || null; UI.pFrom = null; UI.pSheet = null; render(); },
  pexMetric: d => { UI.pexMetric = d.v; render(); },
  pexAll: () => { UI.pexAll = !UI.pexAll; render(); },
  bwRange: d => { UI.bwRange = d.v; render(); },
  bwAll: () => { UI.bwAll = !UI.bwAll; render(); },
  waistSet: d => { S.settings.waist = d.v === 'on'; saveSettings(); render(); },
  openSettings: () => { UI.screen = 'settings'; UI.sheet = null; render(); },
  bwAvg: d => { S.settings.bwAvg = d.v === 'weighted' ? 'weighted' : 'simple'; saveSettings(); render(); },
  soundSet: d => { S.settings.sound = d.v === 'on'; unlockAudio(); saveSettings(); render(); },
  // weighing in: one weigh-in a day (logging again changes it); the goal uses the same pad
  wLog: () => { const t = todaysWeigh(); openSheet({ type: 'wpad', field: 'kg', buf: '', id: t ? t.id : null }); },
  wEdit: d => openSheet({ type: 'wpad', field: 'kg', buf: '', id: d.id }),
  goalEdit: () => openSheet({ type: 'wpad', field: 'kg', buf: '', goal: true }),
  waLog: () => { const t = todaysWaist(); openSheet({ type: 'wpad', field: 'kg', buf: '', waist: true, id: t ? t.id : null }); },
  waEdit: d => openSheet({ type: 'wpad', field: 'kg', buf: '', waist: true, id: d.id }),
  wSave: () => {
    const sh = UI.sheet, v = parseFloat(sh.buf), wa = !!sh.waist, key = wa ? 'waists' : 'weights', f = wa ? 'cm' : 'kg';
    if (sh.buf === '') { UI.sheet = null; return render(); }
    if (!(v >= (wa ? 40 : 20) && v <= (wa ? 250 : 400))) return toast(wa ? 'That doesn’t look like a waist in cm.' : 'That doesn’t look like a weight in kg.');
    UI.sheet = null;
    if (sh.goal) { S.settings.goalKg = r2(v); saveSettings(); }
    else { S[key] = S[key] || []; let w = sh.id && S[key].find(x => x.id === sh.id); if (!w) { w = { id: uid(wa ? 'c' : 'w'), at: now() }; S[key].push(w); } w[f] = r2(v); w.updatedAt = now(); saveLocal(); }
    render();
  },
  wDelete: () => { const sh = UI.sheet, key = sh.waist ? 'waists' : 'weights', w = (S[key] || []).find(x => x.id === sh.id); UI.sheet = null; if (!w) return render(); S[key] = S[key].filter(x => x !== w); saveLocal(); UI.undoWeigh = { key, w }; toast('Deleted ' + (sh.waist ? fmt(w.cm) + ' cm' : fmt(w.kg) + ' kg') + ', ' + dateTxt(w.at) + '.', 'undoWeigh'); },
  undoWeigh: () => { const u = UI.undoWeigh; if (u) { S[u.key].push(u.w); saveLocal(); } UI.undoWeigh = null; UI.toast = null; render(); },
  goalClear: () => { S.settings.goalKg = null; saveSettings(); UI.sheet = null; render(); },
  // a routine from pasted JSON
  pasteOpen: () => openSheet({ type: 'paste', text: '' }),
  pasteClip: () => {
    const sh = UI.sheet, fail = () => { const el = document.getElementById('paste-json'); if (el) el.focus(); toast('Couldn’t read the clipboard. Long-press the box and choose Paste.'); };
    try { navigator.clipboard.readText().then(t => { if (UI.sheet !== sh) return; sh.text = t; sh.tried = true; render(); }, fail); } catch (e) { fail(); }
  },
  pasteExample: () => {
    const sh = UI.sheet, ex = sh.plan ? PASTE_PLAN_EXAMPLE : PASTE_EXAMPLE, fill = () => { sh.text = ex; sh.tried = false; render(); };
    try { navigator.clipboard.writeText(ex).then(() => toast('Example copied.'), fill); } catch (e) { fill(); }
  },
  pasteAdd: () => {
    const sh = UI.sheet;
    let got; try { got = readPasteJson(sh.text); } catch (e) { sh.tried = true; render(); return; }
    const make = (x, pid) => { const r = { id: uid('r'), name: x.name || 'Untitled routine', order: nextOrder(S.routines), blocks: blocksFromPlan(x), updatedAt: now() }; if (pid) r.planId = pid; S.routines.push(r); saveRoutine(r); return r; };
    UI.sheet = null; UI.focus = null;
    // into a plan: every routine it has (or the one routine) joins the plan
    if (sh.plan) { const pl = planById(sh.plan); if (!pl) return render(); (got.kind === 'plan' ? got.routines : [got]).forEach(x => make(x, pl.id)); if (got.kind === 'plan' && got.name && !String(pl.name || '').trim()) pl.name = got.name; savePlan(pl); render(); return; }
    const r = curRoutine(); if (!r) return render();
    if (got.kind === 'routine' || got.routines.length === 1) {
      const one = got.kind === 'routine' ? got : got.routines[0];
      r.blocks.push(...blocksFromPlan(one));
      if (one.name && !String(r.name || '').trim()) r.name = one.name;
      saveRoutine(r); render(); return;
    }
    // a whole plan pasted into a new routine becomes a plan of its own
    if (blankRoutine(r)) S.routines = S.routines.filter(x => x !== r);
    const pl = { id: uid('p'), name: got.name || 'Pasted plan', order: nextOrder(S.plans), updatedAt: now() }; S.plans.push(pl);
    got.routines.forEach(x => make(x, pl.id));
    if (!activePlan()) S.settings.plan = pl.id;
    savePlan(pl); UI.editId = null; UI.sel = null; UI.from = null; UI.planId = pl.id; UI.screen = 'plan'; render();
  },
  rMenu: () => openSheet({ type: 'rmenu' }),
  rPlan: () => openSheet({ type: 'rplan', parent: null }),
  rPlanSet: d => { const r = curRoutine(); if (!r) return; if (d.id) r.planId = d.id; else delete r.planId; r.order = nextOrder(S.routines); saveRoutine(r); UI.sheet = null; render(); },
  // plans
  planNew: () => { const pl = { id: uid('p'), name: '', order: nextOrder(S.plans), updatedAt: now() }; S.plans.push(pl); if (!activePlan()) S.settings.plan = pl.id; savePlan(pl); UI.planId = pl.id; UI.screen = 'plan'; UI.sheet = null; UI.focus = '#p-name'; render(); },
  planOpen: d => { UI.planId = d.id; UI.screen = 'plan'; UI.sheet = null; render(); },
  planDone: () => {
    const pl = planById(UI.planId);
    if (pl && !String(pl.name || '').trim()) { if (!routinesIn(pl.id).length) { S.plans = S.plans.filter(x => x !== pl); if (S.settings.plan === pl.id) S.settings.plan = null; } else pl.name = 'Untitled plan'; saveLocal(); }
    UI.screen = 'today'; UI.sheet = null; render();
  },
  planUse: () => { S.settings.plan = UI.planId; UI.sel = null; saveSettings(); UI.sheet = null; UI.screen = 'today'; render(); },
  planStop: () => { S.settings.plan = null; UI.sel = null; saveSettings(); UI.sheet = null; render(); },
  planDelete: () => {
    const pl = planById(UI.planId); if (!pl) return;
    const ids = S.routines.filter(r => r.planId === pl.id).map(r => r.id), was = S.settings.plan === pl.id;
    S.routines.forEach(r => { if (r.planId === pl.id) { delete r.planId; saveRoutine(r); } });
    S.plans = S.plans.filter(x => x !== pl); if (was) S.settings.plan = null; saveLocal();
    UI.undoPlan = { pl, ids, was }; UI.sheet = null; UI.sel = null; UI.screen = 'today'; toast('Deleted ' + (pl.name || 'the plan') + '. Its routines are kept.', 'undoPlan');
  },
  undoPlan: () => { const u = UI.undoPlan; if (!u) return; S.plans.push(u.pl); S.routines.forEach(r => { if (u.ids.includes(r.id)) { r.planId = u.pl.id; saveRoutine(r); } }); if (u.was) S.settings.plan = u.pl.id; saveLocal(); UI.undoPlan = null; UI.toast = null; render(); },
  planRoutine: d => { UI.editId = d.id; UI.from = 'plan'; UI.screen = 'edit'; UI.sheet = null; render(); },
  planAdd: () => openSheet({ type: 'padd' }),
  pMenu: () => openSheet({ type: 'pmenu' }),
  planPaste: () => openSheet({ type: 'paste', text: '', plan: UI.planId }),
  planMoveIn: d => { const r = routineById(d.id); if (!r) return; r.planId = UI.planId; r.order = nextOrder(S.routines); saveRoutine(r); UI.sheet = null; render(); },
  planNow: d => { const c = S.cur, t = nextOpen(c), bi = +d.bi; if (!t || bi === t.bi) { UI.sheet = null; render(); return; } const [b] = c.blocks.splice(bi, 1); c.blocks.splice(t.bi > bi ? t.bi - 1 : t.bi, 0, b); c.pick = null; c.fix = null; c.over = null; UI.sheet = null; UI.showWarm = false; UI.scrollToCard = true; touchCur(); render(); },
  planMove: d => { const c = S.cur, bi = +d.bi, j = bi + +d.d; if (j < 0 || j >= c.blocks.length || blockState(c.blocks[j]) !== 'open') return; [c.blocks[bi], c.blocks[j]] = [c.blocks[j], c.blocks[bi]]; c.pick = null; c.fix = null; touchCur(); render(); },
  planSkip: d => { const c = S.cur, b = c.blocks[+d.bi]; if (b.kind === 'check') b.skipped = true; else blockSets(b).forEach(x => { if (isOpen(x)) x.skipped = true; }); c.pick = null; c.fix = null; if (c.cardio && c.cardio.bi === +d.bi) c.cardio = null; touchCur(); if (!nextOpen(c)) { UI.sheet = null; finish(); return; } render(); },
  planBack: d => { const b = S.cur.blocks[+d.bi]; if (b.kind === 'check') b.skipped = false; else blockSets(b).forEach(x => { if (x.skipped) x.skipped = false; }); touchCur(); render(); },
  showWarm: () => { UI.showWarm = true; render(); },
  later: () => { const c = S.cur, t = nextOpen(c); if (!t || t.bi === c.blocks.length - 1) { UI.sheet = null; toast('This is already the last one.'); return; } const [b] = c.blocks.splice(t.bi, 1); c.blocks.push(b); c.pick = null; c.fix = null; UI.sheet = null; touchCur(); toast('Moved to the end of the workout.'); },
  pick: d => { S.cur.pick = { bi: +d.bi, p: +d.p }; touchCur(); render(); },
  // rest
  restLess: () => { const r = S.cur.rest; if (!r) return; r.endsAt = Math.max(now() + 1000, r.endsAt - 15000); touchCur(); tick(); },
  restMore: () => { const r = S.cur.rest; if (!r) return; r.endsAt += 15000; r.total = Math.max(r.total, Math.ceil((r.endsAt - now()) / 1000)); touchCur(); tick(); },
  skipRest: () => { S.cur.rest = null; S.cur.over = null; UI.scrollToCard = true; touchCur(); render(); },
  change: () => openSheet({ type: 'change' }),
  // number pad
  key: d => { const sh = UI.sheet; if (!sh) return; let buf = sh.buf; const k = d.k; if (k === 'del') buf = buf.slice(0, -1); else if (k === '.') { if (sh.field === 'reps' || buf.includes('.')) return; buf = (buf || '0') + '.'; } else { if (buf.replace('.', '').length >= 5) return; buf = buf === '0' ? k : buf + k; } sh.buf = buf; render(); },
  padSet: d => { UI.sheet.buf = fmt(Math.max(0, +d.v)); render(); },
  padDone: () => { const sh = UI.sheet, c = S.cur, t = target(c), v = parseFloat(sh.buf); UI.sheet = sh.parent || null; if (t && sh.buf !== '' && !isNaN(v)) { const b = liftAt(c, t), x = b.sets[t.i]; if (sh.work) b.sets.forEach(y => { if (y.kind === 'work' && isOpen(y)) y.kg = r2(v); }); else if (sh.field === 'reps') { x.reps = Math.round(v); x.touched = true; } else { x.kg = r2(v); x.touched = true; } refreshWarm(b); touchCur(); } render(); },
  // exercise info during training
  openEx: d => { const pos = { bi: +d.bi }; if (d.p != null && d.p !== '') pos.p = +d.p; openSheet({ type: 'ex', pos }); },
  restAdj: d => { setTrainRest((S.cur.blocks[UI.sheet.pos.bi].rest || 0) + +d.d); render(); },
  // finish
  askFinish: () => openSheet({ type: 'finish' }),
  finish: () => finish(),
  discard: () => { if (UI.confirm !== 'discard') { UI.confirm = 'discard'; render(); return; } const ids = liftsOf(S.cur).map(b => b.exId); S.cur = null; pruneEx(ids); UI.sheet = null; UI.confirm = null; UI.screen = 'today'; letSleep(); touchCur(); render(); },
  summaryDone: () => { UI.screen = 'today'; UI.summary = null; render(); },
  // backup
  backup: () => openSheet({ type: 'backup' }),
  backupSave: () => { const f = backupFile(), url = URL.createObjectURL(f), a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); markBackedUp(); },
  backupShare: () => { navigator.share({ files: [backupFile()], title: 'Jim backup' }).then(markBackedUp).catch(() => {}); },
  restorePick: () => { const el = document.getElementById('restore-file'); if (el) el.click(); },
};
// Screens keep their main button in the same place, so the second tap of a double tap would land on the next screen's
// (log a set, then skip the rest that follows). Taps in the first moment after the screen changes are ignored.
const TAP_GUARD = navigator.webdriver ? 0 : 350;
let tapGuardUntil = 0;
$app.addEventListener('click', e => {
  if (drag.dropped && performance.now() - drag.dropped < 400) { e.preventDefault(); return; } // the end of a drag, not a tap
  if (e.target.closest('.toast') && !e.target.closest('[data-a]')) { dropToast(); return; } // tap a toast to get rid of it
  const el = e.target.closest('[data-a]'); if (!el || !$app.contains(el) || el.disabled) return;
  if (performance.now() < tapGuardUntil) { e.preventDefault(); return; }
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault();
  if (UI.toast && !el.closest('.toast')) dropToast();
  fn(el.dataset);
});
$app.addEventListener('pointerdown', () => { if (S.cur) unlockAudio(); }, { passive: true });
$app.addEventListener('focusin', e => {
  const item = e.target.closest && e.target.closest('.item.ckb');
  if (item) { UI.ckSel = +item.dataset.item; document.querySelectorAll('.item.ckb').forEach(x => x.classList.toggle('open', x === item)); }
  const el = e.target; if (!el.classList || !el.classList.contains('stpv')) return;
  el.dataset.orig = el.value;
  if (el.dataset.k === 'dec') el.value = el.value.replace(/\s*kg$/, '');
  else if (el.dataset.k === 'min') el.value = el.value === 'Off' ? '' : String(parseInt(el.value, 10) || '');
  el.dataset.raw = el.value;
  el.select(); el.dataset.fresh = '1';
});
// The tap that focused a field also drops the caret where the finger was; select the whole number again so typing replaces it.
$app.addEventListener('click', e => { const el = e.target; if (el.classList && el.classList.contains('stpv') && el.dataset.fresh) { el.dataset.fresh = ''; el.select(); } });
$app.addEventListener('focusout', e => { const el = e.target; if (el.classList && el.classList.contains('stpv') && el.value === el.dataset.raw) el.value = el.dataset.orig; });
$app.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('stpv')) commitField(e.target); });
$app.addEventListener('change', e => {
  if (e.target.id !== 'restore-file' || !e.target.files || !e.target.files[0]) return;
  e.target.files[0].text().then(t => {
    const n = restoreFrom(JSON.parse(t)); UI.sheet = null; UI.sel = null; render();
    const got = [n.plans && plural(n.plans, 'plan'), n.routines && plural(n.routines, 'routine'), n.sessions && plural(n.sessions, 'workout'), n.weights && plural(n.weights, 'weigh-in'), n.waists && plural(n.waists, 'waist measurement')].filter(Boolean);
    toast(got.length ? 'Restored ' + got.join(' and ') + '.' : 'Nothing new in that backup.');
  }).catch(() => toast('That file isn’t a Jim backup.'));
});
$app.addEventListener('keydown', e => {
  if ((e.key !== 'Enter' && e.keyCode !== 13) || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  const t = e.target;
  if (t.id === 'pick-q') { const first = document.querySelector('.picklist .pickrow'); if (first && UI.sheet.q.trim()) first.click(); return; }
  if (t.dataset.ci != null) {
    const i = +t.dataset.ci, bl = sheetBlock(), go = (k, f) => { const el = document.querySelector('[data-ci="' + k + '"][data-cf="' + f + '"]'); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } };
    if (t.dataset.cf === 'text') go(i, 'detail');
    else if (i < bl.items.length - 1) go(i + 1, 'text');
    else if (String(bl.items[i].text || '').trim()) A.addItem();
    else t.blur();
    return;
  }
  t.blur();
});
$app.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'notes') { const ex = exById(el.dataset.ex); if (ex) { ex.notes = el.value; saveEx(ex); } return; }
  if (el.id === 'paste-json') { UI.sheet.text = el.value; UI.sheet.tried = false; const st = document.getElementById('paste-status'); if (st) st.innerHTML = pasteStatusHtml(UI.sheet); return; }
  if (el.id === 'pick-q') { UI.sheet.q = el.value; const pl = document.querySelector('.picklist'); if (pl) { pl.innerHTML = pickListHtml(); pl.parentNode.scrollTop = 0; } sheetEdges(); return; }
  if (el.dataset.pf === 'name') { const pl = planById(UI.planId); if (pl) { pl.name = el.value; savePlan(pl); } return; }
  const r = curRoutine(); if (!r) return;
  if (el.dataset.rf === 'name') { r.name = el.value; saveRoutine(r); return; }
  if (el.dataset.f === 'exname') { const t = sheetSlot(), ex = t && exById(t.exId); if (ex) { ex.name = el.value; saveEx(ex); } return; }
  const bl = sheetBlock(); if (!bl) return;
  if (el.dataset.f === 'cname') { bl.name = el.value; saveRoutine(r); }
  else if (el.dataset.ci != null) { bl.items[+el.dataset.ci][el.dataset.cf] = el.value; saveRoutine(r); }
});

// ---------- ticking ----------
const typing = () => { const ae = document.activeElement; return !!(ae && ae.matches && ae.matches('input, textarea')); };
function tick() {
  const c = S.cur; let changedNow = false;
  if (c && c.rest && now() >= c.rest.endsAt) { c.over = { since: c.rest.endsAt }; c.rest = null; changedNow = true; if (UI.sheet && UI.sheet.type === 'change') UI.sheet = null; else if (UI.sheet && UI.sheet.parent && UI.sheet.parent.type === 'change') UI.sheet.parent = null; if (document.visibilityState === 'visible' && now() - c.over.since < 3000) beep(); UI.scrollToCard = true; }
  if (c && c.cardio && now() >= c.cardio.endsAt) { const it = c.blocks[c.cardio.bi] && c.blocks[c.cardio.bi].items[c.cardio.it]; if (it) it.ticks = it.ticks.map(() => true); const late = now() - c.cardio.endsAt; c.cardio = null; changedNow = true; if (late < 3000) beep(); }
  if (changedNow) { touchCur(); if (UI.screen !== 'edit' && !typing()) render(); return; } // while typing, the next tap brings the screen up to date
  document.querySelectorAll('[data-tick]').forEach(el => {
    const k = el.dataset.tick;
    if (k === 'elapsed' && c) el.textContent = mmss(now() - c.startedAt);
    else if (k === 'over' && c && c.over) el.textContent = mmss(now() - c.over.since) + ' over';
    else if (k === 'cardio' && c && c.cardio) el.textContent = mmss(c.cardio.endsAt - now());
    else if (k === 'rest' && c && c.rest) paintRest(el, c.rest);
  });
}
function paintRest(root, r) {
  const left = Math.max(0, r.endsAt - now()), frac = Math.min(1, left / (r.total * 1000)), col = left <= 10500 ? 'var(--gold)' : 'var(--cream)';
  const arc = root.querySelector('.arc'), knob = root.querySelector('.knob'), dig = root.querySelector('.big'), tot = root.querySelector('.tot');
  if (arc) { arc.setAttribute('stroke-dashoffset', r2(879.6 * (1 - frac))); arc.style.stroke = col; }
  if (knob) { knob.style.transform = 'rotate(' + r2(360 * frac) + 'deg)'; knob.style.fill = col; }
  if (dig) { dig.textContent = mmss(left); dig.style.color = col; }
  if (tot) tot.textContent = 'left of ' + secTxt(r.total);
}
setInterval(tick, 250);

// ---------- drag to reorder (routine items, superset exercises) ----------
// The ⠿ grip: press and drag, straight away. Elsewhere on a row: drag with a mouse, or on touch hold still for a moment
// first, so a quick swipe still scrolls and a tap still opens the item.
const drag = { el: null };
const dragItems = list => [...list.children].filter(x => x.hasAttribute('data-drag'));
$app.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-drag]'); if (!el || e.button > 0 || drag.el) return;
  const grip = !!e.target.closest('[data-grip]');
  Object.assign(drag, { el, list: el.parentElement, pid: e.pointerId, x0: e.clientX, y0: e.clientY, y: e.clientY, hold: e.pointerType !== 'mouse' && !grip, grip, active: false });
  clearTimeout(drag.timer);
  if (drag.hold) drag.timer = setTimeout(startDrag, 350);
});
function startDrag() {
  if (!drag.el) return;
  const items = dragItems(drag.list), from = items.indexOf(drag.el), lr = drag.list.getBoundingClientRect();
  Object.assign(drag, { active: true, items, from, to: from, tops: items.map(x => x.getBoundingClientRect().top - lr.top), hs: items.map(x => x.getBoundingClientRect().height), grab: drag.y0 - drag.el.getBoundingClientRect().top, scroller: drag.list.closest('.paperscreen, .sh-b') });
  drag.el.classList.add('dragging'); drag.list.classList.add('drag-on');
  try { drag.el.setPointerCapture(drag.pid); } catch (err) { /* fine without */ }
  try { if (navigator.vibrate) navigator.vibrate(10); } catch (err) { /* no haptics */ }
  requestAnimationFrame(dragScroll);
}
function dragMove() {
  const lr = drag.list.getBoundingClientRect(), h = drag.hs[drag.from], top = drag.y - drag.grab - lr.top, mid = top + h / 2;
  let to = drag.from;
  drag.tops.forEach((t, k) => { const m = t + drag.hs[k] / 2; if (k < drag.from && mid < m) to = Math.min(to, k); if (k > drag.from && mid > m) to = Math.max(to, k); });
  drag.to = to;
  drag.el.style.transform = 'translateY(' + Math.round(top - drag.tops[drag.from]) + 'px)';
  drag.items.forEach((x, k) => { if (k === drag.from) return; const s = drag.from < to && k > drag.from && k <= to ? -h : drag.from > to && k >= to && k < drag.from ? h : 0; x.style.transform = s ? 'translateY(' + s + 'px)' : ''; });
}
// Near the top or bottom edge, keep scrolling so an item can travel the whole list.
function dragScroll() {
  if (!drag.active) return;
  const sc = drag.scroller;
  if (sc) { const r = sc.getBoundingClientRect(), edge = 64, v = drag.y < r.top + edge ? -(r.top + edge - drag.y) / 4 : drag.y > r.bottom - edge ? (drag.y - (r.bottom - edge)) / 4 : 0; if (v) { sc.scrollTop += v; dragMove(); } }
  requestAnimationFrame(dragScroll);
}
document.addEventListener('pointermove', e => {
  if (!drag.el || e.pointerId !== drag.pid) return;
  drag.y = e.clientY;
  if (!drag.active) {
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
    if (drag.hold) { if (moved > 8) { clearTimeout(drag.timer); drag.el = null; } return; } // moved before the hold: a scroll
    if (Math.abs(e.clientY - drag.y0) < (drag.grip ? 3 : 6)) return;
    startDrag();
  }
  e.preventDefault(); dragMove();
}, { passive: false });
document.addEventListener('touchmove', e => { if (drag.active) e.preventDefault(); }, { passive: false });
$app.addEventListener('contextmenu', e => { if (drag.el) e.preventDefault(); });
function endDrag(cancel) {
  clearTimeout(drag.timer);
  if (!drag.el) return;
  const { active, from, to, list, items } = drag;
  drag.el.classList.remove('dragging'); if (list) list.classList.remove('drag-on');
  (items || []).forEach(x => { x.style.transform = ''; });
  drag.el = null; drag.active = false;
  if (!active) return;
  drag.dropped = performance.now(); // the click that ends a drag isn't a tap
  if (cancel || to === from) return;
  if (list.dataset.dragList === 'routines') { const rs = routinesIn(UI.planId), [mv] = rs.splice(from, 1); rs.splice(to, 0, mv); rs.forEach((x, k) => { if (x.order !== k) { x.order = k; saveRoutine(x); } }); render(); return; }
  const r = curRoutine(); if (!r) return;
  const arr = list.dataset.dragList === 'parts' ? (sheetBlock() || {}).parts : r.blocks; if (!arr) return;
  const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved);
  saveRoutine(r); render();
}
document.addEventListener('pointerup', e => { if (e.pointerId === drag.pid) endDrag(false); });
document.addEventListener('pointercancel', e => { if (e.pointerId === drag.pid) endDrag(true); });

// ---------- Android back ----------
// Each open screen and sheet gets a history entry, so the back gesture closes the editor you're in rather than the app.
// Back keeps your changes, like Done; Cancel is there to throw them away.
let hDepth = (history.state && history.state.d) || 0, ignorePop = 0;
function syncHistory() {
  let want = UI.screen === 'today' ? 0 : PDETAIL.includes(UI.screen) ? 2 : 1;
  if (UI.screen === 'pex' && UI.pFrom && UI.pFrom !== 'plifts') { want = UI.pFrom === 'today' ? 1 : 2; for (let s = UI.pSheet; s; s = s.parent) want++; }
  for (let s = UI.sheet; s; s = s.parent) want++;
  while (hDepth < want) { hDepth++; history.pushState({ d: hDepth }, ''); }
  if (hDepth > want) { ignorePop++; history.go(want - hDepth); hDepth = want; }
}
function goBack() {
  const sh = UI.sheet;
  if (sh) { if (UI.screen === 'edit') (sh.type === 'pick' ? A.pickCancel : A.done)(); else A.close(); return; }
  if (PDETAIL.includes(UI.screen)) A.pBack(); else if (UI.screen === 'progress' || UI.screen === 'settings') A.tab({ v: 'today' });
  else if (UI.screen === 'edit') A.editDone(); else if (UI.screen === 'plan') A.planDone(); else if (UI.screen === 'train') A.toToday(); else if (UI.screen === 'summary') A.summaryDone(); else render();
}
window.addEventListener('popstate', e => {
  if (ignorePop) { ignorePop--; return; }
  commitPending();
  hDepth = (e.state && e.state.d) || 0;
  goBack();
});

// Lines under a sheet's header and over its footer, only when there's something scrolled past them.
function sheetEdges() {
  const b = document.querySelector('.sh-b'); if (!b) return;
  b.parentNode.classList.toggle('scrolled', b.scrollTop > 1);
  b.parentNode.classList.toggle('more', b.scrollTop + b.clientHeight < b.scrollHeight - 1);
}
$app.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('sh-b')) sheetEdges(); }, true);

// ---------- on-screen keyboard ----------
// Chrome on Android shrinks the page when the keyboard opens (interactive-widget=resizes-content in index.html).
// Where a browser only shrinks the visible area instead, this lifts sheets above the keyboard and keeps the focused field in view.
const vv = window.visualViewport;
let fullH = 0, fullW = 0;
function fitKeyboard() {
  const root = document.documentElement, kb = Math.max(0, Math.round(root.clientHeight - vv.height - vv.offsetTop));
  if (vv.width !== fullW) { fullW = vv.width; fullH = 0; } // rotated: start again
  fullH = Math.max(fullH, vv.height);
  const opened = fullH - vv.height > 120 && !root.classList.contains('kb');
  root.classList.toggle('kb', fullH - vv.height > 120);
  root.style.setProperty('--kb', kb + 'px');
  root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
  sheetEdges();
  const ae = document.activeElement;
  if (ae && ae.matches('input, textarea') && ae.closest('.sh-b')) ae.scrollIntoView({ block: opened ? 'center' : 'nearest' });
}
if (vv) { vv.addEventListener('resize', fitKeyboard); vv.addEventListener('scroll', fitKeyboard); fitKeyboard(); }

// ---------- training screens ----------
// Progress: one bar per exercise, filled as its sets get done. Tap it for the workout list (reorder, skip, do one now).
function blockSets(b) { return b.kind === 'check' ? null : (b.kind === 'ss' ? b.parts : [b]).flatMap(p => p.sets); }
function blockState(b) {
  const sets = blockSets(b);
  if (!sets) return b.done ? 'done' : b.skipped ? 'skipped' : 'open';
  if (sets.some(isOpen)) return 'open';
  return sets.some(x => x.done) ? 'done' : 'skipped';
}
function pipsHtml(c, resting, still) {
  const open = nextOpen(c);
  let fin = 0;
  const segs = c.blocks.map((b, bi) => {
    const sets = blockSets(b), work = sets ? sets.filter(x => x.kind === 'work') : null, st = blockState(b);
    if (st !== 'open') fin++;
    const pct = work ? 100 * work.filter(x => x.done).length / Math.max(1, work.length) : b.done ? 100 : 0;
    return '<span class="seg' + (!resting && open && open.bi === bi ? ' cur' : '') + (st === 'skipped' ? ' sk' : '') + '"><i style="width:' + Math.round(pct) + '%"></i></span>';
  }).join('');
  const label = fin + ' of ' + c.blocks.length + ' done';
  return still ? '<div class="pips" role="img" aria-label="' + label + '">' + segs + '</div>' : '<button class="pips" data-a="plan" aria-label="' + label + '. Tap to reorder or skip">' + segs + '</button>';
}
function topHtml(c, resting) {
  return '<div class="top"><button class="icon" data-a="toToday" aria-label="Back to Today">' + ICON.back + '</button>' +
    '<div class="top-mid"><span class="dim">' + esc(c.name) + '</span><span data-tick="elapsed">' + mmss(now() - c.startedAt) + '</span></div>' +
    '<button class="txtbtn" data-a="askFinish">Finish</button></div>' + pipsHtml(c, resting);
}
const overHtml = c => (c.over ? '<div class="over" role="status"><span>' + ICON.timer + 'Rest is up, you’re on</span><span data-tick="over">' + mmss(now() - c.over.since) + ' over</span></div>' : '');
// ---------- the lift screen ----------
function lastSet(b, wi) { const last = lastFor(b.exId, b.lo, b.hi); return last ? last.all.filter(y => y.done)[wi] || null : null; }
function setLabel(b, i) { const x = b.sets[i], n = b.sets.slice(0, i + 1).filter(y => y.kind === x.kind).length; return (x.kind === 'warm' ? 'Warm-up ' : 'Set ') + n; }
// Set label; on working sets it's also the button for the set type (Working / Drop set / To failure).
function cardLab(b, x, i, fixing) {
  const label = setLabel(b, i) + (x.kind === 'work' && x.type ? ' · ' + TYPES[x.type] : '') + (fixing ? ', fixing' : '');
  return x.kind === 'work' ? '<button class="cardlab" data-a="type" aria-label="' + label + '. Tap to change the set type">' + esc(label) + ICON.down + '</button>' : '<b class="cardlab">' + esc(label) + '</b>';
}
function lastLine(b, x, i) {
  if (x.kind === 'warm') return '';
  const lw = lastSet(b, b.sets.slice(0, i).filter(y => y.kind === 'work').length);
  return lw ? 'last ' + setTxt(lw) + unit(lw.kg) : '';
}
// The list of sets. Finished warm-ups fold into one row; nothing says "no last time" over and over.
function setRows(c, t, b, card) {
  const warms = b.sets.filter(x => x.kind === 'warm'), fixI = c.fix && c.fix.bi === t.bi ? c.fix.i : -1;
  const fold = warms.length > 1 && warms.every(x => !isOpen(x)) && !UI.showWarm && !(fixI >= 0 && b.sets[fixI].kind === 'warm');
  let out = fold ? '<button class="row warm fold" data-a="showWarm" aria-label="' + warms.length + ' warm-ups done. Tap to show them"><span class="rl">Warm-ups</span><span class="rv">' + warms.length + ' done</span><span class="rlast"></span>' + ICON.check + '</button>' : '';
  b.sets.forEach((x, i) => {
    if (fold && x.kind === 'warm') return;
    const label = setLabel(b, i), isCur = fixI >= 0 ? fixI === i : i === t.i, cls = 'row' + (x.kind === 'warm' ? ' warm' : '') + (isCur ? ' now' : '');
    if (isCur && card) { out += card(x, i); return; }
    const kg = x.kg ? ' <small>kg</small>' : '', id = isCur ? ' id="card"' : '';
    const just = UI.lastLog && UI.lastLog.bi === t.bi && UI.lastLog.i === i && UI.lastLog.p == null;
    if (x.done && !isCur) out += '<button class="' + cls + '" data-a="row" data-bi="' + t.bi + '" data-i="' + i + '" aria-label="' + label + ', ' + esc(setTxt(x)) + '. Tap to edit"><span class="rl">' + label + '</span><span class="rv">' + esc(setTxt(x)) + kg + '</span><span class="rlast"></span>' + (just ? '<span class="editlbl">Edit</span>' : ICON.check) + '</button>';
    else if (x.skipped && !isCur) out += '<button class="' + cls + ' pending" data-a="row" data-bi="' + t.bi + '" data-i="' + i + '" aria-label="' + label + ' skipped. Tap to do it"><span class="rl">' + label + '</span><span class="rv">Skipped</span><span class="rlast">tap to do it</span><span></span></button>';
    else out += '<div class="' + cls + (isCur ? '' : ' pending') + '"' + id + '><span class="rl">' + label + '</span><span class="rv">' + (x.kg == null ? esc(plural(x.reps, 'rep')) : x.reps + ' × ' + esc(kgVal(x.kg)) + kg) + '</span><span class="rlast">' + esc(isCur ? '' : lastLine(b, x, i)) + '</span><span></span></div>';
  });
  return out;
}
// A name with › after its last word, so the arrow wraps with the word instead of sitting off at the edge.
function chevName(name) { const k = name.lastIndexOf(' ') + 1; return esc(name.slice(0, k)) + '<span class="nw">' + esc(name.slice(k)) + ICON.chev + '</span>'; }
function liftHead(c, t, b) {
  const ex = exById(b.exId), note = ex && ex.notes;
  return '<div class="head"><h1><button class="h1btn' + (b.name.length > 14 ? ' sm' : '') + '" data-a="openEx" data-bi="' + t.bi + '">' + chevName(b.name) + '</button></h1></div>' +
    (note ? '<button class="notebtn" data-a="openEx" data-bi="' + t.bi + '" aria-label="Notes: ' + esc(note) + '. Tap to edit"><span class="note">' + esc(note) + '</span></button>' : '');
}
function liftActions(c, b, t) {
  const tx = b.sets[t.i];
  const label = c.fix ? 'Save' : tx.kg == null ? 'Set a weight' : 'Log ' + (tx.kind === 'warm' ? 'warm-up ' : 'set ') + b.sets.slice(0, t.i + 1).filter(y => y.kind === tx.kind).length;
  return '<div class="actions">' + (c.fix ? '<button class="skip" data-a="fixCancel">Cancel</button>' : '<button class="skip" data-a="skip">Skip</button>') + '<button class="primary" data-a="log">' + label + '</button></div>';
}
// The set you're on: big numbers you can tap to type, with − and + under each.
function bigSet(b, x) {
  const v = kgVal(x.kg), size = v.length >= 5 ? ' s' : v.length >= 4 ? ' m' : '';
  const W = workKg(b);
  const cap1 = x.kind !== 'warm' ? 'reps · aim ' + range(b.lo, b.hi) : x.frac === 'easy' ? 'easy reps' : x.frac === 'bar' ? 'empty bar' : typeof x.frac === 'number' && W ? Math.round(x.frac * 100) + '% of ' + kgVal(W) + unit(W) : 'reps';
  const cap2 = x.kg == null ? (x.kind === 'warm' && b.warmAuto !== false ? 'set working weight' : 'set a weight') : x.kg === 0 ? 'bodyweight' : b.equip === 'dumbbell' ? 'kg each' : 'kg';
  const col = (val, cls, pad, dn, up, cap, name, less, more) => '<div class="fcol"><button class="fval' + cls + '" data-a="' + pad + '" aria-label="' + name + ': ' + esc(val) + ', tap to type">' + esc(val) + '</button>' +
    '<div class="fpm"><button data-a="' + dn + '" aria-label="' + less + '">' + ICON.minus + '</button><button data-a="' + up + '" aria-label="' + more + '">' + ICON.plus + '</button></div><span class="fcap">' + esc(cap) + '</span></div>';
  return '<div class="fnums">' + col(String(x.reps), '', 'padReps', 'repsDn', 'repsUp', cap1, 'Reps', 'One fewer rep', 'One more rep') + '<span class="fx" aria-hidden="true">×</span>' +
    col(v, size + (x.kg == null ? ' unset' : ''), 'padKg', 'kgDn', 'kgUp', cap2, 'Weight', 'Less weight', 'More weight') + '</div>';
}
function liftScreen(c, t) {
  const b = liftAt(c, t);
  const card = (x, i) => '<div class="card hero" id="card"><div class="card-h">' + cardLab(b, x, i, !!c.fix) + '<span class="dim small">' + esc(lastLine(b, x, i)) + '</span></div>' + bigSet(b, x) + '</div>';
  return topHtml(c) + overHtml(c) + liftHead(c, t, b) +
    '<div class="scroll" id="scroll">' + setRows(c, t, b, card) + '<button class="addbtn" data-a="add">' + ICON.plus + 'Add a set</button></div>' + liftActions(c, b, t);
}
function ssScreen(c, t) {
  const blk = c.blocks[t.bi], R = Math.max(...blk.parts.map(p => p.sets.length));
  const fx = c.fix && c.fix.bi === t.bi && c.fix.p != null ? c.fix : null, cp = fx ? fx.p : t.p, r = fx ? fx.i : t.i;
  const panels = blk.parts.map((p, pi) => {
    const letter = LETTERS[pi], x = p.sets[r];
    if (pi === cp) {
      const lw = lastSet(p, r);
      return '<section class="panel hero7" id="card" aria-label="' + letter + ', ' + esc(p.name) + (fx ? ', editing' : ', now') + '"><div class="panel-h"><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="badge" aria-hidden="true">' + letter + '</span><h2 style="margin:0;min-width:0"><button class="namebtn" data-a="openEx" data-bi="' + t.bi + '" data-p="' + pi + '">' + chevName(p.name) + '</button></h2></div>' +
        '<span class="dim small" style="flex:none">' + esc(fx ? 'editing' : lw ? 'last ' + setTxt(lw) + unit(lw.kg) : '') + '</span></div>' + bigSet(p, x) + '</section>';
    }
    const sub = !x ? 'No set this round' : x.done ? 'Done: ' + setTxt(x) + unit(x.kg) : x.skipped ? 'Skipped' : 'Up next: ' + (x.kg == null ? plural(x.reps, 'rep') : setTxt(x) + unit(x.kg));
    const head = '<span class="badge o" aria-hidden="true">' + letter + '</span><span style="flex:1;min-width:0"><b>' + esc(p.name) + '</b><span class="sub">' + esc(sub) + '</span></span>';
    if (x && x.done && !fx) {
      const just = UI.lastLog && UI.lastLog.bi === t.bi && UI.lastLog.p === pi && UI.lastLog.i === r;
      return '<button class="collapsed" data-a="row" data-bi="' + t.bi + '" data-p="' + pi + '" data-i="' + r + '" aria-label="' + letter + ', ' + esc(p.name) + ': ' + esc(sub) + '. Tap to edit">' + head + (just ? '<span class="editlbl">Edit</span>' : ICON.check) + '</button>';
    }
    const canPick = !fx && isOpen(x);
    return '<button class="collapsed" ' + (canPick ? 'data-a="pick" data-bi="' + t.bi + '" data-p="' + pi + '"' : 'disabled style="opacity:1"') + ' aria-label="' + letter + ', ' + esc(p.name) + ': ' + esc(sub) + (canPick ? '. Tap to do this one first' : '') + '">' + head + (canPick ? ICON.down : '') + '</button>';
  });
  const others = blk.parts.filter((p, pi) => pi !== cp && isOpen(p.sets[r]));
  const lastRound = !blk.parts.some(p => p.sets.some((y, k) => k > r && isOpen(y)));
  const names = others.map(p => p.name), list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  const note = fx ? 'Editing round ' + (r + 1) : others.length ? 'Then ' + list + ', then ' + secTxt(blk.rest) + ' rest' : lastRound ? 'Last round' : 'Then ' + secTxt(blk.rest) + ' rest';
  const tx = blk.parts[cp].sets[r];
  return topHtml(c) + overHtml(c) +
    '<div class="sshead"><div><div class="eyebrow">' + ICON.link + 'Superset</div><h1 class="h1" style="margin-top:4px">Round ' + (r + 1) + ' of ' + R + '</h1></div></div>' +
    '<div class="scroll" id="scroll" style="margin-top:14px">' + panels.join('<div class="link" aria-hidden="true"><i></i>no rest</div>') +
    '<p class="dim small" style="padding-top:10px">' + esc(note) + '</p></div>' +
    '<div class="actions" style="padding-top:12px">' + (fx ? '<button class="skip" data-a="fixCancel">Cancel</button>' : '<button class="skip" data-a="skip">Skip</button>') + '<button class="primary" data-a="log">' + (fx ? 'Save' : tx.kg == null ? 'Set a weight' : 'Log ' + esc(blk.parts[cp].name)) + '</button></div>';
}
function checkScreen(c, t) {
  const b = c.blocks[t.bi];
  const items = b.items.map((it, ii) => {
    let right;
    if (it.timer) {
      const run = c.cardio && c.cardio.bi === t.bi && c.cardio.it === ii;
      right = it.ticks[0] && !run ? '<button class="tick on" data-a="tick" data-bi="' + t.bi + '" data-it="' + ii + '" data-k="0" aria-label="' + esc(it.text) + ', done">' + ICON.check + '</button>'
        : '<button class="pill' + (run ? ' run' : '') + '" data-a="cardio" data-bi="' + t.bi + '" data-it="' + ii + '">' + (run ? '<span data-tick="cardio">' + mmss(c.cardio.endsAt - now()) + '</span> · Stop' : 'Start ' + secTxt(it.timer)) + '</button>';
    } else right = '<div class="ck-sets">' + it.ticks.map((on, k) => '<button class="tick' + (on ? ' on' : '') + '" data-a="tick" data-bi="' + t.bi + '" data-it="' + ii + '" data-k="' + k + '" aria-pressed="' + on + '" aria-label="' + esc(it.text) + (it.ticks.length > 1 ? ', round ' + (k + 1) : '') + '">' + ICON.check + '</button>').join('') + '</div>';
    return '<div class="ck"><div class="ck-t"><b>' + esc(it.text) + '</b>' + (it.detail ? '<span>' + esc(it.detail) + '</span>' : '') + '</div>' + right + '</div>';
  }).join('');
  const nb = c.blocks[t.bi + 1];
  return topHtml(c) +
    '<div class="head"><h1 class="h1">' + esc(b.name) + '</h1></div>' + (b.sub ? '<p class="dim" style="flex:none">' + esc(b.sub) + '</p>' : '') +
    '<div class="scroll" id="scroll" style="margin-top:8px">' + items + '</div>' +
    '<div class="actions"><button class="skip" data-a="skip">Skip</button><button class="primary" data-a="checkDone">Done</button></div>' +
    '<p class="then">' + (nb ? 'Then ' + esc(blockTitle(nb)) : '') + '</p>';
}
function restScreen(c) {
  const r = c.rest, from = r.from, b = liftAt(c, from), x = b.sets[from.i];
  const workIdx = b.sets.slice(0, from.i).filter(y => y.kind === 'work').length, warmIdx = b.sets.slice(0, from.i + 1).filter(y => y.kind === 'warm').length;
  const cmp = compare(b, x, workIdx);
  const best = x.kind === 'work' && x.kg ? Math.max(0, ...historyFor(b.exId, 50).flatMap(h => h.sets.map(y => e1(y.reps, y.kg)))) : 0;
  const pr = best > 0 && e1(x.reps, x.kg) > best + 1e-9;
  const nx = nextOpen(c);
  let nextLine = '';
  if (nx) { const nbk = c.blocks[nx.bi]; if (nbk.kind === 'check') nextLine = esc(nbk.name); else { const nl = liftAt(c, nx), y = nl.sets[nx.i]; nextLine = (nl === b ? '' : esc(nl.name) + ', ') + (y.kind === 'warm' ? 'warm-up' : 'set ' + nl.sets.slice(0, nx.i + 1).filter(z => z.kind === 'work').length) + ', <b>' + esc(setTxt(y)) + unit(y.kg) + '</b>'; } }
  const left = Math.max(0, r.endsAt - now()), frac = Math.min(1, left / (r.total * 1000)), col = left <= 10500 ? 'var(--gold)' : 'var(--cream)';
  const canChange = nx && c.blocks[nx.bi].kind !== 'check';
  const logged = x.kind === 'warm' ? 'Warm-up ' + warmIdx + ': <b>' + esc(setTxt(x)) + unit(x.kg) + '</b>' : 'Set ' + (workIdx + 1) + ': <b>' + esc(setTxt(x)) + unit(x.kg) + '</b>, <span style="color:' + (cmp.good ? 'var(--gold)' : 'var(--cream-2)') + ';font-weight:500">' + esc(cmp.txt) + '</span>';
  return topHtml(c, true) +
    '<div class="head" style="padding-top:12px"><h1><button class="h1btn sm" data-a="openEx" data-bi="' + from.bi + '"' + (from.p != null ? ' data-p="' + from.p + '"' : '') + '>' + chevName(b.name) + '</button></h1></div>' +
    '<div style="flex:1;min-height:8px"></div>' +
    '<div class="ringwrap" data-tick="rest"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" fill="none" stroke="var(--track)" stroke-width="14"/><circle class="arc" cx="150" cy="150" r="140" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="879.6" stroke-dashoffset="' + r2(879.6 * (1 - frac)) + '" transform="rotate(-90 150 150)" style="stroke:' + col + '"/><circle class="knob" cx="150" cy="10" r="12" stroke="var(--rest)" stroke-width="4" style="fill:' + col + ';transform:rotate(' + r2(360 * frac) + 'deg);transform-origin:150px 150px"/></svg>' +
    '<div class="ringtxt" role="timer"><div class="big" style="color:' + col + '">' + mmss(left) + '</div><div class="dim tot" style="font-size:17px;margin-top:6px">left of ' + secTxt(r.total) + '</div></div></div>' +
    '<div class="adjust"><button data-a="restLess" aria-label="15 seconds less rest">−15 s</button><button data-a="restMore" aria-label="15 seconds more rest">+15 s</button></div>' +
    '<div style="flex:1;min-height:8px"></div>' +
    '<div class="lines"><div class="line"><span class="okdot">' + ICON.check + '</span><span class="t">' + logged + '</span>' + (pr ? '<span class="prtag">PR</span>' : '') + '<button class="ltxt" data-a="restEdit" aria-label="Edit the set you just logged">Edit</button></div>' +
    (nx ? '<div class="line"><span class="t"><span class="dim">Next:</span> ' + nextLine + '</span>' + (canChange ? '<button class="ltxt" data-a="change" aria-label="Change the next set">Change' + ICON.chev + '</button>' : '') + '</div>' : '') + '</div>' +
    '<div class="actions" style="padding-top:16px"><button class="primary" data-a="skipRest">Skip rest</button></div>';
}

// ---------- paper screens ----------
const blockName = b => (b.kind === 'check' ? b.name || 'Checklist' : b.kind === 'ss' ? (b.parts || []).map(p => exName(p.exId)).join(' + ') || 'Superset' : exName(b.exId));
function backupTxt() { const t = S.settings.lastBackup; return t ? 'Backed up ' + dateTxt(t) : S.sessions.length ? 'Not backed up yet' : 'On this phone'; }
function todayScreen() {
  const d = new Date(), c = S.cur, rs = routinesSorted(), sug = suggestedRoutine(), sel = routineById(UI.sel) || sug;
  let main;
  if (c) main = '<div class="wcard" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><b style="font-size:22px;min-width:0">' + esc(c.name) + '</b><span data-tick="elapsed" style="font-size:17px">' + mmss(now() - c.startedAt) + '</span></div><div style="margin-top:10px">' + pipsHtml(c, false, true) + '</div><button class="primary" style="width:100%;margin-top:16px" data-a="resume">Resume</button></div>';
  else {
    const ap = activePlan(), inPlan = ap ? routinesIn(ap.id) : [], plans = plansSorted().filter(pl => pl !== ap), loose = routinesIn(null);
    const rrow = r => '<button class="orow" data-a="pickRoutine" data-id="' + esc(r.id) + '"><span style="min-width:0"><b>' + esc(r.name || 'Untitled routine') + '</b><span class="sub">' + esc(routineSummary(r)) + '</span></span>' + (r === sug ? '<span class="tag">Next</span>' : '') + ICON.chev + '</button>';
    const prow = pl => { const n = routinesIn(pl.id).length; return '<button class="orow" data-a="planOpen" data-id="' + esc(pl.id) + '"><span style="min-width:0"><b>' + esc(pl.name || 'Untitled plan') + '</b><span class="sub">' + (n ? plural(n, 'routine') : 'No routines yet') + '</span></span>' + ICON.chev + '</button>'; };
    const list = (title, rows, link) => rows.length || link ? '<div class="sechead"><h2 class="h2 sm">' + title + '</h2>' + (link || '') + '</div>' + (rows.length ? '<div class="others">' + rows.join('') + '</div>' : '') : '';
    const buttons = '<div class="twobtn"><button class="ghost ink" data-a="newRoutine">' + ICON.plus + 'New routine</button><button class="ghost ink" data-a="planNew">' + ICON.plus + 'New plan</button></div>';
    let hero = '';
    if (ap && !inPlan.length) hero = '<p class="eyebrow2">Your plan</p><div class="wcard hero4"><b class="hn">' + esc(ap.name || 'Untitled plan') + '</b><span class="hm">No routines in it yet</span><div class="cardbtns"><button class="primary" data-a="planOpen" data-id="' + esc(ap.id) + '">Add routines</button></div></div>';
    else if (sel) hero = (sel === sug ? '<p class="eyebrow2">Next up' + (ap ? ' · ' + esc(ap.name || 'Untitled plan') : '') + '</p><div class="wcard hero4">' : '<div class="wcard hero4 solo">') + '<b class="hn">' + esc(sel.name || 'Untitled routine') + '</b><span class="hm">' + esc(routineSummary(sel)) + '</span>' +
      '<p class="hx">' + esc((sel.blocks || []).map(blockName).join(' · ') || 'Empty') + '</p>' +
      '<div class="cardbtns"><button class="ghost" data-a="editRoutine" data-id="' + esc(sel.id) + '">Edit</button><button class="primary" data-a="start">Start</button></div></div>';
    if (!rs.length && !(S.plans || []).length) main = buttons.replace('class="twobtn"', 'class="twobtn first"');
    else if (ap) main = hero +
      list('In this plan', inPlan.filter(r => r !== sel).map(rrow), '<button class="txtlink" data-a="planOpen" data-id="' + esc(ap.id) + '">Edit plan</button>') +
      list('Other plans', plans.map(prow)) + list('Not in a plan', loose.filter(r => r !== sel).map(rrow)) + buttons;
    else main = hero + list(plans.length ? 'Routines' : 'Other routines', loose.filter(r => r !== sel).map(rrow)) + list('Plans', plans.map(prow)) + buttons;
  }
  const hist = sortedSessions().slice(0, 6);
  return '<div class="screen paperscreen tabbed">' +
    '<p class="date">' + d.toLocaleDateString('en-NZ', { weekday: 'long' }) + ' ' + d.getDate() + ' ' + d.toLocaleDateString('en-NZ', { month: 'long' }) + '</p><h1 class="h1">Today</h1>' + weighRow() + main +
    (hist.length ? '<h2 class="h2">Recent</h2>' + hist.map(s => { const n = liftsOf(s).reduce((a, b) => a + b.sets.filter(x => x.kind === 'work' && x.done).length, 0); return '<button class="hist" data-a="openSession" data-id="' + esc(s.id) + '"><span><b>' + esc(dateTxt(s.endedAt)) + '</b> · ' + esc(s.name) + '</span><span>' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + ' min, ' + n + ' sets</span></button>'; }).join('') : '') +
    '<div class="foot"><span>' + esc(backupTxt()) + '</span><div><button data-a="backup">Backup</button><button data-a="openSettings">Settings</button></div></div></div>' + tabbarHtml('today');
}
// A plan: its name, its routines (drag to reorder, tap to edit), Use this plan, and Add.
const gripHtml = '<span class="grip" data-grip aria-hidden="true">' + ICON.grip + '</span>';
function planScreen() {
  const pl = planById(UI.planId); if (!pl) { UI.screen = 'today'; return todayScreen(); }
  const rs = routinesIn(pl.id), using = S.settings.plan === pl.id;
  const rows = rs.map(r => '<button class="blk" data-a="planRoutine" data-id="' + esc(r.id) + '" data-drag>' + gripHtml + '<span class="m"><b>' + esc(r.name || 'Untitled routine') + '</b><span class="sub">' + esc(routineSummary(r)) + '</span></span>' + ICON.chev + '</button>').join('');
  return '<div class="screen paperscreen">' +
    '<div class="etop"><button data-a="planDone">' + ICON.back + 'Today</button><span class="etop-r"><button class="dots3" data-a="pMenu" aria-label="Plan options">•••</button><button data-a="planDone">Done</button></span></div>' +
    '<input id="p-name" class="pin" autocapitalize="sentences" enterkeyhint="done" data-pf="name" value="' + esc(pl.name) + '" placeholder="Plan name" aria-label="Plan name" autocomplete="off">' +
    (using ? '<p class="planstate">' + ICON.check + 'You’re using this plan</p>' : '<button class="primary dark useplan" data-a="planUse">Use this plan</button>') +
    (rows ? '<div class="blks" data-drag-list="routines">' + rows + '</div>' : '<p class="planempty">No routines in this plan yet.</p>') +
    '<button class="addone" data-a="planAdd">' + ICON.plus + 'Add</button></div>';
}
function planAddSheet() {
  const pl = planById(UI.planId), out = routinesSorted().filter(r => planOf(r) !== UI.planId);
  const row = (a, label, sub, extra) => '<button class="menurow" data-a="' + a + '"' + (extra || '') + '>' + (sub == null ? ICON.plus : '') + '<span>' + esc(label) + (sub != null ? '<small class="menusub">' + esc(sub) + '</small>' : '') + '</span></button>';
  return sheetBox('Add to ' + ((pl && pl.name) || 'plan'), '<h2>Add</h2>', '<div class="menu">' + row('newRoutine', 'New routine') + row('planPaste', 'Paste JSON') + '</div>' +
    (out.length ? '<p class="menuhead">Move a routine in</p><div class="menu">' + out.map(r => row('planMoveIn', r.name || 'Untitled routine', planOf(r) ? 'In ' + (planById(planOf(r)).name || 'another plan') : 'Not in a plan', ' data-id="' + esc(r.id) + '"')).join('') + '</div>' : ''),
    '<button class="wide" data-a="close">Cancel</button>');
}
function planMenuSheet() {
  const pl = planById(UI.planId); if (!pl) return '';
  const using = S.settings.plan === pl.id;
  return sheetBox('Plan', '<h2>' + esc(pl.name || 'Untitled plan') + '</h2>', '<div class="menu">' +
    (using ? '<button class="menurow" data-a="planStop"><span>Stop using this plan</span></button>' : '<button class="menurow" data-a="planUse"><span>Use this plan</span></button>') +
    '<button class="menurow danger" data-a="planDelete"><span>Delete plan<small class="menusub">Its routines are kept</small></span></button></div>', '<button class="wide" data-a="close">Close</button>');
}
// Which plan a routine is in, from its ••• menu.
function rPlanSheet() {
  const r = curRoutine(); if (!r) return '';
  const cur = planOf(r), row = (id, label) => '<button class="menurow' + (id === cur ? ' on' : '') + '" data-a="rPlanSet" data-id="' + esc(id || '') + '" aria-pressed="' + (id === cur) + '"><span>' + esc(label) + '</span>' + (id === cur ? ICON.check : '') + '</button>';
  return sheetBox('Plan', '<h2>Which plan?</h2>', '<div class="menu">' + plansSorted().map(pl => row(pl.id, pl.name || 'Untitled plan')).join('') + row(null, 'Not in a plan') + '</div>', '<button class="wide" data-a="close">Close</button>');
}
function editScreen() {
  const r = curRoutine(); if (!r) { UI.screen = 'today'; return todayScreen(); }
  const rows = (r.blocks || []).map((b, bi) => {
    let name, sub;
    if (b.kind === 'check') { name = b.name || 'Checklist'; sub = (b.items || []).filter(it => it.text).map(it => it.text).join(', ') || 'Checklist'; }
    else if (b.kind === 'ss') { name = (b.parts || []).map(p => exName(p.exId)).join(' + ') || 'Empty superset'; sub = 'Superset, ' + ((b.parts || []).map(p => (p.sets || 3) + ' × ' + repsTxt(p)).join(', ') || 'no exercises') + ', rest ' + secTxt(b.rest || 0); }
    else { name = exName(b.exId); sub = (b.sets || 3) + ' × ' + repsTxt(b) + ', rest ' + secTxt(b.rest || 0) + (b.warm ? ', ' + plural(b.warm, 'warm-up') : ''); }
    return '<button class="blk" data-a="openBlock" data-bi="' + bi + '" data-drag>' + gripHtml + '<span class="m"><b>' + esc(name) + '</b><span class="sub">' + esc(sub) + '</span></span>' + ICON.chev + '</button>';
  }).join('');
  return '<div class="screen paperscreen">' +
    '<div class="etop"><button data-a="editDone" class="backname">' + ICON.back + '<span>' + esc(UI.from === 'plan' && planById(UI.planId) ? planById(UI.planId).name || 'Plan' : 'Today') + '</span></button><span class="etop-r"><button class="dots3" data-a="rMenu" aria-label="Routine options">•••</button><button data-a="editDone">Done</button></span></div>' +
    '<input id="r-name" class="pin" autocapitalize="sentences" enterkeyhint="done" data-rf="name" value="' + esc(r.name) + '" placeholder="Routine name" aria-label="Routine name" autocomplete="off">' +
    (rows ? '<div class="blks" data-drag-list="blocks">' + rows + '</div>' : '') +
    '<button class="addone" data-a="addMenu">' + ICON.plus + 'Add</button>' +
    (rows ? '' : '<button class="ghost ink" data-a="pasteOpen">Paste JSON</button>') + '</div>';
}
// Exercises in the order they were done (Do now can change it), by each one's first logged set.
function liftsInOrderDone(s) {
  const first = b => Math.min(Infinity, ...b.sets.filter(x => x.done && x.at).map(x => x.at));
  return liftsOf(s).map((b, k) => [b, first(b), k]).sort((p, q) => (p[1] - q[1]) || (p[2] - q[2])).map(p => p[0]);
}
// "6, 6, 5 @ 110 kg", and when the weight changed, "6, 6 @ 110 · 5, 5 @ 107.5 kg".
function setsLine(dn) {
  const runs = [];
  dn.forEach(x => { const last = runs[runs.length - 1]; if (last && last.kg === x.kg) last.reps.push(x.reps); else runs.push({ kg: x.kg, reps: [x.reps] }); });
  return runs.map(g => g.reps.join(', ') + ' @ ' + kgVal(g.kg)).join(' · ') + (dn.some(x => x.kg) ? ' kg' : '');
}
function summaryScreen() {
  const s = UI.summary; if (!s) return todayScreen();
  let sets = 0, skipped = 0;
  const rows = [], skippedNames = [];
  const prev = S.sessions.filter(o => o.id !== s.id).sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  liftsInOrderDone(s).forEach(b => {
    const work = b.sets.filter(x => x.kind === 'work'), dn = work.filter(x => x.done);
    sets += dn.length; skipped += work.filter(x => x.skipped).length;
    if (!dn.length) { skippedNames.push(b.name); return; }
    let ld = null;
    for (const o of prev) { const m = liftsOf(o).find(y => y.exId === b.exId && y.lo === b.lo && y.hi === b.hi); if (m) { const d = m.sets.filter(x => x.kind === 'work' && x.done); if (d.length) { ld = d; break; } } }
    rows.push(Object.assign({ name: b.name, detail: setsLine(dn) }, onLast(dn, ld)));
  });
  const recs = allRecords().filter(r => r.sid === s.id);
  return '<div class="screen paperscreen"><p class="date">Done</p><h1 class="h1">' + esc(s.name) + '</h1>' +
    '<div class="stats"><div><b>' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + '</b> <small>min</small><div>time</div></div><div><b>' + sets + '</b> <small>sets</small><div>' + (skipped ? skipped + ' skipped' : 'none skipped') + '</div></div><div><b>' + recs.length + '</b> <small>' + (recs.length === 1 ? 'record' : 'records') + '</small><div>' + (recs.length ? 'new' : 'not this time') + '</div></div></div>' +
    recs.map(r => '<div class="pr"><div class="stamp" aria-hidden="true"><i>PR</i></div><span class="prt"><b>' + esc(exName(r.id)) + '</b><span>' + esc(recLine(r)) + '</span></span></div>').join('') +
    '<h2 class="h2">Exercises</h2>' + rows.map(x => '<div class="xr"><div style="min-width:0"><div class="n">' + esc(x.name) + '</div><div class="d">' + esc(x.detail) + '</div></div><div class="r"><div class="cmp' + (x.up ? ' up' : '') + '">' + esc(x.cmp) + '</div></div></div>').join('') +
    (skippedNames.length ? '<p class="skipline"><b>Skipped</b> ' + esc(skippedNames.join(', ')) + '</p>' : '') +
    '<button class="primary dark" style="width:100%;margin-top:20px" data-a="summaryDone">Done</button></div>';
}
// How a lift went against last time: the weight if it changed, else the reps.
function onLast(dn, ld) {
  if (!ld) return { cmp: 'first time', up: false };
  const top = l => Math.max(...l.map(x => x.kg || 0)), reps = l => l.reduce((a, x) => a + x.reps, 0), dk = r2(top(dn) - top(ld)), dr = reps(dn) - reps(ld);
  if (dk) return { cmp: (dk > 0 ? '+' : '−') + fmt(Math.abs(dk)) + ' kg', up: dk > 0 };
  return { cmp: dr ? (dr > 0 ? '+' : '−') + plural(Math.abs(dr), 'rep') : 'same', up: dr > 0 };
}
// ---------- bodyweight ----------
const DAY = 864e5;
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const weighins = () => (S.weights || []).filter(w => w && w.kg > 0).slice().sort((a, b) => a.at - b.at);
const todaysWeigh = () => { const k = dayKey(now()); return (S.weights || []).find(w => dayKey(w.at) === k) || null; };
// The smoothed line. Default: the average of the last 7 days. Weighted (Settings): every weigh-in counts and recent ones
// most, halving about every 4 days, so a missed day or two doesn't jolt it.
function bwTrend() {
  const list = weighins(), out = []; let ema = null, prev = 0;
  list.forEach(w => {
    let avg;
    if (S.settings.bwAvg === 'weighted') { ema = ema == null ? w.kg : ema + (1 - Math.pow(0.85, Math.max(0.25, (w.at - prev) / DAY))) * (w.kg - ema); avg = ema; }
    else { const win = list.filter(x => x.at > w.at - 7 * DAY && x.at <= w.at); avg = win.reduce((a, x) => a + x.kg, 0) / win.length; }
    prev = w.at; out.push({ at: w.at, kg: w.kg, v: avg });
  });
  return out;
}
// Now: the average, the change a week (over up to 4 weeks, once there are 10+ days), and how far to the goal.
function bwNow() {
  const tr = bwTrend(); if (!tr.length) return null;
  const last = tr[tr.length - 1], from = tr.find(x => x.at >= last.at - 28 * DAY) || tr[0], span = (last.at - from.at) / DAY;
  const rate = span >= 10 ? (last.v - from.v) / (span / 7) : null;
  const goal = S.settings.goalKg || null, toGo = goal ? last.v - goal : null;
  const weeks = goal && rate && Math.abs(toGo) > 0.05 && Math.sign(rate) === -Math.sign(toGo) ? Math.ceil(Math.abs(toGo / rate)) : null;
  return { avg: last.v, last: last.kg, lastAt: last.at, rate, goal, toGo, weeks, trend: tr };
}
// Waist: an optional weekly measurement (Settings).
const waists = () => (S.waists || []).filter(w => w && w.cm > 0).slice().sort((a, b) => a.at - b.at);
const todaysWaist = () => { const k = dayKey(now()); return (S.waists || []).find(w => dayKey(w.at) === k) || null; };
// The latest, and the change on about 4 weeks before (or the first measurement).
function waistNow() {
  const l = waists(); if (!l.length) return null;
  const last = l[l.length - 1], before = l.filter(w => w.at <= last.at - 6 * DAY), base = before.filter(w => w.at <= last.at - 27 * DAY).pop() || before[0] || null;
  return { last, list: l, chg: base ? last.cm - base.cm : null, weeks: base ? Math.max(1, Math.round((last.at - base.at) / (7 * DAY))) : 0 };
}
// Your bodyweight on a day: the latest weigh-in up to that day, else the first one after it.
function bwAt(t) { const l = weighins(); if (!l.length) return null; let b = null; for (const w of l) { if (dayKey(w.at) === dayKey(t) || w.at <= t) b = w; else break; } return (b || l[0]).kg; }
const sgn = (v, d = 1) => { const p = Math.pow(10, d), x = Math.round(Math.abs(v) * p) / p; return (v < 0 && x ? '−' : '+') + fmt(x); };
const kg1 = v => fmt(Math.round(v * 10) / 10);

// ---------- progress ----------
// Estimated 1-rep max from a set: weight × (1 + reps / 30); a single is just its weight.
const est1 = (reps, kg) => (!kg || !reps ? 0 : reps === 1 ? kg : kg * (1 + reps / 30));
const isBw = exId => (exById(exId) || {}).equip === 'bodyweight';
const weekOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
// n weeks on from a week's Monday (safe across daylight saving)
const weekAdd = (ws, n) => weekOf(ws + n * 7 * DAY + DAY / 2);
// Every session an exercise was in, oldest first: its best set, heaviest set and volume.
// A bodyweight lift counts your bodyweight that day plus anything added (when you've logged your weight).
function exSessions(exId) {
  const out = [];
  S.sessions.slice().sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0)).forEach(s => liftsOf(s).forEach(b => {
    if (b.exId !== exId) return;
    const bw = isBw(exId) ? bwAt(s.endedAt) || 0 : 0;
    const sets = b.sets.filter(x => x.kind === 'work' && x.done).map(x => ({ reps: x.reps, kg: x.kg || 0, load: (x.kg || 0) + bw }));
    if (!sets.length) return;
    const best = sets.reduce((a, x) => (est1(x.reps, x.load) > est1(a.reps, a.load) ? x : a));
    const top = sets.reduce((a, x) => (x.load > a.load || (x.load === a.load && x.reps > a.reps) ? x : a));
    out.push({ sid: s.id, at: s.endedAt, name: s.name, sets, best, e1: est1(best.reps, best.load), top, vol: sets.reduce((a, x) => a + x.reps * x.load, 0), most: Math.max(...sets.map(x => x.reps)), bw, noLoad: !sets.some(x => x.load) });
  }));
  return out;
}
const METRIC = { e1: x => x.e1, top: x => x.top.load, reps: x => x.most };
// What a lift is measured by: est. 1RM, unless you do it for high reps (the estimate isn't worth much past about 12),
// then your top set; reps alone when there's no weight at all.
function liftMetric(h) {
  if (h.every(x => x.noLoad)) return 'reps';
  const r = h.map(x => x.best.reps).sort((a, b) => a - b);
  return r[Math.floor(r.length / 2)] > 12 ? 'top' : 'e1';
}
// The best each week. This week isn't over, so it only shows once it beats last week.
function weekly(h, f) {
  const m = new Map(); h.forEach(x => { const k = weekOf(x.at), v = f(x); if (!m.has(k) || v > m.get(k).v) m.set(k, { at: x.at, v }); }); // plotted on the day you did it
  const out = [...m.values()].sort((a, b) => a.at - b.at), n = out.length;
  if (n > 1 && weekOf(out[n - 1].at) === weekOf(now()) && out[n - 1].v < out[n - 2].v) out.pop();
  return out;
}
// Lifts you've done, with a weekly line and the change over about four weeks; the most trained first.
function liftsSummary() {
  const ids = [...new Set(S.sessions.flatMap(s => liftsOf(s).map(b => b.exId)))], cut = weekOf(now()) - 28 * DAY;
  return ids.map(id => {
    const h = exSessions(id); if (!h.length) return null;
    const m = liftMetric(h), wk = weekly(h, METRIC[m]), before = wk.filter(w => w.at <= cut);
    return { id, name: exName(id), h, m, wk, cur: wk[wk.length - 1].v, chg: wk[wk.length - 1].v - (before.length ? before[before.length - 1].v : wk[0].v), recent: h.filter(x => x.at >= cut).length, last: h[h.length - 1].at };
  }).filter(Boolean).sort((a, b) => b.recent - a.recent || b.h[b.h.length - 1].top.load - a.h[a.h.length - 1].top.load);
}
const liftVal = l => (l.m === 'reps' ? plural(Math.round(l.cur), 'rep') : kg1(l.cur) + ' kg');
const MEASURE = { e1: 'est. 1RM', top: 'top set', reps: 'most reps' };
const liftRow = l => '<button class="lrow" data-a="pOpen" data-v="pex" data-id="' + esc(l.id) + '"><span class="ln"><b>' + esc(l.name) + '</b><span>' + plural(l.h.length, 'session') + ' · ' + MEASURE[l.m] + '</span></span>' + (l.wk.length > 1 ? sparkSvg(l.wk.slice(-8).map(w => w.v)) : '') + '<span class="lv"><b>' + liftVal(l) + '</b><span>' + liftChg(l) + '</span></span></button>';
const liftChg = l => (Math.abs(l.chg) < 0.05 ? '' : sgn(l.chg, 0) + (l.m === 'reps' ? ' reps' : ''));
// Records: a session that beat every earlier one for that lift — its estimated 1RM, its heaviest weight, or more reps at a
// weight you've lifted before (in that order of what's shown). Your first session with a lift isn't a record.
function allRecords() {
  const out = [], ids = [...new Set(S.sessions.flatMap(s => liftsOf(s).map(b => b.exId)))];
  ids.forEach(id => {
    const h = exSessions(id), useE = liftMetric(h) === 'e1', done = [];
    let bestE = 0, bestKg = -1;
    const repsFrom = kg => done.reduce((a, st) => (st.kg >= kg - 1e-9 ? Math.max(a, st.reps) : a), -1);
    h.forEach((x, i) => {
      let kind = null, set = null;
      if (i && useE && x.e1 > bestE + 1e-9) { kind = 'e1'; set = x.best; }
      else if (i && !x.noLoad && x.top.load > bestKg + 1e-9) { kind = 'kg'; set = x.top; }
      else if (i) x.sets.forEach(st => { const was = repsFrom(st.kg); if (was >= 0 && st.reps > was && (!set || st.kg > set.kg || (st.kg === set.kg && st.reps > set.reps))) { kind = 'reps'; set = st; } });
      if (kind) out.push({ sid: x.sid, at: x.at, id, kind, set, e1: x.e1, bw: isBw(id) });
      bestE = Math.max(bestE, x.e1); bestKg = Math.max(bestKg, x.top.load); done.push(...x.sets);
    });
  });
  return out.sort((a, b) => b.at - a.at);
}
function recLine(r) {
  const st = r.set, set = r.bw ? plural(st.reps, 'rep') + ' at ' + (st.kg ? '+' + fmt(st.kg) + ' kg' : 'bodyweight') : fmt(st.kg) + ' kg × ' + st.reps;
  return (r.kind === 'e1' ? 'Est. 1RM ' + kg1(r.e1) + ' kg · ' : r.kind === 'kg' ? 'Heaviest yet · ' : 'Most reps at this weight · ') + set;
}
// A week (Monday to Sunday): workouts, the days they were on, volume, working sets and time.
function weekStats(ws) {
  const we = weekAdd(ws, 1), ss = S.sessions.filter(s => s.endedAt >= ws && s.endedAt < we), days = new Set(ss.map(s => (new Date(s.endedAt).getDay() + 6) % 7));
  let sets = 0;
  ss.forEach(s => liftsOf(s).forEach(b => b.sets.forEach(x => { if (x.kind === 'work' && x.done) sets++; })));
  return { n: ss.length, days, sets, time: ss.reduce((a, s) => a + Math.max(0, (s.endedAt || 0) - (s.startedAt || 0)), 0) };
}
// The plan's target is one workout per routine in it each week.
const planTarget = () => { const ap = activePlan(); return ap ? routinesIn(ap.id).length || null : null; };
function streak() {
  const tg = planTarget() || 1; let w = weekOf(now()), n = weekStats(w).n >= tg ? 1 : 0;
  for (w = weekAdd(w, -1); n < 520 && weekStats(w).n >= tg; w = weekAdd(w, -1)) n++;
  return n;
}
const hm = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const dShort = t => { const d = new Date(t); return d.getDate() + ' ' + d.toLocaleDateString('en-NZ', { month: 'short' }); };

// ---------- charts (plain SVG, sized to the phone's width) ----------
function niceTicks(lo, hi) { const st = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(s => (hi - lo) / s <= 4) || 1000, out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(r2(v)); return out; }
function lineSvg(o) {
  const w = 360, h = o.h || 190, pl = 36, pr = 10, pt = 14, pb = 22, iw = w - pl - pr, ih = h - pt - pb;
  const pts = o.line, dots = o.dots || [], all = pts.concat(dots).map(p => p.v).concat(o.goal != null ? [o.goal] : []);
  let lo = Math.min(...all), hi = Math.max(...all); const pad = Math.max((hi - lo) * 0.12, o.minPad || 1); lo -= pad; hi += pad;
  const ts = pts.concat(dots).map(p => p.at), t0 = Math.min(...ts), t1 = Math.max(...ts), span = Math.max(DAY, t1 - t0);
  const X = t => pl + iw * (t - t0) / span, Y = v => pt + ih * (1 - (v - lo) / (hi - lo));
  let g = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.label || 'Chart') + '">';
  niceTicks(lo, hi).forEach(v => { g += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cg"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" class="ct">' + fmt(v) + '</text>'; });
  [[t0, 'start'], [t0 + span / 2, 'middle'], [t1, 'end']].forEach(([t, a], k) => { if (k === 1 && span < 6 * DAY) return; g += '<text x="' + X(t).toFixed(1) + '" y="' + (h - 5) + '" text-anchor="' + a + '" class="ct">' + dShort(t) + '</text>'; });
  if (o.goal != null) g += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + Y(o.goal).toFixed(1) + '" y2="' + Y(o.goal).toFixed(1) + '" class="cgoal"/><text x="' + (w - pr) + '" y="' + (Y(o.goal) - 5).toFixed(1) + '" text-anchor="end" class="ctg">Goal ' + fmt(o.goal) + '</text>';
  dots.forEach(p => { g += '<circle cx="' + X(p.at).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="2.6" class="cdot"/>'; });
  if (pts.length > 1) g += '<path d="' + pts.map((p, i) => (i ? 'L' : 'M') + X(p.at).toFixed(1) + ',' + Y(p.v).toFixed(1)).join(' ') + '" class="cline"/>';
  if (pts.length === 1) g += '<circle cx="' + X(pts[0].at).toFixed(1) + '" cy="' + Y(pts[0].v).toFixed(1) + '" r="4" class="cend"/>';
  (o.gold || []).forEach(p => { g += '<circle cx="' + X(p.at).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="5" class="cgold"/>'; });
  return g + '</svg>';
}
function sparkSvg(vals, w, h, goal) {
  w = w || 96; h = h || 30;
  const lo = Math.min(...vals, goal != null ? goal : Infinity), hi = Math.max(...vals, goal != null ? goal : -Infinity), rg = Math.max(1e-9, hi - lo);
  const X = i => 3 + (w - 6) * (vals.length > 1 ? i / (vals.length - 1) : 1), Y = v => 4 + (h - 8) * (1 - (v - lo) / rg);
  return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
    (goal != null ? '<line x1="0" x2="' + w + '" y1="' + Y(goal).toFixed(1) + '" y2="' + Y(goal).toFixed(1) + '" class="cgoal thin"/>' : '') +
    (vals.length > 1 ? '<path d="' + vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') + '" class="cline thin"/>' : '') +
    '<circle cx="' + X(vals.length - 1).toFixed(1) + '" cy="' + Y(vals[vals.length - 1]).toFixed(1) + '" r="3" class="cend"/></svg>';
}
function barsSvg(vals, labels, target, hl, h) {
  const w = 360; h = h || 150; const pt = 16, pb = 20, bw = w / vals.length, mx = Math.max(...vals, target || 0, 1) + 0.4, Y = v => pt + (h - pt - pb) * (1 - v / mx);
  let g = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Workouts a week">';
  if (target) g += '<line x1="0" x2="' + w + '" y1="' + Y(target).toFixed(1) + '" y2="' + Y(target).toFixed(1) + '" class="cgoal"/><text x="' + w + '" y="' + (Y(target) - 4).toFixed(1) + '" text-anchor="end" class="ctg">Plan: ' + target + ' a week</text>';
  vals.forEach((v, i) => { const x = i * bw + bw * 0.2; g += '<rect x="' + x.toFixed(1) + '" y="' + Y(v).toFixed(1) + '" width="' + (bw * 0.6).toFixed(1) + '" height="' + Math.max(0, Y(0) - Y(v)).toFixed(1) + '" rx="4" class="' + (i === hl ? 'cbar hl' : 'cbar') + '"/><text x="' + (x + bw * 0.3).toFixed(1) + '" y="' + (h - 5) + '" text-anchor="middle" class="ct">' + labels[i] + '</text>'; });
  return g + '</svg>';
}

// ---------- the Progress tab and its pages ----------
const TAB_ICON = {
  today: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
  progress: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
};
const tabbarHtml = on => '<nav class="tabbar" aria-label="Sections">' + [['today', 'Today'], ['progress', 'Progress']].map(([k, l]) => '<button class="' + (k === on ? 'on' : '') + '" data-a="tab" data-v="' + k + '"' + (k === on ? ' aria-current="page"' : '') + '><span class="ti">' + TAB_ICON[k] + '</span>' + l + '</button>').join('') + '</nav>';
const ptop = (back, right) => '<div class="ptop"><button data-a="pBack">' + ICON.back + back + '</button>' + (right || '') + '</div>';
function dayDots(ws, st) {
  const today = weekOf(now()) === ws ? (new Date(now()).getDay() + 6) % 7 : -1;
  return '<span class="daydots" aria-label="' + plural(st.n, 'workout') + ' this week">' + 'MTWTFSS'.split('').map((l, i) => '<span>' + l + '<i class="' + (st.days.has(i) ? 'on' : i === today ? 'today' : '') + '">' + (st.days.has(i) ? ICON.check : '') + '</i></span>').join('') + '</span>';
}
// Today: your weight at a glance, and logging it.
function weighRow() {
  const b = bwNow(), t = todaysWeigh();
  if (!b) return '<div class="wrow"><span class="wt"><span class="wl">Bodyweight</span><span class="wv sm">Log it to see your trend</span></span><button class="logbtn" data-a="wLog">Log</button></div>';
  return '<div class="wrow' + (t ? ' done' : '') + '"><span class="wt"><span class="wl">Bodyweight · ' + (S.settings.bwAvg === 'weighted' ? 'weighted average' : '7-day average') + '</span><span class="wv">' + kg1(b.avg) + ' <small>kg</small></span>' + (b.rate != null ? '<span class="wd">' + sgn(b.rate) + ' kg/week</span>' : '') + '</span>' +
    '<button class="logbtn" data-a="wLog" aria-label="' + (t ? 'Change today’s weight, ' + fmt(t.kg) + ' kg' : 'Log today’s weight') + '">' + (t ? 'Logged ' + ICON.check : 'Log') + '</button></div>';
}
function progressScreen() {
  const ws = weekOf(now()), st = weekStats(ws), tg = planTarget(), sk = streak(), b = bwNow(), lifts = liftsSummary(), wa = S.settings.waist ? waistNow() : null;
  const weeks = []; for (let k = -7; k <= 0; k++) weeks.push(weekAdd(ws, k));
  const before = S.sessions.some(x => x.endedAt < ws);
  const weekCard = '<div class="pcard"><span class="pc-h">This week</span><span class="pc-big"><b>' + st.n + ' <small>' + (tg ? 'of ' + tg + ' workouts' : plural(st.n, 'workout').replace(/^\d+ /, '')) + '</small></b>' +
    (sk > 1 ? '<span class="chg">' + sk + '-week streak</span>' : tg && st.n >= tg ? '<span class="chg">On plan</span>' : '') + '</span>' + dayDots(ws, st) +
    (st.n ? '<span class="pc-sub">' + plural(st.sets, 'working set') + ' · ' + hm(st.time) + '</span>' : '') +
    (before ? '<span class="pc-h2">Workouts a week</span>' + barsSvg(weeks.map(w => weekStats(w).n), weeks.map((w, i) => (i % 2 ? '' : dShort(w))), tg, weeks.length - 1, 116) : '') + '</div>';
  const waLine = wa ? '<span class="pc-sub">Waist ' + fmt(wa.last.cm) + ' cm' + (wa.chg != null && Math.abs(wa.chg) >= 0.05 ? ' · ' + sgn(wa.chg) + ' cm in ' + plural(wa.weeks, 'week') : '') + '</span>' : '';
  const bodyCard = b ? '<button class="pcard" data-a="pOpen" data-v="pbody"><span class="pc-h">Bodyweight' + ICON.chev + '</span><span class="pc-row"><span style="flex:1;min-width:0"><span class="pc-big" style="margin-top:0"><b>' + kg1(b.avg) + ' <small>kg</small></b>' + (b.rate != null ? '<span class="chg">' + sgn(b.rate) + '/week</span>' : '') + '</span>' +
    '<span class="pc-sub">' + (b.goal ? kg1(Math.abs(b.toGo)) + ' kg to ' + fmt(b.goal) + ' kg' + (b.weeks ? ' · about ' + plural(b.weeks, 'week') : '') : 'Set a goal in Settings') + '</span>' + waLine + '</span>' + (b.trend.length > 1 ? sparkSvg(b.trend.slice(-40).map(x => x.v), 110, 44, b.goal) : '') + '</span></button>'
    : '<div class="pcard"><span class="pc-h">Bodyweight</span><span class="pc-sub" style="margin-top:6px">Log your weight on Today and your trend shows here.</span><button class="bigbtn sm" data-a="wLog">' + ICON.plus + 'Log weight</button></div>';
  return '<p class="date">' + new Date(now()).toLocaleDateString('en-NZ', { weekday: 'long' }) + ' ' + new Date(now()).getDate() + ' ' + new Date(now()).toLocaleDateString('en-NZ', { month: 'long' }) + '</p><h1 class="h1">Progress</h1>' +
    weekCard + bodyCard +
    (lifts.length ? '<div class="secrow"><h2>Lifts</h2>' + (lifts.length > 4 ? '<button data-a="pOpen" data-v="plifts">All ' + lifts.length + '</button>' : '') + '</div><div class="lrows">' + lifts.slice(0, 4).map(liftRow).join('') + '</div>'
      : '<p class="note2" style="margin-top:22px">Finish a workout and your lifts show up here.</p>');
}
function pliftsScreen() {
  const lifts = liftsSummary();
  return ptop('Progress') + '<h1 class="ptitle">Lifts</h1><p class="note2">Your best each week: estimated 1RM, or your top set for lifts you do for more than 12 reps. Bodyweight lifts count your bodyweight.</p><div class="lrows" style="margin-top:8px">' +
    lifts.map(liftRow).join('') + '</div>';
}
function pexScreen() {
  const id = UI.pex, h = exSessions(id); if (!h.length) return ptop('Back') + '<h1 class="ptitle">' + esc(exName(id)) + '</h1><p class="note2">Finish a workout with it and its progress shows here.</p>';
  const lm = liftMetric(h), reps = lm === 'reps', m = reps ? 'reps' : UI.pexMetric || lm, f = METRIC[m], wk = weekly(h, f), cur = wk[wk.length - 1].v, first = wk[0].v, weeks = Math.round((wk[wk.length - 1].at - wk[0].at) / (7 * DAY));
  const unitTxt = m === 'reps' ? '' : ' kg', val = v => (m === 'reps' ? Math.round(v) : kg1(v));
  let run = 0; const gold = m ? h.filter((x, i) => { const g = i > 0 && f(x) > run + 1e-9; run = Math.max(run, f(x)); return g; }).map(x => ({ at: x.at, v: f(x) })) : [];
  const cap = { e1: 'Estimated 1RM, from your best set each week', top: 'Your heaviest set each week', reps: 'Most reps in a set each week' }[m] + (isBw(id) && !reps ? '. Counts your bodyweight.' : '');
  const bestE = h.reduce((a, x) => (x.e1 > a.e1 ? x : a)), heavy = h.reduce((a, x) => (x.top.load > a.top.load ? x : a)), mostR = h.reduce((a, x) => (x.most > a.most ? x : a));
  const w = x => (isBw(id) ? (x.kg ? '+' + fmt(x.kg) + ' kg' : 'BW') : fmt(x.kg) + ' kg');
  const mostSet = mostR.sets.reduce((a, x) => (x.reps > a.reps ? x : a));
  const facts = reps ? '<div><b>' + mostR.most + ' <small>reps</small></b><span>Most in a set · ' + dShort(mostR.at) + '</span></div><div><b>' + h.length + '</b><span>Sessions</span></div>'
    : (lm === 'e1' ? '<div><b>' + kg1(bestE.e1) + ' <small>kg</small></b><span>Best est. 1RM · ' + dShort(bestE.at) + '</span></div>' : '') + '<div><b>' + w(heavy.top) + ' <small>× ' + heavy.top.reps + '</small></b><span>Heaviest · ' + dShort(heavy.at) + '</span></div>' +
      '<div><b>' + mostSet.reps + ' <small>reps @ ' + w(mostSet) + '</small></b><span>Most reps · ' + dShort(mostR.at) + '</span></div><div><b>' + h.length + '</b><span>Sessions since ' + dShort(h[0].at) + '</span></div>';
  const list = h.slice().reverse(), shown = UI.pexAll ? list : list.slice(0, 5);
  return ptop({ plifts: 'Lifts', train: 'Workout', edit: 'Routine' }[UI.pFrom] || 'Progress') + '<h1 class="ptitle">' + esc(exName(id)) + '</h1>' +
    '<div class="hero-num"><b>' + val(cur) + '</b><small>' + (m === 'reps' ? 'reps' : 'kg') + '</small>' + (wk.length > 1 && Math.abs(cur - first) >= 0.05 ? '<span class="chg">' + sgn(cur - first, 0) + unitTxt + ' in ' + plural(Math.max(1, weeks), 'week') + '</span>' : '') + '</div>' +
    '<p class="hero-cap">' + cap + '</p>' +
    (reps ? '' : '<div class="chips2" role="group" aria-label="Measure">' + [['e1', 'Est. 1RM'], ['top', 'Top weight']].map(([k, l]) => '<button class="' + (k === m ? 'on' : '') + '" data-a="pexMetric" data-v="' + k + '" aria-pressed="' + (k === m) + '">' + l + '</button>').join('') + '</div>') +
    lineSvg({ line: wk, dots: h.length > wk.length ? h.map(x => ({ at: x.at, v: f(x) })) : [], gold, label: cap }) +
    '<div class="legend"><span><i></i>Best each week</span>' + (h.length > wk.length ? '<span><i class="dot"></i>Each session</span>' : '') + (gold.length ? '<span><i class="gold"></i>Record</span>' : '') + '</div>' +
    '<div class="facts">' + facts + '</div>' +
    '<div class="secrow"><h2>Sessions</h2>' + (list.length > 5 ? '<button data-a="pexAll">' + (UI.pexAll ? 'Fewer' : 'All ' + list.length) + '</button>' : '') + '</div>' +
    shown.map(x => '<div class="sess"><span><b>' + dateTxt(x.at) + '</b><span class="sd">' + esc(x.name) + ' · ' + esc(setsLine(x.sets.map(s => ({ reps: s.reps, kg: isBw(id) ? s.kg : s.kg })))) + '</span></span><span class="sr">' + (reps ? plural(x.most, 'rep') : lm === 'e1' ? kg1(x.e1) + ' kg<span>est. 1RM</span>' : w(x.top) + ' × ' + x.top.reps + '<span>top set</span>') + '</span></div>').join('');
}
function pbodyScreen() {
  const b = bwNow(), all = weighins();
  if (!b) return ptop('Progress') + '<h1 class="ptitle">Bodyweight</h1><p class="note2">No weigh-ins yet.</p><button class="bigbtn" data-a="wLog">' + ICON.plus + 'Log weight</button>';
  const rg = UI.bwRange || '3M', from = rg === 'All' ? 0 : b.lastAt - ({ '1M': 31, '3M': 92, '6M': 183 }[rg]) * DAY, tr = b.trend.filter(x => x.at >= from);
  const eta = b.weeks ? new Date(now() + b.weeks * 7 * DAY) : null;
  return ptop('Progress') + '<h1 class="ptitle">Bodyweight</h1>' +
    '<div class="hero-num"><b>' + kg1(b.avg) + '</b><small>kg</small>' + (b.rate != null ? '<span class="chg">' + sgn(b.rate) + ' kg a week</span>' : '') + '</div>' +
    '<p class="hero-cap">' + (S.settings.bwAvg === 'weighted' ? 'Weighted average' : '7-day average') + ' · last ' + fmt(b.last) + ' kg, ' + dateTxt(b.lastAt) + '</p>' +
    '<div class="chips2" role="group" aria-label="Range">' + ['1M', '3M', '6M', 'All'].map(k => '<button class="' + (k === rg ? 'on' : '') + '" data-a="bwRange" data-v="' + k + '" aria-pressed="' + (k === rg) + '">' + k + '</button>').join('') + '</div>' +
    lineSvg({ line: tr.map(x => ({ at: x.at, v: x.v })), dots: tr.map(x => ({ at: x.at, v: x.kg })), goal: b.goal, minPad: 0.5, label: 'Bodyweight' }) +
    '<div class="legend"><span><i></i>Average</span><span><i class="dot"></i>Each weigh-in</span>' + (b.goal ? '<span><i class="dash"></i>Goal</span>' : '') + '</div>' +
    (b.goal ? '<div class="goalbox"><span><b>' + (Math.abs(b.toGo) < 0.05 ? 'You’re at your goal of ' + fmt(b.goal) + ' kg' : kg1(Math.abs(b.toGo)) + ' kg to your goal of ' + fmt(b.goal) + ' kg') + '</b><span>' + (b.weeks ? 'About ' + plural(b.weeks, 'week') + ' at this rate, ' + (eta.getDate() <= 10 ? 'early' : eta.getDate() <= 20 ? 'mid' : 'late') + ' ' + eta.toLocaleDateString('en-NZ', { month: 'long' }) : b.rate == null ? 'A rate shows after 10 days of weigh-ins' : 'Not heading that way yet') + '</span></span><button data-a="goalEdit">Edit</button></div>'
      : '<div class="goalbox"><span><b>No goal set</b><span>Add one to see how long it’ll take</span></span><button data-a="goalEdit">Set</button></div>') +
    '<button class="bigbtn" data-a="wLog">' + ICON.plus + (todaysWeigh() ? 'Change today’s weight' : 'Log weight') + '</button>' +
    (S.settings.waist ? waistSection() : '') +
    '<div class="secrow"><h2>Weigh-ins</h2>' + (all.length > 6 ? '<button data-a="bwAll">' + (UI.bwAll ? 'Fewer' : 'All ' + all.length) + '</button>' : '') + '</div>' +
    all.slice().reverse().slice(0, UI.bwAll ? 9999 : 6).map(w => '<button class="entry" data-a="wEdit" data-id="' + esc(w.id) + '"><span>' + dateTxt(w.at) + '</span><span>' + fmt(w.kg) + ' kg</span></button>').join('');
}
function settingsScreen() {
  const seg = (a, opts, on) => '<div class="pseg" role="group">' + opts.map(([v, l]) => '<button class="' + (v === on ? 'on' : '') + '" data-a="' + a + '" data-v="' + v + '" aria-pressed="' + (v === on) + '">' + l + '</button>').join('') + '</div>';
  const avg = S.settings.bwAvg === 'weighted' ? 'weighted' : 'simple';
  return '<div class="ptop"><button data-a="tab" data-v="today">' + ICON.back + 'Today</button></div><h1 class="ptitle">Settings</h1>' +
    '<p class="dhead">Bodyweight</p>' +
    '<div class="srow"><span>Average</span>' + seg('bwAvg', [['simple', '7-day'], ['weighted', 'Weighted']], avg) + '</div>' +
    '<p class="note2 tight">' + (avg === 'weighted' ? 'Weighted: every weigh-in counts, the most recent the most, so a missed day doesn’t jolt the line.' : '7-day: the plain average of your weigh-ins over the last 7 days.') + '</p>' +
    '<div class="srow"><span>Track waist</span>' + seg('waistSet', [['off', 'Off'], ['on', 'On']], S.settings.waist ? 'on' : 'off') + '</div>' +
    '<p class="note2 tight">A weekly measurement on the Bodyweight page. With your weight, it shows where the weight is coming off.</p>' +
    '<button class="srow" data-a="goalEdit"><span>Goal weight</span><span class="sv">' + (S.settings.goalKg ? fmt(S.settings.goalKg) + ' kg' : 'None') + ICON.chev + '</span></button>' +
    '<p class="dhead">Workouts</p>' +
    '<div class="srow"><span>Sound when rest ends</span>' + seg('soundSet', [['on', 'On'], ['off', 'Off']], S.settings.sound ? 'on' : 'off') + '</div>' +
    '<p class="dhead">Your data</p>' +
    '<button class="srow" data-a="backup"><span>Backup</span><span class="sv">' + esc(backupTxt()) + ICON.chev + '</span></button>';
}
function waistSection() {
  const wa = waistNow(), t = todaysWaist();
  return '<div class="secrow"><h2>Waist</h2><button data-a="waLog">' + (t ? 'Change today’s' : 'Log waist') + '</button></div>' +
    (!wa ? '<p class="note2 tight">Once a week is plenty: same time of day, tape level with your belly button, relaxed.</p>'
      : '<div class="hero-num sm"><b>' + fmt(wa.last.cm) + '</b><small>cm</small>' + (wa.chg != null && Math.abs(wa.chg) >= 0.05 ? '<span class="chg">' + sgn(wa.chg) + ' cm in ' + plural(wa.weeks, 'week') + '</span>' : '') + '</div>' +
        (wa.list.length > 1 ? lineSvg({ line: wa.list.map(w => ({ at: w.at, v: w.cm })), minPad: 0.5, label: 'Waist', h: 140 }) : '') +
        wa.list.slice().reverse().slice(0, 3).map(w => '<button class="entry" data-a="waEdit" data-id="' + esc(w.id) + '"><span>' + dateTxt(w.at) + '</span><span>' + fmt(w.cm) + ' cm</span></button>').join(''));
}
// Logging a weight or a waist measurement, or setting the goal: the number pad.
function wpadSheet() {
  const sh = UI.sheet, wa = !!sh.waist, list = wa ? S.waists || [] : S.weights || [], entry = sh.id ? list.find(w => w.id === sh.id) : null;
  const last = (wa ? waists() : weighins()).filter(w => !entry || w.id !== entry.id).pop(), num = w => (wa ? w.cm : w.kg);
  const cur = sh.goal ? S.settings.goalKg || null : entry ? num(entry) : null, base = sh.buf !== '' ? parseFloat(sh.buf) || 0 : cur != null ? cur : last ? num(last) : null;
  const title = sh.goal ? 'Goal weight, kg' : (wa ? 'Waist, cm · ' : 'Bodyweight, kg · ') + (entry ? dateTxt(entry.at) : 'today');
  const shown = sh.buf !== '' ? sh.buf : cur != null ? fmt(cur) : last ? fmt(num(last)) : '—';
  const chips = (wa ? [-1, -0.5, 0.5, 1] : [-0.5, -0.1, 0.1, 0.5]).map(d => '<button data-a="padSet" data-v="' + (base == null ? '' : r2(base + d)) + '" aria-label="' + (d > 0 ? 'Add ' : 'Take off ') + fmt(Math.abs(d)) + '">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + '</button>').join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => k === 'del' ? '<button data-a="key" data-k="del" aria-label="Delete">' + ICON.del + '</button>' : '<button data-a="key" data-k="' + k + '"' + (k === '.' ? ' aria-label="Decimal point"' : '') + '>' + k + '</button>').join('');
  return sheetBox(title,
    '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:14px;gap:8px"><span class="dim" style="font-weight:500">' + esc(title) + '</span><span class="dim small">' + (!sh.goal && last ? 'Last ' + fmt(num(last)) : '') + '</span></div>',
    '<div class="padval"><span style="color:' + (sh.buf !== '' ? 'var(--cream)' : 'var(--half)') + '">' + esc(shown) + '</span><span class="caret" aria-hidden="true"></span></div>' +
    '<div class="chips"' + (base == null ? ' style="visibility:hidden" aria-hidden="true"' : '') + '>' + chips + '</div><div class="keys">' + keys + '</div>',
    '<button class="primary" data-a="wSave"' + (sh.buf === '' && cur == null ? ' disabled' : '') + '>Save</button>' + (entry ? '<button class="wide danger" data-a="wDelete">' + (wa ? 'Delete this measurement' : 'Delete this weigh-in') + '</button>' : '') + (sh.goal && S.settings.goalKg ? '<button class="wide" data-a="goalClear">Clear the goal</button>' : ''));
}
const PSCREENS = { progress: progressScreen, plifts: pliftsScreen, pex: pexScreen, pbody: pbodyScreen, settings: settingsScreen };
const PDETAIL = ['plifts', 'pex', 'pbody'];

// ---------- sheets ----------
// A stepper row. The number between − and + is a field too: tap it and type.
// o.kind: 'int' (default), 'dec' (has a decimal point, e.g. kg), 'dur' (rest time), 'min' (timer minutes, 0 = Off).
function stp(label, f, val, o) {
  o = o || {};
  const act = o.act || 'ef', name = o.name || label, d = o.d || 1, kind = o.kind || 'int';
  const extra = o.i != null ? ' data-i="' + o.i + '"' : '', id = 'v-' + f + (o.i != null ? '-' + o.i : '');
  const btn = (sign, word, icon) => '<button class="sq" data-a="' + act + '" data-f="' + f + '" data-d="' + sign + d + '"' + extra + ' aria-label="' + esc(name) + ', ' + word + '">' + icon + '</button>';
  return '<div class="stp"><span class="stpl">' + label + (kind === 'dur' ? '<small class="hint">Seconds, or like 2.30</small>' : '') + '</span><div class="ctl">' + btn('-', 'less', ICON.minus) +
    '<input class="stpv" id="' + id + '" value="' + esc(val) + '" data-sf="' + f + '" data-sact="' + act + '" data-k="' + kind + '"' + extra + ' inputmode="' + (kind === 'dec' || kind === 'dur' ? 'decimal' : 'numeric') + '" enterkeyhint="done" autocomplete="off" aria-label="' + esc(name) + '">' +
    btn('', 'more', ICON.plus) + '</div></div>';
}
// What a typed value means. null = not a number we can use.
function parseField(kind, raw) {
  const s = String(raw).trim().toLowerCase();
  let m;
  if (kind === 'min' && (s === '' || s === 'off')) return 0;
  if (kind === 'dec') return /^\d*[.,]?\d+$/.test(s) ? parseFloat(s.replace(',', '.')) : null;
  if (kind === 'dur') {
    if (/^\d+$/.test(s)) { const n = +s; return n <= 9 ? n * 60 : n; } // 90 = 90 s, 3 = 3 min
    if ((m = s.match(/^(\d+)[:.,](\d{1,2})$/))) return +m[1] * 60 + (m[2].length === 1 ? +m[2] * 10 : +m[2]); // 2.30 = 2:30
    return null;
  }
  return /^\d+$/.test(s) ? +s : null;
}
// Current text for a field, read back from the data (so clamping shows).
function fieldText(act, f, i) {
  if (act === 'restAdj') return secTxt(S.cur.blocks[UI.sheet.pos.bi].rest || 0);
  if (act === 'item') { const it = sheetBlock().items[i]; return f === 'ticks' ? String(it.ticks || 1) : it.timer ? it.timer + ' min' : 'Off'; }
  const t = sheetSlot(); if (!t) return '';
  if (f === 'sets') return String(t.sets || 3);
  if (f === 'lo') return String(t.lo);
  if (f === 'hi') return String(Math.max(t.lo, t.hi || t.lo));
  if (f === 'rest') return secTxt(t.rest || 0);
  if (f === 'ssrest') return secTxt(sheetBlock().rest || 0);
  if (f === 'warm') return String(t.warm || 0);
  if (f === 'bar') { const ex = exById(t.exId); return fmt(ex && ex.bar != null ? ex.bar : 20) + ' kg'; }
  if (f === 'step') { const ex = exById(t.exId); return fmt((ex && ex.step) || 2.5) + ' kg'; }
  return '';
}
function setSlotField(f, v) {
  const t = sheetSlot(); if (!t) return;
  if (f === 'sets') t.sets = clamp(Math.round(v), 1, 12);
  else if (f === 'lo') { t.lo = clamp(Math.round(v), 1, 100); if ((t.hi || 0) < t.lo) t.hi = t.lo; }
  else if (f === 'hi') t.hi = clamp(Math.round(v), t.lo || 1, 100);
  else if (f === 'rest') t.rest = clamp(Math.round(v), 0, 600);
  else if (f === 'ssrest') { const bl = sheetBlock(); bl.rest = clamp(Math.round(v), 0, 600); }
  else if (f === 'warm') t.warm = clamp(Math.round(v), 0, 4);
  else if (f === 'bar') { const ex = exById(t.exId); if (ex) { ex.bar = clamp(r2(v), 0, 50); saveEx(ex); } }
  else if (f === 'step') { const ex = exById(t.exId); if (ex) { ex.step = clamp(r2(v), 0.25, 50); saveEx(ex); } }
  saveRoutine(curRoutine());
}
function setItemField(i, f, v) { const bl = sheetBlock(); if (!bl) return; const it = bl.items[i]; if (f === 'ticks') it.ticks = clamp(Math.round(v), 1, 6); if (f === 'timer') it.timer = clamp(Math.round(v), 1, 60); saveRoutine(curRoutine()); }
function setTrainRest(v) {
  const blk = S.cur.blocks[UI.sheet.pos.bi]; blk.rest = clamp(Math.round(v), 0, 600);
  if (blk.kind === 'ss') blk.parts.forEach(p => { p.rest = blk.rest; });
  const hit = slotFromSrc(blk.src); if (hit && (blk.kind === 'ss' ? hit.bl.kind === 'ss' : hit.bl.exId === blk.exId)) { hit.bl.rest = blk.rest; saveRoutine(hit.r); }
  touchCur();
}
// Store a typed value. The screen isn't rebuilt here: this runs as the field loses focus, often because a finger is
// landing on − or +, and rebuilding now would swallow that tap. The fields just show the stored values.
function commitField(el) {
  const v = parseField(el.dataset.k, el.value), act = el.dataset.sact, f = el.dataset.sf, i = el.dataset.i != null ? +el.dataset.i : null;
  if (v != null) { if (act === 'restAdj') setTrainRest(v); else if (act === 'item') setItemField(i, f, v); else setSlotField(f, v); }
  document.querySelectorAll('.stpv').forEach(x => { const txt = fieldText(x.dataset.sact, x.dataset.sf, x.dataset.i != null ? +x.dataset.i : null); x.value = txt; x.dataset.orig = txt; x.dataset.raw = txt; });
  // a checklist item's chip shows its ticks or timer, so it follows a typed value too
  const bl = act === 'item' && sheetBlock(), it = bl && bl.items[i], chip = it && document.querySelector('.ckchip[data-i="' + i + '"]');
  if (chip) chip.textContent = it.timer ? it.timer + ' min' : '×' + (it.ticks || 1);
}
function removeRow(canRemove) { return canRemove ? '<div class="moverow"><button class="rm" data-a="remove">Remove</button></div>' : ''; }
// A sheet slides up from the bottom. Pass `form` instead of a footer and it's a full-screen editor with Cancel/Done in a top bar,
// so the keyboard can take the bottom of the screen without covering anything that matters.
function sheetBox(label, head, body, foot, form) {
  const top = form ? '<div class="topbar">' + (form.cancel ? '<button class="tb-l" data-a="' + form.cancel + '">Cancel</button>' : '<span></span>') + '<b>' + esc(form.title) + '</b>' + (form.done ? '<button class="tb-r" data-a="' + form.done + '">Done</button>' : '<span></span>') + '</div>' : '<div class="grab"></div>';
  return '<div class="sheet' + (form ? ' form' : '') + '" role="dialog" aria-label="' + esc(label) + '"><div class="sh-h">' + top + head + '</div>' +
    (body ? '<div class="sh-b">' + body + '</div>' : '') + (foot && !form ? '<div class="sh-f">' + foot + '</div>' : '') + '</div>';
}
function pickSheet() {
  const sh = UI.sheet, q = sh.q || '';
  const title = sh.mode === 'swap' ? 'Change exercise' : sh.mode === 'part' ? 'Add to superset' : 'Add exercise';
  return sheetBox(title, '<input id="pick-q" class="sin" value="' + esc(q) + '" placeholder="Search or type a new name" aria-label="Search exercises" autocomplete="off" autocapitalize="sentences" enterkeyhint="go">',
    '<div class="picklist">' + pickListHtml() + '</div>', '', { title, cancel: 'pickCancel' });
}
function pickListHtml() {
  const q = UI.sheet.q || '', nq = norm(q);
  const all = Object.values(S.exercises).filter(x => x.name).sort((a, b) => a.name.localeCompare(b.name));
  if (!all.length && !nq) return '<p class="pickempty">Type a name to add your first exercise.</p>';
  const list = nq ? all.filter(x => norm(x.name).includes(nq)) : all;
  const exact = nq && all.some(x => norm(x.name) === nq);
  return list.map(x => '<button class="pickrow" data-a="pickEx" data-id="' + esc(x.id) + '"><span style="flex:1;min-width:0">' + esc(x.name) + '</span>' + ICON.chev + '</button>').join('') +
    (nq && !exact ? '<button class="pickrow new" data-a="pickEx">' + ICON.plus + 'New: ' + esc(q.trim()) + '</button>' : '');
}
// A way into an exercise's Progress page, once it has some.
function historyRow(exId) {
  const h = exSessions(exId); if (!h.length) return '';
  const l = liftMetric(h), last = h[h.length - 1];
  return '<button class="morebtn" data-a="pOpen" data-v="pex" data-id="' + esc(exId) + '"><span class="mb-t"><b>Progress</b><span class="sub">' + plural(h.length, 'session') + ' · ' + (l === 'reps' ? 'most reps ' + last.most : l === 'top' ? 'last top set ' + kgVal(last.top.kg) + unit(last.top.kg) : 'est. 1RM ' + kg1(last.e1) + ' kg') + '</span></span>' + ICON.chev + '</button>';
}
function slotSheet() {
  const sh = UI.sheet, bl = sheetBlock(), t = sheetSlot(); if (!t) return '';
  const isPart = sh.p != null, ex = exById(t.exId) || { name: '', step: 2.5 };
  const r = curRoutine();
  const used = exUsage(t.exId).filter(n => n !== (r.name || 'Untitled routine'));
  const reps = t.range ? stp('Low', 'lo', t.lo) + stp('High', 'hi', Math.max(t.lo, t.hi || t.lo)) : stp('Reps', 'lo', t.lo);
  const folded = !UI.slotMore;
  const eq = ex.equip, bar = ex.bar != null ? ex.bar : 20;
  const summary = [eq ? EQUIP[eq] + (eq === 'barbell' ? ', ' + fmt(bar) + ' kg bar' : '') : '', isPart ? '' : t.warm ? plural(t.warm, 'warm-up') + (t.warmMode === 'manual' ? ' you set' : '') : 'No warm-ups', 'goes up by ' + fmt(ex.step || 2.5) + ' kg'].filter(Boolean).join(' · ');
  const more = folded ? '<button class="morebtn" data-a="slotMore"><span class="mb-t"><b>More</b><span class="sub">' + esc(summary) + '</span></span>' + ICON.chev + '</button>' : '';
  const equipRow = '<div class="eqrow"><span>Equipment</span><div class="eqgrid" role="group" aria-label="Equipment, optional">' + Object.entries(EQUIP).map(([k, l]) => '<button class="' + (eq === k ? 'on' : '') + '" data-a="equip" data-v="' + k + '" aria-pressed="' + (eq === k) + '">' + l + '</button>').join('') + '</div></div>';
  const warmRows = isPart ? '' : stp('Warm-up sets', 'warm', t.warm || 0) + (t.warm ? '<div class="stp"><span>Warm-up weights</span><div class="seg2" role="group" aria-label="Warm-up weights"><button class="' + (t.warmMode === 'manual' ? '' : 'on') + '" data-a="warmMode" data-v="auto" aria-pressed="' + (t.warmMode !== 'manual') + '">Auto</button><button class="' + (t.warmMode === 'manual' ? 'on' : '') + '" data-a="warmMode" data-v="manual" aria-pressed="' + (t.warmMode === 'manual') + '">Manual</button></div></div>' : '');
  const opened = equipRow + (eq === 'barbell' ? stp('Bar', 'bar', fmt(bar) + ' kg', { kind: 'dec' }) : '') + warmRows + stp('Goes up by', 'step', fmt(ex.step || 2.5) + ' kg', { kind: 'dec' });
  return sheetBox(ex.name,
    '<div class="namerow"><input id="e-name" class="sin lg" autocapitalize="sentences" enterkeyhint="done" data-f="exname" value="' + esc(ex.name) + '" aria-label="Exercise name" autocomplete="off"><button data-a="swapEx">Change</button></div>' +
    (used.length ? '<p class="dim small" style="margin-top:6px">Also in ' + esc(used.join(', ')) + '</p>' : ''),
    '<div style="margin-top:8px">' + stp('Sets', 'sets', t.sets || 3) +
    '<div class="stp"><span>Reps</span><div class="seg2" role="group" aria-label="Fixed reps or a range"><button class="' + (t.range ? '' : 'on') + '" data-a="repMode" data-v="single" aria-pressed="' + !t.range + '">Fixed</button><button class="' + (t.range ? 'on' : '') + '" data-a="repMode" data-v="range" aria-pressed="' + !!t.range + '">Range</button></div></div>' + reps +
    (isPart ? '' : stp('Rest', 'rest', secTxt(t.rest || 0), { kind: 'dur' })) + (folded ? more : opened) + historyRow(t.exId) + '</div>' +
    removeRow(isPart || !sh.isNew),
    '', { title: isPart ? 'Superset exercise' : 'Exercise', cancel: 'cancel', done: 'done' });
}
function ssSheet() {
  const sh = UI.sheet, bl = sheetBlock(); if (!bl) return '';
  const parts = bl.parts.map((p, i) => '<button class="partrow" data-a="openPart" data-p="' + i + '" data-drag>' + '<span class="grip" data-grip aria-hidden="true">' + ICON.grip + '</span>' + '<span style="flex:1;min-width:0"><b style="display:block;font-size:17px">' + esc(exName(p.exId)) + '</b><span class="dim small">' + (p.sets || 3) + ' × ' + repsTxt(p) + '</span></span>' + ICON.chev + '</button>').join('');
  return sheetBox('Superset', '',
    '<div style="margin-top:4px" data-drag-list="parts">' + parts + '</div><button class="ghost" style="width:100%;margin-top:8px;height:48px" data-a="addPart">' + ICON.plus + (bl.parts.length ? ' Add another' : ' Add an exercise') + '</button>' +
    '<div style="margin-top:12px">' + stp('Rest after round', 'ssrest', secTxt(bl.rest || 0), { kind: 'dur' }) + '</div>' + removeRow(!sh.isNew),
    '', { title: 'Superset', cancel: 'cancel', done: 'done' });
}
function checkSheet() {
  const sh = UI.sheet, bl = sheetBlock(); if (!bl) return '';
  const items = bl.items.map((it, i) => {
    const open = UI.ckSel === i;
    const text = '<input class="sin" autocapitalize="sentences" enterkeyhint="next" data-ci="' + i + '" data-cf="text" value="' + esc(it.text) + '" placeholder="Item" aria-label="Item ' + (i + 1) + '" style="flex:1.4;min-width:0">';
    const detail = '<input class="sin" autocapitalize="sentences" enterkeyhint="next" data-ci="' + i + '" data-cf="detail" value="' + esc(it.detail) + '" placeholder="2 × 15" aria-label="Item ' + (i + 1) + ' detail" style="flex:1;min-width:0">';
    const chip = '<button class="ckchip' + (open ? ' on' : '') + '" data-a="ckSel" data-i="' + i + '" aria-expanded="' + open + '" aria-label="Item ' + (i + 1) + ': ' + (it.timer ? it.timer + ' minute timer' : (it.ticks || 1) + (it.ticks > 1 ? ' ticks' : ' tick')) + '. Tap to change">' + (it.timer ? it.timer + ' min' : '×' + (it.ticks || 1)) + '</button>';
    // An item is ticked off or timed, not both: pick which, then set just that one.
    const kind = '<div class="seg2 ckkind" role="group" aria-label="Item ' + (i + 1) + ': ticks or a timer">' + [['ticks', 'Ticks', !it.timer], ['timer', 'Timer', !!it.timer]].map(([v, l, on]) => '<button class="' + (on ? 'on' : '') + '" data-a="itemKind" data-i="' + i + '" data-v="' + v + '" aria-pressed="' + on + '">' + l + '</button>').join('') + '</div>';
    const more = open ? '<div class="ckmore">' + kind + (it.timer ? stp('Minutes', 'timer', it.timer + ' min', { act: 'item', i, kind: 'min', name: 'Timer for item ' + (i + 1) }) : stp('Ticks', 'ticks', it.ticks || 1, { act: 'item', i, name: 'Ticks for item ' + (i + 1) })) +
      '<button class="rmitem" data-a="delItem" data-i="' + i + '">Remove item</button></div>' : '';
    return '<div class="item' + (open ? ' open' : '') + '"><div class="two">' + text + detail + chip + '</div>' + more + '</div>';
  }).join('');
  return sheetBox('Checklist',
    '<input id="c-name" class="sin lg" autocapitalize="sentences" enterkeyhint="done" style="margin-top:4px" data-f="cname" value="' + esc(bl.name) + '" placeholder="Checklist name" aria-label="Checklist name">',
    '<div style="margin-top:6px">' + items + '</div><button class="ghost" style="width:100%;margin-top:8px;height:48px" data-a="addItem">' + ICON.plus + ' Add an item</button>' + removeRow(!sh.isNew),
    '', { title: 'Checklist', cancel: 'cancel', done: 'done' });
}
function padSheet() {
  const sh = UI.sheet, c = S.cur, t = target(c); if (!t) return '';
  const b = liftAt(c, t), x = b.sets[t.i], isKg = sh.field === 'kg';
  const cur = isKg ? x.kg : x.reps, val = sh.buf !== '' ? parseFloat(sh.buf) || 0 : cur;
  const wi = b.sets.slice(0, t.i + 1).filter(y => y.kind === x.kind).length;
  const last = lastFor(b.exId, b.lo, b.hi), lw = x.kind === 'work' && last ? last.all.filter(y => y.done)[wi - 1] : null;
  const title = sh.work ? 'Working weight, kg' : (isKg ? 'Weight' : 'Reps') + ', ' + (x.kind === 'warm' ? 'warm-up ' : 'set ') + wi;
  const st = isKg ? b.step : 1, base = val == null ? 0 : val;
  const chips = [-2 * st, -st, st, 2 * st].map(dl => '<button data-a="padSet" data-v="' + Math.max(0, r2(base + dl)) + '" aria-label="' + (dl > 0 ? 'Add ' : 'Take off ') + fmt(Math.abs(dl)) + '">' + (dl > 0 ? '+' : '−') + fmt(Math.abs(dl)) + '</button>').join('');
  let rec = [], recLabel = '';
  if (isKg) { const seen = []; [x.kg, ...b.sets.filter(y => y.done && y.kind === x.kind).map(y => y.kg), ...historyFor(b.exId, 4).flatMap(h => h.sets.map(y => y.kg))].forEach(k => { if (k != null && !seen.includes(k) && k !== val) seen.push(k); }); rec = seen.slice(0, 3); recLabel = 'Recent'; }
  else { rec = [b.lo, Math.round((b.lo + b.hi) / 2), b.hi].filter((v, i, a) => a.indexOf(v) === i); recLabel = 'Aim'; }
  const shown = sh.buf !== '' ? sh.buf : cur == null ? '—' : String(isKg ? fmt(cur) : cur);
  return sheetBox(title,
    '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:14px;gap:8px"><span class="dim" style="font-weight:500">' + esc(title) + '</span><span class="dim small">' + (lw ? 'Last time ' + (isKg ? kgVal(lw.kg) : lw.reps) : '') + '</span></div>',
    '<div class="padval"><span style="color:' + (sh.buf !== '' ? 'var(--cream)' : 'var(--half)') + '">' + esc(shown) + '</span><span class="caret" aria-hidden="true"></span></div>' +
    (sh.work ? '<p class="dim small padnote" style="text-align:center">Warm-ups are worked out from this</p>' : '') +
    // ± chips need a number to start from; until there is one they keep their space but stay hidden, so the keys don't jump
    '<div class="chips"' + (sh.buf === '' && cur == null ? ' style="visibility:hidden" aria-hidden="true"' : '') + '>' + chips + '</div>' +
    (rec.length ? '<div class="recent"><span class="dim small">' + recLabel + '</span>' + rec.map(k => '<button data-a="padSet" data-v="' + k + '">' + fmt(k) + '</button>').join('') + '</div>' : '') +
    '<div class="keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => k === 'del' ? '<button data-a="key" data-k="del" aria-label="Delete">' + ICON.del + '</button>' : '<button data-a="key" data-k="' + k + '"' + (k === '.' && !isKg ? ' class="off" aria-disabled="true"' : '') + (k === '.' ? ' aria-label="Decimal point"' : '') + '>' + k + '</button>').join('') + '</div>',
    '<button class="primary" data-a="padDone">Done</button>');
}
function changeSheet() {
  const c = S.cur, t = target(c); if (!t || c.blocks[t.bi].kind === 'check') return '';
  const b = liftAt(c, t), x = b.sets[t.i], last = lastLine(b, x, t.i);
  return sheetBox('Change the next set',
    '<div class="chg-h"><b>' + esc(b.name) + '</b><span class="dim small">' + esc(setLabel(b, t.i) + (last ? ' · ' + last : '')) + '</span></div>',
    bigSet(b, x),
    '<button class="primary" data-a="close">Done</button>');
}
function exSheet() {
  const c = S.cur, pos = UI.sheet.pos, blk = c.blocks[pos.bi]; if (!blk) return '';
  const b = blk.kind === 'ss' ? blk.parts[pos.p] : blk, ex = exById(b.exId) || { notes: '' };
  const hist = historyFor(b.exId, 6), rest = blk.rest;
  return sheetBox(b.name, '',
    '<label class="lbl" for="notes" style="margin-top:4px">Notes</label><textarea id="notes" data-ex="' + esc(b.exId) + '" placeholder="Cues, settings, rules">' + esc(ex.notes || '') + '</textarea>' +
    '<div style="margin-top:8px">' + stp(blk.kind === 'ss' ? 'Rest after round' : 'Rest', 'rest', secTxt(rest), { act: 'restAdj', d: 15, kind: 'dur' }) + '</div>' +
    '<label class="lbl">History</label>' +
    (hist.length ? hist.map(h => '<div class="hrow">' + esc(h.sets.map(x => x.reps).join(', ') + ' @ ' + kgVal(h.sets[0].kg) + unit(h.sets[0].kg)) + '<span>' + esc(dateTxt(h.at) + ', ' + h.name) + '</span></div>').join('') + historyRow(b.exId) : '<p class="dim" style="margin-top:6px">Nothing yet</p>') +
    '<button class="wide" data-a="later">Do this later</button>', '', { title: b.name, done: 'close' });
}
function finishSheet() {
  let left = 0; S.cur.blocks.forEach(b => { if (b.kind !== 'check') (b.kind === 'ss' ? b.parts : [b]).forEach(p => { left += p.sets.filter(x => x.kind === 'work' && isOpen(x)).length; }); });
  return sheetBox('Finish the workout', '<h2>Finish now?</h2>' + (left ? '<p class="dim" style="margin-top:6px">' + plural(left, 'set') + ' left. They’ll be saved as skipped.</p>' : ''), '',
    '<button class="primary" style="margin-top:14px" data-a="finish">Finish workout</button><button class="wide" data-a="close">Keep going</button>' +
    '<button class="wide danger" data-a="discard">' + (UI.confirm === 'discard' ? 'Tap again to discard' : 'Discard workout') + '</button>');
}
function sessionSheet() {
  const s = S.sessions.find(o => o.id === UI.sheet.id); if (!s) return '';
  const lines = liftsInOrderDone(s).map((b, k) => {
    const d = b.sets.map((x, i) => [x, i]).filter(([x]) => x.kind === 'work' && x.done);
    return '<div class="hrow">' + esc(b.name) + (d.length ? '<div class="hsets">' + d.map(([x, i]) => '<button data-a="sSet" data-k="' + k + '" data-i="' + i + '" aria-label="Fix ' + esc(b.name) + ', ' + esc(setTxt(x) + unit(x.kg)) + '">' + esc(setTxt(x)) + '</button>').join('') + '</div>' : '<span>Skipped</span>') + '</div>';
  }).join('');
  return sheetBox(s.name, '<h2>' + esc(s.name) + '</h2><p class="dim" style="margin-top:2px">' + esc(dateTxt(s.endedAt)) + ', ' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + ' min · tap a set to fix it</p>',
    '<div style="margin-top:8px">' + lines + '</div>',
    '<button class="primary" data-a="close">Done</button><button class="wide danger" data-a="delSession" data-id="' + esc(s.id) + '">' + (UI.confirm === 'del' ? 'Tap again to delete' : 'Delete workout') + '</button>');
}
function ssetAt(sh) { const s = S.sessions.find(o => o.id === sh.id), b = s && liftsInOrderDone(s)[sh.k]; return b && b.sets[sh.i] ? { s, b, x: b.sets[sh.i] } : null; }
function ssetCommit() {
  const sh = UI.sheet, t = ssetAt(sh), v = parseFloat(sh.buf); if (!t || sh.buf === '' || isNaN(v)) { sh.buf = ''; return; }
  if (sh.field === 'reps') t.x.reps = clamp(Math.round(v), 1, 999); else t.x.kg = r2(Math.min(999, Math.max(0, v)));
  t.s.updatedAt = now(); sh.buf = ''; saveSessionsLocal();
}
function ssetSheet() {
  const sh = UI.sheet, t = ssetAt(sh); if (!t) return '';
  const { b, x } = t, isKg = sh.field === 'kg', cur = isKg ? x.kg : x.reps, n = b.sets.filter(y => y.kind === 'work').indexOf(x) + 1;
  const st = isKg ? b.step || 2.5 : 1, base = sh.buf !== '' ? parseFloat(sh.buf) || 0 : cur || 0;
  const shown = sh.buf !== '' ? sh.buf : String(isKg ? fmt(cur || 0) : cur);
  const chips = [-2 * st, -st, st, 2 * st].map(dl => '<button data-a="padSet" data-v="' + Math.max(0, r2(base + dl)) + '" aria-label="' + (dl > 0 ? 'Add ' : 'Take off ') + fmt(Math.abs(dl)) + '">' + (dl > 0 ? '+' : '−') + fmt(Math.abs(dl)) + '</button>').join('');
  const seg = '<div class="seg2" role="group" aria-label="Change"><button class="' + (isKg ? 'on' : '') + '" data-a="ssetField" data-v="kg" aria-pressed="' + isKg + '">Weight</button><button class="' + (isKg ? '' : 'on') + '" data-a="ssetField" data-v="reps" aria-pressed="' + !isKg + '">Reps</button></div>';
  return sheetBox(b.name + ', set ' + n,
    '<div class="ssethead"><span><b>' + esc(b.name) + '</b><span class="dim small">Set ' + n + ' · ' + esc(setTxt(x) + unit(x.kg)) + '</span></span>' + seg + '</div>',
    '<div class="padval"><span style="color:' + (sh.buf !== '' ? 'var(--cream)' : 'var(--half)') + '">' + esc(shown) + '</span><span class="caret" aria-hidden="true"></span></div>' +
    '<div class="chips">' + chips + '</div>' +
    '<div class="keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => k === 'del' ? '<button data-a="key" data-k="del" aria-label="Delete">' + ICON.del + '</button>' : '<button data-a="key" data-k="' + k + '"' + (k === '.' && !isKg ? ' class="off" aria-disabled="true"' : '') + (k === '.' ? ' aria-label="Decimal point"' : '') + '>' + k + '</button>').join('') + '</div>',
    '<button class="primary" data-a="ssetDone">Done</button>');
}
// The workout list: what's done, what's now, what's left. Tap one to do it now (the rest keep their order), skip one, or bring it back.
function planSheet() {
  const c = S.cur, open = nextOpen(c);
  const rows = c.blocks.map((b, bi) => {
    const st = blockState(b), cur = open && open.bi === bi, sets = blockSets(b), work = sets ? sets.filter(x => x.kind === 'work') : [];
    const sub = st === 'skipped' ? 'Skipped' : b.kind === 'check' ? (b.done ? 'Done' : plural(b.items.length, 'item')) : (b.kind === 'ss' ? 'Superset, ' : '') + (work.some(x => x.done) || st === 'done' ? work.filter(x => x.done).length + ' of ' : '') + plural(work.length, 'set');
    const icon = st === 'done' ? '<span class="pls on">' + ICON.check + '</span>' : cur ? '<span class="pls cur"></span>' : st === 'skipped' ? '<span class="pls sk"></span>' : '<span class="pls"></span>';
    const name = '<span class="plm-t"><b>' + esc(blockTitle(b)) + '</b><span class="sub">' + (cur ? 'Now · ' : '') + esc(sub) + '</span></span>';
    let main, ctl = '';
    if (st === 'open' && !cur) main = '<button class="plm" data-a="planNow" data-bi="' + bi + '" aria-label="' + esc(blockTitle(b)) + ': do it now">' + name + '<span class="plnow">Do now</span></button>';
    else main = '<div class="plm">' + name + '</div>';
    if (st === 'open') ctl = '<button class="plx" data-a="planSkip" data-bi="' + bi + '" aria-label="Skip ' + esc(blockTitle(b)) + '">Skip</button>'; else if (st === 'skipped') ctl = '<button class="plx" data-a="planBack" data-bi="' + bi + '" aria-label="Bring back ' + esc(blockTitle(b)) + '">Bring back</button>';
    return '<div class="plr' + (cur ? ' cur' : '') + (st !== 'open' ? ' ' + st : '') + '">' + icon + main + ctl + '</div>';
  }).join('');
  return sheetBox('This workout', '<h2>This workout</h2>', '<div class="plist">' + rows + '</div>', '<button class="primary" data-a="close">Done</button>');
}
// 5a: one Add button, and the routine's own actions behind ⋯
function addMenuSheet() {
  const row = (a, label) => '<button class="menurow" data-a="' + a + '">' + ICON.plus + '<span>' + label + '</span></button>';
  return sheetBox('Add', '<h2>Add</h2>', '<div class="menu">' + row('addExercise', 'Exercise') + row('addSuperset', 'Superset') + row('addChecklist', 'Checklist') + '</div>', '<button class="wide" data-a="close">Cancel</button>');
}
function rMenuSheet() {
  const r = curRoutine(), rs = routinesIn(planOf(r)), pos = rs.findIndex(x => x.id === UI.editId), pl = planById(planOf(r));
  const row = (a, label, extra) => '<button class="menurow" data-a="' + a + '"' + (extra || '') + '><span>' + label + '</span></button>';
  return sheetBox('Routine', '<h2>' + esc((r || {}).name || 'Routine') + '</h2>', '<div class="menu">' +
    '<button class="menurow" data-a="rPlan"><span>Plan<small class="menusub">' + esc(pl ? pl.name || 'Untitled plan' : 'Not in a plan') + '</small></span>' + ICON.chev + '</button>' +
    (rs.length > 1 ? row('moveRoutine', 'Move up in the list', ' data-d="-1"' + (pos === 0 ? ' disabled' : '')) + row('moveRoutine', 'Move down in the list', ' data-d="1"' + (pos === rs.length - 1 ? ' disabled' : '')) : '') +
    row('dupRoutine', 'Duplicate') + '<button class="menurow danger" data-a="delRoutine"><span>Delete</span></button></div>', '<button class="wide" data-a="close">Close</button>');
}
function pasteSheet() {
  const sh = UI.sheet;
  return sheetBox('Paste JSON', '',
    '<div class="pasterow"><button class="ghost" data-a="pasteClip" aria-label="Paste from clipboard">Paste</button><button class="ghost" data-a="pasteExample">Copy example</button></div>' +
    '<textarea id="paste-json" class="pastebox" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Routine as JSON" placeholder="' + (sh.plan ? '{ &quot;plan&quot;: &quot;Push Pull Legs&quot;, &quot;routines&quot;: [ … ] }' : '{ &quot;name&quot;: &quot;Push day&quot;, &quot;items&quot;: [ … ] }&#10;&#10;or a whole plan:&#10;{ &quot;plan&quot;: …, &quot;routines&quot;: [ … ] }') + '">' + esc(sh.text || '') + '</textarea>' +
    '<p class="pastest" id="paste-status" role="status">' + pasteStatusHtml(sh) + '</p>',
    '', { title: 'Paste JSON', cancel: 'close', done: 'pasteAdd' });
}
function backupSheet() {
  const t = S.settings.lastBackup;
  return sheetBox('Backup', '<h2>Backup</h2><p class="dim" style="margin-top:4px">' + esc(t ? 'Last one ' + dateTxt(t) + '.' : 'No backup yet.') + ' Your workouts only live on this phone.</p>', '',
    '<button class="primary" style="margin-top:14px" data-a="backupSave">Download backup</button>' +
    (canShareFile() ? '<button class="wide" data-a="backupShare">Share backup…</button>' : '') +
    '<button class="wide" data-a="restorePick">Restore from a file</button><input id="restore-file" class="hidden-input" type="file" tabindex="-1" aria-hidden="true">' +
    '<button class="wide" data-a="close">Close</button>');
}
function sheetHtml() {
  const sh = UI.sheet; if (!sh) return '';
  const ty = sh.type, c = S.cur;
  if (UI.screen === 'edit') return ty === 'pick' ? pickSheet() : ty === 'slot' ? slotSheet() : ty === 'ss' ? ssSheet() : ty === 'check' ? checkSheet() : ty === 'addmenu' ? addMenuSheet() : ty === 'rmenu' ? rMenuSheet() : ty === 'rplan' ? rPlanSheet() : ty === 'paste' ? pasteSheet() : '';
  if (UI.screen === 'plan') return ty === 'padd' ? planAddSheet() : ty === 'pmenu' ? planMenuSheet() : ty === 'paste' ? pasteSheet() : '';
  if (ty === 'session') return sessionSheet();
  if (ty === 'backup') return backupSheet();
  if (ty === 'wpad') return wpadSheet();
  if (ty === 'sset') return ssetSheet();
  if (!c) return '';
  if (ty === 'plan') return planSheet();
  return ty === 'pad' ? padSheet() : ty === 'change' ? changeSheet() : ty === 'ex' ? exSheet() : ty === 'finish' ? finishSheet() : '';
}
// A number typed into a field but not yet stored (the field still has focus) is stored before anything else happens.
function commitPending() { const el = document.activeElement; if (el && el.classList && el.classList.contains('stpv') && el.value !== el.dataset.raw) commitField(el); }
function render() {
  commitPending();
  const prevScroll = document.getElementById('scroll'), keep = prevScroll ? prevScroll.scrollTop : 0;
  const sheetEl = document.querySelector('.sh-b'), sheetKeep = sheetEl ? sheetEl.scrollTop : 0;
  const pageEl = document.querySelector('.paperscreen'), pageKeep = pageEl ? pageEl.scrollTop : 0, prevScreen = render.last;
  const ae = document.activeElement, sel = ae && ae.matches && ae.matches('input, textarea') ? [ae.selectionStart, ae.selectionEnd, ae.scrollTop] : null, focusSel = ae && ae.matches && ae.matches('input, textarea') ? (ae.id ? '#' + ae.id : ae.dataset.ci != null ? '[data-ci="' + ae.dataset.ci + '"][data-cf="' + ae.dataset.cf + '"]' : null) : null;
  let html = '', cls = '';
  const c = S.cur;
  if (UI.screen === 'summary') { html = summaryScreen(); cls = 'paper'; }
  else if (UI.screen === 'edit') { html = editScreen(); cls = 'paper'; }
  else if (UI.screen === 'plan') { html = planScreen(); cls = 'paper'; }
  else if (PSCREENS[UI.screen]) { html = '<div class="screen paperscreen' + (UI.screen === 'progress' ? ' tabbed' : '') + '">' + PSCREENS[UI.screen]() + '</div>' + (UI.screen === 'progress' ? tabbarHtml('progress') : ''); cls = 'paper'; }
  else if (UI.screen === 'train' && c) {
    const t = nextOpen(c);
    if (!t) { finish(); return; }
    // fixing a logged set (even mid-rest) shows that set's exercise
    if (c.rest && !c.fix) { html = '<div class="screen">' + restScreen(c) + '</div>'; cls = 'resting'; }
    else { const s = c.fix || t, b = c.blocks[s.bi]; html = '<div class="screen">' + (b.kind === 'check' ? checkScreen(c, s) : b.kind === 'ss' ? ssScreen(c, s) : liftScreen(c, s)) + '</div>'; }
  } else { UI.screen = 'today'; html = todayScreen(); cls = 'paper'; }
  const sh = sheetHtml();
  if (sh) html += '<div class="sheetwrap"><button class="scrim" data-a="' + (UI.sheet.type === 'pick' ? 'pickCancel' : UI.screen === 'edit' ? 'cancel' : 'close') + '" aria-label="Close"></button>' + sh.replace('class="sheet', 'class="sheet' + (UI.sheet !== render.sheetObj ? ' enter' : '')) + '</div>';
  else UI.sheet = null;
  render.sheetObj = UI.sheet;
  if (UI.toast) html += '<div class="toast' + (UI.screen === 'train' ? ' top' : '') + '" role="status"><span>' + esc(UI.toast.text) + '</span>' + (UI.toast.act ? '<button data-a="' + UI.toast.act + '">Undo</button>' : '') + '</div>';
  $app.innerHTML = html;
  $app.classList.toggle('tabs', !!$app.querySelector('.tabbar'));
  document.body.className = cls;
  if (document.querySelector('.sheet.form')) cls = 'form';
  const tc = cls === 'form' ? '#18492F' : cls === 'paper' ? '#F7EBC4' : cls === 'resting' ? '#0B2F1D' : '#0E3A24', meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.content !== tc) meta.content = tc;
  const sc = document.getElementById('scroll');
  if (sc) { if (UI.scrollToCard) { const card = document.getElementById('card'); if (card && sc.contains(card)) card.scrollIntoView({ block: 'nearest' }); } else sc.scrollTop = keep; }
  UI.scrollToCard = false;
  const np = document.querySelector('.paperscreen'); if (np && prevScreen === UI.screen) np.scrollTop = pageKeep;
  const ns = document.querySelector('.sh-b'); if (ns && sheetEl && !ns.parentNode.classList.contains('enter')) ns.scrollTop = sheetKeep;
  sheetEdges();
  render.last = UI.screen;
  syncHistory();
  const vk = UI.screen + '|' + (UI.sheet ? UI.sheet.type + (UI.sheet.p != null ? UI.sheet.p : '') : '') + '|' + (c && c.rest ? 'rest' : '') + '|' + (c && UI.screen === 'train' ? JSON.stringify(nextOpen(c)) : '');
  if (vk !== render.vk) { render.vk = vk; tapGuardUntil = performance.now() + TAP_GUARD; }
  let f = null;
  let focusOnPurpose = null;
  if (UI.focus) { f = focusOnPurpose = document.querySelector(UI.focus); UI.focus = null; }
  else if (focusSel) f = document.querySelector(focusSel);
  if (f) {
    try {
      f.focus({ preventScroll: true });
      if (f !== focusOnPurpose && sel) { f.setSelectionRange(sel[0], sel[1]); f.scrollTop = sel[2]; }
      else { const n = f.value.length; f.setSelectionRange(n, n); }
    } catch (e) { /* not focusable */ }
  }
  if (f && f === focusOnPurpose && f.closest('.sh-b')) {
    const add = f.closest('.item') && document.querySelector('.sh-b [data-a="addItem"]');
    if (add) add.scrollIntoView({ block: 'nearest' }); // the new item and the button to add the next one
    f.scrollIntoView({ block: 'nearest' });
  }
}

settleStale();
render();
if (S.cur && UI.screen === 'train') keepAwake();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* not supported */ }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadWorker = !!navigator.serviceWorker.controller;
  let updateReady = false;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  // A new version has taken over. Reload now if nothing's in progress, otherwise when the app is next put away.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadWorker) return;
    if (UI.screen === 'today' && !UI.sheet && !S.cur) location.reload(); else updateReady = true;
  });
  document.addEventListener('visibilitychange', () => { if (updateReady && document.visibilityState === 'hidden') location.reload(); });
}
})();
