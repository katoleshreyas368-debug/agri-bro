// Import src/db.json into MongoDB collections. Run only after setting MONGO_URL and MONGO_DB_NAME.
// This script will insert documents and will not delete existing collections by default.

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

async function importToMongo() {
  const url = process.env.MONGO_URL;
  const dbName = process.env.MONGO_DB_NAME || 'agribro';
  if (!url) {
    console.error('MONGO_URL not set in environment. Aborting.');
    process.exit(1);
  }
  const rawPath = path.join(__dirname, '..', 'src', 'db.json');
  if (!fs.existsSync(rawPath)) {
    console.error('src/db.json not found. Aborting.');
    process.exit(1);
  }

  const raw = fs.readFileSync(rawPath, 'utf8');
  const data = JSON.parse(raw);

  const client = new MongoClient(url, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);

  // small helper to generate short ids when missing
  function makeId(len = 7) {
    return Math.random().toString(36).slice(2, 2 + len);
  }

  function sanitizeForGeo(doc) {
    // If a collection has a geo index on `location` but our sample data stores a string,
    // remove the `location` field before upsert to avoid "Can't extract geo keys" errors.
    if (!doc || typeof doc !== 'object') return doc;
    const copy = { ...doc };
    if (copy.location && typeof copy.location === 'string') delete copy.location;
    return copy;
  }

  // Insert or upsert users
  if (Array.isArray(data.users)) {
    const usersCol = db.collection('users');
    for (const u of data.users) {
      // ensure a non-null uid to avoid duplicate-key errors on unique uid indexes
      if (u.uid === null || u.uid === undefined) u.uid = `uid_${makeId()}`;
      const doc = sanitizeForGeo(u);
      try {
        await usersCol.updateOne({ id: u.id }, { $set: doc }, { upsert: true });
      } catch (err) {
        // If duplicate key error occurs because of index constraints, log and continue
        if (err && err.code === 11000) {
          console.warn('Duplicate key while upserting user', { id: u.id, uid: u.uid, err: err.message });
          continue;
        }
        // If geo index extraction failed, try removing location and retry once
        if (err && err.code === 16755) {
          try {
            const fallback = { ...u };
            if (fallback.location && typeof fallback.location === 'string') delete fallback.location;
            await usersCol.updateOne({ id: u.id }, { $set: fallback }, { upsert: true });
            continue;
          } catch (err2) {
            console.warn('Failed to upsert user after geo-sanitize', { id: u.id, err: err2.message });
            continue;
          }
        }
        throw err;
      }
    }
  }

  if (Array.isArray(data.crops)) {
    const cropsCol = db.collection('crops');
    for (const c of data.crops) {
      const doc = sanitizeForGeo(c);
      try {
        await cropsCol.updateOne({ id: c.id }, { $set: doc }, { upsert: true });
      } catch (err) {
        if (err && err.code === 11000) {
          console.warn('Duplicate key while upserting crop', { id: c.id, err: err.message });
          continue;
        }
        if (err && err.code === 16755) {
          try {
            const fallback = { ...c };
            if (fallback.location && typeof fallback.location === 'string') delete fallback.location;
            await cropsCol.updateOne({ id: c.id }, { $set: fallback }, { upsert: true });
            continue;
          } catch (err2) {
            console.warn('Failed to upsert crop after geo-sanitize', { id: c.id, err: err2.message });
            continue;
          }
        }
        throw err;
      }
    }
  }

  if (Array.isArray(data.inputs)) {
    const col = db.collection('inputs');
    for (const r of data.inputs) {
      try {
        await col.updateOne({ id: r.id }, { $set: r }, { upsert: true });
      } catch (err) {
        if (err && err.code === 11000) {
          console.warn('Duplicate key while upserting input', { id: r.id, err: err.message });
          continue;
        }
        console.warn('Failed to upsert input', { id: r.id, err: err.message });
        continue;
      }
    }
  }

  if (Array.isArray(data.logistics)) {
    const col = db.collection('logistics');
    for (const r of data.logistics) {
      const doc = sanitizeForGeo(r);
      try {
        await col.updateOne({ id: r.id }, { $set: doc }, { upsert: true });
      } catch (err) {
        if (err && err.code === 11000) {
          console.warn('Duplicate key while upserting logistics', { id: r.id, err: err.message });
          continue;
        }
        if (err && err.code === 16755) {
          try {
            const fallback = { ...r };
            if (fallback.location && typeof fallback.location === 'string') delete fallback.location;
            await col.updateOne({ id: r.id }, { $set: fallback }, { upsert: true });
            continue;
          } catch (err2) {
            console.warn('Failed to upsert logistics after geo-sanitize', { id: r.id, err: err2.message });
            continue;
          }
        }
        console.warn('Failed to upsert logistics', { id: r.id, err: err.message });
        continue;
      }
    }
  }

  if (Array.isArray(data.community)) {
    const col = db.collection('community');
    for (const p of data.community) {
      const doc = sanitizeForGeo(p);
      try {
        await col.updateOne({ id: p.id }, { $set: doc }, { upsert: true });
      } catch (err) {
        if (err && err.code === 11000) {
          console.warn('Duplicate key while upserting community post', { id: p.id, err: err.message });
          continue;
        }
        if (err && err.code === 16755) {
          try {
            const fallback = { ...p };
            if (fallback.location && typeof fallback.location === 'string') delete fallback.location;
            await col.updateOne({ id: p.id }, { $set: fallback }, { upsert: true });
            continue;
          } catch (err2) {
            console.warn('Failed to upsert community post after geo-sanitize', { id: p.id, err: err2.message });
            continue;
          }
        }
        console.warn('Failed to upsert community post', { id: p.id, err: err.message });
        continue;
      }
    }
  }

  await client.close();
  console.log('Import complete.');
}

if (require.main === module) importToMongo();

module.exports = importToMongo;
