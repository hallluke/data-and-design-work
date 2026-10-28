import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonLabelPositions } from '../js/charts/yearly-material-comparison.js';

test('comparison labels retain natural positions when there is room', () => {
  assert.deepEqual(comparisonLabelPositions([20, 50, 90], 10, 110), [20, 50, 90]);
});
test('comparison labels separate overlapping positions', () => {
  assert.deepEqual(comparisonLabelPositions([20, 21, 22], 10, 100), [20, 33.5, 47]);
});
test('comparison labels stay within lower limit when feasible', () => {
  assert.deepEqual(comparisonLabelPositions([80, 90, 99], 10, 100), [73, 86.5, 100]);
});
test('comparison label positioning accepts no rows', () => {
  assert.deepEqual(comparisonLabelPositions([], 10, 100), []);
});
