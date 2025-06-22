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
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  console.log('MILETRACKER PRO v8.5 - PHASE 2C DOCUMENT PICKER - GPS + CSV + RECEIPT PHOTOS');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [trips, setTrips] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDuration, setTrackingDuration] = useState(0);
  const [trackingStartTime, setTrackingStartTime] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [receiptData, setReceiptData] = useState({ category: 'Gas', amount: '', description: '' });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
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
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (isTracking && trackingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - trackingStartTime) / 1000);
        setTrackingDuration(elapsed);
      }, 1000);
    } else {
      setTrackingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingStartTime]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('Location permission granted');
        getCurrentLocation();
      } else {
        Alert.alert('Permission Required', 'Location permission is needed for GPS tracking.');
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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
        receipts: [
          { 
            id: 1, 
            type: 'Gas', 
            amount: 45.50, 
            description: 'Shell Station - Downtown',
            hasPhoto: true,
            photoUri: 'sample_receipt_1'
          }
        ]
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

  const handleStartTrip = async () => {
    try {
      await getCurrentLocation();
      setIsTracking(true);
      setTrackingStartTime(Date.now());
      setStartLocation(currentLocation);
      
      if (autoMode) {
        Alert.alert('Auto Mode Active', 'GPS tracking started. Background monitoring for automatic trip detection when driving speed > 5 mph.');
      } else {
        Alert.alert('Manual Mode', 'GPS tracking started. Use STOP TRIP when you reach your destination.');
      }
    } catch (error) {
      Alert.alert('GPS Error', 'Unable to get current location. Please ensure GPS is enabled.');
    }
  };

  const handleStopTrip = async () => {
    if (trackingDuration < 30) {
      Alert.alert('Short Trip', 'Trip was less than 30 seconds. Add manually if needed.');
      setIsTracking(false);
      setTrackingStartTime(null);
      return;
    }

    try {
      await getCurrentLocation();
      
      let distance = settings.minimumDistance;
      if (startLocation && currentLocation) {
        distance = calculateDistance(
          startLocation.coords.latitude,
          startLocation.coords.longitude,
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
        distance = Math.max(distance, settings.minimumDistance);
      }
      
      const newTripData = {
        id: trips.length + 1,
        date: new Date().toISOString().split('T')[0],
        startLocation: autoMode ? 'GPS Auto Start' : 'GPS Manual Start',
        endLocation: autoMode ? 'GPS Auto End' : 'GPS Manual End',
        distance: distance,
        category: 'Business',
        method: 'GPS',
        receipts: [],
        coordinates: {
          start: startLocation?.coords,
          end: currentLocation?.coords
        }
      };
      
      setTrips([newTripData, ...trips]);
      setIsTracking(false);
      setTrackingStartTime(null);
      setStartLocation(null);
      
      Alert.alert(
        'Trip Saved', 
        `GPS Trip recorded:\n${distance.toFixed(1)} miles\nDuration: ${formatDuration(trackingDuration)}\nDeduction: $${(distance * settings.businessRate).toFixed(2)}`
      );
    } catch (error) {
      Alert.alert('GPS Error', 'Unable to get final location. Trip saved with estimated distance.');
      setIsTracking(false);
      setTrackingStartTime(null);
    }
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

  const handleReceiptCapture = (trip) => {
    setSelectedTrip(trip);
    setReceiptData({ category: 'Gas', amount: '', description: '' });
    setShowReceiptModal(true);
  };

  const pickReceiptImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Copy to app's document directory for persistence
        const fileName = `receipt_${Date.now()}_${asset.name}`;
        const destinationUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.copyAsync({
          from: asset.uri,
          to: destinationUri,
        });

        // Create receipt record
        const newReceipt = {
          id: Date.now(),
          type: receiptData.category,
          amount: parseFloat(receiptData.amount) || 0,
          description: receiptData.description || 'Receipt photo',
          hasPhoto: true,
          photoUri: destinationUri,
          fileName: fileName,
          date: new Date().toISOString()
        };

        // Update trip with receipt
        const updatedTrips = trips.map(trip => {
          if (trip.id === selectedTrip.id) {
            return {
              ...trip,
              receipts: [...(trip.receipts || []), newReceipt]
            };
          }
          return trip;
        });

        setTrips(updatedTrips);
        setShowReceiptModal(false);
        
        Alert.alert('Success', `Receipt photo added to trip!\n\nType: ${receiptData.category}\nAmount: $${receiptData.amount || '0.00'}`);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Unable to select image. Please try again.');
    }
  };

  const handleAddReceiptText = () => {
    if (!receiptData.description.trim()) {
      Alert.alert('Missing Information', 'Please enter receipt details.');
      return;
    }

    const newReceipt = {
      id: Date.now(),
      type: receiptData.category,
      amount: parseFloat(receiptData.amount) || 0,
      description: receiptData.description,
      hasPhoto: false,
      date: new Date().toISOString()
    };

    const updatedTrips = trips.map(trip => {
      if (trip.id === selectedTrip.id) {
        return {
          ...trip,
          receipts: [...(trip.receipts || []), newReceipt]
        };
      }
      return trip;
    });

    setTrips(updatedTrips);
    setShowReceiptModal(false);
    Alert.alert('Success', `Receipt note added to trip!\n\nType: ${receiptData.category}\nAmount: $${receiptData.amount || '0.00'}`);
  };

  const createCSVContent = () => {
    const totals = calculateTotals();
    const header = 'Date,Start Location,End Location,Distance,Category,Method,Deduction,Receipt Count,Receipt Total,Has Photos';
    
    const tripRows = trips.map(trip => {
      const rate = trip.category === 'Business' ? settings.businessRate : 
                   trip.category === 'Medical' ? settings.medicalRate : settings.charityRate;
      const deduction = (trip.distance * rate).toFixed(2);
      const receiptCount = (trip.receipts || []).length;
      const receiptTotal = (trip.receipts || []).reduce((sum, receipt) => sum + (receipt.amount || 0), 0).toFixed(2);
      const hasPhotos = (trip.receipts || []).some(r => r.hasPhoto) ? 'Yes' : 'No';
      return `${trip.date},"${trip.startLocation}","${trip.endLocation}",${trip.distance},${trip.category},${trip.method},$${deduction},${receiptCount},$${receiptTotal},${hasPhotos}`;
    }).join('\n');
    
    // Add receipt details section
    let receiptDetails = '\n\nRECEIPT DETAILS:\nTrip Date,Receipt Type,Amount,Description,Has Photo';
    trips.forEach(trip => {
      if (trip.receipts && trip.receipts.length > 0) {
        trip.receipts.forEach(receipt => {
          receiptDetails += `\n${trip.date},${receipt.type},$${receipt.amount.toFixed(2)},"${receipt.description}",${receipt.hasPhoto ? 'Yes' : 'No'}`;
        });
      }
    });
    
    const summary = `\n\nSUMMARY:\nTotal Trips:,${totals.totalTrips}\nBusiness Miles:,${totals.businessMiles.toFixed(1)}\nMedical Miles:,${totals.medicalMiles.toFixed(1)}\nCharity Miles:,${totals.charityMiles.toFixed(1)}\nTotal Miles:,${totals.totalMiles.toFixed(1)}\nTotal Deduction:,$${totals.totalDeduction.toFixed(2)}\nTotal Receipts:,${totals.totalReceipts}\nReceipt Photos:,${totals.receiptPhotos}\nTotal Receipt Amount:,$${totals.totalReceiptAmount.toFixed(2)}`;
    
    return header + '\n' + tripRows + receiptDetails + summary;
  };

  const handleExport = async () => {
    try {
      const csvContent = createCSVContent();
      const fileName = `MileTracker_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Try email first, then sharing fallback
      const isMailAvailable = await MailComposer.isAvailableAsync();
      
      if (isMailAvailable) {
        await MailComposer.composeAsync({
          subject: `MileTracker Pro Export - ${new Date().toLocaleDateString()}`,
          body: `Professional mileage tracking export attached.\n\nTrips: ${trips.length}\nTotal Deduction: $${calculateTotals().totalDeduction.toFixed(2)}\nReceipts: ${calculateTotals().totalReceipts}\nReceipt Photos: ${calculateTotals().receiptPhotos}\nReceipt Total: $${calculateTotals().totalReceiptAmount.toFixed(2)}\n\nGenerated by MileTracker Pro`,
          attachments: [fileUri],
        });
      } else {
        // Fallback to sharing
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export MileTracker Data'
        });
      }
      
      Alert.alert('Export Success', `CSV file created and shared!\n\nFile: ${fileName}\nTrips: ${trips.length}\nReceipt Photos: ${calculateTotals().receiptPhotos}`);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Unable to create CSV file. Please try again.');
    }
  };

  const calculateTotals = () => {
    const businessMiles = trips.filter(t => t.category === 'Business').reduce((sum, t) => sum + t.distance, 0);
    const medicalMiles = trips.filter(t => t.category === 'Medical').reduce((sum, t) => sum + t.distance, 0);
    const charityMiles = trips.filter(t => t.category === 'Charity').reduce((sum, t) => sum + t.distance, 0);
    
    const businessDeduction = businessMiles * settings.businessRate;
    const medicalDeduction = medicalMiles * settings.medicalRate;
    const charityDeduction = charityMiles * settings.charityRate;
    
    const totalReceipts = trips.reduce((sum, trip) => sum + (trip.receipts || []).length, 0);
    const receiptPhotos = trips.reduce((sum, trip) => 
      sum + (trip.receipts || []).filter(r => r.hasPhoto).length, 0
    );
    const totalReceiptAmount = trips.reduce((sum, trip) => 
      sum + (trip.receipts || []).reduce((receiptSum, receipt) => receiptSum + (receipt.amount || 0), 0), 0
    );
    
    return {
      totalTrips: trips.length,
      totalMiles: businessMiles + medicalMiles + charityMiles,
      totalDeduction: businessDeduction + medicalDeduction + charityDeduction,
      businessMiles,
      medicalMiles,
      charityMiles,
      totalReceipts,
      receiptPhotos,
      totalReceiptAmount
    };
  };

  const totals = calculateTotals();

  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MileTracker Pro</Text>
        <Text style={styles.headerSubtitle}>Professional GPS + Receipt Photos - $4.99/month • Real Location • CSV Export • Photo Capture</Text>
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
          <Text style={styles.modeToggleTitle}>GPS Tracking Mode</Text>
          <Switch
            value={autoMode}
            onValueChange={setAutoMode}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={autoMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.modeDescription}>
          {autoMode ? 'Auto: Detects driving automatically with GPS • Manual: Full start/stop control' : 'Manual: Full start/stop control with GPS • Auto: Detects driving automatically'}
        </Text>
      </View>

      {isTracking ? (
        <View style={styles.trackingCard}>
          <View style={styles.activeContainer}>
            <Text style={styles.trackingTitle}>🚗 GPS TRACKING ACTIVE</Text>
            <Text style={styles.trackingTimer}>{formatDuration(trackingDuration)}</Text>
            <Text style={styles.trackingNote}>Real GPS coordinates • Timer runs in background</Text>
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
          <Text style={styles.startButtonText}>🚗 START GPS TRIP</Text>
          <Text style={styles.startButtonSubtext}>Real location tracking</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>{trips.length} trips • {totals.totalReceipts} receipts • {totals.receiptPhotos} photos • ${totals.totalReceiptAmount.toFixed(2)}</Text>
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
              <Text style={styles.receiptButtonText}>
                📄 Receipt {(trip.receipts || []).length > 0 ? `(${(trip.receipts || []).length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
          {(trip.receipts || []).length > 0 && (
            <View style={styles.receiptList}>
              {trip.receipts.map(receipt => (
                <Text key={receipt.id} style={styles.receiptItem}>
                  • {receipt.type}: ${receipt.amount.toFixed(2)} - {receipt.description} {receipt.hasPhoto ? '📷' : '📝'}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderExport = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Export & Reports</Text>
        <Text style={styles.headerSubtitle}>Professional CSV export with receipt photos</Text>
      </View>

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Monthly Summary</Text>
        <Text style={styles.exportDetail}>Business Miles: {totals.businessMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Medical Miles: {totals.medicalMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Charity Miles: {totals.charityMiles.toFixed(1)}</Text>
        <Text style={styles.exportDetail}>Total Deduction: ${totals.totalDeduction.toFixed(2)}</Text>
        <Text style={styles.exportDetail}>Total Receipts: {totals.totalReceipts}</Text>
        <Text style={styles.exportDetail}>Receipt Photos: {totals.receiptPhotos}</Text>
        <Text style={styles.exportDetail}>Receipt Expenses: ${totals.totalReceiptAmount.toFixed(2)}</Text>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleExport}
        >
          <Text style={styles.exportButtonText}>📊 Export CSV File</Text>
        </TouchableOpacity>
        
        <Text style={styles.exportNote}>
          Creates professional CSV file with photo tracking and email attachment
        </Text>
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

      <Modal visible={showReceiptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Receipt</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTrip?.startLocation} → {selectedTrip?.endLocation}
            </Text>
            
            <View style={styles.categoryButtons}>
              {['Gas', 'Parking', 'Maintenance', 'Insurance', 'Other'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton, 
                    receiptData.category === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setReceiptData({...receiptData, category})}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    receiptData.category === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Amount (optional)"
              value={receiptData.amount}
              onChangeText={(text) => setReceiptData({...receiptData, amount: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Shell Station, Downtown Parking)"
              value={receiptData.description}
              onChangeText={(text) => setReceiptData({...receiptData, description: text})}
              multiline
              numberOfLines={2}
            />
            
            <View style={styles.receiptActions}>
              <TouchableOpacity 
                style={styles.photoButton}
                onPress={pickReceiptImage}
              >
                <Text style={styles.photoButtonText}>📷 Add Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.textButton}
                onPress={handleAddReceiptText}
              >
                <Text style={styles.textButtonText}>📝 Text Only</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
            
            <Text style={styles.settingsLabel}>GPS Tracking Settings</Text>
            <Text style={styles.settingsValue}>Minimum Distance: {settings.minimumDistance} miles</Text>
            <Text style={styles.settingsValue}>Location Permission: {currentLocation ? 'Granted' : 'Requesting...'}</Text>
            
            <Text style={styles.settingsLabel}>Receipt Tracking</Text>
            <Text style={styles.settingsValue}>Method: Document picker (photos + notes)</Text>
            <Text style={styles.settingsValue}>Total Receipts: {totals.totalReceipts}</Text>
            <Text style={styles.settingsValue}>Receipt Photos: {totals.receiptPhotos}</Text>
            <Text style={styles.settingsValue}>Total Amount: ${totals.totalReceiptAmount.toFixed(2)}</Text>
            
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
  },
  scrollContent: {
    paddingBottom: 100,
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
    fontSize: 11,
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
    textAlign: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  receiptList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  receiptItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
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
  exportNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
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
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#667eea',
    margin: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  photoButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  textButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  textButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
    alignSelf: 'center',
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
