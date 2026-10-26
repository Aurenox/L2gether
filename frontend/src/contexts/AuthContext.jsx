import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem('l2gether_guest_session');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const setSessionData = (newSession) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem('l2gether_guest_session', JSON.stringify(newSession));
    } else {
      localStorage.removeItem('l2gether_guest_session');
    }
  };

  const updateDisplayName = (displayName) => {
    if (session) {
      const updated = { ...session, displayName };
      setSessionData(updated);
    }
  };

  const clearSession = () => {
    setSessionData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        sessionId: session?.sessionId || null,
        token: session?.token || null,
        displayName: session?.displayName || 'Guest',
        isAuthenticated: !!session?.token,
        setSessionData,
        updateDisplayName,
        clearSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
