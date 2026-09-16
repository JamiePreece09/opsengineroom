/**
 * app.js — HireEngine Main Application Module
 * Orchestrates all UI rendering, calendar views, modal workflows, and navigation.
 * Imports core business logic from dedicated modules.
 */
import { clientsRegistry, projectsRegistry, addClient, addProject, assetRegistry, addAsset, removeAssetById, updateAssetById,
 complianceRegistry, updateComplianceRecord,
 workerRegistry, getLicenseStatus, daysUntilExpiry, getWorkerById,
 bookings, addBooking, updateBooking, removeBooking, getBookingById, getAssetHex,
 HOURLY_RATES, HIRE_TYPES } from './dataModels.js';
import { ComplianceEngine } from './complianceEngine.js';
import { DispatchEngine } from './dispatchEngine.js';
import { initDragAndDrop } from './dndEngine.js';
import { pushToDocuWare, generateSWMSPayload, generatePreStartPayload, generateFieldDocketPayload, getDocPipelineStatus } from './documentAutomation.js';

let ASSET_HEX = { Urgent: '#dc2626', Invoiced: '#10b981', Scheduled: '#3b82f6', Other: '#64748b' };
let validAssets = [];
let currentDate = new Date();
let currentView = 'Day';

function isWorkerDoubleBooked(b) {
    if (!b) return false;
    const workerName = b.wetHireResources?.[0]?.workerName || b.operatorName;
    if (!workerName) return false;
    
    const start = new Date(b.startTime).getTime();
    const end = new Date(b.endTime).getTime();
    
    for (const other of bookings) {
        if (other.id === b.id) continue;
        if (other.status === 'Completed' || other.status === 'Invoiced') continue;
        
        const otherWorker = other.wetHireResources?.[0]?.workerName || other.operatorName;
        if (otherWorker === workerName) {
            const os = new Date(other.startTime).getTime();
            const oe = new Date(other.endTime).getTime();
            if (start < oe && end > os) return true;
        }
    }
    return false;
}

let currentMinHour = 6;
let displayHoursStart = 7;
let displayHoursEnd = 19;
let activeAssetFilters = new Set();
let isDragging = false;
let dragBookingId = null;
let dragClone = null;
let dragOffsetY = 0;
let isPainting = false;
let paintStartHour = null;
let paintAsset = null;
let paintEl = null;
let paintCol = null;
let utilizationChartInst = null;
let statusChartInst = null;
let liveTimeTimer = null;
let dragGhost = null;
let dayTransposed = false;
let weekTransposed = false;
let _resizeId = null, _resizeStartY = 0, _resizeStartH = 0;
let _activeDWBookingId = null;
let currentCertAssetId = null;
let _pendingDeleteAssetId = null;



function isComplianceLocked(assetId) {
  return ComplianceEngine.isAssetLocked(assetId);
}

function sanitizeBookingChronology(b) {
  const now = new Date();
  const startD = new Date(b.startTime);
  if (startD > now && (b.status === 'Invoiced' || b.status === 'Completed')) {
    b.status = 'Scheduled';
  }
}

function formatPercentage(value) {
  return `${Math.round(value)}%`;
}

function formatAUDCurrency(amount) {
  return `$${Math.round(amount).toLocaleString('en-AU')} AUD`;
}



const fmtTime = totalMins => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};


function showToast(message, type = 'info', title = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let defaultTitle = '';
  if (!title) {
    if (type === 'success') defaultTitle = 'Success';
    else if (type === 'error') defaultTitle = 'Compliance Block';
    else if (type === 'warning') defaultTitle = 'Warning';
    else defaultTitle = 'Information';
  }
  const displayTitle = title || defaultTitle;
  toast.innerHTML = `
    <div class="toast-title">${displayTitle}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
function switchTab(tab) {
  const viewMap = {
    'calendar': 'calendar-view',
    'job-board': 'job-board-view',
    'analytics': 'analytics-view',
    'operator': 'operator-view',
    'compliance': 'compliance-view',
    'settings': 'settings-view'
  };
  const navMap = {
     'calendar': 'nav-calendar',
    'job-board': 'nav-job-board',
    'analytics': 'nav-analytics',
    'operator': 'nav-operator',
    'compliance': 'nav-compliance',
    'settings': 'nav-settings'
  };
  document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const viewId = viewMap[tab] || 'calendar-view';
  const navId = navMap[tab] || 'nav-calendar';
  const viewEl = document.getElementById(viewId);
  const navEl = document.getElementById(navId);
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (tab === 'job-board') renderJobBoard();
  else if (tab === 'analytics') renderAnalytics();
  else if (tab === 'operator') renderOperatorPortal();
  else if (tab === 'compliance') renderComplianceView();
  else if (tab === 'calendar') renderCalendar();
}

function getBookingColor(b){
 // Layer 1 (Block Background): Inherits asset column color so dispatcher instantly identifies asset!
 const assetObj = assetRegistry.find(a => a.id === b.assetNumber);
 return assetObj ? assetObj.hex : (ASSET_HEX[b.assetNumber] || '#475569');
}

/* Layer 2: Granular DocuWare Pipeline Status Pill Generator */
function renderDocuWarePill(b){
 const now = new Date();
 const startD = new Date(b.startTime);
 
 // Future Lock Rule: Future bookings cannot carry Invoiced or Completed states!
 if(startD > now && (b.status === 'Invoiced' || b.status === 'Completed')){
  b.status = 'Scheduled';
 }

 let pillCls = 'draft';
 let pillText = 'Scheduled / Draft';

 if(b.status === 'Invoiced'){
  pillCls = 'archived';
  pillText = 'Invoiced & Archived';
 } else if(b.status === 'Completed' && b.docketUploaded){
  pillCls = 'verified';
  pillText = 'Docket Verified';
 } else if(b.status === 'Completed' && !b.docketUploaded){
  pillCls = 'missing';
  pillText = 'Missing Docket';
 } else if(b.status === 'On-Site'){
  pillCls = 'onsite';
  pillText = 'On-Site';
 } else if(b.contractSigned || b.status === 'Dispatched'){
  pillCls = 'secured';
  pillText = 'Contract Secured';
 }

 return `<span class="card-dw-pill ${pillCls}">${pillText}</span>`;
}

function hasOverlap(asset,start,end,excludeId){
 const s=new Date(start),e=new Date(end);
 return bookings.some(b=>b.id!==excludeId&&b.assetNumber===asset&&new Date(b.startTime)<e&&new Date(b.endTime)>s);
}

// ── Custom Calendar Picker ────────────────────────────────────────────────
let cdpDate=new Date();

function openDatePicker(){
 const popup=document.getElementById('cdp-popup');
 const btn=document.getElementById('date-toggle-btn');
 if(!popup||!btn)return;
 if(popup.classList.contains('open')){closeDatePicker();return;}
 cdpDate=new Date(currentDate);
 cdpRender();
 const rect=btn.getBoundingClientRect();
 popup.style.top=(rect.bottom+8)+'px';
 popup.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-300))+'px';
 popup.classList.add('open');
 setTimeout(()=>document.addEventListener('click',cdpOutside),10);
}

function closeDatePicker(){
 const p=document.getElementById('cdp-popup');
 if(p)p.classList.remove('open');
 document.removeEventListener('click',cdpOutside);
}

function cdpOutside(e){
 const p=document.getElementById('cdp-popup');
 if(p&&!p.contains(e.target))closeDatePicker();
}

function cdpRender(){
 const p=document.getElementById('cdp-popup');
 if(!p)return;
 currentView==='Month'?cdpRenderMonths(p):cdpRenderDays(p);
}

function cdpRenderDays(popup){
 const today=new Date();
 const y=cdpDate.getFullYear(),m=cdpDate.getMonth();
 const firstDow=new Date(y,m,1).getDay();
 const blanks=firstDow===0?6:firstDow-1;
 const dim=new Date(y,m+1,0).getDate();
 let wS=null,wE=null;
 if(currentView==='Week'||currentView==='Work Week'){
  const dow=currentDate.getDay();
  wS=new Date(currentDate);wS.setDate(currentDate.getDate()-(dow===0?6:dow-1));wS.setHours(0,0,0,0);
  wE=new Date(wS);wE.setDate(wS.getDate()+(currentView==='Work Week'?4:6));wE.setHours(23,59,59,999);
 }
 const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
 let html=`<div class="cdp-header">
  <button class="cdp-nav-btn" onclick="cdpNav(-1);event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
  <div class="cdp-header-label"><span class="cdp-month-name">${MN[m]}</span><span class="cdp-year">${y}</span></div>
  <button class="cdp-nav-btn" onclick="cdpNav(1);event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
 </div>
 <div class="cdp-day-names"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
 <div class="cdp-days">`;
 for(let i=0;i<blanks;i++)html+=`<div class="cdp-cell cdp-empty"></div>`;
 for(let d=1;d<=dim;d++){
  const cell=new Date(y,m,d);
  const isToday=cell.toDateString()===today.toDateString();
  const isSel=currentView==='Day'&&cell.toDateString()===currentDate.toDateString();
  const t=new Date(y,m,d,12);
  const inRange=wS&&wE&&t>=wS&&t<=wE;
  const isRS=wS&&cell.toDateString()===wS.toDateString();
  const isRE=wE&&cell.toDateString()===wE.toDateString();
  const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  let cls='cdp-cell';
  if(isToday&&!isSel&&!inRange)cls+=' cdp-today';
  if(isSel)cls+=' cdp-selected';
  if(inRange)cls+=' cdp-range';
  if(isRS)cls+=' cdp-range-start';
  if(isRE)cls+=' cdp-range-end';
  html+=`<div class="${cls}" onclick="cdpPickDay('${ds}');event.stopPropagation()">${d}</div>`;
 }
 html+=`</div>`;
 if(currentView==='Week'||currentView==='Work Week')
  html+=`<div class="cdp-footer">Click any day to jump to that week</div>`;
 popup.innerHTML=html;
}

function cdpRenderMonths(popup){
 const y=cdpDate.getFullYear();
 const curM=currentDate.getMonth(),curY=currentDate.getFullYear();
 const nowM=new Date().getMonth(),nowY=new Date().getFullYear();
 const MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 let html=`<div class="cdp-header">
  <button class="cdp-nav-btn" onclick="cdpNavYear(-1);event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
  <div class="cdp-header-label"><span class="cdp-month-name">${y}</span></div>
  <button class="cdp-nav-btn" onclick="cdpNavYear(1);event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
 </div><div class="cdp-month-grid">`;
 MS.forEach((name,i)=>{
  const isSel=i===curM&&y===curY;
  const isNow=i===nowM&&y===nowY;
  const cls='cdp-month-cell'+(isSel?' cdp-selected':(isNow?' cdp-today':''));
  html+=`<div class="${cls}" onclick="cdpPickMonth(${y},${i});event.stopPropagation()">${name}</div>`;
 });
 html+=`</div>`;
 popup.innerHTML=html;
}

function cdpNav(d){cdpDate.setMonth(cdpDate.getMonth()+d);cdpRender();}
function cdpNavYear(d){cdpDate.setFullYear(cdpDate.getFullYear()+d);cdpRender();}
function cdpPickDay(ds){currentDate=new Date(ds+'T12:00:00');renderCalendar();closeDatePicker();}
function cdpPickMonth(y,m){currentDate=new Date(y,m,1);renderCalendar();closeDatePicker();}

function goToToday(){currentDate=new Date();renderCalendar();}

function changeDate(dir){
 if(currentView==='Day')currentDate.setDate(currentDate.getDate()+dir);
 else if(currentView==='Week'||currentView==='Work Week')currentDate.setDate(currentDate.getDate()+(dir*7));
 else if(currentView==='Month')currentDate.setMonth(currentDate.getMonth()+dir);
 renderCalendar();
}

function setCalendarView(view){
 currentView=view;
 const selectBox = document.getElementById('calendar-view-select');
 if(selectBox && selectBox.value !== view) selectBox.value = view;
 
 document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===view));
 const filterBar=document.getElementById('asset-filter-bar');
 if(filterBar) filterBar.style.display=(view==='Day')?'none':'flex';
 const hoursCtrl=document.getElementById('display-hours-control');
 if(hoursCtrl)hoursCtrl.style.display=(view==='Month')?'none':'flex';
 // Show toggle for Day, Week, Work Week — hide for Month
 const transposeBtn=document.getElementById('day-transpose-btn');
 if(transposeBtn){
  const show=(view==='Day'||view==='Week'||view==='Work Week');
  transposeBtn.style.display=show?'flex':'none';
  if(show)updateTransposeLabel();
 }
 renderCalendar();
}

function updateTransposeLabel(){
 const btn=document.getElementById('day-transpose-btn');
 const label=document.getElementById('transpose-label');
 if(!btn||!label)return;
 if(currentView==='Day'){
  // Default=Time View(col); transposed=Asset View(rows)
  btn.classList.toggle('active',dayTransposed);
  label.textContent=dayTransposed?'Time View':'Asset View';
 } else {
  // Week/Work Week: default=Asset View(Gantt); transposed=Time View(vertical)
  btn.classList.toggle('active',weekTransposed);
  label.textContent=weekTransposed?'Asset View':'Time View';
 }
}

function toggleDayTranspose(){
 if(currentView==='Day') dayTransposed=!dayTransposed;
 else weekTransposed=!weekTransposed;
 updateTransposeLabel();
 renderCalendar();
}

function toggleAssetFilter(asset){
 if(activeAssetFilters.has(asset))activeAssetFilters.delete(asset);
 else activeAssetFilters.add(asset);
 renderFilterBar();
 renderCalendar();
}

function clearAssetFilter(){activeAssetFilters.clear();renderFilterBar();renderCalendar();}

/* ── ASSET REGISTRY SYNC ── */
function syncAssets(){
 validAssets=assetRegistry.map(a=>a.id);
 assetRegistry.forEach(a=>{ASSET_HEX[a.id]=a.hex;});
 renderFilterBar();
 rebuildBookingAssetSelect();
}

function renderFilterBar(){
 const bar=document.getElementById('asset-filter-bar');
 if(!bar)return;
 let html=`<span class="filter-label">Filter:</span><button class="asset-chip-all" onclick="clearAssetFilter()">All Assets</button>`;
 assetRegistry.forEach(a=>{
  let cls='asset-chip';
  if(activeAssetFilters.size>0)cls+=activeAssetFilters.has(a.id)?' active':' inactive';
  html+=`<span class="${cls}" data-asset="${a.id}" onclick="toggleAssetFilter('${a.id}')" style="background:${a.hex};">${a.id}</span>`;
 });
 bar.innerHTML=html;
}

function rebuildBookingAssetSelect(){
 const sel=document.getElementById('booking-asset');
 if(!sel)return;
 const cur=sel.value;
 sel.innerHTML=assetRegistry.map(a=>`<option value="${a.id}"${a.id===cur?' selected':''}>${a.id} – ${a.description}</option>`).join('');
}

/* ── ASSET MANAGER (Settings) ── */
let _pendingDeleteIdx=null;

function renderAssetManager(){
 const el=document.getElementById('asset-manager-list');
 if(!el)return;
 el.innerHTML=assetRegistry.map((a,i)=>{
  const confirming=(_pendingDeleteIdx===i);
  return `
  <div class="am-row" id="am-row-${i}">
   <span class="am-swatch" style="background:${a.hex};"></span>
   <span class="am-id-tag">${a.id}</span>
   <input class="am-input" type="text" value="${a.description}" onchange="updateAssetDesc(${i},this.value)" placeholder="Description">
   <div class="am-color-wrap">
    <input type="color" value="${a.hex}" oninput="updateAssetHex(${i},this.value,this)" class="am-color-picker" title="Pick colour">
    <input type="text" value="${a.hex}" onchange="updateAssetHexText(${i},this.value,this)" class="am-hex-text" maxlength="7" placeholder="#000000">
   </div>
   ${confirming
    ? `<div class="am-confirm-wrap"><span class="am-confirm-label">Remove?</span><button class="am-confirm-yes" onclick="confirmDeleteAsset(${i})">Yes</button><button class="am-confirm-no" onclick="cancelDeleteAsset()">No</button></div>`
    : `<button class="am-delete-btn" onclick="promptDeleteAsset(${i})" title="Remove asset">✕</button>`
   }
  </div>`;
 }).join('');
}

function updateAssetDesc(i,val){assetRegistry[i].description=val.trim();syncAssets();}

function updateAssetHex(i,val,el){
 assetRegistry[i].hex=val;
 const row=el.closest('.am-row');
 if(row){row.querySelector('.am-hex-text').value=val;row.querySelector('.am-swatch').style.background=val;}
 syncAssets();renderCalendar();
}

function updateAssetHexText(i,val,el){
 if(!/^#[0-9a-fA-F]{6}$/.test(val))return;
 assetRegistry[i].hex=val;
 const row=el.closest('.am-row');
 if(row){row.querySelector('.am-color-picker').value=val;row.querySelector('.am-swatch').style.background=val;}
 syncAssets();renderCalendar();
}

function promptDeleteAsset(i){
 _pendingDeleteIdx=i;
 renderAssetManager();
}

function cancelDeleteAsset(){
 _pendingDeleteIdx=null;
 renderAssetManager();
}

function confirmDeleteAsset(i){
 _pendingDeleteIdx=null;
 assetRegistry.splice(i,1);syncAssets();renderAssetManager();renderCalendar();
}

function _addNewAssetFromForm(){
 const id=(document.getElementById('new-asset-id').value||'').trim().toUpperCase();
 const desc=(document.getElementById('new-asset-desc').value||'').trim();
 const hex=document.getElementById('new-asset-hex-color').value||'#888888';
 if(!id){showToast('Asset ID is required.');return;}
 if(assetRegistry.find(a=>a.id===id)){showToast(`Asset ${id} already exists.`);return;}
 assetRegistry.push({id,description:desc||id,hex});
 document.getElementById('new-asset-id').value='';
 document.getElementById('new-asset-desc').value='';
 document.getElementById('new-asset-hex-color').value='#888888';
 syncAssets();renderAssetManager();renderCalendar();
}

function getFilteredBookings(){
 if(activeAssetFilters.size===0)return bookings;
 return bookings.filter(b=>activeAssetFilters.has(b.assetNumber));
}

/* MODAL */

window.toggleClientType = function() {
  const isNew = document.querySelector('input[name="client_type"]:checked').value === 'new';
  document.getElementById('existing-client-section').style.display = isNew ? 'none' : 'block';
  document.getElementById('new-client-section').style.display = isNew ? 'block' : 'none';
};

window.loadClientProjects = function(clientId) {
  const projSelect = document.getElementById('booking-project-select');
  projSelect.innerHTML = '<option value="">-- Select Project / Site --</option><option value="NEW">+ Create New Project</option>';
  if(!clientId) return;
  const projects = projectsRegistry.filter(p => p.clientId === clientId);
  projects.forEach(p => {
    projSelect.innerHTML += `<option value="${p.id}">${p.name} - ${p.address}</option>`;
  });
};

window.populateProjectDefaults = function() {
  const projId = document.getElementById('booking-project-select').value;
  if(projId && projId !== 'NEW') {
    const p = projectsRegistry.find(x => x.id === projId);
    if(p) {
      document.getElementById('booking-address').value = p.address || '';
      document.getElementById('booking-site-contact').value = p.contact || '';
    }
  } else {
    document.getElementById('booking-address').value = '';
    document.getElementById('booking-site-contact').value = '';
  }
};

window.toggleInspection = function() {
  const isReq = document.getElementById('inspection-required').checked;
  document.getElementById('inspection-date-group').style.display = isReq ? 'block' : 'none';
};

function openModal(asset, startH, endH, dateStr) {
  document.getElementById('booking-id').value = '';
  document.getElementById('modal-title').textContent = 'New Booking / Enquiry';
  
  // Hydrate client dropdown
  const cSelect = document.getElementById('booking-client-select');
  cSelect.innerHTML = '<option value="">-- Search or Select Client --</option>' + 
    clientsRegistry.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  // Reset radios
  document.querySelector('input[name="client_type"][value="existing"]').checked = true;
  toggleClientType();
  loadClientProjects('');
  
  document.getElementById('new-client-name').value = '';
  document.getElementById('new-client-phone').value = '';
  document.getElementById('new-client-email').value = '';
  document.getElementById('booking-address').value = '';
  document.getElementById('booking-site-contact').value = '';
  document.getElementById('booking-desc').value = '';
  
  document.getElementById('inspection-required').checked = false;
  toggleInspection();
  document.getElementById('inspection-date').value = '';

  const refDate = dateStr ? new Date(dateStr) : new Date(currentDate);
  document.getElementById('booking-date').value = refDate.toISOString().slice(0,10);
  document.getElementById('booking-start').value = startH || '08:00';
  document.getElementById('booking-end').value = endH || '09:00';
  
  // Rate Review default (+6 months)
  const rrDate = new Date();
  rrDate.setMonth(rrDate.getMonth() + 6);
  document.getElementById('rate-review-date').value = rrDate.toISOString().slice(0,10);

  // Asset hydration
  const assetSelect = document.getElementById('booking-asset');
  assetSelect.innerHTML = assetRegistry.map(a => `<option value="${a.id}">${a.id} - ${a.type}</option>`).join('');
  document.getElementById('booking-asset').value = asset || 'EX01';

  document.getElementById('booking-status').value = 'Scheduled';

  // Workers
  const opSelect = document.getElementById('booking-wet-operator');
  const dgSelect = document.getElementById('booking-wet-dogman');
  if(opSelect && dgSelect) {
    opSelect.innerHTML = '<option value="">-- Auto-Allocate or Select --</option>' + workerRegistry.filter(w => w.role.includes('Operator')).map(w => `<option value="${w.id}">${w.name} (${w.status})</option>`).join('');
    dgSelect.innerHTML = '<option value="">-- Auto-Allocate or Select --</option>' + workerRegistry.filter(w => w.role.includes('Dogman') || w.role.includes('Rigger')).map(w => `<option value="${w.id}">${w.name} (${w.status})</option>`).join('');
  }
  
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('booking-modal').style.display = 'flex';
}


function editBooking(id){
 const b=bookings.find(x=>x.id===id);if(!b)return;
 document.getElementById('booking-id').value=b.id;
 document.getElementById('modal-title').textContent='Edit Booking';
 document.getElementById('booking-asset').value=b.assetNumber;
 document.getElementById('booking-status').value=b.status||'Scheduled';
 document.getElementById('booking-client').value=b.clientName;
 document.getElementById('booking-operator').value=b.operatorName||'';
 document.getElementById('booking-desc').value=b.jobDescription||'';
 const s=new Date(b.startTime),e=new Date(b.endTime);
 document.getElementById('booking-date').value=s.toISOString().slice(0,10);
 document.getElementById('booking-start').value=`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`;
 document.getElementById('booking-end').value=`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;
 document.getElementById('delete-btn').style.display='inline-flex';
 
  // Populate worker selects
  const opSelect = document.getElementById('booking-wet-operator');
  const dgSelect = document.getElementById('booking-wet-dogman');
  if(opSelect && dgSelect) {
    opSelect.innerHTML = '<option value="">-- Select Operator --</option>' + workerRegistry.filter(w => w.role === 'Crane Operator' || w.role === 'Plant Operator').map(w => `<option value="${w.id}">${w.name} (${w.licenses.map(l=>l.type).join(',')})</option>`).join('');
    dgSelect.innerHTML = '<option value="">-- Select Dogman/Rigger --</option>' + workerRegistry.filter(w => w.role === 'Dogman' || w.role === 'Rigger').map(w => `<option value="${w.id}">${w.name} (${w.licenses.map(l=>l.type).join(',')})</option>`).join('');
  }

  document.getElementById('booking-modal').classList.add('open');
}

