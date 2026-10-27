# Deploying on Vercel (UI) + Render (API) + MongoDB Atlas

This is the recommended free-tier deployment: **Vercel** hosts the React SPA,
**Render** runs the Express API as a Docker container, and **Atlas** provides
the managed database.

> **Why not Vercel alone?** Vercel runs static builds and short-lived serverless
> functions. This backend needs a long-lived Node process for Socket.IO, an
> hourly `node-cron` job and a persistent MongoDB connection. Those cannot run
> on Vercel, so the API lives on Render.

---

## Architecture

```
Browser
  │
  ├── https://<app>.vercel.app        → static React build (Vercel CDN)
  │
  └── https://<api>.onrender.com      → Express + Socket.IO (Docker)
            │
            └── mongodb+srv://…       → MongoDB Atlas M0
```

The SPA and the API are on **different sites**, which drives three settings:

| Setting | Value | Why |
|---|---|---|
| `VITE_API_URL` (Vercel) | `https://<api>.onrender.com` | Absolute API base, baked in at build time |
| `CLIENT_URL` (Render) | `https://<app>.vercel.app` | CORS allowlist for REST and Socket.IO |
| `COOKIE_SAME_SITE` (Render) | `none` | Browsers only send cross-site cookies when `None; Secure` |

---

## Step 1 — MongoDB Atlas

1. Create a free **M0** cluster at `cloud.mongodb.com` in the region closest to
   your Render region.
2. **Database Access** → add a user with `readWrite` on `devsecops_dashboard`.
3. **Network Access** → add `0.0.0.0/0`. Render's free-tier egress IPs are not
   static, so an IP allowlist is not practical. (This is a documented trade-off;
   production would use a VPC peering or a static egress IP.)
4. **Connect → Drivers** → copy the connection string and add the database name:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/devsecops_dashboard?retryWrites=true&w=majority
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).

---

## Step 2 — Render (backend)

### Option A: Blueprint (uses `render.yaml` in this repo)

Render Dashboard → **New → Blueprint** → select the repository. Render reads
`render.yaml` and creates the `devsecops-api` service. Fill in `MONGO_URI` and
`CLIENT_URL` when prompted.

### Option B: Manual

**New → Web Service** → repository → **Runtime: Docker**:

| Field | Value |
|---|---|
| Dockerfile path | `server/Dockerfile` |
| Docker build context | `server` |
| Health check path | `/api/v1/health` |
| Instance type | Free |

Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | `https://<your-app>.vercel.app` (add it after step 3) |
| `COOKIE_SAME_SITE` | `none` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `1` |

Deploy. The first build takes 3–5 minutes. Confirm:

```
https://<api>.onrender.com/api/v1/health
→ {"success":true,"message":"DevSecOps Monitoring Dashboard API is operational",...}
```

### Seed the database

Render's free tier has no shell, so seed from your machine against Atlas:

```bash
cd server
# temporarily point .env at Atlas
MONGO_URI="mongodb+srv://…/devsecops_dashboard?retryWrites=true&w=majority" npm run seed
```

Or set `MONGO_URI` in `server/.env`, run `npm run seed`, then restore the local
URI. Verify with `npm run db:verify` (expect `CONNECTION VERIFIED` and
`14 collections`).

---

## Step 3 — Vercel (frontend)

1. **Add New → Project** → import the repository.
2. **Root Directory: `client`** (important — the repo root has no `package.json`).
3. Framework preset: **Vite** (auto-detected). Build `npm run build`, output `dist`.
4. **Environment Variables** (Production):

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<api>.onrender.com` |

5. **Deploy.**

`client/vercel.json` provides the React Router fallback, so deep links such as
`/dashboard` and `/vulnerabilities` work on refresh instead of returning 404.

6. Copy the assigned domain (`https://<app>.vercel.app`), go back to Render, set
   `CLIENT_URL` to exactly that value (no trailing slash), and redeploy the API.

---

## Step 4 — Verification checklist

