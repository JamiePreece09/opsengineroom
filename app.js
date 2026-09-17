/**
 * app.js — HireEngine Main Application Module
 * Orchestrates all UI rendering, calendar views, modal workflows, and navigation.
 * Imports core business logic from dedicated modules.
 */
import { clientsRegistry, projectsRegistry, addClient, addProject, assetRegistry, addAsset, removeAssetById, updateAssetById,
 complianceRegistry, updateComplianceRecord,
 workerRegistry, getLicenseStatus, daysUntilExpiry, getWorkerById, addWorker, updateWorkerById, removeWorkerById,
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
    { id: 'W001', name: 'Luke Harris', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2027-03-15', hrwlStatus: 'Active', licenseClass: 'C1 / C6', licenseNumber: 'QLD-HRW-C1-28491', phone: '0412 001 001', email: 'l.harris@hireengine.com.au' },
    { id: 'W002', name: 'John Smith', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2026-10-30', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'QLD-HRW-C6-19234', phone: '0412 001 002', email: 'j.smith@hireengine.com.au' },
    { id: 'W003', name: 'Mark Johnson', role: 'Plant Operator', department: 'Operations', hrwlExpiry: '2027-01-08', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-44120', phone: '0412 001 003', email: 'm.johnson@hireengine.com.au' },
    { id: 'W004', name: 'Dave Wilson', role: 'Plant Operator', department: 'Operations', hrwlExpiry: '2026-10-05', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-33981', phone: '0412 001 004', email: 'd.wilson@hireengine.com.au' },
    { id: 'W005', name: 'Sam Davies', role: 'Plant Operator', department: 'Operations', hrwlExpiry: '2027-04-22', hrwlStatus: 'Active', licenseClass: 'CO', licenseNumber: 'QLD-HRW-CO-11023', phone: '0412 001 005', email: 's.davies@hireengine.com.au' },
    { id: 'W006', name: 'Alex Morgan', role: 'Plant Operator', department: 'Operations', hrwlExpiry: '2026-12-19', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'NSW-HRW-C6-90211', phone: '0412 001 006', email: 'a.morgan@hireengine.com.au' },
    { id: 'W007', name: 'Chris Evans', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2025-08-10', hrwlStatus: 'Expired', licenseClass: 'C1', licenseNumber: 'QLD-HRW-C1-55102', phone: '0412 001 007', email: 'c.evans@hireengine.com.au' },
    { id: 'W008', name: 'Pat Taylor', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2027-02-14', hrwlStatus: 'Active', licenseClass: 'C6', licenseNumber: 'QLD-HRW-C6-88301', phone: '0412 001 008', email: 'p.taylor@hireengine.com.au' },
    { id: 'W009', name: 'Ben Walker', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2026-11-25', hrwlStatus: 'Active', licenseClass: 'CO', licenseNumber: 'QLD-HRW-CO-41908', phone: '0412 001 009', email: 'b.walker@hireengine.com.au' },
    { id: 'W010', name: 'Tom Clarke', role: 'Crane Operator', department: 'Operations', hrwlExpiry: '2027-05-30', hrwlStatus: 'Active', licenseClass: 'C2', licenseNumber: 'QLD-HRW-C2-77123', phone: '0412 001 010', email: 't.clarke@hireengine.com.au' },
    { id: 'W011', name: 'Sean O\'Connor', role: 'Dogman', department: 'Operations', hrwlExpiry: '2026-06-15', hrwlStatus: 'Expired', licenseClass: 'DG', licenseNumber: 'QLD-HRW-DG-33201', phone: '0412 001 011', email: 's.oconnor@hireengine.com.au' },
    { id: 'W012', name: 'Brad Nguyen', role: 'Dogman', department: 'Operations', hrwlExpiry: '2027-01-20', hrwlStatus: 'Active', licenseClass: 'DG', licenseNumber: 'QLD-HRW-DG-66409', phone: '0412 001 012', email: 'b.nguyen@hireengine.com.au' },
    { id: 'W013', name: 'Gary White', role: 'Rigger', department: 'Operations', hrwlExpiry: '2026-12-05', hrwlStatus: 'Active', licenseClass: 'RB', licenseNumber: 'QLD-HRW-RB-11984', phone: '0412 001 013', email: 'g.white@hireengine.com.au' },
    { id: 'W014', name: 'Liam Hughes', role: 'Rigger', department: 'Operations', hrwlExpiry: '2027-03-01', hrwlStatus: 'Active', licenseClass: 'RI', licenseNumber: 'NSW-HRW-RI-55410', phone: '0412 001 014', email: 'l.hughes@hireengine.com.au' },
    { id: 'W015', name: 'Dan Kelly', role: 'Rigger', department: 'Operations', hrwlExpiry: '2025-11-12', hrwlStatus: 'Expired', licenseClass: 'RA', licenseNumber: 'QLD-HRW-RA-99042', phone: '0412 001 015', email: 'd.kelly@hireengine.com.au' },
    // Administration, Office & Sales Roles
    { id: 'W016', name: 'Sarah Jenkins', role: 'Fleet & Operations Administrator', department: 'Administration', hrwlExpiry: '', hrwlStatus: 'Exempt', licenseClass: 'N/A (Office)', licenseNumber: 'OPS-ADMIN-01', phone: '0412 110 091', email: 's.jenkins@ionhire.com.au' },
    { id: 'W017', name: 'Michael Chang', role: 'Sales & Estimating Manager', department: 'Sales', hrwlExpiry: '', hrwlStatus: 'Exempt', licenseClass: 'N/A (Sales)', licenseNumber: 'SALES-MGR-01', phone: '0413 552 819', email: 'm.chang@ionhire.com.au' },
    { id: 'W018', name: 'Jessica Miller', role: 'Technical Estimator / Hire Desk', department: 'Sales', hrwlExpiry: '', hrwlStatus: 'Exempt', licenseClass: 'N/A (Sales)', licenseNumber: 'SALES-EST-02', phone: '0415 889 204', email: 'j.miller@ionhire.com.au' },
    { id: 'W019', name: 'David Thornton', role: 'General Manager / Office Admin', department: 'Office', hrwlExpiry: '', hrwlStatus: 'Exempt', licenseClass: 'N/A (Office)', licenseNumber: 'MGMT-01', phone: '0418 332 901', email: 'd.thornton@ionhire.com.au' },
    { id: 'W020', name: 'Rachel Vance', role: 'Safety & Compliance Officer', department: 'Safety', hrwlExpiry: '2027-12-31', hrwlStatus: 'Active', licenseClass: 'Cert IV WHS', licenseNumber: 'HSE-AUD-4491', phone: '0416 771 430', email: 'r.vance@ionhire.com.au' },
    { id: 'W021', name: 'Amanda Ross', role: 'Accounts & Billing Specialist', department: 'Office', hrwlExpiry: '', hrwlStatus: 'Exempt', licenseClass: 'N/A (Finance)', licenseNumber: 'FIN-ACC-03', phone: '0417 443 652', email: 'a.ross@ionhire.com.au' }
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
    edmsEndpoint: 'https://api.edms-provider.com/v1/documents',
    edmsOrgId: 'ORG-VAULT-8802',
    edmsStatus: 'Connected',
    erpWebhook: 'https://api.erp-system.com/webhooks/v1/ledger-sync',
    erpStatus: 'Active',
    erpTenant: 'ION Operations Pty Ltd',
    localisation: 'Australia/Brisbane (AEST, UTC+10)',
    get docuwareEndpoint() { return this.edmsEndpoint; },
    get docuwareOrgId() { return this.edmsOrgId; },
    get docuwareStatus() { return this.edmsStatus; },
    get xeroWebhook() { return this.erpWebhook; },
    get xeroStatus() { return this.erpStatus; },
    get xeroTenant() { return this.erpTenant; }
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
  else if (tab === 'administration' || tab === 'operator') {
    if (typeof renderAdminModule === 'function') {
      renderAdminModule(); 
    } else if (typeof renderOperatorPortal === 'function') {
      renderOperatorPortal();
      if(typeof renderWorkersView === 'function') renderWorkersView();
    }
  }
  else if (tab === 'settings' || tab === 'system-settings') { if(typeof renderSystemSettingsView === 'function') renderSystemSettingsView(); }
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
          <h2 class="day-scheduler-title">Weekly Fleet Schedule</h2>
          <div class="day-scheduler-subtitle">Manage multi-day asset bookings and availability</div>
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
          <h2 class="day-scheduler-title">Monthly Fleet Schedule</h2>
          <div class="day-scheduler-subtitle">Review long-term fleet allocations and maintenance windows</div>
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
          <h2 class="day-scheduler-title">Daily Dispatch</h2>
          <div class="day-scheduler-subtitle">Manage day allocations and 24-hour equipment availability</div>
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
                 style="left: ${leftPx}px; width: ${widthPx}px; --asset-color: ${job.statusColor || '#3CB4E5'}; ${!job.isInspection ? `background: ${job.statusColor};` : ''}"
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
                 style="top: ${topPx}px; height: ${heightPx}px; --asset-color: ${job.statusColor || '#3CB4E5'}; ${!job.isInspection ? `background: ${job.statusColor};` : ''}"
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

/* ── PHASE 3: CENTRAL OPERATIONAL PIPELINE (LIFECYCLE LANES & HIGH-DENSITY ENTERPRISE CARDS) ── */

const OPERATIONAL_PIPELINE_LANES = [
  {
    id: 'EOI / Pending',
    title: 'EOI / Pending',
    subtitle: 'Awaiting client confirmation or site checks',
    materialIcon: 'hourglass_top',
    stageIcon: 'pending_actions',
    color: '#F59E0B'
  },
  {
    id: 'Scheduled / Dispatched',
    title: 'Scheduled / Dispatched',
    subtitle: 'Visible to field operators',
    materialIcon: 'local_shipping',
    stageIcon: 'local_shipping',
    color: '#00ADEF'
  },
  {
    id: 'Active On-Site',
    title: 'Active On-Site',
    subtitle: 'Operator actively logging hours/SWMS',
    materialIcon: 'engineering',
    stageIcon: 'engineering',
    color: '#8B5CF6'
  },
  {
    id: 'Pending Docket',
    title: 'Pending Docket',
    subtitle: 'Awaiting supervisor signature or internal review',
    materialIcon: 'description',
    stageIcon: 'description',
    color: '#F97316'
  },
  {
    id: 'Ready for Invoicing',
    title: 'Ready for Invoicing',
    subtitle: 'Docket signed, ready for ERP/Accounting sync',
    materialIcon: 'check_circle',
    stageIcon: 'check_circle',
    color: '#10B981'
  }
];

function normalizePipelineStage(status) {
  if (!status) return 'Scheduled / Dispatched';
  const s = String(status).trim();
  if (s === 'EOI / Pending') return 'EOI / Pending';
  if (s === 'Scheduled / Dispatched') return 'Scheduled / Dispatched';
  if (s === 'Active On-Site') return 'Active On-Site';
  if (s === 'Pending Docket') return 'Pending Docket';
  if (s === 'Ready for Invoicing') return 'Ready for Invoicing';

  const lower = s.toLowerCase();
  if (lower.includes('eoi') || lower === 'pending' || lower.includes('urgent') || lower.includes('quote') || lower.includes('enquiry')) {
    return 'EOI / Pending';
  }
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('active') || lower.includes('in progress')) {
    return 'Active On-Site';
  }
  if (lower.includes('docket') || lower.includes('verification') || lower.includes('review') || lower.includes('supervisor')) {
    return 'Pending Docket';
  }
  if (lower.includes('invoice') || lower.includes('invoiced') || lower.includes('complete') || lower.includes('ready') || lower.includes('billing')) {
    return 'Ready for Invoicing';
  }
  if (lower.includes('schedule') || lower.includes('dispatch') || lower.includes('booked')) {
    return 'Scheduled / Dispatched';
  }
  return 'Scheduled / Dispatched';
}

function getPipelineAssetColor(assetNumber) {
  if (!assetNumber) return '#00ADEF';
  if (typeof ASSET_HEX !== 'undefined' && ASSET_HEX[assetNumber]) {
    return ASSET_HEX[assetNumber];
  }
  if (typeof assetRegistry !== 'undefined' && Array.isArray(assetRegistry)) {
    const found = assetRegistry.find(a => a.id === assetNumber);
    if (found && found.hex) return found.hex;
  }
  if (typeof window !== 'undefined' && window.ionConfig && Array.isArray(window.ionConfig.fleetRegistry)) {
    const found = window.ionConfig.fleetRegistry.find(a => a.id === assetNumber);
    if (found && found.hex) return found.hex;
  }
  return '#00ADEF';
}

function formatJobDateTime(startTime, endTime) {
  if (!startTime) return 'Time TBD';
  const s = new Date(startTime);
  if (isNaN(s.getTime())) return 'Time TBD';
  
  const day = s.getDate();
  const month = s.toLocaleDateString('en-AU', { month: 'short' });
  const startHours = String(s.getHours()).padStart(2, '0');
  const startMins = String(s.getMinutes()).padStart(2, '0');
  
  if (endTime) {
    const e = new Date(endTime);
    if (!isNaN(e.getTime())) {
      const endHours = String(e.getHours()).padStart(2, '0');
      const endMins = String(e.getMinutes()).padStart(2, '0');
      return `${day} ${month} • ${startHours}:${startMins}-${endHours}:${endMins}`;
    }
  }
  return `${day} ${month} • ${startHours}:${startMins}`;
}

// Auto-Scroll on Drag Engine for Job Board
let jbAutoScrollRaf = null;
let jbAutoScrollVelocity = 0;

function stepJbAutoScroll() {
  const container = document.getElementById('job-board-container');
  if (!container || jbAutoScrollVelocity === 0) {
    if (jbAutoScrollRaf) cancelAnimationFrame(jbAutoScrollRaf);
    jbAutoScrollRaf = null;
    return;
  }
  container.scrollLeft += jbAutoScrollVelocity;
  jbAutoScrollRaf = requestAnimationFrame(stepJbAutoScroll);
}

function handleJbContainerEdgeScroll(clientX) {
  const container = document.getElementById('job-board-container');
  if (!container || clientX == null || clientX <= 0) return;
  const rect = container.getBoundingClientRect();
  const edgeThreshold = 130; // pixels from board container boundary
  const maxVelocity = 24; // max scroll pixels per animation frame

  if (clientX >= rect.left && clientX <= rect.left + edgeThreshold) {
    // Near left edge -> scroll towards the left
    const intensity = (rect.left + edgeThreshold - clientX) / edgeThreshold;
    jbAutoScrollVelocity = -Math.max(5, Math.round(maxVelocity * intensity));
    if (!jbAutoScrollRaf) {
      jbAutoScrollRaf = requestAnimationFrame(stepJbAutoScroll);
    }
  } else if (clientX <= rect.right && clientX >= rect.right - edgeThreshold) {
    // Near right edge -> scroll towards the right
    const intensity = (clientX - (rect.right - edgeThreshold)) / edgeThreshold;
    jbAutoScrollVelocity = Math.max(5, Math.round(maxVelocity * intensity));
    if (!jbAutoScrollRaf) {
      jbAutoScrollRaf = requestAnimationFrame(stepJbAutoScroll);
    }
  } else {
    jbAutoScrollVelocity = 0;
    if (jbAutoScrollRaf) {
      cancelAnimationFrame(jbAutoScrollRaf);
      jbAutoScrollRaf = null;
    }
  }
}

function stopJbAutoScroll() {
  jbAutoScrollVelocity = 0;
  if (jbAutoScrollRaf) {
    cancelAnimationFrame(jbAutoScrollRaf);
    jbAutoScrollRaf = null;
  }
}

// Global Drag and Drop Handlers
window.__draggedJobBookingId = null;
window.__isDraggingJobCard = false;

window.handleJobCardDragStart = function(event, bookingId) {
  window.__draggedJobBookingId = bookingId;
  window.__isDraggingJobCard = true;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', bookingId);
    event.dataTransfer.effectAllowed = 'move';
  }
  const card = document.getElementById('jb-card-' + bookingId);
  if (card) {
    card.classList.add('jb-card-dragging');
  }
};

window.handleJobCardDragEnd = function(event) {
  window.__draggedJobBookingId = null;
  window.__isDraggingJobCard = false;
  stopJbAutoScroll();
  document.querySelectorAll('.jb-card-dragging').forEach(el => el.classList.remove('jb-card-dragging'));
  document.querySelectorAll('.jb-lane.jb-lane-drag-over').forEach(el => el.classList.remove('jb-lane-drag-over'));
};

window.handleJobLaneDragOver = function(event, laneId) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  if (event.clientX) {
    handleJbContainerEdgeScroll(event.clientX);
  }
  const laneDomId = 'jb-lane-' + laneId.replace(/[^a-zA-Z0-9]/g, '-');
  const laneEl = document.getElementById(laneDomId);
  if (laneEl && !laneEl.classList.contains('jb-lane-drag-over')) {
    laneEl.classList.add('jb-lane-drag-over');
  }
};

window.handleJobLaneDragEnter = function(event, laneId) {
  event.preventDefault();
  const laneDomId = 'jb-lane-' + laneId.replace(/[^a-zA-Z0-9]/g, '-');
  const laneEl = document.getElementById(laneDomId);
  if (laneEl) {
    laneEl.classList.add('jb-lane-drag-over');
  }
};

window.handleJobLaneDragLeave = function(event, laneId) {
  const laneDomId = 'jb-lane-' + laneId.replace(/[^a-zA-Z0-9]/g, '-');
  const laneEl = document.getElementById(laneDomId);
  if (laneEl && event.relatedTarget && !laneEl.contains(event.relatedTarget)) {
    laneEl.classList.remove('jb-lane-drag-over');
  }
};

window.handleJobLaneDrop = function(event, targetLaneId) {
  event.preventDefault();
  stopJbAutoScroll();
  window.__isDraggingJobCard = false;
  document.querySelectorAll('.jb-lane.jb-lane-drag-over').forEach(el => el.classList.remove('jb-lane-drag-over'));
  document.querySelectorAll('.jb-card-dragging').forEach(el => el.classList.remove('jb-card-dragging'));
  
  const id = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || window.__draggedJobBookingId;
  window.__draggedJobBookingId = null;
  if (!id) return;

  moveBookingStatus(id, targetLaneId);
};

window.handleJobBoardContainerDragOver = function(event) {
  if (window.__isDraggingJobCard && event.clientX) {
    handleJbContainerEdgeScroll(event.clientX);
  }
};

// Expandable Card Drawer state & handlers
window.__expandedJobCards = window.__expandedJobCards || {};

window.toggleJobCardExpand = function(bookingId) {
  const isCurrentlyOpen = !!window.__expandedJobCards[bookingId];
  window.__expandedJobCards[bookingId] = !isCurrentlyOpen;

  const drawer = document.getElementById('jb-card-drawer-' + bookingId);
  const btn = document.getElementById('jb-expand-btn-' + bookingId);

  if (drawer) {
    if (!isCurrentlyOpen) {
      drawer.classList.add('is-open');
    } else {
      drawer.classList.remove('is-open');
    }
  }
  if (btn) {
    if (!isCurrentlyOpen) {
      btn.classList.add('is-expanded');
      btn.title = 'Collapse details';
    } else {
      btn.classList.remove('is-expanded');
      btn.title = 'Expand site and scope details';
    }
  }
};

// Priority Star toggle handler
window.toggleJobPriority = function(bookingId) {
  const b = (Array.isArray(bookings) ? bookings.find(x => x && x.id === bookingId) : null);
  const isPriority = b ? (b.isHighPriority = !b.isHighPriority) : false;

  const card = document.getElementById('jb-card-' + bookingId);
  const starBtn = document.getElementById('jb-priority-btn-' + bookingId);

  if (card) {
    card.classList.toggle('is-high-priority', isPriority);
  }
  if (starBtn) {
    starBtn.classList.toggle('is-active', isPriority);
    starBtn.title = isPriority ? 'High Priority (Click to remove)' : 'Mark as High Priority';
  }

  // If currently sorting by priority, reorder dynamically
  const sortSelect = document.getElementById('jb-sort-by');
  if (sortSelect && sortSelect.value === 'priority-first') {
    window.sortJobBoardCards();
  }

  if (typeof showToast === 'function') {
    showToast(isPriority ? `Job ${bookingId.toUpperCase()} marked as High Priority` : `High Priority removed from ${bookingId.toUpperCase()}`);
  }
};

// Status Badge toggle handler ('On-Schedule' vs 'Delayed')
window.toggleJobStatusBadge = function(bookingId) {
  const b = (Array.isArray(bookings) ? bookings.find(x => x && x.id === bookingId) : null);
  if (!b) return;

  b.isDelayed = !b.isDelayed;
  b.statusBadge = b.isDelayed ? 'Delayed' : 'On-Schedule';

  const pill = document.getElementById('jb-status-pill-' + bookingId);
  if (pill) {
    pill.textContent = b.statusBadge;
    if (b.isDelayed) {
      pill.classList.remove('jb-status-on-schedule');
      pill.classList.add('jb-status-delayed');
      pill.title = 'Status: Delayed • Click to toggle';
    } else {
      pill.classList.remove('jb-status-delayed');
      pill.classList.add('jb-status-on-schedule');
      pill.title = 'Status: On-Schedule • Click to toggle';
    }
  }

  if (typeof showToast === 'function') {
    showToast(`Job ${bookingId.toUpperCase()} status: ${b.statusBadge}`);
  }
};

// Physical DOM Reordering Function for Job Board Cards
window.sortJobBoardCards = function(customSortOption) {
  const sortSelect = document.getElementById('jb-sort-by');
  const sortBy = customSortOption || (sortSelect ? sortSelect.value : 'date-asc');

  const laneContainers = document.querySelectorAll('.jb-lane-cards');
  laneContainers.forEach(container => {
    const cards = Array.from(container.querySelectorAll('.jb-card'));
    if (cards.length <= 1) return;

    cards.sort((a, b) => {
      const timeA = Number(a.getAttribute('data-start-time')) || 0;
      const timeB = Number(b.getAttribute('data-start-time')) || 0;
      const prioA = a.classList.contains('is-high-priority') ? 1 : 0;
      const prioB = b.classList.contains('is-high-priority') ? 1 : 0;

      if (sortBy === 'priority-first') {
        if (prioA !== prioB) return prioB - prioA;
        return timeA - timeB;
      } else if (sortBy === 'date-desc') {
        return timeB - timeA;
      } else {
        // 'date-asc'
        return timeA - timeB;
      }
    });

    // Physically reorder DOM elements inside the lane container
    cards.forEach(card => container.appendChild(card));
  });
};

function renderJobBoard() {
  const container = document.getElementById('job-board-container');
  if (!container) return;

  const searchQuery = (document.getElementById('jb-search')?.value || '').toLowerCase().trim();
  const stageFilter = document.getElementById('jb-stage-filter')?.value || 'ALL';

  let filteredBookings = Array.isArray(bookings) ? bookings.filter(Boolean) : [];
  if (searchQuery) {
    filteredBookings = filteredBookings.filter(b => {
      if (!b) return false;
      const bId = String(b.id || '').toLowerCase();
      const client = String(b.clientName || '').toLowerCase();
      const asset = String(b.assetNumber || '').toLowerCase();
      const op = String(b.operatorName || '').toLowerCase();
      const desc = String(b.jobDescription || '').toLowerCase();
      const addr = String(b.siteAddress || '').toLowerCase();
      return bId.includes(searchQuery) ||
             client.includes(searchQuery) ||
             asset.includes(searchQuery) ||
             op.includes(searchQuery) ||
             desc.includes(searchQuery) ||
             addr.includes(searchQuery);
    });
  }

  let html = `<div class="jb-board">`;

  OPERATIONAL_PIPELINE_LANES.forEach(lane => {
    if (stageFilter !== 'ALL' && stageFilter !== lane.id) return;

    // Filter bookings belonging to this lane
    const laneBookings = filteredBookings.filter(b => b && normalizePipelineStage(b.status) === lane.id);
    const laneDomId = 'jb-lane-' + lane.id.replace(/[^a-zA-Z0-9]/g, '-');

    html += `
      <div id="${laneDomId}" class="jb-lane" data-lane-id="${escapeHtml(lane.id)}"
           ondragover="window.handleJobLaneDragOver(event, '${escapeHtml(lane.id)}')"
           ondragenter="window.handleJobLaneDragEnter(event, '${escapeHtml(lane.id)}')"
           ondragleave="window.handleJobLaneDragLeave(event, '${escapeHtml(lane.id)}')"
           ondrop="window.handleJobLaneDrop(event, '${escapeHtml(lane.id)}')">
        
        <!-- Lane Header -->
        <div class="jb-lane-header" style="border-top:3px solid ${lane.color};">
          <div class="jb-lane-header-top">
            <div class="jb-lane-title">
              <span class="material-symbols-outlined" style="color:${lane.color};">${lane.materialIcon}</span>
              <span>${escapeHtml(lane.title)}</span>
            </div>
            <span class="jb-lane-count">${laneBookings.length}</span>
          </div>
          <div class="jb-lane-subtitle">${escapeHtml(lane.subtitle)}</div>
        </div>

        <!-- Lane Cards Container -->
        <div class="jb-lane-cards" id="${laneDomId}-cards">
    `;

    if (laneBookings.length === 0) {
      html += `
        <div class="jb-empty-lane">
          <span class="material-symbols-outlined">${lane.stageIcon}</span>
          <span>No active jobs in lane</span>
        </div>
      `;
    } else {
      laneBookings.forEach(b => {
        const assetColor = getPipelineAssetColor(b.assetNumber);
        const dateTimeStr = formatJobDateTime(b.startTime, b.endTime);
        const opName = (b.hireType === 'wet' && b.wetHireResources && b.wetHireResources.length > 0)
          ? b.wetHireResources[0].workerName
          : (b.operatorName || 'Dry Hire / Unassigned');
        const formattedJobId = b.id ? (b.id.startsWith('#') ? b.id.toUpperCase() : '#' + b.id.toUpperCase()) : '#JOB';
        const isPriority = Boolean(b.isHighPriority);
        const isDelayed = Boolean(b.isDelayed || b.statusBadge === 'Delayed');
        const isExpanded = Boolean(window.__expandedJobCards[b.id]);
        const startTimeStamp = b.startTime ? new Date(b.startTime).getTime() : 0;

        // Site contact lookup
        const matchedClient = (typeof clientsRegistry !== 'undefined' && Array.isArray(clientsRegistry))
          ? clientsRegistry.find(c => c && c.name && c.name.toLowerCase() === (b.clientName || '').toLowerCase())
          : null;
        const contactPhone = b.clientPhone || matchedClient?.phone || '0412 889 900';
        const siteLocation = b.siteAddress || 'Perth Metro Site';
        const scopeNotes = b.jobDescription || 'Standard operational deployment as per client specifications.';

        html += `
          <div id="jb-card-${escapeHtml(b.id)}"
               class="jb-card ${isPriority ? 'is-high-priority' : ''}"
               draggable="true"
               data-booking-id="${escapeHtml(b.id)}"
               data-start-time="${startTimeStamp}"
               ondragstart="window.handleJobCardDragStart(event, '${escapeHtml(b.id)}')"
               ondragend="window.handleJobCardDragEnd(event)"
               onclick="editBooking('${escapeHtml(b.id)}')"
               title="Click to view/edit booking • Drag to change operational stage"
               style="border-left: 4px solid ${assetColor}; --asset-color: ${assetColor};">
            
            <!-- Top Row: Job ID (bold), Priority Star, and Status Pill Badge -->
            <div class="jb-card-top-row">
              <span class="jb-card-id">${escapeHtml(formattedJobId)}</span>
              <div class="jb-card-top-actions" onclick="event.stopPropagation()">
                <button id="jb-priority-btn-${escapeHtml(b.id)}"
                        type="button"
                        class="jb-priority-btn ${isPriority ? 'is-active' : ''}"
                        onclick="window.toggleJobPriority('${escapeHtml(b.id)}')"
                        title="${isPriority ? 'High Priority (Click to remove)' : 'Mark as High Priority'}">
                  <span class="material-symbols-outlined">star</span>
                </button>
                <span id="jb-status-pill-${escapeHtml(b.id)}"
                      class="jb-status-pill ${isDelayed ? 'jb-status-delayed' : 'jb-status-on-schedule'}"
                      onclick="window.toggleJobStatusBadge('${escapeHtml(b.id)}')"
                      title="Status: ${isDelayed ? 'Delayed' : 'On-Schedule'} • Click to toggle">
                  ${isDelayed ? 'Delayed' : 'On-Schedule'}
                </span>
              </div>
            </div>

            <!-- Middle Row: Client Name (prominent) and Asset Code Tag -->
            <div class="jb-card-middle-row">
              <span class="jb-card-client" title="${escapeHtml(b.clientName || 'Unassigned')}">${escapeHtml(b.clientName || 'Unassigned Client')}</span>
              <span class="jb-card-asset-tag">${escapeHtml(b.assetNumber || 'TBD')}</span>
            </div>

            <!-- Bottom Row: Assigned Operator Name, Date/Time, and Expand Chevron -->
            <div class="jb-card-bottom-row">
              <span class="jb-card-operator" title="Operator: ${escapeHtml(opName)}">
                <span class="material-symbols-outlined">person</span>
                ${escapeHtml(opName)}
              </span>
              <div class="jb-card-bottom-meta" onclick="event.stopPropagation()">
                <span class="jb-card-datetime" title="Scheduled Window">
                  <span class="material-symbols-outlined">schedule</span>
                  ${escapeHtml(dateTimeStr)}
                </span>
                <button id="jb-expand-btn-${escapeHtml(b.id)}"
                        type="button"
                        class="jb-expand-btn ${isExpanded ? 'is-expanded' : ''}"
                        onclick="window.toggleJobCardExpand('${escapeHtml(b.id)}')"
                        title="${isExpanded ? 'Collapse details' : 'Expand site and scope details'}">
                  <span class="material-symbols-outlined">expand_more</span>
                </button>
              </div>
            </div>

            <!-- Expandable Details Drawer (Collapsible) -->
            <div class="jb-card-details-drawer ${isExpanded ? 'is-open' : ''}"
                 id="jb-card-drawer-${escapeHtml(b.id)}"
                 onclick="event.stopPropagation()">
              <div class="jb-detail-row">
                <span class="jb-detail-label">
                  <span class="material-symbols-outlined">call</span> Contact
                </span>
                <span class="jb-detail-val">
                  <a href="tel:${escapeHtml(contactPhone)}" class="jb-phone-link" onclick="event.stopPropagation()">${escapeHtml(contactPhone)}</a>
                </span>
              </div>
              <div class="jb-detail-row">
                <span class="jb-detail-label">
                  <span class="material-symbols-outlined">location_on</span> Site
                </span>
                <span class="jb-detail-val" title="${escapeHtml(siteLocation)}">${escapeHtml(siteLocation)}</span>
              </div>
              <div class="jb-detail-row jb-scope-row">
                <span class="jb-detail-label">
                  <span class="material-symbols-outlined">assignment</span> Scope
                </span>
                <span class="jb-detail-val">${escapeHtml(scopeNotes)}</span>
              </div>
            </div>

          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Apply active sort order directly to the DOM cards
  window.sortJobBoardCards();
}

function moveBookingStatus(id, targetStageOrDir) {
  let b = bookings.find(x => x && x.id === id);
  if (!b) {
    const dj = (typeof mockDispatchData !== 'undefined' && Array.isArray(mockDispatchData))
      ? mockDispatchData.find(j => j.id === id)
      : null;
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
        status: dj.isInspection ? 'Ready for Invoicing' : 'Scheduled / Dispatched',
        hireType: 'wet',
        operatorName: dj.operatorName || 'Field Operator',
        jobDescription: dj.jobDescription || 'Operational Assignment'
      };
      bookings.push(b);
    }
  }

  if (!b) return;

  const laneIds = OPERATIONAL_PIPELINE_LANES.map(l => l.id);
  const currentNormalized = normalizePipelineStage(b.status);
  let targetStage = currentNormalized;

  if (targetStageOrDir === 'next' || targetStageOrDir === 'prev') {
    let idx = laneIds.indexOf(currentNormalized);
    if (idx === -1) idx = 1;
    const nextIdx = targetStageOrDir === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= laneIds.length) return;
    targetStage = laneIds[nextIdx];
  } else if (typeof targetStageOrDir === 'string') {
    targetStage = normalizePipelineStage(targetStageOrDir);
  }

  // State update simulation
  b.status = targetStage;

  if (targetStage === 'Ready for Invoicing') {
    b.docketUploaded = true;
    b.docketStatus = 'pushed';
    b.contractSigned = true;
  } else if (targetStage === 'Pending Docket') {
    b.swmsStatus = 'completed';
    b.preStartStatus = 'completed';
    b.contractSigned = true;
  } else if (targetStage === 'Active On-Site') {
    b.swmsStatus = 'completed';
    b.contractSigned = true;
  } else if (targetStage === 'Scheduled / Dispatched') {
    b.contractSigned = true;
  }

  // Instant UI reflection: update card stage icon if card is in DOM
  const cardEl = document.getElementById('jb-card-' + b.id);
  if (cardEl) {
    const laneMeta = OPERATIONAL_PIPELINE_LANES.find(l => l.id === targetStage);
    if (laneMeta) {
      const stageIconEl = cardEl.querySelector('.jb-card-stage-icon');
      if (stageIconEl) {
        stageIconEl.innerHTML = `<span class="material-symbols-outlined" style="color:${laneMeta.color};">${laneMeta.stageIcon}</span>`;
        stageIconEl.title = `Stage: ${laneMeta.title}`;
      }
    }
  }

  // Re-render Job Board and Calendar to maintain complete system coherence
  renderJobBoard();
  if (typeof renderCalendar === 'function') {
    renderCalendar();
  }

  // Provide high-visibility feedback toast
  if (typeof showToast === 'function') {
    const jobIdLabel = b.id ? (b.id.startsWith('#') ? b.id.toUpperCase() : '#' + b.id.toUpperCase()) : 'Job';
    showToast(`${jobIdLabel} (${b.clientName || 'Client'}) moved to "${targetStage}"`);
  }
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
  ['fleet', 'personnel', 'roles', 'scheduling'].forEach(t => {
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
  else if (tabName === 'roles') renderAdminRolesTable();
  else if (tabName === 'scheduling') loadAdminSchedulingRules();
}
window.switchAdminSubTab = switchAdminSubTab;

function renderAdminModule() {
  initAdminModule();
  switchAdminSubTab(currentAdminSubTab || 'fleet');
}
window.renderAdminModule = renderAdminModule;

function filterAdminFleetTable(query) {
  const q = (query !== undefined ? query : (document.getElementById('admin-fleet-search')?.value || '')).toLowerCase().trim();
  const tbody = document.getElementById('admin-fleet-table-body');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  let matchCount = 0;

  rows.forEach(row => {
    if (row.cells.length <= 1) return;
    const assetId = (row.cells[1]?.textContent || '').toLowerCase().trim();
    const description = (row.cells[3]?.textContent || '').toLowerCase().trim();

    const matches = !q || assetId.includes(q) || description.includes(q);
    row.style.display = matches ? '' : 'none';
    if (matches) matchCount++;
  });

  const countBadge = document.getElementById('admin-fleet-count');
  if (countBadge) {
    countBadge.textContent = `${matchCount} Registered`;
  }
}
window.filterAdminFleetTable = filterAdminFleetTable;

/* ── Administration Table Sorting & Utilities ────────────────────────── */
window.adminFleetSort = window.adminFleetSort || { column: 'id', direction: 'asc' };
window.adminPersonnelSort = window.adminPersonnelSort || { column: 'name', direction: 'asc' };

function compareAdminTableValues(a, b, direction = 'asc') {
  let res = 0;
  if (a == null && b == null) res = 0;
  else if (a == null || a === '' || a === '—' || a === 'N/A') res = 1;
  else if (b == null || b === '' || b === '—' || b === 'N/A') res = -1;
  else if (typeof a === 'number' && typeof b === 'number') {
    res = a - b;
  } else {
    const isDateA = /^\d{4}-\d{2}-\d{2}$/.test(String(a).trim());
    const isDateB = /^\d{4}-\d{2}-\d{2}$/.test(String(b).trim());
    if (isDateA && isDateB) {
      res = new Date(a).getTime() - new Date(b).getTime();
    } else {
      res = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }
  }
  return direction === 'desc' ? -res : res;
}

function updateFleetTableSortHeaders() {
  const cols = ['color', 'id', 'class', 'description', 'workerName', 'status'];
  const curCol = window.adminFleetSort?.column || 'id';
  const curDir = window.adminFleetSort?.direction || 'asc';

  cols.forEach(col => {
    const th = document.getElementById(`sort-th-fleet-${col}`);
    const icon = document.getElementById(`sort-icon-fleet-${col}`);
    if (!th) return;

    th.classList.remove('sort-asc', 'sort-desc');
    if (col === curCol) {
      th.classList.add(curDir === 'asc' ? 'sort-asc' : 'sort-desc');
      if (icon) icon.textContent = curDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
      th.setAttribute('title', `Sort by ${col} (Currently ${curDir === 'asc' ? 'Ascending' : 'Descending'} — click to reverse)`);
    } else {
      if (icon) icon.textContent = 'unfold_more';
      th.setAttribute('title', `Click to sort by ${col}`);
    }
  });
}

function sortAdminFleetTable(column) {
  if (!window.adminFleetSort) {
    window.adminFleetSort = { column: 'id', direction: 'asc' };
  }
  if (window.adminFleetSort.column === column) {
    window.adminFleetSort.direction = window.adminFleetSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    window.adminFleetSort.column = column;
    window.adminFleetSort.direction = 'asc';
  }
  renderAdminFleetTable();
}
window.sortAdminFleetTable = sortAdminFleetTable;

function updatePersonnelTableSortHeaders() {
  const cols = ['name', 'role', 'contact', 'licenseClass', 'licenseNumber', 'hrwlExpiry', 'status'];
  const curCol = window.adminPersonnelSort?.column || 'name';
  const curDir = window.adminPersonnelSort?.direction || 'asc';

  cols.forEach(col => {
    const th = document.getElementById(`sort-th-personnel-${col}`);
    const icon = document.getElementById(`sort-icon-personnel-${col}`);
    if (!th) return;

    th.classList.remove('sort-asc', 'sort-desc');
    if (col === curCol) {
      th.classList.add(curDir === 'asc' ? 'sort-asc' : 'sort-desc');
      if (icon) icon.textContent = curDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
      th.setAttribute('title', `Sort by ${col} (Currently ${curDir === 'asc' ? 'Ascending' : 'Descending'} — click to reverse)`);
    } else {
      if (icon) icon.textContent = 'unfold_more';
      th.setAttribute('title', `Click to sort by ${col}`);
    }
  });
}

function sortAdminPersonnelTable(column) {
  if (!window.adminPersonnelSort) {
    window.adminPersonnelSort = { column: 'name', direction: 'asc' };
  }
  if (window.adminPersonnelSort.column === column) {
    window.adminPersonnelSort.direction = window.adminPersonnelSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    window.adminPersonnelSort.column = column;
    window.adminPersonnelSort.direction = 'asc';
  }
  renderAdminPersonnelTable();
}
window.sortAdminPersonnelTable = sortAdminPersonnelTable;

/* ── Enterprise Fleet Table & Management ────────────────────────────────── */
function renderAdminFleetTable() {
  const tbody = document.getElementById('admin-fleet-table-body');
  if (!tbody) return;

  const fleet = window.ionConfig?.fleetRegistry || [];
  const searchInput = document.getElementById('admin-fleet-search');
  const classFilter = document.getElementById('admin-fleet-class-filter');
  const statusFilter = document.getElementById('admin-fleet-status-filter');

  const rawQ = (searchInput?.value || '').trim().toLowerCase();
  const cFilter = (classFilter?.value || 'ALL');
  const sFilter = (statusFilter?.value || 'ALL');

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

  // Robust multi-token search
  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];

  let filtered = fleet.filter(a => {
    // 1. Class filter
    if (cFilter !== 'ALL') {
      const matchesClass = (a.class && a.class === cFilter) || (a.category && a.category === cFilter);
      if (!matchesClass) return false;
    }

    // 2. Status filter (Active vs Expired/Maintenance/Overtime/Standby)
    const isMaintenanceOrExpired = (a.workerStatus === 'maintenance' || a.status === 'maintenance' || a.workerStatus === 'expired' || a.status === 'expired' || a.workerStatus === 'standby' || a.status === 'standby' || a.workerStatus === 'overtime' || a.overtimeWarning);
    const isActive = !isMaintenanceOrExpired;

    if (sFilter === 'Active') {
      if (!isActive) return false;
    } else if (sFilter === 'Expired') {
      if (!isMaintenanceOrExpired) return false;
    }

    // 3. Multi-column search across Name, Role/Class, and Status simultaneously
    if (tokens.length > 0) {
      const statusLabel = isActive ? 'active available operational' : 'expired maintenance standby overtime inactive locked';
      const corpus = [
        a.id || '',
        a.label || '',
        a.description || '',
        a.workerName || '',
        a.class || '',
        a.category || '',
        a.type || '',
        statusLabel,
        a.workerStatus || '',
        a.status || '',
        a.color || '',
        a.hex || ''
      ].join(' ').toLowerCase();

      const allTokensMatch = tokens.every(tok => corpus.includes(tok));
      if (!allTokensMatch) return false;
    }

    return true;
  });

  const countBadge = document.getElementById('admin-fleet-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${fleet.length} Assets`;
  }

  // Sort filtered fleet list
  const sortCol = window.adminFleetSort?.column || 'id';
  const sortDir = window.adminFleetSort?.direction || 'asc';

  filtered.sort((itemA, itemB) => {
    let valA, valB;
    switch (sortCol) {
      case 'color':
        valA = itemA.color || itemA.hex || '';
        valB = itemB.color || itemB.hex || '';
        break;
      case 'id':
        valA = itemA.id || '';
        valB = itemB.id || '';
        break;
      case 'class':
        valA = itemA.class || itemA.category || '';
        valB = itemB.class || itemB.category || '';
        break;
      case 'description':
        valA = itemA.description || itemA.label || '';
        valB = itemB.description || itemB.label || '';
        break;
      case 'workerName':
        valA = itemA.workerName || 'Unassigned (Pool)';
        valB = itemB.workerName || 'Unassigned (Pool)';
        break;
      case 'status':
        valA = itemA.workerStatus || itemA.status || 'available';
        valB = itemB.workerStatus || itemB.status || 'available';
        break;
      default:
        valA = itemA.id || '';
        valB = itemB.id || '';
    }
    return compareAdminTableValues(valA, valB, sortDir);
  });

  updateFleetTableSortHeaders();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px 16px;color:var(--text-muted);font-style:italic;">
          No fleet assets found matching the search and status criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const color = a.color || a.hex || '#0284c7';
    const desc = a.description || a.label || 'Standard Fleet Asset';
    const cls = a.class || a.category || 'General Plant';
    const operator = a.workerName || 'Unassigned (Pool)';
    
    let statusBadge = '<span class="admin-badge-active"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Available</span>';
    if (a.workerStatus === 'maintenance' || a.status === 'maintenance') {
      statusBadge = '<span class="admin-badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">build</span> Maintenance</span>';
    } else if (a.workerStatus === 'overtime' || a.overtimeWarning) {
      statusBadge = '<span class="admin-badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">warning</span> Overtime</span>';
    } else if (a.workerStatus === 'standby' || a.status === 'standby') {
      statusBadge = '<span class="admin-badge-exempt"><span class="material-symbols-outlined" style="font-size:14px;">pause_circle</span> Standby</span>';
    }

    return `
      <tr>
        <td style="text-align:center;">
          <span style="display:inline-block;width:22px;height:22px;border-radius:4px;background:${color};border:1px solid rgba(0,0,0,0.2);box-shadow:0 1px 2px rgba(0,0,0,0.1);" title="${color}"></span>
        </td>
        <td style="font-weight:800;color:var(--text-primary);font-family:monospace;font-size:13px;">${escapeHtml(a.id)}</td>
        <td style="font-weight:600;color:var(--text-primary);">${escapeHtml(cls)}</td>
        <td style="color:var(--text-secondary);max-width:280px;">${escapeHtml(desc)}</td>
        <td style="font-size:13px;color:var(--text-primary);">
          <span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;margin-right:4px;color:var(--text-muted);">person</span>${escapeHtml(operator)}
        </td>
        <td>${statusBadge}</td>
        <td style="text-align:right;white-space:nowrap;">
          <div style="display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;">
            <button class="btn-secondary admin-table-action-btn edit-btn" onclick="openEditAssetAdminModal('${escapeHtml(a.id)}')" title="Edit Asset ${escapeHtml(a.id)}">
              <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
              <span>Edit</span>
            </button>
            <button class="btn-secondary admin-table-action-btn delete-btn" onclick="promptDeleteFleetAsset('${escapeHtml(a.id)}')" title="Delete Asset ${escapeHtml(a.id)}">
              <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminFleetTable = renderAdminFleetTable;

/* ── Enterprise Personnel & Roles Table ─────────────────────────────────── */
function renderAdminPersonnelTable() {
  const tbody = document.getElementById('admin-personnel-table-body');
  if (!tbody) return;

  const workers = window.ionConfig?.workerRegistry || [];
  const searchInput = document.getElementById('admin-workers-search');
  const roleFilter = document.getElementById('admin-workers-role-filter');
  const statusFilter = document.getElementById('admin-workers-status-filter');

  const rawQ = (searchInput?.value || '').trim().toLowerCase();
  const rFilter = (roleFilter?.value || 'ALL');
  const sFilter = (statusFilter?.value || 'ALL');

  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];

  let filtered = workers.filter(w => {
    // 1. Role / Department Filter
    if (rFilter !== 'ALL') {
      if (rFilter.startsWith('DEPT:')) {
        const targetDept = rFilter.replace('DEPT:', '').toLowerCase();
        const workerDept = (w.department || 'Operations').toLowerCase();
        if (workerDept !== targetDept) return false;
      } else {
        const matchesRole = (w.role || '').toLowerCase().includes(rFilter.toLowerCase());
        if (!matchesRole) return false;
      }
    }

    // 2. Status Filter
    const isExpired = (w.hrwlStatus === 'Expired') || (w.hrwlExpiry && new Date(w.hrwlExpiry) < new Date());
    const isExempt = (w.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(w.department);
    const isActive = !isExpired;

    if (sFilter === 'Active') {
      if (!isActive) return false;
    } else if (sFilter === 'Expired') {
      if (!isExpired) return false;
    } else if (sFilter === 'Exempt') {
      if (!isExempt) return false;
    }

    // 3. Multi-column search across Name, Role, and Status simultaneously
    if (tokens.length > 0) {
      const statusLabel = isExpired ? 'expired locked' : (isExempt ? 'active exempt office' : 'active valid compliant');
      const corpus = [
        w.id || '',
        w.name || '',
        w.role || '',
        w.department || '',
        statusLabel,
        w.licenseClass || '',
        w.licenseNumber || '',
        w.phone || '',
        w.email || '',
        w.hrwlStatus || '',
        w.hrwlExpiry || ''
      ].join(' ').toLowerCase();

      const allTokensMatch = tokens.every(tok => corpus.includes(tok));
      if (!allTokensMatch) return false;
    }

    return true;
  });

  const countBadge = document.getElementById('admin-workers-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${workers.length} Personnel`;
  }

  // Sort filtered personnel list
  const sortCol = window.adminPersonnelSort?.column || 'name';
  const sortDir = window.adminPersonnelSort?.direction || 'asc';

  filtered.sort((itemA, itemB) => {
    let valA, valB;
    switch (sortCol) {
      case 'name':
        valA = itemA.name || '';
        valB = itemB.name || '';
        break;
      case 'role':
        valA = `${itemA.role || ''} ${itemA.department || ''}`;
        valB = `${itemB.role || ''} ${itemB.department || ''}`;
        break;
      case 'contact':
        valA = itemA.phone || itemA.email || '';
        valB = itemB.phone || itemB.email || '';
        break;
      case 'licenseClass':
        valA = itemA.licenseClass || '';
        valB = itemB.licenseClass || '';
        break;
      case 'licenseNumber':
        valA = itemA.licenseNumber || '';
        valB = itemB.licenseNumber || '';
        break;
      case 'hrwlExpiry': {
        const isExemptA = (itemA.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(itemA.department);
        const isExemptB = (itemB.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(itemA.department);
        valA = isExemptA ? '' : (itemA.hrwlExpiry || '');
        valB = isExemptB ? '' : (itemB.hrwlExpiry || '');
        break;
      }
      case 'status': {
        const isExpiredA = (itemA.hrwlStatus === 'Expired') || (itemA.hrwlExpiry && new Date(itemA.hrwlExpiry) < new Date());
        const isExpiredB = (itemB.hrwlStatus === 'Expired') || (itemB.hrwlExpiry && new Date(itemB.hrwlExpiry) < new Date());
        const isExemptA = (itemA.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(itemA.department);
        const isExemptB = (itemB.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(itemB.department);
        valA = isExpiredA ? 'Expired' : isExemptA ? 'Exempt' : (itemA.hrwlStatus || 'Active');
        valB = isExpiredB ? 'Expired' : isExemptB ? 'Exempt' : (itemB.hrwlStatus || 'Active');
        break;
      }
      default:
        valA = itemA.name || '';
        valB = itemB.name || '';
    }
    return compareAdminTableValues(valA, valB, sortDir);
  });

  updatePersonnelTableSortHeaders();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:36px 16px;color:var(--text-muted);font-style:italic;">
          No personnel records found matching the search and filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(w => {
    const dept = w.department || 'Operations';
    const isExpired = (w.hrwlStatus === 'Expired') || (w.hrwlExpiry && new Date(w.hrwlExpiry) < new Date());
    const isExempt = (w.hrwlStatus === 'Exempt') || ['Office', 'Sales', 'Administration'].includes(dept);

    let statusBadge = '';
    if (isExpired) {
      statusBadge = `<span class="admin-badge-expired"><span class="material-symbols-outlined" style="font-size:14px;">error</span> Expired (Locked)</span>`;
    } else if (isExempt) {
      statusBadge = `<span class="admin-badge-exempt"><span class="material-symbols-outlined" style="font-size:14px;">verified_user</span> Exempt (Office)</span>`;
    } else if (w.hrwlStatus === 'Pending') {
      statusBadge = `<span class="admin-badge-warning"><span class="material-symbols-outlined" style="font-size:14px;">schedule</span> Pending</span>`;
    } else {
      statusBadge = `<span class="admin-badge-active"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Active</span>`;
    }

    let deptPillClass = 'admin-dept-ops';
    if (dept === 'Administration') deptPillClass = 'admin-dept-admin';
    else if (dept === 'Office') deptPillClass = 'admin-dept-office';
    else if (dept === 'Sales') deptPillClass = 'admin-dept-sales';
    else if (dept === 'Safety') deptPillClass = 'admin-dept-safety';

    const initials = (w.name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'W';
    const contactPhone = w.phone || '—';
    const contactEmail = w.email || '—';
    const licClass = w.licenseClass || (isExempt ? 'N/A (Exempt)' : 'HRWL');
    const licNum = w.licenseNumber || '—';
    const expiryDisplay = isExempt ? '<span style="color:var(--text-muted);font-style:italic;">Exempt</span>' : (w.hrwlExpiry || 'N/A');

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:30px;height:30px;border-radius:50%;background:rgba(2,132,199,0.12);color:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">
              ${initials}
            </div>
            <div>
              <div style="font-weight:700;color:var(--text-primary);">${escapeHtml(w.name)}</div>
              <div style="font-size:11px;color:var(--text-muted);font-family:monospace;">${escapeHtml(w.id || '')}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
            <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(w.role || 'Team Member')}</span>
            <span class="admin-dept-pill ${deptPillClass}">${escapeHtml(dept)}</span>
          </div>
        </td>
        <td style="font-size:12px;">
          <div style="color:var(--text-primary);display:flex;align-items:center;gap:4px;">
            <span class="material-symbols-outlined" style="font-size:13px;color:var(--text-muted);">phone</span>
            <span>${escapeHtml(contactPhone)}</span>
          </div>
          <div style="color:var(--text-secondary);font-size:11px;display:flex;align-items:center;gap:4px;margin-top:2px;">
            <span class="material-symbols-outlined" style="font-size:13px;color:var(--text-muted);">mail</span>
            <span>${escapeHtml(contactEmail)}</span>
          </div>
        </td>
        <td style="font-family:monospace;font-weight:700;font-size:12px;color:var(--text-primary);">${escapeHtml(licClass)}</td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-secondary);">${escapeHtml(licNum)}</td>
        <td style="font-size:12px;color:${isExpired ? '#dc2626' : 'var(--text-primary)'};font-weight:${isExpired ? '700' : '500'};">${expiryDisplay}</td>
        <td>${statusBadge}</td>
        <td style="text-align:right;white-space:nowrap;">
          <div style="display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;">
            <button class="btn-secondary admin-table-action-btn edit-btn" onclick="openEditPersonnelAdminModal('${escapeHtml(w.id)}')" title="Edit Personnel ${escapeHtml(w.name)}">
              <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
              <span>Edit</span>
            </button>
            <button class="btn-secondary admin-table-action-btn delete-btn" onclick="promptDeletePersonnel('${escapeHtml(w.id)}')" title="Delete Personnel ${escapeHtml(w.name)}">
              <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminPersonnelTable = renderAdminPersonnelTable;

/* ── Fleet Asset CRUD Operations ────────────────────────────────────────── */
function populateAssetWorkerDropdown(selectedWorkerName) {
  const select = document.getElementById('modal-asset-worker');
  if (!select) return;

  const workers = window.ionConfig?.workerRegistry || [];
  select.innerHTML = '<option value="Unassigned (Pool)">Unassigned (Pool)</option>' +
    workers.map(w => {
      const isSelected = selectedWorkerName && (w.name === selectedWorkerName);
      return `<option value="${escapeHtml(w.name)}" ${isSelected ? 'selected' : ''}>${escapeHtml(w.name)} (${escapeHtml(w.role)})</option>`;
    }).join('');
}

function openAddAssetAdminModal() {
  const modal = document.getElementById('admin-add-asset-modal');
  if (!modal) return;

  document.getElementById('modal-asset-mode').value = 'add';
  document.getElementById('modal-asset-original-id').value = '';
  document.getElementById('admin-asset-modal-title').textContent = 'Add Fleet Asset';
  document.getElementById('admin-asset-modal-submit-label').textContent = 'Register Asset';

  const idInput = document.getElementById('modal-asset-id');
  idInput.value = '';
  idInput.readOnly = false;
  idInput.style.opacity = '1';

  document.getElementById('modal-asset-class').value = '';
  document.getElementById('modal-asset-desc').value = '';
  document.getElementById('modal-asset-color').value = '#0284c7';
  document.getElementById('modal-asset-hex').value = '#0284c7';
  document.getElementById('modal-asset-status').value = 'available';

  populateAssetWorkerDropdown('Unassigned (Pool)');
  modal.style.display = 'flex';
}
window.openAddAssetAdminModal = openAddAssetAdminModal;

function handleAddAssetPrompt() {
  openAddAssetAdminModal();
}
window.handleAddAssetPrompt = handleAddAssetPrompt;

function openEditAssetAdminModal(assetId) {
  const modal = document.getElementById('admin-add-asset-modal');
  if (!modal) return;

  const fleet = window.ionConfig?.fleetRegistry || [];
  const asset = fleet.find(a => a.id === assetId);
  if (!asset) {
    showToast(`Asset ${assetId} not found in fleet registry.`, 'error', 'Error');
    return;
  }

  document.getElementById('modal-asset-mode').value = 'edit';
  document.getElementById('modal-asset-original-id').value = asset.id;
  document.getElementById('admin-asset-modal-title').textContent = `Edit Fleet Asset — ${asset.id}`;
  document.getElementById('admin-asset-modal-submit-label').textContent = 'Save Asset Changes';

  const idInput = document.getElementById('modal-asset-id');
  idInput.value = asset.id;
  idInput.readOnly = true;
  idInput.style.opacity = '0.7';

  document.getElementById('modal-asset-class').value = asset.class || asset.category || '';
  document.getElementById('modal-asset-desc').value = asset.description || asset.label || '';
  
  const color = asset.color || asset.hex || '#0284c7';
  document.getElementById('modal-asset-color').value = color;
  document.getElementById('modal-asset-hex').value = color;

  const statusVal = asset.workerStatus === 'maintenance' || asset.status === 'maintenance' ? 'maintenance' :
                    asset.workerStatus === 'overtime' || asset.overtimeWarning ? 'overtime' :
                    asset.workerStatus === 'standby' || asset.status === 'standby' ? 'standby' : 'available';
  document.getElementById('modal-asset-status').value = statusVal;

  populateAssetWorkerDropdown(asset.workerName || 'Unassigned (Pool)');
  modal.style.display = 'flex';
}
window.openEditAssetAdminModal = openEditAssetAdminModal;

function closeAddAssetAdminModal() {
  const modal = document.getElementById('admin-add-asset-modal');
  if (modal) modal.style.display = 'none';
}
window.closeAddAssetAdminModal = closeAddAssetAdminModal;

function submitAddAssetAdmin() {
  const mode = document.getElementById('modal-asset-mode')?.value || 'add';
  const originalId = document.getElementById('modal-asset-original-id')?.value || '';
  const rawId = document.getElementById('modal-asset-id')?.value?.trim().toUpperCase();
  const assetClass = document.getElementById('modal-asset-class')?.value?.trim();
  const assetDesc = document.getElementById('modal-asset-desc')?.value?.trim();
  const hexColor = document.getElementById('modal-asset-hex')?.value?.trim() || '#0284c7';
  const workerName = document.getElementById('modal-asset-worker')?.value || 'Unassigned (Pool)';
  const status = document.getElementById('modal-asset-status')?.value || 'available';

  if (!rawId) {
    showToast('Please provide an Asset Identification Code.', 'warning', 'Required Field');
    return;
  }
  if (!assetClass) {
    showToast('Please specify the Asset Class / Category.', 'warning', 'Required Field');
    return;
  }

  const lowerClass = assetClass.toLowerCase();
  const category = lowerClass.includes('franna') ? 'franna' :
                   lowerClass.includes('crawler') ? 'crawler' :
                   lowerClass.includes('terrain') ? 'all_terrain' :
                   lowerClass.includes('excavator') ? 'excavator' :
                   lowerClass.includes('truck') ? 'truck' : 'crane';

  if (!window.ionConfig) window.ionConfig = {};
  if (!Array.isArray(window.ionConfig.fleetRegistry)) window.ionConfig.fleetRegistry = [];

  if (mode === 'add') {
    const existing = window.ionConfig.fleetRegistry.find(a => a.id === rawId);
    if (existing) {
      showToast(`An asset with ID "${rawId}" already exists in the fleet registry.`, 'error', 'Duplicate ID');
      return;
    }

    const newAsset = {
      id: rawId,
      label: `${rawId} - ${assetClass}`,
      class: assetClass,
      description: assetDesc || `${assetClass} (${rawId})`,
      type: assetClass,
      category: category,
      color: hexColor,
      hex: hexColor,
      workerName: workerName,
      workerStatus: status,
      hoursToday: 0
    };

    window.ionConfig.fleetRegistry.push(newAsset);

    // Sync to dataModels.assetRegistry
    if (typeof assetRegistry !== 'undefined' && Array.isArray(assetRegistry)) {
      assetRegistry.push({
        id: rawId,
        description: newAsset.description,
        hex: hexColor,
        assetType: category
      });
    }

    showToast(`Fleet asset ${rawId} registered successfully.`, 'success', 'Asset Registered');
  } else {
    // Edit mode
    const idx = window.ionConfig.fleetRegistry.findIndex(a => a.id === originalId);
    if (idx >= 0) {
      window.ionConfig.fleetRegistry[idx] = {
        ...window.ionConfig.fleetRegistry[idx],
        class: assetClass,
        description: assetDesc || window.ionConfig.fleetRegistry[idx].description,
        label: `${originalId} - ${assetClass}`,
        type: assetClass,
        category: category,
        color: hexColor,
        hex: hexColor,
        workerName: workerName,
        workerStatus: status,
        overtimeWarning: (status === 'overtime')
      };
    }

    // Sync to dataModels.assetRegistry
    if (typeof assetRegistry !== 'undefined' && Array.isArray(assetRegistry)) {
      const arIdx = assetRegistry.findIndex(a => a.id === originalId);
      if (arIdx >= 0) {
        assetRegistry[arIdx].description = assetDesc || assetRegistry[arIdx].description;
        assetRegistry[arIdx].hex = hexColor;
        assetRegistry[arIdx].assetType = category;
      }
    }

    showToast(`Fleet asset ${originalId} configuration updated.`, 'success', 'Asset Updated');
  }

  if (typeof syncSchedulerLanes === 'function') {
    syncSchedulerLanes();
  }

  closeAddAssetAdminModal();
  renderAdminFleetTable();
  renderSchedulerFilterDropdowns();
}
window.submitAddAssetAdmin = submitAddAssetAdmin;

let pendingAdminDeleteAction = null;

function promptDeleteFleetAsset(assetId) {
  const fleet = window.ionConfig?.fleetRegistry || [];
  const asset = fleet.find(a => a.id === assetId);
  const assetClass = asset?.class || asset?.category || 'Fleet Asset';
  const operator = asset?.workerName || 'Unassigned (Pool)';
  const color = asset?.color || asset?.hex || '#0284c7';

  const modal = document.getElementById('admin-delete-confirm-modal');
  const titleEl = document.getElementById('admin-delete-confirm-title');
  const msgEl = document.getElementById('admin-delete-confirm-message');
  const detailsEl = document.getElementById('admin-delete-confirm-details');
  const confirmBtn = document.getElementById('admin-delete-confirm-btn');

  if (titleEl) titleEl.textContent = 'Delete Fleet Asset';
  if (msgEl) msgEl.textContent = `Are you sure you want to permanently delete asset "${assetId}" from the global configuration registry? This will also unassign it from active scheduler lanes.`;
  if (detailsEl) {
    detailsEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${color};border:1px solid rgba(0,0,0,0.2);"></span>
        <strong style="color:var(--text-primary);font-family:monospace;font-size:13.5px;">${escapeHtml(assetId)}</strong>
        <span style="color:var(--text-muted);">&bull;</span>
        <span style="color:var(--text-secondary);font-weight:600;">${escapeHtml(assetClass)}</span>
        <span style="color:var(--text-muted);">&bull;</span>
        <span style="font-size:12px;color:var(--text-muted);">Operator: ${escapeHtml(operator)}</span>
      </div>
    `;
  }

  pendingAdminDeleteAction = () => executeDeleteFleetAsset(assetId);

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (typeof pendingAdminDeleteAction === 'function') {
        pendingAdminDeleteAction();
      }
      closeDeleteConfirmModal();
    };
  }

  if (modal) modal.style.display = 'flex';
}
window.promptDeleteFleetAsset = promptDeleteFleetAsset;

function deleteFleetAssetAdmin(assetId) {
  promptDeleteFleetAsset(assetId);
}
window.deleteFleetAssetAdmin = deleteFleetAssetAdmin;

function executeDeleteFleetAsset(assetId) {
  if (window.ionConfig?.fleetRegistry) {
    window.ionConfig.fleetRegistry = window.ionConfig.fleetRegistry.filter(a => a.id !== assetId);
  }

  if (typeof mockFleetAssets !== 'undefined' && Array.isArray(mockFleetAssets)) {
    mockFleetAssets = mockFleetAssets.filter(a => a.id !== assetId);
  }

  if (typeof allSchedulerLanes !== 'undefined' && Array.isArray(allSchedulerLanes)) {
    allSchedulerLanes = allSchedulerLanes.filter(a => a.id !== assetId);
  }

  if (typeof assetRegistry !== 'undefined' && Array.isArray(assetRegistry)) {
    const idx = assetRegistry.findIndex(a => a.id === assetId);
    if (idx >= 0) assetRegistry.splice(idx, 1);
  }

  try {
    localStorage.setItem('ion_fleet_registry', JSON.stringify(window.ionConfig?.fleetRegistry || []));
  } catch (e) {
    console.warn('Could not persist fleet registry to localStorage:', e);
  }

  if (typeof syncSchedulerLanes === 'function') syncSchedulerLanes();
  renderAdminFleetTable();
  renderSchedulerFilterDropdowns();

  showToast(`Asset ${assetId} deleted from global configuration registry.`, 'info', 'Asset Deleted');
}
window.executeDeleteFleetAsset = executeDeleteFleetAsset;

function closeDeleteConfirmModal() {
  const modal = document.getElementById('admin-delete-confirm-modal');
  if (modal) modal.style.display = 'none';
  pendingAdminDeleteAction = null;
}
window.closeDeleteConfirmModal = closeDeleteConfirmModal;

/* ── Predefined Roles Registry & Management ────────────────────────────── */
const ROLE_PRESETS = {
  Operations: [
    'Crane Operator',
    'Plant Operator',
    'Dogman',
    'Rigger',
    'Heavy Transport Driver',
    'Lead Rigger / Site Supervisor'
  ],
  Administration: [
    'Fleet & Operations Administrator',
    'Dispatcher / Allocator',
    'Executive Assistant',
    'Compliance Administrator'
  ],
  Office: [
    'General Manager / Office Admin',
    'Office Administrator',
    'Accounts & Billing Specialist',
    'HR & Payroll Coordinator'
  ],
  Sales: [
    'Sales & Estimating Manager',
    'Technical Estimator / Hire Desk',
    'Business Development Manager',
    'Client Account Manager'
  ],
  Safety: [
    'Safety & Compliance Officer',
    'HSE Coordinator / Auditor'
  ]
};

function initPredefinedRoles() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!Array.isArray(window.ionConfig.roleRegistry) || window.ionConfig.roleRegistry.length === 0) {
    window.ionConfig.roleRegistry = [
      // Administration
      { id: 'ROLE_ADM_01', department: 'Administration', role: 'Fleet & Operations Administrator', type: 'Exempt', description: 'Fleet allocation and dispatch administration' },
      { id: 'ROLE_ADM_02', department: 'Administration', role: 'Dispatcher / Allocator', type: 'Exempt', description: 'Daily shift allocation and job dispatch' },
      { id: 'ROLE_ADM_03', department: 'Administration', role: 'Executive Assistant', type: 'Exempt', description: 'Executive administrative coordination' },
      { id: 'ROLE_ADM_04', department: 'Administration', role: 'Compliance Administrator', type: 'Exempt', description: 'Audit, licensing, and compliance tracking' },
      
      // Office
      { id: 'ROLE_OFF_01', department: 'Office', role: 'General Manager / Office Admin', type: 'Exempt', description: 'Branch management and office oversight' },
      { id: 'ROLE_OFF_02', department: 'Office', role: 'Office Administrator', type: 'Exempt', description: 'General office management and documentation' },
      { id: 'ROLE_OFF_03', department: 'Office', role: 'Accounts & Billing Specialist', type: 'Exempt', description: 'Invoicing, billing, and accounts' },
      { id: 'ROLE_OFF_04', department: 'Office', role: 'HR & Payroll Coordinator', type: 'Exempt', description: 'Personnel records, wages, and payroll' },

      // Sales
      { id: 'ROLE_SAL_01', department: 'Sales', role: 'Sales & Estimating Manager', type: 'Exempt', description: 'Commercial quotes, estimating, and tenders' },
      { id: 'ROLE_SAL_02', department: 'Sales', role: 'Technical Estimator / Hire Desk', type: 'Exempt', description: 'Crane lift studies and hire quotes' },
      { id: 'ROLE_SAL_03', department: 'Sales', role: 'Business Development Manager', type: 'Exempt', description: 'Client acquisition and field sales' },
      { id: 'ROLE_SAL_04', department: 'Sales', role: 'Client Account Manager', type: 'Exempt', description: 'Key customer account support' },

      // Operations
      { id: 'ROLE_OPS_01', department: 'Operations', role: 'Crane Operator', type: 'HRWL', description: 'Certified mobile crane operator (C1/C6/CO)' },
      { id: 'ROLE_OPS_02', department: 'Operations', role: 'Plant Operator', type: 'HRWL', description: 'Heavy earthmoving and plant machinery' },
      { id: 'ROLE_OPS_03', department: 'Operations', role: 'Dogman', type: 'HRWL', description: 'High Risk Work Licenced Dogging (DG)' },
      { id: 'ROLE_OPS_04', department: 'Operations', role: 'Rigger', type: 'HRWL', description: 'Rigging qualification (RB/RI/RA)' },
      { id: 'ROLE_OPS_05', department: 'Operations', role: 'Heavy Transport Driver', type: 'HRWL', description: 'Heavy Combination / Multi-Combination float driver' },
      { id: 'ROLE_OPS_06', department: 'Operations', role: 'Lead Rigger / Site Supervisor', type: 'HRWL', description: 'On-site lift supervision and lift director' },

      // Safety
      { id: 'ROLE_SAF_01', department: 'Safety', role: 'Safety & Compliance Officer', type: 'Safety', description: 'WHS auditor, SWMS author, and site compliance' },
      { id: 'ROLE_SAF_02', department: 'Safety', role: 'HSE Coordinator / Auditor', type: 'Safety', description: 'Health, safety, and environmental systems' }
    ];
  }
}
window.initPredefinedRoles = initPredefinedRoles;

function syncRoleDropdowns() {
  initPredefinedRoles();
  const roles = window.ionConfig?.roleRegistry || [];

  // Update ROLE_PRESETS mapping dynamically
  const depts = ['Operations', 'Administration', 'Office', 'Sales', 'Safety'];
  depts.forEach(d => {
    ROLE_PRESETS[d] = roles.filter(r => r.department.toLowerCase() === d.toLowerCase()).map(r => r.role);
  });

  // 1. Sync Personnel Table Role Filter (#admin-workers-role-filter)
  const roleFilterSelect = document.getElementById('admin-workers-role-filter');
  if (roleFilterSelect) {
    const currentVal = roleFilterSelect.value || 'ALL';
    let filterHtml = '<option value="ALL">All Roles &amp; Depts</option>';

    // Departments optgroup
    filterHtml += '<optgroup label="Departments">';
    depts.forEach(d => {
      filterHtml += `<option value="DEPT:${d}">${d}</option>`;
    });
    filterHtml += '</optgroup>';

    // Grouped by departments
    depts.forEach(d => {
      const deptRoles = roles.filter(r => r.department.toLowerCase() === d.toLowerCase());
      if (deptRoles.length > 0) {
        filterHtml += `<optgroup label="${d} Roles">`;
        deptRoles.forEach(r => {
          filterHtml += `<option value="${escapeHtml(r.role)}">${escapeHtml(r.role)}</option>`;
        });
        filterHtml += '</optgroup>';
      }
    });

    roleFilterSelect.innerHTML = filterHtml;
    // Restore previous value if it still exists
    if ([...roleFilterSelect.options].some(o => o.value === currentVal)) {
      roleFilterSelect.value = currentVal;
    }
  }

  // 2. Also sync Modal preset dropdown if modal is open
  const modalDept = document.getElementById('modal-worker-dept')?.value;
  if (modalDept) {
    const currentPreset = document.getElementById('modal-worker-role-preset')?.value;
    populateWorkerRolePresets(modalDept, currentPreset);
  }
}
window.syncRoleDropdowns = syncRoleDropdowns;

function renderAdminRolesTable() {
  const tbody = document.getElementById('admin-roles-table-body');
  if (!tbody) return;

  initPredefinedRoles();
  const roles = window.ionConfig?.roleRegistry || [];
  const workers = window.ionConfig?.workerRegistry || [];

  const searchInput = document.getElementById('admin-roles-search');
  const deptFilter = document.getElementById('admin-roles-dept-filter');
  const rawQ = (searchInput?.value || '').trim().toLowerCase();
  const dFilter = (deptFilter?.value || 'ALL');

  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];

  let filtered = roles.filter(r => {
    if (dFilter !== 'ALL' && r.department.toLowerCase() !== dFilter.toLowerCase()) {
      return false;
    }

    if (tokens.length > 0) {
      const corpus = [
        r.id || '',
        r.role || '',
        r.department || '',
        r.type || '',
        r.description || ''
      ].join(' ').toLowerCase();

      const allMatch = tokens.every(tok => corpus.includes(tok));
      if (!allMatch) return false;
    }

    return true;
  });

  const countBadge = document.getElementById('admin-roles-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${roles.length} Roles`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:36px 16px;color:var(--text-muted);font-style:italic;">
          No predefined roles found matching criteria. Use the form above to register a new role.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const dept = r.department || 'Operations';
    let deptPillClass = 'admin-dept-ops';
    if (dept === 'Administration') deptPillClass = 'admin-dept-admin';
    else if (dept === 'Office') deptPillClass = 'admin-dept-office';
    else if (dept === 'Sales') deptPillClass = 'admin-dept-sales';
    else if (dept === 'Safety') deptPillClass = 'admin-dept-safety';

    // Count assigned personnel
    const assignedCount = workers.filter(w => (w.role || '').toLowerCase() === (r.role || '').toLowerCase()).length;
    
    let typeBadge = '<span class="admin-badge-exempt"><span class="material-symbols-outlined" style="font-size:13px;">verified_user</span> Exempt</span>';
    if (r.type === 'HRWL') {
      typeBadge = '<span class="admin-badge-active"><span class="material-symbols-outlined" style="font-size:13px;">badge</span> HRWL Licenced</span>';
    } else if (r.type === 'Safety') {
      typeBadge = '<span class="admin-badge-warning"><span class="material-symbols-outlined" style="font-size:13px;">shield</span> WHS Certified</span>';
    }

    return `
      <tr>
        <td>
          <span class="admin-dept-pill ${deptPillClass}">${escapeHtml(dept)}</span>
        </td>
        <td>
          <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${escapeHtml(r.role)}</div>
          ${r.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escapeHtml(r.description)}</div>` : ''}
        </td>
        <td>${typeBadge}</td>
        <td>
          <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;background:${assignedCount > 0 ? 'rgba(2,132,199,0.1)' : 'var(--bg-secondary)'};color:${assignedCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)'};border:1px solid ${assignedCount > 0 ? 'rgba(2,132,199,0.2)' : 'var(--border-light)'};">
            ${assignedCount} active ${assignedCount === 1 ? 'member' : 'members'}
          </span>
        </td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn-secondary admin-table-action-btn delete-btn" onclick="removePredefinedRole('${escapeHtml(r.id)}')" title="Delete Predefined Role ${escapeHtml(r.role)}">
            <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
            <span>Delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminRolesTable = renderAdminRolesTable;

function submitAddRoleAdmin() {
  const deptEl = document.getElementById('admin-new-role-dept');
  const titleEl = document.getElementById('admin-new-role-title');
  const typeEl = document.getElementById('admin-new-role-type');

  const dept = deptEl?.value || 'Administration';
  const title = (titleEl?.value || '').trim();
  const type = typeEl?.value || 'Exempt';

  if (!title) {
    showToast('Please enter a Role Title.', 'warning', 'Required Field');
    if (titleEl) titleEl.focus();
    return;
  }

  initPredefinedRoles();
  const roles = window.ionConfig?.roleRegistry || [];

  // Check duplicate
  const existing = roles.find(r => r.role.toLowerCase() === title.toLowerCase() && r.department.toLowerCase() === dept.toLowerCase());
  if (existing) {
    showToast(`Role "${title}" already exists under ${dept}.`, 'warning', 'Duplicate Role');
    return;
  }

  const newId = `ROLE_${dept.substring(0, 3).toUpperCase()}_${Date.now().toString().slice(-4)}`;
  roles.push({
    id: newId,
    department: dept,
    role: title,
    type: type,
    description: `Predefined ${dept} operational role`
  });

  if (titleEl) titleEl.value = '';

  syncRoleDropdowns();
  renderAdminRolesTable();
  renderAdminPersonnelTable();

  showToast(`Predefined role "${title}" added to ${dept}.`, 'success', 'Role Added');
}
window.submitAddRoleAdmin = submitAddRoleAdmin;

function removePredefinedRole(roleId) {
  initPredefinedRoles();
  const roles = window.ionConfig?.roleRegistry || [];
  const target = roles.find(r => r.id === roleId);
  if (!target) return;

  const workers = window.ionConfig?.workerRegistry || [];
  const assignedWorkers = workers.filter(w => (w.role || '').toLowerCase() === (target.role || '').toLowerCase());

  let confirmMsg = `Are you sure you want to delete the predefined role "${target.role}" (${target.department})? It will be removed from all role dropdowns.`;
  if (assignedWorkers.length > 0) {
    confirmMsg += `\n\nNotice: ${assignedWorkers.length} personnel member(s) currently hold this role title.`;
  }

  if (!confirm(confirmMsg)) {
    return;
  }

  window.ionConfig.roleRegistry = roles.filter(r => r.id !== roleId);

  syncRoleDropdowns();
  renderAdminRolesTable();
  renderAdminPersonnelTable();

  showToast(`Role "${target.role}" removed from predefined registry.`, 'info', 'Role Removed');
}
window.removePredefinedRole = removePredefinedRole;

function populateWorkerRolePresets(dept, selectedRole) {
  const select = document.getElementById('modal-worker-role-preset');
  const customWrap = document.getElementById('modal-worker-custom-role-wrap');
  const customInput = document.getElementById('modal-worker-custom-role');
  if (!select) return;

  initPredefinedRoles();
  const allRoles = window.ionConfig?.roleRegistry || [];
  const deptRoles = allRoles.filter(r => r.department.toLowerCase() === (dept || 'operations').toLowerCase()).map(r => r.role);
  const roles = deptRoles.length > 0 ? deptRoles : (ROLE_PRESETS[dept] || ['Team Member']);
  let isPresetFound = false;

  let html = roles.map(r => {
    const match = selectedRole && (selectedRole.toLowerCase() === r.toLowerCase());
    if (match) isPresetFound = true;
    return `<option value="${escapeHtml(r)}" ${match ? 'selected' : ''}>${escapeHtml(r)}</option>`;
  }).join('');

  html += `<option value="CUSTOM" ${(!isPresetFound && selectedRole) ? 'selected' : ''}>Custom Role / Title...</option>`;
  select.innerHTML = html;

  if (!isPresetFound && selectedRole) {
    if (customWrap) customWrap.style.display = 'block';
    if (customInput) customInput.value = selectedRole;
  } else {
    if (customWrap) customWrap.style.display = 'none';
    if (customInput) customInput.value = '';
  }
}
window.populateWorkerRolePresets = populateWorkerRolePresets;

function onWorkerDepartmentChange() {
  const dept = document.getElementById('modal-worker-dept')?.value || 'Operations';
  populateWorkerRolePresets(dept, '');

  const licClassInput = document.getElementById('modal-worker-lic-class');
  const licNumInput = document.getElementById('modal-worker-lic-num');
  const statusSelect = document.getElementById('modal-worker-status');
  const expiryInput = document.getElementById('modal-worker-lic-expiry');

  if (['Office', 'Sales', 'Administration'].includes(dept)) {
    if (licClassInput && !licClassInput.value) licClassInput.value = `N/A (${dept})`;
    if (licNumInput && !licNumInput.value) licNumInput.value = `${dept.toUpperCase().substring(0, 3)}-${Math.floor(100 + Math.random()*900)}`;
    if (statusSelect) statusSelect.value = 'Exempt';
    if (expiryInput) expiryInput.value = '';
  } else if (dept === 'Safety') {
    if (licClassInput && !licClassInput.value) licClassInput.value = 'Cert IV WHS / Safety Auditor';
    if (statusSelect) statusSelect.value = 'Active';
  } else {
    if (licClassInput && licClassInput.value.startsWith('N/A')) licClassInput.value = 'C1 / C6';
    if (statusSelect && statusSelect.value === 'Exempt') statusSelect.value = 'Active';
  }
}
window.onWorkerDepartmentChange = onWorkerDepartmentChange;

function onWorkerRolePresetChange() {
  const preset = document.getElementById('modal-worker-role-preset')?.value;
  const customWrap = document.getElementById('modal-worker-custom-role-wrap');
  const customInput = document.getElementById('modal-worker-custom-role');

  if (preset === 'CUSTOM') {
    if (customWrap) customWrap.style.display = 'block';
    if (customInput) customInput.focus();
  } else {
    if (customWrap) customWrap.style.display = 'none';
  }
}
window.onWorkerRolePresetChange = onWorkerRolePresetChange;

function openAddPersonnelAdminModal() {
  const modal = document.getElementById('admin-add-worker-modal');
  if (!modal) return;

  document.getElementById('modal-worker-mode').value = 'add';
  document.getElementById('modal-worker-id').value = '';
  document.getElementById('admin-worker-modal-title').textContent = 'Add Personnel Member';
  document.getElementById('admin-worker-modal-submit-label').textContent = 'Register Personnel';

  document.getElementById('modal-worker-name').value = '';
  document.getElementById('modal-worker-dept').value = 'Operations';
  populateWorkerRolePresets('Operations', 'Crane Operator');
  document.getElementById('modal-worker-phone').value = '';
  document.getElementById('modal-worker-email').value = '';
  document.getElementById('modal-worker-lic-class').value = 'C1 / C6';
  document.getElementById('modal-worker-lic-num').value = 'QLD-HRW-' + Math.floor(10000 + Math.random()*89999);
  document.getElementById('modal-worker-lic-expiry').value = '2027-06-30';
  document.getElementById('modal-worker-status').value = 'Active';

  modal.style.display = 'flex';
}
window.openAddPersonnelAdminModal = openAddPersonnelAdminModal;

function openEditPersonnelAdminModal(workerId) {
  const modal = document.getElementById('admin-add-worker-modal');
  if (!modal) return;

  const workers = window.ionConfig?.workerRegistry || [];
  const worker = workers.find(w => w.id === workerId);
  if (!worker) {
    showToast(`Worker ${workerId} not found.`, 'error', 'Error');
    return;
  }

  document.getElementById('modal-worker-mode').value = 'edit';
  document.getElementById('modal-worker-id').value = worker.id;
  document.getElementById('admin-worker-modal-title').textContent = `Edit Personnel — ${worker.name}`;
  document.getElementById('admin-worker-modal-submit-label').textContent = 'Save Personnel Changes';

  document.getElementById('modal-worker-name').value = worker.name || '';
  const dept = worker.department || 'Operations';
  document.getElementById('modal-worker-dept').value = dept;
  populateWorkerRolePresets(dept, worker.role || '');

  document.getElementById('modal-worker-phone').value = worker.phone || '';
  document.getElementById('modal-worker-email').value = worker.email || '';
  document.getElementById('modal-worker-lic-class').value = worker.licenseClass || '';
  document.getElementById('modal-worker-lic-num').value = worker.licenseNumber || '';
  document.getElementById('modal-worker-lic-expiry').value = worker.hrwlExpiry || '';
  document.getElementById('modal-worker-status').value = worker.hrwlStatus || (['Office', 'Sales', 'Administration'].includes(dept) ? 'Exempt' : 'Active');

  modal.style.display = 'flex';
}
window.openEditPersonnelAdminModal = openEditPersonnelAdminModal;

function closeAddPersonnelAdminModal() {
  const modal = document.getElementById('admin-add-worker-modal');
  if (modal) modal.style.display = 'none';
}
window.closeAddPersonnelAdminModal = closeAddPersonnelAdminModal;

function submitPersonnelAdmin() {
  const mode = document.getElementById('modal-worker-mode')?.value || 'add';
  const workerId = document.getElementById('modal-worker-id')?.value || '';
  const name = document.getElementById('modal-worker-name')?.value?.trim();
  const dept = document.getElementById('modal-worker-dept')?.value || 'Operations';
  const rolePreset = document.getElementById('modal-worker-role-preset')?.value || '';
  const customRole = document.getElementById('modal-worker-custom-role')?.value?.trim();
  const phone = document.getElementById('modal-worker-phone')?.value?.trim();
  const email = document.getElementById('modal-worker-email')?.value?.trim();
  const licClass = document.getElementById('modal-worker-lic-class')?.value?.trim();
  const licNum = document.getElementById('modal-worker-lic-num')?.value?.trim();
  const expiry = document.getElementById('modal-worker-lic-expiry')?.value;
  const status = document.getElementById('modal-worker-status')?.value || 'Active';

  if (!name) {
    showToast('Please enter the team member\'s full name.', 'warning', 'Required Field');
    return;
  }

  const finalRole = (rolePreset === 'CUSTOM' ? customRole : rolePreset) || 'Team Member';

  if (!window.ionConfig) window.ionConfig = {};
  if (!Array.isArray(window.ionConfig.workerRegistry)) window.ionConfig.workerRegistry = [];

  if (mode === 'add') {
    // Generate next worker ID
    const existingCount = window.ionConfig.workerRegistry.length + 1;
    const newId = `W${String(existingCount).padStart(3, '0')}`;

    const newWorker = {
      id: newId,
      name: name,
      role: finalRole,
      department: dept,
      phone: phone || '0412 000 000',
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@ionhire.com.au`,
      licenseClass: licClass || (dept === 'Operations' ? 'HRWL' : `N/A (${dept})`),
      licenseNumber: licNum || '—',
      hrwlExpiry: expiry || '',
      hrwlStatus: status
    };

    window.ionConfig.workerRegistry.push(newWorker);

    // Sync to dataModels.workerRegistry
    if (typeof addWorker === 'function') {
      addWorker({
        id: newId,
        name: name,
        role: finalRole,
        department: dept,
        status: 'available',
        phone: newWorker.phone,
        email: newWorker.email,
        licenses: [{
          type: newWorker.licenseClass,
          licenseNumber: newWorker.licenseNumber,
          expiry: newWorker.hrwlExpiry,
          state: 'QLD'
        }]
      });
    }

    showToast(`Personnel record for ${name} (${finalRole}) created successfully.`, 'success', 'Personnel Added');
  } else {
    // Edit mode
    const idx = window.ionConfig.workerRegistry.findIndex(w => w.id === workerId);
    if (idx >= 0) {
      window.ionConfig.workerRegistry[idx] = {
        ...window.ionConfig.workerRegistry[idx],
        name: name,
        role: finalRole,
        department: dept,
        phone: phone,
        email: email,
        licenseClass: licClass,
        licenseNumber: licNum,
        hrwlExpiry: expiry,
        hrwlStatus: status
      };
    }

    // Sync to dataModels.workerRegistry
    if (typeof updateWorkerById === 'function') {
      updateWorkerById(workerId, {
        name: name,
        role: finalRole,
        department: dept,
        phone: phone,
        email: email,
        licenses: [{
          type: licClass,
          licenseNumber: licNum,
          expiry: expiry,
          state: 'QLD'
        }]
      });
    }

    showToast(`Personnel record for ${name} updated successfully.`, 'success', 'Record Updated');
  }

  closeAddPersonnelAdminModal();
  renderAdminPersonnelTable();

  // If worker view is open or initialized, refresh it
  if (typeof renderWorkerView === 'function') {
    try { renderWorkerView(); } catch(e) {}
  }
}
window.submitPersonnelAdmin = submitPersonnelAdmin;

function promptDeletePersonnel(workerId) {
  const workers = window.ionConfig?.workerRegistry || [];
  const worker = workers.find(w => w.id === workerId);
  const workerName = worker?.name || workerId;
  const role = worker?.role || 'Staff Member';
  const dept = worker?.department || 'Operations';

  const modal = document.getElementById('admin-delete-confirm-modal');
  const titleEl = document.getElementById('admin-delete-confirm-title');
  const msgEl = document.getElementById('admin-delete-confirm-message');
  const detailsEl = document.getElementById('admin-delete-confirm-details');
  const confirmBtn = document.getElementById('admin-delete-confirm-btn');

  if (titleEl) titleEl.textContent = 'Delete Personnel Record';
  if (msgEl) msgEl.textContent = `Are you sure you want to permanently delete personnel member "${workerName}" (${workerId}) from the global configuration registry?`;
  if (detailsEl) {
    detailsEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="material-symbols-outlined" style="font-size:20px;color:var(--text-muted);">badge</span>
        <strong style="color:var(--text-primary);font-size:13.5px;">${escapeHtml(workerName)}</strong>
        <span style="color:var(--text-muted);">&bull;</span>
        <span style="color:var(--text-secondary);font-weight:600;">${escapeHtml(role)}</span>
        <span style="color:var(--text-muted);">&bull;</span>
        <span style="font-size:12px;color:var(--text-muted);">${escapeHtml(dept)} [ID: ${escapeHtml(workerId)}]</span>
      </div>
    `;
  }

  pendingAdminDeleteAction = () => executeDeletePersonnel(workerId);

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (typeof pendingAdminDeleteAction === 'function') {
        pendingAdminDeleteAction();
      }
      closeDeleteConfirmModal();
    };
  }

  if (modal) modal.style.display = 'flex';
}
window.promptDeletePersonnel = promptDeletePersonnel;

function deletePersonnelAdmin(workerId) {
  promptDeletePersonnel(workerId);
}
window.deletePersonnelAdmin = deletePersonnelAdmin;

function executeDeletePersonnel(workerId) {
  const workers = window.ionConfig?.workerRegistry || [];
  const worker = workers.find(w => w.id === workerId);
  const workerName = worker?.name || workerId;

  if (window.ionConfig?.workerRegistry) {
    window.ionConfig.workerRegistry = window.ionConfig.workerRegistry.filter(w => w.id !== workerId);
  }

  if (typeof removeWorkerById === 'function') {
    try { removeWorkerById(workerId); } catch(e) {}
  }

  // De-allocate from any fleet assets where this worker was primary
  if (window.ionConfig?.fleetRegistry) {
    window.ionConfig.fleetRegistry.forEach(a => {
      if (a.workerName === workerName) {
        a.workerName = 'Unassigned (Pool)';
      }
    });
    renderAdminFleetTable();
  }

  // Persist worker registry to localStorage
  try {
    localStorage.setItem('ion_worker_registry', JSON.stringify(window.ionConfig?.workerRegistry || []));
  } catch (e) {
    console.warn('Could not persist worker registry to localStorage:', e);
  }

  renderAdminPersonnelTable();
  renderAdminRolesTable();

  if (typeof renderWorkerView === 'function') {
    try { renderWorkerView(); } catch(e) {}
  }

  showToast(`Personnel record for ${workerName} removed from configuration registry.`, 'info', 'Personnel Deleted');
}
window.executeDeletePersonnel = executeDeletePersonnel;

/* ── Scheduling Rules Auto-Save & Persistence ─────────────────────────── */
let schedAutoSaveTimer = null;

function loadAdminSchedulingRules() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.schedulingRules) window.ionConfig.schedulingRules = {};

  // Check localStorage first
  try {
    const saved = localStorage.getItem('ion_scheduling_rules');
    if (saved) {
      const parsed = JSON.parse(saved);
      window.ionConfig.schedulingRules = Object.assign(window.ionConfig.schedulingRules, parsed);
    }
  } catch (e) {
    console.warn('Error reading saved scheduling rules:', e);
  }

  const rules = window.ionConfig.schedulingRules;
  const startEl = document.getElementById('admin-rule-start-time');
  const endEl = document.getElementById('admin-rule-end-time');
  const hoursEl = document.getElementById('admin-rule-std-hours');
  const otEl = document.getElementById('admin-rule-ot-mult');
  const dblEl = document.getElementById('admin-rule-double-mult');
  const restEl = document.getElementById('admin-rule-rest-period');

  if (startEl && rules.standardHoursStart) startEl.value = rules.standardHoursStart;
  if (endEl && rules.standardHoursEnd) endEl.value = rules.standardHoursEnd;
  if (hoursEl && rules.standardHoursDuration !== undefined) hoursEl.value = rules.standardHoursDuration;
  if (otEl && rules.overtimeMultiplier !== undefined) otEl.value = rules.overtimeMultiplier;
  if (dblEl && rules.doubleTimeMultiplier !== undefined) dblEl.value = rules.doubleTimeMultiplier;
  if (restEl && rules.restPeriodHours !== undefined) restEl.value = rules.restPeriodHours;
}
window.loadAdminSchedulingRules = loadAdminSchedulingRules;

function updateSchedulingRulesAutoSaveBadge(isSaving = false) {
  const badge = document.getElementById('admin-sched-autosave-badge');
  const text = document.getElementById('admin-sched-autosave-text');
  if (!badge || !text) return;

  if (isSaving) {
    text.textContent = 'Auto-saving...';
    badge.style.opacity = '0.7';
  } else {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    text.textContent = `Auto-saved (${timeStr})`;
    badge.style.opacity = '1';
  }
}

function saveAdminSchedulingRules(isAutoSave = false) {
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

  // Persist to localStorage automatically
  try {
    localStorage.setItem('ion_scheduling_rules', JSON.stringify(window.ionConfig.schedulingRules));
  } catch (e) {
    console.warn('Could not persist scheduling rules to localStorage:', e);
  }

  updateSchedulingRulesAutoSaveBadge(false);

  const statusEl = document.getElementById('admin-rules-status');
  if (statusEl) {
    statusEl.style.display = 'inline';
    statusEl.textContent = isAutoSave ? 'Auto-saved' : 'Saved to window.ionConfig & storage';
    setTimeout(() => { statusEl.style.display = 'none'; }, 2500);
  }

  if (!isAutoSave) {
    showToast('Operational scheduling rules successfully persisted to system configuration.', 'success', 'Rules Updated');
  }
}
window.saveAdminSchedulingRules = saveAdminSchedulingRules;

function initSchedulingRulesAutoSave() {
  const inputs = [
    'admin-rule-start-time',
    'admin-rule-end-time',
    'admin-rule-std-hours',
    'admin-rule-ot-mult',
    'admin-rule-double-mult',
    'admin-rule-rest-period'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._hasAutoSaveListener) return;
    el._hasAutoSaveListener = true;

    const triggerAutoSave = () => {
      updateSchedulingRulesAutoSaveBadge(true);
      if (schedAutoSaveTimer) clearTimeout(schedAutoSaveTimer);
      schedAutoSaveTimer = setTimeout(() => {
        saveAdminSchedulingRules(true);
      }, 400);
    };

    el.addEventListener('input', triggerAutoSave);
    el.addEventListener('change', triggerAutoSave);
  });
}
window.initSchedulingRulesAutoSave = initSchedulingRulesAutoSave;

/* ── CSV Export Functionality for Fleet & Personnel ───────────────────── */
function escapeCSVField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function downloadCSVFile(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportAdminFleetCSV() {
  const fleet = window.ionConfig?.fleetRegistry || [];
  if (fleet.length === 0) {
    showToast('No fleet asset records available to export.', 'warning', 'Export Empty');
    return;
  }

  const headers = ['Asset ID', 'Class/Category', 'Description/Label', 'Assigned Operator', 'Status', 'Color/Hex'];
  const rows = fleet.map(a => [
    escapeCSVField(a.id || ''),
    escapeCSVField(a.class || a.category || ''),
    escapeCSVField(a.description || a.label || ''),
    escapeCSVField(a.workerName || 'Unassigned (Pool)'),
    escapeCSVField(a.workerStatus || a.status || 'Active'),
    escapeCSVField(a.color || a.hex || '#0284c7')
  ]);

  const csvContent = [headers.map(escapeCSVField).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSVFile(csvContent, `ion_fleet_registry_${dateStr}.csv`);
  showToast(`Successfully exported ${fleet.length} fleet assets to CSV.`, 'success', 'Export Complete');
}
window.exportAdminFleetCSV = exportAdminFleetCSV;

function exportAdminPersonnelCSV() {
  const workers = window.ionConfig?.workerRegistry || [];
  if (workers.length === 0) {
    showToast('No personnel records available to export.', 'warning', 'Export Empty');
    return;
  }

  const headers = ['Personnel ID', 'Full Name', 'Role Title', 'Department', 'Phone', 'Email', 'License Class', 'License Number', 'HRWL Expiry', 'HRWL Status'];
  const rows = workers.map(w => [
    escapeCSVField(w.id || ''),
    escapeCSVField(w.name || ''),
    escapeCSVField(w.role || ''),
    escapeCSVField(w.department || 'Operations'),
    escapeCSVField(w.phone || ''),
    escapeCSVField(w.email || ''),
    escapeCSVField(w.licenseClass || ''),
    escapeCSVField(w.licenseNumber || ''),
    escapeCSVField(w.hrwlExpiry || ''),
    escapeCSVField(w.hrwlStatus || 'Active')
  ]);

  const csvContent = [headers.map(escapeCSVField).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSVFile(csvContent, `ion_personnel_registry_${dateStr}.csv`);
  showToast(`Successfully exported ${workers.length} personnel records to CSV.`, 'success', 'Export Complete');
}
window.exportAdminPersonnelCSV = exportAdminPersonnelCSV;

/* ── Bulk Data Import Module (JSON & CSV) ──────────────────────────────── */
let parsedBulkImportData = [];
let currentBulkImportTarget = 'fleet';

function openBulkImportAdminModal(target = 'fleet') {
  currentBulkImportTarget = target;
  const select = document.getElementById('bulk-import-target');
  if (select) select.value = target;

  clearBulkImportFile();
  const modal = document.getElementById('admin-bulk-import-modal');
  if (modal) modal.style.display = 'flex';
}
window.openBulkImportAdminModal = openBulkImportAdminModal;

function closeBulkImportAdminModal() {
  const modal = document.getElementById('admin-bulk-import-modal');
  if (modal) modal.style.display = 'none';
  clearBulkImportFile();
}
window.closeBulkImportAdminModal = closeBulkImportAdminModal;

function onBulkImportTargetChange() {
  const select = document.getElementById('bulk-import-target');
  if (select) currentBulkImportTarget = select.value;
  if (parsedBulkImportData.length > 0) {
    renderBulkImportPreview();
  }
}
window.onBulkImportTargetChange = onBulkImportTargetChange;

function clearBulkImportFile() {
  parsedBulkImportData = [];
  const fileInput = document.getElementById('bulk-import-file-input');
  if (fileInput) fileInput.value = '';

  const dropzone = document.getElementById('bulk-import-dropzone');
  const previewWrap = document.getElementById('bulk-import-preview-wrap');
  const submitBtn = document.getElementById('bulk-import-submit-btn');

  if (dropzone) dropzone.style.display = 'flex';
  if (previewWrap) previewWrap.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
}
window.clearBulkImportFile = clearBulkImportFile;

function handleBulkImportFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  processBulkImportFile(file);
}
window.handleBulkImportFileSelected = handleBulkImportFileSelected;

function setupBulkImportDropzone() {
  const dropzone = document.getElementById('bulk-import-dropzone');
  if (!dropzone || dropzone._hasDropListeners) return;
  dropzone._hasDropListeners = true;

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) processBulkImportFile(file);
  });
}
window.setupBulkImportDropzone = setupBulkImportDropzone;

function processBulkImportFile(file) {
  const filename = file.name;
  const isJson = filename.toLowerCase().endsWith('.json') || file.type.includes('json');
  const isCsv = filename.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type.includes('text');

  if (!isJson && !isCsv) {
    showToast('Unsupported file format. Please upload a .csv or .json file.', 'error', 'Invalid File');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    try {
      if (isJson) {
        parseJsonImportData(content);
      } else {
        parseCsvImportData(content);
      }

      if (parsedBulkImportData.length === 0) {
        showToast('The uploaded file contained no valid registry records.', 'warning', 'No Records Found');
        return;
      }

      const dropzone = document.getElementById('bulk-import-dropzone');
      const previewWrap = document.getElementById('bulk-import-preview-wrap');
      const filenameEl = document.getElementById('bulk-import-filename');
      const badgeEl = document.getElementById('bulk-import-badge');
      const submitBtn = document.getElementById('bulk-import-submit-btn');

      if (dropzone) dropzone.style.display = 'none';
      if (previewWrap) previewWrap.style.display = 'flex';
      if (filenameEl) filenameEl.textContent = filename;
      if (badgeEl) badgeEl.textContent = `${parsedBulkImportData.length} records ready`;
      if (submitBtn) submitBtn.disabled = false;

      renderBulkImportPreview();
      showToast(`Parsed ${parsedBulkImportData.length} records from ${filename}. Review preview before executing.`, 'success', 'File Parsed');
    } catch (err) {
      console.error('Error parsing bulk import file:', err);
      showToast(`Failed to parse file: ${err.message}`, 'error', 'Import Error');
    }
  };
  reader.readAsText(file);
}

function parseCsvImportData(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row.');

  // Parse CSV line taking quotes into account
  const parseRow = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const target = currentBulkImportTarget;
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.every(v => v === '')) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    if (target === 'fleet') {
      const id = rowObj['assetid'] || rowObj['id'] || rowObj['asset'] || `ASSET-${Date.now()}-${i}`;
      const cls = rowObj['classcategory'] || rowObj['class'] || rowObj['category'] || 'General Plant';
      const desc = rowObj['descriptionlabel'] || rowObj['description'] || rowObj['label'] || id;
      const worker = rowObj['assignedoperator'] || rowObj['operator'] || rowObj['workername'] || 'Unassigned (Pool)';
      const status = rowObj['status'] || 'Active';
      const color = rowObj['colorhex'] || rowObj['color'] || rowObj['hex'] || '#0284c7';

      records.push({
        id,
        class: cls,
        category: cls,
        description: desc,
        label: desc,
        workerName: worker,
        status: status,
        color: color,
        hex: color
      });
    } else {
      const name = rowObj['fullname'] || rowObj['name'] || rowObj['workername'] || `Worker ${i}`;
      const id = rowObj['personnelid'] || rowObj['id'] || rowObj['workerid'] || `WKR-${Date.now()}-${i}`;
      const role = rowObj['roletitle'] || rowObj['role'] || 'Plant Operator';
      const dept = rowObj['department'] || rowObj['dept'] || 'Operations';
      const phone = rowObj['phone'] || rowObj['contact'] || '';
      const email = rowObj['email'] || '';
      const licClass = rowObj['licenseclass'] || rowObj['class'] || '';
      const licNum = rowObj['licensenumber'] || rowObj['number'] || '';
      const hrwlExpiry = rowObj['hrwlexpiry'] || rowObj['expiry'] || '';
      const hrwlStatus = rowObj['hrwlstatus'] || rowObj['status'] || (['Office', 'Sales', 'Administration'].includes(dept) ? 'Exempt' : 'Active');

      records.push({
        id,
        name,
        role,
        department: dept,
        phone,
        email,
        licenseClass: licClass,
        licenseNumber: licNum,
        hrwlExpiry,
        hrwlStatus
      });
    }
  }

  parsedBulkImportData = records;
}

function parseJsonImportData(text) {
  let data = JSON.parse(text);
  const target = currentBulkImportTarget;

  if (!Array.isArray(data)) {
    if (data.fleet && Array.isArray(data.fleet) && target === 'fleet') {
      data = data.fleet;
    } else if (data.workers && Array.isArray(data.workers) && target === 'personnel') {
      data = data.workers;
    } else if (data.personnel && Array.isArray(data.personnel) && target === 'personnel') {
      data = data.personnel;
    } else if (data.records && Array.isArray(data.records)) {
      data = data.records;
    } else {
      throw new Error('JSON structure must be an array of records or contain a target key (fleet or personnel).');
    }
  }

  if (target === 'fleet') {
    parsedBulkImportData = data.map((item, idx) => ({
      id: item.id || item.assetId || `ASSET-${Date.now()}-${idx}`,
      class: item.class || item.category || 'General Plant',
      category: item.category || item.class || 'General Plant',
      description: item.description || item.label || item.id || 'Fleet Asset',
      label: item.label || item.description || item.id || 'Fleet Asset',
      workerName: item.workerName || item.operator || 'Unassigned (Pool)',
      status: item.status || 'Active',
      color: item.color || item.hex || '#0284c7',
      hex: item.hex || item.color || '#0284c7'
    }));
  } else {
    parsedBulkImportData = data.map((item, idx) => ({
      id: item.id || item.workerId || `WKR-${Date.now()}-${idx}`,
      name: item.name || item.fullName || `Worker ${idx + 1}`,
      role: item.role || item.roleTitle || 'Plant Operator',
      department: item.department || 'Operations',
      phone: item.phone || '',
      email: item.email || '',
      licenseClass: item.licenseClass || '',
      licenseNumber: item.licenseNumber || '',
      hrwlExpiry: item.hrwlExpiry || '',
      hrwlStatus: item.hrwlStatus || 'Active'
    }));
  }
}

function renderBulkImportPreview() {
  const thead = document.getElementById('bulk-preview-thead');
  const tbody = document.getElementById('bulk-preview-tbody');
  if (!thead || !tbody) return;

  const target = currentBulkImportTarget;
  const sample = parsedBulkImportData.slice(0, 5);

  if (target === 'fleet') {
    thead.innerHTML = `
      <tr>
        <th style="padding:4px 8px;">ID</th>
        <th style="padding:4px 8px;">Class</th>
        <th style="padding:4px 8px;">Description</th>
        <th style="padding:4px 8px;">Operator</th>
        <th style="padding:4px 8px;">Color</th>
      </tr>
    `;
    tbody.innerHTML = sample.map(a => `
      <tr>
        <td style="padding:4px 8px;font-family:monospace;font-weight:700;">${escapeHtml(a.id)}</td>
        <td style="padding:4px 8px;">${escapeHtml(a.class)}</td>
        <td style="padding:4px 8px;">${escapeHtml(a.description)}</td>
        <td style="padding:4px 8px;">${escapeHtml(a.workerName)}</td>
        <td style="padding:4px 8px;"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${a.color};vertical-align:middle;margin-right:4px;"></span>${escapeHtml(a.color)}</td>
      </tr>
    `).join('') + (parsedBulkImportData.length > 5 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:4px;">+ ${parsedBulkImportData.length - 5} more records...</td></tr>` : '');
  } else {
    thead.innerHTML = `
      <tr>
        <th style="padding:4px 8px;">ID</th>
        <th style="padding:4px 8px;">Name</th>
        <th style="padding:4px 8px;">Role</th>
        <th style="padding:4px 8px;">Department</th>
        <th style="padding:4px 8px;">HRWL Expiry</th>
      </tr>
    `;
    tbody.innerHTML = sample.map(w => `
      <tr>
        <td style="padding:4px 8px;font-family:monospace;font-weight:700;">${escapeHtml(w.id)}</td>
        <td style="padding:4px 8px;font-weight:600;">${escapeHtml(w.name)}</td>
        <td style="padding:4px 8px;">${escapeHtml(w.role)}</td>
        <td style="padding:4px 8px;">${escapeHtml(w.department)}</td>
        <td style="padding:4px 8px;">${escapeHtml(w.hrwlExpiry || 'N/A')}</td>
      </tr>
    `).join('') + (parsedBulkImportData.length > 5 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:4px;">+ ${parsedBulkImportData.length - 5} more records...</td></tr>` : '');
  }
}

function executeBulkImport() {
  if (parsedBulkImportData.length === 0) return;

  const target = currentBulkImportTarget;
  const mode = document.getElementById('bulk-import-mode')?.value || 'merge';

  if (!window.ionConfig) window.ionConfig = {};

  if (target === 'fleet') {
    if (!Array.isArray(window.ionConfig.fleetRegistry)) window.ionConfig.fleetRegistry = [];

    if (mode === 'replace') {
      window.ionConfig.fleetRegistry = [...parsedBulkImportData];
    } else if (mode === 'append') {
      window.ionConfig.fleetRegistry.push(...parsedBulkImportData);
    } else {
      // merge / update existing by id, append new
      parsedBulkImportData.forEach(imported => {
        const existingIdx = window.ionConfig.fleetRegistry.findIndex(a => a.id === imported.id);
        if (existingIdx >= 0) {
          window.ionConfig.fleetRegistry[existingIdx] = Object.assign(window.ionConfig.fleetRegistry[existingIdx], imported);
        } else {
          window.ionConfig.fleetRegistry.push(imported);
        }
      });
    }

    try {
      localStorage.setItem('ion_fleet_registry', JSON.stringify(window.ionConfig.fleetRegistry));
    } catch(e) {
      console.warn('Could not persist fleet registry to localStorage:', e);
    }

    if (typeof syncSchedulerLanes === 'function') syncSchedulerLanes();
    renderAdminFleetTable();
    renderSchedulerFilterDropdowns();

    showToast(`Bulk imported ${parsedBulkImportData.length} fleet assets successfully (${mode} mode).`, 'success', 'Import Completed');
  } else {
    if (!Array.isArray(window.ionConfig.workerRegistry)) window.ionConfig.workerRegistry = [];

    if (mode === 'replace') {
      window.ionConfig.workerRegistry = [...parsedBulkImportData];
    } else if (mode === 'append') {
      window.ionConfig.workerRegistry.push(...parsedBulkImportData);
    } else {
      // merge / update existing by id, append new
      parsedBulkImportData.forEach(imported => {
        const existingIdx = window.ionConfig.workerRegistry.findIndex(w => w.id === imported.id);
        if (existingIdx >= 0) {
          window.ionConfig.workerRegistry[existingIdx] = Object.assign(window.ionConfig.workerRegistry[existingIdx], imported);
        } else {
          window.ionConfig.workerRegistry.push(imported);
        }
      });
    }

    try {
      localStorage.setItem('ion_worker_registry', JSON.stringify(window.ionConfig.workerRegistry));
    } catch(e) {
      console.warn('Could not persist worker registry to localStorage:', e);
    }

    renderAdminPersonnelTable();
    renderAdminRolesTable();

    if (typeof renderWorkerView === 'function') {
      try { renderWorkerView(); } catch(e) {}
    }

    showToast(`Bulk imported ${parsedBulkImportData.length} personnel records successfully (${mode} mode).`, 'success', 'Import Completed');
  }

  closeBulkImportAdminModal();
}
window.executeBulkImport = executeBulkImport;

function downloadSampleTemplate(type) {
  if (type === 'fleet-csv') {
    const csv = 'Asset ID,Class/Category,Description/Label,Assigned Operator,Status,Color/Hex\r\n' +
      'M-01,Frannas,MAC-25 Mobile Franna Crane,Dave S.,Active,#2563eb\r\n' +
      'TRK-09,Transport,Volvo FH16 Prime Mover,Sarah Connor,Active,#059669\r\n' +
      'GEN-03,Power,Cummins 100kVA Whisper Generator,Unassigned (Pool),Active,#d97706';
    downloadCSVFile(csv, 'sample_fleet_template.csv');
  } else if (type === 'personnel-csv') {
    const csv = 'Personnel ID,Full Name,Role Title,Department,Phone,Email,License Class,License Number,HRWL Expiry,HRWL Status\r\n' +
      'WKR-012,John Doe,Crane Operator,Operations,0412 345 678,john.d@ionsolutions.com.au,CN CO,HRWL-99214,2028-11-20,Active\r\n' +
      'WKR-013,Emily Vance,Dispatcher / Allocator,Administration,0433 987 654,emily.v@ionsolutions.com.au,,,Exempt,Exempt\r\n' +
      'WKR-014,Marcus Webb,Heavy Transport Driver,Transport,0421 112 233,marcus.w@ionsolutions.com.au,MC HR,HRWL-88312,2027-06-15,Active';
    downloadCSVFile(csv, 'sample_personnel_template.csv');
  } else if (type === 'json') {
    const data = currentBulkImportTarget === 'fleet' ? {
      fleet: [
        { id: 'M-05', class: 'Frannas', description: 'TIDD PC28-2 Pick & Carry', workerName: 'Alex Mercer', status: 'Active', color: '#7c3aed' },
        { id: 'CR-08', class: 'All Terrain', description: 'Liebherr LTM 1120-4.1', workerName: 'Jack Reacher', status: 'Active', color: '#db2777' }
      ]
    } : {
      personnel: [
        { id: 'WKR-020', name: 'Liam Neeson', role: 'Plant Operator', department: 'Operations', phone: '0488 123 456', email: 'liam@ionsolutions.com.au', licenseClass: 'CN DG', licenseNumber: 'HRWL-77112', hrwlExpiry: '2028-09-12', hrwlStatus: 'Active' },
        { id: 'WKR-021', name: 'Chloe Decker', role: 'Executive Assistant', department: 'Administration', phone: '0411 999 888', email: 'chloe@ionsolutions.com.au', hrwlStatus: 'Exempt' }
      ]
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sample_${currentBulkImportTarget}_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
window.downloadSampleTemplate = downloadSampleTemplate;

/* ── High-Contrast Dark Mode & User Profile System ─────────────────────── */
let currentThemeMode = 'light';

function initThemeEngine() {
  let saved = null;
  try {
    saved = localStorage.getItem('ion_theme_mode');
  } catch(e) {}

  if (!saved) {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      saved = 'dark';
    } else {
      saved = 'light';
    }
  }

  applyTheme(saved, false);

  // Close profile dropdown on outside click
  if (!window._profileDropdownListenerAttached) {
    window._profileDropdownListenerAttached = true;
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-profile-dropdown');
      const trigger = document.getElementById('user-profile-btn');
      if (dropdown && (dropdown.classList.contains('open') || dropdown.style.display === 'block')) {
        if (!dropdown.contains(e.target) && !trigger?.contains(e.target)) {
          closeUserProfileDropdown();
        }
      }
    });
  }
}
window.initThemeEngine = initThemeEngine;

function applyTheme(theme, showNotice = false) {
  currentThemeMode = theme;
  const isDark = theme === 'dark';

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('dark-mode');
  }

  try {
    localStorage.setItem('ion_theme_mode', theme);
  } catch(e) {}

  // Update header theme icon if present
  const headerThemeIcon = document.getElementById('header-theme-icon');
  if (headerThemeIcon) {
    headerThemeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
  }

  // Update drawer theme switch & description
  const drawerSwitch = document.getElementById('drawer-dark-mode-toggle');
  if (drawerSwitch) {
    drawerSwitch.checked = isDark;
  }
  const drawerIcon = document.getElementById('drawer-theme-icon');
  if (drawerIcon) {
    drawerIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
  }
  const drawerDesc = document.getElementById('drawer-theme-desc');
  if (drawerDesc) {
    drawerDesc.textContent = isDark ? 'ion brand purple & flat dark palette active' : 'Clean high-contrast light palette active';
  }

  // Update popover switch if present
  const popoverSwitch = document.getElementById('profile-dark-mode-toggle');
  if (popoverSwitch) {
    popoverSwitch.checked = isDark;
  }
  const popoverIcon = document.getElementById('popover-theme-icon');
  if (popoverIcon) {
    popoverIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
  }
  const popoverSubtitle = document.getElementById('popover-theme-subtitle');
  if (popoverSubtitle) {
    popoverSubtitle.textContent = isDark ? 'ion flat dark palette active' : 'Standard light palette active';
  }

  if (showNotice) {
    showToast(`Switched interface appearance to ${isDark ? 'Dark (ion Flat Dark)' : 'Standard Light'} theme.`, 'info', 'Theme Updated');
  }
}
window.applyTheme = applyTheme;

function toggleDarkMode() {
  const next = currentThemeMode === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
}
window.toggleDarkMode = toggleDarkMode;

/* ── User Profile Slide-Out Drawer Controls ────────────────────────────── */
function openUserProfileDrawer() {
  closeUserProfileDropdown();
  const drawer = document.getElementById('user-profile-drawer');
  const backdrop = document.getElementById('user-profile-drawer-backdrop');
  if (!drawer || !backdrop) return;

  // Sync current theme state into drawer switch
  const isDark = currentThemeMode === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
  const drawerSwitch = document.getElementById('drawer-dark-mode-toggle');
  if (drawerSwitch) drawerSwitch.checked = isDark;
  const drawerIcon = document.getElementById('drawer-theme-icon');
  if (drawerIcon) drawerIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
  const drawerDesc = document.getElementById('drawer-theme-desc');
  if (drawerDesc) drawerDesc.textContent = isDark ? 'ion brand purple & flat dark palette active' : 'Clean high-contrast light palette active';

  backdrop.classList.add('is-open');
  drawer.classList.add('is-open');
}
window.openUserProfileDrawer = openUserProfileDrawer;

function closeUserProfileDrawer() {
  const drawer = document.getElementById('user-profile-drawer');
  const backdrop = document.getElementById('user-profile-drawer-backdrop');
  if (drawer) drawer.classList.remove('is-open');
  if (backdrop) backdrop.classList.remove('is-open');
}
window.closeUserProfileDrawer = closeUserProfileDrawer;

/* ── Change Password Modal Controls ────────────────────────────────────── */
function openChangePasswordModal() {
  // Immediately slide the drawer closed (translateX(100%)) as the modal opens
  closeUserProfileDrawer();

  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  const form = document.getElementById('change-password-form');
  if (form) form.reset();
  const err = document.getElementById('change-pwd-error');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  modal.style.display = 'flex';
  const curInput = document.getElementById('pwd-current');
  if (curInput) setTimeout(() => curInput.focus(), 120);
}
window.openChangePasswordModal = openChangePasswordModal;

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.style.display = 'none';
  const form = document.getElementById('change-password-form');
  if (form) form.reset();
  const err = document.getElementById('change-pwd-error');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
}
window.closeChangePasswordModal = closeChangePasswordModal;

function saveNewPassword(event) {
  if (event) event.preventDefault();
  const current = document.getElementById('pwd-current')?.value || '';
  const newPwd = document.getElementById('pwd-new')?.value || '';
  const confirmPwd = document.getElementById('pwd-confirm')?.value || '';
  const err = document.getElementById('change-pwd-error');

  if (!current) {
    if (err) {
      err.textContent = 'Please enter your current password.';
      err.style.display = 'block';
    }
    return;
  }

  if (newPwd.length < 6) {
    if (err) {
      err.textContent = 'New password must be at least 6 characters long.';
      err.style.display = 'block';
    }
    return;
  }

  if (newPwd !== confirmPwd) {
    if (err) {
      err.textContent = 'New password and confirmation do not match.';
      err.style.display = 'block';
    }
    return;
  }

  closeChangePasswordModal();
  showToast('Your account password has been successfully updated.', 'success', 'Password Changed');
}
window.saveNewPassword = saveNewPassword;

// Global Escape Key Listener for Drawer and Modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const pwdModal = document.getElementById('change-password-modal');
    if (pwdModal && pwdModal.style.display !== 'none') {
      closeChangePasswordModal();
      return;
    }
    const profileDrawer = document.getElementById('user-profile-drawer');
    if (profileDrawer && profileDrawer.classList.contains('is-open')) {
      closeUserProfileDrawer();
      return;
    }
    closeUserProfileDropdown();
  }
});

function toggleUserProfileDropdown(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById('user-profile-dropdown');
  const btn = document.getElementById('user-profile-btn');
  const caret = document.getElementById('user-profile-caret');
  if (!dropdown) return;

  const isOpen = dropdown.classList.contains('open') || dropdown.style.display === 'block';
  if (isOpen) {
    closeUserProfileDropdown();
  } else {
    dropdown.style.display = 'block';
    dropdown.classList.add('open');
    if (btn) btn.classList.add('active');
    if (caret) caret.textContent = 'expand_less';
  }
}
window.toggleUserProfileDropdown = toggleUserProfileDropdown;

function closeUserProfileDropdown() {
  const dropdown = document.getElementById('user-profile-dropdown');
  const btn = document.getElementById('user-profile-btn');
  const caret = document.getElementById('user-profile-caret');
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.classList.remove('open');
  }
  if (btn) btn.classList.remove('active');
  if (caret) caret.textContent = 'expand_more';
}
window.closeUserProfileDropdown = closeUserProfileDropdown;

/* ── Hydrate Global Config from LocalStorage ───────────────────────────── */
function hydrateIonConfigFromStorage() {
  if (!window.ionConfig) window.ionConfig = {};

  try {
    const savedFleet = localStorage.getItem('ion_fleet_registry');
    if (savedFleet) {
      const parsed = JSON.parse(savedFleet);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.ionConfig.fleetRegistry = parsed;
      }
    }
  } catch(e) {}

  try {
    const savedWorkers = localStorage.getItem('ion_worker_registry');
    if (savedWorkers) {
      const parsed = JSON.parse(savedWorkers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.ionConfig.workerRegistry = parsed;
      }
    }
  } catch(e) {}

  try {
    const savedRules = localStorage.getItem('ion_scheduling_rules');
    if (savedRules) {
      const parsed = JSON.parse(savedRules);
      window.ionConfig.schedulingRules = Object.assign(window.ionConfig.schedulingRules || {}, parsed);
    }
  } catch(e) {}
}
window.hydrateIonConfigFromStorage = hydrateIonConfigFromStorage;

function renderSchedulerFilterDropdowns() {
  const assetSelect = document.getElementById('day-filter-asset');
  const fleet = window.ionConfig?.fleetRegistry || [];
  if (assetSelect) {
    const currentVal = assetSelect.value || (typeof selectedAssetFilter !== 'undefined' ? selectedAssetFilter : 'All Assets');
    assetSelect.innerHTML = `
      <option value="All Assets" ${currentVal === 'All Assets' ? 'selected' : ''}>All Assets</option>
      <optgroup label="Categories">
        <option value="Frannas" ${currentVal === 'Frannas' ? 'selected' : ''}>Frannas</option>
        <option value="Crawlers" ${currentVal === 'Crawlers' ? 'selected' : ''}>Crawlers</option>
        <option value="All Terrains" ${currentVal === 'All Terrains' ? 'selected' : ''}>All Terrains</option>
      </optgroup>
      <optgroup label="Fleet Assets">
        ${fleet.map(a => `
          <option value="asset:${a.id}" ${currentVal === 'asset:' + a.id ? 'selected' : ''}>${a.id} — ${a.label || a.description || a.class}</option>
        `).join('')}
      </optgroup>
    `;
  }

  const classFilter = document.getElementById('admin-fleet-class-filter');
  if (classFilter) {
    const uniqueClasses = [...new Set(fleet.map(a => a.class || a.category).filter(Boolean))];
    const curVal = classFilter.value;
    classFilter.innerHTML = '<option value="ALL">All Fleet Classes</option>' +
      uniqueClasses.map(cls => `<option value="${cls}" ${curVal === cls ? 'selected' : ''}>${cls}</option>`).join('');
  }

  if (typeof currentView !== 'undefined' && currentView === 'Day' && typeof renderDayViewScheduler === 'function') {
    renderDayViewScheduler();
  }
}
window.renderSchedulerFilterDropdowns = renderSchedulerFilterDropdowns;

function initAdminModule() {
  initPredefinedRoles();
  syncRoleDropdowns();

  // 1. Tab Navigation click listeners
  const fleetTab = document.getElementById('admin-subtab-fleet');
  const personnelTab = document.getElementById('admin-subtab-personnel');
  const rolesTab = document.getElementById('admin-subtab-roles');
  const schedulingTab = document.getElementById('admin-subtab-scheduling');
  const gotoRolesBtn = document.getElementById('admin-goto-roles-btn');

  if (fleetTab && !fleetTab._hasNavListener) {
    fleetTab._hasNavListener = true;
    fleetTab.addEventListener('click', () => switchAdminSubTab('fleet'));
  }
  if (personnelTab && !personnelTab._hasNavListener) {
    personnelTab._hasNavListener = true;
    personnelTab.addEventListener('click', () => switchAdminSubTab('personnel'));
  }
  if (rolesTab && !rolesTab._hasNavListener) {
    rolesTab._hasNavListener = true;
    rolesTab.addEventListener('click', () => switchAdminSubTab('roles'));
  }
  if (gotoRolesBtn && !gotoRolesBtn._hasNavListener) {
    gotoRolesBtn._hasNavListener = true;
    gotoRolesBtn.addEventListener('click', () => switchAdminSubTab('roles'));
  }
  if (schedulingTab && !schedulingTab._hasNavListener) {
    schedulingTab._hasNavListener = true;
    schedulingTab.addEventListener('click', () => switchAdminSubTab('scheduling'));
  }

  // 2. Search Fleet keyup & filter listeners
  const fleetSearchInput = document.getElementById('admin-fleet-search');
  if (fleetSearchInput && !fleetSearchInput._hasSearchListener) {
    fleetSearchInput._hasSearchListener = true;
    fleetSearchInput.addEventListener('input', renderAdminFleetTable);
  }
  const fleetClassFilter = document.getElementById('admin-fleet-class-filter');
  if (fleetClassFilter && !fleetClassFilter._hasChangeListener) {
    fleetClassFilter._hasChangeListener = true;
    fleetClassFilter.addEventListener('change', renderAdminFleetTable);
  }
  const fleetStatusFilter = document.getElementById('admin-fleet-status-filter');
  if (fleetStatusFilter && !fleetStatusFilter._hasChangeListener) {
    fleetStatusFilter._hasChangeListener = true;
    fleetStatusFilter.addEventListener('change', renderAdminFleetTable);
  }

  // 3. Search Personnel keyup & filter listeners
  const workerSearchInput = document.getElementById('admin-workers-search');
  if (workerSearchInput && !workerSearchInput._hasSearchListener) {
    workerSearchInput._hasSearchListener = true;
    workerSearchInput.addEventListener('input', renderAdminPersonnelTable);
  }
  const workerStatusFilter = document.getElementById('admin-workers-status-filter');
  if (workerStatusFilter && !workerStatusFilter._hasChangeListener) {
    workerStatusFilter._hasChangeListener = true;
    workerStatusFilter.addEventListener('change', renderAdminPersonnelTable);
  }
  const workerRoleFilter = document.getElementById('admin-workers-role-filter');
  if (workerRoleFilter && !workerRoleFilter._hasChangeListener) {
    workerRoleFilter._hasChangeListener = true;
    workerRoleFilter.addEventListener('change', renderAdminPersonnelTable);
  }

  // 4. Predefined Roles search and department filter listeners
  const rolesSearchInput = document.getElementById('admin-roles-search');
  if (rolesSearchInput && !rolesSearchInput._hasSearchListener) {
    rolesSearchInput._hasSearchListener = true;
    rolesSearchInput.addEventListener('input', renderAdminRolesTable);
  }
  const rolesDeptFilter = document.getElementById('admin-roles-dept-filter');
  if (rolesDeptFilter && !rolesDeptFilter._hasChangeListener) {
    rolesDeptFilter._hasChangeListener = true;
    rolesDeptFilter.addEventListener('change', renderAdminRolesTable);
  }

  // 5. Add Asset Button click listener
  const addAssetBtn = document.getElementById('admin-add-asset-btn');
  if (addAssetBtn && !addAssetBtn._hasAddListener) {
    addAssetBtn._hasAddListener = true;
    addAssetBtn.addEventListener('click', openAddAssetAdminModal);
  }

  // 6. Add Personnel Button click listener
  const addWorkerBtn = document.getElementById('admin-add-worker-btn');
  if (addWorkerBtn && !addWorkerBtn._hasAddListener) {
    addWorkerBtn._hasAddListener = true;
    addWorkerBtn.addEventListener('click', openAddPersonnelAdminModal);
  }

  // 7. Scheduling Rules save button state listener
  const schedSaveBtn = document.querySelector('#admin-view-scheduling button.btn-primary');
  if (schedSaveBtn && !schedSaveBtn._hasSaveStateListener) {
    schedSaveBtn._hasSaveStateListener = true;
    schedSaveBtn.addEventListener('click', function() {
      if (this.dataset.saving === 'true') return;
      this.dataset.saving = 'true';
      const originalContent = this.innerHTML;
      this.textContent = 'Saved!';
      setTimeout(() => {
        this.innerHTML = originalContent;
        delete this.dataset.saving;
      }, 2000);
    });
  }

  // 8. Hydrate from storage, auto-save rules, and bulk import dropzone
  hydrateIonConfigFromStorage();
  loadAdminSchedulingRules();
  initSchedulingRulesAutoSave();
  setupBulkImportDropzone();
  initThemeEngine();
}
window.initAdminModule = initAdminModule;

/* ==========================================================================
   SYSTEM SETTINGS: IT INTEGRATIONS (EDMS, ERP, LOCALISATION)
   Vendor-Agnostic Architecture
   ========================================================================== */
function initSettingsSaveButtons() {
  const settingsView = document.getElementById('settings-view');
  if (!settingsView) return;

  const buttons = settingsView.querySelectorAll('button');
  buttons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('save') || btn.classList.contains('settings-save-btn')) {
      if (btn._hasSaveStateListener) return;
      btn._hasSaveStateListener = true;

      btn.addEventListener('click', function() {
        if (this.dataset.saving === 'true') return;
        this.dataset.saving = 'true';
        const originalContent = this.innerHTML;
        this.textContent = 'Saved!';
        setTimeout(() => {
          this.innerHTML = originalContent;
          delete this.dataset.saving;
        }, 2000);
      });
    }
  });
}
window.initSettingsSaveButtons = initSettingsSaveButtons;

