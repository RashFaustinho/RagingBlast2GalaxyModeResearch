const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.window=global;for(const n of ['data','mmd','presets','conditions','music','game-preview'])require('../js/'+n+'.js');const R=global.RB2,F=process.env.RB2_TEST_FIXTURES||'/tmp/rb2-editor-test-fixtures',has=fs.existsSync(path.join(F,'galaxy.mmd'));
function context(){const galaxy={name:'galaxy.mmd',doc:new R.MmdDocument(fs.readFileSync(path.join(F,'galaxy.mmd')))},table={kind:'preset',doc:new R.DatDocument(fs.readFileSync(path.join(F,'preset_character_galaxy.dat')),'preset')},appearance={kind:'appearance',doc:new R.DatDocument(fs.readFileSync(path.join(F,'preset_appearance_table.dat')),'appearance')};R.chooseMissionPresetTable=()=>table;return {app:{files:[table,appearance],data:R.DATA,ui:{},characterName:id=>R.DATA.characters.find(c=>c.id===id)?.name||'Character '+id,portrait:id=>R.DATA.characters.find(c=>c.id===id)?.portrait||''},file:galaxy,node:491,state:{owner:0},mode:'main'};}
test('live preview resolves shared Hatchiyack battle from each Galaxy, without changing bytes',{skip:!has},()=>{
 const c=context(),before=c.file.doc.encode();for(const id of [0,5,11,17,24,99]){c.state.owner=id;const m=R.GamePreview.model(c);assert.equal(m.enemies.length,id===99?5:1);assert.equal(m.allies.length,id===99?0:4);assert.equal(m.unresolved,false);if(id!==99)assert.equal(m.enemies[0].native,99);}assert.deepEqual(c.file.doc.encode(),before);
 c.state.owner=-1;const m=R.GamePreview.model(c);assert.equal(m.enemies.length,6);assert.equal(m.unresolved,true);assert.ok(m.enemies.every(e=>e.state==='unknown'));
});
test('preview distinguishes description selectors from effects and accepts visual-only drafts',{skip:!has},()=>{
 const c=context();c.node=496;const before=c.file.doc.encode(),m=R.GamePreview.model(c);assert.ok(m.rules.includes('Player: Health constantly decreases'));const draft=R.GamePreview.model(c,{14:6,18:0,20:0,8:8,12:20});assert.equal(draft.difficulty,'Ultimate');assert.equal(draft.stage,R.DATA.stages.find(s=>s.id===8).name);assert.equal(draft.music,R.DATA.music.find(s=>s.id===20).name);assert.deepEqual(draft.rules,[]);assert.deepEqual(c.file.doc.encode(),before);
 c.app.files=[];R.chooseMissionPresetTable=()=>null;const missing=R.GamePreview.model(c);assert.ok(missing.enemies.every(e=>e.native===null&&e.name.startsWith('Preset ')));
 c.mode='zone';c.node=0;c.file={doc:new R.MmdDocument(fs.readFileSync(path.join(F,'zone_green_square.mmd')))};
 const zoneBytes=c.file.doc.encode(),row=c.file.doc.readRoot(0),v=new DataView(row.buffer);v.setUint32(0x1C,8);v.setUint32(0x20,20);c.file.doc.writeRoot(0,row);const zone=R.GamePreview.model(c);assert.equal(zone.stage,R.DATA.stages.find(s=>s.id===8).name);assert.equal(zone.category,'Handicap');assert.equal(zone.objective,R.DATA.handicaps.find(x=>x.id===0).name);assert.equal(zone.music,'Automatic (Battle Zone)');assert.match(zone.musicNote,/value \(20\)/);
 const unknown=R.GamePreview.model(c,{28:65000,32:65001});assert.equal(unknown.stage,'Wasteland (fallback from selector 65000)');assert.equal(unknown.music,'Automatic (Battle Zone)');assert.match(unknown.musicNote,/65001/);assert.notDeepEqual(c.file.doc.encode(),zoneBytes);
});

test('all original Tutorial missions resolve arena 14 to the named Tutorial selector', {skip:!has},()=>{
 const c=context();c.file={name:'tutorial.mmd',doc:new R.MmdDocument(fs.readFileSync(path.join(F,'tutorial.mmd')))};const before=c.file.doc.encode();
 assert.equal(c.file.doc.rootCount,9);
 for(let node=0;node<c.file.doc.rootCount;node++){c.node=node;assert.equal(new DataView(c.file.doc.readRoot(node).buffer).getUint16(8),14);assert.equal(R.GamePreview.model(c).stage,'Tutorial / Practice (Tutorial selector)');}
 assert.deepEqual(c.file.doc.encode(),before);
});

test('Tutorial selector is not misrepresented as an ordinary Battle Zone arena', {skip:!has},()=>{const c=context();c.mode='zone';c.node=0;c.file={doc:new R.MmdDocument(fs.readFileSync(path.join(F,'zone_green_square.mmd')))};assert.equal(R.GamePreview.model(c,{28:14}).stage,'Wasteland (fallback from selector 14)');});

test('mod-specific expanded arena labels are preserved instead of applying the stock fallback', {skip:!has},()=>{const c=context();c.mode='zone';c.node=0;c.file={doc:new R.MmdDocument(fs.readFileSync(path.join(F,'zone_green_square.mmd')))};c.app.modEnabled=true;c.app.data={...R.DATA,stages:[...R.DATA.stages,{id:65000,name:'Mod Arena'}]};assert.equal(R.GamePreview.model(c,{28:65000}).stage,'Mod Arena');});
