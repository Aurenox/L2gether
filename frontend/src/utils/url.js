/**
 * Central URL helper for L2gether.
 * Ensures invitations, QR codes, and share links accurately resolve to https://l2gether.vercel.app
 * in production or the active non-localhost browser origin.
 */

export function getAppBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // In production or custom domains (not running on local dev machine)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }

  // Fallback to configured VITE_APP_URL or production deployment
  return import.meta.env.VITE_APP_URL || 'https://l2gether.vercel.app';
}

export function getRoomJoinUrl(roomId) {
  if (!roomId) return getAppBaseUrl();
  return `${getAppBaseUrl()}/join/${roomId}`;
}
