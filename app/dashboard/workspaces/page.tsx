'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Settings, 
  FolderOpen, 
  Activity, 
  Crown,
  Shield,
  Edit,
  Eye,
  Clock,
  FileText,
  TrendingUp,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loading } from '@/components/ui/loading';
import Navbar from '@/components/navbar';

// Import modals and components
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import CreateProjectModal from '@/components/workspace/CreateProjectModal';
import WorkspaceSettingsModal from '@/components/workspace/WorkspaceSettingsModal';
import ProjectManagementModal from '@/components/workspace/ProjectManagementModal';
import WorkspaceNotifications from '@/components/workspace/WorkspaceNotifications';

// Import hooks
import { useWorkspaceNotifications } from '@/hooks/useWorkspaceNotifications';

interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  stats: {
    totalDocuments: number;
    totalProjects: number;
    activeMembers: number;
    storageUsedMB: number;
    lastActivity: string;
  };
}

interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  collaboratorCount: number;
  status: 'active' | 'completed' | 'archived';
  tags: string[];
  metadata: {
    documentCount: number;
    totalWordCount: number;
    analysisProgress: number;
  };
}

interface WorkspaceActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetName?: string;
  description: string;
  timestamp: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | null>(null);
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Notification hooks
  const { 
    notifyProjectCreated, 
    notifyWorkspaceUpdated, 
    notifyInvitationSent 
  } = useWorkspaceNotifications();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workspaces');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces || []);

      // Auto-select first workspace if available
      if (data.workspaces && data.workspaces.length > 0) {
        selectWorkspace(data.workspaces[0]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setActiveTab('overview');
    
    // Fetch workspace details
    await Promise.all([
      fetchProjects(workspace.id),
      fetchActivity(workspace.id)
    ]);
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/projects?workspaceId=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchActivity = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/activity?workspaceId=${workspaceId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-400" />;
      case 'editor': return <Edit className="w-4 h-4 text-blue-400" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-400" />;
      default: return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-600',
      completed: 'bg-blue-600',
      archived: 'bg-gray-600'
    };
    
    return (
      <Badge className={`${variants[status as keyof typeof variants]} text-white`}>
        {status}
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  // Handler functions for modals and actions
  const handleWorkspaceCreated = (workspace: any) => {
    setWorkspaces(prev => [workspace, ...prev]);
    setError(null);
  };

  const handleWorkspaceUpdated = async (updatedWorkspace: any) => {
    setWorkspaces(prev => 
      prev.map(w => w.id === updatedWorkspace.id ? updatedWorkspace : w)
    );
    if (selectedWorkspace?.id === updatedWorkspace.id) {
      setSelectedWorkspace(updatedWorkspace);
    }
    
    // Send notification for workspace update
    try {
      await notifyWorkspaceUpdated(
        updatedWorkspace.id,
        'General settings',
        'You' // In a real app, get actual user name
      );
    } catch (error) {
      console.error('Failed to send workspace update notification:', error);
    }
  };

  const handleProjectCreated = async (project: any) => {
    setProjects(prev => [project, ...prev]);
    setError(null);
    // Refresh workspace stats
    if (selectedWorkspace) {
      fetchWorkspaces();
      
      // Send notification for project creation
      try {
        await notifyProjectCreated(
          selectedWorkspace.id,
          project.name,
          'You' // In a real app, get actual user name
        );
      } catch (error) {
        console.error('Failed to send project creation notification:', error);
      }
    }
  };

  const handleProjectUpdated = (updatedProject: any) => {
    setProjects(prev => 
      prev.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
    setSelectedProject(updatedProject);
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setShowProjectModal(false);
    setSelectedProject(null);
    // Refresh workspace stats
    if (selectedWorkspace) {
      fetchWorkspaces();
    }
  };

  const handleOpenProject = (project: WorkspaceProject) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleInviteMembers = () => {
    setShowSettingsModal(true);
    // Set active tab to invitations when modal opens
    setTimeout(() => {
      setActiveTab('invitations');
    }, 100);
  };

  // Filter functions
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProjectStatusCount = (status: string) => {
    if (status === 'all') return projects.length;
    return projects.filter(p => p.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
        <div className="relative z-10 container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loading size="xl" text="Loading workspaces..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Navbar */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Background */}
      <div className="h-full w-full absolute inset-0 z-0">
        <div className="w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Collaborative Workspaces</h1>
            <p className="text-gray-300">
              Work together on document analysis projects with your team
            </p>
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            {selectedWorkspace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs min-w-[1.5rem] h-6 flex items-center justify-center rounded-full">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Badge>
                )}
              </Button>
            )}
            
            <Button
              onClick={() => setShowCreateWorkspaceModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-500/50">
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Workspace Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Your Workspaces
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {selectedWorkspace && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettingsModal(true)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workspaces
                    .filter(workspace => 
                      workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      workspace.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((workspace) => (
                    <div
                      key={workspace.id}
                      onClick={() => selectWorkspace(workspace)}
                      className={`group p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedWorkspace?.id === workspace.id
                          ? 'bg-purple-600/20 border-purple-500/50'
                          : 'bg-gray-800/30 hover:bg-gray-700/40 border-transparent hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white text-sm truncate">{workspace.name}</h4>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(workspace.role)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkspace(workspace);
                              setShowSettingsModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-1"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{workspace.memberCount} members</span>
                        <span>•</span>
                        <span>{workspace.projectCount} projects</span>
                      </div>
                      {workspace.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{workspace.description}</p>
                      )}
                    </div>
                  ))}
                  
                  {workspaces.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm mb-4">No workspaces yet</p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateWorkspaceModal(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Create First Workspace
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedWorkspace ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border-gray-700">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                    Projects ({projects.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Workspace Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                        <CardContent className="p-4 text-center">
                          <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">{selectedWorkspace.stats?.totalDocuments || 0}</div>
                          <div className="text-sm text-gray-400">Documents</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                        <CardContent className="p-4 text-center">
                          <FolderOpen className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">{selectedWorkspace.stats?.totalProjects || 0}</div>
                          <div className="text-sm text-gray-400">Projects</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                        <CardContent className="p-4 text-center">
                          <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">{selectedWorkspace.stats?.activeMembers || 0}</div>
                          <div className="text-sm text-gray-400">Members</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                        <CardContent className="p-4 text-center">
                          <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-white">{selectedWorkspace.stats?.storageUsedMB || 0}MB</div>
                          <div className="text-sm text-gray-400">Storage</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Workspace Info */}
                    <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                      <CardHeader>
                        <CardTitle className="text-white">{selectedWorkspace.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {selectedWorkspace.description || 'No description provided'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(selectedWorkspace.role)}
                            <span className="capitalize">{selectedWorkspace.role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Last active {selectedWorkspace.stats?.lastActivity ? formatTimeAgo(selectedWorkspace.stats.lastActivity) : 'Never'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Projects</h3>
                        <p className="text-gray-400 text-sm">
                          {getProjectStatusCount('all')} total projects
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search projects..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none text-sm w-full sm:w-64"
                            />
                          </div>
                          
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none text-sm"
                          >
                            <option value="all">All ({getProjectStatusCount('all')})</option>
                            <option value="active">Active ({getProjectStatusCount('active')})</option>
                            <option value="completed">Completed ({getProjectStatusCount('completed')})</option>
                            <option value="archived">Archived ({getProjectStatusCount('archived')})</option>
                          </select>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => setShowCreateProjectModal(true)}
                          className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          New Project
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProjects.map((project) => (
                        <Card 
                          key={project.id} 
                          className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism group cursor-pointer transition-all hover:border-gray-600 hover:scale-105"
                          onClick={() => handleOpenProject(project)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-white text-base truncate">{project.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(project.status)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProject(project);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-1"
                                >
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription className="text-gray-400 line-clamp-2">
                              {project.description || 'No description'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Documents:</span>
                                <span className="text-white">{project.documentCount}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Collaborators:</span>
                                <span className="text-white">{project.collaboratorCount}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Progress:</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                    <div 
                                      className="bg-purple-500 h-1.5 rounded-full transition-all" 
                                      style={{ width: `${project.metadata.analysisProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-white text-xs">{project.metadata.analysisProgress}%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Updated:</span>
                                <span className="text-white">{formatTimeAgo(project.updatedAt)}</span>
                              </div>
                            </div>
                            
                            {project.tags && project.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {project.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="bg-purple-600/10 text-purple-300 border border-purple-500/20 text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {project.tags.length > 3 && (
                                  <Badge variant="secondary" className="bg-gray-600/20 text-gray-400 text-xs">
                                    +{project.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}

                      {filteredProjects.length === 0 && projects.length > 0 && (
                        <div className="col-span-2 text-center py-8">
                          <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-400 text-sm mb-2">No projects match your search</p>
                          <p className="text-gray-500 text-xs">Try adjusting your search terms or filters</p>
                        </div>
                      )}

                      {projects.length === 0 && (
                        <div className="col-span-2 text-center py-8">
                          <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-400 text-sm mb-4">No projects in this workspace</p>
                          <Button 
                            size="sm" 
                            onClick={() => setShowCreateProjectModal(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Project
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Activity</CardTitle>
                      <CardDescription className="text-gray-400">
                        Latest actions in this workspace
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {activity.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30">
                            <Activity className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-white text-sm">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span>{item.userName || 'Unknown user'}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(item.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {activity.length === 0 && (
                          <div className="text-center py-8">
                            <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400 text-sm">No recent activity</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                      <CardHeader>
                        <CardTitle className="text-white">Quick Actions</CardTitle>
                        <CardDescription className="text-gray-400">
                          Common workspace management tasks
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button 
                          onClick={handleInviteMembers}
                          className="w-full bg-purple-600 hover:bg-purple-700 justify-start"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite Members
                        </Button>
                        
                        <Button 
                          onClick={() => setShowCreateProjectModal(true)}
                          variant="ghost"
                          className="w-full text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 justify-start"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Project
                        </Button>

                        <Button 
                          onClick={() => setShowSettingsModal(true)}
                          variant="ghost"
                          className="w-full text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 justify-start"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Advanced Settings
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                      <CardHeader>
                        <CardTitle className="text-white">Workspace Info</CardTitle>
                        <CardDescription className="text-gray-400">
                          Quick overview of workspace status
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-gray-700">
                          <span className="text-gray-400">Workspace ID</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded">
                              {selectedWorkspace.id.slice(-8)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedWorkspace.id);
                              }}
                              className="text-gray-400 hover:text-white p-1"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-700">
                          <span className="text-gray-400">Your Role</span>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(selectedWorkspace.role)}
                            <span className="text-white capitalize">{selectedWorkspace.role}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-700">
                          <span className="text-gray-400">Created</span>
                          <span className="text-white">
                            {new Date(selectedWorkspace.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-400">Last Activity</span>
                          <span className="text-white">
                            {selectedWorkspace.stats?.lastActivity ? formatTimeAgo(selectedWorkspace.stats.lastActivity) : 'Never'}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:bg-blue-900/20 mt-4"
                          onClick={() => {
                            const workspaceUrl = `${window.location.origin}/dashboard/workspaces?workspace=${selectedWorkspace.id}`;
                            navigator.clipboard.writeText(workspaceUrl);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Copy Workspace Link
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Select a Workspace</h3>
                  <p className="text-gray-400 mb-6">
                    Choose a workspace from the sidebar to view its details, or create your first workspace to get started
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button 
                      onClick={() => setShowCreateWorkspaceModal(true)} 
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Workspace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {selectedWorkspace && (
        <>
          <CreateProjectModal
            isOpen={showCreateProjectModal}
            onClose={() => setShowCreateProjectModal(false)}
            workspaceId={selectedWorkspace.id}
            onProjectCreated={handleProjectCreated}
          />

          <WorkspaceSettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            workspace={selectedWorkspace}
            onWorkspaceUpdated={handleWorkspaceUpdated}
            userRole={selectedWorkspace.role}
          />
        </>
      )}

      {selectedProject && (
        <ProjectManagementModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          project={selectedProject}
          workspaceId={selectedWorkspace?.id || ''}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
          userRole={selectedWorkspace?.role || 'viewer'}
        />
      )}

      {/* Notifications */}
      {selectedWorkspace && (
        <WorkspaceNotifications
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          workspaceId={selectedWorkspace.id}
          userId="current-user-id" // In a real app, get from auth
        />
      )}
    </div>
  );
}