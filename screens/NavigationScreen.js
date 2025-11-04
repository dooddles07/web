import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Icon } from 'react-native-elements';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import API_BASE from '../config/api';

const { width, height } = Dimensions.get('window');

const initialRegion = {
  latitude: 13.628913,
  longitude: 123.240131,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Conditionally import WebView to avoid issues on web
const WebViewComponent = (props) => {
  if (Platform.OS === 'web') {
    return <iframe {...props} style={{ width: '100%', height: '100%', border: 'none' }} />;
  } else {
    const { WebView } = require('react-native-webview');
    return <WebView {...props} style={{ flex: 1 }} />;
  }
};

const NavigationScreen = ({ navigation }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const webViewRef = useRef(null);

  const handleBackPress = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    } else {
      console.log('Back button pressed');
      // Add your custom back navigation logic here
    }
  };

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        // Get auth token from storage
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
        console.log('SOS API response:', data);

        // The API returns { message, count, alerts }
        if (data.alerts && Array.isArray(data.alerts)) {
          setIncidents(data.alerts);
        } else {
          setIncidents([]);
        }
      } catch (error) {
        console.error('Error fetching emergency incidents:', error);
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();

    // Refresh incidents every 10 seconds
    const interval = setInterval(fetchIncidents, 10000);

    // Setup message listener for iframe communication (web only)
    if (Platform.OS === 'web') {
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'EXECUTE_SCRIPT') {
          // This is handled by the iframe directly
          const iframe = document.querySelector('iframe[title="Map"]');
          if (iframe && iframe.contentWindow) {
            try {
              iframe.contentWindow.eval(event.data.script);
            } catch (e) {
              console.error('Error executing map script:', e);
            }
          }
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleMessage);
      };
    }

    return () => clearInterval(interval);
  }, []);

  const selectDestination = (pointName) => {
    setSelectedDestination(pointName);
    if (webViewRef.current && Platform.OS !== 'web') {
      // For React Native WebView
      webViewRef.current.injectJavaScript(`
        try {
          const result = dijkstra(graph, 'defaultStartNode', '${pointName}');
          drawRoute(result.path);
          true; // This is needed for injectJavaScript
        } catch(e) {
          console.error('Error routing to ${pointName}:', e);
          true;
        }
      `);
    }
  };

  const generateMapMarkers = () => {
    // Main marker for the starting point
    let markers = `
      // Main reference point - Emergency Response Center
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
    `;

    // Add emergency incident markers
    incidents
      .filter((incident) => incident.latitude && incident.longitude)
      .forEach((incident, index) => {
        const timeAgo = incident.timestamp ? new Date(incident.timestamp).toLocaleString() : 'Unknown';
        const address = incident.address || 'Address unavailable';
        const fullname = incident.fullname || incident.username || 'Unknown User';

        markers += `
          L.marker([${incident.latitude}, ${incident.longitude}], {
            icon: L.divIcon({
              className: 'emergency-marker',
              html: "<div style='background-color:#FF3B30;width:35px;height:35px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(255,59,48,0.5);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;'><span style='color:white;font-size:20px;font-weight:bold;'>🆘</span></div>",
              iconSize: [35, 35],
              iconAnchor: [17.5, 17.5]
            })
          })
            .addTo(map)
            .bindPopup(\`
              <div style="font-family:Arial;min-width:200px;">
                <div style="background:#FF3B30;color:white;padding:8px;margin:-10px -10px 8px -10px;border-radius:3px 3px 0 0;">
                  <b>🆘 EMERGENCY ALERT</b>
                </div>
                <p style="margin:5px 0;"><b>User:</b> ${fullname}</p>
                <p style="margin:5px 0;"><b>Username:</b> ${incident.username || 'N/A'}</p>
                <p style="margin:5px 0;"><b>Location:</b><br>${address}</p>
                <p style="margin:5px 0;"><b>Coordinates:</b><br>Lat: ${incident.latitude.toFixed(6)}, Lng: ${incident.longitude.toFixed(6)}</p>
                <p style="margin:5px 0;"><b>Time:</b> ${timeAgo}</p>
                <p style="margin:5px 0;color:#FF3B30;"><b>Status:</b> ACTIVE</p>
              </div>
            \`);
        `;
      });

    return markers;
  };

  const leafletHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""/>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }
    .leaflet-popup-content {
      font-family: Arial, sans-serif;
      font-size: 12px;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 5px;
    }
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      const nodeCoordinates = {
        defaultStartNode: [13.628913, 123.240131],
        pointA: [13.628832, 123.240675],
        pointB: [13.629782, 123.240870],
        pointC: [13.629755, 123.241241],
        pointD: [13.629759, 123.241730],
        pointE: [13.630114, 123.241777],
        pointF: [13.630495, 123.241833],
        pointG: [13.630673, 123.241859],
        pointH: [13.630496, 123.241354],
        pointK: [13.630133, 123.241310],
        pointL: [13.630542, 123.241007],
        pointM: [13.630155, 123.240939],
        pointN: [13.629856, 123.239827],
        pointO: [13.630205, 123.239887],
        pointP: [13.630572, 123.239963],
        pointQ: [13.630320, 123.238813],
        pointR: [13.630524, 123.238829],
        pointS: [13.630702, 123.238855],
        pointT: [13.630652, 123.238855],
        pointU: [13.630952, 123.238855],
        pointV: [13.631422, 123.238855],
        pointW: [13.631812, 123.238875],
        pointX: [13.631852, 123.239155],
        pointY: [13.632102, 123.239185],
        pointZ: [13.632002, 123.238555],
        pointaa: [13.631822, 123.238535],
        pointab: [13.631452, 123.238505],
        pointac: [13.631432, 123.238635],
        pointad: [13.630982, 123.238515],
        extPointA: [13.635109, 123.214460],
        extPointB: [13.635075, 123.214890],
        extPointC: [13.635030, 123.215140],
        extPointCtop1: [13.635305, 123.215150],
        extPointCtop2: [13.635700, 123.215200],
        extPointCtop3: [13.636030, 123.215250],
        extPointCtop4: [13.636120, 123.215325],
        extPointD: [13.634590, 123.215130],
        extPointDleft1: [13.634560, 123.214120],
        extPointE: [13.634580, 123.215300],
        extPointF: [13.634580, 123.215300],
        extPointG: [13.634580, 123.215450],
        extPointH: [13.634540, 123.215650],
        extPointHtop1: [13.63500, 123.215710],
        extPointI: [13.634430, 123.216080],
        extPointJ: [13.634170, 123.217000],
        extPointK: [13.633860, 123.218000],
        extPointL: [13.633570, 123.219000],
        extPointM: [13.633180, 123.220000],
        extPointN: [13.633145, 123.220385],
        extPointNleft1: [13.633170, 123.220530],
        extPointNleft2: [13.633200, 123.221260],
        extPointNleft3: [13.633470, 123.221269],
        extPointNleft4: [13.633859, 123.221159],
        extPointNleft5: [13.634019, 123.221070],
        extPointNleft6: [13.634139, 123.221070],
        extPointNleft7: [13.634539, 123.221230],
        extPointNleft8: [13.634409, 123.221200],
        extPointNleft9: [13.634759, 123.221530],
        extPointNleft10: [13.634759, 123.221610],
        extPointNleft11: [13.6348500, 123.221893],
        extPointNleft12: [13.6350200, 123.221953],
        extPointNleft13: [13.6352600, 123.222133],
        extPointNleft14: [13.6353950, 123.222283],
        extPointO: [13.632880, 123.220500],
        extPointP: [13.632600, 123.220550],
        extPointQ: [13.632410, 123.220620],
        extPointR: [13.632550, 123.220930],
        extPointS: [13.632610, 123.221220],
        extPointT: [13.632660, 123.221670],
        extPointU: [13.632680, 123.221950],
        extPointV: [13.632615, 123.222560],
        extPointW: [13.632370, 123.223900],
        extPointX: [13.632280, 123.224490],
        extPointY: [13.632280, 123.224580],
        extPointZ: [13.632200, 123.225160],
        extPointaa: [13.632200, 123.225160],

        newPointC: [13.629087, 123.238700],
        newPointD: [13.628950, 123.239650],
        newPointE: [13.629219, 123.237519],
        newPointE1: [13.629380, 123.236690],
        newPointE2: [13.629790, 123.235925],
        newPointE3: [13.630170, 123.235395],
        newPointE4: [13.630570, 123.234855],
        newPointE5: [13.630890, 123.234355],
        newPointE6: [13.631090, 123.234000],
        newPointE7: [13.631130, 123.233700],
        newPointE8: [13.631100, 123.232820],
        newPointE9: [13.631120, 123.232350],
        newPointF: [13.630070, 123.237737],
        newPointG: [13.630379, 123.237800],
        newPointH: [13.630769, 123.237870],
        newPointH1: [13.630619, 123.237870],
        newPointI: [13.630730, 123.238300],
        newPointJ: [13.630580, 123.238280],
        newPointK: [13.629950, 123.238768],
        newPointL: [13.631040, 123.239980],
        newPointM: [13.631440, 123.239961],
        newPointN: [13.632980, 123.239842],
        newPointO: [13.631500, 123.239010],
        newPointO1: [13.631100, 123.239010],
        newPointP: [13.628787, 123.238600],
        newPointQ: [13.629130, 123.238180],
        newPointR: [13.629150, 123.237935],
        newPointS: [13.628400, 123.238530],
        newPointT: [13.628480, 123.238100],
        newPointU: [13.628100, 123.238050],
        newPointV: [13.628970, 123.239440],
        newPointW: [13.6286590, 123.239320],
        newPointW1: [13.6287900, 123.239390],
        newPointX: [13.628440, 123.240550],
        newPointY: [13.628150, 123.240400],
        newPointZ: [13.628250, 123.239600],
        newPointZ1: [13.628590, 123.239550],
        newPointZ2: [13.628420, 123.239630],
        newPointAA: [13.628080, 123.239050],
        newPointAA2: [13.628180, 123.239150],
        newPointAA1: [13.628150, 123.238700],
        newPointAB: [13.627800, 123.239030],
        newPointAB1: [13.627830, 123.238450],
        newPointAB2: [13.627800, 123.239450],
        newPointAC: [13.628200, 123.239950],
        newPointAD: [13.627770, 123.239810],
        newPointAE: [13.628722, 123.240615],
        newPointAF: [13.629940, 123.229870],
        newPointAG: [13.631450, 123.230020],
        newPointAH: [13.631310, 123.231050],
        newPointAI: [13.631930, 123.232070],
        newPointAJ: [13.631470, 123.231690],
        newPointAK: [13.631220, 123.231650],
        newPointAL: [13.631970, 123.231740],
        newPointAL1: [13.631930, 123.231740],
        newPointAM: [13.632390, 123.231780],
        newPointAM1: [13.632160, 123.231760],
        newPointAN: [13.632070, 123.230730],
        newPointAO: [13.632300, 123.230750],
        newPointAP: [13.632530, 123.230770],
        newPointAQ: [13.632750, 123.230790],
        newPointAR: [13.632970, 123.230820],
        newPointAR1: [13.633140, 123.230820],
        newPointAS: [13.631650, 123.230680],
        newPointAS1: [13.631370, 123.230630],
        newPointAT: [13.631870, 123.230720],
        newPointAU: [13.632220, 123.231200],
        newPointAV: [13.632460, 123.231250],
        newPointAW: [13.632660, 123.231280],
        newPointAX: [13.632900, 123.231300],
        newPointAY: [13.632680, 123.231450],
        newPointAZ: [13.632020, 123.231150],
        newPointAZ1: [13.632020, 123.231190],
        newPointBA: [13.631790, 123.231120],
        newPointBB: [13.631590, 123.231090],
        newPointBC: [13.631700, 123.231720],
        newPointBD: [13.631790, 123.229710],
        newPointBE: [13.631540, 123.229680],
        newPointBF: [13.632000, 123.229750],
        newPointBG: [13.632230, 123.229795],
        newPointBH: [13.632440, 123.229790],
        newPointBI: [13.6326550, 123.229800],
        newPointBJ: [13.632760, 123.229810],
        newPointBK: [13.632900, 123.229850],
        newPointBL: [13.633430, 123.229900],
        newPointBM: [13.633580, 123.229935],
        newPointBN: [13.634330, 123.230020],
        newPointBN1: [13.634080, 123.230000],
        newPointBO: [13.634080, 123.229580],
        newPointBP: [13.633150, 123.230640],
        newPointBQ: [13.632820, 123.230610],
        newPointBR: [13.632850, 123.230400],
        newPointBS: [13.632880, 123.230225],
        newPointBT: [13.632900, 123.230040],
        newPointBU: [13.633350, 123.230460],
        newPointBV: [13.633410, 123.230280],
        newPointBW: [13.633450, 123.230100],
        newPointBX: [13.633580, 123.230090],
        newPointBY: [13.633430, 123.229680],
        newPointBZ: [13.632760, 123.229600],
        newPointCA: [13.632780, 123.229370],
        newPointCB: [13.632800, 123.229150],
        newPointCC: [13.632800, 123.228930],
        newPointCC1: [13.632990, 123.228940],
        newPointCD: [13.632860, 123.228530],
        newPointCE: [13.633300, 123.229430],
        newPointCF: [13.633250, 123.229170],
        newPointCG: [13.633000, 123.228650],
        newPointCH: [13.632340, 123.228995],
        newPointCI: [13.632150, 123.228880],
        newPointCJ: [13.631890, 123.228860],
        newPointCK: [13.631640, 123.228800],
        newPointCL: [13.631950, 123.228600],
        newPointCM: [13.632170, 123.228640],
        newPointCN: [13.631690, 123.228580],
        newPointCO: [13.632070, 123.227730],
        newPointCP: [13.632300, 123.227780],
        newPointCQ: [13.632500, 123.227800],
        newPointCR: [13.632430, 123.228150],
        newPointCS: [13.632250, 123.228150],
        newPointCT: [13.631780, 123.227680],
        newPointCU: [13.629600, 123.229050],
        newPointCV: [13.630250, 123.228620],
        newPointCW: [13.630350, 123.229120],
        newPointCX: [13.631570, 123.229280],

        newPointCY: [13.631950, 123.226700],
        newPointCZ: [13.631450, 123.226470],
        newPointCZ1: [13.631490, 123.226650],
        newPointDa: [13.63212, 123.22579],
        newPointDb: [13.63130, 123.22558],
        newPointDc: [13.63160, 123.22586],
        newPointDc1: [13.63160, 123.22566],
        newPointDe: [13.63275, 123.22527],
        newPointDe1: [13.63287, 123.22527],
        newPointDe2: [13.63319, 123.22537],
        newPointDf: [13.63271, 123.22618],
        newPointDg: [13.63316, 123.22629],
        newPointDh: [13.63269, 123.22640],
        newPointDi: [13.63268, 123.22658],
        newPointDj: [13.63299, 123.22668],
        newPointDk: [13.63310, 123.22651],
        newPointDl: [13.63331, 123.22550],
        newPointDn: [13.63301, 123.224722],
        newPointDp: [13.63320, 123.22402],
        newPointDq: [13.63220, 123.22447],
        newPointDr: [13.63199, 123.22441],
        newPointDs: [13.63190, 123.22510],
        newPointDt: [13.63164, 123.22507],
        newPointDu: [13.63175, 123.22437],
        newPointDv: [13.63181, 123.22386],
        newPointDw: [13.63207, 123.22388],
        newPointDx: [13.63137, 123.22502],
        newPointDy: [13.63110, 123.22500],
        newPointDz: [13.63112, 123.22484],
        newPointEa: [13.63107, 123.22512],
        newPointEa1: [13.63100, 123.22512],
        newPointEb: [13.63147, 123.22433],
        newPointEc: [13.63124, 123.224285],
        newPointEd: [13.63118, 123.22456],
        newPointEe: [13.63133, 123.223823],
        newPointEf: [13.63148, 123.22403],
        newPointEg: [13.63116, 123.22427],
        newPointEg1: [13.63120, 123.22405],
        newPointEg2: [13.63125, 123.22400],
        newPointEh: [13.63072, 123.22423],
        newPointEh1: [13.63065, 123.22412],
        newPointEi: [13.62995, 123.22393],
        newPointEj: [13.62992, 123.22370],
        newPointEj1: [13.62984, 123.22345],
        newPointEk: [13.62903, 123.22303],
        newPointEl: [13.62977, 123.22421],
        newPointEm: [13.62958, 123.22448],
        newPointEn: [13.62936, 123.22475],
        newPointEn1: [13.62939, 123.22485],
        newPointEo: [13.62958, 123.22509],
        newPointEp: [13.62975, 123.22538],
        newPointEr: [13.63003, 123.22629],
        newPointEs: [13.63019, 123.22629],
        newPointEt: [13.63008, 123.22539],
        newPointEu: [13.63053, 123.22537],
        newPointEv: [13.63052, 123.22612],
        newPointEv1: [13.63055, 123.22582],
        newPointEw: [13.63091, 123.22539],
        newPointEy: [13.63323, 123.22264],
        newPointFa: [13.63292, 123.22164],
        newPointFe: [13.63399, 123.22045],
        newPointFh: [13.63563, 123.22235],
        newPointFk: [13.632010, 123.229450],
        newPointFl: [13.632500, 123.229800],
        newPointFm: [13.633000, 123.230100],
        newPointFn: [13.633500, 123.230400],
        newPointFm: [13.62844, 123.24328],
        newPointFo: [13.62870, 123.24326],
        newPointFp: [13.62888, 123.24327],
        newPointFq: [13.62902, 123.24329],
        newPointFr: [13.62819, 123.24484],
        newPointFs: [13.62817, 123.24511],
        newPointFt: [13.62826, 123.24512],
        newPointFu: [13.62844, 123.24536],
        newPointFv: [13.62860, 123.24550],
        newPointFw: [13.62908, 123.24564],
        newPointFx: [13.62960, 123.24577],
        newPointFy: [13.62990, 123.24579],
        newPointFz: [13.63008, 123.24570],
        newPointGa: [13.63033, 123.24561],
        newPointGb: [13.63061, 123.24561],
        newPointGc: [13.63050, 123.24587],
        newPointGd: [13.63044, 123.24615],
        newPointGe: [13.63043, 123.24699],
        newPointGf: [13.63028, 123.24764],
        newPointGg: [13.62800, 123.24641],
        newPointGh: [13.62785, 123.24720],
        newPointGi: [13.62619, 123.24716],
        newPointGj: [13.62761, 123.24924],
        newPointGk: [13.62782, 123.24928],
        newPointGl: [13.62798, 123.24928],
        newPointGm: [13.62821, 123.24925],
        newPointGn: [13.62834, 123.24907],
        newPointGo: [13.62758, 123.24948],
        newPointGp: [13.62757, 123.24987],
        newPointGq: [13.62759, 123.25036],
        newPointGr: [13.62702, 123.25037],
        newPointGs: [13.62689, 123.25021],
        newPointGt: [13.62629, 123.25021],
        newPointGu: [13.62622, 123.25002],
        newPointGv: [13.62617, 123.24999],
        newPointGw: [13.62507, 123.25011],
        newPointGx: [13.62502, 123.25017],
        newPointGy: [13.62502, 123.25031],
        newPointGz: [13.62506, 123.25034],
        newPointHa: [13.62496, 123.25045],
        newPointHb: [13.62502, 123.25061],
        newPointHc: [13.62499, 123.25070],
        newPointHd: [13.62490, 123.25072],
        newPointHe: [13.62483, 123.25067],
        newPointHf: [13.62483, 123.25059],
        newPointHg: [13.62487, 123.25053],
        newPointHi: [13.62456, 123.25046],
        newPointHj: [13.62372, 123.25080],
        newPointHk: [13.62351, 123.25078],
        newPointHl: [13.62325, 123.25000],
        newPointHm: [13.62354, 123.24989],
        newPointHn: [13.62392, 123.24974],
        newPointHo: [13.62787, 123.25136],
        newPointHp: [13.62854, 123.25285],
        newPointHq: [13.62882, 123.25292],
        newPointHr: [13.62915, 123.25350],
        newPointHs: [13.62935, 123.25342],
        newPointHt: [13.62949, 123.25345],
        newPointHu: [13.62973, 123.25364],
        newPointHv: [13.62997, 123.25387],
        newPointHw: [13.63003, 123.25442],
        newPointHx: [13.63026, 123.25458],
        newPointHy: [13.63051, 123.25481],
        newPointHz: [13.63076, 123.25484],
        newPointIa: [13.63102, 123.25486],
        newPointIb: [13.63191, 123.25482],
        newPointIc: [13.63191, 123.25456],
        newPointId: [13.63101, 123.25458],
        newPointIe: [13.63099, 123.25435],
        newPointIf: [13.63190, 123.25432],
        newPointIg: [13.63190, 123.25408],
        newPointIh: [13.63177, 123.25405],
        newPointIi: [13.63189, 123.25342],
        newPointIj: [13.63219, 123.25336],
        newPointIk: [13.63163, 123.25345],
        newPointIl: [13.63154, 123.25406],
        newPointIm: [13.63128, 123.25407],
        newPointIn: [13.63108, 123.25407],
        newPointIo: [13.63097, 123.25407],
        newPointIp: [13.63139, 123.25349],
        newPointIq: [13.63129, 123.25344],
        newPointIr: [13.63122, 123.25331],
        newPointIs: [13.63093, 123.25280],
        newPointIt: [13.63095, 123.25386],
        newPointIu: [13.63071, 123.25386],
        newPointIv: [13.63066, 123.25281],
        newPointIw: [13.63042, 123.25278],
        newPointIx: [13.63020, 123.25277],
        newPointIy: [13.63046, 123.25387],
        newPointIz: [13.63024, 123.25387],
        newPointJa: [13.63009, 123.25276],
        newPointJb: [13.63010, 123.25244],
        newPointJc: [13.63075, 123.25246],
        newPointJd: [13.62995, 123.25283],
        newPointJe: [13.62973, 123.25285],
        newPointJf: [13.62947, 123.25287],
        newPointJg: [13.62911, 123.25288],
        // You can add more points from your data here
      };

      const map = L.map('map', {
        center: nodeCoordinates.defaultStartNode,
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add markers with tooltips for each node
      for (const [nodeName, coords] of Object.entries(nodeCoordinates)) {
        L.circleMarker(coords, {
          radius: 5,
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.8
        })
          .bindTooltip(nodeName, { permanent: false, direction: 'top' })
          .addTo(map);
      }

      // Connections between nodes
      const connections = {
        defaultStartNode: ['pointA', 'newPointD'],
        pointA: ['defaultStartNode', 'pointB', 'newPointAE', 'newPointFm'],
        newPointJg: ['newPointJf', 'newPointHq', 'newPointHs'],
         pointB: ['pointA', 'pointC', 'pointN', 'pointM'],
        pointC: ['pointB', 'pointD', 'pointK'],
        pointD: ['pointC', 'pointE'],
        pointE: ['pointD', 'pointF', 'pointK'],
        pointF: ['pointE', 'pointG', 'pointH'],
        pointG: ['pointF'],
        pointH: ['pointF', 'pointK', 'pointL'],
        pointK: ['pointH', 'pointE', 'pointC'],
        pointL: ['pointH', 'pointM', 'pointP'],
        pointM: ['pointL', 'pointO', 'pointB'],
        pointN: ['pointB', 'pointO', 'newPointD', 'newPointK'],
        newPointK: ['newPointF', 'newPointC', 'pointN', 'pointQ'],
        pointO: ['pointN', 'pointP', 'pointQ', 'pointM'],
        pointP: ['pointO', 'pointL', 'pointT', 'newPointL'],
        newPointL: ['newPointO1', 'newPointM', 'pointP'],
        newPointO1: ['newPointL', 'newPointO'],
        newPointO: ['newPointO1', 'newPointM'],
        newPointM: ['newPointO', 'newPointL', 'newPointN'],
        newPointN: ['newPointM'],
        pointQ: ['pointO', 'pointR', 'newPointK', 'newPointG'],
        newPointG: ['newPointH1', 'newPointF', 'pointQ'],
        newPointF: ['newPointG', 'newPointE', 'newPointK'],
        newPointE: ['newPointF', 'newPointR', 'newPointE1'],
        newPointE1: ['newPointE', 'newPointE2'],
        newPointE2: ['newPointE1', 'newPointE3'],
        newPointE3: ['newPointE2', 'newPointE4'],
        newPointE4: ['newPointE3', 'newPointE5'],
        newPointE5: ['newPointE4', 'newPointE6'],
        newPointE6: ['newPointE5', 'newPointE7'],
        newPointE7: ['newPointE6', 'newPointE8'],
        newPointE8: ['newPointE7', 'newPointE9'],
        newPointE9: ['newPointE8', 'newPointAK'],
        newPointR: ['newPointE', 'newPointQ',],
        newPointQ: ['newPointR', 'newPointC', 'newPointT'],
        newPointC: ['newPointQ', 'newPointQ', 'newPointP', 'newPointV'],
        newPointV: ['newPointC', 'newPointD', 'newPointW1'],
        newPointW: ['newPointW1', 'newPointP', 'newPointAA2',],
        newPointH1: ['newPointG', 'newPointH', 'newPointJ'],
        newPointJ: ['newPointH1', 'newPointI', 'pointR'],
        newPointH: ['newPointI', 'newPointH1'],
        newPointI: ['newPointH', 'newPointJ', 'pointS'],
        pointR: ['pointQ', 'pointT', 'newPointJ'],
        pointS: ['pointU', 'pointT', 'newPointI'],
        pointT: ['pointS', 'pointR', 'pointP'],
        pointU: ['pointS', 'pointV', 'pointad'],
        pointV: ['pointU', 'pointW', 'pointac'],
        pointW: ['pointV', 'pointX', 'pointaa'],
        pointX: ['pointW', 'pointY'],
        pointY: ['pointX', 'pointZ'],
        pointZ: ['pointY', 'pointaa'],
        pointaa: ['pointZ', 'pointab', 'pointW'],
        pointab: ['pointaa', 'pointac'],
        pointac: ['pointab', 'pointad', 'pointV'],
        pointad: ['pointac', 'pointU'],
        extPointCtop4: ['extPointCtop3'],
        extPointCtop3: ['extPointCtop2', 'extPointCtop4'],
        extPointCtop2: ['extPointCtop1', 'extPointCtop3'],
        extPointCtop1: ['extPointC', 'extPointCtop2'],
        extPointC: ['extPointD', 'extPointB', 'extPointCtop1'],
        extPointB: ['extPointA', 'extPointC'],
        extPointA: ['extPointB'],
        extPointD: ['extPointC', 'extPointE', 'extPointDleft1'],
        extPointDleft1: ['extPointD'],
        extPointF: ['extPointD', 'extPointG'],
        extPointG: ['extPointF', 'extPointH'],
        extPointH: ['extPointG', 'extPointI', 'extPointHtop1'],
        extPointHtop1: ['extPointH'],
        extPointI: ['extPointH', 'extPointJ'],
        extPointJ: ['extPointI', 'extPointK'],
        extPointK: ['extPointJ', 'extPointL'],
        extPointL: ['extPointK', 'extPointM'],
        extPointM: ['extPointL', 'extPointN'],
        extPointN: ['extPointM', 'extPointO', 'extPointNleft1'],
        extPointNleft1: ['extPointN', 'extPointNleft2', 'newPointFe'],
        newPointFe: ['extPointNleft1'],
        extPointNleft2: ['extPointNleft1', 'extPointS', 'extPointNleft3'],
        extPointNleft3: ['extPointNleft2', 'extPointNleft4'],
        extPointNleft4: ['extPointNleft3', 'extPointNleft5'],
        extPointNleft5: ['extPointNleft4', 'extPointNleft6'],
        extPointNleft6: ['extPointNleft5', 'extPointNleft8'],
        extPointNleft7: ['extPointNleft8', 'extPointNleft9'],
        extPointNleft8: ['extPointNleft7', 'extPointNleft6'],
        extPointNleft9: ['extPointNleft7', 'extPointNleft10'],
        extPointNleft10: ['extPointNleft9', 'extPointNleft11'],
        extPointNleft11: ['extPointNleft10', 'extPointNleft12'],
        extPointNleft12: ['extPointNleft11', 'extPointNleft13'],
        extPointNleft13: ['extPointNleft12', 'extPointNleft14'],
        extPointNleft14: ['extPointNleft13', 'newPointFh'],
        newPointFh: ['extPointNleft14'],


        extPointO: ['extPointN', 'extPointP'],
        extPointP: ['extPointO', 'extPointQ'],
        extPointQ: ['extPointP', 'extPointR'],
        extPointR: ['extPointQ', 'extPointS'],
        extPointS: ['extPointR', 'extPointT', 'extPointNleft2'],
        extPointT: ['extPointS', 'extPointU', 'newPointFa'],
        newPointFa: ['extPointT'],
        extPointU: ['extPointT', 'extPointV'],
        extPointV: ['extPointU', 'extPointW', 'newPointEy'],
        newPointEy: ['extPointV'],
        extPointW: ['extPointV', 'extPointX', 'newPointDp'],
        newPointDp: ['extPointW'],
        extPointX: ['extPointW', 'extPointY', 'newPointDq'],
        newPointDq: ['extPointX', 'newPointDr'],
        newPointDr: ['newPointDq', 'newPointDs', 'newPointDw', 'newPointDu'],
        newPointDw: ['newPointDr', 'newPointDv'],
        newPointDv: ['newPointDw', 'newPointDu', 'newPointEe'],
        newPointEe: ['newPointDv'],
        newPointDu: ['newPointDr', 'newPointDv', 'newPointEb', 'newPointDt'],
        newPointDs: ['newPointDr', 'newPointDt'],
        newPointDt: ['newPointDu', 'newPointDs', 'newPointDx'],
        newPointDx: ['newPointDt', 'newPointEb', 'newPointDy'],
        newPointDy: ['newPointDx', 'newPointDz', 'newPointEa'],
        newPointEa: ['newPointDy', 'newPointEa1'],
        newPointEa1: ['newPointEa', 'newPointEw', 'newPointEo'],
        newPointEw: ['newPointEa1', 'newPointEu'],
        newPointEu: ['newPointEw', 'newPointEv1', 'newPointEt'],
        newPointEv1: ['newPointEu', 'newPointEv'],
        newPointEv: ['newPointEv1'],
        newPointEt: ['newPointEu', 'newPointEp', 'newPointEs'],
        newPointEs: ['newPointEt', 'newPointEr'],
        newPointEr: ['newPointEs', 'newPointEp'],
        newPointEp: ['newPointEt', 'newPointEo', 'newPointEr'],
        newPointEo: ['newPointEp', 'newPointEa1', 'newPointEn1'],
        newPointEn1: ['newPointEo', 'newPointEn'],
        newPointEn: ['newPointEn1', 'newPointDz', 'newPointEm'],
        newPointDz: ['newPointEn', 'newPointDy', 'newPointEd'],
        newPointEd: ['newPointDz', 'newPointEc', 'newPointEm'],
        newPointEm: ['newPointEd', 'newPointEn', 'newPointEl'],
        newPointEb: ['newPointDu', 'newPointDx', 'newPointEc'],
        newPointEc: ['newPointEb', 'newPointEd', 'newPointEg'],
        newPointEg: ['newPointEc', 'newPointEg1', 'newPointEh'],
        newPointEg1: ['newPointEg', 'newPointEg2'],
        newPointEg2: ['newPointEg1', 'newPointEf'],
        newPointEf: ['newPointEg2'],
        newPointEh: ['newPointEg', 'newPointEh1', 'newPointEl'],
        newPointEh1: ['newPointEh', 'newPointEi'],
        newPointEi: ['newPointEh1', 'newPointEj', 'newPointEl'],
        newPointEj: ['newPointEi', 'newPointEj1'],
        newPointEj1: ['newPointEj', 'newPointEk'],
        newPointEk: ['newPointEj1'],
        newPointEl: ['newPointEh', 'newPointEi', 'newPointEm'],




        extPointY: ['extPointX', 'extPointaa', 'newPointDn'],
        newPointDn: ['extPointY'],
        extPointaa: ['extPointY', 'newPointDa', 'newPointDe'],
        newPointD: ['defaultStartNode', 'pointN', 'newPointV'],
        newPointAE: ['pointA'],
        newPointT: ['newPointQ', 'newPointU', 'newPointS'],
        newPointU: ['newPointT', 'newPointAB1'],
        newPointAB: ['newPointAB2', 'newPointAA', 'newPointAB1'],
        newPointAA: ['newPointAB', 'newPointAA2', 'newPointAA1'],
        newPointZ: ['newPointAB2', 'newPointZ2', 'newPointAC'],
        newPointAC: ['newPointZ', 'newPointAD', 'newPointY'],
        newPointAD: ['newPointAC'],
        newPointY: ['newPointAC', 'newPointX'],
        newPointX: ['newPointY', 'newPointAE'],
        newPointAE: ['newPointX', 'pointA'],
        newPointZ1: ['newPointW1', 'newPointZ2', 'newPointX'],
        newPointZ2: ['newPointZ1', 'newPointZ'],
        newPointW1: ['newPointZ1', 'newPointW', 'newPointV'],
        newPointAB2: ['newPointZ', 'newPointAB'],
        newPointAB1: ['newPointAB', 'newPointU'],
        newPointAA2: ['newPointAA', 'newPointW'],
        newPointAA1: ['newPointAA', 'newPointS'],
        newPointS: ['newPointAA1', 'newPointT', 'newPointP'],
        newPointP: ['newPointS', 'newPointC', 'newPointW'],
        newPointAK: ['newPointAJ', 'newPointAH', 'newPointE9'],
        newPointAJ: ['newPointAK', 'newPointBC', 'newPointBB'],
        newPointBC: ['newPointAJ', 'newPointBA', 'newPointAL1'],
        newPointAL1: ['newPointBC', 'newPointAL', 'newPointAZ1'],
        newPointAL: ['newPointAL1', 'newPointAI', 'newPointAM1'],
        newPointAI: ['newPointAL'],
        newPointAM1: ['newPointAL', 'newPointAM', 'newPointAU'],
        newPointAM: ['newPointAM1', 'newPointAV'],
        newPointAH: ['newPointAK', 'newPointBB', 'newPointAS1'],
        newPointBB: ['newPointAH', 'newPointAJ', 'newPointBA', 'newPointAS'],
        newPointBA: ['newPointBB', 'newPointAT', 'newPointAZ', 'newPointBC'],
        newPointAZ: ['newPointBA', 'newPointAZ1', 'newPointAN'],
        newPointAZ1: ['newPointAZ', 'newPointAL1', 'newPointAU'],
        newPointAU: ['newPointAZ1', 'newPointAM1', 'newPointAV', 'newPointAO'],
        newPointAV: ['newPointAU', 'newPointAP', 'newPointAM', 'newPointAW'],
        newPointAW: ['newPointAV', 'newPointAY', 'newPointAX', 'newPointAQ'],
        newPointAX: ['newPointAW', 'newPointAR'],
        newPointAY: ['newPointAW'],
        newPointAS1: ['newPointAH', 'newPointAS', 'newPointAG'],
        newPointAS: ['newPointAS1', 'newPointAT', 'newPointBB', 'newPointBD'],
        newPointAT: ['newPointAS', 'newPointAN', 'newPointBA'],
        newPointAN: ['newPointAT', 'newPointAZ', 'newPointAO', 'newPointBG'],
        newPointAO: ['newPointAN', 'newPointBH', 'newPointAU', 'newPointAP'],
        newPointAP: ['newPointAO', 'newPointAV', 'newPointAQ', 'newPointBI'],
        newPointAQ: ['newPointAP', 'newPointAW', 'newPointAR', 'newPointBQ'],
        newPointAR: ['newPointAQ', 'newPointAX', 'newPointAR1'],
        newPointAR1: ['newPointAR'],
        newPointBQ: ['newPointBP', 'newPointBR', 'newPointAQ'],
        newPointBP: ['newPointBQ'],
        newPointBR: ['newPointBQ', 'newPointBS', 'newPointBU'],
        newPointBU: ['newPointBR'],
        newPointBS: ['newPointBR', 'newPointBT', 'newPointBV'],
        newPointBV: ['newPointBS', 'newPointBW'],
        newPointBT: ['newPointBS', 'newPointBK', 'newPointBW'],
        newPointBW: ['newPointBT', 'newPointBX', 'newPointBV'],
        newPointBX: ['newPointBW', 'newPointBM'],
        newPointBM: ['newPointBX', 'newPointBL', 'newPointBN1'],
        newPointBN1: ['newPointBM', 'newPointBN', 'newPointBO'],
        newPointBN: ['newPointBN1'],
        newPointBO: ['newPointBN1'],
        newPointBL: ['newPointBM', 'newPointBY', 'newPointBK'],
        newPointBK: ['newPointBL', 'newPointBT', 'newPointBJ'],
        newPointBJ: ['newPointBK', 'newPointBI', 'newPointBZ'],
        newPointBI: ['newPointBJ', 'newPointBH', 'newPointAP'],
        newPointBH: ['newPointBI', 'newPointAO', 'newPointBG'],
        newPointBG: ['newPointBH', 'newPointAN', 'newPointBF', 'newPointCH'],
        newPointCH: ['newPointBG'],
        newPointBF: ['newPointBG', 'newPointCI', 'newPointBD'],
        newPointBD: ['newPointBF', 'newPointCJ', 'newPointBE', 'newPointAS'],
        newPointBE: ['newPointAG', 'newPointBD', 'newPointCX'],
        newPointAG: ['newPointAS1', 'newPointBE', 'newPointAF'],
        newPointAF: ['newPointAG'],
        newPointCX: ['newPointBE', 'newPointCK', 'newPointCW'],
        newPointCW: ['newPointCX', 'newPointCV', 'newPointCU'],
        newPointCV: ['newPointCW'],
        newPointCU: ['newPointCW'],
        newPointCK: ['newPointCX', 'newPointCN', 'newPointCJ'],
        newPointCJ: ['newPointCK', 'newPointCI', 'newPointBD'],
        newPointCI: ['newPointCJ', 'newPointBF', 'newPointCM'],
        newPointCM: ['newPointCI', 'newPointCS', 'newPointCL'],
        newPointCL: ['newPointCM', 'newPointCN', 'newPointCO'],
        newPointCN: ['newPointCL', 'newPointCK', 'newPointCT'],
        newPointCT: ['newPointCN', 'newPointCO', 'newPointCY'],
        newPointCO: ['newPointCP', 'newPointCL', 'newPointCT'],
        newPointCP: ['newPointCO', 'newPointCQ', 'newPointCS'],
        newPointCQ: ['newPointCP', 'newPointCR'],
        newPointCR: ['newPointCQ', 'newPointCS'],
        newPointCS: ['newPointCR', 'newPointCP', 'newPointCM'],
        newPointBY: ['newPointBL', 'newPointBZ'],
        newPointBZ: ['newPointBY', 'newPointBJ', 'newPointCA'],
        newPointCA: ['newPointBZ', 'newPointCB', 'newPointCE'],
        newPointCE: ['newPointCA'],
        newPointCB: ['newPointCA', 'newPointCC', 'newPointCF'],
        newPointCF: ['newPointCB'],
        newPointCC: ['newPointCB', 'newPointCD', 'newPointCC1'],
        newPointCC1: ['newPointCC', 'newPointCG'],
        newPointCG: ['newPointCC1'],
        newPointCD: ['newPointCC'],
        newPointCY: ['newPointCT', 'newPointCZ1', 'newPointDa'],
        newPointCZ1: ['newPointCY', 'newPointCZ'],
        newPointCZ: ['newPointCZ1'],
        newPointDa: ['newPointCY', 'extPointaa', 'newPointDc1'],
        newPointDc1: ['newPointDa', 'newPointDb', 'newPointDc'],
        newPointDb: ['newPointDc1'],
        newPointDc: ['newPointDc1'],
        newPointDe: ['extPointaa', 'newPointDf', 'newPointDe1'],
        newPointDe1: ['newPointDe', 'newPointDe2'],
        newPointDe2: ['newPointDe1', 'newPointDl'],
        newPointDl: ['newPointDe2'],
        newPointDf: ['newPointDe', 'newPointDg', 'newPointDh'],
        newPointDg: ['newPointDf'],
        newPointDh: ['newPointDf', 'newPointDi', 'newPointDk'],
        newPointDk: ['newPointDh'],
        newPointDi: ['newPointDh', 'newPointDj'],
        newPointDj: ['newPointDi'],
        newPointFm: ['pointA', 'newPointFo', 'newPointFr'],
        newPointFo: ['newPointFm', 'newPointFp'],
        newPointFp: ['newPointFo', 'newPointFq'],
        newPointFq: ['newPointFp'],
        newPointFr: ['newPointFm', 'newPointFs'],
        newPointFs: ['newPointFr', 'newPointFt', 'newPointGg'],
        newPointFt: ['newPointFs', 'newPointFu'],
        newPointFu: ['newPointFt', 'newPointFv'],
        newPointFv: ['newPointFu', 'newPointFw'],
        newPointFw: ['newPointFv', 'newPointFx'],
        newPointFx: ['newPointFw', 'newPointFy'],
        newPointFy: ['newPointFx', 'newPointFz'],
        newPointFz: ['newPointFy', 'newPointGa'],
        newPointGa: ['newPointFz', 'newPointGb'],
        newPointGb: ['newPointGa', 'newPointGc'],
        newPointGc: ['newPointGb', 'newPointGd'],
        newPointGd: ['newPointGc', 'newPointGe'],
        newPointGe: ['newPointGd', 'newPointGf'],
        newPointGf: ['newPointGe'],
        newPointGg: ['newPointFs', 'newPointGh'],
        newPointGh: ['newPointGg', 'newPointGi', 'newPointGj'],
        newPointGi: ['newPointGh'],
        newPointGj: ['newPointGh', 'newPointGk', 'newPointGo'],
        newPointGk: ['newPointGj', 'newPointGl'],
        newPointGl: ['newPointGk', 'newPointGm'],
        newPointGm: ['newPointGl', 'newPointGn'],
        newPointGn: ['newPointGm'],
        newPointGo: ['newPointGj', 'newPointGp'],
        newPointGp: ['newPointGo', 'newPointGq'],
        newPointGq: ['newPointGp', 'newPointGr', 'newPointHo'],
        newPointGr: ['newPointGq', 'newPointGs'],
        newPointGs: ['newPointGr', 'newPointGt'],
        newPointGt: ['newPointGs', 'newPointGu', 'newPointGz'],
        newPointGu: ['newPointGt', 'newPointGv'],
        newPointGv: ['newPointGu', 'newPointGw'],
        newPointGw: ['newPointGv', 'newPointGx'],
        newPointGx: ['newPointGw', 'newPointGy'],
        newPointGy: ['newPointGx', 'newPointGz', 'newPointHi'],
        newPointGz: ['newPointGy', 'newPointHa', 'newPointGt'],
        newPointHa: ['newPointGz', 'newPointHb', 'newPointHg'],
        newPointHb: ['newPointHa', 'newPointHc'],
        newPointHc: ['newPointHb', 'newPointHd'],
        newPointHd: ['newPointHc', 'newPointHe'],
        newPointHe: ['newPointHd', 'newPointHf'],
        newPointHf: ['newPointHe', 'newPointHg'],
        newPointHg: ['newPointHf', 'newPointHa'],
        newPointHi: ['newPointGy', 'newPointHn', 'newPointHj'],
        newPointHj: ['newPointHi', 'newPointHk', 'newPointHl', 'newPointHm'],
        newPointHk: ['newPointHj'],
        newPointHl: ['newPointHj'],
        newPointHm: ['newPointHj'],
        newPointHn: ['newPointHi'],
        newPointHo: ['newPointGq', 'newPointHp'],
        newPointHp: ['newPointHo', 'newPointHq'],
        newPointHq: ['newPointHp', 'newPointHr', 'newPointJg'],
        newPointHr: ['newPointHq', 'newPointHs'],
        newPointHs: ['newPointHr', 'newPointHt', 'newPointJg'],
        newPointHt: ['newPointHs', 'newPointHu', 'newPointJf'],
        newPointHu: ['newPointHt', 'newPointHv', 'newPointJe'],
        newPointHv: ['newPointHu', 'newPointHw', 'newPointJd', 'newPointIz'],
        newPointHw: ['newPointHv', 'newPointHx'],
        newPointHx: ['newPointHw', 'newPointHy', 'newPointIz'],
        newPointHy: ['newPointHx', 'newPointIy', 'newPointHz'],
        newPointHz: ['newPointHy', 'newPointIu', 'newPointIa'],
        newPointIa: ['newPointHz', 'newPointId', 'newPointIb'],
        newPointIb: ['newPointIa', 'newPointIc'],
        newPointIc: ['newPointIb', 'newPointId', 'newPointIf'],
        newPointId: ['newPointIc', 'newPointIa', 'newPointIe'],
        newPointIe: ['newPointId', 'newPointIf', 'newPointIo'],
        newPointIf: ['newPointIe', 'newPointIc', 'newPointIg'],
        newPointIg: ['newPointIf', 'newPointIh'],
        newPointIh: ['newPointIg', 'newPointIi', 'newPointIl'],
        newPointIi: ['newPointIh', 'newPointIj', 'newPointIk'],
        newPointIj: ['newPointIi'],
        newPointIk: ['newPointIi', 'newPointIl', 'newPointIp'],
        newPointIl: ['newPointIk', 'newPointIh', 'newPointIm'],
        newPointIm: ['newPointIl', 'newPointIn', 'newPointIp'],
        newPointIn: ['newPointIm', 'newPointIo', 'newPointIr'],
        newPointIo: ['newPointIn', 'newPointIt', 'newPointIe'],
        newPointIp: ['newPointIk', 'newPointIm', 'newPointIq'],
        newPointIq: ['newPointIp', 'newPointIr'],
        newPointIr: ['newPointIq', 'newPointIs', 'newPointIn'],
        newPointIs: ['newPointIr', 'newPointIt', 'newPointIv', 'newPointJc'],
        newPointIt: ['newPointIs', 'newPointIu', 'newPointIo'],
        newPointIu: ['newPointIt', 'newPointHz', 'newPointIy', 'newPointIv'],
        newPointIv: ['newPointIu', 'newPointIs', 'newPointIw'],
        newPointIw: ['newPointIv', 'newPointIx', 'newPointIy'],
        newPointIx: ['newPointIw', 'newPointJa', 'newPointIz'],
        newPointIz: ['newPointIx', 'newPointIy', 'newPointHv', 'newPointHx'],
        newPointJa: ['newPointIx', 'newPointJb', 'newPointJd'],
        newPointJb: ['newPointJa', 'newPointJc'],
        newPointJc: ['newPointJb', 'newPointIs'],
        newPointJd: ['newPointJa', 'newPointJe', 'newPointHv'],
        newPointJe: ['newPointJd', 'newPointJf', 'newPointHu'],
        newPointJf: ['newPointJe', 'newPointJg', 'newPointHt'],
      };

      // Haversine formula for distances
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

      // Build weighted graph
      const graph = {};
      for (const [node, neighbors] of Object.entries(connections)) {
        graph[node] = {};
        for (const neighbor of neighbors) {
          graph[node][neighbor] = getDistance(...nodeCoordinates[node], ...nodeCoordinates[neighbor]);
        }
      }

      // Dijkstra algorithm
      function dijkstra(graph, start, end) {
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
      }

      // Draw polyline for route
      let currentRouteLine = null;
      function drawRoute(path) {
        if (currentRouteLine) {
          map.removeLayer(currentRouteLine);
        }

        const latlngs = path.map(name => nodeCoordinates[name]);
        currentRouteLine = L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);

        // Fit map to show the entire route
        if (latlngs.length > 0) {
          map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
        }
      }

      // Draw lines between connected nodes
      for (const [node, neighbors] of Object.entries(connections)) {
        for (const neighbor of neighbors) {
          const latlngs = [nodeCoordinates[node], nodeCoordinates[neighbor]];
          L.polyline(latlngs, { color: 'gray', weight: 2, dashArray: '4' }).addTo(map);
        }
      }

      // Add clickable markers
      for (const [name, coords] of Object.entries(nodeCoordinates)) {
        const label = name === 'defaultStartNode' ? 'default starting node' : name;
        const marker = L.circleMarker(coords, {
          radius: 5,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.8
        }).addTo(map).bindPopup(label);

        marker.on('click', () => {
          if (name === 'defaultStartNode') return;

          const result = dijkstra(graph, 'defaultStartNode', name);
          console.log("Route to", name, result);
          drawRoute(result.path);

          // Send message to React Native if not on web
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ROUTE_SELECTED',
              destination: name,
              distance: result.distance,
              path: result.path
            }));
          }
        });
      }

      // Add incident markers
      ${generateMapMarkers()}

      setTimeout(() => map.invalidateSize(), 100);
      map.attributionControl.setPrefix('');
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Make functions available globally for calling from React Native
      window.dijkstra = dijkstra;
      window.drawRoute = drawRoute;
      window.nodeCoordinates = nodeCoordinates;
      window.graph = graph;
    });

    // Listen for messages from parent to execute navigation scripts
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'EXECUTE_SCRIPT') {
        try {
          eval(event.data.script);
        } catch (e) {
          console.error('Error executing navigation script:', e);
        }
      }
    });
  </script>
