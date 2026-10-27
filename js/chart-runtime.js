"use strict";
import { showChartError } from "./shared.js";

// Start charts independently: a failure in one factory must not prevent the others.
// Chart factories retain ownership of their render and destroy implementations.
function startChart(charts, containerId, create, root = document) {
  const container = root.getElementById(containerId);
  if (!container) {
    console.error(`Missing chart container: #${containerId}`);
    return false;
  }
  try {
    const chart = create(container);
    if (!chart || typeof chart.render !== "function" || typeof chart.destroy !== "function") {
      throw new TypeError(`Invalid chart lifecycle: #${containerId}`);
    }
    chart.render();
    container.querySelector(".error")?.remove();
    charts.push(chart);
    return true;
  } catch (error) {
    showChartError(container, error);
    return false;
  }
}

export { startChart };
