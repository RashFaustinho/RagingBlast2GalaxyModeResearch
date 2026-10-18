"""Reject incomplete or stale release verification, including newly added scripts."""
import tempfile
import unittest
from pathlib import Path
from package_galaxy_studio import production_hashes, verify_report, include_in_portable


class ReleaseVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'js').mkdir()
        for name in ['index.html', 'styles.css', 'js/app.js']:
            (self.root / name).write_text('fixture')
        self.sources = production_hashes(self.root)
        self.report = {'result': 'PASS', 'errors': [], 'source_sha256': self.sources.copy()}

    def test_complete_report_passes_but_changed_source_fails(self):
        verify_report(self.root, self.report, 'fixture', self.sources)
        (self.root / 'js/app.js').write_text('changed')
        with self.assertRaisesRegex(ValueError, 'untested source changed'):
            verify_report(self.root, self.report, 'fixture', self.sources)

    def test_missing_new_script_coverage_fails(self):
        (self.root / 'js/new.js').write_text('new code')
        with self.assertRaisesRegex(ValueError, 'coverage is incomplete'):
            verify_report(self.root, self.report, 'fixture', production_hashes(self.root))

    def test_incomplete_and_failed_runs_cannot_pass_with_empty_errors(self):
        for result in ['INCOMPLETE', 'FAIL', None]:
            self.report['result'] = result
            with self.assertRaisesRegex(ValueError, 'did not complete successfully'):
                verify_report(self.root, self.report, 'fixture', self.sources)

    def test_portable_keeps_current_app_and_evidence_without_duplicating_source_history(self):
        for name in ['index.html', 'js/app.js', 'assets/portraits/000.png',
                     'docs/guide.md', 'verification/unit-tests.json', 'previews/1.0/overview.png']:
            self.assertTrue(include_in_portable(self.root, self.root / name, (1, 0)), name)
        for name in ['tests/browser_smoke.py', 'verification/0.9/unit-tests.json',
                     'previews/0.10/overview.png', 'eslint.config.mjs', 'tests/__pycache__/x.pyc']:
            self.assertFalse(include_in_portable(self.root, self.root / name, (1, 0)), name)
        self.assertTrue(include_in_portable(self.root, self.root / 'tests/browser_smoke.py', (0, 10)))


if __name__ == '__main__':
    unittest.main()
