// Mutable asset registry — source of truth for fleet assets
let assetRegistry=[
  {id:'EX01',description:'Excavator 20T',hex:'#0ea5e9'},
  {id:'EX02',description:'Excavator 35T',hex:'#06b6d4'},
  {id:'SK03',description:'Skid Steer',hex:'#8b5cf6'},
  {id:'DZ04',description:'Dozer D6',hex:'#475569'}, // Neutral Slate — NOT solid red!
  {id:'FL05',description:'Forklift 5T',hex:'#6366f1'},
  {id:'FL06',description:'Forklift 10T',hex:'#2563eb'},
  {id:'SC07',description:'Scissor Lift 12m',hex:'#059669'},
  {id:'BM08',description:'Boom Lift 17m',hex:'#d97706'},
  {id:'CR09',description:'Crawler Crane 50T',hex:'#334155'}, // Neutral Steel!
  {id:'DT10',description:'Dump Truck',hex:'#9333ea'}
];

// Authoritative Compliance & Safety Registry
let complianceRegistry={
  EX01:{rego:'REG-8829-EX',certDate:'2026-11-15',status:'valid',risk:'Low'},
  EX02:{rego:'REG-4410-EX',certDate:'2026-08-16',status:'warning',risk:'Medium'}, // Service Due (30d)
  SK03:{rego:'REG-1204-SK',certDate:'2026-12-01',status:'valid',risk:'Low'},
  DZ04:{rego:'REG-9912-DZ',certDate:'2027-01-20',status:'valid',risk:'Low'},
  FL05:{rego:'REG-3319-FL',certDate:'2026-09-10',status:'valid',risk:'Low'},
  FL06:{rego:'REG-5521-FL',certDate:'2026-10-04',status:'valid',risk:'Low'},
  SC07:{rego:'REG-7714-SC',certDate:'2026-08-28',status:'warning',risk:'Medium'}, // Service Due (30d)
  BM08:{rego:'REG-8840-BM',certDate:'2026-11-30',status:'valid',risk:'Low'},
  CR09:{rego:'REG-0012-CR',certDate:'2026-07-30',status:'expired',risk:'HIGH'}, // CERT EXPIRED! HARD INTERLOCK!
  DT10:{rego:'REG-6632-DT',certDate:'2026-12-15',status:'valid',risk:'Low'}
};

// Derived — rebuilt by syncAssets()
let ASSET_HEX={
  Urgent:'#ef4444',   // Semantic Red ONLY for Urgent Safety Alerts
  Invoiced:'#10b981', // Semantic Emerald for Invoiced & Complete
  Scheduled:'#3b82f6',// Semantic Blue for Scheduled
  Other:'#64748b'
};
let validAssets=[];
const HOURLY_RATES={EX:250,SK:180,DZ:280,FL:150,SC:120,BM:180,CR:350,DT:200};

function d(h,m){const n=new Date();n.setHours(h,m||0,0,0);return n.toISOString();}
function dOffset(days,h,m){const n=new Date();n.setDate(n.getDate()+days);n.setHours(h,m||0,0,0);return n.toISOString();}

