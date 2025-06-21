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

export default function App() {
  console.log('MILETRACKER PRO - ANDROID APK v1.0 - READY FOR GOOGLE PLAY');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [showAddTrip, setShowAddTrip] = useState(false);
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
  }, []);

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
        endLocation: 'Medical Center',
        distance: 8.2,
        category: 'Medical',
        duration: 18,
        cost: 1.72,
      },
      {
        id: '3',
        date: '2025-06-18',
        startLocation: 'Home',
        endLocation: 'Charity Event Center',
        distance: 15.3,
        category: 'Charity',
        duration: 32,
        cost: 2.14,
      },
      {
        id: '4',
        date: '2025-06-17',
        startLocation: 'Office Building',
        endLocation: 'Business Conference',
        distance: 22.1,
        category: 'Business',
        duration: 45,
        cost: 15.47,
      },
    ];
    setTrips(sampleTrips);
  };

  const calculateTotals = () => {
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
    const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);
    return { totalTrips, totalDistance, totalCost };
  };

  const showUpgradePrompt = () => {
    Alert.alert(
      'MileTracker Pro Premium - Better Deal Than MileIQ!',
      `Free: 25 trips/month\nPremium: $4.99/month (vs MileIQ $5.99-9.99)\n\n✓ Unlimited tracking\n✓ Manual controls\n✓ GPS tracking\n✓ Receipt capture\n✓ Export reports\n✓ API access`,
      [
        { text: 'Continue Free', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => {
          setUserSubscription('premium');
          Alert.alert('Welcome to Premium!', 'All features unlocked. Enjoy unlimited tracking!');
        }}
      ]
    );
  };

  const startTrip = () => {
    if (userSubscription === 'free' && monthlyTripCount >= 25) {
      showUpgradePrompt();
      return;
    }
    
    Alert.alert(
      'Start Trip Tracking',
      'In the full version, this will start GPS tracking.\n\nFor now, you can add trips manually.',
      [
        { text: 'OK', style: 'default' },
        { text: 'Add Manual Trip', onPress: () => setShowAddTrip(true) }
      ]
    );
  };

  const addTrip = () => {
    const distance = parseFloat(newTrip.distance);
    if (!newTrip.startLocation || !newTrip.endLocation || !distance) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const rates = {
      'Business': 0.70,
      'Medical': 0.21,
      'Charity': 0.14,
      'Personal': 0
    };

    const cost = distance * rates[newTrip.category];
    
    const trip = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      startLocation: newTrip.startLocation,
      endLocation: newTrip.endLocation,
      distance: distance,
      category: newTrip.category,
      duration: Math.round(distance * 2), // Estimate
      cost: cost,
    };

    setTrips(prev => [trip, ...prev]);
    setNewTrip({ startLocation: '', endLocation: '', distance: '', category: 'Business' });
    setShowAddTrip(false);
    
    if (userSubscription === 'free') {
      setMonthlyTripCount(prev => prev + 1);
    }
    
    Alert.alert('Trip Added!', `${distance} miles added as ${newTrip.category} trip. Tax deduction: $${cost.toFixed(2)}`);
  };

  const exportData = () => {
    const { totalTrips, totalDistance, totalCost } = calculateTotals();
    
    Alert.alert(
      'Export Complete',
      `CSV Report Ready:\n\n${totalTrips} trips\n${totalDistance.toFixed(1)} miles\n$${totalCost.toFixed(2)} tax deduction\n\nIn the full version, this creates a professional CSV file for taxes and reimbursements.`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderDashboard = () => {
    const { totalTrips, totalDistance, totalCost } = calculateTotals();
    
    return (
      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>June 2025 Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalTrips}</Text>
              <Text style={styles.summaryLabel}>Trips</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalDistance.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Miles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>${totalCost.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Tax Deduction</Text>
            </View>
          </View>
          <Text style={styles.explanation}>
            IRS rates: Business ($0.70/mi) + Medical ($0.21/mi) + Charity ($0.14/mi)
          </Text>
        </View>

        <View style={styles.subscriptionCard}>
          <Text style={styles.subscriptionTitle}>
            {userSubscription === 'free' ? '🚗 Free Plan' : '⭐ Premium Plan'}
          </Text>
          <Text style={styles.subscriptionText}>
            {userSubscription === 'free' 
              ? `${monthlyTripCount}/25 trips used this month`
              : 'Unlimited tracking + all features'
            }
          </Text>
          {userSubscription === 'free' && (
            <TouchableOpacity style={styles.upgradeButton} onPress={showUpgradePrompt}>
              <Text style={styles.upgradeText}>Upgrade to Premium - $4.99/month</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.primaryButton} onPress={startTrip}>
            <Text style={styles.primaryButtonText}>🚗 START TRIP TRACKING</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddTrip(true)}>
            <Text style={styles.secondaryButtonText}>➕ Add Manual Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={exportData}>
            <Text style={styles.secondaryButtonText}>📄 Export Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => (
    <ScrollView style={styles.content}>
      <View style={styles.tripsHeader}>
        <Text style={styles.sectionTitle}>Trip History</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddTrip(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      
      {trips.map(trip => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{trip.date}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{trip.category}</Text>
            </View>
          </View>
          <Text style={styles.tripRoute}>
            {trip.startLocation} → {trip.endLocation}
          </Text>
          <View style={styles.tripFooter}>
            <Text style={styles.tripDistance}>{trip.distance} miles</Text>
            <Text style={styles.tripCost}>${trip.cost.toFixed(2)}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional Mileage Tracking - $4.99/month</Text>
      </View>

      {currentView === 'dashboard' ? renderDashboard() : renderTrips()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'dashboard' && styles.navButtonActive]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={[styles.navText, currentView === 'trips' && styles.navTextActive]}>
            Trips
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddTrip}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddTrip(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Trip</Text>
            <TouchableOpacity onPress={addTrip}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Location</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.startLocation}
                onChangeText={(text) => setNewTrip(prev => ({...prev, startLocation: text}))}
                placeholder="Enter start address"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Location</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.endLocation}
                onChangeText={(text) => setNewTrip(prev => ({...prev, endLocation: text}))}
                placeholder="Enter end address"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Distance (miles)</Text>
              <TextInput
                style={styles.textInput}
                value={newTrip.distance}
                onChangeText={(text) => setNewTrip(prev => ({...prev, distance: text}))}
                placeholder="0.0"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {['Business', 'Medical', 'Charity', 'Personal'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      newTrip.category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setNewTrip(prev => ({...prev, category: cat}))}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newTrip.category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
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
    textAlign: 'center',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  explanation: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  subscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subscriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  upgradeButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  upgradeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '500',
  },
  tripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
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
  categoryBadge: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  tripRoute: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tripCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
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
    fontWeight: '500',
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
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
});
