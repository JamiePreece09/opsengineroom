import { bookings, updateBooking } from './dataModels.js';
import { ComplianceEngine } from './complianceEngine.js';

export function initDragAndDrop(renderCallback, showToastCallback) {
    window._dragBooking = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    };

    window._dragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    window._dragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over-active'); // we will add this class to CSS
    };

    window._dragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over-active');
    };

    const processDrop = (e, id, newStartISO) => {
        const b = bookings.find(x => x.id === id);
        if(!b) return;

        const oldStart = new Date(b.startTime);
        const oldEnd = new Date(b.endTime);
        const duration = oldEnd.getTime() - oldStart.getTime();

        const tempBooking = { 
            ...b, 
            startTime: newStartISO, 
            endTime: new Date(new Date(newStartISO).getTime() + duration).toISOString() 
        };

        const validation = ComplianceEngine.validateDispatch(tempBooking, id);
        if (validation.hardBlocks.length > 0) {
            showToastCallback('⛔ COMPLIANCE BLOCK: ' + validation.hardBlocks[0].msg, 'error');
            return;
        }

        updateBooking(tempBooking);
        showToastCallback('Booking rescheduled successfully.', 'success');
        renderCallback();
    };

    window._dropBooking = (e, newHour, newAsset, dateIso) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over-active');
        const id = e.dataTransfer.getData('text/plain');
        if(!id) return;
        
        const b = bookings.find(x => x.id === id);
        if(!b) return;
        
        // If week view (newAsset is null), preserve original asset
        const assetToUse = newAsset || b.assetNumber;
        
        const baseDate = new Date(dateIso);
        baseDate.setHours(newHour, 0, 0, 0);

        // Update the asset before processing drop time
        b.assetNumber = assetToUse; 
        
        processDrop(e, id, baseDate.toISOString());
    };

    window._dropGantt = (e, newAsset, dateIso, minH, totalHours) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over-active');
        const id = e.dataTransfer.getData('text/plain');
        if(!id) return;
        
        const b = bookings.find(x => x.id === id);
        if(!b) return;

        // Calculate hour based on drop position X relative to the container width
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, offsetX / rect.width));
        
        const droppedHourFloat = minH + (pct * totalHours);
        
        // Snap to nearest 15 mins (0.25)
        const snappedHour = Math.round(droppedHourFloat * 4) / 4;
        
        const h = Math.floor(snappedHour);
        const m = Math.round((snappedHour - h) * 60);

        const baseDate = new Date(dateIso);
        baseDate.setHours(h, m, 0, 0);
        
        b.assetNumber = newAsset || b.assetNumber;
        
        processDrop(e, id, baseDate.toISOString());
    };
}
