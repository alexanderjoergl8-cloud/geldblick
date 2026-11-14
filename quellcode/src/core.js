/* Rechenkern der Finanz-App. Reine Funktionen, keine Oberfläche.
   Alle Beträge sind ganze Cent. Monate sind 'JJJJ-MM', Tage 'JJJJ-MM-TT'. */
(function (root) {
  'use strict';
  const C = {};
  const pad = n => String(n).padStart(2, '0');
  const NB = ' ';
  C.MONATE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  C.MON = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  C.IKINDS = { lohn: 'Gehalt / Lohn', geschenk: 'Geschenk', refund: 'Rückzahlung', sonder: 'Sonderzahlung', neben: 'Nebeneinkommen', sonst: 'Sonstiges' };
  C.PAYS = { '': '–', karte: 'Bankomatkarte', bar: 'Bargeld', kredit: 'Kreditkarte', ueberw: 'Überweisung' };
  C.RHYTHM = { 1: 'monatlich', 3: 'alle 3 Monate', 6: 'halbjährlich', 12: 'jährlich' };

  /* ---------- Geld ---------- */
  C.parseAmount = function (s) {
    if (typeof s === 'number') return Number.isFinite(s) ? Math.round(s * 100) : null;
    s = String(s == null ? '' : s).replace(/[€\s ]/g, '');
    if (!s) return null;
    let neg = false;
    if (s[0] === '-' || s[0] === '−') { neg = true; s = s.slice(1); } else if (s[0] === '+') s = s.slice(1);
    if (!/^[\d.,]+$/.test(s)) return null;
    const lc = s.lastIndexOf(','), lp = s.lastIndexOf('.');
    let int, frac = '';
    if (lc >= 0 && lp >= 0) { const d = Math.max(lc, lp); int = s.slice(0, d).replace(/[.,]/g, ''); frac = s.slice(d + 1); }
    else if (lc >= 0) { if (s.indexOf(',') !== lc) return null; int = s.slice(0, lc); frac = s.slice(lc + 1); }
    else if (lp >= 0) {
      const p = s.split('.');
      const thousands = p.length > 2 || (p[1].length === 3 && p[0].length >= 1 && p[0].length <= 3 && p[0] !== '0');
      if (thousands) { if (!p.slice(1).every(x => x.length === 3)) return null; int = p.join(''); }
      else { int = p[0]; frac = p[1]; }
    } else int = s;
    if (frac.length > 2 || !/^\d*$/.test(frac) || !/^\d*$/.test(int) || (!int && !frac)) return null;
    const c = parseInt(int || '0', 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
    if (!Number.isSafeInteger(c)) return null;
    return neg ? -c : c;
  };
  C.num = function (c, dec) {
    const neg = c < 0; c = Math.abs(Math.round(c));
    const whole = dec === 0 ? Math.round(c / 100) : Math.floor(c / 100);
    const s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + s + (dec === 0 ? '' : ',' + pad(c % 100));
  };
  C.fmt = c => C.num(c) + NB + '€';
  C.fmt0 = c => C.num(c, 0) + NB + '€';
  C.fmtSigned = c => (c > 0 ? '+' : '') + C.fmt(c);
  C.inputVal = c => (c == null ? '' : C.num(c).replace(/\./g, '').replace('−', '-'));

  /* ---------- Datum ---------- */
  C.mi = k => (+k.slice(0, 4)) * 12 + (+k.slice(5, 7)) - 1;
  C.mk = i => Math.floor(i / 12) + '-' + pad(i % 12 + 1);
  C.addM = (k, n) => C.mk(C.mi(k) + n);
  C.daysIn = k => new Date(+k.slice(0, 4), +k.slice(5, 7), 0).getDate();
  C.monthOf = d => d.slice(0, 7);
  C.dayOf = d => +d.slice(8, 10);
  C.todayStr = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  C.dateStr = (k, day) => k + '-' + pad(Math.min(day, C.daysIn(k)));
  C.monthName = k => C.MONATE[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
  C.monShort = k => C.MON[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4);
  C.fmtDate = d => d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4);
  C.fmtDay = function (d) {
    const dt = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][dt.getDay()] + ', ' + (+d.slice(8, 10)) + '. ' + C.MONATE[dt.getMonth()];
  };
  C.validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && C.dayOf(d) >= 1 && C.dayOf(d) <= C.daysIn(C.monthOf(d)) && +d.slice(5, 7) >= 1 && +d.slice(5, 7) <= 12;
  C.id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* ---------- "gültig ab"-Verläufe ---------- */
  C.verAt = function (vs, k) { let r = null; for (const v of vs || []) { if (v.from <= k) r = v; else break; } return r; };
  C.setVer = function (vs, from, amount, extra) {
    const out = (vs || []).filter(v => v.from !== from);
    out.push(Object.assign({ from: from, amount: amount }, extra || {}));
    out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    return out;
  };
  C.amtAt = (vs, k) => { const v = C.verAt(vs, k); return v ? v.amount : 0; };

  /* ---------- Startzustand ---------- */
  C.DEFAULT_CATS = [
    ['Lebensmittel', true], ['Auto & Tanken', true], ['Wohnen & Haushalt', true], ['Gesundheit', true],
    ['Kleidung', false], ['Beauty', false], ['Restaurant & Ausgehen', false], ['Freizeit & Hobbys', false],
    ['Urlaub', false], ['Shopping', false], ['Haustiere', false], ['Sonstiges', false]
  ];
  C.newState = function (today, opening) {
    return {
      v: 1,
      meta: { start: C.monthOf(today), openDate: today, opening: opening || 0, created: today, updated: 0, lastBackup: 0, dirty: 0, demo: false, setup: false },
      set: { warn: [80, 100], theme: 'auto', totalBudget: [], goal: [] },
      cats: C.DEFAULT_CATS.map((c, i) => ({ id: 'c' + (i + 1), name: c[0], need: c[1], budget: [] })),
      rec: [], ov: {}, tx: [], pots: [], alloc: {}, moves: []
    };
  };
  C.migrate = function (s) {
    if (!s || typeof s !== 'object' || !s.meta || !Array.isArray(s.tx) || !Array.isArray(s.cats)) throw new Error('Keine gültige Sicherung dieser App.');
    if ((s.v || 0) > 1) throw new Error('Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.');
    s.v = 1;
    s.set = Object.assign({ warn: [80, 100], theme: 'auto', totalBudget: [], goal: [] }, s.set || {});
    for (const k of ['rec', 'pots', 'moves']) if (!Array.isArray(s[k])) s[k] = [];
    for (const k of ['ov', 'alloc']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
    if (!C.validDate(s.meta.openDate)) throw new Error('Sicherung beschädigt: Startdatum fehlt.');
    s.meta.start = C.monthOf(s.meta.openDate);
    return s;
  };

  /* ---------- Wiederkehrendes (Fixkosten, Gehalt) ---------- */
  // Liefert den Stand eines wiederkehrenden Postens im Budgetmonat M oder null, wenn er dort nicht existiert.
  C.recInfo = function (st, r, M) {
    const shift = r.kind === 'inc' && r.shift ? 1 : 0;
    const pm = shift ? C.addM(M, -1) : M;                 // Monat der tatsächlichen Zahlung
    const v = C.verAt(r.versions, pm);
    if (!v) return null;
    if (r.end && pm > r.end) return null;
    const iv = r.interval || 1;
    const k = (((C.mi(pm) - C.mi(r.anchor || r.versions[0].from)) % iv) + iv) % iv;   // 0 = fällig
    const due = k === 0, ov = (st.ov || {})[r.id + '|' + M] || null;
    let amount = v.amount, skipped = false, overridden = false, excluded = false;
    if (due && ov) { if (ov.skip) skipped = true; else if (ov.amount != null) { amount = ov.amount; overridden = true; } }
    if (due && M === st.meta.start && (shift || (r.day || 1) < C.dayOf(st.meta.openDate))) excluded = true; // steckt schon im Startguthaben
    return { r: r, base: v.amount, amount: amount, due: due, k: k, iv: iv, paused: !!v.paused, skipped: skipped, overridden: overridden, excluded: excluded, day: Math.min(r.day || 1, C.daysIn(pm)), payMonth: pm };
  };
  const share = (A, j, iv) => Math.floor(A * j / iv) - Math.floor(A * (j - 1) / iv);   // centgenaue Aufteilung
  C.potPlan = function (p, M) { if (p.arch && p.archFrom && M >= p.archFrom) return 0; const v = C.verAt(p.plan, M); return v && !v.paused ? v.amount : 0; };
  C.potSince = (st, p) => (p.since && p.since > st.meta.start ? p.since : st.meta.start);

  /* ---------- Gesamtrechnung über alle Monate ---------- */
  C.compute = function (st, today, upto) {
    const cur = C.monthOf(today), start = st.meta.start;
    let last = cur > start ? cur : start;
    if (upto && upto > last) last = upto;
    const txBy = {}, mvBy = {};
    for (const t of st.tx) { const m = C.monthOf(t.d); (txBy[m] = txBy[m] || []).push(t); if (m > last) last = m; }
    for (const m of st.moves) { const k = C.monthOf(m.d); (mvBy[k] = mvBy[k] || []).push(m); if (k > last) last = k; }
    const res = { months: {}, order: [], today: today, cur: cur, start: start, pots: {} };
    let carry = st.meta.opening || 0, deficitPrev = Math.max(0, -carry);
    const reserve = {}, potBal = {};
    for (const p of st.pots) potBal[p.id] = 0;
    let wealthPrev = carry;
    for (let i = C.mi(start); i <= C.mi(last); i++) {
      const M = C.mk(i);
      const R = { key: M, incItems: [], fixItems: [], income: 0, incomeRec: 0, incomeTx: 0, incByKind: {}, refunds: 0,
        fixed: 0, fixedCash: 0, variable: 0, potSpent: 0, byCat: {}, alloc: {}, plan: {}, saved: 0, savedPlan: 0,
        toPots: 0, fromPots: 0, extIn: 0, carryIn: carry, n: 0 };
      const cat = id => (R.byCat[id || '_'] = R.byCat[id || '_'] || { spent: 0, pot: 0, n: 0 });
      // regelmäßige Einnahmen und Fixkosten
      for (const r of st.rec) {
        const f = C.recInfo(st, r, M);
        if (r.kind === 'inc') {
          if (!f || !f.due || f.paused) continue;
          const it = { id: r.id, name: r.name, amount: f.amount, day: f.day, excluded: f.excluded, skipped: f.skipped, overridden: f.overridden, shift: !!r.shift, counted: !(f.excluded || f.skipped) };
          R.incItems.push(it);
          if (it.counted) { R.incomeRec += f.amount; R.incByKind.lohn = (R.incByKind.lohn || 0) + f.amount; }
          continue;
        }
        if (!f) {                                           // beendet: Rest-Rücklage zurück ins freie Geld
          if (reserve[r.id]) { R.fixItems.push({ id: r.id, name: r.name + ' (Rücklage aufgelöst)', charge: -reserve[r.id], cash: 0, amount: 0, due: false, release: true }); R.fixed -= reserve[r.id]; reserve[r.id] = 0; }
          continue;
        }
        const active = !f.paused, pays = f.due && active && !f.skipped && !f.excluded;
        let charge = 0, cash = 0, accrual = 0, shortfall = 0;
        if (r.spread && f.iv > 1) {
          const res0 = reserve[r.id] || 0;
          if (active && !(f.due && (f.skipped || f.excluded))) accrual = share(f.base, f.k === 0 ? f.iv : f.k, f.iv);
          if (pays) { const have = res0 + accrual, drawn = Math.min(f.amount, have); shortfall = f.amount - drawn; reserve[r.id] = have - drawn; cash = f.amount; }
          else reserve[r.id] = res0 + accrual;
          charge = accrual + shortfall;
        } else if (pays) { charge = cash = f.amount; }
        if (!f.due && !charge) continue;
        if (f.paused && !charge) continue;
        R.fixItems.push({ id: r.id, name: r.name, amount: f.amount, day: f.day, due: f.due, charge: charge, cash: cash, accrual: accrual, shortfall: shortfall,
          spread: !!(r.spread && f.iv > 1), reserve: reserve[r.id] || 0, excluded: f.excluded, skipped: f.skipped, overridden: f.overridden, iv: f.iv });
        R.fixed += charge; R.fixedCash += cash;
      }
      // Buchungen
      for (const t of txBy[M] || []) {
        R.n++;
        if (t.t === 'exp') {
          const c = cat(t.cat); c.n++;
          if (t.pot && potBal[t.pot] != null) { R.potSpent += t.a; potBal[t.pot] -= t.a; c.pot += t.a; }
          else { R.variable += t.a; c.spent += t.a; }
        } else if (t.ik === 'refund' && t.cat) { R.refunds += t.a; R.variable -= t.a; cat(t.cat).spent -= t.a; }
        else { R.incomeTx += t.a; const k = t.ik || 'sonst'; R.incByKind[k] = (R.incByKind[k] || 0) + t.a; }
      }
      R.income = R.incomeRec + R.incomeTx;
      // Sparbereiche: Startbeträge, monatliche Zuweisung, Umbuchungen
      const ovA = st.alloc[M] || {};
      for (const p of st.pots) {
        if (C.potSince(st, p) === M && p.opening) { potBal[p.id] += p.opening; R.extIn += p.opening; }
        if (C.potSince(st, p) > M) continue;
        const plan = C.potPlan(p, M), a = ovA[p.id] != null ? ovA[p.id] : plan;
        R.plan[p.id] = plan; R.alloc[p.id] = a; R.savedPlan += plan; R.saved += a; potBal[p.id] += a;
      }
      for (const m of mvBy[M] || []) {
        const f = m.from !== 'free' && potBal[m.from] != null, t = m.to !== 'free' && potBal[m.to] != null;
        if (f) potBal[m.from] -= m.a; else R.toPots += t ? m.a : 0;
        if (t) potBal[m.to] += m.a; else R.fromPots += f ? m.a : 0;
      }
      R.goal = C.amtAt(st.set.goal, M) || R.savedPlan;
      R.result = R.income - R.fixed - R.variable - R.saved - R.toPots + R.fromPots;
      R.available = carry + R.result;
      const deficit = Math.max(0, -R.available);
      R.uncovered = Math.max(0, Math.min(R.saved, deficit - deficitPrev));
      R.covered = R.saved - R.uncovered;
      R.potBal = Object.assign({}, potBal);
      R.potsEnd = 0; for (const k in potBal) R.potsEnd += potBal[k];
      R.reserveEnd = 0; for (const k in reserve) R.reserveEnd += reserve[k];
      R.wealth = R.available + R.potsEnd + R.reserveEnd;
      R.netChange = R.wealth - wealthPrev - R.extIn;        // Einnahmen minus alle tatsächlichen Ausgaben
      R.spentAll = R.fixedCash + R.variable + R.potSpent;
      R.budgetTotal = C.amtAt(st.set.totalBudget, M);
      res.months[M] = R; res.order.push(M);
      carry = R.available; deficitPrev = deficit; wealthPrev = R.wealth;
    }
    const nowM = res.months[cur] || res.months[res.order[res.order.length - 1]];
    for (const p of st.pots) {
      const bal = nowM.potBal[p.id] || 0, plan = C.potPlan(p, cur < start ? start : cur);
      const o = { balance: bal, plan: plan, paused: !!(C.verAt(p.plan, cur) || {}).paused, pct: p.target > 0 ? Math.max(0, Math.min(100, Math.floor(bal * 100 / p.target))) : null, rest: p.target > 0 ? Math.max(0, p.target - bal) : null, eta: null, months: null };
      if (p.target > 0 && o.rest > 0 && plan > 0) { o.months = Math.ceil(o.rest / plan); o.eta = C.addM(nowM.key, o.months); }
      res.pots[p.id] = o;
    }
    return res;
  };

  /* ---------- Prognose für den laufenden Monat ---------- */
  C.forecast = function (st, comp) {
    const R = comp.months[comp.cur]; if (!R) return null;
    const day = C.dayOf(comp.today), dim = C.daysIn(comp.cur);
    const first = comp.cur === st.meta.start ? C.dayOf(st.meta.openDate) : 1;
    const elapsed = day - first + 1, left = dim - day;
    let rate = null, basis = '';
    if (elapsed >= 5 && R.variable > 0) { rate = R.variable / elapsed; basis = 'deinem bisherigen Tagesschnitt in diesem Monat'; }
    else { const P = comp.months[C.addM(comp.cur, -1)]; if (P && P.variable > 0) { rate = P.variable / C.daysIn(P.key); basis = 'dem Tagesschnitt des Vormonats'; } }
    const rest = rate == null ? null : Math.round(rate * left);
    return { daysLeft: left, dayBudget: R.available > 0 ? Math.floor(R.available / (left + 1)) : 0, rest: rest, end: rest == null ? null : R.available - rest, basis: basis, pctMonth: Math.round(day * 100 / dim) };
  };

  /* ---------- Budgets und Warnungen ---------- */
  C.budgets = function (st, comp, M) {
    const R = comp.months[M], warn = (st.set.warn || [80, 100]).slice().sort((a, b) => a - b), out = [];
    if (!R) return out;
    for (const c of st.cats) {
      const b = C.amtAt(c.budget, M), sp = Math.max(0, (R.byCat[c.id] || { spent: 0 }).spent);
      if (!b) continue;
      const pct = Math.floor(sp * 100 / b); let level = 0; for (const w of warn) if (pct >= w) level = w;
      out.push({ id: c.id, name: c.name, budget: b, spent: sp, rest: b - sp, pct: pct, level: level, over: sp > b });
    }
    return out;
  };
  C.alerts = function (st, comp) {
    const M = comp.cur, R = comp.months[M], out = []; if (!R) return out;
    const fc = C.forecast(st, comp);
    if (R.available < 0) out.push({ lv: 'crit', key: 'minus', title: 'Du bist im Minus', text: 'In diesem Monat fehlen ' + C.fmt(-R.available) + '.' + (R.uncovered > 0 ? ' Von deiner Sparrate (' + C.fmt(R.saved) + ') sind ' + C.fmt(R.uncovered) + ' nicht gedeckt.' : ''), act: R.uncovered > 0 ? 'alloc:' + M : '' });
    else if (fc && fc.end != null && fc.end < 0) out.push({ lv: 'warn', key: 'fc', title: 'Zum Monatsende wird es knapp', text: 'Gemessen an ' + fc.basis + ' fehlen am Monatsende voraussichtlich ' + C.fmt(-fc.end) + '. Deine Sparrate wäre dann nicht voll gedeckt.' });
    for (const b of C.budgets(st, comp, M)) {
      if (!b.level) continue;
      if (b.pct >= 100) out.push({ lv: 'crit', key: 'b' + b.id, title: b.over ? b.name + ': Budget überschritten' : b.name + ': Budget ausgeschöpft', text: 'Du hast ' + C.fmt(b.spent) + ' von ' + C.fmt(b.budget) + ' ausgegeben' + (b.over ? ' – ' + C.fmt(-b.rest) + ' mehr als geplant.' : '. Es bleibt nichts mehr übrig.') });
      else out.push({ lv: 'warn', key: 'b' + b.id, title: b.name + ': Budget zu ' + b.pct + NB + '% ausgeschöpft', text: 'Du hast bereits ' + C.fmt(b.spent) + ' von deinem Budget von ' + C.fmt(b.budget) + ' ausgegeben. Es bleiben noch ' + C.fmt(b.rest) + '.' });
    }
    if (R.budgetTotal > 0) {
      const pct = Math.floor(Math.max(0, R.variable) * 100 / R.budgetTotal); let level = 0; for (const w of st.set.warn || []) if (pct >= w) level = Math.max(level, w);
      if (pct >= 100) out.push({ lv: 'crit', key: 'bt', title: 'Gesamtbudget überschritten', text: 'Variable Ausgaben: ' + C.fmt(R.variable) + ' bei einem Monatsbudget von ' + C.fmt(R.budgetTotal) + '.' });
      else if (level) out.push({ lv: 'warn', key: 'bt', title: 'Gesamtbudget zu ' + pct + NB + '% ausgeschöpft', text: 'Variable Ausgaben: ' + C.fmt(R.variable) + ' von ' + C.fmt(R.budgetTotal) + '. Es bleiben noch ' + C.fmt(R.budgetTotal - R.variable) + '.' });
    }
    for (const k of comp.order) { if (k >= M) break; const P = comp.months[k]; if (P.uncovered > 0) out.push({ lv: 'warn', key: 'u' + k, title: 'Sparrate im ' + C.monthName(k) + ' nicht gedeckt', text: 'Zugewiesen waren ' + C.fmt(P.saved) + ', gedeckt nur ' + C.fmt(P.covered) + '. Entscheide, welcher Sparbereich weniger bekommt.', act: 'alloc:' + k }); }
    const day = C.dayOf(comp.today);
    for (const f of R.fixItems) if (f.due && f.cash > 0 && f.day > day && f.day - day <= 3) out.push({ lv: 'info', key: 'f' + f.id, title: 'Bald fällig: ' + f.name, text: C.fmt(f.cash) + ' am ' + f.day + '. ' + C.MONATE[+M.slice(5, 7) - 1] + (f.spread ? ' (aus der Rücklage)' : '') + '.' });
    return out;
  };

  /* ---------- Sparrate eines Monats anteilig auf den gedeckten Betrag kürzen ---------- */
  C.cutAlloc = function (st, comp, M) {
    const R = comp.months[M]; if (!R || R.uncovered <= 0 || R.saved <= 0) return null;
    const target = R.saved - R.uncovered, ids = Object.keys(R.alloc).filter(id => R.alloc[id] > 0), out = {};
    let sum = 0; const rem = [];
    for (const id of ids) { const exact = R.alloc[id] * target / R.saved, fl = Math.floor(exact); out[id] = fl; sum += fl; rem.push([exact - fl, id]); }
    rem.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    for (let i = 0; sum < target; i++, sum++) out[rem[i % rem.length][1]]++;
    for (const id in R.alloc) if (out[id] == null) out[id] = R.alloc[id];
    return out;
  };

  /* ---------- Hinweise und Auffälligkeiten im Monatsbericht ---------- */
  C.insights = function (st, comp, M) {
    const R = comp.months[M], P = comp.months[C.addM(M, -1)], out = []; if (!R) return out;
    const name = id => (st.cats.find(c => c.id === id) || { name: 'Ohne Kategorie' }).name;
    const pct = (a, b) => Math.round(a * 100 / b);
    if (R.income > 0 && R.fixed > 0) out.push({ t: 'fact', text: 'Deine Fixkosten machen ' + pct(R.fixed, R.income) + NB + '% deiner Einnahmen aus (' + C.fmt(R.fixed) + ' von ' + C.fmt(R.income) + ').' });
    if (R.income > 0 && R.covered > 0) out.push({ t: 'good', text: 'Du hast ' + C.fmt(R.covered) + ' zurückgelegt. Das sind ' + pct(R.covered, R.income) + NB + '% deiner Einnahmen.' });
    const cats = Object.keys(R.byCat).map(id => ({ id: id, v: R.byCat[id].spent })).filter(c => c.v > 0).sort((a, b) => b.v - a.v);
    if (cats.length && R.variable > 0) out.push({ t: 'fact', text: 'Größter Posten bei den variablen Ausgaben: ' + name(cats[0].id) + ' mit ' + C.fmt(cats[0].v) + ' (' + pct(cats[0].v, R.variable) + NB + '%).' });
    for (const b of C.budgets(st, comp, M)) if (b.over) out.push({ t: 'warn', text: b.name + ': Budget um ' + C.fmt(-b.rest) + ' überschritten (' + C.fmt(b.spent) + ' statt ' + C.fmt(b.budget) + ').' });
    if (P) {
      const ups = [], downs = [];
      for (const c of cats) { const pv = Math.max(0, (P.byCat[c.id] || { spent: 0 }).spent), d = c.v - pv; if (d >= 2000 && (pv === 0 || d * 5 >= pv)) ups.push({ id: c.id, d: d, pv: pv, v: c.v }); }
      for (const id in P.byCat) { const pv = P.byCat[id].spent, v = Math.max(0, (R.byCat[id] || { spent: 0 }).spent); if (pv - v >= 2000) downs.push({ id: id, d: pv - v, pv: pv, v: v }); }
      ups.sort((a, b) => b.d - a.d); downs.sort((a, b) => b.d - a.d);
      for (const u of ups.slice(0, 3)) out.push({ t: 'warn', text: name(u.id) + ': ' + C.fmt(u.d) + ' mehr als im Vormonat (' + C.fmt(u.pv) + ' → ' + C.fmt(u.v) + ').' });
      if (downs.length) out.push({ t: 'good', text: name(downs[0].id) + ': ' + C.fmt(downs[0].d) + ' weniger als im Vormonat (' + C.fmt(downs[0].pv) + ' → ' + C.fmt(downs[0].v) + ').' });
      // Vorschlag für ein Limit: Kategorie ohne Budget, die über dem Schnitt der Vormonate liegt
      for (const c of cats) {
        const co = st.cats.find(x => x.id === c.id); if (!co || C.amtAt(co.budget, M)) continue;
        let sum = 0, n = 0; for (let j = 1; j <= 3; j++) { const Q = comp.months[C.addM(M, -j)]; if (Q) { sum += Math.max(0, (Q.byCat[c.id] || { spent: 0 }).spent); n++; } }
        if (n >= 2 && sum > 0) { const avg = Math.round(sum / n); if (c.v - avg >= 2000) { out.push({ t: 'tip', text: 'Für ' + co.name + ' hast du ' + C.fmt(c.v) + ' ausgegeben, im Schnitt der ' + n + ' Vormonate waren es ' + C.fmt(avg) + '. Ein Monatslimit von ' + C.fmt0(Math.ceil(avg / 1000) * 1000) + ' würde dich früher warnen.' }); break; } }
      }
    } else out.push({ t: 'info', text: 'Vergleiche mit dem Vormonat gibt es ab dem zweiten erfassten Monat.' });
    let wants = 0; for (const c of cats) { const co = st.cats.find(x => x.id === c.id); if (co && !co.need) wants += c.v; }
    if (wants >= 5000) { const x = Math.round(wants / 10); out.push({ t: 'tip', text: 'Deine nicht notwendigen Ausgaben lagen bei ' + C.fmt(wants) + '. 10' + NB + '% weniger wären ' + C.fmt(x) + ' im Monat und ' + C.fmt(x * 12) + ' im Jahr.' }); }
    return out;
  };
  C.outliers = function (st, comp, M) {
    const hist = {}; let months = 0;
    for (let j = 1; j <= 3; j++) if (comp.months[C.addM(M, -j)]) months++;
    const lo = C.addM(M, -3);
    for (const t of st.tx) { const m = C.monthOf(t.d); if (t.t === 'exp' && m >= lo && m < M) (hist[t.cat || '_'] = hist[t.cat || '_'] || []).push(t.a); }
    const out = [];
    for (const t of st.tx) {
      if (t.t !== 'exp' || C.monthOf(t.d) !== M) continue;
      const h = hist[t.cat || '_']; if (!h || h.length < 5) continue;
      const s = h.slice().sort((a, b) => a - b), med = s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
      if (t.a >= 5000 && t.a * 2 >= med * 5) out.push({ tx: t, median: med, factor: Math.round(t.a * 10 / med) / 10 });
    }
    out.sort((a, b) => b.tx.a - a.tx.a);
    return { enough: months >= 1, list: out.slice(0, 5) };
  };

  /* ---------- Jahresübersicht ---------- */
  C.year = function (comp, Y) {
    const rows = [], tot = { income: 0, fixed: 0, variable: 0, potSpent: 0, saved: 0, result: 0, netChange: 0 };
    for (let m = 1; m <= 12; m++) {
      const R = comp.months[Y + '-' + pad(m)]; if (!R || R.key > comp.cur) continue;
      rows.push(R); for (const k in tot) tot[k] += R[k];
    }
    return { rows: rows, tot: tot };
  };

  /* ---------- CSV-Export (für Excel, österreichisches Format) ---------- */
  C.csv = function (st, comp) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', rows = [];
    const cn = id => (st.cats.find(c => c.id === id) || { name: '' }).name, pn = id => (st.pots.find(p => p.id === id) || { name: '' }).name;
    const n = c => C.num(c).replace(/\./g, '').replace('−', '-');
    const safe = v => (/^[=+\-@\t\r]/.test(String(v || '')) ? "'" + v : v || '');   // Text nie als Excel-Formel deuten lassen
    for (const k of comp.order) {
      if (k > comp.cur) break; const R = comp.months[k];
      for (const it of R.incItems) if (it.counted) rows.push([C.dateStr(it.shift ? C.addM(k, -1) : k, it.day), k, 'Regelmäßige Einnahme', it.name, '', n(it.amount), '', '', '']);
      for (const it of R.fixItems) if (it.charge) rows.push([C.dateStr(k, it.day || 1), k, 'Fixkosten', it.name, '', n(-it.charge), '', '', it.spread ? 'monatliche Rücklage' : '']);
      for (const id in R.alloc) if (R.alloc[id]) rows.push([C.dateStr(k, 1), k, 'Sparen', pn(id), '', n(-R.alloc[id]), '', pn(id), 'monatliche Zuweisung']);
    }
    for (const t of st.tx) rows.push([t.d, C.monthOf(t.d), t.t === 'exp' ? 'Ausgabe' : (C.IKINDS[t.ik] || 'Einnahme'), safe(t.name), cn(t.cat), n(t.t === 'exp' ? -t.a : t.a), C.PAYS[t.pay || ''] === '–' ? '' : C.PAYS[t.pay], pn(t.pot), safe(t.note)]);
    for (const m of st.moves) rows.push([m.d, C.monthOf(m.d), 'Umbuchung', (m.from === 'free' ? 'Freies Geld' : pn(m.from)) + ' → ' + (m.to === 'free' ? 'Freies Geld' : pn(m.to)), '', n(m.from === 'free' ? -m.a : m.to === 'free' ? m.a : 0), '', '', m.note || '']);
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const head = ['Datum', 'Monat', 'Art', 'Bezeichnung', 'Kategorie', 'Betrag', 'Zahlungsart', 'Sparbereich', 'Notiz'];
    return '﻿' + [head].concat(rows.map(r => [C.fmtDate(r[0])].concat(r.slice(1)))).map(r => r.map(q).join(';')).join('\r\n');
  };

  /* ---------- Beispieldaten (für die Vorschau) ---------- */
  C.demo = function (today) {
    const cur = C.monthOf(today), m0 = C.addM(cur, -2), st = C.newState(m0 + '-01', 42000);
    st.meta.demo = true; st.meta.setup = true; st.meta.created = today;
    const cid = n => st.cats.find(c => c.name === n).id;
    const rec = (kind, name, amount, day, o) => st.rec.push(Object.assign({ id: C.id(), kind: kind, name: name, day: day, interval: 1, anchor: m0, end: null, versions: [{ from: m0, amount: amount }] }, o || {}));
    rec('inc', 'Gehalt', 300000, 1);
    rec('fix', 'Miete', 80000, 5); rec('fix', 'Strom', 7000, 10); rec('fix', 'Internet', 3500, 12); rec('fix', 'Handy', 2500, 15);
    rec('fix', 'Versicherung', 12000, 3); rec('fix', 'Fitnessstudio', 4000, 20);
    rec('fix', 'Kfz-Versicherung', 60000, 15, { interval: 12, anchor: C.addM(cur, 4), spread: true });
    st.cats.find(c => c.name === 'Lebensmittel').budget = [{ from: m0, amount: 32000 }];
    st.cats.find(c => c.name === 'Restaurant & Ausgehen').budget = [{ from: m0, amount: 12000 }];
    st.cats.find(c => c.name === 'Shopping').budget = [{ from: m0, amount: 12000 }];
    st.cats.find(c => c.name === 'Auto & Tanken').budget = [{ from: m0, amount: 16000 }];
    const pot = (name, plan, target, opening, desc) => { const p = { id: C.id(), name: name, desc: desc || '', target: target, opening: opening, since: m0, plan: [{ from: m0, amount: plan }], arch: false }; st.pots.push(p); return p; };
    const urlaub = pot('Urlaub', 20000, 200000, 40000, 'Sommerurlaub am Meer'), beauty = pot('Beauty', 10000, 0, 0), hobby = pot('Hobbys', 10000, 60000, 0), wunsch = pot('Sonstige Wünsche', 10000, 0, 0);
    st.set.goal = [{ from: m0, amount: 50000 }];
    const day = C.dayOf(today);
    const tx = (m, d, name, a, c, o) => { if (m === cur && d > day) return; st.tx.push(Object.assign({ id: C.id(), t: 'exp', a: a, d: C.dateStr(m, d), name: name, cat: cid(c), pot: null, pay: 'karte', ik: '', note: '' }, o || {})); };
    const plan = [[2, 'Billa Einkauf', 8500, 'Lebensmittel'], [4, 'Tanken', 7000, 'Auto & Tanken'], [6, 'Spar', 4230, 'Lebensmittel'], [7, 'Restaurant', 4500, 'Restaurant & Ausgehen'], [9, 'Hofer', 6190, 'Lebensmittel'],
      [11, 'Amazon', 3500, 'Shopping'], [13, 'Billa Einkauf', 7340, 'Lebensmittel'], [15, 'Apotheke', 1890, 'Gesundheit'], [17, 'Kino', 2400, 'Freizeit & Hobbys'], [19, 'Tanken', 6800, 'Auto & Tanken'],
      [21, 'Spar', 5560, 'Lebensmittel'], [23, 'Pizzeria', 3800, 'Restaurant & Ausgehen'], [25, 'Hofer', 4920, 'Lebensmittel'], [27, 'H&M', 4990, 'Kleidung']];
    [m0, C.addM(cur, -1), cur].forEach((m, idx) => {
      for (const p of plan) tx(m, p[0], p[1], p[2] + idx * 130 * (p[0] % 3), p[3]);
      if (idx === 0) tx(m, 18, 'Friseur', 5500, 'Beauty', { pot: beauty.id });
      if (idx === 1) { tx(m, 8, 'Zalando', 8900, 'Shopping'); tx(m, 22, 'Geburtstagsessen', 9600, 'Restaurant & Ausgehen'); }
      if (idx === 2) { tx(m, 3, 'Kosmetik', 6000, 'Beauty', { pot: beauty.id }); tx(m, 5, 'Geburtstagsgeld von Oma', 10000, 'Sonstiges', { t: 'inc', ik: 'geschenk', cat: null, pay: '' }); tx(m, 8, 'Amazon Retoure', 3500, 'Shopping', { t: 'inc', ik: 'refund', pay: '' }); }
    });
    st.moves.push({ id: C.id(), d: C.dateStr(C.addM(cur, -1), 28), from: wunsch.id, to: hobby.id, a: 5000, note: 'Für neue Laufschuhe' });
    return st;
  };

  root.Core = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
