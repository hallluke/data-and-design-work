"use strict";

// Shared chart palette and responsive layout breakpoint.
const MULTI_COLUMN_MEDIA = "(min-width: 581px)";
// Resolve CSS tokens when a chart actually renders, not when modules import.
// CSS remains the only source of palette values; Node imports need no DOM.
function cssColour(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
const ATLAS_COLOURS = Object.freeze({
  get dark() { return cssColour("--chart-dark"); },
  get light() { return cssColour("--chart-light"); },
  get empty() { return cssColour("--chart-empty"); }
});
function atlasColourAt(t) {
  return d3.interpolateLab(ATLAS_COLOURS.dark, ATLAS_COLOURS.light)(t);
}
function atlasPalette(count) {
  return count <= 1 ? [ATLAS_COLOURS.dark] :
    d3.quantize(d3.interpolateLab(ATLAS_COLOURS.dark,ATLAS_COLOURS.light),count);
}
export { MULTI_COLUMN_MEDIA, ATLAS_COLOURS, atlasPalette, atlasColourAt, cssColour };
