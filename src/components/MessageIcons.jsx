import React from 'react';

// Sleek WhatsApp-style status checkmark icons with SVG precision
export function StatusTickIcon({ status }) {
  if (status === 'read') {
    return (
      <span className="sulax-tick-wrap read" title="Read">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="sulax-tick-svg tick-pop">
          {/* First tick */}
          <path
            d="M4.5 9.2L1.3 6L0.2 7.1L4.5 11.4L13.7 2.2L12.6 1.1L4.5 9.2Z"
            fill="#53bdeb"
          />
          {/* Second tick (offset) */}
          <path
            d="M7.7 9.2L6.6 8.1L6.1 8.6L7.7 10.2L15.9 2L14.8 0.9L7.7 8.0V9.2Z"
            fill="#53bdeb"
          />
        </svg>
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span className="sulax-tick-wrap delivered" title="Delivered">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="sulax-tick-svg">
          <path
            d="M4.5 9.2L1.3 6L0.2 7.1L4.5 11.4L13.7 2.2L12.6 1.1L4.5 9.2Z"
            fill="#8696a0"
          />
          <path
            d="M7.7 9.2L6.6 8.1L6.1 8.6L7.7 10.2L15.9 2L14.8 0.9L7.7 8.0V9.2Z"
            fill="#8696a0"
          />
        </svg>
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span className="sulax-tick-wrap sent" title="Sent">
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none" className="sulax-tick-svg">
          <path
            d="M4.5 9.2L1.3 6L0.2 7.1L4.5 11.4L11.7 4.2L10.6 3.1L4.5 9.2Z"
            fill="#8696a0"
          />
        </svg>
      </span>
    );
  }

  // Pending / Sending animation
  return (
    <span className="sulax-tick-wrap pending" title="Sending...">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2.5" className="sulax-clock-spin">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </span>
  );
}

// WhatsApp Floating Trigger Button Icon
export function WhatsAppIcon({ size = 32, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="sulax-whatsapp-icon">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.04 20.08C10.56 20.08 9.11 19.68 7.84 18.93L7.54 18.75L4.42 19.57L5.25 16.53L5.05 16.22C4.22 14.9 3.79 13.43 3.79 11.91C3.79 7.4 7.46 3.73 11.97 3.73C14.16 3.73 16.21 4.58 17.76 6.13C19.31 7.68 20.16 9.74 20.16 11.92C20.15 16.43 16.48 20.08 12.04 20.08ZM16.53 13.95C16.28 13.83 15.06 13.23 14.83 13.14C14.6 13.06 14.44 13.02 14.27 13.26C14.1 13.51 13.63 14.07 13.48 14.23C13.34 14.4 13.19 14.42 12.94 14.29C12.69 14.17 11.89 13.9 10.94 13.06C10.2 12.4 9.71 11.59 9.56 11.34C9.42 11.09 9.54 10.96 9.67 10.83C9.78 10.72 9.92 10.54 10.04 10.4C10.16 10.26 10.21 10.15 10.29 9.99C10.37 9.82 10.33 9.68 10.27 9.56C10.21 9.44 9.65 8.1 9.45 7.6C9.25 7.12 9.04 7.18 8.89 7.17H8.41C8.24 7.17 7.98 7.23 7.75 7.48C7.53 7.73 6.89 8.32 6.89 9.53C6.89 10.74 7.77 11.91 7.89 12.08C8.01 12.25 9.62 14.73 12.09 15.79C12.68 16.04 13.14 16.19 13.5 16.31C14.09 16.5 14.63 16.47 15.06 16.41C15.54 16.34 16.53 15.81 16.74 15.23C16.95 14.65 16.95 14.16 16.88 14.05C16.82 13.94 16.66 13.88 16.41 13.75L16.53 13.95Z" />
    </svg>
  );
}

// Send Airplane Icon
export function SendPlaneIcon({ size = 18, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="sulax-send-svg">
      <path d="M2.01 21L23 12 2.01 3 2 10L17 12L2 14L2.01 21Z" />
    </svg>
  );
}

// Verified Support Agent Badge Icon
export function VerifiedBadgeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25d366">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}
