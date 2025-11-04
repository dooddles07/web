import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE from '../config/api';
import Logo from '../images/resqyou.png'; // Correctly import the logo image



const LoginScreen = ({ navigation, route }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async () => {
    if (username === '' || password === '') {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // choose admin login on web, user login on mobile
      const endpoint = Platform.OS === 'web'
        ? `${API_BASE}/api/admin/login`
        : `${API_BASE}/api/auth/login`;

      const resp = await axios.post(endpoint, { username, password }, { timeout: 10000 });
      const data = resp.data;

      // Store auth token and admin/user data
      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);
        if (data.admin) {
          await AsyncStorage.setItem('adminData', JSON.stringify(data.admin));
        } else if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }
      }

      // On success navigate to main app (Drawer Navigator)
      navigation.navigate('Main');
    } catch (err) {
      console.error('Login error:', err?.response?.data || err.message || err);
      const msg = err?.response?.data?.message || 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const flag = route?.params?.signupSuccess;
    if (flag) {
      // show a confirmation when coming from signup
      Alert.alert('Success', 'Account created successfully. Please login.');
      // clear the flag so it doesn't show again on re-render
      try {
        if (route && route.params) {
          route.params.signupSuccess = false;
        }
      } catch (e) {
        // ignore
      }
    }
  }, [route]);

  return (
    <ImageBackground
      style={styles.background}
    >
      <View style={styles.glassContainer}>
        {/* Correctly use the imported logo */}
        <Image source={Logo} style={styles.logo} />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.signupText}>
          <Text>Don't have an account? <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Sign Up')}><Text style={styles.signupText} >Sign Up</Text></TouchableOpacity></Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#fff30', // Light pink background color
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10, // Shadow for Android
    backdropFilter: 'blur(10px)', // Frosted glass effect (for web)
    alignItems: 'center', // Center-align content inside the container
  },
  logo: {
    width: 150, // Adjust the width of the logo
    height: 150, // Adjust the height of the logo
    marginBottom: 20, // Add spacing below the logo
    resizeMode: 'contain', // Ensure the logo maintains its aspect ratio
  },
  input: {
    width: '100%', // Full width inside the container
    height: 60, // Increased height for better usability on web
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 20, // Increased padding for better usability
    marginBottom: 20, // Increased margin for better spacing
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white
    color: '#333', // White text for input
    textAlign: 'start', // Center-align text inside the input
    fontSize: 16, // Increased font size for readability
  },
  button: {
    width: '100%', // Full width inside the container
    height: 55, // Increased height for better usability
    backgroundColor: 'rgba(193, 1, 193, 0.8)', // Semi-transparent blue
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginTop: 20, // Increased spacing between the button and input fields
  },
  buttonText: {
    color: '#fff',
    fontSize: 20, // Increased font size for better readability
    fontWeight: 'bold',
  },
  signupText: {
    color: '#141414ff',
    marginTop: 10,
  },
  signupLink:{
    color: '#181818ff',
    fontWeight: 'bold',
  }
});

export default LoginScreen;