import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StatusBar,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const { MileTrackerGPS } = NativeModules;

export default function App() {
  // State management
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Trip form state
  const [tripForm, setTripForm] = useState({
    distance: '',
    category: 'Business',
    purpose: '',
    client: 'Personal'
  });

  // Settings state
  const [settings, setSettings] = useState({
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    autoMode: true
  });

  // Monthly summary state
  const [monthlyStats, setMonthlyStats] = useState({
    totalTrips: 0,
    totalMiles: 0,
    businessMiles: 0,
    medicalMiles: 0,
    charityMiles: 0,
    totalDeduction: 0
  });

  // Load data on app start
  useEffect(() => {
    loadTrips();
    loadSettings();
    initializeGPS();
    
    // Set up event listeners for background GPS
    const locationListener = DeviceEventEmitter.addListener('MileTrackerLocationUpdate', handleLocationUpdate);
    const tripListener = DeviceEventEmitter.addListener('MileTrackerTripEvent', handleTripEvent);
    const statusListener = DeviceEventEmitter.addListener('MileTrackerStatusUpdate', handleStatusUpdate);
    
    // Handle app state changes
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      locationListener.remove();
      tripListener.remove();
      statusListener.remove();
      appStateListener?.remove();
    };
  }, []);

  // Initialize GPS and request permissions
  const initializeGPS = async () => {
    try {
      // Request location permissions
      if (Platform.OS === 'android') {
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'MileTracker Pro needs location access for automatic trip tracking.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const backgroundLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Permission',
            message: 'MileTracker Pro needs background location access to track trips automatically even when the app is closed.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED ||
            backgroundLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          setStatus('Location permissions required for background tracking');
          return;
        }
      }

      // Get initial tracking status
      if (MileTrackerGPS) {
        const status = await MileTrackerGPS.getTrackingStatus();
        setIsTracking(status.isTracking);
        
        // Start background tracking if auto mode is enabled
        if (autoMode) {
          await MileTrackerGPS.setAutoMode(true);
          await MileTrackerGPS.startBackgroundTracking();
          setStatus('Background GPS active - Monitoring automatically');
        } else {
          setStatus('Manual mode - Press START TRIP to begin');
        }
      } else {
        setStatus('Native GPS module not available');
      }
    } catch (error) {
      console.error('GPS initialization error:', error);
      setStatus('GPS initialization failed: ' + error.message);
    }
  };

  // Handle location updates from background service
  const handleLocationUpdate = (location) => {
    setCurrentLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed * 2.237, // m/s to mph
      accuracy: location.accuracy,
      timestamp: location.timestamp
    });
  };

  // Handle trip events from background service
  const handleTripEvent = async (event) => {
    try {
      const tripData = JSON.parse(event.tripData);
      
      if (event.eventType === 'TRIP_STARTED') {
        setStatus('🚗 Trip started automatically');
      } else if (event.eventType === 'TRIP_COMPLETED') {
        // Add completed trip to our local storage
        const newTrip = {
          id: tripData.id || Date.now(),
          startTime: tripData.startTime,
          endTime: tripData.endTime,
          distance: tripData.distance,
          duration: tripData.duration,
          category: tripData.category || 'Business',
          method: 'GPS_AUTO_BACKGROUND',
          purpose: 'Auto-detected trip',
          client: 'Personal',
          startAddress: 'GPS Location',
          endAddress: 'GPS Location'
        };
        
        await saveTrip(newTrip);
        setStatus('✅ Trip completed - ' + tripData.distance.toFixed(1) + ' miles');
      }
    } catch (error) {
      console.error('Trip event error:', error);
    }
  };

  // Handle status updates from background service
  const handleStatusUpdate = (update) => {
    setStatus(update.status);
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background' && autoMode && MileTrackerGPS) {
      // Ensure background tracking continues
      MileTrackerGPS.startBackgroundTracking().catch(console.error);
    }
  };

  // Toggle auto mode
  const toggleAutoMode = async (enabled) => {
    try {
      setAutoMode(enabled);
      
      if (MileTrackerGPS) {
        await MileTrackerGPS.setAutoMode(enabled);
        
        if (enabled) {
          await MileTrackerGPS.startBackgroundTracking();
          setStatus('Auto mode ON - Background GPS monitoring');
        } else {
          await MileTrackerGPS.stopBackgroundTracking();
          setStatus('Manual mode ON - Use START TRIP button');
        }
      }
      
      // Save to settings
      const newSettings = { ...settings, autoMode: enabled };
      setSettings(newSettings);
      await AsyncStorage.setItem('miletracker_settings', JSON.stringify(newSettings));
      
    } catch (error) {
      console.error('Auto mode toggle error:', error);
      Alert.alert('Error', 'Failed to toggle auto mode: ' + error.message);
    }
  };

  // Manual trip start (for manual mode)
  const startManualTrip = async () => {
    try {
      if (!MileTrackerGPS) {
        Alert.alert('Error', 'GPS module not available');
        return;
      }

      await MileTrackerGPS.startBackgroundTracking();
      setIsTracking(true);
      setStatus('🚗 Manual trip started - Recording...');
      
    } catch (error) {
      console.error('Manual trip start error:', error);
      Alert.alert('Error', 'Failed to start trip: ' + error.message);
    }
  };

  // Manual trip stop (for manual mode)
  const stopManualTrip = async () => {
    try {
      if (!MileTrackerGPS) {
        Alert.alert('Error', 'GPS module not available');
        return;
      }

      await MileTrackerGPS.stopBackgroundTracking();
      setIsTracking(false);
      setStatus('Trip stopped manually');
      
    } catch (error) {
      console.error('Manual trip stop error:', error);
      Alert.alert('Error', 'Failed to stop trip: ' + error.message);
    }
  };

  // Load trips from storage
  const loadTrips = async () => {
    try {
      const storedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (storedTrips) {
        const parsedTrips = JSON.parse(storedTrips);
        setTrips(parsedTrips);
        calculateMonthlyStats(parsedTrips);
      }

      // Also load trips from native storage (background service)
      if (MileTrackerGPS) {
        // Background trips are automatically added via handleTripEvent
      }
    } catch (error) {
      console.error('Load trips error:', error);
    }
  };

  // Load settings from storage
  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('miletracker_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        setAutoMode(parsedSettings.autoMode);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    }
  };

  // Save a new trip
  const saveTrip = async (newTrip) => {
    try {
      const updatedTrips = [...trips, newTrip];
      setTrips(updatedTrips);
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(updatedTrips));
      calculateMonthlyStats(updatedTrips);
    } catch (error) {
      console.error('Save trip error:', error);
    }
  };

  // Calculate monthly statistics
  const calculateMonthlyStats = (tripList) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTrips = tripList.filter(trip => {
      const tripDate = new Date(trip.startTime);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });

    let businessMiles = 0;
    let medicalMiles = 0;
    let charityMiles = 0;

    monthlyTrips.forEach(trip => {
      const distance = parseFloat(trip.distance) || 0;
      switch (trip.category) {
        case 'Business':
          businessMiles += distance;
          break;
        case 'Medical':
          medicalMiles += distance;
          break;
        case 'Charity':
          charityMiles += distance;
          break;
      }
    });

    const totalMiles = businessMiles + medicalMiles + charityMiles;
    const totalDeduction = (businessMiles * settings.businessRate) + 
                          (medicalMiles * settings.medicalRate) + 
                          (charityMiles * settings.charityRate);

    setMonthlyStats({
      totalTrips: monthlyTrips.length,
      totalMiles,
      businessMiles,
      medicalMiles,
      charityMiles,
      totalDeduction
    });
  };

  // Add manual trip
  const addManualTrip = async () => {
    if (!tripForm.distance || !tripForm.purpose) {
      Alert.alert('Error', 'Please fill in distance and purpose');
      return;
    }

    const newTrip = {
      id: Date.now(),
      startTime: Date.now(),
      endTime: Date.now() + 1800000, // 30 minutes
      distance: parseFloat(tripForm.distance),
      duration: 1800000,
      category: tripForm.category,
      method: 'MANUAL',
      purpose: tripForm.purpose,
      client: tripForm.client,
      startAddress: 'Manual Entry',
      endAddress: 'Manual Entry'
    };

    await saveTrip(newTrip);
    setShowAddTrip(false);
    setTripForm({ distance: '', category: 'Business', purpose: '', client: 'Personal' });
    Alert.alert('Success', 'Trip added successfully');
  };

  // Format time duration
  const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Render Home View
  const renderHomeView = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional Mileage Tracking</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{monthlyStats.totalTrips}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{monthlyStats.totalMiles.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${monthlyStats.totalDeduction.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>IRS Tax</Text>
          </View>
        </View>
      </View>

      {/* Auto Mode Toggle */}
      <View style={styles.modeCard}>
        <View style={styles.modeHeader}>
          <Text style={styles.modeTitle}>Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={toggleAutoMode}
            trackColor={{ false: '#767577', true: '#667eea' }}
            thumbColor={autoMode ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode 
            ? "Auto: Detects driving automatically • Runs in background"
            : "Manual: Full start/stop control • Tap button to track"
          }
        </Text>
      </View>

      {/* Tracking Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Status</Text>
        <Text style={styles.statusText}>{status}</Text>
        {currentLocation && (
          <Text style={styles.locationText}>
            Speed: {currentLocation.speed.toFixed(1)} mph • Accuracy: {currentLocation.accuracy.toFixed(0)}m
          </Text>
        )}
      </View>

      {/* Manual Control Buttons */}
      {!autoMode && (
        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>Manual Control</Text>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startManualTrip}>
              <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
              <Text style={styles.buttonSubtext}>Instant tracking control</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopManualTrip}>
              <Text style={styles.stopButtonText}>⏹️ STOP TRIP</Text>
              <Text style={styles.buttonSubtext}>End current trip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Quick Add Manual Trip */}
      <TouchableOpacity style={styles.addTripButton} onPress={() => setShowAddTrip(true)}>
        <Text style={styles.addTripButtonText}>➕ Add Manual Trip</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Trips View
  const renderTripsView = () => (
    <View style={styles.container}>
      <Text style={styles.viewTitle}>Trip History</Text>
      <ScrollView style={styles.tripsList}>
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trips recorded yet</Text>
            <Text style={styles.emptySubtext}>Start tracking or add manual trips</Text>
          </View>
        ) : (
          trips.slice().reverse().map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripDistance}>{trip.distance.toFixed(1)} mi</Text>
                <Text style={styles.tripCategory}>{trip.category}</Text>
              </View>
              <Text style={styles.tripPurpose}>{trip.purpose}</Text>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDate}>{formatDate(trip.startTime)}</Text>
                <Text style={styles.tripMethod}>{trip.method}</Text>
              </View>
              <Text style={styles.tripDeduction}>
                IRS Deduction: ${(trip.distance * (
                  trip.category === 'Business' ? settings.businessRate :
                  trip.category === 'Medical' ? settings.medicalRate :
                  settings.charityRate
                )).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Render Settings Modal
  const renderSettingsModal = () => (
    <Modal visible={showSettings} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Settings</Text>
          
          <Text style={styles.settingLabel}>IRS Mileage Rates (2025)</Text>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Business:</Text>
            <Text style={styles.rateValue}>${settings.businessRate}/mile</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Medical:</Text>
            <Text style={styles.rateValue}>${settings.medicalRate}/mile</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Charity:</Text>
            <Text style={styles.rateValue}>${settings.charityRate}/mile</Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowSettings(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Add Trip Modal
  const renderAddTripModal = () => (
    <Modal visible={showAddTrip} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Manual Trip</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Distance (miles)"
            value={tripForm.distance}
            onChangeText={(text) => setTripForm({...tripForm, distance: text})}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Purpose/Description"
            value={tripForm.purpose}
            onChangeText={(text) => setTripForm({...tripForm, purpose: text})}
            multiline
          />

          <Text style={styles.inputLabel}>Category:</Text>
          <View style={styles.categoryButtons}>
            {['Business', 'Medical', 'Charity'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  tripForm.category === category && styles.categoryButtonActive
                ]}
                onPress={() => setTripForm({...tripForm, category})}
              >
                <Text style={[
                  styles.categoryButtonText,
                  tripForm.category === category && styles.categoryButtonTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowAddTrip(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={addManualTrip}>
              <Text style={styles.modalButtonTextPrimary}>Add Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.appContainer}>
      <ExpoStatusBar style="light" backgroundColor="#667eea" />
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      
      {/* Main Content */}
      <ScrollView style={styles.scrollContent}>
        {currentView === 'home' && renderHomeView()}
        {currentView === 'trips' && renderTripsView()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={[styles.navIcon, currentView === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navText, currentView === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navIcon, currentView === 'trips' && styles.navIconActive]}>🚗</Text>
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderSettingsModal()}
      {renderAddTripModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
    paddingBottom: 20,
  },
  container: {
    padding: 20,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
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
    marginTop: 4,
  },
  modeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  controlsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  addTripButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  addTripButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  tripsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  tripCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDistance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  tripCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripPurpose: {
    fontSize: 16,
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripMethod: {
    fontSize: 12,
    color: '#999',
  },
  tripDeduction: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navIconActive: {
    color: '#667eea',
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
  navTextActive: {
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
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  categoryButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rateLabel: {
    fontSize: 16,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#667eea',
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontWeight: 'bold',
  },
});