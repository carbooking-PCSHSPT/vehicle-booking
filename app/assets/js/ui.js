/* ═══════════════════════════════════════════════════════════
   UI — ตัวช่วยหน้าจอ: รูปแบบวันเวลา ป้ายสถานะ ป๊อปอัป แจ้งเตือน ไฟล์/รูปภาพ
   ═══════════════════════════════════════════════════════════ */
const UI = (() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const fmt = {
    date: d => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-',
    dateLong: d => d ? new Date(d).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-',
    dateMid: d => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
    dayMonth: d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    time: d => d ? new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
    dt: d => d ? `${fmt.date(d)} ${fmt.time(d)} น.` : '-',
    when: d => sameDay(d, new Date()) ? `${fmt.time(d)} น.` : `${fmt.dayMonth(d)} ${fmt.time(d)} น.`,
    range(a, b) {
      if (sameDay(a, b)) return `${fmt.date(a)} · ${fmt.time(a)}–${fmt.time(b)} น.`;
      return `${fmt.date(a)} ${fmt.time(a)} – ${fmt.date(b)} ${fmt.time(b)} น.`;
    },
    days(a, b) { const d = Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 864e5) + 1; return d; },
    dur(ms) { const m = Math.max(0, Math.round(ms / 6e4)), h = Math.floor(m / 60); return h ? `${h} ชม. ${m % 60 ? (m % 60) + ' นาที' : ''}`.trim() : `${m} นาที`; },
    ago(d) {
      const s = (Date.now() - new Date(d)) / 1000;
      if (s < 60) return 'เมื่อสักครู่';
      if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
      if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
      if (s < 86400 * 7) return `${Math.floor(s / 86400)} วันที่แล้ว`;
      return fmt.date(d);
    },
    money: n => (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    num: (n, d = 0) => (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }),
    // แปลงเป็นค่าสำหรับ <input type="datetime-local">
    local: d => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); },
    localDate: d => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
  };

  // แปลง 'YYYY-MM-DD' จากลิงก์เป็นวันที่ (ค่าผิดรูปแบบ → วันนี้ ไม่ให้หน้าเว็บพัง)
  const dayOf = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); return isNaN(d) ? new Date() : d; };
  const pill = (m, extra = '') => m ? `<span class="pill tone-${m.tone} ${m.pulse ? 'pulse' : ''} ${extra}">${esc(m.label)}</span>` : '';
  const kindIcon = k => ({ bus: 'bus', minibus: 'bus', car: 'car', pickup: 'truck', truck: 'truck', special: 'cart' }[k] || 'van');
  const avatar = (name, cls = '') => `<span class="avatar ${cls}">${esc((String(name || '?').replace(/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/, '').trim()[0]) || '?')}</span>`;
  const empty = (text, ic = 'info', extra = '') => `<div class="empty">${icon(ic)}<p>${text}</p>${extra}</div>`;

  // ───────── แจ้งเตือนชั่วคราว ─────────
  function toast(msg, kind = 'ok') {
    let wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'checkCircle')}<span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, kind === 'error' ? 5200 : 3200);
  }

  // ───────── ป๊อปอัป ─────────
  let modalStack = 0;
  function modal({ title = '', body = '', actions = [], size = '', onOpen, dismissable = true } = {}) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'modal-wrap';
      el.innerHTML = `
        <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <header class="modal-head"><h3>${title}</h3>${dismissable ? `<button class="icon-btn sm" data-x aria-label="ปิด">${icon('x')}</button>` : ''}</header>
          <div class="modal-body">${body}</div>
          ${actions.length ? `<footer class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind || 'btn-ghost'}" data-act="${i}" type="button">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('')}</footer>` : ''}
        </div>`;
      document.body.appendChild(el);
      document.body.classList.add('modal-open');
      modalStack++;
      requestAnimationFrame(() => el.classList.add('show'));
      const close = (v) => {
        el.classList.remove('show');
        setTimeout(() => { el.remove(); modalStack--; if (!modalStack) { document.body.classList.remove('modal-open'); document.dispatchEvent(new Event('ui:modal-closed')); } }, 250);
        document.removeEventListener('keydown', onKey);
        resolve(v);
      };
      const onKey = e => { if (e.key === 'Escape' && dismissable) close(null); };
      document.addEventListener('keydown', onKey);
      el.addEventListener('click', async e => {
        if (dismissable && (e.target === el || e.target.closest('[data-x]'))) return close(null);
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = actions[+b.dataset.act];
        if (a.onClick) {
          b.disabled = true;
          try { const r = await a.onClick(el, close); if (r !== false) close(r === undefined ? a.value ?? true : r); }
          catch (err) { toast(err.message || String(err), 'error'); }
          finally { b.disabled = false; }
        } else close(a.value ?? true);
      });
      if (onOpen) onOpen(el, close);
      const f = el.querySelector('input:not([type=hidden]),textarea,select');
      if (f && !('ontouchstart' in window)) setTimeout(() => f.focus(), 60);
    });
  }
  function confirm(msg, { title = 'ยืนยัน', ok = 'ยืนยัน', danger = false, input = null } = {}) {
    const body = `<p class="muted">${msg}</p>${input ? `<div class="field" style="margin-top:14px"><label>${esc(input.label)}${input.required ? ' <b class="req">*</b>' : ''}</label><textarea id="cfIn" rows="3" placeholder="${esc(input.placeholder || '')}">${esc(input.value || '')}</textarea></div>` : ''}`;
    return modal({
      title, body, actions: [
        { label: 'ยกเลิก', value: false },
        { label: ok, kind: danger ? 'btn-danger' : 'btn-primary', onClick: el => {
          if (!input) return true;
          const v = el.querySelector('#cfIn').value.trim();
          if (input.required && !v) { toast(`กรุณากรอก${input.label}`, 'error'); return false; }
          return { value: v };
        } }
      ]
    });
  }

  // ───────── ไฟล์และรูปภาพ ─────────
  // ย่อรูปก่อนอัปโหลด (กว้างไม่เกิน maxW, JPEG) · PDF รับตามขนาดที่กำหนด
  function readFiles(fileList, { maxW = 1600, quality = .82, allowPdf = false, maxPdfMB = 8 } = {}) {
    return Promise.all([...fileList].map(f => new Promise((res, rej) => {
      if (f.type === 'application/pdf') {
        if (!allowPdf) return rej(new Error('รับเฉพาะไฟล์รูปภาพ'));
        if (f.size > maxPdfMB * 1048576) return rej(new Error(`ไฟล์ PDF ต้องไม่เกิน ${maxPdfMB} MB`));
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('อ่านไฟล์ไม่สำเร็จ')); r.readAsDataURL(f); return;
      }
      if (!/^image\//.test(f.type)) return rej(new Error('รับเฉพาะไฟล์รูปภาพ' + (allowPdf ? ' หรือ PDF' : '')));
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const r = Math.min(1, maxW / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('เปิดรูปไม่สำเร็จ')); };
      img.src = url;
    })));
  }
  const isPdf = ref => /^data:application\/pdf/.test(ref) || /\.pdf$/i.test(ref) || /^drive:.*#pdf$/.test(ref);
  // เติมรูป/ไฟล์ที่เก็บใน Drive (โหลดผ่าน Apps Script เมื่อแสดงผล)
  function hydrate(root = document) {
    $$('img[data-file]', root).forEach(img => {
      if (img._h) return; img._h = 1;
      Store.fileUrl(img.dataset.file).then(u => { img.src = u; }).catch(() => { img.alt = 'โหลดรูปไม่สำเร็จ'; img.classList.add('broken'); });
    });
  }
  async function openFile(ref) {
    try {
      const u = await Store.fileUrl(ref);
      if (/^data:/.test(u)) { const b = await (await fetch(u)).blob(); window.open(URL.createObjectURL(b), '_blank'); }
      else window.open(u, '_blank');
    } catch (e) { toast('เปิดไฟล์ไม่สำเร็จ: ' + e.message, 'error'); }
  }
  // แสดงรูปย่อ (รองรับ PDF)
  const thumb = (ref, cls = '') => isPdf(ref) || /^drive:/.test(ref) && /pdf/i.test(ref)
    ? `<button type="button" class="thumb pdf ${cls}" data-view="${esc(ref)}">${icon('file')}<span>PDF</span></button>`
    : `<button type="button" class="thumb ${cls}" data-view="${esc(ref)}"><img ${/^drive:/.test(ref) ? `data-file="${esc(ref)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="` : `src="${esc(ref)}"`} alt="ไฟล์แนบ" loading="lazy"></button>`;
  const img = (ref, alt = '', cls = '') => ref ? (/^drive:/.test(ref) ? `<img class="${cls}" data-file="${esc(ref)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="${esc(alt)}">` : `<img class="${cls}" src="${esc(ref)}" alt="${esc(alt)}" loading="lazy">`) : '';

  // อ่านค่าฟอร์ม
  function formData(form) {
    const o = {};
    $$('[name]', form).forEach(el => {
      if (el.type === 'checkbox') { if ('multi' in el.dataset) { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    });
    return o;
  }
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // แอนิเมชัน: ปรากฏเมื่อเลื่อนถึง + นับตัวเลข
  let io = null;
  function animate(root = document, { quiet = false } = {}) {
    // วาดซ้ำหน้าเดิม: แสดงผลทันที ไม่นับเลขใหม่/ไม่เลื่อนปรากฏใหม่
    if (quiet) {
      $$('.reveal', root).forEach(el => el.classList.add('in'));
      $$('[data-count]', root).forEach(el => { el._c = 1; const to = parseFloat(el.dataset.count) || 0, dec = +(el.dataset.dec || 0); el.textContent = to.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec }); });
      return;
    }
    if (!io) io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count !== undefined && !e.target._c) { e.target._c = 1; countUp(e.target); }
      io.unobserve(e.target);
    }), { threshold: .12, rootMargin: '0px 0px -30px 0px' });
    $$('.reveal:not(.in), [data-count]', root).forEach(el => { if (!el._c) io.observe(el); });
  }
  function countUp(el) {
    const to = parseFloat(el.dataset.count) || 0, dec = +(el.dataset.dec || 0), t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ปุ่มกดแล้วแสดงสถานะกำลังทำงาน
  async function busy(btn, fn) {
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try { return await fn(); }
    catch (e) { toast(e.message || String(e), 'error'); throw e; }
    finally { if (btn) { btn.disabled = false; btn.classList.remove('loading'); } }
  }

  // ดาวน์โหลด Excel (ใช้ SheetJS ถ้ามี ถ้าไม่มีส่งออก CSV)
  function exportSheets(filename, sheets) {
    if (window.XLSX) {
      const wb = XLSX.utils.book_new();
      sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet([s.head, ...s.rows]); ws['!cols'] = s.head.map(() => ({ wch: 18 })); XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
      XLSX.writeFile(wb, filename + '.xlsx');
    } else {
      const s = sheets[0];
      const csv = [s.head, ...s.rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = filename + '.csv'; a.click();
    }
  }

  return { $, $$, esc, fmt, dayOf, pill, kindIcon, avatar, empty, toast, modal, confirm, readFiles, hydrate, openFile, thumb, img, isPdf, formData, debounce, animate, busy, exportSheets, sameDay };
})();