function renderSystemSettingsView() {
  const it = window.ionConfig?.integrations || {};

  const dwEnd = document.getElementById('it-dw-endpoint');
  const dwOrg = document.getElementById('it-dw-org');
  const dwBadge = document.getElementById('it-dw-badge');
  if (dwEnd && (it.edmsEndpoint || it.docuwareEndpoint)) dwEnd.value = it.edmsEndpoint || it.docuwareEndpoint;
  if (dwOrg && (it.edmsOrgId || it.docuwareOrgId)) dwOrg.value = it.edmsOrgId || it.docuwareOrgId;
  if (dwBadge && (it.edmsStatus || it.docuwareStatus)) {
    dwBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> ${it.edmsStatus || it.docuwareStatus}`;
  }

  const xeroSec = document.getElementById('it-xero-secret');
  const xeroTen = document.getElementById('it-xero-tenant');
  const xeroBadge = document.getElementById('it-xero-badge');
  if (xeroTen && (it.erpTenant || it.xeroTenant)) xeroTen.value = it.erpTenant || it.xeroTenant;
  if (xeroBadge && (it.erpStatus || it.xeroStatus)) {
    xeroBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">sync</span> ${it.erpStatus || it.xeroStatus}`;
  }

  const locBadge = document.getElementById('it-loc-badge');
  if (locBadge && it.localisation) {
    locBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">public</span> Configured`;
  }

  initSettingsSaveButtons();
}
window.renderSystemSettingsView = renderSystemSettingsView;

