/**
 * dataModels.js — HireEngine Core Data Layer
 * Single source of truth for all fleet, worker, compliance, and booking data.
 *
 * Australian High Risk Work Licence (HRWL) codes used throughout:
 *   Cranes:  CN  (non-slewing, capacity ≤ 3T)
 *            C2  (non-slewing, capacity > 3T)
 *            C6  (slewing mobile, capacity ≤ 20T)
 *            C1  (slewing mobile, capacity > 20T)
 *            CO  (bridge & gantry crane)
 *   Rigging: DG  (Dogging)
 *            RB  (Basic Rigging)
 *            RI  (Intermediate Rigging)
 *            RA  (Advanced Rigging)
 *
 * License hierarchy (higher class supersedes lower):
 *   Cranes:  C1 > C6 > C2 > CN  |  CO is standalone
 *   Rigging: RA > RI > RB > DG
 */

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIGURATION & CONSTANTS
───────────────────────────────────────────────────────────────────────────── */

export const HOURLY_RATES = {
  EX: 250,   // Excavator
  SK: 180,   // Skid Steer
  DZ: 280,   // Dozer
  FL: 150,   // Forklift
  SC: 120,   // Scissor Lift
  BM: 180,   // Boom Lift
  CR: 480,   // Crane (wet hire premium rate)
  DT: 200,   // Dump Truck
};

/**
 * HRWL requirements by crane category.
 * A license of a higher tier satisfies requirements for lower tiers.
 * For example, C1 holders can operate cranes requiring C6, C2, or CN.
 */
export const CRANE_HRWL_REQUIREMENTS = {
  non_slewing_light: { label: 'Non-slewing Mobile (≤3T)',   requiredLicenses: ['CN', 'C2', 'C1'] },
  non_slewing_heavy: { label: 'Non-slewing Mobile (>3T)',   requiredLicenses: ['C2', 'C1'] },
  slewing_light:     { label: 'Slewing Mobile (≤20T)',      requiredLicenses: ['C6', 'C1'] },
  slewing_heavy:     { label: 'Slewing Mobile (>20T)',      requiredLicenses: ['C1'] },
  bridge_gantry:     { label: 'Bridge & Gantry Crane',      requiredLicenses: ['CO'] },
  pick_carry:        { label: 'Pick-and-Carry (Franna)',    requiredLicenses: ['C6', 'C1'] },
};

export const RIGGING_LICENSE_TYPES = ['DG', 'RB', 'RI', 'RA'];

export const HIRE_TYPES = {
  WET:         'wet',          // Machine + certified operator + dogman/rigger
  DRY:         'dry',          // Machine only — client supplies operator
  LABOUR_ONLY: 'labour_only',  // Operator/rigger labour only — client supplies machine
};

export const DOC_STATUSES = {
  PENDING:   'pending',
  COMPLETED: 'completed',
  PUSHED:    'pushed',      // Successfully indexed in DocuWare
};


/* ─────────────────────────────────────────────────────────────────────────────
   ASSET REGISTRY
   Source of truth for all fleet assets. Mutable via helper functions.
───────────────────────────────────────────────────────────────────────────── */


export let clientsRegistry = [
  { id: 'C100', name: 'ADCO Constructions', phone: '1300 000 001', email: 'admin@adco.com.au' },
  { id: 'C101', name: 'Downer Group', phone: '1300 000 002', email: 'dispatch@downer.com.au' },
  { id: 'C102', name: 'Fulton Hogan', phone: '1300 000 003', email: 'ops@fultonhogan.com.au' }
];

export let projectsRegistry = [
  { id: 'P200', clientId: 'C100', name: 'Coronation Dr Basement', address: 'Coronation Dr, Milton QLD 4064', contact: 'Site Mgr Bill' },
  { id: 'P201', clientId: 'C101', name: 'Springfield Subdivision', address: 'Springfield Central QLD 4300', contact: 'Dave (Foreman)' },
  { id: 'P202', clientId: 'C102', name: 'Gateway Overpass', address: 'Gateway Motorway, Nudgee QLD', contact: 'Structural Eng.' }
];

