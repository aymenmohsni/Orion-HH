/* =================================================================
   ORION PULSE — shared app logic
   Persists role, records and lock state to localStorage so state
   carries across the separate pages of this prototype.
================================================================= */

const DEPTS = {
  clinical:{ label:'Clinical', cls:'clinical', initial:'C',
    metrics:[
      {id:'oasis', name:'OASIS Completion Rate', unit:'%', goal:95, dir:'higher', formula:'OASIS assessments completed within required window ÷ Total qualifying assessments'},
      {id:'timely_doc', name:'Timely Documentation Rate', unit:'%', goal:90, dir:'higher', formula:'Visit notes completed within 24 hours ÷ Total visits completed'},
      {id:'missed_visit', name:'Missed Visit Rate', unit:'%', goal:5, dir:'lower', formula:'Visits missed without makeup ÷ Total scheduled visits'},
      {id:'rehosp', name:'Re-hospitalization Rate', unit:'%', goal:15, dir:'lower', formula:'Patients hospitalized during episode ÷ Total active patients'},
      {id:'satisfaction', name:'Patient Satisfaction Score', unit:'/5', goal:4.2, dir:'higher', formula:'Average patient survey rating, 1–5 scale'}
    ],
    narrative:[{id:'went_well', label:'What went well'},{id:'challenges', label:'Challenges'},{id:'assistance', label:'Assistance needed'}]
  },
  marketing:{ label:'Marketing', cls:'marketing', initial:'M',
    metrics:[
      {id:'referrals', name:'Total Referrals Received', unit:'#', goal:40, dir:'higher', formula:'Count of referrals logged this week'},
      {id:'conversion', name:'Referral Conversion Rate', unit:'%', goal:70, dir:'higher', formula:'Referrals converted to admission ÷ Total qualified referrals'},
      {id:'census', name:'Active Patient Census', unit:'#', goal:80, dir:'higher', formula:'Count of patients currently receiving care'},
      {id:'admissions', name:'New Admissions', unit:'#', goal:15, dir:'higher', formula:'Count of new admissions this week'},
      {id:'visits', name:'Marketing Visits Completed', unit:'#', goal:20, dir:'higher', formula:'Count of completed outreach visits'}
    ],
    narrative:[{id:'new_referrals', label:'New referrals — notable sources'},{id:'went_well', label:'What went well'},{id:'challenges', label:'Challenges / barriers'}]
  },
  agency:{ label:'Agency Operations', cls:'agency', initial:'A',
    metrics:[
      {id:'billable', name:'Billable Visits / Patient / Month', unit:'', goal:8, dir:'higher', formula:'Total billable visits ÷ Active patient census'},
      {id:'turnover', name:'Staff Turnover Rate', unit:'%', goal:10, dir:'lower', formula:'Staff departures ÷ Average headcount'},
      {id:'utilization', name:'Staff Utilization Rate', unit:'%', goal:85, dir:'higher', formula:'Billable hours ÷ Available scheduled hours'}
    ],
    narrative:[{id:'staffing', label:'Staffing updates'},{id:'went_well', label:'What went well'}]
  },
  intake:{ label:'Intake', cls:'intake', initial:'I',
    metrics:[
      {id:'referrals_recv', name:'Total Referrals Received', unit:'#', goal:40, dir:'higher', formula:'Count of referrals logged this week'},
      {id:'acceptance', name:'Referral Acceptance Rate', unit:'%', goal:80, dir:'higher', formula:'Referrals accepted ÷ Total referrals received'},
      {id:'same_day', name:'Eligibility Screen — Same Day', unit:'%', goal:100, dir:'higher', formula:'Screens completed same business day ÷ Total referrals received'},
      {id:'response_time', name:'Avg. Referral-to-Acceptance Time', unit:'hrs', goal:4, dir:'lower', formula:'Average hours from referral receipt to acceptance decision'}
    ],
    narrative:[{id:'went_well', label:'What went well'},{id:'barriers', label:'Barriers / challenges'}]
  },
  owner:{ label:'Owner / Admin', cls:'owner', initial:'O',
    metrics:[],
    narrative:[{id:'agency_updates', label:'Agency updates'},{id:'events', label:'Events'}]
  }
};
const DEPT_KEYS = ['clinical','marketing','agency','intake'];
const ADMIN_ONLY = ['execoverview','dashboard','analytics','deck','audit','team'];
const LOCK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

/* ---------------- STATE / PERSISTENCE ---------------- */
const STORE_KEY = 'orionPulseState_v1';
let state = null;

