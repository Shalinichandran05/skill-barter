// src/pages/user/Messages.jsx
// Full WhatsApp-style chat page
// Left panel: conversation list | Right panel: active chat

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatTime } from '../../utils/time';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSupabase } from '../../context/SupabaseContext';
import { Spinner } from '../../components/common';
import toast from 'react-hot-toast';

// ── Avatar ────────────────────────────────────────────────
const Avatar = ({ src, name, size = 'sm' }) => {
  const s = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={`${s} rounded-full bg-maroon-950/60 border border-maroon-800/30
                     flex items-center justify-center font-bold shrink-0 overflow-hidden`}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : name?.[0]?.toUpperCase()
      }
    </div>
  );
};

export default function MessagesPage() {
  const { user }       = useAuth();
  const supabase       = useSupabase();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeUser,    setActiveUser]    = useState(null);  // { id, name, avatar_url }
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [mobileView,    setMobileView]    = useState('list'); // 'list' | 'chat'

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data);
    } catch (_) {}
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // If ?userId= param in URL (coming from Message button), open that chat
  useEffect(() => {
    const userId = searchParams.get('userId');
    const name   = searchParams.get('name');
    const avatar = searchParams.get('avatar');
    if (userId) {
      setActiveUser({ id: parseInt(userId), name: name || 'User', avatar_url: avatar || null });
      setMobileView('chat');
    }
  }, [searchParams]);

  // Load messages when active user changes
  useEffect(() => {
    if (!activeUser) return;
    setLoadingMsgs(true);
    api.get(`/messages/${activeUser.id}`)
      .then(({ data }) => {
        setMessages(data);
        // Refresh conversations to clear unread badge
        loadConversations();
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));

    inputRef.current?.focus();
  }, [activeUser, loadConversations]);

  // Supabase Real-time — receive new messages
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          // Refresh active chat if the message belongs to it
          if (activeUser && (newMsg.sender_id === activeUser.id || newMsg.receiver_id === activeUser.id)) {
            api.get(`/messages/${activeUser.id}`)
               .then(({ data }) => setMessages(data))
               .catch(() => {});
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, activeUser, loadConversations]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeUser || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI — add message immediately
    const optimistic = {
      id:           Date.now(),
      sender_id:    user.id,
      receiver_id:  activeUser.id,
      content,
      created_at:   new Date().toISOString(),
      sender_name:  user.name,
      sender_avatar: user.avatar_url,
      is_read:      false,
      optimistic:   true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data } = await api.post(`/messages/${activeUser.id}`, { content });
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.optimistic ? data : m));
      loadConversations();
    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => !m.optimistic));
      setInput(content); // restore input
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openChat = (conv) => {
    setActiveUser({
      id:         conv.other_user_id,
      name:       conv.other_name,
      avatar_url: conv.other_avatar,
    });
    setMobileView('chat');
  };

  const totalUnread = conversations.reduce((s, c) => s + (parseInt(c.unread_count) || 0), 0);

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-white/5 bg-surface-50 animate-fade-in">

      {/* ── LEFT: Conversation list ── */}
      <div className={`
        w-full md:w-80 lg:w-72 xl:w-80 flex-shrink-0
        border-r border-white/5 flex flex-col
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5">
          <h1 className="font-display text-xl font-bold">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-maroon-700 text-white text-xs font-bold">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </h1>
          <p className="text-white/30 text-xs mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="text-5xl text-white/10 mb-4">💬</div>
              <p className="text-white/30 text-sm">No messages yet</p>
              <p className="text-white/20 text-xs mt-1">Browse skills and message a provider to get started</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive  = activeUser?.id === conv.other_user_id;
              const unread    = parseInt(conv.unread_count) || 0;
              const isMine    = conv.last_sender_id === user.id;

              return (
                <button
                  key={conv.other_user_id}
                  onClick={() => openChat(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                    hover:bg-white/5 transition-colors border-b border-white/5 last:border-0
                    ${isActive ? 'bg-maroon-950/20 border-l-2 border-l-maroon-600' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar src={conv.other_avatar} name={conv.other_name} />
                    {unread > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full
                                      bg-maroon-600 border border-surface-50
                                      flex items-center justify-center text-[9px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${unread > 0 ? 'text-white' : 'text-white/80'}`}>
                        {conv.other_name}
                      </p>
                      <span className="text-xs text-white/30 shrink-0 ml-2">
                        {formatTime(conv.last_time)}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-white/70 font-medium' : 'text-white/30'}`}>
                      {isMine ? 'You: ' : ''}{conv.last_message}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat window ── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
      `}>
        {!activeUser ? (
          /* No chat selected */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-6xl text-white/10 mb-4">💬</div>
            <h3 className="text-lg font-semibold text-white/30">Select a conversation</h3>
            <p className="text-white/20 text-sm mt-1">Choose from the list or message a provider from their skill page</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-surface-50">
              {/* Mobile back button */}
              <button
                onClick={() => { setMobileView('list'); setActiveUser(null); }}
                className="md:hidden text-white/40 hover:text-white mr-1"
              >←</button>
              <Avatar src={activeUser.avatar_url} name={activeUser.name} size="lg" />
              <div>
                <p className="font-semibold text-sm">{activeUser.name}</p>
                <p className="text-xs text-white/30">Tap to view profile</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-white/20 text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMine    = msg.sender_id === user.id;
                    const prevMsg   = messages[idx - 1];
                    const showTime  = !prevMsg ||
                      new Date(msg.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000;

                    return (
                      <div key={msg.id}>
                        {/* Time divider */}
                        {showTime && (
                          <div className="flex items-center justify-center my-3">
                            <span className="text-xs text-white/20 bg-surface-100 px-3 py-1 rounded-full">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`flex items-end gap-2 mb-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine && (
                            <Avatar src={msg.sender_avatar} name={msg.sender_name} size="sm" />
                          )}
                          <div className={`
                            max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${isMine
                              ? 'bg-maroon-900 text-white rounded-br-sm'
                              : 'bg-surface-100 text-white/80 border border-white/5 rounded-bl-sm'
                            }
                            ${msg.optimistic ? 'opacity-70' : ''}
                          `}>
                            {msg.content}
                          </div>
                          {isMine && (
                            <div className="text-xs text-white/20 shrink-0 pb-0.5">
                              {msg.is_read ? '✓✓' : '✓'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-white/5 bg-surface-50">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 input resize-none min-h-[42px] max-h-28 py-2.5 leading-relaxed"
                  placeholder="Type a message…"
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ height: 'auto' }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="btn-primary px-4 py-2.5 shrink-0 disabled:opacity-40"
                >
                  {sending ? '…' : '➤'}
                </button>
              </div>
              <p className="text-xs text-white/20 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
