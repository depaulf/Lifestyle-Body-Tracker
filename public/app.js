// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PROFILE = { height:72, startWeight:210, startBF:23, goalWaist:32, goalShoulders:52, goalBF:10 };
const ADONIS_TARGETS = { shoulders:52, waist:32, chest:44, neck:16.5, arms:16, forearms:13, thighs:24, calves:15.5, hips:37, abdomen:31 };
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

function loadState() { try { return JSON.parse(localStorage.getItem('msb_state')||'{}'); } catch { return {}; } }
function saveState(key,val) { const s=loadState(); s[key]=val; localStorage.setItem('msb_state',JSON.stringify(s)); }
function getS(key,def) { return loadState()[key]??def; }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function weekStart(offset) { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()+offset*7); return d; }
function weekKey(offset) { return weekStart(offset).toISOString().slice(0,10); }
function sk(wk,day,kpi) { return `${wk}|${day}|${kpi}`; }
function fmt(d) { return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function toast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }
function getTargets() { return getS('targets',{highCal:2500,highCarb:254,highFat:76,lowCal:1950,lowCarb:139,lowFat:66,prot:200}); }
function getDayTarget(day) { const t=getTargets(),cfg=DAY_CONFIG[day]; return cfg.type==='high'?{cal:t.highCal,carb:t.highCarb,fat:t.highFat,prot:t.prot}:{cal:t.lowCal,carb:t.lowCarb,fat:t.lowFat,prot:t.prot}; }

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('app').innerHTML = `
    <div class="nav">
      <div><div class="nav-title">Movie Star <span>Body</span></div><div class="nav-sub mono">Greg O'Gallagher Protocol</div></div>
      <div style="display:flex;align-items:center;gap:8px" id="nav-week-controls"></div>
    </div>
    <div class="page-tabs">
      <button class="ptab ${currentPage==='week'?'active':''}" onclick="switchPage('week')">WEEK</button>
      <button class="ptab ${currentPage==='checkin'?'active':''}" onclick="switchPage('checkin')">CHECK-IN</button>
      <button class="ptab ${currentPage==='stats'?'active':''}" onclick="switchPage('stats')">STATS</button>
      <button class="ptab ${currentPage==='adonis'?'active':''}" onclick="switchPage('adonis')">ADONIS</button>
      <button class="ptab ${currentPage==='coach'?'active':''}" onclick="switchPage('coach')">COACH</button>
      <button class="ptab ${currentPage==='targets'?'active':''}" onclick="switchPage('targets')">TARGETS</button>
    </div>
    <div class="page ${currentPage==='week'?'active':''}" id="page-week"></div>
    <div class="page ${currentPage==='checkin'?'active':''}" id="page-checkin"></div>
    <div class="page ${currentPage==='stats'?'active':''}" id="page-stats"></div>
    <div class="page ${currentPage==='adonis'?'active':''}" id="page-adonis"></div>
    <div class="page ${currentPage==='coach'?'active':''}" id="page-coach"></div>
    <div class="page ${currentPage==='targets'?'active':''}" id="page-targets"></div>
    <div class="toast" id="toast"></div>`;
  renderWeekControls();
  if(currentPage==='week') renderWeekPage();
  if(currentPage==='checkin') renderCheckinPage();
  if(currentPage==='stats') renderStatsPage();
  if(currentPage==='adonis') renderAdonisPage();
  if(currentPage==='coach') renderCoachPage();
  if(currentPage==='targets') renderTargetsPage();
}
function switchPage(p) { currentPage=p; render(); }
function renderWeekControls() {
  const el=document.getElementById('nav-week-controls');
  if(currentPage!=='week'){el.innerHTML='';return;}
  const ws=weekStart(weekOffset),we=new Date(ws); we.setDate(ws.getDate()+6);
  el.innerHTML=`<button class="week-btn" onclick="changeWeek(-1)">&#8592;</button><span class="week-label">${fmt(ws)}–${fmt(we)}</span><button class="week-btn" onclick="changeWeek(1)">&#8594;</button>`;
}
function changeWeek(d) { weekOffset+=d; openDays={}; render(); }

