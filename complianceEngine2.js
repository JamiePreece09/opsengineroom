/**
 * complianceEngine.js — HireEngine Intelligent Compliance & Certification Engine
 *
 * Validates dispatch operations against 8 tiered safety rules based on:
 *   - Asset registration and certification status
 *   - Australian High Risk Work Licence (HRWL) codes for crane operators
 *   - Rigging licence requirements for dogmen and riggers
 *   - Crane load capacity against job requirements
 *   - Worker double-booking detection
 *
 * Validation severity:
 *   HARD BLOCK — dispatch is prevented. User cannot override.
 *   WARNING    — dispatch is permitted after acknowledged override with mandatory reason.
 *
 * Australian HRWL Reference (Safe Work Australia — Model WHS Regulations):
 *   CN  — Non-slewing mobile crane, capacity not exceeding 3 tonnes
 *   C2  — Non-slewing mobile crane, capacity exceeding 3 tonnes
 *   C6  — Slewing mobile crane, capacity not exceeding 20 tonnes
 *   C1  — Slewing mobile crane, capacity exceeding 20 tonnes
 *   CO  — Bridge and gantry crane
 *   DG  — Dogging (licence to sling and direct crane operator)
 *   RB  — Basic Rigging
 *   RI  — Intermediate Rigging
 *   RA  — Advanced Rigging
 *
 * Licence hierarchy (higher class satisfies lower class requirements):
 *   Crane: C1 satisfies C6, C2, CN. C6 satisfies C2, CN. C2 satisfies CN.
 *   Rigging: RA satisfies RI, RB, DG. RI satisfies RB, DG. RB satisfies DG.
 */

import {
  complianceRegistry,
  craneCapabilityRegistry,
  workerRegistry,
  bookings,
  getLicenseStatus,
  daysUntilExpiry,
  RIGGING_LICENSE_TYPES,
} from './dataModels2.js';

// ─── LICENSE HIERARCHY TABLES ────────────────────────────────────────────────

/**
 * For each required crane license, lists all licenses that satisfy it
 * (including the license itself and all higher-tier licenses).
 */
const CRANE_LICENSE_SATISFIES = {
  CN: ['CN', 'C2', 'C6', 'C1'],  // any crane license works for ≤3T non-slewing
  C2: ['C2', 'C1'],               // C2 or C1 for >3T non-slewing
  C6: ['C6', 'C1'],               // C6 or C1 for ≤20T slewing
  C1: ['C1'],                     // C1 only for >20T slewing
  CO: ['CO'],                     // CO only for bridge/gantry
};

/**
 * For each required rigging license, lists all licenses that satisfy it.
 */
const RIGGING_LICENSE_SATISFIES = {
  DG: ['DG', 'RB', 'RI', 'RA'],
  RB: ['RB', 'RI', 'RA'],
  RI: ['RI', 'RA'],
  RA: ['RA'],
};

// ─── VALIDATION RESULT SHAPE ─────────────────────────────────────────────────

/**
 * Creates an empty validation result.
 * @returns {{ valid: boolean, hardBlocks: Array, warnings: Array }}
 */
function createResult() {
  return { valid: true, hardBlocks: [], warnings: [] };
}

/**
 * Adds a hard block to a result (marks it invalid).
 */
function addBlock(result, code, message, context = {}) {
  result.valid = false;
  result.hardBlocks.push({ code, message, ...context });
}

/**
 * Adds a warning to a result (does not invalidate).
 */
function addWarning(result, code, message, context = {}) {
  result.warnings.push({ code, message, ...context });
}

// ─── COMPLIANCE ENGINE ───────────────────────────────────────────────────────

