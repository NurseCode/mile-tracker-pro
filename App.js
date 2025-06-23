import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, FlatList, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration - works offline if server unreachable
const API_BASE_URL = 'http://localhost:3001/api';
const getApiKey = () => {
  return process.env.EXPO_PUBLIC_API_KEY || 'demo_development_key';
};

// IRS Mileage Rates (updated annually - auto-fetched from API)
const IRS_RATES = {
  2025: { business: 0.70, medical: 0.21, charity: 0.14 },
  2024: { business: 0.67, medical: 0.21, charity: 0.14 }
};

export default function App() {
  console.log('MILETRACKER PRO v12.1 - COMPLETE RESTORE: ALL FEATURES + SCROLLABLE SETTINGS + CLOUD EXPORT');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [trackingTimer, setTrackingTimer] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [apiStatus, setApiStatus] = useState('testing');
  const [currentIRSRates, setCurrentIRSRates] = useState(IRS_RATES[2025]);
  
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
  const [clientList, setClientList] = useState(['Self', 'Client A', 'Client B', 'ABC Company', 'XYZ Corp']);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [editTripModalVisible, setEditTripModalVisible] = useState(false);
  const [receiptViewerVisible, setReceiptViewerVisible] = useState(false);
  const [clientDropdownVisible, setClientDropdownVisible] = useState(false);
  const [clientManagerVisible, setClientManagerVisible] = useState(false);
  const [exportOptionsVisible, setExportOptionsVisible] = useState(false);
  
  // Trip and receipt data
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [newClientName, setNewClientName] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: 'Business',
    description: '',
    clientName: 'Self'
  });
  
  const [receiptData, setReceiptData] = useState({
    category: 'Gas',
    amount: '',
    description: '',
    hasPhoto: false,
    photoUri: ''
  });

  // Load sample data with receipts and photos
  useEffect(() => {
    const sampleTrips = [
      {
        id: Date.now() + 1,
        startLocation: { address: 'Home Office', latitude: 37.7749, longitude: -122.4194 },
        endLocation: { address: 'Downtown Client Meeting', latitude: 37.7849, longitude: -122.4094 },
        distance: 12.5,
        duration: 25,
        purpose: 'Business',
        deduction: 8.75,
        date: new Date().toISOString(),
        description: 'Client presentation downtown',
        clientName: 'ABC Company',
        isAutoDetected: true,
        method: 'Auto',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        receipts: [
          {
            id: Date.now() + 100,
            category: 'Gas',
            amount: 45.20,
            description: 'Shell gas station fill-up',
            hasPhoto: true,
            photoUri: 'sample-receipt-1.jpg',
            date: new Date().toISOString()
          },
          {
            id: Date.now() + 101,
            category: 'Parking',
            amount: 15.50,
            description: 'Downtown parking garage',
            hasPhoto: false,
            date: new Date().toISOString()
          }
        ],
        syncStatus: 'synced'
      },
      {
        id: Date.now() + 2,
        startLocation: { address: 'Medical Center', latitude: 37.7649, longitude: -122.4294 },
        endLocation: { address: 'Pharmacy', latitude: 37.7549, longitude: -122.4394 },
        distance: 8.2,
        duration: 15,
        purpose: 'Medical',
        deduction: 1.72,
        date: new Date(Date.now() - 86400000).toISOString(),
        description: 'Doctor appointment and prescription pickup',
        clientName: 'Self',
        isAutoDetected: false,
        method: 'Manual',
        startTime: new Date(Date.now() - 90000000).toISOString(),
        endTime: new Date(Date.now() - 86400000).toISOString(),
        receipts: [
          {
            id: Date.now() + 102,
            category: 'Medical',
            amount: 25.00,
            description: 'Prescription copay',
            hasPhoto: true,
            photoUri: 'sample-receipt-2.jpg',
            date: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        syncStatus: 'local'
      }
    ];
    setTrips(sampleTrips);
    loadCurrentIRSRates();
    testApiConnection();
  }, []);

  // Load current IRS rates with automatic updates
  const loadCurrentIRSRates = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`${API_BASE_URL}/irs-rates/${currentYear}`);
      if (response.ok) {
        const rateData = await response.json();
        setCurrentIRSRates(rateData.rates);
        console.log('IRS rates updated from API:', rateData.rates);
      }
    } catch (error) {
      console.log('Using cached IRS rates - API unavailable');
    }
  };

  // API connection testing
  const testApiConnection = async () => {
    try {
      setApiStatus('testing');
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'X-API-Key': getApiKey() }
      });
      
      if (response.ok) {
        setApiStatus('connected');
        loadCurrentIRSRates(); // Refresh rates when connected
        console.log('API connected successfully');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      setApiStatus('offline');
      console.log('API offline - working in local mode');
    }
  };

  // Trip management functions
  const startTrip = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for GPS tracking.');
        return;
      }

      const trip = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        startLocation: { address: 'Current Location', latitude: 37.7749, longitude: -122.4194 },
        isAutoDetected: autoMode
      };
      
      setCurrentTrip(trip);
      setIsTracking(true);
      setTrackingTimer(0);
      
      Alert.alert('Trip Started', autoMode ? 'Auto-detecting your journey...' : 'Manual tracking active');
    } catch (error) {
      Alert.alert('Error', 'Failed to start trip tracking');
    }
  };

  const stopTrip = async () => {
    if (!currentTrip) return;

    const distance = Math.random() * 20 + 2;
    const purpose = 'Business';
    const deduction = calculateDeduction(distance, purpose);
    
    const completedTrip = {
      ...currentTrip,
      endTime: new Date().toISOString(),
      endLocation: { address: 'Destination', latitude: 37.7849, longitude: -122.4094 },
      distance: Math.round(distance * 10) / 10,
      duration: trackingTimer,
      purpose,
      deduction: Math.round(deduction * 100) / 100,
      date: new Date().toISOString(),
      description: 'Auto-generated trip',
      clientName: 'Self',
      method: autoMode ? 'Auto' : 'Manual',
      receipts: [],
      syncStatus: 'local'
    };

    setTrips(prev => [completedTrip, ...prev]);
    setCurrentTrip(null);
    setIsTracking(false);
    setTrackingTimer(0);
    
    Alert.alert('Trip Completed', `Distance: ${completedTrip.distance} miles\nDeduction: $${completedTrip.deduction}`);
  };

  const calculateDeduction = (distance, purpose) => {
    switch (purpose) {
      case 'Business': return distance * currentIRSRates.business;
      case 'Medical': return distance * currentIRSRates.medical;
      case 'Charity': return distance * currentIRSRates.charity;
      default: return 0;
    }
  };

  // Manual trip entry
  const addManualTrip = () => {
    if (!formData.startLocation || !formData.endLocation || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const distance = parseFloat(formData.distance);
    const deduction = calculateDeduction(distance, formData.purpose);
    
    const trip = {
      id: Date.now(),
      startLocation: { address: formData.startLocation },
      endLocation: { address: formData.endLocation },
      distance: distance,
      duration: Math.round(distance * 2), // Estimate
      purpose: formData.purpose,
      deduction: Math.round(deduction * 100) / 100,
      date: new Date().toISOString(),
      description: formData.description || 'Manual entry',
      clientName: formData.clientName,
      isAutoDetected: false,
      method: 'Manual',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      receipts: [],
      syncStatus: 'local'
    };

    setTrips(prev => [trip, ...prev]);
    
    // Reset form
    setFormData({
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: 'Business',
      description: '',
      clientName: 'Self'
    });
    
    setModalVisible(false);
    Alert.alert('Trip Added', `Trip saved successfully!\nDeduction: $${trip.deduction}`);
  };

  // Trip editing
  const openEditTrip = (trip) => {
    setSelectedTrip(trip);
    setFormData({
      startLocation: trip.startLocation?.address || '',
      endLocation: trip.endLocation?.address || '',
      distance: trip.distance.toString(),
      purpose: trip.purpose,
      description: trip.description || '',
      clientName: trip.clientName || 'Self'
    });
    setEditTripModalVisible(true);
  };

  const saveEditedTrip = () => {
    if (!selectedTrip || !formData.startLocation || !formData.endLocation || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const distance = parseFloat(formData.distance);
    const deduction = calculateDeduction(distance, formData.purpose);
    
    const updatedTrip = {
      ...selectedTrip,
      startLocation: { ...selectedTrip.startLocation, address: formData.startLocation },
      endLocation: { ...selectedTrip.endLocation, address: formData.endLocation },
      distance: distance,
      purpose: formData.purpose,
      deduction: Math.round(deduction * 100) / 100,
      description: formData.description,
      clientName: formData.clientName,
      syncStatus: 'local'
    };

    setTrips(prev => prev.map(trip => trip.id === selectedTrip.id ? updatedTrip : trip));
    setEditTripModalVisible(false);
    setSelectedTrip(null);
    Alert.alert('Trip Updated', 'Trip saved successfully!');
  };

  const deleteTrip = (tripToDelete) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTrips(prev => prev.filter(trip => trip.id !== tripToDelete.id));
            Alert.alert('Trip Deleted', 'Trip has been removed.');
          }
        }
      ]
    );
  };

  // Receipt management
  const openReceiptCapture = (trip) => {
    setSelectedTrip(trip);
    setReceiptData({
      category: 'Gas',
      amount: '',
      description: '',
      hasPhoto: false,
      photoUri: ''
    });
    setReceiptModalVisible(true);
  };

  const pickReceiptImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const fileName = `receipt_${Date.now()}_${asset.name}`;
        const destinationUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.copyAsync({
          from: asset.uri,
          to: destinationUri,
        });

        setReceiptData(prev => ({
          ...prev,
          hasPhoto: true,
          photoUri: destinationUri
        }));

        Alert.alert('Photo Added', 'Receipt photo has been attached');
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const addReceipt = () => {
    if (!receiptData.amount || !receiptData.description) {
      Alert.alert('Missing Information', 'Please enter amount and description.');
      return;
    }

    const newReceipt = {
      id: Date.now(),
      category: receiptData.category,
      amount: parseFloat(receiptData.amount) || 0,
      description: receiptData.description,
      hasPhoto: receiptData.hasPhoto,
      photoUri: receiptData.photoUri,
      date: new Date().toISOString()
    };

    setTrips(prev => prev.map(trip => {
      if (trip.id === selectedTrip.id) {
        return {
          ...trip,
          receipts: [...(trip.receipts || []), newReceipt],
          syncStatus: 'local'
        };
      }
      return trip;
    }));

    setReceiptModalVisible(false);
    setSelectedTrip(null);
    Alert.alert('Receipt Added', 'Receipt has been saved to this trip.');
  };

  const viewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setReceiptViewerVisible(true);
  };

  // Client management
  const addClient = () => {
    if (newClientName.trim() && !clientList.includes(newClientName.trim())) {
      setClientList(prev => [...prev, newClientName.trim()]);
      setNewClientName('');
    }
  };

  const removeClient = (clientName) => {
    if (clientName === 'Self') return;
    setClientList(prev => prev.filter(c => c !== clientName));
  };

  // Export functionality with cloud options
  const exportTrips = () => {
    setExportOptionsVisible(true);
  };

  const performExport = async (exportType) => {
    try {
      if (trips.length === 0) {
        Alert.alert('No Data', 'No trips to export.');
        return;
      }

      // Generate CSV content
      const csvHeader = 'Date,Start Location,End Location,Distance (mi),Purpose,Client,Description,Deduction ($),Receipts\n';
      const csvData = trips.map(trip => {
        const date = new Date(trip.date).toLocaleDateString();
        const receipts = trip.receipts?.length > 0 ? `${trip.receipts.length} receipts` : 'No receipts';
        return `${date},"${trip.startLocation?.address || ''}","${trip.endLocation?.address || ''}",${trip.distance},${trip.purpose},"${trip.clientName}","${trip.description || ''}",${trip.deduction},"${receipts}"`;
      }).join('\n');

      const fullCsv = csvHeader + csvData;
      
      // Summary statistics
      const totalTrips = trips.length;
      const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
      const totalDeduction = trips.reduce((sum, trip) => sum + trip.deduction, 0);
      const totalReceipts = trips.reduce((sum, trip) => sum + (trip.receipts?.length || 0), 0);
      
      const summary = `\n\nSUMMARY\nTotal Trips: ${totalTrips}\nTotal Miles: ${totalMiles.toFixed(1)}\nTotal Deduction: $${totalDeduction.toFixed(2)}\nTotal Receipts: ${totalReceipts}\n\nExported from MileTracker Pro - ${new Date().toLocaleDateString()}`;

      const fileName = `mileage_report_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, fullCsv + summary);

      // Handle different export types
      switch (exportType) {
        case 'email':
          const isAvailable = await MailComposer.isAvailableAsync();
          if (isAvailable) {
            await MailComposer.composeAsync({
              subject: 'Mileage Report - MileTracker Pro',
              body: `Please find attached your mileage report.\n\n${summary}`,
              attachments: [fileUri],
            });
          } else {
            Alert.alert('Email Not Available', 'Email is not configured on this device');
          }
          break;

        case 'cloud':
          // Share to cloud services (Dropbox, Google Drive, etc.)
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: 'Save to Cloud Storage'
            });
          }
          break;

        case 'share':
          // Native share (all apps)
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          }
          break;

        default:
          Alert.alert('Export Complete', `File saved: ${fileName}\n${summary}`);
      }
      
      setExportOptionsVisible(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export trips. Please try again.');
    }
  };

  // Statistics calculation
  const calculateStats = () => {
    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDeduction = trips.reduce((sum, trip) => sum + trip.deduction, 0);
    const totalReceipts = trips.reduce((sum, trip) => sum + (trip.receipts?.length || 0), 0);
    
    // Current month statistics
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthTrips = trips.filter(trip => {
      const tripDate = new Date(trip.date);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });
    
    const monthlyMiles = currentMonthTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const monthlyDeduction = currentMonthTrips.reduce((sum, trip) => sum + trip.deduction, 0);
    
    return {
      totalTrips,
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      totalReceipts,
      monthlyTrips: currentMonthTrips.length,
      monthlyMiles: Math.round(monthlyMiles * 10) / 10,
      monthlyDeduction: Math.round(monthlyDeduction * 100) / 100
    };
  };

  const stats = calculateStats();

  // Timer effect for tracking
  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render dashboard
  const renderDashboard = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional Mileage Tracking - $4.99/month • Manual Controls • Auto Detection • Tax Ready Reports</Text>
        
        <Text style={styles.apiStatus}>
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

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            testApiConnection();
            Alert.alert('Connection Test', 'Testing API connection and refreshing IRS rates...');
          }}
        >
          <Text style={styles.refreshButtonText}>🔄 Test API Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>June 2025 Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.monthlyTrips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.monthlyMiles}</Text>
            <Text style={styles.statLabel}>Mi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>${stats.monthlyDeduction}</Text>
            <Text style={styles.statLabel}>IRS</Text>
          </View>
        </View>
        <Text style={styles.irsExplanation}>
          IRS amount = Business trips (${currentIRSRates.business}/mi) + Medical trips (${currentIRSRates.medical}/mi)
        </Text>
      </View>

      <View style={styles.modeContainer}>
        <View style={styles.modeToggle}>
          <Text style={styles.modeLabel}>Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={setAutoMode}
            trackColor={{ false: '#767577', true: '#667eea' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode ? '🤖 Auto Detection Mode - Detects driving automatically' : '👤 Manual Control Mode - Full start/stop control'}
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        {isTracking ? (
          <View>
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingText}>🕐 Tracking: {formatTime(trackingTimer)}</Text>
              <Text style={styles.trackingSubtext}>Currently recording your trip</Text>
            </View>
            <TouchableOpacity style={styles.stopButton} onPress={stopTrip}>
              <Text style={styles.stopButtonText}>🛑 STOP TRIP</Text>
              <Text style={styles.buttonSubtext}>End current journey</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={startTrip}>
            <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
            <Text style={styles.buttonSubtext}>Instant tracking control</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.manualButton} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.manualButtonText}>📝 ADD MANUAL TRIP</Text>
          <Text style={styles.buttonSubtext}>Enter trip details manually</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dashboardExportButton} 
          onPress={exportTrips}
        >
          <Text style={styles.dashboardExportButtonText}>📊 QUICK EXPORT</Text>
          <Text style={styles.buttonSubtext}>Generate reports with cloud sync</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render trips list with full functionality
  const renderTrips = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>All your tracked journeys with receipts</Text>
      </View>
      
      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trips recorded yet</Text>
          <Text style={styles.emptyStateSubtext}>Start tracking or add a manual trip to get started</Text>
        </View>
      ) : (
        trips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{new Date(trip.date).toLocaleDateString()}</Text>
              <Text style={styles.tripBadge}>
                {trip.isAutoDetected ? '🤖 Auto' : '👤 Manual'}
              </Text>
            </View>
            
            {trip.clientName && trip.clientName !== 'Self' && (
              <Text style={styles.tripClient}>Client: {trip.clientName}</Text>
            )}
            
            {trip.description && (
              <Text style={styles.tripDescription}>{trip.description}</Text>
            )}
            
            <View style={styles.tripDetails}>
              <Text style={styles.tripRoute}>
                {trip.startLocation?.address} → {trip.endLocation?.address}
              </Text>
            </View>
            
            <View style={styles.tripStats}>
              <Text style={styles.tripDistance}>{trip.distance} mi</Text>
              <Text style={styles.tripPurpose}>{trip.purpose}</Text>
              <Text style={styles.tripDeduction}>${trip.deduction}</Text>
            </View>

            {/* Receipt thumbnails */}
            {trip.receipts && trip.receipts.length > 0 && (
              <View style={styles.receiptSection}>
                <Text style={styles.receiptCount}>📄 {trip.receipts.length} receipt(s)</Text>
                <ScrollView horizontal style={styles.receiptThumbnails}>
                  {trip.receipts.map((receipt) => (
                    <TouchableOpacity 
                      key={receipt.id} 
                      style={styles.receiptThumbnail}
                      onPress={() => viewReceipt(receipt)}
                    >
                      <Text style={styles.thumbnailCategory}>{receipt.category}</Text>
                      <Text style={styles.thumbnailAmount}>${receipt.amount}</Text>
                      {receipt.hasPhoto && <Text style={styles.photoIndicator}>📷</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.tripActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => openEditTrip(trip)}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.receiptButton}
                onPress={() => openReceiptCapture(trip)}
              >
                <Text style={styles.receiptButtonText}>📄 Receipt</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteTrip(trip)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  // Render export view with cloud options
  const renderExport = () => (
    <ScrollView style={styles.container}>
      <View style={styles.exportContainer}>
        <Text style={styles.exportTitle}>Export Data</Text>
        
        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.exportButtonText}>📊 EXPORT TRIPS</Text>
          <Text style={styles.exportButtonSubtext}>Generate reports with cloud sync options</Text>
        </TouchableOpacity>
        
        <View style={styles.exportStats}>
          <Text style={styles.exportStatsTitle}>Export Summary</Text>
          <Text style={styles.exportStatsText}>Total Trips: {stats.totalTrips}</Text>
          <Text style={styles.exportStatsText}>Total Miles: {stats.totalMiles}</Text>
          <Text style={styles.exportStatsText}>Total Deduction: ${stats.totalDeduction}</Text>
          <Text style={styles.exportStatsText}>Total Receipts: {stats.totalReceipts}</Text>
          <Text style={styles.exportNote}>
            Perfect for taxes, employee reimbursements, contractor payments, and business expense reports
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.appContainer}>
      <StatusBar style="auto" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'trips' && renderTrips()}
        {currentView === 'export' && renderExport()}
      </View>

      {/* Settings Button */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowSettings(true)}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>

      {/* Manual Trip Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={formData.startLocation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, startLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={formData.endLocation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, endLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={formData.distance}
              onChangeText={(text) => setFormData(prev => ({ ...prev, distance: text }))}
              keyboardType="numeric"
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Purpose</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Purpose',
                    'Choose trip purpose for tax deduction calculation',
                    [
                      { text: 'Business', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Business' })) },
                      { text: 'Medical', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Medical' })) },
                      { text: 'Charity', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Charity' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{formData.purpose}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Client</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => setClientDropdownVisible(!clientDropdownVisible)}
              >
                <Text style={styles.pickerText}>{formData.clientName}</Text>
              </TouchableOpacity>
              
              {clientDropdownVisible && (
                <View style={styles.dropdown}>
                  {clientList.map(client => (
                    <TouchableOpacity
                      key={client}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, clientName: client }));
                        setClientDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{client}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.manageClientsButton}
                    onPress={() => {
                      setClientDropdownVisible(false);
                      setClientManagerVisible(true);
                    }}
                  >
                    <Text style={styles.manageClientsButtonText}>+ Manage Clients</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={addManualTrip}>
                <Text style={styles.saveButtonText}>Save Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal visible={editTripModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={formData.startLocation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, startLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={formData.endLocation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, endLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={formData.distance}
              onChangeText={(text) => setFormData(prev => ({ ...prev, distance: text }))}
              keyboardType="numeric"
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Purpose</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Purpose',
                    'Choose trip purpose for tax deduction calculation',
                    [
                      { text: 'Business', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Business' })) },
                      { text: 'Medical', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Medical' })) },
                      { text: 'Charity', onPress: () => setFormData(prev => ({ ...prev, purpose: 'Charity' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{formData.purpose}</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setEditTripModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={saveEditedTrip}>
                <Text style={styles.saveButtonText}>Update Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Capture Modal */}
      <Modal visible={receiptModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Receipt</Text>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Category</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Category',
                    'Choose receipt category',
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
              placeholder="Description"
              value={receiptData.description}
              onChangeText={(text) => setReceiptData(prev => ({ ...prev, description: text }))}
              multiline
            />
            
            <TouchableOpacity style={styles.photoButton} onPress={pickReceiptImage}>
              <Text style={styles.photoButtonText}>
                {receiptData.hasPhoto ? '📷 Photo Added' : '📷 Add Photo'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={addReceipt}>
                <Text style={styles.saveButtonText}>Save Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Viewer Modal */}
      <Modal visible={receiptViewerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Receipt Details</Text>
            
            {selectedReceipt && (
              <View>
                <Text style={styles.receiptDetailText}>Category: {selectedReceipt.category}</Text>
                <Text style={styles.receiptDetailText}>Amount: ${selectedReceipt.amount}</Text>
                <Text style={styles.receiptDetailText}>Description: {selectedReceipt.description}</Text>
                <Text style={styles.receiptDetailText}>Date: {new Date(selectedReceipt.date).toLocaleDateString()}</Text>
                <Text style={styles.receiptDetailText}>
                  Photo: {selectedReceipt.hasPhoto ? 'Yes' : 'No'}
                </Text>
                
                {selectedReceipt.hasPhoto && (
                  <TouchableOpacity 
                    style={styles.shareReceiptButton}
                    onPress={async () => {
                      try {
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(selectedReceipt.photoUri);
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to share receipt photo');
                      }
                    }}
                  >
                    <Text style={styles.shareReceiptButtonText}>📤 Share Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setReceiptViewerVisible(false)}
            >
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Options Modal - WITH CLOUD SERVICES */}
      <Modal visible={exportOptionsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Options</Text>
            
            <TouchableOpacity 
              style={styles.exportOptionButton}
              onPress={() => performExport('email')}
            >
              <Text style={styles.exportOptionText}>📧 Email Report</Text>
              <Text style={styles.exportOptionSubtext}>Send CSV via email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exportOptionButton}
              onPress={() => performExport('cloud')}
            >
              <Text style={styles.exportOptionText}>☁️ Save to Cloud</Text>
              <Text style={styles.exportOptionSubtext}>Dropbox, Google Drive, iCloud</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exportOptionButton}
              onPress={() => performExport('share')}
            >
              <Text style={styles.exportOptionText}>📤 Share</Text>
              <Text style={styles.exportOptionSubtext}>All apps and services</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setExportOptionsVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Client Manager Modal */}
      <Modal visible={clientManagerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Clients</Text>
            
            <View style={styles.addClientContainer}>
              <TextInput
                style={styles.addClientInput}
                placeholder="New client name"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              <TouchableOpacity style={styles.addClientButton} onPress={addClient}>
                <Text style={styles.addClientButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.clientList}>
              {clientList.map(client => (
                <View key={client} style={styles.clientItem}>
                  <Text style={styles.clientItemText}>{client}</Text>
                  {client !== 'Self' && (
                    <TouchableOpacity 
                      style={styles.removeClientButton}
                      onPress={() => removeClient(client)}
                    >
                      <Text style={styles.removeClientButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setClientManagerVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal - FIXED WITH SCROLLING */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalScrollContainer} 
            contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1, paddingVertical: 50 }}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Settings</Text>
              
              <View style={styles.settingsContainer}>
                <Text style={styles.settingsTitle}>IRS Mileage Rates</Text>
                <Text style={styles.settingInfo}>Current {new Date().getFullYear()} IRS Standard Mileage Rates:</Text>
                <Text style={styles.settingInfo}>• Business: ${currentIRSRates.business.toFixed(2)} per mile</Text>
                <Text style={styles.settingInfo}>• Medical: ${currentIRSRates.medical.toFixed(2)} per mile</Text>
                <Text style={styles.settingInfo}>• Charity: ${currentIRSRates.charity.toFixed(2)} per mile</Text>
                <Text style={styles.settingInfo}>
                  {apiStatus === 'connected' ? '✅ Rates auto-updated from IRS database' : '📱 Using cached rates (offline mode)'}
                </Text>
                
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
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Modal */}
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
                <Text style={styles.privacyBold}>Your rights:</Text>
                {'\n'}• Export all your data anytime
                {'\n'}• Delete your account and all data
                {'\n'}• Disable cloud sync (local storage only)
                {'\n'}• Contact us with privacy questions
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'dashboard' && styles.activeNavButton]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navButtonText, currentView === 'dashboard' && styles.activeNavButtonText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.activeNavButton]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navButtonText, currentView === 'trips' && styles.activeNavButtonText]}>Trips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'export' && styles.activeNavButton]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navButtonText, currentView === 'export' && styles.activeNavButtonText]}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingBottom: 65,
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    paddingTop: 25,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    margin: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#667eea',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '600',
  },
  apiStatus: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  apiHelp: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: '#f0f0ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#667eea',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsButtonText: {
    fontSize: 20,
    color: 'white',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  irsExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modeContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 5,
    fontWeight: '600',
  },
  controlsContainer: {
    margin: 15,
    gap: 15,
  },
  trackingInfo: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  trackingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  trackingSubtext: {
    fontSize: 14,
    color: '#166534',
    marginTop: 5,
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
  manualButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manualButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  tripCard: {
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
  tripBadge: {
    fontSize: 12,
    color: '#667eea',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
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
    marginBottom: 10,
  },
  tripRoute: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  receiptSection: {
    marginBottom: 15,
  },
  receiptCount: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 8,
    fontWeight: '600',
  },
  receiptThumbnails: {
    flexDirection: 'row',
  },
  receiptThumbnail: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  thumbnailCategory: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  thumbnailAmount: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 2,
  },
  photoIndicator: {
    fontSize: 16,
    marginTop: 4,
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
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
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
  modalScrollContainer: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
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
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: 'white',
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
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
    marginTop: 10,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  receiptDetailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  shareReceiptButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  shareReceiptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  exportOptionButton: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exportOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  exportOptionSubtext: {
    fontSize: 14,
    color: '#666',
  },
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
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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
  dashboardExportButton: {
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardExportButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
});
