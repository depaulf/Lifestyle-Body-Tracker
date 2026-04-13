// ── THEME ─────────────────────────────────────────────────────────────────────
function applyTheme() { const h = new Date().getHours(); document.body.classList.toggle('night', h < 6 || h >= 20); }
applyTheme(); setInterval(applyTheme, 60000);

// ── CONFIG ────────────────────────────────────────────────────────────────────
const ADONIS_TARGETS = { shoulders:52, waist:32, chest:44, neck:16.5, arms:16, forearms:13, thighs:24, calves:15.5, hips:37, abdomen:31 };
const DAY_CONFIG = {
  Sunday:    { type:'rest', label:'Rest',          cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:false },
  Monday:    { type:'high', label:'Lift + Cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true  },
  Tuesday:   { type:'low',  label:'Cardio Only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true  },
  Wednesday: { type:'high', label:'Lift + Cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true  },
  Thursday:  { type:'low',  label:'Cardio Only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true  },
  Friday:    { type:'high', label:'Lift + Cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true  },
  Saturday:  { type:'low',  label:'Cardio Only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true  }
};
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let weekOffset = 0, currentPage = 'week', openDays = {};

// ── STATE ─────────────────────────────────────────────────────────────────────
function loadState() { try { return JSON.parse(localStorage.getItem('msb_state') || '{}'); } catch { return {}; } }
function saveState(k, v) { const s = loadState(); s[k] = v; localStorage.setItem('msb_state', JSON.stringify(s)); }
function getS(k, d) { return loadState()[k] ?? d; }
function getTargets() { return getS('targets', { highCal:2500, highCarb:254, highFat:76, lowCal:1950, lowCarb:139, lowFat:66, prot:200 }); }

function getEffectiveCfg(day) {
  const wk = weekKey(weekOffset), overrides = getS('day_overrides_' + wk, {}), base = { ...DAY_CONFIG[day] };
  if (!overrides[day]) return base;
  const ov = overrides[day];
  if (ov === 'high') return { ...base, type:'high', label:'Lift + Cardio', lift:true,  cardio:true  };
  if (ov === 'low')  return { ...base, type:'low',  label:'Cardio Only',   lift:false, cardio:true  };
  if (ov === 'rest') return { ...base, type:'rest', label:'Rest',          lift:false, cardio:false };
  return base;
}

function getDayTarget(day) {
  const t = getTargets(), cfg = getEffectiveCfg(day);
  return cfg.type === 'high'
    ? { cal:t.highCal, carb:t.highCarb, fat:t.highFat, prot:t.prot }
    : { cal:t.lowCal,  carb:t.lowCarb,  fat:t.lowFat,  prot:t.prot };
}

function cycleDayType(day) {
  const wk = weekKey(weekOffset), overrides = getS('day_overrides_' + wk, {}), current = getEffectiveCfg(day).type;
  const next = current === 'high' ? 'low' : current === 'low' ? 'rest' : 'high';
  if (next === DAY_CONFIG[day].type) delete overrides[day]; else overrides[day] = next;
  saveState('day_overrides_' + wk, overrides);
  toast(`${day} → ${next === 'high' ? 'Lift + Cardio' : next === 'low' ? 'Cardio Only' : 'Rest'}`);
  renderWeekPage();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function weekStart(o) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay() + o * 7); return d; }
function weekKey(o) { return weekStart(o).toISOString().slice(0, 10); }
function sk(wk, day, kpi) { return `${wk}|${day}|${kpi}`; }
function fmt(d) { return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }); }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

// ── STREAK & PROJECTION ───────────────────────────────────────────────────────
function calcStreak() {
  let streak = 0;
  for (let i = 1; i <= 52; i++) {
    const wk = weekKey(-i), state = getS('checks_' + wk, {});
    let total = 0, hit = 0;
    DAYS.forEach(day => {
      const cfg = DAY_CONFIG[day];
      const tgt = cfg.type === 'high' ? { cal:getTargets().highCal, carb:getTargets().highCarb, fat:getTargets().highFat, prot:getTargets().prot } : { cal:getTargets().lowCal, carb:getTargets().lowCarb, fat:getTargets().lowFat, prot:getTargets().prot };
      const kpis = buildKPIs(day, tgt, cfg);
      total += kpis.length; hit += kpis.filter(k => state[sk(wk, day, k.id)]).length;
    });
    if (total > 0 && (hit / total) >= 0.8) streak++; else break;
  }
  return streak;
}

function calcProjectedDate() {
  const checkins = getS('checkins', []);
  if (checkins.length < 2) return null;
  const recent = checkins.find(c => c.waist), older = checkins.slice(1).find(c => c.waist);
  if (!recent || !older) return null;
  const weeklyLoss = older.waist - recent.waist;
  if (weeklyLoss <= 0) return null;
  const weeksNeeded = Math.ceil((recent.waist - 32) / weeklyLoss);
  if (weeksNeeded <= 0 || weeksNeeded > 200) return null;
  const projDate = new Date(); projDate.setDate(projDate.getDate() + weeksNeeded * 7);
  return { date: projDate.toLocaleDateString('en-US', { month:'long', year:'numeric' }), weeks: weeksNeeded, weeklyLoss: weeklyLoss.toFixed(2) };
}

// ── MONDAY REMINDER ───────────────────────────────────────────────────────────
function requestNotificationPermission() {
  if (!('Notification' in window)) { toast('Notifications not supported'); return; }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') { saveState('notif_enabled', true); toast('Monday reminders enabled!'); scheduleMondayCheck(); }
    else toast('Permission denied — enable in browser settings');
  });
}
function scheduleMondayCheck() {
  setInterval(() => {
    const now = new Date(), enabled = getS('notif_enabled', false), lastNotif = getS('last_monday_notif', ''), todayKey = now.toISOString().slice(0, 10);
    if (enabled && now.getDay() === 1 && now.getHours() >= 7 && now.getHours() < 9 && lastNotif !== todayKey && Notification.permission === 'granted') {
      new Notification('Lifestyle Body', { body: 'Monday check-in time — weigh in, take measurements, log your photos.', icon: '/icon-192.png' });
      saveState('last_monday_notif', todayKey);
    }
  }, 30 * 60 * 1000);
}
if (getS('notif_enabled', false) && Notification.permission === 'granted') scheduleMondayCheck();

// ── RENDER ────────────────────────────────────────────────────────────────────
function render() {
  applyTheme();
  const pages = [['week','Week'],['checkin','Check-In'],['stats','Stats'],['adonis','Adonis'],['coach','Coach'],['targets','Targets']];
  document.getElementById('app').innerHTML = `
    <div class="nav">
      <div class="nav-brand"><div class="nav-title">Lifestyle <span>Body</span></div></div>
      <div style="display:flex;align-items:center;gap:8px" id="nav-wc"></div>
    </div>
    <div class="page-tabs">
      ${pages.map(([p,l]) => `<button class="ptab ${currentPage===p?'active':''}" onclick="switchPage('${p}')">${l}</button>`).join('')}
    </div>
    ${pages.map(([p]) => `<div class="page ${currentPage===p?'active':''}" id="page-${p}"></div>`).join('')}
    <div class="toast" id="toast"></div>`;
  renderWeekControls();
  ({ week:renderWeekPage, checkin:renderCheckinPage, stats:renderStatsPage, adonis:renderAdonisPage, coach:renderCoachPage, targets:renderTargetsPage })[currentPage]?.();
}
function switchPage(p) { currentPage = p; render(); }
function changeWeek(d) { weekOffset += d; openDays = {}; render(); }

function openWeekPicker() {
  const existing = document.getElementById('week-picker-overlay'); if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'week-picker-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:500;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const panel = document.createElement('div');
  panel.style.cssText = 'background:var(--surface);border:1px solid var(--border2);border-radius:16px;overflow:hidden;width:100%;max-width:360px;max-height:80vh;display:flex;flex-direction:column';
  const hdr = document.createElement('div');
  hdr.style.cssText = 'padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0';
  hdr.innerHTML = `<div style="font-size:16px;font-weight:700">Jump to Week</div><span style="cursor:pointer;font-size:18px;color:var(--muted);padding:4px 8px" onclick="document.getElementById('week-picker-overlay').remove()">✕</span>`;
  panel.appendChild(hdr);
  const list = document.createElement('div'); list.style.cssText = 'overflow-y:auto;flex:1';
  let lastMonth = '';
  for (let i = 0; i >= -52; i--) {
    const ws = weekStart(i), we = new Date(ws); we.setDate(ws.getDate() + 6);
    const monthLabel = ws.toLocaleDateString('en-US', { month:'long', year:'numeric' });
    if (monthLabel !== lastMonth) {
      const mhdr = document.createElement('div');
      mhdr.style.cssText = 'padding:8px 16px 4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--surface2)';
      mhdr.textContent = monthLabel; list.appendChild(mhdr); lastMonth = monthLabel;
    }
    const isCurrent = i === weekOffset, isThisWeek = i === 0;
    const row = document.createElement('div');
    row.style.cssText = `padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:${isCurrent?'var(--gold-dim)':'transparent'}`;
    const dateSpan = document.createElement('span');
    dateSpan.style.cssText = `font-family:'DM Mono',monospace;font-size:13px;color:${isCurrent?'var(--gold)':'var(--text)'}`;
    dateSpan.textContent = `${fmt(ws)} – ${fmt(we)}`;
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px';
    if (isThisWeek) { badge.style.background='var(--green-dim)'; badge.style.color='var(--green)'; badge.textContent='NOW'; }
    else if (isCurrent) { badge.style.background='var(--gold-dim)'; badge.style.color='var(--gold)'; badge.textContent='VIEWING'; }
    row.appendChild(dateSpan); row.appendChild(badge);
    const offset = i;
    row.onclick = () => { weekOffset = offset; openDays = {}; overlay.remove(); render(); };
    list.appendChild(row);
  }
  panel.appendChild(list); overlay.appendChild(panel); document.body.appendChild(overlay);
}

function renderWeekControls() {
  const el = document.getElementById('nav-wc'); if (currentPage !== 'week') { el.innerHTML = ''; return; }
  const ws = weekStart(weekOffset), we = new Date(ws); we.setDate(ws.getDate() + 6);
  el.innerHTML = `
    <button class="week-btn" onclick="changeWeek(-1)">&#8592;</button>
    <button onclick="openWeekPicker()" style="background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:5px 10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;color:var(--text);white-space:nowrap;display:flex;align-items:center;gap:5px">
      ${fmt(ws)} – ${fmt(we)}<span style="font-size:9px;color:var(--muted)">▾</span>
    </button>
    <button class="week-btn" onclick="changeWeek(1)" ${weekOffset===0?'disabled style="opacity:.3;cursor:not-allowed"':''}>&#8594;</button>`;
}

// ── WEEK PAGE ─────────────────────────────────────────────────────────────────
function buildKPIs(day, tgt, cfg) {
  const k = [
    { id:'protein',  label:'200g protein hit',                     meta: tgt.prot + 'g'    },
    { id:'calories', label:`Calories on target — ${tgt.cal} kcal`, meta: '±100 kcal'       },
    { id:'steps',    label:'10,000 steps',                          meta: 'daily'           },
    { id:'creatine', label:'5g creatine taken',                     meta: 'daily'           },
  ];
  if (cfg.lift)   k.push({ id:'lift',   label:'Lift session — Lifestyle Body',  meta: 'Mon / Wed / Fri' });
  if (cfg.cardio) k.push({ id:'cardio', label:'30 min stair climber — level 5', meta: 'Mon – Sat'       });
  return k;
}

function renderWeekPage() {
  const wk = weekKey(weekOffset), state = getS('checks_' + wk, {});
  let prot=0, lifts=0, steps=0, cardio=0;
  DAYS.forEach(d => { if(state[sk(wk,d,'protein')])prot++; if(state[sk(wk,d,'lift')])lifts++; if(state[sk(wk,d,'steps')])steps++; if(state[sk(wk,d,'cardio')])cardio++; });
  const g = n => n > 0 ? 'gold' : '';
  const streak = calcStreak(), proj = calcProjectedDate();
  const streakEmoji = streak >= 8 ? ' 🔥' : streak >= 4 ? ' ⚡' : '';
  let html = `
  <div class="streak-bar">
    <div class="streak-left">
      <div class="streak-num ${streak>0?'gold':''}">${streak}<span style="font-size:14px;font-family:'DM Sans',sans-serif;font-weight:500"> wk streak${streakEmoji}</span></div>
      <div class="streak-sub">${streak===0?'Hit 80%+ this week to start your streak':streak===1?'Started — keep it going':`${streak} weeks of 80%+ compliance`}</div>
    </div>
    ${proj?`<div class="streak-right"><div class="streak-proj-label">Goal waist est.</div><div class="streak-proj-date">${proj.date}</div><div class="streak-proj-sub">${proj.weeks} weeks · ${proj.weeklyLoss}" / wk</div></div>`:''}
  </div>
  <div class="kpi-grid">
    <div class="kpi-tile"><div class="big ${g(prot)}">${prot}<span style="font-size:14px;color:var(--faint)">/7</span></div><div class="lbl">Protein</div></div>
    <div class="kpi-tile"><div class="big ${g(lifts)}">${lifts}<span style="font-size:14px;color:var(--faint)">/3</span></div><div class="lbl">Lifts</div></div>
    <div class="kpi-tile"><div class="big ${g(steps)}">${steps}<span style="font-size:14px;color:var(--faint)">/7</span></div><div class="lbl">Steps</div></div>
    <div class="kpi-tile"><div class="big ${g(cardio)}">${cardio}<span style="font-size:14px;color:var(--faint)">/5</span></div><div class="lbl">Cardio</div></div>
  </div>`;
  const ws = weekStart(weekOffset), wkOverrides = getS('day_overrides_' + wk, {});
  DAYS.forEach((day, idx) => {
    const cfg = getEffectiveCfg(day), tgt = getDayTarget(day), isOverridden = !!wkOverrides[day];
    const dayDate = new Date(ws); dayDate.setDate(ws.getDate() + idx);
    const kpis = buildKPIs(day, tgt, cfg), total = kpis.length;
    const done = kpis.filter(k => state[sk(wk, day, k.id)]).length;
    const isOpen = openDays[wk + '|' + day] || false;
    const dot = cfg.type==='high'?'var(--green)':cfg.type==='low'?'var(--muted)':'var(--purple)';
    const bc = cfg.type==='high'?'b-high':cfg.type==='low'?'b-low':'b-rest';
    const uploads = getS('uploads_' + wk + '_' + day, {});
    const aiSt = getS('aistatus_' + wk + '_' + day, {});
    html += `<div class="day-card">
      <div class="day-hdr" onclick="toggleDay('${day}')">
        <div class="day-left">
          <div class="day-dot" style="background:${dot}"></div>
          <div>
            <div class="day-name">${day}</div>
            <div class="day-date">${dayDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
          </div>
        </div>
        <div class="day-right">
          <span class="dbadge ${bc}" onclick="event.stopPropagation();cycleDayType('${day}')" style="cursor:pointer;${isOverridden?'outline:2px solid var(--gold);outline-offset:2px;':''}">${cfg.label}${isOverridden?' ✎':''}</span>
          <span class="day-score">${done}/${total}</span>
        </div>
      </div>
      <div class="day-body ${isOpen?'open':''}" id="body-${day}">
        <div class="sec-label">Daily KPIs</div>`;
    kpis.forEach(kpi => {
      const chk = state[sk(wk, day, kpi.id)] || false, st = aiSt[kpi.id];
      html += `<div class="krow" onclick="toggleKPI('${wk}','${day}','${kpi.id}')">
        <div class="cb ${chk?'on':''}"><div class="ck"></div></div>
        <span class="ktext ${chk?'done':''}">${kpi.label}</span>
        ${st?`<span class="kstatus ${st.cls}">${st.val}`+'</span>':''}
        <span class="kmeta">${kpi.meta}</span>
      </div>`;
    });
    const hasAny = Object.keys(uploads).length > 0;
    html += `<div class="upload-zone">
      <div class="sec-label" style="padding:0 0 8px">Log from Screenshot</div>
      <div class="upload-grid">
        <label class="upload-tile ${uploads.mfp?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','mfp')">
          <div class="ui">📱</div><div class="ul">${uploads.mfp?'MFP ✓':'MFP Diary'}</div>
        </label>
        <label class="upload-tile ${uploads.steps?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','steps')">
          <div class="ui">👟</div><div class="ul">${uploads.steps?'Steps ✓':'Step Count'}</div>
        </label>
        <label class="upload-tile ${uploads.workout?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','workout')">
          <div class="ui">🏋️</div><div class="ul">${uploads.workout?'Workout ✓':'Workout'}</div>
        </label>
      </div>
      <button class="proc-btn" id="proc-${day}" onclick="processScreenshots('${wk}','${day}')" ${!hasAny?'disabled':''}>
        Read Screenshots &amp; Auto-Log
      </button>
      <div class="ai-out" id="aiout-${day}"></div>
    </div>`;
    if (cfg.lift) {
      const ll = getS('lifts_' + wk + '_' + day, []);
      html += `<div class="lift-log">
        <div class="sec-label" style="padding:0 0 8px">Lift Log</div>
        <div class="lift-inputs">
          <input class="li-ex" id="lex-${day}" type="text" placeholder="Exercise (e.g. Incline Press)">
          <input class="li-sm" id="lsets-${day}" type="text" placeholder="3x8">
          <input class="li-sm" id="lwt-${day}" type="text" placeholder="185 lbs">
          <button class="li-btn" onclick="addLift('${wk}','${day}')">+ Add</button>
        </div>
        <div id="liftlist-${day}">`;
      ll.forEach((l, i) => { html += `<div class="lift-item"><span>${l.ex} — ${l.sets} @ ${l.wt}</span><span class="lift-del" onclick="deleteLift('${wk}','${day}',${i})">✕</span></div>`; });
      html += `</div></div>`;
    }
    html += `</div></div>`;
  });
  document.getElementById('page-week').innerHTML = html;
}

function toggleDay(day) {
  const wk = weekKey(weekOffset), k = wk+'|'+day, isOpen = openDays[k];
  DAYS.forEach(d => { openDays[wk+'|'+d] = false; document.getElementById('body-'+d)?.classList.remove('open'); });
  if (!isOpen) { openDays[k] = true; document.getElementById('body-'+day)?.classList.add('open'); }
}
function toggleKPI(wk, day, id) { const s = getS('checks_'+wk, {}); s[sk(wk,day,id)] = !s[sk(wk,day,id)]; saveState('checks_'+wk, s); renderWeekPage(); }
function addLift(wk, day) { const ex = document.getElementById('lex-'+day)?.value.trim(); if (!ex) return; const l = getS('lifts_'+wk+'_'+day, []); l.push({ ex, sets: document.getElementById('lsets-'+day)?.value.trim()||'—', wt: document.getElementById('lwt-'+day)?.value.trim()||'—' }); saveState('lifts_'+wk+'_'+day, l); renderWeekPage(); }
function deleteLift(wk, day, i) { const l = getS('lifts_'+wk+'_'+day, []); l.splice(i, 1); saveState('lifts_'+wk+'_'+day, l); renderWeekPage(); }
function handleUpload(ev, wk, day, type) {
  const f = ev.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const b64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
      const u = getS('uploads_'+wk+'_'+day, {});
      u[type] = { b64, mime: 'image/jpeg' };
      saveState('uploads_'+wk+'_'+day, u);
      renderWeekPage();
      setTimeout(() => { openDays[wk+'|'+day] = true; renderWeekPage(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}

async function processScreenshots(wk, day) {
  const uploads = getS('uploads_'+wk+'_'+day, {}); if (!Object.keys(uploads).length) return;
  const tgt = getDayTarget(day), btn = document.getElementById('proc-'+day), out = document.getElementById('aiout-'+day);
  if (!btn || !out) return;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Reading screenshots…';
  out.className = 'ai-out show'; out.textContent = 'Analyzing…';
  const content = [];
  Object.entries(uploads).forEach(([type, img]) => { content.push({type:'text',text:`Image: ${type}`}); content.push({type:'image',source:{type:'base64',media_type:img.mime,data:img.b64}}); });
  const yr = new Date().getFullYear();
  content.push({type:'text',text:`Analyze these fitness screenshots for ${day}. Today's year is ${yr}.

Targets: ${tgt.cal} kcal (0–100 under = GREEN/hit, over target = RED, more than 100 under = AMBER warning), ${tgt.prot}g protein, 10,000 steps.

STEPS screenshots: Look for a large bold number followed by "steps" — could be Apple Health, Fitbit, any step counter. May be formatted like 10,959.
MFP screenshots: Look for Protein, Carbs, Fat totals. Date like "Mon, Mar 23" = year is ${yr}.
Strong app screenshots: Look for exercise names, sets x reps x weight.

Extract all numbers and output:

KPI STATUS:
- Calories: [number found] / ${tgt.cal} — GREEN/AMBER/RED
- Protein: [number]g / ${tgt.prot}g — GREEN/RED
- Steps: [number] / 10,000 — GREEN/RED

VERDICTS:
PROTEIN_HIT: true/false
CALORIES_HIT: true/false
STEPS_HIT: true/false
LIFT_LOGGED: true/false

If image is unreadable: IMAGE_ERROR: true`});
  try {
    const resp = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'user',content}] }) });
    const data = await resp.json(); const text = data.content?.map(c=>c.text||'').join('') || data.error || 'No response.';
    out.textContent = text;
    const s = getS('checks_'+wk, {});
    if (/PROTEIN_HIT:\s*true/i.test(text))  s[sk(wk,day,'protein')]  = true;
    if (/CALORIES_HIT:\s*true/i.test(text)) s[sk(wk,day,'calories')] = true;
    if (/STEPS_HIT:\s*true/i.test(text))    s[sk(wk,day,'steps')]    = true;
    if (/LIFT_LOGGED:\s*true/i.test(text))  s[sk(wk,day,'lift')]     = true;
    saveState('checks_'+wk, s);
    const aiSt = {};
    const cm = text.match(/(\d{3,4})\s*(kcal|cal)/i); if (cm) { const lg=parseInt(cm[1]),diff=tgt.cal-lg; aiSt.calories={cls:lg>tgt.cal?'bad':diff<=100?'ok':'warn',val:lg>tgt.cal?`+${Math.abs(diff)} over`:`${diff} under`}; }
    const pm = text.match(/protein[:\s]+(\d+)g/i); if (pm) { const p=parseInt(pm[1]); aiSt.protein={cls:p>=tgt.prot?'ok':'bad',val:p+'g'}; }
    const sm = text.match(/([\d,]+)\s*steps/i); if (sm) { const st=parseInt(sm[1].replace(',','')); aiSt.steps={cls:st>=10000?'ok':'bad',val:st.toLocaleString()}; }
    saveState('aistatus_'+wk+'_'+day, aiSt);
    toast('Screenshots logged'); renderWeekPage(); setTimeout(() => { openDays[wk+'|'+day] = true; renderWeekPage(); }, 50);
  } catch(err) { out.textContent = 'Error: ' + err.message; }
  btn.disabled = false; btn.innerHTML = 'Read Screenshots &amp; Auto-Log';
}

// ── CHECK-IN PAGE ─────────────────────────────────────────────────────────────
function renderCheckinPage() {
  const checkins = getS('checkins', []), photos = getS('checkin_photos_draft', {});
  const scanReady = ['scale','measurements'].some(k => { const p=photos[k]; return p && (typeof p==='object'?p.b64:p); });
  const lastCoachDate = getS('last_coach_date', '');
  let html = `
  <div id="coach-ready-banner" style="display:none;background:var(--green-dim);border:1px solid var(--green);border-radius:12px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:var(--green);font-weight:600;text-align:center;cursor:pointer" onclick="switchPage('coach')">
    Coach analysis ready — tap to view ›
  </div>
  ${lastCoachDate?`<div style="background:var(--gold-dim);border:1px solid rgba(184,150,46,.3);border-radius:12px;padding:10px 16px;margin-bottom:12px;font-size:12px;color:var(--gold);font-family:'DM Mono',monospace">
    Last coach analysis: ${lastCoachDate} — <span style="cursor:pointer;text-decoration:underline" onclick="switchPage('coach')">view in Coach tab</span>
  </div>`:''}
  <div class="card">
    <div class="card-title">AI Photo Scan <span class="badge-sm badge-gold">Snap &amp; Auto-Fill</span></div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.7">
      Upload your scale screenshot and body measurement screenshot. Claude reads every number and fills your check-in automatically.
    </div>
    <div class="upload-grid" style="margin-bottom:10px">
      <label class="upload-tile ${photos.scale&&(typeof photos.scale==='object'?photos.scale.b64:photos.scale)?'has':''}">
        <input type="file" accept="image/*" onchange="handleCheckinScan(event,'scale')">
        <div class="ui">⚖️</div><div class="ul">${photos.scale&&(typeof photos.scale==='object'?photos.scale.b64:photos.scale)?'Scale ✓':'Scale Photo'}</div>
      </label>
      <label class="upload-tile ${photos.measurements&&(typeof photos.measurements==='object'?photos.measurements.b64:photos.measurements)?'has':''}">
        <input type="file" accept="image/*" onchange="handleCheckinScan(event,'measurements')">
        <div class="ui">📏</div><div class="ul">${photos.measurements&&(typeof photos.measurements==='object'?photos.measurements.b64:photos.measurements)?'Measures ✓':'Measurements'}</div>
      </label>
      <label class="upload-tile ${photos.bodyfat&&(typeof photos.bodyfat==='object'?photos.bodyfat.b64:photos.bodyfat)?'has':''}">
        <input type="file" accept="image/*" onchange="handleCheckinScan(event,'bodyfat')">
        <div class="ui">📊</div><div class="ul">${photos.bodyfat&&(typeof photos.bodyfat==='object'?photos.bodyfat.b64:photos.bodyfat)?'Extra ✓':'Extra Stats'}</div>
      </label>
    </div>
    <button class="proc-btn" id="scan-btn" onclick="runCheckinScan()" ${!scanReady?'disabled':''}>
      Scan Photos &amp; Auto-Fill All Measurements
    </button>
    <div class="ai-out" id="scan-out"></div>
  </div>
  <div class="card">
    <div class="card-title">Monday Check-In <span class="badge-sm badge-amber">Every Monday AM</span></div>
    <div class="meas-grid">
      <div class="mfield"><label>Weight (lbs)</label><input id="ci-weight" type="number" step="0.1" placeholder="212.4"></div>
      <div class="mfield"><label>Body Fat %</label><input id="ci-bf" type="number" step="0.1" placeholder="24.2"></div>
      <div class="mfield"><label>Waist (in)</label><input id="ci-waist" type="number" step="0.25" placeholder="35"></div>
      <div class="mfield"><label>Shoulders (in)</label><input id="ci-shoulders" type="number" step="0.25" placeholder="52"></div>
      <div class="mfield"><label>Chest (in)</label><input id="ci-chest" type="number" step="0.25" placeholder="42"></div>
      <div class="mfield"><label>Neck (in)</label><input id="ci-neck" type="number" step="0.25" placeholder="16"></div>
      <div class="mfield"><label>Arms (in)</label><input id="ci-arms" type="number" step="0.25" placeholder="15.5"></div>
      <div class="mfield"><label>Forearms (in)</label><input id="ci-forearms" type="number" step="0.25" placeholder="12"></div>
      <div class="mfield"><label>Abdomen (in)</label><input id="ci-abdomen" type="number" step="0.25" placeholder="35.5"></div>
      <div class="mfield"><label>Hips / Glutes (in)</label><input id="ci-hips" type="number" step="0.25" placeholder="41"></div>
      <div class="mfield"><label>Thighs (in)</label><input id="ci-thighs" type="number" step="0.25" placeholder="23"></div>
      <div class="mfield"><label>Calves (in)</label><input id="ci-calves" type="number" step="0.25" placeholder="15.2"></div>
    </div>
    <div class="card-title" style="margin-top:4px">Progress Photos <span class="badge-sm badge-blue">4 Angles</span></div>
    <div class="photo-grid">
      <label class="photo-tile ${photos.front?'has':''}"><input type="file" accept="image/*" onchange="handleProgressPhoto(event,'front')">${photos.front?`<img src="${photos.front}" alt="front">`:'<div class="pi">📸</div><div class="pl">Front</div>'}</label>
      <label class="photo-tile ${photos.back?'has':''}"><input type="file" accept="image/*" onchange="handleProgressPhoto(event,'back')">${photos.back?`<img src="${photos.back}" alt="back">`:'<div class="pi">📸</div><div class="pl">Back</div>'}</label>
      <label class="photo-tile ${photos.side?'has':''}"><input type="file" accept="image/*" onchange="handleProgressPhoto(event,'side')">${photos.side?`<img src="${photos.side}" alt="side">`:'<div class="pi">📸</div><div class="pl">Side</div>'}</label>
      <label class="photo-tile ${photos.flex?'has':''}"><input type="file" accept="image/*" onchange="handleProgressPhoto(event,'flex')">${photos.flex?`<img src="${photos.flex}" alt="flex">`:'<div class="pi">📸</div><div class="pl">Flexed</div>'}</label>
    </div>
    <button class="save-btn btn-gold" onclick="saveCheckin()">Save Monday Check-In</button>
  </div>`;
  if (checkins.length > 0) {
    html += `<div class="card"><div class="card-title">History</div>`;
    checkins.slice(0, 12).forEach(c => {
      html += `<div class="h-entry"><div class="h-date">${c.date}</div><div class="h-stats">
        ${['weight','waist','shoulders','bf','chest','arms','neck','thighs','calves','hips','abdomen'].map(f => c[f]?`<div class="h-stat">${f.charAt(0).toUpperCase()+f.slice(1)}<span>${c[f]}${f==='weight'?' lbs':f==='bf'?'%':'"'}</span></div>`:'').join('')}
      </div>`;
      if (c.photos && ['front','back','side','flex'].some(k => c.photos[k])) {
        html += `<div class="h-photos">`;
        ['front','back','side','flex'].forEach(k => { if (c.photos[k]) html += `<img class="h-photo" src="${c.photos[k]}" alt="${k}">`; });
        html += `</div>`;
      }
      html += `</div>`;
    });
    const hasPhotoPairs = checkins.filter(c => c.photos && ['front','back','side','flex'].some(k => c.photos[k])).length >= 2;
    if (hasPhotoPairs) {
      const cA = checkins[checkins.length-1], cB = checkins[0];
      const angles = ['front','back','side','flex'].filter(k => cA.photos?.[k] || cB.photos?.[k]);
      html += `<div class="card-title" style="margin-top:12px">Photo Comparison <span class="badge-sm badge-gold">First vs Latest</span></div>`;
      html += `<div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">${cA.date}</div><div style="font-size:11px;color:var(--gold);font-family:'DM Mono',monospace">${cB.date} (latest)</div></div>`;
      angles.forEach(angle => {
        html += `<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${angle}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>${cA.photos?.[angle]?`<img src="${cA.photos[angle]}" style="width:100%;border-radius:10px;border:1px solid var(--border)" alt="before">`:`<div style="aspect-ratio:3/4;background:var(--surface2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--faint)">No photo</div>`}</div>
          <div>${cB.photos?.[angle]?`<img src="${cB.photos[angle]}" style="width:100%;border-radius:10px;border:1px solid var(--gold)" alt="after">`:`<div style="aspect-ratio:3/4;background:var(--surface2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--faint)">No photo</div>`}</div>
        </div></div>`;
      });
    }
    html += `</div>`;
  }
  document.getElementById('page-checkin').innerHTML = html;
}