export function addClient(c) { clientsRegistry.push(c); }
export function addProject(p) { projectsRegistry.push(p); }

export let assetRegistry = [
  { id: 'EX01', description: 'Excavator 20T',        hex: '#0ea5e9', assetType: 'excavator' },
  { id: 'EX02', description: 'Excavator 35T',        hex: '#06b6d4', assetType: 'excavator' },
  { id: 'SK03', description: 'Skid Steer Loader',    hex: '#8b5cf6', assetType: 'skid_steer' },
  { id: 'DZ04', description: 'Dozer D6',             hex: '#475569', assetType: 'dozer' },
  { id: 'FL05', description: 'Forklift 5T',          hex: '#6366f1', assetType: 'forklift' },
  { id: 'FL06', description: 'Forklift 10T',         hex: '#2563eb', assetType: 'forklift' },
  { id: 'SC07', description: 'Scissor Lift 12m',     hex: '#059669', assetType: 'elevated_platform' },
  { id: 'BM08', description: 'Boom Lift 17m',        hex: '#b45309', assetType: 'elevated_platform' },
  { id: 'CR09', description: 'Crawler Crane 50T',    hex: '#334155', assetType: 'crane_slewing_crawler' },
  { id: 'DT10', description: 'Dump Truck',           hex: '#9333ea', assetType: 'truck' },
];

export function addAsset(asset) {
  assetRegistry.push(asset);
}
export function removeAssetById(id) {
  assetRegistry = assetRegistry.filter(a => a.id !== id);
}
export function updateAssetById(id, fields) {
  const idx = assetRegistry.findIndex(a => a.id === id);
  if (idx >= 0) assetRegistry[idx] = { ...assetRegistry[idx], ...fields };
}


/* ─────────────────────────────────────────────────────────────────────────────
   CRANE CAPABILITY REGISTRY
   Detailed specifications for all crane assets.
───────────────────────────────────────────────────────────────────────────── */

export const craneCapabilityRegistry = {
  CR09: {
    maxLiftCapacity: 50,            // tonnes
    craneCategory: 'slewing_heavy', // maps to CRANE_HRWL_REQUIREMENTS key
    boomLength: 45,                 // metres
    rig: 'lattice_boom_crawler',
    requiredOperatorLicenses: ['C1'],
    riggingMandatory: true,         // dogman or rigger required by law
    swmsRequired: true,
    maxWindSpeed: 12,               // m/s operational limit per manufacturer
    notes: '50T capacity at 4m radius. Maximum radius 40m at reduced capacity. SWL to be confirmed by dogman per lift.',
  },
  // Additional crane assets added here as fleet grows
};


/* ─────────────────────────────────────────────────────────────────────────────
   COMPLIANCE REGISTRY
   Asset-level certification, registration, and inspection tracking.
───────────────────────────────────────────────────────────────────────────── */

export let complianceRegistry = {
  EX01: { rego: 'REG-8829-EX', certDate: '2026-11-15', nextServiceDue: '2026-12-01', status: 'valid',   risk: 'Low',  annualCertDate: '2026-11-15', riskAssessmentDate: '2026-06-01' },
  EX02: { rego: 'REG-4410-EX', certDate: '2026-09-20', nextServiceDue: '2026-09-20', status: 'warning', risk: 'Med', annualCertDate: '2026-09-20', riskAssessmentDate: '2026-03-15' },
  SK03: { rego: 'REG-1204-SK', certDate: '2026-12-01', nextServiceDue: '2026-12-15', status: 'valid',   risk: 'Low',  annualCertDate: '2026-12-01', riskAssessmentDate: '2026-06-01' },
  DZ04: { rego: 'REG-9912-DZ', certDate: '2027-01-20', nextServiceDue: '2027-02-01', status: 'valid',   risk: 'Low',  annualCertDate: '2027-01-20', riskAssessmentDate: '2026-07-20' },
  FL05: { rego: 'REG-3319-FL', certDate: '2026-10-10', nextServiceDue: '2026-11-01', status: 'valid',   risk: 'Low',  annualCertDate: '2026-10-10', riskAssessmentDate: '2026-04-10' },
  FL06: { rego: 'REG-5521-FL', certDate: '2026-10-04', nextServiceDue: '2026-11-04', status: 'valid',   risk: 'Low',  annualCertDate: '2026-10-04', riskAssessmentDate: '2026-04-04' },
  SC07: { rego: 'REG-7714-SC', certDate: '2026-09-22', nextServiceDue: '2026-09-22', status: 'warning', risk: 'Med', annualCertDate: '2026-09-22', riskAssessmentDate: '2026-03-22' },
  BM08: { rego: 'REG-8840-BM', certDate: '2026-11-30', nextServiceDue: '2026-12-10', status: 'valid',   risk: 'Low',  annualCertDate: '2026-11-30', riskAssessmentDate: '2026-05-30' },
  CR09: { rego: 'REG-0012-CR', certDate: '2026-07-30', nextServiceDue: '2026-07-30', status: 'expired', risk: 'HIGH', annualCertDate: '2026-07-30', riskAssessmentDate: '2026-01-15' },
  DT10: { rego: 'REG-6632-DT', certDate: '2026-12-15', nextServiceDue: '2027-01-15', status: 'valid',   risk: 'Low',  annualCertDate: '2026-12-15', riskAssessmentDate: '2026-06-15' },
};

