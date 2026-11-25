/* ═══════════════════════════════════════════════════════════
   Service worker — ให้เปิดแอปได้แม้ไม่มีอินเทอร์เน็ต (ใช้ไฟล์ที่เคยโหลดไว้)
   · มีเน็ต: โหลดของใหม่เสมอ (network-first) แล้วเก็บสำเนาไว้
   · ไม่มีเน็ต: ใช้สำเนาล่าสุดในเครื่อง
   · ข้อมูล (Firestore) ไม่ผ่านตัวนี้ — Firestore เก็บข้อมูล/คิวการเขียนในเครื่องเอง
   ═══════════════════════════════════════════════════════════ */
const CACHE = 'vb-shell-v1';
const HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !HOSTS.includes(url.hostname)) return;   // Firestore / Google Drive / Longdo ฯลฯ ไม่ยุ่ง
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      // เปิดหน้าแอปตอนไม่มีเน็ต (เช่น app/ กับ app/index.html หรือมี ?as=) → ใช้หน้าหลักที่เก็บไว้
      if (req.mode === 'navigate') return (await caches.match('./')) || (await caches.match('./index.html')) || Response.error();
      return Response.error();
    })
  );
});
