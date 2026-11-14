// Testfälle für den Rechenkern. Start: node test/core.test.js
const C = require('../src/core.js');
const assert = require('assert');
let n = 0, fails = 0;
function t(name, fn) { n++; try { fn(); } catch (e) { fails++; console.log('FEHLER  ' + name + '\n        ' + e.message.split('\n')[0]); } }
const eq = (a, b, m) => assert.strictEqual(a, b, (m || '') + ' erwartet ' + b + ', erhalten ' + a);
const E = x => Math.round(x * 100);

function base(openDate, opening) { const s = C.newState(openDate || '2026-11-01', opening || 0); return s; }
function rec(s, kind, name, eur, day, o) { const r = Object.assign({ id: name, kind, name, day: day || 1, interval: 1, anchor: s.meta.start, end: null, versions: [{ from: s.meta.start, amount: E(eur) }] }, o || {}); s.rec.push(r); return r; }
function exp(s, d, eur, cat, o) { const x = Object.assign({ id: C.id(), t: 'exp', a: E(eur), d, name: 'x', cat: cat || 'c1', pot: null, pay: '', ik: '', note: '' }, o || {}); s.tx.push(x); return x; }
function inc(s, d, eur, ik, o) { const x = Object.assign({ id: C.id(), t: 'inc', a: E(eur), d, name: 'x', cat: null, pot: null, pay: '', ik: ik || 'sonst', note: '' }, o || {}); s.tx.push(x); return x; }
function pot(s, name, eur, o) { const p = Object.assign({ id: name, name, desc: '', target: 0, opening: 0, since: s.meta.start, plan: [{ from: s.meta.start, amount: E(eur) }], arch: false }, o || {}); s.pots.push(p); return p; }
// Prüft für jeden Monat: Vermögen = Start + Einnahmen − alle tatsächlichen Ausgaben (+ Startbeträge der Sparbereiche)
function identity(s, comp) {
  let w = s.meta.opening;
  for (const k of comp.order) { const R = comp.months[k]; w += R.income - R.fixedCash - R.variable - R.potSpent + R.extIn; eq(R.wealth, w, 'Vermögen ' + k); eq(R.netChange, R.income - R.fixedCash - R.variable - R.potSpent, 'Änderung ' + k); }
}
function spec() {   // Beispiel aus der Vorgabe: 3.000 − 1.100 − 650 − 500 = 750
  const s = base();
  rec(s, 'inc', 'Gehalt', 3000, 1);
  rec(s, 'fix', 'Miete', 800, 5); rec(s, 'fix', 'Versicherung', 120, 3); rec(s, 'fix', 'Strom', 70, 10); rec(s, 'fix', 'Internet', 35, 12); rec(s, 'fix', 'Handy', 25, 15); rec(s, 'fix', 'Fitness', 50, 20);
  pot(s, 'Urlaub', 200, { target: E(2000), opening: E(600) }); pot(s, 'Beauty', 100); pot(s, 'Hobbys', 100); pot(s, 'Wünsche', 100);
  exp(s, '2026-11-02', 85, 'c1'); exp(s, '2026-11-04', 70, 'c2'); exp(s, '2026-11-07', 45, 'c7'); exp(s, '2026-11-11', 35, 'c10'); exp(s, '2026-11-12', 415, 'c1');
  return s;
}

/* --- Beträge --- */
t('Beträge einlesen', () => {
  const cases = { '85': 8500, '12,50': 1250, '12.50': 1250, '1.234,56': 123456, '1234,5': 123450, '1.234': 123400, '0,05': 5, ' 70 € ': 7000, '1,234.56': 123456, '12.5': 1250, '-3,20': -320, '2.500.000': 250000000, ',5': 50 };
  for (const k in cases) eq(C.parseAmount(k), cases[k], '"' + k + '"');
  for (const bad of ['', 'abc', '1,2,3', '12,345', '1.23.4', '€']) eq(C.parseAmount(bad), null, '"' + bad + '"');
});
t('Beträge anzeigen', () => {
  eq(C.fmt(123456), '1.234,56 €'); eq(C.fmt(-50), '−0,50 €'); eq(C.fmt(0), '0,00 €'); eq(C.fmt0(123456), '1.235 €'); eq(C.fmt(300000000), '3.000.000,00 €');
  eq(C.parseAmount(C.inputVal(123456)), 123456);
});
t('Keine Rundungsfehler bei 0,10 + 0,20', () => { const s = base(); exp(s, '2026-11-02', 0.1); exp(s, '2026-11-02', 0.2); eq(C.compute(s, '2026-11-13').months['2026-11'].variable, 30); });

