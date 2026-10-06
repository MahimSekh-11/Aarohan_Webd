import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const seen=useRef<Set<string>>(new Set());const previousToken=useRef(token);previousToken.current=token;

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
        if ('Notification' in window && Notification.permission === 'granted' && Array.isArray(data) && seen.current.size > 0) {
          const newUnreads = data.filter((n: any) => !n.read && !seen.current.has(n._id));
          newUnreads.forEach((n: any) => {
             new Notification('TIORKHALI MART Update', { body: n.message });
          });
        }
        
        if(previousToken.current!==token)return;
        if(Array.isArray(data)){seen.current=new Set(data.map(n=>n._id));setNotifications(data);}
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // poll every 10s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);seen.current.clear();setShowDropdown(false);
    }
  }, [user, token]);

  const markAsRead = async (id: string) => {
    try {
      const response=await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if(!response.ok)return;
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
      <button aria-label={t('Notifications')} aria-expanded={showDropdown}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative bg-black text-white p-2 rounded-xl border border-[#2B4054] shadow-sm cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute left-1/2 -translate-x-[80%] sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#162638] rounded-2xl shadow-xl border border-[#2B4054] overflow-hidden z-50">
          <div className="p-3 border-b border-[#2B4054] bg-[#102030] flex justify-between items-center">
            <span className="font-bold text-sm text-[#F3F6F9]">{t('Notifications')}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-xs text-[#A5B7C8] font-bold">{t('No notifications yet.')}</div>
            )}
            {notifications.map(n => (
              <button type="button"
                key={n._id} 
                onClick={() => { if (!n.read) markAsRead(n._id); }}
                className={`block w-full text-left p-3 border-b border-[#2B4054] text-xs cursor-pointer ${n.read ? 'bg-[#162638] opacity-60' : 'bg-[#1D3D3B] text-[#F3F6F9] font-medium'}`}
              >
                <p>{t(n.message)}</p>
                <p className="text-[10px] mt-1 text-[#A5B7C8] font-bold">{new Date(n.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
