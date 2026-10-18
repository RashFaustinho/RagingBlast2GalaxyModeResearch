#!/usr/bin/env python3
"""Package a verified offline editor, preserving existing release archives."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

RELEASES = ('0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '0.10', '1.0')
BASE_REPORTS = (
    'browser-qa.json', 'help-browser-qa.json', 'guided-browser-qa.json',
    'mod-browser-qa.json', 'conditions-browser-qa.json',
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def production_hashes(root):
    files = [root / 'index.html', root / 'styles.css', *sorted((root / 'js').glob('*.js'))]
    return {str(p.relative_to(root)).replace('\\', '/'): digest(p) for p in files}


def include_in_portable(root, path, release):
    """Keep source history/tests in Git, not repeated in every application ZIP."""
    parts = path.relative_to(root).parts
    if '__pycache__' in parts or path.suffix == '.pyc':
        return False
    if release < (1, 0):
        return True
    if parts[0] == 'tests' or path.name in {'.prettierignore', '.prettierrc.json', 'eslint.config.mjs'}:
        return False
    if parts[0] == 'verification':
        return len(parts) == 2
    if parts[0] == 'previews':
        return len(parts) > 2 and parts[1] == '1.0'
    return True


def verify_report(root, report, label, expected_sources=None):
    require(not report.get('errors'), label + ': contains errors')
    hashes = report.get('source_sha256', {})
    if expected_sources is not None:
        require(report.get('result') == 'PASS', label + ': did not complete successfully')
        require(set(hashes) == set(expected_sources), label + ': source coverage is incomplete')
    require(bool(hashes), label + ': missing source hashes')
    for name, expected in hashes.items():
        require(digest(root / name) == expected, label + ': untested source changed: ' + name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--version', default='1.0', choices=RELEASES)
    parser.add_argument('--editor', type=Path, default=Path(__file__).resolve().parents[1] / 'editor')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output exists; choose a new release filename.')
    root = args.editor.resolve()
    release = tuple(map(int, args.version.split('.')))
    html = (root / 'index.html').read_text()
    marker = (f'name="application-version" content="{args.version}"' if release >= (0, 7)
              else args.version + ' · Research preview')
    require(marker in html, 'Release version does not match app metadata')
    files = sorted(p for p in root.rglob('*')
                   if p.is_file() and include_in_portable(root, p, release))
    require(len(list((root / 'assets/portraits').glob('*.png'))) == 100,
            'Expected all 100 original portraits')
    forbidden = {'.mmd', '.dat', '.afs', '.pak', '.zpak', '.elf', '.exe', '.rb2project'}
    require(all(p.suffix.lower() not in forbidden for p in files), 'Private game/test data in editor')
    reports = list(BASE_REPORTS)
    expected_sources = production_hashes(root) if release >= (0, 8) else None
    if release >= (0, 5):
        reports.append('archives-preview-browser-qa.json')
        assets = json.loads((root / 'assets/game-ui/manifest.json').read_text())
        require(len(assets['textures']) == 16, 'Expected all 16 game UI textures')
        for asset in assets['textures']:
            require(digest(root / 'assets/game-ui' / asset['file']) == asset['pngSha256'],
                    'Extracted texture changed: ' + asset['file'])
        units = json.loads((root / 'verification/unit-tests.json').read_text())
        require(units['failed'] == 0 and units['skipped'] == 0 and units['tests'] > 0
                and units['passed'] == units['tests'], 'Unit tests failed, skipped or did not run')
        verify_report(root, units, 'Unit tests', expected_sources)
    if release >= (0, 6):
        reports.append('refinements-browser-qa.json')
    if release >= (0, 7):
        reports.append('mission-management-browser-qa.json')
        logo = json.loads((root / 'assets/game-ui/title-logo-manifest.json').read_text())
        require(digest(root / 'assets/game-ui' / logo['file']) == logo['pngSha256'], 'Title logo changed')
    if release >= (0, 8):
        reports.extend(['galaxy-transfer-browser-qa.json', 'review-browser-qa.json'])
    if release >= (0, 9):
        reports.extend(['release-features-browser-qa.json', 'music-browser-qa.json'])
        require(f'name="application-build" content="release-{args.version}-' in html, 'Expected a release build tag')
    if release >= (0, 10):
        reports.extend(['feedback-browser-qa.json', 'zone-banner-browser-qa.json'])
    for name in reports:
        verify_report(root, json.loads((root / 'verification' / name).read_text()), name, expected_sources)
    manifest = {str(p.relative_to(root)).replace('\\', '/'): digest(p) for p in files}
    prefix = f'RB2-Galaxy-Studio-{args.version}/'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.output, 'x', compression=ZIP_DEFLATED, compresslevel=9) as z:
        for p in files:
            z.write(p, prefix + str(p.relative_to(root)).replace('\\', '/'))
        z.writestr(prefix + 'FILES.sha256', ''.join(f'{sha}  {name}\n' for name, sha in manifest.items()))
    with ZipFile(args.output) as z:
        require(z.testzip() is None, 'ZIP integrity verification failed')
        for name, sha in manifest.items():
            require(hashlib.sha256(z.read(prefix + name)).hexdigest() == sha,
                    'Packaged file hash mismatch: ' + name)
    sha = digest(args.output)
    args.output.with_suffix(args.output.suffix + '.sha256').write_text(f'{sha}  {args.output.name}\n')
    print(json.dumps({'file': str(args.output), 'bytes': args.output.stat().st_size, 'sha256': sha,
                      'entries': len(manifest) + 1, 'crc_and_file_hashes': 'PASS'}, indent=2))


if __name__ == '__main__':
    main()