let bookings=[
  {id:'b1',assetNumber:'EX01',type:'Fleet',clientName:'BuildCorp Inc.',jobDescription:'Foundation excavation — Stage 1',operatorName:'John Smith',startTime:d(7,0),endTime:d(13,0),status:'Scheduled'},
  {id:'b2',assetNumber:'EX02',type:'Fleet',clientName:'Civil Works Pty Ltd',jobDescription:'Bulk earthworks — cut to fill',operatorName:'Mark Johnson',startTime:d(7,30),endTime:d(15,0),status:'Scheduled'},
  {id:'b3',assetNumber:'EX02',type:'Fleet',clientName:'Metro Rail Authority',jobDescription:'Drainage trench excavation',operatorName:'Mark Johnson',startTime:d(15,30),endTime:d(17,30),status:'Invoiced'},
  {id:'b4',assetNumber:'SK03',type:'Fleet',clientName:'Apex Constructions',jobDescription:'Backfill compaction — basement slab',operatorName:'Sam Davies',startTime:d(8,0),endTime:d(12,0),status:'Scheduled'},
  {id:'b5',assetNumber:'DZ04',type:'Fleet',clientName:'City Infrastructure',jobDescription:'Site clearing — greenfield stage',operatorName:'Dave Wilson',startTime:d(6,0),endTime:d(14,0),status:'Urgent'},
  {id:'b6',assetNumber:'FL05',type:'Fleet',clientName:'Warehouse Direct',jobDescription:'Pallet racking install — Bay C',operatorName:'Alex Morgan',startTime:d(9,0),endTime:d(13,0),status:'Scheduled'},
  {id:'b7',assetNumber:'FL06',type:'Fleet',clientName:'National Logistics',jobDescription:'Heavy machinery unloading',operatorName:'Chris Evans',startTime:d(10,0),endTime:d(14,30),status:'Scheduled'},
  {id:'b8',assetNumber:'SC07',type:'Fleet',clientName:'Urban Developers QLD',jobDescription:'Facade maintenance — Level 4',operatorName:'Tom Reed',startTime:d(8,0),endTime:d(16,0),status:'Scheduled'},
  {id:'b9',assetNumber:'BM08',type:'Fleet',clientName:'Sunshine Coast Council',jobDescription:'Streetlight installation',operatorName:'Ryan Nash',startTime:dOffset(-1,7,0),endTime:dOffset(-1,15,0),status:'Completed'},
  {id:'b10',assetNumber:'CR09',type:'Fleet',clientName:'Port Authority',jobDescription:'Wharf beam placement',operatorName:'Luke Harris',startTime:dOffset(-1,6,30),endTime:dOffset(-1,16,0),status:'Invoiced'},
  {id:'b11',assetNumber:'EX01',type:'Fleet',clientName:'Lendlease Group',jobDescription:'Retaining wall footings',operatorName:'John Smith',startTime:dOffset(1,7,0),endTime:dOffset(1,13,0),status:'Scheduled'},
  {id:'b12',assetNumber:'DT10',type:'Fleet',clientName:'Fulton Hogan',jobDescription:'Spoil cartage — highway widening',operatorName:'Mike Stone',startTime:dOffset(1,5,30),endTime:dOffset(1,14,0),status:'Scheduled'},
  {id:'b13',assetNumber:'FL06',type:'Fleet',clientName:'Mirvac Group',jobDescription:'Steel module placement — Level 6',operatorName:'Chris Evans',startTime:dOffset(2,8,0),endTime:dOffset(2,13,0),status:'Scheduled'},
  {id:'b14',assetNumber:'BM08',type:'Fleet',clientName:'Multiplex Constructions',jobDescription:'Signage installation — rooftop',operatorName:'Ryan Nash',startTime:dOffset(2,9,0),endTime:dOffset(2,14,0),status:'Urgent'},
  {id:'b15',assetNumber:'CR09',type:'Fleet',clientName:'Queensland Rail',jobDescription:'Bridge girder placement',operatorName:'Luke Harris',startTime:dOffset(3,6,0),endTime:dOffset(3,18,0),status:'Scheduled'},
  {id:'b16',assetNumber:'EX02',type:'Fleet',clientName:'Boral Limited',jobDescription:'Quarry face excavation',operatorName:'Mark Johnson',startTime:dOffset(-2,7,0),endTime:dOffset(-2,15,0),status:'Invoiced'},
  {id:'b17',assetNumber:'DZ04',type:'Fleet',clientName:'Hutchinson Builders',jobDescription:'Sub-grade preparation',operatorName:'Dave Wilson',startTime:dOffset(-2,6,30),endTime:dOffset(-2,14,0),status:'Completed'},
  {id:'b18',assetNumber:'CR09',type:'Fleet',clientName:'Seymour Whyte Constructions',jobDescription:'Precast panel erection — Block B',operatorName:'Luke Harris',startTime:dOffset(-3,7,0),endTime:dOffset(-3,17,0),status:'Invoiced'},
  {id:'b19',assetNumber:'SK03',type:'Fleet',clientName:'BMD Constructions',jobDescription:'Trenching — stormwater main',operatorName:'Sam Davies',startTime:dOffset(-3,8,0),endTime:dOffset(-3,14,0),status:'Completed'},
  {id:'b20',assetNumber:'SC07',type:'Fleet',clientName:'Aria Property Group',jobDescription:'Window replacement — Levels 2–4',operatorName:'Tom Reed',startTime:dOffset(-1,9,0),endTime:dOffset(-1,17,0),status:'Scheduled'},
  {id:'b21',assetNumber:'EX01',type:'Fleet',clientName:'ADCO Constructions',jobDescription:'Rock breaking — basement',operatorName:'John Smith',startTime:dOffset(-1,6,30),endTime:dOffset(-1,13,0),status:'Invoiced'},
  {id:'b22',assetNumber:'DT10',type:'Fleet',clientName:'Downer Group',jobDescription:'Fill cartage — subdivision',operatorName:'Mike Stone',startTime:dOffset(1,6,0),endTime:dOffset(1,14,0),status:'Scheduled'},
  {id:'b23',assetNumber:'CR09',type:'Fleet',clientName:'Fulton Hogan',jobDescription:'Overpass beam launch',operatorName:'Luke Harris',startTime:dOffset(1,7,0),endTime:dOffset(1,16,0),status:'Urgent'},
  {id:'b24',assetNumber:'BM08',type:'Fleet',clientName:'Hansen Yuncken',jobDescription:'Cladding install — south elevation',operatorName:'Ryan Nash',startTime:dOffset(1,14,0),endTime:dOffset(1,18,0),status:'Scheduled'},
  {id:'b25',assetNumber:'FL05',type:'Fleet',clientName:'Laing O\'Rourke',jobDescription:'Warehouse restocking run',operatorName:'Alex Morgan',startTime:dOffset(2,7,0),endTime:dOffset(2,11,0),status:'Scheduled'},
  {id:'b26',assetNumber:'EX02',type:'Fleet',clientName:'Roberts Co',jobDescription:'Footings excavation — Tower C',operatorName:'Mark Johnson',startTime:dOffset(2,6,30),endTime:dOffset(2,13,0),status:'Scheduled'},
  {id:'b27',assetNumber:'SC07',type:'Fleet',clientName:'Watpac Constructions',jobDescription:'External painting — Level 5',operatorName:'Tom Reed',startTime:dOffset(2,8,0),endTime:dOffset(2,16,0),status:'Urgent'},
  {id:'b28',assetNumber:'DZ04',type:'Fleet',clientName:'Acciona Infrastructure',jobDescription:'Road formation — Stage 3',operatorName:'Dave Wilson',startTime:dOffset(3,6,30),endTime:dOffset(3,16,0),status:'Scheduled'},
  {id:'b29',assetNumber:'FL06',type:'Fleet',clientName:'CPB Contractors',jobDescription:'Plant repositioning — depot',operatorName:'Chris Evans',startTime:dOffset(3,9,0),endTime:dOffset(3,14,0),status:'Scheduled'},
  {id:'b30',assetNumber:'EX01',type:'Fleet',clientName:'McConnell Dowell',jobDescription:'Pipeline trench — DN600',operatorName:'John Smith',startTime:dOffset(4,7,0),endTime:dOffset(4,16,0),status:'Scheduled'},
  {id:'b31',assetNumber:'SK03',type:'Fleet',clientName:'John Holland Group',jobDescription:'Backfill operations — platform',operatorName:'Sam Davies',startTime:dOffset(4,8,0),endTime:dOffset(4,15,0),status:'Invoiced'},
  {id:'b32',assetNumber:'BM08',type:'Fleet',clientName:'Probuild',jobDescription:'HVAC installation — rooftop',operatorName:'Ryan Nash',startTime:dOffset(5,7,30),endTime:dOffset(5,14,0),status:'Scheduled'},
  /* ── Week 2 ── */
  {id:'b33',assetNumber:'DZ04',type:'Fleet',clientName:'GHD Group',jobDescription:'Land clearing — industrial estate',operatorName:'Dave Wilson',startTime:dOffset(6,6,0),endTime:dOffset(6,15,0),status:'Scheduled'},
  {id:'b34',assetNumber:'EX02',type:'Fleet',clientName:'Brookfield Multiplex',jobDescription:'Cut and fill — carpark level',operatorName:'Mark Johnson',startTime:dOffset(6,7,30),endTime:dOffset(6,15,0),status:'Scheduled'},
  {id:'b35',assetNumber:'CR09',type:'Fleet',clientName:'Decmil Group',jobDescription:'Modular lift — data centre roof',operatorName:'Luke Harris',startTime:dOffset(7,6,30),endTime:dOffset(7,16,0),status:'Scheduled'},
  {id:'b36',assetNumber:'SC07',type:'Fleet',clientName:'Urban Construct',jobDescription:'Heritage pointing — clock tower',operatorName:'Tom Reed',startTime:dOffset(7,8,0),endTime:dOffset(7,16,0),status:'Scheduled'},
  {id:'b37',assetNumber:'DT10',type:'Fleet',clientName:'Ventia Services',jobDescription:'Spoil removal — 500T',operatorName:'Mike Stone',startTime:dOffset(7,5,30),endTime:dOffset(7,14,0),status:'Scheduled'},
  {id:'b38',assetNumber:'FL06',type:'Fleet',clientName:'Kane Constructions',jobDescription:'Generator set — Level 8 plantroom',operatorName:'Chris Evans',startTime:dOffset(8,8,0),endTime:dOffset(8,14,0),status:'Scheduled'},
  {id:'b39',assetNumber:'BM08',type:'Fleet',clientName:'Pegasus Building Services',jobDescription:'Rooftop solar array install',operatorName:'Ryan Nash',startTime:dOffset(8,7,0),endTime:dOffset(8,13,0),status:'Urgent'},
  {id:'b40',assetNumber:'EX01',type:'Fleet',clientName:'Action Steel Industries',jobDescription:'Hard rock excavation — cell 4',operatorName:'John Smith',startTime:dOffset(9,7,0),endTime:dOffset(9,16,0),status:'Scheduled'},
  {id:'b41',assetNumber:'SK03',type:'Fleet',clientName:'RCR Tomlinson',jobDescription:'Aggregate spreading — access road',operatorName:'Sam Davies',startTime:dOffset(9,6,30),endTime:dOffset(9,14,0),status:'Scheduled'},
  {id:'b42',assetNumber:'FL05',type:'Fleet',clientName:'Sunshine Coast Hospital',jobDescription:'Medical equipment handling',operatorName:'Alex Morgan',startTime:dOffset(10,8,0),endTime:dOffset(10,12,30),status:'Scheduled'},
  {id:'b43',assetNumber:'DZ04',type:'Fleet',clientName:'Golding Contractors',jobDescription:'Topsoil stripping — Stage 4',operatorName:'Dave Wilson',startTime:dOffset(10,7,0),endTime:dOffset(10,16,0),status:'Scheduled'},
  {id:'b44',assetNumber:'CR09',type:'Fleet',clientName:'AECOM Australia',jobDescription:'Bridge deck panel placement',operatorName:'Luke Harris',startTime:dOffset(11,7,0),endTime:dOffset(11,17,0),status:'Scheduled'},
  {id:'b45',assetNumber:'EX02',type:'Fleet',clientName:'Icon Co',jobDescription:'Underpinning excavation',operatorName:'Mark Johnson',startTime:dOffset(11,8,0),endTime:dOffset(11,14,30),status:'Urgent'},
  {id:'b46',assetNumber:'SC07',type:'Fleet',clientName:'Ostwald Bros',jobDescription:'External audit access — conveyor',operatorName:'Tom Reed',startTime:dOffset(12,8,0),endTime:dOffset(12,14,0),status:'Scheduled'},
  /* ── Week 3 ── */
  {id:'b47',assetNumber:'DT10',type:'Fleet',clientName:'Georgiou Group',jobDescription:'Mass haul — cut embankment',operatorName:'Mike Stone',startTime:dOffset(13,5,30),endTime:dOffset(13,14,0),status:'Scheduled'},
  {id:'b48',assetNumber:'EX01',type:'Fleet',clientName:'Abigroup Contractors',jobDescription:'Sewer main excavation — DN375',operatorName:'John Smith',startTime:dOffset(13,7,0),endTime:dOffset(13,15,0),status:'Scheduled'},
  {id:'b49',assetNumber:'SK03',type:'Fleet',clientName:'Calibre Group',jobDescription:'Concrete breaking — old slab',operatorName:'Sam Davies',startTime:dOffset(14,8,0),endTime:dOffset(14,14,0),status:'Scheduled'},
  {id:'b50',assetNumber:'FL06',type:'Fleet',clientName:'SpaceForm',jobDescription:'Preformed panel handling',operatorName:'Chris Evans',startTime:dOffset(14,7,30),endTime:dOffset(14,13,0),status:'Scheduled'},
  {id:'b51',assetNumber:'BM08',type:'Fleet',clientName:'Renew Projects',jobDescription:'Canopy structure install',operatorName:'Ryan Nash',startTime:dOffset(15,8,0),endTime:dOffset(15,14,0),status:'Scheduled'},
  {id:'b52',assetNumber:'CR09',type:'Fleet',clientName:'North Construction',jobDescription:'Portal frame erection',operatorName:'Luke Harris',startTime:dOffset(15,7,0),endTime:dOffset(15,18,0),status:'Scheduled'},
  {id:'b53',assetNumber:'DT10',type:'Fleet',clientName:'Broadspectrum',jobDescription:'Fill import — road base 300T',operatorName:'Mike Stone',startTime:dOffset(15,5,30),endTime:dOffset(15,14,0),status:'Scheduled'},
  {id:'b54',assetNumber:'EX02',type:'Fleet',clientName:'Logan City Council',jobDescription:'Stormwater pit excavation',operatorName:'Mark Johnson',startTime:dOffset(16,8,0),endTime:dOffset(16,14,0),status:'Scheduled'},
  {id:'b55',assetNumber:'EX01',type:'Fleet',clientName:'Mirvac Group',jobDescription:'Tower footings — Stage 2',operatorName:'John Smith',startTime:dOffset(16,7,0),endTime:dOffset(16,16,0),status:'Scheduled'},
  {id:'b56',assetNumber:'CR09',type:'Fleet',clientName:'RPS Group',jobDescription:'Jetty pile driving assist',operatorName:'Luke Harris',startTime:dOffset(17,7,0),endTime:dOffset(17,18,0),status:'Scheduled'},
  {id:'b57',assetNumber:'FL05',type:'Fleet',clientName:'Aria Property Group',jobDescription:'Amenities fitout — Levels 3–5',operatorName:'Alex Morgan',startTime:dOffset(17,9,0),endTime:dOffset(17,14,30),status:'Scheduled'},
  {id:'b58',assetNumber:'DZ04',type:'Fleet',clientName:'CPB Contractors',jobDescription:'Embankment compaction — M1',operatorName:'Dave Wilson',startTime:dOffset(18,6,0),endTime:dOffset(18,15,0),status:'Scheduled'},
  {id:'b59',assetNumber:'SC07',type:'Fleet',clientName:'Buildcorp Group',jobDescription:'External cladding — south face',operatorName:'Tom Reed',startTime:dOffset(19,8,0),endTime:dOffset(19,16,0),status:'Scheduled'},
  /* ── Week 4 ── */
  {id:'b60',assetNumber:'SK03',type:'Fleet',clientName:'Laing O\'Rourke',jobDescription:'Drainage channel formation',operatorName:'Sam Davies',startTime:dOffset(20,7,0),endTime:dOffset(20,15,0),status:'Scheduled'},
  {id:'b61',assetNumber:'CR09',type:'Fleet',clientName:'Fulton Hogan',jobDescription:'Road widening — bridge beam',operatorName:'Luke Harris',startTime:dOffset(20,6,30),endTime:dOffset(20,15,0),status:'Scheduled'},
  {id:'b62',assetNumber:'FL06',type:'Fleet',clientName:'Downer Group',jobDescription:'Transformer set — switchroom',operatorName:'Chris Evans',startTime:dOffset(21,8,0),endTime:dOffset(21,14,0),status:'Scheduled'},
  {id:'b63',assetNumber:'DT10',type:'Fleet',clientName:'Acciona Infrastructure',jobDescription:'Mass haul — TBM spoil',operatorName:'Mike Stone',startTime:dOffset(21,5,0),endTime:dOffset(21,16,0),status:'Scheduled'},
  {id:'b64',assetNumber:'EX01',type:'Fleet',clientName:'Watpac Constructions',jobDescription:'Pile cap excavation — Grid C',operatorName:'John Smith',startTime:dOffset(22,7,30),endTime:dOffset(22,15,0),status:'Scheduled'},
  {id:'b65',assetNumber:'BM08',type:'Fleet',clientName:'Hutchinson Builders',jobDescription:'Signage and awning install',operatorName:'Ryan Nash',startTime:dOffset(22,8,0),endTime:dOffset(22,14,0),status:'Scheduled'},
  {id:'b66',assetNumber:'SC07',type:'Fleet',clientName:'Charter Hall',jobDescription:'Retail facade — glazing unit',operatorName:'Tom Reed',startTime:dOffset(23,8,0),endTime:dOffset(23,14,0),status:'Scheduled'},
  {id:'b67',assetNumber:'EX02',type:'Fleet',clientName:'John Holland Group',jobDescription:'Station box excavation',operatorName:'Mark Johnson',startTime:dOffset(23,6,30),endTime:dOffset(23,17,0),status:'Scheduled'},
  {id:'b68',assetNumber:'DT10',type:'Fleet',clientName:'McConnell Dowell',jobDescription:'Pump station spoil removal',operatorName:'Mike Stone',startTime:dOffset(24,6,0),endTime:dOffset(24,14,0),status:'Scheduled'},
  {id:'b69',assetNumber:'CR09',type:'Fleet',clientName:'Lendlease Group',jobDescription:'Tower crane base pour assist',operatorName:'Luke Harris',startTime:dOffset(24,7,0),endTime:dOffset(24,16,0),status:'Scheduled'},
  {id:'b70',assetNumber:'DZ04',type:'Fleet',clientName:'GHD Group',jobDescription:'Final trim — sports field',operatorName:'Dave Wilson',startTime:dOffset(25,7,0),endTime:dOffset(25,15,0),status:'Scheduled'},
  {id:'b71',assetNumber:'FL05',type:'Fleet',clientName:'Probuild',jobDescription:'Data centre equipment handling',operatorName:'Alex Morgan',startTime:dOffset(25,9,0),endTime:dOffset(25,14,0),status:'Scheduled'},
  /* ── End of month ── */
  {id:'b72',assetNumber:'SK03',type:'Fleet',clientName:'CIMIC Group',jobDescription:'LNG berm compaction',operatorName:'Sam Davies',startTime:dOffset(27,7,0),endTime:dOffset(27,16,0),status:'Scheduled'},
  {id:'b73',assetNumber:'CR09',type:'Fleet',clientName:'Seymour Whyte Constructions',jobDescription:'Pedestrian bridge span launch',operatorName:'Luke Harris',startTime:dOffset(27,6,30),endTime:dOffset(27,16,0),status:'Scheduled'},
  {id:'b74',assetNumber:'EX01',type:'Fleet',clientName:'Hansen Yuncken',jobDescription:'Convention centre footings',operatorName:'John Smith',startTime:dOffset(28,7,0),endTime:dOffset(28,16,0),status:'Scheduled'},
  {id:'b75',assetNumber:'DZ04',type:'Fleet',clientName:'BMD Constructions',jobDescription:'Motorway interchange formation',operatorName:'Dave Wilson',startTime:dOffset(28,6,0),endTime:dOffset(28,17,0),status:'Scheduled'},
  {id:'b76',assetNumber:'BM08',type:'Fleet',clientName:'Metro Rail Authority',jobDescription:'Station canopy panel access',operatorName:'Ryan Nash',startTime:dOffset(29,8,0),endTime:dOffset(29,16,0),status:'Scheduled'},
  {id:'b77',assetNumber:'FL06',type:'Fleet',clientName:'Roberts Co',jobDescription:'High-bay racking install',operatorName:'Chris Evans',startTime:dOffset(29,7,0),endTime:dOffset(29,14,0),status:'Scheduled'},
  {id:'b78',assetNumber:'SC07',type:'Fleet',clientName:'Ventia Services',jobDescription:'Cooling tower maintenance access',operatorName:'Tom Reed',startTime:dOffset(30,8,0),endTime:dOffset(30,15,0),status:'Scheduled'},
  {id:'b79',assetNumber:'EX02',type:'Fleet',clientName:'ADCO Constructions',jobDescription:'Final bulk excavation — Building D',operatorName:'Mark Johnson',startTime:dOffset(30,7,0),endTime:dOffset(30,16,0),status:'Scheduled'},
  {id:'b80',assetNumber:'DT10',type:'Fleet',clientName:'Broadspectrum',jobDescription:'End-of-month fleet repositioning',operatorName:'Mike Stone',startTime:dOffset(31,6,0),endTime:dOffset(31,14,0),status:'Scheduled'}
];

