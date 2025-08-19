import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyticsService } from '@/lib/analytics-service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d' || '24h';
    const type = searchParams.get('type');

    switch (type) {
      case 'metrics':
        const metrics = await analyticsService.getAnalyticsMetrics(userId, timeRange);
        return NextResponse.json({
          success: true,
          data: metrics,
          timeRange,
          timestamp: new Date().toISOString()
        });

      case 'timeseries':
        const metric = searchParams.get('metric') || 'documents';
        const points = parseInt(searchParams.get('points') || '24');
        
        // Generate time series data based on metric type
        let baseValue = 100;
        let variance = 0.1;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        switch (metric) {
          case 'documents':
            baseValue = 45;
            variance = 0.15;
            trend = 'up';
            break;
          case 'processing':
            baseValue = 12;
            variance = 0.2;
            trend = 'stable';
            break;
          case 'insights':
            baseValue = 28;
            variance = 0.12;
            trend = 'up';
            break;
          case 'performance':
            baseValue = 95;
            variance = 0.05;
            trend = 'stable';
            break;
        }
        
        const timeSeriesData = analyticsService.generateTimeSeriesData(baseValue, points, variance, trend);
        
        return NextResponse.json({
          success: true,
          data: timeSeriesData,
          metric,
          timeRange,
          points
        });

      case 'alerts':
        const alerts = analyticsService.getAlerts();
        return NextResponse.json({
          success: true,
          data: alerts,
          count: alerts.length
        });

      case 'trends':
        const trendMetric = searchParams.get('metric') || 'documents';
        const current = Math.floor(Math.random() * 100) + 50;
        const previous = Math.floor(Math.random() * 100) + 40;
        const trendData = analyticsService.calculateTrend(current, previous);
        
        return NextResponse.json({
          success: true,
          data: trendData,
          metric: trendMetric
        });

      default:
        // Return overview metrics by default
        const overviewMetrics = await analyticsService.getAnalyticsMetrics(userId, timeRange);
        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalDocuments: overviewMetrics.documents.totalDocuments,
              totalInsights: overviewMetrics.insights.totalInsights,
              activeJobs: overviewMetrics.processing.activeJobs,
              systemHealth: Math.round((overviewMetrics.system.systemUptime + 
                                      (100 - overviewMetrics.system.errorRate) + 
                                      overviewMetrics.performance.aiModelPerformance.modelUptime) / 3)
            },
            recent: {
              documentsToday: overviewMetrics.documents.documentsProcessedToday,
              insightsToday: overviewMetrics.insights.insightsToday,
              analysesToday: overviewMetrics.usage.analysesToday
            }
          },
          timeRange
        });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertId, exportOptions } = body;

    switch (action) {
      case 'dismiss_alert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        analyticsService.dismissAlert(alertId);
        return NextResponse.json({
          success: true,
          message: 'Alert dismissed successfully'
        });

      case 'export_report':
        const { timeRange = '30d', format = 'json' } = exportOptions || {};
        const reportData = await analyticsService.exportAnalyticsReport(userId, timeRange, format);
        
        return NextResponse.json({
          success: true,
          data: reportData,
          downloadUrl: `/api/analytics/export?userId=${userId}&timeRange=${timeRange}&format=${format}`
        });

      case 'refresh_metrics':
        // Force refresh by clearing cache (if implemented)
        const freshMetrics = await analyticsService.getAnalyticsMetrics(userId, '24h');
        return NextResponse.json({
          success: true,
          data: freshMetrics,
          message: 'Metrics refreshed successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process analytics request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}