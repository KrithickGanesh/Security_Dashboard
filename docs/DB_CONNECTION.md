# MongoDB Connection — Verification & Evidence

This document is the submission-ready proof that the DevSecOps Compliance and
Security Monitoring Dashboard is connected to a live MongoDB database, plus the
commands to reproduce that proof on any machine.

---

## 1. What "connected" means in this project

| Layer | File | Responsibility |
|---|---|---|
| Configuration | `server/.env` | Holds `MONGO_URI`; the only place the address is defined |
| Loader | `server/src/server.js` | Calls `connectDB()` **before** `app.listen()`, so the API cannot serve traffic without a database |
| Connection factory | `server/src/config/db.js` | `mongoose.connect(uri, { autoIndex: true })`, logs the host and database, exits with code 1 on failure |
| Client | `server/src/models/*.js` | 14 Mongoose models, one per collection |
| Proof | `server/seed/db-verify.js` | 13 automated checks, exits 0 only if the connection is healthy |

Because `connectDB()` is awaited at startup and calls `process.exit(1)` on
error, a running API that answers `GET /api/v1/health` with `200` is itself
evidence that MongoDB was reachable at boot.

---

## 2. The one command that proves it

```bash
cd server
npm run db:verify
```

Expected result:

```
===============================================================
        MONGODB CONNECTION VERIFICATION - DEVSECOPS DASHBOARD
===============================================================
  Environment : development
  Node.js     : v24.14.0
  Mongoose    : 8.24.5
  Target URI  : mongodb://127.0.0.1:27017/devsecops_dashboard
  Expected DB : devsecops_dashboard
--------------------------------------------------------------------------

1. CONFIGURATION
  [PASS] MONGO_URI defined in environment - from server/.env

2. CONNECTION
  [PASS] Mongoose connected - readyState=1 (1 = connected)
  [PASS] Host and port reachable - 127.0.0.1:27017
  [PASS] Database selected - devsecops_dashboard
  Connection time: 16 ms

3. SERVER RESPONSE
  [PASS] admin.ping() acknowledged - 7 ms
  [PASS] Server version reported - MongoDB 9.0.2

4. READ / WRITE ROUND TRIP
  [PASS] Document written - temporary collection
  [PASS] Document read back
  [PASS] Temporary collection removed

5. APPLICATION DATA
  [PASS] Collections present - 14 collections
  [PASS] Documents present - 290 documents
  [PASS] Storage engine - wiredTiger, 0.18 MB data

6. SCHEMA INVARIANT (deduplication)
  [PASS] Unique index on { fingerprint, project } - fingerprint_1_project_1
==========================================================================
  RESULT: CONNECTION VERIFIED (13/13 checks passed)
==========================================================================
```

Exit code: `0`.

The script is read-only against application data. It creates one document in a
temporary collection, reads it back, then drops the collection, proving write
permission without touching real records.

---

## 3. Independent checks (outside the application)

These prove the database is a real running server, not an in-memory stub.

```powershell
# 1. Windows service state
Get-Service MongoDB

# 2. Port listening
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017

# 3. Process
Get-Process mongod

# 4. API health (implies successful startup connection)
Invoke-RestMethod http://localhost:5000/api/v1/health
```

Observed:

| Check | Result |
|---|---|
| Service `MongoDB` | `Running`, start type `Automatic` |
| TCP 27017 | reachable |
| `mongod` binary | `C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe` |
| API health | `200`, `"message": "DevSecOps Monitoring Dashboard API is operational"` |

---

## 4. Inspecting the actual data

```bash
cd server
npm run db:peek                      # 14 collections, document and index counts
npm run db:peek -- vulnerabilities   # sample documents + indexes
npm run db:peek -- users 3           # arbitrary collection, up to 10 documents
```

`db:peek` redacts `password`, `secret`, `token`, `hash` and `apiKey` fields, so
the output is safe for a projector or a report screenshot.

Live collection matrix: see `README.md` §5.3, or run `npm run db:summary`.

---

## 5. Repository map for the database design

| Collection | Purpose |
|---|---|
| `users` | Accounts, roles, bcrypt hashes, lockout counters, refresh token hash |
| `projects` | Scanned projects and their gate/SLA policy |
| `vulnerabilities` | Normalised findings; unique `{fingerprint, project}` index |
| `pipelineruns` | Gate decision, stage breakdown, trigger metadata |
| `scanresults` | Raw scan summary per import |
| `frameworks` | OWASP Top 10, PCI-DSS and others |
| `controls` | Controls with CWE mappings |
| `assessments` | Per-project, per-control compliance status and score |
| `incidents` | Five-stage response lifecycle and post-mortem |
| `alerts` | Generated alert records |
| `notifications` | Per-user in-app notifications |
| `auditlogs` | Actor, action, before/after state, IP, user agent |
| `apikeys` | Webhook credentials, AES-256-GCM encrypted secret |
| `settings` | Global platform settings |

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB service stopped | `net start MongoDB` (admin PowerShell) |
| `MongooseServerSelectionTimeoutError` | Wrong host/port, or firewall | Check `MONGO_URI`; for Atlas, check the IP allowlist |
| `Authentication failed` | Atlas credentials or missing authSource | Append `?authSource=admin` or use the exact Atlas URI |
| `ENOTFOUND <cluster>.mongodb.net` | No internet / wrong cluster name | Verify the cluster hostname |
| API exits immediately on `npm start` | Database unreachable at boot (by design) | Start MongoDB, then `npm run db:verify` |
| Collections exist but are empty | Seed never ran, or wrong database | `npm run seed` |
| Port 27017 already in use | A second `mongod` instance | `Get-Process mongod`; stop the duplicate |

---

## 7. Switching to MongoDB Atlas (cloud)

No application code changes are required.

1. Create a free cluster at `cloud.mongodb.com`.
2. Create a database user with `readWrite` on `devsecops_dashboard`.
3. Add your current public IP under **Network Access**.
4. Copy the driver connection string and set it in `server/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/devsecops_dashboard?retryWrites=true&w=majority
```

5. Verify and seed:

```bash
cd server
npm run db:verify
npm run seed
```

Production note: the URI contains credentials, so it belongs in a secret
manager, not a committed `.env`. The local development instance also runs
without authentication; production requires `auth`, TLS, a least-privilege
application user and network isolation.

---

## 8. Evidence checklist for the report

Capture these, in this order, and cite them in the Database chapter:

1. `Get-Service MongoDB` showing `Running`.
2. `npm run db:verify` ending in `CONNECTION VERIFIED (13/13 checks passed)`.
3. `npm run db:peek` showing 14 collections with counts.
4. `npm run db:peek -- vulnerabilities 1` showing one normalised finding.
5. The `fingerprint_1_project_1  [UNIQUE]` index line.
6. MongoDB Compass (optional) browsing the `vulnerabilities` collection.
7. `server/src/config/db.js` in an editor, showing `mongoose.connect`.

If a live demo is impossible, items 2–5 are terminal text and can be pasted
verbatim into the report appendix.
