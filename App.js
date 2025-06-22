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
  Switch,
} from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  console.log('MILETRACKER PRO - v6.0 - PROFESSIONAL FEATURES');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [trackingTimer, setTrackingTimer] = useState(0);
  const [autoDetection, setAutoDetection] = useState(true);
  const [newTrip, setNewTrip] = useState({
    startLocation: '',
    endLocation: '',
    distance: '',
    category: 'Business'
  });

  const [userSubscription, setUserSubscription] = useState('free');
  const [monthlyTripCount, setMonthlyTripCount] = useState(8);
  const [settings, setSettings] = useState({
    autoStartTrips: true,
    minimumTripDistance: 0.1,
    businessRate: 0.70,
    medicalRate: 0.21,
    charityRate: 0.14,
    roundingPrecision: 1
  });

  useEffect(() => {
    initializeSampleData();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingTimer(timer => timer + 1);
      }, 1000);
    } else {
      setTrackingTimer(0);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

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
        date: '2025-06-22',
        startLocation: 'Home Office',
        endLocation: 'Client Meeting Downtown',
        distance: 12.5,
        category: 'Business',
        duration: 25,
        cost: 8.75,
        method: 'GPS',
      },
      {
        id: '2', 
        date: '2025-06-21',
        startLocation: 'Downtown Office',
        endLocation: 'Medical Appointment',
        distance: 8.2,
        category: 'Medical',
        duration: 18,
        cost: 1.72,
        method: 'Manual',
      },
      {
        id: '3',
        date: '2025-06-20',
        startLocation: 'Home',
        endLocation: 'Grocery Store',
        distance: 3.1,
        category: 'Business',
        duration: 8,
        cost: 2.17,
        method: 'GPS',
      }
    ];
    setTrips(sampleTrips);
  };

  const startGPSTrip = async () => {
    try {
      setIsTracking(true);
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const trip = {
        id: Date.now().toString(),
        startTime: new Date(),
        startLocation: `GPS: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        startCoords: location.coords,
        category: 'Business',
        method: 'GPS'
      };
      
      setCurrentTrip(trip);
      Alert.alert('GPS Trip Started', 
        `Tracking from ${trip.startLocation}\n\nNote: Drive at least ${settings.minimumTripDistance} miles for distance calculation. Timer will show live duration.`);
    } catch (error) {
      Alert.alert('GPS Error', 'Could not access location. Check permissions.');
      setIsTracking(false);
    }
  };

  const stopGPSTrip = async () => {
    if (!currentTrip) return;
    
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const distance = calculateDistance(
        currentTrip.startCoords.latitude,
        currentTrip.startCoords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );
      
      const finalDistance = Math.max(distance, settings.minimumTripDistance);
      const rates = { Business: settings.businessRate, Medical: settings.medicalRate, Charity: settings.charityRate };
      
      const completedTrip = {
        ...currentTrip,
        endTime: new Date(),
        endLocation: `GPS: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        endCoords: location.coords,
        distance: parseFloat(finalDistance.toFixed(settings.roundingPrecision)),
        duration: Math.round(trackingTimer / 60),
        cost: parseFloat((finalDistance * rates[currentTrip.category]).toFixed(2)),
        date: new Date().toISOString().split('T')[0]
      };
      
      setTrips(prev => [completedTrip, ...prev]);
      setCurrentTrip(null);
      setIsTracking(false);
      setTrackingTimer(0);
      
      Alert.alert('GPS Trip Completed', 
        `Duration: ${Math.round(trackingTimer / 60)} minutes\nDistance: ${finalDistance.toFixed(settings.roundingPrecision)} miles\nDeduction: $${completedTrip.cost.toFixed(2)}\n\nTrip automatically saved to your records.`);
    } catch (error) {
      Alert.alert('GPS Error', 'Could not complete trip');
      setIsTracking(false);
      setTrackingTimer(0);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addManualTrip = () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const distance = parseFloat(newTrip.distance);
    const rates = { Business: settings.businessRate, Medical: settings.medicalRate, Charity: settings.charityRate };
    
    const trip = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: parseFloat(distance.toFixed(settings.roundingPrecision)),
      category: newTrip.category,
      duration: Math.round(distance * 2),
      cost: parseFloat((distance * rates[newTrip.category]).toFixed(2)),
      method: 'Manual',
    };

    setTrips(prev => [trip, ...prev]);
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    Alert.alert('Success', 'Trip added successfully');
  };

  const deleteTrip = (tripId) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setTrips(prev => prev.filter(trip => trip.id !== tripId))
        }
      ]
    );
  };

  const editTrip = (trip) => {
    setNewTrip({
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      distance: trip.distance.toString(),
      category: trip.category,
      editingId: trip.id
    });
    setShowAddTrip(true);
  };

  const saveEditedTrip = () => {
    if (!newTrip.startLocation || !newTrip.endLocation || !newTrip.distance) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const distance = parseFloat(newTrip.distance);
    const rates = { Business: settings.businessRate, Medical: settings.medicalRate, Charity: settings.charityRate };
    
    setTrips(prev => prev.map(trip => 
      trip.id === newTrip.editingId 
        ? {
            ...trip,
            startLocation: newTrip.startLocation,
            endLocation: newTrip.endLocation,
            distance: parseFloat(distance.toFixed(settings.roundingPrecision)),
            category: newTrip.category,
            cost: parseFloat((distance * rates[newTrip.category]).toFixed(2)),
          }
        : trip
    ));
    
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    Alert.alert('Success', 'Trip updated successfully');
  };

  const exportTrips = () => {
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    const totalTrips = trips.length;
    const totalMiles = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalDeduction = trips.reduce((sum, trip) => sum + trip.cost, 0);
    
    let csvContent = `MileTracker Pro Export - ${currentMonth}\n`;
    csvContent += `Total Trips: ${totalTrips}, Total Miles: ${totalMiles.toFixed(1)}, Total Deduction: $${totalDeduction.toFixed(2)}\n\n`;
    csvContent += 'Date,Start Location,End Location,Distance (mi),Category,Duration (min),Deduction,Method\n';
    
    trips.forEach(trip => {
      csvContent += `${trip.date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.category},${trip.duration},$${trip.cost.toFixed(2)},${trip.method}\n`;
    });
    
    Alert.alert('Export Data', csvContent.substring(0, 300) + '...\n\nComplete export ready for your tax professional or accounting software');
  };

  const getMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTrips = trips.filter(trip => {
      const tripDate = new Date(trip.date);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });

    const businessTrips = monthlyTrips.filter(trip => trip.category === 'Business');
    const medicalTrips = monthlyTrips.filter(trip => trip.category === 'Medical');
    const charityTrips = monthlyTrips.filter(trip => trip.category === 'Charity');

    return {
      total: monthlyTrips.length,
      miles: monthlyTrips.reduce((sum, trip) => sum + trip.distance, 0),
      deduction: monthlyTrips.reduce((sum, trip) => sum + trip.cost, 0),
      business: { count: businessTrips.length, miles: businessTrips.reduce((sum, trip) => sum + trip.distance, 0) },
      medical: { count: medicalTrips.length, miles: medicalTrips.reduce((sum, trip) => sum + trip.distance, 0) },
      charity: { count: charityTrips.length, miles: charityTrips.reduce((sum, trip) => sum + trip.distance, 0) }
    };
  };

  const renderDashboard = () => {
    const stats = getMonthlyStats();
    
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>MileTracker Pro</Text>
            <Text style={styles.headerSubtitle}>Professional Mileage Tracking - $4.99/month</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>June 2025 Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{stats.total}</Text>
              <Text style={styles.summaryLabel}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{stats.miles.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>${stats.deduction.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Saved</Text>
            </View>
          </View>
          
          <View style={styles.categoryBreakdown}>
            <Text style={styles.breakdownTitle}>Category Breakdown:</Text>
            <Text style={styles.breakdownText}>Business: {stats.business.count} trips, {stats.business.miles.toFixed(1)} miles</Text>
            <Text style={styles.breakdownText}>Medical: {stats.medical.count} trips, {stats.medical.miles.toFixed(1)} miles</Text>
            <Text style={styles.breakdownText}>Charity: {stats.charity.count} trips, {stats.charity.miles.toFixed(1)} miles</Text>
          </View>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Text style={styles.cardTitle}>GPS Trip Tracking</Text>
            <View style={styles.modeToggle}>
              <Text style={styles.modeLabel}>Auto</Text>
              <Switch
                value={autoDetection}
                onValueChange={setAutoDetection}
                trackColor={{ false: '#767577', true: '#667eea' }}
                thumbColor={autoDetection ? '#f4f3f4' : '#f4f3f4'}
              />
              <Text style={styles.modeLabel}>Manual</Text>
            </View>
          </View>
          
          {isTracking ? (
            <View style={styles.trackingActiveContainer}>
              <Text style={styles.trackingStatus}>🟢 GPS Tracking Active</Text>
              <Text style={styles.trackingTimer}>Duration: {formatTime(trackingTimer)}</Text>
              <TouchableOpacity style={styles.stopButton} onPress={stopGPSTrip}>
                <Text style={styles.buttonText}>STOP GPS TRIP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={startGPSTrip}>
              <Text style={styles.buttonText}>🚗 START GPS TRIP</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.trackingNote}>
            {autoDetection ? 'Auto mode: Detects driving automatically' : 'Manual mode: Full start/stop control'}
          </Text>
        </View>

        <TouchableOpacity style={styles.manualButton} onPress={() => setShowAddTrip(true)}>
          <Text style={styles.buttonText}>+ Add Manual Trip</Text>
        </TouchableOpacity>

        <View style={styles.subscriptionCard}>
          <Text style={styles.cardTitle}>Subscription Status</Text>
          <Text style={styles.subscriptionText}>Free Plan: {monthlyTripCount}/40 trips this month</Text>
          <Text style={styles.upgradeText}>Upgrade to Premium for unlimited tracking + receipt capture</Text>
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Recent Trips</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportTrips}>
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <View style={styles.tripActions}>
              <Text style={styles.tripCost}>${trip.cost.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => editTrip(trip)} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteTrip(trip.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.tripRoute} numberOfLines={2} ellipsizeMode="tail">
            {trip.startLocation} → {trip.endLocation}
          </Text>
          <View style={styles.tripDetails}>
            <Text style={styles.tripDistance}>{trip.distance} miles</Text>
            <Text style={styles.tripCategory}>{trip.category}</Text>
            <Text style={styles.tripMethod}>{trip.method}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderSettings = () => (
    <Modal visible={showSettings} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settings</Text>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.settingsSection}>IRS Mileage Rates (2025)</Text>
          
          <Text style={styles.inputLabel}>Business Rate (per mile)</Text>
          <TextInput
            style={styles.textInput}
            value={`$${settings.businessRate.toFixed(2)}`}
            onChangeText={(text) => {
              const value = parseFloat(text.replace('$', ''));
              if (!isNaN(value)) setSettings(prev => ({...prev, businessRate: value}));
            }}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Medical Rate (per mile)</Text>
          <TextInput
            style={styles.textInput}
            value={`$${settings.medicalRate.toFixed(2)}`}
            onChangeText={(text) => {
              const value = parseFloat(text.replace('$', ''));
              if (!isNaN(value)) setSettings(prev => ({...prev, medicalRate: value}));
            }}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Charity Rate (per mile)</Text>
          <TextInput
            style={styles.textInput}
            value={`$${settings.charityRate.toFixed(2)}`}
            onChangeText={(text) => {
              const value = parseFloat(text.replace('$', ''));
              if (!isNaN(value)) setSettings(prev => ({...prev, charityRate: value}));
            }}
            keyboardType="numeric"
          />

          <Text style={styles.settingsSection}>Trip Settings</Text>
          
          <Text style={styles.inputLabel}>Minimum Trip Distance (miles)</Text>
          <TextInput
            style={styles.textInput}
            value={settings.minimumTripDistance.toString()}
            onChangeText={(text) => {
              const value = parseFloat(text);
              if (!isNaN(value)) setSettings(prev => ({...prev, minimumTripDistance: value}));
            }}
            keyboardType="numeric"
          />

          <View style={styles.switchContainer}>
            <Text style={styles.inputLabel}>Auto-start trips when driving detected</Text>
            <Switch
              value={settings.autoStartTrips}
              onValueChange={(value) => setSettings(prev => ({...prev, autoStartTrips: value}))}
              trackColor={{ false: '#767577', true: '#667eea' }}
            />
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={() => {
            setSettings({
              autoStartTrips: true,
              minimumTripDistance: 0.1,
              businessRate: 0.70,
              medicalRate: 0.21,
              charityRate: 0.14,
              roundingPrecision: 1
            });
            Alert.alert('Settings Reset', 'All settings restored to defaults');
          }}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
            <Text style={styles.modalTitle}>
              {newTrip.editingId ? 'Edit Trip' : 'Add Manual Trip'}
            </Text>
            <TouchableOpacity onPress={() => {
              setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
              setShowAddTrip(false);
            }}>
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

            <TouchableOpacity 
              style={styles.addButton} 
              onPress={newTrip.editingId ? saveEditedTrip : addManualTrip}
            >
              <Text style={styles.buttonText}>
                {newTrip.editingId ? 'Save Changes' : 'Add Trip'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {renderSettings()}
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
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 60,
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
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 24,
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
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
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
  categoryBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  trackingActiveContainer: {
    alignItems: 'center',
  },
  trackingNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  trackingStatus: {
    fontSize: 16,
    color: '#28a745',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackingTimer: {
    fontSize: 20,
    color: '#667eea',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#667eea',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 200,
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
    marginBottom: 16,
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
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  tripCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginRight: 12,
  },
  actionButton: {
    backgroundColor: '#667eea',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  tripMethod: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
    height: 60,
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
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
  settingsSection: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
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
  resetButton: {
    backgroundColor: '#dc3545',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
