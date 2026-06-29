import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-card/50 backdrop-blur-sm shadow-sm max-w-md mx-auto my-8',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground mb-4 border border-border/60 shadow-inner">
          <Icon className="w-6 h-6 text-muted-foreground/80" />
        </div>
      )}
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{description}</p>
      {action && <div className="flex items-center justify-center">{action}</div>}
    </div>
  );
}
