'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../js/help-tables.js');
const {HelpDocument, parseHelpValues, HELP_TEXTS} = globalThis.RB2;
function fixture(ids, opaque = true) {
  const bytes = new Uint8Array(16 + ids.length * 2), view = new DataView(bytes.buffer);
  view.setUint32(0, ids.length, false);
  if (opaque) for (let i = 4; i < 16; i++) bytes[i] = 0xD0 + i;
  ids.forEach((id, i) => view.setUint16(16 + i * 2, id, false));
  return bytes;
}
test('count is BE u32, entries are BE u16, opaque header is preserved', () => {
  const bytes = fixture([0, 60, 65, 84, 0x1234, 0xFFFF]), doc = new HelpDocument(bytes);
  assert.equal(doc.kind, 'help'); assert.equal(doc.count, 6); assert.equal(doc.stride, 2);
  assert.equal(doc.row(4), 0x1234); assert.deepEqual(doc.encode(), bytes);
  bytes[16] = 255; assert.equal(doc.row(0), 0);
});
test('reordering and adding/removing entries update only payload and count', () => {
  const bytes = fixture([65,60,63,61,62,64,66,67,68]), doc = new HelpDocument(bytes);
  const values = [60,65,63,61,62,64,66,67,68,84]; doc.setValues(values);
  values[0] = 1;
  const encoded = doc.encode(), decoded = new HelpDocument(encoded);
  assert.equal(encoded.length, 36); assert.equal(decoded.count, 10); assert.equal(decoded.row(0),60);
  assert.deepEqual(encoded.slice(4,16), bytes.slice(4,16));
  doc.setValues([]); assert.equal(doc.encode().length,16); assert.equal(new HelpDocument(doc.encode()).count,0);
});
test('malformed lengths/counts are rejected instead of guessed', () => {
  assert.throws(() => new HelpDocument(new Uint8Array(15)));
  assert.throws(() => new HelpDocument(fixture([1,2]).slice(0,-1)));
  const bytes=fixture([1]);new DataView(bytes.buffer).setUint32(0,0xFFFFFFFF,false);
  assert.throws(() => new HelpDocument(bytes));
  assert.throws(() => new HelpDocument(new Uint8Array(17)));
});
test('invalid IDs and indexes never silently wrap', () => {
  const doc=new HelpDocument(fixture([1]));
  for(const values of [[-1],[65536],[1.5],[NaN],['1']])assert.throws(()=>doc.setValues(values));
  assert.deepEqual(doc.rows,[1]); assert.throws(()=>doc.setValues(new DataView(new ArrayBuffer(2))));
  for(const index of [-1,1,0.5,NaN])assert.throws(()=>doc.row(index));
  doc.setValues(new Uint16Array([0,65535]));assert.deepEqual(doc.rows,[0,65535]);
});
test('typed views respect byte offsets', () => {
  const bytes=fixture([65,60,63]), wrapped=new Uint8Array(bytes.length+8);wrapped.set(bytes,5);
  assert.deepEqual(new HelpDocument(wrapped.subarray(5,5+bytes.length)).encode(),bytes);
  assert.deepEqual(new HelpDocument(new DataView(wrapped.buffer,5,bytes.length)).encode(),bytes);
});
test('ordered-ID parser supports decimal, hex, duplicates and empty lists', () => {
  assert.deepEqual(parseHelpValues('65\n60, 0x3F; 65'),[65,60,63,65]);
  assert.deepEqual(parseHelpValues(' \n '),[]);
  for(const text of ['1x','-1','0x10000','1.5','Infinity'])assert.throws(()=>parseHelpValues(text));
});
test('English reference keeps tutorial text IDs distinct from native action IDs', () => {
  assert.equal(HELP_TEXTS.length,85);assert.equal(new Set(HELP_TEXTS.map(x=>x.id)).size,85);
  assert.match(HELP_TEXTS.find(x=>x.id===60).text,/switch/i);
  assert.match(HELP_TEXTS.find(x=>x.id===1).text,/ascend/i);
  assert.match(HELP_TEXTS.find(x=>x.id===1).text,/<PAD=/);
});
const originals=process.env.RB2_HELP_FIXTURES;
test('all nine original extracted DATs round-trip exactly', {skip:!originals}, () => {
  const counts=[15,18,9,9,8,9,9,1,1];
  counts.forEach((count,i)=>{
    const bytes=fs.readFileSync(path.join(originals,'tutorial_message_table_'+String(i+1).padStart(2,'0')+'.dat'));
    const doc=new HelpDocument(bytes);assert.equal(doc.count,count);assert.deepEqual(Buffer.from(doc.encode()),bytes);
    doc.rows.forEach(id=>assert.ok(HELP_TEXTS.some(text=>text.id===id)));
  });
});
