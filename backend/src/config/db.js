const mongoose = require('mongoose');

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (uri === 'memory') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('crypto-advisor');
    console.log('Using in-memory MongoDB (dev only)');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
