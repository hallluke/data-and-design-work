import test from "node:test";
import assert from "node:assert/strict";
import { ATLAS_COLOURS, cssColour } from "../js/chart-style.js";

test("chart palette resolves CSS lazily and follows CSS changes", () => {
  const previousDocument = globalThis.document;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const values = {"--chart-dark":"#112233", "--chart-light":"#aabbcc", "--chart-empty":"#eeeeee"};
  try {
    globalThis.document = {documentElement:{}};
    globalThis.getComputedStyle = () => ({getPropertyValue: token => values[token] || ""});
    assert.equal(ATLAS_COLOURS.dark, "#112233");
    assert.equal(ATLAS_COLOURS.light, "#aabbcc");
    assert.equal(cssColour("--chart-empty"), "#eeeeee");
    values["--chart-dark"] = "#445566";
    assert.equal(ATLAS_COLOURS.dark, "#445566");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previousGetComputedStyle;
  }
});
