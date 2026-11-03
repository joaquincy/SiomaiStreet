// Shared recovery wording for the main search and both route fields.
export async function mapRequest(path, payload, signal, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not connect to map services. Check your connection and press Search or Show route again. Your entries are kept.');
  }
  if (response.status === 404) throw new Error('This website version does not have the map service yet. Refresh after the latest deployment, or restart the local backend.');
  if (response.status === 403) throw new Error('Map requests from this website address were blocked. Reload the page; if this continues, the website administrator needs to check its allowed address configuration.');
  let body;
  try { body = await response.json(); } catch { throw new Error('The map service returned an unreadable response. Please retry shortly.'); }
  if (!response.ok) {
    if (response.status === 429) throw new Error('The map service has reached its search or route limit. Please try again later. Your selected places are kept.');
    throw new Error(typeof body?.error === 'string' ? body.error : 'The map service is unavailable. Please retry shortly.');
  }
  return body;
}
