import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBroker, brokerError } from './cpp-broker.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSP = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self' https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'";
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };

export function createJudge0Provider(env = process.env, fetcher = fetch) {
  if (!env.JUDGE0_URL) return null;
  const base = new URL(env.JUDGE0_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !/^[1-9]\d*$/.test(env.JUDGE0_LANGUAGE_ID ?? '')) {
    throw new Error('Judge0 requires an HTTPS URL without credentials/query and a positive JUDGE0_LANGUAGE_ID.');
  }
  const languageId = Number(env.JUDGE0_LANGUAGE_ID);
  if (!Number.isSafeInteger(languageId)) throw new Error('Invalid JUDGE0_LANGUAGE_ID.');
  const headers = { 'Content-Type': 'application/json' };
  if (env.JUDGE0_TOKEN) headers[env.JUDGE0_TOKEN_HEADER || 'X-Auth-Token'] = env.JUDGE0_TOKEN;
  const endpoint = `${base.href.replace(/\/$/, '')}/submissions`;
  async function send(url, options) {
    const response = await fetcher(url, { ...options, headers, signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) throw new Error('Provider unavailable');
    // Bound received HTTP data before parsing. The injected test boundary may only expose json().
    if (!response.body) return response.json();
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 1_048_576) { await reader.cancel(); throw new Error('Provider response too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const decode = value => typeof value === 'string' ? Buffer.from(value, 'base64').toString('utf8') : '';
  return {
    async submit({ source, stdin }) {
      const data = await send(`${endpoint}?base64_encoded=true&wait=false`, { method: 'POST', body: JSON.stringify({
        source_code: Buffer.from(source).toString('base64'), stdin: Buffer.from(stdin).toString('base64'), language_id: languageId, compiler_options: '-std=c++17',
        enable_network: false, cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 131072,
        max_processes_and_or_threads: 16, max_file_size: 64, number_of_runs: 1
      }) });
      return { token: data.token };
    },
    async poll(token) {
      const data = await send(`${endpoint}/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`, { method: 'GET' });
      const id = data.status?.id;
      const status = id === 1 ? 'queued' : id === 2 ? 'running' : id === 3 ? 'completed' : [4, 5, 6, 7, 8, 9, 10, 11, 12].includes(id) ? 'failed' : 'unknown';
      return { status, stdout: decode(data.stdout), stderr: decode(data.stderr), compileOutput: decode(data.compile_output), time: data.time, memory: data.memory };
    }
  };
}

async function jsonBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 393216) throw brokerError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw brokerError(400, 'Invalid JSON request.'); }
}

export async function startServer({ port = 5173, provider = createJudge0Provider(), broker, dbPath = resolve(ROOT, 'data', 'cpp-jobs.sqlite'), staticRoot = resolve(ROOT, 'dist') } = {}) {
  let ownsBroker = false;
  if (!broker) {
    await mkdir(dirname(dbPath), { recursive: true });
    broker = createBroker({ dbPath, provider });
    ownsBroker = true;
  }
  const server = createServer(async (req, res) => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    try {
      const host = req.headers.host;
      const expectedPort = server.address()?.port;
      const allowedHosts = new Set([`127.0.0.1:${expectedPort}`, `localhost:${expectedPort}`]);
      if (!allowedHosts.has(host)) throw brokerError(403, 'Unexpected Host.');
      const url = new URL(req.url, `http://${host}`);
      const path = decodeURIComponent(url.pathname);
      if (path.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) throw brokerError(403, 'Unexpected Origin.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw brokerError(403, 'Cross-site API request rejected.');
        if (req.method === 'GET' && path === '/api/status') return json(200, { configured: Boolean(provider), ...(provider?.kind === 'local-wsl' ? { provider: provider.kind, compiler: provider.compiler } : {}) });
        if (req.method === 'POST' && path === '/api/submissions') return json(200, await broker.submit(await jsonBody(req)));
        if (req.method === 'GET' && /^\/api\/submissions\/[a-zA-Z0-9_-]{1,128}$/.test(path)) {
          const result = await broker.get(path.split('/').at(-1));
          return json(result ? 200 : 404, result ?? { error: 'Submission not found.' });
        }
        return json(404, { error: 'API route not found.' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw brokerError(405, 'Method not allowed.');
      if (path.includes('\\') || path.split('/').includes('..') || path.includes('\0')) throw brokerError(403, 'Invalid asset path.');
      const asset = resolve(staticRoot, `.${path === '/' ? '/index.html' : path}`);
      if (!asset.startsWith(resolve(staticRoot) + sep)) throw brokerError(403, 'Invalid asset path.');
      let body;
      try { body = await readFile(asset); } catch { throw brokerError(404, 'Asset not found.'); }
      // Explicit document host also permits module imports from an opaque sandbox origin.
      const policy = CSP.replaceAll("'self'", `'self' http://${host}`);
      res.writeHead(200, { 'Content-Type': TYPES[extname(asset)] ?? 'application/octet-stream', 'Content-Security-Policy': policy, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      json(error.statusCode ?? (error instanceof URIError ? 400 : 500), { error: error.statusCode ? error.message : 'Request could not be processed.' });
    }
  });
  if (ownsBroker) server.once('close', () => broker.close());
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolveListen); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer().then(() => console.log('DSA Journey: http://localhost:5173')).catch(() => { console.error('Server could not start. Check port, database and Judge0 configuration.'); process.exitCode = 1; });
}