function closeModal(){document.getElementById('booking-modal').style.display='none';}

function saveBooking(){
 const id=document.getElementById('booking-id').value;
 const asset=document.getElementById('booking-asset').value;
 const status=document.getElementById('booking-status').value;
 const startStr=document.getElementById('booking-start').value;
 const endStr=document.getElementById('booking-end').value;
 const dateVal=document.getElementById('booking-date').value;
 // Use the date picker value; fall back to currentDate if somehow empty
 const refDate=dateVal?new Date(dateVal+'T00:00:00'):new Date(currentDate);
 const[sh,sm]=startStr.split(':').map(Number);
 const[eh,em]=endStr.split(':').map(Number);
 refDate.setHours(sh,sm,0,0);
 const startISO=refDate.toISOString();
 refDate.setHours(eh,em,0,0);
 const endISO=refDate.toISOString();
 if(new Date(endISO)<=new Date(startISO)){showToast('End time must be after start time.');return;}
 if(hasOverlap(asset,startISO,endISO,id||null)){showToast(`Asset ${asset} is already booked during this time.`);return;}
 const booking={
  id:id||('b'+Date.now()),assetNumber:asset,status,
  clientName:document.getElementById('booking-client').value||'Unknown Client',
  operatorName:document.getElementById('booking-operator').value||'Unassigned',
  jobDescription:document.getElementById('booking-desc').value||'',
  startTime:startISO,endTime:endISO,type:'Crane'
 };
 if(id){const i=bookings.findIndex(b=>b.id===id);if(i>=0)bookings[i]=booking;}
 else bookings.push(booking);
 closeModal();renderCalendar();
}

function deleteBooking(){
 const id=document.getElementById('booking-id').value;
 if(!id)return;
 if(!confirm('Delete this booking?'))return;
 bookings=bookings.filter(b=>b.id!==id);
 closeModal();renderCalendar();
}

function saveDocuWare(){
 document.getElementById('dw-status').textContent='● Connected';
 document.getElementById('dw-status').className='status-badge connected';
 document.getElementById('last-sync').value=new Date().toLocaleString();
 showToast('DocuWare settings saved successfully.');
}

function saveWorkHours(){
 const startVal=Number(document.getElementById('settings-work-start').value);
 const endVal=Number(document.getElementById('settings-work-end').value);
 if(endVal<=startVal){showToast('End time must be after start time.');return;}
 displayHoursStart=startVal;
 displayHoursEnd=endVal;
 // Sync the calendar toolbar selects
 const startSel=document.getElementById('display-start-hour');
 const endSel=document.getElementById('display-end-hour');
 if(startSel)startSel.value=String(startVal);
 if(endSel)endSel.value=String(endVal);
 renderCalendar();
 showToast('Work hours saved. Calendar updated to '+formatHourLabel(startVal)+' – '+formatHourLabel(endVal)+'.');
}

function exportReport(){showToast('Exporting BI Report as PDF... Data synchronisation complete.');}

