'use client';

import React, { ReactNode, Suspense } from 'react';
import Navbar from '@/components/navbar';
import { SparklesCore } from '@/components/sparkles';
import { FloatingPaper } from '@/components/floating-paper';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageLoading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  showBackground?: boolean;
  variant?: 'default' | 'minimal' | 'dashboard';
  title?: string;
  description?: string;
}

export default function MainLayout({ 
  children, 
  className = '',
  showBackground = true,
  variant = 'default',
  title,
  description
}: MainLayoutProps) {
  const renderBackground = () => {
    if (!showBackground) return null;

    return (
      <>
        {/* Ambient background with moving particles */}
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="main-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={variant === 'minimal' ? 20 : 50}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>

        {/* Floating papers background - only for default variant */}
        {variant === 'default' && (
          <div className="absolute inset-0 overflow-hidden z-0">
            <FloatingPaper count={6} />
          </div>
        )}

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-0" />
      </>
    );
  };

  const renderHeader = () => {
    if (!title && !description) return null;

    return (
      <div className="relative z-10 mb-12 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          AI-Powered Platform
        </div>
        
        {title && (
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {title.split(' ').map((word, index, words) => {
              const isLastTwo = index >= words.length - 2;
              return (
                <span 
                  key={index}
                  className={isLastTwo ? 
                    "block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600" : 
                    ""
                  }
                >
                  {word}{index < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </h1>
        )}
        
        {description && (
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
    );
  };

  const getContainerClass = () => {
    switch (variant) {
      case 'minimal':
        return 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
      case 'dashboard':
        return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
      default:
        return 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
    }
  };

  return (
    <main className={cn(
      "min-h-screen antialiased relative overflow-hidden",
      showBackground ? "bg-black/[0.96] bg-grid-white/[0.02]" : "bg-gray-50 dark:bg-gray-900",
      className
    )}>
      {renderBackground()}

      <div className="relative z-10">
        <Navbar />
        
        <div className={getContainerClass()}>
          {renderHeader()}
          <ErrorBoundary>
            <Suspense fallback={<PageLoading title="Loading content..." />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}

// Convenience layout components for different page types
export function LandingLayout({ children, ...props }: MainLayoutProps) {
  return (
    <MainLayout variant="default" showBackground={true} {...props}>
      {children}
    </MainLayout>
  );
}

export function DashboardLayout({ children, ...props }: MainLayoutProps) {
  return (
    <MainLayout variant="dashboard" showBackground={true} {...props}>
      {children}
    </MainLayout>
  );
}

export function MinimalLayout({ children, ...props }: MainLayoutProps) {
  return (
    <MainLayout variant="minimal" showBackground={false} {...props}>
      {children}
    </MainLayout>
  );
}

export function FeatureLayout({ children, title, description, ...props }: MainLayoutProps) {
  return (
    <MainLayout 
      variant="default" 
      showBackground={true} 
      title={title}
      description={description}
      {...props}
    >
      {children}
    </MainLayout>
  );
}