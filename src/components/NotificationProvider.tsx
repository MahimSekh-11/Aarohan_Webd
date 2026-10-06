import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Bell } from 'lucide-react';
import { useT } from './Translate';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({} as any);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Find newly arrived unread notifications that we haven't seen before
        // This is a naive check (checks IDs). In production, use timestamps or lastRead marker.
        if (Notification.permission === 'granted' && data.length > 0 && notifications.length > 0) {
          const newUnreads = data.filter((n: any) => !n.read && !notifications.find(old => old._id === n._id));
          newUnreads.forEach((n: any) => {
             new Notification('TIORKHALI MART Update', { body: n.message });
          });
        }
        
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && token) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // poll every 10s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user, token]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, showDropdown, setShowDropdown }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationBell() {
  const t = useT();
  const { notifications, unreadCount, markAsRead, showDropdown, setShowDropdown } = useNotifications();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative bg-black text-white p-2 rounded-xl border border-[#334155] shadow-sm cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute left-1/2 -translate-x-[80%] sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#e2e0d9] overflow-hidden z-50">
          <div className="p-3 border-b border-[#e2e0d9] bg-[#f9f9f7] flex justify-between items-center">
            <span className="font-bold text-sm text-[#1a1c19]">{t('Notifications')}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500 font-bold">{t('No notifications yet.')}</div>
            )}
            {notifications.map(n => (
              <div 
                key={n._id} 
                onClick={() => { if (!n.read) markAsRead(n._id); }}
                className={`p-3 border-b border-[#e2e0d9] text-xs cursor-pointer ${n.read ? 'bg-white opacity-60' : 'bg-[#e7f0e6] text-[#1a1c19] font-medium'}`}
              >
                <p>{t(n.message)}</p>
                <p className="text-[10px] mt-1 text-gray-500 font-bold">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
