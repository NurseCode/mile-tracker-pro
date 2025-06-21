import React, { useState } from 'react';
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
  const [trips] = useState([
    {
      id: 1,
      date: '2025-06-21',
      distance: 12.5,
      purpose: 'Business',
      startLocation: 'Home',
      endLocation: 'Office',
      amount: 8.75,
    },
    {
      id: 2,
      date: '2025-06-20',
      distance: 8.2,
      purpose: 'Medical',
      startLocation: 'Home',
      endLocation: 'Hospital',
      amount: 1.72,
    }
  ]);

  const handleNavigation = (view) => {
    console.log('Navigating to:', view);
    setActiveView(view);
  };

  const handleStartTrip = () => {
    Alert.alert('Trip Started', 'GPS tracking would start here');
  };

  const handleExport = () => {
    Alert.alert('Export', 'CSV export would happen here');
  };

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
            <Text style={styles.statNumber}>20.7</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>$10.47</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
        <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
        <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
      </TouchableOpacity>

      <View style={styles.recentTrips}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <Text style={styles.tripDate}>{trip.date}</Text>
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
      
      <View style={styles.tripsContainer}>
        {trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <Text style={styles.tripRoute}>{trip.startLocation} → {trip.endLocation}</Text>
            <Text style={styles.tripDistance}>{trip.distance} miles • ${trip.amount.toFixed(2)}</Text>
            <Text style={styles.tripPurpose}>{trip.purpose}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const ExportView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Data</Text>
      </View>
      
      <View style={styles.exportContainer}>
        <View style={styles.exportCard}>
          <Text style={styles.exportCardTitle}>CSV Export</Text>
          <Text style={styles.exportCardDesc}>Download trip data for tax purposes</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>📧 Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exportCard}>
          <Text style={styles.exportCardTitle}>Trip Summary</Text>
          <Text style={styles.exportCardDesc}>Total trips: {trips.length}</Text>
          <Text style={styles.exportCardDesc}>Total miles: 20.7</Text>
          <Text style={styles.exportCardDesc}>Total deduction: $10.47</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderView = () => {
    if (activeView === 'trips') return <TripsView />;
    if (activeView === 'export') return <ExportView />;
    return <DashboardView />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {renderView()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'dashboard' && styles.navButtonActive]}
          onPress={() => handleNavigation('dashboard')}
        >
          <Text style={[styles.navText, activeView === 'dashboard' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'trips' && styles.navButtonActive]}
          onPress={() => handleNavigation('trips')}
        >
          <Text style={[styles.navText, activeView === 'trips' && styles.navTextActive]}>
            Trips
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'export' && styles.navButtonActive]}
          onPress={() => handleNavigation('export')}
        >
          <Text style={[styles.navText, activeView === 'export' && styles.navTextActive]}>
            Export
          </Text>
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
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
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
    padding: 20,
    paddingTop: 0,
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
  tripDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tripRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tripDistance: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  tripPurpose: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  tripsContainer: {
    padding: 20,
  },
  exportContainer: {
    padding: 20,
  },
  exportCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  exportCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  exportCardDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  exportButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: '#f0f4ff',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  navTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
});
