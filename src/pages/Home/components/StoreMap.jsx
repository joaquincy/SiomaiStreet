import { useEffect, useRef, useState } from 'react';

export default function StoreMap({ stores, selectedId, focusId, focusVersion = 0, onSelect, fitVersion, onError, searchOrigin, originVersion = 0, route, picking = false, onPoint, onCancelPick }) {
  const host = useRef(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const pointCallback = useRef(onPoint);
  pointCallback.current = onPoint;
  const [controller, setController] = useState(null);
  const [ready, setReady] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [wheel, setWheel] = useState(false);
  useEffect(() => {
    let cancelled = false, instance;
    // Split Leaflet AND its stylesheet out of the homepage's initial bundle.
    import('../../../utils/leafletMap.js').then(({ mountStoreMap }) => {
      if (cancelled) return;
      instance = mountStoreMap(host.current, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onSelect: id => select.current(id),
        onPoint: point => pointCallback.current?.(point),
        onReady: () => { if (!cancelled) setReady(true); },
        onError: () => { if (!cancelled) onError(); },
      });
      setController(instance);
    }).catch(() => { if (!cancelled) onError(); });
    return () => { cancelled = true; instance?.destroy(); };
  }, [onError]);
  useEffect(() => { controller?.update(stores); }, [controller, stores]);
  useEffect(() => { controller?.setOrigin(searchOrigin); }, [controller, searchOrigin]);
  useEffect(() => { controller?.select(selectedId); }, [controller, selectedId, stores]);
  useEffect(() => { if (focusId) controller?.focus(focusId); }, [controller, focusId, focusVersion, stores]);
  useEffect(() => { if (fitVersion) controller?.fit(); }, [controller, fitVersion]);
  useEffect(() => { if (originVersion) controller?.focusOrigin(); }, [controller, originVersion]);
  useEffect(() => { controller?.interact(interactive); }, [controller, interactive]);
  useEffect(() => { controller?.wheel(interactive && wheel); }, [controller, interactive, wheel]);
  useEffect(() => { controller?.setRoute(route); }, [controller, route]);
  useEffect(() => { controller?.pick(picking); if (picking) setInteractive(true); }, [controller, picking]);
  useEffect(() => { if (picking && ready) host.current?.focus({ preventScroll: true }); }, [picking, ready]);
  return <>
    <div className={`store-finder__leaflet-map${picking ? ' is-picking' : ''}`} ref={host} role="region" aria-label="Explore the map. Numbered pins mark Siomai Street branches." />
    {ready && picking && <><span className="store-finder__map-crosshair" aria-hidden="true">+</span><div className="store-finder__point-picker"><p role="status">Tap a road or place. Or move the map with arrow keys and select the center crosshair.</p><button type="button" onClick={() => controller?.chooseCenter()}>Use map center</button><button type="button" onClick={onCancelPick}>Cancel selection</button></div></>}
    {ready && <div className="store-finder__gesture-tools"><button type="button" className="store-finder__map-interact" aria-pressed={interactive} aria-label="Map gestures" onClick={() => setInteractive(value => !value)}>{interactive ? 'Pause gestures' : 'Enable gestures'}<span>{interactive ? 'Drag · pinch · double-click' : 'Scroll the page freely'}</span></button><button type="button" className="store-finder__wheel" aria-pressed={interactive && wheel} disabled={!interactive} onClick={() => setWheel(value => !value)}>Wheel zoom {interactive && wheel ? 'on' : 'off'}</button></div>}
    {!ready && <div className="store-finder__map-loading" role="status"><span aria-hidden="true" />Loading street map…</div>}
  </>;
}
