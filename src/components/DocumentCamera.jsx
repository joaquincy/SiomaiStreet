import { useEffect, useId, useRef, useState } from 'react';
import { BiCamera, BiError, BiRefresh, BiX } from 'react-icons/bi';
import { cameraErrorMessage, captureDimensions, createCameraSession } from '../utils/documentCamera.js';
import { lockDocumentScroll } from '../utils/documentScrollLock.js';
import { assessDocumentQuality } from '../utils/imageQuality.js';
import { monitorCameraQuality } from '../utils/liveCameraQuality.js';
import './DocumentCamera.css';

export default function DocumentCamera({ label, docKey, onCapture, onClose, onChoosePhoto, onChooseFile, onNativeCamera }) {
  const id = useId();
  const dialog = useRef(null), video = useRef(null), session = useRef(null);
  const active = useRef(false), captureBusy = useRef(false), attempt = useRef(0);
  const scrollRelease = useRef(null);
  const restoreScroll = () => { scrollRelease.current?.(); scrollRelease.current = null; };
  const [facing, setFacing] = useState(docKey === 'idPhoto' ? 'user' : 'environment');
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState('starting');
  const [error, setError] = useState('');
  const [aspect, setAspect] = useState(4 / 3);
  const [liveCue, setLiveCue] = useState(null);
  const callbacks = useRef({ onCapture, onClose });
  callbacks.current = { onCapture, onClose };
  useEffect(() => {
    active.current = true;
    const node = dialog.current, previous = document.activeElement;
    const attemptCounter = attempt;
    scrollRelease.current = lockDocumentScroll();
    node.showModal();
    return () => {
      active.current = false;
      attemptCounter.current++;
      session.current?.stop();
      node.close();
      restoreScroll();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const attemptCounter = attempt;
    const ticket = ++attempt.current;
    const node = video.current;
    const camera = createCameraSession(navigator.mediaDevices);
    session.current = camera;
    let readyTimer;
    const fail = e => {
      if (!active.current || ticket !== attempt.current || e?.name === 'AbortError') return;
      attempt.current++;
      camera.stop(); clearTimeout(readyTimer);
      setError(cameraErrorMessage(e)); setState('error');
    };
    setError(''); setLiveCue(null); setState('starting');
    const ready = () => {
      if (active.current && ticket === attempt.current && node.videoWidth > 0 && node.videoHeight > 0 && !captureBusy.current) {
        clearTimeout(readyTimer); setAspect(node.videoWidth / node.videoHeight); setState('ready');
      }
    };
    node.addEventListener('loadeddata', ready);
    node.addEventListener('resize', ready);
    camera.open(facing).then(stream => {
      if (!active.current || ticket !== attempt.current) { camera.stop(); return; }
      node.srcObject = stream;
      readyTimer = setTimeout(() => fail(new Error('No camera picture arrived. Retry or choose an existing photo.')), 12000);
      node.play().then(ready).catch(fail);
      stream.getVideoTracks().forEach(track => { track.onended = () => fail(new Error('Camera disconnected. Retry or choose a photo.')); });
    }).catch(fail);
    const hide = () => {
      if (document.hidden) {
        attempt.current++; camera.stop(); clearTimeout(readyTimer);
        node.srcObject = null; setState('error'); setError('Camera paused while this page was hidden. Tap Retry camera when you are ready.');
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      attemptCounter.current++; clearTimeout(readyTimer); camera.stop();
      node.srcObject = null; node.removeEventListener('loadeddata', ready);
      node.removeEventListener('resize', ready);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [facing, retry]);
  useEffect(() => {
    if (state !== 'ready') return;
    const ticket = attempt.current;
    const node = video.current;
    const canvas = document.createElement('canvas');
    const stop = monitorCameraQuality({
      canRead: () => active.current && !captureBusy.current && !document.hidden &&
        ticket === attempt.current && Boolean(node.srcObject),
      readFrame: () => node.readyState >= 2
        ? assessDocumentQuality(node, node.videoWidth, node.videoHeight, docKey, 256, canvas)
        : null,
      onCue: setLiveCue,
    });
    return () => { stop(); canvas.width = canvas.height = 0; };
  }, [state, docKey, facing, retry]);
  const hasWarning = liveCue && !['unavailable', 'inspect'].includes(liveCue.code);
  const leave = action => {
    attempt.current++; session.current?.stop(); dialog.current?.close();
    restoreScroll();
    callbacks.current.onClose(); action?.();
  };
  const capture = async () => {
    if (state !== 'ready' || captureBusy.current) return;
    captureBusy.current = true; setState('capturing');
    const ticket = attempt.current;
    const canvas = document.createElement('canvas');
    try {
      const size = captureDimensions(video.current.videoWidth, video.current.videoHeight, docKey === 'idPhoto' ? 1200 : 2400);
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo capture is unavailable. Use your phone camera or choose a photo.');
      context.drawImage(video.current, 0, 0, size.width, size.height);
      session.current?.stop();
      // Capture all pixels, not just the visual guide. Crop only in the editor.
      const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not prepare this photo. Retry or choose a photo.')), 'image/jpeg', .95));
      if (active.current && ticket === attempt.current) {
        dialog.current?.close();
        restoreScroll();
        callbacks.current.onCapture(new File([blob], `${docKey}-camera.jpg`, { type: 'image/jpeg' }));
      }
    } catch (e) {
      if (active.current && ticket === attempt.current) { session.current?.stop(); setError(cameraErrorMessage(e)); setState('error'); }
    } finally { canvas.width = canvas.height = 0; captureBusy.current = false; }
  };
  return <dialog ref={dialog} className="document-camera-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`} onCancel={e => { e.preventDefault(); leave(); }}>
    <header className="document-camera-heading"><div><p>DOCUMENT CAMERA</p><h3 id={`${id}-title`}>{label}</h3></div><button type="button" onClick={() => leave()} aria-label="Close camera" autoFocus><BiX aria-hidden="true" /></button></header>
    <p id={`${id}-hint`}>{docKey === 'idPhoto' ? 'Centre your face with space around your head and shoulders.' : 'Keep all four corners visible. Use even light and hold steady.'} The frame is a guide; your photo will not be cropped automatically.</p>
    <div className="document-camera-view">
      <div className="document-camera-video" style={{ '--camera-aspect': aspect }}>
      <video ref={video} playsInline muted aria-label="Live camera preview" />
      {state === 'ready' && <div className={`document-camera-guide ${docKey === 'idPhoto' ? 'is-portrait' : ''} ${hasWarning ? 'needs-adjustment' : ''}`} aria-hidden="true" />}
      </div>
      {state === 'starting' && <p className="document-camera-status" role="status">Opening camera. Allow access when your browser asks.</p>}
    </div>
    {state === 'ready' && <div className="document-camera-guidance" data-warning={Boolean(hasWarning)} role="status" aria-live="polite" aria-atomic="true">
      {hasWarning ? <BiError aria-hidden="true" /> : <BiCamera aria-hidden="true" />}
      <span>{liveCue?.message || 'Hold steady while the camera checks the picture.'}</span>
    </div>}
    {error && <p className="document-camera-error" role="alert">{error}</p>}
    <div className="document-camera-actions">
      {state === 'error' ? <button type="button" onClick={() => setRetry(n => n + 1)}><BiRefresh aria-hidden="true" />Retry camera</button> : <button type="button" disabled={state !== 'ready'} onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')}><BiRefresh aria-hidden="true" />Switch camera</button>}
      <button type="button" className="document-camera-capture" disabled={state !== 'ready'} onClick={capture}><BiCamera aria-hidden="true" />{state === 'capturing' ? 'Preparing photo…' : 'Capture photo'}</button>
      <button type="button" onClick={() => leave()}>Cancel</button>
    </div>
    {state === 'capturing' && <p className="document-camera-feedback" role="status">Preparing your preview.</p>}
    <div className="document-camera-fallbacks" aria-label="Other ways to add your document"><button type="button" onClick={() => leave(onChoosePhoto)}>Choose photo</button><button type="button" onClick={() => leave(onChooseFile)}>Upload file</button><button type="button" onClick={() => leave(onNativeCamera)}>Use phone camera</button></div>
    <p className="document-camera-note">Capture stays on this device until you confirm and submit your application. Your previous confirmed file stays selected.</p>
  </dialog>;
}
