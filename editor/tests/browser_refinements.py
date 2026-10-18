"""0.6 empty Galaxy authoring, AFS-grouped exports and pending visual fixes."""
import hashlib,json,sys,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True)
FIX=Path('/tmp/rb2-editor-test-fixtures');HELP=Path('/workspace/research-rb2/advanced-20261015/battle_resident_param_m')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
sources=[ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))]
report={'version':'1.0','steps':[],'errors':[],'source_sha256':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources}}
try:
 with sync_playwright()as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('dialog',lambda d:d.accept());page.goto(url)
  files=[FIX/'galaxy.mmd',FIX/'preset_character_galaxy.dat',FIX/'preset_appearance_table.dat',FIX/'preset_strength_table.dat',HELP/'tutorial_message_table_01.dat'];page.locator('#file-input').set_input_files([str(f)for f in files]);page.wait_for_function('()=>app.files.length===5')
  page.evaluate("()=>{const f=app.files.find(f=>f.name==='galaxy.mmd');app.selectFile(f.id);const s=app.ui.mmd.galaxy.files[f.id];s.owner='0';s.node=238;app.refresh();}")
  flag=page.get_by_label('Show Empty Galaxies',exact=True);expect(flag).not_to_be_checked();rail=page.locator('.galaxy-rail');assert rail.locator('[data-galaxy]').count()==67;assert rail.locator('[data-galaxy="3"]').count()==0
  before=page.evaluate('()=>Array.from(app.files[0].doc.encode())');flag.check();assert rail.locator('[data-galaxy]').count()==101;assert rail.locator('[data-galaxy]').last.get_attribute('data-galaxy')=='-1';assert page.evaluate('()=>Array.from(app.files[0].doc.encode())')==before
  for n in [1,2,3]:
   image=rail.locator(f'[data-galaxy="{n}"] img');expect(image).to_have_attribute('src',f'assets/portraits/{n:03}.png');image.scroll_into_view_if_needed();expect(image).to_be_visible();assert image.evaluate('(i)=>i.complete&&i.naturalWidth>0')
  assert rail.locator('.galaxy-rail-medal').count()==0
  rail.locator('[data-galaxy="3"]').click();expect(page.get_by_role('heading',name='Empty Galaxy · Goku / Super Saiyan 3',exact=True)).to_be_visible();assert page.locator('.mission-title').count()==0
  page.get_by_role('button',name='Choose Galaxy / selected character',exact=True).click();assert page.locator('#app-dialog .galaxy-card').count()==101;page.locator('#app-dialog').get_by_role('button',name='Goku / Super Saiyan 3 Galaxy',exact=True).click()
  flag.uncheck();assert rail.locator('[data-galaxy]').count()==67;assert rail.locator('[data-galaxy="-1"]').get_attribute('aria-pressed')=='true';flag.check();rail.locator('[data-galaxy="3"]').click()
  page.screenshot(path=str(OUT/'empty-galaxies.png'),full_page=True)
  page.get_by_role('button',name='Create New Galaxy',exact=True).click();dialog=page.locator('#app-dialog');expect(dialog.get_by_label('New mission availability')).to_be_disabled();expect(dialog).to_contain_text('no predecessor');dialog.get_by_role('button',name='Create mission',exact=True).click()
  expect(page.locator('.mission-title h2')).to_have_text('Mission 498');assert page.evaluate("()=>{const d=app.files[0].doc,o=d.getOwner(3);return d.rootCount===499&&o.start===498&&o.nodes.length===1&&d.getEdges().every(e=>e.a!==498&&e.b!==498)&&d.validateGraph().length===0;}")
  page.locator('#undo').click();assert page.evaluate('()=>app.files[0].doc.getOwner(3).nodes.length')==0;expect(page.get_by_role('heading',name='Empty Galaxy · Goku / Super Saiyan 3',exact=True)).to_be_visible();page.locator('#redo').click();expect(page.locator('.mission-title h2')).to_have_text('Mission 498')
  report['steps'].append('Empty Galaxies hidden by default; all 100 native slots and loaded form icons shown when enabled; chooser agrees; flag changes no bytes; first-mission wizard creates a valid entry without cross-owner links; undo/redo restores both states')
  # Exercise all three archive destinations with actual binary documents, then inspect the downloaded ZIP independently.
  page.evaluate("()=>{for(const name of ['preset_strength_table.dat','tutorial_message_table_01.dat']){const f=app.files.find(f=>f.name===name);app.transact('Export grouping check',[f],()=>{if(f.kind==='help'){const rows=f.doc.rows.slice();rows[0]+=1;f.doc.setValues(rows);}else{const row=f.doc.row(0);row[0]+=1;f.doc.setRow(0,row);}});}}")
  expected=page.evaluate("()=>app.files.filter(f=>f.dirty).map(f=>({name:f.name,path:RB2.Archives.exportPath(f.name),bytes:Array.from(f.doc.encode())}))")
  expect(page.locator('#export-all')).to_contain_text('Export ALL edited files')
  with page.expect_download()as event:page.locator('#export-all').click()
  output=OUT/'grouped-edits.zip';event.value.save_as(output)
  with ZipFile(output)as z:
   assert z.testzip()is None;assert set(z.namelist())=={x['path']for x in expected}|{'Galaxy-Studio-export.json', 'Galaxy-Studio-session-log.json'}
   assert {x['path'].split('/')[0]for x in expected}=={'st_pack_progress_pt_ps3.afs','st_pack_boot_pt_ps3.afs','st_pack_battle_others_pt_ps3.afs'}
   for x in expected:assert z.read(x['path'])==bytes(x['bytes'])
   manifest=json.loads(z.read('Galaxy-Studio-export.json'));assert {x['path']for x in manifest['files']}=={x['path']for x in expected}
  report['steps'].append('Export ALL edited files downloads only dirty documents, grouped into all three correct AFS folders; every exported byte and manifest path checked independently')
  assert not report['errors'],report['errors'];report['result']='PASS';browser.close()
finally:server.shutdown();(OUT/'refinements-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
