import registry from "./material-registry.js";
// Material IDs and grouping semantics are stable; source and display labels may change.
export const MATERIAL_CONFIG = registry;
const materials = new Map(registry.materials.map(item => [item.id, item]));
const groups = new Map(registry.groups.map(group => [group.id, group]));
const sourceIds = new Map(registry.materials.map(item => [item.source.toLowerCase(), item.id]));
const labelIds = new Map(registry.materials.map(item => [item.label, item.id]));
for (const group of registry.groups) labelIds.set(group.label, group.id);
export const materialLabel = id => materials.get(id)?.label ?? groups.get(id)?.label ?? id;
export const materialIdFromSource = source => sourceIds.get(String(source).toLowerCase()) ?? null;
export const materialIdFromLabel = label => labelIds.get(label) ?? null;
export const groupChildren = id => [...(groups.get(id)?.children ?? [])];
export const groupSourceNames = id => groupChildren(id).map(child => materials.get(child).source);
export const groupLabels = id => groupChildren(id).map(materialLabel);
export const materialBelongsToGroup = (id, groupId) => groupChildren(groupId).includes(id);
export const sourceMatchesSelection = (source, selection) => selection === "all" ||
  (groups.has(selection) ? materialBelongsToGroup(materialIdFromSource(source), selection) : materialIdFromSource(source) === selection);
export const monthlyGroupLabels = () => registry.monthlyGroupOrder.map(materialLabel);
export const individualMaterialLabels = () => registry.materials.map(item => item.label);
export const MATERIALS = [{value:"all",label:"All materials",depth:0},
  ...registry.materials.filter(item => !registry.groups.some(group => group.children.includes(item.id)))
    .map(item => ({value:item.id,label:item.label,depth:1})),
  ...registry.groups.flatMap(group => [{value:group.id,label:group.label,depth:1},
    ...group.children.map(id => ({value:id,label:materialLabel(id),depth:2}))])];
export function populateMaterialSelect(select,{includeBatteries=true}={}) {
  const current=select.value;
  select.replaceChildren(...MATERIALS.filter(item=>includeBatteries || item.value!=="batteries").map(({value,label,depth})=>{
    const option=document.createElement("option");option.value=value;
    option.textContent=depth===0 ? label : (depth===1 ? "↳ " : "↳ → ") + label;return option;
  }));
  if (MATERIALS.some(item=>item.value===current)) select.value=current;
}

// Canonicalise older monthly datasets that contain previous display labels.
// The pipeline emits groups in monthlyGroupOrder, so positions identify groups
// even when the user has changed their labels since the last data refresh.
export function normalizeMonthlyGroups(data) {
  const groupIds = registry.monthlyGroupOrder.filter(id =>
    registry.materials.find(item => item.id === id)?.impute !== false);
  const oldToNew = new Map(data.groups.map((label, i) => [label, materialLabel(groupIds[i])]));
  for (const id of registry.monthlyGroupOrder) {
    const material = materials.get(id);
    if (material?.impute === false) oldToNew.set(material.label, material.label);
  }
  const normalizeRows = rows => rows.map(row => ({...row, group: oldToNew.get(row.group) ?? row.group}));
  return {...data, groups: data.groups.map(label => oldToNew.get(label) ?? label),
    recorded: normalizeRows(data.recorded), imputed: normalizeRows(data.imputed)};
}
