'use client';

import { useState, useCallback } from 'react';

interface NotificationData {
  workspaceId: string;
  type: 'member_joined' | 'project_created' | 'document_added' | 'workspace_updated' | 'invitation_sent';
  title: string;
  message: string;
  targetName?: string;
  priority?: 'low' | 'medium' | 'high';
}

export function useWorkspaceNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNotification = useCallback(async (data: NotificationData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workspaces/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notification');
      }

      const result = await response.json();
      return result.notification;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Notification creation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convenience methods for common notification types
  const notifyMemberJoined = useCallback((workspaceId: string, memberName: string) => {
    return createNotification({
      workspaceId,
      type: 'member_joined',
      title: 'New member joined',
      message: `${memberName} has joined the workspace`,
      targetName: memberName,
      priority: 'medium'
    });
  }, [createNotification]);

  const notifyProjectCreated = useCallback((workspaceId: string, projectName: string, creatorName: string) => {
    return createNotification({
      workspaceId,
      type: 'project_created',
      title: 'New project created',
      message: `${creatorName} created a new project: ${projectName}`,
      targetName: projectName,
      priority: 'medium'
    });
  }, [createNotification]);

  const notifyDocumentAdded = useCallback((workspaceId: string, documentName: string, projectName: string, uploaderName: string) => {
    return createNotification({
      workspaceId,
      type: 'document_added',
      title: 'Document added',
      message: `${uploaderName} added ${documentName} to ${projectName}`,
      targetName: documentName,
      priority: 'low'
    });
  }, [createNotification]);

  const notifyWorkspaceUpdated = useCallback((workspaceId: string, changes: string, updaterName: string) => {
    return createNotification({
      workspaceId,
      type: 'workspace_updated',
      title: 'Workspace updated',
      message: `${updaterName} updated workspace settings: ${changes}`,
      priority: 'low'
    });
  }, [createNotification]);

  const notifyInvitationSent = useCallback((workspaceId: string, invitedEmail: string, role: string, inviterName: string) => {
    return createNotification({
      workspaceId,
      type: 'invitation_sent',
      title: 'Member invited',
      message: `${inviterName} invited ${invitedEmail} as ${role}`,
      targetName: invitedEmail,
      priority: 'medium'
    });
  }, [createNotification]);

  return {
    createNotification,
    notifyMemberJoined,
    notifyProjectCreated,
    notifyDocumentAdded,
    notifyWorkspaceUpdated,
    notifyInvitationSent,
    loading,
    error
  };
}