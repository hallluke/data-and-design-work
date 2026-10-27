"use strict";
import { showChartError, validateWasteData } from "./shared.js";
import { startChart } from "./chart-runtime.js";
import { getAtlasData } from "./data.js";
import { initFreshness } from "./freshness.js";
import { initDisclosures } from "./disclosures.js";
import { createMonthlyMaterialWeightsChart } from "./charts/monthly-material-weights.js";
import { createYearlyMaterialComparisonChart } from "./charts/yearly-material-comparison.js";
import { createOverallRecyclingRateChart } from "./charts/overall-recycling-rate.js";
import { createDailyMaterialWeightsChart } from "./charts/daily-material-weights.js";

let atlasCharts = [];
async function initAtlas() {
  let data;
  try {
    data = await getAtlasData();
  } catch (error) {
    for (const id of ["monthly-material-weights", "yearly-material-comparison", "overall-recycling-rate", "daily-material-weights"]) {
      const container = document.getElementById(id);
      if (container) showChartError(container, error);
    }
    try { initDisclosures(); } catch (disclosureError) { console.error(disclosureError); }
    return;
  }
  try { initFreshness(data); } catch (error) { console.warn("Freshness display unavailable:", error); }

  // update header year based on recorded data
  const latestYear = Math.max(
    ...data.collections.map(row => Number(row.date.slice(0, 4)))
    );
  document.getElementById("latest-year").textContent = latestYear;

  const charts = [];


  // Disclosure controls do not depend on any chart successfully rendering.
  try {
    initDisclosures();
  } catch (error) {
    console.error("Could not initialise disclosure controls:", error);
  }

  // Raw-record charts can still work if the monthly aggregate is invalid.
  startChart(charts, "overall-recycling-rate", container =>
    createOverallRecyclingRateChart({container, rows: data.collections}));
  startChart(charts, "daily-material-weights", container =>
    createDailyMaterialWeightsChart({container, rows: data.collections}));

  // Validate shared monthly data once, then initialise its two consumers separately.
  let monthlyDataValid = false;
  try {
    validateWasteData(data.monthly, data.detail);
    monthlyDataValid = true;
  } catch (error) {
    showChartError(document.getElementById("monthly-material-weights"), error);
    showChartError(document.getElementById("yearly-material-comparison"), error);
  }
  if (monthlyDataValid) {
    startChart(charts, "monthly-material-weights", container =>
      createMonthlyMaterialWeightsChart({container, data: data.monthly, detail: data.detail}));
    startChart(charts, "yearly-material-comparison", container =>
      createYearlyMaterialComparisonChart({container, data: data.monthly, detail: data.detail,
        comparison: data.comparison}));
  }
  atlasCharts = charts;
}
window.addEventListener("load", initAtlas);
