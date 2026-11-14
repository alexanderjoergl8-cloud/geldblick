/* Oberfläche Teil 1: Speicher, Grundfunktionen, Eingabe-Blätter, Aktionen */
'use strict';
const C = window.Core;
const APP_NAME = 'Geldblick', APP_VERSION = '1.0.0';
const CHANGELOG = [['1.0.0', '13.11.2026', 'Erste Version: Übersicht, Schnelleingabe, Fixkosten und Gehalt mit Verlauf, Budgets mit Warnungen, Sparbereiche, Auswertung mit Diagrammen, Sicherung und CSV-Export.']];
const IS_FRAME = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, el) => (el || document).querySelector(s);
const ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14', chevL: 'M15 6l-6 6 6 6', chevR: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7.5',
  warn: 'M12 9v4M12 17h.01M10.3 3.9L2.5 17.5a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01',
  gear: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  down: 'M12 4v11M7 11l5 5 5-5M5 20h14', up: 'M12 16V5M7 9l5-5 5 5M5 20h14', swap: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4', help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 16.5h.01'
};
const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[n] + '"/></svg>';
const mono = s => (String(s).replace(/[^A-Za-zÄÖÜäöü]/g, '').slice(0, 2) || '?');

let S = null, comp = null, installEvt = null, persisted = null;
const U = { tab: 'uebersicht', month: null, f: { type: 'all', q: '', cat: '', range: 'month', from: '', to: '' }, year: null };
const today = () => C.todayStr();
const curM = () => C.monthOf(today());
const catName = id => { const c = S.cats.find(c => c.id === id); return c ? c.name : 'Ohne Kategorie'; };
const potName = id => { const p = S.pots.find(p => p.id === id); return p ? p.name : 'Sparbereich'; };
const monthClamp = m => { const lo = S.meta.start, hi = C.addM(curM() > lo ? curM() : lo, 12); return m < lo ? lo : m > hi ? hi : m; };

/* ---------- Speicher: IndexedDB, sonst localStorage, sonst nur Arbeitsspeicher ---------- */
const Store = {
  mode: 'mem', db: null, mem: {},
  init() {
    return new Promise(res => {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      try {
        const rq = indexedDB.open('geldblick', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => { Store.db = rq.result; Store.mode = 'idb'; fin(); };
        rq.onerror = rq.onblocked = () => { Store.fallback(); fin(); };
        setTimeout(() => { if (!done) { Store.fallback(); fin(); } }, 2500);
      } catch (e) { Store.fallback(); fin(); }
    });
  },
  fallback() { if (Store.db) return; try { localStorage.setItem('gb.t', '1'); localStorage.removeItem('gb.t'); Store.mode = 'ls'; } catch (e) { Store.mode = 'mem'; } },
  get(k) {
    return new Promise(res => {
      if (Store.mode === 'idb') { try { const rq = Store.db.transaction('kv').objectStore('kv').get(k); rq.onsuccess = () => res(rq.result == null ? null : rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } }
      else if (Store.mode === 'ls') { try { res(JSON.parse(localStorage.getItem('gb.' + k))); } catch (e) { res(null); } }
      else res(Store.mem[k] == null ? null : Store.mem[k]);
    });
  },
  set(k, v) {
    return new Promise(res => {
      if (Store.mode === 'idb') { try { const tx = Store.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => res(false); } catch (e) { res(false); } }
      else if (Store.mode === 'ls') { try { localStorage.setItem('gb.' + k, JSON.stringify(v)); res(true); } catch (e) { res(false); } }
      else { Store.mem[k] = v; res(true); }
    });
  },
  del(k) {
    return new Promise(res => {
      if (Store.mode === 'idb') { try { const tx = Store.db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = tx.onerror = () => res(); } catch (e) { res(); } }
      else if (Store.mode === 'ls') { try { localStorage.removeItem('gb.' + k); } catch (e) { } res(); }
      else { delete Store.mem[k]; res(); }
    });
  },
  keys() {
    return new Promise(res => {
      if (Store.mode === 'idb') { try { const rq = Store.db.transaction('kv').objectStore('kv').getAllKeys(); rq.onsuccess = () => res(rq.result.map(String)); rq.onerror = () => res([]); } catch (e) { res([]); } }
      else if (Store.mode === 'ls') { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('gb.') === 0) out.push(k.slice(3)); } } catch (e) { } res(out); }
      else res(Object.keys(Store.mem));
    });
  }
};
let saveT = null, saveFail = false;
function persist() { clearTimeout(saveT); saveT = setTimeout(flush, 200); }
function flush() {
  clearTimeout(saveT); saveT = null;
  if (!S) return Promise.resolve();
  return Store.set('state', JSON.parse(JSON.stringify(S))).then(ok => { if (!ok && !saveFail) { saveFail = true; toast('Speichern fehlgeschlagen. Bitte gleich eine Sicherung erstellen.'); } });
}
function dailySnapshot() {     // ein Stand pro Tag, die letzten 7 bleiben
  if (!S) return;
  const k = 'snap:' + today();
  Store.get(k).then(v => { if (!v) return Store.set(k, JSON.parse(JSON.stringify(S))); })
    .then(() => Store.keys()).then(ks => { ks = ks.filter(x => x.indexOf('snap:') === 0).sort(); while (ks.length > 7) Store.del(ks.shift()); });
}
function askPersist() {
  if (persisted !== null || IS_FRAME || !navigator.storage || !navigator.storage.persist) return;
  persisted = false; navigator.storage.persist().then(ok => { persisted = !!ok; }).catch(() => { });
}

