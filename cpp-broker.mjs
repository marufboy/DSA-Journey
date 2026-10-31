import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const ACTIVE = new Set(['submitting', 'queued', 'running', 'unknown']);
const STATES = new Set(['queued', 'running', 'completed', 'failed', 'unknown']);
export function brokerError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.requestId) ||
      typeof body.source !== 'string' || typeof body.stdin !== 'string' || body.language !== 'cpp') {
    throw brokerError(400, 'Expected requestId, source, stdin and language cpp.');
  }
  if (Buffer.byteLength(body.source) > 65536 || Buffer.byteLength(body.stdin) > 262144) {
    throw brokerError(413, 'Source or input exceeds the execution limit.');
  }
  return createHash('sha256').update(JSON.stringify([body.language, body.source, body.stdin])).digest('hex');
}

// Output is capped across all three channels, including multibyte UTF-8 characters.
function boundedOutput(result) {
  let remaining = 65536;
  const output = { truncated: result.truncated === true };
  for (const field of ['stdout', 'stderr', 'compileOutput']) {
    const bytes = Buffer.from(typeof result[field] === 'string' ? result[field] : '');
    const length = Math.min(bytes.length, remaining);
    let end = length;
    // Drop a partial final code point instead of emitting replacement characters.
    if (length < bytes.length) while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
    output[field] = bytes.subarray(0, end).toString('utf8');
    remaining -= end;
    if (length < bytes.length) output.truncated = true;
  }
  for (const field of ['time', 'memory']) {
    const value = Number(result[field]);
    if (result[field] != null && Number.isFinite(value) && value >= 0) output[field] = value;
  }
  return output;
}

export function createBroker({ dbPath, provider = null, now = () => new Date().toISOString() }) {
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS jobs (
      request_id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, token TEXT,
      status TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );`);
  const lookup = db.prepare('SELECT * FROM jobs WHERE request_id = ?');
  // Terminal results are immutable across connections. A delayed poll (including an
  // error/unknown response) must not revive a reservation after another poll finishes.
  const update = db.prepare(`UPDATE jobs SET token = ?, status = ?, result = ?, updated_at = ?
    WHERE request_id = ? AND status IN ('submitting','queued','running','unknown')`);
  // A crash after reservation may have occurred before or after provider acceptance.
  db.prepare("UPDATE jobs SET status='unknown', updated_at=? WHERE status='submitting'").run(String(now()));
  const polling = new Map();
  function view(row) {
    return { requestId: row.request_id, status: row.status, ...JSON.parse(row.result), createdAt: row.created_at, updatedAt: row.updated_at };
  }
  function save(id, status, token, result = {}) {
    update.run(token, status, JSON.stringify(result), String(now()), id);
    return view(lookup.get(id));
  }
  return {
    async submit(body) {
      const hash = validate(body);
      let existing;
      // Reservation and active count are atomic even across a second SQLite connection.
      db.exec('BEGIN IMMEDIATE');
      try {
        existing = lookup.get(body.requestId);
        if (existing) {
          if (existing.payload_hash !== hash) throw brokerError(409, 'requestId already belongs to a different submission.');
        } else {
          const active = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('submitting','queued','running','unknown')").get().n;
          if (active) throw brokerError(429, 'One submission is active or awaiting infrastructure reconciliation.');
          const date = String(now());
          db.prepare('INSERT INTO jobs VALUES (?, ?, NULL, ?, ?, ?, ?)').run(body.requestId, hash, provider ? 'submitting' : 'unavailable', '{}', date, date);
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      if (existing) return view(existing);
      if (!provider) return view(lookup.get(body.requestId));
      try {
        const accepted = await provider.submit({ source: body.source, stdin: body.stdin });
        if (typeof accepted?.token !== 'string' || !accepted.token || accepted.token.length > 512) throw new Error('Missing provider token');
        return save(body.requestId, 'queued', accepted.token);
      } catch {
        return save(body.requestId, 'unknown', null, { reason: 'Provider acceptance could not be confirmed. Do not resubmit.' });
      }
    },
    async get(requestId) {
      const row = lookup.get(requestId);
      if (!row) return null;
      if (!provider || !row.token || !ACTIVE.has(row.status)) return view(row);
      if (polling.has(requestId)) return polling.get(requestId);
      const pending = (async () => {
        try {
          const result = await provider.poll(row.token);
          const status = STATES.has(result?.status) ? result.status : 'unknown';
          return save(requestId, status, row.token, boundedOutput(result ?? {}));
        } catch {
          return save(requestId, 'unknown', row.token, { reason: 'Provider status is temporarily unknown. Check this requestId again.' });
        } finally { polling.delete(requestId); }
      })();
      polling.set(requestId, pending);
      return pending;
    },
    close() { db.close(); }
  };
}
