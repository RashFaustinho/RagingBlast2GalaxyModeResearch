"""Whole-Galaxy replacement UI checks. Never packages a release."""
import hashlib,json,sys,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True);FIX=Path('/tmp/rb2-editor-test-fixtures')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
report={'result':'INCOMPLETE','errors':[],'steps':[],'packaged':False,'source_sha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in [ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))]}}
try:
 with sync_playwright()as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1700,'height':1050});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(url)
  page.locator('#file-input').set_input_files(str(FIX/'galaxy.mmd'));page.wait_for_function('()=>app.files.length===1');page.get_by_role('checkbox',name='Show Empty Galaxies',exact=True).check();page.get_by_role('button',name='Goku / Super Saiyan 2 Galaxy',exact=True).click()
  expect(page.get_by_role('button',name='Create New Galaxy',exact=True)).to_be_visible();page.get_by_role('button',name='Transfer Galaxy from another Character',exact=True).click();dialog=page.locator('#app-dialog');commit=dialog.get_by_role('button',name='Transfer Galaxy',exact=True);expect(commit).to_be_disabled()
  # A special spawned group must fail closed without changing the loaded file.
  before=page.evaluate('()=>Array.from(app.files[0].doc.encode())');dialog.get_by_role('button',name='Gohan Galaxy',exact=True).click();expect(dialog.get_by_role('alert')).to_contain_text('special');expect(commit).to_be_disabled();assert page.evaluate('()=>Array.from(app.files[0].doc.encode())')==before
  dialog.get_by_role('button',name='Goku Galaxy',exact=True).click();expect(commit).to_be_enabled();expect(dialog).to_contain_text('12 missions');expect(dialog).to_contain_text('Existing mission records');dialog.screenshot(path=str(OUT/'transfer-review.png'));dialog.get_by_role('button',name='Cancel',exact=True).click();assert page.evaluate('()=>Array.from(app.files[0].doc.encode())')==before
  page.get_by_role('button',name='Transfer Galaxy from another Character',exact=True).click();dialog.get_by_role('button',name='Goku Galaxy',exact=True).click();dialog.get_by_role('button',name='Transfer Galaxy',exact=True).click();expect(dialog).not_to_be_visible();expect(page.locator('.mission-title h2')).to_have_text('Mission 238');assert page.evaluate('()=>app.files[0].doc.getOwner(0).nodes.length===0&&app.files[0].doc.getOwner(2).nodes.length===12&&RB2.GalaxyTransfer.icons(app.files[0].doc).rows[53].native===2');page.screenshot(path=str(OUT/'transferred-galaxy.png'),full_page=True);report['steps'].append('Empty transformed Galaxy exposes both actions; donor portraits, unsupported-group rejection, nonmutating preview, Cancel and complete transfer work')
  page.locator('#undo').click();expect(page.get_by_role('button',name='Transfer Galaxy from another Character',exact=True)).to_be_visible();assert page.evaluate('()=>app.files[0].doc.getOwner(0).nodes.length===12');page.locator('#redo').click();expect(page.locator('.mission-title h2')).to_have_text('Mission 238');report['steps'].append('Undo restores original owner and icon; redo reapplies transferred map')
  with page.expect_download()as event:page.locator('#export-current').click()
  saved=OUT/'galaxy.mmd';event.value.save_as(saved);page.reload();page.locator('#file-input').set_input_files(str(saved));page.wait_for_function('()=>app.files.length===1');assert page.evaluate('()=>app.files[0].doc.getOwner(2).nodes.length===12&&RB2.GalaxyTransfer.icons(app.files[0].doc).rows[53].native===2&&app.files[0].doc.rootCount===498');report['steps'].append('Actual exported Galaxy MMD reopens with owner, icon and all 498 original mission IDs retained')
  assert not report['errors'],report['errors'];report['result']='PASS';b.close()
finally:
 server.shutdown();(OUT/'galaxy-transfer-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