function handleCheckinScan(ev, slot) {
  const f = ev.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const b64 = dataUrl.split(',')[1];
      const p = getS('checkin_photos_draft', {});
      p[slot] = { b64, mime: 'image/jpeg' };
      saveState('checkin_photos_draft', p);
      renderCheckinPage();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}
function handleProgressPhoto(ev, slot) {
  const f = ev.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.72);
      const p = getS("checkin_photos_draft", {});
      p[slot] = compressed;
      saveState("checkin_photos_draft", p);
      renderCheckinPage();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}

async function runCheckinScan() {
  const photos = getS('checkin_photos_draft', {}), btn = document.getElementById('scan-btn'), out = document.getElementById('scan-out');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Reading your stats…';
  out.className = 'ai-out show'; out.textContent = 'Scanning…';
  const content = [];
  ['scale','measurements','bodyfat'].forEach(type => {
    if (photos[type]) { const img=photos[type],b64=typeof img==='object'?img.b64:img,mime=typeof img==='object'?img.mime:'image/jpeg'; content.push({type:'text',text:`Image: ${type}`}); content.push({type:'image',source:{type:'base64',media_type:mime,data:b64}}); }
  });
  content.push({type:'text',text:`Read all fitness measurement data from these screenshots. Extract every visible number and output ONLY:\n\nWEIGHT: [number] lbs\nBODY_FAT: [number] %\nWAIST: [number] in\nSHOULDERS: [number] in\nCHEST: [number] in\nNECK: [number] in\nARMS: [number] in\nFOREARMS: [number] in\nABDOMEN: [number] in\nHIPS: [number] in\nTHIGHS: [number] in\nCALVES: [number] in\n\nSkip fields not visible. For bilateral measurements use the average.\nSUMMARY: [one line of what you found]`});
  try {
    const resp = await fetch('/api/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const data = await resp.json(); const text = data.content?.map(c=>c.text||'').join('')||'No response.';
    out.textContent = text;
    const map = {WEIGHT:'weight',BODY_FAT:'bf',WAIST:'waist',SHOULDERS:'shoulders',CHEST:'chest',NECK:'neck',ARMS:'arms',FOREARMS:'forearms',ABDOMEN:'abdomen',HIPS:'hips',THIGHS:'thighs',CALVES:'calves'};
    let filled = 0;
    Object.entries(map).forEach(([key,id]) => { const m=text.match(new RegExp(key+':\\s*([\\d.]+)','i')); if(m){const el=document.getElementById('ci-'+id); if(el){el.value=parseFloat(m[1]);filled++;}} });
    toast(`${filled} fields auto-filled — review & save`);
  } catch(err) { out.textContent = 'Error: ' + err.message; }
  btn.disabled = false; btn.innerHTML = 'Scan Photos &amp; Auto-Fill All Measurements';
}

function saveCheckin() {
  const fields = ['weight','bf','waist','shoulders','chest','neck','arms','forearms','abdomen','hips','thighs','calves'];
  const entry = { date: new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) };
  fields.forEach(f => { const v=parseFloat(document.getElementById('ci-'+f)?.value); if(!isNaN(v)) entry[f]=v; });
  const allPhotos = getS('checkin_photos_draft', {}); entry.photos = {};
  ['front','back','side','flex'].forEach(k => { if(allPhotos[k]) entry.photos[k]=allPhotos[k]; });
  const checkins = getS('checkins', []); checkins.unshift(entry);
  saveState('checkins', checkins); saveState('checkin_photos_draft', {});
  toast('Check-in saved — running coach analysis…');
  renderCheckinPage();
  setTimeout(() => runCoachAnalysisSilent(), 800);
}

