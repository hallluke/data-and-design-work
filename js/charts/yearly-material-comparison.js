import { installTouchDismissal, isTouchPointer } from "../chart-interaction.js";
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
      // Invisible broad Plot stroke detects crossings anywhere along the line.
      marks.push(Plot.line(series,{x:"year",y:"kg",stroke:"transparent",strokeWidth:10,
        className:`compare-hit compare-hit-${i}`}));
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
    svg.setAttribute("role","img");
    svg.setAttribute("aria-label","Year-on-year " + state.basis + " waste by " + state.categories +
      " categories, January through " + labelMonth + ". Values in the expandable table.");
    // A dedicated SVG selection path follows the same scales as the Plot lines.
    // It is independent of Plot's mark/group DOM structure and never catches input.
    const selectionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    selectionPath.classList.add("comparison-selection-path");
    selectionPath.setAttribute("fill", "none");
    selectionPath.setAttribute("pointer-events", "none");
    selectionPath.setAttribute("visibility", "hidden");
    const xAt = year => left + (width-left-right)*(year-xDomain[0])/(xDomain[1]-xDomain[0]);
    selectionPath.setAttribute("stroke", "#202020");
    selectionPath.setAttribute("stroke-width", "4");
    selectionPath.setAttribute("vector-effect", "non-scaling-stroke");
    const selectionDots = [years[0], years[1]].map(() => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "5");
      dot.setAttribute("fill", "#202020");
      dot.setAttribute("stroke", "#fff");
      dot.setAttribute("stroke-width", "1.5");
      dot.setAttribute("pointer-events", "none");
      dot.setAttribute("visibility", "hidden");
      return dot;
    });
    // Temporary opt-in diagnostic: add ?debugSlope=1 to the page URL.
    const debugSlope = new URLSearchParams(window.location.search).has("debugSlope");
    let touchSelection = null;
    let touchFocusGuard = false;
    let selectLineCalls = 0;
    let debugStatus = null;
    const debugEvents = [];
    const debugLog = message => {
      if (!debugStatus) return;
      debugEvents.push(message);
      if (debugEvents.length > 7) debugEvents.shift();
      debugStatus.textContent = `calls:${selectLineCalls} | ${debugEvents.join(" > ")}`;
    };
    if (debugSlope) {
      try {
        debugStatus = document.createElement("div");
        debugStatus.setAttribute("role", "status");
        debugStatus.style.cssText = "display:block;position:static;clear:both;margin:12px 0 0;padding:5px 7px;background:#fff;color:#171717;border:1px solid #171717;font:11px/1.5 monospace;overflow-wrap:anywhere;pointer-events:none";
        debugStatus.textContent = "Touch chart 2; calls:0";
        // Insert below the plot rather than overlaying its interaction area.
        container.insertAdjacentElement("afterend", debugStatus);
      } catch (error) {
        debugStatus = null;
        console.warn("Slope diagnostics unavailable", error);
      }
    }
    const selectLine = (index, showIndicator = false) => {
      selectLineCalls++;
      debugLog(`S${index}:${showIndicator ? "on" : "off"}`);

      const row=rows[index];
      selectionPath.setAttribute("d", `M${xAt(years[0])},${yScale(row.earlier)} L${xAt(years[1])},${yScale(row.current)}`);
      selectionPath.setAttribute("stroke-dasharray", row.projected ? "5 3" : "none");
      selectionPath.setAttribute("visibility", showIndicator ? "visible" : "hidden");
      [row.earlier, row.current].forEach((value, i) => {
        selectionDots[i].setAttribute("cx", String(xAt(years[i])));
        selectionDots[i].setAttribute("cy", String(yScale(value)));
        selectionDots[i].setAttribute("visibility", showIndicator ? "visible" : "hidden");
      });
    };
    const activate = (index,event, {touch = false} = {})=>{
      if (touch) touchSelection = index;
      svg.querySelectorAll(".compare-series").forEach(el=>{
        const active=el.classList.contains(`compare-series-${index}`);
        el.style.opacity=active?"1":".22";
        if (el.tagName.toLowerCase()==="path" && active && !el.classList.contains("compare-hit"))
          el.style.stroke="#171717";
      });
      // Always calculate the selection geometry; display the overlay only for touch.
      selectLine(index, touch);
      debugLog(`A${index}:${touch ? "T" : "M"}`);
      showTooltip(tip, tooltipHTML(rows[index]));
      // Fixed-position overlay begins at the 2026 endpoint, covering labels
      // rather than plotted lines. Clamp inside the viewport on small screens.
      const box=svg.getBoundingClientRect();
      const yearFraction=(years[1]-xDomain[0])/(xDomain[1]-xDomain[0]);
      const x=box.left+left+(box.width-left-right)*yearFraction+8;
      const maxX=Math.max(6,window.innerWidth-tip.offsetWidth-6);
      tip.style.left=Math.max(6,Math.min(x,maxX))+"px";
      // Anchor vertically to this series' 2026 endpoint, not the moving pointer.
      const anchorY=box.top+yScale(rows[index].current)*(box.height/height);
      const desiredTop=anchorY-tip.offsetHeight/2;
      const chartTop=Math.max(6,box.top);
      const chartBottom=Math.min(window.innerHeight-6,box.bottom);
      const minTop=Math.min(chartTop,chartBottom-tip.offsetHeight);
      tip.style.top=Math.max(6,Math.min(Math.max(minTop,desiredTop),chartBottom-tip.offsetHeight))+"px";
    };
    const restoreTouchIndicator = (reason) => {
      if (touchSelection === null) return;
      selectionPath.setAttribute("visibility", "visible");
      selectionDots.forEach(dot => dot.setAttribute("visibility", "visible"));
      debugLog(`keep:${reason}:${selectionPath.getAttribute("visibility")}`);
    };
    const deactivate=()=>{
      touchSelection = null;
      svg.querySelectorAll(".compare-series").forEach(el=>{el.style.opacity="";el.style.stroke="";});
      svg.querySelectorAll(".compare-hit.is-touch-selected, .compare-series.is-touch-selected").forEach(el => el.classList.remove("is-touch-selected"));
      selectionPath.setAttribute("visibility", "hidden");
      selectionDots.forEach(dot => dot.setAttribute("visibility", "hidden"));
      debugLog("hide:deactivate");
      hideTooltip(tip);
      debugLog("D");
    };
    clearSelection = deactivate;
    const tabOrder = [...rows.keys()].sort((a,b) => rows[b].current - rows[a].current);
    rows.forEach((row,i)=>{
      const hit=svg.querySelector(`.compare-hit-${i}`);
      if(!hit)return;
      hit.setAttribute("tabindex","0");
      hit.style.order = String(tabOrder.indexOf(i));
      hit.setAttribute("role","button");
      hit.setAttribute("aria-label",row.name+": "+fmt(row.earlier)+" kg in "+years[0]+", "+fmt(row.current)+" kg in "+years[1]);
      hit.addEventListener("pointerenter",event=>{debugLog(`enter:${event.pointerType}`);if(!isTouchPointer(event) && !touchFocusGuard)activate(i,event);});
      hit.addEventListener("pointermove",event=>{if(!isTouchPointer(event) && !touchFocusGuard)activate(i,event);});

      hit.addEventListener("pointerleave",event=>{debugLog(`leave:${event.pointerType}`);if(!isTouchPointer(event) && !touchFocusGuard && touchSelection === null)deactivate();});
      hit.addEventListener("focus",()=>{debugLog(`focus:${i}`);if (touchFocusGuard) return;const b=hit.getBoundingClientRect();activate(i,{clientX:b.left+b.width/2,clientY:b.top+b.height/2});});
      hit.addEventListener("blur",()=>{
        debugLog(`blur:${i}`);
        if (touchSelection !== null) {
          // Mobile browsers can blur the focused hit mark after a completed touch.
          // Preserve the overlay independently of SVG focus state.
          restoreTouchIndicator("blur");
          queueMicrotask(() => restoreTouchIndicator("after-blur"));
          return;
        }
        if (!touchFocusGuard) deactivate();
      });
    });
    // A touch may focus an SVG hit mark and generate a compatibility click.
    // Neither should override the chart-level nearest-line selection.
    svg.addEventListener("pointerdown", event => {
      if (isTouchPointer(event)) touchFocusGuard = true;
      else touchFocusGuard = false;
    }, true);
    svg.addEventListener("keydown", event => {
      if (event.key === "Tab" || event.key.startsWith("Arrow")) touchFocusGuard = false;
    }, true);
    // Touch chooses the closest plotted line rather than the topmost overlapping hit stroke.
    svg.addEventListener("pointerup", event => {
      debugLog(`up:${event.pointerType}`);
      if (!isTouchPointer(event)) return;
      const bounds=svg.getBoundingClientRect();
      const px=(event.clientX-bounds.left)*width/bounds.width;
      const py=(event.clientY-bounds.top)*height/bounds.height;
      const x0=left+(width-left-right)*(years[0]-xDomain[0])/(xDomain[1]-xDomain[0]);
      const x1=left+(width-left-right)*(years[1]-xDomain[0])/(xDomain[1]-xDomain[0]);
      if(px<x0-16 || px>x1+16) { deactivate(); debugLog("outside"); return; }
      const t=Math.max(0,Math.min(1,(px-x0)/(x1-x0)));
      let nearest=-1, distance=Infinity;
      rows.forEach((row,i)=>{const y=yScale(row.earlier+(row.current-row.earlier)*t);const d=Math.abs(py-y);if(d<distance){distance=d;nearest=i;}});
      if(nearest>=0 && distance<=22) {
        debugLog(`near:${nearest}`);
        activate(nearest,event,{touch:true});
      } else { deactivate(); debugLog(`miss:${Math.round(distance)}`); }
    },true);
    if (debugStatus) {
      svg.addEventListener("pointerdown", e => debugLog(`down:${e.pointerType}`), true);
      svg.addEventListener("click", e => debugLog(`click:${e.detail}`), true);
    }
    const hits = tabOrder.map(i => svg.querySelector(`.compare-hit-${i}`)).filter(Boolean);
    hits.forEach(hit => hit.parentNode?.append(hit));
    // Append inside the actual SVG even if Plot.plot returns a wrapper figure.
    const svgRoot = svg.tagName.toLowerCase() === "svg" ? svg : svg.querySelector("svg");
    svgRoot.append(selectionPath, ...selectionDots);
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
