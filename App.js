import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Switch,
  SafeAreaView,
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  StatusBar,
  AppState
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

const { MileTrackerGPS } = NativeModules;

// API Configuration
const API_BASE_URL = 'http://0.0.0.0:3001/api';
const API_KEY = 'demo-key-12345';

// SecureStore wrapper that maintains AsyncStorage-like API
class PersistentStorage {
  static async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
      return Promise.resolve();
    } catch (error) {
      console.log('SecureStore setItem error:', error);
      return Promise.resolve();
    }
  }
  
  static async getItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      return Promise.resolve(value);
    } catch (error) {
      console.log('SecureStore getItem error:', error);
      return Promise.resolve(null);
    }
  }
  
  static async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      return Promise.resolve();
    } catch (error) {
      console.log('SecureStore removeItem error:', error);
      return Promise.resolve();
    }
  }
}

export default function App() {
  // State management
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing...');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [trackingDuration, setTrackingDuration] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  
  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTripForReceipt, setSelectedTripForReceipt] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    autoDetection: true,
    minDistance: 0.5,
    roundTrips: true
  });
  
  // Client management
  const [clients, setClients] = useState(['Self', 'ABC Company', 'XYZ Corp', 'Tech Solutions Inc']);
  
  // Manual trip form state
  const [manualTrip, setManualTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: 'Business',
    category: 'Business',
    description: '',
    clientName: 'Self'
  });
  
  // Receipt form state
  const [receiptData, setReceiptData] = useState({
    category: 'Gas',
    amount: '',
    description: '',
    hasPhoto: false,
    photoUri: ''
  });
  
  // Native GPS integration
  useEffect(() => {
    let gpsEmitter = null;
    
    if (MileTrackerGPS) {
      gpsEmitter = new NativeEventEmitter(MileTrackerGPS);
      
      const locationSubscription = gpsEmitter.addListener('onLocationUpdate', (data) => {
        setCurrentLocation(data);
        setCurrentSpeed(data.speed || 0);
        setGpsStatus(`GPS Active - Speed: ${(data.speed || 0).toFixed(1)} mph`);
      });
      
      const tripStartSubscription = gpsEmitter.addListener('onTripStart', (data) => {
        const newTrip = {
          id: Date.now().toString(),
          startTime: new Date().toISOString(),
          startLocation: data.location || 'GPS Location',
          distance: 0,
          purpose: 'Business',
          category: 'Business',
          description: 'Auto-detected trip',
          clientName: 'Self',
          isActive: true,
          method: 'Auto',
          autoDetected: true,
          coordinates: [data],
          receipts: [],
          syncStatus: 'pending'
        };
        setActiveTrip(newTrip);
        setIsTracking(true);
        setGpsStatus('Trip Started - Tracking...');
      });
      
      const tripEndSubscription = gpsEmitter.addListener('onTripEnd', (data) => {
        if (activeTrip) {
          const completedTrip = {
            ...activeTrip,
            endTime: new Date().toISOString(),
            endLocation: data.location || 'GPS Location',
            distance: data.distance || 0,
            isActive: false
          };
          
          saveTrip(completedTrip);
          setActiveTrip(null);
          setIsTracking(false);
          setGpsStatus('Trip Completed');
        }
      });
      
      const statusSubscription = gpsEmitter.addListener('onStatusUpdate', (data) => {
        setGpsStatus(data.status || 'GPS Monitoring');
      });
      
      // Initialize GPS service
      MileTrackerGPS.initialize();
      
      return () => {
        locationSubscription?.remove();
        tripStartSubscription?.remove();
        tripEndSubscription?.remove();
        statusSubscription?.remove();
      };
    }
  }, [activeTrip]);
  
  // Timer for tracking duration
  useEffect(() => {
    let interval = null;
    if (isTracking && activeTrip) {
      interval = setInterval(() => {
        const startTime = new Date(activeTrip.startTime);
        const now = new Date();
        const duration = Math.floor((now - startTime) / 1000);
        setTrackingDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, activeTrip]);
  
  // Load data on app start
  useEffect(() => {
    initializeApp();
  }, []);
  
  // Auto mode toggle
  useEffect(() => {
    if (MileTrackerGPS) {
      if (autoMode) {
        MileTrackerGPS.startAutoDetection();
        setGpsStatus('Auto Detection Active');
      } else {
        MileTrackerGPS.stopAutoDetection();
        setGpsStatus('Manual Mode');
      }
    }
  }, [autoMode]);
  
  // Initialize app
  const initializeApp = async () => {
    await loadTrips();
    await loadSettings();
    await loadClients();
    await testApiConnection();
  };
  
  // API functions
  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/stats?api_key=${API_KEY}`);
      if (response.ok) {
        setApiStatus('connected');
        console.log('API connection successful');
      } else {
        setApiStatus('error');
        console.log('API connection failed');
      }
    } catch (error) {
      setApiStatus('offline');
      console.log('API offline, using local storage only');
    }
  };
  
  const syncTripToAPI = async (trip) => {
    if (apiStatus !== 'connected') return trip;
    
    try {
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...trip,
          api_key: API_KEY
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return { ...trip, apiId: result.id, syncStatus: 'synced' };
      }
    } catch (error) {
      console.log('API sync error:', error);
    }
    
    return { ...trip, syncStatus: 'failed' };
  };
  
  // Storage functions
  const saveSettings = async (newSettings) => {
    try {
      await PersistentStorage.setItem('miletracker_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.log('Settings save error:', error);
    }
  };
  
  const saveTrip = async (trip) => {
    try {
      // Sync to API if connected
      const syncedTrip = await syncTripToAPI(trip);
      
      const updatedTrips = [...trips, syncedTrip];
      setTrips(updatedTrips);
      await PersistentStorage.setItem('miletracker_trips', JSON.stringify(updatedTrips));
    } catch (error) {
      console.log('Trip save error:', error);
    }
  };
  
  const loadTrips = async () => {
    try {
      const storedTrips = await PersistentStorage.getItem('miletracker_trips');
      if (storedTrips) {
        const parsedTrips = JSON.parse(storedTrips);
        setTrips(parsedTrips);
      } else {
        // Load sample data with API integration
        const sampleTrips = [
          {
            id: Date.now().toString(),
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date(Date.now() - 82800000).toISOString(),
            startLocation: 'Home Office',
            endLocation: 'Downtown Client Meeting',
            distance: 12.5,
            purpose: 'Business meeting',
            category: 'Business',
            description: 'Client presentation downtown',
            clientName: 'ABC Company',
            method: 'Auto',
            autoDetected: true,
            receipts: [
              {
                id: Date.now() + 1,
                category: 'Gas',
                amount: 45.20,
                description: 'Shell station fill-up',
                hasPhoto: false,
                date: new Date().toISOString()
              },
              {
                id: Date.now() + 2,
                category: 'Parking',
                amount: 15.50,
                description: 'Downtown parking garage',
                hasPhoto: false,
                date: new Date().toISOString()
              }
            ],
            syncStatus: 'pending'
          }
        ];
        setTrips(sampleTrips);
        await PersistentStorage.setItem('miletracker_trips', JSON.stringify(sampleTrips));
      }
    } catch (error) {
      console.log('Trip load error:', error);
    }
  };
  
  const loadSettings = async () => {
    try {
      const storedSettings = await PersistentStorage.getItem('miletracker_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.log('Settings load error:', error);
    }
  };
  
  const loadClients = async () => {
    try {
      const storedClients = await PersistentStorage.getItem('miletracker_clients');
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      }
    } catch (error) {
      console.log('Clients load error:', error);
    }
  };
  
  const saveClients = async (newClients) => {
    try {
      await PersistentStorage.setItem('miletracker_clients', JSON.stringify(newClients));
      setClients(newClients);
    } catch (error) {
      console.log('Clients save error:', error);
    }
  };
  
  const updateTrips = async (updatedTrips) => {
    try {
      setTrips(updatedTrips);
      await PersistentStorage.setItem('miletracker_trips', JSON.stringify(updatedTrips));
    } catch (error) {
      console.log('Trip update error:', error);
    }
  };
  
  // Trip management
  const startManualTrip = () => {
    if (MileTrackerGPS) {
      MileTrackerGPS.startManualTrip();
    }
    
    const newTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startLocation: currentLocation?.address || 'Current Location',
      distance: 0,
      purpose: 'Manual Trip',
      category: 'Business',
      description: 'Manual trip',
      clientName: 'Self',
      isActive: true,
      method: 'Manual',
      autoDetected: false,
      coordinates: currentLocation ? [currentLocation] : [],
      receipts: [],
      syncStatus: 'pending'
    };
    
    setActiveTrip(newTrip);
    setIsTracking(true);
    setGpsStatus('Manual Trip Started');
  };
  
  const stopManualTrip = () => {
    if (activeTrip && MileTrackerGPS) {
      MileTrackerGPS.stopManualTrip();
      
      const completedTrip = {
        ...activeTrip,
        endTime: new Date().toISOString(),
        endLocation: currentLocation?.address || 'Current Location',
        distance: Math.max(0.1, activeTrip.distance),
        isActive: false
      };
      
      saveTrip(completedTrip);
      setActiveTrip(null);
      setIsTracking(false);
      setGpsStatus('Manual Trip Completed');
    }
  };
  
  const addManualTrip = async () => {
    if (!manualTrip.startLocation || !manualTrip.endLocation || !manualTrip.distance) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const newTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      startLocation: manualTrip.startLocation,
      endLocation: manualTrip.endLocation,
      distance: parseFloat(manualTrip.distance),
      purpose: manualTrip.purpose,
      category: manualTrip.category,
      description: manualTrip.description,
      clientName: manualTrip.clientName,
      method: 'Manual',
      autoDetected: false,
      isActive: false,
      receipts: [],
      syncStatus: 'pending'
    };
    
    await saveTrip(newTrip);
    setShowManualModal(false);
    setManualTrip({
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: 'Business',
      category: 'Business',
      description: '',
      clientName: 'Self'
    });
    
    Alert.alert('Success', 'Trip added successfully!');
  };
  
  const addReceiptToTrip = async () => {
    if (!receiptData.amount || !selectedTripForReceipt) {
      Alert.alert('Error', 'Please enter receipt amount');
      return;
    }
    
    const newReceipt = {
      id: Date.now(),
      category: receiptData.category,
      amount: parseFloat(receiptData.amount),
      description: receiptData.description,
      hasPhoto: receiptData.hasPhoto,
      photoUri: receiptData.photoUri,
      date: new Date().toISOString()
    };
    
    const updatedTrips = trips.map(trip => {
      if (trip.id === selectedTripForReceipt.id) {
        return {
          ...trip,
          receipts: [...(trip.receipts || []), newReceipt],
          syncStatus: 'pending'
        };
      }
      return trip;
    });
    
    await updateTrips(updatedTrips);
    setShowReceiptModal(false);
    setReceiptData({
      category: 'Gas',
      amount: '',
      description: '',
      hasPhoto: false,
      photoUri: ''
    });
    
    Alert.alert('Success', 'Receipt added successfully!');
  };
  
  const deleteTrip = (tripId) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTrips = trips.filter(trip => trip.id !== tripId);
            updateTrips(updatedTrips);
          }
        }
      ]
    );
  };
  
  const editTrip = (trip) => {
    setEditingTrip({ ...trip });
    setShowEditModal(true);
  };
  
  const saveEditedTrip = async () => {
    if (!editingTrip.startLocation || !editingTrip.endLocation || !editingTrip.distance) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const updatedTrips = trips.map(trip =>
      trip.id === editingTrip.id ? { ...editingTrip, syncStatus: 'pending' } : trip
    );
    await updateTrips(updatedTrips);
    setShowEditModal(false);
    setEditingTrip(null);
    Alert.alert('Success', 'Trip updated successfully!');
  };
  
  // Utility functions
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  const calculateDeduction = (distance, category) => {
    const rate = category === 'Business' ? settings.businessRate :
                 category === 'Medical' ? settings.medicalRate :
                 settings.charityRate;
    return distance * rate;
  };
  
  const getTotalStats = () => {
    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const businessMiles = trips.filter(t => t.category === 'Business').reduce((sum, trip) => sum + trip.distance, 0);
    const medicalMiles = trips.filter(t => t.category === 'Medical').reduce((sum, trip) => sum + trip.distance, 0);
    const charityMiles = trips.filter(t => t.category === 'Charity').reduce((sum, trip) => sum + trip.distance, 0);
    
    const totalDeduction = (businessMiles * settings.businessRate) + 
                          (medicalMiles * settings.medicalRate) + 
                          (charityMiles * settings.charityRate);
    
    const totalReceipts = trips.reduce((sum, trip) => sum + (trip.receipts || []).length, 0);
    const receiptAmount = trips.reduce((sum, trip) => 
      sum + (trip.receipts || []).reduce((receiptSum, receipt) => receiptSum + (receipt.amount || 0), 0), 0
    );
    
    const syncedTrips = trips.filter(t => t.syncStatus === 'synced').length;
    const autoTrips = trips.filter(t => t.autoDetected).length;
    
    return { 
      totalTrips, 
      totalMiles, 
      totalDeduction, 
      totalReceipts, 
      receiptAmount, 
      syncedTrips, 
      autoTrips 
    };
  };
  
  // Export functionality
  const exportData = () => {
    const stats = getTotalStats();
    const exportText = `MileTracker Pro Export\n\nAPI Status: ${apiStatus}\nSynced Trips: ${stats.syncedTrips}/${stats.totalTrips}\n\nTotal Trips: ${stats.totalTrips}\nAuto-detected: ${stats.autoTrips}\nTotal Miles: ${stats.totalMiles.toFixed(1)}\nTotal Deduction: $${stats.totalDeduction.toFixed(2)}\nTotal Receipts: ${stats.totalReceipts}\nReceipt Amount: $${stats.receiptAmount.toFixed(2)}\n\nTrip Details:\n${trips.map(trip => 
      `${new Date(trip.startTime).toLocaleDateString()} - ${trip.startLocation} to ${trip.endLocation} - ${trip.distance.toFixed(1)} miles - ${trip.category} - ${trip.clientName} - $${calculateDeduction(trip.distance, trip.category).toFixed(2)} - Receipts: ${(trip.receipts || []).length}`
    ).join('\n')}`;
    
    Alert.alert('Export Data', exportText);
  };
  
  // Render functions
  const renderHome = () => {
    const stats = getTotalStats();
    
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MileTracker Pro</Text>
          <Text style={styles.headerSubtitle}>Professional Mileage Tracking • Native Background GPS</Text>
          <View style={styles.apiStatusContainer}>
            <Text style={styles.apiStatus}>API: {apiStatus}</Text>
            <Text style={styles.syncStatus}>Synced: {stats.syncedTrips}/{stats.totalTrips}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>June 2025 Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalMiles.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Miles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>${stats.totalDeduction.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Tax</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.autoTrips}</Text>
              <Text style={styles.statLabel}>Auto</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalReceipts}</Text>
              <Text style={styles.statLabel}>Receipts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>${stats.receiptAmount.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.trackingCard}>
          <View style={styles.modeToggleContainer}>
            <Text style={styles.modeLabel}>Auto Detection</Text>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: '#767577', true: '#667eea' }}
              thumbColor={autoMode ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.modeExplanation}>
            Auto: Detects driving automatically • Manual: Full start/stop control
          </Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{gpsStatus}</Text>
            {isTracking && (
              <Text style={styles.timerText}>
                Duration: {formatDuration(trackingDuration)}
              </Text>
            )}
          </View>
          
          {!autoMode && (
            <View style={styles.manualControls}>
              {!isTracking ? (
                <TouchableOpacity 
                  style={[styles.trackingButton, styles.startButton]}
                  onPress={startManualTrip}
                >
                  <Text style={styles.trackingButtonText}>🚗 START TRIP NOW</Text>
                  <Text style={styles.trackingButtonSubtext}>Instant tracking control</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.trackingButton, styles.stopButton]}
                  onPress={stopManualTrip}
                >
                  <Text style={styles.trackingButtonText}>⏹️ STOP TRIP</Text>
                  <Text style={styles.trackingButtonSubtext}>End current trip</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.addTripButton}
          onPress={() => setShowManualModal(true)}
        >
          <Text style={styles.addTripButtonText}>+ Add Manual Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  
  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Trips</Text>
        <Text style={styles.headerSubtitle}>{trips.length} trips recorded</Text>
      </View>
      
      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>
              {new Date(trip.startTime).toLocaleDateString()}
            </Text>
            <View style={styles.tripBadges}>
              <Text style={styles.tripMethod}>{trip.method}</Text>
              <Text style={[styles.syncBadge, { color: trip.syncStatus === 'synced' ? '#28a745' : '#ffc107' }]}>
                {trip.syncStatus}
              </Text>
            </View>
          </View>
          
          <Text style={styles.tripRoute}>
            {trip.startLocation} → {trip.endLocation}
          </Text>
          
          <Text style={styles.tripDescription}>
            {trip.description} • {trip.clientName}
          </Text>
          
          <View style={styles.tripDetails}>
            <Text style={styles.tripDistance}>{trip.distance.toFixed(1)} miles</Text>
            <Text style={styles.tripCategory}>{trip.category}</Text>
            <Text style={styles.tripDeduction}>
              ${calculateDeduction(trip.distance, trip.category).toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.tripFooter}>
            <View style={styles.receiptInfo}>
              <Text style={styles.receiptCount}>
                📄 {(trip.receipts || []).length} receipts
              </Text>
              {trip.receipts && trip.receipts.length > 0 && (
                <Text style={styles.receiptAmount}>
                  ${trip.receipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
                </Text>
              )}
            </View>
            
            <View style={styles.tripActions}>
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={() => {
                  setSelectedTripForReceipt(trip);
                  setShowReceiptModal(true);
                }}
              >
                <Text style={styles.receiptButtonText}>+ Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editTrip(trip)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTrip(trip.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
      
      {trips.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trips recorded yet</Text>
          <Text style={styles.emptyStateSubtext}>Start tracking or add a manual trip</Text>
        </View>
      )}
    </ScrollView>
  );
  
  const renderExport = () => {
    const stats = getTotalStats();
    
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Export Data</Text>
          <Text style={styles.headerSubtitle}>For taxes, reimbursements, and contractors</Text>
        </View>
        
        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>Summary</Text>
          <Text style={styles.exportStat}>API Status: {apiStatus}</Text>
          <Text style={styles.exportStat}>Synced Trips: {stats.syncedTrips}/{stats.totalTrips}</Text>
          <Text style={styles.exportStat}>Total Trips: {stats.totalTrips}</Text>
          <Text style={styles.exportStat}>Auto-detected: {stats.autoTrips}</Text>
          <Text style={styles.exportStat}>Total Miles: {stats.totalMiles.toFixed(1)}</Text>
          <Text style={styles.exportStat}>Business: $0.70/mi</Text>
          <Text style={styles.exportStat}>Medical: $0.21/mi</Text>
          <Text style={styles.exportStat}>Charity: $0.14/mi</Text>
          <Text style={styles.exportStat}>Total Deduction: ${stats.totalDeduction.toFixed(2)}</Text>
          <Text style={styles.exportStat}>Total Receipts: {stats.totalReceipts}</Text>
          <Text style={styles.exportStat}>Receipt Amount: ${stats.receiptAmount.toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={exportData}
        >
          <Text style={styles.exportButtonText}>📊 Export Trip Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.exportButton, { backgroundColor: '#667eea' }]}
          onPress={testApiConnection}
        >
          <Text style={styles.exportButtonText}>🔄 Test API Connection</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  
  // Modal renders (abbreviated for space - same as before but with client dropdowns and receipt functionality)
  const renderManualModal = () => (
    <Modal visible={showManualModal} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Manual Trip</Text>
          <TouchableOpacity onPress={() => setShowManualModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Start Location *</Text>
          <TextInput
            style={styles.textInput}
            value={manualTrip.startLocation}
            onChangeText={(text) => setManualTrip({...manualTrip, startLocation: text})}
            placeholder="Enter start location"
          />
          
          <Text style={styles.inputLabel}>End Location *</Text>
          <TextInput
            style={styles.textInput}
            value={manualTrip.endLocation}
            onChangeText={(text) => setManualTrip({...manualTrip, endLocation: text})}
            placeholder="Enter end location"
          />
          
          <Text style={styles.inputLabel}>Distance (miles) *</Text>
          <TextInput
            style={styles.textInput}
            value={manualTrip.distance}
            onChangeText={(text) => setManualTrip({...manualTrip, distance: text})}
            placeholder="Enter distance"
            keyboardType="numeric"
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.textInput}
            value={manualTrip.description}
            onChangeText={(text) => setManualTrip({...manualTrip, description: text})}
            placeholder="Trip description"
          />
          
          <Text style={styles.inputLabel}>Client</Text>
          <View style={styles.clientSelector}>
            {clients.map(client => (
              <TouchableOpacity
                key={client}
                style={[
                  styles.clientButton,
                  manualTrip.clientName === client && styles.clientButtonActive
                ]}
                onPress={() => setManualTrip({...manualTrip, clientName: client})}
              >
                <Text style={[
                  styles.clientButtonText,
                  manualTrip.clientName === client && styles.clientButtonTextActive
                ]}>
                  {client}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryButtons}>
            {['Business', 'Medical', 'Charity'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  manualTrip.category === category && styles.categoryButtonActive
                ]}
                onPress={() => setManualTrip({...manualTrip, category})}
              >
                <Text style={[
                  styles.categoryButtonText,
                  manualTrip.category === category && styles.categoryButtonTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={addManualTrip}
          >
            <Text style={styles.saveButtonText}>Save Trip</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  
  const renderReceiptModal = () => (
    <Modal visible={showReceiptModal} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Receipt</Text>
          <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.receiptCategories}>
            {['Gas', 'Parking', 'Maintenance', 'Insurance', 'Other'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  receiptData.category === category && styles.categoryButtonActive
                ]}
                onPress={() => setReceiptData({...receiptData, category})}
              >
                <Text style={[
                  styles.categoryButtonText,
                  receiptData.category === category && styles.categoryButtonTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.inputLabel}>Amount *</Text>
          <TextInput
            style={styles.textInput}
            value={receiptData.amount}
            onChangeText={(text) => setReceiptData({...receiptData, amount: text})}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.textInput}
            value={receiptData.description}
            onChangeText={(text) => setReceiptData({...receiptData, description: text})}
            placeholder="Receipt description"
          />
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={addReceiptToTrip}
          >
            <Text style={styles.saveButtonText}>Add Receipt</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  
  // Settings and Edit modals similar to before...
  const renderSettingsModal = () => (
    <Modal visible={showSettingsModal} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settings</Text>
          <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.settingsSection}>API Status</Text>
          <Text style={styles.apiStatusText}>Status: {apiStatus}</Text>
          <Text style={styles.apiStatusText}>Base URL: {API_BASE_URL}</Text>
          
          <Text style={styles.settingsSection}>IRS Mileage Rates (2025)</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Business Rate ($/mile)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.businessRate.toString()}
              onChangeText={(text) => saveSettings({...settings, businessRate: parseFloat(text) || 0.70})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Medical Rate ($/mile)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.medicalRate.toString()}
              onChangeText={(text) => saveSettings({...settings, medicalRate: parseFloat(text) || 0.21})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Charity Rate ($/mile)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.charityRate.toString()}
              onChangeText={(text) => saveSettings({...settings, charityRate: parseFloat(text) || 0.14})}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" backgroundColor="#667eea" />
      
      <View style={styles.main}>
        {currentView === 'home' && renderHome()}
        {currentView === 'trips' && renderTrips()}
        {currentView === 'export' && renderExport()}
      </View>
      
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, currentView === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={styles.navIcon}>🚗</Text>
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'export' && styles.navButtonActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navText, currentView === 'export' && styles.navTextActive]}>Export</Text>
        </TouchableOpacity>
      </View>
      
      {renderManualModal()}
      {renderReceiptModal()}
      {renderSettingsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea'
  },
  main: {
    flex: 1,
    backgroundColor: '#f8f9ff'
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff'
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4
  },
  apiStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8
  },
  apiStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 15
  },
  syncStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)'
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsIcon: {
    fontSize: 20
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  trackingCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  modeExplanation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 15
  },
  statusText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500'
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5
  },
  manualControls: {
    alignItems: 'center'
  },
  trackingButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center'
  },
  startButton: {
    backgroundColor: '#28a745'
  },
  stopButton: {
    backgroundColor: '#dc3545'
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  trackingButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2
  },
  addTripButton: {
    backgroundColor: '#667eea',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  addTripButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  tripCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  tripDate: {
    fontSize: 14,
    color: '#666'
  },
  tripBadges: {
    flexDirection: 'row'
  },
  tripMethod: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
    marginRight: 8
  },
  syncBadge: {
    fontSize: 12,
    fontWeight: '500'
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  tripDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  tripDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  tripCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  tripDeduction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745'
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  receiptInfo: {
    flex: 1
  },
  receiptCount: {
    fontSize: 12,
    color: '#666'
  },
  receiptAmount: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500'
  },
  tripActions: {
    flexDirection: 'row'
  },
  receiptButton: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500'
  },
  editButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6
  },
  editButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500'
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999'
  },
  exportCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center'
  },
  exportStat: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 10
  },
  exportButton: {
    backgroundColor: '#28a745',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 10
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5
  },
  navButtonActive: {
    transform: [{ scale: 1.05 }]
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 2
  },
  navText: {
    fontSize: 12,
    color: '#666'
  },
  navTextActive: {
    color: '#667eea',
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9ff'
  },
  modalHeader: {
    backgroundColor: '#667eea',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  closeButton: {
    fontSize: 24,
    color: 'white'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 15
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16
  },
  clientSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10
  },
  clientButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 6
  },
  clientButtonActive: {
    backgroundColor: '#667eea'
  },
  clientButtonText: {
    fontSize: 14,
    color: '#666'
  },
  clientButtonTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  categoryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center'
  },
  categoryButtonActive: {
    backgroundColor: '#667eea'
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666'
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  receiptCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  settingsSection: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15
  },
  apiStatusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  settingInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'right'
  }
});
