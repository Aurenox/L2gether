/**
 * Safely parses UTC dates from the server (SQLite or ISO format)
 * and returns a standard JavaScript Date object in local time.
 */
export function parseServerDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  const str = String(dateInput).trim();
  if (!str) return new Date();
  if (/^\d{10,13}$/.test(str)) return new Date(Number(str));

  // If already an ISO string with explicit timezone (Z or +HH:MM or -HH:MM)
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }

  // SQLite format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" without Z
  // Append Z so JavaScript parses it as UTC, not local time
  const isoUtc = str.replace(' ', 'T') + 'Z';
  const parsed = new Date(isoUtc);

  // Fallback in case of unexpected format
  if (isNaN(parsed.getTime())) {
    return new Date(str);
  }

  return parsed;
}

/**
 * Formats a server timestamp into a local 12-hour or 24-hour time string (e.g. "11:24 AM")
 */
export function formatLocalTime(dateInput, options = { hour: '2-digit', minute: '2-digit' }) {
  const date = parseServerDate(dateInput);
  return date.toLocaleTimeString([], options);
}

/**
 * Formats a server timestamp into a local date string (e.g. "27 Oct 2026")
 */
export function formatLocalDate(dateInput, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = parseServerDate(dateInput);
  return date.toLocaleDateString(undefined, options);
}

/**
 * Formats a server timestamp into a local date and time string
 */
export function formatLocalDateTime(dateInput, options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) {
  const date = parseServerDate(dateInput);
  return date.toLocaleString(undefined, options);
}
