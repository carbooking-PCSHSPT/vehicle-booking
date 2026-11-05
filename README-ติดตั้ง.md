# ระบบยานพาหนะ ขอรถส่วนกลาง — คู่มือติดตั้ง

โครงสร้างเหมือนเว็บแจ้งซ่อม: **GitHub Pages** (หน้าเว็บ) + **Firebase** (ล็อกอิน + ฐานข้อมูลเรียลไทม์) + **Apps Script** (เก็บไฟล์ใน Google Drive + รีเซ็ตรหัสผ่าน) + **Longdo Map** (แผนที่)

```
app/                  ← อัปโหลดทั้งโฟลเดอร์นี้ขึ้น GitHub Pages
  index.html
  assets/js/config.js ← ไฟล์เดียวที่ต้องแก้ตอนติดตั้ง
firebase/firestore.rules
apps-script/Code.gs, appsscript.json
demo/                 ← ต้นแบบดีไซน์ 5 แบบ (ไม่ต้องอัปโหลด)
```

---

## 0. ลองใช้ก่อนติดตั้ง (โหมดทดลอง)
ดับเบิลคลิก `app/index.html` จะเปิด**โหมดทดลอง** เก็บข้อมูลในเบราว์เซอร์ พร้อมข้อมูลตัวอย่าง (รถ 14 คัน คนขับ 7 คน คำขอย้อนหลัง 5 เดือน)

| บทบาท | วิธีเข้า |
|---|---|
| ผู้ดูแลระบบสูงสุด | กด "เข้าสู่ระบบด้วย Google" → เลือก tripop@pcshspt.ac.th |
| ครู | กด Google → เลือกครูคนใดก็ได้ |
| ผู้บริหาร | กด Google → director@pcshspt.ac.th |
| แอดมิน (username) | `admin` / `admin1234` |
| คนขับ (username) | `sawong`, `boontan`, `pallop`, `manachai`, `athithep`, `chaiwat`, `nattapong` / `1234` |

ปุ่ม "ล้างข้อมูลตัวอย่าง" มุมซ้ายล่างใช้สร้างข้อมูลใหม่

---

## 1. สร้างโปรเจกต์ Firebase (ใหม่ แยกจากเว็บแจ้งซ่อม)
1. https://console.firebase.google.com → **Add project** → ตั้งชื่อ เช่น `pcshs-vehicle` (ใช้บัญชี tripop@pcshspt.ac.th)
2. **Build → Authentication → Get started → Sign-in method** เปิด 2 อย่าง
   - **Google** (ใส่อีเมลติดต่อ)
   - **Email/Password** (ใช้กับบัญชี username ของแอดมิน/คนขับ)
3. **Authentication → Settings → Authorized domains** → เพิ่ม `<ชื่อบัญชี>.github.io`
4. **Build → Firestore Database → Create database** → Production mode → location `asia-southeast1`
5. **Firestore → Rules** → คัดลอกทั้งไฟล์ `firebase/firestore.rules` ไปวาง → **Publish**
   - ถ้าเปลี่ยนผู้ดูแลระบบสูงสุด แก้อีเมลในบรรทัด `bootstrap()` ให้ตรงกับ `config.js`
6. **Project settings (เฟือง) → Your apps → Web (</>)** → ตั้งชื่อ → คัดลอกค่า `firebaseConfig`

## 2. แก้ `app/assets/js/config.js`
```js
firebase: { apiKey: '...', authDomain: '...', projectId: '...', storageBucket: '...', messagingSenderId: '...', appId: '...' },
appsScriptUrl: '',   // ใส่หลังทำขั้นตอนที่ 4
longdoKey: '',       // ใส่หลังทำขั้นตอนที่ 5
bootstrapAdmins: ['tripop@pcshspt.ac.th']
```

## 3. อัปโหลดขึ้น GitHub Pages
1. สร้าง repository ใหม่ (เช่น `pcshspt-vehicle`) → อัปโหลด**ไฟล์ทั้งหมดในโฟลเดอร์ `app/`** (ให้ `index.html` อยู่ชั้นนอกสุด)
2. **Settings → Pages** → Branch `main` / root → Save → รอ 1–2 นาที ได้ลิงก์ `https://<บัญชี>.github.io/pcshspt-vehicle/`
3. เปิดเว็บ → เข้าสู่ระบบด้วย tripop@pcshspt.ac.th → ระบบตั้งเป็นผู้ดูแลระบบสูงสุดอัตโนมัติ
4. หน้า **ระบบหลังบ้าน → ภาพรวม** กด **"นำเข้าข้อมูลเริ่มต้น"** → ได้รถ 14 คัน + คนขับ 7 คน (แก้ไขที่นั่ง/ข้อมูลรถในหลังบ้านได้)

