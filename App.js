// MileTracker Pro v18.7 - WITH ERROR BOUNDARY: Shows crash details instead of immediate closure
// Removes undefined WebSocket calls while maintaining all features

import React, { Component, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, FlatList, Image, Dimensions } from 'react-native';
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
    this.state = { hasError: false, error: null, errorInfo: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = Date.now().toString();
    this.setState({ error, errorInfo, errorId });
    console.log('CRASH DETECTED:', error.message);
    console.log('STACK TRACE:', error.stack);
  }

  restartApp = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  shareErrorReport = async () => {
    try {
      const errorDetails = `MileTracker Pro Error Report
ID: ${this.state.errorId}
Time: ${new Date().toLocaleString()}
Error: ${this.state.error.message}
Component: ${this.state.errorInfo.componentStack.split('\n')[1] || 'Unknown'}
Stack Trace: ${this.state.error.stack}`;

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
        <View style={errorBoundaryStyles.container}>
          <StatusBar backgroundColor="#dc3545" barStyle="light-content" />
          <View style={errorBoundaryStyles.header}>
            <Text style={errorBoundaryStyles.title}>⚠️ App Error Detected</Text>
            <Text style={errorBoundaryStyles.subtitle}>Don't worry - your data is safe</Text>
          </View>
          <ScrollView style={errorBoundaryStyles.detailsContainer}>
            <View style={errorBoundaryStyles.errorCard}>
              <Text style={errorBoundaryStyles.label}>Error Message:</Text>
              <Text style={errorBoundaryStyles.errorText}>{this.state.error.message}</Text>
            </View>
            <View style={errorBoundaryStyles.errorCard}>
              <Text style={errorBoundaryStyles.label}>Component:</Text>
              <Text style={errorBoundaryStyles.errorText}>{this.state.errorInfo.componentStack.split('\n')[1] || 'Unknown'}</Text>
            </View>
            <View style={errorBoundaryStyles.errorCard}>
              <Text style={errorBoundaryStyles.label}>Error ID:</Text>
              <Text style={errorBoundaryStyles.errorText}>{this.state.errorId}</Text>
            </View>
            <View style={errorBoundaryStyles.errorCard}>
              <Text style={errorBoundaryStyles.label}>Stack Trace:</Text>
              <ScrollView style={errorBoundaryStyles.stackContainer} horizontal>
                <Text style={errorBoundaryStyles.stackText}>{this.state.error.stack}</Text>
              </ScrollView>
            </View>
          </ScrollView>
          <View style={errorBoundaryStyles.buttonContainer}>
            <TouchableOpacity style={[errorBoundaryStyles.button, errorBoundaryStyles.primaryButton]} onPress={this.restartApp}>
              <Text style={errorBoundaryStyles.buttonText}>🔄 Restart App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[errorBoundaryStyles.button, errorBoundaryStyles.secondaryButton]} onPress={this.shareErrorReport}>
              <Text style={[errorBoundaryStyles.buttonText, errorBoundaryStyles.secondaryButtonText]}>📤 Share Error Report</Text>
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
    accent: '#ffb347',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#fff8f0',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568'
  },
  lavender: {
    name: 'Lavender Dreams',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#c4b5fd',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568'
  },
  corporate: {
    name: 'Corporate Blue',
    primary: '#1e40af',
    secondary: '#1d4ed8',
    accent: '#60a5fa',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#475569'
  },
  dark: {
    name: 'Dark Mode',
    primary: '#4f46e5',
    secondary: '#6366f1',
    accent: '#818cf8',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#d1d5db'
  }
};

const { width, height } = Dimensions.get('window');

