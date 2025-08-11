import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

// GET - Get user's folder structure
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await convex.query(api.folders.getUserFolders, { userId });
    
    return NextResponse.json({
      success: true,
      folders
    });

  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new folder
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, parentFolderId, color } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Folder name too long (max 100 characters)' }, { status: 400 });
    }

    // Generate folder ID
    const folderId = `folder_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate parent folder exists if specified
    if (parentFolderId) {
      const parentFolder = await convex.query(api.folders.getFolderPath, { 
        folderId: parentFolderId, 
        userId 
      });
      
      if (!parentFolder || parentFolder.length === 0) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
    }

    // Create folder
    await convex.mutation(api.folders.createFolder, {
      id: folderId,
      userId,
      name: name.trim(),
      description: description?.trim() || undefined,
      parentFolderId: parentFolderId || undefined,
      color: color || undefined
    });

    // Track analytics
    try {
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'folder_create',
        eventData: {
          folderId,
          folderName: name.trim(),
          parentFolderId,
          hasDescription: !!description
        }
      });
    } catch (analyticsError) {
      console.error('Error tracking folder creation:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      folder: {
        id: folderId,
        name: name.trim(),
        description,
        parentFolderId,
        color,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ 
        error: 'Folder with this name already exists in this location' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}