/* ---------- Ändern, Rechnen, Anzeigen ---------- */
function commit(fn, msg, undo) {
  fn(S); S.meta.updated = Date.now(); S.meta.dirty = (S.meta.dirty || 0) + 1;
  persist(); refresh(); if (msg) toast(msg, undo); askPersist();
}
function refresh() { if (S) { U.month = monthClamp(U.month || curM()); comp = C.compute(S, today(), U.month); } render(); }
let toastT = null;
function toast(msg, undo) {
  let el = $('.toast'); if (el) el.remove();
  el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button">Rückgängig</button>' : '');
  if (undo) el.querySelector('button').onclick = () => { el.remove(); undo(); };
  document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), undo ? 6000 : 2600);
}
function go(tab) { if (location.hash !== '#' + tab) { try { location.hash = tab; return; } catch (e) { } } U.tab = tab; render(); const m = $('main'); if (m) m.scrollTop = 0; }

/* ---------- Eingabe-Blatt ---------- */
let sheetEl = null, sheetPushed = false, ignorePop = 0, formCtx = null;
function openSheet(title, body, foot, onMount) {
  if (!sheetEl) {
    sheetEl = document.createElement('div'); sheetEl.className = 'ov'; document.body.appendChild(sheetEl);
    sheetEl.addEventListener('mousedown', e => { if (e.target === sheetEl) closeSheet(); });
    try { history.pushState({ sheet: 1 }, ''); sheetPushed = true; } catch (e) { sheetPushed = false; }
  }
  sheetEl.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><h2>' + esc(title) + '</h2><button type="button" class="x" data-a="close" aria-label="Schließen">' + ic('x') + '</button></header><div class="body">' + body + '</div>' + (foot ? '<footer>' + foot + '</footer>' : '') + '</div>';
  if (onMount) onMount(sheetEl);
}
function closeSheet(fromPop) {
  if (!sheetEl) return;
  sheetEl.remove(); sheetEl = null; formCtx = null;
  if (!fromPop && sheetPushed) { ignorePop++; try { history.back(); } catch (e) { ignorePop--; } }
  sheetPushed = false;
}
function confirmSheet(title, text, okLabel, fn, danger) {
  formCtx = { onOk: fn };
  openSheet(title, '<p>' + text + '</p>', '<button type="button" class="btn" data-a="close">Abbrechen</button><button type="button" class="btn ' + (danger ? 'dng' : 'pri') + '" data-a="confirm-ok">' + esc(okLabel) + '</button>');
}
function fieldHtml(f, vals) {
  const id = 'f-' + f.k, v = vals[f.k], lab = f.label ? '<label for="' + id + '">' + esc(f.label) + '</label>' : '';
  let h = '';
  if (f.type === 'amount') h = lab + '<div class="amtw"><input id="' + id + '" class="inp' + (f.big ? ' amt' : '') + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(v == null ? '' : C.inputVal(v)) + '"' + (f.af ? ' data-af' : '') + ' style="' + (f.big ? '' : 'text-align:right;padding-right:40px') + '"></div>';
  else if (f.type === 'text' || f.type === 'date' || f.type === 'month' || f.type === 'number') h = lab + '<input id="' + id + '" type="' + f.type + '" value="' + esc(v == null ? '' : v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.type === 'number' ? ' inputmode="numeric"' : '') + (f.af ? ' data-af' : '') + ' autocomplete="off">';
  else if (f.type === 'area') h = lab + '<textarea id="' + id + '"' + (f.ro ? ' readonly' : '') + ' spellcheck="false">' + esc(v || '') + '</textarea>';
  else if (f.type === 'select') h = lab + '<select id="' + id + '">' + f.opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v == null ? '' : v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  else if (f.type === 'seg' || f.type === 'chips' || f.type === 'multi') {
    const on = o => (f.type === 'multi' ? (v || []).map(String).indexOf(String(o[0])) >= 0 : String(o[0]) === String(v));
    h = (f.label ? '<div class="lb" id="' + id + '-l">' + esc(f.label) + '</div>' : '') + '<div class="' + (f.type === 'seg' ? 'seg' : 'chips') + '" role="group"' + (f.label ? ' aria-labelledby="' + id + '-l"' : '') + '>' + f.opts.map(o => '<button type="button" class="' + (f.type === 'seg' ? '' : 'chip') + '" data-a="pick" data-k="' + f.k + '" data-v="' + esc(o[0]) + '" aria-pressed="' + on(o) + '">' + esc(o[1]) + '</button>').join('') + '</div>';
  } else if (f.type === 'toggle') h = '<label class="tog"><input id="' + id + '" type="checkbox"' + (v ? ' checked' : '') + '><span>' + esc(f.label) + (f.sub ? '<small>' + esc(f.sub) + '</small>' : '') + '</span></label>';
  else if (f.type === 'html') h = f.html;
  return '<div class="field" data-f="' + f.k + '">' + h + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
}
function openForm(cfg) {
  cfg.vals = cfg.vals || {};
  const body = '<form id="f" novalidate>' + cfg.fields.map(f => fieldHtml(f, cfg.vals)).join('') + (cfg.extra || '') + '<div class="field"><div class="err" id="f-err" role="alert"></div></div></form>';
  const foot = (cfg.del ? '<button type="button" class="btn dng" data-a="form-del">' + esc(cfg.del.label) + '</button>' : '') + '<button type="button" class="btn pri" data-a="form-ok">' + esc(cfg.submit || 'Speichern') + '</button>';
  openSheet(cfg.title, body, foot, el => { formCtx = cfg; syncForm(); const af = el.querySelector('[data-af]'); if (af) setTimeout(() => { try { af.focus(); } catch (e) { } }, 80); });
}
function formVals() {
  const cfg = formCtx, out = {};
  for (const f of cfg.fields) {
    const el = $('#f-' + f.k, sheetEl);
    if (f.type === 'amount') { out[f.k] = el.value.trim() === '' ? null : C.parseAmount(el.value); out[f.k + '_raw'] = el.value.trim(); }
    else if (f.type === 'toggle') out[f.k] = el.checked;
    else if (f.type === 'seg' || f.type === 'chips') { const b = $('[data-f="' + f.k + '"] [aria-pressed="true"]', sheetEl); out[f.k] = b ? b.dataset.v : ''; }
    else if (f.type === 'multi') out[f.k] = Array.prototype.map.call(sheetEl.querySelectorAll('[data-f="' + f.k + '"] [aria-pressed="true"]'), b => b.dataset.v);
    else if (f.type === 'html') continue;
    else out[f.k] = el.value;
  }
  return out;
}
function syncForm() {
  if (!formCtx || !formCtx.fields || !sheetEl) return;
  const v = formVals();
  for (const f of formCtx.fields) if (f.show) { const w = $('[data-f="' + f.k + '"]', sheetEl); if (w) w.hidden = !f.show(v); }
}
function formError(msg) { const e = $('#f-err', sheetEl); if (e) { e.textContent = msg; e.scrollIntoView({ block: 'nearest' }); } }
const badAmount = (v, k, label, allowZero) => (v[k] == null ? (v[k + '_raw'] ? 'Bitte den Betrag prüfen (' + label + '), z. B. 12,50.' : 'Bitte einen Betrag eingeben (' + label + ').') : v[k] < 0 || (!allowZero && v[k] === 0) ? label + ' muss größer als 0 sein.' : '');

