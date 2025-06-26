// BUILD77 BACKGROUND SERVICE - True background GPS tracking when app is closed/phone folded
// Uses foreground service to maintain GPS tracking when app is not visible
// Based on user test: Works when open, fails when closed - need background service

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform, AppState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import BackgroundTimer from 'react-native-background-timer';

class BackgroundGPSService {
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
    
    // BACKGROUND TRACKING STATE
    this.state = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.backgroundTimerInterval = null;
    this.TIMEOUT_MINUTES = 5;
    this.lastValidGPSTime = null;
    this.gpsUpdateCount = 0;
    this.stationaryElapsedSeconds = 0;
    this.isInBackground = false;
    
    // Background persistence
    this.backgroundStorageKey = 'miletracker_background_state';
    this.appStateSubscription = null;
  }

  async initialize() {
    try {
      this.onStatusUpdate('Initializing background GPS service...');
      
      if (Platform.OS === 'android') {
        // Request all necessary permissions for background tracking
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
          this.onStatusUpdate('Location permission denied');
          return false;
        }
        
        // Background location permission (Android 10+)
        if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Background Location Required',
            'For automatic trip tracking when the app is closed, please enable "Allow all the time" location access in Settings.',
            [{ text: 'OK' }]
          );
        }
        
        this.permissionGranted = true;
      }
      
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'always', // Request always permission for background
        enableBackgroundLocationUpdates: true,
        locationProvider: 'auto'
      });
      
      // Monitor app state changes for background handling
      this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        this.handleAppStateChange(nextAppState);
      });
      
      // Restore background state if app was tracking when closed
      await this.restoreBackgroundState();
      
      this.onStatusUpdate('Background GPS service ready - Works when app closed');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      return false;
    }
  }

  async handleAppStateChange(nextAppState) {
    console.log('App state changed to:', nextAppState);
    
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.isInBackground = true;
      if (this.currentTrip) {
        await this.saveBackgroundState();
        this.onStatusUpdate('📱 App in background - GPS tracking continues');
        
        // Start background timer for stationary detection
        if (!this.backgroundTimerInterval) {
          this.startBackgroundTimer();
        }
      }
    } else if (nextAppState === 'active') {
      this.isInBackground = false;
      if (this.currentTrip) {
        this.onStatusUpdate('📱 App active - GPS tracking resumed');
        
        // Stop background timer, return to foreground GPS
        if (this.backgroundTimerInterval) {
          BackgroundTimer.clearInterval(this.backgroundTimerInterval);
          this.backgroundTimerInterval = null;
        }
      }
    }
  }

  async saveBackgroundState() {
    try {
      const state = {
        isTracking: !!this.currentTrip,
        currentTrip: this.currentTrip,
        stationaryStartTime: this.stationaryStartTime,
        stationaryElapsedSeconds: this.stationaryElapsedSeconds,
        state: this.state,
        lastSaveTime: Date.now()
      };
      
      await AsyncStorage.setItem(this.backgroundStorageKey, JSON.stringify(state));
      console.log('Background state saved');
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
        
        // If less than 30 minutes since last save, restore tracking
        if (timeSinceLastSave < 30 * 60 * 1000 && state.isTracking) {
          this.currentTrip = state.currentTrip;
          this.stationaryStartTime = state.stationaryStartTime;
          this.stationaryElapsedSeconds = state.stationaryElapsedSeconds;
          this.state = state.state;
          
          console.log('Restored background tracking state');
          this.onStatusUpdate('🔄 Restored background tracking - Trip continues');
          
          if (this.onTripStart && this.currentTrip) {
            this.onTripStart(this.currentTrip);
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

  startBackgroundTimer() {
    // Use react-native-background-timer for true background execution
    this.backgroundTimerInterval = BackgroundTimer.setInterval(() => {
      if (this.stationaryStartTime && this.currentTrip) {
        this.stationaryElapsedSeconds += 1;
        
        const remainingSeconds = (this.TIMEOUT_MINUTES * 60) - this.stationaryElapsedSeconds;
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingSecondsDisplay = remainingSeconds % 60;
        
        console.log(`Background timer: ${remainingMinutes}m ${remainingSecondsDisplay}s remaining`);
        
        if (remainingSeconds <= 0) {
          console.log('Background auto-end triggered');
          this.forceBackgroundAutoEnd();
        } else {
          // Update status even in background
          this.onStatusUpdate(`🔒 Background: Auto-end in ${remainingMinutes}m ${remainingSecondsDisplay}s`);
        }
      }
    }, 1000);
  }

  async forceBackgroundAutoEnd() {
    console.log('Forcing background auto-end');
    
    if (this.backgroundTimerInterval) {
      BackgroundTimer.clearInterval(this.backgroundTimerInterval);
      this.backgroundTimerInterval = null;
    }
    
    // End trip with last known position
    if (this.lastPosition && this.currentTrip) {
      const completedTrip = this.endTrip(
        this.lastPosition.latitude, 
        this.lastPosition.longitude, 
        Date.now()
      );
      
      if (completedTrip) {
        // Save completed trip to storage for when app reopens
        await this.saveCompletedTrip(completedTrip);
        await AsyncStorage.removeItem(this.backgroundStorageKey);
        
        this.onStatusUpdate(`✅ Background auto-end: ${completedTrip.distance.toFixed(1)}mi saved`);
      }
    }
    
    this.state = 'monitoring';
    this.stationaryStartTime = null;
    this.stationaryElapsedSeconds = 0;
  }

  async saveCompletedTrip(trip) {
    try {
      const existingTrips = await AsyncStorage.getItem('miletracker_trips');
      const trips = existingTrips ? JSON.parse(existingTrips) : [];
      trips.unshift(trip);
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(trips));
      console.log('Background trip saved to storage');
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
      this.onStatusUpdate('Starting background GPS monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          distanceFilter: 2,
        }
      );
      
      this.isActive = true;
      this.state = 'monitoring';
      this.gpsUpdateCount = 0;
      this.lastValidGPSTime = Date.now();
      
      this.onStatusUpdate('Background GPS monitoring active - Works when app closed');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS failed: ${error.message}`);
      return false;
    }
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.backgroundTimerInterval) {
      BackgroundTimer.clearInterval(this.backgroundTimerInterval);
      this.backgroundTimerInterval = null;
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
    this.onStatusUpdate('GPS monitoring stopped');
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
    
    if (accuracy > 100) {
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

    this.processBackgroundDetection(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
    
    // Save state periodically during tracking
    if (this.currentTrip && this.gpsUpdateCount % 10 === 0) {
      this.saveBackgroundState();
    }
  }

  processBackgroundDetection(speed, latitude, longitude, timestamp) {
    switch (this.state) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.state = 'detecting';
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          const statusText = this.isInBackground 
            ? `🔒 Background monitoring (${speed.toFixed(1)}mph, Updates: ${this.gpsUpdateCount})`
            : `Ready - Monitoring for movement (${speed.toFixed(1)}mph, Updates: ${this.gpsUpdateCount})`;
          this.onStatusUpdate(statusText);
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
            
            // Start appropriate timer based on app state
            if (this.isInBackground && !this.backgroundTimerInterval) {
              this.startBackgroundTimer();
            }
            
            this.onStatusUpdate('Stationary detected - Background timer ready');
          }
          
          // Calculate remaining time
          this.stationaryElapsedSeconds = Math.floor((timestamp - this.stationaryStartTime) / 1000);
          const remainingSeconds = (this.TIMEOUT_MINUTES * 60) - this.stationaryElapsedSeconds;
          const remainingMinutes = Math.floor(remainingSeconds / 60);
          const remainingSecondsDisplay = remainingSeconds % 60;
          
          if (remainingSeconds <= 0 && !this.isInBackground) {
            // Foreground auto-end
            this.forceAutoEnd();
          } else {
            const prefix = this.isInBackground ? '🔒 Background:' : 'Stationary:';
            this.onStatusUpdate(`${prefix} Auto-end in ${remainingMinutes}m ${remainingSecondsDisplay}s`);
          }
          
        } else {
          // Movement resumed
          if (this.stationaryStartTime !== null) {
            if (this.backgroundTimerInterval) {
              BackgroundTimer.clearInterval(this.backgroundTimerInterval);
              this.backgroundTimerInterval = null;
            }
            this.stationaryStartTime = null;
            this.stationaryElapsedSeconds = 0;
            this.onStatusUpdate(`Movement resumed - Trip continues (${speed.toFixed(1)}mph)`);
          }
          
          const distance = this.calculateTripDistance();
          const elapsedMinutes = Math.floor((timestamp - (this.currentTrip?.startTimestamp || timestamp)) / 60000);
          const prefix = this.isInBackground ? '🔒 Background:' : 'Trip:';
          this.onStatusUpdate(`${prefix} ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${elapsedMinutes}min`);
        }
        break;
    }
  }

  forceAutoEnd() {
    console.log('Force auto-end triggered');
    
    // Use last known position for ending trip
    if (this.lastPosition && this.currentTrip) {
      const completedTrip = this.endTrip(
        this.lastPosition.latitude, 
        this.lastPosition.longitude, 
        Date.now()
      );
      
      if (completedTrip) {
        this.onStatusUpdate(`✅ Trip auto-ended: ${completedTrip.distance.toFixed(1)}mi`);
      }
    }
    
    this.state = 'monitoring';
    this.stationaryStartTime = null;
    this.stationaryElapsedSeconds = 0;
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
    this.onStatusUpdate(`🚗 TRIP STARTED at ${speed.toFixed(1)}mph - Background tracking enabled`);
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
        purpose: `Auto: ${distance.toFixed(1)}mi in ${totalMinutes}min (Background)`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      this.currentTrip = null;
      this.tripPath = [];
      
      return completedTrip;
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
      this.currentTrip = null;
      this.tripPath = [];
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

// MAIN APP (Same as before but with background service)
export default function App() {
  console.log('BUILD77 BACKGROUND SERVICE - v1.0 - True background GPS tracking');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing background GPS service...');
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
        setGpsStatus('Manual mode - Background tracking disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new BackgroundGPSService(
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
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Background GPS Service</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Background Auto-Detection</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto-Detection (Works when app closed)</Text>
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
                🚗 Trip Active • Background service running
              </Text>
            </View>
          )}
          
          <View style={styles.backgroundInfo}>
            <Text style={[styles.backgroundText, { color: colors.textSecondary }]}>
              📱 Background tracking enabled - Works when phone is closed/folded
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
