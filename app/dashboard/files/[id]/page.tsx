'use client';

import { useParams } from 'next/navigation';
import PineconeDocumentPage from "@/components/PineconeDocumentPage";

export default function ChatPage() {
  const params = useParams();
  const docId = params.id as string;

  return <PineconeDocumentPage docId={docId} />;
}