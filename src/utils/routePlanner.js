import { coordinates, distanceKm } from '../../shared/storeLocations.js';

export function routePoint(value) {
  const position = coordinates(value?.position?.lat, value?.position?.lng);
  const label = typeof value?.label === 'string' ? value.label.trim().slice(0, 500) : '';
  return position && label ? { label, position } : null;
}

export function initialRoutePoints(store, searchPoint) {
  const branch = routePoint({ label: store?.name, position: store?.position });
  const searched = routePoint(searchPoint);
  return { start: branch ? searched : null, destination: branch || searched };
}

export function routeProblem(start, destination) {
  const from = routePoint(start), to = routePoint(destination);
  if (!from && !to) return 'Search for a starting point and a destination, then select a result for each.';
  if (!from) return 'Choose a starting point: search an address or use your location.';
  if (!to) return 'Search for your destination and select the matching result.';
  if (from.position.lat === to.position.lat && from.position.lng === to.position.lng) return 'Your starting point and destination are the same. Choose a different place.';
  if (distanceKm(from.position, to.position) > 1500) return 'These places are too far apart for this preview. Choose points within 1,500 km of each other.';
  return '';
}

// Cancellation clears the timeout immediately; identity checks reject late responses.
export function latestMapRequest(timers = {
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: id => globalThis.clearTimeout(id),
}) {
  let current = null;
  const cancel = () => {
    if (!current) return;
    timers.clearTimeout(current.timer);
    current.controller.abort();
    current = null;
  };
  return {
    cancel,
    start(timeout) {
      cancel();
      const controller = new AbortController();
      const request = { controller, timer: timers.setTimeout(() => controller.abort(), timeout) };
      current = request;
      return {
        signal: controller.signal,
        isCurrent: () => current === request && !controller.signal.aborted,
        isLatest: () => current === request,
        finish() { timers.clearTimeout(request.timer); if (current === request) current = null; },
      };
    },
  };
}
