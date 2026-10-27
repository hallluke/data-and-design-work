"use strict";

// Dates are parsed as UTC calendar dates, avoiding timezone shifts for YYYY-MM-DD.
function formatCollectionDate(isoDate) {
  if (typeof isoDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoDate) return null;
  return new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(parsed);
}

export function initFreshness(data) {
  const preview = document.getElementById("freshness-preview");
  const selector = document.getElementById("freshness-style");
  if (!preview || !selector) return;

  const timestamp = data?.refresh?.last_refreshed;
  const refreshDate = typeof timestamp === "string" ? new Date(timestamp) : new Date(NaN);
  const dates = Array.isArray(data?.collections)
    ? data.collections.map(row => row.date).filter(date => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
    : [];
  const latestDate = dates.length ? dates.reduce((max, date) => date > max ? date : max) : null;
  const latest = latestDate ? formatCollectionDate(latestDate) : null;
  if (Number.isNaN(refreshDate.getTime()) || !latest) return;

  const refreshed = new Intl.DateTimeFormat("en-GB", {
    day:"numeric", month:"long", year:"numeric", timeZone:"Europe/London"
  }).format(refreshDate);

  const kicker = document.getElementById("freshness-kicker");
  const refreshedNode = document.getElementById("freshness-refresh");
  const recordedNode = document.getElementById("freshness-record");
  const styles = {
    dateline: ["Latest edition", `Last refreshed: ${refreshed}`, `Records to: ${latest}`],
    stamp: ["Freshly checked", refreshed, `Latest entry · ${latest}`],
    note: ["A note from the editor…", `Freshly checked on ${refreshed}.`, `Latest collection: ${latest}.`],
    colophon: ["From the household records", `Refreshed ${refreshed}`, `Filed through ${latest}`]
  };
  const applyStyle = name => {
    const style = Object.hasOwn(styles, name) ? name : "dateline";
    preview.dataset.style = style;
    [kicker.textContent, refreshedNode.textContent, recordedNode.textContent] = styles[style];
    selector.value = style;
    try { localStorage.setItem("waste-freshness-style-preview", style); } catch (_) { /* storage optional */ }
  };
  let saved = "dateline";
  try { saved = localStorage.getItem("waste-freshness-style-preview") || saved; } catch (_) { /* storage optional */ }
  selector.addEventListener("change", () => applyStyle(selector.value));
  applyStyle(saved);
  preview.hidden = false;
}
