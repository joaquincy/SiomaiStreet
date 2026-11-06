export function stopCameraStream(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

// A permission prompt cannot be aborted by the browser API. Any stream that
// arrives after cancellation is stopped immediately instead of being attached.
export function createCameraSession(mediaDevices, timeoutMs = 15000) {
  let current = null;
  let cancelPending = null;
  const stop = () => {
    cancelPending?.();
    cancelPending = null;
    stopCameraStream(current);
    current = null;
  };
  return {
    stop,
    open(facingMode = 'environment') {
      stop();
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, stream) => {
          if (settled) { stopCameraStream(stream); return; }
          settled = true;
          clearTimeout(timer);
          cancelPending = null;
          if (error) reject(error);
          else { current = stream; resolve(stream); }
        };
        const timer = setTimeout(() => finish(new Error('Camera permission took too long. Try again or choose a photo.')), timeoutMs);
        cancelPending = () => finish(new DOMException('Camera closed', 'AbortError'));
        Promise.resolve().then(() => settled ? null : mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1440 }, frameRate: { ideal: 24, max: 30 } },
        })).then(stream => finish(null, stream), error => finish(error));
      });
    },
  };
}

export function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Camera access is blocked. Allow it in your browser settings, or choose a photo or file below.';
  if (error?.name === 'NotFoundError') return 'No camera was found. Choose an existing photo or file instead.';
  if (error?.name === 'NotReadableError') return 'The camera may be in use by another app. Close that app and retry, or choose a photo.';
  return error?.message || 'The camera could not start. Try the phone camera or choose a photo instead.';
}

export function captureDimensions(width, height, maxEdge = 2400) {
  if (![width, height, maxEdge].every(n => Number.isFinite(n) && n > 0)) throw new Error('The camera is not ready yet. Wait for the preview or choose a photo.');
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
