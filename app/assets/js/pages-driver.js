/* ═══════════════════════════════════════════════════════════
   หน้าพนักงานขับรถ (ออกแบบสำหรับมือถือ)
   งานของฉัน · กด ออกเดินทาง / กลับถึงแล้ว · เลขไมล์ · บันทึกเติมน้ำมัน
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, kindIcon, $ } = UI;
  const S = Store;

  // เลขไมล์ล่าสุดของรถ (ใช้เป็นค่าเริ่มต้น)
  function lastOdo(vehicleId) {
    let best = null;
    S.db.requests.forEach(r => (r.assignments || []).forEach(a => {
      if (a.vehicleId !== vehicleId) return;
      [a.odoEnd, a.odoStart].forEach(v => { if (v != null && (best == null || v > best)) best = v; });
    }));
    return best;
  }
  Pages._lastOdo = lastOdo;

  // ───────── ป๊อปอัปบันทึกค่าใช้จ่าย (ใช้ร่วมกับแอดมิน) ─────────
  Pages._expenseModal = (r, vehicleId, ex = null) => {
    const e = ex || { type: 'fuel', date: fmt.localDate(new Date()), pay: 'card', photos: [], vehicleId };
    const vs = (r.assignments || []).map(a => S.vehicle(a.vehicleId)).filter(Boolean);
    return UI.modal({
      title: `${icon('fuel')} ${ex ? 'แก้ไข' : 'บันทึก'}ค่าใช้จ่าย · ${r.id}`, size: 'lg',
      body: `<form id="exF" class="stack">
        <div class="grid2">
          <div class="field"><label>รถ</label><select name="vehicleId">${vs.map(v => `<option value="${v.id}" ${v.id === (e.vehicleId || vehicleId) ? 'selected' : ''}>${esc(v.name)} · ${esc(v.plate)}</option>`).join('')}</select></div>
          <div class="field"><label>ประเภท</label><select name="type">${Object.entries(S.EXPENSE).map(([k, l]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>วันที่</label><input name="date" type="date" value="${esc(e.date)}"></div>
          <div class="field"><label>ปั๊ม / สถานที่</label><input name="station" value="${esc(e.station || '')}" placeholder="เช่น ปตท. ลาดหลุมแก้ว"></div>
          <div class="field fuel-only"><label>จำนวนลิตร</label><input name="liters" type="number" step="0.01" min="0" value="${e.liters || ''}"></div>
          <div class="field fuel-only"><label>ราคาต่อลิตร (บาท)</label><input name="pricePerL" type="number" step="0.01" min="0" value="${e.pricePerL || ''}"></div>
          <div class="field"><label>ยอดเงิน (บาท) <b class="req">*</b></label><input name="amount" type="number" step="0.01" min="0" required value="${e.amount || ''}"></div>
          <div class="field fuel-only"><label>เลขไมล์ขณะเติม</label><input name="odo" type="number" min="0" value="${e.odo ?? ''}"></div>
          <div class="field"><label>วิธีชำระ</label><select name="pay">${Object.entries(S.PAY).map(([k, l]) => `<option value="${k}" ${k === e.pay ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>หมายเหตุ</label><input name="note" value="${esc(e.note || '')}"></div>
        </div>
        ${C.filePicker('exPh', e.photos || [], { label: 'ถ่ายรูป / แนบบิล', capture: false, hint: 'ถ่ายใบเสร็จให้ตรง เต็มใบ ในที่สว่าง — ต้องอ่านยอดเงิน จำนวนลิตร และวันที่ได้ชัดเจน' })}
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', icon: 'check', onClick: async el => {
        const f = UI.formData(el.querySelector('#exF'));
        if (!(+f.amount > 0)) { UI.toast('กรุณาระบุยอดเงิน', 'error'); return false; }
        await S.saveExpense(r.id, { ...e, ...f, photos: el._photos() });
        UI.toast('บันทึกค่าใช้จ่ายแล้ว'); return true;
      } }],
      onOpen(el) {
        el._photos = C.bindFilePicker(el, 'exPh', e.photos || []);
        const form = el.querySelector('#exF');
        const sync = () => { const fuel = form.type.value === 'fuel'; el.querySelectorAll('.fuel-only').forEach(x => { x.hidden = !fuel; }); };
        const calc = () => { const l = +form.liters.value, p = +form.pricePerL.value; if (l && p) form.amount.value = Math.round(l * p * 100) / 100; };
        form.type.addEventListener('change', sync); form.liters.addEventListener('input', calc); form.pricePerL.addEventListener('input', calc); sync();
      }
    });
  };

  // ───────── ป๊อปอัปเลขไมล์ / สถานะ ─────────
  Pages._tripAction = async (r, idx, status) => {
    const a = r.assignments[idx], v = S.vehicle(a.vehicleId) || {};
    const def = status === 'ontrip' ? (a.odoStart ?? lastOdo(a.vehicleId) ?? '') : (a.odoEnd ?? '');
    const res = await UI.modal({
      title: status === 'ontrip' ? `${icon('navigation')} ยืนยันออกเดินทาง` : `${icon('home')} ยืนยันกลับถึงโรงเรียน`,
      body: `<div class="stack">
        <div class="note-box navy">${icon(kindIcon(v.kind))}<div><b>${esc(v.name)} · ${esc(v.plate)}</b><br>${esc(S.destName(r))}</div></div>
        <div class="field"><label>เลขไมล์${status === 'ontrip' ? 'ตอนออก' : 'ตอนกลับ'} (กม.)</label><input id="odoIn" type="number" inputmode="numeric" min="0" value="${def}" placeholder="ไม่บังคับ — กรอกภายหลังได้"></div>
        ${status === 'returned' && a.odoStart != null ? `<p class="hint">เลขไมล์ตอนออก ${fmt.num(a.odoStart)} กม.</p>` : ''}
        <div class="field"><label>เวลา</label><input id="atIn" type="datetime-local" value="${fmt.local(new Date())}"></div>
      </div>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: status === 'ontrip' ? 'ออกเดินทาง' : 'กลับถึงแล้ว', kind: status === 'ontrip' ? 'btn-primary' : 'btn-ok', icon: 'check', onClick: async el => {
        await S.tripStatus(r.id, idx, status, { odo: el.querySelector('#odoIn').value, at: el.querySelector('#atIn').value });
        return true;
      } }]
    });
    if (res) UI.toast(status === 'ontrip' ? 'บันทึกออกเดินทางแล้ว เดินทางปลอดภัยนะคะ' : 'บันทึกกลับถึงแล้ว ระบบแจ้งผู้ขอให้ประเมินแล้ว');
  };

  function myJobs(driverId) {
    const out = [];
    S.db.requests.forEach(r => (r.assignments || []).forEach((a, i) => { if (a.driverId === driverId && ['approved', 'ontrip', 'returned', 'closed'].includes(r.status)) out.push({ r, a, i }); }));
    return out.sort((x, y) => x.r.startAt.localeCompare(y.r.startAt));
  }
  function jobCard(j, { detail = false } = {}) {
    const { r, a, i } = j, v = S.vehicle(a.vehicleId) || {};
    const mine = (r.expenses || []).filter(e => e.vehicleId === a.vehicleId);
    const others = r.assignments.filter((x, k) => k !== i);
    return `<article class="job">
      <div class="job-top"><div><b class="num">${fmt.time(r.startAt)}</b> <span class="muted">${UI.sameDay(r.startAt, new Date()) ? 'วันนี้' : fmt.dateLong(r.startAt)}</span></div><span class="pill tone-${a.status === 'ontrip' ? 'live pulse' : a.status === 'returned' ? 'done' : 'ok'}">${S.ASSIGN[a.status]}</span></div>
      <div class="job-body">
        <h3>${esc(S.destName(r))}</h3>
        <p class="muted" style="font-size:.9rem">${esc(r.purpose)}</p>
        <div class="job-info">
          <div><small>รถ</small><b>${esc(v.name || '-')}</b><br>${esc(v.plate || '')}</div>
          <div><small>เวลา</small>${fmt.range(r.startAt, r.endAt)}</div>
          <div><small>จุดนัดขึ้นรถ</small>${esc(r.pickup || '-')}</div>
          <div><small>ผู้เดินทาง</small>${S.paxText(r)}</div>
          <div class="full"><small>ผู้ขอใช้รถ</small>${esc(r.requester.name)} · <a class="link" href="tel:${esc(r.contactPhone || r.requester.phone)}">${esc(r.contactPhone || r.requester.phone || '')}</a></div>
          ${(r.destinations || []).length ? `<div class="full"><small>ปลายทาง</small>${r.destinations.map(d => `${esc(d.name)}${d.address ? ` <span class="muted">(${esc(d.address)})</span>` : ''}`).join('<br>')}${r.totalKm ? `<br><span class="muted">ระยะทางรวมประมาณ ${fmt.num(r.totalKm, 0)} กม.</span>` : ''}</div>` : ''}
          ${a.note ? `<div class="full" style="background:var(--gold-50)"><small>หมายเหตุจากแอดมิน</small>${esc(a.note)}</div>` : ''}
          ${S.tripTag(r) ? `<div class="full"><small>ลักษณะการเดินทาง</small>${S.tripTag(r).text}${S.tripType(r) === 'daily' ? ` · ออก ${fmt.time(r.startAt)} กลับ ${fmt.time(r.endAt)} น. ทุกวัน` : ''}${r.lodging ? ' · ที่พัก ' + esc(r.lodging) : ''}</div>` : ''}
          ${others.length ? `<div class="full"><small>รถคันอื่นในทริปเดียวกัน</small>${others.map(o => `${esc(C.vName(o.vehicleId))} · ${esc(C.dName(o.driverId))}`).join('<br>')}</div>` : ''}
          ${a.odoStart != null || a.odoEnd != null ? `<div class="full"><small>เลขไมล์</small>${a.odoStart != null ? fmt.num(a.odoStart) : '—'} → ${a.odoEnd != null ? fmt.num(a.odoEnd) : '—'}${a.odoStart != null && a.odoEnd != null ? ` <b>(${fmt.num(a.odoEnd - a.odoStart)} กม.)</b>` : ''}</div>` : ''}
          ${mine.length ? `<div class="full"><small>ค่าใช้จ่ายที่บันทึก</small>${mine.map(e => `${S.EXPENSE[e.type]} ${fmt.money(e.amount)} บ.${e.liters ? ` (${e.liters} ล.)` : ''}`).join('<br>')}</div>` : ''}
        </div>
      </div>
      <div class="job-acts">
        ${a.status === 'assigned' ? `<button class="btn btn-primary full" data-go="ontrip" data-r="${r.id}" data-i="${i}">${icon('navigation')} ออกเดินทาง</button>` : ''}
        ${a.status === 'ontrip' ? `<button class="btn btn-ok full" data-go="returned" data-r="${r.id}" data-i="${i}">${icon('home')} กลับถึงโรงเรียนแล้ว</button>` : ''}
        ${a.status !== 'assigned' ? `<button class="btn btn-gold" data-fuel data-r="${r.id}" data-v="${a.vehicleId}">${icon('fuel')} บันทึกเติมน้ำมัน</button><button class="btn btn-ghost" data-odo data-r="${r.id}" data-i="${i}">${icon('gauge')} แก้เลขไมล์</button>` : ''}
        ${!detail ? `<a class="btn btn-ghost full" href="#/driver/${r.id}/${i}">${icon('info')} ดูรายละเอียดงาน</a>` : ''}
      </div>
    </article>`;
  }
  function bindJobs(root) {
    root.addEventListener('click', async e => {
      const g = e.target.closest('[data-go]');
      if (g) { const r = S.request(g.dataset.r); return Pages._tripAction(r, +g.dataset.i, g.dataset.go); }
      const f = e.target.closest('[data-fuel]');
      if (f) { const r = S.request(f.dataset.r); return Pages._expenseModal(r, f.dataset.v); }
      const o = e.target.closest('[data-odo]');
      if (o) {
        const r = S.request(o.dataset.r), i = +o.dataset.i, a = r.assignments[i];
        UI.modal({ title: `${icon('gauge')} เลขไมล์`, body: `<div class="grid2"><div class="field"><label>ตอนออก</label><input id="o1" type="number" inputmode="numeric" value="${a.odoStart ?? ''}"></div><div class="field"><label>ตอนกลับ</label><input id="o2" type="number" inputmode="numeric" value="${a.odoEnd ?? ''}"></div></div>`,
          actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { await S.setOdo(r.id, i, { odoStart: el.querySelector('#o1').value, odoEnd: el.querySelector('#o2').value }); UI.toast('บันทึกเลขไมล์แล้ว'); return true; } }] });
      }
    });
  }

  // ───────── ปฏิทินงานคนขับ ─────────
  const dStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dEnd = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const jobsOn = (jobs, day) => jobs.filter(j => new Date(j.r.startAt) <= dEnd(day) && new Date(j.r.endAt) >= dStart(day));
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekOf = d => { const x = dStart(d); x.setDate(x.getDate() - x.getDay()); return x; };
  // สรุปย่อของวัน: จำนวนงาน + เวลาออกงานแรก (งานค้างคืนที่ต่อจากวันก่อน แสดงว่า "ต่อเนื่อง")
  function daySummary(list, day) {
    const starts = list.filter(j => UI.sameDay(j.r.startAt, day)).sort((a, b) => a.r.startAt.localeCompare(b.r.startAt));
    return { n: list.length, first: starts[0] ? fmt.time(starts[0].r.startAt) : '', cont: list.some(j => !UI.sameDay(j.r.startAt, day)), live: list.some(j => j.a.status === 'ontrip') };
  }
  Pages._driverJobs = myJobs; Pages._jobsOn = jobsOn; Pages._daySummary = daySummary;
  function driverCalendar(jobs, { view, sel, link }) {
    const head = `<div class="row between" style="margin:18px 0 14px">
      <div class="row"><a class="icon-btn sm" href="${link({ date: fmt.localDate(view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() - 1, 1) : addD(sel, -7)) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
        <b style="font-family:var(--font-display);min-width:170px;text-align:center">${view === 'month' ? sel.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : `${fmt.dayMonth(weekOf(sel))} – ${fmt.date(addD(weekOf(sel), 6))}`}</b>
        <a class="icon-btn sm" href="${link({ date: fmt.localDate(view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() + 1, 1) : addD(sel, 7)) })}" aria-label="ถัดไป">${icon('chevR')}</a></div>
      <div class="seg"><a href="${link({ view: 'month' })}"><button class="${view === 'month' ? 'on' : ''}" tabindex="-1">เดือน</button></a><a href="${link({ view: 'week' })}"><button class="${view === 'week' ? 'on' : ''}" tabindex="-1">สัปดาห์</button></a><a href="${link({ date: fmt.localDate(new Date()) })}"><button tabindex="-1">วันนี้</button></a></div></div>`;
    let grid = '';
    if (view === 'month') {
      const first = new Date(sel.getFullYear(), sel.getMonth(), 1), start = addD(first, -first.getDay());
      const cells = Array.from({ length: 42 }, (_, i) => addD(start, i));
      const rows = cells[35].getMonth() !== sel.getMonth() ? cells.slice(0, 35) : cells;
      grid = `<div class="cal dcal"><div class="cal-head">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => `<div>${d}</div>`).join('')}</div><div class="cal-grid">${rows.map(d => {
        const s = daySummary(jobsOn(jobs, d), d);
        return `<a class="cal-day ${d.getMonth() !== sel.getMonth() ? 'out' : ''} ${UI.sameDay(d, new Date()) ? 'today' : ''} ${UI.sameDay(d, sel) ? 'sel' : ''} ${s.n ? 'has' : ''}" href="${link({ date: fmt.localDate(d) })}"><span class="d">${d.getDate()}</span>
          ${s.n ? `<span class="dj ${s.live ? 'live' : ''}">${icon('van')}<b>${s.n}</b><em>งาน</em></span>${s.first ? `<small class="dt">${s.first}</small>` : ''}${s.cont ? `<small class="dc">${icon('moon')}ต่อเนื่อง</small>` : ''}` : ''}</a>`;
      }).join('')}</div></div>`;
    } else {
      const ws = weekOf(sel);
      grid = `<div class="week">${Array.from({ length: 7 }, (_, i) => addD(ws, i)).map(d => { const list = jobsOn(jobs, d); return `<a class="wk-col ${UI.sameDay(d, new Date()) ? 'today' : ''}" href="${link({ date: fmt.localDate(d) })}" style="display:block"><h4>${d.toLocaleDateString('th-TH', { weekday: 'short' })}<b>${d.getDate()}</b></h4>${list.map(j => `<span class="wk-ev s-${j.r.status}"><b>${UI.sameDay(j.r.startAt, d) ? fmt.time(j.r.startAt) : 'ต่อเนื่อง'} ${esc(S.destName(j.r))}</b>${esc(C.vName(j.a.vehicleId))} · ${S.ASSIGN[j.a.status]}</span>`).join('') || '<p class="hint" style="margin-top:10px">ว่าง</p>'}</a>`; }).join('')}</div>`;
    }
    const today = jobsOn(jobs, sel);
    return head + grid + `<h3 style="margin:26px 4px 12px;display:flex;gap:8px;align-items:center;color:var(--navy)">${icon('calendar')} ${fmt.dateLong(sel)} <span class="pill tone-ok">${today.length} งาน</span></h3>
      ${today.map(j => jobCard(j)).join('') || `<div class="card">${UI.empty('วันนี้ไม่มีงาน', 'checkCircle')}</div>`}`;
  }

  // ───────── หน้าแรกคนขับ (แบบ A): งานถัดไป + ภาพรวม วันนี้/สัปดาห์/เดือน เรียงตามวัน ─────────
  const RANGES = { day: 'วันนี้', week: 'สัปดาห์', month: 'เดือน' };
  function rangeOf(mode, ref) {
    if (mode === 'day') return [dStart(ref), addD(dStart(ref), 1)];
    if (mode === 'week') { const s = weekOf(ref); return [s, addD(s, 7)]; }
    return [new Date(ref.getFullYear(), ref.getMonth(), 1), new Date(ref.getFullYear(), ref.getMonth() + 1, 1)];
  }
  const inRange = (j, [a, b]) => new Date(j.r.startAt) < b && new Date(j.r.endAt) > a;
  const shiftRange = (mode, ref, k) => mode === 'day' ? addD(ref, k) : mode === 'week' ? addD(ref, 7 * k) : new Date(ref.getFullYear(), ref.getMonth() + k, 1);
  const relDay = d => { const n = Math.round((dStart(d) - dStart(new Date())) / 864e5); return n === 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : n === -1 ? 'เมื่อวาน' : ''; };
  const dShort = d => new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  const nDays = r => Math.round((dStart(r.endAt) - dStart(r.startAt)) / 864e5) + 1;
  const isDone = j => j.a.status === 'returned' || j.r.status === 'closed';
  const tone = j => j.a.status === 'ontrip' ? 'live' : isDone(j) ? 'done' : 'ok';
  const TONE_C = { live: 'var(--dh-live)', ok: 'var(--dh-ok)', done: 'var(--dh-done)' };
  const jobHref = j => `#/driver/${j.r.id}/${j.i}`;
  function rangeLabel(mode, ref) {
    const [a, b] = rangeOf(mode, ref), last = addD(b, -1);
    if (mode === 'day') return (relDay(a) ? relDay(a) + ' · ' : '') + dShort(a);
    if (mode === 'week') return `${fmt.dayMonth(a)} – ${fmt.dayMonth(last)}`;
    return a.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  }
  // แถวงาน 1 รายการ: ช่องซ้าย = เวลาออก–กลับ (ช่องเดียว) · กลาง = สถานที่ + ไปกี่วัน · ขวา = สถานะ
  function dhRow(j, from) {
    const { r, a } = j, s = new Date(r.startAt), e = new Date(r.endAt), multi = nDays(r) > 1, cont = s < from, t = S.tripType(r);
    const time = cont ? `<b>ต่อ</b><em>ถึง ${multi ? fmt.dayMonth(e) : fmt.time(e)}</em>`
      : `<b>${fmt.time(s).replace(' น.', '')}</b><em>${multi ? `ถึง ${e.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' })}` : `ถึง ${fmt.time(e).replace(' น.', '')}`}</em>`;
    const kind = t === 'overnight' ? 'ค้างคืน' : t === 'daily' ? 'ไป-กลับทุกวัน' : t === 'oneway' ? 'ไปส่ง/ไปรับ' : '';
    return `<a class="dh-row ${tone(j)}" style="--c:${TONE_C[tone(j)]}" href="${jobHref(j)}">
      <span class="dh-t num">${time}</span>
      <span class="dh-m"><b>${esc(S.destName(r))}</b><small>${multi ? `${nDays(r)} วัน · ${fmt.dayMonth(s)} – ${fmt.dayMonth(e)}` : 'ไป-กลับวันเดียว'}${kind && t !== 'day' ? ` · ${kind}` : ''}</small><small>${icon(kindIcon((S.vehicle(a.vehicleId) || {}).kind))} ${esc(C.vName(a.vehicleId))}</small></span>
      <span class="dh-s"><span class="pill tone-${tone(j) === 'live' ? 'live pulse' : tone(j)}">${S.ASSIGN[a.status]}</span>${icon('chevR')}</span></a>`;
  }
  function overview(jobs, { mode, ref, link }) {
    const R = rangeOf(mode, ref), list = jobs.filter(j => inRange(j, R));
    const now = new Date(), today0 = dStart(now);
    const live = jobs.find(j => j.a.status === 'ontrip');
    const next = live || jobs.find(j => j.a.status === 'assigned' && new Date(j.r.endAt) >= now);
    const late = jobs.filter(j => j.a.status === 'assigned' && new Date(j.r.startAt) < today0);
    const left = m => jobs.filter(j => inRange(j, rangeOf(m, now)) && !isDone(j)).length;
    const groups = new Map();
    list.forEach(j => { const k = fmt.localDate(new Date(j.r.startAt) < R[0] ? R[0] : new Date(j.r.startAt)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(j); });
    const atNow = rangeOf(mode, now)[0].getTime() === R[0].getTime();
    const doneN = list.filter(isDone).length;
    const nextCard = next ? (() => { const r = next.r, multi = nDays(r) > 1, onTrip = next.a.status === 'ontrip';
      const startSoon = !onTrip && UI.sameDay(r.startAt, now);
      return `<div class="dh-next ${onTrip ? 'live' : ''}">
        <a class="dh-next-main" href="${jobHref(next)}"><small>${onTrip ? '● กำลังเดินทางอยู่' : 'งานถัดไป · ' + (relDay(r.startAt) || dShort(r.startAt))}</small><h3>${esc(S.destName(r))}</h3>
          <div class="dh-chips"><span>${icon('clock')} ${fmt.time(r.startAt).replace(' น.', '')} – ${multi ? dShort(r.endAt) + ' ' : ''}${fmt.time(r.endAt)}</span>${multi ? `<span>${icon('calendar')} ${nDays(r)} วัน</span>` : ''}<span>${icon('van')} ${esc(C.vName(next.a.vehicleId))}</span></div></a>
        ${onTrip ? `<button class="btn btn-ok" data-go="returned" data-r="${r.id}" data-i="${next.i}">${icon('home')} กลับถึงโรงเรียนแล้ว</button>` : startSoon ? `<button class="btn btn-gold" data-go="ontrip" data-r="${r.id}" data-i="${next.i}">${icon('navigation')} ออกเดินทาง</button>` : ''}
      </div>`; })() : '';
    return `<div class="dh-grid">
      <div class="dh-side">
        ${nextCard}
        ${late.length ? `<div class="dh-late">${icon('alert')}<div><b>ยังไม่ได้กดสถานะ ${late.length} งาน</b><small>เลยวันเดินทางแล้ว กดเข้าไปกด "ออกเดินทาง / กลับถึง" ให้เรียบร้อย</small>${late.map(j => `<a href="${jobHref(j)}">${dShort(j.r.startAt)} · ${esc(S.destName(j.r))}</a>`).join('')}</div></div>` : ''}
        <div class="seg dh-seg">${Object.entries(RANGES).map(([k, l]) => { const n = left(k); return `<a href="${link({ r: k, date: '' })}"><button class="${k === mode ? 'on' : ''}" tabindex="-1">${l}<small>${n ? `เหลือ ${n} งาน` : 'ไม่มีงานค้าง'}</small></button></a>`; }).join('')}</div>
        <div class="dh-nav"><a class="icon-btn" href="${link({ r: mode, date: fmt.localDate(shiftRange(mode, ref, -1)) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
          <div><b>${rangeLabel(mode, ref)}</b><span class="dh-count"><em class="num">${list.length}</em> งาน${doneN ? ` · เสร็จแล้ว ${doneN}` : ''}</span></div>
          <a class="icon-btn" href="${link({ r: mode, date: fmt.localDate(shiftRange(mode, ref, 1)) })}" aria-label="ถัดไป">${icon('chevR')}</a></div>
        ${atNow ? '' : `<a class="dh-back" href="${link({ r: mode, date: '' })}">กลับมาช่วงปัจจุบัน</a>`}
      </div>
      <div class="dh-list">${[...groups.entries()].map(([k, js]) => { const d = UI.dayOf(k), rel = relDay(d);
        return `<div class="dh-day"><h4 class="${rel === 'วันนี้' ? 'today' : ''}">${rel || d.toLocaleDateString('th-TH', { weekday: 'long' })} <small>${dShort(d)}</small></h4>${js.map(j => dhRow(j, R[0])).join('')}</div>`; }).join('')
        || `<div class="card dh-empty">${UI.empty(mode === 'day' ? 'วันนี้ไม่มีงาน' : 'ช่วงนี้ไม่มีงาน', 'checkCircle')}</div>`}</div>
    </div>`;
  }

  Pages.driverHome = ({ query }) => {
    const me = S.me;
    let d = S.driverOfUser(me);
    const adminView = S.isAdmin(me) && (!d || query.d);
    if (adminView) d = S.driver(query.d) || S.db.drivers[0];
    if (!d) return { html: `<div class="drv">${UI.empty('บัญชีนี้ยังไม่ได้ผูกกับรายชื่อพนักงานขับรถ กรุณาติดต่อแอดมิน', 'user')}</div>`, layout: 'driver' };
    const jobs = myJobs(d.id);
    const mode = RANGES[query.r] ? query.r : 'week';
    const ref = query.date ? UI.dayOf(query.date) : new Date();
    const linkL = o => { const p = { ...(adminView ? { d: d.id } : {}), r: mode, ...o }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; }); return '#/driver?' + new URLSearchParams(p); };
    const tab = query.tab === 'cal' ? 'cal' : 'list';
    const view = query.view === 'week' ? 'week' : 'month';
    const sel = UI.dayOf(query.date);
    const link = o => '#/driver?' + new URLSearchParams({ ...(adminView ? { d: d.id } : {}), tab: 'cal', view, date: fmt.localDate(sel), ...o });
    const tabs = `<div class="seg" style="margin-top:16px;display:flex"><a href="#/driver${adminView ? `?d=${d.id}` : ''}" style="flex:1"><button class="${tab === 'list' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('list')} งานของฉัน</button></a><a href="${link({})}" style="flex:1"><button class="${tab === 'cal' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('calendar')} ปฏิทินงาน</button></a></div>`;
    return {
      layout: 'driver',
      html: `<div class="drv ${tab === 'list' ? 'drv-wide' : ''}">
        ${adminView ? `<div class="note-box navy" style="margin-bottom:14px">${icon('shield')}<div>มุมมองแอดมิน — เลือกคนขับ: <select class="input" style="width:auto;display:inline-block;padding:6px 10px" onchange="location.hash='#/driver?${tab === 'cal' ? 'tab=cal&' : ''}d='+this.value">${S.db.drivers.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select> · <a class="link" href="#/admin/roster">ตารางเวรรวมทุกคน</a></div></div>` : ''}
        <div class="drv-hello">${d.photo ? `<span class="avatar lg gold ph">${UI.img(d.photo, d.name)}</span>` : UI.avatar(d.name, 'lg gold')}<div><small>สวัสดีครับ</small><h2>${esc(d.name)}</h2><small>${fmt.dateLong(new Date())}</small></div></div>
        ${tabs}
        ${tab === 'cal' ? driverCalendar(jobs, { view, sel, link }) : overview(jobs, { mode, ref, link: linkL })}
      </div>`,
      mount: bindJobs
    };
  };
  Pages.driverJob = ({ params }) => {
    const r = S.request(params.id), i = +params.idx;
    const a = r && r.assignments[i];
    if (!a) return { layout: 'driver', html: `<div class="drv">${UI.empty('ไม่พบงานนี้')}</div>` };
    const d = S.driver(a.driverId);
    if (!S.isAdmin(S.me) && !(d && d.email === S.me.email)) return { layout: 'driver', html: `<div class="drv">${UI.empty('ไม่ใช่งานของคุณ', 'lock')}</div>` };
    return {
      layout: 'driver',
      html: `<div class="drv"><a class="crumb" href="#/driver">${icon('arrowL')} งานของฉัน</a>${jobCard({ r, a, i }, { detail: true })}
        <div class="card" style="margin-top:14px"><div class="card-head"><h3>${icon('activity')} ความเคลื่อนไหว</h3></div>${C.history(r)}</div></div>`,
      mount: bindJobs
    };
  };
})();
