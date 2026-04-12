const ADONIS_TARGETS={shoulders:52,waist:32,chest:44,neck:16.5,arms:16,forearms:13,thighs:24,calves:15.5,hips:37,abdomen:31};
const DAY_CONFIG={
  Sunday:   {type:'rest',label:'Rest',          cal:1950,carb:139,prot:200,fat:66, lift:false,cardio:false},
  Monday:   {type:'high',label:'Lift + Cardio', cal:2500,carb:254,prot:200,fat:76, lift:true, cardio:true},
  Tuesday:  {type:'low', label:'Cardio Only',   cal:1950,carb:139,prot:200,fat:66, lift:false,cardio:true},
  Wednesday:{type:'high',label:'Lift + Cardio', cal:2500,carb:254,prot:200,fat:76, lift:true, cardio:true},
  Thursday: {type:'low', label:'Cardio Only',   cal:1950,carb:139,prot:200,fat:66, lift:false,cardio:true},
  Friday:   {type:'high',label:'Lift + Cardio', cal:2500,carb:254,prot:200,fat:76, lift:true, cardio:true},
  Saturday: {type:'low', label:'Cardio Only',   cal:1950,carb:139,prot:200,fat:66, lift:false,cardio:true}
};
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let weekOffset=0,currentPage='week',openDays={};

