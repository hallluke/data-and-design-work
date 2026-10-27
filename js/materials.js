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
    option.textContent="\u00a0\u00a0".repeat(depth)+label;return option;
  }));
  if (MATERIALS.some(item=>item.value===current)) select.value=current;
}
