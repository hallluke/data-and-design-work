import test from 'node:test';
import assert from 'node:assert/strict';
import {installTouchDismissal, syncScrollableTableFocus} from '../js/chart-interaction.js';

function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, callback) { const callbacks = listeners.get(type) ?? new Set(); callbacks.add(callback); listeners.set(type, callbacks); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    contains() { return false; },
  };
}

test('touch dismissal releases all persistent listeners', () => {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  globalThis.document = Object.assign(target(), {activeElement: null});
  globalThis.window = target();
  try {
    const chart = target();
    const tooltip = {hidden: true, contains: () => false};
    const stop = installTouchDismissal(chart, tooltip);
    assert.equal(chart.listeners.get('touchend').size, 1);
    stop();
    for (const obj of [chart, globalThis.document, globalThis.window]) {
      for (const callbacks of obj.listeners.values()) assert.equal(callbacks.size, 0);
    }
  } finally { globalThis.document = oldDocument; globalThis.window = oldWindow; }
});

test('scrollable table focus releases disclosure toggle listeners', () => {
  const oldWindow = globalThis.window;
  const oldResizeObserver = globalThis.ResizeObserver;
  globalThis.window = target();
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const details = target();
  const root = {querySelectorAll(selector) {return selector === 'details' ? [details] : [];}};
  try {
    const stop = syncScrollableTableFocus(root);
    assert.equal(details.listeners.get('toggle').size, 1);
    stop();
    assert.equal(details.listeners.get('toggle').size, 0);
    assert.equal(globalThis.window.listeners.get('resize').size, 0);
  } finally {globalThis.window = oldWindow; globalThis.ResizeObserver = oldResizeObserver;}
});
