/**
 * ระบบยานพาหนะ — Apps Script (Web app)
 *  1) upload       รับรูป/PDF จากเว็บ เก็บลง Google Drive ของโรงเรียน แยกโฟลเดอร์ตามประเภท/ปี พ.ศ./เดือน
 *  2) file         ส่งไฟล์กลับไปแสดงบนเว็บ (ตรวจสิทธิ์ทุกครั้ง โฟลเดอร์ไม่แชร์สาธารณะ)
 *  3) setpassword  แอดมินตั้งรหัสผ่านใหม่ให้บัญชีชื่อผู้ใช้ (username) ผ่าน Identity Toolkit
 *
 * โครงสร้างใน Drive:
 *   ระบบยานพาหนะ - ไฟล์/
 *     บันทึกข้อความขอใช้รถ/2569/11 พฤศจิกายน/VR-2569-0012_บันทึกข้อความ_20261107-093012.pdf
 *     ใบเสร็จค่าน้ำมันและค่าใช้จ่าย/2569/11 พฤศจิกายน/VR-2569-0012_ค่าน้ำมัน_20261108-171544.jpg
 *     ใบเสร็จค่าซ่อมรถ/ · เอกสารรถ/ · รูปรถ/ · รูปคนขับ/ · รูปคณะทำงาน/
 *
 * ทุกคำขอต้องแนบ ID token ของผู้ที่เข้าสู่ระบบแล้ว
 * ติดตั้ง: ดู README-ติดตั้ง.md ขั้นตอนที่ 4
 * (LINE แจ้งเตือน จะเพิ่มในรอบถัดไป)
 */
