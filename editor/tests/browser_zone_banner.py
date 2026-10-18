#!/usr/bin/env python3
"""Zone-wide secret requirement and route explanation appear only on the Route tab."""
import os
import argparse,hashlib,json,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
root=Path(os.environ.get('RB2_EDITOR_ROOT',Path(__file__).resolve().parents[1]));files=sorted(a.fixtures.glob('zone_*.mmd'));assert len(files)==16
before={f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in files}
no_trigger={'zone_green_square.mmd','zone_blue_lozenge.mmd','zone_aquamarine_sphere.mmd','zone_final.mmd','zone_ultimate_lozenge.mmd','zone_ultimate_sphere.mmd'}
r={'result':'INCOMPLETE','errors':[],'external_requests':[],'checks':[],'scope':'Linux Chromium on local HTTP; original MMD fixtures; no gameplay or executable modifications.'}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}/'
try:
 with sync_playwright()as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1550,'height':1050});page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('request',lambda q:r['external_requests'].append(q.url)if q.url.startswith(('http:','https:'))and not q.url.startswith(url)else None)
  page.goto(url);page.locator('#file-input').set_input_files([str(f)for f in files]);page.wait_for_function('()=>app.files.length===16')
  def select(name,node,tab='mission',collapsed=False):
   page.evaluate('''([name,node,tab,collapsed])=>{const f=app.files.find(f=>f.name===name);app.selectFile(f.id);Object.assign(app.ui.mmd.zone.files[f.id],{node,tab,owner:'-1',previewCollapsed:collapsed});app.refresh();}''',[name,node,tab,collapsed])
  banner=page.get_by_role('region',name='Battle Zone secret-route requirement',exact=True)
  for f in files:
   count=page.evaluate('name=>app.files.find(f=>f.name===name).doc.rootCount',f.name);text=None
   for node,tab,collapsed in [(0,'mission',False),(count-1,'conditions',False),(0,'map',True),(count-1,'map',False),(0,'advanced',True)]:
    select(f.name,node,tab,collapsed)
    heading=page.get_by_role('heading',name='Where this stage can lead',exact=True)
    if tab!='map':
     expect(banner).to_have_count(0);expect(heading).to_have_count(0)
     continue
    expect(banner).to_have_count(1);expect(banner).to_be_visible();expect(heading).to_have_count(1)
    expect(banner).to_have_attribute('data-zone-secret-status','none'if f.name in no_trigger else'active');expect(banner).to_contain_text('cannot be changed in Galaxy Studio')
    if text is None:text=banner.inner_text()
    assert banner.inner_text()==text
    if f.name in no_trigger:expect(banner).to_contain_text('Use ordinary destinations')
    else:expect(banner).to_contain_text('ALL battles');expect(banner).to_contain_text('does not necessarily need to be repeated')
   encoded=bytes(page.evaluate('name=>Array.from(app.files.find(f=>f.name===name).doc.encode())',f.name));assert encoded==f.read_bytes()
   r['checks'].append({'file':f.name,'status':'none'if f.name in no_trigger else'active','route_only_across_five_views':True,'mmd_unchanged':True})
  for name,text in [('zone_red_triangle.mmd','Win with a Super Attack'),('zone_ultimate_triangle.mmd','Maximum combo hit count is at least 20'),('zone_yellow_spiral.mmd','Win while in Raging Soul')]:
   select(name,0,'map');expect(banner.locator('.zone-unlock-requirement')).to_have_text(text)
  select('zone_red_triangle.mmd',0,'map')
  banner.screenshot(path=str(a.output/'triangle-requirement.png'))
  page.set_viewport_size({'width':900,'height':1000});banner.screenshot(path=str(a.output/'triangle-narrow.png'));assert banner.evaluate('(e)=>e.scrollWidth<=e.clientWidth')
  select('zone_green_square.mmd',0,'map');banner.screenshot(path=str(a.output/'no-trigger.png'))
  page.locator('#file-input').set_input_files([{'name':'zone_custom.mmd','mimeType':'application/octet-stream','buffer':files[0].read_bytes()}]);page.wait_for_function('()=>app.files.length===17');select('zone_custom.mmd',0,'map')
  expect(banner).to_have_attribute('data-zone-secret-status','unknown');expect(banner).to_contain_text('unknown filename does not mean there is no trigger')
  assert not r['errors'],r['errors'];assert not r['external_requests'];b.close()
 assert before=={f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in files};r['input_files_unchanged']=True;r['result']='PASS'
finally:
 s.shutdown();r['source_sha256']={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest()for f in [root/'index.html',root/'styles.css',*sorted((root/'js').glob('*.js'))]};(a.output/'zone-banner-browser-qa.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
