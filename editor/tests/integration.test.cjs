/* Real-file integration checks. No game files are included in this repository.
 * Put extracted originals in RB2_TEST_FIXTURES (default below), then run:
 *   node --test editor/tests/integration.test.cjs
 * Expected inputs: galaxy.mmd, tutorial.mmd, the sixteen zone_*.mmd files,
 * preset_appearance_table.dat, preset_strength_table.dat, and preset_character_*.
 * The suite only reads fixtures and edits copies in memory.
 */
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../js/mmd.js');
require('../js/presets.js');
const {MmdDocument, DatDocument, Mmd} = globalThis.RB2;
const DIR = process.env.RB2_TEST_FIXTURES || '/tmp/rb2-editor-test-fixtures';
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
const read = name => fs.readFileSync(path.join(DIR,name));
const bytes = value => Buffer.from(value);
const fixture = (name, fn) => test(name, {skip: !files.includes('galaxy.mmd') && 'Set RB2_TEST_FIXTURES to extracted game files'}, fn);
const same = (actual, expected, message) => assert.deepEqual(bytes(actual),bytes(expected),message);

// Independent minimal parser used as the binary oracle, rather than making
// expected results with the editor's own reader/serializer.
function rawMmd(input) {
  const b = bytes(input), hs = b.toString('ascii',0,4)==='MAIN'?36:20;
  const tableLength = b.readUInt32BE(8), payloadBase = hs+tableLength;
  const descriptors = [];
  for (let off=hs;off<payloadBase;off+=8) descriptors.push({count:b.readUInt16BE(off),stride:b.readUInt16BE(off+2),off:b.readUInt32BE(off+4)});
  const body = ref => {const d=descriptors[ref];return b.subarray(payloadBase+d.off,payloadBase+d.off+d.count*d.stride);};
  const rootRef = b.readUInt32BE(16), rootStride=descriptors[rootRef].stride;
  return {b,hs,descriptors,payloadBase,body,rootRef,rootStride,roots:descriptors[rootRef].count,
    root:n=>body(rootRef).subarray(n*rootStride,(n+1)*rootStride)};
}
function assertReciprocalGraph(input) {
  const r=rawMmd(input), edges=r.body(r.b.readUInt32BE(20)), occurrences=new Map();
  for(let n=0;n<r.roots;n++) {
    const ref=r.root(n).readUInt32BE(32); if(!ref)continue;
    const incident=r.body(ref);
    for(let i=0;i<incident.length;i+=4) {
      const edge=incident.readUInt16BE(i); assert.ok(edge*8<edges.length,`Node ${n} edge outside table`);
      assert.ok([edges.readUInt16BE(edge*8),edges.readUInt16BE(edge*8+4)].includes(n),`Node ${n} references unrelated edge ${edge}`);
      const key=`${edge}:${n}`;occurrences.set(key,(occurrences.get(key)||0)+1);
    }
  }
  for(let p=0;p<edges.length;p+=8) for(const n of [edges.readUInt16BE(p),edges.readUInt16BE(p+4)]) {
    assert.ok(n<r.roots);assert.equal(occurrences.get(`${p/8}:${n}`),1,`Edge ${p/8} must occur at both endpoints exactly once`);
  }
}
function patchWord(body,offset,value,size=4) {const b=bytes(body);size===2?b.writeUInt16BE(value,offset):b.writeUInt32BE(value,offset);return b;}

fixture('all 18 original MAIN/ZONE files roundtrip byte-for-byte and validate their graphs', () => {
  const names=files.filter(f=>f.endsWith('.mmd'));
  assert.equal(names.length,18,'Expected Galaxy, Tutorial and all sixteen Battle Zones');
  for(const name of names) {
    const original=read(name),d=new MmdDocument(original);
    same(d.encode(),original,name);assert.deepEqual(d.validateGraph(),[],name);
    if(d.magic==='MAIN')assertReciprocalGraph(original);
  }
});

fixture('all original preset DAT namespaces roundtrip byte-for-byte, including extensionless Battle Zone tables',()=>{
  const names=files.filter(f=>f.startsWith('preset_'));
  assert.equal(names.length,7);
  for(const name of names) {
    const kind=name.includes('appearance')?'appearance':name.includes('strength')?'strength':'preset';
    const original=read(name),d=new DatDocument(original,kind);
    assert.equal(d.count,original.readUInt32BE(0),name);same(d.encode(),original,name);
  }
});

fixture('fixed mission scalar edits change only the exact big-endian field bytes',()=>{
  for(const name of files.filter(f=>f.endsWith('.mmd'))) {
    const original=read(name),d=new MmdDocument(original),r=rawMmd(original);
    for(const spec of Mmd.schemas[d.magic].filter(s=>s.type!=='ref')) {
      const copy=new MmdDocument(original),row=copy.readRoot(0),old=Mmd.readField(row,spec);
      const value=spec.type==='f32'?old+0.25:old===0?1:0;
      Mmd.writeField(row,spec,value);copy.writeRoot(0,row);
      const expected=Buffer.from(original),offset=r.payloadBase+r.descriptors[r.rootRef].off+spec.offset;
      if(spec.type==='f32')expected.writeFloatBE(value,offset);
      else if(spec.type==='u16')expected.writeUInt16BE(value,offset);
      else expected.writeUInt32BE(value,offset);
      same(copy.encode(),expected,`${name} ${spec.key}`);
    }
  }
});

