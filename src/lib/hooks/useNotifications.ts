import { useContext } from 'react';
import { NotificationContext } from '../notification-context-def';

export const useNotifications = () => useContext(NotificationContext);
