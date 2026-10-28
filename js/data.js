async function getAtlasData() {
  const sources = {
    monthly: "data/monthly.json",
    detail: "data/detail.json",
    comparison: "data/comparison.json",
    collections: "data/collections.json",
    refresh: "data/refresh.json"
  };
  const entries = await Promise.all(Object.entries(sources).map(async ([key, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(entries);
}

// Initialise each figure independently so one rendering failure does not hide the others.
// Keep a reference to each chart for future reinitialisation and teardown.

export { getAtlasData };

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
export { validateWasteData };