let currentDate=new Date();
let currentView='Day';
let currentMinHour=6;
let displayHoursStart=7;   // default 7 AM
let displayHoursEnd=19;    // default 7 PM
let activeAssetFilters=new Set();
let isDragging=false;
let dragBookingId=null;
let dragClone=null;
let dragOffsetY=0;
let isPainting=false;
let paintStartHour=null;
let paintAsset=null;
let paintEl=null;
let paintCol=null;
let utilizationChartInst=null;
let statusChartInst=null;
let liveTimeTimer=null;  // single cancellable timer
let dragGhost=null;      // ghost placeholder shown in the grid during drag
let dayTransposed=false;  // Day view: false=Time View, true=Asset View
let weekTransposed=false; // Week views: false=Asset View (Gantt), true=Time View (vertical)

function switchTab(tab){
  document.querySelectorAll('.view-container').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(tab+'-view').classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  if(tab==='analytics')renderAnalytics();
  if(tab==='settings')renderAssetManager();
}

function getBookingColor(b){
  if(b.status==='Urgent')return ASSET_HEX.Urgent;
  if(b.status==='Invoiced')return ASSET_HEX.Invoiced;
  return ASSET_HEX[b.assetNumber]||ASSET_HEX.Other;
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
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===view));
  const filterBar=document.getElementById('asset-filter-bar');
  filterBar.style.display=(view==='Day')?'none':'flex';
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

