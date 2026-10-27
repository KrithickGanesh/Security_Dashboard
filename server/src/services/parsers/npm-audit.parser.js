/**
 * npm audit Report Parser
 * Handles npm v7+ (`vulnerabilities` dictionary) and legacy v6 (`advisories`) formats.
 */
export const npmAuditParser = {
  name: 'npm-audit',
  scanType: 'SCA',

  parse: (report) => {
    if (!report || typeof report !== 'object') {
      const error = new Error('Invalid npm audit report: Expected JSON output');
      error.statusCode = 422;
      throw error;
    }

    const findings = [];

    const normalizeSeverity = (sev) => {
      if (!sev) return 'Info';
      const s = String(sev).toLowerCase();
      if (s === 'critical') return 'Critical';
      if (s === 'high') return 'High';
      if (s === 'moderate') return 'Medium';
      if (s === 'low') return 'Low';
      return 'Info';
    };

    // npm v7+ format
    if (report.vulnerabilities && typeof report.vulnerabilities === 'object') {
      Object.entries(report.vulnerabilities).forEach(([pkgName, vuln]) => {
        const severity = normalizeSeverity(vuln.severity);
        const viaList = Array.isArray(vuln.via) ? vuln.via : [];
        const firstVia = viaList.find((v) => typeof v === 'object') || {};

        const cve =
          firstVia.cve ||
          (firstVia.url && firstVia.url.match(/GHSA-[\w-]+/)?.[0]) ||
          `NPM-${pkgName.toUpperCase()}`;

        const title = firstVia.title || `Vulnerable dependency: ${pkgName}`;
        const description = firstVia.url
          ? `Advisory URL: ${firstVia.url}`
          : `Dependency ${pkgName} has an identified ${vuln.severity} vulnerability.`;

        let fixedVersion = 'Not available';
        if (typeof vuln.fixAvailable === 'object' && vuln.fixAvailable.version) {
          fixedVersion = vuln.fixAvailable.version;
        } else if (vuln.fixAvailable === true) {
          fixedVersion = 'Auto-fixable via npm audit fix';
        }

        findings.push({
          title,
          description,
          severity,
          cve,
          cwe: firstVia.cwe || ['CWE-1035'],
          cvss: firstVia.cvss?.score || (severity === 'Critical' ? 9.1 : severity === 'High' ? 7.5 : 5.0),
          tool: 'npm-audit',
          scanType: 'SCA',
          component: pkgName,
          version: vuln.range || 'installed',
          fixedVersion,
          filePath: 'package.json',
          line: 1,
          remediationGuidance:
            vuln.fixAvailable === true
              ? 'Run `npm audit fix` to resolve this dependency issue automatically.'
              : `Upgrade ${pkgName} or its parent dependencies in package.json.`
        });
      });
    } else if (report.advisories && typeof report.advisories === 'object') {
      // Legacy format fallback
      Object.values(report.advisories).forEach((adv) => {
        findings.push({
          title: adv.title || `Advisory in ${adv.module_name}`,
          description: adv.overview || '',
          severity: normalizeSeverity(adv.severity),
          cve: adv.cves?.[0] || `GHSA-${adv.github_advisory_id || adv.id}`,
          cwe: [adv.cwe || 'CWE-1035'],
          cvss: adv.cvss?.score || 6.0,
          tool: 'npm-audit',
          scanType: 'SCA',
          component: adv.module_name,
          version: adv.findings?.[0]?.version || 'unknown',
          fixedVersion: adv.patched_versions || 'None',
          filePath: 'package.json',
          line: 1,
          remediationGuidance: adv.recommendation || 'Upgrade package.'
        });
      });
    }

    return findings;
  }
};

export default npmAuditParser;
