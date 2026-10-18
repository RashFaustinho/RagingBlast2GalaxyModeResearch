#!/usr/bin/env python3
"""Release-preparation features with private loose game fixtures; no source writes."""
import argparse
import hashlib
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--fixtures', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = args.output
out.mkdir(parents=True, exist_ok=True)
fixtures = args.fixtures
inputs = [fixtures / n for n in ['galaxy.mmd', 'preset_character_galaxy.dat', 'preset_appearance_table.dat', 'preset_strength_table.dat', 'tutorial_message_table_01.dat']]
texts = [fixtures / 'localized' / ('TUTO_000_' + lang + '.txt') for lang in ['US', 'IT', 'FR', 'DE', 'SP', 'JP']]
roster = sorted((fixtures / 'roster').iterdir())
before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs + texts + roster}
report = {'steps': [], 'errors': [], 'external_requests': [], 'result': 'INCOMPLETE'}

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1550, 'height': 1080}, accept_downloads=True)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('request', lambda r: report['external_requests'].append(r.url) if r.url.startswith(('http:', 'https:')) and not r.url.startswith(url) else None)
        page.on('dialog', lambda d: d.accept())
        page.goto(url)
        expect(page.locator('.hero h1')).to_have_text('Raging Blast 2Galaxy Studio')
        expect(page.locator('.hero')).to_contain_text('You can open MULTIPLE .MMD/.DAT files together')
        expect(page.locator('.archive-bridge')).to_contain_text('Extract / Import quickly from / to AFS')
        assert 'Original game:' not in page.locator('.sidebar').inner_text()
        expect(page.locator('[data-tab="help"]')).to_contain_text('Tutorial messages')
        page.screenshot(path=str(out / 'overview.png'), full_page=True)
        page.locator('#file-input').set_input_files([str(f) for f in inputs])
        page.wait_for_function('() => app.files.length === 5')
        # Message-order DATs are language-independent. Changing the preview edits no file.
        before_bytes = page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))')
        for language in ['IT', 'FR', 'DE', 'SP', 'JP', 'US']:
            page.get_by_label('Tutorial preview language', exact=True).select_option(language)
            expected = page.evaluate('()=>{const f=app.files.find(f=>f.kind==="help"),s=app.ui.helpTables;return RB2.HELP_LANGUAGES[s.language].find(r=>r.id===f.doc.row(0)).text;}')
            expect(page.locator('.help-text-preview')).to_have_text(expected)
        assert page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))') == before_bytes
        page.locator('#file-input').set_input_files([str(f) for f in texts])
        page.wait_for_function('() => app.files.length === 11')
        page.evaluate('app.selectFile(app.files.find(f=>f.name==="TUTO_000_IT.txt").id)')
        replacement = 'Test italiano: <PAD=＄Ｒ１>\nSeconda riga.'
        page.get_by_label('Localized tutorial text', exact=True).fill(replacement)
        with page.expect_download() as event: page.locator('#export-current').click()
        edited = out / 'TUTO_000_IT.txt'
        event.value.save_as(edited)
        original = texts[1].read_bytes()
        # Independent format oracle: BOM, UTF-16LE and original whole-NUL suffix.
        nuls = 0
        for i in range(len(original) - 2, 0, -2):
            if original[i:i+2] != b'\0\0': break
            nuls += 1
        assert edited.read_bytes() == b'\xff\xfe' + replacement.encode('utf-16le') + b'\0\0' * nuls
        page.locator('#undo').click()
        assert bytes(page.evaluate('Array.from(app.files.find(f=>f.name==="TUTO_000_IT.txt").doc.encode())')) == original
        page.locator('#redo').click()
        assert page.evaluate('app.files.filter(f=>f.kind==="tutorialText"&&f.name!=="TUTO_000_IT.txt").every(f=>!f.dirty)')
        report['steps'].append('All six language previews leave DAT bytes intact; localized TXT edit/export uses exact UTF-16 bytes, preserves other languages and supports undo/redo')
        # Both diagrams are live drafts and preserve native slot order.
        page.evaluate('app.openPreset(app.files.find(f=>f.name==="preset_character_galaxy.dat"),0)')
        assert page.locator('.link-diamond-panel').count() == 2
        assert page.locator('.link-diamond-slot').count() == 8
        assert page.locator('.link-slot-number').count() == 0
        boxes = [page.locator('.link-diamond-panel').first.locator(f'.slot-{i}').bounding_box() for i in range(4)]
        assert boxes[0]['x'] < boxes[1]['x'] < boxes[2]['x'] and boxes[1]['y'] < boxes[0]['y'] < boxes[3]['y']
        field = page.locator('label.field').filter(has=page.locator('span', has_text='Form-link slot 1 · Left')).locator('input').first
        page.locator('.link-diamond-slot').first.click()
        expect(field).to_be_focused()
        original_preset = page.evaluate('Array.from(app.files.find(f=>f.kind==="preset").doc.encode())')
        field.fill('1')
        expect(page.locator('.link-diamond-slot').first).to_have_attribute('aria-label', __import__('re').compile(r'preset|#1'))
        assert page.evaluate('Array.from(app.files.find(f=>f.kind==="preset").doc.encode())') == original_preset
        expect(page.locator('.link-diamond-slot').first.locator('img')).to_be_visible()
        page.locator('.link-diamonds').screenshot(path=str(out / 'preset-diamonds.png'))
        page.locator('[data-tab="reference"]').click()
        assert page.evaluate('app.files.find(f=>f.kind==="preset").doc.row(0)[3]') == 1
        report['steps'].append('Independent transformation/fusion diamonds use left/top/right/bottom slot order; clicks focus the matching field and draft portraits update before byte commit')
        # Pagination reaches all entries and search/category changes reset the page.
        page.get_by_label('Reference category', exact=True).select_option('items')
        expect(page.locator('.reference-pages')).to_contain_text('Page 1 of 3')
        assert page.locator('.reference-table tbody tr').count() == 150
        page.get_by_role('button', name='Next page', exact=True).click()
        assert page.locator('.reference-table tbody tr').first.locator('td').first.inner_text().split()[0] == '150'
        page.get_by_role('button', name='Next page', exact=True).click()
        assert page.locator('.reference-table tbody tr').count() == 81
        expect(page.get_by_role('button', name='Next page', exact=True)).to_be_disabled()
        page.get_by_label('Search reference', exact=True).fill('Defense')
        expect(page.locator('.reference-pages')).to_contain_text('Page 1 of 1')
        page.get_by_label('Search reference', exact=True).fill('no matches anywhere 98765')
        expect(page.locator('.reference-pages')).to_contain_text('0 entries')
        page.get_by_label('Reference category', exact=True).select_option('moves')
        expect(page.locator('.reference-pages')).to_contain_text('Page 1 of 5')
        report['steps'].append('150-row pagination reaches the last item page, disables unavailable navigation and resets correctly for filtering, empty results and category changes')
        # Read-only import from the actual native-name map and loose localized text files.
        page.locator('[data-tab="home"]').click()
        page.get_by_role('checkbox', name='Enable mod support', exact=True).check()
        page.get_by_role('button', name='Read roster from game files…', exact=True).click()
        dialog = page.locator('#app-dialog')
        dialog.get_by_label('Roster game files', exact=True).set_input_files([str(f) for f in roster])
        dialog.get_by_role('button', name='Read selected files', exact=True).click()
        expect(dialog.locator('[role="status"]')).to_contain_text('100 native forms')
        expect(dialog.locator('[role="status"]')).to_contain_text('0 forms with incomplete names')
        assert page.evaluate('app.modProfile === null')
        dialog.get_by_role('button', name='Use this roster', exact=True).click()
        assert page.evaluate('app.characterName(3)') == 'Goku / Super Saiyan 3'
        assert page.evaluate('app.modProfile.characters.length') == 100
        assert page.evaluate('app.modProfile.enhancedCharacters.length') == 66
        assert page.evaluate('app.modProfile.characters.find(c=>c.id===3).defaultMoves.length') == 5
        report['steps'].append('Game-file roster preview and apply reproduce 100 native names, 66 groups and move defaults without modifying loaded game documents')
        # Workspace includes new text kind and mod support; logs remain this session.
        with page.expect_download() as event: page.locator('#save-project').click()
        workspace = out / 'session.rb2project'; event.value.save_as(workspace)
        snapshot = page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))')
        page.locator('#clear-workspace').click()
        page.locator('#project-input').set_input_files(str(workspace))
        page.wait_for_function('() => app.files.length===11')
        assert page.evaluate('app.files.map(f=>Array.from(f.doc.encode()))') == snapshot
        assert page.evaluate('app.characterName(3)') == 'Goku / Super Saiyan 3'
        # Failed open is caught/logged and leaves the editor usable.
        page.evaluate('app.openFiles([new File([new Uint8Array([1,2,3])], "TUTO_000_DE.txt")])')
        page.locator('#session-log').click()
        expect(dialog).to_contain_text('Nothing is uploaded')
        dialog.get_by_label('Log level', exact=True).select_option('2')
        expect(dialog.locator('.session-log-list')).to_contain_text('file.openFailed')
        with page.expect_download() as event: dialog.get_by_role('button', name='Download session log', exact=True).click()
        log_file = out / 'session-log.json'; event.value.save_as(log_file)
        log = json.loads(log_file.read_text())
        assert log['format'] == 'RB2-Galaxy-Studio-Session-Log'
        events = {e['event'] for e in log['events']}
        assert {'file.opened', 'edit.applied', 'files.exported', 'roster.read', 'catalog.changed', 'file.openFailed'} <= events
        assert 'Test italiano' not in log_file.read_text()
        assert 'file:///' not in log_file.read_text()
        report['steps'].append('Workspace restores localized edits and roster; downloadable filtered session diagnostics record edits, export and failed reads without including text contents')
        assert not report['errors'], report['errors']
        assert not report['external_requests'], report['external_requests']
        browser.close()
    assert all(hashlib.sha256(Path(f).read_bytes()).hexdigest() == digest for f, digest in before.items())
    report['input_files_unchanged'] = True
    report['result'] = 'PASS'
finally:
    server.shutdown()
    report['source_sha256'] = {str(f.relative_to(root)): hashlib.sha256(f.read_bytes()).hexdigest() for f in [root/'index.html', root/'styles.css', *sorted((root/'js').glob('*.js'))]}
    (out / 'release-features-browser-qa.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