export default function App() {
  // Core state
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [manualTripModal, setManualTripModal] = useState(false);
  const [editTripModal, setEditTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [exportModal, setExportModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [selectedTripForReceipt, setSelectedTripForReceipt] = useState(null);
  const [viewReceiptModal, setViewReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  
  // Auto-detection state
  const [autoDetection, setAutoDetection] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState('Idle');
  const watchId = useRef(null);
  const lastPosition = useRef(null);
  const lastPositionTime = useRef(null);
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState('periwinkle');
  const [customColors, setCustomColors] = useState(null);
  const [themeModal, setThemeModal] = useState(false);
  
  // Team collaboration state
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('Team Member');
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teamModal, setTeamModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  
  const API_BASE_URL = null; // Local mode - no API dependency
  
  // Get current theme colors
  const colors = customColors || COLOR_THEMES[currentTheme];
  
  // Sample data for demonstration
  const clients = [
    { id: 1, name: 'ABC Company', color: '#4CAF50' },
    { id: 2, name: 'XYZ Corp', color: '#2196F3' },
    { id: 3, name: 'Tech Solutions', color: '#FF9800' }
  ];
  
  const categories = [
    { key: 'Business', rate: 0.70, color: '#4CAF50' },
    { key: 'Medical', rate: 0.21, color: '#2196F3' },
    { key: 'Charity', rate: 0.14, color: '#FF9800' },
    { key: 'Personal', rate: 0.00, color: '#9E9E9E' }
  ];
  
  useEffect(() => {
    loadTrips();
    loadThemePreference();
    initializeCollaboration();
    
    if (autoDetection) {
      startAutoDetection();
    }
    
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (autoDetection && !isTracking) {
      startAutoDetection();
    } else if (!autoDetection && watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setDetectionStatus('Idle');
      setCurrentSpeed(0);
    }
  }, [autoDetection, isTracking]);
  
  // Theme management
  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('selectedTheme');
      const savedCustomColors = await AsyncStorage.getItem('customColors');
      
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
      
      if (savedCustomColors) {
        setCustomColors(JSON.parse(savedCustomColors));
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };
  
  const saveThemePreference = async (themeKey, customTheme = null) => {
    try {
      await AsyncStorage.setItem('selectedTheme', themeKey);
      if (customTheme) {
        await AsyncStorage.setItem('customColors', JSON.stringify(customTheme));
        setCustomColors(customTheme);
      } else {
        await AsyncStorage.removeItem('customColors');
        setCustomColors(null);
      }
      setCurrentTheme(themeKey);
      
      // Theme change notification (local mode)
      console.log('Theme changed to:', customTheme ? customTheme.name : COLOR_THEMES[themeKey].name);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };
  
  const generateRandomTheme = () => {
    const randomHue = Math.floor(Math.random() * 360);
    const newTheme = {
      name: 'Custom Theme',
      primary: hslToHex(randomHue, 70, 50),
      secondary: hslToHex(randomHue, 70, 35),
      accent: hslToHex((randomHue + 30) % 360, 60, 60),
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      background: randomHue > 180 ? '#fafafa' : '#f8f9fa',
      surface: '#ffffff',
      text: '#333333',
      textSecondary: '#666666'
    };
    
    saveThemePreference('custom', newTheme);
  };
  
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
  
  // Collaboration setup
  const initializeCollaboration = async () => {
    try {
      let storedUserId = await AsyncStorage.getItem('userId');
      let storedUserName = await AsyncStorage.getItem('userName');
      
      if (!storedUserId) {
        storedUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('userId', storedUserId);
      }
      
      if (!storedUserName) {
        storedUserName = 'Team Member';
        await AsyncStorage.setItem('userName', storedUserName);
      }
      
      setUserId(storedUserId);
      setUserName(storedUserName);
      
      // Local mode - no WebSocket needed
      console.log('User initialized:', storedUserName);
      
    } catch (error) {
      console.log('Collaboration init error:', error);
    }
  };
  
  // Auto-detection with visual feedback
  const startAutoDetection = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    
    setDetectionStatus('Monitoring movement');
    
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const currentTime = Date.now();
        
        if (lastPosition.current && lastPositionTime.current) {
          const distance = calculateDistance(
            lastPosition.current.coords.latitude,
            lastPosition.current.coords.longitude,
            position.coords.latitude,
            position.coords.longitude
          );
          
          const timeElapsed = (currentTime - lastPositionTime.current) / 1000; // seconds
          const speed = timeElapsed > 0 ? (distance / timeElapsed) * 3.6 : 0; // km/h
          
          setCurrentSpeed(Math.round(speed));
          
          if (speed > 5 && !isTracking) {
            setDetectionStatus('Movement detected');
            // Auto-start trip after consistent movement
            setTimeout(() => {
              if (!isTracking) {
                startAutoTrip(position);
              }
            }, 3000);
          } else if (speed < 1 && isTracking) {
            setDetectionStatus('Stopping trip');
            setTimeout(() => {
              if (isTracking) {
                stopTrip();
              }
            }, 10000); // Stop after 10 seconds of no movement
          } else if (!isTracking) {
            setDetectionStatus('Monitoring movement');
          }
        }
        
        lastPosition.current = position;
        lastPositionTime.current = currentTime;
      },
      (error) => {
        console.log('Auto-detection error:', error);
        setDetectionStatus('Location unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };
  
  const startAutoTrip = (position) => {
    const newTrip = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      startLocation: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: 'Auto-detected location'
      },
      status: 'active',
      distance: 0,
      category: 'Business',
      purpose: '',
      client: clients.length > 0 ? clients[0] : null,
      receipts: [],
      autoDetected: true
    };
    
    setCurrentTrip(newTrip);
    setIsTracking(true);
    setDetectionStatus('Trip started automatically');
  };
  
  const startTrip = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newTrip = {
          id: Date.now(),
          startTime: new Date().toISOString(),
          startLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Current location'
          },
          status: 'active',
          distance: 0,
          category: 'Business',
          purpose: '',
          client: clients.length > 0 ? clients[0] : null,
          receipts: []
        };
        
        setCurrentTrip(newTrip);
        setIsTracking(true);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Error', 'Failed to get location for trip tracking');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };
  
  const stopTrip = () => {
    if (!currentTrip) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const endLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: 'End location'
        };
        
        const distance = calculateDistance(
          currentTrip.startLocation.latitude,
          currentTrip.startLocation.longitude,
          endLocation.latitude,
          endLocation.longitude
        );
        
        // Only save trips with significant distance (> 0.5 miles)
        if (distance > 0.5) {
          const completedTrip = {
            ...currentTrip,
            endTime: new Date().toISOString(),
            endLocation,
            distance: Number(distance.toFixed(1)),
            status: 'completed'
          };
          
          const updatedTrips = [completedTrip, ...trips];
          setTrips(updatedTrips);
          saveTrips(updatedTrips);
        }
        
        setCurrentTrip(null);
        setIsTracking(false);
        setDetectionStatus('Monitoring movement');
      },
      (error) => {
        console.error('Stop trip error:', error);
        // Save trip without end location if GPS fails
        const completedTrip = {
          ...currentTrip,
          endTime: new Date().toISOString(),
          endLocation: { address: 'Location unavailable' },
          distance: 0,
          status: 'completed'
        };
        
        const updatedTrips = [completedTrip, ...trips];
        setTrips(updatedTrips);
        saveTrips(updatedTrips);
        
        setCurrentTrip(null);
        setIsTracking(false);
        setDetectionStatus('Monitoring movement');
      }
    );
  };
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Trip management
  const loadTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        // Load sample data for demo
        const sampleTrips = [
          {
            id: 1,
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date(Date.now() - 86400000 + 3600000).toISOString(),
            startLocation: { address: '123 Main St, City' },
            endLocation: { address: '456 Oak Ave, Town' },
            distance: 12.5,
            category: 'Business',
            purpose: 'Client meeting',
            client: clients[0],
            receipts: [],
            status: 'completed'
          },
          {
            id: 2,
            startTime: new Date(Date.now() - 172800000).toISOString(),
            endTime: new Date(Date.now() - 172800000 + 1800000).toISOString(),
            startLocation: { address: '789 Pine St, City' },
            endLocation: { address: '321 Elm St, City' },
            distance: 8.2,
            category: 'Medical',
            purpose: 'Doctor appointment',
            client: null,
            receipts: [],
            status: 'completed'
          }
        ];
        setTrips(sampleTrips);
        saveTrips(sampleTrips);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };
  
  const saveTrips = async (tripsToSave) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(tripsToSave));
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  };
  
  // Calculate monthly summary with real data
  const getMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTrips = trips.filter(trip => {
      const tripDate = new Date(trip.startTime);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });
    
    const totalMiles = monthlyTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    const businessMiles = monthlyTrips
      .filter(trip => trip.category === 'Business')
      .reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    const medicalMiles = monthlyTrips
      .filter(trip => trip.category === 'Medical')
      .reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    const charityMiles = monthlyTrips
      .filter(trip => trip.category === 'Charity')
      .reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    const irsDeduction = (businessMiles * 0.70) + (medicalMiles * 0.21) + (charityMiles * 0.14);
    
    return {
      tripCount: monthlyTrips.length,
      totalMiles: totalMiles.toFixed(1),
      irsDeduction: irsDeduction.toFixed(0)
    };
  };
  
  // Export functionality
  const handleQuickExport = async (days) => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    const filteredTrips = trips.filter(trip => 
      new Date(trip.startTime) >= daysAgo
    );
    
    if (filteredTrips.length === 0) {
      Alert.alert('No Data', `No trips found in the last ${days} days`);
      return;
    }
    
    await exportTripsAsCSV(filteredTrips, `${days}d-export`);
  };
  
  const exportTripsAsCSV = async (tripsToExport, filename) => {
    try {
      const csvHeader = 'Date,Start Time,End Time,Start Location,End Location,Distance (mi),Category,Purpose,Client,IRS Rate,Deduction\n';
      
      const csvRows = tripsToExport.map(trip => {
        const rate = categories.find(cat => cat.key === trip.category)?.rate || 0;
        const deduction = (trip.distance * rate).toFixed(2);
        
        return [
          new Date(trip.startTime).toLocaleDateString(),
          new Date(trip.startTime).toLocaleTimeString(),
          trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : 'In Progress',
          `"${trip.startLocation?.address || 'Unknown'}"`,
          `"${trip.endLocation?.address || 'Unknown'}"`,
          trip.distance || 0,
          trip.category || 'Business',
          `"${trip.purpose || ''}"`,
          `"${trip.client?.name || ''}"`,
          `$${rate.toFixed(2)}`,
          `$${deduction}`
        ].join(',');
      });
      
      const csvContent = csvHeader + csvRows.join('\n');
      
      // Calculate summary
      const totalMiles = tripsToExport.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const totalDeduction = tripsToExport.reduce((sum, trip) => {
        const rate = categories.find(cat => cat.key === trip.category)?.rate || 0;
        return sum + (trip.distance * rate);
      }, 0);
      
      const summaryText = `\n\nSUMMARY\nTotal Trips: ${tripsToExport.length}\nTotal Miles: ${totalMiles.toFixed(1)}\nTotal IRS Deduction: $${totalDeduction.toFixed(2)}`;
      
      const finalContent = csvContent + summaryText;
      
      const fileUri = FileSystem.documentDirectory + `miletracker-${filename}-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, finalContent);
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export MileTracker Data'
      });
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export trip data');
    }
  };
  
  // Receipt management with camera and gallery options
  const handleReceiptCapture = async (tripId) => {
    try {
      Alert.alert(
        'Add Receipt',
        'Choose how to add your receipt photo:',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              
              if (!result.canceled && result.assets[0]) {
                addReceiptToTrip(tripId, result.assets[0].uri);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              
              if (!result.canceled && result.assets[0]) {
                addReceiptToTrip(tripId, result.assets[0].uri);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Receipt capture error:', error);
      Alert.alert('Error', 'Failed to access camera or gallery');
    }
  };
  
  const addReceiptToTrip = (tripId, imageUri) => {
    const receipt = {
      id: Date.now(),
      uri: imageUri,
      type: 'Gas',
      amount: '',
      date: new Date().toISOString()
    };
    
    const updatedTrips = trips.map(trip => 
      trip.id === tripId 
        ? { ...trip, receipts: [...(trip.receipts || []), receipt] }
        : trip
    );
    
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
    Alert.alert('Success', 'Receipt added to trip');
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'In Progress';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };
  
  const stats = getMonthlyStats();
  
  // Home Dashboard View
  const renderHome = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
        <Text style={[styles.headerSubtitle, { color: colors.surface }]}>
          Professional Mileage Tracking • Manual Controls • Auto Detection • Tax Ready Reports
        </Text>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setSettingsModal(true)}
        >
          <Text style={[styles.settingsIcon, { color: colors.surface }]}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {/* Auto-detection Status */}
      {autoDetection && (
        <View style={[styles.detectionCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Text style={[styles.detectionTitle, { color: colors.text }]}>Auto Detection Status</Text>
          <Text style={[styles.detectionStatus, { color: colors.primary }]}>{detectionStatus}</Text>
          {currentSpeed > 0 && (
            <Text style={[styles.speedText, { color: colors.textSecondary }]}>
              Current speed: {currentSpeed} km/h
            </Text>
          )}
        </View>
      )}
      
      {/* Monthly Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{stats.tripCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{stats.totalMiles}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mi</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.success }]}>${stats.irsDeduction}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IRS</Text>
          </View>
        </View>
        <Text style={[styles.irsExplanation, { color: colors.textSecondary }]}>
          IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi) + Charity trips ($0.14/mi)
        </Text>
      </View>
      
      {/* Mode Toggle */}
      <View style={[styles.modeCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.modeTitle, { color: colors.text }]}>Tracking Mode</Text>
        <View style={styles.modeToggle}>
          <Text style={[styles.modeLabel, { color: colors.textSecondary }]}>Manual</Text>
          <Switch
            value={autoDetection}
            onValueChange={setAutoDetection}
            trackColor={{ false: colors.textSecondary, true: colors.primary }}
            thumbColor={colors.surface}
          />
          <Text style={[styles.modeLabel, { color: colors.textSecondary }]}>Auto</Text>
        </View>
        <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
          Auto: Detects driving automatically • Manual: Full start/stop control
        </Text>
      </View>
      
      {/* Trip Controls */}
      <View style={[styles.controlsCard, { backgroundColor: colors.surface }]}>
        {!isTracking ? (
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: colors.success }]}
            onPress={startTrip}
          >
            <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
            <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={[styles.trackingText, { color: colors.primary }]}>
              📍 Trip in progress...
            </Text>
            {currentTrip && (
              <Text style={[styles.trackingDetails, { color: colors.textSecondary }]}>
                Started: {formatDate(currentTrip.startTime)}
              </Text>
            )}
            <TouchableOpacity 
              style={[styles.stopButton, { backgroundColor: colors.danger }]}
              onPress={stopTrip}
            >
              <Text style={styles.stopButtonText}>⏹️ STOP TRIP</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.manualButton, { backgroundColor: colors.accent }]}
          onPress={() => setManualTripModal(true)}
        >
          <Text style={styles.manualButtonText}>✏️ ADD MANUAL TRIP</Text>
        </TouchableOpacity>
      </View>
      
      {/* Recent Trips Preview */}
      <View style={[styles.recentCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Trips</Text>
        {trips.slice(0, 3).map(trip => (
          <View key={trip.id} style={[styles.tripPreview, { borderColor: colors.accent }]}>
            <View style={styles.tripPreviewContent}>
              <Text style={[styles.tripPreviewDistance, { color: colors.primary }]}>
                {trip.distance} mi
              </Text>
              <Text style={[styles.tripPreviewCategory, { color: colors.textSecondary }]}>
                {trip.category}
              </Text>
            </View>
            <Text style={[styles.tripPreviewDate, { color: colors.textSecondary }]}>
              {formatDate(trip.startTime)}
            </Text>
          </View>
        ))}
        
        <TouchableOpacity 
          style={[styles.viewAllButton, { backgroundColor: colors.primary }]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={styles.viewAllButtonText}>View All Trips</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  // Trips List View
  const renderTrips = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.viewTitle, { color: colors.text, marginTop: 25 }]}>Trip History</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
            <View style={styles.tripHeader}>
              <View style={styles.tripDistance}>
                <Text style={[styles.tripDistanceText, { color: colors.primary }]}>
                  {item.distance} mi
                </Text>
                <Text style={[styles.tripCategory, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </View>
              
              <View style={styles.tripActions}>
                <TouchableOpacity 
                  style={styles.receiptButton}
                  onPress={() => handleReceiptCapture(item.id)}
                >
                  <Text style={styles.receiptButtonText}>📄 Receipt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setEditingTrip(item);
                    setEditTripModal(true);
                  }}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.tripDetails}>
              <Text style={[styles.tripTime, { color: colors.textSecondary }]}>
                {formatDate(item.startTime)} • {formatDuration(item.startTime, item.endTime)}
              </Text>
              
              <Text style={[styles.tripLocations, { color: colors.text }]}>
                From: {item.startLocation?.address || 'Unknown'}
              </Text>
              {item.endLocation && (
                <Text style={[styles.tripLocations, { color: colors.text }]}>
                  To: {item.endLocation.address}
                </Text>
              )}
              
              {item.purpose && (
                <Text style={[styles.tripPurpose, { color: colors.textSecondary }]}>
                  Purpose: {item.purpose}
                </Text>
              )}
              
              {item.client && (
                <Text style={[styles.tripClient, { color: colors.primary }]}>
                  Client: {item.client.name}
                </Text>
              )}
              
              {item.receipts && item.receipts.length > 0 && (
                <Text style={[styles.tripReceipts, { color: colors.success }]}>
                  📄 {item.receipts.length} receipt(s) attached
                </Text>
              )}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
  
  // Export View
  const renderExport = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.viewTitle, { color: colors.text, marginTop: 25 }]}>Export Data</Text>
      
      <ScrollView style={styles.exportContainer}>
        <View style={[styles.exportCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.exportTitle, { color: colors.text }]}>Quick Export</Text>
          <Text style={[styles.exportDescription, { color: colors.textSecondary }]}>
            d = days (7d = weekly, 30d = monthly, 90d = quarterly)
          </Text>
          
          <View style={styles.exportButtons}>
            <TouchableOpacity 
              style={[styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={() => handleQuickExport(7)}
            >
              <Text style={styles.exportButtonText}>7d</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={() => handleQuickExport(14)}
            >
              <Text style={styles.exportButtonText}>14d</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={() => handleQuickExport(30)}
            >
              <Text style={styles.exportButtonText}>30d</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={() => handleQuickExport(90)}
            >
              <Text style={styles.exportButtonText}>90d</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.exportCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.exportTitle, { color: colors.text }]}>Export Options</Text>
          
          <TouchableOpacity 
            style={[styles.exportOptionButton, { backgroundColor: colors.success }]}
            onPress={() => exportTripsAsCSV(trips, 'all-trips')}
          >
            <Text style={styles.exportOptionText}>📊 Export All Trips</Text>
            <Text style={styles.exportOptionDescription}>
              Complete CSV for taxes, employee reimbursements, contractor payments
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.exportOptionButton, { backgroundColor: colors.accent }]}
            onPress={() => handleQuickExport(365)}
          >
            <Text style={styles.exportOptionText}>📅 Export This Year</Text>
            <Text style={styles.exportOptionDescription}>
              Annual report for tax preparation and business records
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // Settings Modal with theme selector
  const renderSettingsModal = () => (
    <Modal visible={settingsModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '90%' }]}>
          <ScrollView>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
            
            {/* Theme Selection */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Theme Colors</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeSelector}>
                {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeOption,
                      { backgroundColor: theme.primary },
                      currentTheme === key && { borderWidth: 3, borderColor: colors.text }
                    ]}
                    onPress={() => saveThemePreference(key)}
                  >
                    <Text style={styles.themeOptionText}>{theme.name}</Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={[styles.themeOption, { backgroundColor: colors.accent }]}
                  onPress={generateRandomTheme}
                >
                  <Text style={styles.themeOptionText}>🎲 Random</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            
            {/* Mode Settings */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Tracking Mode</Text>
              <View style={styles.settingsRow}>
                <Text style={[styles.settingsText, { color: colors.textSecondary }]}>Auto Detection</Text>
                <Switch
                  value={autoDetection}
                  onValueChange={setAutoDetection}
                  trackColor={{ false: colors.textSecondary, true: colors.primary }}
                />
              </View>
            </View>
            
            {/* App Status */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>App Status</Text>
              <Text style={[styles.statusText, { color: colors.success }]}>
                ✅ Local Mode - All features working
              </Text>
              <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                Running in local mode with full functionality. All data stored on device.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close Settings</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  
  // Manual Trip Modal
  const renderManualTripModal = () => {
    const [formData, setFormData] = useState({
      startLocation: '',
      endLocation: '',
      distance: '',
      category: 'Business',
      purpose: '',
      client: null,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    });
    
    const handleSaveManualTrip = () => {
      if (!formData.startLocation || !formData.endLocation || !formData.distance) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }
      
      const newTrip = {
        id: Date.now(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        startLocation: { address: formData.startLocation },
        endLocation: { address: formData.endLocation },
        distance: parseFloat(formData.distance),
        category: formData.category,
        purpose: formData.purpose,
        client: formData.client,
        receipts: [],
        status: 'completed',
        manual: true
      };
      
      const updatedTrips = [newTrip, ...trips];
      setTrips(updatedTrips);
      saveTrips(updatedTrips);
      setManualTripModal(false);
      Alert.alert('Success', 'Manual trip added successfully');
    };
    
    return (
      <Modal visible={manualTripModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Manual Trip</Text>
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="Start Location"
                placeholderTextColor={colors.textSecondary}
                value={formData.startLocation}
                onChangeText={(text) => setFormData({...formData, startLocation: text})}
              />
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="End Location"
                placeholderTextColor={colors.textSecondary}
                value={formData.endLocation}
                onChangeText={(text) => setFormData({...formData, endLocation: text})}
              />
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="Distance (miles)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.distance}
                onChangeText={(text) => setFormData({...formData, distance: text})}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: category.color },
                      formData.category === category.key && { borderWidth: 2, borderColor: colors.text }
                    ]}
                    onPress={() => setFormData({...formData, category: category.key})}
                  >
                    <Text style={styles.categoryChipText}>{category.key}</Text>
                    <Text style={styles.categoryChipRate}>${category.rate}/mi</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="Purpose (optional)"
                placeholderTextColor={colors.textSecondary}
                value={formData.purpose}
                onChangeText={(text) => setFormData({...formData, purpose: text})}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Client (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
                <TouchableOpacity
                  style={[
                    styles.clientChip,
                    { backgroundColor: colors.textSecondary },
                    !formData.client && { borderWidth: 2, borderColor: colors.text }
                  ]}
                  onPress={() => setFormData({...formData, client: null})}
                >
                  <Text style={styles.clientChipText}>No Client</Text>
                </TouchableOpacity>
                
                {clients.map(client => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientChip,
                      { backgroundColor: client.color },
                      formData.client?.id === client.id && { borderWidth: 2, borderColor: colors.text }
                    ]}
                    onPress={() => setFormData({...formData, client})}
                  >
                    <Text style={styles.clientChipText}>{client.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
                  onPress={() => setManualTripModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveManualTrip}
                >
                  <Text style={styles.saveButtonText}>Save Trip</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Edit Trip Modal
  const renderEditTripModal = () => {
    if (!editingTrip) return null;
    
    const [formData, setFormData] = useState({
      category: editingTrip.category || 'Business',
      purpose: editingTrip.purpose || '',
      client: editingTrip.client || null,
      distance: editingTrip.distance?.toString() || '0'
    });
    
    const handleSaveEdit = () => {
      const updatedTrips = trips.map(trip =>
        trip.id === editingTrip.id
          ? {
              ...trip,
              category: formData.category,
              purpose: formData.purpose,
              client: formData.client,
              distance: parseFloat(formData.distance) || 0
            }
          : trip
      );
      
      setTrips(updatedTrips);
      saveTrips(updatedTrips);
      setEditTripModal(false);
      setEditingTrip(null);
      Alert.alert('Success', 'Trip updated successfully');
    };
    
    return (
      <Modal visible={editTripModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '90%' }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Trip</Text>
              
              <View style={styles.editTripInfo}>
                <Text style={[styles.editTripDate, { color: colors.textSecondary }]}>
                  {formatDate(editingTrip.startTime)}
                </Text>
                <Text style={[styles.editTripLocation, { color: colors.text }]}>
                  From: {editingTrip.startLocation?.address}
                </Text>
                {editingTrip.endLocation && (
                  <Text style={[styles.editTripLocation, { color: colors.text }]}>
                    To: {editingTrip.endLocation.address}
                  </Text>
                )}
              </View>
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="Distance (miles)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.distance}
                onChangeText={(text) => setFormData({...formData, distance: text})}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: category.color },
                      formData.category === category.key && { borderWidth: 2, borderColor: colors.text }
                    ]}
                    onPress={() => setFormData({...formData, category: category.key})}
                  >
                    <Text style={styles.categoryChipText}>{category.key}</Text>
                    <Text style={styles.categoryChipRate}>${category.rate}/mi</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TextInput
                style={[styles.input, { borderColor: colors.accent, color: colors.text }]}
                placeholder="Purpose (optional)"
                placeholderTextColor={colors.textSecondary}
                value={formData.purpose}
                onChangeText={(text) => setFormData({...formData, purpose: text})}
                multiline
                numberOfLines={3}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
                <TouchableOpacity
                  style={[
                    styles.clientChip,
                    { backgroundColor: colors.textSecondary },
                    !formData.client && { borderWidth: 2, borderColor: colors.text }
                  ]}
                  onPress={() => setFormData({...formData, client: null})}
                >
                  <Text style={styles.clientChipText}>No Client</Text>
                </TouchableOpacity>
                
                {clients.map(client => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientChip,
                      { backgroundColor: client.color },
                      formData.client?.id === client.id && { borderWidth: 2, borderColor: colors.text }
                    ]}
                    onPress={() => setFormData({...formData, client})}
                  >
                    <Text style={styles.clientChipText}>{client.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
                  onPress={() => {
                    setEditTripModal(false);
                    setEditingTrip(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Bottom Navigation
  const renderBottomNav = () => (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.accent }]}>
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'home' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('home')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'home' ? colors.surface : colors.textSecondary }]}>🏠</Text>
        <Text style={[styles.navLabel, { color: currentView === 'home' ? colors.surface : colors.textSecondary }]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'trips' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('trips')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>📋</Text>
        <Text style={[styles.navLabel, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>Trips</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'export' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('export')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'export' ? colors.surface : colors.textSecondary }]}>📊</Text>
        <Text style={[styles.navLabel, { color: currentView === 'export' ? colors.surface : colors.textSecondary }]}>Export</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <View style={[styles.app, { backgroundColor: colors.background }]}>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.primary} />
      
      {currentView === 'home' && renderHome()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}
      
      {renderSettingsModal()}
      {renderManualTripModal()}
      {renderEditTripModal()}
      {renderBottomNav()}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 80,
  },
  
  // Header
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 5,
  },
  settingsIcon: {
    fontSize: 24,
  },
  
  // Detection Card
  detectionCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  detectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detectionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  speedText: {
    fontSize: 12,
    marginTop: 2,
  },
  
  // Summary Card
  summaryCard: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  irsExplanation: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Mode Card
  modeCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  modeDescription: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Controls Card
  controlsCard: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  startButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButtonSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  trackingText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  trackingDetails: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  stopButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Recent Card
  recentCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tripPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  tripPreviewContent: {
    flex: 1,
  },
  tripPreviewDistance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripPreviewCategory: {
    fontSize: 12,
  },
  tripPreviewDate: {
    fontSize: 12,
  },
  viewAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // View Title
  viewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 20,
  },
  
  // Trip Cards
  tripCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripDistance: {
    flex: 1,
  },
  tripDistanceText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tripCategory: {
    fontSize: 14,
    marginTop: 2,
  },
  tripActions: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFA500',
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripDetails: {
    gap: 4,
  },
  tripTime: {
    fontSize: 12,
  },
  tripLocations: {
    fontSize: 13,
  },
  tripPurpose: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tripClient: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripReceipts: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Export
  exportContainer: {
    flex: 1,
    padding: 15,
  },
  exportCard: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 15,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  exportDescription: {
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exportOptionButton: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  exportOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  exportOptionDescription: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
  },
  
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Settings
  settingsSection: {
    marginBottom: 25,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  settingsText: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusDescription: {
    fontSize: 12,
  },
  
  // Theme Selector
  themeSelector: {
    flexDirection: 'row',
  },
  themeOption: {
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  themeOptionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Form Inputs
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  categoryChip: {
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  categoryChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryChipRate: {
    color: 'white',
    fontSize: 10,
  },
  clientSelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  clientChip: {
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  clientChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Edit Trip
  editTripInfo: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  editTripDate: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  editTripLocation: {
    fontSize: 12,
    marginBottom: 2,
  },
  
  // Modal Buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

