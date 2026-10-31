"""Personal local C++17 runner. Never execute learner code outside bubblewrap."""
import json
import ctypes
import os
import resource
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import tempfile
import time

CAP = 65536

def sandbox(work, writable=False):
    return ['/usr/bin/bwrap', '--unshare-all', '--unshare-user', '--die-with-parent', '--new-session',
            '--disable-userns', '--cap-drop', 'ALL', '--ro-bind', '/usr', '/usr',
            '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
            '--symlink', 'usr/lib64', '/lib64', '--proc', '/proc', '--dev', '/dev', '--remount-ro', '/dev',
            '--size', '67108864', '--tmpfs', '/tmp',
            '--bind' if writable else '--ro-bind', str(work), '/work', '--chdir', '/work',
            '--clearenv', '--setenv', 'PATH', '/usr/bin', '--setenv', 'HOME', '/tmp',
            '--setenv', 'LC_ALL', 'C', '--remount-ro', '/']

def process_filter(file):
    lib = ctypes.CDLL('libseccomp.so.2')
    lib.seccomp_init.argtypes=[ctypes.c_uint32]; lib.seccomp_init.restype=ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p]; lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
    lib.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint]
    lib.seccomp_export_bpf.argtypes=[ctypes.c_void_p,ctypes.c_int]
    lib.seccomp_release.argtypes=[ctypes.c_void_p]
    context=lib.seccomp_init(0x7fff0000)  # SCMP_ACT_ALLOW
    if not context: raise RuntimeError('Seccomp initialization failed.')
    try:
        for name in ['clone','clone3','fork','vfork','unshare','setns','ptrace','mount','umount2',
                     'bpf','perf_event_open','userfaultfd','io_uring_setup','keyctl','add_key','request_key']:
            number=lib.seccomp_syscall_resolve_name(name.encode())
            if number>=0 and lib.seccomp_rule_add(context,0x00050001,number,0):
                raise RuntimeError('Seccomp rule setup failed.')
        if lib.seccomp_export_bpf(context,file.fileno()): raise RuntimeError('Seccomp export failed.')
        file.seek(0)
    finally: lib.seccomp_release(context)

def bounded_process(argv, stdin, seconds, limits=None, single_process=False):
    # Nonblocking reads bound output before buffering; kill the entire PID namespace
    # when the wall/output limit is reached. Bubblewrap's reaper kills descendants.
    with tempfile.TemporaryFile() as input_file, tempfile.TemporaryFile() as info_file, tempfile.TemporaryFile() as filter_file:
        input_file.write(stdin.encode()); input_file.seek(0)
        def apply_limits():
            for name, value in (limits or {}).items(): resource.setrlimit(name, (value, value))
        # Bubblewrap writes setup information to a private inherited descriptor,
        # separate from learner stderr, and closes it before executing the program.
        argv = [argv[0], '--json-status-fd', str(info_file.fileno()), *argv[1:]]
        descriptors = [info_file.fileno()]
        if single_process:
            process_filter(filter_file); descriptors.append(filter_file.fileno())
            argv[1:1] = ['--seccomp', str(filter_file.fileno())]
        p = subprocess.Popen(argv, stdin=input_file, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, start_new_session=True,
                             pass_fds=descriptors, preexec_fn=apply_limits)
        chunks = {'stdout': bytearray(), 'stderr': bytearray()}
        reason = None
        started = time.monotonic()
        with selectors.DefaultSelector() as selector:
            for name in chunks:
                pipe = getattr(p, name); os.set_blocking(pipe.fileno(), False)
                selector.register(pipe, selectors.EVENT_READ, name)
            while selector.get_map():
                if time.monotonic() - started > seconds:
                    reason = 'Wall time limit exceeded.'; break
                for key, _ in selector.select(0.05):
                    block = os.read(key.fileobj.fileno(), 8192)
                    if not block:
                        selector.unregister(key.fileobj); continue
                    remaining = CAP - sum(map(len, chunks.values()))
                    chunks[key.data].extend(block[:remaining])
                    if len(block) > remaining:
                        reason = 'Output limit exceeded.'; break
                if reason: break
        if reason:
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
        try: code = p.wait(timeout=max(0.1, seconds - (time.monotonic() - started)))
        except subprocess.TimeoutExpired:
            reason = 'Wall time limit exceeded.'
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            code = p.wait(timeout=2)
        for stream in [p.stdout, p.stderr]: stream.close()
        info_file.seek(0)
        try: records = [json.loads(line) for line in info_file if line.strip()]
        except (ValueError, OSError): records = []
        # exit-code is emitted only after successful sandbox setup and exec.
        # A deliberate wall/output kill is our own terminal resource verdict.
        if not reason and not any('exit-code' in record for record in records):
            raise RuntimeError('Sandbox setup or executable launch could not be confirmed.')
        return code, {k: bytes(v).decode('utf-8', errors='replace') for k, v in chunks.items()}, reason

