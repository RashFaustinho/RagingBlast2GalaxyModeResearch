/* Optional private-fixture integration: node archive_real_roundtrip.cjs GAME_PS3_DIR OUTPUT_DIR */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.window=global;const A=require('../js/archives.js');for(const n of ['mmd','presets','help-tables'])require('../js/'+n+'.js');
const game=process.argv[2],out=process.argv[3];if(!game||!out)throw Error('Provide game AFS directory and private output directory.');fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const report={checks:[],errors:[],scope:'Private original BLES00978 AFS inputs, new output members only; no gameplay or executable changes.'};
 for(const [archive,name]of [['st_pack_progress_pt_ps3.afs','zone_green_square.mmd'],['st_pack_boot_pt_ps3.afs','preset_strength_table.dat'],['st_pack_battle_others_pt_ps3.afs','tutorial_message_table_01.dat']]){
  const file=await fs.openAsBlob(path.join(game,archive));Object.defineProperty(file,'name',{value:archive});const scan=await A.scan(file);assert.deepEqual(scan.warnings,[]);const locations=scan.found.filter(f=>f.name===name),original=locations[0].bytes;let replacement;
  if(name.endsWith('.mmd')){const d=new RB2.MmdDocument(original),row=d.readRoot(0);new DataView(row.buffer).setUint32(0x10,42);d.writeRoot(0,row);replacement=d.encode();assert.equal(locations.length,18);}
  else if(name.includes('strength')){const d=new RB2.DatDocument(original,'strength'),row=d.row(0);row[0]=(row[0]+1)%5;d.setRow(0,row);replacement=d.encode();}
  else{const d=new RB2.HelpDocument(original);d.rows[0]=d.rows[0]===1?2:1;replacement=d.encode();}
  const result=await A.rebuild(scan,[{name,bytes:replacement}]);assert.equal(result.changedEntries.length,locations.length);const after=await A.afsDirectory(result.blob),writes=[];
  for(const changed of result.changedEntries){const r=after.rows[changed.index],bytes=new Uint8Array(await result.blob.slice(r.offset,r.offset+r.size).arrayBuffer()),filename=archive+'.entry-'+r.index+'.zpak';fs.writeFileSync(path.join(out,filename),bytes);writes.push({index:r.index,file:filename,sha256:sha(bytes)});}
  fs.writeFileSync(path.join(out,name),replacement);report.checks.push({archive,target:name,copies:locations.length,expected_sha256:sha(replacement),changed_entries:result.changedEntries,members:writes,output_bytes:result.blob.size});
 }
 report.result='PASS';fs.writeFileSync(path.join(out,'node-roundtrip.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
