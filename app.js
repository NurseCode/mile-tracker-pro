import React from 'react';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333333' }}>MileTracker Pro</Text>
      <Text style={{ fontSize: 16, color: '#666666', marginTop: 10 }}>APK Build Success</Text>
    </View>
  );
}
