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
      case 'success': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-error" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AppLayout title="Notification Center" isAdmin>
      <div className="max-w-[1440px] mx-auto w-full space-y-xl pb-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-xl mb-2xl">
          <div className="space-y-2">
            <h1 className="font-display text-display text-on-surface">Notification Center</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">Broadcast system updates, feature releases, or direct messages to students.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          
          {/* Broadcaster Form */}
          <div className="lg:col-span-5">
            <form onSubmit={handleBroadcast} className="glass-panel p-xl rounded-2xl flex flex-col gap-xl sticky top-24">
              <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                <Send className="w-6 h-6 text-primary" />
                <h2 className="font-headline-md text-on-surface">Send Broadcast</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-on-surface">Recipient (Leave blank for ALL users)</Label>
                  <Input 
                    placeholder="User ID (optional)" 
                    className="bg-surface-container-lowest border-outline-variant text-on-surface" 
                    value={form.user_id}
                    onChange={e => setForm({ ...form, user_id: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-on-surface">Title <span className="text-error">*</span></Label>
                  <Input 
                    placeholder="e.g. Platform Maintenance" 
                    className="bg-surface-container-lowest border-outline-variant text-on-surface" 
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-on-surface">Message <span className="text-error">*</span></Label>
                  <Textarea 
                    placeholder="Enter message details..."
                    className="bg-surface-container-lowest border-outline-variant text-on-surface min-h-[120px]" 
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-on-surface">Notification Type</Label>
                  <select 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 py-2 text-on-surface focus:ring-1 focus:ring-primary outline-none"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="info">Info / Announcement</option>
                    <option value="success">Success / Milestone</option>
                    <option value="warning">Warning / Alert</option>
                    <option value="error">Critical Error</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/30">
                <Button type="submit" disabled={sending} className="w-full bg-primary text-on-primary font-bold py-6 flex items-center gap-2 rounded-xl text-lg">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                  {form.user_id ? 'Send to User' : 'Broadcast to All'}
                </Button>
              </div>
            </form>
          </div>

          {/* History Log */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-2xl flex flex-col h-full">
              <div className="p-xl border-b border-outline-variant/30 flex items-center gap-3">
                <History className="w-6 h-6 text-on-surface-variant" />
                <h2 className="font-headline-md text-on-surface">Recent Broadcasts</h2>
              </div>
              
              <div className="p-md flex-1">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-on-surface-variant py-16">
                    No recent notifications found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-lg bg-surface-container-lowest border border-outline-variant/40 rounded-xl flex gap-4 hover:border-primary/50 transition-colors">
                        <div className={`mt-1 p-2 rounded-full h-fit ${
                          notif.type === 'success' ? 'bg-success/10' : 
                          notif.type === 'warning' ? 'bg-warning/10' : 
                          notif.type === 'error' ? 'bg-error/10' : 'bg-primary/10'
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-on-surface">{notif.title}</h4>
                            <span className="text-xs text-outline">{new Date(notif.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{notif.message}</p>
                          
                          <div className="mt-3 inline-flex items-center px-2 py-1 bg-surface-container rounded-md text-xs font-medium text-on-surface-variant border border-outline-variant/30">
                            <Users className="w-3 h-3 mr-1.5 opacity-70" />
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
