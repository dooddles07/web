import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE from '../config/api';

const LogoutScreen = ({ navigation }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const data = await AsyncStorage.getItem('adminData');
      if (data) {
        setAdminData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleLogout = () => {
    // Use window.confirm for web compatibility
    if (window.confirm('Are you sure you want to logout?')) {
      performLogout();
    }
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Call logout endpoint
      await axios.post(
        `${API_BASE}/api/admin/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Clear admin storage
      await AsyncStorage.multiRemove(['authToken', 'adminData']);
      await new Promise(resolve => setTimeout(resolve, 1000));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API fails, clear local data and navigate
      await AsyncStorage.multiRemove(['authToken', 'adminData']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleQuickLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'adminData']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Quick logout error:', error);
    }
  };

  if (isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Logging out...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous screen"
        >
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logout</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Main Section */}
        <View style={styles.mainSection}>
          <View style={styles.iconContainer}>
            <Icon name="logout" size={64} color="#ef4444" />
          </View>
          
          <Text style={styles.title}>Ready to logout?</Text>
          <Text style={styles.subtitle}>
            You're about to sign out of your ResqYOU admin account.
          </Text>

          {/* User Info */}
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="person" size={32} color="#14b8a6" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{adminData?.fullname || 'Admin User'}</Text>
              <Text style={styles.userEmail}>{adminData?.email || 'Loading...'}</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              Platform.OS === 'web' && hoveredButton === 'primary' && styles.primaryButtonHover
            ]}
            onPress={handleLogout}
            onMouseEnter={() => Platform.OS === 'web' && setHoveredButton('primary')}
            onMouseLeave={() => Platform.OS === 'web' && setHoveredButton(null)}
            accessibilityLabel="Logout securely"
            accessibilityRole="button"
            accessibilityHint="Securely logs out and clears all session data"
          >
            <Icon name="logout" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Logout Securely</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              Platform.OS === 'web' && hoveredButton === 'secondary' && styles.secondaryButtonHover
            ]}
            onPress={handleQuickLogout}
            onMouseEnter={() => Platform.OS === 'web' && setHoveredButton('secondary')}
            onMouseLeave={() => Platform.OS === 'web' && setHoveredButton(null)}
            accessibilityLabel="Quick logout"
            accessibilityRole="button"
            accessibilityHint="Quickly logs out without server confirmation"
          >
            <Icon name="flash-on" size={20} color="#14b8a6" />
            <Text style={styles.secondaryButtonText}>Quick Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Before you go...</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={20} color="#14b8a6" />
            <Text style={styles.actionText}>Settings</Text>
            <Icon name="chevron-right" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Icon name="contact-phone" size={20} color="#ef4444" />
            <Text style={styles.actionText}>Emergency Contacts</Text>
            <Icon name="chevron-right" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Need help? Contact support@resqyou.com
        </Text>
      </View>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mainSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef2f2', // Mobile red50
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937', // Mobile gray800 - primary text
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280', // Mobile gray500 - secondary text
    textAlign: 'center',
    marginBottom: 30,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 30,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0fdfa', // Mobile teal light
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280', // Mobile gray500 - secondary text
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444', // Mobile red
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    elevation: 3,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#14b8a6', // Mobile teal
    width: '100%',
  },
  secondaryButtonText: {
    color: '#14b8a6', // Mobile teal
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButtonHover: {
    backgroundColor: '#dc2626', // Mobile red700 (darker on hover)
    transform: [{ scale: 1.02 }],
    elevation: 4,
  },
  secondaryButtonHover: {
    backgroundColor: '#f0fdfa', // Mobile teal light
    transform: [{ scale: 1.02 }],
    elevation: 2,
  },
  quickActions: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
    marginBottom: 15,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // Mobile gray200
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937', // Mobile gray800 - primary text
    marginLeft: 15,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280', // Mobile gray500 - secondary text
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb', // Mobile gray50 (60% - primary background)
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937', // Mobile gray800 - primary text
    marginTop: 20,
  },
});

export default LogoutScreen;