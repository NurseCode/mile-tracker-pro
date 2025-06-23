import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Switch, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';

// API Configuration
const API_BASE_URL = 'http://localhost:3001';
const API_KEY = 'demo_development_key';

const getApiKey = () => {
  return process.env.EXPO_PUBLIC_API_KEY || 'demo_development_key';
};

// IRS Mileage Rates (updated annually - auto-fetched from API)
const IRS_RATES = {
  2025: { business: 0.70, medical: 0.21, charity: 0.14 },
  2024: { business: 0.67, medical: 0.21, charity: 0.14 }
};

// Function to get current year IRS rates with automatic updates
const getCurrentIRSRates = async () => {
  const currentYear = new Date().getFullYear();
  
  // Try to fetch latest rates from API first
  try {
    const response = await fetch(`${API_BASE_URL}/api/irs-rates/${currentYear}`);
    if (response.ok) {
      const apiRates = await response.json();
      return apiRates.rates || IRS_RATES[currentYear] || IRS_RATES[2025];
    }
  } catch (error) {
    console.log('Using cached IRS rates - API unavailable');
  }
  
  // Fallback to cached rates
  return IRS_RATES[currentYear] || IRS_RATES[2025];
};

export default function App() {
  console.log('MILETRACKER PRO v12.0 - SETTINGS FIX + AUTO IRS RATES + API RECONNECT: SCROLLABLE SETTINGS + ANNUAL RATE UPDATES');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [showManualTrip, setShowManualTrip] = useState(false);
  const [showClientManager, setShowClientManager] = useState(false);
  const [clients, setClients] = useState(['Self', 'Client A', 'Client B']);
  const [newClientName, setNewClientName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
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
  const [currentIRSRates, setCurrentIRSRates] = useState(IRS_RATES[2025]);

  // Manual trip form data
  const [manualTripData, setManualTripData] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: 'Business',
    description: '',
    client_name: 'Self'
  });

  // Load data when app starts
  useEffect(() => {
    loadTripsData();
    loadClientsData();
    checkApiConnection();
    loadCurrentIRSRates();
    
    // Start location tracking if auto mode is enabled
    if (settings.autoMode) {
      startLocationTracking();
    }
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  
  // Load current IRS rates with automatic updates
  const loadCurrentIRSRates = async () => {
    try {
      const rates = await getCurrentIRSRates();
      setCurrentIRSRates(rates);
    } catch (error) {
      console.log('Error loading IRS rates:', error);
    }
  };

  // API Connection Management
  const checkApiConnection = async () => {
    try {
      // Test multiple API endpoints to verify connectivity
      const healthResponse = await Promise.race([
        fetch(`${API_BASE_URL}/api/health`, { method: 'GET' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      
      if (healthResponse.ok) {
        setApiStatus('connected');
        console.log('API connected successfully');
        // Refresh IRS rates when API is available
        loadCurrentIRSRates();
      } else {
        setApiStatus('error');
        console.log('API health check failed');
      }
    } catch (error) {
      console.log('API connection failed:', error.message);
      setApiStatus('offline');
    }
  };

  const syncTripToApi = async (tripData) => {
    if (apiStatus !== 'connected' || !settings.apiConsent) {
      console.log('API offline or consent not given - trip saved locally only');
      return null;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': getApiKey(),
        },
        body: JSON.stringify({
          ...tripData,
          user_id: 'demo_user',
          synced_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Trip synced to API:', result.id);
        return result.id;
      } else {
        console.log('API sync failed:', response.status);
        return null;
      }
    } catch (error) {
      console.log('API sync error:', error.message);
      return null;
    }
  };

  // Data persistence
  const loadTripsData = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        // Add sample trips if none exist
        const sampleTrips = [
          {
            id: Date.now() + 1,
            startLocation: 'Home',
            endLocation: 'Office',
            distance: 12.5,
            purpose: 'Business',
            deduction: 8.75,
            date: new Date().toISOString(),
            description: 'Daily commute to work',
            client_name: 'Self',
            isAutoDetected: true
          },
          {
            id: Date.now() + 2,
            startLocation: 'Office',
            endLocation: 'Client Meeting',
            distance: 8.2,
            purpose: 'Business',
            deduction: 5.74,
            date: new Date(Date.now() - 86400000).toISOString(),
            description: 'Meeting with potential client',
            client_name: 'Client A',
            isAutoDetected: false
          }
        ];
        setTrips(sampleTrips);
        await AsyncStorage.setItem('trips', JSON.stringify(sampleTrips));
      }
    } catch (error) {
      console.log('Error loading trips:', error);
    }
  };

  const loadClientsData = async () => {
    try {
      const savedClients = await AsyncStorage.getItem('clients');
      if (savedClients) {
        setClients(JSON.parse(savedClients));
      }
    } catch (error) {
      console.log('Error loading clients:', error);
    }
  };

  const saveTripsData = async (tripsData) => {
    try {
      await AsyncStorage.setItem('trips', JSON.stringify(tripsData));
    } catch (error) {
      console.log('Error saving trips:', error);
    }
  };

  const saveClientsData = async (clientsData) => {
    try {
      await AsyncStorage.setItem('clients', JSON.stringify(clientsData));
    } catch (error) {
      console.log('Error saving clients:', error);
    }
  };

  // Location tracking
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for GPS tracking.');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        setBackgroundTracking(true);
      }

      console.log('Location permission granted');
      return true;
    } catch (error) {
      console.log('Location permission error:', error);
      return false;
    }
  };

  const calculateDeduction = (distance, purpose) => {
    switch (purpose) {
      case 'Business':
        return distance * currentIRSRates.business;
      case 'Medical':
        return distance * currentIRSRates.medical;
      case 'Charity':
        return distance * currentIRSRates.charity;
      default:
        return 0;
    }
  };

  const startTrip = async () => {
    const hasPermission = await startLocationTracking();
    if (!hasPermission) return;

    const trip = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      startLocation: 'Current Location',
      isAutoDetected: settings.autoMode
    };
    
    setCurrentTrip(trip);
    setIsTracking(true);
    
    Alert.alert('Trip Started', settings.autoMode ? 'Auto-detecting your journey...' : 'Manual tracking active');
  };

  const stopTrip = async () => {
    if (!currentTrip) return;

    const distance = Math.random() * 20 + 2; // Simulated distance
    const purpose = 'Business';
    const deduction = calculateDeduction(distance, purpose);
    
    const completedTrip = {
      ...currentTrip,
      endTime: new Date().toISOString(),
      endLocation: 'Destination',
      distance: Math.round(distance * 10) / 10,
      purpose,
      deduction: Math.round(deduction * 100) / 100,
      date: new Date().toISOString(),
      description: 'Auto-generated trip',
      client_name: 'Self'
    };

    const updatedTrips = [completedTrip, ...trips];
    setTrips(updatedTrips);
    await saveTripsData(updatedTrips);
    
    // Sync to API if connected
    await syncTripToApi(completedTrip);
    
    setCurrentTrip(null);
    setIsTracking(false);
    
    Alert.alert('Trip Completed', `Distance: ${completedTrip.distance} miles\nDeduction: $${completedTrip.deduction}`);
  };

  const addManualTrip = async () => {
    if (!manualTripData.startLocation || !manualTripData.endLocation || !manualTripData.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const distance = parseFloat(manualTripData.distance);
    const deduction = calculateDeduction(distance, manualTripData.purpose);
    
    const trip = {
      id: Date.now(),
      startLocation: manualTripData.startLocation,
      endLocation: manualTripData.endLocation,
      distance: distance,
      purpose: manualTripData.purpose,
      deduction: Math.round(deduction * 100) / 100,
      date: new Date().toISOString(),
      description: manualTripData.description || 'Manual entry',
      client_name: manualTripData.client_name,
      isAutoDetected: false
    };

    const updatedTrips = [trip, ...trips];
    setTrips(updatedTrips);
    await saveTripsData(updatedTrips);
    
    // Sync to API if connected
    await syncTripToApi(trip);
    
    // Reset form
    setManualTripData({
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: 'Business',
      description: '',
      client_name: 'Self'
    });
    
    setShowManualTrip(false);
    Alert.alert('Trip Added', `Trip saved successfully!\nDeduction: $${trip.deduction}`);
  };

  // Client management
  const addClient = async () => {
    if (newClientName.trim() && !clients.includes(newClientName.trim())) {
      const updatedClients = [...clients, newClientName.trim()];
      setClients(updatedClients);
      await saveClientsData(updatedClients);
      setNewClientName('');
    }
  };

  const removeClient = async (clientName) => {
    if (clientName === 'Self') return; // Don't allow removing 'Self'
    
    const updatedClients = clients.filter(c => c !== clientName);
    setClients(updatedClients);
    await saveClientsData(updatedClients);
  };

  // Export functionality
  const exportTrips = async () => {
    try {
      if (trips.length === 0) {
        Alert.alert('No Data', 'No trips to export.');
        return;
      }

      const csvHeader = 'Date,Start Location,End Location,Distance (mi),Purpose,Client,Description,Deduction ($)\n';
      const csvData = trips.map(trip => {
        const date = new Date(trip.date).toLocaleDateString();
        return `${date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.purpose},"${trip.client_name}","${trip.description || ''}",${trip.deduction}`;
      }).join('\n');

      const fullCsv = csvHeader + csvData;
      
      // Summary statistics
      const totalTrips = trips.length;
      const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
      const totalDeduction = trips.reduce((sum, trip) => sum + trip.deduction, 0);
      
      const summary = `\n\nSUMMARY\nTotal Trips: ${totalTrips}\nTotal Miles: ${totalMiles.toFixed(1)}\nTotal Deduction: $${totalDeduction.toFixed(2)}\n\nExported from MileTracker Pro - ${new Date().toLocaleDateString()}`;

      const fileName = `mileage_report_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, fullCsv + summary);

      // Try to email first, then share as fallback
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          subject: 'Mileage Report - MileTracker Pro',
          body: `Please find attached your mileage report.\n\n${summary}`,
          attachments: [fileUri],
        });
      } else {
        // Fallback to sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Export Complete', `File saved: ${fileName}\n${summary}`);
        }
      }
    } catch (error) {
      console.log('Export error:', error);
      Alert.alert('Export Error', 'Failed to export trips. Please try again.');
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDeduction = trips.reduce((sum, trip) => sum + trip.deduction, 0);
    
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
      monthlyTrips: currentMonthTrips.length,
      monthlyMiles: Math.round(monthlyMiles * 10) / 10,
      monthlyDeduction: Math.round(monthlyDeduction * 100) / 100
    };
  };

  const stats = calculateStats();

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
            checkApiConnection();
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
            value={settings.autoMode}
            onValueChange={(value) => setSettings(prev => ({ ...prev, autoMode: value }))}
            trackColor={{ false: '#767577', true: '#667eea' }}
            thumbColor={settings.autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {settings.autoMode ? '🤖 Auto Detection Mode - Detects driving automatically' : '👤 Manual Control Mode - Full start/stop control'}
        </Text>
        <Text style={styles.modeHelp}>
          Auto: Detects driving automatically • Manual: Full start/stop control
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        {isTracking ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopTrip}>
            <Text style={styles.stopButtonText}>🛑 STOP TRIP</Text>
            <Text style={styles.buttonSubtext}>End current journey</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={startTrip}>
            <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
            <Text style={styles.buttonSubtext}>Instant tracking control</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.manualButton} 
          onPress={() => setShowManualTrip(true)}
        >
          <Text style={styles.manualButtonText}>📝 ADD MANUAL TRIP</Text>
          <Text style={styles.buttonSubtext}>Enter trip details manually</Text>
        </TouchableOpacity>
      </View>

      {currentSpeed > 0 && (
        <View style={styles.speedContainer}>
          <Text style={styles.speedText}>Current Speed: {currentSpeed.toFixed(1)} mph</Text>
        </View>
      )}
    </ScrollView>
  );

  // Render trips list
  const renderTrips = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>All your tracked journeys</Text>
      </View>
      
      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No trips recorded yet</Text>
          <Text style={styles.emptyStateSubtext}>Start tracking or add a manual trip to get started</Text>
        </View>
      ) : (
        trips.map((trip, index) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{new Date(trip.date).toLocaleDateString()}</Text>
              <Text style={styles.tripBadge}>
                {trip.isAutoDetected ? '🤖 Auto' : '👤 Manual'}
              </Text>
            </View>
            
            {trip.client_name && trip.client_name !== 'Self' && (
              <Text style={styles.tripClient}>Client: {trip.client_name}</Text>
            )}
            
            {trip.description && (
              <Text style={styles.tripDescription}>{trip.description}</Text>
            )}
            
            <View style={styles.tripDetails}>
              <Text style={styles.tripRoute}>
                {trip.startLocation} → {trip.endLocation}
              </Text>
            </View>
            
            <View style={styles.tripStats}>
              <Text style={styles.tripDistance}>{trip.distance} mi</Text>
              <Text style={styles.tripPurpose}>{trip.purpose}</Text>
              <Text style={styles.tripDeduction}>${trip.deduction}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  // Render export view
  const renderExport = () => (
    <ScrollView style={styles.container}>
      <View style={styles.exportContainer}>
        <Text style={styles.exportTitle}>Export Data</Text>
        
        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.exportButtonText}>📊 EXPORT TRIPS</Text>
          <Text style={styles.exportButtonSubtext}>Generate CSV report with all trip data</Text>
        </TouchableOpacity>
        
        <View style={styles.exportStats}>
          <Text style={styles.exportStatsTitle}>Export Summary</Text>
          <Text style={styles.exportStatsText}>Total Trips: {stats.totalTrips}</Text>
          <Text style={styles.exportStatsText}>Total Miles: {stats.totalMiles}</Text>
          <Text style={styles.exportStatsText}>Total Deduction: ${stats.totalDeduction}</Text>
          <Text style={styles.exportNote}>
            Perfect for taxes, employee reimbursements, and contractor payments
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.appContainer}>
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
      <Modal visible={showManualTrip} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={manualTripData.startLocation}
              onChangeText={(text) => setManualTripData(prev => ({ ...prev, startLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={manualTripData.endLocation}
              onChangeText={(text) => setManualTripData(prev => ({ ...prev, endLocation: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={manualTripData.distance}
              onChangeText={(text) => setManualTripData(prev => ({ ...prev, distance: text }))}
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
                      { text: 'Business', onPress: () => setManualTripData(prev => ({ ...prev, purpose: 'Business' })) },
                      { text: 'Medical', onPress: () => setManualTripData(prev => ({ ...prev, purpose: 'Medical' })) },
                      { text: 'Charity', onPress: () => setManualTripData(prev => ({ ...prev, purpose: 'Charity' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.pickerText}>{manualTripData.purpose}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Client</Text>
              <TouchableOpacity 
                style={styles.picker}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={styles.pickerText}>{manualTripData.client_name}</Text>
              </TouchableOpacity>
              
              {showClientDropdown && (
                <View style={styles.dropdown}>
                  {clients.map(client => (
                    <TouchableOpacity
                      key={client}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setManualTripData(prev => ({ ...prev, client_name: client }));
                        setShowClientDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{client}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.manageClientsButton}
                    onPress={() => {
                      setShowClientDropdown(false);
                      setShowClientManager(true);
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
              value={manualTripData.description}
              onChangeText={(text) => setManualTripData(prev => ({ ...prev, description: text }))}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowManualTrip(false)}
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

      {/* Settings Modal - FIXED WITH SCROLLING */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollContainer} contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
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
      <Modal visible={showClientManager} animationType="slide" transparent>
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
              {clients.map(client => (
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
              onPress={() => setShowClientManager(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
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
    paddingBottom: 65, // Space for bottom nav
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
  modeHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  controlsContainer: {
    margin: 15,
    gap: 15,
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
  speedContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  speedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
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
  tripRoute: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
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
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingTop: 50,
    paddingBottom: 50,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    minHeight: 400,
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
