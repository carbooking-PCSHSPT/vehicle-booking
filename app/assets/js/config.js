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
    apiKey: 'AIzaSyC9NrI4yb5ecaI2L6n98SpGvP1nREt1HmQ',
    authDomain: 'carbooking-ae9d8.firebaseapp.com',
    projectId: 'carbooking-ae9d8',
    storageBucket: 'carbooking-ae9d8.firebasestorage.app',
    messagingSenderId: '758321103802',
    appId: '1:758321103802:web:c87107905e7691e6955383'
  },
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwA2EJ2hWbVKr5ZcO9J0jSSz_VCJWt-Pi3gjrAH7sgZjdF6j3kkxZ9EqUZMV0NRBqJsqA/exec',
  longdoKey: '746f61525bd37b0757ccd6e8124f2b11',   // Longdo Map (Free) · โดเมนที่อนุญาต carbooking-pcshspt.github.io
  bootstrapAdmins: ['carbooking.gad@gmail.com']   // เข้าด้วย Google ได้แม้ไม่ใช่อีเมลโรงเรียน
};
