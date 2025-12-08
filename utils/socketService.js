/**
 * Socket.IO Service for Real-Time Updates
 * Connects web admin interface to backend Socket.IO server
 * for real-time SOS alerts and message notifications
 */

import { io } from 'socket.io-client';
import API_BASE from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.adminId = null;
    this.token = null; // 🔒 Store auth token for reconnections
    this.isJoinedAdminRoom = false;
  }

  /**
   * Connect to Socket.IO server
   * @param {string} adminId - Admin user ID for room joining
   * @param {string} token - JWT token for authentication (REQUIRED)
   * @returns {Promise} Promise that resolves when connected and joined admin room
   */
  connect(adminId, token) {
    // 🔒 SECURITY: Require authentication token
    if (!token) {
      return Promise.reject(new Error('Authentication token required'));
    }

    // Store admin ID and token for reconnections
    if (adminId) {
      this.adminId = adminId;
    }
    if (token) {
      this.token = token;
    }

    // If socket exists and is connected, check if we need to join admin room
    if (this.socket?.connected) {
      // If not joined yet, join now
      if (!this.isJoinedAdminRoom && this.adminId) {
        return this.joinAdminRoom();
      }

      return Promise.resolve(this.socket);
    }

    return new Promise((resolve, reject) => {
      try {
        // 🔒 Create socket connection with authentication
        // Optimized for free tier services (Render, Vercel) with aggressive reconnection
        this.socket = io(API_BASE, {
          auth: {
            token: this.token // Pass JWT token for authentication
          },
          transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
          reconnection: true,
          reconnectionAttempts: Infinity, // Keep trying to reconnect (important for free tier cold starts)
          reconnectionDelay: 1000, // Start with 1s delay
          reconnectionDelayMax: 5000, // Max 5s between reconnection attempts
          timeout: 20000, // 20s timeout for initial connection (free tier can be slow)
          pingTimeout: 60000, // 60s ping timeout (free tier servers can be slow)
          pingInterval: 25000, // Ping every 25s to keep connection alive
        });

        // Set up connection timeout (longer for free tier services)
        const connectionTimeout = setTimeout(() => {
          console.error('❌ Socket connection timeout (20s limit)');
          console.warn('⚠️ This may be due to free tier cold start - will keep retrying in background');
          // Don't reject - let it keep trying via reconnection
          resolve(this.socket); // Resolve anyway to not block app
        }, 20000); // 20 second timeout to match socket config

        // Connection event handlers
        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);

          // Join admin room and resolve when done
          if (this.adminId) {
            this.joinAdminRoom()
              .then(() => resolve(this.socket))
              .catch((err) => {
                console.error('Failed to join admin room:', err);
                resolve(this.socket); // Still resolve to not block the app
              });
          } else {
            resolve(this.socket);
          }
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ Socket connection error:', error.message);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.warn(`⚠️ [Socket.IO] Disconnected. Reason: ${reason}`);
          this.isJoinedAdminRoom = false; // Reset flag on disconnect

          // Auto-reconnect on certain disconnect reasons
          if (reason === 'io server disconnect') {
            console.log('🔄 [Socket.IO] Server disconnected, attempting to reconnect...');
            this.socket.connect();
          } else if (reason === 'transport close' || reason === 'ping timeout') {
            console.log('🔄 [Socket.IO] Connection lost (free tier timeout?), will auto-reconnect...');
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`✅ [Socket.IO] Reconnected successfully after ${attemptNumber} attempts`);
          // Re-join admin room after reconnection
          if (this.adminId) {
            this.joinAdminRoom()
              .then(() => console.log('✅ [Socket.IO] Re-joined admin room after reconnection'))
              .catch((err) => {
                console.error('❌ [Socket.IO] Failed to re-join admin room:', err);
              });
          }
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`🔄 [Socket.IO] Reconnection attempt #${attemptNumber}...`);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('❌ [Socket.IO] Reconnection failed after all attempts');
        });
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        reject(error);
      }
    });
  }

  /**
   * Join admin room with acknowledgment
   * @returns {Promise}
   */
  joinAdminRoom() {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      // Set timeout for join operation
      const joinTimeout = setTimeout(() => {
        console.warn('Join admin room timeout - proceeding anyway');
        this.isJoinedAdminRoom = true; // Assume joined to not block
        resolve();
      }, 5000);

      this.socket.emit('join-admin', this.adminId, (response) => {
        clearTimeout(joinTimeout);

        if (response && response.success) {
          this.isJoinedAdminRoom = true;
          resolve();
        } else {
          console.warn('Join admin room failed:', response);
          this.isJoinedAdminRoom = true; // Mark as joined anyway to not block
          resolve(); // Don't reject, just resolve to continue
        }
      });
    });
  }

  /**
   * Subscribe to a socket event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return;
    }

    this.socket.on(event, callback);

    // Store listener reference for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unsubscribe from a socket event
   * @param {string} event - Event name
   * @param {function} callback - Callback function (optional)
   */
  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);

      // Remove from listeners map
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Emit a socket event
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Join a specific room
   * @param {string} roomId - Room ID to join
   */
  joinRoom(roomId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }

    this.socket.emit('join', roomId);
  }

  /**
   * Leave a specific room
   * @param {string} roomId - Room ID to leave
   */
  leaveRoom(roomId) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }

    this.socket.emit('leave', roomId);
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      // Clean up all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();

      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   * @returns {string|null}
   */
  getSocketId() {
    return this.socket?.id || null;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