export function updateComplianceRecord(assetId, fields) {
  if (complianceRegistry[assetId]) {
    complianceRegistry[assetId] = { ...complianceRegistry[assetId], ...fields };
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
   WORKER REGISTRY
   Personnel with High Risk Work Licences (HRWL) and contact details.
   License statuses are computed at render time against today's date.
───────────────────────────────────────────────────────────────────────────── */

export let workerRegistry = [
  {
    id: 'W001', name: 'Luke Harris', role: 'Crane Operator', status: 'available',
    phone: '0412 001 001', email: 'l.harris@hireengine.com.au',
    licenses: [
      { type: 'C1', licenseNumber: 'QLD-HRW-C1-28491', expiry: '2027-03-15', state: 'QLD' },
      { type: 'C6', licenseNumber: 'QLD-HRW-C6-28491', expiry: '2027-03-15', state: 'QLD' },
    ],
  },
  {
    id: 'W002', name: 'John Smith', role: 'Crane Operator', status: 'available',
    phone: '0412 001 002', email: 'j.smith@hireengine.com.au',
    licenses: [
      { type: 'C6', licenseNumber: 'QLD-HRW-C6-19234', expiry: '2026-10-30', state: 'QLD' },
    ],
  },
  {
    id: 'W003', name: 'Mark Johnson', role: 'Plant Operator',
    phone: '0412 001 003', email: 'm.johnson@hireengine.com.au',
    licenses: [
      { type: 'C2', licenseNumber: 'QLD-HRW-C2-44120', expiry: '2027-01-08', state: 'QLD' },
    ],
  },
  {
    id: 'W004', name: 'Dave Wilson', role: 'Plant Operator',
    phone: '0412 001 004', email: 'd.wilson@hireengine.com.au',
    licenses: [
      { type: 'C2', licenseNumber: 'QLD-HRW-C2-33981', expiry: '2026-10-05', state: 'QLD' },
    ],
  },
  {
    id: 'W005', name: 'Sam Davies', role: 'Plant Operator',
    phone: '0412 001 005', email: 's.davies@hireengine.com.au',
    licenses: [
      { type: 'CO', licenseNumber: 'QLD-HRW-CO-11023', expiry: '2027-04-22', state: 'QLD' },
    ],
  },
  {
    id: 'W006', name: 'Alex Morgan', role: 'Plant Operator',
    phone: '0412 001 006', email: 'a.morgan@hireengine.com.au',
    licenses: [
      { type: 'C6', licenseNumber: 'NSW-HRW-C6-90211', expiry: '2026-12-19', state: 'NSW' },
    ],
  },
  {
    id: 'W007', name: 'Chris Evans', role: 'Crane Operator', status: 'available',
    phone: '0412 001 007', email: 'c.evans@hireengine.com.au',
    licenses: [
      { type: 'C6', licenseNumber: 'QLD-HRW-C6-77321', expiry: '2027-02-11', state: 'QLD' },
    ],
  },
  {
    id: 'W008', name: 'Ryan Nash', role: 'Plant Operator',
    phone: '0412 001 008', email: 'r.nash@hireengine.com.au',
    licenses: [
      { type: 'C6', licenseNumber: 'QLD-HRW-C6-88412', expiry: '2027-05-30', state: 'QLD' },
    ],
  },
  {
    id: 'W009', name: 'Tom Reed', role: 'Plant Operator',
    phone: '0412 001 009', email: 't.reed@hireengine.com.au',
    licenses: [
      { type: 'CO', licenseNumber: 'QLD-HRW-CO-22011', expiry: '2026-11-14', state: 'QLD' },
    ],
  },
  {
    id: 'W010', name: 'Mike Stone', role: 'Plant Operator',
    phone: '0412 001 010', email: 'm.stone@hireengine.com.au',
    licenses: [
      { type: 'C2', licenseNumber: 'QLD-HRW-C2-66012', expiry: '2027-07-01', state: 'QLD' },
    ],
  },
  {
    id: 'W011', name: 'Sam Chen', role: 'Crane Operator', status: 'available',
    phone: '0412 001 011', email: 's.chen@hireengine.com.au',
    licenses: [
      // EXPIRED — flagged as compliance block on dispatch
      { type: 'C1', licenseNumber: 'QLD-HRW-C1-00431', expiry: '2026-08-01', state: 'QLD' },
    ],
  },
  {
    id: 'W012', name: 'Brad Nguyen', role: 'Dogman', status: 'available',
    phone: '0412 001 012', email: 'b.nguyen@hireengine.com.au',
    licenses: [
      { type: 'DG', licenseNumber: 'QLD-HRW-DG-55123', expiry: '2027-06-20', state: 'QLD' },
      { type: 'RB', licenseNumber: 'QLD-HRW-RB-55123', expiry: '2027-06-20', state: 'QLD' },
    ],
  },
  {
    id: 'W013', name: "Kerry O'Brien", role: 'Dogman', status: 'available',
    phone: '0412 001 013', email: 'k.obrien@hireengine.com.au',
    licenses: [
      { type: 'DG', licenseNumber: 'QLD-HRW-DG-67441', expiry: '2026-11-30', state: 'QLD' },
    ],
  },
  {
    id: 'W014', name: 'James Wu', role: 'Rigger',
    phone: '0412 001 014', email: 'j.wu@hireengine.com.au',
    licenses: [
      { type: 'RB', licenseNumber: 'QLD-HRW-RB-41200', expiry: '2027-08-15', state: 'QLD' },
      { type: 'RI', licenseNumber: 'QLD-HRW-RI-41200', expiry: '2027-08-15', state: 'QLD' },
    ],
  },
  {
    id: 'W015', name: 'Tina Forde', role: 'Rigger',
    phone: '0412 001 015', email: 't.forde@hireengine.com.au',
    licenses: [
      // Expiring within 30 days — triggers WARN on dispatch
      { type: 'RI', licenseNumber: 'QLD-HRW-RI-98012', expiry: '2026-10-01', state: 'QLD' },
    ],
  },
];

/**
 * Returns the computed license status for a given expiry date string.
 * 'expired' = already expired
 * 'warning' = expires within 30 days
 * 'valid'   = valid for > 30 days
 */
export function getLicenseStatus(expiryDateStr) {
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  if (expiry < now) return 'expired';
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 30) return 'warning';
  return 'valid';
}

/**
 * Returns the number of days until a license expires (negative if already expired).
 */
export function daysUntilExpiry(expiryDateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(expiryDateStr) - now) / (1000 * 60 * 60 * 24));
}