async function runCoachAnalysisSilent() {
  try {
    const analysis = await buildAndRunCoach();
    if (analysis) {
      saveState('last_coach_analysis', analysis);
      saveState('last_coach_date', new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
      applyMacroAdjustments(analysis);
      const banner = document.getElementById('coach-ready-banner');
      if (banner) { banner.style.display='block'; banner.textContent='Coach analysis ready — tap Coach tab to view'; }
    }
  } catch(err) { console.error('Silent coach error:', err); }
}

// ── STATS PAGE ────────────────────────────────────────────────────────────────
function renderStatsPage() {
  const checkins = getS('checkins', []);
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const wk = weekKey(-i), state = getS('checks_' + wk, {});
    let total=0,hit=0,prot=0,lifts=0,steps=0,cardio=0;
    DAYS.forEach(day => {
      const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg);
      total+=kpis.length; hit+=kpis.filter(k=>state[sk(wk,day,k.id)]).length;
      if(state[sk(wk,day,'protein')])prot++; if(state[sk(wk,day,'lift')])lifts++;
      if(state[sk(wk,day,'steps')])steps++; if(state[sk(wk,day,'cardio')])cardio++;
    });
    weeklyData.push({ label:fmt(weekStart(-i)), pct:total>0?Math.round((hit/total)*100):0, prot, lifts, steps, cardio });
  }
  const monthWeeks = weeklyData.slice(4);
  const avgC = monthWeeks.length ? Math.round(monthWeeks.reduce((a,w)=>a+w.pct,0)/monthWeeks.length) : 0;
  const best = weeklyData.reduce((a,b)=>b.pct>a.pct?b:a, weeklyData[0]||{pct:0,label:'—'});
  const worst = weeklyData.filter(w=>w.pct>0).reduce((a,b)=>b.pct<a.pct?b:a, weeklyData[0]||{pct:0,label:'—'});
  const rc = checkins.slice(0, 10).reverse();
  const streak = calcStreak(), proj = calcProjectedDate();

  function spark(pts, color, w, h) {
    if (pts.length < 2) return `<text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="10" fill="var(--faint)">log more check-ins</text>`;
    const mn=Math.min(...pts)*0.97,mx=Math.max(...pts)*1.03,range=mx-mn||1;
    const coords=pts.map((v,i)=>`${Math.round((i/(pts.length-1))*w)},${Math.round(h-((v-mn)/range)*(h-14)-7)}`);
    const last=coords[coords.length-1].split(',');
    return `<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/>
      <text x="${last[0]}" y="${Math.max(12,parseInt(last[1])-8)}" text-anchor="middle" font-size="10" font-family="DM Mono,monospace" fill="${color}">${pts[pts.length-1]}</text>`;
  }

  let barSvg = `<svg viewBox="0 0 320 90" style="width:100%;height:90px">`;
  weeklyData.forEach((w,i) => {
    const x=i*40+4,bh=Math.round((w.pct/100)*65),by=70-bh,col=w.pct>=80?'var(--green)':w.pct>=60?'var(--amber)':'var(--red)';
    barSvg += `<rect x="${x}" y="${by}" width="32" height="${Math.max(bh,2)}" rx="3" fill="${col}" opacity="0.75"/>`;
    if(w.pct>0) barSvg += `<text x="${x+16}" y="${by-4}" text-anchor="middle" font-size="8" font-family="DM Mono,monospace" fill="${col}">${w.pct}%</text>`;
    barSvg += `<text x="${x+16}" y="83" text-anchor="middle" font-size="7" font-family="DM Sans,sans-serif" fill="var(--faint)">${w.label.split(' ')[1]||w.label}</text>`;
  });
  barSvg += `</svg>`;

  function trendCard(label, pts, color, unit, goal, inverse) {
    const latest=pts[pts.length-1],prev=pts[pts.length-2];
    const chg=latest!=null&&prev!=null?parseFloat((latest-prev).toFixed(1)):null;
    const onTrack=inverse?(latest!=null&&latest<=goal):(latest!=null&&latest>=goal);
    return `<div class="trend-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:10px;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;font-weight:600;margin-bottom:4px">${label}</div>
          <div class="stat-num" style="color:${onTrack?'var(--green)':'var(--gold)'}">${latest!=null?latest+unit:'—'}</div>
          ${chg!=null?`<div style="font-size:11px;font-family:'DM Mono',monospace;margin-top:4px;color:${(inverse?chg<0:chg>0)?'var(--green)':'var(--red)'}">${chg>0?'+':''}${chg}${unit} vs last week</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:600;letter-spacing:.05em;text-transform:uppercase">Goal</div>
          <div style="font-size:20px;font-weight:700;color:var(--green)">${goal}${unit}</div>
        </div>
      </div>
      <svg viewBox="0 0 280 55" style="width:100%;height:55px">${spark(pts,color,280,55)}</svg>
    </div>`;
  }

  const wp=rc.map(c=>c.weight).filter(Boolean),wsp=rc.map(c=>c.waist).filter(Boolean),shp=rc.map(c=>c.shoulders).filter(Boolean),bfp=rc.map(c=>c.bf).filter(Boolean),rp=rc.filter(c=>c.shoulders&&c.waist).map(c=>parseFloat((c.shoulders/c.waist).toFixed(3)));
  let html = `
  <div class="card">
    <div class="card-title">Monthly Summary <span class="badge-sm badge-navy">${new Date().toLocaleDateString('en-US',{month:'long'})}</span></div>
    <div class="kpi-grid" style="margin-bottom:${proj?'12px':'0'}">
      <div class="kpi-tile"><div class="big ${avgC>=80?'green':avgC>=60?'amber':'red'}">${avgC}<span style="font-size:14px;color:var(--faint)">%</span></div><div class="lbl">Avg Compliance</div></div>
      <div class="kpi-tile"><div class="big gold" style="font-size:16px">${best.label||'—'}</div><div class="lbl">Best Week (${best.pct}%)</div></div>
      <div class="kpi-tile"><div class="big amber" style="font-size:16px">${worst.label||'—'}</div><div class="lbl">Needs Work</div></div>
      <div class="kpi-tile"><div class="big gold">${streak}</div><div class="lbl">Wk Streak</div></div>
    </div>
    ${proj?`<div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border)">
      <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px">Projected Goal Date</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:22px;font-weight:700;color:var(--green)">${proj.date}</div><div style="font-size:12px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">${proj.weeks} weeks to 32" waist · losing ${proj.weeklyLoss}" / week</div></div>
        <div style="font-size:28px">🎯</div>
      </div>
    </div>`:`<div style="font-size:12px;color:var(--muted);padding:4px 0">Log 2+ check-ins with waist measurements to see your projected goal date.</div>`}
  </div>
  <div class="card">
    <div class="card-title">KPI Compliance — 8 Weeks</div>
    ${barSvg}
    <div style="display:flex;gap:14px;margin-top:6px">
      <span style="font-size:9px;color:var(--green);font-weight:600">■ 80%+ Elite</span>
      <span style="font-size:9px;color:var(--amber);font-weight:600">■ 60% Good</span>
      <span style="font-size:9px;color:var(--red);font-weight:600">■ &lt;60% Push Harder</span>
    </div>
  </div>
  ${checkins.length>=2?`${trendCard('Weight',wp,'var(--blue)',' lbs',200,true)}${trendCard('Waist',wsp,'var(--red)','"',32,true)}${trendCard('Shoulders',shp,'var(--green)','"',52,false)}${trendCard('Body Fat %',bfp,'var(--amber)','%',10,true)}${rp.length>=2?trendCard('Adonis Ratio (S ÷ W)',rp,'var(--purple)','',1.625,false):''}` : `<div class="card" style="text-align:center;padding:28px"><div style="font-size:13px;color:var(--muted)">Log 2+ Monday check-ins to unlock trend graphs.</div></div>`}`;
  document.getElementById('page-stats').innerHTML = html;
}

// ── ADONIS PAGE ───────────────────────────────────────────────────────────────
function renderAdonisPage() {
  const checkins=getS('checkins',[]),latest=checkins[0]||{};
  const sw=latest.shoulders||0,wt=latest.waist||0,ratio=sw&&wt?(sw/wt).toFixed(3):'—',rNum=parseFloat(ratio);
  const rColor=ratio==='—'?'rgba(255,255,255,0.6)':rNum>=1.6?'var(--green)':rNum>=1.5?'var(--amber)':'var(--red)';
  const measures=[{key:'shoulders',label:'Shoulders',target:52},{key:'waist',label:'Waist',target:32,inv:true},{key:'chest',label:'Chest',target:44},{key:'arms',label:'Arms',target:16},{key:'neck',label:'Neck',target:16.5},{key:'forearms',label:'Forearms',target:13},{key:'thighs',label:'Thighs',target:24},{key:'calves',label:'Calves',target:15.5},{key:'hips',label:'Hips / Glutes',target:37},{key:'abdomen',label:'Abdomen',target:31,inv:true}];
  let html=`<div class="card">
    <div class="card-title">Adonis Index <span class="badge-sm badge-blue">6'0" Blueprint</span></div>
    <div class="ratio-hero">
      <div><div class="ratio-label">Current Ratio</div><div class="ratio-val" style="color:${rColor}">${ratio}</div>${ratio!=='—'?`<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;font-family:'DM Mono',monospace">${((rNum/1.625)*100).toFixed(1)}% to goal</div>`:''}</div>
      <div style="text-align:right"><div class="ratio-label">Target Ratio</div><div class="ratio-val" style="color:#6fcf97">1.625</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;font-family:'DM Mono',monospace">52 ÷ 32</div></div>
    </div>
    <div class="adonis-grid">`;
  measures.forEach(m => {
    const cur=latest[m.key]||0,pct=cur?Math.min(100,Math.round(m.inv?(m.target/cur)*100:(cur/m.target)*100)):0;
    const col=pct>=95?'var(--green)':pct>=75?'var(--amber)':'var(--red)';
    const diff=cur?Math.abs(parseFloat((m.inv?cur-m.target:m.target-cur).toFixed(2))):null;
    html+=`<div class="adonis-tile"><div class="at-label">${m.label}</div><div class="at-row"><div class="at-cur" style="color:${cur?col:'var(--faint)'}">${cur?cur+'"':'—'}</div><div class="at-target">goal ${m.target}"</div></div>${diff&&diff>0.05?`<div style="font-size:10px;font-family:'DM Mono',monospace;color:${col};margin-top:3px">${m.inv?diff+'" to lose':diff+'" to gain'}</div>`:''}<div class="at-bar"><div class="at-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  });
  html+=`</div></div>`;
  if(!latest.shoulders) html+=`<div class="card" style="text-align:center;padding:28px"><div style="font-size:13px;color:var(--muted)">Log your first Monday check-in to see your Adonis Index.</div></div>`;
  document.getElementById('page-adonis').innerHTML=html;
}