function defaultState(){
  const now = Date.now();
  const t = (mins)=> now - mins*60000;
  return {
    role:'clinical',
    locked:false,
    recId:8,
    records:[
      {id:1, dept:'clinical', kind:'metric', fieldId:'oasis', label:'OASIS Completion Rate', value:96, ts:t(320)},
      {id:2, dept:'clinical', kind:'metric', fieldId:'timely_doc', label:'Timely Documentation Rate', value:88, ts:t(300)},
      {id:3, dept:'marketing', kind:'metric', fieldId:'referrals', label:'Total Referrals Received', value:44, ts:t(200)},
      {id:4, dept:'marketing', kind:'metric', fieldId:'conversion', label:'Referral Conversion Rate', value:63, ts:t(198)},
      {id:5, dept:'agency', kind:'metric', fieldId:'turnover', label:'Staff Turnover Rate', value:12, ts:t(150)},
      {id:6, dept:'intake', kind:'metric', fieldId:'acceptance', label:'Referral Acceptance Rate', value:82, ts:t(90)},
      {id:7, dept:'clinical', kind:'narrative', fieldId:'went_well', label:'What went well', value:'Zero missed supervisory visits for the third week running.', ts:t(60)}
    ]
  };
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw){ state = defaultState(); saveState(); return; }
    const parsed = JSON.parse(raw);
    parsed.records.forEach(r=> r.ts = new Date(r.ts));
    state = parsed;
  }catch(e){ state = defaultState(); }
}
function saveState(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
function resetDemo(){
  localStorage.removeItem(STORE_KEY);
  location.reload();
}
function push(dept,kind,fieldId,label,value){
  state.records.push({id:state.recId++, dept, kind, fieldId, label, value, ts:new Date()});
  saveState();
}

/* ---------------- STATUS / CALC HELPERS ---------------- */
function statusFor(metric, value){
  if(value===null || value===undefined || value==='') return 'neutral';
  const v = parseFloat(value);
  if(isNaN(v)) return 'neutral';
  if(metric.dir==='higher'){
    if(v>=metric.goal) return 'good';
    if(v>=metric.goal*0.9) return 'watch';
    return 'bad';
  }
  if(v<=metric.goal) return 'good';
  if(v<=metric.goal*1.15) return 'watch';
  return 'bad';
}
function statusLabel(s){ return {good:'On track',watch:'Watch',bad:'Behind',neutral:'Not started'}[s]; }
function latestFor(dept, fieldId){
  const rows = state.records.filter(r=>r.dept===dept && r.fieldId===fieldId);
  if(!rows.length) return null;
  return rows.reduce((a,b)=> a.ts>b.ts?a:b);
}
function fmtTime(d){
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function thresholdText(m){
  if(m.dir==='higher'){
    const watchLine = Math.round(m.goal*0.9*10)/10;
    return `On track ≥ ${m.goal}${m.unit} · Watch ≥ ${watchLine}${m.unit} · Behind below that`;
  }
  const watchLine = Math.round(m.goal*1.15*10)/10;
  return `On track ≤ ${m.goal}${m.unit} · Watch ≤ ${watchLine}${m.unit} · Behind above that`;
}
function computeRollup(deptFilter){
  const depts = deptFilter ? [deptFilter] : DEPT_KEYS;
  let meeting=0, watch=0, behind=0, notStarted=0, tracked=0;
  depts.forEach(key=>{
    DEPTS[key].metrics.forEach(m=>{
      tracked++;
      const latest = latestFor(key, m.id);
      const s = latest? statusFor(m, latest.value) : 'neutral';
      if(s==='good') meeting++; else if(s==='watch') watch++; else if(s==='bad') behind++; else notStarted++;
    });
  });
  const started = tracked - notStarted;
  const perfRate = started>0 ? Math.round((meeting/started)*100) : 0;
  return {tracked, meeting, watch, behind, notStarted, perfRate};
}
function pseudoHistory(seedStr, n, base){
  let h = 0;
  for(let i=0;i<seedStr.length;i++){ h = (h*31 + seedStr.charCodeAt(i)) >>> 0; }
  let val = base + (h%16)-8;
  const arr = [];
  for(let i=0;i<n;i++){
    h = (h*1103515245 + 12345) >>> 0;
    val += ((h%13)-6);
    val = Math.max(30, Math.min(100, val));
    arr.push(Math.round(val));
  }
  return arr;
}
function allMetrics(){
  const list = [];
  DEPT_KEYS.forEach(key=> DEPTS[key].metrics.forEach(m=> list.push({dept:key, metric:m})));
  return list;
}

/* ---------------- ACCESS CONTROL ---------------- */
function canAccess(page){
  if(!ADMIN_ONLY.includes(page)) return true;
  return state.role === 'owner';
}
function restrictedHtml(label){
  return `<div class="card restricted">
    <div class="lock-badge">${LOCK_SVG.replace('width="11" height="11"','width="18" height="18"')}</div>
    <h3 class="section-title">Owner / Admin access required</h3>
    <p>${label} shows data across every department, so it's limited to the Owner / Admin role — a Clinical or Marketing login can't see other teams' full numbers.</p>
    <button class="btn btn-primary" onclick="switchToOwner()">Switch to Owner / Admin</button>
  </div>`;
}
function switchToOwner(){
  state.role = 'owner';
  saveState();
  document.getElementById('roleSelect').value = 'owner';
  chromeRefresh();
  if(typeof renderPage === 'function') renderPage();
  showToast('Switched to Owner / Admin — full visibility unlocked.');
}

/* ---------------- CHROME (sidebar / topbar shared across pages) ---------------- */
function chromeRefresh(){
  const badge = document.getElementById('adminBadge');
  if(badge) badge.style.display = state.role==='owner' ? 'inline-flex' : 'none';
  document.querySelectorAll('.nav-item').forEach(n=>{
    const p = n.dataset.page;
    const slot = n.querySelector('.lock-slot');
    if(slot) slot.innerHTML = (ADMIN_ONLY.includes(p) && state.role!=='owner') ? LOCK_SVG : '';
  });
}
function initChrome(){
  loadState();
  const sel = document.getElementById('roleSelect');
  if(sel){
    sel.value = state.role;
    sel.addEventListener('change', (e)=>{
      state.role = e.target.value;
      saveState();
      chromeRefresh();
      if(typeof renderPage === 'function') renderPage();
    });
  }
  chromeRefresh();
  const resetBtn = document.getElementById('resetDemoBtn');
  if(resetBtn) resetBtn.addEventListener('click', resetDemo);
}

/* ---------------- TOAST ---------------- */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 3600);
}

