import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import API_BASE from '../config/api';
import Logo from '../images/resqyou.png'; // Correctly import the logo image
import Colors from '../constants/colors';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async () => {
    if (username === '' || password === '') {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // choose admin login on web, user login on mobile
      const endpoint = Platform.OS === 'web'
        ? `${API_BASE}/api/admin/login`
        : `${API_BASE}/api/auth/login`;

      const resp = await axios.post(endpoint, { username, password }, { timeout: 10000 });
      const responseData = resp.data;

      // Handle nested data structure - token/admin/user may be in responseData.data
      const data = responseData.data || responseData;

      // Store auth token and admin/user data
      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);

        if (data.admin) {
          await AsyncStorage.setItem('adminData', JSON.stringify(data.admin));
        } else if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }

        // Verify token was saved
        const savedToken = await AsyncStorage.getItem('authToken');
        if (!savedToken) {
          console.error('❌ CRITICAL: Token was not saved to AsyncStorage!');
          showToast('Login failed: Could not save authentication', 'error');
          return;
        }

        showToast('Login successful!', 'success');

        // Wait a bit to ensure storage is committed
        await new Promise(resolve => setTimeout(resolve, 500));

        // For web: Set session flag to indicate successful login
        if (Platform.OS === 'web') {
          sessionStorage.setItem('hasLoggedIn', 'true');
          console.log('✓ Session flag set - user logged in');
        }

        // Trigger navigation by reloading the page (for web) or using CommonActions (for mobile)
        if (Platform.OS === 'web') {
          window.location.reload();
        } else {
          // For mobile, navigate to Main
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }
      } else {
        console.error('❌ No token in response');
        showToast('Login failed: No token received from server', 'error');
      }
    } catch (err) {
      console.error('Login error:', err?.response?.data || err.message || err);

      // Provide specific error messages based on error type
      let errorMessage = 'Login failed. Please try again.';

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and ensure the server is running.';
      } else if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const serverMessage = err.response.data?.message;

        if (status === 400) {
          errorMessage = serverMessage || 'Invalid request. Please check your username and password.';
        } else if (status === 401 || status === 403) {
          errorMessage = serverMessage || 'Invalid username or password. Please try again.';
        } else if (status === 404) {
          errorMessage = 'Login service not found. Please contact support.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (status >= 500) {
          errorMessage = 'Server is currently unavailable. Please try again later.';
        } else if (serverMessage) {
          errorMessage = serverMessage;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your internet connection and ensure the server is running.';
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      style={styles.background}
      resizeMode="cover"
    >
      {/* Toast Notification */}
      {toast.visible && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <MaterialIcon
            name={toast.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <View style={styles.glassContainer}>
        {/* Correctly use the imported logo */}
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={Colors.text.secondary}
          value={username}
          onChangeText={setUsername}
          accessibilityLabel="Username input field"
          accessibilityHint="Enter your username to login"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.text.secondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password input field"
          accessibilityHint="Enter your password to login"
        />
        <TouchableOpacity
          style={[
            styles.button,
            isLoading && styles.buttonDisabled,
            Platform.OS === 'web' && hoveredButton === 'login' && !isLoading && styles.buttonHover
          ]}
          onPress={handleLogin}
          disabled={isLoading}
          onMouseEnter={() => Platform.OS === 'web' && !isLoading && setHoveredButton('login')}
          onMouseLeave={() => Platform.OS === 'web' && setHoveredButton(null)}
          accessibilityLabel={isLoading ? 'Logging in' : 'Login button'}
          accessibilityRole="button"
          accessibilityHint="Press to login to your account"
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.neutral.gray50, // Mobile gray50 (60% - primary background)
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: '40%', // Adjusted width for web (smaller for larger screens)
    maxWidth: 500, // Set a maximum width for larger screens
    padding: 40, // Increased padding for better spacing
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light, // Mobile gray200
    backgroundColor: Colors.neutral.white, // Mobile white (30% - secondary)
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    }),
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 56,
    borderColor: Colors.border.light, // Mobile gray200
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.neutral.gray50, // Mobile gray50
    color: Colors.text.primary, // Mobile gray800 - primary text
    fontSize: 16,
    outlineStyle: 'none', // Remove outline on web
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.secondary.orange, // Mobile action orange (10% - accent)
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px ${Colors.secondary.orange}50`,
    } : {
      shadowColor: Colors.secondary.orange,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  buttonHover: {
    backgroundColor: Colors.secondary.orangeDark, // Mobile orange dark - hover state
    transform: [{ scale: 1.02 }],
  },
  buttonText: {
    color: Colors.text.inverse, // Mobile white
    fontSize: 18,
    fontWeight: '600', // Consistent weight
  },
  buttonDisabled: {
    backgroundColor: `${Colors.secondary.orange}80`, // Semi-transparent orange
    opacity: 0.6,
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 8,
    }),
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: Colors.alert.success, // Mobile green
  },
  toastError: {
    backgroundColor: Colors.primary.red, // Mobile emergency red
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});

export default LoginScreen;