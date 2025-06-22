import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking,
  Image,
  Switch,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function App() {
  console.log('MILETRACKER PRO v8.0 - AUTO TRACKER FIXED');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showTripMap, setShowTripMap] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newTrip, setNewTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business'
  });

  // Auto tracking functionality
  const [autoMode, setAutoMode] = useState(false); // This was missing!
  const [backgroundLocationTask, setBackgroundLocationTask] = useState(null);
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [movementDetected, setMovementDetected] = useState(false);

  // Settings states
  const [settings, setSettings] = useState({
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    minimumDistance: 0.1,
    roundingPrecision: 1
  });

  // Receipt capture states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState({
    category: 'Gas',
    amount: '',
    description: ''
  });
  const [capturedReceipts, setCapturedReceipts] = useState([]);

  // Timer for active tracking
  const [trackingDuration, setTrackingDuration] = useState(0);

  useEffect(() => {
    initializeSampleData();
    requestLocationPermissions();
  }, []);

  // Background timer for tracking duration
  useEffect(() => {
    let interval;
    if (isTracking && currentTrip) {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(currentTrip.startTime);
        const duration = Math.floor((now - startTime) / 1000 / 60); // minutes
        setTrackingDuration(duration);
      }, 1000);
    } else {
      setTrackingDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentTrip]);

  // Auto tracking effect
  useEffect(() => {
    if (autoMode && !backgroundLocationTask) {
      startAutoTracking();
    } else if (!autoMode && backgroundLocationTask) {
      stopAutoTracking();
    }
  }, [autoMode]);

  const requestLocationPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required for trip tracking');
        return false;
      }
      
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        Alert.alert('Background Permission', 'Allow background location for automatic trip detection');
      }
      
      return true;
    } catch (error) {
      console.log('Permission error:', error);
      return false;
    }
  };

  const startAutoTracking = async () => {
    try {
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) return;

      const locationTask = await Location.startLocationUpdatesAsync('backgroundLocationTask', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 50, // 50 meters
        deferredUpdatesInterval: 60000, // 1 minute
        foregroundService: {
          notificationTitle: 'MileTracker Pro',
          notificationBody: 'Automatic trip detection active',
        },
      });
      
      setBackgroundLocationTask(locationTask);
      console.log('Auto tracking started');
    } catch (error) {
      console.log('Auto tracking error:', error);
      Alert.alert('Auto Tracking Error', 'Could not start automatic detection');
    }
  };

  const stopAutoTracking = async () => {
    try {
      if (backgroundLocationTask) {
        await Location.stopLocationUpdatesAsync('backgroundLocationTask');
        setBackgroundLocationTask(null);
        console.log('Auto tracking stopped');
      }
    } catch (error) {
      console.log('Stop tracking error:', error);
    }
  };

  const initializeSampleData = () => {
    const sampleTrips = [
      {
        id: 1,
        startLocation: 'Home',
        endLocation: 'Office',
        distance: 12.5,
        duration: 25,
        category: 'Business',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        method: 'GPS'
      },
      {
        id: 2,
        startLocation: 'Office',
        endLocation: 'Client Meeting',
        distance: 8.3,
        duration: 18,
        category: 'Business',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
        method: 'Manual'
      }
    ];
    setTrips(sampleTrips);
  };

  const startManualTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for trip tracking');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const startLocation = address[0] ? 
        `${address[0].street || ''} ${address[0].city || ''}`.trim() : 
        'Current Location';

      const newTrip = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        startLocation: startLocation,
        startCoords: location.coords,
        routeCoords: [location.coords]
      };

      setCurrentTrip(newTrip);
      setIsTracking(true);
      
      Alert.alert('Trip Started', `GPS tracking started from: ${startLocation}`);
    } catch (error) {
      Alert.alert('GPS Error', 'Unable to get location. You can still add trips manually.');
    }
  };

  const stopManualTracking = async () => {
    if (!currentTrip) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const endLocation = address[0] ? 
        `${address[0].street || ''} ${address[0].city || ''}`.trim() : 
        'Current Location';

      const endTime = new Date();
      const duration = Math.round((endTime - new Date(currentTrip.startTime)) / 60000);
      const distance = calculateDistance(
        currentTrip.startCoords.latitude,
        currentTrip.startCoords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      const completedTrip = {
        ...currentTrip,
        endTime: endTime.toISOString(),
        endLocation: endLocation,
        endCoords: location.coords,
        distance: Math.max(distance, 0.1),
        duration: Math.max(duration, 1),
        category: 'Business',
        method: 'GPS'
      };

      setTrips(prev => [completedTrip, ...prev]);
      setCurrentTrip(null);
      setIsTracking(false);
      
      Alert.alert(
        'Trip Completed',
        `Distance: ${Math.max(distance, 0.1).toFixed(1)} miles\nDuration: ${Math.max(duration, 1)} minutes`
      );
    } catch (error) {
      Alert.alert('Error', 'Could not complete trip');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRadians = (degrees) => degrees * (Math.PI/180);

  const addManualTrip = () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const distance = parseFloat(newTrip.distance);
    const rate = newTrip.category === 'Business' ? settings.businessRate :
                 newTrip.category === 'Medical' ? settings.medicalRate :
                 newTrip.category === 'Charity' ? settings.charityRate : 0.70;

    const trip = {
      id: Date.now(),
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: distance,
      duration: Math.round(distance * 2), // Estimate 2 minutes per mile
      category: newTrip.category,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      method: 'Manual',
      cost: distance * rate
    };

    setTrips(prev => [trip, ...prev]);
    setNewTrip({
      startLocation: '',
      endLocation: '',
      distance: '',
      category: 'Business'
    });
    setShowAddTrip(false);
    
    Alert.alert('Trip Added', `${trip.distance} miles added successfully`);
  };

  const calculateTotals = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTrips = trips.filter(trip => {
      const tripDate = new Date(trip.startTime);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });

    const totalTrips = monthlyTrips.length;
    const totalDistance = monthlyTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    const businessMiles = monthlyTrips.filter(t => t.category === 'Business').reduce((sum, t) => sum + (t.distance || 0), 0);
    const medicalMiles = monthlyTrips.filter(t => t.category === 'Medical').reduce((sum, t) => sum + (t.distance || 0), 0);
    const charityMiles = monthlyTrips.filter(t => t.category === 'Charity').reduce((sum, t) => sum + (t.distance || 0), 0);
    
    const totalDeduction = (businessMiles * settings.businessRate) + 
                          (medicalMiles * settings.medicalRate) + 
                          (charityMiles * settings.charityRate);

    return { totalTrips, totalDistance, totalDeduction };
  };

  // Render functions
  const renderDashboard = () => {
    const { totalTrips, totalDistance, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>MileTracker Pro</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtext}>Professional Mileage Tracking - $4.99/month</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>June 2025 Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalTrips}</Text>
              <Text style={styles.summaryLabel}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalDistance.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>${totalDeduction.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>IRS</Text>
            </View>
          </View>
          <Text style={styles.irsExplanation}>
            IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi)
          </Text>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.modeToggle}>
            <TouchableOpacity 
              style={[styles.modeButton, autoMode && styles.modeButtonActive]}
              onPress={() => setAutoMode(true)}
            >
              <Text style={[styles.modeButtonText, autoMode && styles.modeButtonTextActive]}>
                🤖 Auto Mode
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, !autoMode && styles.modeButtonActive]}
              onPress={() => setAutoMode(false)}
            >
              <Text style={[styles.modeButtonText, !autoMode && styles.modeButtonTextActive]}>
                👆 Manual Mode
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeExplanation}>
            Auto: Detects driving automatically • Manual: Full start/stop control
          </Text>
          
          {isTracking ? (
            <View style={styles.trackingActive}>
              <Text style={styles.trackingStatus}>🔴 Trip in Progress</Text>
              <Text style={styles.trackingDuration}>
                Duration: {Math.floor(trackingDuration / 60)}:{(trackingDuration % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={styles.trackingNote}>Timer runs in background</Text>
              
              <TouchableOpacity style={styles.stopButton} onPress={stopManualTracking}>
                <Text style={styles.stopButtonText}>🛑 STOP TRIP</Text>
              </TouchableOpacity>
            </View>
          ) : autoMode ? (
            <View style={styles.trackingInactive}>
              <Text style={styles.trackingStatus}>🤖 Automatic Detection Active</Text>
              <Text style={styles.autoStatus}>
                {backgroundLocationTask ? 
                  '🟢 Monitoring for driving activity' :
                  '🔴 Background permission needed'
                }
              </Text>
              
              <TouchableOpacity style={styles.manualButton} onPress={() => setShowAddTrip(true)}>
                <Text style={styles.manualButtonText}>+ Add Manual Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.trackingInactive}>
              <Text style={styles.trackingStatus}>👆 Manual Control Mode</Text>
              <Text style={styles.manualAdvantage}>✓ Start when ready ✓ Stop anytime ✓ Your choice</Text>
              
              <TouchableOpacity style={styles.startButton} onPress={startManualTracking}>
                <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
                <Text style={styles.startButtonSub}>Instant tracking control</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.manualButton} onPress={() => setShowAddTrip(true)}>
                <Text style={styles.manualButtonText}>+ Add Manual Trip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Trip History</Text>
        </View>
        
        {trips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripRoute}>
                {trip.startLocation} → {trip.endLocation}
              </Text>
              <Text style={styles.tripCategory}>{trip.category}</Text>
            </View>
            
            <View style={styles.tripDetails}>
              <Text style={styles.tripInfo}>
                {trip.distance?.toFixed(1)} mi • {trip.duration} min • {trip.method}
              </Text>
              <Text style={styles.tripDate}>
                {new Date(trip.startTime).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.tripActions}>
              <TouchableOpacity 
                style={styles.receiptButton}
                onPress={() => {
                  setSelectedTrip(trip);
                  setShowReceiptModal(true);
                }}
              >
                <Text style={styles.receiptButtonText}>📄 Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderExport = () => {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Export & Reports</Text>
        </View>
        
        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>CSV Export</Text>
          <Text style={styles.exportDescription}>
            Export trip data for taxes, employee reimbursements, and contractor payments
          </Text>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => Alert.alert('Export', 'CSV export feature coming soon')}
          >
            <Text style={styles.exportButtonText}>📊 Export All Trips</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#667eea" />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentView === 'dashboard' && styles.navItemActive]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, currentView === 'trips' && styles.navItemActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>
            Trips
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, currentView === 'export' && styles.navItemActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navText, currentView === 'export' && styles.navTextActive]}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Trip Modal */}
      <Modal visible={showAddTrip} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Manual Trip</Text>
              <TouchableOpacity onPress={() => setShowAddTrip(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Start Location</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.startLocation}
                onChangeText={(text) => setNewTrip({...newTrip, startLocation: text})}
                placeholder="Enter start location"
              />
              
              <Text style={styles.inputLabel}>End Location</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.endLocation}
                onChangeText={(text) => setNewTrip({...newTrip, endLocation: text})}
                placeholder="Enter end location"
              />
              
              <Text style={styles.inputLabel}>Distance (miles)</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.distance}
                onChangeText={(text) => setNewTrip({...newTrip, distance: text})}
                placeholder="Enter distance"
                keyboardType="numeric"
              />
              
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {['Business', 'Medical', 'Charity'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newTrip.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewTrip({...newTrip, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newTrip.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.addButton} onPress={addManualTrip}>
                <Text style={styles.addButtonText}>Add Trip</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.receiptAction}
                onPress={() => Alert.alert('Camera', 'Camera feature coming soon')}
              >
                <Text style={styles.receiptActionText}>📷 Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.receiptAction}
                onPress={() => Alert.alert('Gallery', 'Gallery feature coming soon')}
              >
                <Text style={styles.receiptActionText}>🖼️ Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header styles
  headerContainer: {
    backgroundColor: '#667eea',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  settingsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  settingsIcon: {
    fontSize: 18,
  },
  
  // Summary card styles
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
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
  irsExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  
  // Tracking card styles
  trackingCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#667eea',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  modeExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Tracking status styles
  trackingActive: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffe6e6',
    borderRadius: 10,
  },
  trackingInactive: {
    alignItems: 'center',
    padding: 20,
  },
  trackingStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  trackingDuration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  trackingNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  autoStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  manualAdvantage: {
    fontSize: 14,
    color: '#4a90e2',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  // Button styles
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButtonSub: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Trip card styles
  tripCard: {
    margin: 20,
    marginTop: 0,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripRoute: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  tripCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripInfo: {
    fontSize: 12,
    color: '#666',
  },
  tripDate: {
    fontSize: 12,
    color: '#666',
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  receiptButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Export styles
  exportCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  exportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  navItemActive: {
    backgroundColor: '#f0f0f0',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  navTextActive: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  
  // Form styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Receipt modal styles
  receiptAction: {
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  receiptActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
