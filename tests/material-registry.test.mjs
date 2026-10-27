import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import registry from '../js/material-registry.js';
import { groupChildren, groupLabels, sourceMatchesSelection, materialIdFromSource, materialLabel } from '../js/materials.js';
const config=JSON.parse(readFileSync(new URL('../config/materials.json',import.meta.url),'utf8'));
test('browser registry matches the canonical Python/JS JSON',()=>assert.deepEqual(registry,config));
test('material group membership and source aliases',()=>{
  assert.deepEqual(groupChildren('mixedRecycling'),['glass','cardboard','tin','plastic','paper']);
  assert.deepEqual(groupLabels('mixedRecycling'),['Glass','Cardboard','Tin','Plastic','Paper']);
  assert.equal(materialIdFromSource('Waste'),'residualWaste');
  assert.equal(materialLabel('mixedRecycling'),'Dry recycling');
  assert.equal(sourceMatchesSelection('Glass','mixedRecycling'),true);
  assert.equal(sourceMatchesSelection('Soft plastic','mixedRecycling'),false);
  assert.equal(sourceMatchesSelection('Waste','residualWaste'),true);
});
