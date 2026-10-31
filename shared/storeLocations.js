const text = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const number = value => (typeof value === 'number' || (typeof value === 'string' && value.trim())) ? Number(value) : NaN;

export function coordinates(latitude, longitude) {
  const lat = number(latitude), lng = number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

// Explicit public projection: never spread database rows into a public response.
export function publicStore(branch, profile) {
  if (branch.branch_status !== 'Active') return null;
  const name = text(branch.branch_name, 150);
  if (!name || branch.branch_id == null) return null;
  const approved = profile?.published === true ? profile : {};
  return {
    id: String(branch.branch_id), name, address: text(branch.branch_address, 500),
    city: text(approved.city, 100), region: text(approved.region, 100),
    landmark: text(approved.landmark), phone: text(approved.public_phone, 40),
    hours: text(approved.hours_note, 500), holidayNote: text(approved.holiday_note, 500),
    position: coordinates(approved.latitude, approved.longitude),
    placeId: text(approved.google_place_id, 200),
  };
}

export function normalizeStore(value) {
  if (!value || typeof value !== 'object' || !text(value.name) || !text(value.id)) return null;
  return {
    id: text(value.id, 100), name: text(value.name, 150), address: text(value.address, 500),
    city: text(value.city, 100), region: text(value.region, 100), landmark: text(value.landmark),
    phone: text(value.phone, 40), hours: text(value.hours, 500), holidayNote: text(value.holidayNote, 500),
    placeId: text(value.placeId, 200), position: coordinates(value.position?.lat, value.position?.lng),
  };
}

export const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchesStore(store, query, region = '') {
  const haystack = searchText([store.name, store.address, store.city, store.region, store.landmark].join(' '));
  return (!region || store.region === region) && searchText(query).trim().split(/\s+/).every(word => haystack.includes(word));
}

export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const radians = n => n * Math.PI / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function directionsUrl(store, travelMode = '') {
  const destination = store.position ? `${store.position.lat},${store.position.lng}` : [store.name, store.address].filter(Boolean).join(', ');
  if (!store.position && !store.address) return null;
  const params = new URLSearchParams({ api: '1', destination });
  if (['driving', 'walking', 'transit', 'bicycling'].includes(travelMode)) params.set('travelmode', travelMode);
  if (store.placeId) params.set('destination_place_id', store.placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function phoneUrl(phone) {
  const value = phone.replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(value) ? `tel:${value}` : null;
}
