const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../js/mmd.js');require('../js/authoring.js');
const R=globalThis.RB2,A=R.Authoring,base=path.join(process.env.RB2_TEST_FIXTURES||'/tmp/rb2-editor-test-fixtures','galaxy.mmd'),has=fs.existsSync(base),v=b=>new DataView(b.buffer,b.byteOffset,b.byteLength),doc=()=>new R.MmdDocument(fs.readFileSync(base));
const create=(d,owner=66,predecessor=117)=>A.createMission(d,{owner,predecessor,donor:A.findBasicDonor(d),x:22,y:26,stage:8,music:0,difficulty:2,unlock:'after'});
const query=(id,type=2)=>R.Mmd.encodeExpression([{kind:2,operand:id},{kind:2,operand:type},{kind:1,operand:16},{kind:0,operand:0}]);
function bodyList(rows,width){const b=new Uint8Array(rows.length*width*4),w=v(b);rows.flat().forEach((n,i)=>w.setUint32(i*4,n,false));return b;}
test('delete frees its ID without renumbering other root records, removes reciprocal edges and redirects known nested dependencies',{skip:!has},()=>{
 const d=doc(),first=create(d),second=create(d,66,first),rows=Array.from({length:d.rootCount},(_,i)=>d.readRoot(i));
 const ref=d.getExpression(second,0x34).ref;
 // The same expression may be used by multiple nested consumers. It must stay valid.
 d.setRoster(238,'enemies',[{preset:496,condition:ref,opaque:13}]);d.setActions(238,[{action:1,parameter:0,expression:ref}]);d.setList(238,0x2c,bodyList([[9,ref]],2),8);
 const ors=new Uint8Array(12),ov=v(ors);ov.setUint16(0,2);ov.setUint16(2,first);ov.setUint16(4,5);ov.setUint16(6,first);d.setList(238,0x38,ors,4);
 d.setExpression(239,0x30,query(first,3));d.setExpression(239,0x34,query(first,5));
 const nativeBefore=d.getExpression(239,0x34).bytes,info=A.missionDependencies(d,first);assert.ok(info.references.some(r=>r.field==='enemies candidate 1'));assert.ok(info.references.some(r=>r.field==='Perfect Action 1'));assert.ok(info.references.some(r=>r.field==='Conditional reward 1'));
 A.deleteMission(d,{node:first,redirectTo:117,reconnect:true});assert.equal(d.rootCount,500);assert.ok(d.getEdges().some(e=>(e.a===117&&e.b===second)||(e.b===117&&e.a===second)));assert.ok(!A.missionOwners(d,first).length);assert.ok(!d.getEdges().some(e=>e.a===first||e.b===first));assert.deepEqual(d.validateGraph(),[]);
 assert.equal(d.getExpression(second,0x34).preview,'query(type=2, argument=117)');assert.equal(d.getExpression(239,0x30).preview,'query(type=3, argument=117)');assert.deepEqual(d.getExpression(239,0x34).bytes,nativeBefore);assert.equal(d.getRoster(238,'enemies').entries[0].opaque,13);assert.equal(R.Mmd.parseExpression(d.body(ref)).preview,'query(type=2, argument=117)');
 const after=v(d.getList(238,0x38,4));assert.equal(after.getUint16(2),117);assert.equal(after.getUint16(6),first);assert.deepEqual(d.readRoot(second).slice(0,32),rows[second].slice(0,32));
 const again=new R.MmdDocument(d.encode());assert.equal(again.rootCount,500);assert.deepEqual(again.validateGraph(),[]);assert.equal(A.missionDependencies(again,first).references.length,0);
});
test('deleting the only entry persists a reusable free ID after export and reload',{skip:!has},()=>{
 const d=doc(),before=Array.from({length:d.rootCount},(_,i)=>d.readRoot(i)),n=A.createMission(d,{owner:3,allowEmpty:true,donor:A.findBasicDonor(d),unlock:'open',x:1,y:2,stage:8,music:0,difficulty:2});
 A.deleteMission(d,{node:n,keepDependencies:true});assert.equal(d.rootCount,499);assert.deepEqual(d.getOwner(3).nodes,[]);assert.equal(d.getOwner(3).start,65535);before.forEach((row,i)=>assert.deepEqual(d.readRoot(i),row));
 const reloaded=new R.MmdDocument(d.encode());assert.deepEqual(reloaded.freeMissionIds(),[n]);assert.throws(()=>A.moveMission(reloaded,{node:n,target:3}),/free/);const reused=A.createMission(reloaded,{owner:3,allowEmpty:true,donor:A.findBasicDonor(reloaded),unlock:'open',x:9,y:8,stage:2,music:1,difficulty:4});assert.equal(reused,n);assert.equal(reloaded.rootCount,499);assert.deepEqual(reloaded.freeMissionIds(),[]);assert.equal(reloaded.getOwner(3).start,n);assert.deepEqual(new R.MmdDocument(reloaded.encode()).validateGraph(),[]);
});
test('moving a shared mission removes only its source perspective and retains edges used elsewhere',{skip:!has},()=>{
 const d=doc(),n=create(d),b=d.getOwner(1);b.start=117;b.nodes=[{node:117,opaque:7},{node:n,opaque:8}];d.setOwner(1,b);
 const before=d.readRoot(n);A.moveMission(d,{node:n,source:66,target:3,clearGates:true,keepDependencies:true});assert.deepEqual(A.missionOwners(d,n),[1,3]);assert.ok(d.getEdges().some(e=>e.a===117&&e.b===n));assert.equal(d.getOwner(3).start,n);assert.equal(v(d.readRoot(n)).getUint32(0x34),0);assert.deepEqual(d.readRoot(n).slice(0,32),before.slice(0,32));assert.deepEqual(d.validateGraph(),[]);
 const retained=d.getOwner(3);A.deleteMission(d,{node:n,owner:1,keepDependencies:true});assert.deepEqual(A.missionOwners(d,n),[3]);assert.deepEqual(d.getOwner(3),retained);assert.ok(!d.getEdges().some(e=>e.a===n||e.b===n));assert.deepEqual(d.validateGraph(),[]);
});
test('move reconnects to destination predecessor, replaces only chosen gates and preserves battle and team fields',{skip:!has},()=>{
 const d=doc(),n=create(d),old=d.readRoot(n);A.moveMission(d,{node:n,source:66,target:0,predecessor:238,clearGates:true,unlockAfter:true,keepDependencies:true});
 assert.ok(!d.getOwner(66).nodes.some(e=>e.node===n));assert.ok(d.getOwner(0).nodes.some(e=>e.node===n));assert.ok(d.getEdges().some(e=>(e.a===238&&e.b===n)||(e.a===n&&e.b===238)));assert.ok(!d.getEdges().some(e=>(e.a===117&&e.b===n)||(e.a===n&&e.b===117)));assert.equal(d.getExpression(n,0x34).preview,'query(type=2, argument=238)');
 assert.deepEqual(d.readRoot(n).slice(0,32),old.slice(0,32));assert.equal(v(d.readRoot(n)).getUint32(0x28),v(old).getUint32(0x28));assert.deepEqual(new R.MmdDocument(d.encode()).validateGraph(),[]);
});
test('dependency choices and invalid moves fail atomically, including errors after owner or gate edits',{skip:!has},()=>{
 const d=doc(),n=create(d),next=create(d,66,n),before=d.encode();
 assert.throws(()=>A.deleteMission(d,{node:n}),/dependencies/);assert.deepEqual(d.encode(),before);
 assert.throws(()=>A.deleteMission(d,{node:n,redirectTo:n}),/different/);assert.deepEqual(d.encode(),before);
 assert.throws(()=>A.moveMission(d,{node:n,source:66,target:3,redirectTo:117,unlockAfter:true,clearGates:true}),/preceding/);assert.deepEqual(d.encode(),before);assert.equal(d.getExpression(next,0x34).preview,'query(type=2, argument=498)');
 assert.throws(()=>A.moveMission(d,{node:n,source:66,target:66,keepDependencies:true}),/another/);assert.deepEqual(d.encode(),before);
});

