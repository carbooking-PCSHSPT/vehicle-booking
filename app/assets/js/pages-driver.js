/* ═══════════════════════════════════════════════════════════
   หน้าพนักงานขับรถ (ออกแบบสำหรับมือถือ)
   งานของฉัน · กด ออกเดินทาง / กลับถึงแล้ว · เลขไมล์ · บันทึกเติมน้ำมัน
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, kindIcon, $ } = UI;
  const S = Store;

  // เลขไมล์ล่าสุดของรถ (ใช้เป็นค่าเริ่มต้น)
  function lastOdo(vehicleId) {
    let best = null;
    S.db.requests.forEach(r => (r.assignments || []).forEach(a => {
      if (a.vehicleId !== vehicleId) return;
      [a.odoEnd, a.odoStart].forEach(v => { if (v != null && (best == null || v > best)) best = v; });
    }));
    return best;
  }
  Pages._lastOdo = lastOdo;

  // ───────── ป๊อปอัปบันทึกค่าใช้จ่าย (ใช้ร่วมกับแอดมิน) ─────────
  // เพิ่มใหม่: หลายรายการในครั้งเดียว (เช่น น้ำมัน + ทางด่วน + ที่จอด) · วันที่ตั้งต้น = วันเดินทาง (บันทึกย้อนหลังได้)
  Pages._expenseModal = (r, vehicleId, ex = null) => ex ? expenseOne(r, vehicleId, ex) : expenseMany(r, vehicleId);
  function expenseMany(r, vehicleId) {
    const vs = (r.assignments || []).map(a => S.vehicle(a.vehicleId)).filter(Boolean);
    const a0 = (r.assignments || []).find(a => a.vehicleId === vehicleId) || (r.assignments || [])[0] || {};
    const today = fmt.localDate(new Date());
    // ทริปที่จบไปแล้ว → วันที่ตั้งต้นเป็นวันเดินทาง (ไม่ใช่วันนี้) ลดการกรอกวันผิด
    const defDate = new Date(r.endAt) < new Date() ? fmt.localDate(a0.returnedAt || r.endAt) : today;
    const minD = fmt.localDate(r.startAt), maxD = fmt.localDate(new Date(Math.max(Date.now(), new Date(r.endAt))));
    let n = 0; const pickers = new Map();
    // ── แต่ละรายการกรอกเฉพาะที่จำเป็นของประเภทนั้น (ไม่มี "รายละเอียดเพิ่มเติม") ──
    // น้ำมัน : ยอดเงิน* · ลิตร · ปั๊ม* (เลือก) · สาขา · วิธีชำระ · รูปบิล* (บังคับ)
    // อื่น ๆ : ยอดเงิน* · สถานที่* · วิธีชำระ · รูปบิล (ถ้ามี)
    // ราคา/ลิตร คำนวณให้ · วันที่ = วันเดินทาง (เลือกได้เฉพาะงานหลายวัน) · วิธีชำระ/ปั๊ม จำค่าที่ใช้ครั้งก่อน
    const mem = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
    const TYPES = [['fuel', 'fuel', 'น้ำมัน'], ['toll', 'route', 'ทางด่วน'], ['parking', 'pin', 'ที่จอด'], ['other', 'coins', 'อื่น ๆ']];
    const PLACE = { toll: 'เช่น ด่านบางปะอิน / ทางด่วนศรีรัช', parking: 'เช่น ลานจอด ม.เกษตรศาสตร์', other: 'เช่น ค่าล้างรถ ร้าน…' };
    const multiDay = fmt.localDate(r.startAt) !== fmt.localDate(r.endAt);
    const days = (() => { const out = [], d = UI.dayOf(minD), end = UI.dayOf(maxD); while (d <= end && out.length < 60) { out.push(fmt.localDate(d)); d.setDate(d.getDate() + 1); } return out; })();
    const row = (d = {}) => { const k = n++, ty = d.type || 'fuel', fuel = ty === 'fuel';
      const pay = d.pay || mem(fuel ? 'vb-exp-pay-fuel' : 'vb-exp-pay-x', fuel ? 'card' : 'cash'), brand = mem('vb-exp-brand', '');
      return `<div class="exr" data-row="${k}">
      <div class="exr-head"><b>รายการที่ <span class="exr-no"></span></b><button type="button" class="icon-btn sm" data-rmrow aria-label="ลบรายการนี้">${icon('trash')}</button></div>
      <div class="exr-types" role="radiogroup" aria-label="ประเภทค่าใช้จ่าย">${TYPES.map(([t, ic, l]) => `<label class="exr-type"><input type="radio" name="ty${k}" data-k="type" value="${t}" ${t === ty ? 'checked' : ''}><span>${icon(ic)}${l}</span></label>`).join('')}</div>
      <div class="exr-main">
        <div class="field"><label>ยอดเงิน (บาท) <b class="req">*</b></label><input data-k="amount" class="exr-amt" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00"></div>
        <div class="field fuel-only"><label>จำนวนลิตร</label><input data-k="liters" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00"><small class="hint exr-ppl"></small></div>
      </div>
      <div class="fuel-only">
        <div class="label-sm">ปั๊มน้ำมัน <b class="req">*</b></div>
        <div class="exr-brands" role="radiogroup" aria-label="ปั๊มน้ำมัน">${S.FUEL_BRANDS.map(b => `<label class="exr-brand"><input type="radio" name="br${k}" data-k="brand" value="${esc(b)}" ${b === brand ? 'checked' : ''}><span>${esc(b)}</span></label>`).join('')}</div>
        <div class="exr-two">
          <div class="field exr-brand-other" hidden><input data-k="brandOther" placeholder="ชื่อปั๊ม *"></div>
          <div class="field"><input data-k="branch" placeholder="สาขา (ไม่บังคับ) เช่น ลาดหลุมแก้ว"></div>
        </div>
      </div>
      <div class="field not-fuel"><label>สถานที่ <b class="req">*</b></label><input data-k="place" data-ph='${JSON.stringify(PLACE)}' placeholder="${esc(PLACE[ty] || '')}"></div>
      <div class="exr-two">
        <div class="field"><label>วิธีชำระ</label><select data-k="pay">${Object.entries(S.PAY).map(([t, l]) => `<option value="${t}" ${t === pay ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        ${multiDay ? `<div class="field"><label>วันที่</label><select data-k="date">${days.map(x => `<option value="${x}" ${x === (d.date || defDate) ? 'selected' : ''}>${fmt.dayMonth(UI.dayOf(x))}</option>`).join('')}</select></div>` : `<input type="hidden" data-k="date" value="${d.date || defDate}">`}
      </div>
      <div class="exr-pic">${C.filePicker('exPh' + k, [], { label: 'ถ่ายรูปบิล', capture: true, multiple: true })}<p class="hint exr-need"></p></div></div>`; };
    return UI.modal({
      title: `${icon('fuel')} บันทึกค่าใช้จ่าย · ${r.id}`, size: 'lg',
      body: `<div class="stack" id="exM">
        ${vs.length > 1 ? `<div class="field"><label>รถ</label><select id="exV">${vs.map(v => `<option value="${v.id}" ${v.id === (vehicleId || a0.vehicleId) ? 'selected' : ''}>${esc(v.name)} · ${esc(v.plate)}</option>`).join('')}</select></div>` : `<input type="hidden" id="exV" value="${esc(vehicleId || a0.vehicleId || '')}">`}
        <div id="exRows">${row()}</div>
        <button type="button" class="btn btn-ghost" id="exAdd">${icon('plus')} เพิ่มรายการ (เช่น ทางด่วน ที่จอดรถ)</button>
        <p class="hint">${icon('info')} บันทึกย้อนหลังได้ภายใน 30 วันหลังกลับถึง</p>
        <div class="exr-sum" id="exSum"></div>
      </div>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึกทั้งหมด', kind: 'btn-primary', icon: 'check', onClick: async el => {
        const vId = el.querySelector('#exV').value;
        const rows = [...el.querySelectorAll('.exr')].map(x => {
          const g = k => String((x.querySelector(`[data-k="${k}"]:checked`) || x.querySelector(`[data-k="${k}"]:not([type=radio])`) || {}).value || '').trim();
          const type = g('type'), fuel = type === 'fuel', amt = +g('amount') || 0, lit = fuel ? +g('liters') || 0 : 0;
          const brand = fuel ? (g('brand') === 'อื่น ๆ' ? g('brandOther') : g('brand')) : '';
          return { vehicleId: vId, type, date: g('date'), amount: g('amount'), liters: fuel ? g('liters') : '', pricePerL: lit && amt ? Math.round(amt / lit * 100) / 100 : '',
            brand, branch: fuel ? g('branch') : '', station: fuel ? [brand, g('branch')].filter(Boolean).join(' ') : g('place'), pay: g('pay'), photos: (pickers.get(+x.dataset.row) || (() => []))() };
        });
        const err = (i, m) => { UI.toast(`รายการที่ ${i + 1}: ${m}`, 'error'); return false; };
        for (let i = 0; i < rows.length; i++) {
          const x = rows[i];
          if (!(+x.amount > 0)) return err(i, 'กรุณาระบุยอดเงิน');
          if (x.type === 'fuel' && !x.brand) return err(i, 'กรุณาเลือกปั๊มน้ำมัน');
          if (x.type === 'fuel' && !x.photos.length) return err(i, 'ค่าน้ำมันต้องถ่ายรูปบิลประกอบ');
          if (x.type !== 'fuel' && !x.station) return err(i, 'กรุณาระบุสถานที่');
        }
        try { rows.forEach(x => { localStorage.setItem(x.type === 'fuel' ? 'vb-exp-pay-fuel' : 'vb-exp-pay-x', x.pay); if (x.type === 'fuel' && S.FUEL_BRANDS.includes(x.brand)) localStorage.setItem('vb-exp-brand', x.brand); }); } catch (e) { /* ไม่จำก็ได้ */ }
        for (const x of rows) await S.saveExpense(r.id, x);
        UI.toast(`บันทึกค่าใช้จ่าย ${rows.length} รายการแล้ว`); return true;
      } }],
      onOpen(el) {
        const box = el.querySelector('#exRows');
        const bindRow = x => {
          const k = +x.dataset.row; pickers.set(k, C.bindFilePicker(x, 'exPh' + k, []));
          const q = s => x.querySelector(`[data-k="${s}"]:not([type=radio])`);
          const type = () => (x.querySelector('[data-k="type"]:checked') || {}).value;
          const ph = JSON.parse(q('place').dataset.ph || '{}');
          const sync = () => {
            const t = type(), fuel = t === 'fuel';
            x.querySelectorAll('.fuel-only').forEach(f => { f.hidden = !fuel; }); x.querySelectorAll('.not-fuel').forEach(f => { f.hidden = fuel; });
            x.querySelector('.exr-main').classList.toggle('one', !fuel);
            q('place').placeholder = ph[t] || '';
            // ชื่อปุ่มรูปบิล + คำอธิบาย เปลี่ยนตามประเภท (น้ำมัน = บังคับ · อื่น ๆ = ถ้ามี)
            const lb = x.querySelector('.dropzone b'); if (lb) lb.textContent = fuel ? 'ถ่ายรูปบิลน้ำมัน *' : 'แนบบิล (ถ้ามี)';
            x.querySelector('.exr-need').textContent = fuel ? 'ค่าน้ำมันต้องมีรูปบิลประกอบ — ถ่ายให้เห็นยอดเงิน ลิตร และวันที่ชัดเจน' : 'ไม่บังคับแนบบิล';
            x.querySelector('.exr-pic').classList.toggle('opt', !fuel);
          };
          const syncBrand = () => { const o = (x.querySelector('[data-k="brand"]:checked') || {}).value === 'อื่น ๆ'; x.querySelector('.exr-brand-other').hidden = !o; if (o) q('brandOther').focus(); };
          const calc = () => { const l = +q('liters').value, a = +q('amount').value; x.querySelector('.exr-ppl').textContent = l && a ? `≈ ${fmt.num(a / l, 2)} บาท/ลิตร` : ''; total(); };
          x.querySelectorAll('[data-k="type"]').forEach(rb => rb.addEventListener('change', sync));
          x.querySelectorAll('[data-k="brand"]').forEach(rb => rb.addEventListener('change', syncBrand));
          q('liters').addEventListener('input', calc); q('amount').addEventListener('input', calc);
          sync(); syncBrand();
        };
        const renum = () => { [...box.querySelectorAll('.exr')].forEach((x, i) => { x.querySelector('.exr-no').textContent = i + 1; x.querySelector('[data-rmrow]').hidden = box.children.length < 2; }); total(); };
        const total = () => { const s = [...box.querySelectorAll('[data-k="amount"]')].reduce((a, i) => a + (+i.value || 0), 0); el.querySelector('#exSum').innerHTML = box.children.length > 1 ? `รวม ${box.children.length} รายการ · <b>${fmt.money(s)} บาท</b>` : ''; };
        bindRow(box.querySelector('.exr')); renum();
        el.querySelector('#exAdd').addEventListener('click', () => {
          const last = [...box.querySelectorAll('.exr')].pop(), g = k => last ? (last.querySelector(`[data-k="${k}"]:checked`) || last.querySelector(`[data-k="${k}"]:not([type=radio])`) || {}).value : '';
          box.insertAdjacentHTML('beforeend', row({ date: g('date'), type: g('type') === 'fuel' ? 'toll' : 'other' }));
          const x = [...box.querySelectorAll('.exr')].pop(); bindRow(x); renum(); x.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        box.addEventListener('click', e => { const b = e.target.closest('[data-rmrow]'); if (!b) return; const x = b.closest('.exr'); pickers.delete(+x.dataset.row); x.remove(); renum(); });
      }
    });
  }
  function expenseOne(r, vehicleId, ex = null) {
    const e = ex || { type: 'fuel', date: fmt.localDate(new Date()), pay: 'card', photos: [], vehicleId };
    const vs = (r.assignments || []).map(a => S.vehicle(a.vehicleId)).filter(Boolean);
    return UI.modal({
      title: `${icon('fuel')} ${ex ? 'แก้ไข' : 'บันทึก'}ค่าใช้จ่าย · ${r.id}`, size: 'lg',
      body: `<form id="exF" class="stack">
        <div class="grid2">
          <div class="field"><label>รถ</label><select name="vehicleId">${vs.map(v => `<option value="${v.id}" ${v.id === (e.vehicleId || vehicleId) ? 'selected' : ''}>${esc(v.name)} · ${esc(v.plate)}</option>`).join('')}</select></div>
          <div class="field"><label>ประเภท</label><select name="type">${Object.entries(S.EXPENSE).map(([k, l]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>วันที่</label><input name="date" type="date" value="${esc(e.date)}"></div>
          <div class="field"><label>ปั๊ม / สถานที่</label><input name="station" value="${esc(e.station || '')}" placeholder="เช่น ปตท. ลาดหลุมแก้ว"></div>
          <div class="field fuel-only"><label>จำนวนลิตร</label><input name="liters" type="number" step="0.01" min="0" value="${e.liters || ''}"></div>
          <div class="field fuel-only"><label>ราคาต่อลิตร (บาท)</label><input name="pricePerL" type="number" step="0.01" min="0" value="${e.pricePerL || ''}"></div>
          <div class="field"><label>ยอดเงิน (บาท) <b class="req">*</b></label><input name="amount" type="number" step="0.01" min="0" required value="${e.amount || ''}"></div>
          <div class="field fuel-only"><label>เลขไมล์ขณะเติม</label><input name="odo" type="number" min="0" value="${e.odo ?? ''}"></div>
          <div class="field"><label>วิธีชำระ</label><select name="pay">${Object.entries(S.PAY).map(([k, l]) => `<option value="${k}" ${k === e.pay ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>หมายเหตุ</label><input name="note" value="${esc(e.note || '')}"></div>
        </div>
        ${C.filePicker('exPh', e.photos || [], { label: 'ถ่ายรูป / แนบบิล', capture: false, hint: 'ถ่ายใบเสร็จให้ตรง เต็มใบ ในที่สว่าง — ต้องอ่านยอดเงิน จำนวนลิตร และวันที่ได้ชัดเจน' })}
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', icon: 'check', onClick: async el => {
        const f = UI.formData(el.querySelector('#exF'));
        if (!(+f.amount > 0)) { UI.toast('กรุณาระบุยอดเงิน', 'error'); return false; }
        await S.saveExpense(r.id, { ...e, ...f, photos: el._photos() });
        UI.toast('บันทึกค่าใช้จ่ายแล้ว'); return true;
      } }],
      onOpen(el) {
        el._photos = C.bindFilePicker(el, 'exPh', e.photos || []);
        const form = el.querySelector('#exF');
        const sync = () => { const fuel = form.type.value === 'fuel'; el.querySelectorAll('.fuel-only').forEach(x => { x.hidden = !fuel; }); };
        const calc = () => { const l = +form.liters.value, p = +form.pricePerL.value; if (l && p) form.amount.value = Math.round(l * p * 100) / 100; };
        form.type.addEventListener('change', sync); form.liters.addEventListener('input', calc); form.pricePerL.addEventListener('input', calc); sync();
      }
    });
  }

  // ───────── กติกาเวลา: ออกเดินทางได้ตั้งแต่ 30 นาทีก่อนเวลาออก · กลับก่อนเวลาที่ขอ ต้องระบุเหตุผล ─────────
  const EARLY_MIN = 30;
  const departFrom = r => new Date(new Date(r.startAt).getTime() - EARLY_MIN * 6e4);
  // ใช้กับทุกคนในหน้างานคนขับ (รวมแอดมิน) · แอดมินบันทึกแทนนอกเวลาได้จากหน้าคำขอในระบบหลังบ้านเท่านั้น (ต้องใส่เหตุผล)
  function departState(r) {
    const from = departFrom(r), now = new Date();
    if (now >= from) return { ok: true };
    return { ok: false, msg: `ออกเดินทางได้ ${UI.sameDay(from, now) ? '' : dShort(from) + ' '}${fmt.time(from)}` };
  }
  const earlyReturn = r => new Date() < new Date(new Date(r.endAt).getTime() - EARLY_MIN * 6e4);
  const departBtn = (r, i, cls = 'btn btn-primary full') => { const st = departState(r); return st.ok
    ? `<button class="${cls}" data-go="ontrip" data-r="${r.id}" data-i="${i}">${icon('navigation')} ออกเดินทาง</button>`
    : `<button class="${cls} is-wait" disabled title="กดได้ก่อนเวลาออก ${EARLY_MIN} นาที">${icon('clock')} ${st.msg}</button>`; };
  Pages._departState = departState;
  // ตรวจสภาพรถก่อนออกเดินทาง (คนขับต้องติ๊กครบ หรือแจ้งปัญหาที่พบ — แอดมินเห็นในหน้าภาพรวม)
  const CHECKS = ['น้ำมันเพียงพอสำหรับการเดินทาง', 'ลมยางและสภาพยางปกติ', 'ไฟหน้า ไฟเลี้ยว ไฟเบรก ใช้งานได้', 'เบรก พวงมาลัย ไม่มีไฟเตือนบนหน้าปัด', 'น้ำมันเครื่อง น้ำหล่อเย็น ระดับปกติ', 'อุปกรณ์ฉุกเฉินและเอกสารประจำรถครบ', 'ห้องโดยสารสะอาด เข็มขัดนิรภัยใช้งานได้'];

  // ───────── ป๊อปอัปเลขไมล์ / สถานะ ─────────
  // override = แอดมินบันทึกแทนคนขับจากหน้าหลังบ้าน (นอกเวลา/ข้ามการตรวจรถได้ แต่ต้องมีเหตุผล)
  Pages._tripAction = async (r, idx, status, { override = '' } = {}) => {
    const a = r.assignments[idx], v = S.vehicle(a.vehicleId) || {};
    const admin = S.isAdmin(S.me) && !!override, dep = status === 'ontrip';
    if (dep && !override && !departState(r).ok) return UI.toast(`ยังไม่ถึงเวลา — ${departState(r).msg} (ก่อนเวลาออก ${EARLY_MIN} นาที)`, 'error');
    const early = !dep && earlyReturn(r);
    const def = dep ? (a.odoStart ?? lastOdo(a.vehicleId) ?? '') : (a.odoEnd ?? '');
    const res = await UI.modal({
      title: dep ? `${icon('navigation')} ตรวจรถและออกเดินทาง` : `${icon('home')} ยืนยันกลับถึงโรงเรียน`,
      body: `<div class="stack">
        <div class="note-box navy">${icon(kindIcon(v.kind))}<div><b>${esc(v.name)} · ${esc(v.plate)}</b><br>${esc(S.destName(r))} · ${fmt.range(r.startAt, r.endAt)}</div></div>
        ${dep ? `<div class="chk-box"><div class="chk-head"><b>${icon('shield')} ตรวจสภาพรถก่อนออกเดินทาง</b>${admin ? '<span class="hint">แอดมินบันทึกแทน — ข้ามได้</span>' : '<span class="hint">ติ๊กให้ครบทุกข้อ</span>'}</div>
          ${CHECKS.map((c, k) => `<label class="chk-item"><input type="checkbox" data-chk="${k}"><span>${c}</span></label>`).join('')}
          <div class="field" style="margin-top:8px"><label>พบปัญหา / ข้อสังเกต <span class="hint">(ถ้ามีข้อที่ไม่ผ่าน ต้องระบุ — แจ้งแอดมินอัตโนมัติ)</span></label><input id="chkNote" placeholder="เช่น ไฟเลี้ยวขวาไม่ติด"></div></div>` : ''}
        ${early ? `<div class="note-box warn-y">${icon('alert')}<div><b>กลับก่อนเวลาที่ขอ</b> (กำหนดกลับ ${fmt.when(r.endAt)}) — ระบุเหตุผล เช่น ภารกิจเสร็จเร็ว</div></div>
          <div class="field"><label>เหตุผลที่กลับก่อนเวลา <b class="req">*</b></label><input id="earlyNote" placeholder="เช่น ส่งเอกสารเสร็จเร็วกว่ากำหนด"></div>` : ''}
        <div class="field"><label>เลขไมล์${dep ? 'ตอนออก' : 'ตอนกลับ'} (กม.)</label><input id="odoIn" type="number" inputmode="numeric" min="0" value="${def}" placeholder="ไม่บังคับ — กรอกภายหลังได้"></div>
        ${!dep && a.odoStart != null ? `<p class="hint">เลขไมล์ตอนออก ${fmt.num(a.odoStart)} กม.</p>` : ''}
        <div class="field"><label>เวลา</label><input id="atIn" type="datetime-local" value="${fmt.local(new Date())}" max="${fmt.local(new Date(Date.now() + 5 * 6e4))}"></div>
      </div>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: dep ? 'ตรวจแล้ว ออกเดินทาง' : 'กลับถึงแล้ว', kind: dep ? 'btn-primary' : 'btn-ok', icon: 'check', onClick: async el => {
        let check = null, note = '';
        if (dep) {
          const miss = [...el.querySelectorAll('[data-chk]')].filter(x => !x.checked).map(x => CHECKS[+x.dataset.chk]);
          const cn = el.querySelector('#chkNote').value.trim();
          if (miss.length && !cn && !admin) { UI.toast(`ยังไม่ได้ติ๊ก ${miss.length} ข้อ — ติ๊กให้ครบ หรือระบุปัญหาที่พบ`, 'error'); return false; }
          check = { ok: !miss.length && !cn, miss, note: cn, skipped: admin && miss.length === CHECKS.length && !cn };
        }
        if (early) { note = el.querySelector('#earlyNote').value.trim(); if (!note && !admin) { UI.toast('กรุณาระบุเหตุผลที่กลับก่อนเวลา', 'error'); return false; } }
        await S.tripStatus(r.id, idx, status, { odo: el.querySelector('#odoIn').value, at: el.querySelector('#atIn').value, check, note, override });
        return true;
      } }]
    });
    if (res) UI.toast(dep ? 'บันทึกออกเดินทางแล้ว เดินทางปลอดภัยนะครับ' : 'บันทึกกลับถึงแล้ว (ปิดงานอัตโนมัติ) — บันทึกค่าใช้จ่ายย้อนหลังได้ภายใน 30 วัน');
  };

  function myJobs(driverId) {
    const out = [];
    S.db.requests.forEach(r => (r.assignments || []).forEach((a, i) => { if (a.driverId === driverId && ['approved', 'ontrip', 'returned', 'closed'].includes(r.status)) out.push({ r, a, i }); }));
    return out.sort((x, y) => x.r.startAt.localeCompare(y.r.startAt));
  }
  function jobCard(j, { detail = false } = {}) {
    const { r, a, i } = j, v = S.vehicle(a.vehicleId) || {};
    const mine = (r.expenses || []).filter(e => e.vehicleId === a.vehicleId);
    const others = r.assignments.filter((x, k) => k !== i);
    return `<article class="job">
      <div class="job-top"><div><b class="num">${fmt.time(r.startAt)}</b> <span class="muted">${UI.sameDay(r.startAt, new Date()) ? 'วันนี้' : fmt.dateLong(r.startAt)}</span></div><span class="pill tone-${a.status === 'ontrip' ? 'live pulse' : a.status === 'returned' ? 'done' : 'ok'}">${S.ASSIGN[a.status]}</span></div>
      <div class="job-body">
        <h3>${esc(S.destName(r))}</h3>
        <p class="muted" style="font-size:.9rem">${esc(r.purpose)}</p>
        <div class="job-info">
          <div><small>รถ</small><b>${esc(v.name || '-')}</b><br>${esc(v.plate || '')}</div>
          <div><small>เวลา</small>${fmt.range(r.startAt, r.endAt)}</div>
          <div><small>จุดนัดขึ้นรถ</small>${esc(r.pickup || '-')}</div>
          <div><small>ผู้เดินทาง</small>${S.paxText(r)}</div>
          <div class="full"><small>ผู้ขอใช้รถ</small>${esc(r.requester.name)} · <a class="link" href="tel:${esc(r.contactPhone || r.requester.phone)}">${esc(r.contactPhone || r.requester.phone || '')}</a></div>
          ${(r.destinations || []).length ? `<div class="full"><small>ปลายทาง</small>${r.destinations.map(d => `${esc(d.name)}${d.address ? ` <span class="muted">(${esc(d.address)})</span>` : ''}`).join('<br>')}${r.totalKm ? `<br><span class="muted">ระยะทางรวมประมาณ ${fmt.num(r.totalKm, 0)} กม.</span>` : ''}</div>` : ''}
          ${a.note ? `<div class="full" style="background:var(--gold-50)"><small>หมายเหตุจากแอดมิน</small>${esc(a.note)}</div>` : ''}
          ${S.tripTag(r) ? `<div class="full"><small>ลักษณะการเดินทาง</small>${S.tripTag(r).text}${S.tripType(r) === 'daily' ? ` · ออก ${fmt.time(r.startAt)} กลับ ${fmt.time(r.endAt)} น. ทุกวัน` : ''}${r.lodging ? ' · ที่พัก ' + esc(r.lodging) : ''}</div>` : ''}
          ${others.length ? `<div class="full"><small>รถคันอื่นในทริปเดียวกัน</small>${others.map(o => `${esc(C.vName(o.vehicleId))} · ${esc(C.dName(o.driverId))}`).join('<br>')}</div>` : ''}
          ${a.odoStart != null || a.odoEnd != null ? `<div class="full"><small>เลขไมล์</small>${a.odoStart != null ? fmt.num(a.odoStart) : '—'} → ${a.odoEnd != null ? fmt.num(a.odoEnd) : '—'}${a.odoStart != null && a.odoEnd != null ? ` <b>(${fmt.num(a.odoEnd - a.odoStart)} กม.)</b>` : ''}</div>` : ''}
          ${mine.length ? `<div class="full"><small>ค่าใช้จ่ายที่บันทึก</small>${mine.map(e => `${S.EXPENSE[e.type]} ${fmt.money(e.amount)} บ.${e.liters ? ` (${e.liters} ล.)` : ''}`).join('<br>')}</div>` : ''}
        </div>
      </div>
      <div class="job-acts">
        ${a.status === 'assigned' ? departBtn(r, i) : ''}
        ${a.check && !a.check.ok && !a.check.skipped ? `<div class="note-box warn-y full">${icon('alert')}<div><b>แจ้งปัญหาก่อนออกเดินทาง:</b> ${esc([...(a.check.miss || []), a.check.note].filter(Boolean).join(' · '))}</div></div>` : ''}
        ${a.status === 'ontrip' ? `<button class="btn btn-ok full" data-go="returned" data-r="${r.id}" data-i="${i}">${icon('home')} กลับถึงโรงเรียนแล้ว</button>` : ''}
        ${a.status !== 'assigned' ? `<button class="btn btn-gold" data-fuel data-r="${r.id}" data-v="${a.vehicleId}">${icon('fuel')} บันทึกค่าใช้จ่าย</button><button class="btn btn-ghost" data-odo data-r="${r.id}" data-i="${i}">${icon('gauge')} แก้เลขไมล์</button>` : ''}
        ${!detail ? `<a class="btn btn-ghost full" href="#/driver/${r.id}/${i}">${icon('info')} ดูรายละเอียดงาน</a>` : ''}
      </div>
    </article>`;
  }
  function bindJobs(root) {
    root.addEventListener('click', async e => {
      const g = e.target.closest('[data-go]');
      if (g) { const r = S.request(g.dataset.r); return Pages._tripAction(r, +g.dataset.i, g.dataset.go); }
      const f = e.target.closest('[data-fuel]');
      if (f) { const r = S.request(f.dataset.r); return Pages._expenseModal(r, f.dataset.v); }
      const o = e.target.closest('[data-odo]');
      if (o) {
        const r = S.request(o.dataset.r), i = +o.dataset.i, a = r.assignments[i];
        UI.modal({ title: `${icon('gauge')} เลขไมล์`, body: `<div class="grid2"><div class="field"><label>ตอนออก</label><input id="o1" type="number" inputmode="numeric" value="${a.odoStart ?? ''}"></div><div class="field"><label>ตอนกลับ</label><input id="o2" type="number" inputmode="numeric" value="${a.odoEnd ?? ''}"></div></div>`,
          actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', kind: 'btn-primary', onClick: async el => { await S.setOdo(r.id, i, { odoStart: el.querySelector('#o1').value, odoEnd: el.querySelector('#o2').value }); UI.toast('บันทึกเลขไมล์แล้ว'); return true; } }] });
      }
    });
  }

  // ───────── ปฏิทินงานคนขับ ─────────
  const dStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dEnd = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const jobsOn = (jobs, day) => jobs.filter(j => new Date(j.r.startAt) <= dEnd(day) && new Date(j.r.endAt) >= dStart(day));
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekOf = d => { const x = dStart(d); x.setDate(x.getDate() - x.getDay()); return x; };
  // สรุปย่อของวัน: จำนวนงาน + เวลาออกงานแรก (งานค้างคืนที่ต่อจากวันก่อน แสดงว่า "ต่อเนื่อง")
  function daySummary(list, day) {
    const starts = list.filter(j => UI.sameDay(j.r.startAt, day)).sort((a, b) => a.r.startAt.localeCompare(b.r.startAt));
    return { n: list.length, first: starts[0] ? fmt.time(starts[0].r.startAt) : '', cont: list.some(j => !UI.sameDay(j.r.startAt, day)), live: list.some(j => j.a.status === 'ontrip') };
  }
  Pages._driverJobs = myJobs; Pages._jobsOn = jobsOn; Pages._daySummary = daySummary;
  function driverCalendar(jobs, { view, sel, link }) {
    const step = k => view === 'month' ? new Date(sel.getFullYear(), sel.getMonth() + k, 1) : addD(sel, view === 'week' ? 7 * k : k);
    const title = view === 'month' ? sel.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : view === 'week' ? `${fmt.dayMonth(weekOf(sel))} – ${fmt.date(addD(weekOf(sel), 6))}` : `${relDay(sel) ? relDay(sel) + ' · ' : ''}${dShort(sel)}`;
    // "วันนี้" = มุมมองรายวัน (กดได้เสมอ แม้กำลังดูวันนี้อยู่)
    const head = `<div class="dcal-head">
      <div class="dcal-nav"><a class="icon-btn sm" href="${link({ date: fmt.localDate(step(-1)) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
        <b>${title}</b>
        <a class="icon-btn sm" href="${link({ date: fmt.localDate(step(1)) })}" aria-label="ถัดไป">${icon('chevR')}</a></div>
      <div class="seg"><a href="${link({ view: 'month' })}"><button class="${view === 'month' ? 'on' : ''}" tabindex="-1">เดือน</button></a><a href="${link({ view: 'week' })}"><button class="${view === 'week' ? 'on' : ''}" tabindex="-1">สัปดาห์</button></a><a href="${link({ view: 'day', date: fmt.localDate(new Date()) })}"><button class="${view === 'day' ? 'on' : ''}" tabindex="-1">วันนี้</button></a></div></div>`;
    let grid = '';
    if (view === 'day') grid = '';
    else if (view === 'month') {
      const first = new Date(sel.getFullYear(), sel.getMonth(), 1), start = addD(first, -first.getDay());
      const cells = Array.from({ length: 42 }, (_, i) => addD(start, i));
      const rows = cells[35].getMonth() !== sel.getMonth() ? cells.slice(0, 35) : cells;
      grid = `<div class="cal dcal"><div class="cal-head">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => `<div>${d}</div>`).join('')}</div><div class="cal-grid">${rows.map(d => {
        const s = daySummary(jobsOn(jobs, d), d);
        return `<a class="cal-day ${d.getMonth() !== sel.getMonth() ? 'out' : ''} ${UI.sameDay(d, new Date()) ? 'today' : ''} ${UI.sameDay(d, sel) ? 'sel' : ''} ${s.n ? 'has' : ''}" href="${link({ date: fmt.localDate(d) })}"><span class="d">${d.getDate()}</span>
          ${s.n ? `<span class="dj ${s.live ? 'live' : ''}">${icon('van')}<b>${s.n}</b><em>งาน</em></span>${s.first ? `<small class="dt">${s.first}</small>` : ''}${s.cont ? `<small class="dc">${icon('moon')}ต่อเนื่อง</small>` : ''}` : ''}</a>`;
      }).join('')}</div></div>`;
    } else {
      const ws = weekOf(sel);
      grid = `<div class="week">${Array.from({ length: 7 }, (_, i) => addD(ws, i)).map(d => { const list = jobsOn(jobs, d); return `<a class="wk-col ${UI.sameDay(d, new Date()) ? 'today' : ''}" href="${link({ date: fmt.localDate(d) })}" style="display:block"><h4>${d.toLocaleDateString('th-TH', { weekday: 'short' })}<b>${d.getDate()}</b></h4>${list.map(j => `<span class="wk-ev s-${j.r.status}"><b>${UI.sameDay(j.r.startAt, d) ? fmt.time(j.r.startAt) : 'ต่อเนื่อง'} ${esc(S.destName(j.r))}</b>${esc(C.vName(j.a.vehicleId))} · ${S.ASSIGN[j.a.status]}</span>`).join('') || '<p class="hint" style="margin-top:10px">ว่าง</p>'}</a>`; }).join('')}</div>`;
    }
    const today = jobsOn(jobs, sel);
    return head + grid + `<h3 style="margin:26px 4px 12px;display:flex;gap:8px;align-items:center;color:var(--navy)">${icon('calendar')} ${fmt.dateLong(sel)} <span class="pill tone-ok">${today.length} งาน</span></h3>
      ${today.map(j => jobCard(j)).join('') || `<div class="card">${UI.empty('วันนี้ไม่มีงาน', 'checkCircle')}</div>`}`;
  }

  // ───────── หน้าแรกคนขับ (แบบ A): งานถัดไป + ภาพรวม วันนี้/สัปดาห์/เดือน เรียงตามวัน ─────────
  const RANGES = { day: 'วันนี้', week: 'สัปดาห์', month: 'เดือน' };
  function rangeOf(mode, ref) {
    if (mode === 'day') return [dStart(ref), addD(dStart(ref), 1)];
    if (mode === 'week') { const s = weekOf(ref); return [s, addD(s, 7)]; }
    return [new Date(ref.getFullYear(), ref.getMonth(), 1), new Date(ref.getFullYear(), ref.getMonth() + 1, 1)];
  }
  const inRange = (j, [a, b]) => new Date(j.r.startAt) < b && new Date(j.r.endAt) > a;
  const shiftRange = (mode, ref, k) => mode === 'day' ? addD(ref, k) : mode === 'week' ? addD(ref, 7 * k) : new Date(ref.getFullYear(), ref.getMonth() + k, 1);
  const relDay = d => { const n = Math.round((dStart(d) - dStart(new Date())) / 864e5); return n === 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : n === -1 ? 'เมื่อวาน' : ''; };
  const dShort = d => new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  const nDays = r => Math.round((dStart(r.endAt) - dStart(r.startAt)) / 864e5) + 1;
  const isDone = j => j.a.status === 'returned' || j.r.status === 'closed';
  const tone = j => j.a.status === 'ontrip' ? 'live' : isDone(j) ? 'done' : 'ok';
  const TONE_C = { live: 'var(--dh-live)', ok: 'var(--dh-ok)', done: 'var(--dh-done)' };
  const jobHref = j => `#/driver/${j.r.id}/${j.i}`;
  function rangeLabel(mode, ref) {
    const [a, b] = rangeOf(mode, ref), last = addD(b, -1);
    if (mode === 'day') return (relDay(a) ? relDay(a) + ' · ' : '') + dShort(a);
    if (mode === 'week') return `${fmt.dayMonth(a)} – ${fmt.dayMonth(last)}`;
    return a.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  }
  // แถวงาน 1 รายการ: ช่องซ้าย = เวลาออก–กลับ (ช่องเดียว) · กลาง = สถานที่ + ไปกี่วัน · ขวา = สถานะ
  function dhRow(j, from) {
    const { r, a } = j, s = new Date(r.startAt), e = new Date(r.endAt), multi = nDays(r) > 1, cont = s < from, t = S.tripType(r);
    const time = cont ? `<b>ต่อ</b><em>ถึง ${multi ? fmt.dayMonth(e) : fmt.time(e)}</em>`
      : `<b>${fmt.time(s).replace(' น.', '')}</b><em>${multi ? `ถึง ${fmt.dayMonth(e)}` : `ถึง ${fmt.time(e).replace(' น.', '')}`}</em>`;
    const kind = t === 'overnight' ? 'ค้างคืน' : t === 'daily' ? 'ไป-กลับทุกวัน' : t === 'oneway' ? (r.onewayDir === 'pick' ? 'ไปรับ' : r.onewayDir === 'drop' ? 'ไปส่ง' : 'ไปส่ง/ไปรับ') : '';
    return `<a class="dh-row ${tone(j)}" style="--c:${TONE_C[tone(j)]}" href="${jobHref(j)}">
      <span class="dh-t num">${time}</span>
      <span class="dh-m"><b>${esc(S.destName(r))}</b><small>${multi ? `${nDays(r)} วัน · ${fmt.dayMonth(s)} – ${fmt.dayMonth(e)}` : 'ไป-กลับวันเดียว'}${kind && t !== 'day' ? ` · ${kind}` : ''}</small><small>${icon(kindIcon((S.vehicle(a.vehicleId) || {}).kind))} ${esc(C.vName(a.vehicleId))}</small></span>
      <span class="dh-s"><span class="pill tone-${tone(j) === 'live' ? 'live pulse' : tone(j)}">${S.ASSIGN[a.status]}</span>${icon('chevR')}</span></a>`;
  }
  function overview(jobs, { mode, ref, link }) {
    const R = rangeOf(mode, ref), list = jobs.filter(j => inRange(j, R));
    const now = new Date(), today0 = dStart(now);
    const live = jobs.find(j => j.a.status === 'ontrip');
    const next = live || jobs.find(j => j.a.status === 'assigned' && new Date(j.r.endAt) >= now);
    const late = jobs.filter(j => j.a.status === 'assigned' && new Date(j.r.startAt) < today0);
    // งานที่กลับแล้วใน 30 วัน แต่ยังไม่มีค่าใช้จ่ายของรถคันนี้ → เตือนให้บันทึกย้อนหลัง (ถ้ามี)
    const noExp = jobs.filter(j => isDone(j) && !(j.r.expenses || []).some(e => e.vehicleId === j.a.vehicleId) && now - new Date(j.a.returnedAt || j.r.endAt) < 30 * 864e5).slice(-5).reverse();
    const left = m => jobs.filter(j => inRange(j, rangeOf(m, now)) && !isDone(j)).length;
    const groups = new Map();
    list.forEach(j => { const k = fmt.localDate(new Date(j.r.startAt) < R[0] ? R[0] : new Date(j.r.startAt)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(j); });
    const atNow = rangeOf(mode, now)[0].getTime() === R[0].getTime();
    const doneN = list.filter(isDone).length;
    const nextCard = next ? (() => { const r = next.r, multi = nDays(r) > 1, onTrip = next.a.status === 'ontrip';
      const startSoon = !onTrip && UI.sameDay(r.startAt, now);
      return `<div class="dh-next ${onTrip ? 'live' : ''}">
        <a class="dh-next-main" href="${jobHref(next)}"><small>${onTrip ? '● กำลังเดินทางอยู่' : 'งานถัดไป · ' + (relDay(r.startAt) || dShort(r.startAt))}</small><h3>${esc(S.destName(r))}</h3>
          <div class="dh-chips"><span>${icon('clock')} ${fmt.time(r.startAt).replace(' น.', '')} – ${multi ? dShort(r.endAt) + ' ' : ''}${fmt.time(r.endAt)}</span>${multi ? `<span>${icon('calendar')} ${nDays(r)} วัน</span>` : ''}<span>${icon('van')} ${esc(C.vName(next.a.vehicleId))}</span></div></a>
        ${onTrip ? `<button class="btn btn-ok" data-go="returned" data-r="${r.id}" data-i="${next.i}">${icon('home')} กลับถึงโรงเรียนแล้ว</button>` : startSoon ? departBtn(r, next.i, 'btn btn-gold') : ''}
      </div>`; })() : '';
    return `<div class="dh-grid">
      <div class="dh-side">
        ${nextCard}
        ${late.length ? `<div class="dh-late">${icon('alert')}<div><b>ยังไม่ได้กดสถานะ ${late.length} งาน</b><small>เลยวันเดินทางแล้ว กดเข้าไปกด "ออกเดินทาง / กลับถึง" ให้เรียบร้อย</small>${late.map(j => `<a href="${jobHref(j)}">${dShort(j.r.startAt)} · ${esc(S.destName(j.r))}</a>`).join('')}</div></div>` : ''}
        ${noExp.length ? `<div class="dh-late dh-exp">${icon('fuel')}<div><b>ยังไม่บันทึกค่าใช้จ่าย ${noExp.length} งาน</b><small>ถ้ามีค่าน้ำมัน/ทางด่วน บันทึกย้อนหลังได้ภายใน 30 วัน (ไม่มีค่าใช้จ่ายก็ไม่ต้องทำอะไร)</small>${noExp.map(j => `<button type="button" data-fuel data-r="${j.r.id}" data-v="${j.a.vehicleId}">${dShort(j.r.startAt)} · ${esc(S.destName(j.r))}</button>`).join('')}</div></div>` : ''}
        <div class="seg dh-seg">${Object.entries(RANGES).map(([k, l]) => { const n = left(k); return `<a href="${link({ r: k, date: '' })}"><button class="${k === mode ? 'on' : ''}" tabindex="-1">${l}<small>${n ? `เหลือ ${n} งาน` : 'ไม่มีงานค้าง'}</small></button></a>`; }).join('')}</div>
        <div class="dh-nav"><a class="icon-btn" href="${link({ r: mode, date: fmt.localDate(shiftRange(mode, ref, -1)) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
          <div><b>${rangeLabel(mode, ref)}</b><span class="dh-count"><em class="num">${list.length}</em> งาน${doneN ? ` · เสร็จแล้ว ${doneN}` : ''}</span></div>
          <a class="icon-btn" href="${link({ r: mode, date: fmt.localDate(shiftRange(mode, ref, 1)) })}" aria-label="ถัดไป">${icon('chevR')}</a></div>
        ${atNow ? '' : `<a class="dh-back" href="${link({ r: mode, date: '' })}">กลับมาช่วงปัจจุบัน</a>`}
      </div>
      <div class="dh-list">${[...groups.entries()].map(([k, js]) => { const d = UI.dayOf(k), rel = relDay(d);
        return `<div class="dh-day"><h4 class="${rel === 'วันนี้' ? 'today' : ''}">${rel || d.toLocaleDateString('th-TH', { weekday: 'long' })} <small>${dShort(d)}</small></h4>${js.map(j => dhRow(j, R[0])).join('')}</div>`; }).join('')
        || `<div class="card dh-empty">${UI.empty(mode === 'day' ? 'วันนี้ไม่มีงาน' : 'ช่วงนี้ไม่มีงาน', 'checkCircle')}</div>`}</div>
    </div>`;
  }

  Pages.driverHome = ({ query }) => {
    const me = S.me;
    let d = S.driverOfUser(me);
    const adminView = S.isAdmin(me) && (!d || query.d);
    if (adminView) d = S.driver(query.d) || S.db.drivers[0];
    if (!d) return { html: `<div class="drv">${UI.empty('บัญชีนี้ยังไม่ได้ผูกกับรายชื่อพนักงานขับรถ กรุณาติดต่อแอดมิน', 'user')}</div>`, layout: 'driver' };
    const jobs = myJobs(d.id);
    const mode = RANGES[query.r] ? query.r : 'week';
    const ref = query.date ? UI.dayOf(query.date) : new Date();
    const linkL = o => { const p = { ...(adminView ? { d: d.id } : {}), r: mode, ...o }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; }); return '#/driver?' + new URLSearchParams(p); };
    const tab = query.tab === 'cal' ? 'cal' : 'list';
    const view = ['week', 'day'].includes(query.view) ? query.view : 'month';
    const sel = UI.dayOf(query.date);
    const link = o => '#/driver?' + new URLSearchParams({ ...(adminView ? { d: d.id } : {}), tab: 'cal', view, date: fmt.localDate(sel), ...o });
    const tabs = `<div class="seg" style="margin-top:16px;display:flex"><a href="#/driver${adminView ? `?d=${d.id}` : ''}" style="flex:1"><button class="${tab === 'list' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('list')} งานของฉัน</button></a><a href="${link({})}" style="flex:1"><button class="${tab === 'cal' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('calendar')} ปฏิทินงาน</button></a></div>`;
    return {
      layout: 'driver',
      html: `<div class="drv ${tab === 'list' ? 'drv-wide' : ''}">
        ${adminView ? `<a class="btn btn-ghost btn-sm back-admin" href="#/admin">${icon('arrowL')} กลับระบบหลังบ้าน</a>
          <div class="note-box navy" style="margin-bottom:14px">${icon('shield')}<div>มุมมองแอดมิน — เลือกคนขับ: <select class="input" style="width:auto;display:inline-block;padding:6px 10px" onchange="location.hash='#/driver?${tab === 'cal' ? 'tab=cal&' : ''}d='+this.value">${S.db.drivers.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select> · <a class="link" href="#/admin/roster">ตารางเวรรวมทุกคน</a></div></div>` : ''}
        <div class="drv-hello">${d.photo ? `<span class="avatar lg gold ph">${UI.img(d.photo, d.name)}</span>` : UI.avatar(d.name, 'lg gold')}<div><small>สวัสดีครับ</small><h2>${esc(d.name)}</h2><small>${fmt.dateLong(new Date())}</small></div></div>
        ${tabs}
        ${tab === 'cal' ? driverCalendar(jobs, { view, sel, link }) : overview(jobs, { mode, ref, link: linkL })}
      </div>`,
      mount: bindJobs
    };
  };
  Pages.driverJob = ({ params }) => {
    const r = S.request(params.id), i = +params.idx;
    const a = r && r.assignments[i];
    if (!a) return { layout: 'driver', html: `<div class="drv">${UI.empty('ไม่พบงานนี้')}</div>` };
    const d = S.driver(a.driverId);
    if (!S.isAdmin(S.me) && !(d && d.email === S.me.email)) return { layout: 'driver', html: `<div class="drv">${UI.empty('ไม่ใช่งานของคุณ', 'lock')}</div>` };
    return {
      layout: 'driver',
      html: `<div class="drv"><div class="row between" style="margin-bottom:6px"><a class="crumb" href="#/driver${S.isAdmin(S.me) && !S.driverOfUser(S.me) ? `?d=${a.driverId}` : ''}">${icon('arrowL')} งานของฉัน</a>${S.isAdmin(S.me) ? `<a class="crumb" href="#/admin/requests/${r.id}">${icon('shield')} เปิดในหลังบ้าน</a>` : ''}</div>${jobCard({ r, a, i }, { detail: true })}
        <div class="card" style="margin-top:14px"><div class="card-head"><h3>${icon('activity')} ความเคลื่อนไหว</h3></div>${C.history(r)}</div></div>`,
      mount: bindJobs
    };
  };
})();
