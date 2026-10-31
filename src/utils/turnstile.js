import './turnstile.css';
let loading;
function load() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error('Security check could not load. Check your connection and retry.')); };
    const timer = setTimeout(fail, 15000);
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else fail(); };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

// A fresh, memory-only token for every attempt; never included in draft payloads.
export async function requestTurnstile(action, { signal } = {}) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch('/api/security-config', { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: 'no-store' });
  if (!response.ok) throw new Error('Security verification is unavailable. Please retry.');
  const config = await response.json();
  if (config.enabled === false) return '';
  if (!config.siteKey) throw new Error('Security verification is not configured.');
  const api = await load();
  if (signal?.aborted) throw new Error('Verification cancelled.');
  return new Promise((resolve, reject) => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'security-check';
    dialog.setAttribute('aria-label', 'Security verification');
    const heading = document.createElement('h2'); heading.textContent = 'One quick security check';
    const note = document.createElement('p'); note.textContent = 'Your answers stay here. Complete this check to send securely.';
    const host = document.createElement('div');
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel and keep my answers';
    dialog.append(heading, note, host, cancel); document.body.append(dialog);
    let widget, finished = false;
    const finish = (error, token) => {
      if (finished) return; finished = true; clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (widget !== undefined) api.remove(widget);
      dialog.close(); dialog.remove(); previous?.focus?.();
      if (error) reject(new Error(error)); else resolve(token);
    };
    const abort = () => finish('Verification cancelled. Your answers have been kept.');
    const timer = setTimeout(() => finish('Security check timed out. Please retry.'), 120000);
    signal?.addEventListener('abort', abort, { once: true });
    cancel.onclick = abort; dialog.oncancel = event => { event.preventDefault(); abort(); };
    dialog.showModal(); cancel.focus();
    try { widget = api.render(host, { sitekey: config.siteKey, action, size: 'flexible', callback: token => finish(null, token), 'error-callback': () => finish('Security check failed. Please retry.'), 'expired-callback': () => finish('Security check expired. Please retry.') }); }
    catch { finish('Security check could not start. Please retry.'); }
  });
}
