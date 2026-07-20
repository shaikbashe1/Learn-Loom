import { useEffect, useState } from 'react';
import { db } from '@/db/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2,
  Search,
  RefreshCw
} from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';

export default function AdminDraftCoursesPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrafts(data);
    } catch (error: any) {
      toast.error('Failed to load drafts', { description: error.message });
    }
    setLoading(false);
  };

  const handleReview = async (courseId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'approve') {
        await updateDoc(doc(db, 'courses', courseId), { status: 'published', is_published: true });
        toast.success(`Course approved and published successfully!`);
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'courses', courseId), { status: 'rejected', is_published: false });
        toast.success(`Course rejected. Requires manual fix.`);
      } else if (action === 'delete') {
        await deleteDoc(doc(db, 'courses', courseId));
        toast.success(`Draft course permanently deleted.`);
      }
      fetchDrafts();
    } catch (err) {
      toast.error('Action failed', { description: 'Could not update course status.' });
    }
  };

  const filteredDrafts = drafts.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout title="Course Moderation Queue" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Course Moderation Queue</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Review and approve auto-generated courses from the autonomous crawler.
            </p>
          </div>
        </section>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4.5 h-4.5" />
            <Input 
              placeholder="Search courses..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-background border-border text-xs h-10 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner font-medium placeholder:text-muted-foreground/60"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border-border text-xs h-10 rounded-xl font-bold">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="published">Approved (Published)</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={fetchDrafts} 
            className="border-border text-foreground hover:bg-muted/50 h-10 rounded-xl text-xs font-bold shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            <span>Refresh</span>
          </Button>
        </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[280px] bg-muted rounded-3xl" />)}
          </div>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border text-muted-foreground">
          <p className="text-xs font-semibold">No courses found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrafts.map((course) => (
            <Card key={course.id} className="group overflow-hidden border-border hover:border-border/85 transition-all shadow-sm bg-card flex flex-col rounded-3xl">
              <CardHeader className="pb-3 border-b border-border bg-muted/15">
                <div className="flex justify-between items-start gap-2">
                  <Badge className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                    course.status === 'pending_review' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    course.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    course.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {course.status === 'pending_review' && <Clock className="w-3.5 h-3.5 mr-1" />}
                    <span>{course.status?.replace('_', ' ') || 'DRAFT'}</span>
                  </Badge>
                  
                  {course.quality_score > 0 && (
                    <div className="text-[10px] font-extrabold px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                      Score: {course.quality_score}/100
                    </div>
                  )}
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-3 line-clamp-2 leading-snug">
                  {course.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-4 flex-grow flex flex-col justify-between p-6">
                <div>
                  {course.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed font-semibold">
                      {course.description}
                    </p>
                  )}
                  {course.source_url && (
                    <a 
                      href={course.source_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] text-primary hover:underline block mb-4 truncate font-bold"
                    >
                      Source: {course.source_url}
                    </a>
                  )}
                </div>
                
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/courses/${course.id}`} className="w-full">
                      <Button variant="outline" className="w-full gap-1.5 border-border text-foreground hover:bg-muted/50 text-xs font-bold rounded-xl h-10">
                        <Eye className="w-4 h-4" /> Preview
                      </Button>
                    </Link>
                    
                    {course.status !== 'published' ? (
                      <Button 
                        onClick={() => handleReview(course.id, 'approve')} 
                        className="w-full gap-1.5 bg-emerald-500 hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold rounded-xl h-10"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </Button>
                    ) : (
                      <Button disabled variant="secondary" className="w-full rounded-xl h-10 text-xs font-bold">
                        Published
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleReview(course.id, 'reject')} 
                      className="w-full gap-1.5 text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-xs font-bold rounded-xl h-10"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleReview(course.id, 'delete')} 
                      className="w-full gap-1.5 text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-xs font-bold rounded-xl h-10"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
export { AdminDraftCoursesPage };
