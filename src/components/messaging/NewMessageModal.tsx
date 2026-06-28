import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSelect: (userId: string) => void;
}

export function NewMessageModal({ open, onOpenChange, onUserSelect }: NewMessageModalProps) {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allowedIds, setAllowedIds] = useState<Set<string> | null>(null);

  // Fetch allowed users once when modal opens
  useEffect(() => {
    if (open && user && profile) {
      setQuery('');
      setResults([]);
      
      const fetchAllowed = async () => {
        try {
          if (profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'org_admin') {
            // Admins can message anyone, no need to restrict IDs locally
            setAllowedIds(null);
            return;
          }

          const ids = new Set<string>();

          // Get admins (students can message admins)
          const { data: admins } = await supabase.from('public_profiles').select('id').in('role', ['admin', 'super_admin', 'org_admin']);
          if (admins) admins.forEach(a => ids.add(a.id));

          // If student: get instructors of enrolled courses
          const { data: enrollments } = await supabase
            .from('user_course_enrollments')
            .select('courses(created_by)')
            .eq('user_id', user.id);
            
          if (enrollments) {
            enrollments.forEach((e: any) => {
              if (e.courses?.created_by) ids.add(e.courses.created_by);
            });
          }

          // If instructor (has created courses): get enrolled students
          const { data: myCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('created_by', user.id);
            
          if (myCourses && myCourses.length > 0) {
            const courseIds = myCourses.map(c => c.id);
            const { data: studentEnrollments } = await supabase
              .from('user_course_enrollments')
              .select('user_id')
              .in('course_id', courseIds);
              
            if (studentEnrollments) {
              studentEnrollments.forEach(e => ids.add(e.user_id));
            }
          }

          ids.delete(user.id);
          setAllowedIds(ids);
        } catch (err) {
          console.error("Failed to fetch allowed IDs", err);
        }
      };
      
      fetchAllowed();
    }
  }, [open, user, profile]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    
    try {
      let q = supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url, role')
        .ilike('full_name', `%${query}%`)
        .neq('id', user?.id)
        .limit(20);
        
      const { data, error } = await q;
      if (error) throw error;
      
      let filteredData = data;
      if (allowedIds !== null) {
        filteredData = data.filter(u => allowedIds.has(u.id));
      }
      
      setResults(filteredData || []);
    } catch (err) {
      toast.error('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface border border-border-base rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border-base bg-surface-container-lowest">
          <DialogTitle className="text-xl font-bold font-display text-text-primary">New Message</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-text-secondary" />
              <Input
                placeholder="Search by name..."
                className="pl-10 bg-surface-container-low border-outline-variant/60 focus:border-primary"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={() => void handleSearch()} disabled={loading} className="font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
            {results.length === 0 && query && !loading && (
              <div className="text-center py-8 text-text-secondary">
                No users found that you can message.
              </div>
            )}
            
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => onUserSelect(u.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors text-left group border border-transparent hover:border-border-base"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
                    {u.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-text-primary text-sm leading-tight">{u.full_name}</h4>
                  <p className="text-xs text-text-secondary capitalize">{u.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
