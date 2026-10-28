import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestSlope} from '../js/slope-proximity.js';
const slopes = [{y0:10,y1:30},{y0:30,y1:10},{y0:40,y1:40}];
test('interpolates at the pointer horizontal position', () => {
  assert.deepEqual(nearestSlope(slopes,25,14,0,100,8), {index:0,distance:1});
  assert.deepEqual(nearestSlope(slopes,75,14,0,100,8), {index:1,distance:1});
});
test('rejects out of range touches and outside year endpoints', () => {
  assert.equal(nearestSlope(slopes,50,60,0,100,16),null);
  assert.equal(nearestSlope(slopes,-1,20,0,100,16),null);
  assert.equal(nearestSlope(slopes,101,20,0,100,16),null);
});
test('keeps previous slope at exact crossings', () => {
  assert.equal(nearestSlope(slopes,50,20,0,100,8,1).index,1);
  assert.equal(nearestSlope(slopes,50,20,0,100,8,0).index,0);
});
test('handles endpoints and exact tolerance', () => {
  assert.equal(nearestSlope(slopes,0,18,0,100,8).index,0);
});
