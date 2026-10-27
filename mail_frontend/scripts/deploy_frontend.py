#!/usr/bin/env python3
"""Validate a website release and atomically switch its serving symlink."""
import argparse
import ctypes
from datetime import datetime, timezone
import fcntl
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import platform
import re
import shutil
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def exchange(left, right):
    """First migration: exchange a populated directory and a symlink without a gap."""
    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform.startswith('linux'):
        if hasattr(libc, 'renameat2'):
            result = libc.renameat2(-100, os.fsencode(left), -100, os.fsencode(right), 2)
        else:
            # CentOS 7 has the kernel operation but glibc 2.17 lacks its wrapper.
            # Linux syscall tables: arch/x86/syscalls/syscall_64.tbl and
            # include/uapi/asm-generic/unistd.h (renameat2, Linux v3.15+).
            number = {'x86_64': 316, 'aarch64': 276}.get(platform.machine())
            if number is None:
                raise RuntimeError('Atomic directory exchange unsupported on this architecture')
            syscall = libc.syscall
            syscall.restype = ctypes.c_long
            result = syscall(ctypes.c_long(number), ctypes.c_long(-100), ctypes.c_char_p(os.fsencode(left)),
                             ctypes.c_long(-100), ctypes.c_char_p(os.fsencode(right)), ctypes.c_uint(2))
    elif sys.platform == 'darwin' and hasattr(libc, 'renamex_np'):
        result = libc.renamex_np(os.fsencode(left), os.fsencode(right), 2)
    else:
        raise RuntimeError('Atomic directory exchange unsupported; serving directory was not moved')
    if result:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))


def point(link, target):
    temporary = link.with_name('.' + link.name + '-next-' + str(os.getpid()))
    try:
        temporary.symlink_to(target, target_is_directory=True)
        os.replace(temporary, link)
    finally:
        temporary.unlink(missing_ok=True)


def unpack(archive, destination):
    seen = set()
    with tarfile.open(archive, 'r:gz') as package:
        members = package.getmembers()
        if sum(member.size for member in members) > 512 * 1024 * 1024:
            raise ValueError('Release exceeds 512 MiB unpacked limit')
        for member in members:
            parts = Path(member.name).parts
            if not parts or parts[0] != 'dist' or '..' in parts or Path(member.name).is_absolute():
                raise ValueError('Invalid release archive path')
            if member.name in seen or not (member.isfile() or member.isdir()):
                raise ValueError('Duplicate, linked or special archive entry')
            seen.add(member.name)
            target = destination.joinpath(*parts[1:])
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with package.extractfile(member) as source, target.open('wb') as output:
                    shutil.copyfileobj(source, output)
                target.chmod(0o644)


class EntryAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'script' and attrs.get('src'):
            self.paths.append(attrs['src'])
        if tag == 'link' and set(attrs.get('rel', '').split()) & {'stylesheet', 'modulepreload', 'icon'}:
            if attrs.get('href'):
                self.paths.append(attrs['href'])


def validate(release):
    index = release / 'index.html'
    if not index.is_file() or not index.stat().st_size:
        raise ValueError('Missing or empty index.html')
    parser = EntryAssets()
    parser.feed(index.read_text())
    if not any(path.endswith('.js') for path in parser.paths):
        raise ValueError('Missing JavaScript entry')
    for item in parser.paths:
        parsed = urllib.parse.urlsplit(item)
        if parsed.scheme or parsed.netloc:
            continue
        path = release / urllib.parse.unquote(parsed.path).lstrip('/')
        if not path.resolve().is_relative_to(release.resolve()) or not path.is_file() or not path.stat().st_size:
            raise ValueError('Missing or invalid entry asset: ' + item)


def preserve_assets(source, destination, manifest):
    for relative in manifest:
        path = Path(relative)
        if not path.parts or path.parts[0] != 'assets' or '..' in path.parts or path.is_absolute():
            raise ValueError('Invalid retained asset path')
        original, target = source / path, destination / path
        if original.is_symlink() or not original.is_file():
            raise ValueError('Missing retained release asset')
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            os.link(original, target)


