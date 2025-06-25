// GPS PERMISSION & SENSOR FIX - Addresses critical production issues
// 1. FIXED: GPS permission boundary after fresh install
// 2. FIXED: False speed readings (43mph while stationary)
// 3. FIXED: Proper sensor validation and filtering
// 4. FIXED: Trip stuck in active state

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class ProductionGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.speedReadings = [];
    this.positionHistory = []; // Track position changes
    this.stationaryStartTime = null;
    this.movingCount = 0;
    this.initialized = false;
    this.tripPath = [];
    this.permissionGranted = false;
  }

  async initialize() {
    if (this.initialized) return this.permissionGranted;
    
    try {
      this.onStatusUpdate('Checking GPS permissions...');
      
      // FIXED: Explicit permission check for fresh installs
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];
        
        // Check current permissions first
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          this.onStatusUpdate('Requesting location permissions...');
          const granted = await PermissionsAndroid.requestMultiple(permissions);
          
          const fineLocation = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
          if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) {
            this.onStatusUpdate('Location permission denied - Enable in Settings');
            this.permissionGranted = false;
            return false;
          }
        }
        
        this.permissionGranted = true;
      }
      
      // Configure Geolocation with production settings
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto'
      });
      
      this.initialized = true;
      this.onStatusUpdate('GPS permissions granted - Ready for monitoring');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      console.log('GPS initialization error:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  async startMonitoring() {
    const canStart = await this.initialize();
    if (!canStart) {
      this.onStatusUpdate('GPS permissions required - Please enable location access');
      return false;
    }

    if (this.watchId !== null) {
      this.stopMonitoring();
    }

    try {
      this.onStatusUpdate('Starting GPS monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000,
          distanceFilter: 5, // Minimum distance for updates
          interval: 4000,
          fastestInterval: 2000,
        }
      );
      
      this.isActive = true;
      this.onStatusUpdate('GPS monitoring active - Detecting movement...');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS monitoring failed: ${error.message}`);
      console.log('GPS monitoring error:', error);
      return false;
    }
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isActive = false;
    this.onStatusUpdate('GPS monitoring stopped');
  }

  handleLocationError(error) {
    const errorMessages = {
      1: 'Location access denied - Check permissions',
      2: 'Location unavailable - GPS disabled', 
      3: 'Location timeout - Weak signal',
      5: 'Location services disabled'
    };
    
    const message = errorMessages[error.code] || `GPS error (${error.code})`;
    this.onStatusUpdate(message);
    console.log('GPS Error:', error);
    
    // Reset permission flag on permission errors
    if (error.code === 1) {
      this.permissionGranted = false;
      this.initialized = false;
    }
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    console.log('GPS Raw:', { latitude, longitude, speed, accuracy, timestamp });
    
    // FIXED: Strict accuracy filtering for production
    if (accuracy > 50) {
      this.onStatusUpdate(`Improving GPS accuracy (${accuracy.toFixed(0)}m)...`);
      return;
    }

    // FIXED: ADVANCED SPEED CALCULATION - Prevents false readings
    let calculatedSpeed = 0;
    
    if (this.lastPosition && this.lastPosition.timestamp) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeSeconds = (timestamp - this.lastPosition.timestamp) / 1000;
      
      // Only calculate speed for reasonable time intervals
      if (timeSeconds > 2 && timeSeconds < 30) {
        calculatedSpeed = (distance / timeSeconds) * 2.237; // m/s to mph
        
        // FIXED: Sanity check for impossible speeds
        if (calculatedSpeed > 120) {
          console.log('Impossible speed detected:', calculatedSpeed, 'mph - GPS error');
          calculatedSpeed = 0;
        }
      }
    }

    // FIXED: GPS speed validation - ignore unrealistic readings
    let gpsSpeed = 0;
    if (speed !== null && speed >= 0 && speed < 35) { // 35 m/s = ~78 mph max
      gpsSpeed = speed * 2.237;
    }

    // FIXED: Use most reliable speed reading
    let currentSpeed = 0;
    if (calculatedSpeed > 0 && calculatedSpeed < 80) {
      currentSpeed = calculatedSpeed;
    } else if (gpsSpeed > 0 && gpsSpeed < 80) {
      currentSpeed = gpsSpeed;
    }

    // FIXED: Position-based movement detection
    this.positionHistory.push({ latitude, longitude, timestamp });
    if (this.positionHistory.length > 10) {
      this.positionHistory.shift();
    }

    // Calculate movement from position changes
    let movementDetected = false;
    if (this.positionHistory.length >= 3) {
      const recent = this.positionHistory.slice(-3);
      let totalMovement = 0;
      
      for (let i = 1; i < recent.length; i++) {
        const dist = this.calculateDistance(
          recent[i-1].latitude, recent[i-1].longitude,
          recent[i].latitude, recent[i].longitude
        );
        totalMovement += dist;
      }
      
      // Movement threshold: 50 meters in 3 readings
      movementDetected = totalMovement > 50;
    }

    // FIXED: Advanced speed filtering
    this.speedReadings.push(currentSpeed);
    if (this.speedReadings.length > 5) {
      this.speedReadings.shift();
    }
    
    // Use median speed to filter outliers
    const sortedSpeeds = [...this.speedReadings].sort((a, b) => a - b);
    const medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)];
    
    // Final speed with position validation
    const finalSpeed = movementDetected ? medianSpeed : 0;

    // Update UI with validated data
    if (this.onLocationUpdate) {
      this.onLocationUpdate({ 
        latitude, 
        longitude, 
        speed: finalSpeed, 
        accuracy,
        movementDetected 
      });
    }

    // FIXED: GPS path tracking during trips
    if (this.currentTrip && movementDetected) {
      this.tripPath.push({ 
        latitude, 
        longitude, 
        timestamp, 
        speed: finalSpeed,
        accuracy 
      });
    }

    // AUTO-DETECTION LOGIC with position validation
    if (!this.currentTrip) {
      if (finalSpeed > 8 && movementDetected) {
        this.movingCount++;
        this.onStatusUpdate(`Movement: ${finalSpeed.toFixed(1)}mph (${this.movingCount}/3)`);
        console.log('Movement detected:', finalSpeed, 'mph, position change detected');
        
        if (this.movingCount >= 3) {
          this.startTrip(latitude, longitude, finalSpeed);
        }
      } else {
        this.movingCount = 0;
        if (movementDetected) {
          this.onStatusUpdate(`Monitoring: ${finalSpeed.toFixed(1)}mph • ${accuracy.toFixed(0)}m`);
        } else {
          this.onStatusUpdate(`Ready - Stationary • Accuracy: ${accuracy.toFixed(0)}m`);
        }
      }
    } else {
      // FIXED: Enhanced trip ending logic
      if (finalSpeed < 2 && !movementDetected) {
        if (this.stationaryStartTime === null) {
          this.stationaryStartTime = timestamp;
        }
        
        const stationarySeconds = (timestamp - this.stationaryStartTime) / 1000;
        
        if (stationarySeconds < 60) {
          this.onStatusUpdate(`Trip: Stationary ${stationarySeconds.toFixed(0)}s`);
        } else {
          const minutes = Math.floor(stationarySeconds / 60);
          this.onStatusUpdate(`Trip: Stationary ${minutes}m ${(stationarySeconds % 60).toFixed(0)}s`);
        }
        
        // Auto-end trip after 90 seconds stationary
        if (stationarySeconds >= 90) {
          this.endTrip(latitude, longitude);
        }
      } else {
        // Moving - reset timer and show progress
        this.stationaryStartTime = null;
        const distance = this.calculateTripDistance();
        this.onStatusUpdate(`Trip: ${finalSpeed.toFixed(1)}mph • ${distance.toFixed(1)}mi`);
      }
    }

    this.lastPosition = { latitude, longitude, timestamp, speed: finalSpeed };
  }

  startTrip(latitude, longitude, speed) {
    this.currentTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startLatitude: latitude,
      startLongitude: longitude,
      startLocation: 'GPS Location',
      category: 'Business',
      autoDetected: true
    };
    
    this.tripPath = [{ latitude, longitude, timestamp: Date.now(), speed, accuracy: 0 }];
    this.stationaryStartTime = null;
    this.movingCount = 0;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`Trip started - ${speed.toFixed(1)}mph detected!`);
    console.log('Trip started:', this.currentTrip.id);
  }

  endTrip(latitude, longitude) {
    if (!this.currentTrip) return;

    const distance = this.calculateTripDistance();
    const duration = (Date.now() - new Date(this.currentTrip.startTime).getTime()) / 60000;

    console.log('Ending trip:', { distance, duration, pathPoints: this.tripPath.length });

    if (distance > 0.2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        duration: duration,
        purpose: `Auto-detected trip (${distance.toFixed(1)}mi)`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      this.onStatusUpdate(`Trip saved: ${distance.toFixed(1)}mi in ${duration.toFixed(0)}min`);
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
    }

    // Reset for next trip
    this.currentTrip = null;
    this.tripPath = [];
    this.stationaryStartTime = null;
    this.movingCount = 0;
  }

  forceEndTrip() {
    if (this.currentTrip && this.lastPosition) {
      console.log('Force ending trip');
      this.endTrip(this.lastPosition.latitude, this.lastPosition.longitude);
    }
  }

  // FIXED: Path-based distance calculation
  calculateTripDistance() {
    if (!this.tripPath || this.tripPath.length < 2) {
      return 0;
    }
    
    let totalDistance = 0;
    
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      
      const segmentDistance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      // Filter reasonable segments
      if (segmentDistance > 3 && segmentDistance < 500) {
        totalDistance += segmentDistance;
      }
    }
    
    return totalDistance * 0.000621371; // meters to miles
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
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
  console.log('GPS PERMISSION & SENSOR FIX - v1.0');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing GPS...');
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
        setGpsStatus('Manual mode - Auto-detection disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new ProductionGPSService(
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
      } else {
        const sampleTrips = [
          {
            id: '1',
            startLocation: 'Home Office',
            endLocation: 'Client Meeting',
            distance: 12.5,
            purpose: 'Business meeting with ABC Corp',
            category: 'Business',
            date: new Date().toISOString(),
            autoDetected: false
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
    const totalDeduction = trips.reduce((sum, trip) => {
      const category = categories.find(cat => cat.key === trip.category);
      const rate = category ? category.rate : 0;
      return sum + (trip.distance * rate);
    }, 0);
    
    return { totalTrips, autoTrips, totalMiles, totalDeduction };
  };

  const handleManualTripEnd = () => {
    Alert.alert(
      'End Current Trip?',
      'Trip will auto-end after 90 seconds stationary. Force end now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Now', 
          onPress: () => {
            if (gpsService.current) {
              gpsService.current.forceEndTrip();
            }
          }
        }
      ]
    );
  };

  const renderDashboard = () => {
    const { totalTrips, autoTrips, totalMiles, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Permission & Sensor Fix</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Auto-Detection</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph
              </Text>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Movement: {currentLocation.movementDetected ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto-Detection</Text>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          
          {isTracking && (
            <TouchableOpacity 
              style={[styles.trackingAlert, { backgroundColor: colors.primary }]}
              onPress={handleManualTripEnd}
            >
              <Text style={[styles.trackingText, { color: colors.surface }]}>
                Trip Active • Auto-ends after 90s stationary • Tap to force end
              </Text>
            </TouchableOpacity>
          )}
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
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.addButtonText, { color: colors.surface }]}>+ Add</Text>
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
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  headerWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  headerSubtitle: { fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold' },
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
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingRight: 5 },
  toggleLabel: { fontSize: 15, flex: 1, marginRight: 10 },
  trackingAlert: { 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 10,
    alignItems: 'center'
  },
  trackingText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalForm: { maxHeight: 400 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  categoryChipText: { color: 'white', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, marginRight: 10 },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, marginLeft: 10 },
  cancelButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