/* ---------- Buchung (Ausgabe / Einnahme) ---------- */
function txForm(id, preset) {
  const t = id ? S.tx.find(x => x.id === id) : null;
  const dflt = U.month === curM() ? today() : C.dateStr(U.month, C.dayOf(today()));
  const v = t ? { t: t.t, a: t.a, cat: t.t === 'exp' ? t.cat || '' : '', rcat: t.t === 'inc' ? t.cat || '' : '', ik: t.ik || 'geschenk', name: t.name, d: t.d, pot: t.pot || '', pay: t.pay || '', note: t.note || '' }
    : Object.assign({ t: 'exp', a: null, cat: '', rcat: '', ik: 'geschenk', name: '', d: dflt < S.meta.openDate ? S.meta.openDate : dflt, pot: '', pay: '', note: '' }, preset || {});
  const cats = S.cats.map(c => [c.id, c.name]);
  const pots = S.pots.filter(p => !p.arch || (t && t.pot === p.id)).map(p => [p.id, p.name + ' (' + C.fmt(comp.pots[p.id].balance) + ')']);
  openForm({
    title: t ? 'Buchung bearbeiten' : 'Neue Buchung', vals: v, submit: 'Speichern',
    fields: [
      { k: 't', type: 'seg', opts: [['exp', 'Ausgabe'], ['inc', 'Einnahme']] },
      { k: 'a', type: 'amount', label: 'Betrag', big: true, af: !t },
      { k: 'cat', type: 'chips', label: 'Kategorie', opts: cats, show: x => x.t === 'exp' },
      { k: 'ik', type: 'chips', label: 'Art der Einnahme', opts: ['geschenk', 'refund', 'sonder', 'lohn', 'neben', 'sonst'].map(k => [k, C.IKINDS[k]]), show: x => x.t === 'inc' },
      { k: 'rcat', type: 'select', label: 'Rückzahlung gehört zu', opts: [['', 'Keiner Kategorie – als Einnahme zählen']].concat(cats), hint: 'Mit Kategorie sinken dort die Ausgaben, zum Beispiel bei einer Retoure. Ohne Kategorie zählt der Betrag als Einnahme.', show: x => x.t === 'inc' && x.ik === 'refund' },
      { k: 'name', type: 'text', label: 'Bezeichnung (optional)', ph: 'z. B. Billa Einkauf' },
      { k: 'd', type: 'date', label: 'Datum', min: S.meta.openDate },
      { k: 'pot', type: 'select', label: 'Bezahlt aus', opts: [['', 'Freiem Geld (normales Monatsbudget)']].concat(pots), hint: 'Aus einem Sparbereich bezahlt: Der Sparbereich sinkt, dein freies Geld bleibt gleich.', show: x => x.t === 'exp' && pots.length > 0 },
      { k: 'pay', type: 'select', label: 'Zahlungsart (optional)', opts: Object.keys(C.PAYS).map(k => [k, k ? C.PAYS[k] : 'Keine Angabe']), show: x => x.t === 'exp' },
      { k: 'note', type: 'text', label: 'Notiz (optional)' }
    ],
    del: t ? { label: 'Löschen', fn: () => { const copy = Object.assign({}, t); closeSheet(); commit(s => { s.tx = s.tx.filter(x => x.id !== t.id); }, 'Buchung gelöscht', () => commit(s => { s.tx.push(copy); }, 'Wiederhergestellt')); } } : null,
    onSubmit(x) {
      const e = badAmount(x, 'a', 'Betrag'); if (e) return e;
      if (!C.validDate(x.d)) return 'Bitte ein gültiges Datum wählen.';
      if (x.d < S.meta.openDate) return 'Die Aufzeichnung beginnt am ' + C.fmtDate(S.meta.openDate) + '. Frühere Buchungen stecken schon im Startguthaben.';
      const isExp = x.t === 'exp';
      if (isExp && !x.cat) return 'Bitte eine Kategorie antippen.';
      if (isExp && x.pot) { const have = comp.pots[x.pot].balance + (t && t.pot === x.pot ? t.a : 0); if (x.a > have) return 'Im Sparbereich ' + potName(x.pot) + ' sind nur ' + C.fmt(have) + '. Trage den Rest als eigene Ausgabe aus dem freien Geld ein.'; }
      const o = { id: t ? t.id : C.id(), t: x.t, a: x.a, d: x.d, cat: isExp ? x.cat : (x.ik === 'refund' && x.rcat ? x.rcat : null), pot: isExp && x.pot ? x.pot : null, pay: isExp ? x.pay : '', ik: isExp ? '' : x.ik, note: x.note.trim(),
        name: x.name.trim() || (isExp ? catName(x.cat) : C.IKINDS[x.ik]) };
      const m = C.monthOf(o.d);
      commit(s => { if (t) s.tx[s.tx.indexOf(t)] = o; else s.tx.push(o); }, m === U.month ? 'Gespeichert' : 'Gespeichert im ' + C.monthName(m));
    }
  });
}

