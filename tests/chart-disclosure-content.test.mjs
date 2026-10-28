import test from "node:test";
import assert from "node:assert/strict";
import { setDisclosureContent } from "../js/chart-display.js";

function fixture() {
  const method = {textContent: "", innerHTML: ""};
  const head = {children: [], replaceChildren(...nodes) {this.children = nodes;}};
  const table = {tHead: head};
  const root = {
    getElementById(id) {return ({method, table})[id];},
    createElement(tag) {return {tag, children: [], append(node) {this.children.push(node);}};}
  };
  return {root, method, head};
}

test("sets plain-text methodology and accessible column headings", () => {
  const {root, method, head} = fixture();
  setDisclosureContent({root, methodId: "method", tableId: "table", methodology: "Explanation",
    columns: ["Month", {label: "Weight (kg)", numeric: true}]});
  assert.equal(method.textContent, "Explanation");
  assert.deepEqual(head.children[0].children.map(th => [th.textContent, th.scope, th.className]),
    [["Month", "col", undefined], ["Weight (kg)", "col", "numeric"]]);
});

test("updates headings without rewriting methodology", () => {
  const {root, method, head} = fixture();
  setDisclosureContent({root, methodId: "method", tableId: "table", methodology: {html: "A <strong>note</strong>"}, columns: ["Old"]});
  setDisclosureContent({root, methodId: "method", tableId: "table", columns: ["New", "Total"]});
  assert.equal(method.innerHTML, "A <strong>note</strong>");
  assert.deepEqual(head.children[0].children.map(th => th.textContent), ["New", "Total"]);
});
