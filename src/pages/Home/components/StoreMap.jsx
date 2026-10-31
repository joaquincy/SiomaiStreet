import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../utils/googleMaps';

export default function StoreMap({ stores, selectedId, focusId, focusVersion = 0, onSelect, fitVersion, onError }) {
  const host = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const fit = useRef(null);
  const select = useRef(onSelect);
  const [sdk, setSdk] = useState(null);
  const [ready, setReady] = useState(false);
  select.current = onSelect;

  useEffect(() => {
    let cancelled = false, idle, mapsSdk;
    const timer = setTimeout(() => { if (!cancelled) onError(); }, 25000);
    const previousAuthFailure = window.gm_authFailure;
    const authFailure = () => { if (!cancelled) onError(); previousAuthFailure?.(); };
    window.gm_authFailure = authFailure;
    (async () => {
      const maps = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
      const [mapLibrary, markerLibrary] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker')]);
      if (cancelled) return;
      mapsSdk = maps;
      map.current = new mapLibrary.Map(host.current, {
        center: { lat: 12.8, lng: 122 }, zoom: 5, maxZoom: 19,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
        gestureHandling: 'cooperative', mapTypeControl: false, streetViewControl: false,
        fullscreenControl: true, clickableIcons: false, keyboardShortcuts: true,
      });
      idle = maps.event.addListenerOnce(map.current, 'idle', () => {
        clearTimeout(timer);
        if (!cancelled) setReady(true);
      });
      setSdk({ maps, ...markerLibrary });
    })().catch(() => { clearTimeout(timer); if (!cancelled) onError(); });
    return () => {
      cancelled = true; clearTimeout(timer); idle?.remove();
      if (window.gm_authFailure === authFailure) window.gm_authFailure = previousAuthFailure;
      if (map.current) mapsSdk?.event.clearInstanceListeners(map.current);
      map.current = null;
    };
  }, [onError]);

  useEffect(() => {
    if (!sdk || !map.current) return;
    const bounds = new sdk.maps.LatLngBounds();
    const created = stores.map((store, index) => {
      const pin = document.createElement('span');
      pin.className = 'store-finder__pin';
      pin.textContent = String(store.number || index + 1).padStart(2, '0');
      pin.setAttribute('aria-hidden', 'true');
      const marker = new sdk.AdvancedMarkerElement({ map: map.current, position: store.position, title: `${store.number || index + 1}. ${store.name}`, content: pin, gmpClickable: true });
      const listener = marker.addListener('click', () => select.current(store.id));
      bounds.extend(store.position);
      return { marker, pin, listener, id: store.id };
    });
    markers.current = created;
    fit.current = () => {
      if (!map.current) return;
      const sameLocation = stores.every(store => store.position.lat === stores[0]?.position.lat && store.position.lng === stores[0]?.position.lng);
      if (stores.length && sameLocation) { map.current.setCenter(stores[0].position); map.current.setZoom(15); }
      else if (stores.length) map.current.fitBounds(bounds, 55);
    };
    return () => {
      created.forEach(({ marker, listener }) => { listener.remove(); marker.map = null; });
      markers.current = []; fit.current = null;
    };
  }, [sdk, stores]);

  // Fitting changes the camera, not the markers or their event listeners.
  useEffect(() => { fit.current?.(); }, [sdk, stores, fitVersion]);
  useEffect(() => {
    markers.current.forEach(({ id, pin, marker }) => {
      pin.classList.toggle('is-selected', id === selectedId);
      marker.zIndex = id === selectedId ? 10 : 1;
    });
  }, [sdk, selectedId, stores]);
  useEffect(() => {
    const chosen = stores.find(store => store.id === focusId);
    if (chosen && map.current) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.current.setCenter(chosen.position);
      else map.current.panTo(chosen.position);
      map.current.setZoom(15);
    }
  }, [sdk, focusId, focusVersion, stores]);
  useEffect(() => {
    if (!sdk || !host.current || !('ResizeObserver' in window)) return;
    let previousWidth = 0, previousHeight = 0;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (previousWidth > 0 && width > 0 && height > 0 && (width !== previousWidth || height !== previousHeight)) fit.current?.();
      previousWidth = width; previousHeight = height;
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [sdk]);

  return <>
    <div className="store-finder__google-map" ref={host} aria-label="Google Map of Siomai Street stores" />
    {!ready && <div className="store-finder__map-loading" role="status"><span aria-hidden="true" />Loading Google Maps…</div>}
  </>;
}
