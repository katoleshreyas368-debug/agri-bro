const path = require('path');
const fs = require('fs').promises;
const { MongoClient } = require('mongodb');

const DB_PATH = path.join(__dirname, 'db.json');

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// File-based helpers (as before)
let _writeQueue = Promise.resolve();
async function readFileDB() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read DB:', err);
    return { users: [], crops: [], inputs: [], logistics: [], community: [] };
  }
}

async function writeFileDB(db) {
  _writeQueue = _writeQueue.then(() => {
    return fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  }).catch(err => {
    console.error('Error in write queue:', err);
  });
  return _writeQueue;
}

// MongoDB adapter when MONGO_URL is provided
let mongoClient = null;
let mongoDb = null;
async function initDB() {
  if (mongoDb) return mongoDb;
  const url = process.env.MONGO_URL;
  if (!url) return null;
  
  mongoClient = new MongoClient(url, {
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  });

  try {
    await mongoClient.connect();
    const dbName = process.env.MONGO_DB_NAME || (new URL(url)).pathname.replace('/', '') || 'agribro';
    mongoDb = mongoClient.db(dbName || 'agribro');
    console.log('MongoDB connected successfully to', dbName);
    return mongoDb;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return null;
  }
}

// readDB/writeDB unified API: always async
async function readDB() {
  const db = await initDB();
  if (!db) return readFileDB();
  // When mongo is enabled, we don't use a full in-memory DB object.
  // All data is fetched directly from collections via mongoFind, mongoFindOne, etc.
  // This function is only for the file-based DB fallback.
  return { users: [], crops: [], inputs: [], logistics: [], community: [] };
}

async function writeDB(data) {
  const db = await initDB();
  // If mongo is enabled, we don't use this function.
  // All writes are done via mongoInsertOne, mongoUpdateOne, etc.
  if (db) {
    // When MongoDB is active, this function should do nothing to prevent accidental data wipes.
    return;
  }
  return writeFileDB(data);
}

// Helper wrappers for Mongo CRUD operations (minimal, used by routes)
async function isMongoEnabled() {
  const db = await initDB();
  return !!db;
}

async function mongoFind(collectionName, filter = {}) {
  const db = await initDB();
  if (!db) return null;
  return db.collection(collectionName).find(filter).toArray();
}

async function mongoFindOne(collectionName, filter = {}) {
  const db = await initDB();
  if (!db) return null;
  return db.collection(collectionName).findOne(filter);
}

async function mongoInsertOne(collectionName, doc) {
  const db = await initDB();
  if (!db) return null;
  return db.collection(collectionName).insertOne(doc);
}

async function mongoUpdateOne(collectionName, filter, update, options = {}) {
  const db = await initDB();
  if (!db) return null;
  return db.collection(collectionName).updateOne(filter, update, options);
}

async function mongoDeleteMany(collectionName, filter = {}) {
  const db = await initDB();
  if (!db) return null;
  return db.collection(collectionName).deleteMany(filter);
}

module.exports = {
  readDB,
  writeDB,
  makeId,
  initDB,
  isMongoEnabled,
  mongoFind,
  mongoFindOne,
  mongoInsertOne,
  mongoUpdateOne,
  mongoDeleteMany,
  mongoDeleteOne: mongoDeleteMany // Alias for consistency if needed, though deleteMany is fine for unique IDs
};
