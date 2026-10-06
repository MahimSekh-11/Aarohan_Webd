import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  role: 'admin' | 'manager' | 'customer';
  storeName?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

function readStoredAuth(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const user = JSON.parse(savedUser);
      if (user && typeof user._id === 'string' && ['admin','manager','customer'].includes(user.role)) return { token, user };
    }
  } catch { /* Missing browser storage or invalid saved session. */ }
  return { token: null, user: null };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readStoredAuth(),
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  initialize: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }
}));
