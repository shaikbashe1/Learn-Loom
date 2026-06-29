import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging, type Message } from '@/contexts/MessagingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { NewMessageModal } from '@/components/messaging/NewMessageModal';
import { supabase } from '@/db/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Loader2, 
  MessageSquarePlus, 
  Clock, 
  Search,
  MessageSquare,
  SearchCode,
  UserPlus
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.conversation.id === activeConvId);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.otherParticipant?.profiles?.full_name?.toLowerCase().includes(q);
    const msgMatch = c.lastMessage?.content?.toLowerCase().includes(q);
    return nameMatch || msgMatch;
  });

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
    <AppLayout>
      <div className="max-w-7xl mx-auto w-full px-margin-mobile md:px-margin-desktop py-6 h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6">
        
        {/* Left Pane: Conversations List */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/5 select-none">
            <h2 className="text-base font-bold text-foreground">Messages</h2>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="rounded-xl shadow-sm h-8 px-3 text-xs font-bold gap-1">
              <MessageSquarePlus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
          
          <div className="p-3 border-b border-border bg-muted/5 select-none">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search chats..."
                className="pl-9 bg-card border-border focus:border-primary rounded-xl h-9 w-full shadow-inner text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-4 select-none">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Loading variant="skeleton" className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Loading variant="skeleton" className="h-3 w-3/4 rounded" />
                      <Loading variant="skeleton" className="h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground select-none">
                <SearchCode className="w-10 h-10 opacity-30 mb-3" />
                <p className="text-xs font-bold text-foreground">No conversations found</p>
                {searchQuery ? (
                  <p className="text-[11px] mt-1 leading-normal">Try a different search term.</p>
                ) : (
                  <p className="text-[11px] mt-1 leading-normal">Start a new chat to connect with peers!</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filteredConversations.map(conv => {
                  const isActive = activeConvId === conv.conversation.id;
                  return (
                    <button
                      key={conv.conversation.id}
                      onClick={() => setActiveConvId(conv.conversation.id)}
                      className={cn(
                        "w-full p-4 flex items-start gap-3 transition-colors text-left relative select-none",
                        isActive ? 'bg-primary/5' : 'hover:bg-muted/30'
                      )}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar 
                          src={conv.otherParticipant?.profiles?.avatar_url} 
                          name={conv.otherParticipant?.profiles?.full_name || ''} 
                          size="md" 
                        />
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center text-[9px] font-extrabold text-white">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-xs text-foreground truncate pr-2">
                            {conv.otherParticipant?.profiles?.full_name || 'Unknown User'}
                          </h4>
                          <span className="text-[9px] text-muted-foreground font-semibold whitespace-nowrap">
                            {conv.lastMessage ? formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs truncate leading-normal", 
                          conv.unreadCount > 0 ? 'font-bold text-foreground' : 'text-muted-foreground'
                        )}>
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.sender_id === user?.id && <span className="text-muted-foreground mr-1 font-semibold">You:</span>}
                              {conv.lastMessage.content}
                            </>
                          ) : 'Started a conversation'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat */}
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden h-[50vh] md:h-full">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5 select-none">
              <MessageSquare className="w-12 h-12 opacity-30 mb-4 animate-bounce" />
              <h3 className="text-base font-bold text-foreground mb-1">Your Messages</h3>
              <p className="text-xs leading-normal max-w-xs">Select a conversation or start a new chat with your classmates or instructors.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/5 flex items-center gap-3 select-none">
                <UserAvatar 
                  src={activeConv.otherParticipant?.profiles?.avatar_url} 
                  name={activeConv.otherParticipant?.profiles?.full_name || ''} 
                  size="md" 
                />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">{activeConv.otherParticipant?.profiles?.full_name}</h3>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">{activeConv.otherParticipant?.profiles?.role}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {messagesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMine ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl p-3.5 shadow-sm",
                          isMine 
                            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                            : 'bg-card border border-border text-foreground rounded-tl-sm'
                        )}>
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1.5 text-[9px] font-semibold select-none", 
                            isMine ? 'text-primary-foreground/75' : 'text-muted-foreground'
                          )}>
                            <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                            {isMine && (
                              <span>
                                {msg.read_at ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-primary-foreground" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
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
              <div className="p-4 bg-card border-t border-border">
                <form 
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); void handleSendMessage(); }}
                >
                  <Input
                    placeholder="Type a message..."
                    className="flex-1 bg-muted/20 border-border focus:border-primary rounded-xl px-4 text-xs h-10"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending} 
                    className="rounded-xl w-10 h-10 p-0 flex items-center justify-center bg-primary hover:opacity-90 transition-opacity"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4.5 h-4.5 text-white -ml-0.5" />}
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
