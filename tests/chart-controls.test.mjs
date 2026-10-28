import test from "node:test";
import assert from "node:assert/strict";
import { syncButtonGroup, setControlDisabled } from "../js/chart-core.js";

function button(value) {
  const attrs = {};
  return { dataset: { basis: value }, disabled: false, attrs,
    setAttribute(name, value) { attrs[name] = value; } };
}

test("button group reflects selected value", () => {
  const buttons = [button("recorded"), button("imputed")];
  syncButtonGroup(buttons, "imputed", "basis");
  assert.equal(buttons[0].attrs["aria-pressed"], "false");
  assert.equal(buttons[1].attrs["aria-pressed"], "true");
});

test("disabled control synchronises native and ARIA state", () => {
  const control = button("recorded");
  setControlDisabled(control, true);
  assert.equal(control.disabled, true);
  assert.equal(control.attrs["aria-disabled"], "true");
  setControlDisabled(control, false);
  assert.equal(control.disabled, false);
  assert.equal(control.attrs["aria-disabled"], "false");
});
