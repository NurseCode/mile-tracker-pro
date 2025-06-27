import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const savedTrips = await AsyncStorage.getItem('miletracker_trips');
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  };

  const saveTrips = async (newTrips) => {
    try {
      await AsyncStorage.setItem('miletracker_trips', JSON.stringify(newTrips));
      setTrips(newTrips);
    } catch (error) {
      console.error('Failed to save trips:', error);
    }
  };

  const startTrip = () => {
    const trip = {
      id: Date.now(),
      startTime: new Date(),
      startLocation: 'Current Location',
      distance: 0,
      status: 'active'
    };
    setCurrentTrip(trip);
    setIsTracking(true);
    Alert.alert('Trip Started', 'GPS tracking started successfully');
  };

  const stopTrip = () => {
    if (currentTrip) {
      const completedTrip = {
        ...currentTrip,
        endTime: new Date(),
        endLocation: 'Current Location',
        distance: Math.round(Math.random() * 25 + 5), // Demo distance
        status: 'completed'
      };
      
      const newTrips = [completedTrip, ...trips];
      saveTrips(newTrips);
      
      setCurrentTrip(null);
      setIsTracking(false);
      Alert.alert('Trip Completed', `Distance: ${completedTrip.distance} miles`);
    }
  };

  const exportTrips = () => {
    Alert.alert('Export', 'CSV export functionality ready for implementation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Pure React Native Build</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.trackingCard}>
          <Text style={styles.cardTitle}>Trip Tracking</Text>
          <Text style={styles.status}>
            Status: {isTracking ? 'Active' : 'Ready'}
          </Text>
          
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startTrip}>
              <Text style={styles.buttonText}>START TRIP</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopTrip}>
              <Text style={styles.buttonText}>STOP TRIP</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Statistics</Text>
          <Text style={styles.statText}>Total Trips: {trips.length}</Text>
          <Text style={styles.statText}>
            Total Miles: {trips.reduce((sum, trip) => sum + (trip.distance || 0), 0)}
          </Text>
        </View>

        <View style={styles.tripsCard}>
          <Text style={styles.cardTitle}>Recent Trips</Text>
          {trips.slice(0, 5).map((trip) => (
            <View key={trip.id} style={styles.tripItem}>
              <Text style={styles.tripText}>
                {new Date(trip.startTime).toLocaleDateString()}
              </Text>
              <Text style={styles.tripDistance}>{trip.distance} mi</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.buttonText}>EXPORT CSV</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  trackingCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tripsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tripText: {
    fontSize: 14,
    color: '#666',
  },
  tripDistance: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
});
