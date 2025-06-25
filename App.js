// BUILD77 SMART DETECTION - Intelligent trip management with safety-first design
// Features: Smart location detection, voice prompts (optional), post-drive corrections (optional)
// Safety: No mid-drive phone interaction required

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class SmartDetectionGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate, onPostDrivePrompt) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.onPostDrivePrompt = onPostDrivePrompt; // New: Post-drive correction prompt
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.tripPath = [];
    this.permissionGranted = false;
    
    // SMART DETECTION SYSTEM
    this.detectionState = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.speedHistory = []; // Track speed patterns
    this.locationContext = 'unknown'; // highway, residential, parking, commercial
    this.timeOfDay = 'normal'; // rush_hour, normal, late_night
    
    // USER SETTINGS (will be loaded from storage)
    this.settings = {
      voicePrompts: false,
      postDriveCorrections: true,
      smartTimeouts: true,
      highwayTimeout: 900, // 15 minutes for highways
      residentialTimeout: 300, // 5 minutes for residential
      parkingTimeout: 180, // 3 minutes for parking areas
      rushHourMultiplier: 1.5 // Extend timeouts during rush hour
    };
    
    // TIME TRACKING
    this.tripStartTime = null;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = null;
    
    // RECENTLY ENDED TRIPS (for post-drive corrections)
    this.recentlyEndedTrips = [];
  }

  async initialize() {
    try {
      await this.loadSettings();
      this.onStatusUpdate('Checking GPS permissions...');
      
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          
          if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
            this.onStatusUpdate('Location permission denied');
            return false;
          }
        }
        
        this.permissionGranted = true;
      }
      
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto'
      });
      
      this.onStatusUpdate('GPS ready - Smart detection with safety features enabled');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      return false;
    }
  }

  async loadSettings() {
    try {
      const savedSettings = await AsyncStorage.getItem('miletracker_smart_settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.log('Settings load error:', error);
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem('miletracker_smart_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.log('Settings save error:', error);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  async startMonitoring() {
    const canStart = await this.initialize();
    if (!canStart) return false;

    if (this.watchId !== null) {
      this.stopMonitoring();
    }

    try {
      this.onStatusUpdate('Starting smart GPS monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
          distanceFilter: 5,
        }
      );
      
      this.isActive = true;
      this.detectionState = 'monitoring';
      this.onStatusUpdate('Smart detection active - Safety-first trip management');
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
    this.isActive = false;
    this.resetTracking();
    this.onStatusUpdate('GPS monitoring stopped');
  }

  resetTracking() {
    this.detectionState = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.speedHistory = [];
    this.locationContext = 'unknown';
    this.tripStartTime = null;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = null;
  }

  handleLocationError(error) {
    console.log('GPS Error:', error);
    this.onStatusUpdate(`GPS error: ${error.message}`);
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    if (accuracy > 100) {
      this.onStatusUpdate(`Improving GPS accuracy (${accuracy.toFixed(0)}m)`);
      return;
    }

    let currentSpeed = 0;
    
    if (speed !== null && speed >= 0) {
      currentSpeed = speed * 2.237;
    } else if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeSeconds = (timestamp - this.lastPosition.timestamp) / 1000;
      
      if (timeSeconds > 1 && timeSeconds < 30) {
        currentSpeed = (distance / timeSeconds) * 2.237;
      }
    }

    if (currentSpeed > 100) currentSpeed = 0;

    // Update speed history for pattern analysis
    this.speedHistory.push({ speed: currentSpeed, timestamp });
    if (this.speedHistory.length > 20) {
      this.speedHistory.shift(); // Keep only last 20 readings
    }

    // Analyze location context and time of day
    this.analyzeLocationContext(currentSpeed, latitude, longitude);
    this.analyzeTimeOfDay();

    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: currentSpeed, accuracy });
    }

    this.processSmartDetection(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
  }

  analyzeLocationContext(speed, latitude, longitude) {
    // Simple heuristic-based location context analysis
    const avgSpeed = this.speedHistory.length > 5 ? 
      this.speedHistory.slice(-5).reduce((sum, item) => sum + item.speed, 0) / 5 : speed;

    if (avgSpeed > 45) {
      this.locationContext = 'highway';
    } else if (avgSpeed > 25) {
      this.locationContext = 'arterial';
    } else if (avgSpeed > 10) {
      this.locationContext = 'residential';
    } else if (speed < 2 && this.stationaryStartTime) {
      const stationaryTime = Date.now() - this.stationaryStartTime;
      if (stationaryTime > 60000) { // Stationary for 1+ minutes
        this.locationContext = 'parking';
      }
    }
  }

  analyzeTimeOfDay() {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      this.timeOfDay = 'rush_hour';
    } else if (hour >= 22 || hour <= 6) {
      this.timeOfDay = 'late_night';
    } else {
      this.timeOfDay = 'normal';
    }
  }

  getSmartTimeout() {
    if (!this.settings.smartTimeouts) {
      return 300; // Default 5 minutes
    }

    let baseTimeout;
    switch (this.locationContext) {
      case 'highway':
        baseTimeout = this.settings.highwayTimeout;
        break;
      case 'parking':
        baseTimeout = this.settings.parkingTimeout;
        break;
      case 'residential':
        baseTimeout = this.settings.residentialTimeout;
        break;
      default:
        baseTimeout = 300; // 5 minutes default
    }

    // Apply rush hour multiplier
    if (this.timeOfDay === 'rush_hour') {
      baseTimeout *= this.settings.rushHourMultiplier;
    }

    return Math.floor(baseTimeout);
  }

  analyzeSpeedPattern() {
    if (this.speedHistory.length < 10) return 'unknown';

    const recentSpeeds = this.speedHistory.slice(-10).map(item => item.speed);
    const hasMovement = recentSpeeds.some(speed => speed > 3);
    const hasStops = recentSpeeds.some(speed => speed < 2);

    if (hasMovement && hasStops) {
      return 'traffic'; // Stop-and-go traffic pattern
    } else if (!hasMovement) {
      return 'parked'; // Consistently stationary
    } else {
      return 'driving'; // Consistent movement
    }
  }

  processSmartDetection(speed, latitude, longitude, timestamp) {
    const pattern = this.analyzeSpeedPattern();
    const smartTimeout = this.getSmartTimeout();

    console.log('SMART DETECTION:', { 
      speed: speed.toFixed(1), 
      state: this.detectionState,
      context: this.locationContext,
      timeOfDay: this.timeOfDay,
      pattern: pattern,
      timeout: smartTimeout
    });

    switch (this.detectionState) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.detectionState = 'detecting';
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          this.onStatusUpdate(`Smart monitoring - ${this.locationContext} context (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'detecting':
        if (speed > 8) {
          this.detectionCount++;
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (${this.detectionCount}/3)`);
          
          if (this.detectionCount >= 3) {
            this.startTrip(latitude, longitude, speed, timestamp);
            this.detectionState = 'driving';
            this.detectionCount = 0;
            this.stationaryStartTime = null;
          }
        } else {
          this.detectionCount = 0;
          this.detectionState = 'monitoring';
          this.onStatusUpdate(`Ready - Movement stopped (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'driving':
        this.trackMovementTime(speed, timestamp);
        
        if (this.currentTrip) {
          this.tripPath.push({ latitude, longitude, timestamp, speed, accuracy: 0 });
        }

        if (speed < 3) {
          if (this.stationaryStartTime === null) {
            this.stationaryStartTime = timestamp;
          }

          const stationarySeconds = Math.floor((timestamp - this.stationaryStartTime) / 1000);
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);

          // SMART AUTO-END LOGIC
          if (stationarySeconds >= smartTimeout) {
            console.log(`SMART AUTO-END: ${stationarySeconds}s >= ${smartTimeout}s (${this.locationContext} context)`);
            
            if (this.settings.voicePrompts) {
              // Voice notification (would require speech synthesis)
              this.announceVoice(`Trip ending after ${Math.floor(smartTimeout/60)} minutes stationary in ${this.locationContext} area`);
            }
            
            const completedTrip = this.endTrip(latitude, longitude, timestamp);
            
            // Add to recently ended for post-drive corrections
            if (completedTrip && this.settings.postDriveCorrections) {
              this.recentlyEndedTrips.push({
                ...completedTrip,
                endedAt: timestamp,
                context: this.locationContext,
                pattern: pattern
              });
              
              // Trigger post-drive prompt after a delay (when user likely checks phone)
              setTimeout(() => {
                if (this.recentlyEndedTrips.length > 0) {
                  this.onPostDrivePrompt(this.recentlyEndedTrips);
                }
              }, 30000); // 30 seconds delay
            }
            
            this.detectionState = 'monitoring';
            this.stationaryStartTime = null;
            
          } else {
            const remainingSeconds = smartTimeout - stationarySeconds;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            
            this.onStatusUpdate(`Smart: ${this.locationContext} stop • ${minutes}m ${seconds}s until auto-end (${drivingMinutes}min driving)`);
          }
        } else {
          // Movement resumed
          if (this.stationaryStartTime !== null) {
            this.stationaryStartTime = null;
            this.onStatusUpdate(`Movement resumed - Smart tracking continues`);
          }
          
          const distance = this.calculateTripDistance();
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);
          this.onStatusUpdate(`Trip: ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${drivingMinutes}min (${this.locationContext})`);
        }
        break;
    }
  }

  announceVoice(message) {
    // Voice synthesis would go here
    console.log('VOICE PROMPT:', message);
    // Could use react-native-tts or similar
  }

  // Existing methods remain the same...
  trackMovementTime(speed, timestamp) {
    const isMoving = speed >= 3;
    
    if (isMoving) {
      if (this.currentStationaryStart !== null) {
        const stationaryDuration = timestamp - this.currentStationaryStart;
        this.totalStationaryTime += stationaryDuration;
        
        this.stationaryPeriods.push({
          start: this.currentStationaryStart,
          end: timestamp,
          duration: stationaryDuration
        });
        
        this.currentStationaryStart = null;
      }
      
      if (this.lastMovementTime === null) {
        this.lastMovementTime = timestamp;
      }
    } else {
      if (this.currentStationaryStart === null) {
        this.currentStationaryStart = timestamp;
        
        if (this.lastMovementTime !== null) {
          const drivingDuration = timestamp - this.lastMovementTime;
          this.drivingPeriods.push({
            start: this.lastMovementTime,
            end: timestamp,
            duration: drivingDuration
          });
          this.lastMovementTime = null;
        }
      }
    }
  }

  getCurrentTripMetrics(currentTimestamp) {
    if (!this.tripStartTime) return { totalMinutes: 0, drivingMinutes: 0, stationaryMinutes: 0 };
    
    const totalTripTime = currentTimestamp - this.tripStartTime;
    let currentStationaryTime = this.totalStationaryTime;
    
    if (this.currentStationaryStart !== null) {
      currentStationaryTime += (currentTimestamp - this.currentStationaryStart);
    }
    
    const drivingTime = totalTripTime - currentStationaryTime;
    
    return {
      totalMinutes: Math.floor(totalTripTime / 60000),
      drivingMinutes: Math.floor(drivingTime / 60000),
      stationaryMinutes: Math.floor(currentStationaryTime / 60000)
    };
  }

  startTrip(latitude, longitude, speed, timestamp) {
    this.currentTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startLatitude: latitude,
      startLongitude: longitude,
      startLocation: 'GPS Location',
      category: 'Business',
      autoDetected: true
    };
    
    this.tripPath = [{ latitude, longitude, timestamp, speed, accuracy: 0 }];
    this.stationaryStartTime = null;
    
    this.tripStartTime = timestamp;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = timestamp;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`🚗 SMART TRIP STARTED at ${speed.toFixed(1)}mph - Intelligent timeout system active`);
    
    if (this.settings.voicePrompts) {
      this.announceVoice('Trip started with smart detection');
    }
  }

  endTrip(latitude, longitude, timestamp) {
    if (!this.currentTrip) return null;

    this.trackMovementTime(0, timestamp);
    
    const distance = this.calculateTripDistance();
    const { totalMinutes, drivingMinutes, stationaryMinutes } = this.getCurrentTripMetrics(timestamp);

    if (distance > 0.2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        totalDuration: totalMinutes,
        drivingDuration: drivingMinutes,
        stationaryDuration: stationaryMinutes,
        stationaryPeriods: this.stationaryPeriods,
        drivingPeriods: this.drivingPeriods,
        purpose: `Smart: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving (${this.locationContext})`,
        date: new Date().toISOString(),
        path: [...this.tripPath],
        smartContext: this.locationContext,
        timeOfDay: this.timeOfDay
      };

      this.onTripEnd(completedTrip);
      
      this.onStatusUpdate(`✅ Smart trip saved: ${distance.toFixed(1)}mi (${this.locationContext} context)`);
      
      if (this.settings.voicePrompts) {
        this.announceVoice(`Trip completed: ${distance.toFixed(1)} miles in ${drivingMinutes} minutes`);
      }

      this.currentTrip = null;
      this.tripPath = [];
      this.resetTracking();
      
      return completedTrip;
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming smart monitoring`);
      this.currentTrip = null;
      this.tripPath = [];
      this.resetTracking();
      return null;
    }
  }

  // Helper methods remain the same...
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

  clearRecentlyEndedTrips() {
    this.recentlyEndedTrips = [];
  }
}

