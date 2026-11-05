/* ═══════════════════════════════════════════════════════════
   ค่าการเชื่อมต่อระบบจริง (แก้ไฟล์นี้ไฟล์เดียวตอนติดตั้ง — ดูขั้นตอนใน README-ติดตั้ง.md)
   - firebase: ค่าจาก Firebase Console → Project settings → Your apps (เปิดเผยได้ ความปลอดภัยอยู่ที่ firestore.rules)
   - appsScriptUrl: ลิงก์ Web app ของ Apps Script (เก็บรูป/ไฟล์ลง Google Drive + รีเซ็ตรหัสผ่านบัญชี username)
   - longdoKey: API key ของ Longdo Map (ค้นหาสถานที่ ปักหมุด คำนวณระยะทาง)
   - bootstrapAdmins: ผู้ดูแลระบบสูงสุดคนแรก (ต้องตรงกับ firebase/firestore.rules)

   ถ้า firebase.apiKey ว่าง / เปิดจากไฟล์ในเครื่อง (file://) / เติม ?local ท้ายลิงก์
   → ระบบจะทำงานใน "โหมดทดลอง" เก็บข้อมูลในเบราว์เซอร์เครื่องนี้เท่านั้น
   ═══════════════════════════════════════════════════════════ */
window.APP_CONFIG = {
  appName: 'ระบบยานพาหนะ',
  domains: ['pcshspt.ac.th'],               // โดเมนอีเมลที่เข้าสู่ระบบด้วย Google ได้
  usernameDomain: 'vehicle.pcshspt.local',  // บัญชี username จะถูกแปลงเป็น <username>@vehicle.pcshspt.local (ไม่ต้องแก้)
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },
  appsScriptUrl: '',
  longdoKey: '',
  bootstrapAdmins: ['tripop@pcshspt.ac.th']
};
