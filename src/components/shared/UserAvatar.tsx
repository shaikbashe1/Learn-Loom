import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  role?: string;
}

export function UserAvatar({
  src,
  name = '',
  size = 'md',
  isOnline,
  role,
  className,
  ...props
}: UserAvatarProps) {
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl font-bold',
    '2xl': 'h-28 w-28 text-3xl font-bold',
  };

  const indicatorSizes = {
    xs: 'h-1.5 w-1.5 border-[1px]',
    sm: 'h-2 w-2 border-[1.5px]',
    md: 'h-2.5 w-2.5 border-2',
    lg: 'h-3 w-3 border-2',
    xl: 'h-4 w-4 border-[2.5px]',
    '2xl': 'h-5 w-5 border-3',
  };

  const indicatorOffsets = {
    xs: 'bottom-0 right-0',
    sm: 'bottom-0 right-0',
    md: 'bottom-0.5 right-0.5',
    lg: 'bottom-0.5 right-0.5',
    xl: 'bottom-1 right-1',
    '2xl': 'bottom-1.5 right-1.5',
  };

  const isInstructor = role === 'instructor' || role === 'admin' || role === 'super_admin';

  return (
    <div className={cn('relative inline-flex shrink-0', className)} {...props}>
      <Avatar className={cn(
        sizeClasses[size],
        isInstructor && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}>
        {src && <AvatarImage src={src} alt={name} className="object-cover" />}
        <AvatarFallback className="font-semibold bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/20 text-muted-foreground">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      
      {isOnline && (
        <span className={cn(
          'absolute rounded-full bg-success border-background animate-pulse-glow',
          indicatorSizes[size],
          indicatorOffsets[size]
        )} />
      )}
    </div>
  );
}
