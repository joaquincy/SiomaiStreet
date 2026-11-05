import { UUID_PATTERN } from '../shared/application.js';
import { authorizeDocumentReviewer } from './directUploadServices.js';
import { readUploadJson } from './directUploads.js';

const fail = (message, status) => Object.assign(new Error(message), { status });
export function createFundingVerificationHandler({ url, serviceKey, request, rate, json, fetcher = fetch, allowUnscannedDocuments = false }) {
  return async (req, res, id) => {
    if (req.method !== 'POST') throw fail('Use POST for funding verification.', 405);
    if (!UUID_PATTERN.test(id)) throw fail('Application not found.', 404);
    if (!await rate(req)) throw fail('Too many review requests. Try again later.', 429);
    const user = await authorizeDocumentReviewer(req, { url, serviceKey, request, fetcher });
    const body = await readUploadJson(req, 6000);
    if (body.confirmedAvailable !== true || typeof body.notes !== 'string' || !body.notes.trim() || body.notes.length > 1000) {
      throw fail('Confirm that you reviewed the evidence and verified funding availability, and provide a note of at most 1000 characters.', 422);
    }
    let result;
    try {
      result = await request('/rest/v1/rpc/record_franchise_funding_verification', { method: 'POST', body: JSON.stringify({
        p_application: id, p_reviewer: user.id, p_notes: body.notes.trim(), p_allow_unscanned: allowUnscannedDocuments,
      }) });
    } catch {
      throw fail('Funding verification could not be recorded. Check that the application is open, its evidence is available, and no funding-document request is outstanding. If this continues, check the document-policy migration.', 409);
    }
    if (!result || result.applicationId !== id || result.status !== 'verified' || !UUID_PATTERN.test(result.id)) throw fail('The service did not confirm funding verification. Refresh and retry.', 503);
    res.setHeader('Cache-Control', 'no-store');
    json(res, 200, result);
  };
}