test('repeated delete/create cycles reuse a low original ID at full Galaxy save capacity',{skip:!has},()=>{
 const d=doc();create(d);create(d);assert.equal(d.rootCount,500);const originalIDs=Array.from({length:d.rootCount},(_,i)=>d.readRoot(i));
 const id=238;A.deleteMission(d,{node:id,redirectTo:117,reconnect:true});assert.deepEqual(d.freeMissionIds(),[id]);
 for(let i=0;i<3;i++){
  const n=create(d);assert.equal(n,id);assert.equal(d.rootCount,500);assert.deepEqual(d.freeMissionIds(),[]);assert.deepEqual(d.validateGraph(),[]);A.deleteMission(d,{node:id,redirectTo:117,reconnect:true});assert.deepEqual(d.freeMissionIds(),[id]);
 }
 for(let i=0;i<d.rootCount;i++)if(i!==id)assert.deepEqual(d.readRoot(i).slice(0,32),originalIDs[i].slice(0,32));
});
test('a free ID cannot retain known incoming mission-state requirements, even when keeping queries was requested',{skip:!has},()=>{
 const d=doc(),n=create(d);create(d,66,n);const before=d.encode();assert.throws(()=>A.deleteMission(d,{node:n,keepDependencies:true}),/Redirect/);assert.deepEqual(d.encode(),before);assert.deepEqual(d.freeMissionIds(),[]);
});

test('original zero/unassigned roots are never implicitly treated as authoring free IDs',{skip:!has},()=>{const d=doc();assert.ok(Array.from({length:d.rootCount},(_,i)=>i).some(i=>d.readRoot(i).every(b=>b===0)));assert.deepEqual(d.freeMissionIds(),[]);assert.equal(create(d),498);});
