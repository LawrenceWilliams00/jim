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
let S = { exercises: {}, routines: [], sessions: [], settings: { sound: true, rangeMode: true }, cur: null };
const UI = { screen: 'today', sheet: null, toast: null, sel: null, editId: null, confirm: null, scrollToCard: false, lastLog: null, summary: null };
(function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const o = JSON.parse(raw);
      S = Object.assign(S, o);
      S.exercises = o.exercises || {};
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
  const ex = { id, name: nm, step: step || 2.5, notes: '', updatedAt: 0 };
  S.exercises[id] = ex; return ex;
}
function migrate() {
  const dirtyR = new Set(), dirtyX = new Set(), dirtyS = new Set();
  const before = new Set(Object.keys(S.exercises));
  const slot = (s, r) => { if (s.exId) return; const ex = ensureEx(s.name, s.step); s.exId = ex.id; if (s.range == null) s.range = (s.hi || s.lo) !== s.lo; delete s.name; delete s.eq; delete s.step; dirtyR.add(r); };
  S.routines.forEach(r => (r.blocks || []).forEach(b => { if (b.kind === 'lift') slot(b, r); else if (b.kind === 'ss') (b.parts || []).forEach(p => slot(p, r)); }));
  const lifts = sess => { let d = false; (sess.blocks || []).forEach(b => (b.kind === 'ss' ? b.parts : b.kind === 'lift' ? [b] : []).forEach(l => { if (!l.exId) { const ex = ensureEx(l.name, l.step); l.exId = ex.id; l.key = ex.id; l.name = ex.name; delete l.eq; d = true; } })); return d; };
  S.sessions.forEach(s => { if (lifts(s)) dirtyS.add(s); }); if (S.cur) lifts(S.cur);
  if (S.notes) { Object.entries(S.notes).forEach(([k, v]) => { const ex = findByName(k); if (ex && v && !ex.notes) { ex.notes = v; dirtyX.add(ex.id); } }); delete S.notes; }
  let settings = false; if (S.settings.rest) { delete S.settings.rest; settings = true; }
  if (S.settings.ui) { delete S.settings.ui; settings = true; } // left over from trying typing layouts
  Object.keys(S.exercises).forEach(id => { if (!before.has(id)) dirtyX.add(id); });
  return { routines: [...dirtyR], exercises: [...dirtyX], sessions: [...dirtyS], settings };
}
migrate();
if (S.cur && now() - (S.cur.updatedAt || 0) < 6 * 3600 * 1000) UI.screen = 'train';

const routinesSorted = () => S.routines.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
const routineById = id => S.routines.find(r => r.id === id);
function suggestedRoutine() {
  const rs = routinesSorted(); if (!rs.length) return null;
  const last = sortedSessions()[0]; if (!last) return rs[0];
  const i = rs.findIndex(r => r.id === last.routineId);
  return i < 0 ? rs[0] : rs[(i + 1) % rs.length];
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
function warmKg(b, frac) { const top = workKg(b); if (top == null) return null; if (top === 0 || frac === 'easy') return 0; return r2(Math.max(b.step, Math.round((top * frac) / b.step) * b.step)); }
function refreshWarm(b) { if (b.kind === 'lift') b.sets.forEach(x => { if (x.kind === 'warm' && isOpen(x) && !x.touched) { x.kg = warmKg(b, x.frac); if (x.kg === 0 && x.frac !== 'easy') { x.frac = 'easy'; x.reps = Math.max(3, b.lo - 2); } } }); }
function liftBlock(slot, ssRest, src) {
  const ex = exById(slot.exId) || { id: slot.exId, name: 'Untitled exercise', step: 2.5 };
  const step = ex.step || 2.5, lo = slot.lo || 8, hi = slot.range ? Math.max(lo, slot.hi || lo) : lo;
  const n = clamp(slot.sets || 3, 1, 12);
  const last = lastFor(ex.id, lo, hi);
  let kg = null, reps = [];
  if (last) { kg = last.same && last.allTop ? r2(last.kg + step) : last.kg; reps = last.same && !last.allTop ? last.sets.map(x => x.reps) : []; }
  const b = { kind: 'lift', exId: ex.id, key: ex.id, name: ex.name, step, lo, hi, rest: ssRest != null ? ssRest : (slot.rest != null ? slot.rest : 90), src, sets: [] };
  const w = clamp(slot.warm || 0, 0, 4);
  (w ? RAMPS[w] : []).forEach(([frac, r]) => b.sets.push({ kind: 'warm', frac, reps: r, kg: null, done: false, skipped: false, touched: false }));
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
  const data = { app: 'jim', version: 3, exportedAt: now(), exercises: S.exercises, routines: S.routines, sessions: S.sessions, settings: S.settings };
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
  const [ss, ns] = merge(S.sessions, o.sessions);
  S.exercises = Object.fromEntries(xs.map(x => [x.id, x])); S.routines = rs; S.sessions = ss;
  if (o.notes) S.notes = o.notes;
  migrate(); saveLocal(); saveSessionsLocal();
  return { routines: nr, sessions: ns };
}

// ---------- sound + screen ----------
let actx = null, wake = null;
function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } }
function beep() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* no vibration */ }
  if (!S.settings.sound || !actx) return;
  try { [0, 0.22].forEach(t => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.16); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.18); }); } catch (e) { /* audio blocked */ }
}
async function keepAwake() { if (!S.cur || wake || !('wakeLock' in navigator)) return; try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch (e) { wake = null; } }
function letSleep() { try { if (wake) wake.release(); } catch (e) { /* already released */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); tick(); } });

// ---------- training ----------
function toast(text, act) { clearTimeout(toast.t); UI.toast = { text, act: act || null }; render(); toast.t = setTimeout(() => { UI.toast = null; render(); }, act ? 5000 : 3000); }
function edit(fn) { const c = S.cur, t = target(c); if (!t) return; const b = liftAt(c, t), x = b.sets[t.i]; fn(x, b); x.touched = true; refreshWarm(b); touchCur(); render(); }
function needsWork() { const c = S.cur, t = target(c); if (!t || c.blocks[t.bi].kind === 'check') return false; const b = liftAt(c, t), x = b.sets[t.i]; return x.kind === 'warm' && x.kg == null; }
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
  c.rest = null; UI.scrollToCard = true; touchCur();
  toast('Logged ' + setTxt(x) + unit(x.kg), 'undo');
}
function undoLast() {
  const c = S.cur, t = UI.lastLog || (c && c.rest && c.rest.from); if (!c || !t) return;
  const b = liftAt(c, t); if (!b || !b.sets[t.i]) return;
  b.sets[t.i].done = false; c.rest = null; c.over = null;
  c.pick = c.blocks[t.bi].kind === 'ss' ? { bi: t.bi, p: t.p } : null;
  UI.lastLog = null; UI.toast = null; UI.scrollToCard = true; touchCur(); render();
}
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
  S.cur = cur; UI.screen = 'train'; UI.sheet = null; UI.lastLog = null; UI.toast = null;
  touchCur(); keepAwake(); render();
}
function slotFromSrc(src) { const r = src && routineById(src.rid); const bl = r && r.blocks[src.bi]; if (!bl) return null; return { r, bl }; }

