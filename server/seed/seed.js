import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Vulnerability from '../src/models/Vulnerability.js';
import PipelineRun from '../src/models/PipelineRun.js';
import ScanResult from '../src/models/ScanResult.js';
import Framework from '../src/models/Framework.js';
import Control from '../src/models/Control.js';
import Assessment from '../src/models/Assessment.js';
import Incident from '../src/models/Incident.js';
import Alert from '../src/models/Alert.js';
import Notification from '../src/models/Notification.js';
import AuditLog from '../src/models/AuditLog.js';
import ApiKey from '../src/models/ApiKey.js';
import Settings from '../src/models/Settings.js';
import { encryptSecret } from '../src/utils/crypto.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsecops_dashboard';

// Curated authentic CVE and security telemetry database
const CVE_LIBRARY = [
  {
    cve: 'CVE-2024-3094',
    title: 'Backdoor in upstream xz/liblzma data compression library',
    severity: 'Critical',
    cvss: 10.0,
    tool: 'trivy',
    scanType: 'Container',
    component: 'xz-utils',
    version: '5.6.0',
    fixedVersion: '5.6.1-r0',
    cwe: ['CWE-506'],
    remediation: 'Upgrade xz-utils container package to 5.6.1 or downgrade to 5.4.x stable'
  },
  {
    cve: 'CVE-2023-44487',
    title: 'HTTP/2 Rapid Reset DDoS attack condition against web servers',
    severity: 'High',
    cvss: 7.5,
    tool: 'trivy',
    scanType: 'SCA',
    component: 'golang.org/x/net',
    version: '0.15.0',
    fixedVersion: '0.17.0',
    cwe: ['CWE-400'],
    remediation: 'Upgrade golang net package to 0.17.0 or configure request burst thresholds'
  },
  {
    cve: 'CVE-2021-44228',
    title: 'Remote Code Execution in Apache Log4j JNDI lookup functionality',
    severity: 'Critical',
    cvss: 10.0,
    tool: 'trivy',
    scanType: 'SCA',
    component: 'org.apache.logging.log4j:log4j-core',
    version: '2.14.1',
    fixedVersion: '2.17.1',
    cwe: ['CWE-502', 'CWE-20'],
    remediation: 'Update log4j-core dependency to >= 2.17.1 or set log4j2.formatMsgNoLookups=true'
  },
  {
    cve: 'CVE-2023-38545',
    title: 'Heap-based buffer overflow in SOCKS5 proxy handshake in libcurl',
    severity: 'High',
    cvss: 9.8,
    tool: 'trivy',
    scanType: 'Container',
    component: 'libcurl4',
    version: '7.88.1',
    fixedVersion: '8.4.0',
    cwe: ['CWE-122'],
    remediation: 'Update base image to Debian 12.2+ or patch libcurl to 8.4.0+'
  },
  {
    cve: 'CVE-2022-22965',
    title: 'Spring Framework Remote Code Execution via Data Binding (Spring4Shell)',
    severity: 'Critical',
    cvss: 9.8,
    tool: 'trivy',
    scanType: 'SCA',
    component: 'org.springframework:spring-beans',
    version: '5.3.17',
    fixedVersion: '5.3.18',
    cwe: ['CWE-94'],
    remediation: 'Upgrade spring-beans to 5.3.18 or 5.2.20'
  },
  {
    cve: 'CVE-2023-26159',
    title: 'Follow-redirects Prototype Pollution via proxy URL parsing',
    severity: 'Medium',
    cvss: 6.5,
    tool: 'npm-audit',
    scanType: 'SCA',
    component: 'follow-redirects',
    version: '1.15.3',
    fixedVersion: '1.15.4',
    cwe: ['CWE-1321'],
    remediation: 'Run npm install follow-redirects@1.15.4'
  },
  {
    cve: 'CVE-2023-45853',
    title: 'Integer overflow in MiniZip in zlib leads to heap corruption',
    severity: 'Medium',
    cvss: 5.5,
    tool: 'trivy',
    scanType: 'Container',
    component: 'zlib1g',
    version: '1.2.13',
    fixedVersion: '1.3',
    cwe: ['CWE-190'],
    remediation: 'Rebuild image using patched zlib version'
  },
  {
    cve: 'CVE-2023-26136',
    title: 'Tough-cookie Prototype Pollution in cookie string handling',
    severity: 'Medium',
    cvss: 6.5,
    tool: 'npm-audit',
    scanType: 'SCA',
    component: 'tough-cookie',
    version: '4.1.2',
    fixedVersion: '4.1.3',
    cwe: ['CWE-1321'],
    remediation: 'Update tough-cookie to 4.1.3'
  },
  {
    cve: 'CVE-2022-25883',
    title: 'Semver Regular Expression Denial of Service (ReDoS)',
    severity: 'Low',
    cvss: 5.3,
    tool: 'npm-audit',
    scanType: 'SCA',
    component: 'semver',
    version: '7.5.1',
    fixedVersion: '7.5.2',
    cwe: ['CWE-1333'],
    remediation: 'Update semver to 7.5.2+'
  },
  {
    cve: 'CVE-2024-21626',
    title: 'Container escape through file descriptor leak in runc',
    severity: 'Critical',
    cvss: 8.6,
    tool: 'trivy',
    scanType: 'Container',
    component: 'runc',
    version: '1.1.11',
    fixedVersion: '1.1.12',
    cwe: ['CWE-403'],
    remediation: 'Upgrade host container runtime and runc package to 1.1.12'
  }
];

