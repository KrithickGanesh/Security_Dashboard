import trivyParser from './trivy.parser.js';
import gitleaksParser from './gitleaks.parser.js';
import npmAuditParser from './npm-audit.parser.js';
import semgrepParser from './semgrep.parser.js';

export const parserRegistry = {
  trivy: trivyParser,
  gitleaks: gitleaksParser,
  'npm-audit': npmAuditParser,
  semgrep: semgrepParser
};

/**
 * Retrieve parser instance by tool name.
 * @param {string} tool - Tool identifier (e.g. 'trivy', 'gitleaks', 'npm-audit', 'semgrep')
 * @returns {object} Parser instance
 */
export const getParser = (tool) => {
  if (!tool) {
    const error = new Error('No scan tool specified.');
    error.statusCode = 400;
    throw error;
  }

  const normalized = tool.toLowerCase().trim();
  const parser = parserRegistry[normalized];

  if (!parser) {
    const error = new Error(
      `Unsupported tool parser: '${tool}'. Available parsers: ${Object.keys(parserRegistry).join(', ')}`
    );
    error.statusCode = 422;
    throw error;
  }

  return parser;
};

/**
 * Register a new parser into the registry.
 */
export const registerParser = (name, parser) => {
  parserRegistry[name.toLowerCase()] = parser;
};

export default {
  parserRegistry,
  getParser,
  registerParser
};
