import mongoose from 'mongoose';
import Vulnerability from '../models/Vulnerability.js';
import Project from '../models/Project.js';
import PipelineRun from '../models/PipelineRun.js';
import Framework from '../models/Framework.js';
import Assessment from '../models/Assessment.js';
import Alert from '../models/Alert.js';
import Incident from '../models/Incident.js';

export class DashboardService {
  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      severityAgg,
      statusAgg,
      totalProjects,
      totalPipelines,
      pipelineGateAgg,
      topProjectsAgg,
      frameworks,
      complianceAgg,
      recentAlerts,
      activeIncidentsCount,
      slaBreachesCount,
      trendAgg
    ] = await Promise.all([
      // 1. Severity counts for open/in-progress vulnerabilities
      Vulnerability.aggregate([
        { $match: { status: { $in: ['Open', 'In Progress'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),

      // 2. Vulnerability resolution breakdown
      Vulnerability.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // 3. Project totals
      Project.countDocuments({}),

      // 4. Pipeline runs totals
      PipelineRun.countDocuments({}),

      // 5. CI/CD Gate pass/fail stats
      PipelineRun.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // 6. Top projects by risk / open vulnerabilities
      Vulnerability.aggregate([
        { $match: { status: { $in: ['Open', 'In Progress'] } } },
        {
          $group: {
            _id: '$project',
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] } }
          }
        },
        { $sort: { critical: -1, high: -1, total: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'proj'
          }
        },
        { $unwind: '$proj' },
        {
          $project: {
            projectId: '$_id',
            projectName: '$proj.name',
            projectKey: '$proj.key',
            total: 1,
            critical: 1,
            high: 1
          }
        }
      ]),

      // 7. Framework compliance scores (derived from project assessments)
      Framework.find({}).select('name code').lean(),

      // 8. Assessment roll-up per framework
      Assessment.aggregate([
        {
          $group: {
            _id: '$framework',
            totalControls: { $sum: 1 },
            compliant: { $sum: { $cond: [{ $eq: ['$status', 'Compliant'] }, 1, 0] } },
            partiallyCompliant: {
              $sum: { $cond: [{ $eq: ['$status', 'Partially Compliant'] }, 1, 0] }
            },
            notApplicable: {
              $sum: { $cond: [{ $eq: ['$status', 'Not Applicable'] }, 1, 0] }
            }
          }
        }
      ]),

      // 9. Recent critical & high alerts
      Alert.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('project', 'name key')
        .lean(),

      // 10. Active incidents
      Incident.countDocuments({ status: { $in: ['Detected', 'Triaged', 'Contained'] } }),

      // 11. SLA breaches
      Vulnerability.countDocuments({
        status: { $in: ['Open', 'In Progress'] },
        $or: [{ slaBreached: true }, { slaDueDate: { $lt: new Date() } }]
      }),

      // 11. Trend over last 30 days
      Vulnerability.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format severity numbers
    const severity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    severityAgg.forEach((s) => {
      if (severity[s._id] !== undefined) severity[s._id] = s.count;
    });

    // Format status numbers
    const statusCounts = { Open: 0, 'In Progress': 0, Resolved: 0, 'False Positive': 0 };
    statusAgg.forEach((st) => {
      if (statusCounts[st._id] !== undefined) statusCounts[st._id] = st.count;
    });

    // Format CI/CD Gate
    let passedPipelines = 0;
    let failedPipelines = 0;
    pipelineGateAgg.forEach((g) => {
      if (g._id === 'Passed') passedPipelines = g.count;
      if (g._id === 'Failed') failedPipelines = g.count;
    });

    const totalEvaluated = passedPipelines + failedPipelines;
    const gatePassRate = totalEvaluated > 0 ? Math.round((passedPipelines / totalEvaluated) * 100) : 100;

    // Roll up assessment results per framework. Frameworks without any
    // assessment records report 0 controls and are flagged as `assessed: false`.
    const complianceByFramework = new Map(
      complianceAgg.map((entry) => [entry._id.toString(), entry])
    );

    const complianceScores = frameworks
      .map((framework) => {
        const agg = complianceByFramework.get(framework._id.toString());
        const totalControls = agg?.totalControls || 0;
        const notApplicable = agg?.notApplicable || 0;
        const applicable = Math.max(0, totalControls - notApplicable);
        const compliant = agg?.compliant || 0;
        const partiallyCompliant = agg?.partiallyCompliant || 0;

        return {
          name: framework.name,
          code: framework.code,
          score:
            applicable > 0
              ? Math.round(
                  ((compliant * 100 + partiallyCompliant * 50) / (applicable * 100)) * 100
                )
              : 0,
          totalControls,
          passedControls: compliant,
          partiallyCompliant,
          assessed: totalControls > 0
        };
      })
      .sort((a, b) => b.score - a.score);

    const assessedFrameworks = complianceScores.filter((f) => f.assessed);
    const averageCompliance = assessedFrameworks.length
      ? Math.round(
          assessedFrameworks.reduce((sum, f) => sum + f.score, 0) / assessedFrameworks.length
        )
      : 0;

    return {
      overview: {
        totalProjects,
        totalPipelines,
        totalOpenVulnerabilities: severity.Critical + severity.High + severity.Medium + severity.Low,
        activeIncidentsCount,
        slaBreachesCount,
        gatePassRate,
        passedPipelines,
        failedPipelines
      },
      severityBreakdown: severity,
      statusBreakdown: statusCounts,
      topVulnerableProjects: topProjectsAgg,
      complianceOverview: {
        averageScore: averageCompliance,
        assessedFrameworks: assessedFrameworks.length,
        totalFrameworks: complianceScores.length,
        totalControls: complianceScores.reduce((sum, f) => sum + f.totalControls, 0),
        passedControls: complianceScores.reduce((sum, f) => sum + f.passedControls, 0)
      },
      complianceScores,
      recentAlerts,
      trend: trendAgg.map((t) => ({ date: t._id, count: t.count }))
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
