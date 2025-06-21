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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  console.log('MILETRACKER PRO - GPS ENABLED v2.0 - PHASE 2 BUILD');
  
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

  // Subscription management
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
        Alert.alert('Permission Required', 'Location permission is needed for GPS tracking');
      }
    } catch (error) {
      console.log('Permission error:', error);
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
        distance: 8.2,
        category: 'Medical',
        duration: 18,
        cost: 1.72,
      },
      {
        id: '3',
        date: '2025-06-18',
        startLocation: 'Home',
        endLocation: 'Charity Event',
        distance: 15.8,
        category: 'Charity',
        duration: 32,
        cost: 2.21,
      }
    ];
    setTrips(sampleTrips);
  };

  const startTrip = async () => {
    try {
      setIsTracking(true);
      let location = await Location.getCurrentPositionAsync({});
      
      const newTrip = {
        id: Date.now().toString(),
        startTime: new Date(),
        startLocation: `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        startCoords: location.coords,
        category: 'Business'
      };
      
      setCurrentTrip(newTrip);
      Alert.alert('Trip Started', 'GPS tracking is now active');
    } catch (error) {
      Alert.alert('Error', 'Could not start GPS tracking');
      setIsTracking(false);
    }
  };

  const stopTrip = async () => {
    if (!currentTrip) return;
    
    try {
      let location = await Location.getCurrentPositionAsync({});
      
      const distance = calculateDistance(
        currentTrip.startCoords.latitude,
        currentTrip.startCoords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );
      
      const completedTrip = {
        ...currentTrip,
        endTime: new Date(),
        endLocation: `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        endCoords: location.coords,
        distance: distance,
        duration: Math.round((new Date() - currentTrip.startTime) / 60000),
        cost: distance * 0.70, // Business rate
        date: new Date().toISOString().split('T')[0]
      };
      
      setTrips(prev => [completedTrip, ...prev]);
      setCurrentTrip(null);
      setIsTracking(false);
      
      Alert.alert('Trip Completed', `Distance: ${distance.toFixed(1)} miles`);
    } catch (error) {
      Alert.alert('Error', 'Could not complete trip');
    }
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

  const exportTrips = async () => {
    try {
      const csvContent = generateCSV();
      const fileUri = FileSystem.documentDirectory + 'miletracker_export.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro Export',
          body: 'Please find your trip data attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      Alert.alert('Export Error', 'Could not export trips');
    }
  };

  const generateCSV = () => {
    let csv = 'Date,Start Location,End Location,Distance (mi),Category,Duration (min),Deduction\n';
    trips.forEach(trip => {
      csv += `${trip.date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.category},${trip.duration},$${trip.cost.toFixed(2)}\n`;
    });
    return csv;
  };

  const addManualTrip = () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const distance = parseFloat(newTrip.distance);
    const rates = { Business: 0.70, Medical: 0.21, Charity: 0.14 };
    
    const trip = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: distance,
      category: newTrip.category,
      duration: Math.round(distance * 2), // Estimate 2 min per mile
      cost: distance * rates[newTrip.category],
    };

    setTrips(prev => [trip, ...prev]);
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    Alert.alert('Success', 'Trip added successfully');
  };

  const renderDashboard = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional Mileage Tracking - $4.99/month</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{trips.length}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{trips.reduce((sum, trip) => sum + trip.distance, 0).toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Mi</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${trips.reduce((sum, trip) => sum + trip.cost, 0).toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Saved</Text>
          </View>
        </View>
      </View>

      <View style={styles.trackingCard}>
        <Text style={styles.cardTitle}>Trip Tracking</Text>
        {isTracking ? (
          <View>
            <Text style={styles.trackingStatus}>🟢 Currently Tracking</Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopTrip}>
              <Text style={styles.buttonText}>STOP TRIP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={startTrip}>
            <Text style={styles.buttonText}>🚗 START TRIP NOW</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.manualButton} onPress={() => setShowAddTrip(true)}>
        <Text style={styles.buttonText}>+ Add Manual Trip</Text>
      </TouchableOpacity>

      <View style={styles.subscriptionCard}>
        <Text style={styles.cardTitle}>Subscription Status</Text>
        <Text style={styles.subscriptionText}>Free Plan: {monthlyTripCount}/40 trips this month</Text>
        <Text style={styles.upgradeText}>Upgrade to Premium for unlimited tracking</Text>
      </View>
    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Trips</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <Text style={styles.tripCost}>${trip.cost.toFixed(2)}</Text>
          </View>
          <Text style={styles.tripRoute}>{trip.startLocation} → {trip.endLocation}</Text>
          <View style={styles.tripDetails}>
            <Text style={styles.tripDistance}>{trip.distance} miles</Text>
            <Text style={styles.tripCategory}>{trip.category}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'dashboard' && styles.activeNavButton]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.activeNavButton]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.activeNavText]}>Trips</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddTrip} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
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
              onChangeText={(text) => setNewTrip(prev => ({...prev, startLocation: text}))}
              placeholder="Enter start location"
            />

            <Text style={styles.inputLabel}>End Location</Text>
            <TextInput
              style={styles.textInput}
              value={newTrip.endLocation}
              onChangeText={(text) => setNewTrip(prev => ({...prev, endLocation: text}))}
              placeholder="Enter end location"
            />

            <Text style={styles.inputLabel}>Distance (miles)</Text>
            <TextInput
              style={styles.textInput}
              value={newTrip.distance}
              onChangeText={(text) => setNewTrip(prev => ({...prev, distance: text}))}
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
                    newTrip.category === category && styles.selectedCategory
                  ]}
                  onPress={() => setNewTrip(prev => ({...prev, category}))}
                >
                  <Text style={[
                    styles.categoryText,
                    newTrip.category === category && styles.selectedCategoryText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addManualTrip}>
              <Text style={styles.buttonText}>Add Trip</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#667eea',
    marginTop: 2,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  trackingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingStatus: {
    fontSize: 16,
    color: '#28a745',
    marginBottom: 12,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#667eea',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  manualButton: {
    backgroundColor: '#28a745',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 80,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  tripRoute: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDistance: {
    fontSize: 14,
    color: '#666',
  },
  tripCategory: {
    fontSize: 14,
    color: '#667eea',
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
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: '#f0f2ff',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  activeNavText: {
    color: '#667eea',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  categoryButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#667eea',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
  },
});
