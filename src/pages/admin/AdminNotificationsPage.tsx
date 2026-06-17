import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Send, Loader2, Users, AlertCircle, Info, CheckCircle2, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NotificationRow {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  created_at: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });

  const fetchNotifications = async () => {
    setLoading(true);
    // Fetch only broadcast or system recent notifications
    const { data, error } = await supabase.from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) toast.error('Failed to load notifications');
    else setNotifications(data as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSending(true);

    const payload = {
      title: form.title,
      message: form.message,
      type: form.type,
      user_id: form.user_id.trim() === '' ? null : form.user_id.trim(),
    };

    const { error } = await supabase.from('notifications').insert(payload);
    
    if (error) {
      toast.error('Failed to send notification');
    } else {
      toast.success(payload.user_id ? 'Notification sent to user' : 'Broadcast sent to all users');
      setForm({ title: '', message: '', type: 'info', user_id: '' });
      fetchNotifications();
    }
    setSending(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-error" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <AppLayout title="Notification Center" isAdmin>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col gap-stack-lg w-full">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary tracking-tight">Notification Center</h1>
            <p className="font-body-md text-[16px] text-text-secondary mt-2 max-w-2xl">
              Broadcast system updates, feature releases, or direct messages to students.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          
          {/* Broadcaster Form */}
          <div className="lg:col-span-5">
            <form onSubmit={handleBroadcast} className="glass-panel p-6 md:p-8 rounded-2xl border border-border-base shadow-sm flex flex-col gap-6 sticky top-24">
              <div className="flex items-center gap-3 border-b border-border-base pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Send className="w-5 h-5" />
                </div>
                <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Send Broadcast</h2>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Recipient (Leave blank for ALL users)</Label>
                  <Input 
                    placeholder="User ID (optional)" 
                    className="bg-surface-container border-border-base text-text-primary h-12 text-[14px] focus:ring-2 focus:ring-primary shadow-inner" 
                    value={form.user_id}
                    onChange={e => setForm({ ...form, user_id: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Title <span className="text-error">*</span></Label>
                  <Input 
                    placeholder="e.g. Platform Maintenance" 
                    className="bg-surface-container border-border-base text-text-primary h-12 text-[14px] focus:ring-2 focus:ring-primary shadow-inner" 
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Message <span className="text-error">*</span></Label>
                  <Textarea 
                    placeholder="Enter message details..."
                    className="bg-surface-container border-border-base text-text-primary min-h-[140px] text-[14px] p-4 focus:ring-2 focus:ring-primary shadow-inner resize-none" 
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-text-primary">Notification Type</Label>
                  <div className="relative">
                    <select 
                      className="w-full bg-surface-container border border-border-base rounded-xl px-4 py-3 text-[14px] font-bold text-text-primary focus:ring-2 focus:ring-primary outline-none appearance-none shadow-inner"
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="info">Info / Announcement</option>
                      <option value="success">Success / Milestone</option>
                      <option value="warning">Warning / Alert</option>
                      <option value="error">Critical Error</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="material-symbols-outlined text-text-secondary text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-base mt-2">
                <button type="submit" disabled={sending} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed card-lift">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                  {form.user_id ? 'Send to User' : 'Broadcast to All'}
                </button>
              </div>
            </form>
          </div>

          {/* History Log */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-2xl border border-border-base shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-6 md:px-8 py-5 border-b border-border-base flex items-center gap-3 bg-surface/50">
                <History className="w-6 h-6 text-primary" />
                <h2 className="font-headline-md text-[20px] font-bold text-text-primary">Recent Broadcasts</h2>
              </div>
              
              <div className="p-6 md:p-8 flex-1 bg-surface-container/20 overflow-y-auto custom-scrollbar max-h-[800px]">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 w-full rounded-xl bg-surface-container" />
                    <Skeleton className="h-28 w-full rounded-xl bg-surface-container" />
                    <Skeleton className="h-28 w-full rounded-xl bg-surface-container" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-16">
                     <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 border border-border-base">
                       <Bell className="w-6 h-6 text-text-secondary" />
                     </div>
                     <p className="font-headline-md text-[18px] font-bold text-text-primary">No recent notifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-5 md:p-6 bg-surface border border-border-base shadow-sm rounded-xl flex gap-4 md:gap-5 hover:border-primary/50 transition-colors group">
                        <div className={`shrink-0 mt-1 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                          notif.type === 'success' ? 'bg-success/10 border-success/20' : 
                          notif.type === 'warning' ? 'bg-warning/10 border-warning/20' : 
                          notif.type === 'error' ? 'bg-error/10 border-error/20' : 'bg-primary/10 border-primary/20'
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-4 mb-2">
                            <h4 className="font-bold text-[16px] text-text-primary group-hover:text-primary transition-colors">{notif.title}</h4>
                            <span className="text-[12px] font-medium text-text-secondary whitespace-nowrap">{new Date(notif.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-[14px] text-text-secondary whitespace-pre-wrap leading-relaxed mb-4">{notif.message}</p>
                          
                          <div className="inline-flex items-center px-3 py-1.5 bg-surface-container border border-border-base rounded-md text-[11px] font-bold tracking-wider uppercase text-text-secondary shadow-sm">
                            <Users className="w-3.5 h-3.5 mr-2" />
                            {notif.user_id ? 'Direct Message' : 'Global Broadcast'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
