/* ═══════════════════════════════════════════════════════════
   App — สลับหน้า (hash router) · แถบเมนู · ส่วนท้าย · ตรวจสิทธิ์ · ส่วนประกอบที่ใช้ซ้ำ
   แต่ละหน้าลงทะเบียนใน Pages (pages-public.js / pages-admin.js / pages-driver.js)
   ═══════════════════════════════════════════════════════════ */
const Pages = {};
const C = (() => {
  'use strict';
  const { esc, fmt, pill, kindIcon } = UI;
  const S = () => Store;

  // โลโก้พร้อมอะตอมโคจร
  const atom = (cls = '') => `
    <span class="atom ${cls}" aria-hidden="true">
      <svg viewBox="0 0 100 100"><defs><path id="ao" d="M4,50 a46,17 0 1,0 92,0 a46,17 0 1,0 -92,0"/></defs>
        <g class="spin">
          <g><use href="#ao" class="orb"/><circle r="3.2" fill="#c9962b" class="e"><animateMotion dur="4.6s" repeatCount="indefinite"><mpath href="#ao"/></animateMotion></circle></g>
          <g transform="rotate(60 50 50)"><use href="#ao" class="orb"/><circle r="2.6" fill="#24307a" class="e"><animateMotion dur="6.2s" begin="-2s" repeatCount="indefinite"><mpath href="#ao"/></animateMotion></circle></g>
          <g transform="rotate(120 50 50)"><use href="#ao" class="orb"/><circle r="2.9" fill="#e8c36a" class="e"><animateMotion dur="3.8s" begin="-1s" repeatCount="indefinite"><mpath href="#ao"/></animateMotion></circle></g>
        </g></svg>
      <img src="images/logo.png" alt="">
    </span>`;

  const statusPill = (r, extra = '') => pill(S().STATUS[r.status], extra);
  const stars = n => `<span class="stars-show" aria-label="${(+n || 0).toFixed(1)} ดาว">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= Math.round(n) ? '' : 'off'}">${icon('star')}</span>`).join('')}</span>`;
  const vName = id => { const v = S().vehicle(id); return v ? v.name : '—'; };
  const vPlate = id => { const v = S().vehicle(id); return v ? v.plate : ''; };
  const dName = id => { const d = S().driver(id); return d ? d.name : 'ยังไม่ระบุคนขับ'; };
  const dPhone = id => { const d = S().driver(id); return d ? d.phone : ''; };

  // บัตรคำขอแบบรายการ
  // ป้ายลักษณะการเดินทาง (ค้างคืน / ไป-กลับทุกวัน / ไปส่ง-รับอย่างเดียว)
  const tripTagHTML = (r, style = '') => { const t = S().tripTag(r); return t ? `<span class="tag ${t.cls}" ${style ? `style="${style}"` : ''}>${icon(t.icon)}${t.text}</span>` : ''; };
  function reqCard(r, href) {
    const d = new Date(r.startAt);
    const vs = (r.assignments || []).map(a => vName(a.vehicleId)).join(', ');
    return `
      <a class="req-card st-${r.status}" href="${href}">
        <div class="dt"><b>${d.getDate()}</b><small>${d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}<br>${fmt.time(d)} น.</small></div>
        <div style="min-width:0">
          <h4>${esc(S().destName(r))}</h4>
          <div class="meta">
            <span>${icon('flag')}${esc(r.purpose)}</span>
            <span>${icon('clock')}${fmt.range(r.startAt, r.endAt)}</span>
            <span>${icon('users')}${S().paxText(r)}</span>${tripTagHTML(r)}${S().needsMemo(r) ? `<span class="tag red">${icon('alert')}ค้างบันทึกข้อความ</span>` : ''}
            ${vs ? `<span>${icon('van')}${esc(vs)}</span>` : ''}
          </div>
        </div>
        <div class="rq-side">${statusPill(r)}<small class="muted">${r.id}</small></div>
      </a>`;
  }

  // บัตรตั๋วโดยสาร (ใช้ในแดชบอร์ด/ตารางรถ)
  function pass(r, { href = '' } = {}) {
    const now = Date.now(), st = new Date(r.startAt), en = new Date(r.endAt);
    const p = ['returned', 'closed'].includes(r.status) ? 1 : r.status === 'ontrip' ? Math.max(0, Math.min(1, (now - st) / (en - st))) : 0;
    const first = (r.assignments || [])[0];
    const v = first && S().vehicle(first.vehicleId);
    // ใช้ div + data-href (ข้างในมีลิงก์โทรหาคนขับ ห้ามใช้ <a> ซ้อนกัน)
    const tag = 'div';
    return `
      <${tag} class="pass ${href ? 'link' : 'hov'}" ${href ? `data-href="${href}" role="link" tabindex="0"` : ''}>
        <div class="pass-main">
          <div class="pass-top"><span class="code">${r.id}${r.emergency ? ' · เร่งด่วน' : ''}</span>${statusPill(r)}</div>
          <div class="route">
            <div class="pt"><b class="num">${fmt.time(st)}</b><small>${UI.sameDay(st, new Date()) ? 'ออกจากโรงเรียน' : fmt.dayMonth(st)}</small></div>
            <div class="rline"><span class="dot s"></span>${r.status === 'ontrip' ? `<span class="fill" style="width:${p * 100}%"></span>` : ''}<span class="dot e"></span><span class="v" style="left:${p * 100}%">${icon(v ? kindIcon(v.kind) : 'van')}</span></div>
            <div class="pt r"><b class="num">${fmt.time(en)}</b><small>${UI.sameDay(st, en) ? 'กลับถึง' : fmt.dayMonth(en)}</small></div>
          </div>
          <h4>${esc(S().destName(r))}</h4>
          <p class="pl">${esc((r.destinations[0] || {}).province || '')}${r.totalKm ? ` · ${fmt.num(r.totalKm, 0)} กม. ไป-กลับ` : ''} · ${esc(r.purpose)}</p>
          <div class="tags">${tripTagHTML(r)}${(r.assignments || []).length > 1 ? `<span class="tag navy">${icon('van')}${r.assignments.length} คัน</span>` : ''}</div>
        </div>
        <div class="pass-stub">
          <div class="full"><small>ผู้ขอใช้รถ</small><span>${esc(r.requester.name)}</span></div>
          <div><small>ครู</small><span>${r.teachers} คน</span></div>
          <div><small>นักเรียน</small><span>${r.students} คน</span></div> ${+r.others ? `<div><small>บุคคลอื่น</small><span>${r.others} คน</span></div>` : ''}
          <div class="full"><small>รถ</small><span>${(r.assignments || []).length ? r.assignments.map(a => `${esc(vName(a.vehicleId))} · ${esc(vPlate(a.vehicleId))}`).join('<br>') : (r.status === 'pending' ? 'รอแอดมินจัดรถ' : '—')}</span></div>
          <div class="full"><small>คนขับ</small><span>${(r.assignments || []).length ? r.assignments.map(a => `${esc(dName(a.driverId))}${dPhone(a.driverId) ? ` · <a href="tel:${esc(dPhone(a.driverId))}">${esc(dPhone(a.driverId))}</a>` : ''}`).join('<br>') : '—'}</span></div>
        </div>
      </${tag}>`;
  }

  // การ์ดตั๋วโดยสารแนวนอน (หน้าแรก · แบบ A) — สีหัวการ์ดตามสถานะ · ไม่แสดงฝ่าย/กลุ่มสาระ
  const TIX = { ontrip: ['#ff9a4d', '#ea4f1f'], approved: ['#4f5fd0', '#24307a'], pending: ['#e8c36a', '#b9861f'], returned: ['#8e93ad', '#5f6587'], closed: ['#8e93ad', '#5f6587'], revise: ['#f5b54a', '#c27a12'] };
  function ticket(r, { href = '' } = {}) {
    const [c1, c2] = TIX[r.status] || TIX.approved;
    const st = new Date(r.startAt), en = new Date(r.endAt), now = Date.now();
    const p = ['returned', 'closed'].includes(r.status) ? 1 : r.status === 'ontrip' ? Math.max(0, Math.min(1, (now - st) / (en - st))) : 0;
    const as = r.assignments || [];
    const v0 = as[0] && S().vehicle(as[0].vehicleId);
    const m = S().STATUS[r.status] || {};
    return `
      <article class="tix ${href ? 'link' : ''}" style="--c1:${c1};--c2:${c2}" ${href ? `data-href="${href}" role="link" tabindex="0"` : ''}>
        <div class="tix-top">
          <div class="tix-row"><span class="tix-id">${r.id}${r.emergency ? ' · เร่งด่วน' : ''}</span><span class="pill ${m.pulse ? 'pulse' : ''}">${esc(m.label || '')}</span></div>
          <div class="tix-times">
            <div><b class="num">${fmt.time(st)}</b><small>${UI.sameDay(st, new Date()) ? 'ออกจากโรงเรียน' : fmt.dayMonth(st)}</small></div>
            <div class="tix-line"><span class="fill" style="width:${p * 100}%"></span><span class="v" style="left:${p * 100}%">${icon(v0 ? kindIcon(v0.kind) : 'van')}</span></div>
            <div class="r"><b class="num">${fmt.time(en)}</b><small>${UI.sameDay(st, en) ? 'กลับถึง' : fmt.dayMonth(en)}</small></div>
          </div>
        </div>
        <div class="tix-perf"></div>
        <div class="tix-body">
          <h3>${esc(S().destName(r))}</h3>
          <p class="pl">${icon('pin')} ${esc((r.destinations[0] || {}).province || (r.destinations[0] || {}).address || '')}${r.totalKm ? ` · ${fmt.num(r.totalKm, 0)} กม. ไป-กลับ` : ''}</p>
          ${tripTagHTML(r, 'margin-top:8px')}
          <div class="tix-purpose">${esc(r.purpose)}</div>
          <div class="tix-ppl"><span>${icon('teacher')} ครู <b>${r.teachers}</b></span><span>${icon('student')} นักเรียน <b>${r.students}</b></span>${+r.others ? `<span>${icon('users')} บุคคลอื่น <b>${r.others}</b></span>` : ''}</div>
          <div class="tix-grid">
            <div><small>ผู้ขอใช้รถ</small>${esc(r.requester.name)}</div>
            <div><small>รถ${as.length > 1 ? ` (${as.length} คัน)` : ''}</small>${as.length ? as.map(a => `${esc(vName(a.vehicleId))} · ${esc(vPlate(a.vehicleId))}`).join('<br>') : (r.status === 'pending' ? 'รอแอดมินจัดรถ' : '—')}</div>
            <div><small>คนขับ</small>${as.length ? as.map(a => `${esc(dName(a.driverId))}${dPhone(a.driverId) ? ` · <a href="tel:${esc(dPhone(a.driverId))}">${esc(dPhone(a.driverId))}</a>` : ''}`).join('<br>') : '—'}</div>
          </div>
        </div>
      </article>`;
  }
  // แถบเลื่อนแนวนอน: ปุ่มลูกศร · ลากเมาส์ · ปัดมือถือ · จุดบอกตำแหน่ง (จำตำแหน่งเดิมเมื่อหน้ารีเฟรชข้อมูล)
  const railPos = {};
  function bindRail(root, key, startIndex = 0) {
    const rail = root.querySelector(`[data-rail="${key}"]`); if (!rail) return;
    const items = [...rail.children]; if (!items.length) return;
    const dots = root.querySelector(`[data-dots="${key}"]`), cnt = root.querySelector(`[data-count-of="${key}"]`);
    const step = () => items[0].getBoundingClientRect().width + 18;
    if (dots) dots.innerHTML = items.map(() => '<i></i>').join('');
    const max = () => rail.scrollWidth - rail.clientWidth;
    const idx = () => rail.scrollLeft >= max() - 4 ? items.length - 1 : Math.round(rail.scrollLeft / step());
    const upd = () => { const i = idx(); railPos[key] = rail.scrollLeft; if (dots) dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); if (cnt) cnt.textContent = `${Math.min(items.length, i + 1)} / ${items.length}`; };
    rail.addEventListener('scroll', upd, { passive: true });
    root.querySelectorAll(`[data-rail-go="${key}"]`).forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: +b.dataset.dir * step(), behavior: 'smooth' })));
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('a')) return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
    const mv = e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; rail.scrollLeft = sl - dx; };
    const up = () => { if (!down) return; down = false; rail.classList.remove('drag'); const m = max(); rail.scrollTo({ left: rail.scrollLeft > m - step() / 2 ? m : Math.round(rail.scrollLeft / step()) * step(), behavior: 'smooth' }); };
    const old = railPos['_h' + key]; if (old) { removeEventListener('pointermove', old[0]); removeEventListener('pointerup', old[1]); }
    railPos['_h' + key] = [mv, up];
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    rail.style.scrollBehavior = 'auto';
    rail.scrollLeft = railPos[key] != null ? railPos[key] : startIndex * step();
    rail.style.scrollBehavior = '';
    upd();
  }

  // แกนเวลาการใช้รถของวัน (Gantt): แถว = รถ, แกนนอน = ชั่วโมง, เส้น "ตอนนี้"
  function gantt(list, vehicles, { day = new Date(), hrefOf = () => '' } = {}) {
    const d0 = new Date(day); d0.setHours(0, 0, 0, 0);
    const d1 = new Date(d0.getTime() + 864e5);
    // ช่วงเวลาอัจฉริยะ: แสดงเฉพาะช่วงที่มีการใช้รถจริง (ทั้ง 24 ชม. ได้: งานต่อจากเมื่อวาน = 00:00 · ค้างคืน = 24:00)
    if (!list.length) return `<div class="g-empty">${icon('checkCircle')}<p>วันนี้ไม่มีการใช้รถ — รถว่างทุกคัน</p></div>`;
    let H0 = 24, H1 = 0;
    list.forEach(r => { const s = new Date(r.startAt), e = new Date(r.endAt);
      H0 = Math.min(H0, s < d0 ? 0 : s.getHours());
      H1 = Math.max(H1, e >= d1 ? 24 : Math.min(24, e.getHours() + (e.getMinutes() ? 1 : 0))); });
    if (H1 - H0 < 3) { H1 = Math.min(24, H0 + 3); H0 = Math.max(0, H1 - 3); }
    const pos = t => Math.max(0, Math.min(100, ((new Date(t) - d0) / 36e5 - H0) / (H1 - H0) * 100));
    const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
    const bar = (r, extra = '') => {
      const l = pos(r.startAt), w = Math.max(3, pos(r.endAt) - l), href = hrefOf(r);
      const cont = new Date(r.startAt) < d0 ? '← ' : '', more = new Date(r.endAt) > d1 ? ' →' : '';
      return `<div class="g-bar s-${r.status} link" data-tcard="${r.id}" style="left:${l}%;width:${w}%" ${href ? `data-href="${href}"` : ''} title="${esc(S().destName(r))} · ${fmt.time(r.startAt)}–${fmt.when(r.endAt)} · ${esc(r.requester.name)}${extra}">${icon(r.status === 'pending' ? 'clock' : 'pin')}<span>${cont}${esc(S().destName(r))}${r.overnight ? ' · ค้างคืน' : ''}${more}</span></div>`;
    };
    const rows = vehicles.map(v => {
      const mine = list.filter(r => (r.assignments || []).some(a => a.vehicleId === v.id));
      const m = v.maint && v.maint.active ? `<div class="g-bar maint" style="left:${pos(v.maint.from || d0)}%;width:${Math.max(3, pos(v.maint.to || d1) - pos(v.maint.from || d0))}%">${icon('wrench')}<span>${esc(v.maint.note || 'ซ่อมบำรุง')}</span></div>` : '';
      return `<div class="g-row"><div class="g-name"><b>${esc(v.name)}</b><small>${esc(v.plate)}</small></div><div class="g-lane">${m}${mine.map(r => bar(r)).join('')}</div></div>`;
    }).join('');
    const pend = list.filter(r => r.status === 'pending');
    const now = new Date(), showNow = now >= d0 && now < d1;
    return `<div class="gantt-scroll"><div class="gantt" style="--cols:${H1 - H0}">
        <div class="g-axis"><div></div><div class="g-scale">${hours.map((h, i) => `<span style="left:${i / (hours.length - 1) * 100}%">${String(h % 24).padStart(2, '0')}:00</span>`).join('')}</div></div>
        ${rows}
        ${pend.length ? `<div class="g-row"><div class="g-name"><b>คำขอรอจัดรถ</b><small>แอดมินกำลังพิจารณา</small></div><div class="g-lane">${pend.map(r => bar(r)).join('')}</div></div>` : ''}
        ${showNow ? `<div class="g-nowwrap"><div class="g-now" style="left:${pos(now)}%" data-t="ตอนนี้ ${fmt.time(now)}"></div></div>` : ''}
      </div></div>
      <div class="g-legend"><span><i class="lg done"></i>กลับแล้ว</span><span><i class="lg live"></i>กำลังเดินทาง</span><span><i class="lg ok"></i>อนุมัติแล้ว</span><span><i class="lg wait"></i>รอจัดรถ</span><span><i class="lg mt"></i>ซ่อมบำรุง</span></div>`;
  }

  // ชื่อผู้ขอแบบสั้นบนมือถือ: บุคคล → "ครู" + ชื่อ (ไม่มีนามสกุล) · ชื่อหน่วยงาน → คงเดิม
  const teacherShort = n => { const s = String(n || '').trim(); const m = /^(นางสาว|นาย|นาง|ครู|ดร\.|ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.)\s*(\S+)/.exec(s); if (m) return 'ครู' + m[2]; return /ฝ่าย|งาน|กลุ่ม|โรงเรียน/.test(s) ? s : 'ครู' + s.split(/\s+/)[0]; };
  // บรรทัดย่อบนมือถือ: ครู · N คน · รถ · คนขับ (ชื่อ)
  const tripMeta = r => [teacherShort(r.requester.name), S().passengers(r) + ' คน', ...(r.assignments || []).map(a => vName(a.vehicleId) + (a.driverId ? ' · ' + firstName(dName(a.driverId)) : ''))].map(esc).join(' · ');
  // ชื่อคนขับแบบสั้น (ตัดคำนำหน้า/นามสกุล)
  const firstName = n => String(n || '').replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.|ดร\.)\s*/, '').trim().split(/\s+/)[0] || '';

  // ลานจอดรถแบบมองจากด้านบน + ช่องสรุป (แบบ B)
  const PK = { free: '#10b981', booked: '#e0a526', maint: '#ef4444', off: '#9ca3af' };
  // ป้ายทะเบียน: แยกเลขทะเบียน กับ จังหวัด (มือถือ/แท็บเล็ตแสดงเฉพาะเลข ให้พอดีช่องจอด)
  function plateTag(plate) {
    const p = String(plate || '').trim(); if (!p) return '';
    const parts = p.split(/\s+/), last = parts[parts.length - 1];
    const hasProv = parts.length > 1 && !/\d/.test(last) && !/ไม่มี/.test(p);
    return `<span class="pk-plate${/ไม่มี/.test(p) ? ' none' : ''}"><span>${esc(hasProv ? parts.slice(0, -1).join(' ') : p)}</span>${hasProv ? `<span class="pp"> ${esc(last)}</span>` : ''}</span>`;
  }
  function parkBoard(vehicles) {
    const f = vehicles.map(v => ({ v, s: S().vehicleState(v) }));
    const n = k => f.filter(x => x.s.key === k).length;
    const cols = Math.min(7, Math.ceil(f.length / 2)) || 1;
    return `<div class="pk">
      <div class="pk-lot" style="--cols:${cols}">${f.map(({ v, s }, i) => `<a class="pk-bay ${i < cols ? 'top' : 'bot'}" href="#/vehicles/${v.id}" title="${esc(v.name)} · ${esc(s.label)} · ${esc(s.note)}">${s.key === 'ontrip' ? `<span class="pk-gone">${icon('route')}</span>` : `<span class="pk-car" style="--c:${PK[s.key] || PK.free}">${icon(s.key === 'maint' ? 'wrench' : kindIcon(v.kind))}</span>`}<span class="pk-nm">${esc(v.name)}</span>${plateTag(v.plate)}</a>`).join('')}</div>
      <div class="pk-leg">
        <div><span><i style="background:${PK.free}"></i><em class="lf">ว่าง</em><em class="ls">ว่าง</em></span><b class="num">${n('free')}</b></div>
        <div><span><i style="background:#f97316"></i><em class="lf">กำลังเดินทาง</em><em class="ls">เดินทาง</em></span><b class="num">${n('ontrip')}</b></div>
        <div><span><i style="background:${PK.booked}"></i><em class="lf">มีคิววันนี้</em><em class="ls">มีคิว</em></span><b class="num">${n('booked')}</b></div>
        <div><span><i style="background:${PK.maint}"></i><em class="lf">ซ่อม / งดให้บริการ</em><em class="ls">ซ่อม/งด</em></span><b class="num">${n('maint') + n('off')}</b></div>
      </div></div>`;
  }

  // กระดานเที่ยวรถ (แบบ B · ป้ายสนามบิน)
  const BD = { returned: ['done', 'ARRIVED', 'กลับแล้ว'], closed: ['done', 'ARRIVED', 'กลับแล้ว'], ontrip: ['live', 'ON ROUTE', 'กำลังเดินทาง'], approved: ['ok', 'SCHEDULED', 'อนุมัติแล้ว'], pending: ['wait', 'PENDING', 'รอจัดรถ'], revise: ['wait', 'REVISE', 'รอแก้ไข'] };
  function board(list, { hrefOf = () => '', day = new Date() } = {}) {
    if (!list.length) return `<div class="bd bd-empty">${icon('calendar')}<p>ไม่มีรายการใช้รถในวันนี้</p></div>`;
    const flip = (d, k) => fmt.time(d).split('').map((ch, i) => ch === ':' ? '<em>:</em>' : `<span style="--d:${k * .06 + i * .04}s">${ch}</span>`).join('');
    const now = new Date(), isToday = UI.sameDay(day, now);
    let placed = !isToday;
    const rows = list.map((r, k) => {
      const st = BD[r.status] || BD.approved, as = r.assignments || [], href = hrefOf(r);
      const st0 = new Date(r.startAt), en = new Date(r.endAt);
      let pre = '';
      if (!placed && st0 > now) { placed = true; pre = `<tr class="bd-now"><td colspan="8"><span>ตอนนี้ ${fmt.time(now)} น.</span></td></tr>`; }
      return pre + `<tr class="bd-row ${st[0]} link" data-tcard="${r.id}" ${href ? `data-href="${href}"` : ''}>
        <td><span class="flip">${flip(st0, k)}</span>${UI.sameDay(st0, day) ? '' : `<small>${fmt.dayMonth(st0)}</small>`}</td>
        <td><span class="flip">${flip(en, k)}</span>${UI.sameDay(en, day) ? '' : `<small>${fmt.dayMonth(en)}</small>`}</td>
        <td class="dst"><b>${esc(S().destName(r))}</b><small>${esc((r.destinations[0] || {}).province || '')}${r.totalKm ? ` · ${fmt.num(r.totalKm, 0)} กม.` : ''}${S().tripTag(r) ? ` · ${S().tripTag(r).text}` : ''}</small><small>${esc(r.purpose)}</small><small class="bd-m">${tripMeta(r)}${as.length ? '' : ' · รอจัดรถ'}</small>${r.status === 'ontrip' ? `<span class="bd-prog"><i style="width:${Math.max(0, Math.min(1, (now - st0) / (en - st0))) * 100}%"></i></span>` : ''}</td>
        <td>${esc(r.requester.name)}</td>
        <td><span class="bd-ppl"><span>${icon('teacher')}${r.teachers}</span><span>${icon('student')}${r.students}</span>${+r.others ? `<span title="บุคคลอื่น">${icon('users')}${r.others}</span>` : ''}</span></td>
        <td>${as.length ? as.map(a => `<span class="bd-v">${esc(vName(a.vehicleId))}<small>${esc(vPlate(a.vehicleId))}</small></span>`).join('') : '<span class="bd-wait">รอแอดมินจัดรถ</span>'}</td>
        <td>${as.length ? as.map(a => `${esc(dName(a.driverId))}${dPhone(a.driverId) ? `<small><a href="tel:${esc(dPhone(a.driverId))}">${esc(dPhone(a.driverId))}</a></small>` : ''}`).join('') : '—'}</td>
        <td><span class="bd-st ${st[0]}"><span><i class="en">${st[1]}</i><em>${st[2]}</em></span></span></td></tr>`;
    }).join('') + (placed ? '' : `<tr class="bd-now"><td colspan="8"><span>ตอนนี้ ${fmt.time(now)} น.</span></td></tr>`);
    return `<div class="bd"><div class="bd-scroll"><table><thead><tr><th>ออก</th><th>กลับ</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอใช้รถ</th><th>ผู้เดินทาง</th><th>รถ</th><th>คนขับ</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  // การ์ดรายละเอียดเที่ยวรถ (มือถือ/แท็บเล็ต กดแถวในกระดาน/ปฏิทิน) — ข้อมูลครบแบบตารางในมุมมองคอม
  function tripModal(id, href = '') {
    const r = S().request(id); if (!r) return;
    const st = BD[r.status] || BD.approved, as = r.assignments || [];
    const s = new Date(r.startAt), e = new Date(r.endAt), same = UI.sameDay(s, e);
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
    UI.modal({
      title: esc(S().destName(r)), size: 'tc-modal',
      body: `<div class="tc">
        <div class="tc-time"><div><small>ออก</small><b class="num">${fmt.time(s)}</b><span>${fmt.dayMonth(s)}</span></div>${icon('chevR')}<div><small>กลับ</small><b class="num">${fmt.time(e)}</b><span>${same ? 'วันเดียวกัน' : fmt.dayMonth(e)}</span></div><span class="bd-st ${st[0]}"><span><em>${st[2]}</em></span></span></div>
        <dl class="kv tc-kv">
          ${row('ภารกิจ', esc(r.purpose || ''))}
          ${row('ปลายทาง', (r.destinations || []).map(d => `${esc(d.name)}${d.province ? ` <small>${esc(d.province)}</small>` : ''}`).join('<br>') + (r.totalKm ? ` <small>· ${fmt.num(r.totalKm, 0)} กม. (ไป-กลับ)</small>` : ''))}
          ${row('ผู้ขอใช้รถ', `${esc(r.requester.name)}${r.requester.dept ? ` <small>${esc(r.requester.dept)}</small>` : ''}`)}
          ${row('ผู้เดินทาง', `${S().passengers(r)} คน <small>· ครู ${+r.teachers || 0} · นักเรียน ${+r.students || 0}${+r.others ? ` · อื่น ${+r.others}` : ''}</small>`)}
          ${row('ลักษณะ', S().tripTag(r) ? esc(S().tripTag(r).text) : '')}
          ${row('จุดขึ้นรถ', esc(r.pickup || ''))}
        </dl>
        <div class="tc-veh">${as.length ? as.map(a => `<div class="tc-v">${icon('van')}<div><b>${esc(vName(a.vehicleId))} <small>${esc(vPlate(a.vehicleId))}</small></b><span>${icon('wheel')} ${esc(dName(a.driverId) || 'ยังไม่ระบุคนขับ')}${dPhone(a.driverId) ? ` · <a class="link" href="tel:${esc(dPhone(a.driverId))}">${esc(dPhone(a.driverId))}</a>` : ''}</span></div></div>`).join('') : '<p class="hint">รอแอดมินจัดรถ</p>'}</div>
      </div>`,
      actions: href ? [{ label: 'ปิด', value: null }, { label: 'ดูคำขอ', kind: 'btn-primary', icon: 'chevR', onClick: () => { location.hash = href; return true; } }] : [{ label: 'ปิด', value: null }]
    });
  }
  // ตัวเลือกวันที่ (‹ วันที่ › วันนี้) — base เช่น '#/?date=' หรือ '#/schedule?date='
  function dayPicker(day, base, { dark = false } = {}) {
    const d = new Date(day), prev = new Date(d), next = new Date(d);
    prev.setDate(d.getDate() - 1); next.setDate(d.getDate() + 1);
    const isToday = UI.sameDay(d, new Date());
    return `<div class="daypick ${dark ? 'dark' : ''}">
      <a class="dp-btn" href="${base}${fmt.localDate(prev)}" aria-label="วันก่อนหน้า">${icon('chevL')}</a>
      <label class="dp-date">${icon('calendar')}<input type="date" value="${fmt.localDate(d)}" data-daypick="${esc(base)}" aria-label="เลือกวันที่"></label>
      <a class="dp-btn" href="${base}${fmt.localDate(next)}" aria-label="วันถัดไป">${icon('chevR')}</a>
      <a class="dp-today ${isToday ? 'on' : ''}" href="${base}${fmt.localDate(new Date())}">วันนี้</a>
    </div>`;
  }

  // ลานจอดรถ + รายการสถานะรถ
  const VC = { free: '#10b981', booked: '#e0a526', maint: '#ef4444', off: '#9ca3af' };
  function lot(vehicles, { list = true, first = false } = {}) {
    const f = vehicles.map(v => ({ v, s: S().vehicleState(v) }));
    return `
      <div class="lot ${f.length > 12 ? 'r3' : ''}">${f.map(({ v, s }, i) => s.key === 'ontrip'
        ? `<div class="bay empty" title="${esc(v.name)} · ${esc(s.note)}"><span class="gone">${icon('route')}</span><span>${esc(v.name)}</span></div>`
        : `<div class="bay" title="${esc(v.name)} · ${esc(s.label)}"><span class="car" style="--vc:${VC[s.key]};--d:${first ? i * .06 : 0}s">${icon(kindIcon(v.kind))}</span><span>${esc(v.name)}</span></div>`).join('')}</div>
      ${list ? `<div class="lot-list">${f.map(({ v, s }) => `<a class="lot-row" href="#/vehicles/${v.id}">${icon(kindIcon(v.kind))}<div style="min-width:0"><b>${esc(v.name)}</b> <small style="display:inline">· ${v.seats} ที่นั่ง</small><small>${esc(s.note)}</small></div>${pill(s)}</a>`).join('')}</div>` : ''}`;
  }

  // ประวัติคำขอ
  const HIST = { memo: ['paperclip', 'แนบบันทึกข้อความตามหลัง'], memowaive: ['shield', 'ยกเว้นบันทึกข้อความ'], esign: ['edit', 'ลงนามอิเล็กทรอนิกส์'], signed: ['file', 'บันทึกข้อความฉบับลงนาม'], submit: ['send', 'ส่งคำขอ'], edit: ['edit', 'แก้ไขคำขอ'], resubmit: ['refresh', 'แก้ไขและส่งใหม่'], cancel: ['xCircle', 'ยกเลิกคำขอ'], approve: ['checkCircle', 'อนุมัติ'], reject: ['xCircle', 'ไม่อนุมัติ'], revise: ['undo', 'ส่งกลับให้แก้ไข'], reassign: ['refresh', 'ปรับรถ/คนขับ'], depart: ['navigation', 'ออกเดินทาง'], return: ['home', 'กลับถึงโรงเรียน'], undo: ['undo', 'ย้อนสถานะ'], close: ['check', 'ปิดงาน'], reopen: ['refresh', 'เปิดงานอีกครั้ง'], emergency: ['alert', 'บันทึกคำขอเร่งด่วน'], changereq: ['edit', 'ขอแก้ไขข้อมูล'], changeok: ['checkCircle', 'อนุมัติการแก้ไข'], changeno: ['xCircle', 'ไม่อนุมัติการแก้ไข'] };
  // สีตามประเภทความเคลื่อนไหว: อนุมัติ = เขียว · ส่งกลับแก้ไข = เหลือง · ไม่อนุมัติ/ยกเลิก = แดง · เดินทาง = ส้ม · กลับ/ปิดงาน = เทา · ส่งคำขอ = ม่วง
  const HTONE = { approve: 'ok', changeok: 'ok', memowaive: 'ok', signed: 'ok', esign: 'ok', revise: 'warn', changereq: 'warn', edit: 'warn', reject: 'bad', cancel: 'bad', changeno: 'bad', depart: 'live', return: 'done', close: 'done', submit: 'sub', resubmit: 'sub', emergency: 'bad', reassign: 'ok', memo: 'sub' };
  const history = r => `<div class="hist">${(r.history || []).slice().reverse().map(h => { const [ic, t] = HIST[h.action] || ['info', h.action]; return `<div class="hist-item ht-${HTONE[h.action] || 'n'}"><span class="hi">${icon(ic)}</span><div><b>${t}${h.action === 'depart' || h.action === 'return' ? ` · ${esc(h.note)}` : ''}</b><small>${esc(h.byName || h.by || '')} · ${fmt.dt(h.at)}</small>${h.note && !['depart', 'return'].includes(h.action) ? `<p>${esc(h.note)}</p>` : ''}</div></div>`; }).join('')}</div>`;

  // รถที่ได้รับมอบหมาย (สำหรับผู้ขอ/แอดมินดู)
  function assignList(r) {
    if (!(r.assignments || []).length) return '';
    return r.assignments.map((a, i) => {
      const v = S().vehicle(a.vehicleId) || {}, d = S().driver(a.driverId);
      const km = a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : null;
      return `<div class="assign">
        <div class="assign-top"><b>${icon(kindIcon(v.kind))}${esc(v.name || '—')} <small class="muted" style="font-weight:400">${esc(v.plate || '')} · ${v.seats || 0} ที่นั่ง</small></b><span class="pill tone-${a.status === 'ontrip' ? 'live pulse' : a.status === 'returned' ? 'done' : 'ok'}">${S().ASSIGN[a.status]}</span></div>
        <div class="row" style="gap:16px;font-size:.88rem">
          <span>${icon('wheel')} ${d ? esc(d.name) : 'ยังไม่ระบุคนขับ'}${d && d.phone ? ` · <a class="link" href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` : ''}</span>
          ${a.departedAt ? `<span class="muted">ออก ${fmt.when(a.departedAt)}</span>` : ''}${a.returnedAt ? `<span class="muted">กลับ ${fmt.when(a.returnedAt)}</span>` : ''}
          ${km != null ? `<span class="muted">${icon('gauge')} ${fmt.num(km)} กม. (ไมล์ ${fmt.num(a.odoStart)} → ${fmt.num(a.odoEnd)})</span>` : ''}
        </div>
        ${a.note ? `<div class="note">${icon('info')} ${esc(a.note)}</div>` : ''}
        ${a.paxSign ? (a.paxSign.has ? `<div class="ps-show">${icon('edit')}<span>ครูผู้ร่วมเดินทางลงชื่อยืนยันกลับถึง <b>${esc(a.paxSign.name)}</b> <small>${fmt.dt(a.paxSign.at)}</small></span>${a.paxSign.img ? `<img src="${a.paxSign.img}" alt="ลายเซ็นครู">` : ''}</div>` : `<div class="ps-show none">${icon('info')}<span>ไม่มีครูไปด้วย <small>${fmt.dt(a.paxSign.at)}</small></span></div>`) : ''}
      </div>`;
    }).join('');
  }
  const lockCard = (msg = 'ตารางรถ รายชื่อผู้ขอ และข้อมูลคนขับ แสดงเฉพาะบุคลากรของโรงเรียน') => `
    <div class="lock-card"><div><div class="lk">${icon('lock')}</div><h3>เข้าสู่ระบบเพื่อดูข้อมูล</h3><p>${msg}</p><a class="btn btn-primary btn-block" href="#/login">${icon('login')} เข้าสู่ระบบ</a></div></div>`;
  // ช่องเลือกไฟล์ (รูป/PDF) พร้อมรูปย่อ
  function filePicker(id, files = [], { label = 'แนบไฟล์', accept = 'image/*', pdf = false, multiple = true, capture = false, hint = '' } = {}) {
    return `<div class="fp" data-fp="${id}">
      <label class="dropzone" for="${id}">${icon('upload')}<b>${label}</b><small>${hint || (pdf ? 'รูปภาพหรือ PDF · ลากไฟล์มาวางได้' : 'รูปภาพ · ลากไฟล์มาวางได้')}</small>
        <input id="${id}" type="file" accept="${accept}${pdf ? ',application/pdf' : ''}" ${multiple ? 'multiple' : ''} ${capture ? 'capture="environment"' : ''} hidden></label>
      <div class="thumbs" data-thumbs>${files.map((f, i) => `<div class="thumb-wrap">${UI.thumb(f)}<button type="button" class="thumb-x" data-rm="${i}" aria-label="ลบไฟล์">${icon('x')}</button></div>`).join('')}</div>
    </div>`;
  }
  // ผูกการทำงานของช่องเลือกไฟล์ คืนค่า getter รายการไฟล์
  function bindFilePicker(root, id, initial = [], opts = {}) {
    const box = root.querySelector(`[data-fp="${id}"]`); if (!box) return () => initial;
    let files = initial.slice();
    const input = box.querySelector('input[type=file]'), zone = box.querySelector('.dropzone'), th = box.querySelector('[data-thumbs]');
    const draw = () => { th.innerHTML = files.map((f, i) => `<div class="thumb-wrap">${UI.thumb(f)}<button type="button" class="thumb-x" data-rm="${i}" aria-label="ลบไฟล์">${icon('x')}</button></div>`).join(''); UI.hydrate(th); };
    const add = async list => {
      try { const got = await UI.readFiles(list, { allowPdf: !!opts.pdf, maxW: opts.maxW || 1600 }); files = opts.multiple === false ? got.slice(0, 1) : files.concat(got).slice(0, opts.max || 10); draw(); }
      catch (e) { UI.toast(e.message, 'error'); }
    };
    input.addEventListener('change', () => { add(input.files); input.value = ''; });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); add(e.dataTransfer.files); });
    th.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(+b.dataset.rm, 1); draw(); } });
    UI.hydrate(th);
    return () => files;
  }
  // ───────── ดูเอกสารแนบควบคู่ในหน้าเดียวกัน (PDF ทุกหน้า / รูป) — ซูม · หมุน · ขยายเต็มจอ ─────────
  // ตัวแสดงถูกเก็บไว้ (DV) ตามคำขอ+ไฟล์ → หน้าวาดใหม่หลังกดบันทึก เอกสารไม่โหลดใหม่ ตำแหน่งที่อ่านอยู่ไม่หาย
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let pdfLibP = null;
  const loadPdfJs = () => pdfLibP || (pdfLibP = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfLibP = null; rej(new Error('โหลดตัวแสดง PDF ไม่สำเร็จ')); };
    document.head.appendChild(s);
  }));
  const pdfDocs = new Map();
  const DV = { key: '', el: null, api: null };
  // iPhone/iPad (Safari): เปิดไฟล์ในแท็บใหม่ไม่ได้ (หน้าว่าง / WebKitBlobResource) → ดูในหน้าเดิม + ปุ่มบันทึก/แชร์
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function saveFile(ref, { download = false, name: nm = '' } = {}) {
    try {
      const url = await S().fileUrl(ref), blob = await (await fetch(url)).blob();
      const ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg'), name = `${nm || 'ไฟล์แนบ'}.${ext}`;
      const file = new File([blob], name, { type: blob.type });
      if ((!download || isIOS()) && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { UI.toast('บันทึกไฟล์ไม่สำเร็จ: ' + e.message, 'error'); }
  }
  // ดูไฟล์แนบในหน้าต่างซ้อน (มือถือ/แท็บเล็ต และ iPhone ทุกขนาด) — PDF ทุกหน้า ซูม/หมุนได้
  function viewFiles(refs, i = 0) {
    UI.modal({ title: 'ดูไฟล์แนบ', size: 'lg fv-modal', body: docSlot(), onOpen: el => { const api = mountDocViewer(el, refs, 'fv:' + Date.now()); if (api && i) api.show(i); } });
  }
  // จอสัมผัส (มือถือ/แท็บเล็ต): ปุ่มในตัวแสดงเป็น "บันทึก / แชร์" แทน "เปิดแท็บใหม่"
  const useSave = () => isIOS() || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // มือถือ/แท็บเล็ตทุกแบบ (จอสัมผัส) — Android Chrome เปิด PDF ในแท็บใหม่ไม่ได้ (จะดาวน์โหลดแทน)
  const viewInPage = () => isIOS() || document.documentElement.classList.contains('lt900') || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const docSlot = () => '<div data-docview></div>';
  function mountDocViewer(root, refs, key) {
    const slot = root.querySelector('[data-docview]');
    if (!slot) return null;
    if (DV.key === key && DV.el) { const top = DV.scroll || 0; slot.replaceWith(DV.el); DV.el.querySelector('.dv-body').scrollTop = top; return DV.api; }
    const st = { i: 0, zoom: 1, rot: 0 }, ZS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3];
    const el = document.createElement('section');
    el.className = 'dv'; el.setAttribute('aria-label', 'บันทึกข้อความ');
    el.innerHTML = `<div class="dv-bar">
        <b class="dv-title">${icon('file')} บันทึกข้อความ</b>
        ${refs.length > 1 ? `<div class="dv-tabs">${refs.map((r, i) => `<button type="button" data-dvi="${i}" class="${i ? '' : 'on'}">${UI.isPdf(r) ? 'PDF' : 'รูป'} ${i + 1}</button>`).join('')}</div>` : ''}
        <div class="dv-tools">
          <button type="button" class="icon-btn sm" data-dv="out" title="ย่อ" aria-label="ย่อ">${icon('minus')}</button><span class="dv-z">100%</span><button type="button" class="icon-btn sm" data-dv="in" title="ขยาย" aria-label="ขยาย">${icon('plus')}</button>
          <button type="button" class="icon-btn sm" data-dv="fit" title="พอดีความกว้าง" aria-label="พอดีความกว้าง">${icon('fitWidth')}</button>
          <button type="button" class="icon-btn sm" data-dv="rot" title="หมุน 90°" aria-label="หมุน">${icon('rotate')}</button>
          <button type="button" class="icon-btn sm" data-dv="max" title="ขยายเต็มจอ (Esc ออก)" aria-label="ขยายเต็มจอ">${icon('maximize')}</button>
          <button type="button" class="icon-btn sm dv-dl" data-dv="dl" title="ดาวน์โหลดไฟล์" aria-label="ดาวน์โหลดไฟล์">${icon('download')}</button>
          ${useSave() ? `<button type="button" class="icon-btn sm" data-dv="tab" title="บันทึก / แชร์ไฟล์" aria-label="บันทึก / แชร์ไฟล์">${icon('download')}</button>` : `<button type="button" class="icon-btn sm" data-dv="tab" title="เปิดในแท็บใหม่" aria-label="เปิดในแท็บใหม่">${icon('arrowUR')}</button>`}
          <button type="button" class="icon-btn sm dv-close" data-dv="close" title="ปิด" aria-label="ปิด">${icon('x')}</button>
        </div></div>
      <div class="dv-body"><div class="dv-pages"><div class="dv-msg">กำลังโหลดเอกสาร…</div></div></div>
      <div class="dv-foot"></div>`;
    slot.replaceWith(el);
    const body = el.querySelector('.dv-body'), pages = el.querySelector('.dv-pages'), foot = el.querySelector('.dv-foot');
    body.addEventListener('scroll', () => { DV.scroll = body.scrollTop; }, { passive: true });
    let token = 0, lastW = 0;
    const draw = async () => {
      const my = ++token, ref = refs[st.i];
      el.querySelector('.dv-z').textContent = Math.round(st.zoom * 100) + '%';
      el.querySelectorAll('[data-dvi]').forEach(b => b.classList.toggle('on', +b.dataset.dvi === st.i));
      const avail = Math.max(200, body.clientWidth - 24); lastW = body.clientWidth;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      try {
        const url = await S().fileUrl(ref);
        if (my !== token) return;
        const frag = document.createDocumentFragment();
        if (UI.isPdf(ref)) {
          // เครื่องรุ่นเก่า/เน็ตช้า: ถ้า 15 วินาทียังไม่ขึ้น ให้มีปุ่มบันทึก/เปิดด้วยแอปอื่น (ไม่ค้างที่ "กำลังโหลด")
          setTimeout(() => { if (my === token && pages.querySelector('.dv-msg') && !pages.querySelector('canvas')) pages.querySelector('.dv-msg').innerHTML = `ยังแสดงเอกสารไม่ได้ (เครื่องหรือเน็ตอาจช้า)<br><button type="button" class="btn btn-ghost btn-sm" data-dv="tab" style="margin-top:10px">${useSave() ? `${icon('download')} บันทึก / แชร์ไฟล์` : `${icon('arrowUR')} เปิดในแท็บใหม่`}</button>`; }, 15000);
          const lib = await loadPdfJs();
          if (!pdfDocs.has(url)) pdfDocs.set(url, lib.getDocument({ url }).promise);
          const pdf = await pdfDocs.get(url);
          if (my !== token) return;
          pages.innerHTML = '';
          for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n);
            if (my !== token) return;
            const v1 = page.getViewport({ scale: 1, rotation: (page.rotate + st.rot) % 360 });
            const vp = page.getViewport({ scale: avail / v1.width * st.zoom * dpr, rotation: (page.rotate + st.rot) % 360 });
            const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
            c.style.width = Math.floor(vp.width / dpr) + 'px';
            pages.appendChild(c);
            await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          }
          foot.textContent = `${pdf.numPages} หน้า · เลื่อนลงเพื่อดูหน้าถัดไป`;
        } else {
          const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('เปิดรูปไม่สำเร็จ')); i.src = url; });
          if (my !== token) return;
          const side = st.rot % 180 !== 0, w0 = side ? im.naturalHeight : im.naturalWidth, h0 = side ? im.naturalWidth : im.naturalHeight;
          const k = avail / w0 * st.zoom, c = document.createElement('canvas');
          c.width = Math.floor(w0 * k * dpr); c.height = Math.floor(h0 * k * dpr); c.style.width = Math.floor(w0 * k) + 'px';
          const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(st.rot * Math.PI / 180);
          const dw = (side ? c.height : c.width), dh = (side ? c.width : c.height); g.drawImage(im, -dw / 2, -dh / 2, dw, dh);
          frag.appendChild(c); pages.innerHTML = ''; pages.appendChild(frag);
          foot.textContent = 'รูปภาพ';
        }
      } catch (e) {
        if (my === token) { pages.innerHTML = `<div class="dv-msg">${icon('alert')} ${UI.esc(e.message || 'เปิดเอกสารไม่สำเร็จ')}<br><button type="button" class="btn btn-ghost btn-sm" data-dv="tab" style="margin-top:10px">${useSave() ? `${icon('download')} บันทึก / แชร์ไฟล์` : `${icon('arrowUR')} เปิดในแท็บใหม่`}</button></div>`; foot.textContent = ''; }
      }
    };
    const setMax = on => { el.classList.toggle('dv-max', on); document.body.classList.toggle('dv-max-open', on); el.querySelector('[data-dv=max]').innerHTML = icon(on ? 'minimize' : 'maximize'); setTimeout(draw, 30); };
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-dvi]'); if (t) { st.i = +t.dataset.dvi; st.rot = 0; body.scrollTop = 0; draw(); return; }
      const b = e.target.closest('[data-dv]'); if (!b) return;
      const a = b.dataset.dv, zi = ZS.findIndex(z => z >= st.zoom - 1e-6);
      if (a === 'in') { st.zoom = ZS[Math.min(ZS.length - 1, zi + 1)]; draw(); }
      if (a === 'out') { st.zoom = ZS[Math.max(0, zi - 1)]; draw(); }
      if (a === 'fit') { st.zoom = 1; draw(); }
      if (a === 'rot') { st.rot = (st.rot + 90) % 360; draw(); }
      if (a === 'max') setMax(!el.classList.contains('dv-max'));
      if (a === 'tab') (useSave() ? saveFile : UI.openFile)(refs[st.i]);
      if (a === 'dl') { b.disabled = true; saveFile(refs[st.i], { download: true, name: /^VR-/.test(key) ? `บันทึกข้อความ ${key.split('|')[0]}${refs.length > 1 ? '-' + (st.i + 1) : ''}` : '' }).finally(() => { b.disabled = false; }); }
      if (a === 'close') { if (el.classList.contains('dv-max')) setMax(false); document.documentElement.classList.remove('dv-sheet'); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('dv-max')) setMax(false); });
    // ความกว้างช่องเปลี่ยน (หมุนจอ/ซ่อน-แสดง/เปลี่ยนมุมมอง) → วาดใหม่ให้พอดี
    if (window.ResizeObserver) new ResizeObserver(UI.debounce(() => { if (el.isConnected && Math.abs(body.clientWidth - lastW) > 8 && body.clientWidth > 0) draw(); }, 200)).observe(body);
    const api = { show: i => { if (i >= 0 && i < refs.length && i !== st.i) { st.i = i; st.rot = 0; body.scrollTop = 0; draw(); } }, redraw: draw };
    Object.assign(DV, { key, el, api, scroll: 0 });
    if (body.clientWidth > 0) draw(); else setTimeout(draw, 60);
    return api;
  }

  // ═════════ บันทึกข้อความขออนุญาตใช้รถ (หลักฐานของฝ่าย · พิมพ์ A4 ลงนาม 3 ฝ่าย) ═════════
  // ผู้ลงนาม: ตั้งค่า → "บันทึกข้อความอนุมัติใช้รถ" (ว่าง = ใช้ชื่อจากคณะทำงานในหน้าติดต่อเรา)
  function memoSettings() {
    const st = S().db.settings, m = st.memo || {}, cm = st.committee || [];
    const byPos = re => (cm.find(c => re.test(c.position || '') && c.name) || {}).name || '';
    const uh = S().user(m.headEmail) || {}, ud = S().user(m.depEmail) || {};
    return {
      to: m.to || 'รองผู้อำนวยการฝ่ายบริหารงานทั่วไป',
      noPrefix: m.noPrefix || '',
      headName: m.headName || uh.name || byPos(/หัวหน้างานยานพาหนะ/), headPos: m.headPos || 'หัวหน้างานยานพาหนะ',
      depName: m.depName || ud.name || byPos(/รองผู้อำนวยการ/), depPos: m.depPos || 'รองผู้อำนวยการฝ่ายบริหารงานทั่วไป'
    };
  }
  const canMemo = r => !r.medical && ['approved', 'ontrip', 'returned', 'closed'].includes(r.status);   // งานฉุกเฉินนำส่งผู้ป่วยไม่มีบันทึกข้อความ
  const MEMO_PAGE = { margin: '12mm 20mm 10mm 30mm', pageNo: false, fitWidth: '160mm', fitPage: 272 };   // ขอบตามหนังสือราชการ: ซ้าย 3 ซม. ขวา 2 ซม.
  // โหลดลายเซ็นที่ต้องใช้ล่วงหน้า (ผู้ขอที่ส่งคำขอเอง + ผู้ลงนามอิเล็กทรอนิกส์) — อ่านไม่ได้ (ไม่มีสิทธิ์) = แสดงเป็นข้อความแทน
  const sigEmails = list => list.flatMap(r => [r.createdBy === r.requester.email ? r.requester.email : '', ((r.esign || {}).head || {}).email, ((r.esign || {}).deputy || {}).email]).filter(Boolean);
  // ── เปิดนำทางใน Google Maps (มือถือเปิดแอป Google Maps ให้เอง) — มีพิกัดใช้พิกัด ไม่มีใช้ชื่อ+ที่อยู่ค้นหา ──
  const gq = d => d && d.lat != null && d.lng != null && d.lat !== '' && !isNaN(+d.lat) ? `${(+d.lat).toFixed(6)},${(+d.lng).toFixed(6)}` : [d && d.name, d && d.address, d && d.province].filter(Boolean).join(' ');
  // มีพิกัด → หมุดตรงจุดที่ครูปักเป๊ะ (/maps/place/lat,lng ไม่ให้ Google เลื่อนไปจับสถานที่ใกล้เคียง) · ไม่มีพิกัด → ค้นจากชื่อ+ที่อยู่
  const hasLL = d => d && d.lat != null && d.lng != null && d.lat !== '' && !isNaN(+d.lat) && !isNaN(+d.lng);
  const gmapPlace = d => hasLL(d) ? `https://www.google.com/maps/place/${(+d.lat).toFixed(6)},${(+d.lng).toFixed(6)}/@${(+d.lat).toFixed(6)},${(+d.lng).toFixed(6)},17z` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gq(d))}`;
  function gmapRoute(dests) {
    const ds = (dests || []).filter(d => gq(d)); if (!ds.length) return '';
    const last = ds[ds.length - 1], mid = ds.slice(0, -1);
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(gq(last))}${mid.length ? `&waypoints=${encodeURIComponent(mid.map(gq).join('|'))}` : ''}`;
  }
  // ดาวน์โหลดบันทึกข้อความเป็นไฟล์ PDF (ไม่ผ่านหน้าพิมพ์)
  async function downloadMemo(r) { await S().loadSignatures(sigEmails([r])); return UI.savePdf(memoHTML(r), { title: `บันทึกข้อความขอใช้รถ ${r.id}`, ...MEMO_PAGE }); }
  async function printMemo(r) { await S().loadSignatures(sigEmails([r])); UI.printDoc(memoHTML(r), { title: `บันทึกข้อความขอใช้รถ ${r.id}`, ...MEMO_PAGE }); }
  // พิมพ์หลายฉบับต่อกัน (1 คำขอ = 1 หน้า)
  async function printMemos(list) {
    if (!list.length) return;
    await S().loadSignatures(sigEmails(list));
    UI.printDoc(list.map(memoHTML).join(''), { title: list.length === 1 ? `บันทึกข้อความขอใช้รถ ${list[0].id}` : `บันทึกข้อความขอใช้รถ ${list.length} ฉบับ ${list[0].id} ถึง ${list[list.length - 1].id}`, ...MEMO_PAGE });
  }
  // ── พิมพ์รวมเป็นไฟล์เดียว: เลือกรูปแบบ (บันทึกข้อความมีครุฑ / หัวกระดาษโรงเรียน / ตารางสรุป) + หน้าปก + หน้าคั่นตามหมวด ──
  const PDLG = 'vb-print-dlg';
  async function printDialog(list, { title = 'รายงานการขอใช้รถส่วนกลาง', sub = '' } = {}) {
    if (!list.length) return;
    let sv = {}; try { sv = JSON.parse(localStorage.getItem(PDLG) || '{}'); } catch (e) { /* ค่าเริ่มต้น */ }
    const one = list.length === 1;
    const def = one ? (sv.fmt === 'letter' ? 'letter' : 'memo') : (['memo', 'letter', 'report'].includes(sv.fmt) ? sv.fmt : 'report');
    const fmtOpt = (v, ic, t, d) => `<label class="pf-opt"><input type="radio" name="fmt" value="${v}" ${def === v ? 'checked' : ''}><span>${icon(ic)}<b>${t}</b><small>${d}</small></span></label>`;
    const opt = await UI.modal({
      title: `พิมพ์รวมเป็นไฟล์เดียว<small class="pf-sub">${list.length} รายการ${sub ? ' · ' + esc(sub) : ''}</small>`, size: 'lg',
      body: `<form id="pf" class="stack" style="gap:14px">
        <div class="label">รูปแบบเอกสาร</div>
        <div class="pf-opts">${one ? '' : fmtOpt('report', 'chart', 'รายงานสรุป', 'หน้าปกสรุปตามสถานะ/หมวด/รถ + ผู้รายงาน แล้วตามด้วยรายการแยกหมวด')}${fmtOpt('memo', 'file', 'บันทึกข้อความ', 'มีตราครุฑ ตามแบบฟอร์มราชการ รายการละ 1 หน้า')}${fmtOpt('letter', 'printer', 'หัวกระดาษโรงเรียน', 'ไม่มีตราครุฑ ใช้ตราโรงเรียน รายการละ 1 หน้า')}</div>
        ${one ? '' : `<label class="check pf-nr"><input type="checkbox" name="sec" ${sv.sec === true ? 'checked' : ''}> แยกตามหมวดงาน <span class="hint">(ขึ้นหน้าใหม่ทุกหมวด · ไม่เลือก = รวมทุกรายการเรียงตามวันที่)</span></label>
        <label class="check"><input type="checkbox" name="cover" ${sv.cover !== false ? 'checked' : ''}> มีหน้าปกสรุปจำนวนตามสถานะและหมวดงาน</label>`}
        <div class="field"><label>หัวข้อเอกสาร ${one ? '<span class="hint">(ใช้เป็นชื่อไฟล์ PDF)</span>' : ''}</label><input class="input" name="title" value="${esc(sv.title || title)}"></div>
      </form>`,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'เปิดหน้าพิมพ์', kind: 'btn-primary', icon: 'printer', onClick: el => UI.formData(el.querySelector('#pf')) }]
    });
    if (!opt) return;
    try { localStorage.setItem(PDLG, JSON.stringify({ fmt: opt.fmt, sec: !!opt.sec, cover: !!opt.cover, title: opt.title })); } catch (e) { /* ไม่บันทึกก็ได้ */ }
    const docTitle = String(opt.title || title).trim() || title;
    const rs = list.slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
    if (opt.fmt === 'report') {
      const range = `${thDate(rs[0].startAt)} – ${thDate(rs[rs.length - 1].startAt)}`;
      return UI.printDoc(requestReport(rs, docTitle, sub, range, { sec: !!opt.sec, cover: !!opt.cover }), { title: `${docTitle} ${rs.length} รายการ`, fitWidth: '186mm', fitPage: 264, footLeft: `${docTitle}${sub ? ' · ' + sub : ''} · ${rs.length} รายการ` });
    }
    const memoOk = opt.fmt !== 'table';
    const items = memoOk ? rs.filter(r => !['rejected', 'cancelled'].includes(r.status)) : rs;
    if (!items.length) return UI.toast('ไม่มีรายการที่พิมพ์เป็นบันทึกข้อความได้ (ยกเลิก/ไม่อนุมัติทั้งหมด)', 'error');
    await S().loadSignatures(sigEmails(items));
    const groups = opt.sec && !one ? [...items.reduce((m, r) => { const k = S().catName(r) || 'ไม่ระบุหมวด'; (m.get(k) || m.set(k, []).get(k)).push(r); return m; }, new Map())] : [['', items]];
    const range = `${UI.fmt.date(items[0].startAt)} – ${UI.fmt.date(items[items.length - 1].startAt)}`;
    const body = (grp) => opt.fmt === 'table' ? summaryTable(grp) : grp.map(r => memoHTML(r, { krut: opt.fmt === 'memo' })).join('');
    const html = (opt.cover && !one ? coverPage(items, docTitle, range) : '')
      + groups.map(([k, grp]) => (k ? `<section class="pd-divider"><small>ส่วนที่ ${groups.findIndex(g => g[0] === k) + 1}</small><h1>${esc(k)}</h1><p>${grp.length} รายการ · ${esc(range)}</p></section>` : '') + body(grp)).join('');
    UI.printDoc(html, { title: one ? `${docTitle} ${items[0].id}` : `${docTitle} ${items.length} รายการ`, ...(opt.fmt === 'table' ? { landscape: true } : MEMO_PAGE) });
  }
  const thDate = d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  // ── รายงานแบบเอกสาร (ตามตัวอย่างรายงานแจ้งซ่อม): หน้าปก ตราโรงเรียน + ตารางสรุป + ผู้รายงาน · หน้าถัดไปมีหัวรายงาน ──
  function reportCover({ title, sub = '', range = '', body = '' }) {
    const st = S().db.settings, me = S().me || {}, u = S().user(me.email) || me;
    return `<section class="rp-cover">
      <img class="rp-logo" src="images/logo.png" alt="">
      <h2 class="rp-school">${esc(st.schoolName || '')}</h2>
      <p class="rp-unit">${esc(st.unit || 'งานยานพาหนะ')} · ${esc(st.division || '')}</p>
      <h1 class="rp-title">${esc(title)}</h1>
      ${sub ? `<p class="rp-sub">${esc(sub)}</p>` : ''}${range ? `<p class="rp-range">${esc(range)}</p>` : ''}
      <div class="rp-body">${body}</div>
      <div class="rp-sign"><p>ลงชื่อ <span class="rp-dots"></span> ผู้รายงาน</p><p>( ${esc(u.name || '')} )</p>${u.position ? `<p>${esc(u.position)}</p>` : ''}<p>วันที่ ${thDate(new Date())}</p></div>
    </section>`;
  }
  const reportHead = (title, sub = '') => { const st = S().db.settings; return `<div class="rp-head"><img src="images/logo.png" alt=""><div><b>${esc(title)}</b><span>${esc(st.unit || 'งานยานพาหนะ')} ${esc(st.division || '')} · ${esc(st.schoolName || '')}</span>${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>`; };
  const RP_TONE = { pending: '#7c3aed', revise: '#a16207', approved: '#047857', ontrip: '#c2410c', returned: '#64748b', closed: '#64748b', rejected: '#b91c1c', cancelled: '#b91c1c' };
  // รายงานสรุปคำขอใช้รถ: หน้าปกสรุป + รายการ (รวมเรียงตามวันที่ หรือ แยกหมวดงานหมวดละหน้า)
  function requestReport(items, docTitle, sub, range, { sec = false, cover = true } = {}) {
    const s = S(), cnt = f => items.filter(f).length;
    const byStatus = Object.entries(s.STATUS).map(([k, v]) => [v.label, cnt(r => r.status === k)]).filter(x => x[1]);
    const catOf = r => s.catName(r) || 'ไม่ระบุหมวด';
    const groups = [...items.reduce((m, r) => { const k = catOf(r); (m.get(k) || m.set(k, []).get(k)).push(r); return m; }, new Map())];
    const ok = items.filter(r => !['rejected', 'cancelled'].includes(r.status));
    const vrows = s.db.vehicles.map(v => { const rs = ok.filter(r => (r.assignments || []).some(a => a.vehicleId === v.id)); const km = rs.reduce((t, r) => { const a = r.assignments.find(x => x.vehicleId === v.id); return t + (a.odoStart != null && a.odoEnd != null ? a.odoEnd - a.odoStart : (+r.totalKm || 0)); }, 0); return { v, n: rs.length, km, pax: rs.reduce((t, r) => t + s.passengers(r), 0) }; }).filter(x => x.n);
    const tb = (h, rows, foot) => `<table class="pd-tbl rp-t"><thead><tr>${h.map((x, i) => `<th class="${i ? 'r' : ''}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
    const coverHtml = cover ? reportCover({ title: docTitle, sub: `${sub ? sub + ' · ' : ''}${items.length} รายการ`, range: `ช่วงวันที่เดินทาง ${range}`, body: `
      <div class="rp-grid">${tb(['สถานะ', 'จำนวน'], byStatus.map(([l, n]) => [esc(l), n]), ['รวม', items.length])}${tb(['หมวดงาน', 'จำนวน'], groups.map(([k, g]) => [esc(k), g.length]), ['รวม', items.length])}</div>
      ${vrows.length ? tb(['รถ', 'เที่ยว', 'ระยะทาง (กม.)', 'ผู้เดินทาง (คน)'], vrows.map(x => [`${esc(x.v.name)}${x.v.plate ? ` <small>${esc(x.v.plate)}</small>` : ''}`, x.n, UI.fmt.num(x.km), x.pax]), ['รวม', vrows.reduce((t, x) => t + x.n, 0), UI.fmt.num(vrows.reduce((t, x) => t + x.km, 0)), vrows.reduce((t, x) => t + x.pax, 0)]) : ''}` }) : '';
    // ตารางรายการ: คอลัมน์แยกชัด (ตามรูปแบบรายงานแจ้งซ่อม) · บรรทัดรองตัวเล็กใต้รายการหลัก
    const tCell = r => { const a = new Date(r.startAt), b = new Date(r.endAt); return `${UI.fmt.time(a)}–${UI.sameDay(a, b) ? UI.fmt.time(b) : UI.fmt.dayMonth(b) + ' ' + UI.fmt.time(b)} น.`; };
    const list = rs => { let no = 0; return `<table class="pd-tbl rp-list"><colgroup><col style="width:4%"><col style="width:11.5%"><col style="width:22%"><col style="width:17.5%"><col style="width:5%"><col style="width:12%"><col style="width:16%"><col style="width:12%"></colgroup>
      <thead><tr><th class="c">ที่</th><th>วันที่</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอใช้รถ</th><th class="c">คน</th><th>รถ</th><th>คนขับ</th><th class="c">สถานะ</th></tr></thead>
      <tbody>${rs.map(r => { const st = s.STATUS[r.status] || {}, as = r.assignments || []; return `<tr><td class="c">${++no}</td>
        <td><span class="one" data-fit>${UI.fmt.date(r.startAt)}</span><small class="one" data-fit>${tCell(r)}</small></td>
        <td>${esc(s.destName(r))}<small>${esc(r.purpose || '')}${r.totalKm ? ` · ${UI.fmt.num(r.totalKm, 0)} กม.` : ''}${sec ? '' : ` · ${esc(catOf(r))}`}</small></td>
        <td><span class="one" data-fit>${esc(r.requester.name)}</span><small>${esc(r.requester.dept || '')}</small></td>
        <td class="c">${s.passengers(r)}</td>
        <td>${as.map(a => `<span class="one" data-fit>${esc(vName(a.vehicleId))}</span><small class="one" data-fit>${esc(vPlate(a.vehicleId) || '')}</small>`).join('') || '-'}</td>
        <td>${as.map(a => `<span class="one" data-fit>${esc(dName(a.driverId) || '-')}</span>`).join('') || '-'}</td>
        <td class="c"><span class="rp-st" style="--c:${RP_TONE[r.status] || '#555'}">${esc(st.label || r.status)}</span></td></tr>`; }).join('')}</tbody></table>`; };
    const sorted = items.slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
    const head = extra => reportHead(docTitle, `${sub ? sub + ' · ' : ''}${extra} · ${range}`);
    // แยกตามหมวดงาน: หมวดละหน้า (ขึ้นหน้าใหม่ทุกหมวด) · ไม่แยก: รวมทุกรายการเรียงตามวันที่
    const pages = sec
      ? groups.map(([k, g]) => `<section class="rp-page">${head(`หมวด${k} · ${g.length} รายการ`)}${list(g.slice().sort((a, b) => a.startAt.localeCompare(b.startAt)))}</section>`).join('')
      : `<section class="rp-page">${head(`${items.length} รายการ เรียงตามวันที่`)}${list(sorted)}</section>`;
    return coverHtml + pages;
  }
  function coverPage(items, docTitle, range) {
    const st = S().db.settings, cnt = f => items.filter(f).length;
    const byStatus = Object.entries(S().STATUS).map(([k, v]) => [v.label, cnt(r => r.status === k)]).filter(x => x[1]);
    const byCat = [...items.reduce((m, r) => { const k = S().catName(r) || 'ไม่ระบุหมวด'; m.set(k, (m.get(k) || 0) + 1); return m; }, new Map())];
    return `<section class="pd-cover">
      <img src="images/logo.png" alt=""><h1>${esc(docTitle)}</h1><p>${esc(st.unit || 'งานยานพาหนะ')} ${esc(st.division || '')}<br>${esc(st.schoolName || '')}</p>
      <p class="pd-range">${esc(range)} · ทั้งหมด ${items.length} รายการ</p>
      <div class="pd-cover-grid"><table class="pd-tbl"><thead><tr><th>สถานะ</th><th class="r">จำนวน</th></tr></thead><tbody>${byStatus.map(([l, n]) => `<tr><td>${esc(l)}</td><td class="r">${n}</td></tr>`).join('')}</tbody></table>
        <table class="pd-tbl"><thead><tr><th>หมวดงาน</th><th class="r">จำนวน</th></tr></thead><tbody>${byCat.map(([l, n]) => `<tr><td>${esc(l)}</td><td class="r">${n}</td></tr>`).join('')}</tbody></table></div>
      <p class="pd-foot">พิมพ์จากระบบยานพาหนะ เมื่อ ${UI.fmt.dt(new Date().toISOString())}</p></section>`;
  }
  function summaryTable(rs) {
    return `<table class="pd-tbl pd-sum"><thead><tr><th class="c">ที่</th><th>เลขที่</th><th>วันเวลา</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอใช้รถ</th><th class="r">คน</th><th>รถ / คนขับ</th><th>สถานะ</th></tr></thead>
      <tbody>${rs.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="nw">${r.id}</td><td class="nw">${UI.fmt.date(r.startAt)}<small>${UI.fmt.time(r.startAt)}–${UI.fmt.when(r.endAt)}</small></td><td>${esc(S().destName(r))}<small>${esc(r.purpose || '')}</small></td><td>${esc(r.requester.name)}<small>${esc(r.requester.dept || '')}</small></td><td class="r">${S().passengers(r)}</td><td>${(r.assignments || []).map(a => `${esc(vName(a.vehicleId))}<small>${esc(dName(a.driverId))}</small>`).join('') || '-'}</td><td class="nw">${esc(S().STATUS[r.status].label)}</td></tr>`).join('')}</tbody></table>`;
  }
  // บันทึกข้อความขออนุญาตใช้รถ — รูปแบบเดียวกับบันทึกแจ้งซ่อมของฝ่าย (ไม่มีกรอบ · ช่องพิจารณา 2 คอลัมน์ · อ้างอิงระบบมุมขวาบน)
  function memoHTML(r, { krut = true } = {}) {
    const s = S(), st = s.db.settings, M = memoSettings();
    const dTh = d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const tm = d => `${UI.fmt.time(d).replace(':', '.')} น.`;
    const u = s.user(r.requester.email) || (s.me && s.me.email === r.requester.email ? s.me : {}) || {};
    const pos = u.position || '';
    const t = s.tripType(r), sameDay = s.sameDay(r.startAt, r.endAt);
    const when = sameDay ? `วันที่ ${dTh(r.startAt)} เวลา ${UI.fmt.time(r.startAt).replace(':', '.')} – ${tm(r.endAt)}`
      : `วันที่ ${dTh(r.startAt)} เวลา ${tm(r.startAt)} ถึงวันที่ ${dTh(r.endAt)} เวลา ${tm(r.endAt)}`;
    const pax = s.passengers(r);
    const paxParts = [r.teachers ? `ครู/บุคลากร ${r.teachers} คน` : '', r.students ? `นักเรียน ${r.students} คน` : '', r.others ? `บุคคลอื่น ${r.others} คน` : ''].filter(Boolean).join(' ');
    const names = String(r.passengerNames || '').trim(), hasNames = names && !/^[-–—.\s]+$/.test(names);
    const dests = (r.destinations || []).map(d => d.name + (d.province ? ` จังหวัด${d.province.replace(/^จ(\.|ังหวัด)\s*/, '')}` : '')).join(', ') || s.destName(r);
    const asg = r.assignments || [];
    const E = r.esign || {};
    const deny = !!(E.deputy && E.deputy.decision === 'deny') || r.status === 'rejected';
    const apv = (r.history || []).filter(h => h.action === 'approve').pop();
    const okd = !deny && ((E.deputy && E.deputy.decision !== 'deny') || ['approved', 'ontrip', 'returned', 'closed'].includes(r.status));
    const apvAt = apv ? apv.at : (okd ? (r.decision && r.decision.at) || '' : '');
    // เลขที่หนังสือ: VR-2569-0009 → 9/2569
    const m = /(\d{4})-(\d+)$/.exec(r.id || ''), no = m ? `${+m[2]}/${m[1]}` : r.id;
    const sig = (img, name, title) => `<div class="m2-sig"><p class="m2-sl">ลงชื่อ <span class="m2-sp">${img ? `<img src="${img}" alt="">` : ''}</span> ${title.role || ''}</p><p>(${name ? esc(name) : '<span class="m2-blank"></span>'})</p>${title.pos ? `<p data-fit>${esc(title.pos)}</p>` : ''}</div>`;
    const reqImg = r.createdBy === r.requester.email ? s.sigOf(r.requester.email) : '';
    const headImg = E.head ? s.sigOf(E.head.email) : '', depImg = E.deputy ? s.sigOf(E.deputy.email) : '';
    const cb = on => `<span class="cb ${on ? 'on' : ''}"></span>`;
    const line = (k, v) => `<div class="m2-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    return `<div class="memo-doc m2">
      <p class="m2-ref">อ้างอิงระบบ ${esc(r.id)}</p>
      ${krut ? `<div class="mm-top"><img class="mm-krut" src="images/krut.png" alt="" onerror="this.onerror=null;this.src='images/logo.png'"><h1>บันทึกข้อความ</h1></div>`
        : `<div class="mm-lh"><img src="images/logo.png" alt=""><div><b>${esc(st.schoolName || '')}</b><span>${esc(st.division || '')} · ${esc(st.unit || 'งานยานพาหนะ')}</span></div></div><h1 class="mm-lh-t">บันทึกข้อความ</h1>`}
      <div class="mm-line"><b>ส่วนราชการ</b><span data-fit>${esc(st.schoolName || '')}</span></div>
      <div class="mm-row"><div class="mm-line"><b>ที่</b><span>${esc(M.noPrefix ? M.noPrefix + ' ' : '')}${esc(no)}</span></div><div class="mm-line"><b>วันที่</b><span>${dTh(apvAt || r.createdAt)}</span></div></div>
      <div class="mm-line"><b>เรื่อง</b><span>ขออนุญาตใช้รถยนต์ส่วนกลางของโรงเรียน</span></div>
      <hr class="m2-hr">
      <p class="mm-to"><b>เรียน</b> ${esc(M.to)}</p>
      <p class="mm-p">ด้วยข้าพเจ้า ${esc(r.requester.name)}${pos ? ` ตำแหน่ง ${esc(pos)}` : ''}${r.requester.dept ? ` ${esc(r.requester.dept)}` : ''}${(r.contactPhone || r.requester.phone) ? ` เบอร์ติดต่อ ${esc(r.contactPhone || r.requester.phone)}` : ''} มีความประสงค์ขออนุญาตใช้รถยนต์ส่วนกลางของโรงเรียน เพื่อ${esc(r.purpose || '')}${r.project ? ` (${esc(r.project)})` : ''} โดยมีรายละเอียดดังนี้</p>
      <div class="m2-list">
        ${line('สถานที่ไปราชการ', esc(dests))}
        ${line('กำหนดเดินทาง', `${when} (${esc(s.tripLabel(r))}${t === 'overnight' && r.lodging ? ` ที่พัก ${esc(r.lodging)}` : ''})`)}
        ${line('ผู้เดินทาง', `รวม ${pax} คน${paxParts ? ` (${paxParts})` : ''}${hasNames ? ` ได้แก่ ${esc(names)}` : ''}`)}
        ${line('จุดขึ้นรถ', esc(r.pickup || '-'))}
      </div>
      <p class="mm-p">จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต</p>
      <div class="m2-req">${sig(reqImg, r.requester.name, { role: 'ผู้ขอใช้รถ', pos: r.requester.dept || pos })}</div>
      <div class="m2-cols">
        <div class="m2-col"><p class="m2-h" data-fit>หัวหน้างานยานพาหนะ</p>
          <p>${cb(okd)} เห็นควรพิจารณาอนุญาต${asg.length ? '' : ''}</p>
          ${asg.length ? `<p class="m2-asg">จัด${asg.map(a => `${esc(vName(a.vehicleId))}${vPlate(a.vehicleId) ? ` ทะเบียน ${esc(vPlate(a.vehicleId))}` : ''} พนักงานขับรถ ${esc(dName(a.driverId) || '-')}`).join(' และ ')}</p>` : ''}
          <p>${cb(deny)} ไม่อนุญาต เนื่องจาก ${deny && r.decision && r.decision.note ? esc(r.decision.note) : ''}</p>
          ${sig(headImg, E.head ? E.head.name : M.headName, { pos: M.headPos })}</div>
        <div class="m2-col"><p class="m2-h" data-fit>${esc(M.depPos)}</p>
          <p>พิจารณา/สั่งการ</p>
          <p class="m2-cmd">${deny ? 'ไม่อนุญาต' : okd ? 'อนุญาต' : ''}${E.deputy && E.deputy.note ? ` ${esc(E.deputy.note)}` : ''}</p>
          ${sig(depImg, E.deputy ? E.deputy.name : M.depName, { pos: M.depPos })}</div>
      </div>
    </div>`;
  }

  // ───── รายการค่าใช้จ่าย 1 รายการ (ใช้ทั้งหน้าคนขับและแอดมิน) — หัวเรื่อง+ยอดเงินบรรทัดบน · รายละเอียด/รูปบิลด้านล่าง · ปุ่มแก้/ลบท้าย ─────
  const EXP_IC = { fuel: 'fuel', toll: 'route', parking: 'pin', other: 'coins' };
  function expItem(e, { edit = false, showVeh = true } = {}) {
    const title = e.type === 'other' ? (e.item || 'ค่าใช้จ่ายอื่น') : S().EXPENSE[e.type];
    const sub = e.type === 'other' ? e.station : (e.station || [e.brand, e.branch].filter(Boolean).join(' '));
    const meta = [fmt.date(e.date), showVeh && esc(vName(e.vehicleId)), e.liters && `${fmt.num(e.liters, 2)} ลิตร × ${fmt.num(e.pricePerL, 2)} บาท`, e.odo && `ไมล์ ${fmt.num(e.odo)}`, S().PAY[e.pay], e.note && esc(e.note)].filter(Boolean);
    return `<div class="xp t-${e.type}">
      <span class="xp-ic">${icon(EXP_IC[e.type] || 'coins')}</span>
      <div class="xp-body">
        <div class="xp-top"><b>${esc(title)}${sub ? ` <span>· ${esc(sub)}</span>` : ''}</b><span class="xp-amt">${fmt.money(e.amount)} ฿</span></div>
        <div class="xp-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>
        ${(e.photos || []).length ? `<div class="thumbs xp-pics">${e.photos.map(p => UI.thumb(p, 'sm')).join('')}</div>` : ''}
        <div class="xp-foot"><small>บันทึกโดย ${esc(e.byName || e.by || '-')}${e.editedAt ? ` · แก้ไขล่าสุด ${fmt.dt(e.editedAt)}` : ''}</small>
          ${edit ? `<span class="xp-act"><button type="button" class="btn btn-ghost btn-xs" data-xedit="${e.id}">${icon('edit')} แก้ไข</button><button type="button" class="btn btn-ghost btn-xs xp-del" data-xdel="${e.id}">${icon('trash')} ลบ</button></span>` : ''}</div>
      </div></div>`;
  }
  return { expItem, teacherShort, tripMeta, hasLL, tripModal, gmapPlace, gmapRoute, thDate, downloadMemo, reportCover, reportHead, viewFiles, viewInPage, saveFile, atom, statusPill, stars, reqCard, pass, ticket, bindRail, gantt, parkBoard, board, dayPicker, firstName, lot, history, assignList, lockCard, filePicker, bindFilePicker, vName, vPlate, dName, dPhone, docSlot, mountDocViewer, printMemo, printMemos, printDialog, canMemo, memoSettings, memoHTML, sigEmails };
})();

const App = (() => {
  'use strict';
  const { $, esc } = UI;
  const app = () => $('#app');
  let current = { path: '', view: null };
  let rerenderTimer = 0, pendingRender = false;
  // ข้อมูลเปลี่ยนระหว่างเปิดป๊อปอัป → วาดหน้าใหม่เมื่อป๊อปอัปปิด
  document.addEventListener('ui:modal-closed', () => { if (!pendingRender) return; pendingRender = false; if (current.view && current.view.live !== false) render(); });
  const ratingShown = new Set();

  // ───────── ตารางเส้นทาง ─────────
  // auth: any | in | admin | back | driver
  const ROUTES = [
    ['/', 'home', 'any'], ['/login', 'login', 'out'], ['/profile', 'profile', 'in'], ['/password', 'password', 'in'],
    ['/request', 'requestForm', 'in'], ['/request/:id', 'requestForm', 'in'],
    ['/schedule', 'schedule', 'in'], ['/vehicles', 'vehicles', 'in'], ['/vehicles/:id', 'vehicleDetail', 'in'],
    ['/my', 'my', 'in'], ['/my/:id', 'myDetail', 'in'], ['/rate/:id/:idx', 'rate', 'in'], ['/contact', 'contact', 'any'], ['/help', 'help', 'any'],
    ['/driver', 'driverHome', 'driver'], ['/driver/:id/:idx', 'driverJob', 'driver'],
    ['/admin', 'adminHome', 'back'], ['/admin/requests', 'adminRequests', 'admin'], ['/admin/requests/:id', 'adminRequest', 'admin'], ['/admin/esign', 'adminEsign', 'back'],
    ['/admin/new', 'adminNew', 'admin'], ['/admin/roster', 'adminRoster', 'admin'], ['/admin/vehicles', 'adminVehicles', 'admin'], ['/admin/vehicles/:id', 'adminVehicle', 'admin'],
    ['/admin/drivers', 'adminDrivers', 'admin'], ['/admin/users', 'adminUsers', 'admin'], ['/admin/expenses', 'adminExpenses', 'admin'],
    ['/admin/ratings', 'adminRatings', 'back'], ['/admin/stats', 'adminStats', 'back'], ['/admin/settings', 'adminSettings', 'admin'], ['/admin/support', 'adminSupport', 'admin']
  ];
  function match(path) {
    for (const [pat, page, auth] of ROUTES) {
      const a = pat.split('/'), b = path.split('/');
      if (a.length !== b.length) continue;
      const params = {};
      if (a.every((s, i) => s.startsWith(':') ? (params[s.slice(1)] = decodeURIComponent(b[i]), true) : s === b[i])) return { page, auth, params };
    }
    return null;
  }
  const parseHash = () => { const h = location.hash.replace(/^#/, '') || '/'; const [p, q] = h.split('?'); return { path: p || '/', query: Object.fromEntries(new URLSearchParams(q || '')) }; };
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  // ───────── แถบเมนู ─────────
  function navHTML(path) {
    const me = Store.me, inn = Store.authState === 'in';
    const act = p => (p === '/' ? path === '/' : path.startsWith(p)) ? 'active' : '';
    const back = Store.isBack(me), drv = Store.isDriver(me), onlyDriver = drv && !Store.has(me, 'teacher') && !back;
    // แสดงเฉพาะรายการใหม่ + งานที่ยังต้องทำ (อ่านแล้ว = หายไป)
    const notifs = inn ? Store.notifications().filter(n => n.unread || n.task) : [];
    const unread = notifs.filter(n => n.unread).length;
    const pendingAdmin = Store.isAdmin(me) ? Store.db.requests.filter(r => r.status === 'pending').length : 0;
    return `
    <header class="nav ${path === '/' ? '' : 'solid'}" id="nav">
      <div class="nav-inner">
        <a class="brand" href="#/" aria-label="หน้าแรก">${C.atom()}<span><strong>ระบบยานพาหนะ</strong><small>PCSHS PATHUM THANI</small></span></a>
        <nav class="menu" id="menu" aria-label="เมนูหลัก">
          <a class="menu-link ${act('/') }" href="#/">หน้าแรก</a>
          ${onlyDriver ? '' : `<a class="menu-link ${act('/request')}" href="#/request">ขอใช้รถ</a>`}
          <div class="dd" data-open="false">
            <button class="menu-link ${act('/schedule')}" data-dd aria-expanded="false">ตารางรถ ${icon('chev', 'chev')}</button>
            <div class="dd-panel">
              <a href="#/schedule"><span class="dd-ic">${icon('activity')}</span><span><strong>สถานะรถวันนี้</strong><small>รถว่างกี่คัน คันไหนกำลังเดินทาง แบบเรียลไทม์</small></span></a>
              <a href="#/schedule?tab=calendar"><span class="dd-ic">${icon('calendar')}</span><span><strong>ปฏิทินการใช้รถ</strong><small>ดูรายการขอใช้รถรายวัน สัปดาห์ เดือน</small></span></a>
            </div>
          </div>
          <a class="menu-link ${act('/vehicles')}" href="#/vehicles">ข้อมูลรถ</a>
          ${inn && !onlyDriver ? `<a class="menu-link ${act('/my')}" href="#/my">การขอใช้รถของฉัน</a>` : ''}
          ${drv ? `<a class="menu-link ${act('/driver')}" href="#/driver">งานขับรถ</a>` : ''}
          <a class="menu-link ${act('/contact')}" href="#/contact">ติดต่อเรา</a>
          ${back ? `<a class="menu-link back ${act('/admin')}" href="#/admin">${icon('shield')} ระบบหลังบ้าน${pendingAdmin ? ` <span class="pill tone-bad" style="padding:0 8px">${pendingAdmin}</span>` : ''}</a>` : ''}
        </nav>
        <div class="nav-actions">${inn ? `
          <div class="dd" data-open="false">
            <button class="icon-btn" data-dd data-bell aria-label="การแจ้งเตือน ${unread} รายการใหม่" aria-expanded="false">${icon('bell')}${unread ? `<span class="bell-count">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
            <div class="dd-panel right notif-panel">
              <div class="dd-head"><strong>การแจ้งเตือน</strong></div>
              ${(() => { const tk = notifs.filter(n => n.task), nw = notifs.filter(n => !n.task); const row = n => `<a href="${n.link}" class="notif ${n.unread ? 'unread' : ''}"><span class="dot"></span><span><strong>${esc(n.title)}</strong><small>${esc(n.body)}</small><small class="t">${UI.fmt.ago(n.at)}</small></span></a>`;
                return (tk.length ? `<div class="notif-sec">ต้องดำเนินการ</div>${tk.map(row).join('')}` : '') + (nw.length ? `${tk.length ? '<div class="notif-sec">ใหม่</div>' : ''}${nw.map(row).join('')}` : '') || `<div class="empty" style="padding:26px">${icon('checkCircle')}<p>ไม่มีการแจ้งเตือนใหม่</p></div>`; })()}
            </div>
          </div>
          <div class="dd" data-open="false">
            <button class="user-chip" data-dd aria-expanded="false" aria-label="เมนูผู้ใช้">${(() => { const dv = Store.driverOfUser(me); return dv && dv.photo ? `<span class="avatar ph">${UI.img(dv.photo, dv.name)}</span>` : UI.avatar(me.name || me.email, back ? 'gold' : ''); })()}<span class="u-name">${esc((me.name || me.email).split(' ')[0])}</span>${icon('chev', 'chev')}</button>
            <div class="dd-panel right" style="min-width:270px">
              <div class="dd-head" style="display:block"><strong>${esc(me.name || '-')}</strong><small>${esc(Store.isUsernameEmail(me.email) ? 'ชื่อผู้ใช้: ' + Store.usernameOf(me.email) : me.email)}</small><small>${(me.roles || []).map(r => Store.ROLES[r]).join(' · ')}</small></div>
              <a href="#/profile"><span class="dd-ic">${icon('user')}</span><span><strong>โปรไฟล์ของฉัน</strong></span></a>
              ${Store.isUsernameEmail(me.email) ? `<a href="#/password"><span class="dd-ic">${icon('key')}</span><span><strong>เปลี่ยนรหัสผ่าน</strong></span></a>` : ''}
              ${onlyDriver ? '' : `<a href="#/my"><span class="dd-ic">${icon('clipboard')}</span><span><strong>การขอใช้รถของฉัน</strong></span></a>`}
              ${back ? `<a href="#/admin"><span class="dd-ic">${icon('shield')}</span><span><strong>ระบบหลังบ้าน</strong></span></a>` : ''}
              <a href="#/help"><span class="dd-ic">${icon('info')}</span><span><strong>วิธีใช้งาน</strong></span></a>
              <button class="dd-item" data-feedback><span class="dd-ic">${icon('send')}</span><span><strong>แจ้งปัญหา / ข้อเสนอแนะ</strong></span></button>
              <div class="dd-sep"></div>
              ${ViewMode.pickerHTML()}
              <div class="dd-sep"></div>
              <button class="dd-item" data-logout><span class="dd-ic">${icon('logout')}</span><span><strong>ออกจากระบบ</strong></span></button>
            </div>
          </div>` : `<a class="btn btn-primary btn-sm" href="#/login">${icon('login')}<span>เข้าสู่ระบบ</span></a>`}</div>
        <button class="icon-btn nav-toggle" data-menu-toggle aria-label="เปิดเมนู" aria-expanded="false" aria-controls="menu">${icon('menu')}</button>
      </div>
    </header>`;
  }
  function footerHTML() {
    const s = Store.db.settings;
    return `
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand"><img src="images/logo.png" alt="" width="260" height="392">
            <div><strong>ระบบยานพาหนะ</strong><span>${esc(s.division)}<br>${esc(s.schoolName)}</span></div></div>
          <ul class="footer-links"><li><a href="#/request">ขอใช้รถ</a></li><li><a href="#/schedule">ตารางรถ</a></li><li><a href="#/vehicles">ข้อมูลรถ</a></li><li><a href="#/my">คำขอของฉัน</a></li><li><a href="#/contact">ติดต่อเรา</a></li></ul>
        </div>
        ${ViewMode.pickerHTML('in-footer')}
      </div>
    </footer>`;
  }
  const localBadge = () => Store.LOCAL ? `<div class="local-badge no-print">${icon('flask')} โหมดทดลอง — ข้อมูลเก็บในเบราว์เซอร์นี้ <button data-reset>ล้างข้อมูลตัวอย่าง</button></div>` : '';

  // ───────── แอนิเมชันระหว่างโหลด (AB2) ─────────
  const VAN_SVG = '<svg viewBox="0 0 38 24" aria-hidden="true"><path d="M3 17V7a3 3 0 0 1 3-3h17l6 5h4a2 2 0 0 1 2 2v6z" fill="currentColor"/><path d="M8 6h6v4H6V8a2 2 0 0 1 2-2zm8 0h6l4 4H16z" fill="#fff" opacity=".85"/><g class="wh"><circle cx="10" cy="18" r="3.4" fill="#1b2147"/><circle cx="10" cy="18" r="1.2" fill="#f2c14e"/></g><g class="wh"><circle cx="28" cy="18" r="3.4" fill="#1b2147"/><circle cx="28" cy="18" r="1.2" fill="#f2c14e"/></g></svg>';
  const bootHTML = () => `<div class="boot" role="status"><div class="bt-ring"><svg class="bt-r" viewBox="0 0 130 130"><circle class="bg" cx="65" cy="65" r="59"/><circle class="fg" cx="65" cy="65" r="59"/></svg><div class="bt-orbit"><span class="bt-van">${VAN_SVG}</span></div><img src="images/logo.png" alt=""></div><b class="bt-pct">0%</b><p>กำลังโหลดระบบยานพาหนะ…</p></div>`;
  // โหลดข้อมูลในหน้า: ถนนเส้นประ + รถวิ่งไป-กลับใต้แถบเมนู · หน้าแรกหลังเข้าสู่ระบบมีโครงร่างรายการระหว่างรอข้อมูลชุดแรก
  const skelHTML = () => `<div class="ld-skel" aria-hidden="true"><div class="container"><div class="sk" style="height:18px;width:30%;margin-bottom:6px"></div>${'<div class="sk-card"><span class="sk ph"></span><div class="sk-lines"><span class="sk"></span><span class="sk"></span></div></div>'.repeat(4)}</div></div>`;
  let loadingSince = 0;
  function syncLoading() {
    const busy = Store.authState === 'in' && (Store.dataLoading() || Store.histLoading());
    document.documentElement.classList.toggle('is-loading', busy);
    let road = document.getElementById('ldRoad');
    if (!road) { road = document.createElement('div'); road.id = 'ldRoad'; road.className = 'ld-road no-print'; road.setAttribute('aria-hidden', 'true'); road.innerHTML = `<span class="ld-van">${VAN_SVG}</span>`; document.body.appendChild(road); }
    // โครงร่างหายเมื่อข้อมูลชุดแรกมาครบ (หรือรอเกิน 10 วินาที — เน็ตช้า/สิทธิ์ไม่พอ ก็ให้เห็นหน้าจริง)
    if (Store.dataLoading()) { if (!loadingSince) loadingSince = Date.now(); } else loadingSince = 0;
    if (!Store.dataLoading() || Date.now() - loadingSince > 10000) document.querySelectorAll('.ld-skel').forEach(el => { el.classList.add('out'); setTimeout(() => el.remove(), 350); });
  }
  // ───────── แสดงผล ─────────
  async function render() {
    const { path, query } = parseHash();
    // หน้าเปิดระบบ (วงแหวน + รถตู้วิ่งรอบโลโก้) — มีอยู่แล้วจาก index.html ไม่วาดใหม่ ให้เปอร์เซ็นต์เดินต่อ
    if (Store.authState === 'loading') { if (!document.querySelector('#app > .boot .bt-ring')) app().innerHTML = bootHTML(); return; }
    const m = match(path);
    if (!m) return go('#/');
    const me = Store.me, inn = Store.authState === 'in';
    // ด่านตรวจ
    if (m.auth === 'out' && inn) return go(query.next || defaultHome());
    if (m.auth !== 'any' && m.auth !== 'out' && !inn) return go('#/login?next=' + encodeURIComponent('#' + location.hash.slice(1)));
    if (inn && me.mustChangePassword && m.page !== 'password') return go('#/password');
    if (inn && !me.mustChangePassword && (me.needsProfile || Store.needsSign(me)) && m.page !== 'profile') return go('#/profile');
    if (m.auth === 'admin' && !Store.isAdmin(me)) return go(Store.isExec(me) ? '#/admin/stats' : '#/');
    if (m.auth === 'back' && !Store.isBack(me)) return go('#/');
    if (m.auth === 'driver' && !Store.isDriver(me) && !Store.isAdmin(me)) return go('#/');
    if (m.page === 'adminHome' && Store.isExec(me) && !Store.isAdmin(me)) return go('#/admin/stats');

    const page = Pages[m.page];
    if (!page) { app().innerHTML = `<div class="page container">${UI.empty('ไม่พบหน้านี้')}</div>`; return; }
    const ctx = { params: m.params, query, path };
    let view;
    try { view = await page(ctx); }
    catch (e) { console.error(e); Store.logError && Store.logError({ kind: 'render', msg: `${m.page}: ${e.message}`, stack: e.stack }); view = { html: `<div class="page container">${UI.empty('เกิดข้อผิดพลาด: ' + esc(e.message), 'alert')}<p style="text-align:center;margin-top:10px"><button class="btn btn-ghost btn-sm" data-feedback>${icon('send')} แจ้งปัญหา</button></p></div>` }; }
    // หน้าเดิมแต่เปลี่ยนเฉพาะตัวกรอง (เช่น วันที่ของกระดานเที่ยวรถ/ตารางรถ) → แก้เฉพาะส่วนที่เปลี่ยน ไม่วาดใหม่ทั้งหน้า ไม่เด้งขึ้นบน
    const samePage = !!current.path && current.path.split('?')[0] === location.hash.split('?')[0];
    const same = current.path === location.hash || (samePage && !!view.patch && !!(current.view && current.view.patch));
    const y = scrollY;
    const layout = view.layout || 'public';
    const inner = layout === 'bare' ? '' : (layout === 'admin' ? Pages._adminShell(path, view.html) : view.html);
    const nav = layout === 'bare' ? '' : navHTML(path);
    const oldMain = $('#view');
    // วาดหน้าเดิมซ้ำ (ข้อมูลเปลี่ยน / ครบนาที) → เปลี่ยนเฉพาะเนื้อหา ไม่เล่นแอนิเมชันใหม่ จอจะไม่กระพริบ
    if (same && layout !== 'bare' && oldMain && current.layout === layout) {
      if (inner === current.inner) { if (nav !== current.nav) { refreshNav(); current.nav = nav; } return; }
      // หน้าแรก/สถานะรถ: แก้เฉพาะส่วนที่เปลี่ยนจริง (แผนที่ นาฬิกา ลานจอด ฯลฯ ที่ไม่เปลี่ยนจะไม่ถูกวาดใหม่)
      if (view.patch && current.view && current.view.patch) {
        oldMain.classList.remove('page-enter'); oldMain.classList.add('quiet');
        patchDom(oldMain, frag(current.inner), frag(inner));
        if (nav !== current.nav) refreshNav();
        current = { path: location.hash, view, layout, inner, nav };
        UI.hydrate(oldMain); UI.animate(oldMain, { quiet: true });
        if (view.tick) view.tick();
        return;
      }
      const main = document.createElement('main');
      main.id = 'view'; main.className = 'quiet'; main.innerHTML = inner;
      const sig = el => el.tagName + '#' + el.id + '.' + (typeof el.className === 'string' ? el.className : '');
      const scrolled = [...oldMain.querySelectorAll('*')].filter(el => el.scrollTop || el.scrollLeft).map(el => ({ s: sig(el), i: [...oldMain.querySelectorAll(el.tagName)].filter(x => sig(x) === sig(el)).indexOf(el), t: el.scrollTop, l: el.scrollLeft }));
      oldMain.replaceWith(main);
      if (nav !== current.nav) refreshNav();
      current = { path: location.hash, view, layout, inner, nav };
      scrollTo(0, y);
      if (view.mount) { try { view.mount(main, ctx); } catch (e) { console.error(e); } }
      scrolled.forEach(x => { const el = [...main.querySelectorAll(x.s.split('#')[0])].filter(e => sig(e) === x.s)[x.i]; if (el) { el.scrollTop = x.t; el.scrollLeft = x.l; } });
      UI.hydrate(main); UI.animate(main, { quiet: true });
      onScroll();
      return;
    }
    app().innerHTML = layout === 'bare' ? view.html + localBadge()
      : `${nav}<main id="view" class="${same ? 'quiet' : 'page-enter'}">${inner}</main>${layout === 'admin' || layout === 'driver' ? '' : footerHTML()}${localBadge()}`;
    current = { path: location.hash, view, layout, inner, nav };
    if (same) scrollTo(0, y); else scrollTo(0, 0);
    const root = $('#view') || app();
    if (view.mount) { try { view.mount(root, ctx); } catch (e) { console.error(e); } }
    UI.hydrate(root); UI.animate(root, { quiet: same }); if ($('#nav')) UI.hydrate($('#nav'));
    if (view.tick) view.tick();   // นาฬิกาแสดงทันที ไม่ว่างรอ 1 วินาที
    // ข้อมูลชุดแรกยังมาไม่ครบ → โครงร่างรายการทับหน้าไว้ก่อน (ไม่ให้เห็นหน้าว่าง "ไม่มีข้อมูล" แวบหนึ่ง)
    // (วางเป็นชั้นลอยใต้แถบเมนู ไม่แทรกใน #view เพราะหน้าแบบ patch เทียบ DOM ทีละโหนด)
    if (Store.authState === 'in' && Store.dataLoading() && layout !== 'bare' && !document.querySelector('.ld-skel')) document.body.insertAdjacentHTML('beforeend', skelHTML());
    syncLoading();
    // ครั้งแรกหลังเข้าสู่ระบบ: โหลดรูปรถ/คนขับ/คณะทำงานไว้ล่วงหน้าตอนว่าง
    if (Store.authState === 'in' && !render._warm) { render._warm = true; setTimeout(() => Store.warmImages && Store.warmImages(), 2500); }
    if (Store.authState === 'in') popNews();
    // กดเลือกวันในปฏิทิน → เลื่อนลงไปที่รายการของวันนั้น
    if (query.pick) { const l = document.getElementById('list'); if (l) setTimeout(() => scrollTo({ top: l.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' }), 60); }
    onScroll();
    maybeRatePrompt();
  }
  // เทียบ HTML เดิม (prev) กับใหม่ (next) แล้วแก้ DOM จริง (live) เฉพาะโหนดที่ต่างกัน
  function frag(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content; }
  // แจ้งเตือนเด้ง (ครั้งเดียวต่อเรื่อง): ผลการพิจารณาคำขอของฉัน / ผลคำขอแก้ไข — นอกเหนือจากตัวเลขที่กระดิ่ง
  const POP_KEY = () => 'vb-popped-' + ((Store.me || {}).email || '');
  const POP_T = { 'คำขอได้รับการอนุมัติ': 'ok', 'แอดมินอนุมัติการแก้ไขข้อมูลแล้ว': 'ok', 'คำขอไม่ได้รับการอนุมัติ': 'error', 'แอดมินไม่อนุมัติการแก้ไขข้อมูล': 'error', 'แอดมินส่งคำขอกลับให้แก้ไข': 'info' };
  function popNews() {
    let seen = []; try { seen = JSON.parse(localStorage.getItem(POP_KEY()) || '[]'); } catch (e) { /* ใช้ค่าว่าง */ }
    const news = Store.notifications().filter(n => n.unread && POP_T[n.title] && !seen.includes(n.id)).slice(0, 3);
    if (!news.length) return;
    news.forEach((n, i) => setTimeout(() => UI.toast(`${n.title} — ${n.body}`, POP_T[n.title]), 600 + i * 900));
    try { localStorage.setItem(POP_KEY(), JSON.stringify([...seen, ...news.map(n => n.id)].slice(-200))); } catch (e) { /* ข้าม */ }
  }
  function sameAttrs(a, b) {
    if (a.attributes.length !== b.attributes.length) return false;
    for (const at of a.attributes) if (b.getAttribute(at.name) !== at.value) return false;
    return true;
  }
  function patchDom(live, prev, next) {
    const L = [...live.childNodes], P = [...prev.childNodes], N = [...next.childNodes];
    if (L.length !== P.length || P.length !== N.length) { live.replaceChildren(...N); return; }
    N.forEach((n, i) => {
      const p = P[i], l = L[i];
      if (p.isEqualNode(n)) return;
      if (p.nodeType === 1 && n.nodeType === 1 && p.nodeName === n.nodeName && l.nodeName === p.nodeName && sameAttrs(p, n)) patchDom(l, p, n);
      else l.replaceWith(n);
    });
  }
  const defaultHome = () => { const me = Store.me; if (Store.isDriver(me) && !Store.has(me, 'teacher') && !Store.isBack(me)) return '#/driver'; return '#/'; };

  // เมื่อข้อมูลเปลี่ยน → วาดหน้าใหม่ (ยกเว้นหน้าที่กำลังกรอกฟอร์ม)
  function onData() {
    syncLoading();
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => {
      if (document.querySelector('.modal-wrap')) { pendingRender = true; const nav = $('#nav'); if (nav) refreshNav(); return; }
      if (current.view && current.view.live === false) { refreshNav(); return; }
      render();
    }, 120);
  }
  function refreshNav() { const nav = $('#nav'); if (!nav) return; const { path } = parseHash(); const t = document.createElement('div'); t.innerHTML = navHTML(path); nav.replaceWith(t.firstElementChild); onScroll(); UI.hydrate($('#nav') || document); }
  function onScroll() { const nav = $('#nav'); if (nav) nav.classList.toggle('scrolled', scrollY > 10); }

  // ป๊อปอัปประเมินคนขับ เมื่อทริปของผู้ใช้กลับถึงแล้ว
  let rateTimer = 0;
  function maybeRatePrompt() {
    if (Store.authState !== 'in' || document.querySelector('.modal-wrap') || rateTimer) return;
    if (/^\/rate|^\/profile|^\/password/.test(parseHash().path)) return;
    const p = Store.pendingRatings().find(x => !ratingShown.has(x.r.id + x.i) && !sessionStorage.getItem('rated-later-' + x.r.id + x.i));
    if (!p) return;
    ratingShown.add(p.r.id + p.i);
    rateTimer = setTimeout(async () => {
      if (document.querySelector('.modal-wrap') || Store.authState !== 'in') { rateTimer = 0; ratingShown.delete(p.r.id + p.i); return; }
      if (Pages._ratePopup) await Pages._ratePopup(p);
      rateTimer = 0;
      setTimeout(maybeRatePrompt, 600);   // มีทริปอื่นรอประเมินอีก → ถามต่อ
    }, 900);
  }

  // ───────── เหตุการณ์ทั่วไป ─────────
  function bind() {
    addEventListener('hashchange', render);
    addEventListener('hashchange', () => { document.documentElement.classList.remove('dv-sheet'); document.body.classList.remove('dv-max-open'); });
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', e => {
      const dd = e.target.closest('[data-dd]');
      document.querySelectorAll('.dd[data-open="true"]').forEach(d => { if (!dd || d !== dd.parentElement) d.dataset.open = 'false'; });
      if (dd) { const p = dd.parentElement; p.dataset.open = p.dataset.open === 'true' ? 'false' : 'true'; dd.setAttribute('aria-expanded', p.dataset.open);
        // เปิดกระดิ่ง = อ่านแล้ว: ตัวเลขหายทันที · รายการที่อ่านแล้วหายไปเมื่อปิด/เปลี่ยนหน้า
        if (dd.hasAttribute('data-bell') && p.dataset.open === 'true') { Store.markSeen(true); dd.querySelector('.bell-count')?.remove(); }
        // ปิดกระดิ่ง → วาดแถบเมนูใหม่ (เอารายการที่อ่านแล้วออก)
        else if (dd.hasAttribute('data-bell')) refreshNav(); }
      const mt = e.target.closest('[data-menu-toggle]');
      if (mt) { const m = $('#menu'); m.classList.toggle('open'); mt.setAttribute('aria-expanded', m.classList.contains('open')); }
      else if (e.target.closest('.menu a')) $('#menu')?.classList.remove('open');
      if (e.target.closest('[data-logout]')) { Store.logout().then(() => go('#/')); }
      if (e.target.closest('[data-reset]')) UI.confirm('ล้างข้อมูลทั้งหมดในโหมดทดลอง แล้วสร้างข้อมูลตัวอย่างใหม่?', { title: 'ล้างข้อมูลตัวอย่าง', ok: 'ล้างข้อมูล', danger: true }).then(ok => ok && Store.reset());
      const vm = e.target.closest('[data-vmode]');
      if (vm) { const m = vm.dataset.vmode; if (m !== ViewMode.get()) { ViewMode.set(m); UI.toast(m === 'auto' ? 'ปรับมุมมองอัตโนมัติตามขนาดจอ' : `เปลี่ยนเป็นมุมมอง${ViewMode.MODES[m].label}แล้ว`); } return; }
      const op = e.target.closest('[data-view]');
      if (op) {
        e.preventDefault();
        if (!C.viewInPage()) { UI.openFile(op.dataset.view); return; }
        // รวมไฟล์แนบชุดเดียวกัน (กดซ้าย-ขวาในตัวแสดงได้)
        const box = op.parentElement, all = box ? [...box.querySelectorAll(':scope > [data-view]')].map(x => x.dataset.view) : [];
        const refs = all.length ? all : [op.dataset.view];
        C.viewFiles(refs, Math.max(0, refs.indexOf(op.dataset.view)));
        return;
      }
      // เที่ยวรถในกระดาน/แกนเวลา/ปฏิทิน: มือถือ-แท็บเล็ต (หรือไม่มีสิทธิ์เปิดคำขอ) → การ์ดรายละเอียด · คอมที่มีสิทธิ์ → เปิดคำขอ
      const tr = e.target.closest('[data-tcard]');
      if (tr && !e.target.closest('a,button,input,select')) {
        const href = tr.dataset.href || '';
        if (!href || document.documentElement.classList.contains('lt1060')) { e.preventDefault(); C.tripModal(tr.dataset.tcard, href); return; }
      }
      // การ์ดที่กดได้ทั้งใบ (ไม่ใช้ <a> ซ้อน <a>)
      const card = e.target.closest('[data-href]');
      if (card && !e.target.closest('a,button,input,select,textarea,label') && (!card.matches('tr') || card.classList.contains('bd-row'))) location.hash = card.dataset.href;
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dd[data-open="true"]').forEach(d => d.dataset.open = 'false'); });
    // ตัวเลือกวันที่ → เปลี่ยนลิงก์ตามวันที่เลือก
    document.addEventListener('change', e => { const dp = e.target.closest('[data-daypick]'); if (dp && dp.value) location.hash = dp.dataset.daypick + dp.value; });
  }

  async function start() {
    bind();
    Store.subscribe(onData);
    render();
    await Store.start();
    render();
    setInterval(() => { if (current.view && current.view.tick) current.view.tick(); }, 1000);
    setInterval(() => { if (current.view && current.view.live !== false && !document.querySelector('.modal-wrap') && !document.querySelector('.dd[data-open="true"]')) render(); }, 60000);
  }
  return { start, render, go, refreshNav };
})();

document.addEventListener('DOMContentLoaded', App.start);
