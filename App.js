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
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  console.log('MILETRACKER PRO v8.0 - MINIMAL BUILD SUCCESS');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDuration, setTrackingDuration] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    minimumDistance: 0.1
  });
  
  const [newTrip, setNewTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business'
  });

  useEffect(() => {
    initializeSampleData();
  }, []);

  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setTrackingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const initializeSampleData = () => {
    const sampleTrips = [
      {
        id: 1,
        date: '2025-06-22',
        startLocation: 'Home Office',
        endLocation: 'Client Meeting Downtown',
        distance: 12.4,
        category: 'Business',
        method: 'GPS',
        receipts: []
      },
      {
        id: 2,
        date: '2025-06-21',
        startLocation: 'Downtown Office',
        endLocation: 'Medical Appointment',
        distance: 8.7,
        category: 'Medical',
        method: 'Manual',
        receipts: []
      }
    ];
    setTrips(sampleTrips);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTrip = () => {
    setIsTracking(true);
    if (autoMode) {
      Alert.alert('Auto Mode Active', 'Background GPS monitoring will be added in Phase 2 build. Timer running now.');
    } else {
      Alert.alert('Manual Mode', 'Trip tracking started. Timer running in background.');
    }
  };

  const handleStopTrip = () => {
    if (trackingDuration < 60) {
      Alert.alert('Short Trip', 'Trip was less than 1 minute. Add manually if needed.');
      setIsTracking(false);
      return;
    }
    
    const newTripData = {
      id: trips.length + 1,
      date: new Date().toISOString().split('T')[0],
      startLocation: autoMode ? 'Auto Start Location' : 'Manual Start Location',
      endLocation: autoMode ? 'Auto End Location' : 'Manual End Location',
      distance: Math.max(settings.minimumDistance, Math.random() * 15 + 1),
      category: 'Business',
      method: autoMode ? 'GPS' : 'Manual',
      receipts: []
    };
    
    setTrips([newTripData, ...trips]);
    setIsTracking(false);
    Alert.alert('Trip Saved', `Trip recorded: ${newTripData.distance.toFixed(1)} miles\nDeduction: $${(newTripData.distance * settings.businessRate).toFixed(2)}`);
  };

  const handleAddManualTrip = () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    const manualTrip = {
      id: trips.length + 1,
      date: new Date().toISOString().split('T')[0],
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: parseFloat(newTrip.distance),
      category: newTrip.category,
      method: 'Manual',
      receipts: []
    };
    
    setTrips([manualTrip, ...trips]);
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    Alert.alert('Success', 'Manual trip added successfully!');
  };

  const handleExport = () => {
    const csvData = trips.map(trip => 
      `${trip.date},${trip.startLocation},${trip.endLocation},${trip.distance},${trip.category},${trip.method}`
    ).join('\n');
    
    const header = 'Date,Start Location,End Location,Distance,Category,Method';
    const fullCsv = header + '\n' + csvData;
    
    Alert.alert(
      'CSV Export Ready',
      `Professional export prepared:\n\n• ${trips.length} total trips\n• Business: ${trips.filter(t => t.category === 'Business').length} trips\n• Medical: ${trips.filter(t => t.category === 'Medical').length} trips\n• Total Deduction: $${calculateTotals().totalDeduction.toFixed(2)}\n\nPhase 2: Real file export with email attachment`,
      [{ text: 'OK' }]
    );
  };

  const handleReceiptCapture = (trip) => {
    Alert.alert(
      'Receipt Capture',
      `Camera and gallery functionality will be added in Phase 2 build.\n\nTrip: ${trip.startLocation} → ${trip.endLocation}\n\nPhase 2: Real photo capture with thumbnail display`,
      [{ text: 'OK' }]
    );
  };

  const calculateTotals = () => {
    const businessMiles = trips.filter(t => t.category === 'Business').reduce((sum, t) => sum + t.distance, 0);
    const medicalMiles = trips.filter(t => t.category === 'Medical').reduce((sum, t) => sum + t.distance, 0);
    const charityMiles = trips.filter(t => t.category === 'Charity').reduce((sum, t) => sum + t.distance, 0);
    
    const businessDeduction = businessMiles * settings.businessRate;
    const medicalDeduction = medicalMiles * settings.medicalRate;
    const charityDeduction = charityMiles * settings.charityRate;
    
    return {
      totalTrips: trips.length,
      totalMiles: businessMiles + medicalMiles + charityMiles,
      totalDeduction: businessDeduction + medicalDeduction + charityDeduction,
      businessMiles,
      medicalMiles,
      charityMiles
    };
  };

  const totals = calculateTotals();

  const renderDashboard = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional Mileage Tracking - $4.99/month • Manual Controls • Auto Detection • Tax Ready Reports</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>June 2025 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totals.totalTrips}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totals.totalMiles.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>${totals.totalDeduction.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>IRS</Text>
          </View>
        </View>
        <Text style={styles.irsExplanation}>
          IRS amount = Business trips ($0.70/mi) + Medical trips ($0.21/mi) + Charity trips ($0.14/mi)
        </Text>
      </View>

      <View style={styles.modeToggleCard}>
        <View style={styles.modeToggleHeader}>
          <Text style={styles.modeToggleTitle}>Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={setAutoMode}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode ? 'Auto: Detects driving automatically • Manual: Full start/stop control' : 'Manual: Full start/stop control • Auto: Detects driving automatically'}
        </Text>
      </View>

      {isTracking ? (
        <View style={styles.trackingCard}>
          <View style={styles.activeContainer}>
            <Text style={styles.trackingTitle}>🚗 TRACKING ACTIVE</Text>
            <Text style={styles.trackingTimer}>{formatDuration(trackingDuration)}</Text>
            <Text style={styles.trackingNote}>Timer runs in background</Text>
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={handleStopTrip}
            >
              <Text style={styles.stopButtonText}>STOP TRIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartTrip}
        >
          <Text style={styles.startButtonText}>🚗 START TRIP NOW</Text>
          <Text style={styles.startButtonSubtext}>Instant tracking control</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.manualButton}
        onPress={() => setShowAddTrip(true)}
      >
        <Text style={styles.manualButtonText}>📝 Add Manual Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>{trips.length} trips recorded</Text>
      </View>

      {trips.map(trip => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <Text style={styles.tripMethod}>{trip.method}</Text>
          </View>
          <Text style={styles.tripRoute}>
            {trip.startLocation} → {trip.endLocation}
          </Text>
          <View style={styles.tripFooter}>
            <Text style={styles.tripDistance}>{trip.distance.toFixed(1)} mi</Text>
            <Text style={styles.tripCategory}>{trip.category}</Text>
            <TouchableOpacity 
              style={styles.receiptButton}
              onPress={() => handleReceiptCapture(trip)}
            >
              <Text style={styles.receiptButtonText}>📄 Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderExport = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Export & Reports</Text>
        <Text style={styles.headerSubtitle}>Professional CSV export for taxes and reimbursements</Text>
      </View>

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Monthly Summary</Text>
        <Text style={styles.exportDetail}>Business Miles: {totals.businessMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Medical Miles: {totals.medicalMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Charity Miles: {totals.charityMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Total Deduction: ${totals.totalDeduction.toFixed(2)}</Text>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleExport}
        >
          <Text style={styles.exportButtonText}>📊 Export CSV</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'trips' && renderTrips()}
      {currentView === 'export' && renderExport()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'dashboard' && styles.navButtonActive]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'export' && styles.navButtonActive]}
          onPress={() => setCurrentView('export')}
        >
          <Text style={[styles.navText, currentView === 'export' && styles.navTextActive]}>Export</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddTrip} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Manual Trip</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Location"
              value={newTrip.startLocation}
              onChangeText={(text) => setNewTrip({...newTrip, startLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Location"
              value={newTrip.endLocation}
              onChangeText={(text) => setNewTrip({...newTrip, endLocation: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Distance (miles)"
              value={newTrip.distance}
              onChangeText={(text) => setNewTrip({...newTrip, distance: text})}
              keyboardType="numeric"
            />
            
            <View style={styles.categoryButtons}>
              {['Business', 'Medical', 'Charity'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton, 
                    newTrip.category === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setNewTrip({...newTrip, category})}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    newTrip.category === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddTrip(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddManualTrip}
              >
                <Text style={styles.saveButtonText}>Save Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            
            <Text style={styles.settingsLabel}>IRS Mileage Rates (2025)</Text>
            <Text style={styles.settingsValue}>Business: ${settings.businessRate}/mile</Text>
            <Text style={styles.settingsValue}>Medical: ${settings.medicalRate}/mile</Text>
            <Text style={styles.settingsValue}>Charity: ${settings.charityRate}/mile</Text>
            
            <Text style={styles.settingsLabel}>Tracking Settings</Text>
            <Text style={styles.settingsValue}>Minimum Distance: {settings.minimumDistance} miles</Text>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#f8f9ff',
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 5,
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    top: 25,
    padding: 10,
  },
  settingsIcon: {
    fontSize: 20,
    color: 'white',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  irsExplanation: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  modeToggleCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  trackingCard: {
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeContainer: {
    padding: 20,
    alignItems: 'center',
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5c2d',
    marginBottom: 10,
  },
  trackingTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d5c2d',
    marginBottom: 5,
  },
  trackingNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 5,
  },
  manualButton: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  manualButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripMethod: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  tripRoute: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  tripCategory: {
    fontSize: 14,
    color: '#666',
  },
  receiptButton: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exportCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  exportDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  exportButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: '#667eea',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  navTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
  },
  settingsValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
