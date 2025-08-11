import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

// GET - Get folder contents (documents and subfolders)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Get folder contents
    const contents = await convex.query(api.folders.getFolderContents, { 
      userId, 
      folderId: id === 'root' ? undefined : id 
    });

    // Get folder path for breadcrumb navigation
    let folderPath = [];
    if (id !== 'root') {
      try {
        folderPath = await convex.query(api.folders.getFolderPath, { 
          folderId: id, 
          userId 
        });
      } catch (error) {
        console.error('Error getting folder path:', error);
      }
    }

    return NextResponse.json({
      success: true,
      folderId: id === 'root' ? null : id,
      path: folderPath,
      folders: contents.folders,
      documents: contents.documents
    });

  } catch (error) {
    console.error('Error fetching folder contents:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, color, parentFolderId } = body;

    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 });
    }

    if (name && name.length > 100) {
      return NextResponse.json({ error: 'Folder name too long (max 100 characters)' }, { status: 400 });
    }

    // Update folder
    await convex.mutation(api.folders.updateFolder, {
      folderId: id,
      userId,
      name: name ? name.trim() : undefined,
      description: description !== undefined ? description?.trim() : undefined,
      color: color !== undefined ? color : undefined,
      parentFolderId: parentFolderId !== undefined ? parentFolderId : undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Folder updated successfully'
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ 
        error: 'Folder with this name already exists in this location' 
      }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete folder (must be empty)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Delete folder
    await convex.mutation(api.folders.deleteFolder, {
      folderId: id,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('contains documents')) {
      return NextResponse.json({ 
        error: 'Cannot delete folder that contains documents. Move or delete documents first.' 
      }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes('contains subfolders')) {
      return NextResponse.json({ 
        error: 'Cannot delete folder that contains subfolders. Delete subfolders first.' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}