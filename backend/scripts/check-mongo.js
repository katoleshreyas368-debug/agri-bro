// Simple Mongo connectivity diagnostic. Uses MONGO_URL and MONGO_DB_NAME from environment or .env
const { MongoClient } = require('mongodb');

async function check() {
  const url = process.env.MONGO_URL;
  const dbName = process.env.MONGO_DB_NAME || 'agribro';
  if (!url) {
    console.error('MONGO_URL not set in environment. Set it in .env or the environment and retry.');
    process.exit(1);
  }

  const client = new MongoClient(url, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const stats = await db.command({ ping: 1 });
    console.log('Mongo ping successful:', stats);
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    process.exit(0);
  } catch (err) {
    console.error('Mongo connectivity check failed:', err && err.message ? err.message : err);
    process.exit(2);
  } finally {
    try { await client.close(); } catch(e){}
  }
}

if (require.main === module) check();

module.exports = check;
