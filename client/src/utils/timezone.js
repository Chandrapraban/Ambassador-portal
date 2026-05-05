export const COMMON_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (ET) — New York, Durham' },
  { value: 'America/Chicago',     label: 'Central Time (CT) — Chicago, Dallas' },
  { value: 'America/Denver',      label: 'Mountain Time (MT) — Denver' },
  { value: 'America/Phoenix',     label: 'Mountain Time — Phoenix (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — Los Angeles, Seattle' },
  { value: 'America/Anchorage',   label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HST)' },
  { value: 'America/Toronto',     label: 'Eastern Time (ET) — Toronto' },
  { value: 'America/Vancouver',   label: 'Pacific Time (PT) — Vancouver' },
  { value: 'America/Sao_Paulo',   label: 'Brasília Time (BRT)' },
  { value: 'Europe/London',       label: 'British Time (GMT/BST)' },
  { value: 'Europe/Paris',        label: 'Central European Time (CET) — Paris' },
  { value: 'Europe/Berlin',       label: 'Central European Time (CET) — Berlin' },
  { value: 'Europe/Zurich',       label: 'Central European Time (CET) — Zurich' },
  { value: 'Europe/Stockholm',    label: 'Central European Time (CET) — Stockholm' },
  { value: 'Europe/Moscow',       label: 'Moscow Time (MSK)' },
  { value: 'Asia/Dubai',          label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Kolkata',        label: 'India Standard Time (IST)' },
  { value: 'Asia/Dhaka',          label: 'Bangladesh Standard Time (BST)' },
  { value: 'Asia/Bangkok',        label: 'Indochina Time (ICT) — Bangkok' },
  { value: 'Asia/Singapore',      label: 'Singapore Time (SGT)' },
  { value: 'Asia/Shanghai',       label: 'China Standard Time (CST) — Beijing' },
  { value: 'Asia/Tokyo',          label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Seoul',          label: 'Korea Standard Time (KST)' },
  { value: 'Australia/Sydney',    label: 'Australian Eastern Time (AET) — Sydney' },
  { value: 'Pacific/Auckland',    label: 'New Zealand Time (NZST/NZDT)' },
  { value: 'UTC',                 label: 'Coordinated Universal Time (UTC)' },
]

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

// Returns the short abbreviation for a timezone at a given moment (handles DST).
// e.g. 'America/New_York' → 'EST' or 'EDT' depending on the date.
export function getTimezoneAbbr(timezone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(at)
    return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone
  } catch {
    return timezone
  }
}

// Internal: given a UTC Date, find what the Intl-formatted time looks like in `tz`.
// Returns { hours (0–23), minutes }.
function utcToTzParts(utcDate, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate)
  let hours = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  if (hours === 24) hours = 0  // guard against non-standard "24:xx" returns
  return { hours, minutes }
}

// Core conversion: take a local time in `fromTz` and return the UTC Date it represents.
// Handles DST correctly via the IANA database embedded in Intl.
// dateStr: 'YYYY-MM-DD', hours24: 0-23, minutes: 0-59
function localToUtc(dateStr, hours24, minutes, fromTz) {
  const [year, month, day] = dateStr.split('-').map(Number)

  // Step 1: Treat the local time naively as UTC to get an approximate UTC moment.
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hours24, minutes, 0))

  // Step 2: Ask Intl what clock the approximate UTC moment shows in fromTz.
  const { hours: tzH, minutes: tzM } = utcToTzParts(approxUtc, fromTz)

  // Step 3: The difference between the shown clock and our target clock is the UTC offset.
  //   offset (minutes) = tzH:tzM  −  hours24:minutes  (expressed as minutes)
  //   trueUTC = approxUTC − offset  (because local = UTC + offset)
  const offsetMinutes = (tzH - hours24) * 60 + (tzM - minutes)
  return new Date(approxUtc.getTime() - offsetMinutes * 60000)
}

// Convert a time string like "8:00 AM" on a given date from one IANA timezone to another.
// Returns a formatted string in the target timezone (e.g. "11:00 AM") or null if
// the timezones are identical or the input is invalid.
export function convertSlotTime(dateStr, timeStr, fromTz, toTz) {
  if (!dateStr || !timeStr || !fromTz || !toTz || fromTz === toTz) return null
  try {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null
    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const period = match[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const trueUtc = localToUtc(dateStr, hours, minutes, fromTz)

    return new Intl.DateTimeFormat('en-US', {
      timeZone: toTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(trueUtc)
  } catch {
    return null
  }
}

// Format a datetime-local string ("YYYY-MM-DDTHH:MM", entered in `storedTz`) for display
// in `displayTz`, e.g. "Dec 1, 2:00 PM EDT".  Returns the raw string on failure.
export function formatCallInTimezone(datetimeStr, storedTz, displayTz) {
  if (!datetimeStr) return ''
  try {
    const [datePart, timePart] = datetimeStr.split('T')
    if (!datePart || !timePart) return datetimeStr
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)

    const trueUtc = localToUtc(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, hours, minutes, storedTz)

    return new Intl.DateTimeFormat('en-US', {
      timeZone: displayTz,
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      hour12: true, timeZoneName: 'short',
    }).format(trueUtc)
  } catch {
    return datetimeStr
  }
}