/* ---------------- CALC MODAL (dashboard / analytics) ---------------- */
function showCalc(deptKey, metricId){
  const dept = DEPTS[deptKey];
  const m = dept.metrics.find(x=>x.id===metricId);
  const latest = latestFor(deptKey, metricId);
  const hist = pseudoHistory(deptKey+metricId, 6, m.dir==='higher' ? Math.min(95,m.goal) : 100-Math.min(80,m.goal));
  document.getElementById('calcTitle').textContent = m.name;
  document.getElementById('calcBody').innerHTML = `
    <span class="chip ${dept.cls} calc-chip"><span class="mono-dot">${dept.initial}</span>${dept.label}</span>
    <div class="calc-row"><span class="calc-label">Formula</span><span>${m.formula}</span></div>
    <div class="calc-row"><span class="calc-label">Direction</span><span>${m.dir==='higher'?'Higher is better':'Lower is better'}</span></div>
    <div class="calc-row"><span class="calc-label">Thresholds</span><span>${thresholdText(m)}</span></div>
    <div class="calc-row"><span class="calc-label">Current value</span><span class="mono">${latest? latest.value+m.unit : 'Not submitted yet'}</span></div>
    <div class="calc-history">
      <div class="calc-label" style="margin-bottom:8px;">Last 6 weeks (simulated trend)</div>
      <div class="sparkline">${hist.map(v=>`<div class="spark-bar" style="height:${v}%"></div>`).join('')}</div>
    </div>
  `;
  document.getElementById('calcModal').classList.add('show');
}
function closeCalc(){ document.getElementById('calcModal').classList.remove('show'); }
function closeCalcIfOverlay(e){ if(e.target.id==='calcModal') closeCalc(); }

