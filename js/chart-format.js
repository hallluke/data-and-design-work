"use strict";

// Preserve existing display precision; calculation values are never rounded here.
export const formatWeight = value => Number(value).toFixed(2);
export const formatNumber = value => Number(value).toLocaleString("en-GB", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
export const formatPercent = value => Number(value).toFixed(1) + "%";
export const formatSignedNumber = value => (value > 0 ? "+" : "") + formatNumber(value);
