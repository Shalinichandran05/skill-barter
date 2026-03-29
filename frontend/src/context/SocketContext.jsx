// src/context/SocketContext.jsx
// Manages the Socket.io connection tied to the logged-in user's JWT

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      // Not logged in — disconnect if socket exists
      if (socket) { socket.disconnect(); setSocket(null); }
      return;
    }

    const token = localStorage.getItem('sb_token');
    if (!token) return;

    // Connect to backend socket server
    const newSocket = io(
      import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
      {
        auth: { token },
        transports: ['websocket', 'polling'],
      }
    );

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);
