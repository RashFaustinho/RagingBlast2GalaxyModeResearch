const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');require('../js/mmd');require('../js/conditions');require('../js/authoring');
const R=globalThis.RB2,C=R.Conditions,F=process.env.RB2_TEST_FIXTURES||'/tmp/rb2-editor-test-fixtures',has=fs.existsSync(F+'/galaxy.mmd'),doc=()=>new R.MmdDocument(fs.readFileSync(F+'/galaxy.mmd'));
const q=(t,n)=>({op:'QUERY',args:[t,n]});
test('shared491 resolves both sides from all six native Galaxy perspectives',{skip:!has},()=>{const d=doc(),old=d.encode();for(const native of[0,5,11,17,24,99]){const c={mode:'main',selectedNative:native},a=C.roster(d,491,'allies',c).entries,e=C.roster(d,491,'enemies',c).entries;assert.equal(a.filter(e=>e.conditionInfo.state==='included').length,native===99?0:4);assert.deepEqual(e.filter(e=>e.conditionInfo.state==='included').map(e=>e.preset),native===99?[1032,1033,1034,1035,1036]:[1031]);assert.ok([...a,...e].every(e=>e.conditionInfo.state!=='unknown'));}assert.deepEqual(d.encode(),old);});
test('unavailable runtime context remains unknown; known boolean operands can prove a result',()=>{const unknown=q(2,117);assert.equal(C.evaluate(unknown,{selectedNative:0}),null);assert.equal(C.evaluate(q(5,0),{}),null);assert.equal(C.evaluate(q(5,0),{mode:'zone',selectedNative:0}),null);assert.equal(C.evaluate({op:'AND',args:[unknown,0]}),0);assert.equal(C.evaluate({op:'OR',args:[unknown,1]}),1);assert.equal(C.evaluate({op:'AND',args:[unknown,1]}),null);assert.equal(C.evaluate({op:'/',args:[1,0]}),null);});
test('readable names preserve query flags and Battle Zone context uncertainty',()=>{assert.equal(C.describe({op:'OR',args:[q(5,0),q(5,17)]},{characterName:id=>id===0?'Goku':'Vegeta'}),'Playing Galaxy: Goku or Vegeta');assert.match(C.describe(q(2,117)),/Mission 117.*0x08/);assert.match(C.describe(q(5,0),{mode:'zone'}),/Playing Galaxy/);});
test('simple Galaxy filters encode native postfix order and evaluate inclusion/exclusion',()=>{for(const mode of['only','except'])for(const ids of[[],[0],[0,17,99,0]]){const b=C.encodeRule(mode,ids),ast=R.Mmd.parseExpression(b).ast;for(const selectedNative of[0,5,17,99])assert.equal(C.evaluate(ast,{selectedNative}),+(mode==='only'?ids.includes(selectedNative):!ids.includes(selectedNative)));}assert.equal(C.encodeRule('always'),null);assert.throws(()=>C.encodeRule('only',[-1]),/Invalid/);});
test('malformed custom condition is not treated as excluded',{skip:!has},()=>{const d=doc(),ref=d.append(new Uint8Array(8),1,8);assert.equal(C.inspect(d,ref,{selectedNative:0}).state,'unknown');});
test('all sixteen original Zone files pass coordinate/save checks, including native X=2',{skip:!has},()=>{const names=fs.readdirSync(F).filter(n=>/^zone_.*\.mmd$/.test(n));assert.equal(names.length,16);let x2=0;for(const name of names){const d=new R.MmdDocument(fs.readFileSync(F+'/'+name));assert.deepEqual(R.Authoring.saveRisks({name,kind:'zone',doc:d}),[],name);for(let i=0;i<d.rootCount;i++){const b=d.readRoot(i),v=new DataView(b.buffer);if(v.getFloat32(0)===2)x2++;}}assert.ok(x2>20);});
test('Battle Zone storage check catches cell21 and distinguishes fractional aliasing',{skip:!has},()=>{const d=new R.MmdDocument(fs.readFileSync(F+'/zone_green_square.mmd')),f={name:'zone_green_square.mmd',kind:'zone',doc:d},r=d.readRoot(0),v=new DataView(r.buffer);v.setFloat32(0,2);v.setFloat32(4,0);d.writeRoot(0,r);assert.match(R.Authoring.saveRisks(f)[0].message,/saved cell 21/);assert.equal(R.Authoring.validZonePoint(2,0),false);assert.equal(R.Authoring.validZonePoint(2,1),true);v.setFloat32(0,.5);v.setFloat32(4,1);d.writeRoot(0,r);const issues=R.Authoring.saveRisks(f);assert.ok(issues.some(x=>/fractional/.test(x.message)));assert.ok(issues.some(x=>/share/.test(x.message)));assert.ok(issues.every(x=>x.severity==='warning'));});

 test('simple expression builder uses native query order, comparisons and one required End',()=>{
  for(const rule of [{kind:'query',type:5,argument:38,comparison:'truthy'},{kind:'query',type:1,argument:14,comparison:'>=',value:30},{kind:'query',type:1,argument:3,comparison:'>=',value:20},{kind:'except',argument:38},{kind:'never'}]){
   const b=C.encodeSimple(rule),parsed=R.Mmd.parseExpression(b);assert.equal(R.Mmd.validateExpression(b).valid,true);assert.deepEqual(C.simple(parsed.ast),rule.kind==='except'?rule:rule.kind==='never'?rule:{...rule,value:rule.value??0});const tokens=Array.from({length:b.length/8},(_,i)=>({kind:new DataView(b.buffer).getUint32(i*8),operand:new DataView(b.buffer).getInt32(i*8+4)}));assert.deepEqual(tokens.at(-1),{kind:0,operand:0});assert.equal(tokens.filter(t=>t.kind===0).length,1);
  }
  const program=C.encodeSimple({kind:'query',type:5,argument:38,comparison:'truthy'});assert.equal(C.describe(R.Mmd.parseExpression(program).ast,{characterName:id=>id===38?'Raditz':'?'}),'Playing Galaxy: Raditz');assert.equal(C.encodeSimple({kind:'always'}),null);assert.throws(()=>C.encodeSimple({kind:'custom'}));
 });
 test('health-percent reward and secret combo expressions are readable without guessing results',()=>{
  const a={op:'>=',args:[q(1,14),30]};assert.equal(C.describe(a,{mode:'zone'}),'(Remaining health (%) is at least 30)');assert.equal(C.evaluate(a,{mode:'zone'}),null);assert.match(C.describe(q(1,11),{mode:'zone'}),/Win with a Super Attack/);assert.match(C.describe(q(1,3)),/Maximum combo/);
  const t=[{kind:2,operand:38},{kind:2,operand:5},{kind:1,operand:16},{kind:0,operand:0}],c={characterName:()=> 'Raditz'};assert.match(C.tokenExplanation(t,0,c),/Native character ID 38: Raditz/);assert.match(C.tokenExplanation(t,1,c),/Query type 5/);assert.match(C.tokenExplanation(t,2,c),/Query operator 16/);assert.match(C.tokenExplanation(t,3,c),/required final terminator/);
 });