function applyDatePreset(){
 const preset=document.getElementById('analytics-preset-filter').value;
 if(preset==='custom')return;
 const now=new Date();
 let start=new Date(now),end=new Date(now);
 if(preset==='today'){start.setHours(0,0,0,0);end.setHours(23,59,59,999);}
 else if(preset==='this_week'){const d=now.getDay()||7;start.setDate(now.getDate()-d+1);end=new Date(start);end.setDate(start.getDate()+6);}
 else if(preset==='next_week'){const d=now.getDay()||7;start.setDate(now.getDate()-d+8);end=new Date(start);end.setDate(start.getDate()+6);}
 else if(preset==='this_month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,0);}
 else{start=new Date(0);end=new Date(9999,0,1);}
 document.getElementById('analytics-start-date').value=start.toISOString().slice(0,10);
 document.getElementById('analytics-end-date').value=end.toISOString().slice(0,10);
 renderAnalytics();
}

/* ── PHASE 6: EXECUTIVE DASHBOARD & SYSTEM TELEMETRY ── */
function renderAnalytics(){
 const startInput=document.getElementById('analytics-start-date');
 const endInput=document.getElementById('analytics-end-date');
 if(!startInput||!endInput)return;

 if(!startInput.value||!endInput.value){
  document.getElementById('analytics-preset-filter').value='this_week';
  applyDatePreset();
  return;
 }

 const startOfDay=new Date(startInput.value);startOfDay.setHours(0,0,0,0);
 const endOfDay=new Date(endInput.value);endOfDay.setHours(23,59,59,999);
 const WORK_WEEK_HOURS=50;

 const assetData={};
 validAssets.forEach(a=>{assetData[a]={id:a,activeHours:0,idleHours:0,revenue:0,operators:new Set()};});

 const filtered=bookings.filter(b=>{const s=new Date(b.startTime);return s>=startOfDay&&s<=endOfDay;});
 const opHours={};

 let totalWip=0;
 let totalInvoiced=0;
 let docsIndexedCount=28;
 let pendingSignaturesCount=0;
 let missingDocketBookings=[];

 bookings.forEach(b=>{
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const rev=dur*rate;

  if(b.status==='Invoiced') totalInvoiced+=rev;
  else totalWip+=rev;

  if(b.status==='Scheduled' && !b.contractSigned) pendingSignaturesCount++;
  if(!b.docketUploaded && (b.status==='Docket Verification'||b.status==='On-Site')) missingDocketBookings.push(b);
 });

 filtered.forEach(b=>{
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  if(assetData[b.assetNumber]){
   assetData[b.assetNumber].activeHours+=dur;
   assetData[b.assetNumber].revenue+=dur*rate;
   if(b.operatorName)assetData[b.assetNumber].operators.add(b.operatorName);
  }
  if(b.operatorName){opHours[b.operatorName]=(opHours[b.operatorName]||0)+dur;}
 });

 validAssets.forEach(a=>{assetData[a].idleHours=Math.max(0,WORK_WEEK_HOURS-assetData[a].activeHours);});
 const arr=Object.values(assetData);

 // 1. Top-Level Telemetry Cards (DocuWare Metrics)
 const kpiIndexedEl=document.getElementById('kpi-docuware-indexed');
 const kpiSigsEl=document.getElementById('kpi-signatures-pending');
 const kpiWipEl=document.getElementById('kpi-wip-total');
 const kpiRevEl=document.getElementById('kpi-revenue-invoiced');

 if(kpiIndexedEl){
  kpiIndexedEl.innerHTML=`
   <h3>Documents Indexed Today</h3>
   <div class="kpi-value" style="font-family:'Inter',monospace;font-variant-numeric:tabular-nums;color:var(--accent-primary);">${docsIndexedCount} Docs</div>
   <div class="kpi-trend positive"> DocuWare OCR Intelligent Indexing</div>`;
 }
 if(kpiSigsEl){
  kpiSigsEl.innerHTML=`
   <h3>Signatures Pending</h3>
   <div class="kpi-value" style="font-family:'Inter',monospace;font-variant-numeric:tabular-nums;color:${pendingSignaturesCount>0?'#d97706':'#10b981'};">${pendingSignaturesCount} Contracts</div>
   <div class="kpi-trend ${pendingSignaturesCount>0?'warning':'positive'}">${pendingSignaturesCount>0?' Awaiting E-Signature':' All Agreements Signed'}</div>`;
 }
 if(kpiWipEl){
  kpiWipEl.innerHTML=`
   <h3>Total WIP (Unbilled)</h3>
   <div class="kpi-value" style="font-family:'Inter',monospace;font-variant-numeric:tabular-nums;color:#d97706;">${formatAUDCurrency(totalWip)}</div>
   <div class="kpi-trend warning">Active &amp; scheduled job pipeline</div>`;
 }
 if(kpiRevEl){
  kpiRevEl.innerHTML=`
   <h3>Revenue (Invoiced MTD)</h3>
   <div class="kpi-value" style="font-family:'Inter',monospace;font-variant-numeric:tabular-nums;color:#10b981;">${formatAUDCurrency(totalInvoiced)}</div>
   <div class="kpi-trend positive"> Verified in DocuWare Vault</div>`;
 }

 // 2. Global Alert Center (Manage by Exception)
 const alertCenterEl=document.getElementById('executive-alert-center');
 if(alertCenterEl){
  const lockedAssets=validAssets.filter(a=>complianceRegistry[a]&&complianceRegistry[a].status==='expired');
  
  let alert1=`
   <div style="background:${lockedAssets.length>0?'#FEF2F2':'rgba(5,150,105,0.06)'};border:1px solid ${lockedAssets.length>0?'rgba(220,38,38,0.3)':'rgba(5,150,105,0.3)'};padding:14px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:11px;font-weight:800;color:${lockedAssets.length>0?'#dc2626':'#10b981'};text-transform:uppercase;"> COMPLIANCE INTERLOCKS (${lockedAssets.length})</div>
    <div style="font-size:13px;font-weight:800;color:${lockedAssets.length>0?'#991b1b':'#047857'};">${lockedAssets.length>0 ? lockedAssets.join(', ') + ' — Cert Expired (LOCKED)' : ' Zero Compliance Interlocks'}</div>
    <div style="font-size:11px;color:${lockedAssets.length>0?'#b91c1c':'#065f46'};">${lockedAssets.length>0 ? 'Asset column hard locked in Command Center' : 'All 5 fleet assets cleared for dispatch'}</div>
    ${lockedAssets.length>0 ? `<button class="dw-action-btn" style="background:#dc2626;height:28px;font-size:10px;margin-top:6px;" onclick="openCertUploadModal('${lockedAssets[0]}')">Release Lock →</button>` : ''}
   </div>`;

  let alert2=`
   <div style="background:rgba(217,119,6,0.06);border:1px solid rgba(217,119,6,0.3);padding:14px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:11px;font-weight:800;color:#d97706;text-transform:uppercase;"> CREDIT EXPOSURE ALERTS</div>
    <div style="font-size:13px;font-weight:800;color:#b45309;">BuildCorp Inc. &amp; Metro Rail</div>
    <div style="font-size:11px;color:#92400e;">Accounts exceeding $10,000 credit limit threshold</div>
    <button class="dw-action-btn secondary" style="height:28px;font-size:10px;margin-top:6px;" onclick="switchTab('clients')">Manage Credit Ledger →</button>
   </div>`;

  let alert3=`
   <div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.3);padding:14px;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:11px;font-weight:800;color:#0891b2;text-transform:uppercase;">📋 STALLED FIELD DOCKETS (${missingDocketBookings.length})</div>
    <div style="font-size:13px;font-weight:800;color:#0e7490;">${missingDocketBookings[0] ? missingDocketBookings[0].clientName + ' (' + missingDocketBookings[0].assetNumber + ')' : 'No Stalled Dockets'}</div>
    <div style="font-size:11px;color:#155e75;">Awaiting OCR Indexing in Docket Verification stage</div>
    <button class="dw-action-btn" style="background:#0891b2;height:28px;font-size:10px;margin-top:6px;" onclick="switchTab('job-board')">Upload Dockets →</button>
   </div>`;

  alertCenterEl.innerHTML = alert1 + alert2 + alert3;
 }

 // 3. Asset Utilization Bar Chart (Muted Phase 1 Asset Layer Colors)
 const sorted=arr.sort((a,b)=>b.revenue-a.revenue);
 const maxRev=sorted[0]?.revenue||1;
 const revListEl=document.getElementById('revenue-list');
 if(revListEl){
  revListEl.innerHTML=sorted.map((a,i)=>`
   <div class="revenue-item" title="${a.id}: ${a.activeHours.toFixed(1)}h Active • Revenue: ${formatAUDCurrency(a.revenue)}">
    <div class="rev-info">
     <span class="rev-rank">#${i+1}</span>
     <span class="rev-name" style="color:${ASSET_HEX[a.id]||'#888'};font-weight:800;">${a.id}</span>
     <span class="rev-amount" style="font-family:'Inter',monospace;font-variant-numeric:tabular-nums;">${formatAUDCurrency(a.revenue)}</span>
    </div>
    <div class="rev-bar">
     <div class="rev-progress" style="width:${(a.revenue/maxRev*100).toFixed(1)}%;background:${ASSET_HEX[a.id]||'#888'};"></div>
    </div>
   </div>`).join('');
 }

 const opArr=Object.entries(opHours).sort((a,b)=>b[1]-a[1]);
 const maxOp=opArr[0]?.[1]||1;
 const opListEl=document.getElementById('operator-list');
 if(opListEl){
  opListEl.innerHTML=opArr.slice(0,8).map((o,i)=>`
   <div class="operator-item">
    <div class="op-info">
     <span class="op-rank">#${i+1}</span>
     <span class="op-name">${o[0]}</span>
     <span class="op-hours" style="font-family:'Inter',monospace;">${o[1].toFixed(1)}h</span>
    </div>
    <div class="op-bar">
     <div class="op-progress" style="width:${(o[1]/maxOp*100).toFixed(1)}%;background:var(--accent-primary);"></div>
    </div>
   </div>`).join('');
 }

 if(utilizationChartInst)utilizationChartInst.destroy();
 const uCanvas=document.getElementById('utilizationChart');
 if(uCanvas){
  const uCtx=uCanvas.getContext('2d');
  utilizationChartInst=new Chart(uCtx,{
   type:'bar',
   data:{
    labels:arr.map(a=>a.id),
    datasets:[
     {label:'Active Hours',data:arr.map(a=>parseFloat(a.activeHours.toFixed(1))),backgroundColor:arr.map(a=>ASSET_HEX[a.id]||'#888')},
     {label:'Idle Hours',data:arr.map(a=>parseFloat(a.idleHours.toFixed(1))),backgroundColor:'rgba(15,23,42,0.08)'}
    ]
   },
   options:{
    responsive:true,
    maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:'rgba(0,0,0,0.05)'}}}
   }
  });
 }

 if(statusChartInst)statusChartInst.destroy();
 const sCanvas=document.getElementById('statusChart');
 if(sCanvas){
  const sCtx=sCanvas.getContext('2d');
  statusChartInst=new Chart(sCtx,{
   type:'doughnut',
   data:{
    labels:['Scheduled','Dispatched','On-Site','Docket Verification','Completed & Ready','Invoiced'],
    datasets:[{
     data:[2, 1, 1, 1, 1, 3],
     backgroundColor:['#0ea5e9','#8b5cf6','#d97706','#06b6d4','#10b981','#334155'],
     borderWidth:0
    }]
   },
   options:{
    responsive:true,
    maintainAspectRatio:false,
    plugins:{legend:{position:'bottom',labels:{font:{family:'Inter',size:11}}}}
   }
  });
 }
}
/* ── RENDER CALENDAR ── */
function getToggleBtnLabel(){
 if(currentView==='Day'){
  return formatAUDate(currentDate.toISOString()); // e.g. 04/08/2026
 }
 if(currentView==='Month') return currentDate.toLocaleDateString('en-AU',{month:'short',year:'numeric'});
 // Week / Work Week
 const dow=currentDate.getDay();
 const monday=new Date(currentDate);monday.setDate(monday.getDate()-(dow===0?6:dow-1));
 return formatAUDate(monday.toISOString());
}

function getDateLabel(){
 if(currentView==='Day'){
  return currentDate.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 }
 if(currentView==='Month'){
  return currentDate.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
 }
 // Week / Work Week — show range Mon–Sun or Mon–Fri
 const dow=currentDate.getDay();
 const monday=new Date(currentDate);monday.setDate(monday.getDate()-(dow===0?6:dow-1));
 const days=currentView==='Work Week'?4:6;
 const endDay=new Date(monday);endDay.setDate(monday.getDate()+days);
 const fmtShort=d=>d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
 const fmtFull=d=>d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
 if(monday.getMonth()===endDay.getMonth()){
  return monday.getDate()+'–'+fmtFull(endDay);
 }
 return fmtShort(monday)+'–'+fmtFull(endDay);
}

function renderCalendar(){
 const body=document.getElementById('calendar-body');
 // Update date toggle button label (e.g. 04/08/2026)
 const toggleLabelEl=document.getElementById('date-toggle-label');
 if(toggleLabelEl) toggleLabelEl.textContent=getToggleBtnLabel();
 // Update written date banner above toolbar (e.g. Tuesday, 4 August 2026)
 const dateBannerEl=document.getElementById('display-date');
 if(dateBannerEl) dateBannerEl.textContent=getDateLabel();

 if(currentView==='Day'){
  if(dayTransposed)renderDayTransposedView(body);
  else renderDayView(body);
 } else {
  body.style.height='';
  body.style.flex='';
  if(currentView==='Week'){
   if(weekTransposed)renderWeekTimeView(body,7);
   else renderWeekView(body,7);
  } else if(currentView==='Work Week'){
   if(weekTransposed)renderWeekTimeView(body,5);
   else renderWeekView(body,5);
  } else if(currentView==='Month') renderMonthView(body);
 }
 setTimeout(() => initDragAndDrop(renderCalendar, showToast), 100);
}

function getHourRange(dayBookings){
 // If user has set explicit display hours, use those
 if(displayHoursStart!==null&&displayHoursEnd!==null){
  currentMinHour=displayHoursStart;
  return{minH:displayHoursStart,maxH:displayHoursEnd};
 }
 let minH=6,maxH=18;
 dayBookings.forEach(b=>{
  const sh=new Date(b.startTime).getHours();
  const eh=new Date(b.endTime).getHours()+(new Date(b.endTime).getMinutes()>0?1:0);
  if(sh<minH)minH=Math.max(0,sh-1);
  if(eh>maxH)maxH=Math.min(24,eh+1);
 });
 currentMinHour=minH;
 return{minH,maxH};
}

function setDisplayHours(start,end){
 displayHoursStart=(start!==null)?Number(start):null;
 displayHoursEnd=(end!==null)?Number(end):null;
 renderCalendar();
}

function resetDisplayHours(){
 displayHoursStart=7;
 displayHoursEnd=19;
 const startSel=document.getElementById('display-start-hour');
 const endSel=document.getElementById('display-end-hour');
 if(startSel)startSel.value='7';
 if(endSel)endSel.value='19';
 renderCalendar();
}

function toggleLegendPopover(){
 const menu=document.getElementById('legend-popover-menu');
 if(menu) menu.classList.toggle('open');
}

// Close popovers on outside click
document.addEventListener('click',(e)=>{
 const wrapper=document.querySelector('.legend-popover-wrapper');
 const menu=document.getElementById('legend-popover-menu');
 if(wrapper && menu && !wrapper.contains(e.target)){
  menu.classList.remove('open');
 }
});

function formatHourLabel(h){
 if(h===0)return'12 AM';
 if(h<12)return h+' AM';
 if(h===12)return'12 PM';
 return(h-12)+' PM';
}


function renderDayView(body){
 const dayBookings=bookings.filter(b=>new Date(b.startTime).toDateString()===currentDate.toDateString());
 const{minH,maxH}=getHourRange(dayBookings);
 const hours=[];for(let h=minH;h<maxH;h++)hours.push(h);
 const PX=60;
 const HEADER_H=42; // asset name header row height
 const totalSlotH=hours.length*PX;

 // Size the calendar-body to exactly fit the content, capped at available viewport
 const calBody=document.getElementById('calendar-body');
 const availH=window.innerHeight-calBody.getBoundingClientRect().top-24;
 calBody.style.height=Math.min(totalSlotH+HEADER_H, availH)+'px';
 calBody.style.flex='none';

 let html=`<div style="display:flex;height:100%;overflow:hidden;flex-direction:column;">`;
 html+=`<div style="display:flex;flex-shrink:0;background:var(--bg-secondary);border-bottom:1px solid var(--border-light);">`;
 html+=`<div style="width:64px;flex-shrink:0;"></div>`;
 validAssets.forEach(asset=>{
  const hex=ASSET_HEX[asset]||'#888';
  const comp=complianceRegistry[asset];
  const isExpired=comp&&comp.status==='expired';
  const isWarning=comp&&comp.status==='warning';

  let headerStyle=`color:${hex};border-bottom:2px solid ${hex};`;
  let headerContent=asset;
  if(isExpired){
   headerStyle=`background:rgba(239,68,68,0.15);color:#dc2626;border-bottom:2px solid #dc2626;`;
   headerContent=`${asset} <span style="font-size:9px;background:#dc2626;color:#fff;padding:1px 4px;border-radius:3px;"> LOCKED</span>`;
  } else if(isWarning){
   headerContent=`${asset} <span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 4px;border-radius:3px;"> 30d</span>`;
  }

  html+=`<div style="flex:1;min-width:80px;padding:10px 8px;text-align:center;font-size:12px;font-weight:700;border-left:1px solid var(--border-light);${headerStyle}">${headerContent}</div>`;
 });
 html+=`</div>`;
 html+=`<div style="flex:1;overflow-y:auto;overflow-x:auto;display:flex;" id="day-scroll">`;
 html+=`<div style="width:64px;flex-shrink:0;background:var(--bg-secondary);border-right:1px solid var(--border-light);">`;
 html+=hours.map(h=>`<div style="height:${PX}px;display:flex;justify-content:flex-end;padding:8px 10px 0 0;font-size:11px;font-weight:600;color:var(--text-muted);">${h===0?'12 AM':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM'}</div>`).join('');
 html+=`</div>`;
 validAssets.forEach(asset=>{
  const hex=ASSET_HEX[asset]||'#888';
  const totalH=hours.length*PX;
  const comp=complianceRegistry[asset];
  const isExpired=comp&&comp.status==='expired';
  const isWarning=comp&&comp.status==='warning';

  html+=`<div style="flex:1;min-width:80px;position:relative;border-left:1px solid var(--border-light);" data-asset="${asset}" id="col-${asset}">`;

  if(isExpired){
   // Interlock Overlay for Expired Assets
   html+=`<div class="locked-column-overlay" onclick="showToast(' SAFETY INTERLOCK: Asset ${asset} has an EXPIRED DocuWare Safety Certificate (${comp.rego}). Dispatch is locked until a new cert is indexed in DocuWare.')">
    <div class="locked-banner-pill"> ASSET DISPATCH LOCKED</div>
   </div>`;
  }

  // Tint overlay
  html+=`<div style="position:absolute;top:0;left:0;right:0;height:${totalH}px;background:${hex};opacity:0.07;pointer-events:none;z-index:0;"></div>`;
  hours.forEach(h=>{
   html+=`<div style="height:${PX}px;border-bottom:1px solid color-mix(in srgb, ${hex} 15%, transparent);" class="paint-slot" data-hour="${h}" data-asset="${asset}" onmousedown="${isExpired ? `showToast(' Safety Interlock: Asset ${asset} is locked due to expired DocuWare cert.')` : `startPaint(event,${h},'${asset}')`}" ondragover="window._dragOver(event)" ondragleave="window._dragLeave(event)" ondrop="window._dropBooking(event, ${h}, '${asset}', '${currentDate.toISOString()}')"></div>`;
  });

  const aBookings=dayBookings.filter(b=>b.assetNumber===asset);
  aBookings.forEach(b=>{
   const startD=new Date(b.startTime),endD=new Date(b.endTime);
   const startMins=(startD.getHours()-minH)*60+startD.getMinutes();
   const dur=(endD-startD)/60000;
   const top=startMins*(PX/60);
   const height=Math.max(dur*(PX/60),26);
   
   // Layer 1: Asset background color (fixes DZ04 blank red block bug!)
   const color=getBookingColor(b);
   // Layer 2: Embedded DocuWare Status Pill
   const statusPillHtml=renderDocuWarePill(b);

   html+=`<div class="booking-card" id="${b.id}" draggable="true" ondragstart="window._dragBooking(event, '${b.id}')" ondragend="window._dragEnd(event)" style="top:${top}px;height:${height}px;background:${color};"  ondblclick="editBooking('${b.id}')">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
     <span class="booking-asset-code">${b.assetNumber}</span>
          <span class="hire-type-pill ${b.hireType || 'dry'}">${(b.hireType || 'dry') === 'wet' ? 'WET' : 'DRY'}</span>
          ${b.assetNumber.startsWith('CR') && b.requiredLiftCapacity > 0 ? `<span class="booking-capacity">${b.requiredLiftCapacity}T req</span>` : ''}
     ${statusPillHtml}
    </div>
    <div class="booking-client">${b.clientName}</div>
    <div class="booking-operator">${b.operatorName ? ' ' + b.operatorName : ' Unassigned'}</div>
    ${isWarning ? `<div style="font-size:9px;font-weight:800;color:#fef08a;margin-top:2px;"> Service Due 30d</div>` : ''}
    <div class="booking-resize-handle" onmousedown="startResize(event,'${b.id}')"></div>
   </div>`;
  });
  html+=`</div>`;
 });
 html+=`</div></div>`;
 body.innerHTML=html;
}