/* ---------- Fixkosten und regelmäßige Einnahmen ---------- */
function verList(vs, kind, id) {
  return '<div class="field"><div class="lb">Verlauf der Beträge</div><div class="list">' + vs.map(v => '<div class="row"><span class="tx"><b>ab ' + esc(C.monthName(v.from)) + '</b><span>' + (v.paused ? 'pausiert' : 'gültig bis zur nächsten Änderung') + '</span></span><span class="am num">' + (v.paused ? '–' : C.fmt(v.amount)) + '</span>' + (vs.length > 1 ? '<button type="button" class="btn sm" data-a="ver-del" data-kind="' + kind + '" data-id="' + id + '" data-from="' + v.from + '" aria-label="Eintrag ab ' + esc(C.monthName(v.from)) + ' entfernen">Entfernen</button>' : '') + '</div>').join('') + '</div></div>';
}
function lastActive(vs) { for (let i = vs.length - 1; i >= 0; i--) if (!vs[i].paused && vs[i].amount > 0) return vs[i].amount; return 0; }
function recForm(kind, id) {
  const r = id ? S.rec.find(x => x.id === id) : null, isInc = (r ? r.kind : kind) === 'inc';
  const M = U.month >= S.meta.start ? U.month : S.meta.start, cur = r ? C.verAt(r.versions, M) || r.versions[0] : null, paused = !!(cur && cur.paused);
  const v = r ? { name: r.name, a: paused ? lastActive(r.versions) : cur.amount, from: M < r.versions[0].from ? r.versions[0].from : M, day: r.day, iv: r.interval || 1, anchor: r.anchor, spread: !!r.spread, shift: !!r.shift }
    : { name: isInc ? 'Gehalt' : '', a: null, from: M, day: 1, iv: 1, anchor: M, spread: true, shift: false };
  let extra = '';
  if (r) extra = verList(r.versions, 'rec', r.id) + '<div class="btns"><button type="button" class="btn sm" data-a="rec-pause" data-id="' + r.id + '">' + (paused ? 'Ab ' + C.monthName(M) + ' fortsetzen' : 'Ab ' + C.monthName(M) + ' pausieren') + '</button>' + (r.end ? '<button type="button" class="btn sm" data-a="rec-unend" data-id="' + r.id + '">Beendigung aufheben (endet ' + C.monthName(r.end) + ')</button>' : '') + '</div>';
  openForm({
    title: r ? r.name + ' bearbeiten' : isInc ? 'Regelmäßige Einnahme' : 'Neue Fixkosten', vals: v, extra: extra,
    fields: [
      { k: 'name', type: 'text', label: 'Bezeichnung', ph: isInc ? 'z. B. Gehalt' : 'z. B. Miete', af: !r },
      { k: 'a', type: 'amount', label: 'Betrag' },
      { k: 'from', type: 'month', label: r ? 'Betrag gilt ab' : 'Gilt ab', min: S.meta.start, hint: r ? 'Frühere Monate behalten ihren alten Betrag.' : '' },
      { k: 'iv', type: 'select', label: 'Rhythmus', opts: [[1, 'Monatlich'], [3, 'Alle 3 Monate'], [6, 'Halbjährlich'], [12, 'Jährlich']] },
      { k: 'anchor', type: 'month', label: 'Ein Monat, in dem gezahlt wird', hint: 'Daraus ergeben sich alle weiteren Termine.', show: x => +x.iv > 1 },
      { k: 'day', type: 'number', label: isInc ? 'Zahltag im Monat' : 'Abbuchungstag im Monat', min: 1, max: 31 },
      { k: 'spread', type: 'toggle', label: 'Monatlich dafür zurücklegen', sub: 'Die Zahlung wird in gleiche Monatsteile aufgeteilt, damit der Fälligkeitsmonat nicht einbricht.', show: x => !isInc && +x.iv > 1 },
      { k: 'shift', type: 'toggle', label: 'Zählt für den Folgemonat', sub: 'Für Gehalt, das am Monatsende kommt und für den nächsten Monat gedacht ist.', show: () => isInc }
    ],
    del: r ? { label: 'Löschen', fn: () => recDelete(r) } : null,
    onSubmit(x) {
      const name = x.name.trim(); if (!name) return 'Bitte eine Bezeichnung eingeben.';
      const e = badAmount(x, 'a', 'Betrag'); if (e) return e;
      if (!/^\d{4}-\d{2}$/.test(x.from)) return 'Bitte den Monat wählen, ab dem der Betrag gilt.';
      const iv = +x.iv || 1, day = Math.max(1, Math.min(31, parseInt(x.day, 10) || 1));
      if (iv > 1 && !/^\d{4}-\d{2}$/.test(x.anchor)) return 'Bitte einen Monat wählen, in dem gezahlt wird.';
      const from = x.from < S.meta.start ? S.meta.start : x.from;
      commit(s => {
        if (r) {
          r.name = name; r.day = day; r.interval = iv; r.anchor = iv > 1 ? x.anchor : r.versions[0].from < from ? r.versions[0].from : from; r.spread = !isInc && iv > 1 && x.spread; r.shift = isInc && x.shift;
          const at = C.verAt(r.versions, from);
          if (!at || at.paused || at.amount !== x.a) r.versions = C.setVer(r.versions, from, x.a);
        } else s.rec.push({ id: C.id(), kind: isInc ? 'inc' : 'fix', name: name, day: day, interval: iv, anchor: iv > 1 ? x.anchor : from, end: null, versions: [{ from: from, amount: x.a }], spread: !isInc && iv > 1 && x.spread, shift: isInc && x.shift });
      }, 'Gespeichert');
    }
  });
}
function recDelete(r) {
  const M = U.month, hasPast = r.versions[0].from < M;
  formCtx = null;
  openSheet(r.name + ' löschen', '<p>Wie soll gelöscht werden?</p>' + (hasPast ? '<button type="button" class="btn wide" data-a="rec-end" data-id="' + r.id + '">Ab ' + esc(C.monthName(M)) + ' beenden – frühere Monate bleiben</button>' : '') + '<button type="button" class="btn wide dng" data-a="rec-kill" data-id="' + r.id + '">Komplett löschen – auch aus allen früheren Monaten</button>', '<button type="button" class="btn" data-a="close">Abbrechen</button>');
}
function occForm(id, M) {
  const r = S.rec.find(x => x.id === id), f = C.recInfo(S, r, M), key = id + '|' + M, ov = S.ov[key];
  openForm({
    title: r.name + ' nur im ' + C.monthName(M), vals: { a: f.amount, skip: !!f.skipped },
    fields: [{ k: 'a', type: 'amount', label: 'Betrag in diesem Monat', hint: 'Normalbetrag: ' + C.fmt(f.base) + '. Die anderen Monate bleiben unverändert.', af: true }, { k: 'skip', type: 'toggle', label: 'Diesen Monat aussetzen', sub: 'In diesem Monat wird nichts gezahlt.' }],
    del: ov ? { label: 'Normalbetrag', fn: () => { closeSheet(); commit(s => { delete s.ov[key]; }, 'Wieder Normalbetrag'); } } : null,
    onSubmit(x) {
      if (!x.skip) { const e = badAmount(x, 'a', 'Betrag', true); if (e) return e; }
      commit(s => { if (x.skip) s.ov[key] = { skip: true }; else if (x.a !== f.base) s.ov[key] = { amount: x.a }; else delete s.ov[key]; }, 'Gespeichert');
    }
  });
}

