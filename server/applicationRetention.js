import { maintenanceAuthorized } from './directUploadServices.js';
import { UUID_PATTERN } from '../shared/application.js';

// Bounded calls work on Vercel and continuously running Node. PostgreSQL leases,
// not process-local flags, prevent concurrent workers from finishing the same case.
export async function processApplicationRetention({ request, remove, signal }) {
  const rpc = (name, body = {}) => request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body), signal });
  const job = await rpc('claim_franchise_erasure');
  if (!job) return { processed: 0, objectsRemoved: 0, siteDeleted: false };
  if (!UUID_PATTERN.test(job.id) || !UUID_PATTERN.test(job.lease)) throw new Error('Invalid retention job.');
  const args = { p_job: job.id, p_lease: job.lease };
  let removed = 0;
  try {
    // At most 50 objects per call. Large cases progress across subsequent runs.
    const objects = await rpc('franchise_erasure_batch', args);
    if (!Array.isArray(objects) || objects.length > 50 || objects.some(object =>
      !['franchise-documents','franchise-quarantine'].includes(object.bucket) ||
      typeof object.path !== 'string' || !/^(?:direct\/)?[0-9a-f-]{36}\/[A-Za-z0-9/_-]+$/.test(object.path))) {
      throw new Error('Invalid retention object list.');
    }
    for (const bucket of ['franchise-quarantine', 'franchise-documents']) {
      const batch = objects.filter(object => object.bucket === bucket);
      if (!batch.length) continue;
      signal?.throwIfAborted();
      await remove(bucket, batch.map(object => object.path), { signal });
      // A lost acknowledgement is safe: removing an already absent object is idempotent.
      await rpc('ack_franchise_erasure_objects', { ...args, p_objects: batch });
      removed += batch.length;
    }
    const siteDeleted = await rpc('finish_franchise_erasure', args);
    if (siteDeleted !== true && siteDeleted !== false) throw new Error('Invalid deletion receipt.');
    if (!siteDeleted) await rpc('release_franchise_erasure', { ...args, p_failed: false });
    return { processed: 1, objectsRemoved: removed, siteDeleted, externalCleanupPending: siteDeleted };
  } catch (error) {
    // An aborted invocation may be unable to release. The DB lease expires anyway.
    await rpc('release_franchise_erasure', { ...args, p_failed: true }).catch(() => {});
    throw error;
  }
}

export function createApplicationRetentionMaintenance({ env, request, remove, json }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Use POST.' });
    }
    if (!maintenanceAuthorized(req.headers.authorization, env.APPLICATION_RETENTION_SECRET)) {
      return json(res, 403, { error: 'Not authorized.' });
    }
    if (env.APPLICATION_RETENTION_ENABLED !== 'true') return json(res, 503, { error: 'Application retention processing is not enabled.' });
    try {
      return json(res, 200, await processApplicationRetention({ request, remove, signal: AbortSignal.timeout(25000) }));
    } catch {
      // Never expose applicant identifiers, object paths, provider errors or SQL details.
      return json(res, 503, { error: 'Application deletion could not be completed. The job is retained for retry and staff review.' });
    }
  };
}
