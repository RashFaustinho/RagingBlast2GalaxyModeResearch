"""Actual UI coverage for Galaxy Studio 0.2; read-only original fixtures."""
import hashlib,json,threading,tempfile,sys,re
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1]if len(sys.argv)>1 else'/tmp/rb2-guided-qa');OUT.mkdir(parents=True,exist_ok=True)
FIX=Path('/tmp/rb2-editor-test-fixtures');HELP=Path('/workspace/research-rb2/advanced-20261015/battle_resident_param_m');ITEM=Path('/workspace/research-rb2/boot-entry22/parameters/item_parameter.dat')
files=sorted([p for p in FIX.iterdir()if p.suffix=='.mmd'or p.name.startswith('preset_')])+sorted(HELP.glob('tutorial_message_table_*.dat'))+[ITEM]
assert len(files)==35
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in files}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
sources=[ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))];tested_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sources}
report={'version':'1.0','steps':[],'errors':[],'external_requests':[],'dialogs':[]};answers=[]
try:
 with sync_playwright()as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.set_default_timeout(12000)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('request',lambda r:report['external_requests'].append(r.url)if r.url.startswith(('https://','http://'))and not r.url.startswith(url)else None)
  def dialog(d):
   report['dialogs'].append(d.message)
   if answers and not answers.pop(0):d.dismiss()
   else:d.accept()
  page.on('dialog',dialog)
  def selected(name):page.locator(f'#file-list button[title="{name}"]').click()
  def node(n,owner=0):
   selected('galaxy.mmd');page.evaluate('([n,o])=>{const f=app.files.find(x=>x.name==="galaxy.mmd"),s=app.ui.mmd.galaxy.files[f.id];s.node=n;s.owner=o;s.tab="mission";app.refresh();}',[n,owner])
  def sub(name):page.locator('nav.subtabs').get_by_role('button',name=name,exact=True).click()
  def count(name):return page.evaluate('(n)=>{const d=app.files.find(f=>f.name===n).doc;return d.count??d.rootCount;}',name)
  def download(selector,name):
   with page.expect_download()as event:page.locator(selector).click()
   path=OUT/name;event.value.save_as(path);return path
  page.goto(url);page.locator('#file-input').set_input_files([str(f)for f in files]);page.wait_for_function('() => app.files.length===35');assert not page.evaluate('app.files.some(f=>f.dirty)')
  for source in files:assert bytes(page.evaluate('(name)=>Array.from(app.files.find(f=>f.name===name).doc.encode())',source.name))==source.read_bytes()
  page.locator('[data-tab="home"]').click();expect(page.locator('table.file-requirements')).to_contain_text('item_parameter.dat');expect(page.locator('table.file-requirements')).to_contain_text('tutorial_message_table_01.dat')
  report['steps'].append('All 35 original MMD/DAT files import unchanged; Overview lists item definitions, help tables and extensionless Battle Zone containers')
  node(238,0);page.get_by_role('button',name='Choose Galaxy / selected character',exact=True).click();cards=page.locator('#app-dialog .galaxy-card');assert cards.count()==67;expect(cards.last).to_contain_text('All Missions');assert cards.first.locator('img').get_attribute('src').startswith('assets/portraits/')
  page.locator('#app-dialog').get_by_role('button',name='Goku Galaxy',exact=True).click();expect(page.locator('.galaxy-current')).to_contain_text('Goku');page.screenshot(path=str(OUT/'01-galaxy-picker.png'))
  report['steps'].append('Named portrait Galaxy chooser includes the 66 populated Galaxies and puts All Missions last')
  node(117,66);page.get_by_role('button',name='Create mission…',exact=True).click();expect(page.locator('#app-dialog')).to_be_visible();page.locator('#app-dialog .map-node[data-node="117"]').click();answers.append(False);page.locator('#app-dialog').get_by_role('button',name='Create mission',exact=True).click();assert count('galaxy.mmd')==498
  page.screenshot(path=str(OUT/'02-mission-wizard.png'));page.locator('#app-dialog').get_by_role('button',name='Create mission',exact=True).click();assert count('galaxy.mmd')==499
  assert page.evaluate('()=>{const f=app.files.find(f=>f.name==="galaxy.mmd");return f.doc.getOwner(66).nodes.some(n=>n.node===498)&&!f.doc.validateGraph().length;}')
  assert page.evaluate('()=>{const d=app.files.find(f=>f.name==="galaxy.mmd").doc,r=d.readRoot(498),v=new DataView(r.buffer);return [0x24,0x2c,0x30,0x38,0x3c,0x40,0x44,0x48,0x4c,0x50,0x54].every(o=>v.getUint32(o)===0)&&v.getUint16(16)===0;}')
  expect(page.locator('.mission-title h2')).to_have_text('Mission 498');page.locator('#undo').click();assert count('galaxy.mmd')==498;page.locator('#redo').click();assert count('galaxy.mmd')==499
  report['steps'].append('Visual wizard selects predecessor117, cancels a save warning without mutation, creates basic mission498 with clear gate and reciprocal links, and supports undo/redo')
  node(496,0);sub('Actions & rules');expect(page.get_by_role('heading',name='How the rule text, effect and icons work together')).to_be_visible();expect(page.locator('.relationship-grid')).to_contain_text('Health Auto-Loss');page.screenshot(path=str(OUT/'03-modifier-guide.png'))
  node(238,0);sub('Progression');expect(page.locator('#content')).to_contain_text('Galaxy transformation form');expect(page.locator('#content')).to_contain_text('Super Saiyan');page.screenshot(path=str(OUT/'04-unlock-rewards.png'))
  report['steps'].append('Modifier/caption/icon explanation resolves original496; named rewards and Goku form-unlock sources render in Progression')
  node(117,66);sub('Teams');page.get_by_role('button',name='Edit character preset',exact=True).first.click();expect(page.get_by_role('heading',name='Galaxy presets',exact=True)).to_be_visible();expect(page.get_by_role('button',name='← Back to mission 117',exact=True)).to_be_visible()
  old=page.evaluate('()=>{const s=app.ui.presets,f=app.files.find(f=>f.id===s.fileId),p=f.doc.row(s.index),a=app.files.find(f=>f.kind==="appearance");return {preset:s.index,appearance:p[0],before:Array.from(a.doc.encode()),moves:a.doc.row(p[0])};}')
  sub('Appearance & moves');expect(page.get_by_label('Super — Up',exact=True)).to_be_visible();page.get_by_label('Super — Up',exact=True).fill('0');path=download('#export-current','embedded-appearance.dat');expected=bytearray(old['before']);offset=16+old['appearance']*32+12;expected[offset:offset+4]=(0).to_bytes(4,'big');assert path.read_bytes()==expected
  assert page.evaluate('app.files.find(f=>f.id===app.selectedFileId).kind')=='preset';page.locator('#undo').click();sub('Strength & equipment');expect(page.get_by_label('Equipment slot 0',exact=True)).to_be_visible();page.screenshot(path=str(OUT/'05-character-tabs.png'));page.get_by_role('button',name='← Back to mission 117',exact=True).click();expect(page.locator('.mission-title h2')).to_have_text('Mission 117')
  report['steps'].append('Teams opens the exact preset; Appearance and Strength remain character tabs; pending embedded move edit exports the exact Appearance bytes; undo and return-to-mission work')
  selected('preset_character_galaxy.dat');beforecounts={n:count(n)for n in ['preset_character_galaxy.dat','preset_appearance_table.dat','preset_strength_table.dat']};page.get_by_role('button',name='New character preset…',exact=True).click();page.get_by_label('New preset character',exact=True).select_option('20');page.locator('#app-dialog').get_by_role('button',name='Create preset',exact=True).click()
  for n,c in beforecounts.items():assert count(n)==c+1
  assert page.evaluate('()=>{const f=app.files.find(f=>f.name==="preset_character_galaxy.dat"),p=f.doc.row(f.doc.count-1),a=app.files.find(f=>f.kind==="appearance"),s=app.files.find(f=>f.kind==="strength");return a.doc.row(p[0])[0]===20&&s.doc.row(p[1]).slice(2).every(v=>v===0xffffffff)&&p.slice(3).every(v=>v===0xffffffff);}')
  page.locator('#undo').click()
  for n,c in beforecounts.items():assert count(n)==c
  page.locator('#redo').click();page.get_by_label('Search DAT records',exact=True).fill(str(beforecounts['preset_character_galaxy.dat']));page.get_by_role('button',name=re.compile('^Preset '+str(beforecounts['preset_character_galaxy.dat'])+' ')).click();sub('Appearance & moves');appearancecount=count('preset_appearance_table.dat');page.get_by_role('button',name='Create new appearance for this character…',exact=True).click();expect(page.get_by_label('New appearance character',exact=True)).to_have_value('20');page.locator('#app-dialog').get_by_role('button',name='Create record',exact=True).click();assert count('preset_appearance_table.dat')==appearancecount+1;page.locator('#undo').click();assert count('preset_appearance_table.dat')==appearancecount;page.locator('#redo').click();assert count('preset_appearance_table.dat')==appearancecount+1
  report['steps'].append('New preset creates independent native20 Appearance/Strength/link rows atomically with undo/redo; a new per-character Appearance retains native defaults and is linked')
  selected('preset_strength_table.dat');n=count('preset_strength_table.dat');page.get_by_role('button',name='Create new strength…',exact=True).click();page.locator('#app-dialog').get_by_role('button',name='Create record',exact=True).click();assert count('preset_strength_table.dat')==n+1
  report['steps'].append('Standalone Strength creation appends a valid empty-equipment baseline')
  # New browser page: missing dependencies and unassigned new preset are genuine UI flows.
  missing=browser.new_page(viewport={'width':1500,'height':1000});missing.on('pageerror',lambda e:report['errors'].append(str(e)));missing.goto(url);missing.locator('#file-input').set_input_files(str(FIX/'preset_character_galaxy.dat'));missing.wait_for_function('() => app.files.length===1');missing.locator('nav.subtabs').get_by_role('button',name='Appearance & moves',exact=True).click();expect(missing.get_by_role('button',name='Load preset_appearance_table.dat…',exact=True)).to_be_visible()
  with missing.expect_file_chooser()as chooser:missing.get_by_role('button',name='Load preset_appearance_table.dat…',exact=True).click()
  chooser.value.set_files(str(FIX/'preset_appearance_table.dat'));missing.wait_for_function('() => app.files.length===2');expect(missing.get_by_label('Super — Up',exact=True)).to_be_visible();assert missing.evaluate('app.files.find(f=>f.id===app.selectedFileId).kind')=='preset'
  missing.get_by_role('button',name='New character preset…',exact=True).click();missing.locator('#app-dialog').get_by_role('button',name='Create preset',exact=True).click();missing.locator('nav.subtabs').get_by_role('button',name='Strength & equipment',exact=True).click();expect(missing.get_by_role('button',name='Load preset_strength_table.dat…',exact=True)).to_be_visible()
  with missing.expect_file_chooser()as chooser:missing.get_by_role('button',name='Load preset_strength_table.dat…',exact=True).click()
  chooser.value.set_files(str(FIX/'preset_strength_table.dat'));missing.wait_for_function('() => app.files.length===3');expect(missing.get_by_role('heading',name='This character has no assigned strength',exact=True)).to_be_visible();missing.get_by_role('button',name='Create new strength for this character…',exact=True).click();missing.locator('#app-dialog').get_by_role('button',name='Create record',exact=True).click();expect(missing.get_by_label('Equipment slot 0',exact=True)).to_be_visible()
  report['steps'].append('Missing Appearance/Strength tabs request the exact DAT via file picker, preserve character context, and offer a valid new record for an unassigned preset')
  # Known conflicting preset namespaces cannot be followed automatically from Teams.
  assert page.evaluate('()=>{const f=app.files.find(f=>f.name==="galaxy.mmd");return RB2.exactMissionPresetTable({mode:"main",file:f,app:{files:app.files.filter(f=>f.kind==="preset"&&/tutorial/.test(f.name))}})===null;}')
  report['steps'].append('Teams actions require the matching mode container; an available Tutorial table cannot silently become a Galaxy preset dependency')
  # Export-level risks from raw/imported records cannot bypass the prompt.
  node(117,66);page.evaluate('()=>{const f=app.files.find(f=>f.name==="galaxy.mmd");while(f.doc.rootCount<501)f.doc.duplicateMission(238,{owner:66,connectTo:117,x:70,y:30});app.refresh();}');assert count('galaxy.mmd')==501;answers.append(False);events=[];page.on('download',lambda d:events.append(d.suggested_filename));page.locator('#export-current').click();page.wait_for_timeout(250);assert not events;assert 'overlap' in report['dialogs'][-1]
  report['steps'].append('Research-only 501-record Galaxy state is flagged at export; cancelling its save-corruption notice produces no download')
  assert not report['errors'],report['errors'];assert not report['external_requests'];assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==h for n,h in before.items())
  assert tested_hashes=={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sources},'Production sources changed during browser QA';report['input_files_unchanged']=True;report['result']='PASS';browser.close()
finally:
 server.shutdown();report['source_sha256']=tested_hashes;(OUT/'guided-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
