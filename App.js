// BUILD77 DIAGNOSTIC LOGGING - Find out WHY auto-end never triggers
// Based on your feedback: The app is already simple, but auto-end logic never executes
// This version logs EVERYTHING to identify the root cause

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class DiagnosticGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate, onLogUpdate) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.onLogUpdate = onLogUpdate;
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.tripPath = [];
    this.permissionGranted = false;
    
    // SIMPLE STATE
    this.state = 'monitoring';
    this.detectionCount = 0;
    
    // DIAGNOSTIC AUTO-END TRACKING
    this.stationaryStartTime = null;
    this.stationarySeconds = 0;
    this.TIMEOUT_SECONDS = 300; // 5 minutes
    this.lastLogTime = 0;
    
    // DIAGNOSTIC LOGGING
    this.diagnosticLogs = [];
    this.gpsUpdateCount = 0;
    this.stationaryUpdateCount = 0;
    this.lastGpsTime = null;
  }

  log(message, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      message,
      data,
      timestamp: Date.now()
    };
    
    this.diagnosticLogs.push(logEntry);
    console.log(`[${timestamp}] ${message}`, data);
    
    if (this.onLogUpdate) {
      this.onLogUpdate(this.diagnosticLogs.slice(-10)); // Keep last 10 logs
    }
  }

  async initialize() {
    try {
      this.log('Initializing GPS permissions...');
      this.onStatusUpdate('Checking GPS permissions...');
      
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          this.log('Requesting location permissions...');
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          
          if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
            this.log('Location permission denied');
            this.onStatusUpdate('Location permission denied');
            return false;
          }
        }
        
        this.permissionGranted = true;
        this.log('Location permissions granted');
      }
      
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto'
      });
      
      this.log('GPS configuration complete');
      this.onStatusUpdate('GPS ready - Diagnostic logging enabled');
      return true;
    } catch (error) {
      this.log('GPS setup failed', { error: error.message });
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      return false;
    }
  }

  async startMonitoring() {
    const canStart = await this.initialize();
    if (!canStart) return false;

    if (this.watchId !== null) {
      this.stopMonitoring();
    }

    try {
      this.log('Starting GPS monitoring...');
      this.onStatusUpdate('Starting GPS monitoring with diagnostic logging...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
          distanceFilter: 3,
        }
      );
      
      this.isActive = true;
      this.state = 'monitoring';
      this.gpsUpdateCount = 0;
      this.stationaryUpdateCount = 0;
      this.lastGpsTime = Date.now();
      
      this.log('GPS monitoring started', { watchId: this.watchId });
      this.onStatusUpdate('Diagnostic GPS monitoring active');
      return true;
    } catch (error) {
      this.log('GPS start failed', { error: error.message });
      this.onStatusUpdate(`GPS failed: ${error.message}`);
      return false;
    }
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      this.log('Stopping GPS monitoring', { watchId: this.watchId });
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isActive = false;
    this.state = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.stationarySeconds = 0;
    this.log('GPS monitoring stopped');
    this.onStatusUpdate('GPS monitoring stopped');
  }

  handleLocationError(error) {
    this.log('GPS Error', { 
      code: error.code, 
      message: error.message,
      updateCount: this.gpsUpdateCount 
    });
    this.onStatusUpdate(`GPS error: ${error.message}`);
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    this.gpsUpdateCount++;
    this.lastGpsTime = timestamp;
    
    // Log GPS update frequency
    if (this.gpsUpdateCount % 5 === 0) {
      this.log('GPS Update', { 
        count: this.gpsUpdateCount, 
        accuracy: accuracy?.toFixed(1),
        rawSpeed: speed 
      });
    }
    
    if (accuracy > 100) {
      this.onStatusUpdate(`Improving GPS accuracy (${accuracy.toFixed(0)}m)`);
      return;
    }

    // CALCULATE AND VALIDATE SPEED
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

    // SPEED VALIDATION WITH LOGGING
    const originalSpeed = currentSpeed;
    if (currentSpeed > 100 || currentSpeed < 0) currentSpeed = 0;
    if (currentSpeed < 1) currentSpeed = 0;
    
    if (originalSpeed !== currentSpeed) {
      this.log('Speed corrected', { 
        original: originalSpeed.toFixed(2), 
        corrected: currentSpeed.toFixed(2) 
      });
    }

    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: currentSpeed, accuracy });
    }

    this.processDiagnosticDetection(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
  }

  processDiagnosticDetection(speed, latitude, longitude, timestamp) {
    // LOG EVERY PROCESSING CALL
    const now = Date.now();
    if (now - this.lastLogTime > 10000) { // Log every 10 seconds
      this.log('Detection Processing', { 
        speed: speed.toFixed(1), 
        state: this.state,
        stationarySeconds: this.stationarySeconds,
        gpsUpdates: this.gpsUpdateCount,
        timeSinceLastGPS: now - this.lastGpsTime
      });
      this.lastLogTime = now;
    }

    switch (this.state) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.state = 'detecting';
          this.log('Movement detected', { speed: speed.toFixed(1) });
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          this.onStatusUpdate(`Ready - Monitoring for movement (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'detecting':
        if (speed > 8) {
          this.detectionCount++;
          this.log('Detection count increased', { 
            count: this.detectionCount, 
            speed: speed.toFixed(1) 
          });
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (${this.detectionCount}/3)`);
          
          if (this.detectionCount >= 3) {
            this.log('Trip starting - detection threshold reached');
            this.startTrip(latitude, longitude, speed, timestamp);
            this.state = 'tracking';
            this.detectionCount = 0;
            this.stationaryStartTime = null;
            this.stationarySeconds = 0;
          }
        } else {
          this.log('Detection reset - speed dropped', { speed: speed.toFixed(1) });
          this.detectionCount = 0;
          this.state = 'monitoring';
          this.onStatusUpdate(`Ready - Movement stopped (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'tracking':
        if (this.currentTrip) {
          this.tripPath.push({ latitude, longitude, timestamp, speed, accuracy: 0 });
        }

        // DIAGNOSTIC STATIONARY DETECTION
        if (speed < 3) {
          this.stationaryUpdateCount++;
          
          // FIRST TIME STATIONARY
          if (this.stationaryStartTime === null) {
            this.stationaryStartTime = timestamp;
            this.stationarySeconds = 0;
            this.log('STATIONARY STARTED', { 
              speed: speed.toFixed(1),
              startTime: new Date(timestamp).toLocaleTimeString(),
              updateCount: this.stationaryUpdateCount
            });
            this.onStatusUpdate(`Stationary started - Diagnostic logging active`);
          }

          // CALCULATE STATIONARY TIME
          this.stationarySeconds = Math.floor((timestamp - this.stationaryStartTime) / 1000);
          
          // LOG STATIONARY PROGRESS EVERY 30 SECONDS
          if (this.stationarySeconds % 30 === 0 && this.stationarySeconds > 0) {
            this.log('STATIONARY PROGRESS', {
              elapsed: this.stationarySeconds,
              remaining: this.TIMEOUT_SECONDS - this.stationarySeconds,
              speed: speed.toFixed(1),
              updateCount: this.stationaryUpdateCount
            });
          }

          const remainingSeconds = this.TIMEOUT_SECONDS - this.stationarySeconds;
          const remainingMinutes = Math.floor(remainingSeconds / 60);
          const remainingSecondsDisplay = remainingSeconds % 60;

          // CRITICAL AUTO-END CHECK WITH EXTENSIVE LOGGING
          this.log('AUTO-END CHECK', {
            stationarySeconds: this.stationarySeconds,
            timeoutThreshold: this.TIMEOUT_SECONDS,
            willTriggerAutoEnd: this.stationarySeconds >= this.TIMEOUT_SECONDS,
            remainingTime: `${remainingMinutes}m ${remainingSecondsDisplay}s`,
            currentState: this.state,
            hasCurrentTrip: !!this.currentTrip
          });

          if (this.stationarySeconds >= this.TIMEOUT_SECONDS) {
            this.log('AUTO-END TRIGGERED!!!', {
              finalElapsed: this.stationarySeconds,
              threshold: this.TIMEOUT_SECONDS,
              tripId: this.currentTrip?.id
            });
            
            const completedTrip = this.endTrip(latitude, longitude, timestamp);
            
            if (completedTrip) {
              this.log('Trip auto-ended successfully', { 
                tripId: completedTrip.id,
                distance: completedTrip.distance 
              });
            } else {
              this.log('AUTO-END FAILED - endTrip returned null');
            }
            
            this.state = 'monitoring';
            this.stationaryStartTime = null;
            this.stationarySeconds = 0;
            this.stationaryUpdateCount = 0;
            
          } else {
            this.onStatusUpdate(`Stationary ${Math.floor(this.stationarySeconds/60)}min - Auto-end in ${remainingMinutes}m ${remainingSecondsDisplay}s (Updates: ${this.stationaryUpdateCount})`);
          }
          
        } else {
          // MOVEMENT RESUMED
          if (this.stationaryStartTime !== null) {
            this.log('MOVEMENT RESUMED', {
              wasStationaryFor: this.stationarySeconds,
              newSpeed: speed.toFixed(1),
              stationaryUpdateCount: this.stationaryUpdateCount
            });
            this.stationaryStartTime = null;
            this.stationarySeconds = 0;
            this.stationaryUpdateCount = 0;
            this.onStatusUpdate(`Movement resumed - Trip continues (${speed.toFixed(1)}mph)`);
          }
          
          const distance = this.calculateTripDistance();
          const elapsedMinutes = Math.floor((timestamp - (this.currentTrip?.startTimestamp || timestamp)) / 60000);
          this.onStatusUpdate(`Trip: ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${elapsedMinutes}min`);
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
    
    this.log('TRIP STARTED', {
      id: this.currentTrip.id,
      speed: speed.toFixed(1),
      location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    });
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`🚗 TRIP STARTED at ${speed.toFixed(1)}mph - Diagnostic logging active`);
  }

  endTrip(latitude, longitude, timestamp) {
    if (!this.currentTrip) {
      this.log('END TRIP FAILED - no current trip');
      return null;
    }

    const distance = this.calculateTripDistance();
    const totalMinutes = Math.floor((timestamp - this.currentTrip.startTimestamp) / 60000);

    this.log('ENDING TRIP', {
      id: this.currentTrip.id,
      distance: distance.toFixed(2),
      duration: totalMinutes,
      pathPoints: this.tripPath.length
    });

    if (distance > 0.2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        totalDuration: totalMinutes,
        purpose: `Auto: ${distance.toFixed(1)}mi in ${totalMinutes}min (Diagnostic)`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      
      this.log('TRIP SAVED SUCCESSFULLY', {
        id: completedTrip.id,
        finalDistance: distance.toFixed(2),
        finalDuration: totalMinutes
      });
      
      this.onStatusUpdate(`✅ Trip saved: ${distance.toFixed(1)}mi in ${totalMinutes}min (Diagnostic)`);

      this.currentTrip = null;
      this.tripPath = [];
      
      return completedTrip;
    } else {
      this.log('TRIP DISCARDED - too short', { distance: distance.toFixed(2) });
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

// MAIN APP WITH DIAGNOSTIC DISPLAY
export default function App() {
  console.log('BUILD77 DIAGNOSTIC LOGGING - v1.0 - Find out WHY auto-end fails');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing diagnostic GPS...');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState([]);
  
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
        setGpsStatus('Manual mode - Diagnostic logging disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new DiagnosticGPSService(
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
      (logs) => {
        setDiagnosticLogs(logs);
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
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Diagnostic Logging</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Diagnostic Auto-Detection</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto-Detection (Full Diagnostic Logging)</Text>
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
                🚗 Trip Active • Diagnostic logging everything
              </Text>
            </View>
          )}
        </View>

        {diagnosticLogs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Diagnostic Logs (Last 10)</Text>
            <ScrollView style={styles.logContainer} nestedScrollEnabled={true}>
              {diagnosticLogs.map((log, index) => (
                <View key={index} style={styles.logEntry}>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>{log.time}</Text>
                  <Text style={[styles.logMessage, { color: colors.text }]}>{log.message}</Text>
                  {Object.keys(log.data).length > 0 && (
                    <Text style={[styles.logData, { color: colors.textSecondary }]}>
                      {JSON.stringify(log.data, null, 2)}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  logEntry: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  logTime: { fontSize: 10, fontWeight: 'bold' },
  logMessage: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  logData: { fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
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
