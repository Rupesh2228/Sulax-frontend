import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { api } from '../../api.js';
import { StatusTickIcon, SendPlaneIcon } from '../../components/MessageIcons.jsx';
import { ChatSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';
import '../../styles/chat.css';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatListTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

export default function AdminMessages() {
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get('conversation');
  const { user } = useAuth();
  const { socket, isConnected, refreshUnreadCount } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState('');
  const [deletingCustomerId, setDeletingCustomerId] = useState('');
  const [messageError, setMessageError] = useState('');
  const [conversationError, setConversationError] = useState('');
  const showListLoading = useDelayedLoading(loadingList && conversations.length === 0);
  const showMessagesLoading = useDelayedLoading(loadingMessages && messages.length === 0);

  const chatMessagesEndRef = useRef(null);
  const chatMessagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const listRequestRef = useRef(0);
  const messageRequestRef = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setLoadingList(true);
    setConversationError('');
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('search', search.trim());
      if (filter === 'unread') q.set('filter', 'unread');
      const res = await api.get(`/messages/admin/conversations?${q.toString()}`);
      if (requestId === listRequestRef.current) setConversations(res.conversations || []);
    } catch (err) {
      if (requestId === listRequestRef.current) setConversationError(err.message || 'Could not load conversations.');
    } finally {
      if (requestId === listRequestRef.current) setLoadingList(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for selected conversation
  const selectConversation = async (conv) => {
    if (!conv) return;
    const requestId = ++messageRequestRef.current;
    setActiveConv(conv);
    setMessages([]);
    setLoadingMessages(true);
    setMessageError('');
    setCustomerTyping(false);

    try {
      const res = await api.get(`/messages/conversations/${conv._id}/messages?limit=40`);
      if (requestId !== messageRequestRef.current) return;
      setMessages(res.messages || []);
      setHasMore(res.hasMore || false);
      setNextCursor(res.nextCursor || null);

      // Join socket room
      if (socket && socket.connected) {
        socket.emit('join_conversation', { conversationId: conv._id });
        socket.emit('mark_read', { conversationId: conv._id });
      } else {
        api.patch(`/messages/conversations/${conv._id}/read`).catch(() => {});
      }

      // Update local unread state
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCountAdmin: 0 } : c))
      );
      refreshUnreadCount();
    } catch (err) {
      if (requestId === messageRequestRef.current) setMessageError(err.message || 'Could not load conversation messages.');
    } finally {
      if (requestId === messageRequestRef.current) {
        setLoadingMessages(false);
        setTimeout(() => scrollToBottom(false), 80);
      }
    }
  };

  useEffect(() => {
    if (!requestedConversationId || activeConv?._id === requestedConversationId) return;
    const requestedConversation = conversations.find((item) => item._id === requestedConversationId);
    if (requestedConversation) selectConversation(requestedConversation);
  }, [requestedConversationId, conversations, activeConv?._id]);

  // Load older messages (pagination)
  const loadOlderMessages = async () => {
    if (!activeConv || !hasMore || loadingOlder || !nextCursor) return;
    setLoadingOlder(true);
    const prevScrollHeight = chatMessagesContainerRef.current ? chatMessagesContainerRef.current.scrollHeight : 0;

    try {
      const res = await api.get(`/messages/conversations/${activeConv._id}/messages?before=${nextCursor}&limit=30`);
      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMore(res.hasMore || false);
        setNextCursor(res.nextCursor || null);

        requestAnimationFrame(() => {
          if (chatMessagesContainerRef.current) {
            const newScrollHeight = chatMessagesContainerRef.current.scrollHeight;
            chatMessagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
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

  // Mark active conversation as read explicitly
  const markAsRead = async () => {
    if (!activeConv) return;
    try {
      if (socket && socket.connected) {
        socket.emit('mark_read', { conversationId: activeConv._id });
      } else {
        await api.patch(`/messages/conversations/${activeConv._id}/read`);
      }
      setConversations((prev) =>
        prev.map((c) => (c._id === activeConv._id ? { ...c, unreadCountAdmin: 0 } : c))
      );
      refreshUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteMessage = async (message) => {
    if (!window.confirm('Delete this message for you and the customer? This cannot be undone.')) return;
    setDeletingMessageId(message._id);
    setMessageError('');
    try {
      await api.delete(`/messages/admin/messages/${message._id}`);
      setMessages((previous) => previous.filter((item) => item._id !== message._id));
    } catch (err) {
      setMessageError(err.message || 'Could not delete the message.');
    } finally {
      setDeletingMessageId('');
    }
  };

  const deleteCustomer = async () => {
    const customerId = activeConv?.customer?._id || activeConv?.customer?.id;
    if (!customerId || deletingCustomerId) return;
    const customerName = activeConv.customer.name || 'this customer';
    if (!window.confirm(
      `Delete ${customerName}'s account and all support conversations/messages? Historical orders will be kept. This cannot be undone.`
    )) return;

    setDeletingCustomerId(customerId);
    setMessageError('');
    try {
      await api.delete(`/admin/users/${customerId}`);
      setConversations((previous) => previous.filter((item) => item.customer?._id !== customerId));
      setActiveConv(null);
      setMessages([]);
      setReplyText('');
      setHasMore(false);
      setNextCursor(null);
      refreshUnreadCount();
    } catch (err) {
      setMessageError(err.message || 'Could not delete this customer.');
    } finally {
      setDeletingCustomerId('');
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // When any conversation gets a new message or update
    const handleConversationUpdated = (data) => {
      const { conversation } = data;
      if (!conversation) return;

      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversation._id);
        if (index > -1) {
          const updated = [...prev];
          // If this is currently the active conversation, keep unreadCountAdmin at 0
          const isCurrent = activeConv && activeConv._id === conversation._id;
          updated[index] = {
            ...conversation,
            unreadCountAdmin: isCurrent ? 0 : conversation.unreadCountAdmin,
          };
          // Move updated conversation to top of list
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        } else {
          return [conversation, ...prev];
        }
      });
      refreshUnreadCount();
    };

    // When a message arrives in active conversation
    const handleNewMessage = (data) => {
      const { conversationId, message } = data;
      if (activeConv && activeConv._id === conversationId) {
        setMessages((prev) => {
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

        // Automatically mark as read if admin is currently active in this conversation
        socket.emit('mark_read', { conversationId });
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCountAdmin: 0 } : c))
        );
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    const handleMessageDeleted = ({ conversationId, messageId } = {}) => {
      if (activeConv?._id === conversationId) {
        setMessages((previous) => previous.filter((message) => message._id !== messageId));
      }
    };

    const handleConversationsRemoved = ({ conversationIds = [] } = {}) => {
      setConversations((previous) =>
        previous.filter((conversation) => !conversationIds.includes(conversation._id))
      );
      if (activeConv && conversationIds.includes(activeConv._id)) {
        setActiveConv(null);
        setMessages([]);
        setHasMore(false);
        setNextCursor(null);
      }
      refreshUnreadCount();
    };

    // When customer reads admin messages
    const handleMessagesRead = (data) => {
      const { conversationId, role } = data;
      if (activeConv && activeConv._id === conversationId && role === 'user') {
        setMessages((prev) =>
          prev.map((m) => (m.senderRole === 'admin' ? { ...m, status: 'read', readAt: new Date() } : m))
        );
      }
    };

    // When message is delivered
    const handleMessagesDelivered = (data) => {
      const { conversationId } = data;
      if (activeConv && activeConv._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderRole === 'admin' && m.status === 'sent' ? { ...m, status: 'delivered' } : m))
        );
      }
    };

    // Typing
    const handleUserTyping = (data) => {
      const { conversationId, role, isTyping } = data;
      if (activeConv && activeConv._id === conversationId && role === 'user') {
        setCustomerTyping(isTyping);
      }
    };

    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('conversations_removed', handleConversationsRemoved);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversations_removed', handleConversationsRemoved);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, user, activeConv, scrollToBottom, refreshUnreadCount]);

  // Handle typing debounce from admin
  const handleInputChange = (e) => {
    const text = e.target.value;
    setReplyText(text);

    if (socket && activeConv) {
      socket.emit('typing', { conversationId: activeConv._id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId: activeConv._id, isTyping: false });
      }, 2000);
    }
  };

  // Send admin reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeConv || isSending) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const optimisticMessage = {
      _id: tempId,
      clientTempId: tempId,
      conversationId: activeConv._id,
      sender: user,
      senderRole: 'admin',
      text,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyText('');
    setIsSending(true);
    setTimeout(() => scrollToBottom(true), 40);

    if (socket && activeConv) {
      socket.emit('typing', { conversationId: activeConv._id, isTyping: false });
    }

    try {
      if (socket && socket.connected) {
        socket.emit(
          'send_message',
          {
            conversationId: activeConv._id,
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
              console.error('Admin socket send error:', res.error);
              sendViaRest(text, tempId);
            }
          }
        );
      } else {
        await sendViaRest(text, tempId);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      setIsSending(false);
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, status: 'failed', text: `${text} (Failed to send)` } : m))
      );
    }
  };

  const sendViaRest = async (text, clientTempId) => {
    try {
      const res = await api.post('/messages/send', {
        conversationId: activeConv._id,
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
      console.error('REST reply error:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="admin-messages-layout">
      {/* Left Column: Inbox / Customers List */}
      <aside className="admin-inbox-sidebar">
        <div className="admin-inbox-header">
          <h2>
            <span>Customer Messages</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </span>
          </h2>

          <div className="admin-inbox-search">
            <span className="admin-inbox-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-inbox-filters">
          <button
            type="button"
            className={`admin-inbox-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`admin-inbox-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        <ul className="admin-conv-list">
          {conversationError && conversations.length > 0 && (
            <li className="admin-users-state" role="alert">
              {conversationError}{' '}
              <button className="admin-btn admin-btn-secondary" type="button" onClick={fetchConversations}>Retry</button>
            </li>
          )}
          {loadingList && conversations.length === 0 ? (
            showListLoading ? <li><ChatSkeleton rows={3} /></li> : null
          ) : conversationError && conversations.length === 0 ? (
            <li className="admin-users-state" role="alert">
              <p>{conversationError}</p>
              <button className="admin-btn admin-btn-secondary" type="button" onClick={fetchConversations}>Retry</button>
            </li>
          ) : conversations.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💬</span>
              <p style={{ fontSize: 13, margin: 0 }}>No conversations found</p>
            </li>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConv && activeConv._id === conv._id;
              const customerName = conv.customer?.name || 'Customer';
              const initial = customerName.charAt(0).toUpperCase();
              const hasUnread = (conv.unreadCountAdmin || 0) > 0;

              return (
                <li
                  key={conv._id}
                  className={`admin-conv-item ${isSelected ? 'active' : ''}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="admin-conv-avatar">{initial}</div>
                  <div className="admin-conv-details">
                    <div className="admin-conv-top">
                      <span className="admin-conv-name">{customerName}</span>
                      <span className="admin-conv-time">
                        {formatListTime(conv.lastMessage?.createdAt || conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="admin-conv-bottom">
                      <p className={`admin-conv-preview ${hasUnread ? 'unread' : ''}`}>
                        {conv.lastMessage?.senderRole === 'admin' && <span>You: </span>}
                        {conv.lastMessage?.text || 'Started conversation'}
                      </p>
                      {hasUnread && (
                        <span className="admin-conv-badge">{conv.unreadCountAdmin}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Right Column: Active Conversation Pane */}
      <section className="admin-chat-pane">
        {activeConv ? (
          <>
            {/* Top info bar */}
            <div className="admin-chat-header">
              <div className="admin-chat-header-user">
                <div
                  className="admin-conv-avatar"
                  style={{ width: 38, height: 38, fontSize: 15 }}
                >
                  {(activeConv.customer?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{activeConv.customer?.name || 'Customer'}</h3>
                  <p>
                    {activeConv.customer?.email} • {activeConv.customer?.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="admin-chat-header-actions">
                <button
                  type="button"
                  className="admin-mark-read-btn"
                  onClick={markAsRead}
                  title="Mark all messages in this conversation as read"
                >
                  ✓ Mark as read
                </button>
                <button
                  type="button"
                  className="admin-delete-customer-btn"
                  onClick={deleteCustomer}
                  disabled={!activeConv.customer?._id || Boolean(deletingCustomerId)}
                  title="Delete this customer's account and support history"
                >
                  {deletingCustomerId ? 'Deleting...' : 'Delete customer'}
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="admin-chat-messages" ref={chatMessagesContainerRef}>
              {messageError && <div className="admin-message-error" role="alert">
                {messageError}{' '}
                <button type="button" className="link-button" onClick={() => selectConversation(activeConv)}>Retry</button>
              </div>}
              {loadingMessages && messages.length === 0 ? (
                showMessagesLoading ? <ChatSkeleton /> : null
              ) : (
                <>
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

                  {messages.length === 0 && !messageError && (
                    <div className="sulax-chat-empty">
                      <p>No messages in this conversation yet.</p>
                    </div>
                  )}

                  {messages.map((msg, index) => {
                    const isAdmin = msg.senderRole === 'admin';
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
                        <div className={`sulax-msg-row ${isAdmin ? 'sent' : 'received'}`}>
                          <div className="admin-message-wrap">
                            <div className="sulax-msg-bubble">
                              <span>{msg.text}</span>
                              <span className="sulax-msg-meta">
                                <span>{formatTime(msg.createdAt)}</span>
                                {isAdmin && <StatusTickIcon status={msg.status} />}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="admin-delete-message"
                              disabled={deletingMessageId === msg._id}
                              aria-label={`Delete message from ${isAdmin ? 'admin' : 'customer'} sent ${formatTime(msg.createdAt)}`}
                              title="Delete message"
                              onClick={() => deleteMessage(msg)}
                            >
                              {deletingMessageId === msg._id ? '…' : '×'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Customer typing indicator */}
                  {customerTyping && (
                    <div className="sulax-typing-indicator">
                      <span>Customer is typing</span>
                      <span className="sulax-typing-dots">
                        <span className="sulax-typing-dot" />
                        <span className="sulax-typing-dot" />
                        <span className="sulax-typing-dot" />
                      </span>
                    </div>
                  )}

                  <div ref={chatMessagesEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            <form className="admin-chat-input-bar" onSubmit={handleSendReply}>
              <textarea
                placeholder="Type your reply to customer (Enter to send, Shift+Enter for new line)..."
                value={replyText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows="1"
                maxLength={4000}
                aria-label="Admin reply input"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSending}
                title="Send Reply"
              >
                <SendPlaneIcon size={16} color="#ffffff" />
                <span>{isSending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="admin-chat-empty-selection">
            <div className="admin-chat-empty-selection-icon">💬</div>
            <h3>Customer Support Center</h3>
            <p>Select a customer conversation from the list to view chat history and reply in real time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
