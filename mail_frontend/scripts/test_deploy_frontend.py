"""Exercise real archive validation, HTTP serving, atomic swaps and rollback locally."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import tarfile
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.request

import deploy_frontend as deployment


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='website-deploy-test-')
        self.base = Path(self.temporary.name)
        self.root = self.base / 'website'
        self.root.mkdir()
        self.write_release(self.root, 'old')

        class Handler(SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(self.root)))
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={'poll_interval': .02}, daemon=True)
        self.thread.start()
        self.url = 'http://127.0.0.1:' + str(self.server.server_port) + '/'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)
        self.temporary.cleanup()

    @staticmethod
    def write_release(directory, version):
        (directory / 'assets').mkdir(exist_ok=True)
        (directory / 'index.html').write_text('<script src="/assets/' + version + '.js"></script>')
        (directory / 'assets' / (version + '.js')).write_text('console.log("' + version + '")')

    def package(self, version):
        source = self.base / ('source-' + version)
        source.mkdir()
        self.write_release(source, version)
        archive = self.base / (version + '.tar.gz')
        with tarfile.open(archive, 'w:gz') as package:
            package.add(source, arcname='dist')
        return archive

    def release(self, version, **kwargs):
        archive = self.package(version)
        return deployment.deploy(archive, self.root, version, deployment.digest(archive), self.url, **kwargs)

    def read(self, path=''):
        with urllib.request.urlopen(self.url + path, timeout=2) as response:
            return response.read()

    def test_directory_migration_and_next_switch_have_no_missing_http_files(self):
        errors, samples, stop = [], [], threading.Event()

        def browse():
            while not stop.is_set():
                try:
                    index = self.read().decode()
                    asset = index.split('src="/')[1].split('"')[0]
                    samples.append(self.read(asset))
                    self.read('assets/old.js')  # A tab that loaded the old entry still works.
                except Exception as error:
                    errors.append(repr(error))

        probe = threading.Thread(target=browse, daemon=True)
        probe.start()
        try:
            self.release('first')
            self.release('second')
        finally:
            stop.set()
            probe.join(3)
        self.assertTrue(self.root.is_symlink())
        self.assertIn(b'second.js', self.read())
        self.assertGreater(len(samples), 2)
        self.assertEqual(errors, [])

    def test_public_verification_failure_restores_old_release(self):
        self.release('first')
        prior = self.root.resolve()
        with patch.object(deployment, 'verify', side_effect=RuntimeError('HTTP mismatch')):
            with self.assertRaisesRegex(RuntimeError, 'HTTP mismatch'):
                self.release('bad')
        self.assertEqual(self.root.resolve(), prior)
        self.assertIn(b'first.js', self.read())
        self.assertFalse((self.base / 'website_releases' / 'bad').exists())

    def test_first_migration_rolls_back_even_when_legacy_metadata_cannot_be_written(self):
        original = Path.write_text

        def write(path, *args, **kwargs):
            if path.parent.name == 'legacy-first':
                raise OSError('injected metadata write failure')
            return original(path, *args, **kwargs)

        with patch.object(Path, 'write_text', write):
            with self.assertRaisesRegex(OSError, 'metadata write'):
                self.release('first')
        self.assertIn(b'old.js', self.read())

    def test_checksum_missing_asset_and_unsafe_archive_preserve_live_site(self):
        archive = self.package('bad')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            deployment.deploy(archive, self.root, 'bad', 'incorrect', self.url)
        for name in ('dist/index.html', 'dist/../../outside'):
            with tarfile.open(archive, 'w:gz') as package:
                body = b'<script src="/assets/missing.js"></script>'
                member = tarfile.TarInfo(name)
                member.size = len(body)
                package.addfile(member, io.BytesIO(body))
            with self.assertRaises(ValueError):
                deployment.deploy(archive, self.root, 'bad', deployment.digest(archive), self.url)
            self.assertIn(b'old.js', self.read())
        self.assertFalse((self.base / 'outside').exists())

    def test_retention_bounds_directories_and_keeps_previous_dynamic_assets(self):
        for version in ('one', 'two', 'three', 'four', 'five'):
            self.release(version)
        releases = self.base / 'website_releases'
        self.assertEqual({path.name for path in releases.iterdir()}, {'three', 'four', 'five'})
        for version in ('three', 'four', 'five'):
            self.assertIn(version.encode(), self.read('assets/' + version + '.js'))
        manifest = json.loads((self.root / '.release.json').read_text())
        self.assertEqual(manifest['assets'], ['assets/five.js'])
        self.assertFalse((self.root / 'assets/one.js').exists())

    def test_verify_checks_actual_http_body_and_refuses_wrong_content(self):
        deployment.verify(self.url, deployment.digest(self.root / 'index.html'))
        with patch.object(deployment.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'Website verification failed'):
                deployment.verify(self.url, 'wrong')

    @unittest.skipUnless(sys.platform.startswith('linux'), 'Linux syscall compatibility regression')
    def test_first_migration_on_old_glibc_without_renameat2_wrapper(self):
        library = deployment.ctypes.CDLL(None, use_errno=True)

        class OldLibc:
            def __getattr__(self, name):
                if name == 'renameat2':
                    raise AttributeError(name)
                return getattr(library, name)

        with patch.object(deployment.ctypes, 'CDLL', return_value=OldLibc()):
            self.release('compatible')
        self.assertTrue(self.root.is_symlink())
        self.assertIn(b'compatible.js', self.read())
        self.assertIn(b'old', self.read('assets/old.js'))


if __name__ == '__main__':
    unittest.main()
