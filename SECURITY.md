# Security Policy & Cryptographic Implementation Architecture

This document describes the security controls, cryptographic measures, and vulnerability disclosure policies implemented within the **DevSecOps Compliance and Security Monitoring Dashboard**.

---

## 1. Cryptographic Design & Defensive Controls

### 1.1 Webhook Authentication & HMAC Verification
- **Timing-Safe Digest Comparison**: Incoming scanner reports at `/api/v1/webhooks/scan` require an `X-Signature: sha256=<hmac>` header computed with the API key's secret.
- Verification uses Node's native `crypto.timingSafeEqual` over the exact raw request buffer (`req.rawBody`) captured prior to JSON parsing. This prevents **Timing Attacks** and padding-oracle exploits.
- API Key secrets are encrypted at rest using **AES-256-GCM** with a distinct 16-byte initialization vector (IV) and authentication tag.

### 1.2 User Authentication & Session Security
- **Password Hashing**: Bcrypt with a work factor of 12 (`cost: 12`), salted with cryptographic entropy.
- **Token Architecture**:
  - **Access Token**: Short-lived (15 minutes), signed using HMAC SHA-256.
  - **Refresh Token**: Stored in a strict `httpOnly`, `SameSite=Strict`, `secure` cookie. The database stores strictly a SHA-256 hash of the token.
  - **Refresh Token Rotation**: Refresh tokens are rotated on every invocation. If a reused token is detected, all sessions for the user are immediately invalidated.
- **Account Lockout Defense**: 5 consecutive failed login attempts trigger an automatic 15-minute lockout (`lockUntil`). Administrators can inspect and unlock accounts.

### 1.3 Secret Masking & Redaction Engine
- **Zero-Storage for Leaked Secrets**: When parsing Git secret reports (e.g., Gitleaks), the ingestion service strictly redacts the captured secret (e.g., `AKIA*****************`). Under no circumstance is a live secret stored in MongoDB or reflected in audit logs.

### 1.4 Injection Mitigation & Defense-in-Depth
- **NoSQL Injection**: `express-mongo-sanitize` strips `$` and `.` operators from request bodies, parameters, and query strings.
- **Parameter Pollution**: `hpp` protects against HTTP parameter array pollution.
- **Security Headers**: `helmet` applies hardened HTTP response headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security).
- **Rate Limiting**: `express-rate-limit` enforces strict request windows across authentication endpoints and global routes.

---

## 2. Reporting a Security Vulnerability

If you discover a security vulnerability within this platform:
1. Please do not open a public GitHub issue.
2. Email the maintainer or project team at `security@devsecops-dashboard.local`.
3. Provide a reproduction script or HTTP request trace.
4. Security advisories will be triaged and addressed within 48 hours according to our Critical Severity SLA policy.
