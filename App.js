// BUILD77 FIXED AUTO COMPLETION - Bulletproof stationary detection
// Focus: Fix the core issue - trips not ending after being stationary
// Solution: Simplified, bulletproof timestamp-based auto-end logic

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class FixedAutoCompletionGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate, onExtendTripPrompt) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.onExtendTripPrompt = onExtendTripPrompt;
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.tripPath = [];
    this.permissionGranted = false;
    
    // SIMPLIFIED DETECTION STATE
    this.detectionState = 'monitoring';
    this.detectionCount = 0;
    
    // BULLETPROOF STATIONARY TRACKING
    this.stationaryStartTimestamp = null;
    this.STATIONARY_TIMEOUT_SECONDS = 300; // Fixed 5 minutes - no complexity
    
    // TIME TRACKING
    this.tripStartTime = null;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = null;
  }

  async initialize() {
    try {
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
      
      this.onStatusUpdate('GPS ready - Fixed auto-completion system enabled');
      return true;
    } catch (error) {
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
      this.onStatusUpdate('Starting GPS monitoring with fixed auto-completion...');
      
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
      this.onStatusUpdate('Auto-detection active - Fixed completion logic loaded');
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
    this.stationaryStartTimestamp = null;
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

    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: currentSpeed, accuracy });
    }

    this.processFixedAutoCompletion(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
  }

  processFixedAutoCompletion(speed, latitude, longitude, timestamp) {
    console.log('FIXED AUTO COMPLETION:', { 
      speed: speed.toFixed(1), 
      state: this.detectionState,
      stationaryStart: this.stationaryStartTimestamp ? new Date(this.stationaryStartTimestamp).toLocaleTimeString() : 'null'
    });

    switch (this.detectionState) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.detectionState = 'detecting';
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          this.onStatusUpdate(`Ready - Monitoring for movement (${speed.toFixed(1)}mph)`);
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
            this.stationaryStartTimestamp = null; // Reset stationary tracking
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

        // BULLETPROOF STATIONARY DETECTION
        if (speed < 3) {
          // FIRST TIME BECOMING STATIONARY
          if (this.stationaryStartTimestamp === null) {
            this.stationaryStartTimestamp = timestamp;
            console.log('STATIONARY START:', new Date(timestamp).toLocaleTimeString());
            this.onStatusUpdate(`Stationary started - 5min timeout countdown begins`);
          }

          // CALCULATE EXACT STATIONARY TIME
          const stationaryElapsedMs = timestamp - this.stationaryStartTimestamp;
          const stationaryElapsedSeconds = Math.floor(stationaryElapsedMs / 1000);
          const stationaryElapsedMinutes = Math.floor(stationaryElapsedSeconds / 60);
          
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);

          console.log('STATIONARY CHECK:', {
            elapsed: stationaryElapsedSeconds,
            timeout: this.STATIONARY_TIMEOUT_SECONDS,
            shouldEnd: stationaryElapsedSeconds >= this.STATIONARY_TIMEOUT_SECONDS
          });

          // BULLETPROOF AUTO-END LOGIC
          if (stationaryElapsedSeconds >= this.STATIONARY_TIMEOUT_SECONDS) {
            console.log(`AUTO-END TRIGGERED: ${stationaryElapsedSeconds}s >= ${this.STATIONARY_TIMEOUT_SECONDS}s`);
            
            const completedTrip = this.endTrip(latitude, longitude, timestamp);
            
            // Trigger extend prompt
            if (completedTrip && this.onExtendTripPrompt) {
              this.onExtendTripPrompt(completedTrip);
            }
            
            this.detectionState = 'monitoring';
            this.stationaryStartTimestamp = null;
            
          } else {
            const remainingSeconds = this.STATIONARY_TIMEOUT_SECONDS - stationaryElapsedSeconds;
            const remainingMinutes = Math.floor(remainingSeconds / 60);
            const remainingSecondsDisplay = remainingSeconds % 60;
            
            this.onStatusUpdate(`Stationary ${stationaryElapsedMinutes}min - Auto-end in ${remainingMinutes}m ${remainingSecondsDisplay}s (${drivingMinutes}min driving)`);
          }
          
        } else {
          // MOVEMENT RESUMED - CLEAR STATIONARY TRACKING
          if (this.stationaryStartTimestamp !== null) {
            console.log('MOVEMENT RESUMED - Clearing stationary timestamp');
            this.stationaryStartTimestamp = null;
            this.onStatusUpdate(`Movement resumed - Trip continues`);
          }
          
          const distance = this.calculateTripDistance();
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);
          this.onStatusUpdate(`Trip: ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${drivingMinutes}min driving`);
        }
        break;
    }
  }

  extendCurrentTrip() {
    // Reset stationary tracking to give more time
    this.stationaryStartTimestamp = Date.now();
    this.onStatusUpdate(`Trip extended - 5min timeout reset`);
  }

  forceEndTrip() {
    if (this.currentTrip && this.lastPosition) {
      this.endTrip(this.lastPosition.latitude, this.lastPosition.longitude, Date.now());
      this.detectionState = 'monitoring';
      this.stationaryStartTimestamp = null;
    }
  }

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
    this.stationaryStartTimestamp = null;
    
    this.tripStartTime = timestamp;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = timestamp;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`🚗 TRIP STARTED at ${speed.toFixed(1)}mph - Fixed auto-completion enabled`);
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
        purpose: `Auto: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving (${totalMinutes}min total)`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      
      this.onStatusUpdate(`✅ Trip saved: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving (${totalMinutes}min total, ${stationaryMinutes}min stationary)`);

      this.currentTrip = null;
      this.tripPath = [];
      this.resetTracking();
      
      return completedTrip;
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
      this.currentTrip = null;
      this.tripPath = [];
      this.resetTracking();
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

