// One source of truth for the material hierarchy used by charts 1 and 4.
export const MATERIALS = [
  {value:"all", label:"All materials", depth:0},
  {value:"Residual waste", label:"Residual waste", depth:1},
  {value:"Food waste", label:"Food waste", depth:1},
  {value:"Soft plastics", label:"Soft plastics", depth:1},
  {value:"Batteries", label:"Batteries", depth:1},
  {value:"Dry recycling", label:"Dry recycling", depth:1},
  ...["Glass","Cardboard","Tin","Plastic","Paper"].map(label =>
    ({value:`dry:${label}`, label, depth:2}))
];

export function populateMaterialSelect(select, {includeBatteries = true} = {}) {
  const current = select.value;
  select.replaceChildren(...MATERIALS.filter(item => includeBatteries || item.value !== "Batteries").map(({value,label,depth}) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = "\u00a0\u00a0".repeat(depth) + label;
    return option;
  }));
  if (MATERIALS.some(item => item.value === current)) select.value = current;
}
