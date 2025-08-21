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
      const { userEmail, userName } = body;
      
      if (!userEmail || !userName) {
        return NextResponse.json(
          { error: 'userEmail and userName are required for accepting invitations' },
          { status: 400 }
        );
      }

      console.log(`[Workspaces] User ${userId} (${userEmail}) accepting invitation with token ${token}`);
      
      try {
        const result = await convex.mutation(api.workspaceInvitations.acceptInvitation, {
          token,
          userId,
          userEmail,
          userName
        });
        
        return NextResponse.json({
          success: true,
          message: 'Invitation accepted successfully',
          workspaceId: result.workspaceId
        });
      } catch (convexError) {
        console.error('Convex invitation acceptance failed:', convexError);
        return NextResponse.json({ 
          error: 'Failed to accept invitation',
          details: convexError instanceof Error ? convexError.message : 'Database error'
        }, { status: 500 });
      }
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
    let workspace;
    try {
      workspace = await convex.query(api.workspaces.getWorkspace, {
        workspaceId,
        userId
      });

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }
    } catch (convexError) {
      console.error('Convex query failed:', convexError);
      return NextResponse.json({ 
        error: 'Failed to fetch workspace details',
        details: 'Database connection timeout. Please try again.'
      }, { status: 503 });
    }

    // Send invitation using Convex
    let invitation;
    try {
      invitation = await convex.mutation(api.workspaceInvitations.createInvitation, {
        workspaceId,
        invitedBy: userId,
        invitedEmail,
        role
      });
    } catch (convexError) {
      console.error('Convex invitation creation failed:', convexError);
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: convexError instanceof Error ? convexError.message : 'Database connection issue'
      }, { status: 503 });
    }

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
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const workspaceId = searchParams.get('workspaceId');

    // Get invitation by token (public access allowed)
    if (token) {
      console.log(`[Workspaces] Getting invitation details for token ${token} (public access)`);
      
      try {
        const invitation = await convex.query(api.workspaceInvitations.getInvitation, {
          token
        });
        
        return NextResponse.json({
          success: true,
          invitation
        });
      } catch (convexError) {
        console.error('Failed to fetch invitation:', convexError);
        return NextResponse.json({ 
          error: 'Invitation not found or has expired',
          details: convexError instanceof Error ? convexError.message : 'Invalid invitation'
        }, { status: 404 });
      }
    }

    // Get workspace invitations (requires authentication)
    if (workspaceId) {
      const { userId } = await auth(); // Re-check auth for workspace invitations
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

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