// ─── WEEK PAGE ────────────────────────────────────────────────────────────────
function renderWeekPage() {
  const wk=weekKey(weekOffset), state=getS('checks_'+wk,{});
  let prot=0,lifts=0,steps=0,cardio=0;
  DAYS.forEach(d=>{if(state[sk(wk,d,'protein')])prot++;if(state[sk(wk,d,'lift')])lifts++;if(state[sk(wk,d,'steps')])steps++;if(state[sk(wk,d,'cardio')])cardio++;});
  let html=`<div class="kpi-grid">
    <div class="kpi-tile"><div class="big ${prot>0?'green':''}">${prot}<span style="font-size:12px;color:var(--muted)">/7</span></div><div class="lbl">Protein days</div></div>
    <div class="kpi-tile"><div class="big ${lifts>0?'green':''}">${lifts}<span style="font-size:12px;color:var(--muted)">/3</span></div><div class="lbl">Lifts done</div></div>
    <div class="kpi-tile"><div class="big ${steps>0?'green':''}">${steps}<span style="font-size:12px;color:var(--muted)">/7</span></div><div class="lbl">Steps days</div></div>
    <div class="kpi-tile"><div class="big ${cardio>0?'green':''}">${cardio}<span style="font-size:12px;color:var(--muted)">/5</span></div><div class="lbl">Cardio sessions</div></div>
  </div>`;
  const ws=weekStart(weekOffset);
  DAYS.forEach((day,idx)=>{
    const cfg=DAY_CONFIG[day],tgt=getDayTarget(day);
    const dayDate=new Date(ws); dayDate.setDate(ws.getDate()+idx);
    const kpis=buildKPIs(day,tgt,cfg), total=kpis.length, done=kpis.filter(k=>state[sk(wk,day,k.id)]).length;
    const isOpen=openDays[wk+'|'+day]||false;
    const dotColor=cfg.type==='high'?'var(--green)':cfg.type==='low'?'#94a3b8':'var(--purple)';
    const badgeClass=cfg.type==='high'?'b-high':cfg.type==='low'?'b-low':'b-rest';
    const uploads=getS('uploads_'+wk+'_'+day,{}), aiStatus=getS('aistatus_'+wk+'_'+day,{});
    html+=`<div class="day-card">
      <div class="day-hdr" onclick="toggleDay('${day}')">
        <div class="day-left"><div class="day-dot" style="background:${dotColor}"></div>
          <div><div class="day-name">${day}</div><div class="day-date">${dayDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>
        </div>
        <div class="day-right"><span class="dbadge ${badgeClass}">${cfg.label}</span><span class="day-score">${done}/${total}</span></div>
      </div>
      <div class="day-body ${isOpen?'open':''}" id="body-${day}">
        <div class="sec-hdr">— KPIs —</div>`;
    kpis.forEach(kpi=>{
      const checked=state[sk(wk,day,kpi.id)]||false, st=aiStatus[kpi.id];
      html+=`<div class="krow" onclick="toggleKPI('${wk}','${day}','${kpi.id}')">
        <div class="cb ${checked?'on':''}"><div class="ck"></div></div>
        <span class="ktext ${checked?'done':''}">${kpi.label}</span>
        ${st?`<span class="kstatus ${st.cls}">${st.val}</span>`:''}
        <span class="kmeta">${kpi.meta}</span>
      </div>`;
    });
    const hasAny=Object.keys(uploads).length>0;
    html+=`<div class="upload-zone">
      <div class="sec-hdr" style="padding:0 0 8px">— LOG FROM SCREENSHOT —</div>
      <div class="upload-grid">
        <label class="upload-tile ${uploads.mfp?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','mfp')"><div class="ui">📱</div><div class="ul">${uploads.mfp?'MFP ✓':'MFP diary'}</div></label>
        <label class="upload-tile ${uploads.steps?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','steps')"><div class="ui">👟</div><div class="ul">${uploads.steps?'Steps ✓':'Step count'}</div></label>
        <label class="upload-tile ${uploads.workout?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','workout')"><div class="ui">🏋️</div><div class="ul">${uploads.workout?'Workout ✓':'Workout'}</div></label>
      </div>
      <button class="proc-btn" id="proc-${day}" onclick="processScreenshots('${wk}','${day}')" ${!hasAny?'disabled':''}>Read screenshots &amp; auto-log</button>
      <div class="ai-out" id="aiout-${day}"></div>
    </div>`;
    if(cfg.lift){
      const liftList=getS('lifts_'+wk+'_'+day,[]);
      html+=`<div class="lift-log"><div class="sec-hdr" style="padding:0 0 8px">— LIFT LOG —</div>
        <div class="lift-inputs">
          <input class="li-ex" id="lex-${day}" type="text" placeholder="Exercise (e.g. Incline Press)">
          <input class="li-sm" id="lsets-${day}" type="text" placeholder="3x8">
          <input class="li-sm" id="lwt-${day}" type="text" placeholder="185 lbs">
          <button class="li-btn" onclick="addLift('${wk}','${day}')">+ Add</button>
        </div><div id="liftlist-${day}">`;
      liftList.forEach((l,i)=>{html+=`<div class="lift-item"><span>${l.ex} — ${l.sets} @ ${l.wt}</span><span class="lift-del" onclick="deleteLift('${wk}','${day}',${i})">✕</span></div>`;});
      html+=`</div></div>`;
    }
    html+=`</div></div>`;
  });
  document.getElementById('page-week').innerHTML=html;
}

function buildKPIs(day,tgt,cfg) {
  const kpis=[
    {id:'protein',label:'200g protein hit',meta:tgt.prot+'g'},
    {id:'calories',label:`Calories on target (${tgt.cal} kcal ±100)`,meta:tgt.cal+' kcal'},
    {id:'steps',label:'10,000 steps',meta:'daily'},
    {id:'creatine',label:'5g creatine taken',meta:'daily'},
  ];
  if(cfg.lift) kpis.push({id:'lift',label:'Lift session — Movie Star Body',meta:'Mon/Wed/Fri'});
  if(cfg.cardio) kpis.push({id:'cardio',label:'30 min stair climber — level 5',meta:'Mon–Sat'});
  return kpis;
}
function toggleDay(day) { const wk=weekKey(weekOffset),k=wk+'|'+day; openDays[k]=!openDays[k]; document.getElementById('body-'+day)?.classList.toggle('open',openDays[k]); }
function toggleKPI(wk,day,kpiId) { const state=getS('checks_'+wk,{}); state[sk(wk,day,kpiId)]=!state[sk(wk,day,kpiId)]; saveState('checks_'+wk,state); renderWeekPage(); }
function addLift(wk,day) { const ex=document.getElementById('lex-'+day)?.value.trim(); if(!ex)return; const list=getS('lifts_'+wk+'_'+day,[]); list.push({ex,sets:document.getElementById('lsets-'+day)?.value.trim()||'—',wt:document.getElementById('lwt-'+day)?.value.trim()||'—'}); saveState('lifts_'+wk+'_'+day,list); renderWeekPage(); }
function deleteLift(wk,day,idx) { const list=getS('lifts_'+wk+'_'+day,[]); list.splice(idx,1); saveState('lifts_'+wk+'_'+day,list); renderWeekPage(); }

