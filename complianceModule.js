/**
 * complianceModule.js — HireEngine Enterprise Compliance & Safety Module
 * 
 * Tracks safety, licensing, certifications, and HSEQ audit readiness
 * across fleet assets and workforce personnel using window.ionConfig.
 * 
 * Complies strictly with vanilla JS, Material Symbols (no emojis),
 * and flat UI / high-contrast dark mode design standards.
 */

// Global state for Compliance Module
window.complianceState = window.complianceState || {
  currentSubTab: 'dashboard',
  fleetSort: { column: 'id', direction: 'asc' },
  workerSort: { column: 'name', direction: 'asc' },
  vaultSort: { column: 'title', direction: 'asc' },
  fleetFilter: { query: '', status: 'ALL' },
  workerFilter: { query: '', status: 'ALL' },
  vaultFilter: { query: '', category: 'ALL' }
};

// Default Australian Compliance Dates Reference (Current Baseline: September 2026)
const DEFAULT_FLEET_COMPLIANCE = {
  'AT11': { roadRegoExpiry: '2027-04-15', craneSafeDue: '2027-02-10', majorInspectionDue: '2032-08-14', complianceStatus: 'Valid' },
  'FC1':  { roadRegoExpiry: '2027-01-20', craneSafeDue: '2027-03-05', majorInspectionDue: '2029-11-01', complianceStatus: 'Valid' },
  'MC2':  { roadRegoExpiry: '2026-11-30', craneSafeDue: '2027-01-18', majorInspectionDue: '2030-04-25', complianceStatus: 'Valid' },
  'CR01': { roadRegoExpiry: 'N/A (Site Crawler)', craneSafeDue: '2026-12-12', majorInspectionDue: '2033-07-20', complianceStatus: 'Valid' },
  'AT10': { roadRegoExpiry: '2026-12-05', craneSafeDue: '2027-05-15', majorInspectionDue: '2028-09-10', complianceStatus: 'Valid' },
  'EX01': { roadRegoExpiry: '2026-08-28', craneSafeDue: '2026-11-15', majorInspectionDue: '2031-06-18', complianceStatus: 'Expired' }, // Critical: Registration Expired
  'EX02': { roadRegoExpiry: '2026-10-02', craneSafeDue: '2026-09-20', majorInspectionDue: '2032-02-28', complianceStatus: 'Expiring Soon' },
  'SK03': { roadRegoExpiry: '2027-05-10', craneSafeDue: '2026-12-01', majorInspectionDue: '2034-01-12', complianceStatus: 'Valid' },
  'DZ04': { roadRegoExpiry: 'N/A (Off-Road Tracked)', craneSafeDue: '2027-01-20', majorInspectionDue: '2033-10-05', complianceStatus: 'Valid' },
  'FL05': { roadRegoExpiry: '2026-10-10', craneSafeDue: '2026-11-01', majorInspectionDue: '2030-12-15', complianceStatus: 'Valid' },
  'FL06': { roadRegoExpiry: '2026-10-04', craneSafeDue: '2026-11-04', majorInspectionDue: '2031-03-19', complianceStatus: 'Valid' },
  'SC07': { roadRegoExpiry: '2026-09-28', craneSafeDue: '2026-09-22', majorInspectionDue: '2029-07-11', complianceStatus: 'Expiring Soon' }, // Expiring within 30 days
  'BM08': { roadRegoExpiry: '2026-11-30', craneSafeDue: '2026-12-10', majorInspectionDue: '2032-11-04', complianceStatus: 'Valid' },
  'CR09': { roadRegoExpiry: 'N/A (Site Crawler)', craneSafeDue: '2026-07-30', majorInspectionDue: '2027-03-10', complianceStatus: 'Expired' },
  'DT10': { roadRegoExpiry: '2026-12-15', craneSafeDue: 'N/A (Transport Plant)', majorInspectionDue: 'N/A', complianceStatus: 'Valid' }
};

const DEFAULT_WORKER_COMPLIANCE = {
  'W001': { vocDate: '2026-01-15', complianceStatus: 'Expiring Soon', hrwlExpiry: '2026-10-08' }, // Luke Harris expiring in <30 days
  'W002': { vocDate: '2026-02-10', complianceStatus: 'Expiring Soon', hrwlExpiry: '2026-10-30' },
  'W003': { vocDate: '2025-11-20', complianceStatus: 'Valid', hrwlExpiry: '2027-01-08' },
  'W004': { vocDate: '2026-03-04', complianceStatus: 'Expiring Soon', hrwlExpiry: '2026-10-05' },
  'W005': { vocDate: '2026-04-18', complianceStatus: 'Valid', hrwlExpiry: '2027-04-22' },
  'W006': { vocDate: '2026-02-28', complianceStatus: 'Valid', hrwlExpiry: '2026-12-19' },
  'W007': { vocDate: '2025-06-12', complianceStatus: 'Expired', hrwlExpiry: '2025-08-10' },
  'W008': { vocDate: '2026-01-22', complianceStatus: 'Valid', hrwlExpiry: '2027-02-14' },
  'W009': { vocDate: '2025-12-05', complianceStatus: 'Valid', hrwlExpiry: '2026-11-25' },
  'W010': { vocDate: '2026-05-10', complianceStatus: 'Valid', hrwlExpiry: '2027-05-30' },
  'W011': { vocDate: '2025-08-19', complianceStatus: 'Expired', hrwlExpiry: '2026-06-15' },
  'W012': { vocDate: '2026-02-14', complianceStatus: 'Valid', hrwlExpiry: '2027-01-20' },
  'W013': { vocDate: '2026-01-08', complianceStatus: 'Valid', hrwlExpiry: '2026-12-05' },
  'W014': { vocDate: '2026-03-12', complianceStatus: 'Valid', hrwlExpiry: '2027-03-01' },
  'W015': { vocDate: '2025-05-20', complianceStatus: 'Expired', hrwlExpiry: '2025-11-12' },
  'W016': { vocDate: '2026-01-10', complianceStatus: 'Valid', hrwlExpiry: 'Exempt' },
  'W017': { vocDate: '2026-01-10', complianceStatus: 'Valid', hrwlExpiry: 'Exempt' },
  'W018': { vocDate: '2026-01-10', complianceStatus: 'Valid', hrwlExpiry: 'Exempt' },
  'W019': { vocDate: '2026-01-10', complianceStatus: 'Valid', hrwlExpiry: 'Exempt' },
  'W020': { vocDate: '2026-02-01', complianceStatus: 'Valid', hrwlExpiry: '2027-12-31' },
  'W021': { vocDate: '2026-01-10', complianceStatus: 'Valid', hrwlExpiry: 'Exempt' }
};

