import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async (uri) => {
  const mongoURI = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';

  try {
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB Disconnected successfully');
  } catch (error) {
    logger.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};

export default connectDB;
