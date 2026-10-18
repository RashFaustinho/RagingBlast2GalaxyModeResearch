'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/presets.js');
const {DatDocument, parseDatWord} = globalThis.RB2;
function fixture(kind, count = 2) {
  const stride = {appearance:32,strength:88,preset:44,item:84}[kind], header = kind === 'item' ? 0 : 16;
  const bytes = new Uint8Array(header + count * stride), view = new DataView(bytes.buffer);
  if (header) { view.setUint32(0, count, false); for (let i=4;i<16;i++) bytes[i] = 0xA0+i; }
  for (let i=0;i<count*stride/4;i++) view.setUint32(header+i*4, (i*17000001)>>>0, false);
  return bytes;
}
for (const kind of ['appearance','strength','preset','item']) {
  test(kind + ': untouched bytes round-trip, including opaque header', () => {
    const bytes = fixture(kind), doc = new DatDocument(bytes, kind);
    assert.equal(doc.count,2); assert.deepEqual(doc.encode(),bytes);
    const copy = doc.row(0); copy[0]=42; assert.notDeepEqual(copy,doc.row(0));
  });
  test(kind + ': single-word edit changes only its four bytes', () => {
    const bytes = fixture(kind), doc = new DatDocument(bytes,kind), row = doc.row(1);
    row[3] = 0x12345678; doc.setRow(1,row);
    const expected = bytes.slice(); new DataView(expected.buffer).setUint32((kind==='item'?0:16)+doc.stride+12,0x12345678,false);
    assert.deepEqual(doc.encode(),expected);
  });
  test(kind + ': append preserves existing rows and header tail', () => {
    const bytes = fixture(kind), doc = new DatDocument(bytes,kind), row = doc.row(0);
    assert.equal(doc.appendRow(row),2);
    const encoded=doc.encode(); assert.equal(encoded.length,bytes.length+doc.stride);
    const parsed=new DatDocument(encoded,kind); assert.equal(parsed.count,3); assert.deepEqual(parsed.row(2),row);
    if(kind!=='item') assert.deepEqual(encoded.slice(4,bytes.length),bytes.slice(4));
    else assert.deepEqual(encoded.slice(0,bytes.length),bytes);
  });
}
test('rejects malformed geometry without guessing', () => {
  for(const kind of ['appearance','strength','preset','item']) {
    assert.throws(()=>new DatDocument(fixture(kind).slice(1),kind));
  }
  assert.throws(()=>new DatDocument(new Uint8Array(0),'item'));
  const bad=fixture('preset'); new DataView(bad.buffer).setUint32(0,0xFFFFFFFF,false);
  assert.throws(()=>new DatDocument(bad,'preset'));
  assert.throws(()=>new DatDocument(new Uint8Array(16),'unknown'));
});
test('row validation and returned copies prevent silent coercion', () => {
  const doc=new DatDocument(fixture('appearance'),'appearance');
  assert.throws(()=>doc.row(-1)); assert.throws(()=>doc.row(2)); assert.throws(()=>doc.row(0.5));
  assert.throws(()=>doc.setRow(0,[1]));
  for(const value of [-1,4294967296,1.5,NaN,'1']) { const row=doc.row(0);row[3]=value;assert.throws(()=>doc.setRow(0,row)); }
  const row=doc.row(0);doc.setRow(0,row);row[4]=123;assert.notEqual(doc.row(0)[4],123);
});
test('accepts view offsets without reading surrounding bytes', () => {
  const source=fixture('preset'), padded=new Uint8Array(source.length+10);padded.set(source,7);
  assert.deepEqual(new DatDocument(padded.subarray(7,7+source.length),'preset').encode(),source);
  assert.deepEqual(new DatDocument(new DataView(padded.buffer,7,source.length),'preset').encode(),source);
});
test('preset namespace aliases keep the same binary geometry', () => {
  for(const kind of ['galaxy','tutorial','battle_zone_nor','battle_zone_spe','preset_battle_zone_ult']) assert.equal(new DatDocument(fixture('preset'),kind).kind,'preset');
});
test('user values support decimal, hex, descriptive choices and empty slots', () => {
  assert.equal(parseDatWord('173'),0xAD);assert.equal(parseDatWord('0xAD — Max Computer'),0xAD);
  assert.equal(parseDatWord('15 — Move name'),15);assert.equal(parseDatWord('FFFFFFFF'),0xFFFFFFFF);
  for(const value of ['-1','Empty','None','']) assert.equal(parseDatWord(value,true),0xFFFFFFFF);
  for(const value of ['-2','3x','0x100000000','1.5','hello','']) assert.throws(()=>parseDatWord(value));
});
