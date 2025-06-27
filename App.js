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
import * as Keychain from 'react-native-keychain';
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

  // Refs for tracking
  const gpsEventSubscription = useRef(null);
  const appStateSubscription = useRef(null);

  // Secure storage helper functions using react-native-keychain
  const secureStorage = {
    async setItem(key, value) {
      try {
        await Keychain.setInternetCredentials(key, key, value);
      } catch (error) {
        console.error('Keychain setItem error:', error);
        throw error;
      }
    },
    
    async getItem(key) {
      try {
        const credentials = await Keychain.getInternetCredentials(key);
        if (credentials && credentials.password) {
          return credentials.password;
        }
        return null;
      } catch (error) {
        console.error('Keychain getItem error:', error);
        return null;
      }
    },
    
    async removeItem(key) {
      try {
        await Keychain.resetInternetCredentials(key);
      } catch (error) {
        console.error('Keychain removeItem error:', error);
        throw error;
      }
    }
  };

  // Initialize app
  useEffect(() => {
    initializeApp();
    return () => {
      if (gpsEventSubscription.current) {
        gpsEventSubscription.current.remove();
      }
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing MileTracker Pro...');
      setStatus('Initializing GPS system...');
      
      // Load stored data
      await loadStoredData();
      
      // Initialize GPS if available
      if (MileTrackerGPS) {
        console.log('Native GPS module found');
        
        // Set up GPS event listeners
        gpsEventSubscription.current = DeviceEventEmitter.addListener('MileTrackerGPSEvent', handleGPSEvent);
        
        // Set up app state monitoring
        appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
        
        // Initialize GPS module
        await MileTrackerGPS.initialize();
        console.log('GPS module initialized');
        
        // Set initial auto mode
        await MileTrackerGPS.setAutoMode(settings.autoMode);
        
        if (settings.autoMode) {
          await MileTrackerGPS.startBackgroundTracking();
          setStatus('Auto mode ON - Background GPS monitoring');
        } else {
          setStatus('Manual mode ON - Use START TRIP button');
        }
        
      } else {
        console.log('Native GPS module not available - running in demo mode');
        setStatus('Demo mode - Native GPS not available');
      }
      
    } catch (error) {
      console.error('App initialization error:', error);
      setStatus('Initialization error: ' + error.message);
    }
  };

  // Handle GPS events from native module
  const handleGPSEvent = (event) => {
    console.log('GPS Event received:', event);
    
    switch (event.type) {
      case 'location_update':
        setCurrentLocation(event.data);
        break;
        
      case 'trip_started':
        handleTripStarted(event.data);
        break;
        
      case 'trip_ended':
        handleTripEnded(event.data);
        break;
        
      case 'status_update':
        setStatus(event.data.message || 'GPS Status Update');
        break;
        
      default:
        console.log('Unknown GPS event:', event.type);
    }
  };

  // Handle app state changes for background tracking
  const handleAppStateChange = (nextAppState) => {
    console.log('App state changed to:', nextAppState);
    
    if (nextAppState === 'background' && isTracking) {
      setStatus('Background tracking active');
    } else if (nextAppState === 'active') {
      setStatus(autoMode ? 'Auto mode ON - Background GPS monitoring' : 'Manual mode ON - Use START TRIP button');
    }
  };

  // Handle trip started from GPS
  const handleTripStarted = async (tripData) => {
    console.log('Trip started:', tripData);
    setIsTracking(true);
    setStatus('🚗 Trip in progress - Auto detected');
  };

  // Handle trip ended from GPS
  const handleTripEnded = async (tripData) => {
    console.log('Trip ended:', tripData);
    setIsTracking(false);
    
    // Create trip object
    const newTrip = {
      id: Date.now().toString(),
      distance: tripData.distance || 0,
      duration: tripData.duration || 0,
      startTime: tripData.startTime || new Date().toISOString(),
      endTime: tripData.endTime || new Date().toISOString(),
      startLocation: tripData.startLocation || 'Unknown',
      endLocation: tripData.endLocation || 'Unknown',
      category: 'Business', // Default to business
      purpose: 'Auto-detected trip',
      client: 'Personal',
      method: tripData.method || 'GPS Auto'
    };
    
    // Add to trips
    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    await saveTrips(updatedTrips);
    
    setStatus(`Trip completed: ${tripData.distance?.toFixed(1) || 0} miles`);
  };

  // Toggle auto mode
  const toggleAutoMode = async (enabled) => {
    try {
      console.log('Toggling auto mode:', enabled);
      setAutoMode(enabled);
      
      // Update native GPS module if available
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
      await secureStorage.setItem('miletracker_settings', JSON.stringify(newSettings));
      
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

  // Load stored data
  const loadStoredData = async () => {
    try {
      // Load trips
      const storedTrips = await secureStorage.getItem('miletracker_trips');
      if (storedTrips) {
        const parsedTrips = JSON.parse(storedTrips);
        setTrips(parsedTrips);
        console.log('Loaded', parsedTrips.length, 'stored trips');
      }

      // Load settings  
      const storedSettings = await secureStorage.getItem('miletracker_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        setAutoMode(parsedSettings.autoMode !== false); // Default to true
        console.log('Loaded stored settings');
      }
      
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  // Save trips to secure storage
  const saveTrips = async (tripsToSave) => {
    try {
      await secureStorage.setItem('miletracker_trips', JSON.stringify(tripsToSave));
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  };

  // Add manual trip
  const addManualTrip = async () => {
    try {
      if (!tripForm.distance || parseFloat(tripForm.distance) <= 0) {
        Alert.alert('Error', 'Please enter a valid distance');
        return;
      }

      const newTrip = {
        id: Date.now().toString(),
        distance: parseFloat(tripForm.distance),
        duration: 0,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        startLocation: 'Manual Entry',
        endLocation: 'Manual Entry',
        category: tripForm.category,
        purpose: tripForm.purpose || 'Manual trip',
        client: tripForm.client,
        method: 'Manual'
      };

      const updatedTrips = [newTrip, ...trips];
      setTrips(updatedTrips);
      await saveTrips(updatedTrips);

      // Reset form
      setTripForm({
        distance: '',
        category: 'Business',
        purpose: '',
        client: 'Personal'
      });
      
      setShowAddTrip(false);
      Alert.alert('Success', 'Trip added successfully');
      
    } catch (error) {
      console.error('Error adding manual trip:', error);
      Alert.alert('Error', 'Failed to add trip');
    }
  };

  // Delete trip
  const deleteTrip = async (tripId) => {
    try {
      const updatedTrips = trips.filter(trip => trip.id !== tripId);
      setTrips(updatedTrips);
      await saveTrips(updatedTrips);
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTrips = trips.filter(trip => {
      const tripDate = new Date(trip.startTime);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });

    const totalMiles = monthlyTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const businessMiles = monthlyTrips.filter(trip => trip.category === 'Business').reduce((sum, trip) => sum + trip.distance, 0);
    const medicalMiles = monthlyTrips.filter(trip => trip.category === 'Medical').reduce((sum, trip) => sum + trip.distance, 0);
    const charityMiles = monthlyTrips.filter(trip => trip.category === 'Charity').reduce((sum, trip) => sum + trip.distance, 0);

    const businessDeduction = businessMiles * settings.businessRate;
    const medicalDeduction = medicalMiles * settings.medicalRate;
    const charityDeduction = charityMiles * settings.charityRate;
    const totalDeduction = businessDeduction + medicalDeduction + charityDeduction;

    return {
      tripCount: monthlyTrips.length,
      totalMiles: totalMiles,
      businessMiles,
      medicalMiles, 
      charityMiles,
      totalDeduction
    };
  };

  const stats = calculateStats();

  // Export trips as CSV
  const exportTrips = () => {
    try {
      let csvContent = 'Date,Distance,Category,Purpose,Client,Start Location,End Location,Method,Deduction\n';
      
      trips.forEach(trip => {
        const date = new Date(trip.startTime).toLocaleDateString();
        const rate = trip.category === 'Business' ? settings.businessRate : 
                    trip.category === 'Medical' ? settings.medicalRate : settings.charityRate;
        const deduction = (trip.distance * rate).toFixed(2);
        
        csvContent += `${date},${trip.distance},"${trip.category}","${trip.purpose}","${trip.client}","${trip.startLocation}","${trip.endLocation}","${trip.method}",${deduction}\n`;
      });
      
      csvContent += `\nSummary:\n`;
      csvContent += `Total Trips,${stats.tripCount}\n`;
      csvContent += `Total Miles,${stats.totalMiles.toFixed(1)}\n`;
      csvContent += `Business Miles,${stats.businessMiles.toFixed(1)}\n`;
      csvContent += `Medical Miles,${stats.medicalMiles.toFixed(1)}\n`;
      csvContent += `Charity Miles,${stats.charityMiles.toFixed(1)}\n`;
      csvContent += `Total Tax Deduction,$${stats.totalDeduction.toFixed(2)}\n`;

      Alert.alert(
        'Export Ready',
        `CSV data prepared with ${trips.length} trips. In production version, this would save to file or email.`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export trips');
    }
  };

  // Render trip card
  const renderTripCard = (trip) => (
    <View key={trip.id} style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripDate}>
          {new Date(trip.startTime).toLocaleDateString()}
        </Text>
        <Text style={styles.tripDistance}>
          {trip.distance.toFixed(1)} mi
        </Text>
      </View>
      
      <Text style={styles.tripRoute}>
        {trip.startLocation} → {trip.endLocation}
      </Text>
      
      <View style={styles.tripDetails}>
        <Text style={styles.tripCategory}>
          {trip.category} • {trip.purpose}
        </Text>
        <Text style={styles.tripMethod}>
          {trip.method}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTrip(trip.id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  // Render home view
  const renderHome = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Professional Mileage Tracking • $4.99/month</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>June 2025 Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{stats.tripCount}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{stats.totalMiles.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${stats.totalDeduction.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Tax Saved</Text>
          </View>
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeCard}>
        <View style={styles.modeHeader}>
          <Text style={styles.modeTitle}>Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={toggleAutoMode}
            trackColor={{ false: '#767577', true: '#667eea' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode ? 'Auto: Detects driving automatically' : 'Manual: Full start/stop control'}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{status}</Text>
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 {currentLocation.latitude?.toFixed(4)}, {currentLocation.longitude?.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Manual Controls (when not in auto mode) */}
      {!autoMode && (
        <View style={styles.controlsCard}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startManualTrip}>
              <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
              <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopManualTrip}>
              <Text style={styles.stopButtonText}>⏹️ STOP TRIP</Text>
              <Text style={styles.stopButtonSubtext}>End current trip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Add Trip Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddTrip(true)}
      >
        <Text style={styles.addButtonText}>+ Add Manual Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render trips view
  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip History</Text>
        <Text style={styles.subtitle}>{trips.length} total trips</Text>
      </View>

      {trips.length > 0 ? (
        trips.map(renderTripCard)
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trips recorded yet</Text>
          <Text style={styles.emptyStateSubtext}>Start tracking or add a manual trip</Text>
        </View>
      )}
    </ScrollView>
  );

  // Render export view
  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Export & Reports</Text>
        <Text style={styles.subtitle}>Tax-ready CSV reports</Text>
      </View>

      {/* Export Summary */}
      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Export Summary</Text>
        <Text style={styles.exportDetail}>Total Trips: {trips.length}</Text>
        <Text style={styles.exportDetail}>Business Miles: {stats.businessMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Medical Miles: {stats.medicalMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Charity Miles: {stats.charityMiles.toFixed(1)}</Text>
        <Text style={styles.exportTotal}>Total Deduction: ${stats.totalDeduction.toFixed(2)}</Text>
      </View>

      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
        <Text style={styles.exportButtonText}>📊 Export CSV Report</Text>
        <Text style={styles.exportButtonSubtext}>Download tax-ready spreadsheet</Text>
      </TouchableOpacity>

      {/* IRS Rate Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>2025 IRS Mileage Rates</Text>
        <Text style={styles.infoDetail}>Business: ${settings.businessRate}/mile</Text>
        <Text style={styles.infoDetail}>Medical: ${settings.medicalRate}/mile</Text>
        <Text style={styles.infoDetail}>Charity: ${settings.charityRate}/mile</Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <ExpoStatusBar style="light" />
      
      {/* Main Content */}
      {currentView === 'home' && renderHome()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, currentView === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={[styles.navText, currentView === 'home' && styles.navTextActive]}>
            🏠 Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>
            🚗 Trips
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, currentView === 'export' && styles.navButtonActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navText, currentView === 'export' && styles.navTextActive]}>
            📊 Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Trip Modal */}
      <Modal visible={showAddTrip} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            <TouchableOpacity onPress={() => setShowAddTrip(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Distance (miles) *</Text>
            <TextInput
              style={styles.textInput}
              value={tripForm.distance}
              onChangeText={(text) => setTripForm({ ...tripForm, distance: text })}
              placeholder="Enter miles driven"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Category *</Text>
            <View style={styles.pickerContainer}>
              {['Business', 'Medical', 'Charity'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.pickerOption,
                    tripForm.category === category && styles.pickerOptionSelected
                  ]}
                  onPress={() => setTripForm({ ...tripForm, category })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    tripForm.category === category && styles.pickerOptionTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Purpose</Text>
            <TextInput
              style={styles.textInput}
              value={tripForm.purpose}
              onChangeText={(text) => setTripForm({ ...tripForm, purpose: text })}
              placeholder="Trip purpose (optional)"
            />

            <Text style={styles.inputLabel}>Client</Text>
            <View style={styles.pickerContainer}>
              {['Personal', 'ABC Company', 'XYZ Corp', 'Other'].map(client => (
                <TouchableOpacity
                  key={client}
                  style={[
                    styles.pickerOption,
                    tripForm.client === client && styles.pickerOptionSelected
                  ]}
                  onPress={() => setTripForm({ ...tripForm, client })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    tripForm.client === client && styles.pickerOptionTextSelected
                  ]}>
                    {client}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.modalSaveButton} onPress={addManualTrip}>
            <Text style={styles.modalSaveButtonText}>Save Trip</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.settingsSection}>IRS Mileage Rates (2025)</Text>
            
            <Text style={styles.inputLabel}>Business Rate ($/mile)</Text>
            <TextInput
              style={styles.textInput}
              value={settings.businessRate.toString()}
              onChangeText={(text) => {
                const rate = parseFloat(text) || 0;
                setSettings({ ...settings, businessRate: rate });
              }}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Medical Rate ($/mile)</Text>
            <TextInput
              style={styles.textInput}
              value={settings.medicalRate.toString()}
              onChangeText={(text) => {
                const rate = parseFloat(text) || 0;
                setSettings({ ...settings, medicalRate: rate });
              }}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Charity Rate ($/mile)</Text>
            <TextInput
              style={styles.textInput}
              value={settings.charityRate.toString()}
              onChangeText={(text) => {
                const rate = parseFloat(text) || 0;
                setSettings({ ...settings, charityRate: rate });
              }}
              keyboardType="numeric"
            />
          </ScrollView>
          
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={async () => {
              await secureStorage.setItem('miletracker_settings', JSON.stringify(settings));
              setShowSettings(false);
              Alert.alert('Success', 'Settings saved');
            }}
          >
            <Text style={styles.modalSaveButtonText}>Save Settings</Text>
          </TouchableOpacity>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
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
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controlsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  startButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  stopButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  addButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tripCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
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
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  tripRoute: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripCategory: {
    fontSize: 12,
    color: '#666',
  },
  tripMethod: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  deleteButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  exportCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  exportDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exportTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: '#28a745',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  exportButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonActive: {
    backgroundColor: '#667eea',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#667eea',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  pickerOptionSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#28a745',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
});
