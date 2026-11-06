// Weak references release cached digests when files are replaced or drafts close.
const hashes = new WeakMap();
export async function documentFingerprint(file, signal) {
  signal?.throwIfAborted();
  if (!hashes.has(file)) {
    const pending = file.arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256', bytes))
      .then(hash => Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join(''));
    hashes.set(file, pending);
    pending.catch(() => hashes.delete(file));
  }
  const digest = await hashes.get(file);
  signal?.throwIfAborted();
  return digest;
}