function handleUpload(event,wk,day,type) {
  const file=event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const uploads=getS('uploads_'+wk+'_'+day,{}); uploads[type]={b64:e.target.result.split(',')[1],mime:file.type};
    saveState('uploads_'+wk+'_'+day,uploads); renderWeekPage(); setTimeout(()=>{openDays[wk+'|'+day]=true;renderWeekPage();},50);
  };
  reader.readAsDataURL(file);
}

async function processScreenshots(wk,day) {
  const uploads=getS('uploads_'+wk+'_'+day,{}); if(!Object.keys(uploads).length)return;
  const tgt=getDayTarget(day),cfg=DAY_CONFIG[day];
  const btn=document.getElementById('proc-'+day), out=document.getElementById('aiout-'+day);
  if(!btn||!out)return;
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Reading screenshots...';
  out.className='ai-out show'; out.textContent='Analyzing...';
  const content=[];
  Object.entries(uploads).forEach(([type,img])=>{ content.push({type:'text',text:`Image: ${type}`}); content.push({type:'image',source:{type:'base64',media_type:img.mime,data:img.b64}}); });
  content.push({type:'text',text:`Analyze these fitness screenshots for ${day}. Targets: ${tgt.cal} kcal (0-100 under=GREEN, over=RED, 100+ under=AMBER), ${tgt.prot}g protein (hit=GREEN), 10000 steps (hit=GREEN). Extract all numbers. Output KPI STATUS and VERDICTS:\nPROTEIN_HIT: true/false\nCALORIES_HIT: true/false\nSTEPS_HIT: true/false\nLIFT_LOGGED: true/false`});
  try {
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const data=await resp.json(); const text=data.content?.map(c=>c.text||'').join('')||data.error||'No response.';
    out.textContent=text;
    const state=getS('checks_'+wk,{});
    if(/PROTEIN_HIT:\s*true/i.test(text)) state[sk(wk,day,'protein')]=true;
    if(/CALORIES_HIT:\s*true/i.test(text)) state[sk(wk,day,'calories')]=true;
    if(/STEPS_HIT:\s*true/i.test(text)) state[sk(wk,day,'steps')]=true;
    if(/LIFT_LOGGED:\s*true/i.test(text)) state[sk(wk,day,'lift')]=true;
    saveState('checks_'+wk,state);
    const aiStatus={};
    const calMatch=text.match(/(\d{3,4})\s*(kcal|cal)/i);
    if(calMatch){const logged=parseInt(calMatch[1]),diff=tgt.cal-logged; aiStatus.calories={cls:logged>tgt.cal?'bad':diff<=100?'ok':'warn',val:logged>tgt.cal?`+${Math.abs(diff)} OVER`:`${diff} under`};}
    const protMatch=text.match(/protein[:\s]+(\d+)g/i);
    if(protMatch){const p=parseInt(protMatch[1]); aiStatus.protein={cls:p>=tgt.prot?'ok':'bad',val:p+'g'};}
    const stepMatch=text.match(/([\d,]+)\s*steps/i);
    if(stepMatch){const s=parseInt(stepMatch[1].replace(',','')); aiStatus.steps={cls:s>=10000?'ok':'bad',val:s.toLocaleString()};}
    saveState('aistatus_'+wk+'_'+day,aiStatus);
    toast('Screenshots logged!'); renderWeekPage(); setTimeout(()=>{openDays[wk+'|'+day]=true;renderWeekPage();},50);
  } catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false; btn.innerHTML='Read screenshots &amp; auto-log';
}

