import { publicStore } from '../shared/storeLocations.js';

export function createStoreLocationsReader(request, now = Date.now) {
  let cached, expires = 0, pending;
  async function readAll(path) {
    const rows = [];
    for (let offset = 0; offset < 10000; offset += 500) {
      const page = await request(`${path}&limit=500&offset=${offset}`);
      if (!Array.isArray(page)) throw new Error('Invalid store directory response.');
      rows.push(...page);
      if (page.length < 500) return rows;
    }
    throw new Error('Store directory exceeds configured capacity.');
  }
  return async () => {
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      const branches = await readAll('/rest/v1/branches?select=branch_id,branch_name,branch_address,branch_status&branch_status=eq.Active&order=branch_id.asc');
      let profiles;
      try {
        profiles = await readAll('/rest/v1/store_locator_profiles?select=branch_id,published,city,region,landmark,public_phone,hours_note,holiday_note,latitude,longitude,google_place_id&published=eq.true&order=branch_id.asc');
      } catch (error) {
        // A staged rollout can show the existing directory before the additive migration.
        let code;
        try { code = JSON.parse(error.detail || '{}').code; } catch { /* not a database error */ }
        if (!['42P01', 'PGRST205'].includes(code)) throw error;
        profiles = [];
      }
      const byId = new Map(profiles.map(profile => [String(profile.branch_id), profile]));
      const stores = branches.map(branch => publicStore(branch, byId.get(String(branch.branch_id)))).filter(Boolean);
      cached = { stores };
      expires = now() + 60000;
      return cached;
    })().finally(() => { pending = null; });
    return pending;
  };
}