// ── COACH PAGE ────────────────────────────────────────────────────────────────
function renderCoachPage() {
  const last=getS('last_coach_analysis',''),date=getS('last_coach_date','');
  document.getElementById('page-coach').innerHTML=`
    <div class="card">
      <div class="card-title">Weekly Coach Analysis <span class="badge-sm badge-gold">AI Powered</span></div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.7">
        Reviews your full week — compliance, measurements, macros — and gives you a concrete game plan. Can automatically update your calorie and macro targets.
      </div>
      <button class="save-btn btn-purple" id="analyze-btn" onclick="runCoachAnalysis()" style="margin-bottom:12px">
        Analyze My Week &amp; Get Coaching
      </button>
      <div class="coach-out ${last?'show':''}" id="coach-out">${last||''}</div>
      ${date?`<div style="font-size:10px;color:var(--faint);margin-top:10px;font-family:'DM Mono',monospace">Last analyzed: ${date}</div>`:''}
    </div>`;
}

function buildCoachPrompt() {
  const wk=weekKey(weekOffset),state=getS('checks_'+wk,{}),checkins=getS('checkins',[]),targets=getTargets();
  const latest=checkins[0]||{},prev=checkins[1]||{};
  let sum=`WEEK: ${wk}\n\nKPI COMPLIANCE:\n`;
  DAYS.forEach(day => { const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg),done=kpis.filter(k=>state[sk(wk,day,k.id)]); sum+=`${day} (${cfg.label}): ${done.length}/${kpis.length} — ${done.map(k=>k.id).join(', ')||'none'}\n`; });
  sum+=`\nCURRENT TARGETS:\nHigh: ${targets.highCal} kcal / ${targets.highCarb}g carbs / ${targets.prot}g protein / ${targets.highFat}g fat\nLow: ${targets.lowCal} kcal / ${targets.lowCarb}g carbs / ${targets.prot}g protein / ${targets.lowFat}g fat\n`;
  if (latest.weight) { const f=['weight','bf','waist','shoulders','chest','arms','neck','forearms','abdomen','hips','thighs','calves']; sum+=`\nLATEST CHECK-IN (${latest.date||'recent'}):\n`; f.forEach(x=>{if(latest[x])sum+=`${x}: ${latest[x]}${x==='weight'?' lbs':x==='bf'?'%':'"'}\n`;}); sum+=`S/W ratio: ${latest.shoulders&&latest.waist?(latest.shoulders/latest.waist).toFixed(3):'—'}\n`; }
  if (prev.weight&&latest.weight) { sum+=`\nWEEK CHANGES:\n`; if(latest.weight&&prev.weight)sum+=`Weight: ${prev.weight}→${latest.weight} (${(latest.weight-prev.weight>0?'+':'')+(latest.weight-prev.weight).toFixed(1)} lbs)\n`; if(latest.waist&&prev.waist)sum+=`Waist: ${prev.waist}"→${latest.waist}"\n`; if(latest.shoulders&&prev.shoulders)sum+=`Shoulders: ${prev.shoulders}"→${latest.shoulders}"\n`; }
  return `You are a world-class physique coach — knowledge of Greg O'Gallagher, Stan Efferding, and Jeff Nippard combined.\n\nCLIENT: 6'0", started ~210 lbs / ~23% BF. Program: Lifestyle Body (Movie Star Body protocol).\nGOAL: 32" waist, 52" shoulders, 9–11% body fat. Reference physiques: Will Smith (Focus) / Michael B. Jordan (Black Panther).\nADONIS TARGETS (6'0"): Shoulders 52" | Waist 32" | Chest 44" | Arms 16" | Neck 16.5" | Forearms 13" | Thighs 24" | Calves 15.5" | Hips 37" | Abdomen 31"\n\n${sum}\n\nProvide your full weekly coaching report:\n\n━━━ WEEKLY SCORECARD ━━━\nScore /100, letter grade, one-line verdict.\n\n━━━ WINS THIS WEEK ━━━\nSpecific. What did he nail?\n\n━━━ GAPS & MISSED GAINS ━━━\nWhat cost him progress this week?\n\n━━━ MEASUREMENT ANALYSIS ━━━\nCurrent vs Adonis targets. S/W ratio. What's moving?\n\n━━━ CALORIE & MACRO VERDICT ━━━\nAre current targets optimal? If adjusting:\nNEW HIGH DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\nNEW LOW DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\n\n━━━ NEXT WEEK GAME PLAN ━━━\nSpecific, actionable changes only.\n\n━━━ WORKOUT FOCUS ━━━\nV-taper priority exercises and cues for this exact week.\n\n━━━ TIMELINE TO GOAL ━━━\n• Estimated weeks to 32" waist and Adonis ratio\n• Estimated weeks to 9–11% body fat\n• Approximate workouts remaining to goal\n• Approximate cardio sessions remaining to goal\n\n━━━ COACH'S WORD ━━━\nReal, powerful, God-centered. Speak to who he's becoming. Reference the Will Smith / MBJ vision. Make him want to lock in completely.`;
}

