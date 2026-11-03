import { useEffect, useRef, useState } from 'react';
import { BiCar, BiWalk, BiCurrentLocation, BiNavigation, BiTransferAlt } from 'react-icons/bi';
import { beginLocationLookup } from '../../../utils/storeFinder';
import { initialRoutePoints, latestMapRequest, routePoint, routeProblem } from '../../../utils/routePlanner';
import RoutePointSearch from './RoutePointSearch';
import { mapRequest } from '../../../utils/mapRequests';

export default function RoutePlanner({ store, searchPoint, seed, onPickPoint, onRoute, onExplore, active = true, focusVersion = 0 }) {
  const [start, setStart] = useState(() => initialRoutePoints(store, searchPoint).start);
  const [destination, setDestination] = useState(() => initialRoutePoints(store, searchPoint).destination);
  const [mode, setMode] = useState('drive');
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const heading = useRef(null), location = useRef(null), work = useRef(null);
  if (!work.current) work.current = latestMapRequest();
  const branchPoint = routePoint({ label: store?.name, position: store?.position });
  const problem = routeProblem(start, destination);
  // A map selection changes only the requested endpoint; opening the dialog
  // or browsing another branch must not reset the user's other endpoint.
  useEffect(() => {
    if (!seed) return;
    work.current.cancel(); location.current?.(); setBusy(false); setLocating(false); setStatus(''); setFailed(false);
    if (seed.target === 'start') setStart(routePoint(seed.point));
    else setDestination(routePoint(seed.point));
  }, [seed]);
  useEffect(() => () => { work.current.cancel(); location.current?.(); }, []);
  useEffect(() => {
    if (!active) {
      work.current.cancel(); location.current?.(); location.current = null;
      setBusy(false); setLocating(false); setStatus(''); setFailed(false);
    } else if (focusVersion) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [active, focusVersion]);

  const invalidate = () => { work.current.cancel(); setBusy(false); onRoute(null); setStatus(''); setFailed(false); };
  const stopLocation = () => { location.current?.(); location.current = null; setLocating(false); };
  const changeStart = point => { invalidate(); stopLocation(); setStart(point); };
  const changeDestination = point => { invalidate(); setDestination(point); };
  const locate = () => {
    invalidate(); stopLocation();
    if (!navigator.geolocation) { setFailed(true); setStatus('Location unavailable. Type your address instead.'); return; }
    setLocating(true); setStatus('Getting your location…');
    location.current = beginLocationLookup(navigator.geolocation, {
      onSuccess: value => {
        const point = routePoint({ label: 'My current location', position: { lat: value.coords.latitude, lng: value.coords.longitude } });
        setLocating(false);
        if (point) { setStart(point); setStatus(''); }
        else { setFailed(true); setStatus('Could not read location. Type your address instead.'); }
      },
      onError: error => {
        setLocating(false); setFailed(true);
        setStatus(error?.code === 1 ? 'Location permission denied.' : 'Location unavailable. Type your address instead.');
      },
    });
  };
  const calculate = async () => {
    if (busy || locating) return;
    if (problem) {
      setFailed(true); setStatus(problem);
      document.getElementById(!start ? 'store-route-from' : 'store-route-to')?.focus();
      return;
    }
    invalidate(); const request = work.current.start(18000);
    setBusy(true); setStatus('Finding your route…');
    try {
      const body = await mapRequest('/api/store-route', { start: start.position, end: destination.position, mode }, request.signal);
      if (!body.route?.paths?.length || !Number.isFinite(body.route.distance) || !Number.isFinite(body.route.seconds)) throw new Error('Could not find a route. Try different places.');
      if (request.signal.aborted) throw new Error('Cancelled.');
      if (!request.isCurrent()) return;
      onRoute({ ...body.route, from: start.label, to: destination.label, mode }); onExplore();
      setStatus('');
    } catch (error) {
      if (request.isLatest()) { setFailed(true); setStatus(request.signal.aborted ? 'Timed out. Please retry.' : error.message); }
    } finally {
      if (request.isLatest()) setBusy(false);
      request.finish();
    }
  };

  return <section id="store-route-planner" className="store-finder__route-planner" aria-labelledby="store-route-title" hidden={!active}>
    <div className="store-finder__route-header">
      <h4 id="store-route-title" ref={heading} tabIndex={-1}>Get Directions</h4>
      <p>Choose your start and destination.</p>
    </div>

    <div className="store-finder__route-fields">
      <RoutePointSearch id="store-route-from" label="From" marker="A" value={start} onChange={changeStart} active={active} />
      {!start && <button type="button" className="store-finder__route-chip" onClick={locating ? () => { stopLocation(); setStatus(''); } : locate}>
        <BiCurrentLocation aria-hidden="true" />{locating ? 'Cancel location lookup' : 'Use my location'}
      </button>}
      {onPickPoint && <button type="button" className="store-finder__route-chip" onClick={() => onPickPoint('start')}>Choose start on map</button>}

      <button type="button" className="store-finder__route-swap" disabled={!start || !destination || locating} onClick={() => { invalidate(); stopLocation(); setStart(destination); setDestination(start); }} aria-label="Swap start and destination">
        <BiTransferAlt aria-hidden="true" />
      </button>

      <RoutePointSearch id="store-route-to" label="To" marker="B" value={destination} onChange={changeDestination} active={active} suggestion={seed?.target === 'destination' ? seed : null} />
      {seed?.query && !destination && <small>This branch has no confirmed pin. Search its address and select the correct place.</small>}
      {onPickPoint && <button type="button" className="store-finder__route-chip" onClick={() => onPickPoint('destination')}>Choose destination on map</button>}
      {!destination && branchPoint && <button type="button" className="store-finder__route-chip" onClick={() => changeDestination(branchPoint)}>
        <BiNavigation aria-hidden="true" />Use {store.name}
      </button>}
    </div>

    <fieldset className="store-finder__route-modes"><legend>Travel mode</legend><div>
      {[[ 'drive', 'Drive', BiCar ], [ 'walk', 'Walk', BiWalk ]].map(([value, label, Icon]) => <label key={value} className={mode === value ? 'is-active' : ''}>
        <input type="radio" name="store-route-mode" value={value} checked={mode === value} onChange={() => { invalidate(); setMode(value); }} /><Icon aria-hidden="true" />{label}
      </label>)}
    </div></fieldset>

    <button type="button" className="store-finder__show-route" aria-describedby="store-route-readiness" disabled={busy || locating} onClick={calculate}><BiNavigation aria-hidden="true" />{busy ? 'Finding route…' : 'Show Route'}</button>

    <p id="store-route-readiness" className="store-finder__route-readiness" hidden={!!status}>{locating ? 'Getting your location…' : problem || 'Ready. Show route will draw directions between A and B.'}</p>
    {status && <p className={failed ? 'store-finder__route-msg is-error' : 'store-finder__route-msg is-ok'} role="status" aria-live="polite">{status}</p>}
    {!status && <p className="store-finder__route-msg" role="status" aria-live="polite" />}
    <small className="store-finder__route-credit">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></small>
  </section>;
}