function loadState(){try{return JSON.parse(localStorage.getItem('msb_state')||'{}');}catch{return{};}}
function saveState(k,v){const s=loadState();s[k]=v;localStorage.setItem('msb_state',JSON.stringify(s));}
function getS(k,d){return loadState()[k]??d;}
function weekStart(o){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay()+o*7);return d;}
function weekKey(o){return weekStart(o).toISOString().slice(0,10);}
function sk(wk,day,kpi){return`${wk}|${day}|${kpi}`;}
function fmt(d){return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function getTargets(){return getS('targets',{highCal:2500,highCarb:254,highFat:76,lowCal:1950,lowCarb:139,lowFat:66,prot:200});}
function getDayTarget(day){const t=getTargets(),c=DAY_CONFIG[day];return c.type==='high'?{cal:t.highCal,carb:t.highCarb,fat:t.highFat,prot:t.prot}:{cal:t.lowCal,carb:t.lowCarb,fat:t.lowFat,prot:t.prot};}

function render(){
  document.getElementById('app').innerHTML=`
    <div class="nav">
      <div class="nav-logo">
        <div><div class="nav-title">Movie Star <span>Body</span></div><div class="nav-sub">Greg O'Gallagher Protocol</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px" id="nav-wc"></div>
    </div>
    <div class="page-tabs">
      ${['week','checkin','stats','adonis','coach','targets'].map(p=>`<button class="ptab ${currentPage===p?'active':''}" onclick="switchPage('${p}')">${p==='checkin'?'CHECK-IN':p.toUpperCase()}</button>`).join('')}
    </div>
    ${['week','checkin','stats','adonis','coach','targets'].map(p=>`<div class="page ${currentPage===p?'active':''}" id="page-${p}"></div>`).join('')}
    <div class="toast" id="toast"></div>`;
  renderWeekControls();
  const fns={week:renderWeekPage,checkin:renderCheckinPage,stats:renderStatsPage,adonis:renderAdonisPage,coach:renderCoachPage,targets:renderTargetsPage};
  if(fns[currentPage]) fns[currentPage]();
}
function switchPage(p){currentPage=p;render();}
function renderWeekControls(){
  const el=document.getElementById('nav-wc');
  if(currentPage!=='week'){el.innerHTML='';return;}
  const ws=weekStart(weekOffset),we=new Date(ws);we.setDate(ws.getDate()+6);
  el.innerHTML=`<button class="week-btn" onclick="changeWeek(-1)">&#8592;</button><span class="week-label">${fmt(ws)}–${fmt(we)}</span><button class="week-btn" onclick="changeWeek(1)">&#8594;</button>`;
}
function changeWeek(d){weekOffset+=d;openDays={};render();}

// ── WEEK ──────────────────────────────────────────────────────────────────────
function renderWeekPage(){
  const wk=weekKey(weekOffset),state=getS('checks_'+wk,{});
  let prot=0,lifts=0,steps=0,cardio=0;
  DAYS.forEach(d=>{if(state[sk(wk,d,'protein')])prot++;if(state[sk(wk,d,'lift')])lifts++;if(state[sk(wk,d,'steps')])steps++;if(state[sk(wk,d,'cardio')])cardio++;});
  const pct=v=>v>0?'gold':'';
  let html=`<div class="kpi-grid">
    <div class="kpi-tile"><div class="big ${pct(prot)}">${prot}<span style="font-size:11px;color:var(--faint)">/7</span></div><div class="lbl">Protein</div></div>
    <div class="kpi-tile"><div class="big ${pct(lifts)}">${lifts}<span style="font-size:11px;color:var(--faint)">/3</span></div><div class="lbl">Lifts</div></div>
    <div class="kpi-tile"><div class="big ${pct(steps)}">${steps}<span style="font-size:11px;color:var(--faint)">/7</span></div><div class="lbl">Steps</div></div>
    <div class="kpi-tile"><div class="big ${pct(cardio)}">${cardio}<span style="font-size:11px;color:var(--faint)">/5</span></div><div class="lbl">Cardio</div></div>
  </div>`;
  const ws=weekStart(weekOffset);
  DAYS.forEach((day,idx)=>{
    const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),dayDate=new Date(ws);dayDate.setDate(ws.getDate()+idx);
    const kpis=buildKPIs(day,tgt,cfg),total=kpis.length,done=kpis.filter(k=>state[sk(wk,day,k.id)]).length;
    const isOpen=openDays[wk+'|'+day]||false;
    const dot=cfg.type==='high'?'var(--green)':cfg.type==='low'?'var(--muted)':'var(--purple)';
    const bc=cfg.type==='high'?'b-high':cfg.type==='low'?'b-low':'b-rest';
    const uploads=getS('uploads_'+wk+'_'+day,{}),aiSt=getS('aistatus_'+wk+'_'+day,{});
    html+=`<div class="day-card">
      <div class="day-hdr" onclick="toggleDay('${day}')">
        <div class="day-left"><div class="day-dot" style="background:${dot}"></div>
          <div><div class="day-name">${day}</div><div class="day-date">${dayDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>
        </div>
        <div class="day-right"><span class="dbadge ${bc}">${cfg.label}</span><span class="day-score">${done}/${total}</span></div>
      </div>
      <div class="day-body ${isOpen?'open':''}" id="body-${day}">
        <div class="sec-label">KPIs</div>`;
    kpis.forEach(kpi=>{
      const chk=state[sk(wk,day,kpi.id)]||false,st=aiSt[kpi.id];
      html+=`<div class="krow" onclick="toggleKPI('${wk}','${day}','${kpi.id}')">
        <div class="cb ${chk?'on':''}"><div class="ck"></div></div>
        <span class="ktext ${chk?'done':''}">${kpi.label}</span>
        ${st?`<span class="kstatus ${st.cls}">${st.val}</span>`:''}
        <span class="kmeta">${kpi.meta}</span>
      </div>`;
    });
    const hasAny=Object.keys(uploads).length>0;
    html+=`<div class="upload-zone">
      <div class="sec-label" style="padding:0 0 8px">Log from Screenshot</div>
      <div class="upload-grid">
        <label class="upload-tile ${uploads.mfp?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','mfp')"><div class="ui">📱</div><div class="ul">${uploads.mfp?'MFP ✓':'MFP Diary'}</div></label>
        <label class="upload-tile ${uploads.steps?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','steps')"><div class="ui">👟</div><div class="ul">${uploads.steps?'Steps ✓':'Step Count'}</div></label>
        <label class="upload-tile ${uploads.workout?'has':''}"><input type="file" accept="image/*" onchange="handleUpload(event,'${wk}','${day}','workout')"><div class="ui">🏋️</div><div class="ul">${uploads.workout?'Workout ✓':'Workout'}</div></label>
      </div>
      <button class="proc-btn" id="proc-${day}" onclick="processScreenshots('${wk}','${day}')" ${!hasAny?'disabled':''}>Read Screenshots &amp; Auto-Log</button>
      <div class="ai-out" id="aiout-${day}"></div>
    </div>`;
    if(cfg.lift){
      const ll=getS('lifts_'+wk+'_'+day,[]);
      html+=`<div class="lift-log"><div class="sec-label" style="padding:0 0 8px">Lift Log</div>
        <div class="lift-inputs">
          <input class="li-ex" id="lex-${day}" type="text" placeholder="Exercise (e.g. Weighted Pull-up)">
          <input class="li-sm" id="lsets-${day}" type="text" placeholder="3x8">
          <input class="li-sm" id="lwt-${day}" type="text" placeholder="185 lbs">
          <button class="li-btn" onclick="addLift('${wk}','${day}')">+ Add</button>
        </div><div id="liftlist-${day}">`;
      ll.forEach((l,i)=>{html+=`<div class="lift-item"><span>${l.ex} — ${l.sets} @ ${l.wt}</span><span class="lift-del" onclick="deleteLift('${wk}','${day}',${i})">✕</span></div>`;});
      html+=`</div></div>`;
    }
    html+=`</div></div>`;
  });
  document.getElementById('page-week').innerHTML=html;
}

