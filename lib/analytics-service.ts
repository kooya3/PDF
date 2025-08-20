import { documentStore } from './memory-store';

// Analytics data types
export interface AnalyticsMetrics {
  system: SystemMetrics;
  documents: DocumentMetrics;
  processing: ProcessingMetrics;
  usage: UsageMetrics;
  performance: PerformanceMetrics;
  insights: InsightMetrics;
}

export interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
  storageUsage: number;
  apiRequestsPerMinute: number;
  errorRate: number;
  responseTime: number;
}

export interface DocumentMetrics {
  totalDocuments: number;
  documentsProcessedToday: number;
  documentsProcessedThisWeek: number;
  documentsProcessedThisMonth: number;
  averageDocumentSize: number;
  documentsByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  processingSuccessRate: number;
  averageProcessingTime: number;
}

export interface ProcessingMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  jobsByType: Record<string, number>;
  queueDepth: number;
  throughputPerHour: number;
  peakProcessingTime: string;
}

export interface UsageMetrics {
  totalAnalyses: number;
  analysesToday: number;
  analysesThisWeek: number;
  analysesThisMonth: number;
  averageAnalysisComplexity: number;
  mostUsedFeatures: Array<{ feature: string; usage: number; trend: number }>;
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
}

export interface PerformanceMetrics {
  aiModelPerformance: {
    averageInferenceTime: number;
    tokensProcessedPerSecond: number;
    modelAccuracy: number;
    modelUptime: number;
  };
  vectorStorePerformance: {
    searchLatency: number;
    indexingSpeed: number;
    similarityAccuracy: number;
    storageEfficiency: number;
  };
  apiPerformance: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

export interface InsightMetrics {
  totalInsights: number;
  insightsToday: number;
  insightsByType: Record<string, number>;
  insightsByConfidence: Record<string, number>;
  insightsByImpact: Record<string, number>;
  averageInsightAccuracy: number;
  actionableInsights: number;
  implementedRecommendations: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
  actionUrl?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private alerts: AlertData[] = [];

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private constructor() {
    // Initialize with some sample alerts
    this.generateSampleAlerts();
  }

  // Main analytics aggregation method
  async getAnalyticsMetrics(userId: string, timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<AnalyticsMetrics> {
    const cacheKey = `metrics_${userId}_${timeRange}`;
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const metrics: AnalyticsMetrics = {
        system: await this.getSystemMetrics(),
        documents: await this.getDocumentMetrics(userId, timeRange),
        processing: await this.getProcessingMetrics(timeRange),
        usage: await this.getUsageMetrics(userId, timeRange),
        performance: await this.getPerformanceMetrics(),
        insights: await this.getInsightMetrics(userId, timeRange)
      };

      this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
      return metrics;
    } catch (error) {
      console.error('Error getting analytics metrics:', error);
      throw new Error('Failed to retrieve analytics metrics');
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    // In production, these would come from actual monitoring systems
    return {
      totalUsers: 150 + Math.floor(Math.random() * 50),
      activeUsers: 45 + Math.floor(Math.random() * 15),
      systemUptime: 99.5 + Math.random() * 0.5,
      memoryUsage: 65 + Math.random() * 20,
      cpuUsage: 25 + Math.random() * 30,
      storageUsage: 78 + Math.random() * 15,
      apiRequestsPerMinute: 120 + Math.floor(Math.random() * 80),
      errorRate: Math.random() * 2,
      responseTime: 150 + Math.random() * 100
    };
  }

  private async getDocumentMetrics(userId: string, timeRange: string): Promise<DocumentMetrics> {
    const userDocuments = documentStore.getUserDocuments(userId);
    const now = new Date();
    
    const documentsToday = userDocuments.filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate.toDateString() === now.toDateString();
    }).length;

    const documentsThisWeek = userDocuments.filter(doc => {
      const docDate = new Date(doc.createdAt);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return docDate >= weekAgo;
    }).length;