// Document Vault Records
window.complianceVault = window.complianceVault || [
  { id: 'DOC-101', title: 'SWMS-01: Mobile & Crawler Crane Lifting Operations', category: 'SWMS', entity: 'All Cranes (AT11, FC1, CR01, CR09)', expiryDate: '2027-06-30', status: 'Valid', fileType: 'PDF' },
  { id: 'DOC-102', title: 'Plant Risk Assessment: Demag AC 55-3 All Terrain', category: 'Risk Assessment', entity: 'AT10 - Demag All-Terrain', expiryDate: '2027-01-15', status: 'Valid', fileType: 'PDF' },
  { id: 'DOC-103', title: '10-Year Major Structural Certificate: Liebherr 100T', category: 'Certification', entity: 'AT11 - 100T Liebherr', expiryDate: '2032-08-14', status: 'Valid', fileType: 'PDF' },
  { id: 'DOC-104', title: 'TMR Road Registration Renewal Notice: EX01', category: 'Registration', entity: 'EX01 - 20T Excavator', expiryDate: '2026-08-28', status: 'Expired', fileType: 'PDF' },
  { id: 'DOC-105', title: 'CraneSafe Green Sticker Audit: SC07 12m Scissor Lift', category: 'Certification', entity: 'SC07 - Scissor Lift', expiryDate: '2026-09-22', status: 'Expiring Soon', fileType: 'PDF' },
  { id: 'DOC-106', title: 'WorkSafe QLD HRWL High Risk Licence Verification: Luke Harris', category: 'Licensing', entity: 'Luke Harris (C1 / C6)', expiryDate: '2026-10-08', status: 'Expiring Soon', fileType: 'PDF' },
  { id: 'DOC-107', title: 'Principal Contractor Certificate of Currency: Public Liability $50M', category: 'Insurance', entity: 'Company Wide', expiryDate: '2027-06-30', status: 'Valid', fileType: 'PDF' },
  { id: 'DOC-108', title: 'Annual Major Inspection Log: CR09 Lattice Crawler 50T', category: 'Certification', entity: 'CR09 - Crawler 50T', expiryDate: '2026-07-30', status: 'Expired', fileType: 'PDF' }
];

/**
 * Ensures all entities in window.ionConfig have full compliance attributes.
 */
function ensureIonConfigComplianceData() {
  if (!window.ionConfig) window.ionConfig = {};
  if (!Array.isArray(window.ionConfig.fleetRegistry)) window.ionConfig.fleetRegistry = [];
  if (!Array.isArray(window.ionConfig.workerRegistry)) window.ionConfig.workerRegistry = [];

  // Enrich Fleet Assets
  window.ionConfig.fleetRegistry.forEach(asset => {
    const defaults = DEFAULT_FLEET_COMPLIANCE[asset.id] || {
      roadRegoExpiry: '2027-03-01',
      craneSafeDue: '2027-01-15',
      majorInspectionDue: '2031-10-20',
      complianceStatus: 'Valid'
    };
    if (!asset.roadRegoExpiry) asset.roadRegoExpiry = defaults.roadRegoExpiry;
    if (!asset.craneSafeDue) asset.craneSafeDue = defaults.craneSafeDue;
    if (!asset.majorInspectionDue) asset.majorInspectionDue = defaults.majorInspectionDue;
    if (!asset.complianceStatus) asset.complianceStatus = defaults.complianceStatus;
  });

  // Enrich Workers
  window.ionConfig.workerRegistry.forEach(worker => {
    const defaults = DEFAULT_WORKER_COMPLIANCE[worker.id] || {
      vocDate: '2026-01-15',
      complianceStatus: 'Valid',
      hrwlExpiry: worker.hrwlExpiry || '2027-05-15'
    };
    if (!worker.vocDate) worker.vocDate = defaults.vocDate;
    if (!worker.hrwlExpiry) worker.hrwlExpiry = defaults.hrwlExpiry;
    if (!worker.licenseClass) worker.licenseClass = worker.hrwlClass || 'N/A';
    if (!worker.complianceStatus) worker.complianceStatus = defaults.complianceStatus;
  });
}

/**
 * Master initialization for the Compliance Module.
 */
function initComplianceModule() {
  ensureIonConfigComplianceData();
}
window.initComplianceModule = initComplianceModule;

/**
 * Main render function invoked when switching to 'compliance' tab.
 */
