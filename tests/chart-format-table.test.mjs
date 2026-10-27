import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWeight, formatNumber, formatPercent, formatSignedNumber } from '../js/chart-format.js';
import { renderTableRows } from '../js/chart-table.js';

test('shared formatters preserve the existing numeric presentation', () => {
  assert.equal(formatWeight(1234.5), '1234.50');
  assert.equal(formatNumber(1234.5), '1,234.50');
  assert.equal(formatPercent(12.34), '12.3%');
  assert.equal(formatSignedNumber(12.5), '+12.50');
  assert.equal(formatSignedNumber(-12.5), '-12.50');
});

function node(tag) {
  return {tag, children: [], append(child) {this.children.push(child);},
    replaceChildren(...children) {this.children = children;}, textContent: '', className: ''};
}
const root = {createElement: node, createDocumentFragment: () => node('fragment')};

test('table helper creates numeric and text cells in order', () => {
  const tbody = node('tbody');
  renderTableRows(tbody, [['Jan-26', '12.50'], ['Feb-26', '13.00']],
    ['Month', {label: 'Weight', numeric: true}], {root});
  const rows = tbody.children[0].children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children[0].textContent, 'Jan-26');
  assert.equal(rows[0].children[1].textContent, '12.50');
  assert.equal(rows[0].children[1].className, 'numeric');
});

test('table helper rejects mismatched row lengths', () => {
  assert.throws(() => renderTableRows(node('tbody'), [['only one']], ['A','B'], {root}), /column count/);
});