def verify(url, expected):
    separator = '&' if '?' in url else '?'
    request = urllib.request.Request(url + separator + '_release_check=' + expected,
                                     headers={'Cache-Control': 'no-cache'})
    last_error = None
    for _ in range(10):
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if hashlib.sha256(response.read()).hexdigest() == expected:
                    return
            last_error = RuntimeError('Public index does not match this release')
        except Exception as error:
            last_error = error
        time.sleep(.2)
    raise RuntimeError('Website verification failed; restoring previous release') from last_error


def deploy(archive, root, version, sha256, verify_url, keep=3):
    root = root.absolute()
    root = root.parent.resolve() / root.name
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,80}', version):
        raise ValueError('Invalid release version')
    if keep < 2:
        raise ValueError('At least two releases must be retained')
    if digest(archive) != sha256:
        raise ValueError('Archive SHA-256 mismatch')
    root.parent.mkdir(parents=True, exist_ok=True)
    releases = root.parent / (root.name + '_releases')
    releases.mkdir(exist_ok=True)
    destination = releases / version
    lock = root.parent / ('.' + root.name + '.deploy.lock')
    with lock.open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if destination.exists():
            raise ValueError('Release version already exists')
        previous = root.resolve() if root.exists() else None
        if root.is_symlink() and (previous is None or previous.parent != releases or not previous.is_dir()):
            raise ValueError('Current release link is not managed by this deployment')
        if root.exists() and not root.is_dir():
            raise ValueError('Serving path is not a directory')
        staging = Path(tempfile.mkdtemp(prefix='.prepare-', dir=releases))
        switched = False
        try:
            unpack(archive, staging)
            validate(staging)
            staging.chmod(0o755)
            own_assets = sorted(str(path.relative_to(staging)) for path in (staging / 'assets').rglob('*') if path.is_file())
            history = sorted((path for path in releases.iterdir() if path.is_dir() and (path / '.release.json').is_file()),
                             key=lambda path: (path / '.release.json').stat().st_mtime, reverse=True)
            retained = list(dict.fromkeys(([previous] if previous else []) + history))[:keep - 1]
            for prior in retained:
                marker = prior / '.release.json'
                assets = json.loads(marker.read_text())['assets'] if marker.is_file() else [
                    str(path.relative_to(prior)) for path in (prior / 'assets').rglob('*') if path.is_file()]
                preserve_assets(prior, staging, assets)
            (staging / '.release.json').write_text(json.dumps({'version': version, 'assets': own_assets,
                'created_at': datetime.now(timezone.utc).isoformat()}))
            staging.rename(destination)
            if root.is_dir() and not root.is_symlink():
                legacy = releases / ('legacy-' + version)
                temporary = root.with_name('.' + root.name + '-exchange-' + str(os.getpid()))
                temporary.symlink_to(destination, target_is_directory=True)
                try:
                    exchange(root, temporary)
                    try:
                        temporary.rename(legacy)
                    except BaseException:
                        exchange(root, temporary)
                        raise
                    previous = legacy
                    switched = True
                    (legacy / '.release.json').write_text(json.dumps({'version': legacy.name, 'assets': [
                        str(path.relative_to(legacy)) for path in (legacy / 'assets').rglob('*') if path.is_file()]}))
                finally:
                    if temporary.is_symlink():
                        temporary.unlink()
            else:
                point(root, destination)
            switched = True
            verify(verify_url, digest(destination / 'index.html'))
        except BaseException:
            if switched and previous:
                point(root, previous)
            elif switched and root.is_symlink():
                root.unlink()
            if destination.exists() and root.resolve() != destination:
                shutil.rmtree(destination)
            raise
        finally:
            if staging.exists():
                shutil.rmtree(staging)
        # Delete only managed, inactive versions after successful verification.
        protected = {destination, previous, *retained}
        warnings = []
        for prior in history:
            if prior not in protected:
                try:
                    shutil.rmtree(prior)
                except OSError as error:
                    warnings.append('Could not remove inactive release ' + prior.name + ': ' + str(error))
        return {'version': version, 'current': str(destination), 'previous': str(previous) if previous else None,
                'index_sha256': digest(destination / 'index.html'), 'cleanup_warnings': warnings}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--verify-url', required=True)
    parser.add_argument('--keep', type=int, default=3)
    args = parser.parse_args()
    print(json.dumps(deploy(args.archive, args.root, args.version, args.sha256, args.verify_url, args.keep)))