fixture('unknown MAIN header words and DAT reserved header bytes survive edits and appends',()=>{
  const original=read('galaxy.mmd');original.writeUInt32BE(0xA1B2C3D4,32);
  const m=new MmdDocument(original),row=m.readRoot(117);row[9]=8;m.writeRoot(117,row);
  assert.equal(bytes(m.encode()).readUInt32BE(32),0xA1B2C3D4);
  for(const [name,kind] of [['preset_appearance_table.dat','appearance'],['preset_strength_table.dat','strength'],['preset_character_galaxy.dat','preset']]) {
    const before=read(name);for(let i=4;i<16;i++)before[i]=i*13;
    const d=new DatDocument(before,kind),oldCount=d.count,oldRow=d.row(0),copy=d.row(0);copy[0]=1;d.setRow(0,copy);
    assert.equal(d.appendRow(oldRow),oldCount);
    const after=bytes(d.encode());same(after.subarray(4,16),before.subarray(4,16));
    same(after.subarray(16+d.stride,16+oldCount*d.stride),before.subarray(16+d.stride));
    same(after.subarray(16+oldCount*d.stride),before.subarray(16,16+d.stride));
    assert.equal(after.readUInt32BE(0),oldCount+1);
  }
});

fixture('DAT selected-word edits preserve every other byte in the table',()=>{
  for(const [name,kind,index,word,value] of [
    ['preset_appearance_table.dat','appearance',0,3,3],
    ['preset_strength_table.dat','strength',330,4,0x156],
    ['preset_character_galaxy.dat','preset',815,3,0xFFFFFFFF]
  ]) {
    const before=read(name),d=new DatDocument(before,kind),row=d.row(index);row[word]=value;d.setRow(index,row);
    const expected=patchWord(before,16+index*d.stride+word*4,value);same(d.encode(),expected);
    assert.equal(new DatDocument(d.encode(),kind).row(index)[word],value);
  }
});

fixture('Hatchiyack conditional candidates and Tutorial ally/action lists decode independently',()=>{
  const galaxy=new MmdDocument(read('galaxy.mmd')),tutorial=new MmdDocument(read('tutorial.mmd'));
  const allies=galaxy.getRoster(491,'allies').entries,enemies=galaxy.getRoster(491,'enemies').entries;
  assert.deepEqual(allies.map(r=>r.preset),[18,11,6,25,1]);assert.equal(enemies.length,6);
  assert.equal(allies.filter(r=>Mmd.evaluateExpression(Mmd.parseExpression(galaxy.body(r.condition)).ast,{selectedNative:0})).length,4);
  assert.equal(allies.filter(r=>Mmd.evaluateExpression(Mmd.parseExpression(galaxy.body(r.condition)).ast,{selectedNative:99})).length,0);
  assert.deepEqual(tutorial.getRoster(5,'allies').entries.map(r=>r.preset),[7,8,9,24]);
  assert.equal(tutorial.getActions(5).length,9);assert.equal(bytes(tutorial.readRoot(5)).readUInt16BE(8),14);
  same(tutorial.encode(),read('tutorial.mmd'));
});

fixture('roster resizing detaches its group and preserves original descriptors, conditions and opaque words',()=>{
  const d=new MmdDocument(read('galaxy.mmd')),original=new MmdDocument(d.encode());
  const before=d.getRoster(491,'allies'),entries=before.entries.map(x=>({...x}));entries[0].preset=25;entries[0].opaque=0xABCD;entries.push({...entries[1],preset:1});
  d.setRoster(491,'allies',entries);const check=new MmdDocument(d.encode());
  assert.deepEqual(check.getRoster(491,'allies').entries,entries);
  for(let ref=0;ref<original.descriptors.length;ref++)if(ref!==original.rootRef)same(check.body(ref),original.body(ref),`old descriptor ${ref}`);
  for(let n=0;n<original.rootCount;n++)if(n!==491)same(check.readRoot(n),original.readRoot(n),`other mission ${n}`);
  assertReciprocalGraph(check.encode());
});

fixture('action count, signed direct parameter and numeric expression references survive serialization',()=>{
  const d=new MmdDocument(read('tutorial.mmd')),before=d.getActions(5),oldBodies=d.descriptors.map((_,i)=>d.body(i));
  const expr=d.append(Mmd.constantExpression(2000),1,16);
  const wanted=[...before,{action:94,parameter:-1,expression:expr}];d.setActions(5,wanted);
  const check=new MmdDocument(d.encode());assert.deepEqual(check.getActions(5),wanted);
  assert.equal(Mmd.evaluateExpression(Mmd.parseExpression(check.body(expr)).ast),2000);
  assert.deepEqual(check.getRoster(5,'allies').entries.map(r=>r.preset),[7,8,9,24]);
  for(let i=0;i<oldBodies.length;i++)if(i!==d.rootRef)same(check.body(i),oldBodies[i]);
  assert.throws(()=>d.setActions(0,Array.from({length:21},()=>({action:1,parameter:-1,expression:0}))),/20/);
});

