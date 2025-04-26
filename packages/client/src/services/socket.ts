import { io, Socket } from 'socket.io-client';

// Socket instance
let socket: Socket;

// Initialize socket connection
export const initSocket = (token: string): Socket => {
  // Create socket connection with authentication
  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000', {
    auth: {
      token
    },
    transports: ['websocket'],
    autoConnect: true
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

// Get socket instance
export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return initSocket(token);
  }
  return socket;
};

// Export the socket instance for use in components
export { socket };