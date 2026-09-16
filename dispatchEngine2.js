/**
 * dispatchEngine.js — HireEngine Dispatch & Booking State Manager
 * Manages all booking CRUD operations, overlap detection, and dispatch validation.
 * Coordinates with ComplianceEngine for pre-dispatch safety checks.
 */

import {
  bookings, addBooking, updateBooking, removeBooking,
  assetRegistry, complianceRegistry, workerRegistry, HOURLY_RATES
} from './dataModels2.js';
import { ComplianceEngine } from './complianceEngine2.js';

export const DispatchEngine = {

  /**
   * Checks whether a given asset has an overlapping booking.
   * @param {string} assetId
   * @param {string} startISO
   * @param {string} endISO
   * @param {string|null} excludeId - booking ID to exclude from check (for edits)
   * @returns {object|null} - the conflicting booking, or null if clear
   */
  getOverlap(assetId, startISO, endISO, excludeId = null) {
    const s = new Date(startISO), e = new Date(endISO);
    return bookings.find(b =>
      b.id !== excludeId &&
      b.assetNumber === assetId &&
      new Date(b.startTime) < e &&
      new Date(b.endTime) > s
    ) || null;
  },

  /**
   * Checks whether a given worker is double-booked on the same day.
   * @param {string} workerId
   * @param {string} dateISO - ISO date string of the booking
   * @param {string|null} excludeId
   * @returns {object|null} - conflicting booking or null
   */
  getWorkerDoubleBooking(workerId, startISO, endISO, excludeId = null) {
    const s = new Date(startISO), e = new Date(endISO);
    return bookings.find(b => {
      if (b.id === excludeId) return false;
      const resources = b.wetHireResources || [];
      const hasWorker = resources.some(r => r.workerId === workerId);
      if (!hasWorker) return false;
      return new Date(b.startTime) < e && new Date(b.endTime) > s;
    }) || null;
  },

  /**
   * Attempts to save (create or update) a booking.
   * Runs compliance validation first. Returns a result object.
   * @param {object} bookingData - the booking to save
   * @param {string|null} editId - if set, this is an edit of an existing booking
   * @returns {{ success: boolean, booking?: object, validation?: object, error?: string }}
   */
  saveBooking(bookingData, editId = null) {
    const { assetNumber, startTime, endTime } = bookingData;

    // Basic time integrity
    if (new Date(endTime) <= new Date(startTime)) {
      return { success: false, error: 'End time must be after start time.' };
    }

    // Asset overlap check
    const conflict = this.getOverlap(assetNumber, startTime, endTime, editId);
    if (conflict) {
      return {
        success: false,
        error: `Asset ${assetNumber} has a scheduling conflict with job for ${conflict.clientName} (${new Date(conflict.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – ${new Date(conflict.endTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}).`
      };
    }

    // Chronological integrity — future bookings cannot be Invoiced or Completed
    if (new Date(startTime) > new Date() &&
        (bookingData.status === 'Invoiced' || bookingData.status === 'Completed')) {
      bookingData.status = 'Scheduled';
    }

    // Compliance validation
    const validation = ComplianceEngine.validateDispatch(bookingData, editId);
    if (!validation.valid) {
      // Hard blocks — cannot save
      return { success: false, validation, error: 'Compliance validation failed.' };
    }

    // Persist
    const booking = { ...bookingData, id: editId || ('b' + Date.now()) };
    if (editId) {
      updateBooking(booking);
    } else {
      addBooking(booking);
    }

    return { success: true, booking, validation };
  },

  /**
   * Deletes a booking by ID.
   * @param {string} id
   */
  deleteBooking(id) {
    removeBooking(id);
  },

  /**
   * Moves a booking to a new asset and/or time after a drag-and-drop operation.
   * Validates compliance on the new position. Returns success/failure.
   * @param {string} bookingId
   * @param {string} newAssetId
   * @param {string} newStartISO
   * @param {string} newEndISO
   * @returns {{ success: boolean, error?: string, validation?: object }}
   */
  moveBooking(bookingId, newAssetId, newStartISO, newEndISO) {
    const original = bookings.find(b => b.id === bookingId);
    if (!original) return { success: false, error: 'Booking not found.' };

    const proposed = {
      ...original,
      assetNumber: newAssetId,
      startTime: newStartISO,
      endTime: newEndISO,
    };

    const conflict = this.getOverlap(newAssetId, newStartISO, newEndISO, bookingId);
    if (conflict) {
      return {
        success: false,
        error: `Asset ${newAssetId} conflicts with ${conflict.clientName} at this time.`
      };
    }

    const validation = ComplianceEngine.validateDispatch(proposed, bookingId);
    if (!validation.valid) {
      return { success: false, validation, error: 'Compliance block on new position.' };
    }

    updateBooking(proposed);
    return { success: true, booking: proposed, validation };
  },

  /**
   * Returns a flat list of all bookings, optionally filtered.
   */
  getBookings({ assetFilter = null, dateStr = null } = {}) {
    let result = [...bookings];
    if (assetFilter && assetFilter.size > 0) {
      result = result.filter(b => assetFilter.has(b.assetNumber));
    }
    if (dateStr) {
      result = result.filter(b => new Date(b.startTime).toDateString() === new Date(dateStr).toDateString());
    }
    return result;
  },

  /**
   * Calculates the revenue for a booking based on asset prefix and duration.
   */
  calcRevenue(booking) {
    const prefix = booking.assetNumber.replace(/[0-9]/g, '');
    const rate = HOURLY_RATES[prefix] || 200;
    const hours = (new Date(booking.endTime) - new Date(booking.startTime)) / 3600000;
    return { rate, hours, total: Math.round(rate * hours) };
  },

};
