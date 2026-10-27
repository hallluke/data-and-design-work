import { setControlDisabled } from "./chart-controls.js";
// Chart config owns control definitions; each chart owns state and change reactions.
export function setupChart({root=document, id, number, title, unit, controls=[], state, onChange}) {
  const article=root.querySelector(`[data-chart-id="${id}"]`);
  if (!article) throw new Error(`Missing chart article: ${id}`);
  article.querySelector(".num").textContent=number;
  article.querySelector("h2").textContent=title;
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
