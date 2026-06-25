import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';

export function AdminDraftCoursesPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    // Fetch courses based on the new 'status' column
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, difficulty, status, quality_score, source_url, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('Failed to load drafts', { description: error.message });
    } else {
      setDrafts(data || []);
    }
    setLoading(false);
  };

  const handleReview = async (courseId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'approve') {
        const { error } = await supabase.from('courses').update({ status: 'published', is_published: true }).eq('id', courseId);
        if (error) throw error;
        toast.success(`Course approved and published successfully!`);
      } else if (action === 'reject') {
        const { error } = await supabase.from('courses').update({ status: 'rejected', is_published: false }).eq('id', courseId);
        if (error) throw error;
        toast.success(`Course rejected. Requires manual fix.`);
      } else if (action === 'delete') {
        const { error } = await supabase.from('courses').delete().eq('id', courseId);
        if (error) throw error;
        toast.success(`Draft course permanently deleted.`);
      }
      fetchDrafts(); // Refresh list
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
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Course Moderation Queue</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">Review and approve auto-generated courses from the autonomous crawler.</p>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 bg-surface p-4 rounded-xl border border-border-base shadow-sm">
          <Input 
            placeholder="Search courses..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md bg-background border-border-base"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border-border-base">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-base text-text-primary">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="published">Approved (Published)</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchDrafts} className="border-border-base hover:bg-surface-container">Refresh List</Button>
        </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading queue...</div>
      ) : filteredDrafts.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-xl border border-dashed border-border-base text-text-secondary">
          No courses found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrafts.map((course) => (
            <Card key={course.id} className="group overflow-hidden border-border-base hover:border-primary/50 transition-all shadow-sm hover:shadow-md bg-surface flex flex-col">
              <CardHeader className="pb-3 border-b border-border-base/30 bg-surface-container/20">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className={`
                    ${course.status === 'pending_review' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}
                    ${course.status === 'published' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                    ${course.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' : ''}
                  `}>
                    {course.status === 'pending_review' && <Clock className="w-3 h-3 mr-1 inline" />}
                    {course.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                  </Badge>
                  {course.quality_score > 0 && (
                    <div className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                      Score: {course.quality_score}/100
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-2">{course.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                <div>
                  {course.description && (
                    <p className="text-sm text-text-secondary line-clamp-3 mb-4">{course.description}</p>
                  )}
                  {course.source_url && (
                    <a href={course.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block mb-4 truncate">
                      Source: {course.source_url}
                    </a>
                  )}
                </div>
                
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/courses/${course.id}`} className="w-full">
                      <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5">
                        <Eye className="w-4 h-4" /> Preview
                      </Button>
                    </Link>
                    {course.status !== 'published' ? (
                      <Button onClick={() => handleReview(course.id, 'approve')} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </Button>
                    ) : (
                      <Button disabled variant="secondary" className="w-full">Published</Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => handleReview(course.id, 'reject')} className="w-full gap-2 text-amber-600 hover:bg-amber-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button variant="outline" onClick={() => handleReview(course.id, 'delete')} className="w-full gap-2 text-red-600 hover:bg-red-50 border-red-200">
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
