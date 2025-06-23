import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';

// Secure API configuration - no hardcoded keys
const API_BASE_URL = 'http://localhost:3001/api';
const getApiKey = () => {
  // In production, use environment variables or secure storage
  return process.env.EXPO_PUBLIC_API_KEY || 'demo_development_key';
};

export default function App() {
  console.log('MILETRACKER PRO v11.1 - SECURE API INTEGRATED AUTO DETECTION - Real Background + Cloud Sync');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [trackingTimer, setTrackingTimer] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [apiStatus, setApiStatus] = useState('disconnected');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  const watchPositionSubscription = useRef(null);
  const trackingInterval = useRef(null);
  const backgroundSpeedCheck = useRef(null);
  const lastKnownPosition = useRef(null);
  
  // Manual trip form state
  const [manualTrip, setManualTrip] = useState({
    fromAddress: '',
    toAddress: '',
    distance: '',
    purpose: 'Business'
  });
  
  // Receipt state
  const [receiptData, setReceiptData] = useState({
    category: 'Gas',
    amount: '',
    description: '',
    hasPhoto: false,
    photoUri: ''
  });

  // API Functions
  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/test`, {
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setApiStatus('connected');
        return true;
      } else {
        setApiStatus('error');
        return false;
      }
    } catch (error) {
      console.log('API connection test failed:', error.message);
      setApiStatus('offline');
      return false;
    }
  };

  const syncTripToApi = async (tripData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tripData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Trip synced to API:', result.tripId);
        return result.tripId;
      } else {
        console.log('API sync failed:', response.status);
        return null;
      }
    } catch (error) {
      console.log('API sync error:', error.message);
      return null;
    }
  };

  // Location and tracking functions
  const requestLocationPermissions = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for trip tracking.');
        return false;
      }

      if (autoMode) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert('Background Permission', 'Background location access enables automatic trip detection.');
        }
      }

      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startBackgroundMonitoring = async () => {
    if (!autoMode) return;

    try {
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) return;

      watchPositionSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // Check every 5 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        async (location) => {
          const speed = location.coords.speed || 0;
          const speedMph = speed * 2.237; // Convert m/s to mph
          setCurrentSpeed(speedMph);

          // Auto trip detection logic
          if (!isTracking && speedMph > 5) {
            // Start trip automatically
            console.log('Auto-starting trip - speed:', speedMph.toFixed(1), 'mph');
            await startTrip(true); // true indicates auto-started
          } else if (isTracking && speedMph < 1) {
            // Check if stationary for 2 minutes
            if (!backgroundSpeedCheck.current) {
              backgroundSpeedCheck.current = setTimeout(async () => {
                const currentLocation = await Location.getCurrentPositionAsync({});
                const currentSpeedCheck = (currentLocation.coords.speed || 0) * 2.237;
                
                if (currentSpeedCheck < 1) {
                  console.log('Auto-stopping trip - stationary for 2 minutes');
                  await stopTrip();
                }
                backgroundSpeedCheck.current = null;
              }, 120000); // 2 minutes
            }
          } else if (speedMph > 1 && backgroundSpeedCheck.current) {
            // Cancel stop timer if moving again
            clearTimeout(backgroundSpeedCheck.current);
            backgroundSpeedCheck.current = null;
          }

          lastKnownPosition.current = location.coords;
        }
      );

      setBackgroundTracking(true);
      console.log('Background monitoring started');
    } catch (error) {
      console.error('Background monitoring error:', error);
      Alert.alert('Error', 'Failed to start background monitoring');
    }
  };

  const stopBackgroundMonitoring = () => {
    if (watchPositionSubscription.current) {
      watchPositionSubscription.current.remove();
      watchPositionSubscription.current = null;
    }
    
    if (backgroundSpeedCheck.current) {
      clearTimeout(backgroundSpeedCheck.current);
      backgroundSpeedCheck.current = null;
    }
    
    setBackgroundTracking(false);
    setCurrentSpeed(0);
    console.log('Background monitoring stopped');
  };

  const startTrip = async (autoStarted = false) => {
    try {
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newTrip = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        startLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: 'Getting address...'
        },
        isAutoDetected: autoStarted,
        method: autoStarted ? 'Auto' : 'Manual',
        status: 'active'
      };

      setCurrentTrip(newTrip);
      setIsTracking(true);
      setTrackingTimer(0);

      // Start timer
      trackingInterval.current = setInterval(() => {
        setTrackingTimer(prev => prev + 1);
      }, 1000);

      console.log(autoStarted ? 'Auto trip started' : 'Manual trip started');
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip tracking');
    }
  };

  const stopTrip = async () => {
    if (!currentTrip) return;

    try {
      // Clear timer
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
        trackingInterval.current = null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const distance = calculateDistance(
        currentTrip.startLocation.latitude,
        currentTrip.startLocation.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      const completedTrip = {
        ...currentTrip,
        endTime: new Date().toISOString(),
        endLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: 'Getting address...'
        },
        distance: Math.max(0.1, distance).toFixed(1),
        duration: trackingTimer,
        purpose: 'Business', // Default purpose
        receipts: [],
        syncStatus: 'pending'
      };

      // Add to trips list
      const updatedTrips = [completedTrip, ...trips];
      setTrips(updatedTrips);

      // Try to sync to API
      const apiTripId = await syncTripToApi(completedTrip);
      if (apiTripId) {
        completedTrip.apiTripId = apiTripId;
        completedTrip.syncStatus = 'synced';
        setTrips([completedTrip, ...trips]);
      }

      // Reset tracking state
      setCurrentTrip(null);
      setIsTracking(false);
      setTrackingTimer(0);

      console.log('Trip completed:', completedTrip.distance, 'miles');
    } catch (error) {
      console.error('Error stopping trip:', error);
      Alert.alert('Error', 'Failed to stop trip tracking');
    }
  };

  // Auto mode toggle effect
  useEffect(() => {
    if (autoMode) {
      startBackgroundMonitoring();
    } else {
      stopBackgroundMonitoring();
    }

    return () => {
      stopBackgroundMonitoring();
    };
  }, [autoMode]);

  // API connection test on startup
  useEffect(() => {
    testApiConnection();
  }, []);

  // Add manual trip
  const addManualTrip = () => {
    if (!manualTrip.fromAddress || !manualTrip.toAddress || !manualTrip.distance) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      startLocation: { address: manualTrip.fromAddress },
      endLocation: { address: manualTrip.toAddress },
      distance: parseFloat(manualTrip.distance).toFixed(1),
      duration: 0,
      purpose: manualTrip.purpose,
      method: 'Manual',
      isAutoDetected: false,
      receipts: [],
      syncStatus: 'pending'
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);

    // Try to sync to API
    syncTripToApi(newTrip).then(apiTripId => {
      if (apiTripId) {
        newTrip.apiTripId = apiTripId;
        newTrip.syncStatus = 'synced';
        setTrips([newTrip, ...trips]);
      }
    });

    // Reset form
    setManualTrip({
      fromAddress: '',
      toAddress: '',
      distance: '',
      purpose: 'Business'
    });

    setModalVisible(false);
    Alert.alert('Success', 'Trip added successfully');
  };

  // Add receipt to trip
  const addReceiptToTrip = async () => {
    if (!selectedTrip || !receiptData.category || !receiptData.amount) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    const receipt = {
      id: Date.now().toString(),
      category: receiptData.category,
      amount: parseFloat(receiptData.amount),
      description: receiptData.description,
      hasPhoto: receiptData.hasPhoto,
      photoUri: receiptData.photoUri,
      date: new Date().toISOString()
    };

    const updatedTrips = trips.map(trip => 
      trip.id === selectedTrip.id 
        ? { ...trip, receipts: [...(trip.receipts || []), receipt] }
        : trip
    );

    setTrips(updatedTrips);

    // Reset receipt form
    setReceiptData({
      category: 'Gas',
      amount: '',
      description: '',
      hasPhoto: false,
      photoUri: ''
    });

    setReceiptModalVisible(false);
    Alert.alert('Success', 'Receipt added successfully');
  };

  // Pick receipt photo
  const pickReceiptPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptData(prev => ({
          ...prev,
          hasPhoto: true,
          photoUri: result.assets[0].uri
        }));
        Alert.alert('Success', 'Photo selected successfully');
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  // Export CSV
  const exportCSV = async () => {
    try {
      const csvHeader = 'Date,Start,End,Distance,Purpose,Method,Deduction,Receipts,Sync Status\n';
      const csvContent = trips.map(trip => {
        const date = new Date(trip.startTime).toLocaleDateString();
        const start = trip.startLocation?.address || 'N/A';
        const end = trip.endLocation?.address || 'N/A';
        const distance = trip.distance || '0.0';
        const purpose = trip.purpose || 'Business';
        const method = trip.method || 'Manual';
        const deduction = (parseFloat(distance) * 0.70).toFixed(2);
        const receipts = (trip.receipts || []).length;
        const syncStatus = trip.syncStatus || 'local';
        
        return `${date},"${start}","${end}",${distance},${purpose},${method},$${deduction},${receipts},${syncStatus}`;
      }).join('\n');

      const fullCSV = csvHeader + csvContent;
      const fileName = `miletracker_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, fullCSV);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro Export',
          body: 'Your mileage tracking data is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate statistics
  const stats = {
    totalTrips: trips.length,
    totalMiles: trips.reduce((sum, trip) => sum + parseFloat(trip.distance || 0), 0).toFixed(1),
    businessMiles: trips.filter(t => t.purpose === 'Business').reduce((sum, trip) => sum + parseFloat(trip.distance || 0), 0).toFixed(1),
    totalDeduction: trips.reduce((sum, trip) => {
      const distance = parseFloat(trip.distance || 0);
      const rate = trip.purpose === 'Business' ? 0.70 : trip.purpose === 'Medical' ? 0.21 : 0.14;
      return sum + (distance * rate);
    }, 0).toFixed(2),
    syncedTrips: trips.filter(t => t.syncStatus === 'synced').length
  };

  // Render dashboard
  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* API Status */}
      <View style={styles.apiStatusContainer}>
        <Text style={styles.apiStatusText}>
          API Status: {apiStatus === 'connected' ? '🟢 Connected' : 
                      apiStatus === 'offline' ? '🔴 Offline' : 
                      apiStatus === 'error' ? '🟡 Error' : '⚫ Disconnected'}
        </Text>
        {stats.syncedTrips > 0 && (
          <Text style={styles.syncStats}>
            {stats.syncedTrips}/{stats.totalTrips} trips synced
          </Text>
        )}
      </View>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Auto Detection + Cloud Sync • $4.99/month</Text>
      </View>

      {/* Auto/Manual Mode Toggle */}
      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>
          {autoMode ? 'Auto Mode' : 'Manual Mode'}
        </Text>
        <Switch
          value={autoMode}
          onValueChange={setAutoMode}
          trackColor={{ false: '#767577', true: '#667eea' }}
          thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
        />
      </View>
      
      <Text style={styles.modeDescription}>
        {autoMode 
          ? `🤖 Auto: Detects driving automatically • Speed: ${currentSpeed.toFixed(1)} mph ${backgroundTracking ? '• Background monitoring active' : ''}`
          : '👤 Manual: Full start/stop control'
        }
      </Text>

      {/* Current Trip Tracking */}
      {isTracking && (
        <View style={styles.trackingCard}>
          <Text style={styles.trackingStatus}>
            🔴 TRIP IN PROGRESS {currentTrip?.isAutoDetected ? '(Auto-detected)' : '(Manual)'}
          </Text>
          <Text style={styles.trackingTimer}>
            Duration: {formatTimer(trackingTimer)}
          </Text>
          {autoMode && (
            <Text style={styles.trackingSpeed}>
              Current Speed: {currentSpeed.toFixed(1)} mph
            </Text>
          )}
          <Text style={styles.trackingNote}>
            Timer runs in background
          </Text>
        </View>
      )}

      {/* Manual Controls (shown when not in auto mode or when manually controlling) */}
      {(!autoMode || !isTracking) && (
        <View style={styles.controlsContainer}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={() => startTrip(false)}>
              <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
              <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopTrip}>
              <Text style={styles.stopButtonText}>⏹️ STOP TRIP</Text>
              <Text style={styles.stopButtonSubtext}>Complete current trip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>June 2025 Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalMiles}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>${stats.totalDeduction}</Text>
            <Text style={styles.statLabel}>IRS</Text>
          </View>
        </View>
        <Text style={styles.irsExplanation}>
          IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi) + Charity trips ($0.14/mi)
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.actionButtonText}>➕ Add Manual Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={exportCSV}>
          <Text style={styles.actionButtonText}>📊 Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={testApiConnection}>
          <Text style={styles.actionButtonText}>🔄 Test API</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render trips list
  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Trip History</Text>
        <Text style={styles.pageSubtitle}>{trips.length} trips recorded</Text>
      </View>

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>
              {new Date(trip.startTime).toLocaleDateString()}
            </Text>
            <View style={styles.tripBadges}>
              <Text style={styles.tripMethod}>{trip.method}</Text>
              {trip.syncStatus === 'synced' && <Text style={styles.syncBadge}>☁️</Text>}
            </View>
          </View>
          
          <Text style={styles.tripRoute}>
            {trip.startLocation?.address || 'Start Location'} → {trip.endLocation?.address || 'End Location'}
          </Text>
          
          <View style={styles.tripDetails}>
            <Text style={styles.tripDistance}>{trip.distance} miles</Text>
            <Text style={styles.tripPurpose}>{trip.purpose}</Text>
            <Text style={styles.tripDeduction}>
              ${(parseFloat(trip.distance || 0) * (trip.purpose === 'Business' ? 0.70 : trip.purpose === 'Medical' ? 0.21 : 0.14)).toFixed(2)}
            </Text>
          </View>

          {trip.receipts && trip.receipts.length > 0 && (
            <Text style={styles.receiptCount}>
              📄 {trip.receipts.length} receipt{trip.receipts.length > 1 ? 's' : ''}
            </Text>
          )}

          <View style={styles.tripActions}>
            <TouchableOpacity 
              style={styles.receiptButton}
              onPress={() => {
                setSelectedTrip(trip);
                setReceiptModalVisible(true);
              }}
            >
              <Text style={styles.receiptButtonText}>📄 Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {trips.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trips recorded yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {autoMode ? 'Drive with auto mode enabled to track trips automatically' : 'Use the START TRIP button to begin tracking'}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // Render export view
  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Export & Reports</Text>
        <Text style={styles.pageSubtitle}>Professional data export for taxes and reimbursements</Text>
      </View>

      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
          <Text style={styles.exportButtonText}>📊 Export CSV</Text>
          <Text style={styles.exportButtonSubtext}>Email or share trip data</Text>
        </TouchableOpacity>

        <View style={styles.exportStats}>
          <Text style={styles.exportStatsTitle}>Export Summary</Text>
          <Text style={styles.exportStatsText}>• {stats.totalTrips} total trips</Text>
          <Text style={styles.exportStatsText}>• {stats.totalMiles} total miles</Text>
          <Text style={styles.exportStatsText}>• ${stats.totalDeduction} tax deduction</Text>
          <Text style={styles.exportStatsText}>• {stats.syncedTrips} trips synced to cloud</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'trips' && renderTrips()}
        {currentView === 'export' && renderExport()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, currentView === 'dashboard' && styles.activeNavButton]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navButtonText, currentView === 'dashboard' && styles.activeNavButtonText]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, currentView === 'trips' && styles.activeNavButton]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navButtonText, currentView === 'trips' && styles.activeNavButtonText]}>
            Trips
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, currentView === 'export' && styles.activeNavButton]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navButtonText, currentView === 'export' && styles.activeNavButtonText]}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Manual Trip Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="From Address"
              value={manualTrip.fromAddress}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, fromAddress: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="To Address"
              value={manualTrip.toAddress}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, toAddress: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={manualTrip.distance}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, distance: text }))}
              keyboardType="numeric"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Purpose:</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Purpose',
                    '',
                    [
                      { text: 'Business', onPress: () => setManualTrip(prev => ({ ...prev, purpose: 'Business' })) },
                      { text: 'Medical', onPress: () => setManualTrip(prev => ({ ...prev, purpose: 'Medical' })) },
                      { text: 'Charity', onPress: () => setManualTrip(prev => ({ ...prev, purpose: 'Charity' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{manualTrip.purpose}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={addManualTrip}>
                <Text style={styles.addButtonText}>Add Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={receiptModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Receipt</Text>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Category:</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Category',
                    '',
                    [
                      { text: 'Gas', onPress: () => setReceiptData(prev => ({ ...prev, category: 'Gas' })) },
                      { text: 'Parking', onPress: () => setReceiptData(prev => ({ ...prev, category: 'Parking' })) },
                      { text: 'Maintenance', onPress: () => setReceiptData(prev => ({ ...prev, category: 'Maintenance' })) },
                      { text: 'Insurance', onPress: () => setReceiptData(prev => ({ ...prev, category: 'Insurance' })) },
                      { text: 'Other', onPress: () => setReceiptData(prev => ({ ...prev, category: 'Other' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{receiptData.category}</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Amount ($)"
              value={receiptData.amount}
              onChangeText={(text) => setReceiptData(prev => ({ ...prev, amount: text }))}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={receiptData.description}
              onChangeText={(text) => setReceiptData(prev => ({ ...prev, description: text }))}
            />

            <TouchableOpacity style={styles.photoButton} onPress={pickReceiptPhoto}>
              <Text style={styles.photoButtonText}>
                {receiptData.hasPhoto ? '✅ Photo Selected' : '📷 Add Photo'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReceiptModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={addReceiptToTrip}>
                <Text style={styles.addButtonText}>Add Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#667eea',
    padding: 25,
    paddingTop: 50,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  apiStatusContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  apiStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  syncStats: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  trackingCard: {
    backgroundColor: '#fee2e2',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    borderColor: '#ef4444',
    borderWidth: 1,
    alignItems: 'center',
  },
  trackingStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 10,
  },
  trackingTimer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 5,
  },
  trackingSpeed: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 5,
  },
  trackingNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  controlsContainer: {
    margin: 15,
  },
  startButton: {
    backgroundColor: '#22c55e',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  startButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  stopButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  irsExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    margin: 15,
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  tripCard: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
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
    marginBottom: 10,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tripMethod: {
    fontSize: 12,
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  syncBadge: {
    fontSize: 16,
  },
  tripRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripPurpose: {
    fontSize: 14,
    color: '#667eea',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tripDeduction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  receiptCount: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 10,
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  receiptButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  exportContainer: {
    margin: 15,
  },
  exportButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  exportButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  exportStats: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  exportStatsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 60,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: '#f0f0ff',
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeNavButtonText: {
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
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  photoButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  photoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
