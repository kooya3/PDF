'use client';

import { useParams } from 'next/navigation';
import DocumentChatPageThemed from "@/components/document-chat-page-themed";

export default function ChatPage() {
  const params = useParams();
  const docId = params.id as string;

  return <DocumentChatPageThemed docId={docId} />;
}