// ─── CHECK-IN PAGE ────────────────────────────────────────────────────────────
function renderCheckinPage() {
  const checkins=getS('checkins',[]), photos=getS('checkin_photos_draft',{});
  let html=`<div class="card">
    <div class="card-title">AI photo scan <span class="badge-sm badge-green">New — snap &amp; auto-fill</span></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6">Take a photo of your scale display and/or your tape measure stats. Claude will read the numbers and fill everything in for you.</div>
    <div class="upload-grid" style="margin-bottom:8px">
      <label class="upload-tile ${photos.scale?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinPhoto(event,'scale')"><div class="ui">⚖️</div><div class="ul">${photos.scale?'Scale ✓':'Scale photo'}</div></label>
      <label class="upload-tile ${photos.measurements?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinPhoto(event,'measurements')"><div class="ui">📏</div><div class="ul">${photos.measurements?'Measurements ✓':'Tape measure'}</div></label>
      <label class="upload-tile ${photos.bodyfat?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinPhoto(event,'bodyfat')"><div class="ui">📊</div><div class="ul">${photos.bodyfat?'BF ✓':'Body fat %'}</div></label>
    </div>
    <button class="proc-btn" id="scan-btn" onclick="scanCheckinPhotos()" ${!Object.keys(photos).filter(k=>['scale','measurements','bodyfat'].includes(k)&&photos[k]).length?'disabled':''}>Scan photos &amp; auto-fill measurements</button>
    <div class="ai-out" id="scan-out"></div>
  </div>

  <div class="card">
    <div class="card-title">Monday check-in <span class="badge-sm badge-amber">Every Monday AM</span></div>
    <div class="meas-grid">
      <div class="mfield"><label>Weight (lbs)</label><input id="ci-weight" type="number" step="0.1" placeholder="210.0"></div>
      <div class="mfield"><label>Body fat %</label><input id="ci-bf" type="number" step="0.5" placeholder="23"></div>
      <div class="mfield"><label>Waist (in)</label><input id="ci-waist" type="number" step="0.25" placeholder="36"></div>
      <div class="mfield"><label>Shoulders (in)</label><input id="ci-shoulders" type="number" step="0.25" placeholder="48"></div>
      <div class="mfield"><label>Chest (in)</label><input id="ci-chest" type="number" step="0.25" placeholder="42"></div>
      <div class="mfield"><label>Neck (in)</label><input id="ci-neck" type="number" step="0.25" placeholder="16"></div>
      <div class="mfield"><label>Arms (in)</label><input id="ci-arms" type="number" step="0.25" placeholder="15"></div>
      <div class="mfield"><label>Forearms (in)</label><input id="ci-forearms" type="number" step="0.25" placeholder="12"></div>
      <div class="mfield"><label>Abdomen (in)</label><input id="ci-abdomen" type="number" step="0.25" placeholder="34"></div>
      <div class="mfield"><label>Hips / glutes (in)</label><input id="ci-hips" type="number" step="0.25" placeholder="38"></div>
      <div class="mfield"><label>Thighs (in)</label><input id="ci-thighs" type="number" step="0.25" placeholder="23"></div>
      <div class="mfield"><label>Calves (in)</label><input id="ci-calves" type="number" step="0.25" placeholder="15"></div>
    </div>
    <div class="card-title" style="margin-top:4px">Progress photos <span class="badge-sm badge-blue">4 angles</span></div>
    <div class="photo-grid">
      <label class="photo-tile ${photos.front?'has':''}"><input type="file" accept="image/*" onchange="handlePhoto(event,'front')">${photos.front?`<img src="${photos.front}" alt="front">`:'<div class="pi">📸</div><div class="pl">Front</div>'}</label>
      <label class="photo-tile ${photos.back?'has':''}"><input type="file" accept="image/*" onchange="handlePhoto(event,'back')">${photos.back?`<img src="${photos.back}" alt="back">`:'<div class="pi">📸</div><div class="pl">Back</div>'}</label>
      <label class="photo-tile ${photos.side?'has':''}"><input type="file" accept="image/*" onchange="handlePhoto(event,'side')">${photos.side?`<img src="${photos.side}" alt="side">`:'<div class="pi">📸</div><div class="pl">Side</div>'}</label>
      <label class="photo-tile ${photos.flex?'has':''}"><input type="file" accept="image/*" onchange="handlePhoto(event,'flex')">${photos.flex?`<img src="${photos.flex}" alt="flex">`:'<div class="pi">📸</div><div class="pl">Flexed</div>'}</label>
    </div>
    <button class="save-btn" onclick="saveCheckin()">Save Monday check-in</button>
  </div>`;

  if(checkins.length>0){
    html+=`<div class="card"><div class="card-title">Check-in history</div>`;
    checkins.slice(0,10).forEach(c=>{
      html+=`<div class="h-entry"><div class="h-date">${c.date}</div><div class="h-stats">
        ${['weight','waist','shoulders','bf','chest','arms','neck','thighs','calves','hips','abdomen'].map(f=>c[f]?`<div class="h-stat">${f.charAt(0).toUpperCase()+f.slice(1)}<span>${c[f]}${f==='weight'?' lbs':f==='bf'?'%':'"'}</span></div>`:'').join('')}
      </div>`;
      if(c.photos&&Object.keys(c.photos).length){
        html+=`<div class="h-photos">`;
        ['front','back','side','flex'].forEach(k=>{ if(c.photos[k]) html+=`<img class="h-photo" src="${c.photos[k]}" alt="${k}">`; });
        html+=`</div>`;
      }
      html+=`</div>`;
    });
    html+=`</div>`;
  }
  document.getElementById('page-checkin').innerHTML=html;
}

