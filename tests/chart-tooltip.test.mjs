import test from 'node:test';
import assert from 'node:assert/strict';
import {showTooltip, hideTooltip, positionFixedTooltip} from '../js/chart-tooltip.js';

test('tooltip visibility can change without replacing content', () => {
  const tip = {hidden:true, innerHTML:'old'};
  showTooltip(tip);
  assert.equal(tip.hidden, false);
  assert.equal(tip.innerHTML, 'old');
  showTooltip(tip, 'new');
  assert.equal(tip.innerHTML, 'new');
  hideTooltip(tip);
  assert.equal(tip.hidden, true);
});

test('fixed tooltip follows pointer and clamps within viewport', () => {
  globalThis.window = {innerWidth:300, innerHeight:200};
  const tip = {offsetWidth:100, offsetHeight:40, style:{}};
  positionFixedTooltip(tip, {clientX:50, clientY:100});
  assert.equal(tip.style.left, '62px');
  assert.equal(tip.style.top, '50px');
  positionFixedTooltip(tip, {clientX:295, clientY:5});
  assert.equal(tip.style.left, '194px');
  assert.equal(tip.style.top, '6px');
  delete globalThis.window;
});