export function addWorker(worker) {
  workerRegistry.push(worker);
}
export function updateWorkerById(id, fields) {
  const idx = workerRegistry.findIndex(w => w.id === id);
  if (idx >= 0) workerRegistry[idx] = { ...workerRegistry[idx], ...fields };
}
export function getWorkerById(id) {
  return workerRegistry.find(w => w.id === id) || null;
}


/* ─────────────────────────────────────────────────────────────────────────────
   BOOKING DATA
   Extended booking model with wet hire resources, document pipeline tracking,
   and site data. Existing POC bookings preserved and enriched.
───────────────────────────────────────────────────────────────────────────── */

// Date helpers
function d(h, m = 0) {
  const n = new Date(); n.setHours(h, m, 0, 0); return n.toISOString();
}
function dOffset(days, h, m = 0) {
  const n = new Date(); n.setDate(n.getDate() + days); n.setHours(h, m, 0, 0); return n.toISOString();
}
export { d, dOffset };

/**
 * Booking shape (reference):
 * {
 *   id: string,
 *   assetNumber: string,
 *   hireType: 'wet' | 'dry' | 'labour_only',
 *   clientName: string,
 *   jobDescription: string,
 *   operatorName: string,           // display name (legacy, kept for compat)
 *   wetHireResources: [             // populated for wet hire
 *     { role: 'Operator'|'Dogman'|'Rigger', workerId: string, workerName: string, licenseType: string }
 *   ],
 *   requiredLiftCapacity: number,   // tonnes; 0 for non-crane assets
 *   siteAddress: string,
 *   startTime: ISO string,
 *   endTime: ISO string,
 *   status: 'Scheduled'|'Dispatched'|'On-Site'|'Docket Verification'|'Completed'|'Invoiced'|'Urgent',
 *   swmsStatus: 'pending'|'completed'|'pushed',
 *   preStartStatus: 'pending'|'completed'|'pushed',
 *   docketStatus: 'pending'|'completed'|'pushed',
 *   contractSigned: boolean,
 *   docketUploaded: boolean,
 *   complianceOverrideReason: string|null,
 * }
 */

