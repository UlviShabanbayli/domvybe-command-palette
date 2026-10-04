// Command palette — a ⌘K palette that springs out of a search pill, as the hero of a page.
// Press the pill (or ⌘K / Ctrl+K): the pill's box — width, height, top and corner radius, each on its own spring — grows
// into the palette, one continuous surface with one small overshoot. Rows pop in one after another. Typing filters with
// fuzzy matching: rows re-order and fade on springs and the matched letters light up. The arrow keys slide ONE selection
// element between the rows (its leading edge runs ahead of its trailing edge: it stretches while it moves). Enter is the
// impact: the row is hit, the palette collapses back into the pill, which shows the destination, and a ring, sparks and a
// small bump of the whole scene go off. Escape closes without choosing. Nothing is sent anywhere and nothing is opened:
// the "navigation" is simulated and says so on the page.
// Three looks share this code: ?look=catalog | night | bubble (or a | b | c). Tokens and parts in style.css.
// Real component: input role="combobox" (aria-expanded, aria-controls, aria-activedescendant), a listbox of labelled
// groups of options, a focus trap in the dialog with focus returned to the trigger, ⌘K / Ctrl+K, Home/End, PageUp/PageDown,
// an aria-live region ("8 results"), and prefers-reduced-motion (a short fade, no morph, no stagger, no sparks).
//
// The six stages of the tutorial:
//   1. the frame, the look, the data, the fuzzy search     4. the surface: the pill morphs into the palette
//   2. the drawn parts: groups, rows, icons, keycaps       5. the rows, the selection cursor, the giant word
//   3. the springs, the keyboard, the pointer, focus       6. the impact, the ambient life, the loop

// ================================================================================================================
// STAGE 1 · the frame, the look, the data, the fuzzy search
// ================================================================================================================
const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const frameEl = $('.frame');
const LOOK = html.dataset.look;                                  // set before the first paint (index.html)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

// fit the 432 × 768 composition to the screen
function fit() { html.style.setProperty('--k', Math.min(innerWidth / 432, innerHeight / 768).toFixed(4)); }
fit();
addEventListener('resize', fit);
document.querySelector('meta[name="theme-color"]').content = getComputedStyle(html).getPropertyValue('--page').trim() || '#0A2C20';

// the studio clock: ambient life reads time from here, so a capture tool can pause or drive it
const studio = (window.__studio = window.__studio || {});
if (!studio.now) studio.now = () => performance.now();
const scaleNow = () => frameEl.getBoundingClientRect().width / 432 || 1;

// ⌘ on a Mac, Ctrl elsewhere
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
if (!MAC) $$('.mod').forEach((el) => { el.textContent = 'Ctrl'; });

// the data: simulated, local. A real site would build this list from its router and its people directory.
const GROUPS = [{ id: 'recent', name: 'Recent' }, { id: 'pages', name: 'Pages' }, { id: 'actions', name: 'Actions' }, { id: 'people', name: 'People' }];
const ICON = {
  tag: 'M12 3v18M16 7.5c-1-1-2.4-1.5-4-1.5-2.2 0-4 1-4 2.8 0 4 8 1.8 8 5.7 0 1.8-1.8 2.8-4 2.8-1.7 0-3.2-.6-4.2-1.7',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  grid: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  pulse: 'M3 12h4l3-7 4 14 3-7h4',
  plus: 'M12 8v8M8 12h8M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  invite: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  export: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
};
// label, hint (second text), keys (the shortcut chips), short (the giant word), kw (extra words the search also knows)
const ITEMS = [
  { id: 'pricing', g: 'recent', label: 'Pricing', hint: 'Plans & billing', keys: ['G', 'P'], icon: 'tag', short: 'Pricing', kw: 'cost plans billing price' },
  { id: 'roadmap', g: 'recent', label: 'Roadmap', hint: "What's next", keys: ['G', 'R'], icon: 'map', short: 'Roadmap', kw: 'future plan' },
  { id: 'invoices', g: 'recent', label: 'Invoices', hint: 'Past payments', keys: ['G', 'I'], icon: 'receipt', short: 'Invoices', kw: 'billing receipts payments' },
  { id: 'dashboard', g: 'pages', label: 'Dashboard', hint: 'Overview', keys: ['G', 'D'], icon: 'grid', short: 'Dashboard', kw: 'home overview' },
  { id: 'docs', g: 'pages', label: 'Docs', hint: 'Guides & API', keys: ['G', 'O'], icon: 'book', short: 'Docs', kw: 'documentation help guides' },
  { id: 'changelog', g: 'pages', label: 'Changelog', hint: 'What shipped', keys: ['G', 'C'], icon: 'clock', short: 'Changelog', kw: 'releases news' },
  { id: 'settings', g: 'pages', label: 'Settings', hint: 'Your account', keys: ['G', 'S'], icon: 'sliders', short: 'Settings', kw: 'preferences account profile' },
  { id: 'status', g: 'pages', label: 'Status', hint: 'Uptime', keys: ['G', 'T'], icon: 'pulse', short: 'Status', kw: 'uptime health' },
  { id: 'new', g: 'actions', label: 'New project', hint: 'Start fresh', keys: ['⌘', 'N'], icon: 'plus', short: 'Project', verb: 'Running', kw: 'create add' },
  { id: 'invite', g: 'actions', label: 'Invite teammate', hint: 'By email', keys: ['⌘', 'I'], icon: 'invite', short: 'Invite', verb: 'Running', kw: 'add member share' },
  { id: 'dark', g: 'actions', label: 'Toggle dark mode', hint: 'Theme', keys: ['⌘', 'D'], icon: 'moon', short: 'Dark mode', verb: 'Running', kw: 'theme night appearance' },
  { id: 'export', g: 'actions', label: 'Export data', hint: 'CSV or JSON', keys: ['⌘', 'E'], icon: 'export', short: 'Export', verb: 'Running', kw: 'download backup' },
  { id: 'copy', g: 'actions', label: 'Copy share link', hint: 'To clipboard', keys: ['⌘', 'L'], icon: 'link', short: 'Share link', verb: 'Running', kw: 'url' },
  { id: 'mia', g: 'people', label: 'Mia Okafor', hint: 'Design lead', keys: ['⌥', '1'], initials: 'MO', short: 'Mia', kw: 'designer' },
  { id: 'jonas', g: 'people', label: 'Jonas Berg', hint: 'Engineering', keys: ['⌥', '2'], initials: 'JB', short: 'Jonas', kw: 'developer' },
  { id: 'priya', g: 'people', label: 'Priya Nair', hint: 'Product', keys: ['⌥', '3'], initials: 'PN', short: 'Priya', kw: 'manager' },
  { id: 'leo', g: 'people', label: 'Leo Santos', hint: 'Support', keys: ['⌥', '4'], initials: 'LS', short: 'Leo', kw: 'help' },
  { id: 'amara', g: 'people', label: 'Amara Diallo', hint: 'Finance', keys: ['⌥', '5'], initials: 'AD', short: 'Amara', kw: 'accounting' },
];
const PER_GROUP = 2, MAX_RESULTS = 8;                              // an empty query shows the top 2 of each group; a query, the best 8

