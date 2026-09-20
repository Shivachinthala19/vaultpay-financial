import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let memoryServer = null;

export const connectDB = async (customUri = null) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const uri = customUri || process.env.MONGO_URI;

    if (uri && !uri.includes('placeholder')) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 2000
        });
        logger.info('Database connected successfully', { host: conn.connection.host, name: conn.connection.name });
        return conn;
      } catch (err) {
        logger.warn('Direct MongoDB connection failed, attempting fallback to in-memory database', { error: err.message });
      }
    }

    // Dynamic import mongodb-memory-server if direct connection is unavailable
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
    }
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    logger.info('Connected to In-Memory MongoDB for development/testing', { uri: memoryUri });
    return conn;
  } catch (error) {
    logger.error('Failed to initialize database connection', { error: error.message });
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting database', { error: error.message });
  }
};
