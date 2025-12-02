import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE from '../config/api';
import Colors from '../constants/colors';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  // Profile state
  const [adminData, setAdminData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [hoveredButton, setHoveredButton] = useState(null);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    fullname: '',
    email: '',
    department: '',
    contactNumber: ''
  });

  // Change password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const data = await AsyncStorage.getItem('adminData');
      if (data) {
        const admin = JSON.parse(data);
        setAdminData(admin);
        setEditForm({
          fullname: admin.fullname || '',
          email: admin.email || '',
          department: admin.department || '',
          contactNumber: admin.contactNumber || ''
        });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const SettingsItem = ({ icon, title, subtitle, onPress, rightComponent, showBorder = true }) => (
    <TouchableOpacity 
      style={[styles.settingsItem, !showBorder && styles.noBorder]} 
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={24} color={Colors.secondary.orange} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingsTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rightContainer}>
        {rightComponent || <Icon name="chevron-right" size={24} color={Colors.neutral.gray600} />}
      </View>
    </TouchableOpacity>
  );

  const SettingsSection = ({ title, children }) => (
    <View style={styles.settingsSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContainer}>
        {children}
      </View>
    </View>
  );

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.fullname || !editForm.email) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE}/api/admin/profile`,
        editForm,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update local storage
      const updatedAdmin = { ...adminData, ...editForm };
      await AsyncStorage.setItem('adminData', JSON.stringify(updatedAdmin));
      setAdminData(updatedAdmin);

      setShowEditModal(false);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Update profile error:', error);
      showToast(error?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await axios.put(
        `${API_BASE}/api/admin/change-password`,
        {
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setShowChangePasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully', 'success');
    } catch (error) {
      console.error('Change password error:', error);
      showToast(error?.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showLogoutConfirmation = () => {
    // Use window.confirm for web compatibility
    if (window.confirm('Are you sure you want to logout?')) {
      handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
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

      // Clear all stored data
      await AsyncStorage.multiRemove(['authToken', 'adminData', 'userData']);

      // For web, also clear session flag
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('hasLoggedIn');
      }

      // For web, reload app to show login screen
      if (Platform.OS === 'web') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local data and navigate
      await AsyncStorage.multiRemove(['authToken', 'adminData', 'userData']);

      // For web, also clear session flag
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('hasLoggedIn');
      }

      // For web, reload app to show login screen
      if (Platform.OS === 'web') {
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showDeleteAccountConfirmation = () => {
    // Use window.confirm for web compatibility
    if (window.confirm('This action cannot be undone. All your data will be permanently deleted. Are you sure you want to delete your account?')) {
      handleDeleteAccount();
    }
  };

  const handleDeleteAccount = async () => {
    // Second confirmation with prompt
    const confirmText = window.prompt('Type DELETE to confirm account deletion:');

    if (confirmText === 'DELETE') {
      await performDeleteAccount();
    } else if (confirmText !== null) {
      // User entered something but it wasn't "DELETE"
      alert('Confirmation text does not match. Account deletion cancelled.');
    }
    // If confirmText is null, user clicked Cancel, so do nothing
  };

  const performDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Call delete account endpoint (you need to create this in backend)
      await axios.delete(
        `${API_BASE}/api/admin/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Clear all data
      await AsyncStorage.multiRemove(['authToken', 'adminData', 'userData']);

      // For web, also clear session flag
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('hasLoggedIn');
      }

      // Show success toast
      showToast('Your account has been permanently deleted.', 'success');

      // For web, reload app to show login screen after a short delay
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.location.reload();
        }
      }, 1500);
    } catch (error) {
      console.error('Delete account error:', error);
      showToast(error?.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
            color={Colors.neutral.white}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <SettingsSection title="Profile">
          <SettingsItem
            icon="person"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={handleEditProfile}
          />
          <SettingsItem
            icon="security"
            title="Change Password"
            subtitle="Update your password for security"
            onPress={handleChangePassword}
            showBorder={false}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <SettingsItem
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive notifications about incidents"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.neutral.gray300, true: Colors.secondary.orange }}
                thumbColor={notificationsEnabled ? Colors.neutral.white : Colors.neutral.white}
              />
            }
          />
          <SettingsItem
            icon="warning"
            title="Emergency Alerts"
            subtitle="Get notified of critical incidents"
            rightComponent={
              <Switch
                value={emergencyAlerts}
                onValueChange={setEmergencyAlerts}
                trackColor={{ false: Colors.neutral.gray300, true: Colors.primary.red }}
                thumbColor={emergencyAlerts ? Colors.neutral.white : Colors.neutral.white}
              />
            }
            showBorder={false}
          />
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection title="Privacy & Security">
          <SettingsItem
            icon="location-on"
            title="Location Services"
            subtitle="Allow app to access your location"
            rightComponent={
              <Switch
                value={locationServices}
                onValueChange={setLocationServices}
                trackColor={{ false: Colors.neutral.gray300, true: Colors.secondary.orange }}
                thumbColor={locationServices ? Colors.neutral.white : Colors.neutral.white}
              />
            }
          />
          <SettingsItem
            icon="lock"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingsItem
            icon="gavel"
            title="Terms of Service"
            subtitle="View terms and conditions"
            onPress={() => navigation.navigate('TermsOfService')}
            showBorder={false}
          />
        </SettingsSection>

        {/* App Settings */}
        <SettingsSection title="App Settings">
          <SettingsItem
            icon="palette"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: Colors.neutral.gray300, true: Colors.secondary.orange }}
                thumbColor={darkMode ? Colors.neutral.white : Colors.neutral.white}
              />
            }
          />
          <SettingsItem
            icon="language"
            title="Language"
            subtitle="English"
            onPress={() => navigation.navigate('LanguageSettings')}
          />
          <SettingsItem
            icon="backup"
            title="Auto Backup"
            subtitle="Automatically backup your data"
            rightComponent={
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
                trackColor={{ false: Colors.neutral.gray300, true: Colors.secondary.orange }}
                thumbColor={autoBackup ? Colors.neutral.white : Colors.neutral.white}
              />
            }
            showBorder={false}
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsItem
            icon="help"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <SettingsItem
            icon="feedback"
            title="Send Feedback"
            subtitle="Share your thoughts with us"
            onPress={() => navigation.navigate('Feedback')}
          />
          <SettingsItem
            icon="info"
            title="About"
            subtitle="App version 1.2.3"
            onPress={() => navigation.navigate('About')}
            showBorder={false}
          />
        </SettingsSection>

        {/* Emergency Contacts */}
        <SettingsSection title="Emergency">
          <SettingsItem
            icon="contact-phone"
            title="Emergency Contacts"
            subtitle="Manage your emergency contacts"
            onPress={() => navigation.navigate('EmergencyContacts')}
          />
          <SettingsItem
            icon="local-hospital"
            title="Nearby Hospitals"
            subtitle="Find nearby medical facilities"
            onPress={() => navigation.navigate('NearbyHospitals')}
          />
          <SettingsItem
            icon="local-police"
            title="Police Stations"
            subtitle="Locate nearest police stations"
            onPress={() => navigation.navigate('PoliceStations')}
            showBorder={false}
          />
        </SettingsSection>

        {/* Account Actions */}
        <SettingsSection title="Account">
          <SettingsItem
            icon="logout"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={showLogoutConfirmation}
          />
          <SettingsItem
            icon="delete-forever"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={showDeleteAccountConfirmation}
            showBorder={false}
          />
        </SettingsSection>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>VAWC Prevention App</Text>
          <Text style={styles.appInfoText}>Version 1.2.3</Text>
          <Text style={styles.appInfoText}>© 2024 VAWC Prevention Initiative</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.fullname}
                  onChangeText={(text) => setEditForm({ ...editForm, fullname: text })}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.department}
                  onChangeText={(text) => setEditForm({ ...editForm, department: text })}
                  placeholder="Enter your department"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.contactNumber}
                  onChangeText={(text) => setEditForm({ ...editForm, contactNumber: text })}
                  placeholder="Enter your contact number"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.neutral.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Icon name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  placeholder="Enter your current password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  placeholder="Enter your new password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  placeholder="Confirm your new password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.neutral.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && !showEditModal && !showChangePasswordModal && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.secondary.orange} />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
      shadowColor: Colors.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  settingsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
    marginLeft: 5,
  },
  sectionContainer: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
      shadowColor: Colors.neutral.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    }),
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray100,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  rightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Colors.neutral.white,
    borderRadius: 20,
    maxHeight: '80%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      elevation: 5,
      shadowColor: Colors.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.neutral.gray50,
  },
  saveButton: {
    backgroundColor: Colors.secondary.orange,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: Colors.neutral.white,
    fontSize: 16,
    marginTop: 10,
  },
  // Toast notification styles
  toast: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: Colors.neutral.black,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 8,
    }),
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: Colors.alert.success,
  },
  toastError: {
    backgroundColor: Colors.primary.red,
  },
  toastText: {
    color: Colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});

export default SettingsScreen;