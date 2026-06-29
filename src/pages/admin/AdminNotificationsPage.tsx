import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  Send, 
  Loader2, 
  Users, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  History,
  ChevronDown
} from 'lucide-react';
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
  
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });

  const fetchNotifications = async () => {
    setLoading(true);
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
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AppLayout title="Notification Center" isAdmin>
      <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full select-none">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Notification Center</h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Broadcast system updates, feature releases, or direct messages to students.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          
          {/* Broadcaster Form */}
          <div className="lg:col-span-5">
            <form onSubmit={handleBroadcast} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col gap-6 sticky top-24">
              <div className="flex items-center gap-2.5 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                  <Send className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Send Broadcast</h2>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Recipient (Leave blank for ALL users)</Label>
                  <Input 
                    placeholder="User ID (optional)" 
                    className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner" 
                    value={form.user_id}
                    onChange={e => setForm({ ...form, user_id: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Title <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="e.g. Platform Maintenance" 
                    className="bg-background border-border text-xs h-11 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner font-medium" 
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Message <span className="text-destructive">*</span></Label>
                  <Textarea 
                    placeholder="Enter message details..."
                    className="bg-background border-border min-h-[140px] text-xs p-4 rounded-xl focus:ring-primary/20 focus:border-primary shadow-inner resize-none font-medium leading-relaxed" 
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Notification Type</Label>
                  <div className="relative">
                    <select 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none appearance-none shadow-inner"
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="info">Info / Announcement</option>
                      <option value="success">Success / Milestone</option>
                      <option value="warning">Warning / Alert</option>
                      <option value="error">Critical Error</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border mt-2">
                <Button 
                  type="submit" 
                  disabled={sending} 
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {sending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Bell className="w-4.5 h-4.5" />}
                  <span>{form.user_id ? 'Send to User' : 'Broadcast to All'}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* History Log */}
          <div className="lg:col-span-7">
            <div className="bg-card rounded-3xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-2.5 bg-muted/20">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Recent Broadcasts</h2>
              </div>
              
              <div className="p-6 flex-1 bg-muted/5 overflow-y-auto max-h-[800px]">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-16">
                     <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                       <Bell className="w-6 h-6 text-muted-foreground/40" />
                     </div>
                     <p className="text-xs font-bold text-foreground">No recent notifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-5 bg-card border border-border shadow-sm rounded-2xl flex gap-4 hover:border-border/80 transition-all group">
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                          notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                          notif.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 
                          notif.type === 'error' ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-4 mb-1.5">
                            <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap">
                              {new Date(notif.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4 font-medium">
                            {notif.message}
                          </p>
                          
                          <div className="inline-flex items-center px-2.5 py-1 bg-muted border border-border rounded-lg text-[9px] font-extrabold tracking-wider uppercase text-muted-foreground shadow-sm">
                            <Users className="w-3 h-3 mr-1.5 text-muted-foreground/80" />
                            <span>{notif.user_id ? 'Direct Message' : 'Global Broadcast'}</span>
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