function buildKPIs(day,tgt,cfg){
  const k=[{id:'protein',label:'200g protein hit',meta:tgt.prot+'g'},{id:'calories',label:`Calories on target (${tgt.cal} kcal ±100)`,meta:tgt.cal+' kcal'},{id:'steps',label:'10,000 steps',meta:'daily'},{id:'creatine',label:'5g creatine taken',meta:'daily'}];
  if(cfg.lift)k.push({id:'lift',label:'Lift session — Movie Star Body',meta:'Mon/Wed/Fri'});
  if(cfg.cardio)k.push({id:'cardio',label:'30 min stair climber — level 5',meta:'Mon–Sat'});
  return k;
}
function toggleDay(day){const wk=weekKey(weekOffset),k=wk+'|'+day;openDays[k]=!openDays[k];document.getElementById('body-'+day)?.classList.toggle('open',openDays[k]);}
function toggleKPI(wk,day,id){const s=getS('checks_'+wk,{});s[sk(wk,day,id)]=!s[sk(wk,day,id)];saveState('checks_'+wk,s);renderWeekPage();}
function addLift(wk,day){const ex=document.getElementById('lex-'+day)?.value.trim();if(!ex)return;const l=getS('lifts_'+wk+'_'+day,[]);l.push({ex,sets:document.getElementById('lsets-'+day)?.value.trim()||'—',wt:document.getElementById('lwt-'+day)?.value.trim()||'—'});saveState('lifts_'+wk+'_'+day,l);renderWeekPage();}
function deleteLift(wk,day,i){const l=getS('lifts_'+wk+'_'+day,[]);l.splice(i,1);saveState('lifts_'+wk+'_'+day,l);renderWeekPage();}
function handleUpload(ev,wk,day,type){const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{const u=getS('uploads_'+wk+'_'+day,{});u[type]={b64:e.target.result.split(',')[1],mime:f.type};saveState('uploads_'+wk+'_'+day,u);renderWeekPage();setTimeout(()=>{openDays[wk+'|'+day]=true;renderWeekPage();},50);};r.readAsDataURL(f);}

async function processScreenshots(wk,day){
  const uploads=getS('uploads_'+wk+'_'+day,{});if(!Object.keys(uploads).length)return;
  const tgt=getDayTarget(day),btn=document.getElementById('proc-'+day),out=document.getElementById('aiout-'+day);
  if(!btn||!out)return;btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Reading...';out.className='ai-out show';out.textContent='Analyzing screenshots...';
  const content=[];
  Object.entries(uploads).forEach(([type,img])=>{content.push({type:'text',text:`Image: ${type}`});content.push({type:'image',source:{type:'base64',media_type:img.mime,data:img.b64}});});
  content.push({type:'text',text:`Analyze fitness screenshots for ${day}. Targets: ${tgt.cal} kcal (0-100 under=GREEN/hit, over=RED, 100+ under=AMBER), ${tgt.prot}g protein, 10000 steps. Output KPI STATUS then:\nPROTEIN_HIT: true/false\nCALORIES_HIT: true/false\nSTEPS_HIT: true/false\nLIFT_LOGGED: true/false`});
  try{
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const data=await resp.json();const text=data.content?.map(c=>c.text||'').join('')||data.error||'Error';
    out.textContent=text;
    const s=getS('checks_'+wk,{});
    if(/PROTEIN_HIT:\s*true/i.test(text))s[sk(wk,day,'protein')]=true;
    if(/CALORIES_HIT:\s*true/i.test(text))s[sk(wk,day,'calories')]=true;
    if(/STEPS_HIT:\s*true/i.test(text))s[sk(wk,day,'steps')]=true;
    if(/LIFT_LOGGED:\s*true/i.test(text))s[sk(wk,day,'lift')]=true;
    saveState('checks_'+wk,s);
    const aiSt={};
    const cm=text.match(/(\d{3,4})\s*(kcal|cal)/i);if(cm){const lg=parseInt(cm[1]),diff=tgt.cal-lg;aiSt.calories={cls:lg>tgt.cal?'bad':diff<=100?'ok':'warn',val:lg>tgt.cal?`+${Math.abs(diff)} over`:`${diff} under`};}
    const pm=text.match(/protein[:\s]+(\d+)g/i);if(pm){const p=parseInt(pm[1]);aiSt.protein={cls:p>=tgt.prot?'ok':'bad',val:p+'g'};}
    const sm=text.match(/([\d,]+)\s*steps/i);if(sm){const st=parseInt(sm[1].replace(',',''));aiSt.steps={cls:st>=10000?'ok':'bad',val:st.toLocaleString()};}
    saveState('aistatus_'+wk+'_'+day,aiSt);toast('✓ Screenshots logged');renderWeekPage();setTimeout(()=>{openDays[wk+'|'+day]=true;renderWeekPage();},50);
  }catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false;btn.innerHTML='Read Screenshots &amp; Auto-Log';
}

