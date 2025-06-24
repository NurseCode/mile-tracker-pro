// MileTracker Pro v18.7 - WITH ERROR BOUNDARY: Shows crash details instead of immediate closure
// This version will display exactly what's causing the app to crash

import React, { Component, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, FlatList, Image, Dimensions, Share } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ERROR BOUNDARY COMPONENT - Catches crashes and shows details
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = Date.now().toString();
    this.setState({
      error,
      errorInfo,
      errorId
    });
    
    console.log('CRASH DETECTED:', error.message);
    console.log('STACK TRACE:', error.stack);
    console.log('COMPONENT STACK:', errorInfo.componentStack);
  }

  restartApp = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  shareErrorReport = async () => {
    try {
      const errorDetails = `
MileTracker Pro Error Report
ID: ${this.state.errorId}
Time: ${new Date().toLocaleString()}

Error: ${this.state.error.message}
Component: ${this.state.errorInfo.componentStack.split('\n')[1] || 'Unknown'}

Stack Trace:
${this.state.error.stack}

Please send this to support for assistance.
      `.trim();

      await Share.share({
        message: errorDetails,
        title: 'MileTracker Pro Error Report'
      });
    } catch (shareError) {
      Alert.alert('Error', 'Failed to share error report');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <StatusBar backgroundColor="#dc3545" barStyle="light-content" />
          <View style={errorStyles.header}>
            <Text style={errorStyles.title}>⚠️ App Error Detected</Text>
            <Text style={errorStyles.subtitle}>Don't worry - your data is safe</Text>
          </View>

          <ScrollView style={errorStyles.detailsContainer}>
            <View style={errorStyles.errorCard}>
              <Text style={errorStyles.label}>Error Message:</Text>
              <Text style={errorStyles.errorText}>{this.state.error.message}</Text>
            </View>

            <View style={errorStyles.errorCard}>
              <Text style={errorStyles.label}>Component:</Text>
              <Text style={errorStyles.errorText}>
                {this.state.errorInfo.componentStack.split('\n')[1] || 'Unknown Component'}
              </Text>
            </View>

            <View style={errorStyles.errorCard}>
              <Text style={errorStyles.label}>Error ID:</Text>
              <Text style={errorStyles.errorText}>{this.state.errorId}</Text>
            </View>

            <View style={errorStyles.errorCard}>
              <Text style={errorStyles.label}>Time:</Text>
              <Text style={errorStyles.errorText}>{new Date().toLocaleString()}</Text>
            </View>

            <View style={errorStyles.errorCard}>
              <Text style={errorStyles.label}>Full Stack Trace:</Text>
              <ScrollView style={errorStyles.stackContainer} horizontal>
                <Text style={errorStyles.stackText}>{this.state.error.stack}</Text>
              </ScrollView>
            </View>
          </ScrollView>

          <View style={errorStyles.buttonContainer}>
            <TouchableOpacity 
              style={[errorStyles.button, errorStyles.primaryButton]} 
              onPress={this.restartApp}
            >
              <Text style={errorStyles.buttonText}>🔄 Restart App</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[errorStyles.button, errorStyles.secondaryButton]} 
              onPress={this.shareErrorReport}
            >
              <Text style={[errorStyles.buttonText, errorStyles.secondaryButtonText]}>📤 Share Error Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Theme Palettes - User can choose their preferred color scheme
const COLOR_THEMES = {
  periwinkle: {
    name: 'Periwinkle Classic',
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#fafafa',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666'
  },
  ocean: {
    name: 'Ocean Blue',
    primary: '#1e3c72',
    secondary: '#2a5298',
    accent: '#4facfe',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#f0f8ff',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568'
  },
  forest: {
    name: 'Forest Green',
    primary: '#2d5016',
    secondary: '#3e6b1f',
    accent: '#68bb59',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#f7fcf0',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568'
  },
  sunset: {
    name: 'Sunset Orange',
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffcc02',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#fff8f0',
    surface: '#ffffff',
    text: '#2d1b14',
    textSecondary: '#8b4513'
  },
  lavender: {
    name: 'Lavender Dreams',
    primary: '#8e44ad',
    secondary: '#9b59b6',
    accent: '#e8c1ff',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#2c1810',
    textSecondary: '#6a4c93'
  },
  corporate: {
    name: 'Corporate Blue',
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#3498db',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#ecf0f1',
    surface: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#7f8c8d'
  },
  dark: {
    name: 'Dark Mode',
    primary: '#bb86fc',
    secondary: '#3700b3',
    accent: '#03dac6',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#aaaaaa'
  }
};

// Generate random theme colors using HSL
const generateRandomTheme = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 20; // 70-90%
  const lightness = 45 + Math.random() * 10; // 45-55%
  
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  return {
    name: 'Random Theme',
    primary: hslToHex(hue, saturation, lightness),
    secondary: hslToHex((hue + 30) % 360, saturation, lightness - 10),
    accent: hslToHex((hue + 180) % 360, saturation - 20, lightness + 20),
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: hslToHex(hue, 20, 97),
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666'
  };
};

