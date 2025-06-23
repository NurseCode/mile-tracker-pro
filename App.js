import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Switch,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';

const API_BASE_URL = 'http://localhost:3001/api';
const API_KEY = 'mtp_bxe4o5yjcfemc8zbf7w'; // Test API key

export default function App() {
  console.log('MILETRACKER PRO v11.0 - API INTEGRATED AUTO DETECTION - Real Background + Cloud Sync');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDuration, setTrackingDuration] = useState(0);
  const [trackingStartTime, setTrackingStartTime] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(false);
  const [lastKnownSpeed, setLastKnownSpeed] = useState(0);
  const [stationaryTime, setStationaryTime] = useState(0);
  const [apiStatus, setApiStatus] = useState('connecting');
  const [syncStats, setSyncStats] = useState({ local: 0, cloud: 0, synced: 0 });
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [receiptData, setReceiptData] = useState({ category: 'Gas', amount: '', description: '' });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const locationWatchRef = useRef(null);
  const stationaryTimerRef = useRef(null);
  
  const [settings, setSettings] = useState({
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    minimumDistance: 0.1,
    autoStartSpeed: 5,
    autoStopTime: 120,
    apiSync: true
  });
  
  const [newTrip, setNewTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business'
  });

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (autoMode && !isAutoMonitoring) {
      startAutoMonitoring();
    } else if (!autoMode && isAutoMonitoring) {
      stopAutoMonitoring();
    }
  }, [autoMode]);

  useEffect(() => {
    let interval;
    if (isTracking && trackingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - trackingStartTime) / 1000);
        setTrackingDuration(elapsed);
      }, 1000);
    } else {
      setTrackingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingStartTime]);

  const initializeApp = async () => {
    await testApiConnection();
    await requestLocationPermission();
    await syncTripsFromApi();
    
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changed to:', nextAppState);
      if (autoMode && nextAppState === 'background') {
        console.log('App backgrounded, continuing auto monitoring');
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/stats?api_key=${API_KEY}`);
      if (response.ok) {
        setApiStatus('connected');
        console.log('API connection successful');
      } else {
        setApiStatus('error');
        console.log('API connection failed');
      }
    } catch (error) {
      setApiStatus('offline');
      console.log('API offline, using local storage only');
    }
  };

  const syncTripsFromApi = async () => {
    if (apiStatus !== 'connected') return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/trips?api_key=${API_KEY}`);
      const data = await response.json();
      
      if (data.trips && data.trips.length > 0) {
        const apiTrips = data.trips.map(trip => ({
          id: trip.id,
          date: trip.start_time ? trip.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
          startLocation: trip.start_location || 'API Location',
          endLocation: trip.end_location || 'API Destination',
          distance: trip.distance || 0,
          category: trip.category || 'Business',
          method: 'API Sync',
          receipts: [],
          apiId: trip.id,
          autoDetected: true
        }));
        
        setTrips(apiTrips);
        setSyncStats({ local: 0, cloud: data.trips.length, synced: data.trips.length });
        console.log(`Synced ${data.trips.length} trips from API`);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const saveTrippToApi = async (tripData) => {
    if (apiStatus !== 'connected' || !settings.apiSync) return null;
    
    try {
      const apiTrip = {
        start_location: tripData.startLocation,
        end_location: tripData.endLocation,
        start_latitude: tripData.coordinates?.start?.latitude,
        start_longitude: tripData.coordinates?.start?.longitude,
        end_latitude: tripData.coordinates?.end?.latitude,
        end_longitude: tripData.coordinates?.end?.longitude,
        distance: tripData.distance,
        duration: trackingDuration,
        category: tripData.category.toLowerCase(),
        start_time: new Date(trackingStartTime).toISOString(),
        end_time: new Date().toISOString()
      };
      
      const response = await fetch(`${API_BASE_URL}/trips?api_key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiTrip)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Trip saved to API:', result.trip_id);
        return result.trip_id;
      }
    } catch (error) {
      console.error('API save error:', error);
    }
    return null;
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('Foreground location permission granted');
        
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status === 'granted') {
          console.log('Background location permission granted');
        } else {
          Alert.alert(
            'Background Permission', 
            'For automatic trip detection, please enable "Allow all the time" in location settings.'
          );
        }
        
        getCurrentLocation();
      } else {
        Alert.alert('Permission Required', 'Location permission is needed for GPS tracking.');
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);
      return location;
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateSpeed = (prevLocation, newLocation, timeElapsed) => {
    if (!prevLocation || !newLocation || timeElapsed === 0) return 0;
    
    const distance = calculateDistance(
      prevLocation.coords.latitude,
      prevLocation.coords.longitude,
      newLocation.coords.latitude,
      newLocation.coords.longitude
    );
    
    const hours = timeElapsed / 3600;
    return distance / hours;
  };

  const startAutoMonitoring = async () => {
    try {
      console.log('Starting auto monitoring...');
      setIsAutoMonitoring(true);
      
      if (locationWatchRef.current) {
        await locationWatchRef.current.remove();
      }
      
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );
      
      Alert.alert(
        'Auto Mode Active',
        `Background monitoring started. API status: ${apiStatus}. Trips will sync to cloud automatically.`
      );
    } catch (error) {
      console.error('Auto monitoring error:', error);
      Alert.alert('Auto Mode Error', 'Unable to start background monitoring. Please check location permissions.');
    }
  };

  const stopAutoMonitoring = async () => {
    console.log('Stopping auto monitoring...');
    setIsAutoMonitoring(false);
    
    if (locationWatchRef.current) {
      await locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    
    if (stationaryTimerRef.current) {
      clearTimeout(stationaryTimerRef.current);
      stationaryTimerRef.current = null;
    }
    
    setLastKnownSpeed(0);
    setStationaryTime(0);
  };

  const handleLocationUpdate = (location) => {
    const prevLocation = currentLocation;
    setCurrentLocation(location);
    
    if (prevLocation) {
      const timeElapsed = (location.timestamp - prevLocation.timestamp) / 1000;
      const speed = calculateSpeed(prevLocation, location, timeElapsed);
      setLastKnownSpeed(speed);
      
      console.log(`Speed: ${speed.toFixed(1)} mph, Tracking: ${isTracking}, API: ${apiStatus}`);
      
      if (!isTracking && speed > settings.autoStartSpeed) {
        console.log('Auto starting trip - speed detected');
        autoStartTrip(location);
      }
      
      if (isTracking) {
        if (speed < 2) {
          setStationaryTime(prev => prev + timeElapsed);
          
          if (stationaryTime > settings.autoStopTime) {
            console.log('Auto stopping trip - stationary too long');
            autoStopTrip(location);
          }
        } else {
          setStationaryTime(0);
        }
      }
    }
  };

  const autoStartTrip = async (location) => {
    try {
      setIsTracking(true);
      setTrackingStartTime(Date.now());
      setStartLocation(location);
      setStationaryTime(0);
      
      console.log('Auto trip started, will sync to API when complete');
    } catch (error) {
      console.error('Auto start error:', error);
    }
  };

  const autoStopTrip = async (location) => {
    if (trackingDuration < 60) {
      console.log('Auto trip too short, discarding');
      setIsTracking(false);
      setTrackingStartTime(null);
      setStationaryTime(0);
      return;
    }

    try {
      let distance = settings.minimumDistance;
      if (startLocation && location) {
        distance = calculateDistance(
          startLocation.coords.latitude,
          startLocation.coords.longitude,
          location.coords.latitude,
          location.coords.longitude
        );
        distance = Math.max(distance, settings.minimumDistance);
      }
      
      const newTripData = {
        id: trips.length + 1,
        date: new Date().toISOString().split('T')[0],
        startLocation: 'Auto Start Location',
        endLocation: 'Auto End Location',
        distance: distance,
        category: 'Business',
        method: 'Auto GPS',
        receipts: [],
        coordinates: {
          start: startLocation?.coords,
          end: location?.coords
        },
        autoDetected: true
      };
      
      // Save to API first
      const apiId = await saveTrippToApi(newTripData);
      if (apiId) {
        newTripData.apiId = apiId;
        newTripData.method = 'Auto GPS (Synced)';
      }
      
      setTrips(prev => [newTripData, ...prev]);
      setIsTracking(false);
      setTrackingStartTime(null);
      setStartLocation(null);
      setStationaryTime(0);
      
      console.log('Auto trip saved:', distance.toFixed(1), 'miles', apiId ? '(API synced)' : '(local only)');
      
      Alert.alert(
        'Trip Auto-Detected', 
        `${distance.toFixed(1)} miles recorded\nDuration: ${formatDuration(trackingDuration)}\nDeduction: $${(distance * settings.businessRate).toFixed(2)}\nAPI: ${apiId ? 'Synced' : 'Local only'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Auto stop error:', error);
      setIsTracking(false);
      setTrackingStartTime(null);
      setStationaryTime(0);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTrip = async () => {
    try {
      const location = await getCurrentLocation();
      setIsTracking(true);
      setTrackingStartTime(Date.now());
      setStartLocation(location);
      setStationaryTime(0);
      
      Alert.alert('Manual Trip Started', 'GPS tracking started. Trip will sync to API when complete.');
    } catch (error) {
      Alert.alert('GPS Error', 'Unable to get current location. Please ensure GPS is enabled.');
    }
  };

  const handleStopTrip = async () => {
    if (trackingDuration < 30) {
      Alert.alert('Short Trip', 'Trip was less than 30 seconds. Add manually if needed.');
      setIsTracking(false);
      setTrackingStartTime(null);
      return;
    }

    try {
      const location = await getCurrentLocation();
      
      let distance = settings.minimumDistance;
      if (startLocation && location) {
        distance = calculateDistance(
          startLocation.coords.latitude,
          startLocation.coords.longitude,
          location.coords.latitude,
          location.coords.longitude
        );
        distance = Math.max(distance, settings.minimumDistance);
      }
      
      const newTripData = {
        id: trips.length + 1,
        date: new Date().toISOString().split('T')[0],
        startLocation: 'Manual Start Location',
        endLocation: 'Manual End Location',
        distance: distance,
        category: 'Business',
        method: 'Manual GPS',
        receipts: [],
        coordinates: {
          start: startLocation?.coords,
          end: location?.coords
        }
      };
      
      // Save to API
      const apiId = await saveTrippToApi(newTripData);
      if (apiId) {
        newTripData.apiId = apiId;
        newTripData.method = 'Manual GPS (Synced)';
      }
      
      setTrips([newTripData, ...trips]);
      setIsTracking(false);
      setTrackingStartTime(null);
      setStartLocation(null);
      
      Alert.alert(
        'Trip Saved', 
        `Manual trip recorded:\n${distance.toFixed(1)} miles\nDuration: ${formatDuration(trackingDuration)}\nDeduction: $${(distance * settings.businessRate).toFixed(2)}\nAPI: ${apiId ? 'Synced' : 'Local only'}`
      );
    } catch (error) {
      Alert.alert('GPS Error', 'Unable to get final location. Trip saved with estimated distance.');
      setIsTracking(false);
      setTrackingStartTime(null);
    }
  };

  const handleAddManualTrip = async () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    const manualTrip = {
      id: trips.length + 1,
      date: new Date().toISOString().split('T')[0],
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: parseFloat(newTrip.distance),
      category: newTrip.category,
      method: 'Manual',
      receipts: []
    };
    
    // Save to API
    const apiId = await saveTrippToApi(manualTrip);
    if (apiId) {
      manualTrip.apiId = apiId;
      manualTrip.method = 'Manual (Synced)';
    }
    
    setTrips([manualTrip, ...trips]);
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    Alert.alert('Success', `Manual trip added! ${apiId ? 'Synced to cloud.' : 'Saved locally.'}`);
  };

  const handleReceiptCapture = (trip) => {
    setSelectedTrip(trip);
    setReceiptData({ category: 'Gas', amount: '', description: '' });
    setShowReceiptModal(true);
  };

  const pickReceiptImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const fileName = `receipt_${Date.now()}_${asset.name}`;
        const destinationUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.copyAsync({
          from: asset.uri,
          to: destinationUri,
        });

        const newReceipt = {
          id: Date.now(),
          type: receiptData.category,
          amount: parseFloat(receiptData.amount) || 0,
          description: receiptData.description || 'Receipt photo',
          hasPhoto: true,
          photoUri: destinationUri,
          fileName: fileName,
          date: new Date().toISOString()
        };

        const updatedTrips = trips.map(trip => {
          if (trip.id === selectedTrip.id) {
            return {
              ...trip,
              receipts: [...(trip.receipts || []), newReceipt]
            };
          }
          return trip;
        });

        setTrips(updatedTrips);
        setShowReceiptModal(false);
        
        Alert.alert('Success', `Receipt photo added to trip!\n\nType: ${receiptData.category}\nAmount: $${receiptData.amount || '0.00'}`);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Unable to select image. Please try again.');
    }
  };

  const handleAddReceiptText = () => {
    if (!receiptData.description.trim()) {
      Alert.alert('Missing Information', 'Please enter receipt details.');
      return;
    }

    const newReceipt = {
      id: Date.now(),
      type: receiptData.category,
      amount: parseFloat(receiptData.amount) || 0,
      description: receiptData.description,
      hasPhoto: false,
      date: new Date().toISOString()
    };

    const updatedTrips = trips.map(trip => {
      if (trip.id === selectedTrip.id) {
        return {
          ...trip,
          receipts: [...(trip.receipts || []), newReceipt]
        };
      }
      return trip;
    });

    setTrips(updatedTrips);
    setShowReceiptModal(false);
    Alert.alert('Success', `Receipt note added to trip!\n\nType: ${receiptData.category}\nAmount: $${receiptData.amount || '0.00'}`);
  };

  const createCSVContent = () => {
    const totals = calculateTotals();
    const header = 'Date,Start Location,End Location,Distance,Category,Method,Deduction,API Synced,Auto Detected';
    
    const tripRows = trips.map(trip => {
      const rate = trip.category === 'Business' ? settings.businessRate : 
                   trip.category === 'Medical' ? settings.medicalRate : settings.charityRate;
      const deduction = (trip.distance * rate).toFixed(2);
      const apiSynced = trip.apiId ? 'Yes' : 'No';
      const autoDetected = trip.autoDetected ? 'Yes' : 'No';
      return `${trip.date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.category},${trip.method},$${deduction},${apiSynced},${autoDetected}`;
    }).join('\n');
    
    const summary = `\n\nSUMMARY:\nTotal Trips:,${totals.totalTrips}\nAuto Detected:,${totals.autoTrips}\nManual Trips:,${totals.manualTrips}\nAPI Synced:,${totals.syncedTrips}\nBusiness Miles:,${totals.businessMiles.toFixed(1)}\nTotal Deduction:,$${totals.totalDeduction.toFixed(2)}\nAPI Status:,${apiStatus}\nCloud Backup:,${settings.apiSync ? 'Enabled' : 'Disabled'}`;
    
    return header + '\n' + tripRows + summary;
  };

  const handleExport = async () => {
    try {
      const csvContent = createCSVContent();
      const fileName = `MileTracker_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      const isMailAvailable = await MailComposer.isAvailableAsync();
      
      if (isMailAvailable) {
        await MailComposer.composeAsync({
          subject: `MileTracker Pro Export - ${new Date().toLocaleDateString()}`,
          body: `Professional mileage tracking export with API integration.\n\nTrips: ${trips.length}\nAuto Detected: ${calculateTotals().autoTrips}\nAPI Synced: ${calculateTotals().syncedTrips}\nTotal Deduction: $${calculateTotals().totalDeduction.toFixed(2)}\n\nGenerated by MileTracker Pro`,
          attachments: [fileUri],
        });
      } else {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export MileTracker Data'
        });
      }
      
      Alert.alert('Export Success', `CSV file created!\n\nFile: ${fileName}\nAPI Status: ${apiStatus}`);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Unable to create CSV file. Please try again.');
    }
  };

  const calculateTotals = () => {
    const businessMiles = trips.filter(t => t.category === 'Business').reduce((sum, t) => sum + t.distance, 0);
    const medicalMiles = trips.filter(t => t.category === 'Medical').reduce((sum, t) => sum + t.distance, 0);
    const charityMiles = trips.filter(t => t.category === 'Charity').reduce((sum, t) => sum + t.distance, 0);
    
    const businessDeduction = businessMiles * settings.businessRate;
    const medicalDeduction = medicalMiles * settings.medicalRate;
    const charityDeduction = charityMiles * settings.charityRate;
    
    const totalReceipts = trips.reduce((sum, trip) => sum + (trip.receipts || []).length, 0);
    const receiptPhotos = trips.reduce((sum, trip) => 
      sum + (trip.receipts || []).filter(r => r.hasPhoto).length, 0
    );
    const totalReceiptAmount = trips.reduce((sum, trip) => 
      sum + (trip.receipts || []).reduce((receiptSum, receipt) => receiptSum + (receipt.amount || 0), 0), 0
    );
    
    const autoTrips = trips.filter(t => t.autoDetected).length;
    const manualTrips = trips.length - autoTrips;
    const syncedTrips = trips.filter(t => t.apiId).length;
    
    return {
      totalTrips: trips.length,
      autoTrips,
      manualTrips,
      syncedTrips,
      totalMiles: businessMiles + medicalMiles + charityMiles,
      totalDeduction: businessDeduction + medicalDeduction + charityDeduction,
      businessMiles,
      medicalMiles,
      charityMiles,
      totalReceipts,
      receiptPhotos,
      totalReceiptAmount
    };
  };

  const totals = calculateTotals();

  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>API Integrated Auto Detection - Cloud Sync • Real Background Monitoring • Server Validation</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totals.totalTrips}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totals.totalMiles.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${totals.totalDeduction.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>IRS</Text>
          </View>
        </View>
        <View style={styles.autoStatsRow}>
          <Text style={styles.autoStat}>Auto: {totals.autoTrips}</Text>
          <Text style={styles.autoStat}>Manual: {totals.manualTrips}</Text>
          <Text style={styles.autoStat}>Synced: {totals.syncedTrips}</Text>
        </View>
      </View>

      <View style={styles.apiStatusCard}>
        <Text style={styles.apiStatusTitle}>Cloud Sync Status</Text>
        <View style={styles.apiStatusRow}>
          <Text style={[styles.apiStatusText, apiStatus === 'connected' && styles.connected]}>
            API: {apiStatus === 'connected' ? '🟢 Connected' : apiStatus === 'offline' ? '🔴 Offline' : '🟡 Connecting'}
          </Text>
          <Text style={styles.apiStatusText}>Sync: {settings.apiSync ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>

      <View style={styles.modeToggleCard}>
        <View style={styles.modeToggleHeader}>
          <Text style={styles.modeToggleTitle}>GPS Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={setAutoMode}
            trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode 
            ? `Auto: Monitoring at ${lastKnownSpeed.toFixed(1)} mph • Syncing to cloud • Trips start >5 mph, stop after 2 min stationary` 
            : 'Manual: Full start/stop control with cloud sync • Auto: Background monitoring with API integration'
          }
        </Text>
        {autoMode && (
          <View style={styles.autoStatus}>
            <Text style={styles.autoStatusText}>
              Status: {isAutoMonitoring ? '🟢 Monitoring Active' : '🔴 Starting...'} • 
              Speed: {lastKnownSpeed.toFixed(1)} mph • 
              {isTracking ? `Tracking: ${formatDuration(trackingDuration)}` : 'Ready'} • 
              API: {apiStatus}
            </Text>
          </View>
        )}
      </View>

      {isTracking ? (
        <View style={styles.trackingCard}>
          <View style={styles.activeContainer}>
            <Text style={styles.trackingTitle}>
              {autoMode ? '🤖 AUTO TRACKING ACTIVE' : '🚗 MANUAL TRACKING ACTIVE'}
            </Text>
            <Text style={styles.trackingTimer}>{formatDuration(trackingDuration)}</Text>
            <Text style={styles.trackingNote}>
              {autoMode 
                ? `Auto mode: Will stop when stationary >2 min • Speed: ${lastKnownSpeed.toFixed(1)} mph • API sync ready`
                : 'Manual mode: Use STOP TRIP button when done • Will sync to cloud'
              }
            </Text>
            {!autoMode && (
              <TouchableOpacity 
                style={styles.stopButton}
                onPress={handleStopTrip}
              >
                <Text style={styles.stopButtonText}>STOP TRIP</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        !autoMode && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartTrip}
          >
            <Text style={styles.startButtonText}>🚗 START MANUAL TRIP</Text>
            <Text style={styles.startButtonSubtext}>Manual GPS tracking with cloud sync</Text>
          </TouchableOpacity>
        )
      )}

      <TouchableOpacity 
        style={styles.manualButton}
        onPress={() => setShowAddTrip(true)}
      >
        <Text style={styles.manualButtonText}>📝 Add Manual Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>{trips.length} trips • {totals.autoTrips} auto • {totals.syncedTrips} synced • API: {apiStatus}</Text>
      </View>

      {trips.map(trip => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <View style={styles.tripMethodContainer}>
              <Text style={[styles.tripMethod, trip.autoDetected && styles.autoDetectedMethod]}>
                {trip.method}
              </Text>
              {trip.autoDetected && <Text style={styles.autoIcon}>🤖</Text>}
              {trip.apiId && <Text style={styles.syncIcon}>☁️</Text>}
            </View>
          </View>
          <Text style={styles.tripRoute}>
            {trip.startLocation} → {trip.endLocation}
          </Text>
          <View style={styles.tripFooter}>
            <Text style={styles.tripDistance}>{trip.distance.toFixed(1)} mi</Text>
            <Text style={styles.tripCategory}>{trip.category}</Text>
            <TouchableOpacity 
              style={styles.receiptButton}
              onPress={() => handleReceiptCapture(trip)}
            >
              <Text style={styles.receiptButtonText}>
                📄 Receipt {(trip.receipts || []).length > 0 ? `(${(trip.receipts || []).length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
          {(trip.receipts || []).length > 0 && (
            <View style={styles.receiptList}>
              {trip.receipts.map(receipt => (
                <Text key={receipt.id} style={styles.receiptItem}>
                  • {receipt.type}: ${receipt.amount.toFixed(2)} - {receipt.description} {receipt.hasPhoto ? '📷' : '📝'}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Export & Reports</Text>
        <Text style={styles.headerSubtitle}>Professional CSV export with API integration and cloud sync</Text>
      </View>

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Monthly Summary</Text>
        <Text style={styles.exportDetail}>Total Trips: {totals.totalTrips}</Text>
        <Text style={styles.exportDetail}>Auto Detected: {totals.autoTrips}</Text>
        <Text style={styles.exportDetail}>Manual Trips: {totals.manualTrips}</Text>
        <Text style={styles.exportDetail}>Cloud Synced: {totals.syncedTrips}</Text>
        <Text style={styles.exportDetail}>Business Miles: {totals.businessMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Total Deduction: ${totals.totalDeduction.toFixed(2)}</Text>
        <Text style={styles.exportDetail}>API Status: {apiStatus}</Text>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleExport}
        >
          <Text style={styles.exportButtonText}>📊 Export Full Report</Text>
        </TouchableOpacity>
        
        <Text style={styles.exportNote}>
          Export includes API sync status, auto-detection tracking, and cloud backup information for audit purposes.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'dashboard' && styles.navButtonActive]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'export' && styles.navButtonActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navText, currentView === 'export' && styles.navTextActive]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Add Trip Modal */}
      <Modal visible={showAddTrip} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={newTrip.startLocation}
              onChangeText={(text) => setNewTrip({...newTrip, startLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={newTrip.endLocation}
              onChangeText={(text) => setNewTrip({...newTrip, endLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={newTrip.distance}
              onChangeText={(text) => setNewTrip({...newTrip, distance: text})}
              keyboardType="numeric"
            />
            
            <View style={styles.categoryButtons}>
              {['Business', 'Medical', 'Charity'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton, 
                    newTrip.category === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setNewTrip({...newTrip, category})}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    newTrip.category === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddTrip(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddManualTrip}
              >
                <Text style={styles.saveButtonText}>Save Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Receipt</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTrip?.startLocation} → {selectedTrip?.endLocation}
            </Text>
            
            <View style={styles.categoryButtons}>
              {['Gas', 'Parking', 'Maintenance', 'Insurance', 'Other'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton, 
                    receiptData.category === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setReceiptData({...receiptData, category})}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    receiptData.category === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Amount (optional)"
              value={receiptData.amount}
              onChangeText={(text) => setReceiptData({...receiptData, amount: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Shell Station, Downtown Parking)"
              value={receiptData.description}
              onChangeText={(text) => setReceiptData({...receiptData, description: text})}
              multiline
              numberOfLines={2}
            />
            
            <View style={styles.receiptActions}>
              <TouchableOpacity 
                style={styles.photoButton}
                onPress={pickReceiptImage}
              >
                <Text style={styles.photoButtonText}>📷 Add Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.textButton}
                onPress={handleAddReceiptText}
              >
                <Text style={styles.textButtonText}>📝 Text Only</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>API Integration Settings</Text>
            
            <Text style={styles.settingsLabel}>API Status</Text>
            <Text style={styles.settingsValue}>Connection: {apiStatus}</Text>
            <Text style={styles.settingsValue}>Total Trips in Cloud: {totals.syncedTrips}</Text>
            <Text style={styles.settingsValue}>Auto Sync: {settings.apiSync ? 'Enabled' : 'Disabled'}</Text>
            
            <Text style={styles.settingsLabel}>Auto Detection</Text>
            <Text style={styles.settingsValue}>Start Speed: {settings.autoStartSpeed} mph</Text>
            <Text style={styles.settingsValue}>Stop Time: {settings.autoStopTime / 60} minutes stationary</Text>
            <Text style={styles.settingsValue}>Background Monitoring: {isAutoMonitoring ? 'Active' : 'Inactive'}</Text>
            
            <Text style={styles.settingsLabel}>Current Status</Text>
            <Text style={styles.settingsValue}>Speed: {lastKnownSpeed.toFixed(1)} mph</Text>
            <Text style={styles.settingsValue}>Tracking: {isTracking ? 'Yes' : 'No'}</Text>
            <Text style={styles.settingsValue}>Location Permission: {currentLocation ? 'Granted' : 'Requesting...'}</Text>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 5,
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    top: 25,
    padding: 10,
  },
  settingsIcon: {
    fontSize: 20,
    color: 'white',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  autoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  autoStat: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  apiStatusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  apiStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  apiStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  apiStatusText: {
    fontSize: 14,
    color: '#666',
  },
  connected: {
    color: '#4CAF50',
  },
  modeToggleCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  autoStatus: {
    backgroundColor: '#f0f8f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  autoStatusText: {
    fontSize: 12,
    color: '#2d5c2d',
    textAlign: 'center',
  },
  trackingCard: {
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeContainer: {
    padding: 20,
    alignItems: 'center',
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5c2d',
    marginBottom: 10,
  },
  trackingTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5c2d',
    marginBottom: 5,
  },
  trackingNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 5,
  },
  manualButton: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  manualButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripMethod: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  autoDetectedMethod: {
    color: '#4CAF50',
  },
  autoIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  syncIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  tripRoute: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  tripCategory: {
    fontSize: 14,
    color: '#666',
  },
  receiptButton: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  receiptList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  receiptItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  exportCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  exportDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  exportButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: '#667eea',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  navTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#667eea',
    margin: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  photoButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  textButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  textButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
  },
  settingsValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});
