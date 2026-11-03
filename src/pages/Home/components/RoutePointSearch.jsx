import { useEffect, useRef, useState } from 'react';
import { BiCheck, BiSearch, BiX } from 'react-icons/bi';
import { latestMapRequest, routePoint } from '../../../utils/routePlanner';
import { mapRequest } from '../../../utils/mapRequests';

export default function RoutePointSearch({ id, label, marker, value, onChange, active, suggestion }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef(null);
  const work = useRef(null);
  if (!work.current) work.current = latestMapRequest();
  useEffect(() => () => { work.current.cancel(); }, []);
  useEffect(() => { if (suggestion) setQuery((suggestion.query || '').slice(0, 180)); }, [suggestion]);
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
      setStatus(found.length ? `${found.length} result${found.length > 1 ? 's' : ''}. Select a match below.` : 'No results. Try a different name or add a city.');
    } catch (error) {
      if (request.isLatest()) { setFailed(true); setStatus(request.signal.aborted ? 'Timed out. Try again.' : error.message); }
    } finally {
      if (request.isLatest()) setBusy(false);
      request.finish();
    }
  };

  const handleSubmit = event => { event.preventDefault(); doSearch(); };

  return <div className="store-finder__route-point">
    <label htmlFor={id}><span className="store-finder__point-marker" aria-hidden="true">{marker}</span>{label}</label>
    <form onSubmit={handleSubmit} aria-label={`Search ${label.toLowerCase()}`}>
      <div className={`store-finder__point-field${value ? ' is-selected' : ''}`}>
        <input ref={input} id={id} type="text" value={value?.label ?? query} maxLength={180} autoComplete="off"
          placeholder={marker === 'A' ? 'Type a place, e.g. SM City Daet' : 'Type a destination, e.g. Daet, Philippines'}
          aria-describedby={`${id}-hint ${id}-status`} aria-invalid={failed || undefined}
          readOnly={!!value}
          onChange={event => edit(event.target.value)} />
        {value && <span className="store-finder__point-ok"><BiCheck aria-hidden="true" /></span>}
        {(value || query) && <button className="store-finder__point-x" type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { edit(''); input.current?.focus(); }}><BiX aria-hidden="true" /></button>}
      </div>
      {!value && <button className="store-finder__route-chip" type="submit" disabled={busy}><BiSearch aria-hidden="true" />{busy ? 'Searching…' : 'Search'}</button>}
    </form>
    <small id={`${id}-hint`}>{value ? 'Selected. Clear to change.' : 'Enter a place + city, press Search, then select a result.'}</small>
    <p id={`${id}-status`} role="status" aria-live="polite" className={busy ? 'store-finder__sr-only' : `store-finder__point-msg${failed ? ' is-error' : ''}`}>{status}</p>
    {places.length > 0 && <ul className="store-finder__point-results" aria-label={`${label} search results`}>
      {places.map((place, index) => <li key={`${index}:${place.label}`}><button type="button" onClick={() => {
        setQuery(place.label); setPlaces([]); setStatus(''); onChange(place); input.current?.focus();
      }}>{place.label}<BiCheck aria-hidden="true" /></button></li>)}
    </ul>}
  </div>;
}