fixture('new Galaxy mission gets a root, owner membership, independent child lists and reciprocal edge',()=>{
  const original=new MmdDocument(read('galaxy.mmd')),d=new MmdDocument(original.encode()),oldOwner=d.getOwner(66),oldEdges=d.getEdges();
  const added=d.duplicateMission(117,{owner:66,connectTo:117,x:64,y:18.5});assert.equal(added,498);
  const check=new MmdDocument(d.encode());assert.equal(check.rootCount,499);assert.equal(check.getEdges().length,516);
  assert.deepEqual(check.getOwner(66).nodes,[...oldOwner.nodes,{node:498,opaque:0}]);
  assert.deepEqual(check.getEdges().slice(0,515),oldEdges);assertReciprocalGraph(check.encode());assert.deepEqual(check.validateGraph(),[]);
  const newRow=check.readRoot(498),oldRow=original.readRoot(117);assert.equal(new DataView(newRow.buffer).getFloat32(4,false),18.5);
  for(let off=8;off<32;off++)assert.equal(newRow[off],oldRow[off],`copied scalar byte ${off}`);
  assert.deepEqual(check.getRoster(498,'enemies').entries,original.getRoster(117,'enemies').entries);
  const root117=check.readRoot(117);same(root117.subarray(0,32),oldRow.subarray(0,32));same(root117.subarray(36),oldRow.subarray(36));
  for(let n=0;n<498;n++)if(n!==117)same(check.readRoot(n),original.readRoot(n),`original mission ${n}`);
  const changed=check.getRoster(498,'enemies').entries;changed[0].preset=496;check.setRoster(498,'enemies',changed);
  assert.deepEqual(check.getRoster(117,'enemies').entries,original.getRoster(117,'enemies').entries);
});

fixture('Battle Zone lists are stamps/rewards/next nodes and preserve conditional references when editing',()=>{
  for(const name of files.filter(f=>f.startsWith('zone_')&&f.endsWith('.mmd'))) {
    const d=new MmdDocument(read(name)),before=d.encode(),raw=rawMmd(before),root=d.readRoot(0);
    const newCriteria=Buffer.alloc(8);newCriteria.writeUInt32BE(0,0);newCriteria.writeUInt32BE(12,4);d.setList(0,40,newCriteria,4);
    const check=new MmdDocument(d.encode());same(check.getList(0,40,4),newCriteria);
    assert.equal(bytes(check.readRoot(0)).readUInt32BE(44),bytes(root).readUInt32BE(44));
    for(let i=0;i<raw.descriptors.length;i++)if(i!==d.rootRef)same(check.body(i),raw.body(i));
    assert.deepEqual(check.validateGraph(),[]);
  }
});

fixture('duplicate failure is atomic and invalid input cannot silently truncate or overflow',()=>{
  const d=new MmdDocument(read('galaxy.mmd')),before=d.encode();
  assert.throws(()=>d.duplicateMission(117,{owner:900,connectTo:117}));same(d.encode(),before);
  assert.throws(()=>d.duplicateMission(117,{owner:66,connectTo:9999}));same(d.encode(),before);
  assert.throws(()=>new MmdDocument(read('galaxy.mmd').subarray(0,100)));
  assert.throws(()=>new DatDocument(read('preset_strength_table.dat').subarray(0,100),'strength'));
  const row=d.readRoot(0);assert.throws(()=>Mmd.writeField(row,Mmd.MAIN.find(s=>s.key==='stage'),65536));
  assert.throws(()=>Mmd.writeField(row,Mmd.MAIN.find(s=>s.key==='x'),Infinity));
  const dat=new DatDocument(read('preset_strength_table.dat'),'strength'),s=dat.row(0);s[2]=-1;assert.throws(()=>dat.setRow(0,s));
});

test('postfix expressions keep native query argument order and signed arithmetic; unsafe forms rejected',()=>{
  const tokens=(...pairs)=>Mmd.encodeExpression([...pairs,[0,0]]);
  const query=Mmd.parseExpression(tokens([2,0],[2,5],[1,16])).ast;
  assert.equal(Mmd.evaluateExpression(query,{selectedNative:0}),1);assert.equal(Mmd.evaluateExpression(query,{selectedNative:99}),0);
  assert.equal(Mmd.evaluateExpression(Mmd.parseExpression(tokens([2,-7],[2,3],[1,36])).ast),-2);
  assert.equal(Mmd.evaluateExpression(Mmd.parseExpression(tokens([2,2147483647],[2,1],[1,33])).ast),-2147483648);
  assert.throws(()=>tokens([1,33]),/underflow/);assert.throws(()=>tokens([2,1],[2,0],[1,16]),/unsafe/);
  assert.throws(()=>tokens(...Array.from({length:33},()=>[2,1])),/32/);
});