// fuzzy search: a contiguous hit scores highest; else a subsequence, rewarding word starts and runs of consecutive letters.
// Returns { score, idx } (the matched letter positions, for highlighting) or null.
function fuzzy(q, text) {
  const t = text.toLowerCase();
  const start = (i) => i === 0 || !/[a-z0-9]/.test(t[i - 1]);
  let best = null;
  const sub = t.indexOf(q);
  if (sub !== -1) {
    let at = sub;
    for (let i = t.indexOf(q); i !== -1; i = t.indexOf(q, i + 1)) if (start(i)) { at = i; break; }
    best = { score: 100 - at * 1.5 + (start(at) ? 24 : 0), idx: Array.from({ length: q.length }, (_, i) => at + i) };
  }
  const flat = q.replace(/\s+/g, '');
  if (flat.length > 1) {
    for (let s = t.indexOf(flat[0]); s !== -1; s = t.indexOf(flat[0], s + 1)) {
      let pos = s, score = 10 + (start(s) ? 14 : 0) - s * 0.6, ok = true;
      const idx = [s];
      for (let k = 1; k < flat.length; k++) {
        let n = -1;
        for (let j = pos + 1; j < t.length; j++) if (t[j] === flat[k] && (j === pos + 1 || start(j))) { n = j; break; }   // a run or a word start
        if (n === -1) for (let j = pos + 1; j <= pos + 3 && j < t.length; j++) if (t[j] === flat[k]) { n = j; break; }   // else a gap of at most two letters
        if (n === -1) { ok = false; break; }
        score += 10 + (n === pos + 1 ? 9 : -(n - pos - 1) * 0.8) + (start(n) ? 10 : 0);
        idx.push(n); pos = n;
      }
      if (ok && (!best || score > best.score)) best = { score, idx };
    }
  }
  return best;
}
// one item against the query: the label (fuzzy, highlighted), then its hint and keywords (a plain substring, weaker, no highlight)
function match(it, q) {
  const a = fuzzy(q, it.label);
  if (a) return { it, score: a.score, idx: a.idx };
  return `${it.hint} ${it.kw}`.toLowerCase().includes(q) ? { it, score: 30, idx: [] } : null;     // the hint and keywords: whole-text hits only
}
// the view for a query: groups in order, each with its rows. Empty query → top 2 per group; else the best 8 by score,
// groups ordered by their best row.
function viewFor(q) {
  q = q.trim().toLowerCase();
  if (!q) return GROUPS.map((g) => ({ g, rows: ITEMS.filter((i) => i.g === g.id).slice(0, PER_GROUP).map((it) => ({ it, idx: [] })) }));
  const hits = ITEMS.map((it) => match(it, q)).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
  const out = [];
  for (const h of hits) {
    let v = out.find((x) => x.g.id === h.it.g);
    if (!v) { v = { g: GROUPS.find((g) => g.id === h.it.g), rows: [] }; out.push(v); }
    v.rows.push(h);
  }
  return out;                                                      // already best-first: groups appear in order of their best row
}

// ================================================================================================================
// STAGE 2 · the drawn parts: groups, rows, icons, keycaps
// ================================================================================================================
const pal = $('.pal'), wrap = $('.pal-wrap'), trigger = $('.trigger'), dialog = $('.dialog');
const input = $('.q'), closeBtn = $('.close'), rowsEl = $('#results'), listEl = $('.list'), selEl = $('.sel'), spotEl = $('.spot');
const emptyEl = $('.empty'), live = $('.live'), wordEl = $('.word'), simEl = $('.sim'), legendEl = $('.legend');
const ghosts = $$('.ghost'), scrimEl = $('.scrim');
const ROW_H = 34, HD_H = 20, FIELD_H = 50, TOP_PAD = 4, BOTTOM_PAD = 6;   // the same numbers as the CSS tokens
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GROUP_ICON = { recent: 'ic-1', pages: 'ic-2', actions: 'ic-3' };
let avN = 0;

