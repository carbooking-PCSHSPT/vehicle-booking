/* ═══════════════════════════════════════════════════════════
   ระบบหลังบ้าน: ภาพรวม · คำขอ (อนุมัติ/มอบหมายรถหลายคัน/หมายเหตุ) · บันทึกเร่งด่วน
   · ข้อมูลรถ (เผยแพร่ + เชิงลึก) · คนขับ · ผู้ใช้ · ค่าใช้จ่าย · การประเมิน · สถิติ · ตั้งค่า
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, pill, kindIcon, $, $$ } = UI;
  const S = Store;
  const DAY = 864e5;
  const daysTo = d => Math.ceil((new Date(d) - new Date().setHours(0, 0, 0, 0)) / DAY);
  // ── เช็คระยะตามเลขไมล์: เลขไมล์ล่าสุด (จากงานที่คนขับบันทึก) เทียบรอบถัดไปในแผนบำรุงรักษา ──
  const SVC_SOON_KM = 1000, SVC_SOON_DAYS = 30;
  function svcStatus(vId, p) {
    const odo = Pages._lastOdo ? Pages._lastOdo(vId) : null;
    return ((p && p.maintenancePlan) || []).map(m => {
      const every = +m.everyKm || 0, hasLast = m.lastKm !== '' && m.lastKm != null && !isNaN(+m.lastKm);
      const nextKm = every && hasLast ? +m.lastKm + every : null, left = nextKm != null && odo != null ? nextKm - odo : null;
      let days = null; if (+m.everyMonths && m.lastDate) { const due = new Date(m.lastDate); due.setMonth(due.getMonth() + +m.everyMonths); days = daysTo(due); }
      const over = (left != null && left <= 0) || (days != null && days < 0);
      const soon = !over && ((left != null && left <= SVC_SOON_KM) || (days != null && days <= SVC_SOON_DAYS));
      const parts = [left != null ? (left <= 0 ? `เลยระยะมาแล้ว ${fmt.num(-left)} กม.` : `อีก ${fmt.num(left)} กม.`) : '', days != null ? (days < 0 ? `เลยกำหนด ${-days} วัน` : `อีก ${days} วัน`) : ''].filter(Boolean);
      return { m, odo, nextKm, left, days, over, soon, text: parts.join(' · ') || (every && !hasLast ? 'ยังไม่ระบุเลขไมล์ครั้งล่าสุด' : '') };
    });
  }

  // ───────── โครงหลังบ้าน ─────────
  Pages._adminShell = (path, html) => {
    const me = S.me, admin = S.isAdmin(me);
    const pending = S.db.requests.filter(r => r.status === 'pending').length;
    const isOn = h => path === h || (h !== '/admin' && path.startsWith(h));
    let cur = null;
    const L = (h, ic, t, cnt) => { if (isOn(h) && !cur) cur = { ic, t }; return `<a href="#${h}" title="${t}" class="${isOn(h) ? 'on' : ''}">${icon(ic)}<span class="sl">${t}</span>${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`; };
    // แท็บเล็ต/มือถือ: ปุ่ม "เมนูหลังบ้าน" (บอกหน้าปัจจุบัน) → กดแล้วเปิดตารางปุ่มเมนู (แทนแถบเลื่อนแนวนอนที่ใช้ยาก)
    const links = `
        ${admin ? `<h5>งานประจำวัน</h5>${L('/admin', 'grid', 'ภาพรวม')}${L('/admin/requests', 'clipboard', 'คำขอใช้รถ', pending)}${L('/admin/new', 'alert', 'บันทึกคำขอเร่งด่วน')}${L('/admin/roster', 'calendar', 'ตารางงานคนขับ')}<a href="#" data-rostermenu title="จัดเวรคนขับ">${icon('clock')}<span class="sl">จัดเวรคนขับ</span></a>${''}${L('/driver', 'wheel', 'มุมมองคนขับ')}
        <h5>ข้อมูลหลัก</h5>${L('/admin/vehicles', 'van', 'ข้อมูลรถ')}${L('/admin/drivers', 'users', 'พนักงานขับรถ')}${L('/admin/users', 'userPlus', 'ผู้ใช้และสิทธิ์')}` : ''}
        <h5>รายงาน</h5>${admin ? L('/admin/expenses', 'fuel', 'ค่าน้ำมัน/ค่าใช้จ่าย') : ''}${L('/admin/stats', 'chart', 'สถิติและรายงาน')}${L('/admin/ratings', 'star', 'ประเมินคนขับ')}
        ${S.signerRoles(me).length ? `<h5>ลงนาม</h5>${L('/admin/esign', 'edit', 'บันทึกข้อความรอลงนาม', S.db.requests.filter(r => S.signerRoles(me).some(ro => S.needsMySign(r, ro))).length)}` : ''}
        ${admin ? `<h5>ระบบ</h5>${L('/admin/settings', 'settings', 'ตั้งค่า')}${L('/admin/support', 'activity', 'ดูแลระบบ', (S.db.feedback || []).filter(x => x.status === 'new').length)}` : ''}`;
    return `<div class="admin">
      <aside class="side no-print">
        <button type="button" class="side-toggle" data-side-toggle aria-expanded="false">${icon(cur ? cur.ic : 'grid')}<span><small>เมนูหลังบ้าน</small><b>${cur ? cur.t : 'เลือกเมนู'}</b></span>${pending && admin ? `<span class="cnt">${pending}</span>` : ''}${icon('chev', 'chev')}</button>
        <div class="side-links"><button type="button" class="side-order" data-ordernew>${icon('send')}<span class="sl">${admin ? 'บันทึกคำสั่ง ผอ.' : 'สั่งงานรถ'}</span></button>${links}</div>
      </aside>
      <div class="page-enter" style="min-width:0">${html}</div>
    </div>`;
  };
  // เมนูจัดเวรคนขับ (เวรเย็น จ.–ศ. · เวรวันอาทิตย์ · คนขับหอพัก)
  document.addEventListener('click', async e => { const m = e.target.closest('[data-rostermenu]'); if (!m) return; e.preventDefault(); if (Pages._rosterModal && await Pages._rosterModal('eveRoster')) App.render(); });
  document.addEventListener('click', async e => { const o = e.target.closest('[data-ordernew]'); if (!o) return; const r = await Pages._orderModal({ admin: S.isAdmin(S.me) }); if (r && S.isAdmin(S.me)) location.hash = '#/admin/requests/' + r.id; });
  document.addEventListener('click', e => { const t = e.target.closest('[data-side-toggle]'); if (!t) return; const s = t.closest('.side'); s.classList.toggle('open'); t.setAttribute('aria-expanded', s.classList.contains('open')); });
  const head = (eyebrow, title, sub = '', right = '') => `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="row">${right}</div>` : ''}</div>`;

  // ═════════ ภาพรวม ═════════
  Pages.adminHome = () => {
    const now = new Date(), rs = S.db.requests;
    const pending = rs.filter(r => r.status === 'pending').sort(S.byNewest);
    const today = rs.filter(r => !['cancelled', 'rejected', 'revise'].includes(r.status) && new Date(r.startAt) <= new Date(new Date().setHours(23, 59, 59)) && new Date(r.endAt) >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.startAt.localeCompare(b.startAt));
    const vs = S.db.vehicles.filter(v => v.bookable !== false), st = vs.map(v => S.vehicleState(v).key);
    const alerts = [];
    rs.filter(r => r.status === 'ontrip').forEach(r => r.assignments.forEach(a => { if (a.status === 'ontrip' && now - new Date(r.endAt) > 30 * 6e4) alerts.push({ red: true, ic: 'clock', t: `${C.vName(a.vehicleId)} เลยเวลากลับแล้ว ${fmt.dur(now - new Date(r.endAt))} (ยังไม่กดกลับถึง)`, h: `#/admin/requests/${r.id}` }); }));
    rs.filter(r => r.status === 'approved' && r.assignments.some(a => a.status === 'assigned') && now - new Date(r.startAt) > 60 * 6e4).forEach(r => alerts.push({ ic: 'navigation', t: `${r.id} ถึงเวลาออกเดินทางแล้วแต่คนขับยังไม่กดออกเดินทาง`, h: `#/admin/requests/${r.id}` }));
    rs.filter(r => r.order && r.status === 'pending').forEach(r => alerts.push({ red: true, ic: 'send', t: `${r.id} คำสั่งงานจาก ${esc(r.order.byName)} — รอจัดรถ/คนขับ`, h: `#/admin/requests/${r.id}` }));
    rs.filter(r => r.medical && !r.medical.ack).forEach(r => alerts.push({ red: true, ic: 'alert', t: `${r.id} งานฉุกเฉินนำส่งผู้ป่วย (${esc(C.vName((r.assignments[0] || {}).vehicleId))} · ${esc(C.dName((r.assignments[0] || {}).driverId))}) — รอแอดมินรับทราบ`, h: `#/admin/requests/${r.id}` }));
    rs.filter(r => r.status === 'approved' && r.assignments.some(a => !a.driverId)).forEach(r => alerts.push({ ic: 'wheel', t: `${r.id} ยังไม่ได้ระบุคนขับ`, h: `#/admin/requests/${r.id}` }));
    // คนขับแจ้งปัญหาตอนตรวจรถก่อนออกเดินทาง (3 วันล่าสุด)
    rs.forEach(r => (r.assignments || []).forEach(a => { if (a.check && !a.check.ok && !a.check.skipped && now - new Date(a.check.at) < 3 * DAY) alerts.push({ red: true, ic: 'shield', t: `${C.vName(a.vehicleId)} · คนขับแจ้งปัญหาก่อนออกเดินทาง: ${[...(a.check.miss || []), a.check.note].filter(Boolean).join(', ')}`, h: `#/admin/requests/${r.id}` }); }));
    Object.values(S.db.vprivate).forEach(p => {
      const v = S.vehicle(p.id); if (!v) return;
      [['actExpiry', 'พ.ร.บ.'], ['taxExpiry', 'ภาษีรถ']].forEach(([k, l]) => { if (p[k]) { const d = daysTo(p[k]); if (d <= 30) alerts.push({ red: d <= 7, ic: 'shield', t: `${v.name} · ${l} ${d < 0 ? `หมดอายุแล้ว ${-d} วัน` : `จะหมดอายุในอีก ${d} วัน`} (${fmt.date(p[k])})`, h: `#/admin/vehicles/${v.id}?tab=private` }); } });
      if (p.insurance && p.insurance.expiry) { const d = daysTo(p.insurance.expiry); if (d <= 30) alerts.push({ red: d <= 7, ic: 'shield', t: `${v.name} · ประกันภัย ${d < 0 ? 'หมดอายุแล้ว' : `จะหมดอายุในอีก ${d} วัน`} (${fmt.date(p.insurance.expiry)})`, h: `#/admin/vehicles/${v.id}?tab=private` }); }
      svcStatus(v.id, p).filter(x => x.over || x.soon).forEach(x => alerts.push({ red: x.over, ic: 'wrench', t: `${v.name} · ${x.over ? 'ถึงกำหนด' : 'ใกล้ถึง'}${x.m.item || 'เช็คระยะ'} — ${x.text}${x.odo != null ? ` (ไมล์ล่าสุด ${fmt.num(x.odo)})` : ''}`, h: `#/admin/vehicles/${v.id}?tab=private` }));
    });
    S.db.drivers.forEach(d => { if (d.licenseExpiry && daysTo(d.licenseExpiry) <= 30) alerts.push({ red: daysTo(d.licenseExpiry) <= 7, ic: 'user', t: `ใบขับขี่ ${d.name} ${daysTo(d.licenseExpiry) < 0 ? 'หมดอายุแล้ว' : `จะหมดอายุในอีก ${daysTo(d.licenseExpiry)} วัน`}`, h: '#/admin/drivers' }); });
    // กลับถึงแล้ว (ปิดงานอัตโนมัติ) แต่ยังไม่มีค่าน้ำมัน/ค่าใช้จ่าย ภายใน 3 วัน → เตือนให้บันทึก
    const toClose = rs.filter(r => ['returned', 'closed'].includes(r.status) && !(r.expenses || []).length && (r.status === 'returned' || (r.closedAt && Date.now() - new Date(r.closedAt) < 3 * DAY)));
    return {
      layout: 'admin',
      html: `${head('ระบบหลังบ้าน', 'ภาพรวมวันนี้', fmt.dateLong(now), `<a class="btn btn-ghost btn-sm" href="#/admin/new">${icon('alert')} บันทึกคำขอเร่งด่วน</a>`)}
        ${!S.db.vehicles.length && S.isSuper(S.me) ? `<div class="note-box navy" style="margin-bottom:18px">${icon('info')}<div><b>ยังไม่มีข้อมูลรถในระบบ</b> — นำเข้ารถ 14 คันและพนักงานขับรถ 7 คนจากตารางข้อมูลรถของโรงเรียนได้เลย (แก้ไขภายหลังได้)<div style="margin-top:10px"><button class="btn btn-primary btn-sm" id="importBtn">${icon('download')} นำเข้าข้อมูลเริ่มต้น</button></div></div></div>` : ''}
        <div class="kpis">
          <a class="kpi" href="#/admin/requests?f=pending" style="--kb:#ede7fe;--kc:#6d28d9"><span class="k-ic">${icon('clipboard')}</span><b class="num">${pending.length}<em>รายการ</em></b><span class="l">คำขอรอตรวจสอบ</span></a>
          <div class="kpi"><span class="k-ic">${icon('route')}</span><b class="num">${today.length}<em>รายการ</em></b><span class="l">การเดินทางวันนี้</span></div>
          <div class="kpi" style="--kb:#ffe7d4;--kc:#c2410c"><span class="k-ic">${icon('activity')}</span><b class="num">${st.filter(k => k === 'ontrip').length}<em>คัน</em></b><span class="l">กำลังเดินทาง</span></div>
          <div class="kpi" style="--kb:#d9f5e8;--kc:#047857"><span class="k-ic">${icon('van')}</span><b class="num">${st.filter(k => k === 'free').length}<em>/ ${vs.length}</em></b><span class="l">รถว่างตอนนี้</span></div>
        </div>
        ${alerts.length ? `<div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('alert')} ต้องดำเนินการ / แจ้งเตือน</h3><span class="pill tone-bad">${alerts.length}</span></div><div class="alert-list">${alerts.map(a => `<a class="alert-row ${a.red ? 'red' : ''}" href="${a.h}">${icon(a.ic)}<span>${esc(a.t)}</span>${icon('chevR')}</a>`).join('')}</div></div>` : ''}
        <div class="split" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('clipboard')} คำขอรอตรวจสอบ</h3><a class="link" href="#/admin/requests?f=pending">ดูทั้งหมด</a></div>
            <div class="stack">${pending.slice(0, 6).map(r => C.reqCard(r, `#/admin/requests/${r.id}`)).join('') || UI.empty('ไม่มีคำขอรอตรวจสอบ', 'checkCircle')}</div>
            ${toClose.length ? `<div class="divider"></div><div class="card-head"><h3>${icon('fuel')} กลับถึงแล้ว ยังไม่บันทึกค่าน้ำมัน</h3><span class="pill tone-done">${toClose.length}</span></div><div class="stack">${toClose.slice(0, 5).map(r => C.reqCard(r, `#/admin/requests/${r.id}`)).join('')}</div>` : ''}
          </div>
          <div class="card"><div class="card-head"><h3>${icon('grid')} ลานจอดรถตอนนี้</h3><a class="link" href="#/schedule">ตารางรถ</a></div>${C.lot(vs, { list: false })}
            <div class="divider"></div><div class="card-head"><h3>${icon('route')} วันนี้</h3></div>
            <div class="stack">${today.map(r => `<a class="lot-row" href="#/admin/requests/${r.id}">${icon('clock')}<div style="min-width:0"><b>${fmt.time(r.startAt)}–${fmt.when(r.endAt)}</b><small>${esc(S.destName(r))} · ${(r.assignments || []).map(a => esc(C.vName(a.vehicleId))).join(', ') || 'รอจัดรถ'}</small></div>${C.statusPill(r)}</a>`).join('') || UI.empty('วันนี้ไม่มีรายการ', 'calendar')}</div>
          </div>
        </div>`,
      mount(root) { $('#importBtn', root)?.addEventListener('click', e => UI.busy(e.currentTarget, () => S.importDefaults()).then(() => UI.toast('นำเข้าข้อมูลเริ่มต้นแล้ว')).catch(() => {})); }
    };
  };

  // ═════════ ตารางเวรคนขับ (รวมทุกคน) ═════════
  // ตารางงานคนขับ (คนขับ × วัน) — ใช้ทั้งหน้าตารางงานคนขับ และหน้าต่างซ้อนตอนจัดรถ (hl = ช่วงวันของคำขอที่กำลังจัด)
  function rosterGrid(days, view, { sel = days[0], hl = null, links = true } = {}) {
    const ds = S.db.drivers.filter(d => d.active !== false && !d.standby).sort((a, b) => (a.order || 0) - (b.order || 0));
    const rows = ds.map(d => { const jobs = Pages._driverJobs(d.id); return { d, cells: days.map(day => { const list = Pages._jobsOn(jobs, day); return { day, list, s: Pages._daySummary(list, day) }; }) }; });
    const inHl = day => hl && new Date(hl[0]) <= new Date(day.getTime() + 864e5 - 1) && new Date(hl[1]) >= day;
    const cls = day => `${UI.sameDay(day, new Date()) ? 'today' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'we' : ''} ${inHl(day) ? 'hl' : ''}`;
    return `<div class="tbl-wrap"><table class="roster r-${view}">
          <thead><tr><th class="rn">คนขับ</th>${days.map(day => `<th class="${cls(day)}">${view === 'week' ? `${day.toLocaleDateString('th-TH', { weekday: 'short' })}<b>${day.getDate()}</b>` : `<b>${day.getDate()}</b>${day.toLocaleDateString('th-TH', { weekday: 'narrow' })}`}</th>`).join('')}<th>รวม</th></tr></thead>
          <tbody>${rows.map(({ d, cells }) => { const nm = `<b>${esc(d.name)}</b><small>${S.db.vehicles.filter(v => v.driverId === d.id).map(v => esc(v.name)).join(', ') || '—'}</small>`; return `<tr><td class="rn">${links ? `<a href="#/driver?tab=cal&d=${d.id}&view=${view}&date=${fmt.localDate(sel)}">${nm}</a>` : nm}</td>
            ${cells.map(c => `<td class="${cls(c.day)}">${c.s.n ? `<button type="button" class="rc lv${Math.min(3, c.s.n)} ${c.s.live ? 'live' : ''}" data-cell="${d.id}|${fmt.localDate(c.day)}" title="${esc(c.list.map(j => `${fmt.time(j.r.startAt)} ${S.destName(j.r)}`).join('\n'))}">${view === 'week' ? `<span>${icon('van')}<b>${c.s.n}</b> งาน</span><small>${c.s.first || (c.s.cont ? 'ต่อเนื่อง' : '')}</small>${c.list[0] ? `<em>${esc(S.destName(c.list[0].r).slice(0, 18))}</em>` : ''}` : `<b>${c.s.n}</b>`}</button>` : '<span class="rz">·</span>'}</td>`).join('')}
            <td class="rt"><b>${cells.reduce((s, c) => s + c.s.n, 0)}</b></td></tr>`; }).join('')}</tbody>
        </table></div>`;
  }
  // กดช่องในตาราง → งานของคนขับคนนั้นในวันนั้น
  function cellModal(cell, { calendar = true } = {}) {
    const [dId, ds] = cell.split('|'), day = new Date(ds + 'T00:00:00'), d = S.driver(dId);
    const list = Pages._jobsOn(Pages._driverJobs(dId), day);
    return UI.modal({ title: `${icon('wheel')} ${esc(d.name)} · ${fmt.dateLong(day)}`, size: 'lg', body: `<div class="stack">${list.map(j => `<div>${C.pass(j.r, { href: `#/admin/requests/${j.r.id}` })}<p class="hint" style="margin:6px 4px 0">${icon('van')} คันที่ขับ: <b>${esc(C.vName(j.a.vehicleId))}</b> · ${S.ASSIGN[j.a.status]}${j.a.note ? ` · หมายเหตุ: ${esc(j.a.note)}` : ''}</p></div>`).join('')}</div>`,
      actions: calendar ? [{ label: 'ปิด', value: null }, { label: 'เปิดปฏิทินของคนขับ', kind: 'btn-primary', icon: 'calendar', onClick: () => { location.hash = `#/driver?tab=cal&d=${dId}&view=month&date=${ds}`; return true; } }] : [{ label: 'ปิด', value: null }] });
  }
  // หน้าต่างซ้อน: ตารางงานคนขับรายสัปดาห์ ระหว่างจัดรถ (เลื่อนสัปดาห์ได้ · ปิดแล้วกลับมาจัดรถต่อ ข้อมูลที่เลือกไว้ไม่หาย)
  function rosterModal(r) {
    const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; };
    const s0 = new Date(r.startAt); let start = addD(s0, -s0.getDay());
    const draw = el => {
      const days = Array.from({ length: 7 }, (_, i) => addD(start, i));
      el.querySelector('#rmT').textContent = `${fmt.dayMonth(days[0])} – ${fmt.date(days[6])}`;
      el.querySelector('#rmG').innerHTML = rosterGrid(days, 'week', { hl: [r.startAt, r.endAt], links: false });
    };
    return UI.modal({ title: `${icon('calendar')} ตารางงานคนขับ`, size: 'xl',
      body: `<div class="toolbar rm-bar"><div class="row"><button type="button" class="icon-btn sm" data-wk="-7" aria-label="สัปดาห์ก่อน">${icon('chevL')}</button><b id="rmT"></b><button type="button" class="icon-btn sm" data-wk="7" aria-label="สัปดาห์ถัดไป">${icon('chevR')}</button><button type="button" class="btn btn-ghost btn-sm" data-wk="0">สัปดาห์ของคำขอนี้</button></div>
        <span class="hint"><i class="rm-hl"></i> วันที่ขอใช้รถ · กดช่องเพื่อดูงาน</span></div><div id="rmG"></div>`,
      actions: [{ label: 'ปิด', value: null }],
      onOpen(el) {
        draw(el);
        el.addEventListener('click', e => {
          const w = e.target.closest('[data-wk]'); if (w) { start = +w.dataset.wk ? addD(start, +w.dataset.wk) : addD(s0, -s0.getDay()); draw(el); return; }
          const b = e.target.closest('[data-cell]'); if (b) cellModal(b.dataset.cell, { calendar: false });
        });
      } });
  }
  Pages.adminRoster = ({ query }) => {
    const view = query.view === 'month' ? 'month' : 'week';
    const sel = UI.dayOf(query.date);
    const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; };
    const start = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth(), 1) : addD(sel, -sel.getDay());
    const days = view === 'month' ? Array.from({ length: new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate() }, (_, i) => addD(start, i)) : Array.from({ length: 7 }, (_, i) => addD(start, i));
    const prev = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() - 1, 1) : addD(sel, -7);
    const next = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() + 1, 1) : addD(sel, 7);
    const qs = o => '#/admin/roster?' + new URLSearchParams({ view, date: fmt.localDate(sel), ...o });
    // งานที่ยังไม่ได้ระบุคนขับ
    const noDriver = S.db.requests.filter(r => ['approved', 'ontrip'].includes(r.status) && (r.assignments || []).some(a => !a.driverId) && days.some(day => new Date(r.startAt) <= new Date(day.getTime() + 864e5 - 1) && new Date(r.endAt) >= day));
    return {
      layout: 'admin',
      html: `${head('งานประจำวัน', 'ตารางงานคนขับ', 'ดูว่าแต่ละวันคนขับมีงานกี่งาน ใครว่าง ใครงานแน่น · กดช่องเพื่อดูรายละเอียด')}
        <div class="toolbar"><div class="row"><a class="icon-btn sm" href="${qs({ date: fmt.localDate(prev) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
          <b style="font-family:var(--font-display);min-width:220px;text-align:center">${view === 'month' ? sel.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : `${fmt.dayMonth(days[0])} – ${fmt.date(days[6])}`}</b>
          <a class="icon-btn sm" href="${qs({ date: fmt.localDate(next) })}" aria-label="ถัดไป">${icon('chevR')}</a><a class="btn btn-ghost btn-sm" href="${qs({ date: fmt.localDate(new Date()) })}">วันนี้</a></div>
          <div class="seg"><a href="${qs({ view: 'week' })}"><button class="${view === 'week' ? 'on' : ''}" tabindex="-1">สัปดาห์</button></a><a href="${qs({ view: 'month' })}"><button class="${view === 'month' ? 'on' : ''}" tabindex="-1">เดือน</button></a></div></div>
        ${noDriver.length ? `<div class="note-box red" style="margin-bottom:14px">${icon('alert')}<div>มี <b>${noDriver.length}</b> งานในช่วงนี้ที่ยังไม่ได้ระบุคนขับ: ${noDriver.map(r => `<a class="link" href="#/admin/requests/${r.id}">${r.id}</a>`).join(', ')}</div></div>` : ''}
        <div class="card" style="padding:8px">${rosterGrid(days, view, { sel })}</div>
        <div class="g-legend" style="display:flex;gap:16px;margin-top:10px;color:var(--muted);font-size:.82rem;flex-wrap:wrap"><span><span class="rc lv1" style="display:inline-block;width:18px;height:12px;padding:0"></span> 1 งาน</span><span><span class="rc lv2" style="display:inline-block;width:18px;height:12px;padding:0"></span> 2 งาน</span><span><span class="rc lv3" style="display:inline-block;width:18px;height:12px;padding:0"></span> 3 งานขึ้นไป</span><span><span class="rc live" style="display:inline-block;width:18px;height:12px;padding:0"></span> กำลังเดินทาง</span><span>กดชื่อคนขับ = เปิดปฏิทินของคนนั้น</span></div>`,
      mount(root) {
        root.addEventListener('click', e => { const b = e.target.closest('[data-cell]'); if (b) cellModal(b.dataset.cell); });
      }
    };
  };

  // ═════════ รายการคำขอ ═════════
  Pages.adminRequests = ({ query }) => {
    const kq = query.k || (query.em ? 'em' : '');
    const f = query.md || kq ? 'all' : (query.f || 'pending'), q = (query.q || '').trim(), m = query.m || '', df = query.df || '', dt = query.dt || '', cf = query.c || '', sg = query.sg || '', md = query.md || '', em = query.em || '';
    // กลับถึงโรงเรียน = ปิดงานอัตโนมัติ (ไม่มีแท็บ "รอปิดงาน" · ข้อมูลเก่าสถานะ returned รวมอยู่ใน "ปิดงานแล้ว")
    const G = { pending: ['pending'], revise: ['revise'], approved: ['approved'], ontrip: ['ontrip'], closed: ['returned', 'closed'], rejected: ['rejected', 'cancelled'], all: null };
    const KIND = { em: r => !!r.medical, sp: r => !!r.supply, gb: r => !!r.garbage, or: r => !!r.order };
    let list = S.db.requests.filter(r => (!G[f] || G[f].includes(r.status)) && (kq === 'gb' || !r.garbage));
    if (KIND[kq]) list = list.filter(KIND[kq]);
    if (m) list = list.filter(r => r.startAt.slice(0, 7) === m);
    // ช่วงวันที่เดินทาง (ตั้งแต่ – ถึง) · เลือกวันเดียวก็ได้
    if (df) list = list.filter(r => fmt.localDate(r.endAt) >= df);
    if (dt) list = list.filter(r => fmt.localDate(r.startAt) <= dt);
    if (cf) list = list.filter(r => (r.category || '') === (cf === 'none' ? '' : cf));
    // ฉบับลงนาม: no = อนุมัติแล้วแต่ยังไม่แนบฉบับลงนาม · yes = เก็บฉบับลงนามแล้ว
    const hasSig = r => (r.signed || []).length > 0;
    if (sg) list = list.filter(r => C.canMemo(r) && (sg === 'yes' ? hasSig(r) : !hasSig(r)));
    // ติดตามคำขอเร่งด่วนที่ยังค้างบันทึกข้อความ
    const debtN = S.db.requests.filter(S.needsMemo).length;
    if (md) list = list.filter(S.needsMemo);
    // งานฉุกเฉินนำส่งผู้ป่วย
    const emN = S.db.requests.filter(r => r.medical).length, emWait = S.db.requests.filter(r => r.medical && !r.medical.ack).length;
    if (q) list = list.filter(r => [r.id, r.purpose, r.requester.name, r.requester.dept, S.destName(r)].join(' ').toLowerCase().includes(q.toLowerCase()));
    list.sort(S.byNewest);   // ทุกแท็บ: ส่งคำขอล่าสุดก่อน
    const cnt = k => S.db.requests.filter(r => !r.garbage && (!G[k] || G[k].includes(r.status))).length;
    const qs = o => '#/admin/requests?' + new URLSearchParams({ f, q, m, df, dt, c: cf, sg, md, k: kq, ...o });
    const kN = k => S.db.requests.filter(KIND[k]).length, orWait = S.db.requests.filter(r => r.order && r.status === 'pending').length;
    const printable = list;
    return {
      layout: 'admin',
      html: `${head('คำขอใช้รถ', 'รายการคำขอใช้รถ', 'ตรวจบันทึกข้อความ อนุมัติ และมอบหมายรถ/คนขับ', `<button class="btn btn-ghost btn-sm" id="daySum">${icon('image')} สรุปรายวัน</button><a class="btn btn-primary btn-sm" href="#/admin/new">${icon('plus')} บันทึกคำขอเร่งด่วน</a><button class="btn btn-danger btn-sm" id="medNew">${icon('alert')} บันทึกงานฉุกเฉิน (นำส่งผู้ป่วย)</button>`)}
        <div class="toolbar"><div class="seg">${[['pending', 'รอตรวจสอบ'], ['revise', 'ส่งกลับแก้ไข'], ['approved', 'อนุมัติแล้ว'], ['ontrip', 'กำลังเดินทาง'], ['closed', 'ปิดงานแล้ว'], ['rejected', 'ไม่อนุมัติ/ยกเลิก'], ['all', 'ทั้งหมด']].map(([k, l]) => `<a href="${qs({ f: k, md: '', k: '' })}"><button class="${f === k && !md && !kq ? 'on' : ''}" tabindex="-1">${k !== 'all' ? `<i class="sd rs-${k}"></i>` : ''}${l} ${cnt(k)}</button></a>`).join('')}</div>
          ${debtN || md ? `<a class="chip-debt ${md ? 'on' : ''}" href="${qs({ md: md ? '' : '1', k: '', f: md ? 'pending' : 'all' })}">${icon('alert')} ค้างบันทึกข้อความ <b>${debtN}</b></a>` : ''}
          <a class="chip-debt chip-em ${kq === 'em' ? 'on' : ''}" href="${qs({ k: kq === 'em' ? '' : 'em', md: '', f: kq === 'em' ? 'pending' : 'all' })}">${icon('alert')} งานฉุกเฉิน <b>${emN}</b>${emWait ? `<span class="em-wait">รอรับทราบ ${emWait}</span>` : ''}</a>
          <a class="chip-debt chip-or ${kq === 'or' ? 'on' : ''}" href="${qs({ k: kq === 'or' ? '' : 'or', md: '', f: kq === 'or' ? 'pending' : 'all' })}">${icon('send')} คำสั่ง ผอ. <b>${kN('or')}</b>${orWait ? `<span class="em-wait">รอจัดรถ ${orWait}</span>` : ''}</a>
          <a class="chip-debt chip-sp ${kq === 'sp' ? 'on' : ''}" href="${qs({ k: kq === 'sp' ? '' : 'sp', md: '', f: kq === 'sp' ? 'pending' : 'all' })}">${icon('package')} ซื้อ/รับของ <b>${kN('sp')}</b></a>
          <a class="chip-debt chip-gb ${kq === 'gb' ? 'on' : ''}" href="${qs({ k: kq === 'gb' ? '' : 'gb', md: '', f: kq === 'gb' ? 'pending' : 'all' })}">${icon('truck')} รถขยะ <b>${kN('gb')}</b></a></div>
        <div class="toolbar"><div class="search-in">${icon('search')}<input class="input" id="q" placeholder="ค้นหา เลขที่ ผู้ขอ ฝ่าย ปลายทาง" value="${esc(q)}"></div><div class="dr-pick" title="ช่วงวันที่เดินทาง"><label>ตั้งแต่<input class="input" type="date" id="df" value="${esc(df)}"></label><span>–</span><label>ถึง<input class="input" type="date" id="dt" value="${esc(dt)}" ${df ? `min="${esc(df)}"` : ''}></label>${df || dt || m ? `<a class="chip-x" href="${qs({ df: '', dt: '', m: '' })}" title="ล้างช่วงวันที่">${icon('x')}</a>` : `<a class="chip-x today" href="${qs({ df: fmt.localDate(new Date()), dt: fmt.localDate(new Date()) })}">วันนี้</a>`}</div><select class="input" id="cf" style="width:auto"><option value="">ทุกหมวดงาน</option>${S.categories(true).map(c => `<option value="${c.id}" ${c.id === cf ? 'selected' : ''}>${esc(c.id === 'other' ? 'อื่น ๆ' : c.name)}</option>`).join('')}<option value="none" ${cf === 'none' ? 'selected' : ''}>ไม่ระบุหมวด</option></select>
          <select class="input" id="sg" style="width:auto" title="บันทึกข้อความฉบับลงนาม"><option value="">ฉบับลงนาม: ทั้งหมด</option><option value="no" ${sg === 'no' ? 'selected' : ''}>ยังไม่มีฉบับลงนาม</option><option value="yes" ${sg === 'yes' ? 'selected' : ''}>เก็บฉบับลงนามแล้ว</option></select>
          <button class="btn btn-primary btn-sm" id="memoBatch" ${printable.length ? '' : 'disabled'}>${icon('printer')} <span>พิมพ์ / PDF</span></button><button class="btn btn-ghost btn-sm" id="xls">${icon('download')} Excel</button></div>
        ${printable.length ? `<p class="hint" style="margin:-4px 0 10px">${icon('info')} ติ๊กเลือกรายการที่ต้องการพิมพ์ (บันทึกข้อความมีครุฑ / หัวกระดาษโรงเรียน / ตารางสรุป) — ไม่เลือก = พิมพ์ทั้งหมด ${printable.length} รายการในรายการนี้</p>` : ''}
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="ck">${printable.length ? `<input type="checkbox" id="pickAll" aria-label="เลือกทั้งหมด">` : ''}</th><th>เลขที่</th><th>วันเวลา</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอ</th><th>ผู้เดินทาง</th><th>รถ / คนขับ</th><th>สถานะ</th></tr></thead>
          <tbody>${list.map(r => `<tr class="click rs-${r.status}" data-href="#/admin/requests/${r.id}">
            <td class="ck"><input type="checkbox" data-pick="${r.id}" aria-label="เลือก ${r.id}"></td>
            <td><b style="white-space:nowrap">${r.id}</b>${r.medical ? `<small style="color:var(--bad)">ฉุกเฉิน · นำส่งผู้ป่วย${r.medical.ack ? '' : ' · รอรับทราบ'}</small>` : r.emergency ? '<small style="color:var(--bad)">เร่งด่วน</small>' : ''}${r.order ? `<small><span class="kind-tag or">คำสั่ง ผอ.</span></small>` : r.supply ? '<small><span class="kind-tag sp">ซื้อ/รับของ</span></small>' : r.garbage ? '<small><span class="kind-tag gb">รถขยะ</span></small>' : ''}${S.needsMemo(r) ? '<small style="color:var(--bad)">ค้างบันทึกข้อความ</small>' : ''}${C.canMemo(r) ? (hasSig(r) ? '<small style="color:var(--ok)">✓ มีฉบับลงนาม</small>' : '<small style="color:var(--gold-700)">ยังไม่มีฉบับลงนาม</small>') : ''}<small>ส่ง ${fmt.date(r.createdAt)}</small></td>
            <td><b>${fmt.date(r.startAt)}</b><small>${fmt.time(r.startAt)} – ${fmt.when(r.endAt)}</small>${S.tripTag(r) ? `<small>${S.tripTag(r).text}</small>` : ''}</td>
            <td><b>${esc(S.destName(r))}</b><small>${esc(r.purpose)}</small><small style="color:var(--gold-700)">${esc(S.catName(r))}</small></td>
            <td>${esc(r.requester.name)}<small>${esc(r.requester.dept || '')}</small></td>
            <td>${S.passengers(r)} คน<small>ครู ${r.teachers} · นร. ${r.students}${+r.others ? ` · อื่น ${r.others}` : ''}</small></td>
            <td>${(r.assignments || []).map(a => `${esc(C.vName(a.vehicleId))}<small>${esc(C.dName(a.driverId))}</small>`).join('') || '<small>—</small>'}</td>
            <td>${C.statusPill(r)}</td></tr>`).join('') || `<tr><td colspan="8">${UI.empty('ไม่มีรายการ', 'clipboard')}</td></tr>`}</tbody>
        </table></div></div>`,
      mount(root) {
        root.addEventListener('click', e => { if (e.target.closest('.ck')) return; const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; });
        // เลือกหลายรายการ → พิมพ์บันทึกข้อความต่อกัน (1 ฉบับต่อหน้า)
        const picked = () => $$('[data-pick]:checked', root).map(x => x.dataset.pick);
        const syncBtn = () => { const n = picked().length; $('#memoBatch span', root).textContent = n ? `พิมพ์ / PDF (${n} รายการ)` : 'พิมพ์ / PDF'; const all = $('#pickAll', root); if (all) { const t = $$('[data-pick]', root).length; all.checked = n > 0 && n === t; all.indeterminate = n > 0 && n < t; } };
        root.addEventListener('change', e => {
          if (e.target.id === 'pickAll') $$('[data-pick]', root).forEach(x => { x.checked = e.target.checked; });
          if (e.target.id === 'pickAll' || e.target.dataset.pick) syncBtn();
        });
        $('#memoBatch', root).addEventListener('click', async () => {
          const ids = picked();
          const rs = ids.length ? ids.map(S.request).filter(Boolean) : printable;
          const tabName = { pending: 'รอตรวจสอบ', revise: 'ส่งกลับแก้ไข', approved: 'อนุมัติแล้ว', ontrip: 'กำลังเดินทาง', closed: 'ปิดงานแล้ว', rejected: 'ไม่อนุมัติ/ยกเลิก', all: 'ทุกสถานะ' }[f] || '';
          C.printDialog(rs, { sub: ids.length ? 'รายการที่เลือก' : `${cf ? S.catName({ category: cf }) : 'ทุกหมวด'} · ${tabName}${df || dt ? ` · ${df ? fmt.date(df) : '…'} – ${dt ? fmt.date(dt) : '…'}` : ''}` });
        });
        $('#sg', root).addEventListener('change', e => { location.hash = qs({ sg: e.target.value }); });
        $('#daySum', root).addEventListener('click', () => dailySummary(new Date()));
        $('#medNew', root).addEventListener('click', async () => { const r = await Pages._medicalModal({ admin: true }); if (r) location.hash = '#/admin/requests/' + r.id; });
        $('#q', root).addEventListener('input', UI.debounce(e => { location.hash = qs({ q: e.target.value }); }, 450));
        $('#df', root).addEventListener('change', e => { const v = e.target.value, t = $('#dt', root).value; location.hash = qs({ m: '', df: v, dt: t && v && t < v ? v : t }); });
        $('#dt', root).addEventListener('change', e => { location.hash = qs({ m: '', dt: e.target.value }); });
        $('#cf', root).addEventListener('change', e => { location.hash = qs({ c: e.target.value }); });
        $('#xls', root).addEventListener('click', () => UI.exportSheets('คำขอใช้รถ', [{ name: 'คำขอใช้รถ', head: ['เลขที่', 'สถานะ', 'ออกเดินทาง', 'กลับ', 'ปลายทาง', 'จังหวัด', 'หมวดงาน', 'วัตถุประสงค์', 'ผู้ขอ', 'ฝ่าย', 'ครู', 'นักเรียน', 'อื่นๆ', 'ระยะทาง(กม.)', 'รถ', 'คนขับ', 'หมายเหตุแอดมิน'], rows: list.map(r => [r.id, S.STATUS[r.status].label, fmt.dt(r.startAt), fmt.dt(r.endAt), S.destName(r), (r.destinations[0] || {}).province || '', S.catName(r), r.purpose, r.requester.name, r.requester.dept, r.teachers, r.students, r.others || 0, r.totalKm, (r.assignments || []).map(a => C.vName(a.vehicleId)).join(', '), (r.assignments || []).map(a => C.dName(a.driverId)).join(', '), r.decision ? r.decision.note : '']) }]));
      }
    };
  };

  // ───────── ตัวเลือกรถหลายคัน + คนขับ + หมายเหตุรายคัน ─────────
  function vehiclePickerHTML(r, current) {
    const sel = new Map((current || []).map(a => [a.vehicleId, a]));
    const vs = S.db.vehicles.slice().sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || (a.order || 0) - (b.order || 0));
    return `<div class="av-pick" id="avPick">${vs.map(v => {
      const c = r.startAt ? S.vehicleConflicts(v.id, r.startAt, r.endAt, r.id, S.windows(r)) : [];
      const a = sel.get(v.id) || {};
      const busy = c.length > 0;
      const dId = a.driverId || v.driverId || '';
      const extra = !S.PASSENGER_KINDS.includes(v.kind) && !sel.has(v.id);
      return `<div class="av-row ${sel.has(v.id) ? 'on' : ''} ${busy && !sel.has(v.id) ? 'busy' : ''} ${extra ? 'extra' : ''}" data-v="${v.id}" ${extra ? 'hidden' : ''}>
        <input type="checkbox" ${sel.has(v.id) ? 'checked' : ''} aria-label="เลือก ${esc(v.name)}">
        <div><b>${icon(kindIcon(v.kind))} ${esc(v.name)}</b><small>${esc(v.plate)} · <b style="display:inline">${v.seats}</b> ที่นั่ง</small>${busy ? `<small class="bad">${icon('alert')} ${c.map(x => x.maint ? esc(x.dest) : `ไม่ว่าง: ${x.id} ${esc(S.destName(x))}`).join(', ')}</small>` : '<small style="color:var(--ok)">ว่างในช่วงเวลานี้</small>'}</div>
        <select data-drv aria-label="คนขับ"><option value="">— เลือกคนขับ —</option>${S.db.drivers.filter(d => d.active !== false && !d.standby).map(d => { const dc = r.startAt ? S.driverConflicts(d.id, r.startAt, r.endAt, r.id, S.windows(r)) : []; return `<option value="${d.id}" ${d.id === dId ? 'selected' : ''}>${esc(d.name)}${dc.length ? ' (ติดงาน ' + dc.map(x => x.id).join(',') + ')' : ''}</option>`; }).join('')}</select>
        <input type="text" data-note placeholder="หมายเหตุถึงผู้ขอ เช่น คันนี้นั่งได้ ${v.seats} คน" value="${esc(a.note || '')}">
        <span></span>
      </div>`;
    }).join('')}</div>
    ${vs.some(v => !S.PASSENGER_KINDS.includes(v.kind) && !sel.has(v.id)) ? `<button type="button" class="btn btn-ghost btn-sm" id="avMore" style="margin-top:10px">${icon('plus')} แสดงรถประเภทอื่น (กระบะ / รถเฉพาะกิจ)</button>` : ''}
    <div class="seat-meter" id="seatMeter" style="margin-top:12px"></div>`;
  }
  function bindVehiclePicker(root, getPax) {
    const box = $('#avPick', root);
    const meter = () => {
      const chosen = read();
      const seats = S.seatsOf(chosen), pax = getPax();
      const m = $('#seatMeter', root);
      m.classList.toggle('short', seats < pax);
      m.innerHTML = `${icon('seat')}<span>ที่นั่งรวม <b>${seats}</b> / ผู้เดินทาง <b>${pax}</b> คน</span><span class="bar"><i style="width:${pax ? Math.min(100, seats / pax * 100) : 0}%"></i></span>${seats < pax ? `<b style="color:var(--bad)">ที่นั่งไม่พอ ${pax - seats} ที่</b>` : chosen.length ? `<b style="color:var(--ok)">เพียงพอ</b>` : ''}`;
    };
    const read = () => $$('.av-row', box).filter(row => row.querySelector('input[type=checkbox]').checked).map(row => ({ vehicleId: row.dataset.v, driverId: row.querySelector('[data-drv]').value, note: row.querySelector('[data-note]').value }));
    box.addEventListener('change', e => { const row = e.target.closest('.av-row'); if (row && e.target.type === 'checkbox') row.classList.toggle('on', e.target.checked); meter(); });
    $('#avMore', root)?.addEventListener('click', e => { $$('.av-row.extra', box).forEach(r => { r.hidden = false; }); e.currentTarget.remove(); });
    meter();
    return { read, meter };
  }

  // หมวดงานแบบช่องเลือก (ประหยัดพื้นที่)
  function catSelect(sel = '', other = '') {
    const cats = S.categories(); if (sel && !cats.some(c => c.id === sel) && S.catOf(sel)) cats.push(S.catOf(sel));
    return `<select class="input" name="dcat">${sel ? '' : '<option value="">— เลือกหมวดงาน —</option>'}${cats.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.id === 'other' ? 'อื่น ๆ (ระบุ)' : c.name)}</option>`).join('')}</select>
      <input class="input" name="dcatOther" placeholder="ระบุหมวดงาน" value="${esc(other || '')}" ${sel === 'other' ? '' : 'hidden'} style="margin-top:8px">`;
  }
  // คนขับที่ติดงานในช่วงเวลาของคำขอนี้ (แดง + งานและเวลาแบบสั้น) · ปุ่มเปิดตารางงานคนขับแบบหน้าต่างซ้อน
  function driverDay(r) {
    if (!r.startAt) return '';
    const ds = S.db.drivers.filter(d => d.active !== false && !d.standby).map(d => ({ d, c: S.driverConflicts(d.id, r.startAt, r.endAt, r.id, S.windows(r)) }));
    const tm = x => `${fmt.time(x.startAt)}–${UI.sameDay(x.startAt, x.endAt) ? fmt.time(x.endAt) : fmt.dayMonth(x.endAt)}`;
    const free = ds.filter(x => !x.c.length), busy = ds.filter(x => x.c.length);
    return `<div class="drv-day"><div class="label dd-head"><span>${icon('wheel')} คนขับที่ติดงานช่วงนี้ <span class="hint">ติดงาน ${busy.length} · ว่าง ${free.length}</span></span><button type="button" class="btn btn-ghost btn-xs" data-roster>${icon('calendar')} ดูตารางงานคนขับ</button></div>
      <div class="dd-chips">${busy.length ? '' : '<span class="hint">ไม่มีคนขับติดงานในช่วงเวลานี้</span>'}${busy.map(x => `<span class="dd-chip bad" title="${esc(x.c.map(y => `${y.id} ${S.destName(y)}`).join(', '))}">${icon('xCircle')}${esc(C.firstName(x.d.name))} <small>${x.c.map(y => `${tm(y)} ${esc(S.destName(y))}`).join(', ')}</small></span>`).join('')}</div></div>`;
  }
  // ═════════ รายละเอียดคำขอ (แอดมิน) ═════════
  Pages.adminRequest = ({ params }) => {
    const r = S.request(params.id);
    if (!r) return { layout: 'admin', html: S.needHistory() ? histNote(true) : UI.empty('ไม่พบคำขอนี้') };   // คำขอเก่า → โหลดย้อนหลังก่อน
    const canDecide = ['pending', 'revise'].includes(r.status);
    const canReassign = ['approved', 'ontrip'].includes(r.status);
    const exp = r.expenses || [];
    const expTotal = exp.reduce((s, e) => s + (+e.amount || 0), 0);
    const post = ['ontrip', 'returned', 'closed'].includes(r.status) && (r.assignments || []).some(a => a.status !== 'assigned');
    const asgBtns = (a, i) => `${a.status === 'assigned' ? `<button class="btn btn-primary btn-xs" data-go="ontrip" data-i="${i}">${icon('navigation')} ออกเดินทาง</button>` : ''}
      ${a.status === 'ontrip' ? `<button class="btn btn-ok btn-xs" data-go="returned" data-i="${i}">${icon('home')} กลับถึงแล้ว</button>` : ''}
      ${a.status !== 'assigned' && r.status !== 'closed' ? `<button class="btn btn-ghost btn-xs" data-undo="${i}">${icon('undo')} ย้อนสถานะ</button>` : ''}
      <button class="btn btn-ghost btn-xs" data-odo="${i}">${icon('gauge')} เลขไมล์</button>`;
    const dur = (a, b) => { if (!a || !b) return ''; const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 6e4)); return `${Math.floor(m / 60)} ชม. ${m % 60} น.`; };
    // สรุปการเดินทาง: รายคัน ออก → กลับ · ไมล์ · ระยะทาง · ค่าใช้จ่าย · ครูลงชื่อ
    const tripSummary = () => {
      const rows = (r.assignments || []).map((a, i) => { const v = S.vehicle(a.vehicleId) || {}, d = S.driver(a.driverId), km = a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : null, xs = exp.filter(e => e.vehicleId === a.vehicleId), xsum = xs.reduce((s, e) => s + (+e.amount || 0), 0); return { a, i, v, d, km, xs, xsum }; });
      const kmAll = rows.reduce((s, x) => s + (x.km || 0), 0);
      return `<div class="card ts-card"><div class="card-head"><h3>${icon('route')} สรุปการเดินทาง</h3>
          <div class="ts-tot"><span>${icon('van')} ${rows.length} คัน</span><span>${icon('gauge')} ${kmAll ? fmt.num(kmAll) + ' กม.' : 'ยังไม่มีเลขไมล์'}</span><span>${icon('coins')} ${fmt.money(expTotal)} บาท</span></div></div>
        <div class="stack" style="gap:12px">${rows.map(({ a, i, v, d, km, xs, xsum }) => `<div class="ts-row">
          <div class="ts-veh"><div><b>${esc(v.name || '—')}</b> <small>${esc(v.plate || '')}</small><small class="ts-drv">${icon('wheel')} ${d ? esc(d.name) : 'ยังไม่ระบุคนขับ'}${d && d.phone ? ` · <a class="link" href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` : ''}</small></div><span class="pill tone-${a.status === 'ontrip' ? 'live pulse' : a.status === 'returned' ? 'done' : 'ok'}">${S.ASSIGN[a.status]}</span></div>
          <div class="ts-grid">
            <div><small>ออกเดินทาง</small><b>${a.departedAt ? fmt.when(a.departedAt) : '—'}</b><em>ไมล์ ${a.odoStart != null ? fmt.num(a.odoStart) : '—'}</em></div>
            <div><small>กลับถึง</small><b>${a.returnedAt ? fmt.when(a.returnedAt) : '—'}</b><em>ไมล์ ${a.odoEnd != null ? fmt.num(a.odoEnd) : '—'}</em></div>
            <div><small>ระยะทาง</small><b>${km != null ? fmt.num(km) + ' กม.' : '—'}</b><em>${dur(a.departedAt, a.returnedAt) || 'ใช้เวลา —'}</em></div>
            <div><small>ค่าใช้จ่าย</small><b>${fmt.money(xsum)} ฿</b><em>${xs.length} รายการ</em></div>
          </div>
          ${a.paxSign ? (a.paxSign.has ? `<div class="ps-show">${icon('edit')}<span>ครูผู้ร่วมเดินทางลงชื่อยืนยันกลับถึง <b>${esc(a.paxSign.name)}</b> <small>${fmt.dt(a.paxSign.at)}</small></span>${a.paxSign.img ? `<img src="${a.paxSign.img}" alt="ลายเซ็นครู">` : ''}</div>` : `<div class="ps-show none">${icon('info')}<span>ไม่มีครูไปด้วย <small>${fmt.dt(a.paxSign.at)}</small></span></div>`) : ''}
          ${a.note ? `<div class="note">${icon('info')} ${esc(a.note)}</div>` : ''}
          <div class="ts-act">${asgBtns(a, i)}</div></div>`).join('')}</div></div>`;
    };
    // ค่าใช้จ่าย: แยกตามรถ · ยอดรวมตามประเภท · รายการแบบอ่านง่าย (หัวเรื่อง+ยอดเงินบรรทัดบน)
    const expCard = () => {
      const vids = [...new Set([...(r.assignments || []).map(a => a.vehicleId), ...exp.map(e => e.vehicleId)])].filter(id => exp.some(e => e.vehicleId === id));
      const byType = Object.entries(S.EXPENSE).map(([k, l]) => [l, exp.filter(e => e.type === k).reduce((s, e) => s + (+e.amount || 0), 0)]).filter(x => x[1]);
      return `<div class="card xp-card"><div class="card-head"><h3>${icon('fuel')} ค่าน้ำมัน / ค่าใช้จ่าย</h3><button class="btn btn-gold btn-sm" id="addExp">${icon('plus')} เพิ่ม</button></div>
        ${exp.length ? `<div class="xp-sumbar"><div class="xp-types">${byType.map(([l, v]) => `<span>${l} <b>${fmt.money(v)}</b></span>`).join('')}</div><div class="xp-total">รวม <b>${fmt.money(expTotal)}</b> บาท</div></div>
          ${vids.map(id => `${vids.length > 1 || (r.assignments || []).length > 1 ? `<div class="xp-vh">${icon('van')} ${esc(C.vName(id))} <small>${exp.filter(e => e.vehicleId === id).length} รายการ · ${fmt.money(exp.filter(e => e.vehicleId === id).reduce((s, e) => s + (+e.amount || 0), 0))} บาท</small></div>` : ''}
            <div class="stack" style="gap:10px">${exp.filter(e => e.vehicleId === id).sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at)).map(e => C.expItem(e, { edit: true, showVeh: false })).join('')}</div>`).join('')}`
          : UI.empty('ยังไม่มีการบันทึกค่าใช้จ่าย', 'fuel')}</div>`;
    };
    // บันทึกข้อความแสดงคู่กับข้อมูลคำขอ (คอม: แบ่งจอซ้าย-ขวา · แท็บเล็ต/มือถือ: ปุ่มลอยเปิดแผ่นเอกสารจากด้านล่าง)
    const docs = r.attachments || [];
    let dvOpen = true; try { dvOpen = localStorage.getItem('vb-dv') !== '0'; } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    return {
      layout: 'admin', live: false,
      html: `<a class="crumb" href="#/admin/requests">${icon('arrowL')} รายการคำขอ</a>
        ${head(`${r.id}${r.emergency ? ' · เร่งด่วน' : ''}`, esc(S.destName(r)), `ส่งเมื่อ ${fmt.dt(r.createdAt)} · ${esc(r.requester.name)}`,
          `${C.canMemo(r) ? `<button class="btn btn-primary btn-sm" data-memo>${icon('printer')} พิมพ์บันทึกข้อความ</button>` : ''}${docs.length ? `<button class="btn btn-ghost btn-sm dv-toggle" id="dvToggle" aria-pressed="${dvOpen}">${icon('file')} <span>${dvOpen ? 'ซ่อนบันทึกข้อความ' : 'แสดงบันทึกข้อความคู่กัน'}</span></button>` : ''}${['pending', 'revise', 'approved'].includes(r.status) ? `<a class="btn btn-ghost btn-sm" href="#/request/${r.id}">${icon('edit')} แก้ไขข้อมูล</a>` : ''}${['pending', 'revise', 'approved'].includes(r.status) && r.assignments.every(a => a.status === 'assigned') ? `<button class="btn btn-ghost btn-sm" id="aCancel">${icon('xCircle')} ยกเลิก</button>` : ''}${r.status === 'returned' ? `<button class="btn btn-ok btn-sm" id="aClose">${icon('check')} ปิดงาน</button>` : ''}`)}
        <div class="rq-split ${docs.length ? 'has-doc' : ''} ${docs.length && dvOpen ? 'dv-open' : ''}">
        ${docs.length ? `<div class="rq-doc">${C.docSlot()}</div>
          <button type="button" class="dv-fab no-print" id="dvFab">${icon('file')} บันทึกข้อความ${docs.length > 1 ? ` (${docs.length})` : ''}</button>` : ''}
        <div class="rq-main">
        ${r.changeReq && r.changeReq.status === 'pending' ? `<div class="card ch-card" style="margin-bottom:18px"><div class="card-head"><h3>${icon('edit')} ผู้ขอขอแก้ไขข้อมูล <small class="muted" style="font-weight:400">${esc(r.changeReq.byName)} · ${fmt.dt(r.changeReq.at)}</small></h3><span class="pill tone-warn">รอพิจารณา</span></div>
          ${Pages._changeDiff(r.changeReq)}<p style="margin-top:8px"><b>เหตุผล:</b> ${esc(r.changeReq.reason)}</p>
          ${r.changeReq.data.startAt || r.changeReq.data.endAt ? `<p class="hint" style="margin-top:6px">${icon('alert')} เปลี่ยนวันเวลา — ตรวจว่ารถ/คนขับที่จัดไว้ยังว่างในช่วงใหม่ ถ้าไม่ว่าง ให้อนุมัติแล้วปรับรถด้านล่าง</p>` : ''}
          <div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-chg="1">${icon('check')} อนุมัติการแก้ไข</button><button class="btn btn-ghost btn-sm" data-chg="0">${icon('xCircle')} ไม่อนุมัติ</button></div></div>` : ''}
        ${r.order ? `<div class="note-box navy" style="margin-bottom:18px">${icon('send')}<div><b>คำสั่งงานรถจาก ${esc(r.order.byName)}</b> · ${fmt.dt(r.order.at)}${r.order.enteredByName ? ` · บันทึกแทนโดย ${esc(r.order.enteredByName)}` : ''}<br>ไม่ต้องมีบันทึกข้อความ · ${r.status === 'pending' ? '<b>เลือกรถ/คนขับ แล้วกดอนุมัติได้เลย</b>' : 'จัดรถแล้ว'}</div></div>` : ''}
        ${r.supply ? `<div class="note-box warn-y" style="margin-bottom:18px">${icon('package')}<div><b>ออกซื้อ/รับของ</b> · ${esc(r.supply.shop)}${r.supply.dept ? ` · สั่งโดย ${esc(r.supply.dept)}` : ''}${r.supply.backdated ? ' · บันทึกย้อนหลัง' : ''}${r.supply.adminEntry ? ' · แอดมินบันทึกแทน' : ''}</div></div>` : ''}
        ${r.garbage ? `<div class="note-box green" style="margin-bottom:18px">${icon('truck')}<div><b>รถขนขยะ</b> · ไป ${esc(S.destName(r))} · งานประจำวัน ไม่คิดค่าล่วงเวลา</div></div>` : ''}
        ${r.medical ? `<div class="card med-card"><div class="card-head"><h3>${icon('alert')} งานฉุกเฉิน · นำส่งผู้ป่วย</h3>${r.medical.ack ? `<span class="pill tone-free">${icon('check')} รับทราบแล้ว</span>` : `<button class="btn btn-danger btn-sm" id="medAck">${icon('check')} รับทราบ / ตรวจแล้ว</button>`}</div>
          <div class="med-grid"><div><small>สถานพยาบาล</small><b>${esc(S.destName(r))}</b></div><div><small>ผู้ป่วย</small><b>${r.medical.patients} คน</b></div><div><small>ผู้ดูแลที่ไปด้วย</small><b>${esc((r.medical.carer || {}).name || '-')}</b></div><div><small>บันทึกโดย</small><b>${esc(r.medical.byName || r.medical.by)}</b></div></div>
          ${r.medical.backdated ? `<p class="hint" style="margin-top:8px">${icon('clock')} บันทึกย้อนหลัง (คนขับลืมกดตอนออก)</p>` : ''}${(r.medical.clash || []).length ? `<div class="note-box warn-y" style="margin-top:10px">${icon('alert')}<div>อาจกระทบงานที่จัดไว้: ${r.medical.clash.map(id => `<a class="link" href="#/admin/requests/${id}">${id}</a>`).join(', ')} — ตรวจรถ/คนขับ</div></div>` : ''}
          ${r.medical.ack ? `<p class="hint" style="margin-top:8px">รับทราบโดย ${esc(r.medical.ack.byName)} · ${fmt.dt(r.medical.ack.at)}${r.medical.ack.note ? ` · ${esc(r.medical.ack.note)}` : ''}</p>` : ''}</div>` : ''}
        <div style="margin-bottom:18px">${Pages._decisionBox(r)}</div>
        ${canDecide || canReassign ? `
        <div class="req-top">${Pages._requestInfo(r, { hideDocs: true })}</div>
        <div class="card" style="margin-bottom:18px;border-color:var(--navy);box-shadow:0 0 0 4px var(--navy-50)">
          <div class="card-head"><h3>${icon(canDecide ? 'clipboard' : 'refresh')} ${canDecide ? 'พิจารณาคำขอ' : 'ปรับรถ / คนขับ'}</h3><span class="hint">${fmt.range(r.startAt, r.endAt)} · ผู้เดินทาง ${S.passengers(r)} คน</span></div>
          ${canDecide ? `<div class="note-box navy" style="margin-bottom:14px">${icon('paperclip')}<div>ตรวจบันทึกข้อความ (ลายเซ็นผู้อำนวยการ/ผู้รักษาราชการแทน · วันที่ · สถานที่ ตรงกับคำขอ) ${docs.length ? `<b>— เปิดดูที่ช่องเอกสาร${docs.length > 1 ? ` (${docs.length} ไฟล์)` : ''}</b>` : '<b style="color:var(--bad)">ไม่มีไฟล์แนบ</b>'}</div></div>` : ''}
          <div class="dc-top">
            <div class="field"><label>${icon('flag')} หมวดงาน <span class="hint" style="font-weight:400">(แก้ได้ถ้าผู้ขอเลือกผิด)</span></label>${catSelect(r.category, r.categoryOther)}</div>
            ${driverDay(r)}
          </div>
          <div class="label" style="margin-bottom:8px">เลือกรถ (เลือกได้หลายคัน) · คนขับ · หมายเหตุรายคัน</div>
          ${vehiclePickerHTML(r, r.assignments)}
          <div class="field" style="margin-top:14px"><label>${icon('mail')} หมายเหตุถึงผู้ขอใช้รถ ${canDecide ? '(จำเป็นเมื่อไม่อนุมัติ/ส่งกลับแก้ไข)' : ''}</label><textarea id="dNote" rows="3" placeholder="เช่น ขอให้มาถึงจุดนัดก่อนเวลา 15 นาที / รถตู้ 1 คันไม่พอ จัดรถบัสให้แทน">${esc(r.decision && r.decision.action === 'approve' ? r.decision.note : '')}</textarea></div>
          <div class="row" style="justify-content:flex-end;margin-top:14px">
            ${canDecide ? `<button class="btn btn-danger" data-dec="reject">${icon('xCircle')} ไม่อนุมัติ</button><button class="btn btn-warn" data-dec="revise">${icon('undo')} ส่งกลับให้แก้ไข</button><button class="btn btn-ok" data-dec="approve">${icon('checkCircle')} อนุมัติและมอบหมายรถ</button>` : `<button class="btn btn-primary" data-dec="approve">${icon('check')} บันทึกการเปลี่ยนแปลง</button>`}
          </div>
        </div>` : ''}
        ${post ? `<div class="post-top">${tripSummary()}${expCard()}</div>` : ''}
        <div class="detail-grid ${canDecide || canReassign ? 'side-only' : ''}">
          ${canDecide || canReassign ? '' : Pages._requestInfo(r, { hideDocs: true })}
          <div class="stack" style="gap:18px">
            ${!post && (r.assignments || []).length ? `<div class="card"><div class="card-head"><h3>${icon('van')} สถานะการเดินทาง</h3></div>
              ${C.assignList(r)}
              <div class="stack" style="margin-top:12px">${r.assignments.map((a, i) => ['approved', 'ontrip', 'returned', 'closed'].includes(r.status) ? `<div class="row" style="justify-content:flex-end"><small class="muted" style="margin-right:auto">${esc(C.vName(a.vehicleId))}</small>${asgBtns(a, i)}</div>` : '').join('')}</div>
            </div>` : ''}
            ${!post && exp.length ? expCard() : ''}
            ${C.canMemo(r) ? `<div class="card memo-card"><div class="card-head"><h3>${icon('file')} บันทึกข้อความขอใช้รถ</h3><button class="btn btn-primary btn-sm" data-memo>${icon('printer')} พิมพ์ / PDF</button></div>
              ${(() => { const E = r.esign || {}, mine = r.createdBy === r.requester.email; const st = (ok, t, d) => `<li class="${ok ? 'ok' : ''}">${icon(ok ? 'checkCircle' : 'clock')}<span>${t}</span><small>${d}</small></li>`; return `<ul class="es-steps">
                ${st(mine, 'ผู้ขอใช้รถ', mine ? 'ลงนามอิเล็กทรอนิกส์เมื่อส่งคำขอ' : 'แอดมินบันทึกแทน — ให้ผู้ขอเซ็นบนกระดาษ')}
                ${st(!!E.head, 'หัวหน้างานยานพาหนะ', E.head ? `${esc(E.head.name)} · ${fmt.dt(E.head.at)}` : 'รอลงนาม')}
                ${st(!!E.deputy, 'รองผู้อำนวยการฯ', E.deputy ? `${E.deputy.decision === 'deny' ? 'ไม่อนุญาต' : 'อนุญาต'} · ${esc(E.deputy.name)} · ${fmt.dt(E.deputy.at)}` : E.head ? 'รอลงนาม' : 'รอหัวหน้างานลงนามก่อน')}</ul>
                <p class="hint" style="margin:-4px 0 10px">${E.deputy ? 'ลงนามอิเล็กทรอนิกส์ครบแล้ว — พิมพ์/บันทึก PDF เก็บเป็นหลักฐานได้ทันที' : 'ผู้ลงนามที่ยังไม่มีบัญชี/ไม่ได้กำหนดในตั้งค่า ให้พิมพ์แล้วเซ็นบนกระดาษ จากนั้นสแกนแนบด้านล่าง'}</p>`; })()}
              ${(r.signed || []).length ? `<div class="note-box green" style="margin-bottom:10px">${icon('checkCircle')}<div><b>เก็บฉบับลงนามแล้ว</b> (${r.signed.length} ไฟล์)<div class="thumbs" style="margin-top:6px">${r.signed.map(p => `<span class="sg-item">${UI.thumb(p, 'sm')}<button type="button" class="icon-btn sm" data-rmsig="${esc(p)}" aria-label="ลบไฟล์นี้">${icon('trash')}</button></span>`).join('')}</div></div></div>` : `<p style="margin-bottom:10px"><span class="pill tone-warn">ยังไม่มีฉบับลงนาม</span></p>`}
              ${C.filePicker('sig', [], { label: 'แนบไฟล์สแกนฉบับลงนาม', pdf: true })}
              <button class="btn btn-ghost btn-sm" id="sigSave" style="margin-top:10px">${icon('upload')} บันทึกไฟล์ฉบับลงนาม</button></div>` : ''}
            <div class="card"><div class="card-head"><h3>${icon('activity')} ความเคลื่อนไหว</h3></div>${C.history(r)}</div>
          </div>
        </div>
        </div></div>`,
      mount(root) {
        const P = (canDecide || canReassign) ? bindVehiclePicker(root, () => S.passengers(r)) : null;
        const getSig = $('#sigSave', root) ? C.bindFilePicker(root, 'sig', [], { pdf: true }) : null;
        root.querySelectorAll('[data-roster]').forEach(b => b.addEventListener('click', () => rosterModal(S.request(r.id) || r)));
        root.querySelectorAll('[data-memo]').forEach(b => b.addEventListener('click', () => C.printDialog([S.request(r.id)], { title: 'บันทึกข้อความขอใช้รถ' })));
        root.querySelectorAll('[data-chg]').forEach(b => b.addEventListener('click', async () => {
          const ok = b.dataset.chg === '1';
          const res = await UI.confirm(ok ? 'อนุมัติการแก้ไขข้อมูลตามที่ผู้ขอแจ้ง? ข้อมูลในคำขอจะถูกเปลี่ยนทันที' : 'ไม่อนุมัติการแก้ไขข้อมูล? คำขอจะใช้ข้อมูลเดิม', { title: ok ? 'อนุมัติการแก้ไข' : 'ไม่อนุมัติการแก้ไข', ok: ok ? 'อนุมัติ' : 'ไม่อนุมัติ', danger: !ok, input: { label: ok ? 'หมายเหตุถึงผู้ขอ (ถ้ามี)' : 'เหตุผลที่ไม่อนุมัติ', required: !ok } });
          if (!res) return;
          S.decideChange(r.id, ok, res.value || '').then(() => { UI.toast(ok ? 'อนุมัติการแก้ไขแล้ว — ตรวจรถ/คนขับให้ตรงกับข้อมูลใหม่' : 'แจ้งผู้ขอว่าไม่อนุมัติการแก้ไขแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error'));
        }));
        $('#sigSave', root)?.addEventListener('click', e => {
          const files = getSig(); if (!files.length) return UI.toast('กรุณาเลือกไฟล์ที่สแกน', 'error');
          UI.busy(e.currentTarget, () => S.attachSigned(r.id, files)).then(() => { UI.toast('เก็บบันทึกข้อความฉบับลงนามแล้ว'); App.render(); }).catch(() => {});
        });
        root.addEventListener('click', async e => {
          const rm = e.target.closest('[data-rmsig]'); if (!rm) return;
          e.stopPropagation();
          if (await UI.confirm('ลบไฟล์ฉบับลงนามนี้ออกจากคำขอ?', { danger: true, ok: 'ลบ' })) S.removeSigned(r.id, rm.dataset.rmsig).then(() => { UI.toast('ลบแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error'));
        });
        $('[name=dcat]', root)?.addEventListener('change', e => { const o = $('[name=dcatOther]', root); o.hidden = e.target.value !== 'other'; if (!o.hidden) o.focus(); });
        const DVA = docs.length ? C.mountDocViewer(root, docs, r.id + '|' + docs.join(',')) : null;
        const split = root.querySelector('.rq-split');
        const sheetMode = () => document.documentElement.classList.contains('lt1000');
        root.addEventListener('click', e => {
          if (e.target.closest('#dvToggle')) {
            const on = !split.classList.contains('dv-open');
            split.classList.toggle('dv-open', on);
            try { localStorage.setItem('vb-dv', on ? '1' : '0'); } catch (err) { /* ไม่บันทึกก็ได้ */ }
            const b = $('#dvToggle', root); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? 'ซ่อนบันทึกข้อความ' : 'แสดงบันทึกข้อความคู่กัน';
            if (on && sheetMode()) document.documentElement.classList.add('dv-sheet');
            return;
          }
          if (e.target.closest('#dvFab')) { document.documentElement.classList.add('dv-sheet'); return; }
          // กดรูปย่อบันทึกข้อความ → เปิดในช่องเอกสารข้าง ๆ แทนการเปิดแท็บใหม่
          const th = e.target.closest('[data-view]');
          if (th && DVA && docs.includes(th.dataset.view)) {
            e.preventDefault(); e.stopPropagation();
            DVA.show(docs.indexOf(th.dataset.view));
            if (sheetMode()) document.documentElement.classList.add('dv-sheet');
            else if (!split.classList.contains('dv-open')) $('#dvToggle', root).click();
          }
        });
        root.addEventListener('click', async e => {
          const dec = e.target.closest('[data-dec]');
          if (dec) {
            const action = dec.dataset.dec, note = $('#dNote', root).value.trim();
            const assignments = P ? P.read() : [];
            const category = (root.querySelector('[name=dcat]') || {}).value || '', categoryOther = (root.querySelector('[name=dcatOther]') || {}).value || '';
            if (action === 'approve') {
              if (!assignments.length) return UI.toast('กรุณาเลือกรถอย่างน้อย 1 คัน', 'error');
              const miss = assignments.filter(a => !a.driverId).length;
              const conf = assignments.flatMap(a => S.vehicleConflicts(a.vehicleId, r.startAt, r.endAt, r.id, S.windows(r)));
              const dconf = assignments.flatMap(a => a.driverId ? S.driverConflicts(a.driverId, r.startAt, r.endAt, r.id, S.windows(r)) : []);
              const warn = [miss ? `ยังไม่ระบุคนขับ ${miss} คัน` : '', conf.length ? 'มีรถที่ชนเวลากับงานอื่น/ซ่อมบำรุง' : '', dconf.length ? 'มีคนขับที่ติดงานอื่นในช่วงเวลานี้' : '', S.seatsOf(assignments) < S.passengers(r) ? 'ที่นั่งรวมน้อยกว่าจำนวนผู้เดินทาง' : ''].filter(Boolean);
              if (warn.length && !(await UI.confirm(`<b>โปรดตรวจสอบ:</b><br>• ${warn.join('<br>• ')}<br><br>ต้องการบันทึกต่อหรือไม่?`, { title: 'คำเตือน', ok: 'บันทึกต่อ' }))) return;
            } else if (!note) return UI.toast(action === 'reject' ? 'กรุณาระบุเหตุผลที่ไม่อนุมัติในช่องหมายเหตุ' : 'กรุณาระบุสิ่งที่ต้องการให้แก้ไขในช่องหมายเหตุ', 'error');
            return UI.busy(dec, () => S.decide(r.id, { action, note, assignments, category, categoryOther })).then(() => { UI.toast(action === 'approve' ? (canDecide ? 'อนุมัติและมอบหมายรถแล้ว' : 'บันทึกการเปลี่ยนแปลงแล้ว') : action === 'reject' ? 'บันทึกไม่อนุมัติแล้ว' : 'ส่งกลับให้ผู้ขอแก้ไขแล้ว'); App.render(); }).catch(() => {});
          }
          // แอดมินบันทึกแทนคนขับ: ต้องระบุเหตุผล (บันทึกในประวัติ) · นอกเวลาที่กำหนดต้องยืนยันเพิ่ม
          const go = e.target.closest('[data-go]');
          if (go) {
            const rr = S.request(r.id), dep = go.dataset.go === 'ontrip', st = dep ? Pages._departState(rr) : { ok: true };
            const res = await UI.confirm(`${st.ok ? '' : `<b style="color:var(--bad)">ยังไม่ถึงเวลาออกเดินทาง</b> (${esc(st.msg)}) — `}บันทึก <b>"${dep ? 'ออกเดินทาง' : 'กลับถึงโรงเรียน'}"</b> แทนคนขับ ระบบจะบันทึกชื่อแอดมินและเหตุผลไว้ในประวัติ`, { title: 'บันทึกแทนคนขับ', ok: 'ถัดไป', input: { label: 'เหตุผลที่บันทึกแทน', required: true, value: 'คนขับแจ้งทางโทรศัพท์' } });
            if (!res || !res.value) return;
            await Pages._tripAction(rr, +go.dataset.i, go.dataset.go, { override: res.value });
            return App.render();
          }
          const un = e.target.closest('[data-undo]'); if (un) { if (await UI.confirm('ย้อนสถานะรถคันนี้กลับเป็น "รอออกเดินทาง"?', { title: 'ย้อนสถานะ' })) S.tripStatus(r.id, +un.dataset.undo, 'assigned').then(App.render).catch(err => UI.toast(err.message, 'error')); return; }
          const od = e.target.closest('[data-odo]');
          if (od) { const i = +od.dataset.odo, a = S.request(r.id).assignments[i]; const res = await UI.modal({ title: `${icon('gauge')} เลขไมล์ · ${esc(C.vName(a.vehicleId))}`, body: `<div class="grid2"><div class="field"><label>ตอนออก</label><input id="o1" type="number" value="${a.odoStart ?? Pages._lastOdo(a.vehicleId) ?? ''}"></div><div class="field"><label>ตอนกลับ</label><input id="o2" type="number" value="${a.odoEnd ?? ''}"></div></div>`, actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { await S.setOdo(r.id, i, { odoStart: el.querySelector('#o1').value, odoEnd: el.querySelector('#o2').value }); return true; } }] }); if (res) { UI.toast('บันทึกเลขไมล์แล้ว'); App.render(); } return; }
          if (e.target.closest('#addExp')) { const res = await Pages._expenseModal(S.request(r.id), (r.assignments[0] || {}).vehicleId); if (res) App.render(); return; }
          const ee = e.target.closest('[data-xedit]'); if (ee) { const rr = S.request(r.id); const res = await Pages._expenseModal(rr, null, rr.expenses.find(x => x.id === ee.dataset.xedit)); if (res) App.render(); return; }
          const de = e.target.closest('[data-xdel]'); if (de) { if (await UI.confirm('ลบรายการค่าใช้จ่ายนี้?', { danger: true, ok: 'ลบ' })) S.removeExpense(r.id, de.dataset.xdel).then(App.render); return; }
          if (e.target.closest('#medAck')) { const res = await UI.confirm('รับทราบงานฉุกเฉินนี้ (ตรวจเลขไมล์/ผู้ดูแลลงชื่อแล้ว)', { title: 'รับทราบงานฉุกเฉิน', ok: 'รับทราบ', input: { label: 'หมายเหตุ (ถ้ามี)' } }); if (res) S.ackMedical(r.id, res.value).then(() => { UI.toast('รับทราบแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error')); return; }
          if (e.target.closest('#aClose')) { const res = await UI.confirm('ปิดงานคำขอนี้? (ตรวจสอบเลขไมล์และค่าใช้จ่ายให้ครบก่อน)', { title: 'ปิดงาน', ok: 'ปิดงาน', input: { label: 'หมายเหตุ (ถ้ามี)' } }); if (res) S.closeRequest(r.id, res.value).then(() => { UI.toast('ปิดงานแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error')); }
          if (e.target.closest('#aReopen')) S.reopenRequest(r.id).then(App.render);
          if (e.target.closest('#aCancel')) { const res = await UI.confirm('ยกเลิกคำขอนี้? ระบบจะแจ้งผู้ขอในเว็บ', { title: 'ยกเลิกคำขอ', ok: 'ยกเลิกคำขอ', danger: true, input: { label: 'เหตุผล', required: true } }); if (res) S.cancelRequest(r.id, res.value).then(() => { UI.toast('ยกเลิกแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error')); }
        });
      }
    };
  };

  // ═════════ สรุปการใช้รถรายวัน (รูปภาพ · แชร์ LINE / บันทึกลงเครื่อง) ═════════
  // วาดลงผืนผ้าใบ (canvas) โดยตรง → คมชัด ไม่ตกบรรทัด (ข้อความยาวตัดด้วย …) ไม่ต้องใช้ไลบรารีเพิ่ม
  const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  async function dailyCanvas(day) {
    const st = S.db.settings, ymd = fmt.localDate(day);
    const s0 = new Date(day); s0.setHours(0, 0, 0, 0); const s1 = new Date(s0); s1.setDate(s1.getDate() + 1);
    const list = S.db.requests.filter(r => ['pending', 'approved', 'ontrip', 'returned', 'closed'].includes(r.status) && new Date(r.startAt) < s1 && new Date(r.endAt) >= s0).sort((a, b) => a.startAt.localeCompare(b.startAt));
    try { await Promise.all([document.fonts.load('600 30px Prompt'), document.fonts.load('400 20px "IBM Plex Sans Thai"'), document.fonts.load('600 20px "IBM Plex Sans Thai"')]); } catch (e) { /* ใช้ฟอนต์สำรอง */ }
    const logo = await loadImg('images/logo.png');
    const W = 1200, P = 36, HEAD = 176, TH = 50, RH = 70, FOOT = 64;
    const H = HEAD + 34 + TH + Math.max(1, list.length) * RH + 24 + FOOT;
    const k = 2, cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
    const g = cv.getContext('2d'); g.scale(k, k);
    const F = (w, px, fam = '"IBM Plex Sans Thai", Prompt, sans-serif') => { g.font = `${w} ${px}px ${fam}`; };
    const D = (w, px) => F(w, px, 'Prompt, "IBM Plex Sans Thai", sans-serif');
    const fit = (t, max) => { t = String(t || ''); if (g.measureText(t).width <= max) return t; while (t.length && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    // พื้นหลัง
    g.fillStyle = '#eef0f7'; g.fillRect(0, 0, W, H);
    // หัว (กรมท่า → น้ำเงิน) + แถบส้มล่าง
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#1d2766'); gr.addColorStop(1, '#2f55d4');
    rr(16, 16, W - 32, HEAD - 16, 24); g.fillStyle = gr; g.fill();
    g.fillStyle = '#f08a24'; g.fillRect(16, HEAD - 6, W - 32, 6);
    if (logo) { rr(P + 4, 40, 96, 96, 18); g.fillStyle = '#fff'; g.fill(); const r0 = Math.min(80 / logo.width, 80 / logo.height); g.drawImage(logo, P + 4 + (96 - logo.width * r0) / 2, 40 + (96 - logo.height * r0) / 2, logo.width * r0, logo.height * r0); }
    const tx = P + 124;
    g.fillStyle = '#fff'; D('600', 32); g.fillText('สรุปการใช้รถประจำวัน', tx, 76);
    g.fillStyle = '#f7c766'; D('600', 24); g.fillText(day.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), tx, 112);
    g.fillStyle = 'rgba(255,255,255,.78)'; F('400', 16); g.fillText(fit(`${st.unit || 'งานยานพาหนะ'} · ${st.division || ''} · ${st.schoolName || ''}`, W - tx - 200), tx, 142);
    D('600', 18); const badge = `${list.length} รายการ`, bw = g.measureText(badge).width + 36;
    rr(W - P - bw, 56, bw, 40, 20); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.fillStyle = '#fff'; g.fillText(badge, W - P - bw + 18, 82);
    // การ์ดตาราง
    const top = HEAD + 18, cardH = TH + Math.max(1, list.length) * RH + 16;
    rr(P - 8, top, W - 2 * P + 16, cardH, 18); g.fillStyle = '#fff'; g.fill();
    const cols = [['ที่', 44], ['เวลา', 128], ['ปลายทาง / ภารกิจ', 330], ['ผู้ขอใช้รถ', 200], ['ผู้เดินทาง', 92], ['รถ / คนขับ', 210], ['สถานะ', 124]];
    let x = P + 8; const cx = cols.map(([, w]) => { const v = x; x += w; return v; });
    g.fillStyle = '#f3f5fb'; g.fillRect(P - 8, top + 8, W - 2 * P + 16, TH - 8);
    g.fillStyle = '#5b6380'; F('600', 16); cols.forEach(([t], i) => g.fillText(t, cx[i] + (i === 0 ? 4 : 0), top + 40));
    const ST = { pending: ['รอจัดรถ', '#7c3aed', '#f1ebff'], approved: ['อนุมัติแล้ว', '#047857', '#dcf5e9'], ontrip: ['กำลังเดินทาง', '#c2410c', '#ffeadb'], returned: ['กลับแล้ว', '#475569', '#eceef3'], closed: ['กลับแล้ว', '#475569', '#eceef3'] };
    if (!list.length) { g.fillStyle = '#8a90a6'; F('400', 20); g.fillText('ไม่มีรายการใช้รถในวันนี้', W / 2 - 110, top + TH + 44); }
    list.forEach((r, i) => {
      const y = top + TH + i * RH, mid = y + 30;
      if (i) { g.strokeStyle = '#eceef4'; g.lineWidth = 1; g.beginPath(); g.moveTo(P, y + 4); g.lineTo(W - P, y + 4); g.stroke(); }
      const sd = UI.sameDay(r.startAt, day), ed = UI.sameDay(r.endAt, day);
      g.fillStyle = '#8a90a6'; F('400', 18); g.fillText(String(i + 1), cx[0] + 8, mid);
      const tt = `${sd ? fmt.time(r.startAt) : 'ต่อ'}–${ed ? fmt.time(r.endAt) : fmt.dayMonth(r.endAt)}`;
      g.fillStyle = '#e8590c'; D('600', 20); if (g.measureText(tt).width > cols[1][1] - 10) D('600', 16); g.fillText(fit(tt, cols[1][1] - 10), cx[1], mid);
      g.fillStyle = '#8a90a6'; F('400', 14); g.fillText(fit(S.tripTag(r) ? S.tripTag(r).text : 'ไป-กลับวันเดียว', cols[1][1] - 12), cx[1], mid + 24);
      g.fillStyle = '#1b2147'; F('600', 19); g.fillText(fit(S.destName(r), cols[2][1] - 16), cx[2], mid);
      g.fillStyle = '#6b7190'; F('400', 15); g.fillText(fit(r.purpose, cols[2][1] - 16), cx[2], mid + 24);
      g.fillStyle = '#1b2147'; F('400', 17); g.fillText(fit(r.requester.name, cols[3][1] - 14), cx[3], mid);
      g.fillStyle = '#8a90a6'; F('400', 14); g.fillText(fit(r.requester.dept || '', cols[3][1] - 14), cx[3], mid + 24);
      g.fillStyle = '#1b2147'; F('600', 18); g.fillText(`${S.passengers(r)} คน`, cx[4], mid);
      g.fillStyle = '#8a90a6'; F('400', 14); g.fillText(fit(`ครู ${r.teachers} นร. ${r.students}`, cols[4][1] - 8), cx[4], mid + 24);
      const as = r.assignments || [];
      g.fillStyle = as.length ? '#1b2147' : '#7c3aed'; F('600', 17); g.fillText(fit(as.length ? as.map(a => C.vName(a.vehicleId)).join(', ') : 'รอแอดมินจัดรถ', cols[5][1] - 12), cx[5], mid);
      g.fillStyle = '#6b7190'; F('400', 14); g.fillText(fit(as.map(a => C.firstName(C.dName(a.driverId))).join(', '), cols[5][1] - 12), cx[5], mid + 24);
      const [sl, sc, sb] = ST[r.status] || ST.approved; F('600', 15); const pw = g.measureText(sl).width + 26;
      rr(cx[6], mid - 22, pw, 32, 16); g.fillStyle = sb; g.fill(); g.fillStyle = sc; g.fillText(sl, cx[6] + 13, mid);
    });
    // ท้าย
    const fy = H - FOOT / 2 + 4;
    g.fillStyle = '#7a8099'; F('400', 15); g.fillText(`ข้อมูล ณ ${new Date().toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} น. · ระบบยานพาหนะ ${st.unit || ''}`, P, fy);
    g.fillStyle = '#2f55d4'; F('600', 15); const nt = 'เฉพาะรายการที่ใช้รถจริง (ไม่รวมที่ยกเลิก/ไม่อนุมัติ)'; g.fillText(nt, W - P - g.measureText(nt).width, fy);
    return { cv, n: list.length, ymd };
  }
  async function dailySummary(start = new Date()) {
    let day = new Date(start); day.setHours(0, 0, 0, 0);
    let cur = null;
    await UI.modal({
      title: `${icon('image')} สรุปการใช้รถรายวัน`, size: 'lg',
      body: `<div class="ds-nav"><button type="button" class="icon-btn" data-dd-day="-1" aria-label="วันก่อนหน้า">${icon('chevL')}</button><input type="date" class="input" id="dsDate" value="${fmt.localDate(day)}"><button type="button" class="icon-btn" data-dd-day="1" aria-label="วันถัดไป">${icon('chevR')}</button><button type="button" class="btn btn-ghost btn-sm" data-dd-day="0">วันนี้</button></div>
        <div class="ds-prev" id="dsPrev"><div class="hint">กำลังสร้างรูป…</div></div>
        <p class="hint" style="margin-top:8px">${icon('info')} รูปนี้ส่งในกลุ่ม LINE ได้ทันที · แสดงเวลา ปลายทาง ผู้ขอ จำนวนคน รถ/คนขับ และสถานะของทุกเที่ยวในวันนั้น</p>`,
      actions: [{ label: 'ปิด', value: null }, { label: 'แชร์', icon: 'share', onClick: async () => {
        if (!cur) return false;
        const blob = await new Promise(r => cur.cv.toBlob(r, 'image/png'));
        const file = new File([blob], `สรุปการใช้รถ-${cur.ymd}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: `สรุปการใช้รถ ${fmt.date(day)}` }); } catch (e) { /* ผู้ใช้ยกเลิก */ } }
        else { const a = document.createElement('a'); a.href = cur.cv.toDataURL('image/png'); a.download = file.name; a.click(); UI.toast('อุปกรณ์นี้แชร์โดยตรงไม่ได้ — บันทึกรูปลงเครื่องแล้ว', 'info'); }
        return false;
      } }, { label: 'บันทึกรูปลงเครื่อง', kind: 'btn-primary', icon: 'download', onClick: () => {
        if (!cur) return false;
        const a = document.createElement('a'); a.href = cur.cv.toDataURL('image/png'); a.download = `สรุปการใช้รถ-${cur.ymd}.png`; a.click(); UI.toast('บันทึกรูปแล้ว'); return false;
      } }],
      onOpen(el) {
        const draw = async () => { $('#dsPrev', el).innerHTML = '<div class="hint">กำลังสร้างรูป…</div>'; cur = await dailyCanvas(day); const im = new Image(); im.src = cur.cv.toDataURL('image/png'); im.alt = 'สรุปการใช้รถรายวัน'; $('#dsPrev', el).innerHTML = ''; $('#dsPrev', el).appendChild(im); $('#dsDate', el).value = fmt.localDate(day); };
        el.addEventListener('click', e => { const b = e.target.closest('[data-dd-day]'); if (!b) return; const n = +b.dataset.ddDay; if (n === 0) { day = new Date(); day.setHours(0, 0, 0, 0); } else day.setDate(day.getDate() + n); draw(); });
        $('#dsDate', el).addEventListener('change', e => { if (e.target.value) { day = UI.dayOf(e.target.value); draw(); } });
        draw();
      }
    });
  }

  // ═════════ บันทึกข้อความรอลงนาม (หัวหน้างานยานพาหนะ / รองผู้อำนวยการ) ═════════
  Pages.adminEsign = ({ query }) => {
    const me = S.me, roles = S.signerRoles(me);
    const RL = { head: 'หัวหน้างานยานพาหนะ', deputy: 'รองผู้อำนวยการฝ่ายบริหารงานทั่วไป' };
    if (!roles.length) return { layout: 'admin', html: `${head('ลงนาม', 'บันทึกข้อความรอลงนาม')}<div class="note-box">${icon('info')}<div>บัญชีนี้ยังไม่ได้ถูกกำหนดเป็นผู้ลงนาม — แอดมินกำหนดได้ที่ <b>ตั้งค่า → บันทึกข้อความขอใช้รถ</b></div></div>` };
    const role = roles.includes(query.role) ? query.role : roles[0], tab = query.t === 'done' ? 'done' : 'todo';
    const all = S.db.requests.filter(C.canMemo);
    const todo = all.filter(r => S.needsMySign(r, role)).sort(S.byNewest);
    const done = all.filter(r => ((r.esign || {})[role] || {}).email === me.email).sort((a, b) => b.esign[role].at.localeCompare(a.esign[role].at)).slice(0, 200);
    const list = tab === 'todo' ? todo : done;
    const qs = o => '#/admin/esign?' + new URLSearchParams({ role, t: tab, ...o });
    return {
      layout: 'admin',
      html: `${head('ลงนามอิเล็กทรอนิกส์', 'บันทึกข้อความรอลงนาม', `ในฐานะ ${RL[role]} · ${esc(me.name || me.email)}`)}
        ${!me.sigAt ? `<div class="note-box red" style="margin-bottom:14px">${icon('alert')}<div>ยังไม่มีลายเซ็นในระบบ — <a class="link" href="#/profile">ไปเซ็นชื่อที่หน้าโปรไฟล์</a> ก่อนลงนาม</div></div>` : ''}
        <div class="toolbar">${roles.length > 1 ? `<div class="seg">${roles.map(r2 => `<a href="${qs({ role: r2 })}"><button class="${r2 === role ? 'on' : ''}" tabindex="-1">${RL[r2]}</button></a>`).join('')}</div>` : ''}
          <div class="seg"><a href="${qs({ t: 'todo' })}"><button class="${tab === 'todo' ? 'on' : ''}" tabindex="-1">รอลงนาม ${todo.length}</button></a><a href="${qs({ t: 'done' })}"><button class="${tab === 'done' ? 'on' : ''}" tabindex="-1">ลงนามแล้ว ${done.length}</button></a></div>
          ${tab === 'todo' && todo.length ? `<button class="btn btn-primary btn-sm" id="doSign" disabled>${icon('edit')} <span>ลงนามที่เลือก</span></button>` : ''}</div>
        <p class="hint" style="margin:-4px 0 10px">${icon('info')} ${role === 'deputy' ? 'แสดงเฉพาะฉบับที่หัวหน้างานยานพาหนะลงนามแล้ว · ' : ''}กด "ดูบันทึก" เพื่ออ่านก่อนลงนาม · ติ๊กเลือกหลายฉบับแล้วลงนามพร้อมกันได้ · ระบบบันทึกชื่อและเวลาที่ลงนามไว้ในคำขอ</p>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="ck">${tab === 'todo' && todo.length ? '<input type="checkbox" id="pickAll" aria-label="เลือกทั้งหมด">' : ''}</th><th>เลขที่</th><th>วันเดินทาง</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอ</th><th>รถ / คนขับ</th><th>${tab === 'done' ? 'ลงนามเมื่อ' : ''}</th></tr></thead>
          <tbody>${list.map(r => `<tr>
            <td class="ck">${tab === 'todo' ? `<input type="checkbox" data-pick="${r.id}" aria-label="เลือก ${r.id}">` : ''}</td>
            <td><b style="white-space:nowrap">${r.id}</b>${r.esign && r.esign.head && role === 'deputy' ? `<small style="color:var(--ok)">หัวหน้างานลงนาม ${fmt.date(r.esign.head.at)}</small>` : ''}</td>
            <td><b>${fmt.date(r.startAt)}</b><small>${fmt.time(r.startAt)} – ${fmt.when(r.endAt)}</small></td>
            <td><b>${esc(S.destName(r))}</b><small>${esc(r.purpose)}</small></td>
            <td>${esc(r.requester.name)}<small>${esc(r.requester.dept || '')}</small></td>
            <td>${(r.assignments || []).map(a => `${esc(C.vName(a.vehicleId))}<small>${esc(C.dName(a.driverId))}</small>`).join('') || '<small>—</small>'}</td>
            <td>${tab === 'done' ? `<small>${fmt.dt(r.esign[role].at)}</small>${role === 'deputy' ? `<span class="pill ${r.esign.deputy.decision === 'deny' ? 'tone-bad' : 'tone-ok'}">${r.esign.deputy.decision === 'deny' ? 'ไม่อนุญาต' : 'อนุญาต'}</span>` : ''}` : ''}<button class="btn btn-ghost btn-xs" data-prev="${r.id}">${icon('file')} ดูบันทึก</button></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty(tab === 'todo' ? 'ไม่มีบันทึกข้อความรอลงนาม' : 'ยังไม่มีรายการ', 'checkCircle')}</td></tr>`}</tbody>
        </table></div></div>`,
      mount(root) {
        const picked = () => $$('[data-pick]:checked', root).map(x => x.dataset.pick);
        const sync = () => { const b = $('#doSign', root); if (!b) return; const n = picked().length; b.disabled = !n; b.querySelector('span').textContent = n ? `ลงนามที่เลือก (${n} ฉบับ)` : 'ลงนามที่เลือก'; };
        root.addEventListener('change', e => { if (e.target.id === 'pickAll') $$('[data-pick]', root).forEach(x => { x.checked = e.target.checked; }); sync(); });
        // ยืนยันการลงนาม (รองผู้อำนวยการเลือก อนุญาต/ไม่อนุญาต ได้)
        const sign = async ids => {
          if (!ids.length) return;
          await S.loadSignatures([me.email]);
          const my = S.sigOf(me.email);
          const res = await UI.modal({
            title: `${icon('edit')} ลงนาม ${ids.length} ฉบับ`,
            body: `<p class="muted" style="margin-bottom:10px">ลงนามในฐานะ <b>${RL[role]}</b> ในบันทึกข้อความ: ${ids.map(esc).join(', ')}</p>
              ${role === 'deputy' ? `<div class="field"><label>ความเห็น / คำสั่ง</label><div class="row" style="gap:16px"><label class="check"><input type="radio" name="dc" value="allow" checked> อนุญาต</label><label class="check"><input type="radio" name="dc" value="deny"> ไม่อนุญาต</label></div></div>
              <div class="field" style="margin-top:10px"><label>ความเห็นเพิ่มเติม <span class="hint">(จำเป็นเมื่อไม่อนุญาต)</span></label><textarea id="dn" rows="2"></textarea></div>` : ''}
              <div class="sig-now" style="margin-top:12px">${my ? `<img src="${my}" alt="ลายเซ็น">` : ''}<span class="hint">ลายเซ็นที่จะใช้ · ${esc(me.name || '')}</span></div>`,
            actions: [{ label: 'ยกเลิก', value: null }, { label: 'ยืนยันลงนาม', kind: 'btn-primary', icon: 'check', onClick: async el => {
              const decision = role === 'deputy' ? el.querySelector('[name=dc]:checked').value : 'allow';
              const note = role === 'deputy' ? el.querySelector('#dn').value : '';
              return { n: await S.esign(ids, role, { decision, note }) };
            } }]
          });
          if (res && res.n != null) { UI.toast(`ลงนามแล้ว ${res.n} ฉบับ`); App.render(); }
        };
        $('#doSign', root)?.addEventListener('click', () => sign(picked()));
        root.addEventListener('click', async e => {
          const p = e.target.closest('[data-prev]'); if (!p) return;
          const r = S.request(p.dataset.prev); if (!r) return;
          await S.loadSignatures(C.sigEmails([r]));
          const res = await UI.modal({ title: `${icon('file')} บันทึกข้อความ ${r.id}`, size: 'xl', body: `<div class="memo-preview print-doc">${C.memoHTML(r)}</div>`,
            actions: [{ label: 'ปิด', value: null }, { label: 'พิมพ์ / PDF', icon: 'printer', value: 'print' }, ...(S.needsMySign(r, role) ? [{ label: 'ลงนามฉบับนี้', kind: 'btn-primary', icon: 'edit', value: 'sign' }] : [])] });
          if (res === 'print') C.printMemo(S.request(r.id));
          if (res === 'sign') sign([r.id]);
        });
      }
    };
  };

  // ═════════ บันทึกคำขอเร่งด่วน (แอดมิน) ═════════
  Pages.adminNew = () => {
    const users = S.db.users.filter(u => (u.roles || []).includes('teacher') && u.active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
    return {
      layout: 'admin', live: false,
      html: `${head('กรณีเร่งด่วน', 'บันทึกคำขอใช้รถโดยแอดมิน', 'กรอกเท่าที่จำเป็น · เลือกรถและคนขับได้ในหน้านี้ · บันทึกแล้วเข้างานของคนขับทันที')}
        <form id="ef" novalidate>
          <div class="form-section"><h3><span class="n">0</span>ผู้ขอใช้รถ</h3>
            <div class="grid2">
              <div class="field"><label>เลือกจากรายชื่อ</label><select name="reqEmail" id="reqEmail"><option value="">— พิมพ์ชื่อเอง —</option>${users.map(u => `<option value="${esc(u.email)}">${esc(u.name || u.email)} · ${esc(u.dept || '')}</option>`).join('')}</select></div>
              <div class="field"><label>ชื่อผู้ขอ <b class="req">*</b></label><input name="reqName" id="reqName"></div>
              <div class="field"><label>ฝ่าย / กลุ่มสาระ</label><input name="reqDept" id="reqDept"></div>
              <div class="field"><label>เบอร์โทร</label><input name="reqPhone" id="reqPhone"></div>
            </div>
            <p class="hint" id="nameLink" hidden style="margin-top:8px"></p>
            <div class="note-box red" id="debtWarn" hidden style="margin-top:12px">${icon('alert')}<div><b>ผู้ขอคนนี้ยังค้างบันทึกข้อความ:</b> <span></span> — แอดมินบันทึกต่อได้ แต่ควรติดตามให้แนบก่อน</div></div></div>
          ${Pages._requestForm.html(null, { admin: true })}
          <div class="form-section" style="border-color:var(--navy);box-shadow:0 0 0 4px var(--navy-50)"><h3><span class="n">6</span>เลือกรถและคนขับ <span class="hint" style="font-weight:400">(เลือกแล้ว = อนุมัติทันที และเข้างานของคนขับ · ไม่เลือก = รอจัดรถ)</span></h3>
            <div id="pickBox"><p class="hint">ระบุวันเวลาก่อน แล้วระบบจะแสดงรถที่ว่าง</p></div>
            <div class="field" style="margin-top:14px"><label>หมายเหตุถึงผู้ขอ / คนขับ</label><textarea name="dNote" rows="2" placeholder="เช่น รับเอกสารที่ฝ่ายการเงิน ก่อนออก 10 นาที"></textarea></div></div>
          <div class="form-actions"><a class="btn btn-ghost" href="#/admin/requests">ยกเลิก</a><button class="btn btn-primary" type="submit" id="efSubmit">${icon('check')} <span>บันทึก (รอจัดรถ)</span></button></div>
        </form>`,
      mount(root) {
        const F = Pages._requestForm.bind(root, null);
        const form = $('#ef', root);
        let P = null;
        const pax = () => ['teachers', 'students', 'others'].reduce((s, k) => s + (+form.querySelector(`[name=${k}]`).value || 0), 0);
        const drawPick = () => {
          const a = form.startAt.value, b = form.endAt.value;
          if (!a || !b || new Date(b) <= new Date(a)) return;
          const keep = P ? P.read() : [];
          const tripType = (form.querySelector('[name=tripType]:checked') || {}).value;
          $('#pickBox', root).innerHTML = vehiclePickerHTML({ id: '__new', tripType, startAt: new Date(a).toISOString(), endAt: new Date(b).toISOString() }, keep);
          P = bindVehiclePicker(root, pax);
          syncSubmit();
        };
        // ปุ่มบันทึกบอกผลลัพธ์ชัดเจน: เลือกรถแล้ว = อนุมัติทันที
        const syncSubmit = () => { const n = P ? P.read().length : 0; $('#efSubmit span', root).textContent = n ? `บันทึกและอนุมัติ (${n} คัน)` : 'บันทึก (รอจัดรถ)'; };
        form.addEventListener('change', e => { if (e.target.name === 'tripType' || ['dDate', 'rDate', 'sTime', 'eTime'].includes(e.target.id)) setTimeout(drawPick, 10); if (/teachers|students|others/.test(e.target.name) && P) P.meter(); if (e.target.closest('#avPick')) syncSubmit(); });
        setTimeout(drawPick, 30);   // วันที่ตั้งต้น = วันนี้ → แสดงรถว่างทันที
        const showDebts = u => { const debts = u ? S.memoDebts(u.email) : []; $('#debtWarn', root).hidden = !debts.length; $('#debtWarn', root).querySelector('span').textContent = debts.map(r => r.id).join(', '); };
        // พิมพ์ชื่อเอง → จับคู่กับบัญชีผู้ใช้ให้อัตโนมัติ (ถ้าไม่พบ ระบบติดตามบันทึกข้อความค้างของคนนี้ไม่ได้)
        const linkName = () => {
          const el = $('#nameLink', root), n = form.reqName.value.trim();
          if (form.reqEmail.value || !n) { el.hidden = true; if (!form.reqEmail.value) showDebts(null); return; }
          const u = S.userByName(n); el.hidden = false;
          el.innerHTML = u ? `${icon('check')} ตรงกับบัญชี <b>${esc(u.name)}</b> — ระบบจะผูกคำขอกับบัญชีนี้` : `${icon('alert')} <b style="color:var(--bad)">ไม่พบชื่อนี้ในรายชื่อผู้ใช้</b> — ถ้าไม่แนบบันทึกข้อความ ระบบจะติดตาม/บล็อกการขอครั้งต่อไปไม่ได้ ควรเลือกจากรายชื่อด้านซ้าย`;
          showDebts(u);
        };
        form.reqName.addEventListener('input', linkName);
        $('#reqEmail', root).addEventListener('change', e => { const u = S.user(e.target.value); showDebts(u); if (u) { form.reqName.value = u.name || ''; form.reqDept.value = u.dept || ''; form.reqPhone.value = u.phone || ''; if (!form.contactPhone.value) form.contactPhone.value = u.phone || ''; } linkName(); });
        form.addEventListener('submit', e => {
          e.preventDefault();
          let data; try { data = F.read(); } catch (err) { return UI.toast(err.message, 'error'); }
          const f = UI.formData(form);
          if (!f.reqName.trim()) return UI.toast('กรุณาระบุชื่อผู้ขอใช้รถ', 'error');
          UI.busy(form.querySelector('[type=submit]'), () => S.createEmergency(data, { requester: { email: f.reqEmail, name: f.reqName, dept: f.reqDept, phone: f.reqPhone }, assignments: P ? P.read() : [], note: f.dNote }))
            .then(r => { UI.toast(r.status === 'approved' ? `บันทึกและอนุมัติ ${r.id} แล้ว — เข้างานของคนขับแล้ว` : `บันทึก ${r.id} แล้ว (รอจัดรถ)`); App.go(`#/admin/requests/${r.id}`); }).catch(() => {});
        });
      }
    };
  };

  // ═════════ ข้อมูลรถ ═════════
  Pages.adminVehicles = () => {
    const vs = S.db.vehicles.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const exp = (p, vId) => { if (!p) return ''; const xs = [['พ.ร.บ.', p.actExpiry], ['ภาษี', p.taxExpiry], ['ประกัน', p.insurance && p.insurance.expiry]].filter(x => x[1]).map(([l, d]) => { const n = daysTo(d); return n <= 30 ? `<span class="tag ${n <= 7 ? 'red' : ''}">${l} ${n < 0 ? 'หมดแล้ว' : n + ' วัน'}</span>` : ''; }).join(''); return xs + svcStatus(vId, p).filter(x => x.over || x.soon).map(x => `<span class="tag ${x.over ? 'red' : ''}">${icon('wrench')} ${esc(x.m.item || 'เช็คระยะ')} ${x.left != null ? (x.left <= 0 ? 'เลยระยะ' : `อีก ${fmt.num(x.left)} กม.`) : x.days < 0 ? 'เลยกำหนด' : `อีก ${x.days} วัน`}</span>`).join(''); };
    return {
      layout: 'admin',
      html: `${head('ข้อมูลหลัก', 'ข้อมูลรถ', 'แก้ไขข้อมูลที่เผยแพร่ให้ครูดู และข้อมูลเชิงลึก (พ.ร.บ. ประกัน ประวัติซ่อม) ที่ไม่เผยแพร่', `<button class="btn btn-ghost btn-sm" id="vpImport">${icon('upload')} นำเข้า พ.ร.บ./ภาษี/ประกัน จาก Excel</button><a class="btn btn-primary btn-sm" href="#/admin/vehicles/new">${icon('plus')} เพิ่มรถ</a>`)}
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>รหัส</th><th>รถ</th><th>ที่นั่ง</th><th>คนขับที่รับผิดชอบ</th><th>สถานะตอนนี้</th><th>ไมล์ล่าสุด</th><th>เอกสาร / เช็คระยะ</th><th>ซ่อม (ครั้ง)</th></tr></thead>
          <tbody>${vs.map(v => { const p = S.db.vprivate[v.id], odo = Pages._lastOdo ? Pages._lastOdo(v.id) : null; return `<tr class="click" data-href="#/admin/vehicles/${v.id}"><td><b>${v.no || '-'}</b></td><td><b>${icon(kindIcon(v.kind))} ${esc(v.name)}</b><small>${esc(v.plate)} · ${esc(v.brand || '')} ${esc(v.model || '')}</small></td><td>${v.seats}</td><td>${esc(C.dName(v.driverId))}<small>${esc(C.dPhone(v.driverId))}</small></td><td>${pill(S.vehicleState(v))}</td><td class="nw">${odo != null ? fmt.num(odo) : '<small>—</small>'}</td><td>${exp(p, v.id) || '<small>—</small>'}</td><td>${p ? (p.repairs || []).length : 0}</td></tr>`; }).join('')}</tbody>
        </table></div></div>`,
      mount(root) { root.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; }); $('#vpImport', root).addEventListener('click', () => Pages._vpImport()); }
    };
  };
  Pages.adminVehicle = ({ params, query }) => {
    const isNew = params.id === 'new';
    const v = isNew ? { id: '', no: (Math.max(0, ...S.db.vehicles.map(x => +x.no || 0)) + 1), name: '', plate: '', brand: '', model: '', kind: 'van', color: '', seats: 12, seatsLuggage: '', driverId: '', photos: [], features: [], suitable: '', rules: '', note: '', bookable: true, maint: { active: false, from: '', to: '', note: '' } } : S.vehicle(params.id);
    if (!v) return { layout: 'admin', html: UI.empty('ไม่พบรถคันนี้') };
    const tab = isNew ? 'public' : (query.tab || 'public');
    const p = JSON.parse(JSON.stringify(S.db.vprivate[v.id] || { id: v.id, actExpiry: '', taxExpiry: '', insurance: { company: '', cls: '', policyNo: '', expiry: '', phone: '' }, repairs: [], maintenancePlan: [], accidents: [], docs: [], notes: '', chassisNo: '', engineNo: '', fuelType: 'ดีเซล', fuelCard: '' }));
    p.insurance = p.insurance || {}; p.repairs = p.repairs || []; p.maintenancePlan = p.maintenancePlan || []; p.accidents = p.accidents || []; p.docs = p.docs || [];
    const histUsage = tab === 'usage' && S.needHistory();   // แท็บประวัติการใช้งาน = ทั้งหมดตั้งแต่เริ่มใช้ระบบ
    const trips = S.db.requests.filter(r => (r.assignments || []).some(a => a.vehicleId === v.id) && ['returned', 'closed', 'ontrip'].includes(r.status)).sort((a, b) => b.startAt.localeCompare(a.startAt));
    const T = (k, l, ic) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${icon(ic)} ${l}</button>`;
    let body = '';
    if (tab === 'public') body = `
      <form id="vf"><div class="form-section"><h3>${icon('eye')} ข้อมูลที่เผยแพร่ (ครูทุกคนเห็น)</h3>
        <div class="grid3">
          <div class="field"><label>รหัสรถ</label><input name="no" type="number" value="${v.no}"></div>
          <div class="field"><label>ชื่อเรียก <b class="req">*</b></label><input name="name" required value="${esc(v.name)}" placeholder="เช่น รถตู้ 01"></div>
          <div class="field"><label>ทะเบียน</label><input name="plate" value="${esc(v.plate)}"></div>
          <div class="field"><label>ชนิดรถ</label><select name="kind">${Object.entries(S.KINDS).map(([k, l]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>ยี่ห้อ</label><input name="brand" value="${esc(v.brand || '')}"></div>
          <div class="field"><label>รุ่น</label><input name="model" value="${esc(v.model || '')}"></div>
          <div class="field"><label>สี</label><input name="color" value="${esc(v.color || '')}"></div>
          <div class="field"><label>จำนวนที่นั่ง <b class="req">*</b></label><input name="seats" type="number" min="0" value="${v.seats}"></div>
          <div class="field"><label>ที่นั่งเมื่อมีสัมภาระมาก</label><input name="seatsLuggage" type="number" min="0" value="${esc(v.seatsLuggage || '')}"></div>
          <div class="field"><label>คนขับที่รับผิดชอบ</label><select name="driverId"><option value="">— ไม่ระบุ —</option>${S.db.drivers.filter(d => !d.standby).map(d => `<option value="${d.id}" ${d.id === v.driverId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
          <div class="field full"><label>เหมาะกับงาน</label><input name="suitable" value="${esc(v.suitable || '')}" placeholder="เช่น ประชุม อบรม คณะไม่เกิน 12 คน"></div>
          <div class="field full"><label>อุปกรณ์ในรถ</label><div class="checks">${[...new Set([...S.FEATURES, ...(v.features || [])])].map(f => `<label class="check"><input type="checkbox" name="features" data-multi value="${esc(f)}" ${(v.features || []).includes(f) ? 'checked' : ''}>${esc(f)}</label>`).join('')}</div></div>
          <div class="field full"><label>ข้อปฏิบัติ / ประกาศของรถคันนี้</label><textarea name="rules" rows="2">${esc(v.rules || '')}</textarea></div>
          <div class="field full"><label>ข้อมูลอื่น ๆ ที่อยากแจ้ง</label><textarea name="note" rows="2">${esc(v.note || '')}</textarea></div>
          <div class="field full"><label class="check" style="width:max-content"><input type="checkbox" name="bookable" ${v.bookable !== false ? 'checked' : ''}> เปิดให้จอง / ให้บริการ</label></div>
        </div>
        <div class="label" style="margin:14px 0 8px">รูปรถ</div>${C.filePicker('vph', v.photos || [], { label: 'เพิ่มรูปรถ' })}</div>
        <div class="form-section"><h3>${icon('wrench')} ซ่อมบำรุง (ปิดการจองชั่วคราว)</h3>
          <div class="grid3"><div class="field full"><label class="check" style="width:max-content"><input type="checkbox" name="mActive" ${v.maint && v.maint.active ? 'checked' : ''}> อยู่ระหว่างซ่อมบำรุง</label></div>
            <div class="field"><label>ตั้งแต่</label><input type="datetime-local" name="mFrom" value="${fmt.local(v.maint && v.maint.from)}"></div>
            <div class="field"><label>ถึง</label><input type="datetime-local" name="mTo" value="${fmt.local(v.maint && v.maint.to)}"></div>
            <div class="field"><label>รายละเอียด</label><input name="mNote" value="${esc((v.maint && v.maint.note) || '')}"></div></div></div>
        <div class="form-actions">${!isNew ? `<button type="button" class="btn btn-danger" id="vDel">${icon('trash')} ลบรถ</button>` : ''}<button class="btn btn-primary" type="submit">${icon('check')} บันทึก</button></div></form>`;
    else if (tab === 'private') body = `
      <div class="note-box red" style="margin-bottom:16px">${icon('lock')}<div><b>ข้อมูลเชิงลึก — ไม่เผยแพร่</b> เห็นเฉพาะแอดมินและผู้บริหาร</div></div>
      <form id="pf">
        <div class="form-section"><h3>${icon('shield')} เอกสาร · พ.ร.บ. · ภาษี · ประกันภัย</h3>
          <div class="grid3">
            <div class="field"><label>พ.ร.บ. หมดอายุ</label><input type="date" name="actExpiry" value="${esc(p.actExpiry || '')}">${p.actExpiry ? `<span class="hint">อีก ${daysTo(p.actExpiry)} วัน</span>` : ''}</div>
            <div class="field"><label>บริษัท พ.ร.บ.</label><input name="actCompany" value="${esc(p.actCompany || '')}"></div>
            <div class="field"><label>เลขกรมธรรม์ พ.ร.บ.</label><input name="actNo" value="${esc(p.actNo || '')}"></div>
            <div class="field"><label>ภาษีรถ หมดอายุ</label><input type="date" name="taxExpiry" value="${esc(p.taxExpiry || '')}">${p.taxExpiry ? `<span class="hint">อีก ${daysTo(p.taxExpiry)} วัน</span>` : ''}</div>
            <div class="field"><label>ประกันภัย หมดอายุ</label><input type="date" name="insExpiry" value="${esc(p.insurance.expiry || '')}">${p.insurance.expiry ? `<span class="hint">อีก ${daysTo(p.insurance.expiry)} วัน</span>` : ''}</div>
            <div class="field"><label>บริษัทประกันภัย</label><input name="insCompany" value="${esc(p.insurance.company || '')}"></div>
            <div class="field"><label>ชั้นประกัน</label><input name="insCls" value="${esc(p.insurance.cls || '')}"></div>
            <div class="field"><label>เลขกรมธรรม์ ประกันภัย</label><input name="insNo" value="${esc(p.insurance.policyNo || '')}"></div>
            <div class="field"><label>เบอร์แจ้งเคลม</label><input name="insPhone" value="${esc(p.insurance.phone || '')}"></div>
            <div class="field"><label>เลขตัวถัง</label><input name="chassisNo" value="${esc(p.chassisNo || '')}"></div>
            <div class="field"><label>เลขเครื่องยนต์</label><input name="engineNo" value="${esc(p.engineNo || '')}"></div>
            <div class="field"><label>ชนิดเชื้อเพลิง</label><input name="fuelType" value="${esc(p.fuelType || '')}"></div>
            <div class="field"><label>เลขบัตรเติมน้ำมัน</label><input name="fuelCard" value="${esc(p.fuelCard || '')}"></div>
          </div>
          <div class="label" style="margin:14px 0 8px">เอกสารแนบ (เล่มทะเบียน กรมธรรม์ ฯลฯ)</div>${C.filePicker('docs', p.docs, { label: 'แนบเอกสาร', pdf: true })}</div>
        <div class="form-section"><h3>${icon('wrench')} ประวัติการซ่อม <span class="pill tone-done" style="margin-left:auto">${p.repairs.length} ครั้ง · ${fmt.money(p.repairs.reduce((s, x) => s + (+x.cost || 0), 0))} บาท</span></h3>
          <div class="stack" id="repList">${p.repairs.slice().sort((a, b) => b.date.localeCompare(a.date)).map(rp => `<div class="exp-row"><span class="ei">${icon('wrench')}</span><div><b>${esc(rp.item)}</b><small>${fmt.date(rp.date)} · ${esc(rp.garage || '')}${rp.mileage ? ` · ไมล์ ${fmt.num(rp.mileage)}` : ''}${rp.note ? ' · ' + esc(rp.note) : ''}</small>${(rp.photos || []).length ? `<div class="thumbs" style="margin-top:6px">${rp.photos.map(x => UI.thumb(x, 'sm')).join('')}</div>` : ''}</div><span class="money">${fmt.money(rp.cost)} ฿</span><div class="row" style="gap:4px"><button type="button" class="icon-btn sm" data-erp="${rp.id}">${icon('edit')}</button><button type="button" class="icon-btn sm" data-drp="${rp.id}">${icon('trash')}</button></div></div>`).join('') || UI.empty('ยังไม่มีประวัติการซ่อม', 'wrench')}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="addRep" style="margin-top:12px">${icon('plus')} เพิ่มรายการซ่อม</button></div>
        <div class="form-section"><h3>${icon('calendar')} เช็คระยะ / แผนบำรุงรักษาตามเลขไมล์ <span class="hint" style="margin-left:auto;font-weight:400">ไมล์ล่าสุด ${(() => { const o = Pages._lastOdo ? Pages._lastOdo(v.id) : null; return o != null ? `<b>${fmt.num(o)}</b> กม. (จากงานล่าสุดที่คนขับบันทึก)` : 'ยังไม่มีข้อมูล'; })()}</span></h3>
          <div class="stack" id="mpList">${svcStatus(v.id, p).map(x => { const m = x.m; return `<div class="exp-row"><span class="ei">${icon('refresh')}</span><div><b>${esc(m.item)}</b><small>ทุก ${m.everyKm ? fmt.num(m.everyKm) + ' กม.' : ''}${m.everyKm && m.everyMonths ? ' หรือ ' : ''}${m.everyMonths ? m.everyMonths + ' เดือน' : ''} · ครั้งล่าสุด ${m.lastDate ? fmt.date(m.lastDate) : '-'}${m.lastKm ? ` (${fmt.num(m.lastKm)} กม.)` : ''}${x.nextKm != null ? ` · ครั้งถัดไปที่ ${fmt.num(x.nextKm)} กม.` : ''}</small></div><span>${x.text ? `<span class="pill tone-${x.over ? 'bad' : x.soon ? 'warn' : 'ok'}">${esc(x.text)}</span>` : ''}</span><div class="row" style="gap:4px"><button type="button" class="btn btn-ghost btn-xs" data-dnmp="${m.id}" title="บันทึกว่าทำแล้ว (เริ่มนับรอบใหม่ + เพิ่มในประวัติการซ่อม)">${icon('check')} ทำแล้ว</button><button type="button" class="icon-btn sm" data-emp="${m.id}">${icon('edit')}</button><button type="button" class="icon-btn sm" data-dmp="${m.id}">${icon('trash')}</button></div></div>`; }).join('') || `<div class="empty" style="padding:16px">${icon('calendar')}<p>ยังไม่มีแผนเช็คระยะ</p><button type="button" class="btn btn-primary btn-sm" id="stdMp">${icon('plus')} ใช้แผนมาตรฐาน (เช็คระยะทุก 10,000 กม. หรือ 6 เดือน)</button></div>`}</div>
          <p class="hint" style="margin-top:8px">${icon('info')} ระบบเตือนในหน้าภาพรวมเมื่อเหลือไม่ถึง ${fmt.num(SVC_SOON_KM)} กม. หรือ ${SVC_SOON_DAYS} วัน · เลขไมล์มาจากตอนคนขับกดออกเดินทาง/กลับถึง</p>
          <button type="button" class="btn btn-ghost btn-sm" id="addMp" style="margin-top:12px">${icon('plus')} เพิ่มรายการบำรุงรักษา</button></div>
        <div class="form-section"><h3>${icon('alert')} อุบัติเหตุ / เคลมประกัน</h3>
          <div class="stack">${p.accidents.map(a => `<div class="exp-row"><span class="ei">${icon('alert')}</span><div><b>${esc(a.detail)}</b><small>${fmt.date(a.date)}${a.claimNo ? ' · เลขเคลม ' + esc(a.claimNo) : ''}</small></div><span class="money">${a.cost ? fmt.money(a.cost) + ' ฿' : ''}</span><button type="button" class="icon-btn sm" data-dac="${a.id}">${icon('trash')}</button></div>`).join('') || '<p class="hint">ไม่มีประวัติอุบัติเหตุ</p>'}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="addAc" style="margin-top:12px">${icon('plus')} เพิ่มรายการ</button></div>
        <div class="form-section"><h3>${icon('edit')} บันทึกภายใน</h3><div class="field"><textarea name="notes" rows="3">${esc(p.notes || '')}</textarea></div></div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')} บันทึกข้อมูลเชิงลึก</button></div>
      </form>`;
    else {
      const rows = trips.map(r => { const a = r.assignments.find(x => x.vehicleId === v.id); const km = a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : null; const ex = (r.expenses || []).filter(e => e.vehicleId === v.id); return { r, a, km, fuel: ex.filter(e => e.type === 'fuel').reduce((s, e) => s + e.amount, 0), liters: ex.reduce((s, e) => s + (+e.liters || 0), 0), other: ex.filter(e => e.type !== 'fuel').reduce((s, e) => s + e.amount, 0) }; });
      const sum = k => rows.reduce((s, x) => s + (+x[k] || 0), 0);
      body = `${histNote(histUsage)}<div class="kpis" style="margin-bottom:16px"><div class="kpi"><span class="k-ic">${icon('route')}</span><b>${rows.length}<em>ทริป</em></b><span class="l">ใช้งานทั้งหมด</span></div><div class="kpi"><span class="k-ic">${icon('gauge')}</span><b>${fmt.num(sum('km'))}<em>กม.</em></b><span class="l">ระยะทางตามเลขไมล์</span></div><div class="kpi"><span class="k-ic">${icon('fuel')}</span><b>${fmt.money(sum('fuel'))}<em>฿</em></b><span class="l">ค่าน้ำมัน (${fmt.num(sum('liters'), 1)} ลิตร)</span></div><div class="kpi"><span class="k-ic">${icon('gauge')}</span><b>${sum('liters') ? fmt.num(rows.filter(x => x.liters && x.km).reduce((s, x) => s + x.km, 0) / rows.filter(x => x.liters && x.km).reduce((s, x) => s + x.liters, 0), 1) : '-'}<em>กม./ลิตร</em></b><span class="l">อัตราสิ้นเปลือง</span></div></div>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>วันที่</th><th>ปลายทาง</th><th>คนขับ</th><th class="r">กม.</th><th class="r">น้ำมัน (฿)</th><th class="r">อื่น ๆ (฿)</th></tr></thead><tbody>${rows.map(x => `<tr class="click" data-href="#/admin/requests/${x.r.id}"><td>${fmt.date(x.r.startAt)}<small>${x.r.id}</small></td><td>${esc(S.destName(x.r))}<small>${esc(x.r.requester.name)}</small></td><td>${esc(C.dName(x.a.driverId))}</td><td class="r">${x.km != null ? fmt.num(x.km) : '-'}</td><td class="r">${fmt.money(x.fuel)}</td><td class="r">${fmt.money(x.other)}</td></tr>`).join('') || `<tr><td colspan="6">${UI.empty('ยังไม่มีประวัติการใช้งาน')}</td></tr>`}</tbody></table></div></div>`;
    }
    return {
      layout: 'admin', live: !!histUsage,   // ระหว่างโหลดประวัติย้อนหลัง ให้วาดใหม่เมื่อโหลดเสร็จ
      html: `<a class="crumb" href="#/admin/vehicles">${icon('arrowL')} ข้อมูลรถทั้งหมด</a>
        ${head(isNew ? 'เพิ่มรถใหม่' : `รหัสรถ ${v.no || '-'}`, isNew ? 'เพิ่มรถ' : esc(v.name), isNew ? '' : `${esc(v.plate)} · ${pill(S.vehicleState(v))}`, isNew ? '' : `<a class="btn btn-ghost btn-sm" href="#/vehicles/${v.id}">${icon('eye')} ดูหน้าที่ครูเห็น</a>`)}
        ${isNew ? '' : `<div class="tabs">${T('public', 'ข้อมูลเผยแพร่', 'eye')}${T('private', 'ข้อมูลเชิงลึก (ไม่เผยแพร่)', 'lock')}${T('usage', 'ประวัติการใช้งาน', 'activity')}</div>`}
        ${body}`,
      mount(root) {
        root.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) location.hash = `#/admin/vehicles/${v.id}?tab=${t.dataset.tab}`; const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; });
        if (tab === 'public') {
          const getPh = C.bindFilePicker(root, 'vph', v.photos || []);
          $('#vf', root).addEventListener('submit', e => {
            e.preventDefault();
            const f = UI.formData(e.target);
            if (!f.name.trim()) return UI.toast('กรุณาระบุชื่อเรียกรถ', 'error');
            const x = { ...v, no: f.no, name: f.name.trim(), plate: f.plate.trim(), kind: f.kind, brand: f.brand, model: f.model, color: f.color, seats: f.seats, seatsLuggage: f.seatsLuggage, driverId: f.driverId, suitable: f.suitable, features: f.features || [], rules: f.rules, note: f.note, bookable: f.bookable, photos: getPh(), maint: { active: f.mActive, from: f.mFrom ? new Date(f.mFrom).toISOString() : '', to: f.mTo ? new Date(f.mTo).toISOString() : '', note: f.mNote } };
            UI.busy(e.target.querySelector('[type=submit]'), () => S.saveVehicle(x)).then(saved => { UI.toast('บันทึกข้อมูลรถแล้ว'); if (isNew) App.go(`#/admin/vehicles/${saved.id}`); else App.render(); }).catch(() => {});
          });
          $('#vDel', root)?.addEventListener('click', async () => { if (await UI.confirm(`ลบ ${esc(v.name)} ออกจากระบบ? (ประวัติคำขอเดิมยังอยู่)`, { danger: true, ok: 'ลบรถ' })) S.deleteVehicle(v.id).then(() => { UI.toast('ลบแล้ว'); App.go('#/admin/vehicles'); }).catch(err => UI.toast(err.message, 'error')); });
        }
        if (tab === 'private') {
          const getDocs = C.bindFilePicker(root, 'docs', p.docs, { pdf: true });
          const save = () => { const f = UI.formData($('#pf', root)); Object.assign(p, { actExpiry: f.actExpiry, actCompany: f.actCompany || '', actNo: f.actNo || '', taxExpiry: f.taxExpiry, chassisNo: f.chassisNo, engineNo: f.engineNo, fuelType: f.fuelType, fuelCard: f.fuelCard, notes: f.notes, docs: getDocs(), insurance: { company: f.insCompany, cls: f.insCls, policyNo: f.insNo, expiry: f.insExpiry, phone: f.insPhone } }); return S.saveVehiclePrivate(v.id, p); };
          const subModal = async (title, fields, init, withPhotos) => UI.modal({ title, body: `<form id="sm" class="grid2">${fields.map(([k, l, t = 'text']) => `<div class="field ${t === 'textarea' ? 'full' : ''}"><label>${l}</label>${t === 'textarea' ? `<textarea name="${k}" rows="2">${esc(init[k] || '')}</textarea>` : `<input name="${k}" type="${t}" value="${esc(init[k] ?? '')}">`}</div>`).join('')}${withPhotos ? `<div class="field full">${C.filePicker('smph', init.photos || [], { label: 'แนบรูปใบเสร็จ/รูปงานซ่อม' })}</div>` : ''}</form>`,
            actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: el => ({ ...init, ...UI.formData(el.querySelector('#sm')), ...(withPhotos ? { photos: el._ph() } : {}) }) }],
            onOpen(el) { if (withPhotos) el._ph = C.bindFilePicker(el, 'smph', init.photos || []); } });
          const RF = [['date', 'วันที่', 'date'], ['item', 'รายการซ่อม'], ['garage', 'อู่/ศูนย์บริการ'], ['cost', 'ค่าใช้จ่าย (บาท)', 'number'], ['mileage', 'เลขไมล์', 'number'], ['note', 'หมายเหตุ', 'textarea']];
          const MF = [['item', 'รายการ'], ['everyKm', 'ทุกกี่ กม.', 'number'], ['everyMonths', 'ทุกกี่เดือน', 'number'], ['lastDate', 'ทำครั้งล่าสุด', 'date'], ['lastKm', 'เลขไมล์ครั้งล่าสุด', 'number']];
          root.addEventListener('click', async e => {
            const run = async fn => { const r = await fn(); if (r) { await save(); UI.toast('บันทึกแล้ว'); App.render(); } };
            if (e.target.closest('#addRep')) return run(async () => { const x = await subModal(`${icon('wrench')} เพิ่มรายการซ่อม`, RF, { id: 'rp' + Date.now(), date: fmt.localDate(new Date()), photos: [] }, true); if (x && x.item) { x.cost = +x.cost || 0; x.mileage = +x.mileage || null; p.repairs.push(x); return true; } });
            const er = e.target.closest('[data-erp]'); if (er) return run(async () => { const i = p.repairs.findIndex(x => x.id === er.dataset.erp); const x = await subModal(`${icon('wrench')} แก้ไขรายการซ่อม`, RF, p.repairs[i], true); if (x) { x.cost = +x.cost || 0; p.repairs[i] = x; return true; } });
            const dr = e.target.closest('[data-drp]'); if (dr) return run(async () => { if (await UI.confirm('ลบรายการซ่อมนี้?', { danger: true, ok: 'ลบ' })) { p.repairs = p.repairs.filter(x => x.id !== dr.dataset.drp); return true; } });
            const odoNow = () => (Pages._lastOdo ? Pages._lastOdo(v.id) : null);
            if (e.target.closest('#stdMp')) return run(async () => { p.maintenancePlan.push({ id: 'mp' + Date.now(), item: 'เช็คระยะ (เปลี่ยนน้ำมันเครื่อง/ไส้กรอง ตรวจสภาพ)', everyKm: 10000, everyMonths: 6, lastDate: fmt.localDate(new Date()), lastKm: odoNow() ?? '' }); return true; });
            const dn = e.target.closest('[data-dnmp]'); if (dn) return run(async () => {
              const i = p.maintenancePlan.findIndex(x => x.id === dn.dataset.dnmp), m = p.maintenancePlan[i];
              const x = await subModal(`${icon('check')} บันทึกว่า "${esc(m.item)}" ทำแล้ว`, [['date', 'วันที่ทำ', 'date'], ['mileage', 'เลขไมล์ตอนทำ', 'number'], ['garage', 'อู่/ศูนย์บริการ'], ['cost', 'ค่าใช้จ่าย (บาท)', 'number'], ['note', 'หมายเหตุ', 'textarea']], { id: 'rp' + Date.now(), date: fmt.localDate(new Date()), mileage: odoNow() ?? '', photos: [] }, true);
              if (!x) return false;
              p.maintenancePlan[i] = { ...m, lastDate: x.date, lastKm: x.mileage === '' ? m.lastKm : +x.mileage };
              p.repairs.push({ ...x, item: m.item, cost: +x.cost || 0, mileage: +x.mileage || null });
              return true;
            });
            if (e.target.closest('#addMp')) return run(async () => { const x = await subModal(`${icon('calendar')} เพิ่มแผนบำรุงรักษา`, MF, { id: 'mp' + Date.now() }); if (x && x.item) { p.maintenancePlan.push(x); return true; } });
            const em = e.target.closest('[data-emp]'); if (em) return run(async () => { const i = p.maintenancePlan.findIndex(x => x.id === em.dataset.emp); const x = await subModal('แก้ไขแผนบำรุงรักษา', MF, p.maintenancePlan[i]); if (x) { p.maintenancePlan[i] = x; return true; } });
            const dm = e.target.closest('[data-dmp]'); if (dm) return run(async () => { p.maintenancePlan = p.maintenancePlan.filter(x => x.id !== dm.dataset.dmp); return true; });
            if (e.target.closest('#addAc')) return run(async () => { const x = await subModal(`${icon('alert')} เพิ่มอุบัติเหตุ/เคลม`, [['date', 'วันที่', 'date'], ['detail', 'รายละเอียด'], ['claimNo', 'เลขเคลม'], ['cost', 'ค่าเสียหาย (บาท)', 'number']], { id: 'ac' + Date.now(), date: fmt.localDate(new Date()) }); if (x && x.detail) { p.accidents.push(x); return true; } });
            const da = e.target.closest('[data-dac]'); if (da) return run(async () => { p.accidents = p.accidents.filter(x => x.id !== da.dataset.dac); return true; });
          });
          $('#pf', root).addEventListener('submit', e => { e.preventDefault(); UI.busy(e.target.querySelector('[type=submit]'), save).then(() => { UI.toast('บันทึกข้อมูลเชิงลึกแล้ว'); App.render(); }).catch(() => {}); });
        }
      }
    };
  };

  // ═════════ พนักงานขับรถ ═════════
  function driverModal(d) {
    d = d || { name: '', phone: '', photo: '', licenseNo: '', licenseExpiry: '', note: '', active: true };
    return UI.modal({
      title: `${icon('wheel')} ${d.id ? 'แก้ไข' : 'เพิ่ม'}พนักงานขับรถ`,
      body: `<form id="dmF" class="grid2">
        <div class="field full"><label>ชื่อ-นามสกุล <b class="req">*</b></label><input name="name" value="${esc(d.name)}"></div>
        <div class="field"><label>เบอร์โทร (ครูเห็น)</label><input name="phone" value="${esc(d.phone || '')}"></div>
        <div class="field"><label>เลขใบขับขี่</label><input name="licenseNo" value="${esc(d.licenseNo || '')}"></div>
        <div class="field"><label>ใบขับขี่หมดอายุ</label><input type="date" name="licenseExpiry" value="${esc(d.licenseExpiry || '')}"></div>
        <div class="field"><label class="check" style="margin-top:28px"><input type="checkbox" name="active" ${d.active !== false ? 'checked' : ''}> ปฏิบัติงานอยู่</label></div>
        <div class="field full"><label class="check" style="width:max-content;max-width:100%"><input type="checkbox" name="dorm" ${d.dorm ? 'checked' : ''}> คนขับหอพัก (งานฉุกเฉินหลัง 18.00)</label></div>
        <div class="field full"><label>ข้อมูลที่ครูเห็น (เช่น ความชำนาญเส้นทาง)</label><textarea name="note" rows="2">${esc(d.note || '')}</textarea></div>
        <div class="field full">${C.filePicker('dph', d.photo ? [d.photo] : [], { label: 'รูปคนขับ', multiple: false })}</div>
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { const f = UI.formData(el.querySelector('#dmF')); if (!f.name.trim()) { UI.toast('กรุณาระบุชื่อ', 'error'); return false; } await S.saveDriver({ ...d, ...f, photo: el._ph()[0] || '' }); UI.toast('บันทึกแล้ว'); return true; } }],
      onOpen(el) { el._ph = C.bindFilePicker(el, 'dph', d.photo ? [d.photo] : [], { multiple: false }); }
    });
  }
  Pages.adminDrivers = () => {
    const ds = S.db.drivers.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const rt = S.db.ratings;
    return {
      layout: 'admin',
      html: `${head('ข้อมูลหลัก', 'พนักงานขับรถ', 'ข้อมูลติดต่อแสดงให้ครูเห็นในหน้าข้อมูลรถ · ผูกบัญชีเพื่อให้คนขับกดสถานะได้', `<button class="btn btn-primary btn-sm" id="addD">${icon('plus')} เพิ่มคนขับ</button>`)}
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>คนขับ</th><th>รถที่รับผิดชอบ</th><th>ใบขับขี่</th><th>บัญชีเข้าระบบ</th><th>คะแนนเฉลี่ย</th><th></th></tr></thead>
          <tbody>${ds.map(d => { const mine = rt.filter(x => x.driverId === d.id); const avg = mine.length ? mine.reduce((s, x) => s + Object.values(x.scores).reduce((a, b) => a + b, 0) / 4, 0) / mine.length : 0; const u = d.email && S.user(d.email); return `<tr>
            <td><div class="row" style="gap:10px">${UI.avatar(d.name)}<div><b>${esc(d.name)}</b>${d.standby ? ' <span class="tag sb-tag">สำรอง · ฉุกเฉินเท่านั้น</span>' : ''}${d.dorm ? ' <span class="tag dorm-tag">คนขับหอพัก · หลัง 18.00</span>' : ''}<small>${esc(d.phone || '-')}${d.active === false ? ' · <span style="color:var(--bad)">พักงาน</span>' : ''}</small></div></div></td>
            <td>${S.db.vehicles.filter(v => v.driverId === d.id).map(v => esc(v.name)).join(', ') || '<small>—</small>'}</td>
            <td>${d.licenseExpiry ? `${fmt.date(d.licenseExpiry)}<small>${daysTo(d.licenseExpiry) < 0 ? 'หมดอายุแล้ว' : `อีก ${daysTo(d.licenseExpiry)} วัน`}</small>` : '<small>—</small>'}</td>
            <td>${u ? `<b>${esc(S.usernameOf(u.email) || u.email)}</b><small>${u.active ? 'ใช้งานได้' : 'ปิดใช้งาน'}</small>` : `<button class="btn btn-ghost btn-xs" data-acct="${d.id}">${icon('key')} สร้างบัญชี</button>`}</td>
            <td>${mine.length ? `${C.stars(avg)} <small>${avg.toFixed(2)} (${mine.length} ครั้ง)</small>` : '<small>ยังไม่มี</small>'}</td>
            <td class="r"><button class="icon-btn sm" data-ed="${d.id}" aria-label="แก้ไข">${icon('edit')}</button> <button class="icon-btn sm" data-del="${d.id}" aria-label="ลบ">${icon('trash')}</button></td></tr>`; }).join('')}</tbody>
        </table></div></div>`,
      mount(root) {
        root.addEventListener('click', async e => {
          if (e.target.closest('#addD')) { if (await driverModal()) App.render(); }
          const ed = e.target.closest('[data-ed]'); if (ed) { if (await driverModal(S.driver(ed.dataset.ed))) App.render(); }
          const dl = e.target.closest('[data-del]'); if (dl && await UI.confirm('ลบคนขับคนนี้?', { danger: true, ok: 'ลบ' })) S.deleteDriver(dl.dataset.del).then(() => UI.toast('ลบแล้ว')).catch(err => UI.toast(err.message, 'error'));
          const ac = e.target.closest('[data-acct]'); if (ac) { if (await accountModal({ driverId: ac.dataset.acct, roles: ['driver'] })) App.render(); }
        });
      }
    };
  };

  // ═════════ ผู้ใช้และสิทธิ์ ═════════
  function accountModal({ driverId = '', roles = ['driver'] } = {}) {
    const d = driverId ? S.driver(driverId) : null;
    const sup = S.isSuper(S.me);
    return UI.modal({
      title: `${icon('key')} สร้างบัญชีชื่อผู้ใช้ (username)`,
      body: `<form id="acF" class="grid2">
        <div class="field full note-box navy">${icon('info')}<div>สำหรับแอดมินหรือพนักงานขับรถที่ไม่มีอีเมลโรงเรียน · ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก</div></div>
        <div class="field"><label>ชื่อผู้ใช้ (a-z 0-9 . _ -) <b class="req">*</b></label><input name="username" autocapitalize="none" placeholder="เช่น 0812345678 หรือ sawong" value="${esc(d && d.phone ? String(d.phone).replace(/\D/g, '') : '')}"><span class="hint">คนขับ: แนะนำใช้เบอร์โทร (ตัวเลขล้วน) จำง่าย ไม่ต้องพิมพ์ภาษาอังกฤษ</span></div>
        <div class="field"><label>รหัสผ่านชั่วคราว (≥ 6 ตัว) <b class="req">*</b></label><input name="password" inputmode="numeric" value="${String(Math.floor(100000 + Math.random() * 900000))}"><span class="hint">ตัวเลข 6 หลัก · ผู้ใช้ต้องตั้งรหัสใหม่เมื่อเข้าครั้งแรก</span></div>
        <div class="field full"><label>ชื่อ-นามสกุล <b class="req">*</b></label><input name="name" value="${esc(d ? d.name : '')}"></div>
        <div class="field full"><label>สิทธิ์</label><div class="checks">${['driver', 'admin', 'executive'].map(r => `<label class="check"><input type="checkbox" name="roles" data-multi value="${r}" ${roles.includes(r) ? 'checked' : ''} ${(r === 'admin') && !sup ? 'disabled' : ''}>${S.ROLES[r]}</label>`).join('')}</div>${!sup ? '<span class="hint">สิทธิ์แอดมิน กำหนดได้เฉพาะผู้ดูแลระบบสูงสุด</span>' : ''}</div>
        <div class="field full"><label>ผูกกับรายชื่อพนักงานขับรถ</label><select name="driverId"><option value="">— ไม่ผูก —</option>${S.db.drivers.map(x => `<option value="${x.id}" ${x.id === driverId ? 'selected' : ''}>${esc(x.name)}${x.email ? ' (มีบัญชีแล้ว)' : ''}</option>`).join('')}</select></div>
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'สร้างบัญชี', kind: 'btn-primary', onClick: async el => {
        const f = UI.formData(el.querySelector('#acF'));
        if (!f.name.trim()) { UI.toast('กรุณาระบุชื่อ', 'error'); return false; }
        if (!(f.roles || []).length) { UI.toast('กรุณาเลือกสิทธิ์อย่างน้อย 1 อย่าง', 'error'); return false; }
        const u = await S.createUsernameAccount({ ...f, phone: d ? d.phone : '' });
        await UI.modal({ title: `${icon('checkCircle')} สร้างบัญชีแล้ว`, body: `<p>แจ้งข้อมูลนี้ให้ผู้ใช้ (เปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก)</p><div class="note-box" style="margin-top:12px;font-size:1.05rem">${icon('key')}<div>ชื่อผู้ใช้: <b>${esc(S.usernameOf(u.email) || f.username)}</b><br>รหัสผ่าน: <b>${esc(f.password)}</b></div></div>`, actions: [{ label: 'เรียบร้อย', kind: 'btn-primary' }] });
        return u;
      } }]
    });
  }
  Pages.adminUsers = ({ query }) => {
    const f = query.f || 'all', q = (query.q || '').toLowerCase();
    const G = { all: () => true, admin: u => S.isAdmin(u), driver: u => S.isDriver(u), executive: u => S.isExec(u), username: u => S.isUsernameEmail(u.email), off: u => u.active === false };
    const list = S.db.users.filter(G[f] || G.all).filter(u => !q || [u.name, u.email, u.dept].join(' ').toLowerCase().includes(q)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
    const qs = o => '#/admin/users?' + new URLSearchParams({ f, q: query.q || '', ...o });
    return {
      layout: 'admin',
      html: `${head('ข้อมูลหลัก', 'ผู้ใช้และสิทธิ์', `ครูเข้าระบบด้วย Google (@${S.DOMAINS[0]}) ได้ทันที · แอดมิน/คนขับที่ไม่มีอีเมลใช้บัญชีชื่อผู้ใช้`, `<button class="btn btn-ghost btn-sm" id="addG">${icon('mail')} เพิ่มผู้ใช้ด้วยอีเมล</button><button class="btn btn-primary btn-sm" id="addU">${icon('key')} สร้างบัญชีชื่อผู้ใช้</button>`)}
        <div class="toolbar"><div class="seg">${[['all', 'ทั้งหมด'], ['admin', 'แอดมิน'], ['driver', 'คนขับ'], ['executive', 'ผู้บริหาร'], ['username', 'บัญชีชื่อผู้ใช้'], ['off', 'ปิดใช้งาน']].map(([k, l]) => `<a href="${qs({ f: k })}"><button class="${f === k ? 'on' : ''}" tabindex="-1">${l} ${S.db.users.filter(G[k]).length}</button></a>`).join('')}</div>
          <div class="search-in">${icon('search')}<input class="input" id="q" placeholder="ค้นหาชื่อ อีเมล ฝ่าย" value="${esc(query.q || '')}"></div></div>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>ผู้ใช้</th><th>เข้าระบบด้วย</th><th>ฝ่าย</th><th>สิทธิ์</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>${list.map(u => `<tr>
            <td><div class="row" style="gap:10px">${UI.avatar(u.name || u.email)}<div><b>${esc(u.name || '(ยังไม่กรอกชื่อ)')}</b><small>${esc(S.isUsernameEmail(u.email) ? '' : u.email)}</small></div></div></td>
            <td>${S.isUsernameEmail(u.email) ? `<span class="tag navy">${icon('key')}${esc(S.usernameOf(u.email))}</span>` : `<span class="tag">${icon('google')}Google</span>`}</td>
            <td>${esc(u.dept || '-')}</td>
            <td>${(u.roles || []).map(r => `<span class="tag ${r === 'admin' || r === 'superadmin' ? 'navy' : ''}" style="margin:2px">${S.ROLES[r]}</span>`).join('')}</td>
            <td>${u.active === false ? '<span class="pill tone-bad">ปิดใช้งาน</span>' : u.mustChangePassword ? '<span class="pill tone-warn">รอเปลี่ยนรหัส</span>' : '<span class="pill tone-free">ใช้งาน</span>'}</td>
            <td class="r" style="white-space:nowrap">${S.isUsernameEmail(u.email) ? `<button class="icon-btn sm" data-pw="${esc(u.email)}" title="ตั้งรหัสผ่านใหม่">${icon('key')}</button> ` : ''}<button class="icon-btn sm" data-ed="${esc(u.email)}" title="แก้ไขสิทธิ์">${icon('edit')}</button></td></tr>`).join('')}</tbody>
        </table></div></div>`,
      mount(root) {
        $('#q', root).addEventListener('input', UI.debounce(e => { location.hash = qs({ q: e.target.value }); }, 450));
        root.addEventListener('click', async e => {
          if (e.target.closest('#addU')) { if (await accountModal({ roles: ['driver'] })) App.render(); }
          if (e.target.closest('#addG')) {
            const res = await UI.modal({ title: `${icon('mail')} เพิ่มผู้ใช้ด้วยอีเมล`, body: `<p class="hint" style="margin-bottom:12px">เพิ่มรายชื่อไว้ล่วงหน้า แล้วกดดินสอเพื่อให้สิทธิ์ (แอดมิน/ผู้บริหาร/คนขับ) ได้ทันที — เจ้าของอีเมลเข้าระบบด้วยปุ่ม Google ครั้งแรกจะได้สิทธิ์ที่ตั้งไว้ · ใช้ได้ทั้งอีเมลโรงเรียน (@${S.DOMAINS[0]}) และ Gmail ของครูที่ไม่มีอีเมลโรงเรียน</p><form id="gF" class="grid2"><div class="field full"><label>อีเมล Google <b class="req">*</b></label><input name="email" type="email"></div><div class="field"><label>ชื่อ-นามสกุล</label><input name="name"></div><div class="field"><label>ฝ่าย</label><select name="dept"><option value=""></option>${S.DEPTS.map(d => `<option>${esc(d)}</option>`).join('')}</select></div></form>`,
              actions: [{ label: 'ยกเลิก', value: null }, { label: 'เพิ่ม', kind: 'btn-primary', onClick: async el => { const f = UI.formData(el.querySelector('#gF')); if (!/^\S+@\S+\.\S+$/.test(f.email)) { UI.toast('อีเมลไม่ถูกต้อง', 'error'); return false; } if (S.user(f.email)) { UI.toast('มีผู้ใช้นี้แล้ว', 'error'); return false; } await S.saveUser({ email: f.email.toLowerCase(), name: f.name, dept: f.dept, phone: '', roles: ['teacher'], active: true, provider: 'google', needsProfile: true, invited: true }); return true; } }] });
            if (res) { UI.toast('เพิ่มผู้ใช้แล้ว — กดดินสอเพื่อให้สิทธิ์ได้เลย'); App.render(); }
          }
          const pw = e.target.closest('[data-pw]');
          if (pw) { const res = await UI.confirm(`ตั้งรหัสผ่านใหม่ให้ <b>${esc(S.usernameOf(pw.dataset.pw))}</b> (ผู้ใช้ต้องเปลี่ยนเมื่อเข้าครั้งถัดไป)`, { title: 'ตั้งรหัสผ่านใหม่', ok: 'บันทึก', input: { label: 'รหัสผ่านใหม่ (≥ 6 ตัว)', required: true, value: String(Math.floor(100000 + Math.random() * 900000)) } }); if (res) S.resetPassword(pw.dataset.pw, res.value).then(() => UI.toast('ตั้งรหัสผ่านใหม่แล้ว')).catch(err => UI.toast(err.message, 'error')); }
          const ed = e.target.closest('[data-ed]');
          if (ed) {
            const u = S.user(ed.dataset.ed), sup = S.isSuper(S.me);
            const res = await UI.modal({ title: `${icon('user')} ${esc(u.name || u.email)}`, body: `<form id="uF" class="grid2">
                <div class="field full"><label>ชื่อ-นามสกุล</label><input name="name" value="${esc(u.name || '')}"></div>
                <div class="field"><label>ฝ่าย</label><input name="dept" value="${esc(u.dept || '')}"></div><div class="field"><label>เบอร์โทร</label><input name="phone" value="${esc(u.phone || '')}"></div>
                <div class="field full"><label>สิทธิ์</label><div class="checks">${Object.keys(S.ROLES).map(r => `<label class="check"><input type="checkbox" name="roles" data-multi value="${r}" ${(u.roles || []).includes(r) ? 'checked' : ''} ${(r === 'admin' || r === 'superadmin') && !sup ? 'disabled' : ''}>${S.ROLES[r]}</label>`).join('')}</div></div>
                <div class="field full"><label>ผูกกับพนักงานขับรถ (ถ้าเป็นคนขับ)</label><select name="driverId" id="uDrv"><option value="">— ไม่ผูก —</option>${S.db.drivers.map(d => { const cur = (S.driverOfUser({ ...u, roles: ['driver'] }) || {}).id === d.id, other = d.email && d.email !== u.email ? S.user(d.email) : null; return `<option value="${d.id}" ${cur ? 'selected' : ''}>${esc(d.name)}${other ? ` (ผูกกับบัญชี ${esc(S.usernameOf(other.email) || other.name || other.email)} อยู่ — จะย้ายมาบัญชีนี้)` : ''}</option>`; }).join('')}</select><span class="hint">${S.isUsernameEmail(u.email) ? 'เลือกคนขับแล้ว ระบบเติมชื่อ/เบอร์โทรตามคนขับให้ · ' : 'บัญชี Google ใช้ชื่อ/ฝ่าย/เบอร์ของเจ้าของบัญชีเหมือนเดิม · '}เอาสิทธิ์คนขับออก = ยกเลิกการผูก และคืนข้อมูลเดิม</span></div>
                <div class="field full"><label class="check sb-check"><input type="checkbox" name="standby" ${(S.driverOfUser(u) || {}).standby ? 'checked' : ''}> ${icon('alert')} คนขับสำรอง (ฉุกเฉินเท่านั้น)</label><span class="hint">เช่น ครูเวรที่ขับรถนำส่งผู้ป่วยได้ · ระบบสร้างชื่อในพนักงานขับรถให้อัตโนมัติ ใช้ได้เฉพาะปุ่ม "ออกงานฉุกเฉิน" ไม่โผล่ตอนจัดรถ</span></div>
                <div class="field full"><label class="check" style="width:max-content;max-width:100%"><input type="checkbox" name="dorm" ${(S.driverOfUser(u) || {}).dorm ? 'checked' : ''}> คนขับหอพัก (งานฉุกเฉินหลัง 18.00 · ส.–อา. ทั้งวัน)</label><span class="hint">ใช้คู่กับสิทธิ์พนักงานขับรถหรือคนขับสำรอง · เข้าตารางเวรคนขับหอพัก และได้เหมา 150 บาทเมื่อมีงานฉุกเฉิน</span></div>
                <div class="field full"><label class="check" style="width:max-content"><input type="checkbox" name="active" ${u.active !== false ? 'checked' : ''}> เปิดใช้งานบัญชี</label></div></form>`,
              onOpen: el => {
                const sel = el.querySelector('#uDrv'), rd = el.querySelector('input[name=roles][value=driver]'), F = n => el.querySelector(`#uF [name=${n}]`);
                // เลือกคนขับ → ติ๊กสิทธิ์คนขับให้ · เติมชื่อ/เบอร์ตามคนขับเฉพาะบัญชีชื่อผู้ใช้ (บัญชี Google ของครูใช้ข้อมูลของตัวเองเสมอ)
                sel.addEventListener('change', () => { const d = S.driver(sel.value); if (!d) return; if (rd) rd.checked = true; if (!S.isUsernameEmail(u.email)) return; F('name').value = d.name || ''; if (d.phone) F('phone').value = d.phone; F('dept').value = F('dept').value || 'งานยานพาหนะ'; });
                if (rd) rd.addEventListener('change', () => { if (!rd.checked) sel.value = ''; });
              },
              actions: [{ label: 'ลบผู้ใช้', kind: 'btn-danger', onClick: async () => { if (!(await UI.confirm('ลบผู้ใช้นี้ออกจากระบบ?', { danger: true, ok: 'ลบ' }))) return false; await S.removeUser(u.email); return 'del'; } }, { label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { const f = UI.formData(el.querySelector('#uF')); const roles = sup ? f.roles : [...new Set([...(f.roles || []).filter(r => r !== 'admin' && r !== 'superadmin'), ...(u.roles || []).filter(r => r === 'admin' || r === 'superadmin')])]; const wasSb = !!(S.driverOfUser(u) || {}).standby; await S.saveUser({ ...u, name: f.name, dept: f.dept, phone: f.phone, roles, active: f.active, driverId: f.driverId }); if (!!f.standby !== wasSb) await S.setStandby(u.email, !!f.standby);
                const drv = S.driverOfUser(S.user(u.email));
                if (drv && (drv.standby || !!f.dorm !== !!drv.dorm)) await S.saveDriver({ ...drv, dorm: !!f.dorm, ...(drv.standby ? { name: f.name || drv.name, phone: f.phone || drv.phone || '' } : {}) });
                else if (!drv && f.dorm) UI.toast('ติ๊กคนขับหอพักได้เมื่อมีสิทธิ์พนักงานขับรถหรือเป็นคนขับสำรอง', 'error');
                return true; } }] });
            if (res) { UI.toast(res === 'del' ? 'ลบผู้ใช้แล้ว' : 'บันทึกแล้ว'); App.render(); }
          }
        });
      }
    };
  };

  // ═════════ ล้างข้อมูล + ถังขยะ (ตั้งค่า · เฉพาะผู้ดูแลระบบสูงสุด) ═════════
  const PURGE_KINDS = [['requests', 'คำขอใช้รถ + ค่าใช้จ่าย', 'clipboard'], ['ratings', 'ผลประเมินคนขับ', 'star'], ['ot', 'ค่าล่วงเวลาที่แอดมินปรับ', 'clock'], ['places', 'สถานที่ที่เคยไป', 'pin'], ['users', 'ผู้ใช้ที่ปิดใช้งาน', 'users']];
  const PURGE_ST = ['pending', 'revise', 'returned', 'closed', 'rejected', 'cancelled'];
  function purgeHTML() {
    return `<div class="card pg-card" id="purge" style="margin-top:18px"><div class="card-head"><h3>${icon('trash')} ล้างข้อมูล</h3><span class="hint">เฉพาะผู้ดูแลระบบสูงสุด · ย้ายไปถังขยะ ${S.TRASH_DAYS} วัน กู้คืนได้</span></div>
      <form id="pgF" class="stack" style="gap:14px">
        <div class="field"><label>ข้อมูลที่จะล้าง</label><div class="checks">${PURGE_KINDS.map(([k, l, ic]) => `<label class="check"><input type="checkbox" name="kinds" data-multi value="${k}" ${k === 'requests' ? 'checked' : ''}>${icon(ic)} ${l}</label>`).join('')}</div>
          <button type="button" class="btn btn-ghost btn-xs" id="pgAll" style="margin-top:8px;width:max-content">${icon('list')} เลือกทั้งหมด (ล้างทั้งระบบ)</button></div>
        <details class="pg-more" open><summary>${icon('search')} กรองแบบละเอียด <span class="hint">(ไม่กรอก = ทั้งหมด)</span></summary>
          <div class="grid2" style="margin-top:12px">
            <div class="field"><label>วันที่เดินทาง / วันที่ประเมิน / ใช้ล่าสุด — ตั้งแต่</label><input type="date" name="from"></div>
            <div class="field"><label>ถึง</label><input type="date" name="to"></div>
            <div class="field full"><label>สถานะคำขอ</label><div class="checks">${PURGE_ST.map(k => `<label class="check"><input type="checkbox" name="status" data-multi value="${k}">${esc(S.STATUS[k].label)}</label>`).join('')}</div>
              <span class="hint">คำขอที่อนุมัติแล้วหรือกำลังเดินทาง จะไม่ถูกล้าง (กันลบงานที่ยังไม่จบ)</span>
              <label class="check pg-active" style="margin-top:6px;width:max-content;max-width:100%"><input type="checkbox" name="active"> รวมงานที่อนุมัติแล้ว/กำลังเดินทางด้วย (ใช้ตอนล้างข้อมูลทดลองก่อนเปิดใช้จริง)</label></div>
            <div class="field"><label>หมวดงาน</label><select name="category"><option value="">ทุกหมวด</option>${S.categories(true).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}<option value="other">อื่น ๆ</option></select></div>
            <div class="field"><label>รถ</label><select name="vehicleId"><option value="">ทุกคัน</option>${S.db.vehicles.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></div>
          </div></details>
        <div class="row" style="gap:10px;flex-wrap:wrap"><button type="button" class="btn btn-ghost" id="pgChk">${icon('search')} ตรวจจำนวนก่อนล้าง</button><button type="button" class="btn btn-danger" id="pgGo">${icon('trash')} ล้างข้อมูล</button></div>
        <div id="pgRes"></div>
      </form>
      <div class="divider"></div>
      <div class="card-head" style="padding:0;margin-bottom:10px"><h3>${icon('list')} เลขที่คำขอ</h3></div>
      <div id="pgCnt" class="pg-cnt"><p class="hint">กำลังตรวจ…</p></div>
      <div class="divider"></div>
      <div class="card-head" style="padding:0;margin-bottom:10px"><h3>${icon('undo')} ถังขยะ</h3><span class="hint">ครบ ${S.TRASH_DAYS} วันระบบลบถาวรอัตโนมัติ</span></div>
      <div id="pgTrash"><p class="hint">กำลังโหลด…</p></div></div>`;
  }
  function bindPurge(root) {
    const box = $('#purge', root); if (!box) return;
    const opts = () => { const f = UI.formData($('#pgF', box)); return { kinds: f.kinds || [], from: f.from, to: f.to, status: f.status || [], category: f.category, vehicleId: f.vehicleId, active: !!f.active }; };
    const L = Object.fromEntries(PURGE_KINDS.map(([k, l]) => [k, l]));
    const count = async () => {
      const o = opts(); if (!o.kinds.length) { UI.toast('เลือกข้อมูลที่จะล้างอย่างน้อย 1 อย่าง', 'error'); return null; }
      $('#pgRes', box).innerHTML = `<p class="hint">${icon('clock')} กำลังโหลดข้อมูลย้อนหลังให้ครบ…</p>`;
      await S.ensureHistory();
      const m = S.purgeMatch(o), n = Object.values(m).reduce((s, a) => s + a.length, 0);
      $('#pgRes', box).innerHTML = `<div class="note-box ${n ? 'warn-y' : ''}">${icon(n ? 'alert' : 'info')}<div>${n ? `พบ <b>${n}</b> รายการ: ${o.kinds.map(k => `${L[k]} <b>${m[k].length}</b>`).join(' · ')}` : 'ไม่พบข้อมูลตามเงื่อนไขนี้'}</div></div>`;
      return { m, n, o };
    };
    const drawTrash = async () => {
      const el = $('#pgTrash', box);
      let list = []; try { list = await S.trashList(); } catch (e) { el.innerHTML = `<p class="hint">โหลดถังขยะไม่สำเร็จ: ${esc(e.message)}</p>`; return; }
      const groups = [...list.reduce((mp, t) => mp.set(t.batch, [...(mp.get(t.batch) || []), t]), new Map()).values()];
      box._trash = groups;
      el.innerHTML = groups.length ? `<div class="stack">${groups.map((g, i) => { const t = g[0], left = Math.max(0, Math.ceil((new Date(t.expireAt) - Date.now()) / 864e5)); const by = PURGE_KINDS.map(([k, l]) => [l, g.filter(x => x.kind === k).length]).filter(x => x[1]);
          return `<div class="pg-batch"><div class="pg-bi">${icon('trash')}</div><div style="min-width:0;flex:1"><b>ล้างเมื่อ ${fmt.dt(t.at)}</b><small>โดย ${esc(t.byName || t.by)} · ${by.map(([l, n]) => `${l} ${n}`).join(' · ')}</small>
            <details><summary class="hint">ดูรายการ (${g.length})</summary><ul class="pg-items">${g.slice(0, 200).map(x => `<li>${esc(x.label || x.docId)}</li>`).join('')}${g.length > 200 ? `<li>… อีก ${g.length - 200} รายการ</li>` : ''}</ul></details></div>
            <span class="pill ${left <= 3 ? 'tone-bad' : 'tone-warn'}">ลบถาวรใน ${left} วัน</span>
            <div class="row" style="gap:6px"><button type="button" class="btn btn-ghost btn-xs" data-rest="${i}">${icon('undo')} กู้คืน</button><button type="button" class="btn btn-ghost btn-xs pg-del" data-tdel="${i}">${icon('x')} ลบถาวร</button></div></div>`; }).join('')}</div>`
        : `<p class="hint">ถังขยะว่าง</p>`;
    };
    const drawCnt = async () => {
      const el = $('#pgCnt', box); if (!el) return;
      try { const c = await S.counterInfo(); const ok = !c.left && !c.inTrash;
        el.innerHTML = `<p>ปี ${c.y}: ออกเลขไปแล้วถึง <b>VR-${c.y}-${String(c.n).padStart(4, '0')}</b> · คำขอถัดไปจะเป็น <b>VR-${c.y}-${String(c.n + 1).padStart(4, '0')}</b></p>${c.n ? `<div class="row" style="gap:10px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-sm" id="pgCntReset" ${ok ? '' : 'disabled'}>${icon('refresh')} เริ่มเลขคำขอใหม่ (VR-${c.y}-0001)</button>${ok ? '' : `<span class="hint">ต้องล้างคำขอปี ${c.y} ให้หมด${c.left ? ` (เหลือ ${c.left})` : ''} และลบถาวรจากถังขยะ${c.inTrash ? ` (อยู่ในถังขยะ ${c.inTrash})` : ''} ก่อน — กันเลขซ้ำ</span>`}</div>` : ''}`;
      } catch (err) { el.innerHTML = `<p class="hint">ตรวจเลขคำขอไม่สำเร็จ: ${esc(err.message)}</p>`; }
    };
    drawTrash(); drawCnt();
    box.addEventListener('click', async e => {
      if (e.target.closest('#pgCntReset')) { if (!(await UI.confirm('เริ่มเลขคำขอใหม่ คำขอถัดไปจะเป็นเลข 0001 ของปีนี้', { title: 'เริ่มเลขคำขอใหม่', ok: 'เริ่มใหม่' }))) return; try { const y = await S.resetCounter(); UI.toast(`คำขอถัดไปจะเป็น VR-${y}-0001`); drawCnt(); } catch (err) { UI.toast(err.message, 'error'); } return; }
      if (e.target.closest('#pgAll')) { $$('input[name=kinds]', box).forEach(c => { c.checked = true; }); ['from', 'to', 'category', 'vehicleId'].forEach(n => { $(`[name=${n}]`, box).value = ''; }); $$('input[name=status]', box).forEach(c => { c.checked = false; }); const ac = $('[name=active]', box); if (ac) ac.checked = true; UI.toast('เลือกทุกประเภท รวมงานที่ยังไม่จบ และล้างตัวกรองแล้ว — กดตรวจจำนวนก่อนล้าง'); return; }
      if (e.target.closest('#pgChk')) { const b = e.target.closest('#pgChk'); b.disabled = true; try { await count(); } finally { b.disabled = false; } return; }
      if (e.target.closest('#pgGo')) {
        const b = e.target.closest('#pgGo'); b.disabled = true;
        try {
          const c = await count(); if (!c || !c.n) return;
          const res = await UI.confirm(`ล้างข้อมูล <b>${c.n}</b> รายการ ออกจากฐานข้อมูล<br>${c.o.kinds.map(k => `• ${L[k]} ${c.m[k].length} รายการ`).join('<br>')}<br><br>ข้อมูลจะอยู่ในถังขยะ ${S.TRASH_DAYS} วัน กู้คืนได้ จากนั้นจะถูกลบถาวร<br>พิมพ์คำว่า <b>ลบ</b> เพื่อยืนยัน`, { title: 'ยืนยันการล้างข้อมูล', danger: true, ok: 'ล้างข้อมูล', input: { label: 'พิมพ์ ลบ', required: true } });
          if (!res) return;
          if (res.value !== 'ลบ') { UI.toast('พิมพ์คำว่า “ลบ” ไม่ถูกต้อง — ยกเลิกการล้างข้อมูล', 'error'); return; }
          UI.toast('กำลังล้างข้อมูล…', 'info');
          const r = await S.purgeData(c.m);
          UI.toast(`ล้างข้อมูลแล้ว ${r.n} รายการ (กู้คืนได้ใน ${S.TRASH_DAYS} วัน)`);
          $('#pgRes', box).innerHTML = ''; await drawTrash(); drawCnt();
        } catch (err) { UI.toast(err.message, 'error'); } finally { b.disabled = false; }
        return;
      }
      const rs = e.target.closest('[data-rest]'), td = e.target.closest('[data-tdel]');
      if (rs || td) {
        const g = (box._trash || [])[+(rs || td).dataset[rs ? 'rest' : 'tdel']]; if (!g) return;
        if (rs && !(await UI.confirm(`กู้คืนข้อมูล <b>${g.length}</b> รายการกลับเข้าระบบ?`, { title: 'กู้คืนข้อมูล', ok: 'กู้คืน' }))) return;
        if (td && !(await UI.confirm(`ลบถาวร <b>${g.length}</b> รายการ — กู้คืนไม่ได้อีก`, { title: 'ลบถาวร', danger: true, ok: 'ลบถาวร' }))) return;
        try { if (rs) await S.restoreTrash(g); else await S.deleteTrash(g); UI.toast(rs ? 'กู้คืนแล้ว' : 'ลบถาวรแล้ว'); await drawTrash(); drawCnt(); } catch (err) { UI.toast(err.message, 'error'); }
      }
    });
  }

  // ═════════ ช่วงเวลา (ใช้ในค่าใช้จ่าย/สถิติ) ═════════
  function periodOf(query) {
    const now = new Date(), y = now.getFullYear(), mo = now.getMonth();
    const P = {
      month: [new Date(y, mo, 1), new Date(y, mo + 1, 0, 23, 59, 59)],
      lastmonth: [new Date(y, mo - 1, 1), new Date(y, mo, 0, 23, 59, 59)],
      fy: mo >= 9 ? [new Date(y, 9, 1), new Date(y + 1, 8, 30, 23, 59, 59)] : [new Date(y - 1, 9, 1), new Date(y, 8, 30, 23, 59, 59)],
      ay: (mo > 4 || (mo === 4 && now.getDate() >= 16)) ? [new Date(y, 4, 16), new Date(y + 1, 4, 15, 23, 59, 59)] : [new Date(y - 1, 4, 16), new Date(y, 4, 15, 23, 59, 59)],
      y12: [new Date(y, mo - 11, 1), new Date(y, mo + 1, 0, 23, 59, 59)],
      all: [new Date(2000, 0, 1), new Date(2999, 0, 1)]
    };
    const k = query.p || 'fy';
    let [from, to] = P[k] || P.fy;
    if (k === 'custom') { from = query.from ? new Date(query.from + 'T00:00:00') : P.fy[0]; to = query.to ? new Date(query.to + 'T23:59:59') : P.fy[1]; }
    const label = { month: 'เดือนนี้', lastmonth: 'เดือนที่แล้ว', fy: `ปีงบประมาณ ${(P.fy[1].getFullYear() + 543)}`, ay: `ปีการศึกษา ${(P.ay[0].getFullYear() + 543)}`, y12: '12 เดือนล่าสุด', all: 'ทั้งหมด', custom: `${fmt.date(from)} – ${fmt.date(to)}` }[k];
    return { k, from, to, label };
  }
  function periodBar(base, per, query) {
    const qs = o => base + '?' + new URLSearchParams({ ...query, ...o });
    return `<div class="toolbar no-print"><div class="seg">${[['month', 'เดือนนี้'], ['lastmonth', 'เดือนที่แล้ว'], ['fy', 'ปีงบประมาณ'], ['ay', 'ปีการศึกษา'], ['y12', '12 เดือน'], ['all', 'ทั้งหมด'], ['custom', 'กำหนดเอง']].map(([k, l]) => `<a href="${qs({ p: k })}"><button class="${per.k === k ? 'on' : ''}" tabindex="-1">${l}</button></a>`).join('')}</div>
      ${per.k === 'custom' ? `<input class="input" type="date" id="pFrom" value="${fmt.localDate(per.from)}" style="width:auto"> – <input class="input" type="date" id="pTo" value="${fmt.localDate(per.to)}" style="width:auto">` : ''}</div>`;
  }
  const bindPeriod = (root, base, query) => { const go = () => { location.hash = base + '?' + new URLSearchParams({ ...query, p: 'custom', from: $('#pFrom', root).value, to: $('#pTo', root).value }); }; $('#pFrom', root)?.addEventListener('change', go); $('#pTo', root)?.addEventListener('change', go); };
  const inPer = (d, per) => new Date(d) >= per.from && new Date(d) <= per.to;
  // ใช้ร่วมกับหน้าค่าล่วงเวลา (pages-ot.js)
  Pages._adm = { head, periodOf, periodBar, bindPeriod, inPer };
  // แถบแจ้งระหว่างโหลดข้อมูลย้อนหลัง (เก่ากว่า ~13 เดือน — ดู Store.needHistory)
  const histNote = loading => loading ? `<div class="note-box" style="margin-bottom:14px">${icon('clock')}<div>กำลังโหลดข้อมูลย้อนหลัง… ตัวเลขจะครบเมื่อโหลดเสร็จ</div></div>` : '';

  // ═════════ พิมพ์รายงานค่าใช้จ่าย (A4 · บันทึกเป็น PDF ได้) ═════════
  const PSIGN = 'vb-print-sign';
  // คอลัมน์ตารางรายละเอียด (เลือกได้) · nw = ไม่ตัดบรรทัด (กว้างเท่าข้อความ) · ที่เหลือตัดบรรทัดได้
  const EXP_COLS = [
    { k: 'no', l: 'ที่', nw: 1, c: 1 }, { k: 'date', l: 'วันที่', nw: 1 }, { k: 'veh', l: 'รถ', nw: 1 }, { k: 'plate', l: 'ทะเบียน', nw: 1 },
    { k: 'req', l: 'เลขที่คำขอ', nw: 1 }, { k: 'dest', l: 'ปลายทาง' }, { k: 'type', l: 'ประเภท', nw: 1 }, { k: 'detail', l: 'รายละเอียด' },
    { k: 'pay', l: 'ชำระโดย', nw: 1 }, { k: 'amt', l: 'จำนวนเงิน (บาท)', nw: 1, r: 1, fixed: 1 }];
  const EXP_FS = { s: 'เล็ก', m: 'กลาง', l: 'ใหญ่' };
  async function printExpenses(rows, per, filters, { dl = false } = {}) {
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(PSIGN) || '{}'); } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    const colOn = saved.cols || EXP_COLS.map(c => c.k), fs0 = saved.fs || 'm';
    const sg = saved.sign || [{ n: S.me.name || '', p: 'เจ้าหน้าที่งานยานพาหนะ', r: 'ผู้จัดทำ' }, { n: '', p: 'หัวหน้างานยานพาหนะ', r: 'ผู้ตรวจสอบ' }, { n: '', p: 'รองผู้อำนวยการฝ่ายบริหารงานทั่วไป', r: 'ผู้รับรอง' }];
    const hasPhotos = rows.some(x => (x.e.photos || []).length);
    const opt = await UI.modal({
      title: `${icon(dl ? 'download' : 'printer')} ${dl ? 'ดาวน์โหลด PDF' : 'พิมพ์รายงาน'} — ค่าใช้จ่ายยานพาหนะ`, size: 'lg',
      body: `<form id="po" class="stack" style="gap:14px">
        <div class="note-box navy">${icon('info')}<div><b>ดาวน์โหลด PDF</b> = ได้ไฟล์ลงเครื่องทันที · <b>พิมพ์</b> = เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ (เลือก "บันทึกเป็น PDF" ได้ และมีเลขหน้า)</div></div>
        <div class="grid2">
          <div class="field"><label>ขนาดตัวอักษร</label><div class="row" style="gap:16px">${Object.entries(EXP_FS).map(([k, l]) => `<label class="check"><input type="radio" name="fs" value="${k}" ${fs0 === k ? 'checked' : ''}> ${l}</label>`).join('')}</div><span class="hint">ข้อความยาว (ปลายทาง รายละเอียด) ตัดขึ้นบรรทัดใหม่ · วันที่ ทะเบียน ยอดเงิน ไม่ตกบรรทัด</span></div>
          <div class="field"><label>แนวกระดาษ</label><div class="row" style="gap:16px"><label class="check"><input type="radio" name="o" value="p" ${saved.o !== 'l' ? 'checked' : ''}> แนวตั้ง</label><label class="check"><input type="radio" name="o" value="l" ${saved.o === 'l' ? 'checked' : ''}> แนวนอน</label></div></div>
          <div class="field"><label>ส่วนที่พิมพ์</label><div class="stack" style="gap:6px">
            <label class="check"><input type="checkbox" name="byV" ${saved.byV !== false ? 'checked' : ''}> สรุปแยกตามรถแต่ละคัน</label>
            <label class="check"><input type="checkbox" name="sign" ${saved.signOn !== false ? 'checked' : ''}> ช่องลงนาม</label>
            <label class="check"><input type="checkbox" name="pics" ${hasPhotos ? '' : 'disabled'}> แนบรูปใบเสร็จท้ายรายงาน${hasPhotos ? '' : ' (ไม่มีรูป)'}</label></div></div>
          <div class="field full"><label>คอลัมน์ในตารางรายละเอียด</label><div class="checks">${EXP_COLS.map(c => `<label class="check"><input type="checkbox" name="cols" data-multi value="${c.k}" ${c.fixed || colOn.includes(c.k) ? 'checked' : ''} ${c.fixed ? 'disabled' : ''}>${c.l}</label>`).join('')}</div></div>
        </div>
        <div class="field"><label>ผู้ลงนาม <span class="hint" style="font-weight:400">(ระบบจำไว้ใช้ครั้งต่อไป · เว้นชื่อว่างได้ เพื่อเขียนด้วยมือ)</span></label>
          <div class="stack" style="gap:8px">${sg.map((x, i) => `<div class="grid3" style="gap:8px"><input class="input" name="r${i}" value="${esc(x.r)}" placeholder="บทบาท"><input class="input" name="n${i}" value="${esc(x.n)}" placeholder="ชื่อ-นามสกุล"><input class="input" name="p${i}" value="${esc(x.p)}" placeholder="ตำแหน่ง"></div>`).join('')}</div></div>
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null },
        { label: 'พิมพ์', kind: dl ? 'btn-ghost' : 'btn-primary', icon: 'printer', onClick: el => ({ ...UI.formData($('#po', el)), mode: 'print' }) },
        { label: 'ดาวน์โหลด PDF', kind: dl ? 'btn-primary' : 'btn-ghost', icon: 'download', onClick: el => ({ ...UI.formData($('#po', el)), mode: 'pdf' }) }]
    });
    if (!opt) return;
    const sign = [0, 1, 2].map(i => ({ r: opt['r' + i].trim(), n: opt['n' + i].trim(), p: opt['p' + i].trim() }));
    const cols = EXP_COLS.filter(c => c.fixed || (opt.cols || []).includes(c.k)), fsz = EXP_FS[opt.fs] ? opt.fs : 'm';
    try { localStorage.setItem(PSIGN, JSON.stringify({ o: opt.o, byV: opt.byV, signOn: opt.sign, sign, cols: cols.map(c => c.k), fs: fsz })); } catch (e) { /* ไม่บันทึกก็ได้ */ }
    const cell = (k, r, e, i) => ({
      no: i + 1, date: fmt.date(e.date), veh: esc(C.vName(e.vehicleId)), plate: esc(C.vPlate(e.vehicleId) || '-'), req: r.id, dest: esc(S.destName(r)), type: esc(Pages._expTitle(e)),
      detail: [e.station && esc(e.station), e.liters && `<span class="nb">${fmt.num(e.liters, 2)} ลิตร × ${fmt.num(e.pricePerL, 2)} บาท</span>`, e.odo && `<span class="nb">เลขไมล์ ${fmt.num(e.odo)}</span>`, e.note && esc(e.note)].filter(Boolean).join(' · ') || '-',
      pay: esc(S.PAY[e.pay] || '-'), amt: (+e.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })[k];
    // รวมคอลัมน์ที่เกี่ยวกันเป็นช่องเดียว 2 บรรทัด (รถ/ทะเบียน · เลขที่คำขอ/ปลายทาง · ประเภท/รายละเอียด) → ตารางแคบลง ไม่ต้องตกบรรทัดทุกช่อง
    const GROUPS = [['no'], ['date'], ['veh', 'plate'], ['req', 'dest'], ['type', 'detail'], ['pay'], ['amt']];
    const on = new Set(cols.map(c => c.k)), CK = Object.fromEntries(EXP_COLS.map(c => [c.k, c]));
    const gcols = GROUPS.map(g => g.filter(k => on.has(k))).filter(g => g.length).map(g => {
      const main = CK[g[0]];
      // บรรทัดแรกไม่ตัด · บรรทัดรอง (ปลายทาง/รายละเอียด) ตัดบรรทัดได้ → ช่องที่มีบรรทัดรองยาวให้ยืดได้
      const wraps = g.some(k => !CK[k].nw);
      return { keys: g, l: g.map(k => CK[k].l).join(' / '), cls: [wraps ? 'wr' : 'nw', main.r ? 'r' : '', main.c ? 'c' : ''].filter(Boolean).join(' ') };
    });
    const gcell = (g, r, e, i) => { const [a, b] = g.keys; const va = cell(a, r, e, i); return b ? (CK[a].nw ? `<span class="nw1">${va}</span>` : va) + `<small>${cell(b, r, e, i)}</small>` : va; };

    const st = S.db.settings, m2 = n => (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const total = rows.reduce((s, x) => s + x.e.amount, 0);
    const asc = rows.slice().sort((a, b) => a.e.date.localeCompare(b.e.date));
    const to = per.to > new Date(2900, 0) ? new Date() : per.to;
    const from = per.k === 'all' && asc.length ? new Date(asc[0].e.date) : per.from;
    // สรุปตามประเภท
    const byType = Object.entries(S.EXPENSE).map(([k, l]) => { const rs = rows.filter(x => x.e.type === k); return { l, n: rs.length, lit: rs.reduce((s, x) => s + (+x.e.liters || 0), 0), amt: rs.reduce((s, x) => s + x.e.amount, 0) }; }).filter(x => x.n);
    // สรุปตามรถ
    const vids = [...new Set(rows.map(x => x.e.vehicleId))];
    const byVeh = vids.map(id => { const rs = rows.filter(x => x.e.vehicleId === id), sum = k => rs.filter(x => x.e.type === k).reduce((s, x) => s + x.e.amount, 0); return { id, n: rs.length, lit: rs.reduce((s, x) => s + (+x.e.liters || 0), 0), fuel: sum('fuel'), toll: sum('toll'), oth: sum('parking') + sum('other'), amt: rs.reduce((s, x) => s + x.e.amount, 0) }; }).sort((a, b) => b.amt - a.amt);
    const pics = opt.pics ? asc.flatMap(({ r, e }) => (e.photos || []).filter(p => !UI.isPdf(p)).map(p => ({ p, r, e }))) : [];
    const html = `<div class="pd-fs pd-fs-${fsz}">
      <header class="pd-head"><img src="images/logo.png" alt=""><div><b>${esc(st.schoolName || '')}</b><span>${esc(st.division || '')} · ${esc(st.unit || 'งานยานพาหนะ')}</span></div></header>
      <h1 class="pd-title">รายงานค่าน้ำมันและค่าใช้จ่ายยานพาหนะ</h1>
      <p class="pd-sub">${esc(per.k === 'custom' ? 'ช่วงวันที่กำหนดเอง' : per.label)} · ตั้งแต่ ${fmt.dateLong(from)} ถึง ${fmt.dateLong(to)}${filters.length ? `<br>เงื่อนไข: ${esc(filters.join(' · '))}` : ''}</p>
      <h2>1. สรุปตามประเภทค่าใช้จ่าย</h2>
      <table class="pd-tbl"><thead><tr><th>ประเภท</th><th class="r">จำนวนรายการ</th><th class="r">ปริมาณ (ลิตร)</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody>${byType.map(x => `<tr><td>${x.l}</td><td class="r">${x.n}</td><td class="r">${x.lit ? fmt.num(x.lit, 2) : '-'}</td><td class="r">${m2(x.amt)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>รวมทั้งสิ้น</td><td class="r">${rows.length}</td><td class="r">${fmt.num(byType.reduce((s, x) => s + x.lit, 0), 2)}</td><td class="r">${m2(total)}</td></tr></tfoot></table>
      <p class="pd-words">(${UI.bahtText(total)})</p>
      ${opt.byV ? `<h2>2. สรุปแยกตามรถ</h2>
      <table class="pd-tbl" data-fitw><thead><tr><th class="nw">รถ</th><th class="nw">ทะเบียน</th><th class="r">รายการ</th><th class="r">ลิตร</th><th class="r">ค่าน้ำมัน</th><th class="r">ทางด่วน</th><th class="r">อื่น ๆ</th><th class="r">รวม (บาท)</th></tr></thead>
        <tbody>${byVeh.map(x => `<tr><td class="nw">${esc(C.vName(x.id))}</td><td class="nw">${esc(C.vPlate(x.id) || '')}</td><td class="r">${x.n}</td><td class="r">${x.lit ? fmt.num(x.lit, 2) : '-'}</td><td class="r">${m2(x.fuel)}</td><td class="r">${m2(x.toll)}</td><td class="r">${m2(x.oth)}</td><td class="r">${m2(x.amt)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>${opt.byV ? 3 : 2}. รายละเอียดรายการ</h2>
      <table class="pd-tbl pd-exp" data-fitw><thead><tr>${gcols.map(g => `<th class="${g.cls}">${g.l}</th>`).join('')}</tr></thead>
        <tbody>${asc.map(({ r, e }, i) => `<tr>${gcols.map(g => `<td class="${g.cls}">${gcell(g, r, e, i)}</td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr>${gcols.length > 1 ? `<td colspan="${gcols.length - 1}">รวมทั้งสิ้น ${rows.length} รายการ</td>` : ''}<td class="r nw">${m2(total)}</td></tr></tfoot></table>
      <p class="pd-words">จำนวนเงินรวม ${m2(total)} บาท (${UI.bahtText(total)})</p>
      ${opt.sign ? `<div class="pd-sign">${sign.map(x => `<div>${x.r ? `<p class="pd-role">${esc(x.r)}</p>` : ''}<p class="pd-line">ลงชื่อ ....................................</p><p>(${x.n ? esc(x.n) : '....................................'})</p><p>${x.p ? `ตำแหน่ง ${esc(x.p)}` : 'ตำแหน่ง ..............................'}</p><p>วันที่ ....... / ....... / .......</p></div>`).join('')}</div>` : ''}
      <p class="pd-foot">พิมพ์จากระบบยานพาหนะ เมื่อ ${fmt.dt(new Date().toISOString())} โดย ${esc(S.me.name || S.me.email)}</p>
      ${pics.length ? `<section class="pd-pics"><h2>ภาคผนวก: รูปใบเสร็จ (${pics.length} รูป)</h2><div class="pd-grid">${pics.map(({ p, r, e }) => `<figure>${UI.img(p, 'ใบเสร็จ')}<figcaption>${fmt.date(e.date)} · ${esc(C.vName(e.vehicleId))} · ${S.EXPENSE[e.type]} ${m2(e.amount)} บาท · ${r.id}</figcaption></figure>`).join('')}</div></section>` : ''}</div>`;
    const nm = `รายงานค่าใช้จ่ายยานพาหนะ ${fmt.localDate(from)} ถึง ${fmt.localDate(to)}`;
    const po = { title: nm, landscape: opt.o === 'l', fitWidth: opt.o === 'l' ? '273mm' : '186mm' };
    if (opt.mode === 'pdf') await UI.savePdf(html, po); else UI.printDoc(html, po);
  }

  // ═════════ ค่าน้ำมัน / ค่าใช้จ่าย ═════════
  Pages.adminExpenses = ({ query }) => {
    if (query.view === 'ot') return Pages._otAdmin({ query });   // แถบค่าล่วงเวลา
    const per = periodOf(query), vf = query.v || '', tf = query.t || '', cf = query.c || '';
    const hist = S.needHistory(per.from);
    const rows = [];
    S.db.requests.forEach(r => (r.expenses || []).forEach(e => { if (inPer(e.date + 'T12:00:00', per) && (!vf || e.vehicleId === vf) && (!tf || e.type === tf) && (!cf || (r.category || '') === (cf === 'none' ? '' : cf))) rows.push({ r, e }); }));
    rows.sort((a, b) => b.e.date.localeCompare(a.e.date));
    const by = k => rows.filter(x => x.e.type === k).reduce((s, x) => s + x.e.amount, 0);
    const total = rows.reduce((s, x) => s + x.e.amount, 0), liters = rows.reduce((s, x) => s + (+x.e.liters || 0), 0);
    const qs = o => '#/admin/expenses?' + new URLSearchParams({ ...query, ...o });
    const view = query.view === 'stats' ? 'stats' : 'list';
    // ── สรุปสถิติค่าน้ำมัน: ราคาเฉลี่ย/ลิตร · กม./ลิตร · บาท/กม. · รายเดือน · รายคัน · ปั๊มที่ใช้บ่อย ──
    const fuel = rows.filter(x => x.e.type === 'fuel');
    const fuelAmt = fuel.reduce((s, x) => s + x.e.amount, 0), fuelL = fuel.reduce((s, x) => s + (+x.e.liters || 0), 0);
    const kmOf = (r, vid) => { const a = (r.assignments || []).find(x => x.vehicleId === vid); if (a && a.odoStart != null && a.odoEnd != null && a.odoEnd > a.odoStart) return a.odoEnd - a.odoStart; return (r.assignments || []).length === 1 ? (+r.totalKm || 0) : 0; };
    const trips = S.db.requests.filter(r => ['returned', 'closed'].includes(r.status) && inPer(r.startAt, per) && (!cf || (r.category || '') === (cf === 'none' ? '' : cf)));
    const vehIds = [...new Set([...fuel.map(x => x.e.vehicleId), ...trips.flatMap(r => (r.assignments || []).map(a => a.vehicleId))])].filter(id => !vf || id === vf);
    const fv = vehIds.map(id => {
      const fs = fuel.filter(x => x.e.vehicleId === id), lit = fs.reduce((s, x) => s + (+x.e.liters || 0), 0), amt = fs.reduce((s, x) => s + x.e.amount, 0);
      const ts = trips.filter(r => (r.assignments || []).some(a => a.vehicleId === id)), km = ts.reduce((s, r) => s + kmOf(r, id), 0);
      return { id, n: fs.length, trips: ts.length, lit, amt, km, ppl: lit ? amt / lit : 0, kmpl: lit && km ? km / lit : 0, bpk: km ? amt / km : 0 };
    }).filter(x => x.n || x.trips).sort((a, b) => b.amt - a.amt);
    const allKm = fv.reduce((s, x) => s + x.km, 0);
    const months = (() => { const m = new Map(); fuel.forEach(x => { const k = x.e.date.slice(0, 7); const o = m.get(k) || { k, amt: 0, lit: 0 }; o.amt += x.e.amount; o.lit += +x.e.liters || 0; m.set(k, o); }); return [...m.values()].sort((a, b) => a.k.localeCompare(b.k)); })();
    const stations = (() => { const m = new Map(); fuel.forEach(x => { const k = (x.e.brand || x.e.station || 'ไม่ระบุ').trim(); const o = m.get(k) || { k, n: 0, amt: 0, lit: 0 }; o.n++; o.amt += x.e.amount; o.lit += +x.e.liters || 0; m.set(k, o); }); return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8); })();
    const monthLbl = k => new Date(k + '-01T00:00:00').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    const statsHTML = () => `
        <div class="kpis" style="margin-bottom:16px">
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('fuel')}</span><b class="num">${fmt.num(fuelL, 1)}<em>ลิตร</em></b><span class="l">น้ำมันรวม · ${fuel.length} ครั้ง · ${fmt.money(fuelAmt)} ฿</span></div>
          <div class="kpi"><span class="k-ic">${icon('coins')}</span><b class="num">${fuelL ? fmt.num(fuelAmt / fuelL, 2) : '-'}<em>฿/ลิตร</em></b><span class="l">ราคาเฉลี่ยต่อลิตร</span></div>
          <div class="kpi" style="--kb:#d9f5e8;--kc:#047857"><span class="k-ic">${icon('gauge')}</span><b class="num">${fuelL && allKm ? fmt.num(allKm / fuelL, 1) : '-'}<em>กม./ลิตร</em></b><span class="l">อัตราสิ้นเปลืองเฉลี่ย · ${fmt.num(allKm)} กม.</span></div>
          <div class="kpi"><span class="k-ic">${icon('route')}</span><b class="num">${allKm ? fmt.num(fuelAmt / allKm, 2) : '-'}<em>฿/กม.</em></b><span class="l">ค่าน้ำมันต่อกิโลเมตร</span></div>
        </div>
        <div class="split">
          <div class="card"><div class="card-head"><h3>${icon('chart')} ค่าน้ำมันรายเดือน</h3><span class="hint">แท่ง = บาท · เส้น = ลิตร</span></div>${months.length ? '<div class="chart-box"><canvas id="chFuelM"></canvas></div>' : UI.empty('ไม่มีข้อมูลในช่วงนี้', 'fuel')}</div>
          <div class="card"><div class="card-head"><h3>${icon('pin')} ปั๊มที่เติมบ่อย</h3></div>${stations.length ? `<div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>ปั๊ม</th><th class="r">ครั้ง</th><th class="r">ลิตร</th><th class="r">฿/ลิตร</th></tr></thead><tbody>${stations.map(x => `<tr><td><b>${esc(x.k)}</b></td><td class="r">${x.n}</td><td class="r">${fmt.num(x.lit, 1)}</td><td class="r">${x.lit ? fmt.num(x.amt / x.lit, 2) : '-'}</td></tr>`).join('')}</tbody></table></div>` : UI.empty('ไม่มีข้อมูล', 'pin')}</div>
        </div>
        <div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('van')} สรุปค่าน้ำมันรายคัน</h3><span class="hint">กม. จากเลขไมล์ (ถ้าไม่มี ใช้ระยะทางในคำขอ)</span></div>
          ${fv.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>รถ</th><th class="r">เที่ยว</th><th class="r">เติม (ครั้ง)</th><th class="r">ลิตร</th><th class="r">ค่าน้ำมัน (฿)</th><th class="r">฿/ลิตร</th><th class="r">กม.</th><th class="r">กม./ลิตร</th><th class="r">฿/กม.</th></tr></thead>
            <tbody>${fv.map(x => `<tr><td><b>${esc(C.vName(x.id))}</b><small>${esc(C.vPlate(x.id) || '')}</small></td><td class="r">${x.trips}</td><td class="r">${x.n}</td><td class="r">${fmt.num(x.lit, 1)}</td><td class="r"><b>${fmt.money(x.amt)}</b></td><td class="r">${x.ppl ? fmt.num(x.ppl, 2) : '-'}</td><td class="r">${fmt.num(x.km)}</td><td class="r">${x.kmpl ? `<span class="pill ${x.kmpl < 6 ? 'tone-bad' : x.kmpl < 9 ? 'tone-warn' : 'tone-ok'}">${fmt.num(x.kmpl, 1)}</span>` : '-'}</td><td class="r">${x.bpk ? fmt.num(x.bpk, 2) : '-'}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td>รวม</td><td class="r">${fv.reduce((s, x) => s + x.trips, 0)}</td><td class="r">${fuel.length}</td><td class="r">${fmt.num(fuelL, 1)}</td><td class="r">${fmt.money(fuelAmt)}</td><td class="r">${fuelL ? fmt.num(fuelAmt / fuelL, 2) : '-'}</td><td class="r">${fmt.num(allKm)}</td><td class="r">${fuelL && allKm ? fmt.num(allKm / fuelL, 1) : '-'}</td><td class="r">${allKm ? fmt.num(fuelAmt / allKm, 2) : '-'}</td></tr></tfoot></table></div>
            <p class="hint" style="margin-top:8px">${icon('info')} สี กม./ลิตร: <span class="pill tone-ok">9 ขึ้นไป</span> ปกติ · <span class="pill tone-warn">6–9</span> ควรสังเกต · <span class="pill tone-bad">ต่ำกว่า 6</span> ตรวจสอบรถ/การกรอกเลขไมล์</p>` : UI.empty('ไม่มีข้อมูลในช่วงนี้', 'van')}</div>`;
    return {
      layout: 'admin',
      html: `${head('รายงาน', 'ค่าน้ำมัน / ค่าใช้จ่าย', per.label, `<button class="btn btn-primary btn-sm" id="pdfDl" ${rows.length ? '' : 'disabled'}>${icon('download')} ดาวน์โหลด PDF</button><button class="btn btn-ghost btn-sm" id="pdf" ${rows.length ? '' : 'disabled'}>${icon('printer')} พิมพ์</button><button class="btn btn-ghost btn-sm" id="xls">${icon('download')} Excel</button>`)}
        ${periodBar('#/admin/expenses', per, query)}${histNote(hist)}
        <div class="toolbar"><div class="seg"><a href="${qs({ view: 'list' })}"><button class="${view === 'list' ? 'on' : ''}" tabindex="-1">${icon('clipboard')} รายการ</button></a><a href="${qs({ view: 'stats' })}"><button class="${view === 'stats' ? 'on' : ''}" tabindex="-1">${icon('chart')} สรุปสถิติค่าน้ำมัน</button></a><a href="${qs({ view: 'ot' })}"><button tabindex="-1">${icon('clock')} ค่าล่วงเวลา</button></a></div></div>
        <div class="toolbar"><select class="input" id="vf" style="width:auto"><option value="">รถทุกคัน</option>${S.db.vehicles.map(v => `<option value="${v.id}" ${v.id === vf ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
          <select class="input" id="tf" style="width:auto"><option value="">ทุกประเภท</option>${Object.entries(S.EXPENSE).map(([k, l]) => `<option value="${k}" ${k === tf ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="input" id="cf" style="width:auto"><option value="">ทุกหมวดงาน</option>${S.categories(true).map(c => `<option value="${c.id}" ${c.id === cf ? 'selected' : ''}>${esc(c.id === 'other' ? 'อื่น ๆ' : c.name)}</option>`).join('')}<option value="none" ${cf === 'none' ? 'selected' : ''}>ไม่ระบุหมวด</option></select></div>
        ${view === 'stats' ? statsHTML() : `
        <div class="kpis" style="margin-bottom:16px">
          <div class="kpi" style="--kb:var(--navy-50)"><span class="k-ic">${icon('coins')}</span><b class="num">${fmt.money(total)}<em>฿</em></b><span class="l">รวมทั้งหมด (${rows.length} รายการ)</span></div>
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('fuel')}</span><b class="num">${fmt.money(by('fuel'))}<em>฿</em></b><span class="l">ค่าน้ำมัน · ${fmt.num(liters, 1)} ลิตร</span></div>
          <div class="kpi"><span class="k-ic">${icon('route')}</span><b class="num">${fmt.money(by('toll'))}<em>฿</em></b><span class="l">ค่าทางด่วน</span></div>
          <div class="kpi"><span class="k-ic">${icon('coins')}</span><b class="num">${fmt.money(by('parking') + by('other'))}<em>฿</em></b><span class="l">ที่จอดรถ + อื่น ๆ</span></div>
        </div>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>วันที่</th><th>ประเภท</th><th>รถ</th><th>คำขอ</th><th>รายละเอียด</th><th>บิล</th><th class="r">ยอดเงิน (฿)</th></tr></thead>
          <tbody>${rows.map(({ r, e }) => `<tr><td>${fmt.date(e.date)}</td><td>${esc(Pages._expTitle(e))}</td><td>${esc(C.vName(e.vehicleId))}</td><td><a class="link" href="#/admin/requests/${r.id}">${r.id}</a><small>${esc(S.destName(r))}</small><small style="color:var(--gold-700)">${esc(S.catName(r))}</small></td><td>${esc(e.station || '')}<small>${e.liters ? `${fmt.num(e.liters, 2)} ล. × ${fmt.num(e.pricePerL, 2)} ฿` : ''}${e.odo ? ` · ไมล์ ${fmt.num(e.odo)}` : ''} · ${S.PAY[e.pay] || ''}</small></td><td>${(e.photos || []).map(p => UI.thumb(p, 'sm')).join('') || '<small>—</small>'}</td><td class="r"><b>${fmt.money(e.amount)}</b></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('ไม่มีรายการในช่วงนี้', 'fuel')}</td></tr>`}</tbody>
          ${rows.length ? `<tfoot><tr><td colspan="6">รวม</td><td class="r">${fmt.money(total)}</td></tr></tfoot>` : ''}
        </table></div></div>`}`,
      mount(root) {
        bindPeriod(root, '#/admin/expenses', query);
        if (view === 'stats' && months.length) {
          const draw = () => { if (!window.Chart || !$('#chFuelM', root)) return; Chart.defaults.font.family = '"IBM Plex Sans Thai", Prompt, sans-serif';
            new Chart($('#chFuelM', root), { data: { labels: months.map(x => monthLbl(x.k)), datasets: [{ type: 'bar', label: 'ค่าน้ำมัน (บาท)', data: months.map(x => Math.round(x.amt)), backgroundColor: '#c9962b', borderRadius: 8, yAxisID: 'y' }, { type: 'line', label: 'ลิตร', data: months.map(x => +x.lit.toFixed(1)), borderColor: '#24307a', backgroundColor: '#24307a', tension: .35, yAxisID: 'y1' }] }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, position: 'right', grid: { display: false } } } } }); };
          if (window.Chart) draw(); else { let n = 0; const t = setInterval(() => { if (window.Chart || ++n > 40) { clearInterval(t); draw(); } }, 150); }
        }
        $('#vf', root).addEventListener('change', e => { location.hash = qs({ v: e.target.value }); });
        $('#tf', root).addEventListener('change', e => { location.hash = qs({ t: e.target.value }); });
        $('#cf', root).addEventListener('change', e => { location.hash = qs({ c: e.target.value }); });
        const pf = () => [vf && `รถ: ${C.vName(vf)}`, tf && `ประเภท: ${S.EXPENSE[tf]}`, cf && `หมวดงาน: ${cf === 'none' ? 'ไม่ระบุหมวด' : S.catName({ category: cf })}`].filter(Boolean);
        $('#pdf', root).addEventListener('click', () => printExpenses(rows, per, pf()));
        $('#pdfDl', root).addEventListener('click', () => printExpenses(rows, per, pf(), { dl: true }));
        $('#xls', root).addEventListener('click', () => UI.exportSheets(`ค่าใช้จ่าย-${per.label}`, [{ name: 'ค่าใช้จ่าย', head: ['วันที่', 'ประเภท', 'รถ', 'ทะเบียน', 'เลขที่คำขอ', 'หมวดงาน', 'ปลายทาง', 'ปั๊ม/สถานที่', 'ลิตร', 'ราคา/ลิตร', 'เลขไมล์', 'วิธีชำระ', 'ยอดเงิน', 'บันทึกโดย'], rows: rows.map(({ r, e }) => [e.date, Pages._expTitle(e), C.vName(e.vehicleId), C.vPlate(e.vehicleId), r.id, S.catName(r), S.destName(r), e.station, e.liters, e.pricePerL, e.odo, S.PAY[e.pay], e.amount, e.byName || e.by]) }]));
      }
    };
  };

  // ═════════ ประเมินคนขับ ═════════
  // ═════════ PDF สรุปผลประเมินคนขับ: หน้า 1 สรุปรวม · ต่อด้วยหน้าละ 1 คนขับ (ไว้แจ้งผลรายคน) ═════════
  function ratingsDoc(list, per, df) {
    const st = S.db.settings, K = Object.entries(S.RATE_KEYS);
    const avgOf = (arr, k) => arr.length ? arr.reduce((s, x) => s + (k ? x.scores[k] : Object.values(x.scores).reduce((a, b) => a + b, 0) / 4), 0) / arr.length : 0;
    const lv = v => v >= 4.5 ? ['ดีมาก', 'g'] : v >= 3.5 ? ['ดี', 'b'] : v >= 2.5 ? ['พอใช้', 'y'] : ['ควรปรับปรุง', 'r'];
    const bar = v => `<span class="rt-bar"><i style="width:${Math.max(0, Math.min(100, v / 5 * 100)).toFixed(1)}%"></i></span>`;
    const f2 = v => v ? v.toFixed(2) : '-';
    const to = per.to > new Date(2900, 0) ? new Date() : per.to;
    const from = per.k === 'all' && list.length ? new Date(list[list.length - 1].at) : per.from;
    const ds = S.db.drivers.filter(d => !df || d.id === df).map(d => ({ d, rs: list.filter(x => x.driverId === d.id) })).filter(x => x.rs.length || !df).sort((a, b) => avgOf(b.rs) - avgOf(a.rs) || b.rs.length - a.rs.length);
    const all = avgOf(list), withC = list.filter(x => x.comment);
    const head = `<header class="pd-head"><img src="images/logo.png" alt=""><div><b>${esc(st.schoolName || '')}</b><span>${esc(st.division || '')} · ${esc(st.unit || 'งานยานพาหนะ')}</span></div></header>`;
    const sub = `${esc(per.k === 'custom' ? 'ช่วงวันที่กำหนดเอง' : per.label)} · ตั้งแต่ ${fmt.dateLong(from)} ถึง ${fmt.dateLong(to)}`;
    const kpis = arr => `<div class="rt-kpis"><div class="rt-k main"><b>${f2(avgOf(arr))}</b><span>เฉลี่ยรวม (เต็ม 5)</span><em class="rt-lv ${arr.length ? lv(avgOf(arr))[1] : ''}">${arr.length ? lv(avgOf(arr))[0] : 'ยังไม่มีผลประเมิน'}</em></div>
      <div class="rt-k"><b>${arr.length}</b><span>ครั้งที่ประเมิน</span></div>
      <div class="rt-asp">${K.map(([k, l]) => `<div><span>${l}</span>${bar(avgOf(arr, k))}<b>${f2(avgOf(arr, k))}</b></div>`).join('')}</div></div>`;
    const comments = arr => arr.length ? `<ol class="rt-cm">${arr.map(x => `<li><p>“${esc(x.comment)}”</p><small>${fmt.date(x.at)} · ${esc(C.vName(x.vehicleId))}${df ? '' : ` · ${esc(C.dName(x.driverId))}`} · คะแนน ${f2(avgOf([x]))}</small></li>`).join('')}</ol>` : '<p class="rt-none">ไม่มีความคิดเห็น</p>';
    const summary = `<section class="rt-page">${head}
      <h1 class="pd-title">รายงานผลการประเมินพนักงานขับรถ</h1>
      <p class="pd-sub">${sub}<br>ประเมินโดยผู้ใช้รถหลังเดินทางกลับ · ไม่เปิดเผยชื่อผู้ประเมิน</p>
      ${kpis(list)}
      <h2>1. คะแนนรายคน</h2>
      <table class="pd-tbl rt-tbl" data-fitw><thead><tr><th class="c">ที่</th><th class="nw">พนักงานขับรถ</th><th class="r">ครั้ง</th>${K.map(([, l]) => `<th class="r">${l.replace('มารยาทและการบริการ', 'มารยาท/บริการ').replace('ความสะอาดของรถ', 'ความสะอาดรถ')}</th>`).join('')}<th class="r">เฉลี่ย</th><th class="nw">ระดับ</th></tr></thead>
        <tbody>${ds.map(({ d, rs }, i) => `<tr><td class="c">${i + 1}</td><td class="nw">${esc(d.name)}</td><td class="r">${rs.length}</td>${K.map(([k]) => `<td class="r">${rs.length ? f2(avgOf(rs, k)) : '-'}</td>`).join('')}<td class="r"><b>${rs.length ? f2(avgOf(rs)) : '-'}</b></td><td class="nw">${rs.length ? `<span class="rt-lv ${lv(avgOf(rs))[1]}">${lv(avgOf(rs))[0]}</span>` : '-'}</td></tr>`).join('')}</tbody></table>
      <p class="rt-note">เกณฑ์: 4.50–5.00 ดีมาก · 3.50–4.49 ดี · 2.50–3.49 พอใช้ · ต่ำกว่า 2.50 ควรปรับปรุง</p>
      <h2>2. ความคิดเห็นจากผู้ใช้รถ (${withC.length})</h2>${comments(withC)}
      <p class="pd-foot">พิมพ์จากระบบยานพาหนะ เมื่อ ${fmt.dt(new Date().toISOString())} โดย ${esc(S.me.name || S.me.email)}</p></section>`;
    const pages = ds.filter(x => x.rs.length).map(({ d, rs }) => `<section class="rt-page rt-break">${head}
      <div class="rt-who">${d.photo ? UI.img(d.photo, d.name) : `<span class="rt-av">${esc((d.name || '?').replace(/^(นาย|นาง|นางสาว)/, '').trim().charAt(0))}</span>`}<div><h1>${esc(d.name)}</h1><p>พนักงานขับรถ · รถที่รับผิดชอบ: ${S.db.vehicles.filter(v => v.driverId === d.id).map(v => esc(v.name)).join(', ') || '-'}</p><p>${sub}</p></div></div>
      ${kpis(rs)}
      <h2>ผลการประเมินแต่ละครั้ง (${rs.length})</h2>
      <table class="pd-tbl rt-tbl" data-fitw><thead><tr><th class="c">ที่</th><th class="nw">วันที่</th><th class="nw">รถ</th>${K.map(([, l]) => `<th class="r">${l.replace('มารยาทและการบริการ', 'มารยาท/บริการ').replace('ความสะอาดของรถ', 'ความสะอาดรถ')}</th>`).join('')}<th class="r">เฉลี่ย</th></tr></thead>
        <tbody>${rs.map((x, i) => `<tr><td class="c">${i + 1}</td><td class="nw">${fmt.date(x.at)}</td><td class="nw">${esc(C.vName(x.vehicleId))}</td>${K.map(([k]) => `<td class="r">${x.scores[k]}</td>`).join('')}<td class="r"><b>${f2(avgOf([x]))}</b></td></tr>`).join('')}</tbody></table>
      <h2>ความคิดเห็นถึง ${esc(C.firstName ? C.firstName(d.name) : d.name)}</h2>${comments(rs.filter(x => x.comment))}
      <div class="rt-sign"><div><p>ลงชื่อ ....................................... ผู้แจ้งผล</p><p>(.......................................)</p></div><div><p>ลงชื่อ ....................................... ผู้รับทราบ</p><p>(${esc(d.name)})</p></div></div></section>`).join('');
    return { html: summary + pages, title: `รายงานผลการประเมินคนขับ ${df ? C.dName(df) + ' ' : ''}${fmt.localDate(from)} ถึง ${fmt.localDate(to)}` };
  }
  Pages.adminRatings = ({ query }) => {
    const per = periodOf(query), df = query.d || '';
    const hist = S.needHistory(per.from);
    const list = S.db.ratings.filter(x => inPer(x.at, per) && (!df || x.driverId === df)).sort((a, b) => b.at.localeCompare(a.at));
    const avgOf = (arr, k) => arr.length ? arr.reduce((s, x) => s + (k ? x.scores[k] : Object.values(x.scores).reduce((a, b) => a + b, 0) / 4), 0) / arr.length : 0;
    const drivers = S.db.drivers.map(d => ({ d, rs: list.filter(x => x.driverId === d.id) })).filter(x => x.rs.length || !df).sort((a, b) => avgOf(b.rs) - avgOf(a.rs));
    return {
      layout: 'admin',
      html: `${head('รายงาน', 'ผลการประเมินคนขับ', `${per.label} · ${list.length} ครั้ง · ไม่แสดงชื่อผู้ประเมิน`, `<button class="btn btn-primary btn-sm" id="rtPdf" ${list.length ? '' : 'disabled'}>${icon('download')} ดาวน์โหลด PDF</button><button class="btn btn-ghost btn-sm" id="rtPrint" ${list.length ? '' : 'disabled'}>${icon('printer')} พิมพ์</button><select class="input" id="df" style="width:auto"><option value="">คนขับทุกคน</option>${S.db.drivers.map(d => `<option value="${d.id}" ${d.id === df ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`)}
        ${periodBar('#/admin/ratings', per, query)}${histNote(hist)}
        <div class="kpis" style="margin-bottom:16px">${Object.entries(S.RATE_KEYS).map(([k, l]) => `<div class="kpi" style="--kb:#fef3c7;--kc:#d97706"><span class="k-ic">${icon('star')}</span><b class="num">${avgOf(list, k).toFixed(2)}<em>/ 5</em></b><span class="l">${l}</span></div>`).join('')}</div>
        <div class="split">
          <div class="card"><div class="card-head"><h3>${icon('users')} คะแนนรายคน</h3></div><div class="tbl-wrap"><table class="tbl rt-tbl" style="min-width:0"><thead><tr><th>คนขับ</th><th>ครั้ง</th>${Object.values(S.RATE_KEYS).map(l => `<th>${l.split('และ')[0].replace('ความสะอาดของรถ', 'ความสะอาด')}</th>`).join('')}<th>เฉลี่ย</th></tr></thead>
            <tbody>${drivers.map(({ d, rs }) => `<tr><td class="nw"><b>${esc(d.name)}</b></td><td>${rs.length}</td>${Object.keys(S.RATE_KEYS).map(k => `<td>${rs.length ? avgOf(rs, k).toFixed(2) : '-'}</td>`).join('')}<td class="nw"><b>${rs.length ? avgOf(rs).toFixed(2) : '-'}</b>${rs.length ? `<div class="rt-st">${C.stars(avgOf(rs))}</div>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card"><div class="card-head"><h3>${icon('mail')} ความคิดเห็น</h3></div><div class="stack">${list.filter(x => x.comment).slice(0, 40).map(x => `<div class="assign"><div class="assign-top"><b>${esc(C.dName(x.driverId))}</b>${C.stars(avgOf([x]))}</div><p style="font-size:.92rem">“${esc(x.comment)}”</p><small class="muted">${fmt.date(x.at)} · ${esc(C.vName(x.vehicleId))}</small></div>`).join('') || UI.empty('ยังไม่มีความคิดเห็น', 'mail')}</div></div>
        </div>`,
      mount(root) {
        bindPeriod(root, '#/admin/ratings', query); $('#df', root).addEventListener('change', e => { location.hash = '#/admin/ratings?' + new URLSearchParams({ ...query, d: e.target.value }); });
        const doc = () => ratingsDoc(list, per, df), po = t => ({ title: t, fitWidth: '186mm' });
        $('#rtPdf', root).addEventListener('click', e => { const d = doc(); UI.busy(e.currentTarget, () => UI.savePdf(d.html, po(d.title))); });
        $('#rtPrint', root).addEventListener('click', () => { const d = doc(); UI.printDoc(d.html, { ...po(d.title), footLeft: d.title }); });
      }
    };
  };

  // ═════════ สถิติและรายงาน ═════════
  Pages.adminStats = ({ query }) => {
    const per = periodOf(query);
    const hist = S.needHistory(per.from);
    const reqs = S.db.requests.filter(r => inPer(r.startAt, per));
    const done = reqs.filter(r => ['ontrip', 'returned', 'closed', 'approved'].includes(r.status));
    const trips = done.filter(r => ['returned', 'closed'].includes(r.status));
    const asg = []; done.forEach(r => (r.assignments || []).forEach(a => asg.push({ r, a, km: a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : (+r.totalKm || 0) })));
    const exps = []; reqs.forEach(r => (r.expenses || []).forEach(e => exps.push({ r, e })));
    const sum = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
    const costBy = t => sum(exps.filter(x => x.e.type === t), x => x.e.amount);
    const repairs = []; Object.values(S.db.vprivate).forEach(p => (p.repairs || []).forEach(rp => { if (inPer(rp.date + 'T12:00:00', per)) repairs.push({ v: p.id, rp }); }));
    const ratings = S.db.ratings.filter(x => inPer(x.at, per));
    const avgR = arr => arr.length ? arr.reduce((s, x) => s + Object.values(x.scores).reduce((a, b) => a + b, 0) / 4, 0) / arr.length : 0;
    const K = {
      req: reqs.length, ok: done.length, rej: reqs.filter(r => r.status === 'rejected').length, cancel: reqs.filter(r => r.status === 'cancelled').length,
      km: sum(asg, x => x.km), pax: sum(done, r => S.passengers(r)), stu: sum(done, r => r.students), tea: sum(done, r => r.teachers), oth: sum(done, r => +r.others || 0),
      fuel: costBy('fuel'), other: costBy('toll') + costBy('parking') + costBy('other'), liters: sum(exps, x => x.e.liters), repair: sum(repairs, x => x.rp.cost)
    };
    // รายเดือน
    const months = []; { const d = new Date(Math.max(per.from, new Date(Math.min(...reqs.map(r => +new Date(r.startAt)), Date.now())))); d.setDate(1); const end = new Date(Math.min(per.to, new Date())); while (d <= end && months.length < 36) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); } }
    const mk = d => d.toISOString().slice(0, 7);
    const byMonth = months.map(m => { const k = fmt.localDate(m).slice(0, 7); const rs = done.filter(r => fmt.localDate(r.startAt).slice(0, 7) === k); return { label: m.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }), trips: rs.length, km: sum(asg.filter(x => fmt.localDate(x.r.startAt).slice(0, 7) === k), x => x.km), cost: sum(exps.filter(x => x.e.date.slice(0, 7) === k), x => x.e.amount) }; });
    const byVehicle = S.db.vehicles.map(v => { const a = asg.filter(x => x.a.vehicleId === v.id), ex = exps.filter(x => x.e.vehicleId === v.id), rp = repairs.filter(x => x.v === v.id); const lit = sum(ex, x => x.e.liters), kmF = sum(a.filter(x => x.a.odoEnd != null), x => x.km); return { v, trips: a.length, km: sum(a, x => x.km), liters: lit, fuel: sum(ex.filter(x => x.e.type === 'fuel'), x => x.e.amount), other: sum(ex.filter(x => x.e.type !== 'fuel'), x => x.e.amount), kmpl: lit ? kmF / lit : 0, rpN: rp.length, rpCost: sum(rp, x => x.rp.cost) }; }).filter(x => x.trips || x.rpN || x.fuel);
    const byDriver = S.db.drivers.map(d => { const a = asg.filter(x => x.a.driverId === d.id), rs = ratings.filter(x => x.driverId === d.id); return { d, trips: a.length, km: sum(a, x => x.km), hours: sum(a.filter(x => x.a.departedAt && x.a.returnedAt), x => (new Date(x.a.returnedAt) - new Date(x.a.departedAt)) / 36e5), rating: avgR(rs), rn: rs.length, ontime: a.filter(x => x.a.departedAt).length ? a.filter(x => x.a.departedAt && new Date(x.a.departedAt) - new Date(x.r.startAt) <= 15 * 6e4).length / a.filter(x => x.a.departedAt).length * 100 : null }; }).filter(x => x.trips || x.rn);
    const group = (arr, keyF) => { const m = new Map(); arr.forEach(x => { const k = keyF(x) || 'ไม่ระบุ'; m.set(k, [...(m.get(k) || []), x]); }); return [...m.entries()]; };
    const byDept = group(done, r => r.requester.dept).map(([k, rs]) => ({ k, n: rs.length, pax: sum(rs, r => S.passengers(r)), km: sum(rs, r => r.totalKm), cost: sum(rs, r => sum(r.expenses || [], e => e.amount)) })).sort((a, b) => b.n - a.n);
    const byPerson = group(done, r => r.requester.name).map(([k, rs]) => ({ k, n: rs.length, dept: rs[0].requester.dept, km: sum(rs, r => r.totalKm) })).sort((a, b) => b.n - a.n).slice(0, 15);
    const byDest = group(done, r => (r.destinations[0] || {}).name).map(([k, rs]) => ({ k, n: rs.length, prov: (rs[0].destinations[0] || {}).province || '' })).sort((a, b) => b.n - a.n).slice(0, 15);
    const byProv = group(done, r => (r.destinations[0] || {}).province).map(([k, rs]) => ({ k, n: rs.length })).sort((a, b) => b.n - a.n);
    // ── หมวดงาน ──
    const catKeys = [...S.categories(true).map(c => c.id), ''];
    const catLabel = k => k ? (k === 'other' ? 'อื่น ๆ' : (S.catOf(k) || {}).name || k) : 'ไม่ระบุ';
    const byCat = catKeys.map(k => { const rs = done.filter(r => (r.category || '') === k), a = asg.filter(x => (x.r.category || '') === k), ex = exps.filter(x => (x.r.category || '') === k); return { k, name: catLabel(k), n: rs.length, vt: a.length, km: sum(a, x => x.km), pax: sum(rs, r => S.passengers(r)), fuel: sum(ex.filter(x => x.e.type === 'fuel'), x => x.e.amount), other: sum(ex.filter(x => x.e.type !== 'fuel'), x => x.e.amount) }; }).filter(x => x.n);
    const matVeh = S.db.vehicles.filter(v => asg.some(x => x.a.vehicleId === v.id));
    const matrix = byCat.map(c => ({ c, cells: matVeh.map(v => asg.filter(x => x.a.vehicleId === v.id && (x.r.category || '') === c.k).length) }));
    const otherTexts = group(done.filter(r => r.category === 'other'), r => r.categoryOther || '(ไม่ได้ระบุ)').map(([k, rs]) => ({ k, n: rs.length })).sort((a, b) => b.n - a.n);
    const byPurpose = group(done, r => r.purpose).map(([k, rs]) => ({ k, n: rs.length })).sort((a, b) => b.n - a.n).slice(0, 10);
    // ── คำขอด่วน: แอดมินบันทึกแทน (เร่งด่วน) · งานประจำที่ขอภายในวันเดียวกัน · ค้างบันทึกข้อความ ──
    const quickSameDay = r => S.isQuickCat(r.category) && fmt.localDate(r.createdAt) === fmt.localDate(r.startAt);
    const urgent = reqs.filter(r => r.status !== 'cancelled' && (r.emergency || quickSameDay(r)));
    const byUrgent = group(urgent, r => r.requester.name).map(([k, rs]) => ({ k, dept: rs[0].requester.dept, em: rs.filter(r => r.emergency).length, sd: rs.filter(quickSameDay).length, debt: rs.filter(S.needsMemo).length })).sort((a, b) => (b.em + b.sd) - (a.em + a.sd) || b.debt - a.debt).slice(0, 20);
    const debtsAll = S.db.requests.filter(S.needsMemo);
    const tbl = (h, rows, foot) => `<div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr>${h.map((x, i) => `<th class="${i ? 'r' : ''}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}">${UI.empty('ไม่มีข้อมูล')}</td></tr>`}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
    const data = { byMonth, byVehicle, byDriver, byDept, K, byProv };
    return {
      layout: 'admin',
      html: `<div class="print-brand print-only"><img src="images/logo.png" alt=""><div><b>${esc(S.db.settings.schoolName || '')}</b><span>${esc(S.db.settings.division || '')} · ${esc(S.db.settings.unit || 'งานยานพาหนะ')} · พิมพ์เมื่อ ${fmt.dt(new Date().toISOString())}</span></div></div>
        ${head('รายงาน', 'สถิติการใช้รถ', `${per.label} · ${fmt.date(per.from)} – ${fmt.date(per.to > new Date(2900, 0) ? new Date() : per.to)}`, `<button class="btn btn-ghost btn-sm no-print" id="pdf">${icon('printer')} พิมพ์หน้านี้</button><button class="btn btn-primary btn-sm no-print" id="rpt">${icon('file')} รายงาน PDF</button><button class="btn btn-ghost btn-sm no-print" id="xls">${icon('download')} Excel ทุกตาราง</button>`)}
        ${periodBar('#/admin/stats', per, query)}${histNote(hist)}
        <div class="kpis">
          <div class="kpi"><span class="k-ic">${icon('clipboard')}</span><b class="num">${K.req}<em>คำขอ</em></b><span class="l">อนุมัติ ${K.ok} · ไม่อนุมัติ ${K.rej} · ยกเลิก ${K.cancel}</span></div>
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('gauge')}</span><b class="num">${fmt.num(K.km)}<em>กม.</em></b><span class="l">ระยะทางรวม · ${asg.length} เที่ยวรถ</span></div>
          <div class="kpi" style="--kb:#e0f2fe;--kc:#0369a1"><span class="k-ic">${icon('users')}</span><b class="num">${fmt.num(K.pax)}<em>คน</em></b><span class="l">ครู ${fmt.num(K.tea)} · นักเรียน ${fmt.num(K.stu)}${K.oth ? ` · อื่น ${fmt.num(K.oth)}` : ''}</span></div>
          <div class="kpi" style="--kb:#fde2e2;--kc:#b91c1c"><span class="k-ic">${icon('coins')}</span><b class="num">${fmt.money(K.fuel + K.other + K.repair)}<em>฿</em></b><span class="l">น้ำมัน ${fmt.money(K.fuel)} · อื่น ๆ ${fmt.money(K.other)} · ซ่อม ${fmt.money(K.repair)}</span></div>
        </div>
        <div class="split" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('chart')} รายเดือน: จำนวนเที่ยว / ค่าใช้จ่าย</h3></div><div class="chart-box"><canvas id="chMonth"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>${icon('pie')} สัดส่วนค่าใช้จ่าย</h3></div><div class="chart-box sm"><canvas id="chCost"></canvas></div>
            <div class="sum-box" style="grid-template-columns:1fr 1fr"><div><small>เฉลี่ยต่อเที่ยว</small><b>${trips.length ? fmt.money((K.fuel + K.other) / trips.length) : 0} ฿</b></div><div><small>เฉลี่ยต่อ กม.</small><b>${K.km ? fmt.num((K.fuel + K.other) / K.km, 2) : 0} ฿</b></div><div><small>น้ำมันรวม</small><b>${fmt.num(K.liters, 1)} ล.</b></div><div><small>คะแนนคนขับเฉลี่ย</small><b>${avgR(ratings).toFixed(2)}</b></div></div></div>
        </div>
        <div class="split" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('flag')} แยกตามหมวดงาน</h3></div>${tbl(['หมวดงาน', 'ครั้ง', 'เที่ยวรถ', 'กม.', 'ผู้เดินทาง', 'ค่าน้ำมัน', 'ค่าใช้จ่ายอื่น'], byCat.map(x => [`<b>${esc(x.name)}</b>`, x.n, x.vt, fmt.num(x.km), fmt.num(x.pax), fmt.money(x.fuel), fmt.money(x.other)]), ['รวม', sum(byCat, x => x.n), sum(byCat, x => x.vt), fmt.num(sum(byCat, x => x.km)), fmt.num(sum(byCat, x => x.pax)), fmt.money(sum(byCat, x => x.fuel)), fmt.money(sum(byCat, x => x.other))])}
            ${otherTexts.length ? `<p class="hint" style="margin-top:10px">${icon('info')} หมวด "อื่น ๆ" ที่ระบุมา: ${otherTexts.map(x => `${esc(x.k)} (${x.n})`).join(' · ')}</p>` : ''}</div>
          <div class="card"><div class="card-head"><h3>${icon('pie')} สัดส่วนหมวดงาน</h3></div><div class="chart-box"><canvas id="chCat"></canvas></div></div>
        </div>
        <div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('grid')} หมวดงาน × รถ <span class="hint" style="font-weight:400">(จำนวนเที่ยวที่รถแต่ละคันไปในแต่ละหมวด)</span></h3></div>
          ${matrix.length ? `<div class="tbl-wrap"><table class="tbl mtx" style="min-width:${260 + matVeh.length * 90}px"><thead><tr><th>หมวดงาน</th>${matVeh.map(v => `<th class="r">${esc(v.name)}</th>`).join('')}<th class="r">รวม</th></tr></thead>
            <tbody>${(() => { const mx = Math.max(1, ...matrix.flatMap(m => m.cells)); return matrix.map(m => `<tr><td><b>${esc(m.c.name)}</b></td>${m.cells.map(n => `<td class="r"><span class="hm ${n / mx > .55 ? 'dk' : ''}" style="--a:${n ? .12 + .88 * n / mx : 0}">${n || '·'}</span></td>`).join('')}<td class="r"><b>${m.cells.reduce((a, b) => a + b, 0)}</b></td></tr>`).join(''); })()}</tbody>
            <tfoot><tr><td>รวม</td>${matVeh.map((v, i) => `<td class="r">${matrix.reduce((s, m) => s + m.cells[i], 0)}</td>`).join('')}<td class="r">${matrix.reduce((s, m) => s + m.cells.reduce((a, b) => a + b, 0), 0)}</td></tr></tfoot></table></div>` : UI.empty('ไม่มีข้อมูลในช่วงนี้')}</div>
        <div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('van')} แยกตามรถ</h3></div>${tbl(['รถ', 'เที่ยว', 'กม.', 'น้ำมัน (ล.)', 'ค่าน้ำมัน', 'กม./ลิตร', 'ค่าใช้จ่ายอื่น', 'ซ่อม (ครั้ง)', 'ค่าซ่อม'], byVehicle.map(x => [`<b>${esc(x.v.name)}</b><small>${esc(x.v.plate)}</small>`, x.trips, fmt.num(x.km), fmt.num(x.liters, 1), fmt.money(x.fuel), x.kmpl ? fmt.num(x.kmpl, 1) : '-', fmt.money(x.other), x.rpN, fmt.money(x.rpCost)]), ['รวม', sum(byVehicle, x => x.trips), fmt.num(sum(byVehicle, x => x.km)), fmt.num(sum(byVehicle, x => x.liters), 1), fmt.money(sum(byVehicle, x => x.fuel)), '', fmt.money(sum(byVehicle, x => x.other)), sum(byVehicle, x => x.rpN), fmt.money(sum(byVehicle, x => x.rpCost))])}</div>
        <div class="split" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('wheel')} แยกตามคนขับ</h3></div>${tbl(['คนขับ', 'เที่ยว', 'กม.', 'ชั่วโมงขับ', 'ออกตรงเวลา', 'คะแนน'], byDriver.map(x => [`<b>${esc(x.d.name)}</b>`, x.trips, fmt.num(x.km), fmt.num(x.hours, 1), x.ontime != null ? fmt.num(x.ontime) + '%' : '-', x.rn ? `${x.rating.toFixed(2)} <small>(${x.rn})</small>` : '-']))}</div>
          <div class="card"><div class="card-head"><h3>${icon('chart')} แยกตามรถ (กราฟ)</h3></div><div class="chart-box"><canvas id="chVeh"></canvas></div></div>
        </div>
        <div class="split" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('users')} แยกตามฝ่าย / กลุ่มสาระ</h3></div>${tbl(['ฝ่าย', 'ครั้ง', 'ผู้เดินทาง', 'กม.', 'ค่าใช้จ่าย'], byDept.map(x => [esc(x.k), x.n, fmt.num(x.pax), fmt.num(x.km), fmt.money(x.cost)]))}</div>
          <div class="card"><div class="card-head"><h3>${icon('user')} ผู้ขอใช้รถบ่อยที่สุด</h3></div>${tbl(['ผู้ขอ', 'ครั้ง', 'กม.'], byPerson.map(x => [`${esc(x.k)}<small>${esc(x.dept || '')}</small>`, x.n, fmt.num(x.km)]))}</div>
        </div>
        <div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('alert')} คำขอด่วน และการค้างบันทึกข้อความ</h3><span class="hint">เร่งด่วน ${urgent.filter(r => r.emergency).length} · งานประจำขอในวัน ${urgent.filter(quickSameDay).length} · ค้างบันทึกข้อความตอนนี้ ${debtsAll.length} รายการ</span></div>
          ${tbl(['ผู้ขอ', 'เร่งด่วน (แอดมินบันทึกแทน)', 'งานประจำขอในวัน', 'รวม', 'ค้างบันทึกข้อความ'], byUrgent.map(x => [`${esc(x.k)}<small>${esc(x.dept || '')}</small>`, x.em, x.sd, `<b>${x.em + x.sd}</b>`, x.debt ? `<span class="pill tone-bad">${x.debt}</span>` : '-']))}
          ${debtsAll.length ? `<p class="hint" style="margin-top:10px">${icon('info')} ค้างบันทึกข้อความ: ${debtsAll.map(r => `<a class="link" href="#/admin/requests/${r.id}">${r.id}</a> (${esc(r.requester.name)})`).join(' · ')}</p>` : ''}</div>
        <div class="grid cols-3" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('pin')} ปลายทางยอดนิยม</h3></div>${tbl(['สถานที่', 'ครั้ง'], byDest.map(x => [`${esc(x.k)}<small>${esc(x.prov)}</small>`, x.n]))}</div>
          <div class="card"><div class="card-head"><h3>${icon('map')} จังหวัด</h3></div><div class="chart-box sm"><canvas id="chProv"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>${icon('flag')} วัตถุประสงค์</h3></div>${tbl(['วัตถุประสงค์', 'ครั้ง'], byPurpose.map(x => [esc(x.k), x.n]))}</div>
        </div>`,
      mount(root) {
        bindPeriod(root, '#/admin/stats', query);
        $('#pdf', root).addEventListener('click', () => window.print());
        // รายงานสรุปแบบเอกสาร (หน้าปก + ตาราง) — คอมเลือก "บันทึกเป็น PDF" ได้ · iPhone ได้ไฟล์ PDF
        $('#rpt', root).addEventListener('click', () => {
          const T = (h, rows, foot) => `<table class="pd-tbl rp-t"><thead><tr>${h.map((x, i) => `<th class="${i ? 'r' : ''}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}">ไม่มีข้อมูล</td></tr>`}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
          const first = reqs.length ? new Date(Math.min(...reqs.map(r => +new Date(r.startAt)))) : new Date(), range = `${C.thDate(Math.max(+per.from, +first))} – ${C.thDate(per.to > new Date(2900, 0) ? new Date() : per.to)}`;
          const kpi = T(['รายการ', 'จำนวน'], [['คำขอทั้งหมด', `${K.req} คำขอ`], ['อนุมัติ / ไม่อนุมัติ / ยกเลิก', `${K.ok} / ${K.rej} / ${K.cancel}`], ['เที่ยวรถ', `${asg.length} เที่ยว`], ['ระยะทางรวม', `${fmt.num(K.km)} กม.`], ['ผู้เดินทาง', `${fmt.num(K.pax)} คน (ครู ${fmt.num(K.tea)} · นักเรียน ${fmt.num(K.stu)}${K.oth ? ` · อื่น ${fmt.num(K.oth)}` : ''})`], ['ค่าน้ำมัน', `${fmt.money(K.fuel)} บาท (${fmt.num(K.liters, 1)} ลิตร)`], ['ค่าใช้จ่ายอื่น', `${fmt.money(K.other)} บาท`], ['ค่าซ่อมบำรุง', `${fmt.money(K.repair)} บาท`], ['รวมค่าใช้จ่าย', `<b>${fmt.money(K.fuel + K.other + K.repair)} บาท</b>`], ['คะแนนคนขับเฉลี่ย', `${avgR(ratings).toFixed(2)} / 5 (${ratings.length} ครั้ง)`]]);
          const cover = C.reportCover({ title: 'รายงานสถิติการใช้รถส่วนกลาง', sub: per.label, range: `ช่วงวันที่ ${range}`, body: `${kpi}
            ${T(['หมวดงาน', 'ครั้ง', 'เที่ยวรถ', 'กม.', 'ผู้เดินทาง'], byCat.map(x => [esc(x.name), x.n, x.vt, fmt.num(x.km), fmt.num(x.pax)]), ['รวม', sum(byCat, x => x.n), sum(byCat, x => x.vt), fmt.num(sum(byCat, x => x.km)), fmt.num(sum(byCat, x => x.pax))])}` });
          const pg = (h, inner) => `<section class="rp-page">${C.reportHead('รายงานสถิติการใช้รถส่วนกลาง', `${per.label} · ${range}`)}${inner}</section>`;
          const html = cover + pg('', `
            <h2>แยกตามรถ</h2>${T(['รถ', 'เที่ยว', 'กม.', 'น้ำมัน (ล.)', 'ค่าน้ำมัน', 'กม./ลิตร', 'ค่าใช้จ่ายอื่น', 'ซ่อม', 'ค่าซ่อม'], byVehicle.map(x => [`<span class="one" data-fit>${esc(x.v.name)} <small>${esc(x.v.plate || '')}</small></span>`, x.trips, fmt.num(x.km), fmt.num(x.liters, 1), fmt.money(x.fuel), x.kmpl ? fmt.num(x.kmpl, 1) : '-', fmt.money(x.other), x.rpN, fmt.money(x.rpCost)]), ['รวม', sum(byVehicle, x => x.trips), fmt.num(sum(byVehicle, x => x.km)), fmt.num(sum(byVehicle, x => x.liters), 1), fmt.money(sum(byVehicle, x => x.fuel)), '', fmt.money(sum(byVehicle, x => x.other)), sum(byVehicle, x => x.rpN), fmt.money(sum(byVehicle, x => x.rpCost))])}
            <h2>แยกตามคนขับ</h2>${T(['คนขับ', 'เที่ยว', 'กม.', 'ชั่วโมงขับ', 'ออกตรงเวลา', 'คะแนน'], byDriver.map(x => [`<span class="one" data-fit>${esc(x.d.name)}</span>`, x.trips, fmt.num(x.km), fmt.num(x.hours, 1), x.ontime != null ? fmt.num(x.ontime) + '%' : '-', x.rn ? `${x.rating.toFixed(2)} (${x.rn})` : '-']))}
            <h2>รายเดือน</h2>${T(['เดือน', 'เที่ยว', 'กม.', 'ค่าใช้จ่าย'], byMonth.map(x => [x.label, x.trips, fmt.num(x.km), fmt.money(x.cost)]))}
            <h2>แยกตามฝ่าย / กลุ่มสาระ</h2>${T(['ฝ่าย', 'ครั้ง', 'ผู้เดินทาง', 'กม.', 'ค่าใช้จ่าย'], byDept.map(x => [esc(x.k), x.n, fmt.num(x.pax), fmt.num(x.km), fmt.money(x.cost)]))}
            <h2>ปลายทางยอดนิยม</h2>${T(['สถานที่', 'จังหวัด', 'ครั้ง'], byDest.map(x => [esc(x.k), esc(x.prov), x.n]))}`);
          UI.printDoc(html, { title: `รายงานสถิติการใช้รถ ${per.label}`, fitWidth: '186mm', fitPage: 264, footLeft: `รายงานสถิติการใช้รถส่วนกลาง · ${per.label}` });
        });
        $('#xls', root).addEventListener('click', () => UI.exportSheets(`สถิติการใช้รถ-${per.label}`, [
          { name: 'สรุป', head: ['รายการ', 'ค่า'], rows: [['ช่วงเวลา', per.label], ['คำขอทั้งหมด', K.req], ['อนุมัติ', K.ok], ['ไม่อนุมัติ', K.rej], ['ยกเลิก', K.cancel], ['ระยะทางรวม (กม.)', K.km], ['ผู้เดินทาง', K.pax], ['ครู', K.tea], ['นักเรียน', K.stu], ['บุคคลอื่น', K.oth], ['ค่าน้ำมัน', K.fuel], ['ค่าใช้จ่ายอื่น', K.other], ['ค่าซ่อม', K.repair], ['น้ำมัน (ลิตร)', K.liters], ['คะแนนคนขับเฉลี่ย', +avgR(ratings).toFixed(2)]] },
          { name: 'รายเดือน', head: ['เดือน', 'เที่ยว', 'กม.', 'ค่าใช้จ่าย'], rows: byMonth.map(x => [x.label, x.trips, x.km, x.cost]) },
          { name: 'แยกตามหมวดงาน', head: ['หมวดงาน', 'ครั้ง', 'เที่ยวรถ', 'กม.', 'ผู้เดินทาง', 'ค่าน้ำมัน', 'ค่าใช้จ่ายอื่น'], rows: byCat.map(x => [x.name, x.n, x.vt, x.km, x.pax, x.fuel, x.other]) },
          { name: 'หมวดงาน×รถ', head: ['หมวดงาน', ...matVeh.map(v => v.name), 'รวม'], rows: matrix.map(m => [m.c.name, ...m.cells, m.cells.reduce((a, b) => a + b, 0)]) },
          { name: 'แยกตามรถ', head: ['รถ', 'ทะเบียน', 'เที่ยว', 'กม.', 'น้ำมัน(ล.)', 'ค่าน้ำมัน', 'กม./ลิตร', 'ค่าใช้จ่ายอื่น', 'ซ่อม(ครั้ง)', 'ค่าซ่อม'], rows: byVehicle.map(x => [x.v.name, x.v.plate, x.trips, x.km, x.liters, x.fuel, +x.kmpl.toFixed(2), x.other, x.rpN, x.rpCost]) },
          { name: 'แยกตามคนขับ', head: ['คนขับ', 'เที่ยว', 'กม.', 'ชั่วโมงขับ', 'ออกตรงเวลา(%)', 'คะแนนเฉลี่ย', 'จำนวนประเมิน'], rows: byDriver.map(x => [x.d.name, x.trips, x.km, +x.hours.toFixed(1), x.ontime != null ? Math.round(x.ontime) : '', +x.rating.toFixed(2), x.rn]) },
          { name: 'แยกตามฝ่าย', head: ['ฝ่าย', 'ครั้ง', 'ผู้เดินทาง', 'กม.', 'ค่าใช้จ่าย'], rows: byDept.map(x => [x.k, x.n, x.pax, x.km, x.cost]) },
          { name: 'ผู้ขอใช้รถ', head: ['ผู้ขอ', 'ฝ่าย', 'ครั้ง', 'กม.'], rows: byPerson.map(x => [x.k, x.dept, x.n, x.km]) },
          { name: 'ปลายทาง', head: ['สถานที่', 'จังหวัด', 'ครั้ง'], rows: byDest.map(x => [x.k, x.prov, x.n]) },
          { name: 'รายการเดินทาง', head: ['เลขที่', 'สถานะ', 'หมวดงาน', 'ออก', 'กลับ', 'ปลายทาง', 'ผู้ขอ', 'ฝ่าย', 'ครู', 'นักเรียน', 'รถ', 'คนขับ', 'กม.', 'ค่าใช้จ่าย'], rows: done.map(r => [r.id, S.STATUS[r.status].label, S.catName(r), fmt.dt(r.startAt), fmt.dt(r.endAt), S.destName(r), r.requester.name, r.requester.dept, r.teachers, r.students, (r.assignments || []).map(a => C.vName(a.vehicleId)).join(', '), (r.assignments || []).map(a => C.dName(a.driverId)).join(', '), r.totalKm, sum(r.expenses || [], e => e.amount)]) }
        ]));
        const draw = () => {
          if (!window.Chart) return;
          Chart.defaults.font.family = '"IBM Plex Sans Thai", Prompt, sans-serif'; Chart.defaults.color = '#6e6a7c';
          const navy = '#24307a', gold = '#c9962b';
          new Chart($('#chMonth', root), { data: { labels: data.byMonth.map(x => x.label), datasets: [{ type: 'bar', label: 'จำนวนเที่ยว', data: data.byMonth.map(x => x.trips), backgroundColor: navy, borderRadius: 8, yAxisID: 'y' }, { type: 'line', label: 'ค่าใช้จ่าย (บาท)', data: data.byMonth.map(x => x.cost), borderColor: gold, backgroundColor: gold, tension: .35, yAxisID: 'y1' }] }, options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(80,60,20,.07)' } }, y1: { beginAtZero: true, position: 'right', grid: { display: false } } } } });
          new Chart($('#chCost', root), { type: 'doughnut', data: { labels: ['ค่าน้ำมัน', 'ทางด่วน', 'ที่จอดรถ', 'อื่น ๆ', 'ค่าซ่อม'], datasets: [{ data: [costBy('fuel'), costBy('toll'), costBy('parking'), costBy('other'), data.K.repair], backgroundColor: [navy, gold, '#5b6ac8', '#e8c36a', '#b91c1c'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' } } } });
          new Chart($('#chVeh', root), { type: 'bar', data: { labels: data.byVehicle.map(x => x.v.name), datasets: [{ label: 'กม.', data: data.byVehicle.map(x => x.km), backgroundColor: navy, borderRadius: 6 }, { label: 'ค่าน้ำมัน (บาท)', data: data.byVehicle.map(x => x.fuel), backgroundColor: gold, borderRadius: 6 }] }, options: { maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } } });
          new Chart($('#chCat', root), { type: 'doughnut', data: { labels: byCat.map(x => x.name), datasets: [{ data: byCat.map(x => x.n), backgroundColor: [navy, gold, '#5b6ac8', '#e8c36a', '#0f766e', '#c2410c', '#94a3b8', '#7c3aed', '#db2777', '#0284c7', '#65a30d', '#a3a3a3'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } } });
          new Chart($('#chProv', root), { type: 'pie', data: { labels: data.byProv.map(x => x.k), datasets: [{ data: data.byProv.map(x => x.n), backgroundColor: [navy, gold, '#5b6ac8', '#e8c36a', '#0f766e', '#c2410c', '#94a3b8', '#7c3aed'], borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } } });
        };
        if (window.Chart) draw(); else { let n = 0; const t = setInterval(() => { if (window.Chart || ++n > 40) { clearInterval(t); draw(); } }, 150); }
      }
    };
  };

  // ═════════ ตั้งค่า ═════════
  Pages.adminSettings = () => {
    const hist = S.needHistory();   // จำนวนครั้งที่ใช้แต่ละหมวดงาน (หมวดที่เคยใช้ลบไม่ได้) ต้องนับจากคำขอทั้งหมด
    const s = JSON.parse(JSON.stringify(S.db.settings));
    const cm = s.committee || [];
    const cats = JSON.parse(JSON.stringify(S.categories(true)));
    return {
      layout: 'admin', live: hist,   // วาดใหม่ครั้งเดียวเมื่อโหลดข้อมูลย้อนหลังเสร็จ (ปกติไม่ถึง 1 วินาที)
      html: `${head('ระบบ', 'ตั้งค่า', 'ข้อมูลทั่วไป กฎการขอใช้รถ ข้อมูลติดต่อ และคณะทำงาน')}
        <form id="sf">
          <div class="form-section"><h3>${icon('settings')} ทั่วไป</h3><div class="grid2">
            <div class="field"><label>ชื่อโรงเรียน</label><input name="schoolName" value="${esc(s.schoolName)}"></div>
            <div class="field"><label>ชื่อภาษาอังกฤษ</label><input name="schoolNameEn" value="${esc(s.schoolNameEn)}"></div>
            <div class="field"><label>ฝ่าย</label><input name="division" value="${esc(s.division)}"></div>
            <div class="field"><label>งาน</label><input name="unit" value="${esc(s.unit)}"></div>
            <div class="field"><label>ต้องขอใช้รถล่วงหน้าอย่างน้อย (วัน)</label><input name="leadDays" type="number" min="0" value="${s.leadDays}"></div>
            <div class="field full"><label>${icon('alert')} สถานพยาบาลสำหรับงานฉุกเฉิน (นำส่งผู้ป่วย) <span class="hint" style="font-weight:400">บรรทัดละแห่ง · เรียงตามที่ใช้บ่อย</span></label><textarea name="hospitals" rows="4">${esc(S.hospitals().join('\n'))}</textarea></div>
            <div class="field full"><label>${icon('package')} รถที่ใช้ออกซื้อ/รับของได้ <span class="hint" style="font-weight:400">ไม่ติ๊กเลย = รถตู้ทุกคัน + กระบะ 09</span></label><div class="chk-grid">${S.db.vehicles.filter(v => v.active !== false).map(v => `<label class="check"><input type="checkbox" name="supplyVehicles" value="${v.id}" ${(s.supplyVehicles || []).includes(v.id) ? 'checked' : ''}> ${esc(v.name)}</label>`).join('')}</div><span class="hint">ตอนนี้ใช้ได้: ${esc(S.supplyVehicles().map(v => v.name).join(', ') || '-')}</span></div>
            <div class="field full"><label>${icon('package')} ร้าน/สถานที่ที่ไปซื้อ/รับของบ่อย <span class="hint" style="font-weight:400">บรรทัดละแห่ง · ร้านที่คนขับพิมพ์เองจะต่อท้ายให้อัตโนมัติ</span></label><textarea name="shops" rows="3">${esc((s.shops && s.shops.length ? s.shops : S.shops().slice(0, 5)).join('\n'))}</textarea></div>
            <div class="field"><label>${icon('truck')} รถขนขยะ</label><select name="garbageVehicleId"><option value="">— อัตโนมัติ (รถที่ชื่อมีคำว่า "ขยะ") —</option>${S.db.vehicles.map(v => `<option value="${v.id}" ${s.garbageVehicleId === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select><span class="hint">คนขับประจำรถคันนี้จะเห็นปุ่มใหญ่ "ออกไปทิ้งขยะ" ในหน้างานขับรถ</span></div>
            <div class="field"><label>${icon('pin')} สถานที่ทิ้งขยะ</label><input name="garbagePlace" value="${esc(s.garbagePlace || '')}" placeholder="จุดทิ้งขยะ"></div>
            <div class="field"><label>งานประจำ: ขอก่อนเวลาออกอย่างน้อย (ชั่วโมง)</label><input name="quickLeadHours" type="number" min="0" step="0.5" value="${S.quickHours()}"><span class="hint">ใช้กับหมวดที่ติ๊ก "งานประจำ" ด้านล่าง — ขอในวันได้ ไม่ต้องแนบบันทึกข้อความ</span></div>
          </div></div>
          <div class="form-section"><h3>${icon('file')} บันทึกข้อความขอใช้รถ <span class="hint" style="font-weight:400">(เอกสารที่พิมพ์ให้ลงนามหลังอนุมัติ · เว้นชื่อว่าง = ใช้ชื่อจากคณะทำงานด้านล่าง)</span></h3>
            ${(() => { const M = C.memoSettings(), m = s.memo || {}; return `<div class="grid2">
              <div class="field"><label>เรียน</label><input name="m_to" value="${esc(m.to || '')}" placeholder="${esc(M.to)}"></div>
              <div class="field"><label>คำนำหน้าเลขที่หนังสือ (ช่อง "ที่")</label><input name="m_noPrefix" value="${esc(m.noPrefix || '')}" placeholder="(ถ้ามี) เช่น ยพ."><span class="hint">ต่อด้วยเลขที่คำขอ เช่น ยพ. VR-2569-0012</span></div>
              ${(() => { const back = S.db.users.filter(u => S.isBack(u) && u.active !== false); const opt = cur => `<option value="">— ยังไม่กำหนด (เซ็นบนกระดาษ) —</option>${back.map(u => `<option value="${esc(u.email)}" ${u.email === cur ? 'selected' : ''}>${esc(u.name || u.email)}${u.position ? ' · ' + esc(u.position) : ''}</option>`).join('')}`; return `
              <div class="field"><label>${icon('edit')} บัญชีผู้ลงนามอิเล็กทรอนิกส์: หัวหน้างานยานพาหนะ</label><select name="m_headEmail">${opt(m.headEmail || '')}</select></div>
              <div class="field"><label>${icon('edit')} บัญชีผู้ลงนามอิเล็กทรอนิกส์: รองผู้อำนวยการฯ</label><select name="m_depEmail">${opt(m.depEmail || '')}</select><span class="hint">เลือกได้เฉพาะบัญชีแอดมิน/ผู้บริหาร · ผู้ลงนามจะเห็นเมนู "บันทึกข้อความรอลงนาม"</span></div>`; })()}
              <div class="field"><label>ชื่อหัวหน้างานยานพาหนะ</label><input name="m_headName" value="${esc(m.headName || '')}" placeholder="${esc(M.headName || 'ชื่อ-นามสกุล')}"></div>
              <div class="field"><label>ตำแหน่ง</label><input name="m_headPos" value="${esc(m.headPos || '')}" placeholder="${esc(M.headPos)}"></div>
              <div class="field"><label>ชื่อรองผู้อำนวยการฝ่ายบริหารงานทั่วไป</label><input name="m_depName" value="${esc(m.depName || '')}" placeholder="${esc(M.depName || 'ชื่อ-นามสกุล')}"></div>
              <div class="field"><label>ตำแหน่ง</label><input name="m_depPos" value="${esc(m.depPos || '')}" placeholder="${esc(M.depPos)}"></div>
            </div>`; })()}
            <p class="hint" style="margin-top:8px">${icon('info')} ตราครุฑมุมซ้ายบน: วางไฟล์รูปครุฑชื่อ <b>krut.png</b> ในโฟลเดอร์ <b>app/images</b> แล้ว Commit/Push (ถ้าไม่มี ระบบใช้ตราโรงเรียนแทน)</p></div>
          <div class="form-section"><h3>${icon('flag')} หมวดงาน <span class="hint" style="font-weight:400">(ใช้ในแบบฟอร์มขอใช้รถและสถิติ · หมวดที่เคยใช้แล้วซ่อนได้แต่ลบไม่ได้)</span></h3>
            <div class="stack" id="catList">${cats.map((c, i) => { const n = S.db.requests.filter(r => r.category === c.id).length; return `<div class="cat-row ${c.active === false ? 'off' : ''}" data-ci2="${i}">
              <span class="ci">${icon(c.icon || 'info')}</span>
              <div><input type="text" data-ck="name" value="${esc(c.name)}" aria-label="ชื่อหมวด"><small class="hint">${c.fixed ? 'หมวดพิเศษ: ผู้ขอต้องพิมพ์ระบุเอง · ' : ''}ใช้แล้ว ${n} ครั้ง</small></div>
              <select data-ck="icon" aria-label="ไอคอน">${S.CAT_ICONS.map(ic => `<option value="${ic}" ${ic === c.icon ? 'selected' : ''}>ไอคอน: ${ic}</option>`).join('')}</select>
              <label class="check"><input type="checkbox" data-ck="active" ${c.active !== false ? 'checked' : ''}> แสดง</label>
              <label class="check" title="ขอในวันได้ ไม่ต้องแนบบันทึกข้อความ"><input type="checkbox" data-ck="quick" ${S.isQuickCat(c.id) ? 'checked' : ''} ${c.id === 'other' ? 'disabled' : ''}> งานประจำ</label>
              <div class="row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="icon-btn sm" data-cmv="${i}" data-dir="-1" aria-label="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}><span style="display:inline-flex;transform:rotate(180deg)">${icon('chev')}</span></button><button type="button" class="icon-btn sm" data-cmv="${i}" data-dir="1" aria-label="เลื่อนลง" ${i === cats.length - 1 ? 'disabled' : ''}>${icon('chev')}</button>${!n && !c.fixed ? `<button type="button" class="icon-btn sm" data-cdel="${i}" aria-label="ลบ">${icon('trash')}</button>` : ''}</div>
            </div>`; }).join('')}</div>
            <button type="button" class="btn btn-ghost btn-sm" id="addCat" style="margin-top:12px">${icon('plus')} เพิ่มหมวดงาน</button></div>
          <div class="form-section"><h3>${icon('pin')} ตำแหน่งโรงเรียน (จุดเริ่มต้นคำนวณระยะทาง)</h3><div class="grid3">
            <div class="field"><label>ละติจูด</label><input name="lat" type="number" step="any" value="${s.school.lat}"></div>
            <div class="field"><label>ลองจิจูด</label><input name="lng" type="number" step="any" value="${s.school.lng}"></div>
            <div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost" id="pinSchool">${icon('pin')} ${Maps.enabled ? 'ปักหมุดบนแผนที่' : 'ค้นหา/ตั้งค่า'}</button></div>
          </div><p class="hint">${icon('info')} ค่าเริ่มต้นเป็นพิกัดโดยประมาณ — กรุณาตรวจสอบและปักหมุดให้ตรงกับที่ตั้งโรงเรียนจริง</p></div>
          <div class="form-section"><h3>${icon('phone')} ข้อมูลติดต่อ (หน้า "ติดต่อเรา")</h3><div class="grid3">
            <div class="field"><label>ชื่อผู้รับสาย</label><input name="contactName" placeholder="เช่น นางนิตยา สุขทอง (พี่แหม่ม)" value="${esc(s.contactName || '')}"></div>
            <div class="field"><label>โทรศัพท์</label><input name="contactPhone" type="tel" value="${esc(s.contactPhone || '')}"></div>
            <div class="field"><label>Gmail / อีเมล</label><input name="contactEmail" type="email" placeholder="example@gmail.com" value="${esc(s.contactEmail || '')}"></div>
            <div class="field"><label>ห้องทำงาน</label><input name="contactRoom" value="${esc(s.contactRoom || '')}"></div>
            <div class="field full"><label>ข้อความแนะนำ</label><textarea name="contactNote" rows="2">${esc(s.contactNote || '')}</textarea></div>
          </div></div>
          <div class="form-section"><h3>${icon('users')} คณะทำงาน <span class="hint" style="font-weight:400">(ระดับ 1 = รองผู้อำนวยการ · ระดับ 2–3 = ระดับรองลงมา)</span></h3>
            <div class="stack" id="cmList">${cm.map((c, i) => `<div class="assign" data-ci="${i}"><div class="grid3">
              <div class="field"><label>ระดับ</label><select data-k="level">${[1, 2, 3].map(l => `<option value="${l}" ${+c.level === l ? 'selected' : ''}>ระดับ ${l}</option>`).join('')}</select></div>
              <div class="field"><label>ตำแหน่ง</label><input data-k="position" value="${esc(c.position)}"></div>
              <div class="field"><label>ชื่อ-นามสกุล</label><input data-k="name" value="${esc(c.name)}" placeholder="(รอข้อมูล)"></div>
              <div class="field"><label>เบอร์โทร</label><input data-k="phone" value="${esc(c.phone)}"></div>
              <div class="field"><label>อีเมล</label><input data-k="email" value="${esc(c.email)}"></div>
              <div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost btn-sm" data-rmc="${i}">${icon('trash')} ลบ</button></div>
              <div class="field full">${C.filePicker('cph' + i, c.photo ? [c.photo] : [], { label: 'รูป', multiple: false })}</div>
            </div></div>`).join('')}</div>
            <button type="button" class="btn btn-ghost btn-sm" id="addC" style="margin-top:12px">${icon('plus')} เพิ่มบุคคล</button></div>
          <div class="form-section"><h3>${icon('clock')} สถานที่ที่เคยไป (ใช้แนะนำตอนกรอกฟอร์ม)</h3>
            <div class="stack">${S.db.places.slice().sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 40).map(p => `<div class="lot-row">${icon('pin')}<div style="min-width:0"><b>${esc(p.name)}</b><small>${esc(p.address || p.province || '')} · ${p.km || '?'} กม. · ${p.count || 0} ครั้ง</small></div><button type="button" class="icon-btn sm" data-dpl="${p.id}">${icon('trash')}</button></div>`).join('') || '<p class="hint">ยังไม่มี</p>'}</div></div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')} บันทึกการตั้งค่า</button></div>
        </form>
        ${S.isSuper(S.me) ? purgeHTML() : ''}
        ${S.LOCAL ? `<div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('flask')} โหมดทดลอง</h3></div><p class="hint" style="margin-bottom:12px">ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ล้างแล้วจะสร้างข้อมูลตัวอย่างใหม่</p><button class="btn btn-danger btn-sm" data-reset>${icon('refresh')} ล้างข้อมูลตัวอย่าง</button></div>` : ''}`,
      mount(root) {
        if (S.isSuper(S.me)) bindPurge(root);
        const photoGetters = cm.map((c, i) => C.bindFilePicker(root, 'cph' + i, c.photo ? [c.photo] : [], { multiple: false }));
        const collect = () => {
          const f = UI.formData($('#sf', root));
          const committee = $$('[data-ci]', root).map(row => { const i = +row.dataset.ci; const o = { ...(cm[i] || { id: 'c' + Date.now() + i }) }; $$('[data-k]', row).forEach(el => { o[el.dataset.k] = el.dataset.k === 'level' ? +el.value : el.value; }); o.photo = (photoGetters[i] ? photoGetters[i]() : [])[0] || ''; return o; });
          const categories = $$('[data-ci2]', root).map((row, i) => { const c = { ...cats[+row.dataset.ci2] }; c.name = row.querySelector('[data-ck=name]').value.trim() || c.name; c.icon = row.querySelector('[data-ck=icon]').value; c.active = row.querySelector('[data-ck=active]').checked; c.quick = c.id !== 'other' && row.querySelector('[data-ck=quick]').checked; c.order = i; return c; });
          return { schoolName: f.schoolName, schoolNameEn: f.schoolNameEn, division: f.division, unit: f.unit, leadDays: +f.leadDays || 0, quickLeadHours: Math.max(0, +f.quickLeadHours || 0), hospitals: String(f.hospitals || '').split('\n').map(x => x.trim()).filter(Boolean), shops: String(f.shops || '').split('\n').map(x => x.trim()).filter(Boolean), supplyVehicles: $$('[name=supplyVehicles]:checked', root).map(x => x.value), garbageVehicleId: f.garbageVehicleId || '', garbagePlace: String(f.garbagePlace || '').trim(), school: { ...s.school, lat: +f.lat, lng: +f.lng }, contactName: (f.contactName || '').trim(), contactPhone: f.contactPhone, contactEmail: (f.contactEmail || '').trim(), contactRoom: f.contactRoom, contactNote: f.contactNote, committee, categories,
            memo: { headEmail: f.m_headEmail || '', depEmail: f.m_depEmail || '', to: f.m_to.trim(), noPrefix: f.m_noPrefix.trim(), headName: f.m_headName.trim(), headPos: f.m_headPos.trim(), depName: f.m_depName.trim(), depPos: f.m_depPos.trim() } };
        };
        const saveCats = async mut => { const x = collect(); mut(x.categories); x.categories.forEach((c, i) => { c.order = i; }); await S.saveSettings(x); App.render(); };
        root.addEventListener('click', async e => {
          if (e.target.closest('#addCat')) { const res = await UI.confirm('ชื่อหมวดงานใหม่', { title: 'เพิ่มหมวดงาน', ok: 'เพิ่ม', input: { label: 'ชื่อหมวด', required: true } }); if (res && res.value) await saveCats(list => { const i = list.findIndex(c => c.id === 'other'); list.splice(i < 0 ? list.length : i, 0, { id: 'c' + Date.now().toString(36), name: res.value, icon: 'flag', active: true }); }); return; }
          const mv = e.target.closest('[data-cmv]'); if (mv) { const i = +mv.dataset.cmv, j = i + +mv.dataset.dir; await saveCats(list => { if (list[j]) [list[i], list[j]] = [list[j], list[i]]; }); return; }
          const cd = e.target.closest('[data-cdel]'); if (cd) { if (await UI.confirm('ลบหมวดงานนี้?', { danger: true, ok: 'ลบ' })) await saveCats(list => list.splice(+cd.dataset.cdel, 1)); return; }
          if (e.target.closest('#addC')) { const x = collect(); x.committee.push({ id: 'c' + Date.now(), level: 3, position: 'เจ้าหน้าที่งานยานพาหนะ', name: '', phone: '', email: '', photo: '' }); await S.saveSettings(x); App.render(); }
          const rm = e.target.closest('[data-rmc]'); if (rm) { const x = collect(); x.committee.splice(+rm.dataset.rmc, 1); await S.saveSettings(x); App.render(); }
          const dp = e.target.closest('[data-dpl]'); if (dp) { await S.deletePlace(dp.dataset.dpl); App.render(); }
          if (e.target.closest('#pinSchool')) { const p = await Maps.pick({ name: s.school.name, lat: s.school.lat, lng: s.school.lng }); if (p && p.lat != null) { $('#sf', root).lat.value = (+p.lat).toFixed(6); $('#sf', root).lng.value = (+p.lng).toFixed(6); } }
        });
        $('#sf', root).addEventListener('submit', e => { e.preventDefault(); UI.busy(e.target.querySelector('[type=submit]'), () => S.saveSettings(collect())).then(() => UI.toast('บันทึกการตั้งค่าแล้ว')).catch(() => {}); });
      }
    };
  };

  // ═════════ คำสั่งงานรถจากผู้อำนวยการ (ผอ.สั่งเอง / แอดมินบันทึกแทน) — ไม่ต้องมีบันทึกข้อความ แอดมินแค่จัดรถ/คนขับ ═════════
  Pages._orderModal = async ({ admin = false } = {}) => {
    const execs = S.db.users.filter(u => u.active !== false && (u.roles || []).includes('executive')).sort((a, b) => (/ผู้อำนวยการ/.test(b.position || '') && !/รอง/.test(b.position || '')) - (/ผู้อำนวยการ/.test(a.position || '') && !/รอง/.test(a.position || '')));
    if (admin && !execs.length) { UI.toast('ยังไม่มีผู้ใช้ที่มีสิทธิ์ผู้บริหาร — ตั้งสิทธิ์ในหน้าผู้ใช้ก่อน', 'error'); return null; }
    let dests = [];
    const t0 = new Date(); t0.setMinutes(0, 0, 0); t0.setHours(t0.getHours() + 1);
    const t1 = new Date(t0.getTime() + 3 * 36e5);
    const draw = el => {
      el.querySelector('#odList').innerHTML = dests.map((d, i) => `<div class="dest"><span class="n">${i + 1}</span><div style="min-width:0"><b>${esc(d.name)}</b><small>${esc(d.address || d.province || '')}${d.km ? ` · ${d.km} กม.` : ''}</small></div><div class="row" style="gap:4px">${i ? `<button type="button" class="icon-btn sm" data-up="${i}" aria-label="เลื่อนขึ้น"><span style="display:inline-block;transform:rotate(180deg)">${icon('chev')}</span></button>` : ''}<button type="button" class="icon-btn sm" data-del="${i}" aria-label="ลบ">${icon('trash')}</button></div></div>`).join('') || `<p class="hint">ยังไม่ได้เลือกสถานที่</p>`;
    };
    return UI.modal({
      title: `${icon('send')} ${admin ? 'บันทึกคำสั่งงานรถจาก ผอ.' : 'สั่งงานรถ'}`, size: 'lg',
      body: `<form id="odF" class="stack">
        <div class="note-box navy">${icon('info')}<div>ไม่ต้องแนบบันทึกข้อความ · ไม่ต้องรออนุมัติ · แอดมินได้รับแจ้งทันทีแล้วจัดรถ/คนขับให้</div></div>
        ${admin ? `<div class="field"><label>ผู้สั่งการ <b class="req">*</b></label><select name="by">${execs.map(u => `<option value="${esc(u.email)}">${esc(u.name)}${u.position ? ' · ' + esc(u.position) : ''}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>ภารกิจ <b class="req">*</b></label><input name="purpose" placeholder="เช่น ประชุมที่ สพฐ. / รับวิทยากร"></div>
        <div class="field"><label>สถานที่ปลายทาง <b class="req">*</b> <span class="hint">หลายแห่งได้ เรียงตามลำดับที่ไป</span></label><div class="dest-list" id="odList"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="odAdd" style="margin-top:8px">${icon('plus')} เพิ่มจุดแวะ</button></div>
        <div class="grid2">
          <div class="field"><label>ออกเดินทาง <b class="req">*</b></label><input name="startAt" type="datetime-local" value="${fmt.local(t0)}"></div>
          <div class="field"><label>กลับถึง (โดยประมาณ) <b class="req">*</b></label><input name="endAt" type="datetime-local" value="${fmt.local(t1)}"></div>
          <div class="field"><label>ครู/บุคลากร</label><input name="teachers" type="number" min="0" inputmode="numeric" value="1"></div>
          <div class="field"><label>นักเรียน</label><input name="students" type="number" min="0" inputmode="numeric" value="0"></div>
          <div class="field"><label>จุดขึ้นรถ</label><input name="pickup" value="โรงเรียน"></div>
          <div class="field"><label>เบอร์ติดต่อผู้เดินทาง</label><input name="contactPhone" inputmode="tel"></div>
          <div class="field full"><label>ผู้เดินทาง / หมายเหตุถึงแอดมิน</label><input name="note" placeholder="เช่น ผอ.ไปเอง · ขอรถตู้คันใหญ่"></div>
        </div></form>`,
      onOpen(el) {
        draw(el);
        el.querySelector('#odAdd').addEventListener('click', async () => { const p = await Maps.pick(); if (p) { dests.push(p); draw(el); } });
        el.querySelector('#odList').addEventListener('click', e => {
          const up = e.target.closest('[data-up]'), del = e.target.closest('[data-del]');
          if (up) { const i = +up.dataset.up; [dests[i - 1], dests[i]] = [dests[i], dests[i - 1]]; draw(el); }
          if (del) { dests.splice(+del.dataset.del, 1); draw(el); }
        });
      },
      actions: [{ label: 'ยกเลิก', value: null }, { label: admin ? 'บันทึกคำสั่ง' : 'ส่งคำสั่ง', kind: 'btn-primary', icon: 'send', onClick: async el => {
        const f = el.querySelector('#odF');
        if (!dests.length) { UI.toast('กรุณาเพิ่มสถานที่ปลายทาง', 'error'); return false; }
        const total = await Maps.tripTotal(dests).catch(() => ({ km: 0, mins: 0 }));
        return S.createOrder({ purpose: f.purpose.value, destinations: dests, totalKm: total.km, totalMins: total.mins, startAt: f.startAt.value, endAt: f.endAt.value, tripType: 'day',
          teachers: f.teachers.value, students: f.students.value, others: 0, pickup: f.pickup.value, contactPhone: f.contactPhone.value, note: f.note.value }, { by: admin ? f.by.value : '' });
      } }]
    }).then(r => { if (r) UI.toast(admin ? `บันทึกคำสั่ง ${r.id} แล้ว — เลือกรถ/คนขับได้เลย` : `ส่งคำสั่ง ${r.id} แล้ว — แอดมินจะจัดรถ/คนขับให้`, 'ok'); return r; });
  };

  // ═════════ นำเข้าข้อมูลเชิงลึกของรถจาก Excel (พ.ร.บ. · ภาษี · ประกันภัย · เลขตัวถัง/เครื่องยนต์) ═════════
  // จับคู่รถด้วยเลขทะเบียน · ช่องที่เป็น "-" หรือว่าง = เก็บค่าเดิม · รถที่หาไม่เจอ = ข้าม (เลือกจับคู่เองได้) · ไฟล์อ่านในเบราว์เซอร์เท่านั้น
  const VP_FIELDS = [
    ['actCompany', 'บริษัท พ.ร.บ.', h => /บริษัท/.test(h) && /พ\.?ร\.?บ/.test(h)],
    ['actNo', 'เลขกรมธรรม์ พ.ร.บ.', h => /พ\.?ร\.?บ/.test(h) && /กรมธรรม์/.test(h)],
    ['actExpiry', 'พ.ร.บ. หมดอายุ', h => /พ\.?ร\.?บ/.test(h) && /หมดอายุ/.test(h), 'date'],
    ['taxExpiry', 'ภาษีรถ หมดอายุ', h => /ภาษี/.test(h), 'date'],
    ['insurance.company', 'บริษัทประกันภัย', h => /บริษัท/.test(h) && /ประกัน/.test(h)],
    ['insurance.cls', 'ชั้นประกัน', h => /ชั้น/.test(h)],
    ['insurance.policyNo', 'เลขกรมธรรม์ ประกันภัย', h => /ประกัน/.test(h) && /กรมธรรม์/.test(h)],
    ['insurance.expiry', 'ประกันภัย หมดอายุ', h => /ประกัน/.test(h) && /หมดอายุ/.test(h), 'date'],
    ['insurance.phone', 'เบอร์แจ้งเคลม', h => /เคลม/.test(h)],
    ['chassisNo', 'เลขตัวถัง', h => /ตัวถัง/.test(h)],
    ['engineNo', 'เลขเครื่องยนต์', h => /เครื่องยนต์/.test(h)],
    ['fuelType', 'ชนิดเชื้อเพลิง', h => /เชื้อเพลิง/.test(h)],
    ['fuelCard', 'เลขบัตรเติมน้ำมัน', h => /บัตร/.test(h) && /น้ำมัน/.test(h)]
  ];
  const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const blankCell = x => x == null || /^[\s\-–—.]*$/.test(String(x));
  const p2 = n => String(n).padStart(2, '0');
  // วันที่: เลขวันที่ Excel (ปี พ.ศ. หรือ ค.ศ.) · "29 ก.ย.2570" · "29/09/2570" → YYYY-MM-DD (ค.ศ.)
  function vpDate(x) {
    if (blankCell(x)) return '';
    const ce = y => (y > 2400 ? y - 543 : y < 100 ? y + (y > 60 ? 1957 : 2000) : y);
    if (typeof x === 'number' && window.XLSX) { const d = XLSX.SSF.parse_date_code(x); if (d && d.y) return `${ce(d.y)}-${p2(d.m)}-${p2(d.d)}`; }
    const s = String(x).replace(/\s+/g, ' ').trim();
    let m = s.match(/^(\d{1,2})\s*([ก-ฮ.]+)\s*(\d{2,4})$/);
    if (m) { const k = TH_MON.findIndex(t => t.replace(/\./g, '') === m[2].replace(/\./g, '')); if (k >= 0) return `${ce(+m[3])}-${p2(k + 1)}-${p2(+m[1])}`; }
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) return `${ce(+m[3])}-${p2(+m[2])}-${p2(+m[1])}`;
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${ce(+m[1])}-${m[2]}-${m[3]}`;
    return '';
  }
  // เลขทะเบียน → แกนหลัก (ตัดจังหวัด ช่องว่าง ขีด) เช่น "1 นฌ 8758\nกรุงเทพ" → "1นฌ8758" · "82-8443 ปทุมธานี" → "828443"
  const plateKey = s => { const t = String(s || '').split(/\n/)[0]; const m = t.match(/\d?\s*[ก-ฮ]{1,3}\s*-?\s*\d{1,4}|\d{1,3}\s*-\s*\d{3,4}/); return (m ? m[0] : t).replace(/[\s\-]/g, ''); };
  function vpParse(buf) {
    if (!window.XLSX) throw new Error('ตัวอ่าน Excel ยังโหลดไม่เสร็จ — ลองใหม่อีกครั้ง');
    const wb = XLSX.read(buf), out = [];
    wb.SheetNames.forEach(n => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
      const hi = rows.findIndex(r => r.some(c => /ทะเบียน/.test(String(c))));
      if (hi < 0) return;
      const hs = rows[hi].map(c => String(c).replace(/\s+/g, ''));
      const pc = hs.findIndex(h => /ทะเบียน/.test(h)), kc = hs.findIndex(h => /ประเภทรถ/.test(h));
      const cols = VP_FIELDS.map(f => ({ f, i: hs.findIndex(f[2]) })).filter(x => x.i >= 0);
      rows.slice(hi + 1).forEach((r, k) => {
        if (blankCell(r[pc])) return;
        const vals = {};
        cols.forEach(({ f, i }) => { const raw = r[i]; if (blankCell(raw)) return; const v = f[3] === 'date' ? vpDate(raw) : String(raw).replace(/\s*\n\s*/g, ' ').trim(); if (v) vals[f[0]] = v; });
        out.push({ row: hi + k + 2, plate: String(r[pc]).replace(/\s*\n\s*/g, ' ').trim(), kind: kc >= 0 ? String(r[kc]).trim() : '', key: plateKey(r[pc]), vals });
      });
    });
    return out;
  }
  Pages._vpParse = vpParse;
  const getP = (o, k) => k.split('.').reduce((a, x) => (a || {})[x], o);
  const setP = (o, k, v) => { const ks = k.split('.'); let a = o; ks.slice(0, -1).forEach(x => { a[x] = a[x] || {}; a = a[x]; }); a[ks[ks.length - 1]] = v; };
  Pages._vpImport = async (preset = null) => {
    let buf = preset;
    if (!buf) {
      const file = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xls,.csv'; i.onchange = () => res(i.files[0] || null); i.click(); });
      if (!file) return;
      buf = await file.arrayBuffer();
    }
    let rows; try { rows = vpParse(buf); } catch (e) { return UI.toast(e.message, 'error'); }
    if (!rows.length) return UI.toast('ไม่พบตารางที่มีคอลัมน์ "ทะเบียน" ในไฟล์', 'error');
    const vs = S.db.vehicles;
    rows.forEach(r => { const v = vs.find(x => plateKey(x.plate) === r.key); r.vid = v ? v.id : ''; });
    const fmtV = (k, v) => /Expiry|expiry/.test(k) ? fmt.date(v) : v;
    const diff = r => { if (!r.vid) return []; const p = S.db.vprivate[r.vid] || {}; return Object.entries(r.vals).filter(([k, v]) => String(getP(p, k) || '') !== String(v)); };
    const body = () => `<p class="hint">${icon('info')} พบ <b>${rows.length}</b> คันในไฟล์ · จับคู่ด้วยเลขทะเบียน · ช่องที่เป็น "-" หรือว่าง = เก็บข้อมูลเดิมไว้ · ไฟล์อ่านในเครื่องนี้เท่านั้น ไม่ได้อัปโหลด</p>
      <div class="tbl-wrap"><table class="tbl vp-tbl" data-nostack><thead><tr><th>แถว</th><th>ทะเบียน (ในไฟล์)</th><th>รถในระบบ</th><th>จะเปลี่ยน</th></tr></thead><tbody>
      ${rows.map((r, i) => { const d = diff(r); return `<tr class="${r.vid ? '' : 'vp-miss'}"><td>${r.row}</td><td><b>${esc(r.plate)}</b><small>${esc(r.kind)}</small></td>
        <td><select class="input" data-vp="${i}"><option value="">— ข้าม (ไม่พบในระบบ) —</option>${vs.map(v => `<option value="${v.id}" ${v.id === r.vid ? 'selected' : ''}>${esc(v.name)} · ${esc(v.plate || '')}</option>`).join('')}</select></td>
        <td>${!r.vid ? '<span class="hint">ข้าม</span>' : d.length ? `<b>${d.length} ช่อง</b><small>${d.map(([k, v]) => `${esc((VP_FIELDS.find(f => f[0] === k) || [])[1])}: ${esc(fmtV(k, v))}`).join('<br>')}</small>` : '<span class="hint">ข้อมูลตรงกันแล้ว</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>`;
    return UI.modal({
      title: `${icon('upload')} นำเข้า พ.ร.บ. · ภาษี · ประกันภัย จาก Excel`, size: 'lg', body: `<div id="vpBox">${body()}</div>`,
      onOpen(el) { el.addEventListener('change', e => { const s = e.target.closest('[data-vp]'); if (!s) return; rows[+s.dataset.vp].vid = s.value; el.querySelector('#vpBox').innerHTML = body(); }); },
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึกทั้งหมด', kind: 'btn-primary', icon: 'check', onClick: async () => {
        const todo = rows.filter(r => r.vid && diff(r).length);
        const dup = todo.map(r => r.vid).filter((x, i, a) => a.indexOf(x) !== i);
        if (dup.length) { UI.toast(`มีหลายแถวจับคู่กับรถคันเดียวกัน (${dup.map(id => C.vName(id)).join(', ')}) — แก้การจับคู่ก่อน`, 'error'); return false; }
        if (!todo.length) { UI.toast('ไม่มีข้อมูลที่ต้องเปลี่ยน'); return true; }
        for (const r of todo) {
          const p = JSON.parse(JSON.stringify(S.db.vprivate[r.vid] || { id: r.vid, insurance: {}, repairs: [], maintenancePlan: [], accidents: [], docs: [], notes: '' }));
          p.insurance = p.insurance || {};
          Object.entries(r.vals).forEach(([k, v]) => setP(p, k, v));
          await S.saveVehiclePrivate(r.vid, p);
        }
        UI.toast(`บันทึกข้อมูลเชิงลึก ${todo.length} คันแล้ว`, 'ok');
        return true;
      } }]
    });
  };
})();