function applyMacroAdjustments(text) {
  const hm=text.match(/NEW HIGH DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
  const lm=text.match(/NEW LOW DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
  if (hm||lm) { const t=getTargets(); if(hm){t.highCal=parseInt(hm[1]);t.highCarb=parseInt(hm[2]);t.prot=parseInt(hm[3]);t.highFat=parseInt(hm[4]);} if(lm){t.lowCal=parseInt(lm[1]);t.lowCarb=parseInt(lm[2]);t.lowFat=parseInt(lm[4]);} saveState('targets',t); toast('Coach updated your targets for next week'); }
}

async function buildAndRunCoach() {
  const prompt=buildCoachPrompt();
  const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:[{type:'text',text:prompt}]}],max_tokens:2000})});
  const data=await resp.json();
  return data.content?.map(c=>c.text||'').join('')||data.error||null;
}

async function runCoachAnalysis() {
  const btn=document.getElementById('analyze-btn'),out=document.getElementById('coach-out');
  if(!btn||!out) return;
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Your coach is analyzing…';
  out.className='coach-out show'; out.textContent='Reviewing your week…';
  try { const text=await buildAndRunCoach(); if(text){out.textContent=text;saveState('last_coach_analysis',text);saveState('last_coach_date',new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));applyMacroAdjustments(text);} }
  catch(err) { out.textContent='Error: '+err.message; }
  btn.disabled=false; btn.innerHTML='Analyze My Week &amp; Get Coaching';
}

