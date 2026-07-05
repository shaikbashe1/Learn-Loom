import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { CommandPalette } from '@/components/shared/CommandPalette';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Bot,
  Terminal,
  FileText,
  Users,
  MessageSquare,
  Trophy,
  GraduationCap,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  Search,
  Sparkles,
  Flame,
  Coins,
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const studentNavItems = [
  { label: 'Dashboard',       path: '/dashboard',   icon: LayoutDashboard },
  { label: 'Courses',         path: '/courses',      icon: BookOpen },
  { label: 'AI Roadmap',      path: '/ai-roadmap',   icon: Compass },
  { label: 'AI Mentor',       path: '/ai-mentor',    icon: Bot },
  { 
    label: 'Coding Practice',          
    path: '/coding/dashboard', 
    icon: Terminal,
    subItems: [
      { label: 'Dashboard', path: '/coding/dashboard' },
      { label: 'Practice', path: '/coding/practice' },
      { label: 'Daily Challenge', path: '/coding/daily' },
      { label: 'Roadmaps', path: '/coding/roadmaps' },
      { label: 'Contests', path: '/coding/contests' },
      { label: 'Leaderboard', path: '/coding/leaderboard' },
      { label: 'Achievements', path: '/coding/achievements' },
      { label: 'My Submissions', path: '/coding/submissions' },
    ]
  },
  { label: 'Assignments',     path: '/assignments',  icon: FileText },
  { label: 'Community',       path: '/community',    icon: Users },
  { label: 'Messages',        path: '/messages',     icon: MessageSquare },
  { label: 'Leaderboard',     path: '/leaderboard',  icon: Trophy },
  { label: 'Grand Test',      path: '/grand-test',   icon: GraduationCap },
  { label: 'Certificates',    path: '/certificates', icon: GraduationCap },
  { label: 'Pricing',         path: '/pricing',      icon: CreditCard },
];

const adminNavItems = [
  { label: 'Admin Dashboard', path: '/admin',               icon: LayoutDashboard },
  { label: 'Review Drafts',   path: '/admin/courses/drafts', icon: FileText },
  { label: 'Manage Courses',  path: '/admin/courses',       icon: BookOpen },
  { label: 'Manage Students', path: '/admin/students',      icon: Users },
  { label: 'Messages',        path: '/messages',            icon: MessageSquare },
  { label: 'Certificates',    path: '/admin/certificates',  icon: GraduationCap },
  { label: 'Community',       path: '/admin/community',     icon: Users },
  { label: 'Submissions',     path: '/admin/submissions',   icon: FileText },
  { label: 'Reports',         path: '/admin/reports',       icon: FileText },
  { label: 'Roadmaps',        path: '/admin/roadmaps',      icon: Compass },
  { label: 'Coding Problems', path: '/admin/coding/problems', icon: Terminal },
];

export type NavItem = {
  label: string;
  path: string;
  icon: any;
  subItems?: { label: string; path: string; }[];
};

interface SidebarNavProps {
  items: NavItem[];
  isCollapsed: boolean;
  onClose?: () => void;
}