export const ComplianceEngine = {

  /**
   * Master validation entry point.
   * Runs all 8 compliance rules against a proposed booking.
   *
   * @param {object} booking - the proposed booking object (not yet persisted)
   * @param {string|null} editId - if editing, the existing booking's ID (excluded from overlap check)
   * @returns {{ valid: boolean, hardBlocks: Array, warnings: Array }}
   */
  validateDispatch(booking, editId = null) {
    const result = createResult();

    // Rule 1 — Asset certification must not be expired (HARD BLOCK)
    this._checkAssetCertification(booking, result);

    // Rule 2 — Asset service due within 7 days (WARNING)
    this._checkAssetServiceDue(booking, result);

    // Rules 3–7 — Wet hire specific checks
    if (booking.hireType === 'wet') {
      // Rule 3 — Crane capacity vs. job requirement (HARD BLOCK for cranes)
      this._checkCraneCapacity(booking, result);

      // Rule 4 — Operator holds a valid, current HRWL for this crane (HARD BLOCK)
      this._checkOperatorLicense(booking, result);

      // Rule 5 — Dogman/rigger holds a valid rigging licence (HARD BLOCK)
      this._checkRiggingLicense(booking, result);

      // Rule 6 — Worker licence expiring within 30 days (WARNING)
      this._checkLicenseExpiry(booking, result);

      // Rule 7 — Worker double-booking detection (WARNING)
      this._checkWorkerDoubleBooking(booking, editId, result);
    }

    // Rule 8 — Asset scheduling overlap (HARD BLOCK) — only if no editId conflict
    this._checkAssetOverlap(booking, editId, result);

    return result;
  },

  // ─── RULE 1: Asset Certification ─────────────────────────────────────────

  _checkAssetCertification(booking, result) {
    const comp = complianceRegistry[booking.assetNumber];
    if (!comp) return; // No record — permit with warning
    if (comp.status === 'expired') {
      addBlock(result, 'ASSET_CERT_EXPIRED', [
        `Asset ${booking.assetNumber} (Rego: ${comp.rego}) has an EXPIRED safety certificate.`,
        `Certificate expiry: ${comp.certDate}.`,
        `Dispatch is locked until a renewed certificate is uploaded and indexed in the DocuWare Safety Cabinet.`,
        `Contact your compliance officer to initiate certificate renewal.`,
      ].join(' '), { assetId: booking.assetNumber, rego: comp.rego, expiry: comp.certDate });
    }
  },

  // ─── RULE 2: Asset Service Due ────────────────────────────────────────────

  _checkAssetServiceDue(booking, result) {
    const comp = complianceRegistry[booking.assetNumber];
    if (!comp || !comp.nextServiceDue) return;
    const days = daysUntilExpiry(comp.nextServiceDue);
    if (days > 0 && days <= 7) {
      addWarning(result, 'ASSET_SERVICE_IMMINENT', [
        `Asset ${booking.assetNumber} is due for scheduled service in ${days} day${days !== 1 ? 's' : ''} (${comp.nextServiceDue}).`,
        `Confirm the asset is fit for this dispatch and schedule the service immediately after this job.`,
      ].join(' '), { assetId: booking.assetNumber, daysRemaining: days });
    } else if (days <= 0 && comp.status !== 'expired') {
      // Overdue service but cert not flagged as expired — borderline warning
      addWarning(result, 'ASSET_SERVICE_OVERDUE', [
        `Asset ${booking.assetNumber} scheduled service is overdue (was due ${comp.nextServiceDue}).`,
        `Inspect the asset before dispatch and raise a service booking immediately.`,
      ].join(' '), { assetId: booking.assetNumber });
    }
  },

  // ─── RULE 3: Crane Capacity ───────────────────────────────────────────────

  _checkCraneCapacity(booking, result) {
    const craneCap = craneCapabilityRegistry[booking.assetNumber];
    if (!craneCap) return; // Not a crane — skip
    const required = Number(booking.requiredLiftCapacity) || 0;
    if (required > craneCap.maxLiftCapacity) {
      addBlock(result, 'CRANE_CAPACITY_INSUFFICIENT', [
        `Required lift capacity (${required}T) exceeds the safe working load of ${booking.assetNumber}`,
        `(maximum capacity: ${craneCap.maxLiftCapacity}T at minimum radius).`,
        `Select a higher-capacity crane or obtain an engineered lift plan demonstrating the reduced radius`,
        `and confirm SWL with the licenced dogman before proceeding.`,
      ].join(' '), {
        assetId: booking.assetNumber,
        required,
        maxCapacity: craneCap.maxLiftCapacity,
      });
    }
  },

  // ─── RULE 4: Operator HRWL Validation ────────────────────────────────────

  _checkOperatorLicense(booking, result) {
    const resources = booking.wetHireResources || [];
    const operatorResource = resources.find(r => r.role === 'Operator');

    // No operator assigned at all
    if (!operatorResource || !operatorResource.workerId) {
      addBlock(result, 'NO_OPERATOR_ASSIGNED', [
        `Wet hire dispatch requires a certified crane operator.`,
        `No operator has been assigned to this booking.`,
        `Assign a worker holding the appropriate HRWL (C1, C6, C2, CN, or CO) before dispatching.`,
      ].join(' '));
      return;
    }

    const worker = workerRegistry.find(w => w.id === operatorResource.workerId);
    if (!worker) {
      addBlock(result, 'OPERATOR_NOT_FOUND', `Operator record (ID: ${operatorResource.workerId}) not found in the worker registry. Update the booking and assign a registered worker.`);
      return;
    }

    // Determine the required license types for this asset
    const craneCap = craneCapabilityRegistry[booking.assetNumber];
    const requiredLicenses = craneCap ? craneCap.requiredOperatorLicenses : ['C6', 'C1'];

    // Build the set of all license types that satisfy any required license
    const satisfyingSet = new Set();
    requiredLicenses.forEach(req => {
      (CRANE_LICENSE_SATISFIES[req] || [req]).forEach(l => satisfyingSet.add(l));
    });

    // Check worker's licenses — at least one must be valid (not expired) and satisfying
    const validSatisfying = worker.licenses.filter(l => {
      const status = getLicenseStatus(l.expiry);
      return satisfyingSet.has(l.type) && status !== 'expired';
    });

    if (validSatisfying.length === 0) {
      // Check if they HAVE the license but it's expired
      const expiredSatisfying = worker.licenses.filter(l => satisfyingSet.has(l.type));
      const expiredDetails = expiredSatisfying.length > 0
        ? ` (${worker.name} holds licence ${expiredSatisfying[0].type} but it expired on ${expiredSatisfying[0].expiry}).`
        : '';

      addBlock(result, 'OPERATOR_LICENSE_INVALID', [
        `Operator ${worker.name} does not hold a current HRWL authorising operation of ${booking.assetNumber}.`,
        `Required: ${requiredLicenses.join(' or ')}.${expiredDetails}`,
        `Arrange licence renewal or assign a different operator with a current, valid HRWL.`,
      ].join(' '), {
        workerId: worker.id,
        workerName: worker.name,
        requiredLicenses,
      });
    }
  },

  // ─── RULE 5: Dogging / Rigging Licence Validation ────────────────────────

  _checkRiggingLicense(booking, result) {
    const craneCap = craneCapabilityRegistry[booking.assetNumber];

    // Only check if the asset is a crane requiring a dogman
    if (!craneCap || !craneCap.riggingMandatory) return;

    const resources = booking.wetHireResources || [];
    const riggingResource = resources.find(r => r.role === 'Dogman' || r.role === 'Rigger');

    if (!riggingResource || !riggingResource.workerId) {
      addBlock(result, 'NO_DOGMAN_ASSIGNED', [
        `Crane operations (${booking.assetNumber}) require a licenced dogman or rigger on-site by law.`,
        `No dogman/rigger has been assigned to this booking.`,
        `Assign a worker holding a valid DG, RB, RI, or RA HRWL.`,
      ].join(' '));
      return;
    }

    const worker = workerRegistry.find(w => w.id === riggingResource.workerId);
    if (!worker) {
      addBlock(result, 'DOGMAN_NOT_FOUND', `Dogman/rigger record (ID: ${riggingResource.workerId}) not found in the worker registry.`);
      return;
    }

    // All rigging types are valid (DG is the minimum for crane dogging)
    const validRigging = worker.licenses.filter(l => {
      const status = getLicenseStatus(l.expiry);
      return RIGGING_LICENSE_TYPES.includes(l.type) && status !== 'expired';
    });

    if (validRigging.length === 0) {
      const expiredRigging = worker.licenses.filter(l => RIGGING_LICENSE_TYPES.includes(l.type));
      const expiredInfo = expiredRigging.length > 0
        ? ` ${worker.name}'s ${expiredRigging[0].type} licence expired on ${expiredRigging[0].expiry}.`
        : '';

      addBlock(result, 'DOGMAN_LICENSE_INVALID', [
        `${worker.name} does not hold a current dogging or rigging HRWL.`,
        `A current DG, RB, RI, or RA licence is required for crane lift operations.${expiredInfo}`,
        `Arrange renewal or assign a different worker.`,
      ].join(' '), {
        workerId: worker.id,
        workerName: worker.name,
      });
    }
  },

  // ─── RULE 6: Licence Expiry Warning (30 days) ────────────────────────────

  _checkLicenseExpiry(booking, result) {
    const resources = booking.wetHireResources || [];
    const craneCap = craneCapabilityRegistry[booking.assetNumber];
    const requiredCraneLicenses = craneCap ? craneCap.requiredOperatorLicenses : ['C6', 'C1'];

    resources.forEach(resource => {
      const worker = workerRegistry.find(w => w.id === resource.workerId);
      if (!worker) return;

      const isOperator = resource.role === 'Operator';
      const relevantTypes = isOperator
        ? new Set(requiredCraneLicenses.flatMap(r => CRANE_LICENSE_SATISFIES[r] || [r]))
        : new Set(RIGGING_LICENSE_TYPES);

      worker.licenses.forEach(lic => {
        if (!relevantTypes.has(lic.type)) return;
        const status = getLicenseStatus(lic.expiry);
        if (status === 'warning') {
          const days = daysUntilExpiry(lic.expiry);
          addWarning(result, 'LICENSE_EXPIRING_SOON', [
            `${resource.role} ${worker.name}'s ${lic.type} HRWL (Licence No. ${lic.licenseNumber})`,
            `expires in ${days} day${days !== 1 ? 's' : ''} on ${lic.expiry}.`,
            `Arrange renewal immediately to prevent a future dispatch block.`,
          ].join(' '), {
            workerId: worker.id,
            workerName: worker.name,
            licenseType: lic.type,
            expiry: lic.expiry,
            daysRemaining: days,
          });
        }
      });
    });
  },

  // ─── RULE 7: Worker Double-Booking ───────────────────────────────────────

  _checkWorkerDoubleBooking(booking, editId, result) {
    const resources = booking.wetHireResources || [];
    const s = new Date(booking.startTime);
    const e = new Date(booking.endTime);

    resources.forEach(resource => {
      if (!resource.workerId) return;

      const conflict = bookings.find(b => {
        if (b.id === editId) return false;
        const bResources = b.wetHireResources || [];
        const workerInBooking = bResources.some(r => r.workerId === resource.workerId);
        if (!workerInBooking) return false;
        return new Date(b.startTime) < e && new Date(b.endTime) > s;
      });

      if (conflict) {
        addWarning(result, 'WORKER_DOUBLE_BOOKED', [
          `${resource.role} ${resource.workerName} is already assigned to a concurrent booking`,
          `for ${conflict.clientName} (${conflict.assetNumber},`,
          `${new Date(conflict.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`,
          `– ${new Date(conflict.endTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}).`,
          `Confirm the worker is available or assign a different person.`,
        ].join(' '), {
          workerId: resource.workerId,
          workerName: resource.workerName,
          conflictingBookingId: conflict.id,
          conflictingClient: conflict.clientName,
        });
      }
    });
  },

  // ─── RULE 8: Asset Scheduling Overlap ────────────────────────────────────

  _checkAssetOverlap(booking, editId, result) {
    const s = new Date(booking.startTime);
    const e = new Date(booking.endTime);

    const conflict = bookings.find(b =>
      b.id !== editId &&
      b.assetNumber === booking.assetNumber &&
      new Date(b.startTime) < e &&
      new Date(b.endTime) > s
    );

    if (conflict) {
      addBlock(result, 'ASSET_SCHEDULING_CONFLICT', [
        `Asset ${booking.assetNumber} is already scheduled for ${conflict.clientName}`,
        `from ${new Date(conflict.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`,
        `to ${new Date(conflict.endTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}.`,
        `Adjust the booking time or select a different asset.`,
      ].join(' '), {
        assetId: booking.assetNumber,
        conflictingBookingId: conflict.id,
        conflictingClient: conflict.clientName,
      });
    }
  },

  // ─── UTILITY: Summarise Result ───────────────────────────────────────────

  /**
   * Returns a structured summary of a validation result for display in the UI.
   * @param {{ valid: boolean, hardBlocks: Array, warnings: Array }} result
   * @returns {{ hasIssues: boolean, blockCount: number, warnCount: number, allMessages: Array }}
   */
  summarise(result) {
    return {
      hasIssues: !result.valid || result.warnings.length > 0,
      blockCount: result.hardBlocks.length,
      warnCount: result.warnings.length,
      allMessages: [
        ...result.hardBlocks.map(b => ({ severity: 'block', ...b })),
        ...result.warnings.map(w => ({ severity: 'warn', ...w })),
      ],
    };
  },

  /**
   * Quick check — returns true if an asset is hard-locked for dispatch.
   * @param {string} assetId
   * @returns {boolean}
   */
  isAssetLocked(assetId) {
    const comp = complianceRegistry[assetId];
    return comp ? comp.status === 'expired' : false;
  },

  /**
   * Quick check — returns the compliance status of an asset.
   * @param {string} assetId
   * @returns {'valid'|'warning'|'expired'|'unknown'}
   */
  getAssetStatus(assetId) {
    return complianceRegistry[assetId]?.status || 'unknown';
  },

  /**
   * Returns days until the asset's certificate expires (negative if expired).
   * @param {string} assetId
   * @returns {number}
   */
  getAssetCertDaysRemaining(assetId) {
    const comp = complianceRegistry[assetId];
    if (!comp) return 999;
    return daysUntilExpiry(comp.certDate);
  },
};