/* --- Grundrechnung --- */
t('Beispiel der Vorgabe: 3.000 − 1.100 − 650 − 500 = 750', () => {
  const s = spec(), R = C.compute(s, '2026-11-13').months['2026-11'];
  eq(R.income, E(3000)); eq(R.fixed, E(1100)); eq(R.variable, E(650)); eq(R.saved, E(500)); eq(R.result, E(750)); eq(R.available, E(750));
});
t('Mehrfaches Rechnen ändert nichts (keine Doppelbuchung beim Öffnen)', () => {
  const s = spec(), a = JSON.stringify(s), r1 = JSON.stringify(C.compute(s, '2026-11-13')), r2 = JSON.stringify(C.compute(s, '2026-11-13'));
  eq(r1, r2); eq(JSON.stringify(s), a, 'Zustand unverändert');
  eq(C.compute(s, '2026-11-30').months['2026-11'].fixed, E(1100));
});
t('Puffer wandert in den nächsten Monat', () => {
  const s = spec(), comp = C.compute(s, '2026-12-10'), D = comp.months['2026-12'];
  eq(D.carryIn, E(750)); eq(D.result, E(3000 - 1100 - 500)); eq(D.available, E(750 + 1400)); identity(s, comp);
});
t('Startguthaben zählt nur einmal', () => { const s = spec(); s.meta.opening = E(300); const c = C.compute(s, '2027-01-05'); eq(c.months['2026-11'].available, E(1050)); eq(c.months['2027-01'].available, E(1050 + 1400 + 1400)); identity(s, c); });

