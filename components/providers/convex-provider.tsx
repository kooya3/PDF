'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://pdf-13a39.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

interface ConvexProviderWrapperProps {
  children: ReactNode;
}

export default function ConvexProviderWrapper({ children }: ConvexProviderWrapperProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}