import { useEffect, useRef, useState } from 'react';
import { coordinates } from '../../../../shared/storeLocations.js';
import { BiSearch, BiX } from 'react-icons/bi';
import { mapRequest } from '../../../utils/mapRequests';

export default function PlaceSearch({ onChoose, active = true, onExplore }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const work = useRef(null);
  const results = useRef(null);
  const input = useRef(null);
  const cancel = () => { work.current?.abort(); work.current = null; };
  useEffect(() => () => { work.current?.abort(); work.current = null; }, []);
  useEffect(() => { if (!active) { work.current?.abort(); work.current = null; setBusy(false); } }, [active]);
  const search = async event => {
    event.preventDefault(); cancel(); setPlaces([]); setFailed(false);
    if (query.trim().length < 3) { setStatus('Enter at least 3 characters, including a city or country.'); return; }
    const controller = new AbortController(); work.current = controller;
    const timer = setTimeout(() => controller.abort('timeout'), 12000);
    setBusy(true); setStatus('Searching places…');
    try {
      const body = await mapRequest('/api/place-search', {query:query.trim()}, controller.signal);
      if (!Array.isArray(body.places)) throw new Error('Place search is unavailable. Try the branch directory.');
      const found = body.places.slice(0,5).filter(place => typeof place?.label === 'string' && coordinates(place.position?.lat, place.position?.lng));
      if (work.current !== controller) return;
      setPlaces(found); setStatus(found.length ? `${found.length} results found. Select a place below to see it on the map.` : 'No matching places found. Try adding a city or country (e.g. "Daet, Philippines").');
      results.current?.focus();
    } catch (error) {
      if (work.current === controller) { setFailed(true); setStatus(controller.signal.aborted ? 'Search took too long. Please try again.' : error.message); }
    } finally {
      clearTimeout(timer);
      if (work.current === controller) { work.current = null; setBusy(false); }
    }
  };
  return <section id="store-place-search" hidden={!active} className="store-finder__place-search" aria-label="Worldwide place search">
    <form onSubmit={search}>
      <label htmlFor="store-place-query">Search an address or business worldwide</label>
      <div className="store-finder__place-input"><input ref={input} id="store-place-query" type="search" value={query} maxLength={180} autoComplete="off" placeholder="e.g. Bagasbas Beach, Daet, Philippines" aria-describedby="store-place-help" onChange={event => { cancel(); setBusy(false); setFailed(false); setPlaces([]); setStatus(''); setQuery(event.target.value); }} /><button type="submit" disabled={busy}><BiSearch aria-hidden="true" />{busy ? 'Searching…' : 'Search'}</button>{busy && <button type="button" onClick={() => { cancel(); setBusy(false); setStatus('Search cancelled.'); }}><BiX aria-hidden="true" />Cancel</button>}</div>
      <p id="store-place-help" className="store-finder__place-help-text">Enter a place + city, press Search, then select a result.</p>
    </form>
    <div ref={results} tabIndex={-1} className={failed ? 'store-finder__search-feedback is-error' : 'store-finder__search-feedback'}><p role="status" aria-live="polite">{status}</p>{failed && <div className="store-finder__search-recovery"><button type="button" onClick={search}>Retry search</button>{onExplore && <button type="button" onClick={onExplore}>Browse map without search</button>}</div>}
      {places.length > 0 && <ul aria-label="Place search results">{places.map((place,index) => <li key={`${index}:${place.label}`}><button type="button" onClick={() => { onChoose(place); setPlaces([]); setStatus('Place selected on the map.'); }}><span className="store-finder__place-result-label">{place.label}</span><span className="store-finder__place-result-action" aria-hidden="true">Select ↗</span></button></li>)}</ul>}
    </div>
    <small>Search sent to <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a></small>
  </section>;
}
