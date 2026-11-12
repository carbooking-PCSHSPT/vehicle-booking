/* ═══════════════════════════════════════════════════════════
   หน้าฝั่งผู้ใช้: หน้าแรก · เข้าสู่ระบบ · โปรไฟล์ · ขอใช้รถ · ตารางรถ · ข้อมูลรถ
                 · การขอใช้รถของฉัน · ประเมินคนขับ · ติดต่อเรา
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const { esc, fmt, pill, kindIcon, $, $$ } = UI;
  const S = Store;
  const inn = () => S.authState === 'in';
  const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dayEnd = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const onDay = (r, d) => new Date(r.startAt) <= dayEnd(d) && new Date(r.endAt) >= dayStart(d);
  const visible = r => !['cancelled', 'rejected'].includes(r.status);
  const tripsOn = d => S.db.requests.filter(r => visible(r) && r.status !== 'revise' && onDay(r, d)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const mountedOnce = {};
  const people = list => list.reduce((s, r) => ({ t: s.t + (+r.teachers || 0), s: s.s + (+r.students || 0) }), { t: 0, s: 0 });

  // วันที่จากลิงก์ (?date=YYYY-MM-DD) — ไม่ระบุ = วันนี้
  const dayFromQuery = q => dayStart(UI.dayOf(q.date));
  const hrefOfReq = r => S.isAdmin(S.me) ? `#/admin/requests/${r.id}` : r.requester.email === (S.me || {}).email ? `#/my/${r.id}` : '';
  function summaryStrip(list, day = new Date()) {
    const vs = S.db.vehicles.filter(v => v.bookable !== false);
    const p = people(list);
    // วันอื่นที่ไม่ใช่วันนี้: นับรถที่มีคิวในวันนั้นแทนสถานะ ณ ตอนนี้
    const isToday = UI.sameDay(day, new Date());
    const used = new Set(list.filter(r => r.status !== 'pending').flatMap(r => (r.assignments || []).map(a => a.vehicleId)));
    const states = isToday ? vs.map(v => S.vehicleState(v).key) : [];
    return `<div class="strip">${[
      { ic: 'route', l: isToday ? 'การเดินทางวันนี้' : 'การเดินทางวันนั้น', v: list.length, u: 'รายการ' },
      isToday ? { ic: 'activity', l: 'กำลังเดินทาง', v: states.filter(k => k === 'ontrip').length, u: 'คัน' } : { ic: 'van', l: 'รถที่มีคิว', v: used.size, u: 'คัน' },
      isToday ? { ic: 'van', l: 'รถว่างตอนนี้', v: states.filter(k => k === 'free').length, u: `/ ${vs.length}` } : { ic: 'checkCircle', l: 'รถไม่มีคิว', v: vs.filter(v => !used.has(v.id)).length, u: `/ ${vs.length}` },
      { ic: 'student', l: 'นักเรียนเดินทาง', v: p.s, u: 'คน' },
      { ic: 'teacher', l: 'ครูเดินทาง', v: p.t, u: 'คน' }
    ].map(k => `<div><small>${icon(k.ic)}${k.l}</small><b class="num"><span data-count="${k.v}">0</span><em>${k.u}</em></b></div>`).join('')}</div>`;
  }
  function timeline(list) {
    const n = new Date();
    let placed = false, html = '';
    list.forEach(r => {
      if (!placed && new Date(r.startAt) > n) { placed = true; html += `<div class="now-mark">ตอนนี้ ${fmt.time(n)} น.</div>`; }
      html += `<div class="tl-item st-${r.status}">${C.pass(r, { href: S.isAdmin(S.me) ? `#/admin/requests/${r.id}` : r.requester.email === (S.me || {}).email ? `#/my/${r.id}` : '' })}</div>`;
    });
    if (!placed) html += `<div class="now-mark">ตอนนี้ ${fmt.time(n)} น.</div>`;
    return list.length ? `<div class="timeline">${html}</div>` : UI.empty('วันนี้ยังไม่มีรายการใช้รถ', 'calendar');
  }

  // ═════════ หน้าแรก ═════════
  Pages.home = ({ query }) => {
    const s = S.db.settings, logged = inn();
    const day = dayFromQuery(query), isToday = UI.sameDay(day, new Date());
    const today = logged ? tripsOn(day) : [];
    const vs = S.db.vehicles.filter(v => v.bookable !== false);
    const now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = S.db.requests.filter(r => ['returned', 'closed', 'ontrip', 'approved'].includes(r.status) && new Date(r.startAt) >= monthStart && new Date(r.startAt) <= now);
    // จุดหมายบนแผนที่จำลอง: สถานที่ยอดนิยม (วางตามทิศ/ระยะจริงจากโรงเรียน)
    const SCH = [150, 300], sc = s.school || {};
    const top = S.db.places.filter(p => p.lat != null).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 4);
    const COLORS = ['#24307a', '#c9962b', '#c2410c', '#0f766e'];
    const dests = (top.length >= 3 ? top : [{ name: 'สวทช.', km: 31, lat: 14.079, lng: 100.604 }, { name: 'ม.เกษตรฯ บางเขน', km: 44, lat: 13.847, lng: 100.5717 }, { name: 'เขาใหญ่', km: 165, lat: 14.439, lng: 101.372 }, { name: 'สพม.ปทุมธานี', km: 24, lat: 14.0167, lng: 100.53 }]).map((p, i) => {
      const dy = (p.lat - (sc.lat || 14.04)), dx = (p.lng - (sc.lng || 100.38)) * Math.cos((sc.lat || 14) * Math.PI / 180);
      const ang = Math.atan2(dy, dx), r = Math.min(330, 70 + 85 * Math.log2(1 + (p.km || 20) / 15));
      const x = Math.max(60, Math.min(545, SCH[0] + r * Math.cos(ang))), y = Math.max(110, Math.min(430, SCH[1] - r * Math.sin(ang)));
      return { n: p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name, full: p.name, km: p.km || 0, p: [x, y], c: COLORS[i % 4] };
    });
    const curve = (a, b, k) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return `M${a[0]} ${a[1]} Q ${mx - dy * k} ${my + dx * k} ${b[0]} ${b[1]}`; };
    const pct = p => `left:${p[0] / 6}%;top:${p[1] / 4.7}%`;
    const bus = vs.find(v => v.kind === 'bus');
    const html = `
    <section class="hero">
      <div class="hex"></div>
      <svg class="contours" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-50 700 C 200 600, 380 760, 620 650 S 1000 520, 1500 640"/><path d="M-50 740 C 220 640, 400 800, 640 690 S 1020 560, 1500 680"/><path d="M-50 780 C 240 680, 420 840, 660 730 S 1040 600, 1500 720"/>
        <path d="M-50 160 C 260 240, 520 80, 760 170 S 1180 260, 1500 140"/><path d="M-50 200 C 260 280, 520 120, 760 210 S 1180 300, 1500 180"/>
      </svg>
      <div class="container hero-grid">
        <div>
          <div class="eyebrow reveal">${esc(s.division)}</div>
          <h1 class="reveal" style="--d:.08s"><span>ระบบยานพาหนะ</span><span class="m">ขอรถส่วนกลาง<svg viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4 14 C 60 4, 120 18, 180 8 S 270 6, 296 12"/></svg></span></h1>
          <p class="lead reveal" style="--d:.16s">บริการรถตู้ รถบัส ให้แก่คุณครูและบุคลากรทุกท่านในโรงเรียน</p>
          <div class="hero-cta reveal" style="--d:.3s">${(() => {
            const mine = logged ? S.myRequests().filter(r => ['pending', 'revise', 'approved', 'ontrip'].includes(r.status)).length : 0;
            const tile = (cls, href, ic, t, sub, badge = '') => `<a class="cta-tile ${cls}" href="${href}"><span class="ci">${icon(ic)}</span><span class="ct"><b>${t}</b><small>${sub}</small></span>${badge}${icon('chevR', 'go')}</a>`;
            const debt = logged ? S.memoDebts(S.me.email).length : 0;
            return tile('t-primary', '#/request', 'filePlus', 'ขอใช้รถ', debt ? 'ค้างบันทึกข้อความ — แนบก่อน' : 'ส่งคำขอใหม่', debt ? `<span class="cnt" title="ค้างบันทึกข้อความ">${debt}</span>` : '')
              + tile('t-gold', '#/schedule', 'calendar', 'ตารางรถว่าง', 'ดูว่ารถว่างวันไหน')
              + tile('t-plain', '#/my', 'clipboard', 'การขอใช้รถของฉัน', 'ติดตามสถานะคำขอ', mine ? `<span class="cnt" title="คำขอที่ยังไม่เสร็จ">${mine}</span>` : '');
          })()}</div>
          <div class="stats-inline reveal" style="--d:.38s">${logged ? `
            <div><b class="num" data-count="${vs.length}">0</b><small>คันพร้อมให้บริการ</small></div>
            <div><b class="num" data-count="${month.length}">0</b><small>การเดินทางเดือนนี้</small></div>
            <div><b class="num" data-count="${Math.round(month.reduce((a, r) => a + (+r.totalKm || 0), 0))}">0</b><small>กม. เดือนนี้</small></div>` : `
            <div><b>${s.leadDays} วัน</b><small>ขอล่วงหน้าอย่างน้อย</small></div><div><b>เรียลไทม์</b><small>ติดตามสถานะรถ</small></div><div><b>ทุกทริป</b><small>ประเมินคนขับ</small></div>`}
          </div>
        </div>
        <div class="map-wrap reveal" style="--d:.15s">
          <div class="mapcard">
            <svg class="map" viewBox="0 0 600 470" aria-hidden="true">
              <ellipse class="park" cx="470" cy="120" rx="110" ry="70"/><ellipse class="park" cx="90" cy="400" rx="90" ry="50"/><ellipse class="park" cx="330" cy="250" rx="50" ry="34"/>
              <path class="river" d="M250 -20 C 220 80, 300 160, 260 250 S 200 380, 260 500"/>
              <path class="road-w" d="M-10 330 L 610 290"/><path class="road-w" d="M170 -10 L 200 480"/><path class="road-w" d="M-10 120 C 200 140, 380 60, 610 90"/>
              <path class="road-t" d="M-10 220 L 610 200"/><path class="road-t" d="M400 -10 L 430 480"/><path class="road-t" d="M60 -10 L 90 480"/><path class="road-t" d="M520 480 L 560 -10"/>
              ${dests.map((d, i) => { const path = curve(SCH, d.p, i % 2 ? .22 : -.22); return `<path class="rt-base" d="${path}" stroke="${d.c}"/><path class="rt-draw" id="hr${i}" d="${path}" stroke="${d.c}" style="animation-delay:${.4 + i * .35}s"/><path class="rt" d="${path}" stroke="#fff"/><circle r="7" fill="#fff" stroke="${d.c}" stroke-width="3"><animateMotion dur="${5 + i * 1.3}s" repeatCount="indefinite" begin="${i * .6}s" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"><mpath href="#hr${i}"/></animateMotion></circle>`; }).join('')}
            </svg>
            <div class="msearch">${icon('pin')}<span class="typed" id="typed"></span><span class="km" id="kmchip">— กม.</span></div>
            <div class="school-pin" style="${pct(SCH)}"><img src="images/logo.png" alt="โรงเรียน"></div>
            ${dests.map((d, i) => `<div class="pinlbl" style="${pct(d.p)};--c:${d.c};--d:${.8 + i * .2}s"><span class="tg">${esc(d.n)}<em>${d.km} กม.</em></span><svg class="pn" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`).join('')}
            <span class="longdo">${Maps.enabled ? 'ปักหมุดปลายทางด้วย Longdo Map' : 'แผนที่จำลอง · ใช้งานจริงผ่าน Longdo Map'}</span>
          </div>
          <div class="bus-badge"><img src="images/bus-side.jpg" alt="รถบัสโรงเรียน"><div><strong>${bus ? `${esc(bus.name)} ${bus.seats} ที่นั่ง` : 'รถบัสโรงเรียน'}</strong><small>${bus ? esc(bus.plate) : 'พร้อมให้บริการ'}</small></div></div>
        </div>
      </div>
    </section>
    <section class="dash navy" id="dashboard">
      <div class="container">
        <div class="page-head reveal" style="margin-bottom:24px">
          <div><span class="chip-live"><i></i>LIVE ROUTE · เรียลไทม์</span><h2 class="dash-title">${isToday ? 'เส้นทางการเดินทางวันนี้' : 'เส้นทางการเดินทาง'}</h2><p class="dash-sub">${fmt.dateLong(day)}</p></div>
          <div class="clock-wrap"><span class="clock-big num" data-clock></span><small>อัปเดตเมื่อคนขับกดออกเดินทาง / กลับถึง</small></div>
        </div>
        ${logged ? `
          ${summaryStrip(today, day)}
          <div class="rail-head"><h3>${icon('grid')} ลานจอดรถตอนนี้ <small>ช่องว่าง = รถออกไปปฏิบัติภารกิจ</small></h3><a class="btn btn-ghost btn-sm" href="#/schedule?tab=calendar">${icon('calendar')} ดูปฏิทินการใช้รถทั้งหมด</a></div>
          ${C.parkBoard(vs)}
          <div class="rail-head" id="board">
            <h3>${icon('route')} ${isToday ? 'กระดานเที่ยวรถวันนี้' : `กระดานเที่ยวรถ ${fmt.date(day)}`} <small>${today.length} เที่ยว</small></h3>
            ${C.dayPicker(day, '#/?date=', { dark: true })}
          </div>
          ${C.board(today, { hrefOf: hrefOfReq, day })}` : `
          <div class="locked"><div class="lock-blur">
            <div class="strip">${['การเดินทางวันนี้', 'กำลังเดินทาง', 'รถว่างตอนนี้', 'นักเรียนเดินทาง', 'ครูเดินทาง'].map(l => `<div><small>${l}</small><b>••</b></div>`).join('')}</div>
            <div class="dgrid"><div class="stack">${[1, 2, 3].map(() => `<div class="pass"><div class="pass-main"><div class="route"><div class="pt"><b>09:00</b></div><div class="rline"></div><div class="pt r"><b>15:30</b></div></div><h4>ปลายทางการเดินทาง</h4><p class="pl">รายละเอียดภารกิจ</p></div><div class="pass-stub"><div class="full"><small>ผู้ขอใช้รถ</small><span>ครู ••••</span></div></div></div>`).join('')}</div><div class="card" style="height:420px"></div></div>
          </div>${C.lockCard()}</div>`}
      </div>
    </section>`;
    return {
      html, patch: true,
      mount(root) {
        // เปลี่ยนวันที่แล้ว เลื่อนลงไปที่กระดานเที่ยวรถ
        if (query.date && mountedOnce.home !== query.date) { const b = $('#board', root); if (b) setTimeout(() => scrollTo({ top: b.getBoundingClientRect().top + scrollY - 100, behavior: 'smooth' }), 80); }
        mountedOnce.home = query.date || '';
        const typed = $('#typed', root), kmc = $('#kmchip', root);
        let qi = 0, alive = true, timer = 0;
        const loop = () => {
          if (!alive || !document.body.contains(typed)) return;
          const d = dests[qi % dests.length]; let i = 0;
          kmc.textContent = 'กำลังค้นหา…';
          timer = setInterval(() => {
            if (!document.body.contains(typed)) { clearInterval(timer); alive = false; return; }
            typed.textContent = d.full.slice(0, ++i);
            if (i >= d.full.length) { clearInterval(timer); kmc.textContent = `${d.km} กม. จากโรงเรียน`; setTimeout(() => { qi++; loop(); }, 2400); }
          }, 70);
        };
        loop();
      },
      tick() { $$('[data-clock]').forEach(el => { el.textContent = new Date().toLocaleTimeString('th-TH', { hour12: false }); }); }
    };
  };

  // ═════════ เข้าสู่ระบบ ═════════
  Pages.login = ({ query }) => {
    const next = query.next || '';
    const demoGoogle = S.LOCAL ? S.db.users.filter(u => u.provider === 'google').slice(0, 6) : [];
    return {
      layout: 'bare', live: false,
      html: `
      <div class="auth">
        <div class="auth-art">
          <img class="bg" src="images/school.jpg" alt="">
          <a href="#/" class="brand" style="position:absolute;top:28px;left:32px;z-index:3">${C.atom()}<span><strong style="color:#fff">ระบบยานพาหนะ</strong><small style="color:var(--gold-2)">PCSHS PATHUM THANI</small></span></a>
          <h2>ขอใช้รถส่วนกลาง<br><em>ง่าย รวดเร็ว ตรวจสอบได้</em></h2>
          <p>บริการรถตู้ รถบัส ให้แก่คุณครูและบุคลากรทุกท่านในโรงเรียน — ${esc(S.db.settings.division)}</p>
        </div>
        <div class="auth-form"><div class="auth-box">
          ${C.atom()}
          <h1>เข้าสู่ระบบ</h1>
          <p>ครูและบุคลากร: ใช้อีเมล <b>@${esc(S.DOMAINS[0])}</b></p>
          ${S.authError ? `<div class="note-box red" style="margin-top:16px">${icon('alert')}<div>${esc(S.authError)}</div></div>` : ''}
          <div style="margin-top:22px"><button class="btn btn-ghost gbtn" id="gBtn">${icon('google')} เข้าสู่ระบบด้วย Google</button></div>
          ${S.LOCAL ? `<div class="demo-accts" id="demoG" hidden>${demoGoogle.map(u => `<button data-em="${esc(u.email)}">${UI.avatar(u.name)}<span><b>${esc(u.name)}</b><small>${esc(u.email)} · ${(u.roles || []).map(r => S.ROLES[r]).join(', ')}</small></span></button>`).join('')}</div>` : ''}
          <div class="or">หรือ สำหรับแอดมิน / พนักงานขับรถ</div>
          <form id="uForm" class="stack" autocomplete="on">
            <div class="field"><label>ชื่อผู้ใช้ / เบอร์โทร (สำหรับคนขับ)</label><input name="u" autocomplete="username" required autocapitalize="none" placeholder="เช่น 0812345678"></div>
            <div class="field"><label>รหัสผ่าน</label><div class="pw-wrap"><input name="p" type="password" autocomplete="current-password" required><button type="button" data-eye aria-label="แสดงรหัสผ่าน">${icon('eye')}</button></div></div>
            <button class="btn btn-primary btn-block" type="submit">${icon('login')} เข้าสู่ระบบ</button>
          </form>
          ${S.LOCAL ? `<div class="note-box navy" style="margin-top:16px">${icon('flask')}<div><b>โหมดทดลอง</b> — แอดมิน: <code>admin</code> / <code>admin1234</code> · คนขับ: <code>sawong</code> / <code>1234</code> · หรือกดปุ่ม Google เพื่อเลือกบัญชีตัวอย่าง</div></div>` : ''}
          <p class="hint" style="margin-top:18px">ลืมรหัสผ่าน / ยังไม่มีบัญชี กรุณาติดต่อแอดมินงานยานพาหนะ</p>
        </div></div>
      </div>`,
      mount(root) {
        const after = () => App.go(next || '#/');
        $('#gBtn', root).addEventListener('click', e => {
          if (S.LOCAL) { $('#demoG', root).hidden = !$('#demoG', root).hidden; return; }
          UI.busy(e.currentTarget, () => S.loginGoogle()).then(after).catch(() => {});
        });
        root.addEventListener('click', e => {
          const b = e.target.closest('[data-em]'); if (b) UI.busy(b, () => S.loginGoogle(b.dataset.em)).then(after).catch(() => {});
          const eye = e.target.closest('[data-eye]'); if (eye) { const i = eye.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }
        });
        $('#uForm', root).addEventListener('submit', e => {
          e.preventDefault();
          const f = UI.formData(e.target);
          UI.busy(e.target.querySelector('[type=submit]'), () => S.loginUsername(f.u, f.p)).then(() => { const me = S.me; App.go(next || (S.isDriver(me) && !S.isBack(me) ? '#/driver' : S.isBack(me) ? '#/admin' : '#/')); }).catch(() => {});
        });
      }
    };
  };

  // ═════════ โปรไฟล์ / รหัสผ่าน ═════════
  Pages.profile = () => {
    const me = S.me, first = me.needsProfile;
    return {
      live: false,
      html: `<div class="page"><div class="container" style="max-width:760px">
        <div class="page-head"><div><div class="eyebrow">โปรไฟล์</div><h1>${first ? 'ยินดีต้อนรับ! กรอกข้อมูลก่อนเริ่มใช้งาน' : 'โปรไฟล์ของฉัน'}</h1><p>${first ? 'ข้อมูลนี้จะใช้เป็นผู้ขอใช้รถในทุกคำขอ แก้ไขได้ภายหลัง' : 'ข้อมูลผู้ขอใช้รถ'}</p></div></div>
        <form class="form-section" id="pf">
          <div class="row" style="margin-bottom:18px">${UI.avatar(me.name || me.email, 'lg')}<div><b style="font-family:var(--font-display)">${esc(S.isUsernameEmail(me.email) ? 'ชื่อผู้ใช้: ' + S.usernameOf(me.email) : me.email)}</b><div class="hint">${(me.roles || []).map(r => S.ROLES[r]).join(' · ')}</div></div></div>
          <div class="grid2">
            <div class="field full"><label>ชื่อ-นามสกุล (พร้อมคำนำหน้า) <b class="req">*</b></label><input name="name" required value="${esc(me.name)}" placeholder="เช่น นางสาวสมใจ รักวิทยา"></div>
            <div class="field"><label>ตำแหน่ง</label><input name="position" value="${esc(me.position || '')}" placeholder="เช่น ครู, ครูชำนาญการ"></div>
            <div class="field"><label>ฝ่าย / กลุ่มสาระ <b class="req">*</b></label><select name="dept" required><option value="">เลือก…</option>${S.DEPTS.map(d => `<option ${d === me.dept ? 'selected' : ''}>${esc(d)}</option>`).join('')}${me.dept && !S.DEPTS.includes(me.dept) ? `<option selected>${esc(me.dept)}</option>` : ''}</select></div>
            <div class="field"><label>เบอร์โทรศัพท์ <b class="req">*</b></label><input name="phone" type="tel" required value="${esc(me.phone || '')}" placeholder="08x-xxx-xxxx"></div>
          </div>
          <div class="form-actions" style="position:static;background:none;padding-bottom:0"><button class="btn btn-primary" type="submit">${icon('check')} บันทึก${first ? 'และเริ่มใช้งาน' : ''}</button></div>
        </form></div></div>`,
      mount(root) {
        $('#pf', root).addEventListener('submit', e => {
          e.preventDefault();
          const f = UI.formData(e.target);
          if (!f.name.trim() || !f.dept || !f.phone.trim()) return UI.toast('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ', 'error');
          UI.busy(e.target.querySelector('[type=submit]'), () => S.saveProfile(f)).then(() => { UI.toast('บันทึกโปรไฟล์แล้ว'); if (first) App.go(S.isDriver(S.me) && !S.isBack(S.me) ? '#/driver' : '#/'); }).catch(() => {});
        });
      }
    };
  };
  Pages.password = () => {
    const forced = S.me.mustChangePassword;
    return {
      live: false,
      html: `<div class="page"><div class="container" style="max-width:560px">
        <div class="page-head"><div><div class="eyebrow">ความปลอดภัย</div><h1>${forced ? 'ตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน'}</h1><p>${forced ? 'แอดมินตั้งรหัสผ่านชั่วคราวให้ กรุณาตั้งรหัสผ่านใหม่ของคุณเองก่อนใช้งาน' : 'สำหรับบัญชีชื่อผู้ใช้ (username)'}</p></div></div>
        <form class="form-section stack" id="pw">
          <div class="field"><label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label><input name="a" type="password" minlength="6" required autocomplete="new-password"></div>
          <div class="field"><label>ยืนยันรหัสผ่านใหม่</label><input name="b" type="password" minlength="6" required autocomplete="new-password"></div>
          <button class="btn btn-primary" type="submit">${icon('key')} บันทึกรหัสผ่าน</button>
        </form></div></div>`,
      mount(root) {
        $('#pw', root).addEventListener('submit', e => {
          e.preventDefault();
          const f = UI.formData(e.target);
          if (f.a !== f.b) return UI.toast('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'error');
          UI.busy(e.target.querySelector('[type=submit]'), () => S.changeOwnPassword(f.a)).then(() => { UI.toast('เปลี่ยนรหัสผ่านแล้ว'); App.go(S.me.needsProfile ? '#/profile' : S.isDriver(S.me) && !S.isBack(S.me) ? '#/driver' : '#/'); }).catch(() => {});
        });
      }
    };
  };

  // ───────── ตัวเลือกหมวดงาน (ใช้ในฟอร์มขอใช้รถ + หน้าพิจารณาของแอดมิน) ─────────
  function catPicker(sel = '', other = '', name = 'category') {
    const cats = S.categories();
    // หมวดที่ถูกซ่อนแล้วแต่คำขอเดิมใช้อยู่ ยังแสดงให้เลือกค้างไว้
    if (sel && !cats.some(c => c.id === sel) && S.catOf(sel)) cats.push(S.catOf(sel));
    return `<div class="cat-pick" data-cat-pick>${cats.map(c => `<label class="cat-opt"><input type="radio" name="${name}" value="${esc(c.id)}" ${c.id === sel ? 'checked' : ''}><span>${icon(c.icon || 'info')}${esc(c.id === 'other' ? 'อื่น ๆ' : c.name)}</span></label>`).join('')}</div>
      <input class="input cat-other" name="${name}Other" placeholder="ระบุหมวดงาน" value="${esc(other || '')}" ${sel === 'other' ? '' : 'hidden'} style="margin-top:10px">`;
  }
  function bindCatPicker(root, name = 'category') {
    const box = root.querySelector('[data-cat-pick]'); if (!box) return;
    const other = root.querySelector(`[name="${name}Other"]`);
    box.addEventListener('change', () => { const v = (box.querySelector('input:checked') || {}).value; other.hidden = v !== 'other'; if (v === 'other') other.focus(); });
  }
  Pages._catPicker = { html: catPicker, bind: bindCatPicker };

  // ── เลือกเวลา: ชั่วโมงแยกตามช่วงวัน + นาทีทีละ 5 + พิมพ์เองได้ · บอกช่วงเวลา (เช้า/บ่าย/ค่ำ) กันเลือกผิด ──
  const pad2 = n => String(n).padStart(2, '0');
  const period = t => { const h = +String(t || '').slice(0, 2); return h < 4 ? 'กลางดึก' : h < 6 ? 'เช้ามืด' : h < 12 ? 'เช้า' : h < 13 ? 'เที่ยง' : h < 16 ? 'บ่าย' : h < 19 ? 'เย็น' : 'ค่ำ'; };
  const oddTime = t => { const h = +String(t || '').slice(0, 2); return h < 5 || h >= 21; };
  const parseTime = s => {
    const m = String(s || '').trim().replace(/\s*น\.?$/, '').match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?$/);
    if (!m || +m[1] > 23 || +(m[2] || 0) > 59) return null;
    return `${pad2(+m[1])}:${pad2(+(m[2] || 0))}`;
  };
  function timeField(id, val) {
    return `<input type="hidden" id="${id}" value="${val}"><button type="button" class="tp-btn${oddTime(val) ? ' odd' : ''}" data-tp="${id}"><b class="tp-v">${val}</b><span class="tp-n">น.</span><small class="tp-p">${period(val)}</small>${icon('clock')}</button>`;
  }
  const syncTimeBtn = (root, id) => {
    const inp = root.querySelector('#' + id), b = root.querySelector(`[data-tp="${id}"]`); if (!inp || !b) return;
    b.querySelector('.tp-v').textContent = inp.value; b.querySelector('.tp-p').textContent = period(inp.value); b.classList.toggle('odd', oddTime(inp.value));
  };
  function pickTime(cur, title) {
    let [h, m] = String(cur || '08:00').split(':').map(Number);
    const G = [['เช้า', 6, 11], ['บ่าย – เย็น', 12, 17], ['ค่ำ', 18, 23], ['กลางดึก – เช้ามืด', 0, 5]];
    const body = `<div class="tp-pick">
      <div class="tp-show"><b id="tpV"></b> น. <span id="tpP"></span></div>
      <div class="tp-lab">ชั่วโมง</div>
      ${G.map(([n, a, b]) => `<div class="tp-g"><small>${n}</small><div class="tp-grid">${Array.from({ length: b - a + 1 }, (_, i) => a + i).map(x => `<button type="button" data-h="${x}">${pad2(x)}</button>`).join('')}</div></div>`).join('')}
      <div class="tp-lab">นาที</div>
      <div class="tp-grid">${Array.from({ length: 12 }, (_, i) => i * 5).map(x => `<button type="button" data-m="${x}">${pad2(x)}</button>`).join('')}</div>
      <div class="field tp-own"><label for="tpIn">หรือพิมพ์เวลาเอง (24 ชม. เช่น บ่าย 4 โมง = 16.00)</label><input id="tpIn" inputmode="decimal" placeholder="เช่น 13.20" autocomplete="off"></div>
    </div>`;
    return UI.modal({
      title: `${icon('clock')} ${esc(title)}`, body,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'ตกลง', kind: 'btn-primary', onClick: el => {
        const typed = el.querySelector('#tpIn').value.trim();
        if (typed && !parseTime(typed)) { UI.toast('รูปแบบเวลาไม่ถูกต้อง — พิมพ์เช่น 08.30 หรือ 16.00', 'error'); return false; }
        return `${pad2(h)}:${pad2(m)}`;
      } }],
      onOpen(el) {
        const draw = () => {
          const t = `${pad2(h)}:${pad2(m)}`;
          el.querySelector('#tpV').textContent = t; el.querySelector('#tpP').textContent = period(t);
          el.querySelector('.tp-show').classList.toggle('odd', oddTime(t));
          el.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('on', +b.dataset.h === h));
          el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', +b.dataset.m === m));
        };
        el.addEventListener('click', e => {
          const hb = e.target.closest('[data-h]'), mb = e.target.closest('[data-m]');
          if (hb) h = +hb.dataset.h; if (mb) m = +mb.dataset.m;
          if (hb || mb) { el.querySelector('#tpIn').value = ''; draw(); }
        });
        el.querySelector('#tpIn').addEventListener('input', e => { const t = parseTime(e.target.value); if (t) { [h, m] = t.split(':').map(Number); draw(); } });
        draw();
      }
    });
  }
  // ═════════ ฟอร์มขอใช้รถ (ใช้ร่วมกับแอดมินบันทึกเร่งด่วน) ═════════
  function requestFormHTML(r, { admin = false, copies = [] } = {}) {
    const lead = +S.db.settings.leadDays || 0;
    const minD = new Date(); minD.setDate(minD.getDate() + lead); minD.setHours(0, 0, 0, 0);
    const v = r || {};
    return `
      ${!admin && copies.length ? `<div class="form-section"><h3>${icon('copy')} คัดลอกจากคำขอเดิม <span class="hint" style="font-weight:400">(สำหรับงานที่ไปซ้ำบ่อย)</span></h3>
        <div class="row"><select class="input" id="copyFrom" style="flex:1;min-width:240px"><option value="">เลือกคำขอเดิม…</option>${copies.map(c => `<option value="${c.id}">${fmt.date(c.startAt)} · ${esc(S.destName(c))} · ${esc(c.purpose)}</option>`).join('')}</select><button type="button" class="btn btn-ghost" id="copyBtn">${icon('copy')} คัดลอก</button></div></div>` : ''}
      <div class="form-section"><h3><span class="n">1</span>ภารกิจ</h3>
        <div class="field" style="margin-bottom:14px"><label>หมวดงาน <b class="req">*</b> <span class="hint" style="font-weight:400">(ใช้ทำสถิติแยกตามหมวด)</span></label>
          ${catPicker(v.category, v.categoryOther)}</div>
        <div class="grid2">
          <div class="field full"><label>วัตถุประสงค์ในการขอใช้รถ <b class="req">*</b></label><input name="purpose" required value="${esc(v.purpose || '')}" placeholder="เช่น นำนักเรียนเข้าร่วมการแข่งขันโครงงานวิทยาศาสตร์"></div>
          <div class="field full"><label>ชื่องาน / โครงการ</label><input name="project" value="${esc(v.project || '')}" placeholder="(ถ้ามี)"></div>
        </div></div>
      <div class="form-section"><h3><span class="n">2</span>สถานที่ปลายทาง</h3>
        <div class="dest-list" id="dests"></div>
        <button type="button" class="btn btn-ghost" id="addDest" style="margin-top:12px">${icon('plus')} เพิ่มสถานที่${Maps.enabled ? ' (ค้นหา/ปักหมุด)' : ''}</button>
        <p class="hint" id="kmInfo" style="margin-top:10px"></p></div>
      <div class="form-section"><h3><span class="n">3</span>วันและเวลา</h3>
        <div class="field"><label>ลักษณะการเดินทาง <b class="req">*</b></label>
          <div class="trip-pick">${Object.entries(S.TRIP).map(([k, t]) => `<label class="trip-opt"><input type="radio" name="tripType" value="${k}" ${k === (v.startAt ? S.tripType(v) : (v.tripType || 'day')) ? 'checked' : ''}><span>${icon(t.icon)}<b>${t.label}</b><small>${t.hint}</small></span></label>`).join('')}</div></div>
        <input type="hidden" name="startAt" value="${fmt.local(v.startAt)}"><input type="hidden" name="endAt" value="${fmt.local(v.endAt)}">
        <div class="dt-grid">
          <div class="dt-box"><div class="dt-head">${icon('navigation')} <span data-lbl="out">ออกเดินทาง</span></div>
            <div class="dt-row">
              <div class="field"><label for="dDate">วันที่ <b class="req">*</b></label><input type="date" id="dDate" value="${fmt.localDate(v.startAt)}" ${!admin ? `min="${fmt.localDate(minD)}"` : ''}></div>
              <div class="field"><label data-lbl="sTime">เวลาออก <b class="req">*</b></label>${timeField('sTime', v.startAt ? fmt.time(v.startAt) : '08:00')}</div>
            </div><small class="dt-th" id="dTh"></small></div>
          <div class="dt-box"><div class="dt-head">${icon('home')} <span data-lbl="back">กลับถึงโรงเรียน</span></div>
            <div class="dt-row">
              <div class="field" id="rDateF"><label for="rDate" data-lbl="rDate">วันที่กลับ <b class="req">*</b></label><input type="date" id="rDate" value="${fmt.localDate(v.endAt)}" ${!admin ? `min="${fmt.localDate(minD)}"` : ''}></div>
              <div class="field"><label data-lbl="eTime">เวลากลับถึง <b class="req">*</b></label>${timeField('eTime', v.endAt ? fmt.time(v.endAt) : '16:00')}</div>
            </div><small class="dt-th" id="rTh"></small></div>
        </div>
        <div class="field" id="lodgeF" hidden style="margin-top:14px"><label>${icon('moon')} สถานที่พัก (ค้างคืน)</label><input name="lodging" value="${esc(v.lodging || '')}" placeholder="เช่น โรงแรม/ที่พักของหน่วยงานผู้จัด"></div>
        <div class="trip-sum" id="dayInfo"></div>
        <div class="note-box warn-y" id="timeWarn" hidden style="margin-top:10px"></div>
        <div class="note-box navy" id="onewayNote" hidden style="margin-top:12px">${icon('info')}<div><b>ต้องไปรับกลับในภายหลัง?</b> ให้ส่งคำขออีก 1 รายการสำหรับเที่ยวรับ (ใช้ "คัดลอกจากคำขอเดิม" ด้านบนได้ ไม่ต้องกรอกใหม่) เพื่อให้แอดมินจัดรถได้ถูกช่วงเวลา และรถว่างให้งานอื่นระหว่างรอ</div></div>
        ${!admin ? `<p class="hint" id="leadHint" style="margin-top:10px" data-normal="ต้องขอใช้รถล่วงหน้าอย่างน้อย ${lead} วัน (ออกเดินทางได้ตั้งแต่ ${esc(fmt.dateMid(minD))}) · กรณีเร่งด่วนโทรหาแอดมิน" data-quick="งานประจำ (${esc(S.categories().filter(c => S.isQuickCat(c.id)).map(c => c.name).join(' / '))}) ขอในวันเดียวกันได้ แต่ต้องก่อนเวลาออกอย่างน้อย ${S.quickHours()} ชั่วโมง · ด่วนกว่านี้โทรหาแอดมิน"></p>` : ''}</div>
      <div class="form-section"><h3><span class="n">4</span>ผู้เดินทาง</h3>
        <div class="grid3">
          <div class="field"><label>จำนวนครู/บุคลากร <b class="req">*</b></label><input name="teachers" type="number" min="0" required value="${v.teachers ?? 1}"></div>
          <div class="field"><label>จำนวนนักเรียน</label><input name="students" type="number" min="0" value="${v.students ?? 0}"></div>
          <div class="field"><label>บุคคลภายนอก/อื่น ๆ</label><input name="others" type="number" min="0" value="${v.others ?? 0}"></div>
          <div class="field full"><label>รายชื่อผู้ร่วมเดินทาง</label><textarea name="passengerNames" rows="2" placeholder="(ไม่บังคับ) เช่น ครูสมชาย, ครูสมหญิง, นักเรียน ม.5/1 จำนวน 10 คน">${esc(v.passengerNames || '')}</textarea></div>
          <div class="field"><label>จุดนัดขึ้นรถ</label><input name="pickup" value="${esc(v.pickup || 'หน้าอาคารอำนวยการ')}"></div>
          <div class="field"><label>เบอร์ติดต่อระหว่างเดินทาง <b class="req">*</b></label><input name="contactPhone" type="tel" required value="${esc(v.contactPhone || (S.me || {}).phone || '')}"></div>
        </div>
        <div class="seat-meter" id="paxInfo" style="margin-top:14px"></div></div>
      <div class="form-section"><h3><span class="n">5</span>บันทึกข้อความขออนุญาตใช้รถ <span class="hint" id="memoOpt" style="font-weight:400" hidden>(ไม่บังคับ)</span></h3>
        <div class="note-box green" id="quickMemo" hidden style="margin-bottom:12px">${icon('checkCircle')}<div><b>หมวดงานนี้เป็นงานประจำ ไม่ต้องแนบบันทึกข้อความ</b> (ถ้ามีเอกสารประกอบ แนบได้)</div></div>
        <div id="memoNeed">
        <div class="note-box" style="margin-bottom:12px">${icon('info')}<div>แนบรูปหรือไฟล์ PDF ของบันทึกข้อความขออนุญาตใช้รถ ที่มี<b>ลายเซ็นผู้อำนวยการโรงเรียน</b> (หรือผู้รักษาราชการแทน) แอดมินจะตรวจสอบก่อนอนุมัติ</div></div>
        <div class="note-box red clear-tips" style="margin-bottom:12px">${icon('camera')}<div><b>ไฟล์ต้องคมชัด อ่านออกทุกบรรทัด</b> ถ้าไม่ชัดแอดมินจะส่งกลับให้แก้ไข
          <ul><li>ใช้ไฟล์ <b>PDF จากเครื่องสแกน</b> หรือแอปสแกนเอกสาร ดีที่สุด</li><li>ถ้าถ่ายรูป: วางกระดาษบนพื้นเรียบ ถ่าย<b>ตรง ๆ เต็มหน้า</b> ในที่สว่าง ไม่มีเงาบัง ไม่เบลอ</li><li>ต้องเห็น <b>เลขที่หนังสือ วันที่ และลายเซ็น</b> ชัดเจน · ถ้ามีหลายหน้า แนบให้ครบทุกหน้า</li></ul></div></div></div>
        ${C.filePicker('att', v.attachments || [], { label: 'แนบบันทึกข้อความ', pdf: true })}</div>
      <div class="form-section"><h3><span class="n">6</span>หมายเหตุเพิ่มเติม</h3>
        <div class="field"><textarea name="note" rows="3" placeholder="เช่น มีสัมภาระ/อุปกรณ์แข่งขันจำนวนมาก, ต้องการแวะรับวิทยากร">${esc(v.note || '')}</textarea></div></div>`;
  }
  // ผูกการทำงานของฟอร์มขอใช้รถ คืนค่าฟังก์ชันอ่านข้อมูล
  function bindRequestForm(root, r) {
    let dests = (r && r.destinations ? r.destinations : []).map(d => ({ ...d }));
    let total = { km: r ? r.totalKm : 0, mins: r ? r.totalMins : 0, estimated: false };
    const getFiles = C.bindFilePicker(root, 'att', (r && r.attachments) || [], { pdf: true });
    const form = root.querySelector('form') || root;
    const drawDests = async () => {
      $('#dests', root).innerHTML = dests.map((d, i) => `<div class="dest"><span class="n">${i + 1}</span><div style="min-width:0"><b>${esc(d.name)}</b><small>${esc(d.address || d.province || '')}${d.km ? ` · ${d.km} กม. จากโรงเรียน` : ''}${d.mins ? ` · ~${d.mins} นาที` : ''}</small></div><div class="row" style="gap:4px"><button type="button" class="icon-btn sm" data-ed="${i}" aria-label="แก้ไข">${icon('edit')}</button><button type="button" class="icon-btn sm" data-del="${i}" aria-label="ลบ">${icon('trash')}</button></div></div>`).join('') || `<div class="empty" style="padding:22px">${icon('pin')}<p>ยังไม่ได้เลือกสถานที่ปลายทาง</p></div>`;
      if (dests.length) { $('#kmInfo', root).textContent = 'กำลังคำนวณระยะทางรวม…'; total = await Maps.tripTotal(dests); $('#kmInfo', root).innerHTML = `${icon('route')} ระยะทางรวมไป-กลับ ${total.estimated ? 'ประมาณ ' : ''}<b>${fmt.num(total.km, 1)} กม.</b>${total.mins ? ` · เวลาเดินทางเที่ยวเดียว ~${fmt.dur(total.mins * 6e4)}` : ''}`; }
      else $('#kmInfo', root).textContent = '';
    };
    // ── วันและเวลา: เลือกวันที่กับเวลาแยกกัน แล้วรวมเป็น startAt / endAt ──
    const el = id => root.querySelector('#' + id);
    const tripOf = () => (form.querySelector('[name=tripType]:checked') || {}).value || 'day';
    const multi = t => t === 'overnight' || t === 'daily';
    const LBL = {
      day: { out: 'ออกจากโรงเรียน', back: 'กลับถึงโรงเรียน', sTime: 'เวลาออก', eTime: 'เวลากลับถึง', rDate: 'วันที่กลับ' },
      oneway: { out: 'รถออกจากโรงเรียน', back: 'รถกลับถึงโรงเรียน (ประมาณ)', sTime: 'เวลาออก', eTime: 'เวลากลับถึง', rDate: 'วันที่กลับ' },
      overnight: { out: 'วันแรก · ออกจากโรงเรียน', back: 'วันสุดท้าย · กลับถึงโรงเรียน', sTime: 'เวลาออก', eTime: 'เวลากลับถึง', rDate: 'วันที่กลับ' },
      daily: { out: 'วันแรก · ออกทุกวันเวลา', back: 'วันสุดท้าย · กลับทุกวันเวลา', sTime: 'เวลาออก', eTime: 'เวลากลับถึง', rDate: 'วันสุดท้าย' }
    };
    const addDays = (ymd, n) => { const d = UI.dayOf(ymd); d.setDate(d.getDate() + n); return fmt.localDate(d); };
    const syncTrip = () => {
      const t = tripOf(), L = LBL[t];
      root.querySelectorAll('[data-lbl]').forEach(x => { const req = x.tagName === 'LABEL' ? ' <b class="req">*</b>' : ''; x.innerHTML = esc(L[x.dataset.lbl]) + req; });
      el('rDateF').hidden = !multi(t);
      const d = el('dDate').value;
      if (!multi(t)) el('rDate').value = d;
      else if (d && (!el('rDate').value || el('rDate').value <= d)) el('rDate').value = addDays(d, 1);
      if (d) el('rDate').min = multi(t) ? addDays(d, 1) : d;
      el('lodgeF').hidden = t !== 'overnight';
      el('onewayNote').hidden = t !== 'oneway';
      el('dayInfo').closest('.form-section').dataset.trip = t;
    };
    const drawDays = () => {
      const t = tripOf(), d = el('dDate').value, rd = multi(t) ? el('rDate').value : d, s = el('sTime').value, e = el('eTime').value;
      form.querySelector('[name=startAt]').value = d && s ? `${d}T${s}` : '';
      form.querySelector('[name=endAt]').value = rd && e ? `${rd}T${e}` : '';
      el('dTh').textContent = d ? fmt.dateLong(UI.dayOf(d)) : '';
      el('rTh').textContent = multi(t) && rd ? fmt.dateLong(UI.dayOf(rd)) : '';
      // เวลาผิดปกติ (ก่อนตี 5 / หลัง 3 ทุ่ม) → เตือนให้ตรวจสอบ (มักเกิดจากสับสนเช้า-บ่าย)
      const w = [[s, 'เวลาออก'], [e, 'เวลากลับ']].filter(([x]) => oddTime(x)).map(([x, n]) => `${n} <b>${x} น.</b> (${period(x)})`);
      el('timeWarn').hidden = !w.length;
      el('timeWarn').innerHTML = w.length ? `${icon('alert')}<div>${w.join(' และ ')} — กรุณาตรวจสอบว่าถูกต้อง · ระบบใช้เวลาแบบ 24 ชั่วโมง เช่น บ่ายสี่โมง = <b>16:00 น.</b></div>` : '';
      const box = el('dayInfo'), bad = msg => { box.className = 'trip-sum bad'; box.innerHTML = `${icon('alert')} ${msg}`; };
      if (!d || !rd) { box.className = 'trip-sum'; box.innerHTML = `${icon('calendar')} เลือกวันที่และเวลา`; return; }
      const a = new Date(`${d}T${s}`), b = new Date(`${rd}T${e}`), n = fmt.days(a, b);
      if (multi(t) && n < 2) return bad('ไปหลายวัน — วันกลับต้องเป็นวันถัดไปขึ้นไป');
      if (t === 'daily' && e <= s) return bad('เวลากลับแต่ละวันต้องหลังเวลาออก');
      if (b <= a) return bad('เวลากลับต้องหลังเวลาออกเดินทาง');
      box.className = 'trip-sum';
      const hrs = fmt.dur(b - a);
      box.innerHTML = {
        day: `${icon('route')} <b>ไป-กลับวันเดียว</b> · ${s}–${e} น. (รวม ${hrs})`,
        oneway: `${icon('arrowUR')} <b>ไปส่ง/ไปรับอย่างเดียว</b> · รถออก ${s} น. กลับถึงประมาณ ${e} น.`,
        overnight: `${icon('moon')} <b>รวม ${n} วัน ค้างคืน ${n - 1} คืน</b> · ออก ${fmt.dayMonth(a)} ${s} น. → กลับ ${fmt.dayMonth(b)} ${e} น.`,
        daily: `${icon('refresh')} <b>ไป-กลับทุกวัน ${n} วัน</b> (${fmt.dayMonth(a)} – ${fmt.dayMonth(b)}) · ออก ${s} น. กลับ ${e} น. ทุกวัน · ไม่ค้างคืน`
      }[t];
    };
    ['dDate', 'rDate', 'sTime', 'eTime'].forEach(id => el(id).addEventListener('change', () => {
      if (id === 'dDate') syncTrip();
      // เลือกเวลาออกหลังเวลากลับ (วันเดียวกัน) → เลื่อนเวลากลับให้ +6 ชม. อัตโนมัติ
      if (id === 'sTime' && !multi(tripOf()) && el('eTime').value <= el('sTime').value) { const [h, m] = el('sTime').value.split(':').map(Number); const t = Math.min(23 * 60 + 30, h * 60 + m + 360); el('eTime').value = `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`; syncTimeBtn(root, 'eTime'); }
      drawDays();
    }));
    root.addEventListener('click', async e => {
      const b = e.target.closest('[data-tp]'); if (!b) return;
      const id = b.dataset.tp, L = LBL[tripOf()];
      const v = await pickTime(el(id).value, `${L[id]} · ${L[id === 'sTime' ? 'out' : 'back']}`);
      if (!v || v === el(id).value) return;
      el(id).value = v; syncTimeBtn(root, id);
      el(id).dispatchEvent(new Event('change', { bubbles: true }));
    });
    form.addEventListener('change', e => { if (e.target.name === 'tripType') { syncTrip(); drawDays(); } });
    syncTrip();
    // ── หมวดงานประจำ: ไม่ต้องแนบบันทึกข้อความ + ขอในวันได้ ──
    const dMin0 = el('dDate').getAttribute('min');
    const isQuick = () => S.isQuickCat((form.querySelector('[name=category]:checked') || {}).value);
    const syncCat = () => {
      const q = isQuick();
      el('quickMemo').hidden = !q; el('memoNeed').hidden = q; el('memoOpt').hidden = !q;
      const lh = el('leadHint'); if (lh) lh.innerHTML = `${icon('info')} ${esc(q ? lh.dataset.quick : lh.dataset.normal)}`;
      if (dMin0) el('dDate').min = q ? fmt.localDate(new Date()) : dMin0;
    };
    form.addEventListener('change', e => { if (e.target.name === 'category') syncCat(); });
    syncCat();
    const drawPax = () => {
      const n = ['teachers', 'students', 'others'].reduce((s, k) => s + (+form.querySelector(`[name=${k}]`).value || 0), 0);
      const van = S.db.vehicles.find(v => v.kind === 'van'), bus = S.db.vehicles.find(v => v.kind === 'bus');
      const sug = n <= 0 ? '' : n <= 4 ? 'รถเก๋งหรือรถตู้ 1 คัน' : n <= (van ? van.seats : 12) ? 'รถตู้ 1 คัน' : n <= (bus ? bus.seats : 35) ? `รถบัส หรือรถตู้ ${Math.ceil(n / (van ? van.seats : 12))} คัน` : `รถบัส + รถตู้ หรือหลายคัน`;
      $('#paxInfo', root).innerHTML = `${icon('users')} ผู้เดินทางรวม <b>${n} คน</b>${sug ? ` <span class="muted">· แอดมินจะจัดรถให้ (เช่น ${sug})</span>` : ''}`;
    };
    root.addEventListener('click', async e => {
      if (e.target.closest('#addDest')) { const p = await Maps.pick(); if (p) { dests.push(p); drawDests(); } }
      const ed = e.target.closest('[data-ed]'); if (ed) { const p = await Maps.pick(dests[+ed.dataset.ed]); if (p) { dests[+ed.dataset.ed] = p; drawDests(); } }
      const del = e.target.closest('[data-del]'); if (del) { dests.splice(+del.dataset.del, 1); drawDests(); }
    });
    form.addEventListener('input', e => { if (/teachers|students|others/.test(e.target.name)) drawPax(); });
    drawDests(); drawDays(); drawPax();
    bindCatPicker(root);
    return {
      read() {
        const f = UI.formData(form);
        if (!f.category) throw new Error('กรุณาเลือกหมวดงาน');
        if (f.category === 'other' && !String(f.categoryOther || '').trim()) throw new Error('กรุณาระบุหมวดงาน (อื่น ๆ)');
        if (!f.purpose.trim()) throw new Error('กรุณาระบุวัตถุประสงค์');
        if (!dests.length) throw new Error('กรุณาเลือกสถานที่ปลายทางอย่างน้อย 1 แห่ง');
        drawDays();
        if (!f.startAt || !f.endAt) throw new Error('กรุณาเลือกวันที่ออกเดินทาง' + (multi(tripOf()) ? 'และวันกลับ' : ''));
        if (el('dayInfo').classList.contains('bad')) throw new Error(el('dayInfo').textContent.trim());
        if ((+f.teachers || 0) + (+f.students || 0) + (+f.others || 0) <= 0) throw new Error('กรุณาระบุจำนวนผู้เดินทาง');
        if (!String(f.contactPhone || '').trim()) throw new Error('กรุณาระบุเบอร์ติดต่อ');
        return { ...f, destinations: dests, totalKm: total.km, totalMins: total.mins, attachments: getFiles() };
      },
      fill(src) {
        ['purpose', 'project', 'teachers', 'students', 'others', 'passengerNames', 'pickup', 'contactPhone', 'lodging', 'note'].forEach(k => { const el = form.querySelector(`[name=${k}]`); if (el && src[k] != null) el.value = src[k]; });
        dests = (src.destinations || []).map(d => ({ ...d })); drawDests(); drawPax();
        const tt = form.querySelector(`[name=tripType][value="${src.startAt ? S.tripType(src) : src.tripType}"]`);
        if (tt) { tt.checked = true; syncTrip(); drawDays(); }
        if (src.category) { const rb = form.querySelector(`[name=category][value="${src.category}"]`); if (rb) { rb.checked = true; rb.dispatchEvent(new Event('change', { bubbles: true })); syncCat(); } const o = form.querySelector('[name=categoryOther]'); if (o) o.value = src.categoryOther || ''; }
      }
    };
  }
  Pages._requestForm = { html: requestFormHTML, bind: bindRequestForm };
  function confirmDateTime(data) {
    const a = new Date(data.startAt), b = new Date(data.endAt), t = data.tripType || 'day';
    const tm = d => { const x = fmt.time(d); return `<span class="t${oddTime(x) ? ' odd' : ''}">${x} น. <em>${period(x)}</em></span>`; };
    const row = (lbl, d, ic) => `<div class="dc-row"><span class="dc-ic">${icon(ic)}</span><div><small>${lbl}</small><b>${esc(fmt.dateLong(d))}</b></div>${tm(d)}</div>`;
    const days = fmt.days(a, b);
    const body = `<div class="dt-confirm">
      <div class="dc-trip">${icon(S.TRIP[t].icon)} <b>${esc(S.TRIP[t].label)}</b>${t === 'overnight' ? ` · ${days} วัน ${days - 1} คืน` : t === 'daily' ? ` · ${days} วัน (ออก-กลับ ตามเวลานี้ทุกวัน)` : ''}</div>
      ${row(t === 'daily' ? 'วันแรก · ออกจากโรงเรียน' : 'ออกจากโรงเรียน', a, 'navigation')}
      ${row(t === 'daily' ? 'วันสุดท้าย · กลับถึงโรงเรียน' : 'กลับถึงโรงเรียน', b, 'home')}
      ${oddTime(fmt.time(a)) || oddTime(fmt.time(b)) ? `<div class="note-box warn-y" style="margin-top:4px">${icon('alert')}<div>มีเวลาที่อยู่ช่วง<b>กลางคืน/เช้ามืด</b> — ถ้าตั้งใจเป็นช่วงบ่าย ให้กด "กลับไปแก้" (เช่น บ่ายสี่โมง = 16:00 น.)</div></div>` : ''}
    </div>`;
    return UI.modal({ title: 'ตรวจสอบวันและเวลาก่อนส่ง', body, actions: [{ label: 'กลับไปแก้', value: false }, { label: 'ถูกต้อง ส่งคำขอ', kind: 'btn-primary', icon: 'send', value: true }] }).then(v => v === true);
  }

  Pages.requestForm = ({ params, query }) => {
    const editing = params.id ? S.request(params.id) : null;
    if (params.id && !editing) return { html: `<div class="page container">${UI.empty('ไม่พบคำขอนี้')}</div>` };
    if (editing && editing.requester.email !== S.me.email && !S.isAdmin(S.me)) return { html: `<div class="page container">${UI.empty('ไม่มีสิทธิ์แก้ไขคำขอนี้', 'lock')}</div>` };
    if (editing && !['pending', 'revise'].includes(editing.status) && !S.isAdmin(S.me)) return { html: `<div class="page container">${UI.empty('คำขอนี้แก้ไขไม่ได้แล้ว', 'lock')}</div>` };
    // ค้างบันทึกข้อความ → ต้องแนบให้ครบก่อน จึงขอใช้รถครั้งต่อไปได้
    const debts = editing ? [] : S.memoDebts(S.me.email);
    if (debts.length) return {
      html: `<div class="page"><div class="container" style="max-width:760px">
        <a class="crumb" href="#/">${icon('arrowL')} หน้าแรก</a>
        <div class="page-head"><div><div class="eyebrow">ขอใช้รถ</div><h1>ยังขอใช้รถครั้งใหม่ไม่ได้</h1><p>มีคำขอที่แอดมินบันทึกแทนให้ (กรณีเร่งด่วน) และยังไม่ได้แนบบันทึกข้อความ</p></div></div>
        <div class="note-box red" style="margin-bottom:18px">${icon('alert')}<div>กรุณา<b>แนบบันทึกข้อความขออนุญาตใช้รถ</b>ของคำขอด้านล่างให้ครบก่อน แล้วจะขอใช้รถครั้งต่อไปได้ทันที</div></div>
        <div class="stack">${debts.map(r => `<a class="memo-debt" href="#/my/${r.id}"><span class="md-ic">${icon('filePlus')}</span><span style="min-width:0"><b>${r.id} · ${esc(S.destName(r))}</b><small>${fmt.range(r.startAt, r.endAt)} · ${esc(r.purpose)}</small></span><span class="btn btn-primary btn-sm">แนบบันทึกข้อความ ${icon('chevR')}</span></a>`).join('')}</div>
      </div></div>`
    };
    const copies = S.myRequests().filter(r => r.id !== (editing || {}).id).slice(0, 30);
    const src = query.copy ? S.request(query.copy) : null;
    const init = editing || (src ? { ...src, startAt: '', endAt: '', attachments: [] } : null);
    return {
      live: false,
      html: `<div class="page"><div class="container" style="max-width:900px">
        <a class="crumb" href="${editing ? `#/my/${editing.id}` : '#/'}">${icon('arrowL')} ย้อนกลับ</a>
        <div class="page-head"><div><div class="eyebrow">${editing ? `แก้ไขคำขอ ${editing.id}` : 'คำขอใหม่'}</div><h1>แบบฟอร์มขอใช้รถส่วนกลาง</h1><p>กรอกข้อมูลให้ครบ แอดมินจะเป็นผู้จัดรถและคนขับให้</p></div></div>
        ${editing && editing.status === 'revise' && editing.decision ? `<div class="note-box" style="margin-bottom:18px">${icon('undo')}<div><b>แอดมินขอให้แก้ไข:</b> ${esc(editing.decision.note)}</div></div>` : ''}
        <form id="rf" novalidate>${requestFormHTML(init, { copies: editing ? [] : copies })}
          <div class="form-actions"><a class="btn btn-ghost" href="${editing ? `#/my/${editing.id}` : '#/'}">ยกเลิก</a><button class="btn btn-primary" type="submit">${icon('send')} ${editing ? (editing.status === 'revise' ? 'แก้ไขและส่งใหม่' : 'บันทึกการแก้ไข') : 'ส่งคำขอใช้รถ'}</button></div>
        </form></div></div>`,
      mount(root) {
        const F = bindRequestForm(root, init);
        $('#copyBtn', root)?.addEventListener('click', () => { const r = S.request($('#copyFrom', root).value); if (r) { F.fill(r); UI.toast('คัดลอกข้อมูลแล้ว — กรุณาระบุวันเวลาและแนบบันทึกข้อความใหม่', 'info'); } });
        $('#rf', root).addEventListener('submit', async e => {
          e.preventDefault();
          const btn = e.target.querySelector('[type=submit]');
          let data; try { data = F.read(); } catch (err) { return UI.toast(err.message, 'error'); }
          if (!S.isQuickCat(data.category) && !data.attachments.length) return UI.toast('กรุณาแนบบันทึกข้อความขออนุญาตใช้รถ', 'error');
          // ยืนยันวันเวลาอีกครั้งก่อนส่ง (สำคัญมาก — กันเลือกวัน/เวลาผิด)
          if (!(await confirmDateTime(data))) return;
          UI.busy(btn, () => editing ? S.updateRequest(editing.id, data) : S.submitRequest(data))
            .then(r => { UI.toast(editing ? 'บันทึกแล้ว' : `ส่งคำขอ ${r.id} แล้ว รอแอดมินตรวจสอบ`); App.go(`#/my/${r.id}`); }).catch(() => {});
        });
      }
    };
  };

  // ═════════ ตารางรถ: สถานะวันนี้ / ปฏิทิน ═════════
  Pages.schedule = ({ query }) => {
    const tab = query.tab === 'calendar' ? 'calendar' : 'today';
    const view = query.view === 'week' ? 'week' : 'month';
    const sel = dayStart(UI.dayOf(query.date));
    const vs = S.db.vehicles.filter(v => v.bookable !== false);
    const q = o => '#/schedule?' + new URLSearchParams({ tab, view, date: fmt.localDate(sel), ...o }).toString();
    const isToday = UI.sameDay(sel, new Date());
    const drvShort = r => (r.assignments || []).map(a => C.firstName(C.dName(a.driverId))).filter(Boolean);
    let body = '';
    if (tab === 'today') {
      // ── สถานะรถ (เลือกวันได้): แกนเวลา + กระดานเที่ยวรถ ──
      const list = tripsOn(sel);
      body = `<div class="row between" style="margin-bottom:16px"><h3 style="color:var(--navy)">${fmt.dateLong(sel)}${isToday ? ' <span class="pill tone-ok" style="vertical-align:4px">วันนี้</span>' : ''}</h3>${C.dayPicker(sel, '#/schedule?date=')}</div>
        ${summaryStrip(list, sel)}
        <div class="card gantt-card"><div class="card-head"><h3>${icon('activity')} แกนเวลาการใช้รถ${isToday ? 'วันนี้' : ''}</h3><span class="hint">แต่ละแถว = รถ 1 คัน · กดแท่งงานเพื่อดูคำขอ</span></div>${C.gantt(list, vs, { day: sel, hrefOf: hrefOfReq })}</div>
        <h3 style="margin:30px 0 14px;color:var(--navy);display:flex;gap:10px;align-items:center">${icon('route')} รายการเดินทาง${isToday ? 'วันนี้' : ''} <span class="pill tone-ok">${list.length} เที่ยว</span></h3>
        ${C.board(list, { hrefOf: hrefOfReq, day: sel })}`;
    } else {
      // ── ปฏิทิน (แบบ C): ปฏิทินเล็ก + รายการเรียงตามวัน / สัปดาห์แบบแถบเวลา ──
      const head = `<div class="row between" style="margin-bottom:16px">
        <div class="row"><a class="icon-btn sm" href="${q({ date: fmt.localDate(shift(sel, view, -1)) })}" aria-label="ก่อนหน้า">${icon('chevL')}</a>
          <h3 style="min-width:210px;text-align:center;color:var(--navy)">${view === 'month' ? sel.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : `สัปดาห์ ${fmt.dayMonth(weekStart(sel))} – ${fmt.date(shift(weekStart(sel), 'day', 6))}`}</h3>
          <a class="icon-btn sm" href="${q({ date: fmt.localDate(shift(sel, view, 1)) })}" aria-label="ถัดไป">${icon('chevR')}</a>
          <a class="btn btn-ghost btn-sm" href="${q({ date: fmt.localDate(new Date()) })}">วันนี้</a></div>
        <div class="seg">${[['month', 'เดือน'], ['week', 'สัปดาห์']].map(([k, l]) => `<a href="${q({ view: k })}"><button class="${k === view ? 'on' : ''}" tabindex="-1">${l}</button></a>`).join('')}</div></div>`;
      const legend = `<div class="cv-legend"><span><i class="s-done"></i>กลับแล้ว</span><span><i class="s-live"></i>กำลังเดินทาง</span><span><i class="s-ok"></i>อนุมัติแล้ว</span><span><i class="s-wait"></i>รอจัดรถ</span></div>`;
      const stCls = r => ['returned', 'closed'].includes(r.status) ? 's-done' : r.status === 'ontrip' ? 's-live' : r.status === 'pending' ? 's-wait' : 's-ok';
      if (view === 'month') {
        const first = new Date(sel.getFullYear(), sel.getMonth(), 1), start = shift(first, 'day', -first.getDay());
        const cells = Array.from({ length: 42 }, (_, i) => shift(start, 'day', i));
        const grid = cells[35].getMonth() !== sel.getMonth() ? cells.slice(0, 35) : cells;
        const monthDays = grid.filter(d => d.getMonth() === sel.getMonth());
        const withTrips = monthDays.map(d => ({ d, list: tripsOn(d) })).filter(x => x.list.length);
        const total = new Set(withTrips.flatMap(x => x.list.map(r => r.id))).size;
        body = head + `<div class="cv-split">
          <aside class="card cv-mini">
            <div class="cv-dow">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => `<span class="${i === 0 || i === 6 ? 'we' : ''}">${d}</span>`).join('')}</div>
            <div class="cv-mg">${grid.map(d => { const n = tripsOn(d).length; return `<a class="${d.getMonth() !== sel.getMonth() ? 'out' : ''} ${UI.sameDay(d, new Date()) ? 'today' : ''} ${n ? 'has' : ''} ${UI.sameDay(d, sel) ? 'sel' : ''}" href="${q({ date: fmt.localDate(d), pick: 1 })}" data-n="${n}">${d.getDate()}</a>`; }).join('')}</div>
            <div class="cv-sum"><div><small>การเดินทางเดือนนี้</small><b class="num">${total}</b></div><div><small>วันที่มีการใช้รถ</small><b class="num">${withTrips.length}</b></div></div>
            ${legend}
          </aside>
          <div class="card cv-agenda" id="agenda">${withTrips.map(({ d, list }) => {
            const cars = new Set(list.flatMap(r => (r.assignments || []).map(a => a.vehicleId))).size;
            return `<div class="cv-day" data-day="${fmt.localDate(d)}"><div class="cv-dayh ${UI.sameDay(d, new Date()) ? 'today' : ''} ${UI.sameDay(d, sel) ? 'sel' : ''}"><b class="num">${d.getDate()}</b><span>${d.toLocaleDateString('th-TH', { weekday: 'long' })}${UI.sameDay(d, new Date()) ? ' · วันนี้' : ''}</span><small>${list.length} งาน · ${cars} คัน</small></div>
              ${list.map(r => { const href = hrefOfReq(r), dn = drvShort(r), vn = (r.assignments || []).map(a => C.vName(a.vehicleId));
                return `<div class="cv-ag ${stCls(r)} ${href ? 'link' : ''}" ${href ? `data-href="${href}"` : ''}>
                  <span class="t num">${UI.sameDay(r.startAt, d) ? fmt.time(r.startAt) : 'ต่อเนื่อง'}<small>ถึง ${fmt.when(r.endAt)}</small></span>
                  <div class="w"><b>${esc(S.destName(r))}</b><small>${esc(r.purpose)} · ${esc(r.requester.name)}</small></div>
                  <div class="v">${vn.length ? `<b>${esc(vn.join(', '))}</b><small>${icon('wheel')} ${dn.length ? esc(dn.join(', ')) : 'ยังไม่ระบุคนขับ'}</small>` : '<span class="wt">รอแอดมินจัดรถ</span>'}</div>
                  ${C.statusPill(r)}</div>`; }).join('')}</div>`;
          }).join('') || `<div class="empty">${icon('calendar')}<p>เดือนนี้ยังไม่มีรายการใช้รถ</p></div>`}</div>
        </div>`;
      } else {
        // สัปดาห์: แถว = วัน · แกนนอน = เวลา · งานที่เวลาทับกันซ้อนเป็นหลายแถวย่อย
        const ws = weekStart(sel), days = Array.from({ length: 7 }, (_, i) => shift(ws, 'day', i));
        let H0 = 6, H1 = 20;
        days.forEach(d => tripsOn(d).forEach(r => { const s = new Date(r.startAt), e = new Date(r.endAt); if (UI.sameDay(s, d)) H0 = Math.min(H0, s.getHours()); if (UI.sameDay(e, d)) H1 = Math.max(H1, Math.min(24, e.getHours() + (e.getMinutes() ? 1 : 0))); }));
        const pos = (t, d) => { const x = (new Date(t) - dayStart(d)) / 36e5; return Math.max(0, Math.min(100, (x - H0) / (H1 - H0) * 100)); };
        const step = (H1 - H0) > 14 ? 3 : 2;
        body = head + `<div class="card cv-week"><div class="cv-wk-head">${legend}</div><div class="cv-wk-scroll"><div class="cv-wk" style="--cols:${H1 - H0}">
          <div class="cv-axis"><div></div><div class="cv-scale">${Array.from({ length: Math.floor((H1 - H0) / step) + 1 }, (_, i) => H0 + i * step).map(h => `<span style="left:${(h - H0) / (H1 - H0) * 100}%">${String(h % 24).padStart(2, '0')}:00</span>`).join('')}</div></div>
          ${days.map(d => {
            const list = tripsOn(d), lanes = [], items = list.map(r => { const s = Math.max(+new Date(r.startAt), +dayStart(d)), e = Math.min(+new Date(r.endAt), +dayEnd(d)); let l = lanes.findIndex(end => end <= s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = e; return { r, l }; });
            const n = Math.max(1, lanes.length), today = UI.sameDay(d, new Date());
            return `<div class="cv-row ${today ? 'today' : ''}"><a class="cv-name" href="${q({ view: 'month', date: fmt.localDate(d), pick: 1 })}"><b>${d.toLocaleDateString('th-TH', { weekday: 'short' })} ${d.getDate()}</b><small>${list.length ? list.length + ' งาน' : 'ว่าง'}</small></a>
              <div class="cv-lane" style="height:${n * 34 + 12}px">${items.map(({ r, l }) => { const href = hrefOfReq(r), left = pos(r.startAt, d), w = Math.max(4, pos(r.endAt, d) - left), vn = (r.assignments || []).map(a => C.vName(a.vehicleId)).join(', ');
                return `<div class="cv-bar ${stCls(r)} ${href ? 'link' : ''}" ${href ? `data-href="${href}"` : ''} style="left:${left}%;width:${w}%;top:${6 + l * 34}px" title="${fmt.time(r.startAt)}–${fmt.when(r.endAt)} · ${esc(S.destName(r))} · ${esc(vn || 'รอจัดรถ')} · ${esc(r.requester.name)}">${UI.sameDay(r.startAt, d) ? fmt.time(r.startAt) : '←'} ${esc(S.destName(r))} · ${esc(vn || 'รอจัดรถ')}${new Date(r.endAt) > dayEnd(d) ? ' →' : ''}</div>`; }).join('')}
                ${today ? `<div class="cv-now" style="left:${pos(new Date(), d)}%"></div>` : ''}</div></div>`;
          }).join('')}
        </div></div></div>`;
      }
    }
    return {
      html: `<div class="page"><div class="container">
        <div class="page-head"><div><div class="eyebrow">ตารางรถ</div><h1>${tab === 'today' ? (isToday ? 'สถานะรถวันนี้' : 'สถานะรถ') : 'ปฏิทินการใช้รถ'}</h1><p>${tab === 'today' ? 'แกนเวลาการใช้รถ และกระดานเที่ยวรถ · อัปเดตอัตโนมัติ' : 'ดูได้ว่าแต่ละวันใครขอรถไปไหน ใครขับ'}</p></div>
          <div class="seg"><a href="#/schedule"><button class="${tab === 'today' ? 'on' : ''}" tabindex="-1">${icon('activity')} สถานะรถวันนี้</button></a><a href="#/schedule?tab=calendar"><button class="${tab === 'calendar' ? 'on' : ''}" tabindex="-1">${icon('calendar')} ปฏิทินการใช้รถ</button></a></div></div>
        ${body}</div></div>`,
      patch: true,
      mount(root) {
        // ปฏิทินรายเดือน: เลื่อนรายการไปที่วันที่เลือก (หรือวันนี้/วันถัดไปที่มีงาน)
        const ag = $('#agenda', root); if (!ag) return;
        const key = fmt.localDate(sel), days = $$('[data-day]', ag);
        const target = days.find(x => x.dataset.day === key) || days.find(x => x.dataset.day >= key) || days[days.length - 1];
        if (target) ag.scrollTop = target.offsetTop - 6;
      }
    };
  };
  function shift(d, unit, n) { const x = new Date(d); if (unit === 'month') x.setMonth(x.getMonth() + n); else if (unit === 'week') x.setDate(x.getDate() + 7 * n); else x.setDate(x.getDate() + n); return x; }
  function weekStart(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }

  // ═════════ ข้อมูลรถ ═════════
  Pages.vehicles = ({ query }) => {
    const kind = query.kind || '';
    const list = S.db.vehicles.filter(v => !kind || v.kind === kind).sort((a, b) => (a.order || 0) - (b.order || 0));
    const kinds = [...new Set(S.db.vehicles.map(v => v.kind))];
    return {
      html: `<div class="page"><div class="container">
        <div class="page-head"><div><div class="eyebrow">ข้อมูลรถ</div><h1>รถส่วนกลางของโรงเรียน</h1><p>จำนวนที่นั่ง คนขับที่รับผิดชอบ อุปกรณ์ในรถ และสถานะตอนนี้</p></div>
          <div class="seg"><a href="#/vehicles"><button class="${!kind ? 'on' : ''}" tabindex="-1">ทั้งหมด ${S.db.vehicles.length}</button></a>${kinds.map(k => `<a href="#/vehicles?kind=${k}"><button class="${kind === k ? 'on' : ''}" tabindex="-1">${S.KINDS[k] || k}</button></a>`).join('')}</div></div>
        <div class="veh-grid">${list.map((v, i) => { const st = S.vehicleState(v), d = S.driver(v.driverId); return `
          <a class="vcard reveal" style="--d:${(i % 8) * .05}s" href="#/vehicles/${v.id}">
            <div class="vphoto">${v.photos && v.photos[0] ? UI.img(v.photos[0], v.name) : icon(kindIcon(v.kind))}<span class="el"><small>${v.no || ''}</small><b>${({ van: 'Va', bus: 'Bu', minibus: 'Mb', car: 'Se', suv: 'Su', pickup: 'Pk', truck: 'Tr', special: 'Sp' })[v.kind] || 'Ve'}</b></span>${pill(st)}</div>
            <div class="vbody"><h3>${esc(v.name)}</h3><span class="plate">${esc(v.plate)} · ${esc(v.brand || '')} ${esc(v.model || '')}</span>
              <div class="vmeta"><span class="tag navy">${icon('seat')}${v.seats} ที่นั่ง</span><span class="tag">${icon(kindIcon(v.kind))}${esc(v.type || S.KINDS[v.kind] || '')}</span>${(v.features || []).includes('แอร์') ? `<span class="tag">${icon('snow')}แอร์</span>` : ''}</div>
              <div class="vdriver">${UI.avatar(d ? d.name : '?')}<div><b>${d ? esc(d.name) : 'ยังไม่ระบุคนขับ'}</b><small>${d && d.phone ? esc(d.phone) : 'คนขับที่รับผิดชอบ'}</small></div></div></div>
          </a>`; }).join('') || UI.empty('ยังไม่มีข้อมูลรถ', 'van')}</div></div></div>`
    };
  };
  Pages.vehicleDetail = ({ params }) => {
    const v = S.vehicle(params.id);
    if (!v) return { html: `<div class="page container">${UI.empty('ไม่พบรถคันนี้', 'van')}</div>` };
    const st = S.vehicleState(v), d = S.driver(v.driverId);
    const upcoming = S.db.requests.filter(r => ['approved', 'ontrip', 'pending'].includes(r.status) && new Date(r.endAt) >= new Date() && (r.assignments || []).some(a => a.vehicleId === v.id)).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 10);
    const ph = v.photos || [];
    return {
      html: `<div class="page"><div class="container">
        <a class="crumb" href="#/vehicles">${icon('arrowL')} ข้อมูลรถทั้งหมด</a>
        <div class="page-head"><div><div class="eyebrow">รหัสรถ ${v.no || '-'}</div><h1>${esc(v.name)}</h1><p>${esc(v.plate)} · ${esc(v.brand || '')} ${esc(v.model || '')}${v.color ? ' · ' + esc(v.color) : ''}</p></div><div class="row">${pill(st, 'lg')}${S.isAdmin(S.me) ? `<a class="btn btn-ghost btn-sm" href="#/admin/vehicles/${v.id}">${icon('edit')} แก้ไขข้อมูลรถ</a>` : ''}</div></div>
        <div class="split">
          <div class="stack" style="gap:18px">
            <div class="gallery">${ph.length ? `<div class="main">${UI.img(ph[0], v.name)}</div>${ph.slice(1, 3).map(p => `<div class="sm">${UI.img(p, v.name)}</div>`).join('')}` : `<div class="main" style="grid-column:1/-1;display:grid;place-items:center">${icon(kindIcon(v.kind))}</div>`}</div>
            <div class="card"><div class="card-head"><h3>${icon('info')} รายละเอียดรถ</h3></div>
              <dl class="kv"><dt>ชนิดรถ</dt><dd>${esc(v.type || S.KINDS[v.kind] || '-')}</dd><dt>จำนวนที่นั่ง</dt><dd>${v.seats} ที่นั่ง${v.seatsLuggage ? ` (มีสัมภาระมาก แนะนำ ${v.seatsLuggage} คน)` : ''}</dd><dt>ทะเบียน</dt><dd>${esc(v.plate)}</dd><dt>ยี่ห้อ / รุ่น</dt><dd>${esc(v.brand || '-')} ${esc(v.model || '')}</dd><dt>สี</dt><dd>${esc(v.color || '-')}</dd><dt>เหมาะกับงาน</dt><dd>${esc(v.suitable || '-')}</dd><dt>สถานะตอนนี้</dt><dd>${esc(st.note)}</dd></dl>
              ${(v.features || []).length ? `<div class="divider"></div><div class="label" style="margin-bottom:10px">อุปกรณ์ในรถ</div><div class="feat-list">${v.features.map(f => `<span>${icon('check')}${esc(f)}</span>`).join('')}</div>` : ''}
              ${v.rules ? `<div class="divider"></div><div class="note-box">${icon('alert')}<div><b>ข้อปฏิบัติ:</b> ${esc(v.rules)}</div></div>` : ''}
              ${v.note ? `<p class="hint" style="margin-top:12px">${esc(v.note)}</p>` : ''}
            </div>
          </div>
          <div class="stack" style="gap:18px">
            <div class="card"><div class="card-head"><h3>${icon('wheel')} คนขับที่รับผิดชอบ</h3></div>
              ${d ? `<div class="row" style="gap:14px">${d.photo ? `<span class="avatar lg" style="overflow:hidden;padding:0">${UI.img(d.photo, d.name)}</span>` : UI.avatar(d.name, 'lg')}<div><b style="font-family:var(--font-display);font-size:1.05rem">${esc(d.name)}</b><div class="hint">พนักงานขับรถ</div>${d.phone ? `<a class="btn btn-gold btn-sm" style="margin-top:8px" href="tel:${esc(d.phone)}">${icon('phone')} ${esc(d.phone)}</a>` : ''}</div></div>${d.note ? `<p class="hint" style="margin-top:10px">${esc(d.note)}</p>` : ''}` : UI.empty('ยังไม่ระบุคนขับ', 'user')}</div>
            <div class="card"><div class="card-head"><h3>${icon('calendar')} คิวการใช้รถคันนี้</h3></div>
              ${upcoming.length ? `<div class="stack">${upcoming.map(r => `<div class="lot-row" style="grid-template-columns:auto 1fr auto">${icon('clock')}<div style="min-width:0"><b>${fmt.range(r.startAt, r.endAt)}</b><small>${esc(S.destName(r))} · ${esc(r.requester.name)}</small></div>${C.statusPill(r)}</div>`).join('')}</div>` : UI.empty('ยังไม่มีคิวที่จะมาถึง', 'checkCircle')}</div>
          </div>
        </div></div></div>`
    };
  };

  // ═════════ การขอใช้รถของฉัน ═════════
  Pages.my = ({ query }) => {
    const f = query.f || 'active';
    const all = S.myRequests();
    const groups = { active: r => ['pending', 'revise', 'approved', 'ontrip'].includes(r.status), done: r => ['returned', 'closed'].includes(r.status), other: r => ['rejected', 'cancelled'].includes(r.status), all: () => true };
    const list = all.filter(groups[f] || groups.all);
    const rateN = S.pendingRatings().length;
    return {
      html: `<div class="page"><div class="container" style="max-width:1000px">
        <div class="page-head"><div><div class="eyebrow">การขอใช้รถของฉัน</div><h1>คำขอใช้รถทั้งหมดของฉัน</h1><p>${esc(S.me.name)} · ${esc(S.me.dept || '')}</p></div><a class="btn btn-primary" href="#/request">${icon('plus')} ขอใช้รถ</a></div>
        ${rateN ? `<div class="note-box" style="margin-bottom:16px">${icon('star')}<div>มี <b>${rateN}</b> ทริปที่กลับถึงแล้ว รอคุณประเมินคนขับ — <a class="link" href="#/rate/${S.pendingRatings()[0].r.id}/${S.pendingRatings()[0].i}">ประเมินเลย</a></div></div>` : ''}
        <div class="toolbar"><div class="seg">${[['active', 'กำลังดำเนินการ'], ['done', 'เสร็จสิ้น'], ['other', 'ไม่อนุมัติ/ยกเลิก'], ['all', 'ทั้งหมด']].map(([k, l]) => `<a href="#/my?f=${k}"><button class="${f === k ? 'on' : ''}" tabindex="-1">${l} ${all.filter(groups[k]).length}</button></a>`).join('')}</div></div>
        <div class="stack">${list.map(r => C.reqCard(r, `#/my/${r.id}`)).join('') || UI.empty('ยังไม่มีคำขอในหมวดนี้', 'clipboard', '<a class="btn btn-primary btn-sm" href="#/request">ขอใช้รถ</a>')}</div>
      </div></div>`
    };
  };
  function requestInfo(r) {
    return `
      <div class="card"><div class="card-head"><h3>${icon('flag')} ภารกิจ</h3>${C.statusPill(r, 'lg')}</div>
        <dl class="kv">
          <dt>หมวดงาน</dt><dd>${esc(S.catName(r))}</dd>
          <dt>วัตถุประสงค์</dt><dd>${esc(r.purpose)}</dd>${r.project ? `<dt>ชื่องาน/โครงการ</dt><dd>${esc(r.project)}</dd>` : ''}
          <dt>วันเวลา</dt><dd>${fmt.range(r.startAt, r.endAt)} <span class="muted">(${S.tripTag(r) ? S.tripTag(r).text : 'ไป-กลับวันเดียว'})</span></dd>
          ${r.overnight && r.lodging ? `<dt>ที่พัก</dt><dd>${esc(r.lodging)}</dd>` : ''}
          <dt>สถานที่</dt><dd>${(r.destinations || []).map((d, i) => `<div>${r.destinations.length > 1 ? `${i + 1}. ` : ''}<b>${esc(d.name)}</b><br><small class="muted">${esc(d.address || d.province || '')}${d.km ? ` · ${d.km} กม. จากโรงเรียน` : ''}</small></div>`).join('')}</dd>
          <dt>ระยะทางรวม</dt><dd>${r.totalKm ? `${fmt.num(r.totalKm, 1)} กม. (ไป-กลับ)` : '-'}</dd>
          <dt>ผู้เดินทาง</dt><dd>${S.paxText(r)} <span class="muted">(รวม ${S.passengers(r)} คน)</span></dd>
          ${r.passengerNames ? `<dt>รายชื่อ</dt><dd style="white-space:pre-line">${esc(r.passengerNames)}</dd>` : ''}
          <dt>จุดนัดขึ้นรถ</dt><dd>${esc(r.pickup || '-')}</dd>
          <dt>ผู้ขอใช้รถ</dt><dd>${esc(r.requester.name)} <small class="muted">· ${esc(r.requester.dept || '')}</small></dd>
          <dt>เบอร์ติดต่อ</dt><dd>${r.contactPhone ? `<a class="link" href="tel:${esc(r.contactPhone)}">${esc(r.contactPhone)}</a>` : '-'}</dd>
          ${r.note ? `<dt>หมายเหตุ</dt><dd>${esc(r.note)}</dd>` : ''}
        </dl>
        <div class="divider"></div><div class="label">${icon('paperclip')} บันทึกข้อความขออนุญาตใช้รถ</div>
        <div class="thumbs">${(r.attachments || []).map(a => UI.thumb(a)).join('') || (S.needsMemo(r) ? `<span class="pill tone-bad">ค้างบันทึกข้อความ</span>${S.isAdmin(S.me) && location.hash.startsWith('#/admin') ? ` <a class="btn btn-ghost btn-xs" href="#/my/${r.id}">${icon('upload')} แนบแทนผู้ขอ</a>` : ''}` : r.memoWaived ? `<span class="hint">${icon('shield')} แอดมินยกเว้น — ${esc(r.memoWaived.note)} (${esc(r.memoWaived.byName)})</span>` : S.isQuickCat(r.category) ? '<span class="hint">ไม่ต้องแนบ (งานประจำ)</span>' : '<span class="hint">ไม่มีไฟล์แนบ</span>')}</div>
      </div>`;
  }
  Pages._requestInfo = requestInfo;
  function decisionBox(r) {
    const d = r.decision;
    if (r.status === 'cancelled') return `<div class="note-box red">${icon('xCircle')}<div><b>ยกเลิกคำขอแล้ว</b>${r.cancel && r.cancel.reason ? ` — ${esc(r.cancel.reason)}` : ''}</div></div>`;
    if (!d) return r.status === 'pending' ? `<div class="note-box navy">${icon('clock')}<div><b>รอแอดมินตรวจสอบ</b> — แอดมินจะตรวจบันทึกข้อความ แล้วจัดรถและคนขับให้</div></div>` : '';
    const cls = d.action === 'approve' ? 'green' : d.action === 'reject' ? 'red' : '';
    const t = d.action === 'approve' ? 'อนุมัติแล้ว' : d.action === 'reject' ? 'ไม่อนุมัติ' : 'ส่งกลับให้แก้ไข';
    return `<div class="note-box ${cls}">${icon(d.action === 'approve' ? 'checkCircle' : d.action === 'reject' ? 'xCircle' : 'undo')}<div><b>${t}</b> <small class="muted">โดย ${esc(d.byName || '')} · ${fmt.dt(d.at)}</small>${d.note ? `<div style="margin-top:6px"><b>หมายเหตุจากแอดมิน:</b> ${esc(d.note)}</div>` : ''}</div></div>`;
  }
  Pages._decisionBox = decisionBox;
  Pages.myDetail = ({ params }) => {
    const r = S.request(params.id);
    if (!r) return { html: `<div class="page container">${UI.empty('ไม่พบคำขอนี้')}</div>` };
    const mine = r.requester.email === S.me.email;
    if (!mine && !S.isBack(S.me)) return { html: `<div class="page container">${UI.empty('ไม่มีสิทธิ์ดูคำขอนี้', 'lock')}</div>` };
    const canEdit = mine && ['pending', 'revise'].includes(r.status);
    const canCancel = mine && ['pending', 'revise', 'approved'].includes(r.status) && (r.assignments || []).every(a => a.status === 'assigned');
    const rates = (r.assignments || []).map((a, i) => ({ a, i })).filter(x => x.a.status === 'returned' && !x.a.rated);
    return {
      html: `<div class="page"><div class="container">
        <a class="crumb" href="#/my">${icon('arrowL')} การขอใช้รถของฉัน</a>
        <div class="page-head"><div><div class="eyebrow">${r.id}${r.emergency ? ' · บันทึกโดยแอดมิน (เร่งด่วน)' : ''}</div><h1>${esc(S.destName(r))}</h1><p>ส่งเมื่อ ${fmt.dt(r.createdAt)}</p></div>
          <div class="row">${C.canMemo(r) && (mine || S.isAdmin(S.me)) ? `<button class="btn btn-primary btn-sm" id="memoPrint">${icon('printer')} พิมพ์บันทึกข้อความ</button>` : ''}${mine ? `<a class="btn btn-ghost btn-sm" href="#/request?copy=${r.id}">${icon('copy')} คัดลอกเป็นคำขอใหม่</a>` : ''}${canEdit ? `<a class="btn btn-primary btn-sm" href="#/request/${r.id}">${icon('edit')} ${r.status === 'revise' ? 'แก้ไขและส่งใหม่' : 'แก้ไข'}</a>` : ''}${canCancel ? `<button class="btn btn-danger btn-sm" id="cancelBtn">${icon('xCircle')} ยกเลิกคำขอ</button>` : ''}</div></div>
        <div style="margin-bottom:18px">${decisionBox(r)}</div>
        ${C.canMemo(r) && mine ? `<div class="note-box ${(r.signed || []).length ? 'green' : 'navy'}" style="margin-bottom:18px">${icon((r.signed || []).length ? 'checkCircle' : 'file')}<div>${(r.signed || []).length
          ? `<b>งานยานพาหนะเก็บบันทึกข้อความฉบับลงนามแล้ว</b><div class="thumbs" style="margin-top:6px">${r.signed.map(p => UI.thumb(p, 'sm')).join('')}</div>`
          : `<b>อนุมัติแล้ว</b> — กด "พิมพ์บันทึกข้อความ" ลงนามในช่องผู้ขอใช้รถ แล้วส่งที่งานยานพาหนะ เพื่อเสนอหัวหน้างานยานพาหนะและรองผู้อำนวยการฯ ลงนาม`}</div></div>` : ''}
        ${S.needsMemo(r) && (mine || S.isAdmin(S.me)) ? `<div class="card memo-late" style="margin-bottom:18px"><div class="card-head"><h3>${icon('filePlus')} แนบบันทึกข้อความตามหลัง</h3><span class="pill tone-bad">ค้างบันทึกข้อความ</span></div>
          <p class="hint" style="margin-bottom:12px">คำขอนี้แอดมินบันทึกแทนให้กรณีเร่งด่วน — ${mine ? 'ต้องแนบบันทึกข้อความที่มีลายเซ็นผู้อำนวยการ (หรือผู้รักษาราชการแทน) ก่อน จึงจะขอใช้รถครั้งต่อไปได้' : 'ผู้ขอยังไม่ได้แนบ แอดมินแนบแทนได้'} · ไฟล์ต้องคมชัด อ่านออกทุกบรรทัด</p>
          ${C.filePicker('memoLate', [], { label: 'เลือกไฟล์บันทึกข้อความ', pdf: true })}
          <div class="row" style="margin-top:12px"><button class="btn btn-primary" id="memoSave">${icon('upload')} บันทึกไฟล์แนบ</button>${S.isAdmin(S.me) ? `<button class="btn btn-ghost" id="memoWaive" title="ใช้เมื่อจะไม่มีบันทึกข้อความแน่นอน เช่น ผู้อำนวยการสั่งการด้วยวาจา">${icon('shield')} ยกเว้น (ไม่ต้องแนบ)</button>` : ''}</div></div>` : ''}
        ${rates.length && mine ? `<div class="note-box" style="margin-bottom:18px">${icon('star')}<div>รถกลับถึงแล้ว — ช่วยประเมินคนขับ ${rates.map(x => `<a class="btn btn-gold btn-xs" href="#/rate/${r.id}/${x.i}">${esc(C.dName(x.a.driverId))}</a>`).join(' ')}</div></div>` : ''}
        <div class="detail-grid">
          ${requestInfo(r)}
          <div class="stack" style="gap:18px">
            <div class="card"><div class="card-head"><h3>${icon('van')} รถและคนขับที่ได้รับ</h3></div>${C.assignList(r) || UI.empty(r.status === 'pending' ? 'รอแอดมินจัดรถ' : 'ยังไม่มีการจัดรถ', 'van')}</div>
            <div class="card"><div class="card-head"><h3>${icon('activity')} ความเคลื่อนไหว</h3></div>${C.history(r)}</div>
          </div>
        </div></div></div>`,
      mount(root) {
        $('#memoPrint', root)?.addEventListener('click', () => C.printMemo(S.request(r.id)));
        if ($('#memoSave', root)) {
          const getMemo = C.bindFilePicker(root, 'memoLate', [], { pdf: true });
          $('#memoSave', root).addEventListener('click', e => {
            const files = getMemo();
            if (!files.length) return UI.toast('กรุณาเลือกไฟล์บันทึกข้อความ', 'error');
            UI.busy(e.currentTarget, () => S.attachMemo(r.id, files)).then(() => UI.toast('แนบบันทึกข้อความแล้ว — ขอใช้รถครั้งต่อไปได้แล้ว')).catch(() => {});
          });
        }
        $('#memoWaive', root)?.addEventListener('click', async () => {
          const res = await UI.confirm(`ยกเว้นบันทึกข้อความของ ${r.id} ใช่ไหม? ผู้ขอจะขอใช้รถครั้งต่อไปได้ทันที และระบบจะบันทึกชื่อผู้ยกเว้นไว้`, { title: 'ยกเว้นบันทึกข้อความ', ok: 'ยกเว้น', input: { label: 'เหตุผล (เช่น ผู้อำนวยการสั่งการด้วยวาจา)', required: true } });
          if (res && res.value) S.waiveMemo(r.id, res.value).then(() => UI.toast('ยกเว้นแล้ว')).catch(e => UI.toast(e.message, 'error'));
        });
        $('#cancelBtn', root)?.addEventListener('click', async () => {
          const res = await UI.confirm('ต้องการยกเลิกคำขอใช้รถนี้ใช่ไหม?', { title: 'ยกเลิกคำขอ', ok: 'ยกเลิกคำขอ', danger: true, input: { label: 'เหตุผลที่ยกเลิก', required: true } });
          if (res && res.value) S.cancelRequest(r.id, res.value).then(() => UI.toast('ยกเลิกคำขอแล้ว')).catch(e => UI.toast(e.message, 'error'));
        });
      }
    };
  };

  // ═════════ ประเมินคนขับ ═════════
  function rateForm(r, idx) {
    const a = r.assignments[idx], d = S.driver(a.driverId), v = S.vehicle(a.vehicleId);
    return `<div class="rate-in">
      <div class="row" style="gap:14px;flex-wrap:nowrap">${UI.avatar(d ? d.name : '?', 'lg')}<div style="flex:1;min-width:0"><b style="font-family:var(--font-display);font-size:1.05rem">${esc(d ? d.name : 'คนขับ')}</b><div class="hint">${esc(v ? `${v.name} · ${v.plate}` : '')} · ${esc(S.destName(r))} · ${fmt.date(r.startAt)}</div></div></div>
      ${Object.entries(S.RATE_KEYS).map(([k, l]) => `<div class="rate-row"><b>${l}</b><div class="stars" data-k="${k}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} ดาว">${icon('star')}</button>`).join('')}</div></div>`).join('')}
      <div class="field"><label>ข้อเสนอแนะ / คำชม</label><textarea id="rtC" rows="3" placeholder="(ไม่บังคับ) ผู้บริหารจะเห็นความคิดเห็นโดยไม่แสดงชื่อผู้ประเมิน"></textarea></div>
    </div>`;
  }
  function bindStars(root) {
    root.addEventListener('click', e => { const b = e.target.closest('.stars [data-n]'); if (!b) return; const n = +b.dataset.n; b.parentElement.dataset.v = n; b.parentElement.querySelectorAll('button').forEach((x, i) => x.classList.toggle('on', i < n)); });
    return () => { const sc = {}; let ok = true; root.querySelectorAll('.stars[data-k]').forEach(s => { sc[s.dataset.k] = +s.dataset.v || 0; if (!sc[s.dataset.k]) ok = false; }); if (!ok) throw new Error('กรุณาให้คะแนนให้ครบทุกหัวข้อ'); return { scores: sc, comment: root.querySelector('#rtC').value }; };
  }
  Pages.rate = ({ params }) => {
    const r = S.request(params.id), idx = +params.idx;
    if (!r || !r.assignments[idx] || r.requester.email !== S.me.email) return { html: `<div class="page container">${UI.empty('ไม่พบงานที่ต้องประเมิน')}</div>` };
    if (r.assignments[idx].rated) return { html: `<div class="page container">${UI.empty('ประเมินงานนี้แล้ว ขอบคุณค่ะ', 'checkCircle', `<a class="btn btn-ghost btn-sm" href="#/my/${r.id}">กลับไปที่คำขอ</a>`)}</div>` };
    return {
      live: false,
      html: `<div class="page"><div class="container" style="max-width:640px">
        <a class="crumb" href="#/my/${r.id}">${icon('arrowL')} กลับไปที่คำขอ</a>
        <div class="page-head"><div><div class="eyebrow">ประเมินคนขับ</div><h1>การเดินทางครั้งนี้เป็นอย่างไรบ้าง?</h1><p>ใช้เวลาไม่ถึง 1 นาที ช่วยพัฒนาบริการของงานยานพาหนะ</p></div></div>
        <div class="card" id="rt">${rateForm(r, idx)}<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" id="rtSend">${icon('send')} ส่งคำประเมิน</button></div></div></div></div>`,
      mount(root) {
        const read = bindStars(root);
        $('#rtSend', root).addEventListener('click', e => { let v; try { v = read(); } catch (err) { return UI.toast(err.message, 'error'); } UI.busy(e.currentTarget, () => S.rate(r.id, idx, v)).then(() => { UI.toast('ขอบคุณสำหรับคำประเมิน ⭐'); App.go(`#/my/${r.id}`); }).catch(() => {}); });
      }
    };
  };
  Pages._ratePopup = ({ r, i }) => UI.modal({
    title: `${icon('star')} รถกลับถึงโรงเรียนแล้ว · ประเมินคนขับ`, body: rateForm(r, i),
    actions: [
      { label: 'ไว้ทีหลัง', onClick: () => { sessionStorage.setItem('rated-later-' + r.id + i, '1'); return true; } },
      { label: 'ส่งคำประเมิน', kind: 'btn-primary', icon: 'send', onClick: async el => { const v = el._read(); await S.rate(r.id, i, v); UI.toast('ขอบคุณสำหรับคำประเมิน ⭐'); return true; } }
    ],
    onOpen(el) { el._read = bindStars(el); }
  });

  // ═════════ ติดต่อเรา ═════════
  Pages.contact = () => {
    const s = S.db.settings, cm = (s.committee || []).slice();
    const levels = [...new Set(cm.map(c => +c.level || 3))].sort();
    return {
      html: `<div class="page"><div class="container">
        <div class="page-head"><div><div class="eyebrow">ติดต่อเรา</div><h1>คณะทำงานงานยานพาหนะ</h1><p>${esc(s.division)} · ${esc(s.schoolName)}</p></div>${S.isAdmin(S.me) ? `<a class="btn btn-ghost btn-sm" href="#/admin/settings">${icon('edit')} แก้ไขข้อมูลติดต่อ</a>` : ''}</div>
        <div class="org">${levels.map(lv => `<div class="org-level">${cm.filter(c => (+c.level || 3) === lv).map(c => `
          <div class="person l${lv} ${c.name ? '' : 'ph-empty'} reveal">
            <div class="ph">${c.photo ? UI.img(c.photo, c.name) : icon('user')}</div>
            <b>${esc(c.name) || '(รอข้อมูล)'}</b><div class="pos">${esc(c.position)}</div>
            <div class="ct">${c.phone ? `<a href="tel:${esc(c.phone)}">${icon('phone')} ${esc(c.phone)}</a>` : ''}${c.email ? `<a href="mailto:${esc(c.email)}">${icon('mail')} ${esc(c.email)}</a>` : ''}</div>
          </div>`).join('')}</div>`).join('')}</div>
        <h3 style="margin:44px 0 16px;color:var(--navy)">${icon('phone')} ช่องทางติดต่อ</h3>
        <div class="grid cols-3">
          <div class="card"><div class="card-head"><h3>${icon('phone')} โทรศัพท์</h3></div><p>${s.contactPhone ? `<a class="link" href="tel:${esc(s.contactPhone)}">${esc(s.contactPhone)}</a>` : '<span class="hint">(รอข้อมูล)</span>'}</p></div>
          <div class="card"><div class="card-head"><h3>${icon('mail')} LINE / ช่องทางอื่น</h3></div><p>${esc(s.contactLine) || '<span class="hint">(รอข้อมูล)</span>'}</p></div>
          <div class="card"><div class="card-head"><h3>${icon('pin')} ห้องทำงาน</h3></div><p>${esc(s.contactRoom) || '<span class="hint">(รอข้อมูล)</span>'}</p></div>
        </div>
        ${s.contactNote ? `<div class="note-box" style="margin-top:18px">${icon('info')}<div>${esc(s.contactNote)}</div></div>` : ''}
        <h3 style="margin:44px 0 16px;color:var(--navy)">${icon('wheel')} พนักงานขับรถ</h3>
        ${inn() ? `<div class="veh-grid">${S.db.drivers.filter(d => d.active !== false).map(d => `<div class="person" style="width:auto"><div class="ph">${d.photo ? UI.img(d.photo, d.name) : icon('user')}</div><b>${esc(d.name)}</b><div class="pos">พนักงานขับรถ · ${S.db.vehicles.filter(v => v.driverId === d.id).map(v => esc(v.name)).join(', ') || '-'}</div><div class="ct">${d.phone ? `<a href="tel:${esc(d.phone)}">${icon('phone')} ${esc(d.phone)}</a>` : ''}</div></div>`).join('')}</div>` : `<div class="note-box navy">${icon('lock')}<div>เข้าสู่ระบบเพื่อดูรายชื่อและเบอร์โทรพนักงานขับรถ</div></div>`}
      </div></div>`
    };
  };
})();
