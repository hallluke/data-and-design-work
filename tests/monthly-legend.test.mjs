import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyLegendItems } from '../js/charts/monthly-material-weights.js';

const colours = {Residual:'#111', Recycling:'#222'};
const dry = ['#333','#444'];
const base = {chartGroups:['Residual','Recycling'],material:'all'};

test('monthly legend retains recorded total key', () => {
  assert.deepEqual(monthlyLegendItems({...base,basis:'recorded',stacked:false},colours,dry), [['Recorded', '#454545']]);
});
test('monthly legend distinguishes complete and provisional imputed totals', () => {
  const items = monthlyLegendItems({...base,basis:'imputed',stacked:false},colours,dry);
  assert.deepEqual(items.map(([label]) => label), ['Complete','Provisional']);
});
test('monthly legend lists stacked categories in plotted reverse order for either basis', () => {
  for (const basis of ['imputed','recorded']) {
    assert.deepEqual(monthlyLegendItems({...base,basis,stacked:true},colours,dry),
      [['Recycling','#222'],['Residual','#111']]);
  }
});
