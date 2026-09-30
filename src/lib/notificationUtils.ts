// Web Push and Sound Notification Utilities

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

export function sendBrowserPushNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    badge?: string;
    data?: any;
    requireInteraction?: boolean;
  }
): boolean {
  if (!isPushNotificationSupported()) {
    console.warn('Browser does not support notifications.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted.');
    return false;
  }

  try {
    const defaultIcon = '/pwa-icon.png';
    const notif = new Notification(title, {
      body: options?.body || 'Atualização no seu agendamento do Clube.',
      icon: options?.icon || defaultIcon,
      badge: options?.badge || defaultIcon,
      tag: options?.tag || `booking-status-${Date.now()}`,
      requireInteraction: options?.requireInteraction ?? false,
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (error) {
    console.error('Error dispatching browser notification:', error);
    return false;
  }
}

// Generates a pleasant chime sound using Web Audio API (no external audio assets required)
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;

    // Dual-tone chime (587.33Hz D5 -> 880Hz A5) for a high-clarity notification
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second bell harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch (err) {
    // Browsers require a user gesture before playing audio; silent fail if blocked
    console.debug('Web Audio API notification chime:', err);
  }
}