/* --- Fixkosten und Gehalt mit "gültig ab" --- */
t('Miete ab März 850 €, frühere Monate bleiben bei 800 €', () => {
  const s = base('2027-01-01'); const r = rec(s, 'fix', 'Miete', 800, 5);
  const before = C.compute(s, '2027-04-10');
  r.versions = C.setVer(r.versions, '2027-03', E(850));
  const c = C.compute(s, '2027-04-10');
  eq(c.months['2027-01'].fixed, E(800)); eq(c.months['2027-02'].fixed, E(800)); eq(c.months['2027-03'].fixed, E(850)); eq(c.months['2027-04'].fixed, E(850));
  eq(before.months['2027-02'].fixed, c.months['2027-02'].fixed, 'Februar unverändert');
  eq(r.versions.length, 2);
});
t('Gehaltserhöhung ab Jänner verändert alte Monate nicht', () => {
  const s = base('2026-11-01'); const r = rec(s, 'inc', 'Gehalt', 3000, 1);
  r.versions = C.setVer(r.versions, '2027-01', E(3200));
  const c = C.compute(s, '2027-02-10');
  eq(c.months['2026-11'].income, E(3000)); eq(c.months['2026-12'].income, E(3000)); eq(c.months['2027-01'].income, E(3200)); eq(c.months['2027-02'].income, E(3200));
});
t('Gleicher "gültig ab"-Monat ersetzt statt zu verdoppeln', () => { let v = [{ from: '2026-11', amount: 1 }]; v = C.setVer(v, '2027-03', 2); v = C.setVer(v, '2027-03', 3); eq(v.length, 2); eq(C.amtAt(v, '2027-05'), 3); eq(C.amtAt(v, '2027-02'), 1); eq(C.amtAt(v, '2026-10'), 0); });
t('Pausieren und Beenden', () => {
  const s = base('2026-11-01'); const r = rec(s, 'fix', 'Fitness', 40, 20);
  r.versions = C.setVer(r.versions, '2026-12', 0, { paused: true }); r.versions = C.setVer(r.versions, '2027-02', E(40));
  const r2 = rec(s, 'fix', 'Abo', 10, 1); r2.end = '2026-12';
  const c = C.compute(s, '2027-03-10');
  eq(c.months['2026-11'].fixed, E(50)); eq(c.months['2026-12'].fixed, E(10)); eq(c.months['2027-01'].fixed, 0); eq(c.months['2027-02'].fixed, E(40));
});
t('Einmalige Abweichung und Aussetzen in einem Monat', () => {
  const s = base('2026-11-01'); rec(s, 'fix', 'Strom', 70, 10);
  s.ov['Strom|2026-12'] = { amount: E(95) }; s.ov['Strom|2027-01'] = { skip: true };
  const c = C.compute(s, '2027-02-10');
  eq(c.months['2026-11'].fixed, E(70)); eq(c.months['2026-12'].fixed, E(95)); eq(c.months['2027-01'].fixed, 0); eq(c.months['2027-02'].fixed, E(70));
});
t('Start mitten im Monat: Bereits Bezahltes steckt im Startguthaben', () => {
  const s = base('2026-11-13', E(1500)); rec(s, 'inc', 'Gehalt', 3000, 1); rec(s, 'fix', 'Miete', 800, 5); rec(s, 'fix', 'Handy', 25, 15); rec(s, 'fix', 'Fitness', 40, 13);
  const c = C.compute(s, '2026-12-02'), N = c.months['2026-11'];
  eq(N.income, 0); eq(N.fixed, E(65)); eq(N.available, E(1435)); eq(c.months['2026-12'].income, E(3000)); eq(c.months['2026-12'].fixed, E(865)); identity(s, c);
});
t('Gehalt am Monatsende zählt für den Folgemonat', () => {
  const s = base('2026-11-13', E(500)); rec(s, 'inc', 'Gehalt', 3000, 28, { shift: 1 });
  const c = C.compute(s, '2027-01-05');
  eq(c.months['2026-11'].income, 0, 'Oktober-Gehalt steckt im Startguthaben'); eq(c.months['2026-12'].income, E(3000)); eq(c.months['2027-01'].income, E(3000));
});
t('Vierteljährlich und jährlich ohne Rücklage: belastet den Fälligkeitsmonat', () => {
  const s = base('2026-11-01'); rec(s, 'fix', 'GIS', 60, 1, { interval: 3, anchor: '2026-12' }); rec(s, 'fix', 'Vers', 600, 15, { interval: 12, anchor: '2027-03' });
  const c = C.compute(s, '2027-06-10'); const f = k => c.months[k].fixed;
  eq(f('2026-11'), 0); eq(f('2026-12'), E(60)); eq(f('2027-01'), 0); eq(f('2027-03'), E(660)); eq(f('2027-06'), E(60)); identity(s, c);
});
t('Jahreszahlung mit Rücklage: 600 € im März = 50 € pro Monat', () => {
  const s = base('2026-11-01'); rec(s, 'inc', 'Gehalt', 3000, 1); rec(s, 'fix', 'Vers', 600, 15, { interval: 12, anchor: '2027-03', spread: true });
  const c = C.compute(s, '2028-04-10'); const f = k => c.months[k];
  eq(f('2026-11').fixed, E(50)); eq(f('2027-02').fixed, E(50)); eq(f('2027-02').reserveEnd, E(200));
  eq(f('2027-03').fixed, E(50 + 350), 'erstes Jahr: 250 € Rücklage, 350 € fehlen'); eq(f('2027-03').fixedCash, E(600)); eq(f('2027-03').reserveEnd, 0);
  eq(f('2027-04').fixed, E(50)); eq(f('2028-02').reserveEnd, E(550)); eq(f('2028-03').fixed, E(50), 'zweites Jahr voll gedeckt'); eq(f('2028-03').fixedCash, E(600)); eq(f('2028-03').reserveEnd, 0);
  identity(s, c);
});
t('Rücklage teilt centgenau (599,99 € über 12 Monate)', () => {
  const s = base('2026-01-01'); rec(s, 'fix', 'V', 599.99, 1, { interval: 12, anchor: '2026-12', spread: true });
  const c = C.compute(s, '2026-12-31'); let sum = 0; for (const k of c.order) sum += c.months[k].fixed; eq(sum, 59999); eq(c.months['2026-12'].reserveEnd, 0);
});
t('Beendete Jahreszahlung gibt die Rücklage zurück', () => {
  const s = base('2026-11-01'); const r = rec(s, 'fix', 'V', 600, 1, { interval: 12, anchor: '2027-10', spread: true }); r.end = '2027-01';
  const c = C.compute(s, '2027-03-01'); eq(c.months['2027-01'].reserveEnd, E(150)); eq(c.months['2027-02'].fixed, -E(150)); eq(c.months['2027-02'].reserveEnd, 0); identity(s, c);
});