async function scanCheckinPhotos() {
  const photos=getS('checkin_photos_draft',{});
  const btn=document.getElementById('scan-btn'), out=document.getElementById('scan-out');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Reading your stats...';
  out.className='ai-out show'; out.textContent='Scanning photos...';
  const content=[];
  ['scale','measurements','bodyfat'].forEach(type=>{ if(photos[type]){content.push({type:'text',text:`Image: ${type} photo`}); content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:photos[type]}}); } });
  content.push({type:'text',text:`Read all numbers from these fitness measurement photos. Extract every value you can see. Then output ONLY these fields if visible, in this exact format:
WEIGHT: [number] lbs
BODY_FAT: [number] %
WAIST: [number] in
SHOULDERS: [number] in
CHEST: [number] in
NECK: [number] in
ARMS: [number] in
FOREARMS: [number] in
ABDOMEN: [number] in
HIPS: [number] in
THIGHS: [number] in
CALVES: [number] in

Only include fields you can actually see numbers for. Then write a brief summary of what you found.`});
  try {
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const data=await resp.json(); const text=data.content?.map(c=>c.text||'').join('')||'No response.';
    out.textContent=text;
    // Auto-fill fields
    const fieldMap={WEIGHT:'weight',BODY_FAT:'bf',WAIST:'waist',SHOULDERS:'shoulders',CHEST:'chest',NECK:'neck',ARMS:'arms',FOREARMS:'forearms',ABDOMEN:'abdomen',HIPS:'hips',THIGHS:'thighs',CALVES:'calves'};
    Object.entries(fieldMap).forEach(([key,id])=>{
      const match=text.match(new RegExp(key+':\\s*([\\d.]+)','i'));
      if(match){const el=document.getElementById('ci-'+id); if(el) el.value=parseFloat(match[1]);}
    });
    toast('Fields auto-filled! Review and save.');
  } catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false; btn.innerHTML='Scan photos &amp; auto-fill measurements';
}

function handleCheckinPhoto(event,slot) {
  const file=event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{ const photos=getS('checkin_photos_draft',{}); photos[slot]=e.target.result.split(',')[1]; saveState('checkin_photos_draft',photos); renderCheckinPage(); };
  reader.readAsDataURL(file);
}
function handlePhoto(event,slot) {
  const file=event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{ const photos=getS('checkin_photos_draft',{}); photos[slot]=e.target.result; saveState('checkin_photos_draft',photos); renderCheckinPage(); };
  reader.readAsDataURL(file);
}
function saveCheckin() {
  const fields=['weight','bf','waist','shoulders','chest','neck','arms','forearms','abdomen','hips','thighs','calves'];
  const entry={date:new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})};
  fields.forEach(f=>{ const v=parseFloat(document.getElementById('ci-'+f)?.value); if(!isNaN(v)) entry[f]=v; });
  entry.photos=getS('checkin_photos_draft',{});
  // Strip scan photos from progress photos
  ['scale','measurements','bodyfat'].forEach(k=>delete entry.photos[k]);
  const checkins=getS('checkins',[]); checkins.unshift(entry);
  saveState('checkins',checkins); saveState('checkin_photos_draft',{});
  toast('Check-in saved!'); renderCheckinPage();
}

