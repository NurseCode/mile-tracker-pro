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
} from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  console.log('MILETRACKER PRO - GPS v2.0 - CLEAN BUILD');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [newTrip, setNewTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business'
  });

  const [userSubscription, setUserSubscription] = useState('free');
  const [monthlyTripCount, setMonthlyTripCount] = useState(8);

  useEffect(() => {
    initializeSampleData();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS Permission Required', 'Location access needed for automatic trip tracking');
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const initializeSampleData = () => {
    const sampleTrips = [
      {
        id: '1',
        date: '2025-06-20',
        startLocation: 'Home Office',
        endLocation: 'Client Meeting Downtown',
        distance: 12.5,
        category: 'Business',
        duration: 25,
        cost: 8.75,
      },
      {
        id: '2', 
        date: '2025-06-19',
        startLocation: 'Downtown Office',
        endLocation: 'Medical Appointment',
        distance
