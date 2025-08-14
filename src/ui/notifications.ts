import { useSyncExternalStore } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationItem = {
  id: number;
  message: string;
  type: NotificationType;
  duration: number; // ms
  createdAt: number;
};

let seq = 1;
const items: NotificationItem[] = [];
const listeners = new Set<() => void>();
// Cached snapshot to keep referential stability between updates
let snapshot: ReadonlyArray<NotificationItem> = [];

function emit() {
  for (const l of Array.from(listeners)) {
    try { l(); } catch {}
  }
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSnapshot() {
  // Return cached snapshot to avoid new reference each call
  return snapshot;
}

export function useNotifications() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function removeNotification(id: number) {
  const idx = items.findIndex(x => x.id === id);
  if (idx >= 0) {
    items.splice(idx, 1);
    // Update snapshot only when items change
    snapshot = items.slice();
    emit();
  }
}

export function notify(message: string, opts?: { type?: NotificationType; durationMs?: number }) {
  const type: NotificationType = opts?.type || 'info';
  const duration = Math.max(1500, Math.min(10000, opts?.durationMs ?? (type === 'error' ? 5000 : 3000)));
  const id = seq++;
  items.push({ id, message, type, duration, createdAt: Date.now() });
  // Update snapshot only when items change
  snapshot = items.slice();
  emit();
  // auto-dismiss
  setTimeout(() => removeNotification(id), duration + 50);
  return id;
}