// ─── STATS PAGE ───────────────────────────────────────────────────────────────
function renderStatsPage() {
  const checkins=getS('checkins',[]);

  // Build weekly compliance data (last 8 weeks)
  const weeklyData=[];
  for(let i=7;i>=0;i--){
    const wk=weekKey(-i), ws=weekStart(-i), state=getS('checks_'+wk,{});
    let total=0,hit=0,prot=0,lifts=0,steps=0,cardio=0;
    DAYS.forEach(day=>{
      const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg);
      total+=kpis.length; hit+=kpis.filter(k=>state[sk(wk,day,k.id)]).length;
      if(state[sk(wk,day,'protein')])prot++;
      if(state[sk(wk,day,'lift')])lifts++;
      if(state[sk(wk,day,'steps')])steps++;
      if(state[sk(wk,day,'cardio')])cardio++;
    });
    const pct=total>0?Math.round((hit/total)*100):0;
    weeklyData.push({label:fmt(ws),pct,prot,lifts,steps,cardio,hit,total});
  }

  // Monthly summary
  const thisMonth=new Date().getMonth();
  const monthWeeks=weeklyData.filter((_,i)=>i>=4);
  const avgCompliance=monthWeeks.length>0?Math.round(monthWeeks.reduce((a,w)=>a+w.pct,0)/monthWeeks.length):0;
  const bestWeek=weeklyData.reduce((a,b)=>b.pct>a.pct?b:a,weeklyData[0]||{pct:0,label:'—'});
  const worstWeek=weeklyData.filter(w=>w.pct>0).reduce((a,b)=>b.pct<a.pct?b:a,weeklyData[0]||{pct:0,label:'—'});

  // Measurement trends from checkins
  const recentCheckins=checkins.slice(0,8).reverse();

  // SVG chart helper
  function sparkline(points,color,maxVal,minVal,width,height){
    if(points.length<2)return `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="10" fill="#444">no data yet</text>`;
    const range=maxVal-minVal||1;
    const pts=points.map((v,i)=>`${Math.round((i/(points.length-1))*width)},${Math.round(height-((v-minVal)/range)*(height-8)-4)}`);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length-1].split(',')[0]}" cy="${pts[pts.length-1].split(',')[1]}" r="3" fill="${color}"/>`;
  }

  // Compliance bar chart
  const maxBar=Math.max(...weeklyData.map(w=>w.pct),1);
  let barChart=`<svg viewBox="0 0 320 100" style="width:100%;height:100px">`;
  weeklyData.forEach((w,i)=>{
    const x=i*40+4, barH=Math.round((w.pct/100)*70), barY=75-barH;
    const col=w.pct>=80?'#4ade80':w.pct>=60?'#fbbf24':'#f87171';
    barChart+=`<rect x="${x}" y="${barY}" width="32" height="${barH}" rx="3" fill="${col}" opacity="0.8"/>
      <text x="${x+16}" y="92" text-anchor="middle" font-size="7" fill="#555">${w.label.split(' ')[1]}</text>
      ${w.pct>0?`<text x="${x+16}" y="${barY-2}" text-anchor="middle" font-size="8" fill="${col}">${w.pct}%</text>`:''}`;
  });
  barChart+=`</svg>`;

  // Trend charts
  const weightPts=recentCheckins.map(c=>c.weight).filter(Boolean);
  const waistPts=recentCheckins.map(c=>c.waist).filter(Boolean);
  const shoulderPts=recentCheckins.map(c=>c.shoulders).filter(Boolean);
  const bfPts=recentCheckins.map(c=>c.bf).filter(Boolean);
  const ratioPts=recentCheckins.filter(c=>c.shoulders&&c.waist).map(c=>parseFloat((c.shoulders/c.waist).toFixed(3)));

  function trendCard(label,points,color,unit,goal,goalLabel,inverse){
    const latest=points[points.length-1], prev=points[points.length-2];
    const change=latest&&prev?parseFloat((latest-prev).toFixed(1)):null;
    const onTrack=inverse?(latest&&latest<=goal):(latest&&latest>=goal);
    const minV=points.length?Math.min(...points)*0.97:0, maxV=points.length?Math.max(...points)*1.03:1;
    return `<div class="card" style="padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">${label}</div>
          <div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;color:${onTrack?'var(--green)':'var(--amber)'}">${latest?latest+unit:'—'}</div>
          ${change!==null?`<div style="font-size:10px;color:${(inverse?change<0:change>0)?'var(--green)':'var(--red)'};">${change>0?'+':''}${change}${unit} this week</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--muted)">goal</div>
          <div style="font-size:14px;font-weight:700;font-family:'DM Mono',monospace;color:var(--green)">${goalLabel}</div>
        </div>
      </div>
      <svg viewBox="0 0 280 50" style="width:100%;height:50px">
        ${sparkline(points,color,maxV,minV,280,50)}
      </svg>
    </div>`;
  }

  // Current week calorie avg
  const wk=weekKey(0);
  let calSum=0,calDays=0;
  DAYS.forEach(day=>{ const st=getS('aistatus_'+wk+'_'+day,{}); if(st.calories){ const m=st.calories.val.match(/(\d+)/); if(m){calSum+=parseInt(m[1]);calDays++;} } });
  const avgCal=calDays>0?Math.round(calSum/calDays):0;

  let html=`
  <div class="card">
    <div class="card-title">Monthly summary <span class="badge-sm badge-blue">${new Date().toLocaleDateString('en-US',{month:'long'})}</span></div>
    <div class="kpi-grid" style="margin-bottom:0">
      <div class="kpi-tile"><div class="big ${avgCompliance>=80?'green':avgCompliance>=60?'amber':'red'}">${avgCompliance}<span style="font-size:12px;color:var(--muted)">%</span></div><div class="lbl">Avg compliance</div></div>
      <div class="kpi-tile"><div class="big green" style="font-size:14px">${bestWeek.label||'—'}</div><div class="lbl">Best week (${bestWeek.pct}%)</div></div>
      <div class="kpi-tile"><div class="big amber" style="font-size:14px">${worstWeek.label||'—'}</div><div class="lbl">Worst week</div></div>
      <div class="kpi-tile"><div class="big ${avgCal>0?'green':''}">${avgCal>0?avgCal:'—'}</div><div class="lbl">Avg cal/day</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Weekly KPI compliance</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-family:'DM Mono',monospace">Last 8 weeks — % of all boxes checked</div>
    ${barChart}
    <div style="display:flex;gap:12px;margin-top:6px">
      <span style="font-size:10px;color:var(--green)">■ 80%+ great</span>
      <span style="font-size:10px;color:var(--amber)">■ 60–79% good</span>
      <span style="font-size:10px;color:var(--red)">■ &lt;60% push harder</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">This week breakdown</div>
    ${weeklyData.slice(-1).map(w=>`
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        <div class="kpi-tile"><div class="big ${w.prot>=6?'green':'amber'}">${w.prot}/7</div><div class="lbl">Protein</div></div>
        <div class="kpi-tile"><div class="big ${w.lifts>=3?'green':'amber'}">${w.lifts}/3</div><div class="lbl">Lifts</div></div>
        <div class="kpi-tile"><div class="big ${w.steps>=6?'green':'amber'}">${w.steps}/7</div><div class="lbl">Steps</div></div>
        <div class="kpi-tile"><div class="big ${w.cardio>=5?'green':'amber'}">${w.cardio}/5</div><div class="lbl">Cardio</div></div>
      </div>`).join('')}
  </div>

  ${checkins.length>=2?`
  ${trendCard('Weight',weightPts,'#60a5fa',' lbs',200,'195–205 lbs',true)}
  ${trendCard('Waist',waistPts,'#f87171','"',32,'32"',true)}
  ${trendCard('Shoulders',shoulderPts,'#4ade80','"',52,'52"',false)}
  ${trendCard('Body fat %',bfPts,'#fbbf24','%',10,'9–11%',true)}
  ${ratioPts.length>=2?trendCard('Adonis ratio (S÷W)',ratioPts,'#a78bfa','',1.625,'1.625',false):''}
  `:`<div class="card" style="text-align:center;padding:24px"><div style="font-size:13px;color:var(--muted)">Log at least 2 Monday check-ins to see trend graphs.</div></div>`}`;

  document.getElementById('page-stats').innerHTML=html;
}

// ─── ADONIS PAGE ──────────────────────────────────────────────────────────────
function renderAdonisPage() {
  const checkins=getS('checkins',[]), latest=checkins[0]||{};
  const measures=[
    {key:'shoulders',label:'Shoulders',target:ADONIS_TARGETS.shoulders},
    {key:'waist',label:'Waist',target:ADONIS_TARGETS.waist,inverse:true},
    {key:'chest',label:'Chest',target:ADONIS_TARGETS.chest},
    {key:'arms',label:'Arms',target:ADONIS_TARGETS.arms},
    {key:'neck',label:'Neck',target:ADONIS_TARGETS.neck},
    {key:'forearms',label:'Forearms',target:ADONIS_TARGETS.forearms},
    {key:'thighs',label:'Thighs',target:ADONIS_TARGETS.thighs},
    {key:'calves',label:'Calves',target:ADONIS_TARGETS.calves},
    {key:'hips',label:'Hips/glutes',target:ADONIS_TARGETS.hips},
    {key:'abdomen',label:'Abdomen',target:ADONIS_TARGETS.abdomen,inverse:true},
  ];
  const shoulder=latest.shoulders||0, waist=latest.waist||0;
  const ratio=waist>0&&shoulder>0?(shoulder/waist).toFixed(3):'—';
  let html=`<div class="card">
    <div class="card-title">Adonis Index <span class="badge-sm badge-blue">6'0" targets</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid var(--border);margin-bottom:12px">
      <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Current ratio (S÷W)</div>
        <div style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:${ratio!=='—'&&parseFloat(ratio)>=1.6?'var(--green)':'var(--amber)'}">${ratio}</div>
      </div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Target ratio</div>
        <div style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:var(--green)">1.625</div>
      </div>
    </div>
    <div class="adonis-grid">`;
  measures.forEach(m=>{
    const cur=latest[m.key]||0, pct=cur>0?Math.min(100,Math.round(m.inverse?(m.target/cur)*100:(cur/m.target)*100)):0;
    const color=pct>=95?'var(--green)':pct>=75?'var(--amber)':'var(--red)';
    html+=`<div class="adonis-tile"><div class="at-label">${m.label}</div>
      <div class="at-row"><div class="at-cur" style="color:${cur?color:'var(--faint)'}">${cur?cur+'"':'—'}</div><div class="at-target">goal ${m.target}"</div></div>
      <div class="at-bar"><div class="at-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  });
  html+=`</div></div>`;
  if(!latest.shoulders) html+=`<div class="card" style="text-align:center;padding:24px"><div style="font-size:13px;color:var(--muted)">Log your first Monday check-in to see your Adonis Index.</div></div>`;
  document.getElementById('page-adonis').innerHTML=html;
}