def probe():
    code, output, reason = bounded_process(sandbox('/tmp') + ['--', '/usr/bin/true'], '', 5, single_process=True)
    if code or reason: raise RuntimeError('Bubblewrap namespace probe failed: ' + output['stderr'])
    compiler = subprocess.check_output(['/usr/bin/g++', '--version'], text=True).splitlines()[0]
    return {'ready': True, 'compiler': compiler, 'sandbox': 'WSL2 / bubblewrap',
            'limits': {'cpuSeconds': 2, 'wallSeconds': 5, 'memoryBytes': 268435456, 'outputBytes': CAP}}

def compile_program(work):
    compile_args = sandbox(work, True) + ['--', '/usr/bin/g++', '-std=c++17', '-O2', '-Wall', '-Wextra', '-fmax-errors=8',
            '-fdiagnostics-color=never', '/work/main.cpp', '-o', '/work/main']
    return bounded_process(compile_args, '', 30, {
            resource.RLIMIT_AS: 1073741824, resource.RLIMIT_CPU: 20,
            resource.RLIMIT_FSIZE: 16777216, resource.RLIMIT_NPROC: 64,
            resource.RLIMIT_NOFILE: 128, resource.RLIMIT_CORE: 0})

def run_program(work, stdin):
    # Direct exec makes bubblewrap's trusted exit record cover the learner
    # executable. Seccomp denies process/thread creation after exec.
    return bounded_process(sandbox(work) + ['--', '/work/main'], stdin, 5, {
            resource.RLIMIT_AS: 268435456, resource.RLIMIT_CPU: 2,
            resource.RLIMIT_FSIZE: 65536,
            resource.RLIMIT_NOFILE: 64, resource.RLIMIT_CORE: 0}, single_process=True)

def run(body):
    source, stdin = body['source'], body['stdin']
    if not isinstance(source, str) or not isinstance(stdin, str): raise ValueError('Invalid source/input')
    if len(source.encode()) > CAP or len(stdin.encode()) > 262144: raise ValueError('Source/input too large')
    with tempfile.TemporaryDirectory(prefix='dsa-cpp-') as directory:
        work = Path(directory)
        (work / 'main.cpp').write_text(source, encoding='utf-8')
        code, output, reason = compile_program(work)
        if code or reason:
            return {'status': 'failed', 'stdout': '', 'stderr': reason or '',
                    'compileOutput': output['stdout'] + output['stderr'], 'truncated': bool(reason and 'Output' in reason)}
        code, output, reason = run_program(work, stdin)
        stderr = output['stderr']
        if reason: stderr += '\n' + reason
        elif code: stderr += f'\nProgram exited with code/signal {code} (CPU limit: 2 seconds).'
        return {'status': 'completed' if code == 0 and not reason else 'failed',
                'stdout': output['stdout'], 'stderr': stderr,
                'compileOutput': '', 'truncated': bool(reason and 'Output' in reason)}

if __name__ == '__main__':
    try:
        result = probe() if '--probe' in sys.argv else run(json.loads(sys.stdin.buffer.read(393217)))
        print(json.dumps(result))
    except Exception as error:
        # Fail closed. Infrastructure errors must not grade learner correctness.
        print(json.dumps({'infrastructureError': str(error)})); sys.exit(1)