const groups = GROUPS.map((g) => {
  const el = document.createElement('div');
  el.className = 'grp'; el.setAttribute('role', 'group'); el.setAttribute('aria-labelledby', `gh-${g.id}`);
  el.innerHTML = `<div class="ghd" id="gh-${g.id}">${g.name}</div>`;
  rowsEl.append(el);
  return { ...g, el, hd: el.firstChild, shown: false, want: 0, at: null, yT: 0 };
});
const items = ITEMS.map((it) => {
  const g = groups.find((x) => x.id === it.g);
  const el = document.createElement('div');
  el.className = 'row'; el.id = `opt-${it.id}`; el.setAttribute('role', 'option'); el.setAttribute('aria-selected', 'false'); el.hidden = true;
  const icon = it.icon
    ? `<span class="ic ${GROUP_ICON[it.g]}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${ICON[it.icon]}"/></svg></span>`
    : `<span class="ic av-${(avN++ % 5) + 1}" aria-hidden="true"><b>${it.initials}</b></span>`;
  el.innerHTML = `${icon}<span class="lb"></span><span class="hn">${esc(it.hint)}</span><span class="ks" aria-hidden="true">${it.keys.map((k) => `<kbd class="kc">${k}</kbd>`).join('')}</span>`;
  g.el.append(el);
  return { ...it, el, lb: $('.lb', el), grp: g, shown: false, want: 0, at: null, yT: 0, idx: [] };
});
// the matched letters, wrapped in <mark> (a run of consecutive letters is one mark)
function labelHTML(text, idx) {
  if (!idx.length) return esc(text);
  const on = new Set(idx);
  let out = '', open = false;
  for (let i = 0; i < text.length; i++) {
    if (on.has(i) && !open) { out += '<mark>'; open = true; }
    if (!on.has(i) && open) { out += '</mark>'; open = false; }
    out += esc(text[i]);
  }
  return out + (open ? '</mark>' : '');
}

// ================================================================================================================
// STAGE 3 · the springs; the keyboard, the pointer and focus
// ================================================================================================================
// With reduced motion every spring is critically damped and the morph is replaced by a jump + a fade.
const spring = (stiffness, damping) => ({ stiffness, damping: calm ? 2 * Math.sqrt(stiffness) : damping });
const CLOSED = { w: 340, h: 64, top: 366, r: { catalog: 14, night: 32, bubble: 32 }[LOOK] };
const OPEN = { w: 392, top: 226, r: { catalog: 7, night: 22, bubble: 28 }[LOOK] };
const sw = new Spring(CLOSED.w, spring(300, 19));                // the surface: width, height (overshoot ≈ 9 %), top (nearly critical), radius
const sh = new Spring(CLOSED.h, spring(250, 18.5));
const stp = new Spring(CLOSED.top, spring(320, 29));
const sr = new Spring(CLOSED.r, spring(260, 22));
const p = new Spring(0, spring(240, 20));                        // 0 closed … 1 open: the faces' fades, the giant word, the scrim
const SEL = {                                                    // the selection's two edges: the leading edge is stiff, the trailing one lags
  catalog: { lead: [640, 40], trail: [540, 38] },                // a stamp: nearly rigid, it lifts instead
  night: { lead: [520, 32], trail: [250, 23] },                  // a light pane: a clear stretch
  bubble: { lead: [430, 22], trail: [180, 12.5] },               // jelly: a big stretch and a wobble
}[LOOK];
const selTop = new Spring(0, spring(...SEL.lead)), selBot = new Spring(ROW_H, spring(...SEL.lead));
const selOn = new Spring(0, spring(300, 26));                    // the selection's own pop-in
const lift = new Spring(0, spring(420, 26));                     // catalog: the stamp lifts while it travels
const hit = new Spring(0, spring(520, 11));                      // the slam when a row is chosen (kicked)
const spotX = new Spring(120, spring(150, 17)), spotY = new Spring(0, spring(150, 15));   // night: the specular light lags and overshoots
const emp = new Spring(0, spring(260, 24)), shake = new Spring(0, spring(760, 15));       // the "No results" state and its shake
const wq = new Spring(0, spring(520, 34));                       // the giant word's roll
const bump = new Spring(0, spring(300, 11));                     // the whole scene's jolt at an impact
const ring = new Spring(0, spring(30, 2 * Math.sqrt(30)));       // the impact rings' clock (kicked, 0 → 1)
const stampS = new Spring(0, spring(260, 14));                   // the impact piece: stamp / flare / pop (0 → 1)
const lit = new Spring(0, spring(60, 2 * Math.sqrt(60)));        // night: the panel's rim catches the light at the impact
const rowSprings = (it) => it.s || (it.s = { y: new Spring(0, spring(330, 27)), pop: new Spring(0, spring(380, 17)) });
items.forEach(rowSprings);
groups.forEach(rowSprings);

let isOpen = false, launching = false, opener = null, query = '', active = 0, flat = [], hOpen = 412, dest = null, lastDir = 1;
let clock = 0;
const queue = [];
function later(s, fn) { queue.push({ at: clock + s, fn }); }

// one polite sentence per change (the region is cleared first, so the same text is announced again)
let sayTimer = 0;
function say(text, ms = 30) { clearTimeout(sayTimer); sayTimer = setTimeout(() => { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); }, ms); }
const countText = (n) => (n ? `${n} result${n === 1 ? '' : 's'}` : 'No results');

// ---- keyboard ----
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen ? closePalette() : openPalette(); }
});
input.addEventListener('input', () => setQuery(input.value));
dialog.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  const n = flat.length, k = e.key;
  if (k === 'Escape') { e.preventDefault(); closePalette(); }
  else if (k === 'Tab') {                                          // the focus trap: input ↔ close button
    e.preventDefault();
    (document.activeElement === input ? closeBtn : input).focus({ preventScroll: true });
  } else if (document.activeElement !== input) return;
  else if (k === 'ArrowDown') { e.preventDefault(); n && setActive((active + 1) % n, { dir: 1 }); }
  else if (k === 'ArrowUp') { e.preventDefault(); n && setActive((active - 1 + n) % n, { dir: -1 }); }
  else if (k === 'PageDown') { e.preventDefault(); n && setActive(Math.min(n - 1, active + 4), { dir: 1 }); }
  else if (k === 'PageUp') { e.preventDefault(); n && setActive(Math.max(0, active - 4), { dir: -1 }); }
  else if ((k === 'Home' || k === 'End') && !e.shiftKey) { e.preventDefault(); n && setActive(k === 'Home' ? 0 : n - 1, { dir: k === 'Home' ? -1 : 1 }); }
  else if (k === 'Enter') { e.preventDefault(); launch(); }
});
closeBtn.addEventListener('click', () => closePalette());
trigger.addEventListener('click', () => openPalette());
addEventListener('focusin', (e) => { if (isOpen && !dialog.contains(e.target)) input.focus({ preventScroll: true }); });   // the trap, for focus that arrives from elsewhere
// ---- pointer: hover moves the selection, a click chooses; a press outside closes ----
listEl.addEventListener('pointermove', (e) => {
  const r = listEl.getBoundingClientRect(), k = scaleNow();
  spotX.target = clamp((e.clientX - r.left) / k, 0, 392);
  const row = e.target.closest('.row');
  if (!row || !isOpen || launching) return;
  const i = flat.findIndex((f) => f.it.el === row);
  if (i !== -1 && i !== active) setActive(i, { dir: i > active ? 1 : -1, hover: true });
});
rowsEl.addEventListener('pointerdown', (e) => { if (e.target.closest('.row')) e.preventDefault(); });   // keep the focus in the input
rowsEl.addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  const i = flat.findIndex((f) => f.it.el === row);
  if (i !== -1) { setActive(i, { dir: i > active ? 1 : -1, hover: true }); launch(); }
});
addEventListener('pointerdown', (e) => { if (isOpen && !launching && !wrap.contains(e.target)) closePalette(); });