// MAIN APP COMPONENT with Smart Detection
export default function App() {
  console.log('BUILD77 SMART DETECTION - v1.0 - Safety-first intelligent trip management');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [postDriveVisible, setPostDriveVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing smart GPS...');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [recentlyEndedTrips, setRecentlyEndedTrips] = useState([]);
  
  const gpsService = useRef(null);
  
  const [smartSettings, setSmartSettings] = useState({
    voicePrompts: false,
    postDriveCorrections: true,
    smartTimeouts: true,
    highwayTimeout: 900,
    residentialTimeout: 300,
    parkingTimeout: 180,
    rushHourMultiplier: 1.5
  });
  
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
    loadSmartSettings();
    initializeGPS();
    
    return () => {
      if (gpsService.current) {
        gpsService.current.stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    if (gpsService.current) {
      gpsService.current.updateSettings(smartSettings);
      if (autoMode) {
        gpsService.current.startMonitoring();
      } else {
        gpsService.current.stopMonitoring();
        setGpsStatus('Manual mode - Smart detection disabled');
      }
    }
  }, [autoMode, smartSettings]);

  const initializeGPS = () => {
    gpsService.current = new SmartDetectionGPSService(
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
      },
      (recentTrips) => {
        if (smartSettings.postDriveCorrections) {
          setRecentlyEndedTrips(recentTrips);
          setPostDriveVisible(true);
        }
      }
    );
  };

  const loadSmartSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('miletracker_smart_settings');
      if (savedSettings) {
        setSmartSettings({ ...smartSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.log('Settings load error:', error);
    }
  };

  const saveSmartSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('miletracker_smart_settings', JSON.stringify(newSettings));
      setSmartSettings(newSettings);
    } catch (error) {
      console.log('Settings save error:', error);
    }
  };

  const loadSampleTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        const sampleTrips = [
          {
            id: '1',
            startLocation: 'Downtown Office',
            endLocation: 'Airport Terminal',
            distance: 18.2,
            drivingDuration: 28,
            totalDuration: 35,
            stationaryDuration: 7,
            purpose: 'Smart: 18.2mi in 28min driving (highway)',
            category: 'Business',
            date: new Date(Date.now() - 86400000).toISOString(),
            autoDetected: true,
            smartContext: 'highway',
            timeOfDay: 'rush_hour'
          }
        ];
        setTrips(sampleTrips);
        await saveTrips(sampleTrips);
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

  const handlePostDriveAction = (action, tripId) => {
    if (action === 'extend') {
      // Extend the trip - could open a modal for additional distance/time
      Alert.alert('Extend Trip', 'Trip extension feature coming soon');
    } else if (action === 'merge') {
      // Merge with next trip
      Alert.alert('Merge Trips', 'Trip merging feature available in Trip Management');
    }
    
    // Remove from recently ended
    setRecentlyEndedTrips(prev => prev.filter(trip => trip.id !== tripId));
    if (gpsService.current) {
      gpsService.current.clearRecentlyEndedTrips();
    }
    
    if (recentlyEndedTrips.length <= 1) {
      setPostDriveVisible(false);
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
    const autoTrips = trips.filter(trip => trip.autoDetected).length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDrivingTime = trips.reduce((sum, trip) => sum + (trip.drivingDuration || 0), 0);
    const totalDeduction = trips.reduce((sum, trip) => {
      const category = categories.find(cat => cat.key === trip.category);
      const rate = category ? category.rate : 0;
      return sum + (trip.distance * rate);
    }, 0);
    
    return { totalTrips, autoTrips, totalMiles, totalDrivingTime, totalDeduction };
  };

  const renderDashboard = () => {
    const { totalTrips, autoTrips, totalMiles, totalDrivingTime, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Smart Detection & Safety</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsIcon}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={[styles.settingsIconText, { color: colors.surface }]}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Smart Detection System</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Smart Auto-Detection (No phone interaction while driving)</Text>
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
                🚗 Smart Trip Active • Intelligent context-aware timeouts • Hands-free operation
              </Text>
            </View>
          )}

          <View style={[styles.featureCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Smart Safety Features</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              • Highway: 15min timeout (traffic incidents){'\n'}
              • Residential: 5min timeout (quick stops){'\n'}
              • Parking: 3min timeout (arrived at destination){'\n'}
              • Rush hour: 1.5x longer timeouts{'\n'}
              • Voice prompts: Optional hands-free notifications{'\n'}
              • Post-drive corrections: Safe trip adjustments
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>June 2025 Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalTrips}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{autoTrips}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Smart</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalMiles.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalDrivingTime}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Min</Text>
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
            <Text style={[styles.headerTitle, { color: colors.surface }]}>Smart Trip History</Text>
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
                <View style={styles.tripTags}>
                  {item.autoDetected && (
                    <View style={[styles.smartTag, { marginRight: 5 }]}>
                      <Text style={styles.smartTagText}>SMART</Text>
                    </View>
                  )}
                  {item.smartContext && (
                    <View style={[styles.contextTag]}>
                      <Text style={styles.contextTagText}>{item.smartContext.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
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

              {item.drivingDuration && (
                <View style={styles.timeDetails}>
                  {item.stationaryDuration > 0 ? (
                    <Text style={[styles.timeInfo, { color: colors.textSecondary }]}>
                      {item.drivingDuration}min driving ({item.totalDuration}min total, {item.stationaryDuration}min stopped)
                    </Text>
                  ) : (
                    <Text style={[styles.timeInfo, { color: colors.textSecondary }]}>
                      {item.drivingDuration}min driving
                    </Text>
                  )}
                </View>
              )}
              
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

  const renderSettingsModal = () => (
    <Modal visible={settingsVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '80%' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Smart Detection Settings</Text>
          
          <ScrollView style={styles.settingsForm}>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Voice Prompts (Hands-free)</Text>
              <Switch
                value={smartSettings.voicePrompts}
                onValueChange={(value) => setSmartSettings({...smartSettings, voicePrompts: value})}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Post-Drive Corrections</Text>
              <Switch
                value={smartSettings.postDriveCorrections}
                onValueChange={(value) => setSmartSettings({...smartSettings, postDriveCorrections: value})}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Smart Context Timeouts</Text>
              <Switch
                value={smartSettings.smartTimeouts}
                onValueChange={(value) => setSmartSettings({...smartSettings, smartTimeouts: value})}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Timeout Settings (seconds)</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Highway Timeout</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              value={smartSettings.highwayTimeout.toString()}
              onChangeText={(text) => setSmartSettings({...smartSettings, highwayTimeout: parseInt(text) || 900})}
              keyboardType="numeric"
              placeholder="900"
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Residential Timeout</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              value={smartSettings.residentialTimeout.toString()}
              onChangeText={(text) => setSmartSettings({...smartSettings, residentialTimeout: parseInt(text) || 300})}
              keyboardType="numeric"
              placeholder="300"
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Parking Timeout</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              value={smartSettings.parkingTimeout.toString()}
              onChangeText={(text) => setSmartSettings({...smartSettings, parkingTimeout: parseInt(text) || 180})}
              keyboardType="numeric"
              placeholder="180"
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rush Hour Multiplier</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              value={smartSettings.rushHourMultiplier.toString()}
              onChangeText={(text) => setSmartSettings({...smartSettings, rushHourMultiplier: parseFloat(text) || 1.5})}
              keyboardType="numeric"
              placeholder="1.5"
            />
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                saveSmartSettings(smartSettings);
                setSettingsVisible(false);
                Alert.alert('Settings Saved', 'Smart detection settings updated successfully');
              }}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPostDriveModal = () => (
    <Modal visible={postDriveVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '70%' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Recent Trip Corrections</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Safe post-drive adjustments for recently ended trips
          </Text>
          
          <ScrollView style={styles.postDriveList}>
            {recentlyEndedTrips.map((trip) => (
              <View key={trip.id} style={[styles.postDriveItem, { borderColor: colors.primary }]}>
                <Text style={[styles.postDriveRoute, { color: colors.text }]}>
                  {trip.startLocation} → {trip.endLocation}
                </Text>
                <Text style={[styles.postDriveDetails, { color: colors.textSecondary }]}>
                  {trip.distance.toFixed(1)} mi • {trip.smartContext} context • Ended {Math.floor((Date.now() - trip.endedAt) / 60000)}min ago
                </Text>
                
                <View style={styles.postDriveButtons}>
                  <TouchableOpacity 
                    style={[styles.postDriveButton, { backgroundColor: colors.primary }]}
                    onPress={() => handlePostDriveAction('extend', trip.id)}
                  >
                    <Text style={[styles.postDriveButtonText, { color: colors.surface }]}>Extend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.postDriveButton, { backgroundColor: colors.textSecondary }]}
                    onPress={() => handlePostDriveAction('correct', trip.id)}
                  >
                    <Text style={[styles.postDriveButtonText, { color: colors.surface }]}>Looks Good</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 10 }]}
            onPress={() => {
              setPostDriveVisible(false);
              setRecentlyEndedTrips([]);
              if (gpsService.current) {
                gpsService.current.clearRecentlyEndedTrips();
              }
            }}
          >
            <Text style={styles.saveButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
      {renderSettingsModal()}
      {renderPostDriveModal()}
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
  settingsIcon: {
    padding: 10,
  },
  settingsIconText: { fontSize: 20 },
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
  toggleLabel: { fontSize: 11, flex: 1, marginRight: 10 },
  trackingAlert: { 
    padding: 12, 
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15
  },
  trackingText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 16 },
  featureCard: {
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  featureText: { fontSize: 11, lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 10, marginTop: 4 },
  tripsList: { padding: 20 },
  tripCard: { padding: 15, marginBottom: 15, borderRadius: 12, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripDate: { fontSize: 14 },
  tripTags: { flexDirection: 'row' },
  smartTag: { backgroundColor: '#00a86b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  smartTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  contextTag: { backgroundColor: '#9b59b6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  contextTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  tripRoute: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tripDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripDistance: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  tripCategory: { fontSize: 14, marginRight: 15 },
  timeDetails: { marginBottom: 8 },
  timeInfo: { fontSize: 12, fontStyle: 'italic' },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  modalForm: { maxHeight: 400 },
  settingsForm: { flex: 1, marginBottom: 20 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingRight: 5 },
  settingLabel: { fontSize: 16, flex: 1, marginRight: 10 },
  postDriveList: { flex: 1, marginBottom: 20 },
  postDriveItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  postDriveRoute: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  postDriveDetails: { fontSize: 12, marginBottom: 10 },
  postDriveButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  postDriveButton: { flex: 1, padding: 8, borderRadius: 6, marginHorizontal: 5 },
  postDriveButtonText: { textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  inputLabel: { fontSize: 14, marginBottom: 5, marginTop: 10 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  categoryChipText: { color: 'white', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, marginRight: 10 },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, marginLeft: 10 },
  cancelButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
