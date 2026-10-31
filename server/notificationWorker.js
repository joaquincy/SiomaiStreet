// One bounded delivery at a time; database leases coordinate multiple API instances.
export function startNotificationWorker({ request, send, intervalMs = 1500, report = console.error }) {
  let stopped = false, timer;
  const run = async () => {
    let delay = 15000;
    try {
      const [job] = await request('/rest/v1/rpc/claim_notification', { method: 'POST', body: '{}' });
      if (job) {
        delay = intervalMs;
        const path = `/rest/v1/notification_outbox?id=eq.${job.id}&lease=eq.${job.lease}`;
        let result;
        try { result = await send({ eventId: job.id, to: job.recipient, kind: job.kind, reference: job.reference }); }
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
    } catch { report('Notification worker failed; durable jobs retained for retry.'); }
    finally { if (!stopped) { timer = setTimeout(run, delay); timer.unref?.(); } }
  };
  timer = setTimeout(run, intervalMs); timer.unref?.();
  return () => { stopped = true; clearTimeout(timer); };
}