// ── CHECK-IN ──────────────────────────────────────────────────────────────────
function renderCheckinPage(){
  const checkins=getS('checkins',[]),photos=getS('checkin_photos_draft',{});
  const scanReady=['scale','measurements'].some(k=>photos[k]);
  let html=`
  <div class="card">
    <div class="card-title">AI Photo Scan <span class="badge-sm badge-gold">Snap &amp; Auto-Fill</span></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6">Upload your scale screenshot and body measurement screenshot. Claude reads every number and fills in your check-in automatically.</div>
    <div class="upload-grid" style="margin-bottom:8px">
      <label class="upload-tile ${photos.scale?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinScan(event,'scale')"><div class="ui">⚖️</div><div class="ul">${photos.scale?'Scale ✓':'Scale Photo'}</div></label>
      <label class="upload-tile ${photos.measurements?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinScan(event,'measurements')"><div class="ui">📏</div><div class="ul">${photos.measurements?'Measures ✓':'Measurements'}</div></label>
      <label class="upload-tile ${photos.bodyfat?'has':''}"><input type="file" accept="image/*" onchange="handleCheckinScan(event,'bodyfat')"><div class="ui">📊</div><div class="ul">${photos.bodyfat?'BF ✓':'Body Fat'}</div></label>
    </div>
    <button class="proc-btn" id="scan-btn" onclick="runCheckinScan()" ${!scanReady?'disabled':''}>Scan &amp; Auto-Fill All Measurements</button>
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

  if(checkins.length>0){
    html+=`<div class="card"><div class="card-title">Check-In History</div>`;
    checkins.slice(0,12).forEach(c=>{
      html+=`<div class="h-entry"><div class="h-date">${c.date}</div><div class="h-stats">
        ${['weight','waist','shoulders','bf','chest','arms','neck','thighs','calves','hips','abdomen'].map(f=>c[f]?`<div class="h-stat">${f.charAt(0).toUpperCase()+f.slice(1)}<span>${c[f]}${f==='weight'?' lbs':f==='bf'?'%':'"'}</span></div>`:'').join('')}
      </div>`;
      if(c.photos&&['front','back','side','flex'].some(k=>c.photos[k])){
        html+=`<div class="h-photos">`;['front','back','side','flex'].forEach(k=>{if(c.photos[k])html+=`<img class="h-photo" src="${c.photos[k]}" alt="${k}">`;});html+=`</div>`;
      }
      html+=`</div>`;
    });
    html+=`</div>`;
  }
  document.getElementById('page-checkin').innerHTML=html;
}

function handleCheckinScan(ev,slot){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{const p=getS('checkin_photos_draft',{});p[slot]=e.target.result.split(',')[1];saveState('checkin_photos_draft',p);renderCheckinPage();};r.readAsDataURL(f);
}
function handleProgressPhoto(ev,slot){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{const p=getS('checkin_photos_draft',{});p[slot]=e.target.result;saveState('checkin_photos_draft',p);renderCheckinPage();};r.readAsDataURL(f);
}

async function runCheckinScan(){
  const photos=getS('checkin_photos_draft',{});
  const btn=document.getElementById('scan-btn'),out=document.getElementById('scan-out');
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Reading your stats...';out.className='ai-out show';out.textContent='Scanning photos...';
  const content=[];
  ['scale','measurements','bodyfat'].forEach(type=>{if(photos[type]){content.push({type:'text',text:`Image: ${type} photo`});content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:photos[type]}});}});
  content.push({type:'text',text:`You are reading fitness measurement screenshots. Extract every number you can see.

This person's scale app shows: weight, body fat %, skeletal muscle %, muscle mass, BMR, visceral fat, bone mass, etc.
Their measurement app shows: waist, shoulder, chest, hips/hip, abdomen, neck, arms (left/right), thighs (left/right), calves (left/right).

Output ONLY the fields you can see in this exact format (skip fields not visible):
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
MUSCLE_MASS: [number] lbs
BMR: [number] kcal
VISCERAL_FAT: [number]

For bilateral measurements (left/right arms, thighs, calves) use the average.
Then write: SUMMARY: [brief note of what you found]`});
  try{
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const data=await resp.json();const text=data.content?.map(c=>c.text||'').join('')||'No response.';
    out.textContent=text;
    const map={WEIGHT:'weight',BODY_FAT:'bf',WAIST:'waist',SHOULDERS:'shoulders',CHEST:'chest',NECK:'neck',ARMS:'arms',FOREARMS:'forearms',ABDOMEN:'abdomen',HIPS:'hips',THIGHS:'thighs',CALVES:'calves'};
    let filled=0;
    Object.entries(map).forEach(([key,id])=>{const m=text.match(new RegExp(key+':\\s*([\\d.]+)','i'));if(m){const el=document.getElementById('ci-'+id);if(el){el.value=parseFloat(m[1]);filled++;}}});
    toast(`✓ ${filled} fields auto-filled — review & save`);
  }catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false;btn.innerHTML='Scan &amp; Auto-Fill All Measurements';
}

function saveCheckin(){
  const fields=['weight','bf','waist','shoulders','chest','neck','arms','forearms','abdomen','hips','thighs','calves'];
  const entry={date:new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})};
  fields.forEach(f=>{const v=parseFloat(document.getElementById('ci-'+f)?.value);if(!isNaN(v))entry[f]=v;});
  const allPhotos=getS('checkin_photos_draft',{});
  entry.photos={};['front','back','side','flex'].forEach(k=>{if(allPhotos[k])entry.photos[k]=allPhotos[k];});
  const checkins=getS('checkins',[]);checkins.unshift(entry);saveState('checkins',checkins);saveState('checkin_photos_draft',{});
  toast('✓ Check-in saved');renderCheckinPage();
}

// ── STATS ──────────────────────────────────────────────────────────────────────
function renderStatsPage(){
  const checkins=getS('checkins',[]);
  const weeklyData=[];
  for(let i=7;i>=0;i--){
    const wk=weekKey(-i),ws=weekStart(-i),state=getS('checks_'+wk,{});
    let total=0,hit=0,prot=0,lifts=0,steps=0,cardio=0;
    DAYS.forEach(day=>{const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg);total+=kpis.length;hit+=kpis.filter(k=>state[sk(wk,day,k.id)]).length;if(state[sk(wk,day,'protein')])prot++;if(state[sk(wk,day,'lift')])lifts++;if(state[sk(wk,day,'steps')])steps++;if(state[sk(wk,day,'cardio')])cardio++;});
    weeklyData.push({label:fmt(ws),pct:total>0?Math.round((hit/total)*100):0,prot,lifts,steps,cardio});
  }
  const monthWeeks=weeklyData.slice(4);
  const avgC=monthWeeks.length?Math.round(monthWeeks.reduce((a,w)=>a+w.pct,0)/monthWeeks.length):0;
  const best=weeklyData.reduce((a,b)=>b.pct>a.pct?b:a,weeklyData[0]||{pct:0,label:'—'});
  const worst=weeklyData.filter(w=>w.pct>0).reduce((a,b)=>b.pct<a.pct?b:a,weeklyData[0]||{pct:0,label:'—'});
  const rc=checkins.slice(0,10).reverse();

  function spark(pts,color,w,h){
    if(pts.length<2)return`<text x="${w/2}" y="${h/2}" text-anchor="middle" font-size="10" fill="var(--faint)">log more check-ins</text>`;
    const mn=Math.min(...pts)*0.97,mx=Math.max(...pts)*1.03,range=mx-mn||1;
    const coords=pts.map((v,i)=>`${Math.round((i/(pts.length-1))*w)},${Math.round(h-((v-mn)/range)*(h-10)-5)}`);
    const last=coords[coords.length-1].split(',');
    return`<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/>
      <text x="${last[0]}" y="${Math.max(10,parseInt(last[1])-6)}" text-anchor="middle" font-size="9" fill="${color}">${pts[pts.length-1]}</text>`;
  }

  let barSvg=`<svg viewBox="0 0 320 90" style="width:100%;height:90px">`;
  weeklyData.forEach((w,i)=>{
    const x=i*40+4,bh=Math.round((w.pct/100)*65),by=70-bh;
    const col=w.pct>=80?'var(--green)':w.pct>=60?'var(--amber)':'var(--red)';
    barSvg+=`<rect x="${x}" y="${by}" width="32" height="${bh}" rx="3" fill="${col}" opacity="0.7"/>`;
    if(w.pct>0)barSvg+=`<text x="${x+16}" y="${by-3}" text-anchor="middle" font-size="8" fill="${col}">${w.pct}%</text>`;
    barSvg+=`<text x="${x+16}" y="83" text-anchor="middle" font-size="7" fill="var(--faint)">${w.label.split(' ')[1]||w.label}</text>`;
  });
  barSvg+=`</svg>`;

  function trendBlock(label,pts,color,unit,goal,inverse){
    const latest=pts[pts.length-1],prev=pts[pts.length-2];
    const chg=latest&&prev!=null?parseFloat((latest-prev).toFixed(1)):null;
    const onTrack=inverse?(latest&&latest<=goal):(latest&&latest>=goal);
    return`<div class="trend-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:3px">${label}</div>
          <div class="stat-num" style="color:${onTrack?'var(--green)':'var(--gold)'}">${latest!=null?latest+unit:'—'}</div>
          ${chg!=null?`<div style="font-size:10px;font-family:'DM Mono',monospace;margin-top:2px;color:${(inverse?chg<0:chg>0)?'var(--green)':'var(--red)'}">${chg>0?'+':''}${chg}${unit} vs last week</div>`:''}
        </div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--muted);margin-bottom:3px">goal</div><div style="font-size:15px;font-weight:700;font-family:'DM Mono',monospace;color:var(--green)">${goal}${unit}</div></div>
      </div>
      <svg viewBox="0 0 280 55" style="width:100%;height:55px">${spark(pts,color,280,55)}</svg>
    </div>`;
  }

  const wp=rc.map(c=>c.weight).filter(Boolean);
  const wsp=rc.map(c=>c.waist).filter(Boolean);
  const shp=rc.map(c=>c.shoulders).filter(Boolean);
  const bfp=rc.map(c=>c.bf).filter(Boolean);
  const rp=rc.filter(c=>c.shoulders&&c.waist).map(c=>parseFloat((c.shoulders/c.waist).toFixed(3)));

  let html=`
  <div class="card">
    <div class="card-title">Monthly Summary <span class="badge-sm badge-gold">${new Date().toLocaleDateString('en-US',{month:'long'})}</span></div>
    <div class="kpi-grid" style="margin-bottom:0">
      <div class="kpi-tile"><div class="big ${avgC>=80?'green':avgC>=60?'amber':'red'}">${avgC}<span style="font-size:11px;color:var(--faint)">%</span></div><div class="lbl">Avg Compliance</div></div>
      <div class="kpi-tile"><div class="big gold" style="font-size:13px">${best.label||'—'}</div><div class="lbl">Best Week (${best.pct}%)</div></div>
      <div class="kpi-tile"><div class="big amber" style="font-size:13px">${worst.label||'—'}</div><div class="lbl">Needs Work</div></div>
      <div class="kpi-tile"><div class="big gold">${weeklyData[weeklyData.length-1]?.prot||0}/7</div><div class="lbl">Protein Days</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">KPI Compliance — Last 8 Weeks</div>
    ${barSvg}
    <div style="display:flex;gap:14px;margin-top:4px">
      <span style="font-size:9px;color:var(--green);font-family:'DM Mono',monospace">■ 80%+ elite</span>
      <span style="font-size:9px;color:var(--amber);font-family:'DM Mono',monospace">■ 60% solid</span>
      <span style="font-size:9px;color:var(--red);font-family:'DM Mono',monospace">■ &lt;60% push</span>
    </div>
  </div>

  ${checkins.length>=2?`
    ${trendBlock('Weight',wp,'#5b9bd5',' lbs',200,true)}
    ${trendBlock('Waist',wsp,'#e05555','"',32,true)}
    ${trendBlock('Shoulders',shp,'#3dba6f','"',52,false)}
    ${trendBlock('Body Fat %',bfp,'#c9a84c','%',10,true)}
    ${rp.length>=2?trendBlock('Adonis Ratio (S÷W)',rp,'#8b72cc','',1.625,false):''}
  `:`<div class="card" style="text-align:center;padding:28px"><div style="font-size:12px;color:var(--muted)">Log 2+ Monday check-ins to unlock trend graphs.</div></div>`}`;

  document.getElementById('page-stats').innerHTML=html;
}

// ── ADONIS ────────────────────────────────────────────────────────────────────
function renderAdonisPage(){
  const checkins=getS('checkins',[]),latest=checkins[0]||{};
  const sw=latest.shoulders||0,wt=latest.waist||0;
  const ratio=sw&&wt?(sw/wt).toFixed(3):'—';
  const ratioColor=ratio!=='—'&&parseFloat(ratio)>=1.6?'var(--green)':ratio!=='—'&&parseFloat(ratio)>=1.5?'var(--amber)':'var(--red)';
  const measures=[
    {key:'shoulders',label:'Shoulders',target:52},{key:'waist',label:'Waist',target:32,inv:true},
    {key:'chest',label:'Chest',target:44},{key:'arms',label:'Arms',target:16},
    {key:'neck',label:'Neck',target:16.5},{key:'forearms',label:'Forearms',target:13},
    {key:'thighs',label:'Thighs',target:24},{key:'calves',label:'Calves',target:15.5},
    {key:'hips',label:'Hips/Glutes',target:37},{key:'abdomen',label:'Abdomen',target:31,inv:true},
  ];
  let html=`<div class="card">
    <div class="card-title">Adonis Index <span class="badge-sm badge-blue">6'0" Blueprint</span></div>
    <div class="ratio-hero">
      <div><div class="ratio-label">Current Ratio (S÷W)</div><div class="ratio-val" style="color:${ratioColor}">${ratio}</div>${ratio!=='—'?`<div style="font-size:10px;color:var(--muted);margin-top:2px;font-family:'DM Mono',monospace">${((parseFloat(ratio)/1.625)*100).toFixed(1)}% to goal</div>`:''}</div>
      <div style="text-align:right"><div class="ratio-label">Target Ratio</div><div class="ratio-val" style="color:var(--green)">1.625</div><div style="font-size:10px;color:var(--muted);margin-top:2px;font-family:'DM Mono',monospace">52÷32 = perfect</div></div>
    </div>
    <div class="adonis-grid">`;
  measures.forEach(m=>{
    const cur=latest[m.key]||0,pct=cur?Math.min(100,Math.round(m.inv?(m.target/cur)*100:(cur/m.target)*100)):0;
    const col=pct>=95?'var(--green)':pct>=75?'var(--amber)':'var(--red)';
    const diff=cur?(m.inv?(cur-m.target).toFixed(1):(m.target-cur).toFixed(1)):null;
    html+=`<div class="adonis-tile">
      <div class="at-label">${m.label}</div>
      <div class="at-row"><div class="at-cur" style="color:${cur?col:'var(--faint)'}">${cur?cur+'"':'—'}</div><div class="at-target">goal ${m.target}"</div></div>
      ${diff&&parseFloat(diff)>0?`<div style="font-size:9px;font-family:'DM Mono',monospace;color:${col};margin-top:2px">${m.inv?diff+'" to lose':diff+'" to gain'}</div>`:''}
      <div class="at-bar"><div class="at-fill" style="width:${pct}%;background:${col}"></div></div>
    </div>`;
  });
  html+=`</div></div>`;
  if(!latest.shoulders)html+=`<div class="card" style="text-align:center;padding:28px"><div style="font-size:12px;color:var(--muted)">Log your first Monday check-in to see your Adonis Index.</div></div>`;
  document.getElementById('page-adonis').innerHTML=html;
}

// ── COACH ──────────────────────────────────────────────────────────────────────
function renderCoachPage(){
  const last=getS('last_coach_analysis',''),date=getS('last_coach_date','');
  document.getElementById('page-coach').innerHTML=`
    <div class="card" style="border-color:rgba(139,114,204,0.2)">
      <div class="card-title">Weekly Coach Analysis <span class="badge-sm badge-gold">AI Powered</span></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;line-height:1.7;font-family:'DM Mono',monospace">Reviews your full week — compliance, measurements, macros, timeline to goal. Can auto-update your targets.</div>
      <button class="save-btn btn-purple" id="analyze-btn" onclick="runCoachAnalysis()" style="margin-bottom:10px">Analyze My Week &amp; Get Coaching</button>
      <div class="coach-out ${last?'show':''}" id="coach-out">${last||''}</div>
      ${date?`<div style="font-size:9px;color:var(--faint);margin-top:8px;font-family:'DM Mono',monospace;letter-spacing:.04em">Last analyzed: ${date}</div>`:''}
    </div>`;
}

async function runCoachAnalysis(){
  const btn=document.getElementById('analyze-btn'),out=document.getElementById('coach-out');
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Your coach is analyzing...';out.className='coach-out show';out.textContent='Reviewing your week...';
  const wk=weekKey(weekOffset),state=getS('checks_'+wk,{}),checkins=getS('checkins',[]),targets=getTargets();
  const latest=checkins[0]||{},prev=checkins[1]||{};
  let sum=`WEEK: ${wk}\n\nKPI COMPLIANCE:\n`;
  DAYS.forEach(day=>{const cfg=DAY_CONFIG[day],tgt=getDayTarget(day),kpis=buildKPIs(day,tgt,cfg),done=kpis.filter(k=>state[sk(wk,day,k.id)]);sum+=`${day} (${cfg.label}): ${done.length}/${kpis.length} — ${done.map(k=>k.id).join(', ')||'none'}\n`;});
  sum+=`\nCURRENT TARGETS:\nHigh: ${targets.highCal}kcal / ${targets.highCarb}g carbs / ${targets.prot}g protein / ${targets.highFat}g fat\nLow: ${targets.lowCal}kcal / ${targets.lowCarb}g carbs / ${targets.prot}g protein / ${targets.lowFat}g fat\n`;
  if(latest.weight){const f=['weight','bf','waist','shoulders','chest','arms','neck','forearms','abdomen','hips','thighs','calves'];sum+=`\nLATEST CHECK-IN (${latest.date||'recent'}):\n`;f.forEach(x=>{if(latest[x])sum+=`${x}: ${latest[x]}${x==='weight'?' lbs':x==='bf'?'%':'"'}\n`;});sum+=`S/W ratio: ${latest.shoulders&&latest.waist?(latest.shoulders/latest.waist).toFixed(3):'—'}\n`;}
  if(prev.weight&&latest.weight){sum+=`\nWEEK CHANGES:\nWeight: ${prev.weight}→${latest.weight} (${(latest.weight-prev.weight>0?'+':'')+(latest.weight-prev.weight).toFixed(1)} lbs)\n`;if(latest.waist&&prev.waist)sum+=`Waist: ${prev.waist}"→${latest.waist}"\n`;if(latest.shoulders&&prev.shoulders)sum+=`Shoulders: ${prev.shoulders}"→${latest.shoulders}"\n`;}
  const prompt=`You are a world-class physique coach with the knowledge of Greg O'Gallagher, Stan Efferding, and Jeff Nippard combined.\n\nCLIENT: 6'0", started ~210 lbs / 23% BF. Program: Greg O'Gallagher Movie Star Body.\nGOAL: 32" waist, 52" shoulders, 9-11% body fat. Reference: Will Smith (Focus) / MBJ (Black Panther).\nADONIS TARGETS (6'0"): Shoulders 52" | Waist 32" | Chest 44" | Arms 16" | Neck 16.5" | Forearms 13" | Thighs 24" | Calves 15.5" | Hips 37" | Abdomen 31"\n\n${sum}\n\nProvide your full weekly coaching analysis:\n\n━━━ WEEKLY SCORECARD ━━━\nScore /100, letter grade, one-line verdict.\n\n━━━ WINS THIS WEEK ━━━\nBe specific. What did they nail?\n\n━━━ GAPS & MISSED GAINS ━━━\nWhat cost them progress?\n\n━━━ MEASUREMENT ANALYSIS ━━━\nCurrent vs Adonis targets. S/W ratio assessment. What's moving in the right direction?\n\n━━━ CALORIE & MACRO VERDICT ━━━\nAre current targets optimal for their cut? If adjusting:\nNEW HIGH DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\nNEW LOW DAY: [cal] kcal / [carb]g carbs / [prot]g protein / [fat]g fat\n\n━━━ NEXT WEEK GAME PLAN ━━━\nSpecific changes. Nothing generic.\n\n━━━ WORKOUT FOCUS ━━━\nV-taper priority exercises and cues for this week.\n\n━━━ TIMELINE TO GOAL ━━━\n• Estimated weeks to 32" waist / Adonis ratio\n• Estimated weeks to 9-11% body fat\n• Approximate workouts remaining to goal\n• Approximate cardio sessions remaining\n\n━━━ COACH'S WORD ━━━\nReal, powerful, God-centered. Speak to who he's becoming. Reference the Will Smith / MBJ vision. Make him want to go all in.`;
  try{
    const resp=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:[{type:'text',text:prompt}]}],max_tokens:2000})});
    const data=await resp.json();const text=data.content?.map(c=>c.text||'').join('')||data.error||'Error';
    out.textContent=text;saveState('last_coach_analysis',text);saveState('last_coach_date',new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
    const hm=text.match(/NEW HIGH DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    const lm=text.match(/NEW LOW DAY:\s*(\d+)\s*kcal\s*\/\s*(\d+)g\s*carbs\s*\/\s*(\d+)g\s*protein\s*\/\s*(\d+)g\s*fat/i);
    if(hm||lm){const t=getTargets();if(hm){t.highCal=parseInt(hm[1]);t.highCarb=parseInt(hm[2]);t.prot=parseInt(hm[3]);t.highFat=parseInt(hm[4]);}if(lm){t.lowCal=parseInt(lm[1]);t.lowCarb=parseInt(lm[2]);t.lowFat=parseInt(lm[4]);}saveState('targets',t);toast('✓ Coach updated your targets');}
  }catch(err){out.textContent='Error: '+err.message;}
  btn.disabled=false;btn.innerHTML='Analyze My Week &amp; Get Coaching';
}

