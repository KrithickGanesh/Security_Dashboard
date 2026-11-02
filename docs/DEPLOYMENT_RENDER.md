# Deploying on Render + MongoDB Atlas

One Render web service serves **both** the React SPA and the Express API, so the
whole application lives on a single origin. That removes CORS, cross-site
cookies and WebSocket proxying from the picture entirely.

```
Browser
  │  https://<service>.onrender.com
  ├── /                 → React SPA (static files from client/dist)
  ├── /api/v1/*         → Express REST API
  └── /socket.io/*      → Socket.IO (same origin, no CORS)
        │
        └── mongodb+srv://…  → MongoDB Atlas M0
```

| Piece | Where | Cost |
|---|---|---|
| SPA + API | Render Web Service (Docker) | Free |
| Database | MongoDB Atlas M0 | Free |
| TLS | Render (automatic) | Free |

---

## Why one service instead of two

Splitting the SPA (static site) and the API (web service) gives you two
different `onrender.com` subdomains. That is a **cross-site** setup, which
forces `SameSite=None` cookies and an exact CORS allowlist, and makes refresh
tokens fragile. Serving the SPA from Express keeps everything same-origin:
cookies stay `SameSite=Strict`, CORS is irrelevant, and Socket.IO needs no
special handling.

The repository supports both. This guide uses the single-service layout.

---

## Step 1 — MongoDB Atlas

1. Sign in at **https://cloud.mongodb.com** → **Create** → **M0 Free**.
2. Provider **AWS**, region **Singapore** (`ap-southeast-1`) to match Render.
3. **Security Quickstart**:
   - Username: `devsecops_app`
   - Password: **Autogenerate**, then copy it somewhere safe.
   - Network access: **Add My Current IP**, then also add `0.0.0.0/0`.
4. Wait for the cluster to show **Ready** (~3 minutes).
5. **Connect → Drivers → Node.js** and copy the string.
6. Edit it: replace `<db_password>` and insert the database name before `?`.

```
mongodb+srv://devsecops_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/devsecops_dashboard?retryWrites=true&w=majority
```

The `/devsecops_dashboard` segment is mandatory. Without it Mongoose writes to a
database called `test` and your seeding appears to disappear.

> `0.0.0.0/0` is required because Render's free tier has no static egress IP.
> It is a documented trade-off: acceptable for a demo, not for production.

---

## Step 2 — Seed Atlas from your machine

Render's free tier has no shell, so seed locally against Atlas.

```powershell
cd server
$env:MONGO_URI="mongodb+srv://devsecops_app:PASSWORD@cluster0.xxxxx.mongodb.net/devsecops_dashboard?retryWrites=true&w=majority"
npm run db:verify
npm run seed
npm run db:summary
```

Expected:

- `db:verify` → `CONNECTION VERIFIED`
- `db:summary` → **14 collections, 228 documents** (fresh seed)

To go back to the local database afterwards, remove the variable:

```powershell
Remove-Item Env:MONGO_URI
```

---

## Step 3 — Create the Render service

### Option A: Blueprint (uses `render.yaml`)

Render Dashboard → **New → Blueprint** → select this repository → **Apply**.
Render reads `render.yaml`, builds the root `Dockerfile`, and creates one web
service named `devsecops-dashboard`. Then fill in `MONGO_URI` and `CLIENT_URL`.

### Option B: Manual

**New → Web Service** → connect the repository → **Runtime: Docker**:

| Field | Value |
|---|---|
| Name | `devsecops-dashboard` |
| Region | Singapore |
| Dockerfile path | `./Dockerfile` |
| Docker build context | `.` (repository root) |
| Health check path | `/api/v1/health` |
| Instance type | Free |

Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | your Atlas string |
| `JWT_SECRET` | `8ceb7b38bdc67059c0ed31538cd82298d24e24577b7570a9e756a5b7305cd039` (or generate a new one) |
| `CLIENT_URL` | `https://devsecops-dashboard.onrender.com` (your actual URL) |
| `COOKIE_SAME_SITE` | `strict` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `1` |