// ---------- routine editing ----------
const curRoutine = () => routineById(UI.editId);
function openSheet(sh) { UI.sheet = sh; UI.confirm = null; render(); }
function sheetBlock() { const r = curRoutine(), sh = UI.sheet; return r && sh && r.blocks[sh.bi]; }
function sheetSlot() { const bl = sheetBlock(), sh = UI.sheet; if (!bl) return null; return sh.p != null ? (bl.parts || [])[sh.p] : bl; }
function slotDefaults(exId) {
  for (const r of S.routines) for (const s of slotsOf(r)) if (s.exId === exId) return { sets: s.sets, lo: s.lo, hi: s.hi, range: !!s.range, rest: s.rest != null ? s.rest : 90, warm: s.warm || 0 };
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

const A = {
  // today
  start: () => { const r = routineById(UI.sel) || suggestedRoutine(); if (r) startWorkout(r); },
  pickRoutine: d => { UI.sel = d.id; render(); },
  sound: () => { S.settings.sound = !S.settings.sound; unlockAudio(); saveSettings(); render(); },
  resume: () => { unlockAudio(); UI.screen = 'train'; keepAwake(); render(); },
  toToday: () => { UI.screen = 'today'; UI.sheet = null; if (S.cur) S.cur.fix = null; render(); },
  openSession: d => openSheet({ type: 'session', id: d.id }),
  delSession: d => { if (UI.confirm !== 'del') { UI.confirm = 'del'; render(); return; } deleteSession(d.id); UI.sheet = null; UI.confirm = null; render(); },
  close: () => { UI.sheet = null; UI.confirm = null; render(); },
  // routines
  newRoutine: () => { const r = { id: uid('r'), name: '', order: Math.max(0, ...S.routines.map(x => x.order || 0)) + 1, blocks: [], updatedAt: now() }; S.routines.push(r); saveRoutine(r); UI.editId = r.id; UI.sel = r.id; UI.screen = 'edit'; UI.focus = '#r-name'; render(); },
  editRoutine: d => { UI.editId = d.id; UI.screen = 'edit'; UI.sheet = null; render(); },
  editDone: () => { const r = curRoutine(); if (r && !String(r.name).trim()) { r.name = 'Untitled routine'; saveRoutine(r); } UI.screen = 'today'; UI.sheet = null; render(); },
  dupRoutine: () => { const r = curRoutine(); if (!r) return; const c = clone(r); c.id = uid('r'); c.name = (r.name || 'Routine') + ' copy'; c.order = (r.order || 0) + 0.5; S.routines.push(c); routinesSorted().forEach((x, i) => { x.order = i; saveRoutine(x); }); UI.editId = c.id; UI.sel = c.id; UI.focus = '#r-name'; toast('Copied. You’re editing the copy.'); },
  delRoutine: () => { const r = curRoutine(); if (!r) return; S.routines = S.routines.filter(x => x.id !== r.id); removeRoutineStore(r.id); UI.undoRoutine = r; UI.undoEx = pruneEx(slotsOf(r).map(s => s.exId)); UI.editId = null; UI.sel = null; UI.screen = 'today'; toast('Deleted ' + (r.name || 'routine') + '.', 'undoDelRoutine'); },
  undoDelRoutine: () => { const r = UI.undoRoutine; if (!r) return; (UI.undoEx || []).forEach(x => { S.exercises[x.id] = x; saveEx(x); }); S.routines.push(r); saveRoutine(r); UI.undoRoutine = null; UI.toast = null; UI.sel = r.id; render(); },
  moveRoutine: d => { const rs = routinesSorted(), i = rs.findIndex(x => x.id === UI.editId), j = i + +d.d; if (i < 0 || j < 0 || j >= rs.length) return; [rs[i], rs[j]] = [rs[j], rs[i]]; rs.forEach((x, k) => { if (x.order !== k) { x.order = k; saveRoutine(x); } }); render(); },
  addExercise: () => { UI.focus = '#pick-q'; openSheet({ type: 'pick', mode: 'add', q: '' }); },
  addSuperset: () => { const r = curRoutine(); r.blocks.push({ kind: 'ss', rest: 90, parts: [] }); saveRoutine(r); openSheet({ type: 'ss', bi: r.blocks.length - 1, isNew: true, snap: null }); },
  addChecklist: () => { const r = curRoutine(); r.blocks.push({ kind: 'check', name: 'Warm-up', items: [{ text: '', detail: '', ticks: 1, timer: 0 }] }); saveRoutine(r); UI.focus = '[data-ci="0"][data-cf="text"]'; openSheet({ type: 'check', bi: r.blocks.length - 1, isNew: true, snap: null }); },
  openBlock: d => { const r = curRoutine(), bi = +d.bi, bl = r.blocks[bi]; UI.sheet = { type: bl.kind === 'ss' ? 'ss' : bl.kind === 'check' ? 'check' : 'slot', bi, isNew: false }; UI.sheet.snap = snapshot(); render(); },
  openPart: d => { const sh = UI.sheet, part = sheetBlock().parts[+d.p]; UI.sheet = { type: 'slot', bi: sh.bi, p: +d.p, parent: sh, partSnap: { part: clone(part), exercises: clone(S.exercises) } }; render(); },
  pickEx: d => {
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
    else if (f === 'step') { const ex = exById(t.exId); if (ex) { const i = STEPS.indexOf(ex.step); ex.step = STEPS[clamp((i < 0 ? 4 : i) + dv, 0, STEPS.length - 1)]; saveEx(ex); } }
    changed(); },
  repMode: d => { const t = sheetSlot(); if (!t) return; t.range = d.v === 'range'; if (t.range && (t.hi || 0) <= t.lo) t.hi = t.lo + 2; S.settings.rangeMode = t.range; saveSettings(); changed(); },
  item: d => { const bl = sheetBlock(); if (!bl) return; const it = bl.items[+d.i]; if (d.f === 'ticks') it.ticks = clamp((it.ticks || 1) + +d.d, 1, 6); if (d.f === 'timer') it.timer = clamp((it.timer || 0) + +d.d, 0, 60); changed(); },
  addItem: () => { const bl = sheetBlock(); bl.items.push({ text: '', detail: '', ticks: 1, timer: 0 }); UI.focus = '[data-ci="' + (bl.items.length - 1) + '"][data-cf="text"]'; changed(); },
  delItem: d => { const bl = sheetBlock(); bl.items.splice(+d.i, 1); changed(); },
  move: d => { const r = curRoutine(), sh = UI.sheet; if (sh.p != null) { const bl = r.blocks[sh.bi], j = sh.p + +d.d; if (j < 0 || j >= bl.parts.length) return; [bl.parts[sh.p], bl.parts[j]] = [bl.parts[j], bl.parts[sh.p]]; sh.p = j; } else { const j = sh.bi + +d.d; if (j < 0 || j >= r.blocks.length) return; [r.blocks[sh.bi], r.blocks[j]] = [r.blocks[j], r.blocks[sh.bi]]; sh.bi = j; } changed(); },
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
  padReps: () => openSheet({ type: 'pad', field: 'reps', buf: '' }),
  padKg: () => openSheet({ type: 'pad', field: 'kg', buf: '', work: needsWork() }),
  row: d => { const c = S.cur, pos = { bi: +d.bi, i: +d.i }; const x = liftAt(c, pos).sets[pos.i]; if (x.done) c.fix = c.fix && c.fix.bi === pos.bi && c.fix.i === pos.i ? null : pos; else { x.skipped = false; c.fix = null; } UI.scrollToCard = true; touchCur(); render(); },
  log: () => logSet(),
  skip: () => skipSet(),
  undo: () => undoLast(),
  add: () => { const c = S.cur, t = target(c); if (!t) return; const b = liftAt(c, t), src = b.sets[b.sets.length - 1]; b.sets.push({ kind: 'work', reps: src.reps, kg: src.kg, done: false, skipped: false, touched: false, type: 0 }); touchCur(); render(); },
  later: () => { const c = S.cur, t = nextOpen(c); if (!t || t.bi === c.blocks.length - 1) { UI.sheet = null; toast('This is already the last one.'); return; } const [b] = c.blocks.splice(t.bi, 1); c.blocks.push(b); c.pick = null; c.fix = null; UI.sheet = null; touchCur(); toast(blockTitle(b) + ' moved to the end.'); },
  pick: d => { S.cur.pick = { bi: +d.bi, p: +d.p }; touchCur(); render(); },
  // rest
  restLess: () => { const r = S.cur.rest; if (!r) return; r.endsAt = Math.max(now() + 1000, r.endsAt - 15000); touchCur(); tick(); },
  restMore: () => { const r = S.cur.rest; if (!r) return; r.endsAt += 15000; r.total = Math.max(r.total, Math.ceil((r.endsAt - now()) / 1000)); touchCur(); tick(); },
  skipRest: () => { S.cur.rest = null; S.cur.over = null; UI.scrollToCard = true; touchCur(); render(); },
  change: () => openSheet({ type: 'change' }),
  // number pad
  key: d => { const sh = UI.sheet; if (!sh) return; let buf = sh.buf; const k = d.k; if (k === 'del') buf = buf.slice(0, -1); else if (k === '.') { if (sh.field === 'reps' || buf.includes('.')) return; buf = (buf || '0') + '.'; } else { if (buf.replace('.', '').length >= 5) return; buf = buf === '0' ? k : buf + k; } sh.buf = buf; render(); },
  padSet: d => { UI.sheet.buf = fmt(Math.max(0, +d.v)); render(); },
  padDone: () => { const sh = UI.sheet, c = S.cur, t = target(c), v = parseFloat(sh.buf); UI.sheet = null; if (t && sh.buf !== '' && !isNaN(v)) { const b = liftAt(c, t), x = b.sets[t.i]; if (sh.work) b.sets.forEach(y => { if (y.kind === 'work' && isOpen(y)) y.kg = r2(v); }); else if (sh.field === 'reps') { x.reps = Math.round(v); x.touched = true; } else { x.kg = r2(v); x.touched = true; } refreshWarm(b); touchCur(); } render(); },
  // exercise info during training
  openEx: d => { const pos = { bi: +d.bi }; if (d.p != null && d.p !== '') pos.p = +d.p; openSheet({ type: 'ex', pos }); },
  restAdj: d => { const blk = S.cur.blocks[UI.sheet.pos.bi]; blk.rest = clamp((blk.rest || 0) + +d.d, 0, 600); if (blk.kind === 'ss') blk.parts.forEach(p => { p.rest = blk.rest; }); const hit = slotFromSrc(blk.src); if (hit && (blk.kind === 'ss' ? hit.bl.kind === 'ss' : hit.bl.exId === blk.exId)) { hit.bl.rest = blk.rest; saveRoutine(hit.r); } touchCur(); render(); },
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
$app.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || !$app.contains(el) || el.disabled) return; const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset); } });
$app.addEventListener('change', e => {
  if (e.target.id !== 'restore-file' || !e.target.files || !e.target.files[0]) return;
  e.target.files[0].text().then(t => {
    const n = restoreFrom(JSON.parse(t)); UI.sheet = null; UI.sel = null; render();
    const got = [n.routines && plural(n.routines, 'routine'), n.sessions && plural(n.sessions, 'workout')].filter(Boolean);
    toast(got.length ? 'Restored ' + got.join(' and ') + '.' : 'Nothing new in that backup.');
  }).catch(() => toast('That file isn’t a Jim backup.'));
});
$app.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || e.target.tagName !== 'INPUT') return;
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
  if (el.id === 'pick-q') { UI.sheet.q = el.value; const pl = document.querySelector('.picklist'); if (pl) { pl.innerHTML = pickListHtml(); pl.parentNode.scrollTop = 0; } sheetEdges(); return; }
  const r = curRoutine(); if (!r) return;
  if (el.dataset.rf === 'name') { r.name = el.value; saveRoutine(r); return; }
  if (el.dataset.f === 'exname') { const t = sheetSlot(), ex = t && exById(t.exId); if (ex) { ex.name = el.value; saveEx(ex); } return; }
  const bl = sheetBlock(); if (!bl) return;
  if (el.dataset.f === 'cname') { bl.name = el.value; saveRoutine(r); }
  else if (el.dataset.ci != null) { bl.items[+el.dataset.ci][el.dataset.cf] = el.value; saveRoutine(r); }
});

