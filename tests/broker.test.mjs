import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import { createBroker } from '../cpp-broker.mjs';
import { startServer, createJudge0Provider } from '../server.mjs';

const request = (requestId = 'job-1', source = 'int main(){}') => ({ requestId, source, stdin: '', language: 'cpp' });
async function fixture(t, provider) {
  const dir = await mkdtemp(join(tmpdir(), 'dsa-broker-'));
  const dbPath = join(dir, 'jobs.sqlite');
  let broker = createBroker({ dbPath, provider });
  t.after(async () => { broker.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, get broker() { return broker; }, reopen() { broker.close(); broker = createBroker({ dbPath, provider }); return broker; } };
}

test('SQLite replay survives reload and a lost client response; changed payload conflicts', async t => {
  let calls = 0;
  const f = await fixture(t, { async submit() { calls++; return { token: 'remote-1' }; }, async poll() { return { status: 'completed', stdout: '42', stderr: '' }; } });
  await f.broker.submit(request()); // response deliberately discarded
  f.reopen();
  assert.equal((await f.broker.submit(request())).requestId, 'job-1');
  await assert.rejects(f.broker.submit(request('job-1', 'different')), e => e.statusCode === 409);
  assert.equal((await f.broker.get('job-1')).stdout, '42');
  f.reopen();
  assert.equal((await f.broker.get('job-1')).status, 'completed');
  assert.equal(calls, 1);
});

test('a lost provider acknowledgement is durable unknown and never blindly resubmitted', async t => {
  let calls = 0;
  const f = await fixture(t, { async submit() { calls++; throw new Error('accepted but response lost'); } });
  assert.equal((await f.broker.submit(request())).status, 'unknown');
  f.reopen();
  assert.equal((await f.broker.submit(request())).status, 'unknown');
  await assert.rejects(f.broker.submit(request('another')), e => e.statusCode === 429);
  assert.equal(calls, 1);
});

test('a process crash at provider invocation leaves its reservation durable and blocks duplicate work', async t => {
  const f = await fixture(t, { async submit() { throw new Error('must not submit after crash'); } });
  const script = `import { createBroker } from ${JSON.stringify(new URL('../cpp-broker.mjs', import.meta.url).href)};
    const broker = createBroker({ dbPath: process.argv[1], provider: { submit() { process.exit(0); } } });
    await broker.submit(${JSON.stringify(request('crashed'))});`;
  execFileSync(process.execPath, ['--input-type=module', '-e', script, join(f.dir, 'jobs.sqlite')]);
  // Reopen models startup after the other process exited before returning an acknowledgement.
  f.reopen();
  assert.equal((await f.broker.submit(request('crashed'))).status, 'unknown');
  await assert.rejects(f.broker.submit(request('next')), e => e.statusCode === 429);
});

test('concurrent submissions reserve only one active job before provider await', async t => {
  let accept;
  const f = await fixture(t, { submit() { return new Promise(r => { accept = r; }); }, async poll() { return { status: 'completed' }; } });
  const first = f.broker.submit(request());
  await assert.rejects(f.broker.submit(request('job-2')), e => e.statusCode === 429);
  assert.equal((await f.broker.submit(request())).status, 'submitting');
  accept({ token: 'one' }); await first;
  await f.broker.get('job-1');
  const second = f.broker.submit(request('job-2')); accept({ token: 'two' }); await second;
});

for (const lateOutcome of ['running', 'unknown', 'error']) {
  test(`cross-connection late ${lateOutcome} poll cannot overwrite a terminal job or revive its reservation`, async t => {
    let settleLate;
    const late = new Promise((resolveLate, rejectLate) => {
      settleLate = () => lateOutcome === 'error' ? rejectLate(new Error('lost status response')) : resolveLate({ status: lateOutcome, stdout: 'stale output' });
    });
    const f = await fixture(t, { async submit() { return { token: 'first' }; }, poll() { return late; } });
    const second = createBroker({ dbPath: join(f.dir, 'jobs.sqlite'), provider: {
      async submit() { return { token: 'second' }; }, async poll() { return { status: 'completed', stdout: 'terminal output' }; }
    } });
    try {
    await f.broker.submit(request());
    const held = f.broker.get('job-1');
    assert.equal((await second.get('job-1')).status, 'completed');
    assert.equal((await second.submit(request('job-2'))).status, 'queued');
    settleLate();
    const returned = await held;
    assert.equal(returned.status, 'completed');
    assert.equal(returned.stdout, 'terminal output');
    assert.equal((await f.broker.submit(request())).status, 'completed');
    assert.equal((await second.submit(request('job-2'))).status, 'queued');
    await assert.rejects(f.broker.submit(request('job-3')), e => e.statusCode === 429);
    } finally { second.close(); }
  });
}

test('unavailable and unknown infrastructure are distinct from failed learner code', async t => {
  const empty = await fixture(t, null);
  assert.equal((await empty.broker.submit(request())).status, 'unavailable');
  let status = 'future-provider-status';
  const f = await fixture(t, { async submit() { return { token: 'one' }; }, async poll() { return { status, stderr: 'x' }; } });
  await f.broker.submit(request());
  assert.equal((await f.broker.get('job-1')).status, 'unknown');
  status = 'unavailable';
  assert.equal((await f.broker.get('job-1')).status, 'unknown');
  await assert.rejects(f.broker.submit(request('second')), e => e.statusCode === 429);
  status = 'failed';
  assert.equal((await f.broker.get('job-1')).status, 'failed');
  assert.equal(await f.broker.get('missing'), null);
});

test('validates UTF-8 input limits and bounds all provider output', async t => {
  const f = await fixture(t, { async submit() { return { token: 'one' }; }, async poll() { return { status: 'completed', stdout: 'x'.repeat(100_000), stderr: 'x'.repeat(100_000) }; } });
  await assert.rejects(f.broker.submit(request('large', 'é'.repeat(32769))), e => e.statusCode === 413);
  await assert.rejects(f.broker.submit({ ...request(), stdin: 'x'.repeat(262145) }), e => e.statusCode === 413);
  await assert.rejects(f.broker.submit({ ...request(), language: 'python' }), e => e.statusCode === 400);
  await f.broker.submit(request());
  const result = await f.broker.get('job-1');
  assert.ok(Buffer.byteLength((result.stdout ?? '') + (result.stderr ?? '') + (result.compileOutput ?? '')) <= 65536);
  assert.equal(result.truncated, true);
});

test('HTTP handler rejects foreign hosts, origins, traversal and oversized bodies; assets support opaque iframe', async t => {
  const f = await fixture(t, null);
  await writeFile(join(f.dir, 'app.js'), 'export const ready = true;');
  const server = await startServer({ port: 0, broker: f.broker, provider: null, staticRoot: f.dir });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  // Real routing function via the native server event: the host sandbox denies TCP connect.
  const invoke = (url, options = {}) => new Promise(resolveResponse => {
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.url = url.slice(base.length); req.method = options.method ?? 'GET';
    req.headers = { host: `127.0.0.1:${server.address().port}`, ...Object.fromEntries(Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])) };
    const response = { status: 0, headers: { get(name) { return this[name.toLowerCase()] ?? null; } },
      writeHead(status, headers) { this.status = status; for (const [k, v] of Object.entries(headers)) this.headers[k.toLowerCase()] = v; },
      end(body = '') { const value = body.toString(); resolveResponse({ ...this, async json() { return JSON.parse(value); } }); } };
    server.emit('request', req, response);
  });
  assert.deepEqual(await (await invoke(`${base}/api/status`)).json(), { configured: false });
  assert.equal((await invoke(`${base}/api/status`, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await invoke(`${base}/api/status`, { headers: { Origin: 'null' } })).status, 403);
  assert.equal((await invoke(`${base}/api/status`, { headers: { Host: 'evil.example' } })).status, 403);
  const sent = await invoke(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()) });
  assert.equal((await sent.json()).status, 'unavailable');
  assert.equal((await invoke(`${base}/api/submissions/job-1`)).status, 200);
  assert.equal((await invoke(`${base}/api/submissions/absent`)).status, 404);
  assert.equal((await invoke(`${base}/api/submissions`, { method: 'POST', body: '{broken' })).status, 400);
  assert.equal((await invoke(`${base}/api/submissions`, { method: 'POST', body: 'x'.repeat(400_000) })).status, 413);
  const asset = await invoke(`${base}/app.js`);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('access-control-allow-origin'), '*');
  assert.ok(asset.headers.get('content-security-policy').includes('https://cdn.jsdelivr.net'));
  assert.ok(asset.headers.get('content-security-policy').includes(base));
  assert.equal((await invoke(`${base}/%2e%2e%5cserver.mjs`)).status, 403);
});

