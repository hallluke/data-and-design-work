import test from 'node:test';
import assert from 'node:assert/strict';
import {dismissChartSelection} from '../js/chart-interaction.js';

function setup(focusVisible, within = true) {
  let cleared = 0;
  const tooltip = {hidden:false, style:{}};
  const activeElement = {matches: selector => selector === ':focus-visible' && focusVisible};
  const chart = {contains: element => within && element === activeElement};
  const dismiss = preserveKeyboardFocus => dismissChartSelection({
    tooltip, clear: () => cleared++, preserveKeyboardFocus, chart, activeElement
  });
  return {dismiss, tooltip, cleared: () => cleared};
}

test('Escape hides tooltip but retains keyboard selection indicator', () => {
  const state = setup(true);
  state.dismiss(true);
  assert.equal(state.tooltip.hidden, true);
  assert.equal(state.cleared(), 0);
});

test('Escape still clears mouse/touch selection when focus is not keyboard-visible', () => {
  const state = setup(false);
  state.dismiss(true);
  assert.equal(state.cleared(), 1);
});

test('Escape clears selections when focus is outside chart', () => {
  const state = setup(true, false);
  state.dismiss(true);
  assert.equal(state.cleared(), 1);
});

test('Chart 3 can retain its existing default selection clearing', () => {
  const state = setup(true);
  state.dismiss(false);
  assert.equal(state.cleared(), 1);
});
