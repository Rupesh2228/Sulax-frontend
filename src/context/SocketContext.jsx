import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { api } from '../api.js';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user, retrySession } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationToasts, setNotificationToasts] = useState([]);
  const [supportOnline, setSupportOnline] = useState(false);
  const socketRef = useRef(null);
  const seenNotificationIdsRef = useRef(new Set());
  const notificationChangeVersionRef = useRef(0);

  const refreshNotificationUnreadCount = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setNotificationUnreadCount(0);
      return;
    }
    const requestVersion = notificationChangeVersionRef.current;
    try {
      const res = await api.get('/notifications/unread-count');
      if (requestVersion === notificationChangeVersionRef.current) {
        setNotificationUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to refresh admin notification count:', err);
    }
  }, [user]);

  const dismissNotificationToast = useCallback((id) => {
    setNotificationToasts((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/messages/unread-count');
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // ignore
    }
  }, [user]);

  // Initial unread count fetch when user logs in
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setNotificationUnreadCount(0);
      setNotificationToasts([]);
      seenNotificationIdsRef.current.clear();
      notificationChangeVersionRef.current = 0;
      return;
    }

    const developmentSocketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.DEV ? developmentSocketUrl : window.location.origin);
    const newSocket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    const connectTimer = window.setTimeout(() => newSocket.connect(), 0);

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (user.role === 'admin') refreshNotificationUnreadCount();
      // Check admin status
      newSocket.emit('check_admin_status', {}, (res) => {
        if (res && typeof res.online === 'boolean') {
          setSupportOnline(res.online);
        }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    newSocket.on('auth:role-changed', async () => {
      const refreshedUser = await retrySession();
      if (refreshedUser?.role === 'admin') {
        navigate('/sulax-itnb-admain', { replace: true });
      } else if (refreshedUser === null) {
        navigate('/', { replace: true });
      }
    });

    newSocket.on('user_presence', (data) => {
      if (data.role === 'admin') {
        setSupportOnline(data.status === 'online');
      }
    });

    // Listen for notification of incoming message to update badge
    newSocket.on('new_message_notification', (data) => {
      if (user.role === 'user' && data.message?.senderRole === 'admin') {
        setUnreadCount((prev) => prev + 1);
      }
    });

    newSocket.on('conversation_updated', (data) => {
      if (user.role === 'admin') {
        refreshUnreadCount();
      } else if (data.conversation?.unreadCountCustomer !== undefined) {
        setUnreadCount(data.conversation.unreadCountCustomer);
      }
    });

    newSocket.on('notification:created', ({ notification } = {}) => {
      if (user.role !== 'admin' || !notification?._id || seenNotificationIdsRef.current.has(notification._id)) {
        return;
      }
      const seenIds = seenNotificationIdsRef.current;
      seenIds.add(notification._id);
      if (seenIds.size > 1000) seenIds.delete(seenIds.values().next().value);
      notificationChangeVersionRef.current += 1;
      setNotificationUnreadCount((prev) => prev + (notification.isRead ? 0 : 1));
      const enqueueToast = () => {
        if (socketRef.current === newSocket) {
          setNotificationToasts((prev) => [notification, ...prev].slice(0, 3));
        }
      };
      if (navigator.locks?.request) {
        const toastKey = `sulax-admin-notification-toast-seen:${user._id}`;
        navigator.locks.request('sulax-admin-notification-toast', async () => {
          if (socketRef.current !== newSocket) return;
          const now = Date.now();
          const seen = JSON.parse(localStorage.getItem(toastKey) || '{}');
          for (const [id, timestamp] of Object.entries(seen)) {
            if (now - timestamp > 24 * 60 * 60 * 1000) delete seen[id];
          }
          if (seen[notification._id]) return;
          seen[notification._id] = now;
          localStorage.setItem(toastKey, JSON.stringify(seen));
          enqueueToast();
        }).catch((err) => {
          console.error('Could not coordinate notification display across tabs:', err);
          enqueueToast();
        });
      } else {
        enqueueToast();
      }
    });

    newSocket.on('notification:changed', ({ action } = {}) => {
      if (user.role !== 'admin') return;
      notificationChangeVersionRef.current += 1;
      if (action === 'read-all' || action === 'clear') setNotificationUnreadCount(0);
      else refreshNotificationUnreadCount();
    });

    return () => {
      window.clearTimeout(connectTimer);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, retrySession, navigate, refreshUnreadCount, refreshNotificationUnreadCount]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handlePushMessage = (event) => {
      if (event.data?.type === 'SULAX_PUSH_SUBSCRIPTION_CHANGED') {
        if (user?.role === 'admin' && event.data.subscription) {
          api.post('/notifications/push-subscription', event.data.subscription)
            .then(() => window.dispatchEvent(new Event('sulax-push-subscription-updated')))
            .catch((err) => console.error('Could not renew admin push subscription:', err));
        }
        return;
      }
      if (event.data?.type !== 'SULAX_PUSH_NOTIFICATION') return;
      const payload = event.data.payload;
      const canHandle = user?.role === 'admin' &&
        window.location.pathname.startsWith('/sulax-itnb-admain') &&
        Boolean(payload?.notificationId);
      if (canHandle && !seenNotificationIdsRef.current.has(payload.notificationId)) {
        seenNotificationIdsRef.current.add(payload.notificationId);
        notificationChangeVersionRef.current += 1;
        setNotificationToasts((previous) => [{
          _id: payload.notificationId,
          type: payload.type || 'system',
          title: payload.title || 'Sulax Shop update',
          message: payload.body || 'There is a new admin notification.',
          createdAt: payload.timestamp || new Date().toISOString(),
          isRead: false,
          pushUrl: payload.url,
        }, ...previous].slice(0, 3));
        refreshNotificationUnreadCount();
      }
      event.ports?.[0]?.postMessage({ handled: canHandle });
    };
    navigator.serviceWorker.addEventListener('message', handlePushMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handlePushMessage);
  }, [user, refreshNotificationUnreadCount]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        setUnreadCount,
        refreshUnreadCount,
        notificationUnreadCount,
        refreshNotificationUnreadCount,
        notificationToasts,
        dismissNotificationToast,
        supportOnline,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
