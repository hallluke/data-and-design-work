import { bindChartEvent, positionChartTooltip, formatWeight } from "../shared.js";

function createRecyclingRateChart({container, rows, root = document}) {
  const listeners = [];
  const on = (target, event, handler) => bindChartEvent(listeners, target, event, handler);
  const selector = root.getElementById("recycling-year");
  const table = root.querySelector("#recycling-table tbody");
  const tip = root.getElementById("recycling-tip");
  const years = [...new Set(rows.map(d => d.date.slice(0, 4)))].sort();
  for (const year of years) {
    const option = root.createElement("option");
    option.value = year;
    option.textContent = year;
    selector.append(option);
  }
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
    const chosen = selector.value;
    const today = new Date();
    const todayISO = localISO(today);
    const rollingMonths = chosen === "last-6" ? 6 : chosen === "last-12" ? 12 : null;
    const startISO = rollingMonths ? localISO(monthsAgo(today, rollingMonths)) : null;
    const subset = rollingMonths
      ? rows.filter(d => d.date >= startISO && d.date <= todayISO)
      : chosen === "all" ? rows : rows.filter(d => d.date.startsWith(chosen));
    const general = d3.sum(subset.filter(d => ["waste", "residual waste", "general waste"].includes(d.type.toLowerCase())), d => d.kg);
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
          tip.innerHTML=`<strong>${d.data.name}</strong><table class="tip-table"><thead><tr><th>Category</th><th>kg</th><th>%</th></tr></thead><tbody><tr><td>${d.data.name}</td><td>${number(d.data.value)}</td><td>${total?(100*d.data.value/total).toFixed(1):"0.0"}%</td></tr></tbody></table>`;
          tip.hidden=false;
          positionChartTooltip(tip,event,container);
        });
        this.addEventListener("pointerleave",()=>{tip.hidden=true;});
      });
    svg.append("text").attr("class", "rate-value").attr("x", cx).attr("y", cy + 3)
      .attr("text-anchor", "middle").text(total ? `${rate.toFixed(1)}%` : "—");
    svg.append("text").attr("class", "rate-caption").attr("x", cx).attr("y", cy + 23)
      .attr("text-anchor", "middle").text("recycled");
    container.replaceChildren(svg.node(),tip);
    tip.hidden=true;
    const entries = [["Recycled",recycled,rate],["General waste",general,100-rate],["Total",total,100]];
    table.replaceChildren(...entries.map(([label,kg,share]) => {
      const tr = root.createElement("tr");
      for (const value of [label,number(kg),share.toFixed(1)+"%"]){
        const td = root.createElement("td"); td.textContent = value; tr.append(td);
      }
      return tr;
    }));
  }
  on(selector,"change",render);
  // Refresh if the tab remains open across a local date change.
  on(document,"visibilitychange", () => {
    if (!document.hidden && selector.value.startsWith("last-")) render();
  });
  return {render,destroy(){listeners.forEach(remove=>remove());tip.hidden=true;}};
}


/* Figure 04 — continuous, recorded-date calendar heatmap. */

export { createRecyclingRateChart };
