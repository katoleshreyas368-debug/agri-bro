const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DB_PATH = path.join(__dirname, 'db.json');

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// File-based helpers (as before)
let _writeQueue = Promise.resolve();
function readFileDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read DB:', err);
    return { users: [], crops: [], inputs: [], logistics: [], community: [] };
  }
}

function writeFileDB(db) {
  _writeQueue = _writeQueue.then(() => {
    return new Promise((resolve, reject) => {
      fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Failed to write DB:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }).catch(err => {
    console.error('Error in write queue:', err);
  });
  return _writeQueue;
}

// MongoDB adapter when MONGO_URL is provided
let mongoClient = null;
let mongoDb = null;
async function ensureMongo() {
  if (mongoDb) return mongoDb;
  const url = process.env.MONGO_URL;
  if (!url) return null;
  mongoClient = new MongoClient(url, { useUnifiedTopology: true });
  await mongoClient.connect();
  const dbName = process.env.MONGO_DB_NAME || (new URL(url)).pathname.replace('/', '') || 'agribro';
  mongoDb = mongoClient.db(dbName || 'agribro');
  return mongoDb;
}

// readDB/writeDB unified API: always async
async function readDB() {
  const db = await ensureMongo();
  if (!db) return readFileDB();

  // assemble object from collections
  const [users, crops, inputs, logistics, community] = await Promise.all([
    db.collection('users').find({}).toArray(),
    db.collection('crops').find({}).toArray(),
    db.collection('inputs').find({}).toArray(),
    db.collection('logistics').find({}).toArray(),
    db.collection('community').find({}).toArray()
  ]);

  // For crops, fetch bids from separate collection if stored there; but if bids embedded, keep as-is
  // We'll assume bids are embedded in crops.documents under `bids`.
  return { users, crops, inputs, logistics, community };
}

async function writeDB(data) {
  const db = await ensureMongo();
  if (!db) return writeFileDB(data);

  // Replace collection contents (simple approach for demo)
  const ops = [];
  ops.push(db.collection('users').deleteMany({}).then(() => {
    if (Array.isArray(data.users) && data.users.length) return db.collection('users').insertMany(data.users);
    return Promise.resolve();
  }));

  ops.push(db.collection('crops').deleteMany({}).then(() => {
    if (Array.isArray(data.crops) && data.crops.length) return db.collection('crops').insertMany(data.crops);
    return Promise.resolve();
  }));

  ops.push(db.collection('inputs').deleteMany({}).then(() => {
    if (Array.isArray(data.inputs) && data.inputs.length) return db.collection('inputs').insertMany(data.inputs);
    return Promise.resolve();
  }));

  ops.push(db.collection('logistics').deleteMany({}).then(() => {
    if (Array.isArray(data.logistics) && data.logistics.length) return db.collection('logistics').insertMany(data.logistics);
    return Promise.resolve();
  }));

  ops.push(db.collection('community').deleteMany({}).then(() => {
    if (Array.isArray(data.community) && data.community.length) return db.collection('community').insertMany(data.community);
    return Promise.resolve();
  }));

  await Promise.all(ops);
}

// Helper wrappers for Mongo CRUD operations (minimal, used by routes)
async function isMongoEnabled() {
  const db = await ensureMongo();
  return !!db;
}

async function mongoFind(collectionName, filter = {}) {
  const db = await ensureMongo();
  if (!db) return null;
  return db.collection(collectionName).find(filter).toArray();
}

async function mongoFindOne(collectionName, filter = {}) {
  const db = await ensureMongo();
  if (!db) return null;
  return db.collection(collectionName).findOne(filter);
}

async function mongoInsertOne(collectionName, doc) {
  const db = await ensureMongo();
  if (!db) return null;
  return db.collection(collectionName).insertOne(doc);
}

async function mongoUpdateOne(collectionName, filter, update, options = {}) {
  const db = await ensureMongo();
  if (!db) return null;
  return db.collection(collectionName).updateOne(filter, update, options);
}

async function mongoDeleteMany(collectionName, filter = {}) {
  const db = await ensureMongo();
  if (!db) return null;
  return db.collection(collectionName).deleteMany(filter);
}

module.exports = {
  readDB,
  writeDB,
  makeId,
  ensureMongo,
  isMongoEnabled,
  mongoFind,
  mongoFindOne,
  mongoInsertOne,
  mongoUpdateOne,
  mongoDeleteMany
};
