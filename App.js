import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [trips, setTrips] = useState([
    {
      id: 1,
      date: '2025-06-21',
      distance: 12.5,
      purpose: 'Business',
      startLocation: 'Home',
      endLocation: 'Office',
      amount: 8.75,
      startTime: '08:00 AM',
      endTime: '08:25 AM'
    },
    {
      id: 2,
      date: '2025-06-20',
      distance: 8.2,
      purpose: 'Medical',
      startLocation: 'Home',
      endLocation: 'Hospital',
      amount: 1.72,
      startTime: '02:00 PM',
      endTime: '02:18 PM'
    }
  ]);

  const [newTrip, setNewTrip] = useState({
    date: new Date().toISOString().split('T')[0],
    distance: '',
    purpose: 'Business',
    startLocation: '',
    endLocation: '',
    notes: ''
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for GPS tracking');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const startTrip = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Please enable location permissions for GPS tracking');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const startLocation = address[0] ? 
        `${address[0].street || ''} ${address[0].city || ''}`.trim() : 
        'Unknown Location';

      setCurrentTrip({
        startTime: new Date(),
        startLocation,
        startCoords: location.coords,
        distance: 0
      });
      
      setIsTracking(true);
      Alert.alert('Trip Started', `Tracking from: ${startLocation}`);
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const stopTrip = async () => {
    if (!currentTrip) return;

    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const endLocation = address[0] ? 
        `${address[0].street || ''} ${address[0].city || ''}`.trim() : 
        'Unknown Location';

      const distance = calculateDistance(
        currentTrip.startCoords.latitude,
        currentTrip.startCoords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      const trip = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        distance: Math.max(0.1, distance),
        purpose: 'Business',
        startLocation: currentTrip.startLocation,
        endLocation,
        amount: Math.max(0.1, distance) * 0.70,
        startTime: currentTrip.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        endTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };

      setTrips(prev => [trip, ...prev]);
      setCurrentTrip(null);
      setIsTracking(false);
      
      Alert.alert('Trip Completed', `Distance: ${trip.distance.toFixed(1)} miles\nDeduction: $${trip.amount.toFixed(2)}`);
    } catch (error) {
      Alert.alert('Error', 'Unable to complete trip');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const addManualTrip = () => {
    if (!newTrip.distance || !newTrip.startLocation || !newTrip.endLocation) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const distance = parseFloat(newTrip.distance);
    const rates = { Business: 0.70, Medical: 0.21, Charity: 0.14 };
    const amount = distance * (rates[newTrip.purpose] || 0.70);

    const trip = {
      id: Date.now(),
      date: newTrip.date,
      distance,
      purpose: newTrip.purpose,
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      amount,
      startTime: 'Manual',
      endTime: 'Entry',
      notes: newTrip.notes
    };

    setTrips(prev => [trip, ...prev]);
    setNewTrip({
      date: new Date().toISOString().split('T')[0],
      distance: '',
      purpose: 'Business',
      startLocation: '',
      endLocation: '',
      notes: ''
    });
    setShowAddTrip(false);
    Alert.alert('Success', 'Trip added successfully');
  };

  const exportTrips = async () => {
    try {
      const csvContent = generateCSV();
      const fileUri = FileSystem.documentDirectory + 'miletracker_export.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject: 'MileTracker Pro Export',
          body: 'Your mileage tracking report is attached.',
          attachments: [fileUri]
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      Alert.alert('Export Error', 'Unable to export trips');
    }
  };

  const generateCSV = () => {
    const headers = 'Date,Start Location,End Location,Miles,Purpose,Deduction,Start Time,End Time,Notes\n';
    const rows = trips.map(trip => 
      `${trip.date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.purpose},$${trip.amount.toFixed(2)},${trip.startTime},${trip.endTime},"${trip.notes || ''}"`
    ).join('\n');
    
    const totals = `\nTOTALS,,${trips.reduce((sum, trip) => sum + trip.distance, 0).toFixed(1)} miles,,$${trips.reduce((sum, trip) => sum + trip.amount, 0).toFixed(2)}`;
    
    return headers + rows + totals;
  };

  const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalDeduction = trips.reduce((sum, trip) => sum + trip.amount, 0);

  const DashboardView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>Professional Mileage Tracking - $4.99/month</Text>
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
            <Text style={styles.statLabel}>Mi</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>${totalDeduction.toFixed(2)}</Text>
            <Text style={styles.statLabel}>IRS</Text>
          </View>
        </View>
        <Text style={styles.irsExplanation}>
          IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi) + Charity trips ($0.14/mi)
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.startButton, isTracking && styles.stopButton]} 
        onPress={isTracking ? stopTrip : startTrip}
      >
        <Text style={styles.startButtonText}>
          {isTracking ? '🛑 STOP TRIP' : '🚗 START TRIP NOW'}
        </Text>
        <Text style={styles.startButtonSubtext}>
          {isTracking ? 'GPS tracking active' : 'Instant tracking control'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.manualButton} onPress={() => setShowAddTrip(true)}>
        <Text style={styles.manualButtonText}>➕ Add Manual Trip</Text>
      </TouchableOpacity>

      <View style={styles.recentTrips}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {trips.slice(0, 3).map(trip => (
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
        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.exportButtonText}>📧 Export CSV</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tripsContainer}>
        {trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{trip.date}</Text>
              <Text style={styles.tripPurpose}>{trip.purpose}</Text>
            </View>
            <Text style={styles.tripRoute}>{trip.startLocation} → {trip.endLocation}</Text>
            <Text style={styles.tripDistance}>{trip.distance} miles • ${trip.amount.toFixed(2)}</Text>
            <Text style={styles.tripTime}>{trip.startTime} - {trip.endTime}</Text>
            {trip.notes && <Text style={styles.tripNotes}>Notes: {trip.notes}</Text>}
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
          <Text style={styles.exportCardDesc}>Download your trip data as a CSV file for tax purposes or expense reporting</Text>
          <TouchableOpacity style={styles.exportCardButton} onPress={exportTrips}>
            <Text style={styles.exportCardButtonText}>📧 Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exportCard}>
          <Text style={styles.exportCardTitle}>Trip Summary</Text>
          <Text style={styles.exportCardDesc}>Total trips: {trips.length}</Text>
          <Text style={styles.exportCardDesc}>Total miles: {totalMiles.toFixed(1)}</Text>
          <Text style={styles.exportCardDesc}>Total deduction: ${totalDeduction.toFixed(2)}</Text>
        </View>

        <View style={styles.exportCard}>
          <Text style={styles.exportCardTitle}>IRS Rates 2025</Text>
          <Text style={styles.exportCardDesc}>Business: $0.70 per mile</Text>
          <Text style={styles.exportCardDesc}>Medical: $0.21 per mile</Text>
          <Text style={styles.exportCardDesc}>Charity: $0.14 per mile</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'trips' && <TripsView />}
      {activeView === 'export' && <ExportView />}

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
        
        <TouchableOpacity 
          style={[styles.navButton, activeView === 'export' && styles.navButtonActive]}
          onPress={() => setActiveView('export')}
        >
          <Text style={[styles.navText, activeView === 'export' && styles.navTextActive]}>Export</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddTrip} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            <TouchableOpacity onPress={() => setShowAddTrip(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={newTrip.date}
                onChangeText={(text) => setNewTrip({...newTrip, date: text})}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Distance (miles) *</Text>
              <TextInput
                style={styles.input}
                value={newTrip.distance}
                onChangeText={(text) => setNewTrip({...newTrip, distance: text})}
                placeholder="0.0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Location *</Text>
              <TextInput
                style={styles.input}
                value={newTrip.startLocation}
                onChangeText={(text) => setNewTrip({...newTrip, startLocation: text})}
                placeholder="Starting point"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Location *</Text>
              <TextInput
                style={styles.input}
                value={newTrip.endLocation}
                onChangeText={(text) => setNewTrip({...newTrip, endLocation: text})}
                placeholder="Destination"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Purpose</Text>
              <View style={styles.purposeButtons}>
                {['Business', 'Medical', 'Charity'].map(purpose => (
                  <TouchableOpacity
                    key={purpose}
                    style={[styles.purposeButton, newTrip.purpose === purpose && styles.purposeButtonActive]}
                    onPress={() => setNewTrip({...newTrip, purpose})}
                  >
                    <Text style={[styles.purposeButtonText, newTrip.purpose === purpose && styles.purposeButtonTextActive]}>
                      {purpose}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={newTrip.notes}
                onChangeText={(text) => setNewTrip({...newTrip, notes: text})}
                placeholder="Optional notes"
                multiline
              />
            </View>

            <TouchableOpacity style={styles.addTripButton} onPress={addManualTrip}>
              <Text style={styles.addTripButtonText}>Add Trip</Text>
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
    backgroundColor: '#667eea',
  },
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
    marginBottom: 10,
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
  irsExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
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
  stopButton: {
    backgroundColor: '#ff6b6b',
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
  manualButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  recentTrips: {
    margin: 20,
  },
  tripsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exportContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  exportCardButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  exportCardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 12,
    marginHorizontal: 2,
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
  tripTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  tripNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