/* ---------- Sparbereiche ---------- */
function potForm(id) {
  const p = id ? S.pots.find(x => x.id === id) : null, M = curM() < S.meta.start ? S.meta.start : curM(), cur = p ? C.verAt(p.plan, M) : null, paused = !!(cur && cur.paused);
  const v = p ? { name: p.name, desc: p.desc || '', target: p.target || null, a: paused ? lastActive(p.plan) : cur ? cur.amount : 0, from: M, opening: p.opening || null } : { name: '', desc: '', target: null, a: null, from: M, opening: null };
  const extra = p ? verList(p.plan, 'pot', p.id) + '<div class="btns"><button type="button" class="btn sm" data-a="pot-pause" data-id="' + p.id + '">' + (paused ? 'Ab ' + C.monthName(M) + ' fortsetzen' : 'Ab ' + C.monthName(M) + ' pausieren') + '</button></div>' : '';
  openForm({
    title: p ? p.name + ' bearbeiten' : 'Neuer Sparbereich', vals: v, extra: extra,
    fields: [
      { k: 'name', type: 'text', label: 'Name', ph: 'z. B. Urlaub', af: !p },
      { k: 'desc', type: 'text', label: 'Beschreibung (optional)' },
      { k: 'target', type: 'amount', label: 'Zielbetrag (optional)' },
      { k: 'a', type: 'amount', label: 'Monatlich zurücklegen' },
      { k: 'from', type: 'month', label: p ? 'Monatsbetrag gilt ab' : 'Erste Zuweisung im', min: S.meta.start },
      { k: 'opening', type: 'amount', label: 'Bereits angespart (Startbetrag)', hint: 'Geld, das du schon dafür hast. Es zählt nicht als Ausgabe dieses Monats.' }
    ],
    del: p ? { label: 'Auflösen', fn: () => confirmSheet(p.name + ' auflösen', 'Das Guthaben von <b>' + C.fmt(comp.pots[p.id].balance) + '</b> wandert zurück ins freie Geld. Der bisherige Verlauf bleibt in den Auswertungen erhalten.', 'Auflösen', () => potArchive(p), true) } : null,
    onSubmit(x) {
      const name = x.name.trim(); if (!name) return 'Bitte einen Namen eingeben.';
      for (const k of [['target', 'Zielbetrag'], ['a', 'Monatsbetrag'], ['opening', 'Startbetrag']]) if (x[k[0]] == null && x[k[0] + '_raw']) return 'Bitte den Betrag prüfen (' + k[1] + ').'; else if (x[k[0]] < 0) return k[1] + ' darf nicht negativ sein.';
      if (!/^\d{4}-\d{2}$/.test(x.from)) return 'Bitte den Monat wählen.';
      const from = x.from < S.meta.start ? S.meta.start : x.from, a = x.a || 0;
      commit(s => {
        if (p) {
          p.name = name; p.desc = x.desc.trim(); p.target = x.target || 0; p.opening = x.opening || 0;
          const at = C.verAt(p.plan, from); if (!at || at.paused || at.amount !== a) p.plan = C.setVer(p.plan, from, a);
        } else s.pots.push({ id: C.id(), name: name, desc: x.desc.trim(), target: x.target || 0, opening: x.opening || 0, since: curM() < from ? curM() : from, plan: [{ from: from, amount: a }], arch: false });
      }, 'Gespeichert');
    }
  });
}
function potArchive(p) {
  commit(s => {
    p.arch = true; p.archFrom = curM(); for (const k in s.alloc) if (k >= p.archFrom) delete s.alloc[k][p.id];
    const bal = C.compute(s, today()).pots[p.id].balance;
    if (bal > 0) s.moves.push({ id: C.id(), d: today(), from: p.id, to: 'free', a: bal, note: 'Sparbereich aufgelöst' });
  }, 'Sparbereich aufgelöst');
}
function moveForm(preset) {
  const opts = [['free', 'Freies Geld']].concat(S.pots.filter(p => !p.arch).map(p => [p.id, p.name + ' (' + C.fmt(comp.pots[p.id].balance) + ')']));
  const v = Object.assign({ from: 'free', to: opts[1] ? opts[1][0] : 'free', a: null, d: today(), note: '' }, preset || {});
  openForm({
    title: v.from === 'free' ? 'In Sparbereich einzahlen' : v.to === 'free' ? 'Aus Sparbereich entnehmen' : 'Zwischen Sparbereichen umbuchen', vals: v, submit: 'Umbuchen',
    fields: [{ k: 'from', type: 'select', label: 'Von', opts: opts }, { k: 'to', type: 'select', label: 'Nach', opts: opts }, { k: 'a', type: 'amount', label: 'Betrag', af: true }, { k: 'd', type: 'date', label: 'Datum', min: S.meta.openDate }, { k: 'note', type: 'text', label: 'Notiz (optional)' }],
    onSubmit(x) {
      const e = badAmount(x, 'a', 'Betrag'); if (e) return e;
      if (x.from === x.to) return 'Bitte zwei verschiedene Bereiche wählen.';
      if (!C.validDate(x.d) || x.d < S.meta.openDate) return 'Bitte ein gültiges Datum ab dem ' + C.fmtDate(S.meta.openDate) + ' wählen.';
      if (x.from !== 'free' && x.a > comp.pots[x.from].balance) return 'In ' + potName(x.from) + ' sind nur ' + C.fmt(comp.pots[x.from].balance) + '.';
      commit(s => { s.moves.push({ id: C.id(), d: x.d, from: x.from, to: x.to, a: x.a, note: x.note.trim() }); }, 'Umgebucht');
    }
  });
}
function allocForm(M) {
  const R = comp.months[M]; if (!R) return;
  const pots = S.pots.filter(p => R.alloc[p.id] != null && (!p.arch || R.alloc[p.id] > 0));
  if (!pots.length) { toast('Für diesen Monat gibt es noch keinen Sparbereich.'); return; }
  const vals = {}; for (const p of pots) vals['p_' + p.id] = R.alloc[p.id];
  openForm({
    title: 'Sparrate im ' + C.monthName(M), vals: vals,
    fields: [{ k: 'info', type: 'html', html: '<p class="hint">Geplant sind ' + C.fmt(R.savedPlan) + '.' + (R.uncovered > 0 ? ' Gedeckt sind nur <b>' + C.fmt(R.covered) + '</b>, es fehlen ' + C.fmt(R.uncovered) + '.' : ' Hier legst du fest, was in diesem einen Monat tatsächlich zugewiesen wird.') + '</p>' + (R.uncovered > 0 ? '<button type="button" class="btn sm" data-a="alloc-cut" data-m="' + M + '">Alle anteilig auf den gedeckten Betrag kürzen</button>' : '') }]
      .concat(pots.map(p => ({ k: 'p_' + p.id, type: 'amount', label: p.name, hint: 'Plan: ' + C.fmt(R.plan[p.id] || 0) }))),
    del: S.alloc[M] ? { label: 'Zurück zum Plan', fn: () => { closeSheet(); commit(s => { delete s.alloc[M]; }, 'Wieder nach Plan'); } } : null,
    onSubmit(x) {
      const o = {};
      for (const p of pots) { const a = x['p_' + p.id]; if (a == null && x['p_' + p.id + '_raw']) return 'Bitte den Betrag bei ' + p.name + ' prüfen.'; if (a < 0) return 'Beträge dürfen nicht negativ sein.'; if ((a || 0) !== (R.plan[p.id] || 0)) o[p.id] = a || 0; }
      commit(s => { if (Object.keys(o).length) s.alloc[M] = o; else delete s.alloc[M]; }, 'Sparrate gespeichert');
    }
  });
}
function goalForm() {
  const M = curM() < S.meta.start ? S.meta.start : curM();
  openForm({
    title: 'Monatliches Sparziel', vals: { a: C.amtAt(S.set.goal, M) || null, from: M },
    fields: [{ k: 'a', type: 'amount', label: 'So viel möchte ich pro Monat sparen', hint: 'Leer lassen: Das Sparziel ist die Summe deiner Sparbereiche.', af: true }, { k: 'from', type: 'month', label: 'Gilt ab', min: S.meta.start }],
    onSubmit(x) { if (x.a == null && x.a_raw) return 'Bitte den Betrag prüfen.'; if (x.a < 0) return 'Der Betrag darf nicht negativ sein.'; commit(s => { s.set.goal = C.setVer(s.set.goal, x.from < s.meta.start ? s.meta.start : x.from, x.a || 0); }, 'Sparziel gespeichert'); }
  });
}