// ─── COACH PAGE ───────────────────────────────────────────────────────────────
function renderCoachPage() {
  const lastAnalysis=getS('last_coach_analysis',''), lastDate=getS('last_coach_date','');
  document.getElementById('page-coach').innerHTML=`
    <div class="coach-card">
      <div class="coach-title">Weekly Coach Analysis</div>
      <div class="coach-sub">AI bodybuilding coach — reviews your full week and gives real adjustments</div>
      <button class="analyze-btn" id="analyze-btn" onclick="runCoachAnalysis()">Analyze my week &amp; get coaching</button>
      <div class="coach-out ${lastAnalysis?'show':''}" id="coach-out">${lastAnalysis||''}</div>
      ${lastDate?`<div style="font-size:10px;color:var(--faint);margin-top:8px;font-family:'DM Mono',monospace">Last analyzed: ${lastDate}</div>`:''}
    </div>`;
}

async function runCoachAnalysis() {
  const btn=document.getElementById('analyze-btn'), out=document.getElementById('coach-out');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Your coach is analyzing...';
  out.className='coach-out show'; out.textContent='Reviewing your week...';
  const wk=weekKey(weekOffset), state=getS('checks_'+wk,{}), checkins=getS('checkins',[]);
  const latest=checkins[0]||{}, prev=checkins[1]||{}, targets=getTargets();
  let weekSummary=`WEEK: ${wk}\n\nKPI COMPLIANCE:\n`;
  DAYS.forEach(day=>{ const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg),done=kpis.filter(k=>state[sk(wk,day,k.id)]); weekSummary+=`${day} (${cfg.label}): ${done.length}/${kpis.length} — ${done.map(k=>k.id).join(', ')||'none'}\n`; });
  weekSummary+=`\nTARGETS: High: ${targets.highCal}kcal/${targets.highCarb}g carb/${targets.prot}g protein/${targets.highFat}g fat | Low: ${targets.lowCal}kcal/${targets.lowCarb}g carb/${targets.prot}g protein/${targets.lowFat}g fat\n`;
  if(latest.weight){ const fields=['weight','bf','waist','shoulders','chest','arms','neck','forearms','abdomen','hips','thighs','calves']; weekSummary+=`\nLATEST CHECK-IN (${latest.date||'recent'}):\n`; fields.forEach(f=>{if(latest[f])weekSummary+=`${f}: ${latest[f]}${f==='weight'?' lbs':f==='bf'?'%':'"'}\n`;}); weekSummary+=`S/W ratio: ${latest.shoulders&&latest.waist?(latest.shoulders/latest.waist).toFixed(3):'—'}\n`; }
  if(prev.weight&&latest.weight){ weekSummary+=`\nWEEK CHANGES:\nWeight: ${prev.weight}→${latest.weight} (${(latest.weight-prev.weight>0?'+':'')+(latest.weight-prev.weight).toFixed(1)} lbs)\n`; if(latest.waist&&prev.waist)weekSummary+=`Waist: ${prev.waist}"→${latest.waist}"\n`; if(latest.shoulders&&prev.shoulders)weekSummary+=`Shoulders: ${prev.shoulders}"→${latest.shoulders}"\n`; }
  const prompt=`You are a world-class physique coach. Your client follows Greg O'Gallagher's Movie Star Body program.\n\nPROFILE: 6'0", ~210 lbs start, ~23% BF start. Goal: 32" waist, 52" shoulders, 9-11% BF. Reference: Will Smith (Focus) / MBJ (Black Panther).\n\n${weekSummary}\n\nADONIS TARGETS (6'0"): Shoulders 52" | Waist 32" | Chest 44" | Arms 16" | Neck 16.5" | Forearms 13" | Thighs 24" | Calves 15.5" | Hips 37" | Abdomen 31"\n\nProvide analysis in this format:\n\n━━━ WEEKLY SCORECARD ━━━\nCompliance score /100 and letter grade.\n\n━━━ WINS THIS WEEK ━━━\n\n━━━ GAPS & MISSED GAINS ━━━\n\n━━━ MEASUREMENT ANALYSIS ━━━\nCurrent vs Adonis targets. S/W ratio trend.\n\n━━━ CALORIE & MACRO VERDICT ━━━\nIf adjusting, use:\nNEW HIGH DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\nNEW LOW DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\n\n━━━ NEXT WEEK ADJUSTMENTS ━━━\nSpecific training, nutrition, cardio changes.\n\n━━━ WORKOUT FOCUS ━━━\nExercises and cues for V-taper development.\n\n━━━ TIMELINE TO GOAL ━━━\n- Estimated weeks to 32" waist and Adonis ratio\n- Estimated weeks to 9-11% body fat\n- Approx workouts remaining to goal\n- Approx cardio sessions remaining to goal\n\n━━━ COACH'S WORD ━━━\nPowerful, personal, God-centered encouragement. Speak to the vision.`;
  try {
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:[{type:'text',text:prompt}]}],max_tokens:2000})});
    const data=await resp.json(); const text=data.content?.map(c=>c.text||'').join('')||data.error||'No response.';
    out.textContent=text;
    saveState('last_coach_analysis',text); saveState('last_coach_date',new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
    const hm=text.match(/NEW HIGH DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    const lm=text.match(/NEW LOW DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    if(hm||lm){ const t=getTargets(); if(hm){t.highCal=parseInt(hm[1]);t.highCarb=parseInt(hm[2]);t.prot=parseInt(hm[3]);t.highFat=parseInt(hm[4]);} if(lm){t.lowCal=parseInt(lm[1]);t.lowCarb=parseInt(lm[2]);t.lowFat=parseInt(lm[4]);} saveState('targets',t); toast('Coach updated your targets!'); }
  } catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false; btn.innerHTML='Analyze my week &amp; get coaching';
}

// ─── TARGETS PAGE ─────────────────────────────────────────────────────────────
function renderTargetsPage() {
  const t=getTargets(), apiKey=getS('api_key','');
  document.getElementById('page-targets').innerHTML=`
    <div class="card">
      <div class="card-title">Nutrition targets <span class="badge-sm badge-amber">Coach can auto-update</span></div>
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
      <button class="update-targets-btn" onclick="saveTargets()">Save targets</button>
    </div>
    <div class="card">
      <div class="card-title">Anthropic API key <span class="badge-sm badge-blue">Powers AI features</span></div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6">Get your free key at console.anthropic.com → API Keys.</div>
      <div class="mfield" style="margin-bottom:10px"><label>API Key</label><input id="api-key-input" type="password" placeholder="sk-ant-..." value="${apiKey}" style="background:var(--surface2);border:0.5px solid var(--border2);border-radius:8px;padding:9px 10px;color:var(--text);font-size:12px;font-family:'DM Mono',monospace;width:100%"></div>
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
}
function saveTargets() {
  const t={highCal:parseInt(document.getElementById('t-highCal').value)||2500,highCarb:parseInt(document.getElementById('t-highCarb').value)||254,highFat:parseInt(document.getElementById('t-highFat').value)||76,lowCal:parseInt(document.getElementById('t-lowCal').value)||1950,lowCarb:parseInt(document.getElementById('t-lowCarb').value)||139,lowFat:parseInt(document.getElementById('t-lowFat').value)||66,prot:parseInt(document.getElementById('t-prot').value)||200};
  saveState('targets',t); toast('Targets saved!');
}
function saveApiKey() { saveState('api_key',document.getElementById('api-key-input').value.trim()); toast('API key saved!'); }

// ─── INIT ─────────────────────────────────────────────────────────────────────
render();
