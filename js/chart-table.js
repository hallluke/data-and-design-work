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
