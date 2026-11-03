import { useEffect, useRef, useState } from 'react';
import { BiCheck, BiSearch, BiX } from 'react-icons/bi';
import { latestMapRequest, routePoint } from '../../../utils/routePlanner';
import { mapRequest } from '../../../utils/mapRequests';

export default function RoutePointSearch({ id, label, marker, value, onChange, active }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef(null);
  const work = useRef(null);
  const autoTimer = useRef(null);
  if (!work.current) work.current = latestMapRequest();
  useEffect(() => () => { work.current.cancel(); clearTimeout(autoTimer.current); }, []);
  useEffect(() => {
    work.current.cancel(); setBusy(false); setPlaces([]); setStatus(''); setFailed(false);
  }, [active, value]);

  const edit = text => {
    work.current.cancel(); setBusy(false); setPlaces([]); setStatus(''); setFailed(false);
    setQuery(text); onChange(null);
  };

  const doSearch = async () => {
    if (!active || busy || value) return;
    work.current.cancel(); setPlaces([]); setFailed(false);
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setFailed(true); setStatus('Type at least 3 characters.');
      input.current?.focus(); return;
    }
    const request = work.current.start(12000);
    setBusy(true); setStatus('Searching…');
    try {
      const body = await mapRequest('/api/place-search', { query: trimmed }, request.signal);
      if (!Array.isArray(body.places)) throw new Error('Search failed. Try again.');
      const found = body.places.slice(0, 5).map(routePoint).filter(Boolean);
      if (request.signal.aborted) throw new Error('Search cancelled.');
      if (!request.isCurrent()) return;
      setPlaces(found);
      setStatus(found.length ? `${found.length} result${found.length > 1 ? 's' : ''} — tap to select` : 'No results. Try a different name or add a city.');
    } catch (error) {
      if (request.isLatest()) { setFailed(true); setStatus(request.signal.aborted ? 'Timed out. Try again.' : error.message); }
    } finally {
      if (request.isLatest()) setBusy(false);
      request.finish();
    }
  };

  // Auto-search after 700ms of typing (3+ chars)
  useEffect(() => {
    clearTimeout(autoTimer.current);
    if (value || query.trim().length < 3 || !active) return;
    autoTimer.current = setTimeout(() => doSearch(), 700);
    return () => clearTimeout(autoTimer.current);
  });

  const handleSubmit = event => { event.preventDefault(); doSearch(); };

  return <div className="store-finder__route-point">
    <label htmlFor={id}><span className="store-finder__point-marker" aria-hidden="true">{marker}</span>{label}</label>
    <form onSubmit={handleSubmit} aria-label={`Search ${label.toLowerCase()}`}>
      <div className={`store-finder__point-field${value ? ' is-selected' : ''}`}>
        <input ref={input} id={id} type="text" value={value?.label ?? query} maxLength={180} autoComplete="off"
          placeholder={marker === 'A' ? 'Type a place, e.g. SM City Daet' : 'Type a destination, e.g. Daet, Philippines'}
          aria-describedby={`${id}-status`} aria-invalid={failed || undefined}
          readOnly={!!value}
          onChange={event => edit(event.target.value)} />
        {value
          ? <span className="store-finder__point-ok"><BiCheck aria-hidden="true" /></span>
          : busy
            ? <span className="store-finder__point-busy" aria-label="Searching">⏳</span>
            : null}
        {(value || query) && <button className="store-finder__point-x" type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { edit(''); input.current?.focus(); }}><BiX aria-hidden="true" /></button>}
      </div>
    </form>
    <p id={`${id}-status`} role="status" aria-live="polite" className={`store-finder__point-msg${failed ? ' is-error' : ''}`}>{status}</p>
    {places.length > 0 && <ul className="store-finder__point-results" aria-label={`${label} search results`}>
      {places.map((place, index) => <li key={`${index}:${place.label}`}><button type="button" onClick={() => {
        setQuery(place.label); setPlaces([]); setStatus(''); onChange(place); input.current?.focus();
      }}>{place.label}<BiCheck aria-hidden="true" /></button></li>)}
    </ul>}
  </div>;
}
