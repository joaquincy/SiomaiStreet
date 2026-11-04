import test from 'node:test';
import assert from 'node:assert/strict';
import { observeMotionVisibility } from '../src/utils/motionVisibility.js';

function environment(t, { supported = true } = {}) {
  const previousDocument = globalThis.document;
  const previousObserver = globalThis.IntersectionObserver;
  const listeners = new Set();
  const observers = [];
  globalThis.document = {
    hidden: false,
    addEventListener(name, callback) { assert.equal(name, 'visibilitychange'); listeners.add(callback); },
    removeEventListener(name, callback) { assert.equal(name, 'visibilitychange'); listeners.delete(callback); },
  };
  globalThis.IntersectionObserver = supported ? class {
    elements = new Set();
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.elements.add(element); }
    disconnect() { this.elements.clear(); this.disconnected = true; }
    emit(target, isIntersecting) { this.callback([{ target, isIntersecting }]); }
  } : undefined;
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousObserver === undefined) delete globalThis.IntersectionObserver;
    else globalThis.IntersectionObserver = previousObserver;
  });
  return {
    observers, listeners,
    hide(hidden) { document.hidden = hidden; listeners.forEach(callback => callback()); },
  };
}

test('one observer pauses each offscreen section independently and suppresses redundant updates', t => {
  const { observers } = environment(t);
  const hero = {}, reviews = {}, changes = [];
  const stop = observeMotionVisibility([hero, reviews], (element, active) => changes.push([element, active]));
  t.after(stop);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].elements.size, 2);
  assert.deepEqual(changes, [[hero, false], [reviews, false]]);
  changes.length = 0;
  observers[0].emit(hero, true);
  observers[0].emit(hero, true);
  observers[0].emit(reviews, false);
  observers[0].emit({}, true);
  assert.deepEqual(changes, [[hero, true]]);
  observers[0].emit(hero, false);
  assert.deepEqual(changes.at(-1), [hero, false]);
});

test('returning to the tab resumes only visible sections, including visibility changes while hidden', t => {
  const env = environment(t);
  const hero = {}, reviews = {}, state = new Map();
  const stop = observeMotionVisibility([hero, reviews], (element, active) => state.set(element, active));
  t.after(stop);
  env.observers[0].emit(hero, true);
  env.hide(true);
  assert.equal(state.get(hero), false);
  env.observers[0].emit(hero, false);
  env.observers[0].emit(reviews, true);
  assert.equal(state.get(reviews), false);
  env.hide(false);
  assert.equal(state.get(hero), false);
  assert.equal(state.get(reviews), true);
});

test('cleanup removes observers/listeners and ignores already queued intersection callbacks', t => {
  const env = environment(t);
  const section = {}, changes = [];
  const stop = observeMotionVisibility([section], (_, active) => changes.push(active));
  assert.equal(env.listeners.size, 1);
  stop();
  assert.equal(env.listeners.size, 0);
  assert.equal(env.observers[0].disconnected, true);
  env.observers[0].emit(section, true);
  env.hide(true);
  assert.deepEqual(changes, [false]);
});

test('without IntersectionObserver, content stays active while the tab is visible', t => {
  const env = environment(t, { supported: false });
  const changes = [];
  const stop = observeMotionVisibility([{}], (_, active) => changes.push(active));
  t.after(stop);
  assert.deepEqual(changes, [true]);
  env.hide(true);
  env.hide(false);
  assert.deepEqual(changes, [true, false, true]);
});