function saveEdmsSettings() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.integrations) window.ionConfig.integrations = {};

  const endEl = document.getElementById('it-dw-endpoint');
  const orgEl = document.getElementById('it-dw-org');
  const badgeEl = document.getElementById('it-dw-badge');

  if (endEl) window.ionConfig.integrations.edmsEndpoint = endEl.value;
  if (orgEl) window.ionConfig.integrations.edmsOrgId = orgEl.value;
  window.ionConfig.integrations.edmsStatus = 'Connected';

  if (badgeEl) {
    badgeEl.className = 'status-badge connected';
    badgeEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Connected (Repository Online)';
  }

  showToast('EDMS REST API credentials and Repository ID securely updated.', 'success', 'EDMS Connected');
}
window.saveEdmsSettings = saveEdmsSettings;
window.saveDocuWareITSettings = saveEdmsSettings;

function testEdmsHandshake() {
  showToast('Initiating handshake ping to EDMS Platform REST API endpoint...', 'info', 'Connecting...');
  setTimeout(() => {
    showToast('EDMS API Handshake Successful (HTTP 200 OK). Bearer token verified.', 'success', 'Handshake OK');
  }, 600);
}
window.testEdmsHandshake = testEdmsHandshake;
window.testDocuWareHandshake = testEdmsHandshake;

