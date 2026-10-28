import test from "node:test";
import assert from "node:assert/strict";
import { startChart } from "../js/chart-core.js";

function fixture() {
  const errors = [];
  const container = {
    querySelector(selector) { return selector === ".chart-status, .error" ? { remove() { errors.push("cleared"); } } : null; },
    prepend() {},
  };
  return { container, errors, root: { getElementById: id => id === "chart" ? container : null } };
}

test("starts and tracks a valid chart", () => {
  const { root, errors } = fixture();
  const charts = [];
  let rendered = 0;
  assert.equal(startChart(charts, "chart", () => ({ render() { rendered++; }, destroy() {} }), root), true);
  assert.equal(rendered, 1);
  assert.equal(charts.length, 1);
  assert.deepEqual(errors, ["cleared"]);
});

test("missing container leaves other charts unaffected", () => {
  const { root } = fixture();
  const charts = [];
  const original = console.error;
  console.error = () => {};
  try { assert.equal(startChart(charts, "missing", () => { throw Error("should not run"); }, root), false); }
  finally { console.error = original; }
  assert.equal(charts.length, 0);
});

test("a failed render does not enter the chart registry", () => {
  const { root, container } = fixture();
  let errorMessage;
  container.querySelector = selector => selector === ".chart-status, .error" ? null : null;
  container.prepend = element => { errorMessage = element; };
  const originalDocument = globalThis.document;
  const originalConsole = console.error;
  globalThis.document = { createElement: () => ({ className: "", textContent: "" }) };
  console.error = () => {};
  const charts = [];
  try {
    assert.equal(startChart(charts, "chart", () => ({ render() { throw Error("render failed"); }, destroy() {} }), root), false);
    assert.equal(charts.length, 0);
    assert.match(errorMessage.textContent, /render failed/);
  } finally { globalThis.document = originalDocument; console.error = originalConsole; }
});
