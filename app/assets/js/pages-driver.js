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
        ${C.filePicker('exPh', e.photos || [], { label: 'ถ่ายรูป / แนบบิล', capture: false, hint: 'รูปใบเสร็จ/บิลน้ำมัน (กดเพื่อถ่ายรูปจากมือถือได้)' })}
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
          <div><small>ผู้เดินทาง</small>ครู ${r.teachers} · นักเรียน ${r.students}${r.others ? ` · อื่น ๆ ${r.others}` : ''}</div>
          <div class="full"><small>ผู้ขอใช้รถ</small>${esc(r.requester.name)} · <a class="link" href="tel:${esc(r.contactPhone || r.requester.phone)}">${esc(r.contactPhone || r.requester.phone || '')}</a></div>
          ${(r.destinations || []).length ? `<div class="full"><small>ปลายทาง</small>${r.destinations.map(d => `${esc(d.name)}${d.address ? ` <span class="muted">(${esc(d.address)})</span>` : ''}`).join('<br>')}${r.totalKm ? `<br><span class="muted">ระยะทางรวมประมาณ ${fmt.num(r.totalKm, 0)} กม.</span>` : ''}</div>` : ''}
          ${a.note ? `<div class="full" style="background:var(--gold-50)"><small>หมายเหตุจากแอดมิน</small>${esc(a.note)}</div>` : ''}
          ${r.overnight ? `<div class="full"><small>ค้างคืน</small>${fmt.days(r.startAt, r.endAt)} วัน${r.lodging ? ' · ' + esc(r.lodging) : ''}</div>` : ''}
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

  Pages.driverHome = ({ query }) => {
    const me = S.me;
    let d = S.driverOfUser(me);
    const adminView = S.isAdmin(me) && (!d || query.d);
    if (adminView) d = S.driver(query.d) || S.db.drivers[0];
    if (!d) return { html: `<div class="drv">${UI.empty('บัญชีนี้ยังไม่ได้ผูกกับรายชื่อพนักงานขับรถ กรุณาติดต่อแอดมิน', 'user')}</div>`, layout: 'driver' };
    const jobs = myJobs(d.id);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ontrip = jobs.filter(j => j.a.status === 'ontrip');
    const todayJobs = jobs.filter(j => j.a.status === 'assigned' && UI.sameDay(j.r.startAt, new Date()));
    const next = jobs.filter(j => j.a.status === 'assigned' && new Date(j.r.startAt) > new Date(today.getTime() + 864e5 - 1)).slice(0, 10);
    const late = jobs.filter(j => j.a.status === 'assigned' && new Date(j.r.startAt) < today);
    const past = jobs.filter(j => j.a.status === 'returned').slice(-8).reverse();
    const sec = (t, list, ic) => list.length ? `<h3 style="margin:24px 4px 12px;display:flex;gap:8px;align-items:center;color:var(--navy)">${icon(ic)} ${t} <span class="pill tone-ok">${list.length}</span></h3>${list.map(j => jobCard(j)).join('')}` : '';
    const tab = query.tab === 'cal' ? 'cal' : 'list';
    const view = query.view === 'week' ? 'week' : 'month';
    const sel = UI.dayOf(query.date);
    const link = o => '#/driver?' + new URLSearchParams({ ...(adminView ? { d: d.id } : {}), tab: 'cal', view, date: fmt.localDate(sel), ...o });
    const tabs = `<div class="seg" style="margin-top:16px;display:flex"><a href="#/driver${adminView ? `?d=${d.id}` : ''}" style="flex:1"><button class="${tab === 'list' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('list')} งานของฉัน</button></a><a href="${link({})}" style="flex:1"><button class="${tab === 'cal' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('calendar')} ปฏิทินงาน</button></a></div>`;
    return {
      layout: 'driver',
      html: `<div class="drv">
        ${adminView ? `<div class="note-box navy" style="margin-bottom:14px">${icon('shield')}<div>มุมมองแอดมิน — เลือกคนขับ: <select class="input" style="width:auto;display:inline-block;padding:6px 10px" onchange="location.hash='#/driver?${tab === 'cal' ? 'tab=cal&' : ''}d='+this.value">${S.db.drivers.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select> · <a class="link" href="#/admin/roster">ตารางเวรรวมทุกคน</a></div></div>` : ''}
        <div class="drv-hello">${UI.avatar(d.name, 'lg gold')}<div><small>สวัสดีครับ</small><h2>${esc(d.name)}</h2><small>${fmt.dateLong(new Date())}</small></div></div>
        ${tabs}
        ${tab === 'cal' ? driverCalendar(jobs, { view, sel, link }) : `
        ${sec('กำลังเดินทาง', ontrip, 'activity')}
        ${sec('งานวันนี้', todayJobs, 'clock')}
        ${sec('ค้างกดสถานะ (เลยกำหนดแล้ว)', late, 'alert')}
        ${sec('งานที่จะมาถึง', next, 'calendar')}
        ${!ontrip.length && !todayJobs.length && !next.length && !late.length ? `<div class="card" style="margin-top:20px">${UI.empty('ยังไม่มีงานที่ได้รับมอบหมาย', 'checkCircle')}</div>` : ''}
        ${sec('งานที่เสร็จแล้วล่าสุด', past, 'check')}`}
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
