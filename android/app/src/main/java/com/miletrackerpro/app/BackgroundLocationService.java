package com.miletrackerpro.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactApplicationContext;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

public class BackgroundLocationService extends Service implements LocationListener {
    
    public static final String ACTION_START_TRACKING = "START_TRACKING";
    public static final String ACTION_STOP_TRACKING = "STOP_TRACKING";
    
    private static final String CHANNEL_ID = "MileTrackerGPS";
    private static final int NOTIFICATION_ID = 1001;
    
    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private SharedPreferences prefs;
    
    // Trip detection variables
    private List<LocationReading> speedReadings = new ArrayList<>();
    private JSONObject currentTrip = null;
    private boolean isTracking = false;
    private int stationaryCount = 0;
    private int movingCount = 0;
    
    private static final double TRIP_START_SPEED_MPH = 8.0;
    private static final double TRIP_END_SPEED_MPH = 3.0;
    private static final int MIN_READINGS_FOR_START = 3;
    private static final int MIN_READINGS_FOR_END = 4;
    private static final double MIN_TRIP_DISTANCE_MILES = 0.5;
    private static final long MAX_TRIP_DURATION_MS = 10 * 60 * 1000; // 10 minutes
    
    private class LocationReading {
        double latitude;
        double longitude;
        double speedMph;
        long timestamp;
        float accuracy;
        
        LocationReading(double lat, double lon, double speed, long time, float acc) {
            this.latitude = lat;
            this.longitude = lon;
            this.speedMph = Math.max(0, speed * 2.237); // m/s to mph
            this.timestamp = time;
            this.accuracy = acc;
        }
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("MileTrackerGPS", Context.MODE_PRIVATE);
        createNotificationChannel();
        
