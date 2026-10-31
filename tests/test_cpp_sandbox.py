"""Trusted launcher failures must not count as failed learner programs."""
import importlib.util
from pathlib import Path
import unittest

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('sandbox',root/'scripts/cpp-sandbox.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)

class LauncherFailures(unittest.TestCase):
    def test_missing_mount_fails_closed(self):
        with self.assertRaises(RuntimeError):
            helper.bounded_process(helper.sandbox('/dsa-path-that-does-not-exist')+['--','/usr/bin/true'],'',5)

    def test_missing_executable_fails_closed(self):
        with self.assertRaises(RuntimeError):
            helper.bounded_process(helper.sandbox('/tmp')+['--','/missing-program'],'',5)

if __name__=='__main__': unittest.main()