Click **Create Web Service**. The first build takes 3–6 minutes: it installs
client dependencies, builds the SPA, installs server dependencies and bundles
the result.

> **CLIENT_URL chicken-and-egg:** Render assigns the URL when the service is
> created. If you do not know it yet, deploy once, copy the URL from the
> dashboard, set `CLIENT_URL`, then **Manual Deploy → Deploy latest commit**.
> Until it matches, login requests are rejected by the CORS check.

---

## Step 4 — Verify the deployment

Run these in order against `https://<service>.onrender.com`:

| # | Check | Expected |
|---|---|---|
| 1 | `GET /api/v1/health` | `200`, `success: true` |
| 2 | Open `/` | Login page renders (not JSON, not 404) |
| 3 | Sign in as `analyst@devsecops.local` / `Password123!` | Dashboard loads with seeded data |
| 4 | Hard-refresh on `/vulnerabilities` | Page still loads (SPA fallback) |
| 5 | Wait 16 minutes, click a page | Still logged in (refresh cookie works) |
| 6 | DevTools → Network → WS | `socket.io` connected |
| 7 | Scan Import → upload a sample | Gate result returned |
| 8 | Reports → CSV | File downloads |
| 9 | Sign in as `dev@devsecops.local` | Admin menu hidden |

Command-line equivalents:

```powershell
curl.exe -s https://<service>.onrender.com/api/v1/health
curl.exe -s -o NUL -w "%{http_code}" https://<service>.onrender.com/
curl.exe -s -o NUL -w "%{http_code}" https://<service>.onrender.com/vulnerabilities
curl.exe -s https://<service>.onrender.com/api/v1/does-not-exist
```

The last one must return a JSON error (401 or 404), never the SPA's HTML.

---

## Step 5 — Updating the app

Render redeploys automatically on every push to `main`:

```bash
git add -A
git commit -m "feat: ..."
git push
```

Watch the build in **Logs**. A failed build keeps the previous version running.

---

## Free-tier behaviour you must plan around

- The service **sleeps after 15 minutes** of inactivity. The next request takes
  30–60 seconds. Open the URL 5 minutes before a demo, or upgrade to Starter.
- 512 MB RAM. The SPA build happens at deploy time, not at runtime, so memory is
  fine for this application.
- **Run exactly one instance.** The SLA cron and Socket.IO are in-process; two
  replicas would run the hourly job twice and split socket rooms.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails at `npm ci` | Lockfile out of sync | Run `npm install` locally, commit `package-lock.json` |
| `Blocked by CORS policy` | `CLIENT_URL` ≠ actual origin | Set it to the exact service URL, no trailing slash, redeploy |
| Login returns 401, then works | Cookie rejected | `COOKIE_SECURE=true` requires HTTPS; Render provides it |
| Logged out after 15 minutes | Refresh cookie not stored | Check `COOKIE_SAME_SITE=strict`, and that `CLIENT_URL` matches |
| `MongooseServerSelectionError` | Atlas unreachable | Check URI, password encoding, Network Access |
| Blank page, 404 on `/` | SPA was not copied into the image | Confirm the build log shows `client-build` stage and `/app/public` exists |
| `429 Too many requests` | 300 requests / 15 min per IP | Wait, or raise `max` in `server/src/app.js` |
| First request takes 40 s | Free tier cold start | Warm it before the demo |
| PDF shows 0% in the framework section | Known field-mapping defect | Avoid that section in the viva |

---

## Security notes before making it public

- Generate `JWT_SECRET`; never reuse the value in `docker-compose.yml`.
- The seeded accounts use `Password123!`. Change them, or keep the service
  private until after evaluation.
- Atlas is open to `0.0.0.0/0`. Acceptable for a demo only.
- Still missing: CSRF tokens, complete audit coverage, `allowedTools`
  enforcement. Treat this as a pilot, not a production service.
- Set the GitHub repository to **Private** if the demo credentials must not be
  public.

---

## Optional: custom domain

Render → service → **Settings → Custom Domains** → add your domain → create the
CNAME Render shows. Update `CLIENT_URL` to the new origin and redeploy, or the
CORS check will reject it.
