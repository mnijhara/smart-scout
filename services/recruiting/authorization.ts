export type WorkspaceRole = 'admin' | 'recruiter' | 'hiring_manager';

const PRIVILEGED_ROLES = new Set<WorkspaceRole>(['admin', 'recruiter', 'hiring_manager']);
const MAX_WORKSPACE_ROLE_LENGTH = 64;

/**
 * Enforce role-based access for privileged recruiting mutations.
 * Missing, malformed, unknown, or oversized roles fail closed rather than
 * inheriting access from authentication alone.
 */
export function hasPrivilegedRecruitingRole(role: unknown): role is WorkspaceRole {
  if (typeof role !== 'string') return false;
  const normalized = role.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > MAX_WORKSPACE_ROLE_LENGTH) return false;
  return PRIVILEGED_ROLES.has(normalized as WorkspaceRole);
}

export function requirePrivilegedRecruitingRole(role: unknown): WorkspaceRole {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized.length > MAX_WORKSPACE_ROLE_LENGTH || !hasPrivilegedRecruitingRole(normalized)) {
    throw new Error('Insufficient permissions');
  }
  return normalized as WorkspaceRole;
}
