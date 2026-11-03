import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BiMap, BiSearch, BiCurrentLocation, BiNavigation, BiPhone, BiTime, BiArrowBack, BiArrowToRight, BiX, BiCopy, BiShareAlt, BiListUl, BiWalk, BiCar, BiBus, BiRefresh } from 'react-icons/bi';
import { coordinates, normalizeStore, directionsUrl, phoneUrl } from '../../../../shared/storeLocations';
import { beginLocationLookup, distanceLabel, linkedStoreId, locationErrorMessage, storeResults, storeShareUrl } from '../../../utils/storeFinder';
import StoreMap from './StoreMap';
import PlaceSearch from './PlaceSearch';
import RoutePlanner from './RoutePlanner';
import RoutePlannerModal from './RoutePlannerModal';
import { StoreCardsSkeleton } from '../../../components/Skeleton';
import './StoreFinder.css';

// Browsing the map is independent of branch publishing and place-search availability.

export default function StoreFinder() {
  const section = useRef(null);
  const [nearby, setNearby] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState({ status: 'loading', stores: [] });
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: '600px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearby) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setData({ status: 'loading', stores: [] });
    fetch('/api/store-locations', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Directory unavailable');
      const body = await response.json();
      if (!Array.isArray(body.stores)) throw new Error('Invalid directory');
      const stores = [...new Map(body.stores.map(normalizeStore).filter(Boolean).map(store => [store.id, store])).values()];
      if (active) setData({ status: 'ready', stores });
    }).catch(() => { if (active) setData({ status: 'error', stores: [] }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [nearby, attempt]);
  return <StoreFinderExperience sectionRef={section} data={data} onRetry={() => setAttempt(value => value + 1)} />;
}

export function StoreFinderExperience({ sectionRef, data, onRetry, mapsAvailable = true }) {
  const search = useRef(null);
  const details = useRef(null);
  const mapPanel = useRef(null);
  const directory = useRef(null);
  const locationWork = useRef({ cancel: null });
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [sharedId] = useState(() => typeof window === 'undefined' ? null : linkedStoreId(window.location.href));
  const [selectedId, setSelectedId] = useState(sharedId);
  const [focusId, setFocusId] = useState(sharedId);
  const [focusVersion, setFocusVersion] = useState(0);
  const [view, setView] = useState('map');
  const [searchMode, setSearchMode] = useState('places');
  const [originVersion, setOriginVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeOpen,setRouteOpen]=useState(false);
  const [routeSeed, setRouteSeed] = useState(null);
  const [pickingFor, setPickingFor] = useState(null);
  const [mobile, setMobile] = useState(true);
  const [position, setPosition] = useState(null);
  const [searchedPlace, setSearchedPlace] = useState(null);
  const [sort, setSort] = useState('name');
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
  const [mapRequested, setMapRequested] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const [mapFocusVersion, setMapFocusVersion] = useState(0);
  const [listFocusVersion, setListFocusVersion] = useState(0);
  const [detailsFocusVersion, setDetailsFocusVersion] = useState(0);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const failMap = useCallback(() => setMapError(true), []);
  useEffect(() => {
    const work = locationWork.current;
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); work.cancel?.(); };
  }, []);
  useEffect(() => {
    if (!mapFocusVersion) return;
    mapPanel.current?.focus({ preventScroll: true });
    mapPanel.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [mapFocusVersion]);
  useEffect(() => {
    if (listFocusVersion) directory.current?.focus();
  }, [listFocusVersion]);
  useEffect(() => {
    if (detailsFocusVersion) details.current?.focus();
  }, [detailsFocusVersion]);

  const regions = useMemo(() => [...new Set(data.stores.map(store => store.region).filter(Boolean))].sort(), [data.stores]);
  const cities = useMemo(() => [...new Set(data.stores.map(store => store.city).filter(Boolean))].sort().slice(0, 5), [data.stores]);
  const filtered = useMemo(() => storeResults(data.stores, { query, region, position, sort }), [data.stores, query, region, position, sort]);
  const mapped = useMemo(() => filtered.filter(store => store.position), [filtered]);
  const hasPins = data.stores.some(store => store.position);
  const selected = filtered.find(store => store.id === selectedId) || filtered[0];
  const streetPoint = searchedPlace?.position || selected?.position;
  const streetView = streetPoint ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetPoint.lat},${streetPoint.lng}` : null;
  const selectedIndex = selected ? filtered.findIndex(store => store.id === selected.id) : -1;
  const mapVisible = !mobile || view === 'map';
  const mapActive = mapsAvailable && mapRequested && !mapError;
  const choose = useCallback(id => { setSelectedId(id); setFocusId(id); setFocusVersion(value => value + 1); }, []);
  const reset = () => { setQuery(''); setRegion(''); setSelectedId(null); setFocusId(null); search.current?.focus(); };
  const showDetails = () => setDetailsFocusVersion(value => value + 1);
  const browse = () => { setView('list'); setDirectoryOpen(true); setListFocusVersion(value => value + 1); };
  const clearLocation = () => {
    locationWork.current.cancel?.(); setLocating(false); setPosition(null); setSearchedPlace(null); setSort('name');
    setLocationStatus('Location cleared. Stores are sorted by name.');
  };
  const locate = () => {
    if (!navigator.geolocation) { setLocationStatus('Location is unavailable in this browser. Search by city instead.'); return; }
    locationWork.current.cancel?.();
    setLocating(true); setLocationStatus('Waiting for your location. You can cancel and keep searching.');
    locationWork.current.cancel = beginLocationLookup(navigator.geolocation, {
      onSuccess: result => {
        const next = coordinates(result.coords.latitude, result.coords.longitude);
        setSearchedPlace(null);
        setPosition(next); setLocating(false); setSort(next ? 'nearest' : 'name'); setSelectedId(null); setFocusId(null);
        setLocationStatus(next ? 'Sorted by approximate straight-line distance, not travel time. Search filters still apply.' : 'Location unavailable. Search by city instead.');
      },
      onError: error => { setLocating(false); setLocationStatus(locationErrorMessage(error)); },
    });
  };
  const message = data.status === 'loading' ? 'Finding our stores…' : data.status === 'error' ? 'A little detour.' : !data.stores.length ? 'Our directory is being updated.' : !filtered.length ? 'No stops found here.' : '';
  const openMap = () => { setMapRequested(true); setMapError(false); setView('map'); setMapFocusVersion(value => value + 1); };
  const openPlanner = () => {
    setPickingFor(null);
    setMapRequested(true); setMapError(false); setView('map'); setRouteOpen(true);
  };
  const assignRoutePoint = (target, point) => {
    setRoute(null); setRouteSeed({ target, point }); openPlanner();
  };
  const pickPoint = target => {
    setRouteOpen(false); setPickingFor(target); openMap();
  };
  const selectMapPoint = point => {
    if (pickingFor === 'start' || pickingFor === 'destination') assignRoutePoint(pickingFor, point);
    else {
      locationWork.current.cancel?.(); setLocating(false);
      setSearchedPlace(point); setPosition(point.position); setSort('nearest'); setFocusId(null); setPickingFor(null);
    }
  };
  const choosePlace = place => {
    locationWork.current.cancel?.(); setLocating(false);
    setSearchedPlace(place); setPosition(place.position); setSort('nearest');
    setQuery(''); setRegion(''); setSelectedId(null); setFocusId(null); setDirectoryOpen(true);
    openMap();
    setLocationStatus('Search area selected. Branch filters cleared; distances are straight-line estimates, not travel times.');
  };
  const nearestDistance = position ? filtered.reduce((min, store) => Math.min(min, store.distance), Infinity) : Infinity;

  return <section className="store-finder" id="stores" aria-labelledby="store-finder-title" ref={sectionRef}>
    <div className="store-finder__poster">
      <header className="store-finder__heading">
        <div>
          <p className="store-finder__eyebrow">
            <span className="store-finder__eyebrow-line" aria-hidden="true" />
            <BiMap aria-hidden="true" />
            <span>GOOD FOOD. AROUND THE CORNER.</span>
          </p>
          <h2 id="store-finder-title">FIND YOUR <em>NEXT STOP.</em></h2>
        </div>
        <a className="store-finder__menu-link" href="#menu">Explore the menu <BiArrowToRight aria-hidden="true" /></a>
      </header>

      {/* ── Unified search area ── */}
      <div className="store-finder__unified-search">
        <div className="store-finder__search-tabs" role="tablist" aria-label="Search type">
          <button type="button" role="tab" aria-selected={searchMode === 'places'} onClick={() => setSearchMode('places')}>
            <BiSearch aria-hidden="true" />Search Places
          </button>
          <button type="button" role="tab" aria-selected={searchMode === 'stores'} onClick={() => setSearchMode('stores')}>
            <BiMap aria-hidden="true" />Our Branches
          </button>
        </div>

        {/* Place search panel */}
        <PlaceSearch active={searchMode === 'places'} onChoose={choosePlace} onExplore={openMap} />

        {/* Branch search panel */}
        <div id="store-branch-search" hidden={searchMode !== 'stores'}>
          <div className="store-finder__toolbar" role="search" aria-label="Search Siomai Street stores">
            <div className="store-finder__search"><label htmlFor="store-search">Find a Siomai Street branch</label><div><BiSearch aria-hidden="true" /><input ref={search} id="store-search" type="search" value={query} maxLength={120} placeholder="Type a city, area, or branch name..." onChange={event => { setQuery(event.target.value); setDirectoryOpen(true); setView('list'); setSelectedId(null); setFocusId(null); }} />{query && <button type="button" aria-label="Clear store search" onClick={() => { setQuery(''); search.current?.focus(); }}><BiX aria-hidden="true" /></button>}</div></div>
            {regions.length > 0 && <div className="store-finder__region"><label htmlFor="store-region">Narrow by region</label><select id="store-region" value={region} onChange={event => { setRegion(event.target.value); setDirectoryOpen(true); setView('list'); setSelectedId(null); setFocusId(null); }}><option value="">All regions</option>{regions.map(value => <option key={value}>{value}</option>)}</select></div>}
            <button type="button" className="store-finder__locate" onClick={locating ? clearLocation : locate} aria-describedby="store-location-note" disabled={!hasPins}><BiCurrentLocation aria-hidden="true" />{locating ? 'Cancel locating' : position && !searchedPlace ? 'Update my location' : 'Find near me'}</button>
          </div>
          {!filtered.length && data.stores.length > 0 && <div className="store-finder__no-match-hint">
            <p>No branches match "<strong>{query || region}</strong>"</p>
            <div className="store-finder__no-match-actions">
              <button type="button" onClick={reset}><BiRefresh aria-hidden="true" />Show all branches</button>
              <button type="button" onClick={() => setSearchMode('places')}><BiSearch aria-hidden="true" />Search any place instead</button>
            </div>
          </div>}
        </div>
      </div>

      {searchedPlace && hasPins && <p className="store-finder__search-origin">{nearestDistance > 50 ? 'No matching Siomai Street branch pin is within 50 km of this place. You can still explore it and get directions.' : 'Siomai Street branches are sorted by distance from your selected place.'}</p>}

      {/* ── Quick actions bar ── */}
      <div className="store-finder__quick-bar">
        <button type="button" className="store-finder__quick-action" onClick={openMap}>
          <BiMap aria-hidden="true" />
          <span>Explore Map</span>
        </button>
        <button type="button" className="store-finder__quick-action" onClick={openPlanner}>
          <BiNavigation aria-hidden="true" />
          <span>Get Directions</span>
        </button>
        <button type="button" className="store-finder__quick-action" onClick={locate} disabled={!hasPins}>
          <BiCurrentLocation aria-hidden="true" />
          <span>Near Me</span>
        </button>
      </div>

      <div className="store-finder__discovery">
        {cities.length > 0 && <div className="store-finder__cities" role="group" aria-label="Browse by city"><span>Or explore</span>{cities.map(city => <button type="button" key={city} aria-pressed={query === city && !region} onClick={() => { setDirectoryOpen(true); setView('list'); setQuery(query === city && !region ? '' : city); setRegion(''); setSelectedId(null); setFocusId(null); }}>{city}<span aria-hidden="true">↗</span></button>)}</div>}
        <p className="store-finder__privacy" id="store-location-note">{data.status === 'ready' && !hasPins ? 'Explore and get directions to any place. Our branch pins are still being prepared.' : 'Numbered pins are Siomai Street branches. Other places can be searched or selected on the map.'}{position && !searchedPlace && <button type="button" onClick={clearLocation}>Clear my location</button>}</p>
      </div>
      <p className="store-finder__location-status" role="status" aria-live="polite">{locationStatus}</p>
      {sharedId && data.status === 'ready' && !data.stores.some(store => store.id === sharedId) && <p className="store-finder__notice">That shared store is no longer in this directory. Browse the current stores below.</p>}

      <div className="store-finder__results-bar">
        <p role="status" aria-live="polite" aria-atomic="true">{data.status === 'ready' ? <><strong>{String(filtered.length).padStart(2, '0')}</strong> {filtered.length === 1 ? 'store' : 'stores'}{query || region ? ' found' : ' to explore'}</> : 'Store directory'}</p>
        {(query || region) && <button type="button" className="store-finder__text-button" onClick={reset}>Reset filters <BiX aria-hidden="true" /></button>}
        {position && <label className="store-finder__sort">Sort<select value={sort} onChange={event => setSort(event.target.value)}><option value="nearest">Nearest first</option><option value="name">Name A–Z</option></select></label>}
        {filtered.length > 1 && <div className="store-finder__pager" role="group" aria-label="Browse matching stores"><button type="button" aria-label="Previous store" disabled={selectedIndex <= 0} onClick={() => choose(filtered[selectedIndex - 1].id)}><BiArrowBack aria-hidden="true" /></button><span>{selectedIndex + 1} / {filtered.length}</span><button type="button" aria-label="Next store" disabled={selectedIndex >= filtered.length - 1} onClick={() => choose(filtered[selectedIndex + 1].id)}><BiArrowToRight aria-hidden="true" /></button></div>}
        <div className="store-finder__view-switch" role="group" aria-label="Store finder view"><button type="button" aria-pressed={view === 'list'} aria-controls="store-results" onClick={browse}><BiListUl aria-hidden="true" />List</button><button type="button" aria-pressed={view === 'map'} aria-controls="store-map-panel" onClick={() => { setView('map'); setMapFocusVersion(value => value + 1); }}><BiMap aria-hidden="true" />Map</button></div>
      </div>
      <p className="store-finder__sr-only" role="status" aria-live="polite" aria-atomic="true">{selected ? `Selected store: ${selected.name}. Store details, hours and directions have been updated.` : ''}</p>

      <div className={`store-finder__workspace store-finder__workspace--${view}`}>
        {selected ? <StoreDetails onRoute={selected.position ? () => assignRoutePoint('destination', { label: selected.name, position: selected.position }) : null} key={selected.id} store={selected} detailsRef={details} onBrowse={browse} onMap={mapsAvailable && selected.position ? () => { choose(selected.id); openMap(); } : null} /> : <div className="store-finder__unselected"><BiMap aria-hidden="true" /><h3>{message}</h3><p>{data.status === 'error' ? 'Please retry the directory below.' : 'Choose a store from the directory to see its address, hours and directions.'}</p></div>}
        <div className="store-finder__map-panel" id="store-map-panel" role="region" tabIndex={-1} ref={mapPanel} aria-label="Store map">
          <div className="store-finder__map-stage">
            {mapActive && mapVisible ? <StoreMap picking={!!pickingFor} onPoint={selectMapPoint} onCancelPick={() => { setPickingFor(null); }} route={route} originVersion={originVersion} searchOrigin={searchedPlace} stores={mapped} selectedId={selected?.id} focusId={focusId} focusVersion={focusVersion} onSelect={choose} fitVersion={fitVersion} onError={failMap} /> : <MapInvitation available={mapsAvailable} failed={mapError} count={mapped.length || (searchedPlace ? 1 : 0)} loading={data.status === 'loading'} onLoad={openMap} />}
          </div>
          {route && <div className="store-finder__route-summary" role="status"><strong>{route.mode === 'walk' ? 'Walking' : 'Driving'} · {(route.distance/1000).toFixed(1)} km · ~{Math.max(1,Math.round(route.seconds/60))} min</strong><span className="store-finder__route-endpoints">A: {route.from}<br />B: {route.to}</span><button type="button" onClick={()=>setRoute(null)}>Clear route</button></div>}
          {mapActive && <div className="store-finder__map-links"><button type="button" aria-controls="store-route-dialog" aria-haspopup="dialog" onClick={openPlanner}><BiNavigation aria-hidden="true" />Get Directions</button>{mapped.length > 0 && <button type="button" onClick={() => { setFocusId(null); setFitVersion(value => value + 1); }}><BiMap aria-hidden="true" />Show All Branches</button>}{streetView && <a href={streetView} target="_blank" rel="noopener noreferrer"><BiMap aria-hidden="true" />Street View</a>}</div>}
          {filtered.length > mapped.length && <p className="store-finder__map-note">{filtered.length - mapped.length} {filtered.length - mapped.length === 1 ? 'store has' : 'stores have'} no published pin.</p>}
        </div>
        <details className="store-finder__directory" open={!selected || directoryOpen} onToggle={event => { if (selected) setDirectoryOpen(event.currentTarget.open); }}>
          <summary className="store-finder__directory-heading" id="store-results" ref={directory}><BiListUl aria-hidden="true" /><span>Browse all matching stores</span><span className="store-finder__expand" aria-hidden="true">+</span></summary>
          <div className="store-finder__list" aria-label="Matching stores" aria-busy={data.status === 'loading'}>
            {message ? <div className="store-finder__empty"><BiMap aria-hidden="true" /><h3>{message}</h3><p>{data.status === 'error' ? 'Store information is temporarily unavailable. Please try again.' : data.status === 'loading' ? 'Getting the latest branch information.' : data.stores.length ? 'Try a nearby city, a landmark or a shorter name.' : 'Our directory is being updated. Check back for current branch details.'}</p>{data.status === 'loading' && <StoreCardsSkeleton count={3} />}{data.status === 'error' && <button type="button" onClick={onRetry}><BiRefresh aria-hidden="true" />Try again</button>}{data.stores.length > 0 && <button type="button" onClick={reset}>Show all stores</button>}</div>
              : <ul role="list">{filtered.map((store, index) => <li key={store.id}><button type="button" className={`store-finder__card${selected?.id === store.id ? ' is-selected' : ''}`} aria-pressed={selected?.id === store.id} aria-controls="store-details" onClick={() => { choose(store.id); if (mobile) showDetails(); }}><span className="store-finder__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span><span className="store-finder__city">{store.city || store.region || 'Siomai Street'}</span><strong>{store.name}</strong><span className="store-finder__address">{store.address || 'Address details coming soon'}</span>{position && store.position && <small>{distanceLabel(store.distance)} · straight-line distance</small>}</span><span className="store-finder__card-arrow" aria-hidden="true">↗</span></button></li>)}</ul>}
          </div>
        </details>
      </div>
    </div>
    <RoutePlannerModal open={routeOpen} onClose={() => setRouteOpen(false)}>
      <RoutePlanner active={routeOpen} seed={routeSeed} store={selected} searchPoint={searchedPlace} onRoute={setRoute} onExplore={() => { setRouteOpen(false); openMap(); }} />
    </RoutePlannerModal>
  </section>;
}

export function MapInvitation({ available, failed, count, loading, onLoad }) {
  return <div className="store-finder__map-placeholder">
    <svg className="store-finder__map-art" viewBox="0 0 700 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="sf-blocks" width="88" height="78" patternTransform="rotate(-16)" patternUnits="userSpaceOnUse"><path d="M9 8h24v19H9zM47 11h27v20H47zM12 43h20v23H12zM48 47h23v18H48z" fill="#f3d58b" stroke="#a74835" strokeWidth="1" /></pattern></defs><path fill="url(#sf-blocks)" d="M0 0h700v440H0z" /><path className="sf-road-edge" d="M-80 360 800 50M100-60 230 500M490-50 600 500M-50 90 760 370" /><path className="sf-road" d="M-80 360 800 50M100-60 230 500M490-50 600 500M-50 90 760 370" /><path className="sf-route" d="m110 312 97-35 49 204" /></svg>
    <div className="store-finder__map-invite"><span className="store-finder__map-symbol" aria-hidden="true"><BiMap /></span><h3>{failed ? 'The map took a detour.' : 'Explore the Street Map'}</h3><p>{failed ? 'The street map could not load. You can still use the store list and directions.' : !available ? 'Our interactive map is coming soon. Find store details and directions in the directory.' : loading ? 'Finding the stores to show on your map.' : !count ? 'Browse streets and places now. Search any location and get directions — store pins will appear when published.' : 'See our locations on the map and explore the streets around them.'}</p>{available && <><button type="button" onClick={onLoad}>{failed ? 'Retry map' : 'Explore the map'} <BiArrowToRight aria-hidden="true" /></button><small>Loads OpenStreetMap tiles. <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">Map privacy policy<span className="store-finder__sr-only"> (opens in a new tab)</span></a></small></>}</div><span className="store-finder__illustration-note">Illustration · click the button above to load the live map</span>
  </div>;
}

export function StoreDetails({ store, detailsRef, onMap, onBrowse, onRoute }) {
  const [mode, setMode] = useState('driving');
  const [note, setNote] = useState('');
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const directions = directionsUrl(store, mode), phone = phoneUrl(store.phone);
  const copy = async (value, success) => {
    setNote('');
    try { await navigator.clipboard.writeText(value); if (alive.current) setNote(success); }
    catch { if (alive.current) setNote('Copy is unavailable. Select the address manually or use Get directions.'); }
  };
  const share = async () => {
    const url = storeShareUrl(store, window.location.origin);
    setNote('');
    if (!navigator.share) { await copy(url, 'Store link copied. Share it with someone hungry.'); return; }
    try { await navigator.share({ title: `${store.name} — Siomai Street`, url }); if (alive.current) setNote('Store link sent to your sharing app.'); }
    catch (error) { if (error.name !== 'AbortError' && alive.current) setNote('Sharing is unavailable. Use Copy store link instead.'); }
  };
  return <section id="store-details" className="store-finder__details" aria-labelledby="store-details-title" tabIndex={-1} ref={detailsRef}>
    <div className="store-finder__details-main"><div className="store-finder__selection-label"><span className="store-finder__eyebrow"><BiMap aria-hidden="true" />YOUR SELECTED STOP</span>{onBrowse && <button type="button" onClick={onBrowse}>Change store <BiArrowToRight aria-hidden="true" /></button>}</div><h3 id="store-details-title">{store.name}</h3><address>{store.address || 'Address details coming soon'}</address>{store.landmark && <p className="store-finder__landmark">Landmark: {store.landmark}</p>}</div>
    <div className="store-finder__route"><h4>Your way here</h4>{directions ? <><div className="store-finder__travel" role="group" aria-label="Travel mode">{[['driving', 'Drive', BiCar], ['walking', 'Walk', BiWalk], ['transit', 'Transit', BiBus]].map(([value, label, Icon]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}><Icon aria-hidden="true" />{label}</button>)}</div><div className="store-finder__primary-actions">{onRoute && <button type="button" className="store-finder__directions" onClick={onRoute}><BiNavigation aria-hidden="true" />Directions on map</button>}<a className="store-finder__directions" href={directions} target="_blank" rel="noopener noreferrer"><BiNavigation aria-hidden="true" />Open Google Maps<span className="store-finder__sr-only"> to {store.name} (opens Google Maps)</span></a>{phone && <a className="store-finder__phone" href={phone}><BiPhone aria-hidden="true" />Call store<span className="store-finder__sr-only"> {store.phone} — {store.name}</span></a>}</div><small>{store.position ? 'Google Maps calculates your route and travel time.' : 'Directions use the published address. Confirm the destination before travelling.'}</small></> : <><p>Directions will be available once an address or map pin is published.</p>{phone && <a className="store-finder__phone" href={phone}><BiPhone aria-hidden="true" />Call store<span className="store-finder__sr-only"> {store.phone} — {store.name}</span></a>}</>}</div>
    <details className="store-finder__visit"><summary><BiTime aria-hidden="true" />Hours &amp; visit information<span className="store-finder__expand" aria-hidden="true">+</span></summary><p>{store.hours || 'Opening hours have not been published.'}</p>{store.holidayNote && <p className="store-finder__holiday">{store.holidayNote}</p>}<small>Hours may change on holidays. Contact the store to confirm your visit.</small><p className="store-finder__contact-missing">{store.phone ? `Contact: ${store.phone}` : 'A store phone number hasn\'t been published yet.'}</p></details>
    <details className="store-finder__more"><summary>Share & save this stop <BiShareAlt aria-hidden="true" /></summary><div className="store-finder__quick-actions">{store.address && <button type="button" onClick={() => copy(store.address, 'Address copied. You\'re one step closer.')}><BiCopy aria-hidden="true" />Copy address</button>}<button type="button" onClick={share}><BiShareAlt aria-hidden="true" />Share store</button><button type="button" onClick={() => copy(storeShareUrl(store, window.location.origin), 'Store link copied.')}><BiCopy aria-hidden="true" />Copy store link</button>{onMap && <button type="button" onClick={onMap}><BiMap aria-hidden="true" />View pin</button>}</div></details>
    <p className="store-finder__action-status" role="status" aria-live="polite" aria-atomic="true">{note}</p>
  </section>;
}
