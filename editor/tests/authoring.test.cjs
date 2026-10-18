const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../js/mmd.js');require('../js/presets.js');require('../js/authoring.js');require('../js/data.js');require('../js/progression-data.js');require('../js/progression-ui.js');
const R=globalThis.RB2,root=process.env.RB2_TEST_FIXTURES||'/tmp/rb2-editor-test-fixtures',has=fs.existsSync(path.join(root,'galaxy.mmd')),v=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const file=()=>({name:'galaxy.mmd',kind:'main',doc:new R.MmdDocument(fs.readFileSync(path.join(root,'galaxy.mmd')))});
function create(f,overrides={}){return R.Authoring.createMission(f.doc,{donor:R.Authoring.findBasicDonor(f.doc),owner:66,predecessor:117,x:18,y:0,stage:8,music:1,difficulty:2,unlock:'after',...overrides});}
test('guided mission uses a basic donor and builds reciprocal links plus explicit predecessor gate',{skip:!has},()=>{
 const f=file(),d=f.doc,before=d.readRoot(238),first=d.readRoot(117),n=create(f);assert.equal(n,498);assert.equal(d.rootCount,499);assert.deepEqual(d.validateGraph(),[]);assert.deepEqual(d.readRoot(238),before);
 const row=v(d.readRoot(n));for(const o of [0x24,0x2c,0x30,0x38,0x3c,0x40,0x44,0x48,0x4c,0x50,0x54])assert.equal(row.getUint32(o),0);
 assert.equal(row.getUint16(16),0);assert.equal(row.getUint16(8),8);assert.equal(row.getUint16(18),0);
 const p=R.Mmd.parseExpression(d.body(row.getUint32(0x34)));assert.equal(p.preview,'query(type=2, argument=117)');
 assert.ok(d.getOwner(66).nodes.some(n=>n.node===498));assert.ok(d.getEdges().some(e=>e.a===117&&e.b===498));assert.deepEqual(first.slice(0,32),d.readRoot(117).slice(0,32));
});
test('save warnings distinguish original count from the confirmed 500-record corruption boundary',{skip:!has},()=>{
 const f=file();assert.deepEqual(R.Authoring.saveRisks(f),[]);create(f);assert.ok(R.Authoring.saveRisks(f).every(r=>r.severity==='warning'));create(f);assert.equal(f.doc.rootCount,500);assert.ok(R.Authoring.saveRisks(f).every(r=>r.severity==='warning'));create(f);assert.equal(f.doc.rootCount,501);assert.ok(R.Authoring.saveRisks(f).some(r=>r.severity==='danger'&&/corrupt/.test(r.message)));
 assert.ok(R.Authoring.saveRisks({...f,name:'tutorial.mmd'}).some(r=>/Tutorial/.test(r.message)));
});
test('invalid guided mission is rejected without partial file edits',{skip:!has},()=>{const f=file(),before=f.doc.encode();assert.throws(()=>create(f,{predecessor:238}),/preceding/);assert.deepEqual(f.doc.encode(),before);assert.throws(()=>create(f,{owner:3}),/populated/);assert.deepEqual(f.doc.encode(),before);});
test('two Boss candidates in Frieza Galaxy warn about the single native circle; an ordinary new fight fits',{skip:!has},()=>{
 const f=file(),d=f.doc;assert.ok(!R.Authoring.saveRisks(f).some(r=>r.code==='boss-circle-capacity'));
 const node=create(f,{owner:48,predecessor:177}),originalBoss=d.readRoot(177),row=d.readRoot(node);v(row).setUint16(10,4);d.writeRoot(node,row);
 const risks=R.Authoring.saveRisks(f).filter(r=>r.code==='boss-circle-capacity');assert.equal(risks.length,1);assert.equal(risks[0].owner,48);assert.deepEqual(risks[0].nodes,[177,498]);assert.match(risks[0].message,/Frieza.*only one Boss circle/);assert.match(risks[0].message,/visible together/);
 const renamed=R.Authoring.saveRisks(f,{characters:[{id:48,name:'Custom Galaxy'}]}).find(r=>r.code==='boss-circle-capacity');assert.match(renamed.message,/^Custom Galaxy:/);
 v(row).setUint16(10,0);d.writeRoot(node,row);assert.ok(!R.Authoring.saveRisks(f).some(r=>r.code==='boss-circle-capacity'));assert.deepEqual(d.readRoot(177),originalBoss);
});
test('additional world icon is independently flagged even when mission count fits',{skip:!has},()=>{const f=file(),d=f.doc,ref=v(d.header).getUint32(24),body=d.body(ref),b=new Uint8Array(body.length+28);b.set(body);b.set(body.slice(0,28),body.length);d.relocate(ref,b,67,28);assert.ok(R.Authoring.saveRisks(f).some(r=>r.severity==='danger'&&/icon 66/.test(r.message)));});
test('native circle budgets accept the original Galaxy and Tutorial maps and warn beyond each category pool',{skip:!has},()=>{
 for(const name of ['galaxy.mmd','tutorial.mmd']){const f={name,kind:'main',doc:new R.MmdDocument(fs.readFileSync(path.join(root,name)))};assert.deepEqual(R.Authoring.menuRisks(f),[]);}
 for(const [kind,capacity]of [[0,10],[1,3],[2,4],[3,5],[4,1],[5,3],[6,3],[7,0],[8,8]]){
  const f=file(),d=f.doc;create(f,{owner:48,predecessor:177});const owner=d.getOwner(48),members=owner.nodes.slice(0,capacity+1);owner.nodes=members;d.setOwner(48,owner);
  for(const n of members){const r=d.readRoot(n.node);v(r).setUint16(10,kind);d.writeRoot(n.node,r);}
  const risk=R.Authoring.menuRisks(f).find(r=>r.owner===48&&r.category===kind);assert.ok(risk,'category '+kind);assert.equal(risk.capacity,capacity);assert.equal(risk.nodes.length,capacity+1);assert.equal(risk.severity,'warning');
 }
 const f=file(),owner=f.doc.getOwner(48);owner.start=0;owner.nodes=Array.from({length:33},(_,node)=>({node,opaque:0}));f.doc.setOwner(48,owner);const risk=R.Authoring.menuRisks(f).find(r=>r.code==='map-node-capacity');assert.equal(risk.capacity,32);assert.equal(risk.nodes.length,33);
});
test('ZONE uses finite integer coordinates and reports shared save cells, not displayed LV',{skip:!has},()=>{const f={name:'zone_green_square.mmd',kind:'zone',doc:new R.MmdDocument(fs.readFileSync(path.join(root,'zone_green_square.mmd')))};assert.deepEqual(R.Authoring.saveRisks(f),[]);const a=f.doc.readRoot(0);v(a).setUint32(16,999);f.doc.writeRoot(0,a);assert.deepEqual(R.Authoring.saveRisks(f),[]);v(a).setFloat32(0,15);f.doc.writeRoot(0,a);assert.ok(R.Authoring.saveRisks(f).some(r=>r.severity==='danger'));assert.equal(R.Authoring.zoneCell(-1,1),15);});
test('guided Battle Zone creation keeps native Stamp data and later edits detach from the donor',{skip:!has},()=>{
 const d=new R.MmdDocument(fs.readFileSync(path.join(root,'zone_green_square.mmd'))),stampRef=v(d.readRoot(1)).getUint32(0x28),criteria=d.getList(1,0x28,4);
 const id=R.Authoring.createMission(d,{donor:1,predecessor:0,x:1,y:1});
 assert.equal(v(d.readRoot(id)).getUint32(0x28),stampRef);assert.deepEqual(d.getList(id,0x28,4),criteria);
 const replacement=new Uint8Array(20);[0,1,3,4,5].forEach((x,i)=>v(replacement).setUint32(i*4,x));d.setList(id,0x28,replacement,4);
 assert.deepEqual(d.getList(1,0x28,4),criteria);assert.notEqual(v(d.readRoot(id)).getUint32(0x28),stampRef);
 assert.deepEqual(new R.MmdDocument(d.encode()).getList(id,0x28,4),replacement);
});
test('a donor without Stamp criteria is rejected before a partial Battle Zone is created',{skip:!has},()=>{
 const d=new R.MmdDocument(fs.readFileSync(path.join(root,'zone_green_square.mmd')));d.setList(1,0x28,new Uint8Array(),4);const before=d.encode();
 assert.throws(()=>R.Authoring.createMission(d,{donor:1,predecessor:0,x:1,y:1}),/Challenge Stamp/);assert.deepEqual(d.encode(),before);
});
test('new character defaults are independent complete row geometries and preserve native local moves',()=>{const app={data:R.DATA};const a=R.Authoring.newAppearance(app,20),s=R.Authoring.newStrength(),p=R.Authoring.newPreset(367,777);assert.deepEqual(a,[20,0,0,...R.DATA.characters.find(c=>c.id===20).defaultMoves]);assert.equal(a.length,8);assert.equal(s.length,22);assert.ok(s.slice(2).every(x=>x===0xffffffff));assert.equal(p.length,11);assert.deepEqual(p.slice(3),Array(8).fill(0xffffffff));assert.equal(R.Authoring.newPreset()[0],0xffffffff);});
test('reward names and encodings keep form, character, enhanced icon and picture namespaces separate',{skip:!has},()=>{const f=file(),app={data:R.DATA,characterName:id=>R.DATA.characters.find(x=>x.id===id)?.name||'Character '+id,itemName:id=>R.DATA.items.find(x=>x.id===id)?.name||'Item '+id};assert.match(R.rewardLabel(app,4,3,f.doc),/Super Saiyan 3/);assert.match(R.rewardLabel(app,10,0,f.doc),/^Goku · enhanced/);assert.match(R.rewardLabel(app,10,51,f.doc),/Android #13|Android 13/);assert.match(R.rewardLabel(app,8,296,f.doc),/Museum picture/);assert.match(R.rewardLabel(app,5,4,f.doc),/4 Limit Points/);assert.match(R.rewardLabel(app,2,2,f.doc),/costume index 2/);assert.equal(R.PROGRESSION.mission496.rule1,10);assert.deepEqual(R.PROGRESSION.mission496.modifiers,[296]);assert.deepEqual(R.PROGRESSION.mission496.ui50,[296]);assert.deepEqual(R.PROGRESSION.mission496.ui54,[]);});

test('basic donor search skips an empty opponent roster',{skip:!has},()=>{const f=file();f.doc.setRoster(238,'enemies',[]);assert.notEqual(R.Authoring.findBasicDonor(f.doc),238);});

test('first mission in an explicitly chosen empty form owner becomes entry without cross-Galaxy links or gates',{skip:!has},()=>{
 const f=file(),d=f.doc,before=d.encode(),edges=d.getEdges().length,donor=R.Authoring.findBasicDonor(d);
 assert.equal(d.getOwner(3).nodes.length,0);
 assert.throws(()=>create(f,{owner:3,allowEmpty:true}),/first mission/);assert.deepEqual(d.encode(),before);
 const n=R.Authoring.createMission(d,{owner:3,donor,allowEmpty:true,unlock:'open',stage:8,music:0,difficulty:2,x:72,y:64});
 assert.equal(n,498);assert.equal(d.getOwner(3).start,n);assert.deepEqual(d.getOwner(3).nodes,[{node:n,opaque:0}]);assert.equal(d.getEdges().length,edges);assert.equal(v(d.readRoot(n)).getUint32(0x34),0);assert.deepEqual(d.validateGraph(),[]);
 const again=new R.MmdDocument(d.encode());assert.equal(again.getOwner(3).start,n);assert.deepEqual(again.validateGraph(),[]);
});
