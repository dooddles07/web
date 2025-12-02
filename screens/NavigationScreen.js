import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Icon } from 'react-native-elements';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import API_BASE from '../config/api';
import socketService from '../utils/socketService';
import { nodeCoordinates } from '../config/nodeCoordinates';
import { nodeConnections } from '../config/nodeConnections';
import Colors from '../constants/colors';

// Initial map region configuration
const initialRegion = {
  latitude: 13.628913,
  longitude: 123.240131,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// WebView component for Android and Web
const WebViewComponent = (props) => {
  if (Platform.OS === 'web') {
    return <iframe {...props} style={{ width: '100%', height: '100%', border: 'none' }} />;
  }
  const { WebView } = require('react-native-webview');
  return <WebView {...props} style={{ flex: 1 }} />;
};

const NavigationScreen = ({ navigation, route }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef(null);

  // Navigation handlers
  const handleBackPress = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Clear navigation routes and markers from the map
  const clearNavigationFromMap = () => {
    const clearScript = `
      (function() {
        // Clear route polylines
        if (window.currentRoutePolylines && Array.isArray(window.currentRoutePolylines)) {
          window.currentRoutePolylines.forEach(polyline => {
            try {
              if (map && polyline) {
                map.removeLayer(polyline);
              }
            } catch (e) {
              console.error('Error removing route polyline:', e);
            }
          });
          window.currentRoutePolylines = [];
        }

        // Clear route labels
        if (window.currentRouteLabels && Array.isArray(window.currentRouteLabels)) {
          window.currentRouteLabels.forEach(label => {
            try {
              if (map && label) {
                map.removeLayer(label);
              }
            } catch (e) {
              console.error('Error removing route label:', e);
            }
          });
          window.currentRouteLabels = [];
        }

        // Clear incident marker
        if (window.currentIncidentMarker) {
          try {
            if (map) {
              map.removeLayer(window.currentIncidentMarker);
            }
          } catch (e) {
            console.error('Error removing incident marker:', e);
          }
          window.currentIncidentMarker = null;
        }

        // Clear incident circle
        if (window.currentIncidentCircle) {
          try {
            if (map) {
              map.removeLayer(window.currentIncidentCircle);
            }
          } catch (e) {
            console.error('Error removing incident circle:', e);
          }
          window.currentIncidentCircle = null;
        }
      })();
      true;
    `;

    // Inject script into WebView or iframe
    if (Platform.OS === 'web') {
      const iframe = document.querySelector('iframe[title="Map"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EXECUTE_SCRIPT', script: clearScript }, '*');
      }
    } else {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(clearScript);
      }
    }
  };

  // Update map with incident markers and add them as nodes
  const updateMapIncidents = (incidentsList) => {
    // Always clear all incident markers first, then re-add only current ones
    const updateScript = `
      (function() {
        if (typeof map === 'undefined' || typeof nodeCoordinates === 'undefined' || typeof graph === 'undefined') {
          return;
        }

        // ALWAYS clear previous incident markers first
        if (window.incidentMarkers && Array.isArray(window.incidentMarkers)) {
          window.incidentMarkers.forEach(marker => {
            try {
              map.removeLayer(marker);
            } catch (e) {}
          });
        }
        window.incidentMarkers = [];

        // ALWAYS clear previous incident nodes from graph
        if (window.incidentNodeNames && Array.isArray(window.incidentNodeNames)) {
          window.incidentNodeNames.forEach(nodeName => {
            delete nodeCoordinates[nodeName];
            delete graph[nodeName];
            // Remove connections from other nodes
            for (const node in graph) {
              if (graph[node][nodeName]) {
                delete graph[node][nodeName];
              }
            }
          });
        }
        window.incidentNodeNames = [];

        // If no incidents, stop here
        const incidents = ${JSON.stringify(incidentsList || [])};
        if (!incidents || incidents.length === 0) {
          return;
        }

        function getDistance(lat1, lon1, lat2, lon2) {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // Add new incident markers
        incidents.forEach((incident, index) => {
          if (!incident.latitude || !incident.longitude) {
            return;
          }

          const lat = incident.latitude;
          const lng = incident.longitude;
          const timeAgo = incident.timestamp ? new Date(incident.timestamp).toLocaleString() : 'Unknown';
          const address = incident.address || 'Address unavailable';
          const fullname = incident.fullname || incident.username || 'Unknown User';
          const incidentNodeName = 'INCIDENT_' + incident._id;

          // Add incident marker
          const marker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'emergency-marker',
              html: "<div style='background-color:#FF3B30;width:35px;height:35px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(255,59,48,0.5);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;'><span style='color:white;font-size:20px;font-weight:bold;'>🆘</span></div>",
              iconSize: [35, 35],
              iconAnchor: [17.5, 17.5]
            })
          }).addTo(map);

          marker.bindPopup(\`
            <div style="font-family:Arial;min-width:200px;">
              <div style="background:#FF3B30;color:white;padding:8px;margin:-10px -10px 8px -10px;border-radius:3px 3px 0 0;">
                <b>🆘 EMERGENCY ALERT</b>
              </div>
              <p style="margin:5px 0;"><b>User:</b> \${fullname}</p>
              <p style="margin:5px 0;"><b>Username:</b> \${incident.username || 'N/A'}</p>
              <p style="margin:5px 0;"><b>Location:</b><br>\${address}</p>
              <p style="margin:5px 0;"><b>Coordinates:</b><br>Lat: \${lat.toFixed(6)}, Lng: \${lng.toFixed(6)}</p>
              <p style="margin:5px 0;"><b>Time:</b> \${timeAgo}</p>
              <p style="margin:5px 0;color:#FF3B30;"><b>Status:</b> ACTIVE</p>
            </div>
          \`);

          window.incidentMarkers.push(marker);

          // Add incident as a node in the graph for pathfinding
          nodeCoordinates[incidentNodeName] = [lat, lng];
          window.incidentNodeNames.push(incidentNodeName);

          // Find nearest existing nodes and create connections
          const nearestNodes = [];
          for (const [nodeName, coords] of Object.entries(nodeCoordinates)) {
            if (nodeName === incidentNodeName || nodeName.startsWith('INCIDENT_')) continue;
            const distance = getDistance(lat, lng, coords[0], coords[1]);
            nearestNodes.push({ name: nodeName, distance });
          }

          nearestNodes.sort((a, b) => a.distance - b.distance);
          const connectToNodes = nearestNodes.slice(0, 3);

          // Create bidirectional connections
          const incidentConnections = {};
          connectToNodes.forEach(node => {
            incidentConnections[node.name] = node.distance;
          });

          graph[incidentNodeName] = incidentConnections;
          connectToNodes.forEach(node => {
            if (!graph[node.name]) {
              graph[node.name] = {};
            }
            graph[node.name][incidentNodeName] = node.distance;
          });

          // Make marker clickable to navigate to incident
          marker.on('click', function() {
            // Find alternative routes to this incident
            const alternativeRoutes = window.findKShortestPaths(graph, 'defaultStartNode', incidentNodeName, 3);

            if (alternativeRoutes && alternativeRoutes.length > 0) {
              window.drawMultipleRoutes(alternativeRoutes);

              // Fit bounds to show the routes
              const allCoords = [];
              alternativeRoutes.forEach(route => {
                route.path.forEach(name => {
                  if (nodeCoordinates[name]) {
                    allCoords.push(nodeCoordinates[name]);
                  }
                });
              });

              if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          });
        });
      })();
      true;
    `;

    // Inject script into WebView or iframe
    if (Platform.OS === 'web') {
      const iframe = document.querySelector('iframe[title="Map"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EXECUTE_SCRIPT', script: updateScript }, '*');
      }
    } else {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(updateScript);
      }
    }
  };

  // Listen for map ready event
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMapReady = (event) => {
        setMapReady(true);
      };

      // Listen for custom event from iframe
      window.addEventListener('mapReady', handleMapReady);

      // Also listen for iframe messages
      const handleIframeMessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'MAP_READY') {
            setMapReady(true);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      window.addEventListener('message', handleIframeMessage);

      // Fallback: assume map is ready after 3 seconds
      const fallbackTimer = setTimeout(() => {
        setMapReady(true);
      }, 3000);

      return () => {
        window.removeEventListener('mapReady', handleMapReady);
        window.removeEventListener('message', handleIframeMessage);
        clearTimeout(fallbackTimer);
      };
    } else {
      // For mobile, set ready after a delay
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch incidents from API
  useEffect(() => {
    let socketCleanup = null;

    const fetchIncidents = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');

        const response = await fetch(`${API_BASE}/api/sos/all-active`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data?.alerts && Array.isArray(data.data.alerts)) {
          // IMPORTANT: Only filter out truly invalid data, not real user data
          const validIncidents = data.data.alerts.filter(item => {
            // Must have required fields
            if (!item._id || !item.username) {
              console.warn('⚠️ [NavigationScreen] Skipped invalid incident (missing ID/username)');
              return false;
            }

            // Only filter out obvious test/system names - be less aggressive
            // Only filter if the ENTIRE username is a test word, not if it contains it
            const testUsernames = ['test', 'placeholder', 'example', 'demo', 'admin'];
            const username = (item.username || '').toLowerCase().trim();

            if (testUsernames.includes(username)) {
              return false;
            }

            return true;
          });

          setIncidents(validIncidents);
        } else {
          console.warn('⚠️ [NavigationScreen] No alerts array in response');
          setIncidents([]);
        }
      } catch (error) {
        console.error('❌ [NavigationScreen] Error fetching incidents:', error.message);
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };

    const init = async () => {
      await fetchIncidents();

      // Setup Socket.IO for real-time updates
      socketCleanup = await setupSocketIO();
    };

    init();

    // Refresh incidents every 30 seconds (Socket.IO handles real-time updates)
    const interval = setInterval(fetchIncidents, 30000);

    return () => {
      clearInterval(interval);
      // Clean up socket listeners using the cleanup function
      if (socketCleanup) {
        socketCleanup();
      }
    };
  }, []);

  // Update map markers when incidents change
  useEffect(() => {
    // Always update map when incidents change (even if empty to clear markers)
    if (mapReady) {
      updateMapIncidents(incidents);
    } else {
      // Retry after map is loaded
      const retryTimer = setTimeout(() => {
        updateMapIncidents(incidents);
      }, 2000);
      return () => clearTimeout(retryTimer);
    }
  }, [incidents, mapReady]);

  // Handle navigation when selectedIncident is passed from Dashboard
  useEffect(() => {
    const selectedIncident = route?.params?.selectedIncident;

    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude && mapReady) {
      // Small delay to ensure map is fully ready
      const timer = setTimeout(() => {
        handleNavigateToIncident(selectedIncident);
        showToast(`Navigating to ${selectedIncident.fullname || selectedIncident.username}'s location`, 'success');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [route?.params?.selectedIncident, mapReady]);

  // Setup Socket.IO for real-time SOS updates
  const setupSocketIO = async () => {
    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      try {
        // Get admin ID and token from storage
        const adminDataStr = await AsyncStorage.getItem('adminData');
        const token = await AsyncStorage.getItem('authToken');
        const adminData = adminDataStr ? JSON.parse(adminDataStr) : null;
        const adminId = adminData?._id || adminData?.id || 'web-admin';

        if (!token) {
          console.error('No auth token found for socket connection');
          return null;
        }

        await socketService.connect(adminId, token);
      } catch (error) {
        console.error('Failed to connect to socket:', error);
        return null;
      }
    }

    // Define named event handlers for proper cleanup
    const handleSOSAlert = (data) => {
      showToast(`New emergency alert from ${data.fullname || data.username}!`, 'error');

      // Add new incident to state immediately
      const newIncident = {
        _id: data.id,
        username: data.username,
        fullname: data.fullname,
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        timestamp: data.timestamp,
        status: 'active',
        lastUpdated: data.lastUpdated || data.timestamp
      };

      // Filter out test users
      const testUsernames = ['test', 'placeholder', 'example', 'demo', 'admin'];
      const username = (newIncident.username || '').toLowerCase().trim();

      if (!testUsernames.includes(username) && newIncident._id && newIncident.username) {
        setIncidents(prev => [newIncident, ...prev]);
      }
    };

    const handleSOSUpdate = (data) => {
      // Update the specific incident in the list
      setIncidents(prevIncidents => {
        const updated = prevIncidents.map(incident => {
          if (incident._id === data.id || incident.username === data.username) {
            return {
              ...incident,
              latitude: data.latitude,
              longitude: data.longitude,
              address: data.address,
              lastUpdated: data.lastUpdated
            };
          }
          return incident;
        });
        return updated;
      });

      // Notification removed to prevent overwhelming the web interface with too many updates
    };

    const handleSOSCancelled = (data) => {
      // Remove from incidents list and update map immediately
      setIncidents(prevIncidents => {
        const updated = prevIncidents.filter(incident =>
          incident._id !== data.id && incident.username !== data.username
        );

        // Immediately update map markers with the new list
        setTimeout(() => {
          updateMapIncidents(updated);
          // Clear navigation routes and markers
          clearNavigationFromMap();
        }, 100);

        return updated;
      });

      // Notification removed to prevent overwhelming the web interface with too many updates
    };

    const handleSOSResolved = (data) => {
      // Remove from incidents list and update map immediately
      setIncidents(prevIncidents => {
        const updated = prevIncidents.filter(incident =>
          incident._id !== data.id && incident.username !== data.username
        );

        // Immediately update map markers with the new list
        setTimeout(() => {
          updateMapIncidents(updated);
          // Clear navigation routes and markers
          clearNavigationFromMap();
        }, 100);

        return updated;
      });

      // Notification removed to prevent overwhelming the web interface with too many updates
    };

    // Remove any existing listeners first to prevent duplicates
    socketService.off('sos-alert', handleSOSAlert);
    socketService.off('sos-updated', handleSOSUpdate);
    socketService.off('sos-cancelled', handleSOSCancelled);
    socketService.off('sos-resolved', handleSOSResolved);

    // Register event listeners with named functions
    socketService.on('sos-alert', handleSOSAlert);
    socketService.on('sos-updated', handleSOSUpdate);
    socketService.on('sos-cancelled', handleSOSCancelled);
    socketService.on('sos-resolved', handleSOSResolved);

    // Return cleanup function
    return () => {
      socketService.off('sos-alert', handleSOSAlert);
      socketService.off('sos-updated', handleSOSUpdate);
      socketService.off('sos-cancelled', handleSOSCancelled);
      socketService.off('sos-resolved', handleSOSResolved);
    };
  };

  const nodeCoordinatesJSON = JSON.stringify(nodeCoordinates);
  const nodeConnectionsJSON = JSON.stringify(nodeConnections);

  // Leaflet map HTML with embedded routing logic
  const leafletHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""/>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
    .leaflet-popup-content { font-family: Arial, sans-serif; font-size: 12px; }
    .leaflet-popup-content-wrapper { border-radius: 5px; }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""></script>
  <script>
    let map;
    let nodeCoordinates;
    let graph;
    let dijkstra;
    let getDistance;

    // Initialize global variables for route management
    window.currentRoutePolylines = [];
    window.currentRouteLabels = [];
    window.currentIncidentMarker = null;
    window.currentIncidentCircle = null;
    window.previousIncidentNode = null;

    // Initialize global variables for incident management
    window.incidentMarkers = [];
    window.incidentNodeNames = [];

    document.addEventListener('DOMContentLoaded', function () {
      nodeCoordinates = ${nodeCoordinatesJSON};

      map = L.map('map', {
        center: nodeCoordinates.defaultStartNode,
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      for (const [nodeName, coords] of Object.entries(nodeCoordinates)) {
        L.circleMarker(coords, {
          radius: 5,
          color: '${Colors.alert.info}',
          fillColor: '${Colors.alert.info}',
          fillOpacity: 0.3,
          opacity: 0.3,
          weight: 1
        })
          .bindTooltip(nodeName, { permanent: false, direction: 'top' })
          .addTo(map);
      }

      const connections = ${nodeConnectionsJSON};

      getDistance = function(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) *
          Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      graph = {};
      for (const [node, neighbors] of Object.entries(connections)) {
        graph[node] = {};
        for (const neighbor of neighbors) {
          graph[node][neighbor] = getDistance(...nodeCoordinates[node], ...nodeCoordinates[neighbor]);
        }
      }

      dijkstra = function(graph, start, end) {
        const distances = {};
        const previous = {};
        const visited = new Set();
        const nodes = new Set(Object.keys(graph));

        for (const node of nodes) {
          distances[node] = Infinity;
          previous[node] = null;
        }
        distances[start] = 0;

        while (nodes.size) {
          const current = [...nodes].reduce((a, b) => distances[a] < distances[b] ? a : b);
          if (current === end) break;

          nodes.delete(current);
          visited.add(current);

          for (const neighbor in graph[current]) {
            if (!visited.has(neighbor)) {
              const newDist = distances[current] + graph[current][neighbor];
              if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                previous[neighbor] = current;
              }
            }
          }
        }

        const path = [];
        let curr = end;
        while (curr) {
          path.unshift(curr);
          curr = previous[curr];
        }

        return { path, distance: distances[end] };
      };

      // Legacy single route function - now deprecated in favor of drawMultipleRoutes
      let currentRouteLine = null;
      let drawRoute = function(path) {
        if (currentRouteLine) {
          map.removeLayer(currentRouteLine);
        }

        const latlngs = path.map(name => nodeCoordinates[name]);
        currentRouteLine = L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);

        if (latlngs.length > 0) {
          map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
        }
      };

      for (const [node, neighbors] of Object.entries(connections)) {
        for (const neighbor of neighbors) {
          const latlngs = [nodeCoordinates[node], nodeCoordinates[neighbor]];
          L.polyline(latlngs, { color: 'gray', weight: 2, dashArray: '4' }).addTo(map);
        }
      }

      // Function to find K shortest paths (Yen's algorithm)
      window.findKShortestPaths = function(graph, start, end, K = 3) {
        const A = [];
        const B = [];

        const firstPath = dijkstra(graph, start, end);
        if (!firstPath || !firstPath.path || firstPath.path.length === 0) {
          return [];
        }
        A.push({ path: firstPath.path, distance: firstPath.distance });

        for (let k = 1; k < K; k++) {
          const prevPath = A[k - 1].path;

          for (let i = 0; i < prevPath.length - 1; i++) {
            const spurNode = prevPath[i];
            const rootPath = prevPath.slice(0, i + 1);
            const graphCopy = JSON.parse(JSON.stringify(graph));

            for (const p of A) {
              if (p.path.length > i && p.path.slice(0, i + 1).join(',') === rootPath.join(',')) {
                if (p.path[i + 1]) {
                  if (graphCopy[spurNode]) {
                    delete graphCopy[spurNode][p.path[i + 1]];
                  }
                }
              }
            }

            for (let j = 0; j < i; j++) {
              const nodeToRemove = rootPath[j];
              delete graphCopy[nodeToRemove];
              for (const node in graphCopy) {
                if (graphCopy[node][nodeToRemove]) {
                  delete graphCopy[node][nodeToRemove];
                }
              }
            }

            const spurPath = dijkstra(graphCopy, spurNode, end);

            if (spurPath && spurPath.path && spurPath.path.length > 0) {
              const totalPath = [...rootPath.slice(0, -1), ...spurPath.path];
              let totalDistance = 0;
              let isValidPath = true;

              // Validate that ALL edges in the path exist in the graph
              for (let j = 0; j < totalPath.length - 1; j++) {
                if (graph[totalPath[j]] && graph[totalPath[j]][totalPath[j + 1]]) {
                  totalDistance += graph[totalPath[j]][totalPath[j + 1]];
                } else {
                  // If any edge doesn't exist, mark path as invalid
                  isValidPath = false;
                  break;
                }
              }

              const pathKey = totalPath.join(',');
              const exists = B.some(p => p.path.join(',') === pathKey);

              // Only add path if it's valid and uses real connections
              if (!exists && totalPath.length > 1 && isValidPath) {
                B.push({ path: totalPath, distance: totalDistance });
              }
            }
          }

          if (B.length === 0) break;
          B.sort((a, b) => a.distance - b.distance);
          const nextPath = B.shift();

          const pathExists = A.some(p => p.path.join(',') === nextPath.path.join(','));
          if (!pathExists) {
            A.push(nextPath);
          } else {
            k--;
          }
        }

        return A;
      };

      // Function to draw multiple routes with different colors
      window.drawMultipleRoutes = function(routes) {
        // Clear previous routes
        if (window.currentRoutePolylines) {
          window.currentRoutePolylines.forEach(polyline => {
            try {
              map.removeLayer(polyline);
            } catch (e) {}
          });
        }
        if (window.currentRouteLabels) {
          window.currentRouteLabels.forEach(label => {
            try {
              map.removeLayer(label);
            } catch (e) {}
          });
        }
        window.currentRoutePolylines = [];
        window.currentRouteLabels = [];

        const colors = ['#3b82f6', '#10b981', '#fbbf24'];
        const labels = ['Shortest Path', 'Alternative Path 1', 'Alternative Path 2'];
        const opacities = [0.9, 0.7, 0.6];
        const weights = [5, 4, 4];
        const dashArrays = ['', '', ''];

        routes.forEach((route, index) => {
          try {
            const coordinates = route.path.map(name => nodeCoordinates[name]);

            const polyline = L.polyline(coordinates, {
              color: colors[index] || '#9ca3af',
              weight: weights[index] || 3,
              opacity: opacities[index] || 0.5,
              dashArray: dashArrays[index] || '',
              lineJoin: 'round',
              lineCap: 'round'
            });

            map.addLayer(polyline);

            polyline.on('click', function() {
              window.currentRoutePolylines.forEach((p, i) => {
                p.setStyle({
                  weight: weights[i] || 3,
                  opacity: opacities[i] || 0.5
                });
              });
              this.setStyle({ weight: 7, opacity: 1 });
              console.log('Selected route:', labels[index], '- Distance:', route.distance.toFixed(3), 'km');
            });

            window.currentRoutePolylines.push(polyline);

            // Position labels at different points to prevent overlap
            const labelPositions = [0.5, 0.35, 0.65]; // 50%, 35%, 65% along the route
            const labelIndex = Math.floor(coordinates.length * labelPositions[index]);
            const labelPoint = coordinates[Math.min(labelIndex, coordinates.length - 1)];

            const labelHtml = '<div style="background-color:' + colors[index] + ';color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white;">' +
              '<div>' + labels[index] + '</div>' +
              '<div style="font-size:10px;opacity:0.9;">' + route.distance.toFixed(2) + ' km</div>' +
              '</div>';

            const label = L.marker(labelPoint, {
              icon: L.divIcon({
                className: 'route-label',
                html: labelHtml,
                iconSize: [120, 40],
                iconAnchor: [60, 20]
              }),
              interactive: true
            });

            // Make label clickable to highlight its corresponding route
            label.on('click', function() {
              window.currentRoutePolylines.forEach((p, i) => {
                p.setStyle({
                  weight: weights[i] || 3,
                  opacity: opacities[i] || 0.5
                });
              });
              polyline.setStyle({ weight: 7, opacity: 1 });
              console.log('Selected route via label:', labels[index], '- Distance:', route.distance.toFixed(3), 'km');
            });

            map.addLayer(label);
            window.currentRouteLabels.push(label);
          } catch (routeError) {
            console.error('Error drawing route', index + 1, ':', routeError.message);
          }
        });
      };

      for (const [name, coords] of Object.entries(nodeCoordinates)) {
        const label = name === 'defaultStartNode' ? 'default starting node' : name;
        const marker = L.circleMarker(coords, {
          radius: 5,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.3,
          opacity: 0.3,
          weight: 1
        }).addTo(map).bindPopup(label);

        marker.on('click', () => {
          if (name === 'defaultStartNode') return;

          // Find alternative routes using K shortest paths algorithm
          const alternativeRoutes = window.findKShortestPaths(graph, 'defaultStartNode', name, 3);

          // Draw all alternative routes
          if (alternativeRoutes.length > 0) {
            window.drawMultipleRoutes(alternativeRoutes);
          }

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ROUTE_SELECTED',
              destination: name,
              distance: alternativeRoutes[0]?.distance || 0,
              path: alternativeRoutes[0]?.path || [],
              alternativeRoutes: alternativeRoutes
            }));
          }
        });
      }

      // Emergency Response Center marker
      L.marker([${initialRegion.latitude}, ${initialRegion.longitude}], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: "<div style='background-color:#4CAF50;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;'><span style='color:white;font-size:18px;'>🏥</span></div>",
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      })
        .addTo(map)
        .bindPopup('<div style="font-family:Arial;"><b>Emergency Response Center</b><br>Lat: ${initialRegion.latitude.toFixed(4)}<br>Lng: ${initialRegion.longitude.toFixed(4)}</div>');

      // Incident markers will be added dynamically via updateMapIncidents function

      setTimeout(() => {
        map.invalidateSize();

        // Notify React that map is ready
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }

        // For web, dispatch custom event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mapReady'));
        }
      }, 100);
      map.attributionControl.setPrefix('');
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      window.dijkstra = dijkstra;
      window.drawRoute = drawRoute;
      window.nodeCoordinates = nodeCoordinates;
      window.graph = graph;
    });

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'EXECUTE_SCRIPT') {
        try {
          eval(event.data.script);
        } catch (e) {
          console.error('❌ [Leaflet Map] Script error:', e.message);
        }
      }
    });
  </script>
