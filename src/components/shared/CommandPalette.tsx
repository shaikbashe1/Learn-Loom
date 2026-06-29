import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  BookOpen,
  Map,
  Terminal,
  MessageSquare,
  Trophy,
  User,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'org_admin';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Suggestions">
          {!isAdmin ? (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Go to Student Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/courses'))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Browse Courses</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/ai-roadmap'))}>
                <Map className="mr-2 h-4 w-4" />
                <span>AI Roadmap</span>
              </CommandItem>
            </>
          ) : (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin'))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Go to Admin Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin/courses'))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Manage Courses</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Learning & Practice">
          <CommandItem onSelect={() => runCommand(() => navigate('/coding'))}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Coding Practice Workspace</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/ai-mentor'))}>
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            <span>AI Mentor Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/leaderboard'))}>
            <Trophy className="mr-2 h-4 w-4" />
            <span>Leaderboard & Rankings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Social">
          <CommandItem onSelect={() => runCommand(() => navigate('/community'))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Community Feed</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/messages'))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Direct Messages</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
