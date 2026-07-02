const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables (just in case)
require('dotenv').config();

const DB_FILE = path.join(__dirname, 'db.json');

// Global state to track database mode
let isOffline = false;

// Initialize JSON database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], gems: [], reviews: [] }, null, 2));
}

// Read/Write helper for JSON DB fallback
function readLocalDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], gems: [], reviews: [] };
  }
}

function writeLocalDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// -------------------------------------------------------------
// 1. MONGOOSE SCHEMA DEFINITIONS (Online Mode)
// -------------------------------------------------------------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  points: { type: Number, default: 50 },
  vouchers: [{
    code: String,
    name: String,
    pointsCost: Number,
    redeemedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const gemSchema = new mongoose.Schema({
  destination: { type: String, required: true }, // e.g., 'goa', 'kerala'
  name: { type: String, required: true, unique: true },
  area: { type: String, required: true },
  tags: [String],
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  gem: { type: Number, required: true }, // Hidden gem factor 0.0 - 1.0
  blurb: { type: String, required: true }
});

const reviewSchema = new mongoose.Schema({
  gemName: { type: String, required: true }, // Link by name since it's unique
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

let MongooseUser, MongooseGem, MongooseReview;

// -------------------------------------------------------------
// 2. OFFLINE DATABASE EMULATOR (Fallback Mode)
// -------------------------------------------------------------
class OfflineModel {
  constructor(collectionName, data = {}) {
    this._collection = collectionName;
    Object.assign(this, data);
  }

  async save() {
    const db = readLocalDB();
    if (!this._id) {
      this._id = Math.random().toString(36).substring(2, 9);
      this.createdAt = new Date();
      db[this._collection].push(this);
    } else {
      const idx = db[this._collection].findIndex(item => item._id === this._id);
      if (idx !== -1) {
        db[this._collection][idx] = { ...db[this._collection][idx], ...this };
      } else {
        db[this._collection].push(this);
      }
    }
    writeLocalDB(db);
    return this;
  }

  static async find(query = {}) {
    const db = readLocalDB();
    let results = db[this.collectionName] || [];

    // Simple key-value matching
    results = results.filter(item => {
      for (let key in query) {
        // Handle regex query or simple match
        if (query[key] instanceof RegExp) {
          if (!query[key].test(item[key])) return false;
        } else if (Array.isArray(item[key]) && typeof query[key] === 'string') {
          // Array includes tag
          if (!item[key].includes(query[key])) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });

    return results.map(r => new this(r));
  }

  static async findOne(query = {}) {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  static async findById(id) {
    return this.findOne({ _id: id });
  }

  static async insertMany(items) {
    const db = readLocalDB();
    const prepared = items.map(item => ({
      _id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
      ...item
    }));
    db[this.collectionName] = db[this.collectionName].concat(prepared);
    writeLocalDB(db);
    return prepared.map(p => new this(p));
  }

  static async deleteMany(query = {}) {
    const db = readLocalDB();
    let results = db[this.collectionName] || [];
    results = results.filter(item => {
      for (let key in query) {
        if (item[key] === query[key]) return false;
      }
      return true;
    });
    db[this.collectionName] = results;
    writeLocalDB(db);
    return { deletedCount: db[this.collectionName].length };
  }
}

class OfflineUser extends OfflineModel {
  static collectionName = 'users';
  constructor(data) {
    super('users', data);
    if (this.points === undefined) this.points = 50;
    if (!this.vouchers) this.vouchers = [];
  }
}

class OfflineGem extends OfflineModel {
  static collectionName = 'gems';
  constructor(data) {
    super('gems', data);
  }
}

class OfflineReview extends OfflineModel {
  static collectionName = 'reviews';
  constructor(data) {
    super('reviews', data);
  }
}

// -------------------------------------------------------------
// 3. EXPORTS & INITIALIZATION
// -------------------------------------------------------------
let dbConnectionPromise = null;

function connectDB() {
  if (dbConnectionPromise) return dbConnectionPromise;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibecheck';

  dbConnectionPromise = mongoose.connect(mongoUri)
    .then(() => {
      console.log('✨ MongoDB Connected successfully.');
      isOffline = false;
      MongooseUser = mongoose.model('User', userSchema);
      MongooseGem = mongoose.model('Gem', gemSchema);
      MongooseReview = mongoose.model('Review', reviewSchema);
    })
    .catch(err => {
      console.warn('⚠️ MongoDB connection failed. Falling back to local offline JSON DB.');
      console.warn('Reason:', err.message);
      isOffline = true;
    });

  return dbConnectionPromise;
}

// Proxy wrapper that delegates calls to either Mongoose model or Offline model
const getModel = (modelName, offlineModel) => {
  return new Proxy(offlineModel, {
    get(target, prop) {
      if (isOffline) {
        const val = offlineModel[prop];
        return typeof val === 'function' ? val.bind(offlineModel) : val;
      }
      const mongooseModel = modelName === 'User' ? MongooseUser :
                            modelName === 'Gem' ? MongooseGem : MongooseReview;
      if (!mongooseModel) return undefined;
      const val = mongooseModel[prop];
      return typeof val === 'function' ? val.bind(mongooseModel) : val;
    },
    construct(target, args) {
      if (isOffline) return new offlineModel(...args);
      const mongooseModel = modelName === 'User' ? MongooseUser :
                            modelName === 'Gem' ? MongooseGem : MongooseReview;
      if (!mongooseModel) throw new Error(`Mongoose model ${modelName} not compiled yet.`);
      return new mongooseModel(...args);
    }
  });
};

const User = getModel('User', OfflineUser);
const Gem = getModel('Gem', OfflineGem);
const Review = getModel('Review', OfflineReview);

module.exports = {
  connectDB,
  User,
  Gem,
  Review,
  checkOfflineStatus: () => isOffline
};
