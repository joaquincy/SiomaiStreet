// Calendar keyboard navigation uses UTC arithmetic to avoid daylight-saving shifts.
export function calendarNavigation(year, month, day, key, shiftKey = false) {
  const next = new Date(Date.UTC(year, month, day));
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (Object.hasOwn(offsets, key)) next.setUTCDate(day + offsets[key]);
  else if (key === 'Home') next.setUTCDate(day - next.getUTCDay());
  else if (key === 'End') next.setUTCDate(day + 6 - next.getUTCDay());
  else if (key === 'PageUp' || key === 'PageDown') {
    next.setUTCDate(1);
    next.setUTCMonth(month + (key === 'PageUp' ? -1 : 1) * (shiftKey ? 12 : 1));
    next.setUTCDate(Math.min(day, new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()));
  } else return null;
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() < 100 || next.getUTCFullYear() > 9999) return null;
  return { year: next.getUTCFullYear(), month: next.getUTCMonth(), day: next.getUTCDate() };
}