const SECRET_LIBRARY = [
  {
    title: 'Exposed AWS Access Key ID in codebase',
    severity: 'Critical',
    tool: 'gitleaks',
    scanType: 'Secret',
    component: 'config/aws.js',
    file: 'src/config/aws.js',
    line: 14,
    cwe: ['CWE-798'],
    remediation: 'Revoke AWS IAM key immediately, rotate credentials, and move to IAM Instance Roles'
  },
  {
    title: 'Stripe Live Secret Key committed to repository',
    severity: 'Critical',
    tool: 'gitleaks',
    scanType: 'Secret',
    component: 'services/payment.js',
    file: 'src/services/payment.js',
    line: 28,
    cwe: ['CWE-798'],
    remediation: 'Roll Stripe API secret key in dashboard and inject via AWS Secrets Manager'
  },
  {
    title: 'Generic Private RSA Key file detected',
    severity: 'High',
    tool: 'gitleaks',
    scanType: 'Secret',
    component: 'keys/id_rsa',
    file: 'certs/private.key',
    line: 1,
    cwe: ['CWE-312'],
    remediation: 'Delete private key from git history using git-filter-repo and issue new TLS cert'
  },
  {
    title: 'GitHub Personal Access Token (PAT) exposed',
    severity: 'High',
    tool: 'gitleaks',
    scanType: 'Secret',
    component: '.env.example',
    file: '.env.example',
    line: 8,
    cwe: ['CWE-798'],
    remediation: 'Revoke compromised GitHub PAT and remove value from sample file'
  }
];

const SAST_LIBRARY = [
  {
    title: 'Potential SQL Injection through unescaped user parameter interpolation',
    severity: 'High',
    cvss: 8.2,
    tool: 'semgrep',
    scanType: 'SAST',
    component: 'controllers/search.controller.js',
    file: 'src/controllers/search.controller.js',
    line: 42,
    cwe: ['CWE-89'],
    remediation: 'Replace string template queries with parameterized queries or Mongoose ORM models'
  },
  {
    title: 'Cross-Site Scripting (Reflected XSS) in raw innerHTML rendering',
    severity: 'Medium',
    cvss: 6.1,
    tool: 'semgrep',
    scanType: 'SAST',
    component: 'components/Feed.jsx',
    file: 'src/components/Feed.jsx',
    line: 77,
    cwe: ['CWE-79'],
    remediation: 'Sanitize HTML output with DOMPurify or use standard JSX text interpolation'
  },
  {
    title: 'Insecure Direct Object Reference (IDOR) without ownership validation',
    severity: 'High',
    cvss: 7.4,
    tool: 'semgrep',
    scanType: 'SAST',
    component: 'routes/order.routes.js',
    file: 'src/routes/order.routes.js',
    line: 33,
    cwe: ['CWE-639'],
    remediation: 'Enforce user ownership check matching req.user._id before returning order document'
  },
  {
    title: 'Cryptographic Weak Random Number Generator (Math.random) used for tokens',
    severity: 'Medium',
    cvss: 5.3,
    tool: 'semgrep',
    scanType: 'SAST',
    component: 'utils/auth.js',
    file: 'src/utils/auth.js',
    line: 19,
    cwe: ['CWE-338'],
    remediation: 'Use crypto.randomBytes() for session, reset, and authentication token generation'
  },
  {
    title: 'Hardcoded JSON Web Token secret string in configuration',
    severity: 'Critical',
    cvss: 8.9,
    tool: 'semgrep',
    scanType: 'SAST',
    component: 'config/jwt.js',
    file: 'src/config/jwt.js',
    line: 7,
    cwe: ['CWE-798'],
    remediation: 'Inject JWT_SECRET exclusively from secure environment variables'
  }
];

