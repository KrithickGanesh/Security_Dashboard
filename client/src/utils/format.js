/**
 * Render a user's display label without duplicating the role.
 *
 * Seeded users carry the role inside their stored name (e.g.
 * "Alex Rivera (Developer)"), so blindly appending `(role)` produces
 * "Alex Rivera (Developer) (Developer)".
 */
export const formatUserLabel = (user, { fallback = 'Unassigned', includeRole = true } = {}) => {
  if (!user?.name) return fallback;
  const role = user.role || '';
  if (!includeRole || !role || user.name.includes(role)) return user.name;
  return `${user.name} (${role})`;
};

export default formatUserLabel;
