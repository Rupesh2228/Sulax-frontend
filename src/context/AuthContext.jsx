import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

let sessionRequest = null;
const loadSession = () => {
  if (!sessionRequest) {
    sessionRequest = api.get('/auth/me').finally(() => { sessionRequest = null; });
  }
  return sessionRequest;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setSessionError('');
    try {
      const d = await loadSession();
      setUser(d.user);
      return d.user;
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        return null;
      } else {
        setSessionError(err.message || 'Could not check your session.');
        return undefined;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    if (d.token) localStorage.setItem('sulax_token', d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (form) => {
    const d = await api.post('/auth/register', form);
    if (d.token) localStorage.setItem('sulax_token', d.token);
    setUser(d.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const d = await api.post('/auth/google', {
      credential,
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    });
    if (d.token) localStorage.setItem('sulax_token', d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('sulax_token');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, sessionError, retrySession: refreshSession, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
