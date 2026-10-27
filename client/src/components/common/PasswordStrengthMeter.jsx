import React from 'react';
import { Check, X } from 'lucide-react';

export const PasswordStrengthMeter = ({ password = '' }) => {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special symbol (!@#$...)', met: /[!@#$%^&*(),.?":{}|<>_\-+=~`]/.test(password) }
  ];

  const score = requirements.filter((r) => r.met).length;

  const getStrengthLabel = () => {
    if (score === 0) return { label: 'Empty', color: 'bg-dark-border text-dark-muted' };
    if (score <= 2) return { label: 'Weak', color: 'bg-severity-critical text-white' };
    if (score === 3 || score === 4) return { label: 'Moderate', color: 'bg-severity-medium text-black' };
    return { label: 'Strong', color: 'bg-accent-success text-black' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-dark-muted dark:text-dark-muted light:text-light-muted">
          Password Strength:
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${strength.color}`}>
          {strength.label}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-1.5 h-1.5">
        {[1, 2, 3, 4, 5].map((lvl) => (
          <div
            key={lvl}
            className={`rounded-full transition-all duration-300 ${
              score >= lvl
                ? score <= 2
                  ? 'bg-severity-critical'
                  : score <= 4
                  ? 'bg-severity-medium'
                  : 'bg-accent-success'
                : 'bg-dark-border dark:bg-dark-border light:bg-light-border'
            }`}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 ${
              req.met
                ? 'text-accent-success dark:text-accent-success light:text-accent-success-dark font-medium'
                : 'text-dark-muted dark:text-dark-muted light:text-light-muted'
            }`}
          >
            {req.met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-40" />}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
