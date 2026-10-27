import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for HTTP POST without external dependencies
const sendPostRequest = (url, headers, body) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5000,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

async function main() {
  console.log('--- DevSecOps Webhook Scan Dispatcher (Local CLI Simulation) ---');

  // Connect to DB to ensure test API key and Project exist
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';
  await mongoose.connect(mongoUri);

  const { default: ApiKey } = await import('../src/models/ApiKey.js');
  const { default: Project } = await import('../src/models/Project.js');
  const { default: User } = await import('../src/models/User.js');
  const { encryptSecret } = await import('../src/utils/crypto.js');

  // 1. Ensure test user exists
  let admin = await User.findOne({ role: 'Admin' });
  if (!admin) {
    admin = await User.create({
      name: 'System Admin',
      email: 'admin@devsecops.local',
      password: 'Password123!',
      role: 'Admin'
    });
  }

  // 2. Ensure target project exists
  let project = await Project.findOne({ key: 'PAY-SVC' });
  if (!project) {
    project = await Project.create({
      name: 'payment-service',
      key: 'PAY-SVC',
      description: 'Payment microservice API codebase',
      criticality: 'Critical',
      securityScore: 100
    });
    console.log('Created project: payment-service (PAY-SVC)');
  }

  // 3. Ensure active API Key exists
  const keyId = 'dso_live_test_key_001';
  const plainSecret = 'dso_sec_sample_secret_key_998877665544';

  let apiKey = await ApiKey.findOne({ keyId });
  if (!apiKey) {
    apiKey = await ApiKey.create({
      name: 'Local CI Pipeline Key',
      keyId,
      encryptedSecret: encryptSecret(plainSecret),
      hashedSecret: crypto.createHash('sha256').update(plainSecret).digest('hex'),
      autoCreateProject: true,
      createdBy: admin._id
    });
    console.log('Created test API Key: ' + keyId);
  }

  await mongoose.disconnect();

  // 4. Load Sample Payload (Trivy)
  const samplePath = path.resolve(__dirname, '../../docs/ci/sample-payloads/trivy-sample.json');
  if (!fs.existsSync(samplePath)) {
    console.error('Sample report not found at: ' + samplePath);
    process.exit(1);
  }
  const rawReport = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

  const payload = JSON.stringify({
    project: 'PAY-SVC',
    tool: 'trivy',
    scanType: 'SCA',
    pipeline: {
      provider: 'github-actions',
      runId: `run-${Date.now()}`,
      runUrl: 'https://github.com/organization/payment-service/actions/runs/123456',
      branch: 'main',
      commit: '7a8b9c0d1e2f',
      triggeredBy: 'dev-security'
    },
    report: rawReport
  });

  // 5. Compute HMAC-SHA256 signature over raw string
  const signature = crypto.createHmac('sha256', plainSecret).update(payload).digest('hex');

  console.log(`Payload prepared: ${Buffer.byteLength(payload)} bytes`);
  console.log(`Generated HMAC Signature: sha256=${signature}`);

  const targetUrl = `http://localhost:${process.env.PORT || 5000}/api/v1/webhooks/scan`;
  console.log(`Dispatching POST to ${targetUrl}...`);

  try {
    const response = await sendPostRequest(
      targetUrl,
      {
        'X-API-Key': keyId,
        'X-Signature': `sha256=${signature}`
      },
      payload
    );

    console.log(`\nServer Response Code: ${response.status}`);
    console.log('Response Payload:', JSON.stringify(response.body, null, 2));

    if (response.status === 200) {
      console.log('\n[SUCCESS] Webhook ingested, parsed, and evaluated with live gate status!');
    } else {
      console.log('\n[FAILED] Ingestion was rejected by server.');
    }
  } catch (err) {
    console.error('\nNetwork connection failed. Ensure the server is running on port 5000: ' + err.message);
  }
}

main().catch(console.error);
