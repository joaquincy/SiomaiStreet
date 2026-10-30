import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarNavigation as move } from '../src/utils/calendarNavigation.js';

test('calendar arrows cross month, year and leap-day boundaries correctly', () => {
  assert.deepEqual(move(2024, 1, 28, 'ArrowRight'), { year: 2024, month: 1, day: 29 });
  assert.deepEqual(move(2023, 1, 28, 'ArrowRight'), { year: 2023, month: 2, day: 1 });
  assert.deepEqual(move(2024, 0, 1, 'ArrowLeft'), { year: 2023, month: 11, day: 31 });
  assert.deepEqual(move(2024, 0, 1, 'ArrowUp'), { year: 2023, month: 11, day: 25 });
  assert.deepEqual(move(2024, 11, 28, 'ArrowDown'), { year: 2025, month: 0, day: 4 });
});

test('calendar paging clamps to the target month and supports year paging', () => {
  assert.deepEqual(move(2024, 0, 31, 'PageDown'), { year: 2024, month: 1, day: 29 });
  assert.deepEqual(move(2023, 2, 31, 'PageUp'), { year: 2023, month: 1, day: 28 });
  assert.deepEqual(move(2024, 1, 29, 'PageDown', true), { year: 2025, month: 1, day: 28 });
  assert.deepEqual(move(2024, 1, 29, 'PageUp', true), { year: 2023, month: 1, day: 28 });
});

test('calendar Home/End use week boundaries and leave unrelated keys alone', () => {
  assert.deepEqual(move(2024, 0, 3, 'Home'), { year: 2023, month: 11, day: 31 });
  assert.deepEqual(move(2024, 0, 3, 'End'), { year: 2024, month: 0, day: 6 });
  for (const key of ['Tab', 'Escape', 'Enter', 'constructor']) assert.equal(move(2024, 0, 3, key), null);
  assert.equal(move(9999, 11, 31, 'ArrowRight'), null);
});
