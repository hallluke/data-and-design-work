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