// ── TARGETS ────────────────────────────────────────────────────────────────────
function renderTargetsPage(){
  const t=getTargets(),apiKey=getS('api_key','');
  document.getElementById('page-targets').innerHTML=`
    <div class="card">
      <div class="card-title">Nutrition Targets <span class="badge-sm badge-amber">Coach can auto-update</span></div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px;font-family:'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase">High Days — Mon / Wed / Fri</div>
      <div class="meas-grid">
        <div class="mfield"><label>Calories</label><input class="t-edit" id="t-highCal" type="number" value="${t.highCal}" style="width:100%"></div>
        <div class="mfield"><label>Protein (g)</label><input class="t-edit" id="t-prot" type="number" value="${t.prot}" style="width:100%"></div>
        <div class="mfield"><label>Carbs (g)</label><input class="t-edit" id="t-highCarb" type="number" value="${t.highCarb}" style="width:100%"></div>
        <div class="mfield"><label>Fat (g)</label><input class="t-edit" id="t-highFat" type="number" value="${t.highFat}" style="width:100%"></div>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px;font-family:'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase">Low Days — Sun / Tue / Thu / Sat</div>
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
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;line-height:1.6">Get your key at console.anthropic.com → API Keys. Required for screenshot reading and coach analysis.</div>
      <div class="mfield" style="margin-bottom:10px"><label>API Key</label><input id="api-key-input" type="password" placeholder="sk-ant-..." value="${apiKey}" style="background:var(--surface2);border:0.5px solid var(--border2);border-radius:8px;padding:9px 10px;color:var(--text);font-size:12px;font-family:'DM Mono',monospace;width:100%"></div>
      <button class="save-btn btn-green" onclick="saveApiKey()">Save API Key</button>
    </div>
    <div class="card">
      <div class="card-title">Goal Blueprint</div>
      ${[['Height',"6'0\""],['Goal Waist','32"'],['Goal Shoulders','52"'],['Goal Body Fat','9–11%'],['Adonis Ratio','1.625'],['Program','Movie Star Body'],['Reference','Will Smith (Focus) / MBJ (Black Panther)']].map(([l,v])=>`<div class="target-row"><span class="t-label">${l}</span><span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--gold)">${v}</span></div>`).join('')}
    </div>`;
}
function saveTargets(){const t={highCal:parseInt(document.getElementById('t-highCal').value)||2500,highCarb:parseInt(document.getElementById('t-highCarb').value)||254,highFat:parseInt(document.getElementById('t-highFat').value)||76,lowCal:parseInt(document.getElementById('t-lowCal').value)||1950,lowCarb:parseInt(document.getElementById('t-lowCarb').value)||139,lowFat:parseInt(document.getElementById('t-lowFat').value)||66,prot:parseInt(document.getElementById('t-prot').value)||200};saveState('targets',t);toast('✓ Targets saved');}
function saveApiKey(){saveState('api_key',document.getElementById('api-key-input').value.trim());toast('✓ API key saved');}

render();
