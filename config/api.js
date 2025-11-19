// Central backend base URL for web and mobile frontends
// Expo uses EXPO_PUBLIC_ prefix for environment variables that should be available in the app
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://resqyou-backend.onrender.com';

export default API_BASE;
