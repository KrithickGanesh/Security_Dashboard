/**
 * Trivy Scan Report Parser
 * Expects JSON format produced by `trivy fs --format json` or `trivy image --format json`
 */
export const trivyParser = {
  name: 'trivy',
  scanType: 'SCA',

  parse: (report) => {
    if (!report || typeof report !== 'object') {
      const error = new Error('Invalid Trivy report format: Expected JSON object');
      error.statusCode = 422;
      throw error;
    }

    const results = report.Results || [];
    const findings = [];

    const normalizeSeverity = (sev) => {
      if (!sev) return 'Info';
      const upper = String(sev).toUpperCase();
      if (upper === 'CRITICAL') return 'Critical';
      if (upper === 'HIGH') return 'High';
      if (upper === 'MEDIUM') return 'Medium';
      if (upper === 'LOW') return 'Low';
      return 'Info';
    };

    results.forEach((target) => {
      const targetName = target.Target || '';
      const vulns = target.Vulnerabilities || [];

      vulns.forEach((v) => {
        const cve = v.VulnerabilityID || 'TRIVY-UNKNOWN';
        const component = v.PkgName || targetName || 'unknown-package';
        const severity = normalizeSeverity(v.Severity);
        const title = v.Title || `${cve} in ${component}`;
        const description = v.Description || '';
        const version = v.InstalledVersion || '';
        const fixedVersion = v.FixedVersion || 'None specified';
        const cwe = v.CweIDs || [];

        let cvss = null;
        if (v.CVSS) {
          const nvdCvss = v.CVSS.nvd?.V3Score || v.CVSS.redhat?.V3Score;
          if (nvdCvss) cvss = parseFloat(nvdCvss);
        }

        findings.push({
          title,
          description,
          severity,
          cve,
          cwe,
          cvss,
          tool: 'trivy',
          scanType: target.Class === 'os-pkgs' ? 'Container' : 'SCA',
          component,
          version,
          fixedVersion,
          filePath: targetName,
          line: null,
          remediationGuidance: v.FixedVersion
            ? `Upgrade ${component} to version ${v.FixedVersion} or higher.`
            : `Consult upstream advisory: ${v.PrimaryURL || 'https://nvd.nist.gov/vuln/detail/' + cve}`
        });
      });
    });

    return findings;
  }
};

export default trivyParser;
