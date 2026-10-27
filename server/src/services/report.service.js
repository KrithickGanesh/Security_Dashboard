import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { format } from 'date-fns';
import Project from '../models/Project.js';
import Vulnerability from '../models/Vulnerability.js';
import Framework from '../models/Framework.js';
import Control from '../models/Control.js';
import PipelineRun from '../models/PipelineRun.js';

export class ReportService {
  /**
   * Generates a formal Executive Security & Compliance PDF Report streaming to res.
   */
  async streamExecutiveSummaryPdf(res) {
    // 1. Gather aggregate metrics
    const [
      totalProjects,
      vulnCounts,
      criticalVulns,
      frameworks,
      recentPipelines,
      slaBreachedCount
    ] = await Promise.all([
      Project.countDocuments({}),
      Vulnerability.aggregate([
        { $match: { status: { $in: ['Open', 'In Progress'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      Vulnerability.find({ severity: 'Critical', status: { $in: ['Open', 'In Progress'] } })
        .populate('project', 'name key')
        .limit(10)
        .lean(),
      Framework.find({}).lean(),
      PipelineRun.find({}).sort({ createdAt: -1 }).limit(10).populate('project', 'name').lean(),
      Vulnerability.countDocuments({
        status: { $in: ['Open', 'In Progress'] },
        $or: [{ slaBreached: true }, { slaDueDate: { $lt: new Date() } }]
      })
    ]);

    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    vulnCounts.forEach((v) => {
      if (counts[v._id] !== undefined) counts[v._id] = v.count;
    });

    const totalOpen = counts.Critical + counts.High + counts.Medium + counts.Low;

    // 2. Initialize PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DevSecOps_Executive_Report_${format(new Date(), 'yyyyMMdd')}.pdf"`
    );

    doc.pipe(res);

    // --- Header Section ---
    doc
      .fillColor('#0A1120')
      .rect(0, 0, doc.page.width, 95)
      .fill();

    doc
      .fontSize(18)
      .fillColor('#00E5FF')
      .font('Helvetica-Bold')
      .text('DevSecOps Security & Compliance Platform', 40, 25);

    doc
      .fontSize(11)
      .fillColor('#FFFFFF')
      .font('Helvetica')
      .text('Executive Security Posture & Vulnerability Audit Report', 40, 48);

    doc
      .fontSize(9)
      .fillColor('#94A3B8')
      .text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')} UTC | Classification: STRICTLY CONFIDENTIAL`, 40, 68);

    doc.moveDown(3);
    doc.y = 115;

    // --- Executive Metrics Summary ---
    doc
      .fontSize(13)
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .text('1. Executive Security Metrics Overview', 40, doc.y);

    doc.moveDown(0.6);

    const boxY = doc.y;
    const boxWidth = 115;
    const boxHeight = 55;

    // Card 1: Total Projects
    doc.rect(40, boxY, boxWidth, boxHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#475569').fontSize(8).font('Helvetica').text('PROJECTS MONITORED', 48, boxY + 10);
    doc.fillColor('#0284C7').fontSize(16).font('Helvetica-Bold').text(`${totalProjects}`, 48, boxY + 25);

    // Card 2: Open Vulnerabilities
    doc.rect(165, boxY, boxWidth, boxHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#475569').fontSize(8).font('Helvetica').text('OPEN FINDINGS', 173, boxY + 10);
    doc.fillColor('#EA580C').fontSize(16).font('Helvetica-Bold').text(`${totalOpen}`, 173, boxY + 25);

    // Card 3: Critical Findings
    doc.rect(290, boxY, boxWidth, boxHeight).fillAndStroke('#FEF2F2', '#FECACA');
    doc.fillColor('#991B1B').fontSize(8).font('Helvetica-Bold').text('CRITICAL / ZERO-DAY', 298, boxY + 10);
    doc.fillColor('#DC2626').fontSize(16).font('Helvetica-Bold').text(`${counts.Critical}`, 298, boxY + 25);

    // Card 4: SLA Breached
    doc.rect(415, boxY, boxWidth, boxHeight).fillAndStroke('#FFFBEB', '#FDE68A');
    doc.fillColor('#92400E').fontSize(8).font('Helvetica').text('SLA BREACHES', 423, boxY + 10);
    doc.fillColor('#D97706').fontSize(16).font('Helvetica-Bold').text(`${slaBreachedCount}`, 423, boxY + 25);

    doc.y = boxY + boxHeight + 25;

    // --- Severity Breakdown Bar ---
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .text('2. Vulnerabilities Breakdown by Severity', 40, doc.y);

    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#334155')
      .text(`- Critical Findings: ${counts.Critical}  (Immediate remediation required within 48h SLA)`)
      .text(`- High Findings: ${counts.High}  (Remediation required within 7-day SLA)`)
      .text(`- Medium Findings: ${counts.Medium}  (Remediation required within 30-day SLA)`)
      .text(`- Low Findings: ${counts.Low}  (Remediation required within 90-day SLA)`);

    doc.moveDown(1.5);

    // --- Compliance Framework Scores ---
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .text('3. Compliance Framework Adherence Breakdown', 40, doc.y);

    doc.moveDown(0.6);

    frameworks.forEach((fw) => {
      const score = Math.round(fw.complianceScore || 0);
      const statusColor = score >= 80 ? '#16A34A' : score >= 60 ? '#D97706' : '#DC2626';

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(`${fw.name} (${fw.code}): `, { continued: true })
        .font('Helvetica')
        .fillColor(statusColor)
        .text(`${score}% Compliant`)
        .fillColor('#64748B')
        .fontSize(8)
        .text(`Controls: ${fw.totalControls || 0} total | Category: ${fw.description || 'Standard'}`, { indent: 12 })
        .moveDown(0.3);
    });

    doc.moveDown(1);

    // --- Critical Findings Table ---
    if (criticalVulns.length > 0) {
      if (doc.y > 600) doc.addPage();

      doc
        .fontSize(12)
        .fillColor('#991B1B')
        .font('Helvetica-Bold')
        .text('4. High Priority Security Findings Requiring Action', 40, doc.y);

      doc.moveDown(0.6);

      criticalVulns.forEach((v, index) => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0F172A')
          .text(`${index + 1}. [CRITICAL] ${v.title.slice(0, 70)}`)
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#475569')
          .text(`Project: ${v.project?.name || 'Global'} | Scanner: ${v.tool} (${v.scanType}) | CVE: ${v.cve || 'N/A'} | Package: ${v.component || 'N/A'}`, { indent: 10 })
          .moveDown(0.4);
      });
    }

    // --- Sign-off footer ---
    doc.y = doc.page.height - 70;
    doc
      .fontSize(8)
      .fillColor('#94A3B8')
      .text('This automated report is cryptographically compiled by DevSecOps Dashboard Pipeline Gate Service.', 40, doc.y, { align: 'center' });

    doc.end();
  }

  /**
   * Export all vulnerabilities to CSV format.
   */
  async exportVulnerabilitiesCsv(queryFilter = {}) {
    const vulns = await Vulnerability.find(queryFilter)
      .populate('project', 'name key')
      .populate('assignee', 'name email')
      .sort({ severity: 1, createdAt: -1 })
      .lean();

    const flatData = vulns.map((v) => ({
      fingerprint: v.fingerprint,
      title: v.title,
      severity: v.severity,
      status: v.status,
      cve: v.cve || '',
      cwe: v.cwe || '',
      cvss: v.cvss || '',
      tool: v.tool,
      scanType: v.scanType,
      project: v.project?.name || '',
      component: v.component || '',
      installedVersion: v.version || '',
      fixedVersion: v.fixedVersion || '',
      filePath: v.filePath || '',
      lineNumber: v.line || '',
      assignedTo: v.assignee?.email || 'Unassigned',
      slaDueDate: v.slaDueDate ? format(new Date(v.slaDueDate), 'yyyy-MM-dd') : '',
      slaBreached: v.slaBreached ? 'YES' : 'NO',
      discoveredAt: format(new Date(v.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    const fields = [
      'fingerprint',
      'title',
      'severity',
      'status',
      'cve',
      'cwe',
      'cvss',
      'tool',
      'scanType',
      'project',
      'component',
      'installedVersion',
      'fixedVersion',
      'filePath',
      'lineNumber',
      'assignedTo',
      'slaDueDate',
      'slaBreached',
      'discoveredAt'
    ];

    const parser = new Parser({ fields });
    return parser.parse(flatData);
  }

  /**
   * Export compliance matrix to CSV.
   */
  async exportComplianceCsv() {
    const controls = await Control.find({})
      .populate('framework', 'name code')
      .populate('mappedVulnerabilities', 'title severity status')
      .lean();

    const flatData = controls.map((c) => ({
      framework: c.framework?.name || '',
      frameworkCode: c.framework?.code || '',
      controlCode: c.code,
      title: c.title,
      category: c.category,
      status: c.status,
      mappedVulnerabilitiesCount: c.mappedVulnerabilities?.length || 0
    }));

    const fields = [
      'framework',
      'frameworkCode',
      'controlCode',
      'title',
      'category',
      'status',
      'mappedVulnerabilitiesCount'
    ];

    const parser = new Parser({ fields });
    return parser.parse(flatData);
  }
}

export const reportService = new ReportService();
export default reportService;