// ── TARGETS PAGE ──────────────────────────────────────────────────────────────
function renderTargetsPage() {
  const t=getTargets(),apiKey=getS('api_key','');
  document.getElementById('page-targets').innerHTML=`
    <div class="card">
      <div class="card-title">Nutrition Targets <span class="badge-sm badge-amber">Coach can auto-update</span></div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase">High Days — Mon / Wed / Fri</div>
      <div class="meas-grid">
        <div class="mfield"><label>Calories</label><input class="t-edit" id="t-highCal" type="number" value="${t.highCal}" style="width:100%"></div>
        <div class="mfield"><label>Protein (g)</label><input class="t-edit" id="t-prot" type="number" value="${t.prot}" style="width:100%"></div>
        <div class="mfield"><label>Carbs (g)</label><input class="t-edit" id="t-highCarb" type="number" value="${t.highCarb}" style="width:100%"></div>
        <div class="mfield"><label>Fat (g)</label><input class="t-edit" id="t-highFat" type="number" value="${t.highFat}" style="width:100%"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase">Low Days — Sun / Tue / Thu / Sat</div>
      <div class="meas-grid">
        <div class="mfield"><label>Calories</label><input class="t-edit" id="t-lowCal" type="number" value="${t.lowCal}" style="width:100%"></div>
        <div class="mfield"><label>Protein (g)</label><input class="t-edit" id="t-prot2" type="number" value="${t.prot}" style="width:100%"></div>
        <div class="mfield"><label>Carbs (g)</label><input class="t-edit" id="t-lowCarb" type="number" value="${t.lowCarb}" style="width:100%"></div>
        <div class="mfield"><label>Fat (g)</label><input class="t-edit" id="t-lowFat" type="number" value="${t.lowFat}" style="width:100%"></div>
      </div>
      <button class="save-btn btn-gold" onclick="saveTargets()" style="margin-top:4px">Save Targets</button>
    </div>
    <div class="card">
      <div class="card-title">Anthropic API Key <span class="badge-sm badge-blue">Powers AI features</span></div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.7">Get your key at console.anthropic.com → API Keys. Required for screenshot reading and coach analysis.</div>
      <div class="mfield" style="margin-bottom:12px">
        <label>API Key</label>
        <input id="api-key-input" type="password" placeholder="sk-ant-…" value="${apiKey}" style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 11px;color:var(--text);font-size:13px;font-family:'DM Mono',monospace;width:100%">
      </div>
      <button class="save-btn btn-green" onclick="saveApiKey()">Save API Key</button>
    </div>
    <div class="card">
      <div class="card-title">Monday Reminder <span class="badge-sm badge-green">Notification</span></div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.7">Get a notification every Monday at 7am to do your check-in.</div>
      <div style="font-size:12px;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:12px">
        Status: <span style="color:${getS('notif_enabled',false)&&('Notification' in window)&&Notification.permission==='granted'?'var(--green)':'var(--amber)'}">${getS('notif_enabled',false)&&('Notification' in window)&&Notification.permission==='granted'?'Enabled ✓':'Not enabled'}</span>
      </div>
      <button class="save-btn btn-green" onclick="requestNotificationPermission()">Enable Monday Reminders</button>
    </div>
    <div class="card">
      <div class="card-title">Goal Blueprint</div>
      ${[["Height","6'0\""],["Goal Waist",'32"'],["Goal Shoulders",'52"'],["Goal Body Fat",'9–11%'],["Adonis Ratio",'1.625'],["Program","Lifestyle Body"],["Reference","Will Smith (Focus) / MBJ (Black Panther)"]].map(([l,v])=>`<div class="target-row"><span class="t-label">${l}</span><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--gold);font-weight:500">${v}</span></div>`).join('')}
    </div>`;
}
function saveTargets() { const t={highCal:parseInt(document.getElementById('t-highCal').value)||2500,highCarb:parseInt(document.getElementById('t-highCarb').value)||254,highFat:parseInt(document.getElementById('t-highFat').value)||76,lowCal:parseInt(document.getElementById('t-lowCal').value)||1950,lowCarb:parseInt(document.getElementById('t-lowCarb').value)||139,lowFat:parseInt(document.getElementById('t-lowFat').value)||66,prot:parseInt(document.getElementById('t-prot').value)||200}; saveState('targets',t); toast('Targets saved'); }
function saveApiKey() { saveState('api_key',document.getElementById('api-key-input').value.trim()); toast('API key saved'); }

render();
