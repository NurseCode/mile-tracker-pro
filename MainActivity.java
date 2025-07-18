package com.miletrackerpro.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.provider.Settings;
import android.text.Html;
import android.text.InputType;
import android.text.Spanned;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.miletrackerpro.app.auth.UserAuthManager;
import com.miletrackerpro.app.services.AutoDetectionService;
import com.miletrackerpro.app.services.ManualTripService;
import com.miletrackerpro.app.services.BluetoothVehicleService;
import com.miletrackerpro.app.storage.Trip;
import com.miletrackerpro.app.storage.TripStorage;
import android.net.Uri;
import java.io.File;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import android.graphics.pdf.PdfDocument;
import android.graphics.Canvas;
import android.graphics.Paint;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.json.JSONArray;
import org.json.JSONObject;
import androidx.appcompat.app.AlertDialog;
import android.widget.TimePicker;

public class MainActivity extends AppCompatActivity implements LocationListener {
    private static final String TAG = "MainActivity";
    private static final int LOCATION_PERMISSION_REQUEST = 1;
    private static final int BACKGROUND_LOCATION_PERMISSION_REQUEST = 2;
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "DEBUG_CHANNEL";
    
    // UI Components
    private Button startButton, stopButton, refreshButton, settingsButton, authButton;
    private Button exportButton, clearButton, mergeButton, autoToggle;
    private TextView statusText, speedText, distanceText, currentLocationText;
    private TextView statisticsText, recentTripsText;
    private TextView bluetoothStatusText, connectedVehicleText;
    private LinearLayout tripsContent, categorizedContent;
    private ScrollView scrollView;
    private int currentTab = 1;
    private boolean isClassifyTabVisible = false;
    private BroadcastReceiver bluetoothUpdateReceiver;
    private BroadcastReceiver vehicleUpdateReceiver;
    
    // Services and Storage
    private TripStorage tripStorage;
    private UserAuthManager authManager;
    private CloudBackupService cloudBackupService;
    private LocationManager locationManager;
    private boolean isTracking = false;
    private boolean bluetoothServiceStarted = false;
    
    // Trip Management
    private Trip currentTrip = null;
    private Location lastLocation = null;
    private double currentSpeed = 0.0;
    private double currentDistance = 0.0;
    private int notificationCounter = 1;
    
    // Constants
    private static final double SPEED_THRESHOLD = 3.0; // mph
    private static final long LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
    private static final long LOCATION_UPDATE_MIN_DISTANCE = 10; // 10 meters
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        Log.d(TAG, "MainActivity onCreate started");
        
        // Initialize storage and services
        tripStorage = new TripStorage(this);
        authManager = new UserAuthManager(this);
        cloudBackupService = new CloudBackupService(this);
        
        // Initialize UI components
        initializeUI();
        
        // Create notification channel
        createNotificationChannel();
        
        // Register receivers
        registerVehicleUpdateReceiver();
        
        // Request permissions
        requestPermissions();
        
        // Start Bluetooth service
        startBluetoothService();
        
        // Initialize GPS
        initializeGPS();
        
        // Update UI
        updateUI();
        
