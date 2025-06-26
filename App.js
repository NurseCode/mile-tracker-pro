import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform, AppState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundGeolocation from 'react-native-background-geolocation';

class ProfessionalGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.isActive = false;
    this.currentTrip = null;
    this.tripPath = [];
    this.state = 'monitoring';
    this.detectionCount = 0;
    this.stationaryStartTime = null;
    this.lastPosition = null;
    this.movingStartTime = null;
    this.STATIONARY_TIMEOUT = 5; // 5 minutes
    this.MIN_TRIP_DISTANCE = 0.5; // 0.5 miles minimum
  }

  async initialize() {
    try {
      this.onStatusUpdate('Initializing professional background geolocation...');
      
      // Configure BackgroundGeolocation with professional settings
      await BackgroundGeolocation.ready({
        // Core Configuration
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: 10, // meters
        locationTimeout: 60,
        
        // Activity Recognition for battery efficiency
        stopTimeout: 5, // minutes
        heartbeatInterval: 60, // seconds
        preventSuspend: true,
        
        // Background & Persistence
        stopOnTerminate: false, // Continue after app closure
        startOnBoot: true, // Start automatically on device boot
        enableHeadless: true, // Handle events when app terminated
        
        // Database & HTTP
        autoSync: true,
        maxDaysToPersist: 7,
        
        // Geofencing & Motion
        isMoving: false,
        
        // Android specific
        foregroundService: true,
        notification: {
          title: "MileTracker Pro",
          text: "Tracking business mileage in background",
          color: "#667eea"
        }
      });

      // Event Listeners
      BackgroundGeolocation.onLocation(this.handleLocationUpdate.bind(this));
      BackgroundGeolocation.onMotionChange(this.handleMotionChange.bind(this));
      BackgroundGeolocation.onActivityChange(this.handleActivityChange.bind(this));
      BackgroundGeolocation.onHeartbeat(this.handleHeartbeat.bind(this));
      BackgroundGeolocation.onGeofence(this.handleGeofence.bind(this));

      this.onStatusUpdate('Professional background geolocation initialized successfully');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS initialization failed: ${error.message}`);
      return false;
    }
  }

  async startMonitoring() {
    try {
      this.onStatusUpdate('Starting professional background monitoring...');
      
      // Start background geolocation
      await BackgroundGeolocation.start();
      
      this.isActive = true;
      this.state = 'monitoring';
      this.onStatusUpdate('Background monitoring active - "Set it and forget it" mode enabled');
      
      return true;
    } catch (error) {
      this.onStatusUpdate(`Failed to start monitoring: ${error.message}`);
      return false;
    }
  }

  async stopMonitoring() {
    try {
      await BackgroundGeolocation.stop();
      this.isActive = false;
      this.state = 'idle';
      
      if (this.currentTrip) {
        await this.endCurrentTrip();
      }
      
      this.onStatusUpdate('Background monitoring stopped');
      return true;
    } catch (error) {
      this.onStatusUpdate(`Failed to stop monitoring: ${error.message}`);
      return false;
    }
  }

  handleLocationUpdate(location) {
    try {
      const { latitude, longitude, speed, timestamp } = location.coords || location;
      
      this.onLocationUpdate({
        latitude,
        longitude,
        speed: speed || 0,
        accuracy: location.accuracy || 0,
        timestamp: new Date(timestamp).toLocaleTimeString()
      });

      this.processLocationForTrips(location);
    } catch (error) {
      console.error('Location update error:', error);
    }
  }

  handleMotionChange(event) {
    try {
      const { isMoving, location } = event;
      
      if (isMoving) {
        this.onStatusUpdate('Motion detected - Starting trip tracking');
        if (!this.currentTrip && location) {
          this.startTrip(location.coords.latitude, location.coords.longitude, location.coords.speed || 0, Date.now());
        }
      } else {
        this.onStatusUpdate('Stationary detected - Monitoring for trip end');
        this.scheduleAutoEnd();
      }
    } catch (error) {
      console.error('Motion change error:', error);
    }
  }

  handleActivityChange(event) {
    try {
      const { activity, confidence } = event;
      
      // Only consider high-confidence vehicle activity for trip detection
      if (activity === 'in_vehicle' && confidence > 75) {
        this.onStatusUpdate('Vehicle activity detected - High confidence trip');
        if (!this.currentTrip) {
          this.confirmTripStart();
        }
      }
    } catch (error) {
      console.error('Activity change error:', error);
    }
  }

  handleHeartbeat(params) {
    try {
      const { location } = params;
      
      if (location && this.currentTrip) {
        this.processLocationForTrips(location);
      }
      
      // Maintain background operation
      this.onStatusUpdate('Background heartbeat - System active');
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  handleGeofence(event) {
    // Optional: Implement geofence-based trip detection
    console.log('Geofence event:', event);
  }

  processLocationForTrips(location) {
    const { latitude, longitude, speed, timestamp } = location.coords || location;
    const currentTime = Date.now();
    
    // Add location to trip path
    if (this.currentTrip) {
      this.tripPath.push({ latitude, longitude, timestamp: currentTime });
    }

    // Speed-based trip detection (backup to motion detection)
    const speedMph = (speed || 0) * 2.237; // m/s to mph
    
    if (speedMph > 8 && !this.currentTrip) {
      // High speed detected without active trip
      this.startTrip(latitude, longitude, speedMph, currentTime);
    } else if (speedMph < 3 && this.currentTrip) {
      // Low speed with active trip - potential end
      if (!this.stationaryStartTime) {
        this.stationaryStartTime = currentTime;
      } else if (currentTime - this.stationaryStartTime > this.STATIONARY_TIMEOUT * 60 * 1000) {
        this.endCurrentTrip();
      }
    } else if (speedMph > 5 && this.currentTrip) {
      // Reset stationary timer if moving again
      this.stationaryStartTime = null;
    }
  }

  startTrip(latitude, longitude, speed, timestamp) {
    if (this.currentTrip) return;

    this.currentTrip = {
      id: Date.now(),
      startTime: timestamp,
      startLatitude: latitude,
      startLongitude: longitude,
      startSpeed: speed,
      endTime: null,
      endLatitude: null,
      endLongitude: null,
      distance: 0,
      category: 'Business',
      client: '',
      purpose: ''
    };

    this.tripPath = [{ latitude, longitude, timestamp }];
    this.stationaryStartTime = null;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`Trip started - Background tracking active`);
  }

  confirmTripStart() {
    // Called when vehicle activity is detected to confirm trip
    if (this.currentTrip) {
      this.onStatusUpdate('Trip confirmed by vehicle activity detection');
    }
  }

  scheduleAutoEnd() {
    // Schedule automatic trip ending after stationary period
    setTimeout(() => {
      if (this.currentTrip && this.stationaryStartTime) {
        const stationaryDuration = Date.now() - this.stationaryStartTime;
        if (stationaryDuration > this.STATIONARY_TIMEOUT * 60 * 1000) {
          this.endCurrentTrip();
        }
      }
    }, (this.STATIONARY_TIMEOUT + 1) * 60 * 1000);
  }

  async endCurrentTrip() {
    if (!this.currentTrip) return;

    const endTime = Date.now();
    const distance = this.calculateTripDistance();
    
    // Only save trips above minimum distance
    if (distance >= this.MIN_TRIP_DISTANCE) {
      this.currentTrip.endTime = endTime;
      this.currentTrip.distance = distance;
      
      if (this.tripPath.length > 0) {
        const lastLocation = this.tripPath[this.tripPath.length - 1];
        this.currentTrip.endLatitude = lastLocation.latitude;
        this.currentTrip.endLongitude = lastLocation.longitude;
      }

      this.onTripEnd(this.currentTrip);
      this.onStatusUpdate(`Trip completed: ${distance.toFixed(1)} miles`);
    } else {
      this.onStatusUpdate(`Trip too short (${distance.toFixed(1)} mi) - Not saved`);
    }

    // Reset trip state
    this.currentTrip = null;
    this.tripPath = [];
    this.stationaryStartTime = null;
  }

  calculateTripDistance() {
    if (this.tripPath.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      totalDistance += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }

    return totalDistance;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async getStoredLocations() {
    try {
      const locations = await BackgroundGeolocation.getLocations();
      return locations;
    } catch (error) {
      console.error('Error getting stored locations:', error);
      return [];
    }
  }

  async clearStoredLocations() {
    try {
      await BackgroundGeolocation.destroyLocations();
      this.onStatusUpdate('Stored locations cleared');
    } catch (error) {
      console.error('Error clearing locations:', error);
    }
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [gpsStatus, setGpsStatus] = useState('Initializing...');
  const [autoMode, setAutoMode] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const gpsService = useRef(null);

  // Trip form state
  const [tripForm, setTripForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business',
    client: '',
    purpose: ''
  });

  const categories = ['Business', 'Medical', 'Charity', 'Personal'];
  const clients = ['ABC Company', 'XYZ Corp', 'Smith & Associates', 'Johnson LLC', 'Other'];

  useEffect(() => {
    initializeApp();
    loadTrips();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize GPS service
      gpsService.current = new ProfessionalGPSService(
        handleTripStart,
        handleTripEnd,
        handleStatusUpdate,
        handleLocationUpdate
      );

      const initialized = await gpsService.current.initialize();
      
      if (initialized && autoMode) {
        await gpsService.current.startMonitoring();
        setIsTracking(true);
      }
    } catch (error) {
      setGpsStatus(`Initialization failed: ${error.message}`);
    }
  };

  const handleTripStart = (trip) => {
    setGpsStatus('Trip started automatically');
    // Trip will be added when ended
  };

  const handleTripEnd = (trip) => {
    setTrips(prev => [trip, ...prev]);
    saveTrips([trip, ...trips]);
    setGpsStatus('Trip completed and saved');
  };

  const handleStatusUpdate = (status) => {
    setGpsStatus(status);
  };

  const handleLocationUpdate = (location) => {
    setCurrentLocation(location);
  };

  const toggleAutoMode = async () => {
    try {
      if (autoMode) {
        // Switching to manual mode
        await gpsService.current?.stopMonitoring();
        setIsTracking(false);
        setAutoMode(false);
        setGpsStatus('Manual mode - Use START/STOP buttons');
      } else {
        // Switching to auto mode
        await gpsService.current?.startMonitoring();
        setIsTracking(true);
        setAutoMode(true);
        setGpsStatus('Auto mode - Background monitoring active');
      }
    } catch (error) {
      setGpsStatus(`Mode switch failed: ${error.message}`);
    }
  };

  const loadTrips = async () => {
    try {
      const stored = await AsyncStorage.getItem('miletracker_trips');
      if (stored) {
        setTrips(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const saveTrips = async (tripsToSave) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(tripsToSave));
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  };

  const addManualTrip = () => {
    const newTrip = {
      id: Date.now(),
      startTime: new Date(tripForm.date).getTime(),
      endTime: new Date(tripForm.date).getTime() + 3600000, // 1 hour later
      distance: parseFloat(tripForm.distance) || 0,
      category: tripForm.category,
      client: tripForm.client,
      purpose: tripForm.purpose,
      startLocation: tripForm.startLocation,
      endLocation: tripForm.endLocation,
      method: 'Manual'
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
    setShowAddTripModal(false);
    
    // Reset form
    setTripForm({
      date: new Date().toISOString().split('T')[0],
      startLocation: '',
      endLocation: '',
      distance: '',
      category: 'Business',
      client: '',
      purpose: ''
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateDeductions = () => {
    const rates = { Business: 0.70, Medical: 0.21, Charity: 0.14 };
    let totalDeduction = 0;
    
    trips.forEach(trip => {
      if (rates[trip.category]) {
        totalDeduction += trip.distance * rates[trip.category];
      }
    });
    
    return totalDeduction;
  };

  const getTotalMiles = () => {
    return trips.reduce((total, trip) => total + trip.distance, 0);
  };

  const renderHome = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Professional Background Tracking - $4.99/month</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{trips.length}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{getTotalMiles().toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${calculateDeductions().toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>IRS Tax</Text>
          </View>
        </View>
      </View>

      <View style={styles.trackingCard}>
        <View style={styles.trackingHeader}>
          <Text style={styles.trackingTitle}>Background Tracking</Text>
          <Switch
            value={autoMode}
            onValueChange={toggleAutoMode}
            trackColor={{ false: '#767577', true: '#667eea' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        
        <Text style={styles.modeExplanation}>
          Auto: Detects driving automatically • Manual: Full start/stop control
        </Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{gpsStatus}</Text>
          {currentLocation && (
            <Text style={styles.locationText}>
              Speed: {(currentLocation.speed * 2.237).toFixed(1)}mph • 
              Accuracy: {currentLocation.accuracy.toFixed(0)}m
            </Text>
          )}
        </View>

        {!autoMode && (
          <TouchableOpacity style={styles.manualButton} onPress={() => Alert.alert('Manual Control', 'Manual trip controls will be available in next update')}>
            <Text style={styles.manualButtonText}>🚗 START TRIP NOW</Text>
            <Text style={styles.manualSubtext}>Instant tracking control</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddTripModal(true)}>
        <Text style={styles.addButtonText}>+ Add Manual Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Trip History</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{formatTime(item.startTime)}</Text>
              <Text style={styles.tripCategory}>{item.category}</Text>
            </View>
            <Text style={styles.tripRoute}>
              {item.startLocation || 'Start'} → {item.endLocation || 'End'}
            </Text>
            <View style={styles.tripDetails}>
              <Text style={styles.tripDistance}>{item.distance.toFixed(1)} miles</Text>
              <Text style={styles.tripDeduction}>
                ${(item.distance * (item.category === 'Business' ? 0.70 : item.category === 'Medical' ? 0.21 : 0.14)).toFixed(2)}
              </Text>
            </View>
            {item.client && <Text style={styles.tripClient}>Client: {item.client}</Text>}
            {item.purpose && <Text style={styles.tripPurpose}>{item.purpose}</Text>}
          </View>
        )}
        scrollEnabled={false}
      />
    </ScrollView>
  );

  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Export & Reports</Text>
      </View>

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>📊 Tax Documentation</Text>
        <Text style={styles.exportSubtitle}>
          Professional reports for taxes, employee reimbursements, and contractor payments
        </Text>
        
        <TouchableOpacity style={styles.exportButton} onPress={() => Alert.alert('Export', 'CSV export functionality available in full version')}>
          <Text style={styles.exportButtonText}>📄 Export CSV Report</Text>
        </TouchableOpacity>

        <View style={styles.deductionBreakdown}>
          <Text style={styles.deductionTitle}>IRS Deduction Calculation:</Text>
          <Text style={styles.deductionText}>Business trips: ${(trips.filter(t => t.category === 'Business').reduce((sum, t) => sum + t.distance, 0) * 0.70).toFixed(2)} ($0.70/mi)</Text>
          <Text style={styles.deductionText}>Medical trips: ${(trips.filter(t => t.category === 'Medical').reduce((sum, t) => sum + t.distance, 0) * 0.21).toFixed(2)} ($0.21/mi)</Text>
          <Text style={styles.deductionText}>Charity trips: ${(trips.filter(t => t.category === 'Charity').reduce((sum, t) => sum + t.distance, 0) * 0.14).toFixed(2)} ($0.14/mi)</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.app}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      {currentView === 'home' && renderHome()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, currentView === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={[styles.navButtonText, currentView === 'home' && styles.navButtonTextActive]}>
            🏠 Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navButtonText, currentView === 'trips' && styles.navButtonTextActive]}>
            🚗 Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, currentView === 'export' && styles.navButtonActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navButtonText, currentView === 'export' && styles.navButtonTextActive]}>
            📊 Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Trip Modal */}
      <Modal visible={showAddTripModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={tripForm.startLocation}
              onChangeText={(text) => setTripForm({...tripForm, startLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={tripForm.endLocation}
              onChangeText={(text) => setTripForm({...tripForm, endLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={tripForm.distance}
              onChangeText={(text) => setTripForm({...tripForm, distance: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Purpose (optional)"
              value={tripForm.purpose}
              onChangeText={(text) => setTripForm({...tripForm, purpose: text})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddTripModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addManualTrip}>
                <Text style={styles.saveButtonText}>Save Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  trackingCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeExplanation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  statusContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  manualButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#667eea',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripCategory: {
    fontSize: 12,
    color: '#667eea',
    backgroundColor: 'rgba(102,126,234,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 14,
    color: '#333',
  },
  tripDeduction: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  tripClient: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  tripPurpose: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    marginBottom: 8,
  },
  exportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  exportButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deductionBreakdown: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  deductionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deductionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonActive: {
    backgroundColor: 'rgba(102,126,234,0.1)',
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 12,
    color: '#666',
  },
  navButtonTextActive: {
    color: '#667eea',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    flex: 0.45,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    flex: 0.45,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
