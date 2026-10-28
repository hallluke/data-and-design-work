import { installTouchDismissal, isTouchPointer } from "../chart-interaction.js";
import { nearestSlope } from "../slope-proximity.js";
import { showTooltip, hideTooltip } from "../chart-tooltip.js";
import { renderTableRows } from "../chart-table.js";
import { formatNumber, formatSignedNumber, formatPercent } from "../chart-format.js";
import { normalizeMonthlyGroups, groupLabels, individualMaterialLabels, materialLabel } from "../materials.js";
import { setupChart } from "../chart-setup.js";
import { setDisclosureContent } from "../chart-disclosure-content.js";
import { showChartError, clearChartStatus, formatWeight, formatMonth, monthInitial, positionChartTooltip, atlasPalette, bindChartEvent, MULTI_COLUMN_MEDIA } from "../shared.js";

function createYearlyMaterialComparisonChart({ container, data, detail, comparison, root = document }) {
  data = normalizeMonthlyGroups(data);
  const tip = container.closest(".chart-content").querySelector(".chart-tooltip");
  let clearSelection = () => {};
  const removeTouchDismissal = installTouchDismissal(container, tip, {clear: () => clearSelection()});
  const table = root.getElementById("comparison-table");


  const period = container.closest("article").querySelector(".unit");
  const state = { basis: "imputed", categories: "main" };
  const materials = individualMaterialLabels();
  const dry = groupLabels("mixedRecycling");
  const controls=setupChart({root,id:"yearly-material-comparison",number:"02",title:"A year apart",unit:"",state,
    controls:[
      {key:"basis",type:"buttons",label:"Measurement",options:[{value:"imputed",label:"Imputed"},{value:"recorded",label:"Recorded"}],
        disabled:(value,s)=>value==="recorded" && s.categories==="residual"},
      {key:"categories",type:"select",label:"Categories",id:"comparison-categories",options:[
        {value:"main",label:"Main categories"},{value:"dry",label:materialLabel("mixedRecycling")},
        {value:"all",label:"All materials"},{value:"residual",label:"Residual waste estimate"}]}
    ],onChange:(key,value)=>{if(key==="categories" && value==="residual")state.basis="imputed";rerender();}});
  const projection = comparison.projectedAdditionalKg;
  const cutoff = comparison.metadata.comparisonCompleteThrough;
  const [endYear, endMonth] = cutoff.split("-").map(Number);
  const years = [endYear - 1, endYear];
  let observer;
  const listeners = [];
  const fmt = formatNumber;
  const sign = formatSignedNumber;
  const labelMonth = new Date(Date.UTC(2000, endMonth - 1, 1)).toLocaleDateString("en-GB", {month:"short", timeZone:"UTC"});
  const selected = () => state.categories === "residual" ? ["Residual waste"] : state.categories === "main" ? data.groups : state.categories === "dry" ? dry :
    materials.filter(material => state.basis === "recorded" || material !== "Batteries");

  // Group totals come from the same monthly records used in Figure 01.
  // Residual's 2026 imputed total includes the known portion of August;
  // only the 45 unobserved days receive an additional projection.
  function sumRows(rows, group, year) {
    return rows.reduce((sum, row) => sum + (row.group === group &&
      row.month >= year + "-01" && row.month <= year + "-" + String(endMonth).padStart(2, "0") ? row.kg : 0), 0);
  }
  function rowsForBasis() {
    const base = data[state.basis];
    const detailed = detail[state.basis].map(row => ({ ...row, group: row.type }));
    return { base, detailed };
  }
  function values() {
    const {base, detailed} = rowsForBasis();
    return selected().map(name => {
      const rows = dry.includes(name) ? detailed : base;
      const earlier = sumRows(rows, name, years[0]);
      const observed = sumRows(rows, name, years[1]);
      const projected = state.basis === "imputed" && name === "Residual waste";
      const current = observed + (projected ? projection.central : 0);
      return {name, earlier, current, observed, projected,
        low: observed + (projected ? projection.low : 0),
        high: observed + (projected ? projection.high : 0)};
    });
  }
  function tooltipHTML(row) {
    const change = row.current - row.earlier;
    const pct = value => row.earlier ? (value / row.earlier * 100).toFixed(1) + "%" : "n/a";
    const range = (low,high,unit,formatter=fmt) =>
      `<span class="tip-range">(${formatter(low)}–${formatter(high)}${unit})</span>`;
    const currentRange = row.projected ? range(row.low,row.high," kg") : "";
    const diffRange = row.projected ? range(row.low-row.earlier,row.high-row.earlier," kg",sign) : "";
    const pctRange = row.projected ? range(row.low-row.earlier,row.high-row.earlier,"",pct) : "";
    return `<strong>${row.name}</strong><table class="tip-table"><tbody>` +
      `<tr><td>${years[0]}</td><td>${fmt(row.earlier)} kg</td></tr>` +
      `<tr><td>${years[1]}</td><td>${fmt(row.current)} kg ${currentRange}</td></tr>` +
      `<tr><td>Difference</td><td>${sign(change)} kg ${diffRange}</td></tr>` +
      `<tr><td>Change</td><td>${pct(change)} ${pctRange}</td></tr>` +
      `</tbody></table>`;
  }
  function renderTable(rows) {
    const body = table.tBodies[0];
    const columns = ["Category", years[0] + " kg", years[1] + " kg", "Δ kg", "Δ %", "Status"]
      .map((label, i) => ({label, numeric: i >= 1 && i <= 4}));
    setDisclosureContent({root, methodId: "comparison-method", tableId: "comparison-table", columns});
    const tableRows = rows.map(row => {
      const diff = row.current - row.earlier;
      return [row.name, fmt(row.earlier), fmt(row.current), sign(diff),
        row.earlier ? formatPercent(diff / row.earlier * 100) : "n/a",
        row.projected ? "Projected (" + fmt(row.low) + "–" + fmt(row.high) + " kg)" :
        state.basis === "recorded" ? "Recorded" : "Complete"];
    });
    renderTableRows(body, tableRows, columns, {root});
  }

  function render() {
    const rows = values();
    // Align the plot baselines using actual chart positions, without changing control layout.
    const width = Math.max(255, Math.round(container.clientWidth));
    const monthlyChart = root.getElementById("monthly-material-weights");
    const isWide = window.matchMedia(MULTI_COLUMN_MEDIA).matches;
    const controlOffset = isWide && monthlyChart
      ? Math.round(monthlyChart.getBoundingClientRect().top - container.getBoundingClientRect().top) : 0;
    const height = Math.max(250, 250 + controlOffset);
    const top = 21, bottom = 43, left = 30, right = 9;
    const residualOnly = state.categories === "residual";
    const extrema = rows.flatMap(d => [d.earlier, d.current, d.low, d.high]);
    const rawMin = Math.min(...extrema), rawMax = Math.max(...extrema);
    const spread = Math.max(.2, rawMax - rawMin);
    const yDomain = [0, Math.max(1, residualOnly ? rawMax + spread*.23 : rawMax*1.12)];
    const yScale = d3.scaleLinear().domain(yDomain).range([height-bottom,top]);
    // Plot owns the scale. Reserve the right-hand third for direct labels.
    // Year labels sit below the endpoints; horizontal rules stop at those endpoints.
    const xDomain = [years[0]-.35, years[1]+.75];
    const labelX = years[1]+.095;
    const labelGap = 13.5;
    // Start labels at their real 2026 heights. Resolve collisions only where
    // necessary, then keep the stack within the available plotting height.
    const ordered = rows.slice().sort((a,b)=>yScale(a.current)-yScale(b.current));
    const desired = ordered.map(row => yScale(row.current));
    const positions = desired.slice();
    for (let i=1; i<positions.length; i++)
      positions[i] = Math.max(positions[i],positions[i-1]+labelGap);
    const limit = height-bottom-3;
    if (positions.at(-1)>limit) {
      positions[positions.length-1]=limit;
      for (let i=positions.length-2; i>=0; i--)
        positions[i]=Math.min(positions[i],positions[i+1]-labelGap);
    }
    if (positions[0]<top+3) {
      positions[0]=top+3;
      for (let i=1; i<positions.length; i++)
        positions[i]=Math.max(positions[i],positions[i-1]+labelGap);
    }
    // Shift labels toward their own endpoints whenever a gap permits it.
    for (let i=positions.length-2; i>=0; i--)
      positions[i]=Math.min(positions[i+1]-labelGap,Math.max(desired[i],positions[i]));
    const labelY = new Map(ordered.map((row,i)=>[row.name,positions[i]]));
    const labelKg = name => yScale.invert(labelY.get(name));
    const marks = [];
    const fan = rows.filter(row=>row.projected).flatMap(row=>[
      {year:years[0],lo:row.earlier,hi:row.earlier},
      {year:years[1],lo:row.low,hi:row.high}
    ]);
    if (fan.length) marks.push(Plot.areaY(fan, {x:"year",y1:"lo",y2:"hi",fill:"#888",fillOpacity:.24}));
    // Every line, endpoint, leader and label is an Observable Plot mark.
    // Separate line marks make it possible to highlight the active series.
    rows.forEach((row,i)=>{
      const series=[{year:years[0],kg:row.earlier},{year:years[1],kg:row.current}];
      marks.push(Plot.line(series,{x:"year",y:"kg",stroke:"#5c5b59",strokeWidth:2.2,
        strokeDasharray:row.projected?"5 3":undefined,className:`compare-series compare-series-${i}`}));
      marks.push(Plot.dot(series,{x:"year",y:"kg",r:2.8,fill:"#4b4b4b",className:`compare-series compare-series-${i}`}));
      marks.push(Plot.link([{x1:years[1],y1:row.current,x2:labelX-.025,y2:labelKg(row.name)}],{
        x1:"x1",y1:"y1",x2:"x2",y2:"y2",stroke:"#999",strokeWidth:.75,
        className:`compare-series compare-series-${i}`}));
      marks.push(Plot.text([{x:labelX,y:labelKg(row.name),name:row.name}],{
        x:"x",y:"y",text:"name",textAnchor:"start",fontSize:12,fill:"#454545",
        className:`compare-series compare-series-${i}`}));
    });
    // Explicit Plot rules limit horizontal guides to the two year positions,
    // unlike a full-width axis grid. Tick labels remain readable in kg.
    const tickValues = d3.ticks(yDomain[0],yDomain[1],4);
    const guides = tickValues.map(kg=>({kg,x1:years[0],x2:years[1]}));
    marks.unshift(Plot.ruleY(guides,{y:"kg",x1:"x1",x2:"x2",stroke:"#c8c5bf",strokeOpacity:.65}));
    marks.push(Plot.text(guides,{x:years[0],y:"kg",text:d=>Number(d.kg.toFixed(1)).toString(),
      textAnchor:"end",dx:-7,fontSize:10,fill:"#66645f"}));
    marks.push(Plot.axisX({anchor:"bottom",ticks:years,tickFormat:String,
      tickSize:0,tickPadding:8,label:null}));
    const svg = Plot.plot({width,height,marginLeft:left,marginRight:right,marginTop:top,marginBottom:bottom,
      style:{background:"transparent",fontFamily:"Source Sans 3, Arial, sans-serif",fontSize:"10px",color:"#66645f"},
      x:{domain:xDomain,axis:null,label:null},
      y:{domain:yDomain,axis:null,grid:false,ticks:4,label:null,tickSize:0},
      marks});
    svg.setAttribute("role","group");
    svg.setAttribute("aria-label","Year-on-year " + state.basis + " waste by " + state.categories +
      " categories, January through " + labelMonth + ". Values in the expandable table.");
    // Mouse and touch use the same chart-level proximity calculation. Keyboard
    // focuses the actual Plot line paths, in descending current-year order.
    const svgRoot = svg.tagName.toLowerCase() === "svg" ? svg : svg.querySelector("svg");
    const xAt = year => left + (width-left-right)*(year-xDomain[0])/(xDomain[1]-xDomain[0]);
    const x0 = xAt(years[0]), x1 = xAt(years[1]);
    const segments = rows.map(row => ({y0:yScale(row.earlier),y1:yScale(row.current)}));
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
    overlay.classList.add("comparison-selection-overlay");
    overlay.setAttribute("pointer-events", "none");
    overlay.style.pointerEvents = "none";
    const selectionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    selectionPath.classList.add("comparison-selection-path");
    selectionPath.setAttribute("fill", "none");
    const selectionDots = [0,1].map(() => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "5");
      dot.setAttribute("fill", "#202020");
      dot.setAttribute("stroke", "#fff");
      dot.setAttribute("stroke-width", "1.5");
      return dot;
    });
    overlay.append(selectionPath,...selectionDots);
    svgRoot.append(overlay);
    const lines = rows.map((row,i) => {
      const mark = svgRoot.querySelector(`.compare-series-${i} path`);
      if (!mark) throw Error(`Comparison slope ${i} not found`);
      mark.setAttribute("tabindex", "0");
      mark.setAttribute("role", "button");
      mark.setAttribute("aria-label", `${row.name}: ${fmt(row.earlier)} kg in ${years[0]}, ${fmt(row.current)} kg in ${years[1]}`);
      mark.classList.add("comparison-focus-line");
      return mark;
    });
    // Keep the established descending 2026 keyboard order without introducing
    // invisible focusable marks. DOM order, not CSS 'order', controls SVG Tab.
    const tabOrder = [...rows.keys()].sort((a,b) => rows[b].current - rows[a].current);
    // Reorder the Plot line mark groups themselves: SVG does not support
    // CSS flex order, and moving paths within their own groups has no effect.
    tabOrder.forEach(i => {
      const group = lines[i].closest(`.compare-series-${i}`);
      if (group && group !== lines[i] && group.parentNode === svgRoot) svgRoot.append(group);
    });
    // Keep the non-interactive indicator above all Plot marks.
    svgRoot.append(overlay);
    // Plot's decorative marks cannot intercept pointer input. The SVG itself
    // receives mouse/touch movement; focused lines still accept keyboard focus.
    svgRoot.querySelectorAll(".compare-series").forEach(mark => { mark.style.pointerEvents = "none"; });
    let active = null;
    let inputMode = null;
    let touchStart = null;
    let ignoreMouseUntil = 0;
    const renderSelection = () => {
      svgRoot.querySelectorAll(".compare-series").forEach(el => {
        const selected = active !== null && el.classList.contains(`compare-series-${active}`);
        el.style.opacity = active === null ? "" : selected ? "1" : ".22";
        el.style.stroke = selected && el.tagName.toLowerCase() === "path" ? "#171717" : "";
      });
      // Use the same visible slope styling for keyboard focus and mouse hover.
      // The touch-only overlay remains independent of that common highlight.
      lines.forEach((line,i) => {
        line.style.stroke = active === i ? "#171717" : "";
      });
      // Only this renderer may show/hide the overlay. It is never an input target.
      overlay.hidden = active === null || inputMode !== "touch";
      overlay.style.display = overlay.hidden ? "none" : "";
      if (overlay.hidden) return;
      const row = rows[active];
      selectionPath.setAttribute("d", `M${x0},${yScale(row.earlier)} L${x1},${yScale(row.current)}`);
      selectionPath.setAttribute("stroke-dasharray", row.projected ? "5 3" : "none");
      [[x0,yScale(row.earlier)],[x1,yScale(row.current)]].forEach(([x,y],i) => {
        selectionDots[i].setAttribute("cx", String(x));
        selectionDots[i].setAttribute("cy", String(y));
      });
    };
    const clear = () => {
      if (active === null) return;
      active = null;
      inputMode = null;
      renderSelection();
      hideTooltip(tip);
    };
    clearSelection = clear;
    const select = (index, mode) => {
      if (index === null) { clear(); return; }
      // A touch may generate focus and compatibility mouse events. Those are
      // not new selections and must never change the touch overlay.
      if (mode !== "touch" && inputMode === "touch") return;
      active = index;
      inputMode = mode;
      renderSelection();
      showTooltip(tip, tooltipHTML(rows[index]));
      const box = svg.getBoundingClientRect();
      const yearFraction = (years[1]-xDomain[0])/(xDomain[1]-xDomain[0]);
      const x = box.left+left+(box.width-left-right)*yearFraction+8;
      const maxX = Math.max(6,window.innerWidth-tip.offsetWidth-6);
      tip.style.left = Math.max(6,Math.min(x,maxX))+"px";
      const anchorY = box.top+yScale(rows[index].current)*(box.height/height);
      const desiredTop = anchorY-tip.offsetHeight/2;
      const chartTop = Math.max(6,box.top);
      const chartBottom = Math.min(window.innerHeight-6,box.bottom);
      const minTop = Math.min(chartTop,chartBottom-tip.offsetHeight);
      tip.style.top = Math.max(6,Math.min(Math.max(minTop,desiredTop),chartBottom-tip.offsetHeight))+"px";
    };
    const nearest = (event, tolerance) => {
      const bounds = svgRoot.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      const px = (event.clientX-bounds.left)*width/bounds.width;
      const py = (event.clientY-bounds.top)*height/bounds.height;
      // Convert the CSS-pixel tolerance into the SVG's vertical coordinate.
      const result = nearestSlope(segments,px,py,x0,x1,tolerance*height/bounds.height,active);
      return result?.index ?? null;
    };
    lines.forEach((line,i) => {
      line.addEventListener("focus", () => {
        if (touchStart || Date.now() < ignoreMouseUntil || inputMode === "touch") return;
        select(i,"keyboard");
      });
      line.addEventListener("blur", () => {
        if (inputMode === "keyboard" && active === i) clear();
      });
    });
    svgRoot.addEventListener("pointerdown", event => {
      if (!isTouchPointer(event)) return;
      touchStart = {x:event.clientX,y:event.clientY,id:event.pointerId,moved:false};
      ignoreMouseUntil = Date.now()+900;
    },true);
    svgRoot.addEventListener("pointermove", event => {
      if (isTouchPointer(event)) {
        if (touchStart && event.pointerId === touchStart.id &&
            Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>7) touchStart.moved = true;
        return;
      }
      if (Date.now()<ignoreMouseUntil || inputMode === "touch") return;
      select(nearest(event,10),"mouse");
    });
    svgRoot.addEventListener("pointerup", event => {
      if (!isTouchPointer(event)) return;
      ignoreMouseUntil = Date.now()+900;
      const tap = touchStart && touchStart.id === event.pointerId && !touchStart.moved &&
        Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)<=7;
      touchStart = null;
      if (!tap) { clear(); return; }
      select(nearest(event,16),"touch");
    },true);
    svgRoot.addEventListener("pointercancel", () => { touchStart=null; clear(); },true);
    svgRoot.addEventListener("pointerleave", event => {
      if (!isTouchPointer(event) && inputMode === "mouse") clear();
    });
    svgRoot.addEventListener("keydown", event => {
      if (event.key === "Escape") clear();
      if (event.key === "Tab" && inputMode === "touch") clear();
    },true);
    container.querySelector("svg")?.remove();container.prepend(svg);
    container.style.minHeight=height+"px";
    // Reuse the shared disabled-button styling and force a meaningful mode.

    period.textContent="Jan—"+labelMonth;
    setDisclosureContent({root, methodId: "comparison-method", tableId: "comparison-table",
      methodology: {html: "Both years cover January through Sept. The cut-off is the latest fully covered month for regularly collected materials (excluding residual waste and batteries). Imputed weights are distributed across collection intervals as in Figure 01. For residual waste, the days after the last recorded weight are extrapolated using the pooled historical daily rate from the recording intervals. The low/high range uses the minimum and maximum observed interval rates. This is a sensitivity range, <strong>not</strong> a calibrated prediction interval or probability statement. Recorded mode sums weights by collection date without projection; batteries appear there only."}});
    renderTable(rows);
    controls.sync();
  }
  function rerender() {
    try { if(!window.Plot || !window.d3) throw Error("D3 or Observable Plot did not load.");
      render();clearChartStatus(container);
    } catch(error) {showChartError(container,error);}
  }
  if("ResizeObserver" in window) {observer=new ResizeObserver(()=>{if(window.Plot)rerender();});observer.observe(container);}
  return {render:rerender,destroy(){removeTouchDismissal();observer?.disconnect();listeners.forEach(remove=>remove());controls.destroy();container.querySelector("svg")?.remove();hideTooltip(tip);}};
}

/* ============================================================
   APPLICATION INITIALISATION
   To add a chart: create a module function, then initialise it here.
   ============================================================ */

export { createYearlyMaterialComparisonChart };
