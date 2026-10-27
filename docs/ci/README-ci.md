# DevSecOps CI/CD Integration & Ingestion Guide

This reference guide documents how to integrate external CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins) with the **DevSecOps Compliance & Security Monitoring Dashboard**.

---

## 1. Webhook Authentication Architecture

The dashboard webhook endpoint (`POST /api/v1/webhooks/scan`) implements enterprise-grade cryptographic authentication:

- **Header `X-API-Key`**: Public key identifier (`dso_live_...`).
- **Header `X-Signature`**: `sha256=<HMAC-SHA256 hex digest>`.
- The HMAC is calculated over the **exact raw request body bytes** using the secret associated with the API key.
- On the server, comparison is executed using `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

---

## 2. Setting Up GitHub Actions Secrets

In your target repository settings (**Settings > Secrets and variables > Actions**), configure the following repository secrets:

| Secret Name | Example Value | Description |
|---|---|---|
| `DASHBOARD_URL` | `https://sec-dashboard.example.com` | Base public URL of your dashboard |
| `DASHBOARD_API_KEY` | `dso_live_8f91a2b3c4d5...` | Webhook API Key ID (generated in Admin > API Keys) |
| `DASHBOARD_API_SECRET` | `dso_sec_99a8b7c6d5e4...` | HMAC signing secret (copied upon key creation) |

---

## 3. Local Demo & Viva Evaluation Testing (Without GitHub)

You can simulate CI/CD pipeline scans and cryptographic webhook ingestion locally using the provided testing script.

### Method A: Using `send-sample-scan.js`
Run the local sender utility which creates an API key in the database (if needed), computes the HMAC-SHA256 signature, and POSTs the sample payload:

```powershell
cd server
node scripts/send-sample-scan.js
```

### Method B: Exposing Localhost via Cloudflare Tunnel or ngrok
If you wish to test a genuine GitHub Actions runner hitting your local laptop:
1. Run ngrok or Cloudflare Tunnel:
   ```powershell
   npx cloudflared tunnel --url http://localhost:5000
   ```
2. Copy the generated public HTTPS URL (e.g. `https://random-subdomain.trycloudflare.com`).
3. Add it as `DASHBOARD_URL` in your GitHub repository secrets.
4. Trigger your GitHub Actions workflow!

---

## 4. Webhook Payload Specification

```json
{
  "project": "PAY-SVC",
  "tool": "trivy",
  "scanType": "SCA",
  "pipeline": {
    "provider": "github-actions",
    "runId": "987654321",
    "runUrl": "https://github.com/organization/payment-service/actions/runs/987654321",
    "branch": "main",
    "commit": "a1b2c3d4e5f6",
    "triggeredBy": "developer-name"
  },
  "report": {
    "...raw tool output JSON..."
  }
}
```
