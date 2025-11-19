import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../config/api';
import socketService from '../utils/socketService';

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    criticalIncidents: 0
  });

  const [allActiveIncidents, setAllActiveIncidents] = useState([]); // Store ALL active incidents
  const [activeIncidents, setActiveIncidents] = useState([]); // Display top 3
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [hoveredCard, setHoveredCard] = useState(null);

  // Format coordinates helper
  const formatCoordinates = useCallback((lat, lng) => {
    if (!lat || !lng) return 'N/A';
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  }, []);

  // Fetch real data from API and setup Socket.IO
  useEffect(() => {
    let isMounted = true;
    let connectionCheckCleanup;

    const init = async () => {
      // Check authentication first
      const token = await AsyncStorage.getItem('authToken');
      const adminData = await AsyncStorage.getItem('adminData');

      if (!token) {
        console.error('Dashboard - No auth token, redirecting to login');
        showToast('Please log in to access the dashboard', 'error');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        }, 1000);
        return;
      }

      // Fetch initial data
      await fetchDashboardData();

      // Setup Socket.IO (async)
      if (isMounted) {
        connectionCheckCleanup = await setupSocketIO();
      }
    };

    init();

    // Refresh data every 60 seconds (Socket.IO handles real-time updates, so less frequent polling)
    const interval = setInterval(() => {
      if (isMounted) fetchDashboardData();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (connectionCheckCleanup) connectionCheckCleanup();
      // Note: Don't disconnect socket here - it's shared across the app
    };
  }, []);

  // Setup Socket.IO for real-time SOS alerts
  const setupSocketIO = async () => {
    try {
      const adminData = await AsyncStorage.getItem('adminData');

      if (!adminData) {
        console.warn('No admin data found, skipping socket setup');
        return null;
      }

      const admin = JSON.parse(adminData);
      const adminId = admin._id || admin.id || 'web-admin';

      // Wait for socket to connect and join admin room
      await socketService.connect(adminId);

      // Define event handlers (these need to be stored for cleanup)
      const handleSOSAlert = (data) => {
        // Filter out test users (same as NavigationScreen)
        const testUsernames = ['test', 'placeholder', 'example', 'demo', 'admin'];
        const username = (data.username || '').toLowerCase().trim();

        if (testUsernames.includes(username) || !data.id || !data.username) {
          return;
        }

        // Add new incident to FULL list immediately
        const newIncident = {
          _id: data.id,
          id: data.id,
          username: data.username,
          fullname: data.fullname,
          userId: data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          timestamp: data.timestamp,
        };

        // Update full list
        setAllActiveIncidents(prev => {
          // Check if incident already exists
          const exists = prev.some(inc => inc._id === data.id || inc.username === data.username);
          if (exists) return prev;
          return [newIncident, ...prev];
        });

        setStats(prev => ({
          ...prev,
          totalIncidents: prev.totalIncidents + 1,
          activeIncidents: prev.activeIncidents + 1,
          criticalIncidents: prev.criticalIncidents + 1
        }));

        showToast(`New emergency alert from ${data.fullname || data.username}!`, 'error');
      };

      const handleSOSUpdate = (data) => {
        // Update the specific incident in FULL list immediately
        setAllActiveIncidents(prev => prev.map(incident => {
          if (incident.id === data.id || incident._id === data.id || incident.username === data.username) {
            return {
              ...incident,
              latitude: data.latitude,
              longitude: data.longitude,
              address: data.address,
              timestamp: data.timestamp,
            };
          }
          return incident;
        }));

        showToast(`Location updated for ${data.fullname || data.username}`, 'success');
      };

      const handleSOSCancelled = (data) => {
        // Remove from FULL list immediately - convert IDs to strings for comparison
        const dataId = String(data.id);
        const dataUsername = String(data.username);

        setAllActiveIncidents(prev => {
          const filtered = prev.filter(incident => {
            const incidentId = String(incident.id || incident._id);
            const incidentUsername = String(incident.username);

            // Keep incident if NONE of these match
            return incidentId !== dataId && incidentUsername !== dataUsername;
          });

          return filtered;
        });

        setStats(prev => ({
          ...prev,
          activeIncidents: Math.max(0, prev.activeIncidents - 1),
          criticalIncidents: Math.max(0, prev.criticalIncidents - 1)
        }));

        showToast(`Emergency cancelled by ${data.username}`, 'success');
      };

      const handleSOSResolved = (data) => {
        // Remove from FULL list and update stats immediately - convert IDs to strings for comparison
        const dataId = String(data.id);
        const dataUsername = String(data.username);

        setAllActiveIncidents(prev => {
          const filtered = prev.filter(incident => {
            const incidentId = String(incident.id || incident._id);
            const incidentUsername = String(incident.username);

            // Keep incident if NONE of these match
            return incidentId !== dataId && incidentUsername !== dataUsername;
          });

          return filtered;
        });

        setStats(prev => ({
          ...prev,
          activeIncidents: Math.max(0, prev.activeIncidents - 1),
          criticalIncidents: Math.max(0, prev.criticalIncidents - 1),
          resolvedIncidents: prev.resolvedIncidents + 1
        }));

        showToast(`Emergency resolved for ${data.username}`, 'success');
      };

      const handleNewMessage = (data) => {
        // Only show notification if message is from a user
        if (data.senderType === 'user') {
          showToast(`New message from ${data.senderName}`, 'success');
        }
      };

      // Remove any existing listeners first to prevent duplicates
      socketService.off('sos-alert', handleSOSAlert);
      socketService.off('sos-updated', handleSOSUpdate);
      socketService.off('sos-cancelled', handleSOSCancelled);
      socketService.off('sos-resolved', handleSOSResolved);
      socketService.off('new-message', handleNewMessage);

      // Register event listeners
      socketService.on('sos-alert', handleSOSAlert);
      socketService.on('sos-updated', handleSOSUpdate);
      socketService.on('sos-cancelled', handleSOSCancelled);
      socketService.on('sos-resolved', handleSOSResolved);
      socketService.on('new-message', handleNewMessage);

      // Monitor connection status (reduced frequency for performance)
      const checkConnection = async () => {
        const isConnected = socketService.isConnected();
        if (!isConnected) {
          try {
            await socketService.connect(adminId);

            // Re-register event listeners after reconnection
            socketService.off('sos-alert', handleSOSAlert);
            socketService.off('sos-updated', handleSOSUpdate);
            socketService.off('sos-cancelled', handleSOSCancelled);
            socketService.off('sos-resolved', handleSOSResolved);
            socketService.off('new-message', handleNewMessage);

            socketService.on('sos-alert', handleSOSAlert);
            socketService.on('sos-updated', handleSOSUpdate);
            socketService.on('sos-cancelled', handleSOSCancelled);
            socketService.on('sos-resolved', handleSOSResolved);
            socketService.on('new-message', handleNewMessage);
          } catch (err) {
            console.error('Failed to reconnect socket:', err);
          }
        }
      };

      // Check connection more frequently for better real-time performance
      setTimeout(checkConnection, 3000);
      const connectionCheckInterval = setInterval(checkConnection, 10000); // Check every 10 seconds

      // Return cleanup function
      return () => {
        clearInterval(connectionCheckInterval);
        // Remove event listeners when component unmounts
        socketService.off('sos-alert', handleSOSAlert);
        socketService.off('sos-updated', handleSOSUpdate);
        socketService.off('sos-cancelled', handleSOSCancelled);
        socketService.off('sos-resolved', handleSOSResolved);
        socketService.off('new-message', handleNewMessage);
      };
    } catch (error) {
      console.error('Error setting up Socket.IO:', error);
      return null;
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Fetch stats and active incidents in parallel for better performance
      const [statsResponse, activeResponse] = await Promise.all([
        fetch(`${API_BASE}/api/sos/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }),
        fetch(`${API_BASE}/api/sos/all-active`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
      ]);

      if (statsResponse.ok && activeResponse.ok) {
        const [statsData, activeData] = await Promise.all([
          statsResponse.json(),
          activeResponse.json()
        ]);

        // Optimized filtering - only filter truly invalid data (same as NavigationScreen)
        const testUsernames = ['test', 'placeholder', 'example', 'demo', 'admin'];
        const validIncidents = (activeData.data?.alerts || []).filter(item => {
          if (!item._id || !item.username) return false;
          const username = (item.username || '').toLowerCase().trim();
          return !testUsernames.includes(username);
        });

        const active = validIncidents;

        // Store ALL active incidents (synced with NavigationScreen)
        setAllActiveIncidents(active);

        // Calculate critical threshold for display
        const now = new Date();
        const criticalThreshold = 30 * 60 * 1000; // 30 minutes

        // Count critical incidents (those within 30 minutes)
        const criticalCount = active.filter(incident => {
          const timeSinceReport = now - new Date(incident.timestamp);
          return timeSinceReport < criticalThreshold;
        }).length;

        // Use stats from the dedicated endpoint for total and resolved
        // But use actual filtered incidents count for active and critical (synced with NavigationScreen)
        setStats({
          totalIncidents: statsData.data?.totalIncidents || 0,
          activeIncidents: active.length, // Use filtered count (same as NavigationScreen)
          resolvedIncidents: statsData.data?.resolvedIncidents || 0,
          criticalIncidents: criticalCount // Use calculated count from filtered incidents
        });

        setError(null);
      } else {
        const errorMsg = `Failed to fetch data: Stats=${statsResponse.status} Active=${activeResponse.status}`;
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [formatCoordinates]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Auto-format top 3 incidents for display whenever the full list changes
  useEffect(() => {
    const now = new Date();
    const criticalThreshold = 30 * 60 * 1000; // 30 minutes

    const formattedIncidents = allActiveIncidents.slice(0, 3).map(incident => {
      const timeSinceReport = now - new Date(incident.timestamp);
      return {
        ...incident,
        id: incident._id,
        type: 'Emergency Alert',
        location: incident.address || 'Location unavailable',
        reportedBy: incident.userId?.fullname || incident.fullname || incident.username,
        time: formatTimeAgo(incident.timestamp),
        status: timeSinceReport < criticalThreshold ? 'critical' : 'active',
        distance: formatCoordinates(incident.latitude, incident.longitude),
      };
    });

    setActiveIncidents(formattedIncidents);
  }, [allActiveIncidents, formatCoordinates]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  const StatCard = ({ title, value, icon, color, onPress, cardId }) => (
    <TouchableOpacity
      style={[
        styles.statCard,
        { borderLeftColor: color },
        Platform.OS === 'web' && hoveredCard === cardId && styles.statCardHover
      ]}
      onPress={onPress}
      onMouseEnter={() => Platform.OS === 'web' && setHoveredCard(cardId)}
      onMouseLeave={() => Platform.OS === 'web' && setHoveredCard(null)}
      accessibilityLabel={`${title}: ${value}`}
      accessibilityRole="button"
      accessibilityHint={`View details for ${title.toLowerCase()}`}
    >
      <View style={styles.statCardContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress, actionId }) => (
    <TouchableOpacity
      style={[
        styles.quickAction,
        Platform.OS === 'web' && hoveredCard === actionId && styles.quickActionHover
      ]}
      onPress={onPress}
      onMouseEnter={() => Platform.OS === 'web' && setHoveredCard(actionId)}
      onMouseLeave={() => Platform.OS === 'web' && setHoveredCard(null)}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityHint={`Navigate to ${title.toLowerCase()}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const IncidentCard = ({ incident }) => (
    <View
      style={[
        styles.incidentCard,
        incident.status === 'critical' && styles.incidentCardCritical
      ]}
      accessibilityLabel={`${incident.type} incident at ${incident.location}, reported ${incident.time}`}
      accessibilityRole="summary"
    >
      <View style={styles.incidentHeader}>
        <View style={styles.incidentTitleRow}>
          <Icon
            name={incident.status === 'critical' ? 'priority-high' : 'warning'}
            size={20}
            color={incident.status === 'critical' ? '#ef4444' : '#f59e0b'}
          />
          <Text style={styles.incidentType}>{incident.type}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          incident.status === 'critical' ? styles.statusCritical : styles.statusActive
        ]}>
          <Text style={styles.statusText}>
            {incident.status === 'critical' ? 'CRITICAL' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      <View style={styles.incidentDetails}>
        <View style={styles.incidentDetailRow}>
          <Icon name="location-on" size={16} color="#6b7280" />
          <Text style={styles.incidentDetailText}>{incident.location}</Text>
        </View>
        <View style={styles.incidentDetailRow}>
          <Icon name="person" size={16} color="#6b7280" />
          <Text style={styles.incidentDetailText}>{incident.reportedBy}</Text>
        </View>
        <View style={styles.incidentDetailRow}>
          <Icon name="access-time" size={16} color="#6b7280" />
          <Text style={styles.incidentDetailText}>{incident.time}</Text>
        </View>
        <View style={styles.incidentDetailRow}>
          <Icon name="my-location" size={16} color="#6b7280" />
          <Text style={styles.incidentDetailText}>{incident.distance}</Text>
        </View>
      </View>

      <View style={styles.incidentActions}>
        <TouchableOpacity
          style={[styles.incidentActionButton, styles.navigateButton]}
          onPress={() => {
            showToast('Opening navigation...', 'success');
            // Pass incident data to NavigationScreen
            navigation.navigate('NavigationScreen', { selectedIncident: incident });
          }}
          accessibilityLabel="Navigate to incident location"
          accessibilityRole="button"
        >
          <Icon name="directions" size={16} color="#ffffff" />
          <Text style={styles.incidentActionText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.incidentActionButton, styles.messageButton]}
          onPress={() => {
            showToast('Opening messages...', 'success');
            // Pass user data to MessagesScreen
            navigation.navigate('Messages', {
              userId: incident.userId,
              username: incident.username,
              fullname: incident.reportedBy
            });
          }}
          accessibilityLabel="Message reporter"
          accessibilityRole="button"
        >
          <Icon name="message" size={16} color="#ffffff" />
          <Text style={styles.incidentActionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.incidentActionButton, styles.callButton]}
          onPress={() => {
            const phoneNumber = incident.userId?.contactNumber || 'No number available';
            showToast(`Calling ${incident.reportedBy}: ${phoneNumber}`, 'success');
          }}
          accessibilityLabel="Call emergency contact"
          accessibilityRole="button"
        >
          <Icon name="phone" size={16} color="#ffffff" />
          <Text style={styles.incidentActionText}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toast.visible && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <Icon
            name={toast.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.openDrawer()}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          accessibilityHint="Opens the navigation drawer"
        >
          <Icon name="menu" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerRight}>
          {/* Socket Connection Status Indicator */}
          <TouchableOpacity
            style={[
              styles.connectionIndicator,
              socketService.isConnected() ? styles.connected : styles.disconnected
            ]}
            onPress={() => {
              showToast(
                `Socket ${socketService.isConnected() ? 'Connected' : 'Disconnected'}`,
                socketService.isConnected() ? 'success' : 'error'
              );
            }}
          >
            <View style={[
              styles.connectionDot,
              socketService.isConnected() ? styles.connectedDot : styles.disconnectedDot
            ]} />
            <Text style={styles.connectionText}>
              {socketService.isConnected() ? 'Live' : 'Offline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            accessibilityHint="View 3 new notifications"
          >
            <Icon name="notifications" size={24} color="#1f2937" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Alert */}
        {stats.criticalIncidents > 0 && (
          <View style={styles.emergencyAlert}>
            <Icon name="warning" size={20} color="#ef4444" />
            <Text style={styles.emergencyText}>
              {stats.criticalIncidents} Critical {stats.criticalIncidents === 1 ? 'incident' : 'incidents'} requiring immediate attention
            </Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate('NavigationScreen')}
              accessibilityLabel="View critical incidents"
              accessibilityRole="button"
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            cardId="total"
            title="Total Incidents"
            value={stats.totalIncidents}
            icon="bar-chart"
            color="#14b8a6"
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            cardId="active"
            title="Active Cases"
            value={stats.activeIncidents}
            icon="pending-actions"
            color="#f59e0b"
            onPress={() => navigation.navigate('NavigationScreen')}
          />
          <StatCard
            cardId="resolved"
            title="Resolved Cases"
            value={stats.resolvedIncidents}
            icon="check-circle"
            color="#10b981"
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            cardId="critical"
            title="Critical Cases"
            value={stats.criticalIncidents}
            icon="priority-high"
            color="#ef4444"
            onPress={() => navigation.navigate('NavigationScreen')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <QuickAction
              actionId="map"
              title="View Map"
              icon="map"
              color="#14b8a6"
              onPress={() => navigation.navigate('NavigationScreen')}
            />
            <QuickAction
              actionId="messages"
              title="Messages"
              icon="message"
              color="#3b82f6"
              onPress={() => navigation.navigate('Messages')}
            />
            <QuickAction
              actionId="reports"
              title="Reports"
              icon="assessment"
              color="#8b5cf6"
              onPress={() => navigation.navigate('Reports')}
            />
            <QuickAction
              actionId="settings"
              title="Settings"
              icon="settings"
              color="#6b7280"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Active Incidents List */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Incidents</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('NavigationScreen')}
              accessibilityLabel="View all incidents"
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.emptyState}>
              <Icon name="error-outline" size={48} color="#ef4444" />
              <Text style={styles.emptyStateTitle}>Error Loading Data</Text>
              <Text style={styles.emptyStateText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  fetchDashboardData();
                }}
              >
                <Icon name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text style={styles.emptyStateText}>Loading incidents...</Text>
            </View>
          ) : activeIncidents.length > 0 ? (
            <View style={styles.incidentsContainer}>
              {activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="check-circle" size={48} color="#10b981" />
              <Text style={styles.emptyStateTitle}>All Clear</Text>
              <Text style={styles.emptyStateText}>
                No active incidents at this time
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // Mobile gray50 (60% - primary background)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff', // Mobile white (30% - secondary)
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // Mobile gray200
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ef4444', // Mobile red
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  connected: {
    backgroundColor: '#d1fae5',
  },
  disconnected: {
    backgroundColor: '#fee2e2',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedDot: {
    backgroundColor: '#10b981',
  },
  disconnectedDot: {
    backgroundColor: '#ef4444',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2', // Mobile red50
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444', // Mobile red
    marginBottom: 20,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 10,
    color: '#6b7280', // Mobile gray500 - secondary text
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#ef4444', // Mobile red
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff', // Mobile white
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 3,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  statCardHover: {
    transform: [{ scale: 1.02 }],
    elevation: 6,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.15)',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280', // Mobile gray500 - secondary text
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
  },
  viewAllText: {
    fontSize: 14,
    color: '#14b8a6', // Mobile primary teal
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#ffffff', // Mobile white
    padding: 15,
    borderRadius: 12,
    width: '23%',
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  },
  quickActionHover: {
    transform: [{ scale: 1.05 }],
    elevation: 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 10,
    color: '#6b7280', // Mobile gray500 - secondary text
    textAlign: 'center',
  },
  incidentsContainer: {
    gap: 15,
  },
  incidentCard: {
    backgroundColor: '#ffffff', // Mobile white
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b', // Mobile amber for active
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
    marginBottom: 15,
  },
  incidentCardCritical: {
    borderLeftColor: '#ef4444', // Mobile red for critical
    backgroundColor: '#fef2f2', // Mobile red50
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCritical: {
    backgroundColor: '#ef4444', // Mobile red
  },
  statusActive: {
    backgroundColor: '#f59e0b', // Mobile amber
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  incidentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  incidentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentDetailText: {
    fontSize: 13,
    color: '#6b7280', // Mobile gray500 - secondary text
  },
  incidentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  incidentActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  navigateButton: {
    backgroundColor: '#14b8a6', // Mobile primary teal
  },
  messageButton: {
    backgroundColor: '#3b82f6', // Mobile blue
  },
  callButton: {
    backgroundColor: '#10b981', // Mobile green
  },
  incidentActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff', // Mobile white
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280', // Mobile gray500 - secondary text
    marginTop: 6,
    textAlign: 'center',
  },
  // Toast notification styles
  toast: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : [],
    marginLeft: Platform.OS !== 'web' ? -150 : 0,
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.15)',
    elevation: 8,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#10b981', // Mobile green
  },
  toastError: {
    backgroundColor: '#ef4444', // Mobile red
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;
