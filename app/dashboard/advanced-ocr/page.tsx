import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdvancedOCRInterface from '@/components/AdvancedOCRInterface';

export default async function AdvancedOCRPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen">
      <AdvancedOCRInterface />
    </div>
  );
}

export const metadata = {
  title: 'Advanced OCR with Table Extraction',
  description: 'Extract text, tables, and structured data from documents using advanced OCR technology',
};