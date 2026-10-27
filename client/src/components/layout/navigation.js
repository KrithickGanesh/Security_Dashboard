import {
  LayoutDashboard,
  FolderGit2,
  Bug,
  GitBranch,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  ScrollText,
  KeyRound,
  Sliders,
  Bell,
  UserCircle2
} from 'lucide-react';

/**
 * Single source of truth for sidebar navigation and the command palette.
 * `roles` mirrors the client-side route guards in App.jsx.
 */
export const NAV_SECTIONS = [
  {
    group: 'Overview',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        description: 'Posture, KPIs and live telemetry',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      }
    ]
  },
  {
    group: 'Security Operations',
    items: [
      {
        name: 'Projects',
        path: '/projects',
        icon: FolderGit2,
        description: 'Repositories and service ownership',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      },
      {
        name: 'Vulnerabilities',
        path: '/vulnerabilities',
        icon: Bug,
        description: 'Findings, triage and remediation',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      },
      {
        name: 'Pipelines',
        path: '/pipelines',
        icon: GitBranch,
        description: 'CI gate runs and scan results',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      },
      {
        name: 'Scan Import',
        path: '/scans/import',
        icon: UploadCloud,
        description: 'Upload scanner reports',
        roles: ['Admin', 'Security Analyst']
      }
    ]
  },
  {
    group: 'Governance',
    items: [
      {
        name: 'Compliance',
        path: '/compliance',
        icon: FileCheck2,
        description: 'Framework controls and assessments',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      },
      {
        name: 'Incidents',
        path: '/incidents',
        icon: AlertTriangle,
        description: 'Response stages and post-mortems',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      },
      {
        name: 'Reports',
        path: '/reports',
        icon: FileSpreadsheet,
        description: 'Export executive and audit reports',
        roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
      }
    ]
  },
  {
    group: 'Administration',
    items: [
      {
        name: 'Users',
        path: '/admin/users',
        icon: Users,
        description: 'Accounts, roles and access',
        roles: ['Admin']
      },
      {
        name: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: ScrollText,
        description: 'Immutable activity trail',
        roles: ['Admin', 'Auditor']
      },
      {
        name: 'API Keys',
        path: '/admin/api-keys',
        icon: KeyRound,
        description: 'CI/CD ingestion credentials',
        roles: ['Admin']
      },
      {
        name: 'Settings',
        path: '/admin/settings',
        icon: Sliders,
        description: 'Platform and notification policy',
        roles: ['Admin']
      }
    ]
  }
];

export const SECONDARY_ITEMS = [
  {
    name: 'Notifications',
    path: '/notifications',
    icon: Bell,
    description: 'All alerts and inbox',
    roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
  },
  {
    name: 'My Profile',
    path: '/profile',
    icon: UserCircle2,
    description: 'Account, password and preferences',
    roles: ['Admin', 'Security Analyst', 'Developer', 'Auditor']
  }
];

export const getNavigationForRole = (role = 'Developer') =>
  NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role))
  })).filter((section) => section.items.length > 0);

export const getSearchableItemsForRole = (role = 'Developer') => [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...SECONDARY_ITEMS
].filter((item) => item.roles.includes(role));

/** Human-readable title for the topbar breadcrumb. */
export const getPageMeta = (pathname = '/') => {
  const segments = pathname.split('/').filter(Boolean);
  const [first, second] = segments;

  if (!first) return { title: 'Dashboard', section: 'Overview' };

  if (first === 'admin') {
    const match = NAV_SECTIONS[3].items.find((item) => item.path === `/${first}/${second}`);
    return {
      title: match?.name || 'Administration',
      section: 'Administration'
    };
  }

  if (first === 'scans') {
    return { title: 'Scan Import', section: 'Security Operations' };
  }

  const match = [...NAV_SECTIONS, ...SECONDARY_ITEMS.map((i) => ({ items: [i] }))]
    .flatMap((section) => section.items)
    .find((item) => item.path === `/${first}`);

  if (match?.path === '/notifications' || match?.path === '/profile') {
    return { title: match.name, section: 'Account' };
  }

  const section = NAV_SECTIONS.find((s) => s.items.some((item) => item.path === `/${first}`));

  return {
    title: match?.name || first.charAt(0).toUpperCase() + first.slice(1),
    section: section?.group || 'Overview'
  };
};
