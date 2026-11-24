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

  // ───────── ค่าใช้จ่ายของรถแต่ละคัน (ใช้ร่วมกับแอดมิน) ─────────
  // เปิดมาเห็น "รายการที่บันทึกแล้ว" (แก้ไข/ลบได้) → กด "+ เพิ่มค่าใช้จ่าย" → เลือกประเภท กรอกทีละรายการ → บันทึก → กลับมาที่รายการ
  // คนขับแก้/ลบได้เฉพาะรายการที่ตัวเองบันทึก ภายใน 30 วันหลังกลับถึง · แอดมินแก้ได้ทุกรายการ
  // Pages._expenseModal(r, vehicleId)      = เปิดรายการของรถคันนั้น
  // Pages._expenseModal(r, vehicleId, ex)  = เปิดแก้รายการ ex โดยตรง (บันทึกแล้วปิด)
  Pages._expenseModal = (r, vehicleId, ex = null) => expenseHub(r, vehicleId || (ex && ex.vehicleId), ex);
  const EXP_TYPES = [['fuel', 'fuel', 'น้ำมัน'], ['toll', 'route', 'ทางด่วน'], ['parking', 'pin', 'ที่จอด'], ['other', 'coins', 'อื่น ๆ']];
  const EXP_PLACE = { toll: 'เช่น ด่านบางปะอิน / ทางด่วนศรีรัช', parking: 'เช่น ลานจอด ม.เกษตรศาสตร์', other: 'เช่น ร้าน… / ปั๊ม… (ไม่บังคับ)' };
  const OTHER_ITEMS = ['ค่าล้างรถ', 'ปะยาง / ซ่อมฉุกเฉิน'];
  const EDIT_DAYS = 30;
  // หัวรายการค่าใช้จ่าย (ใช้แสดงผลทุกหน้า)
  Pages._expTitle = e => e.type === 'other' ? (e.item || 'ค่าใช้จ่ายอื่น') : S.EXPENSE[e.type];
  Pages._expSub = e => [e.type === 'fuel' ? (e.station || [e.brand, e.branch].filter(Boolean).join(' ')) : e.station].filter(Boolean)[0] || '';
  function expenseHub(r, vehicleId, editEx = null) {
    const single = !!editEx;
    const me = S.me, admin = S.isAdmin(me);
    const vs = (r.assignments || []).map(a => S.vehicle(a.vehicleId)).filter(Boolean);
    let vId = vehicleId || ((r.assignments || [])[0] || {}).vehicleId || '';
    let changed = false, picker = null;
    const cur = () => S.request(r.id) || r;
    const a0 = () => (cur().assignments || []).find(a => a.vehicleId === vId) || {};
    const minD = fmt.localDate(r.startAt), maxD = fmt.localDate(new Date(Math.max(Date.now(), new Date(r.endAt))));
    const defDate = () => new Date(r.endAt) < new Date() ? fmt.localDate(a0().returnedAt || r.endAt) : fmt.localDate(new Date());
    const multiDay = fmt.localDate(r.startAt) !== fmt.localDate(r.endAt);
    const days = (() => { const out = [], d = UI.dayOf(minD), end = UI.dayOf(maxD); while (d <= end && out.length < 60) { out.push(fmt.localDate(d)); d.setDate(d.getDate() + 1); } return out; })();
    const mem = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
    // แก้/ลบได้: แอดมินทุกรายการ · คนขับเฉพาะของตัวเอง ภายใน 30 วันหลังกลับถึง
    const canEdit = e => admin || (e.by === me.email && (() => { const x = cur(), end = x.closedAt || a0().returnedAt; return !end || Date.now() - new Date(end) < EDIT_DAYS * 864e5; })());
    const items = () => (cur().expenses || []).filter(e => e.vehicleId === vId).sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at));

    const listHTML = () => {
      const xs = items(), sum = xs.reduce((s, e) => s + (+e.amount || 0), 0);
      return `${vs.length > 1 ? `<div class="seg xh-veh">${vs.map(v => `<button type="button" class="${v.id === vId ? 'on' : ''}" data-veh="${v.id}">${esc(v.name)}</button>`).join('')}</div>` : ''}
        <div class="xh-head"><div><b>${esc(C.vName(vId))}</b><small>${esc(C.vPlate(vId) || '')} · ${esc(S.destName(r))}</small></div>${xs.length ? `<span class="xh-sum">${xs.length} รายการ · <b>${fmt.money(sum)} บาท</b></span>` : ''}</div>
        ${xs.length ? `<div class="stack" style="gap:10px">${xs.map(e => C.expItem(e, { edit: canEdit(e), showVeh: false })).join('')}</div>`
          : `<div class="xh-empty">${icon('fuel')}<b>ยังไม่มีค่าใช้จ่ายของรถคันนี้</b><small>กด “เพิ่มค่าใช้จ่าย” แล้วบันทึกทีละรายการ เช่น ค่าน้ำมัน ค่าทางด่วน ค่าที่จอด</small></div>`}
        <button type="button" class="btn btn-gold xh-add" data-add>${icon('plus')} เพิ่มค่าใช้จ่าย${xs.length ? 'อีกรายการ' : ''}</button>
        <p class="hint">${icon('info')} มีหลายรายการ บันทึกทีละรายการ · บันทึกย้อนหลัง/แก้ไขได้ภายใน ${EDIT_DAYS} วันหลังกลับถึง</p>`;
    };
    const formHTML = (d = {}) => {
      const ty = d.type || 'fuel', fuel = ty === 'fuel';
      const pay = d.pay || mem(fuel ? 'vb-exp-pay-fuel' : 'vb-exp-pay-x', fuel ? 'card' : 'cash');
      const brand = d.id ? (S.FUEL_BRANDS.includes(d.brand) ? d.brand : (d.brand ? 'อื่น ๆ' : '')) : mem('vb-exp-brand', '');
      const itemSel = d.item ? (OTHER_ITEMS.includes(d.item) ? d.item : '_') : '';
      return `<div class="exr xh-form">
        <div class="xh-ftitle">${icon(d.id ? 'edit' : 'plus')} <b>${d.id ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}</b> <small>${esc(C.vName(vId))}</small></div>
        <div class="label-sm">ประเภท</div>
        <div class="exr-types" role="radiogroup" aria-label="ประเภทค่าใช้จ่าย">${EXP_TYPES.map(([t, ic, l]) => `<label class="exr-type"><input type="radio" name="xty" data-k="type" value="${t}" ${t === ty ? 'checked' : ''}><span>${icon(ic)}${l}</span></label>`).join('')}</div>
        <div class="other-only">
          <div class="label-sm">จ่ายค่าอะไร <b class="req">*</b></div>
          <div class="exr-brands xh-items" role="radiogroup">${[...OTHER_ITEMS, '_'].map(it => `<label class="exr-brand"><input type="radio" name="xit" data-k="itemSel" value="${esc(it)}" ${it === itemSel ? 'checked' : ''}><span>${it === '_' ? 'อื่น ๆ (พิมพ์เอง)' : esc(it)}</span></label>`).join('')}</div>
          <div class="field xh-item-other" hidden><input data-k="itemOther" placeholder="ระบุว่าจ่ายค่าอะไร เช่น ค่าเติมลมยาง ค่าเรือข้ามฟาก *" value="${itemSel === '_' ? esc(d.item) : ''}"></div>
        </div>
        <div class="exr-main">
          <div class="field"><label>ยอดเงิน (บาท) <b class="req">*</b></label><input data-k="amount" class="exr-amt" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${d.amount || ''}"></div>
          <div class="field fuel-only"><label>จำนวนลิตร</label><input data-k="liters" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${d.liters || ''}"><small class="hint exr-ppl"></small></div>
        </div>
        <div class="fuel-only">
          <div class="label-sm">ปั๊มน้ำมัน <b class="req">*</b></div>
          <div class="exr-brands" role="radiogroup" aria-label="ปั๊มน้ำมัน">${S.FUEL_BRANDS.map(b => `<label class="exr-brand"><input type="radio" name="xbr" data-k="brand" value="${esc(b)}" ${b === brand ? 'checked' : ''}><span>${esc(b)}</span></label>`).join('')}</div>
          <div class="exr-two">
            <div class="field exr-brand-other" hidden><input data-k="brandOther" placeholder="ชื่อปั๊ม *" value="${d.id && !S.FUEL_BRANDS.includes(d.brand) ? esc(d.brand || '') : ''}"></div>
            <div class="field"><input data-k="branch" placeholder="สาขา (ไม่บังคับ) เช่น ลาดหลุมแก้ว" value="${esc(d.branch || '')}"></div>
          </div>
        </div>
        <div class="field not-fuel"><label class="xh-place-l">สถานที่</label><input data-k="place" placeholder="" value="${d.type !== 'fuel' ? esc(d.station || '') : ''}"></div>
        <div class="exr-two">
          <div class="field"><label>วิธีชำระ</label><select data-k="pay">${Object.entries(S.PAY).map(([t, l]) => `<option value="${t}" ${t === pay ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          ${multiDay ? `<div class="field"><label>วันที่</label><select data-k="date">${days.map(x => `<option value="${x}" ${x === (d.date || defDate()) ? 'selected' : ''}>${fmt.dayMonth(UI.dayOf(x))}</option>`).join('')}</select></div>` : `<input type="hidden" data-k="date" value="${d.date || defDate()}">`}
        </div>
        <div class="exr-pic">${C.filePicker('xhPh', d.photos || [], { label: 'ถ่ายรูปบิล', capture: true, multiple: true })}<p class="hint exr-need"></p></div>
        <div class="xh-actions">${single ? '' : `<button type="button" class="btn btn-ghost" data-back>${icon('arrowL')} กลับไปที่รายการ</button>`}<button type="button" class="btn btn-primary" data-save>${icon('check')} บันทึกรายการนี้</button></div>
      </div>`;
    };

    return UI.modal({
      title: `${icon('fuel')} ค่าใช้จ่าย · ${r.id}`, size: 'lg',
      body: `<div id="xh"></div>`,
      actions: single ? [] : [{ label: 'เสร็จสิ้น', kind: 'btn-primary', icon: 'check', onClick: () => changed || true }],
      onOpen(el, close) {
        const box = el.querySelector('#xh'), foot = el.querySelector('.modal-foot');
        let editing = null;
        const showList = () => { editing = null; box.innerHTML = listHTML(); if (foot) foot.hidden = false; el.querySelector('.modal-body').scrollTop = 0; };
        const showForm = (d = null) => {
          editing = d; box.innerHTML = formHTML(d || { type: items().some(e => e.type === 'fuel') ? 'toll' : 'fuel' });
          if (foot) foot.hidden = true;
          const x = box.querySelector('.xh-form');
          picker = C.bindFilePicker(x, 'xhPh', (d && d.photos) || []);
          const q = s => x.querySelector(`[data-k="${s}"]:not([type=radio])`);
          const val = s => (x.querySelector(`[data-k="${s}"]:checked`) || {}).value;
          const sync = () => {
            const t = val('type'), fuel = t === 'fuel', other = t === 'other';
            x.querySelectorAll('.fuel-only').forEach(f => { f.hidden = !fuel; }); x.querySelectorAll('.not-fuel').forEach(f => { f.hidden = fuel; });
            x.querySelectorAll('.other-only').forEach(f => { f.hidden = !other; });
            x.querySelector('.exr-main').classList.toggle('one', !fuel);
            x.querySelector('.xh-place-l').innerHTML = other ? 'สถานที่ / ร้าน <span class="hint">(ไม่บังคับ)</span>' : 'สถานที่ <b class="req">*</b>';
            q('place').placeholder = EXP_PLACE[t] || '';
            const lb = x.querySelector('.dropzone b'); if (lb) lb.textContent = fuel ? 'ถ่ายรูปบิลน้ำมัน *' : 'แนบรูปบิล (ถ้ามี)';
            x.querySelector('.exr-need').textContent = fuel ? 'ค่าน้ำมันต้องมีรูปบิล — ถ่ายให้เห็นยอดเงิน ลิตร และวันที่ชัดเจน' : 'ไม่บังคับแนบบิล';
            x.querySelector('.exr-pic').classList.toggle('opt', !fuel);
          };
          const syncBrand = () => { const o = val('brand') === 'อื่น ๆ'; x.querySelector('.exr-brand-other').hidden = !o; };
          const syncItem = () => { const o = val('itemSel') === '_'; x.querySelector('.xh-item-other').hidden = !o; if (o) q('itemOther').focus(); };
          const calc = () => { const l = +q('liters').value, a = +q('amount').value; x.querySelector('.exr-ppl').textContent = l && a ? `≈ ${fmt.num(a / l, 2)} บาท/ลิตร` : ''; };
          x.querySelectorAll('[data-k="type"]').forEach(rb => rb.addEventListener('change', sync));
          x.querySelectorAll('[data-k="brand"]').forEach(rb => rb.addEventListener('change', syncBrand));
          x.querySelectorAll('[data-k="itemSel"]').forEach(rb => rb.addEventListener('change', syncItem));
          q('liters').addEventListener('input', calc); q('amount').addEventListener('input', calc);
          sync(); syncBrand(); x.querySelector('.xh-item-other').hidden = val('itemSel') !== '_'; calc();
          el.querySelector('.modal-body').scrollTop = 0;
        };
        const save = async btn => {
          const x = box.querySelector('.xh-form');
          const g = k => String((x.querySelector(`[data-k="${k}"]:checked`) || x.querySelector(`[data-k="${k}"]:not([type=radio])`) || {}).value || '').trim();
          const type = g('type'), fuel = type === 'fuel', amt = +g('amount') || 0, lit = fuel ? +g('liters') || 0 : 0;
          const brand = fuel ? (g('brand') === 'อื่น ๆ' ? g('brandOther') : g('brand')) : '';
          const item = type === 'other' ? (g('itemSel') === '_' ? g('itemOther') : g('itemSel')) : '';
          const photos = picker ? picker() : [];
          const e = { ...(editing || {}), vehicleId: vId, type, date: g('date'), amount: g('amount'), liters: fuel ? g('liters') : '', pricePerL: lit && amt ? Math.round(amt / lit * 100) / 100 : '',
            brand, branch: fuel ? g('branch') : '', station: fuel ? [brand, g('branch')].filter(Boolean).join(' ') : g('place'), item, pay: g('pay'), photos };
          const err = m => { UI.toast(m, 'error'); return false; };
          if (type === 'other' && !item) return err('กรุณาเลือกหรือระบุว่าจ่ายค่าอะไร');
          if (!(amt > 0)) return err('กรุณาระบุยอดเงิน');
          if (fuel && !brand) return err('กรุณาเลือกปั๊มน้ำมัน');
          if (fuel && !photos.length) return err('ค่าน้ำมันต้องถ่ายรูปบิลประกอบ');
          if ((type === 'toll' || type === 'parking') && !e.station) return err('กรุณาระบุสถานที่');
          try { localStorage.setItem(fuel ? 'vb-exp-pay-fuel' : 'vb-exp-pay-x', e.pay); if (fuel && S.FUEL_BRANDS.includes(brand)) localStorage.setItem('vb-exp-brand', brand); } catch (er) { /* ไม่จำก็ได้ */ }
          await UI.busy(btn, () => S.saveExpense(r.id, e));
          changed = true;
          UI.toast(editing ? 'แก้ไขค่าใช้จ่ายแล้ว' : `บันทึก${Pages._expTitle(e)} ${fmt.money(amt)} บาทแล้ว`);
          if (single) close(true); else showList();
        };
        box.addEventListener('click', async ev => {
          const t = ev.target;
          const vb = t.closest('[data-veh]'); if (vb) { vId = vb.dataset.veh; showList(); return; }
          if (t.closest('[data-add]')) return showForm();
          if (t.closest('[data-back]')) return showList();
          const sb = t.closest('[data-save]'); if (sb) { try { await save(sb); } catch (er) { /* UI.busy แจ้งข้อผิดพลาดแล้ว */ } return; }
          const ed = t.closest('[data-xedit]'); if (ed) { const e = items().find(x => x.id === ed.dataset.xedit); if (e) showForm(e); return; }
          const dl = t.closest('[data-xdel]');
          if (dl) {
            const e = items().find(x => x.id === dl.dataset.xdel); if (!e) return;
            if (!(await UI.confirm(`ลบ <b>${esc(Pages._expTitle(e))}</b> ${fmt.money(e.amount)} บาท?`, { danger: true, ok: 'ลบ' }))) return;
            try { await S.removeExpense(r.id, e.id); changed = true; UI.toast('ลบรายการแล้ว'); showList(); } catch (er) { UI.toast(er.message, 'error'); }
          }
        });
        if (single) showForm(editEx); else showList();
      }
    });
  }

  // ───────── กติกาเวลา: ออกเดินทางได้ตั้งแต่ 3 ชั่วโมงก่อนเวลาออก (DEPART_EARLY_MIN) · กลับก่อนเวลาที่ขอ ต้องระบุเหตุผล ─────────
  const EARLY_MIN = 30;          // กลับก่อนเวลาที่ขอเกิน 30 นาที → ต้องระบุเหตุผล
  const DEPART_EARLY_MIN = 180;  // กดออกเดินทางได้ก่อนเวลาออก 3 ชั่วโมง
  const LATE_H = 24;
  const departFrom = r => new Date(new Date(r.startAt).getTime() - DEPART_EARLY_MIN * 6e4);
  // ใช้กับทุกคนในหน้างานคนขับ (รวมแอดมิน) · แอดมินบันทึกแทนนอกเวลาได้จากหน้าคำขอในระบบหลังบ้านเท่านั้น (ต้องใส่เหตุผล)
  function departState(r) {
    const from = departFrom(r), now = new Date();
    // เลยเวลาออกเกิน 24 ชม. → คนขับกดเองไม่ได้ (ให้แอดมินบันทึกแทนพร้อมเหตุผล)
    if (now - new Date(r.startAt) > LATE_H * 36e5) return { ok: false, late: true, msg: 'เลยกำหนดออกเกิน 24 ชม. — ติดต่อแอดมิน' };
    if (now >= from) return { ok: true };
    return { ok: false, msg: `ออกเดินทางได้ ${UI.sameDay(from, now) ? '' : dShort(from) + ' '}${fmt.time(from)}` };
  }
  const earlyReturn = r => new Date() < new Date(new Date(r.endAt).getTime() - EARLY_MIN * 6e4);
  const departBtn = (r, i, cls = 'btn btn-primary full') => { const st = departState(r); return st.ok
    ? `<button class="${cls}" data-go="ontrip" data-r="${r.id}" data-i="${i}">${icon('navigation')} ออกเดินทาง</button>`
    : `<button class="${cls} is-wait ${st.late ? 'is-late' : ''}" disabled title="${st.late ? 'เลยกำหนดออกเกิน 24 ชั่วโมง ให้แอดมินบันทึกแทน' : `กดได้ก่อนเวลาออก 3 ชั่วโมง`}">${icon(st.late ? 'alert' : 'clock')} ${st.msg}</button>`; };
  Pages._departState = departState;
  // ───────── ออกงานฉุกเฉิน (นำส่งผู้ป่วย): คนขับกดเองทันที · แอดมินบันทึกแทนได้ (เลือกคนขับ + เวลาออก/กลับ) ─────────
  Pages._medicalModal = async ({ admin = false, driverId = '' } = {}) => {
    const me = S.me, myD = S.driverOfUser(me);
    const mem = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
    const onTrip = id => S.db.requests.some(r => (r.assignments || []).some(a => a.vehicleId === id && a.status === 'ontrip'));
    const soon = id => { const t = Date.now(), u = t + 6 * 36e5; const r = S.db.requests.filter(x => ['approved', 'ontrip'].includes(x.status) && new Date(x.startAt).getTime() < u && new Date(x.endAt).getTime() > t && (x.assignments || []).some(a => a.vehicleId === id && a.status === 'assigned')).sort((a, b) => a.startAt.localeCompare(b.startAt))[0]; return r ? `มีงาน ${fmt.time(r.startAt)}` : ''; };
    // เฉพาะรถรับส่งคน (รถตู้ก่อน) — ไม่แสดงรถบรรทุก/รถขนขยะ/รถกอล์ฟ
    const vs = S.db.vehicles.filter(v => v.bookable !== false && S.PASSENGER_KINDS.includes(v.kind)).sort((a, b) => (S.PASSENGER_KINDS.indexOf(a.kind) < 0) - (S.PASSENGER_KINDS.indexOf(b.kind) < 0) || (a.kind === 'van' ? -1 : 0) - (b.kind === 'van' ? -1 : 0) || (+a.no || 0) - (+b.no || 0));
    const forD = driverId || (myD && myD.id);
    const mine = forD && (S.db.vehicles.find(v => v.driverId === forD) || {}).id;
    const defV = [mem('vb-med-v', ''), mine].find(id => id && vs.some(v => v.id === id) && !onTrip(id)) || (vs.find(v => !onTrip(v.id) && v.kind === 'van') || {}).id || '';
    // รายชื่อครูให้เลือก: แอดมินเห็นผู้ใช้ทั้งหมด · คนขับใช้ชื่อผู้ขอใช้รถที่เคยเห็นในระบบ (พิมพ์ชื่อเองได้เสมอ)
    const names = [...new Set([...S.db.users.filter(u => u.active !== false && (u.roles || []).includes('teacher')).map(u => u.name), ...S.db.requests.map(r => (r.requester || {}).name), ...((S.db.settings.committee || []).map(c => c.name))].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
    const H = S.hospitals();
    const drivers = S.db.drivers.filter(d => d.active !== false);
    const nowL = fmt.local(new Date()), minL = fmt.local(new Date(Date.now() - 24 * 36e5));
    return UI.modal({
      title: `<span class="em-ttl">${icon('alert')} ออกงานฉุกเฉิน · นำส่งผู้ป่วย</span>`, size: 'lg',
      body: `<form id="emF" class="stack em-form">
        <div class="note-box red">${icon('alert')}<div>ใช้เมื่อ<b>นำส่งผู้ป่วย/ผู้บาดเจ็บกรณีฉุกเฉิน</b>เท่านั้น · ไม่ต้องขออนุญาตล่วงหน้า ระบบแจ้งแอดมินทันที · กลับถึงแล้วให้ผู้ดูแลลงชื่อ</div></div>
        ${admin ? `<div class="field"><label>คนขับ <b class="req">*</b></label><select name="driverId"><option value="">— เลือกคนขับ —</option>${drivers.map(d => `<option value="${d.id}" ${d.id === driverId ? 'selected' : ''}>${esc(d.name)}${d.standby ? ' (สำรอง)' : ''}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>รถที่ใช้ <b class="req">*</b> <span class="hint">(เลือกคันไหนก็ได้ที่ว่าง)</span></label>
          <div class="em-veh">${vs.map(v => { const busy = onTrip(v.id) && !admin, s = soon(v.id); return `<label class="em-v ${busy ? 'is-busy' : ''}"><input type="radio" name="vehicleId" value="${v.id}" ${v.id === defV ? 'checked' : ''} ${busy ? 'disabled' : ''}><span><b>${esc(v.name)}</b><small>${esc(v.plate || '')}</small>${busy ? '<em class="bad">กำลังเดินทาง</em>' : s ? `<em>${s}</em>` : ''}</span></label>`; }).join('')}</div></div>
        <div class="field"><label>สถานพยาบาล <b class="req">*</b></label>
          <div class="em-hos">${[...H, '_'].map(h => `<label class="em-h"><input type="radio" name="hosSel" value="${esc(h)}"><span>${h === '_' ? 'อื่น ๆ (พิมพ์เอง)' : esc(h)}</span></label>`).join('')}</div>
          <input name="hosOther" class="em-hos-other" placeholder="ชื่อสถานพยาบาล *" hidden></div>
        <div class="grid2">
          <div class="field"><label>จำนวนผู้ป่วย <b class="req">*</b></label><div class="em-step"><button type="button" class="icon-btn" data-step="-1" aria-label="ลด">${icon('minus')}</button><input name="patients" type="number" inputmode="numeric" min="1" value="1"><button type="button" class="icon-btn" data-step="1" aria-label="เพิ่ม">${icon('plus')}</button><span>คน</span></div></div>
          <div class="field"><label>ผู้ดูแลที่ไปด้วย (ครู/พยาบาล) <b class="req">*</b></label><input name="carer" list="emCarer" autocomplete="off" placeholder="เลือกจากรายชื่อ หรือพิมพ์ชื่อเอง"><datalist id="emCarer">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
          <div class="field"><label>เลขไมล์ตอนออก</label><input name="odoStart" type="number" inputmode="numeric" min="0" placeholder="เลขไมล์"></div>
          <div class="field"><label>เวลาออก</label>${admin ? `<input name="departAt" type="datetime-local" value="${nowL}" max="${nowL}">` : `<label class="check em-late"><input type="checkbox" name="late"> ลืมกดตอนออก (บันทึกย้อนหลัง ไม่เกิน 24 ชม.)</label><input name="departAt" type="datetime-local" value="${nowL}" min="${minL}" max="${nowL}" hidden>`}</div>
          ${admin ? `<div class="field"><label>เวลากลับถึง <span class="hint">(ถ้ากลับแล้ว)</span></label><input name="returnAt" type="datetime-local" max="${nowL}"></div>
          <div class="field"><label>เลขไมล์ตอนกลับ</label><input name="odoEnd" type="number" inputmode="numeric" min="0"></div>` : ''}
          <div class="field full"><label>หมายเหตุ <span class="hint">(ไม่ต้องระบุอาการ/ชื่อผู้ป่วย)</span></label><input name="note" placeholder="เช่น ออกจากหอพักชาย"></div>
        </div>
      </form>`,
      onOpen(el) {
        const f = el.querySelector('#emF');
        const odoOf = () => { const v = (f.querySelector('[name=vehicleId]:checked') || {}).value; const o = v ? lastOdo(v) : null; f.odoStart.placeholder = o != null ? `ล่าสุด ${fmt.num(o)}` : 'เลขไมล์'; if (o != null && !f.odoStart.dataset.touched) f.odoStart.value = o; };
        f.odoStart.addEventListener('input', () => { f.odoStart.dataset.touched = 1; });
        f.addEventListener('change', e => {
          if (e.target.name === 'vehicleId') odoOf();
          if (e.target.name === 'hosSel') { const o = e.target.value === '_'; f.hosOther.hidden = !o; if (o) f.hosOther.focus(); }
          if (e.target.name === 'late') f.departAt.hidden = !e.target.checked;
        });
        f.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) f.patients.value = Math.max(1, (+f.patients.value || 1) + +b.dataset.step); });
        odoOf();
      },
      actions: [{ label: 'ยกเลิก', value: null }, { label: admin ? 'บันทึกงานฉุกเฉิน' : 'ออกเดินทาง (ฉุกเฉิน)', kind: 'btn-danger', icon: 'navigation', onClick: async el => {
        const f = el.querySelector('#emF'), g = n => (f.querySelector(`[name=${n}]:checked`) || f.querySelector(`[name=${n}]:not([type=radio])`) || {}).value || '';
        const hs = g('hosSel'), hospital = hs === '_' ? f.hosOther.value.trim() : hs;
        const departAt = admin || (f.late && f.late.checked) ? f.departAt.value : '';
        const r = await S.createMedical({ vehicleId: g('vehicleId'), hospital, patients: f.patients.value, carer: { name: f.carer.value.trim() }, odoStart: f.odoStart.value, departAt, note: f.note.value,
          ...(admin ? { driverId: f.driverId.value, returnAt: f.returnAt.value, odoEnd: f.odoEnd.value } : {}) });
        try { localStorage.setItem('vb-med-v', r.assignments[0].vehicleId); } catch (e) { /* ไม่จำก็ได้ */ }
        return r;
      } }]
    }).then(r => { if (r) UI.toast(admin ? `บันทึกงานฉุกเฉิน ${r.id} แล้ว` : 'บันทึกออกงานฉุกเฉินแล้ว — แจ้งแอดมินแล้ว · กลับถึงแล้วกด "กลับถึง" และให้ผู้ดูแลลงชื่อ', 'ok'); return r; });
  };
  // ตรวจสภาพรถก่อนออกเดินทาง (คนขับต้องติ๊กครบ หรือแจ้งปัญหาที่พบ — แอดมินเห็นในหน้าภาพรวม)
  const CHECKS = ['น้ำมันเพียงพอสำหรับการเดินทาง', 'ลมยางและสภาพยางปกติ', 'ไฟหน้า ไฟเลี้ยว ไฟเบรก ใช้งานได้', 'เบรก พวงมาลัย ไม่มีไฟเตือนบนหน้าปัด', 'น้ำมันเครื่อง น้ำหล่อเย็น ระดับปกติ', 'อุปกรณ์ฉุกเฉินและเอกสารประจำรถครบ', 'ห้องโดยสารสะอาด เข็มขัดนิรภัยใช้งานได้'];

  // ───────── ป๊อปอัปเลขไมล์ / สถานะ ─────────
  // override = แอดมินบันทึกแทนคนขับจากหน้าหลังบ้าน (นอกเวลา/ข้ามการตรวจรถได้ แต่ต้องมีเหตุผล)
  Pages._tripAction = async (r, idx, status, { override = '' } = {}) => {
    const a = r.assignments[idx], v = S.vehicle(a.vehicleId) || {};
    const admin = S.isAdmin(S.me) && !!override, dep = status === 'ontrip';
    if (dep && !override && !departState(r).ok) return UI.toast(departState(r).late ? departState(r).msg : `ยังไม่ถึงเวลา — ${departState(r).msg} (กดได้ก่อนเวลาออก 3 ชั่วโมง)`, 'error');
    if (!dep && a.status !== 'ontrip' && !override) return UI.toast(a.status === 'returned' ? 'บันทึกกลับถึงแล้ว' : 'ต้องกด "ออกเดินทาง" ก่อน จึงจะกด "กลับถึงแล้ว" ได้', 'error');
    const med = !!r.medical;
    const early = !dep && !med && earlyReturn(r);
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
        ${!dep ? `<div class="ps-box"><div class="chk-head"><b>${icon('edit')} ${med ? 'ผู้ดูแลที่ไปด้วย (ครู/พยาบาล) ลงชื่อ' : 'ครูผู้ร่วมเดินทางลงชื่อ'}</b><span class="hint">ยืนยันเวลากลับถึง</span></div>
          <div class="ps-opt" ${med ? 'hidden' : ''}><label><input type="radio" name="psHas" value="1" ${med ? 'checked' : ''}> มีครูไปด้วย</label><label><input type="radio" name="psHas" value="0"> ไม่มีครูไปด้วย</label></div>
          <div id="psWrap" ${med ? '' : 'hidden'}><div class="field"><label>${med ? 'ชื่อผู้ดูแล' : 'ชื่อครูที่ลงชื่อ'} <b class="req">*</b></label><input id="psName" list="psList" value="${esc(med ? ((r.medical.carer || {}).name || '') : r.requester.name)}" autocomplete="off"><datalist id="psList">${[r.requester.name, ...String(r.passengerNames || '').split(/[,\n،]+/)].map(x => x.trim()).filter(x => x && !/^[-–.\s]+$/.test(x)).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
            <div class="sig-pad"><canvas id="psPad" aria-label="ช่องเซ็นชื่อครู"></canvas><span class="sig-base">ครูลงชื่อบนเส้นนี้</span><span class="sig-x">✕</span></div>
            <div class="row between" style="margin-top:6px"><span class="hint">ส่งมือถือให้ครูเซ็น</span><button type="button" class="btn btn-ghost btn-sm" id="psClear">${icon('trash')} ล้าง</button></div></div></div>` : ''}        <div class="field"><label>เลขไมล์${dep ? 'ตอนออก' : 'ตอนกลับ'} (กม.)</label><input id="odoIn" type="number" inputmode="numeric" min="0" value="${def}" placeholder="ไม่บังคับ — กรอกภายหลังได้"></div>
        ${!dep && a.odoStart != null ? `<p class="hint">เลขไมล์ตอนออก ${fmt.num(a.odoStart)} กม.</p>` : ''}
        <div class="field"><label>เวลา</label><input id="atIn" type="datetime-local" value="${fmt.local(new Date())}" max="${fmt.local(new Date(Date.now() + 5 * 6e4))}"></div>
      </div>`,
      onOpen(el) {
        if (dep) return;
        let pad = null; const wrap = el.querySelector('#psWrap');
        if (med) { pad = UI.signaturePad(el.querySelector('#psPad')); el._ps = pad; }
        el.addEventListener('change', e => { if (e.target.name !== 'psHas') return; wrap.hidden = e.target.value !== '1'; if (!wrap.hidden && !pad) { pad = UI.signaturePad(el.querySelector('#psPad')); el._ps = pad; } });
        el.querySelector('#psClear').addEventListener('click', () => pad && pad.clear());
      },
      actions: [{ label: 'ยกเลิก', value: null }, { label: dep ? 'ตรวจแล้ว ออกเดินทาง' : 'กลับถึงแล้ว', kind: dep ? 'btn-primary' : 'btn-ok', icon: 'check', onClick: async el => {
        let check = null, note = '';
        if (dep) {
          const miss = [...el.querySelectorAll('[data-chk]')].filter(x => !x.checked).map(x => CHECKS[+x.dataset.chk]);
          const cn = el.querySelector('#chkNote').value.trim();
          if (miss.length && !cn && !admin) { UI.toast(`ยังไม่ได้ติ๊ก ${miss.length} ข้อ — ติ๊กให้ครบ หรือระบุปัญหาที่พบ`, 'error'); return false; }
          check = { ok: !miss.length && !cn, miss, note: cn, skipped: admin && miss.length === CHECKS.length && !cn };
        }
        if (early) { note = el.querySelector('#earlyNote').value.trim(); if (!note && !admin) { UI.toast('กรุณาระบุเหตุผลที่กลับก่อนเวลา', 'error'); return false; } }
        let paxSign = null;
        if (!dep) {
          const has = (el.querySelector('[name=psHas]:checked') || {}).value;
          if (!has && !admin) { UI.toast('กรุณาเลือกว่ามีครูไปด้วยหรือไม่', 'error'); return false; }
          if (has === '1') {
            const nm = el.querySelector('#psName').value.trim(), pad = el._ps;
            if (!nm) { UI.toast('กรุณาระบุชื่อครูที่ลงชื่อ', 'error'); return false; }
            const er = pad ? pad.check() : 'กรุณาให้ครูเซ็นชื่อ'; if (er) { UI.toast(er, 'error'); return false; }
            paxSign = { has: true, name: nm, img: pad.toPNG(), at: new Date().toISOString() };
          } else if (has === '0') paxSign = { has: false, at: new Date().toISOString() };
        }
        await S.tripStatus(r.id, idx, status, { odo: el.querySelector('#odoIn').value, at: el.querySelector('#atIn').value, check, note, override, paxSign });
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
          ${(r.destinations || []).length ? `<div class="full"><small>ปลายทาง <span class="muted">· กดชื่อสถานที่เพื่อเปิด Google Maps</span></small>${r.destinations.map((d, k) => `<a class="gm-dest" href="${C.gmapPlace(d)}" target="_blank" rel="noopener">${icon('pin')}<span><b>${r.destinations.length > 1 ? `${k + 1}. ` : ''}${esc(d.name)}</b>${d.address || d.province ? `<small>${esc(d.address || d.province)}</small>` : ''}<small class="gm-ll">${C.hasLL(d) ? `ตามพิกัดที่ครูปัก ${(+d.lat).toFixed(5)}, ${(+d.lng).toFixed(5)}` : 'ไม่มีพิกัด — ค้นจากชื่อสถานที่'}</small></span>${icon('arrowUR')}</a>`).join('')}${r.totalKm ? `<span class="muted">ระยะทางรวมประมาณ ${fmt.num(r.totalKm, 0)} กม. (ไป + กลับ)</span>` : ''}
            <a class="btn btn-ghost btn-sm gm-nav" href="${C.gmapRoute(r.destinations)}" target="_blank" rel="noopener">${icon('navigation')} นำทางด้วย Google Maps${r.destinations.length > 1 ? ` (ทุกจุด ${r.destinations.length} แห่ง)` : ''}</a></div>` : ''}
          ${a.note ? `<div class="full" style="background:var(--gold-50)"><small>หมายเหตุจากแอดมิน</small>${esc(a.note)}</div>` : ''}
          ${S.tripTag(r) ? `<div class="full"><small>ลักษณะการเดินทาง</small>${S.tripTag(r).text}${S.tripType(r) === 'daily' ? ` · ออก ${fmt.time(r.startAt)} กลับ ${fmt.time(r.endAt)} น. ทุกวัน` : ''}${r.lodging ? ' · ที่พัก ' + esc(r.lodging) : ''}</div>` : ''}
          ${others.length ? `<div class="full"><small>รถคันอื่นในทริปเดียวกัน</small>${others.map(o => `${esc(C.vName(o.vehicleId))} · ${esc(C.dName(o.driverId))}`).join('<br>')}</div>` : ''}
          ${a.odoStart != null || a.odoEnd != null ? `<div class="full"><small>เลขไมล์</small>${a.odoStart != null ? fmt.num(a.odoStart) : '—'} → ${a.odoEnd != null ? fmt.num(a.odoEnd) : '—'}${a.odoStart != null && a.odoEnd != null ? ` <b>(${fmt.num(a.odoEnd - a.odoStart)} กม.)</b>` : ''}</div>` : ''}
          ${mine.length ? `<div class="full"><small>ค่าใช้จ่ายที่บันทึก</small>${mine.map(e => `${esc(Pages._expTitle(e))} ${fmt.money(e.amount)} บ.${e.liters ? ` (${e.liters} ล.)` : ''}`).join('<br>')}</div>` : ''}
        </div>
      </div>
      <div class="job-acts">
        ${a.status === 'assigned' ? departBtn(r, i) : ''}
        ${a.check && !a.check.ok && !a.check.skipped ? `<div class="note-box warn-y full">${icon('alert')}<div><b>แจ้งปัญหาก่อนออกเดินทาง:</b> ${esc([...(a.check.miss || []), a.check.note].filter(Boolean).join(' · '))}</div></div>` : ''}
        ${a.status === 'ontrip' ? `<button class="btn btn-ok full" data-go="returned" data-r="${r.id}" data-i="${i}">${icon('home')} กลับถึงโรงเรียนแล้ว</button>` : ''}
        ${a.status !== 'assigned' ? `<button class="btn btn-gold" data-fuel data-r="${r.id}" data-v="${a.vehicleId}">${icon('fuel')} ${mine.length ? `ค่าใช้จ่าย (${mine.length} รายการ) · ดู/เพิ่ม` : 'บันทึกค่าใช้จ่าย'}</button><button class="btn btn-ghost" data-odo data-r="${r.id}" data-i="${i}">${icon('gauge')} แก้เลขไมล์</button>` : ''}
        ${!detail ? `<a class="btn btn-ghost full" href="#/driver/${r.id}/${i}">${icon('info')} ดูรายละเอียดงาน</a>` : ''}
      </div>
    </article>`;
  }
  function bindJobs(root) {
    root.addEventListener('click', async e => {
      const em = e.target.closest('[data-emgo]'); if (em) { const r = await Pages._medicalModal(em.dataset.drv ? { admin: true, driverId: em.dataset.drv } : {}); if (r) App.render(); return; }
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
      <div class="seg"><a href="${link({ view: 'week' })}"><button class="${view === 'week' ? 'on' : ''}" tabindex="-1">สัปดาห์</button></a><a href="${link({ view: 'month' })}"><button class="${view === 'month' ? 'on' : ''}" tabindex="-1">เดือน</button></a></div></div>`;
    let grid = '';
    if (view === 'day') grid = '';
    else if (view === 'month') {
      const first = new Date(sel.getFullYear(), sel.getMonth(), 1), start = addD(first, -first.getDay());
      const cells = Array.from({ length: 42 }, (_, i) => addD(start, i));
      const rows = cells[35].getMonth() !== sel.getMonth() ? cells.slice(0, 35) : cells;
      grid = `<div class="cal dcal"><div class="cal-head">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => `<div>${d}</div>`).join('')}</div><div class="cal-grid">${rows.map(d => {
        const s = daySummary(jobsOn(jobs, d), d);
        return `<a class="cal-day ${d.getMonth() !== sel.getMonth() ? 'out' : ''} ${UI.sameDay(d, new Date()) ? 'today' : ''} ${UI.sameDay(d, sel) ? 'sel' : ''} ${s.n ? 'has' : ''}" href="${link({ date: fmt.localDate(d) })}"><span class="d">${d.getDate()}</span>
          ${s.n ? `<span class="dj ${s.live ? 'live' : ''}"><b>${s.n}</b><em>งาน</em></span>` : ''}</a>`;
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
        ${(onTrip || startSoon) && C.gmapRoute(r.destinations) ? `<a class="btn btn-ghost dh-nav" href="${C.gmapRoute(r.destinations)}" target="_blank" rel="noopener">${icon('navigation')} นำทาง Google Maps</a>` : ''}
      </div>`; })() : '';
    return `<div class="dh-grid">
      <div class="dh-side">
        ${nextCard}
        ${late.length ? `<div class="dh-late">${icon('alert')}<div><b>ยังไม่ได้กดสถานะ ${late.length} งาน</b><small>เลยวันเดินทางแล้ว — ถ้ายังไม่เกิน 24 ชม. กดเข้าไปกด "ออกเดินทาง / กลับถึง" ได้ · เกิน 24 ชม. ให้แจ้งแอดมินบันทึกแทน</small>${late.map(j => `<a href="${jobHref(j)}">${dShort(j.r.startAt)} · ${esc(S.destName(j.r))}</a>`).join('')}</div></div>` : ''}
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
    const mode = RANGES[query.r] ? query.r : 'day';   // เข้ามาครั้งแรก = ดูงานวันนี้
    const ref = query.date ? UI.dayOf(query.date) : new Date();
    const linkL = o => { const p = { ...(adminView ? { d: d.id } : {}), r: mode, ...o }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; }); return '#/driver?' + new URLSearchParams(p); };
    const tab = query.tab === 'cal' ? 'cal' : 'list';
    const view = query.view === 'month' ? 'month' : 'week';   // ค่าเริ่มต้น = สัปดาห์ (ไม่มีมุมมองวันนี้แล้ว)
    const sel = UI.dayOf(query.date);
    const link = o => '#/driver?' + new URLSearchParams({ ...(adminView ? { d: d.id } : {}), tab: 'cal', view, date: fmt.localDate(sel), ...o });
    const tabs = `<div class="seg" style="margin-top:16px;display:flex"><a href="#/driver${adminView ? `?d=${d.id}` : ''}" style="flex:1"><button class="${tab === 'list' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('list')} งานของฉัน</button></a><a href="${link({})}" style="flex:1"><button class="${tab === 'cal' ? 'on' : ''}" tabindex="-1" style="width:100%">${icon('calendar')} ปฏิทินงาน</button></a></div>`;
    return {
      layout: 'driver',
      html: `<div class="drv ${tab === 'list' ? 'drv-wide' : ''}">
        ${adminView ? `<a class="btn btn-ghost btn-sm back-admin" href="#/admin">${icon('arrowL')} กลับระบบหลังบ้าน</a>
          <div class="note-box navy adm-pick" style="margin-bottom:14px">${icon('shield')}<div><span class="nw">มุมมองแอดมิน — เลือกคนขับ</span><div class="adm-pick-row"><select class="input" onchange="location.hash='#/driver?${tab === 'cal' ? 'tab=cal&' : ''}d='+this.value">${S.db.drivers.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><a class="link nw" href="#/admin/roster">ตารางเวรรวมทุกคน</a></div></div></div>` : ''}
        <div class="drv-hello">${d.photo ? `<span class="avatar lg gold ph">${UI.img(d.photo, d.name)}</span>` : UI.avatar(d.name, 'lg gold')}<div><small>สวัสดีครับ</small><h2>${esc(d.name)}</h2><small>${fmt.dateLong(new Date())}</small></div></div>
        <button type="button" class="em-go" data-emgo ${adminView ? `data-drv="${d.id}"` : ''}>${icon('alert')}<span><b>ออกงานฉุกเฉิน</b><small>${adminView ? `แอดมินบันทึกแทน ${esc(d.name)} — นำส่งผู้ป่วย` : 'นำส่งผู้ป่วย — ไม่ต้องรอคำขอ/อนุมัติ'}</small></span>${icon('chevR')}</button>
        ${tabs}
        ${tab === 'cal' ? driverCalendar(jobs, { view, sel, link }) : overview(jobs, { mode, ref, link: linkL })}
      </div>`,
      patch: true,
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
      patch: true,
      mount: bindJobs
    };
  };
})();
