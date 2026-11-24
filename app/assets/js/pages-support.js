/* ═══════════════════════════════════════════════════════════
   ดูแลระบบ (เตรียมเปิดใช้จริง 1 ธ.ค. 2569)
   1) บันทึกข้อผิดพลาดอัตโนมัติ — ข้อผิดพลาดของหน้าเว็บ/ฐานข้อมูล ส่งเข้า errlog เงียบ ๆ ให้แอดมินดู
   2) แจ้งปัญหาการใช้งาน — ผู้ใช้เล่าปัญหา/ข้อเสนอแนะ แนบรูปหน้าจอได้ (เมนูผู้ใช้ → แจ้งปัญหา)
   3) วิธีใช้งาน (#/help) — คู่มือสั้น แยกครู / พนักงานขับรถ / แอดมิน
   4) หลังบ้าน → ดูแลระบบ (#/admin/support) — เรื่องที่แจ้ง · ข้อผิดพลาด · สำรองข้อมูล (Excel / JSON)
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, $, $$ } = UI;
  const S = Store;

  // ═════════ 1) จับข้อผิดพลาดอัตโนมัติ ═════════
  const IGNORE = /ResizeObserver|Script error\.?$|Non-Error promise rejection|AbortError|The play\(\) request/i;
  window.addEventListener('error', e => {
    if (!e || !e.message || IGNORE.test(e.message)) return;
    const f = String(e.filename || '').split('/').pop().split('?')[0];
    S.logError({ kind: 'js', msg: `${e.message}${f ? ` @ ${f}:${e.lineno}:${e.colno}` : ''}`, stack: e.error && e.error.stack });
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e && e.reason, msg = String((r && (r.message || r.code)) || r || '');
    if (!msg || IGNORE.test(msg)) return;
    S.logError({ kind: 'promise', msg, stack: r && r.stack });
  });

  // ═════════ 2) แจ้งปัญหาการใช้งาน ═════════
  const FB_TYPES = { bug: ['ปัญหาการใช้งาน', 'alert'], idea: ['ข้อเสนอแนะ', 'sparkles'], other: ['อื่น ๆ', 'info'] };
  Pages._feedback = () => {
    if (!S.me) return App.go('#/login');
    return UI.modal({
      title: `${icon('send')} แจ้งปัญหา / ข้อเสนอแนะ`, size: 'lg',
      body: `<form id="fbF" class="stack">
        <div class="exr-types fb-types">${Object.entries(FB_TYPES).map(([k, [l, ic]], i) => `<label class="exr-type"><input type="radio" name="type" value="${k}" ${!i ? 'checked' : ''}><span>${icon(ic)}${l}</span></label>`).join('')}</div>
        <div class="field"><label>เล่าให้ฟังหน่อย <b class="req">*</b></label><textarea name="text" rows="5" placeholder="เช่น กดบันทึกค่าใช้จ่ายแล้วขึ้นข้อความว่า… / อยากให้มี…"></textarea>
          <span class="hint">ยิ่งละเอียดยิ่งแก้ได้เร็ว: ทำอะไร กดปุ่มไหน แล้วเกิดอะไรขึ้น</span></div>
        ${C.filePicker('fbPh', [], { label: 'แนบรูปหน้าจอ (ถ้ามี)', multiple: true })}
        <p class="hint">${icon('info')} ระบบแนบหน้าที่เปิดอยู่และรุ่นอุปกรณ์ไปด้วย เพื่อช่วยตรวจสอบ</p>
      </form>`,
      onOpen(el) { el._ph = C.bindFilePicker(el, 'fbPh', [], { max: 3 }); },
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'ส่งเรื่อง', kind: 'btn-primary', icon: 'send', onClick: async el => {
        const f = UI.formData(el.querySelector('#fbF'));
        if (!String(f.text || '').trim()) { UI.toast('กรุณาเล่าปัญหา/ข้อเสนอแนะ', 'error'); return false; }
        await S.sendFeedback({ type: f.type, text: f.text, photos: el._ph(), page: location.hash });
        UI.toast('ส่งเรื่องแล้ว ขอบคุณครับ — งานยานพาหนะจะตรวจสอบโดยเร็ว', 'ok'); return true;
      } }]
    });
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-feedback]')) { e.preventDefault(); Pages._feedback(); } });

  // ═════════ 3) วิธีใช้งาน ═════════
  const step = (ic, t, d) => `<li class="hp-step"><span class="hp-ic">${icon(ic)}</span><div><b>${t}</b><p>${d}</p></div></li>`;
  const HELP = {
    teacher: { label: 'ครู / บุคลากร', icon: 'teacher', steps: () => {
      const s = S.db.settings, lead = +s.leadDays || 0, qh = S.quickHours ? S.quickHours() : 0;
      return [
        step('login', 'เข้าสู่ระบบ', 'กด <b>เข้าสู่ระบบด้วย Google</b> ด้วยอีเมลโรงเรียน (@pcshspt.ac.th) · ครั้งแรกกรอกโปรไฟล์และ<b>วาดลายเซ็น</b> (ใช้ลงนามในบันทึกข้อความ)'),
        step('filePlus', 'ขอใช้รถ', `เมนู <b>ขอใช้รถ</b> → เลือกหมวดงาน → วันเวลา → สถานที่ (ค้นหา หรือกรอกเองทั้งหมด) → จำนวนผู้เดินทาง → แนบ<b>บันทึกข้อความที่ผู้อำนวยการลงนามแล้ว</b> → ตรวจสรุป → ส่ง · ต้องขอล่วงหน้าอย่างน้อย <b>${lead} วัน</b>${qh ? ` (งานประจำ ขอก่อนเวลาออก ${qh} ชั่วโมง)` : ''}`),
        step('bell', 'ติดตามผล', 'ผลการพิจารณาแจ้งที่<b>กระดิ่ง</b>มุมขวาบน · ดูทุกคำขอได้ที่ <b>การขอใช้รถของฉัน</b> (รอตรวจสอบ / ส่งกลับให้แก้ไข / อนุมัติแล้ว)'),
        step('edit', 'แก้ไข / ยกเลิก', 'ระหว่าง<b>รอตรวจสอบ</b>หรือ<b>ส่งกลับให้แก้ไข</b> แก้ไขได้เอง · <b>อนุมัติแล้ว</b> กด "ขอแก้ไขข้อมูล" ให้แอดมินพิจารณา · ยกเลิกได้ก่อนรถออก'),
        step('file', 'บันทึกข้อความขอใช้รถ', 'หลังอนุมัติ เปิดคำขอแล้วกด <b>พิมพ์ / ดาวน์โหลด</b> บันทึกข้อความ (ลงนามอิเล็กทรอนิกส์ให้อัตโนมัติ)'),
        step('van', 'วันเดินทาง', 'ดูรถ คนขับ และเบอร์โทรในคำขอ · ไปจุดนัดตามเวลา · <b>กลับถึงแล้ว คนขับจะให้ครู 1 คนเซ็นชื่อบนมือถือ</b>ยืนยันเวลากลับ'),
        step('star', 'ประเมินคนขับ', 'หลังกลับถึง ระบบเด้งให้ประเมิน 4 ด้าน (ไม่เปิดเผยชื่อผู้ประเมิน)'),
        step('alert', 'นักเรียนป่วยฉุกเฉิน (นอกเวลา)', 'เปิดหน้า <b>ติดต่อเรา</b> → การ์ดแดง <b>คนขับหอพักเวรคืนนี้</b> → กดโทรได้ทันที (ไม่ต้องส่งคำขอ)')
      ];
    } },
    driver: { label: 'พนักงานขับรถ', icon: 'wheel', steps: () => [
      step('login', 'เข้าสู่ระบบ', 'ใช้<b>ชื่อผู้ใช้และรหัสผ่าน</b>ที่แอดมินให้ (ครั้งแรกต้องตั้งรหัสใหม่) · ครูที่เป็นคนขับใช้ Google · เพิ่มหน้าเว็บไว้ที่หน้าจอมือถือจะเปิดง่าย'),
      step('calendar', 'ดูงาน', 'หน้าแรกแสดงงาน <b>วันนี้ / สัปดาห์ / เดือน</b> และแถบ <b>ปฏิทินงาน</b> · เวรของตัวเองขึ้นแจ้งที่หน้าแรก'),
      step('navigation', 'ออกเดินทาง', 'กด <b>ออกเดินทาง</b> (กดได้ก่อนเวลาออก 3 ชั่วโมง) → ติ๊กตรวจสภาพรถ → ใส่เลขไมล์ → ยืนยัน · เลยเวลาออกเกิน 24 ชั่วโมง กดเองไม่ได้ ให้แอดมินบันทึกแทน'),
      step('home', 'กลับถึงโรงเรียน', 'กด <b>กลับถึงโรงเรียนแล้ว</b> → ใส่เลขไมล์ → ส่งมือถือให้<b>ครูที่ไปด้วยเซ็นชื่อ</b> (ไม่มีครูไปด้วยเลือกได้) · <b>กดตามเวลาจริง</b> ค่าล่วงเวลาคิดจากเวลานี้'),
      step('fuel', 'ค่าใช้จ่าย', 'กด <b>บันทึกค่าใช้จ่าย</b> → <b>เพิ่มค่าใช้จ่าย</b> ทีละรายการ (น้ำมัน / ทางด่วน / ที่จอด / อื่น ๆ) · ค่าน้ำมันต้อง<b>ถ่ายรูปบิล</b> · แก้ไข/ลบได้ภายใน 30 วัน'),
      step('alert', 'งานฉุกเฉินนำส่งผู้ป่วย', 'กดปุ่มแดง <b>ออกงานฉุกเฉิน</b> → เลือกรถ สถานพยาบาล จำนวนผู้ป่วย ผู้ดูแล → ออกเดินทางได้ทันที · กลับถึงให้<b>ผู้ดูแลเซ็นชื่อ</b> · ลืมกด บันทึกย้อนหลังได้ใน 24 ชั่วโมง'),
      step('coins', 'ค่าล่วงเวลา', 'แถบ <b>ค่าล่วงเวลา</b> ดูยอดรายวัน/รายเดือนของตัวเอง (คำนวณอัตโนมัติ · งานยานพาหนะตรวจและปรับยอดสุดท้าย)'),
      step('map', 'นำทาง', 'เปิดงาน → กด <b>นำทาง Google Maps</b> ไปยังพิกัดที่ครูปักไว้')
    ] },
    admin: { label: 'แอดมิน', icon: 'shield', steps: () => [
      step('clipboard', 'ตรวจและอนุมัติคำขอ', 'หลังบ้าน → <b>คำขอใช้รถ</b> → รอตรวจสอบ → ตรวจบันทึกข้อความ → เลือกรถ/คนขับ (กด <b>ดูตารางงานคนขับ</b> ได้) → อนุมัติ / ส่งกลับแก้ไข / ไม่อนุมัติ'),
      step('alert', 'งานเร่งด่วนและงานฉุกเฉิน', '<b>บันทึกคำขอเร่งด่วน</b> แทนครู (ระบบทวงบันทึกข้อความตามหลัง) · งานฉุกเฉินที่คนขับกดเอง ขึ้นแจ้งที่ภาพรวม → เปิดแล้วกด <b>รับทราบ</b> · บันทึกงานฉุกเฉินแทนคนขับได้'),
      step('van', 'ระหว่างเดินทาง', 'ติดตามสถานะรถ · บันทึกออก/กลับแทนคนขับพร้อมเหตุผล · ย้อนสถานะ · แก้เลขไมล์'),
      step('coins', 'ค่าใช้จ่ายและค่าล่วงเวลา', 'เมนู <b>ค่าน้ำมัน/ค่าใช้จ่าย</b>: รายการ สถิติ PDF/Excel · แถบ <b>ค่าล่วงเวลา</b>: ตรวจ ปรับยอดรายวัน จัดเวร และดาวน์โหลด <b>PDF ส่งเบิก</b>'),
      step('users', 'ข้อมูลหลัก', '<b>ข้อมูลรถ</b> (เอกสาร ซ่อมบำรุง) · <b>พนักงานขับรถ</b> (ติ๊กคนขับหอพัก) · <b>ผู้ใช้และสิทธิ์</b> (สร้างบัญชีชื่อผู้ใช้ให้คนขับ ตั้งคนขับสำรอง)'),
      step('settings', 'ตั้งค่า', 'กฎการขอใช้รถ หมวดงาน ผู้ลงนามอิเล็กทรอนิกส์ สถานพยาบาล คณะทำงาน · <b>ล้างข้อมูล</b> (ผู้ดูแลระบบสูงสุด)'),
      step('activity', 'ดูแลระบบ', 'เรื่องที่ผู้ใช้แจ้ง · ข้อผิดพลาดของระบบ · <b>สำรองข้อมูล Excel ทุกสิ้นเดือน</b>')
    ] }
  };
  Pages.help = ({ query }) => {
    const me = S.me, mine = !me ? 'teacher' : S.isAdmin(me) ? 'admin' : (S.isDriver(me) && !S.has(me, 'teacher')) ? 'driver' : 'teacher';
    const tab = HELP[query.t] ? query.t : mine;
    return {
      html: `<div class="page"><div class="container" style="max-width:900px">
        <div class="page-head"><div><div class="eyebrow">ช่วยเหลือ</div><h1>วิธีใช้งานระบบยานพาหนะ</h1><p>คู่มือสั้น ๆ แยกตามบทบาท · ติดปัญหากด "แจ้งปัญหา" ได้ทุกเมื่อ</p></div>${me ? `<button class="btn btn-primary btn-sm" data-feedback>${icon('send')} แจ้งปัญหา / ข้อเสนอแนะ</button>` : ''}</div>
        <div class="seg hp-tabs">${Object.entries(HELP).map(([k, h]) => `<a href="#/help?t=${k}"><button class="${k === tab ? 'on' : ''}" tabindex="-1">${icon(h.icon)} ${h.label}</button></a>`).join('')}</div>
        <ol class="hp-list">${HELP[tab].steps().join('')}</ol>
        <div class="note-box navy" style="margin-top:18px">${icon('phone')}<div>สอบถามเพิ่มเติม: หน้า <a class="link" href="#/contact">ติดต่อเรา</a>${me ? ' · หรือกด <a class="link" href="#" data-feedback>แจ้งปัญหา</a>' : ''}</div></div>
      </div></div>`
    };
  };

  // ═════════ 4) หลังบ้าน → ดูแลระบบ ═════════
  const shortUA = ua => { const s = String(ua || ''); const os = /iPhone|iPad/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS/.test(s) ? 'Mac' : ''; const br = /Line\//.test(s) ? 'LINE' : /FBAN|FBAV/.test(s) ? 'Facebook' : /Edg\//.test(s) ? 'Edge' : /CriOS|Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : /Firefox/.test(s) ? 'Firefox' : ''; return [os, br].filter(Boolean).join(' · ') || s.slice(0, 40); };
  const xlsDate = d => d ? fmt.dt(d) : '';
  // สำรองข้อมูลเป็น Excel (อ่านง่าย) — ทุกคำขอรวมข้อมูลย้อนหลัง
  async function backupExcel() {
    await S.ensureHistory();
    const R = S.db.requests.slice().sort((a, b) => a.id.localeCompare(b.id));
    const vn = id => C.vName(id), dn = id => (S.driver(id) || {}).name || '';
    const sheets = [
      { name: 'คำขอใช้รถ', head: ['เลขที่', 'ส่งเมื่อ', 'สถานะ', 'หมวดงาน', 'วัตถุประสงค์', 'ผู้ขอ', 'ฝ่าย', 'ปลายทาง', 'ออก', 'กลับ', 'ครู', 'นักเรียน', 'อื่น ๆ', 'รถ / คนขับ', 'เร่งด่วน', 'ฉุกเฉินนำส่งผู้ป่วย', 'ระยะทางรวม (กม.)', 'ค่าใช้จ่ายรวม'],
        rows: R.map(r => [r.id, xlsDate(r.createdAt), (S.STATUS[r.status] || {}).label || r.status, S.catName(r), r.purpose, (r.requester || {}).name, (r.requester || {}).dept, S.destName(r), xlsDate(r.startAt), xlsDate(r.endAt), r.teachers || 0, r.students || 0, r.others || 0, (r.assignments || []).map(a => `${vn(a.vehicleId)} / ${dn(a.driverId)}`).join(', '), r.emergency ? 'ใช่' : '', r.medical ? 'ใช่' : '', r.totalKm || 0, (r.expenses || []).reduce((s, e) => s + (+e.amount || 0), 0)]) },
      { name: 'การเดินทางรายคัน', head: ['เลขที่คำขอ', 'รถ', 'คนขับ', 'สถานะ', 'ออกเดินทาง', 'กลับถึง', 'ไมล์ออก', 'ไมล์กลับ', 'ระยะทาง (กม.)', 'ครูลงชื่อ'],
        rows: R.flatMap(r => (r.assignments || []).map(a => [r.id, vn(a.vehicleId), dn(a.driverId), S.ASSIGN[a.status] || a.status, xlsDate(a.departedAt), xlsDate(a.returnedAt), a.odoStart ?? '', a.odoEnd ?? '', a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : '', a.paxSign ? (a.paxSign.has ? a.paxSign.name : 'ไม่มีครูไปด้วย') : ''])) },
      { name: 'ค่าใช้จ่าย', head: ['เลขที่คำขอ', 'วันที่', 'รายการ', 'รถ', 'ปั๊ม/สถานที่', 'ลิตร', 'ราคา/ลิตร', 'วิธีชำระ', 'ยอดเงิน', 'บันทึกโดย'],
        rows: R.flatMap(r => (r.expenses || []).map(e => [r.id, e.date, Pages._expTitle ? Pages._expTitle(e) : S.EXPENSE[e.type], vn(e.vehicleId), e.station || '', e.liters || '', e.pricePerL || '', S.PAY[e.pay] || '', +e.amount || 0, e.byName || e.by || ''])) },
      { name: 'ผลประเมินคนขับ', head: ['วันที่', 'คนขับ', 'รถ', ...Object.values(S.RATE_KEYS), 'ความคิดเห็น'],
        rows: (S.db.ratings || []).slice().sort((a, b) => a.at.localeCompare(b.at)).map(x => [xlsDate(x.at), dn(x.driverId), vn(x.vehicleId), ...Object.keys(S.RATE_KEYS).map(k => (x.scores || {})[k] ?? ''), x.comment || '']) },
      { name: 'ค่าล่วงเวลา', head: ['คนขับ', 'วันที่', 'ชั่วโมง', 'จำนวนเงิน', 'ที่มา', 'หมายเหตุแอดมิน'],
        rows: Pages._otCalc ? S.db.drivers.flatMap(d => Pages._otCalc.daysOf(d.id, new Date(2020, 0, 1), new Date()).map(x => [d.name, x.date, x.hours || '', x.amount, x.ov ? 'แอดมินปรับ' : x.basis, x.ov ? x.ov.note || '' : ''])) : [] },
      { name: 'รถ', head: ['ลำดับ', 'ชื่อ', 'ทะเบียน', 'ประเภท', 'ยี่ห้อ/รุ่น', 'ที่นั่ง', 'คนขับประจำ', 'ให้บริการ'], rows: S.db.vehicles.map(v => [v.no || '', v.name, v.plate || '', S.KINDS[v.kind] || v.kind, [v.brand, v.model].filter(Boolean).join(' '), v.seats || '', dn(v.driverId), v.bookable === false ? 'งด' : 'ใช่']) },
      { name: 'พนักงานขับรถ', head: ['ชื่อ', 'เบอร์โทร', 'บัญชี', 'ใบขับขี่หมดอายุ', 'คนขับหอพัก', 'คนขับสำรอง', 'ปฏิบัติงาน'], rows: S.db.drivers.map(d => [d.name, d.phone || '', d.email || '', d.licenseExpiry || '', d.dorm ? 'ใช่' : '', d.standby ? 'ใช่' : '', d.active === false ? 'พักงาน' : 'ใช่']) },
      { name: 'ผู้ใช้', head: ['ชื่อ', 'อีเมล/ชื่อผู้ใช้', 'ฝ่าย', 'เบอร์โทร', 'สิทธิ์', 'สถานะ'], rows: S.db.users.map(u => [u.name || '', S.isUsernameEmail(u.email) ? S.usernameOf(u.email) : u.email, u.dept || '', u.phone || '', (u.roles || []).map(r => S.ROLES[r]).join(', '), u.active === false ? 'ปิดใช้งาน' : 'ใช้งาน']) }
    ];
    UI.exportSheets(`สำรองข้อมูลระบบยานพาหนะ-${fmt.localDate(new Date())}`, sheets);
  }
  // สำรองข้อมูลแบบครบทุกช่อง (JSON) — ใช้กู้คืนโดยผู้พัฒนา
  async function backupJson() {
    await S.ensureHistory();
    const d = S.db, data = { app: 'pcshs-vehicle', format: 'web-export-v1', exportedAt: new Date().toISOString(), by: S.me.email, settings: d.settings, vehicles: d.vehicles, vehiclePrivate: d.vprivate, drivers: d.drivers, users: d.users, requests: d.requests, ratings: d.ratings, places: d.places, ot: d.ot, feedback: d.feedback };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `สำรองข้อมูลระบบยานพาหนะ-${fmt.localDate(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  Pages.adminSupport = ({ query }) => {
    const tab = ['fb', 'err', 'backup'].includes(query.t) ? query.t : 'fb';
    const fs = query.s || 'new';
    const fbAll = (S.db.feedback || []).slice().sort((a, b) => b.at.localeCompare(a.at));
    const fbNew = fbAll.filter(x => x.status === 'new').length;
    const fb = fbAll.filter(x => fs === 'all' || x.status === fs);
    const qs = o => '#/admin/support?' + new URLSearchParams({ t: tab, s: fs, ...o });
    const H = Pages._adm.head;
    return {
      layout: 'admin',
      html: `${H('ระบบ', 'ดูแลระบบ', 'เรื่องที่ผู้ใช้แจ้ง · ข้อผิดพลาดของระบบ · สำรองข้อมูล')}
        <div class="toolbar"><div class="seg">
          <a href="${qs({ t: 'fb' })}"><button class="${tab === 'fb' ? 'on' : ''}" tabindex="-1">${icon('send')} เรื่องที่ผู้ใช้แจ้ง${fbNew ? ` <b class="sp-cnt">${fbNew}</b>` : ''}</button></a>
          <a href="${qs({ t: 'err' })}"><button class="${tab === 'err' ? 'on' : ''}" tabindex="-1">${icon('alert')} ข้อผิดพลาดของระบบ</button></a>
          <a href="${qs({ t: 'backup' })}"><button class="${tab === 'backup' ? 'on' : ''}" tabindex="-1">${icon('download')} สำรองข้อมูล</button></a></div></div>
        ${tab === 'fb' ? `
          <div class="toolbar"><div class="seg">${[['new', 'ใหม่'], ['done', 'จัดการแล้ว'], ['all', 'ทั้งหมด']].map(([k, l]) => `<a href="${qs({ s: k })}"><button class="${fs === k ? 'on' : ''}" tabindex="-1">${l} ${k === 'all' ? fbAll.length : fbAll.filter(x => x.status === k).length}</button></a>`).join('')}</div></div>
          <div class="stack">${fb.length ? fb.map(x => `<div class="card sp-fb ${x.status}">
            <div class="sp-top"><span class="pill ${x.type === 'bug' ? 'tone-bad' : x.type === 'idea' ? 'tone-ok' : ''}">${(FB_TYPES[x.type] || FB_TYPES.other)[0]}</span><b>${esc(x.name || x.email)}</b><small>${fmt.dt(x.at)} · ${esc(shortUA(x.ua))}${x.page ? ` · หน้า ${esc(x.page)}` : ''}</small></div>
            <p class="sp-text">${esc(x.text)}</p>
            ${(x.photos || []).length ? `<div class="thumbs">${x.photos.map(p => UI.thumb(p)).join('')}</div>` : ''}
            <div class="sp-foot">${x.status === 'done' ? `<small>${icon('checkCircle')} จัดการแล้วโดย ${esc(x.doneByName || '')} · ${fmt.dt(x.doneAt)}${x.note ? ` · ${esc(x.note)}` : ''}</small>` : '<span></span>'}
              <span class="row" style="gap:6px">${x.status === 'new' ? `<button class="btn btn-primary btn-xs" data-fbdone="${x.id}">${icon('check')} จัดการแล้ว</button>` : `<button class="btn btn-ghost btn-xs" data-fbre="${x.id}">${icon('undo')} เปิดเรื่องใหม่</button>`}<button class="btn btn-ghost btn-xs" data-fbdel="${x.id}">${icon('trash')} ลบ</button></span></div>
          </div>`).join('') : UI.empty(fs === 'new' ? 'ไม่มีเรื่องใหม่' : 'ยังไม่มีเรื่องที่แจ้ง', 'checkCircle')}</div>`
        : tab === 'err' ? `<div class="note-box navy" style="margin-bottom:14px">${icon('info')}<div>ระบบบันทึกข้อผิดพลาดที่ผู้ใช้เจอโดยอัตโนมัติ (ผู้ใช้ไม่ต้องแจ้ง) · ข้อความเดียวกันรวมเป็นแถวเดียว · ส่งภาพหน้านี้ให้ผู้พัฒนาตรวจได้เลย</div></div><div id="spErr"><p class="hint">กำลังโหลด…</p></div>`
        : `<div class="card"><div class="card-head"><h3>${icon('download')} ดาวน์โหลดสำรองข้อมูล</h3></div>
            <p>แนะนำ<b>ดาวน์โหลด Excel ทุกสิ้นเดือน</b> เก็บไว้ในไดรฟ์ของงานยานพาหนะ (รวมข้อมูลย้อนหลังทั้งหมด)</p>
            <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-primary" id="bkXls">${icon('download')} ดาวน์โหลด Excel (อ่านง่าย)</button><button class="btn btn-ghost" id="bkJson">${icon('download')} ดาวน์โหลด JSON (ครบทุกช่อง สำหรับกู้คืน)</button></div>
            <ul class="sp-bk"><li><b>Excel</b>: คำขอใช้รถ · การเดินทางรายคัน · ค่าใช้จ่าย · ผลประเมิน · ค่าล่วงเวลา · รถ · คนขับ · ผู้ใช้</li><li><b>JSON</b>: ข้อมูลทุกช่องตามฐานข้อมูล ใช้กู้คืนกรณีข้อมูลเสียหาย (ไฟล์แนบ/รูปอยู่ใน Google Drive อยู่แล้ว)</li></ul></div>
          <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('clock')} สำรองอัตโนมัติทุกคืน</h3></div>
            <p>Apps Script สำรองฐานข้อมูลทั้งหมดเป็นไฟล์ JSON <b>ทุกคืนตี 2</b> ลง Google Drive โฟลเดอร์ <b>ระบบยานพาหนะ - ไฟล์ › สำรองข้อมูล</b> (เก็บ 60 วัน + วันที่ 1 ของทุกเดือนเก็บถาวร)</p>
            <p class="hint" style="margin-top:6px">ตรวจว่าเปิดใช้อยู่: เปิดโฟลเดอร์ดังกล่าวใน Drive ต้องมีไฟล์ของเมื่อคืน · ถ้าไม่มี ให้เปิด Apps Script แล้ว Run <b>installBackupTrigger</b> 1 ครั้ง (README ขั้นตอนที่ 11)</p></div>`}`,
      async mount(root) {
        root.addEventListener('click', async e => {
          const t = e.target;
          if (t.closest('#bkXls')) { const b = t.closest('#bkXls'); try { await UI.busy(b, backupExcel); UI.toast('ดาวน์โหลด Excel แล้ว'); } catch (er) { /* แจ้งแล้ว */ } return; }
          if (t.closest('#bkJson')) { const b = t.closest('#bkJson'); try { await UI.busy(b, backupJson); UI.toast('ดาวน์โหลด JSON แล้ว'); } catch (er) { /* แจ้งแล้ว */ } return; }
          const dn = t.closest('[data-fbdone]'); if (dn) { const res = await UI.confirm('บันทึกว่าจัดการเรื่องนี้แล้ว', { title: 'จัดการแล้ว', ok: 'บันทึก', input: { label: 'หมายเหตุ (ถ้ามี)' } }); if (res) S.setFeedback(dn.dataset.fbdone, 'done', res.value).then(() => UI.toast('บันทึกแล้ว')).catch(er => UI.toast(er.message, 'error')); return; }
          const re = t.closest('[data-fbre]'); if (re) { S.setFeedback(re.dataset.fbre, 'new').catch(er => UI.toast(er.message, 'error')); return; }
          const dl = t.closest('[data-fbdel]'); if (dl) { if (await UI.confirm('ลบเรื่องนี้?', { danger: true, ok: 'ลบ' })) S.deleteFeedback(dl.dataset.fbdel).then(() => UI.toast('ลบแล้ว')).catch(er => UI.toast(er.message, 'error')); return; }
          if (t.closest('#errClear')) { const ids = (root._err || []).map(x => x.id); if (!ids.length || !(await UI.confirm(`ล้างบันทึกข้อผิดพลาดทั้งหมด ${ids.length} รายการ?`, { danger: true, ok: 'ล้าง' }))) return; await S.clearErrors(ids); UI.toast('ล้างแล้ว'); drawErr(); }
        });
        const drawErr = async () => {
          const el = $('#spErr', root); if (!el) return;
          let list = []; try { list = await S.errorList(); } catch (er) { el.innerHTML = `<p class="hint">โหลดไม่สำเร็จ: ${esc(er.message)}</p>`; return; }
          root._err = list;
          const g = [...list.reduce((m, x) => { const k = x.msg; if (!m.has(k)) m.set(k, []); m.get(k).push(x); return m; }, new Map()).values()];
          el.innerHTML = list.length ? `<div class="row between" style="margin-bottom:10px"><b>${list.length} ครั้ง · ${g.length} แบบ</b><button class="btn btn-ghost btn-sm" id="errClear">${icon('trash')} ล้างทั้งหมด</button></div>
            <div class="stack">${g.map(xs => { const x = xs[0], who = [...new Set(xs.map(y => y.name || y.email))]; return `<details class="card sp-err"><summary><span class="pill tone-bad">${xs.length} ครั้ง</span><b>${esc(x.msg.slice(0, 180))}</b><small>ล่าสุด ${fmt.dt(x.at)} · ${esc(who.slice(0, 3).join(', '))}${who.length > 3 ? ` และอีก ${who.length - 3} คน` : ''} · ${esc(x.kind)}</small></summary>
              <div class="sp-errd"><p><b>หน้า:</b> ${esc([...new Set(xs.map(y => y.page))].slice(0, 5).join(' · '))}</p><p><b>อุปกรณ์:</b> ${esc([...new Set(xs.map(y => shortUA(y.ua)))].join(' · '))} · <b>รุ่นเว็บ:</b> ${esc(x.ver || '-')}</p>${x.stack ? `<pre>${esc(x.stack)}</pre>` : ''}</div></details>`; }).join('')}</div>`
            : UI.empty('ยังไม่มีข้อผิดพลาด', 'checkCircle');
        };
        drawErr();
      }
    };
  };
})();
