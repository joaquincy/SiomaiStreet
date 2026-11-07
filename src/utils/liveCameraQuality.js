const FRAME_INTERVAL_MS = 950;

// Use one short cue at a time so the person holding the phone can act on it.
const CUES = {
  dark: 'Move into brighter, even light.',
  bright: 'Move away from direct light and check that details are visible.',
  'frame-cutoff': 'Move back a little so every edge fits inside the picture.',
  'frame-small': 'Move closer while keeping all four corners in view.',
  glare: 'Tilt the document slightly to move the reflection off the text.',
  blurry: 'Hold the phone steady and give the camera a moment to focus.',
  detail: 'Bring the document closer so the printed details are clear.',
  'frame-unclear': 'Place the ID on a contrasting surface and line up its edges with the guide.',
  small: 'This camera preview has low resolution. Inspect the details after capture.',
};

export function liveCameraCue(assessment) {
  if (!Array.isArray(assessment?.issues)) return { code: 'unavailable', message: 'Live hints are unavailable. You can capture and inspect the photo yourself.' };
  for (const [code, message] of Object.entries(CUES)) {
    if (assessment.issues.some(issue => issue.code === code)) return { code, message };
  }
  if (assessment.issues.length > 0) return assessment.issues[0];
  return { code: 'inspect', message: 'Hold steady. Capture when you can see all required details.' };
}

// Schedule the next small snapshot after the previous one finishes. Keep only
// the pending and displayed cue codes when deciding whether to update the UI.
export function monitorCameraQuality({ readFrame, canRead, onCue }) {
  let active = true;
  let lastCode;
  let pendingCode;
  let matches = 0;
  function tick() {
    if (!active || !canRead()) return;
    const started = performance.now();
    let assessment;
    try { assessment = readFrame(); } catch { assessment = null; }
    const cue = liveCameraCue(assessment);
    matches = cue.code === pendingCode ? matches + 1 : 1;
    pendingCode = cue.code;
    // Let autofocus settle before raising a warning. Once the next readable
    // sample clears it, remove the stale instruction immediately.
    if ((matches >= 2 || cue.code === 'inspect') && cue.code !== lastCode) {
      lastCode = cue.code;
      onCue(cue);
    }
    if (active && !(matches >= 2 && cue.code === 'unavailable')) {
      // Leave extra time between samples on a busy device.
      const delay = Math.min(3000, Math.max(FRAME_INTERVAL_MS, (performance.now() - started) * 50));
      timer = setTimeout(tick, delay);
    }
  }
  let timer = setTimeout(tick, 250);
  return () => { active = false; clearTimeout(timer); };
}