// ---------- ticking ----------
function tick() {
  const c = S.cur; let changedNow = false;
  if (c && c.rest && now() >= c.rest.endsAt) { c.over = { since: c.rest.endsAt }; c.rest = null; changedNow = true; if (UI.sheet && UI.sheet.type === 'change') UI.sheet = null; if (document.visibilityState === 'visible') beep(); UI.scrollToCard = true; }
  if (c && c.cardio && now() >= c.cardio.endsAt) { const it = c.blocks[c.cardio.bi] && c.blocks[c.cardio.bi].items[c.cardio.it]; if (it) it.ticks = it.ticks.map(() => true); c.cardio = null; changedNow = true; beep(); }
  if (changedNow) { touchCur(); if (UI.screen !== 'edit') render(); return; }
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

// ---------- Android back ----------
// Each open screen and sheet gets a history entry, so the back gesture closes the editor you're in rather than the app.
// Back keeps your changes, like Done; Cancel is there to throw them away.
let hDepth = (history.state && history.state.d) || 0, ignorePop = 0;
function syncHistory() {
  let want = UI.screen === 'today' ? 0 : 1;
  for (let s = UI.sheet; s; s = s.parent) want++;
  while (hDepth < want) { hDepth++; history.pushState({ d: hDepth }, ''); }
  if (hDepth > want) { ignorePop++; history.go(want - hDepth); hDepth = want; }
}
function goBack() {
  const sh = UI.sheet;
  if (sh) { if (UI.screen === 'edit') (sh.type === 'pick' ? A.pickCancel : A.done)(); else A.close(); return; }
  if (UI.screen === 'edit') A.editDone(); else if (UI.screen === 'train') A.toToday(); else if (UI.screen === 'summary') A.summaryDone(); else render();
}
window.addEventListener('popstate', e => {
  if (ignorePop) { ignorePop--; return; }
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
function pipsHtml(c, resting) {
  const todo = resting ? 'var(--line-rest)' : 'var(--line)', open = nextOpen(c);
  const cell = (on, cur, sk) => '<div class="pc" style="background:' + (on ? 'var(--cream)' : sk ? 'var(--skip)' : cur ? 'var(--half)' : todo) + '"></div>';
  let total = 0, done = 0;
  const groups = c.blocks.map((b, bi) => {
    if (b.kind === 'check') { total++; if (b.done) done++; return '<div class="pg" style="flex:1"><div class="pp" style="flex:1">' + cell(b.done, !resting && open && open.bi === bi, b.skipped) + '</div></div>'; }
    const parts = b.kind === 'ss' ? b.parts : [b];
    let n = 0;
    const html = parts.map((p, pi) => {
      const w = p.sets.filter(x => x.kind === 'work'); n += w.length; total += w.length; done += w.filter(x => x.done).length;
      const here = !resting && open && open.bi === bi && (b.kind !== 'ss' || open.p === pi);
      const curIdx = here ? (p.sets[open.i] && p.sets[open.i].kind === 'warm' ? p.sets.findIndex(y => y.kind === 'work') : open.i) : -1;
      return '<div class="pp" style="flex:' + Math.max(1, w.length) + '">' + p.sets.map((x, i) => x.kind === 'work' ? cell(x.done, i === curIdx, x.skipped) : '').join('') + '</div>';
    }).join('');
    return '<div class="pg" style="flex:' + Math.max(1, n) + '">' + html + '</div>';
  }).join('');
  return '<div class="pips" role="img" aria-label="' + done + ' of ' + total + ' done">' + groups + '</div>';
}
function topHtml(c, resting) {
  return '<div class="top"><button class="icon" data-a="toToday" aria-label="Back to Today">' + ICON.back + '</button>' +
    '<div class="top-mid"><span class="dim">' + esc(c.name) + '</span><span data-tick="elapsed">' + mmss(now() - c.startedAt) + '</span></div>' +
    '<button class="txtbtn" data-a="askFinish">Finish</button></div>' + pipsHtml(c, resting);
}
const overHtml = c => (c.over ? '<div class="over" role="status"><span>' + ICON.timer + 'Rest is up, you’re on</span><span data-tick="over">' + mmss(now() - c.over.since) + ' over</span></div>' : '');
function stepsHtml(b, x) {
  const v = kgVal(x.kg), cls = v.length >= 5 ? ' s' : v.length >= 4 ? ' m' : '';
  const c1 = x.kind === 'warm' ? (x.frac === 'easy' ? 'easy reps' : Math.round(x.frac * 100) + '% of ' + (workKg(b) == null ? 'working' : kgVal(workKg(b)) + unit(workKg(b)))) : 'reps, aim ' + range(b.lo, b.hi);
  const c2 = x.kg == null ? (x.kind === 'warm' ? 'set working weight' : 'set a weight') : x.kg === 0 ? 'bodyweight' : 'kg';
  return '<div class="steps"><button class="sq" data-a="repsDn" aria-label="One fewer rep">' + ICON.minus + '</button>' +
    '<button class="val" data-a="padReps" aria-label="Reps: ' + x.reps + ', tap to type">' + x.reps + '</button>' +
    '<button class="sq" data-a="repsUp" aria-label="One more rep">' + ICON.plus + '</button><span class="times" aria-hidden="true">×</span>' +
    '<button class="sq" data-a="kgDn" aria-label="Less weight">' + ICON.minus + '</button>' +
    '<button class="val' + cls + (x.kg == null ? ' unset' : '') + '" data-a="padKg" aria-label="Weight: ' + esc(v) + ', tap to type">' + esc(v) + '</button>' +
    '<button class="sq" data-a="kgUp" aria-label="More weight">' + ICON.plus + '</button></div>' +
    '<div class="caps"><span class="c1">' + esc(c1) + '</span><span class="c2">' + c2 + '</span></div>';
}
function lastTxt(b, x, wi) {
  if (x.kind === 'warm') return x.frac === 'easy' ? 'easy' : Math.round(x.frac * 100) + '%';
  const last = lastFor(b.exId, b.lo, b.hi), lw = last && last.all.filter(y => y.done)[wi];
  return lw ? 'last ' + setTxt(lw) : 'no last time';
}
function liftScreen(c, t) {
  const b = liftAt(c, t), ex = exById(b.exId), note = ex && ex.notes;
  let wi = -1, wu = 0;
  const rows = b.sets.map((x, i) => {
    if (x.kind === 'work') wi++; else wu++;
    const label = x.kind === 'warm' ? 'Warm-up ' + wu : 'Set ' + (wi + 1);
    const isCard = c.fix ? c.fix.bi === t.bi && c.fix.i === i : i === t.i;
    const lt = lastTxt(b, x, wi), cls = 'row' + (x.kind === 'warm' ? ' warm' : '');
    if (isCard) return '<div class="card" id="card"><div class="card-h"><b>' + label + (c.fix ? ', fixing' : '') + '</b><span class="dim small">' + esc(lt) + '</span></div>' + stepsHtml(b, x) +
      (x.kind === 'work' ? '<button class="typebtn" data-a="type" aria-label="Set type: ' + TYPES[x.type || 0] + '. Tap to change">' + TYPES[x.type || 0] + ICON.down + '</button>' : '<div style="height:10px"></div>') + '</div>';
    if (x.done) return '<button class="' + cls + '" data-a="row" data-bi="' + t.bi + '" data-i="' + i + '" aria-label="' + label + ', ' + esc(setTxt(x)) + '. Tap to fix"><span class="rl">' + label + '</span><span class="rv">' + esc(setTxt(x)) + (x.kg ? ' <small>kg</small>' : '') + '</span><span class="rlast">' + esc(lt) + '</span>' + ICON.check + '</button>';
    if (x.skipped) return '<button class="' + cls + ' pending" data-a="row" data-bi="' + t.bi + '" data-i="' + i + '" aria-label="' + label + ' skipped. Tap to do it"><span class="rl">' + label + '</span><span class="rv">Skipped</span><span class="rlast">tap to do it</span><span></span></button>';
    return '<div class="' + cls + ' pending"><span class="rl">' + label + '</span><span class="rv">— × ' + esc(kgVal(x.kg)) + (x.kg ? ' <small>kg</small>' : '') + '</span><span class="rlast">' + esc(lt) + '</span><span></span></div>';
  }).join('');
  const tx = b.sets[t.i];
  const label = c.fix ? 'Save' : tx.kg == null ? 'Set a weight' : 'Log ' + (tx.kind === 'warm' ? 'warm-up ' + b.sets.slice(0, t.i + 1).filter(y => y.kind === 'warm').length : 'set ' + b.sets.slice(0, t.i + 1).filter(y => y.kind === 'work').length);
  const nb = c.blocks[t.bi + 1];
  return topHtml(c) + overHtml(c) +
    '<div class="head"><h1><button class="h1btn' + (b.name.length > 12 ? ' sm' : '') + '" data-a="openEx" data-bi="' + t.bi + '">' + esc(b.name) + ICON.chev + '</button></h1><button class="chipbtn" data-a="later" aria-label="Do this exercise later">' + ICON.later + 'Later</button></div>' +
    (note ? '<button class="notebtn" data-a="openEx" data-bi="' + t.bi + '" aria-label="Notes: ' + esc(note) + '. Tap to edit"><span class="note">' + esc(note) + '</span></button>' : '') +
    '<div class="scroll" id="scroll">' + rows + '<button class="addbtn" data-a="add">' + ICON.plus + 'Add a set</button></div>' +
    '<div class="actions">' + (c.fix ? '' : '<button class="skip" data-a="skip">Skip</button>') + '<button class="primary" data-a="log">' + label + '</button></div>' +
    '<p class="then">' + (nb ? 'Then ' + esc(blockTitle(nb)) : 'Last one') + '</p>';
}
function ssScreen(c, t) {
  const blk = c.blocks[t.bi], R = Math.max(...blk.parts.map(p => p.sets.length)), r = t.i;
  const dots = Array.from({ length: R }, (_, k) => '<span class="dot" style="background:' + (blk.parts.every(p => !isOpen(p.sets[k])) ? 'var(--cream)' : k === r ? 'var(--half)' : 'var(--line)') + '"></span>').join('');
  const panels = blk.parts.map((p, pi) => {
    const letter = LETTERS[pi], x = p.sets[r];
    if (pi === t.p) {
      const ex = exById(p.exId), note = ex && ex.notes, prev = p.sets.slice(0, r).filter(y => y.done).map(setTxt);
      return '<section class="panel" aria-label="' + letter + ', ' + esc(p.name) + ', now"><div class="panel-h"><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="badge" aria-hidden="true">' + letter + '</span><h2 style="margin:0;min-width:0"><button class="namebtn" data-a="openEx" data-bi="' + t.bi + '" data-p="' + pi + '">' + esc(p.name) + ICON.chev + '</button></h2></div><span class="dim small" style="flex:none">' + esc(lastTxt(p, x, r)) + '</span></div>' +
        (note ? '<p class="dim small" style="padding:0 2px 2px">' + esc(note) + '</p>' : '') + stepsHtml(p, x) +
        '<div class="panel-f"><span>' + esc(prev.length ? 'Earlier: ' + prev.join(', ') : 'Round ' + (r + 1) + ' of ' + R) + '</span><button class="typebtn" style="margin:0" data-a="type">' + TYPES[x.type || 0] + ICON.down + '</button></div></section>';
    }
    const sub = !x ? 'No set this round' : x.done ? 'Done: ' + setTxt(x) + unit(x.kg) : x.skipped ? 'Skipped' : 'Up next: ' + setTxt(x) + unit(x.kg);
    const canPick = isOpen(x);
    return '<button class="collapsed" ' + (canPick ? 'data-a="pick" data-bi="' + t.bi + '" data-p="' + pi + '"' : 'disabled style="opacity:1"') + ' aria-label="' + letter + ', ' + esc(p.name) + ': ' + esc(sub) + (canPick ? '. Tap to do this one first' : '') + '"><span class="badge o" aria-hidden="true">' + letter + '</span><span style="flex:1;min-width:0"><b>' + esc(p.name) + '</b><span class="sub">' + esc(sub) + '</span></span>' + (canPick ? ICON.down : '') + '</button>';
  });
  const others = blk.parts.filter((p, pi) => pi !== t.p && isOpen(p.sets[r]));
  const lastRound = !blk.parts.some(p => p.sets.some((y, k) => k > r && isOpen(y)));
  const note = others.length ? 'Then ' + others[0].name + ', then ' + secTxt(blk.rest) + ' rest' : lastRound ? 'Last round' : 'Then ' + secTxt(blk.rest) + ' rest';
  const tx = blk.parts[t.p].sets[r];
  return topHtml(c) + overHtml(c) +
    '<div class="sshead"><div><div class="eyebrow">' + ICON.link + 'Superset</div><h1 class="h1" style="margin-top:4px">Round ' + (r + 1) + ' of ' + R + '</h1></div><div class="dots" role="img" aria-label="Round ' + (r + 1) + ' of ' + R + '">' + dots + '</div></div>' +
    '<div style="flex:1;min-height:12px"></div>' +
    panels.join('<div class="link" aria-hidden="true"><i></i>no rest</div>') +
    '<p class="dim small" style="flex:none;padding-top:10px">' + esc(note) + '</p>' +
    '<div class="actions" style="padding-top:12px"><button class="skip" data-a="skip">Skip</button><button class="primary" data-a="log">' + (tx.kg == null ? 'Set a weight' : 'Log ' + esc(blk.parts[t.p].name)) + '</button></div>';
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
    '<div class="head" style="padding-top:12px"><h1><button class="h1btn sm" data-a="openEx" data-bi="' + from.bi + '"' + (from.p != null ? ' data-p="' + from.p + '"' : '') + '>' + esc(b.name) + ICON.chev + '</button></h1></div>' +
    '<div style="flex:1;min-height:8px"></div>' +
    '<div class="ringwrap" data-tick="rest"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" fill="none" stroke="var(--track)" stroke-width="14"/><circle class="arc" cx="150" cy="150" r="140" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="879.6" stroke-dashoffset="' + r2(879.6 * (1 - frac)) + '" transform="rotate(-90 150 150)" style="stroke:' + col + '"/><circle class="knob" cx="150" cy="10" r="12" stroke="var(--rest)" stroke-width="4" style="fill:' + col + ';transform:rotate(' + r2(360 * frac) + 'deg);transform-origin:150px 150px"/></svg>' +
    '<div class="ringtxt" role="timer"><div class="big" style="color:' + col + '">' + mmss(left) + '</div><div class="dim tot" style="font-size:17px;margin-top:6px">left of ' + secTxt(r.total) + '</div></div></div>' +
    '<div class="adjust"><button data-a="restLess" aria-label="15 seconds less rest">−15 s</button><button data-a="restMore" aria-label="15 seconds more rest">+15 s</button></div>' +
    '<div style="flex:1;min-height:8px"></div>' +
    '<div class="lines"><div class="line"><span class="okdot">' + ICON.check + '</span><span class="t">' + logged + '</span>' + (pr ? '<span class="prtag">PR</span>' : '') + '<button class="ltxt" data-a="undo">Undo</button></div>' +
    (nx ? '<div class="line"><span class="t"><span class="dim">Next:</span> ' + nextLine + '</span>' + (canChange ? '<button class="ltxt" data-a="change" aria-label="Change the next set">Change' + ICON.chev + '</button>' : '') + '</div>' : '') + '</div>' +
    '<div class="actions" style="padding-top:16px"><button class="primary" data-a="skipRest">Skip rest</button></div>';
}

// ---------- paper screens ----------
function blockLines(r) {
  const row = (name, sub, right) => '<div class="wl"><span>' + esc(name) + (sub ? '<br><small class="dim">' + esc(sub) + '</small>' : '') + '</span><span>' + right + '</span></div>';
  return (r.blocks || []).map(b => {
    if (b.kind === 'check') return row(b.name || 'Checklist', (b.items || []).filter(it => it.text).map(it => it.text).join(', '), '');
    if (b.kind === 'ss') return row((b.parts || []).map((p, i) => LETTERS[i] + ') ' + exName(p.exId)).join('\n'), '', (b.parts || []).map(p => (p.sets || 3) + ' × ' + repsTxt(p)).join('<br>'));
    return row(exName(b.exId), b.warm ? plural(b.warm, 'warm-up set') : '', esc((b.sets || 3) + ' × ' + repsTxt(b)));
  }).join('');
}
function backupTxt() { const t = S.settings.lastBackup; return t ? 'Backed up ' + dateTxt(t) : S.sessions.length ? 'Not backed up yet' : 'On this phone'; }
function todayScreen() {
  const d = new Date(), c = S.cur, rs = routinesSorted(), sug = suggestedRoutine(), sel = routineById(UI.sel) || sug;
  let main;
  if (c) main = '<div class="wcard" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><b style="font-size:22px;min-width:0">' + esc(c.name) + '</b><span data-tick="elapsed" style="font-size:17px">' + mmss(now() - c.startedAt) + '</span></div><div style="margin-top:10px">' + pipsHtml(c) + '</div><button class="primary" style="width:100%;margin-top:16px" data-a="resume">Resume</button></div>';
  else if (!rs.length) main = '<button class="ghost ink" style="margin-top:16px;height:56px" data-a="newRoutine">' + ICON.plus + 'New routine</button>';
  else main = '<div class="rts">' + rs.map(r => '<button class="rt' + (r === sel ? ' on' : '') + '" data-a="pickRoutine" data-id="' + esc(r.id) + '" aria-pressed="' + (r === sel) + '"><span style="min-width:0"><b>' + esc(r.name || 'Untitled routine') + '</b><span class="sub">' + esc(routineSummary(r)) + '</span></span>' + (r === sug && rs.length > 1 ? '<span class="tag">Next</span>' : '') + '</button>').join('') + '</div>' +
    '<div class="wcard">' + (blockLines(sel) || '<p class="dim" style="padding:4px 0">Empty</p>') +
    '<div class="cardbtns"><button class="ghost" data-a="editRoutine" data-id="' + esc(sel.id) + '">Edit</button><button class="primary" data-a="start">Start</button></div></div>' +
    '<button class="ghost ink" data-a="newRoutine">' + ICON.plus + 'New routine</button>';
  const hist = sortedSessions().slice(0, 6);
  return '<div class="screen paperscreen">' +
    '<p class="date">' + d.toLocaleDateString('en-NZ', { weekday: 'long' }) + ' ' + d.getDate() + ' ' + d.toLocaleDateString('en-NZ', { month: 'long' }) + '</p><h1 class="h1">Today</h1>' + main +
    (hist.length ? '<h2 class="h2">Recent</h2>' + hist.map(s => { const n = liftsOf(s).reduce((a, b) => a + b.sets.filter(x => x.kind === 'work' && x.done).length, 0); return '<button class="hist" data-a="openSession" data-id="' + esc(s.id) + '"><span><b>' + esc(dateTxt(s.endedAt)) + '</b> · ' + esc(s.name) + '</span><span>' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + ' min, ' + n + ' sets</span></button>'; }).join('') : '') +
    '<div class="foot"><span>' + esc(backupTxt()) + '</span><div><button data-a="backup">Backup</button><button data-a="sound" aria-pressed="' + S.settings.sound + '">Sound: ' + (S.settings.sound ? 'on' : 'off') + '</button></div></div></div>';
}
function editScreen() {
  const r = curRoutine(); if (!r) { UI.screen = 'today'; return todayScreen(); }
  const rs = routinesSorted(), pos = rs.findIndex(x => x.id === r.id);
  const rows = (r.blocks || []).map((b, bi) => {
    let name, sub;
    if (b.kind === 'check') { name = b.name || 'Checklist'; sub = (b.items || []).filter(it => it.text).map(it => it.text).join(', ') || 'Checklist'; }
    else if (b.kind === 'ss') { name = (b.parts || []).map(p => exName(p.exId)).join(' + ') || 'Empty superset'; sub = 'Superset, ' + ((b.parts || []).map(p => (p.sets || 3) + ' × ' + repsTxt(p)).join(', ') || 'no exercises') + ', rest ' + secTxt(b.rest || 0); }
    else { name = exName(b.exId); sub = (b.sets || 3) + ' × ' + repsTxt(b) + ', rest ' + secTxt(b.rest || 0) + (b.warm ? ', ' + plural(b.warm, 'warm-up') : ''); }
    return '<button class="blk" data-a="openBlock" data-bi="' + bi + '"><span class="k" aria-hidden="true">' + (bi + 1) + '</span><span class="m"><b>' + esc(name) + '</b><span class="sub">' + esc(sub) + '</span></span>' + ICON.chev + '</button>';
  }).join('');
  return '<div class="screen paperscreen">' +
    '<div class="etop"><button data-a="editDone">' + ICON.back + 'Today</button><button data-a="editDone">Done</button></div>' +
    '<input id="r-name" class="pin" autocapitalize="sentences" enterkeyhint="done" data-rf="name" value="' + esc(r.name) + '" placeholder="Routine name" aria-label="Routine name" autocomplete="off">' +
    (rows ? '<div class="blks">' + rows + '</div>' : '') +
    '<div class="adds"><button data-a="addExercise">' + ICON.plus + 'Exercise</button><button data-a="addSuperset">' + ICON.plus + 'Superset</button><button data-a="addChecklist">' + ICON.plus + 'Checklist</button></div>' +
    (rs.length > 1 ? '<div class="rowbtns"><button data-a="moveRoutine" data-d="-1"' + (pos === 0 ? ' disabled' : '') + '>Move up</button><button data-a="moveRoutine" data-d="1"' + (pos === rs.length - 1 ? ' disabled' : '') + '>Move down</button></div>' : '') +
    '<div class="rowbtns"><button data-a="dupRoutine">Duplicate</button><button class="danger" data-a="delRoutine">Delete</button></div></div>';
}
function summaryScreen() {
  const s = UI.summary; if (!s) return todayScreen();
  let vol = 0, lastVol = 0, sets = 0, skipped = 0;
  const rows = [], prs = [];
  const prev = S.sessions.filter(o => o.id !== s.id).sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  liftsOf(s).forEach(b => {
    const work = b.sets.filter(x => x.kind === 'work'), dn = work.filter(x => x.done);
    sets += dn.length; skipped += work.filter(x => x.skipped).length;
    const v = dn.reduce((a, x) => a + x.reps * (x.kg || 0), 0); vol += v;
    let lv = 0, best = 0;
    for (const o of prev) { const m = liftsOf(o).find(y => y.exId === b.exId && y.lo === b.lo && y.hi === b.hi); if (m) { const d = m.sets.filter(x => x.kind === 'work' && x.done); if (d.length) { lv = d.reduce((a, x) => a + x.reps * (x.kg || 0), 0); break; } } }
    prev.forEach(o => liftsOf(o).forEach(y => { if (y.exId === b.exId) y.sets.forEach(x => { if (x.kind === 'work' && x.done) best = Math.max(best, e1(x.reps, x.kg)); }); }));
    lastVol += lv;
    const kgs = [...new Set(dn.map(x => x.kg))];
    const detail = !dn.length ? 'Skipped' : kgs.length === 1 ? dn.map(x => x.reps).join(', ') + ' @ ' + kgVal(kgs[0]) + unit(kgs[0]) : dn.map(setTxt).join(', ');
    const pct = lv ? Math.round(((v - lv) / lv) * 100) : null;
    rows.push({ name: b.name, detail, vol: !dn.length ? '' : !v ? dn.reduce((a, x) => a + x.reps, 0) + ' reps' : Math.round(v).toLocaleString('en-NZ') + ' kg', cmp: pct == null ? (dn.length ? 'first time' : '') : pct === 0 ? 'same' : (pct > 0 ? '+' : '−') + Math.abs(pct) + '%', up: pct > 0 });
    const top = dn.reduce((a, x) => (e1(x.reps, x.kg) > e1(a.reps, a.kg) ? x : a), dn[0] || { reps: 0, kg: 0 });
    if (dn.length && best > 0 && e1(top.reps, top.kg) > best + 1e-9) prs.push(b.name + ', ' + setTxt(top) + unit(top.kg));
  });
  const dv = Math.round(vol - lastVol);
  return '<div class="screen paperscreen"><p class="date">Done</p><h1 class="h1">' + esc(s.name) + '</h1>' +
    '<div class="stats"><div><b>' + Math.round(vol).toLocaleString('en-NZ') + '</b> <small>kg</small><div>' + (lastVol ? (dv === 0 ? 'same as last' : (dv > 0 ? '+' : '−') + Math.abs(dv).toLocaleString('en-NZ') + ' on last') : 'lifted') + '</div></div><div><b>' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + '</b> <small>min</small><div>time</div></div><div><b>' + sets + '</b> <small>sets</small><div>' + (skipped ? skipped + ' skipped' : 'none skipped') + '</div></div></div>' +
    prs.slice(0, 3).map(p => '<div class="pr"><div class="stamp" aria-hidden="true"><i>PR</i></div><b style="font-size:17px">' + esc(p) + '</b></div>').join('') +
    '<h2 class="h2">Exercises</h2>' + rows.map(x => '<div class="xr"><div style="min-width:0"><div class="n">' + esc(x.name) + '</div><div class="d">' + esc(x.detail) + '</div></div><div class="r"><div class="n" style="font-weight:700">' + esc(x.vol) + '</div><div class="d"' + (x.up ? ' style="color:var(--gold-ink)"' : '') + '>' + esc(x.cmp) + '</div></div></div>').join('') +
    '<button class="primary dark" style="width:100%;margin-top:20px" data-a="summaryDone">Done</button></div>';
}

// ---------- sheets ----------
const stp = (label, f, val, act, extra) => '<div class="stp"><span>' + label + '</span><div class="ctl"><button class="sq" data-a="' + (act || 'ef') + '" data-f="' + f + '" data-d="-1"' + (extra || '') + ' aria-label="' + label + ', less">' + ICON.minus + '</button><b>' + val + '</b><button class="sq" data-a="' + (act || 'ef') + '" data-f="' + f + '" data-d="1"' + (extra || '') + ' aria-label="' + label + ', more">' + ICON.plus + '</button></div></div>';
function moveRow(count, idx, canRemove) {
  if (count <= 1 && !canRemove) return '';
  if (count <= 1) return '<div class="moverow"><button class="rm" data-a="remove">Remove</button></div>';
  return '<div class="moverow"><button class="sq" data-a="move" data-d="-1" aria-label="Move up"' + (idx === 0 ? ' disabled' : '') + '>' + ICON.up + '</button><button class="sq" data-a="move" data-d="1" aria-label="Move down"' + (idx >= count - 1 ? ' disabled' : '') + '>' + ICON.dn + '</button>' + (canRemove ? '<button class="rm" data-a="remove">Remove</button>' : '') + '</div>';
}
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
function slotSheet() {
  const sh = UI.sheet, bl = sheetBlock(), t = sheetSlot(); if (!t) return '';
  const isPart = sh.p != null, ex = exById(t.exId) || { name: '', step: 2.5 };
  const r = curRoutine(), count = isPart ? bl.parts.length : r.blocks.length, idx = isPart ? sh.p : sh.bi;
  const used = exUsage(t.exId).filter(n => n !== (r.name || 'Untitled routine'));
  const reps = t.range ? stp('Low', 'lo', t.lo) + stp('High', 'hi', Math.max(t.lo, t.hi || t.lo)) : stp('Reps', 'lo', t.lo);
  return sheetBox(ex.name,
    '<div class="namerow"><input id="e-name" class="sin lg" autocapitalize="sentences" enterkeyhint="done" data-f="exname" value="' + esc(ex.name) + '" aria-label="Exercise name" autocomplete="off"><button data-a="swapEx">Change</button></div>' +
    (used.length ? '<p class="dim small" style="margin-top:6px">Also in ' + esc(used.join(', ')) + '</p>' : ''),
    '<div style="margin-top:8px">' + stp('Sets', 'sets', t.sets || 3) +
    '<div class="stp"><span>Reps</span><div class="seg2" role="group" aria-label="Fixed reps or a range"><button class="' + (t.range ? '' : 'on') + '" data-a="repMode" data-v="single" aria-pressed="' + !t.range + '">Fixed</button><button class="' + (t.range ? 'on' : '') + '" data-a="repMode" data-v="range" aria-pressed="' + !!t.range + '">Range</button></div></div>' + reps +
    (isPart ? '' : stp('Rest', 'rest', secTxt(t.rest || 0))) + stp('Warm-up sets', 'warm', t.warm || 0) + stp('Goes up by', 'step', fmt(ex.step || 2.5) + ' kg') + '</div>' +
    moveRow(count, idx, isPart || !sh.isNew),
    '', { title: isPart ? 'Superset exercise' : 'Exercise', cancel: 'cancel', done: 'done' });
}
function ssSheet() {
  const sh = UI.sheet, bl = sheetBlock(), r = curRoutine(); if (!bl) return '';
  const parts = bl.parts.map((p, i) => '<button class="partrow" data-a="openPart" data-p="' + i + '"><span class="badge o" aria-hidden="true">' + LETTERS[i] + '</span><span style="flex:1;min-width:0"><b style="display:block;font-size:17px">' + esc(exName(p.exId)) + '</b><span class="dim small">' + (p.sets || 3) + ' × ' + repsTxt(p) + '</span></span>' + ICON.chev + '</button>').join('');
  return sheetBox('Superset', '',
    '<div style="margin-top:4px">' + parts + '</div><button class="ghost" style="width:100%;margin-top:8px;height:48px" data-a="addPart">' + ICON.plus + (bl.parts.length ? ' Add another' : ' Add an exercise') + '</button>' +
    '<div style="margin-top:12px">' + stp('Rest after round', 'ssrest', secTxt(bl.rest || 0)) + '</div>' + moveRow(r.blocks.length, sh.bi, !sh.isNew),
    '', { title: 'Superset', cancel: 'cancel', done: 'done' });
}
function checkSheet() {
  const sh = UI.sheet, bl = sheetBlock(), r = curRoutine(); if (!bl) return '';
  const items = bl.items.map((it, i) => '<div class="item"><div class="two"><input class="sin" autocapitalize="sentences" enterkeyhint="next" data-ci="' + i + '" data-cf="text" value="' + esc(it.text) + '" placeholder="Item" aria-label="Item ' + (i + 1) + '" style="flex:1.4;min-width:0"><input class="sin" autocapitalize="sentences" enterkeyhint="next" data-ci="' + i + '" data-cf="detail" value="' + esc(it.detail) + '" placeholder="2 × 15" aria-label="Item ' + (i + 1) + ' detail" style="flex:1;min-width:0"><button class="xbtn" data-a="delItem" data-i="' + i + '" aria-label="Remove item ' + (i + 1) + '">' + ICON.x + '</button></div>' +
    stp('Ticks', 'ticks', it.ticks || 1, 'item', ' data-i="' + i + '"').replace(/aria-label="Ticks, (less|more)"/g, (m, w) => 'aria-label="Ticks for item ' + (i + 1) + ', ' + w + '"') +
    stp('Timer', 'timer', it.timer ? it.timer + ' min' : 'Off', 'item', ' data-i="' + i + '"').replace(/aria-label="Timer, (less|more)"/g, (m, w) => 'aria-label="Timer for item ' + (i + 1) + ', ' + w + '"') + '</div>').join('');
  return sheetBox('Checklist',
    '<input id="c-name" class="sin lg" autocapitalize="sentences" enterkeyhint="done" style="margin-top:4px" data-f="cname" value="' + esc(bl.name) + '" placeholder="Checklist name" aria-label="Checklist name">',
    '<div style="margin-top:6px">' + items + '</div><button class="ghost" style="width:100%;margin-top:8px;height:48px" data-a="addItem">' + ICON.plus + ' Add an item</button>' + moveRow(r.blocks.length, sh.bi, !sh.isNew),
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
  if (isKg) { const seen = []; [x.kg, ...b.sets.filter(y => y.done).map(y => y.kg), ...historyFor(b.exId, 4).flatMap(h => h.sets.map(y => y.kg))].forEach(k => { if (k != null && !seen.includes(k) && k !== val) seen.push(k); }); rec = seen.slice(0, 3); recLabel = 'Recent'; }
  else { rec = [b.lo, Math.round((b.lo + b.hi) / 2), b.hi].filter((v, i, a) => a.indexOf(v) === i); recLabel = 'Aim'; }
  const shown = sh.buf !== '' ? sh.buf : cur == null ? '—' : String(isKg ? fmt(cur) : cur);
  return sheetBox(title,
    '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:14px;gap:8px"><span class="dim" style="font-weight:500">' + esc(title) + '</span><span class="dim small">' + (lw ? 'Last time ' + (isKg ? kgVal(lw.kg) : lw.reps) : '') + '</span></div>',
    '<div class="padval"><span style="color:' + (sh.buf !== '' ? 'var(--cream)' : 'var(--half)') + '">' + esc(shown) + '</span><span class="caret" aria-hidden="true"></span></div>' +
    (sh.work ? '<p class="dim small" style="text-align:center">Warm-ups are worked out from this</p>' : '') + '<div class="chips">' + chips + '</div>' +
    (rec.length ? '<div class="recent"><span class="dim small">' + recLabel + '</span>' + rec.map(k => '<button data-a="padSet" data-v="' + k + '">' + fmt(k) + '</button>').join('') + '</div>' : '') +
    '<div class="keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => k === 'del' ? '<button data-a="key" data-k="del" aria-label="Delete">' + ICON.del + '</button>' : '<button data-a="key" data-k="' + k + '"' + (k === '.' && !isKg ? ' class="off" aria-disabled="true"' : '') + (k === '.' ? ' aria-label="Decimal point"' : '') + '>' + k + '</button>').join('') + '</div>',
    '<button class="primary" data-a="padDone">Done</button>');
}
function changeSheet() {
  const c = S.cur, t = target(c); if (!t || c.blocks[t.bi].kind === 'check') return '';
  const b = liftAt(c, t), x = b.sets[t.i];
  return sheetBox('Change the next set',
    '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:14px;gap:8px"><b style="font-size:17px">' + esc(b.name) + '</b><span class="dim small">' + esc(lastTxt(b, x, b.sets.slice(0, t.i).filter(y => y.kind === 'work').length)) + '</span></div>',
    stepsHtml(b, x),
    '<button class="primary" data-a="close">Done</button>');
}
function exSheet() {
  const c = S.cur, pos = UI.sheet.pos, blk = c.blocks[pos.bi]; if (!blk) return '';
  const b = blk.kind === 'ss' ? blk.parts[pos.p] : blk, ex = exById(b.exId) || { notes: '' };
  const hist = historyFor(b.exId, 6), rest = blk.rest;
  return sheetBox(b.name, '',
    '<label class="lbl" for="notes" style="margin-top:4px">Notes</label><textarea id="notes" data-ex="' + esc(b.exId) + '" placeholder="Cues, settings, rules">' + esc(ex.notes || '') + '</textarea>' +
    '<div style="margin-top:8px">' + stp(blk.kind === 'ss' ? 'Rest after round' : 'Rest', 'rest', secTxt(rest), 'restAdj').replace('data-d="-1"', 'data-d="-15"').replace('data-d="1"', 'data-d="15"') + '</div>' +
    '<label class="lbl">History</label>' +
    (hist.length ? hist.map(h => '<div class="hrow">' + esc(h.sets.map(x => x.reps).join(', ') + ' @ ' + kgVal(h.sets[0].kg) + unit(h.sets[0].kg)) + '<span>' + esc(dateTxt(h.at) + ', ' + h.name) + '</span></div>').join('') : '<p class="dim" style="margin-top:6px">Nothing yet</p>') +
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
  const lines = liftsOf(s).map(b => { const d = b.sets.filter(x => x.kind === 'work' && x.done); return '<div class="hrow">' + esc(b.name) + '<span>' + esc(d.length ? d.map(setTxt).join(', ') + unit(d[0].kg) : 'skipped') + '</span></div>'; }).join('');
  return sheetBox(s.name, '<h2>' + esc(s.name) + '</h2><p class="dim" style="margin-top:2px">' + esc(dateTxt(s.endedAt)) + ', ' + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) + ' min</p>',
    '<div style="margin-top:8px">' + lines + '</div>',
    '<button class="primary" data-a="close">Done</button><button class="wide danger" data-a="delSession" data-id="' + esc(s.id) + '">' + (UI.confirm === 'del' ? 'Tap again to delete' : 'Delete workout') + '</button>');
}
function backupSheet() {
  const t = S.settings.lastBackup;
  return sheetBox('Backup', '<h2>Backup</h2><p class="dim" style="margin-top:4px">' + esc(t ? 'Last one ' + dateTxt(t) + '.' : 'No backup yet.') + ' Your workouts only live on this phone.</p>', '',
    '<button class="primary" style="margin-top:14px" data-a="backupSave">Download backup</button>' +
    (canShareFile() ? '<button class="wide" data-a="backupShare">Share backup…</button>' : '') +
    '<button class="wide" data-a="restorePick">Restore from a file</button><input id="restore-file" class="hidden-input" type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true">' +
    '<button class="wide" data-a="close">Close</button>');
}
function sheetHtml() {
  const sh = UI.sheet; if (!sh) return '';
  const ty = sh.type, c = S.cur;
  if (UI.screen === 'edit') return ty === 'pick' ? pickSheet() : ty === 'slot' ? slotSheet() : ty === 'ss' ? ssSheet() : ty === 'check' ? checkSheet() : '';
  if (ty === 'session') return sessionSheet();
  if (ty === 'backup') return backupSheet();
  if (!c) return '';
  return ty === 'pad' ? padSheet() : ty === 'change' ? changeSheet() : ty === 'ex' ? exSheet() : ty === 'finish' ? finishSheet() : '';
}
function render() {
  const prevScroll = document.getElementById('scroll'), keep = prevScroll ? prevScroll.scrollTop : 0;
  const sheetEl = document.querySelector('.sh-b'), sheetKeep = sheetEl ? sheetEl.scrollTop : 0;
  const pageEl = document.querySelector('.paperscreen'), pageKeep = pageEl ? pageEl.scrollTop : 0, prevScreen = render.last;
  const ae = document.activeElement, focusSel = ae && ae.matches && ae.matches('input, textarea') ? (ae.id ? '#' + ae.id : ae.dataset.ci != null ? '[data-ci="' + ae.dataset.ci + '"][data-cf="' + ae.dataset.cf + '"]' : null) : null;
  let html = '', cls = '';
  const c = S.cur;
  if (UI.screen === 'summary') { html = summaryScreen(); cls = 'paper'; }
  else if (UI.screen === 'edit') { html = editScreen(); cls = 'paper'; }
  else if (UI.screen === 'train' && c) {
    const t = nextOpen(c);
    if (!t) { finish(); return; }
    if (c.rest) { html = '<div class="screen">' + restScreen(c) + '</div>'; cls = 'resting'; }
    else { const b = c.blocks[t.bi]; html = '<div class="screen">' + (b.kind === 'check' ? checkScreen(c, t) : b.kind === 'ss' ? ssScreen(c, t) : liftScreen(c, t)) + '</div>'; }
  } else { UI.screen = 'today'; html = todayScreen(); cls = 'paper'; }
  const sh = sheetHtml();
  if (sh) html += '<div class="sheetwrap"><button class="scrim" data-a="' + (UI.sheet.type === 'pick' ? 'pickCancel' : UI.screen === 'edit' ? 'cancel' : 'close') + '" aria-label="Close"></button>' + sh.replace('class="sheet', 'class="sheet' + (UI.sheet !== render.sheetObj ? ' enter' : '')) + '</div>';
  else UI.sheet = null;
  render.sheetObj = UI.sheet;
  if (UI.toast) html += '<div class="toast" role="status"><span>' + esc(UI.toast.text) + '</span>' + (UI.toast.act ? '<button data-a="' + UI.toast.act + '">Undo</button>' : '') + '</div>';
  $app.innerHTML = html;
  document.body.className = cls;
  if (document.querySelector('.sheet.form')) cls = 'form';
  const tc = cls === 'form' ? '#18492F' : cls === 'paper' ? '#F7EBC4' : cls === 'resting' ? '#0B2F1D' : '#0E3A24', meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.content !== tc) meta.content = tc;
  const sc = document.getElementById('scroll');
  if (sc) { if (UI.scrollToCard) { const card = document.getElementById('card'); if (card) card.scrollIntoView({ block: 'nearest' }); } else sc.scrollTop = keep; }
  UI.scrollToCard = false;
  const np = document.querySelector('.paperscreen'); if (np && prevScreen === UI.screen) np.scrollTop = pageKeep;
  const ns = document.querySelector('.sh-b'); if (ns && sheetEl && !ns.parentNode.classList.contains('enter')) ns.scrollTop = sheetKeep;
  sheetEdges();
  render.last = UI.screen;
  syncHistory();
  let f = null;
  let focusOnPurpose = null;
  if (UI.focus) { f = focusOnPurpose = document.querySelector(UI.focus); UI.focus = null; }
  else if (focusSel) f = document.querySelector(focusSel);
  if (f) { try { f.focus({ preventScroll: true }); const n = f.value.length; f.setSelectionRange(n, n); } catch (e) { /* not focusable */ } }
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
