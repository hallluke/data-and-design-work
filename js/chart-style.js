"use strict";

// Shared chart palette and responsive layout breakpoint.
const MULTI_COLUMN_MEDIA = "(min-width: 581px)";
const cssColour = (token, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
const ATLAS_COLOURS = Object.freeze({
  dark:cssColour("--chart-dark", "#48443f"),
  light:cssColour("--chart-light", "#c9c2b9"),
  empty:cssColour("--chart-empty", "#e5e0d9")
});
function atlasPalette(count) {
  return count <= 1 ? [ATLAS_COLOURS.dark] :
    d3.quantize(d3.interpolateLab(ATLAS_COLOURS.dark,ATLAS_COLOURS.light),count);
}
export { MULTI_COLUMN_MEDIA, ATLAS_COLOURS, atlasPalette, cssColour };
