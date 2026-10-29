"use strict";

// Chart lifecycle, control construction, and status reporting.

"use strict";

// Shared state synchronisation for existing button groups.
// Chart modules still own their selection and dependency rules.
function syncButtonGroup(buttons, selected, dataKey) {
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
  }
}

function setControlDisabled(control, disabled) {
  control.disabled = Boolean(disabled);
  // Native disabled state handles keyboard/mouse behaviour; mirror for existing CSS.
  control.setAttribute("aria-disabled", String(control.disabled));
}

export { syncButtonGroup, setControlDisabled };


// Chart config owns control definitions; each chart owns state and change reactions.
export function setupChart({root=document, id, number, title, unit, controls=[], state, onChange}) {
  const article=root.querySelector(`[data-chart-id="${id}"]`);
  if (!article) throw new Error(`Missing chart article: ${id}`);
  article.querySelector(".num").textContent=number;
  const heading = article.querySelector("h2");
  // Keep one span around the entire title so spaces animate as a single stroke.
  const mark = root.createElement("span");
  mark.className = "title-mark";
  mark.textContent = title;
  heading.replaceChildren(mark);
  // One fresh but stable print-registration variation per page load.
  // Limit combined extension and shift to avoid an exaggerated overhang.
  const extension = (Math.random() * .36 - .18);
  const shift = (Math.random() * .12 - .06);
  mark.style.setProperty("--mark-extend", `${extension.toFixed(3)}em`);
  mark.style.setProperty("--mark-shift", `${shift.toFixed(3)}em`);
  mark.style.setProperty("--mark-angle", `${(Math.random() * 1.2 - .6).toFixed(2)}deg`);
  article.querySelector(".unit").textContent=unit;
  const host=article.querySelector(".chart-controls");
  if (!host) throw new Error(`Missing chart controls: ${id}`);
  const listeners=[];
  const elements={};
  const rows=controls.map(control=>{
    const row=root.createElement("div");row.className="control-row";
    if(control.type==="buttons") {
      const label=root.createElement("span");label.className="control-label";
      label.id=`${id}-${control.key}-label`;label.textContent=control.label;
      const group=root.createElement("div");group.className="choices";
      group.setAttribute("role","group");group.setAttribute("aria-labelledby",label.id);
      const buttons=control.options.map(option=>{
        const button=root.createElement("button");button.type="button";
        button.textContent=option.label;button.dataset[control.key]=option.value;
        button.addEventListener("click",()=>{
          if(button.disabled)return;
          state[control.key]=option.value;
          onChange(control.key,option.value);
        });
        group.append(button);return button;
      });
      elements[control.key]={buttons,control};row.append(label,group);
    } else {
      const label=root.createElement("label");label.htmlFor=control.id;
      label.textContent=control.label;
      const select=root.createElement("select");select.id=control.id;
      for(const option of control.options ?? []) {
        const element=root.createElement("option");element.value=option.value;
        element.textContent=option.label;select.append(element);
      }
      control.populate?.(select);
      select.value=state[control.key];
      select.addEventListener("change",()=>{
        state[control.key]=select.value;
        onChange(control.key,select.value);
      });
      elements[control.key]={select,control};row.append(label,select);
    }
    return row;
  });
  host.replaceChildren(...rows);
  function sync(){
    for(const [key,entry] of Object.entries(elements)){
      if(entry.buttons){for(const button of entry.buttons){
        button.setAttribute("aria-pressed",String(button.dataset[key]===state[key]));
        setControlDisabled(button,Boolean(entry.control.disabled?.(button.dataset[key],state)));
      }} else {
        entry.select.value=state[key];
        setControlDisabled(entry.select,Boolean(entry.control.disabled?.(state[key],state)));
      }
    }
  }
  sync();
  return {elements,sync,destroy(){host.replaceChildren();}};
}

"use strict";


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
    clearChartStatus(container);
    charts.push(chart);
    return true;
  } catch (error) {
    showChartError(container, error);
    return false;
  }
}

export { startChart };

// A single status element serves as the initial loading message and any later error.
function clearChartStatus(container) {
  container?.querySelector(".chart-status, .error")?.remove();
}
function showChartError(container, error) {
  console.error(error);
  if (!container) return;
  container.querySelector("svg")?.remove();
  let message = container.querySelector(".chart-status, .error");
  if (!message) {
    message = document.createElement("p");
    container.prepend(message);
  }
  message.className = "chart-status error";
  message.textContent = "Chart unavailable: " + error.message;
}

export { showChartError, clearChartStatus };
