#!/usr/bin/env python3
"""Release feedback checks: AFS roster reader, multi-Galaxy drafts, Overview and tutorial arena."""
import argparse, hashlib, json, threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--fixtures',type=Path,required=True)
p.add_argument('--game-afs',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[1];a.output.mkdir(parents=True,exist_ok=True)
files=[a.fixtures/n for n in ['galaxy.mmd','tutorial.mmd','zone_red_triangle.mmd','preset_character_galaxy.dat','preset_appearance_table.dat','preset_strength_table.dat']]
archives=[a.game_afs/n for n in ['st_pack_progress_pt_ps3.afs','st_pack_boot_pt_ps3.afs']]
hashes={str(f):hashlib.file_digest(f.open('rb'),'sha256').hexdigest()for f in files+archives}
sources=[root/'index.html',root/'styles.css',*sorted((root/'js').glob('*.js'))]
source_hashes={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources}
report={'result':'INCOMPLETE','scope':'Release 1.0 source; Linux Chromium using local HTTP. No gameplay or executable edits.','steps':[],'errors':[],'external_requests':[],'source_sha256':source_hashes}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright()as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1500,'height':1050});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('dialog',lambda d:d.accept());page.on('request',lambda r:report['external_requests'].append(r.url)if r.url.startswith(('http:','https:'))and not r.url.startswith(url)else None)
  page.goto(url)
  expect(page.locator('.hero')).to_contain_text("You can open MULTIPLE .MMD/.DAT files together (and it's even suggested to do so).")
  expect(page.locator('.archive-bridge')).to_contain_text('Extract / Import quickly from / to AFS')
  assert page.locator('#content .feature-grid').count()==0
  expect(page.locator('#content')).not_to_contain_text('A guided editing workspace')
  page.get_by_role('checkbox',name='Enable mod support',exact=True).check()
  page.get_by_role('button',name='Read mod roster from AFS…',exact=True).click()
  dialog=page.locator('#app-dialog')
  dialog.get_by_label('Roster AFS archives',exact=True).set_input_files([str(f)for f in archives],timeout=60000)
  dialog.get_by_role('button',name='Extract and read roster',exact=True).click()
  expect(dialog.get_by_role('button',name='Use this roster',exact=True)).to_be_visible(timeout=60000)
  expect(dialog).to_contain_text('100 native forms · 137 name texts (US) · 100 forms with move defaults · 0 forms with incomplete names')
  assert page.evaluate('app.modProfile')is None
  page.screenshot(path=str(a.output/'afs-roster-preview.png'),full_page=True)
  dialog.get_by_role('button',name='Use this roster',exact=True).click()
  assert page.evaluate('app.modProfile.characters.length')==100
  assert page.evaluate('app.files.length')==0
  assert page.evaluate('app.modProfile.enhancedCharacters.length')==66
  report['steps'].append('Overview copy/removed cards verified; actual progress+boot AFS produce all 100 native forms and 137 English name texts with no missing names; preview leaves catalogs untouched until explicit Apply, and applying opens no editable documents')
  page.get_by_role('checkbox',name='Enable mod support',exact=True).uncheck()
  page.locator('#file-input').set_input_files([str(f)for f in files]);page.wait_for_function('() => app.files.length===6')
  def select(name,node=0,tab='mission',owner=-1):
   page.evaluate('''([name,node,tab,owner])=>{const f=app.files.find(f=>f.name===name);app.selectFile(f.id);const mode=f.kind==='zone'?'zone':'galaxy';Object.assign(app.ui.mmd[mode].files[f.id],{node,tab,owner});app.refresh();}''',[name,node,tab,owner])
  select('galaxy.mmd',491,'teams',0)
  original=page.evaluate('Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')
  expected=page.evaluate('()=>{const d=app.files.find(f=>f.name==="galaxy.mmd").doc;return RB2.Conditions.galaxyRule(RB2.Mmd.parseExpression(d.body(d.getRoster(491,"allies").entries[0].condition)).ast).natives;}')
  assert len(expected)>1
  advanced=page.locator('details').filter(has=page.locator('summary',has_text='Advanced condition · candidate 1')).first
  advanced.locator('summary').first.click()
  expect(advanced.get_by_label('Simple condition type',exact=True)).to_have_value('galaxy')
  expect(advanced.locator('[aria-label="Condition Galaxies"] input:checked')).to_have_count(len(expected))
  advanced.get_by_label('Find condition Galaxy',exact=True).fill('Trunks')
  expect(advanced.locator('[aria-label="Condition Galaxies"] input:checked')).to_have_count(len(expected))
  advanced.get_by_label('Find condition Galaxy',exact=True).fill('')
  remove=page.evaluate('id=>app.characterName(id)',expected[0]);advanced.get_by_role('checkbox',name=remove,exact=True).uncheck()
  advanced.get_by_role('button',name='Use simple condition',exact=True).click()
  assert page.evaluate('Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==original
  advanced.get_by_role('button',name='Apply expression',exact=True).click()
  current=page.evaluate('()=>{const d=app.files.find(f=>f.name==="galaxy.mmd").doc;return RB2.Conditions.galaxyRule(RB2.Mmd.parseExpression(d.body(d.getRoster(491,"allies").entries[0].condition)).ast);}')
  assert current=={'mode':'only','natives':expected[1:]}
  # Reopen the refreshed builder and turn the same set into a NOT(OR(...)) exclusion.
  advanced.locator('summary').first.click()
  advanced.get_by_label('Simple condition type',exact=True).select_option('except')
  advanced.get_by_role('button',name='Use simple condition',exact=True).click()
  advanced.get_by_role('button',name='Apply expression',exact=True).click()
  current=page.evaluate('()=>{const d=app.files.find(f=>f.name==="galaxy.mmd").doc,ref=d.getRoster(491,"allies").entries[0].condition,b=d.body(ref),ast=RB2.Mmd.parseExpression(b).ast;return {rule:RB2.Conditions.galaxyRule(ast),end:Array.from(b.slice(-8))};}')
  assert current=={'rule':{'mode':'except','natives':expected[1:]},'end':[0]*8}
  for _ in range(2):page.locator('#undo').click()
  assert page.evaluate('Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==original
  report['steps'].append('Mission491 advanced builder recognizes the original multi-character OR; searching retains selected hidden rows; editing remains a draft until Apply; Only and Except retain the complete group, append End0, and two Undos restore the original MMD byte for byte')
  # Shared builder labels apply to Teams and Rules/numeric expressions alike.
  advanced.locator('summary').first.click()
  advanced.get_by_label('Simple condition type',exact=True).select_option('flag2')
  expect(advanced).to_contain_text('returns 8 or 0')
  advanced.get_by_label('Simple condition type',exact=True).select_option('flag3')
  expect(advanced).to_contain_text('even before its first victory')
  expect(advanced).to_contain_text('returns 2 or 0')
  # Preserve comparisons on non-statistic queries rather than silently simplifying them.
  for query_type,comparison_value in [(5,0),(2,1)]:
   page.evaluate("""([type,value])=>{const f=app.files.find(f=>f.name==='galaxy.mmd');app.transact('Custom-condition fixture',[f],()=>{const b=RB2.Conditions.encodeSimple({kind:'query',type,argument:0,comparison:'==',value}),entries=f.doc.getRoster(491,'allies').entries.map(e=>({...e}));entries[0].condition=f.doc.append(b,b.length/8,8);f.doc.setRoster(491,'allies',entries);});}""",[query_type,comparison_value])
   advanced.locator('summary').first.click()
   expect(advanced.get_by_label('Simple condition type',exact=True)).to_have_value('custom')
   page.locator('#undo').click()
  assert page.evaluate('Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==original
  select('galaxy.mmd',496,'actions',0)
  expect(page.locator('#content')).to_contain_text('Items applied to the player’s team')
  expect(page.locator('#content')).to_contain_text('To give an enemy CPU bonus items')
  report['steps'].append('Progression queries are named Cleared versus Unlocked with their actual 8/2 return masks; mission modifiers explicitly target the player team and point enemy bonuses to preset Strength')
  select('zone_red_triangle.mmd',1,'conditions')
  expect(page.locator('#content')).not_to_contain_text('Where this stage can lead')
  select('zone_red_triangle.mmd',1,'map')
  expect(page.locator('#content')).to_contain_text('Secret unlock requirement: Win with a Super Attack')
  page.get_by_role('button',name='Edit next-stage links',exact=True).click()
  expect(page.locator('#content')).to_contain_text('Next stage nodes')
  select('zone_red_triangle.mmd',3,'conditions')
  metadata=page.locator('details').filter(has=page.locator('summary',has_text='Stored +30 expression (advanced research)')).first
  expect(metadata).not_to_have_attribute('open','')
  metadata.locator('summary').first.click();expect(metadata).to_contain_text('No active expression evaluator')
  select('tutorial.mmd')
  expect(page.locator('[data-game-arena]')).to_have_text('Tutorial / Practice (Tutorial selector)')
  expect(page.locator('option[value="14"]').first).to_have_text('14 · Tutorial / Practice (Tutorial selector)')
  page.screenshot(path=str(a.output/'tutorial-arena.png'),full_page=True)
  page.evaluate('app.openPreset(app.files.find(f=>f.name==="preset_character_galaxy.dat"),0)')
  assert page.locator('.link-diamond-slot').count()==8
  assert page.locator('.link-slot-number').count()==0
  page.locator('.link-diamonds').screenshot(path=str(a.output/'diamonds.png'))
  report['steps'].append('Route summary names the native Super-win trigger and opens editable links; root+30 is collapsed advanced research; all tutorial arena controls/preview name selector14; the independent eight diamond slots retain accessible labels without portrait number overlays')
  assert not report['errors'],report['errors'];assert not report['external_requests']
  browser.close()
 assert hashes=={str(f):hashlib.file_digest(f.open('rb'),'sha256').hexdigest()for f in files+archives}
 assert source_hashes=={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest()for f in sources}
 report['input_files_unchanged']=True;report['result']='PASS'
finally:
 server.shutdown();(a.output/'feedback-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
