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
    const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' || '30d';
    const format = searchParams.get('format') as 'json' | 'csv' || 'json';
    const includeCharts = searchParams.get('includeCharts') === 'true';

    // Generate comprehensive report
    const reportData = await analyticsService.exportAnalyticsReport(userId, timeRange, format);
    
    // Enhanced report with additional metadata
    const enhancedReport = {
      ...reportData,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        timeRange,
        format,
        includeCharts,
        version: '1.0.0'
      },
      summary: {
        reportPeriod: timeRange,
        totalDataPoints: calculateDataPoints(reportData.metrics),
        keyHighlights: generateKeyHighlights(reportData.metrics),
        recommendations: generateRecommendations(reportData.metrics)
      }
    };

    if (format === 'csv') {
      const csvData = convertToCSV(enhancedReport);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(enhancedReport, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export analytics report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateDataPoints(metrics: any): number {
  let count = 0;
  
  // Count metrics recursively
  function countMetrics(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'number') {
        count++;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        countMetrics(obj[key]);
      }
    }
  }
  
  countMetrics(metrics);
  return count;
}

function generateKeyHighlights(metrics: any): string[] {
  const highlights: string[] = [];
  
  try {
    // Document processing highlights
    if (metrics.documents?.processingSuccessRate > 95) {
      highlights.push(`Excellent processing success rate: ${metrics.documents.processingSuccessRate.toFixed(1)}%`);
    }
    
    // Performance highlights  
    if (metrics.performance?.aiModelPerformance?.modelAccuracy > 90) {
      highlights.push(`High AI model accuracy: ${metrics.performance.aiModelPerformance.modelAccuracy.toFixed(1)}%`);
    }
    
    // Usage highlights
    if (metrics.usage?.userEngagement?.bounceRate < 20) {
      highlights.push(`Low bounce rate indicates good user engagement: ${metrics.usage.userEngagement.bounceRate.toFixed(1)}%`);
    }
    
    // System highlights
    if (metrics.system?.systemUptime > 99) {
      highlights.push(`Excellent system uptime: ${metrics.system.systemUptime.toFixed(2)}%`);
    }
    
    // Insights highlights
    if (metrics.insights?.averageInsightAccuracy > 85) {
      highlights.push(`High insight accuracy: ${metrics.insights.averageInsightAccuracy.toFixed(1)}%`);
    }
    
  } catch (error) {
    console.warn('Error generating highlights:', error);
    highlights.push('Analytics data processed successfully');
  }
  
  return highlights.length > 0 ? highlights : ['System operating within normal parameters'];
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  try {
    // Performance recommendations
    if (metrics.performance?.apiPerformance?.averageResponseTime > 500) {
      recommendations.push('Consider optimizing API response times - current average exceeds 500ms');
    }
    
    // System recommendations
    if (metrics.system?.cpuUsage > 80) {
      recommendations.push('High CPU usage detected - consider scaling processing capacity');
    }
    
    if (metrics.system?.memoryUsage > 85) {
      recommendations.push('Memory usage is high - monitor for potential memory leaks');
    }
    
    // Processing recommendations
    if (metrics.processing?.queueDepth > 10) {
      recommendations.push('Processing queue is building up - consider increasing worker capacity');
    }
    
    // Usage recommendations
    if (metrics.usage?.userEngagement?.bounceRate > 30) {
      recommendations.push('High bounce rate - review user onboarding and initial experience');
    }
    
    // Document processing recommendations
    if (metrics.documents?.processingSuccessRate < 90) {
      recommendations.push('Document processing success rate below 90% - review error logs and processing pipeline');
    }
    
  } catch (error) {
    console.warn('Error generating recommendations:', error);
  }
  
  return recommendations.length > 0 ? recommendations : ['System performance is optimal - no immediate actions required'];
}

function convertToCSV(data: any): string {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push('Metric Category,Metric Name,Value,Unit,Timestamp');
  
  // Flatten the metrics object into CSV rows
  function addMetricsToCSV(obj: any, category: string = ''): void {
    for (const key in obj) {
      if (typeof obj[key] === 'number') {
        const value = obj[key];
        const unit = inferUnit(key, value);
        csvRows.push(`"${category}","${key}","${value}","${unit}","${new Date().toISOString()}"`);
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        const newCategory = category ? `${category} > ${key}` : key;
        addMetricsToCSV(obj[key], newCategory);
      }
    }
  }
  
  if (data.metrics) {
    addMetricsToCSV(data.metrics);
  }
  
  return csvRows.join('\n');
}

function inferUnit(metricName: string, value: number): string {
  const name = metricName.toLowerCase();
  
  if (name.includes('percent') || name.includes('rate') || name.includes('accuracy') || name.includes('uptime')) {
    return '%';
  }
  if (name.includes('time') || name.includes('latency') || name.includes('duration')) {
    return value > 10000 ? 's' : 'ms';
  }
  if (name.includes('count') || name.includes('total') || name.includes('number')) {
    return 'count';
  }
  if (name.includes('size') || name.includes('usage') && value > 100) {
    return 'MB';
  }
  if (name.includes('speed') || name.includes('throughput')) {
    return 'per hour';
  }
  
  return 'units';
}