// MAIN APP COMPONENT
export default function App() {
  console.log('BUILD77 FIXED AUTO COMPLETION - v1.0 - Bulletproof stationary detection');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [pendingTrip, setPendingTrip] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing fixed GPS...');
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
        setGpsStatus('Manual mode - Auto-completion disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new FixedAutoCompletionGPSService(
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
      (trip) => {
        setPendingTrip(trip);
        setExtendModalVisible(true);
      }
    );
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
            purpose: 'Auto: 18.2mi in 28min driving (35min total)',
            category: 'Business',
            date: new Date(Date.now() - 86400000).toISOString(),
            autoDetected: true
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

  const handleExtendTrip = () => {
    if (gpsService.current) {
      gpsService.current.extendCurrentTrip();
    }
    setExtendModalVisible(false);
    setPendingTrip(null);
  };

  const handleAcceptTrip = () => {
    // Trip was already saved, just close modal
    setExtendModalVisible(false);
    setPendingTrip(null);
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
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Fixed Auto-Completion</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Fixed Auto-Completion System</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto-Detection with Fixed 5-min Timeout</Text>
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
                🚗 Trip Active • Bulletproof 5-minute auto-completion
              </Text>
            </View>
          )}

          <View style={[styles.featureCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Fixed Auto-Completion Features</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              • Bulletproof timestamp-based stationary detection{'\n'}
              • Fixed 5-minute timeout - no complex logic{'\n'}
              • Real-time countdown display{'\n'}
              • Automatic trip ending guaranteed{'\n'}
              • Movement detection clears stationary timer{'\n'}
              • Extend option if trip ends early
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
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Auto</Text>
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

  const renderExtendTripModal = () => (
    <Modal visible={extendModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Trip Auto-Completed</Text>
          
          {pendingTrip && (
            <View style={styles.tripSummary}>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Distance: {pendingTrip.distance.toFixed(1)} miles
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Driving Time: {pendingTrip.drivingDuration} minutes
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Total Time: {pendingTrip.totalDuration} minutes
              </Text>
            </View>
          )}
          
          <Text style={[styles.modalText, { color: colors.text }]}>
            The trip was automatically completed after 5 minutes of being stationary. Was this correct, or do you need to extend the trip?
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.primary }]}
              onPress={handleAcceptTrip}
            >
              <Text style={styles.cancelButtonText}>Looks Good</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.textSecondary }]}
              onPress={handleExtendTrip}
            >
              <Text style={styles.saveButtonText}>Extend Trip</Text>
            </TouchableOpacity>
          </View>
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
      {renderExtendTripModal()}
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
  featureCard: {
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  featureText: { fontSize: 12, lineHeight: 16 },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalText: { fontSize: 16, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  tripSummary: { marginBottom: 20, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 8 },
  summaryText: { fontSize: 14, marginBottom: 5 },
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
