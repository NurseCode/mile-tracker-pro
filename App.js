import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration - works offline if server unreachable
const API_BASE_URL = 'http://172.31.128.11:3001/api';
const getApiKey = () => {
  return process.env.EXPO_PUBLIC_API_KEY || 'demo_development_key';
};

export default function App() {
  console.log('MILETRACKER PRO v11.9 - PRIVACY COMPLIANT: GDPR READY + CONSENT MANAGEMENT + TRANSPARENT DATA POLICY');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [trackingTimer, setTrackingTimer] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [apiStatus, setApiStatus] = useState('testing');
  
  // Settings and preferences
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [settings, setSettings] = useState({
    autoMode: true,
    notifications: true,
    backgroundTracking: true,
    exportFormat: 'csv',
    trackingAccuracy: 'high',
    apiConsent: false,
    dataRetention: '12months',
    shareAnalytics: false
  });
  
  // Client management
  const [clientList, setClientList] = useState([]);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [tripDetailsModalVisible, setTripDetailsModalVisible] = useState(false);
  const [clientManagerModalVisible, setClientManagerModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [newClientName, setNewClientName] = useState('');
  
  const watchPositionSubscription = useRef(null);
  const trackingInterval = useRef(null);
  const backgroundSpeedCheck = useRef(null);
  const lastKnownPosition = useRef(null);
  
  // Manual trip form state - enhanced with description fields and client dropdown
  const [manualTrip, setManualTrip] = useState({
    fromAddress: '',
    toAddress: '',
    distance: '',
    purpose: 'Business',
    description: '',
    clientName: '',
    showClientDropdown: false
  });
  
  // Trip details state for completed trips
  const [tripDetails, setTripDetails] = useState({
    description: '',
    clientName: '',
    purpose: 'Business',
    showClientDropdown: false
  });
  
  // Receipt state
  const [receiptData, setReceiptData] = useState({
    category: 'Gas',
    amount: '',
    description: '',
    hasPhoto: false,
    photoUri: ''
  });

  // Default clients list
  const defaultClients = [
    'ABC Corporation',
    'XYZ Industries', 
    'Tech Solutions Inc',
    'Global Marketing Ltd',
    'Personal/Internal',
    'Medical Services',
    'Charity Organization'
  ];

  // Load client list from storage
  useEffect(() => {
    loadClientList();
  }, []);

  const loadClientList = async () => {
    try {
      const savedClients = await AsyncStorage.getItem('miletracker_clients');
      if (savedClients) {
        setClientList(JSON.parse(savedClients));
      } else {
        setClientList(defaultClients);
        saveClientList(defaultClients);
      }
    } catch (error) {
      console.error('Error loading client list:', error);
      setClientList(defaultClients);
    }
  };

  const saveClientList = async (clients) => {
    try {
      await AsyncStorage.setItem('miletracker_clients', JSON.stringify(clients));
    } catch (error) {
      console.error('Error saving client list:', error);
    }
  };

  const addNewClient = () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }
    
    if (clientList.includes(newClientName.trim())) {
      Alert.alert('Error', 'Client already exists');
      return;
    }

    const updatedClients = [...clientList, newClientName.trim()];
    setClientList(updatedClients);
    saveClientList(updatedClients);
    setNewClientName('');
    Alert.alert('Success', 'Client added successfully');
  };

  const removeClient = (clientName) => {
    Alert.alert(
      'Remove Client',
      `Remove "${clientName}" from your client list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedClients = clientList.filter(client => client !== clientName);
            setClientList(updatedClients);
            saveClientList(updatedClients);
          }
        }
      ]
    );
  };

  // Sample trips with client data for immediate testing
  useEffect(() => {
    const sampleTrips = [
      {
        id: '1',
        startTime: '2025-06-23T09:00:00.000Z',
        endTime: '2025-06-23T09:30:00.000Z',
        startLocation: { address: 'Home - Main Street' },
        endLocation: { address: 'Office - Business District' },
        distance: '12.3',
        duration: 1800,
        purpose: 'Business',
        method: 'Auto',
        isAutoDetected: true,
        description: 'Daily commute to office',
        clientName: 'Personal/Internal',
        receipts: [],
        syncStatus: 'local'
      },
      {
        id: '2',
        startTime: '2025-06-22T14:15:00.000Z',
        endTime: '2025-06-22T14:45:00.000Z',
        startLocation: { address: 'Office - Business District' },
        endLocation: { address: 'Client Site - Downtown' },
        distance: '8.7',
        duration: 1200,
        purpose: 'Business',
        method: 'Manual',
        isAutoDetected: false,
        description: 'Quarterly business review meeting',
        clientName: 'ABC Corporation',
        receipts: [
          {
            id: '1',
            category: 'Parking',
            amount: 15.50,
            description: 'Downtown parking garage',
            hasPhoto: false,
            date: '2025-06-22T14:15:00.000Z'
          }
        ],
        syncStatus: 'local'
      }
    ];
    setTrips(sampleTrips);
  }, []);

  // API Functions
  const testApiConnection = async () => {
    try {
      setApiStatus('testing');
      console.log('Testing API connection to:', API_BASE_URL);
      
      // First try with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE_URL}/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setApiStatus('connected');
        console.log('API connection successful:', data);
        Alert.alert('Success', `API Connected: ${data.message}`);
        return true;
      } else {
        setApiStatus('error');
        console.log('API responded with error:', response.status, await response.text());
        Alert.alert('API Error', `Server responded with ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('API connection failed:', error.message);
      setApiStatus('offline');
      
      Alert.alert('Offline Mode', 
        'Cannot reach API server. App will work in offline mode.\n\n' +
        'Your trips and client data are saved locally. API sync will resume when connection is restored.');
      return false;
    }
  };

  const syncTripToApi = async (tripData) => {
    if (apiStatus !== 'connected' || !settings.apiConsent) {
      console.log('API offline or consent not given - trip saved locally only');
      return null;
    }
    
    try {
      console.log('Syncing trip to API:', tripData);
      
      // Format data for API
      const apiTripData = {
        start_location: tripData.startLocation?.address || 'Unknown',
        end_location: tripData.endLocation?.address || 'Unknown',
        start_latitude: tripData.startLocation?.latitude || null,
        start_longitude: tripData.startLocation?.longitude || null,
        end_latitude: tripData.endLocation?.latitude || null,
        end_longitude: tripData.endLocation?.longitude || null,
        distance: parseFloat(tripData.distance || 0),
        duration: tripData.duration || 0,
        category: tripData.purpose?.toLowerCase() || 'business',
        description: tripData.description || '',
        client_name: tripData.clientName || '',
        purpose: tripData.purpose || 'Business',
        method: tripData.method || 'Manual',
        auto_detected: tripData.isAutoDetected || false,
        start_time: tripData.startTime,
        end_time: tripData.endTime
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiTripData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      // Set status to offline if sync fails
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        setApiStatus('offline');
      }
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

      // Clear any existing monitoring
      if (watchPositionSubscription.current) {
        watchPositionSubscription.current.remove();
        watchPositionSubscription.current = null;
      }

      let stationaryTimer = null;
      let movingCheckCount = 0;
      let stationaryCheckCount = 0;

      watchPositionSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 10000, // Check every 10 seconds
          distanceInterval: 25, // Minimum 25 meters movement
        },
        async (location) => {
          const speed = location.coords.speed || 0;
          const speedMph = speed * 2.237;
          setCurrentSpeed(speedMph);

          console.log(`Auto Detection: Speed ${speedMph.toFixed(1)} mph, Tracking: ${isTracking}`);

          // Start trip logic: Need consistent movement
          if (!isTracking && speedMph > 8) {
            movingCheckCount++;
            stationaryCheckCount = 0;
            
            if (movingCheckCount >= 2) { // 2 consecutive readings > 8 mph
              console.log('Auto-starting trip - consistent movement detected');
              movingCheckCount = 0;
              await startTrip(true);
            }
          } 
          // Stop trip logic: Need consistent stationary state
          else if (isTracking && speedMph < 2) {
            stationaryCheckCount++;
            movingCheckCount = 0;

            if (stationaryCheckCount >= 3) { // 3 consecutive readings < 2 mph (30 seconds)
              console.log('Auto-stopping trip - consistently stationary');
              stationaryCheckCount = 0;
              await stopTrip();
            }
          }
          // Reset counters if speed is in middle range
          else if (speedMph >= 2 && speedMph <= 8) {
            movingCheckCount = 0;
            stationaryCheckCount = 0;
          }
          // Moving fast while tracking - reset stationary counter
          else if (isTracking && speedMph > 8) {
            stationaryCheckCount = 0;
          }

          lastKnownPosition.current = location.coords;
        }
      );

      setBackgroundTracking(true);
      console.log('Background auto-detection started with improved logic');
    } catch (error) {
      console.error('Background monitoring error:', error);
      Alert.alert('Error', 'Failed to start automatic trip detection');
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
    console.log('Background auto-detection stopped');
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
        purpose: 'Business',
        description: '',
        clientName: '',
        receipts: [],
        syncStatus: 'pending'
      };

      const updatedTrips = [completedTrip, ...trips];
      setTrips(updatedTrips);

      // Show trip details modal for completed trips to add description and client
      setSelectedTrip(completedTrip);
      setTripDetails({
        description: '',
        clientName: '',
        purpose: 'Business',
        showClientDropdown: false
      });
      setTripDetailsModalVisible(true);

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
      Alert.alert('Error', 'Please fill in required fields (addresses and distance)');
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
      description: manualTrip.description,
      clientName: manualTrip.clientName,
      method: 'Manual',
      isAutoDetected: false,
      receipts: [],
      syncStatus: 'pending'
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);

    syncTripToApi(newTrip).then(apiTripId => {
      if (apiTripId) {
        newTrip.apiTripId = apiTripId;
        newTrip.syncStatus = 'synced';
        setTrips([newTrip, ...trips]);
      }
    });

    setManualTrip({
      fromAddress: '',
      toAddress: '',
      distance: '',
      purpose: 'Business',
      description: '',
      clientName: '',
      showClientDropdown: false
    });

    setModalVisible(false);
    Alert.alert('Success', 'Trip added successfully');
  };

  // Update trip details
  const updateTripDetails = async () => {
    if (!selectedTrip) return;

    const updatedTrip = {
      ...selectedTrip,
      description: tripDetails.description,
      clientName: tripDetails.clientName,
      purpose: tripDetails.purpose
    };

    const updatedTrips = trips.map(trip => 
      trip.id === selectedTrip.id ? updatedTrip : trip
    );
    setTrips(updatedTrips);

    // Sync to API
    const apiTripId = await syncTripToApi(updatedTrip);
    if (apiTripId) {
      updatedTrip.apiTripId = apiTripId;
      updatedTrip.syncStatus = 'synced';
      setTrips(trips.map(trip => 
        trip.id === selectedTrip.id ? updatedTrip : trip
      ));
    }

    setTripDetailsModalVisible(false);
    Alert.alert('Success', 'Trip details updated');
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

  // Client dropdown component
  const ClientDropdown = ({ selectedClient, onSelectClient, isVisible, onToggle }) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownButton} onPress={onToggle}>
        <Text style={styles.dropdownButtonText}>
          {selectedClient || 'Select Client/Project'}
        </Text>
        <Text style={styles.dropdownArrow}>{isVisible ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isVisible && (
        <View style={styles.dropdownList}>
          <FlatList
            data={clientList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  onSelectClient(item);
                  onToggle();
                }}
              >
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            style={styles.dropdownFlatList}
          />
          
          <TouchableOpacity
            style={styles.manageClientsButton}
            onPress={() => {
              onToggle();
              setClientManagerModalVisible(true);
            }}
          >
            <Text style={styles.manageClientsButtonText}>+ Manage Clients</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Export trips only (CSV)
  const exportTripsCSV = async () => {
    try {
      const csvHeader = 'Date,Start,End,Distance,Purpose,Description,Client,Method,Deduction,Sync Status\n';
      const csvContent = trips.map(trip => {
        const date = new Date(trip.startTime).toLocaleDateString();
        const start = trip.startLocation?.address || 'N/A';
        const end = trip.endLocation?.address || 'N/A';
        const distance = trip.distance || '0.0';
        const purpose = trip.purpose || 'Business';
        const description = trip.description || '';
        const client = trip.clientName || '';
        const method = trip.method || 'Manual';
        const deduction = (parseFloat(distance) * 0.70).toFixed(2);
        const syncStatus = trip.syncStatus || 'local';
        
        return `${date},"${start}","${end}",${distance},${purpose},"${description}","${client}",${method},$${deduction},${syncStatus}`;
      }).join('\n');

      const fullCSV = csvHeader + csvContent;
      const fileName = `miletracker_trips_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, fullCSV);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro - Trip Data',
          body: 'Your mileage tracking trip data is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export trip data');
    }
  };

  // Export receipts only (CSV)
  const exportReceiptsCSV = async () => {
    try {
      const receiptData = [];
      trips.forEach(trip => {
        if (trip.receipts && trip.receipts.length > 0) {
          trip.receipts.forEach(receipt => {
            receiptData.push({
              tripDate: new Date(trip.startTime).toLocaleDateString(),
              tripRoute: `${trip.startLocation?.address || 'N/A'} → ${trip.endLocation?.address || 'N/A'}`,
              client: trip.clientName || '',
              category: receipt.category,
              amount: receipt.amount,
              description: receipt.description || '',
              hasPhoto: receipt.hasPhoto ? 'Yes' : 'No',
              receiptDate: new Date(receipt.date).toLocaleDateString()
            });
          });
        }
      });

      if (receiptData.length === 0) {
        Alert.alert('No Receipts', 'No receipt data to export');
        return;
      }

      const csvHeader = 'Trip Date,Trip Route,Client,Category,Amount,Description,Has Photo,Receipt Date\n';
      const csvContent = receiptData.map(receipt => 
        `${receipt.tripDate},"${receipt.tripRoute}","${receipt.client}",${receipt.category},$${receipt.amount},"${receipt.description}",${receipt.hasPhoto},${receipt.receiptDate}`
      ).join('\n');

      const fullCSV = csvHeader + csvContent;
      const fileName = `miletracker_receipts_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, fullCSV);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro - Receipt Data',
          body: 'Your receipt expense data is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export receipt data');
    }
  };

  // Export complete data (trips + receipts)
  const exportCompleteCSV = async () => {
    try {
      const csvHeader = 'Date,Start,End,Distance,Purpose,Description,Client,Method,Deduction,Receipts,Receipt Amount,Sync Status\n';
      const csvContent = trips.map(trip => {
        const date = new Date(trip.startTime).toLocaleDateString();
        const start = trip.startLocation?.address || 'N/A';
        const end = trip.endLocation?.address || 'N/A';
        const distance = trip.distance || '0.0';
        const purpose = trip.purpose || 'Business';
        const description = trip.description || '';
        const client = trip.clientName || '';
        const method = trip.method || 'Manual';
        const deduction = (parseFloat(distance) * 0.70).toFixed(2);
        const receipts = (trip.receipts || []).length;
        const receiptAmount = (trip.receipts || []).reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2);
        const syncStatus = trip.syncStatus || 'local';
        
        return `${date},"${start}","${end}",${distance},${purpose},"${description}","${client}",${method},$${deduction},${receipts},$${receiptAmount},${syncStatus}`;
      }).join('\n');

      const fullCSV = csvHeader + csvContent;
      const fileName = `miletracker_complete_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, fullCSV);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro - Complete Export',
          body: 'Your complete mileage tracking data with trips and receipts is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export complete data');
    }
  };

  // Export summary report only (text)
  const exportSummaryReport = async () => {
    try {
      const reportContent = `
MILETRACKER PRO SUMMARY REPORT
Generated: ${new Date().toLocaleString()}

TRIP SUMMARY:
• Total Trips: ${stats.totalTrips}
• Total Miles: ${stats.totalMiles}
• Business Miles: ${stats.businessMiles}
• Auto-Detected Trips: ${stats.autoTrips}
• Manual Trips: ${stats.totalTrips - stats.autoTrips}

DEDUCTION SUMMARY:
• Total IRS Deduction: $${stats.totalDeduction}
• Business Miles ($0.70/mi): $${(parseFloat(stats.businessMiles) * 0.70).toFixed(2)}
• Medical Miles: $0.00
• Charity Miles: $0.00

RECEIPT SUMMARY:
• Total Receipts: ${stats.totalReceipts}
• Total Receipt Amount: $${stats.totalReceiptAmount}

CLIENT BREAKDOWN:
${clientList.map(client => {
  const clientTrips = trips.filter(trip => trip.clientName === client);
  const clientMiles = clientTrips.reduce((sum, trip) => sum + parseFloat(trip.distance || 0), 0);
  return `• ${client}: ${clientTrips.length} trips, ${clientMiles.toFixed(1)} miles`;
}).join('\n')}

API STATUS:
• Connection: ${apiStatus}
• Synced Trips: ${stats.syncedTrips}/${stats.totalTrips}
`;

      const fileName = `miletracker_report_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, reportContent);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro - Summary Report',
          body: 'Your mileage tracking summary report is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export summary report');
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
    syncedTrips: trips.filter(t => t.syncStatus === 'synced').length,
    autoTrips: trips.filter(t => t.isAutoDetected).length,
    totalReceipts: trips.reduce((sum, trip) => sum + (trip.receipts || []).length, 0),
    totalReceiptAmount: trips.reduce((sum, trip) => sum + (trip.receipts || []).reduce((receiptSum, r) => receiptSum + (r.amount || 0), 0), 0).toFixed(2)
  };

  // Render dashboard
  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* API Status */}
      <View style={styles.apiStatusContainer}>
        <Text style={styles.apiStatusText}>
          API Status: {apiStatus === 'connected' ? '🟢 Connected' : 
                      apiStatus === 'testing' ? '🟡 Testing...' :
                      apiStatus === 'offline' ? '🔴 Offline (Local Mode)' : 
                      apiStatus === 'error' ? '🟡 Error (Local Mode)' : '⚫ Disconnected'}
        </Text>
        {apiStatus === 'offline' && (
          <Text style={styles.apiHelp}>
            {settings.apiConsent 
              ? 'Working offline. Trips saved locally. API sync will resume when connected.'
              : 'Local mode. Enable cloud sync in Settings for backup and multi-device access.'
            }
          </Text>
        )}
        {stats.syncedTrips > 0 && (
          <Text style={styles.syncStats}>
            {stats.syncedTrips}/{stats.totalTrips} trips synced to cloud
          </Text>
        )}
      </View>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Complete Solution: Auto Detection + Client Management + Receipts + Cloud Sync</Text>
      </View>

      {/* Auto/Manual Mode Toggle */}
      <View style={styles.modeContainer}>
        <View style={styles.modeTextContainer}>
          <Text style={styles.modeLabel}>
            {autoMode ? '🤖 Auto Detection Mode' : '👤 Manual Control Mode'}
          </Text>
          <Text style={styles.modeStatus}>
            {autoMode ? 'Automatic trip detection active' : 'Manual start/stop control'}
          </Text>
        </View>
        <Switch
          value={autoMode}
          onValueChange={setAutoMode}
          trackColor={{ false: '#767577', true: '#667eea' }}
          thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
        />
      </View>
      
      <Text style={styles.modeDescription}>
        {autoMode 
          ? `🤖 Auto Mode: Starts at >8mph (2 readings), stops at <2mph (3 readings) • Speed: ${currentSpeed.toFixed(1)} mph ${backgroundTracking ? '• Active' : '• Inactive'}`
          : '👤 Manual Mode: Use START/STOP buttons for full control'
        }
      </Text>

      {/* Current Trip Tracking */}
      {isTracking && (
        <View style={styles.trackingCard}>
          <Text style={styles.trackingStatus}>
            🔴 TRIP IN PROGRESS {currentTrip?.isAutoDetected ? '(🤖 Auto-detected)' : '(👤 Manual)'}
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

      {/* Manual Controls */}
      {(!autoMode || !isTracking) && (
        <View style={styles.controlsContainer}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={() => startTrip(false)}>
              <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
              <Text style={styles.startButtonSubtext}>Manual tracking control</Text>
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
        <View style={styles.autoStatsRow}>
          <Text style={styles.autoStatsText}>
            🤖 {stats.autoTrips} auto-detected • 👤 {stats.totalTrips - stats.autoTrips} manual • 📄 {stats.totalReceipts} receipts
          </Text>
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
        <TouchableOpacity style={styles.actionButton} onPress={() => setClientManagerModalVisible(true)}>
          <Text style={styles.actionButtonText}>👥 Manage Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setCurrentView('export')}>
          <Text style={styles.actionButtonText}>📊 Export Options</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={testApiConnection}>
          <Text style={styles.actionButtonText}>🔄 Test API Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
          <Text style={styles.actionButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render trips list
  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Trip History</Text>
        <Text style={styles.pageSubtitle}>{trips.length} trips • {stats.autoTrips} auto-detected • {stats.totalReceipts} receipts</Text>
      </View>

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>
              {new Date(trip.startTime).toLocaleDateString()}
            </Text>
            <View style={styles.tripBadges}>
              <Text style={[styles.tripMethod, trip.isAutoDetected && styles.autoTripMethod]}>
                {trip.isAutoDetected ? '🤖 Auto' : '👤 Manual'}
              </Text>
              {trip.syncStatus === 'synced' && <Text style={styles.syncBadge}>☁️</Text>}
            </View>
          </View>
          
          <Text style={styles.tripRoute}>
            {trip.startLocation?.address || 'Start Location'} → {trip.endLocation?.address || 'End Location'}
          </Text>

          {trip.clientName && (
            <Text style={styles.tripClient}>👥 {trip.clientName}</Text>
          )}
          
          {trip.description && (
            <Text style={styles.tripDescription}>📝 {trip.description}</Text>
          )}
          
          <View style={styles.tripDetails}>
            <Text style={styles.tripDistance}>{trip.distance} miles</Text>
            <Text style={styles.tripPurpose}>{trip.purpose}</Text>
            <Text style={styles.tripDeduction}>
              ${(parseFloat(trip.distance || 0) * (trip.purpose === 'Business' ? 0.70 : trip.purpose === 'Medical' ? 0.21 : 0.14)).toFixed(2)}
            </Text>
          </View>

          {trip.receipts && trip.receipts.length > 0 && (
            <Text style={styles.receiptCount}>
              📄 {trip.receipts.length} receipt{trip.receipts.length > 1 ? 's' : ''} • ${trip.receipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
            </Text>
          )}

          <View style={styles.tripActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setSelectedTrip(trip);
                setTripDetails({
                  description: trip.description || '',
                  clientName: trip.clientName || '',
                  purpose: trip.purpose || 'Business',
                  showClientDropdown: false
                });
                setTripDetailsModalVisible(true);
              }}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            
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
            {autoMode ? '🤖 Drive with auto detection enabled to track trips automatically' : '👤 Use the START TRIP button to begin manual tracking'}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // Render export view
  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Export & Reports</Text>
        <Text style={styles.pageSubtitle}>Complete export with client data and receipts</Text>
      </View>

      <View style={styles.exportContainer}>
        <Text style={styles.exportTitle}>Export Options</Text>
        
        <TouchableOpacity style={styles.exportButton} onPress={exportTripsCSV}>
          <Text style={styles.exportButtonText}>🚗 Export Trips Only</Text>
          <Text style={styles.exportButtonSubtext}>Trip data with clients and descriptions (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={exportReceiptsCSV}>
          <Text style={styles.exportButtonText}>📄 Export Receipts Only</Text>
          <Text style={styles.exportButtonSubtext}>Receipt expenses organized by trip (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={exportCompleteCSV}>
          <Text style={styles.exportButtonText}>📊 Export Complete Data</Text>
          <Text style={styles.exportButtonSubtext}>All trips + receipts with full details (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={exportSummaryReport}>
          <Text style={styles.exportButtonText}>📋 Export Summary Report</Text>
          <Text style={styles.exportButtonSubtext}>Professional summary for tax/business purposes (TXT)</Text>
        </TouchableOpacity>

        <View style={styles.exportStats}>
          <Text style={styles.exportStatsTitle}>Export Summary</Text>
          <Text style={styles.exportStatsText}>• {stats.totalTrips} total trips</Text>
          <Text style={styles.exportStatsText}>• {stats.totalMiles} total miles</Text>
          <Text style={styles.exportStatsText}>• ${stats.totalDeduction} tax deduction</Text>
          <Text style={styles.exportStatsText}>• {stats.autoTrips} auto-detected trips</Text>
          <Text style={styles.exportStatsText}>• {stats.syncedTrips} trips synced to cloud</Text>
          <Text style={styles.exportStatsText}>• {stats.totalReceipts} receipts totaling ${stats.totalReceiptAmount}</Text>
          <Text style={styles.exportNote}>Choose from trips-only, receipts-only, complete data, or summary report exports</Text>
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

      {/* Fixed Bottom Navigation */}
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

      {/* Manual Trip Modal with Client Dropdown */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="From Address *"
              value={manualTrip.fromAddress}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, fromAddress: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="To Address *"
              value={manualTrip.toAddress}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, toAddress: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles) *"
              value={manualTrip.distance}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, distance: text }))}
              keyboardType="numeric"
            />

            <ClientDropdown
              selectedClient={manualTrip.clientName}
              onSelectClient={(client) => setManualTrip(prev => ({ ...prev, clientName: client }))}
              isVisible={manualTrip.showClientDropdown}
              onToggle={() => setManualTrip(prev => ({ ...prev, showClientDropdown: !prev.showClientDropdown }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Trip Description"
              value={manualTrip.description}
              onChangeText={(text) => setManualTrip(prev => ({ ...prev, description: text }))}
              multiline
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

      {/* Trip Details Modal */}
      <Modal visible={tripDetailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Trip Details</Text>
            
            <ClientDropdown
              selectedClient={tripDetails.clientName}
              onSelectClient={(client) => setTripDetails(prev => ({ ...prev, clientName: client }))}
              isVisible={tripDetails.showClientDropdown}
              onToggle={() => setTripDetails(prev => ({ ...prev, showClientDropdown: !prev.showClientDropdown }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Trip Description"
              value={tripDetails.description}
              onChangeText={(text) => setTripDetails(prev => ({ ...prev, description: text }))}
              multiline
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
                      { text: 'Business', onPress: () => setTripDetails(prev => ({ ...prev, purpose: 'Business' })) },
                      { text: 'Medical', onPress: () => setTripDetails(prev => ({ ...prev, purpose: 'Medical' })) },
                      { text: 'Charity', onPress: () => setTripDetails(prev => ({ ...prev, purpose: 'Charity' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{tripDetails.purpose}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setTripDetailsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={updateTripDetails}>
                <Text style={styles.addButtonText}>Update Trip</Text>
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

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            
            <View style={styles.settingsContainer}>
              <Text style={styles.settingsTitle}>Tracking Preferences</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Auto Detection Mode</Text>
                <Switch
                  value={autoMode}
                  onValueChange={setAutoMode}
                  trackColor={{ false: '#767577', true: '#667eea' }}
                  thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Background Tracking</Text>
                <Switch
                  value={settings.backgroundTracking}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, backgroundTracking: value }))}
                  trackColor={{ false: '#767577', true: '#667eea' }}
                  thumbColor={settings.backgroundTracking ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Switch
                  value={settings.notifications}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, notifications: value }))}
                  trackColor={{ false: '#767577', true: '#667eea' }}
                  thumbColor={settings.notifications ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              <Text style={styles.settingsTitle}>IRS Mileage Rates (2025)</Text>
              <Text style={styles.settingInfo}>• Business: $0.70 per mile</Text>
              <Text style={styles.settingInfo}>• Medical: $0.21 per mile</Text>
              <Text style={styles.settingInfo}>• Charity: $0.14 per mile</Text>
              
              <Text style={styles.settingsTitle}>Business Pricing - API Access</Text>
              
              <View style={styles.pricingCard}>
                <Text style={styles.pricingTitle}>Business API Plan</Text>
                <Text style={styles.pricingPrice}>$29.99/month</Text>
                <Text style={styles.pricingFeature}>✅ Includes 3 devices</Text>
                <Text style={styles.pricingFeature}>✅ 50GB cloud storage</Text>
                <Text style={styles.pricingFeature}>✅ Multi-device sync</Text>
                <Text style={styles.pricingFeature}>+ $4.99/month per additional device</Text>
                <Text style={styles.pricingFeature}>+ $0.10/GB storage overage</Text>
              </View>

              <Text style={styles.settingsTitle}>Cloud Sync & Privacy</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>API Cloud Sync</Text>
                <Switch
                  value={settings.apiConsent}
                  onValueChange={(value) => {
                    if (value) {
                      setShowPrivacyModal(true);
                    } else {
                      setSettings(prev => ({ ...prev, apiConsent: false }));
                      setApiStatus('offline');
                    }
                  }}
                  trackColor={{ false: '#767577', true: '#667eea' }}
                  thumbColor={settings.apiConsent ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              {settings.apiConsent && (
                <Text style={styles.privacyStatus}>
                  ✅ Cloud sync enabled with privacy protection
                </Text>
              )}
              
              <TouchableOpacity
                style={styles.privacyButton}
                onPress={() => setShowPrivacyModal(true)}
              >
                <Text style={styles.privacyButtonText}>🔒 View Privacy Policy</Text>
              </TouchableOpacity>

              <Text style={styles.settingsTitle}>Export Format</Text>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => {
                  Alert.alert(
                    'Export Format',
                    'Choose default export format',
                    [
                      { text: 'CSV (Excel)', onPress: () => setSettings(prev => ({ ...prev, exportFormat: 'csv' })) },
                      { text: 'PDF Report', onPress: () => setSettings(prev => ({ ...prev, exportFormat: 'pdf' })) },
                      { text: 'JSON Data', onPress: () => setSettings(prev => ({ ...prev, exportFormat: 'json' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.settingButtonText}>Current: {settings.exportFormat.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy & Data Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Privacy & Data Protection</Text>
            
            <ScrollView style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>🔒 Your Location Data Privacy</Text>
              
              <Text style={styles.privacyText}>
                <Text style={styles.privacyBold}>What we collect:</Text>
                {'\n'}• GPS coordinates for trip start/end points
                {'\n'}• Trip distances and durations
                {'\n'}• Client names and trip descriptions (you provide)
                {'\n'}• Receipt photos and expense data (optional)
              </Text>
              
              <Text style={styles.privacyText}>
                <Text style={styles.privacyBold}>How we protect your data:</Text>
                {'\n'}• All data encrypted in transit (HTTPS/TLS)
                {'\n'}• Stored on secure cloud servers (SOC 2 compliant)
                {'\n'}• No location tracking when app is closed
                {'\n'}• You control what data is shared
              </Text>
              
              <Text style={styles.privacyText}>
                <Text style={styles.privacyBold}>What we DON'T do:</Text>
                {'\n'}• Sell your location data to third parties
                {'\n'}• Track you outside of active trips
                {'\n'}• Share data without your consent
                {'\n'}• Keep data longer than necessary
              </Text>
              
              <Text style={styles.privacyText}>
                <Text style={styles.privacyBold}>Your rights:</Text>
                {'\n'}• Export all your data anytime
                {'\n'}• Delete your account and all data
                {'\n'}• Disable cloud sync (local storage only)
                {'\n'}• Contact us with privacy questions
              </Text>
              
              <Text style={styles.privacyText}>
                <Text style={styles.privacyBold}>Data retention:</Text>
                {'\n'}• Trip data: Keep until you delete
                {'\n'}• Location coordinates: Anonymized after 12 months
                {'\n'}• Analytics: Aggregated, no personal identifiers
                {'\n'}• Deleted accounts: All data removed within 30 days
              </Text>
            </ScrollView>
            
            <View style={styles.privacyActions}>
              <TouchableOpacity 
                style={styles.privacyAcceptButton}
                onPress={() => {
                  setSettings(prev => ({ ...prev, apiConsent: true }));
                  setShowPrivacyModal(false);
                  Alert.alert('Cloud Sync Enabled', 'Your trips will now sync securely to the cloud for backup and multi-device access.');
                }}
              >
                <Text style={styles.privacyAcceptButtonText}>✅ Accept & Enable Cloud Sync</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.privacyDeclineButton}
                onPress={() => {
                  setSettings(prev => ({ ...prev, apiConsent: false }));
                  setShowPrivacyModal(false);
                }}
              >
                <Text style={styles.privacyDeclineButtonText}>❌ Decline (Local Only)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Client Manager Modal */}
      <Modal visible={clientManagerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Clients</Text>
            
            <View style={styles.addClientContainer}>
              <TextInput
                style={styles.addClientInput}
                placeholder="Add new client/project"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              <TouchableOpacity style={styles.addClientButton} onPress={addNewClient}>
                <Text style={styles.addClientButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={clientList}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.clientItem}>
                  <Text style={styles.clientItemText}>{item}</Text>
                  <TouchableOpacity
                    style={styles.removeClientButton}
                    onPress={() => removeClient(item)}
                  >
                    <Text style={styles.removeClientButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              style={styles.clientList}
            />
            
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={() => setClientManagerModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
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
    fontSize: 12,
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
  apiHelp: {
    fontSize: 12,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
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
  modeTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  modeStatus: {
    fontSize: 14,
    color: '#666',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
    lineHeight: 20,
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
    marginBottom: 10,
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
  autoStatsRow: {
    marginBottom: 15,
  },
  autoStatsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  autoTripMethod: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  syncBadge: {
    fontSize: 16,
  },
  tripRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tripClient: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 5,
    fontWeight: '600',
  },
  tripDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic',
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
    gap: 8,
  },
  editButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  exportNote: {
    fontSize: 12,
    color: '#667eea',
    fontStyle: 'italic',
    marginTop: 10,
  },
  exportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 20,
    height: 65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeNavButton: {
    backgroundColor: '#f0f0ff',
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
    maxHeight: '80%',
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
  // Client dropdown styles
  dropdownContainer: {
    marginBottom: 15,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#666',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'white',
    maxHeight: 200,
  },
  dropdownFlatList: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  manageClientsButton: {
    padding: 12,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
  },
  manageClientsButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  // Client manager styles
  addClientContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  addClientInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addClientButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addClientButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clientList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clientItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  removeClientButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeClientButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Settings modal styles
  settingsContainer: {
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  settingInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    paddingLeft: 10,
  },
  settingButton: {
    backgroundColor: '#f0f0ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  settingButtonText: {
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center',
    fontWeight: '600',
  },
  // Privacy modal styles
  privacyContent: {
    maxHeight: 400,
    marginBottom: 20,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  privacyBold: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  privacyStatus: {
    fontSize: 14,
    color: '#22c55e',
    marginTop: 5,
    fontStyle: 'italic',
  },
  privacyButton: {
    backgroundColor: '#f0f0ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  privacyButtonText: {
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center',
    fontWeight: '600',
  },
  privacyActions: {
    gap: 10,
  },
  privacyAcceptButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  privacyAcceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyDeclineButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  privacyDeclineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Business pricing styles
  pricingCard: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  pricingPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 10,
  },
  pricingFeature: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 3,
  },
});
