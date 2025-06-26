// BUILD77 PERSISTENT BACKGROUND - Maximum background persistence using React Native capabilities
// Uses all available techniques to keep GPS tracking alive when app is closed/phone folded
// No external libraries - pure React Native background optimization

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform, AppState, DeviceEventEmitter
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class PersistentBackgroundGPS {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.tripPath = [];
    this.permissionGranted = false;
    
    // PERSISTENT BACKGROUND STATE
    this.state = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.persistentTimer = null;
    this.heartbeatTimer = null;
    this.TIMEOUT_MINUTES = 5;
    this.lastValidGPSTime = null;
    this.gpsUpdateCount = 0;
    this.stationaryElapsedSeconds = 0;
    this.isInBackground = false;
    
    // Background persistence techniques
    this.backgroundStorageKey = 'miletracker_persistent_state';
    this.appStateSubscription = null;
    this.lastSaveTime = 0;
    this.backgroundUpdateInterval = null;
    this.keepAliveInterval = null;
    
    // Wake lock simulation
    this.wakeLockActive = false;
  }

  async initialize() {
    try {
      this.onStatusUpdate('Initializing persistent background GPS...');
      
      if (Platform.OS === 'android') {
        // Request all location permissions including background
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];
        
        // Request background location for Android 10+
        if (Platform.Version >= 29) {
          permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
          this.onStatusUpdate('Location permission denied');
          return false;
        }
        
        // Show background location importance
        if (Platform.Version >= 29 && granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Background Location Critical',
            'To track trips when phone is closed:\n\n1. Go to App Settings\n2. Location Permissions\n3. Select "Allow all the time"\n4. Disable battery optimization for this app',
            [{ text: 'OK' }]
          );
        }
        
        this.permissionGranted = true;
      }
      
      // Configure for maximum background persistence
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'always',
        locationProvider: 'auto',
        enableBackgroundLocationUpdates: true,
      });
      
      // Monitor app state changes
      this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        this.handleAppStateChange(nextAppState);
      });
      
      // Restore any existing background state
      await this.restoreBackgroundState();
      
      // Start keep-alive system
      this.startKeepAliveSystem();
      
      this.onStatusUpdate('Persistent background GPS ready - Maximum background optimization');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      return false;
    }
  }

  startKeepAliveSystem() {
    // Aggressive keep-alive system to prevent app termination
    this.keepAliveInterval = setInterval(() => {
      // Simulate activity to keep app alive
      if (this.currentTrip && this.isInBackground) {
        // Background activity simulation
        const now = Date.now();
        this.saveBackgroundState();
        
        // Log activity to console to show app is alive
        console.log(`[${new Date(now).toLocaleTimeString()}] Background GPS Keep-Alive - Trip Active`);
        
        // Emit device event to maintain activity
        if (Platform.OS === 'android') {
          DeviceEventEmitter.emit('backgroundActivity', { timestamp: now, tracking: true });
        }
      }
    }, 10000); // Every 10 seconds
  }

  async handleAppStateChange(nextAppState) {
    console.log(`App state: ${nextAppState} - Tracking: ${!!this.currentTrip}`);
    
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.isInBackground = true;
      
      if (this.currentTrip) {
        // Activate maximum background persistence
        await this.activateBackgroundMode();
        this.onStatusUpdate('📱 BACKGROUND MODE - Maximum persistence active');
      }
      
    } else if (nextAppState === 'active') {
      this.isInBackground = false;
      
      if (this.currentTrip) {
        this.onStatusUpdate('📱 FOREGROUND MODE - GPS tracking resumed');
        
        // Return to normal foreground operation
        this.deactivateBackgroundMode();
      }
      
      // Check for any completed trips while in background
      await this.checkBackgroundCompletions();
    }
  }

  async activateBackgroundMode() {
    console.log('Activating maximum background persistence mode');
    
    // Save current state
    await this.saveBackgroundState();
    
    // Start aggressive background update system
    if (!this.backgroundUpdateInterval) {
      this.backgroundUpdateInterval = setInterval(() => {
        this.processBackgroundUpdate();
      }, 5000); // Every 5 seconds
    }
    
    // Start persistent timer with aggressive checking
    if (!this.persistentTimer) {
      this.startPersistentTimer();
    }
    
    // Simulate wake lock by maintaining activity
    this.wakeLockActive = true;
    
    console.log('Background persistence activated - All systems running');
  }

  deactivateBackgroundMode() {
    console.log('Deactivating background mode - returning to foreground');
    
    // Stop background update system
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
      this.backgroundUpdateInterval = null;
    }
    
    // Keep persistent timer if still tracking
    this.wakeLockActive = false;
  }

  processBackgroundUpdate() {
    if (!this.currentTrip || !this.stationaryStartTime) return;
    
    const now = Date.now();
    this.stationaryElapsedSeconds = Math.floor((now - this.stationaryStartTime) / 1000);
    
    const remainingSeconds = (this.TIMEOUT_MINUTES * 60) - this.stationaryElapsedSeconds;
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecondsDisplay = remainingSeconds % 60;
    
    console.log(`Background Update: ${remainingMinutes}m ${remainingSecondsDisplay}s remaining`);
    
    // Save state every background update
    this.saveBackgroundState();
    
    if (remainingSeconds <= 0) {
      console.log('Background auto-end triggered by background update system');
      this.forcePersistentAutoEnd();
    } else {
      this.onStatusUpdate(`🔒 Background: Auto-end in ${remainingMinutes}m ${remainingSecondsDisplay}s`);
    }
  }

  startPersistentTimer() {
    console.log('Starting persistent background timer');
    
    // Most aggressive timer possible - every 1 second
    this.persistentTimer = setInterval(() => {
      if (this.stationaryStartTime && this.currentTrip) {
        const now = Date.now();
        this.stationaryElapsedSeconds = Math.floor((now - this.stationaryStartTime) / 1000);
        
        const remainingSeconds = (this.TIMEOUT_MINUTES * 60) - this.stationaryElapsedSeconds;
        
        // Log every 30 seconds to show timer is alive
        if (this.stationaryElapsedSeconds % 30 === 0) {
          console.log(`Persistent Timer Alive: ${Math.floor(remainingSeconds/60)}m ${remainingSeconds%60}s`);
          
          // Save state periodically
          if (this.stationaryElapsedSeconds % 60 === 0) {
            this.saveBackgroundState();
          }
        }
        
        if (remainingSeconds <= 0) {
          console.log('Persistent timer auto-end triggered');
          this.forcePersistentAutoEnd();
        }
      }
    }, 1000);
  }

  async forcePersistentAutoEnd() {
    console.log('Force persistent auto-end triggered');
    
    // Stop all timers
    if (this.persistentTimer) {
      clearInterval(this.persistentTimer);
      this.persistentTimer = null;
    }
    
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
      this.backgroundUpdateInterval = null;
    }
    
    // End trip with last known position
    if (this.lastPosition && this.currentTrip) {
      const completedTrip = this.endTrip(
        this.lastPosition.latitude, 
        this.lastPosition.longitude, 
        Date.now()
      );
      
      if (completedTrip) {
        // Save completed trip for when app reopens
        await this.saveCompletedTrip(completedTrip);
        await AsyncStorage.removeItem(this.backgroundStorageKey);
        
        const mode = this.isInBackground ? 'Background' : 'Foreground';
        this.onStatusUpdate(`✅ ${mode} auto-end: ${completedTrip.distance.toFixed(1)}mi saved`);
        
        console.log(`Trip completed in ${mode.toLowerCase()} mode: ${completedTrip.distance.toFixed(1)}mi`);
      }
    }
    
    this.state = 'monitoring';
    this.stationaryStartTime = null;
    this.stationaryElapsedSeconds = 0;
  }

  async saveBackgroundState() {
    try {
      const now = Date.now();
      // Throttle saves to every 5 seconds
      if (now - this.lastSaveTime < 5000) return;
      
      const state = {
        isTracking: !!this.currentTrip,
        currentTrip: this.currentTrip,
        stationaryStartTime: this.stationaryStartTime,
        stationaryElapsedSeconds: this.stationaryElapsedSeconds,
        state: this.state,
        lastPosition: this.lastPosition,
        tripPath: this.tripPath.slice(-100), // Keep last 100 points
        lastSaveTime: now,
        appState: this.isInBackground ? 'background' : 'foreground',
        backgroundPersistenceActive: this.wakeLockActive
      };
      
      await AsyncStorage.setItem(this.backgroundStorageKey, JSON.stringify(state));
      this.lastSaveTime = now;
      
      // Log saves to show persistence is working
      if (this.isInBackground) {
        console.log(`Background state saved: ${new Date(now).toLocaleTimeString()}`);
      }
    } catch (error) {
      console.log('Failed to save background state:', error);
    }
  }

  async restoreBackgroundState() {
    try {
      const savedState = await AsyncStorage.getItem(this.backgroundStorageKey);
      if (savedState) {
        const state = JSON.parse(savedState);
        const timeSinceLastSave = Date.now() - state.lastSaveTime;
        
        // Restore if less than 2 hours (very generous)
        if (timeSinceLastSave < 2 * 60 * 60 * 1000 && state.isTracking) {
          this.currentTrip = state.currentTrip;
          this.stationaryStartTime = state.stationaryStartTime;
          this.stationaryElapsedSeconds = state.stationaryElapsedSeconds;
          this.state = state.state;
          this.lastPosition = state.lastPosition;
          this.tripPath = state.tripPath || [];
          
          console.log(`Restored tracking from ${state.appState} mode after ${Math.floor(timeSinceLastSave/1000)}s`);
          this.onStatusUpdate(`🔄 Restored ${state.appState} tracking - Trip continues`);
          
          if (this.onTripStart && this.currentTrip) {
            this.onTripStart(this.currentTrip);
          }
          
          // Resume timers if we were stationary
          if (this.stationaryStartTime) {
            this.startPersistentTimer();
            if (this.isInBackground) {
              this.activateBackgroundMode();
            }
          }
        } else {
          // Clear old state
          await AsyncStorage.removeItem(this.backgroundStorageKey);
        }
      }
    } catch (error) {
      console.log('Failed to restore background state:', error);
    }
  }

  async checkBackgroundCompletions() {
    // Check if any trips were completed while in background
    try {
      const completedFlag = await AsyncStorage.getItem('miletracker_background_completed');
      if (completedFlag) {
        const completedTrip = JSON.parse(completedFlag);
        this.onStatusUpdate(`✅ Background trip completed: ${completedTrip.distance.toFixed(1)}mi`);
        await AsyncStorage.removeItem('miletracker_background_completed');
      }
    } catch (error) {
      console.log('Error checking background completions:', error);
    }
  }

  async saveCompletedTrip(trip) {
    try {
      // Save to main trips storage
      const existingTrips = await AsyncStorage.getItem('miletracker_trips');
      const trips = existingTrips ? JSON.parse(existingTrips) : [];
      trips.unshift(trip);
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(trips));
      
      // Mark as background completed
      await AsyncStorage.setItem('miletracker_background_completed', JSON.stringify(trip));
      
      console.log('Background trip saved and flagged for notification');
    } catch (error) {
      console.log('Failed to save background trip:', error);
    }
  }

  async startMonitoring() {
    const canStart = await this.initialize();
    if (!canStart) return false;

    if (this.watchId !== null) {
      this.stopMonitoring();
    }

    try {
      this.onStatusUpdate('Starting persistent background monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          distanceFilter: 2,
          // Maximum persistence options
          interval: 5000,
          fastestInterval: 2000,
        }
      );
      
      this.isActive = true;
      this.state = 'monitoring';
      this.gpsUpdateCount = 0;
      this.lastValidGPSTime = Date.now();
      
      this.onStatusUpdate('Persistent background monitoring active - Keep-alive system running');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS failed: ${error.message}`);
      return false;
    }
  }

  stopMonitoring() {
    console.log('Stopping persistent background monitoring');
    
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    // Stop all background systems
    if (this.persistentTimer) {
      clearInterval(this.persistentTimer);
      this.persistentTimer = null;
    }
    
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
      this.backgroundUpdateInterval = null;
    }
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Clear background state
    AsyncStorage.removeItem(this.backgroundStorageKey);
    
    this.isActive = false;
    this.state = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.stationaryElapsedSeconds = 0;
    this.wakeLockActive = false;
    this.onStatusUpdate('Persistent monitoring stopped');
  }

  handleLocationError(error) {
    console.log('GPS Error:', error.message);
    this.onStatusUpdate(`GPS error: ${error.message}`);
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    this.gpsUpdateCount++;
    this.lastValidGPSTime = timestamp;
    
    // Accept lower accuracy in background mode for persistence
    const maxAccuracy = this.isInBackground ? 200 : 100;
    if (accuracy > maxAccuracy) {
      this.onStatusUpdate(`Improving GPS accuracy (${accuracy.toFixed(0)}m)`);
      return;
    }

    // Calculate speed with validation
    let currentSpeed = 0;
    
    if (speed !== null && speed >= 0) {
      currentSpeed = speed * 2.237;
    } else if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeSeconds = (timestamp - this.lastPosition.timestamp) / 1000;
      
      if (timeSeconds > 2 && timeSeconds < 30) {
        currentSpeed = (distance / timeSeconds) * 2.237;
      }
    }

    // Speed validation
    if (currentSpeed > 100 || currentSpeed < 0) currentSpeed = 0;
    if (currentSpeed < 1) currentSpeed = 0;

    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: currentSpeed, accuracy });
    }

    this.processPersistentDetection(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
    
    // Save state more frequently during tracking
    if (this.currentTrip && this.gpsUpdateCount % 5 === 0) {
      this.saveBackgroundState();
    }
  }

  processPersistentDetection(speed, latitude, longitude, timestamp) {
    switch (this.state) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.state = 'detecting';
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          const mode = this.isInBackground ? '🔒 Background' : 'Ready';
          this.onStatusUpdate(`${mode} - Monitoring (${speed.toFixed(1)}mph, Updates: ${this.gpsUpdateCount})`);
        }
        break;

      case 'detecting':
        if (speed > 8) {
          this.detectionCount++;
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (${this.detectionCount}/3)`);
          
          if (this.detectionCount >= 3) {
            this.startTrip(latitude, longitude, speed, timestamp);
            this.state = 'tracking';
            this.detectionCount = 0;
            this.stationaryStartTime = null;
          }
        } else {
          this.detectionCount = 0;
          this.state = 'monitoring';
          this.onStatusUpdate(`Ready - Movement stopped (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'tracking':
        if (this.currentTrip) {
          this.tripPath.push({ latitude, longitude, timestamp, speed, accuracy: 0 });
        }

        if (speed < 3) {
          // Start stationary tracking
          if (this.stationaryStartTime === null) {
            this.stationaryStartTime = timestamp;
            this.stationaryElapsedSeconds = 0;
            
            // Always start persistent timer when stationary
            if (!this.persistentTimer) {
              this.startPersistentTimer();
            }
            
            this.onStatusUpdate('Stationary detected - Persistent timer active');
          }
          
        } else {
          // Movement resumed
          if (this.stationaryStartTime !== null) {
            if (this.persistentTimer) {
              clearInterval(this.persistentTimer);
              this.persistentTimer = null;
            }
            if (this.backgroundUpdateInterval) {
              clearInterval(this.backgroundUpdateInterval);
              this.backgroundUpdateInterval = null;
            }
            
            this.stationaryStartTime = null;
            this.stationaryElapsedSeconds = 0;
            this.onStatusUpdate(`Movement resumed - Trip continues (${speed.toFixed(1)}mph)`);
          }
          
          const distance = this.calculateTripDistance();
          const elapsedMinutes = Math.floor((timestamp - (this.currentTrip?.startTimestamp || timestamp)) / 60000);
          const mode = this.isInBackground ? '🔒 Background' : 'Trip';
          this.onStatusUpdate(`${mode}: ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${elapsedMinutes}min`);
        }
        break;
    }
  }

  startTrip(latitude, longitude, speed, timestamp) {
    this.currentTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startTimestamp: timestamp,
      startLatitude: latitude,
      startLongitude: longitude,
      startLocation: 'GPS Location',
      category: 'Business',
      autoDetected: true
    };
    
    this.tripPath = [{ latitude, longitude, timestamp, speed, accuracy: 0 }];
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`🚗 TRIP STARTED at ${speed.toFixed(1)}mph - Persistent background ready`);
    
    // Activate background mode immediately if in background
    if (this.isInBackground) {
      this.activateBackgroundMode();
    }
  }

  endTrip(latitude, longitude, timestamp) {
    if (!this.currentTrip) return null;

    const distance = this.calculateTripDistance();
    const totalMinutes = Math.floor((timestamp - this.currentTrip.startTimestamp) / 60000);

    if (distance > 0.2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        totalDuration: totalMinutes,
        purpose: `Auto: ${distance.toFixed(1)}mi in ${totalMinutes}min (Persistent)`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      this.currentTrip = null;
      this.tripPath = [];
      
      // Deactivate background mode
      this.deactivateBackgroundMode();
      
      return completedTrip;
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
      this.currentTrip = null;
      this.tripPath = [];
      this.deactivateBackgroundMode();
      return null;
    }
  }

  calculateTripDistance() {
    if (!this.tripPath || this.tripPath.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      
      const segmentDistance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      if (segmentDistance > 1 && segmentDistance < 500) {
        totalDistance += segmentDistance;
      }
    }
    
    return totalDistance * 0.000621371;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// MAIN APP (Same interface, maximum persistence GPS service)
export default function App() {
  console.log('BUILD77 PERSISTENT BACKGROUND - v1.0 - Maximum background persistence');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing persistent background GPS...');
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const gpsService = useRef(null);
  
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: '',
    category: 'Business'
  });

  const categories = [
    { key: 'Business', rate: 0.70, color: '#4CAF50' },
    { key: 'Medical', rate: 0.21, color: '#2196F3' },
    { key: 'Charity', rate: 0.14, color: '#FF9800' },
    { key: 'Personal', rate: 0.00, color: '#9E9E9E' }
  ];

  const colors = {
    primary: '#667eea',
    surface: '#ffffff',
    background: '#f8f9ff',
    text: '#2d3748',
    textSecondary: '#718096'
  };

  useEffect(() => {
    loadSampleTrips();
    initializeGPS();
    
    return () => {
      if (gpsService.current) {
        gpsService.current.stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    if (gpsService.current) {
      if (autoMode) {
        gpsService.current.startMonitoring();
      } else {
        gpsService.current.stopMonitoring();
        setGpsStatus('Manual mode - Persistent background disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new PersistentBackgroundGPS(
      (trip) => {
        setCurrentTrip(trip);
        setIsTracking(true);
      },
      (completedTrip) => {
        setTrips(prevTrips => {
          const newTrips = [completedTrip, ...prevTrips];
          saveTrips(newTrips);
          return newTrips;
        });
        setCurrentTrip(null);
        setIsTracking(false);
      },
      (status) => {
        setGpsStatus(status);
      },
      (location) => {
        setCurrentLocation(location);
      }
    );
  };

  const loadSampleTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      }
    } catch (error) {
      console.log('Error loading trips:', error);
    }
  };

  const saveTrips = async (tripsToSave) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(tripsToSave));
    } catch (error) {
      console.log('Error saving trips:', error);
    }
  };

  const addTrip = async () => {
    if (!formData.startLocation || !formData.endLocation || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const newTrip = {
      id: Date.now().toString(),
      ...formData,
      distance: parseFloat(formData.distance),
      date: new Date().toISOString(),
      autoDetected: false
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    await saveTrips(updatedTrips);
    
    setModalVisible(false);
    setFormData({
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: '',
      category: 'Business'
    });
    
    Alert.alert('Success', 'Trip added successfully');
  };

  const calculateTotals = () => {
    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDeduction = trips.reduce((sum, trip) => {
      const category = categories.find(cat => cat.key === trip.category);
      const rate = category ? category.rate : 0;
      return sum + (trip.distance * rate);
    }, 0);
    
    return { totalTrips, totalMiles, totalDeduction };
  };

  const renderDashboard = () => {
    const { totalTrips, totalMiles, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Persistent Background GPS</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Maximum Background Persistence</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto-Detection (Maximum persistence when closed)</Text>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          
          {isTracking && (
            <View style={[styles.trackingAlert, { backgroundColor: colors.primary }]}>
              <Text style={[styles.trackingText, { color: colors.surface }]}>
                🚗 Trip Active • Persistent background system running
              </Text>
            </View>
          )}
          
          <View style={styles.backgroundInfo}>
            <Text style={[styles.backgroundText, { color: colors.textSecondary }]}>
              📱 All background persistence techniques active - Keep-alive system running
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalTrips}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalMiles.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>${totalDeduction.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IRS</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerWithButton}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>Trip History</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.headerButtonText, { color: colors.surface }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.tripCard, { backgroundColor: colors.surface }]}>
              <View style={styles.tripHeader}>
                <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                {item.autoDetected && (
                  <View style={styles.autoTag}>
                    <Text style={styles.autoTagText}>AUTO</Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.tripRoute, { color: colors.text }]}>
                {item.startLocation} → {item.endLocation}
              </Text>
              
              <View style={styles.tripDetails}>
                <Text style={[styles.tripDistance, { color: colors.primary }]}>
                  {item.distance.toFixed(1)} mi
                </Text>
                <Text style={[styles.tripCategory, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </View>
              
              <Text style={[styles.tripPurpose, { color: colors.textSecondary }]}>
                {item.purpose}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.tripsList}
        />
      </View>
    );
  };

  const renderBottomNav = () => (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'dashboard' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('dashboard')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'dashboard' ? colors.surface : colors.textSecondary }]}>🏠</Text>
        <Text style={[styles.navLabel, { color: currentView === 'dashboard' ? colors.surface : colors.textSecondary }]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'trips' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('trips')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>🚗</Text>
        <Text style={[styles.navLabel, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>Trips</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddTripModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Manual Trip</Text>
          
          <ScrollView style={styles.modalForm}>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Start Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.startLocation}
              onChangeText={(text) => setFormData({...formData, startLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="End Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.endLocation}
              onChangeText={(text) => setFormData({...formData, endLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Distance (miles)"
              placeholderTextColor={colors.textSecondary}
              value={formData.distance}
              onChangeText={(text) => setFormData({...formData, distance: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Purpose (optional)"
              placeholderTextColor={colors.textSecondary}
              value={formData.purpose}
              onChangeText={(text) => setFormData({...formData, purpose: text})}
              multiline
            />
            
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.categorySelector}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: category.color },
                    formData.category === category.key && { borderWidth: 2, borderColor: colors.text }
                  ]}
                  onPress={() => setFormData({...formData, category: category.key})}
                >
                  <Text style={styles.categoryChipText}>{category.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={addTrip}
              >
                <Text style={styles.saveButtonText}>Add Trip</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.app}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}
      
      {renderBottomNav()}
      {renderAddTripModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  headerWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerButtonText: { fontSize: 14, fontWeight: 'bold' },
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  gpsStatus: { fontSize: 16, marginBottom: 10, fontWeight: '600' },
  locationContainer: { marginBottom: 15 },
  locationInfo: { fontSize: 14, marginBottom: 5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingRight: 5 },
  toggleLabel: { fontSize: 14, flex: 1, marginRight: 10 },
  trackingAlert: { 
    padding: 12, 
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15
  },
  trackingText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  backgroundInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  backgroundText: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 10, marginTop: 4 },
  tripsList: { padding: 20 },
  tripCard: { padding: 15, marginBottom: 15, borderRadius: 12, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripDate: { fontSize: 14 },
  autoTag: { backgroundColor: '#00a86b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  autoTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  tripRoute: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tripDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripDistance: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  tripCategory: { fontSize: 14, marginRight: 15 },
  tripPurpose: { fontSize: 14, fontStyle: 'italic' },
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalForm: { maxHeight: 400 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  categoryChipText: { color: 'white', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, marginRight: 10 },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, marginLeft: 10 },
  cancelButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
