"""UI regression for shared491 queries and original Battle Zone coordinate files."""
import hashlib,json,threading,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];F=Path('/tmp/rb2-editor-test-fixtures');OUT=Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
sources=[ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))];hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources};fixtures=[f for f in F.iterdir()if f.suffix=='.mmd'or f.name.startswith('preset_')];before={f:hashlib.sha256(f.read_bytes()).hexdigest()for f in fixtures}
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}/';r={'version':'1.0','steps':[],'errors':[],'external_requests':[],'source_sha256':hashes}
try:
 with sync_playwright()as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('request',lambda q:r['external_requests'].append(q.url)if q.url.startswith(('http:','https:'))and not q.url.startswith(url)else None);page.goto(url);page.locator('#file-input').set_input_files([str(f)for f in fixtures]);page.wait_for_function('() => app.files.length===25')
  def select(n):page.locator('#file-list button[title="'+n+'"]').click()
  def node(n,i,owner=-1,tab='mission'):
   select(n);page.evaluate('([n,i,o,t])=>{const f=app.files.find(x=>x.name===n),s=app.ui.mmd[f.kind==="main"?"galaxy":"zone"].files[f.id];s.node=i;s.owner=o;s.tab=t;app.refresh();}',[n,i,owner,tab])
  node('galaxy.mmd',491,0,'teams');a=page.locator('[data-preview-team="allies"]');e=page.locator('[data-preview-team="enemies"]');expect(a).to_contain_text('4 included candidate(s)');expect(e).to_contain_text('1 included candidate(s)');expect(e).to_contain_text('Hatchiyack');expect(page.locator('#content')).to_contain_text('Playing Galaxy:');page.screenshot(path=str(OUT/'491-goku.png'))
  original=page.evaluate('()=>Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())');node('galaxy.mmd',491,-1,'teams');expect(page.get_by_label('Preview Galaxy',exact=True)).to_be_visible()
  for native in[0,5,11,17,24,99]:
   page.get_by_label('Preview Galaxy',exact=True).select_option(str(native));expect(a).to_contain_text(('0'if native==99 else'4')+' included candidate(s)');expect(e).to_contain_text(('5'if native==99 else'1')+' included candidate(s)')
  assert page.evaluate('()=>Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==original
  page.screenshot(path=str(OUT/'491-hatchiyack.png'));r['steps'].append('Original491 resolves five heroes versus Hatchiyack and reversed Hatchiyack perspective; all six native owners preview without changing bytes')
  node('galaxy.mmd',491,0,'teams');candidate=page.locator('.mmd-panel').filter(has=page.get_by_role('heading',name='Allied candidates',exact=True)).first.locator('.mmd-panel').first
  simple=candidate.locator('details').filter(has=page.locator('summary',has_text='Choose Galaxies for this candidate')).first;simple.locator('summary').click();simple.get_by_label('Candidate Galaxy rule',exact=True).select_option('always');simple.get_by_role('button',name='Apply Galaxy rule',exact=True).click();assert page.evaluate('()=>app.files.find(f=>f.name==="galaxy.mmd").doc.getRoster(491,"allies").entries[0].condition')==0;page.locator('#undo').click();assert page.evaluate('()=>Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==original;r['steps'].append('Readable candidate rule applies only after explicit Apply and undo restores the complete original MMD')
  issues=page.evaluate('()=>app.validateFiles().filter(x=>/grid coordinates|outside 0–20/.test(x.message))');assert not issues,issues
  page.locator('#validate').click();expect(page.locator('#app-dialog')).to_contain_text('No structural errors found.');expect(page.locator('#app-dialog')).to_contain_text('Information · zone_');expect(page.locator('#app-dialog')).to_contain_text('informational notes do not indicate invalid files');page.screenshot(path=str(OUT/'zone-checks.png'));page.locator('#app-dialog').get_by_role('button',name='✕',exact=True).click();r['steps'].append('All sixteen original ZONEs pass coordinate checks; general format notes are explicitly Information, not file warnings')
  for name,container in[('zone_red_triangle.mmd','preset_character_battle_zone_nor'),('zone_ultimate_triangle.mmd','preset_character_battle_zone_spe')]:
   node(name,0);preset=page.evaluate('n=>{const f=app.files.find(f=>f.name===n);return new DataView(f.doc.readRoot(0).buffer).getUint32(12);}',name);page.get_by_role('button',name='Edit character preset',exact=True).click();assert page.evaluate('()=>app.files.find(f=>f.id===app.ui.presets.fileId).name')==container;assert page.evaluate('()=>app.ui.presets.index')==preset;page.get_by_role('button',name='← Back to mission 0',exact=True).click();assert page.evaluate('()=>app.files.find(f=>f.id===app.selectedFileId).name')==name
  r['steps'].append('Battle Zone Edit character preset resolves normal and Ultimate containers separately and returns to the originating mission')
  node('zone_red_triangle.mmd',3);x=page.locator('label.field').filter(has=page.locator('.field-label',has_text='Map X · +00')).locator('input');expect(x).to_have_value('2');x.fill('1');x.press('Tab');page.locator('#undo').click();expect(x).to_have_value('2');page.screenshot(path=str(OUT/'zone-native-x2.png'));r['steps'].append('An original X=2 mission opens and edits normally; undo restores its original coordinate')
  assert not r['errors'],r['errors'];assert not r['external_requests'];assert all(hashlib.sha256(f.read_bytes()).hexdigest()==h for f,h in before.items());assert hashes=={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources};r['input_files_unchanged']=True;r['result']='PASS';b.close()
finally:
 s.shutdown();(OUT/'conditions-browser-qa.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
