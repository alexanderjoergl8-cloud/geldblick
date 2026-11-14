/* Oberfläche Teil 2: Ansichten, Diagramme, Aktionen, Start */
const TABS = { uebersicht: ['Übersicht', 'home'], buchungen: ['Buchungen', 'list'], sparen: ['Sparen', 'target'], auswertung: ['Auswertung', 'chart'], mehr: ['Mehr', 'more'], fixkosten: ['Fixkosten & Gehalt', 'repeat'], budgets: ['Budgets & Kategorien', 'tag'], einstellungen: ['Einstellungen', 'gear'] };
const MONTH_TABS = ['uebersicht', 'buchungen', 'auswertung', 'fixkosten', 'budgets'], SUB_TABS = ['fixkosten', 'budgets', 'einstellungen'];
let lastTab = '';

function render() {
  const app = $('#app');
  if (!S) { app.innerHTML = welcomeHtml(); return; }
  const tab = TABS[U.tab] ? U.tab : 'uebersicht', sub = SUB_TABS.indexOf(tab) >= 0, old = $('main'), st = old ? old.scrollTop : 0;
  const nav = ['uebersicht', 'buchungen', 'sparen', 'auswertung', 'mehr'].map(t => '<button type="button" data-a="nav" data-tab="' + t + '"' + ((sub ? 'mehr' : tab) === t ? ' aria-current="page"' : '') + '>' + ic(TABS[t][1]) + TABS[t][0] + '</button>').join('');
  const side = ['uebersicht', 'buchungen', 'sparen', 'auswertung', 'fixkosten', 'budgets', 'einstellungen'].map(t => '<button type="button" class="nv" data-a="nav" data-tab="' + t + '"' + (tab === t ? ' aria-current="page"' : '') + '>' + ic(TABS[t][1]) + TABS[t][0] + '</button>').join('');
  const lo = S.meta.start, hi = monthClamp('9999-12');
  const msw = MONTH_TABS.indexOf(tab) < 0 ? '' : '<div class="msw"><button type="button" data-a="month" data-d="-1" aria-label="Vorheriger Monat"' + (U.month <= lo ? ' disabled' : '') + '>' + ic('chevL') + '</button><button type="button" class="ml" data-a="month" data-d="0" title="Zum aktuellen Monat">' + C.MON[+U.month.slice(5, 7) - 1] + ' ' + U.month.slice(0, 4) + '</button><button type="button" data-a="month" data-d="1" aria-label="Nächster Monat"' + (U.month >= hi ? ' disabled' : '') + '>' + ic('chevR') + '</button></div>';
  app.innerHTML = '<nav class="side" aria-label="Bereiche"><div class="brand">' + APP_NAME + '</div><button type="button" class="btn pri" data-a="add">' + ic('plus') + 'Neue Buchung</button>' + side + '</nav>'
    + '<div class="col"><header class="top">' + (sub ? '<button type="button" class="back" data-a="nav" data-tab="mehr" aria-label="Zurück zu Mehr">' + ic('chevL') + '</button>' : '') + '<h1>' + esc({ fixkosten: 'Fixkosten', budgets: 'Budgets' }[tab] || TABS[tab][0]) + '</h1>' + msw + '</header><main><div class="wrap">' + VIEWS[tab]() + '</div></main><nav class="nav" aria-label="Bereiche">' + nav + '</nav></div>'
    + '<button type="button" class="fab" data-a="add" aria-label="Neue Buchung">' + ic('plus') + 'Buchung</button>';
  app.querySelectorAll('[data-chart]').forEach(el => { el.innerHTML = CHARTS[el.dataset.chart](Math.max(280, el.clientWidth || 320)); });
  if (lastTab === tab) $('main').scrollTop = st; lastTab = tab;
}
const empty = (t, s) => '<div class="empty"><b>' + t + '</b>' + (s || '') + '</div>';
function alertHtml(a) { return '<div class="alert ' + (a.lv === 'info' ? '' : a.lv) + '">' + ic(a.lv === 'info' ? 'info' : a.lv === 'good' ? 'check' : 'warn') + '<div><b>' + esc(a.title) + '</b><p>' + esc(a.text) + '</p>' + (a.act ? '<button type="button" class="btn sm" data-a="act" data-act="' + esc(a.act) + '">' + esc(a.actLabel || 'Jetzt anpassen') + '</button>' : '') + '</div></div>'; }
function prog(name, right, pct, cls, fl, fr, attrs) {
  return '<button type="button" class="prog" ' + (attrs || '') + '><span class="hd"><b>' + esc(name) + '</b><span class="num">' + right + '</span></span><span class="bar"><i class="' + (cls || '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></span><span class="ft"><span>' + fl + '</span><span>' + (fr || '') + '</span></span></button>';
}
function txRow(t) {
  const inc = t.t === 'inc', p = t.pot ? potName(t.pot) : '';
  const sub = [inc ? C.IKINDS[t.ik] || 'Einnahme' : catName(t.cat), inc && t.cat ? 'zu ' + catName(t.cat) : '', p ? 'aus ' + p : '', t.note].filter(Boolean).join(' · ');
  return '<button type="button" class="row" data-a="tx" data-id="' + t.id + '"><span class="mono ' + (inc ? 'inc' : p ? 'pot' : '') + '">' + esc(mono(inc ? C.IKINDS[t.ik] || 'E' : catName(t.cat))) + '</span><span class="tx"><b>' + esc(t.name) + '</b><span>' + esc(sub) + '</span></span><span class="am num ' + (inc ? 'plus' : '') + '">' + (inc ? '+' : '−') + C.fmt(t.a) + '</span></button>';
}
function banners() {
  let h = '';
  if (Store.mode === 'mem' && !IS_FRAME) h += alertHtml({ lv: 'crit', title: 'Dieser Browser speichert nichts', text: 'Eingaben gehen beim Schließen verloren. Öffne die App im normalen Chrome-Fenster, nicht im privaten Modus.' });
  if (S.meta.demo) h += '<div class="banner"><span><b>Beispieldaten.</b> So sieht die App mit Einträgen aus. Alles lässt sich ausprobieren.</span><button type="button" class="btn sm pri" data-a="fresh">Mit eigenen Daten starten</button></div>';
  else if (IS_FRAME) h += '<div class="banner"><span><b>Vorschau.</b> Zum Ausprobieren gedacht. Für echte Daten die installierte App verwenden.</span></div>';
  return h;
}
function extraAlerts() {
  const out = [], d = S.meta.dirty || 0, since = (Date.now() - (S.meta.lastBackup || Date.parse(S.meta.created) || Date.now())) / 864e5;
  if (!S.meta.demo && d > 0 && S.tx.length > 0 && since >= 14) out.push({ lv: 'warn', title: 'Sicherung fällig', text: (S.meta.lastBackup ? 'Deine letzte Sicherung ist ' + Math.floor(since) + ' Tage alt.' : 'Du hast noch keine Sicherung erstellt.') + ' Die Daten liegen nur auf diesem Gerät.', act: 'backup', actLabel: 'Sicherung speichern' });
  return out;
}

/* ---------- Übersicht ---------- */
function vOverview() {
  const M = U.month, R = comp.months[M], P = comp.months[C.addM(M, -1)], isCur = M === comp.cur, fc = isCur ? C.forecast(S, comp) : null;
  let h = banners();
  h += '<section class="hero"><div><div class="lbl">' + (isCur ? 'Noch frei verfügbar' : M < comp.cur ? 'Am Monatsende frei übrig' : 'Voraussichtlich frei nach Plan') + '</div><div class="big num' + (R.available < 0 ? ' neg' : '') + '">' + C.fmt(R.available) + '</div></div>';
  if (isCur) h += '<div class="meter" role="img" aria-label="Der Monat ist zu ' + fc.pctMonth + ' Prozent vorbei"><i style="width:' + fc.pctMonth + '%"></i></div><div class="kv"><div><b class="num">' + C.fmt(fc.dayBudget) + '</b><span>pro Tag für die restlichen ' + (fc.daysLeft + 1) + ' Tage</span></div><div><b class="num">' + (fc.end == null ? '–' : C.fmt(fc.end)) + '</b><span>' + (fc.end == null ? 'Prognose ab dem 5. Tag' : 'Prognose zum Monatsende') + '</span></div></div>';
  else h += '<div class="kv"><div><b class="num">' + C.fmtSigned(R.result) + '</b><span>Ergebnis dieses Monats</span></div><div><b class="num">' + C.fmt(R.carryIn) + '</b><span>Puffer aus dem Vormonat</span></div></div>';
  h += '</section>';
  if (isCur) h += C.alerts(S, comp).concat(extraAlerts()).map(alertHtml).join('');
  if (!S.meta.demo && !S.meta.hideSteps) {
    const steps = [[S.rec.some(r => r.kind === 'inc'), 'Gehalt eintragen', 'rec:inc'], [S.rec.some(r => r.kind === 'fix'), 'Fixkosten hinterlegen', 'rec:fix'], [S.cats.some(c => c.budget.length), 'Budget für eine Kategorie festlegen', 'go:budgets'], [S.pots.length > 0, 'Ersten Sparbereich anlegen', 'pot']];
    if (steps.some(s => !s[0])) h += '<section class="card"><h2>Einrichtung <button type="button" class="link" data-a="hide-steps">Ausblenden</button></h2><div class="list">' + steps.map(s => '<button type="button" class="row' + (s[0] ? ' off' : '') + '" data-a="act" data-act="' + s[2] + '"><span class="mono' + (s[0] ? ' inc' : '') + '">' + (s[0] ? ic('check') : ic('plus')) + '</span><span class="tx"><b>' + s[1] + '</b><span>' + (s[0] ? 'Erledigt' : 'Antippen zum Eintragen') + '</span></span></button>').join('') + '</div></section>';
  }
  const pv = (k) => (P ? 'Vormonat ' + C.fmt(P[k]) : isCur && M === S.meta.start ? 'erster Monat' : '');
  h += '<section class="tiles">' + [['Einnahmen', 'inc', R.income, pv('income')], ['Fixkosten', 'free', R.fixed, pv('fixed')], ['Variable Ausgaben', 'exp', R.variable, pv('variable')], ['Sparen', 'sav', R.saved, R.uncovered > 0 ? 'davon ' + C.fmt(R.uncovered) + ' nicht gedeckt' : pv('saved')]]
    .map(t => '<div class="tile"><span class="k"><i class="dot" style="background:var(--' + t[1] + ')"></i>' + t[0] + '</span><span class="v num">' + C.fmt(t[2]) + '</span><span class="d num">' + t[3] + '</span></div>').join('') + '</section>';
  const seg = [['Fixkosten', 'free', Math.max(0, R.fixed)], ['Variable Ausgaben', 'exp', Math.max(0, R.variable)], ['Sparen', 'sav', R.saved + R.toPots], ['Frei', 'inc', Math.max(0, R.result)]], tot = seg.reduce((a, s) => a + s[2], 0);
  h += '<div class="grid2"><section class="card"><h2>Wohin das Geld dieses Monats geht</h2>' + (tot > 0 ? '<div class="split" role="img" aria-label="Aufteilung der Einnahmen">' + seg.filter(s => s[2] > 0).map(s => '<i style="flex:' + s[2] + ';background:var(--' + s[1] + ')"></i>').join('') + '</div><div class="legend">' + seg.map(s => '<span><i class="dot" style="background:var(--' + s[1] + ')"></i>' + s[0] + ' <b class="num">' + C.fmt(s[2]) + '</b></span>').join('') + '</div>' + (R.result < 0 ? '<p class="hint" style="margin-top:8px">Die Ausgaben und die Sparrate liegen in diesem Monat ' + C.fmt(-R.result) + ' über den Einnahmen.</p>' : '') : empty('Noch nichts erfasst', 'Trage dein Gehalt und deine Fixkosten ein.')) + '</section>';
  const bs = C.budgets(S, comp, M).sort((a, b) => b.pct - a.pct);
  h += '<section class="card"><h2>Budgets <button type="button" class="link" data-a="nav" data-tab="budgets">Alle</button></h2>' + (bs.length ? bs.slice(0, 4).map(b => prog(b.name, C.fmt(b.spent) + ' von ' + C.fmt0(b.budget), b.pct, b.pct >= 100 ? 'crit' : b.level ? 'warn' : '', b.pct + ' %', b.over ? C.fmt(-b.rest) + ' darüber' : 'noch ' + C.fmt(b.rest), 'data-a="cat" data-id="' + b.id + '"')).join('') : empty('Noch kein Budget', 'Lege für Kategorien wie Lebensmittel ein Monatslimit fest.')) + '</section></div>';
  const pots = S.pots.filter(p => !p.arch);
  h += '<div class="grid2"><section class="card"><h2>Sparbereiche <button type="button" class="link" data-a="nav" data-tab="sparen">Alle</button></h2>' + (pots.length ? pots.slice(0, 4).map(p => { const o = comp.pots[p.id]; return prog(p.name, C.fmt(o.balance), o.pct == null ? 0 : o.pct, 'sav', p.target ? o.pct + ' % von ' + C.fmt0(p.target) : 'ohne Zielbetrag', o.eta ? 'Ziel ' + C.monthName(o.eta) : o.paused ? 'pausiert' : '', 'data-a="nav" data-tab="sparen"'); }).join('') : empty('Noch kein Sparbereich', 'Zum Beispiel Urlaub, Notgroschen oder Weihnachten.')) + '</section>';
  if (isCur) {
    const day = C.dayOf(comp.today), up = R.fixItems.filter(f => f.due && f.cash > 0 && f.day > day).sort((a, b) => a.day - b.day);
    h += '<section class="card"><h2>Noch fällig in diesem Monat</h2>' + (up.length ? '<div class="list">' + up.map(f => '<div class="row"><span class="mono">' + f.day + '.</span><span class="tx"><b>' + esc(f.name) + '</b><span>' + (f.spread ? 'wird aus der Rücklage bezahlt' : 'ist in „frei verfügbar“ schon abgezogen') + '</span></span><span class="am num">' + C.fmt(f.cash) + '</span></div>').join('') + '</div>' : empty('Alles durch', 'In diesem Monat stehen keine Fixkosten mehr an.')) + '</section>';
  }
  h += '</div>';
  const rec = S.tx.map((t, i) => [t, i]).filter(x => C.monthOf(x[0].d) === M).sort((a, b) => (a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : b[1] - a[1])).slice(0, 5);
  h += '<section class="card"><h2>Letzte Buchungen <button type="button" class="link" data-a="nav" data-tab="buchungen">Alle</button></h2>' + (rec.length ? '<div class="list">' + rec.map(x => txRow(x[0])).join('') + '</div>' : empty('Noch keine Buchung in diesem Monat', 'Unten auf „Buchung“ tippen, Betrag eingeben, Kategorie wählen, speichern.')) + '</section>';
  return h;
}

/* ---------- Buchungen ---------- */
function txFiltered() {
  const f = U.f, q = f.q.trim().toLowerCase(); let lo = '', hi = '9999';
  if (f.range === 'month') { lo = U.month + '-01'; hi = U.month + '-31'; } else if (f.range === 'year') { lo = U.month.slice(0, 4) + '-01-01'; hi = U.month.slice(0, 4) + '-12-31'; } else if (f.range === 'custom') { lo = f.from || ''; hi = f.to || '9999'; }
  return S.tx.map((t, i) => [t, i]).filter(x => { const t = x[0]; return t.d >= lo && t.d <= hi && (f.type === 'all' || (f.type === 'exp') === (t.t === 'exp')) && (!f.cat || t.cat === f.cat) && (!q || (t.name + ' ' + (t.note || '') + ' ' + catName(t.cat) + ' ' + C.num(t.a)).toLowerCase().indexOf(q) >= 0); })
    .sort((a, b) => (a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : b[1] - a[1])).map(x => x[0]);
}
function txListHtml() {
  const list = txFiltered(); let e = 0, i = 0;
  for (const t of list) if (t.t === 'exp') e += t.a; else i += t.a;
  let h = '<p class="sub num">' + list.length + (list.length === 1 ? ' Buchung' : ' Buchungen') + ' · Ausgaben ' + C.fmt(e) + ' · Einnahmen ' + C.fmt(i) + '</p>';
  if (!list.length) return h + empty('Nichts gefunden', 'Für diese Auswahl gibt es keine Buchungen.');
  h += '<div class="list">'; let day = '';
  for (const t of list.slice(0, 400)) {
    if (t.d !== day) { day = t.d; let s = 0; for (const o of list) if (o.d === day) s += o.t === 'exp' ? -o.a : o.a; h += '<div class="dayh"><span>' + C.fmtDay(day) + (U.f.range !== 'month' ? ' ' + day.slice(0, 4) : '') + '</span><span class="num">' + C.fmtSigned(s) + '</span></div>'; }
    h += txRow(t);
  }
  return h + '</div>' + (list.length > 400 ? '<p class="hint">Es werden die neuesten 400 Buchungen gezeigt. Grenze die Auswahl ein, um ältere zu sehen.</p>' : '');
}
function vTx() {
  const f = U.f, R = comp.months[U.month];
  const seg = [['all', 'Alle'], ['exp', 'Ausgaben'], ['inc', 'Einnahmen']].map(o => '<button type="button" data-a="f-type" data-v="' + o[0] + '" aria-pressed="' + (f.type === o[0]) + '">' + o[1] + '</button>').join('');
  let h = '<section class="card filters"><div class="seg" role="group" aria-label="Art">' + seg + '</div><div class="field"><input id="q" class="inp" type="search" placeholder="Suchen: Bezeichnung, Notiz, Betrag" value="' + esc(f.q) + '" aria-label="Buchungen durchsuchen" autocomplete="off"></div>'
    + '<div class="field"><div class="two"><select id="f-cat" class="inp" aria-label="Kategorie"><option value="">Alle Kategorien</option>' + S.cats.map(c => '<option value="' + c.id + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>'
    + '<select id="f-range" class="inp" aria-label="Zeitraum">' + [['month', C.monthName(U.month)], ['year', 'Jahr ' + U.month.slice(0, 4)], ['all', 'Gesamter Zeitraum'], ['custom', 'Von … bis …']].map(o => '<option value="' + o[0] + '"' + (f.range === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div></div>'
    + (f.range === 'custom' ? '<div class="field"><div class="two"><input id="f-from" class="inp" type="date" value="' + esc(f.from) + '" aria-label="Von"><input id="f-to" class="inp" type="date" value="' + esc(f.to) + '" aria-label="Bis"></div></div>' : '') + '</section>';
  if (f.range === 'month' && R && (R.fixed || R.incomeRec)) h += '<section class="card" style="padding:4px 16px"><button type="button" class="row" data-a="nav" data-tab="fixkosten"><span class="mono">' + ic('repeat') + '</span><span class="tx"><b>Wiederkehrend in diesem Monat</b><span class="num">Einnahmen ' + C.fmt(R.incomeRec) + ' · Fixkosten ' + C.fmt(R.fixed) + '</span></span>' + ic('chevR') + '</button></section>';
  return h + '<section class="card" id="txlist">' + txListHtml() + '</section>';
}

/* ---------- Sparen ---------- */
function vSave() {
  const M = comp.cur < S.meta.start ? S.meta.start : comp.cur, R = comp.months[M], pots = S.pots.filter(p => !p.arch);
  let total = 0; for (const p of pots) total += comp.pots[p.id].balance;
  const open = R.goal - R.savedPlan;
  let h = (S.meta.demo ? banners() : '') + '<section class="hero" style="background:var(--surface);color:var(--ink);border:1px solid var(--line)"><div><div class="lbl">In deinen Sparbereichen</div><div class="big num">' + C.fmt(total) + '</div></div><div class="kv"><div><b class="num">' + C.fmt(R.goal) + '</b><span>Sparziel pro Monat</span></div><div><b class="num">' + C.fmt(R.saved) + '</b><span>im ' + C.monthName(M) + ' zugewiesen</span></div></div>'
    + '<div class="btns"><button type="button" class="btn sm" data-a="goal">Sparziel ändern</button><button type="button" class="btn sm" data-a="alloc" data-m="' + M + '">Sparrate ' + C.MON[+M.slice(5, 7) - 1] + ' anpassen</button>' + (pots.length > 1 ? '<button type="button" class="btn sm" data-a="move" data-from="' + pots[0].id + '" data-to="' + pots[1].id + '">Umbuchen</button>' : '') + '</div></section>';
  if (open > 0) h += alertHtml({ lv: 'info', title: C.fmt(open) + ' vom Sparziel sind nicht verteilt', text: 'Dein Sparziel ist ' + C.fmt(R.goal) + ', auf Sparbereiche verteilt sind ' + C.fmt(R.savedPlan) + '. Nur verteiltes Geld zählt als gespart.' });
  if (R.uncovered > 0) h += alertHtml({ lv: 'crit', title: 'Sparrate nicht gedeckt', text: 'Von ' + C.fmt(R.saved) + ' sind in diesem Monat nur ' + C.fmt(R.covered) + ' gedeckt.', act: 'alloc:' + M });
  h += '<div class="grid2">' + pots.map(p => {
    const o = comp.pots[p.id];
    return '<section class="card"><h2>' + esc(p.name) + (o.paused ? ' <span class="pill">pausiert</span>' : p.target && o.balance >= p.target ? ' <span class="pill good">Ziel erreicht</span>' : '') + '<button type="button" class="link" data-a="pot" data-id="' + p.id + '">Bearbeiten</button></h2>'
      + (p.desc ? '<p class="sub" style="margin:-6px 0 8px">' + esc(p.desc) + '</p>' : '') + '<div class="num" style="font:700 26px var(--f-display)">' + C.fmt(o.balance) + '</div>'
      + (p.target ? '<div class="bar" style="margin:10px 0 6px"><i class="sav" style="width:' + o.pct + '%"></i></div><div class="prog" style="border:0;padding:0"><span class="ft"><span class="num">' + o.pct + ' % von ' + C.fmt(p.target) + '</span><span class="num">noch ' + C.fmt(o.rest) + '</span></span></div>' : '')
      + '<p class="sub" style="margin-top:8px">' + (o.plan ? C.fmt(o.plan) + ' pro Monat' : 'keine monatliche Zuweisung') + (o.eta ? ' · Ziel voraussichtlich im ' + C.monthName(o.eta) + ' (' + o.months + (o.months === 1 ? ' Monat' : ' Monate') + ')' : '') + '</p>'
      + '<div class="btns" style="margin-top:12px"><button type="button" class="btn sm" data-a="move" data-from="free" data-to="' + p.id + '">Einzahlen</button><button type="button" class="btn sm" data-a="move" data-from="' + p.id + '" data-to="free">Entnehmen</button><button type="button" class="btn sm" data-a="pot-hist" data-id="' + p.id + '">Verlauf</button></div></section>';
  }).join('') + '</div>';
  if (!pots.length) h += '<section class="card">' + empty('Noch kein Sparbereich', 'Lege fest, wofür du Geld zur Seite legst und wie viel pro Monat.') + '</section>';
  h += '<button type="button" class="btn wide" data-a="pot">' + ic('plus') + 'Neuer Sparbereich</button>';
  const res = R.fixItems.filter(f => f.spread && f.reserve > 0);
  if (res.length) h += '<section class="card"><h2>Rücklagen für Jahreszahlungen</h2><p class="sub" style="margin:-6px 0 8px">Entstehen automatisch aus Fixkosten mit „Monatlich dafür zurücklegen“.</p><div class="list">' + res.map(f => '<div class="row"><span class="tx"><b>' + esc(f.name) + '</b><span class="num">' + C.fmt(f.accrual) + ' pro Monat</span></span><span class="am num">' + C.fmt(f.reserve) + '</span></div>').join('') + '</div></section>';
  return h;
}
function potHist(id) {
  const p = S.pots.find(x => x.id === id), rows = [];
  if (p.opening) rows.push([C.potSince(S, p) + '-01', 'Startbetrag', p.opening, '']);
  for (const k of comp.order) { if (k > comp.cur) break; const a = comp.months[k].alloc[id]; if (a) rows.push([k + '-01', 'Monatliche Zuweisung ' + C.monthName(k), a, '']); }
  for (const m of S.moves) if (m.from === id || m.to === id) rows.push([m.d, (m.to === id ? 'Von ' + (m.from === 'free' ? 'freiem Geld' : potName(m.from)) : 'Nach ' + (m.to === 'free' ? 'freiem Geld' : potName(m.to))) + (m.note ? ' · ' + m.note : ''), m.to === id ? m.a : -m.a, m.id]);
  for (const t of S.tx) if (t.pot === id) rows.push([t.d, 'Ausgabe: ' + t.name, -t.a, '']);
  rows.sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  formCtx = null;
  openSheet('Verlauf: ' + p.name, rows.length ? '<div class="list">' + rows.slice(0, 60).map(r => '<div class="row"><span class="tx"><b>' + esc(r[1]) + '</b><span>' + C.fmtDate(r[0]) + '</span></span><span class="am num ' + (r[2] > 0 ? 'plus' : '') + '">' + C.fmtSigned(r[2]) + '</span>' + (r[3] ? '<button type="button" class="btn sm dng" data-a="move-del" data-id="' + r[3] + '" data-pot="' + id + '">Löschen</button>' : '') + '</div>').join('') + '</div>' : empty('Noch keine Bewegung'), '<button type="button" class="btn pri" data-a="close">Schließen</button>');
}

/* ---------- Diagramme ---------- */
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
const tipRow = (l, v) => '<i><span>' + l + '</span><span>' + v + '</span></i>';
function chartKeys(W) { const n = Math.max(3, Math.min(12, Math.floor((W - 52) / 30))), ks = comp.order.filter(k => k <= comp.cur).slice(-n); return ks.length ? ks : [comp.order[0]]; }
const CHARTS = {
  bars(W) {
    const keys = chartKeys(W), H = 220, pl = 46, pr = 4, pt = 10, pb = 24, data = keys.map(k => { const R = comp.months[k]; return [R.income, R.spentAll, R.covered]; });
    const max = niceMax(Math.max.apply(null, [1].concat(data.map(d => Math.max(d[0], d[1], d[2])))));
    const iw = (W - pl - pr) / keys.length, bw = Math.max(3, Math.min(12, (iw - 12) / 3)), y = v => pt + (H - pt - pb) * (1 - Math.max(0, v) / max);
    let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Einnahmen, Ausgaben und Gespartes je Monat">';
    for (let i = 0; i <= 4; i++) { const yy = y(max * i / 4); s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + C.num(max * i / 4, 0) + '</text>'; }
    keys.forEach((k, i) => {
      const cx = pl + iw * i + iw / 2, x0 = cx - (bw * 3 + 4) / 2;
      data[i].forEach((v, j) => { const yy = y(v), h = H - pb - yy; if (h > 0.5) { const x = x0 + j * (bw + 2), r = Math.min(4, bw / 2, h); s += '<path d="M' + x + ',' + (yy + h) + 'V' + (yy + r) + 'Q' + x + ',' + yy + ' ' + (x + r) + ',' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + yy + ' ' + (x + bw) + ',' + (yy + r) + 'V' + (yy + h) + 'Z" fill="var(--' + ['inc', 'exp', 'sav'][j] + ')"/>'; } });
      s += '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + C.MON[+k.slice(5, 7) - 1] + '</text>';
      s += '<rect class="hit" tabindex="0" x="' + (pl + iw * i) + '" y="' + pt + '" width="' + iw + '" height="' + (H - pt - pb) + '" data-tip="' + esc('<b>' + C.monthName(k) + '</b>' + tipRow('Einnahmen', C.fmt(data[i][0])) + tipRow('Ausgaben', C.fmt(data[i][1])) + tipRow('Gespart', C.fmt(data[i][2]))) + '"/>';
    });
    return s + '</svg>';
  },
  wealth(W) {
    const keys = chartKeys(W), H = 200, pl = 46, pr = 14, pt = 14, pb = 24, vals = keys.map(k => comp.months[k].wealth);
    const hi = niceMax(Math.max.apply(null, [1].concat(vals))), mn = Math.min.apply(null, [0].concat(vals)), lo = mn < 0 ? -niceMax(-mn) : 0;
    const x = i => (keys.length === 1 ? pl + (W - pl - pr) / 2 : pl + (W - pl - pr) * i / (keys.length - 1)), y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Guthaben am Monatsende im Verlauf">';
    for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, yy = y(v); s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + C.num(v, 0) + '</text>'; }
    const pts = vals.map((v, i) => x(i) + ',' + y(v));
    if (keys.length > 1) s += '<path d="M' + x(0) + ',' + y(Math.max(lo, 0)) + 'L' + pts.join('L') + 'L' + x(keys.length - 1) + ',' + y(Math.max(lo, 0)) + 'Z" fill="var(--sav)" fill-opacity=".12"/><path d="M' + pts.join('L') + '" fill="none" stroke="var(--sav)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    const step = (W - pl - pr) / Math.max(1, keys.length - 1);
    keys.forEach((k, i) => {
      const R = comp.months[k], last = i === keys.length - 1;
      s += '<circle cx="' + x(i) + '" cy="' + y(vals[i]) + '" r="' + (last ? 5 : 3) + '" fill="var(--sav)" stroke="var(--surface)" stroke-width="2"/><text x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + C.MON[+k.slice(5, 7) - 1] + '</text>';
      const hx = Math.max(pl - 8, x(i) - step / 2), hw = Math.min(W - 1, x(i) + step / 2) - hx;
      s += '<rect class="hit" tabindex="0" x="' + hx + '" y="' + pt + '" width="' + hw + '" height="' + (H - pt - pb) + '" data-tip="' + esc('<b>Ende ' + C.monthName(k) + '</b>' + tipRow('Frei', C.fmt(R.available)) + tipRow('Sparbereiche', C.fmt(R.potsEnd)) + (R.reserveEnd ? tipRow('Rücklagen', C.fmt(R.reserveEnd)) : '') + tipRow('Gesamt', C.fmt(R.wealth))) + '"/>';
    });
    return s + '</svg>';
  }
};

/* ---------- Auswertung ---------- */
function vReport() {
  const M = U.month, R = comp.months[M], P = comp.months[C.addM(M, -1)], isCur = M === comp.cur;
  const tr = (l, a, b, cls) => '<tr class="' + (cls || '') + '"><td>' + l + '</td><td>' + (a == null ? '' : C.num(a)) + '</td><td>' + (b == null || !P ? '' : C.num(b)) + '</td></tr>';
  const kinds = Object.keys(C.IKINDS).filter(k => R.incByKind[k] || (P && P.incByKind[k]));
  let h = (isCur ? '<p class="sub">Der Monat läuft noch. Die Zahlen zeigen den Stand von heute.</p>' : M > comp.cur ? '<p class="sub">Dieser Monat liegt in der Zukunft. Gezeigt wird der Plan.</p>' : '')
    + '<section class="card"><h2>Monatsbericht ' + C.monthName(M) + '</h2><div class="scroll-x"><table class="tbl"><thead><tr><th></th><th>' + C.MON[+M.slice(5, 7) - 1] + ' (€)</th><th>' + (P ? 'Vormonat' : '') + '</th></tr></thead><tbody>'
    + tr('Einnahmen', null, null, 'grp') + kinds.map(k => tr(k === 'lohn' ? 'Gehalt und regelmäßige Einnahmen' : C.IKINDS[k], R.incByKind[k] || 0, P ? P.incByKind[k] || 0 : null, 'in')).join('') + tr('Einnahmen gesamt', R.income, P && P.income, 'sum')
    + tr('Ausgaben', null, null, 'grp') + tr('Fixkosten', R.fixed, P && P.fixed, 'in') + tr('Variable Ausgaben' + (R.refunds ? ' (nach ' + C.fmt(R.refunds) + ' Rückzahlungen)' : ''), R.variable, P && P.variable, 'in') + tr('Aus Sparbereichen bezahlt', R.potSpent, P && P.potSpent, 'in') + tr('Ausgaben gesamt', R.fixed + R.variable + R.potSpent, P && P.fixed + P.variable + P.potSpent, 'sum')
    + tr('Sparen', null, null, 'grp') + tr('Sparziel', R.goal, P && P.goal, 'in') + tr('Den Sparbereichen zugewiesen', R.saved, P && P.saved, 'in') + tr('Davon tatsächlich gedeckt', R.covered, P && P.covered, 'sum')
    + tr('Monatsabschluss', null, null, 'grp') + tr('Einnahmen minus Fixkosten, Ausgaben und Sparrate', R.result, P && P.result, 'in') + tr('Puffer aus dem Vormonat', R.carryIn, P && P.carryIn, 'in') + tr(isCur ? 'Noch frei verfügbar' : 'Frei am Monatsende', R.available, P && P.available, 'sum') + tr('Guthaben gesamt (frei, Sparbereiche, Rücklagen)', R.wealth, P && P.wealth, 'in')
    + '</tbody></table></div></section>';
  const cats = S.cats.map(c => { const b = R.byCat[c.id] || { spent: 0, pot: 0 }; return { c: c, s: Math.max(0, b.spent), p: b.pot, t: Math.max(0, b.spent) + b.pot }; }).filter(x => x.t > 0).sort((a, b) => b.t - a.t), cmax = cats.length ? cats[0].t : 1;
  h += '<div class="grid2"><section class="card"><h2>Ausgaben nach Kategorie</h2>' + (cats.length ? cats.map(x => '<button type="button" class="hbar" data-a="f-cat-go" data-id="' + x.c.id + '"><span class="nm">' + esc(x.c.name) + '</span><span class="tr">' + (x.s ? '<i style="width:' + (x.s * 100 / cmax) + '%"></i>' : '') + (x.p ? '<i class="p" style="width:' + (x.p * 100 / cmax) + '%"></i>' : '') + '</span><span class="num">' + C.fmt(x.t) + '</span></button>').join('') + '<div class="legend"><span><i class="dot" style="background:var(--exp)"></i>aus dem Monatsbudget</span><span><i class="dot" style="background:var(--sav)"></i>aus Sparbereichen</span></div>' : empty('Noch keine Ausgaben', 'In diesem Monat ist nichts erfasst.')) + '</section>';
  const ins = C.insights(S, comp, M), out = C.outliers(S, comp, M);
  h += '<section class="card"><h2>Hinweise aus deinen Zahlen</h2><div class="tips">' + (ins.length ? ins.map(i => '<div class="tip ' + (i.t === 'tip' ? 'tip2' : i.t) + '">' + ic(i.t === 'good' ? 'check' : i.t === 'warn' ? 'warn' : i.t === 'tip' ? 'bulb' : 'info') + '<span>' + esc(i.text) + '</span></div>').join('') : '<p class="hint">Noch zu wenig Daten für Hinweise.</p>') + '</div>'
    + '<h2 style="margin-top:18px">Auffällig hohe Ausgaben</h2>' + (out.list.length ? '<div class="list">' + out.list.map(o => '<button type="button" class="row" data-a="tx" data-id="' + o.tx.id + '"><span class="tx"><b>' + esc(o.tx.name) + '</b><span>' + C.fmtDate(o.tx.d) + ' · ' + String(o.factor).replace('.', ',') + '-mal so hoch wie üblich in ' + esc(catName(o.tx.cat)) + ' (' + C.fmt(o.median) + ')</span></span><span class="am num">' + C.fmt(o.tx.a) + '</span></button>').join('') + '</div>' : '<p class="hint">' + (out.enough ? 'Keine Ausgabe fällt aus dem Rahmen.' : 'Dafür braucht es mindestens einen Vormonat mit Buchungen.') + '</p>') + '</section></div>';
  const legend = '<div class="legend" style="margin:0 0 10px">' + [['Einnahmen', 'inc'], ['Ausgaben', 'exp'], ['Gespart', 'sav']].map(l => '<span><i class="dot" style="background:var(--' + l[1] + ')"></i>' + l[0] + '</span>').join('') + '</div>';
  h += '<section class="card"><h2>Verlauf der Monate</h2>' + legend + '<div class="chart" data-chart="bars"></div><p class="hint" style="margin-top:8px">Beträge in Euro. Säule antippen für die genauen Werte.</p></section>';
  h += '<section class="card"><h2>Guthaben am Monatsende</h2><div class="chart" data-chart="wealth"></div><p class="hint" style="margin-top:8px">Freies Geld, Sparbereiche und Rücklagen zusammen, in Euro.</p></section>';
  const years = []; for (const k of comp.order) if (k <= comp.cur && years.indexOf(k.slice(0, 4)) < 0) years.push(k.slice(0, 4)); if (!years.length) years.push(S.meta.start.slice(0, 4));
  const Y = years.indexOf(U.year) >= 0 ? U.year : M.slice(0, 4) <= years[years.length - 1] && years.indexOf(M.slice(0, 4)) >= 0 ? M.slice(0, 4) : years[years.length - 1], yr = C.year(comp, Y);
  h += '<section class="card"><h2>Jahresübersicht ' + (years.length > 1 ? '<select id="year" class="inp" style="width:auto;min-height:36px;margin-left:auto" aria-label="Jahr">' + years.map(y => '<option' + (y === Y ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>' : Y) + '</h2><div class="scroll-x"><table class="tbl"><thead><tr><th>' + Y + '</th><th>Einnahmen</th><th>Fixkosten</th><th>Variabel</th><th>Gespart</th><th>Ergebnis</th></tr></thead><tbody>'
    + yr.rows.map(r => '<tr><td>' + C.MON[+r.key.slice(5, 7) - 1] + '</td><td>' + C.num(r.income) + '</td><td>' + C.num(r.fixed) + '</td><td>' + C.num(r.variable) + '</td><td>' + C.num(r.saved) + '</td><td>' + C.num(r.result) + '</td></tr>').join('')
    + '<tr class="sum"><td>Summe</td><td>' + C.num(yr.tot.income) + '</td><td>' + C.num(yr.tot.fixed) + '</td><td>' + C.num(yr.tot.variable) + '</td><td>' + C.num(yr.tot.saved) + '</td><td>' + C.num(yr.tot.result) + '</td></tr></tbody></table></div>'
    + '<div class="btns" style="margin-top:12px"><button type="button" class="btn sm" data-a="csv">' + ic('down') + 'Alle Buchungen als CSV für Excel</button></div></section>';
  return h;
}

/* ---------- Mehr, Fixkosten, Budgets, Einstellungen ---------- */
function vMore() {
  const item = (a, icn, t, s) => '<button type="button" class="row" ' + a + '><span class="mono">' + ic(icn) + '</span><span class="tx"><b>' + t + '</b><span>' + s + '</span></span>' + ic('chevR', 'chev') + '</button>';
  return '<section class="card menu"><div class="list">' + item('data-a="nav" data-tab="fixkosten"', 'repeat', 'Fixkosten & Gehalt', 'Alles, was sich regelmäßig wiederholt') + item('data-a="nav" data-tab="budgets"', 'tag', 'Budgets & Kategorien', 'Monatslimits, Warnschwellen, eigene Kategorien')
    + item('data-a="nav" data-tab="einstellungen"', 'gear', 'Einstellungen & Sicherung', 'Startguthaben, Darstellung, Daten sichern') + item('data-a="help"', 'help', 'So rechnet die App', 'Die Regeln hinter den Zahlen, kurz erklärt') + '</div></section>'
    + '<p class="hint" style="text-align:center">' + APP_NAME + ' ' + APP_VERSION + ' · Daten bleiben auf diesem Gerät</p>';
}
function recRow(r, M) {
  const f = C.recInfo(S, r, M), iv = r.interval || 1; let pill = '', amt = '', cls = '';
  if (!f) { cls = ' off'; pill = r.end && (r.shift ? C.addM(M, -1) : M) > r.end ? '<span class="pill">beendet seit ' + C.monShort(C.addM(r.end, 1)) + '</span>' : '<span class="pill">ab ' + C.monShort(r.versions[0].from) + '</span>'; amt = C.fmt(lastActive(r.versions)); }
  else {
    amt = C.fmt(f.paused ? lastActive(r.versions) : f.amount);
    if (f.paused) { pill = '<span class="pill">pausiert</span>'; cls = ' off'; }
    else if (!f.due) { pill = '<span class="pill">nächste Zahlung ' + C.monShort(C.addM(M, f.iv - f.k)) + '</span>'; if (!r.spread) cls = ' off'; }
    else if (f.excluded) { pill = '<span class="pill info">im Startguthaben enthalten</span>'; cls = ' off'; }
    else if (f.skipped) { pill = '<span class="pill warn">diesen Monat ausgesetzt</span>'; cls = ' off'; }
    else if (f.overridden) pill = '<span class="pill warn">nur diesen Monat geändert</span>';
  }
  const sub = C.RHYTHM[iv] + ' · am ' + (r.day || 1) + '.' + (r.spread && iv > 1 ? ' · mit Rücklage' : '') + (r.shift ? ' · zählt für den Folgemonat' : '') + (r.versions.length > 1 ? ' · ' + r.versions.length + ' Stände' : '');
  return '<div class="row' + cls + '"><button type="button" class="tx" data-a="rec" data-id="' + r.id + '"><b>' + esc(r.name) + '</b><span>' + sub + '</span>' + (pill ? '<span class="pl">' + pill + '</span>' : '') + '</button><span class="am num">' + amt + '</span>' + (f && f.due && !f.paused && !f.excluded ? '<button type="button" class="btn sm" data-a="occ" data-id="' + r.id + '" aria-label="' + esc(r.name) + ' nur in diesem Monat ändern">Nur ' + C.MON[+M.slice(5, 7) - 1] + '</button>' : '') + '</div>';
}
function vRec() {
  const M = U.month, R = comp.months[M], inc = S.rec.filter(r => r.kind === 'inc'), fix = S.rec.filter(r => r.kind === 'fix'), acc = R.fixItems.reduce((a, f) => a + (f.spread ? f.accrual || 0 : 0), 0);
  return '<p class="sub">Einmal eintragen, jeden Monat automatisch berücksichtigt. Änderungen gelten ab dem gewählten Monat.</p>'
    + '<section class="card"><h2>Regelmäßige Einnahmen <span class="num" style="margin-left:auto">' + C.fmt(R.incomeRec) + '</span></h2>' + (inc.length ? '<div class="list">' + inc.map(r => recRow(r, M)).join('') + '</div>' : empty('Noch kein Gehalt eingetragen')) + '<button type="button" class="btn sm" style="margin-top:10px" data-a="rec-new" data-kind="inc">' + ic('plus') + 'Regelmäßige Einnahme</button></section>'
    + '<section class="card"><h2>Fixkosten <span class="num" style="margin-left:auto">' + C.fmt(R.fixed) + '</span></h2>' + (fix.length ? '<div class="list">' + fix.map(r => recRow(r, M)).join('') + '</div>' : empty('Noch keine Fixkosten', 'Miete, Strom, Internet, Versicherungen …')) + (acc ? '<p class="hint" style="margin-top:8px">In der Summe stecken ' + C.fmt(acc) + ' Rücklage für Zahlungen, die nicht monatlich anfallen.</p>' : '') + '<button type="button" class="btn sm" style="margin-top:10px" data-a="rec-new" data-kind="fix">' + ic('plus') + 'Fixkosten hinzufügen</button></section>';
}
function vBudgets() {
  const M = U.month, R = comp.months[M], bt = R.budgetTotal;
  let h = '<section class="card"><h2>Warnungen <button type="button" class="link" data-a="warn">Ändern</button></h2><p>Warnung bei ' + (S.set.warn || []).map(w => w + ' %').join(', ') + ' eines Budgets.</p><p class="sub" style="margin-top:4px">' + (bt ? 'Gesamtbudget für variable Ausgaben: ' + C.fmt(bt) + ', davon verbraucht ' + C.fmt(Math.max(0, R.variable)) + '.' : 'Kein Gesamtbudget festgelegt.') + '</p></section><section class="card"><h2>Kategorien im ' + C.monthName(M) + '</h2>';
  h += S.cats.map(c => {
    const b = C.amtAt(c.budget, M), x = R.byCat[c.id] || { spent: 0, pot: 0 }, sp = Math.max(0, x.spent), pct = b ? Math.floor(sp * 100 / b) : 0; let lvl = 0; for (const w of S.set.warn || []) if (pct >= w) lvl = Math.max(lvl, w);
    return prog(c.name, b ? C.fmt(sp) + ' von ' + C.fmt0(b) : C.fmt(sp), b ? pct : 0, pct >= 100 ? 'crit' : lvl ? 'warn' : '', b ? pct + ' %' + (c.need ? ' · notwendig' : '') : 'kein Budget' + (c.need ? ' · notwendig' : ''), (b ? (sp > b ? C.fmt(sp - b) + ' darüber' : 'noch ' + C.fmt(b - sp)) : '') + (x.pot ? ' · ' + C.fmt(x.pot) + ' aus Sparbereich' : ''), 'data-a="cat" data-id="' + c.id + '"');
  }).join('');
  return h + '<button type="button" class="btn sm" style="margin-top:12px" data-a="cat">' + ic('plus') + 'Neue Kategorie</button></section>';
}
function vSettings() {
  const lb = S.meta.lastBackup, standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (U.snaps == null) { U.snaps = []; Store.keys().then(ks => { U.snaps = ks.filter(k => k.indexOf('snap:') === 0).sort().reverse(); if (U.tab === 'einstellungen') render(); }); }
  const canShare = !IS_FRAME && navigator.canShare && (function () { try { return navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] }); } catch (e) { return false; } })();
  let h = '<section class="card"><h2>Sicherung</h2><p>' + (lb ? 'Letzte Sicherung am ' + C.fmtDate(C.todayStr(new Date(lb))) + (S.meta.dirty ? ', seither ' + S.meta.dirty + (S.meta.dirty === 1 ? ' Änderung.' : ' Änderungen.') : ', alles gesichert.') : 'Noch keine Sicherung erstellt.') + '</p><p class="sub" style="margin:4px 0 12px">Deine Daten liegen nur auf diesem Gerät. Geht das Handy verloren oder werden die Browserdaten gelöscht, hilft nur eine Sicherungsdatei.</p>'
    + '<div class="btns"><button type="button" class="btn pri" data-a="backup">' + ic('down') + 'Sicherung speichern</button>' + (canShare ? '<button type="button" class="btn" data-a="share">Sicherung teilen</button>' : '') + '<button type="button" class="btn" data-a="import">' + ic('up') + 'Sicherung einspielen</button></div>'
    + '<div class="btns" style="margin-top:8px"><button type="button" class="btn sm" data-a="backup-text">Als Text anzeigen</button><button type="button" class="btn sm" data-a="import-text">Aus Text einspielen</button><button type="button" class="btn sm" data-a="csv">CSV für Excel</button></div><input type="file" id="imp" accept=".json,application/json" hidden>'
    + (U.snaps.length ? '<div class="field" style="margin-top:14px"><label for="snap">Automatische Tagesstände (letzte 7 Nutzungstage)</label><div class="two"><select id="snap" class="inp">' + U.snaps.map(k => '<option value="' + k + '">Stand vom ' + C.fmtDate(k.slice(5)) + '</option>').join('') + '</select><button type="button" class="btn" data-a="snap-restore">Wiederherstellen</button></div></div>' : '') + '</section>';
  h += '<section class="card"><h2>Start der Aufzeichnung <button type="button" class="link" data-a="start">Ändern</button></h2><p class="num">Seit ' + C.fmtDate(S.meta.openDate) + ' mit ' + C.fmt(S.meta.opening) + ' frei verfügbarem Geld.</p></section>';
  h += '<section class="card"><h2>Darstellung</h2><div class="seg" role="group" aria-label="Darstellung">' + [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(o => '<button type="button" data-a="theme" data-v="' + o[0] + '" aria-pressed="' + ((S.set.theme || 'auto') === o[0]) + '">' + o[1] + '</button>').join('') + '</div></section>';
  if (!IS_FRAME && !standalone) h += '<section class="card"><h2>Als App installieren</h2>' + (installEvt ? '<p class="sub" style="margin-bottom:10px">Legt ein eigenes Symbol am Startbildschirm an. Die App startet dann auch ohne Internet.</p><button type="button" class="btn pri" data-a="install">App installieren</button>' : '<p class="sub">In Chrome oben rechts auf die drei Punkte tippen und „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</p>') + '</section>';
  h += '<section class="card"><h2>Speicher</h2><p class="sub">' + (Store.mode === 'idb' ? 'Gespeichert wird in der Datenbank dieses Browsers.' : Store.mode === 'ls' ? 'Gespeichert wird im einfachen Browserspeicher.' : 'Dieser Browser erlaubt kein dauerhaftes Speichern.') + (persisted === true ? ' Der Browser hat zugesichert, die Daten nicht von selbst zu löschen.' : persisted === false && !standalone ? ' Nach dem Installieren als App schützt der Browser die Daten besser vor automatischem Löschen.' : '') + '</p></section>';
  h += '<section class="card"><h2>Daten</h2><div class="btns"><button type="button" class="btn sm" data-a="demo">Beispieldaten laden</button><button type="button" class="btn sm dng" data-a="wipe">Alles löschen und neu beginnen</button></div></section>';
  h += '<section class="card"><h2>Version ' + APP_VERSION + '</h2><div class="tips">' + CHANGELOG.map(c => '<div class="tip">' + ic('check') + '<span><b>' + c[0] + '</b> · ' + c[1] + '<br>' + esc(c[2]) + '</span></div>').join('') + '</div></section>';
  return h;
}
function welcomeHtml() {
  return '<div class="col"><main><div class="welcome"><div><p class="sub" style="font-weight:700">' + APP_NAME + '</p><h1>Dein Geld auf einen Blick.</h1></div><p>Du trägst Gehalt, Fixkosten und Ausgaben ein. Die App zeigt dir jederzeit, wie viel noch frei ist, warnt bei zu hohen Ausgaben und führt deine Sparziele.</p>'
    + '<section class="card" style="display:flex;flex-direction:column;gap:14px"><div class="field"><label for="w-a">Wie viel Geld hast du heute frei zur Verfügung?</label><div class="amtw"><input id="w-a" class="inp amt" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off"></div><div class="hint">Konto und Bargeld zusammen, ohne Erspartes für bestimmte Ziele. Du kannst das später ändern.</div></div>'
    + '<div class="field"><label for="w-s">Monatliches Gehalt netto (optional)</label><div class="amtw"><input id="w-s" class="inp" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off" style="text-align:right;padding-right:40px"></div></div><div class="field"><label for="w-d">Zahltag im Monat</label><input id="w-d" type="number" inputmode="numeric" min="1" max="31" value="1"></div>'
    + '<div class="field"><div class="err" id="w-err" role="alert"></div></div><button type="button" class="btn pri wide" data-a="welcome-go">Los geht’s</button></section>'
    + '<button type="button" class="btn wide" data-a="demo-first">Erst mit Beispieldaten ansehen</button><button type="button" class="btn wide" data-a="import">' + ic('up') + 'Sicherung einspielen</button><input type="file" id="imp" accept=".json,application/json" hidden>'
    + '<p class="hint">Alle Daten bleiben auf diesem Gerät. Keine Anmeldung, keine Bankverbindung, kein Server.</p></div></main></div>';
}
const VIEWS = { uebersicht: vOverview, buchungen: vTx, sparen: vSave, auswertung: vReport, mehr: vMore, fixkosten: vRec, budgets: vBudgets, einstellungen: vSettings };

/* ---------- Aktionen ---------- */
// Nach dem Schließen eines Blatts läuft noch ein "Zurück" im Browserverlauf. Erst danach darf navigiert werden.
const afterQ = [];
function drainAfter() { if (!afterQ.length) return; ignorePop = 0; while (afterQ.length) afterQ.shift()(); }
function afterClose(fn) { if (ignorePop > 0) { afterQ.push(fn); setTimeout(drainAfter, 600); } else fn(); }
function navTo(tab) { afterClose(() => go(tab)); }
function runAct(act) {
  const p = act.split(':');
  if (p[0] === 'alloc') allocForm(p[1]); else if (p[0] === 'backup') doBackup(); else if (p[0] === 'rec') recForm(p[1]); else if (p[0] === 'pot') potForm(); else if (p[0] === 'go') navTo(p[1]);
}
const A = {
  nav: d => navTo(d.tab), add: () => { if (S) txForm(); }, tx: d => txForm(d.id), close: () => closeSheet(), act: d => runAct(d.act),
  month: d => { const cur = curM() < S.meta.start ? S.meta.start : curM(); U.month = monthClamp(+d.d === 0 ? cur : C.addM(U.month, +d.d)); refresh(); },
  pick: (d, el) => { const multi = formCtx && formCtx.fields && (formCtx.fields.find(f => f.k === d.k) || {}).type === 'multi'; if (multi) el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true'); else el.parentNode.querySelectorAll('[data-a="pick"]').forEach(b => b.setAttribute('aria-pressed', b === el)); syncForm(); },
  'form-ok': () => { const cfg = formCtx; if (!cfg || !cfg.onSubmit) return; const r = cfg.onSubmit(formVals()); if (typeof r === 'string' && r) formError(r); else if (r !== true && formCtx === cfg) closeSheet(); },
  'form-del': () => { if (formCtx && formCtx.del) formCtx.del.fn(); },
  'confirm-ok': () => { const fn = formCtx && formCtx.onOk; closeSheet(); if (fn) afterClose(fn); },
  'ver-del': d => {
    const o = d.kind === 'rec' ? S.rec.find(x => x.id === d.id) : S.pots.find(x => x.id === d.id), key = d.kind === 'rec' ? 'versions' : 'plan';
    if (o[key][0].from === d.from && o[key].length > 1 && d.kind === 'rec') { const first = o[key][0].from; commit(() => { o[key] = o[key].filter(v => v.from !== d.from); o[key][0] = Object.assign({}, o[key][0], { from: first }); }, 'Eintrag entfernt'); }
    else commit(() => { const first = o[key][0].from; o[key] = o[key].filter(v => v.from !== d.from); if (o[key][0].from > first) o[key][0] = Object.assign({}, o[key][0], { from: first }); }, 'Eintrag entfernt');
    if (d.kind === 'rec') recForm(null, d.id); else potForm(d.id);
  },
  rec: d => recForm(null, d.id), 'rec-new': d => recForm(d.kind), occ: d => occForm(d.id, U.month),
  'rec-pause': d => { const r = S.rec.find(x => x.id === d.id), M = U.month, cur = C.verAt(r.versions, M), paused = cur && cur.paused; closeSheet(); commit(() => { r.versions = paused ? C.setVer(r.versions, M, lastActive(r.versions)) : C.setVer(r.versions, M, 0, { paused: true }); }, paused ? 'Läuft wieder ab ' + C.monthName(M) : 'Pausiert ab ' + C.monthName(M)); },
  'rec-unend': d => { const r = S.rec.find(x => x.id === d.id); closeSheet(); commit(() => { r.end = null; }, 'Läuft wieder weiter'); },
  'rec-end': d => { const r = S.rec.find(x => x.id === d.id), M = U.month; closeSheet(); commit(() => { r.end = C.addM(r.shift ? C.addM(M, -1) : M, -1); }, 'Beendet ab ' + C.monthName(M)); },
  'rec-kill': d => { const r = S.rec.find(x => x.id === d.id), copy = JSON.parse(JSON.stringify(r)); closeSheet(); commit(s => { s.rec = s.rec.filter(x => x.id !== d.id); for (const k in s.ov) if (k.indexOf(d.id + '|') === 0) delete s.ov[k]; }, 'Gelöscht', () => commit(s => { s.rec.push(copy); }, 'Wiederhergestellt')); },
  pot: d => potForm(d.id), 'pot-hist': d => potHist(d.id), goal: () => goalForm(), alloc: d => allocForm(d.m), move: d => moveForm({ from: d.from, to: d.to }),
  'pot-pause': d => { const p = S.pots.find(x => x.id === d.id), M = curM() < S.meta.start ? S.meta.start : curM(), cur = C.verAt(p.plan, M), paused = cur && cur.paused; closeSheet(); commit(() => { p.plan = paused ? C.setVer(p.plan, M, lastActive(p.plan)) : C.setVer(p.plan, M, 0, { paused: true }); }, paused ? 'Sparbereich läuft wieder' : 'Sparbereich pausiert'); },
  'move-del': d => { const m = S.moves.find(x => x.id === d.id), copy = Object.assign({}, m); commit(s => { s.moves = s.moves.filter(x => x.id !== d.id); }, 'Umbuchung gelöscht', () => commit(s => { s.moves.push(copy); }, 'Wiederhergestellt')); potHist(d.pot); },
  'alloc-cut': d => { const cut = C.cutAlloc(S, comp, d.m); if (!cut) return; for (const id in cut) { const el = $('#f-p_' + id, sheetEl); if (el) el.value = C.inputVal(cut[id]); } },
  cat: d => catForm(d.id), warn: () => warnForm(), start: () => startForm(), help: () => helpSheet(), csv: () => doCsv(), backup: () => doBackup(), share: () => doShare(),
  'backup-text': () => textSheet('Sicherung als Text', backupText(), true),
  'copy-text': () => { const ctx = formCtx || {}, ta = $('#bk-t', sheetEl); const done = () => { if (ctx.isBackup) markBackup(); toast('Kopiert'); }; try { navigator.clipboard.writeText(ctx.text).then(done, () => { ta.select(); toast('Bitte den markierten Text von Hand kopieren.'); }); } catch (e) { ta.select(); toast('Bitte den markierten Text von Hand kopieren.'); } },
  'import': () => { const i = $('#imp'); if (i) i.click(); },
  'import-text': () => openForm({ title: 'Sicherung aus Text einspielen', vals: { t: '' }, submit: 'Prüfen', fields: [{ k: 't', type: 'area', label: 'Text der Sicherung hier einfügen' }], onSubmit(x) { const e = importText(x.t.trim()); return e || true; } }),
  'snap-restore': () => { const k = $('#snap').value; Store.get(k).then(v => { if (!v) { toast('Dieser Stand ist nicht mehr vorhanden.'); return; } const e = importText(JSON.stringify(v)); if (e) toast(e); }); },
  theme: d => { commit(s => { s.set.theme = d.v; }); applyTheme(); },
  install: () => { if (installEvt) { installEvt.prompt(); installEvt = null; } },
  'hide-steps': () => commit(s => { s.meta.hideSteps = true; }),
  'f-type': d => { U.f.type = d.v; render(); }, 'f-cat-go': d => { U.f.cat = d.id; U.f.type = 'exp'; U.f.range = 'month'; U.f.q = ''; navTo('buchungen'); },
  fresh: () => confirmSheet('Mit eigenen Daten starten', 'Die Beispieldaten werden entfernt. Danach gibst du dein Startguthaben ein.', 'Beispieldaten entfernen', () => { S = null; Store.del('state'); resetTab(); render(); }),
  demo: () => confirmSheet('Beispieldaten laden', 'Deine jetzigen Daten werden durch Beispieldaten <b>ersetzt</b>. Erstelle vorher eine Sicherung, wenn du sie behalten willst.', 'Ersetzen', loadDemo, true),
  'demo-first': () => loadDemo(),
  wipe: () => confirmSheet('Alles löschen', 'Alle Buchungen, Fixkosten, Budgets und Sparbereiche auf diesem Gerät werden <b>endgültig gelöscht</b>. Ohne Sicherungsdatei lässt sich das nicht rückgängig machen.', 'Endgültig löschen', () => { S = null; Store.del('state'); resetTab(); render(); }, true),
  'welcome-go': () => {
    const a = $('#w-a').value.trim(), s = $('#w-s').value.trim(), av = a === '' ? 0 : C.parseAmount(a), sv = s === '' ? 0 : C.parseAmount(s), err = $('#w-err');
    if (av == null) { err.textContent = 'Bitte das Startguthaben prüfen, z. B. 1.250,00.'; return; } if (sv == null || sv < 0) { err.textContent = 'Bitte das Gehalt prüfen, z. B. 2.400,00.'; return; }
    startFresh(av, sv, Math.max(1, Math.min(31, parseInt($('#w-d').value, 10) || 1)));
  }
};
function applyTheme() { const t = S && S.set.theme ? S.set.theme : 'auto', r = document.documentElement; if (t === 'auto') { if (!IS_FRAME) r.removeAttribute('data-theme'); } else r.setAttribute('data-theme', t); }

/* ---------- Ereignisse ---------- */
document.addEventListener('click', e => {
  const tb = $('.tipbox'); if (tb && !e.target.closest('[data-tip]')) tb.remove();
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { U.f.q = t.value; const l = $('#txlist'); if (l) l.innerHTML = txListHtml(); }
  else if (sheetEl && sheetEl.contains(t)) { syncForm(); const er = $('#f-err', sheetEl); if (er) er.textContent = ''; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-cat') { U.f.cat = t.value; render(); } else if (t.id === 'f-range') { U.f.range = t.value; render(); } else if (t.id === 'f-from') { U.f.from = t.value; render(); } else if (t.id === 'f-to') { U.f.to = t.value; render(); }
  else if (t.id === 'year') { U.year = t.value; render(); }
  else if (t.id === 'imp' && t.files && t.files[0]) { const rd = new FileReader(); rd.onload = () => { const er = importText(String(rd.result)); if (er) toast(er); }; rd.onerror = () => toast('Die Datei konnte nicht gelesen werden.'); rd.readAsText(t.files[0]); t.value = ''; }
  else if (sheetEl && sheetEl.contains(t)) syncForm();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetEl) closeSheet();
  else if (e.key === 'Enter' && sheetEl && e.target.tagName === 'INPUT' && formCtx && formCtx.onSubmit) { e.preventDefault(); A['form-ok'](); }
  else if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('w-') === 0) A['welcome-go']();
});
function showTip(el) {
  let tb = $('.tipbox'); if (!tb) { tb = document.createElement('div'); tb.className = 'tipbox'; document.body.appendChild(tb); }
  tb.innerHTML = el.dataset.tip; const r = el.getBoundingClientRect(), w = tb.offsetWidth, hgt = tb.offsetHeight;
  tb.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; tb.style.top = Math.max(8, r.top - hgt - 6) + 'px';
  document.querySelectorAll('.hit.on').forEach(x => x.classList.remove('on')); el.classList.add('on');
}
document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('[data-tip]')) { const tb = $('.tipbox'); if (tb) tb.remove(); } });
document.addEventListener('focusin', e => { if (e.target.dataset && e.target.dataset.tip) showTip(e.target); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS[h] && h !== U.tab) { U.tab = h; U.snaps = null; if (S) render(); const m = $('main'); if (m) m.scrollTop = 0; } });
window.addEventListener('popstate', () => {
  if (ignorePop > 0) { ignorePop--; if (!ignorePop) drainAfter(); return; }
  if (sheetEl) closeSheet(true);
});
let rsT = null, lastW = window.innerWidth;
window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; if (S && !sheetEl) render(); } }, 200); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else if (S && comp && comp.today !== today()) { refresh(); dailySnapshot(); } });
window.addEventListener('pagehide', () => { flush(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S && U.tab === 'einstellungen') render(); });
window.addEventListener('error', e => { try { console.error(e.error || e.message); } catch (x) { } });

/* ---------- Start ---------- */
function registerSW() {
  if (IS_FRAME || !('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Neue Version geladen. Beim nächsten Öffnen ist sie aktiv.'); }); });
  }).catch(() => { });
}
(async function init() {
  await Store.init();
  const st = await Store.get('state');
  if (st) { try { S = C.migrate(st); } catch (e) { await Store.set('state_defekt', st); S = null; } }
  if (!S && IS_FRAME) S = C.demo(today());
  const h = location.hash.slice(1); if (TABS[h]) U.tab = h;
  applyTheme(); refresh(); dailySnapshot(); registerSW();
})();
