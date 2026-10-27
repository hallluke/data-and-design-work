"use strict";
import { showChartError, validateWasteData } from "./shared.js";
import { getAtlasData } from "./data.js";
import { initFreshness } from "./freshness.js";
import { initDisclosures } from "./disclosures.js";
import { createMonthlyWasteChart } from "./charts/monthly.js";
import { createYearComparisonChart } from "./charts/comparison.js";
import { createRecyclingRateChart } from "./charts/recycling.js";
import { createRecordingCalendar } from "./charts/calendar.js";

let atlasCharts = [];
async function initAtlas() {
  let data;
  try {
    data = await getAtlasData();
  } catch (error) {
    for (const id of ["monthly-chart", "comparison-chart", "recycling-chart", "calendar-chart"]) {
      const container = document.getElementById(id);
      if (container) showChartError(container, error);
    }
    try { initDisclosures(); } catch (disclosureError) { console.error(disclosureError); }
    return;
  }
  try { initFreshness(data); } catch (error) { console.warn("Freshness display unavailable:", error); }
  const charts = [];
  const startChart = (containerId, create) => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Missing chart container: #${containerId}`);
      return;
    }
    try {
      const chart = create(container);
      chart.render();
      container.querySelector(".error")?.remove();
      charts.push(chart);
    } catch (error) {
      showChartError(container, error);
    }
  };

  // Disclosure controls do not depend on any chart successfully rendering.
  try {
    initDisclosures();
  } catch (error) {
    console.error("Could not initialise disclosure controls:", error);
  }

  // Raw-record charts can still work if the monthly aggregate is invalid.
  startChart("recycling-chart", container =>
    createRecyclingRateChart({container, rows: data.collections}));
  startChart("calendar-chart", container =>
    createRecordingCalendar({container, rows: data.collections}));

  // Validate shared monthly data once, then initialise its two consumers separately.
  let monthlyDataValid = false;
  try {
    validateWasteData(data.monthly, data.detail);
    monthlyDataValid = true;
  } catch (error) {
    showChartError(document.getElementById("monthly-chart"), error);
    showChartError(document.getElementById("comparison-chart"), error);
  }
  if (monthlyDataValid) {
    startChart("monthly-chart", container =>
      createMonthlyWasteChart({container, data: data.monthly, detail: data.detail}));
    startChart("comparison-chart", container =>
      createYearComparisonChart({container, data: data.monthly, detail: data.detail,
        comparison: data.comparison}));
  }
  atlasCharts = charts;
}
window.addEventListener("load", initAtlas);
