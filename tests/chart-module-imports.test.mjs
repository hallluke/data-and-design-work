import test from 'node:test';
import assert from 'node:assert/strict';

// Catch broken named imports that node --check cannot detect.
test('all four chart modules resolve their imports', async () => {
  const names = [
    'monthly-material-weights',
    'yearly-material-comparison',
    'overall-recycling-rate',
    'daily-material-weights'
  ];
  const modules = await Promise.all(names.map(name => import(`../js/charts/${name}.js`)));
  for (const module of modules) {
    assert.equal(typeof Object.values(module).find(value => typeof value === 'function' && value.name.startsWith('create')), 'function');
  }
});
