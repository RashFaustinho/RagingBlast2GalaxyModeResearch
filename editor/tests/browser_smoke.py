#!/usr/bin/env python3
"""Exercise Galaxy Studio with real extracted files in an actual browser.

Requires Python Playwright and a Chromium executable. Game fixtures are never
bundled. The supplied fixtures and source files are read-only; downloaded test
outputs go to a temporary directory. On managed machines that block file://,
use --http: it serves only the editor directory on a temporary loopback port.

Example:
  python editor/tests/browser_smoke.py --http --chromium /usr/bin/chromium \
      --fixtures /tmp/rb2-editor-test-fixtures --output /tmp/rb2-editor-browser-qa
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from zipfile import ZipFile

from playwright.sync_api import expect, sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", type=Path, default=Path("/tmp/rb2-editor-test-fixtures"))
    parser.add_argument("--output", type=Path, default=Path("/tmp/rb2-editor-browser-qa"))
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--http", action="store_true")
    args = parser.parse_args()
    editor = Path(__file__).resolve().parents[1]
    args.output.mkdir(parents=True, exist_ok=True)
    fixtures = sorted(p for p in args.fixtures.iterdir() if p.name.endswith(".mmd") or p.name.startswith("preset_"))
    assert len(fixtures) == 25, "Expected 18 MMD and 7 preset DAT originals"
    original_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in fixtures}
    server = None
    url = (editor / "index.html").as_uri()
    if args.http:
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(editor)))
        Thread(target=server.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{server.server_port}/"
    tested_sources = [editor / "index.html", editor / "styles.css", *sorted((editor / "js").glob("*.js"))]
    source_hashes = {str(p.relative_to(editor)): hashlib.sha256(p.read_bytes()).hexdigest() for p in tested_sources}
    report = {"transport": "loopback HTTP" if args.http else "file://", "fixture_files": len(fixtures), "source_sha256": source_hashes, "steps": [], "errors": [], "external_requests": []}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=args.chromium, args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 1600, "height": 1000}, accept_downloads=True)
            page.set_default_timeout(10000)
            page.on("pageerror", lambda e: report["errors"].append(str(e)))
            page.on("console", lambda m: report["errors"].append(m.text) if m.type == "error" else None)
            page.on("request", lambda r: report["external_requests"].append(r.url) if r.url.startswith(("https://", "http://")) and not r.url.startswith(url) else None)
            page.on("dialog", lambda d: d.accept())

            def select(name):
                page.locator(f'#file-list button[title="{name}"]').click()

            def state(name, expression):
                return page.evaluate("([name, expression]) => {const f=app.files.find(f=>f.name===name);return expression==='bytes'?Array.from(f.doc.encode()):expression==='count'?(f.doc.rootCount??f.doc.count):f.kind;}", [name, expression])

            def node(name, number, owner=None):
                select(name)
                page.evaluate("([name, node, owner]) => {const f=app.files.find(f=>f.name===name);const key=f.kind==='main'?'galaxy':'zone';const s=app.ui.mmd[key].files[f.id];s.node=node;if(owner!==null)s.owner=owner;s.tab='mission';app.refresh();}", [name, number, owner])

            def subtab(label):
                page.locator('.subtabs').get_by_role("button", name=label, exact=True).click()

            def scalar(label, value):
                control = page.locator("label.field").filter(has=page.locator(".field-label", has_text=label)).locator("input").first
                control.fill(str(value))
                control.press("Tab")

            def download(selector, name):
                with page.expect_download() as event:
                    page.locator(selector).click()
                dest = args.output / name
                event.value.save_as(dest)
                return dest

            page.goto(url)
            expect(page.locator("h1")).to_contain_text("Galaxy Studio")
            page.screenshot(path=str(args.output / "01-overview.png"))
            page.locator("#file-input").set_input_files([str(f) for f in fixtures])
            expect(page.locator("#file-count")).to_have_text("25")
            assert page.evaluate("() => app.files.every(f=>!f.dirty)")
            assert not page.evaluate("() => app.validateFiles().filter(i=>i.type==='error')")
            for fixture in fixtures:
                assert bytes(state(fixture.name, "bytes")) == fixture.read_bytes(), fixture.name
            report["steps"].append("Imported all 25 original files; browser encode is byte-exact; no structural errors")

            node("galaxy.mmd", 117, 66)
            scalar("Arena · +08", 8)
            expected = bytearray((args.fixtures / "galaxy.mmd").read_bytes())
            offset = page.evaluate("() => app.files.find(f=>f.name==='galaxy.mmd').doc.rootOffset(117)+8")
            expected[offset:offset+2] = (8).to_bytes(2, "big")
            exported = download("#export-current", "single-galaxy.mmd")
            assert exported.read_bytes() == expected
            page.locator("#undo").click()
            assert bytes(state("galaxy.mmd", "bytes")) == (args.fixtures / "galaxy.mmd").read_bytes()
            page.locator("#redo").click()
            assert bytes(state("galaxy.mmd", "bytes")) == expected
            circle = page.locator('.galaxy-map g[data-node="117"] .node-circle')
            circle.scroll_into_view_if_needed()
            box = circle.bounding_box()
            x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x + 35, y - 20, steps=5)
            page.mouse.up()
            assert bytes(state("galaxy.mmd", "bytes")) != expected
            assert not page.evaluate("() => app.files.find(f=>f.name==='galaxy.mmd').doc.validateGraph()")
            page.locator("#undo").click()
            assert bytes(state("galaxy.mmd", "bytes")) == expected
            subtab("Teams")
            expect(page.locator(".character-portrait").first).to_be_visible()
            page.screenshot(path=str(args.output / "02-galaxy-teams.png"))
            report["steps"].append("Edited stage through UI; downloaded exact two-byte patch; dragged map node; undo and redo preserved bytes")

            # Multiple buffered editors must commit as one transaction. A bad
            # second list must not leave the first list silently committed.
            subtab("Actions & rules")
            page.get_by_label("Battle modifier items · +4C IDs", exact=True).fill("0xAD")
            page.get_by_label("Mission UI item list A · +50 IDs", exact=True).fill("invalid-number")
            page.locator("#export-current").click()
            assert bytes(state("galaxy.mmd", "bytes")) == expected
            assert page.evaluate("() => !!app.pendingForm")
            page.get_by_label("Mission UI item list A · +50 IDs", exact=True).fill("0x4F")
            subtab("Battle")
            assert page.evaluate("() => Array.from(app.files.find(f=>f.name==='galaxy.mmd').doc.getList(117,76,2))") == [0,173]
            assert page.evaluate("() => Array.from(app.files.find(f=>f.name==='galaxy.mmd').doc.getList(117,80,2))") == [0,79]
            page.locator("#undo").click()
            assert bytes(state("galaxy.mmd", "bytes")) == expected
            report["steps"].append("Two buffered lists commit atomically; invalid second list rolls back both; one undo restores prior bytes")

            select("preset_appearance_table.dat")
            expect(page.get_by_label("Super — Up", exact=True)).to_be_visible()
            page.get_by_label("Super — Up", exact=True).fill("3")
            # Export must commit a valid pending form before taking its snapshot.
            exported = download("#export-current", "appearance-pending-export.dat")
            appearance_expected = bytearray((args.fixtures / "preset_appearance_table.dat").read_bytes())
            appearance_expected[28:32] = (3).to_bytes(4, "big")
            assert exported.read_bytes() == appearance_expected
            assert page.evaluate("() => app.pendingForm === null")
            select("preset_character_galaxy.dat")
            expect(page.get_by_label("Appearance index", exact=True)).to_be_visible()
            counts_before = {name: state(name, "count") for name in ["preset_appearance_table.dat", "preset_strength_table.dat", "preset_character_galaxy.dat"]}
            page.get_by_role("button", name="Clone complete preset", exact=True).click()
            for name, count in counts_before.items():
                assert state(name, "count") == count + 1
            page.screenshot(path=str(args.output / "03-preset-clone.png"))
            page.locator("#undo").click()
            for name, count in counts_before.items():
                assert state(name, "count") == count
            page.locator("#redo").click()
            for name, count in counts_before.items():
                assert state(name, "count") == count + 1
            report["steps"].append("Pending move edit committed on export; complete preset clone and three-file undo/redo succeeded")

            node("galaxy.mmd", 117, 66)
            subtab("Map & owners")
            page.get_by_role("button", name="Duplicate mission 117", exact=True).click()
            assert state("galaxy.mmd", "count") == 499
            assert page.evaluate("() => app.files.find(f=>f.name==='galaxy.mmd').doc.getOwner(66).nodes.some(r=>r.node===498)")
            assert not page.evaluate("() => app.files.find(f=>f.name==='galaxy.mmd').doc.validateGraph()")
            expect(page.locator(".mission-title h2")).to_have_text("Mission 498")
            page.screenshot(path=str(args.output / "04-new-mission.png"))
            report["steps"].append("Created mission 498 in Kid Buu Galaxy via UI with reciprocal graph connection")

            node("tutorial.mmd", 5)
            stage = page.locator("label.field").filter(has=page.locator(".field-label", has_text="Arena · +08")).locator("input").first
            expect(stage).to_have_value("14")
            for tab in ["Teams", "Actions & rules", "Progression", "Map & owners", "Advanced", "Battle"]:
                subtab(tab)
                assert not page.get_by_text("This section could not be decoded", exact=True).count(), tab
            assert bytes(state("tutorial.mmd", "bytes")) == (args.fixtures / "tutorial.mmd").read_bytes()
            report["steps"].append("Tutorial5 stage14, conditional lists and all advanced panels remain readable and unchanged")

            # Copy numeric expressions from a different MMD: the descriptor
            # indices belong to the source, so they must be cloned locally.
            subtab("Actions & rules")
            page.get_by_text("Copy prompts from another mission", exact=True).click()
            galaxy_id = page.evaluate("() => app.files.find(f=>f.name==='galaxy.mmd').id")
            page.get_by_label("Action donor MMD", exact=True).select_option(galaxy_id)
            page.get_by_label("Mission with action prompts", exact=True).select_option("174")
            page.get_by_role("button", name="Copy action list", exact=True).click()
            copied = page.evaluate("""() => {
              const source=app.files.find(f=>f.name==='galaxy.mmd').doc;
              const target=app.files.find(f=>f.name==='tutorial.mmd').doc;
              const want=source.getActions(174), got=target.getActions(5);
              return {count:got.length,objective:new DataView(target.readRoot(5).buffer).getUint16(16,false),
                equal:got.length===want.length&&got.every((x,i)=>x.action===want[i].action&&x.parameter===want[i].parameter&&
                  (!x.expression&&!want[i].expression || x.expression&&want[i].expression&&
                    String(target.body(x.expression))===String(source.body(want[i].expression)))),
                expressionGeometry:got.filter(x=>x.expression).map(x=>target.descriptors[x.expression].slice(0,2))};
            }""")
            assert copied["equal"] and copied["count"] == 8 and copied["objective"] == 29, copied
            assert copied["expressionGeometry"] and all(x[0] == 1 and x[1] % 8 == 0 for x in copied["expressionGeometry"])
            page.locator("#undo").click()
            assert bytes(state("tutorial.mmd", "bytes")) == (args.fixtures / "tutorial.mmd").read_bytes()
            report["steps"].append("Copied cross-file action donor174 with independent numeric expression descriptors; objective preserved; undo exact")

            node("zone_green_square.mmd", 0)
            scalar("Handicap", 12)
            subtab("Conditions & rewards")
            expect(page.get_by_role("heading", name="Challenge Stamp criteria", exact=True)).to_be_visible()
            page.get_by_label("Challenge Stamp criteria IDs", exact=True).fill("0\n12")
            subtab("Route")
            assert page.evaluate("() => Array.from(app.files.find(f=>f.name==='zone_green_square.mmd').doc.getList(0,40,4))") == [0,0,0,0,0,0,0,12]
            subtab("Conditions & rewards")
            page.get_by_label("Challenge Stamp criteria IDs", exact=True).fill("invalid-number")
            select("galaxy.mmd")
            assert page.evaluate("() => app.files.find(f=>f.id===app.selectedFileId).name") == "zone_green_square.mmd"
            expect(page.get_by_label("Challenge Stamp criteria IDs", exact=True)).to_have_value("invalid-number")
            page.get_by_label("Challenge Stamp criteria IDs", exact=True).fill("0\n12")
            subtab("Route")
            page.screenshot(path=str(args.output / "05-battle-zone.png"))
            for name in [f.name for f in fixtures if f.name.startswith("zone_")]:
                select(name)
                for tab in ["Battle", "Conditions & rewards", "Route", "Advanced"]:
                    subtab(tab)
                    assert not page.get_by_text("This section could not be decoded", exact=True).count(), f"{name}: {tab}"
            report["steps"].append("Edited Battle Zone handicap; valid list drafts autoapply on navigation, invalid drafts block it; every panel of all sixteen Zone files opens")

            select("preset_character_battle_zone_spe")
            expect(page.get_by_role("heading", name="Battle Zone — Ultimate presets #0", exact=True)).to_be_visible()
            page.locator('[data-tab="reference"]').click()
            expect(page.get_by_role("heading", name="Reference library", exact=True)).to_be_visible()
            page.locator("#validate").click()
            expect(page.get_by_text("No structural errors found.", exact=True)).to_be_visible()
            page.locator("#app-dialog").get_by_role("button", name="✕", exact=True).click()

            expected_changed = page.evaluate("() => app.files.filter(f=>f.dirty).map(f=>({name:f.name,path:RB2.Archives.exportPath(f.name),bytes:Array.from(f.doc.encode())}))")
            zip_path = download("#export-all", "edited-files.zip")
            with ZipFile(zip_path) as archive:
                assert archive.testzip() is None
                assert set(archive.namelist()) == {f["path"] for f in expected_changed} | {"Galaxy-Studio-export.json", "Galaxy-Studio-session-log.json"}
                for f in expected_changed:
                    assert archive.read(f["path"]) == bytes(f["bytes"]), f["name"]
                manifest = json.loads(archive.read("Galaxy-Studio-export.json"))
                assert len(manifest["files"]) == len(expected_changed)
                assert {f["path"] for f in manifest["files"]} == {f["path"] for f in expected_changed}
            report["exported_files"] = [{"name": f["name"], "bytes": len(f["bytes"]), "sha256": hashlib.sha256(bytes(f["bytes"])).hexdigest()} for f in expected_changed]
            report["steps"].append("Downloaded ZIP contains exactly modified files grouped by AFS plus manifest; every CRC and output byte checked")

            project_path = download("#save-project", "saved-workspace.rb2project")
            project = json.loads(project_path.read_text())
            before = {f["name"]: f for f in project["files"]}
            assert len(before) == 25
            for f in fixtures:
                assert base64.b64decode(before[f.name]["original"]) == f.read_bytes()
            page.locator("#clear-workspace").click()
            expect(page.locator("#file-count")).to_have_text("0")
            page.locator("#project-input").set_input_files(str(project_path))
            expect(page.locator("#file-count")).to_have_text("25")
            for f in fixtures:
                assert bytes(state(f.name, "bytes")) == base64.b64decode(before[f.name]["current"]), f.name
            report["steps"].append("Saved, closed and reopened full workspace; original and edited bytes preserved for all25 files")

            assert not report["errors"], report["errors"]
            assert not report["external_requests"], report["external_requests"]
            assert original_hashes == {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in fixtures}
            assert source_hashes == {str(p.relative_to(editor)): hashlib.sha256(p.read_bytes()).hexdigest() for p in tested_sources}, "Editor sources changed during browser QA; rerun against the final revision"
            report["steps"].append("No browser JavaScript/console errors, external requests or input-file changes")
            report["result"] = "PASS"
            browser.close()
    except Exception as error:
        report["result"] = "FAIL"
        report["failure"] = str(error)
        raise
    finally:
        if server:
            server.shutdown()
            server.server_close()
        (args.output / "browser-qa.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