    const documentsThisMonth = userDocuments.filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
    }).length;

    const documentsByType: Record<string, number> = {};
    const documentsByStatus: Record<string, number> = {};
    let totalSize = 0;

    userDocuments.forEach(doc => {
      documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;
      documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;
      totalSize += doc.size || 0;
    });

    const completedDocs = userDocuments.filter(doc => doc.status === 'completed');
    const processingSuccessRate = userDocuments.length > 0 ? (completedDocs.length / userDocuments.length) * 100 : 100;

    return {
      totalDocuments: userDocuments.length,
      documentsProcessedToday: documentsToday,
      documentsProcessedThisWeek: documentsThisWeek,
      documentsProcessedThisMonth: documentsThisMonth,
      averageDocumentSize: userDocuments.length > 0 ? totalSize / userDocuments.length : 0,
      documentsByType,
      documentsByStatus,
      processingSuccessRate,
      averageProcessingTime: 45 + Math.random() * 30 // seconds
    };
  }

  private async getProcessingMetrics(timeRange: string): Promise<ProcessingMetrics> {
    // Simulate job metrics based on time range
    const baseJobs = timeRange === '1h' ? 25 : timeRange === '24h' ? 150 : timeRange === '7d' ? 800 : 2400;
    
    return {
      totalJobs: baseJobs + Math.floor(Math.random() * 50),
      activeJobs: Math.floor(Math.random() * 10),
      completedJobs: Math.floor(baseJobs * 0.92) + Math.floor(Math.random() * 20),
      failedJobs: Math.floor(baseJobs * 0.05) + Math.floor(Math.random() * 5),
      averageJobDuration: 180 + Math.random() * 120, // seconds
      jobsByType: {
        'document-analysis': Math.floor(baseJobs * 0.4),
        'cross-document': Math.floor(baseJobs * 0.3),
        'insight-generation': Math.floor(baseJobs * 0.2),
        'knowledge-graph': Math.floor(baseJobs * 0.1)
      },
      queueDepth: Math.floor(Math.random() * 15),
      throughputPerHour: 25 + Math.floor(Math.random() * 15),
      peakProcessingTime: '14:00-16:00'
    };
  }

  private async getUsageMetrics(userId: string, timeRange: string): Promise<UsageMetrics> {
    const baseAnalyses = timeRange === '1h' ? 5 : timeRange === '24h' ? 32 : timeRange === '7d' ? 180 : 650;
    
    return {
      totalAnalyses: baseAnalyses + Math.floor(Math.random() * 20),
      analysesToday: 8 + Math.floor(Math.random() * 12),
      analysesThisWeek: 45 + Math.floor(Math.random() * 25),
      analysesThisMonth: 180 + Math.floor(Math.random() * 80),
      averageAnalysisComplexity: 2.8 + Math.random() * 1.2,
      mostUsedFeatures: [
        { feature: 'Cross-Document Analysis', usage: 85, trend: 12 },
        { feature: 'AI Insights', usage: 72, trend: 8 },
        { feature: 'Multi-Document Chat', usage: 68, trend: -3 },
        { feature: 'Knowledge Graphs', usage: 45, trend: 15 },
        { feature: 'Document Comparison', usage: 38, trend: 5 }
      ],
      userEngagement: {
        dailyActiveUsers: 45 + Math.floor(Math.random() * 15),
        weeklyActiveUsers: 120 + Math.floor(Math.random() * 30),
        monthlyActiveUsers: 350 + Math.floor(Math.random() * 100),
        averageSessionDuration: 18 + Math.random() * 12, // minutes
        bounceRate: 15 + Math.random() * 10 // percentage
      }
    };
  }

  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      aiModelPerformance: {
        averageInferenceTime: 850 + Math.random() * 300, // ms
        tokensProcessedPerSecond: 180 + Math.random() * 50,
        modelAccuracy: 92 + Math.random() * 6, // percentage
        modelUptime: 99.2 + Math.random() * 0.8 // percentage
      },
      vectorStorePerformance: {
        searchLatency: 45 + Math.random() * 25, // ms
        indexingSpeed: 1200 + Math.random() * 400, // docs/min
        similarityAccuracy: 88 + Math.random() * 8, // percentage
        storageEfficiency: 78 + Math.random() * 15 // percentage
      },
      apiPerformance: {
        averageResponseTime: 180 + Math.random() * 120, // ms
        requestsPerSecond: 35 + Math.random() * 25,
        errorRate: Math.random() * 2, // percentage
        cacheHitRate: 85 + Math.random() * 12 // percentage
      }
    };
  }

  private async getInsightMetrics(userId: string, timeRange: string): Promise<InsightMetrics> {
    const baseInsights = timeRange === '1h' ? 8 : timeRange === '24h' ? 45 : timeRange === '7d' ? 240 : 850;
    
    return {
      totalInsights: baseInsights + Math.floor(Math.random() * 20),
      insightsToday: 12 + Math.floor(Math.random() * 8),
      insightsByType: {
        'trend': Math.floor(baseInsights * 0.3),
        'gap': Math.floor(baseInsights * 0.2),
        'conflict': Math.floor(baseInsights * 0.15),
        'synthesis': Math.floor(baseInsights * 0.25),
        'recommendation': Math.floor(baseInsights * 0.1)
      },
      insightsByConfidence: {
        'high': Math.floor(baseInsights * 0.4),
        'medium': Math.floor(baseInsights * 0.45),
        'low': Math.floor(baseInsights * 0.15)
      },
      insightsByImpact: {
        'critical': Math.floor(baseInsights * 0.1),
        'high': Math.floor(baseInsights * 0.25),
        'medium': Math.floor(baseInsights * 0.45),
        'low': Math.floor(baseInsights * 0.2)
      },
      averageInsightAccuracy: 87 + Math.random() * 10,
      actionableInsights: Math.floor(baseInsights * 0.65),
      implementedRecommendations: Math.floor(baseInsights * 0.32)
    };
  }

  // Time series data generation
  generateTimeSeriesData(
    baseValue: number, 
    points: number, 
    variance: number = 0.1,
    trend: 'up' | 'down' | 'stable' = 'stable'
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = new Date();
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // hourly data
      let value = baseValue;
      
      // Add trend
      if (trend === 'up') {
        value += (points - i) * (baseValue * 0.02);
      } else if (trend === 'down') {
        value -= (points - i) * (baseValue * 0.02);
      }
      
      // Add variance
      value += (Math.random() - 0.5) * 2 * baseValue * variance;
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.max(0, Math.round(value * 100) / 100)
      });
    }
    
    return data;
  }

  // Trend calculation
  calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'up' : 'down';
    }
    
    return {
      current,
      previous,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      trend
    };
  }

  // Alert management
  private generateSampleAlerts(): void {
    this.alerts = [
      {
        id: '1',
        type: 'warning',
        title: 'High Processing Queue',
        message: 'The document processing queue has 15+ items. Consider upgrading processing capacity.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        dismissed: false,
        actionUrl: '/dashboard/processing'
      },
      {
        id: '2',
        type: 'success',
        title: 'Model Performance Improved',
        message: 'AI model accuracy increased by 3.2% compared to last week.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dismissed: false
      },
      {
        id: '3',
        type: 'info',
        title: 'New Feature Available',
        message: 'Enhanced knowledge graph visualization is now available in beta.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        dismissed: false,
        actionUrl: '/dashboard/cross-document'
      }
    ];
  }

  getAlerts(): AlertData[] {
    return this.alerts.filter(alert => !alert.dismissed);
  }

  dismissAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  // Export capabilities
  async exportAnalyticsReport(
    userId: string, 
    timeRange: '24h' | '7d' | '30d' = '30d',
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const metrics = await this.getAnalyticsMetrics(userId, timeRange);
    
    if (format === 'json') {
      return {
        generated: new Date().toISOString(),
        userId,
        timeRange,
        metrics
      };
    }
    
    // CSV format would be implemented here
    return metrics;
  }
}

export const analyticsService = AnalyticsService.getInstance();