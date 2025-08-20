'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Eye,
  Brain,
  Database,
  Cpu,
  HardDrive,
  Network,
  Timer,
  Target,
  Lightbulb,
  X,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SimpleChart, { SimpleBarChart, ProgressRing } from '@/components/SimpleChart';
import type { AnalyticsMetrics, TimeSeriesData, TrendData, AlertData } from '@/lib/analytics-service';

interface Props {
  userId: string;
}

export default function AnalyticsDashboard({ userId }: Props) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<Record<string, TimeSeriesData[]>>({});
  const [activeTab, setActiveTab] = useState('overview');
  
  const { toast } = useToast();

  // Load analytics data
  const loadAnalytics = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      // Load main metrics
      const metricsResponse = await fetch(`/api/analytics?type=metrics&timeRange=${timeRange}`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      // Load alerts
      const alertsResponse = await fetch('/api/analytics?type=alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data);
      }

      // Load time series data for charts
      const timeSeriesMetrics = ['documents', 'processing', 'insights', 'performance'];
      const timeSeriesPromises = timeSeriesMetrics.map(async (metric) => {
        const response = await fetch(`/api/analytics?type=timeseries&metric=${metric}&points=24&timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          return { metric, data: data.data };
        }
        return { metric, data: [] };
      });

      const timeSeriesResults = await Promise.all(timeSeriesPromises);
      const newTimeSeriesData: Record<string, TimeSeriesData[]> = {};
      timeSeriesResults.forEach(({ metric, data }) => {
        newTimeSeriesData[metric] = data;
      });
      setTimeSeriesData(newTimeSeriesData);

    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast({
        variant: "destructive",
        title: "Failed to load analytics",
        description: "There was an error loading the analytics dashboard.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalytics(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAnalytics]);

  // Dismiss alert
  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_alert', alertId })
      });

      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        toast({
          title: "Alert dismissed",
          description: "The alert has been removed from your dashboard.",
        });
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  // Export report
  const exportReport = async () => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'export_report', 
          exportOptions: { timeRange, format: 'json' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Create download
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Report exported",
          description: "Your analytics report has been downloaded.",
        });
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "There was an error exporting the report.",
      });
    }
  };

  // Trend indicator component
  const TrendIndicator = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value: number }) => {
    if (trend === 'stable') return <Minus className="w-4 h-4 text-gray-400" />;
    if (trend === 'up') return <ArrowUp className="w-4 h-4 text-green-400" />;
    return <ArrowDown className="w-4 h-4 text-red-400" />;
  };

  // Format number with appropriate suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format percentage
  const formatPercent = (num: number): string => `${num.toFixed(1)}%`;

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white">Failed to load analytics data</p>
          <Button onClick={() => loadAnalytics()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          <Button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={exportReport}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.id}
              className={`${
                alert.type === 'error' ? 'bg-red-900/20 border-red-500/50' :
                alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/50' :
                alert.type === 'success' ? 'bg-green-900/20 border-green-500/50' :
                'bg-blue-900/20 border-blue-500/50'
              } backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {alert.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />}
                  {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />}
                  {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />}
                  {alert.type === 'info' && <Eye className="w-5 h-5 text-blue-400 mt-0.5" />}
                  <div>
                    <AlertDescription className={`${
                      alert.type === 'error' ? 'text-red-200' :
                      alert.type === 'warning' ? 'text-yellow-200' :
                      alert.type === 'success' ? 'text-green-200' :
                      'text-blue-200'
                    }`}>
                      <div className="font-medium mb-1">{alert.title}</div>
                      <div className="text-sm opacity-90">{alert.message}</div>
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  onClick={() => dismissAlert(alert.id)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Analytics Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border-gray-700 backdrop-blur-sm rounded-xl p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">{formatNumber(metrics.documents.totalDocuments)}</div>
                    <div className="text-sm text-blue-300">Total Documents</div>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <TrendIndicator trend="up" value={5.2} />
                  <span className="text-green-400">+{metrics.documents.documentsProcessedToday} today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">{formatNumber(metrics.insights.totalInsights)}</div>
                    <div className="text-sm text-green-300">AI Insights</div>
                  </div>
                  <Brain className="w-8 h-8 text-green-400" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <TrendIndicator trend="up" value={8.1} />
                  <span className="text-green-400">+{metrics.insights.insightsToday} today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">{metrics.processing.activeJobs}</div>
                    <div className="text-sm text-purple-300">Active Jobs</div>
                  </div>
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <TrendIndicator trend="stable" value={0} />
                  <span className="text-gray-400">{metrics.processing.queueDepth} in queue</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 border-orange-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">{formatPercent(metrics.system.systemUptime)}</div>
                    <div className="text-sm text-orange-300">System Health</div>
                  </div>
                  <Activity className="w-8 h-8 text-orange-400" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <TrendIndicator trend="up" value={0.2} />
                  <span className="text-green-400">{formatPercent(100 - metrics.system.errorRate)} success rate</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <ProgressRing 
                      value={metrics.system.cpuUsage} 
                      size={60} 
                      color="#3b82f6"
                      className="mx-auto mb-2"
                    />
                    <div className="text-xs text-gray-300">CPU</div>
                  </div>
                  <div className="text-center">
                    <ProgressRing 
                      value={metrics.system.memoryUsage} 
                      size={60} 
                      color="#10b981"
                      className="mx-auto mb-2"
                    />
                    <div className="text-xs text-gray-300">Memory</div>
                  </div>
                  <div className="text-center">
                    <ProgressRing 
                      value={metrics.system.storageUsage} 
                      size={60} 
                      color="#f59e0b"
                      className="mx-auto mb-2"
                    />
                    <div className="text-xs text-gray-300">Storage</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">API Requests/min</span>
                    <span className="text-white font-medium">{metrics.system.apiRequestsPerMinute}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Response Time</span>
                    <span className="text-white font-medium">{Math.round(metrics.system.responseTime)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Error Rate</span>
                    <span className={`font-medium ${metrics.system.errorRate < 1 ? 'text-green-400' : metrics.system.errorRate < 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatPercent(metrics.system.errorRate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-green-400" />
                  Processing Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Success Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{formatPercent(metrics.documents.processingSuccessRate)}</span>
                    <Badge className="bg-green-600">Good</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Avg Processing Time</span>
                  <span className="text-white">{Math.round(metrics.documents.averageProcessingTime)}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Throughput/Hour</span>
                  <span className="text-white">{metrics.processing.throughputPerHour}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Peak Time</span>
                  <span className="text-white">{metrics.processing.peakProcessingTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Document Processing Trend
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Documents processed over time ({timeRange})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleChart 
                  data={timeSeriesData.documents || []}
                  height={120}
                  color="#10b981"
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Insights Generation
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Insights generated over time ({timeRange})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleChart 
                  data={timeSeriesData.insights || []}
                  height={120}
                  color="#8b5cf6"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Model Performance */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Inference Time</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.aiModelPerformance.averageInferenceTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Tokens/sec</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.aiModelPerformance.tokensProcessedPerSecond)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Accuracy</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.aiModelPerformance.modelAccuracy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Uptime</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.aiModelPerformance.modelUptime)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Vector Store Performance */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  Vector Store
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Search Latency</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.vectorStorePerformance.searchLatency)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Indexing Speed</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.vectorStorePerformance.indexingSpeed)} docs/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Similarity Accuracy</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.vectorStorePerformance.similarityAccuracy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Storage Efficiency</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.vectorStorePerformance.storageEfficiency)}</span>
                </div>
              </CardContent>
            </Card>

            {/* API Performance */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-green-400" />
                  API Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Response Time</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.apiPerformance.averageResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Requests/sec</span>
                  <span className="text-white text-sm">{Math.round(metrics.performance.apiPerformance.requestsPerSecond)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Error Rate</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.apiPerformance.errorRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Cache Hit Rate</span>
                  <span className="text-white text-sm">{formatPercent(metrics.performance.apiPerformance.cacheHitRate)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Engagement */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  User Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Daily Active Users</span>
                  <span className="text-white font-bold">{metrics.usage.userEngagement.dailyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Weekly Active Users</span>
                  <span className="text-white font-bold">{metrics.usage.userEngagement.weeklyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Monthly Active Users</span>
                  <span className="text-white font-bold">{metrics.usage.userEngagement.monthlyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Avg Session Duration</span>
                  <span className="text-white font-bold">{Math.round(metrics.usage.userEngagement.averageSessionDuration)}min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bounce Rate</span>
                  <span className="text-white font-bold">{formatPercent(metrics.usage.userEngagement.bounceRate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Most Used Features */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Feature Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.usage.mostUsedFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">{feature.feature}</div>
                      <Progress value={feature.usage} className="h-2 mt-1" />
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-white text-sm font-bold">{feature.usage}%</span>
                      <div className="flex items-center gap-1">
                        <TrendIndicator trend={feature.trend > 0 ? 'up' : feature.trend < 0 ? 'down' : 'stable'} value={feature.trend} />
                        <span className={`text-xs ${feature.trend > 0 ? 'text-green-400' : feature.trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {feature.trend > 0 ? '+' : ''}{feature.trend}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights Overview */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  Insights Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Insights</span>
                  <span className="text-white font-bold">{metrics.insights.totalInsights}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Generated Today</span>
                  <span className="text-white font-bold">{metrics.insights.insightsToday}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Accuracy</span>
                  <span className="text-white font-bold">{formatPercent(metrics.insights.averageInsightAccuracy)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Actionable Insights</span>
                  <span className="text-white font-bold">{metrics.insights.actionableInsights}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Implemented</span>
                  <span className="text-white font-bold">{metrics.insights.implementedRecommendations}</span>
                </div>
              </CardContent>
            </Card>

            {/* Insights by Type */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Insights by Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics.insights.insightsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium capitalize">{type}</div>
                      <Progress value={(count / metrics.insights.totalInsights) * 100} className="h-2 mt-1" />
                    </div>
                    <span className="text-white text-sm font-bold ml-4">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}