/**
 * Request browser notification permission.
 * Call this once after the user logs in.
 */
export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * Show a browser / PWA notification.
 * Uses the Service Worker showNotification so it appears even when the tab is
 * not focused — ideal for alerting the shop owner / barber of a new booking.
 *
 * For cross-device push (notifying a barber on a different phone), connect
 * Firebase Cloud Messaging (FCM) and send push payloads from your server or
 * Firebase Functions. The service worker push listener in sw.js is already
 * wired up to receive those payloads.
 */
export function sendNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    navigator.serviceWorker?.ready.then(reg => {
        reg.showNotification(title, {
            body,
            icon: './icons/icon.svg',
            badge: './icons/icon.svg',
            vibrate: [200, 100, 200],
        });
    });
}