</body>
</html>`;

  const handleNavigateToIncident = (incident) => {
    if (!incident.latitude || !incident.longitude) {
      if (Platform.OS === 'web') {
        alert('Location data not available for this incident');
      }
      return;
    }

    const lat = incident.latitude;
    const lng = incident.longitude;
    const incidentId = incident._id || 'incident';

    const navigationScript = `
      (function() {
        if (!dijkstra || !map || !nodeCoordinates || !graph) {
          console.error('Required globals not found');
          return;
        }

        try {
          function getDistance(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) *
              Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          function findKShortestPaths(graph, start, end, K = 3) {
            const A = [];
            const B = [];

            const firstPath = dijkstra(graph, start, end);
            if (!firstPath || !firstPath.path || firstPath.path.length === 0) {
              return [];
            }
            A.push({ path: firstPath.path, distance: firstPath.distance });

            for (let k = 1; k < K; k++) {
              const prevPath = A[k - 1].path;

              for (let i = 0; i < prevPath.length - 1; i++) {
                const spurNode = prevPath[i];
                const rootPath = prevPath.slice(0, i + 1);
                const graphCopy = JSON.parse(JSON.stringify(graph));

                for (const p of A) {
                  if (p.path.length > i && p.path.slice(0, i + 1).join(',') === rootPath.join(',')) {
                    if (p.path[i + 1]) {
                      if (graphCopy[spurNode]) {
                        delete graphCopy[spurNode][p.path[i + 1]];
                      }
                    }
                  }
                }

                for (let j = 0; j < i; j++) {
                  const nodeToRemove = rootPath[j];
                  delete graphCopy[nodeToRemove];
                  for (const node in graphCopy) {
                    if (graphCopy[node][nodeToRemove]) {
                      delete graphCopy[node][nodeToRemove];
                    }
                  }
                }

                const spurPath = dijkstra(graphCopy, spurNode, end);

                if (spurPath && spurPath.path && spurPath.path.length > 0) {
                  const totalPath = [...rootPath.slice(0, -1), ...spurPath.path];
                  let totalDistance = 0;
                  let isValidPath = true;

                  // Validate that ALL edges in the path exist in the graph
                  for (let j = 0; j < totalPath.length - 1; j++) {
                    if (graph[totalPath[j]] && graph[totalPath[j]][totalPath[j + 1]]) {
                      totalDistance += graph[totalPath[j]][totalPath[j + 1]];
                    } else {
                      // If any edge doesn't exist, mark path as invalid
                      isValidPath = false;
                      break;
                    }
                  }

                  const pathKey = totalPath.join(',');
                  const exists = B.some(p => p.path.join(',') === pathKey);

                  // Only add path if it's valid and uses real connections
                  if (!exists && totalPath.length > 1 && isValidPath) {
                    B.push({ path: totalPath, distance: totalDistance });
                  }
                }
              }

              if (B.length === 0) break;
              B.sort((a, b) => a.distance - b.distance);
              const nextPath = B.shift();

              const pathExists = A.some(p => p.path.join(',') === nextPath.path.join(','));
              if (!pathExists) {
                A.push(nextPath);
              } else {
                k--;
              }
            }

            return A;
          }

          function drawMultipleRoutes(routes) {
            if (!map || !map.addLayer) {
              return;
            }

            if (window.currentRoutePolylines) {
              window.currentRoutePolylines.forEach(polyline => {
                try {
                  map.removeLayer(polyline);
                } catch (e) {}
              });
            }
            if (window.currentRouteLabels) {
              window.currentRouteLabels.forEach(label => {
                try {
                  map.removeLayer(label);
                } catch (e) {}
              });
            }
            window.currentRoutePolylines = [];
            window.currentRouteLabels = [];

            const colors = ['#3b82f6', '#10b981', '#fbbf24'];
            const labels = ['Shortest Path', 'Alternative Path 1', 'Alternative Path 2'];
            const opacities = [0.9, 0.7, 0.6];
            const weights = [5, 4, 4];
            const dashArrays = ['', '', ''];

            routes.forEach((route, index) => {
              try {
                const coordinates = route.path.map(name => nodeCoordinates[name]);

                const polyline = L.polyline(coordinates, {
                  color: colors[index] || '#9ca3af',
                  weight: weights[index] || 3,
                  opacity: opacities[index] || 0.5,
                  dashArray: dashArrays[index] || '',
                  lineJoin: 'round',
                  lineCap: 'round'
                });

                map.addLayer(polyline);

                polyline.on('click', function() {
                  window.currentRoutePolylines.forEach((p, i) => {
                    p.setStyle({
                      weight: weights[i] || 3,
                      opacity: opacities[i] || 0.5
                    });
                  });
                  this.setStyle({ weight: 7, opacity: 1 });
                });

                window.currentRoutePolylines.push(polyline);

                // Position labels at different points to prevent overlap
                const labelPositions = [0.5, 0.35, 0.65]; // 50%, 35%, 65% along the route
                const labelIndex = Math.floor(coordinates.length * labelPositions[index]);
                const labelPoint = coordinates[Math.min(labelIndex, coordinates.length - 1)];

                const labelHtml = '<div style="background-color:' + colors[index] + ';color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white;">' +
                  '<div>' + labels[index] + '</div>' +
                  '<div style="font-size:10px;opacity:0.9;">' + route.distance.toFixed(2) + ' km</div>' +
                  '</div>';

                const label = L.marker(labelPoint, {
                  icon: L.divIcon({
                    className: 'route-label',
                    html: labelHtml,
                    iconSize: [120, 40],
                    iconAnchor: [60, 20]
                  }),
                  interactive: true
                });

                // Make label clickable to highlight its corresponding route
                label.on('click', function() {
                  window.currentRoutePolylines.forEach((p, i) => {
                    p.setStyle({
                      weight: weights[i] || 3,
                      opacity: opacities[i] || 0.5
                    });
                  });
                  polyline.setStyle({ weight: 7, opacity: 1 });
                  console.log('Selected route via label:', labels[index], '- Distance:', route.distance.toFixed(3), 'km');
                });

                map.addLayer(label);
                window.currentRouteLabels.push(label);
              } catch (routeError) {
                console.error('Error drawing route', index + 1, ':', routeError.message);
              }
            });
          }

          const incidentLat = ${lat};
          const incidentLng = ${lng};
          const incidentNodeName = 'INCIDENT_${incidentId}';

          // Clean up previous incident node from graph if exists
          if (window.previousIncidentNode) {
            delete nodeCoordinates[window.previousIncidentNode];
            delete graph[window.previousIncidentNode];
            // Remove connections from other nodes to the previous incident
            for (const node in graph) {
              if (graph[node][window.previousIncidentNode]) {
                delete graph[node][window.previousIncidentNode];
              }
            }
          }

          nodeCoordinates[incidentNodeName] = [incidentLat, incidentLng];
          window.previousIncidentNode = incidentNodeName;

          const nearestNodes = [];
          for (const [nodeName, coords] of Object.entries(nodeCoordinates)) {
            if (nodeName === incidentNodeName) continue;
            const distance = getDistance(incidentLat, incidentLng, coords[0], coords[1]);
            nearestNodes.push({ name: nodeName, distance });
          }

          nearestNodes.sort((a, b) => a.distance - b.distance);
          const connectToNodes = nearestNodes.slice(0, 3);

          const incidentConnections = {};
          connectToNodes.forEach(node => {
            incidentConnections[node.name] = node.distance;
          });

          graph[incidentNodeName] = incidentConnections;
          connectToNodes.forEach(node => {
            if (!graph[node.name]) {
              graph[node.name] = {};
            }
            graph[node.name][incidentNodeName] = node.distance;
          });

          const alternativeRoutes = findKShortestPaths(graph, 'defaultStartNode', incidentNodeName, 3);

          if (alternativeRoutes.length > 0) {
            drawMultipleRoutes(alternativeRoutes);
          }

          // Remove old incident markers before adding new ones
          if (window.currentIncidentMarker) {
            try {
              map.removeLayer(window.currentIncidentMarker);
            } catch (e) {}
          }
          if (window.currentIncidentCircle) {
            try {
              map.removeLayer(window.currentIncidentCircle);
            } catch (e) {}
          }

          // Add new incident marker and circle
          const incidentMarker = L.marker([incidentLat, incidentLng], {
            icon: L.divIcon({
              className: 'incident-destination-marker',
              html: "<div style='background-color:${Colors.primary.red};width:30px;height:30px;border-radius:50% 50% 50% 0;border:3px solid white;box-shadow:0 4px 10px rgba(220,38,38,0.6);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;'><span style='transform:rotate(45deg);color:white;font-size:18px;font-weight:bold;'>🚨</span></div>",
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          }).addTo(map);

          const incidentCircle = L.circleMarker([incidentLat, incidentLng], {
            radius: 8,
            color: '${Colors.primary.red}',
            fillColor: '${Colors.primary.red}',
            fillOpacity: 0.8,
            weight: 3
          }).addTo(map).bindTooltip('🚨 Emergency Location', { permanent: false, direction: 'top' });

          window.currentIncidentMarker = incidentMarker;
          window.currentIncidentCircle = incidentCircle;

          if (alternativeRoutes.length > 0) {
            const allCoords = [];
            alternativeRoutes.forEach(route => {
              route.path.forEach(name => {
                if (nodeCoordinates[name]) {
                  allCoords.push(nodeCoordinates[name]);
                }
              });
            });
            const bounds = L.latLngBounds(allCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
          }

        } catch (error) {
          console.error('Error in navigation script:', error);
        }
      })();
      true;
    `;

    if (Platform.OS === 'web') {
      const iframe = document.querySelector('iframe[title="Map"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EXECUTE_SCRIPT', script: navigationScript }, '*');
      }
    } else {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(navigationScript);
      }
    }

    setSelectedDestination(`Navigating to ${incident.fullname || incident.username}`);
  };

  const handleResolveIncident = async (sosId, username) => {
    setResolvingId(sosId);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/sos/resolve/${sosId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve SOS: ${response.status}`);
      }

      const data = await response.json();
      console.log('SOS resolved:', data);

      setIncidents(incidents.filter(inc => inc._id !== sosId));

      // Clear navigation routes and markers from the map
      clearNavigationFromMap();

      // Notification removed to prevent overwhelming the web interface with too many updates
    } catch (error) {
      console.error('Error resolving incident:', error);
      showToast('Failed to resolve emergency. Please try again.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const renderIncidentList = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={Colors.secondary.orange} />;
    }

    if (incidents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcon name="check-circle" size={60} color={Colors.alert.success} />
          <Text style={styles.emptyStateTitle}>No Active Emergencies</Text>
          <Text style={styles.subText}>All clear! No emergency alerts at this time.</Text>
        </View>
      );
    }

    return incidents.map((incident, index) => {
      const timeAgo = incident.timestamp ? new Date(incident.timestamp).toLocaleString() : 'Unknown';
      const fullname = incident.fullname || incident.username || 'Unknown User';
      const address = incident.address || 'Address unavailable';

      return (
        <TouchableOpacity
          key={incident._id || index}
          style={styles.listItem}
          onPress={() => {
            if (incident.latitude && incident.longitude) {
              setSelectedDestination(`${fullname} - ${address}`);
            }
          }}
        >
          <View style={styles.incidentHeader}>
            <View style={styles.incidentIcon}>
              <Icon name="add-alert" size={24} color={Colors.primary.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemText}>{fullname}</Text>
              <Text style={styles.incidentTime}>{timeAgo}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="person-pin" size={20} color={Colors.neutral.gray600} />
              </View>
            </View>
            <Text style={styles.detailText}>@{incident.username || 'unknown'}</Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="phone" size={20} color={Colors.alert.success} />
              </View>
            </View>
            <Text style={styles.detailText}>
              {incident.userId?.contactNumber || 'No contact number'}
            </Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="location-on" size={20} color={Colors.primary.red} />
              </View>
            </View>
            <Text style={styles.detailText} numberOfLines={2}>{address}</Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="my-location" size={20} color={Colors.secondary.orange} />
              </View>
            </View>
            <Text style={styles.detailText}>
              {incident.latitude?.toFixed(6) || 'N/A'}, {incident.longitude?.toFixed(6) || 'N/A'}
            </Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="place" size={20} color={Colors.alert.warning} />
              </View>
            </View>
            <Text style={styles.detailText}>
              {incident.latitude && incident.longitude
                ? `${calculateDistance(
                    initialRegion.latitude,
                    initialRegion.longitude,
                    incident.latitude,
                    incident.longitude
                  ).toLocaleString()} meters away`
                : 'Distance unavailable'}
            </Text>
          </View>

          <View style={styles.incidentActions}>
            <TouchableOpacity
              style={[styles.miniAction, styles.navigateAction]}
              onPress={() => {
                handleNavigateToIncident(incident);
                showToast(`Navigating to ${fullname}'s location`, 'success');
              }}
            >
              <MaterialIcon name="directions" size={16} color={Colors.alert.info} />
              <Text style={[styles.miniActionText, styles.navigateActionText]}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniAction, styles.messageAction]}
              onPress={() => {
                if (navigation && navigation.navigate) {
                  navigation.navigate('Messages', {
                    userId: incident.userId,
                    username: incident.username,
                    fullname: fullname
                  });
                }
              }}
            >
              <MaterialIcon name="message" size={16} color={Colors.secondary.orange} />
              <Text style={[styles.miniActionText, styles.messageActionText]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniAction, styles.callAction]}
              onPress={() => {
                const phoneNumber = incident.userId?.contactNumber || 'No number available';
                showToast(`Calling ${fullname}: ${phoneNumber}`, 'success');
              }}
            >
              <MaterialIcon name="phone" size={16} color={Colors.alert.success} />
              <Text style={[styles.miniActionText, styles.callActionText]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.miniAction,
                styles.resolveAction,
                resolvingId === incident._id && styles.resolveActionDisabled
              ]}
              onPress={() => handleResolveIncident(incident._id, incident.username)}
              disabled={resolvingId === incident._id}
            >
              {resolvingId === incident._id ? (
                <ActivityIndicator size="small" color={Colors.alert.success} />
              ) : (
                <MaterialIcon name="check-circle" size={16} color={Colors.alert.success} />
              )}
              <Text style={[styles.miniActionText, styles.resolveActionText]}>
                {resolvingId === incident._id ? 'Resolving...' : 'Resolve'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      {toast.visible && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <MaterialIcon
            name={toast.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color={Colors.neutral.white}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <View style={styles.leftContainer}>
        <View style={styles.titleContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <ArrowBackIcon style={{ fontSize: 28, color: Colors.secondary.orange }} />
          </TouchableOpacity>
          <View style={styles.titleIconContainer}>
            <NavigationOutlinedIcon style={{ fontSize: 40, color: Colors.secondary.orange }} />
          </View>
          <Text style={styles.title}>Navigation</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location"
            placeholderTextColor={Colors.text.secondary}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.incidentsHeaderContainer}>
          <View style={styles.incidentsHeaderIcon}>
            <Icon name="add-alert" size={30} color={Colors.primary.red} />
          </View>
          <Text style={styles.incidentsHeaderText}>Active Incidents</Text>
        </View>

        <ScrollView style={styles.listContainer}>
          {renderIncidentList()}
        </ScrollView>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={leafletHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Map"
            />
          ) : (
            <WebViewComponent
              ref={webViewRef}
              source={{ html: leafletHtml }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator
                  size="large"
                  color={Colors.secondary.orange}
                  style={styles.mapLoading}
                />
              )}
              onError={(e) => console.error('WebView error:', e.nativeEvent)}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'ROUTE_SELECTED') {
                    setSelectedDestination(`${data.destination} (${data.distance.toFixed(3)} km)`);
                  }
                } catch (e) {
                  console.error('Error parsing WebView message:', e);
                }
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.neutral.gray50,
  },
  leftContainer: {
    flex: 1,
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: Colors.border.light,
    backgroundColor: Colors.neutral.white,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text.primary,
    outlineStyle: 'none',
  },
  filterButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.secondary.orange,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: Colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  incidentsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  incidentsHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  incidentsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    padding: 14,
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.red,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: Colors.neutral.black,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  incidentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  incidentTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.primary.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.neutral.white,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  incidentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
    paddingLeft: 4,
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  miniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: 6,
    marginLeft: 8,
  },
  miniActionText: {
    fontSize: 12,
    color: Colors.secondary.orange,
    fontWeight: '600',
    marginLeft: 4,
  },
  navigateAction: {
    backgroundColor: Colors.alert.info + '20',
  },
  navigateActionText: {
    color: Colors.alert.info,
  },
  messageAction: {
    backgroundColor: Colors.secondary.orange + '20',
  },
  messageActionText: {
    color: Colors.secondary.orange,
  },
  callAction: {
    backgroundColor: Colors.alert.success + '20',
  },
  callActionText: {
    color: Colors.alert.success,
  },
  resolveAction: {
    backgroundColor: Colors.alert.success + '20',
  },
  resolveActionText: {
    color: Colors.alert.success,
  },
  rightContainer: {
    flex: 2,
    padding: 15,
  },
  mapContainer: {
    flex: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: Colors.border.light,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: Colors.neutral.black,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  mapLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
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
    zIndex: 9999,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: Colors.neutral.black,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 8,
    }),
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
  resolveActionDisabled: {
    opacity: 0.6,
  },
});

export default NavigationScreen;