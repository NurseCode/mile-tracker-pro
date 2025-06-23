import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration
const API_BASE_URL = 'http://172.31.128.11:3001/api';
const getApiKey = () => {
  return process.env.EXPO_PUBLIC_API_KEY || 'demo_development_key';
};

export default function App() {
  console.log('MILETRACKER PRO v11.5 - CLIENT DROPDOWN + DESCRIPTIONS + API SYNC');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [trackingTimer, setTrackingTimer] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [apiStatus, setApiStatus] = useState('testing');
  
  // Client management
  const [clientList, setClientList] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [tripDetailsModalVisible, setTripDetailsModalVisible] = useState(false);
  const [clientManagerModalVisible, setClientManagerModalVisible] = useState(false);
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
    purpose: 'Business',
    description: '',
    clientName: '',
    showClientDropdown: false
  });
  
  // Trip details state
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
    'Personal/Internal'
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

  // Sample trips with client data
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
        receipts: [],
        syncStatus: 'local'
      }
    ];
    setTrips(sampleTrips);
  }, []);

  // API Functions
  const testApiConnection = async () => {
    try {
      setApiStatus('testing');
      const response = await fetch(`${API_BASE_URL}/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiStatus('connected');
        Alert.alert('Success', `API Connected: ${data.message}`);
        return true;
      } else {
        setApiStatus('error');
        Alert.alert('API Error', `Server responded with ${response.status}`);
        return false;
      }
    } catch (error) {
      setApiStatus('offline');
      Alert.alert('Connection Failed', `Cannot reach API server: ${error.message}`);
      return false;
    }
  };

  const syncTripToApi = async (tripData) => {
    if (apiStatus !== 'connected') return null;
    
    try {
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
      
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiTripData)
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.tripId;
      }
      return null;
    } catch (error) {
      console.log('API sync error:', error.message);
      return null;
    }
  };

  // Location and tracking functions (same as before)
  const requestLocationPermissions = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for trip tracking.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
    } catch (error) {
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

      // Show trip details modal for any completed trip
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
    } catch (error) {
      Alert.alert('Error', 'Failed to stop trip tracking');
    }
  };

  // Auto mode toggle effect
  useEffect(() => {
    // Background monitoring logic would go here
    return () => {
      // Cleanup
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

  // Export CSV with client data
  const exportCSV = async () => {
    try {
      const csvHeader = 'Date,Start,End,Distance,Purpose,Description,Client,Method,Deduction,Receipts,Sync Status\n';
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
        const syncStatus = trip.syncStatus || 'local';
        
        return `${date},"${start}","${end}",${distance},${purpose},"${description}","${client}",${method},$${deduction},${receipts},${syncStatus}`;
      }).join('\n');

      const fullCSV = csvHeader + csvContent;
      const fileName = `miletracker_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, fullCSV);

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro Export - Client Details',
          body: 'Your detailed mileage tracking data with client information is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
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
    autoTrips: trips.filter(t => t.isAutoDetected).length
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render dashboard (condensed for space)
  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Client Management + Auto Detection + Cloud Sync</Text>
      </View>

      <View style={styles.apiStatusContainer}>
        <Text style={styles.apiStatusText}>
          API Status: {apiStatus === 'connected' ? '🟢 Connected' : 
                      apiStatus === 'testing' ? '🟡 Testing...' :
                      '🔴 Offline (Local Mode)'}
        </Text>
      </View>

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
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.actionButtonText}>+ Add Manual Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setClientManagerModalVisible(true)}>
          <Text style={styles.actionButtonText}>👥 Manage Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={exportCSV}>
          <Text style={styles.actionButtonText}>📊 Export Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render trips list with client info
  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Trip History</Text>
        <Text style={styles.pageSubtitle}>{trips.length} trips with client tracking</Text>
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
              ${(parseFloat(trip.distance || 0) * 0.70).toFixed(2)}
            </Text>
          </View>

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
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      <View style={styles.content}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'trips' && renderTrips()}
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
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
});