test('Battle Zone route explanation keeps destinations, secret metadata and native slot requirement separate',{skip:!has},()=>{
 const d=new R.MmdDocument(fs.readFileSync(F+'/zone_red_triangle.mmd')),before=d.encode(),r=C.zoneRoutes(d,1,'zone_red_triangle.mmd');assert.equal(r.ordinaryCount,1);assert.deepEqual(r.routes.map(x=>[x.id,x.secret]),[[3,true],[2,false]]);assert.match(r.requirement,/Win with a Super Attack/);assert.equal(r.routes[0].condition,'Win with a Super Attack');assert.equal(r.routes[1].condition,'Always');assert.deepEqual(d.encode(),before);
});

test('advanced readable builder recognizes every multi-Galaxy condition in shared mission 491', {skip:!has},()=>{
 const d=doc(),before=d.encode();let multiple=0;
 for(const side of ['allies','enemies'])for(const entry of d.getRoster(491,side).entries){
  if(!entry.condition)continue;
  const ast=R.Mmd.parseExpression(d.body(entry.condition)).ast,filter=C.galaxyRule(ast),simple=C.simple(ast);
  assert.notEqual(simple.kind,'custom');
  const encoded=C.encodeSimple(simple),parsed=encoded?R.Mmd.parseExpression(encoded).ast:1;
  if(filter.natives.length>1){multiple++;assert.deepEqual(simple.natives,filter.natives);}
  for(let selectedNative=0;selectedNative<100;selectedNative++)assert.equal(C.evaluate(parsed,{selectedNative}),C.evaluate(ast,{selectedNative}));
  if(encoded){assert.equal(R.Mmd.validateExpression(encoded).valid,true);assert.deepEqual([...encoded.slice(-8)],[0,0,0,0,0,0,0,0]);}
 }
 assert.ok(multiple>=4);assert.deepEqual(d.encode(),before);
});
test('multi-character Only and Except drafts retain all selections and reject malformed native IDs',()=>{
 for(const kind of ['galaxy','except']){const rule={kind,natives:[5,11,24,0]},b=C.encodeSimple(rule),ast=R.Mmd.parseExpression(b).ast;assert.deepEqual(C.simple(ast),rule);for(const selectedNative of[0,5,11,17,24])assert.equal(C.evaluate(ast,{selectedNative}),+(kind==='galaxy'?rule.natives.includes(selectedNative):!rule.natives.includes(selectedNative)));}
 assert.throws(()=>C.encodeSimple({kind:'galaxy',natives:[-1]}),/Invalid/);
 assert.equal(C.evaluate(R.Mmd.parseExpression(C.encodeSimple({kind:'galaxy',natives:[]})).ast),0);
});

test('MAIN clear-history and availability queries have distinct human names and remain unknown offline',()=>{
 assert.equal(C.describe(q(2,117)),'Mission 117 has been cleared (0x08)');
 assert.equal(C.describe(q(3,117)),'Mission 117 is unlocked / available (0x02)');
 for(const type of[2,3]){assert.equal(C.evaluate(q(type,117)),null);assert.match(C.describe(q(type,117),{mode:'zone'}),/Context callback/);const b=C.encodeSimple({kind:'query',type,argument:117,comparison:'truthy'});assert.equal(C.simple(R.Mmd.parseExpression(b).ast).type,type);}
 assert.match(C.tokenExplanation([{kind:2,operand:117},{kind:2,operand:2},{kind:1,operand:16},{kind:0,operand:0}],1),/returns 8 or 0/);
});

test('Battle Zone token help does not assign MAIN progression meanings to context callbacks',()=>{
 for(const type of[2,3]){
  const tokens=[{kind:2,operand:117},{kind:2,operand:type},{kind:1,operand:16},{kind:0,operand:0}];
  assert.match(C.tokenExplanation(tokens,1,{mode:'zone'}),/Context-specific callback.*not mapped/);
  assert.doesNotMatch(C.tokenExplanation(tokens,1,{mode:'zone'}),/0x08|0x02|returns [28] or 0/);
  assert.match(C.tokenExplanation(tokens,0,{mode:'zone'}),/Context callback/);
  assert.match(C.tokenExplanation(tokens,1,{mode:'main'}),type===2?/returns 8 or 0/:/returns 2 or 0/);
 }
});
