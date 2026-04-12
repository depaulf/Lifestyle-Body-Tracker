// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PROFILE = {
  height: 72, // inches (6'0")
  startWeight: 210,
  startBF: 23,
  goalWaist: 32,
  goalShoulders: 52,
  goalBF: 10
};

// Adonis Index targets for 6'0"
const ADONIS_TARGETS = {
  shoulders: 52, waist: 32, chest: 44, neck: 16.5,
  arms: 16, forearms: 13, thighs: 24, calves: 15.5,
  hips: 37, abdomen: 31
};

const DAY_CONFIG = {
  Sunday:    {type:'rest', label:'Rest',          cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:false},
  Monday:    {type:'high', label:'Lift + cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true},
  Tuesday:   {type:'low',  label:'Cardio only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true},
  Wednesday: {type:'high', label:'Lift + cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true},
  Thursday:  {type:'low',  label:'Cardio only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true},
  Friday:    {type:'high', label:'Lift + cardio', cal:2500, carb:254, prot:200, fat:76,  lift:true,  cardio:true},
  Saturday:  {type:'low',  label:'Cardio only',   cal:1950, carb:139, prot:200, fat:66,  lift:false, cardio:true}
};
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let weekOffset = 0;
let currentPage = 'week';
let openDays = {};

function loadState() {
  try { return JSON.parse(localStorage.getItem('msb_state') || '{}'); } catch { return {}; }
}
function saveState(key, val) {
  const s = loadState(); s[key] = val; localStorage.setItem('msb_state', JSON.stringify(s));
}
function getS(key, def) { return loadState()[key] ?? def; }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function weekStart(offset) {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}
function weekKey(offset) { return weekStart(offset).toISOString().slice(0,10); }
function sk(wk, day, kpi) { return `${wk}|${day}|${kpi}`; }
function fmt(d) { return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function getTargets() {
  return getS('targets', { highCal:2500, highCarb:254, highFat:76, lowCal:1950, lowCarb:139, lowFat:66, prot:200 });
}

function getDayTarget(day) {
  const t = getTargets(); const cfg = DAY_CONFIG[day];
  if (cfg.type === 'high') return { cal: t.highCal, carb: t.highCarb, fat: t.highFat, prot: t.prot };
  return { cal: t.lowCal, carb: t.lowCarb, fat: t.lowFat, prot: t.prot };
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="nav">
      <div>
        <div class="nav-title">Movie Star <span>Body</span></div>
        <div class="nav-sub mono">Greg O'Gallagher Protocol</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px" id="nav-week-controls"></div>
    </div>
    <div class="page-tabs">
      <button class="ptab ${currentPage==='week'?'active':''}" onclick="switchPage('week')">WEEK</button>
      <button class="ptab ${currentPage==='checkin'?'active':''}" onclick="switchPage('checkin')">CHECK-IN</button>
      <button class="ptab ${currentPage==='adonis'?'active':''}" onclick="switchPage('adonis')">ADONIS</button>
      <button class="ptab ${currentPage==='coach'?'active':''}" onclick="switchPage('coach')">COACH</button>
      <button class="ptab ${currentPage==='targets'?'active':''}" onclick="switchPage('targets')">TARGETS</button>
    </div>
    <div class="page ${currentPage==='week'?'active':''}" id="page-week"></div>
    <div class="page ${currentPage==='checkin'?'active':''}" id="page-checkin"></div>
    <div class="page ${currentPage==='adonis'?'active':''}" id="page-adonis"></div>
    <div class="page ${currentPage==='coach'?'active':''}" id="page-coach"></div>
    <div class="page ${currentPage==='targets'?'active':''}" id="page-targets"></div>
    <div class="toast" id="toast"></div>`;

  renderWeekControls();
  if (currentPage === 'week') renderWeekPage();
  if (currentPage === 'checkin') renderCheckinPage();
  if (currentPage === 'adonis') renderAdonisPage();
  if (currentPage === 'coach') renderCoachPage();
  if (currentPage === 'targets') renderTargetsPage();
}

function switchPage(p) { currentPage = p; render(); }

function renderWeekControls() {
  const el = document.getElementById('nav-week-controls');
  if (currentPage !== 'week') { el.innerHTML = ''; return; }
  const ws = weekStart(weekOffset), we = new Date(ws); we.setDate(ws.getDate()+6);
  el.innerHTML = `
    <button class="week-btn" onclick="changeWeek(-1)">&#8592;</button>
    <span class="week-label">${fmt(ws)}–${fmt(we)}</span>
    <button class="week-btn" onclick="changeWeek(1)">&#8594;</button>`;
}

function changeWeek(d) { weekOffset += d; openDays = {}; render(); }

// ─── WEEK PAGE ────────────────────────────────────────────────────────────────
function renderWeekPage() {
  const wk = weekKey(weekOffset);
  const state = getS('checks_'+wk, {});
  let prot=0, lifts=0, steps=0, cardio=0;
  DAYS.forEach(d => {
    if (state[sk(wk,d,'protein')]) prot++;
    if (state[sk(wk,d,'lift')]) lifts++;
    if (state[sk(wk,d,'steps')]) steps++;
    if (state[sk(wk,d,'cardio')]) cardio++;
  });

  let html = `<div class="kpi-grid">
    <div class="kpi-tile"><div class="big ${prot>0?'green':''}">${prot}<span style="font-size:12px;color:var(--muted)">/7</span></div><div class="lbl">Protein days</div></div>
    <div class="kpi-tile"><div class="big ${lifts>0?'green':''}">${lifts}<span style="font-size:12px;color:var(--muted)">/3</span></div><div class="lbl">Lifts done</div></div>
    <div class="kpi-tile"><div class="big ${steps>0?'green':''}">${steps}<span style="font-size:12px;color:var(--muted)">/7</span></div><div class="lbl">Steps days</div></div>
    <div class="kpi-tile"><div class="big ${cardio>0?'green':''}">${cardio}<span style="font-size:12px;color:var(--muted)">/5</span></div><div class="lbl">Cardio sessions</div></div>
  </div>`;

  const ws = weekStart(weekOffset);
  DAYS.forEach((day, idx) => {
    const cfg = DAY_CONFIG[day];
    const tgt = getDayTarget(day);
    const dayDate = new Date(ws); dayDate.setDate(ws.getDate() + idx);
    const dateStr = dayDate.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const kpis = buildKPIs(day, tgt, cfg);
    const total = kpis.length;
    const done = kpis.filter(k => state[sk(wk,day,k.id)]).length;
    const isOpen = openDays[wk+'|'+day] || false;
    const dotColor = cfg.type==='high'?'var(--green)':cfg.type==='low'?'#94a3b8':'var(--purple)';
    const badgeClass = cfg.type==='high'?'b-high':cfg.type==='low'?'b-low':'b-rest';
    const uploads = getS('uploads_'+wk+'_'+day, {});
    const aiStatus = getS('aistatus_'+wk+'_'+day, {});

    html += `<div class="day-card">
      <div class="day-hdr" onclick="toggleDay('${day}')">
        <div class="day-left">
          <div class="day-dot" style="background:${dotColor}"></div>
          <div>
            <div class="day-name">${day}</div>
            <div class="day-date">${dateStr}</div>
          </div>
        </div>
        <div class="day-right">
          <span class="dbadge ${badgeClass}">${cfg.label}</span>
          <span class="day-score">${done}/${total}</span>
        </div>
      </div>
      <div class="day-body ${isOpen?'open':''}" id="body-${day}">
        <div class="sec-hdr">— KPIs —</div>`;

    kpis.forEach(kpi => {
      const checked = state[sk(wk,day,kpi.id)] || false;
      const st = aiStatus[kpi.id];
      const statusHtml = st ? `<span class="kstatus ${st.cls}">${st.val}</span>` : '';
      html += `<div class="krow" onclick="toggleKPI('${wk}','${day}','${kpi.id}')">
        <div class="cb ${checked?'on':''}"><div class="ck"></div></div>
        <span class="ktext ${checked?'done':''}">${kpi.label}</span>
        ${statusHtml}
        <span class="kmeta">${kpi.meta}</span>
      </div>`;
    });

    // Upload section
    const hasAny = Object.keys(uploads).length > 0;
    html += `<div class="upload-zone">
      <div class="sec-hdr" style="padding:0 0 8px">— LOG FROM SCREENSHOT —</div>
      <div class="upload-grid">
        <label class="upload-tile ${uploads.mfp?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','mfp')">
          <div class="ui">📱</div><div class="ul">${uploads.mfp?'MFP ✓':'MFP diary'}</div>
        </label>
        <label class="upload-tile ${uploads.steps?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','steps')">
          <div class="ui">👟</div><div class="ul">${uploads.steps?'Steps ✓':'Step count'}</div>
        </label>
        <label class="upload-tile ${uploads.workout?'has':''}">
          <input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','workout')">
          <div class="ui">🏋️</div><div class="ul">${uploads.workout?'Workout ✓':'Workout'}</div>
        </label>
      </div>
      <button class="proc-btn" id="proc-${day}" onclick="processScreenshots('${wk}','${day}')" ${!hasAny?'disabled':''}>
        Read screenshots &amp; auto-log
      </button>
      <div class="ai-out" id="aiout-${day}"></div>
    </div>`;

    // Lift log (lift days only)
    if (cfg.lift) {
      const liftList = getS('lifts_'+wk+'_'+day, []);
      html += `<div class="lift-log">
        <div class="sec-hdr" style="padding:0 0 8px">— LIFT LOG —</div>
        <div class="lift-inputs">
          <input class="li-ex" id="lex-${day}" type="text" placeholder="Exercise (e.g. Incline Press)">
          <input class="li-sm" id="lsets-${day}" type="text" placeholder="3x8">
          <input class="li-sm" id="lwt-${day}" type="text" placeholder="185 lbs">
          <button class="li-btn" onclick="addLift('${wk}','${day}')">+ Add</button>
        </div>
        <div id="liftlist-${day}">`;
      liftList.forEach((l,i) => {
        html += `<div class="lift-item"><span>${l.ex} — ${l.sets} @ ${l.wt}</span><span class="lift-del" onclick="deleteLift('${wk}','${day}',${i})">✕</span></div>`;
      });
      html += `</div></div>`;
    }

    html += `</div></div>`;
  });

  document.getElementById('page-week').innerHTML = html;
}

function buildKPIs(day, tgt, cfg) {
  const kpis = [
    {id:'protein', label:'200g protein hit', meta:tgt.prot+'g'},
    {id:'calories', label:`Calories on target (${tgt.cal} kcal ±100)`, meta:tgt.cal+' kcal'},
    {id:'steps', label:'10,000 steps', meta:'daily'},
    {id:'creatine', label:'5g creatine taken', meta:'daily'},
  ];
  if (cfg.lift) kpis.push({id:'lift', label:'Lift session — Movie Star Body', meta:'Mon/Wed/Fri'});
  if (cfg.cardio) kpis.push({id:'cardio', label:'30 min stair climber — level 5', meta:'Mon–Sat'});
  return kpis;
}

function toggleDay(day) {
  const wk = weekKey(weekOffset);
  const k = wk+'|'+day;
  openDays[k] = !openDays[k];
  const body = document.getElementById('body-'+day);
  if (body) body.classList.toggle('open', openDays[k]);
}

function toggleKPI(wk, day, kpiId) {
  const state = getS('checks_'+wk, {});
  state[sk(wk,day,kpiId)] = !state[sk(wk,day,kpiId)];
  saveState('checks_'+wk, state);
  renderWeekPage();
}

function addLift(wk, day) {
  const ex = document.getElementById('lex-'+day)?.value.trim();
  const sets = document.getElementById('lsets-'+day)?.value.trim();
  const wt = document.getElementById('lwt-'+day)?.value.trim();
  if (!ex) return;
  const list = getS('lifts_'+wk+'_'+day, []);
  list.push({ex, sets: sets||'—', wt: wt||'—'});
  saveState('lifts_'+wk+'_'+day, list);
  renderWeekPage();
}

function deleteLift(wk, day, idx) {
  const list = getS('lifts_'+wk+'_'+day, []);
  list.splice(idx, 1);
  saveState('lifts_'+wk+'_'+day, list);
  renderWeekPage();
}

// ─── IMAGE UPLOADS ────────────────────────────────────────────────────────────
function handleUpload(event, wk, day, type) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const uploads = getS('uploads_'+wk+'_'+day, {});
    uploads[type] = { b64: e.target.result.split(',')[1], mime: file.type };
    saveState('uploads_'+wk+'_'+day, uploads);
    renderWeekPage();
    setTimeout(() => { openDays[wk+'|'+day] = true; renderWeekPage(); }, 50);
  };
  reader.readAsDataURL(file);
}

async function processScreenshots(wk, day) {
  const uploads = getS('uploads_'+wk+'_'+day, {});
  if (!Object.keys(uploads).length) return;
  const cfg = DAY_CONFIG[day]; const tgt = getDayTarget(day);
  const btn = document.getElementById('proc-'+day);
  const out = document.getElementById('aiout-'+day);
  if (!btn || !out) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Reading screenshots...';
  out.className = 'ai-out show'; out.textContent = 'Analyzing...';

  const content = [];
  const labels = {mfp:'MyFitnessPal food diary', steps:'Step count screenshot', workout:'Workout log'};
  Object.entries(uploads).forEach(([type, img]) => {
    content.push({type:'text', text:`Image type: ${labels[type]||type}`});
    content.push({type:'image', source:{type:'base64', media_type:img.mime, data:img.b64}});
  });

  content.push({type:'text', text:`
Analyze these fitness screenshots for ${day}.

Daily targets:
- Calories: ${tgt.cal} kcal (cutting — 0 to 100 under = GOOD/GREEN. Over = RED. More than 100 under = AMBER)
- Protein: ${tgt.prot}g (hit or over = GREEN, under = RED)
- Carbs: ${tgt.carb}g, Fat: ${tgt.fat}g
- Steps: 10,000 minimum (hit = GREEN, under = RED)
- Creatine: 5g (note if visible)

Extract all numbers you can see. Then output:

SUMMARY:
[Brief plain English summary of what each screenshot shows]

KPI STATUS:
- Calories: [number found] / [target] — [GREEN/AMBER/RED] — [reason]
- Protein: [number found]g / ${tgt.prot}g — [GREEN/RED]
- Carbs: [number]g / ${tgt.carb}g
- Fat: [number]g / ${tgt.fat}g
- Steps: [number] / 10,000 — [GREEN/RED]

VERDICTS (for auto-checking):
PROTEIN_HIT: true/false
CALORIES_HIT: true/false
STEPS_HIT: true/false
LIFT_LOGGED: true/false
CARDIO_NOTE: [any cardio noted]`});

  try {
    const apiKey = getS('api_key', '');
    const headers = {'Content-Type':'application/json'};
    if (apiKey) headers['x-api-key'] = apiKey;
    const resp = await fetch('/api/analyze', {
      method:'POST', headers,
      body: JSON.stringify({messages:[{role:'user',content}]})
    });
    const data = await resp.json();
    const text = data.content?.map(c=>c.text||'').join('') || data.error || 'No response.';
    out.textContent = text;

    // Auto-check based on verdicts
    const state = getS('checks_'+wk, {});
    if (/PROTEIN_HIT:\s*true/i.test(text)) state[sk(wk,day,'protein')] = true;
    if (/CALORIES_HIT:\s*true/i.test(text)) state[sk(wk,day,'calories')] = true;
    if (/STEPS_HIT:\s*true/i.test(text)) state[sk(wk,day,'steps')] = true;
    if (/LIFT_LOGGED:\s*true/i.test(text)) state[sk(wk,day,'lift')] = true;
    saveState('checks_'+wk, state);

    // Parse status badges
    const aiStatus = {};
    const calMatch = text.match(/Calories:\s*([\d,]+)\s*\/\s*\d+.*?(GREEN|AMBER|RED)/i);
    if (calMatch) {
      const logged = parseInt(calMatch[1].replace(',','')); const diff = tgt.cal - logged;
      const cls = logged > tgt.cal ? 'bad' : diff <= 100 ? 'ok' : 'warn';
      aiStatus.calories = {cls, val: logged > tgt.cal ? `+${Math.abs(diff)} OVER` : `${diff} under`};
    }
    const protMatch = text.match(/Protein:\s*(\d+)g/i);
    if (protMatch) { const p = parseInt(protMatch[1]); aiStatus.protein = {cls:p>=tgt.prot?'ok':'bad', val:p+'g'}; }
    const stepMatch = text.match(/Steps:\s*([\d,]+)/i);
    if (stepMatch) { const s = parseInt(stepMatch[1].replace(',','')); aiStatus.steps = {cls:s>=10000?'ok':'bad', val:s.toLocaleString()}; }
    saveState('aistatus_'+wk+'_'+day, aiStatus);

    toast('Screenshots logged!');
    renderWeekPage();
    setTimeout(() => { openDays[wk+'|'+day] = true; renderWeekPage(); }, 50);
  } catch(err) {
    out.textContent = 'Error: '+err.message;
  }
  btn.disabled = false; btn.innerHTML = 'Read screenshots & auto-log';
}

// ─── CHECK-IN PAGE ────────────────────────────────────────────────────────────
function renderCheckinPage() {
  const checkins = getS('checkins', []);
  const photos = getS('checkin_photos_draft', {});

  let html = `<div class="card">
    <div class="card-title">Monday check-in <span class="badge-sm badge-amber">Log every Monday AM</span></div>
    <div class="meas-grid">
      <div class="mfield"><label>Weight (lbs)</label><input id="ci-weight" type="number" step="0.1" placeholder="210.0"></div>
      <div class="mfield"><label>Body fat % (est)</label><input id="ci-bf" type="number" step="0.5" placeholder="23"></div>
      <div class="mfield"><label>Waist (in)</label><input id="ci-waist" type="number" step="0.25" placeholder="36"></div>
      <div class="mfield"><label>Shoulders (in)</label><input id="ci-shoulders" type="number" step="0.25" placeholder="48"></div>
      <div class="mfield"><label>Chest (in)</label><input id="ci-chest" type="number" step="0.25" placeholder="42"></div>
      <div class="mfield"><label>Neck (in)</label><input id="ci-neck" type="number" step="0.25" placeholder="16"></div>
      <div class="mfield"><label>Arms (in)</label><input id="ci-arms" type="number" step="0.25" placeholder="15"></div>
      <div class="mfield"><label>Forearms (in)</label><input id="ci-forearms" type="number" step="0.25" placeholder="12"></div>
      <div class="mfield"><label>Chest (in)</label><input id="ci-chest" type="number" step="0.25" placeholder="42"></div>
      <div class="mfield"><label>Abdomen (in)</label><input id="ci-abdomen" type="number" step="0.25" placeholder="34"></div>
      <div class="mfield"><label>Hips / glutes (in)</label><input id="ci-hips" type="number" step="0.25" placeholder="38"></div>
      <div class="mfield"><label>Thighs (in)</label><input id="ci-thighs" type="number" step="0.25" placeholder="23"></div>
      <div class="mfield"><label>Calves (in)</label><input id="ci-calves" type="number" step="0.25" placeholder="15"></div>
    </div>

    <div class="card-title" style="margin-top:4px">Progress photos <span class="badge-sm badge-blue">4 angles</span></div>
    <div class="photo-grid">
      <label class="photo-tile ${photos.front?'has':''}">
        <input type="file" accept="image/*" onchange="handlePhoto(event,'front')">
        ${photos.front?`<img src="${photos.front}" alt="front">`:''}
        <div class="pi">📸</div><div class="pl">Front</div>
      </label>
      <label class="photo-tile ${photos.back?'has':''}">
        <input type="file" accept="image/*" onchange="handlePhoto(event,'back')">
        ${photos.back?`<img src="${photos.back}" alt="back">`:''}
        <div class="pi">📸</div><div class="pl">Back</div>
      </label>
      <label class="photo-tile ${photos.side?'has':''}">
        <input type="file" accept="image/*" onchange="handlePhoto(event,'side')">
        ${photos.side?`<img src="${photos.side}" alt="side">`:''}
        <div class="pi">📸</div><div class="pl">Side</div>
      </label>
      <label class="photo-tile ${photos.flex?'has':''}">
        <input type="file" accept="image/*" onchange="handlePhoto(event,'flex')">
        ${photos.flex?`<img src="${photos.flex}" alt="flex">`:''}
        <div class="pi">📸</div><div class="pl">Flexed</div>
      </label>
    </div>
    <button class="save-btn" onclick="saveCheckin()">Save Monday check-in</button>
  </div>`;

  if (checkins.length > 0) {
    html += `<div class="card"><div class="card-title">Check-in history</div>`;
    checkins.slice(0,10).forEach(c => {
      html += `<div class="h-entry">
        <div class="h-date">${c.date}</div>
        <div class="h-stats">
          ${c.weight?`<div class="h-stat">Weight<span>${c.weight} lbs</span></div>`:''}
          ${c.waist?`<div class="h-stat">Waist<span>${c.waist}"</span></div>`:''}
          ${c.shoulders?`<div class="h-stat">Shoulders<span>${c.shoulders}"</span></div>`:''}
          ${c.bf?`<div class="h-stat">Body fat<span>${c.bf}%</span></div>`:''}
          ${c.chest?`<div class="h-stat">Chest<span>${c.chest}"</span></div>`:''}
          ${c.arms?`<div class="h-stat">Arms<span>${c.arms}"</span></div>`:''}
          ${c.neck?`<div class="h-stat">Neck<span>${c.neck}"</span></div>`:''}
          ${c.thighs?`<div class="h-stat">Thighs<span>${c.thighs}"</span></div>`:''}
          ${c.calves?`<div class="h-stat">Calves<span>${c.calves}"</span></div>`:''}
          ${c.hips?`<div class="h-stat">Hips<span>${c.hips}"</span></div>`:''}
          ${c.abdomen?`<div class="h-stat">Abdomen<span>${c.abdomen}"</span></div>`:''}
        </div>`;
      if (c.photos && Object.keys(c.photos).length) {
        html += `<div class="h-photos">`;
        Object.entries(c.photos).forEach(([k,v]) => {
          html += `<img class="h-photo" src="${v}" alt="${k}">`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  document.getElementById('page-checkin').innerHTML = html;
}

function handlePhoto(event, slot) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const photos = getS('checkin_photos_draft', {});
    photos[slot] = e.target.result;
    saveState('checkin_photos_draft', photos);
    renderCheckinPage();
  };
  reader.readAsDataURL(file);
}

function saveCheckin() {
  const fields = ['weight','bf','waist','shoulders','chest','neck','arms','forearms','abdomen','hips','thighs','calves'];
  const entry = { date: new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) };
  fields.forEach(f => {
    const v = parseFloat(document.getElementById('ci-'+f)?.value);
    if (!isNaN(v)) entry[f] = v;
  });
  entry.photos = getS('checkin_photos_draft', {});
  const checkins = getS('checkins', []);
  checkins.unshift(entry);
  saveState('checkins', checkins);
  saveState('checkin_photos_draft', {});
  toast('Check-in saved!');
  renderCheckinPage();
}

// ─── ADONIS INDEX PAGE ────────────────────────────────────────────────────────
function renderAdonisPage() {
  const checkins = getS('checkins', []);
  const latest = checkins[0] || {};
  const measures = [
    {key:'shoulders', label:'Shoulders', target:ADONIS_TARGETS.shoulders},
    {key:'waist', label:'Waist', target:ADONIS_TARGETS.waist, inverse:true},
    {key:'chest', label:'Chest', target:ADONIS_TARGETS.chest},
    {key:'arms', label:'Arms', target:ADONIS_TARGETS.arms},
    {key:'neck', label:'Neck', target:ADONIS_TARGETS.neck},
    {key:'forearms', label:'Forearms', target:ADONIS_TARGETS.forearms},
    {key:'thighs', label:'Thighs', target:ADONIS_TARGETS.thighs},
    {key:'calves', label:'Calves', target:ADONIS_TARGETS.calves},
    {key:'hips', label:'Hips/glutes', target:ADONIS_TARGETS.hips},
    {key:'abdomen', label:'Abdomen', target:ADONIS_TARGETS.abdomen, inverse:true},
  ];

  const shoulder = latest.shoulders || 0;
  const waist = latest.waist || 0;
  const ratio = waist > 0 && shoulder > 0 ? (shoulder/waist).toFixed(3) : '—';
  const ratioTarget = (ADONIS_TARGETS.shoulders/ADONIS_TARGETS.waist).toFixed(3);

  let html = `<div class="card">
    <div class="card-title">Adonis Index <span class="badge-sm badge-blue">6'0" targets</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid var(--border);margin-bottom:12px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Current ratio (S/W)</div>
        <div style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:${ratio!=='—'&&parseFloat(ratio)>=1.6?'var(--green)':'var(--amber)'}">${ratio}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Target ratio</div>
        <div style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:var(--green)">${ratioTarget}</div>
      </div>
    </div>
    <div class="adonis-grid">`;

  measures.forEach(m => {
    const cur = latest[m.key] || 0;
    const pct = cur > 0 ? Math.min(100, Math.round(m.inverse ? (m.target/cur)*100 : (cur/m.target)*100)) : 0;
    const color = pct >= 95 ? 'var(--green)' : pct >= 75 ? 'var(--amber)' : 'var(--red)';
    html += `<div class="adonis-tile">
      <div class="at-label">${m.label}</div>
      <div class="at-row">
        <div class="at-cur" style="color:${cur?color:'var(--faint)'}">${cur ? cur+'"' : '—'}</div>
        <div class="at-target">target ${m.target}"</div>
      </div>
      <div class="at-bar"><div class="at-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  });

  html += `</div></div>`;

  if (!latest.shoulders) {
    html += `<div class="card" style="text-align:center;padding:24px">
      <div style="font-size:13px;color:var(--muted)">Log your first Monday check-in to see your Adonis Index progress.</div>
    </div>`;
  }

  document.getElementById('page-adonis').innerHTML = html;
}

// ─── COACH PAGE ───────────────────────────────────────────────────────────────
function renderCoachPage() {
  const lastAnalysis = getS('last_coach_analysis', '');
  const lastDate = getS('last_coach_date', '');

  let html = `<div class="coach-card">
    <div class="coach-title">Weekly Coach Analysis</div>
    <div class="coach-sub">AI bodybuilding coach — reviews your full week and gives you real adjustments</div>
    <button class="analyze-btn" id="analyze-btn" onclick="runCoachAnalysis()">
      Analyze my week & get coaching
    </button>
    <div class="coach-out ${lastAnalysis?'show':''}" id="coach-out">${lastAnalysis || ''}</div>
    ${lastDate?`<div style="font-size:10px;color:var(--faint);margin-top:8px;font-family:'DM Mono',monospace">Last analyzed: ${lastDate}</div>`:''}
  </div>`;

  document.getElementById('page-coach').innerHTML = html;
}

async function runCoachAnalysis() {
  const btn = document.getElementById('analyze-btn');
  const out = document.getElementById('coach-out');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Your coach is analyzing...';
  out.className = 'coach-out show'; out.textContent = 'Reviewing your week...';

  const wk = weekKey(weekOffset);
  const state = getS('checks_'+wk, {});
  const checkins = getS('checkins', []);
  const latest = checkins[0] || {};
  const prev = checkins[1] || {};
  const targets = getTargets();

  // Build week summary
  let weekSummary = `WEEK: ${weekKey(weekOffset)}\n\nKPI COMPLIANCE:\n`;
  DAYS.forEach(day => {
    const cfg = DAY_CONFIG[day]; const tgt = getDayTarget(day);
    const kpis = buildKPIs(day, tgt, cfg);
    const done = kpis.filter(k => state[sk(wk,day,k.id)]);
    weekSummary += `${day} (${cfg.label}): ${done.length}/${kpis.length} — ${done.map(k=>k.id).join(', ')||'none'}\n`;
  });

  weekSummary += `\nCURRENT TARGETS:\nHigh days: ${targets.highCal} kcal / ${targets.highCarb}g carbs / ${targets.prot}g protein / ${targets.highFat}g fat\nLow days: ${targets.lowCal} kcal / ${targets.lowCarb}g carbs / ${targets.prot}g protein / ${targets.lowFat}g fat\n`;

  if (latest.weight) {
    weekSummary += `\nLATEST CHECK-IN (${latest.date||'recent'}):\n`;
    const fields = ['weight','bf','waist','shoulders','chest','arms','neck','forearms','abdomen','hips','thighs','calves'];
    fields.forEach(f => { if (latest[f]) weekSummary += `${f}: ${latest[f]}${f==='weight'?' lbs':'"'}\n`; });
    weekSummary += `Shoulder/waist ratio: ${latest.shoulders&&latest.waist?(latest.shoulders/latest.waist).toFixed(3):'—'}\n`;
  }
  if (prev.weight && latest.weight) {
    weekSummary += `\nWEEK OVER WEEK CHANGES:\n`;
    if (latest.weight && prev.weight) weekSummary += `Weight: ${prev.weight} → ${latest.weight} (${(latest.weight-prev.weight>0?'+':'')+(latest.weight-prev.weight).toFixed(1)} lbs)\n`;
    if (latest.waist && prev.waist) weekSummary += `Waist: ${prev.waist}" → ${latest.waist}" (${(latest.waist-prev.waist>0?'+':'')+(latest.waist-prev.waist).toFixed(2)}")\n`;
    if (latest.shoulders && prev.shoulders) weekSummary += `Shoulders: ${prev.shoulders}" → ${latest.shoulders}"\n`;
  }

  const prompt = `You are a world-class physique and bodybuilding coach — think the knowledge of Greg O'Gallagher, Stan Efferding, and Jeff Nippard combined. Your client is following the Movie Star Body program.

CLIENT PROFILE:
- Height: 6'0"
- Starting weight: ~210 lbs, ~23% body fat
- Goal: 32" waist, 52" shoulders, 9-11% body fat — the Adonis Index physique (Will Smith in Focus / Michael B. Jordan in Black Panther)
- Program: Greg O'Gallagher Movie Star Body
- Split: Lift Mon/Wed/Fri, Cardio Tue/Thu/Sat, Rest Sunday
- High days: ${targets.highCal} kcal / ${targets.highCarb}g carb / ${targets.prot}g protein / ${targets.highFat}g fat
- Low days: ${targets.lowCal} kcal / ${targets.lowCarb}g carb / ${targets.prot}g protein / ${targets.lowFat}g fat
- Cardio: 30 min stair climber level 5 on cardio days
- Steps: 10,000 minimum daily
- Creatine: 5g daily
- Cutting benchmark: up to 100 calories under target is fine

${weekSummary}

ADONIS INDEX TARGETS FOR 6'0":
Shoulders: 52" | Waist: 32" | Chest: 44" | Arms: 16" | Neck: 16.5" | Forearms: 13" | Thighs: 24" | Calves: 15.5" | Hips: 37" | Abdomen: 31"

Provide a thorough weekly coaching analysis in this exact format:

━━━ WEEKLY SCORECARD ━━━
Give an overall compliance score out of 100 and letter grade. Break down each KPI.

━━━ WHAT YOU EXECUTED WELL ━━━
Specific wins from this week. Be encouraging but real.

━━━ WHERE YOU LEFT GAINS ON THE TABLE ━━━
Missed KPIs, patterns, anything that slowed progress.

━━━ MEASUREMENT ANALYSIS & ADONIS INDEX ━━━
Current measurements vs targets. Where is client in the transformation? Shoulder/waist ratio trend.

━━━ CALORIE & MACRO VERDICT ━━━
Were targets being hit? Any adjustment needed? If yes, give SPECIFIC new numbers.

━━━ ADJUSTMENTS FOR NEXT WEEK ━━━
Specific changes to training, nutrition, or cardio. If adjusting calories/macros, use this format:
NEW HIGH DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat
NEW LOW DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat

━━━ WORKOUT FOCUS NEXT WEEK ━━━
Specific exercises or technique cues to prioritize for V-taper development.

━━━ TIMELINE TO GOAL ━━━
Based on current rate of progress:
- Estimated weeks to reach 32" waist and Adonis ratio
- Estimated weeks to reach 9-11% body fat
- Total workouts remaining to goal (approx)
- Total cardio sessions remaining to goal (approx)

━━━ COACH'S MOTIVATIONAL WORD ━━━
A real, powerful, personalized message. No fluff. Speak to the vision — the Will Smith / MBJ physique. God-centered encouragement if applicable. Make them want to go all in next week.`;

  try {
    const apiKey = getS('api_key', '');
    const headers = {'Content-Type':'application/json'};
    if (apiKey) headers['x-api-key'] = apiKey;
    const resp = await fetch('/api/analyze', {
      method:'POST', headers,
      body: JSON.stringify({messages:[{role:'user',content:[{type:'text',text:prompt}]}], max_tokens:2000})
    });
    const data = await resp.json();
    const text = data.content?.map(c=>c.text||'').join('') || data.error || 'No response.';
    out.textContent = text;
    saveState('last_coach_analysis', text);
    saveState('last_coach_date', new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));

    // Auto-apply macro adjustments if coach recommends them
    const highCalMatch = text.match(/NEW HIGH DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    const lowCalMatch = text.match(/NEW LOW DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    if (highCalMatch || lowCalMatch) {
      const t = getTargets();
      if (highCalMatch) { t.highCal=parseInt(highCalMatch[1]); t.highCarb=parseInt(highCalMatch[2]); t.prot=parseInt(highCalMatch[3]); t.highFat=parseInt(highCalMatch[4]); }
      if (lowCalMatch) { t.lowCal=parseInt(lowCalMatch[1]); t.lowCarb=parseInt(lowCalMatch[2]); t.lowFat=parseInt(lowCalMatch[4]); }
      saveState('targets', t);
      toast('Coach updated your targets!');
    }
  } catch(err) {
    out.textContent = 'Error: '+err.message+'\n\nMake sure your API key is set in the Targets tab.';
  }

  btn.disabled = false; btn.innerHTML = 'Analyze my week & get coaching';
}

// ─── TARGETS PAGE ─────────────────────────────────────────────────────────────
function renderTargetsPage() {
  const t = getTargets();
  const apiKey = getS('api_key', '');

  let html = `<div class="card">
    <div class="card-title">Nutrition targets <span class="badge-sm badge-amber">Coach can auto-update</span></div>
    <div style="margin-bottom:12px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:'DM Mono',monospace">HIGH DAYS (Mon / Wed / Fri)</div>
      <div class="meas-grid">
        <div class="mfield"><label>Calories</label><input class="t-edit" id="t-highCal" type="number" value="${t.highCal}" style="width:100%"></div>
        <div class="mfield"><label>Protein (g)</label><input class="t-edit" id="t-prot" type="number" value="${t.prot}" style="width:100%"></div>
        <div class="mfield"><label>Carbs (g)</label><input class="t-edit" id="t-highCarb" type="number" value="${t.highCarb}" style="width:100%"></div>
        <div class="mfield"><label>Fat (g)</label><input class="t-edit" id="t-highFat" type="number" value="${t.highFat}" style="width:100%"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;margin-top:12px;font-family:'DM Mono',monospace">LOW DAYS (Sun / Tue / Thu / Sat)</div>
      <div class="meas-grid">
        <div class="mfield"><label>Calories</label><input class="t-edit" id="t-lowCal" type="number" value="${t.lowCal}" style="width:100%"></div>
        <div class="mfield"><label>Protein (g)</label><input class="t-edit" id="t-prot2" type="number" value="${t.prot}" style="width:100%"></div>
        <div class="mfield"><label>Carbs (g)</label><input class="t-edit" id="t-lowCarb" type="number" value="${t.lowCarb}" style="width:100%"></div>
        <div class="mfield"><label>Fat (g)</label><input class="t-edit" id="t-lowFat" type="number" value="${t.lowFat}" style="width:100%"></div>
      </div>
    </div>
    <button class="update-targets-btn" onclick="saveTargets()">Save targets</button>
  </div>

  <div class="card">
    <div class="card-title">Anthropic API key <span class="badge-sm badge-blue">Required for AI features</span></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6">
      Get your free API key at console.anthropic.com. This powers the screenshot reading and coach analysis.
    </div>
    <div class="mfield" style="margin-bottom:10px">
      <label>API Key</label>
      <input id="api-key-input" type="password" placeholder="sk-ant-..." value="${apiKey}" style="background:var(--surface2);border:0.5px solid var(--border2);border-radius:8px;padding:9px 10px;color:var(--text);font-size:12px;font-family:'DM Mono',monospace;width:100%">
    </div>
    <button class="update-targets-btn" onclick="saveApiKey()">Save API key</button>
  </div>

  <div class="card">
    <div class="card-title">Goal targets</div>
    <div class="target-row"><span class="t-label">Height</span><span style="font-family:'DM Mono',monospace;font-size:13px">6'0"</span></div>
    <div class="target-row"><span class="t-label">Goal waist</span><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">32"</span></div>
    <div class="target-row"><span class="t-label">Goal shoulders</span><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">52"</span></div>
    <div class="target-row"><span class="t-label">Goal body fat</span><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">9–11%</span></div>
    <div class="target-row"><span class="t-label">Adonis ratio target</span><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">1.625</span></div>
    <div class="target-row"><span class="t-label">Program</span><span style="font-family:'DM Mono',monospace;font-size:13px">Movie Star Body</span></div>
  </div>`;

  document.getElementById('page-targets').innerHTML = html;
}

function saveTargets() {
  const t = {
    highCal: parseInt(document.getElementById('t-highCal').value) || 2500,
    highCarb: parseInt(document.getElementById('t-highCarb').value) || 254,
    highFat: parseInt(document.getElementById('t-highFat').value) || 76,
    lowCal: parseInt(document.getElementById('t-lowCal').value) || 1950,
    lowCarb: parseInt(document.getElementById('t-lowCarb').value) || 139,
    lowFat: parseInt(document.getElementById('t-lowFat').value) || 66,
    prot: parseInt(document.getElementById('t-prot').value) || 200,
  };
  saveState('targets', t);
  toast('Targets saved!');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  saveState('api_key', key);
  toast('API key saved!');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
render();
