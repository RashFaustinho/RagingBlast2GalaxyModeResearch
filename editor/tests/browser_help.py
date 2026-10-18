#!/usr/bin/env python3
"""Test help DAT editing/import/export in the complete app (private game fixtures).
Usage: python editor/tests/browser_help.py --fixtures /path/to/battle_resident_param_m
The temporary HTTP server is loopback-only; no files are modified in place.
"""
import argparse
import hashlib
import json
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--fixtures',type=Path,required=True)
parser.add_argument('--chromium',default='/usr/bin/chromium')
parser.add_argument('--report',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
files=sorted(args.fixtures.glob('tutorial_message_table_*.dat'))
assert len(files)==9,'Expected nine original tutorial message tables'
original={f.name:f.read_bytes() for f in files}
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'transport':'loopback HTTP','help_files':9,'steps':[],'errors':[]}
try:
 with tempfile.TemporaryDirectory(prefix='rb2-help-qa-') as temp, sync_playwright() as p:
  browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('dialog',lambda d:d.accept())
  page.goto(f'http://127.0.0.1:{server.server_port}/')
  page.locator('#file-input').set_input_files([str(f) for f in files])
  page.wait_for_function('() => app.files.length===9')
  assert page.evaluate('app.files.every(f=>f.kind==="help")')
  for f in files:
   actual=page.evaluate('(n)=>Array.from(app.files.find(f=>f.name===n).doc.encode())',f.name)
   assert bytes(actual)==original[f.name]
  report['steps'].append('All nine help DATs imported, correct tab and byte-identical encoding')
  target=files[0]
  page.locator(f'#file-list button[title="{target.name}"]').click()
  page.get_by_role('button',name='Move down',exact=True).click()
  assert page.evaluate('!!app.pendingForm')
  with page.expect_download() as event:page.locator('#export-current').click()
  exported=Path(temp)/'help.dat';event.value.save_as(exported)
  expected=bytearray(original[target.name]);expected[16:20]=expected[18:20]+expected[16:18]
  assert exported.read_bytes()==expected
  page.locator('#undo').click()
  assert bytes(page.evaluate('Array.from(app.files[0].doc.encode())'))==original[target.name]
  page.locator('#redo').click()
  assert bytes(page.evaluate('Array.from(app.files[0].doc.encode())'))==expected
  report['steps'].append('Reordered help message autoapplies on export; exact download, undo and redo verified')
  page.get_by_role('button',name='Add selected help text',exact=True).click()
  page.locator('[data-tab="reference"]').click()
  assert page.evaluate('app.files[0].doc.count')==int.from_bytes(original[target.name][:4],'big')+1
  report['steps'].append('Adding a message updates count and survives navigation')
  with page.expect_download() as event:page.locator('#save-project').click()
  project=Path(temp)/'workspace.rb2project';event.value.save_as(project)
  snapshot=page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))')
  page.locator('#clear-workspace').click()
  page.locator('#project-input').set_input_files(str(project))
  page.wait_for_function('() => app.files.length===9')
  assert page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))')==snapshot
  assert not page.evaluate('app.validateFiles().filter(x=>x.type==="error")')
  report['steps'].append('Saved workspace restores all nine original/edited help files and validates')
  browser.close()
 assert not report['errors'],report['errors']
 assert all(f.read_bytes()==original[f.name] for f in files),'Original fixture changed'
 report['input_files_unchanged']=True
 report['result']='PASS'
 report['source_sha256']={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [root/'index.html',root/'styles.css',*sorted((root/'js').glob('*.js'))]}
 if args.report:args.report.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
finally:server.shutdown()
