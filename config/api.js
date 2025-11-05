// Central backend base URL for web and mobile frontends
// Update BACKEND_URL in environment or change the default below if your backend runs on a different host/port.
// Use your computer's local network IP address so other devices can connect
const API_BASE = process.env.BACKEND_URL || 'http://192.168.100.6:10000';

export default API_BASE;