/* ---------- Kategorien, Budgets, Einstellungen ---------- */
function catForm(id) {
  const c = id ? S.cats.find(x => x.id === id) : null, M = U.month, used = c ? S.tx.filter(t => t.cat === c.id).length : 0;
  openForm({
    title: c ? c.name + ' bearbeiten' : 'Neue Kategorie', vals: c ? { name: c.name, need: !!c.need, b: C.amtAt(c.budget, M) || null, from: M } : { name: '', need: false, b: null, from: M },
    fields: [
      { k: 'name', type: 'text', label: 'Name', af: !c },
      { k: 'b', type: 'amount', label: 'Monatsbudget (optional)', hint: 'Leer lassen für kein Limit. Ausgaben aus Sparbereichen zählen nicht gegen das Budget.' },
      { k: 'from', type: 'month', label: 'Budget gilt ab', min: S.meta.start },
      { k: 'need', type: 'toggle', label: 'Notwendige Ausgabe', sub: 'Zum Beispiel Lebensmittel oder Wohnen. Sparvorschläge beziehen sich nur auf nicht notwendige Kategorien.' }
    ],
    del: c && S.cats.length > 1 ? { label: 'Löschen', fn: () => catDelete(c, used) } : null,
    onSubmit(x) {
      const name = x.name.trim(); if (!name) return 'Bitte einen Namen eingeben.';
      if (S.cats.some(o => o !== c && o.name.toLowerCase() === name.toLowerCase())) return 'Diese Kategorie gibt es schon.';
      if (x.b == null && x.b_raw) return 'Bitte das Budget prüfen.'; if (x.b < 0) return 'Das Budget darf nicht negativ sein.';
      const from = !/^\d{4}-\d{2}$/.test(x.from) || x.from < S.meta.start ? S.meta.start : x.from;
      commit(s => {
        const o = c || { id: C.id(), name: name, need: false, budget: [] }; o.name = name; o.need = x.need;
        if ((x.b || 0) !== C.amtAt(o.budget, from)) o.budget = C.setVer(o.budget, from, x.b || 0);
        if (!c) s.cats.push(o);
      }, 'Gespeichert');
    }
  });
}
function catDelete(c, used) {
  if (!used) { confirmSheet(c.name + ' löschen', 'Die Kategorie hat keine Buchungen und wird entfernt.', 'Löschen', () => commit(s => { s.cats = s.cats.filter(x => x !== c); }, 'Kategorie gelöscht'), true); return; }
  openForm({
    title: c.name + ' löschen', vals: { to: S.cats.find(x => x !== c).id }, submit: 'Umbuchen und löschen',
    fields: [{ k: 'to', type: 'select', label: used + ' Buchungen umbuchen auf', opts: S.cats.filter(x => x !== c).map(x => [x.id, x.name]), hint: 'Keine Buchung geht verloren. Sie wechseln nur die Kategorie.' }],
    onSubmit(x) { commit(s => { for (const t of s.tx) if (t.cat === c.id) t.cat = x.to; s.cats = s.cats.filter(o => o !== c); }, 'Kategorie gelöscht'); }
  });
}
function startForm() {
  openForm({
    title: 'Start der Aufzeichnung', vals: { d: S.meta.openDate, a: S.meta.opening },
    fields: [{ k: 'd', type: 'date', label: 'Aufzeichnung beginnt am' }, { k: 'a', type: 'amount', label: 'Frei verfügbares Geld an diesem Tag', hint: 'Konto und Bargeld zusammen, ohne das Geld in deinen Sparbereichen. Alles, was vor diesem Tag bezahlt oder eingegangen ist, steckt schon in diesem Betrag.' }],
    onSubmit(x) {
      if (!C.validDate(x.d)) return 'Bitte ein gültiges Datum wählen.';
      if (x.a == null) return x.a_raw ? 'Bitte den Betrag prüfen.' : 'Bitte einen Betrag eingeben (0 ist erlaubt).';
      const early = S.tx.filter(t => t.d < x.d).length + S.moves.filter(m => m.d < x.d).length;
      if (early) return 'Es gibt ' + early + ' Buchungen vor diesem Datum. Wähle ein früheres Datum oder lösche diese Buchungen zuerst.';
      commit(s => { s.meta.openDate = x.d; s.meta.start = C.monthOf(x.d); s.meta.opening = x.a; }, 'Gespeichert');
    }
  });
}
function warnForm() {
  const M = U.month;
  openForm({
    title: 'Warnschwellen und Gesamtbudget', vals: { w: S.set.warn, b: C.amtAt(S.set.totalBudget, M) || null },
    fields: [{ k: 'w', type: 'multi', label: 'Warnen, wenn ein Budget so weit ausgeschöpft ist', opts: [50, 60, 70, 80, 90, 100].map(n => [n, n + ' %']) },
      { k: 'b', type: 'amount', label: 'Gesamtbudget für variable Ausgaben (optional)', hint: 'Gilt ab ' + C.monthName(M) + '. Leer lassen für kein Gesamtlimit.' }],
    onSubmit(x) {
      if (x.b == null && x.b_raw) return 'Bitte das Gesamtbudget prüfen.'; if (!x.w.length) return 'Bitte mindestens eine Schwelle wählen.';
      commit(s => { s.set.warn = x.w.map(Number).sort((a, b) => a - b); if ((x.b || 0) !== C.amtAt(s.set.totalBudget, M)) s.set.totalBudget = C.setVer(s.set.totalBudget, M, x.b || 0); }, 'Gespeichert');
    }
  });
}

