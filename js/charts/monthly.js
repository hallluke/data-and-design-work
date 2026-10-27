import { syncButtonGroup, setControlDisabled } from "../chart-controls.js";
import { showChartError, ATLAS_COLOURS, formatWeight, formatMonth, monthInitial, positionChartTooltip, atlasPalette, bindChartEvent } from "../shared.js";

function createMonthlyWasteChart({ container, data, detail, root = document }) {
  const tip = container.querySelector(".tooltip");
  const table = root.querySelector("#data-table");
  const legend = root.querySelector("#chart-legend");
  const materialSelect = root.querySelector("#material");
  const submaterialSelect = root.querySelector("#submaterial");

  const method = root.querySelector("#method");
  const basisButtons = [...root.querySelectorAll("[data-basis]")];
  const displayButtons = [...root.querySelectorAll("[data-display]")];
  const state = { basis: "imputed", display: "total", material: "all", submaterial: "all" };
  const subtypes = ["Glass", "Cardboard", "Tin", "Plastic", "Paper"];
  const categoryPalette = atlasPalette(data.groups.length);
  const greys = Object.fromEntries(data.groups.map((name,i)=>[name,categoryPalette[i]]));
  const dryGreys = atlasPalette(subtypes.length);
  const completeThrough = data.metadata.completeThrough;
  let observer;
  const listeners = [];

  const isStacked = () => state.display === "stacked" &&
    (state.material === "all" || (state.material === "Dry recycling" && state.submaterial === "all"));
  const isComplete = month => month <= completeThrough;
  const selectedGroups = () => state.material === "all" ? data.groups : [state.material];

  function getRows() {
    if (state.material === "Dry recycling" && state.submaterial !== "all") {
      return detail[state.basis].filter(d => d.type === state.submaterial)
        .map(d => ({ ...d, group: d.type }));
    }
    return data[state.basis].filter(d => selectedGroups().includes(d.group) ||
      (state.material === "all" && state.basis === "recorded" && d.group === "Batteries"));
  }

  function getTotals(rows) {
    const sums = new Map(data.months.map(month => [month, 0]));
    for (const row of rows) sums.set(row.month, sums.get(row.month) + row.kg);
    return data.months.map(month => ({ month, kg: sums.get(month), complete: isComplete(month) }));
  }

  function tooltipHTML(datum) {
    let content = "<strong>" + formatMonth(datum.month) + "</strong>";
    if (isStacked()) {
      const rows = (state.material === "Dry recycling"
        ? detail[state.basis].map(d => ({ ...d, group: d.type })) : getRows())
        .filter(row => row.month === datum.month);
      const total = rows.reduce((sum, row) => sum + row.kg, 0);
      const categories = (state.material === "Dry recycling" ? subtypes : data.groups).slice().reverse();
      content += '<table class="tip-table"><thead><tr><th>Material</th><th>kg</th><th>%</th></tr></thead><tbody>';
      for (const group of categories) {
        const weight = rows.find(row => row.group === group)?.kg || 0;
        content += "<tr><td>" + group + "</td><td>" + formatWeight(weight) +
          "</td><td>" + (total > 0 ? (weight / total * 100).toFixed(1) : "0.0") + "%</td></tr>";
      }
      if (state.basis === "recorded" && state.material === "all") {
        const battery = rows.find(row => row.group === "Batteries")?.kg || 0;
        if (battery) content += "<tr><td>Batteries</td><td>" + formatWeight(battery) +
          "</td><td>" + (total > 0 ? (battery / total * 100).toFixed(1) : "0.0") + "%</td></tr>";
      }
      content += "</tbody><tfoot><tr><td>Total</td><td>" + formatWeight(total) +
        "</td><td>100.0%</td></tr></tfoot></table>";
    } else {
      const material = state.material === "all" ? "All materials" :
        state.material === "Dry recycling" && state.submaterial !== "all" ? state.submaterial : state.material;
      content += '<table class="tip-table"><thead><tr><th>Material</th><th>kg</th></tr></thead>' +
        "<tbody><tr><td>" + material + "</td><td>" + formatWeight(datum.kg) + "</td></tr></tbody></table>";
    }
    if (state.basis === "imputed" && !datum.complete) content += "<br>Provisional estimate";
    return content;
  }

  function showTip(event, datum) {
    tip.innerHTML = tooltipHTML(datum);
    tip.hidden = false;
    positionChartTooltip(tip, event, container);
  }

  function renderTable(totals, chartRows, chartGroups) {
    const stacked = isStacked();
    const thead = table.tHead;
    const tbody = table.tBodies[0];
    thead.replaceChildren();
    tbody.replaceChildren();
    const headings = stacked ? ["Month", ...chartGroups, "Total (kg)"] : ["Month", "Weight (kg)", "Status"];
    const headingRow = document.createElement("tr");
    headings.forEach((heading, i) => {
      const th = document.createElement("th");
      th.textContent = heading;
      if (i > 0 && !(i === headings.length - 1 && !stacked)) th.className = "numeric";
      headingRow.append(th);
    });
    thead.append(headingRow);
    for (const datum of totals) {
      const row = document.createElement("tr");
      const values = stacked
        ? [formatMonth(datum.month), ...chartGroups.map(group =>
            formatWeight(chartRows.find(d => d.month === datum.month && d.group === group)?.kg || 0)), formatWeight(datum.kg)]
        : [formatMonth(datum.month), formatWeight(datum.kg), state.basis === "recorded" ? "Recorded" :
            datum.complete ? "Complete" : "Provisional"];
      values.forEach((value, i) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (i > 0 && (stacked || i === 1)) td.className = "numeric";
        row.append(td);
      });
      tbody.append(row);
    }
  }

  function renderLegend(chartGroups) {
    legend.replaceChildren();
    const items = [];
    if (state.basis === "imputed") items.push(["Complete", ATLAS_COLOURS.dark], ["Provisional", ATLAS_COLOURS.light]);
    if (isStacked()) {
      items.length = 0;
      for (const group of chartGroups.slice().reverse()) {
        const color = state.material === "Dry recycling" ? dryGreys[chartGroups.indexOf(group)] : greys[group];
        items.push([group, color]);
      }
    }
    for (const [name, color] of items) {
      const item = document.createElement("span");
      const swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = color;
      item.append(swatch, document.createTextNode(name));
      legend.append(item);
    }
  }

  function updateControls() {
    for (const button of displayButtons) {
      setControlDisabled(button, state.material !== "all" &&
        (state.material !== "Dry recycling" || state.submaterial !== "all"));
    }
    syncButtonGroup(displayButtons, state.display, "display");
    syncButtonGroup(basisButtons, state.basis, "basis");
    submaterialSelect.disabled = state.material !== "Dry recycling";
  }

  function render() {
    const rows = getRows();
    const totals = getTotals(rows);
    const chartGroups = state.material === "Dry recycling" ? subtypes : data.groups;
    const chartRows = state.material === "Dry recycling" && state.submaterial === "all"
      ? detail[state.basis].map(d => ({ ...d, group: d.type })) : rows;
    const marks = [];

    if (isStacked()) {
      const plotRows = chartRows.filter(d => d.group !== "Batteries")
        .map(d => ({ ...d, complete: isComplete(d.month) }));
      marks.push(Plot.barY(plotRows, Plot.stackY({ x: "month", y: "kg", fill: "group",
        title: null, insetLeft: 1.5, insetRight: 1.5 })));
    } else {
      marks.push(Plot.barY(totals, { x: "month", y: "kg",
        fill: d => state.basis === "imputed" && !d.complete ? ATLAS_COLOURS.light : ATLAS_COLOURS.dark,
        insetLeft: 1.5, insetRight: 1.5 }));
    }

    const width = Math.max(360, Math.round(container.clientWidth));
    const maxY = Math.max(2, Math.max(...totals.map(d => d.kg)) * 1.045);
    // The secondary year axis shares the same band scale as the month labels.
    const januaryMonths = data.months.filter(month => month.endsWith("-01"));
    marks.push(Plot.axisX({ anchor: "bottom", ticks: januaryMonths,
      tickFormat: month => month.slice(0, 4), tickSize: 0, tickPadding: 22,
      textAnchor: "middle", label: null }));

    const svg = Plot.plot({
      width, height: 250, marginLeft: 35, marginRight: 10, marginTop: 5, marginBottom: 43,
      style: { background: "transparent", fontFamily: "Source Sans 3, Arial, Helvetica, sans-serif",
        fontSize: "10px", color: "#66645f" },
      x: { type: "band", domain: data.months, axis: "bottom", tickSize: 0,
        tickPadding: 7, tickFormat: monthInitial, label: null, padding: 0.18 },
      y: { domain: [0, maxY], grid: true, ticks: 4, label: null, tickSize: 0 },
      color: { domain: chartGroups,
        range: chartGroups.map((group, i) => state.material === "Dry recycling" ? dryGreys[i] : greys[group]),
        legend: false },
      marks
    });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Monthly " + state.basis + " household waste in kilograms, " +
      (isStacked() ? "stacked by material" : "total bars") + ". Values in the expandable data table.");

    // Preserve the existing pointer/keyboard overlay geometry (v7 behaviour).
    const ns = "http://www.w3.org/2000/svg";
    const band = (width - 45) / (data.months.length + 0.18);
    const bandCenter = i => 35 + band * (0.18 + 0.41 + i);
    container.querySelector("svg")?.remove();
    container.insertBefore(svg, tip);
    const overlay = document.createElementNS(ns, "g");
    overlay.setAttribute("aria-label", "Monthly values");
    totals.forEach((datum, i) => {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(bandCenter(i) - band / 2));
      rect.setAttribute("y", "5");
      rect.setAttribute("width", String(band));
      rect.setAttribute("height", "202");
      rect.setAttribute("fill", "transparent");
      rect.setAttribute("tabindex", "0");
      rect.setAttribute("role", "button");
      rect.setAttribute("aria-label", formatMonth(datum.month) + ": " + formatWeight(datum.kg) +
        " kilograms" + (isStacked() ? ", breakdown available in tooltip and table" : "") +
        (state.basis === "imputed" && !datum.complete ? ", provisional" : ""));
      rect.addEventListener("pointermove", event => showTip(event, datum));
      rect.addEventListener("pointerleave", () => { tip.hidden = true; });
      rect.addEventListener("focus", () => {
        const bounds = rect.getBoundingClientRect();
        showTip({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + 30 }, datum);
      });
      rect.addEventListener("blur", () => { tip.hidden = true; });
      overlay.append(rect);
    });
    svg.append(overlay);

    renderTable(totals, chartRows, chartGroups);
    renderLegend(chartGroups);
    updateControls();
    method.textContent = "Recorded weights are attributed to their collection month. Imputed weights " +
      "are spread evenly over days since the previous collection of the same material " +
      "(first interval starts " + data.metadata.imputationStart + "). " +
      "Batteries are included only in recorded totals. Imputed months after " +
      formatMonth(completeThrough) + " are provisional because not all streams have subsequent collections.";
  }

  function rerender() {
    try {
      if (!window.Plot) throw Error("Observable Plot did not load. Connect to the internet and refresh.");
      render();
      container.querySelector(".error")?.remove();
    } catch (error) { showChartError(container, error); }
  }

  const on = (target, event, handler) => bindChartEvent(listeners, target, event, handler);
  for (const button of [...basisButtons, ...displayButtons]) {
    on(button, "click", () => {
      const key = button.dataset.basis ? "basis" : "display";
      state[key] = button.dataset[key];
      rerender();
    });
  }
  on(materialSelect, "change", event => {
    state.material = event.target.value;
    if (state.material !== "all" && state.material !== "Dry recycling") state.display = "total";
    rerender();
  });
  on(submaterialSelect, "change", event => {
    state.submaterial = event.target.value;
    if (state.submaterial !== "all") state.display = "total";
    rerender();
  });
  if ("ResizeObserver" in window) {
    observer = new ResizeObserver(() => { if (window.Plot) rerender(); });
    observer.observe(container);
  }

  return {
    render: rerender,
    destroy() {
      observer?.disconnect();
      listeners.forEach(remove => remove());
      container.querySelector("svg")?.remove();
      tip.hidden = true;
    }
  };
}


/* ============================================================
   FIGURE 02 — YEAR-ON-YEAR SLOPEGRAPH
   Independent state and DOM, shared formatters and tooltip helper.
   Projection scenarios are computed upstream, not in the browser.
   ============================================================ */

export { createMonthlyWasteChart };
