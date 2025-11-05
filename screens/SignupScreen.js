import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
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

  const handleSignup = async () => {
    // Validate form fields
    if (fullname === '' || username === '' || email === '' || password === '' || confirmPassword === '') {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Email validation with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
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

      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      style={styles.background}
    >
      <View style={styles.glassContainer}>
        <Image source={Logo} style={styles.logo} />
        <Text style={styles.headerText}>Create Admin Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#999"
          value={fullname}
          onChangeText={setFullname}
        />
        <TextInput
          style={styles.input}
          placeholder="Username *"
          placeholderTextColor="#999"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Department (optional)"
          placeholderTextColor="#999"
          value={department}
          onChangeText={setDepartment}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Number (optional)"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={contactNumber}
          onChangeText={setContactNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Password *"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password *"
          placeholderTextColor="#999"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleSignup} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.loginTextContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => {
            try {
              navigation.navigate('Auth', { screen: 'Login' });
            } catch (e) {
              navigation.navigate('Login');
            }
          }}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#fff3f0', // Fixed: Light pink background color (was #fff30)
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: '40%', // Adjusted width for web (smaller for larger screens)
    maxWidth: 500, // Set a maximum width for larger screens
    padding: 30, // Increased padding for better spacing
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Border for the frosted effect
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Added semi-transparent background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10, // Shadow for Android
    alignItems: 'center', // Center-align content inside the container
  },
  logo: {
    width: 120, // Slightly smaller logo than login screen
    height: 120,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '100%', // Full width inside the container
    height: 55, // Slightly smaller than login for more compact form with more fields
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 15, // Slightly less margin than login
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white
    color: '#333',
    textAlign: 'left', // Changed from 'start' to 'left' for better compatibility
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: 'rgba(193, 1, 193, 0.8)', // Same as login for consistency
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginTop: 15, // Slightly less margin than login
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginTextContainer: {
    flexDirection: 'row', // Fixed: Proper layout for text and link
    marginTop: 15,
    alignItems: 'center',
  },
  loginText: {
    color: '#141414',
  },
  loginLink: {
    color: '#181818',
    fontWeight: 'bold',
  }
  ,
  buttonDisabled: {
    backgroundColor: 'rgba(193, 1, 193, 0.5)',
  }
});

export default SignupScreen;