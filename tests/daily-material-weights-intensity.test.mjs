import test from "node:test";
import assert from "node:assert/strict";
import { calendarIntensityPosition } from "../js/charts/daily-material-weights.js";

test("one distinct weight always uses darkest shade", () => {
  assert.equal(calendarIntensityPosition(0.25, [0.25]), 1);
});

test("two distinct weights use lightest and darkest shades regardless of frequency", () => {
  assert.equal(calendarIntensityPosition(2, [2, 5]), 0);
  assert.equal(calendarIntensityPosition(5, [2, 5]), 1);
});

test("intermediate values interpolate across the full range", () => {
  assert.equal(calendarIntensityPosition(3, [1, 3, 5]), 0.5);
  assert.equal(calendarIntensityPosition(2, [1, 2, 5, 9]), 0.125);
});
