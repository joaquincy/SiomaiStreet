import test from 'node:test';
import assert from 'node:assert/strict';
import { liveCameraCue, monitorCameraQuality } from '../src/utils/liveCameraQuality.js';

test('a person adjusting the camera receives one actionable lighting or framing cue', () => {
  const result = liveCameraCue({ issues: [{ code: 'blurry' }, { code: 'frame-cutoff' }, { code: 'dark' }] });
  assert.equal(result.code, 'dark');
  assert.match(liveCameraCue({ issues: [{ code: 'frame-small' }] }).message, /Move closer/);
  assert.match(liveCameraCue({ issues: [{ code: 'frame-unclear' }] }).message, /contrasting surface/);
  assert.equal(liveCameraCue({ issues: [] }).code, 'inspect');
  assert.equal(liveCameraCue(null).code, 'unavailable');
});

test('feedback changes only after two consistent samples and stops after cleanup', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let code = 'dark', samples = 0;
  const cues = [];
  const stop = monitorCameraQuality({
    canRead: () => true,
    readFrame: () => { samples++; return { issues: code ? [{ code }] : [] }; },
    onCue: cue => cues.push(cue.code),
  });
  const sample = () => t.mock.timers.tick(3001);
  sample(); assert.deepEqual(cues, []);
  sample(); sample(); assert.deepEqual(cues, ['dark']);
  code = 'blurry'; sample();
  code = 'dark'; sample(); assert.deepEqual(cues, ['dark']);
  code = ''; sample(); sample(); assert.deepEqual(cues, ['dark', 'inspect']);
  stop();
  const before = samples;
  sample(); assert.equal(samples, before);
});

test('stale or hidden camera never reads a frame; unsupported analysis stops polling', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let samples = 0;
  let active = false;
  const cues = [];
  const options = {
    canRead: () => active,
    readFrame: () => { samples++; throw new Error('Camera read unavailable'); },
    onCue: cue => cues.push(cue.code),
  };
  const stopOld = monitorCameraQuality(options);
  t.mock.timers.tick(3001);
  assert.equal(samples, 0);
  stopOld();
  active = true;
  const stop = monitorCameraQuality(options);
  for (let i = 0; i < 5; i++) t.mock.timers.tick(3001);
  assert.equal(samples, 2);
  assert.deepEqual(cues, ['unavailable']);
  stop();
});
