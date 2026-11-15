/* ═══════════════════════════════════════════════════════════
   Maps — เลือกสถานที่ด้วย Longdo Map (ค้นหา / ปักหมุด / คำนวณระยะทาง)
   ถ้ายังไม่ได้ใส่ longdoKey ใน config.js จะใช้ "สถานที่ที่เคยไป" + กรอกเอง แทน
   ═══════════════════════════════════════════════════════════ */
const Maps = (() => {
  'use strict';
  const KEY = (window.APP_CONFIG || {}).longdoKey || '';
  const enabled = !!KEY;
  const { esc } = UI;
  let sdk = null;

  function loadSdk() {
    if (!enabled) return Promise.reject(new Error('no key'));
    if (sdk) return sdk;
    sdk = new Promise((res, rej) => {
      if (window.longdo) return res(window.longdo);
      const s = document.createElement('script');
      s.src = `https://api.longdo.com/map3/?key=${encodeURIComponent(KEY)}`;
      s.onload = () => window.longdo ? res(window.longdo) : rej(new Error('โหลดแผนที่ไม่สำเร็จ'));
      s.onerror = () => { sdk = null; rej(new Error('โหลดแผนที่ไม่สำเร็จ')); };
      document.head.appendChild(s);
    });
    return sdk;
  }
  const getJSON = async url => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const PROVS = ['กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'];
  // อ่านพิกัดจากข้อความ: "13.75, 100.49" · ลิงก์ Google Maps (@lat,lng · !3dlat!4dlng · q=lat,lng) — ได้ชื่อสถานที่จาก /place/ ด้วยถ้ามี
  function parseLL(t) {
    let s = String(t || ''); try { s = decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { /* ใช้ข้อความเดิม */ }
    const ok = (a, b) => { a = +a; b = +b; return a > 5 && a < 21 && b > 97 && b < 106 ? { lat: a, lng: b } : null; };   // อยู่ในประเทศไทย
    const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /(-?\d{1,2}\.\d{3,})\s*[, ]\s*(-?\d{2,3}\.\d{3,})/];
    for (const re of pats) { const m = s.match(re); if (m) { const p = ok(m[1], m[2]); if (p) { const n = s.match(/\/place\/([^/@]+)/); return { ...p, name: n ? n[1].trim() : '' }; } } }
    return null;
  }
  const provinceOf = s => { const m = String(s || '').match(/(?:จ\.|จังหวัด)\s*([^\s,]+)/); return m ? m[1] : /กรุงเทพ/.test(s) ? 'กรุงเทพมหานคร' : ''; };

  async function search(q) {
    if (!enabled || !q.trim()) return [];
    const d = await getJSON(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(q)}&limit=8&key=${KEY}`);
    return (d.data || []).filter(x => x.lat && x.lon).map(x => ({ name: x.name, address: x.address || '', province: provinceOf(x.address), lat: +x.lat, lng: +x.lon }));
  }
  async function reverse(lat, lng) {
    if (!enabled) return { address: '', province: '' };
    const d = await getJSON(`https://api.longdo.com/map/services/address?lon=${lng}&lat=${lat}&noelevation=1&key=${KEY}`);
    const address = [d.road, d.subdistrict, d.district, d.province, d.postcode].filter(Boolean).join(' ');
    return { address, province: String(d.province || '').replace(/^จ\.\s*/, ''), name: d.aoi || '' };
  }
  function estimate(a, b) {
    const R = 6371, t = x => x * Math.PI / 180;
    const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
    return { km: Math.round(km), mins: Math.round(km / 55 * 60 + 10), estimated: true };
  }
  async function route(a, b) {
    if (a.lat == null || b.lat == null) return null;
    if (enabled) {
      try {
        const d = await getJSON(`https://api.longdo.com/RouteService/json/route/guide?flon=${a.lng}&flat=${a.lat}&tlon=${b.lng}&tlat=${b.lat}&mode=t&type=25&locale=th&key=${KEY}`);
        const g = (d.data || [])[0];
        if (g && g.distance) return { km: Math.round(g.distance / 100) / 10, mins: Math.round((g.interval || 0) / 60) };
      } catch (e) { console.warn('คำนวณเส้นทางไม่สำเร็จ ใช้ค่าประมาณ', e); }
    }
    return estimate(a, b);
  }
  // ระยะทางรวมไป-กลับ: โรงเรียน → จุดที่ 1 → … → จุดสุดท้าย → โรงเรียน
  async function tripTotal(dests) {
    const s = Store.db.settings.school || {};
    const pts = [{ lat: s.lat, lng: s.lng }, ...dests, { lat: s.lat, lng: s.lng }];
    let km = 0, mins = 0, est = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      let leg = null;
      if (a.lat != null && b.lat != null) leg = await route(a, b);
      if (!leg) { const d = i < dests.length ? dests[i] : dests[dests.length - 1]; leg = { km: +d.km || 0, mins: +d.mins || 0, estimated: true }; }
      km += +leg.km || 0; mins += +leg.mins || 0; if (leg.estimated) est = true;
    }
    return { km: Math.round(km * 10) / 10, mins: Math.round(mins / 2), estimated: est };
  }

  // ───────── หน้าต่างเลือกสถานที่ ─────────
  function pick(initial = {}) {
    const s = Store.db.settings.school || {};
    let cur = { name: '', address: '', province: '', lat: null, lng: null, km: '', mins: '', ...initial };
    let map = null, marker = null;
    const body = `
      <div class="picker">
        <div class="pk-search">
          ${icon('search')}<input id="pkQ" placeholder="${enabled ? 'ค้นหาสถานที่ เช่น สพม.ปทุมธานี, มหาวิทยาลัยเกษตรศาสตร์' : 'พิมพ์ชื่อสถานที่ หรือเลือกจากที่เคยไป'}" autocomplete="off">
        </div>
        <div class="pk-results" id="pkRes"></div>
        ${enabled ? `<div class="pk-map" id="pkMap"><div class="pk-map-hint">${icon('pin')} คลิกบนแผนที่เพื่อปักหมุด หรือลากหมุดเพื่อปรับตำแหน่ง</div></div>`
          : `<div class="note-box">${icon('info')}<div>ยังไม่ได้เชื่อม Longdo Map (ใส่ <b>longdoKey</b> ใน config.js) — ตอนนี้เลือกจาก “สถานที่ที่เคยไป” หรือกรอกข้อมูลเองได้</div></div>`}
        <div class="grid2" style="margin-top:14px">
          <div class="field full"><label>ชื่อสถานที่ <b class="req">*</b></label><input id="pkName" value="${esc(cur.name)}"></div>
          <div class="field full"><label>ที่อยู่ / ตำบล อำเภอ จังหวัด</label><input id="pkAddr" value="${esc(cur.address)}"></div>
          <div class="field"><label>จังหวัด</label><input id="pkProv" list="pkProvList" autocomplete="off" value="${esc(cur.province)}" placeholder="พิมพ์หรือเลือกจังหวัด"><datalist id="pkProvList">${PROVS.map(p => `<option value="${p}">`).join('')}</datalist></div>
          <div class="field"><label>เวลาเดินทางโดยประมาณ (นาที)</label><input id="pkMin" type="number" min="0" inputmode="numeric" value="${esc(cur.mins)}"></div>
          <div class="field"><label>ระยะทางจากโรงเรียน (กม. เที่ยวเดียว)</label><input id="pkKm" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(cur.km)}"></div>
          <div class="field"><label>ระยะทางรวม ไป + กลับ (กม.) <span class="hint">กรอกช่องไหนก็ได้</span></label><input id="pkKm2" type="number" min="0" step="0.1" inputmode="decimal" value="${cur.km ? (Math.round(cur.km * 20) / 10) : ''}"></div>
          <div class="field full"><label>พิกัด หรือ ลิงก์ Google Maps <span class="hint">(ไม่บังคับ — วางแล้วระบบคำนวณระยะทางให้)</span></label>
            <div class="pk-ll"><input id="pkLL" value="${cur.lat != null ? `${(+cur.lat).toFixed(5)}, ${(+cur.lng).toFixed(5)}` : ''}" placeholder="เช่น 13.75302, 100.49046 หรือวางลิงก์จาก Google Maps" autocomplete="off"><a class="btn btn-ghost btn-sm" id="pkGm" target="_blank" rel="noopener" href="https://www.google.com/maps">${icon('pin')} หาใน Google Maps</a></div></div>
        </div>
        <details class="pk-how"><summary>${icon('info')} ค้นหาไม่เจอ ทำอย่างไร</summary><ol>
          <li>กรอก <b>ชื่อสถานที่</b> และ <b>จังหวัด</b> เอง (จำเป็นแค่ชื่อ)</li>
          <li>ระยะทาง: กรอก <b>เที่ยวเดียว</b> หรือ <b>ไป + กลับ</b> ช่องใดช่องหนึ่ง ระบบคำนวณอีกช่องให้</li>
          <li>ไม่รู้ระยะทาง: กด <b>หาใน Google Maps</b> → ค้นสถานที่ → กด <b>แชร์ → คัดลอกลิงก์</b> (หรือกดค้างบนแผนที่ แล้วคัดลอกพิกัด) → วางในช่องพิกัด ระบบคำนวณระยะทางให้อัตโนมัติ</li>
        </ol></details>
        <p class="hint" id="pkCalc"></p>
      </div>`;
    return UI.modal({
      title: `${icon('pin')} เลือกสถานที่ปลายทาง`, size: 'lg', body,
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'ใช้สถานที่นี้', kind: 'btn-primary', icon: 'check', onClick: el => {
        const v = id => el.querySelector(id).value.trim();
        if (!v('#pkName')) { UI.toast('กรุณาระบุชื่อสถานที่', 'error'); return false; }
        return { ...cur, name: v('#pkName'), address: v('#pkAddr'), province: v('#pkProv') || provinceOf(v('#pkAddr')), km: +v('#pkKm') || 0, mins: +v('#pkMin') || 0 };
      } }],
      onOpen(el) {
        const q = el.querySelector('#pkQ'), res = el.querySelector('#pkRes'), calc = el.querySelector('#pkCalc');
        // ระยะทาง: เที่ยวเดียว ↔ ไป + กลับ (กรอกช่องไหน อีกช่องคำนวณให้)
        const syncKm2 = () => { const k = +el.querySelector('#pkKm').value || 0; el.querySelector('#pkKm2').value = k ? Math.round(k * 20) / 10 : ''; };
        const setF = (id, v) => { el.querySelector(id).value = v ?? ''; if (id === '#pkKm') syncKm2(); };
        el.querySelector('#pkKm').addEventListener('input', syncKm2);
        el.querySelector('#pkKm2').addEventListener('input', e => { const k = +e.target.value || 0; el.querySelector('#pkKm').value = k ? Math.round(k * 5) / 10 : ''; });
        // ไม่รู้ระยะเวลา → ประมาณจากระยะทาง (55 กม./ชม. + 10 นาที)
        el.querySelector('#pkKm').addEventListener('change', () => { const k = +el.querySelector('#pkKm').value; const m = el.querySelector('#pkMin'); if (k && !+m.value) m.value = Math.round(k / 55 * 60 + 10); });
        el.querySelector('#pkKm2').addEventListener('change', () => el.querySelector('#pkKm').dispatchEvent(new Event('change')));
        // ปุ่ม "หาใน Google Maps" ค้นตามชื่อที่พิมพ์ไว้
        const gm = el.querySelector('#pkGm');
        const syncGm = () => { const t = [el.querySelector('#pkName').value, el.querySelector('#pkProv').value].filter(Boolean).join(' ').trim(); gm.href = t ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}` : 'https://www.google.com/maps'; };
        ['#pkName', '#pkProv'].forEach(id => el.querySelector(id).addEventListener('input', syncGm)); syncGm();
        // วางพิกัด / ลิงก์ Google Maps → อ่านพิกัด แล้วคำนวณระยะทาง
        const ll = el.querySelector('#pkLL');
        const readLL = async () => {
          const t = ll.value.trim(); if (!t) { cur = { ...cur, lat: null, lng: null }; return; }
          const p = parseLL(t);
          if (p) { ll.value = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`; if (!el.querySelector('#pkName').value && p.name) setF('#pkName', p.name); await setPoint({ lat: p.lat, lng: p.lng }, { fromMap: true }); }
          else if (/goo\.gl|maps\.app/.test(t)) calc.textContent = 'ลิงก์แบบย่อ (maps.app.goo.gl) อ่านพิกัดไม่ได้ — เปิดลิงก์ในเบราว์เซอร์ให้ขึ้นแผนที่ก่อน แล้วคัดลอกลิงก์จากแถบที่อยู่ หรือคัดลอกพิกัดตัวเลขแทน';
          else calc.textContent = 'อ่านพิกัดไม่ได้ — ใส่แบบ 13.75302, 100.49046';
        };
        ll.addEventListener('change', readLL); ll.addEventListener('paste', () => setTimeout(readLL, 30));
        async function setPoint(p, { fromMap } = {}) {
          cur = { ...cur, ...p };
          ['name', 'address', 'province'].forEach(k => { if (p[k]) setF({ name: '#pkName', address: '#pkAddr', province: '#pkProv' }[k], p[k]); });
          if (p.km != null && p.km !== '') setF('#pkKm', p.km);
          if (p.mins != null && p.mins !== '') setF('#pkMin', p.mins);
          setF('#pkLL', cur.lat != null ? `${(+cur.lat).toFixed(5)}, ${(+cur.lng).toFixed(5)}` : '');
          if (cur.lat != null) {
            if (map && marker && !fromMap) { try { marker.location ? map.Overlays.remove(marker) : 0; } catch (e) { /* ข้าม */ } addMarker(); map.location({ lon: cur.lng, lat: cur.lat }, true); }
            if (fromMap && enabled) { try { const r = await reverse(cur.lat, cur.lng); if (!el.querySelector('#pkName').value) setF('#pkName', r.name || r.address.split(' ').slice(0, 2).join(' ')); setF('#pkAddr', r.address); setF('#pkProv', r.province); cur.address = r.address; cur.province = r.province; } catch (e) { /* ข้าม */ } }
            calc.textContent = 'กำลังคำนวณระยะทาง…';
            const r = await route({ lat: s.lat, lng: s.lng }, cur);
            if (r) { setF('#pkKm', r.km); setF('#pkMin', r.mins); cur.km = r.km; cur.mins = r.mins; calc.textContent = `${r.estimated ? 'ประมาณ' : 'ระยะทางตามถนน'} ${r.km} กม. · ${r.mins} นาที จากโรงเรียน (เที่ยวเดียว) · ไป + กลับ ${Math.round(r.km * 20) / 10} กม.`; }
          }
        }
        function addMarker() {
          try {
            marker = new longdo.Marker({ lon: cur.lng, lat: cur.lat }, { draggable: true, title: cur.name || 'ปลายทาง' });
            map.Overlays.add(marker);
          } catch (e) { console.warn(e); }
        }
        function renderResults(list, saved) {
          res.innerHTML = [
            ...saved.map(p => `<button type="button" class="pk-item" data-saved="${esc(p.id)}">${icon('clock')}<span><b>${esc(p.name)}</b><small>${esc(p.address || p.province || '')} · ${p.km || '?'} กม. · ไปแล้ว ${p.count || 1} ครั้ง</small></span></button>`),
            ...list.map((p, i) => `<button type="button" class="pk-item" data-found="${i}">${icon('pin')}<span><b>${esc(p.name)}</b><small>${esc(p.address)}</small></span></button>`)
          ].join('') || (q.value ? `<p class="hint" style="padding:8px 4px">ไม่พบในรายการ — กรอกรายละเอียดด้านล่างได้เลย${enabled ? ' หรือปักหมุดบนแผนที่' : ''}</p>` : '');
          res._found = list;
        }
        const savedMatch = t => Store.db.places.filter(p => !t || p.name.includes(t) || (p.address || '').includes(t)).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, t ? 6 : 5);
        renderResults([], savedMatch(''));
        const doSearch = UI.debounce(async () => {
          const t = q.value.trim();
          if (!el.querySelector('#pkName').value || el.querySelector('#pkName')._auto) { setF('#pkName', t); el.querySelector('#pkName')._auto = true; }
          let found = [];
          try { found = await search(t); } catch (e) { console.warn(e); }
          renderResults(found, savedMatch(t));
        }, 380);
        q.addEventListener('input', doSearch);
        el.querySelector('#pkName').addEventListener('input', e => { e.target._auto = false; });
        res.addEventListener('click', e => {
          const sv = e.target.closest('[data-saved]'), fd = e.target.closest('[data-found]');
          if (sv) { const p = Store.db.places.find(x => x.id === sv.dataset.saved); setPoint({ ...p }); if (p.lat == null) { setF('#pkKm', p.km); setF('#pkMin', p.mins); } res.innerHTML = ''; }
          if (fd) { setPoint(res._found[+fd.dataset.found]); res.innerHTML = ''; }
        });
        const mapFail = e => {
          const box = el.querySelector('#pkMap'); if (!box) return;
          const h = box.querySelector('.pk-map-hint');
          if (h) h.innerHTML = `${icon('alert')} โหลดแผนที่ไม่สำเร็จ — กรอกข้อมูลเองได้`;
          console.warn('Longdo Map:', e);
        };
        if (enabled) loadSdk().then(L => {
          const box = el.querySelector('#pkMap');
          try { map = new L.Map({ placeholder: box, language: 'th' }); } catch (e) { return mapFail(e); }
          // ตั้งค่าแผนที่หลังแผนที่พร้อม (เรียกก่อนพร้อมจะ error) · แต่ละขั้นแยก try ขั้นหนึ่งพลาดขั้นอื่นยังทำงาน
          const step = (name, fn) => { try { fn(); } catch (e) { console.warn('Longdo Map: ' + name, e); } };
          let done = false;
          const init = () => {
            if (done) return; done = true;
            const c = cur.lat != null ? { lon: cur.lng, lat: cur.lat } : { lon: s.lng, lat: s.lat };
            // ไม่ใช้แอนิเมชัน — ถ้าเลื่อนแบบมีแอนิเมชันแล้วซูมต่อทันที การซูมจะตัดการเลื่อนกลางทาง
            step('center', () => { map.zoom(cur.lat != null ? 14 : 11, false); map.location(c, false); });
            step('school', () => map.Overlays.add(new L.Marker({ lon: s.lng, lat: s.lat }, { title: 'โรงเรียน', icon: { html: '<div class="school-mk">🏫</div>', offset: { x: 14, y: 14 } } })));
            if (cur.lat != null) addMarker();
            step('click', () => map.Event.bind('click', () => {
              const loc = map.location(L.LocationMode.Pointer);
              if (marker) { try { map.Overlays.remove(marker); } catch (e) { /* ข้าม */ } }
              cur.lat = loc.lat; cur.lng = loc.lon; addMarker();
              setPoint({ lat: loc.lat, lng: loc.lon }, { fromMap: true });
            }));
            step('drop', () => map.Event.bind('overlayDrop', o => { try { const loc = o.location(); setPoint({ lat: loc.lat, lng: loc.lon }, { fromMap: true }); } catch (e) { /* ข้าม */ } }));
          };
          step('ready', () => map.Event.bind('ready', init));
          setTimeout(init, 4000);   // กันกรณีแผนที่ไม่ส่งสัญญาณ ready
        }).catch(mapFail);
      }
    });
  }

  return { enabled, pick, route, tripTotal, estimate, search, reverse, provinceOf, parseLL };
})();
