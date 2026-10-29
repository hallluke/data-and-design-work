"use strict";

function formatDate(isoDate) {
  if (typeof isoDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== isoDate) return null;
  return new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"short", year:"numeric", timeZone:"UTC" }).format(date);
}

export function initFreshness(data) {
  const band = document.getElementById("publication-band");
  if (!band) return;
  const refreshDate = new Date(data?.refresh?.last_refreshed ?? NaN);
  const dates = Array.isArray(data?.collections)
    ? data.collections.map(row => row.date).filter(date => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
    : [];
  const latest = dates.length ? formatDate(dates.reduce((a,b) => a > b ? a : b)) : null;
  if (!latest || Number.isNaN(refreshDate.getTime())) return;
  const checked = new Intl.DateTimeFormat("en-GB", {
    day:"numeric", month:"short", year:"numeric", timeZone:"Europe/London"
  }).format(refreshDate);
  document.getElementById("stamp-filed").textContent = latest;
  document.getElementById("stamp-checked").textContent = checked;
}
