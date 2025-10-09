// Remove E2E test data (created by scripts/e2e-test.js)
// This will remove crops with name 'E2E Test Crop' and bids by 'e2e-buyer-1'.
const { ensureMongo, isMongoEnabled, readDB, writeDB } = require('../src/db');

async function cleanup() {
  if (await isMongoEnabled()) {
    const db = await ensureMongo();
    console.log('Connected to MongoDB:', db.databaseName);
    try {
      const cropsRes = await db.collection('crops').deleteMany({ name: 'E2E Test Crop' });
      console.log('Deleted crops:', cropsRes.deletedCount);
      // also remove any bids matching buyerId
      await db.collection('crops').updateMany({}, { $pull: { bids: { buyerId: 'e2e-buyer-1' } } });
      console.log('Removed e2e bids from crops');
    } catch (err) {
      console.error('Mongo cleanup failed:', err.message || err);
    }
    return;
  }

  console.log('Mongo not enabled; falling back to file DB cleanup');
  const db = await readDB();
  const before = (db.crops || []).length;
  db.crops = (db.crops || []).filter(c => c.name !== 'E2E Test Crop');
  (db.crops || []).forEach(c => {
    if (Array.isArray(c.bids)) c.bids = c.bids.filter(b => b.buyerId !== 'e2e-buyer-1');
  });
  await writeDB(db);
  console.log('File DB cleanup: removed', before - (db.crops || []).length, 'crops');
}

if (require.main === module) cleanup();
module.exports = cleanup;
