import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'dots' | 'skeleton' | 'page';
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ variant = 'spinner', size = 'md', className, ...props }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-b-chart-4 animate-ping opacity-25" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading amazing content...</p>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center space-x-1.5 justify-center', className)} {...props}>
        <div className={cn('rounded-full bg-primary animate-bounce [animation-delay:-0.3s]', dotSizeClasses[size])} />
        <div className={cn('rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]', dotSizeClasses[size])} />
        <div className={cn('rounded-full bg-primary/60 animate-bounce', dotSizeClasses[size])} />
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div
        className={cn('shimmer rounded-md bg-muted', className)}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full border-solid border-primary/10 border-t-primary animate-spin',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