Run these in order on the deployed URL:

| # | Check | Expected |
|---|---|---|
| 1 | `GET /api/v1/health` on Render | `200`, `success: true` |
| 2 | Open the Vercel URL | Login page renders |
| 3 | Sign in as `analyst@devsecops.local` | Dashboard loads with 14 collections of data |
| 4 | Hard-refresh on `/vulnerabilities` | Page still loads (SPA fallback works) |
| 5 | Wait 16 minutes, click anything | Silent refresh succeeds → still logged in |
| 6 | DevTools → Network → WS | `socket.io` connected |
| 7 | Scan Import → upload a sample | Gate result returned |
| 8 | Reports → CSV download | File downloads |
| 9 | Sign in as `dev@devsecops.local` | Admin menu hidden |

If step 5 fails, the refresh cookie is not being accepted — see troubleshooting.

---

## How cross-site auth works here

1. Login returns a 15-minute access token in the JSON body (stored in
   `localStorage`) **and** sets an `httpOnly` refresh cookie.
2. Because the API is on `onrender.com` and the UI on `vercel.app`, the cookie
   is **cross-site**, so it must be `SameSite=None; Secure`. That is what
   `COOKIE_SAME_SITE=none` does.
3. When the access token expires, axios calls `/auth/refresh` with
   `withCredentials: true`; the browser attaches the cookie because of CORS
   `credentials: true` plus the exact `CLIENT_URL` origin.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Blocked by CORS policy` | `CLIENT_URL` does not exactly match the browser origin | Set it to the Vercel production domain, no trailing slash, then redeploy |
| Login works, logged out after 15 min | Refresh cookie rejected | Ensure `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, and the API is HTTPS |
| Cookie missing in DevTools | Browser blocking third-party cookies | Allow cookies for the site, or use the same-origin VPS deployment |
| Socket.IO "websocket error" | `CLIENT_URL` mismatch on the Socket.IO CORS config | Same value as REST; it is read from one shared helper |
| `429 Too many requests` | 300 req / 15 min per IP | Wait, or raise `max` in `server/src/app.js` |
| First request takes 40 s | Render free tier slept after 15 min | Open the URL 5 minutes before the viva, or upgrade to Starter |
| `MongooseServerSelectionError` on boot | Atlas URI wrong, or IP not allowlisted | Check user, password encoding, and Network Access |
| PDF shows 0% in the framework section | Known field-mapping defect (documented limitation) | Avoid that section in the demo |
| Blank page, assets 404 | Root Directory not set to `client` | Fix in Vercel project settings |
| Deep link 404 | `vercel.json` missing or wrong root | Ensure it sits in `client/` |

---

## Limits and costs

| Service | Free tier | Caveat |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth | Non-commercial use |
| Render Free | 512 MB RAM, sleeps after 15 min | 30–60 s cold start; no shell |
| Atlas M0 | 512 MB storage | Shared cluster, enough for this dataset (~0.2 MB) |

**Run exactly one backend instance.** The SLA cron and Socket.IO are in-process;
two replicas would run the hourly job twice and break socket routing without a
Redis adapter.

---

## Security notes for a public demo

- `JWT_SECRET` must be generated, never the value from `docker-compose.yml`.
- The seeded accounts all use `Password123!`. On a public URL, change them or
  keep the deployment private until after evaluation.
- Atlas is open to `0.0.0.0/0`. Acceptable for a demo, not for production.
- The platform still lacks CSRF tokens, complete audit coverage and enforcement
  of `allowedTools`; treat this as a pilot, not a production service.

---

## Alternative: same-origin deployment

If cross-site cookies cause trouble, the VPS + Docker Compose option is
strictly simpler: nginx serves the SPA and proxies `/api` and `/socket.io`, so
everything is one origin, `COOKIE_SAME_SITE=strict` works, and no CORS or
`VITE_API_URL` is needed. The repository already supports it; only TLS
termination (Caddy or Certbot) has to be added.
