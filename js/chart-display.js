"use strict";

// Tooltip visibility and positioning.
// Tooltip lifecycle is shared; content and hover semantics remain chart-owned.
export function showTooltip(tooltip, html) {
  if (html !== undefined) tooltip.innerHTML = html;
  tooltip.hidden = false;
}

export function hideTooltip(tooltip) {
  tooltip.hidden = true;
}

// Viewport positioning for fixed-position tooltips (the calendar heatmap).
// Do not recalculate content or dimensions in the caller on each pointer move.
export function positionFixedTooltip(tooltip, event, {gap = 12, edge = 6, verticalGap = 10, flipBoundary = null} = {}) {
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const preferLeft = flipBoundary !== null && event.clientX + gap + width > flipBoundary;
  const preferredX = preferLeft ? event.clientX - gap - width : event.clientX + gap;
  tooltip.style.left = Math.max(edge, Math.min(preferredX, window.innerWidth - width - edge)) + "px";
  tooltip.style.top = Math.max(edge, Math.min(event.clientY - height - verticalGap, window.innerHeight - height - edge)) + "px";
}

// Position any HTML tooltip within its own chart container.
function positionChartTooltip(tooltip, event, container, { gap = 12, edge = 3, verticalGap = 8 } = {}) {
  const bounds = container.getBoundingClientRect();
  const mouseX = event.clientX - bounds.left;
  const mouseY = event.clientY - bounds.top;
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  // Use the same pointer-to-tooltip gap on either side. Prefer the side
  // with enough room, rather than flipping and then silently clamping flush
  // against the pointer on narrow touchscreens.
  const fitsRight = mouseX + gap + width <= bounds.width - edge;
  const fitsLeft = mouseX - gap - width >= edge;
  let x = fitsRight ? mouseX + gap : fitsLeft ? mouseX - gap - width
    : (bounds.width - mouseX >= mouseX ? mouseX + gap : mouseX - gap - width);
  x = Math.max(edge, Math.min(x, Math.max(edge, bounds.width - width - edge)));
  const y = Math.max(0, Math.min(mouseY - height - verticalGap, Math.max(0, bounds.height - height)));
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}
export { positionChartTooltip };

// Stable tooltip anchor for touch selection; independent of tap coordinates.
export function elementTooltipAnchor(element, verticalOffset = null) {
  const bounds = element.getBoundingClientRect();
  return {clientX: bounds.left + bounds.width / 2,
    clientY: bounds.top + (verticalOffset === null ? bounds.height / 2 : verticalOffset)};
}

// Formatting.
"use strict";

// Preserve existing display precision; calculation values are never rounded here.
export const formatWeight = value => Number(value).toFixed(2);
export const formatNumber = value => Number(value).toLocaleString("en-GB", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
export const formatPercent = value => Number(value).toFixed(1) + "%";
export const formatSignedNumber = value => (value > 0 ? "+" : "") + formatNumber(value);

const formatMonth = value => {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    .replace(" ", "-");
};
const monthInitial = month => "JFMAMJJASOND"[Number(month.slice(5, 7)) - 1];
export { formatMonth, monthInitial };

// Tables and chart disclosure content.
"use strict";

// Populate a disclosure table body with text-only values. The column definition
// uses the same {label, numeric} convention as setDisclosureContent().
export function renderTableRows(tbody, rows, columns, {root = document} = {}) {
  if (!tbody) throw new Error("Missing table body");
  const numeric = columns.map(column => typeof column === "string" ? false : Boolean(column.numeric));
  const fragment = root.createDocumentFragment();
  for (const values of rows) {
    if (values.length !== columns.length) throw new Error("Table row does not match column count");
    const tr = root.createElement("tr");
    values.forEach((value, index) => {
      const td = root.createElement("td");
      td.textContent = String(value ?? "");
      if (numeric[index]) td.className = "numeric";
      tr.append(td);
    });
    fragment.append(tr);
  }
  tbody.replaceChildren(fragment);
}

"use strict";

// Shared disclosure content for every chart. Call again when a table's columns change.
// Methodology HTML is authored by chart modules, never taken from external data.
export function setDisclosureContent({root = document, methodId, tableId, methodology, columns}) {
  const method = root.getElementById(methodId);
  const table = root.getElementById(tableId);
  if (!method || !table?.tHead) throw new Error(`Missing disclosure content: ${methodId} / ${tableId}`);
  if (methodology !== undefined) {
    if (typeof methodology === "string") method.textContent = methodology;
    else if (methodology && typeof methodology.html === "string") method.innerHTML = methodology.html;
    else throw new TypeError("Methodology must be text or trusted HTML");
  }
  if (columns !== undefined) {
    const row = root.createElement("tr");
    for (const column of columns) {
      const definition = typeof column === "string" ? {label: column} : column;
      const th = root.createElement("th");
      th.scope = "col";
      th.textContent = definition.label;
      if (definition.numeric) th.className = "numeric";
      row.append(th);
    }
    table.tHead.replaceChildren(row);
  }
}