// ================================================================================================================
// STAGE 4 · the surface: the pill morphs into the palette (and back)
// ================================================================================================================
function setTargets() {
  // opening springs overshoot a little (ζ ≈ .55); closing springs are nearly critical, so the pill never dips below its size
  if (isOpen) { sw.set(spring(300, 19)); sh.set(spring(250, 18.5)); sr.set(spring(260, 22)); }
  else { sw.set(spring(300, 31)); sh.set(spring(280, 32)); sr.set(spring(260, 27)); }
  if (isOpen) { sw.target = OPEN.w; sh.target = hOpen; stp.target = OPEN.top; sr.target = OPEN.r; p.target = 1; }
  else { sw.target = CLOSED.w; sh.target = CLOSED.h; stp.target = CLOSED.top; sr.target = CLOSED.r; p.target = 0; }
  if (calm) snap(sw, sh, stp, sr, p);
}
function snap(...ss) { for (const s of ss) { s.value = s.target; s.velocity = 0; } }

function openPalette({ instant = false } = {}) {
  if (isOpen || launching) return;
  opener = document.activeElement;
  isOpen = true;
  endDest();
  trigger.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-expanded', 'true');
  pal.classList.add('is-open'); pal.classList.remove('is-closing');
  dialog.inert = false; trigger.inert = true;
  input.value = ''; query = '';
  setQuery('', { fresh: true });
  setTargets();
  input.focus({ preventScroll: true });
  if (instant || calm) settle();
  wake();
}
function closePalette({ returnFocus = true } = {}) {
  if (!isOpen) return;
  isOpen = false;
  trigger.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-expanded', 'false');
  pal.classList.remove('is-open'); pal.classList.add('is-closing');
  dialog.inert = true; trigger.inert = false;
  if (returnFocus) (opener && opener.isConnected && opener !== document.body ? opener : trigger).focus({ preventScroll: true });
  setTargets();
  syncWord();
  if (calm) pal.classList.remove('is-closing');
  wake();
}
// jump every spring to where it is heading (reduced motion, ?open=1, scripts)
function settle() {
  const all = springs();
  all.forEach((s) => { if (!s.skipSnap) snap(s); });
  for (const r of [...items, ...groups]) r.at = null;
  wq.value = wq.target = 0; wq.velocity = 0; finishWord();
  draw(0);
}

// ================================================================================================================
// STAGE 5 · the rows, the selection cursor, the giant word
// ================================================================================================================
function setQuery(q, { fresh = false } = {}) {
  query = q;
  const v = viewFor(q);
  applyView(v, { fresh });
  const n = flat.length;
  setActive(0, { dir: 0, instant: fresh, quiet: true });
  const empty = n === 0;
  emptyEl.querySelector('.e-sub').textContent = empty ? `Nothing for “${q.trim().length > 14 ? q.trim().slice(0, 13) + '…' : q.trim()}”. Try “pricing”.` : '';
  if (empty) { emp.target = 1; if (!calm) shake.velocity += 340; selOn.target = 0; }
  else {
    emp.target = 0;
    if (fresh && !calm) { selOn.value = selOn.velocity = 0; selOn.target = 0; later(0.28, () => { if (flat.length) selOn.target = 1; }); }   // the cursor lands after the first rows
    else selOn.target = 1;
  }
  if (calm) { emp.value = emp.target; selOn.value = selOn.target; }
  say(countText(n), fresh ? 120 : 320);
  wake();
}

// lay out the view: header and row positions, the panel's target height, which rows enter, move and leave
function applyView(view, { fresh }) {
  flat = [];
  const inRow = new Map(), inGroup = new Set();
  let y = TOP_PAD, order = 0;
  for (const { g, rows } of view) {
    const go = groups.find((x) => x.id === g.id);
    inGroup.add(go);
    go.yT = y; y += HD_H;
    for (const r of rows) {
      const it = items.find((x) => x.id === (r.it ? r.it.id : r.id));
      it.yT = y; y += ROW_H;
      it.idx = r.idx || [];
      inRow.set(it, order++);
      flat.push({ it });
    }
  }
  const listH = flat.length ? y + BOTTOM_PAD : 118;
  hOpen = FIELD_H + listH;
  if (isOpen) sh.target = hOpen;
  rowsEl.style.height = `${listH}px`;

  const enter = (o, i, step, delay) => {                          // appear: placed at its target, popping in (staggered)
    if (!o.shown || fresh) {                                      // a fresh open: every row starts from nothing, so they all pop in
      o.shown = true; o.el.hidden = false;
      o.s.y.value = o.s.y.target = o.yT; o.s.y.velocity = 0;
      o.s.pop.value = 0; o.s.pop.velocity = 0;
    }
    o.s.y.target = o.yT;
    o.s.pop.set(spring(380, 17));
    o.want = 1;
    o.at = calm ? null : clock + delay + i * step;
    if (calm) o.s.pop.target = 1;
  };
  const leave = (o) => {                                          // leave: fade and shrink fast, then hide
    if (o.shown && o.want) { o.want = 0; o.at = null; o.s.pop.set(spring(700, 44)); o.s.pop.target = 0; }
  };
  let gi = 0;
  groups.forEach((go) => { if (inGroup.has(go)) enter(go, gi++, 0.06, fresh ? 0.08 : 0.02); else leave(go); });
  items.forEach((it) => { if (inRow.has(it)) enter(it, inRow.get(it), 0.034, fresh ? 0.12 : 0.02); else leave(it); });
  // the DOM follows the visual order (for screen readers): groups best-first, rows in order, hidden ones last
  const gs = view.map(({ g }) => groups.find((x) => x.id === g.id));
  [...gs, ...groups.filter((x) => !gs.includes(x))].forEach((go) => rowsEl.append(go.el));
  groups.forEach((go) => {
    const mine = flat.filter((f) => f.it.grp === go).map((f) => f.it);
    [...mine, ...items.filter((i) => i.grp === go && !mine.includes(i))].forEach((i) => go.el.append(i.el));
  });
  items.forEach((it) => { if (inRow.has(it)) it.lb.innerHTML = labelHTML(it.label, it.idx); });
  groups.forEach((go) => { go.el.setAttribute('aria-hidden', inGroup.has(go) ? 'false' : 'true'); });
}

