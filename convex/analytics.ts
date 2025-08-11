import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Track user events for analytics
export const trackEvent = mutation({
  args: {
    userId: v.string(),
    eventType: v.union(
      v.literal("document_upload"),
      v.literal("document_view"),
      v.literal("chat_message"),
      v.literal("document_download"),
      v.literal("search_query"),
      v.literal("folder_create"),
      v.literal("bulk_upload")
    ),
    documentId: v.optional(v.string()),
    eventData: v.optional(v.any()),
    sessionId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analytics", {
      ...args,
      timestamp: Date.now()
    });
  },
});

// Get user analytics dashboard
export const getUserAnalytics = query({
  args: { 
    userId: v.string(),
    timeRange: v.optional(v.union(
      v.literal("24h"),
      v.literal("7d"), 
      v.literal("30d"),
      v.literal("90d")
    ))
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || "30d";
    const now = Date.now();
    const timeRanges = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000
    };
    const startTime = now - timeRanges[timeRange];

    // Get all user events in time range
    const events = await ctx.db
      .query("analytics")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Aggregate by event type
    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get daily breakdown
    const dailyBreakdown = events.reduce((acc, event) => {
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      if (!acc[day]) acc[day] = {};
      acc[day][event.eventType] = (acc[day][event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Most active documents
    const documentActivity = events
      .filter(e => e.documentId)
      .reduce((acc, event) => {
        const docId = event.documentId!;
        if (!acc[docId]) acc[docId] = { views: 0, messages: 0, total: 0 };
        if (event.eventType === 'document_view') acc[docId].views++;
        if (event.eventType === 'chat_message') acc[docId].messages++;
        acc[docId].total++;
        return acc;
      }, {} as Record<string, { views: number; messages: number; total: number }>);

    return {
      summary: {
        totalEvents: events.length,
        uniqueDays: Object.keys(dailyBreakdown).length,
        eventCounts,
        timeRange
      },
      dailyBreakdown,
      topDocuments: Object.entries(documentActivity)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 10)
        .map(([docId, stats]) => ({ documentId: docId, ...stats }))
    };
  },
});

// Get system-wide analytics (admin view)
export const getSystemAnalytics = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d")
    ))
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || "7d";
    const now = Date.now();
    const timeRanges = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000
    };
    const startTime = now - timeRanges[timeRange];

    const events = await ctx.db
      .query("analytics")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", startTime))
      .collect();

    // Active users
    const activeUsers = new Set(events.map(e => e.userId)).size;

    // Event type distribution
    const eventDistribution = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hourly activity pattern
    const hourlyActivity = events.reduce((acc, event) => {
      const hour = new Date(event.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      activeUsers,
      totalEvents: events.length,
      eventDistribution,
      hourlyActivity,
      averageEventsPerUser: activeUsers > 0 ? events.length / activeUsers : 0
    };
  },
});

// Get user engagement metrics
export const getUserEngagement = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get user's analytics events
    const events = await ctx.db
      .query("analytics")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (events.length === 0) {
      return {
        totalSessions: 0,
        totalEvents: 0,
        firstActivity: null,
        lastActivity: null,
        averageSessionLength: 0,
        documentsInteracted: 0
      };
    }

    // Group events by session
    const sessions = events.reduce((acc, event) => {
      const sessionId = event.sessionId || 'default';
      if (!acc[sessionId]) {
        acc[sessionId] = { events: [], start: event.timestamp, end: event.timestamp };
      }
      acc[sessionId].events.push(event);
      acc[sessionId].start = Math.min(acc[sessionId].start, event.timestamp);
      acc[sessionId].end = Math.max(acc[sessionId].end, event.timestamp);
      return acc;
    }, {} as Record<string, { events: any[], start: number, end: number }>);

    const sessionLengths = Object.values(sessions).map(s => s.end - s.start);
    const averageSessionLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;

    const uniqueDocuments = new Set(
      events.filter(e => e.documentId).map(e => e.documentId)
    ).size;

    return {
      totalSessions: Object.keys(sessions).length,
      totalEvents: events.length,
      firstActivity: Math.min(...events.map(e => e.timestamp)),
      lastActivity: Math.max(...events.map(e => e.timestamp)),
      averageSessionLength: Math.round(averageSessionLength),
      documentsInteracted: uniqueDocuments
    };
  },
});