/* --- Sparbereiche --- */
t('Aus dem Sparbereich bezahlen: Beauty 100 € → 60 € Friseur → 40 €', () => {
  const s = spec(); const before = C.compute(s, '2026-11-13');
  exp(s, '2026-11-13', 60, 'c6', { pot: 'Beauty' });
  const c = C.compute(s, '2026-11-13'), R = c.months['2026-11'];
  eq(c.pots.Beauty.balance, E(40)); eq(R.available, before.months['2026-11'].available, 'freies Geld unverändert'); eq(R.variable, E(650)); eq(R.potSpent, E(60));
  eq(R.byCat.c6.pot, E(60)); eq(R.byCat.c6.spent, 0, 'zählt nicht gegen das Budget'); eq(R.wealth, before.months['2026-11'].wealth - E(60), 'nur einmal abgezogen'); identity(s, c);
});
t('Sparziel Urlaub: 2.000 € Ziel, 800 € angespart, 200 € monatlich → 6 Monate', () => {
  const s = spec(), c = C.compute(s, '2026-11-13'), u = c.pots.Urlaub;
  eq(u.balance, E(800)); eq(u.rest, E(1200)); eq(u.pct, 40); eq(u.months, 6); eq(u.eta, '2027-05');
});
t('Umbuchen zwischen Sparbereichen erzeugt weder Einnahme noch Ausgabe', () => {
  const s = spec(), a = C.compute(s, '2026-11-13').months['2026-11'];
  s.moves.push({ id: 'm1', d: '2026-11-13', from: 'Wünsche', to: 'Urlaub', a: E(50) });
  const c = C.compute(s, '2026-11-13'), b = c.months['2026-11'];
  eq(b.available, a.available); eq(b.income, a.income); eq(b.variable, a.variable); eq(b.wealth, a.wealth); eq(b.potsEnd, a.potsEnd); eq(c.pots.Urlaub.balance, E(850)); eq(c.pots['Wünsche'].balance, E(50));
});
t('Extra einzahlen und zurückholen', () => {
  const s = spec(); s.moves.push({ id: 'm1', d: '2026-11-13', from: 'free', to: 'Urlaub', a: E(100) }, { id: 'm2', d: '2026-11-13', from: 'Hobbys', to: 'free', a: E(30) });
  const c = C.compute(s, '2026-11-13'), R = c.months['2026-11'];
  eq(R.available, E(750 - 100 + 30)); eq(c.pots.Urlaub.balance, E(900)); eq(c.pots.Hobbys.balance, E(70)); identity(s, c);
});
t('Nicht gedeckte Sparrate wird ausgewiesen und anteilig gekürzt', () => {
  const s = spec(); exp(s, '2026-11-13', 950, 'c10');        // variable Ausgaben 1.600 €
  let c = C.compute(s, '2026-11-13'), R = c.months['2026-11'];
  eq(R.available, -E(200)); eq(R.uncovered, E(200)); eq(R.covered, E(300));
  const cut = C.cutAlloc(s, c, '2026-11'); eq(cut.Urlaub, E(120)); eq(cut.Beauty, E(60)); eq(cut.Hobbys, E(60)); eq(cut['Wünsche'], E(60));
  s.alloc['2026-11'] = cut; c = C.compute(s, '2026-12-01'); R = c.months['2026-11'];
  eq(R.saved, E(300)); eq(R.savedPlan, E(500)); eq(R.available, 0); eq(R.uncovered, 0); eq(c.months['2026-12'].saved, E(500), 'Dezember wieder nach Plan'); identity(s, c);
});
t('Altes Minus wird nicht jeden Monat neu als ungedeckt gemeldet', () => {
  const s = spec(); exp(s, '2026-11-13', 950, 'c10'); exp(s, '2026-12-05', 1300, 'c10');
  const c = C.compute(s, '2026-12-20'); eq(c.months['2026-11'].uncovered, E(200)); eq(c.months['2026-12'].available, -E(100)); eq(c.months['2026-12'].uncovered, 0);
});
t('Gesamt-Sparziel größer als Verteilung: Rest gilt nicht als gespart', () => { const s = spec(); s.set.goal = [{ from: '2026-11', amount: E(600) }]; const R = C.compute(s, '2026-11-13').months['2026-11']; eq(R.goal, E(600)); eq(R.saved, E(500)); eq(R.goal - R.savedPlan, E(100)); });
t('Sparbereich pausieren stoppt die Zuweisung, Guthaben bleibt', () => {
  const s = spec(); const p = s.pots.find(x => x.id === 'Urlaub'); p.plan = C.setVer(p.plan, '2026-12', 0, { paused: true });
  const c = C.compute(s, '2026-12-10'); eq(c.months['2026-12'].saved, E(300)); eq(c.pots.Urlaub.balance, E(800)); eq(c.pots.Urlaub.paused, true); eq(c.pots.Urlaub.eta, null);
});