// the selection: aria first, then its two edges run to the new row (the leading edge faster: a stretch)
function setActive(i, { dir = 0, instant = false, quiet = false, hover = false } = {}) {
  active = flat.length ? clamp(i, 0, flat.length - 1) : 0;
  if (dir) lastDir = dir;
  flat.forEach((f, k) => { f.it.el.setAttribute('aria-selected', k === active ? 'true' : 'false'); f.it.el.classList.toggle('is-sel', k === active); });
  const cur = flat[active];
  if (cur) input.setAttribute('aria-activedescendant', cur.it.el.id); else input.removeAttribute('aria-activedescendant');
  if (cur) {
    const y = cur.it.yT;
    const lead = spring(...SEL.lead), trail = spring(...SEL.trail);
    if (dir >= 0) { selBot.set(lead); selTop.set(trail); } else { selTop.set(lead); selBot.set(trail); }
    selTop.target = y; selBot.target = y + ROW_H;
    spotY.target = y + ROW_H / 2;
    if (!hover) spotX.target = 150;
    if (instant || calm) { snap(selTop, selBot, spotY); spotX.value = spotX.target; }
    if (calm) { selTop.velocity = selBot.velocity = 0; }
  }
  syncWord(dir);
  wake();
}

// ---- the giant word: "Jump to" → the row under the selection → the destination; it rolls on a spring ----
const words = [$('.wa'), $('.wb')];
let wordShown = 'Jump to', wordNext = 'Jump to', wDir = 1, wFit = [1, 1];
function wordWanted() {
  if (dest) return dest.short;
  if (isOpen) return flat.length ? flat[active].it.short : 'No match';
  return 'Jump to';
}
function fitOf(el) {                                               // shrink a long name to the frame (measured, not guessed)
  const keep = el.style.transform; el.style.transform = 'none';       // measure unscaled
  const r = document.createRange(); r.selectNodeContents(el);
  const w = r.getBoundingClientRect().width / scaleNow();
  el.style.transform = keep;
  return w > 292 ? 292 / w : 1;                                       // 292 × 1.34 (the closed scale) still fits the 432 frame
}
function syncWord(dir = lastDir) {
  const want = wordWanted();
  if (want === wordNext) return;
  if (wq.target === 1 && !wq.resting(0.02)) finishWord();           // an earlier roll still running: land it first
  wordNext = want; wDir = dir >= 0 ? 1 : -1;
  words[1].textContent = want; wFit[1] = fitOf(words[1]);
  if (calm) { finishWord(); return; }
  wq.value = 0; wq.velocity = 0; wq.target = 1;
}
function finishWord() {
  wordShown = wordNext; words[0].textContent = wordShown; wFit[0] = fitOf(words[0]);
  words[1].textContent = ''; wq.value = 0; wq.velocity = 0; wq.target = 0;
}

// ---- the trigger's destination state ("Opening: Pricing →") ----
const tLabel = $('.t-label');
function showDest(it) {
  dest = it;
  tLabel.textContent = `${it.verb || 'Opening'}: ${it.short} →`;
  trigger.classList.add('is-dest');
  simEl.textContent = `Simulated: “${it.label}” was not really opened.`;
  syncWord();
}
function endDest() {
  if (!dest) return;
  dest = null;
  tLabel.textContent = 'Search or jump to…';
  trigger.classList.remove('is-dest');
  simEl.textContent = 'Simulated. Picking a result opens nothing.';
  syncWord();
}

// ================================================================================================================
// STAGE 6 · the impact, the ambient life, the loop
// ================================================================================================================
// Enter on a row: the row is hit (the selection slams), the palette collapses into the pill, the pill names the
// destination, and then: a ring, sparks and a bump of the whole scene — plus this look's own piece (a stamp, a light
// flare, a starburst). Everything is simulated: nothing is opened or sent.
const fx = $('.fx'), fxRings = $$('.fx-ring'), fxFlare = $('.fx-flare'), fxStamp = $('.fx-stamp'), fxPop = $('.fx-pop');
const sparkHost = $('.fx-sparks');
const SPARKS = 14;
let sseed = 33;
const rand = () => ((sseed = (sseed * 16807) % 2147483647) / 2147483647);
const sparks = Array.from({ length: SPARKS }, (_, i) => {
  const el = document.createElement('i');
  el.className = `sp sp${(i % 4) + 1}`;
  sparkHost.append(el);
  const a = -Math.PI / 2 + (rand() - 0.5) * 3.4;                  // mostly upward, a wide fan
  return { el, a, v: 150 + rand() * 190, z: 0.7 + rand() * 0.7, spin: (rand() - 0.5) * 16, v0: 0 };
});
const GRAV = { catalog: 560, night: -70, bubble: 640 }[LOOK];
let ringAge = 9, sparkAge = 9, impX = 216, impY = 398, flareAge = 9;

