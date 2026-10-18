"""Offline mod profile workflows against real DATs; synthetic catalog IDs are not gameplay claims."""
import json,hashlib,tempfile,threading,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(sys.argv[1]if len(sys.argv)>1 else'/tmp/rb2-mod-qa');OUT.mkdir(parents=True,exist_ok=True)
FIX=Path('/tmp/rb2-editor-test-fixtures');originals=[FIX/n for n in ['galaxy.mmd','preset_appearance_table.dat','preset_strength_table.dat','preset_character_galaxy.dat']];before={str(f):hashlib.sha256(f.read_bytes()).hexdigest()for f in originals}
sources=[ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))];hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
report={'version':'1.0','steps':[],'errors':[],'external_requests':[],'source_sha256':hashes}
profile={'format':'RB2-Galaxy-Studio-Mod','version':1,'name':'Synthetic Extra Roster','characters':[{'id':120,'name':'Extra fighter','defaultMoves':[7,8,9,10,11]},{'id':0,'name':'Replacement Goku'},{'id':121,'name':'Missing-defaults fighter'}],'moves':[{'native':120,'id':7,'name':'Extra Nova Blast'}],'transformations':[{'id':120,'slots':[{'slot':0,'target':0,'cancel':False}]}],'enhancedCharacters':[{'id':66,'native':120}]};pf=OUT/'profile.json';pf.write_text(json.dumps(profile));bad=OUT/'bad.json';bad.write_text(json.dumps({**profile,'characters':[{'id':120,'name':'A'},{'id':120,'name':'B'}]}));mv=OUT/'moves.csv';mv.write_text('native,id,name\n120,11,Extra Ultimate\n')
try:
 with sync_playwright()as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.set_default_timeout(10000);page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('request',lambda r:report['external_requests'].append(r.url)if r.url.startswith(('https://','http://'))and not r.url.startswith(url)else None);page.on('dialog',lambda d:d.accept())
  page.goto(url);page.locator('#file-input').set_input_files([str(f)for f in originals]);page.wait_for_function('() => app.files.length===4');page.locator('[data-tab="home"]').click();page.get_by_role('checkbox',name='Enable mod support').check();expect(page.locator('.mod-support-panel')).to_contain_text('Character list required')
  with page.expect_file_chooser()as c:page.get_by_role('button',name='Load character list / mod profile…',exact=True).click()
  c.value.set_files(pf);expect(page.locator('.mod-support-panel')).to_contain_text('Synthetic Extra Roster');assert page.evaluate('app.characterName(120)')=='Extra fighter';assert page.evaluate('app.characterName(0)')=='Replacement Goku';assert page.evaluate('app.data.moves.filter(x=>x.native===0).length')==0
  assert page.evaluate('app.files.every(f=>!f.dirty)');report['steps'].append('Home mod mode imports names, extra native120, moves and native slot hints through a real file picker without changing any game bytes')
  with page.expect_file_chooser()as c:page.get_by_role('button',name='Load character list / mod profile…',exact=True).click()
  c.value.set_files(bad);expect(page.locator('#toast-region')).to_contain_text('Duplicate characters');assert page.evaluate('app.modProfile.name')==profile['name'];report['steps'].append('Duplicate native IDs fail atomically and preserve the previous profile')
  with page.expect_file_chooser()as c:page.get_by_role('button',name='Add local move CSV…',exact=True).click()
  c.value.set_files(mv);expect(page.locator('.mod-support-panel')).to_contain_text('2 named local moves');assert page.evaluate('app.data.moves.find(x=>x.native===120&&x.id===11).name')=='Extra Ultimate'
  cs=Path('/workspace/research-rb2/expansion-20261015/galaxy-static/cs_form.dat')
  with page.expect_file_chooser()as c:page.get_by_role('button',name='Load cs_form.dat…',exact=True).click()
  c.value.set_files(cs);expect(page.locator('.mod-support-panel')).to_contain_text('66 character-select groups');assert page.evaluate('app.data.enhancedCharacters[51].native')==82
  report['steps'].append('Move CSV merges by native/local ID and raw original cs_form.dat resolves 66 distinct enhanced-character groups')
  page.screenshot(path=str(OUT/'mod-support.png'))
  page.locator('#file-list button[title="preset_character_galaxy.dat"]').click();page.get_by_role('button',name='New character preset…',exact=True).click();
  # Create through the same dialog used for original fighters, now selecting the mod-only native ID.
  sel=page.locator('#app-dialog select').first;sel.select_option('121');page.locator('#app-dialog').get_by_role('button',name='Create preset',exact=True).click();expect(page.locator('#app-dialog')).to_be_visible();expect(page.locator('#app-dialog [role=alert]')).to_contain_text('defaults');assert page.evaluate('app.files.find(f=>f.kind==="appearance").doc.count')==367;sel.select_option('120');page.locator('#app-dialog').get_by_role('button',name='Create preset',exact=True).click();assert page.evaluate('app.files.find(f=>f.kind==="appearance").doc.row(367)[0]')==120
  assert page.evaluate('Array.from(app.files.find(f=>f.kind==="appearance").doc.row(367).slice(3))')==[7,8,9,10,11]
  page.get_by_role('button',name='Appearance & moves',exact=True).click();expect(page.get_by_label('Super — Up',exact=True)).to_have_value('7 — Extra Nova Blast');report['steps'].append('Integrated character creation accepts mod native120 and writes its five supplied local move selectors into a new Appearance')
  with page.expect_download()as d:page.locator('#save-project').click()
  workspace=OUT/'mod-workspace.rb2project';d.value.save_as(workspace);saved=json.loads(workspace.read_text());assert saved['modSupport']['enabled']and saved['modSupport']['profile']['name']==profile['name']
  page.locator('[data-tab="home"]').click();page.get_by_role('checkbox',name='Enable mod support').uncheck();assert page.evaluate('app.characterName(0)')=='Goku';assert page.evaluate('app.characterName(120)')=='Character 120'
  page.locator('#project-input').set_input_files(workspace);page.wait_for_function('() => app.modEnabled&&app.characterName(120)==="Extra fighter"');assert page.evaluate('app.files.find(f=>f.kind==="appearance").doc.count')==368
  report['steps'].append('Workspace download/restoration preserves mod profile and edited DATs; disabling mode restores original catalogs without changing binary records')
  page.locator('[data-tab="home"]').click()
  with page.expect_download()as d:page.get_by_role('button',name='Export mod profile',exact=True).click()
  exported=OUT/'exported-profile.json';d.value.save_as(exported);assert json.loads(exported.read_text())==saved['modSupport']['profile'];report['steps'].append('Exported mod profiles round-trip exactly and remain separate from game files')
  assert not report['errors']and not report['external_requests'];b.close()
 for f in originals:assert hashlib.sha256(f.read_bytes()).hexdigest()==before[str(f)]
 assert hashes=={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources};report['result']='PASS'
except Exception as e:
 report['result']='FAIL';report['failure']=str(e);raise
finally:
 (OUT/'mod-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));server.shutdown()
