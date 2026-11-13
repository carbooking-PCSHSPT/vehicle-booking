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
    // ช่วงเวลาเริ่ม 06:00–20:00 ขยายอัตโนมัติถ้ามีงานนอกช่วง
    let H0 = 6, H1 = 20;
    list.forEach(r => { const s = new Date(r.startAt), e = new Date(r.endAt); if (s >= d0 && s < d1) H0 = Math.min(H0, s.getHours()); if (e >= d0 && e < d1) H1 = Math.max(H1, Math.min(24, e.getHours() + (e.getMinutes() ? 1 : 0))); });
    const pos = t => Math.max(0, Math.min(100, ((new Date(t) - d0) / 36e5 - H0) / (H1 - H0) * 100));
    const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
    const bar = (r, extra = '') => {
      const l = pos(r.startAt), w = Math.max(3, pos(r.endAt) - l), href = hrefOf(r);
      const cont = new Date(r.startAt) < d0 ? '← ' : '', more = new Date(r.endAt) > d1 ? ' →' : '';
      return `<div class="g-bar s-${r.status} ${href ? 'link' : ''}" style="left:${l}%;width:${w}%" ${href ? `data-href="${href}"` : ''} title="${esc(S().destName(r))} · ${fmt.time(r.startAt)}–${fmt.when(r.endAt)} · ${esc(r.requester.name)}${extra}">${icon(r.status === 'pending' ? 'clock' : 'pin')}<span>${cont}${esc(S().destName(r))}${r.overnight ? ' · ค้างคืน' : ''}${more}</span></div>`;
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

  // ชื่อคนขับแบบสั้น (ตัดคำนำหน้า/นามสกุล)
  const firstName = n => String(n || '').replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.|ดร\.)\s*/, '').trim().split(/\s+/)[0] || '';

  // ลานจอดรถแบบมองจากด้านบน + ช่องสรุป (แบบ B)
  const PK = { free: '#10b981', booked: '#e0a526', maint: '#ef4444', off: '#9ca3af' };
  function parkBoard(vehicles) {
    const f = vehicles.map(v => ({ v, s: S().vehicleState(v) }));
    const n = k => f.filter(x => x.s.key === k).length;
    const cols = Math.min(7, Math.ceil(f.length / 2)) || 1;
    return `<div class="pk">
      <div class="pk-lot" style="--cols:${cols}">${f.map(({ v, s }, i) => `<a class="pk-bay ${i < cols ? 'top' : 'bot'}" href="#/vehicles/${v.id}" title="${esc(v.name)} · ${esc(s.label)} · ${esc(s.note)}">${s.key === 'ontrip' ? `<span class="pk-gone">${icon('route')}</span>` : `<span class="pk-car" style="--c:${PK[s.key] || PK.free}">${icon(s.key === 'maint' ? 'wrench' : kindIcon(v.kind))}</span>`}<span class="pk-nm">${esc(v.name)}</span></a>`).join('')}</div>
      <div class="pk-leg">
        <div><span><i style="background:${PK.free}"></i>ว่าง</span><b class="num">${n('free')}</b></div>
        <div><span><i style="background:#f97316"></i>กำลังเดินทาง</span><b class="num">${n('ontrip')}</b></div>
        <div><span><i style="background:${PK.booked}"></i>มีคิววันนี้</span><b class="num">${n('booked')}</b></div>
        <div><span><i style="background:${PK.maint}"></i>ซ่อม / งดให้บริการ</span><b class="num">${n('maint') + n('off')}</b></div>
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
      return pre + `<tr class="bd-row ${st[0]} ${href ? 'link' : ''}" ${href ? `data-href="${href}"` : ''}>
        <td><span class="flip">${flip(st0, k)}</span>${UI.sameDay(st0, day) ? '' : `<small>${fmt.dayMonth(st0)}</small>`}</td>
        <td><span class="flip">${flip(en, k)}</span>${UI.sameDay(en, day) ? '' : `<small>${fmt.dayMonth(en)}</small>`}</td>
        <td class="dst"><b>${esc(S().destName(r))}</b><small>${esc((r.destinations[0] || {}).province || '')}${r.totalKm ? ` · ${fmt.num(r.totalKm, 0)} กม.` : ''}${S().tripTag(r) ? ` · ${S().tripTag(r).text}` : ''}</small><small>${esc(r.purpose)}</small>${r.status === 'ontrip' ? `<span class="bd-prog"><i style="width:${Math.max(0, Math.min(1, (now - st0) / (en - st0))) * 100}%"></i></span>` : ''}</td>
        <td>${esc(r.requester.name)}</td>
        <td><span class="bd-ppl"><span>${icon('teacher')}${r.teachers}</span><span>${icon('student')}${r.students}</span>${+r.others ? `<span title="บุคคลอื่น">${icon('users')}${r.others}</span>` : ''}</span></td>
        <td>${as.length ? as.map(a => `${esc(vName(a.vehicleId))}<small>${esc(vPlate(a.vehicleId))}</small>`).join('') : '<span class="bd-wait">รอแอดมินจัดรถ</span>'}</td>
        <td>${as.length ? as.map(a => `${esc(dName(a.driverId))}${dPhone(a.driverId) ? `<small><a href="tel:${esc(dPhone(a.driverId))}">${esc(dPhone(a.driverId))}</a></small>` : ''}`).join('') : '—'}</td>
        <td><span class="bd-st ${st[0]}"><span>${st[1]}<em>${st[2]}</em></span></span></td></tr>`;
    }).join('') + (placed ? '' : `<tr class="bd-now"><td colspan="8"><span>ตอนนี้ ${fmt.time(now)} น.</span></td></tr>`);
    return `<div class="bd"><div class="bd-scroll"><table><thead><tr><th>ออก</th><th>กลับ</th><th>ปลายทาง / ภารกิจ</th><th>ผู้ขอใช้รถ</th><th>ผู้เดินทาง</th><th>รถ</th><th>คนขับ</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
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
  const HIST = { memo: ['paperclip', 'แนบบันทึกข้อความตามหลัง'], memowaive: ['shield', 'ยกเว้นบันทึกข้อความ'], esign: ['edit', 'ลงนามอิเล็กทรอนิกส์'], signed: ['file', 'บันทึกข้อความฉบับลงนาม'], submit: ['send', 'ส่งคำขอ'], edit: ['edit', 'แก้ไขคำขอ'], resubmit: ['refresh', 'แก้ไขและส่งใหม่'], cancel: ['xCircle', 'ยกเลิกคำขอ'], approve: ['checkCircle', 'อนุมัติ'], reject: ['xCircle', 'ไม่อนุมัติ'], revise: ['undo', 'ส่งกลับให้แก้ไข'], reassign: ['refresh', 'ปรับรถ/คนขับ'], depart: ['navigation', 'ออกเดินทาง'], return: ['home', 'กลับถึงโรงเรียน'], undo: ['undo', 'ย้อนสถานะ'], close: ['check', 'ปิดงาน'], reopen: ['refresh', 'เปิดงานอีกครั้ง'], emergency: ['alert', 'บันทึกคำขอเร่งด่วน'] };
  const history = r => `<div class="hist">${(r.history || []).slice().reverse().map(h => { const [ic, t] = HIST[h.action] || ['info', h.action]; return `<div class="hist-item"><span class="hi">${icon(ic)}</span><div><b>${t}${h.action === 'depart' || h.action === 'return' ? ` · ${esc(h.note)}` : ''}</b><small>${esc(h.byName || h.by || '')} · ${fmt.dt(h.at)}</small>${h.note && !['depart', 'return'].includes(h.action) ? `<p>${esc(h.note)}</p>` : ''}</div></div>`; }).join('')}</div>`;

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
          <button type="button" class="icon-btn sm" data-dv="tab" title="เปิดในแท็บใหม่" aria-label="เปิดในแท็บใหม่">${icon('arrowUR')}</button>
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
        if (my === token) { pages.innerHTML = `<div class="dv-msg">${icon('alert')} ${UI.esc(e.message || 'เปิดเอกสารไม่สำเร็จ')}<br><button type="button" class="btn btn-ghost btn-sm" data-dv="tab" style="margin-top:10px">${icon('arrowUR')} เปิดในแท็บใหม่</button></div>`; foot.textContent = ''; }
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
      if (a === 'tab') UI.openFile(refs[st.i]);
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
  const canMemo = r => ['approved', 'ontrip', 'returned', 'closed'].includes(r.status);
  const MEMO_PAGE = { margin: '15mm 18mm 12mm 25mm', pageNo: false, fitWidth: '167mm' };   // A4 กว้าง 210 − ขอบซ้าย 25 − ขวา 18
  // โหลดลายเซ็นที่ต้องใช้ล่วงหน้า (ผู้ขอที่ส่งคำขอเอง + ผู้ลงนามอิเล็กทรอนิกส์) — อ่านไม่ได้ (ไม่มีสิทธิ์) = แสดงเป็นข้อความแทน
  const sigEmails = list => list.flatMap(r => [r.createdBy === r.requester.email ? r.requester.email : '', ((r.esign || {}).head || {}).email, ((r.esign || {}).deputy || {}).email]).filter(Boolean);
  async function printMemo(r) { await S().loadSignatures(sigEmails([r])); UI.printDoc(memoHTML(r), { title: `บันทึกข้อความขอใช้รถ ${r.id}`, ...MEMO_PAGE }); }
  // พิมพ์หลายฉบับต่อกัน (1 คำขอ = 1 หน้า)
  async function printMemos(list) {
    if (!list.length) return;
    await S().loadSignatures(sigEmails(list));
    UI.printDoc(list.map(memoHTML).join(''), { title: list.length === 1 ? `บันทึกข้อความขอใช้รถ ${list[0].id}` : `บันทึกข้อความขอใช้รถ ${list.length} ฉบับ ${list[0].id} ถึง ${list[list.length - 1].id}`, ...MEMO_PAGE });
  }
  function memoHTML(r) {
    const s = S(), st = s.db.settings, M = memoSettings();
    const dTh = d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const tm = d => `${UI.fmt.time(d)} น.`;
    const dots = n => '.'.repeat(n);
    const u = s.user(r.requester.email) || (s.me && s.me.email === r.requester.email ? s.me : {}) || {};
    const pos = u.position || '';
    const t = s.tripType(r), sameDay = s.sameDay(r.startAt, r.endAt);
    const when = sameDay ? `วันที่ ${dTh(r.startAt)} เวลา ${UI.fmt.time(r.startAt)} – ${tm(r.endAt)}`
      : `ตั้งแต่วันที่ ${dTh(r.startAt)} เวลา ${tm(r.startAt)} ถึงวันที่ ${dTh(r.endAt)} เวลา ${tm(r.endAt)}`;
    const pax = s.passengers(r);
    const paxParts = [r.teachers ? `ครู/บุคลากร ${r.teachers} คน` : '', r.students ? `นักเรียน ${r.students} คน` : '', r.others ? `บุคคลอื่น ${r.others} คน` : ''].filter(Boolean).join(' ');
    const dests = (r.destinations || []).map(d => d.name + (d.province ? ` จังหวัด${d.province.replace(/^จ(\.|ังหวัด)\s*/, '')}` : '')).join(', ') || s.destName(r);
    const asg = r.assignments || [];
    const apv = (r.history || []).filter(h => h.action === 'approve').pop();
    // es = { img, at } ลายเซ็นอิเล็กทรอนิกส์ (ถ้ามี) — วางรูปลายเซ็นทับเส้นจุด
    const sig = (role, name, p, es) => `<div class="mm-sig${es && es.img ? ' has-img' : ''}"><p>(ลงชื่อ) <span class="mm-dots">${es && es.img ? `<img src="${es.img}" alt="">` : ''}${dots(42)}</span> ${role}</p><p>(${name ? esc(name) : dots(40)})</p><p>ตำแหน่ง ${p ? esc(p) : dots(36)}</p>${es && es.at ? `<p class="mm-es">ลงนามอิเล็กทรอนิกส์ผ่านระบบ ${UI.fmt.dt(es.at)}</p>` : ''}</div>`;
    const E = r.esign || {};
    const reqSig = r.createdBy === r.requester.email && s.sigOf(r.requester.email) ? { img: s.sigOf(r.requester.email), at: r.createdAt } : null;
    const headSig = E.head ? { img: s.sigOf(E.head.email), at: E.head.at } : null;
    const depSig = E.deputy ? { img: s.sigOf(E.deputy.email), at: E.deputy.at } : null;
    const dateLine = es => es ? `<p class="mm-date">วันที่ ${dTh(es.at)}</p>` : `<p class="mm-date">วันที่ ${dots(8)} / ${dots(8)} / ${dots(8)}</p>`;
    const html = `<div class="memo-doc">
      <div class="mm-top"><img class="mm-krut" src="images/krut.png" alt="" onerror="this.onerror=null;this.src='images/logo.png'"><h1>บันทึกข้อความ</h1></div>
      <div class="mm-line"><b>ส่วนราชการ</b><span data-fit>${esc(st.unit || 'งานยานพาหนะ')} ${esc(st.division || '')} ${esc(st.schoolName || '')}</span></div>
      <div class="mm-row"><div class="mm-line"><b>ที่</b><span>${esc(M.noPrefix ? M.noPrefix + ' ' : '')}${r.id}</span></div><div class="mm-line"><b>วันที่</b><span>${dTh(r.createdAt)}</span></div></div>
      <div class="mm-line"><b>เรื่อง</b><span>ขออนุญาตใช้รถยนต์ส่วนกลางของโรงเรียน</span></div>
      <hr>
      <p class="mm-to"><b>เรียน</b> ${esc(M.to)}</p>
      <p class="mm-p">ด้วยข้าพเจ้า ${esc(r.requester.name)}${pos ? ` ตำแหน่ง ${esc(pos)}` : ''}${r.requester.dept ? ` ${esc(r.requester.dept)}` : ''} มีความประสงค์ขออนุญาตใช้รถยนต์ส่วนกลางของโรงเรียน เพื่อ${esc(r.purpose || '')}${r.project ? ` (${esc(r.project)})` : ''} โดยมีรายละเอียดดังนี้</p>
      <ol class="mm-list">
        <li><b>สถานที่ไปราชการ</b> ${esc(dests)}</li>
        <li><b>กำหนดเดินทาง</b> ${when} (${esc(s.TRIP[t].label)}${t === 'overnight' && r.lodging ? ` · ที่พัก ${esc(r.lodging)}` : ''})</li>
        <li><b>ผู้เดินทาง</b> รวม ${pax} คน${paxParts ? ` (${paxParts})` : ''}${r.passengerNames ? ` ได้แก่ ${esc(r.passengerNames)}` : ''}</li>
        <li><b>จุดขึ้นรถ</b> ${esc(r.pickup || '-')} · <b>โทรศัพท์ติดต่อระหว่างเดินทาง</b> ${esc(r.contactPhone || r.requester.phone || '-')}</li>
        ${r.note ? `<li><b>หมายเหตุ</b> ${esc(r.note)}</li>` : ''}
      </ol>
      <p class="mm-p">จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต</p>
      <div class="mm-right">${sig('ผู้ขอใช้รถ', r.requester.name, pos, reqSig)}</div>
      <div class="mm-boxes">
        <div class="mm-box"><h3>ความเห็นหัวหน้างานยานพาหนะ</h3>
          <p>เรียน ${esc(M.to)}</p>
          <p class="mm-ind">งานยานพาหนะได้ตรวจสอบแล้ว และจัดรถให้ดังนี้</p>
          ${asg.length ? `<ul>${asg.map(a => `<li>${esc(vName(a.vehicleId))}${vPlate(a.vehicleId) ? ` ทะเบียน ${esc(vPlate(a.vehicleId))}` : ''} · พนักงานขับรถ ${esc(dName(a.driverId))}${dPhone(a.driverId) ? ` โทร ${esc(dPhone(a.driverId))}` : ''}</li>`).join('')}</ul>` : `<p>${dots(70)}</p>`}
          ${r.decision && r.decision.note ? `<p class="mm-note">หมายเหตุ: ${esc(r.decision.note)}</p>` : ''}
          <p class="mm-ind">เห็นควรอนุญาต</p>
          ${sig('', E.head ? E.head.name : M.headName, M.headPos, headSig)}${dateLine(headSig)}</div>
        <div class="mm-box"><h3>ความเห็น / คำสั่ง</h3>
          <p class="mm-chk"><span class="cb ${E.deputy && E.deputy.decision !== 'deny' ? 'on' : ''}"></span> อนุญาต &nbsp;&nbsp;&nbsp; <span class="cb ${E.deputy && E.deputy.decision === 'deny' ? 'on' : ''}"></span> ไม่อนุญาต</p>
          ${E.deputy && E.deputy.note ? `<p class="mm-fill">${esc(E.deputy.note)}</p>` : `<p>${dots(70)}</p><p>${dots(70)}</p>`}
          ${sig('', E.deputy ? E.deputy.name : M.depName, M.depPos, depSig)}${dateLine(depSig)}</div>
      </div>
      <p class="mm-foot">อ้างอิงระบบยานพาหนะ เลขที่คำขอ ${r.id} · ส่งคำขอ ${UI.fmt.dt(r.createdAt)}${apv ? ` · จัดรถ/อนุมัติในระบบโดย ${esc(apv.byName || apv.by)} เมื่อ ${UI.fmt.dt(apv.at)}` : ''} · พิมพ์เมื่อ ${UI.fmt.dt(new Date().toISOString())}</p>
    </div>`;
    return html;
  }

  return { atom, statusPill, stars, reqCard, pass, ticket, bindRail, gantt, parkBoard, board, dayPicker, firstName, lot, history, assignList, lockCard, filePicker, bindFilePicker, vName, vPlate, dName, dPhone, docSlot, mountDocViewer, printMemo, printMemos, canMemo, memoSettings, memoHTML, sigEmails };
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
    ['/my', 'my', 'in'], ['/my/:id', 'myDetail', 'in'], ['/rate/:id/:idx', 'rate', 'in'], ['/contact', 'contact', 'any'],
    ['/driver', 'driverHome', 'driver'], ['/driver/:id/:idx', 'driverJob', 'driver'],
    ['/admin', 'adminHome', 'back'], ['/admin/requests', 'adminRequests', 'admin'], ['/admin/requests/:id', 'adminRequest', 'admin'], ['/admin/esign', 'adminEsign', 'back'],
    ['/admin/new', 'adminNew', 'admin'], ['/admin/roster', 'adminRoster', 'admin'], ['/admin/vehicles', 'adminVehicles', 'admin'], ['/admin/vehicles/:id', 'adminVehicle', 'admin'],
    ['/admin/drivers', 'adminDrivers', 'admin'], ['/admin/users', 'adminUsers', 'admin'], ['/admin/expenses', 'adminExpenses', 'admin'],
    ['/admin/ratings', 'adminRatings', 'back'], ['/admin/stats', 'adminStats', 'back'], ['/admin/settings', 'adminSettings', 'admin']
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
    const notifs = inn ? Store.notifications() : [];
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
            <button class="icon-btn" data-dd aria-label="การแจ้งเตือน ${unread} รายการใหม่" aria-expanded="false">${icon('bell')}${unread ? `<span class="bell-count">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
            <div class="dd-panel right notif-panel">
              <div class="dd-head"><strong>การแจ้งเตือน</strong>${unread ? '<button class="link" data-seen style="font-size:.82rem">อ่านทั้งหมด</button>' : ''}</div>
              ${notifs.map(n => `<a href="${n.link}" class="notif ${n.unread ? 'unread' : ''}"><span class="dot"></span><span><strong>${esc(n.title)}</strong><small>${esc(n.body)}</small><small class="t">${UI.fmt.ago(n.at)}</small></span></a>`).join('') || '<div class="empty" style="padding:26px">ยังไม่มีการแจ้งเตือน</div>'}
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
        <div class="footer-bottom"><span><span class="line"></span>© ${new Date().getFullYear() + 543} ${esc(s.division)}</span><span>${esc(s.schoolNameEn)}</span></div>
      </div>
    </footer>`;
  }
  const localBadge = () => Store.LOCAL ? `<div class="local-badge no-print">${icon('flask')} โหมดทดลอง — ข้อมูลเก็บในเบราว์เซอร์นี้ <button data-reset>ล้างข้อมูลตัวอย่าง</button></div>` : '';

  // ───────── แสดงผล ─────────
  async function render() {
    const { path, query } = parseHash();
    if (Store.authState === 'loading') { app().innerHTML = `<div class="boot" role="status"><img src="images/logo.png" alt=""><p>กำลังโหลดระบบยานพาหนะ…</p></div>`; return; }
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
    catch (e) { console.error(e); view = { html: `<div class="page container">${UI.empty('เกิดข้อผิดพลาด: ' + esc(e.message), 'alert')}</div>` }; }
    const same = current.path === location.hash;
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
    // กดเลือกวันในปฏิทิน → เลื่อนลงไปที่รายการของวันนั้น
    if (query.pick) { const l = document.getElementById('list'); if (l) setTimeout(() => scrollTo({ top: l.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' }), 60); }
    onScroll();
    maybeRatePrompt();
  }
  // เทียบ HTML เดิม (prev) กับใหม่ (next) แล้วแก้ DOM จริง (live) เฉพาะโหนดที่ต่างกัน
  function frag(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content; }
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
      if (dd) { const p = dd.parentElement; p.dataset.open = p.dataset.open === 'true' ? 'false' : 'true'; dd.setAttribute('aria-expanded', p.dataset.open); }
      const mt = e.target.closest('[data-menu-toggle]');
      if (mt) { const m = $('#menu'); m.classList.toggle('open'); mt.setAttribute('aria-expanded', m.classList.contains('open')); }
      else if (e.target.closest('.menu a')) $('#menu')?.classList.remove('open');
      if (e.target.closest('[data-logout]')) { Store.logout().then(() => go('#/')); }
      if (e.target.closest('[data-seen]')) { e.preventDefault(); Store.markSeen(); }
      if (e.target.closest('[data-reset]')) UI.confirm('ล้างข้อมูลทั้งหมดในโหมดทดลอง แล้วสร้างข้อมูลตัวอย่างใหม่?', { title: 'ล้างข้อมูลตัวอย่าง', ok: 'ล้างข้อมูล', danger: true }).then(ok => ok && Store.reset());
      const vm = e.target.closest('[data-vmode]');
      if (vm) { const m = vm.dataset.vmode; if (m !== ViewMode.get()) { ViewMode.set(m); UI.toast(m === 'auto' ? 'ปรับมุมมองอัตโนมัติตามขนาดจอ' : `เปลี่ยนเป็นมุมมอง${ViewMode.MODES[m].label}แล้ว`); } return; }
      const op = e.target.closest('[data-view]');
      if (op) { e.preventDefault(); UI.openFile(op.dataset.view); return; }
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
