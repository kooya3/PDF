'use client';

import React, { forwardRef } from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  gradient?: boolean;
  glow?: boolean;
  pulse?: boolean;
}

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    children, 
    className, 
    loading = false, 
    loadingText,
    gradient = false,
    glow = false,
    pulse = false,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          "relative overflow-hidden transition-all duration-300 transform",
          
          // Gradient variant
          gradient && "bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white border-none shadow-lg",
          gradient && "hover:from-purple-600 hover:via-purple-700 hover:to-pink-600",
          gradient && "hover:shadow-xl hover:scale-105",
          
          // Glow effect
          glow && "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
          glow && "hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]",
          
          // Pulse animation
          pulse && "animate-pulse",
          
          // Loading state
          loading && "cursor-not-allowed opacity-90",
          
          // Hover effects for non-gradient buttons
          !gradient && "hover:scale-105 hover:shadow-lg",
          
          className
        )}
        {...props}
      >
        {/* Background shimmer effect for gradient buttons */}
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
        )}
        
        {/* Content */}
        <span className="relative flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? (loadingText || 'Loading...') : children}
        </span>
      </Button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

export { EnhancedButton };