function addAsset(){
  const id=(document.getElementById('new-asset-id').value||'').trim().toUpperCase();
  const desc=(document.getElementById('new-asset-desc').value||'').trim();
  const hex=document.getElementById('new-asset-hex-color').value||'#888888';
  if(!id){alert('Asset ID is required.');return;}
  if(assetRegistry.find(a=>a.id===id)){alert(`Asset ${id} already exists.`);return;}
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
function openModal(asset,startH,endH,dateStr){
  document.getElementById('booking-id').value='';
  document.getElementById('modal-title').textContent='New Quick Book';
  document.getElementById('booking-asset').value=asset||'EX01';
  document.getElementById('booking-status').value='Scheduled';
  document.getElementById('booking-client').value='';
  document.getElementById('booking-operator').value='';
  document.getElementById('booking-desc').value='';
  // Resolve date: explicit dateStr > currentDate
  const refDate=dateStr?new Date(dateStr):new Date(currentDate);
  document.getElementById('booking-date').value=refDate.toISOString().slice(0,10);
  document.getElementById('booking-start').value=startH||'08:00';
  document.getElementById('booking-end').value=endH||'09:00';
  document.getElementById('delete-btn').style.display='none';
  document.getElementById('booking-modal').classList.add('open');
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
  document.getElementById('booking-modal').classList.add('open');
}

function closeModal(){document.getElementById('booking-modal').classList.remove('open');}

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
  if(new Date(endISO)<=new Date(startISO)){alert('End time must be after start time.');return;}
  if(hasOverlap(asset,startISO,endISO,id||null)){alert(`Asset ${asset} is already booked during this time.`);return;}
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
  alert('DocuWare settings saved successfully.');
}

function saveWorkHours(){
  const startVal=Number(document.getElementById('settings-work-start').value);
  const endVal=Number(document.getElementById('settings-work-end').value);
  if(endVal<=startVal){alert('End time must be after start time.');return;}
  displayHoursStart=startVal;
  displayHoursEnd=endVal;
  // Sync the calendar toolbar selects
  const startSel=document.getElementById('display-start-hour');
  const endSel=document.getElementById('display-end-hour');
  if(startSel)startSel.value=String(startVal);
  if(endSel)endSel.value=String(endVal);
  renderCalendar();
  alert('Work hours saved. Calendar updated to '+formatHourLabel(startVal)+' – '+formatHourLabel(endVal)+'.');
}

function exportReport(){alert('Exporting BI Report as PDF... Data synchronisation complete.');}

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