export async function seedDatabase() {
  console.log('🚀 Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Vulnerability.deleteMany({}),
    PipelineRun.deleteMany({}),
    ScanResult.deleteMany({}),
    Framework.deleteMany({}),
    Control.deleteMany({}),
    Assessment.deleteMany({}),
    Incident.deleteMany({}),
    Alert.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    ApiKey.deleteMany({}),
    Settings.deleteMany({})
  ]);

  // ==========================================
  // 1. Seed System Settings
  // ==========================================
  console.log('⚙️ Seeding System Configuration...');
  const settings = await Settings.create({
    key: 'system_config',
    slaDays: {
      critical: 2,
      high: 7,
      medium: 30,
      low: 90
    },
    gatePolicyDefaults: {
      failOnCritical: true,
      maxHigh: 3,
      maxMedium: 15
    },
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      lockoutThreshold: 5,
      lockoutMinutes: 15
    },
    emailNotifications: {
      enabled: true,
      alertOnCritical: true,
      alertOnGateFail: true
    }
  });

  // ==========================================
  // 2. Seed Users (1 per Role)
  // ==========================================
  console.log('👥 Seeding RBAC Users...');
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@devsecops.local',
    password: 'Password123!',
    role: 'Admin',
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 3600 * 1000)
  });

  const analystUser = await User.create({
    name: 'Sarah Connor (SecAnalyst)',
    email: 'analyst@devsecops.local',
    password: 'Password123!',
    role: 'Security Analyst',
    isActive: true,
    lastLogin: new Date(Date.now() - 5 * 3600 * 1000)
  });

  const devUser = await User.create({
    name: 'Alex Rivera (Developer)',
    email: 'dev@devsecops.local',
    password: 'Password123!',
    role: 'Developer',
    isActive: true,
    lastLogin: new Date(Date.now() - 12 * 3600 * 1000)
  });

  const auditorUser = await User.create({
    name: 'Elena Rostova (Auditor)',
    email: 'auditor@devsecops.local',
    password: 'Password123!',
    role: 'Auditor',
    isActive: true,
    lastLogin: new Date(Date.now() - 24 * 3600 * 1000)
  });

  const usersList = [adminUser, analystUser, devUser, auditorUser];

  // ==========================================
  // 3. Seed Projects
  // ==========================================
  console.log('📦 Seeding Production Microservices...');
  const projectsData = [
    {
      name: 'payment-service',
      key: 'PAY-SRV',
      description: 'PCI-DSS certified Stripe & ACH payment settlement gateway',
      repository: 'https://github.com/org/payment-service',
      defaultBranch: 'main',
      environment: 'Production',
      owner: devUser._id
    },
    {
      name: 'auth-service',
      key: 'AUTH-SRV',
      description: 'Central OAuth2, OIDC, and JWT credential authentication service',
      repository: 'https://github.com/org/auth-service',
      defaultBranch: 'main',
      environment: 'Production',
      owner: devUser._id
    },
    {
      name: 'frontend-portal',
      key: 'WEB-APP',
      description: 'Customer facing web dashboard built with React and Vite',
      repository: 'https://github.com/org/frontend-portal',
      defaultBranch: 'main',
      environment: 'Production',
      owner: devUser._id
    },
    {
      name: 'api-gateway',
      key: 'API-GW',
      description: 'Edge reverse proxy, TLS terminator, and global rate limiter',
      repository: 'https://github.com/org/api-gateway',
      defaultBranch: 'main',
      environment: 'Production',
      owner: devUser._id
    },
    {
      name: 'data-pipeline',
      key: 'DATA-ENG',
      description: 'Streaming analytics and Kafka consumer pipeline',
      repository: 'https://github.com/org/data-pipeline',
      defaultBranch: 'main',
      environment: 'Production',
      owner: devUser._id
    },
    {
      name: 'notification-worker',
      key: 'NOTIF-WRK',
      description: 'Async worker handling transactional email and SMS dispatches',
      repository: 'https://github.com/org/notification-worker',
      defaultBranch: 'main',
      environment: 'Staging',
      owner: devUser._id
    }
  ];

  const projects = await Project.insertMany(projectsData);

  // ==========================================
  // 4. Seed API Keys for CI/CD
  // ==========================================
  console.log('🔑 Seeding CI/CD API Keys...');
  const rawKey1 = 'dso_live_github_actions_prod_001';
  const rawSecret1 = 'dso_sec_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4';

  const rawKey2 = 'dso_live_gitlab_runner_staging_002';
  const rawSecret2 = 'dso_sec_11b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

  await ApiKey.create({
    name: 'GitHub Actions Main CI Pipeline',
    keyId: rawKey1,
    encryptedSecret: encryptSecret(rawSecret1),
    hashedSecret: crypto.createHash('sha256').update(rawSecret1).digest('hex'),
    allowedTools: ['trivy', 'gitleaks', 'npm-audit', 'semgrep'],
    autoCreateProject: true,
    createdBy: adminUser._id,
    lastUsedAt: new Date(Date.now() - 3600 * 1000)
  });

  await ApiKey.create({
    name: 'GitLab Staging Runner',
    keyId: rawKey2,
    encryptedSecret: encryptSecret(rawSecret2),
    hashedSecret: crypto.createHash('sha256').update(rawSecret2).digest('hex'),
    allowedTools: ['trivy', 'npm-audit'],
    autoCreateProject: false,
    createdBy: adminUser._id,
    lastUsedAt: new Date(Date.now() - 48 * 3600 * 1000)
  });

  // ==========================================
  // 5. Seed Compliance Frameworks & Controls
  // ==========================================
  console.log('🏛️ Seeding Compliance Frameworks & Controls...');
  const frameworksData = [
    {
      name: 'OWASP Top 10 (2021)',
      code: 'OWASP-2021',
      version: '2021.1',
      description: 'Standard security awareness document for web application security',
      totalControls: 10,
      passedControls: 8,
      failedControls: 2,
      complianceScore: 80
    },
    {
      name: 'NIST Cybersecurity Framework',
      code: 'NIST-CSF',
      version: '1.1',
      description: 'Framework for Improving Critical Infrastructure Cybersecurity',
      totalControls: 5,
      passedControls: 4,
      failedControls: 1,
      complianceScore: 80
    },
    {
      name: 'CIS Critical Security Controls',
      code: 'CIS-V8',
      version: '8.0',
      description: 'Prioritized set of actions to protect organizations and data from cyber attacks',
      totalControls: 6,
      passedControls: 5,
      failedControls: 1,
      complianceScore: 83
    },
    {
      name: 'ISO/IEC 27001:2022',
      code: 'ISO-27001',
      version: '2022',
      description: 'Information security, cybersecurity and privacy protection systems',
      totalControls: 5,
      passedControls: 4,
      failedControls: 1,
      complianceScore: 80
    },
    {
      name: 'SOC 2 Type II (Trust Services Criteria)',
      code: 'SOC-2',
      version: '2017',
      description: 'Security, Availability, Processing Integrity, Confidentiality and Privacy',
      totalControls: 5,
      passedControls: 5,
      failedControls: 0,
      complianceScore: 100
    },
    {
      name: 'PCI-DSS 4.0 Subsets',
      code: 'PCI-DSS-4',
      version: '4.0',
      description: 'Payment Card Industry Data Security Standard technical controls',
      totalControls: 6,
      passedControls: 5,
      failedControls: 1,
      complianceScore: 83
    }
  ];

  const frameworks = await Framework.insertMany(frameworksData);

  // Seed Controls for Frameworks
  const controlsData = [];
  const owaspFw = frameworks.find((f) => f.code === 'OWASP-2021');
  const nistFw = frameworks.find((f) => f.code === 'NIST-CSF');
  const cisFw = frameworks.find((f) => f.code === 'CIS-V8');
  const pciFw = frameworks.find((f) => f.code === 'PCI-DSS-4');

  const owaspControls = [
    { code: 'A01:2021', title: 'Broken Access Control', cat: 'Access Control', status: 'Passed' },
    { code: 'A02:2021', title: 'Cryptographic Failures', cat: 'Cryptography', status: 'Passed' },
    { code: 'A03:2021', title: 'Injection (SQL, NoSQL, OS Command)', cat: 'Input Validation', status: 'Failed' },
    { code: 'A04:2021', title: 'Insecure Design', cat: 'Architecture', status: 'Passed' },
    { code: 'A05:2021', title: 'Security Misconfiguration', cat: 'Configuration', status: 'Passed' },
    { code: 'A06:2021', title: 'Vulnerable and Outdated Components', cat: 'SCA / Supply Chain', status: 'Failed' },
    { code: 'A07:2021', title: 'Identification and Authentication Failures', cat: 'Auth', status: 'Passed' },
    { code: 'A08:2021', title: 'Software and Data Integrity Failures', cat: 'CI/CD Pipeline', status: 'Passed' },
    { code: 'A09:2021', title: 'Security Logging and Monitoring Failures', cat: 'Auditing', status: 'Passed' },
    { code: 'A10:2021', title: 'Server-Side Request Forgery (SSRF)', cat: 'Network', status: 'Passed' }
  ];

  owaspControls.forEach((c) => {
    controlsData.push({
      controlId: c.code,
      title: c.title,
      framework: owaspFw._id,
      domain: c.cat,
      description: `Continuous verification of ${c.title} across active codebases.`
    });
  });

  const nistControls = [
    { code: 'ID.AM-1', title: 'Physical and virtual devices inventoried', cat: 'Identify' },
    { code: 'PR.AC-1', title: 'Identities and credentials issued and managed', cat: 'Protect' },
    { code: 'DE.CM-1', title: 'Network is monitored to detect potential cybersecurity events', cat: 'Detect' },
    { code: 'RS.RP-1', title: 'Response plan is executed during or after an event', cat: 'Respond' },
    { code: 'RC.RP-1', title: 'Recovery plan is executed during or after a cybersecurity incident', cat: 'Recover' }
  ];

  nistControls.forEach((c) => {
    controlsData.push({
      controlId: c.code,
      title: c.title,
      framework: nistFw._id,
      domain: c.cat,
      description: `NIST CSF Control: ${c.title}`
    });
  });

  const cisControls = [
    { code: 'CIS-01', title: 'Inventory and Control of Enterprise Assets', cat: 'Inventory' },
    { code: 'CIS-02', title: 'Inventory and Control of Software Assets', cat: 'Inventory' },
    { code: 'CIS-03', title: 'Data Protection & Secret Masking', cat: 'Protection' },
    { code: 'CIS-04', title: 'Secure Configuration of Assets and Software', cat: 'Hardening' },
    { code: 'CIS-05', title: 'Account Management & RBAC Policies', cat: 'Identity' },
    { code: 'CIS-06', title: 'Access Control Management', cat: 'Identity' }
  ];

  cisControls.forEach((c) => {
    controlsData.push({
      controlId: c.code,
      title: c.title,
      framework: cisFw._id,
      domain: c.cat,
      description: `CIS Control: ${c.title}`
    });
  });

  const pciControls = [
    { code: 'PCI-6.3', title: 'Identify and manage security vulnerabilities', cat: 'Vulnerability Management' },
    { code: 'PCI-6.4', title: 'Public-facing web applications are protected', cat: 'App Security' },
    { code: 'PCI-8.2', title: 'User authentication and password strength', cat: 'Authentication' },
    { code: 'PCI-10.2', title: 'Automated audit trails are recorded for all access', cat: 'Logging' },
    { code: 'PCI-11.3', title: 'External and internal penetration testing', cat: 'Testing' },
    { code: 'PCI-12.1', title: 'Information security policy is published and maintained', cat: 'Governance' }
  ];

  pciControls.forEach((c) => {
    controlsData.push({
      controlId: c.code,
      title: c.title,
      framework: pciFw._id,
      domain: c.cat,
      description: `PCI-DSS Requirement: ${c.title}`
    });
  });

  const controls = await Control.insertMany(controlsData);

  // Seed initial Assessments for OWASP controls
  const assessmentsData = [];
  const sampleControls = controls.slice(0, 10);
  for (const project of projects.slice(0, 2)) {
    for (const ctrl of sampleControls) {
      assessmentsData.push({
        project: project._id,
        framework: ctrl.framework,
        control: ctrl._id,
        status: ctrl.controlId.includes('A03') || ctrl.controlId.includes('A06') ? 'Non-Compliant' : 'Compliant',
        score: ctrl.controlId.includes('A03') || ctrl.controlId.includes('A06') ? 40 : 100,
        evidenceNotes: `Automated assessment via CI/CD telemetry for ${project.name}`,
        evaluatedBy: analystUser._id,
        lastEvaluatedAt: new Date()
      });
    }
  }
  await Assessment.insertMany(assessmentsData);

  // ==========================================
  // 6. Seed 110+ Realistic Vulnerabilities
  // ==========================================
  console.log('🛡️ Generating 110+ Tracked Vulnerabilities...');
  const vulnerabilitiesToInsert = [];
  const severities = ['Critical', 'High', 'Medium', 'Low'];
  const statuses = ['Open', 'In Progress', 'Resolved', 'False Positive'];

  let count = 0;
  for (const project of projects) {
    // Inject at least 1 critical CVE per project
    const projCve = CVE_LIBRARY[count % CVE_LIBRARY.length];
    const fp1 = `fp-${project.key}-${projCve.cve}-001`;
    vulnerabilitiesToInsert.push({
      fingerprint: fp1,
      project: project._id,
      title: projCve.title,
      description: `Identified by automated CI scanner. Requires package upgrade.`,
      severity: projCve.severity,
      status: count === 0 ? 'Open' : count === 1 ? 'In Progress' : 'Resolved',
      cve: projCve.cve,
      cwe: projCve.cwe,
      cvss: projCve.cvss,
      tool: projCve.tool,
      scanType: projCve.scanType,
      component: projCve.component,
      version: projCve.version,
      fixedVersion: projCve.fixedVersion,
      remediationGuidance: projCve.remediation,
      assignee: devUser._id,
      slaDueDate: new Date(Date.now() + 48 * 3600 * 1000),
      slaBreached: false,
      occurrences: 3
    });
    count++;

    // Inject secret findings (Gitleaks)
    const secret = SECRET_LIBRARY[count % SECRET_LIBRARY.length];
    const fp2 = `fp-${project.key}-secret-${count}`;
    vulnerabilitiesToInsert.push({
      fingerprint: fp2,
      project: project._id,
      title: secret.title,
      description: `Gitleaks automated git commit scanner identified plaintext secret token in commit history.`,
      severity: secret.severity,
      status: count === 1 ? 'Open' : 'Resolved',
      cwe: secret.cwe,
      tool: secret.tool,
      scanType: secret.scanType,
      component: secret.component,
      filePath: secret.file,
      line: secret.line,
      remediationGuidance: secret.remediation,
      assignee: devUser._id,
      slaDueDate: new Date(Date.now() - 24 * 3600 * 1000), // Deliberate SLA Breach for demo!
      slaBreached: true,
      occurrences: 1
    });
    count++;

    // Inject SAST findings (Semgrep)
    const sast = SAST_LIBRARY[count % SAST_LIBRARY.length];
    const fp3 = `fp-${project.key}-sast-${count}`;
    vulnerabilitiesToInsert.push({
      fingerprint: fp3,
      project: project._id,
      title: sast.title,
      description: `Semgrep static code analysis detected potential flaw in application source code.`,
      severity: sast.severity,
      status: 'Open',
      cvss: sast.cvss,
      cwe: sast.cwe,
      tool: sast.tool,
      scanType: sast.scanType,
      component: sast.component,
      filePath: sast.file,
      line: sast.line,
      remediationGuidance: sast.remediation,
      assignee: devUser._id,
      slaDueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      slaBreached: false,
      occurrences: 2
    });
    count++;

    // Generate additional distributed findings up to 18-20 per project
    for (let i = 0; i < 16; i++) {
      const template = CVE_LIBRARY[(count + i) % CVE_LIBRARY.length];
      const sev = severities[i % severities.length];
      const stat = statuses[(i + count) % statuses.length];
      const isBreached = i === 3; // make a few breached

      vulnerabilitiesToInsert.push({
        fingerprint: `fp-${project.key}-${template.cve}-${count}-${i}`,
        project: project._id,
        title: `${template.title} in [${template.component}]`,
        description: `Automated ${template.scanType} finding discovered during pull-request CI check.`,
        severity: sev,
        status: stat,
        cve: template.cve,
        cwe: template.cwe,
        cvss: sev === 'Critical' ? 9.8 : sev === 'High' ? 7.8 : sev === 'Medium' ? 5.5 : 3.2,
        tool: template.tool,
        scanType: template.scanType,
        component: template.component,
        version: template.version,
        fixedVersion: template.fixedVersion,
        remediationGuidance: template.remediation,
        assignee: i % 2 === 0 ? devUser._id : analystUser._id,
        slaDueDate: isBreached
          ? new Date(Date.now() - 48 * 3600 * 1000)
          : new Date(Date.now() + (i + 1) * 24 * 3600 * 1000),
        slaBreached: isBreached,
        occurrences: 1 + (i % 4)
      });
    }
  }

  const vulnerabilities = await Vulnerability.insertMany(vulnerabilitiesToInsert);
  console.log(`✅ Seeded ${vulnerabilities.length} authentic vulnerabilities.`);

  // Update Project vulnerability counts
  for (const project of projects) {
    const pVulns = vulnerabilities.filter((v) => v.project.toString() === project._id.toString());
    const openVulns = pVulns.filter((v) => ['Open', 'In Progress'].includes(v.status));

    const crit = openVulns.filter((v) => v.severity === 'Critical').length;
    const high = openVulns.filter((v) => v.severity === 'High').length;
    const med = openVulns.filter((v) => v.severity === 'Medium').length;
    const low = openVulns.filter((v) => v.severity === 'Low').length;

    project.vulnerabilityCount = {
      critical: crit,
      high: high,
      medium: med,
      low: low,
      total: crit + high + med + low
    };
    project.riskScore = Math.min(100, crit * 25 + high * 10 + med * 3 + low * 1);
    await project.save();
  }

  // ==========================================
  // 7. Seed 32 Pipeline Runs
  // ==========================================
  console.log('🔄 Seeding 30+ CI/CD Pipeline Runs...');
  const pipelineRunsData = [];
  const gitCommitHashes = [
    'a1b2c3d4e5f6',
    'b2c3d4e5f6a7',
    'c3d4e5f6a7b8',
    'd4e5f6a7b8c9',
    'e5f6a7b8c9d0',
    'f6a7b8c9d0e1'
  ];

  for (let i = 0; i < 32; i++) {
    const project = projects[i % projects.length];
    const isFail = i % 4 === 0; // 25% failure rate for realistic gate visualization
    const commitHash = gitCommitHashes[i % gitCommitHashes.length];
    const runNumber = 1040 + i;

    const criticalCount = isFail ? 2 : 0;
    const highCount = isFail ? 4 : 1;
    const mediumCount = 3 + (i % 5);
    const lowCount = 2 + (i % 3);

    pipelineRunsData.push({
      project: project._id,
      provider: i % 3 === 0 ? 'gitlab-ci' : 'github-actions',
      runId: `run-${runNumber}`,
      runUrl: `https://github.com/org/${project.name}/actions/runs/${runNumber}`,
      branch: i % 5 === 0 ? 'feature/payment-v2' : 'main',
      commit: commitHash,
      triggeredBy: 'dev-automation',
      status: isFail ? 'Failed' : 'Passed',
      gateSummary: {
        passed: !isFail,
        reason: isFail
          ? 'Pipeline Gate Blocked: Zero tolerance policy triggered by 2 Critical vulnerabilities'
          : 'All compliance gates passed. No critical vulnerabilities detected.',
        failedConditions: isFail
          ? [
              'Zero tolerance policy triggered: 2 Critical vulnerabilities found',
              'Exceeded high severity threshold (4 found, max allowed: 3)'
            ]
          : []
      },
      counts: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        info: 1,
        total: criticalCount + highCount + mediumCount + lowCount + 1
      },
      stages: [
        { name: 'Trivy Container Scan', tool: 'trivy', status: isFail ? 'Failed' : 'Passed', findingsCount: criticalCount, durationMs: 2400 },
        { name: 'Gitleaks Secret Scan', tool: 'gitleaks', status: 'Passed', findingsCount: 0, durationMs: 850 },
        { name: 'npm audit SCA Scan', tool: 'npm-audit', status: 'Passed', findingsCount: mediumCount, durationMs: 1200 },
        { name: 'Semgrep SAST Scan', tool: 'semgrep', status: isFail ? 'Warning' : 'Passed', findingsCount: highCount, durationMs: 3100 }
      ],
      durationSeconds: 42,
      createdAt: new Date(Date.now() - (32 - i) * 6 * 3600 * 1000)
    });
  }

  const pipelineRuns = await PipelineRun.insertMany(pipelineRunsData);
  console.log(`✅ Seeded ${pipelineRuns.length} pipeline run executions.`);

  // ==========================================
  // 8. Seed Incidents across Lifecycle Stages
  // ==========================================
  console.log('🚨 Seeding Security Incidents across Lifecycle Stages...');
  const incidentsData = [
    {
      incidentId: 'INC-2024-001',
      title: 'Stripe API Secret Exposed in Payment Service Repo',
      description:
        'Live Stripe private secret key committed in PR #84. Gitleaks scanner caught the secret and triggered an automated pipeline gate block.',
      severity: 'Critical',
      status: 'Contained',
      project: projects[0]._id,
      assignedTo: devUser._id,
      createdBy: analystUser._id,
      timeline: [
        {
          action: 'Incident Created',
          notes: 'Gitleaks scan failed on commit a1b2c3d4e5f6',
          performedBy: analystUser._id,
          performedByName: analystUser.name,
          timestamp: new Date(Date.now() - 18 * 3600 * 1000)
        },
        {
          action: 'Status transitioned: Detected -> Triaged',
          notes: 'Confirmed live production Stripe API secret was committed.',
          performedBy: analystUser._id,
          performedByName: analystUser.name,
          timestamp: new Date(Date.now() - 16 * 3600 * 1000)
        },
        {
          action: 'Status transitioned: Triaged -> Contained',
          notes: 'Stripe token rolled in Stripe Dashboard. AWS Secrets Manager updated.',
          performedBy: devUser._id,
          performedByName: devUser.name,
          timestamp: new Date(Date.now() - 12 * 3600 * 1000)
        }
      ],
      postMortem: {
        rootCause: 'Developer bypassed pre-commit hook while debugging sandbox environment locally.',
        impactSummary: 'Zero unauthorized charges detected in Stripe audit log.',
        preventativeActions: 'Enforced branch protection rule requiring Gitleaks CI check to pass before merge.'
      }
    },
    {
      incidentId: 'INC-2024-002',
      title: 'Zero-Day XZ/Liblzma Backdoor Detected in Base Container Image',
      description:
        'Trivy container scan discovered CVE-2024-3094 in auth-service Docker base image.',
      severity: 'Critical',
      status: 'Resolved',
      project: projects[1]._id,
      assignedTo: devUser._id,
      createdBy: analystUser._id,
      resolvedAt: new Date(Date.now() - 8 * 3600 * 1000),
      timeline: [
        {
          action: 'Incident Created',
          notes: 'Trivy scanner flagged CVE-2024-3094 during nightly container build',
          performedBy: analystUser._id,
          performedByName: analystUser.name,
          timestamp: new Date(Date.now() - 36 * 3600 * 1000)
        },
        {
          action: 'Status transitioned: Detected -> Resolved',
          notes: 'Updated Dockerfile base image to debian:bookworm-slim latest patch',
          performedBy: devUser._id,
          performedByName: devUser.name,
          timestamp: new Date(Date.now() - 8 * 3600 * 1000)
        }
      ],
      postMortem: {
        rootCause: 'Base image was pinned to unstable testing tag.',
        impactSummary: 'No SSH services were exposed to the internet.',
        preventativeActions: 'Restricted base Docker images to verified internal enterprise registry.'
      }
    },
    {
      incidentId: 'INC-2024-003',
      title: 'SQL Injection in Public Search Endpoint',
      description:
        'Semgrep SAST rule discovered string concatenation in search query controller in frontend-portal.',
      severity: 'High',
      status: 'Detected',
      project: projects[2]._id,
      assignedTo: devUser._id,
      createdBy: analystUser._id,
      timeline: [
        {
          action: 'Incident Created',
          notes: 'Semgrep SAST finding logged on pull request',
          performedBy: analystUser._id,
          performedByName: analystUser.name,
          timestamp: new Date(Date.now() - 3 * 3600 * 1000)
        }
      ]
    }
  ];

  await Incident.insertMany(incidentsData);

  // ==========================================
  // 9. Seed Alerts & Notifications
  // ==========================================
  console.log('🔔 Seeding Real-Time Alerts and Notifications...');
  const alertsData = [
    {
      title: 'Critical CVE-2024-3094 detected in payment-service',
      message: 'Trivy discovered critical xz-utils vulnerability in container image.',
      severity: 'Critical',
      category: 'Critical Finding',
      project: projects[0]._id
    },
    {
      title: 'CI/CD Pipeline Gate Failed: auth-service',
      message: 'Build #1040 blocked deployment: 2 Critical findings violate quality gate.',
      severity: 'Critical',
      category: 'Pipeline Gate Failure',
      project: projects[1]._id
    },
    {
      title: 'SLA Breach: AWS Secret Exposure unresolved',
      message: 'Remediation deadline for Gitleaks secret finding has expired.',
      severity: 'High',
      category: 'SLA Breach',
      project: projects[0]._id
    },
    {
      title: 'Semgrep SAST alert in api-gateway',
      message: 'Potential IDOR vulnerability detected in route parameters.',
      severity: 'High',
      category: 'Critical Finding',
      project: projects[3]._id
    }
  ];

  await Alert.insertMany(alertsData);

  const notificationsData = [
    {
      user: devUser._id,
      type: 'VULNERABILITY_ASSIGNED',
      title: 'New Critical Vulnerability Assigned',
      message: 'You have been assigned to remediate CVE-2024-3094 in payment-service.',
      severity: 'Critical',
      link: '/vulnerabilities',
      isRead: false
    },
    {
      user: devUser._id,
      type: 'INCIDENT_ASSIGNED',
      title: 'Assigned to Incident [INC-2024-001]',
      message: 'Urgent: Assigned to contain Stripe Secret exposure.',
      severity: 'Critical',
      link: '/incidents',
      isRead: false
    },
    {
      user: analystUser._id,
      type: 'PIPELINE_GATE_FAILED',
      title: 'CI Pipeline Gate Blocked Deployment',
      message: 'Pipeline run-1040 for auth-service failed automated security gate checks.',
      severity: 'High',
      link: '/pipelines',
      isRead: true
    },
    {
      user: adminUser._id,
      type: 'ROLE_CHANGED',
      title: 'System Access Verification',
      message: 'Your administrator privileges have been revalidated.',
      severity: 'Info',
      link: '/admin/users',
      isRead: true
    }
  ];

  await Notification.insertMany(notificationsData);

  // ==========================================
  // 10. Seed Immutable Audit Logs
  // ==========================================
  console.log('📜 Seeding Immutable Audit Logs...');
  const auditLogsData = [
    {
      action: 'LOGIN_SUCCESS',
      performedBy: adminUser._id,
      performedByName: adminUser.name,
      performedByEmail: adminUser.email,
      role: 'Admin',
      targetResource: 'User',
      targetId: adminUser._id.toString(),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: { method: 'JWT_PASSWORD' },
      createdAt: new Date(Date.now() - 48 * 3600 * 1000)
    },
    {
      action: 'API_KEY_CREATED',
      performedBy: adminUser._id,
      performedByName: adminUser.name,
      performedByEmail: adminUser.email,
      role: 'Admin',
      targetResource: 'ApiKey',
      targetId: 'dso_live_github_actions_prod_001',
      ipAddress: '192.168.1.10',
      details: { name: 'GitHub Actions Main CI Pipeline' },
      createdAt: new Date(Date.now() - 36 * 3600 * 1000)
    },
    {
      action: 'SCAN_INGESTED',
      performedBy: adminUser._id,
      performedByName: 'CI Webhook Runner',
      performedByEmail: 'ci@devsecops.local',
      role: 'Admin',
      targetResource: 'ScanResult',
      ipAddress: '140.82.112.4',
      details: { tool: 'trivy', project: 'payment-service', findings: 18 },
      createdAt: new Date(Date.now() - 24 * 3600 * 1000)
    },
    {
      action: 'SETTINGS_UPDATE',
      performedBy: adminUser._id,
      performedByName: adminUser.name,
      performedByEmail: adminUser.email,
      role: 'Admin',
      targetResource: 'Settings',
      targetId: 'system_config',
      ipAddress: '192.168.1.10',
      details: { updatedSections: ['slaDays', 'gatePolicyDefaults'] },
      beforeState: { slaDays: { critical: 3 } },
      afterState: { slaDays: { critical: 2 } },
      createdAt: new Date(Date.now() - 12 * 3600 * 1000)
    },
    {
      action: 'INCIDENT_CREATED',
      performedBy: analystUser._id,
      performedByName: analystUser.name,
      performedByEmail: analystUser.email,
      role: 'Security Analyst',
      targetResource: 'Incident',
      targetId: 'INC-2024-001',
      ipAddress: '192.168.1.45',
      details: { title: 'Stripe API Secret Exposed in Payment Service Repo' },
      createdAt: new Date(Date.now() - 18 * 3600 * 1000)
    }
  ];

  await AuditLog.insertMany(auditLogsData);

  console.log('🎉 Seeding successfully completed! All 14 collections populated with genuine telemetry.');
  await mongoose.disconnect();
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
