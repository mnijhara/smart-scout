export type WorkspaceRole = 'admin' | 'recruiter' | 'hiring_manager';

const PRIVILEGED_ROLES = new Set<WorkspaceRole>(['admin', 'recruiter', 'hiring_manager']);

/**
 * Enforce role-based access for privileged recruiting mutations.
 * Missing, malformed, or unknown roles fail closed rather than inheriting
 * access from authentication alone.
 */
export function hasPrivilegedRecruitingRole(role: unknown): role is WorkspaceRole {
  if (typeof role !== 'string') return false;
  return PRIVILEGED_ROLES.has(role.trim().toLowerCase() as WorkspaceRole);
}

export function requirePrivilegedRecruitingRole(role: unknown): WorkspaceRole {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (!hasPrivilegedRecruitingRole(normalized)) {
    throw new Error('Insufficient permissions');
  }
  return normalized as WorkspaceRole;
}
