import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';

async function printDbSummary() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    collections.sort((a, b) => a.name.localeCompare(b.name));

    console.log('\n===============================================================');
    console.log('       DEVSECOPS DASHBOARD - MONGODB DATABASE INSPECTION       ');
    console.log('===============================================================');
    console.log(`Database Name: ${mongoose.connection.name}`);
    console.log(`Host:          ${mongoose.connection.host}:${mongoose.connection.port}`);
    console.log(`Timestamp:     ${new Date().toISOString()}`);
    console.log('---------------------------------------------------------------');
    console.log(
      `${'#'.padEnd(4)} | ${'Collection Name'.padEnd(28)} | ${'Document Count'.padStart(14)}`
    );
    console.log('---------------------------------------------------------------');

    let totalDocuments = 0;
    let idx = 1;

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      totalDocuments += count;
      console.log(
        `${String(idx).padEnd(4)} | ${col.name.padEnd(28)} | ${String(count).padStart(14)}`
      );
      idx++;
    }

    console.log('===============================================================');
    console.log(
      `${'TOTAL'.padEnd(4)} | ${`${collections.length} Collections`.padEnd(28)} | ${String(totalDocuments).padStart(14)}`
    );
    console.log('===============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to inspect database:', err);
    process.exit(1);
  }
}

printDbSummary();
