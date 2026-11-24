/* ═══════════════════════════════════════════════════════════
   ค่าล่วงเวลาคนขับ: คำนวณจากเวลากดออกเดินทาง/กลับถึง · แอดมินปรับรายวันได้ (คนขับดูได้อย่างเดียว)
   · เวรวันอาทิตย์ · สถิติ · PDF ส่งเบิกการเงิน (หน้าสรุป + หน้าละ 1 คน)
   กติกา (ตกลงกับงานยานพาหนะ 24 พ.ย. 2569):
   - จ.–ศ. และอาทิตย์: ช่วงเช้า 00.00–05.00 (นับจากเวลากดออกถึง 05.00) หรือช่วงเย็นหลัง 16.30 (นับ 16.30 ถึงเวลากดกลับถึง)
     ได้ช่วงเดียวต่อวัน (ช่วงที่ได้มากกว่า) · ชม.ละ 50 บาท · ไม่เกิน 3 ชม./วัน (รวมทุกเที่ยว) = 150 บาท
     เศษชั่วโมง ตั้งแต่ 40 นาทีปัดขึ้น ต่ำกว่าปัดลง
   - เสาร์: ขับรถวันนั้น เหมา 200 บาท
   - งานฉุกเฉินนำส่งผู้ป่วย (ทุกวัน รวมวันเสาร์): ออกตั้งแต่ 18.00 (ถึง 05.00) เหมา 150 บาท · ออกก่อน 18.00 นับตั้งแต่ 18.00 ถึงเวลากลับถึง
     ไม่เกิน 3 ชม. (กลับก่อน 18.00 = 0) · วันที่มีทั้งงานปกติและงานฉุกเฉิน ใช้ฝั่งที่ได้มากกว่า (ไม่รวมกัน)
   - งานค้างคืน/หลายวัน: ไม่คิด (เจ้าของงานเบิกเบี้ยเลี้ยงคนขับเอง) · ไม่มีวันหยุดนักขัตฤกษ์พิเศษ
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, $, $$ } = UI;
  const S = Store;
  const RATE = 50, CAP_H = 3, SAT_FLAT = 200, MED_NIGHT = 150;
  const MORN_END = 5 * 60, EVE_START = 16 * 60 + 30, MED_NIGHT_FROM = 18 * 60, MED_EVE_START = 18 * 60;
  const WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const ROSTER_ANCHOR = '2026-11-29';   // วันอาทิตย์ตั้งต้น (ใช้เมื่อแอดมินยังไม่ได้ตั้งเวร)
  const dayStart = date => new Date(date + 'T00:00:00');
  const minOfDay = d => d.getHours() * 60 + d.getMinutes();
  const hoursOf = m => Math.floor(m / 60) + (m % 60 >= 40 ? 1 : 0);
  const hm = m => `${Math.floor(m / 60)} ชม. ${m % 60} นาที`;
  const money = n => (+n || 0).toLocaleString('th-TH');
  const isMedNight = t => t.med && (minOfDay(t.dep) >= MED_NIGHT_FROM || minOfDay(t.dep) < MORN_END);
  // รวมช่วงเวลาที่ซ้อนกัน (หลายเที่ยวในวันเดียว ไม่นับซ้ำ) → นาที
  const unionMin = iv => {
    const xs = iv.filter(x => x[1] > x[0]).sort((a, b) => a[0] - b[0]);
    let tot = 0, cs = null, ce = null;
    xs.forEach(([s, e]) => { if (cs === null || s > ce) { if (cs !== null) tot += ce - cs; cs = s; ce = e; } else ce = Math.max(ce, e); });
    if (cs !== null) tot += ce - cs;
    return Math.floor(tot / 6e4);
  };

  // ── เที่ยวที่คนขับกลับถึงแล้ว (นับตามวันที่กดออกเดินทาง) ──
  function tripsOf(driverId) {
    const out = [];
    S.db.requests.forEach(r => {
      if (['cancelled', 'rejected'].includes(r.status)) return;
      (r.assignments || []).forEach((a, i) => {
        if (a.driverId !== driverId || !a.departedAt || !a.returnedAt) return;
        const dep = new Date(a.departedAt), ret = new Date(a.returnedAt);
        const multi = !r.medical && fmt.localDate(r.startAt) !== fmt.localDate(r.endAt);   // งานค้างคืน/หลายวัน → ไม่คิด
        out.push({ r, a, i, dep, ret, multi, med: !!r.medical, day: fmt.localDate(dep) });
      });
    });
    return out.sort((x, y) => x.dep - y.dep);
  }
  // ── คำนวณ 1 วัน ──
  function calcDay(date, trips) {
    const d = dayStart(date), wd = d.getDay();
    const use = trips.filter(t => !t.multi);
    const base = { date, wd, trips, skipped: trips.filter(t => t.multi), morning: 0, evening: 0, medEve: 0, basis: '', mins: 0, hours: 0, amount: 0 };
    if (!use.length) return base;
    const t0 = d.getTime(), norm = use.filter(t => !t.med), med = use.filter(t => t.med);
    // ฝั่งงานปกติ: เสาร์เหมา 200 · วันอื่น ช่วงเช้า (ออก→05.00) หรือช่วงเย็น (16.30→กลับถึง) ช่วงที่มากกว่า
    let N = { amount: 0, basis: '', mins: 0, hours: 0, morning: 0, evening: 0 };
    if (norm.length && wd === 6) N = { ...N, amount: SAT_FLAT, basis: 'sat' };
    else if (norm.length) {
      const evening = unionMin(norm.map(t => [Math.max(t.dep.getTime(), t0 + EVE_START * 6e4), t.ret.getTime()]));
      const morning = unionMin(norm.map(t => [t.dep.getTime(), Math.min(t.ret.getTime(), t0 + MORN_END * 6e4)]));
      const mins = Math.max(evening, morning), hours = Math.min(CAP_H, hoursOf(mins));
      N = { amount: hours * RATE, basis: !mins ? '' : evening >= morning ? 'evening' : 'morning', mins, hours, morning, evening };
    }
    // ฝั่งงานฉุกเฉิน (ทุกวัน): ออกตั้งแต่ 18.00–05.00 เหมา 150 · ออกก่อน 18.00 นับจาก 18.00 ถึงกลับถึง
    let M = { amount: 0, basis: '', mins: 0, hours: 0, medEve: 0 };
    if (med.length) {
      const medEve = unionMin(med.filter(t => !isMedNight(t)).map(t => [Math.max(t.dep.getTime(), t0 + MED_EVE_START * 6e4), t.ret.getTime()]));
      const hours = Math.min(CAP_H, hoursOf(medEve));
      M = med.some(isMedNight) ? { amount: MED_NIGHT, basis: 'mednight', mins: 0, hours: 0, medEve } : { amount: hours * RATE, basis: medEve ? 'medevening' : '', mins: medEve, hours, medEve };
    }
    const W = M.amount > N.amount ? M : N;
    return { ...base, morning: N.morning, evening: N.evening, medEve: M.medEve, mins: W.mins, basis: W.basis, hours: W.hours, amount: W.basis === 'sat' ? SAT_FLAT : Math.min(W.amount, CAP_H * RATE) };
  }
  // ── รายวันของคนขับในช่วงเวลา (รวมรายการที่แอดมินปรับ/เพิ่มเอง) ──
  function daysOf(driverId, from, to) {
    const f = fmt.localDate(from), t = fmt.localDate(to), by = new Map();
    tripsOf(driverId).forEach(x => { if (x.day < f || x.day > t) return; if (!by.has(x.day)) by.set(x.day, []); by.get(x.day).push(x); });
    (S.db.ot || []).forEach(o => { if (o.driverId === driverId && o.date >= f && o.date <= t && !by.has(o.date)) by.set(o.date, []); });
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, trips]) => {
      const c = calcDay(date, trips), ov = (S.db.ot || []).find(o => o.id === `${driverId}_${date}`);
      return ov ? { ...c, auto: { hours: c.hours, amount: c.amount }, hours: +ov.hours || 0, amount: +ov.amount || 0, ov } : c;
    }).filter(x => x.amount > 0 || x.ov);
  }
  const sumOf = days => ({
    days: days.filter(x => x.amount > 0).length, hours: days.reduce((s, x) => s + (+x.hours || 0), 0), amount: days.reduce((s, x) => s + (+x.amount || 0), 0),
    sat: days.filter(x => x.basis === 'sat' && !x.ov).length, med: days.filter(x => x.basis === 'mednight' && !x.ov).length, ov: days.filter(x => x.ov).length
  });
  const basisText = x => {
    if (x.ov) return `แอดมินปรับ${x.ov.note ? `: ${x.ov.note}` : ''}`;
    if (x.basis === 'sat') return 'วันเสาร์ เหมาจ่าย';
    if (x.basis === 'mednight') return 'งานฉุกเฉินออกหลัง 18.00 เหมาจ่าย';
    if (x.basis === 'medevening') return `งานฉุกเฉิน หลัง 18.00 · ${hm(x.medEve)}`;
    if (x.basis === 'evening') return `ช่วงเย็น หลัง 16.30 · ${hm(x.evening)}`;
    if (x.basis === 'morning') return `ช่วงเช้า ก่อน 05.00 · ${hm(x.morning)}`;
    return '';
  };
  const tripText = t => `${t.r.id} · ${S.destName(t.r)} · ${fmt.time(t.dep)}–${fmt.dayMonth(t.dep) === fmt.dayMonth(t.ret) ? fmt.time(t.ret) : fmt.dayMonth(t.ret) + ' ' + fmt.time(t.ret)}${t.med ? ' · ฉุกเฉิน' : ''}`;
  const dLabel = date => { const d = dayStart(date); return `${WD[d.getDay()].replace('พฤหัสบดี', 'พฤหัสฯ')} ${fmt.date(d)}`; };

  // ── เวรวันอาทิตย์ ──
  const nextSunday = from => { const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return d; };
  function roster() {
    const R = S.db.settings.dutyRoster;
    if (R && (R.order || []).length) return { order: R.order, start: R.start || ROSTER_ANCHOR, swaps: R.swaps || {} };
    const order = ['สวง', 'บุญทัน', 'พัลลภ'].map(n => (S.db.drivers.find(d => !d.standby && d.active !== false && (d.name || '').includes(n)) || {}).id).filter(Boolean);
    return { order, start: ROSTER_ANCHOR, swaps: {} };
  }
  function dutyOf(date, R = roster()) {
    if (R.swaps && R.swaps[date]) return R.swaps[date];
    if (!R.order.length) return '';
    const wk = Math.round((dayStart(date) - dayStart(R.start)) / (7 * 864e5)), n = R.order.length;
    return R.order[((wk % n) + n) % n];
  }
  const sundays = (from, n) => Array.from({ length: n }, (_, i) => { const d = nextSunday(from); d.setDate(d.getDate() + i * 7); return fmt.localDate(d); });
  Pages._dutyOf = dutyOf;

  function rosterModal() {
    const R = roster(), ds = S.db.drivers.filter(d => d.active !== false && !d.standby);
    const opt = (sel, blank) => `${blank ? `<option value="">${blank}</option>` : ''}${ds.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}`;
    const list = sundays(new Date(), 12);
    return UI.modal({
      title: `${icon('calendar')} ตารางเวรวันอาทิตย์`, size: 'lg',
      body: `<form id="rsF" class="stack">
        <p class="hint">วันอาทิตย์มีเวรมาทำงาน 1 คน หมุนเวียนตามลำดับด้านล่าง · ถ้าบางสัปดาห์สลับเวร เลือกชื่อในตารางได้ (ว่าง = ตามลำดับ)</p>
        <div class="field"><label>ลำดับเวร</label><div class="stack rs-order" style="gap:6px">${[0, 1, 2, 3, 4].map(i => `<div class="row" style="gap:8px"><b style="width:22px">${i + 1}.</b><select class="input" name="o${i}">${opt(R.order[i], i < 1 ? '' : '— ไม่มี —')}</select></div>`).join('')}</div></div>
        <div class="field"><label>วันอาทิตย์ที่คนลำดับ 1 เข้าเวร</label><input type="date" name="start" value="${esc(R.start)}"></div>
        <div class="field"><label>12 สัปดาห์ข้างหน้า</label><div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>วันอาทิตย์</th><th>ตามลำดับ</th><th>สลับเวร</th></tr></thead>
          <tbody>${list.map(s => `<tr><td class="nw">${fmt.date(dayStart(s))}</td><td>${esc(C.dName(dutyOf(s, { ...R, swaps: {} })))}</td><td><select class="input" data-sw="${s}">${opt((R.swaps || {})[s], '— ตามลำดับ —')}</select></td></tr>`).join('')}</tbody></table></div></div>
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึกตารางเวร', kind: 'btn-primary', icon: 'check', onClick: async el => {
        const f = UI.formData(el.querySelector('#rsF'));
        const order = [0, 1, 2, 3, 4].map(i => f['o' + i]).filter(Boolean);
        if (!order.length) { UI.toast('เลือกคนเข้าเวรอย่างน้อย 1 คน', 'error'); return false; }
        if (!f.start || dayStart(f.start).getDay() !== 0) { UI.toast('วันเริ่มต้องเป็นวันอาทิตย์', 'error'); return false; }
        const swaps = {}; Object.entries(R.swaps || {}).forEach(([k, v]) => { if (k < fmt.localDate(new Date())) swaps[k] = v; });   // เก็บการสลับเวรในอดีตไว้
        $$('[data-sw]', el).forEach(s => { if (s.value) swaps[s.dataset.sw] = s.value; });
        await S.saveRoster({ order, start: f.start, swaps });
        UI.toast('บันทึกตารางเวรแล้ว'); return true;
      } }]
    });
  }

  // ── แอดมินปรับ/เพิ่มรายการรายวัน ──
  async function editModal({ driverId = '', date = '' } = {}) {
    const manual = !driverId || !date;
    const ds = S.db.drivers.filter(d => d.active !== false);
    const day = !manual ? (daysOf(driverId, dayStart(date), new Date(dayStart(date).getTime() + 864e5 - 1))[0] || calcDay(date, tripsOf(driverId).filter(t => t.day === date))) : null;
    const auto = day ? (day.auto || { hours: day.hours, amount: day.amount }) : { hours: 0, amount: 0 };
    const res = await UI.modal({
      title: `${icon('edit')} ${manual ? 'เพิ่มรายการค่าล่วงเวลา' : `ค่าล่วงเวลา · ${esc(C.dName(driverId))}`}`, size: 'lg',
      body: `<form id="otF" class="stack">
        ${manual ? `<div class="grid2"><div class="field"><label>คนขับ <b class="req">*</b></label><select name="driverId"><option value="">— เลือก —</option>${ds.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
          <div class="field"><label>วันที่ <b class="req">*</b></label><input type="date" name="date"></div></div>` : `<div class="note-box navy">${icon('clock')}<div><b>${dLabel(date)}</b><br>${day.trips.length ? day.trips.map(t => esc(tripText(t))).join('<br>') : 'ไม่มีเที่ยวในระบบ (รายการที่แอดมินเพิ่มเอง)'}<br><small>ระบบคำนวณ: ${auto.hours ? auto.hours + ' ชม. · ' : ''}${money(auto.amount)} บาท${day.basis ? ` (${esc(basisText({ ...day, ov: null }))})` : ''}</small></div></div>`}
        <div class="grid2">
          <div class="field"><label>ชั่วโมง</label><input type="number" name="hours" min="0" max="24" step="1" value="${day && day.ov ? day.ov.hours : auto.hours}"></div>
          <div class="field"><label>จำนวนเงิน (บาท) <b class="req">*</b></label><input type="number" name="amount" min="0" step="1" value="${day && day.ov ? day.ov.amount : auto.amount}"><span class="hint">ใส่ชั่วโมงแล้วระบบคิด ${RATE} บาท/ชม. ให้ (ไม่เกิน ${CAP_H} ชม.) · แก้ยอดเองได้</span></div>
          <div class="field full"><label>เหตุผล / หมายเหตุ <b class="req">*</b></label><input name="note" value="${esc(day && day.ov ? day.ov.note : '')}" placeholder="เช่น กดกลับถึงช้า ตรวจสอบแล้วกลับจริง 18.10 น."></div>
        </div>
      </form>`,
      onOpen(el) { const f = el.querySelector('#otF'); f.hours.addEventListener('input', () => { f.amount.value = Math.min(CAP_H, Math.max(0, +f.hours.value || 0)) * RATE; }); },
      actions: [
        ...(day && day.ov ? [{ label: 'ใช้ค่าที่ระบบคำนวณ', kind: 'btn-ghost', icon: 'undo', onClick: async () => { await S.deleteOt(day.ov.id); return 'reset'; } }] : []),
        { label: 'ยกเลิก', value: null },
        { label: 'บันทึก', kind: 'btn-primary', icon: 'check', onClick: async el => {
          const f = UI.formData(el.querySelector('#otF'));
          const dId = manual ? f.driverId : driverId, dt = manual ? f.date : date;
          if (!dId || !dt) { UI.toast('กรุณาเลือกคนขับและวันที่', 'error'); return false; }
          if (!String(f.note || '').trim()) { UI.toast('กรุณาระบุเหตุผล', 'error'); return false; }
          await S.saveOt({ driverId: dId, date: dt, hours: f.hours, amount: f.amount, note: f.note });
          return 'saved';
        } }]
    });
    if (res) { UI.toast(res === 'reset' ? 'กลับไปใช้ค่าที่ระบบคำนวณแล้ว' : 'บันทึกแล้ว'); App.render(); }
  }

  // ── PDF ส่งเบิกการเงิน: หน้าสรุป + หน้าละ 1 คน ──
  const monthsIn = (from, to) => { const out = [], d = new Date(from.getFullYear(), from.getMonth(), 1), end = new Date(Math.min(to, new Date())); while (d <= end && out.length < 36) { out.push(new Date(d)); d.setMonth(d.getMonth() + 1); } return out.reverse(); };
  const monthName = d => d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  async function claimDialog(per, { dl = false } = {}) {
    const ms = monthsIn(per.k === 'all' ? new Date(2025, 0, 1) : per.from, per.to);
    if (!ms.length) return UI.toast('ไม่มีเดือนในช่วงที่เลือก', 'error');
    const opt = await UI.modal({
      title: `${icon(dl ? 'download' : 'printer')} เอกสารส่งเบิกค่าล่วงเวลา`, size: 'lg',
      body: `<form id="clF" class="stack"><div class="field"><label>ประจำเดือน</label><select name="m">${ms.map(m => `<option value="${fmt.localDate(m)}">${monthName(m)}</option>`).join('')}</select></div>
        <p class="hint">หน้าแรกสรุปยอดทุกคน · ต่อด้วยรายละเอียดหน้าละ 1 คน · ช่องลงชื่อผู้ขอเบิก (คนขับ) และหัวหน้างานยานพาหนะ (ใส่ลายเซ็นอิเล็กทรอนิกส์ให้ ถ้าตั้งผู้ลงนามไว้ในหน้าตั้งค่า)</p></form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'พิมพ์', kind: dl ? 'btn-ghost' : 'btn-primary', icon: 'printer', onClick: el => ({ m: UI.formData(el.querySelector('#clF')).m, mode: 'print' }) },
        { label: 'ดาวน์โหลด PDF', kind: dl ? 'btn-primary' : 'btn-ghost', icon: 'download', onClick: el => ({ m: UI.formData(el.querySelector('#clF')).m, mode: 'pdf' }) }]
    });
    if (!opt) return;
    const m0 = dayStart(opt.m), m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 0, 23, 59, 59);
    const st = S.db.settings, M = C.memoSettings(), headEmail = (st.memo || {}).headEmail || '';
    if (headEmail) await S.loadSignatures([headEmail]);
    const sig = headEmail ? S.sigOf(headEmail) : null;
    const rows = S.db.drivers.map(d => ({ d, days: daysOf(d.id, m0, m1) })).filter(x => x.days.some(y => y.amount > 0));
    const tot = rows.reduce((s, x) => s + sumOf(x.days).amount, 0);
    const mn = monthName(m0);
    const top = `<header class="pd-head"><img src="images/logo.png" alt=""><div><b>${esc(st.schoolName || '')}</b><span>${esc(st.division || '')} · ${esc(st.unit || 'งานยานพาหนะ')}</span></div></header>`;
    const headSign = `<div><p class="pd-line">${sig ? `<img class="ot-sig" src="${sig}" alt="">` : ''}ลงชื่อ ....................................</p><p>(${esc(M.headName || '....................................')})</p><p>${esc(M.headPos || 'หัวหน้างานยานพาหนะ')}</p></div>`;
    const summary = `<section class="ot-page">${top}
      <h1 class="pd-title">หลักฐานการเบิกค่าตอบแทนการปฏิบัติงานนอกเวลา (พนักงานขับรถ)</h1>
      <p class="pd-sub">ประจำเดือน${mn}</p>
      <table class="pd-tbl ot-tbl" data-fitw><thead><tr><th class="c">ที่</th><th class="nw">ชื่อ-สกุล</th><th class="r">จำนวนวัน</th><th class="r">ชั่วโมง</th><th class="r">วันเสาร์ (วัน)</th><th class="r">ฉุกเฉินหลัง 18.00 (ครั้ง)</th><th class="r nw">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody>${rows.length ? rows.map((x, i) => { const s = sumOf(x.days); return `<tr><td class="c">${i + 1}</td><td class="nw">${esc(x.d.name)}</td><td class="r">${s.days}</td><td class="r">${s.hours}</td><td class="r">${s.sat}</td><td class="r">${s.med}</td><td class="r nw">${money(s.amount)}</td></tr>`; }).join('') : '<tr><td colspan="7" class="c">ไม่มีค่าล่วงเวลาในเดือนนี้</td></tr>'}</tbody>
        <tfoot><tr><td colspan="6">รวมทั้งสิ้น</td><td class="r nw">${money(tot)}</td></tr></tfoot></table>
      <p class="pd-words">จำนวนเงินรวม ${money(tot)} บาท (${UI.bahtText(tot)})</p>
      <p class="ot-rule">หลักเกณฑ์: วันจันทร์–ศุกร์และวันอาทิตย์ ชั่วโมงละ ${RATE} บาท ไม่เกิน ${CAP_H} ชั่วโมงต่อวัน (ช่วง 00.00–05.00 หรือหลัง 16.30 อย่างใดอย่างหนึ่ง · เศษตั้งแต่ 40 นาทีนับเป็น 1 ชั่วโมง) · วันเสาร์เหมาจ่าย ${SAT_FLAT} บาท · งานฉุกเฉินนำส่งผู้ป่วย ออกหลัง 18.00 เหมาจ่าย ${MED_NIGHT} บาท ออกก่อน 18.00 นับตั้งแต่ 18.00 ไม่เกิน ${CAP_H} ชั่วโมง</p>
      <div class="pd-sign ot-sign"><div><p class="pd-line">ลงชื่อ ....................................</p><p>(${esc(S.me.name || '....................................')})</p><p>ผู้จัดทำ</p></div>${headSign}</div></section>`;
    const pages = rows.map(({ d, days }) => { const s = sumOf(days); return `<section class="ot-page ot-break">${top}
      <h1 class="pd-title">รายละเอียดการปฏิบัติงานนอกเวลา</h1>
      <p class="pd-sub"><b>${esc(d.name)}</b> · พนักงานขับรถ · ประจำเดือน${mn}</p>
      <table class="pd-tbl ot-tbl" data-fitw><thead><tr><th class="c">ที่</th><th class="nw">วันที่</th><th>งาน / สถานที่ · เวลาออก–กลับ</th><th>ช่วงที่คิด</th><th class="r">ชม.</th><th class="r nw">เงิน (บาท)</th></tr></thead>
        <tbody>${days.filter(x => x.amount > 0).map((x, i) => `<tr><td class="c">${i + 1}</td><td class="nw">${dLabel(x.date)}</td><td class="wr">${x.trips.length ? x.trips.map(t => esc(tripText(t))).join('<br>') : '-'}</td><td class="wr">${esc(basisText(x))}</td><td class="r">${x.hours || '-'}</td><td class="r nw">${money(x.amount)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4">รวม ${s.days} วัน</td><td class="r">${s.hours}</td><td class="r nw">${money(s.amount)}</td></tr></tfoot></table>
      <p class="pd-words">จำนวนเงิน ${money(s.amount)} บาท (${UI.bahtText(s.amount)})</p>
      <div class="pd-sign ot-sign"><div><p class="pd-line">ลงชื่อ ....................................</p><p>(${esc(d.name)})</p><p>ผู้ขอเบิก</p></div>${headSign}</div></section>`; }).join('');
    const html = `<div class="pd-fs pd-fs-m">${summary}${pages}</div>`;
    const po = { title: `ค่าล่วงเวลาพนักงานขับรถ ${fmt.localDate(m0).slice(0, 7)}`, fitWidth: '186mm' };
    if (opt.mode === 'pdf') await UI.savePdf(html, po); else UI.printDoc(html, { ...po, footLeft: po.title });
  }

  // ═════════ หน้าแอดมิน: ค่าน้ำมัน / ค่าใช้จ่าย → แถบ "ค่าล่วงเวลา" ═════════
  Pages._otAdmin = ({ query }) => {
    const A = Pages._adm, q = { p: 'month', ...query, view: 'ot' }, per = A.periodOf(q);
    const hist = S.needHistory(per.from);
    const from = per.k === 'all' ? new Date(2020, 0, 1) : per.from, to = per.to > new Date(2900, 0) ? new Date() : per.to;
    const od = query.od || '';
    const all = S.db.drivers.map(d => ({ d, days: daysOf(d.id, from, to) })).filter(x => x.days.length || (x.d.active !== false && !x.d.standby));
    const sums = all.map(x => ({ ...x, s: sumOf(x.days) }));
    const T = sums.reduce((t, x) => ({ amount: t.amount + x.s.amount, hours: t.hours + x.s.hours, days: t.days + x.s.days, sat: t.sat + x.s.sat, med: t.med + x.s.med }), { amount: 0, hours: 0, days: 0, sat: 0, med: 0 });
    const qs = o => '#/admin/expenses?' + new URLSearchParams({ ...q, ...o });
    const list = sums.filter(x => !od || x.d.id === od);
    const R = roster(), next = sundays(new Date(), 6);
    // รายเดือน (ช่วงยาวกว่า 1 เดือน)
    const ms = monthsIn(from, to).reverse();
    const byMonth = ms.length > 1 ? ms.map(m => { const m1 = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59); return { m, v: S.db.drivers.map(d => sumOf(daysOf(d.id, m, m1)).amount) }; }) : [];
    return {
      layout: 'admin',
      html: `${A.head('รายงาน', 'ค่าน้ำมัน / ค่าใช้จ่าย', per.label, `<button class="btn btn-primary btn-sm" id="otPdf">${icon('download')} ดาวน์โหลด PDF ส่งเบิก</button><button class="btn btn-ghost btn-sm" id="otPrint">${icon('printer')} พิมพ์</button><button class="btn btn-ghost btn-sm" id="otRoster">${icon('calendar')} เวรวันอาทิตย์</button>`)}
        ${A.periodBar('#/admin/expenses', per, q)}
        ${hist ? `<div class="note-box" style="margin-bottom:14px">${icon('clock')}<div>กำลังโหลดข้อมูลย้อนหลัง… ตัวเลขจะครบเมื่อโหลดเสร็จ</div></div>` : ''}
        <div class="toolbar"><div class="seg"><a href="${qs({ view: 'list' })}"><button tabindex="-1">${icon('clipboard')} รายการ</button></a><a href="${qs({ view: 'stats' })}"><button tabindex="-1">${icon('chart')} สรุปสถิติค่าน้ำมัน</button></a><a href="${qs({})}"><button class="on" tabindex="-1">${icon('clock')} ค่าล่วงเวลา</button></a></div></div>
        <details class="ot-rules"><summary>${icon('info')} หลักเกณฑ์การคิดค่าล่วงเวลา</summary><ul>
          <li>จันทร์–ศุกร์ และอาทิตย์: ช่วงเช้า <b>00.00–05.00</b> (นับจากเวลากดออกเดินทาง) หรือช่วงเย็น <b>หลัง 16.30</b> (นับถึงเวลากดกลับถึง) — ได้ช่วงเดียวต่อวัน (ช่วงที่มากกว่า)</li>
          <li>ชั่วโมงละ <b>${RATE} บาท</b> ไม่เกิน <b>${CAP_H} ชม./วัน</b> (${CAP_H * RATE} บาท) รวมทุกเที่ยว · เศษตั้งแต่ 40 นาทีปัดขึ้น ต่ำกว่าปัดลง</li>
          <li>วันเสาร์: ขับงานปกติวันนั้น เหมา <b>${SAT_FLAT} บาท</b></li>
          <li>งานฉุกเฉินนำส่งผู้ป่วย (ทุกวัน รวมวันเสาร์): ออกตั้งแต่ 18.00 เหมา <b>${MED_NIGHT} บาท</b> · ออกก่อน 18.00 นับตั้งแต่ <b>18.00</b> ถึงเวลากลับถึง ไม่เกิน ${CAP_H} ชม. (กลับก่อน 18.00 ไม่ได้) · วันที่มีทั้งงานปกติและงานฉุกเฉิน ใช้ฝั่งที่ได้มากกว่า</li>
          <li>งานค้างคืน/หลายวัน ไม่คิดค่าล่วงเวลา (เจ้าของงานเบิกเบี้ยเลี้ยงคนขับ) · แอดมินปรับ/เพิ่มรายการได้ คนขับดูได้อย่างเดียว</li></ul></details>
        <div class="kpis" style="margin-bottom:16px">
          <div class="kpi" style="--kb:var(--navy-50)"><span class="k-ic">${icon('coins')}</span><b class="num">${money(T.amount)}<em>฿</em></b><span class="l">ค่าล่วงเวลารวม</span></div>
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('clock')}</span><b class="num">${T.hours}<em>ชม.</em></b><span class="l">ชั่วโมงรวม · ${T.days} วัน</span></div>
          <div class="kpi" style="--kb:#ecfbf3;--kc:#047857"><span class="k-ic">${icon('calendar')}</span><b class="num">${T.sat}<em>วัน</em></b><span class="l">วันเสาร์ (เหมา ${SAT_FLAT})</span></div>
          <div class="kpi" style="--kb:#fff1f1;--kc:#b91c1c"><span class="k-ic">${icon('alert')}</span><b class="num">${T.med}<em>ครั้ง</em></b><span class="l">ฉุกเฉินหลัง 18.00</span></div>
        </div>
        <div class="split ot-split">
          <div class="card"><div class="card-head"><h3>${icon('users')} สรุปรายคน</h3></div><div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>คนขับ</th><th class="r">วัน</th><th class="r">ชม.</th><th class="r">เสาร์</th><th class="r">ฉุกเฉิน</th><th class="r">เงิน (฿)</th></tr></thead>
            <tbody>${sums.map(x => `<tr class="${od === x.d.id ? 'on' : ''}"><td class="nw"><a class="link" href="${qs({ od: od === x.d.id ? '' : x.d.id })}">${esc(x.d.name)}</a>${x.d.standby ? ' <small>(สำรอง)</small>' : ''}${x.d.dorm ? ' <span class="tag dorm-tag">หอพัก</span>' : ''}${x.s.ov ? `<small>ปรับ ${x.s.ov} วัน</small>` : ''}</td><td class="r">${x.s.days}</td><td class="r">${x.s.hours}</td><td class="r">${x.s.sat}</td><td class="r">${x.s.med}</td><td class="r"><b>${money(x.s.amount)}</b></td></tr>`).join('')}</tbody>
            <tfoot><tr><td>รวม</td><td class="r">${T.days}</td><td class="r">${T.hours}</td><td class="r">${T.sat}</td><td class="r">${T.med}</td><td class="r"><b>${money(T.amount)}</b></td></tr></tfoot></table></div></div>
          <div class="card"><div class="card-head"><h3>${icon('calendar')} เวรวันอาทิตย์</h3><button class="btn btn-ghost btn-xs" id="otRoster2">${icon('edit')} จัดเวร</button></div>
            ${R.order.length ? `<div class="stack" style="gap:6px">${next.map((s, i) => `<div class="ot-duty ${i === 0 ? 'next' : ''}"><span>${fmt.date(dayStart(s))}</span><b>${esc(C.dName(dutyOf(s, R)))}</b>${(R.swaps || {})[s] ? '<small>สลับเวร</small>' : ''}</div>`).join('')}</div>` : UI.empty('ยังไม่ได้ตั้งตารางเวร', 'calendar')}</div>
        </div>
        ${byMonth.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('chart')} รายเดือน (บาท)</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>เดือน</th>${S.db.drivers.map(d => `<th class="r">${esc(C.firstName(d.name))}</th>`).join('')}<th class="r">รวม</th></tr></thead>
          <tbody>${byMonth.map(x => `<tr><td class="nw">${monthName(x.m)}</td>${x.v.map(v => `<td class="r">${v ? money(v) : '-'}</td>`).join('')}<td class="r"><b>${money(x.v.reduce((a, b) => a + b, 0))}</b></td></tr>`).join('')}</tbody></table></div></div>` : ''}
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('list')} รายละเอียดรายวัน${od ? ` · ${esc(C.dName(od))}` : ''}</h3><div class="row" style="gap:6px">${od ? `<a class="btn btn-ghost btn-xs" href="${qs({ od: '' })}">ดูทุกคน</a>` : ''}<button class="btn btn-gold btn-xs" id="otAdd">${icon('plus')} เพิ่มรายการเอง</button></div></div>
          ${list.some(x => x.days.length) ? list.filter(x => x.days.length).map(x => `<div class="ot-dhead">${icon('wheel')} ${esc(x.d.name)} <small>${x.s.days} วัน · ${money(x.s.amount)} บาท</small></div>
            <div class="tbl-wrap"><table class="tbl ot-days" style="min-width:0"><thead><tr><th>วันที่</th><th>เที่ยว</th><th>ช่วงที่คิด</th><th class="r">ชม.</th><th class="r">เงิน</th><th></th></tr></thead>
            <tbody>${x.days.map(y => `<tr class="${y.ov ? 'is-ov' : ''}"><td class="nw">${dLabel(y.date)}</td><td>${y.trips.length ? y.trips.map(t => `<a class="link" href="#/admin/requests/${t.r.id}">${t.r.id}</a> <small>${esc(S.destName(t.r))} · ${fmt.time(t.dep)}–${fmt.time(t.ret)}${t.med ? ' · ฉุกเฉิน' : ''}${t.multi ? ' · ค้างคืน (ไม่คิด)' : ''}</small>`).join('<br>') : '<small>เพิ่มโดยแอดมิน</small>'}</td><td><small>${esc(basisText(y))}${y.ov && y.auto ? ` · ระบบคิด ${money(y.auto.amount)}` : ''}</small></td><td class="r">${y.hours || '-'}</td><td class="r"><b>${money(y.amount)}</b></td><td class="r"><button class="icon-btn sm" data-oted="${x.d.id}|${y.date}" aria-label="แก้ไข">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`).join('')
            : UI.empty('ไม่มีค่าล่วงเวลาในช่วงนี้', 'clock')}</div>`,
      mount(root) {
        A.bindPeriod(root, '#/admin/expenses', q);
        root.addEventListener('click', async e => {
          if (e.target.closest('#otPdf')) return claimDialog(per, { dl: true });
          if (e.target.closest('#otPrint')) return claimDialog(per);
          if (e.target.closest('#otRoster') || e.target.closest('#otRoster2')) { if (await rosterModal()) App.render(); return; }
          if (e.target.closest('#otAdd')) return editModal({});
          const ed = e.target.closest('[data-oted]'); if (ed) { const [dId, dt] = ed.dataset.oted.split('|'); return editModal({ driverId: dId, date: dt }); }
        });
      }
    };
  };

  // ═════════ หน้าคนขับ: แถบ "ค่าล่วงเวลา" (ดูได้อย่างเดียว) ═════════
  Pages._otDriver = (d, query, adminView) => {
    const now = new Date(), cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const m = query.om ? dayStart(query.om + '-01') : cur;
    const m1 = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
    const days = daysOf(d.id, m, m1), s = sumOf(days);
    const link = o => '#/driver?' + new URLSearchParams({ ...(adminView ? { d: d.id } : {}), tab: 'ot', ...o });
    const prev = new Date(m.getFullYear(), m.getMonth() - 1, 1), nxt = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    // คนขับเห็นข้อมูลย้อนหลังได้ประมาณ 1 เดือน (ตามข้อมูลที่โหลดมาในเครื่อง)
    const minM = adminView ? new Date(2020, 0, 1) : new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    const R = roster(), myDuty = sundays(now, 12).filter(x => dutyOf(x, R) === d.id).slice(0, 3);
    return `<div class="ot-drv">
      <div class="ot-mnav"><a class="icon-btn sm ${prev < minM ? 'disabled' : ''}" ${prev < minM ? 'aria-disabled="true"' : `href="${link({ om: fmt.localDate(prev).slice(0, 7) })}"`} aria-label="เดือนก่อน">${icon('chevL')}</a><b>${monthName(m)}</b><a class="icon-btn sm ${nxt > cur ? 'disabled' : ''}" ${nxt > cur ? 'aria-disabled="true"' : `href="${link({ om: fmt.localDate(nxt).slice(0, 7) })}"`} aria-label="เดือนถัดไป">${icon('chevR')}</a></div>
      <div class="ot-sum"><div class="ot-big"><small>ค่าล่วงเวลาเดือนนี้</small><b>${money(s.amount)}</b><span>บาท</span></div>
        <div class="ot-mini"><div><b>${s.days}</b><small>วัน</small></div><div><b>${s.hours}</b><small>ชั่วโมง</small></div><div><b>${s.sat}</b><small>วันเสาร์</small></div><div><b>${s.med}</b><small>ฉุกเฉินกลางคืน</small></div></div></div>
      ${myDuty.length ? `<div class="note-box navy" style="margin-top:12px">${icon('calendar')}<div>เวรวันอาทิตย์ของคุณ: <b>${myDuty.map(x => fmt.date(dayStart(x))).join(' · ')}</b></div></div>` : ''}
      <div class="ot-list">${days.length ? days.map(y => `<div class="ot-item ${y.ov ? 'is-ov' : ''}"><div class="ot-date"><b>${dayStart(y.date).getDate()}</b><small>${WD[y.wd]}</small></div>
          <div class="ot-body"><b>${esc(basisText(y))}</b>${y.trips.map(t => `<small>${esc(S.destName(t.r))} · ${fmt.time(t.dep)}–${fmt.time(t.ret)}${t.med ? ' · ฉุกเฉิน' : ''}</small>`).join('')}</div>
          <div class="ot-amt"><b>${money(y.amount)}</b><small>${y.hours ? y.hours + ' ชม.' : 'เหมา'}</small></div></div>`).join('')
        : UI.empty('ยังไม่มีค่าล่วงเวลาในเดือนนี้', 'clock')}</div>
      <p class="hint" style="margin-top:12px">${icon('info')} คำนวณจากเวลากด "ออกเดินทาง" และ "กลับถึง" · ช่วงเย็นหลัง 16.30 หรือช่วงเช้าก่อน 05.00 ชม.ละ ${RATE} บาท ไม่เกิน ${CAP_H} ชม./วัน · วันเสาร์เหมา ${SAT_FLAT} บาท · งานฉุกเฉิน ออกหลัง 18.00 เหมา ${MED_NIGHT} บาท ออกก่อน 18.00 นับตั้งแต่ 18.00 · ยอดสุดท้ายตามที่งานยานพาหนะตรวจสอบ</p>
    </div>`;
  };
  Pages._otCalc = { calcDay, daysOf, tripsOf, sumOf, hoursOf };
})();
