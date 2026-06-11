import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, BookOpen, Brain, Code2, Trophy,
  MessageSquare, Users, FileText, Medal, Settings, LogOut,
  Menu, Zap, Target, BarChart3, GraduationCap, Bell, CreditCard,
  CheckCheck, Flame,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';

const studentNavItems = [
  { label: 'Dashboard',       path: '/dashboard',   icon: LayoutDashboard },
  { label: 'Courses',         path: '/courses',      icon: BookOpen },
  { label: 'AI Roadmap',      path: '/ai-roadmap',   icon: Target },
  { label: 'AI Mentor',       path: '/ai-mentor',    icon: Brain },
  { label: 'Coding Practice', path: '/coding',       icon: Code2 },
  { label: 'Assignments',     path: '/assignments',  icon: FileText },
  { label: 'Community',       path: '/community',    icon: MessageSquare },
  { label: 'Leaderboard',     path: '/leaderboard',  icon: Trophy },
  { label: 'Grand Test',      path: '/grand-test',   icon: GraduationCap },
  { label: 'Certificates',    path: '/certificates', icon: Medal },
  { label: 'Pricing',         path: '/pricing',      icon: CreditCard },
];

const adminNavItems = [
  { label: 'Admin Dashboard', path: '/admin',               icon: LayoutDashboard },
  { label: 'Manage Courses',  path: '/admin/courses',       icon: BookOpen },
  { label: 'Manage Students', path: '/admin/students',      icon: Users },
  { label: 'Certificates',    path: '/admin/certificates',  icon: Medal },
  { label: 'Community',       path: '/admin/community',     icon: MessageSquare },
  { label: 'Submissions',     path: '/admin/submissions',   icon: FileText },
  { label: 'Reports',         path: '/admin/reports',       icon: BarChart3 },
];

interface SidebarNavProps {
  items: typeof studentNavItems;
  onClose?: () => void;
}

function SidebarNav({ items, onClose }: SidebarNavProps) {
  const location = useLocation();
  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
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
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group border-l-[3px]',
              isActive
                ? 'bg-primary/15 text-primary border-primary pl-[9px]'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white border-transparent pl-[9px]'
            )}
          >
            <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-slate-400 group-hover:text-white')} />
            <span className="min-w-0 truncate">{item.label}</span>
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
    certificate: '🎓', quiz: '✅', reply: '💬', system: '🔔', info: '🔔',
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="text-muted-foreground hover:text-foreground hover:bg-accent relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" aria-live="polite">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-0">{unreadCount}</Badge>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n, i) => (
              <div key={n.id}>
                {i > 0 && <Separator />}
                <DropdownMenuItem
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => void markRead(n.id)}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !n.read ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
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

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url as string | undefined;
  const credits = profile?.credits ?? 0;
  const streak = profile?.streak_days ?? 0;

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <span className="text-base font-bold text-white tracking-tight">LearnLoom</span>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {isAdmin ? 'Admin Portal' : 'Student Portal'}
          </p>
        </div>
      </div>

      {/* Credits / Streak — students only */}
      {!isAdmin && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-white">{credits} Credits</span>
            </div>
            <Badge className="text-[10px] py-0 h-4 bg-orange-500/20 text-orange-300 border-0">
              <Flame className="w-2.5 h-2.5 mr-0.5" />
              {streak}-day streak
            </Badge>
          </div>
        </div>
      )}

      <SidebarNav items={navItems} onClose={onClose} />

      {/* Bottom user row */}
      <div className="shrink-0 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="w-8 h-8 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-primary/30 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="px-3 pb-3 space-y-0.5">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-all border-l-[3px] border-transparent pl-[9px]"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Profile Settings</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border-l-[3px] border-transparent pl-[9px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
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
  const { user, profile } = useAuth();

  const isAdmin = isAdminProp ?? (profile?.role === 'admin');
  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 shadow-lg">
        <SidebarContent isAdmin={isAdmin} />
      </aside>

      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border bg-white/95 backdrop-blur-sm shrink-0 shadow-sm">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden shrink-0 text-foreground hover:bg-accent">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
              <SidebarContent isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Logo (mobile only) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">LearnLoom</span>
          </div>

          {title && <h1 className="hidden lg:block text-sm font-semibold text-foreground flex-1 min-w-0 truncate">{title}</h1>}
          <div className="flex-1 min-w-0" />

          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2 ml-2">
                <SignInButton>
                  <Button variant="outline" size="sm">Sign In</Button>
                </SignInButton>
                <SignUpButton>
                  <Button size="sm">Sign Up</Button>
                </SignUpButton>
              </div>
            </SignedOut>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
