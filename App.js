// BUILD77 COMPLETE TRIP MANAGEMENT - Merge + Split + User Choice
// 1. EXTEND TRIP: User choice during stationary periods
// 2. MERGE TRIPS: Combine split journeys (traffic delays)
// 3. SPLIT TRIPS: Manual trip splitting for multi-purpose journeys
// 4. COMPLETE: All professional trip management features

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, 
  FlatList, PermissionsAndroid, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

// GPS SERVICE (same as previous version)
class CompleteTripGPSService {
  constructor(onTripStart, onTripEnd, onStatusUpdate, onLocationUpdate, onExtendTripPrompt) {
    this.onTripStart = onTripStart;
    this.onTripEnd = onTripEnd;
    this.onStatusUpdate = onStatusUpdate;
    this.onLocationUpdate = onLocationUpdate;
    this.onExtendTripPrompt = onExtendTripPrompt;
    this.watchId = null;
    this.isActive = false;
    this.currentTrip = null;
    this.lastPosition = null;
    this.tripPath = [];
    this.permissionGranted = false;
    
    // USER CHOICE SYSTEM
    this.detectionState = 'monitoring';
    this.detectionCount = 0;
    this.stationaryCount = 0;
    this.isGPSPaused = false;
    this.userExtendedTrip = false;
    this.extendPromptShown = false;
    
    // TIME TRACKING
    this.tripStartTime = null;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = null;
  }

  async initialize() {
    try {
      this.onStatusUpdate('Checking GPS permissions...');
      
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          
          if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
            this.onStatusUpdate('Location permission denied');
            return false;
          }
        }
        
