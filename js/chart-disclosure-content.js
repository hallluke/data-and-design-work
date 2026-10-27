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