        Log.d(TAG, "MainActivity onCreate completed");
    }
    
    private void initializeUI() {
        // Initialize basic UI components
        startButton = findViewById(R.id.start_button);
        stopButton = findViewById(R.id.stop_button);
        refreshButton = findViewById(R.id.refresh_button);
        settingsButton = findViewById(R.id.settings_button);
        authButton = findViewById(R.id.auth_button);
        exportButton = findViewById(R.id.export_button);
        clearButton = findViewById(R.id.clear_button);
        mergeButton = findViewById(R.id.merge_button);
        autoToggle = findViewById(R.id.auto_toggle);
        
        statusText = findViewById(R.id.status_text);
        speedText = findViewById(R.id.speed_text);
        distanceText = findViewById(R.id.distance_text);
        currentLocationText = findViewById(R.id.current_location_text);
        statisticsText = findViewById(R.id.statistics_text);
        recentTripsText = findViewById(R.id.recent_trips_text);
        bluetoothStatusText = findViewById(R.id.bluetooth_status_text);
        connectedVehicleText = findViewById(R.id.connected_vehicle_text);
        
        tripsContent = findViewById(R.id.trips_content);
        categorizedContent = findViewById(R.id.categorized_content);
        scrollView = findViewById(R.id.scroll_view);
        
        // Set up button listeners
        setupButtonListeners();
        
        // Initialize tab system
        initializeTabSystem();
    }
    
    private void setupButtonListeners() {
        startButton.setOnClickListener(v -> startManualTrip());
        stopButton.setOnClickListener(v -> stopManualTrip());
        refreshButton.setOnClickListener(v -> updateUI());
        settingsButton.setOnClickListener(v -> showSettingsDialog());
        authButton.setOnClickListener(v -> showAuthDialog());
        exportButton.setOnClickListener(v -> exportTripData());
        clearButton.setOnClickListener(v -> clearTripData());
        mergeButton.setOnClickListener(v -> mergeTripData());
        autoToggle.setOnClickListener(v -> toggleAutoDetection());
    }
    
    private void initializeTabSystem() {
        // Tab system initialization
        Button tab1 = findViewById(R.id.tab1);
        Button tab2 = findViewById(R.id.tab2);
        Button tab3 = findViewById(R.id.tab3);
        
        if (tab1 != null) tab1.setOnClickListener(v -> switchToTab(1));
        if (tab2 != null) tab2.setOnClickListener(v -> switchToTab(2));
        if (tab3 != null) tab3.setOnClickListener(v -> switchToTab(3));
        
        switchToTab(1); // Default to home tab
    }
    
    private void requestPermissions() {
        // Request location permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
        } else {
            initializeGPS();
            
            // Request background location for Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, BACKGROUND_LOCATION_PERMISSION_REQUEST);
                }
            }
        }
    }
    
    private void startBluetoothService() {
        try {
            sendDebugNotification("Starting Bluetooth vehicle service...");
            
            Intent bluetoothIntent = new Intent(this, BluetoothVehicleService.class);
            bluetoothIntent.setAction("START_BLUETOOTH_MONITORING");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(bluetoothIntent);
            } else {
                startService(bluetoothIntent);
            }
            
            bluetoothServiceStarted = true;
            sendDebugNotification("Bluetooth service started successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error starting BluetoothVehicleService: " + e.getMessage(), e);
            sendDebugNotification("Bluetooth service failed to start: " + e.getMessage());
        }
    }
    
    private void registerVehicleUpdateReceiver() {
        vehicleUpdateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (action != null) {
                    if ("com.miletrackerpro.app.NEW_VEHICLE_DETECTED".equals(action)) {
                        String deviceName = intent.getStringExtra("device_name");
                        String deviceAddress = intent.getStringExtra("device_address");
                        String source = intent.getStringExtra("source");
                        
                        sendDebugNotification("New Vehicle Detected: " + deviceName + " from " + source);
                        
                        runOnUiThread(() -> {
                            showVehicleRegistrationDialog(deviceAddress, deviceName);
                        });
                    } else if ("com.miletrackerpro.app.VEHICLE_CONNECTED".equals(action)) {
                        String deviceName = intent.getStringExtra("device_name");
                        String deviceAddress = intent.getStringExtra("device_address");
                        String source = intent.getStringExtra("source");
                        
                        sendDebugNotification("Vehicle Connected: " + deviceName + " from " + source);
                        
                        runOnUiThread(() -> {
                            connectedVehicleText.setText("Vehicle: " + deviceName);
                            bluetoothStatusText.setText("Bluetooth: Connected");
                            bluetoothStatusText.setTextColor(Color.GREEN);
                            
                            // Auto-start trip detection if enabled
                            if (isAutoDetectionEnabled()) {
                                startAutoDetection();
                            }
                        });
                    } else if ("com.miletrackerpro.app.VEHICLE_DISCONNECTED".equals(action)) {
                        String deviceName = intent.getStringExtra("device_name");
                        String deviceAddress = intent.getStringExtra("device_address");
                        String source = intent.getStringExtra("source");
                        
                        sendDebugNotification("Vehicle Disconnected: " + deviceName + " from " + source);
                        
                        runOnUiThread(() -> {
                            connectedVehicleText.setText("Vehicle: None connected");
                            bluetoothStatusText.setText("Bluetooth: Enabled");
                            bluetoothStatusText.setTextColor(Color.parseColor("#667eea"));
                            
                            // Auto-stop trip detection
                            stopAutoDetection();
                        });
                    }
                }
            }
        };
        
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.miletrackerpro.app.NEW_VEHICLE_DETECTED");
        filter.addAction("com.miletrackerpro.app.VEHICLE_CONNECTED");
        filter.addAction("com.miletrackerpro.app.VEHICLE_DISCONNECTED");
        filter.addAction("com.miletrackerpro.app.VEHICLE_REGISTERED");
        registerReceiver(vehicleUpdateReceiver, filter);
    }
    
    private void showVehicleRegistrationDialog(String deviceAddress, String deviceName) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("New Vehicle Detected");
        builder.setMessage("Register vehicle: " + deviceName + "?");
        
        // Vehicle type selection
        String[] vehicleTypes = {"Personal", "Business", "Rental", "Borrowed"};
        final String[] selectedType = {vehicleTypes[0]};
        
        builder.setSingleChoiceItems(vehicleTypes, 0, (dialog, which) -> {
            selectedType[0] = vehicleTypes[which];
        });
        
        builder.setPositiveButton("Register", (dialog, which) -> {
            registerVehicle(deviceAddress, deviceName, selectedType[0]);
        });
        
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }
    
    private void registerVehicle(String deviceAddress, String deviceName, String vehicleType) {
        try {
            Intent intent = new Intent(this, BluetoothVehicleService.class);
            intent.setAction("REGISTER_VEHICLE");
            intent.putExtra("device_address", deviceAddress);
            intent.putExtra("device_name", deviceName);
            intent.putExtra("vehicle_type", vehicleType);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
            
            sendDebugNotification("Vehicle registration sent: " + deviceName + " as " + vehicleType);
            
        } catch (Exception e) {
            Log.e(TAG, "Error registering vehicle: " + e.getMessage(), e);
            sendDebugNotification("Error registering vehicle: " + e.getMessage());
        }
    }
    
    // Auto Detection Methods
    private boolean isAutoDetectionEnabled() {
        try {
            return tripStorage.isAutoDetectionEnabled();
        } catch (Exception e) {
            Log.e(TAG, "Error checking auto detection status: " + e.getMessage(), e);
            return false;
        }
    }
    
    private void startAutoDetection() {
        try {
            sendDebugNotification("Auto Detection: Starting service...");
            
            Intent serviceIntent = new Intent(this, AutoDetectionService.class);
            serviceIntent.setAction("START_AUTO_DETECTION");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            
            runOnUiThread(() -> {
                if (autoToggle != null) {
                    autoToggle.setText("Auto Detection: ON");
                    autoToggle.setTextColor(Color.parseColor("#667eea"));
                }
            });
            
            sendDebugNotification("Auto Detection: Service started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error starting auto detection: " + e.getMessage(), e);
            sendDebugNotification("Auto Detection: Error starting service - " + e.getMessage());
        }
    }
    
    private void stopAutoDetection() {
        try {
            sendDebugNotification("Auto Detection: Stopping service...");
            
            Intent serviceIntent = new Intent(this, AutoDetectionService.class);
            serviceIntent.setAction("STOP_AUTO_DETECTION");
            stopService(serviceIntent);
            
            runOnUiThread(() -> {
                if (autoToggle != null) {
                    autoToggle.setText("Auto Detection: OFF");
                    autoToggle.setTextColor(Color.parseColor("#6c757d"));
                }
            });
            
            sendDebugNotification("Auto Detection: Service stopped successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping auto detection: " + e.getMessage(), e);
            sendDebugNotification("Auto Detection: Error stopping service - " + e.getMessage());
        }
    }
    
    private void initializeGPS() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    LOCATION_UPDATE_INTERVAL,
                    LOCATION_UPDATE_MIN_DISTANCE,
                    this
                );
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing GPS: " + e.getMessage(), e);
        }
    }
    
    private void toggleAutoDetection() {
        try {
            boolean currentState = isAutoDetectionEnabled();
            tripStorage.setAutoDetectionEnabled(!currentState);
            
            if (!currentState) {
                startAutoDetection();
            } else {
                stopAutoDetection();
            }
            
            updateUI();
        } catch (Exception e) {
            Log.e(TAG, "Error toggling auto detection: " + e.getMessage(), e);
            Toast.makeText(this, "Error toggling auto detection", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void startManualTrip() {
        try {
            Intent intent = new Intent(this, ManualTripService.class);
            intent.setAction("START_MANUAL_TRIP");
            startService(intent);
            
            isTracking = true;
            updateUI();
            
            Toast.makeText(this, "Manual trip started", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Error starting manual trip: " + e.getMessage(), e);
            Toast.makeText(this, "Error starting manual trip", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void stopManualTrip() {
        try {
            Intent intent = new Intent(this, ManualTripService.class);
            intent.setAction("STOP_MANUAL_TRIP");
            stopService(intent);
            
            isTracking = false;
            updateUI();
            
            Toast.makeText(this, "Manual trip stopped", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping manual trip: " + e.getMessage(), e);
            Toast.makeText(this, "Error stopping manual trip", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void updateUI() {
        runOnUiThread(() -> {
            try {
                // Update status
                if (isTracking) {
                    statusText.setText("Tracking active");
                    statusText.setTextColor(Color.GREEN);
                } else {
                    statusText.setText("Ready to track");
                    statusText.setTextColor(Color.parseColor("#667eea"));
                }
                
                // Update auto detection toggle
                if (isAutoDetectionEnabled()) {
                    autoToggle.setText("Auto Detection: ON");
                    autoToggle.setTextColor(Color.parseColor("#667eea"));
                } else {
                    autoToggle.setText("Auto Detection: OFF");
                    autoToggle.setTextColor(Color.parseColor("#6c757d"));
                }
                
                // Update speed and distance
                speedText.setText(String.format("Speed: %.1f mph", currentSpeed));
                distanceText.setText(String.format("Distance: %.1f miles", currentDistance));
                
                // Update statistics
                updateStatistics();
                
                // Update recent trips
                updateRecentTrips();
                
                // Update trips display based on current tab
                updateTripsDisplay();
                
            } catch (Exception e) {
                Log.e(TAG, "Error updating UI: " + e.getMessage(), e);
            }
        });
    }
    
    private void updateStatistics() {
        try {
            List<Trip> allTrips = tripStorage.getAllTrips();
            
            int totalTrips = allTrips.size();
            double totalMiles = allTrips.stream().mapToDouble(Trip::getDistance).sum();
            
            statisticsText.setText(
                "• Total Trips: " + totalTrips + "\n" +
                "• Total Miles: " + String.format("%.1f", totalMiles)
            );
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating statistics: " + e.getMessage(), e);
            statisticsText.setText("• Total Trips: 0\n• Total Miles: 0.0");
        }
    }
    
    private void updateRecentTrips() {
        try {
            List<Trip> allTrips = tripStorage.getAllTrips();
            
            if (allTrips.isEmpty()) {
                recentTripsText.setText("No recent trips");
                return;
            }
            
            // Sort by most recent first
            Collections.sort(allTrips, (a, b) -> Long.compare(b.getStartTime(), a.getStartTime()));
            
            StringBuilder sb = new StringBuilder();
            int count = Math.min(3, allTrips.size());
            
            for (int i = 0; i < count; i++) {
                Trip trip = allTrips.get(i);
                sb.append(String.format("%.1f mi • %s\n", trip.getDistance(), trip.getCategory()));
            }
            
            recentTripsText.setText(sb.toString().trim());
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating recent trips: " + e.getMessage(), e);
            recentTripsText.setText("Error loading recent trips");
        }
    }
    
    private void updateTripsDisplay() {
        // Implementation for trips display based on current tab
        // This would populate the trips list in the UI
    }
    
    private void switchToTab(int tabNumber) {
        currentTab = tabNumber;
        
        // Update tab button colors
        Button tab1 = findViewById(R.id.tab1);
        Button tab2 = findViewById(R.id.tab2);
        Button tab3 = findViewById(R.id.tab3);
        
        if (tab1 != null) tab1.setBackgroundColor(tabNumber == 1 ? Color.parseColor("#667eea") : Color.parseColor("#9CA3AF"));
        if (tab2 != null) tab2.setBackgroundColor(tabNumber == 2 ? Color.parseColor("#667eea") : Color.parseColor("#9CA3AF"));
        if (tab3 != null) tab3.setBackgroundColor(tabNumber == 3 ? Color.parseColor("#667eea") : Color.parseColor("#9CA3AF"));
        
        // Show/hide content based on tab
        LinearLayout homeContent = findViewById(R.id.home_content);
        
        if (homeContent != null) {
            homeContent.setVisibility(tabNumber == 1 ? View.VISIBLE : View.GONE);
        }
        
        if (tripsContent != null) {
            tripsContent.setVisibility(tabNumber == 2 ? View.VISIBLE : View.GONE);
        }
        
        if (categorizedContent != null) {
            categorizedContent.setVisibility(tabNumber == 3 ? View.VISIBLE : View.GONE);
        }
        
        // Update trips display
        updateTripsDisplay();
    }
    
    private void showSettingsDialog() {
        // Settings dialog implementation
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Settings");
        builder.setMessage("Settings functionality");
        builder.setPositiveButton("OK", null);
        builder.show();
    }
    
    private void showAuthDialog() {
        // Authentication dialog implementation
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Authentication");
        builder.setMessage("Authentication functionality");
        builder.setPositiveButton("OK", null);
        builder.show();
    }
    
    private void exportTripData() {
        try {
            // Export functionality
            Toast.makeText(this, "Export functionality", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Error exporting trip data: " + e.getMessage(), e);
            Toast.makeText(this, "Error exporting trip data", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void clearTripData() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Clear Trip Data");
        builder.setMessage("Are you sure you want to clear all trip data?");
        builder.setPositiveButton("Yes", (dialog, which) -> {
            try {
                tripStorage.clearAllTrips();
                updateUI();
                Toast.makeText(this, "Trip data cleared", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Log.e(TAG, "Error clearing trip data: " + e.getMessage(), e);
                Toast.makeText(this, "Error clearing trip data", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("No", null);
        builder.show();
    }
    
    private void mergeTripData() {
        // Merge functionality
        Toast.makeText(this, "Merge functionality", Toast.LENGTH_SHORT).show();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Debug Notifications";
            String description = "Debug notifications for app development";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private void sendDebugNotification(String message) {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("MileTracker Debug")
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message));
            
            notificationManager.notify(notificationCounter++, builder.build());
            
        } catch (Exception e) {
            Log.e(TAG, "Error sending debug notification: " + e.getMessage(), e);
            // Fallback to toast
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
        }
    }
    
    // LocationListener methods
    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            lastLocation = location;
            currentSpeed = location.getSpeed() * 2.237; // Convert m/s to mph
            
            // Update distance if tracking
            if (isTracking && lastLocation != null) {
                // Calculate distance using Haversine formula
                // Implementation would go here
            }
            
            // Update location display
            currentLocationText.setText(String.format("Lat: %.6f, Lng: %.6f", location.getLatitude(), location.getLongitude()));
            
            // Update UI
            updateUI();
        }
    }
    
    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}
    
    @Override
    public void onProviderEnabled(String provider) {}
    
    @Override
    public void onProviderDisabled(String provider) {}
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Location permission granted", Toast.LENGTH_SHORT).show();
                initializeGPS();
                
                // Request background location for Android 10+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, BACKGROUND_LOCATION_PERMISSION_REQUEST);
                }
            } else {
                Toast.makeText(this, "Location permission required for trip tracking", Toast.LENGTH_LONG).show();
            }
        } else if (requestCode == BACKGROUND_LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Background location permission granted", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Background location permission recommended for auto detection", Toast.LENGTH_LONG).show();
            }
        }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        
        // Unregister receivers
        if (vehicleUpdateReceiver != null) {
            try {
                unregisterReceiver(vehicleUpdateReceiver);
            } catch (IllegalArgumentException e) {
                Log.d(TAG, "Vehicle update receiver already unregistered");
            }
        }
        
        // Stop location updates
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (SecurityException e) {
                Log.d(TAG, "Location updates already stopped");
            }
        }
    }
}
