const PUSH_TAB_REPLY_TIMEOUT = 500;

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const oldKey = event.oldSubscription?.options?.applicationServerKey;
    if (!oldKey) return;
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: oldKey,
    });
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        type: 'SULAX_PUSH_SUBSCRIPTION_CHANGED',
        subscription: subscription.toJSON(),
      });
    }
  })());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  event.waitUntil((async () => {
    let payload;
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'Sulax Shop update', body: 'There is a new admin notification.' };
    }

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visibleClients = clients.filter((client) => client.visibilityState === 'visible');
    let handledByVisibleTab = false;
    for (const client of visibleClients) {
      const channel = new MessageChannel();
      const response = new Promise((resolve) => {
        const timeout = self.setTimeout(() => resolve(false), PUSH_TAB_REPLY_TIMEOUT);
        channel.port1.onmessage = (messageEvent) => {
          self.clearTimeout(timeout);
          resolve(messageEvent.data?.handled === true);
        };
      });
      client.postMessage({ type: 'SULAX_PUSH_NOTIFICATION', payload }, [channel.port2]);
      if (await response) {
        handledByVisibleTab = true;
        break;
      }
    }
    if (handledByVisibleTab) return;

    const safeUrl = typeof payload.url === 'string' && payload.url.startsWith('/')
      ? payload.url
      : '/sulax-itnb-admain';
    await self.registration.showNotification(payload.title || 'Sulax Shop update', {
      body: payload.body || 'There is a new admin notification.',
      tag: payload.notificationId ? `sulax-${payload.notificationId}` : undefined,
      renotify: false,
      timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
      data: { url: safeUrl },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const requestedUrl = event.notification.data?.url;
    const candidate = typeof requestedUrl === 'string' &&
      requestedUrl.startsWith('/') &&
      !requestedUrl.startsWith('//') &&
      !requestedUrl.includes('\\')
      ? requestedUrl
      : '/sulax-itnb-admain';
    const resolved = new URL(candidate, self.location.origin);
    const target = resolved.origin === self.location.origin
      ? resolved
      : new URL('/sulax-itnb-admain', self.location.origin);
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
