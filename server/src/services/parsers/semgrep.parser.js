/**
 * Semgrep SAST Report Parser
 * Expects JSON output produced by `semgrep scan --json`
 */
export const semgrepParser = {
  name: 'semgrep',
  scanType: 'SAST',

  parse: (report) => {
    if (!report || typeof report !== 'object') {
      const error = new Error('Invalid Semgrep report: Expected JSON format');
      error.statusCode = 422;
      throw error;
    }

    const results = report.results || [];

    const normalizeSeverity = (sev) => {
      if (!sev) return 'Medium';
      const s = String(sev).toUpperCase();
      if (s === 'ERROR') return 'High';
      if (s === 'WARNING') return 'Medium';
      if (s === 'INFO') return 'Low';
      return 'Medium';
    };

    return results.map((res) => {
      const ruleId = res.check_id || 'semgrep-rule';
      const filePath = res.path || 'unknown-path';
      const line = res.start?.line || 1;
      const extra = res.extra || {};
      const severity = normalizeSeverity(extra.severity);
      const message = extra.message || `Semgrep finding triggered by rule ${ruleId}`;
      const metadata = extra.metadata || {};

      let cwe = [];
      if (metadata.cwe) {
        cwe = Array.isArray(metadata.cwe) ? metadata.cwe : [metadata.cwe];
      }

      return {
        title: `SAST: ${metadata.shortlink || ruleId.split('.').pop() || ruleId}`,
        description: message,
        severity,
        cve: ruleId.toUpperCase(),
        cwe,
        cvss: severity === 'High' ? 7.8 : severity === 'Medium' ? 5.5 : 3.0,
        tool: 'semgrep',
        scanType: 'SAST',
        component: filePath.split('/').pop() || filePath,
        version: 'source-code',
        fixedVersion: 'Code Refactoring Required',
        filePath,
        line,
        remediationGuidance:
          metadata.fix ||
          `Inspect ${filePath} line ${line} and sanitize tainted inputs per secure coding guidelines.`
      };
    });
  }
};

export default semgrepParser;