/* --- Einnahmen: Geschenke, Rückzahlungen --- */
t('Geschenk zählt als Einnahme, Rückzahlung mit Kategorie senkt die Ausgaben', () => {
  const s = spec(), a = C.compute(s, '2026-11-13').months['2026-11'];
  inc(s, '2026-11-10', 100, 'geschenk'); inc(s, '2026-11-12', 35, 'refund', { cat: 'c10' }); inc(s, '2026-11-12', 80, 'refund');
  const c = C.compute(s, '2026-11-13'), R = c.months['2026-11'];
  eq(R.income, a.income + E(180), 'Geschenk + Rückzahlung ohne Kategorie'); eq(R.incByKind.geschenk, E(100)); eq(R.variable, a.variable - E(35)); eq(R.byCat.c10.spent, 0); eq(R.available, a.available + E(215)); identity(s, c);
});

/* --- Budgets und Warnungen --- */
t('Budget-Warnung bei 80 % und Alarm bei Überschreitung', () => {
  const s = base(); rec(s, 'inc', 'Gehalt', 3000, 1); s.cats[0].budget = [{ from: '2026-11', amount: E(400) }];
  exp(s, '2026-11-03', 310, 'c1'); let c = C.compute(s, '2026-11-13'); eq(C.alerts(s, c).filter(a => a.key === 'bc1').length, 0, '77 %');
  exp(s, '2026-11-05', 40, 'c1'); c = C.compute(s, '2026-11-13'); let al = C.alerts(s, c).find(a => a.key === 'bc1');
  eq(al.lv, 'warn'); assert(al.text.includes('350,00') && al.text.includes('400,00') && al.text.includes('50,00'), al.text);
  exp(s, '2026-11-08', 70, 'c1'); c = C.compute(s, '2026-11-13'); al = C.alerts(s, c).find(a => a.key === 'bc1'); eq(al.lv, 'crit'); assert(al.text.includes('20,00'), al.text);
});
t('Eigene Warnschwellen 70/90', () => {
  const s = base(); s.set.warn = [70, 90]; s.cats[0].budget = [{ from: '2026-11', amount: E(100) }]; exp(s, '2026-11-03', 72, 'c1');
  eq(C.budgets(s, C.compute(s, '2026-11-13'), '2026-11')[0].level, 70); exp(s, '2026-11-04', 20, 'c1'); eq(C.budgets(s, C.compute(s, '2026-11-13'), '2026-11')[0].level, 90);
});
t('Budget gilt je Monat, Änderung wirkt erst ab dem gewählten Monat', () => {
  const s = base(); s.cats[0].budget = C.setVer([{ from: '2026-11', amount: E(400) }], '2027-01', E(450)); const c = C.compute(s, '2027-01-10');
  eq(C.budgets(s, c, '2026-12')[0].budget, E(400)); eq(C.budgets(s, c, '2027-01')[0].budget, E(450));
});
t('Minus und knappes Monatsende lösen Warnungen aus', () => {
  const s = spec(); exp(s, '2026-11-13', 950, 'c10'); let al = C.alerts(s, C.compute(s, '2026-11-13')); assert(al.some(a => a.key === 'minus' && a.lv === 'crit'));
  const s2 = spec(); const fc = C.forecast(s2, C.compute(s2, '2026-11-13')); eq(fc.rest, E(850)); eq(fc.end, -E(100)); eq(fc.dayBudget, Math.floor(E(750) / 18));
  assert(C.alerts(s2, C.compute(s2, '2026-11-13')).some(a => a.key === 'fc'));
});
t('Ausgaben landen im richtigen Monat (Monats- und Jahreswechsel)', () => {
  const s = base('2026-11-01'); exp(s, '2026-11-30', 10); exp(s, '2026-12-01', 20); exp(s, '2026-12-31', 30); exp(s, '2027-01-01', 40); exp(s, '2028-02-29', 5);
  const c = C.compute(s, '2028-03-01'); eq(c.months['2026-11'].variable, E(10)); eq(c.months['2026-12'].variable, E(50)); eq(c.months['2027-01'].variable, E(40)); eq(c.months['2028-02'].variable, E(5)); eq(C.daysIn('2028-02'), 29); eq(C.daysIn('2027-02'), 28);
});

