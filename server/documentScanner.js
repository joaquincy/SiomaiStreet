import { createConnection } from 'node:net';
import { once } from 'node:events';

// Scanning is required unless DOCUMENT_SCAN=off is set explicitly (local demos only).
export const isDocumentScanDisabled = env => String(env?.DOCUMENT_SCAN || '').trim().toLowerCase() === 'off';

// Records that a file was NOT virus-checked so reviewers can see it in the stored metadata.
export function createSkippedScanner() {
  return async () => ({ status: 'skipped', engine: 'none', scannedAt: new Date().toISOString() });
}

// A scan result is accepted only if ClamAV marked it clean, or scanning was explicitly disabled.
export function isAcceptedScan(scan, allowSkipped = false) {
  if (!scan || !Number.isFinite(Date.parse(scan.scannedAt))) return false;
  if (scan.status === 'clean' && scan.engine === 'ClamAV') return true;
  return allowSkipped && scan.status === 'skipped' && scan.engine === 'none';
}

// ClamD INSTREAM. Only use a loopback/private socket: the protocol is not authenticated.
export function createDocumentScanner({ host, port = 3310, timeoutMs = 30000 }) {
  return async file => {
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw Object.assign(new Error('Document scanning is not configured.'), { status: 503 });
    }
    if (!file.size || file.size > 10 * 1024 * 1024) throw Object.assign(new Error('Invalid document size.'), { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });
      const writes = new AbortController();
      let reply = '', settled = false, sent = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        writes.abort();
        socket.destroy();
        if (error) reject(Object.assign(error, { status: 503 })); else resolve(result);
      };
      const timer = setTimeout(() => finish(new Error('Document scan timed out.')), timeoutMs);
      socket.on('error', () => finish(new Error('Document scanner unavailable.')));
      socket.on('end', () => { if (!settled) finish(new Error('Incomplete document scan result.')); });
      socket.on('data', chunk => {
        reply += chunk.toString('utf8');
        if (reply.length > 4096) return finish(new Error('Invalid document scan result.'));
        if (!reply.includes('\0')) return;
        const verdict = reply.slice(0, reply.indexOf('\0'));
        if (!sent) return finish(new Error('Premature document scan result.'));
        if (verdict === 'stream: OK') return finish(null, { status: 'clean', engine: 'ClamAV', scannedAt: new Date().toISOString() });
        if (/^stream: .+ FOUND$/.test(verdict)) return finish(null, { status: 'rejected', engine: 'ClamAV' });
        finish(new Error('Document could not be scanned completely.'));
      });
      socket.on('connect', async () => {
        try {
          socket.write('zINSTREAM\0');
          for (let offset = 0; offset < bytes.length; offset += 65536) {
            if (settled) return;
            const chunk = bytes.subarray(offset, offset + 65536);
            const length = Buffer.alloc(4); length.writeUInt32BE(chunk.length);
            socket.write(length);
            if (!socket.write(chunk)) await once(socket, 'drain', { signal: writes.signal });
          }
          sent = true;
          socket.write(Buffer.alloc(4));
        } catch { finish(new Error('Document scanner connection failed.')); }
      });
    });
  };
}
