import { createHmac, timingSafeEqual } from 'node:crypto';
// Svix's documented v1 signing format; verify the unmodified body before parsing.
export function verifyWebhook(payload, headers, secret, now = Date.now()) {
 const id = headers['svix-id'], timestamp = headers['svix-timestamp'], signatures = headers['svix-signature'];
 if (typeof id !== 'string' || id.length > 200 || typeof timestamp !== 'string' || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || typeof signatures !== 'string' || !/^whsec_[A-Za-z0-9+/=]+$/.test(secret)) throw new Error('Invalid signature');
 const expected = createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${timestamp}.${payload}`).digest();
 const valid = signatures.split(' ').some(item => {
  if (!item.startsWith('v1,')) return false;
  const supplied = Buffer.from(item.slice(3), 'base64');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
 });
 if (!valid) throw new Error('Invalid signature');
 return JSON.parse(payload);
}
const kinds = new Set(['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed']);
export function createNotificationWebhook({ secret, request, json }) {
 return async (req,res) => {
  if (!secret) return json(res,503,{error:'Webhook unavailable.'});
  req.setTimeout?.(10000, () => req.destroy());
  const chunks=[]; let size=0;
  try {
   for await (const chunk of req) { size+=chunk.length; if(size>65536) return json(res,413,{error:'Payload too large.'}); chunks.push(chunk); }
   let event;
   try { event=verifyWebhook(Buffer.concat(chunks).toString('utf8'),req.headers,secret); }
   catch { return json(res,400,{error:'Invalid webhook signature.'}); }
   if (!kinds.has(event.type)) return json(res,200,{received:true});
   if(typeof event.data?.email_id!=='string'||!Number.isFinite(Date.parse(event.created_at))) return json(res,400,{error:'Invalid delivery event.'});
   await request('/rest/v1/rpc/record_notification_event',{method:'POST',body:JSON.stringify({event_id:req.headers['svix-id'],email_id:event.data.email_id,event_kind:event.type,event_time:event.created_at})});
   return json(res,200,{received:true});
  } finally { req.setTimeout?.(0); }
 };
}
