import { installTouchDismissal, isTouchPointer } from "../chart-interaction.js";
import { showTooltip, hideTooltip, positionFixedTooltip } from "../chart-tooltip.js";
import { renderTableRows } from "../chart-table.js";
import { setDisclosureContent } from "../chart-disclosure-content.js";
import { populateMaterialSelect, sourceMatchesSelection, materialLabel, materialIdFromSource } from "../materials.js";
import { setupChart } from "../chart-setup.js";
import { ATLAS_COLOURS, bindChartEvent, positionChartTooltip, formatWeight } from "../shared.js";

// Map recorded weights onto the five-stop visual range by distinct values,
// not by the number of days with each value.
function calendarIntensityPosition(value, distinctValues) {
  if (!distinctValues.length) return 0;
  if (distinctValues.length === 1) return 1;
  const min = distinctValues[0];
  const max = distinctValues[distinctValues.length - 1];
  return (value - min) / (max - min);
}

function createDailyMaterialWeightsChart({container, rows, root = document}) {
  const listeners = [];
  const on = (target, event, handler) => bindChartEvent(listeners, target, event, handler);
  // Chart-specific layout is built here; the HTML uses the same shell as every chart.
  const article = root.querySelector('[data-chart-id="daily-material-weights"]');
  const controlHost = article.querySelector(".chart-controls");
  const content = article.querySelector(".chart-content");
  const top = root.createElement("div");
  top.className = "calendar-top";
  const key = root.createElement("div");
  key.className = "calendar-key";
  key.id = "calendar-key";
  key.setAttribute("aria-label", "Weight intensity legend");
  controlHost.classList.add("calendar-controls");
  controlHost.before(top);
  top.append(controlHost, key);
  const layout = root.createElement("div");
  layout.className = "calendar-layout";
  const weekdayAxis = root.createElement("div");
  weekdayAxis.className = "calendar-weekdays";
  weekdayAxis.setAttribute("aria-hidden", "true");
  const scroll = root.createElement("div");
  scroll.className = "calendar-scroll";
  scroll.id = "calendar-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("aria-label", "Scrollable calendar, weeks left to right");
  const tooltip = content.querySelector(".chart-tooltip");
  content.append(layout);
  layout.append(weekdayAxis, scroll);
  scroll.append(container);
  const state={material:"all"};
  const controls=setupChart({root,id:"daily-material-weights",number:"04",title:"Recording calendar",unit:"kg / day",state,
    controls:[{key:"material",type:"select",label:"Material",id:"calendar-material",populate:populateMaterialSelect}],
    onChange:()=>render()});
  // The weekday axis is chart-specific presentation, not static page markup.
  const weekdaySpacer = root.createElement("div");
  weekdaySpacer.className = "calendar-axis-spacer";
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
    const span = root.createElement("span");
    span.textContent = day;
    return span;
  });
  weekdayAxis.replaceChildren(weekdaySpacer, ...weekdayLabels);
  const tip = tooltip;
  let selectedDate = null;
  let keyboardDate = null;
  let calendarCells = [];
  let cellRects = [];
  const removeTouchDismissal = installTouchDismissal(content, tip, {clear: () => {selectedDate=null; updateSelected();}});
  function updateSelected() {
    cellRects.forEach((rect,i) => {
      const active = calendarCells[i]?.date === (keyboardDate || selectedDate);
      rect.style.outline = active ? "2px solid #202020" : "";
      rect.style.outlineOffset = active ? "-2px" : "";
      rect.setAttribute("aria-selected",String(active));
    });
  }
  function ensureVisible(index, mode="arrow", direction=0) {
    const rect=cellRects[index]; if(!rect)return;
    const area=scroll.getBoundingClientRect(), box=rect.getBoundingClientRect();
    const available=area.width, left=area.left+available*.25, right=area.left+available*.75;
    const target = mode==="jump" ? area.left+available/2 : direction<0 ? left : right;
    if(mode==="edge") { scroll.scrollLeft=direction<0?0:scroll.scrollWidth-scroll.clientWidth; return; }
    if(mode==="jump" || (direction<0 && box.left<left) || (direction>0 && box.right>right)) {
      scroll.scrollLeft += (box.left+box.width/2)-target;
    }
  }
  function navigateCalendar(event) {
    if(event.target!==scroll)return;
    const key=event.key;
    const handled=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown","Enter"," ","Escape"];
    if(!handled.includes(key))return;
    if(key==="Escape") {event.preventDefault();hideTip();selectedDate=null;updateSelected();return;}
    if(key==="Enter"||key===" ") {
      event.preventDefault();const cell=calendarCells.find(d=>d.date===keyboardDate);
      if(cell) {if(!tip.hidden && activeTipDate===cell.date)hideTip();else {showTip(cell);const b=cellRects[calendarCells.indexOf(cell)].getBoundingClientRect();moveTip({clientX:b.left+b.width/2,clientY:b.top+b.height/2});}}return;
    }
    if(!calendarCells.length)return;
    const index=calendarCells.findIndex(d=>d.date===keyboardDate);
    const current=calendarCells[Math.max(0,index)];
    let target=current, mode="arrow",direction=0;
    const row=current.weekday;
    if(key==="ArrowLeft"||key==="ArrowRight") {
      direction=key==="ArrowLeft"?-1:1;
      if(event.metaKey||event.ctrlKey) {target=calendarCells.filter(d=>d.weekday===row).at(direction<0?0:-1);mode="edge";}
      else target=calendarCells.find(d=>d.week===current.week+direction&&d.weekday===row);
    } else if(key==="ArrowUp"||key==="ArrowDown") {
      const weekday=current.weekday+(key==="ArrowUp"?-1:1);
      target=calendarCells.find(d=>d.week===current.week&&d.weekday===weekday);
    } else if(key==="Home"||key==="End") {
      target=calendarCells.filter(d=>d.week===current.week).at(key==="Home"?0:-1);
    } else if(key==="PageUp"||key==="PageDown") {
      const d=new Date(current.date+"T00:00:00Z"), offset=key==="PageUp"?-1:1;
      const ordinal=Math.floor((d.getUTCDate()-1)/7);
      const monthStart=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+offset,1));
      const firstWeekday=(monthStart.getUTCDay()+6)%7;
      const day=1+(row-firstWeekday+7)%7+ordinal*7;
      const lastDay=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,0)).getUTCDate();
      const fallback=day>lastDay?day-7:day;
      const iso=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth(),fallback)).toISOString().slice(0,10);
      target=calendarCells.find(d=>d.date===iso);mode="jump";direction=offset;
    }
    event.preventDefault();
    if(!target)return;
    keyboardDate=target.date;selectedDate=target.date;
    const targetIndex=calendarCells.indexOf(target);
    updateSelected();ensureVisible(targetIndex,mode,direction);
    scroll.setAttribute("aria-label",`Recording calendar: ${fmtDate(target.date)}, ${target.records.length?target.kg.toFixed(2)+" kilograms":"no recorded weight"}. Arrow keys navigate; Page Up and Down jump by ordinal weekday in month; Enter shows details; Escape dismisses.`);
    if(!tip.hidden) {showTip(target);const b=cellRects[targetIndex].getBoundingClientRect();moveTip({clientX:b.left+b.width/2,clientY:b.top+b.height/2});}
  }
  on(scroll,"keydown",navigateCalendar);
  on(scroll,"focus",()=>{if(!keyboardDate&&calendarCells.length){keyboardDate=calendarCells.at(-1).date;updateSelected();ensureVisible(calendarCells.length-1,"edge",1);}});

  const table = root.querySelector("#calendar-table tbody");
  setDisclosureContent({root, methodId: "calendar-method", tableId: "calendar-table",
    methodology: "Each square represents a calendar day. Darker squares indicate more weight recorded for the selected material; pale squares have no recorded weight. Weights are assigned to the date logged, not spread across the days when waste accumulated. The colour scale adjusts to the selected material.",
    columns: ["Measure", "Value"]});

  const records = rows.map(r => ({...r, day:r.date}));
  const firstISO = "2025-01-01", lastISO = d3.max(rows, r=>r.date);
  const first = new Date(firstISO+"T00:00:00Z");
  const monday = d3.utcMonday.floor(first);
  // Recomputed on each render: the current local day is the final visible cell.
  function calendarDays() {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const today = new Date(todayISO+"T00:00:00Z");
    const end = d3.utcSunday.ceil(today); // Sunday of the current week, inclusive
    const weeks = d3.utcMondays(monday,d3.utcMonday.offset(end,1));
    const dates = d3.utcDays(monday,d3.utcDay.offset(end,1))
      .filter(day=>day>=first && day<=today)
      .map(day=>({date:day.toISOString().slice(0,10),
        week:d3.utcMonday.count(monday,day),weekday:(day.getUTCDay()+6)%7}));
    return {todayISO,weeks,dates,weekCount:weeks.length};
  }
  const fmtDate = iso=>new Date(iso+"T00:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  const fmtShort = iso=>new Date(iso+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  function matches(r) { return sourceMatchesSelection(r.type, state.material); }
  let activeTipDate = null;
  function hideTip(){
    hideTooltip(tip);
    activeTipDate=null;
  }
  function moveTip(event){
    if(tip.hidden)return;
    // The calendar SVG can be wider than its horizontal scroll viewport.
    // Use the visible chart area, not the offscreen SVG edge, for flipping.
    const scroll=container.closest(".calendar-scroll");
    const article=container.closest("article");
    const scrollRight=scroll?.getBoundingClientRect().right ?? window.innerWidth;
    const articleRight=article?.getBoundingClientRect().right ?? window.innerWidth;
    positionFixedTooltip(tip, event, {flipBoundary: Math.min(scrollRight, articleRight, window.innerWidth - 6)});
  }
  function showTip(d){
    // Only rebuild the tooltip when the hovered date changes. Positioning is
    // handled independently by the plot-wide pointermove listener.
    if(activeTipDate===d.date && !tip.hidden)return;
    const breakdown=d.records.map(r=>`<tr><td>${materialLabel(materialIdFromSource(r.type))}</td><td>${r.kg.toFixed(2)}</td></tr>`).join("");
    tip.innerHTML=`<strong>${fmtDate(d.date)}</strong><table class="tip-table"><thead><tr><th>Material</th><th>kg</th></tr></thead><tbody>`+
      (breakdown||`<tr><td>No recorded weight</td><td>—</td></tr>`)+
      `</tbody>${d.records.length?`<tfoot><tr><td>Total</td><td>${d.kg.toFixed(2)}</td></tr></tfoot>`:""}</table>`;
    activeTipDate=d.date;
    showTooltip(tip);
  }
  function render(){
    hideTip();
    const {todayISO,weeks,dates,weekCount}=calendarDays();
    const selected=records.filter(r=>r.day<=todayISO && matches(r));
    const grouped=d3.group(selected,r=>r.day);
    const weights=new Map(Array.from(grouped,([date,rs])=>[date,d3.sum(rs,r=>r.kg)]));
    const values=[...weights.values()].filter(v=>v>0);
    const distinctValues=[...new Set(values)].sort((a,b)=>a-b);
    const min=d3.min(values)||0,max=d3.max(values)||0;
    const shade=d3.interpolateLab(ATLAS_COLOURS.light,ATLAS_COLOURS.dark);
    const intensity=value=>shade(calendarIntensityPosition(value,distinctValues));
    const cells=dates.map(d=>({...d,kg:weights.get(d.date)||0,records:grouped.get(d.date)||[]}));
    calendarCells=cells;
    if(!cells.some(d=>d.date===keyboardDate))keyboardDate=null;
    const monthStarts=d3.utcMonths(d3.utcMonth.floor(first),d3.utcMonth.offset(new Date(todayISO+"T00:00:00Z"),1))
      .map(d=>({d,i:d3.utcMonday.count(monday,d3.utcMonday.floor(d))}))
      .filter(({i})=>i>=0 && i<weekCount);
    const cellSize=18;
    const plot=Plot.plot({
      width:weekCount*cellSize+12,height:158,marginTop:32,marginBottom:0,marginLeft:12,marginRight:0,
      style:{fontFamily:'"Source Sans 3",Arial,sans-serif',fontSize:'10px',color:'var(--muted)'},
      x:{type:"band",domain:d3.range(weekCount),padding:0,axis:"top",label:null,ticks:monthStarts.map(d=>d.i),
         tickFormat:i=>{const d=monthStarts.find(x=>x.i===i)?.d || weeks[i];const m=d.toLocaleDateString("en-GB",{month:"short",timeZone:"UTC"});return d.getUTCMonth()===0?`${m}-${String(d.getUTCFullYear()).slice(-2)}`:m;},tickSize:0,tickPadding:7},
      y:{type:"band",domain:d3.range(7),axis:null,padding:0},
      marks:[Plot.cell(cells,{x:"week",y:"weekday",inset:1.5,
        fill:d=>d.kg>0?intensity(d.kg):ATLAS_COLOURS.empty,stroke:"#e1dfda",strokeWidth:0.35})]
    });
    plot.setAttribute("aria-label","Recorded weight by day, Monday to Sunday, from "+fmtDate(firstISO)+" to "+fmtDate(lastISO));
    container.replaceChildren(plot);
    // Keep the tooltip visible across gaps between cells. Hide it only when
    // the pointer leaves the plot, not when it leaves an individual cell.
    // The listener belongs to this plot and is removed when the plot is replaced.
    plot.addEventListener("pointerleave", e=>{if(!isTouchPointer(e))hideTip();});
    // Track the pointer continuously, including gaps between adjacent cells.
    // Cell listeners only change the contents when the active date changes.
    plot.addEventListener("pointermove", e=>{if(!isTouchPointer(e))moveTip(e);});
    // Bind tooltips to native Plot cell marks; do not use SVG <title> browser popups.
    const rects=[...plot.querySelectorAll('rect')];
    cellRects=rects.length===cells.length?rects:[];
    if(rects.length===cells.length){
      rects.forEach((rect,i)=>{
        rect.setAttribute("aria-label",`${fmtDate(cells[i].date)}: ${cells[i].records.length?cells[i].kg.toFixed(2)+" kilograms":"no recorded weight"}`);
        rect.addEventListener("pointerenter",e=>{if(!isTouchPointer(e)){showTip(cells[i]);moveTip(e);}});
        rect.addEventListener("pointerup",e=>{if(isTouchPointer(e)){selectedDate=cells[i].date;showTip(cells[i]);moveTip(e);updateSelected();}});
      });
    }
    updateSelected();
    key.replaceChildren();
    const label=t=>{const el=document.createElement("span");el.textContent=t;key.append(el);};
    const swatch=c=>{const el=document.createElement("span");el.className="swatch";el.style.backgroundColor=c;key.append(el);};
    label("No record");swatch(ATLAS_COLOURS.empty);
    const gap=document.createElement("span");gap.className="key-gap";key.append(gap);
    label("Min");
    for(const t of [0,.25,.5,.75,1])swatch(shade(t));
    label("Max");
    const total=d3.sum(selected,r=>r.kg),mean=values.length?total/values.length:0;
    const weekdays=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const dayCounts=d3.rollup([...weights.keys()],v=>v.length,iso=>(new Date(iso+"T00:00:00Z").getUTCDay()+6)%7);
    const top=d3.max(dayCounts.values())||0;
    const common=[...dayCounts].filter(([,count])=>count===top).map(([day])=>weekdays[day]).sort().join(", ")||"—";
    const commonLabel=top?`${common} · ${top} (${(100*top/values.length).toFixed(1)}%)`:"—";
    const lines=[["Start date",fmtShort(firstISO)],["End date",fmtShort(lastISO)],
      ["Recorded days",String(values.length)],["Total recorded",total.toFixed(2)+" kg"],
      ["Lowest daily weight",min.toFixed(2)+" kg"],["Highest daily weight",max.toFixed(2)+" kg"],
      ["Range",(max-min).toFixed(2)+" kg"],["Average per recorded day",mean.toFixed(2)+" kg"],
      ["Most common weekday",commonLabel]];
    renderTableRows(table, lines, ["Measure", "Value"], {root: document});
  }

  on(document,"visibilitychange",()=>{if(!document.hidden)render();});
  return {render,destroy(){removeTouchDismissal();listeners.forEach(remove=>remove());controls.destroy();hideTip();}};
}

// Single interface for the four datasets. For now these remain embedded in this
// HTML file. When split into JSON files, replace this function's implementation;
// chart factories and their data arguments should not need to change.
// Load each independent dataset from static JSON files.
// Relative URLs work under both localhost and a GitHub Pages project path.

export { createDailyMaterialWeightsChart, calendarIntensityPosition };