function renderAnalytics(){
  const startInput=document.getElementById('analytics-start-date');
  const endInput=document.getElementById('analytics-end-date');
  if(!startInput.value||!endInput.value){document.getElementById('analytics-preset-filter').value='this_week';applyDatePreset();return;}
  const startOfDay=new Date(startInput.value);startOfDay.setHours(0,0,0,0);
  const endOfDay=new Date(endInput.value);endOfDay.setHours(23,59,59,999);
  const WORK_WEEK_HOURS=50;
  const assetData={};
  validAssets.forEach(a=>{assetData[a]={id:a,activeHours:0,idleHours:0,revenue:0,operators:new Set()};});
  const filtered=bookings.filter(b=>{const s=new Date(b.startTime);return s>=startOfDay&&s<=endOfDay;});
  const opHours={};
  const statusCount={Scheduled:0,Urgent:0,Invoiced:0,Completed:0};
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
    if(statusCount[b.status]!==undefined)statusCount[b.status]++;
  });
  validAssets.forEach(a=>{assetData[a].idleHours=Math.max(0,WORK_WEEK_HOURS-assetData[a].activeHours);});
  const arr=Object.values(assetData).filter(a=>a.activeHours>0||filtered.length===0);
  const totalRev=arr.reduce((s,a)=>s+a.revenue,0);
  const totalAct=arr.reduce((s,a)=>s+a.activeHours,0);
  const totalIdle=arr.reduce((s,a)=>s+a.idleHours,0);
  const utilPct=totalAct>0?Math.round(totalAct/(totalAct+totalIdle)*100):0;
  const idleCost=Math.round(totalIdle*150);
  document.getElementById('kpi-revenue').innerHTML=`<h3>Total Estimated Revenue</h3><div class="kpi-value">$${totalRev.toLocaleString()}</div><div class="kpi-trend positive">+12.5% from last week</div>`;
  document.getElementById('kpi-utilization').innerHTML=`<h3>Fleet Utilization</h3><div class="kpi-value">${utilPct}%</div><div class="kpi-trend positive">+5.2% from last week</div>`;
  document.getElementById('kpi-idle-cost').innerHTML=`<h3>Idle Time Cost (Est.)</h3><div class="kpi-value warning">$${idleCost.toLocaleString()}</div><div class="kpi-trend negative">-2.1% from last week</div>`;
  const sorted=arr.sort((a,b)=>b.revenue-a.revenue);
  const maxRev=sorted[0]?.revenue||1;
  document.getElementById('revenue-list').innerHTML=sorted.slice(0,8).map((a,i)=>`
    <div class="revenue-item">
      <div class="rev-info"><span class="rev-rank">#${i+1}</span><span class="rev-name" style="color:${ASSET_HEX[a.id]||'#888'};font-weight:600;">${a.id}</span><span class="rev-amount">$${Math.round(a.revenue).toLocaleString()}</span></div>
      <div class="rev-bar"><div class="rev-progress" style="width:${(a.revenue/maxRev*100).toFixed(1)}%;background:${ASSET_HEX[a.id]||'#888'};"></div></div>
    </div>`).join('');
  const opArr=Object.entries(opHours).sort((a,b)=>b[1]-a[1]);
  const maxOp=opArr[0]?.[1]||1;
  document.getElementById('operator-list').innerHTML=opArr.slice(0,8).map((o,i)=>`
    <div class="operator-item">
      <div class="op-info"><span class="op-rank">#${i+1}</span><span class="op-name">${o[0]}</span><span class="op-hours">${o[1].toFixed(1)}h</span></div>
      <div class="op-bar"><div class="op-progress" style="width:${(o[1]/maxOp*100).toFixed(1)}%;background:var(--accent-primary);"></div></div>
    </div>`).join('');
  if(utilizationChartInst)utilizationChartInst.destroy();
  const uCtx=document.getElementById('utilizationChart').getContext('2d');
  const topAssets=arr.filter(a=>a.activeHours>0).sort((a,b)=>b.activeHours-a.activeHours).slice(0,8);
  utilizationChartInst=new Chart(uCtx,{type:'bar',data:{labels:topAssets.map(a=>a.id),datasets:[{label:'Active Hours',data:topAssets.map(a=>parseFloat(a.activeHours.toFixed(1))),backgroundColor:topAssets.map(a=>ASSET_HEX[a.id]||'#888')},{label:'Idle Hours',data:topAssets.map(a=>parseFloat(a.idleHours.toFixed(1))),backgroundColor:'rgba(0,0,0,0.1)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:'rgba(0,0,0,0.05)'}}}}});
  if(statusChartInst)statusChartInst.destroy();
  const sCtx=document.getElementById('statusChart').getContext('2d');
  statusChartInst=new Chart(sCtx,{type:'doughnut',data:{labels:Object.keys(statusCount),datasets:[{data:Object.values(statusCount),backgroundColor:['#4ac77a','#e30909','#d67e83','#6b7280'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
}
/* ── RENDER CALENDAR ── */
function getToggleBtnLabel(){
  if(currentView==='Day'){
    return currentDate.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
  }
  if(currentView==='Month') return 'This Month';
  return 'This Week';
}
function getDateLabel(){
  if(currentView==='Day'){
    return currentDate.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  }
  if(currentView==='Month'){
    return currentDate.toLocaleDateString('en-AU',{month:'long',year:'numeric'}).toUpperCase();
  }
  // Week / Work Week — show range Mon–Sun or Mon–Fri
  const dow=currentDate.getDay();
  const monday=new Date(currentDate);monday.setDate(monday.getDate()-(dow===0?6:dow-1));
  const days=currentView==='Work Week'?4:6;
  const endDay=new Date(monday);endDay.setDate(monday.getDate()+days);
  const fmtShort=d=>d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
  const fmtFull=d=>d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
  if(monday.getMonth()===endDay.getMonth()){
    return (monday.getDate()+'–'+fmtFull(endDay)).toUpperCase();
  }
  return (fmtShort(monday)+'–'+fmtFull(endDay)).toUpperCase();
}
function renderCalendar(){
  const body=document.getElementById('calendar-body');
  // Update toggle button label
  const toggleBtn=document.getElementById('date-toggle-btn');
  if(toggleBtn) toggleBtn.textContent=getToggleBtnLabel();
  // Update date label
  document.getElementById('display-date').textContent=getDateLabel();
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
      headerContent=`${asset} <span style="font-size:9px;background:#dc2626;color:#fff;padding:1px 4px;border-radius:3px;">🔒 LOCKED</span>`;
    } else if(isWarning){
      headerContent=`${asset} <span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 4px;border-radius:3px;">⚠️ 30d</span>`;
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
      html+=`<div class="locked-column-overlay" onclick="alert('🚫 SAFETY INTERLOCK: Asset ${asset} has an EXPIRED DocuWare Safety Certificate (${comp.rego}). Dispatch is locked until a new cert is indexed in DocuWare.')">
        <div class="locked-banner-pill">🔒 ASSET DISPATCH LOCKED</div>
      </div>`;
    }

    // Tint overlay
    html+=`<div style="position:absolute;top:0;left:0;right:0;height:${totalH}px;background:${hex};opacity:0.07;pointer-events:none;z-index:0;"></div>`;
    hours.forEach(h=>{
      html+=`<div style="height:${PX}px;border-bottom:1px solid color-mix(in srgb, ${hex} 15%, transparent);" class="paint-slot" data-hour="${h}" data-asset="${asset}" onmousedown="${isExpired ? `alert('🚫 Safety Interlock: Asset ${asset} is locked due to expired DocuWare cert.')` : `startPaint(event,${h},'${asset}')`}"></div>`;
    });

    const aBookings=dayBookings.filter(b=>b.assetNumber===asset);
    aBookings.forEach(b=>{
      const startD=new Date(b.startTime),endD=new Date(b.endTime);
      const startMins=(startD.getHours()-minH)*60+startD.getMinutes();
      const dur=(endD-startD)/60000;
      const top=startMins*(PX/60);
      const height=Math.max(dur*(PX/60),22);
      
      let color=getBookingColor(b);
      if(b.status==='Invoiced') color='#10b981';

      let statusTag='📄 Draft';
      if(b.status==='Invoiced') statusTag='⚡ Invoiced';
      else if(b.status==='Completed') statusTag='📝 Docket Verified';
      else if(b.status==='On-Site') statusTag='🚜 On-Site';
      else if(b.status==='Urgent') statusTag='🔴 Urgent';

      html+=`<div class="booking-card" id="${b.id}" style="top:${top}px;height:${height}px;background:${color};" onmousedown="${isExpired ? `alert('🚫 Safety Interlock: Asset ${asset} is locked.')` : `startDrag(event,'${b.id}')`}" ondblclick="editBooking('${b.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="booking-asset-code">${b.assetNumber}</span>
          <span style="font-size:9px;font-weight:700;background:rgba(0,0,0,0.25);padding:1px 4px;border-radius:3px;">${statusTag}</span>
        </div>
        <div class="booking-client">${b.clientName}</div>
        <div class="booking-operator">${b.operatorName||''}</div>
        ${isWarning ? `<div style="font-size:9px;font-weight:800;color:#fef08a;margin-top:2px;">⚠️ Service Due 30d</div>` : ''}
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
    html+=`<div style="flex:1;position:relative;overflow:hidden;min-width:${60*totalHours}px;">`;
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
      html+=`<div class="gantt-bar" id="dt-${b.id}" style="left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);top:${BAR_TOP}px;height:${BAR_H}px;background:${color};" ondblclick="editBooking('${b.id}')" title="${b.assetNumber} | ${fmtT(startD)} – ${fmtT(endD)}&#10;${b.clientName}&#10;${b.operatorName||''}&#10;${b.jobDescription||''}">`;
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
      html+=`<div class="booking-card" id="wt-${b.id}" style="top:${top}px;height:${height}px;background:${color};" onmousedown="startDrag(event,'${b.id}')" ondblclick="editBooking('${b.id}')">`;
      html+=`<div class="booking-asset-code">${b.assetNumber}</div>`;
      html+=`<div class="booking-client">${b.clientName}</div>`;
      html+=`<div class="booking-operator">${b.operatorName||''}</div>`;
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
        html+=`<div class="gantt-bar" id="${b.id}" style="left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);top:${BAR_TOP}px;height:${BAR_H}px;background:${color};" ondblclick="editBooking('${b.id}')" title="${b.assetNumber} | ${fmtT(startD)} – ${fmtT(endD)}&#10;${b.clientName}&#10;${b.operatorName||''}&#10;${b.jobDescription||''}"><span class="gantt-bar-text">${b.clientName}</span></div>`;
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
let _resizeId=null,_resizeStartY=0,_resizeStartH=0;

function startDrag(e,id){
  if(e.target.classList.contains('booking-resize-handle'))return;
  e.preventDefault();
  const card=document.getElementById(id);
  if(!card)return;

  const PX=60;
  const SNAP_MIN=15;                      // snap to 15-minute grid
  const SNAP_PX=SNAP_MIN*(PX/60);         // = 15px per 15 minutes

  const rect=card.getBoundingClientRect();
  dragOffsetY=e.clientY-rect.top;         // cursor offset within the card
  isDragging=false;
  dragBookingId=id;

  const b=bookings.find(x=>x.id===id);
  if(!b)return;
  const dur=new Date(b.endTime)-new Date(b.startTime); // ms
  const durationPx=dur/3600000*PX;

  // Lock cursor & prevent selection
  document.body.style.cursor='grabbing';
  document.body.style.userSelect='none';

  // Dim the source card
  card.style.opacity='0.2';

  // Floating clone
  const clone=card.cloneNode(true);
  clone.style.cssText=`position:fixed;z-index:9999;pointer-events:none;
    width:${rect.width}px;height:${rect.height}px;
    left:${rect.left}px;top:${rect.top}px;right:auto;
    opacity:0.88;border-radius:6px;
    box-shadow:0 24px 48px rgba(0,0,0,0.38);
    transform:rotate(1.2deg) scale(1.03);`;
  document.body.appendChild(clone);
  dragClone=clone;

  // Time label formatter
  const fmtTime=totalMins=>{
    const clamped=((totalMins%1440)+1440)%1440;
    const h=Math.floor(clamped/60), m=clamped%60;
    const h12=h===0?12:h>12?h-12:h;
    return `${h12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
  };

  // Find column by bounding-rect scan (reliable, no DOM hiding needed)
  const findCol=ev=>{
    const cols=document.querySelectorAll('[data-asset],[data-date]');
    for(const col of cols){
      const r=col.getBoundingClientRect();
      if(ev.clientX>=r.left&&ev.clientX<=r.right&&
         ev.clientY>=r.top&&ev.clientY<=r.bottom) return col;
    }
    return null;
  };

  // Walk up to find the scrollable ancestor via computed style
  const findScroll=col=>{
    let el=col.parentElement;
    while(el&&el!==document.body){
      const ov=window.getComputedStyle(el).overflowY;
      if(ov==='auto'||ov==='scroll') return el;
      el=el.parentElement;
    }
    return null;
  };

  // Compute snapped drop position
  const calcPos=ev=>{
    const colEl=findCol(ev);
    if(!colEl) return null;
    const scrollEl=findScroll(colEl);
    const scrollTop=scrollEl?scrollEl.scrollTop:0;
    const colRect=colEl.getBoundingClientRect();
    // Distance from top of column *content* (scroll-adjusted)
    const contentY=(ev.clientY-colRect.top)+scrollTop;
    // Where the TOP of the booking would land
    const bookingTop=contentY-dragOffsetY;
    // Snap to 15-min grid, clamp to 0
    const snapped=Math.max(0,Math.round(bookingTop/SNAP_PX)*SNAP_PX);
    const offsetMins=Math.round(snapped/PX*60);
    const absStart=currentMinHour*60+offsetMins;
    const hour=Math.floor(absStart/60)%24;
    const minute=absStart%60;
    return{colEl,snapped,hour,minute};
  };

  // Create/update the ghost placeholder in the grid
  const updateGhost=pos=>{
    if(!pos){if(dragGhost)dragGhost.style.display='none';return;}
    const{colEl,snapped,hour,minute}=pos;
    if(!dragGhost){
      dragGhost=document.createElement('div');
      dragGhost.className='drag-ghost';
    }
    if(dragGhost.parentElement!==colEl) colEl.appendChild(dragGhost);
    const endMins=hour*60+minute+Math.round(dur/60000);
    dragGhost.innerHTML=`<span class="drag-ghost-time">${fmtTime(hour*60+minute)} – ${fmtTime(endMins)}</span>`;
    dragGhost.style.top=snapped+'px';
    dragGhost.style.height=Math.max(24,durationPx)+'px';
    dragGhost.style.display='flex';
  };

  let lastPos=null;

  const onMove=ev=>{
    isDragging=true;
    clone.style.left=(ev.clientX-rect.width/2)+'px';
    clone.style.top=(ev.clientY-dragOffsetY)+'px';
    lastPos=calcPos(ev);
    updateGhost(lastPos);
  };

  const cleanup=()=>{
    document.body.style.cursor='';
    document.body.style.userSelect='';
    if(dragClone){dragClone.remove();dragClone=null;}
    if(dragGhost){dragGhost.remove();dragGhost=null;}
    const orig=document.getElementById(id);
    if(orig)orig.style.opacity='';
  };

  const onUp=ev=>{
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    cleanup();
    if(!isDragging){isDragging=false;dragBookingId=null;return;}
    isDragging=false;
    // Use current pos, fall back to last known pos if cursor left the grid
    const pos=calcPos(ev)||lastPos;
    if(pos){
      const{colEl,hour,minute}=pos;
      const newAsset=colEl.dataset.asset||b.assetNumber;
      const newDate=colEl.dataset.date?new Date(colEl.dataset.date):new Date(b.startTime);
      const ns=new Date(newDate);ns.setHours(hour,minute,0,0);
      const ne=new Date(ns.getTime()+dur);
      if(!hasOverlap(newAsset,ns.toISOString(),ne.toISOString(),id)){
        b.startTime=ns.toISOString();
        b.endTime=ne.toISOString();
        b.assetNumber=newAsset;
      }
    }
    renderCalendar();
    dragBookingId=null;
  };

  document.addEventListener('mousemove',onMove,{passive:true});
  document.addEventListener('mouseup',onUp);
}

function startResize(e,id){
  e.preventDefault();e.stopPropagation();
  _resizeId=id;_resizeStartY=e.clientY;
  const b=bookings.find(x=>x.id===id);
  _resizeStartH=new Date(b.endTime)-new Date(b.startTime);
  const onMove=ev=>{
    const dy=ev.clientY-_resizeStartY;
    const PX=60;
    const newDur=Math.max(900000,_resizeStartH+dy*(60000*60/PX));
    const b2=bookings.find(x=>x.id===_resizeId);
    if(!b2)return;
    const ne=new Date(new Date(b2.startTime).getTime()+newDur);
    b2.endTime=ne.toISOString();
    const card=document.getElementById(_resizeId);
    if(card)card.style.height=Math.max(22,newDur/60000*(PX/60))+'px';
  };
  const onUp=()=>{
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    renderCalendar();_resizeId=null;
  };
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

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
function switchTab(tab){
  const viewMap={
    'calendar':'calendar-view',
    'job-board':'job-board-view',
    'analytics':'analytics-view',
    'clients':'clients-view',
    'compliance':'compliance-view',
    'settings':'settings-view'
  };
  const navMap={
    'calendar':'nav-calendar',
    'job-board':'nav-job-board',
    'analytics':'nav-analytics',
    'clients':'nav-clients',
    'compliance':'nav-compliance',
    'settings':'nav-settings'
  };

  document.querySelectorAll('.view-container').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));

  const viewId=viewMap[tab]||'calendar-view';
  const navId=navMap[tab]||'nav-calendar';

  const viewEl=document.getElementById(viewId);
  const navEl=document.getElementById(navId);

  if(viewEl) viewEl.classList.add('active');
  if(navEl) navEl.classList.add('active');

  if(tab==='job-board') renderJobBoard();
  else if(tab==='analytics') renderAnalytics();
  else if(tab==='clients') renderClientsView();
  else if(tab==='compliance') renderComplianceView();
  else if(tab==='calendar') renderCalendar();
}

/* ── DOCUWARE CONTRACT E-SIGNATURE & FIELD DOCKET WORKFLOWS ── */
let _activeDWBookingId = null;

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
    b.contractStatus='✓ Contract Signed & Archived';
  }
  closeDocuWareModal('docuware-signature-modal');
  alert(`✅ DocuWare Sign Workflow Executed!\n\nHire Agreement #DW-AGR-${_activeDWBookingId?.toUpperCase()} sent to client. E-Signature verified & stored in DocuWare Vault.`);
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
  alert(`⚡ DocuWare Intelligent Indexing Completed!\n\nField Wet-Hire Docket indexed successfully. Machine hours extracted, billable total verified, and job advanced to Completed!`);
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
      <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="alert('Opening DocuWare PDF Viewer for #DW-AGR-${b.id}...')">View Contract PDF</button></td>
    </tr>
    <tr>
      <td><strong>Verified Field Docket</strong> (#WD-${b.id})</td>
      <td style="font-family:monospace;">#DW-DOC-${b.id}</td>
      <td>${dateStr}</td>
      <td><span class="status-pill valid">Hours Verified</span></td>
      <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="alert('Opening DocuWare Field Docket Viewer for #DW-DOC-${b.id}...')">View Docket PDF</button></td>
    </tr>
    <tr>
      <td><strong>Tax Invoice Record</strong> (#INV-${b.id})</td>
      <td style="font-family:monospace;">#DW-INV-${b.id}</td>
      <td>${dateStr}</td>
      <td><span class="status-pill ${b.status==='Invoiced'?'valid':'warning'}">${b.status==='Invoiced'?'Invoiced &amp; Synced':'Draft Invoice'}</span></td>
      <td><button class="btn-secondary" style="height:28px;padding:0 8px;font-size:10px;" onclick="alert('Opening DocuWare Tax Invoice Viewer for #DW-INV-${b.id}...')">View Invoice PDF</button></td>
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
  alert(`✅ DocuWare Webhook Received!\n\nNew Safety & Inspection Certificate for ${assetId} verified and indexed in DocuWare Vault.\nHard Dispatch Interlock RELEASED! ${assetId} is now available for booking.`);
  renderComplianceView();
  renderCalendar();
  renderJobBoard();
}

/* ── JOB BOARD KANBAN WITH SEARCH & FILTER ── */
function renderJobBoard(){
  const container=document.getElementById('job-board-container');
  if(!container)return;

  const searchQuery=(document.getElementById('jb-search')?.value||'').toLowerCase().trim();
  const stageFilter=document.getElementById('jb-stage-filter')?.value||'ALL';

  const columns=[
    {id:'Scheduled',title:'Scheduled',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',color:'#1C4B8B'},
    {id:'Dispatched',title:'Dispatched',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',color:'#835ac7'},
    {id:'On-Site',title:'On-Site',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>',color:'#4ac77a'},
    {id:'Completed',title:'Complete',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',color:'#09e3df'},
    {id:'Invoiced',title:'Invoiced',svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',color:'#d67e83'}
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

    const colBookings=filteredBookings.filter(b=>(b.status||'Scheduled')===col.id);
    html+=`<div class="kanban-col">
      <div class="kanban-header">
        <div class="kanban-title"><span style="color:${col.color}">${col.svg}</span> ${col.title}</div>
        <span class="kanban-count">${colBookings.length}</span>
      </div>
      <div class="kanban-cards">`;

    if(colBookings.length===0){
      html+=`<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px;font-style:italic;">No jobs match criteria</div>`;
    } else {
      colBookings.forEach(b=>{
        const assetColor=ASSET_HEX[b.assetNumber]||'#1C4B8B';
        const startD=new Date(b.startTime);
        const timeStr=startD.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
        const dateStr=formatAUDate(b.startTime);
        
        let docActionText='Generate Agreement';
        let docActionFn=`openDocuWareContractModal('${b.id}')`;
        let docBadgeText=b.contractSigned?'✓ Contract Signed':'Contract Draft';

        if(b.status==='Dispatched'){
          docActionText='Dispatch Docket';
          docActionFn=`triggerDocuWareDoc('${b.id}','${b.clientName}')`;
          docBadgeText='Dispatched';
        }
        else if(b.status==='On-Site'){
          docActionText='Upload Field Docket';
          docActionFn=`openDocuWareDocketModal('${b.id}')`;
          docBadgeText=b.docketUploaded?'✓ Docket Verified':'Active On-Site';
        }
        else if(b.status==='Completed'){
          docActionText='Issue Invoice';
          docActionFn=`triggerDocuWareDoc('${b.id}','${b.clientName}')`;
          docBadgeText='Ready to Bill';
        }
        else if(b.status==='Invoiced'){
          docActionText='View Billing Record';
          docActionFn=`openDocuWareSmartConnect('${b.clientName.replace(/'/g,"\\'")}')`;
          docBadgeText='Archived & Billed';
        }

        html+=`<div class="kanban-card" onclick="editBooking('${b.id}')">
          <div class="kb-card-top">
            <span class="kb-asset-badge" style="background:${assetColor};">${b.assetNumber}</span>
            <span class="kb-time">${dateStr} ${timeStr}</span>
          </div>
          <div class="kb-client">${b.clientName}</div>
          <div class="kb-desc">${b.jobDescription||'General plant hire operation'}</div>
          <div class="kb-operator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${b.operatorName||'Unassigned Operator'}
          </div>
          <div class="kb-dw-badge">
            <span>${docBadgeText}</span>
            <button class="kb-action-btn" onclick="event.stopPropagation();${docActionFn}">${docActionText}</button>
          </div>
          <div style="display:flex;gap:4px;margin-top:4px;">
            ${col.id!=='Scheduled'?`<button class="kb-action-btn" style="background:#6b7280;padding:2px 8px;" onclick="event.stopPropagation();moveBookingStatus('${b.id}','prev')">←</button>`:''}
            ${col.id!=='Invoiced'?`<button class="kb-action-btn" style="background:#1C4B8B;flex:1;padding:2px 8px;" onclick="event.stopPropagation();moveBookingStatus('${b.id}','next')">Advance Stage →</button>`:''}
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
  const stages=['Scheduled','Dispatched','On-Site','Completed','Invoiced'];
  const b=bookings.find(x=>x.id===id);
  if(!b)return;
  const curIdx=stages.indexOf(b.status||'Scheduled');
  if(dir==='next'&&curIdx<stages.length-1) b.status=stages[curIdx+1];
  else if(dir==='prev'&&curIdx>0) b.status=stages[curIdx-1];
  renderJobBoard();
  renderCalendar();
}

function triggerDocuWareDoc(id,clientName){
  alert(`Document Engine Workflow Triggered\n\nGenerating legal agreement record for ${clientName} (Order #${id})...\nArchived into Enterprise Document Repository.`);
}

/* ── ENTERPRISE CLIENT DIRECTORY WITH FINANCIAL PIPELINE FLOW ── */
function renderClientsView(){
  const container=document.getElementById('clients-container');
  if(!container)return;

  const searchQuery=(document.getElementById('client-search')?.value||'').toLowerCase().trim();
  const sortOption=document.getElementById('client-sort-filter')?.value||'revenue_desc';

  const creditTermsMap={
    'Lendlease Group':'30-Day Credit Approved',
    'Apex Constructions':'14-Day Credit Approved',
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

    if(b.status==='Invoiced'||b.status==='Completed') {
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
  const formattedGrandTotal='$'+Math.round(grandTotalRevenue).toLocaleString()+' AUD';
  const formattedUnbilled='$'+Math.round(grandTotalUnbilled).toLocaleString()+' AUD';

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
          <th>Credit Terms</th>
          <th style="text-align:center;">Jobs</th>
          <th>Financial Flow (WIP vs Invoiced)</th>
          <th>Total Revenue</th>
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
      const formattedTotal='$'+Math.round(c.totalSpend).toLocaleString();
      const formattedWip='$'+Math.round(c.unbilledSpend).toLocaleString();
      const formattedInv='$'+Math.round(c.invoicedSpend).toLocaleString();
      const assetsList=Array.from(c.assetsUsed).join(', ');
      const lastDate=formatAUDate(c.lastJob);

      let termBadgeCls='valid';
      if(c.creditTerms.includes('Pre-paid')) termBadgeCls='warning';

      const total=c.totalSpend||1;
      const pctInv=Math.round((c.invoicedSpend/total)*100);
      const pctWip=100-pctInv;

      html+=`<tr style="cursor:pointer;" onclick="openClientLedger('${c.name.replace(/'/g,"\\'")}')" title="Click to view detailed job & financial ledger">
        <td style="font-weight:700;font-size:14px;color:var(--text-primary);">${c.name}</td>
        <td><span class="status-pill ${termBadgeCls}">${c.creditTerms}</span></td>
        <td style="font-weight:700;text-align:center;">${c.jobs}</td>
        <td style="min-width:180px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:3px;">
            <span style="color:#d97706;">WIP: ${formattedWip}</span>
            <span style="color:#10b981;">Inv: ${formattedInv}</span>
          </div>
          <div style="height:6px;width:100%;background:rgba(217,119,6,0.18);border-radius:4px;overflow:hidden;display:flex;">
            <div style="width:${pctWip}%;background:#d97706;height:100%;" title="Unbilled WIP: ${formattedWip}"></div>
            <div style="width:${pctInv}%;background:#10b981;height:100%;" title="Invoiced Revenue: ${formattedInv}"></div>
          </div>
        </td>
        <td style="font-weight:700;color:var(--accent-primary);font-size:14px;">${formattedTotal}</td>
        <td style="font-size:12px;color:var(--text-secondary);">${assetsList}</td>
        <td style="font-weight:600;font-size:12px;">${lastDate}</td>
        <td style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation();">
          <button class="btn-primary" style="height:30px;padding:0 10px;font-size:11px;" onclick="openClientLedger('${c.name.replace(/'/g,"\\'")}')">
            View Ledger &amp; Jobs
          </button>
          <button class="btn-secondary" style="height:30px;padding:0 8px;font-size:11px;" onclick="alert('Generating Verified Account Statement PDF for ${c.name}...')">
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
      <div style="font-size:20px;font-weight:700;font-family:'Michroma',sans-serif;color:var(--accent-primary);margin-top:2px;">${formattedBilled}</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Deployments Overview</div>
      <div style="font-size:14px;font-weight:700;margin-top:4px;">${clientBookings.length} Total Jobs (${invoicedCount} Invoiced / ${pendingCount} Active)</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Billing Engine Sync</div>
      <div style="font-size:12px;font-weight:600;color:#10b981;margin-top:4px;">● Synchronized with Repository</div>
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
  alert(`⚡ Exporting Comprehensive Commercial Account Ledger PDF for ${name}...\nIncludes all deployment history, hourly rate breakdowns, and verified invoice records.`);
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
      let pillCls='valid';let pillText='Valid Record';
      if(item.status==='warning'){pillCls='warning';pillText='Service Due (30d)';}
      else if(item.status==='expired'){pillCls='expired';pillText='🚫 Cert Expired (LOCKED)';}

      const formattedCertDate=formatAUDate(item.certDate);

      html+=`<tr ${item.status==='expired'?'style="background:rgba(239,68,68,0.04);"' : ''}>
        <td style="font-weight:700;">${item.id}</td>
        <td>${item.type}</td>
        <td style="font-family:monospace;font-size:12px;">${item.rego}</td>
        <td style="font-weight:600;">${formattedCertDate}</td>
        <td><span class="status-pill ${pillCls}">${pillText}</span></td>
        <td style="display:flex;gap:6px;align-items:center;">
          ${item.status==='expired' ? `
            <button class="btn-primary" style="height:30px;padding:0 10px;font-size:11px;background:#dc2626;" onclick="indexDocuWareCert('${item.id}')">
              📄 Index New Cert in DocuWare (Release Lock)
            </button>
          ` : `
            <button class="btn-secondary" style="height:30px;padding:0 10px;font-size:11px;" onclick="alert('Retrieving certified inspection record for ${item.id} from DocuWare Vault...')">
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

document.addEventListener('DOMContentLoaded',()=>{
  // Toolbar hour selects
  populateHourSelect(document.getElementById('display-start-hour'), displayHoursStart, true);
  populateHourSelect(document.getElementById('display-end-hour'), displayHoursEnd, false);
  // Settings work hours selects (same defaults)
  populateHourSelect(document.getElementById('settings-work-start'), displayHoursStart, true);
  populateHourSelect(document.getElementById('settings-work-end'), displayHoursEnd, false);
  syncAssets();
  renderAssetManager();
  // Show the transpose toggle for the initial view (Day) and set its label
  const transposeBtn=document.getElementById('day-transpose-btn');
  if(transposeBtn){transposeBtn.style.display='flex';updateTransposeLabel();}
  renderCalendar();
  applyDatePreset();
});



