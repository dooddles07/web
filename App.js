import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE from './config/api';
import Colors from './constants/colors';

// Import your screens
import DashboardScreen from './screens/DashboardScreen';
import NavigationScreen from './screens/NavigationScreen';
import MessagesScreen from './screens/MessagesScreen';
import SettingsScreen from './screens/SettingsScreen';
import LogoutScreen from './screens/LogoutScreen';
import LoginScreen from './screens/LoginScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import HelpCenterScreen from './screens/HelpCenterScreen';
import AboutScreen from './screens/AboutScreen';
import ReportsScreen from './screens/ReportsScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Custom Drawer Content Component
const CustomDrawerContent = ({ navigation, state }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', route: 'Dashboard' },
    { name: 'Navigation', icon: 'navigation', route: 'NavigationScreen' },
    { name: 'Messages', icon: 'message', route: 'Messages' },
    { name: 'Settings', icon: 'settings', route: 'Settings' },
    { name: 'Logout', icon: 'logout', route: 'Logout' },
  ];

  return (
    <View style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Icon name="security" size={40} color={Colors.secondary.orange} />
        </View>
        <Text style={styles.appTitle}>VAWC Prevention</Text>
        <Text style={styles.appSubtitle}>Violence Against Women & Children</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isActive = state.routeNames[state.index] === item.route;
          
          return (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isActive && styles.activeMenuItem]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={[styles.menuIconContainer, isActive && styles.activeMenuIconContainer]}>
                <Icon
                  name={item.icon}
                  size={22}
                  color={isActive ? Colors.secondary.orange : Colors.neutral.gray600}
                />
              </View>
              <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <View style={styles.emergencySection}>
          <TouchableOpacity style={styles.emergencyButton}>
            <Icon name="emergency" size={20} color="white" />
            <Text style={styles.emergencyButtonText}>Emergency</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>Version 1.2.3</Text>
      </View>
    </View>
  );
};

// Authentication Stack Navigator (Login only)
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff3f0' },
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Main Drawer Navigator (for authenticated users)
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 280,
        },
        drawerType: 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
      }}
      initialRouteName="Dashboard"
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="NavigationScreen" component={NavigationScreen} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />
      <Drawer.Screen name="Reports" component={ReportsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Logout" component={LogoutScreen} />

      {/* Settings Sub-screens */}
      <Drawer.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
};

