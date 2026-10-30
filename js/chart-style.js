"use strict";

// Shared chart palette and responsive layout breakpoint.
const MULTI_COLUMN_MEDIA = "(min-width: 581px)";
const cssColour = (token, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
const ATLAS_COLOURS = Object.freeze({
  dark:cssColour("--chart-dark"),
  light:cssColour("--chart-light"),
  empty:cssColour("--chart-empty")
});
function atlasColourAt(t) {
  return d3.interpolateLab(ATLAS_COLOURS.dark, ATLAS_COLOURS.light)(t);
}
function atlasPalette(count) {
  return count <= 1 ? [ATLAS_COLOURS.dark] :
    d3.quantize(d3.interpolateLab(ATLAS_COLOURS.dark,ATLAS_COLOURS.light),count);
}
export { MULTI_COLUMN_MEDIA, ATLAS_COLOURS, atlasPalette, atlasColourAt, cssColour };
