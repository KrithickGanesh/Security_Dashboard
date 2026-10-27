import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';

/**
 * Keys that must never be echoed to a terminal, a projector or a viva panel.
 * The Mongoose `select: false` flag does NOT apply to the raw driver used here,
 * so redaction is done explicitly.
 */
const SENSITIVE = /pass(word)?|secret|token|hash|api[-_]?key|salt/i;

const redact = (value, depth = 0) => {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  // Raw-driver BSON types serialise as { buffer: [...] }; show them the way a shell would.
  if (value instanceof mongoose.Types.ObjectId || value?._bsontype === 'ObjectId') {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      SENSITIVE.test(key) && val ? '[REDACTED]' : redact(val, depth + 1)
    ])
  );
};

const line = (char = '-', len = 78) => console.log(char.repeat(len));

async function main() {
  const [collectionName, limitArg] = process.argv.slice(2);
  const limit = Math.min(Math.max(parseInt(limitArg, 10) || 2, 1), 10);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log('\n===============================================================');
  console.log('            DEVSECOPS DASHBOARD - DATABASE INSPECTOR           ');
  console.log('===============================================================');
  console.log(`Database : ${mongoose.connection.name}`);
  console.log(`Server   : ${mongoose.connection.host}:${mongoose.connection.port}`);
  console.log(`URI      : ${MONGO_URI}`);

  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));

  // No argument: overview of every collection and its indexes.
  if (!collectionName) {
    line();
    console.log(`${'#'.padEnd(4)} | ${'Collection'.padEnd(24)} | ${'Docs'.padStart(7)} | Indexes`);
    line();
    let total = 0;
    for (const [i, name] of collections.entries()) {
      const count = await db.collection(name).countDocuments();
      const indexes = await db.collection(name).indexes();
      total += count;
      console.log(
        `${String(i + 1).padEnd(4)} | ${name.padEnd(24)} | ${String(count).padStart(7)} | ${indexes.length}`
      );
    }
    line();
    console.log(`${'TOTAL'.padEnd(4)} | ${`${collections.length} collections`.padEnd(24)} | ${String(total).padStart(7)} |`);
    console.log('\nUsage:');
    console.log('  npm run db:peek                     # this overview');
    console.log('  npm run db:peek -- <collection>     # sample documents + indexes');
    console.log('  npm run db:peek -- <collection> 5   # up to 10 documents');
    console.log('');
    await mongoose.disconnect();
    return;
  }

  if (!collections.includes(collectionName)) {
    console.error(`\nCollection "${collectionName}" does not exist.`);
    console.error(`Available: ${collections.join(', ')}\n`);
    await mongoose.disconnect();
    process.exitCode = 1;
    return;
  }

  const col = db.collection(collectionName);
  const count = await col.countDocuments();
  const indexes = await col.indexes();
  const docs = await col.find({}).limit(limit).toArray();

  console.log(`Collection: ${collectionName}  |  documents: ${count}`);
  line();
  console.log('INDEXES');
  for (const idx of indexes) {
    const keys = Object.entries(idx.key)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    const flags = [idx.unique ? 'UNIQUE' : null, idx.sparse ? 'sparse' : null]
      .filter(Boolean)
      .join(' ');
    console.log(`  ${idx.name}  { ${keys} }${flags ? `  [${flags}]` : ''}`);
  }

  line();
  console.log(`SAMPLE DOCUMENTS (showing ${docs.length} of ${count})`);
  for (const [i, doc] of docs.entries()) {
    console.log(`\n--- document ${i + 1} ---`);
    console.log(JSON.stringify(redact(doc), null, 2));
  }
  line();
  console.log('Sensitive fields (password, secret, token, hash, apiKey) are redacted.');
  console.log('');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\nDatabase inspection failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
