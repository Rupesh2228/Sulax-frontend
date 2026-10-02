import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { BellIcon } from './AdminIcons.jsx';

const ADMIN_PATH = '/sulax-itnb-admain';

function actionFor(notification) {
  if (
    notification.pushUrl?.startsWith('/') &&
    !notification.pushUrl.startsWith('//') &&
    !notification.pushUrl.includes('\\')
  ) return notification.pushUrl;
  if (notification.relatedOrderId) {
    return `${ADMIN_PATH}/orders?order=${notification.relatedOrderId}`;
  }
  if (notification.relatedConversationId) {
    return `${ADMIN_PATH}/messages?conversation=${notification.relatedConversationId}`;
  }
  if (notification.relatedProductId) return `${ADMIN_PATH}/products`;
  if (notification.relatedUserId) {
    return `${ADMIN_PATH}/customers?customer=${notification.relatedUserId}`;
  }
  return ADMIN_PATH;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function readMutedPreference(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch (err) {
    console.warn('Could not read notification sound preference:', err);
    return false;
  }
}

export default function AdminNotificationBell() {
  const { user } = useAuth();
  const {
    socket,
    notificationUnreadCount,
    refreshNotificationUnreadCount,
    notificationToasts,
    dismissNotificationToast,
  } = useSocket();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const playedToastIdsRef = useRef(new Set());
  const toastTimersRef = useRef(new Map());
  const deletedNotificationIdsRef = useRef(new Set());
  const notificationsRef = useRef([]);
  const storageKey = `sulax-admin-notifications-muted:${user?._id || 'admin'}`;
  const [muted, setMuted] = useState(() => readMutedPreference(storageKey));
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pushConfig, setPushConfig] = useState(null);
  const [pushDevices, setPushDevices] = useState(0);
  const [currentBrowserRegistered, setCurrentBrowserRegistered] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const loadPage = useCallback(async (requestedPage = 1, append = false) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get(`/notifications?page=${requestedPage}&limit=15`);
      const availableNotifications = result.notifications.filter(
        (item) => !deletedNotificationIdsRef.current.has(item._id)
      );
      setNotifications((previous) => {
        const merged = append ? [...previous, ...availableNotifications] : availableNotifications;
        return [...new Map(merged.map((item) => [item._id, item])).values()];
      });
      setPage(result.page);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadPage(1);
  }, [open, loadPage]);

  const refreshPushStatus = useCallback(async () => {
    try {
      const [config, status] = await Promise.all([
        api.get('/notifications/push-config'),
        api.get('/notifications/push-status'),
      ]);
      setPushConfig(config);
      setPushDevices(status.devices);
      if (config.enabled && 'serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const endpointQuery = new URLSearchParams({ endpoint: subscription.endpoint });
          const deviceStatus = await api.get(`/notifications/push-status?${endpointQuery}`);
          setCurrentBrowserRegistered(deviceStatus.currentBrowserRegistered);
        } else {
          setCurrentBrowserRegistered(false);
        }
      } else {
        setCurrentBrowserRegistered(false);
      }
    } catch (err) {
      setPushMessage(err.message || 'Could not check desktop notification settings.');
    }
  }, []);

  useEffect(() => {
    setPushSupported(
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
    refreshPushStatus();
  }, [refreshPushStatus]);

  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      refreshPushStatus();
      setPushMessage('The browser push subscription was renewed.');
    };
    window.addEventListener('sulax-push-subscription-updated', handleSubscriptionUpdate);
    return () => window.removeEventListener('sulax-push-subscription-updated', handleSubscriptionUpdate);
  }, [refreshPushStatus]);

  useEffect(() => {
    if (!socket) return undefined;
    const onCreated = ({ notification } = {}) => {
      if (!notification?._id) return;
      setNotifications((previous) => {
        if (previous.some((item) => item._id === notification._id)) return previous;
        return [notification, ...previous].slice(0, 15 * page);
      });
      setTotal((previous) => previous + 1);
    };
    const onChanged = ({ action, notificationId } = {}) => {
      if (action === 'read-all') {
        setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
      } else if (action === 'clear') {
        notificationsRef.current.forEach((item) => deletedNotificationIdsRef.current.add(item._id));
        setNotifications([]);
        setTotal(0);
      } else if (action === 'read') {
        setNotifications((previous) =>
          previous.map((item) => item._id === notificationId ? { ...item, isRead: true } : item)
        );
      } else if (action === 'delete') {
        if (deletedNotificationIdsRef.current.has(notificationId)) return;
        deletedNotificationIdsRef.current.add(notificationId);
        setNotifications((previous) => previous.filter((item) => item._id !== notificationId));
        setTotal((previous) => Math.max(0, previous - 1));
      }
    };
    socket.on('notification:created', onCreated);
    socket.on('notification:changed', onChanged);
    return () => {
      socket.off('notification:created', onCreated);
      socket.off('notification:changed', onChanged);
    };
  }, [socket, page]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(muted));
    } catch (err) {
      console.error('Could not save notification sound preference:', err);
    }
  }, [muted, storageKey]);

  useEffect(() => {
    const syncMutePreference = (event) => {
      if (event.key === storageKey) setMuted(event.newValue === 'true');
    };
    window.addEventListener('storage', syncMutePreference);
    return () => window.removeEventListener('storage', syncMutePreference);
  }, [storageKey]);

  useEffect(() => {
    for (const notification of notificationToasts) {
      if (toastTimersRef.current.has(notification._id)) continue;
      if (!playedToastIdsRef.current.has(notification._id)) {
        playedToastIdsRef.current.add(notification._id);
        if (!muted) {
          try {
            const audio = new window.AudioContext();
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.frequency.value = 740;
            gain.gain.setValueAtTime(0.07, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
            oscillator.connect(gain);
            gain.connect(audio.destination);
            oscillator.start();
            oscillator.stop(audio.currentTime + 0.18);
            window.setTimeout(() => audio.close(), 250);
          } catch (err) {
            console.warn('Notification sound is unavailable:', err);
          }
        }
      }
      const timer = window.setTimeout(() => {
        dismissNotificationToast(notification._id);
        toastTimersRef.current.delete(notification._id);
      }, 5000);
      toastTimersRef.current.set(notification._id, timer);
    }
  }, [notificationToasts, muted, dismissNotificationToast]);

  useEffect(() => () => {
    for (const timer of toastTimersRef.current.values()) window.clearTimeout(timer);
    toastTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const markAllRead = async () => {
    setActionError('');
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
      await refreshNotificationUnreadCount();
    } catch (err) {
      setActionError(err.message || 'Could not mark notifications as read.');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all admin notifications?')) return;
    setActionError('');
    try {
      await api.delete('/notifications');
      notificationsRef.current.forEach((item) => deletedNotificationIdsRef.current.add(item._id));
      setNotifications([]);
      setTotal(0);
      await refreshNotificationUnreadCount();
    } catch (err) {
      setActionError(err.message || 'Could not clear notifications.');
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`, {});
        setNotifications((previous) => previous.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item
        ));
        await refreshNotificationUnreadCount();
      } catch (err) {
        setActionError(err.message || 'Could not update notification.');
        return;
      }
    }
    setOpen(false);
    navigate(actionFor(notification));
  };

  const deleteNotification = async (event, id) => {
    event.stopPropagation();
    setActionError('');
    try {
      await api.delete(`/notifications/${id}`);
      if (deletedNotificationIdsRef.current.has(id)) return;
      deletedNotificationIdsRef.current.add(id);
      setNotifications((previous) => previous.filter((item) => item._id !== id));
      setTotal((previous) => Math.max(0, previous - 1));
      await refreshNotificationUnreadCount();
    } catch (err) {
      setActionError(err.message || 'Could not delete notification.');
    }
  };

  const dismissToast = (notification) => {
    dismissNotificationToast(notification._id);
    const timer = toastTimersRef.current.get(notification._id);
    if (timer) window.clearTimeout(timer);
    toastTimersRef.current.delete(notification._id);
  };

  const enableDesktopNotifications = async () => {
    setPushBusy(true);
    setPushMessage('');
    try {
      if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('Desktop push notifications are not supported here. Use a supported browser on HTTPS or localhost.');
      }
      const config = pushConfig || await api.get('/notifications/push-config');
      setPushConfig(config);
      if (!config.enabled || !config.publicKey) {
        throw new Error('Desktop push notifications are not configured on this server yet.');
      }

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'Notifications are blocked for this site. Allow them in your browser site settings, then try again.'
          : 'Notification permission was not granted.');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const applicationServerKey = Uint8Array.from(
          atob(
            config.publicKey.replace(/-/g, '+').replace(/_/g, '/') +
            '='.repeat((4 - config.publicKey.length % 4) % 4)
          ),
          (character) => character.charCodeAt(0)
        );
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
      await api.post('/notifications/push-subscription', subscription.toJSON());
      await refreshPushStatus();
      setPushMessage('Desktop notifications are enabled for this browser.');
    } catch (err) {
      setPushMessage(err.message || 'Could not enable desktop notifications.');
    } finally {
      setPushBusy(false);
    }
  };

  const disableDesktopNotifications = async () => {
    setPushBusy(true);
    setPushMessage('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/notifications/push-subscription', { body: { endpoint: subscription.endpoint } });
        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) throw new Error('The browser did not unsubscribe this device.');
      }
      await refreshPushStatus();
      setPushMessage('Desktop notifications are disabled for this browser.');
    } catch (err) {
      setPushMessage(err.message || 'Could not disable desktop notifications.');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="admin-notification-root" ref={containerRef}>
      <button
        className="admin-notification-trigger"
        type="button"
        aria-label={`Notifications${notificationUnreadCount ? `, ${notificationUnreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <BellIcon size={19} />
        {notificationUnreadCount > 0 && (
          <span className="admin-notification-badge">
            {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="admin-notification-panel" aria-label="Admin notifications">
          <header className="admin-notification-header">
            <div>
              <h2>Notifications</h2>
              <span>{notificationUnreadCount} unread</span>
            </div>
            <button type="button" onClick={markAllRead} disabled={!notificationUnreadCount}>
              Mark all read
            </button>
          </header>
          <div className="admin-notification-preferences">
            <label>
              <input type="checkbox" checked={muted} onChange={(event) => setMuted(event.target.checked)} />
              Mute notification sound
            </label>
            <button type="button" onClick={clearAll} disabled={!total}>Clear all</button>
          </div>
          <div className="admin-push-settings">
            <div>
              <strong>Desktop notifications</strong>
              <span>
                {!pushConfig?.enabled
                  ? 'Server push is not configured. Run npm run setup:web-push in server/, then restart the server.'
                  : !pushSupported
                    ? 'This browser or connection does not support push'
                  : `${pushDevices} browser${pushDevices === 1 ? '' : 's'} registered`}
              </span>
            </div>
            {!pushConfig?.enabled && (
              <p role="status">
                This creates server-only VAPID keys in an ignored file. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
                and VAPID_SUBJECT in your production host environment.
              </p>
            )}
            {currentBrowserRegistered ? (
              <button type="button" disabled={pushBusy} onClick={disableDesktopNotifications}>
                {pushBusy ? 'Updating...' : 'Disable this browser'}
              </button>
            ) : (
              <button
                type="button"
                disabled={pushBusy || !pushConfig?.enabled || !pushSupported}
                onClick={enableDesktopNotifications}
              >
                {pushBusy ? 'Enabling...' : 'Enable Desktop Notifications'}
              </button>
            )}
            {pushMessage && <p role="status">{pushMessage}</p>}
          </div>
          {actionError && <p className="admin-notification-error" role="alert">{actionError}</p>}
          {error && (
            <div className="admin-notification-state" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => loadPage(1)}>Retry</button>
            </div>
          )}
          {!error && notifications.length === 0 && !loading && (
            <div className="admin-notification-state">You’re all caught up.</div>
          )}
          <div className="admin-notification-list">
            {notifications.map((notification) => (
              <div
                className={`admin-notification-item${notification.isRead ? '' : ' is-unread'}`}
                key={notification._id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openNotification(notification);
                  }
                }}
              >
                <span className={`admin-notification-type type-${notification.type}`} aria-hidden="true" />
                <span className="admin-notification-copy">
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                </span>
                <span className="admin-notification-item-actions">
                  {!notification.isRead && <span className="admin-notification-unread-dot" aria-label="Unread" />}
                  <button
                    className="admin-notification-delete"
                    type="button"
                    aria-label="Delete notification"
                    onClick={(event) => deleteNotification(event, notification._id)}
                    onKeyDown={(event) => event.stopPropagation()}
                  >×</button>
                </span>
              </div>
            ))}
          </div>
          {loading && <div className="admin-notification-state">Loading notifications…</div>}
          {!loading && hasMore && (
            <button
              className="admin-notification-load-more"
              type="button"
              onClick={() => loadPage(page + 1, true)}
            >Load more</button>
          )}
        </section>
      )}

      <div className="admin-notification-toasts" aria-live="polite" aria-relevant="additions">
        {notificationToasts.map((notification) => (
          <div className="admin-notification-toast" key={notification._id}>
            <button type="button" onClick={() => openNotification(notification)}>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
            </button>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(notification)}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
