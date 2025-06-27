import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const renderHome = () => (
    <ScrollView style={styles.container}>
      <ExpoStatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>React Native Package Test</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Build Test Status</Text>
        <Text style={styles.cardText}>✅ Expo prebuild successful</Text>
        <Text style={styles.cardText}>✅ Dependencies installed</Text>
        <Text style={styles.cardText}>🧪 Testing React Native packages</Text>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => Alert.alert('Success', 'React Native package replacement working!')}
      >
        <Text style={styles.buttonText}>Test App Functionality</Text>
      </TouchableOpacity>

    </ScrollView>
  );

  const renderTrips = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Trips</Text>
      <Text style={styles.cardText}>Trip management will be restored after successful build</Text>
    </ScrollView>
  );

  return (
    <View style={styles.mainContainer}>
      {currentView === 'home' && renderHome()}
      {currentView === 'trips' && renderTrips()}
      
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'home' && styles.navButtonActive]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={styles.navText}>🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentView === 'trips' && styles.navButtonActive]}
          onPress={() => setCurrentView('trips')}
        >
          <Text style={styles.navText}>🚗 Trips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 100
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  navButtonActive: {
    backgroundColor: '#f0f2ff',
    borderRadius: 8
  },
  navText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500'
  }
});
