import { createHmac, timingSafeEqual } from 'node:crypto';
import { UUID_PATTERN } from '../shared/application.js';

const base = 'https://verification.didit.me/v3/session/';
const fail = (message, status) => Object.assign(new Error(message), { status });
const sign = (secret, value) => createHmac('sha256', secret).update(value).digest('base64url');
const compact = value => String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');
const approved = value => String(value || '').toLowerCase() === 'approved';

export function identityService(env = process.env, fetcher = fetch) {
  const mode = env.DIDIT_MODE;
  const key = env.DIDIT_API_KEY;
  const workflow = env.DIDIT_WORKFLOW_ID;
  const enabled = Boolean(key && workflow && ['sandbox', 'live'].includes(mode));
  const binding = (draft, data) => sign(key, JSON.stringify(['identity-v1', mode, workflow, draft,
    ...['firstName','middleName','lastName','dateOfBirth','govIdType','govIdNumber'].map(k => compact(data[k]))]));
  const seal = payload => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return body + '.' + sign(key, 'receipt:' + body);
  };
  function unpack(proof, draft, data) {
    if (!enabled || typeof proof !== 'string' || proof.length > 1500) return null;
    const [body, mac, extra] = proof.split('.');
    if (extra !== undefined || !/^[\w-]{43}$/.test(mac || '') ||
        !timingSafeEqual(Buffer.from(mac), Buffer.from(sign(key, 'receipt:' + body)))) return null;
    const record = JSON.parse(Buffer.from(body, 'base64url'));
    return record.binding === binding(draft, data) ? record : null;
  }
  async function call(path, options = {}) {
    const response = await fetcher(base + path, { ...options, headers: { 'x-api-key': key, 'content-type':'application/json' },
      redirect:'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw fail('Didit is unavailable. Retry or choose staff review.', 503);
    return response.json();
  }
  return {
    mode: enabled ? mode : 'disabled',
    summary(proof, draft, data) {
      const record = unpack(proof, draft, data);
      if (!record) return { status: 'manual-review' };
      return { mode, status: record.status, sessionId: record.sessionId };
    },
    async run(action, draft, data, proof, consent) {
      if (!enabled) throw fail('Selfie verification is unavailable. You can choose staff review.', 503);
      if (!UUID_PATTERN.test(draft) || !data?.govIdNumber || !data.dateOfBirth) throw fail('Complete your ID details first.', 422);
      const owner = binding(draft, data);
      if (action === 'start') {
        if (consent !== mode) throw fail('Review the identity check notice before continuing.', 422);
        const result = await call('', { method:'POST', body: JSON.stringify({ workflow_id:workflow, vendor_data:owner }) });
        const url = new URL(result.url);
        if (url.origin !== 'https://verify.didit.me' || !UUID_PATTERN.test(result.session_id)) throw fail('Didit returned an unexpected session.', 502);
        return { url:url.href, proof:seal({ sessionId:result.session_id, binding:owner, status:'pending' }), status:'pending' };
      }
      const record = unpack(proof, draft, data);
      if (!record) throw fail('Your ID details or session changed. Start a new check or choose staff review.', 409);
      const result = await call(record.sessionId + '/decision/');
      if (result.vendor_data !== owner || result.session_id !== record.sessionId || result.workflow_id !== workflow) throw fail('This result could not be confirmed.', 409);
      const phase = String(result.status).toLowerCase();
      let status = 'manual-review';
      if (['not started','in progress','pending','processing'].includes(phase)) status = 'pending';
      if (approved(phase)) {
        const checksPassed = ['id_verifications','face_matches','liveness_checks'].every(k =>
          Array.isArray(result[k]) && result[k].length && result[k].every(check => approved(check.status)));
        const matchesApplicant = result.id_verifications?.some(id => compact(id.document_number) === compact(data.govIdNumber) && id.date_of_birth === data.dateOfBirth);
        if (checksPassed && (mode === 'sandbox' || matchesApplicant)) status = 'passed';
      }
      return { proof:seal({ ...record, status }), status };
    }
  };
}
