let loading;
let generation = 0;
// Shared, on-demand SDK load; retries are possible after a network failure.
export function loadGoogleMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = `__siomaiStreetMapsReady${++generation}`;
    let finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      // Keep a harmless callback for a late response after a timeout.
      window[callback] = () => { };
      if (error) { script.remove(); reject(error); }
      else resolve(window.google.maps);
    };
    const timer = setTimeout(() => finish(new Error('Maps took too long to load.')), 15000);
    window[callback] = () => finish();
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, callback, loading: 'async', v: 'quarterly', language: 'en', region: 'PH' })}`;
    script.onerror = () => finish(new Error('Maps could not load.'));
    document.head.append(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
