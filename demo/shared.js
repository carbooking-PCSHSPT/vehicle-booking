/* ═══════════════════════════════════════════════════════════
   ระบบยานพาหนะ — ข้อมูลตัวอย่าง + ส่วนประกอบที่ทุกเวอร์ชันใช้ร่วมกัน
   (ข้อมูลทั้งหมดในไฟล์นี้เป็นข้อมูล DEMO เท่านั้น)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ───────── ไอคอน (เส้น 24px) ─────────
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    van: '<path d="M3 17V7.5A2.5 2.5 0 0 1 5.5 5H15l5.5 6.2V17h-1.6"/><path d="M3 11.5h17.5"/><path d="M9.5 5v6.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path d="M9 17.5h6"/>',
    bus: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.2 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    student: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
    teacher: '<circle cx="12" cy="6.5" r="3.5"/><path d="M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"/><path d="m12 13 1.5 3L12 21l-1.5-5Z"/>',
    wheel: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 14.2V21.5"/><path d="M9.9 11.4 2.8 9.6"/><path d="m14.1 11.4 7.1-1.8"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    filePlus: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M12 12v6"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowUR: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    star: '<path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    sparkles: '<path d="M12 3l1.9 5.8L20 10.7l-5.8 1.9L12 18.4l-1.9-5.8L4.2 10.7l5.8-1.9z"/><path d="M19 3v4M17 5h4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
    line: '<path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s5.9-3.5 8-6c1.4-1.6 2-3.2 2-4.8C22 6.6 17.5 3 12 3Z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    map: '<path d="M14.1 6.1 9.9 3.9a2 2 0 0 0-1.8 0L3.6 6.1A1 1 0 0 0 3 7v12.4a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.2a2 2 0 0 0 1.8 0l4.5-2.2a1 1 0 0 0 .6-.9V5.1a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8 0Z"/><path d="M9 3.8v15"/><path d="M15 6.2v15"/>',
    google: '<path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.6L6.4 14Z" fill="#FBBC05" stroke="none"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1Z" fill="#EA4335" stroke="none"/>'
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ───────── นาฬิกา (นอกเวลาทำการจะจำลองเป็น 10:30 น. เพื่อให้เห็นภาพรถวิ่งจริง) ─────────
  const real = new Date();
  const hr = real.getHours() + real.getMinutes() / 60;
  const simulated = hr < 7.5 || hr > 16.5;
  let offset = 0;
  if (simulated) { const b = new Date(real); b.setHours(10, 30, 0, 0); offset = b - real; }
  const now = () => new Date(Date.now() + offset);
  const anchor = (() => { const d = now(); d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0); return d; })();
  const at = h => new Date(anchor.getTime() + h * 3600e3);

  // ───────── คนขับ / ผู้ดูแลรถ (จากตารางข้อมูลรถของโรงเรียน) ─────────
  const D = {
    sawong: { name: 'นายสวง เพไร', phone: '081-448-5831' },
    boontan: { name: 'นายบุญทัน กองไธสง', phone: '080-601-3159' },
    pallop: { name: 'นายพัลลภ สุนทร', phone: '062-451-3747' },
    manachai: { name: 'นายมานะชัย จันทร์บำรุง', phone: '085-385-3492' },
    nattapong: { name: 'นายนัดระพงษ์ ยืนบั่ง', phone: '099-205-4081' },
    chaiwat: { name: 'นายไชยวัฒน์ กุณฑล', phone: '093-565-6662' }
  };

  // ───────── รถส่วนกลางสำหรับรับส่งบุคลากร (รหัสรถตามตารางของโรงเรียน) ─────────
  const VEHICLES = [
    { id: 'V1', no: 1, sym: 'Va', name: 'รถตู้ 01', plate: '1นฌ 8758 กทม.', brand: 'TOYOTA', type: 'รถตู้โดยสาร', kind: 'van', seats: 13, keeper: D.sawong },
    { id: 'V2', no: 2, sym: 'Va', name: 'รถตู้ 02', plate: '1นซ 1976 กทม.', brand: 'TOYOTA', type: 'รถตู้โดยสาร', kind: 'van', seats: 13, keeper: D.boontan },
    { id: 'V3', no: 3, sym: 'Va', name: 'รถตู้ 03', plate: 'ฮล 4536 กทม.', brand: 'TOYOTA', type: 'รถตู้โดยสาร', kind: 'van', seats: 13, keeper: D.pallop },
    { id: 'V4', no: 4, sym: 'Va', name: 'รถตู้ 04', plate: 'ฮจ 1618 กทม.', brand: 'TOYOTA', type: 'รถตู้โดยสาร', kind: 'van', seats: 13, keeper: D.manachai },
    { id: 'V5', no: 5, sym: 'Va', name: 'รถตู้ 05', plate: 'ย 0567 ปทุมธานี', brand: 'TOYOTA', type: 'รถตู้โดยสาร', kind: 'van', seats: 13, keeper: D.manachai, maint: 'เปลี่ยนยาง + เช็กระยะ' },
    { id: 'V7', no: 7, sym: 'Mb', name: 'รถโดยสาร 6 ล้อ', plate: '40-0686 ปทุมธานี', brand: 'MITSUBISHI', type: 'รถโดยสาร 6 ล้อ', kind: 'bus', seats: 30, keeper: D.boontan },
    { id: 'V8', no: 8, sym: 'Bu', name: 'รถบัสโดยสาร', plate: '40-0889 ปทุมธานี', brand: 'HINO', type: 'รถบัสโดยสาร', kind: 'bus', seats: 45, keeper: D.boontan },
    { id: 'V10', no: 10, sym: 'Se', name: 'รถเก๋ง', plate: '3ขว 9163 กทม.', brand: 'TOYOTA', type: 'รถนั่งส่วนบุคคล', kind: 'car', seats: 4, keeper: D.nattapong }
  ];
  const vById = id => VEHICLES.find(v => v.id === id);

  // ───────── รายการขอใช้รถวันนี้ (สมมติ) ─────────
  const TRIPS = [
    { id: 'VR-0138', v: 'V1', driver: D.sawong, start: at(-4.5), end: at(-1.5), dest: 'ท่าอากาศยานสุวรรณภูมิ', place: 'บางพลี สมุทรปราการ', purpose: 'รับวิทยากรค่ายโอลิมปิกวิชาการ', requester: 'ครูกนกวรรณ ศรีสุข', dept: 'กลุ่มสาระวิทยาศาสตร์', teachers: 1, students: 0, km: 52 },
    { id: 'VR-0139', v: 'V8', driver: D.boontan, start: at(-1.5), end: at(5), dest: 'มหาวิทยาลัยเกษตรศาสตร์ บางเขน', place: 'จตุจักร กรุงเทพฯ', purpose: 'ทัศนศึกษางานเกษตรแฟร์ ม.4', requester: 'ครูธนพล วงศ์ใหญ่', dept: 'กลุ่มสาระวิทยาศาสตร์', teachers: 4, students: 38, km: 34 },
    { id: 'VR-0140', v: 'V2', driver: D.pallop, start: at(-1), end: at(2.5), dest: 'สพม.ปทุมธานี', place: 'เมืองปทุมธานี ปทุมธานี', purpose: 'ประชุมผู้บริหารสถานศึกษา', requester: 'ครูวิไลพร มณีรัตน์', dept: 'ฝ่ายบริหารงานวิชาการ', teachers: 3, students: 0, km: 18 },
    { id: 'VR-0141', v: 'V3', driver: D.manachai, start: at(1.5), end: at(5), dest: 'อุทยานวิทยาศาสตร์ประเทศไทย (สวทช.)', place: 'คลองหลวง ปทุมธานี', purpose: 'นำเสนอโครงงานวิทยาศาสตร์', requester: 'ครูอรรถพล แก้วประเสริฐ', dept: 'กลุ่มสาระคณิตศาสตร์', teachers: 2, students: 10, km: 21 },
    { id: 'VR-0142', v: 'V10', driver: D.nattapong, start: at(2.5), end: at(6), dest: 'กระทรวงศึกษาธิการ', place: 'ดุสิต กรุงเทพฯ', purpose: 'ยื่นเอกสารโครงการห้องเรียนพิเศษ', requester: 'ครูสุภาวดี ทองคำ', dept: 'ฝ่ายบริหารงานทั่วไป', teachers: 2, students: 0, km: 42 },
    { id: 'VR-0143', v: 'V7', driver: D.chaiwat, start: at(3.5), end: at(51.5), dest: 'อุทยานแห่งชาติเขาใหญ่', place: 'ปากช่อง นครราชสีมา', purpose: 'ค่ายวิทยาศาสตร์ธรรมชาติ ม.5', requester: 'ครูปิยะนุช ใจดี', dept: 'กลุ่มสาระวิทยาศาสตร์', teachers: 3, students: 24, km: 165, overnight: '3 วัน 2 คืน' },
    { id: 'VR-0144', v: null, driver: null, start: at(5), end: at(8), dest: 'มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต', place: 'คลองหลวง ปทุมธานี', purpose: 'แข่งขันหุ่นยนต์ระดับภาค', requester: 'ครูณัฐวุฒิ พรหมมา', dept: 'กลุ่มสาระเทคโนโลยี', teachers: 2, students: 6, km: 12, pending: true }
  ];

  const TRIP_STATUS = {
    done: { label: 'กลับถึงแล้ว', tone: 'done' },
    ontrip: { label: 'กำลังเดินทาง', tone: 'ontrip', pulse: true },
    approved: { label: 'อนุมัติแล้ว · รอออกเดินทาง', short: 'อนุมัติแล้ว', tone: 'ok' },
    pending: { label: 'รอแอดมินจัดรถ', short: 'รอจัดรถ', tone: 'wait' }
  };
  const V_STATUS = {
    free: { label: 'ว่าง', tone: 'free' },
    booked: { label: 'จองแล้ว', tone: 'booked' },
    ontrip: { label: 'กำลังเดินทาง', tone: 'ontrip', pulse: true },
    maint: { label: 'ซ่อมบำรุง', tone: 'maint' }
  };

  const tripStatus = t => {
    if (t.pending) return 'pending';
    const n = now();
    if (n >= t.end) return 'done';
    if (n >= t.start) return 'ontrip';
    return 'approved';
  };
  const progress = t => Math.max(0, Math.min(1, (now() - t.start) / (t.end - t.start)));

  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const fmtTime = d => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtWhen = d => sameDay(d, now()) ? fmtTime(d) : `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${fmtTime(d)}`;
  const thaiDate = (d = now()) => d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDur = ms => { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h} ชม. ${m % 60} นาที` : `${m} นาที`; };

  function trips() {
    return TRIPS.map(t => ({ ...t, vehicle: t.v ? vById(t.v) : null, status: tripStatus(t), meta: TRIP_STATUS[tripStatus(t)], progress: progress(t) }))
      .sort((a, b) => a.start - b.start);
  }
  function vehicleState(v, list = trips()) {
    if (v.maint) return { key: 'maint', ...V_STATUS.maint, note: v.maint };
    const mine = list.filter(t => t.v === v.id);
    const on = mine.find(t => t.status === 'ontrip');
    if (on) return { key: 'ontrip', ...V_STATUS.ontrip, note: `→ ${on.dest} · กลับ ${fmtWhen(on.end)} น.`, trip: on };
    const next = mine.find(t => t.status === 'approved');
    if (next) return { key: 'booked', ...V_STATUS.booked, note: `ออก ${fmtTime(next.start)} น. → ${next.dest}`, trip: next };
    return { key: 'free', ...V_STATUS.free, note: 'พร้อมให้บริการ' };
  }
  function fleet() { const list = trips(); return VEHICLES.map(v => ({ ...v, state: vehicleState(v, list) })); }
  function summary() {
    const list = trips(), f = fleet();
    const count = k => f.filter(v => v.state.key === k).length;
    const next = list.find(t => t.status === 'approved');
    return {
      trips: list.length, ontrip: list.filter(t => t.status === 'ontrip').length, upcoming: list.filter(t => t.status === 'approved').length,
      pending: list.filter(t => t.status === 'pending').length, done: list.filter(t => t.status === 'done').length,
      free: count('free'), booked: count('booked'), busy: count('ontrip'), maint: count('maint'), total: f.length,
      students: list.reduce((s, t) => s + t.students, 0), teachers: list.reduce((s, t) => s + t.teachers, 0),
      km: list.reduce((s, t) => s + t.km, 0), rating: 4.8, monthTrips: 46, monthKm: 2486, next
    };
  }
  const kindIcon = k => k === 'bus' ? 'bus' : k === 'car' ? 'car' : 'van';
  const pill = m => `<span class="pill tone-${m.tone} ${m.pulse ? 'pulse' : ''}">${esc(m.short || m.label)}</span>`;

  // ───────── สถานะล็อกอิน (DEMO) ─────────
  const LOGIN_KEY = 'pcs-vehicle-demo-login';
  const qp = new URLSearchParams(location.search);
  if (qp.has('guest')) localStorage.setItem(LOGIN_KEY, '0');
  if (qp.has('login')) localStorage.setItem(LOGIN_KEY, '1');
  const loggedIn = localStorage.getItem(LOGIN_KEY) !== '0';
  const setLogin = on => { localStorage.setItem(LOGIN_KEY, on ? '1' : '0'); location.reload(); };
  const USER = { name: 'ครูสมใจ รักวิทยา', first: 'สมใจ', email: 'somjai.r@pcshspt.ac.th', dept: 'กลุ่มสาระวิทยาศาสตร์' };

  const VERSIONS = [
    { n: 1, file: 'v1-sky-glass.html', name: 'Sky Glass' },
    { n: 2, file: 'v2-orange-lab.html', name: 'Orange Lab' },
    { n: 3, file: 'v3-mint-route.html', name: 'Mint Route' },
    { n: 4, file: 'v4-aurora-bento.html', name: 'Aurora Bento' },
    { n: 5, file: 'v5-periodic-fleet.html', name: 'Periodic Fleet' }
  ];

  // ───────── แถบเมนูบน ─────────
  function navHTML() {
    const actions = loggedIn ? `
      <div class="dd" data-open="false">
        <button class="icon-btn" data-dd aria-label="การแจ้งเตือน 2 รายการใหม่" aria-expanded="false">${icon('bell')}<span class="bell-count">2</span></button>
        <div class="dd-panel right" style="min-width:330px">
          <div class="dd-head"><strong>การแจ้งเตือน</strong></div>
          <a href="#" data-demo><span class="notif-dot"></span><span><strong>ประเมินคนขับรถ</strong><small>ทริป ท่าอากาศยานสุวรรณภูมิ กลับถึงแล้ว — ช่วยประเมินความพึงพอใจ</small></span></a>
          <a href="#" data-demo><span class="notif-dot"></span><span><strong>คำขอ VR-0141 อนุมัติแล้ว</strong><small>รถตู้ 03 · คนขับ นายมานะชัย จันทร์บำรุง</small></span></a>
          <a href="#" data-demo><span class="notif-dot" style="background:transparent"></span><span><strong>AI ตรวจบันทึกข้อความผ่าน</strong><small>คำขอ VR-0141 ส่งให้แอดมินพิจารณาแล้ว</small></span></a>
        </div>
      </div>
      <div class="dd" data-open="false">
        <button class="user-chip" data-dd aria-expanded="false" aria-label="เมนูผู้ใช้"><span class="avatar">${USER.first[0]}</span><span class="u-name">${esc(USER.first)}</span>${icon('chev', 'chev')}</button>
        <div class="dd-panel right" style="min-width:270px">
          <div class="dd-head"><strong>${esc(USER.name)}</strong><small>${esc(USER.email)}</small></div>
          <a href="#" data-demo><span class="dd-ic">${icon('user')}</span><span><strong>โปรไฟล์และลายเซ็น</strong></span></a>
          <a href="#" data-demo><span class="dd-ic">${icon('clipboard')}</span><span><strong>การขอใช้รถของฉัน</strong></span></a>
          <div class="dd-sep"></div>
          <button class="dd-item" data-logout><span class="dd-ic">${icon('logout')}</span><span><strong>ออกจากระบบ</strong></span></button>
        </div>
      </div>`
      : `<button class="btn btn-primary btn-sm" data-login>${icon('login')}<span>เข้าสู่ระบบ</span></button>`;
    return `
    <header class="nav" id="nav">
      <div class="nav-inner">
        <a class="brand" href="#top" aria-label="ระบบยานพาหนะ หน้าแรก">
          <img src="assets/logo.png" alt="ตราโรงเรียน" width="260" height="392">
          <span><strong>ระบบยานพาหนะ</strong><small>PCSHS PATHUM THANI</small></span>
        </a>
        <nav class="menu" id="menu" aria-label="เมนูหลัก">
          <a class="menu-link active" href="#top">หน้าแรก</a>
          <a class="menu-link" href="#" data-demo>ขอใช้รถ</a>
          <div class="dd" data-open="false">
            <button class="menu-link" data-dd aria-expanded="false">ตารางรถ ${icon('chev', 'chev')}</button>
            <div class="dd-panel">
              <a href="#dashboard"><span class="dd-ic">${icon('activity')}</span><span><strong>สถานะรถวันนี้</strong><small>รถว่างกี่คัน คันไหนกำลังเดินทาง แบบเรียลไทม์</small></span></a>
              <a href="#" data-demo><span class="dd-ic">${icon('calendar')}</span><span><strong>ปฏิทินการใช้รถ</strong><small>ดูรายการขอใช้รถรายวัน สัปดาห์ เดือน</small></span></a>
            </div>
          </div>
          ${loggedIn ? '<a class="menu-link" href="#" data-demo>การขอใช้รถของฉัน</a>' : ''}
          <a class="menu-link" href="#contact">ติดต่อเรา</a>
        </nav>
        <div class="nav-actions">${actions}</div>
        <button class="icon-btn nav-toggle" data-menu-toggle aria-label="เปิดเมนู" aria-expanded="false" aria-controls="menu">${icon('menu')}</button>
      </div>
    </header>`;
  }

  // ───────── ส่วนท้าย ─────────
  function footerHTML() {
    return `
    <footer class="footer" id="contact">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand"><img src="assets/logo.png" alt="" width="260" height="392">
            <div><strong>ระบบยานพาหนะ</strong><span>ฝ่ายบริหารงานทั่วไป<br>โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย ปทุมธานี</span></div>
          </div>
          <ul class="footer-links">
            <li><a href="#" data-demo>ขอใช้รถ</a></li><li><a href="#dashboard">ตารางรถ</a></li>
            <li><a href="#" data-demo>การขอใช้รถของฉัน</a></li><li><a href="#contact">ติดต่อเรา</a></li>
          </ul>
        </div>
        <div class="footer-bottom"><span><span class="line"></span>© ${now().getFullYear() + 543} ฝ่ายบริหารงานทั่วไป</span><span>Princess Chulabhorn Science High School Pathum Thani</span></div>
      </div>
    </footer>`;
  }

  // ───────── แถบ DEMO ─────────
  function demoBarHTML(cur) {
    return `
    <div class="demo-bar" role="toolbar" aria-label="ตัวควบคุมเดโม">
      <span class="tag">DEMO</span>
      <a href="index.html" title="หน้ารวมทุกเวอร์ชัน">${icon('grid')}</a>
      ${VERSIONS.map(v => `<a href="${v.file}" class="${v.n === cur ? 'on' : ''}" title="${v.name}">V${v.n}</a>`).join('')}
      <span class="sep"></span>
      <button data-toggle-login title="สลับสถานะล็อกอิน"><span class="sw ${loggedIn ? 'on' : ''}"></span><span class="lbl">${loggedIn ? 'ล็อกอินแล้ว' : 'ยังไม่ล็อกอิน'}</span></button>
      ${simulated ? `<span class="sim" title="ตอนนี้อยู่นอกเวลาทำการ เดโมจึงจำลองเวลาเป็น 10:30 น. เพื่อให้เห็นรถกำลังเดินทาง">${icon('clock')}<span>เวลาจำลอง</span></span>` : ''}
    </div>`;
  }

  function gateHTML() {
    return `
    <div class="gate-overlay">
      <div class="gate-card">
        <div class="lock">${icon('lock')}</div>
        <h3>เข้าสู่ระบบเพื่อดูข้อมูลการใช้รถ</h3>
        <p>ตารางรถ รายชื่อผู้ขอ และข้อมูลคนขับ แสดงเฉพาะบุคลากรของโรงเรียน<br>เข้าสู่ระบบด้วยอีเมล <b>@pcshspt.ac.th</b></p>
        <button class="btn btn-ghost" data-login style="width:100%">${icon('google', 'g')} เข้าสู่ระบบด้วย Google</button>
      </div>
    </div>`;
  }

  function rateToastHTML() {
    const t = trips().find(x => x.status === 'done');
    if (!t) return '';
    return `
    <div class="rate-toast" id="rateToast" role="dialog" aria-label="ประเมินคนขับรถ">
      <div class="rt-head"><span class="rt-ic">${icon('star')}</span>
        <div><strong>กลับถึงโรงเรียนแล้ว · ประเมินคนขับหน่อยนะคะ</strong><small>${esc(t.dest)} · ${esc(t.driver.name)}</small></div>
        <button class="x" data-rate-close aria-label="ปิด">${icon('x')}</button></div>
      <div class="stars" role="radiogroup" aria-label="ให้คะแนน">${[1, 2, 3, 4, 5].map(n => `<button data-star="${n}" aria-label="${n} ดาว">${icon('star')}</button>`).join('')}</div>
      <button class="btn btn-primary btn-sm" data-rate-send style="width:100%">ส่งคำประเมิน</button>
    </div>`;
  }

  function toast(msg) {
    let el = document.querySelector('.mini-toast');
    if (!el) { el = document.createElement('div'); el.className = 'mini-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ───────── นับตัวเลขขึ้น ─────────
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), dur = 1400, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const ticks = [];
  function bindAll(root = document) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count !== undefined && !e.target._counted) { e.target._counted = 1; countUp(e.target); }
      io.unobserve(e.target);
    }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    root.querySelectorAll('.reveal:not(.in), [data-count]').forEach(el => { if (!el._counted) io.observe(el); });
    root.querySelectorAll('[data-tilt]').forEach(el => {
      if (el._tilt) return; el._tilt = 1;
      const max = +(el.dataset.tilt || 7);
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
        el.style.setProperty('--mx', `${(x + .5) * 100}%`); el.style.setProperty('--my', `${(y + .5) * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function mount(opts = {}) {
    const ns = document.getElementById('nav-slot'); if (ns) ns.outerHTML = navHTML();
    const fs = document.getElementById('footer-slot'); if (fs) fs.outerHTML = footerHTML();
    document.body.insertAdjacentHTML('beforeend', demoBarHTML(opts.version) + (loggedIn ? rateToastHTML() : ''));

    // ล็อกข้อมูลถ้ายังไม่เข้าสู่ระบบ
    if (!loggedIn) document.querySelectorAll('[data-gate]').forEach(g => { g.classList.add('gate', 'gated'); g.insertAdjacentHTML('beforeend', gateHTML()); g.querySelectorAll(':scope > :not(.gate-overlay)').forEach(c => c.setAttribute('aria-hidden', 'true')); });

    const nav = document.getElementById('nav');
    const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    document.addEventListener('click', e => {
      const dd = e.target.closest('[data-dd]');
      document.querySelectorAll('.dd[data-open="true"]').forEach(d => { if (!dd || d !== dd.parentElement) d.dataset.open = 'false'; });
      if (dd) { const p = dd.parentElement; p.dataset.open = p.dataset.open === 'true' ? 'false' : 'true'; dd.setAttribute('aria-expanded', p.dataset.open); }
      const mt = e.target.closest('[data-menu-toggle]');
      if (mt) { const m = document.getElementById('menu'); m.classList.toggle('open'); mt.setAttribute('aria-expanded', m.classList.contains('open')); }
      else if (e.target.closest('.menu a')) document.getElementById('menu')?.classList.remove('open');
      if (e.target.closest('[data-login]')) { e.preventDefault(); setLogin(true); }
      if (e.target.closest('[data-logout]')) setLogin(false);
      if (e.target.closest('[data-toggle-login]')) setLogin(!loggedIn);
      if (e.target.closest('[data-demo]')) { e.preventDefault(); toast('หน้านี้จะทำในขั้นถัดไป — เดโมนี้แสดงเฉพาะหน้าแรก'); }
      const star = e.target.closest('[data-star]');
      if (star) { const n = +star.dataset.star; star.parentElement.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i < n)); }
      if (e.target.closest('[data-rate-close]')) { document.getElementById('rateToast').classList.remove('show'); sessionStorage.setItem('pcs-rated', '1'); }
      if (e.target.closest('[data-rate-send]')) { document.getElementById('rateToast').classList.remove('show'); sessionStorage.setItem('pcs-rated', '1'); toast('ขอบคุณสำหรับคำประเมิน ⭐'); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dd[data-open="true"]').forEach(d => d.dataset.open = 'false'); });

    // นาฬิกา
    const clocks = () => {
      const n = now();
      document.querySelectorAll('[data-clock]').forEach(el => { el.textContent = n.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: el.dataset.clock === 's' ? '2-digit' : undefined, hour12: false }); });
      document.querySelectorAll('[data-date]').forEach(el => { el.textContent = thaiDate(n); });
    };
    clocks(); setInterval(clocks, 1000);
    setInterval(() => ticks.forEach(f => f()), 30000);

    bindAll();
    if (loggedIn && !sessionStorage.getItem('pcs-rated')) setTimeout(() => document.getElementById('rateToast')?.classList.add('show'), 4500);
  }

  window.PCS = {
    icon, esc, now, at, simulated, VEHICLES, trips, fleet, summary, vehicleState, kindIcon, pill, fmtTime, fmtWhen, fmtDur, thaiDate,
    loggedIn, USER, VERSIONS, mount, bindAll, toast, onTick: f => ticks.push(f), TRIP_STATUS, V_STATUS
  };
})();