/* ---------------- ENTRY PAGE ---------------- */
function renderEntryPage(){
  const dept = DEPTS[state.role];
  const box = document.getElementById('entryScope');
  let metricsHtml = dept.metrics.length ? `<div class="metric-grid">` + dept.metrics.map(m=>{
    const latest = latestFor(state.role, m.id);
    return `<div class="metric-field">
      <label>${m.name}</label>
      <div class="goal">Goal: ${m.dir==='higher'?'≥':'≤'} ${m.goal}${m.unit}</div>
      <input type="number" step="any" id="in_${m.id}" placeholder="${latest? latest.value : 'Enter value'}">
    </div>`;
  }).join('') + `</div>` : `<p class="section-desc">No numeric KPIs assigned to this role — narrative updates only.</p>`;

  let narrativeHtml = dept.narrative.map(n=>`<div class="narrative-field">
      <label>${n.label}</label>
      <textarea id="in_${n.id}" placeholder="Add narrative..."></textarea>
    </div>`).join('');

  box.innerHTML = `
    <div class="scope-banner chip ${dept.cls}" style="display:inline-flex;">
      <span class="mono-dot">${dept.initial}</span> You're signed in as ${dept.label} — this form only writes ${dept.label} records
    </div>
    <h3 class="section-title" style="margin-top:18px;">This week's metrics</h3>
    <p class="section-desc">Leave a field blank to keep the current value.</p>
    ${metricsHtml}
    <h3 class="section-title">Narrative</h3>
    ${narrativeHtml}
    <div class="form-actions">
      <button class="btn btn-primary" onclick="submitEntry()">Submit weekly entry</button>
      ${state.locked? `<span style="font-size:12.5px;color:var(--bad);font-weight:600;">This week is locked — contact an admin</span>`:''}
    </div>
  `;
  renderDeptLedger();
}
function submitEntry(){
  if(state.locked){ showToast('This week is locked. Ask an admin to unlock before submitting.'); return; }
  const dept = DEPTS[state.role];
  let count = 0;
  dept.metrics.forEach(m=>{
    const el = document.getElementById('in_'+m.id);
    if(el && el.value!==''){ push(state.role,'metric',m.id,m.name, parseFloat(el.value)); el.value=''; count++; }
  });
  dept.narrative.forEach(n=>{
    const el = document.getElementById('in_'+n.id);
    if(el && el.value.trim()!==''){ push(state.role,'narrative',n.id,n.label, el.value.trim()); el.value=''; count++; }
  });
  if(count===0){ showToast('Nothing to submit yet — fill in at least one field.'); return; }
  showToast(`Saved as ${count} individual record${count>1?'s':''}, ${fmtTime(new Date())}. No other department's data was touched.`);
  renderEntryPage();
}
function renderDeptLedger(){
  const rows = state.records.filter(r=>r.dept===state.role).sort((a,b)=>b.ts-a.ts).slice(0,8);
  const el = document.getElementById('deptLedger');
  if(!el) return;
  if(!rows.length){ el.innerHTML = `<div class="ledger-empty">No records yet for this department.</div>`; return; }
  el.innerHTML = rows.map(r=>`
    <div class="ledger-row">
      <div class="ledger-time">${fmtTime(r.ts)}</div>
      <div>${r.label}</div>
      <div class="mono" style="color:var(--ink-soft);">${typeof r.value==='string' && r.value.length>60 ? r.value.slice(0,60)+'…' : r.value}</div>
      <div style="color:var(--ink-faint); font-size:11px;">record #${r.id}</div>
    </div>
  `).join('');
}

/* ---------------- DASHBOARD PAGE ---------------- */
function renderDashboardPage(){
  const body = document.getElementById('dashboardBody');
  if(!canAccess('dashboard')){ body.innerHTML = restrictedHtml('The live dashboard'); return; }
  body.innerHTML = `<p class="section-desc">Read-only rollup across all four departments, calculated live from submitted records. Click <strong>ƒ</strong> to see how any number is calculated.</p>` +
  DEPT_KEYS.map(key=>{
    const dept = DEPTS[key];
    const rows = dept.metrics.map(m=>{
      const latest = latestFor(key, m.id);
      const s = latest? statusFor(m, latest.value) : 'neutral';
      return `<tr>
        <td>${m.name}</td>
        <td class="mono">${m.dir==='higher'?'≥':'≤'} ${m.goal}${m.unit}</td>
        <td class="mono">${latest? latest.value+m.unit : '—'}</td>
        <td><span class="status-pill ${s}">${statusLabel(s)}</span></td>
        <td style="color:var(--ink-faint); font-size:11.5px;">${latest? fmtTime(latest.ts): '—'}</td>
        <td><button class="calc-btn" title="How is this calculated?" onclick="showCalc('${key}','${m.id}')">ƒ</button></td>
      </tr>`;
    }).join('');
    return `<div class="dept-block card card-pad">
      <div class="dept-head"><span class="chip ${dept.cls}"><span class="mono-dot">${dept.initial}</span>${dept.label}</span></div>
      <table class="metric-table">
        <tr><th>Metric</th><th>Goal</th><th>This week</th><th>Status</th><th>Last updated</th><th>Calc</th></tr>
        ${rows}
      </table>
    </div>`;
  }).join('');
}

