import React from 'react';
import { cn } from '@/lib/utils';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'cyan';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusType;
  variant?: 'subtle' | 'outline' | 'solid';
}

export function StatusBadge({
  status = 'neutral',
  variant = 'subtle',
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-colors uppercase select-none';

  const statusClasses = {
    success: {
      subtle: 'bg-success/10 text-success border border-success/20',
      outline: 'bg-transparent text-success border border-success',
      solid: 'bg-success text-white',
    },
    warning: {
      subtle: 'bg-warning/10 text-warning border border-warning/20',
      outline: 'bg-transparent text-warning border border-warning',
      solid: 'bg-warning text-white',
    },
    error: {
      subtle: 'bg-destructive/10 text-destructive border border-destructive/20',
      outline: 'bg-transparent text-destructive border border-destructive',
      solid: 'bg-destructive text-white',
    },
    info: {
      subtle: 'bg-primary/10 text-primary border border-primary/20',
      outline: 'bg-transparent text-primary border border-primary',
      solid: 'bg-primary text-white',
    },
    neutral: {
      subtle: 'bg-muted text-muted-foreground border border-border',
      outline: 'bg-transparent text-muted-foreground border border-border',
      solid: 'bg-muted-foreground text-white',
    },
    purple: {
      subtle: 'bg-chart-4/10 text-chart-4 border border-chart-4/20',
      outline: 'bg-transparent text-chart-4 border border-chart-4',
      solid: 'bg-chart-4 text-white',
    },
    cyan: {
      subtle: 'bg-chart-1/10 text-chart-1 border border-chart-1/20',
      outline: 'bg-transparent text-chart-1 border border-chart-1',
      solid: 'bg-chart-1 text-white',
    },
  };

  return (
    <span
      className={cn(baseClasses, statusClasses[status]?.[variant], className)}
      {...props}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        variant === 'solid' ? 'bg-white' : 
        status === 'success' ? 'bg-success' :
        status === 'warning' ? 'bg-warning' :
        status === 'error' ? 'bg-destructive' :
        status === 'info' ? 'bg-primary' :
        status === 'purple' ? 'bg-chart-4' :
        status === 'cyan' ? 'bg-chart-1' : 'bg-muted-foreground'
      )} />
      {children}
    </span>
  );
}
