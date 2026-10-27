import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import registry from '../js/material-registry.js';
import { groupChildren, groupLabels, sourceMatchesSelection, materialIdFromSource, materialLabel, normalizeMonthlyGroups } from '../js/materials.js';
const config=JSON.parse(readFileSync(new URL('../config/materials.json',import.meta.url),'utf8'));
test('browser registry matches the canonical Python/JS JSON',()=>assert.deepEqual(registry,config));
test('material group membership and source aliases',()=>{
  assert.deepEqual(groupChildren('mixedRecycling'),['glass','cardboard','tin','plastic','paper']);
  assert.deepEqual(groupLabels('mixedRecycling'),['Glass','Cardboard','Tin','Plastic','Paper']);
  assert.equal(materialIdFromSource('Waste'),'residualWaste');
  assert.equal(materialLabel('mixedRecycling'),config.groups.find(group=>group.id==='mixedRecycling').label);
  assert.equal(sourceMatchesSelection('Glass','mixedRecycling'),true);
  assert.equal(sourceMatchesSelection('Soft plastic','mixedRecycling'),false);
  assert.equal(sourceMatchesSelection('Waste','residualWaste'),true);
});

test('monthly data with stale group labels resolves to current registry labels',()=>{
  const stale = {groups:['Residual waste','Food waste','Dry recycling','Soft plastics'],
    recorded:[{month:'2025-01',group:'Dry recycling',kg:3}],
    imputed:[{month:'2025-01',group:'Dry recycling',kg:2}]};
  const result = normalizeMonthlyGroups(stale);
  const label = materialLabel('mixedRecycling');
  assert.equal(result.groups[2],label);
  assert.equal(result.recorded[0].group,label);
  assert.equal(result.imputed[0].group,label);
});