function launch(it) {
  if (!isOpen || launching || !flat.length) return;
  it = it || flat[active].it;
  launching = true;
  hit.velocity += LOOK === 'bubble' ? 12 : LOOK === 'catalog' ? 16 : 9;           // the selection is hit
  lit.velocity += 8;
  say(`${it.verb || 'Opening'} ${it.label} (simulated)`, 40);
  if (calm) { showDest(it); closePalette(); launching = false; return; }
  later(0.2, () => { showDest(it); closePalette(); });                            // the panel collapses back into the pill …
  later(0.5, () => impact(it));                                                    // … and lands
  later(0.5 + 2.7, () => { launching = false; if (!isOpen) endDest(); });
}
function impact() {
  const k = scaleNow(), fr = frameEl.getBoundingClientRect(), r = wrap.getBoundingClientRect();
  impX = (r.left - fr.left) / k + r.width / k / 2; impY = (r.top - fr.top) / k + r.height / k / 2;
  ringAge = 0; sparkAge = 0; flareAge = 0;
  ring.value = 0; ring.velocity = 0; ring.target = 1;
  bump.velocity += 6;
  sparks.forEach((s) => { s.v0 = s.v; });
  if (LOOK === 'catalog') { stp.velocity += 150; sh.velocity -= 40; stampS.value = 0; stampS.velocity = 0; stampS.target = 1; }   // the pill is thumped down by the stamp
  if (LOOK === 'night') { lit.velocity += 14; stampS.value = 0; stampS.velocity = 0; stampS.target = 1; }                          // the flare, and the rim lights up
  if (LOOK === 'bubble') { sw.velocity += 360; sh.velocity -= 190; stampS.value = 0; stampS.velocity = 0; stampS.target = 1; }   // the pill squashes and springs back
}
const promoted = new WeakMap();
function promote(el, on) { if (promoted.get(el) !== on) { promoted.set(el, on); el.style.willChange = on ? 'transform, opacity' : ''; } }
function renderFx(dt) {
  ringAge += dt; sparkAge += dt; flareAge += dt;
  const on = ringAge < 0.95, specialOn = flareAge < 1.5;
  fx.style.visibility = on || sparkAge < 1.2 || specialOn ? '' : 'hidden';
  fxRings.forEach((el, i) => {
    promote(el, on);
    const a = clamp((ringAge - i * 0.09) / 0.72, 0, 1), e = 1 - (1 - a) ** 3;
    el.style.opacity = on && a > 0 ? (1 - a).toFixed(3) : '0';
    el.style.transform = `translate(${impX.toFixed(1)}px, ${impY.toFixed(1)}px) scale(${(0.3 + e * (3.4 + i * 1.5)).toFixed(3)}, ${(0.3 + e * (1.5 + i * 0.7)).toFixed(3)})`;
  });
  sparks.forEach((s) => {
    promote(s.el, sparkAge < 1.1);
    const t = sparkAge, v = s.v0, life = clamp(1 - t / 1.05, 0, 1);
    if (!life || !v) { s.el.style.opacity = '0'; return; }
    const x = impX + Math.cos(s.a) * v * t, y = impY - 4 + Math.sin(s.a) * v * t + 0.5 * GRAV * t * t;
    s.el.style.opacity = Math.min(1, life * 1.8).toFixed(3);
    s.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(s.spin * t + s.a).toFixed(3)}rad) scale(${(s.z * (0.35 + 0.65 * life)).toFixed(3)})`;
  });
  const q = stampS.value, a = clamp(1 - Math.max(0, flareAge - 0.9) / 0.5, 0, 1);
  if (LOOK === 'catalog') {                                       // the rubber stamp comes down, big → small, with a little tilt
    promote(fxStamp, specialOn);
    fxStamp.style.opacity = flareAge < 0.04 ? '0' : (a * 0.95).toFixed(3);
    fxStamp.style.transform = `translate(${(impX + 132).toFixed(1)}px, ${(impY - 74).toFixed(1)}px) rotate(${(-13 + (1 - q) * 9).toFixed(2)}deg) scale(${(0.9 + (1 - q) * 1.1).toFixed(3)})`;
  } else if (LOOK === 'night') {                                  // a thin light flare sweeps out and fades
    promote(fxFlare, specialOn);
    const f = clamp(flareAge / 0.55, 0, 1);
    fxFlare.style.opacity = flareAge < 0.9 ? Math.min(1, (1 - f) * 1.6).toFixed(3) : '0';
    fxFlare.style.transform = `translate(${impX.toFixed(1)}px, ${impY.toFixed(1)}px) scaleX(${(0.1 + 1.1 * (1 - (1 - f) ** 3)).toFixed(3)}) scaleY(${(1 + 1.4 * (1 - f)).toFixed(3)})`;
  } else {                                                        // POP!: a starburst that overshoots and wobbles
    promote(fxPop, specialOn);
    fxPop.style.opacity = flareAge < 0.04 ? '0' : a.toFixed(3);
    fxPop.style.transform = `translate(${(impX + 130).toFixed(1)}px, ${(impY - 78).toFixed(1)}px) rotate(${(12 - q * 12 + Math.sin(flareAge * 14) * 4 * (1 - q)).toFixed(2)}deg) scale(${(0.15 + 0.85 * clamp(q, 0, 1.4)).toFixed(3)})`;
  }
}

// ---- ambient life, per look: a pure function of the studio clock, so a paused clock gives the same still every time ----
const amb = { lamp: $('.amb .lamp'), dust: $$('.amb .dust'), beam: $('.amb .beam'), horizon: $('.amb .horizon'), bubs: $$('.amb .bub'), sun: $('.amb .sun') };
const DUST = [[40, 250, 30, 60, 17], [380, 330, 24, 70, 21], [90, 560, 40, 50, 19], [350, 520, 28, 60, 23], [210, 200, 36, 40, 25]];
const BUBS = [[44, 560, 12, 30, 11], [380, 250, 14, 30, 13], [366, 540, 10, 24, 9], [30, 330, 12, 30, 15], [392, 450, 10, 34, 12], [210, 262, 6, 10, 14]];
function renderAmbient(t) {
  if (LOOK === 'catalog') {
    amb.lamp.style.transform = `translate(${(Math.sin(t * 0.21) * 20).toFixed(1)}px, ${(Math.cos(t * 0.17) * 12).toFixed(1)}px)`;
    amb.dust.forEach((d, i) => { const [x, y, dx, dy, per] = DUST[i], w = TAU / per; d.style.transform = `translate(${(x + dx * Math.sin(w * t + i)).toFixed(1)}px, ${(y + dy * Math.sin(w * 0.7 * t + i * 2)).toFixed(1)}px)`; });
  } else if (LOOK === 'night') {
    amb.beam.style.opacity = (0.8 + 0.2 * Math.sin(t * 0.7)).toFixed(3);
    amb.horizon.style.opacity = (0.8 + 0.2 * Math.sin(t * 0.9 + 1)).toFixed(3);
  } else {
    amb.bubs.forEach((b, i) => { const [x, y, dx, dy, per] = BUBS[i], w = TAU / per; b.style.transform = `translate(${(x + dx * Math.sin(w * t + i * 1.7)).toFixed(1)}px, ${(y + dy * Math.sin(w * 0.8 * t + i)).toFixed(1)}px)`; });
    amb.sun.style.transform = `translateY(${(Math.sin(t * 0.5) * 6).toFixed(1)}px)`;
  }
}

// the touch circle, for the video
const touch = $('.touch');
let down = false;
const showTouch = (e) => { touch.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; touch.classList.add('is-on'); };
addEventListener('pointerdown', (e) => { down = true; showTouch(e); });
addEventListener('pointermove', (e) => { if (down) showTouch(e); });
addEventListener('pointerup', () => { down = false; touch.classList.remove('is-on'); });

// ---- rendering: every frame writes only what springs moved ----
const cache = new WeakMap();
function put(el, prop, v) { let c = cache.get(el); if (!c) cache.set(el, (c = {})); if (c[prop] !== v) { c[prop] = v; if (prop.startsWith('--')) el.style.setProperty(prop, v); else el.style[prop] = v; } }
function renderSurface() {
  const w = sw.value, h = sh.value, top = stp.value, o = clamp(p.value, 0, 1);
  put(wrap, 'left', `${((432 - w) / 2).toFixed(2)}px`); put(wrap, 'top', `${top.toFixed(2)}px`);
  put(wrap, 'width', `${w.toFixed(2)}px`); put(wrap, 'height', `${h.toFixed(2)}px`);
  put(pal, 'borderRadius', `${Math.max(0, sr.value).toFixed(2)}px`);
  put(trigger, 'opacity', (1 - clamp(o * 4, 0, 1)).toFixed(3));
  put(dialog, 'opacity', clamp((o - 0.28) * 2.4, 0, 1).toFixed(3));
  ghosts.forEach((g) => put(g, 'opacity', (1 - clamp(o * 3, 0, 1)).toFixed(3)));
  promote(scrimEl, !p.resting(0.01));                               // composited only while it fades
  put(scrimEl, 'opacity', (o * 0.95).toFixed(3));
  if (LOOK === 'night') put(amb.lamp, 'opacity', (0.3 + 0.7 * o).toFixed(3));
  const fade = (1 - clamp(o * 3, 0, 1)).toFixed(3);
  put(legendEl, 'opacity', fade); put(simEl, 'opacity', fade);
  put(trigger, 'pointerEvents', o > 0.5 ? 'none' : '');
  // the giant word rides with the surface: big above the pill, smaller above the palette
  const q = clamp(1 - p.value, -0.2, 1.2);
  put(wordEl, 'transform', `translateY(${(q * 142).toFixed(2)}px) scale(${(1 + q * 0.34).toFixed(4)})`);
}
function renderWord() {
  const q = clamp(wq.value, 0, 1.05), moving = wq.target === 1;
  const [a, b] = words;
  if (!moving) { put(a, 'opacity', '1'); put(a, 'transform', `scale(${wFit[0].toFixed(4)})`); put(b, 'opacity', '0'); return; }
  const y = wDir * 50;
  put(a, 'opacity', clamp(1 - q * 1.5, 0, 1).toFixed(3)); put(a, 'transform', `translateY(${(-y * q).toFixed(2)}px) scale(${(wFit[0] * (1 - 0.12 * q)).toFixed(4)})`);
  put(b, 'opacity', clamp(q * 1.5, 0, 1).toFixed(3)); put(b, 'transform', `translateY(${(y * (1 - q)).toFixed(2)}px) scale(${(wFit[1] * (0.88 + 0.12 * q)).toFixed(4)})`);
}
function renderRows() {
  for (const o of [...groups, ...items]) {
    if (!o.shown) continue;
    const pp = o.s.pop.value, y = o.s.y.value;
    const el = o.hd || o.el;
    if (o.want === 0 && o.s.pop.resting(0.004) && o.s.pop.value < 0.01) { o.shown = false; if (o.hd) o.el.hidden = true; else o.el.hidden = true; continue; }
    promote(el, !(o.s.pop.resting(0.002) && o.s.y.resting(0.02)));          // a layer only while it moves
    put(el, 'opacity', clamp(pp, 0, 1).toFixed(3));
    put(el, 'transform', `translate3d(0, ${(y + (1 - pp) * 12).toFixed(2)}px, 0) scale(${(0.94 + 0.06 * clamp(pp, 0, 1.1)).toFixed(4)})`);
  }
}
function renderSelection() {
  const top = selTop.value, bot = selBot.value, sy = Math.max(0.5, (bot - top) / ROW_H);
  const on = clamp(selOn.value, 0, 1), h = hit.value;
  const busy = !(selTop.resting(0.05) && selBot.resting(0.05) && hit.resting(0.01) && selOn.resting(0.01));
  promote(selEl, busy); promote(spotEl, busy || !(spotX.resting(0.1) && spotY.resting(0.1)));
  put(selEl, 'opacity', on.toFixed(3));
  let tf;
  if (LOOK === 'catalog') {                                         // the stamp: lifts while it moves, comes down with a thud and a tiny skew
    lift.target = clamp(Math.abs(selTop.velocity) / 650, 0, 1);
    const L = clamp(lift.value, 0, 1.2);
    put(selEl, 'transform', `translateY(${top.toFixed(2)}px) rotate(${(-0.5 + 0.35 * L + h * 0.6).toFixed(3)}deg) scale(${(1 + 0.05 * L - 0.1 * h).toFixed(4)}, ${(1 + 0.05 * L - 0.12 * h).toFixed(4)})`);
    selEl.style.setProperty('--lift', L.toFixed(3));
    return;
  }
  const sx = LOOK === 'bubble' ? 1 + (sy - 1) * -0.55 : 1;           // jelly: it gets thinner as it stretches
  tf = `translateY(${top.toFixed(2)}px) scale(${(sx * (1 - 0.05 * h)).toFixed(4)}, ${(sy * (1 + 0.14 * h)).toFixed(4)})`;
  put(selEl, 'transform', tf);
  if (LOOK === 'night') {
    put(spotEl, 'transform', `translate(${spotX.value.toFixed(1)}px, ${spotY.value.toFixed(1)}px)`);
    put(spotEl, 'opacity', clamp(0.85 * on + h * 0.5, 0, 1).toFixed(3));
  }
}
function renderEmpty() {
  const e = clamp(emp.value, 0, 1);
  put(emptyEl, 'opacity', e.toFixed(3)); put(emptyEl, 'visibility', e > 0.01 ? 'visible' : 'hidden');
  put(emptyEl, 'transform', `translateX(${shake.value.toFixed(2)}px) scale(${(0.94 + 0.06 * e).toFixed(4)})`);
}

// ---- the loop: with ambient life it runs every frame; with reduced motion only while something moves ----
let running = false, last = 0;
function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
function springs() {
  return [sw, sh, stp, sr, p, selTop, selBot, selOn, lift, hit, spotX, spotY, emp, shake, wq, bump, ring, stampS, lit,
    ...items.flatMap((i) => [i.s.y, i.s.pop]), ...groups.flatMap((g) => [g.s.y, g.s.pop])];
}
// frame times, for measuring: __perf.start() … __perf.stop() → { frames, p50, p95, max, over20, jsP50, jsMax }
const perf = (window.__perf = {
  on: false, gaps: [], js: [],
  start() { this.on = true; this.gaps = []; this.js = []; this.prev = 0; },
  stop() {
    this.on = false;
    const q = (a, p_) => { const s = [...a].sort((x, y) => x - y); return +(s[Math.min(s.length - 1, Math.floor(p_ * s.length))] || 0).toFixed(2); };
    return { frames: this.gaps.length, p50: q(this.gaps, 0.5), p95: q(this.gaps, 0.95), max: q(this.gaps, 1), over20: this.gaps.filter((g) => g > 20).length, jsP50: q(this.js, 0.5), jsMax: q(this.js, 1) };
  },
});
function frame(now) {
  const t0 = performance.now();
  if (perf.on) { if (perf.prev) perf.gaps.push(now - perf.prev); perf.prev = now; }
  const dt = Math.min(0.032, Math.max(0, (now - last) / 1000)); last = now;
  clock += dt;
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= clock) queue.splice(i, 1)[0].fn();
  // scheduled starts: the rows and group headers pop in one after another
  for (const o of [...groups, ...items]) if (o.at !== null && o.at <= clock) { o.at = null; o.s.pop.target = o.want; }
  // a finished word roll: the incoming word becomes the resting one
  if (wq.target === 1 && wq.resting(0.004)) finishWord();
  springs().forEach((s) => s.step(dt));
  if (pal.classList.contains('is-closing') && p.resting(0.01) && sh.resting(0.2) && !isOpen) pal.classList.remove('is-closing');
  draw(dt);
  if (perf.on) perf.js.push(performance.now() - t0);
  const still = springs().every((s) => s.resting(0.002)) && !queue.length && [...groups, ...items].every((o) => o.at === null) && ringAge > 1.2 && flareAge > 1.6;
  if (!calm || !still) requestAnimationFrame(frame); else running = false;
}
function draw(dt = 0) {
  const t = calm ? 0 : studio.now() / 1000;
  html.style.setProperty('--bump', (1 + 0.04 * bump.value).toFixed(4));
  renderSurface(); renderWord(); renderRows(); renderSelection(); renderEmpty();
  if (!calm) { renderFx(dt); renderAmbient(t); }
}

// first paint: measure what depends on the fonts, then draw the closed state without motion
function boot() {
  words[0].textContent = wordShown; wFit[0] = fitOf(words[0]);
  dialog.inert = true; setTargets();
  draw();
}
boot();
document.fonts.ready.then(() => { wFit[0] = fitOf(words[0]); wFit[1] = fitOf(words[1]); draw(); wake(); });
wake();

// the starting state: ?open=1 opens at once, ?q=text types a query
{
  const params = new URLSearchParams(location.search);
  if (params.get('open') === '1' || params.get('q')) {
    openPalette({ instant: true });
    if (params.get('q')) { input.value = params.get('q'); setQuery(params.get('q')); settle(); }
  }
}

// for scripts and the tutorial's console
window.__cmdk = {
  open: (instant = false) => openPalette({ instant }),
  close: () => closePalette(),
  type: (q) => { input.value = q; setQuery(q); wake(); },
  settle: () => settle(),
  setActive: (i, dir = 1) => setActive(i, { dir }),
  launch: () => launch(),
  state: () => ({ look: LOOK, open: isOpen, launching, query, active, results: flat.map((f) => f.it.id), hOpen, dest: dest && dest.id,
    live: live.textContent, expanded: input.getAttribute('aria-expanded'), activedescendant: input.getAttribute('aria-activedescendant'), word: wordWanted(),
    focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName) }),
  rowBox: (i) => { const r = flat[i].it.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
};
