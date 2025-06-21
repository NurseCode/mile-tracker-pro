import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [trips, setTrips] = useState([
    {
      id: 1,
      date: '2025-06-21',
      distance: 12.5,
      purpose: 'Business',
      startLocation: 'Home',
      endLocation: 'Office',
      amount: 8.75
    },
    {
      id: 2,
      date: '2025-06-20',
      distance: 8.2,
      purpose: 'Medical',
      startLocation: 'Home',
      endLocation: 'Hospital',
      amount: 1.72
    }
  ]);

  const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalDeduction = trips.reduce((sum, trip) => sum + trip.amount, 0);

  const DashboardView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Professional Mileage Tracking</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>June 2025 Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{trips.length}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalMiles.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>${totalDeduction.toFixed(2)}</Text>
            <Text style={styles.statLabel}>IRS</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={() => Alert.alert('Success', 'Trip tracking would start here')}>
        <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
        <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
      </TouchableOpacity>

      <View style={styles.recentTrips}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{trip.date}</Text>
              <Text style={styles.tripPurpose}>{trip.purpose}</Text>
            </View>
            <Text style={styles.tripRoute}>{trip.startLocation} → {trip.endLocation}</Text>
            <Text style={styles.tripDistance}>{trip.distance} miles • ${trip.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const TripsView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Trips</Text>
      </View>
      
      {trips.map(trip => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <Text style={styles.tripPurpose}>{trip.purpose}</Text>
          </View>
          <Text style={styles.tripRoute}>{trip.startLocation} → {trip.endLocation}</Text>
          <Text style={styles.tripDistance}>{trip.distance} miles • ${trip.amount.toFixed(2)}</Text>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'trips' && <TripsView />}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'dashboard' && styles.navButtonActive]}
          onPress={() => setActiveView('dashboard')}
        >
          <Text style={[styles.navText, activeView === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'trips' && styles.navButtonActive]}
          onPress={() => setActiveView('trips')}
        >
          <Text style={[styles.navText, activeView === 'trips' && styles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => Alert.alert('Export', 'CSV export functionality')}>
          <Text style={styles.navText}>Export</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
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
  startButton: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  startButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  recentTrips: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripPurpose: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  tripRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tripDistance: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonActive: {
    backgroundColor: '#667eea',
  },
  navText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  navTextActive: {
    color: 'white',
  },
});
