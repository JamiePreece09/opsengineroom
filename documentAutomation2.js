/**
 * documentAutomation.js
 */

export function pushToDocuWare(docType, payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, documentId: 'DW-12345' });
    }, 1200);
  });
}

export function generateSWMSPayload(booking) { 
  return {
    bookingId: booking?.id,
    assetNumber: booking?.assetNumber,
    clientName: booking?.clientName,
    siteAddress: booking?.siteAddress,
    status: booking?.swmsStatus || 'pending'
  }; 
}

export function generatePreStartPayload(booking) { 
  return {
    bookingId: booking?.id,
    assetNumber: booking?.assetNumber,
    operatorName: booking?.operatorName,
    status: booking?.preStartStatus || 'pending'
  }; 
}

export function generateFieldDocketPayload(booking, actualHours, siteRepName) { 
  return {
    bookingId: booking?.id,
    actualHours: actualHours || 8,
    siteRepName: siteRepName || 'Site Rep',
    status: booking?.docketStatus || 'pending'
  }; 
}

export function getDocPipelineStatus(booking) { 
  if (!booking) {
    return {
      hireAgreement: { status: 'pending' },
      swms: { status: 'pending' },
      preStart: { status: 'pending' },
      fieldDocket: { status: 'pending' },
    };
  }

  const isSigned = Boolean(booking.contractSigned || booking.hireAgreementStatus === 'signed');
  const isUploaded = Boolean(booking.docketUploaded || booking.docketStatus === 'pushed' || booking.docketStatus === 'verified');

  return {
    hireAgreement: {
      status: isSigned ? 'signed' : (booking.hireAgreementStatus || 'pending')
    },
    swms: {
      status: booking.swmsStatus || 'pending'
    },
    preStart: {
      status: booking.preStartStatus || 'pending'
    },
    fieldDocket: {
      status: isUploaded ? 'pushed' : (booking.docketStatus || 'pending')
    }
  };
}