// Root Navigator (handles authentication flow)
const RootNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Check auth on mount
    checkAuth();

    // Re-check auth when the window/tab becomes visible (for web)
    if (Platform.OS === 'web') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkAuth();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  const checkAuth = async () => {
    try {
      // For web platform: Check if this is a fresh session or a reload after login
      // sessionStorage persists during browser session but clears when tab/window closes
      if (Platform.OS === 'web') {
        const hasLoggedInThisSession = sessionStorage.getItem('hasLoggedIn');

        // If no session flag, this is a fresh app load - clear auth and show login
        if (!hasLoggedInThisSession) {
          console.log('Fresh web session detected - clearing auth to show login screen');
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('adminData');
          await AsyncStorage.removeItem('userData');
          setIsAuthenticated(false);
          return;
        }

        // If session flag exists, user has logged in - proceed to validate token
        console.log('Existing session detected - validating token');
      }

      // Check for existing token
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Validate token with backend
      try {
        const response = await fetch(`${API_BASE}/api/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else if (response.status === 429) {
          // Rate limited - keep user logged in, don't clear token
          console.log('Rate limit reached for token verification. Keeping user logged in.');
          setIsAuthenticated(true); // Keep authenticated
        } else {
          // Token is invalid (401, 403, etc.), clear it
          console.log('Token validation failed: Invalid or expired token');
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('adminData');
          await AsyncStorage.removeItem('userData');
          if (Platform.OS === 'web') {
            sessionStorage.removeItem('hasLoggedIn');
          }
          setIsAuthenticated(false);
        }
      } catch (fetchError) {
        // If backend is unreachable, clear auth and show login
        // This is safer than keeping potentially invalid tokens
        if (fetchError.message === 'Failed to fetch') {
          console.log('Backend server not reachable. Please start the backend server.');
        }
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('adminData');
        await AsyncStorage.removeItem('userData');
        if (Platform.OS === 'web') {
          sessionStorage.removeItem('hasLoggedIn');
        }
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    }
  };

  // Show loading screen while checking initial auth
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.gray50 }}>
        <ActivityIndicator size="large" color={Colors.secondary.orange} />
        <Text style={{ marginTop: 10, color: Colors.text.secondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        /* Show Auth Stack when not authenticated */
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      ) : (
        /* Show Main App when authenticated */
        <Stack.Screen name="Main" component={DrawerNavigator} />
      )}
    </Stack.Navigator>
  );
};

// Linking configuration for web navigation
const linking = {
  prefixes: [],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
        },
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          NavigationScreen: 'navigation',
          Messages: 'messages',
          Reports: 'reports',
          Settings: 'settings',
          Logout: 'logout',
          PrivacyPolicy: 'privacy-policy',
          TermsOfService: 'terms-of-service',
          HelpCenter: 'help-center',
          About: 'about',
        },
      },
    },
  },
};

// Root App Component
const App = () => {
  const navigationRef = React.useRef();

  // Set initial document title
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'VAWC Prevention';
    }
  }, []);

  // Add global debugging function for browser console
  useEffect(() => {
    if (Platform.OS === 'web') {
      window.checkAuth = async () => {
        const token = await AsyncStorage.getItem('authToken');
        const adminData = await AsyncStorage.getItem('adminData');
        const userData = await AsyncStorage.getItem('userData');

        console.log('=== AUTH STATUS ===');
        console.log('Token:', token ? token.substring(0, 30) + '...' : 'NOT FOUND');
        console.log('Admin Data:', adminData ? JSON.parse(adminData) : 'NOT FOUND');
        console.log('User Data:', userData ? JSON.parse(userData) : 'NOT FOUND');
        console.log('==================');

        return {
          hasToken: !!token,
          hasAdmin: !!adminData,
          hasUser: !!userData,
          token: token ? token.substring(0, 30) + '...' : null,
        };
      };

      window.clearAuth = async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('adminData');
        await AsyncStorage.removeItem('userData');
        sessionStorage.removeItem('hasLoggedIn');
        console.log('✓ Auth data and session cleared');
        // Force reload to apply auth changes
        window.location.reload();
      };

      console.log('Debug functions available:');
      console.log('  checkAuth() - Check authentication status');
      console.log('  clearAuth() - Clear all auth data');

      // Intercept browser navigation for protected routes
      const handleUrlChange = async () => {
        const path = window.location.pathname;
        const token = await AsyncStorage.getItem('authToken');
        const isAuthenticated = !!token;

        const protectedPaths = [
          '/dashboard',
          '/navigation',
          '/messages',
          '/reports',
          '/settings',
          '/logout',
          '/privacy-policy',
          '/terms-of-service',
          '/help-center',
          '/about',
        ];

        const isProtectedPath = protectedPaths.some(p => path.toLowerCase().startsWith(p));

        // If accessing protected path without auth, redirect to login
        if (isProtectedPath && !isAuthenticated) {
          console.log('🔒 URL access denied: Not authenticated');
          window.history.replaceState({}, '', '/login');
        }
      };

      // Check on initial load
      handleUrlChange();

      // Listen for URL changes
      window.addEventListener('popstate', handleUrlChange);

      return () => {
        window.removeEventListener('popstate', handleUrlChange);
      };
    }
  }, []);

  // Monitor navigation state changes and enforce auth
  const onNavigationReady = async () => {
    // Check auth on initial load
    await enforceAuthentication();

    // Set initial document title
    if (Platform.OS === 'web') {
      updateDocumentTitle();
    }
  };

  const onNavigationStateChange = async (state) => {
    if (!state) return;
    await enforceAuthentication();

    // Update document title on navigation change
    if (Platform.OS === 'web') {
      updateDocumentTitle();
    }
  };

  const updateDocumentTitle = () => {
    if (!navigationRef.current) return;

    const state = navigationRef.current.getRootState();
    if (!state) return;

    // Get current route name
    const getCurrentRoute = (navState) => {
      if (!navState) return null;
      const route = navState.routes[navState.index];
      if (route.state) {
        return getCurrentRoute(route.state);
      }
      return route.name;
    };

    const currentRoute = getCurrentRoute(state);

    // Set document title based on route
    const titles = {
      'Dashboard': 'Dashboard - VAWC Prevention',
      'NavigationScreen': 'Map - VAWC Prevention',
      'Messages': 'Messages - VAWC Prevention',
      'Reports': 'Reports - VAWC Prevention',
      'Settings': 'Settings - VAWC Prevention',
      'Logout': 'Logout - VAWC Prevention',
      'Login': 'Login - VAWC Prevention',
      'PrivacyPolicy': 'Privacy Policy - VAWC Prevention',
      'TermsOfService': 'Terms of Service - VAWC Prevention',
      'HelpCenter': 'Help Center - VAWC Prevention',
      'About': 'About - VAWC Prevention',
    };

    document.title = titles[currentRoute] || 'VAWC Prevention';
  };

  const enforceAuthentication = async () => {
    if (!navigationRef.current) return;

    const token = await AsyncStorage.getItem('authToken');
    const isAuthenticated = !!token;

    // Get current navigation state
    const navState = navigationRef.current.getRootState();
    if (!navState) return;

    // Get current route name
    const getCurrentRoute = (state) => {
      if (!state) return null;
      const route = state.routes[state.index];
      if (route.state) {
        return getCurrentRoute(route.state);
      }
      return route.name;
    };

    const currentRoute = getCurrentRoute(navState);
    const topLevelRoute = navState.routes[navState.index]?.name;

    // Protected routes
    const protectedRoutes = [
      'Dashboard',
      'NavigationScreen',
      'Messages',
      'Reports',
      'Settings',
      'Logout',
      'PrivacyPolicy',
      'TermsOfService',
      'HelpCenter',
      'About',
    ];

    // If not authenticated and trying to access Main or any protected route
    if (!isAuthenticated && (topLevelRoute === 'Main' || protectedRoutes.includes(currentRoute))) {
      console.log('🔒 Access denied: Not authenticated. Redirecting to login...');
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }

    // If authenticated and trying to access auth screens, redirect to dashboard
    if (isAuthenticated && topLevelRoute === 'Auth') {
      console.log('✓ Already authenticated. Redirecting to dashboard...');
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      fallback={<View><Text>Loading...</Text></View>}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  drawerHeader: {
    backgroundColor: Colors.secondary.orange,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  activeMenuItem: {
    backgroundColor: Colors.secondary.background,
    borderRightWidth: 3,
    borderRightColor: Colors.secondary.orange,
  },
  menuIconContainer: {
    width: 35,
    alignItems: 'center',
  },
  activeMenuIconContainer: {
    // Additional styling for active icon container if needed
  },
  menuText: {
    fontSize: 16,
    color: Colors.neutral.gray600,
    fontWeight: '500',
    marginLeft: 10,
  },
  activeMenuText: {
    color: Colors.secondary.orange,
    fontWeight: '600',
  },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emergencySection: {
    marginBottom: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.red,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 2px 4px ${Colors.primary.red}50`,
    } : {
      elevation: 3,
      shadowColor: Colors.primary.red,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    }),
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.neutral.gray400,
    textAlign: 'center',
  },
});

export default App;