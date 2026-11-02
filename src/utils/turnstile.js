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

export function createSecurityDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'security-check';
  dialog.setAttribute('aria-labelledby', 'security-check-title');
  dialog.setAttribute('aria-describedby', 'security-check-description');
  // Static trusted markup only; no user content or provider tokens.
  dialog.innerHTML = `
    <div class="security-check__top"><span>SIOMAI <b>STREET</b></span><button class="security-check__close" type="button" aria-label="Cancel verification and return to form">×</button></div>
    <div class="security-check__body">
      <div class="security-check__mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M16 3 27 7v8c0 7-11 14-11 14S5 22 5 15V7L16 3Z" stroke="currentColor" stroke-width="1.7"/><path d="m11 15 3.5 3.5 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <p class="security-check__eyebrow">BEFORE WE SEND</p>
      <h2 id="security-check-title">A quick check.<br><em>Then you're on your way.</em></h2>
      <p id="security-check-description" class="security-check__description">This helps keep automated spam out. Complete the check below if prompted.</p>
      <div class="security-check__verification"><div class="security-check__status" role="status" aria-live="polite" aria-atomic="true"></div><div class="security-check__widget"></div></div>
      <button type="button" class="security-check__retry" hidden>Try verification again <span aria-hidden="true">↗</span></button>
      <p class="security-check__hint">Submission continues automatically after verification.</p>
    </div>
    <div class="security-check__footer"><span>Your answers stay in the form.</span><button type="button" class="security-check__cancel"><span aria-hidden="true">←</span> Back to form</button></div>`;
  return { dialog, host: dialog.querySelector('.security-check__widget'), status: dialog.querySelector('[role="status"]'), retry: dialog.querySelector('.security-check__retry'), cancel: dialog.querySelector('.security-check__cancel'), close: dialog.querySelector('.security-check__close') };
}

// Fresh memory-only tokens per attempt; never persisted with drafts.
export async function requestTurnstile(action, { signal } = {}) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch('/api/security-config', { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: 'no-store' });
  if (!response.ok) throw new Error('Security verification is unavailable. Please retry.');
  const config = await response.json();
  if (config.enabled === false) return '';
  if (!config.siteKey) throw new Error('Security verification is not configured.');
  if (signal?.aborted) throw new Error('Verification cancelled.');
  return new Promise((resolve, reject) => {
    const previous = document.activeElement;
    const { dialog, host, status, retry, cancel, close } = createSecurityDialog();
    document.body.append(dialog);
    let widget, api, timer, finished = false, generation = 0;
    const removeWidget = () => {
      if (widget !== undefined) { api?.remove(widget); widget = undefined; }
    };
    const finish = (error, token) => {
      if (finished) return;
      finished = true; generation++; clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      removeWidget(); dialog.close(); dialog.remove();
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
      if (error) reject(new Error(error)); else resolve(token);
    };
    const abort = () => finish('Verification cancelled. Your answers have been kept.');
    const start = async () => {
      const attempt = ++generation;
      clearTimeout(timer); removeWidget();
      retry.hidden = true; dialog.dataset.state = 'loading';
      status.textContent = 'Loading security check…';
      const failed = message => {
        if (finished || attempt !== generation) return;
        generation++; clearTimeout(timer); removeWidget();
        dialog.dataset.state = 'error'; status.textContent = message;
        retry.hidden = false;
      };
      timer = setTimeout(() => failed('The check timed out. Your answers are still here. Try again.'), 120000);
      try {
        api = await load();
        if (finished || attempt !== generation) return;
        dialog.dataset.state = 'checking';
        status.textContent = 'Checking with Cloudflare';
        widget = api.render(host, {
          sitekey: config.siteKey, action, theme: 'light',
          size: host.clientWidth < 300 ? 'compact' : 'flexible',
          callback: token => { if (attempt === generation) finish(null, token); },
          'error-callback': () => { failed('The check couldn’t connect. Check your connection and try again.'); return true; },
          'expired-callback': () => failed('This check expired. Start a fresh check to continue.'),
          'timeout-callback': () => failed('The check timed out. Try again when you’re ready.'),
        });
      } catch { failed('Security check couldn’t load. Check your connection and try again.'); }
    };
    signal?.addEventListener('abort', abort, { once: true });
    close.onclick = cancel.onclick = abort;
    retry.onclick = start;
    dialog.oncancel = event => { event.preventDefault(); abort(); };
    dialog.showModal(); close.focus({ preventScroll: true });
    void start();
  });
}