function saveErpSettings() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!window.ionConfig.integrations) window.ionConfig.integrations = {};

  const secEl = document.getElementById('it-xero-secret');
  const tenEl = document.getElementById('it-xero-tenant');
  const badgeEl = document.getElementById('it-xero-badge');

  if (tenEl) window.ionConfig.integrations.erpTenant = tenEl.value;
  window.ionConfig.integrations.erpStatus = 'Active';

  if (badgeEl) {
    badgeEl.className = 'status-badge active';
    badgeEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">sync</span> Active (Inbound Live)';
  }

  showToast('ERP general ledger webhook configuration saved.', 'success', 'ERP Sync Active');
}
window.saveErpSettings = saveErpSettings;
window.saveXeroITSettings = saveErpSettings;

function triggerErpReconciliation() {
  showToast('Dispatching reconciliation sync with ERP General Ledger...', 'info', 'Reconciling...');
  setTimeout(() => {
    showToast('ERP General Ledger Reconciliation Complete. All invoices synchronized.', 'success', 'Sync Successful');
  }, 750);
}
window.triggerErpReconciliation = triggerErpReconciliation;
window.triggerXeroReconciliation = triggerErpReconciliation;

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
window.saveLocalisationSettings = saveLocalisationSettings;

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
  renderAdminFleetTable,
  sortAdminFleetTable,
  renderAdminPersonnelTable,
  sortAdminPersonnelTable,
  loadAdminSchedulingRules,
  saveAdminSchedulingRules,
  switchAdminSubTab,
  renderAdminModule,
  filterAdminFleetTable,
  handleAddAssetPrompt,
  renderSchedulerFilterDropdowns,
  initAdminModule,
  openAddAssetAdminModal,
  openEditAssetAdminModal,
  closeAddAssetAdminModal,
  submitAddAssetAdmin,
  deleteFleetAssetAdmin,
  openAddPersonnelAdminModal,
  openEditPersonnelAdminModal,
  closeAddPersonnelAdminModal,
  submitPersonnelAdmin,
  deletePersonnelAdmin,
  onWorkerDepartmentChange,
  onWorkerRolePresetChange,
  initSettingsSaveButtons,
  renderSystemSettingsView,
  saveEdmsSettings,
  testEdmsHandshake,
  saveErpSettings,
  triggerErpReconciliation,
  saveLocalisationSettings,
  initPredefinedRoles,
  syncRoleDropdowns,
  renderAdminRolesTable,
  submitAddRoleAdmin,
  removePredefinedRole,
  promptDeleteFleetAsset,
  executeDeleteFleetAsset,
  promptDeletePersonnel,
  executeDeletePersonnel,
  closeDeleteConfirmModal,
  exportAdminFleetCSV,
  exportAdminPersonnelCSV,
  openBulkImportAdminModal,
  closeBulkImportAdminModal,
  onBulkImportTargetChange,
  clearBulkImportFile,
  handleBulkImportFileSelected,
  executeBulkImport,
  downloadSampleTemplate,
  initThemeEngine,
  applyTheme,
  toggleDarkMode,
  toggleUserProfileDropdown,
  closeUserProfileDropdown,
  initSchedulingRulesAutoSave,
  hydrateIonConfigFromStorage,
});

function initApp() {
  hydrateIonConfigFromStorage();
  initThemeEngine();

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
  if (typeof initAdminModule === 'function') initAdminModule();
  if (typeof initSettingsSaveButtons === 'function') initSettingsSaveButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

