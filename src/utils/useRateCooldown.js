import { useEffect, useState, useSyncExternalStore } from 'react';
import { rateFeedback, formatRateWait } from './rateLimits.js';

export default function useRateCooldown(path, method = 'POST') {
  const policy = useSyncExternalStore(rateFeedback.subscribe, () => rateFeedback.getCooldown(path, { method }), () => null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!policy) return;
    const tick = () => { setNow(Date.now()); rateFeedback.refresh(); };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [policy]);
  const seconds = policy ? Math.max(0, Math.ceil((policy.expiresAt - Math.max(now, Date.now())) / 1000)) : 0;
  return { blocked: Boolean(policy) && seconds > 0, wait: formatRateWait(seconds) };
}
