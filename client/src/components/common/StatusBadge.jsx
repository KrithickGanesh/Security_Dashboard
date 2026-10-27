import React from 'react';
import { CircleDot, Clock, CheckCircle2, ShieldOff, AlertOctagon } from 'lucide-react';

export const StatusBadge = ({ status = 'Open' }) => {
  const configs = {
    Open: {
      color: 'text-status-open bg-status-open/15 border-status-open/30',
      icon: CircleDot
    },
    'In Progress': {
      color: 'text-status-inProgress bg-status-inProgress/15 border-status-inProgress/30',
      icon: Clock
    },
    Resolved: {
      color: 'text-status-resolved bg-status-resolved/15 border-status-resolved/30',
      icon: CheckCircle2
    },
    'False Positive': {
      color: 'text-status-falsePositive bg-status-falsePositive/15 border-status-falsePositive/30',
      icon: ShieldOff
    },
    'Accepted Risk': {
      color: 'text-status-acceptedRisk bg-status-acceptedRisk/15 border-status-acceptedRisk/30',
      icon: AlertOctagon
    }
  };

  const current = configs[status] || configs.Open;
  const IconComponent = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.color}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
