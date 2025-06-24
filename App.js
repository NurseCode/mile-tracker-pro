// MileTracker Pro v20.6 - COMPETITIVE GPS: Full auto-detection using react-native-geolocation-service
// Market competitive with MileIQ - automatic trip detection without expo-location conflicts

import React, { Component, useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, Image, Dimensions, PermissionsAndroid, Platform, AppState 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

// ERROR BOUNDARY COMPONENT
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 20, backgroundColor: '#f8f9fa' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#dc3545', marginBottom: 20 }}>
            App Error Detected
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>
            Error: {this.state.error && this.state.error.toString()}
          </Text>
          <ScrollView style={{ backgroundColor: '#e9ecef', padding: 10, borderRadius: 5 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {this.state.errorInfo.componentStack}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={{ backgroundColor: '#007bff', padding: 15, borderRadius: 5, marginTop: 20 }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ADVANCED GPS AUTO-DETECTION SERVICE - Competitive with MileIQ
class AdvancedGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.watchId = null;
    this.isTracking = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.speedReadings = [];
    this.stationaryCount = 0;
    this.movingCount = 0;
    this.tripPath = [];
    this.backgroundTracking = false;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ]);
        
        const fineLocation = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const backgroundLocation = granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION];
        
        if (fineLocation === PermissionsAndroid.RESULTS.GRANTED) {
          this.backgroundTracking = backgroundLocation === PermissionsAndroid.RESULTS.GRANTED;
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  }

  async startMonitoring() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.onStatusUpdate('Location permission denied - Enable in settings for auto-detection');
      return false;
    }

    // High accuracy configuration for competitive detection
    const config = {
      accuracy: {
        android: 'high',
        ios: 'bestForNavigation',
      },
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000,
      interval: 10000, // Check every 10 seconds
      fastestInterval: 5000, // Minimum 5 seconds between updates
      distanceFilter: 5, // Only update when moved 5 meters
      showLocationDialog: true,
      forceRequestLocation: true,
      forceLocationManager: false,
    };

    this.watchId = Geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => {
        console.log('GPS Error:', error);
        this.handleLocationError(error);
      },
      config
    );

    this.onStatusUpdate('Advanced GPS monitoring active - Competitive detection enabled');
    return true;
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.onStatusUpdate('GPS monitoring stopped');
  }

  handleLocationError(error) {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        this.onStatusUpdate('GPS permission denied - Check settings');
        break;
      case 2: // POSITION_UNAVAILABLE
        this.onStatusUpdate('GPS unavailable - Check location services');
        break;
      case 3: // TIMEOUT
        this.onStatusUpdate('GPS timeout - Retrying...');
        break;
      default:
        this.onStatusUpdate('GPS error - Check device settings');
        break;
    }
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy, heading } = position.coords;
    const currentTime = Date.now();
    
    // Filter out inaccurate readings (accuracy > 50 meters)
    if (accuracy > 50) {
      this.onStatusUpdate(`GPS accuracy poor (${accuracy.toFixed(0)}m) - Waiting for better signal`);
      return;
    }

    // Calculate speed if not provided by GPS
    let speedMph = 0;
    if (speed !== null && speed >= 0) {
      speedMph = speed * 2.237; // m/s to mph
    } else if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeElapsed = (currentTime - this.lastPosition.timestamp) / 1000;
      if (timeElapsed > 0) {
        speedMph = (distance / timeElapsed) * 2.237;
      }
    }

    // Smooth speed readings to avoid false positives
    this.speedReadings.push(speedMph);
    if (this.speedReadings.length > 8) {
      this.speedReadings.shift();
    }

    // Calculate moving average for stability
    const avgSpeed = this.speedReadings.reduce((a, b) => a + b, 0) / this.speedReadings.length;
    
    // Advanced trip detection logic - competitive with MileIQ
    if (!this.isTracking) {
      // Start trip detection: consistent movement > 8 mph for competitive accuracy
      if (avgSpeed > 8 && this.speedReadings.length >= 3) {
        this.movingCount++;
        if (this.movingCount >= 3) { // 3 consecutive readings above threshold
          this.startTrip(latitude, longitude, avgSpeed);
        }
        this.onStatusUpdate(`Movement detected: ${avgSpeed.toFixed(1)} mph (${this.movingCount}/3)`);
      } else {
        this.movingCount = 0;
        this.onStatusUpdate(`Monitoring: ${avgSpeed.toFixed(1)} mph • Accuracy: ${accuracy.toFixed(0)}m`);
      }
    } else {
      // Trip in progress - track path and detect end
      this.tripPath.push({
        latitude,
        longitude,
        speed: speedMph,
        timestamp: currentTime,
        accuracy
      });

      if (avgSpeed < 2) { // Stationary detection
        this.stationaryCount++;
        this.onStatusUpdate(`Trip active: ${avgSpeed.toFixed(1)} mph • Stationary ${this.stationaryCount}/5`);
        
        if (this.stationaryCount >= 5) { // 5 consecutive low-speed readings
          this.endTrip(latitude, longitude);
        }
      } else {
        this.stationaryCount = 0; // Reset if moving again
        this.onStatusUpdate(`Trip active: ${avgSpeed.toFixed(1)} mph • Distance: ${this.calculateTripDistance().toFixed(1)}mi`);
      }
    }

    this.lastPosition = {
      latitude,
      longitude,
      timestamp: currentTime,
      speed: speedMph,
      accuracy
    };
  }

  startTrip(latitude, longitude, speed) {
    this.isTracking = true;
    this.stationaryCount = 0;
    this.movingCount = 0;
    this.tripPath = [{
      latitude,
      longitude,
      speed,
      timestamp: Date.now(),
      accuracy: this.lastPosition?.accuracy || 10
    }];

    this.currentTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startLatitude: latitude,
      startLongitude: longitude,
      startLocation: 'GPS Location',
      category: 'Business',
      autoDetected: true
    };
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`Trip started automatically at ${speed.toFixed(1)} mph!`);
  }

  endTrip(latitude, longitude) {
    if (!this.currentTrip || this.tripPath.length === 0) return;

    const distance = this.calculateTripDistance();
    const duration = (Date.now() - new Date(this.currentTrip.startTime).getTime()) / 1000 / 60; // minutes

    // Only save significant trips (> 0.3 miles or > 2 minutes) to match MileIQ behavior
    if (distance > 0.3 || duration > 2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        duration: duration,
        maxSpeed: Math.max(...this.tripPath.map(p => p.speed)),
        avgSpeed: this.tripPath.reduce((sum, p) => sum + p.speed, 0) / this.tripPath.length,
        purpose: `Auto-detected trip (${distance.toFixed(1)}mi, ${duration.toFixed(0)}min)`,
        date: new Date().toISOString(),
        receipts: [],
        gpsPath: this.tripPath.length > 50 ? this.tripPath.filter((_, i) => i % 3 === 0) : this.tripPath // Optimize storage
      };

      this.onTripEnd(completedTrip);
      this.onStatusUpdate(`Trip completed: ${distance.toFixed(1)}mi in ${duration.toFixed(0)}min`);
    } else {
      this.onStatusUpdate(`Short trip discarded (${distance.toFixed(1)}mi) - Monitoring resumed`);
    }

    this.isTracking = false;
    this.currentTrip = null;
    this.tripPath = [];
    this.stationaryCount = 0;
  }

  calculateTripDistance() {
    if (this.tripPath.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      totalDistance += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    
    return totalDistance * 0.000621371; // Convert meters to miles
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula - precise distance calculation
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// COLOR THEMES
const COLOR_THEMES = {
  periwinkle: {
    primary: '#667eea',
    secondary: '#764ba2', 
    accent: '#a8b8ff',
    surface: '#ffffff',
    background: '#f8f9ff',
    text: '#2d3748',
    textSecondary: '#718096'
  },
  mileiq: {
    primary: '#00a86b',
    secondary: '#008555',
    accent: '#4dc994',
    surface: '#ffffff',
    background: '#f0fff8',
    text: '#2d3748',
    textSecondary: '#718096'
  }
};

// MAIN APP COMPONENT
function App() {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: '',
    category: 'Business',
    client: null
  });

  const [manualTripModal, setManualTripModal] = useState(false);
  const [autoDetection, setAutoDetection] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState('Initializing advanced GPS...');
  const gpsService = useRef(null);
  
  const [currentTheme, setCurrentTheme] = useState('periwinkle');
  const colors = COLOR_THEMES[currentTheme];
  
  const clients = [
    { id: 1, name: 'ABC Company', color: '#4CAF50' },
    { id: 2, name: 'XYZ Corp', color: '#2196F3' },
    { id: 3, name: 'Tech Solutions', color: '#FF9800' }
  ];
  
  const categories = [
    { key: 'Business', rate: 0.70, color: '#4CAF50' },
    { key: 'Medical', rate: 0.21, color: '#2196F3' },
    { key: 'Charity', rate: 0.14, color: '#FF9800' },
    { key: 'Personal', rate: 0.00, color: '#9E9E9E' }
  ];

  // Initialize GPS service and load data
  useEffect(() => {
    loadSampleTrips();
    initializeAdvancedGPS();
    
    // Handle app state changes for background tracking
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && gpsService.current && autoDetection) {
        // Resume monitoring when app becomes active
        gpsService.current.startMonitoring();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      if (gpsService.current) {
        gpsService.current.stopMonitoring();
      }
      subscription?.remove();
    };
  }, []);

  // Handle auto-detection toggle
  useEffect(() => {
    if (autoDetection && gpsService.current) {
      gpsService.current.startMonitoring();
    } else if (!autoDetection && gpsService.current) {
      gpsService.current.stopMonitoring();
      setDetectionStatus('Manual mode - Auto detection disabled');
    }
  }, [autoDetection]);

  const initializeAdvancedGPS = () => {
    gpsService.current = new AdvancedGPSService(
      (trip) => {
        setCurrentTrip(trip);
        setIsTracking(true);
      },
      (completedTrip) => {
        setTrips(prevTrips => [completedTrip, ...prevTrips]);
        setCurrentTrip(null);
        setIsTracking(false);
      },
      (status) => {
        setDetectionStatus(status);
      }
    );

    if (autoDetection) {
      gpsService.current.startMonitoring();
    }
  };

  const loadSampleTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        // Load initial sample trips
        const sampleTrips = [
          {
            id: '1',
            startLocation: 'Home Office',
            endLocation: 'Client Meeting Downtown',
            distance: 15.2,
            purpose: 'Client consultation and project planning',
            category: 'Business',
            client: clients[0],
            date: new Date(2025, 5, 20).toISOString(),
            receipts: [],
            autoDetected: false
          }
        ];
        setTrips(sampleTrips);
        await AsyncStorage.setItem('miletracker_trips', JSON.stringify(sampleTrips));
      }
    } catch (error) {
      console.log('Error loading trips:', error);
    }
  };

  const saveTrips = async (newTrips) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(newTrips));
    } catch (error) {
      console.log('Error saving trips:', error);
    }
  };

  const addManualTrip = () => {
    try {
      if (!formData.startLocation || !formData.endLocation || !formData.distance) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }

      const newTrip = {
        id: Date.now().toString(),
        ...formData,
        distance: parseFloat(formData.distance),
        date: new Date().toISOString(),
        receipts: [],
        autoDetected: false
      };

      const updatedTrips = [newTrip, ...trips];
      setTrips(updatedTrips);
      saveTrips(updatedTrips);
      
      setManualTripModal(false);
      setFormData({
        startLocation: '',
        endLocation: '',
        distance: '',
        purpose: '',
        category: 'Business',
        client: null
      });
      
      Alert.alert('Success', 'Trip added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add trip: ' + error.message);
    }
  };

  const exportTrips = async () => {
    try {
      const csvContent = generateCSVContent();
      const fileName = `miletracker_competitive_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', 'CSV file saved to device');
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export trips: ' + error.message);
    }
  };

  const generateCSVContent = () => {
    const header = 'Date,Start Location,End Location,Distance (mi),Category,Purpose,Client,IRS Rate,Tax Deduction,Auto-Detected,Max Speed,Avg Speed\n';
    const rows = trips.map(trip => {
      const category = categories.find(cat => cat.key === trip.category);
      const rate = category ? category.rate : 0;
      const deduction = (trip.distance * rate).toFixed(2);
      
      return [
        new Date(trip.date).toLocaleDateString(),
        trip.startLocation,
        trip.endLocation,
        trip.distance.toFixed(1),
        trip.category,
        trip.purpose || '',
        trip.client?.name || '',
        `$${rate.toFixed(2)}`,
        `$${deduction}`,
        trip.autoDetected ? 'Yes' : 'No',
        trip.maxSpeed ? `${trip.maxSpeed.toFixed(1)} mph` : '',
        trip.avgSpeed ? `${trip.avgSpeed.toFixed(1)} mph` : ''
      ].join(',');
    }).join('\n');
    
    return header + rows;
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

  const renderDashboard = () => {
    const { totalTrips, autoTrips, totalMiles, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
          <Text style={[styles.headerSubtitle, { color: colors.surface }]}>
            🎯 Advanced GPS • Competitive with MileIQ
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>June 2025 Summary</Text>
          <View style={styles.summaryRow}>
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
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mi</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>${totalDeduction.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IRS</Text>
            </View>
          </View>
        </View>

        <View style={styles.controlsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Advanced GPS Control</Text>
          
          <View style={styles.modeToggle}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Auto Detection: </Text>
            <Text style={[styles.toggleValue, { color: colors.primary }]}>
              {autoDetection ? 'Active' : 'Disabled'}
            </Text>
            <Switch
              value={autoDetection}
              onValueChange={setAutoDetection}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
            />
          </View>

          <View style={[styles.trackingCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.trackingStatus, { color: colors.text }]}>
              {detectionStatus}
            </Text>
            
            {isTracking && (
              <Text style={[styles.trackingAlert, { color: '#00a86b' }]}>
                🚗 Trip in progress - Auto detection active
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.headerTitle, { color: colors.surface }]}>Trip History</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setManualTripModal(true)}
          >
            <Text style={[styles.addButtonText, { color: colors.surface }]}>+ Add</Text>
          </TouchableOpacity>
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
                {item.maxSpeed && (
                  <Text style={[styles.tripSpeed, { color: colors.textSecondary }]}>
                    Max: {item.maxSpeed.toFixed(0)} mph
                  </Text>
                )}
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

  const renderExport = () => {
    const { totalTrips, autoTrips, totalMiles, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[styles.headerTitle, { color: colors.surface }]}>Export & Reports</Text>
        </View>

        <View style={[styles.exportCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.exportTitle, { color: colors.text }]}>Competitive Analytics</Text>
          
          <View style={styles.exportStats}>
            <Text style={[styles.exportStat, { color: colors.textSecondary }]}>
              Total Trips: {totalTrips} ({autoTrips} auto-detected)
            </Text>
            <Text style={[styles.exportStat, { color: colors.textSecondary }]}>
              Total Miles: {totalMiles.toFixed(1)}
            </Text>
            <Text style={[styles.exportStat, { color: colors.textSecondary }]}>
              Tax Deduction: ${totalDeduction.toFixed(2)}
            </Text>
            <Text style={[styles.exportStat, { color: '#00a86b' }]}>
              Auto-Detection Rate: {totalTrips > 0 ? ((autoTrips / totalTrips) * 100).toFixed(0) : 0}%
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={exportTrips}
          >
            <Text style={[styles.exportButtonText, { color: colors.surface }]}>
              📊 Export Competitive Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderBottomNav = () => (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'home' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('home')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'home' ? colors.surface : colors.textSecondary }]}>🏠</Text>
        <Text style={[styles.navLabel, { color: currentView === 'home' ? colors.surface : colors.textSecondary }]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'trips' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('trips')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>🚗</Text>
        <Text style={[styles.navLabel, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>Trips</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'export' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('export')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'export' ? colors.surface : colors.textSecondary }]}>📊</Text>
        <Text style={[styles.navLabel, { color: currentView === 'export' ? colors.surface : colors.textSecondary }]}>Export</Text>
      </TouchableOpacity>
    </View>
  );

  const renderManualTripModal = () => (
    <Modal visible={manualTripModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Manual Trip</Text>
          
          <ScrollView style={styles.modalForm}>
            <TextInput
              style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
              placeholder="Start Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.startLocation}
              onChangeText={(text) => setFormData({...formData, startLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
              placeholder="End Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.endLocation}
              onChangeText={(text) => setFormData({...formData, endLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
              placeholder="Distance (miles)"
              placeholderTextColor={colors.textSecondary}
              value={formData.distance}
              onChangeText={(text) => setFormData({...formData, distance: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
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
                onPress={() => setManualTripModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={addManualTrip}
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
    <ErrorBoundary>
      <View style={styles.app}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        
        {currentView === 'home' && renderDashboard()}
        {currentView === 'trips' && renderTrips()}
        {currentView === 'export' && renderExport()}
        
        {renderBottomNav()}
        {renderManualTripModal()}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: {
    fontSize: 11,
    opacity: 0.9,
    position: 'absolute',
    bottom: 5,
    left: 20,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold' },
  summaryCard: { margin: 20, padding: 20, borderRadius: 12, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, marginTop: 5 },
  controlsSection: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modeToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  toggleLabel: { fontSize: 16 },
  toggleValue: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  trackingCard: { padding: 20, borderRadius: 12, elevation: 2 },
  trackingStatus: { fontSize: 14, marginBottom: 10, textAlign: 'center' },
  trackingAlert: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
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
  tripSpeed: { fontSize: 12 },
  tripPurpose: { fontSize: 14, fontStyle: 'italic' },
  exportCard: { margin: 20, padding: 20, borderRadius: 12, elevation: 2 },
  exportTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  exportStats: { marginBottom: 20 },
  exportStat: { fontSize: 16, marginBottom: 5 },
  exportButton: { padding: 15, borderRadius: 8, alignItems: 'center' },
  exportButtonText: { fontSize: 16, fontWeight: 'bold' },
  bottomNav: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 20, borderTopWidth: 1 },
  navButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 5 },
  navIcon: { fontSize: 20, marginBottom: 5 },
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

export default App;
