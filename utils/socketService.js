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
    this.isJoinedAdminRoom = false;
  }

  /**
   * Connect to Socket.IO server
   * @param {string} adminId - Admin user ID for room joining
   * @returns {Promise} Promise that resolves when connected and joined admin room
   */
  connect(adminId) {
    // Store admin ID for reconnections
    if (adminId) {
      this.adminId = adminId;
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
        // Create socket connection to backend
        this.socket = io(API_BASE, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('❌ Socket connection timeout');
          reject(new Error('Connection timeout'));
        }, 10000); // 10 second timeout

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
          this.isJoinedAdminRoom = false; // Reset flag on disconnect

          // Auto-reconnect on certain disconnect reasons
          if (reason === 'io server disconnect') {
            this.socket.connect();
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          // Re-join admin room after reconnection
          if (this.adminId) {
            this.joinAdminRoom().catch((err) => {
              console.error('Failed to re-join admin room:', err);
            });
          }
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