/* ── TRANSPOSED DAY VIEW: hours-as-columns, assets-as-rows ── */
function renderDayTransposedView(body){
 const dayBookings=bookings.filter(b=>new Date(b.startTime).toDateString()===currentDate.toDateString());
 const{minH,maxH}=getHourRange(dayBookings);
 const totalHours=maxH-minH;
 const CELL_H=56, BAR_H=36, BAR_TOP=(CELL_H-BAR_H)/2, LABEL_W=96;
 const today=new Date();
 const now=new Date();

 // Format time short
 function fmtT(d){const h=d.getHours(),m=d.getMinutes(),h12=h===0?12:h>12?h-12:h;return`${h12}:${String(m).padStart(2,'0')}${h<12?'A':'P'}`;}

 // Reset body sizing (unlike normal day view it fills flex)
 body.style.height='';
 body.style.flex='';

 let html=`<div style="display:flex;height:100%;overflow:hidden;flex-direction:column;">`;

 // ── Hour header row ──
 const isToday=currentDate.toDateString()===today.toDateString();
 html+=`<div style="display:flex;flex-shrink:0;background:var(--bg-secondary);border-bottom:2px solid var(--border-light);">`;
 html+=`<div style="width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--border-light);"></div>`;
 // One column per hour
 for(let h=minH;h<maxH;h++){
  const label=h===0?'12 AM':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM';
  html+=`<div style="flex:1;min-width:60px;padding:8px 4px;text-align:center;border-left:1px solid var(--border-light);font-size:11px;font-weight:600;color:var(--text-muted);">${label}</div>`;
 }
 html+=`</div>`;

 // ── Scrollable asset rows ──
 html+=`<div style="flex:1;overflow-y:auto;overflow-x:auto;">`;

 validAssets.forEach(asset=>{
  const hex=ASSET_HEX[asset]||'#888';
  const aBookings=dayBookings.filter(b=>b.assetNumber===asset);

  html+=`<div style="display:flex;border-bottom:1px solid var(--border-light);height:${CELL_H}px;">`;

  // Asset label
  html+=`<div style="width:${LABEL_W}px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 12px;border-right:1px solid var(--border-light);font-size:12px;font-weight:700;color:${hex};">`;
  html+=`<div style="width:8px;height:8px;border-radius:50%;background:${hex};box-shadow:0 0 0 3px ${hex}33;flex-shrink:0;"></div>${asset}</div>`;

  // Single full-width cell spanning all hours
  html+=`<div style="flex:1;position:relative;overflow:hidden;min-width:${60*totalHours}px;" ondragover="window._dragOver(event)" ondragleave="window._dragLeave(event)" ondrop="window._dropGantt(event, '${asset}', '${currentDate.toISOString()}', ${minH}, ${totalHours})">`;
  // Tint
  html+=`<div style="position:absolute;inset:0;background:${hex};opacity:0.07;pointer-events:none;"></div>`;

  // Hour grid dividers
  for(let h=minH+1;h<maxH;h++){
   const pct=(h-minH)/totalHours*100;
   html+=`<div style="position:absolute;top:0;bottom:0;left:${pct}%;width:1px;background:rgba(0,0,0,0.1);pointer-events:none;"></div>`;
  }

  // Live time line
  if(isToday){
   const nowFrac=(now.getHours()+now.getMinutes()/60-minH)/totalHours;
   if(nowFrac>=0&&nowFrac<=1){
    html+=`<div style="position:absolute;top:0;bottom:0;left:${nowFrac*100}%;width:2px;background:var(--color-urgent);opacity:0.8;pointer-events:none;z-index:4;"></div>`;
   }
  }

  // Booking bars
  aBookings.forEach(b=>{
   const startD=new Date(b.startTime),endD=new Date(b.endTime);
   const startFrac=Math.max(0,(startD.getHours()+startD.getMinutes()/60-minH)/totalHours);
   const endFrac=Math.min(1,(endD.getHours()+endD.getMinutes()/60-minH)/totalHours);
   const leftPct=startFrac*100;
   const widthPct=Math.max(1,(endFrac-startFrac)*100);
   const color=getBookingColor(b);
   html+=`<div class="gantt-bar" id="dt-${b.id}" draggable="true" ondragstart="window._dragBooking(event, '${b.id}')" ondragend="window._dragEnd(event)" style="left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);top:${BAR_TOP}px;height:${BAR_H}px;background:${color};" ondblclick="editBooking('${b.id}')" title="${b.assetNumber} | ${fmtT(startD)} – ${fmtT(endD)}&#10;${b.clientName}&#10;${isWorkerDoubleBooked(b) ? '<span style="color:#d97706;font-weight:bold;">⚠️ ' + (b.wetHireResources?.[0]?.workerName || b.operatorName || '') + '</span>' : (b.wetHireResources?.[0]?.workerName || b.operatorName || '')}&#10;${b.jobDescription||''}">`;
   html+=`<span class="gantt-bar-text" style="font-size:11px;">${b.clientName} <span style="opacity:0.7">${fmtT(startD)}–${fmtT(endD)}</span></span>`;
   html+=`</div>`;
  });

  html+=`</div></div>`;
 });



 html+=`</div></div>`;
 body.innerHTML=html;
}

/* \u2500\u2500 WEEK TIME VIEW: traditional vertical time grid (days as columns) \u2500\u2500 */
function renderWeekTimeView(body,days){
 const filtered=getFilteredBookings();
 const startOfWeekD=new Date(currentDate);
 const dow=startOfWeekD.getDay();
 const monday=new Date(startOfWeekD);monday.setDate(monday.getDate()-(dow===0?6:dow-1));
 const weekDays=[];for(let i=0;i<days;i++){const d=new Date(monday);d.setDate(d.getDate()+i);weekDays.push(d);}
 const weekBookings=filtered.filter(b=>{const d=new Date(b.startTime);return weekDays.some(wd=>wd.toDateString()===d.toDateString());});
 const{minH,maxH}=getHourRange(weekBookings.length?weekBookings:bookings.filter(b=>weekDays.some(wd=>wd.toDateString()===new Date(b.startTime).toDateString())));
 const PX=60;
 const HEADER_H=52;
 const totalSlotH=(maxH-minH)*PX;
 const today=new Date();
 const now=new Date();
 const hours=[];for(let h=minH;h<maxH;h++)hours.push(h);

 // Size body to fit content
 const calBody=document.getElementById('calendar-body');
 const availH=window.innerHeight-calBody.getBoundingClientRect().top-24;
 calBody.style.height=Math.min(totalSlotH+HEADER_H,availH)+'px';
 calBody.style.flex='none';

 let html=`<div style="display:flex;height:100%;overflow:hidden;flex-direction:column;">`;

 // \u2500 Day header row \u2500
 html+=`<div style="display:flex;flex-shrink:0;background:var(--bg-secondary);border-bottom:2px solid var(--border-light);">`;
 html+=`<div style="width:64px;flex-shrink:0;"></div>`;
 weekDays.forEach(wd=>{
  const isToday=wd.toDateString()===today.toDateString();
  const dayName=wd.toLocaleDateString('en-AU',{weekday:'short'}).toUpperCase();
  html+=`<div style="flex:1;min-width:100px;padding:8px;text-align:center;border-left:1px solid var(--border-light);${isToday?'background:rgba(28,75,139,0.05);':''}">`;
  html+=`<div style="font-size:20px;font-weight:700;${isToday?'color:var(--accent-primary);':''}">${wd.getDate()}</div>`;
  html+=`<div style="font-size:11px;color:var(--text-muted);font-weight:600;">${dayName}</div>`;
  html+=`</div>`;
 });
 html+=`</div>`;

 // \u2500 Scrollable time grid \u2500
 html+=`<div style="flex:1;overflow-y:auto;overflow-x:auto;display:flex;">`;

 // Time gutter
 html+=`<div style="width:64px;flex-shrink:0;background:var(--bg-secondary);border-right:1px solid var(--border-light);">`;
 html+=hours.map(h=>`<div style="height:${PX}px;display:flex;justify-content:flex-end;padding:8px 10px 0 0;font-size:11px;font-weight:600;color:var(--text-muted);">${h===0?'12 AM':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM'}</div>`).join('');
 html+=`</div>`;

 // Day columns
 weekDays.forEach(wd=>{
  const isToday=wd.toDateString()===today.toDateString();
  const dayStr=wd.toDateString();
  const dayBk=weekBookings.filter(b=>new Date(b.startTime).toDateString()===dayStr);
  const totalH=hours.length*PX;
  html+=`<div style="flex:1;min-width:100px;position:relative;border-left:1px solid var(--border-light);${isToday?'background:rgba(28,75,139,0.02);':''}">`;

  // Hour slots (clickable to new booking)
  hours.forEach(h=>{
   html+=`<div style="height:${PX}px;border-bottom:1px solid var(--border-light);cursor:crosshair;" onmousedown="openModal('',null,null,'${wd.toISOString().slice(0,10)}')"></div>`;
  });

  // Live time line
  if(isToday){
   const nowPx=(now.getHours()-minH)*PX+now.getMinutes()*(PX/60);
   if(nowPx>=0&&nowPx<=totalH)
    html+=`<div class="live-time-line" style="top:${nowPx}px;"></div>`;
  }

  // Booking cards
  dayBk.forEach(b=>{
   const startD=new Date(b.startTime),endD=new Date(b.endTime);
   const startMins=(startD.getHours()-minH)*60+startD.getMinutes();
   const dur=(endD-startD)/60000;
   const top=startMins*(PX/60);
   const height=Math.max(dur*(PX/60),22);
   const color=getBookingColor(b);
   html+=`<div class="booking-card" id="wt-${b.id}" draggable="true" ondragstart="window._dragBooking(event, '${b.id}')" ondragend="window._dragEnd(event)" style="top:${top}px;height:${height}px;background:${color};"  ondblclick="editBooking('${b.id}')">`;
   html+=`<div class="booking-asset-code">${b.assetNumber}</div>
      <span class="hire-type-pill ${b.hireType || 'dry'}">${(b.hireType || 'dry') === 'wet' ? 'WET' : 'DRY'}</span>
      ${b.assetNumber.startsWith('CR') && b.requiredLiftCapacity > 0 ? `<span class="booking-capacity">${b.requiredLiftCapacity}T req</span>` : ''}`;
   html+=`<div class="booking-client">${b.clientName}</div>`;
   html+=`<div class="booking-operator">${b.hireType === 'wet' && b.wetHireResources && b.wetHireResources.length > 0 ? b.wetHireResources[0].workerName : (b.operatorName || '')}</div>`;
   html+=`<div class="booking-resize-handle" onmousedown="startResize(event,'${b.id}')"></div>`;
   html+=`</div>`;
  });

  html+=`</div>`;
 });

 html+=`</div></div>`;
 body.innerHTML=html;
}

