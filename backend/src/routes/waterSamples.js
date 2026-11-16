/**
 * /api/water-samples — CRUD for the water samples recorded in the web app.
 *
 * The browser owns record ids, so creating and updating are the same
 * operation: PUT /api/water-samples/:id upserts.
 */

const express = require('express');

const SOURCE_TYPES = [
  'tap', 'borewell', 'well', 'river', 'lake',
  'pond', 'canal', 'rainwater', 'treated', 'other',
];

// Same limits the web form enforces (src/lib/wqi.ts).
const NUMERIC_LIMITS = {
  ph: [0, 14],
  turbidity: [0, 1000],
  dissolvedOxygen: [0, 20],
  tds: [0, 10000],
  temperature: [-5, 80],
  conductivity: [0, 20000],
};

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Returns a list of problems; an empty list means the body is valid. */
function validateSample(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Request body must be a JSON object.'];

  if (typeof body.sampleLocation !== 'string' || !body.sampleLocation.trim()) {
    errors.push('sampleLocation is required.');
  }
  if (!SOURCE_TYPES.includes(body.sourceType)) {
    errors.push(`sourceType must be one of: ${SOURCE_TYPES.join(', ')}.`);
  }
  for (const field of ['sampledAt', 'createdAt', 'updatedAt']) {
    if (!isValidDate(body[field])) errors.push(`${field} must be an ISO date string.`);
  }
  for (const [field, [min, max]] of Object.entries(NUMERIC_LIMITS)) {
    const value = body[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${field} must be a number.`);
    } else if (value < min || value > max) {
      errors.push(`${field} must be between ${min} and ${max}.`);
    }
  }
  for (const field of ['latitude', 'longitude']) {
    if (body[field] != null && (typeof body[field] !== 'number' || !Number.isFinite(body[field]))) {
      errors.push(`${field} must be a number when provided.`);
    }
  }
  return errors;
}

function toRecord(id, body) {
  return {
    id,
    sampleLocation: body.sampleLocation.trim(),
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    sourceType: body.sourceType,
    sampledAt: new Date(body.sampledAt),
    ph: body.ph,
    turbidity: body.turbidity,
    dissolvedOxygen: body.dissolvedOxygen,
    tds: body.tds,
    temperature: body.temperature,
    conductivity: body.conductivity,
    notes: body.notes ? String(body.notes) : null,
    isDemo: Boolean(body.isDemo),
    createdAt: new Date(body.createdAt),
    updatedAt: new Date(body.updatedAt),
  };
}

/** Shape a database row exactly like the web app's WaterMeasurement type. */
function toJson(row) {
  const json = {
    ...row,
    sampledAt: row.sampledAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  for (const key of ['latitude', 'longitude', 'notes']) {
    if (json[key] === null) delete json[key];
  }
  return json;
}

/** Average of a list of numbers, rounded to 2 decimals; null for an empty list. */
function average(values) {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

/** Count, averages and per-source breakdown for a list of sample rows. */
function summariseSamples(rows) {
  const bySourceType = {};
  for (const row of rows) {
    bySourceType[row.sourceType] = (bySourceType[row.sourceType] || 0) + 1;
  }
  return {
    total: rows.length,
    demo: rows.filter((row) => row.isDemo).length,
    latestSampledAt: rows.length > 0 ? rows[0].sampledAt.toISOString() : null,
    averages: {
      ph: average(rows.map((row) => row.ph)),
      turbidity: average(rows.map((row) => row.turbidity)),
      dissolvedOxygen: average(rows.map((row) => row.dissolvedOxygen)),
      tds: average(rows.map((row) => row.tds)),
      temperature: average(rows.map((row) => row.temperature)),
      conductivity: average(rows.map((row) => row.conductivity)),
    },
    bySourceType,
  };
}

function waterSamplesRouter(prisma) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const rows = await prisma.waterSample.findMany({ orderBy: { sampledAt: 'desc' } });
      res.json({ success: true, count: rows.length, data: rows.map(toJson) });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/water-samples/stats -> totals and averages across all samples.
  // Declared before '/:id' so "stats" is not mistaken for a sample id.
  router.get('/stats', async (req, res, next) => {
    try {
      const rows = await prisma.waterSample.findMany({ orderBy: { sampledAt: 'desc' } });
      res.json({ success: true, data: summariseSamples(rows) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await prisma.waterSample.findUnique({ where: { id: req.params.id } });
      if (!row) return res.status(404).json({ success: false, message: 'Sample not found.' });
      res.json({ success: true, data: toJson(row) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    const errors = validateSample(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Invalid sample.', errors });
    }
    try {
      const record = toRecord(req.params.id, req.body);
      const existing = await prisma.waterSample.findUnique({ where: { id: record.id } });
      const row = await prisma.waterSample.upsert({
        where: { id: record.id },
        create: record,
        update: record,
      });
      res.status(existing ? 200 : 201).json({ success: true, data: toJson(row) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { count } = await prisma.waterSample.deleteMany({ where: { id: req.params.id } });
      if (count === 0) return res.status(404).json({ success: false, message: 'Sample not found.' });
      res.json({ success: true, deleted: count });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/water-samples          -> remove everything
  // DELETE /api/water-samples?demo=true -> remove only demonstration samples
  router.delete('/', async (req, res, next) => {
    try {
      const where = req.query.demo === 'true' ? { isDemo: true } : {};
      const { count } = await prisma.waterSample.deleteMany({ where });
      res.json({ success: true, deleted: count });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { waterSamplesRouter, validateSample, summariseSamples };