/* ---------------- EXECUTIVE OVERVIEW PAGE ---------------- */
function renderExecOverviewPage(){
  const container = document.getElementById('execBody');
  if(!canAccess('execoverview')){ container.innerHTML = restrictedHtml('The executive overview'); return; }
  const org = computeRollup();
  const deptRows = DEPT_KEYS.map(key=>{
    const dept = DEPTS[key];
    const r = computeRollup(key);
    const hist = pseudoHistory(key+'trend', 8, r.tracked ? Math.max(40,r.perfRate) : 60);
    const pillClass = r.perfRate>=80?'good':(r.perfRate>=60?'watch':'bad');
    return `<tr>
      <td><span class="chip ${dept.cls}"><span class="mono-dot">${dept.initial}</span>${dept.label}</span></td>
      <td class="mono">${r.tracked}</td><td class="mono">${r.meeting}</td><td class="mono">${r.watch+r.behind}</td><td class="mono">${r.notStarted}</td>
      <td><span class="status-pill ${pillClass}">${r.perfRate}%</span></td>
      <td><div class="sparkline mini">${hist.map(v=>`<div class="spark-bar" style="height:${v}%"></div>`).join('')}</div></td>
    </tr>`;
  }).join('');
  const recent = [...state.records].sort((a,b)=>b.ts-a.ts).slice(0,6).map(r=>{
    const dept = DEPTS[r.dept];
    const val = typeof r.value==='string' && r.value.length>40 ? r.value.slice(0,40)+'…' : r.value;
    return `<div class="ledger-row">
      <div class="ledger-time">${fmtTime(r.ts)}</div>
      <div class="chip ${dept.cls}" style="padding:2px 8px 2px 4px;"><span class="mono-dot" style="width:14px;height:14px;font-size:8px;">${dept.initial}</span>${dept.label}</div>
      <div>${r.label}</div>
      <div class="mono" style="color:var(--ink-soft);">${val}</div>
    </div>`;
  }).join('') || `<div class="ledger-empty">No records yet.</div>`;

  container.innerHTML = `
    <p class="section-desc">Agency-wide rollup, calculated live from every department's submitted records. Only the Owner / Admin role sees this view.</p>
    <div class="summary-grid">
      <div class="summary-card"><div class="v">${org.tracked}</div><div class="l">Metrics tracked</div></div>
      <div class="summary-card accent"><div class="v">${org.meeting}</div><div class="l">Meeting target</div></div>
      <div class="summary-card"><div class="v">${org.watch+org.behind}</div><div class="l">Needs attention</div></div>
      <div class="summary-card"><div class="v">${org.notStarted}</div><div class="l">Not started</div></div>
      <div class="summary-card"><div class="v">${org.perfRate}%</div><div class="l">Overall performance rate</div></div>
    </div>
    <div class="card card-pad" style="margin-bottom:20px;">
      <h3 class="section-title">Department comparison</h3>
      <p class="section-desc">Performance rate = metrics meeting target ÷ metrics that have at least one submission.</p>
      <table class="comparison-table">
        <tr><th>Department</th><th>Tracked</th><th>Meeting</th><th>Needs attention</th><th>Not started</th><th>Performance</th><th>8-week trend</th></tr>
        ${deptRows}
      </table>
    </div>
    <div class="card card-pad" style="margin-bottom:20px;">
      <h3 class="section-title">Recent activity — all departments</h3>
      <p class="section-desc">Live feed of the most recent records across every team.</p>
      ${recent}
    </div>
    <div class="card card-pad">
      <h3 class="section-title">How these numbers are calculated</h3>
      <p class="section-desc" style="margin-bottom:0;">Every metric is either <strong>Higher is better</strong> or <strong>Lower is better</strong> against a goal set in the KPI schema. A metric is <em>Meeting target</em> once its latest submitted value crosses the goal, <em>Watch</em> within roughly 10–15% of it, and <em>Behind</em> beyond that. Performance rate excludes metrics with no submissions yet. See the <a href="analytics.html" style="color:var(--clinical); font-weight:600;">Analytics</a> page for trends over time, or open <strong>ƒ</strong> on the Live Dashboard for any single metric's formula.</p>
    </div>
  `;
}