export let bookings = [
  { id:'b1',  assetNumber:'EX01', hireType:'wet',  clientName:'BuildCorp Inc.',           jobDescription:'Foundation excavation — Stage 1',           operatorName:'John Smith',   wetHireResources:[{role:'Operator',workerId:'W002',workerName:'John Smith',licenseType:'C6'}],                                                           requiredLiftCapacity:0, siteAddress:'12 Commerce Dr, Yatala QLD 4207',         startTime:d(7,0),        endTime:d(13,0),        status:'Scheduled',  swmsStatus:'completed', preStartStatus:'completed', docketStatus:'pending',   contractSigned:true,  docketUploaded:false },
  { id:'b2',  assetNumber:'EX02', hireType:'wet',  clientName:'Civil Works Pty Ltd',       jobDescription:'Bulk earthworks — cut to fill',              operatorName:'Mark Johnson', wetHireResources:[{role:'Operator',workerId:'W003',workerName:'Mark Johnson',licenseType:'C2'}],                                                          requiredLiftCapacity:0, siteAddress:'88 Pacific Hwy, Helensvale QLD 4212',     startTime:d(7,30),       endTime:d(15,0),        status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b3',  assetNumber:'EX02', hireType:'wet',  clientName:'Metro Rail Authority',       jobDescription:'Drainage trench excavation',                 operatorName:'Mark Johnson', wetHireResources:[{role:'Operator',workerId:'W003',workerName:'Mark Johnson',licenseType:'C2'}],                                                          requiredLiftCapacity:0, siteAddress:'Station Rd, Roma QLD 4455',               startTime:d(15,30),      endTime:d(17,30),       status:'Invoiced',   swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b4',  assetNumber:'SK03', hireType:'dry',  clientName:'Apex Constructions',         jobDescription:'Backfill compaction — basement slab',         operatorName:'Sam Davies',   wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'4 Nexus Way, Southport QLD 4215',         startTime:d(8,0),        endTime:d(12,0),        status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b5',  assetNumber:'DZ04', hireType:'dry',  clientName:'City Infrastructure',         jobDescription:'Site clearing — greenfield stage',            operatorName:'Dave Wilson',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Industrial Estate, Narangba QLD 4504',    startTime:d(6,0),        endTime:d(14,0),        status:'Urgent',     swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b6',  assetNumber:'FL05', hireType:'dry',  clientName:'Warehouse Direct',            jobDescription:'Pallet racking install — Bay C',              operatorName:'Alex Morgan',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Lot 14 Warehouse Ct, Larapinta QLD 4110', startTime:d(9,0),        endTime:d(13,0),        status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b7',  assetNumber:'FL06', hireType:'dry',  clientName:'National Logistics',          jobDescription:'Heavy machinery unloading',                   operatorName:'Chris Evans',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'25 Gateway Dr, Yatala QLD 4207',          startTime:d(10,0),       endTime:d(14,30),       status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:true,  docketUploaded:false },
  { id:'b8',  assetNumber:'SC07', hireType:'dry',  clientName:'Urban Developers QLD',        jobDescription:'Facade maintenance — Level 4',                operatorName:'Tom Reed',     wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'101 Charlotte St, Brisbane QLD 4000',     startTime:d(8,0),        endTime:d(16,0),        status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b9',  assetNumber:'BM08', hireType:'dry',  clientName:'Sunshine Coast Council',      jobDescription:'Streetlight installation',                    operatorName:'Ryan Nash',    wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Maroochy Blvd, Maroochydore QLD 4558',    startTime:dOffset(-1,7,0), endTime:dOffset(-1,15,0), status:'Completed', swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pending',   contractSigned:true,  docketUploaded:false },
  { id:'b10', assetNumber:'CR09', hireType:'wet',  clientName:'Port Authority',              jobDescription:'Wharf beam placement',                        operatorName:'Luke Harris',  wetHireResources:[{role:'Operator',workerId:'W001',workerName:'Luke Harris',licenseType:'C1'},{role:'Dogman',workerId:'W012',workerName:'Brad Nguyen',licenseType:'DG'}], requiredLiftCapacity:28, siteAddress:'Fisherman Islands, Brisbane QLD 4178', startTime:dOffset(-1,6,30), endTime:dOffset(-1,16,0), status:'Invoiced', swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b11', assetNumber:'EX01', hireType:'wet',  clientName:'Lendlease Group',             jobDescription:'Retaining wall footings',                     operatorName:'John Smith',   wetHireResources:[{role:'Operator',workerId:'W002',workerName:'John Smith',licenseType:'C6'}],                                                           requiredLiftCapacity:0, siteAddress:'Queens Wharf, Brisbane QLD 4000',         startTime:dOffset(1,7,0),  endTime:dOffset(1,13,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b12', assetNumber:'DT10', hireType:'dry',  clientName:'Fulton Hogan',                jobDescription:'Spoil cartage — highway widening',             operatorName:'Mike Stone',   wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'M1 Pacific Motorway, Coomera QLD 4209',   startTime:dOffset(1,5,30), endTime:dOffset(1,14,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b13', assetNumber:'FL06', hireType:'dry',  clientName:'Mirvac Group',                jobDescription:'Steel module placement — Level 6',             operatorName:'Chris Evans',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'80 Ann St, Brisbane QLD 4000',            startTime:dOffset(2,8,0),  endTime:dOffset(2,13,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b14', assetNumber:'BM08', hireType:'dry',  clientName:'Multiplex Constructions',     jobDescription:'Signage installation — rooftop',               operatorName:'Ryan Nash',    wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'55 Eagle St, Brisbane QLD 4000',          startTime:dOffset(2,9,0),  endTime:dOffset(2,14,0),  status:'Urgent',     swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b15', assetNumber:'CR09', hireType:'wet',  clientName:'Queensland Rail',             jobDescription:'Bridge girder placement',                     operatorName:'Luke Harris',  wetHireResources:[{role:'Operator',workerId:'W001',workerName:'Luke Harris',licenseType:'C1'},{role:'Dogman',workerId:'W012',workerName:'Brad Nguyen',licenseType:'DG'}], requiredLiftCapacity:42, siteAddress:'Ipswich Motorway Rail Bridge, Gailes QLD 4300', startTime:dOffset(3,6,0), endTime:dOffset(3,18,0), status:'Scheduled', swmsStatus:'pending', preStartStatus:'pending', docketStatus:'pending', contractSigned:false, docketUploaded:false },
  { id:'b16', assetNumber:'EX02', hireType:'wet',  clientName:'Boral Limited',              jobDescription:'Quarry face excavation',                      operatorName:'Mark Johnson', wetHireResources:[{role:'Operator',workerId:'W003',workerName:'Mark Johnson',licenseType:'C2'}],                                                          requiredLiftCapacity:0, siteAddress:'Wacol Quarry, Brisbane QLD 4076',         startTime:dOffset(-2,7,0), endTime:dOffset(-2,15,0), status:'Invoiced',   swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b17', assetNumber:'DZ04', hireType:'dry',  clientName:'Hutchinson Builders',        jobDescription:'Sub-grade preparation',                       operatorName:'Dave Wilson',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Windsor Rd, Nundah QLD 4012',            startTime:dOffset(-2,6,30),endTime:dOffset(-2,14,0), status:'Completed',  swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b18', assetNumber:'CR09', hireType:'wet',  clientName:'Seymour Whyte Constructions',jobDescription:'Precast panel erection — Block B',             operatorName:'Luke Harris',  wetHireResources:[{role:'Operator',workerId:'W001',workerName:'Luke Harris',licenseType:'C1'},{role:'Dogman',workerId:'W013',workerName:"Kerry O'Brien",licenseType:'DG'}], requiredLiftCapacity:18, siteAddress:'Mater Hill, South Brisbane QLD 4101', startTime:dOffset(-3,7,0), endTime:dOffset(-3,17,0), status:'Invoiced', swmsStatus:'pushed', preStartStatus:'pushed', docketStatus:'pushed', contractSigned:true, docketUploaded:true },
  { id:'b19', assetNumber:'SK03', hireType:'dry',  clientName:'BMD Constructions',          jobDescription:'Trenching — stormwater main',                 operatorName:'Sam Davies',   wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Beaudesert Rd, Archerfield QLD 4108',    startTime:dOffset(-3,8,0), endTime:dOffset(-3,14,0), status:'Completed',  swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b20', assetNumber:'SC07', hireType:'dry',  clientName:'Aria Property Group',        jobDescription:'Window replacement — Levels 2-4',             operatorName:'Tom Reed',     wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'200 Mary St, Brisbane QLD 4000',          startTime:dOffset(-1,9,0), endTime:dOffset(-1,17,0), status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b21', assetNumber:'EX01', hireType:'wet',  clientName:'ADCO Constructions',         jobDescription:'Rock breaking — basement',                    operatorName:'John Smith',   wetHireResources:[{role:'Operator',workerId:'W002',workerName:'John Smith',licenseType:'C6'}],                                                           requiredLiftCapacity:0, siteAddress:'Coronation Dr, Milton QLD 4064',          startTime:dOffset(-1,6,30),endTime:dOffset(-1,13,0), status:'Invoiced',   swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b22', assetNumber:'DT10', hireType:'dry',  clientName:'Downer Group',               jobDescription:'Fill cartage — subdivision',                  operatorName:'Mike Stone',   wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Springfield Central QLD 4300',            startTime:dOffset(1,6,0),  endTime:dOffset(1,14,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b23', assetNumber:'CR09', hireType:'wet',  clientName:'Fulton Hogan',               jobDescription:'Overpass beam launch',                        operatorName:'Luke Harris',  wetHireResources:[{role:'Operator',workerId:'W001',workerName:'Luke Harris',licenseType:'C1'},{role:'Dogman',workerId:'W012',workerName:'Brad Nguyen',licenseType:'DG'}], requiredLiftCapacity:35, siteAddress:'Gateway Motorway Overpass, Nudgee QLD 4014', startTime:dOffset(1,7,0), endTime:dOffset(1,16,0), status:'Urgent', swmsStatus:'pending', preStartStatus:'pending', docketStatus:'pending', contractSigned:false, docketUploaded:false },
  { id:'b24', assetNumber:'BM08', hireType:'dry',  clientName:'Hansen Yuncken',             jobDescription:'Cladding install — south elevation',           operatorName:'Ryan Nash',    wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Bowen Hills QLD 4006',                    startTime:dOffset(1,14,0), endTime:dOffset(1,18,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b25', assetNumber:'FL05', hireType:'dry',  clientName:"Laing O'Rourke",             jobDescription:'Warehouse restocking run',                    operatorName:'Alex Morgan',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Acacia Ridge Distribution Centre QLD 4110',startTime:dOffset(2,7,0),  endTime:dOffset(2,11,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b26', assetNumber:'EX02', hireType:'wet',  clientName:'Roberts Co',                 jobDescription:'Footings excavation — Tower C',               operatorName:'Mark Johnson', wetHireResources:[{role:'Operator',workerId:'W003',workerName:'Mark Johnson',licenseType:'C2'}],                                                          requiredLiftCapacity:0, siteAddress:'Newstead QLD 4006',                       startTime:dOffset(2,6,30), endTime:dOffset(2,13,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b27', assetNumber:'SC07', hireType:'dry',  clientName:'Watpac Constructions',       jobDescription:'External painting — Level 5',                 operatorName:'Tom Reed',     wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'South Bank QLD 4101',                     startTime:dOffset(2,8,0),  endTime:dOffset(2,16,0),  status:'Urgent',     swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b28', assetNumber:'DZ04', hireType:'dry',  clientName:'Acciona Infrastructure',     jobDescription:'Road formation — Stage 3',                    operatorName:'Dave Wilson',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Logan Motorway Extension QLD 4131',       startTime:dOffset(3,6,30), endTime:dOffset(3,16,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b29', assetNumber:'FL06', hireType:'dry',  clientName:'CPB Contractors',            jobDescription:'Plant repositioning — depot',                  operatorName:'Chris Evans',  wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Eagle Farm QLD 4009',                     startTime:dOffset(3,9,0),  endTime:dOffset(3,14,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b30', assetNumber:'EX01', hireType:'wet',  clientName:'McConnell Dowell',           jobDescription:'Pipeline trench — DN600',                     operatorName:'John Smith',   wetHireResources:[{role:'Operator',workerId:'W002',workerName:'John Smith',licenseType:'C6'}],                                                           requiredLiftCapacity:0, siteAddress:'Toowong QLD 4066',                        startTime:dOffset(4,7,0),  endTime:dOffset(4,16,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
  { id:'b31', assetNumber:'SK03', hireType:'dry',  clientName:'John Holland Group',         jobDescription:'Backfill operations — platform',               operatorName:'Sam Davies',   wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Central Station Precinct QLD 4000',       startTime:dOffset(4,8,0),  endTime:dOffset(4,15,0),  status:'Invoiced',   swmsStatus:'pushed',    preStartStatus:'pushed',    docketStatus:'pushed',    contractSigned:true,  docketUploaded:true  },
  { id:'b32', assetNumber:'BM08', hireType:'dry',  clientName:'Probuild',                   jobDescription:'HVAC installation — rooftop',                 operatorName:'Ryan Nash',    wetHireResources:[],                                                                                                                                      requiredLiftCapacity:0, siteAddress:'Spring Hill QLD 4004',                    startTime:dOffset(5,7,30), endTime:dOffset(5,14,0),  status:'Scheduled',  swmsStatus:'pending',   preStartStatus:'pending',   docketStatus:'pending',   contractSigned:false, docketUploaded:false },
];

// Booking mutation functions
export function addBooking(booking) {
  bookings.push(booking);
}

export function updateBooking(updated) {
  const idx = bookings.findIndex(b => b.id === updated.id);
  if (idx >= 0) bookings[idx] = updated;
}

export function removeBooking(id) {
  bookings = bookings.filter(b => b.id !== id);
}

export function getBookingById(id) {
  return bookings.find(b => b.id === id) || null;
}

// Derived ASSET_HEX lookup rebuilt from assetRegistry
export function getAssetHex(assetId) {
  // Semantic overrides (status-driven)
  const semanticMap = {
    Urgent: '#dc2626',
  };
  if (semanticMap[assetId]) return semanticMap[assetId];
  const asset = assetRegistry.find(a => a.id === assetId);
  return asset ? asset.hex : '#475569';
}
