import { installTouchDismissal, isTouchPointer } from "../chart-interaction.js";
import { showTooltip, hideTooltip, renderTableRows, setDisclosureContent,
  formatWeight, formatMonth, monthInitial, positionChartTooltip } from "../chart-display.js";
import { normalizeMonthlyGroups, populateMaterialSelect, groupLabels,
  materialLabel, materialIdFromLabel } from "../materials.js";
import { setupChart, showChartError, clearChartStatus } from "../chart-core.js";
import { ATLAS_COLOURS, atlasPalette } from "../chart-style.js";

// Keep legend contents independent of the DOM so every control combination is testable.
export function monthlyLegendItems({basis, stacked, chartGroups, material}, greys, dryGreys) {
  if (stacked) return chartGroups.slice().reverse().map(group => [group,
    material === "mixedRecycling" ? dryGreys[chartGroups.indexOf(group)] : greys[group]]);
  if (basis === "imputed") return [["Complete", ATLAS_COLOURS.dark], ["Provisional", ATLAS_COLOURS.light]];
  // A single recorded total is already identified by its selected control.
  return [];
}

function createMonthlyMaterialWeightsChart({ container, data, detail, root = document }) {
  data = normalizeMonthlyGroups(data);
  const tip = container.closest(".chart-content").querySelector(".chart-tooltip");
  let clearSelection = () => {};
  const removeTouchDismissal = installTouchDismissal(container, tip, {clear: () => clearSelection(), preserveKeyboardFocus: true});
  const table = root.querySelector("#data-table");
  const filterLayout = root.createElement("div");
  filterLayout.className = "filter-layout";
  const controlHost = root.querySelector('[data-chart-id="monthly-material-weights"] .chart-controls');
  controlHost.before(filterLayout);
  filterLayout.append(controlHost);
  const legend = root.createElement("div");
  legend.className = "legend";
  legend.id = "chart-legend";
  filterLayout.append(legend);



  const state = { basis: "imputed", display: "total", material: "all" };
  const controls = setupChart({root,id:"monthly-material-weights",number:"01",title:"Month by month",unit:"kg / month",state,
    controls:[
      {key:"basis",type:"buttons",label:"Measurement",options:[{value:"imputed",label:"Imputed"},{value:"recorded",label:"Recorded"}]},
      {key:"display",type:"buttons",label:"Composition",options:[{value:"total",label:"Total"},{value:"stacked",label:"Stacked"}],
        disabled:(value,s)=>value==="stacked" && s.material!=="all" && s.material!=="mixedRecycling"},
      {key:"material",type:"select",label:"Material",id:"material",populate:select=>populateMaterialSelect(select,{includeBatteries:false})}
    ],onChange:(key,value)=>{
      if(key==="material" && value!=="all" && value!=="mixedRecycling") state.display="total";
      rerender();
    }});
  const subtypes = groupLabels("mixedRecycling");
  const categoryPalette = atlasPalette(data.groups.length);
  const greys = Object.fromEntries(data.groups.map((name,i)=>[name,categoryPalette[i]]));
  const dryGreys = atlasPalette(subtypes.length);
  const completeThrough = data.metadata.completeThrough;
  let observer;

  const isStacked = () => state.display === "stacked" &&
    (state.material === "all" || (state.material === "mixedRecycling"));
  const isComplete = month => month <= completeThrough;
  const selectedGroups = () => state.material === "all" ? data.groups : [materialLabel(state.material)];

  function getRows() {
    if (subtypes.some(label => materialIdFromLabel(label) === state.material)) {
      return detail[state.basis].filter(d => d.type === materialLabel(state.material))
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
      const rows = (state.material === "mixedRecycling"
        ? detail[state.basis].map(d => ({ ...d, group: d.type })) : getRows())
        .filter(row => row.month === datum.month);
      const total = rows.reduce((sum, row) => sum + row.kg, 0);
      const categories = (state.material === "mixedRecycling" ? subtypes : data.groups).slice().reverse();
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
      const material = state.material === "all" ? "All materials" : materialLabel(state.material);
      content += '<table class="tip-table"><thead><tr><th>Material</th><th>kg</th></tr></thead>' +
        "<tbody><tr><td>" + material + "</td><td>" + formatWeight(datum.kg) + "</td></tr></tbody></table>";
    }
    if (state.basis === "imputed" && !datum.complete) content += "<br>Provisional estimate";
    return content;
  }

  function showTip(event, datum) {
    showTooltip(tip, tooltipHTML(datum));
    positionChartTooltip(tip, event, container);
  }

  function renderTable(totals, chartRows, chartGroups) {
    const stacked = isStacked();
    const tbody = table.tBodies[0];
    const headings = stacked ? ["Month", ...chartGroups, "Total (kg)"] : ["Month", "Weight (kg)", "Status"];
    const columns = headings.map((label, i) => ({label, numeric: i > 0 && (stacked || i === 1)}));
    setDisclosureContent({root, methodId: "method", tableId: "data-table", columns});
    const rows = totals.map(datum => stacked
      ? [formatMonth(datum.month), ...chartGroups.map(group =>
          formatWeight(chartRows.find(d => d.month === datum.month && d.group === group)?.kg || 0)), formatWeight(datum.kg)]
      : [formatMonth(datum.month), formatWeight(datum.kg), state.basis === "recorded" ? "Recorded" :
          datum.complete ? "Complete" : "Provisional"]);
    renderTableRows(tbody, rows, columns, {root});
  }

  function renderLegend(chartGroups) {
    legend.replaceChildren();
    const items = monthlyLegendItems({basis: state.basis, stacked: isStacked(),
      chartGroups, material: state.material}, greys, dryGreys);
    for (const [name, color] of items) {
      const item = document.createElement("span");
      const swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = color;
      item.append(swatch, document.createTextNode(name));
      legend.append(item);
    }
  }

  function updateControls() { controls.sync(); }

  function render() {
    const rows = getRows();
    const totals = getTotals(rows);
    const chartGroups = state.material === "mixedRecycling" ? subtypes : data.groups;
    const chartRows = state.material === "mixedRecycling"
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
        range: chartGroups.map((group, i) => state.material === "mixedRecycling" ? dryGreys[i] : greys[group]),
        legend: false },
      marks
    });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Monthly " + state.basis + " household waste in kilograms, " +
      (isStacked() ? "stacked by material" : "total bars") + ". Values in the expandable data table.");

    // Preserve the existing pointer/keyboard overlay geometry (v7 behaviour).
    const ns = "http://www.w3.org/2000/svg";
    const xScale = svg.scale("x");
    const band = xScale?.bandwidth ?? (width - 45) / data.months.length;
    const bandCenter = i => xScale ? xScale.apply(data.months[i]) + band / 2 : 35 + band * (i + .5);
    container.querySelector("svg")?.remove();
    container.prepend(svg);
    const overlay = document.createElementNS(ns, "g");
    const highlight = document.createElementNS(ns, "rect");
    highlight.classList.add("bar-selection");
    highlight.setAttribute("fill", "none");
    highlight.setAttribute("pointer-events", "none");
    highlight.setAttribute("visibility", "hidden");
    overlay.append(highlight);
    const yScale = svg.scale("y");
    const selectBar = (index, datum) => {
      const y = yScale.apply(datum.kg), base = yScale.apply(0);
      highlight.setAttribute("x", String(bandCenter(index) - band / 2 + 1.5));
      highlight.setAttribute("y", String(Math.min(y, base)));
      highlight.setAttribute("width", String(Math.max(1, band - 3)));
      highlight.setAttribute("height", String(Math.max(1, Math.abs(base - y))));
      highlight.setAttribute("visibility", "visible");
    };
    clearSelection = () => highlight.setAttribute("visibility", "hidden");
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
      // Mouse tracking is handled by the plot-wide listener, including gaps.
      rect.addEventListener("pointerdown", event => { if (event.pointerType === "mouse") event.preventDefault(); });
      rect.addEventListener("pointerup", event => { if (isTouchPointer(event)) { selectBar(i, datum); showTip(event, datum); } });

      rect.addEventListener("focus", () => {
        selectBar(i, datum);
        const bounds = rect.getBoundingClientRect();
        showTip({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + 30 }, datum);
      });
      rect.addEventListener("blur", () => { hideTooltip(tip); clearSelection(); });
      overlay.append(rect);
    });
    svg.append(overlay);
    // Follow the pointer through the gaps as well as over the bar hit targets.
    // Only change the tooltip contents when the nearest month changes.
    let hoveredMonth = -1;
    svg.addEventListener("pointermove", event => {
      if (isTouchPointer(event)) return;
      const box = svg.getBoundingClientRect();
      const x = (event.clientX - box.left) * width / box.width;
      let nearest = 0;
      for (let i = 1; i < totals.length; i++) {
        if (Math.abs(x - bandCenter(i)) < Math.abs(x - bandCenter(nearest))) nearest = i;
      }
      if (nearest !== hoveredMonth || tip.hidden) {
        hoveredMonth = nearest;
        showTooltip(tip, tooltipHTML(totals[nearest]));
      }
      positionChartTooltip(tip, event, container);
    });
    svg.addEventListener("pointerleave", event => { if (!isTouchPointer(event)) { hoveredMonth = -1; hideTooltip(tip); } });

    renderTable(totals, chartRows, chartGroups);
    renderLegend(chartGroups);
    updateControls();
    setDisclosureContent({root, methodId: "method", tableId: "data-table",
      methodology: "Recorded weights are attributed to their collection month. Imputed weights " +
      "are spread evenly over days since the previous collection of the same material " +
      "(first interval starts " + data.metadata.imputationStart + "). " +
      "Batteries are included only in recorded totals. Imputed months after " +
      formatMonth(completeThrough) + " are provisional because not all streams have subsequent collections."});
  }

  function rerender() {
    try {
      if (!window.Plot) throw Error("Observable Plot did not load. Connect to the internet and refresh.");
      render();
      clearChartStatus(container);
    } catch (error) { showChartError(container, error); }
  }

  if ("ResizeObserver" in window) {
    observer = new ResizeObserver(() => { if (window.Plot) rerender(); });
    observer.observe(container);
  }

  return {
    render: rerender,
    destroy() {
      observer?.disconnect();
      removeTouchDismissal();
      controls.destroy();
      container.querySelector("svg")?.remove();
      hideTooltip(tip);
    }
  };
}


/* Figure 01 — monthly material weights. */

export { createMonthlyMaterialWeightsChart };
