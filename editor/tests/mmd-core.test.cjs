'use strict';
// Node's built-in runner; synthetic fixtures contain no copyrighted game data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../js/mmd.js');
const {MmdDocument:D,Mmd:M}=globalThis.RB2;
const dv=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
function fixture(magic='MAIN',alias=false) {
  const hs=magic==='MAIN'?36:20,rs=magic==='MAIN'?92:56;
  const payload=new Uint8Array(rs*2+(magic==='MAIN'?20:0)),p=dv(payload);
  for(let i=0;i<2;i++){p.setFloat32(i*rs,i*10);p.setFloat32(i*rs+4,25);p.setUint32(i*rs+(magic==='MAIN'?88:36),0x7fa1c002);}
  const descriptors=[[0,0,0],[2,rs,0]];
  if(magic==='MAIN') {
    descriptors.push([0,8,rs*2],[1,12,rs*2],[2,4,rs*2+12]);
    p.setUint32(rs*2+4,4);p.setUint16(rs*2+16,1);
  }
  if(alias)descriptors.push([2,rs,0]);
  const b=new Uint8Array(hs+descriptors.length*8+payload.length),v=dv(b);
  b.set(Array.from(magic,c=>c.charCodeAt(0)));v.setUint32(4,magic==='MAIN'?0x60000:0x10000);v.setUint32(8,descriptors.length*8);v.setUint32(12,payload.length);v.setUint32(16,1);
  if(magic==='MAIN'){v.setUint32(20,2);v.setUint32(28,3);}
  descriptors.forEach(([n,s,o],i)=>{v.setUint16(hs+i*8,n);v.setUint16(hs+i*8+2,s);v.setUint32(hs+i*8+4,o);});b.set(payload,hs+descriptors.length*8);return b;
}
test('MAIN and ZONE untouched roundtrip is byte-identical',()=>{
  for(const magic of ['MAIN','ZONE']){const b=fixture(magic),d=new D(b);assert.deepEqual(d.encode(),b);assert.deepEqual(d.validateGraph(),[]);}
});
test('Known root field edit preserves every unrelated byte',()=>{
  const b=fixture(),d=new D(b),row=d.readRoot(0);M.writeField(row,M.MAIN.find(x=>x.key==='stage'),8);d.writeRoot(0,row);
  const expected=b.slice();dv(expected).setUint16(d.rootOffset(0)+8,8);assert.deepEqual(d.encode(),expected);
});
test('Root edit detaches overlapping descriptor ranges',()=>{
  const d=new D(fixture('MAIN',true)),aliased=d.body(5),row=d.readRoot(0);dv(row).setUint16(8,3);d.writeRoot(0,row);assert.deepEqual(d.body(5),aliased);assert.equal(dv(d.readRoot(0)).getUint16(8),3);
});
test('Roster edits isolate a shared root reference',()=>{
  const d=new D(fixture());d.setRoster(0,'enemies',[{preset:2,opaque:9,condition:0}]);const r=d.readRoot(1);dv(r).setUint32(40,dv(d.readRoot(0)).getUint32(40));d.writeRoot(1,r);
  d.setRoster(0,'enemies',[{preset:7,opaque:9,condition:0}]);assert.equal(d.getRoster(1,'enemies').entries[0].preset,2);assert.equal(d.getRoster(0,'enemies').entries[0].preset,7);
});
test('Duplicate creates independent tree, adds owner membership and reciprocal edge',()=>{
  const d=new D(fixture());d.setRoster(0,'allies',[{preset:4,opaque:0,condition:0}]);d.setActions(0,[{action:1,parameter:-1,expression:0}]);
  const source=d.readRoot(0),other=d.readRoot(1);const id=d.duplicateMission(0,{owner:0,connectTo:0,x:45,y:-2});
  assert.equal(id,2);assert.equal(d.rootCount,3);assert.deepEqual(d.getOwner(0).nodes.map(x=>x.node),[0,1,2]);assert.deepEqual(d.validateGraph(),[]);
  assert.deepEqual(d.readRoot(1),other);assert.notEqual(dv(source).getUint32(36),dv(d.readRoot(id)).getUint32(36));assert.notEqual(dv(source).getUint32(60),dv(d.readRoot(id)).getUint32(60));
  d.setRoster(id,'allies',[{preset:8,opaque:0,condition:0}]);assert.equal(d.getRoster(0,'allies').entries[0].preset,4);assert.equal(new D(d.encode()).rootCount,3);
});
test('Rejected duplicate rolls back all bytes',()=>{
  const d=new D(fixture()),original=d.encode();assert.throws(()=>d.duplicateMission(0,{owner:44}));assert.deepEqual(d.encode(),original);
});
test('ZONE duplicate preserves level and warns about coordinate-based progress',()=>{
  const d=new D(fixture('ZONE'));const id=d.duplicateMission(1,{connectTo:0});assert.equal(id,2);assert.deepEqual(d.validateGraph(),[]);assert.ok(d.warnings.some(x=>/integer grid cell/.test(x)));assert.equal(dv(d.getList(0,52,4)).getUint32(0),2);
});
test('Empty lists use absent reference without overwriting descriptor zero',()=>{
  const d=new D(fixture()),before=d.body(0);d.setActions(0,[{action:1}]);d.setActions(0,[]);assert.equal(dv(d.readRoot(0)).getUint32(60),0);assert.deepEqual(d.body(0),before);
});
test('Removing an edge remaps incident indices and preserves local opaque metadata',()=>{
  const d=new D(fixture());d.setEdges([{a:0,b:1},{a:0,b:1}]);
  const list=d.getList(0,32,4);dv(list).setUint16(6,0xbeef);d.setList(0,32,list,4);
  d.setEdges(d.getEdges().slice(1));const edited=d.getList(0,32,4);
  assert.equal(edited.length,4);assert.equal(dv(edited).getUint16(0),0);assert.equal(dv(edited).getUint16(2),0xbeef);assert.deepEqual(d.validateGraph(),[]);
});
test('Perfect Action buffer limit is enforced',()=>{
  const d=new D(fixture());assert.throws(()=>d.setActions(0,Array.from({length:21},()=>({action:1}))),/20/);
});
test('Expressions implement native query pop order and signed arithmetic',()=>{
  const b=M.encodeExpression([[2,66],[2,5],[1,16],[0,0]]),p=M.parseExpression(b);assert.equal(p.preview,'query(type=5, argument=66)');assert.equal(M.evaluateExpression(p.ast,{selectedNative:66}),1);assert.equal(M.evaluateExpression(p.ast,{selectedNative:0}),0);
  const divide=M.parseExpression(M.encodeExpression([[2,-7],[2,2],[1,36],[0,0]])).ast;assert.equal(M.evaluateExpression(divide),-3);
  assert.equal(M.evaluateExpression(M.parseExpression(M.encodeExpression([[2,2147483647],[2,1],[1,33],[0,0]])).ast),-2147483648);
});
test('Unsafe expressions are rejected',()=>{
  for(const tokens of [[[2,1]],[[1,33],[0,0]],[[2,1],[2,0],[1,16],[0,0]],[[2,1],[1,17],[0,0]],Array.from({length:33},()=>[2,1]).concat([[0,0]])])assert.throws(()=>M.encodeExpression(tokens));
});
test('Malformed magic, version, sizes, descriptor bounds, root references rejected',()=>{
  for(const mutate of [b=>b[0]=0,b=>dv(b).setUint32(4,1),b=>dv(b).setUint32(8,1),b=>dv(b).setUint32(36+8+4,0xffffff00),b=>dv(b).setUint32(16,999),b=>dv(b).setUint32(36+5*8+36,999)]){const b=fixture();mutate(b);assert.throws(()=>new D(b));}
});
test('Field helpers reject overflow and non-finite float',()=>{
  const r=new Uint8Array(92);assert.throws(()=>M.writeField(r,M.MAIN[0],NaN));assert.throws(()=>M.writeField(r,M.MAIN.find(f=>f.key==='stage'),65536));assert.throws(()=>M.writeField(r,M.MAIN.find(f=>f.key==='time'),-1));
});
