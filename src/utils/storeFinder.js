import { distanceKm, matchesStore } from '../../shared/storeLocations.js';

export function storeResults(stores, { query = '', region = '', position = null, sort = 'name' } = {}) {
  return stores.filter(store => matchesStore(store, query, region))
    .map(store => ({ ...store, distance: position ? distanceKm(position, store.position) : Infinity }))
    .sort((a, b) => {
      if (sort === 'nearest' && position && a.distance !== b.distance) return a.distance - b.distance;
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    }).map((store, index) => ({ ...store, number: index + 1 }));
}

export function distanceLabel(distance) {
  if (!Number.isFinite(distance) || distance < 0) return '';
  if (distance < .1) return 'Less than 100 m';
  if (distance < 1) return `${Math.round(distance * 10) * 100} m`;
  return `${distance.toFixed(1)} km`;
}

export function storeShareUrl(store, origin) {
  const url = new URL('/', origin);
  url.searchParams.set('branch', store.id);
  url.hash = 'stores';
  return url.href;
}

export function linkedStoreId(href) {
  try {
    const id = new URL(href).searchParams.get('branch');
    return id && id.length <= 100 ? id : null;
  } catch { return null; }
}

export function locationErrorMessage(error) {
  if (error?.code === 1) return 'Location permission was not granted. Search by city, area or branch name instead.';
  if (error?.code === 3) return 'Finding your location took too long. Try again or search by city.';
  return 'Your location is unavailable right now. Search by city or try again.';
}

// Cancellation ignores late device responses; no watch, storage or network request is created here.
export function beginLocationLookup(geolocation, { onSuccess, onError }, timers = { setTimeout, clearTimeout }) {
  let active = true;
  const finish = callback => value => {
    if (!active) return;
    active = false;
    timers.clearTimeout(timer);
    callback(value);
  };
  const success = finish(onSuccess), failure = finish(onError);
  const timer = timers.setTimeout(() => failure({ code: 3 }), 15000);
  try {
    geolocation.getCurrentPosition(success, failure, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  } catch { failure(); }
  return () => { active = false; timers.clearTimeout(timer); };
}
