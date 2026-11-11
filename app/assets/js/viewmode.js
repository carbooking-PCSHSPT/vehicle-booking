/* ═══════════════════════════════════════════════════════════
   มุมมองหน้าจอ: อัตโนมัติ · มือถือ · แท็บเล็ต · คอมพิวเตอร์
   - CSS ใช้คลาสบน <html> แทน @media:  .lt640 = กว้าง ≤ 640px, .ge900 = กว้าง ≥ 900px
   - อัตโนมัติ: คำนวณจากความกว้างจอจริง (อัปเดตเมื่อหมุนจอ/ย่อหน้าต่าง)
   - เลือกมุมมองที่ "แคบกว่าจอ" → แสดงเป็นกรอบกลางจอ (.vm-frame)
   - เลือกมุมมองที่ "กว้างกว่าจอ" (เช่น คอมพิวเตอร์บนมือถือ) → ขยาย viewport ให้เบราว์เซอร์ย่อทั้งหน้า
   โหลดใน <head> ก่อนแสดงผล จะได้ไม่เห็นหน้ากระโดด
   ═══════════════════════════════════════════════════════════ */
const ViewMode = (() => {
  'use strict';
  const KEY = 'vb-viewmode';
  const MODES = {
    auto: { label: 'อัตโนมัติ', icon: 'devices', w: 0 },
    mobile: { label: 'มือถือ', icon: 'smartphone', w: 430 },
    tablet: { label: 'แท็บเล็ต', icon: 'tablet', w: 1024 },
    desktop: { label: 'คอมพิวเตอร์', short: 'คอม', icon: 'monitor', w: 1280 }
  };
  const MAX = [1380, 1180, 1120, 1060, 1000, 900, 640], MIN = [900, 1100];
  const DEFAULT_VP = 'width=device-width, initial-scale=1';
  const root = document.documentElement;
  const touch = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  let mode = 'auto';
  try { const s = localStorage.getItem(KEY); if (MODES[s]) mode = s; } catch (e) { /* โหมดส่วนตัว/บล็อกที่เก็บข้อมูล */ }

  // ความกว้างจริงของอุปกรณ์ (ไม่ขึ้นกับ viewport ที่เราเปลี่ยนเอง)
  function deviceWidth() {
    if (!touch) return window.innerWidth;
    const a = screen.width, b = screen.height;
    const land = window.orientation === 90 || window.orientation === -90 || (screen.orientation && /landscape/.test(screen.orientation.type));
    return land ? Math.max(a, b) : Math.min(a, b);
  }
  function setViewport(c) {
    const m = document.querySelector('meta[name="viewport"]');
    if (m && m.getAttribute('content') !== c) m.setAttribute('content', c);
  }
  function apply() {
    const want = MODES[mode].w;
    setViewport(want && want > deviceWidth() ? `width=${want}` : DEFAULT_VP);
    const cw = root.clientWidth || window.innerWidth;
    const W = want || cw;
    const frame = !!want && want < cw;
    const wide = !!want && want > cw && !touch;    // หน้าต่างคอมแคบกว่ามุมมองที่เลือก → เลื่อนซ้าย-ขวาได้
    const keep = root.className.split(/\s+/).filter(c => c && !/^(lt|ge)\d+$|^vm-/.test(c));
    MAX.forEach(b => { if (W <= b) keep.push('lt' + b); });
    MIN.forEach(b => { if (W >= b) keep.push('ge' + b); });
    keep.push('vm-' + mode);
    if (frame) keep.push('vm-frame');
    if (wide) keep.push('vm-wide');
    const cls = keep.join(' ');
    if (root.className !== cls) root.className = cls;
    root.dataset.device = W <= 640 ? 'mobile' : W <= 1180 ? 'tablet' : 'desktop';
    if (frame || wide) {
      root.style.setProperty('--fw', want + 'px');
      root.style.setProperty('--fx', frame ? Math.floor((cw - want) / 2) + 'px' : '0px');
      root.style.setProperty('--vw', want / 100 + 'px');
    } else ['--fw', '--fx', '--vw'].forEach(p => root.style.removeProperty(p));
    document.querySelectorAll('[data-vm-now]').forEach(el => { const t = nowText(); if (el.textContent !== t) el.textContent = t; });
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  addEventListener('resize', later);
  addEventListener('orientationchange', () => setTimeout(apply, 250));

  function set(m) {
    if (!MODES[m] || m === mode) return;
    mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) { /* ไม่บันทึกก็ใช้ได้ในหน้านี้ */ }
    apply();
    document.querySelectorAll('[data-vmode]').forEach(b => { const on = b.dataset.vmode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    // ให้กราฟ/แผนที่ปรับขนาดตาม
    setTimeout(() => { apply(); dispatchEvent(new Event('resize')); }, 60);
  }
  const DEV = { mobile: 'มือถือ', tablet: 'แท็บเล็ต', desktop: 'คอมพิวเตอร์' };
  const nowText = () => mode === 'auto' ? `ตอนนี้แสดงแบบ${DEV[root.dataset.device]} (ตามขนาดจอ)` : `ล็อกมุมมองเป็น${MODES[mode].label}`;
  // ปุ่มเลือกมุมมอง (ใช้ในเมนูผู้ใช้และท้ายหน้า)
  function pickerHTML(extra = '') {
    return `<div class="vm-pick ${extra}" role="group" aria-label="มุมมองหน้าจอ">
      <span class="vm-title">มุมมองหน้าจอ</span>
      <div class="vm-opts">${Object.entries(MODES).map(([k, v]) => `<button type="button" class="vm-opt ${k === mode ? 'on' : ''}" data-vmode="${k}" aria-pressed="${k === mode}" title="${v.label}">${icon(v.icon)}<span>${v.short || v.label}</span></button>`).join('')}</div>
      <small class="vm-now" data-vm-now>${nowText()}</small>
    </div>`;
  }
  apply();
  return { MODES, get: () => mode, set, apply, device: () => root.dataset.device, pickerHTML, nowText };
})();