/* ---------- Sicherung, Export, Import ---------- */
async function saveFile(name, text, mime) {
  if (window.claude && window.claude.use) {
    try { const dl = await window.claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: text }); return 'saved'; } }
    catch (e) { if (e && e.code === 'declined') return 'declined'; }
  }
  if (IS_FRAME) return 'nofile';
  try { const url = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); return 'saved'; }
  catch (e) { return 'nofile'; }
}
const backupText = () => JSON.stringify({ app: 'geldblick', format: 1, exported: new Date().toISOString(), data: S });
const backupName = () => 'geldblick-sicherung-' + today() + '.json';
function markBackup() { S.meta.lastBackup = Date.now(); S.meta.dirty = 0; persist(); render(); }
async function doBackup() {
  const r = await saveFile(backupName(), backupText(), 'application/json');
  if (r === 'saved') { markBackup(); toast('Sicherung gespeichert'); } else if (r === 'nofile') textSheet('Sicherung als Text', backupText(), true);
}
async function doShare() {
  try { const f = new File([backupText()], backupName(), { type: 'application/json' }); await navigator.share({ files: [f], title: APP_NAME + ' Sicherung' }); markBackup(); toast('Sicherung geteilt'); }
  catch (e) { if (!e || e.name !== 'AbortError') toast('Teilen ist hier nicht möglich. Bitte „Sicherung speichern“ verwenden.'); }
}
function textSheet(title, text, isBackup) {
  formCtx = { text: text, isBackup: isBackup };
  openSheet(title, '<p class="hint">Text kopieren und an einem sicheren Ort ablegen, zum Beispiel in einer Notiz oder einer E-Mail an dich selbst.</p><div class="field"><textarea id="bk-t" readonly spellcheck="false">' + esc(text) + '</textarea></div>', '<button type="button" class="btn" data-a="close">Schließen</button><button type="button" class="btn pri" data-a="copy-text">Kopieren</button>');
}
function importText(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return 'Das ist keine gültige Sicherungsdatei.'; }
  let st; try { st = C.migrate(o && o.data && o.app === 'geldblick' ? o.data : o); C.compute(st, today()); } catch (e) { return e.message || 'Die Sicherung konnte nicht gelesen werden.'; }
  const n = st.tx.length;
  confirmSheet('Sicherung einspielen', 'Die Sicherung enthält <b>' + n + ' Buchungen</b> ab ' + esc(C.fmtDate(st.meta.openDate)) + '. Deine jetzigen Daten in dieser App werden dadurch <b>ersetzt</b>. Der heutige Stand bleibt 7 Tage unter „Automatische Tagesstände“ erhalten.', 'Ersetzen', () => {
    const p = S ? Store.set('snap:' + today(), JSON.parse(JSON.stringify(S))) : Promise.resolve();
    p.then(() => { S = st; S.meta.demo = false; S.meta.setup = true; resetTab(); applyTheme(); flush(); refresh(); toast('Sicherung eingespielt'); });
  }, true);
  return '';
}
async function doCsv() {
  const r = await saveFile('geldblick-buchungen-' + today() + '.csv', C.csv(S, comp), 'text/csv;charset=utf-8');
  if (r === 'saved') toast('CSV-Datei gespeichert'); else if (r === 'nofile') textSheet('Buchungen als CSV-Text', C.csv(S, comp), false);
}
function helpSheet() {
  openSheet('So rechnet die App', '<div class="tips">' + [
    ['Frei verfügbar', 'Puffer aus dem Vormonat + Einnahmen − Fixkosten − variable Ausgaben − Sparrate. Fixkosten und Gehalt zählen ab Monatsbeginn für den ganzen Monat mit.'],
    ['Puffer', 'Was am Monatsende frei übrig ist, wandert in den nächsten Monat. Ein Minus wandert ebenfalls mit.'],
    ['Sparbereiche', 'Die Sparrate wird am Monatsanfang reserviert. Zahlst du etwas aus einem Sparbereich, sinkt nur dieser Bereich. Die Ausgabe erscheint in der Kategorie, wird aber kein zweites Mal abgezogen.'],
    ['Geplant ist nicht gespart', 'Reicht das Geld nicht, zeigt die App, wie viel der Sparrate nicht gedeckt ist. Du entscheidest, welcher Bereich weniger bekommt.'],
    ['Änderungen gelten ab einem Monat', 'Neue Beträge bei Fixkosten, Gehalt, Budgets und Sparraten gelten ab dem gewählten Monat. Frühere Monate bleiben, wie sie waren.'],
    ['Jahreszahlungen', 'Mit „Monatlich dafür zurücklegen“ wird die Zahlung auf die Monate verteilt. Fehlt im ersten Jahr noch Rücklage, belastet der Rest den Fälligkeitsmonat.'],
    ['Rückzahlungen', 'Mit Kategorie senken sie die Ausgaben dieser Kategorie. Ohne Kategorie zählen sie als Einnahme.'],
    ['Deine Daten', 'Alles liegt nur auf diesem Gerät. Es gibt keine Verbindung zu einer Bank und keinen Server. Deshalb regelmäßig eine Sicherung speichern.']
  ].map(x => '<div class="tip">' + ic('check') + '<div><b>' + x[0] + '</b><br>' + x[1] + '</div></div>').join('') + '</div>', '<button type="button" class="btn pri" data-a="close">Verstanden</button>');
}
function startFresh(opening, salary, day) {
  S = C.newState(today(), opening || 0); S.meta.setup = true;
  if (salary > 0) S.rec.push({ id: C.id(), kind: 'inc', name: 'Gehalt', day: day || 1, interval: 1, anchor: S.meta.start, end: null, versions: [{ from: S.meta.start, amount: salary }], spread: false, shift: false });
  resetTab(); flush(); refresh();
}
function resetTab() { U.tab = 'uebersicht'; U.month = null; try { history.replaceState(null, '', '#uebersicht'); } catch (e) { } }
function loadDemo() { S = C.demo(today()); resetTab(); flush(); refresh(); }
