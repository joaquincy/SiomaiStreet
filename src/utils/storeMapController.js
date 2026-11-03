import { coordinates } from '../../shared/storeLocations.js';

// Replaceable tile source. Keep attribution visible; never prefetch or offline-cache tiles.
export const STORE_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  maxZoom: 19,
};
// A country overview, not an invented branch pin.
export const DEFAULT_MAP_VIEW = { center: [12.5, 122], zoom: 5 };

// Inject Leaflet so lifecycle tests never need to download public map tiles.
export function createStoreMap(L, host, { onSelect, onPoint, onReady, onError, reducedMotion = false, tiles = STORE_TILES }) {
  const map = L.map(host, {
    minZoom: 3, maxZoom: tiles.maxZoom, scrollWheelZoom: false,
    dragging: true, touchZoom: true, doubleClickZoom: true,
    zoomAnimation: !reducedMotion, fadeAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
  });
  let destroyed = false, ready = false, loaded = 0, failed = 0, frame;
  let picking = false;
  const choosePoint = event => {
    const point = coordinates(event?.latlng?.lat, event?.latlng?.lng);
    if (!destroyed && picking && point) onPoint?.({ label: `Map point (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`, position: point });
  };
  map.on('click', choosePoint);
  const markers = new Map();
  let locations = [];
  let originMarker = null, originPosition = null;
  let routeLayer = null;
  let routeMarkers = [];
  const clearRoute = () => {
    routeLayer?.remove(); routeLayer = null;
    for (const marker of routeMarkers) { marker.off(); marker.remove(); }
    routeMarkers = [];
  };
  const fail = () => { if (!destroyed) onError(); };
  const timeout = setTimeout(fail, 25000);
  const layer = L.tileLayer(tiles.url, {
    attribution: tiles.attribution, maxZoom: tiles.maxZoom,
    updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1,
    detectRetina: false, referrerPolicy: 'strict-origin-when-cross-origin',
  });
  layer.on('loading', () => { loaded = 0; failed = 0; });
  layer.on('tileload', () => {
    loaded++;
    if (!ready && !destroyed) { ready = true; clearTimeout(timeout); onReady(); }
  });
  layer.on('tileerror', () => { failed++; });
  layer.on('load', () => { if (failed && !loaded) fail(); });
  layer.addTo(map);
  const fit = () => {
    const points = originPosition ? [...locations, originPosition] : locations;
    if (destroyed) return;
    if (!points.length) { map.setView(DEFAULT_MAP_VIEW.center, DEFAULT_MAP_VIEW.zoom, { animate: false }); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: false });
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { if (!destroyed) map.invalidateSize({ pan: false, debounceMoveend: true }); });
  });
  observer?.observe(host);
  const removeMarker = item => {
    const element = item.marker.getElement();
    if (element) element.onkeydown = null;
    item.marker.off(); item.marker.remove();
  };
  return {
    pick(enabled) { picking = enabled; },
    chooseCenter() { choosePoint({ latlng: map.getCenter() }); },
    setRoute(route) {
      clearRoute();
      if(destroyed || !Array.isArray(route?.paths)) return;
      const paths=route.paths;
      if(!paths.length || paths.length>20 || paths.reduce((n,p)=>n+(Array.isArray(p)?p.length:20001),0)>20000 || paths.some(p=>!Array.isArray(p)||p.length<2||p.some(c=>!Array.isArray(c)||!coordinates(c[0],c[1])))) return;
      routeLayer=L.polyline(paths,{color:'#15588a',weight:6,opacity:.9,lineJoin:'round',interactive:false}).addTo(map);
      const endpoints = [
        { point: paths[0][0], letter: 'A', label: route.from || 'Starting point' },
        { point: paths.at(-1).at(-1), letter: 'B', label: route.to || 'Destination' },
      ];
      routeMarkers = endpoints.map(({ point, letter, label }) => {
        const pin = host.ownerDocument.createElement('span');
        pin.className = `store-finder__route-pin store-finder__route-pin--${letter.toLowerCase()}`;
        pin.textContent = letter;
        const marker = L.marker(point, {
          icon: L.divIcon({ html: pin, className: 'store-finder__marker', iconSize: [44, 44], iconAnchor: [22, 22] }),
          keyboard: false, interactive: false, title: `${letter}: ${label}`, zIndexOffset: 1200,
        }).addTo(map);
        marker.getElement()?.setAttribute('role', 'img');
        marker.getElement()?.setAttribute('aria-label', `${letter}: ${label}`);
        return marker;
      });
      map.fitBounds(routeLayer.getBounds(),{padding:[40,40],maxZoom:16,animate:!reducedMotion});
    },
    wheel(enabled) { if(!destroyed) map.scrollWheelZoom[enabled?'enable':'disable'](); },
    setOrigin(place) {
      if (destroyed) return;
      originMarker?.off(); originMarker?.remove(); originMarker = null; originPosition = null;
      const point = coordinates(place?.position?.lat, place?.position?.lng);
      if (!point) { fit(); return; }
      originPosition = [point.lat, point.lng];
      const pin = host.ownerDocument.createElement('span');
      pin.className = 'store-finder__origin-pin'; pin.textContent = '◎';
      originMarker = L.marker(originPosition, { icon: L.divIcon({ html: pin, className:'store-finder__marker', iconSize:[44,44], iconAnchor:[22,22] }), keyboard:false, interactive:false, title:`Search point: ${place.label}` }).addTo(map);
      map.setView(originPosition, 13, { animate: false });
      originMarker.getElement()?.setAttribute('role', 'img');
      originMarker.getElement()?.setAttribute('aria-label', `Search point: ${place.label}`);
    },
    update(stores) {
      if (destroyed) return;
      const valid = stores.filter(s => s.position && coordinates(s.position.lat, s.position.lng));
      const ids = new Set(valid.map(s => s.id));
      for (const [id, item] of markers) if (!ids.has(id)) { removeMarker(item); markers.delete(id); }
      locations = valid.map(s => [s.position.lat, s.position.lng]);
      for (const [index, store] of valid.entries()) {
        let item = markers.get(store.id);
        if (!item) {
          // Never interpolate branch content into HTML.
          const pin = host.ownerDocument.createElement('span');
          pin.className = 'store-finder__pin';
          pin.setAttribute('aria-hidden', 'true');
          const marker = L.marker([store.position.lat, store.position.lng], {
            icon: L.divIcon({ html: pin, className: 'store-finder__marker', iconSize: [44, 44], iconAnchor: [22, 44] }),
            keyboard: true, title: store.name, riseOnHover: true, bubblingMouseEvents: false,
          }).addTo(map);
          marker.on('click', () => onSelect(store.id));
          const onKeyDown = event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            // divIcon has button semantics; support Space as well as Enter without scrolling.
            event.preventDefault(); event.stopPropagation();
            if (!event.repeat && !destroyed) onSelect(store.id);
          };
          item = { marker, pin, onKeyDown }; markers.set(store.id, item);
        } else item.marker.setLatLng([store.position.lat, store.position.lng]);
        item.pin.textContent = String(store.number || index + 1).padStart(2, '0');
        item.marker.getElement()?.setAttribute('aria-label', `Select store ${store.number || index + 1}: ${store.name}`);
      }
      fit();
      // Initial markers enter the DOM only once fitBounds establishes the first view.
      for (const [index, store] of valid.entries()) {
        const item = markers.get(store.id);
        const element = item?.marker.getElement();
        if (element) element.onkeydown = item.onKeyDown;
        element?.setAttribute('aria-label', `Select store ${store.number || index + 1}: ${store.name}`);
        element?.setAttribute('title', store.name);
      }
    },
    select(id) {
      for (const [key, { marker, pin }] of markers) {
        pin.classList.toggle('is-selected', key === id);
        marker.setZIndexOffset(key === id ? 1000 : 0);
        marker.getElement()?.setAttribute('aria-pressed', String(key === id));
      }
    },
    focus(id) {
      const item = markers.get(id);
      if (item && !destroyed) map.setView(item.marker.getLatLng(), 15, { animate: !reducedMotion });
    },
    focusOrigin() {
      if (originPosition && !destroyed) map.setView(originPosition, 13, { animate: !reducedMotion });
    },
    interact(enabled) {
      if (destroyed) return;
      for (const handler of [map.dragging, map.touchZoom, map.doubleClickZoom]) handler[enabled ? 'enable' : 'disable']();
    },
    fit,
    destroy() {
      if (destroyed) return;
      destroyed = true; clearTimeout(timeout);
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer?.disconnect();
      originMarker?.off(); originMarker?.remove(); originMarker = null;
      clearRoute();
      for (const item of markers.values()) removeMarker(item);
      markers.clear(); layer.off(); map.off('click', choosePoint); map.remove();
    },
  };
}