// Sample trip data
const SAMPLE_TRIPS = [
  {
    id: '1',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    distance: 15.2,
    startAddress: 'Home',
    endAddress: 'Client Office - ABC Company',
    category: 'Business',
    client: 'ABC Company',
    purpose: 'Client meeting',
    receipts: []
  },
  {
    id: '2',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
    distance: 8.7,
    startAddress: 'Home',
    endAddress: 'Medical Center',
    category: 'Medical',
    client: '',
    purpose: 'Doctor appointment',
    receipts: []
  },
  {
    id: '3',
    startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 47.5 * 60 * 60 * 1000).toISOString(),
    distance: 12.3,
    startAddress: 'Home',
    endAddress: 'XYZ Corp Headquarters',
    category: 'Business',
    client: 'XYZ Corp',
    purpose: 'Project consultation',
    receipts: []
  }
];

// Main App Component wrapped in Error Boundary
const MileTrackerApp = () => {
  const [currentTheme, setCurrentTheme] = useState(COLOR_THEMES.periwinkle);
  const [activeView, setActiveView] = useState('home');
  const [trips, setTrips] = useState(SAMPLE_TRIPS);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState('manual');
  const [currentTrip, setCurrentTrip] = useState(null);
  const [addTripModal, setAddTripModal] = useState(false);
  const [editTripModal, setEditTripModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [themeModal, setThemeModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState('Monitoring');

  // Load saved theme on app start
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        const themeData = JSON.parse(savedTheme);
        setCurrentTheme(themeData);
      }
    } catch (error) {
      console.log('Failed to load saved theme:', error);
    }
  };

  const saveTheme = async (theme) => {
    try {
      await AsyncStorage.setItem('app_theme', JSON.stringify(theme));
      setCurrentTheme(theme);
      setThemeModal(false);
    } catch (error) {
      console.log('Failed to save theme:', error);
    }
  };

  // Auto-detection simulation
  useEffect(() => {
    if (trackingMode === 'auto' && !isTracking) {
      const interval = setInterval(() => {
        const speed = Math.random() * 15; // Random speed 0-15 mph
        setCurrentSpeed(speed);
        
        if (speed > 5) {
          setDetectionStatus('Movement detected');
          setTimeout(() => {
            if (!isTracking) {
              startTrip(true);
              setDetectionStatus('Trip started automatically');
            }
          }, 3000);
        } else {
          setDetectionStatus('Monitoring');
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [trackingMode, isTracking]);

  const startTrip = (automatic = false) => {
    try {
      const newTrip = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        endTime: null,
        distance: 0,
        startAddress: 'Current Location',
        endAddress: '',
        category: 'Business',
        client: '',
        purpose: automatic ? 'Auto-detected trip' : '',
        receipts: [],
        automatic
      };
      
      setCurrentTrip(newTrip);
      setIsTracking(true);
      setDetectionStatus('Trip in progress');
      
      Alert.alert(
        automatic ? 'Auto Trip Started' : 'Trip Started', 
        automatic ? 'Movement detected - trip tracking started automatically' : 'Manual trip tracking started'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start trip: ' + error.message);
    }
  };

  const stopTrip = () => {
    try {
      if (currentTrip) {
        const distance = Math.random() * 20 + 1; // Random distance 1-21 miles
        const updatedTrip = {
          ...currentTrip,
          endTime: new Date().toISOString(),
          distance: parseFloat(distance.toFixed(1)),
          endAddress: 'Destination'
        };
        
        // Only save trips over 0.5 miles to avoid false positives
        if (distance >= 0.5) {
          setTrips(prev => [updatedTrip, ...prev]);
        }
        
        setCurrentTrip(null);
        setIsTracking(false);
        setDetectionStatus('Monitoring');
        
        Alert.alert('Trip Completed', `Distance: ${distance.toFixed(1)} miles`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop trip: ' + error.message);
    }
  };

  const addManualTrip = (tripData) => {
    try {
      const newTrip = {
        id: Date.now().toString(),
        startTime: tripData.startTime || new Date().toISOString(),
        endTime: tripData.endTime || new Date().toISOString(),
        distance: parseFloat(tripData.distance) || 0,
        startAddress: tripData.startAddress || '',
        endAddress: tripData.endAddress || '',
        category: tripData.category || 'Business',
        client: tripData.client || '',
        purpose: tripData.purpose || '',
        receipts: []
      };
      
      setTrips(prev => [newTrip, ...prev]);
      setAddTripModal(false);
      Alert.alert('Success', 'Trip added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add trip: ' + error.message);
    }
  };

  const exportData = async (period = '30d') => {
    try {
      const periodDays = parseInt(period.replace('d', ''));
      const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      
      const filteredTrips = trips.filter(trip => 
        new Date(trip.startTime) >= cutoffDate
      );
      
      const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.distance, 0);
      const businessMiles = filteredTrips.filter(t => t.category === 'Business').reduce((sum, trip) => sum + trip.distance, 0);
      const medicalMiles = filteredTrips.filter(t => t.category === 'Medical').reduce((sum, trip) => sum + trip.distance, 0);
      const charityMiles = filteredTrips.filter(t => t.category === 'Charity').reduce((sum, trip) => sum + trip.distance, 0);
      
      const businessDeduction = businessMiles * 0.70;
      const medicalDeduction = medicalMiles * 0.21;
      const charityDeduction = charityMiles * 0.14;
      const totalDeduction = businessDeduction + medicalDeduction + charityDeduction;
      
      let csvContent = 'Date,Start Time,End Time,Start Address,End Address,Distance (mi),Category,Client,Purpose,Business Deduction,Medical Deduction,Charity Deduction\n';
      
      filteredTrips.forEach(trip => {
        const startDate = new Date(trip.startTime);
        const endDate = new Date(trip.endTime);
        const businessDed = trip.category === 'Business' ? (trip.distance * 0.70).toFixed(2) : '0.00';
        const medicalDed = trip.category === 'Medical' ? (trip.distance * 0.21).toFixed(2) : '0.00';
        const charityDed = trip.category === 'Charity' ? (trip.distance * 0.14).toFixed(2) : '0.00';
        
        csvContent += `${startDate.toLocaleDateString()},${startDate.toLocaleTimeString()},${endDate.toLocaleTimeString()},"${trip.startAddress}","${trip.endAddress}",${trip.distance},${trip.category},"${trip.client}","${trip.purpose}",${businessDed},${medicalDed},${charityDed}\n`;
      });
      
      csvContent += `\nSUMMARY,,,,,,,,,,\n`;
      csvContent += `Total Trips,${filteredTrips.length},,,,,,,,\n`;
      csvContent += `Total Miles,${totalMiles.toFixed(1)},,,,,,,,\n`;
      csvContent += `Business Miles,${businessMiles.toFixed(1)},,,,,,,,\n`;
      csvContent += `Medical Miles,${medicalMiles.toFixed(1)},,,,,,,,\n`;
      csvContent += `Charity Miles,${charityMiles.toFixed(1)},,,,,,,,\n`;
      csvContent += `Total IRS Deduction,$${totalDeduction.toFixed(2)},,,,,,,,\n`;
      
      await Share.share({
        message: csvContent,
        title: `MileTracker Pro Export - ${period}`
      });
      
      setExportModal(false);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data: ' + error.message);
    }
  };

  const captureReceipt = async (tripId) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const receipt = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          timestamp: new Date().toISOString(),
          category: 'Gas',
          amount: 0
        };

        setTrips(prev => prev.map(trip => 
          trip.id === tripId 
            ? { ...trip, receipts: [...(trip.receipts || []), receipt] }
            : trip
        ));

        Alert.alert('Success', 'Receipt photo added');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture receipt: ' + error.message);
    }
  };

  // Calculate monthly stats
  const monthlyStats = () => {
    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    
    const monthlyTrips = trips.filter(trip => 
      new Date(trip.startTime) >= startOfMonth
    );
    
    const totalMiles = monthlyTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const businessMiles = monthlyTrips.filter(t => t.category === 'Business').reduce((sum, trip) => sum + trip.distance, 0);
    const medicalMiles = monthlyTrips.filter(t => t.category === 'Medical').reduce((sum, trip) => sum + trip.distance, 0);
    const charityMiles = monthlyTrips.filter(t => t.category === 'Charity').reduce((sum, trip) => sum + trip.distance, 0);
    
    const totalDeduction = (businessMiles * 0.70) + (medicalMiles * 0.21) + (charityMiles * 0.14);
    
    return {
      trips: monthlyTrips.length,
      miles: totalMiles,
      deduction: totalDeduction
    };
  };

  const stats = monthlyStats();

  // Dynamic styles based on current theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentTheme.background,
    },
    header: {
      backgroundColor: currentTheme.primary,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    headerButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    card: {
      backgroundColor: currentTheme.surface,
      margin: 15,
      padding: 20,
      borderRadius: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    primaryButton: {
      backgroundColor: currentTheme.primary,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      margin: 10,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    navigation: {
      flexDirection: 'row',
      backgroundColor: currentTheme.surface,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
    },
    navButton: {
      flex: 1,
      padding: 15,
      alignItems: 'center',
    },
    navButtonActive: {
      backgroundColor: currentTheme.primary,
    },
    navText: {
      fontSize: 12,
      color: currentTheme.textSecondary,
      marginTop: 5,
    },
    navTextActive: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
  });

  // DASHBOARD VIEW
  const DashboardView = () => (
    <ScrollView style={dynamicStyles.container}>
      <StatusBar backgroundColor={currentTheme.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>MileTracker Pro</Text>
        <TouchableOpacity 
          style={dynamicStyles.headerButton}
          onPress={() => setThemeModal(true)}
        >
          <Text style={{ color: '#ffffff', fontSize: 16 }}>🎨</Text>
        </TouchableOpacity>
      </View>

      {/* Tracking Status */}
      <View style={dynamicStyles.card}>
        <Text style={[styles.cardTitle, { color: currentTheme.text }]}>
          🚗 Professional Mileage Tracking - $4.99/month
        </Text>
        <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
          Manual Controls • Auto Detection • Tax Ready Reports
        </Text>
        
        <View style={styles.modeToggle}>
          <Text style={[styles.label, { color: currentTheme.text }]}>Tracking Mode</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, trackingMode === 'manual' && [styles.toggleActive, { backgroundColor: currentTheme.primary }]]}
              onPress={() => setTrackingMode('manual')}
            >
              <Text style={[styles.toggleText, trackingMode === 'manual' && styles.toggleTextActive]}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, trackingMode === 'auto' && [styles.toggleActive, { backgroundColor: currentTheme.primary }]]}
              onPress={() => setTrackingMode('auto')}
            >
              <Text style={[styles.toggleText, trackingMode === 'auto' && styles.toggleTextActive]}>Auto</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.modeExplanation, { color: currentTheme.textSecondary }]}>
            Auto: Detects driving automatically • Manual: Full start/stop control
          </Text>
        </div>

        {trackingMode === 'auto' && (
          <View style={styles.autoStatus}>
            <Text style={[styles.statusText, { color: currentTheme.textSecondary }]}>
              Speed: {currentSpeed.toFixed(1)} mph • Status: {detectionStatus}
            </Text>
            {detectionStatus === 'Movement detected' && (
              <Text style={[styles.alert, { color: currentTheme.warning }]}>⚠️ Movement detected - Starting trip...</Text>
            )}
          </View>
        )}

        {trackingMode === 'manual' && (
          <TouchableOpacity 
            style={[dynamicStyles.primaryButton, { backgroundColor: isTracking ? currentTheme.danger : currentTheme.success }]}
            onPress={isTracking ? stopTrip : () => startTrip(false)}
          >
            <Text style={dynamicStyles.buttonText}>
              {isTracking ? '⏹️ STOP TRIP NOW' : '🚗 START TRIP NOW - Instant tracking control'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Monthly Summary */}
      <View style={dynamicStyles.card}>
        <Text style={[styles.cardTitle, { color: currentTheme.text }]}>June 2025 Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>{stats.trips}</Text>
            <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>{stats.miles.toFixed(0)}</Text>
            <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>Mi</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>${stats.deduction.toFixed(0)}</Text>
            <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>IRS</Text>
          </View>
        </View>
        <Text style={[styles.irsExplanation, { color: currentTheme.textSecondary }]}>
          IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi) + Charity trips ($0.14/mi)
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={dynamicStyles.card}>
        <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentTheme.accent }]}
            onPress={() => setAddTripModal(true)}
          >
            <Text style={styles.actionText}>➕ Add Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentTheme.secondary }]}
            onPress={() => setExportModal(true)}
          >
            <Text style={styles.actionText}>📊 Export</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // TRIPS VIEW  
  const TripsView = () => (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Trip History</Text>
        <TouchableOpacity 
          style={dynamicStyles.headerButton}
          onPress={() => setAddTripModal(true)}
        >
          <Text style={{ color: '#ffffff', fontSize: 16 }}>➕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[dynamicStyles.card, { marginHorizontal: 20, marginVertical: 8 }]}>
            <View style={styles.tripHeader}>
              <Text style={[styles.tripTitle, { color: currentTheme.text }]}>
                {item.startAddress} → {item.endAddress}
              </Text>
              <TouchableOpacity 
                style={[styles.receiptButton, { backgroundColor: currentTheme.warning }]}
                onPress={() => captureReceipt(item.id)}
              >
                <Text style={styles.receiptButtonText}>📄 Receipt</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.tripDistance, { color: currentTheme.primary }]}>
              {item.distance} miles • {item.category}
            </Text>
            
            <Text style={[styles.tripTime, { color: currentTheme.textSecondary }]}>
              {new Date(item.startTime).toLocaleDateString()} • 
              ${(item.category === 'Business' ? item.distance * 0.70 : 
                item.category === 'Medical' ? item.distance * 0.21 : 
                item.distance * 0.14).toFixed(2)} deduction
            </Text>
            
            {item.client && (
              <Text style={[styles.tripClient, { color: currentTheme.accent }]}>
                Client: {item.client}
              </Text>
            )}
            
            {item.receipts && item.receipts.length > 0 && (
              <View style={styles.receiptsList}>
                <Text style={[styles.receiptsLabel, { color: currentTheme.textSecondary }]}>
                  📄 {item.receipts.length} receipt(s) attached
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => {
                setSelectedTrip(item);
                setEditTripModal(true);
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );

  // EXPORT VIEW
  const ExportView = () => (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Export & Reports</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={dynamicStyles.card}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Quick Export</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Export trip data for taxes, employee reimbursements, and contractor payments
          </Text>
          
          <View style={styles.exportGrid}>
            {['7d', '14d', '30d', '90d'].map(period => (
              <TouchableOpacity 
                key={period}
                style={[styles.periodButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => exportData(period)}
              >
                <Text style={styles.periodButtonText}>{period}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.presetExplanation, { color: currentTheme.textSecondary }]}>
            d = days (7d = weekly, 30d = monthly, 90d = quarterly)
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Export Features</Text>
          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: currentTheme.textSecondary }]}>
              • Professional CSV format compatible with Excel and accounting software
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textSecondary }]}>
              • IRS-compliant mileage calculations by category
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textSecondary }]}>
              • Summary totals and tax deduction amounts
            </Text>
            <Text style={[styles.featureItem, { color: currentTheme.textSecondary }]}>
              • Receipt attachments and expense tracking
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // Main render with navigation
  return (
    <View style={{ flex: 1 }}>
      {activeView === 'home' && <DashboardView />}
      {activeView === 'trips' && <TripsView />}
      {activeView === 'export' && <ExportView />}

      {/* Bottom Navigation */}
      <View style={dynamicStyles.navigation}>
        <TouchableOpacity 
          style={[dynamicStyles.navButton, activeView === 'home' && dynamicStyles.navButtonActive]}
          onPress={() => setActiveView('home')}
        >
          <Text style={{ fontSize: 20 }}>🏠</Text>
          <Text style={[dynamicStyles.navText, activeView === 'home' && dynamicStyles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.navButton, activeView === 'trips' && dynamicStyles.navButtonActive]}
          onPress={() => setActiveView('trips')}
        >
          <Text style={{ fontSize: 20 }}>🚗</Text>
          <Text style={[dynamicStyles.navText, activeView === 'trips' && dynamicStyles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.navButton, activeView === 'export' && dynamicStyles.navButtonActive]}
          onPress={() => setActiveView('export')}
        >
          <Text style={{ fontSize: 20 }}>📊</Text>
          <Text style={[dynamicStyles.navText, activeView === 'export' && dynamicStyles.navTextActive]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Add Trip Modal */}
      <AddTripModal 
        visible={addTripModal}
        onClose={() => setAddTripModal(false)}
        onSubmit={addManualTrip}
        theme={currentTheme}
      />

      {/* Theme Selector Modal */}
      <ThemeModal 
        visible={themeModal}
        onClose={() => setThemeModal(false)}
        onSelect={saveTheme}
        currentTheme={currentTheme}
      />
    </View>
  );
};

