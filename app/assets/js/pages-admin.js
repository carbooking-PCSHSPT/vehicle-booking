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

  // ───────── โครงหลังบ้าน ─────────
  Pages._adminShell = (path, html) => {
    const me = S.me, admin = S.isAdmin(me);
    const pending = S.db.requests.filter(r => r.status === 'pending').length;
    const L = (h, ic, t, cnt) => `<a href="#${h}" class="${path === h || (h !== '/admin' && path.startsWith(h)) ? 'on' : ''}">${icon(ic)}${t}${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
    return `<div class="admin">
      <aside class="side no-print">
        ${admin ? `<h5>งานประจำวัน</h5>${L('/admin', 'grid', 'ภาพรวม')}${L('/admin/requests', 'clipboard', 'คำขอใช้รถ', pending)}${L('/admin/new', 'alert', 'บันทึกคำขอเร่งด่วน')}${L('/admin/roster', 'calendar', 'ตารางงานคนขับ')}${L('/driver', 'wheel', 'มุมมองคนขับ')}
        <h5>ข้อมูลหลัก</h5>${L('/admin/vehicles', 'van', 'ข้อมูลรถ')}${L('/admin/drivers', 'users', 'พนักงานขับรถ')}${L('/admin/users', 'userPlus', 'ผู้ใช้และสิทธิ์')}` : ''}
        <h5>รายงาน</h5>${admin ? L('/admin/expenses', 'fuel', 'ค่าน้ำมัน/ค่าใช้จ่าย') : ''}${L('/admin/stats', 'chart', 'สถิติและรายงาน')}${L('/admin/ratings', 'star', 'ประเมินคนขับ')}
        ${admin ? `<h5>ระบบ</h5>${L('/admin/settings', 'settings', 'ตั้งค่า')}` : ''}
      </aside>
      <div class="page-enter" style="min-width:0">${html}</div>
    </div>`;
  };
  const head = (eyebrow, title, sub = '', right = '') => `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="row">${right}</div>` : ''}</div>`;

  // ═════════ ภาพรวม ═════════
  Pages.adminHome = () => {
    const now = new Date(), rs = S.db.requests;
    const pending = rs.filter(r => r.status === 'pending').sort((a, b) => a.startAt.localeCompare(b.startAt));
    const today = rs.filter(r => !['cancelled', 'rejected', 'revise'].includes(r.status) && new Date(r.startAt) <= new Date(new Date().setHours(23, 59, 59)) && new Date(r.endAt) >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.startAt.localeCompare(b.startAt));
    const vs = S.db.vehicles.filter(v => v.bookable !== false), st = vs.map(v => S.vehicleState(v).key);
    const alerts = [];
    rs.filter(r => r.status === 'ontrip').forEach(r => r.assignments.forEach(a => { if (a.status === 'ontrip' && now - new Date(r.endAt) > 30 * 6e4) alerts.push({ red: true, ic: 'clock', t: `${C.vName(a.vehicleId)} เลยเวลากลับแล้ว ${fmt.dur(now - new Date(r.endAt))} (ยังไม่กดกลับถึง)`, h: `#/admin/requests/${r.id}` }); }));
    rs.filter(r => r.status === 'approved' && r.assignments.some(a => a.status === 'assigned') && now - new Date(r.startAt) > 60 * 6e4).forEach(r => alerts.push({ ic: 'navigation', t: `${r.id} ถึงเวลาออกเดินทางแล้วแต่คนขับยังไม่กดออกเดินทาง`, h: `#/admin/requests/${r.id}` }));
    rs.filter(r => r.status === 'approved' && r.assignments.some(a => !a.driverId)).forEach(r => alerts.push({ ic: 'wheel', t: `${r.id} ยังไม่ได้ระบุคนขับ`, h: `#/admin/requests/${r.id}` }));
    Object.values(S.db.vprivate).forEach(p => {
      const v = S.vehicle(p.id); if (!v) return;
      [['actExpiry', 'พ.ร.บ.'], ['taxExpiry', 'ภาษีรถ']].forEach(([k, l]) => { if (p[k]) { const d = daysTo(p[k]); if (d <= 30) alerts.push({ red: d <= 7, ic: 'shield', t: `${v.name} · ${l} ${d < 0 ? `หมดอายุแล้ว ${-d} วัน` : `จะหมดอายุในอีก ${d} วัน`} (${fmt.date(p[k])})`, h: `#/admin/vehicles/${v.id}?tab=private` }); } });
      if (p.insurance && p.insurance.expiry) { const d = daysTo(p.insurance.expiry); if (d <= 30) alerts.push({ red: d <= 7, ic: 'shield', t: `${v.name} · ประกันภัย ${d < 0 ? 'หมดอายุแล้ว' : `จะหมดอายุในอีก ${d} วัน`} (${fmt.date(p.insurance.expiry)})`, h: `#/admin/vehicles/${v.id}?tab=private` }); }
    });
    S.db.drivers.forEach(d => { if (d.licenseExpiry && daysTo(d.licenseExpiry) <= 30) alerts.push({ red: daysTo(d.licenseExpiry) <= 7, ic: 'user', t: `ใบขับขี่ ${d.name} ${daysTo(d.licenseExpiry) < 0 ? 'หมดอายุแล้ว' : `จะหมดอายุในอีก ${daysTo(d.licenseExpiry)} วัน`}`, h: '#/admin/drivers' }); });
    const toClose = rs.filter(r => r.status === 'returned');
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
            ${toClose.length ? `<div class="divider"></div><div class="card-head"><h3>${icon('check')} กลับถึงแล้ว รอปิดงาน / บันทึกค่าใช้จ่าย</h3><span class="pill tone-done">${toClose.length}</span></div><div class="stack">${toClose.slice(0, 5).map(r => C.reqCard(r, `#/admin/requests/${r.id}`)).join('')}</div>` : ''}
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
  Pages.adminRoster = ({ query }) => {
    const view = query.view === 'month' ? 'month' : 'week';
    const sel = UI.dayOf(query.date);
    const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; };
    const start = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth(), 1) : addD(sel, -sel.getDay());
    const days = view === 'month' ? Array.from({ length: new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate() }, (_, i) => addD(start, i)) : Array.from({ length: 7 }, (_, i) => addD(start, i));
    const prev = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() - 1, 1) : addD(sel, -7);
    const next = view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() + 1, 1) : addD(sel, 7);
    const qs = o => '#/admin/roster?' + new URLSearchParams({ view, date: fmt.localDate(sel), ...o });
    const ds = S.db.drivers.filter(d => d.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    const rows = ds.map(d => { const jobs = Pages._driverJobs(d.id); return { d, cells: days.map(day => { const list = Pages._jobsOn(jobs, day); return { day, list, s: Pages._daySummary(list, day) }; }) }; });
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
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="roster r-${view}">
          <thead><tr><th class="rn">คนขับ</th>${days.map(day => `<th class="${UI.sameDay(day, new Date()) ? 'today' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'we' : ''}">${view === 'week' ? `${day.toLocaleDateString('th-TH', { weekday: 'short' })}<b>${day.getDate()}</b>` : `<b>${day.getDate()}</b>${day.toLocaleDateString('th-TH', { weekday: 'narrow' })}`}</th>`).join('')}<th>รวม</th></tr></thead>
          <tbody>${rows.map(({ d, cells }) => `<tr><td class="rn"><a href="#/driver?tab=cal&d=${d.id}&view=${view}&date=${fmt.localDate(sel)}"><b>${esc(d.name)}</b><small>${S.db.vehicles.filter(v => v.driverId === d.id).map(v => esc(v.name)).join(', ') || '—'}</small></a></td>
            ${cells.map(c => `<td class="${UI.sameDay(c.day, new Date()) ? 'today' : ''} ${c.day.getDay() === 0 || c.day.getDay() === 6 ? 'we' : ''}">${c.s.n ? `<button class="rc lv${Math.min(3, c.s.n)} ${c.s.live ? 'live' : ''}" data-cell="${d.id}|${fmt.localDate(c.day)}" title="${c.list.map(j => `${fmt.time(j.r.startAt)} ${S.destName(j.r)}`).join('\n')}">${view === 'week' ? `<span>${icon('van')}<b>${c.s.n}</b> งาน</span><small>${c.s.first || (c.s.cont ? 'ต่อเนื่อง' : '')}</small>${c.list[0] ? `<em>${esc(S.destName(c.list[0].r)).slice(0, 18)}</em>` : ''}` : `<b>${c.s.n}</b>`}</button>` : '<span class="rz">·</span>'}</td>`).join('')}
            <td class="rt"><b>${cells.reduce((s, c) => s + c.s.n, 0)}</b></td></tr>`).join('')}</tbody>
        </table></div></div>
        <div class="g-legend" style="display:flex;gap:16px;margin-top:10px;color:var(--muted);font-size:.82rem;flex-wrap:wrap"><span><span class="rc lv1" style="display:inline-block;width:18px;height:12px;padding:0"></span> 1 งาน</span><span><span class="rc lv2" style="display:inline-block;width:18px;height:12px;padding:0"></span> 2 งาน</span><span><span class="rc lv3" style="display:inline-block;width:18px;height:12px;padding:0"></span> 3 งานขึ้นไป</span><span><span class="rc live" style="display:inline-block;width:18px;height:12px;padding:0"></span> กำลังเดินทาง</span><span>กดชื่อคนขับ = เปิดปฏิทินของคนนั้น</span></div>`,
      mount(root) {
        root.addEventListener('click', e => {
          const b = e.target.closest('[data-cell]'); if (!b) return;
          const [dId, ds] = b.dataset.cell.split('|'), day = new Date(ds + 'T00:00:00'), d = S.driver(dId);
          const list = Pages._jobsOn(Pages._driverJobs(dId), day);
          UI.modal({ title: `${icon('wheel')} ${esc(d.name)} · ${fmt.dateLong(day)}`, size: 'lg', body: `<div class="stack">${list.map(j => `<div>${C.pass(j.r, { href: `#/admin/requests/${j.r.id}` })}<p class="hint" style="margin:6px 4px 0">${icon('van')} คันที่ขับ: <b>${esc(C.vName(j.a.vehicleId))}</b> · ${S.ASSIGN[j.a.status]}${j.a.note ? ` · หมายเหตุ: ${esc(j.a.note)}` : ''}</p></div>`).join('')}</div>`,
            actions: [{ label: 'ปิด', value: null }, { label: 'เปิดปฏิทินของคนขับ', kind: 'btn-primary', icon: 'calendar', onClick: () => { location.hash = `#/driver?tab=cal&d=${dId}&view=month&date=${ds}`; return true; } }] });
        });
      }
    };
  };

  // ═════════ รายการคำขอ ═════════
  Pages.adminRequests = ({ query }) => {
    const f = query.f || 'pending', q = (query.q || '').trim(), m = query.m || '', cf = query.c || '';
    const G = { pending: ['pending'], revise: ['revise'], approved: ['approved'], ontrip: ['ontrip'], returned: ['returned'], closed: ['closed'], rejected: ['rejected', 'cancelled'], all: null };
    let list = S.db.requests.filter(r => !G[f] || G[f].includes(r.status));
    if (m) list = list.filter(r => r.startAt.slice(0, 7) === m);
    if (cf) list = list.filter(r => (r.category || '') === (cf === 'none' ? '' : cf));
    if (q) list = list.filter(r => [r.id, r.purpose, r.requester.name, r.requester.dept, S.destName(r)].join(' ').toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => f === 'pending' || f === 'approved' ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt));
    const cnt = k => S.db.requests.filter(r => !G[k] || G[k].includes(r.status)).length;
    const qs = o => '#/admin/requests?' + new URLSearchParams({ f, q, m, c: cf, ...o });
    return {
      layout: 'admin',
      html: `${head('คำขอใช้รถ', 'รายการคำขอใช้รถ', 'ตรวจบันทึกข้อความ อนุมัติ และมอบหมายรถ/คนขับ', `<a class="btn btn-primary btn-sm" href="#/admin/new">${icon('plus')} บันทึกคำขอเร่งด่วน</a>`)}
        <div class="toolbar"><div class="seg">${[['pending', 'รอตรวจสอบ'], ['revise', 'ส่งกลับแก้ไข'], ['approved', 'อนุมัติแล้ว'], ['ontrip', 'กำลังเดินทาง'], ['returned', 'รอปิดงาน'], ['closed', 'ปิดงานแล้ว'], ['rejected', 'ไม่อนุมัติ/ยกเลิก'], ['all', 'ทั้งหมด']].map(([k, l]) => `<a href="${qs({ f: k })}"><button class="${f === k ? 'on' : ''}" tabindex="-1">${l} ${cnt(k)}</button></a>`).join('')}</div></div>
        <div class="toolbar"><div class="search-in">${icon('search')}<input class="input" id="q" placeholder="ค้นหา เลขที่ ผู้ขอ ฝ่าย ปลายทาง" value="${esc(q)}"></div><input class="input" type="month" id="m" value="${esc(m)}" style="width:auto"><select class="input" id="cf" style="width:auto"><option value="">ทุกหมวดงาน</option>${S.categories(true).map(c => `<option value="${c.id}" ${c.id === cf ? 'selected' : ''}>${esc(c.id === 'other' ? 'อื่น ๆ' : c.name)}</option>`).join('')}<option value="none" ${cf === 'none' ? 'selected' : ''}>ไม่ระบุหมวด</option></select><button class="btn btn-ghost btn-sm" id="xls">${icon('download')} Excel</button></div>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>เลขที่</th><th>วันเวลา</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอ</th><th>ผู้เดินทาง</th><th>รถ / คนขับ</th><th>สถานะ</th></tr></thead>
          <tbody>${list.map(r => `<tr class="click" data-href="#/admin/requests/${r.id}">
            <td><b>${r.id}</b>${r.emergency ? '<small style="color:var(--bad)">เร่งด่วน</small>' : ''}<small>ส่ง ${fmt.date(r.createdAt)}</small></td>
            <td><b>${fmt.date(r.startAt)}</b><small>${fmt.time(r.startAt)} – ${fmt.when(r.endAt)}</small>${r.overnight ? '<small>ค้างคืน</small>' : ''}</td>
            <td><b>${esc(S.destName(r))}</b><small>${esc(r.purpose)}</small><small style="color:var(--gold-700)">${esc(S.catName(r))}</small></td>
            <td>${esc(r.requester.name)}<small>${esc(r.requester.dept || '')}</small></td>
            <td>${S.passengers(r)} คน<small>ครู ${r.teachers} · นร. ${r.students}</small></td>
            <td>${(r.assignments || []).map(a => `${esc(C.vName(a.vehicleId))}<small>${esc(C.dName(a.driverId))}</small>`).join('') || '<small>—</small>'}</td>
            <td>${C.statusPill(r)}</td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('ไม่มีรายการ', 'clipboard')}</td></tr>`}</tbody>
        </table></div></div>`,
      mount(root) {
        root.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; });
        $('#q', root).addEventListener('input', UI.debounce(e => { location.hash = qs({ q: e.target.value }); }, 450));
        $('#m', root).addEventListener('change', e => { location.hash = qs({ m: e.target.value }); });
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
      const c = r.startAt ? S.vehicleConflicts(v.id, r.startAt, r.endAt, r.id) : [];
      const a = sel.get(v.id) || {};
      const busy = c.length > 0;
      const dId = a.driverId || v.driverId || '';
      const extra = !S.PASSENGER_KINDS.includes(v.kind) && !sel.has(v.id);
      return `<div class="av-row ${sel.has(v.id) ? 'on' : ''} ${busy && !sel.has(v.id) ? 'busy' : ''} ${extra ? 'extra' : ''}" data-v="${v.id}" ${extra ? 'hidden' : ''}>
        <input type="checkbox" ${sel.has(v.id) ? 'checked' : ''} aria-label="เลือก ${esc(v.name)}">
        <div><b>${icon(kindIcon(v.kind))} ${esc(v.name)}</b><small>${esc(v.plate)} · <b style="display:inline">${v.seats}</b> ที่นั่ง</small>${busy ? `<small class="bad">${icon('alert')} ${c.map(x => x.maint ? esc(x.dest) : `ไม่ว่าง: ${x.id} ${esc(S.destName(x))}`).join(', ')}</small>` : '<small style="color:var(--ok)">ว่างในช่วงเวลานี้</small>'}</div>
        <select data-drv aria-label="คนขับ"><option value="">— เลือกคนขับ —</option>${S.db.drivers.filter(d => d.active !== false).map(d => { const dc = r.startAt ? S.driverConflicts(d.id, r.startAt, r.endAt, r.id) : []; return `<option value="${d.id}" ${d.id === dId ? 'selected' : ''}>${esc(d.name)}${dc.length ? ' (ติดงาน ' + dc.map(x => x.id).join(',') + ')' : ''}</option>`; }).join('')}</select>
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

  // ═════════ รายละเอียดคำขอ (แอดมิน) ═════════
  Pages.adminRequest = ({ params }) => {
    const r = S.request(params.id);
    if (!r) return { layout: 'admin', html: S.needHistory() ? histNote(true) : UI.empty('ไม่พบคำขอนี้') };   // คำขอเก่า → โหลดย้อนหลังก่อน
    const canDecide = ['pending', 'revise'].includes(r.status);
    const canReassign = ['approved', 'ontrip'].includes(r.status);
    const exp = r.expenses || [];
    const expTotal = exp.reduce((s, e) => s + (+e.amount || 0), 0);
    return {
      layout: 'admin', live: false,
      html: `<a class="crumb" href="#/admin/requests">${icon('arrowL')} รายการคำขอ</a>
        ${head(`${r.id}${r.emergency ? ' · เร่งด่วน' : ''}`, esc(S.destName(r)), `ส่งเมื่อ ${fmt.dt(r.createdAt)} · ${esc(r.requester.name)}`,
          `${['pending', 'revise', 'approved'].includes(r.status) ? `<a class="btn btn-ghost btn-sm" href="#/request/${r.id}">${icon('edit')} แก้ไขข้อมูล</a>` : ''}${['pending', 'revise', 'approved'].includes(r.status) && r.assignments.every(a => a.status === 'assigned') ? `<button class="btn btn-ghost btn-sm" id="aCancel">${icon('xCircle')} ยกเลิก</button>` : ''}${r.status === 'returned' ? `<button class="btn btn-ok btn-sm" id="aClose">${icon('check')} ปิดงาน</button>` : ''}${r.status === 'closed' ? `<button class="btn btn-ghost btn-sm" id="aReopen">${icon('refresh')} เปิดงานอีกครั้ง</button>` : ''}`)}
        <div style="margin-bottom:18px">${Pages._decisionBox(r)}</div>
        ${canDecide || canReassign ? `
        <div class="req-top">${Pages._requestInfo(r)}</div>
        <div class="card" style="margin-bottom:18px;border-color:var(--navy);box-shadow:0 0 0 4px var(--navy-50)">
          <div class="card-head"><h3>${icon(canDecide ? 'clipboard' : 'refresh')} ${canDecide ? 'พิจารณาคำขอ' : 'ปรับรถ / คนขับ'}</h3><span class="hint">${fmt.range(r.startAt, r.endAt)} · ผู้เดินทาง ${S.passengers(r)} คน</span></div>
          ${canDecide ? `<div class="note-box navy" style="margin-bottom:14px">${icon('paperclip')}<div>ตรวจบันทึกข้อความ (ลายเซ็นผู้อำนวยการ/ผู้รักษาราชการแทน · วันที่ · สถานที่ ตรงกับคำขอ) ${(r.attachments || []).map(a => UI.thumb(a, 'sm')).join(' ') || '<b style="color:var(--bad)">ไม่มีไฟล์แนบ</b>'}</div></div>` : ''}
          <div class="field" style="margin-bottom:14px"><label>${icon('flag')} หมวดงาน <span class="hint" style="font-weight:400">(แก้ได้ถ้าผู้ขอเลือกผิด)</span></label>${Pages._catPicker.html(r.category, r.categoryOther, 'dcat')}</div>
          <div class="label" style="margin-bottom:8px">เลือกรถ (เลือกได้หลายคัน) · คนขับ · หมายเหตุรายคัน</div>
          ${vehiclePickerHTML(r, r.assignments)}
          <div class="field" style="margin-top:14px"><label>${icon('mail')} หมายเหตุถึงผู้ขอใช้รถ ${canDecide ? '(จำเป็นเมื่อไม่อนุมัติ/ส่งกลับแก้ไข)' : ''}</label><textarea id="dNote" rows="3" placeholder="เช่น ขอให้มาถึงจุดนัดก่อนเวลา 15 นาที / รถตู้ 1 คันไม่พอ จัดรถบัสให้แทน">${esc(r.decision && r.decision.action === 'approve' ? r.decision.note : '')}</textarea></div>
          <div class="row" style="justify-content:flex-end;margin-top:14px">
            ${canDecide ? `<button class="btn btn-danger" data-dec="reject">${icon('xCircle')} ไม่อนุมัติ</button><button class="btn btn-warn" data-dec="revise">${icon('undo')} ส่งกลับให้แก้ไข</button><button class="btn btn-ok" data-dec="approve">${icon('checkCircle')} อนุมัติและมอบหมายรถ</button>` : `<button class="btn btn-primary" data-dec="approve">${icon('check')} บันทึกการเปลี่ยนแปลง</button>`}
          </div>
        </div>` : ''}
        <div class="detail-grid ${canDecide || canReassign ? 'side-only' : ''}">
          ${canDecide || canReassign ? '' : Pages._requestInfo(r)}
          <div class="stack" style="gap:18px">
            ${(r.assignments || []).length ? `<div class="card"><div class="card-head"><h3>${icon('van')} สถานะการเดินทาง</h3></div>
              ${C.assignList(r)}
              <div class="stack" style="margin-top:12px">${r.assignments.map((a, i) => ['approved', 'ontrip', 'returned', 'closed'].includes(r.status) ? `<div class="row" style="justify-content:flex-end"><small class="muted" style="margin-right:auto">${esc(C.vName(a.vehicleId))}</small>
                ${a.status === 'assigned' ? `<button class="btn btn-primary btn-xs" data-go="ontrip" data-i="${i}">${icon('navigation')} ออกเดินทาง</button>` : ''}
                ${a.status === 'ontrip' ? `<button class="btn btn-ok btn-xs" data-go="returned" data-i="${i}">${icon('home')} กลับถึงแล้ว</button>` : ''}
                ${a.status !== 'assigned' && r.status !== 'closed' ? `<button class="btn btn-ghost btn-xs" data-undo="${i}">${icon('undo')} ย้อนสถานะ</button>` : ''}
                <button class="btn btn-ghost btn-xs" data-odo="${i}">${icon('gauge')} เลขไมล์</button></div>` : '').join('')}</div>
            </div>` : ''}
            ${['ontrip', 'returned', 'closed'].includes(r.status) || exp.length ? `<div class="card"><div class="card-head"><h3>${icon('fuel')} ค่าน้ำมัน / ค่าใช้จ่าย</h3><button class="btn btn-gold btn-sm" id="addExp">${icon('plus')} เพิ่ม</button></div>
              <div class="stack">${exp.map(e => `<div class="exp-row"><span class="ei">${icon(e.type === 'fuel' ? 'fuel' : 'coins')}</span><div><b>${S.EXPENSE[e.type]} · ${esc(C.vName(e.vehicleId))}</b><small>${fmt.date(e.date)}${e.station ? ' · ' + esc(e.station) : ''}${e.liters ? ` · ${e.liters} ล. × ${e.pricePerL} บ.` : ''}${e.odo ? ` · ไมล์ ${fmt.num(e.odo)}` : ''} · ${S.PAY[e.pay] || ''} · โดย ${esc(e.byName || e.by)}</small>${(e.photos || []).length ? `<div class="thumbs" style="margin-top:6px">${e.photos.map(p => UI.thumb(p, 'sm')).join('')}</div>` : ''}</div><span class="money">${fmt.money(e.amount)} ฿</span><div class="row" style="gap:4px"><button class="icon-btn sm" data-eexp="${e.id}" aria-label="แก้ไข">${icon('edit')}</button><button class="icon-btn sm" data-dexp="${e.id}" aria-label="ลบ">${icon('trash')}</button></div></div>`).join('') || UI.empty('ยังไม่มีการบันทึกค่าใช้จ่าย', 'fuel')}</div>
              ${exp.length ? `<div class="row between" style="margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--navy-50)"><b>รวม</b><span class="money">${fmt.money(expTotal)} บาท</span></div>` : ''}
            </div>` : ''}
            <div class="card"><div class="card-head"><h3>${icon('activity')} ความเคลื่อนไหว</h3></div>${C.history(r)}</div>
          </div>
        </div>`,
      mount(root) {
        const P = (canDecide || canReassign) ? bindVehiclePicker(root, () => S.passengers(r)) : null;
        Pages._catPicker.bind(root, 'dcat');
        root.addEventListener('click', async e => {
          const dec = e.target.closest('[data-dec]');
          if (dec) {
            const action = dec.dataset.dec, note = $('#dNote', root).value.trim();
            const assignments = P ? P.read() : [];
            const category = (root.querySelector('[name=dcat]:checked') || {}).value || '', categoryOther = (root.querySelector('[name=dcatOther]') || {}).value || '';
            if (action === 'approve') {
              if (!assignments.length) return UI.toast('กรุณาเลือกรถอย่างน้อย 1 คัน', 'error');
              const miss = assignments.filter(a => !a.driverId).length;
              const conf = assignments.flatMap(a => S.vehicleConflicts(a.vehicleId, r.startAt, r.endAt, r.id));
              const dconf = assignments.flatMap(a => a.driverId ? S.driverConflicts(a.driverId, r.startAt, r.endAt, r.id) : []);
              const warn = [miss ? `ยังไม่ระบุคนขับ ${miss} คัน` : '', conf.length ? 'มีรถที่ชนเวลากับงานอื่น/ซ่อมบำรุง' : '', dconf.length ? 'มีคนขับที่ติดงานอื่นในช่วงเวลานี้' : '', S.seatsOf(assignments) < S.passengers(r) ? 'ที่นั่งรวมน้อยกว่าจำนวนผู้เดินทาง' : ''].filter(Boolean);
              if (warn.length && !(await UI.confirm(`<b>โปรดตรวจสอบ:</b><br>• ${warn.join('<br>• ')}<br><br>ต้องการบันทึกต่อหรือไม่?`, { title: 'คำเตือน', ok: 'บันทึกต่อ' }))) return;
            } else if (!note) return UI.toast(action === 'reject' ? 'กรุณาระบุเหตุผลที่ไม่อนุมัติในช่องหมายเหตุ' : 'กรุณาระบุสิ่งที่ต้องการให้แก้ไขในช่องหมายเหตุ', 'error');
            return UI.busy(dec, () => S.decide(r.id, { action, note, assignments, category, categoryOther })).then(() => { UI.toast(action === 'approve' ? (canDecide ? 'อนุมัติและมอบหมายรถแล้ว' : 'บันทึกการเปลี่ยนแปลงแล้ว') : action === 'reject' ? 'บันทึกไม่อนุมัติแล้ว' : 'ส่งกลับให้ผู้ขอแก้ไขแล้ว'); App.render(); }).catch(() => {});
          }
          const go = e.target.closest('[data-go]'); if (go) { await Pages._tripAction(S.request(r.id), +go.dataset.i, go.dataset.go); return App.render(); }
          const un = e.target.closest('[data-undo]'); if (un) { if (await UI.confirm('ย้อนสถานะรถคันนี้กลับเป็น "รอออกเดินทาง"?', { title: 'ย้อนสถานะ' })) S.tripStatus(r.id, +un.dataset.undo, 'assigned').then(App.render).catch(err => UI.toast(err.message, 'error')); return; }
          const od = e.target.closest('[data-odo]');
          if (od) { const i = +od.dataset.odo, a = S.request(r.id).assignments[i]; const res = await UI.modal({ title: `${icon('gauge')} เลขไมล์ · ${esc(C.vName(a.vehicleId))}`, body: `<div class="grid2"><div class="field"><label>ตอนออก</label><input id="o1" type="number" value="${a.odoStart ?? Pages._lastOdo(a.vehicleId) ?? ''}"></div><div class="field"><label>ตอนกลับ</label><input id="o2" type="number" value="${a.odoEnd ?? ''}"></div></div>`, actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { await S.setOdo(r.id, i, { odoStart: el.querySelector('#o1').value, odoEnd: el.querySelector('#o2').value }); return true; } }] }); if (res) { UI.toast('บันทึกเลขไมล์แล้ว'); App.render(); } return; }
          if (e.target.closest('#addExp')) { const res = await Pages._expenseModal(S.request(r.id), (r.assignments[0] || {}).vehicleId); if (res) App.render(); return; }
          const ee = e.target.closest('[data-eexp]'); if (ee) { const rr = S.request(r.id); const res = await Pages._expenseModal(rr, null, rr.expenses.find(x => x.id === ee.dataset.eexp)); if (res) App.render(); return; }
          const de = e.target.closest('[data-dexp]'); if (de) { if (await UI.confirm('ลบรายการค่าใช้จ่ายนี้?', { danger: true, ok: 'ลบ' })) S.removeExpense(r.id, de.dataset.dexp).then(App.render); return; }
          if (e.target.closest('#aClose')) { const res = await UI.confirm('ปิดงานคำขอนี้? (ตรวจสอบเลขไมล์และค่าใช้จ่ายให้ครบก่อน)', { title: 'ปิดงาน', ok: 'ปิดงาน', input: { label: 'หมายเหตุ (ถ้ามี)' } }); if (res) S.closeRequest(r.id, res.value).then(() => { UI.toast('ปิดงานแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error')); }
          if (e.target.closest('#aReopen')) S.reopenRequest(r.id).then(App.render);
          if (e.target.closest('#aCancel')) { const res = await UI.confirm('ยกเลิกคำขอนี้? ระบบจะแจ้งผู้ขอในเว็บ', { title: 'ยกเลิกคำขอ', ok: 'ยกเลิกคำขอ', danger: true, input: { label: 'เหตุผล', required: true } }); if (res) S.cancelRequest(r.id, res.value).then(() => { UI.toast('ยกเลิกแล้ว'); App.render(); }).catch(err => UI.toast(err.message, 'error')); }
        });
      }
    };
  };

  // ═════════ บันทึกคำขอเร่งด่วน (แอดมิน) ═════════
  Pages.adminNew = () => {
    const users = S.db.users.filter(u => (u.roles || []).includes('teacher') && u.active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
    return {
      layout: 'admin', live: false,
      html: `${head('กรณีเร่งด่วน', 'บันทึกคำขอใช้รถโดยแอดมิน', 'ไม่ติดกฎขอล่วงหน้า · อนุมัติและมอบหมายรถได้ทันที')}
        <form id="ef" novalidate>
          <div class="form-section"><h3><span class="n">0</span>ผู้ขอใช้รถ</h3>
            <div class="grid2">
              <div class="field"><label>เลือกจากรายชื่อ</label><select name="reqEmail" id="reqEmail"><option value="">— พิมพ์ชื่อเอง —</option>${users.map(u => `<option value="${esc(u.email)}">${esc(u.name || u.email)} · ${esc(u.dept || '')}</option>`).join('')}</select></div>
              <div class="field"><label>ชื่อผู้ขอ <b class="req">*</b></label><input name="reqName" id="reqName"></div>
              <div class="field"><label>ฝ่าย / กลุ่มสาระ</label><input name="reqDept" id="reqDept"></div>
              <div class="field"><label>เบอร์โทร</label><input name="reqPhone" id="reqPhone"></div>
            </div></div>
          ${Pages._requestForm.html(null, { admin: true })}
          <div class="form-section"><h3><span class="n">7</span>มอบหมายรถและคนขับ <span class="hint" style="font-weight:400">(ไม่เลือก = บันทึกเป็น "รอตรวจสอบ")</span></h3>
            <div id="pickBox"><p class="hint">ระบุวันเวลาก่อน แล้วระบบจะแสดงรถที่ว่าง</p></div>
            <div class="field" style="margin-top:14px"><label>หมายเหตุถึงผู้ขอใช้รถ</label><textarea name="dNote" rows="2"></textarea></div></div>
          <div class="form-actions"><a class="btn btn-ghost" href="#/admin">ยกเลิก</a><button class="btn btn-primary" type="submit">${icon('check')} บันทึกคำขอ</button></div>
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
          $('#pickBox', root).innerHTML = vehiclePickerHTML({ id: '__new', startAt: new Date(a).toISOString(), endAt: new Date(b).toISOString() }, keep);
          P = bindVehiclePicker(root, pax);
        };
        form.addEventListener('change', e => { if (/startAt|endAt/.test(e.target.name)) setTimeout(drawPick, 10); if (/teachers|students|others/.test(e.target.name) && P) P.meter(); });
        $('#reqEmail', root).addEventListener('change', e => { const u = S.user(e.target.value); if (u) { form.reqName.value = u.name || ''; form.reqDept.value = u.dept || ''; form.reqPhone.value = u.phone || ''; if (!form.contactPhone.value) form.contactPhone.value = u.phone || ''; } });
        form.addEventListener('submit', e => {
          e.preventDefault();
          let data; try { data = F.read(); } catch (err) { return UI.toast(err.message, 'error'); }
          const f = UI.formData(form);
          if (!f.reqName.trim()) return UI.toast('กรุณาระบุชื่อผู้ขอใช้รถ', 'error');
          UI.busy(form.querySelector('[type=submit]'), () => S.createEmergency(data, { requester: { email: f.reqEmail, name: f.reqName, dept: f.reqDept, phone: f.reqPhone }, assignments: P ? P.read() : [], note: f.dNote }))
            .then(r => { UI.toast(`บันทึก ${r.id} แล้ว`); App.go(`#/admin/requests/${r.id}`); }).catch(() => {});
        });
      }
    };
  };

  // ═════════ ข้อมูลรถ ═════════
  Pages.adminVehicles = () => {
    const vs = S.db.vehicles.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const exp = p => { if (!p) return ''; const xs = [['พ.ร.บ.', p.actExpiry], ['ภาษี', p.taxExpiry], ['ประกัน', p.insurance && p.insurance.expiry]].filter(x => x[1]).map(([l, d]) => { const n = daysTo(d); return n <= 30 ? `<span class="tag ${n <= 7 ? 'red' : ''}">${l} ${n < 0 ? 'หมดแล้ว' : n + ' วัน'}</span>` : ''; }).join(''); return xs; };
    return {
      layout: 'admin',
      html: `${head('ข้อมูลหลัก', 'ข้อมูลรถ', 'แก้ไขข้อมูลที่เผยแพร่ให้ครูดู และข้อมูลเชิงลึก (พ.ร.บ. ประกัน ประวัติซ่อม) ที่ไม่เผยแพร่', `<a class="btn btn-primary btn-sm" href="#/admin/vehicles/new">${icon('plus')} เพิ่มรถ</a>`)}
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>รหัส</th><th>รถ</th><th>ที่นั่ง</th><th>คนขับที่รับผิดชอบ</th><th>สถานะตอนนี้</th><th>เอกสารใกล้หมดอายุ</th><th>ซ่อม (ครั้ง)</th></tr></thead>
          <tbody>${vs.map(v => { const p = S.db.vprivate[v.id]; return `<tr class="click" data-href="#/admin/vehicles/${v.id}"><td><b>${v.no || '-'}</b></td><td><b>${icon(kindIcon(v.kind))} ${esc(v.name)}</b><small>${esc(v.plate)} · ${esc(v.brand || '')} ${esc(v.model || '')}</small></td><td>${v.seats}</td><td>${esc(C.dName(v.driverId))}<small>${esc(C.dPhone(v.driverId))}</small></td><td>${pill(S.vehicleState(v))}</td><td>${exp(p) || '<small>—</small>'}</td><td>${p ? (p.repairs || []).length : 0}</td></tr>`; }).join('')}</tbody>
        </table></div></div>`,
      mount(root) { root.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; }); }
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
          <div class="field"><label>คนขับที่รับผิดชอบ</label><select name="driverId"><option value="">— ไม่ระบุ —</option>${S.db.drivers.map(d => `<option value="${d.id}" ${d.id === v.driverId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
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
            <div class="field"><label>ภาษีรถ หมดอายุ</label><input type="date" name="taxExpiry" value="${esc(p.taxExpiry || '')}">${p.taxExpiry ? `<span class="hint">อีก ${daysTo(p.taxExpiry)} วัน</span>` : ''}</div>
            <div class="field"><label>ประกันภัย หมดอายุ</label><input type="date" name="insExpiry" value="${esc(p.insurance.expiry || '')}">${p.insurance.expiry ? `<span class="hint">อีก ${daysTo(p.insurance.expiry)} วัน</span>` : ''}</div>
            <div class="field"><label>บริษัทประกัน</label><input name="insCompany" value="${esc(p.insurance.company || '')}"></div>
            <div class="field"><label>ชั้นประกัน</label><input name="insCls" value="${esc(p.insurance.cls || '')}"></div>
            <div class="field"><label>เลขกรมธรรม์</label><input name="insNo" value="${esc(p.insurance.policyNo || '')}"></div>
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
        <div class="form-section"><h3>${icon('calendar')} แผนบำรุงรักษาตามระยะ</h3>
          <div class="stack" id="mpList">${p.maintenancePlan.map(m => `<div class="exp-row"><span class="ei">${icon('refresh')}</span><div><b>${esc(m.item)}</b><small>ทุก ${m.everyKm ? fmt.num(m.everyKm) + ' กม.' : ''}${m.everyKm && m.everyMonths ? ' หรือ ' : ''}${m.everyMonths ? m.everyMonths + ' เดือน' : ''} · ครั้งล่าสุด ${m.lastDate ? fmt.date(m.lastDate) : '-'}${m.lastKm ? ` (${fmt.num(m.lastKm)} กม.)` : ''}</small></div><span>${m.lastDate && m.everyMonths ? (() => { const due = new Date(m.lastDate); due.setMonth(due.getMonth() + +m.everyMonths); const d = daysTo(due); return `<span class="pill tone-${d < 0 ? 'bad' : d < 30 ? 'warn' : 'ok'}">${d < 0 ? 'เลยกำหนด' : `อีก ${d} วัน`}</span>`; })() : ''}</span><div class="row" style="gap:4px"><button type="button" class="icon-btn sm" data-emp="${m.id}">${icon('edit')}</button><button type="button" class="icon-btn sm" data-dmp="${m.id}">${icon('trash')}</button></div></div>`).join('') || UI.empty('ยังไม่มีแผนบำรุงรักษา', 'calendar')}</div>
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
          const save = () => { const f = UI.formData($('#pf', root)); Object.assign(p, { actExpiry: f.actExpiry, taxExpiry: f.taxExpiry, chassisNo: f.chassisNo, engineNo: f.engineNo, fuelType: f.fuelType, fuelCard: f.fuelCard, notes: f.notes, docs: getDocs(), insurance: { company: f.insCompany, cls: f.insCls, policyNo: f.insNo, expiry: f.insExpiry, phone: f.insPhone } }); return S.saveVehiclePrivate(v.id, p); };
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
            <td><div class="row" style="gap:10px">${UI.avatar(d.name)}<div><b>${esc(d.name)}</b><small>${esc(d.phone || '-')}${d.active === false ? ' · <span style="color:var(--bad)">พักงาน</span>' : ''}</small></div></div></td>
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
                <div class="field full"><label>ผูกกับพนักงานขับรถ (ถ้าเป็นคนขับ)</label><select name="driverId"><option value="">— ไม่ผูก —</option>${S.db.drivers.map(d => `<option value="${d.id}" ${d.email === u.email ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
                <div class="field full"><label class="check" style="width:max-content"><input type="checkbox" name="active" ${u.active !== false ? 'checked' : ''}> เปิดใช้งานบัญชี</label></div></form>`,
              actions: [{ label: 'ลบผู้ใช้', kind: 'btn-danger', onClick: async () => { if (!(await UI.confirm('ลบผู้ใช้นี้ออกจากระบบ?', { danger: true, ok: 'ลบ' }))) return false; await S.removeUser(u.email); return 'del'; } }, { label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { const f = UI.formData(el.querySelector('#uF')); const roles = sup ? f.roles : [...new Set([...(f.roles || []).filter(r => r !== 'admin' && r !== 'superadmin'), ...(u.roles || []).filter(r => r === 'admin' || r === 'superadmin')])]; await S.saveUser({ ...u, name: f.name, dept: f.dept, phone: f.phone, roles, active: f.active, driverId: f.driverId }); return true; } }] });
            if (res) { UI.toast(res === 'del' ? 'ลบผู้ใช้แล้ว' : 'บันทึกแล้ว'); App.render(); }
          }
        });
      }
    };
  };

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
  // แถบแจ้งระหว่างโหลดข้อมูลย้อนหลัง (เก่ากว่า ~13 เดือน — ดู Store.needHistory)
  const histNote = loading => loading ? `<div class="note-box" style="margin-bottom:14px">${icon('clock')}<div>กำลังโหลดข้อมูลย้อนหลัง… ตัวเลขจะครบเมื่อโหลดเสร็จ</div></div>` : '';

  // ═════════ ค่าน้ำมัน / ค่าใช้จ่าย ═════════
  Pages.adminExpenses = ({ query }) => {
    const per = periodOf(query), vf = query.v || '', tf = query.t || '', cf = query.c || '';
    const hist = S.needHistory(per.from);
    const rows = [];
    S.db.requests.forEach(r => (r.expenses || []).forEach(e => { if (inPer(e.date + 'T12:00:00', per) && (!vf || e.vehicleId === vf) && (!tf || e.type === tf) && (!cf || (r.category || '') === (cf === 'none' ? '' : cf))) rows.push({ r, e }); }));
    rows.sort((a, b) => b.e.date.localeCompare(a.e.date));
    const by = k => rows.filter(x => x.e.type === k).reduce((s, x) => s + x.e.amount, 0);
    const total = rows.reduce((s, x) => s + x.e.amount, 0), liters = rows.reduce((s, x) => s + (+x.e.liters || 0), 0);
    const qs = o => '#/admin/expenses?' + new URLSearchParams({ ...query, ...o });
    return {
      layout: 'admin',
      html: `${head('รายงาน', 'ค่าน้ำมัน / ค่าใช้จ่าย', per.label, `<button class="btn btn-ghost btn-sm" id="xls">${icon('download')} Excel</button>`)}
        ${periodBar('#/admin/expenses', per, query)}${histNote(hist)}
        <div class="toolbar"><select class="input" id="vf" style="width:auto"><option value="">รถทุกคัน</option>${S.db.vehicles.map(v => `<option value="${v.id}" ${v.id === vf ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
          <select class="input" id="tf" style="width:auto"><option value="">ทุกประเภท</option>${Object.entries(S.EXPENSE).map(([k, l]) => `<option value="${k}" ${k === tf ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="input" id="cf" style="width:auto"><option value="">ทุกหมวดงาน</option>${S.categories(true).map(c => `<option value="${c.id}" ${c.id === cf ? 'selected' : ''}>${esc(c.id === 'other' ? 'อื่น ๆ' : c.name)}</option>`).join('')}<option value="none" ${cf === 'none' ? 'selected' : ''}>ไม่ระบุหมวด</option></select></div>
        <div class="kpis" style="margin-bottom:16px">
          <div class="kpi" style="--kb:var(--navy-50)"><span class="k-ic">${icon('coins')}</span><b class="num">${fmt.money(total)}<em>฿</em></b><span class="l">รวมทั้งหมด (${rows.length} รายการ)</span></div>
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('fuel')}</span><b class="num">${fmt.money(by('fuel'))}<em>฿</em></b><span class="l">ค่าน้ำมัน · ${fmt.num(liters, 1)} ลิตร</span></div>
          <div class="kpi"><span class="k-ic">${icon('route')}</span><b class="num">${fmt.money(by('toll'))}<em>฿</em></b><span class="l">ค่าทางด่วน</span></div>
          <div class="kpi"><span class="k-ic">${icon('coins')}</span><b class="num">${fmt.money(by('parking') + by('other'))}<em>฿</em></b><span class="l">ที่จอดรถ + อื่น ๆ</span></div>
        </div>
        <div class="card" style="padding:8px"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>วันที่</th><th>ประเภท</th><th>รถ</th><th>คำขอ</th><th>รายละเอียด</th><th>บิล</th><th class="r">ยอดเงิน (฿)</th></tr></thead>
          <tbody>${rows.map(({ r, e }) => `<tr><td>${fmt.date(e.date)}</td><td>${S.EXPENSE[e.type]}</td><td>${esc(C.vName(e.vehicleId))}</td><td><a class="link" href="#/admin/requests/${r.id}">${r.id}</a><small>${esc(S.destName(r))}</small><small style="color:var(--gold-700)">${esc(S.catName(r))}</small></td><td>${esc(e.station || '')}<small>${e.liters ? `${e.liters} ล. × ${e.pricePerL} ฿` : ''}${e.odo ? ` · ไมล์ ${fmt.num(e.odo)}` : ''} · ${S.PAY[e.pay] || ''}</small></td><td>${(e.photos || []).map(p => UI.thumb(p, 'sm')).join('') || '<small>—</small>'}</td><td class="r"><b>${fmt.money(e.amount)}</b></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('ไม่มีรายการในช่วงนี้', 'fuel')}</td></tr>`}</tbody>
          ${rows.length ? `<tfoot><tr><td colspan="6">รวม</td><td class="r">${fmt.money(total)}</td></tr></tfoot>` : ''}
        </table></div></div>`,
      mount(root) {
        bindPeriod(root, '#/admin/expenses', query);
        $('#vf', root).addEventListener('change', e => { location.hash = qs({ v: e.target.value }); });
        $('#tf', root).addEventListener('change', e => { location.hash = qs({ t: e.target.value }); });
        $('#cf', root).addEventListener('change', e => { location.hash = qs({ c: e.target.value }); });
        $('#xls', root).addEventListener('click', () => UI.exportSheets(`ค่าใช้จ่าย-${per.label}`, [{ name: 'ค่าใช้จ่าย', head: ['วันที่', 'ประเภท', 'รถ', 'ทะเบียน', 'เลขที่คำขอ', 'หมวดงาน', 'ปลายทาง', 'ปั๊ม/สถานที่', 'ลิตร', 'ราคา/ลิตร', 'เลขไมล์', 'วิธีชำระ', 'ยอดเงิน', 'บันทึกโดย'], rows: rows.map(({ r, e }) => [e.date, S.EXPENSE[e.type], C.vName(e.vehicleId), C.vPlate(e.vehicleId), r.id, S.catName(r), S.destName(r), e.station, e.liters, e.pricePerL, e.odo, S.PAY[e.pay], e.amount, e.byName || e.by]) }]));
      }
    };
  };

  // ═════════ ประเมินคนขับ ═════════
  Pages.adminRatings = ({ query }) => {
    const per = periodOf(query), df = query.d || '';
    const hist = S.needHistory(per.from);
    const list = S.db.ratings.filter(x => inPer(x.at, per) && (!df || x.driverId === df)).sort((a, b) => b.at.localeCompare(a.at));
    const avgOf = (arr, k) => arr.length ? arr.reduce((s, x) => s + (k ? x.scores[k] : Object.values(x.scores).reduce((a, b) => a + b, 0) / 4), 0) / arr.length : 0;
    const drivers = S.db.drivers.map(d => ({ d, rs: list.filter(x => x.driverId === d.id) })).filter(x => x.rs.length || !df).sort((a, b) => avgOf(b.rs) - avgOf(a.rs));
    return {
      layout: 'admin',
      html: `${head('รายงาน', 'ผลการประเมินคนขับ', `${per.label} · ${list.length} ครั้ง · ไม่แสดงชื่อผู้ประเมิน`, `<select class="input" id="df" style="width:auto"><option value="">คนขับทุกคน</option>${S.db.drivers.map(d => `<option value="${d.id}" ${d.id === df ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`)}
        ${periodBar('#/admin/ratings', per, query)}${histNote(hist)}
        <div class="kpis" style="margin-bottom:16px">${Object.entries(S.RATE_KEYS).map(([k, l]) => `<div class="kpi" style="--kb:#fef3c7;--kc:#d97706"><span class="k-ic">${icon('star')}</span><b class="num">${avgOf(list, k).toFixed(2)}<em>/ 5</em></b><span class="l">${l}</span></div>`).join('')}</div>
        <div class="split">
          <div class="card"><div class="card-head"><h3>${icon('users')} คะแนนรายคน</h3></div><div class="tbl-wrap"><table class="tbl" style="min-width:560px"><thead><tr><th>คนขับ</th><th>ครั้ง</th>${Object.values(S.RATE_KEYS).map(l => `<th>${l.split('และ')[0]}</th>`).join('')}<th>เฉลี่ย</th></tr></thead>
            <tbody>${drivers.map(({ d, rs }) => `<tr><td><b>${esc(d.name)}</b></td><td>${rs.length}</td>${Object.keys(S.RATE_KEYS).map(k => `<td>${rs.length ? avgOf(rs, k).toFixed(2) : '-'}</td>`).join('')}<td>${rs.length ? `${C.stars(avgOf(rs))} <small>${avgOf(rs).toFixed(2)}</small>` : '-'}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card"><div class="card-head"><h3>${icon('mail')} ความคิดเห็น</h3></div><div class="stack">${list.filter(x => x.comment).slice(0, 40).map(x => `<div class="assign"><div class="assign-top"><b>${esc(C.dName(x.driverId))}</b>${C.stars(avgOf([x]))}</div><p style="font-size:.92rem">“${esc(x.comment)}”</p><small class="muted">${fmt.date(x.at)} · ${esc(C.vName(x.vehicleId))}</small></div>`).join('') || UI.empty('ยังไม่มีความคิดเห็น', 'mail')}</div></div>
        </div>`,
      mount(root) { bindPeriod(root, '#/admin/ratings', query); $('#df', root).addEventListener('change', e => { location.hash = '#/admin/ratings?' + new URLSearchParams({ ...query, d: e.target.value }); }); }
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
      km: sum(asg, x => x.km), pax: sum(done, r => S.passengers(r)), stu: sum(done, r => r.students), tea: sum(done, r => r.teachers),
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
    const tbl = (h, rows, foot) => `<div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr>${h.map((x, i) => `<th class="${i ? 'r' : ''}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}">${UI.empty('ไม่มีข้อมูล')}</td></tr>`}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
    const data = { byMonth, byVehicle, byDriver, byDept, K, byProv };
    return {
      layout: 'admin',
      html: `${head('รายงาน', 'สถิติการใช้รถ', `${per.label} · ${fmt.date(per.from)} – ${fmt.date(per.to > new Date(2900, 0) ? new Date() : per.to)}`, `<button class="btn btn-ghost btn-sm no-print" id="pdf">${icon('printer')} PDF / พิมพ์</button><button class="btn btn-primary btn-sm no-print" id="xls">${icon('download')} Excel ทุกตาราง</button>`)}
        ${periodBar('#/admin/stats', per, query)}${histNote(hist)}
        <div class="kpis">
          <div class="kpi"><span class="k-ic">${icon('clipboard')}</span><b class="num">${K.req}<em>คำขอ</em></b><span class="l">อนุมัติ ${K.ok} · ไม่อนุมัติ ${K.rej} · ยกเลิก ${K.cancel}</span></div>
          <div class="kpi" style="--kb:var(--gold-50);--kc:var(--gold-700)"><span class="k-ic">${icon('gauge')}</span><b class="num">${fmt.num(K.km)}<em>กม.</em></b><span class="l">ระยะทางรวม · ${asg.length} เที่ยวรถ</span></div>
          <div class="kpi" style="--kb:#e0f2fe;--kc:#0369a1"><span class="k-ic">${icon('users')}</span><b class="num">${fmt.num(K.pax)}<em>คน</em></b><span class="l">ครู ${fmt.num(K.tea)} · นักเรียน ${fmt.num(K.stu)}</span></div>
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
        <div class="grid cols-3" style="margin-top:18px">
          <div class="card"><div class="card-head"><h3>${icon('pin')} ปลายทางยอดนิยม</h3></div>${tbl(['สถานที่', 'ครั้ง'], byDest.map(x => [`${esc(x.k)}<small>${esc(x.prov)}</small>`, x.n]))}</div>
          <div class="card"><div class="card-head"><h3>${icon('map')} จังหวัด</h3></div><div class="chart-box sm"><canvas id="chProv"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>${icon('flag')} วัตถุประสงค์</h3></div>${tbl(['วัตถุประสงค์', 'ครั้ง'], byPurpose.map(x => [esc(x.k), x.n]))}</div>
        </div>`,
      mount(root) {
        bindPeriod(root, '#/admin/stats', query);
        $('#pdf', root).addEventListener('click', () => window.print());
        $('#xls', root).addEventListener('click', () => UI.exportSheets(`สถิติการใช้รถ-${per.label}`, [
          { name: 'สรุป', head: ['รายการ', 'ค่า'], rows: [['ช่วงเวลา', per.label], ['คำขอทั้งหมด', K.req], ['อนุมัติ', K.ok], ['ไม่อนุมัติ', K.rej], ['ยกเลิก', K.cancel], ['ระยะทางรวม (กม.)', K.km], ['ผู้เดินทาง', K.pax], ['ครู', K.tea], ['นักเรียน', K.stu], ['ค่าน้ำมัน', K.fuel], ['ค่าใช้จ่ายอื่น', K.other], ['ค่าซ่อม', K.repair], ['น้ำมัน (ลิตร)', K.liters], ['คะแนนคนขับเฉลี่ย', +avgR(ratings).toFixed(2)]] },
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
          </div></div>
          <div class="form-section"><h3>${icon('flag')} หมวดงาน <span class="hint" style="font-weight:400">(ใช้ในแบบฟอร์มขอใช้รถและสถิติ · หมวดที่เคยใช้แล้วซ่อนได้แต่ลบไม่ได้)</span></h3>
            <div class="stack" id="catList">${cats.map((c, i) => { const n = S.db.requests.filter(r => r.category === c.id).length; return `<div class="cat-row ${c.active === false ? 'off' : ''}" data-ci2="${i}">
              <span class="ci">${icon(c.icon || 'info')}</span>
              <div><input type="text" data-ck="name" value="${esc(c.name)}" aria-label="ชื่อหมวด"><small class="hint">${c.fixed ? 'หมวดพิเศษ: ผู้ขอต้องพิมพ์ระบุเอง · ' : ''}ใช้แล้ว ${n} ครั้ง</small></div>
              <select data-ck="icon" aria-label="ไอคอน">${S.CAT_ICONS.map(ic => `<option value="${ic}" ${ic === c.icon ? 'selected' : ''}>ไอคอน: ${ic}</option>`).join('')}</select>
              <label class="check"><input type="checkbox" data-ck="active" ${c.active !== false ? 'checked' : ''}> แสดง</label>
              <div class="row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="icon-btn sm" data-cmv="${i}" data-dir="-1" aria-label="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}><span style="display:inline-flex;transform:rotate(180deg)">${icon('chev')}</span></button><button type="button" class="icon-btn sm" data-cmv="${i}" data-dir="1" aria-label="เลื่อนลง" ${i === cats.length - 1 ? 'disabled' : ''}>${icon('chev')}</button>${!n && !c.fixed ? `<button type="button" class="icon-btn sm" data-cdel="${i}" aria-label="ลบ">${icon('trash')}</button>` : ''}</div>
            </div>`; }).join('')}</div>
            <button type="button" class="btn btn-ghost btn-sm" id="addCat" style="margin-top:12px">${icon('plus')} เพิ่มหมวดงาน</button></div>
          <div class="form-section"><h3>${icon('pin')} ตำแหน่งโรงเรียน (จุดเริ่มต้นคำนวณระยะทาง)</h3><div class="grid3">
            <div class="field"><label>ละติจูด</label><input name="lat" type="number" step="any" value="${s.school.lat}"></div>
            <div class="field"><label>ลองจิจูด</label><input name="lng" type="number" step="any" value="${s.school.lng}"></div>
            <div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost" id="pinSchool">${icon('pin')} ${Maps.enabled ? 'ปักหมุดบนแผนที่' : 'ค้นหา/ตั้งค่า'}</button></div>
          </div><p class="hint">${icon('info')} ค่าเริ่มต้นเป็นพิกัดโดยประมาณ — กรุณาตรวจสอบและปักหมุดให้ตรงกับที่ตั้งโรงเรียนจริง</p></div>
          <div class="form-section"><h3>${icon('phone')} ข้อมูลติดต่อ (หน้า "ติดต่อเรา")</h3><div class="grid3">
            <div class="field"><label>โทรศัพท์</label><input name="contactPhone" value="${esc(s.contactPhone || '')}"></div>
            <div class="field"><label>LINE / ช่องทางอื่น</label><input name="contactLine" value="${esc(s.contactLine || '')}"></div>
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
        ${S.LOCAL ? `<div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('flask')} โหมดทดลอง</h3></div><p class="hint" style="margin-bottom:12px">ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ล้างแล้วจะสร้างข้อมูลตัวอย่างใหม่</p><button class="btn btn-danger btn-sm" data-reset>${icon('refresh')} ล้างข้อมูลตัวอย่าง</button></div>` : ''}`,
      mount(root) {
        const photoGetters = cm.map((c, i) => C.bindFilePicker(root, 'cph' + i, c.photo ? [c.photo] : [], { multiple: false }));
        const collect = () => {
          const f = UI.formData($('#sf', root));
          const committee = $$('[data-ci]', root).map(row => { const i = +row.dataset.ci; const o = { ...(cm[i] || { id: 'c' + Date.now() + i }) }; $$('[data-k]', row).forEach(el => { o[el.dataset.k] = el.dataset.k === 'level' ? +el.value : el.value; }); o.photo = (photoGetters[i] ? photoGetters[i]() : [])[0] || ''; return o; });
          const categories = $$('[data-ci2]', root).map((row, i) => { const c = { ...cats[+row.dataset.ci2] }; c.name = row.querySelector('[data-ck=name]').value.trim() || c.name; c.icon = row.querySelector('[data-ck=icon]').value; c.active = row.querySelector('[data-ck=active]').checked; c.order = i; return c; });
          return { schoolName: f.schoolName, schoolNameEn: f.schoolNameEn, division: f.division, unit: f.unit, leadDays: +f.leadDays || 0, school: { ...s.school, lat: +f.lat, lng: +f.lng }, contactPhone: f.contactPhone, contactLine: f.contactLine, contactRoom: f.contactRoom, contactNote: f.contactNote, committee, categories };
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
})();
