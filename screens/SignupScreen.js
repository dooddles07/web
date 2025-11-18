import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Logo from '../images/resqyou.png'; // Import the logo image
import axios from 'axios';
import API_BASE from '../config/api';

const SignupScreen = ({ navigation }) => {
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [contactNumber, setContactNumber] = useState('');
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

  const handleSignup = async () => {
    // Validate form fields
    if (fullname === '' || username === '' || email === '' || password === '' || confirmPassword === '') {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    // Email validation with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Use admin registration on web, regular user registration on mobile
      const endpoint = Platform.OS === 'web'
        ? `${API_BASE}/api/admin/register` // web admin signup
        : `${API_BASE}/api/auth/register`;   // mobile user signup

      const resp = await axios.post(endpoint, {
        fullname,
        email,
        username,
        password,
        department: department || 'General',
        contactNumber: contactNumber || '',
      }, { timeout: 10000 });

      // request completed; log server response
      const data = resp.data;
      console.log('Signup response:', data);

      // Show success message
      showToast('Account created successfully!', 'success');

      // Navigate after a short delay to let user see the success message
      setTimeout(() => {
        // Only navigate after successful signup
        if (navigation?.navigate) {
          // If this navigator is nested, target the parent 'Auth' stack explicitly
          try {
            navigation.navigate('Auth', { screen: 'Login', params: { signupSuccess: true } });
          } catch (e) {
            // fallback to direct navigate
            navigation.navigate('Login');
          }
        }
      }, 1500);
    } catch (err) {
      console.error('Signup error:', err?.response?.data || err.message || err);

      // Provide specific error messages based on error type
      let errorMessage = 'Failed to create account. Please try again.';

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and ensure the server is running.';
      } else if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const serverMessage = err.response.data?.message;

        if (status === 400) {
          errorMessage = serverMessage || 'Invalid information provided. Please check all fields and try again.';
        } else if (status === 409) {
          errorMessage = serverMessage || 'Username or email already exists. Please use different credentials.';
        } else if (status === 422) {
          errorMessage = serverMessage || 'Invalid data format. Please check your information and try again.';
        } else if (status === 404) {
          errorMessage = 'Registration service not found. Please contact support.';
        } else if (status === 500) {
          errorMessage = 'Server error occurred while creating your account. Please try again later.';
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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glassContainer}>
          <Image source={Logo} style={styles.logo} />
          <Text style={styles.headerText}>Create Admin Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor="#6b7280"
            value={fullname}
            onChangeText={setFullname}
            accessibilityLabel="Full name input field"
            accessibilityHint="Enter your full name"
          />
          <TextInput
            style={styles.input}
            placeholder="Username *"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            accessibilityLabel="Username input field"
            accessibilityHint="Choose a unique username"
          />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email input field"
            accessibilityHint="Enter your email address"
          />
          <TextInput
            style={styles.input}
            placeholder="Department (optional)"
            placeholderTextColor="#6b7280"
            value={department}
            onChangeText={setDepartment}
            accessibilityLabel="Department input field"
            accessibilityHint="Enter your department name (optional)"
          />
          <TextInput
            style={styles.input}
            placeholder="Contact Number (optional)"
            placeholderTextColor="#6b7280"
            keyboardType="phone-pad"
            value={contactNumber}
            onChangeText={setContactNumber}
            accessibilityLabel="Contact number input field"
            accessibilityHint="Enter your contact number (optional)"
          />
          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password input field"
            accessibilityHint="Create a password with at least 6 characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            accessibilityLabel="Confirm password input field"
            accessibilityHint="Re-enter your password to confirm"
          />

          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled,
              Platform.OS === 'web' && hoveredButton === 'signup' && !isLoading && styles.buttonHover
            ]}
            onPress={handleSignup}
            disabled={isLoading}
            onMouseEnter={() => Platform.OS === 'web' && !isLoading && setHoveredButton('signup')}
            onMouseLeave={() => Platform.OS === 'web' && setHoveredButton(null)}
            accessibilityLabel={isLoading ? 'Creating account' : 'Sign up button'}
            accessibilityRole="button"
            accessibilityHint="Press to create your admin account"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginTextContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                try {
                  navigation.navigate('Auth', { screen: 'Login' });
                } catch (e) {
                  navigation.navigate('Login');
                }
              }}
              accessibilityLabel="Go to Login"
              accessibilityRole="button"
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#f9fafb', // Mobile gray50 (60% - primary background)
    flex: 1,
    resizeMode: 'cover',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  glassContainer: {
    width: '40%',
    maxWidth: 500,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb', // Mobile gray200
    backgroundColor: '#ffffff', // Mobile white (30% - secondary)
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
    width: 120,
    height: 120,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600', // Consistent weight
    color: '#1f2937', // Mobile gray800 - primary text
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 52,
    borderColor: '#e5e7eb', // Mobile gray200
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb', // Mobile gray50
    color: '#1f2937', // Mobile gray800 - primary text
    fontSize: 15,
    outlineStyle: 'none', // Remove outline on web
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#14b8a6', // Mobile primary teal (10% - accent)
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(20, 184, 166, 0.3)',
    } : {
      shadowColor: '#14b8a6',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  buttonHover: {
    backgroundColor: '#0d9488', // Mobile teal dark - hover state
    transform: [{ scale: 1.02 }],
  },
  buttonText: {
    color: '#ffffff', // Mobile white
    fontSize: 17,
    fontWeight: '600', // Consistent weight
  },
  buttonDisabled: {
    backgroundColor: '#14b8a680', // Semi-transparent teal
    opacity: 0.6,
  },
  loginTextContainer: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
  },
  loginText: {
    color: '#6b7280', // Mobile gray500 - secondary text
    fontSize: 14,
  },
  loginLink: {
    color: '#14b8a6', // Mobile primary teal
    fontWeight: '600',
    fontSize: 14,
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
});

export default SignupScreen;