test('TCP loopback smoke when permitted by the host sandbox', async t => {
  const f = await fixture(t, null);
  const server = await startServer({ port: 0, broker: f.broker, provider: null });
  t.after(() => new Promise(resolve => server.close(resolve)));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/status`);
    assert.deepEqual(await response.json(), { configured: false });
  } catch (error) {
    if (error.cause?.code === 'EACCES') return t.skip('Host sandbox denies TCP loopback connections (EACCES); handler integration is tested separately.');
    throw error;
  }
});

test('Judge0 is explicit HTTPS only and uses encoded bounded isolated submissions', async () => {
  assert.equal(createJudge0Provider({}), null);
  assert.throws(() => createJudge0Provider({ JUDGE0_URL: 'http://provider', JUDGE0_LANGUAGE_ID: '54' }));
  assert.throws(() => createJudge0Provider({ JUDGE0_URL: 'https://provider' }));
  const calls = [];
  const provider = createJudge0Provider({ JUDGE0_URL: 'https://provider/api', JUDGE0_LANGUAGE_ID: '54', JUDGE0_TOKEN: 'secret' }, async (url, options) => {
    calls.push({ url, options });
    return { ok: true, async json() { return options.method === 'POST' ? { token: 'token' } : { status: { id: 3 }, stdout: Buffer.from('hello').toString('base64'), stderr: null }; } };
  });
  assert.deepEqual(await provider.submit({ source: 'é', stdin: '42' }), { token: 'token' });
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(Buffer.from(payload.source_code, 'base64').toString(), 'é');
  assert.equal(payload.enable_network, false);
  assert.equal(payload.language_id, 54);
  assert.equal(payload.compiler_options, '-std=c++17');
  assert.ok(payload.cpu_time_limit <= 5);
  assert.equal(calls[0].options.headers['X-Auth-Token'], 'secret');
  assert.equal((await provider.poll('token')).stdout, 'hello');
});

test('provider output truncation stays visible after broker persistence and polling', async t => {
  const f=await fixture(t,{async submit(){return {token:'local'};},async poll(){return {status:'failed',stdout:'bounded',truncated:true};}});
  await f.broker.submit(request());
  assert.equal((await f.broker.get('job-1')).truncated,true);
});