## 4. Apps Script (เก็บรูป/PDF ใน Google Drive + รีเซ็ตรหัสผ่าน)
1. https://script.google.com → **New project** (บัญชีเดียวกับเจ้าของ Firebase)
2. วางโค้ด `apps-script/Code.gs` · แก้ `FIREBASE_API_KEY` และ `FIREBASE_PROJECT` ให้ตรงกับขั้นตอนที่ 1
3. **Project Settings → Show "appsscript.json"** → วางเนื้อหา `apps-script/appsscript.json`
4. **Project Settings → Google Cloud Platform (GCP) Project → Change project** → ใส่ **Project number** ของ Firebase (ดูใน Firebase → Project settings) — จำเป็นสำหรับปุ่ม "ตั้งรหัสผ่านใหม่"
5. เลือกฟังก์ชัน `authorize` → **Run** → อนุญาตสิทธิ์
6. **Deploy → New deployment → Web app** · Execute as: **Me** · Who has access: **Anyone** → Deploy → คัดลอก URL
7. ใส่ URL ใน `config.js` → `appsScriptUrl` → อัปโหลด `config.js` ขึ้น GitHub ใหม่
> แก้โค้ด Apps Script ครั้งต่อไป: **Deploy → Manage deployments → Edit → Version: New version** (URL เดิม)

## 5. Longdo Map
1. สมัคร API key ที่ https://map.longdo.com/console (ฟรี ไม่ต้องผูกบัตร — ตรวจเงื่อนไขโควตาล่าสุดในหน้าเว็บ)
2. ตั้งโดเมนที่อนุญาตเป็น `<บัญชี>.github.io`
3. ใส่ key ใน `config.js` → `longdoKey` → อัปโหลดใหม่
4. หลังบ้าน → **ตั้งค่า → ตำแหน่งโรงเรียน** → ปักหมุดให้ตรงที่ตั้งโรงเรียนจริง (ค่าเริ่มต้นเป็นพิกัดโดยประมาณ)

> ยังไม่ใส่ key ก็ใช้งานได้ — ครูเลือกจาก "สถานที่ที่เคยไป" หรือกรอกชื่อ/ระยะทางเอง

---

## 6. ตั้งค่าหลังติดตั้ง
- **ผู้ใช้และสิทธิ์** → "สร้างบัญชีชื่อผู้ใช้" ให้แอดมิน/คนขับที่ไม่มีอีเมล (ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก)
- **พนักงานขับรถ** → ปุ่ม "สร้างบัญชี" ข้างชื่อคนขับ (ผูกบัญชีให้อัตโนมัติ)
- **ผู้ใช้และสิทธิ์** → "เพิ่มอีเมลภายนอก" ให้ครูที่ไม่มีอีเมลโรงเรียน (เข้าด้วย Gmail)
- ให้สิทธิ์ **ผู้บริหาร** กับ ผอ. (เห็นเฉพาะสถิติและผลประเมินคนขับ)
- **ตั้งค่า** → ข้อมูลติดต่อ + คณะทำงาน (ระดับรองผู้อำนวยการ และระดับรองลงมา)

## ขอบเขตรอบนี้ / รอบถัดไป
- ✅ ดีไซน์ · ล็อกอิน (Google + username) · หน้าแรก/ตารางรถ · ข้อมูลรถ (เผยแพร่ + เชิงลึก) · ฟอร์มขอใช้รถ · อนุมัติ/มอบหมายรถหลายคัน + หมายเหตุ · หน้าคนขับ · ประเมินคนขับ · ค่าน้ำมัน/ค่าใช้จ่าย · สถิติ + ส่งออก Excel/PDF
- ⏳ รอบถัดไป: แจ้งเตือน LINE · ระบบสำรองข้อมูลไป Google Drive · ประวัติการแก้ไข (audit log แบบละเอียด)
