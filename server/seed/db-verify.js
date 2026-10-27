import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';
const DB_NAME = 'devsecops_dashboard';

const results = [];
const check = (label, passed, detail = '') => {
  results.push({ label, passed });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${label}${detail ? ` - ${detail}` : ''}`);
};

/** Never print credentials embedded in a connection string. */
const maskUri = (uri) => uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

const line = (char = '-') => console.log(char.repeat(74));

async function main() {
  console.log('\n===============================================================');
  console.log('        MONGODB CONNECTION VERIFICATION - DEVSECOPS DASHBOARD ');
  console.log('===============================================================');
  console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Node.js     : ${process.version}`);
  console.log(`  Mongoose    : ${mongoose.version}`);
  console.log(`  Target URI  : ${maskUri(URI)}`);
  console.log(`  Expected DB : ${DB_NAME}`);
  line();

  // 1. Configuration
  console.log('\n1. CONFIGURATION');
  check('MONGO_URI defined in environment', Boolean(process.env.MONGO_URI),
    process.env.MONGO_URI ? 'from server/.env' : 'using built-in default');

  // 2. TCP + handshake
  console.log('\n2. CONNECTION');
  const started = performance.now();
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    check('Mongoose connected', false, err.message);
    summary();
    process.exit(1);
  }
  const connectMs = Math.round(performance.now() - started);
  const conn = mongoose.connection;
  const db = conn.db;

  check('Mongoose connected', conn.readyState === 1, `readyState=${conn.readyState} (1 = connected)`);
  check('Host and port reachable', true, `${conn.host}:${conn.port}`);
  check('Database selected', conn.name === DB_NAME, conn.name);
  console.log(`  Connection time: ${connectMs} ms`);

  // 3. Server responds
  console.log('\n3. SERVER RESPONSE');
  const pingStart = performance.now();
  const ping = await db.admin().ping();
  const pingMs = Math.round(performance.now() - pingStart);
  check('admin.ping() acknowledged', ping.ok === 1, `${pingMs} ms`);

  let version = 'unknown';
  try {
    const info = await db.admin().buildInfo();
    version = info.version;
    check('Server version reported', true, `MongoDB ${version}`);
  } catch {
    check('Server version reported', false, 'buildInfo requires elevated privileges');
  }

  // 4. Read + write round trip on a temporary collection
  console.log('\n4. READ / WRITE ROUND TRIP');
  const tmp = db.collection('__connection_verify');
  const token = `verify-${Date.now()}`;
  try {
    await tmp.insertOne({ token, at: new Date() });
    const found = await tmp.findOne({ token });
    check('Document written', Boolean(found), 'temporary collection');
    check('Document read back', found?.token === token);
    await tmp.drop();
    check('Temporary collection removed', !(await db.listCollections({ name: '__connection_verify' }).hasNext()));
  } catch (err) {
    check('Write permission', false, err.message);
  }

  // 5. Application data visible
  console.log('\n5. APPLICATION DATA');
  const collections = await db.listCollections().toArray();
  let total = 0;
  for (const { name } of collections) total += await db.collection(name).countDocuments();
  check('Collections present', collections.length > 0, `${collections.length} collections`);
  check('Documents present', total > 0, `${total} documents`);

  const stats = await db.stats();
  check('Storage engine', true, `${stats.storageEngine?.name || 'wiredTiger'}, ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB data`);

  // 6. The invariant that makes deduplication real
  console.log('\n6. SCHEMA INVARIANT (deduplication)');
  const indexes = await db.collection('vulnerabilities').indexes();
  const unique = indexes.find(
    (i) => i.unique && i.key.fingerprint === 1 && i.key.project === 1
  );
  check('Unique index on { fingerprint, project }', Boolean(unique), unique?.name || 'missing');

  summary();

  await mongoose.disconnect();
}

function summary() {
  const failed = results.filter((r) => !r.passed);
  line('=');
  if (failed.length === 0) {
    console.log(`  RESULT: CONNECTION VERIFIED (${results.length}/${results.length} checks passed)`);
  } else {
    console.log(`  RESULT: FAILED (${results.length - failed.length}/${results.length} checks passed)`);
    for (const f of failed) console.log(`    - ${f.label}`);
  }
  line('=');
  console.log('');
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch(async (err) => {
  console.error('\nVerification error:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
