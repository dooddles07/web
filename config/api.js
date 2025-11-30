// Central backend base URL for web and mobile frontends
// Defaults to production URL, can be overridden with EXPO_PUBLIC_API_URL environment variable
// For local development, set EXPO_PUBLIC_API_URL to 'http://localhost:10000' in .env
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://resqyou-backend.onrender.com';

export default API_BASE;
