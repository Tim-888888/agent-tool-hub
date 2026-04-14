'use client';

export function trackEvent(name: string, data?: Record<string, string | number | boolean>) {
  try {
    const umami = (window as unknown as { umami?: { track: (name: string, data?: Record<string, string | number | boolean>) => void } }).umami;
    if (umami) {
      umami.track(name, data);
    }
  } catch {
    // Umami not loaded — silently skip
  }
}
