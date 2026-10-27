// Reusable population of chart methodology and accessible data-table headers.
export function setDisclosureContent({root = document, methodId, tableId, methodology, columns}) {
  const method = root.getElementById(methodId);
  const table = root.getElementById(tableId);
  if (!method || !table?.tHead) throw new Error(`Missing disclosure content: ${methodId} / ${tableId}`);
  method.textContent = methodology;
  const row = root.createElement("tr");
  for (const heading of columns) {
    const th = root.createElement("th");
    th.scope = "col";
    th.textContent = heading;
    row.append(th);
  }
  table.tHead.replaceChildren(row);
}
