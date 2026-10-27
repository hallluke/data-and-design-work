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
  function hideTip(){tip.hidden=true;}
  function showTip(d,event){
    const breakdown=d.records.map(r=>`<tr><td>${materialLabel(materialIdFromSource(r.type))}</td><td>${r.kg.toFixed(2)}</td></tr>`).join("");
    tip.innerHTML=`<strong>${fmtDate(d.date)}</strong><table class="tip-table"><thead><tr><th>Material</th><th>kg</th></tr></thead><tbody>`+
      (breakdown||`<tr><td>No recorded weight</td><td>—</td></tr>`)+
      `</tbody>${d.records.length?`<tfoot><tr><td>Total</td><td>${d.kg.toFixed(2)}</td></tr></tfoot>`:""}</table>`;
    tip.hidden=false;
    const width=tip.offsetWidth,height=tip.offsetHeight;
    tip.style.left=Math.max(6,Math.min(event.clientX+12,window.innerWidth-width-6))+"px";
    tip.style.top=Math.max(6,Math.min(event.clientY-height-10,window.innerHeight-height-6))+"px";
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
    plot.addEventListener("pointerleave", hideTip);
    // Bind tooltips to native Plot cell marks; do not use SVG <title> browser popups.
    const rects=[...plot.querySelectorAll('rect')];
    if(rects.length===cells.length){
      rects.forEach((rect,i)=>{
        rect.addEventListener("pointermove",e=>showTip(cells[i],e));
      });
    }
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
    table.replaceChildren(...lines.map(([name,value])=>{const tr=document.createElement("tr");for(const t of [name,value]){const td=document.createElement("td");td.textContent=t;tr.append(td);}return tr;}));
  }

  on(document,"visibilitychange",()=>{if(!document.hidden)render();});
  return {render,destroy(){listeners.forEach(remove=>remove());controls.destroy();hideTip();}};
}

// Single interface for the four datasets. For now these remain embedded in this
// HTML file. When split into JSON files, replace this function's implementation;
// chart factories and their data arguments should not need to change.
// Load each independent dataset from static JSON files.
// Relative URLs work under both localhost and a GitHub Pages project path.

export { createDailyMaterialWeightsChart, calendarIntensityPosition };
