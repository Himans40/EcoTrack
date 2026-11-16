/**
 * API tests for the EcoTrack backend.
 *
 * Runs against a temporary copy of prisma/ecotrack.db so the real database is
 * never touched. Run `npm run setup` once beforehand to create it.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SOURCE_DB = path.join(__dirname, '..', 'prisma', 'ecotrack.db');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecotrack-test-'));
const tempDb = path.join(tempDir, 'test.db');

if (!fs.existsSync(SOURCE_DB)) {
  throw new Error('prisma/ecotrack.db not found. Run `npm run setup` first.');
}
fs.copyFileSync(SOURCE_DB, tempDb);
process.env.DATABASE_URL = `file:${tempDb}`;

const { app, prisma } = require('../server');

let server;
let baseUrl;

before(async () => {
  await prisma.waterSample.deleteMany();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await prisma.$disconnect();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function call(method, url, body) {
  return fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sample(overrides = {}) {
  return {
    sampleLocation: 'Lake outlet',
    sourceType: 'lake',
    sampledAt: '2026-11-10T08:00:00.000Z',
    ph: 7.2,
    turbidity: 4,
    dissolvedOxygen: 7.5,
    tds: 230,
    temperature: 21,
    conductivity: 350,
    createdAt: '2026-11-10T08:05:00.000Z',
    updatedAt: '2026-11-10T08:05:00.000Z',
    ...overrides,
  };
}

test('GET /api/health reports the service as online', async () => {
  const response = await call('GET', '/api/health');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ONLINE');
});

test('GET /api/locations returns the seeded stations', async () => {
  const body = await (await call('GET', '/api/locations')).json();
  assert.equal(body.success, true);
  assert.ok(body.count >= 1);
});

test('PUT creates a sample, then updates it in place', async () => {
  const created = await call('PUT', '/api/water-samples/t-1', sample());
  assert.equal(created.status, 201);

  const updated = await call(
    'PUT',
    '/api/water-samples/t-1',
    sample({ ph: 8.1, notes: 'after rain', updatedAt: '2026-11-11T09:00:00.000Z' }),
  );
  assert.equal(updated.status, 200);

  const body = await (await call('GET', '/api/water-samples/t-1')).json();
  assert.equal(body.data.ph, 8.1);
  assert.equal(body.data.notes, 'after rain');
  assert.equal(body.data.sampledAt, '2026-11-10T08:00:00.000Z');
});

test('PUT rejects out-of-range values with a field-level message', async () => {
  const response = await call('PUT', '/api/water-samples/t-bad', sample({ ph: 15 }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok(body.errors.includes('ph must be between 0 and 14.'));
});

test('PUT rejects an unknown source type', async () => {
  const response = await call('PUT', '/api/water-samples/t-bad', sample({ sourceType: 'ocean' }));
  assert.equal(response.status, 400);
});

test('malformed JSON gets a 400, not a crash', async () => {
  const response = await fetch(`${baseUrl}/api/water-samples/t-x`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(response.status, 400);
});

test('GET lists samples newest first', async () => {
  await call('PUT', '/api/water-samples/t-2', sample({ sampledAt: '2026-11-12T08:00:00.000Z' }));
  const body = await (await call('GET', '/api/water-samples')).json();
  assert.deepEqual(body.data.map((row) => row.id), ['t-2', 't-1']);
});

test('GET /stats summarises the stored samples', async () => {
  const body = await (await call('GET', '/api/water-samples/stats')).json();
  assert.equal(body.data.total, 2);
  assert.equal(body.data.bySourceType.lake, 2);
  assert.equal(body.data.latestSampledAt, '2026-11-12T08:00:00.000Z');
  // t-1 has pH 8.1 after its update, t-2 has 7.2.
  assert.equal(body.data.averages.ph, 7.65);
});

test('DELETE ?demo=true removes only demonstration samples', async () => {
  await call('PUT', '/api/water-samples/t-demo', sample({ isDemo: true }));
  const response = await call('DELETE', '/api/water-samples?demo=true');
  assert.equal((await response.json()).deleted, 1);
  const body = await (await call('GET', '/api/water-samples')).json();
  assert.equal(body.count, 2);
});

test('DELETE /:id removes one sample and 404s the second time', async () => {
  assert.equal((await call('DELETE', '/api/water-samples/t-1')).status, 200);
  assert.equal((await call('DELETE', '/api/water-samples/t-1')).status, 404);
  assert.equal((await call('GET', '/api/water-samples/t-1')).status, 404);
});

test('unknown API routes answer with JSON 404', async () => {
  const response = await call('GET', '/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
