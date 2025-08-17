import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/_generated/api';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      workspaceId, 
      invitedEmail, 
      role,
      token 
    }: {
      workspaceId?: string;
      invitedEmail?: string;
      role?: 'admin' | 'editor' | 'viewer';
      token?: string;
    } = body;

    // Handle invitation acceptance
    if (token) {
      console.log(`[Workspaces] User ${userId} accepting invitation with token ${token}`);
      
      const result = await convex.mutation(api.workspaceInvitations.acceptInvitation, {
        token,
        userId,
        userEmail: '', // Will be filled from user data
        userName: '' // Will be filled from user data
      });
      
      return NextResponse.json({
        success: true,
        message: 'Invitation accepted successfully',
        workspaceId: result.workspaceId
      });
    }

    // Handle sending invitation
    if (!workspaceId || !invitedEmail || !role) {
      return NextResponse.json(
        { error: 'workspaceId, invitedEmail, and role are required for sending invitations' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] User ${userId} inviting ${invitedEmail} to workspace ${workspaceId} as ${role}`);

    // Get workspace details for email
    const workspace = await convex.query(api.workspaces.getWorkspace, {
      workspaceId,
      userId
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Send invitation using Convex
    const invitation = await convex.mutation(api.workspaceInvitations.createInvitation, {
      workspaceId,
      invitedBy: userId,
      invitedEmail,
      role
    });

    // Send email invitation using Web3Forms
    try {
      const emailSent = await EmailService.sendWorkspaceInvitation({
        recipientEmail: invitedEmail,
        recipientName: invitedEmail.split('@')[0], // Use email prefix as name fallback
        senderName: 'Team Member', // In a real app, get actual sender name from user data
        workspaceName: workspace.name,
        workspaceDescription: workspace.description || 'A collaborative workspace for document analysis',
        invitationToken: invitation.token,
        role,
        expiresAt: new Date(invitation.expiresAt).toISOString()
      });

      if (emailSent) {
        console.log(`[Workspaces] Email invitation sent successfully to ${invitedEmail}`);
      } else {
        console.warn(`[Workspaces] Failed to send email invitation to ${invitedEmail}, but invitation created`);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue without failing the invitation creation
    }

    return NextResponse.json({
      success: true,
      invitation,
      message: `Invitation sent to ${invitedEmail}`
    });

  } catch (error) {
    console.error('Workspace invitation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'invitationId is required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] User ${userId} cancelling invitation ${invitationId}`);

    // Cancel invitation using Convex
    const success = await convex.mutation(api.workspaceInvitations.cancelInvitation, {
      invitationId,
      userId
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Invitation cancellation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to cancel invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const workspaceId = searchParams.get('workspaceId');

    // Get invitation by token
    if (token) {
      console.log(`[Workspaces] Getting invitation details for token ${token}`);
      
      const invitation = await convex.query(api.workspaceInvitations.getInvitation, {
        token
      });
      
      return NextResponse.json({
        success: true,
        invitation
      });
    }

    // Get workspace invitations
    if (workspaceId) {
      console.log(`[Workspaces] Getting invitations for workspace ${workspaceId}`);
      
      const invitations = await convex.query(api.workspaceInvitations.getWorkspaceInvitations, {
        workspaceId,
        userId
      });
      
      return NextResponse.json({
        success: true,
        invitations
      });
    }

    return NextResponse.json(
      { error: 'Either token or workspaceId parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Invitation validation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get invitation details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}