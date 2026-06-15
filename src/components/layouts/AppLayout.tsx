import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const studentNavItems = [
  { label: 'Dashboard',       path: '/dashboard',   icon: 'dashboard' },
  { label: 'Courses',         path: '/courses',      icon: 'menu_book' },
  { label: 'AI Roadmap',      path: '/ai-roadmap',   icon: 'explore' },
  { label: 'AI Mentor',       path: '/ai-mentor',    icon: 'smart_toy' },
  { label: 'Coding Practice', path: '/coding',       icon: 'terminal' },
  { label: 'Assignments',     path: '/assignments',  icon: 'assignment' },
  { label: 'Community',       path: '/community',    icon: 'group' },
  { label: 'Leaderboard',     path: '/leaderboard',  icon: 'leaderboard' },
  { label: 'Grand Test',      path: '/grand-test',   icon: 'school' },
  { label: 'Certificates',    path: '/certificates', icon: 'workspace_premium' },
  { label: 'Pricing',         path: '/pricing',      icon: 'credit_card' },
];

const adminNavItems = [
  { label: 'Admin Dashboard', path: '/admin',               icon: 'dashboard' },
  { label: 'Manage Courses',  path: '/admin/courses',       icon: 'menu_book' },
  { label: 'Manage Students', path: '/admin/students',      icon: 'group' },
  { label: 'Certificates',    path: '/admin/certificates',  icon: 'workspace_premium' },
  { label: 'Community',       path: '/admin/community',     icon: 'forum' },
  { label: 'Submissions',     path: '/admin/submissions',   icon: 'assignment' },
  { label: 'Reports',         path: '/admin/reports',       icon: 'analytics' },
];

function SidebarNav({ items, onClose }: { items: typeof studentNavItems, onClose?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex-1 flex flex-col gap-xs font-label-md text-label-md overflow-y-auto pr-2">
      {items.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/dashboard' && item.path !== '/admin' &&
           location.pathname.startsWith(item.path));
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={cn(
              'flex items-center gap-md px-sm py-sm rounded-lg transition-all group',
              isActive
                ? 'text-primary-fixed-dim font-bold bg-primary/10 transition-transform duration-200 translate-x-1'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20'
            )}
          >
            <span className={cn("material-symbols-outlined transition-transform", isActive ? 'fill group-hover:scale-110' : 'group-hover:scale-110')}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const typeIcon: Record<string, string> = {
    certificate: 'workspace_premium', quiz: 'check_circle', reply: 'chat', system: 'notifications', info: 'info',
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 hover:scale-95 active:scale-90">
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-surface-container-high border-outline-variant/60" aria-live="polite">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/60">
          <span className="font-label-md text-label-md font-bold text-on-surface">
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-0">{unreadCount}</Badge>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 font-label-sm text-label-sm text-primary hover:text-primary-fixed-dim"
            >
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">notifications_off</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n, i) => (
              <div key={n.id}>
                {i > 0 && <Separator className="bg-outline-variant/30" />}
                <DropdownMenuItem
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none focus:bg-surface-variant/50',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => void markRead(n.id)}
                >
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">{typeIcon[n.type] ?? 'notifications'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-body-sm text-body-sm leading-snug', !n.read ? 'font-medium text-on-surface' : 'text-on-surface-variant')}>
                      {n.message}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                </DropdownMenuItem>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ isAdmin, onClose }: { isAdmin?: boolean; onClose?: () => void }) {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest p-md gap-base">
      {/* Header */}
      <div className="flex items-center gap-md px-sm py-md mb-lg">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold">L</div>
        <div>
          <h1 className="font-display text-headline-md font-bold text-primary-fixed-dim tracking-tight">LearnLoom</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {isAdmin ? 'Admin Portal' : 'Premium EdTech'}
          </p>
        </div>
      </div>

      <SidebarNav items={navItems} onClose={onClose} />

      {/* Footer Nav */}
      <div className="mt-auto flex flex-col gap-xs font-label-md text-label-md border-t border-outline-variant/60 pt-md">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-md px-sm py-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20 rounded-lg transition-all group"
        >
          <span className="material-symbols-outlined group-hover:rotate-45 transition-transform">settings</span>
          <span>Settings</span>
        </Link>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-md px-sm py-sm text-error hover:text-error-container hover:bg-error/10 rounded-lg transition-all group w-full text-left"
        >
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  title?: string;
}

export function AppLayout({ children, isAdmin: isAdminProp, title }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, user, signOut } = useAuth();

  const isAdmin = isAdminProp ?? (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'org_admin');
  const credits = profile?.credits ?? 0;
  const streak = profile?.streak_days ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface font-body-md text-body-md antialiased selection:bg-primary/20 selection:text-primary">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background">
        {/* TopNavBar */}
        <header className="sticky top-0 z-30 flex justify-between items-center px-lg py-sm w-full max-w-[1440px] mx-auto bg-background/80 backdrop-blur-md border-b border-outline-variant/60">
          
          {/* Menu Toggle & Title */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="text-on-surface-variant p-sm hover:bg-surface-variant/20 rounded-full flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-surface-container-lowest border-r border-outline-variant/60">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-headline-sm font-bold text-on-surface">LearnLoom</span>
          </div>

          {/* Search (Desktop) */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input 
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-full py-2 pl-xl pr-md text-body-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant" 
              placeholder="Search courses, concepts, or mentors..." 
              type="text"
            />
          </div>

          {/* Trailing Actions */}
          <div className="flex items-center gap-md ml-auto">
            {!isAdmin && (
              <>
                {/* Credits */}
                <div className="hidden sm:flex items-center gap-xs px-sm py-1 bg-surface-container-low border border-outline-variant/60 rounded-full cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="material-symbols-outlined text-primary text-sm fill">monetization_on</span>
                  <span className="font-label-sm text-label-sm font-bold">{credits}</span>
                </div>
                {/* Streak */}
                <div className="flex items-center gap-xs px-sm py-1 bg-tertiary-container/10 border border-tertiary-container/30 rounded-full text-tertiary cursor-pointer hover:bg-tertiary-container/20 transition-colors">
                  <span className="material-symbols-outlined text-sm fill">local_fire_department</span>
                  <span className="font-label-sm text-label-sm font-bold">{streak}d</span>
                </div>
              </>
            )}

            <NotificationBell />
            
            <div className="ml-sm shrink-0 flex items-center justify-center">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-outline-variant/60 hover:ring-2 hover:ring-primary transition-all overflow-hidden text-primary font-bold text-sm">
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1">
                    <div className="px-2 py-2 mb-1 border-b border-outline-variant/60">
                      <p className="font-label-md text-label-md text-on-surface truncate">{profile?.full_name || 'User'}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer w-full">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => void signOut()}
                      className="text-error focus:text-error cursor-pointer flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20 font-label-md">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-primary text-on-primary font-label-md hover:brightness-110">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Canvas for Children */}
        <div className="flex-1 w-full max-w-[1440px] mx-auto flex flex-col relative">
          {children}
        </div>
      </main>
    </div>
  );
}
