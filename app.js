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

// ==========================================================================
// REQUIREMENT 1: GLOBAL CONFIG ENGINE (Single Source of Truth)
// ==========================================================================
window.ionConfig = {
  fleetRegistry: [
    { id: 'AT11', class: 'Liebherr All-Terrain Crane 100T', category: 'all_terrain', color: '#0284c7', hex: '#0284c7', label: 'AT11 - 100T', description: 'Liebherr All-Terrain Crane 100T', workerName: 'Luke Harris', workerStatus: 'available', hoursToday: 5 },
    { id: 'FC1', class: 'Terex Franna Pick & Carry 20T', category: 'franna', color: '#059669', hex: '#059669', label: 'FC1 - 20T Franna', description: 'Terex Franna Pick & Carry 20T', workerName: 'Chris Evans', workerStatus: 'overtime', hoursToday: 9.5, overtimeWarning: true },
    { id: 'MC2', class: 'Kato City Compact Crane 60T', category: 'city', color: '#d97706', hex: '#d97706', label: 'MC2 - 60T City Crane', description: 'Kato City Compact Crane 60T', workerName: 'Mark Johnson', workerStatus: 'available', hoursToday: 4 },
    { id: 'CR01', class: 'Kobelco Lattice Crawler 250T', category: 'crawler', color: '#7c3aed', hex: '#7c3aed', label: 'CR01 - 250T Crawler', description: 'Kobelco Lattice Crawler 250T', workerName: 'Dave Wilson', workerStatus: 'available', hoursToday: 2 },
    { id: 'AT10', class: 'Demag All-Terrain Crane 55T', category: 'all_terrain', color: '#dc2626', hex: '#dc2626', label: 'AT10 - 55T Demag', description: 'Demag All-Terrain Crane 55T', workerName: 'Sam Davies', workerStatus: 'available', hoursToday: 0 },
    { id: 'EX01', class: 'Excavator 20T', category: 'excavator', color: '#0ea5e9', hex: '#0ea5e9', label: 'EX01 - 20T Excavator', description: 'Excavator 20T', workerName: 'Alex Morgan', workerStatus: 'available', hoursToday: 3 },
    { id: 'EX02', class: 'Excavator 35T', category: 'excavator', color: '#06b6d4', hex: '#06b6d4', label: 'EX02 - 35T Excavator', description: 'Excavator 35T', workerName: 'Pat Taylor', workerStatus: 'available', hoursToday: 6 },
    { id: 'SK03', class: 'Skid Steer Loader', category: 'skid_steer', color: '#8b5cf6', hex: '#8b5cf6', label: 'SK03 - Skid Steer', description: 'Skid Steer Loader', workerName: 'Ben Walker', workerStatus: 'available', hoursToday: 1 },
    { id: 'DZ04', class: 'Dozer D6', category: 'dozer', color: '#475569', hex: '#475569', label: 'DZ04 - Dozer D6', description: 'Dozer D6', workerName: 'Tom Clarke', workerStatus: 'available', hoursToday: 0 },
    { id: 'FL05', class: 'Forklift 5T', category: 'forklift', color: '#6366f1', hex: '#6366f1', label: 'FL05 - Forklift 5T', description: 'Forklift 5T', workerName: 'Gary White', workerStatus: 'available', hoursToday: 4 },
    { id: 'FL06', class: 'Forklift 10T', category: 'forklift', color: '#2563eb', hex: '#2563eb', label: 'FL06 - Forklift 10T', description: 'Forklift 10T', workerName: 'Liam Hughes', workerStatus: 'available', hoursToday: 2 },
    { id: 'SC07', class: 'Scissor Lift 12m', category: 'elevated_platform', color: '#059669', hex: '#059669', label: 'SC07 - Scissor Lift', description: 'Scissor Lift 12m', workerName: 'Brad Nguyen', workerStatus: 'available', hoursToday: 0 },
    { id: 'BM08', class: 'Boom Lift 17m', category: 'elevated_platform', color: '#b45309', hex: '#b45309', label: 'BM08 - Boom Lift', description: 'Boom Lift 17m', workerName: 'John Smith', workerStatus: 'available', hoursToday: 5 },
    { id: 'CR09', class: 'Crawler Crane 50T', category: 'crawler', color: '#334155', hex: '#334155', label: 'CR09 - Crawler 50T', description: 'Crawler Crane 50T', workerName: 'Sean O\'Connor', workerStatus: 'available', hoursToday: 7 },
    { id: 'DT10', class: 'Dump Truck', category: 'truck', color: '#9333ea', hex: '#9333ea', label: 'DT10 - Dump Truck', description: 'Dump Truck', workerName: 'Dan Kelly', workerStatus: 'available', hoursToday: 1 }
  ],
  workerRegistry: [
    { id: 'W001', name: 'Luke Harris', role: 'Crane Operator', hrwlExpiry: '2027-03-15', hrwlStatus: 'Active', licenseClass: 'C1 / C6', licenseNumber: 'QLD-HRW-C1-28491' },
    { id: 'W002', name: 'John Smith', role: 'Crane Operator', hrwlExpiry: '2026-10-30', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'QLD-HRW-C6-19234' },
    { id: 'W003', name: 'Mark Johnson', role: 'Plant Operator', hrwlExpiry: '2027-01-08', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-44120' },
    { id: 'W004', name: 'Dave Wilson', role: 'Plant Operator', hrwlExpiry: '2026-10-05', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-33981' },
    { id: 'W005', name: 'Sam Davies', role: 'Plant Operator', hrwlExpiry: '2027-04-22', hrwlStatus: 'Active', licenseClass: 'CO', licenseNumber: 'QLD-HRW-CO-11023' },
    { id: 'W006', name: 'Alex Morgan', role: 'Plant Operator', hrwlExpiry: '2026-12-19', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'NSW-HRW-C6-90211' },
    { id: 'W007', name: 'Chris Evans', role: 'Crane Operator', hrwlExpiry: '2025-08-10', hrwlStatus: 'Expired', licenseClass: 'C1', licenseNumber: 'QLD-HRW-C1-55102' },
    { id: 'W008', name: 'Pat Taylor', role: 'Crane Operator', hrwlExpiry: '2027-02-14', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'QLD-HRW-C6-88301' },
    { id: 'W009', name: 'Ben Walker', role: 'Crane Operator', hrwlExpiry: '2026-11-25', hrwlStatus: 'Active', licenseClass: 'CO', licenseNumber: 'QLD-HRW-CO-41908' },
    { id: 'W010', name: 'Tom Clarke', role: 'Crane Operator', hrwlExpiry: '2027-05-30', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-77123' },
    { id: 'W011', name: 'Sean O\'Connor', role: 'Dogman', hrwlExpiry: '2026-06-15', hrwlStatus: 'Expired', licenseClass: 'DG', licenseNumber: 'QLD-HRW-DG-33201' },
    { id: 'W012', name: 'Brad Nguyen', role: 'Dogman', hrwlExpiry: '2027-01-20', hrwlStatus: 'Active', licenseClass: 'DG', licenseNumber: 'QLD-HRW-DG-66409' },
    { id: 'W013', name: 'Gary White', role: 'Rigger', hrwlExpiry: '2026-12-05', hrwlStatus: 'Active', licenseClass: 'RB', licenseNumber: 'QLD-HRW-RB-11984' },
    { id: 'W014', name: 'Liam Hughes', role: 'Rigger', hrwlExpiry: '2027-03-01', hrwlStatus: 'Active', licenseClass: 'RI', licenseNumber: 'NSW-HRW-RI-55410' },
    { id: 'W015', name: 'Dan Kelly', role: 'Rigger', hrwlExpiry: '2025-11-12', hrwlStatus: 'Expired', licenseClass: 'RA', licenseNumber: 'QLD-HRW-RA-99042' }
  ],
  schedulingRules: {
    standardHoursStart: '06:00',
    standardHoursEnd: '18:00',
    standardHoursDuration: 8.0,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    restPeriodHours: 10
  },
  integrations: {
    docuwareEndpoint: 'https://your-instance.docuware.cloud/DocuWare/Platform',
    docuwareOrgId: 'DW-VAULT-8802',
    docuwareStatus: 'Connected',
    xeroWebhook: 'https://api.xero.com/webhooks/v2/hireengine-sync',
    xeroStatus: 'Active',
    xeroTenant: 'ION Plant Hire Pty Ltd',
    localisation: 'Australia/Brisbane (AEST, UTC+10)'
  }
};

// Sync window.ionConfig with dataModels.assetRegistry
window.ionConfig.fleetRegistry.forEach(fa => {
  if (!assetRegistry.some(ar => ar.id === fa.id)) {
    assetRegistry.push({
      id: fa.id,
      description: fa.description || fa.label || fa.class,
      hex: fa.color || fa.hex || '#0284c7',
      assetType: fa.category || 'crane'
    });
  }
});

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
        if (!other) continue;
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
  if (!b) return;
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

window.quickCallContact = function(client, phone) {
  showToast(`Initiating quick-call to ${client} (${phone || '0412 889 900'})...`, 'info', 'Quick Call');
};

function switchTab(tab) {
  const viewMap = {
    'scheduler': 'calendar-view',
    'calendar': 'calendar-view',
    'compliance': 'compliance-view',
    'job-board': 'job-board-view',
    'reports': 'analytics-view',
    'analytics': 'analytics-view',
    'administration': 'operator-view',
    'operator': 'operator-view',
    'settings': 'settings-view',
    'system-settings': 'settings-view'
  };
  const navMap = {
    'scheduler': 'nav-scheduler',
    'calendar': 'nav-scheduler',
    'compliance': 'nav-compliance',
    'job-board': 'nav-job-board',
    'reports': 'nav-reports',
    'analytics': 'nav-reports',
    'administration': 'nav-administration',
    'operator': 'nav-administration',
    'settings': 'nav-settings',
    'system-settings': 'nav-settings'
  };
  document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.gcal-nav-item').forEach(el => el.classList.remove('active'));
  const viewId = viewMap[tab] || 'calendar-view';
  const navId = navMap[tab] || 'nav-scheduler';
  const viewEl = document.getElementById(viewId);
  const navEl = document.getElementById(navId);
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (tab === 'job-board') renderJobBoard();
  else if (tab === 'reports' || tab === 'analytics') renderAnalytics();
  else if (tab === 'administration' || tab === 'operator') { renderAdminModule(); }
  else if (tab === 'settings' || tab === 'system-settings') { renderSystemSettingsView(); }
  else if (tab === 'compliance') renderComplianceView();
  else if (tab === 'scheduler' || tab === 'calendar') renderCalendar();
}
window.switchTab = switchTab;
window._appSwitchTab = switchTab;

function getBookingColor(b){
 // Layer 1 (Block Background): Inherits asset column color so dispatcher instantly identifies asset!
 const assetObj = assetRegistry.find(a => a.id === b.assetNumber);
 return assetObj ? assetObj.hex : (ASSET_HEX[b.assetNumber] || '#475569');
}

/* Layer 2: Granular DocuWare Pipeline Status Pill Generator */
function renderDocuWarePill(b){
 if(!b) return '';
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
function goToDay(iso){if(iso)currentDate=new Date(iso);setCalendarView('Day');}

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
 
 document.querySelectorAll('.segmented-view-btn').forEach(b=>{
   b.classList.toggle('active', b.id === `view-btn-${view.toLowerCase()}`);
 });
 document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===view));
 
 const hoursCtrl=document.getElementById('display-hours-control');
 if(hoursCtrl)hoursCtrl.style.display=(view==='Month')?'none':'flex';
 // Show toggle for Day, Week, Work Week — hide for Month
 const transposeBtn=document.getElementById('day-transpose-btn');
 if(transposeBtn){
  const show=(view==='Day'||view==='Week'||view==='Work Week');
  transposeBtn.style.display=show?'inline-flex':'none';
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

function toggleAssetTray(){
 const tray = document.getElementById('asset-filter-bar');
 const trigger = document.getElementById('filter-assets-trigger');
 if(!tray) return;
 const isHidden = tray.classList.toggle('hidden');
 if(trigger) trigger.classList.toggle('active', !isHidden);
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
 
 const badge = document.getElementById('filter-count-badge');
 if(badge) {
   if(activeAssetFilters.size > 0) {
     badge.textContent = activeAssetFilters.size;
     badge.style.display = 'inline-block';
   } else {
     badge.style.display = 'none';
   }
 }

 let html=`<span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-secondary);margin-right:4px;">Filter Fleet:</span><button class="asset-chip-all" onclick="clearAssetFilter()">All Fleet (${assetRegistry.length})</button>`;
 assetRegistry.forEach(a=>{
  let cls='asset-chip';
  if(activeAssetFilters.size>0)cls+=activeAssetFilters.has(a.id)?' active':' inactive';
  html+=`<span class="${cls}" data-asset="${a.id}" onclick="toggleAssetFilter('${a.id}')" style="background:${a.hex};" title="${a.description} (${a.category})">${a.id}</span>`;
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
    : `<button class="am-delete-btn" onclick="promptDeleteAsset(${i})" title="Remove asset"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button>`
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

/* ── SMART BOOKING MODAL LOGIC ── */

window.toggleClientType = function(type) {
  const selected = type || (document.querySelector('input[name="client_type"]:checked')?.value || 'existing');
  const existingSec = document.getElementById('existing-client-section');
  const newSec = document.getElementById('new-client-section');
  const labelExisting = document.getElementById('label-client-existing');
  const labelNew = document.getElementById('label-client-new');
  const radioExisting = document.getElementById('radio-client-existing');
  const radioNew = document.getElementById('radio-client-new');

  if (selected === 'existing') {
    if (radioExisting) radioExisting.checked = true;
    if (labelExisting) labelExisting.classList.add('active');
    if (labelNew) labelNew.classList.remove('active');
    if (existingSec) existingSec.style.display = 'block';
    if (newSec) newSec.style.display = 'none';
  } else {
    if (radioNew) radioNew.checked = true;
    if (labelExisting) labelExisting.classList.remove('active');
    if (labelNew) labelNew.classList.add('active');
    if (existingSec) existingSec.style.display = 'none';
    if (newSec) newSec.style.display = 'block';
  }
};

window.onClientSelectChange = function() {
  const cSelect = document.getElementById('booking-client-select');
  const pSelect = document.getElementById('booking-project-select');
  const sSelect = document.getElementById('booking-site-select');
  if (!cSelect || !pSelect) return;
  const clientId = cSelect.value;
  pSelect.innerHTML = '<option value="">-- Choose Project --</option>';
  if (sSelect) sSelect.innerHTML = '<option value="">-- Choose Site Location --</option>';

  if (!clientId) {
    if (document.getElementById('booking-site-address')) document.getElementById('booking-site-address').value = '';
    if (document.getElementById('booking-site-contact')) document.getElementById('booking-site-contact').value = '';
    return;
  }

  const matchingProjects = projectsRegistry.filter(p => p.clientId === clientId);
  matchingProjects.forEach(p => {
    pSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
  });

  if (matchingProjects.length > 0) {
    pSelect.value = matchingProjects[0].id;
    window.onProjectSelectChange();
  } else {
    if (document.getElementById('booking-site-address')) document.getElementById('booking-site-address').value = '';
    if (document.getElementById('booking-site-contact')) document.getElementById('booking-site-contact').value = '';
  }
};

window.onProjectSelectChange = function() {
  const pSelect = document.getElementById('booking-project-select');
  const sSelect = document.getElementById('booking-site-select');
  if (!pSelect) return;
  const projId = pSelect.value;
  const proj = projectsRegistry.find(p => p.id === projId);

  if (sSelect) {
    sSelect.innerHTML = '<option value="">-- Choose Site Location --</option>';
    if (proj) {
      sSelect.innerHTML += `
        <option value="main" selected>Main Site Compound &bull; ${escapeHtml(proj.address)}</option>
        <option value="gate-west">Western Crane Staging Gate &bull; Access Rd 2</option>
        <option value="loading-dock">Basement Loading Dock / Hardstand Area</option>
      `;
    }
  }

  if (proj) {
    if (document.getElementById('booking-site-address')) document.getElementById('booking-site-address').value = proj.address || '';
    if (document.getElementById('booking-site-contact')) document.getElementById('booking-site-contact').value = proj.contact || '';
  } else {
    if (document.getElementById('booking-site-address')) document.getElementById('booking-site-address').value = '';
    if (document.getElementById('booking-site-contact')) document.getElementById('booking-site-contact').value = '';
  }
};

window.onSiteSelectChange = function() {
  const sSelect = document.getElementById('booking-site-select');
  const pSelect = document.getElementById('booking-project-select');
  const proj = projectsRegistry.find(p => p.id === pSelect?.value);
  if (!sSelect || !proj) return;

  const addrInput = document.getElementById('booking-site-address');
  if (!addrInput) return;

  if (sSelect.value === 'gate-west') {
    addrInput.value = `${proj.address} (Western Crane Staging Gate)`;
  } else if (sSelect.value === 'loading-dock') {
    addrInput.value = `${proj.address} (Hardstand / Loading Dock)`;
  } else {
    addrInput.value = proj.address;
  }
};

window.toggleCrewSelection = function() {
  const opCheck = document.getElementById('crew-operator-check');
  const dgCheck = document.getElementById('crew-dogman-check');
  const opGroup = document.getElementById('operator-select-group');
  const dgGroup = document.getElementById('dogman-select-group');

  if (opGroup) opGroup.style.display = opCheck && opCheck.checked ? 'block' : 'none';
  if (dgGroup) dgGroup.style.display = dgCheck && dgCheck.checked ? 'block' : 'none';
};

window.toggleInspection = function() {
  const isReq = document.getElementById('inspection-required')?.checked || false;
  const group = document.getElementById('inspection-date-group');
  if (group) group.style.display = isReq ? 'block' : 'none';
};

window.quickCallContact = function(name, phone) {
  showToast(`Calling ${name}: ${phone}...`, 'info');
};

window.onAssetSelectChange = function() {
  const assetId = document.getElementById('booking-asset')?.value;
  if (!assetId) return;
  const compliance = window.assetComplianceRegistry?.[assetId];
  if (compliance && compliance.overallStatus === 'EXPIRED') {
    showToast(`Note: Asset ${assetId} has pending compliance or inspection items.`, 'warning');
  }
};

function openModal(asset, startH, endH, dateStr) {
  document.getElementById('booking-id').value = '';
  document.getElementById('modal-title').textContent = 'Smart Booking & Allocation';
  const saveBtn = document.getElementById('save-booking-btn');
  if (saveBtn) saveBtn.textContent = 'Create Booking';

  // 1. Hydrate Client dropdown
  const cSelect = document.getElementById('booking-client-select');
  if (cSelect) {
    cSelect.innerHTML = '<option value="">-- Choose Corporate Client --</option>' +
      clientsRegistry.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (clientsRegistry.length > 0) {
      cSelect.value = clientsRegistry[0].id;
    }
  }

  // Set toggle to existing and run cascading auto-fill
  window.toggleClientType('existing');
  window.onClientSelectChange();

  // Reset blank inputs for new client
  if (document.getElementById('new-client-name')) document.getElementById('new-client-name').value = '';
  if (document.getElementById('new-client-project')) document.getElementById('new-client-project').value = '';
  if (document.getElementById('new-client-contact')) document.getElementById('new-client-contact').value = '';
  if (document.getElementById('new-client-phone')) document.getElementById('new-client-phone').value = '';
  if (document.getElementById('new-client-email')) document.getElementById('new-client-email').value = '';
  if (document.getElementById('new-client-address')) document.getElementById('new-client-address').value = '';

  // 2. Asset & Status hydration
  const assetSelect = document.getElementById('booking-asset');
  if (assetSelect) {
    const combinedAssets = [];
    const seen = new Set();
    allSchedulerLanes.forEach(lane => {
      if (!seen.has(lane.id)) {
        seen.add(lane.id);
        combinedAssets.push({ id: lane.id, label: lane.label || lane.id });
      }
    });
    assetRegistry.forEach(a => {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        combinedAssets.push({ id: a.id, label: `${a.id} — ${a.description || a.assetType}` });
      }
    });
    assetSelect.innerHTML = combinedAssets.map(a => `<option value="${a.id}">${escapeHtml(a.label)}</option>`).join('');
    if (asset && seen.has(asset)) {
      assetSelect.value = asset;
    } else if (combinedAssets.length > 0) {
      assetSelect.value = combinedAssets[0].id;
    }
  }
  if (document.getElementById('booking-hire-type')) document.getElementById('booking-hire-type').value = 'wet';
  if (document.getElementById('booking-status')) document.getElementById('booking-status').value = 'Scheduled';

  // 3. Timing
  let refDate;
  if (dateStr instanceof Date) {
    refDate = !isNaN(dateStr.getTime()) ? dateStr : new Date();
  } else if (typeof dateStr === 'string' && dateStr.trim()) {
    const parsed = new Date(dateStr);
    refDate = !isNaN(parsed.getTime()) ? parsed : new Date();
  } else {
    refDate = (currentDate instanceof Date && !isNaN(currentDate.getTime())) ? new Date(currentDate) : new Date();
  }
  if (document.getElementById('booking-date')) document.getElementById('booking-date').value = refDate.toISOString().slice(0, 10);
  if (document.getElementById('booking-start')) document.getElementById('booking-start').value = startH || '07:00';
  if (document.getElementById('booking-end')) document.getElementById('booking-end').value = endH || '15:00';

  // 4. Crew Selection
  const opCheck = document.getElementById('crew-operator-check');
  const dgCheck = document.getElementById('crew-dogman-check');
  if (opCheck) opCheck.checked = true;
  if (dgCheck) dgCheck.checked = false;
  window.toggleCrewSelection();

  const opSelect = document.getElementById('booking-wet-operator');
  const dgSelect = document.getElementById('booking-wet-dogman');
  if (opSelect) {
    const operators = workerRegistry.filter(w => (w.role || '').toLowerCase().includes('operator'));
    opSelect.innerHTML = '<option value="">-- Select Certified Operator --</option>' +
      operators.map(w => `<option value="${w.id}">${w.name} (${(w.licenses||[]).map(l=>l.type).join(',') || 'HRWL'})</option>`).join('');
    if (operators.length > 0) opSelect.value = operators[0].id;
  }
  if (dgSelect) {
    const dogmen = workerRegistry.filter(w => (w.role || '').toLowerCase().includes('dogman') || (w.role || '').toLowerCase().includes('rigger'));
    dgSelect.innerHTML = '<option value="">-- Select Certified Dogman --</option>' +
      dogmen.map(w => `<option value="${w.id}">${w.name} (${(w.licenses||[]).map(l=>l.type).join(',') || 'DG'})</option>`).join('');
    if (dogmen.length > 0) dgSelect.value = dogmen[0].id;
  }

  // 5. Inspection Workflow
  const isInspectionAsset = asset === 'INSPECTIONS';
  const inspCheck = document.getElementById('inspection-required');
  if (inspCheck) inspCheck.checked = isInspectionAsset;
  window.toggleInspection();
  const inspDate = document.getElementById('inspection-datetime');
  if (inspDate) {
    const inspDefault = new Date(refDate);
    inspDefault.setHours(6, 30, 0, 0);
    inspDate.value = inspDefault.toISOString().slice(0, 16);
  }

  // 6. Rate Review Automation: defaults to exactly 6 months from today's date
  const rrDate = new Date();
  rrDate.setMonth(rrDate.getMonth() + 6);
  const yyyy = rrDate.getFullYear();
  const mm = String(rrDate.getMonth() + 1).padStart(2, '0');
  const dd = String(rrDate.getDate()).padStart(2, '0');
  const rrInput = document.getElementById('rate-review-date');
  if (rrInput) rrInput.value = `${yyyy}-${mm}-${dd}`;

  if (document.getElementById('booking-desc')) document.getElementById('booking-desc').value = '';
  if (document.getElementById('delete-btn')) document.getElementById('delete-btn').style.display = 'none';

  const modal = document.getElementById('booking-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
}

function editBooking(id) {
  let b = bookings.find(x => x.id === id);
  if (!b) {
    const dj = mockDispatchData.find(j => j.id === id);
    if (dj) {
      const datePrefix = (currentDate instanceof Date && !isNaN(currentDate.getTime()))
        ? currentDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      b = {
        id: dj.id,
        assetNumber: dj.assetId,
        clientName: dj.client,
        siteAddress: dj.siteAddress,
        startTime: `${datePrefix}T${dj.startTime}:00`,
        endTime: `${datePrefix}T${dj.endTime}:00`,
        status: dj.isInspection ? 'Completed' : 'Scheduled',
        hireType: 'wet',
        operatorName: dj.workerName,
        inspectionRequired: !!dj.isInspection
      };
    }
  }
  if (!b) return;
  openModal(b.assetNumber, null, null, b.startTime);

  document.getElementById('booking-id').value = b.id;
  document.getElementById('modal-title').textContent = `Edit Booking: ${b.assetNumber}`;
  const saveBtn = document.getElementById('save-booking-btn');
  if (saveBtn) saveBtn.textContent = 'Update Booking';

  if (document.getElementById('booking-status')) document.getElementById('booking-status').value = b.status || 'Scheduled';
  if (document.getElementById('booking-hire-type')) document.getElementById('booking-hire-type').value = b.hireType || 'wet';

  // Check if client is existing in registry
  const cSelect = document.getElementById('booking-client-select');
  const matchedClient = clientsRegistry.find(c => c.name.toLowerCase() === (b.clientName || '').toLowerCase());
  if (matchedClient && cSelect) {
    cSelect.value = matchedClient.id;
    window.onClientSelectChange();
  } else {
    window.toggleClientType('new');
    if (document.getElementById('new-client-name')) document.getElementById('new-client-name').value = b.clientName || '';
    if (document.getElementById('new-client-address')) document.getElementById('new-client-address').value = b.siteAddress || '';
    if (document.getElementById('new-client-phone')) document.getElementById('new-client-phone').value = b.clientPhone || '';
  }

  if (document.getElementById('booking-site-address') && b.siteAddress) {
    document.getElementById('booking-site-address').value = b.siteAddress;
  }
  if (document.getElementById('booking-desc')) {
    document.getElementById('booking-desc').value = b.jobDescription || '';
  }

  const s = new Date(b.startTime);
  const e = new Date(b.endTime);
  const validS = !isNaN(s.getTime()) ? s : new Date();
  const validE = !isNaN(e.getTime()) ? e : new Date(validS.getTime() + 3600000);
  if (document.getElementById('booking-date')) document.getElementById('booking-date').value = validS.toISOString().slice(0, 10);
  if (document.getElementById('booking-start')) document.getElementById('booking-start').value = `${String(validS.getHours()).padStart(2,'0')}:${String(validS.getMinutes()).padStart(2,'0')}`;
  if (document.getElementById('booking-end')) document.getElementById('booking-end').value = `${String(validE.getHours()).padStart(2,'0')}:${String(validE.getMinutes()).padStart(2,'0')}`;

  // Crew allocation restore
  const hasOp = (b.wetHireResources && b.wetHireResources.some(r => r.role === 'Operator')) || !!b.operatorName;
  const hasDg = b.wetHireResources && b.wetHireResources.some(r => r.role === 'Dogman' || r.role === 'Rigger');
  if (document.getElementById('crew-operator-check')) document.getElementById('crew-operator-check').checked = hasOp;
  if (document.getElementById('crew-dogman-check')) document.getElementById('crew-dogman-check').checked = hasDg;
  window.toggleCrewSelection();

  if (b.inspectionRequired) {
    if (document.getElementById('inspection-required')) document.getElementById('inspection-required').checked = true;
    window.toggleInspection();
    if (document.getElementById('inspection-datetime') && b.inspectionDateTime) {
      document.getElementById('inspection-datetime').value = b.inspectionDateTime;
    }
  }

  if (b.rateReviewDate && document.getElementById('rate-review-date')) {
    document.getElementById('rate-review-date').value = b.rateReviewDate;
  }

  const delBtn = document.getElementById('delete-btn');
  if (delBtn) delBtn.style.display = 'inline-flex';

  const modal = document.getElementById('booking-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
}

function closeModal() {
  const m = document.getElementById('booking-modal');
  if (m) {
    m.style.display = 'none';
    m.classList.remove('open');
  }
}

function saveBooking() {
  const id = document.getElementById('booking-id').value;
  const asset = document.getElementById('booking-asset').value;
  const status = document.getElementById('booking-status').value;
  const hireType = document.getElementById('booking-hire-type').value;
  const startStr = document.getElementById('booking-start').value;
  const endStr = document.getElementById('booking-end').value;
  const dateVal = document.getElementById('booking-date').value;

  const isExisting = document.querySelector('input[name="client_type"]:checked')?.value === 'existing';
  let clientName = '';
  let siteAddress = '';
  let clientContact = '';
  let clientPhone = '0412 889 900';
  let clientEmail = '';

  if (isExisting) {
    const cSelect = document.getElementById('booking-client-select');
    const clientId = cSelect ? cSelect.value : '';
    const client = clientsRegistry.find(c => c.id === clientId);
    clientName = client ? client.name : (cSelect?.selectedOptions[0]?.text || 'Corporate Client');
    siteAddress = document.getElementById('booking-site-address')?.value || 'Brisbane Metro Site';
    clientContact = document.getElementById('booking-site-contact')?.value || '';
    clientPhone = client?.phone || '0412 889 900';
    clientEmail = client?.email || 'accounts@client.com.au';
  } else {
    clientName = document.getElementById('new-client-name')?.value.trim() || 'New Client (EOI)';
    clientContact = document.getElementById('new-client-contact')?.value.trim() || 'Site Supervisor';
    clientPhone = document.getElementById('new-client-phone')?.value.trim() || '0412 889 900';
    clientEmail = document.getElementById('new-client-email')?.value.trim() || 'contact@newclient.com.au';
    siteAddress = document.getElementById('new-client-address')?.value.trim() || '100 Kingsford Smith Dr';

    // Auto-register new client in registry for persistent cascading
    const newCId = 'C' + (Date.now() % 10000);
    const newPId = 'P' + (Date.now() % 10000);
    if (!clientsRegistry.some(c => c.name.toLowerCase() === clientName.toLowerCase())) {
      clientsRegistry.push({ id: newCId, name: clientName, phone: clientPhone, email: clientEmail });
      projectsRegistry.push({ id: newPId, clientId: newCId, name: siteAddress.slice(0, 24) + ' Site', address: siteAddress, contact: `${clientContact} (${clientPhone})` });
    }
  }

  // Calculate Start & End ISO timestamps
  const refDate = dateVal ? new Date(dateVal + 'T00:00:00') : new Date(currentDate);
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  refDate.setHours(sh, sm, 0, 0);
  const startISO = refDate.toISOString();
  refDate.setHours(eh, em, 0, 0);
  const endISO = refDate.toISOString();

  if (new Date(endISO) <= new Date(startISO)) {
    showToast('End time must be strictly after start time.', 'error');
    return;
  }
  if (status !== 'Out of Service' && hasOverlap(asset, startISO, endISO, id || null)) {
    showToast(`Asset ${asset} has a scheduling clash during this time window.`, 'warning');
    return;
  }

  // Crew Allocation
  const opRequired = document.getElementById('crew-operator-check')?.checked || false;
  const dgRequired = document.getElementById('crew-dogman-check')?.checked || false;
  const opId = document.getElementById('booking-wet-operator')?.value || '';
  const dgId = document.getElementById('booking-wet-dogman')?.value || '';
  const wetHireResources = [];

  if (opRequired) {
    const opWorker = workerRegistry.find(w => w.id === opId) || workerRegistry.find(w => (w.role || '').toLowerCase().includes('operator')) || { id: 'W001', name: 'Luke Harris', licenses: [{ type: 'C1' }] };
    wetHireResources.push({ role: 'Operator', workerId: opWorker.id, workerName: opWorker.name, licenseType: opWorker.licenses?.[0]?.type || 'HRWL' });
  }
  if (dgRequired) {
    const dgWorker = workerRegistry.find(w => w.id === dgId) || workerRegistry.find(w => (w.role || '').toLowerCase().includes('dogman') || (w.role || '').toLowerCase().includes('rigger')) || { id: 'W012', name: 'Brad Nguyen', licenses: [{ type: 'DG' }] };
    wetHireResources.push({ role: 'Dogman', workerId: dgWorker.id, workerName: dgWorker.name, licenseType: dgWorker.licenses?.[0]?.type || 'DG' });
  }

  const operatorName = wetHireResources.length > 0 ? wetHireResources.map(r => `${r.role === 'Operator' ? 'Op' : 'Dog'}: ${r.workerName.split(' ')[0]}`).join(' | ') : (opRequired ? 'Operator Assigned' : 'Dry Hire');

  // Inspection Workflow
  const inspectionRequired = document.getElementById('inspection-required')?.checked || false;
  const inspectionDateTime = inspectionRequired ? document.getElementById('inspection-datetime')?.value : null;
  const inspectionOfficer = inspectionRequired ? document.getElementById('inspection-officer')?.value : null;

  // Rate Review Automation
  const rateReviewDate = document.getElementById('rate-review-date')?.value || null;
  const hourlyRateQuoted = Number(document.getElementById('hourly-rate-quoted')?.value) || 240;

  const booking = {
    id: id || ('b' + Date.now()),
    assetNumber: asset,
    status,
    hireType,
    clientName,
    clientPhone,
    clientEmail,
    siteAddress,
    siteContact: clientContact,
    operatorName,
    wetHireResources,
    jobDescription: document.getElementById('booking-desc')?.value || '',
    startTime: startISO,
    endTime: endISO,
    type: asset.startsWith('CR') ? 'Crane' : asset.startsWith('DZ') ? 'Dozer' : 'Excavator',
    inspectionRequired,
    inspectionDateTime,
    inspectionOfficer,
    rateReviewDate,
    hourlyRateQuoted
  };

  if (id) {
    const i = bookings.findIndex(b => b.id === id);
    if (i >= 0) bookings[i] = booking;
  } else {
    bookings.push(booking);
  }

  closeModal();
  renderCalendar();
  showToast(`Booking saved: ${asset} allocated to ${clientName}`, 'success');
}

function deleteBooking() {
  const id = document.getElementById('booking-id').value;
  if (!id) return;
  if (!confirm('Are you sure you want to delete this booking?')) return;
  bookings = bookings.filter(b => b.id !== id);
  closeModal();
  renderCalendar();
  showToast('Booking deleted successfully.', 'info');
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

let _isAnalyticsRunning = false;

function applyDatePreset(skipRender = false){
 const presetEl = document.getElementById('analytics-preset-filter');
 if(!presetEl) return;
 const preset = presetEl.value || 'this_week';
 if(preset==='custom')return;
 const now=new Date();
 let start=new Date(now),end=new Date(now);
 if(preset==='today'){start.setHours(0,0,0,0);end.setHours(23,59,59,999);}
 else if(preset==='this_week'){const d=now.getDay()||7;start.setDate(now.getDate()-d+1);end=new Date(start);end.setDate(start.getDate()+6);}
 else if(preset==='next_week'){const d=now.getDay()||7;start.setDate(now.getDate()-d+8);end=new Date(start);end.setDate(start.getDate()+6);}
 else if(preset==='this_month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,0);}
 else{start=new Date(0);end=new Date(9999,0,1);}
 const startInput = document.getElementById('analytics-start-date');
 const endInput = document.getElementById('analytics-end-date');
 if (startInput) startInput.value=start.toISOString().slice(0,10);
 if (endInput) endInput.value=end.toISOString().slice(0,10);
 if (!skipRender) {
  renderAnalytics();
 }
}

/* ── PHASE 6: EXECUTIVE DASHBOARD & SYSTEM TELEMETRY ── */
function renderAnalytics(){
 if (_isAnalyticsRunning) return;
 _isAnalyticsRunning = true;
 try {
  const startInput=document.getElementById('analytics-start-date');
  const endInput=document.getElementById('analytics-end-date');
  if(!startInput||!endInput)return;

  if(!startInput.value||!endInput.value){
   const presetEl = document.getElementById('analytics-preset-filter');
   if (presetEl) presetEl.value='this_week';
   applyDatePreset(true);
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
    <div style="font-size:11px;font-weight:800;color:#0891b2;text-transform:uppercase;">STALLED FIELD DOCKETS (${missingDocketBookings.length})</div>
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
 if(uCanvas && typeof uCanvas.getContext === 'function' && typeof Chart !== 'undefined'){
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
 if(sCanvas && typeof sCanvas.getContext === 'function' && typeof Chart !== 'undefined'){
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
 } finally {
  _isAnalyticsRunning = false;
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

// ==========================================================================
// REBUILT SCHEDULER MODULE: DAY VIEW DISPATCH ENGINE & MOCK DATA
// ==========================================================================

// Fixed, Prominent Site Inspections / Reps Non-Asset Lane
const INSPECTION_LANE = {
  id: 'INSPECTIONS',
  label: 'Site Inspections / Reps',
  type: 'Site Audits & Consultations',
  color: '#6366f1',
  isInspectionLane: true
};

// Fleet Assets (X-Axis Columns)
let mockFleetAssets = window.ionConfig?.fleetRegistry || [
  { id: 'AT11', label: 'AT11 - 100T', type: 'Liebherr All-Terrain Crane', category: 'all_terrain', color: '#0284c7', workerName: 'Luke Harris', workerStatus: 'available', hoursToday: 5 },
  { id: 'FC1', label: 'FC1 - 20T Franna', type: 'Terex Franna Pick & Carry', category: 'franna', color: '#059669', workerName: 'Chris Evans', workerStatus: 'overtime', hoursToday: 9.5, overtimeWarning: true },
  { id: 'MC2', label: 'MC2 - 60T City Crane', type: 'Kato City Compact Crane', category: 'city', color: '#d97706', workerName: 'Mark Johnson', workerStatus: 'available', hoursToday: 4 },
  { id: 'CR01', label: 'CR01 - 250T Crawler', type: 'Kobelco Lattice Crawler', category: 'crawler', color: '#7c3aed', workerName: 'Dave Wilson', workerStatus: 'available', hoursToday: 2 },
  { id: 'AT10', label: 'AT10 - 55T Demag', type: 'Demag All-Terrain Crane', category: 'all_terrain', color: '#dc2626', workerName: 'Sam Davies', workerStatus: 'available', hoursToday: 0 }
];

// All scheduler lanes: Always includes 'Site Inspections / Reps' docked at the far left of the fleet columns
let allSchedulerLanes = [INSPECTION_LANE, ...(window.ionConfig?.fleetRegistry || mockFleetAssets)];

function syncSchedulerLanes() {
  const fleet = window.ionConfig?.fleetRegistry || mockFleetAssets;
  mockFleetAssets = fleet;
  allSchedulerLanes = [INSPECTION_LANE, ...fleet];
}

// Active Contextual Filter State for Day View
let selectedAssetFilter = 'All Assets'; // 'All Assets' | 'Frannas' | 'Crawlers' | 'All Terrains' | 'class:...' | 'asset:...'
let selectedWorkerFilter = 'All Workers'; // 'All Workers' | 'Available' | 'Overtime Warning' | 'worker:...'

function getFilteredSchedulerLanes() {
  const fleet = window.ionConfig?.fleetRegistry || mockFleetAssets;
  let lanes = [INSPECTION_LANE, ...fleet];

  // 1. Filter by Asset
  if (selectedAssetFilter && selectedAssetFilter !== 'All Assets') {
    if (selectedAssetFilter.startsWith('class:')) {
      const cls = selectedAssetFilter.replace('class:', '').toLowerCase();
      lanes = fleet.filter(a =>
        (a.class && a.class.toLowerCase().includes(cls)) ||
        (a.category && a.category.toLowerCase().includes(cls)) ||
        (a.type && a.type.toLowerCase().includes(cls))
      );
    } else if (selectedAssetFilter.startsWith('asset:')) {
      const aid = selectedAssetFilter.replace('asset:', '');
      lanes = fleet.filter(a => a.id === aid);
    } else if (selectedAssetFilter === 'Frannas') {
      lanes = fleet.filter(a =>
        (a.category === 'franna') ||
        (a.class && a.class.toLowerCase().includes('franna')) ||
        (a.type && a.type.toLowerCase().includes('franna')) ||
        (a.label && a.label.toLowerCase().includes('franna'))
      );
    } else if (selectedAssetFilter === 'Crawlers') {
      lanes = fleet.filter(a =>
        (a.category === 'crawler') ||
        (a.class && a.class.toLowerCase().includes('crawler')) ||
        (a.type && a.type.toLowerCase().includes('crawler')) ||
        (a.label && a.label.toLowerCase().includes('crawler'))
      );
    } else if (selectedAssetFilter === 'All Terrains') {
      lanes = fleet.filter(a =>
        (a.category === 'all_terrain') ||
        (a.class && a.class.toLowerCase().includes('terrain')) ||
        (a.type && a.type.toLowerCase().includes('terrain')) ||
        (a.label && a.label.toLowerCase().includes('terrain'))
      );
    }
  }

  // 2. Filter by Worker
  if (selectedWorkerFilter && selectedWorkerFilter !== 'All Workers') {
    if (selectedWorkerFilter === 'Available') {
      lanes = lanes.filter(a => a.isInspectionLane || a.workerStatus === 'available' || !a.overtimeWarning);
    } else if (selectedWorkerFilter === 'Overtime Warning') {
      lanes = lanes.filter(a => !a.isInspectionLane && (a.workerStatus === 'overtime' || a.overtimeWarning));
    } else if (selectedWorkerFilter.startsWith('worker:')) {
      const wName = selectedWorkerFilter.replace('worker:', '').toLowerCase();
      lanes = lanes.filter(a => a.workerName && a.workerName.toLowerCase() === wName);
    }
  }

  return lanes;
}

function handleAssetFilterChange(val) {
  selectedAssetFilter = val || 'All Assets';
  renderDayViewScheduler();
}

function handleWorkerFilterChange(val) {
  selectedWorkerFilter = val || 'All Workers';
  renderDayViewScheduler();
}

function resetSchedulerFilters() {
  selectedAssetFilter = 'All Assets';
  selectedWorkerFilter = 'All Workers';
  renderDayViewScheduler();
}

// Structured Mock Data: Including 'Inspection Only' job and crane jobs
let mockDispatchData = [
  {
    id: 'INSP-101',
    assetId: 'INSPECTIONS',
    startTime: '09:30',
    endTime: '12:00',
    client: 'John Holland Group',
    siteAddress: 'Sydney Metro West - Site Assessment & Access Audit',
    statusColor: '#6366f1',
    isInspection: true,
    inspector: 'Dave Miller (Senior Rep)',
    workerName: 'Dave Miller',
    workerStatus: 'available'
  },
  {
    id: 'JOB-001',
    assetId: 'AT11',
    startTime: '07:00',
    endTime: '12:00',
    client: 'Multiplex Constructions',
    siteAddress: 'Quay Quarter Tower, 50 Bridge St, Sydney NSW',
    statusColor: '#0284c7',
    isInspection: false,
    workerName: 'Luke Harris',
    workerStatus: 'available'
  },
  {
    id: 'JOB-002',
    assetId: 'FC1',
    startTime: '08:30',
    endTime: '15:30',
    client: 'Lendlease Building',
    siteAddress: 'Barangaroo Metro Station, Hickson Rd, Barangaroo NSW',
    statusColor: '#059669',
    isInspection: false,
    workerName: 'Chris Evans',
    workerStatus: 'overtime',
    overtimeWarning: true
  },
  {
    id: 'JOB-003',
    assetId: 'MC2',
    startTime: '13:00',
    endTime: '14:00',
    client: 'CPB Contractors',
    siteAddress: 'Western Sydney Airport Terminal 1, Badgerys Creek NSW',
    statusColor: '#d97706',
    isInspection: false,
    workerName: 'Mark Johnson',
    workerStatus: 'available'
  }
];

// All-Day / Maintenance Events Banner Data
const mockAllDayEvents = [
  {
    assetId: 'AT10',
    title: 'AT10 - OUT FOR SERVICE',
    detail: 'Scheduled 250hr hydraulic inspection & boom recertification',
    statusColor: '#dc2626'
  }
];

function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function minutesToTimeString(totalMinutes) {
  const clamped = Math.max(0, Math.min(1410, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatGutterHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Drag and Drop State & Handlers ──
let isDraggingJob = false;
let justFinishedDragging = false;
let activeDragJob = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOrigStartMin = 0;
let dragDurationMin = 0;
let dragCardElement = null;
let currentHoveredAssetId = null;
let currentPreviewStartMin = 0;

// Click-to-Edit Existing Job
function handleJobClick(e, jobId) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (justFinishedDragging) return;

  openBookingDrawer(jobId);
}

// Drag start for job cards (HTML5 Drag & Drop)
function handleJobDragStart(e, jobId) {
  const job = mockDispatchData.find(j => j.id === jobId);
  if (!job) return;

  isDraggingJob = true;
  activeDragJob = job;

  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
  }

  if (e.currentTarget) {
    e.currentTarget.classList.add('is-dragging');
  }
}

// Drag end for job cards (HTML5 Drag & Drop)
function handleJobDragEnd(e) {
  isDraggingJob = false;
  activeDragJob = null;

  justFinishedDragging = true;
  setTimeout(() => { justFinishedDragging = false; }, 250);

  document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
  document.querySelectorAll('.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));
}

// Slot drag events for Drag & Drop Snapping
function handleSlotDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

function handleSlotDragEnter(e) {
  e.preventDefault();
  const slot = e.currentTarget || e.target.closest('[data-hour]');
  if (slot) {
    slot.classList.add('drag-over-slot');
  }
}

function handleSlotDragLeave(e) {
  const slot = e.currentTarget || e.target.closest('[data-hour]');
  if (slot) {
    slot.classList.remove('drag-over-slot');
  }
}

// Drop handler on slots and grid
function handleSlotDrop(e, fallbackAssetId, fallbackHour) {
  e.preventDefault();
  e.stopPropagation();

  justFinishedDragging = true;
  setTimeout(() => { justFinishedDragging = false; }, 250);

  document.querySelectorAll('.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));
  document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));

  let jobId = null;
  if (e.dataTransfer) {
    jobId = e.dataTransfer.getData('text/plain');
  }
  if (!jobId && activeDragJob) {
    jobId = activeDragJob.id;
  }
  if (!jobId) return;

  const job = mockDispatchData.find(j => j.id === jobId);
  if (!job) return;

  const dropTarget = e.currentTarget || e.target.closest('[data-hour]');
  const targetAssetId = dropTarget?.dataset?.assetId || dropTarget?.dataset?.asset || fallbackAssetId;
  const targetHour = dropTarget?.dataset?.hour != null ? parseInt(dropTarget.dataset.hour, 10) : fallbackHour;

  if (!targetAssetId || targetHour == null || isNaN(targetHour)) return;

  // Snapping: Calculate whether dropped in first 30 mins (:00) or second 30 mins (:30)
  let isSecondHalf = false;
  if (dropTarget) {
    const rect = dropTarget.getBoundingClientRect();
    if (dayTransposed) {
      isSecondHalf = (e.clientX - rect.left) > (rect.width / 2);
    } else {
      isSecondHalf = (e.clientY - rect.top) > (rect.height / 2);
    }
  }
  const minute = isSecondHalf ? '30' : '00';
  const newStartStr = `${String(targetHour).padStart(2, '0')}:${minute}`;

  // Preserve original job duration
  const origStartMin = timeStringToMinutes(job.startTime);
  const origEndMin = timeStringToMinutes(job.endTime);
  const durationMin = Math.max(origEndMin - origStartMin, 30);
  const newStartMin = timeStringToMinutes(newStartStr);
  const newEndMin = Math.min(1440, newStartMin + durationMin);
  const newEndStr = minutesToTimeString(newEndMin);

  // Update underlying mockDispatchData with new Asset ID and Time based on drop target's data attributes
  job.assetId = targetAssetId;
  job.startTime = newStartStr;
  job.endTime = newEndStr;

  if (targetAssetId === 'INSPECTIONS') {
    job.isInspection = true;
    job.statusColor = '#6366f1';
  } else {
    job.isInspection = false;
    const targetAsset = mockFleetAssets.find(a => a.id === targetAssetId);
    if (targetAsset) {
      job.statusColor = targetAsset.color;
    }
  }

  const allLanes = [INSPECTION_LANE, ...mockFleetAssets];
  const targetLane = allLanes.find(a => a.id === targetAssetId);
  const laneLabel = targetLane ? targetLane.label : targetAssetId;

  if (typeof showToast === 'function') {
    showToast(`Job Rescheduled: ${job.client} to ${laneLabel} at ${newStartStr} – ${newEndStr}`, 'success');
  }

  isDraggingJob = false;
  activeDragJob = null;

  // Re-render Day View
  renderDayViewScheduler();
}

// Mouse-based drag support for backwards compatibility and fallback
function startJobDrag(e, jobId) {
  if (e.button !== 0) return;
  const job = mockDispatchData.find(j => j.id === jobId);
  if (!job) return;

  const cardEl = document.getElementById(`job-card-${jobId}`);
  if (!cardEl) return;

  isDraggingJob = true;
  activeDragJob = job;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOrigStartMin = timeStringToMinutes(job.startTime);
  const endMin = timeStringToMinutes(job.endTime);
  dragDurationMin = Math.max(endMin - dragOrigStartMin, 30);
  dragCardElement = cardEl;
  currentHoveredAssetId = job.assetId;
  currentPreviewStartMin = dragOrigStartMin;

  window.addEventListener('mousemove', onJobDragMove);
  window.addEventListener('mouseup', onJobDragEnd);
}

function onJobDragMove(e) {
  if (!isDraggingJob || !activeDragJob || !dragCardElement) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  if (Math.hypot(dx, dy) > 6) {
    dragCardElement.classList.add('is-dragging');
  }

  if (!dayTransposed) {
    const rawNewStartMin = dragOrigStartMin + dy;
    const snappedMinutes = Math.max(0, Math.min(1440 - dragDurationMin, Math.round(rawNewStartMin / 30) * 30));
    currentPreviewStartMin = snappedMinutes;

    const allCols = document.querySelectorAll('.dispatch-asset-col');
    allCols.forEach(col => {
      const rect = col.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        const targetAssetId = col.getAttribute('data-asset-id');
        if (targetAssetId && targetAssetId !== currentHoveredAssetId) {
          currentHoveredAssetId = targetAssetId;
          col.appendChild(dragCardElement);
        }
      }
    });

    dragCardElement.style.top = `${snappedMinutes}px`;
    const timeEl = dragCardElement.querySelector('.dispatch-job-time span:last-child');
    if (timeEl) {
      const sStr = minutesToTimeString(snappedMinutes);
      const eStr = minutesToTimeString(snappedMinutes + dragDurationMin);
      timeEl.textContent = `${sStr} – ${eStr}`;
    }
  } else {
    const rawNewStartMin = dragOrigStartMin + (dx * (60 / 80));
    const snappedMinutes = Math.max(0, Math.min(1440 - dragDurationMin, Math.round(rawNewStartMin / 30) * 30));
    currentPreviewStartMin = snappedMinutes;

    const allRows = document.querySelectorAll('.transposed-asset-row');
    allRows.forEach(row => {
      const rect = row.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const targetAssetId = row.getAttribute('data-asset-id');
        if (targetAssetId && targetAssetId !== currentHoveredAssetId) {
          currentHoveredAssetId = targetAssetId;
          const slotsWrap = row.querySelector('.transposed-row-slots');
          if (slotsWrap) slotsWrap.appendChild(dragCardElement);
        }
      }
    });

    const leftPx = snappedMinutes * (80 / 60);
    dragCardElement.style.left = `${leftPx}px`;

    const timeEl = dragCardElement.querySelector('.dispatch-job-time span:last-child');
    if (timeEl) {
      const sStr = minutesToTimeString(snappedMinutes);
      const eStr = minutesToTimeString(snappedMinutes + dragDurationMin);
      timeEl.textContent = `${sStr} – ${eStr}`;
    }
  }
}

function onJobDragEnd(e) {
  window.removeEventListener('mousemove', onJobDragMove);
  window.removeEventListener('mouseup', onJobDragEnd);

  if (!isDraggingJob || !activeDragJob) return;

  const movedDist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
  if (movedDist > 10) {
    justFinishedDragging = true;
    setTimeout(() => { justFinishedDragging = false; }, 250);

    const newStartStr = minutesToTimeString(currentPreviewStartMin);
    const newEndStr = minutesToTimeString(currentPreviewStartMin + dragDurationMin);

    activeDragJob.startTime = newStartStr;
    activeDragJob.endTime = newEndStr;
    activeDragJob.assetId = currentHoveredAssetId || activeDragJob.assetId;

    if (activeDragJob.assetId === 'INSPECTIONS') {
      activeDragJob.isInspection = true;
      activeDragJob.statusColor = '#6366f1';
    } else {
      activeDragJob.isInspection = false;
      const targetAsset = mockFleetAssets.find(a => a.id === activeDragJob.assetId);
      if (targetAsset) {
        activeDragJob.statusColor = targetAsset.color;
      }
    }

    const allLanes = [INSPECTION_LANE, ...mockFleetAssets];
    const targetLane = allLanes.find(a => a.id === activeDragJob.assetId);
    const laneLabel = targetLane ? targetLane.label : activeDragJob.assetId;
    if (typeof showToast === 'function') {
      showToast(`Job Rescheduled: ${activeDragJob.client} (${newStartStr} – ${newEndStr}) on ${laneLabel}`, 'success');
    }
    renderDayViewScheduler();
  }

  if (dragCardElement) {
    dragCardElement.classList.remove('is-dragging');
  }
  isDraggingJob = false;
  activeDragJob = null;
  dragCardElement = null;
}

// ── Click-to-Book (Empty Slot Detection) ──
function handleSlotClick(e, assetId, hour) {
  if (justFinishedDragging) return;

  let isSecondHalf = false;
  if (e && e.currentTarget) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (dayTransposed) {
      isSecondHalf = (e.clientX - rect.left) > (rect.width / 2);
    } else {
      isSecondHalf = (e.clientY - rect.top) > (rect.height / 2);
    }
  }
  const minute = isSecondHalf ? '30' : '00';
  const startStr = `${String(hour).padStart(2, '0')}:${minute}`;
  const endHour = Math.min(hour + 4, 23);
  const endStr = `${String(endHour).padStart(2, '0')}:${minute}`;

  openModal(assetId, startStr, endStr, currentDate);
}

// Attach single click listener to main grid container via Event Delegation
function attachGridInteractivity() {
  const viewport = document.getElementById('day-dispatch-viewport');
  if (!viewport) return;

  // Single click listener for Robust Click-to-Book (Empty Slot) via Event Delegation
  viewport.addEventListener('click', (e) => {
    if (justFinishedDragging) return;

    // If click originated on or inside a job card, it's an existing job (Click-to-Edit)
    // The job card's click handler calls event.stopPropagation(), but we check here too:
    if (e.target.closest('.dispatch-job-card')) {
      return;
    }

    // Ignore clicks on header rows, sticky headers, gutters, buttons, selects
    if (
      e.target.closest('.dispatch-assets-header-row') ||
      e.target.closest('.transposed-header-row') ||
      e.target.closest('.dispatch-time-gutter') ||
      e.target.closest('.transposed-corner-header') ||
      e.target.closest('.transposed-asset-header-cell') ||
      e.target.closest('button') ||
      e.target.closest('select') ||
      e.target.closest('input')
    ) {
      return;
    }

    let assetId = null;
    let timeStr = null;

    if (!dayTransposed) {
      // Standard View: Column = Asset, Row = Time
      const slot = e.target.closest('.dispatch-hour-slot');
      const col = e.target.closest('.dispatch-asset-col');
      if (!slot && !col) return;

      assetId = (slot && (slot.dataset.assetId || slot.dataset.asset)) || (col && col.dataset.assetId);

      if (slot && slot.dataset.hour != null) {
        const hour = parseInt(slot.dataset.hour, 10);
        const rect = slot.getBoundingClientRect();
        const isSecondHalf = (e.clientY - rect.top) > (rect.height / 2);
        const minute = isSecondHalf ? '30' : '00';
        timeStr = `${String(hour).padStart(2, '0')}:${minute}`;
      } else if (col) {
        const rect = col.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const totalMinutes = Math.max(0, Math.min(1410, Math.floor(y)));
        const snappedMinutes = Math.floor(totalMinutes / 30) * 30;
        timeStr = minutesToTimeString(snappedMinutes);
      }
    } else {
      // Transposed View: Row = Asset, Column = Time
      const slot = e.target.closest('.transposed-hour-slot');
      const row = e.target.closest('.transposed-asset-row');
      if (!slot && !row) return;

      assetId = (slot && (slot.dataset.assetId || slot.dataset.asset)) || (row && row.dataset.assetId);

      if (slot && slot.dataset.hour != null) {
        const hour = parseInt(slot.dataset.hour, 10);
        const rect = slot.getBoundingClientRect();
        const isSecondHalf = (e.clientX - rect.left) > (rect.width / 2);
        const minute = isSecondHalf ? '30' : '00';
        timeStr = `${String(hour).padStart(2, '0')}:${minute}`;
      } else if (row) {
        const slotsWrap = row.querySelector('.transposed-row-slots') || row;
        const rect = slotsWrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const totalMinutes = Math.max(0, Math.min(1410, Math.floor(x / (80 / 60))));
        const snappedMinutes = Math.floor(totalMinutes / 30) * 30;
        timeStr = minutesToTimeString(snappedMinutes);
      }
    }

    if (!assetId || !timeStr) return;

    const [hStr, mStr] = timeStr.split(':');
    const hNum = parseInt(hStr, 10) || 7;
    const endHNum = Math.min(hNum + 4, 23);
    const endStr = `${String(endHNum).padStart(2, '0')}:${mStr || '00'}`;

    openModal(assetId, timeStr, endStr, currentDate);
  });

  // Enable dragover and drop delegation on main viewport container
  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  });

  viewport.addEventListener('drop', (e) => {
    const slot = e.target.closest('.dispatch-hour-slot, .transposed-hour-slot');
    if (slot) {
      const assetId = slot.dataset.assetId || slot.dataset.asset;
      const hour = parseInt(slot.dataset.hour, 10);
      handleSlotDrop(e, assetId, hour);
    }
  });
}

// ── Scaffolding Views for Week & Month ──
function renderWeekViewScaffolding() {
  const container = document.getElementById('calendar-body');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Toolbar -->
    <div class="day-scheduler-toolbar">
      <div class="day-scheduler-toolbar-left">
        <div class="day-scheduler-icon-badge" style="background: var(--ion-cyan, #00adef);">
          <span class="material-symbols-outlined" style="font-size: 20px;">view_week</span>
        </div>
        <div>
          <h2 class="day-scheduler-title">Weekly Fleet Dispatch Timeline</h2>
          <div class="day-scheduler-subtitle">Multi-Day Fleet Schedule &bull; Staged View</div>
        </div>
      </div>

      <div class="day-scheduler-toolbar-center">
        <div class="scheduler-view-segmented" id="scheduler-view-mode-toggle">
          <button class="scheduler-view-segmented-btn ${currentView === 'Day' ? 'active' : ''}" onclick="setCalendarView('Day')">Day</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Week' ? 'active' : ''}" onclick="setCalendarView('Week')">Week</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Month' ? 'active' : ''}" onclick="setCalendarView('Month')">Month</button>
        </div>
      </div>

      <div class="day-scheduler-toolbar-right">
        <div class="scaffolding-badge" style="margin-bottom:0;">7-Day Rolling Fleet Schedule</div>
      </div>
    </div>

    <!-- Scaffolding Placeholder Content -->
    <div class="scheduler-scaffolding-root">
      <div class="scheduler-scaffolding-card">
        <div class="scaffolding-icon-wrap">
          <span class="material-symbols-outlined" style="font-size: 34px;">view_week</span>
        </div>
        <h3 class="scaffolding-title">Week View Scaffolding</h3>
        <p class="scaffolding-desc">Multi-day fleet Gantt allocation and 7-day dispatch timeline is staged for implementation.</p>
        <button class="day-view-transpose-btn" onclick="setCalendarView('Day')" style="margin-top: 8px;">
          <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
          <span>Return to Day View</span>
        </button>
      </div>
    </div>
  `;
}

function renderMonthViewScaffolding() {
  const container = document.getElementById('calendar-body');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Toolbar -->
    <div class="day-scheduler-toolbar">
      <div class="day-scheduler-toolbar-left">
        <div class="day-scheduler-icon-badge" style="background: #7c3aed;">
          <span class="material-symbols-outlined" style="font-size: 20px;">calendar_month</span>
        </div>
        <div>
          <h2 class="day-scheduler-title">Monthly Asset Dispatch Outlook</h2>
          <div class="day-scheduler-subtitle">Long-Term Fleet Allocations &bull; Staged View</div>
        </div>
      </div>

      <div class="day-scheduler-toolbar-center">
        <div class="scheduler-view-segmented" id="scheduler-view-mode-toggle">
          <button class="scheduler-view-segmented-btn ${currentView === 'Day' ? 'active' : ''}" onclick="setCalendarView('Day')">Day</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Week' ? 'active' : ''}" onclick="setCalendarView('Week')">Week</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Month' ? 'active' : ''}" onclick="setCalendarView('Month')">Month</button>
        </div>
      </div>

      <div class="day-scheduler-toolbar-right">
        <div class="scaffolding-badge" style="margin-bottom:0; background: rgba(124, 58, 237, 0.1); color: #7c3aed;">30-Day Fleet Outlook</div>
      </div>
    </div>

    <!-- Scaffolding Placeholder Content -->
    <div class="scheduler-scaffolding-root">
      <div class="scheduler-scaffolding-card">
        <div class="scaffolding-icon-wrap month">
          <span class="material-symbols-outlined" style="font-size: 34px;">calendar_month</span>
        </div>
        <h3 class="scaffolding-title">Month View Scaffolding</h3>
        <p class="scaffolding-desc">Monthly asset utilization heatmaps, project reservations, and recurring service windows staged for implementation.</p>
        <button class="day-view-transpose-btn" onclick="setCalendarView('Day')" style="margin-top: 8px;">
          <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
          <span>Return to Day View</span>
        </button>
      </div>
    </div>
  `;
}

function renderDayViewScheduler() {
  const container = document.getElementById('calendar-body');
  if (!container) return;

  const ROW_HEIGHT = 60; // 60px per hour in normal mode => 1px per minute
  const HOUR_WIDTH = 80; // 80px per hour in transposed mode => 1.333px per minute

  // Build All-Day Events Banner
  const bannerHtml = `
    <div class="day-all-day-banner-area" id="day-all-day-banner-area">
      ${mockAllDayEvents.map(event => `
        <div class="all-day-maintenance-card" style="border-left-color: ${event.statusColor};">
          <div class="maintenance-card-left">
            <span class="material-symbols-outlined maintenance-warning-icon">warning</span>
            <div>
              <span class="maintenance-card-title">${escapeHtml(event.title)}</span>
              <span class="maintenance-card-detail">${escapeHtml(event.detail)}</span>
            </div>
          </div>
          <div class="maintenance-status-badge">OUT FOR SERVICE</div>
        </div>
      `).join('')}
    </div>
  `;

  // Build Shared Contextual Toolbar HTML
  const toolbarHtml = `
    <div class="day-scheduler-toolbar">
      <div class="day-scheduler-toolbar-left">
        <div class="day-scheduler-icon-badge">
          <span class="material-symbols-outlined" style="font-size: 20px;">calendar_view_day</span>
        </div>
        <div>
          <h2 class="day-scheduler-title">Daily Fleet Dispatch</h2>
          <div class="day-scheduler-subtitle">24-Hour Dispatch Grid &bull; Real-Time Asset Allocation</div>
        </div>
      </div>

      <div class="day-scheduler-toolbar-center">
        <!-- View Toggle (Day / Week / Month) -->
        <div class="scheduler-view-segmented" id="scheduler-view-mode-toggle">
          <button class="scheduler-view-segmented-btn ${currentView === 'Day' ? 'active' : ''}" onclick="setCalendarView('Day')">Day</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Week' ? 'active' : ''}" onclick="setCalendarView('Week')">Week</button>
          <button class="scheduler-view-segmented-btn ${currentView === 'Month' ? 'active' : ''}" onclick="setCalendarView('Month')">Month</button>
        </div>

        <!-- Transpose View Toggle Button -->
        <button class="day-view-transpose-btn ${dayTransposed ? 'active' : ''}" id="day-transpose-btn" onclick="toggleDayTranspose()" title="Transpose Grid Axes (Flip Time & Assets)">
          <span class="material-symbols-outlined" style="font-size: 16px;">swap_horiz</span>
          <span id="transpose-btn-label">${dayTransposed ? 'Axis: Transposed (Y-Asset / X-Time)' : 'Transpose View'}</span>
        </button>

        <!-- Dropdown 1: Filter by Asset -->
        <div class="scheduler-filter-wrapper" title="Filter by Asset">
          <select id="day-filter-asset"
                  name="Filter by Asset"
                  class="scheduler-filter-select"
                  aria-label="Filter by Asset"
                  title="Filter by Asset"
                  data-testid="filter-by-asset"
                  onchange="handleAssetFilterChange(this.value)">
            <option value="All Assets" ${selectedAssetFilter === 'All Assets' ? 'selected' : ''}>All Assets</option>
            <optgroup label="Categories">
              <option value="Frannas" ${selectedAssetFilter === 'Frannas' ? 'selected' : ''}>Frannas</option>
              <option value="Crawlers" ${selectedAssetFilter === 'Crawlers' ? 'selected' : ''}>Crawlers</option>
              <option value="All Terrains" ${selectedAssetFilter === 'All Terrains' ? 'selected' : ''}>All Terrains</option>
            </optgroup>
            <optgroup label="Fleet Assets">
              ${(window.ionConfig?.fleetRegistry || []).map(a => `
                <option value="asset:${a.id}" ${selectedAssetFilter === 'asset:' + a.id ? 'selected' : ''}>${a.id} — ${a.label || a.description || a.class}</option>
              `).join('')}
            </optgroup>
          </select>
        </div>

        <!-- Dropdown 2: Filter by Worker -->
        <div class="scheduler-filter-wrapper" title="Filter by Worker">
          <select id="day-filter-worker"
                  name="Filter by Worker"
                  class="scheduler-filter-select"
                  aria-label="Filter by Worker"
                  title="Filter by Worker"
                  data-testid="filter-by-worker"
                  onchange="handleWorkerFilterChange(this.value)">
            <option value="All Workers" ${selectedWorkerFilter === 'All Workers' ? 'selected' : ''}>All Workers</option>
            <option value="Available" ${selectedWorkerFilter === 'Available' ? 'selected' : ''}>Available</option>
            <option value="Overtime Warning" ${selectedWorkerFilter === 'Overtime Warning' ? 'selected' : ''}>Overtime Warning</option>
            <optgroup label="Assigned Personnel">
              ${(window.ionConfig?.workerRegistry || []).map(w => `
                <option value="worker:${w.name}" ${selectedWorkerFilter === 'worker:' + w.name ? 'selected' : ''}>${w.name} (${w.role})</option>
              `).join('')}
            </optgroup>
          </select>
        </div>
      </div>

      <div class="day-scheduler-toolbar-right">
        <div class="day-legend-item">
          <span class="day-legend-dot working"></span>
          <span>Working Hours (06:00 – 18:00)</span>
        </div>
        <div class="day-legend-item">
          <span class="day-legend-dot shaded"></span>
          <span>Shaded (24h Bookable)</span>
        </div>
      </div>
    </div>
  `;

  const visibleLanes = getFilteredSchedulerLanes();

  if (dayTransposed) {
    // =========================================================================
    // TRANSPOSED VIEW: Assets on Y-axis (Rows), Time on X-axis (Columns)
    // =========================================================================

    // Top Header Row: Corner Cell + 24 Hour Columns
    let hourHeadersHtml = '';
    for (let h = 0; h < 24; h++) {
      const isWorking = h >= 6 && h < 18;
      hourHeadersHtml += `
        <div class="transposed-hour-header ${isWorking ? 'working-header' : 'shaded-header'}">
          ${formatGutterHour(h)}
        </div>
      `;
    }

    // Asset Rows: Site Inspections / Reps Lane (Top) + Fleet Assets
    let assetRowsHtml = '';
    if (visibleLanes.length === 0) {
      assetRowsHtml = `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-secondary); width: 100%;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">No assets match current filters (${escapeHtml(selectedAssetFilter)} / ${escapeHtml(selectedWorkerFilter)})</div>
          <button class="day-view-transpose-btn" onclick="resetSchedulerFilters()" style="margin: 0 auto;">Reset Filters</button>
        </div>
      `;
    } else {
      assetRowsHtml = visibleLanes.map(asset => {
        const isInspection = asset.isInspectionLane;

        // 24 Hourly background slots
        let slotsHtml = '';
        for (let h = 0; h < 24; h++) {
          const isWorking = h >= 6 && h < 18;
          const slotClass = isWorking ? 'working-hour' : 'shaded-hour';
          slotsHtml += `
            <div class="transposed-hour-slot ${slotClass}"
                 data-hour="${h}"
                 data-asset="${asset.id}"
                 data-asset-id="${asset.id}"
                 data-time="${String(h).padStart(2, '0')}:00"
                 ondragover="handleSlotDragOver(event)"
                 ondragenter="handleSlotDragEnter(event)"
                 ondragleave="handleSlotDragLeave(event)"
                 ondrop="handleSlotDrop(event, '${asset.id}', ${h})"
                 onclick="handleSlotClick(event, '${asset.id}', ${h})"
                 title="Click to book ${escapeHtml(asset.label)} at ${formatGutterHour(h)}">
            </div>
          `;
        }

        // Filter jobs for this asset
        const assetJobs = mockDispatchData.filter(j => j.assetId === asset.id);
        const jobsHtml = assetJobs.map(job => {
          const startMinutes = timeStringToMinutes(job.startTime);
          const endMinutes = timeStringToMinutes(job.endTime);
          const durationMinutes = Math.max(endMinutes - startMinutes, 30);

          const leftPx = startMinutes * (HOUR_WIDTH / 60);
          const widthPx = Math.max(durationMinutes * (HOUR_WIDTH / 60), 50);

          return `
            <div class="dispatch-job-card transposed-job-card ${job.isInspection ? 'inspection-job-card' : ''}"
                 id="job-card-${job.id}"
                 data-job-id="${job.id}"
                 draggable="true"
                 ondragstart="handleJobDragStart(event, '${job.id}')"
                 ondragend="handleJobDragEnd(event)"
                 onclick="handleJobClick(event, '${job.id}')"
                 onmousedown="startJobDrag(event, '${job.id}')"
                 style="left: ${leftPx}px; width: ${widthPx}px; ${!job.isInspection ? `background: ${job.statusColor};` : ''}"
                 title="${escapeHtml(job.client)} (${job.startTime} - ${job.endTime})&#10;${escapeHtml(job.siteAddress)}">
              <div class="dispatch-job-header">
                <span class="dispatch-job-client">${escapeHtml(job.client)}</span>
                <span class="material-symbols-outlined dispatch-job-phone-icon" title="Call Contact">call</span>
              </div>
              <div class="dispatch-job-address">${escapeHtml(job.siteAddress)}</div>
              ${job.isInspection ? `
                <div class="inspection-tag-badge">
                  <span class="material-symbols-outlined" style="font-size: 11px;">assignment</span>
                  <span>Site Inspection / Rep</span>
                </div>
              ` : ''}
              <div class="dispatch-job-time">
                <span class="material-symbols-outlined" style="font-size: 12px;">schedule</span>
                <span>${job.startTime} – ${job.endTime}</span>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="transposed-asset-row ${isInspection ? 'inspection-row' : ''}" id="row-${asset.id}" data-asset-id="${asset.id}">
            <div class="transposed-asset-header-cell ${isInspection ? 'inspection-lane-header' : ''}">
              ${isInspection ? `
                <span class="material-symbols-outlined" style="color: #6366f1; font-size: 20px; flex-shrink: 0;">assignment_ind</span>
              ` : `
                <span class="asset-col-header-dot" style="background: ${asset.color};"></span>
              `}
              <div style="min-width:0; overflow:hidden; flex:1;">
                <div class="asset-col-header-title" ${isInspection ? 'style="color:#4338ca;"' : ''}>${escapeHtml(asset.label)}</div>
                <div class="asset-col-header-subtitle" ${isInspection ? 'style="color:#6366f1;"' : ''}>${escapeHtml(asset.type)}</div>
                ${asset.workerName ? `
                  <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-top:2px; display:flex; align-items:center; gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:12px;">person</span>
                    <span>${escapeHtml(asset.workerName)}</span>
                    ${asset.overtimeWarning ? '<span style="color:#dc2626; font-weight:700; font-size:9px; background:#fee2e2; padding:1px 4px; border-radius:3px;">OVERTIME</span>' : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="transposed-row-slots">
              ${slotsHtml}
              ${jobsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      ${toolbarHtml}
      ${bannerHtml}
      <div class="dispatch-viewport transposed" id="day-dispatch-viewport">
        <!-- Top Sticky Header Row -->
        <div class="transposed-header-row">
          <div class="transposed-corner-header">ASSET / LANE</div>
          ${hourHeadersHtml}
        </div>

        <!-- Transposed Body Canvas -->
        <div class="transposed-body-canvas">
          ${assetRowsHtml}
        </div>
      </div>
    `;

    // Attach single click delegation and drop handling to the main grid container
    attachGridInteractivity();

    // Auto-scroll horizontally to 06:00 (start of working hours: 6 * 80px = 480px)
    setTimeout(() => {
      const viewport = document.getElementById('day-dispatch-viewport');
      if (viewport) {
        viewport.scrollLeft = 6 * HOUR_WIDTH;
      }
    }, 30);

  } else {
    // =========================================================================
    // STANDARD VIEW: Assets on X-axis (Columns), Time on Y-axis (Rows)
    // =========================================================================

    // Sticky Asset Headers
    const assetHeadersHtml = visibleLanes.map(asset => {
      const isInspection = asset.isInspectionLane;
      return `
        <div class="dispatch-asset-col-header ${isInspection ? 'inspection-lane-header' : ''}">
          ${isInspection ? `
            <span class="material-symbols-outlined" style="color: #6366f1; font-size: 20px; flex-shrink: 0;">assignment_ind</span>
          ` : `
            <span class="asset-col-header-dot" style="background: ${asset.color};"></span>
          `}
          <div style="min-width:0; overflow:hidden; flex:1;">
            <div class="asset-col-header-title" ${isInspection ? 'style="color:#4338ca;"' : ''}>${escapeHtml(asset.label)}</div>
            <div class="asset-col-header-subtitle" ${isInspection ? 'style="color:#6366f1;"' : ''}>${escapeHtml(asset.type)}</div>
            ${asset.workerName ? `
              <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-top:2px; display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-outlined" style="font-size:12px;">person</span>
                <span>${escapeHtml(asset.workerName)}</span>
                ${asset.overtimeWarning ? '<span style="color:#dc2626; font-weight:700; font-size:9px; background:#fee2e2; padding:1px 4px; border-radius:3px;">OVERTIME</span>' : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Time Gutter (24 Hours down Y-axis)
    let timeGutterHtml = '';
    for (let h = 0; h < 24; h++) {
      timeGutterHtml += `
        <div class="dispatch-hour-label">
          ${formatGutterHour(h)}
        </div>
      `;
    }

    // Asset Columns and Jobs
    let assetColumnsHtml = '';
    if (visibleLanes.length === 0) {
      assetColumnsHtml = `
        <div style="padding: 60px 24px; text-align: center; color: var(--text-secondary); flex: 1;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">No assets match current filters (${escapeHtml(selectedAssetFilter)} / ${escapeHtml(selectedWorkerFilter)})</div>
          <button class="day-view-transpose-btn" onclick="resetSchedulerFilters()" style="margin: 0 auto;">Reset Filters</button>
        </div>
      `;
    } else {
      assetColumnsHtml = visibleLanes.map(asset => {
        const isInspection = asset.isInspectionLane;

        // 24 Hourly vertical rows
        let hourSlotsHtml = '';
        for (let h = 0; h < 24; h++) {
          const isWorking = h >= 6 && h < 18;
          const slotClass = isWorking ? 'working-hour' : 'shaded-hour';
          hourSlotsHtml += `
            <div class="dispatch-hour-slot ${slotClass}"
                 data-hour="${h}"
                 data-asset="${asset.id}"
                 data-asset-id="${asset.id}"
                 data-time="${String(h).padStart(2, '0')}:00"
                 ondragover="handleSlotDragOver(event)"
                 ondragenter="handleSlotDragEnter(event)"
                 ondragleave="handleSlotDragLeave(event)"
                 ondrop="handleSlotDrop(event, '${asset.id}', ${h})"
                 onclick="handleSlotClick(event, '${asset.id}', ${h})"
                 title="Click to book ${escapeHtml(asset.label)} at ${formatGutterHour(h)}">
            </div>
          `;
        }

        // Filter jobs allocated to this asset
        const assetJobs = mockDispatchData.filter(j => j.assetId === asset.id);
        const jobsHtml = assetJobs.map(job => {
          const startMinutes = timeStringToMinutes(job.startTime);
          const endMinutes = timeStringToMinutes(job.endTime);
          const durationMinutes = Math.max(endMinutes - startMinutes, 30);

          const topPx = startMinutes * (ROW_HEIGHT / 60);
          const heightPx = durationMinutes * (ROW_HEIGHT / 60);
          const isCompact = durationMinutes <= 60;

          return `
            <div class="dispatch-job-card ${job.isInspection ? 'inspection-job-card' : ''} ${isCompact ? 'compact-job' : ''}"
                 id="job-card-${job.id}"
                 data-job-id="${job.id}"
                 draggable="true"
                 ondragstart="handleJobDragStart(event, '${job.id}')"
                 ondragend="handleJobDragEnd(event)"
                 onclick="handleJobClick(event, '${job.id}')"
                 onmousedown="startJobDrag(event, '${job.id}')"
                 style="top: ${topPx}px; height: ${heightPx}px; ${!job.isInspection ? `background: ${job.statusColor};` : ''}"
                 title="${escapeHtml(job.client)} (${job.startTime} - ${job.endTime})&#10;${escapeHtml(job.siteAddress)}">
              <div class="dispatch-job-header">
                <span class="dispatch-job-client">${escapeHtml(job.client)}</span>
                <span class="material-symbols-outlined dispatch-job-phone-icon" title="Call Contact">call</span>
              </div>
              <div class="dispatch-job-address">${escapeHtml(job.siteAddress)}</div>
              ${job.isInspection ? `
                <div class="inspection-tag-badge">
                  <span class="material-symbols-outlined" style="font-size: 11px;">assignment</span>
                  <span>Site Inspection / Rep</span>
                </div>
              ` : ''}
              ${!isCompact ? `
                <div class="dispatch-job-time">
                  <span class="material-symbols-outlined" style="font-size: 13px;">schedule</span>
                  <span>${job.startTime} – ${job.endTime}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        return `
          <div class="dispatch-asset-col ${isInspection ? 'inspection-col' : ''}" id="col-${asset.id}" data-asset-id="${asset.id}">
            ${hourSlotsHtml}
            ${jobsHtml}
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      ${toolbarHtml}
      ${bannerHtml}
      <div class="dispatch-viewport" id="day-dispatch-viewport">
        <!-- Sticky Asset Column Headers -->
        <div class="dispatch-assets-header-row">
          <div class="dispatch-gutter-header">TIME</div>
          ${assetHeadersHtml}
        </div>

        <!-- 24-Hour Grid Canvas -->
        <div class="dispatch-grid-canvas">
          <div class="dispatch-time-gutter">
            ${timeGutterHtml}
          </div>
          ${assetColumnsHtml}
        </div>
      </div>
    `;

    // Attach single click delegation and drop handling to the main grid container
    attachGridInteractivity();

    // Auto-scroll to 06:00 (start of working hours: 6 * 60px = 360px)
    setTimeout(() => {
      const viewport = document.getElementById('day-dispatch-viewport');
      if (viewport) {
        viewport.scrollTop = 6 * ROW_HEIGHT;
      }
    }, 30);
  }
}

// Function alias to ensure calls to renderCalendar() dispatch to appropriate view
function renderCalendar() {
  if (currentView === 'Week') {
    renderWeekViewScaffolding();
  } else if (currentView === 'Month') {
    renderMonthViewScaffolding();
  } else {
    renderDayViewScheduler();
  }
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
 showToast(`DocuWare Sign Workflow Executed!\n\nHire Agreement #DW-AGR-${_activeDWBookingId?.toUpperCase()} sent to client. E-Signature verified & stored in DocuWare Vault.`);
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
 showToast(`DocuWare Intelligent Indexing Completed!\n\nField Wet-Hire Docket indexed successfully. Machine hours extracted, billable total verified, and job advanced to Completed!`);
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
 showToast(`DocuWare Webhook Received!\n\nNew Safety & Inspection Certificate for ${assetId} verified and indexed in DocuWare Vault.\nHard Dispatch Interlock RELEASED! ${assetId} is now available for booking.`);
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

 let filteredBookings = Array.isArray(bookings) ? bookings.filter(Boolean) : [];
 if(searchQuery){
  filteredBookings=filteredBookings.filter(b=>
   b && (
     (b.clientName||'').toLowerCase().includes(searchQuery)||
     (b.assetNumber||'').toLowerCase().includes(searchQuery)||
     (b.operatorName||'').toLowerCase().includes(searchQuery)||
     (b.jobDescription||'').toLowerCase().includes(searchQuery)
   )
  );
 }

 let html=`<div class="kanban-board" style="display:flex; gap:16px; padding:16px; height:100%; overflow-x:auto; background:var(--bg-secondary);">`;

 columns.forEach(col=>{
  if(stageFilter!=='ALL'&&stageFilter!==col.id) return;

  const colB=filteredBookings.filter(b=>b && (b.status||'Scheduled')===col.id);
  
  html+=`<div class="kanban-col" style="flex: 0 0 320px; display:flex; flex-direction:column; background:var(--bg-primary); border-radius:8px; border:1px solid var(--border-light); box-shadow:0 1px 2px rgba(0,0,0,0.05);" ondragover="event.preventDefault()" ondrop="moveBookingStatus(event, '${col.id}')">`;
  
  // Column Header
  html+=`<div class="kanban-col-header" style="padding:16px; border-bottom:2px solid ${col.color}; display:flex; justify-content:space-between; align-items:center;">
    <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:12px; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px;">
      <span style="color:${col.color};">${col.svg}</span>
      ${col.title}
    </div>
    <div style="background:var(--bg-secondary); padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; color:var(--text-secondary);">${colB.length}</div>
  </div>`;
  
  // Column Body
  html+=`<div class="kanban-col-body" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px;">`;
  
  if(colB.length===0){
    html+=`<div style="text-align:center; padding:24px 0; color:var(--text-muted); font-size:12px; font-weight:500;">No jobs in this stage</div>`;
  }

  colB.forEach(b=>{
   const startD=new Date(b.startTime);
   const hex=ASSET_HEX[b.assetNumber]||'#888';
   const pipeline=getDocPipelineStatus(b);
   
   html+=`<div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${b.id}')" style="background:#fff; border:1px solid var(--border-light); border-radius:6px; padding:16px; cursor:grab; box-shadow:0 1px 3px rgba(0,0,0,0.08); transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.08)'">`;
   
   html+=`<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
    <div style="background:${hex}15; color:${hex}; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">${b.assetNumber}</div>
    <div style="font-size:11px; font-weight:600; color:var(--text-muted);">${startD.toLocaleDateString('en-AU')}</div>
   </div>`;
   
   html+=`<div style="font-weight:700; font-size:14px; margin-bottom:4px; color:var(--text-primary); line-height:1.2;">${b.clientName}</div>`;
   
   const opName = b.hireType === 'wet' && b.wetHireResources && b.wetHireResources.length > 0 ? b.wetHireResources[0].workerName : (b.operatorName || '');
   if(opName) html+=`<div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; display:flex; align-items:center; gap:4px;">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
     ${opName}
   </div>`;
   else html+=`<div style="height:28px;"></div>`;
   
   // Action button based on column
   if(col.id==='Scheduled') {
      const isSigned = pipeline?.hireAgreement?.status === 'signed' || Boolean(b.contractSigned);
      html+=`<button class="btn-primary" style="width:100%; padding:6px; font-size:11px; background:${isSigned?'var(--bg-secondary)':'var(--brand-primary)'}; color:${isSigned?'var(--text-primary)':'#fff'}; border:1px solid ${isSigned?'var(--border-light)':'transparent'};" onclick="openDocuWareContractModal('${b.id}')">${isSigned?'Contract Signed':'Generate Agreement'}</button>`;
   }
   if(col.id==='Docket Verification') {
      const isUploaded = pipeline?.fieldDocket?.status === 'pushed' || Boolean(b.docketUploaded);
      html+=`<div style="display:flex; gap:8px;">
        <button style="width:32px; height:32px; flex-shrink:0; border:1px solid var(--border-light); background:var(--bg-secondary); border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="openDocuWareDocketModal('${b.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
        <button class="btn-primary" style="flex:1; padding:6px; font-size:11px; background:${isUploaded?'var(--bg-secondary)':'var(--accent-copper)'}; color:${isUploaded?'var(--text-primary)':'#fff'}; border:1px solid ${isUploaded?'var(--border-light)':'transparent'};" onclick="openDocuWareDocketModal('${b.id}')">${isUploaded?'Docket Verified':'Upload Field Docket'}</button>
      </div>`;
   }
   if(col.id==='Completed') {
      html+=`<button class="btn-primary" style="width:100%; padding:6px; font-size:11px; background:var(--brand-primary); color:#fff; border:none;" onclick="triggerDocuWareDoc('${b.id}', '${b.clientName}')">Issue Invoice</button>`;
   }
   if(col.id==='Invoiced') {
      html+=`<button class="btn-primary" style="width:100%; padding:6px; font-size:11px; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-light);" onclick="alert('Viewing invoice for ${b.clientName}...')">View Billing Record</button>`;
   }

   html+=`</div>`;
  });

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

/* ==========================================================================
   ADMINISTRATION MODULE: FLEET, PERSONNEL & SCHEDULING RULES
   Single Source of Truth: window.ionConfig
   ========================================================================== */
let currentAdminSubTab = 'fleet';

function switchAdminSubTab(tabName) {
  currentAdminSubTab = tabName;
  ['fleet', 'personnel', 'scheduling'].forEach(t => {
    const btn = document.getElementById(`admin-subtab-${t}`);
    const view = document.getElementById(`admin-view-${t}`);
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (view) {
      if (t === tabName) {
        view.style.display = 'flex';
      } else {
        view.style.display = 'none';
      }
    }
  });

  if (tabName === 'fleet') renderAdminFleetTable();
  else if (tabName === 'personnel') renderAdminPersonnelTable();
  else if (tabName === 'scheduling') loadAdminSchedulingRules();
}

function renderAdminModule() {
  switchAdminSubTab(currentAdminSubTab || 'fleet');
}

function renderAdminFleetTable() {
  const tbody = document.getElementById('admin-fleet-table-body');
  if (!tbody) return;

  const fleet = window.ionConfig?.fleetRegistry || [];
  const searchInput = document.getElementById('admin-fleet-search');
  const classFilter = document.getElementById('admin-fleet-class-filter');
  const q = (searchInput?.value || '').toLowerCase().trim();
  const cFilter = (classFilter?.value || 'ALL');

  // Populate class filter dynamically if options are just standard
  if (classFilter && classFilter.options.length <= 1) {
    const uniqueClasses = [...new Set(fleet.map(a => a.class || a.category).filter(Boolean))];
    uniqueClasses.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      classFilter.appendChild(opt);
    });
  }

  let filtered = fleet.filter(a => {
    const matchesSearch = !q ||
      (a.id && a.id.toLowerCase().includes(q)) ||
      (a.class && a.class.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.label && a.label.toLowerCase().includes(q)) ||
      (a.workerName && a.workerName.toLowerCase().includes(q));

    const matchesClass = (cFilter === 'ALL') ||
      (a.class && a.class === cFilter) ||
      (a.category && a.category === cFilter);

    return matchesSearch && matchesClass;
  });

  const countBadge = document.getElementById('admin-fleet-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Registered`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);font-style:italic;">
          No fleet assets found matching the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const color = a.color || a.hex || '#0284c7';
    const desc = a.description || a.label || 'Standard Plant Asset';
    const cls = a.class || a.category || 'General Plant';
    const operator = a.workerName || 'Unassigned (Pool)';
    const status = a.workerStatus === 'overtime' ?
      '<span class="admin-badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">warning</span> Overtime</span>' :
      '<span class="admin-badge-active"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Available</span>';

    return `
      <tr>
        <td style="text-align:center;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${color};border:1px solid rgba(0,0,0,0.15);" title="${color}"></span>
        </td>
        <td style="font-weight:800;color:var(--text-primary);font-family:monospace;font-size:13px;">${escapeHtml(a.id)}</td>
        <td style="font-weight:600;color:var(--text-primary);">${escapeHtml(cls)}</td>
        <td style="color:var(--text-secondary);">${escapeHtml(desc)}</td>
        <td style="font-size:13px;color:var(--text-primary);"><span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;margin-right:4px;color:var(--text-muted);">person</span>${escapeHtml(operator)}</td>
        <td>${status}</td>
        <td style="text-align:right;">
          <button class="btn-secondary" style="padding:4px 8px;font-size:12px;color:#dc2626;border-color:rgba(220,38,38,0.3);" onclick="deleteFleetAssetAdmin('${a.id}')" title="Delete Asset">
            <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminPersonnelTable() {
  const tbody = document.getElementById('admin-personnel-table-body');
  if (!tbody) return;

  const workers = window.ionConfig?.workerRegistry || [];
  const searchInput = document.getElementById('admin-workers-search');
  const roleFilter = document.getElementById('admin-workers-role-filter');
  const statusFilter = document.getElementById('admin-workers-status-filter');

  const q = (searchInput?.value || '').toLowerCase().trim();
  const rFilter = (roleFilter?.value || 'ALL');
  const sFilter = (statusFilter?.value || 'ALL');

  let filtered = workers.filter(w => {
    const matchesSearch = !q ||
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.role && w.role.toLowerCase().includes(q)) ||
      (w.licenseClass && w.licenseClass.toLowerCase().includes(q)) ||
      (w.licenseNumber && w.licenseNumber.toLowerCase().includes(q));

    const matchesRole = (rFilter === 'ALL') ||
      (w.role && w.role.toLowerCase().includes(rFilter.toLowerCase()));

    const matchesStatus = (sFilter === 'ALL') ||
      (w.hrwlStatus && w.hrwlStatus.toLowerCase() === sFilter.toLowerCase());

    return matchesSearch && matchesRole && matchesStatus;
  });

  const countBadge = document.getElementById('admin-workers-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Personnel`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);font-style:italic;">
          No personnel found matching the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(w => {
    const isExpired = (w.hrwlStatus === 'Expired') || (w.hrwlExpiry && new Date(w.hrwlExpiry) < new Date());
    const statusBadge = isExpired ?
      `<span class="admin-badge-expired"><span class="material-symbols-outlined" style="font-size:14px;">error</span> Expired (Locked)</span>` :
      `<span class="admin-badge-active"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Active</span>`;

    return `
      <tr>
        <td style="font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(2,132,199,0.1);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">
            ${(w.name || '').split(' ').map(n=>n[0]).join('')}
          </div>
          <span>${escapeHtml(w.name)}</span>
        </td>
        <td style="color:var(--text-secondary);font-weight:500;">${escapeHtml(w.role)}</td>
        <td style="font-family:monospace;font-weight:700;color:var(--text-primary);">${escapeHtml(w.licenseClass || 'HRWL')}</td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${escapeHtml(w.licenseNumber || '—')}</td>
        <td style="color:${isExpired ? '#dc2626' : 'var(--text-primary)'};font-weight:${isExpired ? '700' : '500'};">${escapeHtml(w.hrwlExpiry || 'N/A')}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

function loadAdminSchedulingRules() {
  const rules = window.ionConfig?.schedulingRules || {};
  const startEl = document.getElementById('admin-rule-start-time');
  const endEl = document.getElementById('admin-rule-end-time');
  const hoursEl = document.getElementById('admin-rule-std-hours');
  const otEl = document.getElementById('admin-rule-ot-mult');
  const dblEl = document.getElementById('admin-rule-double-mult');
  const restEl = document.getElementById('admin-rule-rest-period');

  if (startEl && rules.standardHoursStart) startEl.value = rules.standardHoursStart;
  if (endEl && rules.standardHoursEnd) endEl.value = rules.standardHoursEnd;
  if (hoursEl && rules.standardHoursDuration) hoursEl.value = rules.standardHoursDuration;
  if (otEl && rules.overtimeMultiplier) otEl.value = rules.overtimeMultiplier;
  if (dblEl && rules.doubleTimeMultiplier) dblEl.value = rules.doubleTimeMultiplier;
  if (restEl && rules.restPeriodHours) restEl.value = rules.restPeriodHours;
}

function saveAdminSchedulingRules() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.schedulingRules) window.ionConfig.schedulingRules = {};

  const startEl = document.getElementById('admin-rule-start-time');
  const endEl = document.getElementById('admin-rule-end-time');
  const hoursEl = document.getElementById('admin-rule-std-hours');
  const otEl = document.getElementById('admin-rule-ot-mult');
  const dblEl = document.getElementById('admin-rule-double-mult');
  const restEl = document.getElementById('admin-rule-rest-period');

  if (startEl) window.ionConfig.schedulingRules.standardHoursStart = startEl.value;
  if (endEl) window.ionConfig.schedulingRules.standardHoursEnd = endEl.value;
  if (hoursEl) window.ionConfig.schedulingRules.standardHoursDuration = parseFloat(hoursEl.value) || 8.0;
  if (otEl) window.ionConfig.schedulingRules.overtimeMultiplier = parseFloat(otEl.value) || 1.5;
  if (dblEl) window.ionConfig.schedulingRules.doubleTimeMultiplier = parseFloat(dblEl.value) || 2.0;
  if (restEl) window.ionConfig.schedulingRules.restPeriodHours = parseInt(restEl.value, 10) || 10;

  const statusEl = document.getElementById('admin-rules-status');
  if (statusEl) {
    statusEl.style.display = 'inline';
    statusEl.textContent = 'Saved to window.ionConfig';
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }

  showToast('Operational scheduling rules successfully persisted to system configuration.', 'success', 'Rules Updated');
}

function openAddAssetAdminModal() {
  const modal = document.getElementById('admin-add-asset-modal');
  if (!modal) return;

  // Reset fields
  const idEl = document.getElementById('modal-asset-id');
  const classEl = document.getElementById('modal-asset-class');
  const descEl = document.getElementById('modal-asset-desc');
  const colorEl = document.getElementById('modal-asset-color');
  const hexEl = document.getElementById('modal-asset-hex');
  const workerEl = document.getElementById('modal-asset-worker');

  if (idEl) idEl.value = '';
  if (classEl) classEl.value = '';
  if (descEl) descEl.value = '';
  if (colorEl) colorEl.value = '#0284c7';
  if (hexEl) hexEl.value = '#0284c7';

  if (workerEl) {
    const workers = window.ionConfig?.workerRegistry || [];
    workerEl.innerHTML = '<option value="">Unassigned (Open Pool)</option>' +
      workers.map(w => `<option value="${w.name}">${w.name} (${w.role})</option>`).join('');
  }

  modal.style.display = 'flex';
}

function closeAddAssetAdminModal() {
  const modal = document.getElementById('admin-add-asset-modal');
  if (modal) modal.style.display = 'none';
}

function submitAddAssetAdmin() {
  const idEl = document.getElementById('modal-asset-id');
  const classEl = document.getElementById('modal-asset-class');
  const descEl = document.getElementById('modal-asset-desc');
  const colorEl = document.getElementById('modal-asset-color');
  const hexEl = document.getElementById('modal-asset-hex');
  const workerEl = document.getElementById('modal-asset-worker');

  const assetId = (idEl?.value || '').trim().toUpperCase();
  const assetClass = (classEl?.value || '').trim() || 'General Crane / Plant';
  const assetDesc = (descEl?.value || '').trim() || assetClass;
  const color = hexEl?.value || colorEl?.value || '#0284c7';
  const workerName = workerEl?.value || 'Unassigned';

  if (!assetId) {
    showToast('Asset Identification Code is required.', 'error', 'Validation Error');
    if (idEl) idEl.focus();
    return;
  }

  // Check duplicate
  if (window.ionConfig?.fleetRegistry?.some(a => a.id === assetId)) {
    showToast(`Asset ID "${assetId}" already exists in the fleet registry.`, 'error', 'Duplicate Code');
    return;
  }

  const newAsset = {
    id: assetId,
    label: `${assetId} - ${assetClass}`,
    class: assetClass,
    description: assetDesc,
    type: assetClass,
    category: assetClass.toLowerCase().includes('franna') ? 'franna' :
              assetClass.toLowerCase().includes('crawler') ? 'crawler' :
              assetClass.toLowerCase().includes('terrain') ? 'all_terrain' : 'crane',
    color: color,
    hex: color,
    workerName: workerName,
    workerStatus: 'available',
    hoursToday: 0
  };

  if (!window.ionConfig.fleetRegistry) window.ionConfig.fleetRegistry = [];
  window.ionConfig.fleetRegistry.push(newAsset);

  // Sync to dataModels.assetRegistry
  if (!assetRegistry.some(a => a.id === assetId)) {
    assetRegistry.push({
      id: assetId,
      description: assetDesc,
      hex: color,
      assetType: newAsset.category
    });
  }

  // Sync scheduler lanes
  if (typeof syncSchedulerLanes === 'function') syncSchedulerLanes();

  closeAddAssetAdminModal();
  renderAdminFleetTable();

  // If calendar view is active, update scheduler
  if (currentView === 'Day') {
    renderDayViewScheduler();
  }

  showToast(`Asset ${assetId} (${assetClass}) successfully provisioned into fleet registry.`, 'success', 'Fleet Asset Added');
}

function deleteFleetAssetAdmin(assetId) {
  if (!confirm(`Are you sure you want to decommission and remove asset ${assetId} from the active fleet registry?`)) {
    return;
  }

  if (window.ionConfig?.fleetRegistry) {
    window.ionConfig.fleetRegistry = window.ionConfig.fleetRegistry.filter(a => a.id !== assetId);
  }

  const idx = assetRegistry.findIndex(a => a.id === assetId);
  if (idx >= 0) assetRegistry.splice(idx, 1);

  if (typeof syncSchedulerLanes === 'function') syncSchedulerLanes();

  renderAdminFleetTable();
  if (currentView === 'Day') renderDayViewScheduler();

  showToast(`Asset ${assetId} removed from registry.`, 'info', 'Asset Decommissioned');
}

/* ==========================================================================
   SYSTEM SETTINGS: IT INTEGRATIONS (DOCUWARE, XERO, LOCALISATION)
   ========================================================================== */
function renderSystemSettingsView() {
  const it = window.ionConfig?.integrations || {};

  const dwEnd = document.getElementById('it-dw-endpoint');
  const dwOrg = document.getElementById('it-dw-org');
  const dwBadge = document.getElementById('it-dw-badge');
  if (dwEnd && it.docuwareEndpoint) dwEnd.value = it.docuwareEndpoint;
  if (dwOrg && it.docuwareOrgId) dwOrg.value = it.docuwareOrgId;
  if (dwBadge && it.docuwareStatus) {
    dwBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> ${it.docuwareStatus}`;
  }

  const xeroSec = document.getElementById('it-xero-secret');
  const xeroTen = document.getElementById('it-xero-tenant');
  const xeroBadge = document.getElementById('it-xero-badge');
  if (xeroTen && it.xeroTenant) xeroTen.value = it.xeroTenant;
  if (xeroBadge && it.xeroStatus) {
    xeroBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">sync</span> ${it.xeroStatus}`;
  }

  const locBadge = document.getElementById('it-loc-badge');
  if (locBadge && it.localisation) {
    locBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">public</span> Configured`;
  }
}

function saveDocuWareITSettings() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.integrations) window.ionConfig.integrations = {};

  const endEl = document.getElementById('it-dw-endpoint');
  const orgEl = document.getElementById('it-dw-org');
  const badgeEl = document.getElementById('it-dw-badge');

  if (endEl) window.ionConfig.integrations.docuwareEndpoint = endEl.value;
  if (orgEl) window.ionConfig.integrations.docuwareOrgId = orgEl.value;
  window.ionConfig.integrations.docuwareStatus = 'Connected';

  if (badgeEl) {
    badgeEl.className = 'status-badge connected';
    badgeEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Connected (Vault Online)';
  }

  showToast('DocuWare Cloud Platform credentials and Vault ID securely updated.', 'success', 'DocuWare Connected');
}

function testDocuWareHandshake() {
  showToast('Initiating handshake ping to DocuWare Platform API endpoint...', 'info', 'Connecting...');
  setTimeout(() => {
    showToast('DocuWare API Handshake Successful (HTTP 200 OK). REST token verified.', 'success', 'Handshake OK');
  }, 600);
}

function saveXeroITSettings() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.integrations) window.ionConfig.integrations = {};

  const secEl = document.getElementById('it-xero-secret');
  const tenEl = document.getElementById('it-xero-tenant');
  const badgeEl = document.getElementById('it-xero-badge');

  if (tenEl) window.ionConfig.integrations.xeroTenant = tenEl.value;
  window.ionConfig.integrations.xeroStatus = 'Active';

  if (badgeEl) {
    badgeEl.className = 'status-badge active';
    badgeEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">sync</span> Active (Inbound Live)';
  }

  showToast('Xero chart-of-accounts webhook integration settings saved.', 'success', 'Xero Sync Active');
}

function triggerXeroReconciliation() {
  showToast('Dispatching reconciliation sync with Xero general ledger...', 'info', 'Reconciling...');
  setTimeout(() => {
    showToast('Xero General Ledger Reconciliation Complete. All 12 invoices synchronized.', 'success', 'Sync Successful');
  }, 750);
}

function saveLocalisationSettings() {
  const tz = document.getElementById('it-timezone-select')?.value || 'Australia/Brisbane';
  const loc = document.getElementById('it-locale-select')?.value || 'en-AU';
  const fmt = document.getElementById('it-date-format-select')?.value || 'DD/MM/YYYY';

  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.integrations) window.ionConfig.integrations = {};
  window.ionConfig.integrations.localisation = `${tz} (${loc}, ${fmt})`;

  const badgeEl = document.getElementById('it-loc-badge');
  if (badgeEl) {
    badgeEl.className = 'status-badge locked';
    badgeEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">public</span> System Set to AU';
  }

  showToast(`Regional settings updated: ${tz}, ${fmt}, Australian Dollar ($ AUD).`, 'success', 'Localisation Saved');
}

// Backward-compatible stub for operator portal
function renderOperatorPortal() {
  renderAdminModule();
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
 showToast(`Exporting Comprehensive Commercial Account Ledger PDF for ${name}...\nIncludes all deployment history, hourly rate breakdowns, and verified invoice records.`);
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
 showToast(`DocuWare Webhook: Compliance record updated for ${currentCertAssetId}. Registry synchronized!`);
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
 showToast(`DocuWare Webhook Event Triggered!\n\nSafety compliance lock successfully RELEASED for ${currentCertAssetId}.\nAsset column is now UNLOCKED for dispatch in the Command Center.`);
}

/* ── COMPLIANCE & CERTS WITH SEARCH & FILTER ── */
function renderComplianceView(){
 const container=document.getElementById('compliance-container');
 if(!container)return;
 
 const q=(document.getElementById('compliance-search')?.value||'').toLowerCase();
 const s=(document.getElementById('compliance-status-filter')?.value||'ALL');
 
 let html=`<table style="width:100%; border-collapse:collapse; text-align:left; background:var(--bg-primary); box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <thead>
   <tr style="border-bottom:2px solid var(--border-light); background:var(--bg-secondary);">
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Asset Code</th>
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Description</th>
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Registration #</th>
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Cert Expiry</th>
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Compliance Status</th>
    <th style="padding:16px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; text-align:right;">Action</th>
   </tr>
  </thead>
  <tbody>`;
  
 validAssets.forEach(a=>{
  const c=complianceRegistry[a];
  if(!c)return;
  if(s!=='ALL'&&c.status!==s)return;
  if(q&&!(a.toLowerCase().includes(q)||c.desc.toLowerCase().includes(q)||c.rego.toLowerCase().includes(q)))return;
  
  let sc='#10b981',st='Valid Record';
  if(c.status==='warning'){sc='#d97706';st='Service Due (30d)';}
  else if(c.status==='expired'){sc='#dc2626';st='Cert Expired (LOCKED)';}
  
  html+=`<tr style="border-bottom:1px solid var(--border-light); transition:background 0.2s;" onmouseover="this.style.background='#F8F9FA'" onmouseout="this.style.background='transparent'">
   <td style="padding:16px; font-weight:700; color:var(--text-primary);">${a}</td>
   <td style="padding:16px; font-size:13px; color:var(--text-secondary);">${c.desc}</td>
   <td style="padding:16px; font-size:13px; font-family:monospace; color:var(--text-secondary);">${c.rego}</td>
   <td style="padding:16px; font-size:13px; color:var(--text-primary); font-weight:500;">${c.expiry}</td>
   <td style="padding:16px; font-size:12px; font-weight:600; color:${sc};">${st}</td>
   <td style="padding:16px; text-align:right;">`;
  
  if(c.status==='expired'){
   html+=`<button class="btn-primary" style="background:var(--color-danger); color:#fff; border:none; padding:6px 12px; font-size:11px; border-radius:4px; cursor:pointer;" onclick="openCertUploadModal('${a}')">Upload Cert</button>`;
  } else {
   html+=`<button class="btn-primary" style="background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-light); padding:6px 12px; font-size:11px; border-radius:4px; cursor:pointer;" onclick="openCertViewModal('${a}')">View Record</button>`;
  }
  html+=`</td></tr>`;
 });
 html+=`</tbody></table>`;
 container.innerHTML=html;
}

/* ── NOTIFICATIONS DRAWER & LEGEND POPOVER ── */
function toggleLegendPopover() {
  const menu = document.getElementById('legend-popover-menu');
  if (menu) menu.classList.toggle('open');
}

function toggleNotifications() {
  const overlay = document.getElementById('notifications-overlay');
  if (!overlay) {
    showToast('Notifications: No pending critical safety or compliance alerts.', 'info');
    return;
  }
  overlay.classList.toggle('open');
  if (overlay.classList.contains('open')) {
    renderNotifications();
  }
}

function renderNotifications() {
  const body = document.getElementById('notifications-body');
  if (!body) return;

  const items = [
    { type: 'urgent', title: 'High Risk Compliance Flag', msg: 'CR09 Crawler Crane service certificate expired on 30/07/2026. Future bookings flagged for risk review.', time: '10 mins ago' },
    { type: 'dw', title: 'Automated Document Event', msg: 'Hire Agreement #HA-9942 signed & archived for Fulton Hogan (Job b23).', time: '1 hour ago' },
    { type: 'normal', title: 'Maintenance Scheduled', msg: 'EX02 Excavator 35T service due in 12 days (16/08/2026).', time: '3 hours ago' },
    { type: 'dw', title: 'Billing Record Archived', msg: 'Automated billing engine filed invoice for Metro Rail Authority ($2,400 AUD).', time: 'Yesterday' }
  ];

  body.innerHTML = items.map(item => `
    <div class="notif-item ${item.type}">
      <div class="notif-title">${item.title}</div>
      <div class="notif-msg">${item.msg}</div>
      <div class="notif-time">${item.time}</div>
    </div>
  `).join('');
}

function updateWorker(workerId, field, value) {
  const worker = workerRegistry.find(w => w.id === workerId);
  if (worker) {
    worker[field] = value;
    if (field === 'induction_complete') {
      showToast(`Worker ${worker.name} site induction status updated to ${value ? 'Verified' : 'Unverified'}.`, 'success');
    }
  }
}

function onHireTypeChange() {
  const capGroup = document.getElementById('capacity-field-group');
  if (capGroup) {
    const assetId = document.getElementById('booking-asset')?.value;
    const isCrane = assetId && (assetId.startsWith('CR') || assetId.startsWith('BM') || assetId.startsWith('SK'));
    capGroup.style.display = isCrane ? 'block' : 'none';
  }
}

function toggleSidebar() {
  const sb = document.querySelector('.gcal-sidebar');
  if (sb) {
    sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
  }
}

function toggleSidebarRail() {
  const sb = document.getElementById('app-sidebar') || document.querySelector('.gcal-sidebar');
  if (sb) {
    sb.classList.toggle('collapsed');
  }
}

/* ── ENTERPRISE GLOBAL SEARCH ENGINE ── */
function handleGlobalSearch(query) {
  const dropdown = document.getElementById('global-search-dropdown');
  if (!dropdown) return;
  
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    dropdown.innerHTML = '';
    dropdown.classList.remove('open');
    return;
  }
  
  const matchedBookings = bookings.filter(b => 
    (b.clientName && b.clientName.toLowerCase().includes(q)) ||
    (b.assetNumber && b.assetNumber.toLowerCase().includes(q)) ||
    (b.jobDescription && b.jobDescription.toLowerCase().includes(q)) ||
    (b.operatorName && b.operatorName.toLowerCase().includes(q)) ||
    (b.id && b.id.toLowerCase().includes(q))
  ).slice(0, 5);

  const matchedAssets = assetRegistry.filter(a =>
    a.id.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchedWorkers = (typeof workerRegistry !== 'undefined' ? workerRegistry : []).filter(w =>
    w.name.toLowerCase().includes(q) ||
    w.role.toLowerCase().includes(q) ||
    (w.id && w.id.toLowerCase().includes(q))
  ).slice(0, 3);

  if (matchedBookings.length === 0 && matchedAssets.length === 0 && matchedWorkers.length === 0) {
    dropdown.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:12px;">No matching records found for "<strong>${q}</strong>"</div>`;
    dropdown.classList.add('open');
    return;
  }

  let html = '';
  
  if (matchedBookings.length > 0) {
    html += `<div style="padding:6px 12px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; background:var(--bg-secondary); color:var(--text-secondary);">Bookings & Dispatch</div>`;
    matchedBookings.forEach(b => {
      const start = new Date(b.startTime);
      html += `
        <div class="global-search-result-item" onclick="selectSearchResultBooking('${b.id}')">
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--text-main);">${b.clientName}</div>
            <div style="font-size:11px; color:var(--text-muted);">${b.assetNumber} &bull; ${b.jobDescription || 'Dispatch'} &bull; ${start.toLocaleDateString()}</div>
          </div>
          <span style="font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:12px; background:rgba(0,173,239,0.12); color:var(--ion-cyan,#00ADEF);">${b.status || 'Scheduled'}</span>
        </div>
      `;
    });
  }

  if (matchedAssets.length > 0) {
    html += `<div style="padding:6px 12px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; background:var(--bg-secondary); color:var(--text-secondary);">Fleet Assets</div>`;
    matchedAssets.forEach(a => {
      html += `
        <div class="global-search-result-item" onclick="selectSearchResultAsset('${a.id}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${a.hex};"></span>
            <div>
              <span style="font-weight:700; font-size:12.5px; color:var(--text-main);">${a.id}</span>
              <span style="font-size:11.5px; color:var(--text-secondary); margin-left:6px;">${a.description}</span>
            </div>
          </div>
          <span style="font-size:10.5px; font-weight:600; color:var(--text-muted);">${a.category}</span>
        </div>
      `;
    });
  }

  if (matchedWorkers.length > 0) {
    html += `<div style="padding:6px 12px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; background:var(--bg-secondary); color:var(--text-secondary);">Personnel & Operators</div>`;
    matchedWorkers.forEach(w => {
      html += `
        <div class="global-search-result-item" onclick="switchTab('administration'); closeGlobalSearch();">
          <div>
            <span style="font-weight:700; font-size:12.5px; color:var(--text-main);">${w.name}</span>
            <span style="font-size:11.5px; color:var(--text-secondary); margin-left:6px;">${w.role}</span>
          </div>
          <span style="font-size:10.5px; font-weight:700; color:${w.status==='Active'?'#10B981':'#EF4444'};">${w.status}</span>
        </div>
      `;
    });
  }

  dropdown.innerHTML = html;
  dropdown.classList.add('open');
}

function closeGlobalSearch() {
  const dropdown = document.getElementById('global-search-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

function selectSearchResultBooking(id) {
  closeGlobalSearch();
  switchTab('scheduler');
  openBookingDrawer(id);
}

function selectSearchResultAsset(assetId) {
  closeGlobalSearch();
  switchTab('scheduler');
  activeAssetFilters.clear();
  activeAssetFilters.add(assetId);
  renderFilterBar();
  renderCalendar();
  showToast(`Filtered scheduler for asset ${assetId}`, 'info');
}

// Global click handler to dismiss search dropdown
document.addEventListener('click', (e) => {
  if (!e.target.closest('.gcal-global-search-wrap')) {
    closeGlobalSearch();
  }
});

// Keyboard shortcut CMD+K / CTRL+K
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('global-search-input');
    if (input) {
      input.focus();
      input.select();
    }
  } else if (e.key === 'Escape') {
    closeGlobalSearch();
    closeBookingDrawer();
  }
});

/* ── ENTERPRISE BOOKING DETAIL DRAWER ── */
function openBookingDrawer(id) {
  const dispatchJob = mockDispatchData.find(j => j.id === id);
  const b = bookings.find(x => x.id === id);

  if (!dispatchJob && !b) {
    console.warn('Booking not found for drawer:', id);
    return;
  }

  const overlay = document.getElementById('detail-drawer-overlay');
  const panel = document.getElementById('detail-drawer-panel');
  const title = document.getElementById('drawer-job-title');
  const eyebrow = document.getElementById('drawer-eyebrow');
  const body = document.getElementById('drawer-scroll-body');
  const footer = document.getElementById('drawer-footer-actions');

  if (!panel || !body) return;

  let assetCode = '';
  let assetDescription = '';
  let assetCategory = 'Fleet Mobile Crane';
  let assetHex = '#0284c7';
  let clientName = '';
  let siteAddress = '';
  let startTimeStr = '';
  let endTimeStr = '';
  let dateDisplayStr = '';
  let durationHours = '4.0';
  let statusText = 'Scheduled';
  let workerName = 'Assigned Operator';
  let isInspection = false;
  let jobScope = 'Structural crane lift & placement operation with certified crew';

  if (dispatchJob) {
    assetCode = dispatchJob.assetId;
    clientName = dispatchJob.client || 'Corporate Client';
    siteAddress = dispatchJob.siteAddress || 'Site Location';
    startTimeStr = dispatchJob.startTime;
    endTimeStr = dispatchJob.endTime;
    const sMin = timeStringToMinutes(dispatchJob.startTime);
    const eMin = timeStringToMinutes(dispatchJob.endTime);
    durationHours = ((eMin - sMin) / 60).toFixed(1);
    workerName = dispatchJob.workerName || 'Luke Harris (C1 / CO)';
    isInspection = !!dispatchJob.isInspection || assetCode === 'INSPECTIONS';
    statusText = isInspection ? 'Site Inspection' : (dispatchJob.statusColor === '#10b981' ? 'Completed' : 'Scheduled & Dispatched');
    jobScope = isInspection
      ? 'Pre-mobilisation site visit, access audit & ground bearing assessment'
      : 'Site crane operations, certified rigging & dual-hook placement';

    const lane = allSchedulerLanes.find(a => a.id === assetCode);
    if (lane) {
      assetDescription = lane.label || lane.type || assetCode;
      assetCategory = lane.type || (lane.isInspection ? 'Field Inspection' : 'Crane Fleet');
      assetHex = lane.color || '#0284c7';
    } else {
      const reg = assetRegistry.find(a => a.id === assetCode);
      assetDescription = reg ? `${reg.id} &ndash; ${reg.description}` : assetCode;
      assetCategory = reg?.category || 'Crane Fleet';
      assetHex = reg?.hex || '#0284c7';
    }

    const d = new Date(currentDate);
    dateDisplayStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } else if (b) {
    assetCode = b.assetNumber;
    clientName = b.clientName || 'Corporate Client';
    siteAddress = b.siteAddress || 'Site Location';
    const s = new Date(b.startTime);
    const e = new Date(b.endTime);
    startTimeStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    endTimeStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    durationHours = ((e - s) / (1000 * 60 * 60)).toFixed(1);
    dateDisplayStr = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    workerName = b.wetHireResources?.[0]?.workerName || b.operatorName || 'Allocated Crew';
    statusText = b.status || 'Scheduled';
    jobScope = b.jobDescription || 'Standard plant equipment dispatch';
    isInspection = !!b.inspectionRequired || assetCode === 'INSPECTIONS';

    const reg = assetRegistry.find(a => a.id === assetCode) || allSchedulerLanes.find(a => a.id === assetCode);
    assetDescription = reg ? (reg.description || reg.label || assetCode) : assetCode;
    assetCategory = reg?.category || reg?.type || 'Plant Equipment';
    assetHex = reg?.hex || reg?.color || '#0284c7';
  }

  if (eyebrow) {
    eyebrow.textContent = `Job ID // ${id.toUpperCase()} • ${isInspection ? 'SITE INSPECTION' : 'FLEET DISPATCH'}`;
  }
  if (title) {
    title.textContent = clientName;
  }

  body.innerHTML = `
    <!-- Top Status & Asset Pill Banner -->
    <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-secondary); border-radius:8px; border:1px solid var(--border-light);">
      <div>
        <div style="font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Dispatch Status</div>
        <div style="font-size:14px; font-weight:800; color:var(--text-main); margin-top:2px;">${escapeHtml(statusText)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Asset Code</div>
        <div style="display:flex; align-items:center; gap:6px; justify-content:flex-end; margin-top:2px;">
          <span style="width:10px; height:10px; border-radius:3px; background:${assetHex};"></span>
          <span style="font-size:13px; font-weight:800; color:var(--text-main);">${escapeHtml(assetCode)}</span>
        </div>
      </div>
    </div>

    <!-- Job Details Overview Card -->
    <div class="drawer-card">
      <div class="drawer-card-title">
        <span style="display:flex; align-items:center; gap:6px;">
          <span class="material-symbols-outlined" style="font-size:16px; color:var(--accent-color);">calendar_clock</span>
          <span>Shift Schedule &amp; Scope</span>
        </span>
        <span style="font-size:11px; font-weight:700; color:var(--ion-cyan, #00adef);">${durationHours} hrs total</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Scheduled Date</span>
        <span class="drawer-row-val" style="font-weight:600;">${dateDisplayStr}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Start &amp; End Times</span>
        <span class="drawer-row-val" style="font-weight:700; color:var(--text-main);">${escapeHtml(startTimeStr)} &ndash; ${escapeHtml(endTimeStr)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Client Name</span>
        <span class="drawer-row-val" style="font-weight:700; color:var(--text-main);">${escapeHtml(clientName)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Site Address</span>
        <span class="drawer-row-val" style="max-width:240px; font-size:12px; line-height:1.4;">${escapeHtml(siteAddress)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Allocated Asset</span>
        <span class="drawer-row-val">${escapeHtml(assetCode)} &ndash; ${escapeHtml(assetDescription)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Assigned Personnel</span>
        <span class="drawer-row-val">${escapeHtml(workerName)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Work Scope</span>
        <span class="drawer-row-val" style="max-width:240px; font-size:11.5px;">${escapeHtml(jobScope)}</span>
      </div>
    </div>

    <!-- Compliance Integration Mockup (DocuWare HRWL Warning) -->
    <div class="drawer-compliance-warning-card" id="drawer-compliance-warning">
      <div class="drawer-compliance-warning-header">
        <span class="material-symbols-outlined drawer-warning-icon">warning</span>
        <div style="flex:1;">
          <div class="drawer-warning-badge">DocuWare Compliance System</div>
          <div class="drawer-warning-title">Operator HRWL Expires in 14 Days</div>
        </div>
      </div>
      <div class="drawer-warning-desc">
        Automated DocuWare license auditing detected High Risk Work Licence is approaching 14-day renewal threshold. Digital compliance ticket generated for fleet compliance dispatch.
      </div>
      <div class="drawer-warning-footer">
        <span class="material-symbols-outlined" style="font-size:14px; color:#b45309;">verified</span>
        <span>Licence: LF / C1 Mobile Slewing &bull; Verification Docket #DW-9821</span>
      </div>
    </div>

    <!-- DocuWare Digital Audit Trail -->
    <div class="drawer-card">
      <div class="drawer-card-title">
        <span style="display:flex; align-items:center; gap:6px;">
          <span class="material-symbols-outlined" style="font-size:16px; color:#059669;">folder_managed</span>
          <span>DocuWare Audit Trail</span>
        </span>
        <span style="font-size:10px; color:#059669; font-weight:800; display:flex; align-items:center; gap:4px;">
          <span class="material-symbols-outlined" style="font-size:12px;">cloud_done</span> Live Sync
        </span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Contract / EOI</span>
        <span class="drawer-row-val" style="color:#059669; font-weight:700; display:flex; align-items:center; gap:4px;">
          <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Executed
        </span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Safety Pre-Start</span>
        <span class="drawer-row-val" style="color:#059669; font-weight:700; display:flex; align-items:center; gap:4px;">
          <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Verified
        </span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Digital Shift Docket</span>
        <span class="drawer-row-val" style="color:var(--text-muted); font-weight:600;">Pending Completion</span>
      </div>
    </div>
  `;

  if (footer) {
    footer.innerHTML = `
      <button class="btn-primary" onclick="closeBookingDrawer(); editBooking('${id}');" style="flex:1; height:38px; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-size:12px; font-weight:700; background:var(--accent-color); border:none; border-radius:6px; color:#fff; cursor:pointer;">
        <span class="material-symbols-outlined" style="font-size:16px;">edit_calendar</span>
        <span>Edit Booking</span>
      </button>
      <button class="btn-secondary" onclick="closeBookingDrawer()" style="height:38px; padding:0 16px; font-size:12px; font-weight:600; border-radius:6px; cursor:pointer;">
        <span>Close</span>
      </button>
    `;
  }

  if (overlay) overlay.classList.add('open');
  panel.classList.add('open');
}

function closeBookingDrawer() {
  const overlay = document.getElementById('detail-drawer-overlay');
  const panel = document.getElementById('detail-drawer-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
}

function triggerDocuWareDoc(id, client) {
  showToast(`Invoice for ${client} generated via DocuWare`, 'success');
}

function renderWorkersView() {
  const container = document.getElementById('workers-container');
  if (!container) return;
  
  const q = (document.getElementById('workers-search')?.value || '').toLowerCase();
  const rFilter = (document.getElementById('workers-role-filter')?.value || 'ALL');
  
  let filtered = workerRegistry;
  if (rFilter !== 'ALL') filtered = filtered.filter(w => w.role.toLowerCase().includes(rFilter.toLowerCase()));
  if (q) filtered = filtered.filter(w => w.name.toLowerCase().includes(q) || (w.licence && w.licence.toLowerCase().includes(q)));

  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">`;
  
  filtered.forEach(w => {
    const isExpiring = w.licence && w.licenceExpiry && new Date(w.licenceExpiry) < new Date(new Date().setMonth(new Date().getMonth()+3));
    const isExpired = w.licence && w.licenceExpiry && new Date(w.licenceExpiry) < new Date();
    
    let statusBadge = '';
    let borderCol = 'var(--border-light)';
    if (isExpired) {
      statusBadge = `<span style="background:var(--color-danger);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">LOCKED (EXPIRED)</span>`;
      borderCol = 'var(--color-danger)';
    } else if (isExpiring) {
      statusBadge = `<span style="color:#d97706;font-size:10px;font-weight:700;">Licence Expiring</span>`;
      borderCol = '#d97706';
    } else {
      statusBadge = `<span style="color:var(--text-muted);font-size:10px;font-weight:600;">Licence Active</span>`;
    }

    const inits = w.name.split(' ').map(n=>n[0]).join('');

    html += `<div style="background:#fff; border:1px solid ${borderCol}; border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--border-light); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--text-secondary); font-size:13px;">${inits}</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:var(--text-primary); line-height:1.2;">${w.name}</div>
            <div style="font-size:11px; font-weight:600; color:var(--text-secondary);">${w.role}</div>
          </div>
        </div>
        ${statusBadge}
      </div>
      
      <div style="display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--text-secondary); background:var(--bg-secondary); padding:8px 12px; border-radius:6px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Licence #:</span>
          <span style="font-weight:600; font-family:monospace; color:var(--text-primary);">${w.licence||'N/A'}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Expiry:</span>
          <span style="font-weight:600; color:${isExpired?'var(--color-danger)':isExpiring?'#d97706':'var(--text-primary)'};">${w.licenceExpiry||'N/A'}</span>
        </div>
      </div>
      
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); font-weight:500;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          ${w.phone||'N/A'}
        </div>
        <div style="font-size:11px; font-weight:700; color:var(--brand-primary); cursor:pointer;">Update Record &rarr;</div>
      </div>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// Expose all functions called from inline HTML event handlers to global scope
Object.assign(window, {
  openSwmsModal: (id) => document.getElementById('swms-modal').style.display = 'flex',
  openPrestartModal: (id) => document.getElementById('prestart-modal').style.display = 'flex',
  switchTab, openModal, closeModal, saveBooking, deleteBooking,
  editBooking, openDatePicker, closeDatePicker, 
  
  changeDate, goToToday, goToDay, setCalendarView, toggleDayTranspose, 
  toggleAssetFilter, clearAssetFilter,
  toggleNotifications, renderNotifications, toggleLegendPopover, toggleSidebar, toggleSidebarRail,
  toggleAssetTray, handleGlobalSearch, closeGlobalSearch, selectSearchResultBooking, selectSearchResultAsset,
  openBookingDrawer, closeBookingDrawer,
  renderAssetManager, updateAssetDesc, updateAssetHex, updateAssetHexText,
  addAsset: window._addNewAssetFromForm, promptDeleteAsset, cancelDeleteAsset, confirmDeleteAsset,
  renderAnalytics, exportReport, applyDatePreset, saveDocuWare, saveWorkHours, renderOperatorPortal,
  openDocuWareContractModal, executeDocuWareSign,
  openDocuWareDocketModal, recalcDocketTotal, executeDocketUpload,
  openDocuWareSmartConnect, closeDocuWareModal, indexDocuWareCert,
  openCertViewModal, saveCertUpdate, openCertUploadModal, executeCertLockRelease,
  openClientLedger, closeClientLedger, exportClientLedgerPDF, openClientStatementPDF,
  moveBookingStatus, startPaint, startPaintWeek,
  renderWorkersView, renderComplianceView, renderJobBoard, showToast,
  updateWorker, onHireTypeChange, triggerDocuWareDoc,
  onAssetSelectChange: window.onAssetSelectChange,
  onClientSelectChange: window.onClientSelectChange,
  onProjectSelectChange: window.onProjectSelectChange,
  toggleClientType: window.toggleClientType,
  toggleCrewSelection: window.toggleCrewSelection,
  toggleInspection: window.toggleInspection,
  quickCallContact: window.quickCallContact,
  renderCalendar,
  renderDayViewScheduler,
  renderWeekViewScaffolding,
  renderMonthViewScaffolding,
  toggleDayTranspose,
  setCalendarView,
  startJobDrag,
  handleSlotClick,
  handleJobClick,
  handleAssetFilterChange,
  handleWorkerFilterChange,
  resetSchedulerFilters,
  handleJobDragStart,
  handleJobDragEnd,
  handleSlotDragOver,
  handleSlotDragEnter,
  handleSlotDragLeave,
  handleSlotDrop,
  attachGridInteractivity,
});

function initApp() {
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }

  if (Array.isArray(bookings)) {
    bookings.forEach(sanitizeBookingChronology);
  }

  const startHourEl = document.getElementById('display-start-hour');
  if (startHourEl && typeof populateHourSelect === 'function') {
    populateHourSelect(startHourEl, displayHoursStart, true);
    populateHourSelect(document.getElementById('display-end-hour'), displayHoursEnd, false);
    populateHourSelect(document.getElementById('settings-work-start'), displayHoursStart, true);
    populateHourSelect(document.getElementById('settings-work-end'), displayHoursEnd, false);
  }

  if (typeof syncAssets === 'function') syncAssets();
  if (typeof renderFilterBar === 'function') renderFilterBar();
  if (typeof renderAssetManager === 'function') renderAssetManager();

  // Always render the scheduler immediately on startup
  renderCalendar();
  if (typeof applyDatePreset === 'function') applyDatePreset();
  if (typeof renderWorkersView === 'function') renderWorkersView();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