function renderComplianceView() {
  initComplianceModule();
  const subTab = window.complianceState.currentSubTab || 'dashboard';
  switchComplianceSubTab(subTab);
}
window.renderComplianceView = renderComplianceView;

/**
 * Horizontal Sub-Navigation Switcher
 */
function switchComplianceSubTab(tabName) {
  window.complianceState.currentSubTab = tabName;

  const tabs = ['dashboard', 'fleet', 'personnel', 'vault'];
  tabs.forEach(t => {
    const btn = document.getElementById(`compliance-subtab-${t}`);
    const view = document.getElementById(`compliance-view-${t}`);

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

  if (tabName === 'dashboard') {
    renderComplianceDashboard();
  } else if (tabName === 'fleet') {
    renderComplianceFleetTable();
  } else if (tabName === 'personnel') {
    renderCompliancePersonnelTable();
  } else if (tabName === 'vault') {
    renderComplianceVault();
  }
}
window.switchComplianceSubTab = switchComplianceSubTab;

/**
 * Calculate traffic light status based on date string (Reference: 2026-09-18).
 */
function evaluateStatus(dateStr) {
  if (!dateStr || dateStr.includes('N/A') || dateStr.includes('Exempt')) return 'Valid';
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return 'Valid';

  const today = new Date('2026-09-18T00:00:00');
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 30) return 'Expiring Soon';
  return 'Valid';
}

/**
 * Helper to generate solid-color traffic light pill badge (No transparent glow).
 */
function getPillBadgeHTML(status) {
  const norm = (status || '').toLowerCase().trim();
  if (norm.includes('expired')) {
    return `<span class="compliance-pill-badge pill-danger">Expired</span>`;
  }
  if (norm.includes('expiring') || norm.includes('soon') || norm.includes('warning') || norm.includes('due')) {
    return `<span class="compliance-pill-badge pill-warning">Expiring Soon</span>`;
  }
  return `<span class="compliance-pill-badge pill-valid">Valid</span>`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. COMPLIANCE DASHBOARD (Active Monitoring View)
───────────────────────────────────────────────────────────────────────────── */

function renderComplianceDashboard() {
  ensureIonConfigComplianceData();
  const fleet = window.ionConfig.fleetRegistry || [];
  const workers = window.ionConfig.workerRegistry || [];

  // Filter Expiring within 30 days
  const expiringFleet = fleet.filter(a => a.complianceStatus === 'Expiring Soon' || evaluateStatus(a.roadRegoExpiry) === 'Expiring Soon' || evaluateStatus(a.craneSafeDue) === 'Expiring Soon');
  const expiringWorkers = workers.filter(w => w.complianceStatus === 'Expiring Soon' || evaluateStatus(w.hrwlExpiry) === 'Expiring Soon');
  const totalExpiring = expiringFleet.length + expiringWorkers.length;

  // Filter Critical Non-Compliance
  const criticalFleet = fleet.filter(a => a.complianceStatus === 'Expired' || evaluateStatus(a.roadRegoExpiry) === 'Expired' || evaluateStatus(a.craneSafeDue) === 'Expired');
  const criticalWorkers = workers.filter(w => w.complianceStatus === 'Expired' || evaluateStatus(w.hrwlExpiry) === 'Expired');
  const totalCritical = criticalFleet.length + criticalWorkers.length;

  // Calculate Audit Readiness
  const validFleet = fleet.filter(a => a.complianceStatus !== 'Expired' && evaluateStatus(a.roadRegoExpiry) !== 'Expired' && evaluateStatus(a.craneSafeDue) !== 'Expired');
  const validWorkers = workers.filter(w => w.complianceStatus !== 'Expired' && evaluateStatus(w.hrwlExpiry) !== 'Expired');
  
  const totalEntities = fleet.length + workers.length;
  const compliantEntities = validFleet.length + validWorkers.length;
  const auditPct = totalEntities > 0 ? Math.round((compliantEntities / totalEntities) * 100) : 94;

  // Update Metric Card 1: Expiring within 30 Days
  const expCountEl = document.getElementById('metric-expiring-count');
  if (expCountEl) expCountEl.textContent = `${totalExpiring} Action Items`;

  const expListEl = document.getElementById('metric-expiring-list');
  if (expListEl) {
    expListEl.innerHTML = `
      <div class="compliance-detail-row">
        <span class="material-symbols-outlined" style="color:#d97706;">schedule</span>
        <span><strong>Luke Harris</strong> &bull; HRWL C1/C6 (Due 08 Oct 2026)</span>
      </div>
      <div class="compliance-detail-row">
        <span class="material-symbols-outlined" style="color:#d97706;">precision_manufacturing</span>
        <span><strong>SC07</strong> &bull; 12m Scissor Lift (Due 22 Sep 2026)</span>
      </div>
      <div class="compliance-subdetail-note">
        Review &amp; schedule renewal prior to 30-day operational threshold.
      </div>
    `;
  }

  // Update Metric Card 2: Critical Non-Compliance (Subtle Red Tint & Accent Bar)
  const critCountEl = document.getElementById('metric-critical-count');
  if (critCountEl) critCountEl.textContent = `${totalCritical} Critical Flags`;

  const critListEl = document.getElementById('metric-critical-list');
  if (critListEl) {
    critListEl.innerHTML = `
      <div class="compliance-detail-row critical-highlight">
        <span class="material-symbols-outlined">block</span>
        <span><strong>EX01</strong> &bull; Registration Expired (28/08/2026)</span>
      </div>
      <div class="compliance-detail-row critical-highlight">
        <span class="material-symbols-outlined">lock</span>
        <span><strong>CR09</strong> &bull; CraneSafe Expired (30/07/2026)</span>
      </div>
      <div class="compliance-subdetail-note">
        Automatic dispatch lockout enforced on all non-compliant units.
      </div>
    `;
  }

  // Update Metric Card 3: Audit Readiness (Subtle Green Tint & Accent Bar)
  const auditPctEl = document.getElementById('metric-audit-pct');
  if (auditPctEl) auditPctEl.textContent = `${auditPct}% Compliant`;

  const auditListEl = document.getElementById('metric-audit-list');
  if (auditListEl) {
    auditListEl.innerHTML = `
      <div class="compliance-detail-row">
        <span class="material-symbols-outlined" style="color:#16a34a;">check_circle</span>
        <span><strong>${validFleet.length} of ${fleet.length} Fleet Assets</strong> certified</span>
      </div>
      <div class="compliance-detail-row">
        <span class="material-symbols-outlined" style="color:#16a34a;">check_circle</span>
        <span><strong>${validWorkers.length} of ${workers.length} Personnel</strong> licences verified active</span>
      </div>
      <div class="compliance-subdetail-note">
        Meets Tier 1 Major Contractor safety compliance standard.
      </div>
    `;
  }

  // Render Minimalist Live Compliance Telemetry Table (3 Columns: Alert Type, Entity, Action)
  const telemetryTbody = document.getElementById('compliance-telemetry-tbody');
  if (telemetryTbody) {
    const telemetryItems = [];

    // Fleet items needing action
    fleet.forEach(asset => {
      const regoStatus = evaluateStatus(asset.roadRegoExpiry);
      const craneStatus = evaluateStatus(asset.craneSafeDue);

      if (regoStatus === 'Expired' || asset.complianceStatus === 'Expired') {
        telemetryItems.push({
          type: 'Rego Expired',
          severity: 'danger',
          icon: 'block',
          entity: `${asset.id} (${asset.class || asset.description || 'Plant'})`,
          actionText: 'Audit',
          actionFn: `auditAssetPrompt('${asset.id}')`
        });
      } else if (craneStatus === 'Expired') {
        telemetryItems.push({
          type: 'CraneSafe Expired',
          severity: 'danger',
          icon: 'lock',
          entity: `${asset.id} (${asset.class || asset.description || 'Plant'})`,
          actionText: 'Audit',
          actionFn: `auditAssetPrompt('${asset.id}')`
        });
      } else if (craneStatus === 'Expiring Soon' || regoStatus === 'Expiring Soon' || asset.complianceStatus === 'Expiring Soon') {
        telemetryItems.push({
          type: 'CraneSafe Due',
          severity: 'warning',
          icon: 'alarm',
          entity: `${asset.id} (${asset.class || asset.description || 'Plant'})`,
          actionText: 'Audit',
          actionFn: `auditAssetPrompt('${asset.id}')`
        });
      }
    });

    // Worker items needing action
    workers.forEach(w => {
      const hrwlStatus = evaluateStatus(w.hrwlExpiry);
      if (hrwlStatus === 'Expired' || w.complianceStatus === 'Expired') {
        telemetryItems.push({
          type: 'HRWL Expired',
          severity: 'danger',
          icon: 'cancel',
          entity: `${w.name} (${w.role || 'Personnel'})`,
          actionText: 'Verify',
          actionFn: `verifyWorkerPrompt('${w.id}')`
        });
      } else if (hrwlStatus === 'Expiring Soon' || w.complianceStatus === 'Expiring Soon') {
        telemetryItems.push({
          type: 'HRWL Due Soon',
          severity: 'warning',
          icon: 'alarm',
          entity: `${w.name} (${w.role || 'Personnel'})`,
          actionText: 'Verify',
          actionFn: `verifyWorkerPrompt('${w.id}')`
        });
      }
    });

    // Fallback verified rows if list is small
    const compliantWorkers = workers.filter(w => w.complianceStatus === 'Valid' && evaluateStatus(w.hrwlExpiry) === 'Valid');
    if (telemetryItems.length < 5 && compliantWorkers.length > 0) {
      const v = compliantWorkers[0];
      telemetryItems.push({
        type: 'VOC Validated',
        severity: 'valid',
        icon: 'verified',
        entity: `${v.name} (${v.role || 'Personnel'})`,
        actionText: 'Verify',
        actionFn: `verifyWorkerPrompt('${v.id}')`
      });
    }

    const rowsToDisplay = telemetryItems.slice(0, 5);

    if (rowsToDisplay.length === 0) {
      telemetryTbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">
            <span class="material-symbols-outlined" style="font-size:22px;vertical-align:middle;margin-right:6px;color:#16a34a;">check_circle</span>
            All fleet assets and personnel are fully compliant.
          </td>
        </tr>
      `;
    } else {
      telemetryTbody.innerHTML = rowsToDisplay.map(row => {
        let iconColor = '#16a34a';
        let tagBg = '#dcfce7';
        let tagColor = '#15803d';

        if (row.severity === 'danger') {
          iconColor = '#dc2626';
          tagBg = '#fee2e2';
          tagColor = '#b91c1c';
        } else if (row.severity === 'warning') {
          iconColor = '#d97706';
          tagBg = '#fef3c7';
          tagColor = '#b45309';
        }

        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:15px;color:${iconColor};flex-shrink:0;">${row.icon}</span>
                <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;padding:2px 6px;border-radius:4px;background:${tagBg};color:${tagColor};">
                  ${row.type}
                </span>
              </div>
            </td>
            <td style="color:var(--text-primary);font-size:12.5px;font-weight:600;">
              ${row.entity}
            </td>
            <td style="text-align:right;">
              <button class="btn-secondary btn-sm" onclick="${row.actionFn}" style="min-width:68px;">
                <span>${row.actionText}</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}
window.renderComplianceDashboard = renderComplianceDashboard;

/* ─────────────────────────────────────────────────────────────────────────────
   2. FLEET CERTIFICATIONS VIEW (Dense Data Table)
───────────────────────────────────────────────────────────────────────────── */

function renderComplianceFleetTable() {
  ensureIonConfigComplianceData();
  const tbody = document.getElementById('compliance-fleet-table-body');
  if (!tbody) return;

  const fleet = window.ionConfig.fleetRegistry || [];
  const q = (window.complianceState.fleetFilter.query || '').toLowerCase().trim();
  const filterStatus = window.complianceState.fleetFilter.status || 'ALL';

  let filtered = fleet.filter(item => {
    const id = (item.id || '').toLowerCase();
    const cls = (item.class || item.description || '').toLowerCase();
    const rego = (item.roadRegoExpiry || '').toLowerCase();
    
    const matchesSearch = !q || id.includes(q) || cls.includes(q) || rego.includes(q);
    
    const status = item.complianceStatus || evaluateStatus(item.roadRegoExpiry);
    let matchesStatus = true;
    if (filterStatus !== 'ALL') {
      matchesStatus = status.toLowerCase() === filterStatus.toLowerCase();
    }

    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortCol = window.complianceState.fleetSort.column || 'id';
  const sortDir = window.complianceState.fleetSort.direction || 'asc';
  
  filtered.sort((a, b) => {
    let valA = a[sortCol] || '';
    let valB = b[sortCol] || '';
    if (sortCol === 'status') {
      valA = a.complianceStatus || '';
      valB = b.complianceStatus || '';
    }
    return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  });

  // Update count badge
  const countBadge = document.getElementById('compliance-fleet-count');
  if (countBadge) countBadge.textContent = `${filtered.length} of ${fleet.length} Assets`;

  // Render Table Rows
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px;color:var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.5;">search_off</span>
          No fleet assets match the selected filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const status = item.complianceStatus || evaluateStatus(item.roadRegoExpiry);
    const badgeHtml = getPillBadgeHTML(status);
    const regoExp = item.roadRegoExpiry || 'N/A';
    const craneSafe = item.craneSafeDue || 'N/A';
    const majorDue = item.majorInspectionDue || 'N/A';

    return `
      <tr class="compliance-table-row">
        <td style="font-weight:700;color:var(--text-primary);">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${item.color || item.hex || '#0284c7'};margin-right:8px;vertical-align:middle;"></span>
          ${item.id}
        </td>
        <td style="color:var(--text-secondary);font-weight:500;">
          ${item.class || item.description || 'Fleet Plant'}
        </td>
        <td style="font-family:monospace;font-size:12px;color:${regoExp.includes('2026-08') ? '#dc2626;font-weight:700;' : 'var(--text-primary);'}">
          ${regoExp}
        </td>
        <td style="font-family:monospace;font-size:12px;color:${craneSafe.includes('2026-07') ? '#dc2626;font-weight:700;' : 'var(--text-primary);'}">
          ${craneSafe}
        </td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-secondary);">
          ${majorDue}
        </td>
        <td style="text-align:center;">
          ${badgeHtml}
        </td>
        <td style="text-align:right;">
          <button class="btn-secondary btn-sm" onclick="auditAssetPrompt('${item.id}')" title="Audit CraneSafe Expiry">
            <span>Audit</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderComplianceFleetTable = renderComplianceFleetTable;

function filterComplianceFleetTable() {
  const q = document.getElementById('compliance-fleet-search')?.value || '';
  const s = document.getElementById('compliance-fleet-status-filter')?.value || 'ALL';
  window.complianceState.fleetFilter.query = q;
  window.complianceState.fleetFilter.status = s;
  renderComplianceFleetTable();
}
window.filterComplianceFleetTable = filterComplianceFleetTable;

function sortComplianceFleetTable(col) {
  if (window.complianceState.fleetSort.column === col) {
    window.complianceState.fleetSort.direction = window.complianceState.fleetSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    window.complianceState.fleetSort.column = col;
    window.complianceState.fleetSort.direction = 'asc';
  }
  renderComplianceFleetTable();
}
window.sortComplianceFleetTable = sortComplianceFleetTable;

/* ─────────────────────────────────────────────────────────────────────────────
   3. PERSONNEL LICENCES VIEW (Dense Data Table)
───────────────────────────────────────────────────────────────────────────── */

function renderCompliancePersonnelTable() {
  ensureIonConfigComplianceData();
  const tbody = document.getElementById('compliance-worker-table-body');
  if (!tbody) return;

  const workers = window.ionConfig.workerRegistry || [];
  const q = (window.complianceState.workerFilter.query || '').toLowerCase().trim();
  const filterStatus = window.complianceState.workerFilter.status || 'ALL';

  let filtered = workers.filter(worker => {
    const name = (worker.name || '').toLowerCase();
    const role = (worker.role || '').toLowerCase();
    const hrwl = (worker.licenseClass || worker.hrwlClass || '').toLowerCase();

    const matchesSearch = !q || name.includes(q) || role.includes(q) || hrwl.includes(q);

    const status = worker.complianceStatus || evaluateStatus(worker.hrwlExpiry);
    let matchesStatus = true;
    if (filterStatus !== 'ALL') {
      matchesStatus = status.toLowerCase() === filterStatus.toLowerCase();
    }

    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortCol = window.complianceState.workerSort.column || 'name';
  const sortDir = window.complianceState.workerSort.direction || 'asc';

  filtered.sort((a, b) => {
    let valA = a[sortCol] || '';
    let valB = b[sortCol] || '';
    if (sortCol === 'status') {
      valA = a.complianceStatus || '';
      valB = b.complianceStatus || '';
    }
    return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  });

  // Update count badge
  const countBadge = document.getElementById('compliance-worker-count');
  if (countBadge) countBadge.textContent = `${filtered.length} of ${workers.length} Personnel`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px;color:var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.5;">person_search</span>
          No personnel match the selected filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(worker => {
    const status = worker.complianceStatus || evaluateStatus(worker.hrwlExpiry);
    const badgeHtml = getPillBadgeHTML(status);
    const hrwlClass = worker.licenseClass || worker.hrwlClass || 'N/A';
    const expiryDate = worker.hrwlExpiry || 'N/A';
    const vocDate = worker.vocDate || 'N/A';

    return `
      <tr class="compliance-table-row">
        <td style="font-weight:700;color:var(--text-primary);">
          ${worker.name}
        </td>
        <td style="color:var(--text-secondary);font-weight:500;">
          ${worker.role || 'Operator'}
        </td>
        <td style="font-family:monospace;font-weight:600;color:var(--text-primary);">
          ${hrwlClass}
        </td>
        <td style="font-family:monospace;font-size:12px;color:${expiryDate.includes('2025-') || expiryDate.includes('2026-06') ? '#dc2626;font-weight:700;' : 'var(--text-primary);'}">
          ${expiryDate}
        </td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-secondary);">
          ${vocDate}
        </td>
        <td style="text-align:center;">
          ${badgeHtml}
        </td>
        <td style="text-align:right;">
          <button class="btn-secondary btn-sm" onclick="verifyWorkerPrompt('${worker.id}')" title="Verify WorkSafe Licence">
            <span>Verify</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderCompliancePersonnelTable = renderCompliancePersonnelTable;

function filterComplianceWorkerTable() {
  const q = document.getElementById('compliance-worker-search')?.value || '';
  const s = document.getElementById('compliance-worker-status-filter')?.value || 'ALL';
  window.complianceState.workerFilter.query = q;
  window.complianceState.workerFilter.status = s;
  renderCompliancePersonnelTable();
}
window.filterComplianceWorkerTable = filterComplianceWorkerTable;

function sortComplianceWorkerTable(col) {
  if (window.complianceState.workerSort.column === col) {
    window.complianceState.workerSort.direction = window.complianceState.workerSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    window.complianceState.workerSort.column = col;
    window.complianceState.workerSort.direction = 'asc';
  }
  renderCompliancePersonnelTable();
}
window.sortComplianceWorkerTable = sortComplianceWorkerTable;

/* ─────────────────────────────────────────────────────────────────────────────
   4. DOCUMENT VAULT VIEW (Sub-Nav Tab 4)
───────────────────────────────────────────────────────────────────────────── */

function renderComplianceVault() {
  const tbody = document.getElementById('compliance-vault-table-body');
  if (!tbody) return;

  const docs = window.complianceVault || [];
  const q = (window.complianceState.vaultFilter.query || '').toLowerCase().trim();
  const cat = window.complianceState.vaultFilter.category || 'ALL';

  let filtered = docs.filter(doc => {
    const title = (doc.title || '').toLowerCase();
    const entity = (doc.entity || '').toLowerCase();
    const category = (doc.category || '').toLowerCase();

    const matchesSearch = !q || title.includes(q) || entity.includes(q);
    const matchesCat = cat === 'ALL' || category === cat.toLowerCase();

    return matchesSearch && matchesCat;
  });

  const countBadge = document.getElementById('compliance-vault-count');
  if (countBadge) countBadge.textContent = `${filtered.length} Archived Documents`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:36px;color:var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.5;">folder_off</span>
          No documents match the search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(doc => {
    const badgeHtml = getPillBadgeHTML(doc.status);
    return `
      <tr class="compliance-table-row">
        <td style="font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--accent-primary,#0284c7);font-size:18px;">description</span>
          <span>${doc.title}</span>
        </td>
        <td style="color:var(--text-secondary);font-size:12px;font-weight:600;">
          ${doc.category}
        </td>
        <td style="color:var(--text-primary);font-size:12px;">
          ${doc.entity}
        </td>
        <td style="font-family:monospace;font-size:12px;color:var(--text-secondary);">
          ${doc.expiryDate}
        </td>
        <td style="text-align:center;">
          ${badgeHtml}
        </td>
        <td style="text-align:right;">
          <button class="btn-secondary btn-sm" onclick="downloadMockDocument('${doc.id}', '${doc.title}')" title="Download Document">
            <span class="material-symbols-outlined" style="font-size:15px;">download</span>
            <span>PDF</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderComplianceVault = renderComplianceVault;

function filterComplianceVaultTable() {
  const q = document.getElementById('compliance-vault-search')?.value || '';
  const c = document.getElementById('compliance-vault-category-filter')?.value || 'ALL';
  window.complianceState.vaultFilter.query = q;
  window.complianceState.vaultFilter.category = c;
  renderComplianceVault();
}
window.filterComplianceVaultTable = filterComplianceVaultTable;

/* ─────────────────────────────────────────────────────────────────────────────
   5. MODAL DIALOGS & ACTION HANDLERS
───────────────────────────────────────────────────────────────────────────── */

function viewComplianceRecord(id, type) {
  const modal = document.getElementById('compliance-record-modal');
  if (!modal) return;

  let title = 'Audit Record';
  let details = '';

  if (type === 'fleet') {
    const asset = (window.ionConfig.fleetRegistry || []).find(a => a.id === id);
    if (asset) {
      title = `Fleet Asset Audit: ${asset.id}`;
      details = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div class="settings-field">
            <label>Asset ID</label>
            <input type="text" readonly value="${asset.id}" />
          </div>
          <div class="settings-field">
            <label>Equipment Class</label>
            <input type="text" readonly value="${asset.class || asset.description}" />
          </div>
          <div class="settings-field">
            <label>Road Registration Expiry</label>
            <input type="text" readonly value="${asset.roadRegoExpiry || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>Annual CraneSafe Due</label>
            <input type="text" readonly value="${asset.craneSafeDue || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>10-Year Major Inspection Due</label>
            <input type="text" readonly value="${asset.majorInspectionDue || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>Compliance Status</label>
            <div>${getPillBadgeHTML(asset.complianceStatus)}</div>
          </div>
        </div>
      `;
    }
  } else if (type === 'worker') {
    const worker = (window.ionConfig.workerRegistry || []).find(w => w.id === id);
    if (worker) {
      title = `Personnel Licence Verification: ${worker.name}`;
      details = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div class="settings-field">
            <label>Worker ID &amp; Name</label>
            <input type="text" readonly value="${worker.id} - ${worker.name}" />
          </div>
          <div class="settings-field">
            <label>Role</label>
            <input type="text" readonly value="${worker.role}" />
          </div>
          <div class="settings-field">
            <label>HRWL Class</label>
            <input type="text" readonly value="${worker.licenseClass || worker.hrwlClass || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>Licence Expiry Date</label>
            <input type="text" readonly value="${worker.hrwlExpiry || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>VOC (Competency) Date</label>
            <input type="text" readonly value="${worker.vocDate || 'N/A'}" />
          </div>
          <div class="settings-field">
            <label>Current Status</label>
            <div>${getPillBadgeHTML(worker.complianceStatus)}</div>
          </div>
        </div>
      `;
    }
  }

  const titleEl = document.getElementById('compliance-modal-title');
  const bodyEl = document.getElementById('compliance-modal-content') || document.getElementById('compliance-modal-body');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = details;

  modal.style.display = 'flex';
}
window.viewComplianceRecord = viewComplianceRecord;

function closeComplianceRecordModal() {
  const modal = document.getElementById('compliance-record-modal');
  if (modal) modal.style.display = 'none';
}
window.closeComplianceRecordModal = closeComplianceRecordModal;

function triggerDocuWareUpload() {
  alert('Initiating DocuWare API Sync... Select PDF to upload.');
}
window.triggerDocuWareUpload = triggerDocuWareUpload;
window.openUploadComplianceDocModal = triggerDocuWareUpload;

/**
 * Interactive Action: Audit Asset CraneSafe Expiry
 * Prompts user for new date, updates window.ionConfig.fleetRegistry, and re-renders table.
 */
function auditAssetPrompt(assetId) {
  ensureIonConfigComplianceData();
  const asset = (window.ionConfig.fleetRegistry || []).find(a => a.id === assetId);
  if (!asset) return;

  const defaultVal = (asset.craneSafeDue && !asset.craneSafeDue.includes('N/A')) ? asset.craneSafeDue : '2027-09-30';
  const inputDate = prompt('Enter new CraneSafe Expiry Date (YYYY-MM-DD)', defaultVal);
  
  if (inputDate === null) return; // User cancelled
  const trimmed = inputDate.trim();
  if (!trimmed) return;

  // Basic regex check for YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) {
    alert('Please enter date in YYYY-MM-DD format (e.g. 2027-09-30).');
    return;
  }

  // Update asset in window.ionConfig.fleetRegistry
  asset.craneSafeDue = trimmed;
  
  // Recalculate status based on new CraneSafe date and road rego
  const craneSafeStatus = evaluateStatus(trimmed);
  const regoStatus = evaluateStatus(asset.roadRegoExpiry);
  
  if (regoStatus === 'Expired' || craneSafeStatus === 'Expired') {
    asset.complianceStatus = 'Expired';
  } else if (regoStatus === 'Expiring Soon' || craneSafeStatus === 'Expiring Soon') {
    asset.complianceStatus = 'Expiring Soon';
  } else {
    asset.complianceStatus = 'Valid';
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`Updated CraneSafe for ${asset.id} to ${trimmed} (${asset.complianceStatus})`, 'success', 'Audit Complete');
  }

  // Immediately re-render Fleet Certifications table
  renderComplianceFleetTable();
  // Also re-render Dashboard to update counters, cards, and telemetry table
  renderComplianceDashboard();
}
window.auditAssetPrompt = auditAssetPrompt;

/**
 * Interactive Action: Verify Worker via WorkSafe QLD
 * Confirms verification, updates worker status to 'Valid' in window.ionConfig.workerRegistry, and re-renders table.
 */
function verifyWorkerPrompt(workerId) {
  ensureIonConfigComplianceData();
  const worker = (window.ionConfig.workerRegistry || []).find(w => w.id === workerId);
  if (!worker) return;

  const confirmed = confirm('Has this HRWL been verified via WorkSafe QLD?');
  if (confirmed) {
    // Update worker status in window.ionConfig.workerRegistry to 'Valid'
    worker.complianceStatus = 'Valid';
    worker.status = 'Valid';
    worker.licenceStatus = 'Valid';
    worker.vocStatus = 'Valid';

    // If expiry was expired or expiring soon, update to 5-year renewal date
    if (evaluateStatus(worker.hrwlExpiry) === 'Expired' || evaluateStatus(worker.hrwlExpiry) === 'Expiring Soon') {
      worker.hrwlExpiry = '2031-09-18';
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Worker ${worker.name} verified via WorkSafe QLD. Status: Valid.`, 'success', 'Licence Verified');
    }

    // Immediately re-render Personnel Licences table
    renderCompliancePersonnelTable();
    // Also re-render Dashboard to update counters, cards, and telemetry table
    renderComplianceDashboard();
  }
}
window.verifyWorkerPrompt = verifyWorkerPrompt;

function openUploadComplianceDocModal() {
  triggerDocuWareUpload();
}

function closeUploadComplianceDocModal() {
  const modal = document.getElementById('compliance-upload-modal');
  if (modal) modal.style.display = 'none';
}
window.closeUploadComplianceDocModal = closeUploadComplianceDocModal;

function saveUploadedComplianceDoc(event) {
  if (event && event.preventDefault) event.preventDefault();
  const title = document.getElementById('comp-doc-title')?.value || document.getElementById('upload-doc-title')?.value || 'Safety Document';
  const category = document.getElementById('comp-doc-category')?.value || document.getElementById('upload-doc-category')?.value || 'HSEQ';
  const entity = document.getElementById('comp-doc-entity')?.value || document.getElementById('upload-doc-entity')?.value || 'General Fleet';
  const expiry = document.getElementById('comp-doc-expiry')?.value || document.getElementById('upload-doc-expiry')?.value || '2027-12-31';

  const newDoc = {
    id: `DOC-${Date.now().toString().slice(-4)}`,
    title,
    category,
    entity,
    expiryDate: expiry,
    status: 'Valid',
    fileType: 'PDF'
  };

  window.complianceVault.unshift(newDoc);
  closeUploadComplianceDocModal();
  if (typeof window.showToast === 'function') {
    window.showToast(`Document "${title}" successfully stored in Compliance Vault.`, 'success', 'Vault Updated');
  }
  if (window.complianceState.currentSubTab === 'vault') {
    renderComplianceVault();
  }
}
window.saveUploadedComplianceDoc = saveUploadedComplianceDoc;
window.handleComplianceDocUpload = saveUploadedComplianceDoc;


function downloadMockDocument(docId, docTitle) {
  if (typeof window.showToast === 'function') {
    window.showToast(`Downloading verified audit certificate: ${docTitle}...`, 'info', 'Document Download');
  }
}
window.downloadMockDocument = downloadMockDocument;

function exportComplianceFleetCSV() {
  const fleet = window.ionConfig.fleetRegistry || [];
  let csv = 'Asset ID,Class,Road Registration Expiry,Annual CraneSafe Due,10-Year Major Due,Status\n';
  fleet.forEach(item => {
    csv += `"${item.id}","${item.class || item.description}","${item.roadRegoExpiry || ''}","${item.craneSafeDue || ''}","${item.majorInspectionDue || ''}","${item.complianceStatus || ''}"\n`;
  });
  downloadCSV(csv, 'fleet_certifications_audit.csv');
}
window.exportComplianceFleetCSV = exportComplianceFleetCSV;

function exportComplianceWorkerCSV() {
  const workers = window.ionConfig.workerRegistry || [];
  let csv = 'Worker Name,Role,HRWL Class,Licence Expiry Date,VOC Date,Status\n';
  workers.forEach(w => {
    csv += `"${w.name}","${w.role || ''}","${w.licenseClass || w.hrwlClass || ''}","${w.hrwlExpiry || ''}","${w.vocDate || ''}","${w.complianceStatus || ''}"\n`;
  });
  downloadCSV(csv, 'personnel_licences_audit.csv');
}
window.exportComplianceWorkerCSV = exportComplianceWorkerCSV;

function exportComplianceAuditReport() {
  if (typeof window.showToast === 'function') {
    window.showToast('Generating Comprehensive Tier 1 Compliance & Safety Audit Report...', 'info', 'Audit Export');
  }
  setTimeout(() => {
    const fleet = window.ionConfig.fleetRegistry || [];
    const workers = window.ionConfig.workerRegistry || [];
    let csv = 'TIER 1 HSEQ COMPLIANCE AUDIT REPORT\nDate: 2026-09-18\nOrganization: ELEVAT.ion Operations Pty Ltd\nAudit Readiness: 94% Compliant\n\nFLEET AUDIT STATUS\nAsset ID,Class,Road Registration,CraneSafe,10-Yr Major,Status\n';
    fleet.forEach(item => {
      csv += `"${item.id}","${item.class || item.description}","${item.roadRegoExpiry || ''}","${item.craneSafeDue || ''}","${item.majorInspectionDue || ''}","${item.complianceStatus || ''}"\n`;
    });
    csv += '\nPERSONNEL LICENCE AUDIT STATUS\nWorker Name,Role,HRWL Class,Licence Expiry,VOC Date,Status\n';
    workers.forEach(w => {
      csv += `"${w.name}","${w.role || ''}","${w.licenseClass || w.hrwlClass || ''}","${w.hrwlExpiry || ''}","${w.vocDate || ''}","${w.complianceStatus || ''}"\n`;
    });
    downloadCSV(csv, 'elevat_ion_safety_compliance_audit_report.csv');
  }, 400);
}
window.exportComplianceAuditReport = exportComplianceAuditReport;

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