const CONFIG = {
  DOMAINS: ['pcshspt.ac.th'],                 // ต้องตรงกับ config.js
  USERNAME_DOMAIN: 'vehicle.pcshspt.local',   // ต้องตรงกับ config.js
  FIREBASE_API_KEY: 'AIzaSyC9NrI4yb5ecaI2L6n98SpGvP1nREt1HmQ',
  FIREBASE_PROJECT: 'carbooking-ae9d8',
  // ที่เก็บไฟล์: ใส่ ID โฟลเดอร์ใน "ไดรฟ์ที่แชร์ (Shared drive)" ของโรงเรียน (แนะนำ — ไฟล์เป็นของโรงเรียน ไม่หายเมื่อบุคลากรย้าย)
  // ID คือส่วนท้ายของลิงก์โฟลเดอร์ https://drive.google.com/drive/folders/<ID>
  // เว้นว่าง = สร้างโฟลเดอร์ ROOT_FOLDER_NAME ใน "ไดรฟ์ของฉัน" ของบัญชีที่ Deploy สคริปต์
  ROOT_FOLDER_ID: '1htp9wDTNf6m7zY4T01leHnOdOoz_BgEM',   // ไดรฟ์ที่แชร์ "งานยานพาหนะ" › ระบบยานพาหนะ - ไฟล์
  ROOT_FOLDER_NAME: 'ระบบยานพาหนะ - ไฟล์',
  MAX_BYTES: 8 * 1024 * 1024                  // ไฟล์ละไม่เกิน 8 MB (เว็บย่อรูปให้ก่อนส่งอยู่แล้ว)
};
const TZ = 'Asia/Bangkok';
// ประเภทไฟล์ (เว็บส่ง kind มา) → ชื่อโฟลเดอร์ใน Drive
const KINDS = {
  memo: 'บันทึกข้อความขอใช้รถ',
  receipt: 'ใบเสร็จค่าน้ำมันและค่าใช้จ่าย',
  repair: 'ใบเสร็จค่าซ่อมรถ',
  vdoc: 'เอกสารรถ',
  vehicle: 'รูปรถ',
  driver: 'รูปคนขับ',
  committee: 'รูปคณะทำงาน'
};
const OTHER_KIND = 'อื่น ๆ';
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function doGet() {
  return json({ ok: true, service: 'pcshs-vehicle', version: '2026-11-07', features: ['upload', 'file', 'setpassword', 'kinds'], time: new Date().toISOString() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json({ ok: false, error: 'รูปแบบคำขอไม่ถูกต้อง' }); }
  try {
    const user = verifyUser(body.idToken);
    if (body.action === 'upload') return json({ ok: true, id: saveFile(body, user) });
    if (body.action === 'file' || body.action === 'image') return json(Object.assign({ ok: true }, readFile(body.id)));
    if (body.action === 'setpassword') return json({ ok: true, done: setPassword(body, user) });
    return json({ ok: false, error: 'ไม่รู้จักคำสั่งนี้' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ───────── ตรวจผู้ใช้จาก Firebase ID token ─────────
function verifyUser(idToken) {
  if (!idToken) throw new Error('กรุณาเข้าสู่ระบบก่อน');
  if (/ใส่/.test(CONFIG.FIREBASE_API_KEY + CONFIG.FIREBASE_PROJECT)) throw new Error('ยังไม่ได้ตั้งค่า FIREBASE_API_KEY / FIREBASE_PROJECT ใน Apps Script (Code.gs)');
  const cache = CacheService.getScriptCache();
  const key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).slice(0, 40);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + CONFIG.FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('บัตรผ่านหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  const u = (JSON.parse(res.getContentText()).users || [])[0] || {};
  const email = String(u.email || '').toLowerCase();
  const school = u.emailVerified && CONFIG.DOMAINS.some(function (d) { return email.endsWith('@' + d); });
  const profile = readDoc('users/' + encodeURIComponent(email), idToken);
  if (!school && !(profile && profile.active === true)) throw new Error('บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งาน');
  if (profile && profile.active === false) throw new Error('บัญชีนี้ถูกปิดการใช้งาน');
  const user = { email: email, roles: (profile && profile.roles) || [] };
  cache.put(key, JSON.stringify(user), 300);
  return user;
}
function isAdmin(user) { return user.roles.indexOf('admin') >= 0 || user.roles.indexOf('superadmin') >= 0; }

// ───────── ไฟล์ใน Google Drive ─────────
function saveFile(body, user) {
  const mime = String(body.mime || '');
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mime)) throw new Error('รับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) หรือ PDF');
  const bytes = Utilities.base64Decode(String(body.data || ''));
  if (!bytes.length || bytes.length > CONFIG.MAX_BYTES) throw new Error('ขนาดไฟล์ไม่ถูกต้อง (ไม่เกิน 8 MB)');
  const now = new Date();
  const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  const ref = safeName(body.ref), label = safeName(body.label), n = Math.floor(Number(body.n) || 0);
  // ชื่อไฟล์: <เลขคำขอ/ชื่อรถ>_<รายการ>_<วันเวลา>[-ลำดับ] เช่น VR-2569-0012_ค่าน้ำมัน_20261108-171544.jpg
  const name = [ref || user.email.split('@')[0], label, Utilities.formatDate(now, TZ, 'yyyyMMdd-HHmmss')].filter(String).join('_')
    + (n > 1 ? '-' + n : '') + '.' + ext;
  const file = kindFolder(KINDS[body.kind] || OTHER_KIND, now).createFile(Utilities.newBlob(bytes, mime, name));
  file.setDescription(['อัปโหลดโดย ' + user.email, ref ? 'อ้างอิง ' + ref : '', Utilities.formatDate(now, TZ, 'dd/MM/yyyy HH:mm')].filter(String).join(' · '));
  return file.getId() + (ext === 'pdf' ? '#pdf' : '');
}
// เก็บเฉพาะตัวอักษรไทย/อังกฤษ/ตัวเลข/ช่องว่าง . - (กันชื่อไฟล์แปลก ๆ)
function safeName(s) { return String(s || '').replace(/[^\w\u0E00-\u0E7F .\-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }
function readFile(id) {
  id = String(id || '').replace(/#pdf$/, '');
  if (!/^[\w-]{10,}$/.test(id)) throw new Error('ไม่พบไฟล์');
  let file;
  try { file = DriveApp.getFileById(id); } catch (e) { throw new Error('ไม่พบไฟล์ (อาจถูกลบออกจาก Drive)'); }
  if (file.isTrashed() || !isOurs(file)) throw new Error('ไม่พบไฟล์');
  const blob = file.getBlob();
  return { mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
// ไฟล์ต้องอยู่ใต้โฟลเดอร์หลักของระบบ (ประเภท/ปี/เดือน = 3 ชั้น · ไฟล์รุ่นเก่า ปี/เดือน = 2 ชั้น)
function isOurs(file) {
  const rootId = rootFolder().getId();
  let parents = file.getParents();
  for (let depth = 0; depth < 5 && parents.hasNext(); depth++) {
    const p = parents.next();
    if (p.getId() === rootId) return true;
    parents = p.getParents();
  }
  return false;
}
function rootFolder() {
  if (CONFIG.ROOT_FOLDER_ID) {
    try { return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID); }
    catch (e) { throw new Error('เปิดโฟลเดอร์เก็บไฟล์ไม่ได้ ตรวจ ROOT_FOLDER_ID และสิทธิ์ของบัญชีที่ Deploy (ต้องเป็นผู้จัดการเนื้อหาของไดรฟ์ที่แชร์)'); }
  }
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* ถูกลบ สร้างใหม่ */ } }
  const folder = DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}
function childFolder(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
// <โฟลเดอร์หลัก>/<ประเภท>/<ปี พ.ศ.>/<MM ชื่อเดือน> — ล็อกกันสร้างโฟลเดอร์ซ้ำเมื่ออัปโหลดพร้อมกันหลายไฟล์
function kindFolder(kindName, d) {
  const y = Number(Utilities.formatDate(d, TZ, 'yyyy')) + 543;
  const m = Number(Utilities.formatDate(d, TZ, 'M'));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return childFolder(childFolder(childFolder(rootFolder(), kindName), String(y)), ('0' + m).slice(-2) + ' ' + TH_MONTHS[m - 1]); }
  finally { lock.releaseLock(); }
}

// ───────── ตั้งรหัสผ่านใหม่ให้บัญชีชื่อผู้ใช้ (เฉพาะแอดมิน) ─────────
// ใช้สิทธิ์ของเจ้าของสคริปต์ (ต้องเป็นเจ้าของโปรเจกต์ Firebase) เรียก Identity Toolkit แบบผู้ดูแล
function setPassword(body, user) {
  if (!isAdmin(user)) throw new Error('เฉพาะแอดมินเท่านั้น');
  const email = String(body.email || '').toLowerCase();
  const password = String(body.password || '');
  if (!email.endsWith('@' + CONFIG.USERNAME_DOMAIN)) throw new Error('ตั้งรหัสผ่านได้เฉพาะบัญชีชื่อผู้ใช้ (username)');
  if (password.length < 6) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร');
  const base = 'https://identitytoolkit.googleapis.com/v1/projects/' + CONFIG.FIREBASE_PROJECT;
  const opt = function (payload) {
    return { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': CONFIG.FIREBASE_PROJECT } };
  };
  const look = UrlFetchApp.fetch(base + '/accounts:lookup', opt({ email: [email] }));
  if (look.getResponseCode() !== 200) throw new Error('ค้นหาบัญชีไม่สำเร็จ: ' + look.getContentText().slice(0, 200));
  const found = (JSON.parse(look.getContentText()).users || [])[0];
  if (!found) throw new Error('ไม่พบบัญชีนี้ในระบบเข้าสู่ระบบ');
  const upd = UrlFetchApp.fetch(base + '/accounts:update', opt({ localId: found.localId, password: password }));
  if (upd.getResponseCode() !== 200) throw new Error('ตั้งรหัสผ่านไม่สำเร็จ: ' + upd.getContentText().slice(0, 200));
  return true;
}

// ───────── อ่านเอกสาร Firestore ด้วยสิทธิ์ของผู้ใช้เอง ─────────
function readDoc(path, idToken) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + CONFIG.FIREBASE_PROJECT + '/databases/(default)/documents/' + path;
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
  return res.getResponseCode() === 200 ? fromFirestore(JSON.parse(res.getContentText()).fields || {}) : null;
}
function fromFirestore(fields) { const out = {}; Object.keys(fields).forEach(function (k) { out[k] = fsValue(fields[k]); }); return out; }
function fsValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsValue);
  if ('mapValue' in v) return fromFirestore(v.mapValue.fields || {});
  return null;
}

// ทดสอบสิทธิ์ครั้งแรก: กด Run ฟังก์ชันนี้ในหน้า Apps Script เพื่ออนุญาตการเข้าถึง Drive/เครือข่าย
// และสร้างโฟลเดอร์ประเภทไฟล์ไว้ล่วงหน้า (เจ้าหน้าที่เปิดดูใน Drive ได้ทันที)
function authorize() {
  const root = rootFolder();
  Object.keys(KINDS).forEach(function (k) { childFolder(root, KINDS[k]); });
  UrlFetchApp.fetch('https://www.google.com');
  Logger.log('พร้อมใช้งาน: ' + root.getName() + ' → ' + root.getUrl());
}
