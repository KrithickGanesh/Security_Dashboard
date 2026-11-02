import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/devsecops_dashboard';

/**
 * Environment variables are often pasted with accidental noise:
 *   MONGO_URI=mongodb://...      (the key copied along with the value)
 *   "mongodb://..."              (wrapped in quotes)
 *   "  mongodb://...  \n"        (trailing whitespace / newline)
 * Strip that before validating so a paste mistake does not look like an outage.
 */
const normaliseUri = (value) => {
  if (typeof value !== 'string') return value;

  let uri = value.trim();
  uri = uri.replace(/^MONGO_URI\s*=\s*/i, '');
  uri = uri.replace(/^["'`]|["'`]$/g, '');
  return uri.trim();
};

const describeUri = (uri) =>
  `MONGO_URI must start with "mongodb://" or "mongodb+srv://". ` +
  `Received a ${uri.length}-character value instead. ` +
  `Common causes: pasting "MONGO_URI=" together with the value, wrapping the value in quotes, ` +
  `leaving the <password> placeholder in place, or an empty variable.`;

export const connectDB = async (uri) => {
  const mongoURI = normaliseUri(uri || process.env.MONGO_URI || DEFAULT_URI);

  try {
    if (!/^mongodb(\+srv)?:\/\//i.test(mongoURI)) {
      throw new Error(describeUri(mongoURI));
    }

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
