import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin-temp';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document ownership
    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('files')
      .doc(docId)
      .get();

    if (!docRef.exists) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get chat messages
    const chatQuery = adminDb
      .collection('users')
      .doc(userId)
      .collection('files')
      .doc(docId)
      .collection('chat')
      .orderBy('createdAt', 'asc');

    const chatSnapshot = await chatQuery.get();
    
    const messages = chatSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.message,
        role: data.role,
        timestamp: data.createdAt?.toDate() || new Date(),
        error: data.error || false,
      };
    });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}