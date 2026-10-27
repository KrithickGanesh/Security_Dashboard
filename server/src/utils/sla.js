/**
 * Default SLA days by severity (in calendar days).
 */
export const DEFAULT_SLA_DAYS = {
  Critical: 2,
  High: 7,
  Medium: 30,
  Low: 90,
  Info: 180
};

/**
 * Calculate SLA due date based on severity.
 * @param {string} severity - 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
 * @param {object} customSlaDays - optional override from system settings
 * @param {Date} fromDate - calculation base date
 * @returns {Date}
 */
export const calculateSlaDueDate = (severity, customSlaDays = {}, fromDate = new Date()) => {
  const norm = severity ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase() : 'Medium';
  const days = customSlaDays[norm.toLowerCase()] || DEFAULT_SLA_DAYS[norm] || 30;
  const dueDate = new Date(fromDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
};

/**
 * Determine if an SLA has been breached based on due date and status.
 * @param {Date} slaDueDate 
 * @param {string} status 
 * @returns {boolean}
 */
export const isSlaBreached = (slaDueDate, status) => {
  if (!slaDueDate) return false;
  const terminalStatuses = ['Resolved', 'False Positive', 'Accepted Risk'];
  if (terminalStatuses.includes(status)) return false;
  return new Date() > new Date(slaDueDate);
};

export default {
  DEFAULT_SLA_DAYS,
  calculateSlaDueDate,
  isSlaBreached
};
