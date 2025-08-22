'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Shield, 
  Eye, 
  Edit,
  Crown,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';

interface InvitationData {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  expiresAt: string;
  status: string;
  workspace: {
    id: string;
    name: string;
    description: string;
  };
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, user } = useAuth();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // We can fetch invitation details without authentication
      // to show invitation info to unauthenticated users
      const response = await fetch(`/api/workspaces/invite?token=${token}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch invitation');
      }

      const data = await response.json();
      setInvitation(data.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !user) return;

    try {
      setAccepting(true);
      setError(null);

      console.log('Accepting invitation with:', {
        token,
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress || invitation.invitedEmail,
        userName: user.fullName || user.firstName || 'User'
      });

      const response = await fetch('/api/workspaces/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId: user.id,
          userEmail: user.emailAddresses[0]?.emailAddress || invitation.invitedEmail,
          userName: user.fullName || user.firstName || 'User'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Invitation acceptance failed:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to accept invitation');
      }

      const data = await response.json();
      console.log('Invitation accepted successfully:', data);
      setSuccess(true);

      // Redirect to workspace after a short delay
      setTimeout(() => {
        router.push(`/dashboard/workspaces?workspace=${data.workspaceId}`);
      }, 2000);

    } catch (err) {
      console.error('Acceptance error:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    fetchInvitation();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-5 h-5 text-red-400" />;
      case 'editor': return <Edit className="w-5 h-5 text-blue-400" />;
      case 'viewer': return <Eye className="w-5 h-5 text-gray-400" />;
      default: return <Users className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full access to manage workspace settings and members';
      case 'editor': return 'Can create and edit projects and documents';
      case 'viewer': return 'Can view and comment on workspace content';
      default: return 'Member access';
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs <= 0) return 'Expired';
    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
    if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
    return 'Less than 1 hour remaining';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden flex items-center justify-center">
        <div className="relative z-10">
          <Loading size="xl" text="Loading invitation..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Background */}
      <div className="h-full w-full absolute inset-0 z-0">
        <div className="w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl">
          {error && !invitation ? (
            <Card className="bg-gray-900/95 border-red-500/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
                <p className="text-gray-300 mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={retryFetch}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard')}
                    variant="ghost"
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : success ? (
            <Card className="bg-gray-900/95 border-green-500/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team!</h1>
                <p className="text-gray-300 mb-2">You've successfully joined <strong>{invitation?.workspace.name}</strong></p>
                <p className="text-gray-400 text-sm mb-6">Redirecting you to the workspace...</p>
                <Loading size="sm" />
              </CardContent>
            </Card>
          ) : invitation ? (
            <Card className="bg-gray-900/95 border-gray-700 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Users className="w-12 h-12 text-purple-400" />
                </div>
                <CardTitle className="text-3xl font-bold text-white mb-2">
                  Workspace Invitation
                </CardTitle>
                <p className="text-gray-300">
                  You've been invited to join a collaborative workspace
                </p>
              </CardHeader>

              <CardContent className="p-8">
                {/* Workspace Info */}
                <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{invitation.workspace.name}</h3>
                  <p className="text-gray-300 mb-4">{invitation.workspace.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(invitation.role)}
                      <span className="text-white font-medium">Your Role:</span>
                      <Badge className={`
                        ${invitation.role === 'admin' ? 'bg-red-600' : 
                          invitation.role === 'editor' ? 'bg-blue-600' : 'bg-gray-600'} 
                        text-white
                      `}>
                        {invitation.role}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeRemaining(invitation.expiresAt)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-2">{getRoleDescription(invitation.role)}</p>
                </div>

                {/* Invitation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Invited Email</h4>
                    <p className="text-gray-300 text-sm">{invitation.invitedEmail}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Invitation Expires</h4>
                    <p className="text-gray-300 text-sm">{new Date(invitation.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Sign in requirement */}
                {!isSignedIn ? (
                  <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-blue-400" />
                      <h4 className="text-blue-200 font-medium">Sign In Required</h4>
                    </div>
                    <p className="text-blue-100 text-sm">
                      You need to sign in or create an account to accept this invitation.
                    </p>
                  </div>
                ) : user?.emailAddresses[0]?.emailAddress !== invitation.invitedEmail ? (
                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <h4 className="text-yellow-200 font-medium">Email Mismatch</h4>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      This invitation was sent to <strong>{invitation.invitedEmail}</strong> but you're signed in as <strong>{user?.emailAddresses[0]?.emailAddress}</strong>.
                      You can still accept the invitation.
                    </p>
                  </div>
                ) : null}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {!isSignedIn ? (
                    <>
                      <Button 
                        onClick={() => router.push('/sign-in')}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        Sign In to Accept
                      </Button>
                      <Button 
                        onClick={() => router.push('/sign-up')}
                        variant="ghost"
                        className="flex-1 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500"
                      >
                        Create Account
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={acceptInvitation}
                        disabled={accepting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {accepting ? (
                          <>
                            <Loading size="sm" className="mr-2" />
                            Accepting...
                          </>
                        ) : (
                          'Accept Invitation'
                        )}
                      </Button>
                      <Button 
                        onClick={() => router.push('/dashboard')}
                        variant="ghost"
                        className="flex-1 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500"
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}