import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhook } from '../server/notificationWebhook.js';
import { createApplicationAdmission } from '../server/applicationSecurity.js';
import { startNotificationWorker } from '../server/notificationWorker.js';

test('Svix official signature vector verifies raw payload; tampering and stale timestamps fail', () => {
 const payload='{"event_type":"ping","data":{"success":true}}';
 const headers={'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='};
 const secret='whsec_plJ3nmyCDGBKInavdOK15jsl', now=1731705121000;
 assert.equal(verifyWebhook(payload,headers,secret,now).event_type,'ping');
 assert.throws(()=>verifyWebhook(payload+' ',headers,secret,now));
 assert.throws(()=>verifyWebhook(payload,headers,secret,now+301000));
 assert.throws(()=>verifyWebhook(payload,headers,secret,now-301000));
});
test('verification follows ingress limit and releases upload capacity after rejection', async () => {
 const order=[];
 const admit=createApplicationAdmission({checkRate:async()=>{order.push('rate');return true;},verify:async()=>{order.push('verify');throw new Error('expired');}});
 const req={headers:{'content-type':'multipart/form-data; boundary=x'},socket:{remoteAddress:'127.0.0.1'}},res={setHeader(){},removeHeader(){}};
 await assert.rejects(admit(req,res),/expired/);
 await assert.rejects(admit(req,res),/expired/);
 assert.deepEqual(order,['rate','verify','rate','verify']);
});
test('worker claims durable job, preserves event key and reconciles early delivery webhook', async () => {
 const calls=[]; let stop;
 await new Promise((resolve,reject)=>{
  const deadline=setTimeout(()=>{stop();reject(new Error('Worker timeout'));},1000);
  stop=startNotificationWorker({intervalMs:1,report:reject,send:async event=>{assert.equal(event.eventId,'job');return {providerId:'mail'};},request:async(path,options)=>{
   calls.push(path);
   if(path.endsWith('claim_notification')) return [{id:'job',lease:'lease',recipient:'synthetic@example.test',kind:'inquiry_received',reference:'TEST',attempts:1}];
   if(path.includes('notification_events?')) return [{id:'event',provider_id:'mail',kind:'email.delivered',occurred_at:'2026-01-01T00:00:00Z'}];
   if(path.endsWith('record_notification_event')) {assert.equal(JSON.parse(options.body).event_id,'event');stop();clearTimeout(deadline);resolve();}
   return null;
  }});
 });
 assert.ok(calls.some(path=>path.includes('lease=eq.lease')));
});