        // Acquire wake lock to prevent system from sleeping
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, 
                                          "MileTracker::BackgroundGPS");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_START_TRACKING.equals(action)) {
                startTracking();
            } else if (ACTION_STOP_TRACKING.equals(action)) {
                stopTracking();
            }
        }
        
        return START_STICKY; // Restart service if killed by system
    }
    
    private void startTracking() {
        if (isTracking) return;
        
        try {
            // Check if auto mode is enabled
            boolean autoMode = prefs.getBoolean("autoMode", true);
            if (!autoMode) {
                sendStatusUpdate("Auto mode disabled - tracking stopped");
                return;
            }
            
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            
            // Start foreground service with notification
            Notification notification = createNotification("Background GPS Active", 
                                                          "Monitoring for trips automatically");
            startForeground(NOTIFICATION_ID, notification);
            
            // Acquire wake lock
            if (!wakeLock.isHeld()) {
                wakeLock.acquire(60 * 60 * 1000L); // 1 hour max
            }
            
            // Request location updates - optimized for battery
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    15000, // 15 seconds minimum time
                    20,    // 20 meters minimum distance
                    this
                );
            }
            
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    30000, // 30 seconds for network
                    50,    // 50 meters minimum distance
                    this
                );
            }
            
            isTracking = true;
            prefs.edit().putBoolean("isTracking", true).apply();
            sendStatusUpdate("Background GPS tracking started");
            
        } catch (SecurityException e) {
            sendStatusUpdate("Location permission denied - Check phone settings");
        } catch (Exception e) {
            sendStatusUpdate("Failed to start GPS tracking: " + e.getMessage());
        }
    }
    
    private void stopTracking() {
        if (!isTracking) return;
        
        try {
            if (locationManager != null) {
                locationManager.removeUpdates(this);
            }
            
            // End current trip if active
            if (currentTrip != null) {
                forceEndCurrentTrip();
            }
            
            // Release wake lock
            if (wakeLock.isHeld()) {
                wakeLock.release();
            }
            
            isTracking = false;
            prefs.edit().putBoolean("isTracking", false).apply();
            sendStatusUpdate("Background GPS tracking stopped");
            
            stopForeground(true);
            stopSelf();
            
        } catch (Exception e) {
            sendStatusUpdate("Error stopping GPS tracking: " + e.getMessage());
        }
    }
    
    @Override
    public void onLocationChanged(Location location) {
        if (!isTracking) return;
        
        try {
            double latitude = location.getLatitude();
            double longitude = location.getLongitude();
            double speed = location.hasSpeed() ? location.getSpeed() : 0.0;
            float accuracy = location.getAccuracy();
            long timestamp = System.currentTimeMillis();
            
            // Send location update to React Native
            sendLocationUpdate(latitude, longitude, speed, accuracy);
            
            // Add to speed readings for trip detection
            LocationReading reading = new LocationReading(latitude, longitude, speed, timestamp, accuracy);
            speedReadings.add(reading);
            
            // Keep only last 15 readings for analysis
            if (speedReadings.size() > 15) {
                speedReadings.remove(0);
            }
            
            // Process for automatic trip detection
            processLocationForTripDetection(reading);
            
        } catch (Exception e) {
            sendStatusUpdate("Location processing error: " + e.getMessage());
        }
    }
    
    private void processLocationForTripDetection(LocationReading currentReading) {
        if (speedReadings.size() < 3) return;
        
        // Calculate average speed from recent readings
        double avgSpeed = 0;
        int validReadings = 0;
        
        for (int i = Math.max(0, speedReadings.size() - 5); i < speedReadings.size(); i++) {
            LocationReading reading = speedReadings.get(i);
            if (reading.accuracy < 100) { // Only use accurate readings
                avgSpeed += reading.speedMph;
                validReadings++;
            }
        }
        
        if (validReadings == 0) return;
        avgSpeed /= validReadings;
        
        // Trip start detection
        if (currentTrip == null && avgSpeed > TRIP_START_SPEED_MPH && speedReadings.size() >= MIN_READINGS_FOR_START) {
            boolean recentHighSpeed = true;
            int highSpeedCount = 0;
            
            for (int i = Math.max(0, speedReadings.size() - MIN_READINGS_FOR_START); i < speedReadings.size(); i++) {
                if (speedReadings.get(i).speedMph > TRIP_START_SPEED_MPH) {
                    highSpeedCount++;
                }
            }
            
            if (highSpeedCount >= 2) { // At least 2 of last 3 readings > threshold
                startTrip(currentReading);
            }
        }
        
        // Trip end detection
        if (currentTrip != null) {
            // Add location to current trip path
            try {
                JSONArray path = currentTrip.getJSONArray("path");
                JSONObject locationPoint = new JSONObject();
                locationPoint.put("latitude", currentReading.latitude);
                locationPoint.put("longitude", currentReading.longitude);
                locationPoint.put("speed", currentReading.speedMph);
                locationPoint.put("timestamp", currentReading.timestamp);
                path.put(locationPoint);
                
            } catch (JSONException e) {
                // Handle JSON error
            }
            
            // Check for trip end conditions
            if (avgSpeed < TRIP_END_SPEED_MPH && speedReadings.size() >= MIN_READINGS_FOR_END) {
                boolean recentLowSpeed = true;
                int lowSpeedCount = 0;
                
                for (int i = Math.max(0, speedReadings.size() - MIN_READINGS_FOR_END); i < speedReadings.size(); i++) {
                    if (speedReadings.get(i).speedMph < TRIP_END_SPEED_MPH) {
                        lowSpeedCount++;
                    }
                }
                
                if (lowSpeedCount >= 3) { // At least 3 of last 4 readings < threshold
                    stationaryCount++;
                    if (stationaryCount >= 2) { // 2 confirmations of being stationary
                        endTrip(currentReading);
                    }
                } else {
                    stationaryCount = 0; // Reset if moving again
                }
            } else {
                stationaryCount = 0;
            }
            
            // Force end trip after maximum duration
            try {
                long startTime = currentTrip.getLong("startTime");
                if (currentReading.timestamp - startTime > MAX_TRIP_DURATION_MS) {
                    forceEndCurrentTrip();
                }
            } catch (JSONException e) {
                // Handle JSON error
            }
        }
    }
    
    private void startTrip(LocationReading startReading) {
        try {
            currentTrip = new JSONObject();
            currentTrip.put("id", System.currentTimeMillis());
            currentTrip.put("startTime", startReading.timestamp);
            currentTrip.put("startLatitude", startReading.latitude);
            currentTrip.put("startLongitude", startReading.longitude);
            currentTrip.put("method", "GPS_AUTO_BACKGROUND");
            currentTrip.put("category", "Business");
            
            JSONArray path = new JSONArray();
            JSONObject startPoint = new JSONObject();
            startPoint.put("latitude", startReading.latitude);
            startPoint.put("longitude", startReading.longitude);
            startPoint.put("speed", startReading.speedMph);
            startPoint.put("timestamp", startReading.timestamp);
            path.put(startPoint);
            currentTrip.put("path", path);
            
            movingCount = 0;
            stationaryCount = 0;
            
            prefs.edit().putBoolean("hasActiveTrip", true).apply();
            
            sendTripEvent("TRIP_STARTED", currentTrip.toString());
            sendStatusUpdate("🚗 Trip started automatically - Speed: " + 
                           String.format("%.1f", startReading.speedMph) + " mph");
            
            // Update notification
            Notification notification = createNotification("Trip in Progress", 
                                                          "Recording your journey automatically");
            startForeground(NOTIFICATION_ID, notification);
            
        } catch (JSONException e) {
            sendStatusUpdate("Error starting trip: " + e.getMessage());
        }
    }
    
    private void endTrip(LocationReading endReading) {
        if (currentTrip == null) return;
        
        try {
            currentTrip.put("endTime", endReading.timestamp);
            currentTrip.put("endLatitude", endReading.latitude);
            currentTrip.put("endLongitude", endReading.longitude);
            
            // Calculate trip distance
            double distance = calculateTripDistance();
            currentTrip.put("distance", distance);
            
            long startTime = currentTrip.getLong("startTime");
            long duration = endReading.timestamp - startTime;
            currentTrip.put("duration", duration);
            
            // Only save trips over minimum distance
            if (distance >= MIN_TRIP_DISTANCE_MILES) {
                saveCompletedTrip();
                sendTripEvent("TRIP_COMPLETED", currentTrip.toString());
                sendStatusUpdate("✅ Trip completed automatically - " + 
                               String.format("%.1f", distance) + " miles");
            } else {
                sendStatusUpdate("Trip too short (" + String.format("%.1f", distance) + 
                               " mi) - Not saved");
            }
            
            currentTrip = null;
            movingCount = 0;
            stationaryCount = 0;
            speedReadings.clear();
            
            prefs.edit().putBoolean("hasActiveTrip", false).apply();
            
            // Update notification back to monitoring
            Notification notification = createNotification("Background GPS Active", 
                                                          "Monitoring for trips automatically");
            startForeground(NOTIFICATION_ID, notification);
            
        } catch (JSONException e) {
            sendStatusUpdate("Error ending trip: " + e.getMessage());
        }
    }
    
    private void forceEndCurrentTrip() {
        if (currentTrip != null && speedReadings.size() > 0) {
            LocationReading lastReading = speedReadings.get(speedReadings.size() - 1);
            endTrip(lastReading);
        }
    }
    
    private double calculateTripDistance() {
        if (currentTrip == null) return 0;
        
        try {
            JSONArray path = currentTrip.getJSONArray("path");
            if (path.length() < 2) return 0;
            
            double totalDistance = 0;
            
            for (int i = 1; i < path.length(); i++) {
                JSONObject prev = path.getJSONObject(i - 1);
                JSONObject curr = path.getJSONObject(i);
                
                double lat1 = prev.getDouble("latitude");
                double lon1 = prev.getDouble("longitude");
                double lat2 = curr.getDouble("latitude");
                double lon2 = curr.getDouble("longitude");
                
                double segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
                
                // Filter out GPS noise
                if (segmentDistance > 1 && segmentDistance < 1000) { // 1m to 1km segments
                    totalDistance += segmentDistance;
                }
            }
            
            return totalDistance * 0.000621371; // meters to miles
            
        } catch (JSONException e) {
            return 0;
        }
    }
    
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000; // Earth's radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    private void saveCompletedTrip() {
        if (currentTrip == null) return;
        
        try {
            // Get existing trips from SharedPreferences
            String existingTrips = prefs.getString("completedTrips", "[]");
            JSONArray tripsArray = new JSONArray(existingTrips);
            
            // Add current trip
            tripsArray.put(currentTrip);
            
            // Save back to SharedPreferences
            prefs.edit().putString("completedTrips", tripsArray.toString()).apply();
            
        } catch (JSONException e) {
            sendStatusUpdate("Error saving trip: " + e.getMessage());
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "MileTracker GPS",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background GPS tracking for automatic mileage logging");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification(String title, String content) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setColor(ContextCompat.getColor(this, android.R.color.holo_blue_bright))
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    private void sendLocationUpdate(double latitude, double longitude, double speed, float accuracy) {
        try {
            ReactApplication app = (ReactApplication) getApplication();
            ReactInstanceManager reactInstanceManager = app.getReactNativeHost().getReactInstanceManager();
            ReactApplicationContext reactContext = (ReactApplicationContext) reactInstanceManager.getCurrentReactContext();
            
            if (reactContext != null) {
                MileTrackerGPSModule.sendLocationUpdate(reactContext, latitude, longitude, speed, accuracy);
            }
        } catch (Exception e) {
            // React context not available - app may be closed
        }
    }
    
    private void sendTripEvent(String eventType, String tripData) {
        try {
            ReactApplication app = (ReactApplication) getApplication();
            ReactInstanceManager reactInstanceManager = app.getReactNativeHost().getReactInstanceManager();
            ReactApplicationContext reactContext = (ReactApplicationContext) reactInstanceManager.getCurrentReactContext();
            
            if (reactContext != null) {
                MileTrackerGPSModule.sendTripEvent(reactContext, eventType, tripData);
            }
        } catch (Exception e) {
            // React context not available - app may be closed
        }
    }
    
    private void sendStatusUpdate(String status) {
        try {
            ReactApplication app = (ReactApplication) getApplication();
            ReactInstanceManager reactInstanceManager = app.getReactNativeHost().getReactInstanceManager();
            ReactApplicationContext reactContext = (ReactApplicationContext) reactInstanceManager.getCurrentReactContext();
            
            if (reactContext != null) {
                MileTrackerGPSModule.sendStatusUpdate(reactContext, status);
            }
        } catch (Exception e) {
            // React context not available - app may be closed
        }
    }
    
    @Override
    public void onProviderEnabled(String provider) {}
    
    @Override
    public void onProviderDisabled(String provider) {
        sendStatusUpdate("GPS provider disabled: " + provider);
    }
    
    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
    }
}
