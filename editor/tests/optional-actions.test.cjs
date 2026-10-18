/* Optional Perfect Actions are independent of the battle's victory objective.
 * The real-file controls require an extracted original galaxy.mmd in
 * RB2_TEST_FIXTURES (default /tmp/rb2-editor-test-fixtures).
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../js/mmd.js');
const { MmdDocument, Mmd } = globalThis.RB2;
const source = path.join(process.env.RB2_TEST_FIXTURES || '/tmp/rb2-editor-test-fixtures', 'galaxy.mmd');
const fixture = (name, fn) => test(name, { skip: !fs.existsSync(source) && 'Provide the extracted original galaxy.mmd' }, fn);
const fresh = () => new MmdDocument(fs.readFileSync(source));
const row = (d, n) => Buffer.from(d.readRoot(n));

fixture('original Galaxy contains 20 action sequences alongside ordinary victory objectives', () => {
  const d = fresh(), found = [];
  for (let i = 0; i < d.rootCount; i++) if (d.getActions(i).length) found.push(i);
  assert.deepEqual(found, [41,59,69,97,121,139,174,199,223,233,239,270,300,306,320,336,373,391,423,446]);
  assert.ok(found.every(i => row(d, i).readUInt16BE(16) !== 29));
  assert.deepEqual(found.filter(i => row(d, i).readUInt16BE(16) === 1), [97,174,300]);
});

fixture('editing prompts never silently converts the victory objective to Perfect Actions', () => {
  const d = fresh(), before = row(d, 117);
  d.setActions(117, [{ action: 1, parameter: -1, expression: 0 }]);
  const after = row(d, 117);
  assert.equal(after.readUInt16BE(16), before.readUInt16BE(16));
  assert.deepEqual(after.subarray(0, 60), before.subarray(0, 60));
  assert.deepEqual(after.subarray(64), before.subarray(64));
  assert.deepEqual(new MmdDocument(d.encode()).getActions(117), [{ action: 1, parameter: -1, expression: 0 }]);
});

fixture('a new connected Galaxy mission can retain defeat-enemy victory with editable prompts', () => {
  const d = fresh(), original = d.getActions(174);
  const added = d.duplicateMission(174, { owner: 66, connectTo: 117, x: 64, y: 18.5 });
  assert.equal(added, 498);
  const comboExpression = Mmd.constantExpression(5);
  const ref = d.append(comboExpression, 1, comboExpression.length);
  const requests = [{ action: 1, parameter: -1, expression: 0 },
    { action: 2, parameter: -1, expression: 0 },
    { action: 95, parameter: -1, expression: ref }];
  d.setActions(added, requests);
  const root = row(d, added);
  root.writeUInt16BE(2, 10); // Keep the known Perfect Action menu category.
  root.writeUInt16BE(0, 16); // Ordinary defeat-enemy objective, explicitly chosen.
  root.writeUInt16BE(0, 18); root.writeUInt16BE(0, 20); // Clear inherited rule captions.
  d.writeRoot(added, root);
  const reloaded = new MmdDocument(d.encode());
  assert.equal(row(reloaded, added).readUInt16BE(16), 0);
  assert.deepEqual(reloaded.getActions(added), requests);
  assert.deepEqual(reloaded.getActions(174), original);
  assert.ok(reloaded.getOwner(66).nodes.some(n => n.node === added));
  assert.deepEqual(reloaded.validateGraph(), []);
  assert.equal(Mmd.evaluateExpression(Mmd.parseExpression(reloaded.body(ref)).ast), 5);
  // Changing victory afterward must also leave the prompt sequence untouched.
  const asTasks = row(reloaded, added); asTasks.writeUInt16BE(29, 16); reloaded.writeRoot(added, asTasks);
  assert.deepEqual(reloaded.getActions(added), requests);
});

fixture('the 20-action capacity rejects overflow before mutating the document', () => {
  const d = fresh(), before = Buffer.from(d.encode());
  assert.throws(() => d.setActions(117, Array.from({ length: 21 }, () => ({ action: 1, parameter: -1, expression: 0 }))), /20/);
  assert.deepEqual(Buffer.from(d.encode()), before);
});