function renderWeekView(body,days){
 const filtered=getFilteredBookings();
 const startOfWeek=new Date(currentDate);
 const dayOfWeek=startOfWeek.getDay();
 const monday=new Date(startOfWeek);monday.setDate(monday.getDate()-(dayOfWeek===0?6:dayOfWeek-1));
 const weekDays=[];for(let i=0;i<days;i++){const d=new Date(monday);d.setDate(d.getDate()+i);weekDays.push(d);}
 const weekBookings=filtered.filter(b=>{const d=new Date(b.startTime);return weekDays.some(wd=>wd.toDateString()===d.toDateString());});
 const{minH,maxH}=getHourRange(weekBookings.length?weekBookings:bookings.filter(b=>weekDays.some(wd=>wd.toDateString()===new Date(b.startTime).toDateString())));
 const totalHours=maxH-minH;
 const today=new Date();
 const now=new Date();
 const assetsToShow=activeAssetFilters.size>0?assetRegistry.filter(a=>activeAssetFilters.has(a.id)):assetRegistry;
 const CELL_H=52, BAR_H=34, BAR_TOP=(CELL_H-BAR_H)/2, LABEL_W=96;

 // Format time as "7:30A" / "3:00P"
 function fmtT(d){const h=d.getHours(),m=d.getMinutes(),h12=h===0?12:h>12?h-12:h;return`${h12}:${String(m).padStart(2,'0')}${h<12?'A':'P'}`;}

 let html=`<div style="display:flex;height:100%;overflow:hidden;flex-direction:column;">`;

 // ── Day header row ──
 html+=`<div style="display:flex;flex-shrink:0;background:var(--bg-secondary);border-bottom:2px solid var(--border-light);"><div style="width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--border-light);"></div>`;
 weekDays.forEach(wd=>{
  const isToday=wd.toDateString()===today.toDateString();
  const dayName=wd.toLocaleDateString('en-AU',{weekday:'short'}).toUpperCase();
  html+=`<div style="flex:1;min-width:130px;padding:10px 8px;text-align:center;border-left:1px solid var(--border-light);"${isToday?' class="gantt-header-today"':''}><div style="font-size:20px;font-weight:700;${isToday?'color:var(--accent-primary);':''}">${wd.getDate()}</div><div style="font-size:11px;color:var(--text-muted);font-weight:600;">${dayName}</div></div>`;
 });
 html+=`</div>`;

 // ── Scrollable asset rows ──
 html+=`<div style="flex:1;overflow-y:auto;overflow-x:auto;">`;

 assetsToShow.forEach(asset=>{
  const hex=asset.hex;
  html+=`<div style="display:flex;border-bottom:1px solid var(--border-light);height:${CELL_H}px;">`;

  // Asset label
  html+=`<div class="gantt-asset-label" style="width:${LABEL_W}px;"><div class="gantt-asset-dot" style="background:${hex};box-shadow:0 0 0 3px ${hex}33;"></div><span>${asset.id}</span></div>`;

  // Day cells
  weekDays.forEach(wd=>{
   const isToday=wd.toDateString()===today.toDateString();
   const dayBk=weekBookings.filter(b=>b.assetNumber===asset.id&&new Date(b.startTime).toDateString()===wd.toDateString());
   html+=`<div class="gantt-cell${isToday?' gantt-cell-today':''}" style="min-width:130px;"`+(isToday?` data-today="1"`:'')+`>`;

   // Hour grid lines — major only (every 3h)
   for(let h=minH+1;h<maxH;h++){
    if((h-minH)%3!==0)continue;
    const pct=(h-minH)/totalHours*100;
    html+=`<div style="position:absolute;top:0;bottom:0;left:${pct}%;width:1px;background:rgba(0,0,0,0.07);pointer-events:none;"></div>`;
   }

   // Live time vertical line (today's column only)
   if(isToday){
    const nowFrac=(now.getHours()+now.getMinutes()/60-minH)/totalHours;
    if(nowFrac>=0&&nowFrac<=1){
     html+=`<div class="gantt-now-line" style="left:${nowFrac*100}%;"></div>`;
    }
   }

   // Booking bars — label only, full detail in tooltip
   dayBk.forEach(b=>{
    const startD=new Date(b.startTime),endD=new Date(b.endTime);
    const startFrac=Math.max(0,(startD.getHours()+startD.getMinutes()/60-minH)/totalHours);
    const endFrac=Math.min(1,(endD.getHours()+endD.getMinutes()/60-minH)/totalHours);
    const leftPct=startFrac*100;
    const widthPct=Math.max(1.5,(endFrac-startFrac)*100);
    const color=getBookingColor(b);
    html+=`<div class="gantt-bar" id="${b.id}" style="left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);top:${BAR_TOP}px;height:${BAR_H}px;background:${color};" ondblclick="editBooking('${b.id}')" title="${b.assetNumber} | ${fmtT(startD)} – ${fmtT(endD)}&#10;${b.clientName}&#10;${isWorkerDoubleBooked(b) ? '<span style="color:#d97706;font-weight:bold;">⚠️ ' + (b.wetHireResources?.[0]?.workerName || b.operatorName || '') + '</span>' : (b.wetHireResources?.[0]?.workerName || b.operatorName || '')}&#10;${b.jobDescription||''}"><span class="gantt-bar-text">${b.clientName}</span></div>`;
   });

   html+=`</div>`;
  });
  html+=`</div>`;
 });




 html+=`</div></div>`;
 body.innerHTML=html;
}

function renderMonthView(body){
 const y=currentDate.getFullYear(),m=currentDate.getMonth();
 const firstDay=new Date(y,m,1);
 const lastDay=new Date(y,m+1,0);
 const startDow=firstDay.getDay()===0?6:firstDay.getDay()-1;
 const today=new Date();
 const filtered=getFilteredBookings();
 let html=`<div class="month-grid">`;
 html+=`<div class="month-header-row">`;
 ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>html+=`<div class="month-day-name">${d}</div>`);
 html+=`</div><div class="month-body">`;
 for(let i=0;i<startDow;i++){
  const d=new Date(y,m,1-startDow+i);
  html+=`<div class="month-cell other-month"><div class="month-date-num">${d.getDate()}</div></div>`;
 }
 for(let day=1;day<=lastDay.getDate();day++){
  const cellDate=new Date(y,m,day);
  const isToday=cellDate.toDateString()===today.toDateString();
  const dayBk=filtered.filter(b=>new Date(b.startTime).toDateString()===cellDate.toDateString());
  html+=`<div class="month-cell${isToday?' today-cell':''}" onclick="goToDay('${cellDate.toISOString()}')">`;
  html+=`<div class="month-date-num${isToday?' today-num':''}">${day}</div>`;
  dayBk.slice(0,3).forEach(b=>{
   html+=`<div class="month-booking-pill" style="background:${getBookingColor(b)};" onclick="event.stopPropagation();editBooking('${b.id}')">${b.assetNumber} – ${b.clientName}</div>`;
  });
  if(dayBk.length>3)html+=`<div style="font-size:10px;color:var(--text-muted);font-weight:600;">+${dayBk.length-3} more</div>`;
  html+=`</div>`;
 }
 const remaining=(7-(startDow+lastDay.getDate())%7)%7;
 for(let i=1;i<=remaining;i++){
  const d=new Date(y,m+1,i);
  html+=`<div class="month-cell other-month"><div class="month-date-num">${d.getDate()}</div></div>`;
 }
 html+=`</div></div>`;
 body.innerHTML=html;
}

function goToDay(iso){currentDate=new Date(iso);setCalendarView('Day');}

function renderLiveTimeIndicator(){
 // Cancel any previously scheduled tick to prevent timer accumulation
 if(liveTimeTimer){clearTimeout(liveTimeTimer);liveTimeTimer=null;}
 if(currentView==='Month'||currentView==='Week'||currentView==='Work Week'){return;}
 const cols=document.querySelectorAll('[data-asset],[data-date]');
 if(!cols.length)return;
 // Remove any stale lines left from previous renders
 document.querySelectorAll('.live-time-line').forEach(l=>l.remove());
 const now=new Date();
 const minH=currentMinHour;
 const PX=60;
 const topPx=(now.getHours()-minH)*PX+(now.getMinutes()*(PX/60));
 // Only draw if the current time falls within the visible range
 const maxH=displayHoursEnd!==null?displayHoursEnd:(currentMinHour+24);
 if(now.getHours()<minH||now.getHours()>=maxH){
  liveTimeTimer=setTimeout(renderLiveTimeIndicator,60000);
  return;
 }
 cols.forEach(col=>{
  const line=document.createElement('div');
  line.className='live-time-line';
  line.style.top=topPx+'px';
  col.appendChild(line);
 });
 liveTimeTimer=setTimeout(renderLiveTimeIndicator,60000);
}

/* ── DRAG & DROP ── */


/* ── PAINT TO SCHEDULE ── */
function startPaint(e,hour,asset){
 if(e.button!==0)return;
 e.preventDefault();
 isPainting=true;paintAsset=asset;paintStartHour=hour;
 const col=document.getElementById('col-'+asset);
 if(!col)return;
 paintCol=col;
 const PX=60;
 const preview=document.createElement('div');
 preview.className='paint-preview';
 preview.style.top=(hour-currentMinHour)*PX+'px';
 preview.style.height=PX+'px';
 preview.textContent='New Booking';
 col.appendChild(preview);
 paintEl=preview;
 const onMove=ev=>{
  if(!isPainting||!paintEl)return;
  const rect=col.getBoundingClientRect();
  const relY=ev.clientY-rect.top+(col.parentElement?.scrollTop||0);
  const endHour=Math.max(paintStartHour+1,currentMinHour+Math.ceil(relY/PX));
  paintEl.style.height=((endHour-paintStartHour)*PX)+'px';
  paintEl.textContent=`${paintStartHour}:00 – ${endHour}:00`;
 };
 const onUp=ev=>{
  document.removeEventListener('mousemove',onMove);
  document.removeEventListener('mouseup',onUp);
  if(!isPainting){isPainting=false;return;}
  isPainting=false;
  if(paintEl){paintEl.remove();paintEl=null;}
  const rect=paintCol?.getBoundingClientRect();
  const relY=ev.clientY-(rect?.top||0)+((paintCol?.parentElement?.scrollTop)||0);
  const endHour=Math.max(paintStartHour+1,currentMinHour+Math.ceil(relY/PX));
  const sh=String(paintStartHour).padStart(2,'0')+':00';
  const eh=String(endHour).padStart(2,'0')+':00';
  openModal(paintAsset,sh,eh);
  paintCol=null;
 };
 document.addEventListener('mousemove',onMove);
 document.addEventListener('mouseup',onUp);
}

function startPaintWeek(e,hour,dateISO){
 if(e.button!==0)return;
 e.preventDefault();
 const sh=String(hour).padStart(2,'0')+':00';
 const eh=String(hour+1).padStart(2,'0')+':00';
 currentDate=new Date(dateISO);
 openModal(null,sh,eh);
}

/* ── INIT ── */
function populateHourSelect(sel, defaultVal, includeHourZero){
 const labels=['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM','11 PM'];
 if(!sel)return;
 sel.innerHTML='';
 labels.forEach((l,i)=>{
  if(!includeHourZero&&i===0)return;
  const opt=document.createElement('option');
  opt.value=i;opt.textContent=l;
  if(i===defaultVal)opt.selected=true;
  sel.appendChild(opt);
 });
 if(!includeHourZero){
  const opt=document.createElement('option');
  opt.value=24;opt.textContent='12 AM';
  if(defaultVal===24)opt.selected=true;
  sel.appendChild(opt);
 }
}

/* ── AUSTRALIAN DATE FORMAT HELPER ── */
function formatAUDate(dateInput){
 if(!dateInput) return '';
 const d = new Date(dateInput);
 if(isNaN(d.getTime())) return String(dateInput);
 const day = String(d.getDate()).padStart(2, '0');
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const year = d.getFullYear();
 return `${day}/${month}/${year}`;
}

/* ── TAB SWITCHING & PHASE 2 MODULES ── */


/* ── DOCUWARE CONTRACT E-SIGNATURE & FIELD DOCKET WORKFLOWS ── */

function openDocuWareContractModal(id){
 const b=bookings.find(x=>x.id===id);
 if(!b)return;
 _activeDWBookingId=id;
 
 const summaryEl=document.getElementById('dw-contract-summary');
 if(summaryEl){
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const total=dur*rate;

  summaryEl.innerHTML=`
   <strong>Client:</strong> ${b.clientName}<br>
   <strong>Asset:</strong> ${b.assetNumber} (${b.jobDescription||'Plant hire operation'})<br>
   <strong>Rate / Estimated Total:</strong> $${rate}/hr — $${Math.round(total)} AUD (${dur.toFixed(1)} hrs)<br>
   <strong>DocuWare Document ID:</strong> #DW-AGR-${b.id.toUpperCase()}
  `;
 }
 document.getElementById('docuware-signature-modal').classList.add('open');
}

function executeDocuWareSign(){
 const b=bookings.find(x=>x.id===_activeDWBookingId);
 if(b){
  b.contractSigned=true;
  b.contractStatus=' Contract Signed & Archived';
 }
 closeDocuWareModal('docuware-signature-modal');
 showToast(`✅ DocuWare Sign Workflow Executed!\n\nHire Agreement #DW-AGR-${_activeDWBookingId?.toUpperCase()} sent to client. E-Signature verified & stored in DocuWare Vault.`);
 renderJobBoard();
 renderCalendar();
}

function openDocuWareDocketModal(id){
 const b=bookings.find(x=>x.id===id);
 if(!b)return;
 _activeDWBookingId=id;

 const summaryEl=document.getElementById('dw-docket-summary');
 const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
 const prefix=b.assetNumber.replace(/[0-9]/g,'');
 const rate=HOURLY_RATES[prefix]||200;

 if(summaryEl){
  summaryEl.innerHTML=`
   <strong>Client:</strong> ${b.clientName} | <strong>Asset:</strong> ${b.assetNumber}<br>
   <strong>Operator:</strong> ${b.operatorName||'On-site operator'}<br>
   <strong>Job Scope:</strong> ${b.jobDescription||'Plant hire'}<br>
   <strong>Docket Reference:</strong> #WD-${Math.floor(10000 + Math.random() * 90000)}
  `;
 }

 document.getElementById('dw-actual-hours').value=dur.toFixed(1);
 document.getElementById('dw-docket-rate').value=`$${rate}/hr`;
 document.getElementById('dw-docket-total').value=`$${Math.round(dur*rate).toLocaleString()} AUD`;

 document.getElementById('docuware-docket-modal').classList.add('open');
}

function recalcDocketTotal(){
 const hours=parseFloat(document.getElementById('dw-actual-hours').value)||0;
 const b=bookings.find(x=>x.id===_activeDWBookingId);
 if(!b)return;
 const prefix=b.assetNumber.replace(/[0-9]/g,'');
 const rate=HOURLY_RATES[prefix]||200;
 document.getElementById('dw-docket-total').value=`$${Math.round(hours*rate).toLocaleString()} AUD`;
}

function executeDocketUpload(){
 const b=bookings.find(x=>x.id===_activeDWBookingId);
 if(b){
  b.docketUploaded=true;
  b.status='Completed';
 }
 closeDocuWareModal('docuware-docket-modal');
 showToast(`⚡ DocuWare Intelligent Indexing Completed!\n\nField Wet-Hire Docket indexed successfully. Machine hours extracted, billable total verified, and job advanced to Completed!`);
 renderJobBoard();
 renderCalendar();
 renderClientsView();
}

function openDocuWareSmartConnect(clientName){
 const modal=document.getElementById('docuware-smartconnect-modal');
 const titleEl=document.getElementById('smartconnect-title');
 const bodyEl=document.getElementById('smartconnect-body');
 if(!modal||!bodyEl)return;

 titleEl.textContent=`DocuWare Smart Connect — ${clientName}`;

 const clientBookings=bookings.filter(b=>b.clientName===clientName);
 let html=`
 <div style="background:rgba(26,86,219,0.06);border:1px solid rgba(26,86,219,0.2);padding:12px;border-radius:var(--radius-md);font-size:12px;display:flex;justify-content:space-between;align-items:center;">
  <div><strong>Organization Vault:</strong> Ops Engine Room Main Archive</div>
  <div style="color:#10b981;font-weight:700;">● Live Smart Connect Link Active</div>
 </div>
 <div class="compliance-table-wrap">
  <table class="compliance-table">
   <thead>
    <tr>
     <th>Document Title / Type</th>
     <th>DocID</th>
     <th>Indexed Date</th>
     <th>Status</th>
     <th>Action</th>
    </tr>
   </thead>
   <tbody>`;

 clientBookings.forEach(b=>{
  const dateStr=formatAUDate(b.startTime);
  html+=`
  <tr>
   <td><strong>Signed Hire Agreement PDF</strong> (${b.assetNumber})</td>
   <td style="font-family:monospace;">#DW-AGR-${b.id}</td>
   <td>${dateStr}</td>
   <td><span class="status-pill valid">Signed &amp; Indexed</span></td>
   <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="showToast('Opening DocuWare PDF Viewer for #DW-AGR-${b.id}...')">View Contract PDF</button></td>
  </tr>
  <tr>
   <td><strong>Verified Field Docket</strong> (#WD-${b.id})</td>
   <td style="font-family:monospace;">#DW-DOC-${b.id}</td>
   <td>${dateStr}</td>
   <td><span class="status-pill valid">Hours Verified</span></td>
   <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="showToast('Opening DocuWare Field Docket Viewer for #DW-DOC-${b.id}...')">View Docket PDF</button></td>
  </tr>
  <tr>
   <td><strong>Tax Invoice Record</strong> (#INV-${b.id})</td>
   <td style="font-family:monospace;">#DW-INV-${b.id}</td>
   <td>${dateStr}</td>
   <td><span class="status-pill ${b.status==='Invoiced'?'valid':'warning'}">${b.status==='Invoiced'?'Invoiced &amp; Synced':'Draft Invoice'}</span></td>
   <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="showToast('Opening DocuWare Tax Invoice Viewer for #DW-INV-${b.id}...')">View Invoice PDF</button></td>
  </tr>`;
 });

 html+=`</tbody></table></div>`;
 bodyEl.innerHTML=html;
 modal.classList.add('open');
}

