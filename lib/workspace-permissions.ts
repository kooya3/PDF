/**
 * Workspace permissions and access control utilities
 */

export interface WorkspacePermissions {
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canExportData: boolean;
  canAccessSettings: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Get permissions for a workspace role
 */
export function getRolePermissions(role: WorkspaceRole): WorkspacePermissions {
  switch (role) {
    case 'owner':
      return {
        canUploadDocuments: true,
        canDeleteDocuments: true,
        canInviteMembers: true,
        canManageMembers: true,
        canExportData: true,
        canAccessSettings: true,
        canCreateProjects: true,
        canDeleteProjects: true
      };
    case 'admin':
      return {
        canUploadDocuments: true,
        canDeleteDocuments: true,
        canInviteMembers: true,
        canManageMembers: true,
        canExportData: true,
        canAccessSettings: true,
        canCreateProjects: true,
        canDeleteProjects: true
      };
    case 'editor':
      return {
        canUploadDocuments: true,
        canDeleteDocuments: false,
        canInviteMembers: false,
        canManageMembers: false,
        canExportData: true,
        canAccessSettings: false,
        canCreateProjects: true,
        canDeleteProjects: false
      };
    case 'viewer':
      return {
        canUploadDocuments: false,
        canDeleteDocuments: false,
        canInviteMembers: false,
        canManageMembers: false,
        canExportData: true,
        canAccessSettings: false,
        canCreateProjects: false,
        canDeleteProjects: false
      };
    default:
      throw new Error(`Invalid role: ${role}`);
  }
}

/**
 * Check if a user has a specific permission in a workspace
 */
export function hasPermission(
  userRole: WorkspaceRole,
  permission: keyof WorkspacePermissions
): boolean {
  const permissions = getRolePermissions(userRole);
  return permissions[permission];
}

/**
 * Check if a user can perform an action based on their role
 */
export function canPerformAction(
  userRole: WorkspaceRole,
  action: 'upload' | 'delete' | 'invite' | 'manage' | 'export' | 'settings' | 'create_project' | 'delete_project'
): boolean {
  const permissionMap = {
    upload: 'canUploadDocuments',
    delete: 'canDeleteDocuments',
    invite: 'canInviteMembers',
    manage: 'canManageMembers',
    export: 'canExportData',
    settings: 'canAccessSettings',
    create_project: 'canCreateProjects',
    delete_project: 'canDeleteProjects'
  } as const;

  const permission = permissionMap[action];
  return hasPermission(userRole, permission);
}

/**
 * Get workspace role hierarchy levels (higher number = more permissions)
 */
export function getRoleLevel(role: WorkspaceRole): number {
  switch (role) {
    case 'viewer': return 1;
    case 'editor': return 2;
    case 'admin': return 3;
    case 'owner': return 4;
    default: return 0;
  }
}

/**
 * Check if roleA has higher or equal permissions than roleB
 */
export function hasEqualOrHigherRole(roleA: WorkspaceRole, roleB: WorkspaceRole): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

/**
 * Validate workspace settings based on user role
 */
export function canModifySettings(
  userRole: WorkspaceRole,
  settingType: 'basic' | 'permissions' | 'advanced' | 'deletion'
): boolean {
  switch (settingType) {
    case 'basic':
      return hasPermission(userRole, 'canAccessSettings');
    case 'permissions':
      return userRole === 'owner' || userRole === 'admin';
    case 'advanced':
      return userRole === 'owner' || userRole === 'admin';
    case 'deletion':
      return userRole === 'owner';
    default:
      return false;
  }
}

/**
 * Get default workspace settings
 */
export function getDefaultWorkspaceSettings() {
  return {
    isPublic: false,
    allowMemberInvites: true,
    requireApprovalForNewMembers: false,
    maxMembers: 50,
    maxStorageGB: 10,
    enableRealTimeCollaboration: true,
    defaultMemberRole: 'editor' as const,
    allowGuestAccess: false,
    dataRetentionDays: 365
  };
}

/**
 * Validate invitation role against inviter's role
 */
export function canInviteWithRole(
  inviterRole: WorkspaceRole,
  inviteeRole: WorkspaceRole
): boolean {
  // Can't invite someone with equal or higher role
  if (inviterRole === 'owner') {
    return true; // Owner can invite anyone
  }
  if (inviterRole === 'admin') {
    return inviteeRole !== 'owner' && inviteeRole !== 'admin';
  }
  return false; // Editors and viewers can't invite
}

/**
 * Generate workspace access token for API requests
 */
export function generateWorkspaceToken(workspaceId: string, userId: string): string {
  return `ws_${workspaceId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate workspace access token
 */
export function validateWorkspaceToken(token: string): {
  workspaceId: string;
  userId: string;
  timestamp: number;
} | null {
  try {
    const parts = token.split('_');
    if (parts.length < 5 || parts[0] !== 'ws') {
      return null;
    }

    const workspaceId = parts[1];
    const userId = parts[2];
    const timestamp = parseInt(parts[3]);

    // Token expires after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }

    return { workspaceId, userId, timestamp };
  } catch {
    return null;
  }
}