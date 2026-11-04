// Bound image decoding/scanning memory within a warm Node/Vercel instance.
// Database leases still coordinate duplicate document checks across instances.
export function createUploadCheckQueue({ maxActive = 2, maxWaiting = 4, waitMs = 30000 } = {}) {
  let active = 0;
  const waiting = [];
  const unavailable = message => Object.assign(new Error(`${message} Uploaded files are kept; retry this application.`), { status: 503 });
  const disconnected = (req, res) => req?.aborted || res?.destroyed;
  const drain = () => {
    while (active < maxActive && waiting.length) waiting[0].admit();
  };
  return (req, res) => new Promise((resolve, reject) => {
    if (disconnected(req, res)) return reject(unavailable('The document check was cancelled.'));
    if (active >= maxActive && waiting.length >= maxWaiting) return reject(unavailable('Document checks are busy. Please wait a moment.'));
    let timer, settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      req?.removeListener?.('aborted', cancel);
      res?.removeListener?.('close', cancel);
      const index = waiting.indexOf(entry);
      if (index !== -1) waiting.splice(index, 1);
    };
    const cancel = () => {
      if (settled) return;
      settled = true; cleanup();
      reject(unavailable('The document check was cancelled.'));
    };
    const entry = { admit() {
      if (disconnected(req, res)) return cancel();
      if (settled) return;
      settled = true; cleanup(); active++;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true; active--; drain();
      });
    } };
    if (active < maxActive) return entry.admit();
    waiting.push(entry);
    req?.once?.('aborted', cancel);
    res?.once?.('close', cancel);
    timer = setTimeout(() => {
      if (settled) return;
      settled = true; cleanup();
      reject(unavailable('Document checks are still busy. Please wait a moment.'));
    }, waitMs);
  });
}
