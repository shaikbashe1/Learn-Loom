import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
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

  // Helper for chunking arrays for Firestore 'in' queries
  const chunkArray = (arr: any[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

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
          const adminsSnap = await getDocs(
            query(collection(db, 'public_profiles'), where('role', 'in', ['admin', 'super_admin', 'org_admin']))
          );
          adminsSnap.forEach(docSnap => ids.add(docSnap.id));

          // If student: get instructors of enrolled courses
          const enrollmentsSnap = await getDocs(
            query(collection(db, 'user_course_enrollments'), where('user_id', '==', user.id))
          );
          const enrolledCourseIds = enrollmentsSnap.docs.map(docSnap => docSnap.data().course_id).filter(Boolean);
          
          if (enrolledCourseIds.length > 0) {
            const courseDocs = await Promise.all(
              enrolledCourseIds.map(id => getDoc(doc(db, 'courses', id)))
            );
            courseDocs.forEach(docSnap => {
              if (docSnap.exists() && docSnap.data().created_by) {
                ids.add(docSnap.data().created_by);
              }
            });
          }

          // If instructor (has created courses): get enrolled students
          const myCoursesSnap = await getDocs(
            query(collection(db, 'courses'), where('created_by', '==', user.id))
          );
          const myCourseIds = myCoursesSnap.docs.map(docSnap => docSnap.id);
          
          if (myCourseIds.length > 0) {
            for (const chunk of chunkArray(myCourseIds, 10)) {
              const studentEnrollmentsSnap = await getDocs(
                query(collection(db, 'user_course_enrollments'), where('course_id', 'in', chunk))
              );
              studentEnrollmentsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.user_id) ids.add(data.user_id);
              });
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

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    
    try {
      // In Firestore, we do client-side filtering for case-insensitive substring search
      const profilesSnap = await getDocs(collection(db, 'public_profiles'));
      
      let data = profilesSnap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any))
        .filter(u => 
          u.id !== user?.id && 
          u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 20);
      
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

  // Live search as user types
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-surface border border-border-base rounded-3xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-8 py-6 border-b border-border-base bg-surface-container-lowest">
          <DialogTitle className="text-2xl font-bold font-display text-text-primary">Start a Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="p-8 space-y-6 bg-surface-container-lowest/30">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-text-secondary group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name to find someone..."
              className="pl-14 pr-12 h-16 text-lg rounded-2xl bg-surface border-2 border-border-base focus:border-primary shadow-sm focus:shadow-md transition-all placeholder:text-text-secondary/60"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-primary" />
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-3 mt-4 pr-2 custom-scrollbar">
            {results.length === 0 && query && !loading && (
              <div className="text-center py-8 text-text-secondary">
                No users found that you can message.
              </div>
            )}
            
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => onUserSelect(u.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border-base hover:border-primary/50 hover:shadow-md transition-all text-left group"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} className="w-14 h-14 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform ring-2 ring-transparent group-hover:ring-primary/20" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform ring-2 ring-transparent group-hover:ring-primary/20">
                    {u.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-text-primary text-base leading-tight group-hover:text-primary transition-colors">{u.full_name}</h4>
                  <p className="text-sm text-text-secondary capitalize mt-0.5">{u.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