function closeDocuWareModal(id){
 const modal=document.getElementById(id);
 if(modal) modal.classList.remove('open');
}

/* Webhook sync release for expired certs */
function indexDocuWareCert(assetId){
 if(complianceRegistry[assetId]){
  complianceRegistry[assetId].status='valid';
  complianceRegistry[assetId].certDate='2027-07-30';
 }
 showToast(`✅ DocuWare Webhook Received!\n\nNew Safety & Inspection Certificate for ${assetId} verified and indexed in DocuWare Vault.\nHard Dispatch Interlock RELEASED! ${assetId} is now available for booking.`);
 renderComplianceView();
 renderCalendar();
 renderJobBoard();
}

/* ── PHASE 3: JOB BOARD & PIPELINE INTEGRATION (DOCUWARE AUTOMATION) ── */
function renderJobBoard(){
 const container=document.getElementById('job-board-container');
 if(!container)return;

 const searchQuery=(document.getElementById('jb-search')?.value||'').toLowerCase().trim();
 const stageFilter=document.getElementById('jb-stage-filter')?.value||'ALL';

 const columns=[
  {id:'Scheduled',title:'Scheduled',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',color:'#3b82f6'},
  {id:'Dispatched',title:'Dispatched',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',color:'#8b5cf6'},
  {id:'On-Site',title:'On-Site',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>',color:'#d97706'},
  {id:'Docket Verification',title:'Docket Verification',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>',color:'#06b6d4'},
  {id:'Completed',title:'Complete & Ready to Bill',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',color:'#10b981'},
  {id:'Invoiced',title:'Invoiced',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',color:'#334155'}
 ];

 let filteredBookings=bookings;
 if(searchQuery){
  filteredBookings=filteredBookings.filter(b=>
   b.clientName.toLowerCase().includes(searchQuery)||
   b.assetNumber.toLowerCase().includes(searchQuery)||
   (b.operatorName||'').toLowerCase().includes(searchQuery)||
   (b.jobDescription||'').toLowerCase().includes(searchQuery)
  );
 }

 let html=`<div class="kanban-board">`;

 columns.forEach(col=>{
  if(stageFilter!=='ALL'&&stageFilter!==col.id) return;

  // Map Completed & Docket Verification column filter
  const colBookings=filteredBookings.filter(b=>{
   const status=b.status||'Scheduled';
   if(col.id==='Docket Verification') return status==='Docket Verification'||(status==='Completed'&&!b.docketUploaded);
   if(col.id==='Completed') return status==='Completed'&&b.docketUploaded;
   return status===col.id;
  });

  html+=`<div class="kanban-col">
   <div class="kanban-header">
    <div class="kanban-title"><span style="color:${col.color}">${col.svg}</span> ${col.title}</div>
    <span class="kanban-count">${colBookings.length}</span>
   </div>
   <div class="kanban-cards">`;

  if(colBookings.length===0){
   html+=`<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px;font-style:italic;">No jobs in this pipeline stage</div>`;
  } else {
   colBookings.forEach(b=>{
    const assetColor=ASSET_HEX[b.assetNumber]||'#475569';
    const startD=new Date(b.startTime);
    const timeStr=startD.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
    const dateStr=formatAUDate(b.startTime);
    
    let docActionHtml='';
    let dwStatusPillHtml=renderDocuWarePill(b);

    // Column 1: Scheduled Contract Workflow
    if(col.id==='Scheduled'){
     if(b.contractSigned){
      docActionHtml=`<button class="kb-primary-btn success" disabled> Contract Signed</button>`;
     } else {
      docActionHtml=`<button class="kb-primary-btn" onclick="event.stopPropagation();openDocuWareContractModal('${b.id}')">Generate Agreement</button>`;
     }
    }
    // Column 2: Dispatched
    else if(col.id==='Dispatched'){
     docActionHtml=`<button class="kb-primary-btn" style="background:#b45309;" onclick="event.stopPropagation();openSwmsModal('${b.id}')">Generate SWMS</button>`;
    }
    // Column 3: On-Site
    else if(col.id==='On-Site'){
     docActionHtml=`<button class="kb-primary-btn" style="background:#d97706;" onclick="event.stopPropagation();openPrestartModal('${b.id}')">Run Pre-Start</button>`;
    }
    // Column 4: Docket Verification
    else if(col.id==='Docket Verification'){
     if(b.docketUploaded){
      docActionHtml=`<button class="kb-primary-btn success" disabled> Hours Verified</button>`;
     } else {
      docActionHtml=`<button class="kb-primary-btn" style="background:#06b6d4;" onclick="event.stopPropagation();openDocuWareDocketModal('${b.id}')">Upload Field Docket</button>`;
     }
    }
    // Column 5: Complete & Ready to Bill (Billing Lockout Safeguard!)
    else if(col.id==='Completed'){
     if(b.docketUploaded){
      docActionHtml=`<button class="kb-primary-btn success" onclick="event.stopPropagation();triggerDocuWareDoc('${b.id}','${b.clientName}')">Issue Invoice</button>`;
     } else {
      docActionHtml=`<button class="kb-primary-btn disabled" disabled title="Upload Field Docket in Docket Verification stage to unlock billing">Issue Invoice </button>`;
     }
    }
    // Column 6: Invoiced
    else if(col.id==='Invoiced'){
     docActionHtml=`<button class="kb-primary-btn" style="background:#334155;" onclick="event.stopPropagation();openDocuWareSmartConnect('${b.clientName.replace(/'/g,"\\'")}')">View Billing Record</button>`;
    }

    html+=`<div class="kanban-card" onclick="editBooking('${b.id}')">
     <div class="kb-card-header">
      <span class="kb-asset-tag" style="background:${assetColor};">${b.assetNumber}</span>
      ${dwStatusPillHtml}
     </div>
     <div class="kb-client-name">${b.clientName}</div>
     <div class="kb-meta-row">
      <span> ${dateStr}</span>
      <span> ${b.operatorName ? b.operatorName.split(' ')[0] : 'Unassigned'}</span>
     </div>
     <div class="kb-footer-actions">
      ${col.id!=='Scheduled'?`<button class="kb-nav-arrow" title="Previous Stage" onclick="event.stopPropagation();moveBookingStatus('${b.id}','prev')">←</button>`:''}
      ${docActionHtml}
      ${col.id!=='Invoiced'?`<button class="kb-nav-arrow" title="Next Stage" onclick="event.stopPropagation();moveBookingStatus('${b.id}','next')">→</button>`:''}
     </div>
    </div>`;
   });
  }

  html+=`</div></div>`;
 });

 html+=`</div>`;
 container.innerHTML=html;
}

function moveBookingStatus(id,dir){
 const stages=['Scheduled','Dispatched','On-Site','Docket Verification','Completed','Invoiced'];
 const b=bookings.find(x=>x.id===id);
 if(!b)return;

 // Resolve current stage index
 let currStage = b.status||'Scheduled';
 if(currStage==='Completed'&&!b.docketUploaded) currStage='Docket Verification';
 let idx=stages.indexOf(currStage);
 if(idx===-1) idx=0;

 let nextIdx = dir==='next' ? idx+1 : idx-1;
 if(nextIdx < 0 || nextIdx >= stages.length) return;

 const targetStage = stages[nextIdx];

 // Chronological Lock Safeguard: Future jobs cannot be moved to Invoiced
 if(targetStage==='Invoiced' && new Date(b.startTime) > new Date()){
 showToast(` Chronological Safeguard: Job for ${b.clientName} is scheduled in the future and cannot be moved to Invoiced until work is executed.`);
  return;
 }

 // Billing Lockout Safeguard: Cannot move to Completed/Invoiced without verified docket
 if((targetStage==='Completed'||targetStage==='Invoiced') && !b.docketUploaded && currStage==='Docket Verification'){
  showToast(` Billing Lockout: You must click "Upload Field Docket" to verify hours via DocuWare Intelligent Indexing before advancing.`);
  return;
 }

 b.status = targetStage;
 renderJobBoard();
 renderCalendar();
}

/* ── PHASE 4: CLIENTS DIRECTORY & DOCUWARE SMART CONNECT ── */
function openClientStatementPDF(clientName){
 const modal=document.getElementById('docuware-statement-modal');
 const titleEl=document.getElementById('statement-modal-title');
 const bodyEl=document.getElementById('statement-modal-body');
 if(!modal||!bodyEl)return;

 titleEl.textContent=`Compiled Account Statement — ${clientName}`;

 const clientBookings=bookings.filter(b=>b.clientName===clientName);
 let invoicedTotal=0;
 let wipTotal=0;

 clientBookings.forEach(b=>{
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const rev=dur*rate;

  if(b.status==='Invoiced') invoicedTotal+=rev;
  else wipTotal+=rev;
 });

 const grandTotal=invoicedTotal+wipTotal;

 let html=`
 <div style="background:var(--bg-primary);border:1px solid var(--border-strong);padding:24px;border-radius:var(--radius-md);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:16px;font-family:'Inter',sans-serif;">
  
  <!-- Statement Letterhead -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--brand-primary);padding-bottom:14px;">
   <div>
    <div style="font-size:18px;font-weight:800;color:var(--brand-primary);letter-spacing:-0.3px;">HIREENGINE HEAVY EQUIPMENT HIRE PTY LTD</div>
    <div style="font-size:11px;color:var(--text-muted);">ABN 48 912 401 882 | Operations Control HQ — Queensland</div>
   </div>
   <div style="text-align:right;">
    <span class="dw-status-pill signed" style="font-size:10px;"> DocuWare Verified Vault Record</span>
    <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-top:4px;">Date: ${formatAUDate(new Date().toISOString())}</div>
   </div>
  </div>

  <!-- Account Details -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);font-size:12px;">
   <div>
    <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;">Statement Customer</div>
    <div style="font-size:15px;font-weight:800;color:var(--text-primary);margin-top:2px;">${clientName}</div>
    <div style="color:var(--text-secondary);margin-top:2px;">Commercial Credit Account</div>
   </div>
   <div style="text-align:right;">
    <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;">Statement Reference</div>
    <div style="font-family:monospace;font-size:14px;font-weight:700;color:var(--accent-primary);">#DW-STMT-${Math.floor(100000+Math.random()*900000)}</div>
    <div style="color:var(--text-secondary);margin-top:2px;">Billing Cycle: Active Month</div>
   </div>
  </div>

  <!-- Summary Box -->
  <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;">
   <div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);padding:12px;border-radius:var(--radius-md);text-align:center;">
    <div style="font-size:10px;font-weight:800;color:#10b981;text-transform:uppercase;">Invoiced Revenue</div>
    <div style="font-size:18px;font-weight:800;color:#10b981;margin-top:2px;">${formatAUDCurrency(invoicedTotal)}</div>
   </div>
   <div style="background:rgba(217,119,6,0.06);border:1px solid rgba(217,119,6,0.2);padding:12px;border-radius:var(--radius-md);text-align:center;">
    <div style="font-size:10px;font-weight:800;color:#d97706;text-transform:uppercase;">Unbilled WIP</div>
    <div style="font-size:18px;font-weight:800;color:#d97706;margin-top:2px;">${formatAUDCurrency(wipTotal)}</div>
   </div>
   <div style="background:var(--bg-secondary);border:1px solid var(--border-strong);padding:12px;border-radius:var(--radius-md);text-align:center;">
    <div style="font-size:10px;font-weight:800;color:var(--text-primary);text-transform:uppercase;">Total Financial Exposure</div>
    <div style="font-size:18px;font-weight:800;color:var(--text-primary);margin-top:2px;">${formatAUDCurrency(grandTotal)}</div>
   </div>
  </div>

  <!-- Live Document Index Ledger -->
  <div style="font-size:12px;font-weight:800;color:var(--text-primary);margin-top:4px;">Underlying Indexed DocuWare Files (${clientBookings.length} Records)</div>
  <div class="compliance-table-wrap">
   <table class="compliance-table">
    <thead>
     <tr>
      <th>Document Type</th>
      <th>DocID</th>
      <th>Date</th>
      <th>Status</th>
      <th>Amount ($ AUD)</th>
     </tr>
    </thead>
    <tbody>`;

 clientBookings.forEach(b=>{
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const rev=dur*rate;
  const dateStr=formatAUDate(b.startTime);

  html+=`
  <tr>
   <td><strong>${b.assetNumber} Plant Deployment</strong> (${b.jobDescription||'Plant hire'})</td>
   <td style="font-family:monospace;font-size:11px;">#DW-DOC-${b.id}</td>
   <td>${dateStr}</td>
   <td><span class="dw-status-pill ${b.status==='Invoiced'?'signed':'pending'}">${b.status==='Invoiced'?'Invoiced & Archived':'Unbilled WIP'}</span></td>
   <td style="font-weight:700;color:var(--text-primary);">${formatAUDCurrency(rev)}</td>
  </tr>`;
 });

 html+=`</tbody></table></div>
 <div style="font-size:11px;color:var(--text-muted);text-align:center;font-style:italic;margin-top:4px;">
   Official document statement generated by DocuWare Smart Connect API. Archived in Cloud Vault.
 </div>
 </div>`;

 bodyEl.innerHTML=html;
 modal.classList.add('open');
}

/* ── ENTERPRISE CLIENT DIRECTORY WITH FINANCIAL PIPELINE FLOW ── */

/* ── PHASE 2.5: OPERATOR PORTAL (MOBILE-FIRST EMULATION) ── */
window._selectedOperatorId = null;

function renderOperatorPortal() {
  const container = document.getElementById('operator-portal-container');
  if (!container) return;
  
  let optionsHtml = '<option value="">-- Select your Operator ID --</option>';
  workerRegistry.forEach(w => {
     optionsHtml += `<option value="${w.id}" ${window._selectedOperatorId === w.id ? 'selected' : ''}>${w.name} (${w.role})</option>`;
  });

  let html = `
    <div style="max-width:600px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:24px;">
      <div style="background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:24px;box-shadow:var(--shadow-md);">
        <h2 style="font-size:18px;color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Field Operator Login
        </h2>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Select your identity to access today's Run Sheet.</p>
        <select class="module-filter-select" style="width:100%;font-size:14px;padding:10px;" onchange="window._selectedOperatorId = this.value; renderOperatorPortal();">
          ${optionsHtml}
        </select>
      </div>
  `;

  if (window._selectedOperatorId) {
    const todayISO = currentDate.toDateString();
    const myJobs = bookings.filter(b => {
      const isToday = new Date(b.startTime).toDateString() === todayISO;
      const isMe = b.wetHireResources?.some(r => r.workerId === window._selectedOperatorId) || b.operatorName === workerRegistry.find(w=>w.id===window._selectedOperatorId).name;
      return isToday && isMe;
    });

    html += `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <h3 style="font-size:16px;color:var(--text-primary);margin-top:8px;">My Run Sheet (Today)</h3>
    `;

    if (myJobs.length === 0) {
      html += `<div style="padding:24px;background:var(--bg-secondary);border-radius:var(--radius-md);text-align:center;color:var(--text-muted);font-size:13px;">No jobs dispatched for you today.</div>`;
    } else {
      myJobs.forEach(b => {
        const isPrestartDone = b.preStartStatus === 'pushed' || b.preStartStatus === 'completed';
        const startT = new Date(b.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        
        html += `
          <div style="background:var(--bg-secondary);border:1px solid ${isPrestartDone ? 'var(--border-strong)' : 'var(--accent-primary)'};border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);">
            <!-- Card Header -->
            <div style="background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border-light);padding:16px;display:flex;justify-content:space-between;align-items:center;">
               <div>
                 <div style="font-size:15px;font-weight:700;color:var(--text-primary);">${b.clientName}</div>
                 <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${b.siteAddress}</div>
               </div>
               <div style="text-align:right;">
                 <div style="font-size:14px;font-weight:800;color:var(--accent-blue);">${startT}</div>
                 <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Asset: ${b.assetNumber}</div>
               </div>
            </div>
            
            <!-- Actions -->
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
              ${!isPrestartDone ? `
                <div style="background:rgba(234, 179, 8, 0.1);border:1px solid rgba(234, 179, 8, 0.3);padding:12px;border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px;">
                  <span style="font-size:20px;">⚠️</span>
                  <div style="flex:1;">
                    <div style="font-size:12px;font-weight:700;color:var(--color-warning);">Compliance Lock Active</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">You must complete the Asset Pre-Start Checklist before accessing the Digital Docket.</div>
                  </div>
                  <button class="kb-primary-btn" style="background:var(--color-warning) !important;color:#000 !important;font-weight:800;" onclick="executeMobilePreStart('${b.id}')">Start Checklist</button>
                </div>
              ` : `
                <div style="display:flex;gap:12px;">
                  <button class="kb-primary-btn" style="flex:1;background:var(--color-compliant) !important;" disabled>✅ Pre-Start Passed</button>
                  <button class="kb-primary-btn" style="flex:1;" onclick="openDocuWareDocketModal('${b.id}')">📝 Digital Docket</button>
                </div>
              `}
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

window.executeMobilePreStart = function(bookingId) {
  const b = bookings.find(x => x.id === bookingId);
  if(b) {
    b.preStartStatus = 'completed';
    showToast('Asset Pre-Start Checklist successfully synced to DocuWare. Docket Unlocked.', 'success');
    renderOperatorPortal();
  }
};

function renderClientsView(){
 const container=document.getElementById('clients-container');
 if(!container)return;

 const searchQuery=(document.getElementById('client-search')?.value||'').toLowerCase().trim();
 const sortOption=document.getElementById('client-sort-filter')?.value||'revenue_desc';

 const creditTermsMap={
  'BuildCorp Inc.':'30-Day Credit Approved',
  'Civil Works Pty Ltd':'30-Day Credit Approved',
  'Apex Constructions':'14-Day Credit Approved',
  'Fulton Hogan':'30-Day Credit Approved',
  'Lendlease Group':'30-Day Credit Approved',
  'CPB Contractors':'30-Day Credit Approved',
  'John Holland Group':'30-Day Credit Approved',
  'Multiplex Constructions':'30-Day Credit Approved',
  'Civil Mining & Construction':'30-Day Credit Approved',
  'City Infrastructure':'Pre-paid / COD',
  'Metro Rail Authority':'30-Day Credit Approved',
  'Urban Developers QLD':'14-Day Credit Approved',
  'Metro Transport':'Pre-paid / COD',
  'Sunshine Coast Council':'30-Day Credit Approved',
  'Noosa Developments':'14-Day Credit Approved',
  'Sunshine Coast Hospital':'30-Day Credit Approved'
 };

 const clientMap={};
 let grandTotalRevenue=0;
 let grandTotalDeployments=0;
 let grandTotalUnbilled=0;

 bookings.forEach(b=>{
  const c=b.clientName||'Unknown Client';
  if(!clientMap[c]){
   clientMap[c]={
    name:c,
    jobs:0,
    totalSpend:0,
    unbilledSpend:0,
    invoicedSpend:0,
    assetsUsed:new Set(),
    lastJob:b.startTime,
    creditTerms:creditTermsMap[c]||'30-Day Credit Approved'
   };
  }
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const rev=dur*rate;

  clientMap[c].jobs++;
  clientMap[c].totalSpend+=rev;

  // Dynamic WIP vs Invoiced split based on live document status
  if(b.status==='Invoiced') {
   clientMap[c].invoicedSpend+=rev;
  } else {
   clientMap[c].unbilledSpend+=rev;
   grandTotalUnbilled+=rev;
  }

  clientMap[c].assetsUsed.add(b.assetNumber);
  if(new Date(b.startTime)>new Date(clientMap[c].lastJob)) clientMap[c].lastJob=b.startTime;

  grandTotalRevenue+=rev;
  grandTotalDeployments++;
 });

 let clients=Object.values(clientMap);

 // Search filter
 if(searchQuery){
  clients=clients.filter(c=>
   c.name.toLowerCase().includes(searchQuery)||
   Array.from(c.assetsUsed).some(a=>a.toLowerCase().includes(searchQuery))
  );
 }

 // Sort
 if(sortOption==='revenue_desc') clients.sort((a,b)=>b.totalSpend-a.totalSpend);
 else if(sortOption==='jobs_desc') clients.sort((a,b)=>b.jobs-a.jobs);
 else if(sortOption==='name_asc') clients.sort((a,b)=>a.name.localeCompare(b.name));

 const activeAccountsCount=clients.length;
 const formattedGrandTotal=formatAUDCurrency(grandTotalRevenue);
 const formattedUnbilled=formatAUDCurrency(grandTotalUnbilled);

 let html=`
 <!-- Client Directory KPI Header Bar -->
 <div class="client-kpi-bar">
  <div class="client-kpi-card glass-panel">
   <div class="ck-label">Active Client Accounts</div>
   <div class="ck-val">${activeAccountsCount}</div>
   <div class="ck-sub">Commercial Plant Hire Customers</div>
  </div>
  <div class="client-kpi-card glass-panel">
   <div class="ck-label">Total Portfolio Billed</div>
   <div class="ck-val" style="color:var(--accent-primary);">${formattedGrandTotal}</div>
   <div class="ck-sub">Across ${grandTotalDeployments} plant hire deployments</div>
  </div>
  <div class="client-kpi-card glass-panel">
   <div class="ck-label">Unbilled Work-In-Progress</div>
   <div class="ck-val" style="color:#d97706;">${formattedUnbilled}</div>
   <div class="ck-sub">Active &amp; scheduled job revenue</div>
  </div>
 </div>

 <!-- Enterprise Client Table with Financial Pipeline Flow -->
 <div class="compliance-table-wrap">
  <table class="compliance-table">
   <thead>
    <tr>
     <th>Client Account Name</th>
     <th>Credit Terms &amp; Risk Alert</th>
     <th style="text-align:center;">Jobs</th>
     <th>Financial Flow (WIP vs Invoiced)</th>
     <th>Total Exposure</th>
     <th>Equipment Hired</th>
     <th>Last Active</th>
     <th>Account Actions</th>
    </tr>
   </thead>
   <tbody>`;

 if(clients.length===0){
  html+=`<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No client accounts match your search query.</td></tr>`;
 } else {
  clients.forEach(c=>{
   const formattedTotal=formatAUDCurrency(c.totalSpend);
   const formattedWip=formatAUDCurrency(c.unbilledSpend);
   const formattedInv=formatAUDCurrency(c.invoicedSpend);
   const assetsList=Array.from(c.assetsUsed).join(', ');
   const lastDate=formatAUDate(c.lastJob);

   // Automated Credit Risk Logic: If exposure > $10,000, trigger Amber Warning Badge!
   let termBadgeHtml=`<span class="status-pill valid"> ${c.creditTerms}</span>`;
   if(c.creditTerms.includes('Pre-paid')){
    termBadgeHtml=`<span class="status-pill warning">${c.creditTerms}</span>`;
   } else if(c.totalSpend > 10000){
    termBadgeHtml=`<span class="status-pill warning"> Credit Limit Approaching</span>`;
   }

   const total=c.totalSpend||1;
   const pctInv=Math.round((c.invoicedSpend/total)*100);
   const pctWip=100-pctInv;

   html+=`<tr style="cursor:pointer;" onclick="openClientLedger('${c.name.replace(/'/g,"\\'")}')" title="Click to view detailed job & financial ledger">
    <td style="font-weight:800;font-size:14px;color:var(--text-primary);">${c.name}</td>
    <td>${termBadgeHtml}</td>
    <td style="font-weight:800;text-align:center;">${c.jobs}</td>
    <td style="min-width:190px;">
     <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:4px;">
      <span style="color:#d97706;">WIP: ${formattedWip}</span>
      <span style="color:#10b981;">Inv: ${formattedInv}</span>
     </div>
     <div style="height:7px;width:100%;background:rgba(217,119,6,0.18);border-radius:4px;overflow:hidden;display:flex;">
      <div style="width:${pctWip}%;background:#d97706;height:100%;" title="Unbilled WIP: ${formattedWip}"></div>
      <div style="width:${pctInv}%;background:#10b981;height:100%;" title="Invoiced Revenue: ${formattedInv}"></div>
     </div>
    </td>
    <td style="font-weight:800;color:var(--accent-primary);font-size:14px;">${formattedTotal}</td>
    <td style="font-size:12px;color:var(--text-secondary);">${assetsList}</td>
    <td style="font-weight:600;font-size:12px;">${lastDate}</td>
    <td style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation();">
     <button class="dw-action-btn" style="background:var(--accent-primary);height:32px;padding:0 12px;font-size:11px;" onclick="openDocuWareSmartConnect('${c.name.replace(/'/g,"\\'")}')">
      View Ledger &amp; Jobs
     </button>
     <button class="dw-action-btn secondary" style="height:32px;padding:0 10px;font-size:11px;" onclick="openClientStatementPDF('${c.name.replace(/'/g,"\\'")}')">
      Statement PDF
     </button>
    </td>
   </tr>`;
  });
 }

 html+=`</tbody></table></div>`;

 container.innerHTML=html;
}

/* ── CLIENT FINANCIAL & OPERATIONAL LEDGER MODAL ── */
function openClientLedger(clientName){
 const modal=document.getElementById('client-ledger-modal');
 const body=document.getElementById('ledger-modal-body');
 const nameEl=document.getElementById('ledger-client-name');
 if(!modal||!body)return;

 nameEl.textContent=clientName;

 const clientBookings=bookings.filter(b=>b.clientName===clientName);
 let totalBilled=0;
 let invoicedCount=0;
 let pendingCount=0;

 clientBookings.forEach(b=>{
  const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
  const prefix=b.assetNumber.replace(/[0-9]/g,'');
  const rate=HOURLY_RATES[prefix]||200;
  const rev=dur*rate;
  totalBilled+=rev;

  if(b.status==='Invoiced'||b.status==='Completed') invoicedCount++;
  else pendingCount++;
 });

 const formattedBilled='$'+Math.round(totalBilled).toLocaleString()+' AUD';

 let html=`
 <!-- Client Summary Bar -->
 <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-lg);border:1px solid var(--border-light);">
  <div>
   <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Account Total Billed</div>
   <div style="font-size:20px;font-weight:800;font-family:'Inter',sans-serif;color:var(--accent-primary);margin-top:2px;">${formattedBilled}</div>
  </div>
  <div>
   <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Deployments Overview</div>
   <div style="font-size:14px;font-weight:700;margin-top:4px;">${clientBookings.length} Total Jobs (${invoicedCount} Invoiced / ${pendingCount} Active)</div>
  </div>
  <div>
   <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Billing Engine Sync</div>
   <div style="font-size:12px;font-weight:700;color:#10b981;margin-top:4px;">● Synchronized with Repository</div>
  </div>
 </div>

 <!-- Detailed Jobs & Financial Ledger Table -->
 <div class="compliance-table-wrap">
  <table class="compliance-table">
   <thead>
    <tr>
     <th>Date (DD/MM/YYYY)</th>
     <th>Job Ref</th>
     <th>Equipment Asset</th>
     <th>Job Scope / Description</th>
     <th>Hours</th>
     <th>Rate ($/hr)</th>
     <th>Total ($ AUD)</th>
     <th>Status</th>
     <th>Action</th>
    </tr>
   </thead>
   <tbody>`;

 if(clientBookings.length===0){
  html+=`<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted);">No booking records found for this account.</td></tr>`;
 } else {
  clientBookings.forEach(b=>{
   const dur=(new Date(b.endTime)-new Date(b.startTime))/3600000;
   const prefix=b.assetNumber.replace(/[0-9]/g,'');
   const rate=HOURLY_RATES[prefix]||200;
   const total=dur*rate;
   const dateStr=formatAUDate(b.startTime);
   const assetColor=ASSET_HEX[b.assetNumber]||'#1C4B8B';

   let statusBadge='<span class="status-pill valid">Invoiced</span>';
   if(b.status==='Scheduled') statusBadge='<span class="status-pill warning">Scheduled</span>';
   else if(b.status==='On-Site') statusBadge='<span class="status-pill valid" style="background:rgba(26,86,219,0.1);color:#1a56db;">On-Site</span>';
   else if(b.status==='Urgent') statusBadge='<span class="status-pill expired">Urgent</span>';

   html+=`<tr>
    <td style="font-weight:600;">${dateStr}</td>
    <td style="font-family:monospace;font-weight:700;">#${b.id}</td>
    <td><span class="kb-asset-badge" style="background:${assetColor};">${b.assetNumber}</span></td>
    <td style="font-size:12px;">${b.jobDescription||'Plant hire operation'}</td>
    <td style="font-weight:700;text-align:center;">${dur.toFixed(1)} hrs</td>
    <td style="font-weight:600;">$${rate}/hr</td>
    <td style="font-weight:700;color:var(--accent-primary);">$${Math.round(total).toLocaleString()}</td>
    <td>${statusBadge}</td>
    <td>
     <button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="triggerDocuWareDoc('${b.id}','${clientName}')">
      View Docket
     </button>
    </td>
   </tr>`;
  });
 }

 html+=`</tbody></table></div>`;

 body.innerHTML=html;
 modal.classList.add('open');
}

function closeClientLedger(){
 const modal=document.getElementById('client-ledger-modal');
 if(modal) modal.classList.remove('open');
}

function exportClientLedgerPDF(){
 const name=document.getElementById('ledger-client-name').textContent;
 showToast(`⚡ Exporting Comprehensive Commercial Account Ledger PDF for ${name}...\nIncludes all deployment history, hourly rate breakdowns, and verified invoice records.`);
}

/* ── PHASE 5: COMPLIANCE & CERTS ENFORCEMENT ── */

function openCertViewModal(assetId){
 currentCertAssetId = assetId;
 const modal=document.getElementById('docuware-cert-view-modal');
 const titleEl=document.getElementById('cert-view-title');
 const bodyEl=document.getElementById('cert-view-body');
 if(!modal||!bodyEl)return;

 const comp=complianceRegistry[assetId]||{rego:'REG-8800',certDate:'2026-12-31',status:'valid',risk:'Low'};
 const asset=assetRegistry.find(a=>a.id===assetId)||{description:'Plant equipment'};

 titleEl.textContent=`DocuWare Cert Record — ${assetId} (${asset.description})`;

 let statusBadgeHtml=`<span class="status-pill valid"> Valid Compliance Record</span>`;
 if(comp.status==='warning') statusBadgeHtml=`<span class="status-pill warning"> Service Due (30d)</span>`;
 else if(comp.status==='expired') statusBadgeHtml=`<span class="status-pill expired"> Cert Expired (LOCKED)</span>`;

 let html=`
 <div style="display:flex;flex-direction:column;gap:14px;font-family:'Inter',sans-serif;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);font-size:12px;">
   <div>
    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Registration Number</div>
    <div style="font-family:'Inter',monospace;font-size:14px;font-weight:800;color:var(--text-primary);margin-top:2px;font-variant-numeric:tabular-nums;">${comp.rego}</div>
   </div>
   <div>
    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Current Expiry Date</div>
    <div style="font-family:'Inter',monospace;font-size:14px;font-weight:800;color:var(--text-primary);margin-top:2px;font-variant-numeric:tabular-nums;">${formatAUDate(comp.certDate)}</div>
   </div>
   <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border-light);">
    <span style="font-size:11px;font-weight:700;color:var(--text-secondary);">Compliance Status:</span>
    ${statusBadgeHtml}
   </div>
  </div>

  <!-- DocuWare Drag-and-Drop Zone -->
  <div style="border:2px dashed var(--accent-primary);background:var(--bg-secondary);border-radius:var(--radius-md);padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;" onclick="showToast('Select updated inspection PDF to upload into DocuWare Safety Cabinet...')">
   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
   <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Upload Updated Risk Audit / Service Record</div>
   <div style="font-size:11px;color:var(--text-muted);">Drag and drop PDF certificate file here or click to browse</div>
  </div>

  <div style="font-size:11px;color:var(--text-muted);font-style:italic;line-height:1.4;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);padding:10px 12px;border-radius:var(--radius-md);">
   ℹ️ <strong>Automation Proof:</strong> Documents uploaded here are instantly indexed into the DocuWare Safety Cabinet and will automatically update the registry expiry date.
  </div>
 </div>`;

 bodyEl.innerHTML=html;
 modal.classList.add('open');
}

function saveCertUpdate(){
 if(currentCertAssetId && complianceRegistry[currentCertAssetId]){
  complianceRegistry[currentCertAssetId].status='valid';
  complianceRegistry[currentCertAssetId].certDate='2027-08-30';
 }
 closeDocuWareModal('docuware-cert-view-modal');
 renderComplianceView();
 renderCalendar();
 showToast(`✅ DocuWare Webhook: Compliance record updated for ${currentCertAssetId}. Registry synchronized!`);
}

function openCertUploadModal(assetId){
 currentCertAssetId = assetId;
 const modal=document.getElementById('docuware-cert-upload-modal');
 const titleEl=document.getElementById('cert-upload-title');
 const bodyEl=document.getElementById('cert-upload-body');
 if(!modal||!bodyEl)return;

 const comp=complianceRegistry[assetId]||{rego:'REG-9909-CR',certDate:'2026-07-30',status:'expired'};
 const asset=assetRegistry.find(a=>a.id===assetId)||{description:'Crawler Crane'};

 titleEl.textContent=`Release Safety Lock — ${assetId} (${asset.description})`;

 let html=`
 <div style="display:flex;flex-direction:column;gap:14px;font-family:'Inter',sans-serif;">
  <div style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(220,38,38,0.3);padding:14px;border-radius:var(--radius-md);display:flex;align-items:center;gap:12px;">
   <div style="font-size:24px;"></div>
   <div>
    <div style="font-size:13px;font-weight:800;color:#dc2626;">HARD DISPATCH INTERLOCK ACTIVE (${assetId})</div>
    <div style="font-size:11px;color:#991b1b;margin-top:2px;">Service certificate expired on ${formatAUDate(comp.certDate)}. Column is locked in Command Center.</div>
   </div>
  </div>

  <div class="form-group">
   <label>New Certificate Expiry Date</label>
   <input type="date" id="new-cert-date" value="2027-08-30" style="font-family:'Inter',monospace;">
  </div>
  <div class="form-group">
   <label>Certifying Engineer / Inspector</label>
   <input type="text" id="new-cert-inspector" value="QAS Safety Certifications Queensland">
  </div>

  <div style="border:2px dashed #10b981;background:rgba(5,150,105,0.04);border-radius:var(--radius-md);padding:18px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;" onclick="showToast('Select certified inspection PDF to attach...')">
   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
   <div style="font-size:12px;font-weight:700;color:#10b981;">Attach Signed Inspection &amp; Test Plan (ITP) PDF</div>
   <div style="font-size:10px;color:var(--text-muted);">Triggers DocuWare Webhook to automatically lift lock</div>
  </div>
 </div>`;

 bodyEl.innerHTML=html;
 modal.classList.add('open');
}

function executeCertLockRelease(){
 if(currentCertAssetId && complianceRegistry[currentCertAssetId]){
  complianceRegistry[currentCertAssetId].status='valid';
  complianceRegistry[currentCertAssetId].certDate='2027-08-30';
 }
 closeDocuWareModal('docuware-cert-upload-modal');
 renderComplianceView();
 renderCalendar();
 showToast(`✅ DocuWare Webhook Event Triggered!\n\nSafety compliance lock successfully RELEASED for ${currentCertAssetId}.\nAsset column is now UNLOCKED for dispatch in the Command Center.`);
}

/* ── COMPLIANCE & CERTS WITH SEARCH & FILTER ── */
function renderComplianceView(){
 const container=document.getElementById('compliance-container');
 if(!container)return;

 const searchQuery=(document.getElementById('compliance-search')?.value||'').toLowerCase().trim();
 const statusFilter=document.getElementById('compliance-status-filter')?.value||'ALL';

 let list=assetRegistry.map(a=>{
  const comp=complianceRegistry[a.id]||{rego:'REG-8800',certDate:'2026-12-31',status:'valid',risk:'Low'};
  return {
   id:a.id,
   type:a.description,
   rego:comp.rego,
   certDate:comp.certDate,
   status:comp.status,
   risk:comp.risk||'Low'
  };
 });

 if(searchQuery){
  list=list.filter(item=>
   item.id.toLowerCase().includes(searchQuery)||
   item.type.toLowerCase().includes(searchQuery)||
   item.rego.toLowerCase().includes(searchQuery)
  );
 }

 if(statusFilter!=='ALL'){
  list=list.filter(item=>item.status===statusFilter);
 }

 let html=`<div class="compliance-table-wrap">
  <table class="compliance-table">
   <thead>
    <tr>
     <th>Asset Code</th>
     <th>Description</th>
     <th>Registration #</th>
     <th>Service / Risk Cert Expiry (DD/MM/YYYY)</th>
     <th>Compliance Status</th>
     <th>Document Repository &amp; Webhook Trigger</th>
    </tr>
   </thead>
   <tbody>`;

 if(list.length===0){
  html+=`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No compliance records match criteria.</td></tr>`;
 } else {
  list.forEach(item=>{
   let pillCls='valid';let pillText=' Valid Record';
   let rowStyle='';
   if(item.status==='warning'){
    pillCls='warning';
    pillText=' Service Due (30d)';
   }
   else if(item.status==='expired'){
    pillCls='expired';
    pillText=' Cert Expired (LOCKED)';
    rowStyle='class="expired-row"';
   }

   const formattedCertDate=formatAUDate(item.certDate);

   html+=`<tr ${rowStyle}>
    <td style="font-weight:800;font-size:13px;color:var(--text-primary);">${item.id}</td>
    <td style="font-weight:600;">${item.type}</td>
    <td style="font-family:'Inter',monospace;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;">${item.rego}</td>
    <td style="font-family:'Inter',monospace;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;">${formattedCertDate}</td>
    <td><span class="status-pill ${pillCls}">${pillText}</span></td>
    <td style="display:flex;gap:6px;align-items:center;">
     ${item.status==='expired' ? `
      <button class="dw-action-btn" style="height:32px;padding:0 12px;font-size:11px;background:#dc2626;" onclick="openCertUploadModal('${item.id}')">
       📄 Upload New Cert to DocuWare (Release Lock)
      </button>
     ` : `
      <button class="dw-action-btn secondary" style="height:32px;padding:0 12px;font-size:11px;" onclick="openCertViewModal('${item.id}')">
       Fetch Cert Record
      </button>
     `}
    </td>
   </tr>`;
  });
 }

 html+=`</tbody></table></div>`;
 container.innerHTML=html;
}

/* ── NOTIFICATIONS DRAWER ── */
function toggleNotifications(){
 const overlay=document.getElementById('notifications-overlay');
 if(!overlay)return;
 overlay.classList.toggle('open');
 if(overlay.classList.contains('open')) renderNotifications();
}

function renderNotifications(){
 const body=document.getElementById('notifications-body');
 if(!body)return;

 const items=[
  {type:'urgent',title:'High Risk Compliance Flag',msg:'CR09 Crawler Crane service certificate expired on 30/07/2026. Future bookings flagged for risk review.',time:'10 mins ago'},
  {type:'dw',title:'Automated Document Event',msg:'Hire Agreement #HA-9942 signed & archived for Fulton Hogan (Job b23).',time:'1 hour ago'},
  {type:'normal',title:'Maintenance Scheduled',msg:'EX02 Excavator 35T service due in 12 days (16/08/2026).',time:'3 hours ago'},
  {type:'dw',title:'Billing Record Archived',msg:'Automated billing engine filed invoice for Metro Rail Authority ($2,400 AUD).',time:'Yesterday'}
 ];

 body.innerHTML=items.map(item=>`
  <div class="notif-item ${item.type}">
   <div class="notif-title">${item.title}</div>
   <div class="notif-msg">${item.msg}</div>
   <div class="notif-time">${item.time}</div>
  </div>
 `).join('');
}


function renderWorkersView() {
  const container = document.getElementById('workers-container');
  if (!container) return;

  const searchQuery = (document.getElementById('workers-search')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('workers-role-filter')?.value || 'ALL';

  let list = [...workerRegistry];
  if (searchQuery) {
    list = list.filter(w =>
      w.name.toLowerCase().includes(searchQuery) ||
      w.role.toLowerCase().includes(searchQuery) ||
      w.licenses.some(l => l.licenseNumber.toLowerCase().includes(searchQuery) || l.type.toLowerCase().includes(searchQuery))
    );
  }
  if (roleFilter !== 'ALL') {
    list = list.filter(w => w.role.toLowerCase().includes(roleFilter.toLowerCase()));
  }

  if (list.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);">No workers match this filter.</div>';
    return;
  }

  const cardsHtml = list.map(w => {
    const initials = w.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Determine overall worker compliance status
    const allLicenseStatuses = w.licenses.map(l => getLicenseStatus(l.expiry));
    let workerBadgeClass = 'valid';
    if (allLicenseStatuses.some(s => s === 'expired')) workerBadgeClass = 'expired';
    else if (allLicenseStatuses.some(s => s === 'warning')) workerBadgeClass = 'warning';

    const licensesHtml = w.licenses.map(lic => {
      const status = getLicenseStatus(lic.expiry);
      const days = daysUntilExpiry(lic.expiry);
      const expiryClass = status === 'expired' ? 'expired' : status === 'warning' ? 'expiring' : '';
      const daysText = status === 'expired' ? `Expired ${lic.expiry}` : `Expires ${lic.expiry} (${days}d)`;
      return `
        <div class="license-row">
          <span class="license-type-badge ${status}">${lic.type}</span>
          <div class="license-details">
            <div class="license-number">${lic.licenseNumber} &bull; ${lic.state}</div>
            <div class="license-expiry ${expiryClass}">${daysText}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="worker-card">
        <div class="worker-card-header">
          <div class="worker-avatar">${initials}</div>
          <div class="worker-info">
            <div class="worker-name">${w.name}</div>
            <div class="worker-role">${w.role} &bull; <span class="status-pill ${workerBadgeClass}" style="display:inline-flex;padding:1px 7px;font-size:10px;">${workerBadgeClass === 'valid' ? 'Licences Current' : workerBadgeClass === 'warning' ? 'Licence Expiring' : 'Licence Expired'}</span></div>
          </div>
        </div>
        <div class="worker-contact">
          <span>${w.phone}</span>
          <span>${w.email}</span>
        </div>
        <div class="license-list">
          ${licensesHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="worker-registry-grid">${cardsHtml}</div>`;
}



document.addEventListener('DOMContentLoaded', () => {
  // Add toast container to body
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }

  // Sanitize chronological integrity
  bookings.forEach(sanitizeBookingChronology);

  // Populate hour selects
  populateHourSelect(document.getElementById('display-start-hour'), displayHoursStart, true);
  populateHourSelect(document.getElementById('display-end-hour'), displayHoursEnd, false);
  populateHourSelect(document.getElementById('settings-work-start'), displayHoursStart, true);
  populateHourSelect(document.getElementById('settings-work-end'), displayHoursEnd, false);

  syncAssets();
  renderFilterBar();
  renderAssetManager();

  const transposeBtn = document.getElementById('day-transpose-btn');
  if (transposeBtn) { transposeBtn.style.display = 'flex'; updateTransposeLabel(); }

  renderCalendar();
  applyDatePreset();
  renderWorkersView();
});

// Expose all functions called from inline HTML event handlers to global scope
Object.assign(window, {
  openSwmsModal: (id) => document.getElementById('swms-modal').style.display = 'flex',
  openPrestartModal: (id) => document.getElementById('prestart-modal').style.display = 'flex',
  switchTab, openModal, closeModal, saveBooking, deleteBooking,
  editBooking, openDatePicker, closeDatePicker, 
  
  changeDate, goToToday, goToDay, setCalendarView, toggleDayTranspose, 
  toggleAssetFilter, clearAssetFilter,
  toggleNotifications, toggleLegendPopover,
  renderAssetManager, updateAssetDesc, updateAssetHex, updateAssetHexText,
  addAsset: window._addNewAssetFromForm, promptDeleteAsset, cancelDeleteAsset, confirmDeleteAsset,
  renderAnalytics, exportReport, applyDatePreset, saveDocuWare, saveWorkHours, renderOperatorPortal,
  openDocuWareContractModal, executeDocuWareSign,
  openDocuWareDocketModal, recalcDocketTotal, executeDocketUpload,
  openDocuWareSmartConnect, closeDocuWareModal, indexDocuWareCert,
  openCertViewModal, saveCertUpdate, openCertUploadModal, executeCertLockRelease,
  openClientLedger, closeClientLedger, exportClientLedgerPDF, openClientStatementPDF,
  moveBookingStatus,  startPaint, startPaintWeek,
  renderWorkersView,
});

// Missing stub restored
function triggerDocuWareDoc(id, client) {
    showToast(`Invoice for ${client} generated via DocuWare`, 'success');
}
window.triggerDocuWareDoc = triggerDocuWareDoc;




window.toggleSidebar = function() {
    const sb = document.querySelector('.gcal-sidebar');
    if(sb) {
        sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
    }
};