/* --- Summen --- */
t('Jahressumme = Summe der Monate, Vermögen stimmt in jedem Monat', () => {
  const s = C.demo('2027-03-13'); const s2 = spec(); rec(s2, 'fix', 'Vers', 600, 15, { interval: 12, anchor: '2027-03', spread: true });
  for (let i = 0; i < 60; i++) exp(s2, C.dateStr(C.addM('2026-11', i % 14), 1 + (i * 7) % 28), 3.33 + i * 1.07, 'c' + (1 + i % 12), i % 9 === 0 ? { pot: 'Hobbys' } : {});
  for (const st of [s, s2]) {
    const c = C.compute(st, '2027-12-31'); identity(st, c);
    const y = C.year(c, '2027'); let v = 0, p = 0, inc_ = 0;
    for (const x of st.tx) if (x.d.slice(0, 4) === '2027') { if (x.t === 'exp') { if (x.pot) p += x.a; else v += x.a; } else if (x.ik === 'refund' && x.cat) v -= x.a; else inc_ += x.a; }
    eq(y.tot.variable, v, 'variable Ausgaben'); eq(y.tot.potSpent, p, 'aus Sparbereichen');
    let recInc = 0; for (const R of y.rows) recInc += R.incomeRec; eq(y.tot.income, recInc + inc_, 'Einnahmen');
    let catSum = 0; for (const R of y.rows) for (const k in R.byCat) catSum += R.byCat[k].spent; eq(catSum, y.tot.variable, 'Kategorien = variable Ausgaben');
    const first = c.months[y.rows[0].key], lastR = y.rows[y.rows.length - 1];
    eq(lastR.available - first.carryIn, y.tot.result, 'Puffer-Entwicklung = Summe der Monatsergebnisse');
  }
});
t('Auffällige Ausgaben erst mit genug Vergleichsdaten', () => {
  const s = base('2026-09-01'); eq(C.outliers(s, C.compute(s, '2026-09-20'), '2026-09').enough, false);
  for (const m of ['2026-09', '2026-10']) for (let d = 1; d <= 4; d++) exp(s, m + '-0' + d, 40, 'c1');
  exp(s, '2026-11-03', 45, 'c1'); const big = exp(s, '2026-11-05', 180, 'c1');
  const o = C.outliers(s, C.compute(s, '2026-11-13'), '2026-11'); eq(o.enough, true); eq(o.list.length, 1); eq(o.list[0].tx.id, big.id); eq(o.list[0].median, E(40));
});
t('Hinweise nennen nur Zahlen aus den eigenen Daten', () => {
  const s = spec(), txt = C.insights(s, C.compute(s, '2026-11-13'), '2026-11').map(i => i.text).join(' | ');
  assert(txt.includes('37 %'), 'Fixkostenanteil 1.100/3.000 = 37 %: ' + txt); assert(txt.includes('500,00'), txt); assert(txt.includes('Vormonat gibt es ab'), txt);
});
t('Sicherung: Export und Import ergeben dieselben Zahlen', () => {
  const s = C.demo('2026-11-13'), back = C.migrate(JSON.parse(JSON.stringify(s)));
  eq(JSON.stringify(C.compute(back, '2026-11-13')), JSON.stringify(C.compute(s, '2026-11-13')));
  assert.throws(() => C.migrate({ foo: 1 })); assert.throws(() => C.migrate(Object.assign(JSON.parse(JSON.stringify(s)), { v: 9 })));
});
t('CSV enthält jede Buchung genau einmal', () => {
  const s = spec(), csv = C.csv(s, C.compute(s, '2026-11-13')), lines = csv.trim().split('\r\n');
  eq(lines.length, 1 + 1 + 6 + 4 + 5, 'Kopf + Gehalt + 6 Fixkosten + 4 Sparzuweisungen + 5 Ausgaben'); assert(lines[0].includes('Datum'));
  assert(csv.includes('"-85,00"') && csv.includes('"3000,00"') && csv.includes('02.11.2026'), 'österreichisches Format');
});

console.log((n - fails) + ' von ' + n + ' Testfällen bestanden');
process.exit(fails ? 1 : 0);
