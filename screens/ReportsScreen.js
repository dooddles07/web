import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from '../config/api';
import Colors from '../constants/colors';

const ReportsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('all'); // all, active, resolved
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter incidents when tab, search, or date filter changes
  useEffect(() => {
    applyFilters();
  }, [activeTab, searchQuery, dateFilter, incidents]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const [statsResponse, activeResponse, historyResponse] = await Promise.all([
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
        }),
        fetch(`${API_BASE}/api/sos/all-history`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
      ]);

      if (statsResponse.ok && activeResponse.ok && historyResponse.ok) {
        const [statsData, activeData, historyData] = await Promise.all([
          statsResponse.json(),
          activeResponse.json(),
          historyResponse.json()
        ]);

        // Filter out test users (same as DashboardScreen)
        const testUsernames = ['test', 'placeholder', 'example', 'demo', 'admin'];
        const validActiveIncidents = (activeData.data?.alerts || []).filter(item => {
          if (!item._id || !item.username) return false;
          const username = (item.username || '').toLowerCase().trim();
          return !testUsernames.includes(username);
        });

        const activeIncidents = validActiveIncidents.map(item => ({
          ...item,
          id: item._id,
          status: 'active',
          reportedBy: item.userId?.fullname || item.fullname || item.username,
          location: item.address || 'Location unavailable',
          coordinates: formatCoordinates(item.latitude, item.longitude)
        }));

        const historyIncidents = (historyData.data?.history || []).map(item => ({
          ...item,
          id: item._id,
          reportedBy: item.userId?.fullname || item.fullname || item.username,
          location: item.address || 'Location unavailable',
          coordinates: formatCoordinates(item.latitude, item.longitude)
        }));

        const allIncidents = [...activeIncidents, ...historyIncidents].sort((a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
        );

        setIncidents(allIncidents);

        // Use stats from backend for accurate counts (including cancelled incidents)
        setStats({
          total: statsData.data?.totalIncidents || 0,
          active: activeIncidents.length, // Use filtered count, not stats endpoint
          resolved: statsData.data?.resolvedIncidents || 0,
          cancelled: statsData.data?.cancelledIncidents || 0
        });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...incidents];

    // Apply tab filter
    if (activeTab === 'active') {
      filtered = filtered.filter(i => i.status === 'active');
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(i => i.status === 'resolved');
    }

    // Apply date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(i => {
        const incidentDate = new Date(i.timestamp);
        return incidentDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(i => new Date(i.timestamp) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(i => new Date(i.timestamp) >= monthAgo);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        (i.reportedBy?.toLowerCase().includes(query)) ||
        (i.username?.toLowerCase().includes(query)) ||
        (i.location?.toLowerCase().includes(query)) ||
        (i.address?.toLowerCase().includes(query))
      );
    }

    setFilteredIncidents(filtered);
  };

  const formatCoordinates = (lat, lng) => {
    if (!lat || !lng) return 'N/A';
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return Colors.alert.warning;
      case 'resolved': return Colors.alert.success;
      case 'cancelled': return Colors.text.secondary;
      default: return Colors.text.secondary;
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return 'pending';
      case 'resolved': return 'check-circle';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const TabButton = ({ title, tabKey, count }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.activeTab]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={[styles.tabBadge, activeTab === tabKey && styles.activeTabBadge]}>
          <Text style={[styles.tabBadgeText, activeTab === tabKey && styles.activeTabBadgeText]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const IncidentCard = ({ incident }) => (
    <TouchableOpacity
      style={styles.incidentCard}
      onPress={() => setSelectedIncident(incident)}
      activeOpacity={0.7}
    >
      <View style={styles.incidentCardHeader}>
        <View style={styles.incidentCardTitleRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(incident.status) }]} />
          <Text style={styles.incidentCardTitle}>{incident.reportedBy}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
          <Icon name={getStatusIcon(incident.status)} size={12} color={Colors.neutral.white} />
          <Text style={styles.statusBadgeText}>
            {incident.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.incidentCardBody}>
        <View style={styles.incidentDetailRow}>
          <Icon name="location-on" size={16} color={Colors.text.secondary} />
          <Text style={styles.incidentDetailText} numberOfLines={1}>
            {incident.location}
          </Text>
        </View>
        <View style={styles.incidentDetailRow}>
          <Icon name="access-time" size={16} color={Colors.text.secondary} />
          <Text style={styles.incidentDetailText}>
            {formatDate(incident.timestamp)}
          </Text>
        </View>
        <View style={styles.incidentDetailRow}>
          <Icon name="my-location" size={16} color={Colors.text.secondary} />
          <Text style={styles.incidentDetailText} numberOfLines={1}>
            {incident.coordinates}
          </Text>
        </View>
      </View>

      <View style={styles.incidentCardFooter}>
        <Text style={styles.timeAgoText}>{formatTimeAgo(incident.timestamp)}</Text>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => setSelectedIncident(incident)}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Icon name="arrow-forward" size={14} color={Colors.secondary.orange} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const IncidentDetailModal = () => {
    if (!selectedIncident) return null;

    return (
      <Modal
        visible={selectedIncident !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedIncident(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Incident Details</Text>
              <TouchableOpacity onPress={() => setSelectedIncident(null)}>
                <Icon name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status Badge */}
              <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedIncident.status) + '20' }]}>
                <Icon name={getStatusIcon(selectedIncident.status)} size={20} color={getStatusColor(selectedIncident.status)} />
                <Text style={[styles.modalStatusText, { color: getStatusColor(selectedIncident.status) }]}>
                  {selectedIncident.status.toUpperCase()}
                </Text>
              </View>

              {/* Incident Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Incident Information</Text>

                <View style={styles.modalInfoRow}>
                  <Icon name="person" size={20} color={Colors.secondary.orange} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Reported By</Text>
                    <Text style={styles.modalInfoValue}>{selectedIncident.reportedBy}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="account-circle" size={20} color={Colors.secondary.orange} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Username</Text>
                    <Text style={styles.modalInfoValue}>{selectedIncident.username}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="access-time" size={20} color={Colors.secondary.orange} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Date & Time</Text>
                    <Text style={styles.modalInfoValue}>{formatDate(selectedIncident.timestamp)}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="schedule" size={20} color={Colors.secondary.orange} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Time Elapsed</Text>
                    <Text style={styles.modalInfoValue}>{formatTimeAgo(selectedIncident.timestamp)}</Text>
                  </View>
                </View>
              </View>

              {/* Location Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Location Details</Text>

                <View style={styles.modalInfoRow}>
                  <Icon name="location-on" size={20} color={Colors.primary.red} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Address</Text>
                    <Text style={styles.modalInfoValue}>{selectedIncident.location}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Icon name="my-location" size={20} color={Colors.primary.red} />
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalInfoLabel}>Coordinates</Text>
                    <Text style={styles.modalInfoValue}>{selectedIncident.coordinates}</Text>
                  </View>
                </View>

                {selectedIncident.latitude && selectedIncident.longitude && (
                  <View style={styles.modalInfoRow}>
                    <Icon name="map" size={20} color={Colors.primary.red} />
                    <View style={styles.modalInfoContent}>
                      <Text style={styles.modalInfoLabel}>Exact Position</Text>
                      <Text style={styles.modalInfoValue}>
                        Lat: {parseFloat(selectedIncident.latitude).toFixed(6)}{'\n'}
                        Lng: {parseFloat(selectedIncident.longitude).toFixed(6)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Colors.secondary.orange }]}
                  onPress={() => {
                    setSelectedIncident(null);
                    navigation.navigate('NavigationScreen', { selectedIncident });
                  }}
                >
                  <Icon name="directions" size={20} color={Colors.neutral.white} />
                  <Text style={styles.modalActionText}>Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Colors.alert.info }]}
                  onPress={() => {
                    setSelectedIncident(null);
                    navigation.navigate('Messages', {
                      userId: selectedIncident.userId,
                      username: selectedIncident.username,
                      fullname: selectedIncident.reportedBy
                    });
                  }}
                >
                  <Icon name="message" size={20} color={Colors.neutral.white} />
                  <Text style={styles.modalActionText}>Message</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Reports</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.filterOptions}>
              {[
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Last 7 Days', value: 'week' },
                { label: 'Last 30 Days', value: 'month' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    dateFilter === option.value && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setDateFilter(option.value);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    dateFilter === option.value && styles.filterOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {dateFilter === option.value && (
                    <Icon name="check" size={20} color={Colors.secondary.orange} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchReports}
        >
          <Icon name="refresh" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Incidents"
            value={stats.total}
            icon="assessment"
            color={Colors.secondary.orange}
          />
          <StatCard
            title="Active Cases"
            value={stats.active}
            icon="pending-actions"
            color={Colors.alert.warning}
          />
          <StatCard
            title="Resolved Cases"
            value={stats.resolved}
            icon="check-circle"
            color={Colors.alert.success}
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon="cancel"
            color={Colors.text.secondary}
          />
        </View>

        {/* Search and Filter */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={Colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or location..."
              placeholderTextColor={Colors.neutral.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="filter-list" size={20} color={Colors.neutral.white} />
          </TouchableOpacity>
        </View>

        {/* Active Filter Indicator */}
        {dateFilter !== 'all' && (
          <View style={styles.activeFilterContainer}>
            <Text style={styles.activeFilterText}>
              Filter: {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </Text>
            <TouchableOpacity onPress={() => setDateFilter('all')}>
              <Icon name="close" size={16} color={Colors.secondary.orange} />
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButton title="All" tabKey="all" count={stats.total} />
          <TabButton title="Active" tabKey="active" count={stats.active} />
          <TabButton title="Resolved" tabKey="resolved" count={stats.resolved} />
        </View>

        {/* Incidents List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.secondary.orange} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : filteredIncidents.length > 0 ? (
          <View style={styles.incidentsContainer}>
            <Text style={styles.resultsCount}>
              {filteredIncidents.length} {filteredIncidents.length === 1 ? 'incident' : 'incidents'} found
            </Text>
            {filteredIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="folder-open" size={64} color={Colors.neutral.gray300} />
            <Text style={styles.emptyStateTitle}>No Incidents Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try adjusting your search or filters' : 'No incidents to display'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <IncidentDetailModal />
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
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
    color: Colors.text.secondary,
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
  searchFilterContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    outlineStyle: 'none',
  },
  filterButton: {
    backgroundColor: Colors.secondary.orange,
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.alert.success,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 15,
  },
  activeFilterText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: Colors.secondary.orange,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.neutral.white,
  },
  tabBadge: {
    backgroundColor: Colors.border.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: Colors.neutral.white,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  activeTabBadgeText: {
    color: Colors.secondary.orange,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 15,
    fontWeight: '500',
  },
  incidentsContainer: {
    marginBottom: 20,
  },
  incidentCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  },
  incidentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  incidentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  incidentCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    color: Colors.neutral.white,
    fontSize: 10,
    fontWeight: '600',
  },
  incidentCardBody: {
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
    color: Colors.text.secondary,
    flex: 1,
  },
  incidentCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.gray100,
  },
  timeAgoText: {
    fontSize: 12,
    color: Colors.neutral.gray400,
    fontStyle: 'italic',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: Colors.secondary.orange,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 5,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  modalInfoContent: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalActionText: {
    color: Colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterModalContent: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
  },
  filterSection: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.neutral.gray50,
  },
  filterOptionActive: {
    backgroundColor: Colors.alert.success,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
});

export default ReportsScreen;
