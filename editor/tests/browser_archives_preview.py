"""0.6 archive workflow + original-artwork preview checks. Private fixtures only."""
import base64, hashlib, json, struct, sys, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
FIX = Path('/tmp/rb2-editor-test-fixtures')
GAME = Path('/workspace/research-rb2/rpcs3-cloud/uploaded/Dragon Ball Raging Blast 2 EUR/PS3_GAME/USRDIR/data/PS3')
AFS = [GAME/n for n in ['st_pack_progress_pt_ps3.afs', 'st_pack_boot_pt_ps3.afs', 'st_pack_battle_others_pt_ps3.afs']]
sys.path.insert(0, str(REPO/'tools'))
import zpak_research as z
from item_localization_research import afs_member

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

sources = [ROOT/'index.html', ROOT/'styles.css', *sorted((ROOT/'js').glob('*.js'))]
hashes = {str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sources}
report = {'version':'1.0', 'steps':[], 'errors':[], 'external_requests':[], 'source_sha256':hashes,
          'download_test':'ZIP extraction and patched AFS download; no folder-write options'}
server = ThreadingHTTPServer(('127.0.0.1',0), partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start(); url=f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True)
        page.set_default_timeout(20000)
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('console',lambda e:report['errors'].append(e.text) if e.type=='error' else None)
        page.on('request',lambda q:report['external_requests'].append(q.url) if q.url.startswith(('http:','https:')) and not q.url.startswith(url) else None)
        page.on('dialog',lambda d:d.accept())
        page.goto(url)
        page.screenshot(path=str(OUT/'01-overview.png'))
        page.get_by_role('button',name='↓ Export from game',exact=True).click()
        dialog=page.locator('#app-dialog')
        dialog.get_by_label('Source AFS archives',exact=True).set_input_files([str(f) for f in AFS])
        dialog.get_by_role('button',name='Find editable files',exact=True).click()
        expect(dialog.get_by_role('heading',name='Ready to extract')).to_be_visible(timeout=60000)
        expect(dialog.locator('.archive-status')).to_contain_text('Found 545 distinct filenames')
        with page.expect_download() as event:
            dialog.get_by_role('button',name='Download Extracted Zip',exact=True).click()
        extracted=OUT/'extracted.zip';event.value.save_as(extracted)
        with ZipFile(extracted) as zipfile:
            manifest=json.loads(zipfile.read('extracted/extraction-manifest.json'))
            assert len(manifest['files'])==545
            assert all(not s['skipped'] for s in manifest['scanModes'])
            assert zipfile.testzip() is None
            for row in manifest['files']:
                content=zipfile.read('extracted/'+row['file'])
                assert hashlib.sha256(content).hexdigest()==row['sha256']
                f=FIX/row['file']
                if row['file'].startswith('TUTO_'): f=FIX/'localized'/row['file']
                if not f.exists():
                    f=Path('/workspace/research-rb2/boot-entry22/parameters')/row['file'] if row['file']=='item_parameter.dat' else Path('/workspace/research-rb2/advanced-20261015/battle_resident_param_m')/row['file']
                assert content==f.read_bytes(),row['file']
        report['steps'].append('Extracted all 545 supported originals (35 MMD/DAT and 510 localized TXT) from three real AFS archives; every ZIP member independently matches original fixtures, manifest hashes and CRC')
        assert dialog.locator('.archive-results button').all_text_contents()==['Download Extracted Zip']
        dialog.get_by_role('button',name='✕',exact=True).click()
        # Users now unpack the ZIP and open individual files, rather than auto-opening them.
        extractdir=OUT/'unpacked';extractdir.mkdir(exist_ok=True)
        with ZipFile(extracted) as zipfile:
            opened=[]
            for row in manifest['files']:
                path=extractdir/row['file'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(zipfile.read('extracted/'+row['file']));opened.append(str(path))
        page.locator('#file-input').set_input_files(opened)
        expect(page.locator('#file-count')).to_have_text('545')
        report['steps'].append('Extraction offers only Download Extracted Zip; downloaded files open through the standard file picker')
        with page.expect_download() as event: page.locator('#save-project').click()
        workspace=OUT/'all-languages.rb2project';event.value.save_as(workspace)
        saved=json.loads(workspace.read_text());assert len(saved['files'])==545
        for f in saved['files']:
            assert f['original']==f['current']
            source=next(row for row in manifest['files'] if row['file']==f['name'])
            assert hashlib.sha256(base64.b64decode(f['current'])).hexdigest()==source['sha256']
        page.locator('#clear-workspace').click();page.locator('#project-input').set_input_files(str(workspace))
        expect(page.locator('#file-count')).to_have_text('545')
        report['steps'].append('A 545-file workspace, including all six languages, saves and restores with every original/current byte independently checked')


        def node(i,owner,tab='mission'):
            page.evaluate('([i,o,t])=>{const f=app.files.find(f=>f.name==="galaxy.mmd");app.selectFile(f.id);const s=app.ui.mmd.galaxy.files[f.id];s.node=i;s.owner=o;s.tab=t;app.refresh();}',[i,owner,tab])
        node(491,0)
        rail=page.locator('.galaxy-rail');assert rail.locator('[data-galaxy]').count()==67
        assert rail.locator('[data-galaxy]').last.get_attribute('data-galaxy')=='-1'
        assert page.locator('[data-game-team="enemies"] .game-fighter').count()==1
        expect(page.locator('.game-mission-panel')).to_contain_text('Hatchiyack')
        expect(page.locator('.game-allies')).to_contain_text('Vegeta')
        page.locator('[data-galaxy="99"]').click()
        node(491,99)
        assert page.locator('[data-game-team="enemies"] .game-fighter').count()==5
        assert page.locator('.game-allies').count()==0
        report['steps'].append('Galaxy rail lists all 66 populated owners in native order plus All Missions last; live cards resolve both sides of shared mission491 correctly')
        node(117,66)
        page.wait_for_timeout(100);page.evaluate("()=>document.getElementById('toast-region').replaceChildren()")
        page.screenshot(path=str(OUT/'02-galaxy-mission.png'),full_page=True)
        difficulty=page.locator('label.field').filter(has=page.locator('.field-label',has_text='Displayed difficulty · +0E')).locator('input')
        before=page.evaluate('()=>Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')
        difficulty.fill('6')
        expect(page.locator('[data-game-difficulty]')).to_have_text('Ultimate')
        assert page.evaluate('()=>Array.from(app.files.find(f=>f.name==="galaxy.mmd").doc.encode())')==before
        difficulty.press('Tab')
        node(496,0,'actions')
        expect(page.locator('[data-game-rules]')).to_contain_text('Player: Health constantly decreases')
        field=page.locator('label.field').filter(has=page.locator('.field-label',has_text='Rule description 1 · +12')).locator('select')
        field.select_option('1')
        expect(page.locator('[data-game-rules]')).to_contain_text('Player: Ki constantly recovers')
        assert page.locator('.game-mission-panel').is_hidden()
        page.screenshot(path=str(OUT/'03-live-rule-window.png'),full_page=True)
        page.locator('[data-game-rules]').scroll_into_view_if_needed()
        page.get_by_role('button',name='Hide preview',exact=True).click()
        expect(page.locator('[data-game-rules]')).to_be_hidden()
        page.get_by_role('button',name='Show preview',exact=True).click()
        expect(page.locator('[data-game-rules]')).to_be_visible()
        report['steps'].append('Difficulty preview updates during typing without mutating bytes until normal commit; Actions & rules immediately updates original-texture description panel')
        # A small list resize exercises the real Galaxy container with shifted following members.
        page.evaluate('''()=>{const f=app.files.find(f=>f.name==='galaxy.mmd');app.transact('Resize fixture opponent list',[f],()=>{const d=f.doc,r=d.getRoster(238,'enemies');d.setRoster(238,'enemies',[...r.entries,{...r.entries[0]}]);});}''')
        galaxy_out=OUT/'galaxy.mmd'
        with page.expect_download() as event:page.locator('#export-current').click()
        event.value.save_as(galaxy_out)
        page.get_by_role('button',name='Overview',exact=False).first.click()
        page.get_by_role('button',name='↑ Import to game',exact=True).click()
        expect(dialog.locator('.archive-notice')).to_contain_text('Save your changes first')
        dialog.get_by_label('Target AFS archive',exact=True).set_input_files(str(AFS[0]))
        dialog.get_by_label('Saved edited MMD / DAT / TXT files',exact=True).set_input_files(str(galaxy_out))
        dialog.get_by_role('button',name='Review import',exact=True).click()
        expect(dialog.get_by_role('heading',name='Import plan')).to_be_visible(timeout=60000)
        dialog.get_by_label('Target AFS archive',exact=True).set_input_files(str(AFS[1]))
        expect(dialog.get_by_role('heading',name='Import plan')).to_have_count(0)
        expect(dialog.locator('.archive-status')).to_contain_text('Selection changed')
        dialog.get_by_label('Target AFS archive',exact=True).set_input_files(str(AFS[0]))
        dialog.get_by_role('button',name='Review import',exact=True).click()
        expect(dialog.get_by_role('heading',name='Import plan')).to_be_visible(timeout=60000)
        dialog.get_by_role('button',name='Build patched AFS',exact=True).click()
        expect(dialog.get_by_role('heading',name='Patched copy verified')).to_be_visible(timeout=60000)
        assert dialog.locator('.archive-results button').all_text_contents()==['Download Patched AFS']
        with page.expect_download() as event:
            dialog.get_by_role('button',name='Download Patched AFS',exact=True).click()
        patched=OUT/'st_pack_progress_pt_ps3.modded.afs';event.value.save_as(patched)
        assert event.value.suggested_filename==patched.name
        with patched.open('rb') as fh:
            fh.seek(8+872*8);offset,size=struct.unpack('<II',fh.read(8));fh.seek(offset);body=fh.read(size)
        output={'bytes':patched.stat().st_size,'body':base64.b64encode(body).decode()}
        output_body=base64.b64decode(output['body']);original,_=afs_member(AFS[0],872)
        original_pak=z.read_container(original)[0];patched_pak=z.read_container(output_body)[0]
        for a,b in zip(z.members(original_pak),z.members(patched_pak)):
            actual=patched_pak[b['offset']:b['offset']+b['size']]
            assert actual==(galaxy_out.read_bytes() if a['name']=='galaxy.mmd' else original_pak[a['offset']:a['offset']+a['size']]),a['name']
        report['steps'].append('Actual progress AFS rebuilt through UI with a resized Galaxy MMD; independent Python decoder checks edited mission and every untouched sibling; download-only output preserves source')
        dialog.get_by_role('button',name='✕',exact=True).click()
        # Exercise localized TXT growth through the actual UI and original language AFS.
        page.evaluate('()=>app.selectFile(app.files.find(f=>f.name==="TUTO_000_IT.txt").id)')
        edited_text='Italian tutorial roundtrip <PAD=＄Ｒ１>\nText edited in Galaxy Studio.'
        page.get_by_label('Localized tutorial text',exact=True).fill(edited_text)
        with page.expect_download() as event:page.locator('#export-current').click()
        text_out=OUT/'TUTO_000_IT.txt';event.value.save_as(text_out)
        page.locator('[data-tab="home"]').click();page.get_by_role('button',name='↑ Import to game',exact=True).click()
        dialog.get_by_label('Target AFS archive',exact=True).set_input_files(str(AFS[2]))
        dialog.get_by_label('Saved edited MMD / DAT / TXT files',exact=True).set_input_files(str(text_out))
        dialog.get_by_role('button',name='Review import',exact=True).click()
        expect(dialog.get_by_role('heading',name='Import plan')).to_be_visible(timeout=60000)
        dialog.get_by_role('button',name='Build patched AFS',exact=True).click()
        expect(dialog.get_by_role('heading',name='Patched copy verified')).to_be_visible(timeout=60000)
        with page.expect_download() as event:dialog.get_by_role('button',name='Download Patched AFS',exact=True).click()
        text_afs=OUT/'st_pack_battle_others_pt_ps3.modded.afs';event.value.save_as(text_afs)
        original=z.read_container(afs_member(AFS[2],100)[0])[0]
        rewritten=z.read_container(afs_member(text_afs,100)[0])[0]
        from build_kid_buu_mod import member_body
        for member in z.members(original):
            old=original[member['offset']:member['offset']+member['size']]
            new=member_body(rewritten,member['name'])
            if member['name']=='G_Tutorial_IT.pak':
                for entry in z.members(old):
                    expect_bytes=text_out.read_bytes() if entry['name']=='TUTO_000_IT.txt' else old[entry['offset']:entry['offset']+entry['size']]
                    assert member_body(new,entry['name'])==expect_bytes,entry['name']
            else:assert new==old,member['name']
        for index in [96,98,102,104,106]:assert afs_member(text_afs,index)[0]==afs_member(AFS[2],index)[0]
        report['steps'].append('Localized Italian TXT edited/exported/imported through UI into actual battle_others AFS; independent decoder confirms exact new bytes, intact nested siblings and byte-identical other language entries')
        dialog.get_by_role('button',name='✕',exact=True).click()
        node(117,66)
        page.set_viewport_size({'width':1120,'height':900});page.screenshot(path=str(OUT/'04-narrow-desktop.png'),full_page=True)
        assert not page.evaluate('()=>document.documentElement.scrollWidth>innerWidth+2')
        page.evaluate('()=>document.querySelectorAll("img[loading=lazy]").forEach(i=>i.loading="eager")')
        page.wait_for_function('()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)')
        assert not report['errors'],report['errors'];assert not report['external_requests']
        assert hashes=={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sources}
        report['result']='PASS';browser.close()
finally:
    server.shutdown();(OUT/'archives-preview-browser-qa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