function SidebarNav({ items, isCollapsed, onClose }: SidebarNavProps) {
  const location = useLocation();
  const { unreadCount: unreadMessages } = useMessaging();

  return (
    <nav className="flex-1 flex flex-col gap-1 overflow-y-auto px-3 py-2 scrollbar-hide">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/dashboard' && item.path !== '/admin' &&
           location.pathname.startsWith(item.path));
        
        return (
          <div key={item.path} className="flex flex-col">
            <Link
              to={item.path}
              onClick={item.subItems ? undefined : onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative duration-200',
                isActive
                  ? 'text-primary font-semibold bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105", isActive && 'text-primary')} />
              {!isCollapsed && <span className="text-sm truncate flex-1">{item.label}</span>}
              
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/3 bottom-1/3 w-1 rounded-r bg-primary" />
              )}

              {item.path === '/messages' && unreadMessages > 0 && (
                <span className={cn(
                  "ml-auto bg-primary text-primary-foreground font-bold flex items-center justify-center rounded-full border-0 shrink-0",
                  isCollapsed ? "absolute top-1.5 right-1.5 h-2 w-2 p-0" : "text-[10px] h-5 min-w-[20px] px-1"
                )}>
                  {!isCollapsed && (unreadMessages > 99 ? '99+' : unreadMessages)}
                </span>
              )}
              
              {!isCollapsed && item.subItems && (
                <span className="material-symbols-outlined text-[18px]">
                  {location.pathname.startsWith('/coding') ? 'expand_less' : 'expand_more'}
                </span>
              )}
            </Link>

            {!isCollapsed && item.subItems && location.pathname.startsWith('/coding') && (
              <div className="flex flex-col ml-9 mt-1 gap-1 border-l-2 border-border/50 pl-3">
                {item.subItems.map((sub) => {
                  const isSubActive = location.pathname === sub.path;
                  return (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center px-2 py-1.5 rounded-md transition-all text-sm duration-200',
                        isSubActive
                          ? 'text-primary font-medium bg-primary/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    certificate: GraduationCap,
    quiz: CheckCircle2,
    reply: MessageSquare,
    system: Bell,
    info: AlertCircle,
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-200 flex items-center justify-center">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-popover border border-border shadow-lg rounded-2xl overflow-hidden" aria-live="polite">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-0">{unreadCount}</Badge>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n, i) => {
              const IconComponent = typeIcon[n.type] || Bell;
              return (
                <div key={n.id}>
                  {i > 0 && <Separator className="bg-border" />}
                  <DropdownMenuItem
                    className={cn(
                      'flex items-start gap-3 px-4 py-3.5 cursor-pointer rounded-none focus:bg-muted/50 transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                    onClick={() => void markRead(n.id)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs leading-normal', !n.read ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />}
                  </DropdownMenuItem>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SidebarContentProps {
  isAdmin?: boolean;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

function SidebarContent({ isAdmin, isCollapsed, onToggleCollapse, onClose }: SidebarContentProps) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNavItems : studentNavItems;
  const { isInstallable, installApp } = usePWAInstall();

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border relative select-none">
      {/* Header */}
      <div className={cn(
        "flex items-center py-5 px-4 border-b border-border bg-muted/10",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-8 h-8 object-contain shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-tight text-sm">LearnLoom</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider leading-none">
                {isAdmin ? 'Admin' : 'Student'}
              </span>
            </div>
          )}
        </Link>
        
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse} 
            className="hidden xl:flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <SidebarNav items={navItems} isCollapsed={isCollapsed} onClose={onClose} />

      {/* Footer Settings & Sign Out */}
      <div className="p-3 border-t border-border bg-muted/10 flex flex-col gap-1">
        {isInstallable && (
          <button
            onClick={() => { void installApp(); onClose?.(); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all group w-full text-left",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Install App" : undefined}
          >
            <Download className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            {!isCollapsed && <span className="text-sm font-semibold">Install App</span>}
          </button>
        )}
        <Link
          to="/profile"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all group",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0 transition-transform group-hover:rotate-45" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </Link>
        <button
          onClick={() => void handleSignOut()}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-destructive hover:bg-destructive/10 rounded-xl transition-all group w-full text-left",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  title?: string;
  fullWidth?: boolean;
  noFooter?: boolean;
}

export function AppLayout({ children, isAdmin: isAdminProp, fullWidth, noFooter }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const isAdmin = isAdminProp ?? (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'org_admin');
  const credits = profile?.credits ?? 0;
  const streak = profile?.streak_days ?? 0;

  const bottomNavItems = isAdmin 
    ? [
        { label: 'Home', path: '/admin', icon: LayoutDashboard },
        { label: 'Drafts', path: '/admin/courses/drafts', icon: FileText },
        { label: 'Courses', path: '/admin/courses', icon: BookOpen },
        { label: 'Students', path: '/admin/students', icon: Users },
      ]
    : [
        { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Courses', path: '/courses', icon: BookOpen },
        { label: 'Roadmap', path: '/ai-roadmap', icon: Compass },
        { label: 'Mentor', path: '/ai-mentor', icon: Bot },
      ];

  // Helper to generate breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const url = `/${paths.slice(0, index + 1).join('/')}`;
      const isLast = index === paths.length - 1;
      const formattedName = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      return { name: formattedName, url, isLast };
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-body-md text-body-md antialiased selection:bg-primary/20 selection:text-primary">
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "hidden xl:block shrink-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent 
          isAdmin={isAdmin} 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </aside>

      {/* Main Container */}
      <main className={cn(
        "flex-1 flex flex-col h-screen overflow-y-auto bg-background",
        noFooter ? "pb-0" : "pb-16 md:pb-0"
      )}>
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex justify-between items-center px-4 md:px-6 lg:px-8 py-3.5 w-full bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          {/* Mobile Menu Toggle & Title */}
          <div className="flex items-center gap-3">
            <div className="xl:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button className="text-muted-foreground p-1.5 hover:bg-muted rounded-xl flex items-center justify-center transition-colors min-w-[40px] min-h-[40px]">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 bg-card border-r border-border">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SidebarContent isAdmin={isAdmin} isCollapsed={false} onClose={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Breadcrumbs / Page Title */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground select-none">
              <Link to={isAdmin ? "/admin" : "/dashboard"} className="hover:text-foreground transition-colors font-medium">
                LearnLoom
              </Link>
              {getBreadcrumbs().map((crumb, index) => (
                <React.Fragment key={crumb.url}>
                  <ChevronRight size={12} className="text-muted-foreground/50" />
                  {crumb.isLast ? (
                    <span className="font-semibold text-foreground truncate max-w-[120px]">{crumb.name}</span>
                  ) : (
                    <Link to={crumb.url} className="hover:text-foreground transition-colors font-medium">
                      {crumb.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="md:hidden flex items-center gap-2">
              <img src="/images/logo/logo-icon.png" alt="LearnLoom Logo" className="w-6 h-6 object-contain" />
              <span className="font-bold text-sm text-foreground">LearnLoom</span>
            </div>
          </div>

          {/* Search Trigger Input */}
          <div className="flex-1 max-w-sm mx-4 relative hidden md:block select-none">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full bg-muted/60 hover:bg-muted border border-border rounded-xl py-2 pl-10 pr-3 text-left text-xs text-muted-foreground flex items-center justify-between transition-colors shadow-inner"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
                Search dashboard, courses, mentors...
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Button */}
            <button
              onClick={() => setCommandOpen(true)}
              className="md:hidden text-muted-foreground p-2 hover:bg-muted rounded-xl flex items-center justify-center transition-colors min-w-[40px] min-h-[40px]"
            >
              <Search className="h-5 w-5" />
            </button>

            {!isAdmin && (
              <>
                {/* Credits */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-full cursor-pointer transition-colors shadow-sm text-primary">
                  <Coins className="h-4 w-4 fill-primary/10" />
                  <span className="text-xs font-bold leading-none">{credits}</span>
                </div>
                {/* Streak */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-chart-3/5 hover:bg-chart-3/10 border border-chart-3/10 rounded-full text-chart-3 cursor-pointer transition-colors shadow-sm">
                  <Flame className="h-4 w-4 fill-chart-3/10" />
                  <span className="text-xs font-bold leading-none">{streak}d</span>
                </div>
              </>
            )}

            <NotificationBell />

            <div className="shrink-0 flex items-center justify-center">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all outline-none">
                      <UserAvatar src={profile?.avatar_url} name={profile?.full_name || user.email || 'User'} size="sm" role={profile?.role} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1 bg-popover border border-border shadow-lg rounded-2xl">
                    <div className="px-3 py-2.5 mb-1 border-b border-border">
                      <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2 px-3 text-xs">
                      <Link to="/profile" className="flex items-center gap-2 w-full">
                        <Settings className="h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem 
                      onClick={() => void handleSignOut()}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-xl py-2 px-3 text-xs flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/signup" className="text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 px-3.5 py-1.5 rounded-xl shadow-sm transition-all">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Canvas */}
        <div className={cn(
          "flex-1 w-full flex flex-col relative",
          fullWidth ? "p-0" : "px-4 md:px-6 lg:px-8 py-6"
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Nav Bar (Mobile only) */}
      {!noFooter && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border md:hidden safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors min-w-[48px] min-h-[48px] justify-center"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          </div>
        </nav>
      )}

      {/* Command Palette Modal */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
