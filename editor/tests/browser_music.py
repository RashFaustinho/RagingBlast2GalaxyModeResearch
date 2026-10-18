#!/usr/bin/env python3
"""Music labels, mode semantics and exact field writes in the full offline app."""
import os
import hashlib, json, sys, threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT=Path(os.environ.get('RB2_EDITOR_ROOT',Path(__file__).resolve().parents[1]))
OUT=Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True)
FIX=Path('/tmp/rb2-editor-test-fixtures')
files=[FIX/n for n in ['galaxy.mmd','tutorial.mmd','zone_green_square.mmd','zone_red_triangle.mmd']]
before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
report={'version':'1.0','result':'INCOMPLETE','errors':[],'external_requests':[],'steps':[]}
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright()as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1550,'height':1050},accept_downloads=True)
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('request',lambda r:report['external_requests'].append(r.url)if r.url.startswith(('http:','https:'))and not r.url.startswith(url)else None)
        page.on('dialog',lambda d:d.accept())
        page.goto(url);page.locator('#file-input').set_input_files([str(f)for f in files]);page.wait_for_function('()=>app.files.length===4')
        def select(name,node=0):
            page.evaluate('''([name,node])=>{const f=app.files.find(f=>f.name===name);app.selectFile(f.id);const mode=f.kind==='zone'?'zone':'galaxy';const s=app.ui.mmd[mode].files[f.id];s.owner='-1';s.node=node;s.tab='mission';app.refresh();}''',[name,node])
        def music_field(zone=False):
            return page.locator('label.field').filter(has=page.locator('.field-label',has_text='Stored music word'if zone else 'Music · +0C'))
        select('galaxy.mmd',117)
        field=music_field()
        expect(field.locator('option[value="30"]')).to_have_text('30 · Battle of Omega (Solo Guitar)')
        expect(field.locator('option[value="31"]')).to_have_text('31 · Battle of Omega (Full)')
        for selector,title in [(30,'Battle of Omega (Solo Guitar)'),(31,'Battle of Omega (Full)'),(56,'Default → The Great Expectation (Galaxy)')]:
            music_field().locator('select').select_option(str(selector))
            expect(page.locator('[data-game-music]')).to_have_text(title)
            assert page.evaluate('app.files.find(f=>f.name==="galaxy.mmd").doc.readRoot(117)[12]*256+app.files.find(f=>f.name==="galaxy.mmd").doc.readRoot(117)[13]')==selector
        expect(music_field()).to_contain_text('does not request a random song')
        with page.expect_download()as event:page.locator('#export-current').click()
        output=OUT/'galaxy.mmd';event.value.save_as(output)
        expected=bytearray((FIX/'galaxy.mmd').read_bytes())
        offset=page.evaluate('()=>{const d=app.files.find(f=>f.name==="galaxy.mmd").doc;return d.header.length+d.descriptors.length*8+d.descriptors[d.rootRef][2]+117*d.rootStride+12;}')
        expected[offset:offset+2]=(56).to_bytes(2,'big');assert output.read_bytes()==expected
        report['steps'].append('Selectors30/31 show exact bonus-theme names; Galaxy56 shows its selector6 fallback; exported MMD changes only the two stored music bytes')
        select('tutorial.mmd')
        music_field().locator('select').select_option('56')
        expect(page.locator('[data-game-music]')).to_have_text('Select Randomly (Tutorial)')
        expect(music_field()).to_contain_text('0–55')
        report['steps'].append('Tutorial56 retains the separate random-sentinel behavior in the field and live preview')
        select('zone_green_square.mmd')
        expect(music_field(True)).to_contain_text('not read to select the song')
        expect(music_field(True).locator('input')).to_have_value('56')
        expect(page.locator('[data-game-music]')).to_have_text('Automatic (Battle Zone)')
        music_field(True).locator('select').select_option('31')
        expect(music_field(True).locator('input')).to_have_value('31')
        expect(page.locator('[data-game-music]')).to_have_text('Automatic (Battle Zone)')
        expect(page.locator('[data-game-music]')).to_have_attribute('title',__import__('re').compile(r'\(31\)'))
        page.locator('#undo').click();expect(music_field(True).locator('input')).to_have_value('56')
        assert bytes(page.evaluate('Array.from(app.files.find(f=>f.name==="zone_green_square.mmd").doc.encode())'))==(FIX/'zone_green_square.mmd').read_bytes()
        page.screenshot(path=str(OUT/'battle-zone-music.png'),full_page=True)
        report['steps'].append('Battle Zone explains native automatic music selection for every stored value; raw31 remains editable and Undo restores the original56 exactly')
        # Handicap preview follows the editable field rather than the generic objective.
        handicap=page.locator('label.field').filter(has=page.locator('.field-label',has_text='Handicap · +14'))
        handicap.locator('select').select_option('12')
        expect(page.locator('[data-game-rules]')).to_contain_text('Health carries over')
        expect(page.locator('[data-game-rules]')).not_to_contain_text('Defeat the opponent!')
        page.locator('#undo').click()
        arena=page.locator('label.field').filter(has=page.locator('.field-label',has_text='Arena selector · +1C'))
        arena.locator('select').select_option('8')
        expect(page.locator('[data-game-arena]')).to_have_text("Supreme Kai's World")
        page.locator('#undo').click()
        select('zone_red_triangle.mmd',1)
        page.evaluate("()=>{const f=app.files.find(f=>f.name==='zone_red_triangle.mmd');app.ui.mmd.zone.files[f.id].tab='conditions';app.refresh();}")
        expect(page.locator('#content')).not_to_contain_text('Where this stage can lead')
        page.evaluate("()=>{const f=app.files.find(f=>f.name==='zone_red_triangle.mmd');app.ui.mmd.zone.files[f.id].tab='map';app.refresh();}")
        expect(page.locator('#content')).to_contain_text('Where this stage can lead')
        expect(page.locator('#content')).to_contain_text('Mission 3 · Secret route')
        expect(page.locator('#content')).to_contain_text('Mission 2 · Ordinary route')
        page.evaluate("()=>{const f=app.files.find(f=>f.name==='zone_red_triangle.mmd');app.ui.mmd.zone.files[f.id].tab='conditions';app.refresh();}")
        reward=page.locator('.reward-row').first.locator('details').filter(has=page.locator('summary',has_text='Reward 1 condition')).first
        reward.locator('summary').first.click()
        expect(reward.locator('.expression-preview')).to_have_text('(Remaining health (%) is at least 30)')
        expect(reward.locator('select[aria-label="Simple condition type"]')).to_have_value('stat')
        reward.locator('label.field').filter(has=page.locator('.field-label',has_text='Threshold')).locator('input').fill('45')
        reward.get_by_role('button',name='Use simple condition',exact=True).click()
        expect(reward.locator('.expression-preview')).to_have_text('(Remaining health (%) is at least 45)')
        reward.get_by_role('button',name='Apply expression',exact=True).click()
        expect(page.locator('#content')).to_contain_text('Remaining health (%) is at least 45')
        page.locator('#undo').click()
        select('galaxy.mmd',483)
        page.evaluate("()=>{const f=app.files.find(f=>f.name==='galaxy.mmd');app.ui.mmd.galaxy.files[f.id].tab='teams';app.ui.mmd.galaxy.files[f.id].owner=39;app.refresh();}")
        advanced=page.locator('details').filter(has=page.locator('summary',has_text='Advanced condition · candidate 1')).first
        advanced.locator('summary').first.click()
        expect(advanced.locator('.expression-preview')).to_have_text('Playing Galaxy: Raditz')
        expect(advanced.locator('select[aria-label="Simple condition type"]')).to_have_value('galaxy')
        raw=advanced.locator('details').filter(has=page.locator('summary',has_text='Individual tokens (advanced)')).first
        expect(raw).not_to_have_attribute('open','')
        raw.locator('summary').click()
        expect(raw).to_contain_text('Native character ID 38: Raditz')
        expect(raw).to_contain_text('Query type 5')
        expect(raw).to_contain_text('Query operator 16')
        expect(raw).to_contain_text('End: 0 MUST finish')
        raw.locator('.token-row').last.get_by_role('button',name='Remove',exact=True).click()
        advanced.get_by_role('button',name='Apply expression',exact=True).click()
        ref=page.evaluate("()=>{const d=app.files.find(f=>f.name==='galaxy.mmd').doc;return Array.from(d.body(d.getRoster(483,'allies').entries[0].condition));}")
        assert ref[-8:]==[0]*8 and len(ref)==32
        page.locator('#undo').click()
        page.screenshot(path=str(OUT/'readable-galaxy-conditions.png'),full_page=True)
        report['steps'].append('Handicap preview replaces the generic Battle Zone objective; arena edit updates the live panel; a fork separates ordinary and secret destinations; health-percent rewards edit through readable controls; mission483 explains Raditz38/type5/operator16 and automatically restores a missing End:0 on Apply')
        page.locator('[data-tab="reference"]').click();page.get_by_label('Reference category',exact=True).select_option('music')
        assert page.locator('.reference-table tbody tr').count()==57
        expect(page.locator('.reference-table')).to_contain_text('Battle of Omega (Solo Guitar)')
        expect(page.locator('.reference-table')).to_contain_text('Random sentinel')
        assert not report['errors']and not report['external_requests']
        browser.close()
    assert all(hashlib.sha256(p.read_bytes()).hexdigest()==before[p.name]for p in files)
    report['input_files_unchanged']=True;report['result']='PASS'
finally:
    server.shutdown()
    report['source_sha256']={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest()for f in [ROOT/'index.html',ROOT/'styles.css',*sorted((ROOT/'js').glob('*.js'))]}
    (OUT/'music-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
