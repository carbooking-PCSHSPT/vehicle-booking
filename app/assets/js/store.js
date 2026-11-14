/* ═══════════════════════════════════════════════════════════
   Store — ชั้นข้อมูลของระบบยานพาหนะ
   ทำงานได้ 2 แบบ (หน้าเว็บเรียกใช้เหมือนกันทุกอย่าง):
   1) โหมดทดลอง (LOCAL): เก็บข้อมูลใน localStorage ของเบราว์เซอร์ พร้อมข้อมูลตัวอย่าง
   2) โหมดจริง: Firebase Auth + Firestore (เรียลไทม์) + Apps Script (เก็บไฟล์ใน Google Drive)
   ═══════════════════════════════════════════════════════════ */
const Store = (() => {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const QP = new URLSearchParams(location.search);
  const LOCAL = !(CFG.firebase && CFG.firebase.apiKey) || location.protocol === 'file:' || QP.has('local');
  const DOMAINS = (CFG.domains || ['pcshspt.ac.th']).map(s => s.toLowerCase());
  const UDOMAIN = CFG.usernameDomain || 'vehicle.pcshspt.local';
  const BOOT = (CFG.bootstrapAdmins || []).map(s => s.toLowerCase());
  const KEY = 'pcs-vehicle-db-v1';
  const DAY = 864e5, HOUR = 36e5;
  // คำขอ/ผลประเมินที่จบก่อนวันนี้ (~13 เดือน) = ข้อมูลย้อนหลัง โหลดเมื่อจำเป็นเท่านั้น (ครอบคลุมช่วง ปีงบ/ปีการศึกษา/12 เดือน ในหน้าสถิติ)
  const HISTORY_DAYS = 400;
  const historyCutoff = () => new Date(Date.now() - HISTORY_DAYS * DAY);

  const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const nowISO = () => new Date().toISOString();
  const clone = o => JSON.parse(JSON.stringify(o));
  const beYear = d => new Date(d).getFullYear() + 543;
  // ชื่อผู้ใช้ที่เป็นเบอร์โทร (คนขับ) พิมพ์แบบมีขีด/เว้นวรรคก็ได้ — ตัดเหลือตัวเลขล้วน เช่น 081-448-5831 → 0814485831
  const normUser = u => { const s = String(u || '').trim().toLowerCase(); return /^[\d\s-]+$/.test(s) ? s.replace(/\D/g, '') : s; };
  const emailOf = username => `${normUser(username)}@${UDOMAIN}`;
  const isUsernameEmail = e => String(e || '').endsWith('@' + UDOMAIN);
  const usernameOf = e => isUsernameEmail(e) ? e.split('@')[0] : '';

  // ───────── ค่าคงที่ของระบบ ─────────
  const ROLES = {
    teacher: 'ครู/บุคลากร', driver: 'พนักงานขับรถ', admin: 'แอดมิน', executive: 'ผู้บริหาร', superadmin: 'ผู้ดูแลระบบสูงสุด'
  };
  const STATUS = {
    pending:   { label: 'รอตรวจสอบ', tone: 'wait' },
    revise:    { label: 'ส่งกลับให้แก้ไข', tone: 'warn' },
    approved:  { label: 'อนุมัติแล้ว', tone: 'ok' },
    ontrip:    { label: 'กำลังเดินทาง', tone: 'live', pulse: true },
    returned:  { label: 'กลับถึงแล้ว', tone: 'done' },
    closed:    { label: 'ปิดงานแล้ว', tone: 'done' },
    rejected:  { label: 'ไม่อนุมัติ', tone: 'bad' },
    cancelled: { label: 'ยกเลิก', tone: 'mute' }
  };
  const ASSIGN = { assigned: 'รอออกเดินทาง', ontrip: 'กำลังเดินทาง', returned: 'กลับถึงแล้ว' };
  const VSTATE = {
    free: { label: 'ว่าง', tone: 'free' }, booked: { label: 'มีคิววันนี้', tone: 'booked' },
    ontrip: { label: 'กำลังเดินทาง', tone: 'live', pulse: true }, maint: { label: 'ซ่อมบำรุง', tone: 'bad' }, off: { label: 'งดให้บริการ', tone: 'mute' }
  };
  const KINDS = { van: 'รถตู้', bus: 'รถบัส', minibus: 'รถโดยสาร 6 ล้อ', car: 'รถเก๋ง', suv: 'รถอเนกประสงค์ (SUV)', pickup: 'รถกระบะ', truck: 'รถบรรทุก', special: 'รถเฉพาะกิจ' };
  // ชนิดรถที่ใช้รับส่งคน (แสดงก่อนตอนแอดมินจัดรถ · ชนิดอื่นซ่อนไว้ใต้ปุ่ม "แสดงรถประเภทอื่น")
  const PASSENGER_KINDS = ['van', 'bus', 'minibus', 'car', 'suv'];
  const FEATURES = ['แอร์', 'ไมโครโฟน/ลำโพง', 'จอทีวี', 'ช่องชาร์จ USB', 'ช่องเก็บสัมภาระ', 'เข็มขัดนิรภัยทุกที่นั่ง', 'กล้องหน้ารถ', 'ถังดับเพลิง', 'ชุดปฐมพยาบาล', 'ทางลาด/รองรับวีลแชร์'];
  const EXPENSE = { fuel: 'ค่าน้ำมัน', toll: 'ค่าทางด่วน', parking: 'ค่าที่จอดรถ', other: 'ค่าใช้จ่ายอื่น' };
  const PAY = { cash: 'เงินสด', card: 'บัตรเติมน้ำมัน', transfer: 'โอน/เบิกภายหลัง', credit: 'เครดิตปั๊ม' };
  const RATE_KEYS = { punctual: 'ตรงต่อเวลา', safety: 'ขับขี่ปลอดภัย', manner: 'มารยาทและการบริการ', clean: 'ความสะอาดของรถ' };
  const DEPTS = ['ฝ่ายบริหารงานทั่วไป', 'ฝ่ายบริหารงานวิชาการ', 'ฝ่ายบริหารงานบุคคล', 'ฝ่ายบริหารงานงบประมาณ', 'ฝ่ายกิจการนักเรียนและหอพัก',
    'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'กลุ่มสาระคณิตศาสตร์', 'กลุ่มสาระภาษาไทย', 'กลุ่มสาระภาษาต่างประเทศ', 'กลุ่มสาระสังคมศึกษาฯ',
    'กลุ่มสาระสุขศึกษาและพลศึกษา', 'กลุ่มสาระศิลปะ', 'กลุ่มสาระการงานอาชีพ', 'งานแนะแนว', 'งานห้องสมุด', 'อื่น ๆ'];

  const DEFAULT_CATS = [
    { id: 'meeting', name: 'อบรม/ประชุม', icon: 'users' }, { id: 'contest', name: 'แข่งขัน', icon: 'trophy' },
    { id: 'activity', name: 'ร่วมกิจกรรม', icon: 'sparkles' }, { id: 'intl', name: 'วิเทศสัมพันธ์', icon: 'globe' },
    { id: 'guest', name: 'รับ-ส่งแขก', icon: 'user' }, { id: 'goods', name: 'ยืม-คืน รับ-ซื้อของ', icon: 'package' },
    { id: 'medical', name: 'พยาบาล', icon: 'heart' }, { id: 'finance', name: 'การเงิน', icon: 'banknote' },
    { id: 'docs', name: 'ส่งเอกสาร', icon: 'file' }, { id: 'community', name: 'บริการชุมชน', icon: 'home' },
    { id: 'other', name: 'อื่น ๆ (ระบุ)', icon: 'info', fixed: true }
  ];
  const CAT_ICONS = ['users', 'trophy', 'sparkles', 'globe', 'user', 'package', 'heart', 'banknote', 'file', 'home', 'flag', 'star', 'flask', 'student', 'teacher', 'bus', 'info'];

  // ───────── สถานะ ─────────
  let db = emptyDb();
  let me = null;
  let authState = 'loading';      // loading | out | in
  let authError = '';
  const listeners = new Set();
  function emptyDb() { return { settings: defaultSettings(), vehicles: [], drivers: [], users: [], requests: [], places: [], ratings: [], vprivate: {}, signatures: {} }; }
  function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  function defaultSettings() {
    return {
      schoolName: 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย ปทุมธานี',
      schoolNameEn: 'Princess Chulabhorn Science High School Pathum Thani',
      division: 'ฝ่ายบริหารงานทั่วไป', unit: 'งานยานพาหนะ',
      leadDays: 2,
      school: { name: 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย ปทุมธานี', lat: 14.0436, lng: 100.3773, address: 'ลาดหลุมแก้ว ปทุมธานี' },
      // หมวดงาน (แอดมินแก้ไขได้) — เก็บรหัสหมวดในคำขอ เปลี่ยนชื่อภายหลังสถิติยังถูกต้อง
      categories: DEFAULT_CATS.map((c, i) => ({ ...c, active: true, order: i })),
      contactNote: 'ติดต่อสอบถามเรื่องการขอใช้รถส่วนกลาง ในวันและเวลาราชการ',
      contactPhone: '', contactLine: '', contactRoom: '',
      committee: [
        { id: 'c1', level: 1, position: 'รองผู้อำนวยการ ฝ่ายบริหารงานทั่วไป', name: '', phone: '', email: '', photo: '' },
        { id: 'c2', level: 2, position: 'หัวหน้าฝ่ายบริหารงานทั่วไป', name: '', phone: '', email: '', photo: '' },
        { id: 'c3', level: 2, position: 'หัวหน้างานยานพาหนะ', name: '', phone: '', email: '', photo: '' },
        { id: 'c4', level: 3, position: 'เจ้าหน้าที่งานยานพาหนะ', name: '', phone: '', email: '', photo: '' },
        { id: 'c5', level: 3, position: 'เจ้าหน้าที่งานยานพาหนะ', name: '', phone: '', email: '', photo: '' }
      ],
      counter: {}
    };
  }

  // ───────── ตัวช่วยเรื่องคำขอ ─────────
  const overlap = (a1, a2, b1, b2) => new Date(a1) < new Date(b2) && new Date(b1) < new Date(a2);
  const blocking = r => r.status === 'approved' || r.status === 'ontrip';
  // ลักษณะการเดินทาง
  const TRIP = {
    day: { label: 'ไป-กลับวันเดียว', icon: 'route', hint: 'ออกและกลับถึงโรงเรียนภายในวันเดียว' },
    oneway: { label: 'ไปส่ง หรือไปรับ อย่างเดียว', icon: 'arrowUR', hint: 'รถไปส่ง/ไปรับแล้วกลับโรงเรียนเลย ไม่รอคณะ' },
    overnight: { label: 'ไปหลายวัน ค้างคืน', icon: 'moon', hint: 'รถและคนขับอยู่กับคณะตลอด ค้างคืนที่ปลายทาง' },
    daily: { label: 'ไปหลายวัน ไป-กลับทุกวัน', icon: 'refresh', hint: 'ไม่ค้างคืน รถออกและกลับโรงเรียนทุกวัน ตามเวลาเดียวกัน' }
  };
  const tripType = r => TRIP[r.tripType] ? r.tripType : (sameDay(r.startAt, r.endAt) ? 'day' : 'overnight');
  // ตัวเลือกในแบบฟอร์ม: แยก "ไปส่ง" กับ "ไปรับ" ให้ชัด (เก็บเป็น tripType 'oneway' + onewayDir 'drop' | 'pick')
  const TRIP_UI = {
    day: TRIP.day,
    drop: { label: 'ไปส่งอย่างเดียว', icon: 'arrowUR', hint: 'รถไปส่งคณะแล้วกลับโรงเรียนเลย ไม่รอรับกลับ' },
    pick: { label: 'ไปรับอย่างเดียว', icon: 'arrowDL', hint: 'รถออกไปรับคณะที่ปลายทาง แล้วพากลับโรงเรียน' },
    overnight: TRIP.overnight, daily: TRIP.daily
  };
  const tripUI = r => tripType(r) === 'oneway' ? (r.onewayDir === 'pick' ? 'pick' : 'drop') : tripType(r);
  const tripLabel = r => TRIP_UI[tripUI(r)].label;
  // ช่วงเวลาที่รถ/คนขับไม่ว่าง: ไป-กลับทุกวัน = แยกเป็นรายวัน (กลางคืนรถว่าง) · แบบอื่น = ช่วงเดียวตั้งแต่ออกจนกลับ
  function windows(r) {
    const s = new Date(r.startAt), e = new Date(r.endAt);
    if (tripType(r) !== 'daily' || sameDay(s, e)) return [[s, e]];
    const out = [], d = new Date(s); d.setHours(0, 0, 0, 0);
    while (d <= e && out.length < 400) {
      const a = new Date(d), b = new Date(d);
      a.setHours(s.getHours(), s.getMinutes(), 0, 0); b.setHours(e.getHours(), e.getMinutes(), 0, 0);
      if (b > a) out.push([a, b]);
      d.setDate(d.getDate() + 1);
    }
    return out.length ? out : [[s, e]];
  }
  const hitsAny = (ws, r) => windows(r).some(([a, b]) => ws.some(([c, d]) => overlap(a, b, c, d)));
  const paxText = r => `ครู ${+r.teachers || 0} · นักเรียน ${+r.students || 0}${+r.others ? ` · บุคคลอื่น ${+r.others}` : ''}`;
  // ป้ายสั้นสำหรับการ์ด/ตาราง (ไป-กลับวันเดียวไม่ต้องมีป้าย)
  function tripTag(r) {
    const t = tripType(r), n = Math.round((new Date(new Date(r.endAt).toDateString()) - new Date(new Date(r.startAt).toDateString())) / 864e5) + 1;
    if (t === 'overnight') return { cls: 'night', icon: 'moon', text: `ค้างคืน ${n} วัน ${n - 1} คืน` };
    if (t === 'daily') return { cls: 'navy', icon: 'refresh', text: `ไป-กลับทุกวัน ${n} วัน` };
    if (t === 'oneway') return r.onewayDir === 'pick' ? { cls: '', icon: 'arrowDL', text: 'ไปรับอย่างเดียว' } : r.onewayDir === 'drop' ? { cls: '', icon: 'arrowUR', text: 'ไปส่งอย่างเดียว' } : { cls: '', icon: 'arrowUR', text: 'ไปส่ง/รับอย่างเดียว' };
    return null;
  }
  function rollup(r) {
    if (!['approved', 'ontrip', 'returned'].includes(r.status)) return r.status;
    const a = r.assignments || [];
    if (!a.length) return 'approved';
    if (a.some(x => x.status === 'ontrip')) return 'ontrip';
    // รถทุกคันกลับถึงโรงเรียน = ปิดงานอัตโนมัติ (ไม่มีขั้น "รอปิดงาน" · ค่าใช้จ่ายยังบันทึก/แก้ได้หลังปิดงาน)
    if (a.every(x => x.status === 'returned')) return 'closed';
    return a.some(x => x.status === 'returned') ? 'ontrip' : 'approved';
  }
  // ws (ไม่บังคับ) = ช่วงเวลาของคำขอที่กำลังจัด จาก windows(r) — ใช้แทน start/end เมื่อเป็นแบบไป-กลับทุกวัน
  function vehicleConflicts(vehicleId, start, end, exceptId, ws) {
    const out = [], mine = ws || [[start, end]];
    db.requests.forEach(r => {
      if (r.id === exceptId || !blocking(r)) return;
      (r.assignments || []).forEach(a => { if (a.vehicleId === vehicleId && a.status !== 'returned' && hitsAny(mine, r)) out.push(r); });
    });
    const v = vehicle(vehicleId);
    if (v && v.maint && v.maint.active && mine.some(([a, b]) => overlap(a, b, v.maint.from || '1970-01-01', v.maint.to || '2999-01-01'))) out.push({ id: 'MAINT', dest: v.maint.note || 'ซ่อมบำรุง', maint: true });
    if (v && v.bookable === false) out.push({ id: 'OFF', dest: 'งดให้บริการ', maint: true });
    return out;
  }
  function driverConflicts(driverId, start, end, exceptId, ws) {
    const out = [], mine = ws || [[start, end]];
    db.requests.forEach(r => {
      if (r.id === exceptId || !blocking(r)) return;
      (r.assignments || []).forEach(a => { if (a.driverId === driverId && a.status !== 'returned' && hitsAny(mine, r)) out.push(r); });
    });
    return out;
  }
  function vehicleState(v, at = new Date()) {
    if (v.bookable === false) return { key: 'off', ...VSTATE.off, note: v.note || 'งดให้บริการชั่วคราว' };
    if (v.maint && v.maint.active && (!v.maint.from || new Date(v.maint.from) <= at) && (!v.maint.to || new Date(v.maint.to) >= at)) return { key: 'maint', ...VSTATE.maint, note: v.maint.note || 'ซ่อมบำรุง' };
    let on = null, next = null;
    db.requests.forEach(r => {
      if (!['approved', 'ontrip'].includes(r.status)) return;
      (r.assignments || []).forEach(a => {
        if (a.vehicleId !== v.id) return;
        if (a.status === 'ontrip') on = { r, a };
        else if (a.status === 'assigned' && new Date(r.endAt) > at && sameDay(r.startAt, at) && (!next || r.startAt < next.r.startAt)) next = { r, a };
      });
    });
    if (on) return { key: 'ontrip', ...VSTATE.ontrip, note: `→ ${destName(on.r)} · กลับประมาณ ${UIfmt.when(on.r.endAt)}`, req: on.r };
    if (next) return { key: 'booked', ...VSTATE.booked, note: `ออก ${UIfmt.time(next.r.startAt)} → ${destName(next.r)}`, req: next.r };
    return { key: 'free', ...VSTATE.free, note: 'พร้อมให้บริการ' };
  }
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const destName = r => (r.destinations || []).map(d => d.name).filter(Boolean).join(' · ') || '-';
  const passengers = r => (+r.teachers || 0) + (+r.students || 0) + (+r.others || 0);
  // หมวดงาน
  const categories = (all = false) => (db.settings.categories && db.settings.categories.length ? db.settings.categories : DEFAULT_CATS.map((c, i) => ({ ...c, active: true, order: i })))
    .filter(c => all || c.active !== false).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const catOf = id => categories(true).find(c => c.id === id);
  // หมวด "งานประจำ": ขอในวันได้ (ล่วงหน้าอย่างน้อย quickHours ชั่วโมง) และไม่ต้องแนบบันทึกข้อความ
  // หมวดที่ยังไม่เคยตั้งค่า → ใช้ค่าเริ่มต้น (ส่งเอกสาร · การเงิน · ยืม-คืน รับ-ซื้อของ)
  const DEFAULT_QUICK = ['docs', 'finance', 'goods'];
  const isQuickCat = id => { const c = catOf(id); return c ? (c.quick != null ? !!c.quick : DEFAULT_QUICK.includes(id)) : false; };
  const quickHours = () => (db.settings.quickLeadHours != null ? +db.settings.quickLeadHours : 2);
  // คำขอที่ค้างบันทึกข้อความ: แอดมินบันทึกแทน (เร่งด่วน) · ไม่ใช่งานประจำ · ยังไม่มีไฟล์แนบ · ไม่ได้ยกเลิก/ไม่อนุมัติ
  // (คำขอที่ครูส่งเองต้องแนบตั้งแต่ตอนส่งอยู่แล้ว)
  const needsMemo = r => !!r && !!r.emergency && !isQuickCat(r.category) && !(r.attachments || []).length && !r.memoWaived && !['cancelled', 'rejected'].includes(r.status);
  // จับคู่ชื่อที่แอดมินพิมพ์เอง กับบัญชีผู้ใช้ (ตัดคำนำหน้าและช่องว่าง) — ใช้ติดตามบันทึกข้อความค้าง
  const nameKey = s => String(s || '').replace(/\s+/g, '').replace(/^(นางสาว|น\.ส\.|นาย|นาง|ดร\.|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.)/, '');
  const userByName = n => { const k = nameKey(n); if (k.length < 3) return null; const m = db.users.filter(u => nameKey(u.name) === k); return m.length === 1 ? m[0] : null; };
  // ── ลายเซ็นอิเล็กทรอนิกส์ (วาดเองเท่านั้น · เก็บที่ signatures/{email} อ่านได้เฉพาะเจ้าของและผู้บริหาร/แอดมิน) ──
  const onlyDriverRole = u => (u.roles || []).length > 0 && (u.roles || []).every(r => r === 'driver');
  const needsSign = u => !!u && !u.sigAt && !onlyDriverRole(u);
  const sigCache = new Map();
  // ผู้ลงนามในบันทึกข้อความ (ตั้งค่า → บันทึกข้อความขอใช้รถ)
  const memoSigners = () => { const m = db.settings.memo || {}; return { head: String(m.headEmail || '').toLowerCase(), deputy: String(m.depEmail || '').toLowerCase() }; };
  const signerRoles = u => { if (!u) return []; const s = memoSigners(); return [s.head === u.email && 'head', s.deputy === u.email && 'deputy'].filter(Boolean); };
  const needsMySign = (r, role) => ['approved', 'ontrip', 'returned', 'closed'].includes(r.status) && !((r.esign || {})[role]) && (role === 'head' || !!(r.esign || {}).head);
  const memoDebts = email => email ? db.requests.filter(r => r.requester && r.requester.email === email && needsMemo(r)).sort((a, b) => a.startAt.localeCompare(b.startAt)) : [];
  const catName = r => { if (!r || !r.category) return 'ไม่ระบุ'; if (r.category === 'other') return r.categoryOther ? `อื่น ๆ: ${r.categoryOther}` : 'อื่น ๆ'; const c = catOf(r.category); return c ? c.name : 'ไม่ระบุ'; };
  const seatsOf = list => (list || []).reduce((s, a) => s + (+(vehicle(a.vehicleId) || {}).seats || 0), 0);

  // ฟอร์แมตเวลาแบบย่อ (ใช้ภายใน store; หน้าเว็บมี UI.fmt ที่ครบกว่า)
  const UIfmt = {
    time: d => new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' น.',
    when: d => sameDay(d, new Date()) ? UIfmt.time(d) : new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + UIfmt.time(d)
  };

  // ───────── การค้นหา ─────────
  const vehicle = id => db.vehicles.find(v => v.id === id);
  const driver = id => db.drivers.find(d => d.id === id);
  const user = email => db.users.find(u => u.email === String(email || '').toLowerCase());
  const request = id => db.requests.find(r => r.id === id);
  const has = (u, role) => !!u && (u.roles || []).includes(role);
  const isAdmin = u => has(u, 'admin') || has(u, 'superadmin');
  const isSuper = u => has(u, 'superadmin');
  const isExec = u => has(u, 'executive');
  const isDriver = u => has(u, 'driver');
  const isBack = u => isAdmin(u) || isExec(u);
  const driverOfUser = u => u && db.drivers.find(d => d.email && d.email === u.email);

  // ───────── การแจ้งเตือนในเว็บ (คำนวณจากประวัติ) ─────────
  const SEEN_KEY = () => 'pcs-vehicle-seen-' + (me ? me.email : '');
  function notifications() {
    if (!me) return [];
    // ครั้งแรกที่ใช้เครื่องนี้: นับเป็น "ใหม่" เฉพาะความเคลื่อนไหว 3 วันล่าสุด
    let seen = localStorage.getItem(SEEN_KEY());
    if (!seen) { seen = new Date(Date.now() - 3 * DAY).toISOString(); localStorage.setItem(SEEN_KEY(), seen); }
    const out = [], nowStr = nowISO();   // เวลาในอนาคต (นาฬิกาเครื่องเพี้ยน) ไม่นับเป็น "ใหม่" ค้างตลอด
    const myDriver = driverOfUser(me);
    const T = {
      approve: 'คำขอได้รับการอนุมัติ', reject: 'คำขอไม่ได้รับการอนุมัติ', revise: 'แอดมินส่งคำขอกลับให้แก้ไข', reassign: 'แอดมินปรับรถ/คนขับ',
      depart: 'รถออกเดินทางแล้ว', return: 'รถกลับถึงโรงเรียนแล้ว', close: 'ปิดงานแล้ว', submit: 'มีคำขอใช้รถใหม่', resubmit: 'มีคำขอที่แก้ไขแล้วส่งใหม่', cancel: 'ผู้ขอยกเลิกคำขอ', emergency: 'แอดมินบันทึกคำขอเร่งด่วน',
      memo: 'ผู้ขอแนบบันทึกข้อความตามหลังแล้ว', memowaive: 'แอดมินยกเว้นบันทึกข้อความแล้ว — ขอใช้รถครั้งต่อไปได้'
    };
    db.requests.forEach(r => {
      (r.history || []).forEach(h => {
        if (h.by === me.email) return;
        let mine = false, link = '';
        if (r.requester && r.requester.email === me.email && ['approve', 'reject', 'revise', 'reassign', 'depart', 'return', 'close', 'memowaive'].includes(h.action)) { mine = true; link = `#/my/${r.id}`; }
        if (isAdmin(me) && ['submit', 'resubmit', 'cancel', 'memo'].includes(h.action)) { mine = true; link = `#/admin/requests/${r.id}`; }
        if (myDriver && ['approve', 'reassign', 'emergency'].includes(h.action) && (r.assignments || []).some(a => a.driverId === myDriver.id)) { mine = true; link = `#/driver`; }
        if (mine && T[h.action]) out.push({ id: r.id + h.at + h.action, at: h.at, title: T[h.action], body: `${r.id} · ${destName(r)}${h.note ? ' — ' + h.note : ''}`, link, unread: h.at > seen && h.at <= nowStr });
      });
    });
    // งานที่ต้องทำ (task): แสดงในรายการจนกว่าจะทำเสร็จ · นับในตัวเลขกระดิ่งเฉพาะที่ยังไม่เคยเปิดดู
    let seenTasks = []; try { seenTasks = JSON.parse(localStorage.getItem(SEEN_KEY() + '-tasks') || '[]'); } catch (e) { /* ใช้ค่าว่าง */ }
    const task = o => out.push({ ...o, task: true, unread: !seenTasks.includes(o.id) });
    // ผู้ลงนามอิเล็กทรอนิกส์: มีบันทึกข้อความรอลงนาม
    signerRoles(me).forEach(ro => { const n = db.requests.filter(r => needsMySign(r, ro)).length; if (n) task({ id: 'esign-' + ro + n, at: nowISO(), title: `บันทึกข้อความรอลงนาม ${n} ฉบับ`, body: ro === 'head' ? 'ในฐานะหัวหน้างานยานพาหนะ' : 'ในฐานะรองผู้อำนวยการฝ่ายบริหารงานทั่วไป', link: `#/admin/esign?role=${ro}` }); });
    memoDebts(me.email).forEach(r => task({ id: 'memo' + r.id, at: r.createdAt, title: 'ค้างบันทึกข้อความ — กรุณาแนบ', body: `${r.id} · ${destName(r)} · ต้องแนบก่อนจึงจะขอใช้รถครั้งต่อไปได้`, link: `#/my/${r.id}` }));
    pendingRatings().forEach(p => task({ id: 'rate' + p.r.id + p.i, at: p.a.returnedAt, title: 'ประเมินคนขับรถ', body: `${p.r.id} · ${destName(p.r)} · ${(driver(p.a.driverId) || {}).name || ''}`, link: `#/rate/${p.r.id}/${p.i}`, rate: true }));
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);
  }
  // เปิดกระดิ่ง = อ่านแล้ว · silent: ไม่วาดหน้าใหม่ทันที (รายการที่กำลังเปิดดูยังอยู่ จนกว่าจะปิด/เปลี่ยนหน้า)
  function markSeen(silent) {
    const tasks = notifications().filter(n => n.task).map(n => n.id);
    localStorage.setItem(SEEN_KEY(), nowISO());
    localStorage.setItem(SEEN_KEY() + '-tasks', JSON.stringify(tasks));
    if (!silent) emit();
  }
  function pendingRatings() {
    if (!me) return [];
    const out = [];
    db.requests.forEach(r => {
      if (!r.requester || r.requester.email !== me.email) return;
      (r.assignments || []).forEach((a, i) => {
        if (a.status === 'returned' && !a.rated && !a.ratingSkipped && a.returnedAt && Date.now() - new Date(a.returnedAt) < 7 * DAY) out.push({ r, a, i });
      });
    });
    return out;
  }

  // ═══════════════════════ ข้อมูลตัวอย่าง (โหมดทดลอง) ═══════════════════════
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function seed() {
    const R = rng(20261104);
    const pick = a => a[Math.floor(R() * a.length)];
    const S = defaultSettings();
    const D = [
      ['d1', 'นายสวง เพไร', '081-448-5831', 'sawong'], ['d2', 'นายบุญทัน กองไธสง', '080-601-3159', 'boontan'], ['d3', 'นายพัลลภ สุนทร', '062-451-3747', 'pallop'],
      ['d4', 'นายมานะชัย จันทร์บำรุง', '085-385-3492', 'manachai'], ['d5', 'นายอธิเทพ นาคทอง', '092-396-3804', 'athithep'], ['d6', 'นายไชยวัฒน์ กุณฑล', '093-565-6662', 'chaiwat'],
      ['d7', 'นายนัดระพงษ์ ยืนบั่ง', '099-205-4081', 'nattapong']
    ];
    const drivers = D.map(([id, name, phone, un], i) => ({ id, name, phone, email: emailOf(un), photo: '', licenseNo: '', licenseExpiry: addDays(new Date(), 120 + i * 90).toISOString().slice(0, 10), note: '', active: true, order: i }));
    const V = [
      [1, 'รถตู้ 01', '1นฌ 8758 กทม.', 'TOYOTA', 'Commuter', 'van', 12, 'd1', 'สีเงิน'], [2, 'รถตู้ 02', '1นซ 1976 กทม.', 'TOYOTA', 'Commuter', 'van', 12, 'd2', 'สีเงิน'],
      [3, 'รถตู้ 03', 'ฮล 4536 กทม.', 'TOYOTA', 'Commuter', 'van', 12, 'd3', 'สีขาว'], [4, 'รถตู้ 04', 'ฮจ 1618 กทม.', 'TOYOTA', 'Hiace', 'van', 12, 'd4', 'สีขาว'],
      [5, 'รถตู้ 05', 'ย 0567 ปทุมธานี', 'TOYOTA', 'Hiace', 'van', 12, 'd4', 'สีขาว'], [6, 'รถกระบะ 06', 'ย 0566 ปทุมธานี', 'TOYOTA', 'Hilux Revo', 'pickup', 3, 'd5', 'สีขาว'],
      [7, 'รถโดยสาร 6 ล้อ', '40-0686 ปทุมธานี', 'MITSUBISHI', 'Fuso', 'minibus', 25, 'd2', 'สีขาว-น้ำเงิน'], [8, 'รถบัสโดยสาร', '40-0889 ปทุมธานี', 'HINO', 'RN8J', 'bus', 35, 'd2', 'ขาว-แดง-น้ำเงิน'],
      [9, 'รถกระบะ 09', '1ฒศ 4050 กทม.', 'TOYOTA', 'Hilux Revo', 'pickup', 3, 'd6', 'สีเทา'], [10, 'รถฟอร์จูนเนอร์', '3ขว 9163 กทม.', 'TOYOTA', 'Fortuner', 'suv', 6, 'd7', 'สีดำ'],
      [11, 'รถกระเช้า', '83-9417 ปทุมธานี', 'ISUZU', 'FRR', 'truck', 2, 'd6', 'สีขาว'], [12, 'รถขนขยะ', '82-8443 ปทุมธานี', 'TOYOTA', 'Dyna', 'truck', 2, 'd5', 'สีเขียว'],
      [13, 'รถขนน้ำ', 'ไม่มีเลขทะเบียน', 'KUBOTA', 'RT', 'special', 1, 'd5', 'สีส้ม'], [14, 'รถกอล์ฟไฟฟ้า', 'ไม่มีเลขทะเบียน', 'EI-GO', 'Golf cart', 'special', 4, 'd4', 'สีขาว']
    ];
    const photoOf = { 1: ['images/fleet.jpg'], 2: ['images/fleet.jpg'], 8: ['images/bus-side.jpg', 'images/bus-team.jpg', 'images/fleet.jpg'] };
    const vehicles = V.map(([no, name, plate, brand, model, kind, seats, driverId, color], i) => ({
      id: 'v' + no, no, name, plate, brand, model, kind, type: KINDS[kind], color, seats, driverId, order: i,
      photos: photoOf[no] || [], features: kind === 'van' ? ['แอร์', 'ช่องชาร์จ USB', 'ช่องเก็บสัมภาระ', 'เข็มขัดนิรภัยทุกที่นั่ง'] : kind === 'bus' ? ['แอร์', 'ไมโครโฟน/ลำโพง', 'จอทีวี', 'ช่องเก็บสัมภาระ', 'ถังดับเพลิง', 'ชุดปฐมพยาบาล'] : kind === 'minibus' ? ['แอร์', 'ไมโครโฟน/ลำโพง', 'ช่องเก็บสัมภาระ'] : kind === 'car' || kind === 'suv' ? ['แอร์', 'ช่องชาร์จ USB'] : [],
      suitable: kind === 'bus' ? 'ทัศนศึกษา ค่าย และการเดินทางเป็นหมู่คณะใหญ่' : kind === 'van' ? 'ประชุม อบรม แข่งขัน คณะไม่เกิน 12 คน' : kind === 'car' ? 'ผู้บริหาร/ประชุมระยะใกล้ 1–3 คน' : kind === 'suv' ? 'ผู้บริหาร/คณะเล็กไม่เกิน 6 คน เดินทางไกลหรือทางขรุขระ' : kind === 'pickup' ? 'ขนวัสดุอุปกรณ์ ไม่เหมาะกับการรับส่งคน' : 'งานเฉพาะกิจภายในโรงเรียน',
      rules: kind === 'bus' || kind === 'van' || kind === 'minibus' ? 'งดรับประทานอาหารที่มีกลิ่นในรถ · คาดเข็มขัดนิรภัยทุกครั้ง · ตรวจสอบสัมภาระก่อนลงจากรถ' : '',
      note: '(ข้อมูลตัวอย่าง — แก้ไขได้ในหลังบ้าน)', bookable: true,
      maint: no === 5 ? { active: true, from: addDays(new Date(), -1).toISOString(), to: addDays(new Date(), 2).toISOString(), note: 'เปลี่ยนยาง + เช็กระยะ 100,000 กม.' } : { active: false, from: '', to: '', note: '' }
    }));
    const vprivate = {};
    vehicles.forEach((v, i) => {
      vprivate[v.id] = {
        id: v.id, chassisNo: '', engineNo: '', fuelType: v.kind === 'special' && v.no === 14 ? 'ไฟฟ้า' : 'ดีเซล', fuelCard: '',
        actExpiry: addDays(new Date(), i === 2 ? 18 : 40 + i * 23).toISOString().slice(0, 10),
        taxExpiry: addDays(new Date(), i === 5 ? 9 : 60 + i * 17).toISOString().slice(0, 10),
        insurance: { company: pick(['วิริยะประกันภัย', 'ทิพยประกันภัย', 'กรุงเทพประกันภัย']), cls: pick(['ชั้น 1', 'ชั้น 2+', 'ชั้น 3']), policyNo: 'POL-' + (68000 + i * 37), expiry: addDays(new Date(), 50 + i * 21).toISOString().slice(0, 10), phone: '1557' },
        repairs: i < 6 ? [
          { id: uid('rp'), date: addDays(new Date(), -40 - i * 9).toISOString().slice(0, 10), item: pick(['เปลี่ยนน้ำมันเครื่อง + กรอง', 'เปลี่ยนผ้าเบรกหน้า', 'ซ่อมระบบแอร์', 'เปลี่ยนแบตเตอรี่']), garage: pick(['ศูนย์ TOYOTA รังสิต', 'อู่ช่างเอก ลาดหลุมแก้ว']), cost: 1800 + Math.round(R() * 6000), mileage: 80000 + i * 7000, note: '', photos: [] },
          { id: uid('rp'), date: addDays(new Date(), -120 - i * 11).toISOString().slice(0, 10), item: 'เช็กระยะตามรอบ', garage: 'ศูนย์บริการ', cost: 2500 + Math.round(R() * 3000), mileage: 70000 + i * 7000, note: '', photos: [] }
        ] : [],
        maintenancePlan: [{ id: uid('mp'), item: 'เปลี่ยนน้ำมันเครื่อง', everyKm: 10000, everyMonths: 6, lastDate: addDays(new Date(), -100).toISOString().slice(0, 10), lastKm: 85000 }],
        accidents: [], notes: ''
      };
    });
    const T = [
      ['kanokwan.s', 'ครูกนกวรรณ ศรีสุข', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี'], ['thanapol.w', 'ครูธนพล วงศ์ใหญ่', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี'], ['wilaiporn.m', 'ครูวิไลพร มณีรัตน์', 'ฝ่ายบริหารงานวิชาการ'],
      ['attapol.k', 'ครูอรรถพล แก้วประเสริฐ', 'กลุ่มสาระคณิตศาสตร์'], ['supawadee.t', 'ครูสุภาวดี ทองคำ', 'ฝ่ายบริหารงานทั่วไป'], ['piyanuch.j', 'ครูปิยะนุช ใจดี', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี'],
      ['nattawut.p', 'ครูณัฐวุฒิ พรหมมา', 'กลุ่มสาระการงานอาชีพ'], ['somjai.r', 'ครูสมใจ รักวิทยา', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี'], ['chanida.l', 'ครูชนิดา ลือชัย', 'กลุ่มสาระภาษาต่างประเทศ'], ['prasert.n', 'ครูประเสริฐ นิลสุวรรณ', 'ฝ่ายกิจการนักเรียนและหอพัก']
    ];
    const teacherUsers = T.map(([u, name, dept], i) => ({ email: `${u}@pcshspt.ac.th`, name, dept, phone: `08${i}-${100 + i * 7}-${2000 + i * 13}`, position: 'ครู', roles: ['teacher'], active: true, provider: 'google', createdAt: addDays(new Date(), -200).toISOString() }));
    const users = [
      { email: 'tripop@pcshspt.ac.th', name: 'นายตรีภพ (ผู้ดูแลระบบ)', dept: 'ฝ่ายบริหารงานทั่วไป', phone: '', position: 'ครู', roles: ['teacher', 'admin', 'superadmin'], active: true, provider: 'google' },
      { email: emailOf('admin'), name: 'แอดมินงานยานพาหนะ', dept: 'ฝ่ายบริหารงานทั่วไป', phone: '', position: 'เจ้าหน้าที่', roles: ['admin'], active: true, provider: 'username', password: 'admin1234' },
      { email: 'director@pcshspt.ac.th', name: 'ผู้อำนวยการโรงเรียน (ตัวอย่าง)', dept: 'ผู้บริหาร', phone: '', position: 'ผู้อำนวยการ', roles: ['executive'], active: true, provider: 'google' },
      ...teacherUsers,
      ...drivers.map(d => ({ email: d.email, name: d.name, dept: 'งานยานพาหนะ', phone: d.phone, position: 'พนักงานขับรถ', roles: ['driver'], active: true, provider: 'username', password: '1234', driverId: d.id }))
    ];
    const P = [
      ['สพม.ปทุมธานี', 'ต.บางปรอก อ.เมืองปทุมธานี จ.ปทุมธานี', 'ปทุมธานี', 14.0167, 100.5300, 24, 35], ['อุทยานวิทยาศาสตร์ประเทศไทย (สวทช.)', 'ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี', 'ปทุมธานี', 14.0790, 100.6040, 31, 40],
      ['มหาวิทยาลัยเกษตรศาสตร์ บางเขน', 'แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร', 'กรุงเทพมหานคร', 13.8470, 100.5717, 44, 60], ['มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต', 'ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี', 'ปทุมธานี', 14.0700, 100.6020, 30, 40],
      ['กระทรวงศึกษาธิการ', 'แขวงวัดโสมนัส เขตป้อมปราบศัตรูพ่าย กรุงเทพมหานคร', 'กรุงเทพมหานคร', 13.7590, 100.5080, 52, 75], ['ท่าอากาศยานสุวรรณภูมิ', 'ต.หนองปรือ อ.บางพลี จ.สมุทรปราการ', 'สมุทรปราการ', 13.6900, 100.7501, 72, 80],
      ['อุทยานแห่งชาติเขาใหญ่', 'อ.ปากช่อง จ.นครราชสีมา', 'นครราชสีมา', 14.4390, 101.3720, 165, 150], ['สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)', 'แขวงวัดโสมนัส เขตป้อมปราบศัตรูพ่าย กรุงเทพมหานคร', 'กรุงเทพมหานคร', 13.7600, 100.5100, 52, 75],
      ['มหาวิทยาลัยมหิดล ศาลายา', 'ต.ศาลายา อ.พุทธมณฑล จ.นครปฐม', 'นครปฐม', 13.7940, 100.3240, 38, 50], ['สถาบันส่งเสริมการสอนวิทยาศาสตร์และเทคโนโลยี (สสวท.)', 'แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร', 'กรุงเทพมหานคร', 13.7250, 100.5850, 60, 80],
      ['โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย ลพบุรี', 'อ.เมืองลพบุรี จ.ลพบุรี', 'ลพบุรี', 14.7990, 100.6530, 110, 100], ['ศูนย์ประชุมแห่งชาติสิริกิติ์', 'แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร', 'กรุงเทพมหานคร', 13.7230, 100.5590, 58, 80]
    ];
    const places = P.map(([name, address, province, lat, lng, km, mins], i) => ({ id: 'p' + i, name, address, province, lat, lng, km, mins, count: 1 + Math.round(R() * 8) }));
    const catFor = p => /ประชุม|อบรม/.test(p) ? 'meeting' : /แข่ง|โครงงาน/.test(p) ? 'contest' : /ทัศน|ค่าย|ดูงาน|กิจกรรม/.test(p) ? 'activity' : /วิทยากร|ต้อนรับ|รับ-ส่ง/.test(p) ? (/ต่างประเทศ/.test(p) ? 'intl' : 'guest') : /เอกสาร|ส่งผลงาน/.test(p) ? 'docs' : /เงิน|ธนาคาร/.test(p) ? 'finance' : /ซื้อ|ยืม|วัสดุ/.test(p) ? 'goods' : /โรงพยาบาล/.test(p) ? 'medical' : /จิตอาสา|ชุมชน/.test(p) ? 'community' : 'other';
    const PURPOSE = ['เบิกเงินและฝากเงินธนาคาร', 'ซื้อวัสดุอุปกรณ์การเรียน', 'นำนักเรียนส่งโรงพยาบาล', 'ต้อนรับคณะครูจากต่างประเทศ', 'จิตอาสาพัฒนาชุมชน', 'ประชุมเชิงปฏิบัติการ', 'นำนักเรียนแข่งขันวิชาการ', 'ทัศนศึกษา', 'อบรมพัฒนาครู', 'ยื่นเอกสารราชการ', 'รับ-ส่งวิทยากร', 'นำเสนอโครงงานวิทยาศาสตร์', 'ค่ายวิทยาศาสตร์', 'ศึกษาดูงาน'];
    const requests = [], ratings = [], seedBusy = [];
    let n = 0;
    const mkId = d => { n++; return `VR-${beYear(d)}-${String(n).padStart(4, '0')}`; };
    const vansAndBus = vehicles.filter(v => PASSENGER_KINDS.includes(v.kind) && v.no !== 5);
    function mk(startAt, endAt, opts = {}) {
      const t = opts.teacher || pick(teacherUsers), p = opts.place || pick(places);
      const students = opts.students != null ? opts.students : (R() < .5 ? Math.round(R() * 30) : 0), teachers = opts.teachers || 1 + Math.round(R() * 3);
      const pax = students + teachers;
      let vs = opts.vehicles;
      if (!vs) { const big = pax > 12; vs = big ? [vehicles.find(v => v.no === 8)] : [pick(vansAndBus.filter(v => v.kind === 'van' || (pax <= 6 && (v.kind === 'car' || v.kind === 'suv'))))]; if (pax > 35) vs.push(vehicles.find(v => v.no === 1)); }
      const created = addDays(new Date(startAt), -3 - Math.round(R() * 6)).toISOString();
      const id = mkId(startAt);
      const r = {
        id, createdAt: created, updatedAt: created, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(),
        requester: { email: t.email, name: t.name, dept: t.dept, phone: t.phone },
        purpose: opts.purpose || pick(PURPOSE), project: opts.project || '', category: '', categoryOther: '', destinations: [{ ...p, id: p.id }], totalKm: p.km * 2, totalMins: p.mins,
        overnight: !sameDay(startAt, endAt), lodging: !sameDay(startAt, endAt) ? 'ที่พักของหน่วยงานผู้จัด' : '', teachers, students, others: 0, passengerNames: '',
        pickup: 'หน้าอาคารอำนวยการ', contactPhone: t.phone, note: '', attachments: [], status: opts.status || 'closed', emergency: false, createdBy: t.email,
        history: [{ at: created, by: t.email, byName: t.name, action: 'submit', note: '' }], decision: null, assignments: [], expenses: []
      };
      if (!['pending', 'revise', 'rejected', 'cancelled'].includes(r.status)) {
        const at = addDays(new Date(created), 1).toISOString();
        r.decision = { by: 'tripop@pcshspt.ac.th', byName: 'นายตรีภพ (ผู้ดูแลระบบ)', at, action: 'approve', note: opts.decisionNote || (R() < .4 ? 'ขอให้มาถึงจุดนัดก่อนเวลา 15 นาที' : '') };
        r.history.push({ at, by: 'tripop@pcshspt.ac.th', byName: 'นายตรีภพ (ผู้ดูแลระบบ)', action: 'approve', note: r.decision.note });
        // ข้อมูลตัวอย่าง: เลือกคนขับที่ไม่ติดงานอื่นในช่วงเวลาเดียวกัน (ใช้ผู้ดูแลรถก่อน)
        const used = new Set();
        const free = id => !used.has(id) && !seedBusy.some(b => b.d === id && new Date(startAt) < b.e && b.s < new Date(endAt));
        const drv = v => { const d = free(v.driverId) ? v.driverId : ((drivers.find(x => free(x.id)) || {}).id || v.driverId); used.add(d); seedBusy.push({ d, s: new Date(startAt), e: new Date(endAt) }); return d; };
        r.assignments = vs.map(v => ({ vehicleId: v.id, driverId: drv(v), note: v.kind === 'bus' ? `รถบัสนั่งได้ ${v.seats} ที่นั่ง` : '', status: 'assigned', departedAt: '', returnedAt: '', odoStart: null, odoEnd: null, rated: false }));
      }
      if (r.status === 'rejected') { const at = addDays(new Date(created), 1).toISOString(); r.decision = { by: 'tripop@pcshspt.ac.th', byName: 'นายตรีภพ (ผู้ดูแลระบบ)', at, action: 'reject', note: 'รถไม่ว่างในช่วงเวลาดังกล่าว แนะนำให้เลื่อนวันเดินทาง' }; r.history.push({ at, by: r.decision.by, byName: r.decision.byName, action: 'reject', note: r.decision.note }); }
      if (r.status === 'revise') { const at = addDays(new Date(created), 1).toISOString(); r.decision = { by: 'tripop@pcshspt.ac.th', byName: 'นายตรีภพ (ผู้ดูแลระบบ)', at, action: 'revise', note: 'บันทึกข้อความยังไม่มีลายเซ็นผู้อำนวยการ กรุณาแนบฉบับที่ลงนามแล้ว' }; r.history.push({ at, by: r.decision.by, byName: r.decision.byName, action: 'revise', note: r.decision.note }); }
      if (['closed', 'returned', 'ontrip'].includes(r.status)) {
        r.assignments.forEach(a => {
          const odo0 = 60000 + Math.round(R() * 40000);
          a.status = r.status === 'ontrip' ? 'ontrip' : 'returned';
          a.departedAt = new Date(new Date(r.startAt).getTime() + Math.round(R() * 15) * 6e4).toISOString(); a.odoStart = odo0;
          if (a.status === 'returned') {
            a.returnedAt = new Date(new Date(r.endAt).getTime() + Math.round(R() * 40 - 10) * 6e4).toISOString(); a.odoEnd = odo0 + r.totalKm + Math.round(R() * 10);
            r.history.push({ at: a.departedAt, by: (drivers.find(d => d.id === a.driverId) || {}).email, byName: (drivers.find(d => d.id === a.driverId) || {}).name, action: 'depart', note: vehicle2(vehicles, a.vehicleId).name });
            r.history.push({ at: a.returnedAt, by: (drivers.find(d => d.id === a.driverId) || {}).email, byName: (drivers.find(d => d.id === a.driverId) || {}).name, action: 'return', note: vehicle2(vehicles, a.vehicleId).name });
            const v = vehicle2(vehicles, a.vehicleId), kmpl = v.kind === 'bus' ? 4.2 : v.kind === 'minibus' ? 6 : v.kind === 'car' ? 13 : v.kind === 'suv' ? 10 : 9.5;
            const liters = Math.round((a.odoEnd - a.odoStart) / kmpl * 10) / 10, ppl = 31.94 + Math.round(R() * 80) / 100;
            if (r.totalKm > 40 || R() < .6) r.expenses.push({ id: uid('ex'), vehicleId: a.vehicleId, type: 'fuel', date: a.returnedAt.slice(0, 10), station: pick(['ปตท. ลาดหลุมแก้ว', 'บางจาก คลองหลวง', 'เชลล์ รังสิต']), liters, pricePerL: ppl, amount: Math.round(liters * ppl), odo: a.odoEnd, pay: pick(['card', 'cash', 'credit']), photos: [], note: '', by: 'tripop@pcshspt.ac.th', at: a.returnedAt });
            if (/กรุงเทพ|สมุทรปราการ/.test(r.destinations[0].province)) r.expenses.push({ id: uid('ex'), vehicleId: a.vehicleId, type: 'toll', date: a.returnedAt.slice(0, 10), station: 'ทางพิเศษ', liters: 0, pricePerL: 0, amount: 50 + Math.round(R() * 4) * 25, odo: null, pay: 'cash', photos: [], note: '', by: 'tripop@pcshspt.ac.th', at: a.returnedAt });
            if (r.status === 'closed' && R() < .85) {
              a.rated = true;
              const sc = () => R() < .15 ? 4 : 5;
              ratings.push({ id: uid('rt'), at: a.returnedAt, driverId: a.driverId, vehicleId: a.vehicleId, scores: { punctual: sc(), safety: sc(), manner: sc(), clean: R() < .3 ? 4 : 5 }, comment: R() < .35 ? pick(['ขับรถสุภาพ ปลอดภัยมากค่ะ', 'มาตรงเวลา ช่วยยกของให้ด้วย ขอบคุณครับ', 'รถสะอาด แอร์เย็น', 'บริการดีมาก']) : '' });
            }
          } else {
            r.history.push({ at: a.departedAt, by: (drivers.find(d => d.id === a.driverId) || {}).email, byName: (drivers.find(d => d.id === a.driverId) || {}).name, action: 'depart', note: vehicle2(vehicles, a.vehicleId).name });
          }
        });
        if (r.status === 'closed') r.history.push({ at: addDays(new Date(r.endAt), 1).toISOString(), by: 'tripop@pcshspt.ac.th', byName: 'นายตรีภพ (ผู้ดูแลระบบ)', action: 'close', note: '' });
      }
      r.category = opts.category || catFor(r.purpose); if (r.category === 'other') r.categoryOther = 'ขนย้ายอุปกรณ์งานพิธี';
      r.status = rollupLike(r);
      r.driverEmails = r.assignments.map(a => (drivers.find(d => d.id === a.driverId) || {}).email).filter(Boolean);
      requests.push(r);
      return r;
    }
    // ย้อนหลัง ~5 เดือน
    for (let d = -150; d <= -1; d++) {
      const day = addDays(startOfDay(new Date()), d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      const k = R() < .25 ? 2 : R() < .55 ? 1 : 0;
      for (let j = 0; j < k; j++) {
        const st = new Date(day); st.setHours(6 + Math.round(R() * 4), R() < .5 ? 0 : 30, 0, 0);
        const p = pick(places), multi = p.km > 100 && R() < .6;
        const en = multi ? addDays(st, 1 + Math.round(R())) : new Date(st.getTime() + (3 + Math.round(R() * 6)) * HOUR);
        const roll = R();
        mk(st, en, { place: p, status: roll < .07 ? 'rejected' : roll < .11 ? 'cancelled' : 'closed' });
      }
    }
    // วันนี้ (อ้างอิงเวลาปัจจุบัน)
    // ถ้าสร้างข้อมูลนอกเวลาทำการ ให้ยึด 10:30 น. ของวันนี้ (ตัวอย่างจะเห็นรถเลยเวลากลับ → แจ้งเตือนในหลังบ้าน)
    const t0 = new Date(); const hh = t0.getHours();
    if (hh < 7 || hh > 16) t0.setHours(10, 30, 0, 0); else t0.setMinutes(t0.getMinutes() < 30 ? 0 : 30, 0, 0);
    const at = h => new Date(t0.getTime() + h * HOUR);
    const tByU = u => teacherUsers.find(x => x.email.startsWith(u));
    const V8 = vehicles.find(v => v.no === 8), V1 = vehicles.find(v => v.no === 1), V2 = vehicles.find(v => v.no === 2), V3 = vehicles.find(v => v.no === 3), V10 = vehicles.find(v => v.no === 10), V7 = vehicles.find(v => v.no === 7), V4 = vehicles.find(v => v.no === 4);
    const r1 = mk(at(-4.5), at(-1.5), { teacher: tByU('kanokwan'), place: places[5], purpose: 'รับวิทยากรค่ายโอลิมปิกวิชาการ', students: 0, teachers: 1, vehicles: [V1], status: 'returned' });
    r1.assignments[0].rated = false;
    const r1b = mk(at(-5), at(-2), { teacher: tByU('somjai'), place: places[1], purpose: 'ส่งผลงานโครงงานวิทยาศาสตร์', students: 4, teachers: 1, vehicles: [V4], status: 'returned' });
    r1b.assignments[0].rated = false;
    mk(at(-1.5), at(5), { teacher: tByU('thanapol'), place: places[2], purpose: 'ทัศนศึกษางานเกษตรแฟร์ ม.4', students: 40, teachers: 5, vehicles: [V8, V2], status: 'ontrip', decisionNote: 'ใช้รถบัส + รถตู้ 02 เนื่องจากผู้เดินทาง 45 คน รถบัสนั่งได้ 35 คน' });
    mk(at(1.5), at(5), { teacher: tByU('attapol'), place: places[1], purpose: 'นำเสนอโครงงานวิทยาศาสตร์', students: 10, teachers: 2, vehicles: [V3], status: 'approved' });
    mk(at(2.5), at(6), { teacher: tByU('supawadee'), place: places[4], purpose: 'ยื่นเอกสารโครงการห้องเรียนพิเศษ', students: 0, teachers: 2, vehicles: [V10], status: 'approved' });
    mk(at(3.5), addDays(at(3.5), 2), { teacher: tByU('piyanuch'), place: places[6], purpose: 'ค่ายวิทยาศาสตร์ธรรมชาติ ม.5', students: 22, teachers: 3, vehicles: [V7], status: 'approved' });
    // ล่วงหน้า + รอตรวจสอบ
    for (let d = 1; d <= 20; d++) {
      const day = addDays(startOfDay(new Date()), d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      if (R() < .55) { const st = new Date(day); st.setHours(7 + Math.round(R() * 3), 0, 0, 0); mk(st, new Date(st.getTime() + (4 + Math.round(R() * 4)) * HOUR), { status: d >= 3 && R() < .45 ? 'pending' : 'approved' }); }
    }
    const pd = addDays(startOfDay(new Date()), 4); pd.setHours(8, 0, 0, 0);
    mk(pd, new Date(pd.getTime() + 6 * HOUR), { teacher: tByU('nattawut'), place: places[3], purpose: 'แข่งขันหุ่นยนต์ระดับภาค', students: 6, teachers: 2, status: 'pending' });
    const rv = addDays(startOfDay(new Date()), 6); rv.setHours(8, 30, 0, 0);
    mk(rv, new Date(rv.getTime() + 5 * HOUR), { teacher: tByU('somjai'), place: places[9], purpose: 'อบรมครูวิทยาศาสตร์ สสวท.', students: 0, teachers: 3, status: 'revise' });
    const pd2 = addDays(startOfDay(new Date()), 9); pd2.setHours(7, 0, 0, 0);
    mk(pd2, addDays(pd2, 1), { teacher: tByU('somjai'), place: places[10], purpose: 'ศึกษาดูงานเครือข่าย จภ.', students: 8, teachers: 2, status: 'pending' });
    S.counter = { [beYear(new Date())]: n };
    return { settings: S, vehicles, drivers, users, requests, places, ratings, vprivate };
  }
  function vehicle2(list, id) { return list.find(v => v.id === id) || {}; }
  function rollupLike(r) { return rollup(r); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  // ═══════════════════════ ตัวเชื่อมข้อมูล (Adapter) ═══════════════════════
  let A = null;

  // ───── โหมดทดลอง ─────
  function makeLocal() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    db = saved && saved.v === 1 ? saved.db : seed();
    if (!db.settings.categories) db.settings.categories = defaultSettings().categories;
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, db })); } catch (e) { console.warn('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม', e); if (typeof UI !== 'undefined') UI.toast('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม (โหมดทดลอง) ลองลบรูปบางส่วน', 'error'); } };
    save();
    // เปิดหลายแท็บในเครื่องเดียว: แท็บหนึ่งบันทึก → แท็บอื่นเห็นทันที (โหมดจริงใช้ Firestore เรียลไทม์แทน)
    window.addEventListener('storage', e => {
      if (e.key !== KEY || !e.newValue) return;
      try { const s = JSON.parse(e.newValue); if (s && s.v === 1) { db = s.db; if (me) me = user(me.email) || me; emit(); } } catch (err) { /* ข้าม */ }
    });
    const sessKey = 'pcs-vehicle-session';
    const cols = { vehicles: 'id', drivers: 'id', users: 'email', requests: 'id', places: 'id', ratings: 'id' };
    return {
      async start() {
        // โหมดทดลองเท่านั้น: ?as=อีเมล หรือ ?as=username เพื่อเข้าเป็นบัญชีตัวอย่างทันที (ใช้สาธิต/ทดสอบ)
        if (QP.get('as')) { const a = QP.get('as').toLowerCase(); localStorage.setItem(sessKey, a.includes('@') ? a : emailOf(a)); }
        const em = localStorage.getItem(sessKey);
        const u = em && user(em);
        if (u && u.active) { me = u; authState = 'in'; } else { authState = 'out'; }
        emit();
      },
      async put(col, id, data) {
        if (col === 'settings') db.settings = clone(data);
        else if (col === 'vprivate') db.vprivate[id] = clone(data);
        else if (col === 'signatures') (db.signatures = db.signatures || {})[id] = clone(data);
        else {
          const k = cols[col], list = db[col], i = list.findIndex(x => x[k] === id);
          if (i >= 0) list[i] = clone(data); else list.push(clone(data));
        }
        if (me) me = user(me.email) || me;
        save(); emit();
      },
      // อ่านฉบับล่าสุด → แก้ด้วย fn → บันทึก (also(col, id, data) = บันทึกเอกสารอื่นพร้อมกัน)
      async update(col, id, fn) {
        const k = cols[col], cur = db[col].find(x => x[k] === id);
        if (!cur) throw new Error('ไม่พบข้อมูล อาจถูกลบไปแล้ว');
        const extra = [];
        const next = fn(clone(cur), (c, i, d) => extra.push([c, i, d]));
        for (const [c, i, d] of extra) await this.put(c, i, d);
        await this.put(col, id, next);
        return next;
      },
      async getDoc(col, id) { return col === 'signatures' ? clone((db.signatures || {})[id] || null) : null; },
      async del(col, id) {
        if (col === 'vprivate') delete db.vprivate[id];
        else db[col] = db[col].filter(x => x[cols[col]] !== id);
        save(); emit();
      },
      async nextId(d) {
        const y = beYear(d || new Date());
        db.settings.counter = db.settings.counter || {};
        db.settings.counter[y] = (db.settings.counter[y] || 0) + 1;
        save();
        return `VR-${y}-${String(db.settings.counter[y]).padStart(4, '0')}`;
      },
      async loginGoogle(email) {
        email = String(email || '').toLowerCase();
        let u = user(email);
        if (!u) {
          const okDomain = DOMAINS.some(d => email.endsWith('@' + d)) || BOOT.includes(email);
          if (!okDomain) throw new Error('ใช้ได้เฉพาะอีเมล @' + DOMAINS[0] + ' หรืออีเมลที่แอดมินเพิ่มไว้');
          u = { email, name: '', dept: '', phone: '', position: 'ครู', roles: BOOT.includes(email) ? ['teacher', 'admin', 'superadmin'] : ['teacher'], active: true, provider: 'google', needsProfile: true, createdAt: nowISO() };
          await this.put('users', email, u);
        }
        if (!u.active) throw new Error('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อแอดมิน');
        localStorage.setItem(sessKey, email); me = user(email); authState = 'in'; emit();
      },
      async loginUsername(username, password) {
        const u = user(emailOf(username));
        if (!u || u.password !== password) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        if (!u.active) throw new Error('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อแอดมิน');
        localStorage.setItem(sessKey, u.email); me = u; authState = 'in'; emit();
      },
      async logout() { localStorage.removeItem(sessKey); me = null; authState = 'out'; emit(); },
      async createAccount({ username, password }) { return emailOf(username); },
      async setPassword(email, password) { const u = user(email); if (u) { u.password = password; save(); } },
      async changeOwnPassword(password) { const u = user(me.email); u.password = password; u.mustChangePassword = false; save(); me = u; emit(); },
      async upload(files) { return files; },          // เก็บ dataURL ในเบราว์เซอร์
      async fileUrl(ref) { return ref; },
      histState: () => 'done',                         // โหมดทดลองมีข้อมูลครบในเครื่องอยู่แล้ว
      async loadHistory() {},
      reset() { localStorage.removeItem(KEY); localStorage.removeItem(sessKey); location.reload(); }
    };
  }

  // ───── แคชรูปถาวรในเครื่อง + คิวดาวน์โหลด (รูปขึ้นเร็วตั้งแต่ครั้งที่ 2 · ไม่ยิงคำขอพร้อมกันจนช้า) ─────
  const DISK = 'vb-drive-img-v1';
  const diskGet = async id => { try { if (!('caches' in window)) return null; const r = await (await caches.open(DISK)).match('drive-img/' + id); return r ? await r.blob() : null; } catch (e) { return null; } };
  const diskPut = async (id, blob) => { try { if ('caches' in window) await (await caches.open(DISK)).put('drive-img/' + id, new Response(blob, { headers: { 'content-type': blob.type } })); } catch (e) { /* เครื่องไม่รองรับ/เต็ม — ข้ามได้ */ } };
  const diskClear = () => { try { if ('caches' in window) caches.delete(DISK); } catch (e) { /* ข้าม */ } };
  const fileQ = []; let fileActive = 0;
  const pump = () => { while (fileActive < 4 && fileQ.length) { const job = fileQ.shift(); fileActive++; job().finally(() => { fileActive--; pump(); }); } };
  const queued = fn => new Promise((res, rej) => { fileQ.push(() => fn().then(res, rej)); pump(); });

  // ───── โหมดจริง: Firebase ─────
  function makeCloud() {
    firebase.initializeApp(CFG.firebase);
    const auth = firebase.auth(), fs = firebase.firestore();
    try { fs.settings({ ignoreUndefinedProperties: true }); } catch (e) { /* ตั้งไว้แล้ว */ }
    fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    const colName = { vehicles: 'vehicles', drivers: 'drivers', users: 'users', requests: 'requests', places: 'places', ratings: 'ratings', vprivate: 'vehiclePrivate', signatures: 'signatures' };
    const strip = o => JSON.parse(JSON.stringify(o));
    // แปลงข้อผิดพลาดของ Firestore เป็นข้อความที่ผู้ใช้เข้าใจ (ข้อผิดพลาดจากการตรวจข้อมูลของระบบส่งต่อตามเดิม)
    const friendly = e => {
      const c = String((e && e.code) || '');
      if (/permission-denied/.test(c)) return new Error('ไม่มีสิทธิ์ทำรายการนี้ (หรือสถานะงานเปลี่ยนไปแล้ว ลองรีเฟรชหน้า)');
      if (/unavailable|deadline-exceeded/.test(c) || /offline/i.test((e && e.message) || '')) return new Error('เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
      if (/aborted|failed-precondition/.test(c)) return new Error('มีผู้อื่นแก้ไขรายการนี้พร้อมกัน กรุณาลองใหม่');
      return e;
    };
    const guard = p => p.catch(e => { throw friendly(e); });
    let unsubs = [], reqMaps = {}, rateMaps = {}, profileUnsub = null, warned = false;
    // ประหยัดโควตาอ่าน: แอดมิน/ผู้บริหารฟังเรียลไทม์เฉพาะคำขอ/ผลประเมิน ~13 เดือนล่าสุด
    // ข้อมูลเก่ากว่านั้นโหลดครั้งเดียวเมื่อหน้าที่ต้องใช้ขอ (needHistory) — histState: none | loading | done
    let histState = 'none', dataGen = 0;
    const stopAll = () => { unsubs.forEach(u => { try { u(); } catch (e) { /* ข้าม */ } }); unsubs = []; reqMaps = {}; rateMaps = {}; histState = 'none'; dataGen++; };
    const stopProfile = () => { if (profileUnsub) { try { profileUnsub(); } catch (e) { /* ข้าม */ } } profileUnsub = null; };
    // ตัวรับฟังเรียลไทม์หลุด → แจ้งผู้ใช้ครั้งเดียว (ไม่ให้เห็นข้อมูลว่างโดยไม่รู้สาเหตุ)
    const onErr = name => e => {
      console.error('Firestore', name, e);
      if (!warned && typeof UI !== 'undefined') { warned = true; UI.toast('โหลดข้อมูลบางส่วนไม่สำเร็จ: ' + friendly(e).message, 'error'); }
    };
    const mergeReq = () => {
      const m = new Map();
      Object.values(reqMaps).forEach(mp => mp.forEach((v, k) => m.set(k, v)));
      db = { ...db, requests: [...m.values()].sort((a, b) => a.startAt.localeCompare(b.startAt)) };
      emit();
    };
    const mergeRatings = () => {
      const m = new Map();
      Object.values(rateMaps).forEach(mp => mp.forEach((v, k) => m.set(k, v)));
      db = { ...db, ratings: [...m.values()] };
      emit();
    };
    async function loadHistory() {
      if (histState !== 'none' || !me || !isBack(me)) return;
      histState = 'loading';
      const gen = dataGen, cut = historyCutoff().toISOString();
      try {
        const [rq, rt] = await Promise.all([
          fs.collection('requests').where('endAt', '<', cut).get(),
          fs.collection('ratings').where('at', '<', cut).get()
        ]);
        if (gen !== dataGen) return;   // ออกจากระบบ/เปลี่ยนสิทธิ์ระหว่างโหลด
        const mq = new Map(); rq.docs.forEach(d => mq.set(d.id, d.data())); reqMaps.history = mq;
        const mr = new Map(); rt.docs.forEach(d => mr.set(d.id, d.data())); rateMaps.history = mr;
        histState = 'done';
        mergeRatings(); mergeReq();
      } catch (e) {
        if (gen !== dataGen) return;
        histState = 'none'; onErr('history')(e); emit();
      }
    }
    // ข้อมูลย้อนหลังไม่ได้ฟังเรียลไทม์ → แก้คำขอเก่าจากเครื่องนี้แล้วอัปเดตในหน่วยความจำให้ด้วย
    function keepHistory(col, id, data) {
      if (col !== 'requests' || !reqMaps.history || !reqMaps.history.has(id)) return;
      reqMaps.history.set(id, strip(data));
      mergeReq();
    }
    function listenReq(name, q) {
      reqMaps[name] = new Map();
      unsubs.push(q.onSnapshot(s => { const mp = new Map(); s.docs.forEach(d => mp.set(d.id, d.data())); reqMaps[name] = mp; mergeReq(); }, onErr('requests/' + name)));
    }
    function startData() {
      stopAll(); warned = false;
      const col = n => fs.collection(n);
      unsubs.push(fs.collection('config').doc('settings').onSnapshot(s => { db = { ...db, settings: { ...defaultSettings(), ...(s.data() || {}) } }; emit(); }, onErr('config')));
      ['vehicles', 'drivers'].forEach(n => unsubs.push(col(n).onSnapshot(s => { db = { ...db, [n]: s.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0)) }; emit(); }, onErr(n))));
      unsubs.push(col('places').orderBy('count', 'desc').limit(400).onSnapshot(s => { db = { ...db, places: s.docs.map(d => d.data()) }; emit(); }, onErr('places')));
      if (isBack(me)) listenReq('recent', col('requests').where('endAt', '>=', historyCutoff().toISOString()));
      else listenReq('window', col('requests').where('endAt', '>=', new Date(Date.now() - 45 * DAY).toISOString()));
      listenReq('mine', col('requests').where('requester.email', '==', me.email));   // "การขอใช้รถของฉัน" ครบทุกใบ (รวมแอดมินที่ขอรถเอง)
      if (isAdmin(me)) {
        unsubs.push(col('users').onSnapshot(s => { db = { ...db, users: s.docs.map(d => d.data()) }; if (me) me = db.users.find(u => u.email === me.email) || me; emit(); }, onErr('users')));
      }
      if (isBack(me)) unsubs.push(col('vehiclePrivate').onSnapshot(s => { const o = {}; s.docs.forEach(d => { o[d.id] = d.data(); }); db = { ...db, vprivate: o }; emit(); }, onErr('vehiclePrivate')));
      if (isBack(me)) unsubs.push(col('ratings').where('at', '>=', historyCutoff().toISOString()).onSnapshot(s => { const mp = new Map(); s.docs.forEach(d => mp.set(d.id, d.data())); rateMaps.recent = mp; mergeRatings(); }, onErr('ratings')));
    }
    async function loadMe(fu) {
      const email = String(fu.email || '').toLowerCase();
      const ref = fs.collection('users').doc(email);
      let snap = await ref.get().catch(() => null);
      let u = snap && snap.exists ? snap.data() : null;
      const isGoogle = (fu.providerData || []).some(p => p.providerId === 'google.com');
      if (!u) {
        const okDomain = isGoogle && (DOMAINS.some(d => email.endsWith('@' + d)) || BOOT.includes(email));
        if (!okDomain) throw new Error('บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งาน (ใช้ได้เฉพาะอีเมล @' + DOMAINS[0] + ' หรืออีเมลที่แอดมินเพิ่มไว้)');
        u = { email, name: fu.displayName || '', dept: '', phone: '', position: 'ครู', roles: BOOT.includes(email) ? ['teacher', 'admin', 'superadmin'] : ['teacher'], active: true, provider: 'google', needsProfile: true, createdAt: nowISO(), photoURL: fu.photoURL || '' };
        await ref.set(u);
      }
      if (!u.active) throw new Error('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อแอดมิน');
      // ติดตามโปรไฟล์ตัวเอง (แยกจากตัวรับฟังข้อมูล ไม่ให้ startData ปิดทิ้ง)
      // แอดมินเปลี่ยนสิทธิ์ → โหลดข้อมูลตามสิทธิ์ใหม่ทันที · ปิดการใช้งาน → ออกจากระบบทันที
      stopProfile();
      profileUnsub = ref.onSnapshot(s => {
        if (!s.exists) return;
        const was = JSON.stringify(me && me.roles);
        me = s.data();
        if (me.active === false) { authError = 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อแอดมิน'; auth.signOut(); return; }
        if (authState === 'in' && was !== JSON.stringify(me.roles)) startData();
        emit();
      }, onErr('profile'));
      return u;
    }
    async function callScript(action, payload) {
      if (!CFG.appsScriptUrl) throw new Error('ยังไม่ได้ตั้งค่าที่เก็บไฟล์ (Apps Script) กรุณาติดต่อแอดมิน');
      if (!auth.currentUser) throw new Error('กรุณาเข้าสู่ระบบใหม่');
      const idToken = await auth.currentUser.getIdToken();
      let res;
      try { res = await fetch(CFG.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, idToken, ...payload }) }); }
      catch (e) { throw new Error('เชื่อมต่อ Apps Script ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'); }
      const data = await res.json().catch(() => ({ ok: false, error: 'Apps Script ตอบกลับผิดรูปแบบ' }));
      if (!data.ok) throw new Error(data.error || 'Apps Script ตอบกลับผิดพลาด');
      return data;
    }
    const fileCache = new Map();
    return {
      async start() {
        auth.onAuthStateChanged(async fu => {
          stopAll(); stopProfile();
          if (!fu) { me = null; authState = 'out'; db = emptyDb(); emit(); return; }
          try { me = await loadMe(fu); authError = ''; authState = 'in'; startData(); emit(); }
          catch (e) { stopProfile(); authError = friendly(e).message; me = null; authState = 'out'; await auth.signOut(); emit(); }
        });
      },
      histState: () => histState,
      loadHistory,
      async put(col, id, data) {
        if (col === 'settings') return guard(fs.collection('config').doc('settings').set(strip(data)));
        await guard(fs.collection(colName[col]).doc(id).set(strip(data)));
        keepHistory(col, id, data);
      },
      // แก้เอกสารแบบธุรกรรม: อ่านฉบับล่าสุดจากเซิร์ฟเวอร์ → fn แก้ → เขียน
      // ถ้ามีเครื่องอื่นเขียนก่อน Firestore จะเรียก fn ใหม่กับข้อมูลล่าสุดเอง (ไม่มีการเขียนทับกัน)
      // fn ต้องไม่มี async และอาจถูกเรียกซ้ำ · also(col, id, data) = เขียนเอกสารอื่นในธุรกรรมเดียวกัน
      async update(col, id, fn) {
        const ref = fs.collection(colName[col]).doc(id);
        const next = await guard(fs.runTransaction(async tx => {
          const s = await tx.get(ref);
          if (!s.exists) throw new Error('ไม่พบข้อมูล อาจถูกลบไปแล้ว');
          const extra = [];
          const next = fn(clone(s.data()), (c, i, d) => extra.push([c, i, d]));
          extra.forEach(([c, i, d]) => tx.set(fs.collection(colName[c]).doc(i), strip(d)));
          tx.set(ref, strip(next));
          return next;
        }));
        keepHistory(col, id, next);
        return next;
      },
      async getDoc(col, id) { const s = await guard(fs.collection(colName[col]).doc(id).get()); return s.exists ? s.data() : null; },
      async del(col, id) { return guard(fs.collection(colName[col]).doc(id).delete()); },
      async nextId(d) {
        const y = beYear(d || new Date());
        const ref = fs.collection('counters').doc(String(y));
        const n = await guard(fs.runTransaction(async tx => { const s = await tx.get(ref); const v = ((s.exists && s.data().n) || 0) + 1; tx.set(ref, { n: v }); return v; }));
        return `VR-${y}-${String(n).padStart(4, '0')}`;
      },
      async loginGoogle() {
        authError = '';
        const p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        await auth.signInWithPopup(p);
      },
      async loginUsername(username, password) {
        authError = '';
        try { await auth.signInWithEmailAndPassword(emailOf(username), password); }
        catch (e) { throw new Error(/wrong-password|user-not-found|invalid-credential|invalid-login/.test(e.code || e.message) ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : /too-many/.test(e.code || '') ? 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่' : e.message); }
      },
      async logout() { await auth.signOut(); },
      // สร้างบัญชี username ด้วยแอปสำรอง (ไม่ทำให้แอดมินหลุดจากระบบ)
      async createAccount({ username, password }) {
        const email = emailOf(username);
        const sec = firebase.apps.find(a => a.name === 'creator') || firebase.initializeApp(CFG.firebase, 'creator');
        try { await sec.auth().createUserWithEmailAndPassword(email, password); }
        catch (e) { if (!/email-already-in-use/.test(e.code || '')) throw new Error(/weak-password/.test(e.code || '') ? 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' : e.message); throw new Error('ชื่อผู้ใช้นี้ถูกใช้แล้ว'); }
        finally { await sec.auth().signOut().catch(() => {}); }
        return email;
      },
      async setPassword(email, password) { await callScript('setpassword', { email, password }); },
      async changeOwnPassword(password) {
        try { await auth.currentUser.updatePassword(password); }
        catch (e) { throw new Error(/requires-recent-login/.test(e.code || '') ? 'กรุณาออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยนรหัสผ่าน' : /weak-password/.test(e.code || '') ? 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' : e.message); }
        await fs.collection('users').doc(me.email).set({ mustChangePassword: false }, { merge: true });
      },
      // ส่งไฟล์ใหม่ (dataURL) ไป Google Drive ผ่าน Apps Script · ไฟล์ที่อัปโหลดแล้ว (drive:...) ส่งต่อตามเดิม
      // meta: kind = ประเภท (แยกโฟลเดอร์ใน Drive) · ref = เลขคำขอ/ชื่อรถ (ใช้ตั้งชื่อไฟล์) · label = คำอธิบายไฟล์
      async upload(files, meta = {}) {
        return Promise.all((files || []).map(async (f, i) => {
          const m = typeof f === 'string' && f.match(/^data:([^;]+);base64,(.+)$/);
          if (!m) return f;
          const r = await callScript('upload', { mime: m[1], data: m[2], kind: meta.kind || '', ref: meta.ref || '', label: meta.label || '', n: i + 1 });
          return 'drive:' + r.id;
        }));
      },
      // รูปจาก Drive: 1) แคชในหน่วยความจำ 2) แคชถาวรในเครื่อง (Cache Storage · เฉพาะรูปภาพ ไม่เก็บ PDF) 3) ดึงผ่าน Apps Script ครั้งละไม่เกิน 4 ไฟล์
      async fileUrl(ref) {
        const s = String(ref || '');
        if (!s.startsWith('drive:')) return s;
        const id = s.slice(6);
        if (!fileCache.has(id)) fileCache.set(id, (async () => {
          let blob = await diskGet(id);
          if (!blob) {
            const r = await queued(() => callScript('file', { id }));
            const bin = atob(r.data), bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            blob = new Blob([bytes], { type: r.mime });
            if (/^image\//.test(r.mime)) diskPut(id, blob);
          }
          return URL.createObjectURL(blob);
        })().catch(e => { fileCache.delete(id); throw e; }));
        return fileCache.get(id);
      },
      reset() { location.reload(); }
    };
  }

  // ═══════════════════════ คำสั่งที่หน้าเว็บเรียกใช้ ═══════════════════════
  const H = (action, note = '') => ({ at: nowISO(), by: me.email, byName: me.name || me.email, action, note });
  const needAdmin = () => { if (!isAdmin(me)) throw new Error('เฉพาะแอดมินเท่านั้น'); };
  const driverEmailsOf = list => (list || []).map(a => (driver(a.driverId) || {}).email).filter(Boolean);
  // ปิดท้ายทุกครั้งที่บันทึกคำขอ: เวลาแก้ไข + สถานะรวม
  // driverEmails คำนวณใหม่เฉพาะแอดมิน (ผู้มอบหมายงาน) — กฎ Firestore ห้ามคนขับแตะฟิลด์นี้
  const finishReq = r => { r.updatedAt = nowISO(); const was = r.status; r.status = rollup(r); if (r.status === 'closed' && was !== 'closed') r.closedAt = nowISO(); if (isAdmin(me) || !r.driverEmails) r.driverEmails = driverEmailsOf(r.assignments); return r; };
  // ผูก/เปลี่ยนอีเมลคนขับ (เช่น สร้างบัญชีให้คนขับหลังอนุมัติงานไปแล้ว) → อัปเดต driverEmails ในงานที่ยังไม่จบ
  // ไม่งั้นคนขับกดออกเดินทาง/กลับถึงไม่ได้ เพราะกฎ Firestore ตรวจสิทธิ์คนขับจาก driverEmails
  async function syncDriverEmails(driverId, email) {
    if (!isAdmin(me) || !driverId) return;
    const emailOfA = a => a.driverId === driverId ? email : (driver(a.driverId) || {}).email;
    const open = db.requests.filter(r => ['approved', 'ontrip', 'returned'].includes(r.status) && (r.assignments || []).some(a => a.driverId === driverId));
    for (const r of open) {
      await A.update('requests', r.id, x => ({ ...x, driverEmails: (x.assignments || []).map(emailOfA).filter(Boolean), updatedAt: nowISO() }));
    }
  }
  const createReq = r => A.put('requests', r.id, finishReq(r)).then(() => r);
  // แก้คำขอที่มีอยู่: ใช้ข้อมูลล่าสุดจากฐานข้อมูลกลางเสมอ (ธุรกรรม) → หลายเครื่องกดพร้อมกันไม่ทับกัน
  // fn(r, also) แก้ r แล้วคืนค่า · ตรวจสิทธิ์/สถานะใน fn อีกครั้งเพราะข้อมูลอาจเปลี่ยนจากเครื่องอื่น
  const mutateReq = (id, fn) => A.update('requests', id, (r, also) => finishReq(fn(r, also) || r));
  const MEMO = id => ({ kind: 'memo', ref: id, label: 'บันทึกข้อความ' });
  const cleanReqInput = (x) => ({
    category: String(x.category || ''), categoryOther: x.category === 'other' ? String(x.categoryOther || '').trim() : '',
    purpose: String(x.purpose || '').trim(), project: String(x.project || '').trim(),
    destinations: (x.destinations || []).map(d => ({ id: d.id || uid('pl'), name: d.name, address: d.address || '', province: d.province || '', lat: d.lat ?? null, lng: d.lng ?? null, km: +d.km || 0, mins: +d.mins || 0 })),
    totalKm: +x.totalKm || 0, totalMins: +x.totalMins || 0,
    startAt: new Date(x.startAt).toISOString(), endAt: new Date(x.endAt).toISOString(),
    ...(() => {
      const one = sameDay(x.startAt, x.endAt);
      // วันเดียว: ไป-กลับ หรือ ไปส่ง/รับอย่างเดียว · หลายวัน: ค้างคืน หรือ ไป-กลับทุกวัน
      // แบบฟอร์มส่งค่า drop / pick มา (หรือ oneway + onewayDir จากข้อมูลเดิม)
      const ow = ['drop', 'pick', 'oneway'].includes(x.tripType);
      const t = one ? (ow ? 'oneway' : 'day') : (x.tripType === 'daily' ? 'daily' : 'overnight');
      const dir = t === 'oneway' ? (x.tripType === 'pick' || (x.tripType === 'oneway' && x.onewayDir === 'pick') ? 'pick' : 'drop') : '';
      return { tripType: t, onewayDir: dir, overnight: t === 'overnight', lodging: t === 'overnight' ? String(x.lodging || '').trim() : '' };
    })(),
    teachers: +x.teachers || 0, students: +x.students || 0, others: +x.others || 0, passengerNames: String(x.passengerNames || '').trim(),
    pickup: String(x.pickup || '').trim(), contactPhone: String(x.contactPhone || '').trim(), note: String(x.note || '').trim(), attachments: x.attachments || []
  });
  // กฎขอล่วงหน้า: งานประจำ = อย่างน้อย quickHours ชั่วโมง · หมวดอื่น = อย่างน้อย leadDays วัน
  function checkLead(x) {
    if (isQuickCat(x.category)) {
      const h = quickHours();
      if (new Date(x.startAt) < new Date(Date.now() + h * 36e5)) throw new Error(`งาน${catName(x)} ต้องขอก่อนเวลาออกอย่างน้อย ${h} ชั่วโมง (ถ้าด่วนกว่านี้ กรุณาโทรหาแอดมิน)`);
      return;
    }
    const lead = +db.settings.leadDays || 0;
    if (startOfDay(x.startAt) < addDays(startOfDay(new Date()), lead)) throw new Error(`ต้องขอใช้รถล่วงหน้าอย่างน้อย ${lead} วัน (ถ้าเร่งด่วน กรุณาโทรหาแอดมิน)`);
  }
  const checkCat = x => { if (!x.category) throw new Error('กรุณาเลือกหมวดงาน'); if (x.category === 'other' && !x.categoryOther) throw new Error('กรุณาระบุหมวดงาน (อื่น ๆ)'); };
  async function rememberPlaces(dests) {
    for (const d of dests) {
      if (!d.name) continue;
      const ex = db.places.find(p => p.name === d.name);
      const p = ex ? { ...ex, count: (ex.count || 0) + 1, km: d.km || ex.km, mins: d.mins || ex.mins, lat: d.lat ?? ex.lat, lng: d.lng ?? ex.lng, address: d.address || ex.address, province: d.province || ex.province }
        : { id: uid('p'), name: d.name, address: d.address || '', province: d.province || '', lat: d.lat ?? null, lng: d.lng ?? null, km: d.km || 0, mins: d.mins || 0, count: 1 };
      await A.put('places', p.id, p).catch(e => console.warn('จำสถานที่ไม่สำเร็จ', e));
    }
  }

  const api = {
    LOCAL, ROLES, STATUS, ASSIGN, VSTATE, KINDS, PASSENGER_KINDS, FEATURES, EXPENSE, PAY, RATE_KEYS, DEPTS, DOMAINS, UDOMAIN,
    get db() { return db; }, get me() { return me; }, get authState() { return authState; }, get authError() { return authError; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start() { A = LOCAL ? makeLocal() : makeCloud(); return A.start(); },
    reset() { A.reset(); },
    // ค้นหา
    vehicle, driver, user, request, has, isAdmin, isSuper, isExec, isDriver, isBack, driverOfUser, emailOf, usernameOf, isUsernameEmail,
    categories, catOf, catName, CAT_ICONS, DEFAULT_CATS,
    vehicleState, vehicleConflicts, driverConflicts, destName, passengers, seatsOf, overlap, sameDay, rollup,
    TRIP, TRIP_UI, tripType, tripUI, tripLabel, windows, tripTag, paxText,
    DEFAULT_QUICK, isQuickCat, quickHours, needsMemo, memoDebts, userByName,
    needsSign, memoSigners, signerRoles, needsMySign,
    // ลายเซ็น: อ่านจากแคช (ใช้ตอนวาดเอกสาร) / โหลดล่วงหน้า / บันทึกของตัวเอง
    sigOf: email => sigCache.get(String(email || '').toLowerCase()) || null,
    async loadSignatures(emails) {
      const todo = [...new Set((emails || []).filter(Boolean).map(e => e.toLowerCase()))].filter(e => !sigCache.has(e));
      await Promise.all(todo.map(async e => { try { const d = await A.getDoc('signatures', e); sigCache.set(e, d && d.img ? d.img : null); } catch (err) { sigCache.set(e, null); } }));
    },
    async saveSignature(img) {
      if (!me) throw new Error('กรุณาเข้าสู่ระบบ');
      if (!/^data:image\/png;base64,/.test(img || '') || img.length > 280000) throw new Error('ลายเซ็นไม่ถูกต้อง กรุณาเซ็นใหม่');
      const at = nowISO();
      await A.put('signatures', me.email, { email: me.email, img, at });
      sigCache.set(me.email, img);
      const u = { ...me, sigAt: at, updatedAt: at };
      await A.put('users', me.email, u); me = u; emit();
    },
    // ลงนามอิเล็กทรอนิกส์ในบันทึกข้อความ (หัวหน้างานยานพาหนะ / รองผู้อำนวยการ) — ลงได้หลายคำขอพร้อมกัน
    async esign(ids, role, { decision = 'allow', note = '' } = {}) {
      if (!signerRoles(me).includes(role)) throw new Error('บัญชีนี้ไม่ได้ถูกกำหนดเป็นผู้ลงนามในตำแหน่งนี้ (ตั้งค่า → บันทึกข้อความขอใช้รถ)');
      if (!me.sigAt) throw new Error('กรุณาเซ็นชื่อในหน้าโปรไฟล์ก่อน');
      if (role === 'deputy' && decision === 'deny' && !String(note).trim()) throw new Error('กรุณาระบุเหตุผลที่ไม่อนุญาต');
      let n = 0;
      for (const id of ids) {
        await mutateReq(id, r => {
          if (!needsMySign(r, role)) return r;
          r.esign = { ...(r.esign || {}), [role]: { email: me.email, name: me.name || me.email, position: me.position || '', at: nowISO(), ...(role === 'deputy' ? { decision, note: String(note).trim() } : {}) } };
          r.history.push(H('esign', role === 'head' ? 'หัวหน้างานยานพาหนะลงนาม' : `รองผู้อำนวยการลงนาม: ${decision === 'deny' ? 'ไม่อนุญาต' : 'อนุญาต'}${note ? ' · ' + note : ''}`));
          n++; return r;
        });
      }
      return n;
    },
    notifications, markSeen, pendingRatings,
    // ข้อมูลย้อนหลัง (เก่ากว่า ~13 เดือน): หน้าที่ต้องใช้ข้อมูลตั้งแต่วันที่ from เรียกฟังก์ชันนี้ตอนสร้างหน้า
    // คืนค่า true = ยังโหลดไม่เสร็จ (ให้หน้าแสดงว่ากำลังโหลด) · โหลดเสร็จระบบแจ้งให้หน้าวาดใหม่เอง
    needHistory(from) {
      if (!A || !me || !isBack(me)) return false;
      const st = A.histState();
      if (st === 'done') return false;
      if (st === 'loading') return true;
      if (from && new Date(from) >= historyCutoff()) return false;
      setTimeout(() => A.loadHistory(), 0);   // ไม่เรียกระหว่างวาดหน้า
      return true;
    },
    myRequests: () => me ? db.requests.filter(r => r.requester && r.requester.email === me.email).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [],
    // ── เข้าสู่ระบบ ──
    loginGoogle: email => A.loginGoogle(email),
    loginUsername: (u, p) => A.loginUsername(u, p),
    logout: () => { diskClear(); return A.logout(); },   // ออกจากระบบ = ล้างรูปที่แคชไว้ (เครื่องใช้ร่วมกัน)
    // โหลดรูปที่ใช้บ่อยไว้ล่วงหน้าตอนว่าง (รูปรถ คนขับ คณะทำงาน) → เปิดหน้าไหนก็ขึ้นทันที
    warmImages() {
      if (LOCAL || !me) return;
      const refs = [...db.vehicles.map(v => (v.photos || [])[0]), ...db.drivers.map(d => d.photo), ...((db.settings.committee || []).map(c => c.photo))].filter(x => typeof x === 'string' && x.startsWith('drive:'));
      [...new Set(refs)].forEach(ref => A.fileUrl(ref).catch(() => {}));
    },
    changeOwnPassword: p => A.changeOwnPassword(p),
    async saveProfile(data) {
      const u = { ...me, name: String(data.name || '').trim(), dept: data.dept || '', phone: String(data.phone || '').trim(), position: String(data.position || '').trim(), needsProfile: false, updatedAt: nowISO() };
      await A.put('users', u.email, u); me = u; emit();
    },
    // ── ไฟล์ ──
    upload: files => A.upload(files), fileUrl: ref => A.fileUrl(ref),
    // ── คำขอใช้รถ ──
    async submitRequest(input) {
      const x = cleanReqInput(input);
      checkCat(x);
      const debts = memoDebts(me.email);
      if (debts.length) throw new Error(`ยังขอใช้รถไม่ได้ — มีคำขอที่ค้างบันทึกข้อความ: ${debts.map(r => r.id).join(', ')} กรุณาแนบให้เรียบร้อยก่อน`);
      checkLead(x);
      if (new Date(x.endAt) <= new Date(x.startAt)) throw new Error('เวลากลับต้องหลังเวลาออกเดินทาง');
      if (!isQuickCat(x.category) && !(x.attachments || []).length) throw new Error('กรุณาแนบบันทึกข้อความขออนุญาตใช้รถ');
      // ออกเลขคำขอก่อน เพื่อตั้งชื่อไฟล์บันทึกข้อความใน Drive ด้วยเลขคำขอ (ค้นในโฟลเดอร์ได้ง่าย)
      const id = await A.nextId(x.startAt);
      x.attachments = await A.upload(x.attachments, MEMO(id));
      const r = { id, createdAt: nowISO(), ...x, requester: { email: me.email, name: me.name, dept: me.dept, phone: me.phone }, status: 'pending', emergency: false, createdBy: me.email, history: [H('submit')], decision: null, assignments: [], expenses: [] };
      await createReq(r); rememberPlaces(x.destinations);
      return r;
    },
    async updateRequest(id, input) {
      const admin = isAdmin(me);
      const canEdit = r => admin || (r.requester.email === me.email && ['pending', 'revise'].includes(r.status));
      const EDIT_MSG = 'แก้ไขได้เฉพาะคำขอที่ยังรอตรวจสอบหรือถูกส่งกลับให้แก้ไข';
      const cur = request(id);
      if (!cur) throw new Error('ไม่พบคำขอ');
      if (!canEdit(cur)) throw new Error(EDIT_MSG);
      const x = cleanReqInput(input);
      checkCat(x);
      if (!admin) checkLead(x);
      x.attachments = await A.upload(x.attachments, MEMO(id));
      const r = await mutateReq(id, r => {
        if (!canEdit(r)) throw new Error(EDIT_MSG + ' (สถานะเพิ่งเปลี่ยน)');
        const wasRevise = r.status === 'revise';
        Object.assign(r, x);
        if (!admin || r.requester.email === me.email) { if (wasRevise) r.status = 'pending'; r.history.push(H(wasRevise ? 'resubmit' : 'edit')); }
        else r.history.push(H('edit', 'แอดมินแก้ไขข้อมูลคำขอ'));
        return r;
      });
      rememberPlaces(x.destinations);
      return r;
    },
    // แนบบันทึกข้อความตามหลัง (ผู้ขอ หรือแอดมิน) — ใช้กับคำขอที่แอดมินบันทึกแทนกรณีเร่งด่วน
    async attachMemo(id, files) {
      const check = r => {
        if (!r) throw new Error('ไม่พบคำขอ');
        if (r.requester.email !== me.email && !isAdmin(me)) throw new Error('ไม่มีสิทธิ์แนบไฟล์ในคำขอนี้');
        if (['cancelled', 'rejected'].includes(r.status)) throw new Error('คำขอนี้ยกเลิก/ไม่อนุมัติแล้ว');
      };
      check(request(id));
      if (!(files || []).length) throw new Error('กรุณาเลือกไฟล์บันทึกข้อความ');
      const refs = await A.upload(files, MEMO(id));
      return mutateReq(id, r => {
        check(r);
        r.attachments = [...(r.attachments || []), ...refs];
        r.history.push(H('memo', 'แนบบันทึกข้อความตามหลัง'));
        return r;
      });
    },
    // แอดมินแนบบันทึกข้อความฉบับลงนามครบ (ผู้ขอ · หัวหน้างานยานพาหนะ · รองผู้อำนวยการ) เก็บเป็นหลักฐานของฝ่าย
    async attachSigned(id, files) {
      needAdmin();
      if (!(files || []).length) throw new Error('กรุณาเลือกไฟล์ที่สแกน');
      const refs = await A.upload(files, { kind: 'memo', ref: id, label: 'บันทึกอนุมัติลงนาม' });
      return mutateReq(id, r => { r.signed = [...(r.signed || []), ...refs]; r.history.push(H('signed', 'แนบบันทึกข้อความฉบับลงนาม')); return r; });
    },
    async removeSigned(id, ref) {
      needAdmin();
      return mutateReq(id, r => { r.signed = (r.signed || []).filter(x => x !== ref); r.history.push(H('signed', 'ลบไฟล์ฉบับลงนาม 1 ไฟล์')); return r; });
    },
    // แอดมินยกเว้นบันทึกข้อความ (เช่น ผู้อำนวยการสั่งการด้วยวาจา / บุคคลภายนอก) — ต้องระบุเหตุผล
    async waiveMemo(id, note) {
      needAdmin();
      note = String(note || '').trim();
      if (!note) throw new Error('กรุณาระบุเหตุผลที่ยกเว้น');
      return mutateReq(id, r => {
        if (!needsMemo(r)) throw new Error('คำขอนี้ไม่ได้ค้างบันทึกข้อความ');
        r.memoWaived = { by: me.email, byName: me.name || me.email, at: nowISO(), note };
        r.history.push(H('memowaive', note));
        return r;
      });
    },
    async cancelRequest(id, reason) {
      const check = r => {
        if (!r) throw new Error('ไม่พบคำขอ');
        if (r.requester.email !== me.email && !isAdmin(me)) throw new Error('ไม่มีสิทธิ์ยกเลิกคำขอนี้');
        if (!['pending', 'revise', 'approved'].includes(r.status) || (r.assignments || []).some(a => a.status !== 'assigned')) throw new Error('ยกเลิกไม่ได้ เพราะรถออกเดินทางแล้ว');
      };
      check(request(id));
      return mutateReq(id, r => {
        check(r);
        r.status = 'cancelled'; r.cancel = { at: nowISO(), by: me.email, reason: String(reason || '').trim() };
        r.history.push(H('cancel', reason));
        return r;
      });
    },
    // แอดมิน: อนุมัติ (มอบหมายรถหลายคัน) / ไม่อนุมัติ / ส่งกลับให้แก้ไข
    async decide(id, { action, note, assignments, category, categoryOther }) {
      needAdmin();
      if (!request(id)) throw new Error('ไม่พบคำขอ');
      note = String(note || '').trim();
      return mutateReq(id, r => {
        if (category) { if (category === 'other' && !String(categoryOther || '').trim()) throw new Error('กรุณาระบุหมวดงาน (อื่น ๆ)'); if (category !== r.category || (categoryOther || '') !== (r.categoryOther || '')) { const was = catName(r); r.category = category; r.categoryOther = category === 'other' ? String(categoryOther).trim() : ''; r.history.push(H('edit', `แอดมินเปลี่ยนหมวดงาน: ${was} → ${catName(r)}`)); } }
        if (action === 'approve') {
          if (!assignments || !assignments.length) throw new Error('กรุณาเลือกรถอย่างน้อย 1 คัน');
          const old = r.assignments || [];
          r.assignments = assignments.map(a => {
            const prev = old.find(o => o.vehicleId === a.vehicleId);
            return { status: 'assigned', departedAt: '', returnedAt: '', odoStart: null, odoEnd: null, rated: false, ...(prev || {}), vehicleId: a.vehicleId, driverId: a.driverId || '', note: String(a.note || '').trim() };
          });
          const was = r.status;
          r.status = 'approved';
          r.decision = { by: me.email, byName: me.name, at: nowISO(), action: 'approve', note };
          r.history.push(H(['approved', 'ontrip'].includes(was) ? 'reassign' : 'approve', note));
        } else if (action === 'reject' || action === 'revise') {
          if (!note) throw new Error(action === 'reject' ? 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' : 'กรุณาระบุสิ่งที่ต้องการให้แก้ไข');
          r.status = action === 'reject' ? 'rejected' : 'revise';
          r.assignments = [];
          r.decision = { by: me.email, byName: me.name, at: nowISO(), action, note };
          r.history.push(H(action, note));
        } else throw new Error('คำสั่งไม่ถูกต้อง');
        return r;
      });
    },
    // แอดมิน: บันทึกคำขอเองกรณีฉุกเฉิน (ไม่ติดกฎล่วงหน้า) และอนุมัติทันทีได้
    async createEmergency(input, { requester, assignments, note }) {
      needAdmin();
      const x = cleanReqInput(input);
      checkCat(x);
      if (new Date(x.endAt) <= new Date(x.startAt)) throw new Error('เวลากลับต้องหลังเวลาออกเดินทาง');
      if (!requester.email) { const u = userByName(requester.name); if (u) requester = { ...requester, email: u.email, dept: requester.dept || u.dept || '', phone: requester.phone || u.phone || '' }; }
      const id = await A.nextId(x.startAt);
      x.attachments = await A.upload(x.attachments, MEMO(id));
      const r = { id, createdAt: nowISO(), ...x, requester: { email: requester.email || '',name: requester.name, dept: requester.dept || '', phone: requester.phone || '' }, status: 'pending', emergency: true, createdBy: me.email, history: [H('emergency', 'บันทึกโดยแอดมิน (กรณีเร่งด่วน)')], decision: null, assignments: [], expenses: [] };
      if (assignments && assignments.length) {
        r.assignments = assignments.map(a => ({ vehicleId: a.vehicleId, driverId: a.driverId || '', note: String(a.note || '').trim(), status: 'assigned', departedAt: '', returnedAt: '', odoStart: null, odoEnd: null, rated: false }));
        r.status = 'approved'; r.decision = { by: me.email, byName: me.name, at: nowISO(), action: 'approve', note: String(note || '').trim() };
        r.history.push(H('approve', note));
      }
      await createReq(r); rememberPlaces(x.destinations);
      return r;
    },
    // คนขับ/แอดมิน: ออกเดินทาง / กลับถึง / เลขไมล์
    async tripStatus(id, idx, status, { odo, at, check = null, note = '' } = {}) {
      const when = at ? new Date(at).toISOString() : nowISO();
      // คนขับ: ออกเดินทางได้ตั้งแต่ 30 นาทีก่อนเวลาออก · เวลาที่บันทึกต้องไม่เกินเวลาปัจจุบัน (แอดมินแก้ย้อนหลังได้)
      if (!isAdmin(me)) {
        const cur = request(id);
        if (status === 'ontrip' && cur && Date.now() < new Date(cur.startAt).getTime() - 30 * 6e4) throw new Error('ยังไม่ถึงเวลาออกเดินทาง (กดได้ก่อนเวลาออก 30 นาที)');
        if (new Date(when).getTime() > Date.now() + 5 * 6e4) throw new Error('เวลาที่บันทึกต้องไม่เกินเวลาปัจจุบัน');
      }
      return mutateReq(id, r => {
        const a = r.assignments && r.assignments[idx];
        if (!a) throw new Error('ไม่พบงาน');
        const d = driver(a.driverId);
        if (!isAdmin(me) && !(d && d.email === me.email)) throw new Error('เฉพาะคนขับของงานนี้หรือแอดมิน');
        if (!['approved', 'ontrip', 'returned', 'closed'].includes(r.status)) throw new Error('งานนี้ยังไม่ได้รับอนุมัติ');
        if (r.status === 'closed' && status === 'assigned') { r.status = 'ontrip'; r.closedAt = ''; }   // ย้อนสถานะงานที่ปิดอัตโนมัติไปแล้ว
        const vName = (vehicle(a.vehicleId) || {}).name || '';
        if (status === 'ontrip') {
          a.status = 'ontrip'; a.departedAt = when; if (odo != null && odo !== '') a.odoStart = +odo;
          if (check) a.check = { at: nowISO(), by: me.email, ok: !!check.ok, miss: check.miss || [], note: String(check.note || '').trim(), skipped: !!check.skipped };
          r.history.push(H('depart', vName + (check && !check.ok && !check.skipped ? ` · ⚠ พบปัญหา: ${[...(check.miss || []), check.note].filter(Boolean).join(', ')}` : '')));
        }
        else if (status === 'returned') {
          if (odo != null && odo !== '' && a.odoStart != null && +odo < +a.odoStart) throw new Error('เลขไมล์ตอนกลับต้องมากกว่าตอนออก');
          a.status = 'returned'; a.returnedAt = when; if (!a.departedAt) a.departedAt = r.startAt; if (odo != null && odo !== '') a.odoEnd = +odo; r.history.push(H('return', vName + (note ? ` · กลับก่อนเวลา: ${String(note).trim()}` : '')));
        } else if (status === 'assigned') { a.status = 'assigned'; a.departedAt = ''; a.returnedAt = ''; r.history.push(H('undo', vName)); }
        return r;
      });
    },
    async setOdo(id, idx, { odoStart, odoEnd }) {
      return mutateReq(id, r => {
        const a = r.assignments && r.assignments[idx];
        if (!a) throw new Error('ไม่พบงาน');
        const d = driver(a.driverId);
        if (!isAdmin(me) && !(d && d.email === me.email)) throw new Error('ไม่มีสิทธิ์');
        a.odoStart = odoStart === '' || odoStart == null ? null : +odoStart; a.odoEnd = odoEnd === '' || odoEnd == null ? null : +odoEnd;
        if (a.odoStart != null && a.odoEnd != null && a.odoEnd < a.odoStart) throw new Error('เลขไมล์ตอนกลับต้องมากกว่าตอนออก');
        return r;
      });
    },
    // ค่าน้ำมัน/ค่าใช้จ่าย: รูปใบเสร็จเก็บใน Google Drive (โฟลเดอร์ใบเสร็จ ตั้งชื่อตามเลขคำขอ)
    async saveExpense(id, ex) {
      const canAdd = r => isAdmin(me) || (r.assignments || []).some(a => a.vehicleId === ex.vehicleId && (driver(a.driverId) || {}).email === me.email);
      const cur = request(id);
      if (!cur) throw new Error('ไม่พบคำขอ');
      if (!canAdd(cur)) throw new Error('ไม่มีสิทธิ์บันทึกค่าใช้จ่ายของงานนี้');
      // คนขับบันทึกย้อนหลังได้ภายใน 30 วันหลังปิดงาน (เลยกำหนด ให้แอดมินบันทึกแทน)
      if (!isAdmin(me) && cur.closedAt && Date.now() - new Date(cur.closedAt) > 30 * DAY) throw new Error('เลยกำหนดบันทึกย้อนหลัง 30 วันแล้ว — กรุณาส่งใบเสร็จให้แอดมินบันทึกแทน');
      const photos = await A.upload(ex.photos || [], { kind: 'receipt', ref: id, label: EXPENSE[ex.type] || 'ใบเสร็จ' });
      const e = { id: ex.id || uid('ex'), vehicleId: ex.vehicleId, type: ex.type || 'fuel', date: ex.date || nowISO().slice(0, 10), station: String(ex.station || '').trim(), liters: +ex.liters || 0, pricePerL: +ex.pricePerL || 0, amount: +ex.amount || 0, odo: ex.odo === '' || ex.odo == null ? null : +ex.odo, pay: ex.pay || 'cash', photos, note: String(ex.note || '').trim(), by: me.email, byName: me.name, at: nowISO() };
      return mutateReq(id, r => {
        if (!canAdd(r)) throw new Error('ไม่มีสิทธิ์บันทึกค่าใช้จ่ายของงานนี้');
        r.expenses = r.expenses || [];
        const i = r.expenses.findIndex(x => x.id === e.id);
        if (i >= 0) r.expenses[i] = e; else r.expenses.push(e);
        return r;
      });
    },
    async removeExpense(id, exId) {
      return mutateReq(id, r => {
        const e = (r.expenses || []).find(x => x.id === exId);
        if (!e) return r;                       // ถูกลบจากเครื่องอื่นไปแล้ว
        if (!isAdmin(me) && e.by !== me.email) throw new Error('ไม่มีสิทธิ์ลบ');
        r.expenses = r.expenses.filter(x => x.id !== exId);
        return r;
      });
    },
    async closeRequest(id, note) {
      needAdmin();
      return mutateReq(id, r => {
        if (r.status !== 'returned') throw new Error('ปิดงานได้เมื่อรถทุกคันกลับถึงแล้ว');
        r.status = 'closed'; r.closedAt = nowISO(); r.history.push(H('close', note));
        return r;
      });
    },
    async reopenRequest(id) {
      needAdmin();
      return mutateReq(id, r => { r.status = 'returned'; r.history.push(H('reopen')); return r; });
    },
    // ประเมินคนขับ (เก็บแยก ไม่ผูกชื่อผู้ประเมิน) — บันทึกผลประเมิน + ทำเครื่องหมาย "ประเมินแล้ว" ในธุรกรรมเดียว
    // กันประเมินซ้ำเมื่อเปิดหลายเครื่อง และไม่มีผลประเมินค้างถ้าบันทึกไม่สำเร็จ
    async rate(id, idx, { scores, comment }) {
      const rid = uid('rt'), at = nowISO(), text = String(comment || '').trim();
      await mutateReq(id, (r, also) => {
        const a = r.assignments && r.assignments[idx];
        if (!a || r.requester.email !== me.email) throw new Error('ประเมินได้เฉพาะผู้ขอใช้รถ');
        if (a.rated) throw new Error('ประเมินงานนี้แล้ว');
        also('ratings', rid, { id: rid, at, driverId: a.driverId, vehicleId: a.vehicleId, scores, comment: text });
        a.rated = true;
        return r;
      });
    },
    async skipRating(id, idx) {
      await mutateReq(id, r => { const a = r.assignments && r.assignments[idx]; if (a) a.ratingSkipped = true; return r; });
    },
    // ── รถ ──
    async saveVehicle(v) {
      needAdmin();
      v = { ...v, id: v.id || uid('v'), seats: +v.seats || 0, no: +v.no || 0, type: KINDS[v.kind] || v.type || '', updatedAt: nowISO() };
      v.photos = await A.upload(v.photos || [], { kind: 'vehicle', ref: v.name || v.plate, label: 'รูปรถ' });
      if (v.order == null) v.order = db.vehicles.length;
      await A.put('vehicles', v.id, v); return v;
    },
    async deleteVehicle(id) {
      needAdmin();
      if (db.requests.some(r => blocking(r) && (r.assignments || []).some(a => a.vehicleId === id))) throw new Error('ลบไม่ได้ เพราะรถคันนี้มีงานที่ยังไม่เสร็จ');
      await A.del('vehicles', id); await A.del('vprivate', id).catch(() => {});
    },
    async saveVehiclePrivate(id, data) {
      needAdmin();
      const d = clone(data);
      const vn = (vehicle(id) || {}).name || id;
      for (const rp of d.repairs || []) rp.photos = await A.upload(rp.photos || [], { kind: 'repair', ref: vn, label: rp.item || 'ใบเสร็จค่าซ่อม' });
      d.docs = await A.upload(d.docs || [], { kind: 'vdoc', ref: vn, label: 'เอกสารรถ' });
      d.id = id; d.updatedAt = nowISO();
      await A.put('vprivate', id, d);
    },
    // ── คนขับ ──
    async saveDriver(d) {
      needAdmin();
      d = { ...d, id: d.id || uid('d'), updatedAt: nowISO(), active: d.active !== false };
      d.photo = (await A.upload(d.photo ? [d.photo] : [], { kind: 'driver', ref: d.name, label: 'รูปคนขับ' }))[0] || '';
      if (d.order == null) d.order = db.drivers.length;
      const prevEmail = (driver(d.id) || {}).email || '';
      await A.put('drivers', d.id, d);
      if ((d.email || '') !== prevEmail) await syncDriverEmails(d.id, d.email || '');
      return d;
    },
    async deleteDriver(id) {
      needAdmin();
      if (db.requests.some(r => blocking(r) && (r.assignments || []).some(a => a.driverId === id))) throw new Error('ลบไม่ได้ เพราะคนขับมีงานที่ยังไม่เสร็จ');
      await A.del('drivers', id);
    },
    // ── ผู้ใช้ ──
    async saveUser(u) {
      needAdmin();
      const prev = user(u.email) || {};
      const roles = u.roles || prev.roles || ['teacher'];
      if ((roles.includes('admin') || roles.includes('superadmin') || (prev.roles || []).includes('admin')) && !isSuper(me) && JSON.stringify(roles) !== JSON.stringify(prev.roles || [])) throw new Error('เฉพาะผู้ดูแลระบบสูงสุดที่กำหนดสิทธิ์แอดมินได้');
      if (u.email === me.email && !roles.includes('superadmin') && isSuper(me)) throw new Error('ไม่สามารถถอดสิทธิ์ผู้ดูแลระบบสูงสุดของตัวเองได้');
      const x = { ...prev, ...u, email: String(u.email).toLowerCase(), roles, updatedAt: nowISO() };
      if (!x.provider) x.provider = isUsernameEmail(x.email) ? 'username' : 'google';
      if (x.active == null) x.active = true;
      if (!LOCAL) delete x.password;
      await A.put('users', x.email, x);
      if (x.driverId) { const d = driver(x.driverId); if (d && d.email !== x.email) { await A.put('drivers', d.id, { ...d, email: x.email }); await syncDriverEmails(d.id, x.email); } }
      return x;
    },
    async createUsernameAccount({ username, password, name, roles, driverId, phone }) {
      needAdmin();
      username = normUser(username);
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - (3–30 ตัว)');
      if (String(password || '').length < 6) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร');
      if (user(emailOf(username))) throw new Error('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
      if ((roles || []).some(r => r === 'admin' || r === 'superadmin') && !isSuper(me)) throw new Error('เฉพาะผู้ดูแลระบบสูงสุดที่สร้างบัญชีแอดมินได้');
      const email = await A.createAccount({ username, password });
      const u = { email, name: String(name || '').trim(), dept: roles.includes('driver') ? 'งานยานพาหนะ' : 'ฝ่ายบริหารงานทั่วไป', phone: phone || '', position: roles.includes('driver') ? 'พนักงานขับรถ' : 'เจ้าหน้าที่', roles, active: true, provider: 'username', mustChangePassword: true, driverId: driverId || '', createdAt: nowISO(), createdBy: me.email };
      if (LOCAL) u.password = password;
      await A.put('users', email, u);
      if (driverId) { const d = driver(driverId); if (d) { await A.put('drivers', d.id, { ...d, email }); await syncDriverEmails(d.id, email); } }
      return u;
    },
    async resetPassword(email, password) {
      needAdmin();
      if (String(password || '').length < 6) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร');
      await A.setPassword(email, password);
      const u = user(email);
      if (u) await A.put('users', email, { ...u, mustChangePassword: true, ...(LOCAL ? { password } : {}) });
    },
    async removeUser(email) {
      needAdmin();
      if (email === me.email) throw new Error('ลบบัญชีตัวเองไม่ได้');
      const u = user(email);
      if (u && (u.roles || []).includes('superadmin') && !isSuper(me)) throw new Error('ไม่มีสิทธิ์');
      await A.del('users', email);
    },
    // ── ตั้งค่า ──
    async saveSettings(s) {
      needAdmin();
      const x = clone(s);
      for (const c of x.committee || []) c.photo = (await A.upload(c.photo ? [c.photo] : [], { kind: 'committee', ref: c.name || c.position, label: 'รูป' }))[0] || '';
      await A.put('settings', 'settings', { ...db.settings, ...x });
    },
    async deletePlace(id) { needAdmin(); await A.del('places', id); },
    // ระบบจริง: นำเข้ารถ 14 คัน + คนขับ 7 คน + สถานที่ยอดนิยม (จากตารางข้อมูลรถของโรงเรียน) เมื่อฐานข้อมูลยังว่าง
    async importDefaults() {
      if (!isSuper(me)) throw new Error('เฉพาะผู้ดูแลระบบสูงสุด');
      const s = seed();
      for (const d of s.drivers) await A.put('drivers', d.id, { ...d, licenseExpiry: '', email: '' });
      for (const v of s.vehicles) await A.put('vehicles', v.id, { ...v, photos: v.photos, maint: { active: false, from: '', to: '', note: '' }, note: '' });
      for (const v of s.vehicles) await A.put('vprivate', v.id, { id: v.id, chassisNo: '', engineNo: '', fuelType: '', fuelCard: '', actExpiry: '', taxExpiry: '', insurance: { company: '', cls: '', policyNo: '', expiry: '', phone: '' }, repairs: [], maintenancePlan: [], accidents: [], docs: [], notes: '' });
      for (const p of s.places) await A.put('places', p.id, { ...p, count: 0 });
      if (!db.settings.committee || !db.settings.committee.length || !db.settings.updatedAt) await A.put('settings', 'settings', { ...defaultSettings(), ...db.settings, updatedAt: nowISO() });
    }
  };
  return api;
})();
