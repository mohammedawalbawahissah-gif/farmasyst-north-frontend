import { createContext } from 'react';
import type { Notification } from '../types';

export interface NotificationContextType {
  unread:        number;
  toasts:        Notification[];
  dismissToast:  (id: string) => void;
  markRead:      (id: string) => void;
  markAllRead:   () => void;
  refreshUnread: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  unread:        0,
  toasts:        [],
  dismissToast:  () => {},
  markRead:      () => {},
  markAllRead:   () => {},
  refreshUnread: () => {},
});
