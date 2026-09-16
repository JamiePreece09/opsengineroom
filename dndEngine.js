import { bookings, updateBooking } from './dataModels.js';
import { ComplianceEngine } from './complianceEngine.js';

export function initDragAndDrop(renderCallback, showToastCallback) {
  // Wait for interact to be globally available
  if (!window.interact) {
    console.warn('interact.js not loaded yet');
    return;
  }

  // Common snapping
  const PX_PER_MIN = 60 / 60; // 1px per min
  const SNAP_MIN = 15;
  const SNAP_PX = SNAP_MIN * PX_PER_MIN;

  window.interact('.booking-card, .gantt-bar')
    .draggable({
      inertia: true,
      autoScroll: true,
      modifiers: [
        window.interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false
        })
      ],
      listeners: {
        start(event) {
          event.target.classList.add('is-dragging');
          event.target.style.zIndex = '999';
          event.target.setAttribute('data-x', 0);
          event.target.setAttribute('data-y', 0);
          
          // Determine axis lock based on class
          if (event.target.classList.contains('gantt-bar')) {
            event.target.setAttribute('data-axis', 'x');
          } else {
            event.target.setAttribute('data-axis', 'y');
          }
        },
        move(event) {
          const target = event.target;
          const axis = target.getAttribute('data-axis');
          
          let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          
          if (axis === 'x') {
            y = 0; // Lock Y
            // Snap to 15 min grid (assuming PX_PER_MIN is scaled, need to adjust based on week view sizing)
            // For simplicity, we just use raw translation for visual feedback
          } else {
            x = 0; // Lock X
          }

          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end(event) {
          const target = event.target;
          target.classList.remove('is-dragging');
          target.style.zIndex = '';
          
          const bId = target.id || target.id.replace('dt-', '').replace('wt-', '');
          const originalBooking = bookings.find(b => b.id === bId);
          if (!originalBooking) return;
          
          const axis = target.getAttribute('data-axis');
          
          // Calculate new time based on dragged distance
          let offsetMins = 0;
          if (axis === 'y') {
             const y = parseFloat(target.getAttribute('data-y')) || 0;
             offsetMins = Math.round(y / SNAP_PX);
          } else {
             // For X axis in gantt, calculate based on width (simplification for POC)
             const x = parseFloat(target.getAttribute('data-x')) || 0;
             // We need week column width. Approximate it based on standard screen
             const colWidth = 200; // rough guess for week view day width
             offsetMins = Math.round(x / colWidth * 24 * 60);
          }
          
          // Snap offset to 15 min increments
          offsetMins = Math.round(offsetMins / SNAP_MIN) * SNAP_MIN;
          
          if (offsetMins !== 0) {
            // Apply new time
            const oldStart = new Date(originalBooking.startTime);
            const oldEnd = new Date(originalBooking.endTime);
            const newStart = new Date(oldStart.getTime() + offsetMins * 60000);
            const newEnd = new Date(oldEnd.getTime() + offsetMins * 60000);
            
            const tempBooking = { ...originalBooking, startTime: newStart.toISOString(), endTime: newEnd.toISOString() };
            
            // Validate!
            const validation = ComplianceEngine.validateDispatch(tempBooking, bId);
            if (validation.hardBlocks.length > 0) {
                // HARD BLOCK!
                target.classList.add('shake');
                target.style.transform = `translate(0px, 0px)`;
                target.setAttribute('data-x', 0);
                target.setAttribute('data-y', 0);
                showToastCallback('COMPLIANCE BLOCK: ' + validation.hardBlocks[0].msg, 'error');
                
                setTimeout(() => {
                   target.classList.remove('shake');
                }, 500);
                return;
            } else {
                updateBooking(tempBooking);
                showToastCallback('Booking moved successfully.', 'success');
            }
          }
          
          // Re-render
          renderCallback();
        }
      }
    });
}