        this.permissionGranted = true;
      }
      
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto'
      });
      
      this.onStatusUpdate('GPS ready - Complete trip management enabled');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS setup failed: ${error.message}`);
      return false;
    }
  }

  async startMonitoring() {
    const canStart = await this.initialize();
    if (!canStart) return false;

    if (this.watchId !== null) {
      this.stopMonitoring();
    }

    try {
      this.onStatusUpdate('Starting GPS monitoring...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
          distanceFilter: 5,
        }
      );
      
      this.isActive = true;
      this.detectionState = 'monitoring';
      this.onStatusUpdate('GPS active - Complete trip management ready');
      return true;
    } catch (error) {
      this.onStatusUpdate(`GPS failed: ${error.message}`);
      return false;
    }
  }

  stopMonitoring() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isActive = false;
    this.resetTracking();
    this.onStatusUpdate('GPS monitoring stopped');
  }

  resetTracking() {
    this.detectionState = 'monitoring';
    this.detectionCount = 0;
    this.stationaryCount = 0;
    this.isGPSPaused = false;
    this.userExtendedTrip = false;
    this.extendPromptShown = false;
    this.tripStartTime = null;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = null;
  }

  handleLocationError(error) {
    console.log('GPS Error:', error);
    this.onStatusUpdate(`GPS error: ${error.message}`);
  }

  handleLocationUpdate(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = Date.now();
    
    if (accuracy > 100) {
      this.onStatusUpdate(`Improving GPS accuracy (${accuracy.toFixed(0)}m)`);
      return;
    }

    let currentSpeed = 0;
    
    if (speed !== null && speed >= 0) {
      currentSpeed = speed * 2.237;
    } else if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.latitude, this.lastPosition.longitude,
        latitude, longitude
      );
      const timeSeconds = (timestamp - this.lastPosition.timestamp) / 1000;
      
      if (timeSeconds > 1 && timeSeconds < 30) {
        currentSpeed = (distance / timeSeconds) * 2.237;
      }
    }

    if (currentSpeed > 100) currentSpeed = 0;

    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude, speed: currentSpeed, accuracy });
    }

    this.processUserChoiceDetection(currentSpeed, latitude, longitude, timestamp);
    this.lastPosition = { latitude, longitude, timestamp, speed: currentSpeed };
  }

  processUserChoiceDetection(speed, latitude, longitude, timestamp) {
    switch (this.detectionState) {
      case 'monitoring':
        if (speed > 8) {
          this.detectionCount = 1;
          this.detectionState = 'detecting';
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (1/3)`);
        } else {
          this.onStatusUpdate(`Ready - Monitoring for movement (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'detecting':
        if (speed > 8) {
          this.detectionCount++;
          this.onStatusUpdate(`Detecting movement: ${speed.toFixed(1)}mph (${this.detectionCount}/3)`);
          
          if (this.detectionCount >= 3) {
            this.startTrip(latitude, longitude, speed, timestamp);
            this.detectionState = 'driving';
            this.detectionCount = 0;
            this.stationaryCount = 0;
          }
        } else {
          this.detectionCount = 0;
          this.detectionState = 'monitoring';
          this.onStatusUpdate(`Ready - Movement stopped (${speed.toFixed(1)}mph)`);
        }
        break;

      case 'driving':
        this.trackMovementTime(speed, timestamp);
        
        if (this.currentTrip && !this.isGPSPaused) {
          this.tripPath.push({ latitude, longitude, timestamp, speed, accuracy: 0 });
        }

        if (speed < 2) {
          this.stationaryCount++;
          const stationarySeconds = this.stationaryCount * 3;
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);
          
          if (stationarySeconds >= 180 && !this.extendPromptShown && !this.userExtendedTrip) {
            this.extendPromptShown = true;
            this.onExtendTripPrompt('traffic', stationarySeconds, drivingMinutes);
            this.onStatusUpdate(`Stationary 3min - Check for extend trip option`);
          } else if (stationarySeconds >= 300 && !this.userExtendedTrip) {
            this.endTrip(latitude, longitude, timestamp);
            this.detectionState = 'monitoring';
            this.stationaryCount = 0;
            this.isGPSPaused = false;
          } else if (stationarySeconds >= 900 && this.userExtendedTrip) {
            this.endTrip(latitude, longitude, timestamp);
            this.detectionState = 'monitoring';
            this.stationaryCount = 0;
            this.isGPSPaused = false;
          } else if (stationarySeconds >= 120 && !this.isGPSPaused) {
            this.isGPSPaused = true;
            this.onStatusUpdate(`Trip paused - ${Math.floor(stationarySeconds/60)}m stationary (${drivingMinutes}min driving)`);
          } else if (stationarySeconds < 120) {
            this.onStatusUpdate(`Trip: Stationary ${stationarySeconds}s (${drivingMinutes}min driving)`);
          } else {
            const minutes = Math.floor(stationarySeconds / 60);
            const seconds = stationarySeconds % 60;
            this.onStatusUpdate(`Trip: ${minutes}m ${seconds}s stationary (${drivingMinutes}min driving)`);
          }
        } else {
          if (this.isGPSPaused) {
            this.isGPSPaused = false;
            this.onStatusUpdate(`🚗 Trip resumed - Movement detected!`);
          }
          
          this.stationaryCount = 0;
          this.extendPromptShown = false;
          
          const distance = this.calculateTripDistance();
          const { drivingMinutes } = this.getCurrentTripMetrics(timestamp);
          this.onStatusUpdate(`Trip: ${speed.toFixed(1)}mph • ${distance.toFixed(1)}mi • ${drivingMinutes}min`);
        }
        break;
    }
  }

  extendCurrentTrip() {
    this.userExtendedTrip = true;
    this.extendPromptShown = true;
    this.onStatusUpdate('Trip extended by user - Continuing tracking');
  }

  forceEndTrip() {
    if (this.currentTrip && this.lastPosition) {
      this.endTrip(this.lastPosition.latitude, this.lastPosition.longitude, Date.now());
    }
  }

  trackMovementTime(speed, timestamp) {
    const isMoving = speed >= 2;
    
    if (isMoving) {
      if (this.currentStationaryStart !== null) {
        const stationaryDuration = timestamp - this.currentStationaryStart;
        this.totalStationaryTime += stationaryDuration;
        this.stationaryPeriods.push({
          start: this.currentStationaryStart,
          end: timestamp,
          duration: stationaryDuration
        });
        this.currentStationaryStart = null;
      }
      
      if (this.lastMovementTime === null) {
        this.lastMovementTime = timestamp;
      }
    } else {
      if (this.currentStationaryStart === null) {
        this.currentStationaryStart = timestamp;
        
        if (this.lastMovementTime !== null) {
          const drivingDuration = timestamp - this.lastMovementTime;
          this.drivingPeriods.push({
            start: this.lastMovementTime,
            end: timestamp,
            duration: drivingDuration
          });
          this.lastMovementTime = null;
        }
      }
    }
  }

  getCurrentTripMetrics(currentTimestamp) {
    if (!this.tripStartTime) return { totalMinutes: 0, drivingMinutes: 0, stationaryMinutes: 0 };
    
    const totalTripTime = currentTimestamp - this.tripStartTime;
    let currentStationaryTime = this.totalStationaryTime;
    
    if (this.currentStationaryStart !== null) {
      currentStationaryTime += (currentTimestamp - this.currentStationaryStart);
    }
    
    const drivingTime = totalTripTime - currentStationaryTime;
    
    return {
      totalMinutes: Math.floor(totalTripTime / 60000),
      drivingMinutes: Math.floor(drivingTime / 60000),
      stationaryMinutes: Math.floor(currentStationaryTime / 60000)
    };
  }

  startTrip(latitude, longitude, speed, timestamp) {
    this.currentTrip = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      startLatitude: latitude,
      startLongitude: longitude,
      startLocation: 'GPS Location',
      category: 'Business',
      autoDetected: true
    };
    
    this.tripPath = [{ latitude, longitude, timestamp, speed, accuracy: 0 }];
    this.isGPSPaused = false;
    this.userExtendedTrip = false;
    this.extendPromptShown = false;
    
    this.tripStartTime = timestamp;
    this.totalStationaryTime = 0;
    this.currentStationaryStart = null;
    this.stationaryPeriods = [];
    this.drivingPeriods = [];
    this.lastMovementTime = timestamp;
    
    this.onTripStart(this.currentTrip);
    this.onStatusUpdate(`🚗 TRIP STARTED at ${speed.toFixed(1)}mph - Complete management active!`);
  }

  endTrip(latitude, longitude, timestamp) {
    if (!this.currentTrip) return;

    this.trackMovementTime(0, timestamp);
    
    const distance = this.calculateTripDistance();
    const { totalMinutes, drivingMinutes, stationaryMinutes } = this.getCurrentTripMetrics(timestamp);

    if (distance > 0.2) {
      const completedTrip = {
        ...this.currentTrip,
        endTime: new Date().toISOString(),
        endLatitude: latitude,
        endLongitude: longitude,
        endLocation: 'GPS Location',
        distance: distance,
        totalDuration: totalMinutes,
        drivingDuration: drivingMinutes,
        stationaryDuration: stationaryMinutes,
        stationaryPeriods: this.stationaryPeriods,
        drivingPeriods: this.drivingPeriods,
        userExtended: this.userExtendedTrip,
        purpose: `Auto: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving`,
        date: new Date().toISOString(),
        path: [...this.tripPath]
      };

      this.onTripEnd(completedTrip);
      
      if (stationaryMinutes > 0) {
        this.onStatusUpdate(`✅ Trip saved: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving (${totalMinutes}min total, ${stationaryMinutes}min stationary)`);
      } else {
        this.onStatusUpdate(`✅ Trip saved: ${distance.toFixed(1)}mi in ${drivingMinutes}min driving`);
      }
    } else {
      this.onStatusUpdate(`Short trip discarded - Resuming monitoring`);
    }

    this.currentTrip = null;
    this.tripPath = [];
    this.resetTracking();
  }

  calculateTripDistance() {
    if (!this.tripPath || this.tripPath.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 1; i < this.tripPath.length; i++) {
      const prev = this.tripPath[i - 1];
      const curr = this.tripPath[i];
      
      const segmentDistance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      if (segmentDistance > 1 && segmentDistance < 500) {
        totalDistance += segmentDistance;
      }
    }
    
    return totalDistance * 0.000621371;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// MAIN APP COMPONENT with Complete Trip Management
export default function App() {
  console.log('BUILD77 COMPLETE TRIP MANAGEMENT - v1.0 - Merge + Split + User Choice');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing GPS...');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const [selectedTripsForMerge, setSelectedTripsForMerge] = useState([]);
  const [tripToSplit, setTripToSplit] = useState(null);
  const [splitPoint, setSplitPoint] = useState(50); // Percentage split point
  
  const gpsService = useRef(null);
  
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: '',
    category: 'Business'
  });

  const [splitFormData, setSplitFormData] = useState({
    firstLocation: '',
    firstPurpose: '',
    firstCategory: 'Business',
    secondLocation: '',
    secondPurpose: '',
    secondCategory: 'Business'
  });

  const categories = [
    { key: 'Business', rate: 0.70, color: '#4CAF50' },
    { key: 'Medical', rate: 0.21, color: '#2196F3' },
    { key: 'Charity', rate: 0.14, color: '#FF9800' },
    { key: 'Personal', rate: 0.00, color: '#9E9E9E' }
  ];

  const colors = {
    primary: '#667eea',
    surface: '#ffffff',
    background: '#f8f9ff',
    text: '#2d3748',
    textSecondary: '#718096'
  };

  useEffect(() => {
    loadSampleTrips();
    initializeGPS();
    
    return () => {
      if (gpsService.current) {
        gpsService.current.stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    if (gpsService.current) {
      if (autoMode) {
        gpsService.current.startMonitoring();
      } else {
        gpsService.current.stopMonitoring();
        setGpsStatus('Manual mode - Auto-detection disabled');
      }
    }
  }, [autoMode]);

  const initializeGPS = () => {
    gpsService.current = new CompleteTripGPSService(
      (trip) => {
        setCurrentTrip(trip);
        setIsTracking(true);
      },
      (completedTrip) => {
        setTrips(prevTrips => {
          const newTrips = [completedTrip, ...prevTrips];
          saveTrips(newTrips);
          return newTrips;
        });
        setCurrentTrip(null);
        setIsTracking(false);
      },
      (status) => {
        setGpsStatus(status);
      },
      (location) => {
        setCurrentLocation(location);
      },
      (type, seconds, drivingMinutes) => {
        setShowExtendPrompt(true);
      }
    );
  };

  const loadSampleTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        const sampleTrips = [
          {
            id: '1',
            startLocation: 'Home Office',
            endLocation: 'Client Meeting → Lunch → Return',
            distance: 25.8,
            drivingDuration: 35,
            totalDuration: 45,
            stationaryDuration: 10,
            purpose: 'Multi-stop business trip (good candidate for splitting)',
            category: 'Business',
            date: new Date(Date.now() - 86400000).toISOString(),
            autoDetected: true
          },
          {
            id: '2',
            startLocation: 'Downtown Office',
            endLocation: 'Airport Terminal',
            distance: 18.2,
            drivingDuration: 28,
            totalDuration: 28,
            stationaryDuration: 0,
            purpose: 'Business travel to airport',
            category: 'Business',
            date: new Date(Date.now() - 82800000).toISOString(),
            autoDetected: true
          }
        ];
        setTrips(sampleTrips);
        await saveTrips(sampleTrips);
      }
    } catch (error) {
      console.log('Error loading trips:', error);
    }
  };

  const saveTrips = async (tripsToSave) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(tripsToSave));
    } catch (error) {
      console.log('Error saving trips:', error);
    }
  };

  const handleExtendTrip = () => {
    if (gpsService.current) {
      gpsService.current.extendCurrentTrip();
    }
    setShowExtendPrompt(false);
  };

  const handleDontExtend = () => {
    setShowExtendPrompt(false);
  };

  const handleManualTripEnd = () => {
    Alert.alert(
      'End Current Trip?',
      'This will save the current trip immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Now', 
          onPress: () => {
            if (gpsService.current) {
              gpsService.current.forceEndTrip();
            }
          }
        }
      ]
    );
  };

  const handleMergeTrips = () => {
    if (selectedTripsForMerge.length < 2) {
      Alert.alert('Select Trips', 'Please select at least 2 trips to merge');
      return;
    }

    Alert.alert(
      'Merge Trips',
      `Merge ${selectedTripsForMerge.length} selected trips into one trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', onPress: () => mergeSelectedTrips() }
      ]
    );
  };

  const mergeSelectedTrips = async () => {
    const tripsToMerge = trips.filter(trip => selectedTripsForMerge.includes(trip.id));
    tripsToMerge.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstTrip = tripsToMerge[0];
    const lastTrip = tripsToMerge[tripsToMerge.length - 1];

    const mergedTrip = {
      id: Date.now().toString(),
      startLocation: firstTrip.startLocation,
      endLocation: lastTrip.endLocation,
      distance: tripsToMerge.reduce((sum, trip) => sum + trip.distance, 0),
      drivingDuration: tripsToMerge.reduce((sum, trip) => sum + (trip.drivingDuration || 0), 0),
      totalDuration: tripsToMerge.reduce((sum, trip) => sum + (trip.totalDuration || trip.drivingDuration || 0), 0),
      stationaryDuration: tripsToMerge.reduce((sum, trip) => sum + (trip.stationaryDuration || 0), 0),
      purpose: `Merged trip: ${firstTrip.startLocation} to ${lastTrip.endLocation}`,
      category: firstTrip.category,
      date: firstTrip.date,
      autoDetected: false,
      mergedFrom: selectedTripsForMerge.length
    };

    const updatedTrips = trips.filter(trip => !selectedTripsForMerge.includes(trip.id));
    updatedTrips.unshift(mergedTrip);
    
    setTrips(updatedTrips);
    await saveTrips(updatedTrips);
    
    setSelectedTripsForMerge([]);
    setMergeModalVisible(false);
    
    Alert.alert('Success', `${tripsToMerge.length} trips merged successfully`);
  };

  const handleSplitTrip = (trip) => {
    setTripToSplit(trip);
    setSplitPoint(50);
    setSplitFormData({
      firstLocation: `${trip.startLocation} → Stop`,
      firstPurpose: 'First part of trip',
      firstCategory: trip.category,
      secondLocation: `Stop → ${trip.endLocation}`,
      secondPurpose: 'Second part of trip',
      secondCategory: trip.category
    });
    setSplitModalVisible(true);
  };

  const confirmSplitTrip = async () => {
    if (!tripToSplit || !splitFormData.firstLocation || !splitFormData.secondLocation) {
      Alert.alert('Missing Information', 'Please fill in all location fields');
      return;
    }

    const firstDistance = (tripToSplit.distance * splitPoint) / 100;
    const secondDistance = tripToSplit.distance - firstDistance;
    
    const firstDuration = tripToSplit.drivingDuration ? Math.floor((tripToSplit.drivingDuration * splitPoint) / 100) : null;
    const secondDuration = tripToSplit.drivingDuration ? tripToSplit.drivingDuration - firstDuration : null;

    const firstTrip = {
      id: Date.now().toString() + '_1',
      startLocation: tripToSplit.startLocation,
      endLocation: splitFormData.firstLocation.split(' → ')[1] || 'Intermediate Stop',
      distance: firstDistance,
      drivingDuration: firstDuration,
      totalDuration: firstDuration,
      stationaryDuration: 0,
      purpose: splitFormData.firstPurpose,
      category: splitFormData.firstCategory,
      date: tripToSplit.date,
      autoDetected: false,
      splitFrom: tripToSplit.id
    };

    const secondTrip = {
      id: Date.now().toString() + '_2',
      startLocation: splitFormData.secondLocation.split(' → ')[0] || 'Intermediate Stop',
      endLocation: tripToSplit.endLocation,
      distance: secondDistance,
      drivingDuration: secondDuration,
      totalDuration: secondDuration,
      stationaryDuration: 0,
      purpose: splitFormData.secondPurpose,
      category: splitFormData.secondCategory,
      date: new Date(new Date(tripToSplit.date).getTime() + 60000).toISOString(), // 1 minute later
      autoDetected: false,
      splitFrom: tripToSplit.id
    };

    const updatedTrips = trips.filter(trip => trip.id !== tripToSplit.id);
    updatedTrips.unshift(secondTrip, firstTrip);
    
    setTrips(updatedTrips);
    await saveTrips(updatedTrips);
    
    setSplitModalVisible(false);
    setTripToSplit(null);
    
    Alert.alert('Success', 'Trip split successfully into 2 separate trips');
  };

  const addTrip = async () => {
    if (!formData.startLocation || !formData.endLocation || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const newTrip = {
      id: Date.now().toString(),
      ...formData,
      distance: parseFloat(formData.distance),
      date: new Date().toISOString(),
      autoDetected: false
    };

    const updatedTrips = [newTrip, ...trips];
    setTrips(updatedTrips);
    await saveTrips(updatedTrips);
    
    setModalVisible(false);
    setFormData({
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: '',
      category: 'Business'
    });
    
    Alert.alert('Success', 'Trip added successfully');
  };

  const calculateTotals = () => {
    const totalTrips = trips.length;
    const autoTrips = trips.filter(trip => trip.autoDetected).length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDrivingTime = trips.reduce((sum, trip) => sum + (trip.drivingDuration || 0), 0);
    const totalDeduction = trips.reduce((sum, trip) => {
      const category = categories.find(cat => cat.key === trip.category);
      const rate = category ? category.rate : 0;
      return sum + (trip.distance * rate);
    }, 0);
    
    return { totalTrips, autoTrips, totalMiles, totalDrivingTime, totalDeduction };
  };

  const renderDashboard = () => {
    const { totalTrips, autoTrips, totalMiles, totalDrivingTime, totalDeduction } = calculateTotals();
    
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>MileTracker Pro</Text>
            <Text style={[styles.headerSubtitle, { color: colors.surface }]}>Complete Trip Management</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Professional Trip Control</Text>
          <Text style={[styles.gpsStatus, { color: colors.primary }]}>{gpsStatus}</Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationInfo, { color: colors.textSecondary }]}>
                Speed: {currentLocation.speed?.toFixed(1) || '0.0'} mph • Accuracy: {currentLocation.accuracy?.toFixed(0) || '--'}m
              </Text>
            </View>
          )}
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Smart Auto-Detection (3min prompt, 5min auto-end)</Text>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          
          {isTracking && (
            <TouchableOpacity 
              style={[styles.trackingAlert, { backgroundColor: colors.primary }]}
              onPress={handleManualTripEnd}
            >
              <Text style={[styles.trackingText, { color: colors.surface }]}>
                🚗 Trip Active • Smart timeout with user prompts • Tap to end now
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.featureCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Complete Management Features</Text>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              • Extend Trip: User choice for traffic situations{'\n'}
              • Merge Trips: Combine split journeys (traffic delays){'\n'}
              • Split Trips: Divide multi-purpose trips manually{'\n'}
              • Time Tracking: Driving vs stationary with deduction
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>June 2025 Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalTrips}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{autoTrips}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Auto</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalMiles.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalDrivingTime}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Min</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>${totalDeduction.toFixed(0)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>IRS</Text>
            </View>
          </View>
        </View>

        {showExtendPrompt && (
          <View style={[styles.promptCard, { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }]}>
            <Text style={[styles.promptTitle, { color: '#856404' }]}>Extend Trip?</Text>
            <Text style={[styles.promptText, { color: '#856404' }]}>
              Stationary for 3 minutes. Are you in traffic or parked?
            </Text>
            <View style={styles.promptButtons}>
              <TouchableOpacity 
                style={[styles.promptButton, { backgroundColor: colors.primary }]}
                onPress={handleExtendTrip}
              >
                <Text style={[styles.promptButtonText, { color: colors.surface }]}>Extend Trip (Traffic)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.promptButton, { backgroundColor: colors.textSecondary }]}
                onPress={handleDontExtend}
              >
                <Text style={[styles.promptButtonText, { color: colors.surface }]}>End Trip (Parked)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderTrips = () => {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerWithButton}>
            <Text style={[styles.headerTitle, { color: colors.surface }]}>Trip Management</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.headerButton, { marginRight: 8 }]}
                onPress={() => setMergeModalVisible(true)}
              >
                <Text style={[styles.headerButtonText, { color: colors.surface }]}>Merge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[styles.headerButtonText, { color: colors.surface }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.tripCard, { backgroundColor: colors.surface }]}>
              <View style={styles.tripHeader}>
                <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <View style={styles.tripTags}>
                  {item.autoDetected && (
                    <View style={[styles.autoTag, { marginRight: 5 }]}>
                      <Text style={styles.autoTagText}>AUTO</Text>
                    </View>
                  )}
                  {item.mergedFrom && (
                    <View style={[styles.mergedTag, { marginRight: 5 }]}>
                      <Text style={styles.mergedTagText}>MERGED({item.mergedFrom})</Text>
                    </View>
                  )}
                  {item.splitFrom && (
                    <View style={[styles.splitTag]}>
                      <Text style={styles.splitTagText}>SPLIT</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <Text style={[styles.tripRoute, { color: colors.text }]}>
                {item.startLocation} → {item.endLocation}
              </Text>
              
              <View style={styles.tripDetails}>
                <Text style={[styles.tripDistance, { color: colors.primary }]}>
                  {item.distance.toFixed(1)} mi
                </Text>
                <Text style={[styles.tripCategory, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </View>

              {item.drivingDuration && (
                <View style={styles.timeDetails}>
                  {item.stationaryDuration > 0 ? (
                    <Text style={[styles.timeInfo, { color: colors.textSecondary }]}>
                      {item.drivingDuration}min driving ({item.totalDuration}min total, {item.stationaryDuration}min stopped)
                    </Text>
                  ) : (
                    <Text style={[styles.timeInfo, { color: colors.textSecondary }]}>
                      {item.drivingDuration}min driving
                    </Text>
                  )}
                </View>
              )}
              
              <Text style={[styles.tripPurpose, { color: colors.textSecondary }]}>
                {item.purpose}
              </Text>

              {/* SPLIT TRIP BUTTON */}
              <TouchableOpacity 
                style={[styles.splitButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSplitTrip(item)}
              >
                <Text style={[styles.splitButtonText, { color: colors.surface }]}>
                  ✂️ Split Trip
                </Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.tripsList}
        />
      </View>
    );
  };

  const renderBottomNav = () => (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'dashboard' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('dashboard')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'dashboard' ? colors.surface : colors.textSecondary }]}>🏠</Text>
        <Text style={[styles.navLabel, { color: currentView === 'dashboard' ? colors.surface : colors.textSecondary }]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'trips' && { backgroundColor: colors.primary }]}
        onPress={() => setCurrentView('trips')}
      >
        <Text style={[styles.navIcon, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>🚗</Text>
        <Text style={[styles.navLabel, { color: currentView === 'trips' ? colors.surface : colors.textSecondary }]}>Trips</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSplitModal = () => (
    <Modal visible={splitModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '80%' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Split Trip</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Split into 2 trips with different purposes/categories
          </Text>
          
          <ScrollView style={styles.splitForm}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Split Point: {splitPoint}% / {100 - splitPoint}%
            </Text>
            <Text style={[styles.splitDistanceText, { color: colors.textSecondary }]}>
              {tripToSplit ? `${((tripToSplit.distance * splitPoint) / 100).toFixed(1)}mi + ${(tripToSplit.distance * (100 - splitPoint) / 100).toFixed(1)}mi` : ''}
            </Text>
            
            <View style={styles.sliderContainer}>
              <TouchableOpacity 
                style={[styles.sliderButton, splitPoint > 10 && { backgroundColor: colors.primary }]}
                onPress={() => setSplitPoint(Math.max(10, splitPoint - 10))}
              >
                <Text style={[styles.sliderButtonText, { color: splitPoint > 10 ? colors.surface : colors.textSecondary }]}>-10%</Text>
              </TouchableOpacity>
              <Text style={[styles.sliderValue, { color: colors.primary }]}>{splitPoint}%</Text>
              <TouchableOpacity 
                style={[styles.sliderButton, splitPoint < 90 && { backgroundColor: colors.primary }]}
                onPress={() => setSplitPoint(Math.min(90, splitPoint + 10))}
              >
                <Text style={[styles.sliderButtonText, { color: splitPoint < 90 ? colors.surface : colors.textSecondary }]}>+10%</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>First Trip ({splitPoint}%)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="End location for first trip"
              placeholderTextColor={colors.textSecondary}
              value={splitFormData.firstLocation}
              onChangeText={(text) => setSplitFormData({...splitFormData, firstLocation: text})}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Purpose of first trip"
              placeholderTextColor={colors.textSecondary}
              value={splitFormData.firstPurpose}
              onChangeText={(text) => setSplitFormData({...splitFormData, firstPurpose: text})}
            />
            <View style={styles.categorySelector}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: category.color },
                    splitFormData.firstCategory === category.key && { borderWidth: 2, borderColor: colors.text }
                  ]}
                  onPress={() => setSplitFormData({...splitFormData, firstCategory: category.key})}
                >
                  <Text style={styles.categoryChipText}>{category.key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Second Trip ({100 - splitPoint}%)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Start location for second trip"
              placeholderTextColor={colors.textSecondary}
              value={splitFormData.secondLocation}
              onChangeText={(text) => setSplitFormData({...splitFormData, secondLocation: text})}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Purpose of second trip"
              placeholderTextColor={colors.textSecondary}
              value={splitFormData.secondPurpose}
              onChangeText={(text) => setSplitFormData({...splitFormData, secondPurpose: text})}
            />
            <View style={styles.categorySelector}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: category.color },
                    splitFormData.secondCategory === category.key && { borderWidth: 2, borderColor: colors.text }
                  ]}
                  onPress={() => setSplitFormData({...splitFormData, secondCategory: category.key})}
                >
                  <Text style={styles.categoryChipText}>{category.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setSplitModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={confirmSplitTrip}
            >
              <Text style={styles.saveButtonText}>Split Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMergeModal = () => (
    <Modal visible={mergeModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '80%' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Merge Trips</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Select trips to merge (for split journeys due to traffic delays)
          </Text>
          
          <ScrollView style={styles.mergeList}>
            {trips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={[
                  styles.mergeItem,
                  { borderColor: colors.primary },
                  selectedTripsForMerge.includes(trip.id) && { backgroundColor: colors.background }
                ]}
                onPress={() => {
                  if (selectedTripsForMerge.includes(trip.id)) {
                    setSelectedTripsForMerge(prev => prev.filter(id => id !== trip.id));
                  } else {
                    setSelectedTripsForMerge(prev => [...prev, trip.id]);
                  }
                }}
              >
                <View style={styles.mergeItemHeader}>
                  <Text style={[styles.mergeItemDate, { color: colors.textSecondary }]}>
                    {new Date(trip.date).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.mergeItemDistance, { color: colors.primary }]}>
                    {trip.distance.toFixed(1)} mi
                  </Text>
                </View>
                <Text style={[styles.mergeItemRoute, { color: colors.text }]}>
                  {trip.startLocation} → {trip.endLocation}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => {
                setMergeModalVisible(false);
                setSelectedTripsForMerge([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleMergeTrips}
            >
              <Text style={styles.saveButtonText}>Merge ({selectedTripsForMerge.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddTripModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Manual Trip</Text>
          
          <ScrollView style={styles.modalForm}>
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Start Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.startLocation}
              onChangeText={(text) => setFormData({...formData, startLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="End Location"
              placeholderTextColor={colors.textSecondary}
              value={formData.endLocation}
              onChangeText={(text) => setFormData({...formData, endLocation: text})}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Distance (miles)"
              placeholderTextColor={colors.textSecondary}
              value={formData.distance}
              onChangeText={(text) => setFormData({...formData, distance: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              placeholder="Purpose (optional)"
              placeholderTextColor={colors.textSecondary}
              value={formData.purpose}
              onChangeText={(text) => setFormData({...formData, purpose: text})}
              multiline
            />
            
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.categorySelector}>
              {categories.map((category) => (
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
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: colors.textSecondary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={addTrip}
              >
                <Text style={styles.saveButtonText}>Add Trip</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.app}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}
      
      {renderBottomNav()}
      {renderAddTripModal()}
      {renderMergeModal()}
      {renderSplitModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  headerWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  headerSubtitle: { fontSize: 12, opacity: 0.9, marginTop: 4, textAlign: 'center' },
  headerButtons: { flexDirection: 'row' },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerButtonText: { fontSize: 14, fontWeight: 'bold' },
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  gpsStatus: { fontSize: 16, marginBottom: 10, fontWeight: '600' },
  locationContainer: { marginBottom: 15 },
  locationInfo: { fontSize: 14, marginBottom: 5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingRight: 5 },
  toggleLabel: { fontSize: 11, flex: 1, marginRight: 10 },
  trackingAlert: { 
    padding: 12, 
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15
  },
  trackingText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 16 },
  featureCard: {
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  featureText: { fontSize: 11, lineHeight: 16 },
  promptCard: {
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  promptTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  promptText: { fontSize: 14, marginBottom: 15 },
  promptButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  promptButton: { flex: 1, padding: 10, borderRadius: 8, marginHorizontal: 5 },
  promptButtonText: { textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 10, marginTop: 4 },
  tripsList: { padding: 20 },
  tripCard: { padding: 15, marginBottom: 15, borderRadius: 12, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripDate: { fontSize: 14 },
  tripTags: { flexDirection: 'row' },
  autoTag: { backgroundColor: '#00a86b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  autoTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  mergedTag: { backgroundColor: '#6c5ce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  mergedTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  splitTag: { backgroundColor: '#fd79a8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  splitTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  tripRoute: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tripDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripDistance: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  tripCategory: { fontSize: 14, marginRight: 15 },
  timeDetails: { marginBottom: 8 },
  timeInfo: { fontSize: 12, fontStyle: 'italic' },
  tripPurpose: { fontSize: 14, fontStyle: 'italic', marginBottom: 10 },
  splitButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  splitButtonText: { fontSize: 12, fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  modalForm: { maxHeight: 400 },
  splitForm: { flex: 1, marginBottom: 20 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sliderButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 10,
    backgroundColor: '#e0e0e0',
  },
  sliderButtonText: { fontSize: 14, fontWeight: 'bold' },
  sliderValue: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
  splitDistanceText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  mergeList: { flex: 1, marginBottom: 20 },
  mergeItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  mergeItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  mergeItemDate: { fontSize: 12 },
  mergeItemDistance: { fontSize: 12, fontWeight: 'bold' },
  mergeItemRoute: { fontSize: 14, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  categoryChipText: { color: 'white', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, marginRight: 10 },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, marginLeft: 10 },
  cancelButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
