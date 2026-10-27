import { showTooltip, hideTooltip } from "../chart-tooltip.js";
import { renderTableRows } from "../chart-table.js";
import { formatPercent } from "../chart-format.js";
import { materialIdFromSource } from "../materials.js";
import { setupChart } from "../chart-setup.js";
import { setDisclosureContent } from "../chart-disclosure-content.js";
import { bindChartEvent, formatWeight } from "../shared.js";

function createOverallRecyclingRateChart({container, rows, root = document}) {
  const listeners = [];
  const on = (target, event, handler) => bindChartEvent(listeners, target, event, handler);

  const table = root.querySelector("#recycling-table tbody");
  setDisclosureContent({root, methodId: "recycling-method", tableId: "recycling-table",
    methodology: "Recycling rate is the share of all recorded weight collected for recycling, including food recycling, soft plastics and batteries. General waste counts towards the total but not the recycled amount. Figures use collection dates, with no estimates. Rolling periods are measured back from today; calendar years may be incomplete.",
    columns: ["Category", "Weight (kg)", "Share"]});
  const tip = container.closest(".chart-content").querySelector(".chart-tooltip");
  const years = [...new Set(rows.map(d => d.date.slice(0, 4)))].sort();
  const state={period:"all"};
  const controls=setupChart({root,id:"overall-recycling-rate",number:"03",title:"Recycling rate",unit:"% by weight",state,
    controls:[{key:"period",type:"select",label:"Period",id:"recycling-year",options:[
      {value:"all",label:"All data"},{value:"last-6",label:"Last 6 months"},{value:"last-12",label:"Last 12 months"},
      ...years.map(year=>({value:year,label:year}))]}],onChange:()=>render()});
  const number = d3.format(".2f");
  // Compute rolling windows in the browser, not in the generated data file.
  // Local calendar dates avoid UTC/time-zone shifts around midnight.
  function localISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }
  function monthsAgo(today, count) {
    const year = today.getFullYear();
    const monthIndex = today.getMonth() - count;
    const first = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(today.getDate(), lastDay));
  }
  function render() {
    const chosen = state.period;
    const today = new Date();
    const todayISO = localISO(today);
    const rollingMonths = chosen === "last-6" ? 6 : chosen === "last-12" ? 12 : null;
    const startISO = rollingMonths ? localISO(monthsAgo(today, rollingMonths)) : null;
    const subset = rollingMonths
      ? rows.filter(d => d.date >= startISO && d.date <= todayISO)
      : chosen === "all" ? rows : rows.filter(d => d.date.startsWith(chosen));
    const general = d3.sum(subset.filter(d => materialIdFromSource(d.type) === "residualWaste"), d => d.kg);
    const total = d3.sum(subset, d => d.kg);
    const recycled = total - general;
    const rate = total ? 100 * recycled / total : 0;
    const width = 260, height = 250, cx = width / 2, cy = height / 2;
    const svg = d3.create("svg").attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", `Recycling rate ${rate.toFixed(1)} percent; ${number(recycled)} kilograms recycled and ${number(general)} kilograms general waste`);
    const pie = d3.pie().sort(null).value(d => d.value);
    const arc = d3.arc().innerRadius(70).outerRadius(108);
    const pieces = pie([{name:"Recycled",value:recycled},{name:"General waste",value:general}]);
    svg.append("g").attr("transform", `translate(${cx},${cy})`)
      .selectAll("path").data(pieces).join("path")
      .attr("class", (_, i) => i === 0 ? "arc-recycled" : "arc-general")
      .attr("d", arc)
      .each(function(d){
        this.addEventListener("pointermove",event=>{
          showTooltip(tip, `<strong>${d.data.name}</strong><table class="tip-table"><thead><tr><th>Category</th><th>kg</th><th>%</th></tr></thead><tbody><tr><td>${d.data.name}</td><td>${number(d.data.value)}</td><td>${total?(100*d.data.value/total).toFixed(1):"0.0"}%</td></tr></tbody></table>`);
          // Switch at the doughnut centreline, not only when space runs out.
          const bounds=container.getBoundingClientRect();
          const mouseX=event.clientX-bounds.left;
          const width=tip.offsetWidth;
          const height=tip.offsetHeight;
          const gap=12;
          const x=mouseX<bounds.width/2 ? mouseX+gap : mouseX-gap-width;
          tip.style.left=Math.max(3,Math.min(x,Math.max(3,bounds.width-width-3)))+"px";
          const y=event.clientY-bounds.top-height-8;
          tip.style.top=Math.max(0,Math.min(y,Math.max(0,bounds.height-height)))+"px";
        });
        this.addEventListener("pointerleave",()=>{hideTooltip(tip);});
      });
    svg.append("text").attr("class", "rate-value").attr("x", cx).attr("y", cy + 3)
      .attr("text-anchor", "middle").text(total ? `${rate.toFixed(1)}%` : "—");
    svg.append("text").attr("class", "rate-caption").attr("x", cx).attr("y", cy + 23)
      .attr("text-anchor", "middle").text("recycled");
    container.replaceChildren(svg.node());
    hideTooltip(tip);
    const entries = [["Recycled",recycled,rate],["General waste",general,100-rate],["Total",total,100]];
    renderTableRows(table, entries.map(([label,kg,share]) =>
      [label,number(kg),formatPercent(share)]),
      ["Category", {label:"Weight (kg)", numeric:false}, "Share"], {root});
  }
  // Refresh if the tab remains open across a local date change.
  on(document,"visibilitychange", () => {
    if (!document.hidden && state.period.startsWith("last-")) render();
  });
  return {render,destroy(){listeners.forEach(remove=>remove());controls.destroy();hideTooltip(tip);}};
}


/* Figure 04 — continuous, recorded-date calendar heatmap. */

export { createOverallRecyclingRateChart };
