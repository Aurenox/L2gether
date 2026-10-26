import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token = null) {
  if (!socket) {
    let authToken = token;
    if (!authToken) {
      try {
        const sess = JSON.parse(localStorage.getItem('l2gether_guest_session') || '{}');
        authToken = sess.token;
      } catch (e) {}
    }

    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '/';
    socket = io(socketUrl, {
      auth: { token: authToken },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      transports: ['websocket', 'polling']
    });
  } else if (token && socket.auth?.token !== token) {
    socket.auth = { token };
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { getSocket, disconnectSocket };
