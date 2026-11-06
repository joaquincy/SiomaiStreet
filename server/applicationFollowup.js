import { createHash } from 'node:crypto';
import { UUID_PATTERN, getApplicationDocuments } from '../shared/application.js';
import { CHANGE_GROUPS, prepareApplicationChange, changeView, requiredChangeDocuments } from '../shared/applicationFollowup.js';
import { readUploadJson } from './directUploads.js';
import { authorizeDocumentReviewer } from './directUploadServices.js';
import { isAcceptedScan } from './documentScanner.js';
import { CORRECTION_FIELDS } from '../shared/fieldCorrections.js';

const fail = (message, status = 422) => Object.assign(new Error(message), { status });
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
export const followupHash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const rawView = (data, group) => Object.fromEntries(CHANGE_GROUPS[group].fields.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
const note = (value, min = 1) => {
  if (typeof value !== 'string' || value.trim().length < min || value.length > 1000) throw fail(`Enter a note of ${min} to 1,000 characters.`);
  return value.trim();
};
const revision = value => { if (!Number.isSafeInteger(value) || value < 1) throw fail('Refresh to load the current version.'); return value; };
const requestId = value => { if (!UUID_PATTERN.test(value || '')) throw fail('Invalid update reference.'); return value; };

export function createApplicationFollowup({ request, access, rate, json, url, serviceKey, fetcher = fetch, allowUnscannedDocuments = false }) {
  const first = async path => (await request('/rest/v1/' + path))?.[0];
  const rpc = async (name, body) => {
    try { return await request('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(body) }); }
    catch { throw fail('The record changed or this action is unavailable. Refresh and compare your answers before retrying. Your unsent changes are kept.', 409); }
  };
  const application = async (id, applicant = true) => {
    const a = await first(`franchise_applications?id=eq.${id}&select=id,status,application_data,document_paths,answer_revision,reassessment_required,submitted_at,portal_access_revoked&limit=1`);
    if (!a || (applicant && (a.portal_access_revoked || !Number.isFinite(Date.parse(a.submitted_at)) || Date.now() >= Date.parse(a.submitted_at) + 90 * 86400000))) throw fail('Application access has expired or is unavailable. Contact support.', 401);
    if ((await request(`/rest/v1/franchise_erasure_jobs?application_id=eq.${id}&select=id&limit=1`)).length) throw fail('This application is being erased; access is closed.', 410);
    return a;
  };
  const authenticate = async (req, id, staff = false) => {
    if (!UUID_PATTERN.test(id)) throw fail('Application not found.', 404);
    if (!await rate(req, staff ? 'staff-documents' : 'portal', staff ? 100 : 60)) throw fail('Too many requests. Wait before retrying.', 429);
    if (staff) return authorizeDocumentReviewer(req, { url, serviceKey, request, fetcher });
    access.verify(id, req.headers.authorization?.replace(/^Bearer /, ''));
    return null;
  };
  const requireOpen = a => { if (['declined', 'withdrawn'].includes(a.status)) throw fail('This application is closed. Contact support for corrections.', 409); };
  const requireOnboarding = a => { if (a.status !== 'approved' || a.reassessment_required) throw fail('Personal onboarding becomes available after approval and resolution of any reassessment.', 409); };
  const list = async (id, a, staff) => {
    const [changes, items, events, fieldRequests] = await Promise.all([
      request(`/rest/v1/franchise_answer_changes?application_id=eq.${id}&order=created_at.desc&limit=200`),
      request(`/rest/v1/franchise_onboarding_items?application_id=eq.${id}&order=created_at.asc&limit=100`),
      request(`/rest/v1/franchise_onboarding_events?application_id=eq.${id}&order=created_at.desc&limit=200`),
      request(`/rest/v1/franchise_field_requests?application_id=eq.${id}&order=created_at.desc&limit=50`),
    ]);
    return {
      id, revision: a.answer_revision, status: a.status, reassessmentRequired: a.reassessment_required,
      fieldRequests: fieldRequests.map(r => ({ id: r.id, field: r.field_key, reason: r.reason, state: r.state, revision: r.revision,
        current: r.field_key === 'govIdNumber' ? 'Current number kept private' : a.application_data[r.field_key] || '',
        responseNote: r.response_note, reviewNote: r.review_note, changeId: r.change_id, receivedAt: r.received_at })),
      groups: Object.fromEntries(Object.keys(CHANGE_GROUPS).map(group => [group, changeView(a.application_data, group)])),
      changes: changes.map(c => ({ id: c.id, category: c.category, current: changeView(c.previous_values, c.category), proposed: changeView(c.proposed_values, c.category), reason: c.reason, state: c.state, reviewNote: c.review_note, createdAt: c.created_at,
        documents: (c.required_documents || []).map(key => ({ key, label: getApplicationDocuments({ ...a.application_data, ...c.proposed_values }).find(d => d.key === key)?.label || key, received: Boolean(c.evidence?.[key]), name: c.evidence?.[key]?.name || null })) })),
      onboardingAvailable: a.status === 'approved' && !a.reassessment_required,
      items: (staff || a.status === 'approved') ? items.map(i => ({ id: i.id, title: i.title, purpose: i.purpose, instructions: i.instructions, evidenceMode: i.evidence_mode, responsible: i.responsible, contactName: i.contact_name, contactEmail: i.contact_email, dueAt: i.due_at, state: i.state, revision: i.revision, note: i.applicant_note, reviewerNote: i.reviewer_note, evidenceName: i.evidence?.name || null,
        discussion: events.filter(e => e.item_id === i.id && ['clarification', 'reply'].includes(e.kind)).slice(0, 20).reverse().map(e => ({ id: e.id, kind: e.kind, note: e.note, createdAt: e.created_at })) })) : [],
    };
  };
  const checkedAnswers = a => ({ ...a.application_data, confirmEmail: a.application_data.email, documents: Object.fromEntries(Object.entries(a.document_paths).map(([k, d]) => [k, { size: d.size, type: d.contentType }])) });

  const handler = async (req, res, id, action = '', itemId, staff = false) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'POST'].includes(req.method) || (req.method === 'GET' && action)) throw fail('Use the supported portal action.', 405);
    const actor = await authenticate(req, id, staff);
    const a = await application(id, !staff);
    if (req.method === 'GET') return json(res, 200, await list(id, a, staff));
    if (!await rate(req, 'portal-write', 5)) throw fail('Too many updates. Wait before retrying; your answers are kept.', 429);
    requireOpen(a);
    const body = await readUploadJson(req, 20000);
    if (action === 'field-corrections') {
      if (staff && !itemId) {
        if (!Object.hasOwn(CORRECTION_FIELDS, body.field)) throw fail('Choose an applicant answer that supports a targeted correction.');
        return json(res, 200, await rpc('request_franchise_field_correction', { p_application: id, p_id: requestId(body.requestId), p_reviewer: actor.id, p_field: body.field, p_reason: note(body.reason, 10), p_revision: revision(body.revision) }));
      }
      requestId(itemId);
      if (staff) return json(res, 200, await rpc('review_franchise_field_correction', { p_application: id, p_item: itemId, p_id: requestId(body.requestId), p_hash: followupHash(body), p_reviewer: actor.id, p_revision: revision(body.revision), p_state: body.decision, p_note: note(body.note, 10) }));
      const r = await first(`franchise_field_requests?id=eq.${itemId}&application_id=eq.${id}&limit=1`);
      if (!r || !Object.hasOwn(CORRECTION_FIELDS, r.field_key)) throw fail('Correction request not found.', 404);
      const rid = requestId(body.requestId), hash = followupHash(body);
      const previous = await first(`franchise_field_request_events?id=eq.${rid}&limit=1`);
      if (previous) {
        if (previous.application_id !== id || previous.field_request_id !== itemId || previous.actor_id || previous.request_hash !== hash) throw fail('This retry differs from the received response.', 409);
        return json(res, 200, previous.receipt);
      }
      if (!['open', 'changes_needed'].includes(r.state)) throw fail('This response is already with your reviewer. Refresh your details.', 409);
      const group = CORRECTION_FIELDS[r.field_key], current = checkedAnswers(a);
      let before = null, proposed = null, required = [];
      if (body.value !== undefined) {
        if (typeof body.value !== 'string') throw fail('Enter a written answer.');
        const answers = prepareApplicationChange(current, group, { [r.field_key]: body.value }, { pending: true });
        before = rawView(a.application_data, group); proposed = rawView(answers, group);
        if (followupHash(before) === followupHash(proposed)) proposed = null;
        else {
          required = requiredChangeDocuments(current, answers, group);
          // Staff already have the submitted ID to check a spelling correction.
          // A different ID number/document still needs fresh supporting evidence.
          if (['firstName', 'middleName', 'lastName'].includes(r.field_key)) {
            required = required.filter(key => !['govIdFront', 'govIdBack'].includes(key) || !current.documents[key]);
          }
        }
      }
      return json(res, 200, await rpc('respond_franchise_field_correction', { p_application: id, p_item: itemId, p_id: rid, p_hash: hash, p_revision: revision(body.revision), p_answer_revision: revision(body.answerRevision), p_note: note(body.note, 10), p_category: group, p_before: before, p_proposed: proposed, p_required: required }));
    }
    if (action === 'changes' && !staff) {
      const rid = requestId(body.requestId), hash = followupHash(body);
      const previous = await first(`franchise_answer_changes?id=eq.${rid}&limit=1`);
      if (previous) {
        if (previous.application_id !== id || previous.request_hash !== hash) throw fail('This retry does not match the saved update.', 409);
        return json(res, 200, { id: rid, state: previous.state });
      }
      if (revision(body.revision) !== a.answer_revision) throw fail('Your application changed. Refresh, compare the current answers, and submit again.', 409);
      const reason = note(body.reason, 10);
      const current = checkedAnswers(a);
      const answers = prepareApplicationChange(current, body.category, body.patch, { pending: true });
      const before = rawView(a.application_data, body.category), proposed = rawView(answers, body.category);
      if (followupHash(before) === followupHash(proposed)) throw fail('Change at least one answer before sending.');
      return json(res, 200, await rpc('submit_franchise_answer_change_with_evidence', { p_application: id, p_id: rid, p_hash: hash, p_revision: body.revision, p_category: body.category, p_before: before, p_proposed: proposed, p_reason: reason, p_required: requiredChangeDocuments(current, answers, body.category) }));
    }
    if (action === 'changes' && staff) {
      requestId(itemId);
      const c = await first(`franchise_answer_changes?id=eq.${itemId}&application_id=eq.${id}&limit=1`);
      if (!c) throw fail('Change request not found.', 404);
      if (!['accepted', 'changes_needed'].includes(body.decision)) throw fail('Choose accepted or changes needed.');
      let answers = {};
      if (body.decision === 'accepted' && c.state === 'pending') {
        if (followupHash(rawView(a.application_data, c.category)) !== followupHash(c.previous_values)) throw fail('These answers changed after the request. Ask the applicant to compare and resubmit.', 409);
        if ((c.required_documents || []).some(key => !c.evidence?.[key] || !isAcceptedScan(c.evidence[key].scan, allowUnscannedDocuments))) throw fail('Supporting documents must be received and checked before this change can be accepted.', 409);
        const combined = { ...a.document_paths, ...c.evidence };
        answers = prepareApplicationChange(checkedAnswers({ ...a, document_paths: combined }), c.category, c.proposed_values);
      }
      const verification = body.verification || {};
      if (typeof verification !== 'object' || Array.isArray(verification) || JSON.stringify(verification).length > 1500) throw fail('Provide concise verification evidence.');
      return json(res, 200, await rpc('review_franchise_answer_change', { p_application: id, p_change: itemId, p_reviewer: actor.id, p_revision: revision(body.revision), p_decision: body.decision, p_note: note(body.note), p_verification: verification, p_answers: answers }));
    }
    if (action === 'change-evidence' && staff && itemId) {
      requestId(itemId);
      const c = await first(`franchise_answer_changes?id=eq.${itemId}&application_id=eq.${id}&limit=1`);
      const d = c?.evidence?.[body.documentKey];
      if (!d?.path || !isAcceptedScan(d.scan, allowUnscannedDocuments)) throw fail('Checked supporting document not available.', 404);
      await request('/rest/v1/franchise_document_access_log', { method: 'POST', body: JSON.stringify({ user_id: actor.id, application_id: id, document_key: body.documentKey }) });
      const signed = await request('/storage/v1/object/sign/franchise-documents/' + d.path.split('/').map(encodeURIComponent).join('/'), { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) });
      if (!signed.signedURL?.startsWith('/object/sign/')) throw fail('Private link unavailable.', 503);
      return json(res, 200, { url: `${url}/storage/v1${signed.signedURL}`, expiresIn: 60, name: d.name, scan: d.scan, warning: d.scan.status === 'skipped' ? 'This document has not been virus-checked.' : null });
    }
    requireOnboarding(a);
    if (action === 'onboarding' && staff && !itemId) {
      const details = body.details;
      if (!details || typeof details !== 'object' || !['ready', 'note', 'file'].includes(details.evidenceMode)) throw fail('Choose how the applicant should submit this requirement.');
      for (const [key, max] of Object.entries({ title: 160, instructions: 2000, purpose: 1000, responsible: 160, contactName: 120, contactEmail: 320 })) {
        if (typeof details[key] !== 'string' || !details[key].trim() || details[key].length > max) throw fail(`Provide ${key} (maximum ${max} characters).`);
      }
      if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(details.contactEmail) || (details.dueAt && (!/^\d{4}-\d{2}-\d{2}T/.test(details.dueAt) || !Number.isFinite(Date.parse(details.dueAt))))) throw fail('Provide a valid monitored email and confirmed date, or leave the date empty.');
      return json(res, 200, await rpc('assign_franchise_onboarding', { p_application: id, p_id: requestId(body.requestId), p_reviewer: actor.id, p_details: details }));
    }
    if (action === 'onboarding' && itemId) {
      requestId(itemId);
      const allowed = staff ? ['complete', 'needs_correction', 'reply'] : ['submit', 'clarification'];
      if (!allowed.includes(body.action)) throw fail('This action is not available to your role.', 403);
      const text = typeof body.note === 'string' ? body.note.trim() : '';
      if (text.length > 2000) throw fail('Keep the note within 2,000 characters.');
      return json(res, 200, await rpc('act_franchise_onboarding', { p_application: id, p_item: itemId, p_id: requestId(body.requestId), p_hash: followupHash(body), p_revision: revision(body.revision), p_action: body.action, p_note: text, p_reviewer: actor?.id || null }));
    }
    if (action === 'evidence' && staff && itemId) {
      requestId(itemId);
      const i = await first(`franchise_onboarding_items?id=eq.${itemId}&application_id=eq.${id}&limit=1`);
      if (!i?.evidence?.path || !isAcceptedScan(i.evidence.scan, allowUnscannedDocuments)) throw fail('Checked evidence is not available.', 404);
      await request('/rest/v1/franchise_document_access_log', { method: 'POST', body: JSON.stringify({ user_id: actor.id, application_id: id, document_key: 'onboardingEvidence' }) });
      const result = await request('/storage/v1/object/sign/franchise-documents/' + i.evidence.path.split('/').map(encodeURIComponent).join('/'), { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) });
      if (!result.signedURL?.startsWith('/object/sign/')) throw fail('Private link unavailable.', 503);
      return json(res, 200, { url: `${url}/storage/v1${result.signedURL}`, expiresIn: 60, name: i.evidence.name, scan: i.evidence.scan });
    }
    throw fail('Action not found.', 404);
  };
  const checkOnboarding = async (id, itemId) => {
    const a = await application(id); requireOnboarding(a);
    const i = await first(`franchise_onboarding_items?application_id=eq.${id}&id=eq.${itemId}&limit=1`);
    if (!i || i.evidence_mode !== 'file') throw fail('File requirement not found.', 404);
    return i;
  };
  const checkChange = async (id, changeId) => {
    const a = await application(id); requireOpen(a);
    const c = await first(`franchise_answer_changes?application_id=eq.${id}&id=eq.${changeId}&limit=1`);
    if (!c || c.state !== 'pending' || !c.required_documents?.length) throw fail('This change no longer accepts supporting documents. Refresh your details.', 409);
    return c;
  };
  return { handler, changes: { check: checkChange, authorize: async (req, id, changeId) => { await authenticate(req, id); return checkChange(id, changeId); } }, onboarding: {
    check: checkOnboarding,
    authorize: async (req, id, itemId) => { await authenticate(req, id); return checkOnboarding(id, itemId); },
    retry: async (id, itemId, retry, hash) => {
      const e = await first(`franchise_onboarding_events?id=eq.${retry}&limit=1`);
      if (!e) return null;
      if (e.application_id !== id || e.item_id !== itemId || e.request_hash !== hash) throw fail('This retry does not match the submitted document.', 409);
      return e.receipt;
    },
  } };
}
