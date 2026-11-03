// Contact acknowledgements and staff alerts; application delivery belongs to the admin app.
export async function processContactNotification({ request, send, signal }) {
      const [job] = await request('/rest/v1/rpc/claim_contact_notification', { method: 'POST', body: '{}' });
      if (job) {
        if (!['inquiry_received', 'inquiry_staff'].includes(job.kind)) throw new Error('Unexpected notification kind.');
        const path = `/rest/v1/notification_outbox?id=eq.${job.id}&lease=eq.${job.lease}`;
        let result;
        try { result = await send({ eventId: job.id, to: job.recipient, kind: job.kind, reference: job.reference, inquiry: job.staff_payload, signal }); }
        catch (error) {
          await request(path, { method: 'PATCH', body: JSON.stringify({ state: error.retryable === false ? 'needs_review' : 'pending', next_attempt_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts)).toISOString() }) });
        }
        if (result) {
          await request(path, { method: 'PATCH', body: JSON.stringify({ state: 'accepted', provider_id: result.providerId }) });
          // Webhook may arrive before the send response. Replay stored, verified events.
          const events = await request(`/rest/v1/notification_events?provider_id=eq.${encodeURIComponent(result.providerId)}&order=occurred_at.asc`);
          for (const event of events) await request('/rest/v1/rpc/record_notification_event', { method: 'POST', body: JSON.stringify({ event_id: event.id, email_id: event.provider_id, event_kind: event.kind, event_time: event.occurred_at }) });
        }
      }
  return Boolean(job);
}
// Local Node polling. Vercel uses the awaited maintenance endpoint.
export function startNotificationWorker({ request, send, intervalMs = 1500, report = console.error }) {
  let stopped = false, timer;
  const run = async () => {
    let delay = 15000;
    try { if (await processContactNotification({ request, send })) delay = intervalMs; }
    catch { report('Notification worker failed; durable jobs retained for retry.'); }
    finally { if (!stopped) { timer = setTimeout(run, delay); timer.unref?.(); } }
  };
  timer = setTimeout(run, intervalMs); timer.unref?.();
  return () => { stopped = true; clearTimeout(timer); };
}
