# ระบบยานพาหนะ ขอรถส่วนกลาง — คู่มือติดตั้ง

> อัปเดตล่าสุด: 8 พ.ย. 2569 · ใช้กับ Firebase Console หน้าตาใหม่ (เมนูซ้ายแบ่งเป็น Databases & Storage / Security / …)

ระบบประกอบด้วย 4 ส่วน
| ส่วน | หน้าที่ |
|---|---|
| **GitHub Pages** | หน้าเว็บ |
| **Firebase** (Authentication + Firestore) | ล็อกอิน + **ฐานข้อมูลกลาง** — คำขอใช้รถ รถ คนขับ ค่าใช้จ่าย ผลประเมิน เก็บที่เดียว ทุกเครื่องเห็นการเปลี่ยนแปลงทันที |
| **Apps Script** | เก็บไฟล์แนบ (บันทึกข้อความ · รูปใบเสร็จค่าน้ำมัน ฯลฯ) ใน **Google Drive** + ตั้งรหัสผ่านใหม่ให้บัญชี username |
| **Longdo Map** | ค้นหาสถานที่ คำนวณระยะทาง (ไม่บังคับ) |

```
app/                  ← อัปโหลดทั้งโฟลเดอร์นี้ขึ้น GitHub Pages
  index.html
  assets/js/config.js ← ค่าการเชื่อมต่อ (ใส่ค่า Firebase แล้ว)
firebase/firestore.rules   ← กฎความปลอดภัย วางใน Firebase Console
apps-script/Code.gs, appsscript.json
demo/                 ← ต้นแบบดีไซน์ (ไม่ต้องอัปโหลด)
```

---