/* ---------------- ANALYTICS PAGE ---------------- */
function renderAnalyticsPage(){
  const container = document.getElementById('analyticsBody');
  if(!canAccess('analytics')){ container.innerHTML = restrictedHtml('Analytics'); return; }

  const filterVal = (document.getElementById('deptFilter') || {}).value || 'all';
  const depts = filterVal==='all' ? DEPT_KEYS : [filterVal];

  // at-risk metrics
  let riskItems = [];
  depts.forEach(key=>{
    DEPTS[key].metrics.forEach(m=>{
      const latest = latestFor(key, m.id);
      const s = latest? statusFor(m, latest.value) : 'neutral';
      if(s==='watch' || s==='bad'){
        riskItems.push({dept:key, m, latest, s});
      }
    });
  });
  riskItems.sort((a,b)=> (a.s==='bad'?0:1) - (b.s==='bad'?0:1));
  const riskHtml = riskItems.length ? riskItems.map(({dept,m,latest,s})=>{
    const d = DEPTS[dept];
    return `<div class="risk-row">
      <span class="chip ${d.cls}"><span class="mono-dot">${d.initial}</span>${d.label}</span>
      <div>${m.name}</div>
      <div class="mono">${latest.value}${m.unit}</div>
      <div><span class="status-pill ${s}">${statusLabel(s)}</span></div>
      <div><button class="calc-btn" onclick="showCalc('${dept}','${m.id}')">ƒ</button></div>
    </div>`;
  }).join('') : `<div class="ledger-empty">Nothing at risk right now — every submitted metric in this view is on track.</div>`;

  // trend explorer
  const trendCards = [];
  depts.forEach(key=>{
    DEPTS[key].metrics.forEach(m=>{
      const d = DEPTS[key];
      const hist = pseudoHistory(key+m.id, 10, m.dir==='higher' ? Math.min(95,m.goal) : 100-Math.min(80,m.goal));
      const delta = hist[hist.length-1] - hist[0];
      const deltaCls = delta>2?'up':(delta<-2?'down':'flat');
      const deltaLabel = delta>0? `+${delta} pts` : (delta<0? `${delta} pts` : 'flat');
      trendCards.push(`<div class="trend-card">
        <div class="th-row">
          <div>
            <span class="chip ${d.cls}" style="margin-bottom:6px;"><span class="mono-dot">${d.initial}</span>${d.label}</span>
            <div style="font-size:13.5px; font-weight:600; margin-top:8px;">${m.name}</div>
          </div>
          <span class="delta ${deltaCls}">${deltaLabel} / 10wk</span>
        </div>
        <div class="sparkline big">${hist.map(v=>{
          const cls = v>=70?'':(v>=50?'watch':'bad');
          return `<div class="spark-bar ${cls}" style="height:${v}%"></div>`;
        }).join('')}</div>
      </div>`);
    });
  });

  // department 12-week comparison
  const deptTrendRows = DEPT_KEYS.map(key=>{
    const d = DEPTS[key];
    const r = computeRollup(key);
    const hist = pseudoHistory(key+'longtrend', 12, r.tracked? Math.max(40,r.perfRate): 60);
    return `<tr>
      <td><span class="chip ${d.cls}"><span class="mono-dot">${d.initial}</span>${d.label}</span></td>
      <td><div class="sparkline big" style="width:100%;">${hist.map(v=>`<div class="spark-bar" style="height:${v}%"></div>`).join('')}</div></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <p class="section-desc">Trend analysis across submitted KPIs — filter by department, spot what's slipping, and see the trajectory behind every number.</p>

    <div class="filter-row">
      <label for="deptFilter">Department</label>
      <select id="deptFilter" onchange="renderAnalyticsPage()">
        <option value="all" ${filterVal==='all'?'selected':''}>All departments</option>
        ${DEPT_KEYS.map(k=>`<option value="${k}" ${filterVal===k?'selected':''}>${DEPTS[k].label}</option>`).join('')}
      </select>
    </div>

    <div class="card card-pad" style="margin-bottom:20px;">
      <h3 class="section-title">At-risk metrics</h3>
      <p class="section-desc">Everything currently in Watch or Behind status, worst first.</p>
      ${riskHtml}
    </div>

    <div class="card card-pad" style="margin-bottom:20px;">
      <h3 class="section-title">Trend explorer</h3>
      <p class="section-desc">Simulated 10-week trend per metric — green bars are on-track weeks, amber and red flag dips below threshold.</p>
      <div class="trend-grid">${trendCards.join('')}</div>
    </div>

    <div class="card card-pad">
      <h3 class="section-title">Department performance — 12-week view</h3>
      <p class="section-desc">Simulated performance-rate trend per department, for spotting sustained drift vs. a one-off bad week.</p>
      <table class="comparison-table">
        <tr><th style="width:220px;">Department</th><th>Trend</th></tr>
        ${deptTrendRows}
      </table>
    </div>
  `;
}

/* ---------------- TEAM & PERMISSIONS PAGE ---------------- */
const MEMBERS = [
  {name:'J. Alvarez', role:'clinical', last:'2 hours ago'},
  {name:'R. Bennett', role:'marketing', last:'40 min ago'},
  {name:'S. Cho', role:'agency', last:'Yesterday'},
  {name:'D. Farooqi', role:'intake', last:'3 hours ago'},
  {name:'Owner account', role:'owner', last:'Just now'}
];
const PAGE_LABELS = [
  ['entry.html','Enter data'],['dashboard.html','Live dashboard'],['analytics.html','Analytics'],
  ['execoverview.html','Executive overview'],['deck.html','Leadership deck'],['audit.html','Audit & admin']
];
function renderTeamPage(){
  const container = document.getElementById('teamBody');
  if(!canAccess('team')){ container.innerHTML = restrictedHtml('Team & permissions'); return; }

  const roleCards = Object.keys(DEPTS).map(key=>{
    const d = DEPTS[key];
    const canSee = key==='owner'
      ? 'Every page — entry, dashboard, analytics, executive overview, leadership deck, audit trail'
      : 'Only the "Enter this week\'s data" page, scoped to ' + d.label;
    const canSubmit = d.metrics.length ? d.metrics.map(m=>m.name).join(', ') : d.narrative.map(n=>n.label).join(', ');
    return `<div class="role-card">
      <div class="rc-head"><span class="chip ${d.cls}"><span class="mono-dot">${d.initial}</span>${d.label}</span></div>
      <ul>
        <li><strong>Can submit:</strong> ${canSubmit}</li>
        <li><strong>Can see:</strong> ${canSee}</li>
      </ul>
    </div>`;
  }).join('');

  const matrixRows = PAGE_LABELS.map(([href,label])=>{
    const cells = Object.keys(DEPTS).map(key=>{
      const pageKey = href.replace('.html','');
      const allowed = pageKey==='entry' ? true : key==='owner';
      return `<td class="${allowed?'matrix-yes':'matrix-no'}">${allowed?'✓':'—'}</td>`;
    }).join('');
    return `<tr><td><a href="${href}" style="color:var(--ink); text-decoration:none;">${label}</a></td>${cells}</tr>`;
  }).join('');

  const memberRows = MEMBERS.map((mem,i)=>{
    const d = DEPTS[mem.role];
    return `<div class="member-row">
      <div>${mem.name}</div>
      <div class="chip ${d.cls}"><span class="mono-dot">${d.initial}</span>${d.label}</div>
      <div style="color:var(--ink-faint); font-size:12px;">${mem.last}</div>
      <select onchange="showToast('${mem.name} role updated to ' + this.options[this.selectedIndex].text + ' (demo only, not saved).')">
        ${Object.keys(DEPTS).map(k=>`<option value="${k}" ${k===mem.role?'selected':''}>${DEPTS[k].label}</option>`).join('')}
      </select>
    </div>`;
  }).join('');

  container.innerHTML = `
    <p class="section-desc">Every login belongs to exactly one role. Department roles are scoped to their own data entry; only Owner / Admin sees agency-wide numbers.</p>

    ${roleCards}

    <div class="card card-pad" style="margin:20px 0;">
      <h3 class="section-title">Page access matrix</h3>
      <p class="section-desc">What each role can open.</p>
      <table class="matrix-table">
        <tr><th>Page</th>${Object.keys(DEPTS).map(k=>`<th>${DEPTS[k].label}</th>`).join('')}</tr>
        ${matrixRows}
      </table>
    </div>

    <div class="card card-pad">
      <h3 class="section-title">Team members</h3>
      <p class="section-desc">Illustrative only — changing a role here doesn't persist.</p>
      ${memberRows}
    </div>
  `;
}

/* ---------------- DECK PAGE ---------------- */
let deckIndex = 0;
function buildSlides(){
  const today = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const slides = [
    { title:'Orion Home Health — Leadership Meeting', sub:`Week of ${today} · auto-generated from live records`, kpis:[], note:"This deck was assembled automatically from this week's submitted records — no manual copy-paste from a workbook." }
  ];
  DEPT_KEYS.forEach(key=>{
    const dept = DEPTS[key];
    const kpis = dept.metrics.slice(0,3).map(m=>{
      const latest = latestFor(key,m.id);
      return {v: latest? latest.value+m.unit : '—', l:m.name};
    });
    const wentWell = latestFor(key, dept.narrative[0] ? dept.narrative[0].id : '');
    slides.push({
      title: dept.label + ' Report',
      sub: 'Auto-populated from ' + dept.label + ' records',
      kpis,
      note: wentWell ? ('"' + wentWell.value + '"') : 'No narrative submitted yet for this department.'
    });
  });
  return slides;
}
function renderDeckPage(){
  const stage = document.getElementById('deckStage');
  if(!canAccess('deck')){
    stage.style.background = '#fff'; stage.style.color = 'var(--ink)'; stage.style.aspectRatio = 'auto'; stage.style.padding = '0';
    stage.innerHTML = restrictedHtml('The leadership deck');
    document.getElementById('deckDots').innerHTML = '';
    return;
  }
  stage.style.background = ''; stage.style.color = ''; stage.style.aspectRatio = ''; stage.style.padding = '';
  const slides = buildSlides();
  const s = slides[deckIndex];
  stage.innerHTML = `
    <div class="slide-label">SLIDE ${deckIndex+1} OF ${slides.length}</div>
    <h2>${s.title}</h2>
    <div class="deck-sub">${s.sub}</div>
    ${s.kpis.length? `<div class="deck-kpis">${s.kpis.map(k=>`<div class="deck-kpi"><div class="v">${k.v}</div><div class="l">${k.l}</div></div>`).join('')}</div>` : ''}
    <div class="deck-note">${s.note}</div>
  `;
  document.getElementById('deckDots').innerHTML = slides.map((_,i)=>`<div class="deck-dot ${i===deckIndex?'active':''}" onclick="deckGo(${i})"></div>`).join('');
}
function deckGo(i){ deckIndex=i; renderDeckPage(); }
function deckPrev(){ const n=buildSlides().length; deckIndex=(deckIndex-1+n)%n; renderDeckPage(); }
function deckNext(){ const n=buildSlides().length; deckIndex=(deckIndex+1)%n; renderDeckPage(); }
function generateDeck(){
  if(!canAccess('deck')){ showToast('Switch to Owner / Admin to generate the deck.'); return; }
  showToast("Generating this week's deck from current records…");
  document.getElementById('deckStage').style.opacity=.35;
  setTimeout(()=>{ document.getElementById('deckStage').style.opacity=1; deckIndex=0; renderDeckPage(); showToast('Deck generated — 5 slides ready to present.'); }, 550);
}

/* ---------------- AUDIT PAGE ---------------- */
function renderAuditPage(){
  const auditView = document.getElementById('auditContainer');
  if(!canAccess('audit')){ auditView.innerHTML = restrictedHtml('Audit & admin'); return; }
  auditView.innerHTML = `
    <div class="card lock-bar">
      <div>
        <div style="font-weight:600; font-size:13.5px;">Lock this week's data</div>
        <div style="font-size:12px; color:var(--ink-soft);">When locked, department staff can no longer submit new entries without admin override.</div>
      </div>
      <div class="toggle ${state.locked?'on':''}" id="lockToggle" onclick="toggleLock()"><div class="knob"></div></div>
    </div>
    <div class="card card-pad">
      <h3 class="section-title">Full record ledger</h3>
      <p class="section-desc">Every submission across every department, in one auditable, append-only log.</p>
      <div class="audit-row" style="font-weight:600; color:var(--ink-faint); font-size:11px; text-transform:uppercase; letter-spacing:.04em;">
        <div>Time</div><div>Department</div><div>Field</div><div>Value</div><div></div>
      </div>
      <div id="auditBody"></div>
    </div>
  `;
  const rows = [...state.records].sort((a,b)=>b.ts-a.ts);
  const el = document.getElementById('auditBody');
  let html = rows.map(r=>{
    const dept = DEPTS[r.dept];
    const val = typeof r.value==='string' && r.value.length>40 ? r.value.slice(0,40)+'…' : r.value;
    return `<div class="audit-row">
      <div class="ledger-time">${fmtTime(r.ts)}</div>
      <div class="chip ${dept.cls}" style="padding:2px 8px 2px 4px;"><span class="mono-dot" style="width:14px;height:14px;font-size:8px;">${dept.initial}</span>${dept.label}</div>
      <div>${r.label}</div>
      <div class="mono" style="color:var(--ink-soft);">${val}</div>
      <div style="font-size:11px; color:var(--ink-faint);">record #${r.id}</div>
    </div>`;
  }).join('');
  html += `<div class="audit-row deleted">
    <div class="ledger-time">${fmtTime(new Date(Date.now()-3*86400000))}</div>
    <div class="chip intake" style="padding:2px 8px 2px 4px;"><span class="mono-dot" style="width:14px;height:14px;font-size:8px;">I</span>Intake</div>
    <div>Referral Acceptance Rate (superseded entry)</div>
    <div class="mono" style="color:var(--ink-soft);">76%</div>
    <div><button class="restore-btn" onclick="showToast('Restored — record #0 is back in the ledger, marked as reinstated.')">Restore</button></div>
  </div>`;
  el.innerHTML = html || `<div class="ledger-empty">No records yet.</div>`;
}
function toggleLock(){
  state.locked = !state.locked;
  saveState();
  document.getElementById('lockToggle').classList.toggle('on', state.locked);
  showToast(state.locked? 'This week is now locked for all departments.' : 'This week has been unlocked.');
}
