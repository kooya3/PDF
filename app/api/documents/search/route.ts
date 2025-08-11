import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';

// GET - Advanced document search
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const folderId = searchParams.get('folderId');
    const tags = searchParams.get('tags');
    const sortBy = searchParams.get('sortBy') || 'updated';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query && !type && !status && !folderId && !tags) {
      return NextResponse.json({ 
        error: 'At least one search parameter is required (q, type, status, folderId, or tags)' 
      }, { status: 400 });
    }

    let searchResults = [];

    if (query) {
      // Use Convex search functionality if available
      try {
        searchResults = await convex.query(api.documents.searchDocuments, {
          userId,
          query,
          limit: limit + offset // Get extra to handle offset
        });
      } catch (error) {
        console.log('Convex search not available, falling back to memory search');
        // Fallback to memory-based search
        const memoryResults = hybridDocumentStore.searchDocumentContent(userId, query);
        searchResults = memoryResults.map(result => result.document);
      }
    } else {
      // Get all user documents for filtering
      searchResults = await hybridDocumentStore.getUserDocuments(userId);
    }

    // Apply additional filters
    let filteredResults = searchResults;

    if (type) {
      filteredResults = filteredResults.filter(doc => 
        doc.type.toLowerCase() === type.toLowerCase()
      );
    }

    if (status) {
      filteredResults = filteredResults.filter(doc => 
        doc.status === status
      );
    }

    if (folderId) {
      if (folderId === 'root') {
        filteredResults = filteredResults.filter(doc => !doc.folderId);
      } else {
        filteredResults = filteredResults.filter(doc => doc.folderId === folderId);
      }
    }

    if (tags) {
      const searchTags = tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredResults = filteredResults.filter(doc => {
        if (!doc.tags || doc.tags.length === 0) return false;
        return searchTags.some(searchTag => 
          doc.tags.some(docTag => docTag.includes(searchTag))
        );
      });
    }

    // Sort results
    filteredResults.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'words':
          aValue = a.wordCount || 0;
          bValue = b.wordCount || 0;
          break;
        case 'messages':
          aValue = a.messageCount || 0;
          bValue = b.messageCount || 0;
          break;
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Apply pagination
    const totalResults = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    // Track search analytics
    try {
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'search_query',
        eventData: {
          query,
          type,
          status,
          folderId,
          tags,
          sortBy,
          sortOrder,
          totalResults,
          limit,
          offset
        }
      });
    } catch (analyticsError) {
      console.error('Error tracking search analytics:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      results: paginatedResults.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status,
        progress: doc.progress,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        wordCount: doc.wordCount,
        pages: doc.pages,
        messageCount: doc.messageCount,
        lastChatAt: doc.lastChatAt,
        tags: doc.tags,
        folderId: doc.folderId,
        textPreview: doc.textPreview,
        totalViews: doc.totalViews,
        lastViewedAt: doc.lastViewedAt
      })),
      pagination: {
        total: totalResults,
        limit,
        offset,
        hasMore: offset + limit < totalResults
      },
      searchQuery: {
        query,
        type,
        status,
        folderId,
        tags,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}