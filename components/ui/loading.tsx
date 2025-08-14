"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const loadingVariants = cva(
  "flex items-center justify-center",
  {
    variants: {
      size: {
        sm: "w-4 h-4",
        default: "w-6 h-6", 
        lg: "w-8 h-8",
        xl: "w-12 h-12"
      },
      variant: {
        spinner: "",
        dots: "",
        pulse: "",
        skeleton: "bg-muted animate-pulse rounded"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "spinner"
    }
  }
)

interface LoadingProps extends VariantProps<typeof loadingVariants> {
  className?: string
  text?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size, variant, text, ...props }, ref) => {
    if (variant === "dots") {
      return (
        <div ref={ref} className={cn("flex space-x-1", className)} {...props}>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
          {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
        </div>
      )
    }

    if (variant === "pulse") {
      return (
        <div ref={ref} className={cn("animate-pulse bg-muted rounded", className)} {...props}>
          {text && <span className="sr-only">{text}</span>}
        </div>
      )
    }

    if (variant === "skeleton") {
      return (
        <div ref={ref} className={cn(loadingVariants({ size, variant }), className)} {...props}>
          {text && <span className="sr-only">{text}</span>}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("flex items-center", className)} {...props}>
        <Loader2 className={cn("animate-spin", loadingVariants({ size }))} />
        {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }
)
Loading.displayName = "Loading"

// Page-level loading component
interface PageLoadingProps {
  title?: string
  description?: string
  className?: string
}

const PageLoading = ({ title = "Loading...", description, className }: PageLoadingProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] space-y-4", className)}>
      <Loading size="xl" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
    </div>
  )
}

// Card loading skeleton
const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("p-6 space-y-4", className)}>
      <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded animate-pulse"></div>
        <div className="h-3 bg-muted rounded w-5/6 animate-pulse"></div>
      </div>
    </div>
  )
}

// Button loading state
const ButtonLoading = ({ children, isLoading, ...props }: { children: React.ReactNode, isLoading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading ? (
        <div className="flex items-center">
          <Loading size="sm" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export { Loading, PageLoading, CardSkeleton, ButtonLoading, loadingVariants }