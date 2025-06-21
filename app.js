import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  console.log('MileTracker Pro - Build Test v1.0');
  
  const [message, setMessage] = useState('MileTracker Pro Loading...');

  useEffect(() => {
    setTimeout(() => {
      setMessage('MileTracker Pro - Ready for Google Play Store!');
    }, 1000);
  }, []);

  const handlePress = () => {
    Alert.alert('Success', 'MileTracker Pro APK build completed successfully!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>MileTracker Pro</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Test Build Success</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>Production-ready for Android deployment</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 30,
  },
  buttonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
});
