"use strict";

/* ============================================================
   SHARED UTILITIES
   These have no knowledge of waste data or Figure 01.
   ============================================================ */
const MULTI_COLUMN_MEDIA = "(min-width: 581px)";
const formatWeight = value => Number(value).toFixed(2);
const formatMonth = value => {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    .replace(" ", "-");
};
const monthInitial = month => "JFMAMJJASOND"[Number(month.slice(5, 7)) - 1];

// Position any HTML tooltip within its own chart container.
function positionChartTooltip(tooltip, event, container, { gap = 12, edge = 3, verticalGap = 8 } = {}) {
  const bounds = container.getBoundingClientRect();
  const mouseX = event.clientX - bounds.left;
  const mouseY = event.clientY - bounds.top;
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  let x = mouseX + gap;
  if (x + width > bounds.width - edge) x = mouseX - gap - width;
  x = Math.max(edge, Math.min(x, Math.max(edge, bounds.width - width - edge)));
  const y = Math.max(0, Math.min(mouseY - height - verticalGap, Math.max(0, bounds.height - height)));
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

// A single status element serves as the initial loading message and any later error.
function clearChartStatus(container) {
  container?.querySelector(".chart-status, .error")?.remove();
}
function showChartError(container, error) {
  console.error(error);
  if (!container) return;
  container.querySelector("svg")?.remove();
  let message = container.querySelector(".chart-status, .error");
  if (!message) {
    message = document.createElement("p");
    container.prepend(message);
  }
  message.className = "chart-status error";
  message.textContent = "Chart unavailable: " + error.message;
}

// Check the data contract once, before creating a chart. Detailed validation belongs in Python.
function validateWasteData(data, detail) {
  if (!Array.isArray(data.months) || !data.months.length) throw Error("Monthly data is missing or empty.");
  if (!data.months.every(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))) throw Error("Invalid month; expected YYYY-MM.");
  if (new Set(data.months).size !== data.months.length ||
      data.months.some((month, i) => i && month <= data.months[i - 1])) throw Error("Months must be unique and chronological.");
  if (!Array.isArray(data.groups) || !data.groups.length) throw Error("Material groups are missing.");
  for (const basis of ["imputed", "recorded"]) {
    if (!Array.isArray(data[basis]) || !Array.isArray(detail[basis])) throw Error("Missing " + basis + " data.");
    for (const record of [...data[basis], ...detail[basis]]) {
      if (!data.months.includes(record.month) || !Number.isFinite(record.kg) || record.kg < 0)
        throw Error("Invalid " + basis + " month or weight.");
    }
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.metadata?.completeThrough ?? ""))
    throw Error("Missing or invalid metadata.completeThrough.");
  if (data.metadata.completeThrough > data.months[data.months.length - 1])
    throw Error("Completeness cutoff exceeds the available data.");
}

/* ============================================================
   FIGURE 01 — MONTHLY WASTE
   Data selection, state, Plot marks, legend and table stay here.
   ============================================================ */
// Shared neutral data palette. D3 is already loaded for Observable Plot.
const ATLAS_COLOURS = Object.freeze({dark:"#454545",light:"#d0ceca",empty:"#eeedea"});
function atlasPalette(count) {
  return count <= 1 ? [ATLAS_COLOURS.dark] :
    d3.quantize(d3.interpolateLab(ATLAS_COLOURS.dark,ATLAS_COLOURS.light),count);
}

// Register persistent chart-owned listeners and their cleanup callbacks.
// Render-created SVG marks are replaced on redraw and need no persistent registry.
// Each chart owns its cleanup list and can be destroyed independently.
function bindChartEvent(listeners, target, event, handler) {
  target.addEventListener(event, handler);
  listeners.push(() => target.removeEventListener(event, handler));
}


export { MULTI_COLUMN_MEDIA, formatWeight, formatMonth, monthInitial, positionChartTooltip, showChartError, clearChartStatus, validateWasteData, atlasPalette, ATLAS_COLOURS, bindChartEvent };