</body>
</html>`;

  const handleIncidentPress = (incident) => {
    if (incident.latitude && incident.longitude) {
      setSelectedDestination(`${incident.fullname || incident.username} - ${incident.address || 'Location unavailable'}`);
    }
  };

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

    // Inject JavaScript to add incident as a node and calculate route
    const navigationScript = `
      (function() {
        // Haversine formula for distance
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

        // Incident location
        const incidentLat = ${lat};
        const incidentLng = ${lng};
        const incidentNodeName = 'INCIDENT_${incidentId}';

        // Add incident as a temporary node
        nodeCoordinates[incidentNodeName] = [incidentLat, incidentLng];

        // Find 3 nearest nodes to connect the incident to the network
        const nearestNodes = [];

        for (const [nodeName, coords] of Object.entries(nodeCoordinates)) {
          if (nodeName === incidentNodeName) continue;

          const distance = getDistance(incidentLat, incidentLng, coords[0], coords[1]);
          nearestNodes.push({ name: nodeName, distance });
        }

        // Sort by distance and take top 3
        nearestNodes.sort((a, b) => a.distance - b.distance);
        const connectToNodes = nearestNodes.slice(0, 3);

        // Create connections for the incident node
        const incidentConnections = {};
        connectToNodes.forEach(node => {
          incidentConnections[node.name] = node.distance;
        });

        // Add incident node to graph with bidirectional connections
        graph[incidentNodeName] = incidentConnections;

        // Add reverse connections (from nearest nodes to incident)
        connectToNodes.forEach(node => {
          if (!graph[node.name]) {
            graph[node.name] = {};
          }
          graph[node.name][incidentNodeName] = node.distance;
        });

        // Calculate route from starting point directly to incident node
        const result = dijkstra(graph, 'defaultStartNode', incidentNodeName);

        // Draw the route
        drawRoute(result.path);

        // Add special marker at incident location
        const incidentMarker = L.marker([incidentLat, incidentLng], {
          icon: L.divIcon({
            className: 'incident-destination-marker',
            html: "<div style='background-color:#FF3B30;width:30px;height:30px;border-radius:50% 50% 50% 0;border:3px solid white;box-shadow:0 4px 10px rgba(255,59,48,0.6);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;'><span style='transform:rotate(45deg);color:white;font-size:18px;font-weight:bold;'>🚨</span></div>",
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(map);

        // Add circle marker to show incident as part of the route
        const incidentCircle = L.circleMarker([incidentLat, incidentLng], {
          radius: 8,
          color: '#FF3B30',
          fillColor: '#FF3B30',
          fillOpacity: 0.8,
          weight: 3
        }).addTo(map).bindTooltip('🚨 Emergency Location', { permanent: false, direction: 'top' });

        // Store references to remove later if needed
        if (window.currentIncidentMarker) {
          map.removeLayer(window.currentIncidentMarker);
        }
        if (window.currentIncidentCircle) {
          map.removeLayer(window.currentIncidentCircle);
        }
        window.currentIncidentMarker = incidentMarker;
        window.currentIncidentCircle = incidentCircle;

        // Fit map to show the entire route including incident
        const bounds = L.latLngBounds(result.path.map(name => nodeCoordinates[name]));
        map.fitBounds(bounds, { padding: [50, 50] });

        console.log('🚨 Route calculated to incident location');
        console.log('Path:', result.path.join(' → '));
        console.log('Total distance:', result.distance.toFixed(3), 'km');
        console.log('Connected to nodes:', connectToNodes.map(n => n.name).join(', '));
      })();
      true;
    `;

    if (Platform.OS === 'web') {
      // For web, execute directly in iframe
      const iframe = document.querySelector('iframe[title="Map"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EXECUTE_SCRIPT', script: navigationScript }, '*');
      }
    } else {
      // For React Native WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(navigationScript);
      }
    }

    setSelectedDestination(`Navigating to ${incident.fullname || incident.username}`);
  };

  const handleResolveIncident = async (sosId, username) => {
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

      // Remove from active list immediately
      setIncidents(incidents.filter(inc => inc._id !== sosId));

      // Show success message
      if (Platform.OS === 'web') {
        alert(`Emergency resolved for ${username}`);
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
      if (Platform.OS === 'web') {
        alert('Failed to resolve emergency. Please try again.');
      }
    }
  };

  const renderIncidentList = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#007AFF" />;
    }

    if (incidents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcon name="check-circle" size={60} color="#4CAF50" />
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
          onPress={() => handleIncidentPress(incident)}
        >
          <View style={styles.incidentHeader}>
            <View style={styles.incidentIcon}>
              <Icon name="add-alert" size={24} color="#f44336" />
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
                <MaterialIcon name="person-pin" size={20} color="#393E46" />
              </View>
            </View>
            <Text style={styles.detailText}>@{incident.username || 'unknown'}</Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="location-on" size={20} color="#e91e63" />
              </View>
            </View>
            <Text style={styles.detailText} numberOfLines={2}>
              {address}
            </Text>
          </View>

          <View style={styles.incidentDetail}>
            <View style={styles.iconContainer}>
              <View style={styles.detailIcon}>
                <MaterialIcon name="my-location" size={20} color="#2196F3" />
              </View>
            </View>
            <Text style={styles.detailText}>
              {incident.latitude?.toFixed(6) || 'N/A'}, {incident.longitude?.toFixed(6) || 'N/A'}
            </Text>
          </View>

          <View style={styles.incidentActions}>
            <TouchableOpacity
              style={[styles.miniAction, styles.navigateAction]}
              onPress={() => handleNavigateToIncident(incident)}
            >
              <MaterialIcon name="navigation" size={16} color="#2196F3" />
              <Text style={[styles.miniActionText, styles.navigateActionText]}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.miniAction, styles.resolveAction]}
              onPress={() => handleResolveIncident(incident._id, incident.username)}
            >
              <MaterialIcon name="check-circle" size={16} color="#4CAF50" />
              <Text style={[styles.miniActionText, styles.resolveActionText]}>Resolve</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <ArrowBackIcon style={{ fontSize: 28, color: '#007AFF' }} />
          </TouchableOpacity>
          <View style={styles.titleIconContainer}>
            <NavigationOutlinedIcon style={{ fontSize: 40, color: 'blue' }} />
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
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.incidentsHeaderContainer}>
          <View style={styles.incidentsHeaderIcon}>
            <Icon name="add-alert" size={30} color="#f44336" />
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
                  color="#007AFF"
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

        <View style={styles.bottomContainer}>
          <View style={styles.bottomHeaderContainer}>
            <View style={styles.bottomHeaderIcon}>
              <Text style={styles.bottomHeaderIconText}>
                {selectedDestination ? '🧭' : '🆔'}
              </Text>
            </View>
            <Text style={styles.bottomText}>
              {selectedDestination ? 'Route Information' : 'Incident Details'}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoIconContainer}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>📌</Text>
              </View>
            </View>
            <Text style={styles.infoText}>
              {selectedDestination ? `Destination: ${selectedDestination}` : 'Location: Zone 4'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button}>
              <View style={styles.buttonIconContainer}>
                <MaterialIcon name="local-post-office" size={30} color="#fff" />
              </View>
              <Text style={styles.buttonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.callButton]}>
              <View style={styles.buttonIconContainer}>
                <MaterialIcon name="call" size={30} color="#FF0000" />
              </View>
              <Text style={styles.buttonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
  },
  // Left container styles
  leftContainer: {
    flex: 1,
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: '#fff',
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
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
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
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  incidentsHeaderIconText: {
    fontSize: 14,
  },
  incidentsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    flex: 1,
  },
  // Incident item styles
  listItem: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
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
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  incidentIconText: {
    fontSize: 14,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  incidentTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
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
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginLeft: 8,
  },
  miniActionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  navigateAction: {
    backgroundColor: '#E3F2FD',
  },
  navigateActionText: {
    color: '#2196F3',
  },
  resolveAction: {
    backgroundColor: '#E8F5E9',
  },
  resolveActionText: {
    color: '#4CAF50',
  },
  // Right container styles
  rightContainer: {
    flex: 2,
    padding: 15,
  },
  mapContainer: {
    flex: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#e1e4e8',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
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
  // Bottom container styles
  bottomContainer: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  bottomHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bottomHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bottomHeaderIconText: {
    fontSize: 16,
  },
  bottomText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIconContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconText: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
    paddingLeft: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  callButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  buttonIconContainer: {
    marginRight: 6,
  },
  buttonIcon: {
    fontSize: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  subText: {
    fontSize: 14,
    color: '#555',
  },
});

export default NavigationScreen;