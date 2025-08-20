'use client';

import { useParams } from 'next/navigation';
import UnifiedChatInterface from '@/components/UnifiedChatInterface';

export default function DocumentChatPage() {
  const params = useParams();
  const documentId = params.id as string;

  return (
    <UnifiedChatInterface 
      contentId={documentId} 
      contentType="document" 
    />
  );
}