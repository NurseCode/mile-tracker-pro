// GPS PRODUCTION FIX - Addresses all critical issues
// 1. FIXED: Distance calculation (0.2mi vs 2mi actual)
// 2. FIXED: Time-based auto-stop (2 minutes stationary)
// 3. FIXED: Return trip detection after first trip ends
// 4. FIXED: Proper GPS path tracking for accurate distance

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

class FixedProductionGPSService {
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
    this.stationaryStartTime = null; // FIXED: Use time-based stopping
    this.movingCount = 0;
    this.initialized = false;
    this.tripPath = []; // FIXED: Separate path tracking
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      this.onStatusUpdate('Requesting GPS permissions...');
      
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        const fineLocation = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) {
          this.onStatusUpdate('Location permission denied - Enable in phone settings');
          return false;
        }
      }
      
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto'
      });
      
      this.initialized = true;
      this.onStatusUpdate('GPS initialized - Ready for auto-detection');
      return true;
    } catch (error) {
      this.onStatusUpdate('GPS setup error - Check permissions');
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
      this.onStatusUpdate('Starting GPS monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          distanceFilter: 5, // FIXED: More sensitive for better tracking
          interval: 3000,    // FIXED: More frequent updates
          fastestInterval: 2000,
        }
      );
      
      this.isActive = true;
      this.onStatusUpdate('Auto-detection active - Ready to track trips');
      return true;
    } catch (error) {
      this.onStatusUpdate('GPS monitoring failed');
      return false;
    }
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isActive = false;
    this.onStatusUpdate('Auto-detection stopped');
  }

  forceEndTrip() {
    if (this.currentTrip && this.lastPosition) {
      this.endTrip(this.lastPosition.latitude, this.lastPosition.longitude);
    }
  }

  handleLocationError(error) {
    const errorMessages = {
      1: 'Location access denied',
      2: 'Location unavailable - Check GPS', 
      3: 'Location timeout - Retrying...',
      5: 'Location settings disabled'
    };
    this.onStatusUpdate(errorMessages[error.code] || `GPS error (${error.code})`);
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    // PRODUCTION FILTERING - Reject poor accuracy readings
    if (accuracy > 50) {
      this.onStatusUpdate(`Poor GPS signal (${accuracy.toFixed(0)}m) - Improving...`);
      return;
    }

    // FIXED: IMPROVED SPEED CALCULATION
    let currentSpeed = 0;
    if (this.lastPosition && this.lastPosition.timestamp) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeSeconds = (timestamp - this.lastPosition.timestamp) / 1000;
      
      if (timeSeconds > 0 && timeSeconds < 60) {
        currentSpeed = (distance / timeSeconds) * 2.237; // m/s to mph
        currentSpeed = Math.max(0, Math.min(currentSpeed, 80)); // Reasonable bounds
      }
    }

    // Use GPS speed as backup if calculated speed is unreliable
    if (currentSpeed === 0 && speed !== null && speed >= 0) {
      currentSpeed = speed * 2.237;
    }

    // FIXED: Better speed smoothing
    this.speedReadings.push(currentSpeed);
    if (this.speedReadings.length > 5) {
      this.speedReadings.shift();
    }
    
    const avgSpeed = this.speedReadings.reduce((a, b) => a + b, 0) / this.speedReadings.length;

    // Update UI
    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: avgSpeed, accuracy });
    }

    // FIXED: PROPER PATH TRACKING - Always add to path during trip
    if (this.currentTrip) {
      this.tripPath.push({ 
        latitude, 
        longitude, 
        timestamp, 
        speed: avgSpeed,
        accuracy 
      });
    }

    // AUTO-DETECTION LOGIC
    if (!this.currentTrip) {
      // FIXED: Return trip detection - continues monitoring
      if (avgSpeed > 8 && this.speedReadings.length >= 3) {
        this.movingCount++;
        this.onStatusUpdate(`Movement detected: ${avgSpeed.toFixed(1)} mph (${this.movingCount}/3)`);
        
        if (this.movingCount >= 3) {
          this.startTrip(latitude, longitude, avgSpeed);
        }
      } else {
        this.movingCount = 0;
        if (avgSpeed > 1) {
          this.onStatusUpdate(`Monitoring: ${avgSpeed.toFixed(1)} mph • ${accuracy.toFixed(0)}m accuracy`);
        } else {
          this.onStatusUpdate(`Ready - Monitoring for movement`);
        }
      }
    } else {
      // FIXED: TIME-BASED STOPPING LOGIC
      if (avgSpeed < 1.5) {
        if (this.stationaryStartTime === null) {
          this.stationaryStartTime = timestamp;
        }
        
        const stationarySeconds = (timestamp - this.stationaryStartTime) / 1000;
        const stationaryMinutes = Math.floor(stationarySeconds / 60);
        
        if (stationarySeconds < 60) {
          this.onStatusUpdate(`Trip: ${avgSpeed.toFixed(1)} mph • Stationary ${stationarySeconds.toFixed(0)}s`);
        } else {
          this.onStatusUpdate(`Trip: ${avgSpeed.toFixed(1)} mph • Stationary ${stationaryMinutes}m ${(stationarySeconds % 60).toFixed(0)}s`);
        }
        
        // FIXED: Auto-stop after 2 minutes (120 seconds)
        if (stationarySeconds >= 120) {
          this.endTrip(latitude, longitude);
        }
      } else {
        // Moving again - reset stationary timer
        this.stationaryStartTime = null;
        const distance = this.calculateTripDistance();
        this.onStatusUpdate(`Trip active: ${avgSpeed.toFixed(1)} mph • ${distance.toFixed(1)} miles`);
      }
    }

    this.lastPosition = { latitude, longitude, timestamp, speed: avgSpeed };
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
    
    // FIXED: Initialize path tracking
    this.tripPath = [{ latitude, longitude, timestamp: Date.now(), speed, accuracy: 0 }];
    this.stationaryStartTime = null;
    this.movingCount = 0;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`Trip started at ${speed.toFixed(1)} mph!`);
  }

  endTrip(latitude, longitude) {
    if (!this.currentTrip) return;

    // FIXED: Use path-based distance calculation
    const distance = this.calculateTripDistance();
    const duration = (Date.now() - new Date(this.currentTrip.startTime).getTime()) / 60000;

    // FIXED: Save trips over 0.1 miles (more sensitive)
    if (distance > 0.1) {
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
        path: [...this.tripPath] // Save the complete path
      };

      this.onTripEnd(completedTrip);
      this.onStatusUpdate(`Trip saved: ${distance.toFixed(1)} miles in ${duration.toFixed(0)} minutes`);
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
    }

    // FIXED: Reset for next trip but keep monitoring active
    this.currentTrip = null;
    this.tripPath = [];
    this.stationaryStartTime = null;
    this.movingCount = 0; // Reset for next trip detection
  }

  // FIXED: ACCURATE DISTANCE CALCULATION - CRITICAL: Use path-based calculation - matches MileIQ standard
  calculateTripDistance() {
    if (!this.tripPath || this.tripPath.length < 2) {
      return 0;
    }
    
    let totalDistance = 0;
    
    // Calculate distance between consecutive GPS points
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      
      // Skip points that are too close (GPS noise)
      const segmentDistance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      // Only add meaningful distance segments
      if (segmentDistance > 5 && segmentDistance < 1000) { // 5m to 1km segments
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
  console.log('GPS PRODUCTION FIX - Distance + Auto-stop + Return trip detection');
  
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
    gpsService.current = new FixedProductionGPSService(
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
      'Auto-stop will occur after 2 minutes stationary. End trip now?',
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
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>GPS Fix</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Auto-Detection</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
              Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
            </Text>
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
                Trip Active • Auto-stops after 2min stationary • Tap to end now
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
  locationInfo: { fontSize: 14, marginBottom: 15 },
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