## ✅ ความคืบหน้า
| | ขั้นตอน | สถานะ |
|---|---|---|
| 1 | สร้างโปรเจกต์ Firebase `carbooking` (ID `carbooking-ae9d8`) | ✅ เสร็จแล้ว |
| 2 | เปิด Authentication (Google + Email/Password) | ✅ เสร็จแล้ว |
| 3 | สร้าง Firestore + วางกฎ `firestore.rules` → Publish | ✅ เสร็จแล้ว |
| 4 | ใส่ค่า Firebase ใน `config.js` และ `Code.gs` | ✅ เสร็จแล้ว |
| 5 | อัปโหลดเว็บขึ้น GitHub Pages + เพิ่ม Authorized domain | ✅ https://carbooking-pcshspt.github.io/vehicle-booking/ |
| 6 | เข้าระบบครั้งแรกด้วย carbooking.gad@gmail.com + นำเข้าข้อมูลเริ่มต้น | ✅ เสร็จแล้ว |
| 7 | Apps Script (เก็บไฟล์ลง Google Drive) — ไดรฟ์ที่แชร์ "งานยานพาหนะ" | ✅ เสร็จแล้ว · ปุ่มตั้งรหัสผ่านใหม่ใช้ได้ (8 พ.ย. 2569 — วาง appsscript.json ที่มี scope cloud-platform แล้ว ไม่ต้องผูก GCP project) |
| 8 | Longdo Map (ไม่บังคับ) | ✅ key แพ็กเกจ Free · โดเมน carbooking-pcshspt.github.io (จัดการที่ https://api.longdo.com/console/) |
| 9 | ทดสอบ 2 เครื่อง (เรียลไทม์ · ไฟล์แนบ · คนขับออกเดินทาง/ค่าน้ำมัน/กลับถึง · ประเมินคนขับ) | ✅ เสร็จแล้ว 8 พ.ย. 2569 |

**ข้อมูลโปรเจกต์ (ใช้อ้างอิง)**
| รายการ | ค่า |
|---|---|
| Project ID | `carbooking-ae9d8` |
| Project number | `758321103802` |
| ผู้ดูแลระบบสูงสุดคนแรก | `carbooking.gad@gmail.com` (เข้าด้วยปุ่ม Google เท่านั้น) |
| โดเมนอีเมลครู | `@pcshspt.ac.th` |

---

## 0. ลองใช้ก่อนติดตั้ง (โหมดทดลอง)
ดับเบิลคลิก `app/index.html` จะเปิด**โหมดทดลอง** เก็บข้อมูลในเบราว์เซอร์เครื่องนั้นเท่านั้น พร้อมข้อมูลตัวอย่าง (รถ 14 คัน คนขับ 7 คน คำขอย้อนหลัง 5 เดือน)
เปิดจากไฟล์ในเครื่อง (`file://`) หรือเติม `?local` ท้ายลิงก์ = โหมดทดลองเสมอ แม้ใส่ค่า Firebase แล้ว

| บทบาท (ข้อมูลตัวอย่าง) | วิธีเข้า |
|---|---|
| ผู้ดูแลระบบสูงสุด | กด "เข้าสู่ระบบด้วย Google" → เลือก tripop@pcshspt.ac.th |
| ครู | กด Google → เลือกครูคนใดก็ได้ |
| ผู้บริหาร | กด Google → director@pcshspt.ac.th |
| แอดมิน (username) | `admin` / `admin1234` |
| คนขับ (username) | `sawong`, `boontan`, `pallop`, `manachai`, `athithep`, `chaiwat`, `nattapong` / `1234` |

ปุ่ม "ล้างข้อมูลตัวอย่าง" มุมซ้ายล่างใช้สร้างข้อมูลใหม่

---

## 1. โปรเจกต์ Firebase ✅
สร้างแล้ว: **carbooking** (`carbooking-ae9d8`) — เปิดที่ https://console.firebase.google.com แล้วเลือกโปรเจกต์ carbooking
> ไม่ต้องกด Add project อีก · ตรวจมุมขวาบนว่าใช้บัญชี **carbooking.gad@gmail.com** (บัญชีเจ้าของโปรเจกต์)

## 2. เปิดการเข้าสู่ระบบ (Authentication)
1. เมนูซ้าย **Security → Authentication** → **Get started**
2. แท็บ **Sign-in method**
   - **Google** → Enable → ใส่อีเมลติดต่อ (carbooking.gad@gmail.com) → Save
   - **Add new provider → Email/Password** → เปิดเฉพาะช่องแรก (Email/Password) → Save — ใช้กับบัญชี username ของแอดมิน/คนขับที่ไม่มีอีเมล

## 3. ฐานข้อมูลกลาง (Firestore)
1. เมนูซ้าย **Databases & Storage → Firestore Database** → **Create database**
2. Location: **asia-southeast1 (Singapore)** → **Start in production mode** → Create
   (เลือก location แล้วเปลี่ยนภายหลังไม่ได้)
3. แท็บ **Rules** → วางกฎ:
   1. ใน VS Code เปิด `firebase/firestore.rules` → คลิกในไฟล์ → **Ctrl+A** → **Ctrl+C**
   2. ใน Firebase คลิกในกล่อง Rules → **Ctrl+A** → **Ctrl+V** (แทนที่ของเดิมทั้งหมด)
   3. ตรวจว่าบรรทัดสุดท้ายเป็น **บรรทัดที่ 112** และลงท้ายด้วย `}` สองตัว
   4. กด **Publish** → แถบซ้ายมีเวอร์ชันใหม่ ไม่มีแถบแดง
4. ไม่ต้องสร้าง collection หรือ index เอง — ระบบสร้างให้อัตโนมัติเมื่อใช้งาน

> ⚠️ ถ้าขึ้น `Unexpected '<EOF>'` หรือ `expecting '}'` = คัดลอกมาไม่ครบ ให้ทำข้อ 3 ใหม่ด้วย Ctrl+A
> แก้ `firestore.rules` ครั้งใดก็ตาม ต้องวางใหม่ + Publish ทุกครั้ง

## 4. ค่าการเชื่อมต่อ ✅
ใส่ไว้แล้ว ไม่ต้องแก้ (เก็บไว้อ้างอิง):
- `app/assets/js/config.js` → `firebase: { apiKey, authDomain: 'carbooking-ae9d8.firebaseapp.com', projectId: 'carbooking-ae9d8', … }` · `bootstrapAdmins: ['carbooking.gad@gmail.com']`
- `apps-script/Code.gs` → `FIREBASE_API_KEY`, `FIREBASE_PROJECT: 'carbooking-ae9d8'`
- `firebase/firestore.rules` → `bootstrap()` = `carbooking.gad@gmail.com`

ใส่แล้วเช่นกัน: `appsScriptUrl` (ขั้นตอนที่ 7) · `longdoKey` (ขั้นตอนที่ 8)

> ค่า Firebase ในเว็บเปิดเผยได้ตามปกติ ความปลอดภัยอยู่ที่กฎ `firestore.rules`
> **เปลี่ยนผู้ดูแลระบบสูงสุดคนแรก** ต้องแก้ 2 ที่ให้ตรงกัน: `bootstrapAdmins` ใน `config.js` และ `bootstrap()` ใน `firestore.rules` (แล้ววางกฎใหม่ + Publish)

## 5. อัปโหลดเว็บขึ้น GitHub Pages
1. https://github.com → **New repository** (เช่น `pcshspt-vehicle`, Public) → อัปโหลด**ไฟล์ทั้งหมดในโฟลเดอร์ `app/`** ให้ `index.html` อยู่ชั้นนอกสุดของ repository
2. **Settings → Pages** → Source: Deploy from a branch → Branch `main` / `/ (root)` → Save → รอ 1–2 นาที
   ได้ลิงก์ `https://<ชื่อบัญชี>.github.io/pcshspt-vehicle/`
3. กลับไป Firebase → **Security → Authentication → Settings → Authorized domains → Add domain** → ใส่ `<ชื่อบัญชี>.github.io` (ไม่ต้องมี https:// และชื่อ repository)
   ถ้าไม่เพิ่ม ปุ่ม Google จะขึ้น `auth/unauthorized-domain`

## 6. เข้าระบบครั้งแรก
1. เปิดลิงก์เว็บ → **เข้าสู่ระบบด้วย Google** → เลือก **carbooking.gad@gmail.com**
   ระบบตั้งเป็น**ผู้ดูแลระบบสูงสุด**อัตโนมัติ (อีเมลนี้เข้าได้แม้ไม่ใช่ @pcshspt.ac.th — ต้องใช้ปุ่ม Google เท่านั้น)
2. กรอกโปรไฟล์ → **ระบบหลังบ้าน → ภาพรวม** → **"นำเข้าข้อมูลเริ่มต้น"** → ได้รถ 14 คัน + คนขับ 7 คน + สถานที่ยอดนิยม (แก้ไขภายหลังได้)
3. **ผู้ใช้และสิทธิ์** → ให้สิทธิ์แอดมินกับเจ้าหน้าที่งานยานพาหนะ (เจ้าหน้าที่ต้องเข้าระบบด้วย Google @pcshspt.ac.th 1 ครั้งก่อน จึงจะมีชื่อในรายการ)

## 7. Apps Script — เก็บไฟล์แนบใน Google Drive
ไฟล์ทั้งหมด (บันทึกข้อความที่ครูแนบตอนขอรถ · รูปใบเสร็จค่าน้ำมัน · ใบเสร็จค่าซ่อม · รูปรถ ฯลฯ) เก็บใน Google Drive
ไม่แชร์สาธารณะ — เว็บขอไฟล์ผ่าน Apps Script ซึ่งตรวจว่าเป็นผู้ใช้ในระบบทุกครั้ง

```
ระบบยานพาหนะ - ไฟล์/
  บันทึกข้อความขอใช้รถ/2569/11 พฤศจิกายน/VR-2569-0012_บันทึกข้อความ_20261107-093012.pdf
  ใบเสร็จค่าน้ำมันและค่าใช้จ่าย/2569/11 พฤศจิกายน/VR-2569-0012_ค่าน้ำมัน_20261108-171544.jpg
  ใบเสร็จค่าซ่อมรถ/  เอกสารรถ/  รูปรถ/  รูปคนขับ/  รูปคณะทำงาน/
```

**เลือกที่เก็บไฟล์**
- **ก. ไดรฟ์ที่แชร์ (Shared drive) ของโรงเรียน — แนะนำ** ไฟล์เป็นของโรงเรียน ไม่หายเมื่อเจ้าหน้าที่ย้าย/ลาออก
  1. ผู้ใช้บัญชี @pcshspt.ac.th: Google Drive → **ไดรฟ์ที่แชร์ → สร้าง** (เช่น `งานยานพาหนะ`) → สร้างโฟลเดอร์ `ระบบยานพาหนะ - ไฟล์`
  2. **จัดการสมาชิก** → เพิ่ม `carbooking.gad@gmail.com` เป็น **ผู้จัดการเนื้อหา** (ถ้าเพิ่มไม่ได้ แปลว่าโรงเรียนปิดการแชร์กับบัญชีภายนอก — ติดต่อผู้ดูแล Google Workspace ของโรงเรียน หรือใช้แบบ ข)
  3. เปิดโฟลเดอร์ → คัดลอก ID ท้ายลิงก์ `https://drive.google.com/drive/folders/<ID>` → ใส่ใน `ROOT_FOLDER_ID` ของ `Code.gs`
  4. เพิ่มเจ้าหน้าที่งานยานพาหนะเป็นสมาชิก เพื่อเปิดดูไฟล์ใน Drive ได้
- **ข. ไดรฟ์ของ carbooking.gad@gmail.com** — เว้น `ROOT_FOLDER_ID` ว่าง ระบบสร้างโฟลเดอร์ให้เอง (พื้นที่ฟรี 15 GB ใช้ร่วมกับ Gmail)

**ติดตั้ง** (ใช้บัญชี **carbooking.gad@gmail.com** — ต้องเป็นบัญชีเดียวกับเจ้าของ Firebase)
1. https://script.google.com → **New project** → ตั้งชื่อ `ระบบยานพาหนะ`
2. ลบโค้ดเดิมใน `Code.gs` → วางโค้ดจาก `apps-script/Code.gs` ทั้งไฟล์ (ค่า Firebase ใส่ไว้แล้ว) · แบบ ก ใส่ `ROOT_FOLDER_ID`
3. ⚙️ **Project Settings** → ติ๊ก **Show "appsscript.json" manifest file** → กลับไปหน้า Editor → เปิด `appsscript.json` → วางเนื้อหาจาก `apps-script/appsscript.json`
4. ⚙️ **Project Settings → Google Cloud Platform (GCP) Project → Change project** → ใส่ Project number **`758321103802`** → Set project
   (จำเป็นสำหรับปุ่ม "ตั้งรหัสผ่านใหม่" ของบัญชี username — ถ้าขึ้นให้ตั้งค่า OAuth consent screen ให้ทำตามลิงก์ที่ขึ้นมา เลือก External แล้วกรอกชื่อแอป/อีเมล)
5. หน้า Editor เลือกฟังก์ชัน **`authorize`** → **Run** → **Review permissions** → เลือกบัญชี → Advanced → Go to (unsafe) → **Allow**
   ดู **Execution log** ต้องเห็น `พร้อมใช้งาน: ระบบยานพาหนะ - ไฟล์ → https://drive.google.com/...` และใน Drive มีโฟลเดอร์ประเภทไฟล์ครบ
6. **Deploy → New deployment** → ⚙️ Select type: **Web app** · Execute as: **Me** · Who has access: **Anyone** → Deploy → คัดลอก **Web app URL** (ลงท้าย `/exec`)
   ทดสอบ: เปิด URL ในเบราว์เซอร์ ต้องเห็น `{"ok":true,"service":"pcshs-vehicle",...}`
7. ใส่ URL ใน `config.js` → `appsScriptUrl: 'https://script.google.com/macros/s/.../exec'` → อัปโหลด `config.js` ขึ้น GitHub ใหม่

> แก้โค้ด Apps Script ครั้งต่อไป: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL เดิม ไม่ต้องแก้ config.js)
> "Anyone" จำเป็นเพื่อให้เว็บเรียกได้ — สคริปต์ปฏิเสธทุกคำขอที่ไม่มีบัตรผ่าน (ID token) ของผู้ใช้ในระบบ

## 8. Longdo Map (ไม่บังคับ)
1. สมัคร API key ที่ https://map.longdo.com/console (ฟรี — ตรวจเงื่อนไขโควตาล่าสุดในหน้าเว็บ)
2. ตั้งโดเมนที่อนุญาตเป็น `<ชื่อบัญชี>.github.io`
3. ใส่ key ใน `config.js` → `longdoKey` → อัปโหลดใหม่
4. หลังบ้าน → **ตั้งค่า → ตำแหน่งโรงเรียน** → ปักหมุดให้ตรงที่ตั้งโรงเรียนจริง

> ยังไม่ใส่ key ก็ใช้งานได้ — ครูเลือกจาก "สถานที่ที่เคยไป" หรือกรอกชื่อ/ระยะทางเอง

## 9. ทดสอบฐานข้อมูลกลาง (2 เครื่อง)
1. เครื่อง A เข้าด้วยบัญชีครู (@pcshspt.ac.th) → ขอใช้รถ + แนบบันทึกข้อความ (PDF/รูป)
2. เครื่อง B เข้าด้วยแอดมิน → **คำขอใหม่ขึ้นทันทีโดยไม่ต้องรีเฟรช** → เปิดไฟล์แนบได้ → อนุมัติ + มอบหมายคนขับ
3. เครื่อง A เห็นสถานะ "อนุมัติแล้ว" ทันที · มือถือคนขับเห็นงาน → กด "ออกเดินทาง" → ทุกเครื่องเห็น "กำลังเดินทาง"
4. คนขับบันทึกค่าน้ำมัน + ถ่ายรูปใบเสร็จ → เปิด Google Drive โฟลเดอร์ `ใบเสร็จค่าน้ำมันและค่าใช้จ่าย` ต้องเห็นไฟล์ชื่อขึ้นต้นด้วยเลขคำขอ
5. ครูประเมินคนขับ → แอดมิน/ผู้บริหารเห็นผลในหน้าสถิติ

> หลายคนกดพร้อมกัน (เช่น คนขับกดออกเดินทาง ขณะแอดมินเพิ่มค่าใช้จ่ายในคำขอเดียวกัน) ระบบอ่านข้อมูลล่าสุดก่อนเขียนเสมอ ข้อมูลไม่ทับกัน
> ต้องต่ออินเทอร์เน็ตขณะบันทึก ถ้าเน็ตหลุดจะแจ้ง "เชื่อมต่อฐานข้อมูลไม่ได้" ให้ลองใหม่

## 10. ตั้งค่าหลังติดตั้ง
- **ผู้ใช้และสิทธิ์** → "สร้างบัญชีชื่อผู้ใช้" ให้แอดมิน/คนขับที่ไม่มีอีเมล (ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก)
- **พนักงานขับรถ** → ปุ่ม "สร้างบัญชี" ข้างชื่อคนขับ (ผูกบัญชีให้อัตโนมัติ)
- **ผู้ใช้และสิทธิ์** → "เพิ่มอีเมลภายนอก" ให้ครูที่ไม่มีอีเมลโรงเรียน (เข้าด้วย Gmail)
- ให้สิทธิ์ **ผู้บริหาร** กับ ผอ. (เห็นเฉพาะสถิติและผลประเมินคนขับ)
- **ตั้งค่า** → ข้อมูลติดต่อ + คณะทำงาน (ระดับรองผู้อำนวยการ และระดับรองลงมา)

---

## แก้ปัญหาที่พบบ่อย
| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| Firebase Rules ขึ้น `Unexpected '<EOF>'` / `expecting '}'` | คัดลอกกฎไม่ครบ → ขั้นตอน 3 ข้อ 3 (Ctrl+A ทั้งไฟล์ ต้องได้ 112 บรรทัด) |
| หา **Add project** ไม่เจอ | ไม่ต้องสร้างใหม่ ใช้โปรเจกต์ carbooking ที่มีอยู่ |
| เว็บยังขึ้น "โหมดทดลอง" | เปิดจากไฟล์ในเครื่อง (`file://`) หรือมี `?local` — ต้องเปิดผ่านลิงก์ GitHub Pages |
| กด Google แล้วขึ้น `auth/unauthorized-domain` | ยังไม่เพิ่มโดเมนใน Authorized domains (ขั้นตอน 5 ข้อ 3) |
| "บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งาน" | อีเมลไม่ใช่ @pcshspt.ac.th และแอดมินยังไม่ได้เพิ่มเป็นอีเมลภายนอก |
| "ไม่มีสิทธิ์ทำรายการนี้" | ยังไม่ Publish กฎ / กฎเป็นฉบับเก่า / อีเมลใน `bootstrap()` ไม่ตรงกับ `config.js` |
| เข้าด้วย carbooking.gad@gmail.com แล้วไม่ได้เป็นผู้ดูแลระบบสูงสุด | ต้องเข้าด้วย**ปุ่ม Google** ไม่ใช่ช่องชื่อผู้ใช้/รหัสผ่าน · ตรวจว่า Publish กฎฉบับที่มี carbooking.gad@gmail.com แล้ว |
| แนบไฟล์แล้วขึ้น "ยังไม่ได้ตั้งค่าที่เก็บไฟล์" | ยังไม่ใส่ `appsScriptUrl` ใน `config.js` (ขั้นตอน 7) |
| แนบไฟล์แล้วขึ้น "เชื่อมต่อ Apps Script ไม่ได้" | Deploy ไม่ได้ตั้ง Who has access = **Anyone** หรือ URL ไม่ใช่ตัวลงท้าย `/exec` |
| คนขับกด "ออกเดินทาง" แล้วขึ้น "ไม่มีสิทธิ์ทำรายการนี้" | สร้างบัญชีคนขับหลังอนุมัติงานไปแล้ว (เว็บเวอร์ชันก่อน `?v=2026-11-08c`) → แอดมินเปิดคำขอนั้น → กด **บันทึกการเปลี่ยนแปลง** 1 ครั้ง · เวอร์ชันใหม่อัปเดตให้อัตโนมัติตอนสร้างบัญชี |
| ตั้งรหัสผ่านใหม่แล้วขึ้น `403 ... insufficient authentication scopes` | ใน Apps Script ยังไม่มี/ยังไม่ได้วาง `appsscript.json` (ต้องมี scope `cloud-platform`) → ขั้นตอน 7 ข้อ 3 → Run `authorize` → Allow → Deploy เวอร์ชันใหม่ |
| แก้ Code.gs แล้วไม่มีผล | ต้อง Manage deployments → Edit → **New version** |
| Push แล้วเว็บยังเป็นของเก่า | เบราว์เซอร์จำไฟล์เก่าไว้ (สูงสุด ~10 นาที) → เปิดหน้าต่างไม่ระบุตัวตน หรือรอ · ทุกครั้งที่แก้ไฟล์ใน `app/assets/` ให้เปลี่ยนเลข `?v=...` ใน `app/index.html` ด้วย เครื่องผู้ใช้จะได้ไฟล์ใหม่ทันที |

## ขอบเขตรอบนี้ / รอบถัดไป
- ✅ ดีไซน์ · ล็อกอิน (Google + username) · หน้าแรก/ตารางรถ · ข้อมูลรถ (เผยแพร่ + เชิงลึก) · ฟอร์มขอใช้รถ · อนุมัติ/มอบหมายรถหลายคัน + หมายเหตุ · หน้าคนขับ · ประเมินคนขับ · ค่าน้ำมัน/ค่าใช้จ่าย · สถิติ + ส่งออก Excel/PDF
- ✅ ฐานข้อมูลกลาง Firestore แบบเรียลไทม์ (กันข้อมูลทับกันเมื่อหลายเครื่องกดพร้อมกัน) · ไฟล์แนบเก็บใน Google Drive แยกโฟลเดอร์ตามประเภท
- ⏳ รอบถัดไป: แจ้งเตือน LINE · ระบบสำรองข้อมูลไป Google Drive · ประวัติการแก้ไข (audit log แบบละเอียด)