// Add Trip Modal Component
const AddTripModal = ({ visible, onClose, onSubmit, theme }) => {
  const [formData, setFormData] = useState({
    startAddress: '',
    endAddress: '',
    distance: '',
    category: 'Business',
    client: '',
    purpose: ''
  });

  const handleSubmit = () => {
    if (!formData.startAddress || !formData.endAddress || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in start address, end address, and distance');
      return;
    }
    
    onSubmit(formData);
    setFormData({
      startAddress: '',
      endAddress: '',
      distance: '',
      category: 'Business',
      client: '',
      purpose: ''
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <ScrollView style={{ maxHeight: '90%' }}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Manual Trip</Text>
            
            <TextInput
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
              placeholder="Start Address"
              placeholderTextColor={theme.textSecondary}
              value={formData.startAddress}
              onChangeText={text => setFormData(prev => ({ ...prev, startAddress: text }))}
            />
            
            <TextInput
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
              placeholder="End Address"
              placeholderTextColor={theme.textSecondary}
              value={formData.endAddress}
              onChangeText={text => setFormData(prev => ({ ...prev, endAddress: text }))}
            />
            
            <TextInput
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
              placeholder="Distance (miles)"
              placeholderTextColor={theme.textSecondary}
              value={formData.distance}
              onChangeText={text => setFormData(prev => ({ ...prev, distance: text }))}
              keyboardType="numeric"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <View style={styles.categoryButtons}>
                {['Business', 'Medical', 'Charity'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: formData.category === category ? theme.primary : theme.background }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: formData.category === category ? '#ffffff' : theme.text }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
              placeholder="Client (optional)"
              placeholderTextColor={theme.textSecondary}
              value={formData.client}
              onChangeText={text => setFormData(prev => ({ ...prev, client: text }))}
            />
            
            <TextInput
              style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
              placeholder="Purpose (optional)"
              placeholderTextColor={theme.textSecondary}
              value={formData.purpose}
              onChangeText={text => setFormData(prev => ({ ...prev, purpose: text }))}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.textSecondary }]}
                onPress={onClose}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
              >
                <Text style={styles.modalButtonText}>Add Trip</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Theme Selector Modal
const ThemeModal = ({ visible, onClose, onSelect, currentTheme }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Choose Color Theme</Text>
          
          <ScrollView style={{ maxHeight: '80%' }}>
            {Object.entries(COLOR_THEMES).map(([key, theme]) => (
              <TouchableOpacity
                key={key}
                style={[styles.themeOption, { backgroundColor: theme.primary }]}
                onPress={() => onSelect(theme)}
              >
                <Text style={styles.themeOptionText}>{theme.name}</Text>
                <View style={styles.colorPreview}>
                  <View style={[styles.colorSample, { backgroundColor: theme.primary }]} />
                  <View style={[styles.colorSample, { backgroundColor: theme.secondary }]} />
                  <View style={[styles.colorSample, { backgroundColor: theme.accent }]} />
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: '#6c757d' }]}
              onPress={() => onSelect(generateRandomTheme())}
            >
              <Text style={styles.themeOptionText}>🎲 Random Theme</Text>
              <Text style={styles.randomDescription}>Generate new colors</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: currentTheme.primary, marginTop: 20 }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Main app wrapped in error boundary
export default function App() {
  return (
    <ErrorBoundary>
      <MileTrackerApp />
    </ErrorBoundary>
  );
}

// Error boundary styles
const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#212529',
    fontFamily: 'monospace',
  },
  stackContainer: {
    maxHeight: 100,
    backgroundColor: '#f1f3f4',
    padding: 10,
    borderRadius: 8,
  },
  stackText: {
    fontSize: 12,
    color: '#212529',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6c757d',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#6c757d',
  },
});

// App styles
const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  modeToggle: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#007bff',
  },
  toggleText: {
    fontSize: 14,
    color: '#6c757d',
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modeExplanation: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  autoStatus: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
  alert: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  irsExplanation: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  receiptButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  tripClient: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  receiptsList: {
    marginBottom: 8,
  },
  receiptsLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  periodButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  periodButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  presetExplanation: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeOption: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  colorSample: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  randomDescription: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
  },
});
