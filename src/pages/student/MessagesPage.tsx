import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging, type ConversationDetail, type Message } from '@/contexts/MessagingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NewMessageModal } from '@/components/messaging/NewMessageModal';
import { supabase } from '@/db/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { Send, Check, CheckCheck, Loader2, MessageSquarePlus, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function MessagesPage() {
  const { user } = useAuth();
  const { conversations, loading, refreshConversations, markConversationAsRead } = useMessaging();
  
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.conversation.id === activeConvId);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setMessagesLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
      setMessagesLoading(false);
      setTimeout(() => scrollToBottom(), 100);
      
      // Mark as read
      if (activeConv?.unreadCount && activeConv.unreadCount > 0) {
        await markConversationAsRead(activeConvId);
      }
    };
    
    fetchMessages();
  }, [activeConvId, activeConv?.unreadCount]);

  // Subscribe to real-time new messages for the active conversation
  useEffect(() => {
    if (!activeConvId) return;
    
    const channel = supabase
      .channel(`active-conv-${activeConvId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages(prev => {
            // avoid duplicates
            if (prev.find(m => m.id === payload.new.id)) return prev;
            setTimeout(() => scrollToBottom(), 100);
            return [...prev, payload.new as Message];
          });
          // If the message is from someone else, mark it as read immediately since we are viewing it
          if (payload.new.sender_id !== user?.id) {
            void markConversationAsRead(activeConvId);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? (payload.new as Message) : m));
        }
      )
      .subscribe();
      
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeConvId, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConvId || !user) return;
    
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          sender_id: user.id,
          content
        });
        
      if (error) throw error;
      await refreshConversations(); // Update the sidebar last message preview
    } catch (err: any) {
      console.error('Send message error:', err);
      toast.error(`Failed to send message: ${err.message || 'Unknown error'}`);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewConversation = async (recipientId: string) => {
    setIsModalOpen(false);
    if (!user) return;

    // Check if conversation already exists with this user
    // We look for a conversation where both users are participants
    const existing = conversations.find(c => c.otherParticipant?.user_id === recipientId);
    if (existing) {
      setActiveConvId(existing.conversation.id);
      return;
    }

    // Create a new conversation
    try {
      // 1. Create conversation
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();
      if (convErr) throw convErr;

      // 2. Add participants
      const { error: partErr } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: convData.id, user_id: user.id },
          { conversation_id: convData.id, user_id: recipientId }
        ]);
        
      if (partErr) {
        // If RLS rejects it because of missing permission, this will throw
        throw partErr;
      }

      await refreshConversations();
      setActiveConvId(convData.id);
      toast.success('Conversation started');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to start conversation. You may not have permission to message this user.');
    }
  };

  return (
    <AppLayout title="Messages">
      <div className="max-w-7xl mx-auto w-full px-4 py-8 h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6">
        
        {/* Left Pane: Conversations List */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-surface border border-border-base rounded-2xl shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border-base bg-surface-container-lowest flex justify-between items-center">
            <h2 className="text-xl font-bold font-display text-text-primary">Messages</h2>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="rounded-full shadow-sm">
              <MessageSquarePlus className="w-4 h-4 mr-2" /> New
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-text-secondary">
                <span className="material-symbols-outlined text-4xl opacity-50 mb-3">chat_bubble</span>
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Start a conversation!</p>
              </div>
            ) : (
              <div className="divide-y divide-border-base">
                {conversations.map(conv => (
                  <button
                    key={conv.conversation.id}
                    onClick={() => setActiveConvId(conv.conversation.id)}
                    className={`w-full p-4 flex items-start gap-3 transition-colors text-left relative ${
                      activeConvId === conv.conversation.id 
                        ? 'bg-primary/5' 
                        : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="relative">
                      {conv.otherParticipant?.profiles?.avatar_url ? (
                        <img 
                          src={conv.otherParticipant.profiles.avatar_url} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover shadow-sm" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                          {conv.otherParticipant?.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-bold text-white">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-sm text-text-primary truncate pr-2">
                          {conv.otherParticipant?.profiles?.full_name || 'Unknown User'}
                        </h4>
                        <span className="text-[10px] text-text-secondary whitespace-nowrap">
                          {conv.lastMessage ? formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                        {conv.lastMessage ? (
                          <>
                            {conv.lastMessage.sender_id === user?.id && <span className="text-text-secondary mr-1 font-normal">You:</span>}
                            {conv.lastMessage.content}
                          </>
                        ) : 'Started a conversation'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat */}
        <div className="flex-1 bg-surface border border-border-base rounded-2xl shadow-sm flex flex-col overflow-hidden h-[50vh] md:h-full">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8 text-center bg-surface-container-lowest/30">
              <span className="material-symbols-outlined text-6xl opacity-30 mb-4">forum</span>
              <h3 className="text-xl font-bold text-text-primary mb-2">Your Messages</h3>
              <p>Select a conversation or start a new one.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-base bg-surface-container-lowest flex items-center gap-3">
                {activeConv.otherParticipant?.profiles?.avatar_url ? (
                  <img src={activeConv.otherParticipant.profiles.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {activeConv.otherParticipant?.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-text-primary">{activeConv.otherParticipant?.profiles?.full_name}</h3>
                  <p className="text-xs text-text-secondary capitalize">{activeConv.otherParticipant?.profiles?.role}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest/50">
                {messagesLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                          isMine 
                            ? 'bg-primary text-white rounded-tr-sm' 
                            : 'bg-surface-container-low border border-border-base text-text-primary rounded-tl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-text-secondary'}`}>
                            <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                            {isMine && (
                              <span>
                                {msg.read_at ? (
                                  <CheckCheck className="w-3 h-3 text-blue-200" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-surface-container-lowest border-t border-border-base">
                <form 
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); void handleSendMessage(); }}
                >
                  <Input
                    placeholder="Type a message..."
                    className="flex-1 bg-surface border-border-base focus:border-primary rounded-full px-4"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" disabled={!newMessage.trim() || sending} className="rounded-full w-10 h-10 p-0 flex items-center justify-center bg-primary hover:bg-primary-fixed-dim">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white -ml-0.5" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      
      <NewMessageModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onUserSelect={handleStartNewConversation}
      />
    </AppLayout>
  );
}
