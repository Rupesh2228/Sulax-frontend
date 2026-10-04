import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { api } from '../api.js';
import { StatusTickIcon, WhatsAppIcon, SendPlaneIcon, VerifiedBadgeIcon } from './MessageIcons.jsx';
import { ChatSkeleton } from './Skeletons.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';
import '../styles/chat.css';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerChatWidget() {
  const { user } = useAuth();
  const { socket, isConnected, unreadCount, setUnreadCount, supportOnline } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState('');
  const showLoading = useDelayedLoading(loading && messages.length === 0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const conversationRequestRef = useRef(0);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Fetch or initialize customer conversation
  const loadConversationAndMessages = useCallback(async () => {
    if (!user) return;
    const requestId = ++conversationRequestRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const convRes = await api.get('/messages/my-conversation');
      const conv = convRes.conversation;
      if (requestId !== conversationRequestRef.current) return;
      setConversation(conv);

      const msgRes = await api.get(`/messages/conversations/${conv._id}/messages?limit=30`);
      if (requestId !== conversationRequestRef.current) return;
      setMessages(msgRes.messages || []);
      setHasMore(msgRes.hasMore || false);
      setNextCursor(msgRes.nextCursor || null);

      // Join socket room for this conversation
      if (socket && socket.connected) {
        socket.emit('join_conversation', { conversationId: conv._id });
        socket.emit('mark_read', { conversationId: conv._id });
      } else {
        // Fallback REST mark read
        api.patch(`/messages/conversations/${conv._id}/read`).catch(() => {});
      }
      setUnreadCount(0);
    } catch (err) {
      if (requestId === conversationRequestRef.current) setLoadError(err.message || 'Could not load your conversation.');
    } finally {
      if (requestId === conversationRequestRef.current) {
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 80);
      }
    }
  }, [user, socket, setUnreadCount, scrollToBottom]);

  // Load older messages (pagination)
  const loadOlderMessages = async () => {
    if (!conversation || !hasMore || loadingOlder || !nextCursor) return;
    setLoadingOlder(true);
    const prevScrollHeight = chatBodyRef.current ? chatBodyRef.current.scrollHeight : 0;

    try {
      const res = await api.get(`/messages/conversations/${conversation._id}/messages?before=${nextCursor}&limit=30`);
      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMore(res.hasMore || false);
        setNextCursor(res.nextCursor || null);

        // Preserve scroll position
        requestAnimationFrame(() => {
          if (chatBodyRef.current) {
            const newScrollHeight = chatBodyRef.current.scrollHeight;
            chatBodyRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Open/Close widget
  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && user && !conversation) {
      loadConversationAndMessages();
    } else if (nextState && conversation) {
      // Mark read whenever reopened
      if (socket && socket.connected) {
        socket.emit('mark_read', { conversationId: conversation._id });
      } else {
        api.patch(`/messages/conversations/${conversation._id}/read`).catch(() => {});
      }
      setUnreadCount(0);
      setTimeout(() => scrollToBottom(false), 50);
    }
  };

  // Socket event subscriptions
  useEffect(() => {
    if (!socket || !user) return;

    // Listen to new messages
    const handleNewMessage = (data) => {
      const { conversationId, message } = data;
      if (conversation && conversation._id === conversationId) {
        setMessages((prev) => {
          // Check if message with same clientTempId or _id exists (avoid duplicates)
          const exists = prev.some(
            (m) => (m._id && m._id === message._id) || (m.clientTempId && m.clientTempId === message.clientTempId)
          );
          if (exists) {
            return prev.map((m) =>
              (m.clientTempId && m.clientTempId === message.clientTempId) || m._id === message._id ? message : m
            );
          }
          return [...prev, message];
        });

        // If chat is open, immediately mark as read
        if (isOpen) {
          socket.emit('mark_read', { conversationId });
          setUnreadCount(0);
        }
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    const handleMessageDeleted = ({ conversationId, messageId } = {}) => {
      if (conversation?._id !== conversationId) return;
      setMessages((previous) => previous.filter((message) => message._id !== messageId));
    };

    const handleConversationsRemoved = ({ conversationIds = [] } = {}) => {
      if (!conversation || !conversationIds.includes(conversation._id)) return;
      setConversation(null);
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setUnreadCount(0);
    };

    // Listen to read receipts
    const handleMessagesRead = (data) => {
      const { conversationId, role } = data;
      if (conversation && conversation._id === conversationId && role === 'admin') {
        // Admin read customer's messages
        setMessages((prev) =>
          prev.map((m) => (m.senderRole === 'user' ? { ...m, status: 'read', readAt: new Date() } : m))
        );
      }
    };

    // Listen to delivery status
    const handleMessagesDelivered = (data) => {
      const { conversationId } = data;
      if (conversation && conversation._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderRole === 'user' && m.status === 'sent' ? { ...m, status: 'delivered' } : m))
        );
      }
    };

    // Listen to admin typing
    const handleUserTyping = (data) => {
      const { conversationId, role, isTyping } = data;
      if (conversation && conversation._id === conversationId && role === 'admin') {
        setAdminTyping(isTyping);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('conversations_removed', handleConversationsRemoved);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversations_removed', handleConversationsRemoved);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, user, conversation, isOpen, scrollToBottom, setUnreadCount]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (socket && conversation) {
      socket.emit('typing', { conversationId: conversation._id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId: conversation._id, isTyping: false });
      }, 2000);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const optimisticMessage = {
      _id: tempId,
      clientTempId: tempId,
      conversationId: conversation?._id,
      sender: user,
      senderRole: 'user',
      text,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    // Optimistically add message to list
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setIsSending(true);
    setTimeout(() => scrollToBottom(true), 40);

    // Stop typing indicator
    if (socket && conversation) {
      socket.emit('typing', { conversationId: conversation._id, isTyping: false });
    }

    try {
      if (socket && socket.connected) {
        // Send via Socket.IO
        socket.emit(
          'send_message',
          {
            conversationId: conversation?._id,
            text,
            clientTempId: tempId,
          },
          (res) => {
            setIsSending(false);
            if (res && res.success && res.message) {
              setMessages((prev) =>
                prev.map((m) => (m.clientTempId === tempId || m._id === tempId ? res.message : m))
              );
            } else if (res && res.error) {
              console.error('Socket send error:', res.error);
              // Fallback to REST
              sendViaRest(text, tempId);
            }
          }
        );
      } else {
        // Send via REST API fallback
        await sendViaRest(text, tempId);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsSending(false);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, status: 'failed', text: `${text} (Failed to send)` } : m))
      );
    }
  };

  const sendViaRest = async (text, clientTempId) => {
    try {
      const res = await api.post('/messages/send', {
        conversationId: conversation?._id,
        text,
        clientTempId,
      });
      setIsSending(false);
      if (res && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.clientTempId === clientTempId || m._id === clientTempId ? res.message : m))
        );
      }
    } catch (err) {
      setIsSending(false);
      console.error('REST send message error:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating WhatsApp Action Button with Pulse Aura */}
      <button
        type="button"
        className={`sulax-chat-floating-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Open WhatsApp Customer Support Chat"
        title="Chat with Sulax Support"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <WhatsAppIcon size={32} />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="sulax-chat-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* WhatsApp Chat Window Modal */}
      {isOpen && (
        <div className="sulax-chat-window" role="dialog" aria-label="Customer Support Chat">
          {/* Header */}
          <div className="sulax-chat-header">
            <div className="sulax-chat-header-info">
              <div className="sulax-chat-avatar-wrap">
                <span>👟</span>
                <span
                  className="sulax-chat-online-dot"
                  style={{ backgroundColor: supportOnline ? '#25d366' : '#9ca3af' }}
                />
              </div>
              <div className="sulax-chat-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <h4>Sulax Support</h4>
                  <VerifiedBadgeIcon size={14} />
                </div>
                <span>
                  {supportOnline ? (
                    <>
                      <span style={{ color: '#25d366' }}>●</span> Online now
                    </>
                  ) : (
                    'Typically replies in minutes'
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="sulax-chat-close-btn"
              onClick={toggleChat}
              aria-label="Close Chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Connection status banner if offline */}
          {!isConnected && user && (
            <div className="sulax-chat-banner">
              <span>⚡</span> Reconnecting to live support server...
            </div>
          )}

          {/* Body */}
          <div className="sulax-chat-body" ref={chatBodyRef}>
            {!user ? (
              // Prompt for unauthenticated customers
              <div className="sulax-chat-auth-prompt">
                <div className="sulax-chat-auth-icon">💬</div>
                <h3 className="sulax-chat-auth-title">Welcome to Sulax Support!</h3>
                <p className="sulax-chat-auth-desc">
                  Have questions about shoe sizes, order tracking, or styling? Please log in to chat with our support team in real time.
                </p>
                <div className="sulax-chat-auth-actions">
                  <Link to="/login" className="sulax-chat-login-btn" onClick={() => setIsOpen(false)}>
                    Log In to Chat
                  </Link>
                  <Link to="/register" className="sulax-chat-register-btn" onClick={() => setIsOpen(false)}>
                    Create Account
                  </Link>
                </div>
              </div>
            ) : loading && messages.length === 0 ? (
              showLoading ? <ChatSkeleton /> : null
            ) : (
              <>
                {loadError && (
                  <div className="admin-message-error" role="alert">
                    {loadError}{' '}
                    <button type="button" className="link-button" onClick={loadConversationAndMessages}>Retry</button>
                  </div>
                )}
                {/* Load More Button */}
                {hasMore && (
                  <button
                    type="button"
                    className="sulax-chat-load-more"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    aria-busy={loadingOlder}
                  >
                    ↑ Load older messages
                  </button>
                )}

                {/* Empty State */}
                {messages.length === 0 && !loadError && (
                  <div className="sulax-chat-empty">
                    <div className="sulax-chat-empty-icon">👟</div>
                    <p>
                      <strong>Hello, {user.name}!</strong>
                      <br />
                      How can we assist you today? Send us a message and our team will reply shortly.
                    </p>
                  </div>
                )}

                {/* Messages List */}
                {messages.map((msg, index) => {
                  const isSent = msg.senderRole === 'user';
                  const showDate =
                    index === 0 ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(messages[index - 1].createdAt).toDateString();

                  return (
                    <div key={msg._id || msg.clientTempId || index} style={{ display: 'contents' }}>
                      {showDate && (
                        <div className="sulax-chat-date-separator">
                          {formatDateSeparator(msg.createdAt)}
                        </div>
                      )}
                      <div className={`sulax-msg-row ${isSent ? 'sent' : 'received'}`}>
                        <div className="sulax-msg-bubble">
                          <span>{msg.text}</span>
                          <span className="sulax-msg-meta">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isSent && <StatusTickIcon status={msg.status} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Support is typing indicator */}
                {adminTyping && (
                  <div className="sulax-typing-indicator">
                    <span>Sulax Support is typing</span>
                    <span className="sulax-typing-dots">
                      <span className="sulax-typing-dot" />
                      <span className="sulax-typing-dot" />
                      <span className="sulax-typing-dot" />
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer Input Bar */}
          {user && (
            <form className="sulax-chat-footer" onSubmit={handleSendMessage}>
              <textarea
                className="sulax-chat-textarea"
                rows="1"
                placeholder="Type a message..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={4000}
                aria-label="Message input"
              />
              <button
                type="submit"
                className="sulax-chat-send-btn"
                disabled={!inputText.trim() || isSending}
                aria-label="Send message"
                title="Send"
              >
                <SendPlaneIcon size={18} color="#ffffff" />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
