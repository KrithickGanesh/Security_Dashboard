import crypto from 'crypto';
import Project from '../models/Project.js';
import Vulnerability from '../models/Vulnerability.js';
import PipelineRun from '../models/PipelineRun.js';
import ScanResult from '../models/ScanResult.js';
import Alert from '../models/Alert.js';
import { getParser } from './parsers/index.js';
import { calculateSlaDueDate } from '../utils/sla.js';
import logger from '../utils/logger.js';

export class ScanIngestionService {
  /**
   * Calculate project security score (0 - 100) based on all active open findings.
   */
  async recomputeProjectSecurityScore(projectId) {
    const findings = await Vulnerability.aggregate([
      {
        $match: {
          project: projectId,
          status: { $in: ['Open', 'In Progress'] }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    findings.forEach((f) => {
      if (counts[f._id] !== undefined) {
        counts[f._id] = f.count;
      }
    });

    const penalty =
      counts.Critical * 15 +
      counts.High * 5 +
      counts.Medium * 1.5 +
      counts.Low * 0.5;

    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    await Project.findByIdAndUpdate(projectId, {
      securityScore: score,
      lastScanAt: new Date()
    });

    return score;
  }

  /**
   * Process raw scan report from either Webhook or Manual File Upload.
   */
  async processScanReport({
    projectIdentifier,
    tool,
    scanType,
    pipeline = {},
    rawReport,
    autoCreateProject = false,
    ingestionMethod = 'webhook',
    uploadedBy = null
  }) {
    // 1. Resolve Parser
    const parser = getParser(tool);
    const effectiveScanType = scanType || parser.scanType || 'SCA';

    // 2. Parse Normalized Findings
    const parsedFindings = parser.parse(rawReport);

    // 3. Resolve Project
    let project = null;
    if (projectIdentifier) {
      project = await Project.findOne({
        $or: [
          { _id: projectIdentifier.match(/^[0-9a-fA-F]{24}$/) ? projectIdentifier : null },
          { key: projectIdentifier.toUpperCase() },
          { name: new RegExp(`^${projectIdentifier.trim()}$`, 'i') }
        ].filter(Boolean)
      });
    }

    if (!project) {
      if (autoCreateProject) {
        const safeKey = projectIdentifier
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 10)
          .toUpperCase() || 'PROJ';

        project = await Project.create({
          name: projectIdentifier,
          key: safeKey,
          description: `Auto-registered project from CI pipeline (${tool})`,
          criticality: 'Medium'
        });
        logger.info(`Auto-created project: ${project.name} (${project.key})`);
      } else {
        const error = new Error(
          `Project '${projectIdentifier}' was not found. Please register the project before ingesting scans or enable autoCreateProject.`
        );
        error.statusCode = 404;
        throw error;
      }
    }

    // 4. Ingest & Deduplicate Findings
    let newFindingsCount = 0;
    let updatedFindingsCount = 0;
    let reopenedFindingsCount = 0;
    const currentScanFingerprints = new Set();

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      total: parsedFindings.length
    };

    for (const item of parsedFindings) {
      const sevKey = item.severity.toLowerCase();
      if (counts[sevKey] !== undefined) counts[sevKey]++;

      // Fingerprint: sha256(project + tool + (cve || ruleId) + (component || filePath+line))
      const fingerprintRaw = `${project._id}:${tool}:${item.cve || item.title}:${
        item.component || (item.filePath + (item.line || ''))
      }`;
      const fingerprint = crypto.createHash('sha256').update(fingerprintRaw).digest('hex');
      currentScanFingerprints.add(fingerprint);

      const existingVuln = await Vulnerability.findOne({
        fingerprint,
        project: project._id
      });

      if (existingVuln) {
        let isReopened = false;
        if (['Resolved', 'False Positive', 'Accepted Risk'].includes(existingVuln.status)) {
          existingVuln.status = 'Open';
          existingVuln.resolvedAt = null;
          existingVuln.resolvedBy = null;
          existingVuln.resolutionReason = '';
          existingVuln.activityTimeline.push({
            action: 'REOPENED',
            details: `Vulnerability re-detected in latest ${tool} scan`,
            timestamp: new Date()
          });
          isReopened = true;
          reopenedFindingsCount++;
        }

        existingVuln.lastSeen = new Date();
        existingVuln.occurrences += 1;
        existingVuln.version = item.version || existingVuln.version;
        existingVuln.fixedVersion = item.fixedVersion || existingVuln.fixedVersion;

        await existingVuln.save();
        if (!isReopened) updatedFindingsCount++;
      } else {
        // New Finding
        const slaDueDate = calculateSlaDueDate(item.severity);
        await Vulnerability.create({
          fingerprint,
          project: project._id,
          title: item.title,
          description: item.description,
          severity: item.severity,
          status: 'Open',
          cve: item.cve,
          cwe: item.cwe,
          cvss: item.cvss,
          tool,
          scanType: effectiveScanType,
          component: item.component,
          version: item.version,
          fixedVersion: item.fixedVersion,
          filePath: item.filePath,
          line: item.line,
          remediationGuidance: item.remediationGuidance,
          slaDueDate,
          firstSeen: new Date(),
          lastSeen: new Date(),
          occurrences: 1,
          activityTimeline: [
            {
              action: 'DISCOVERED',
              details: `Discovered by ${tool} scan via ${ingestionMethod}`,
              timestamp: new Date()
            }
          ]
        });
        newFindingsCount++;
      }
    }

    // Auto-resolve missing findings if configured
    if (project.autoResolveMissing && currentScanFingerprints.size > 0) {
      const missingVulns = await Vulnerability.find({
        project: project._id,
        tool,
        status: { $in: ['Open', 'In Progress'] },
        fingerprint: { $nin: Array.from(currentScanFingerprints) }
      });

      for (const mv of missingVulns) {
        mv.status = 'Resolved';
        mv.resolvedAt = new Date();
        mv.resolutionReason = 'Auto-resolved: Missing from latest full CI scan';
        mv.activityTimeline.push({
          action: 'AUTO_RESOLVED',
          details: 'Absent from latest scan execution',
          timestamp: new Date()
        });
        await mv.save();
      }
    }

    // 5. Evaluate Pipeline Gate Policy
    const gatePolicy = project.gatePolicy || {
      failOnCritical: true,
      maxHighAllowed: 5,
      maxMediumAllowed: 20
    };

    const failedConditions = [];
    if (gatePolicy.failOnCritical && counts.critical > 0) {
      failedConditions.push(
        `Critical findings detected: ${counts.critical} (Policy: 0 allowed)`
      );
    }
    if (counts.high > (gatePolicy.maxHighAllowed ?? 5)) {
      failedConditions.push(
        `High findings: ${counts.high} (Exceeded limit of ${gatePolicy.maxHighAllowed ?? 5})`
      );
    }

    const gatePassed = failedConditions.length === 0;
    const gateStatus = gatePassed ? 'Passed' : 'Failed';
    const gateReason = gatePassed
      ? 'All security gate thresholds satisfied.'
      : failedConditions.join('; ');

    // 6. Record Pipeline Run
    const pipelineRun = await PipelineRun.create({
      project: project._id,
      provider: pipeline.provider || 'github-actions',
      runId: pipeline.runId || `run-${Date.now()}`,
      runUrl: pipeline.runUrl || '',
      branch: pipeline.branch || 'main',
      commit: pipeline.commit || 'head',
      triggeredBy: pipeline.triggeredBy || (uploadedBy ? 'manual-user' : 'ci-webhook'),
      status: gateStatus,
      gateSummary: {
        passed: gatePassed,
        reason: gateReason,
        failedConditions
      },
      counts,
      stages: [
        {
          name: `${effectiveScanType} Scanning`,
          tool,
          status: gateStatus,
          findingsCount: parsedFindings.length,
          durationMs: 1200
        }
      ],
      durationSeconds: 15,
      completedAt: new Date()
    });

    // 7. Record Scan Result
    const scanResult = await ScanResult.create({
      project: project._id,
      pipelineRun: pipelineRun._id,
      tool,
      scanType: effectiveScanType,
      findingsCount: parsedFindings.length,
      newFindings: newFindingsCount,
      updatedFindings: updatedFindingsCount,
      reopenedFindings: reopenedFindingsCount,
      uploadedBy,
      ingestionMethod,
      rawReportSummary: {
        tool,
        findingsCount: parsedFindings.length,
        gatePassed
      }
    });

    // 8. Recompute Security Score
    const updatedScore = await this.recomputeProjectSecurityScore(project._id);

    // 9. Raise Alert if Gate Failed
    if (!gatePassed) {
      await Alert.create({
        title: `CI/CD Security Gate Failed: ${project.name}`,
        message: `Pipeline run #${pipelineRun.runId} (${pipelineRun.branch}) failed security policy. ${gateReason}`,
        severity: counts.critical > 0 ? 'Critical' : 'High',
        category: 'Pipeline Gate Failure',
        project: project._id,
        pipelineRun: pipelineRun._id
      });
    }

    return {
      project: {
        _id: project._id,
        name: project.name,
        key: project.key,
        securityScore: updatedScore
      },
      pipelineRun,
      scanResult,
      gateResult: {
        passed: gatePassed,
        status: gateStatus,
        reason: gateReason,
        failedConditions
      },
      counts,
      summary: {
        totalParsed: parsedFindings.length,
        newFindings: newFindingsCount,
        updatedFindings: updatedFindingsCount,
        reopenedFindings: reopenedFindingsCount
      }
    };
  }
}

export const scanIngestionService = new ScanIngestionService();
export default scanIngestionService;
