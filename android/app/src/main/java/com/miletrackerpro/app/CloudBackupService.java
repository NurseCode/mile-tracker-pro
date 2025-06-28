package com.miletrackerpro.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.util.Log;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * MileTracker Pro - Cloud Backup Service
 * Adds API backup to existing native Android auto detection
 * 2025-06-28 08:56 EDT
 */
public class CloudBackupService {
    private static final String TAG = "CloudBackup";
    private static final String API_BASE_URL = "https://18fab652-f2dd-4a28-bd0a-3e89d59cb6d2-00-1bhb79n061bsu.riker.replit.dev/api";
    private static final String PREFS_NAME = "CloudBackupPrefs";
    private static final String DEVICE_ID_KEY = "device_id";
    
    private Context context;
    private String deviceId;
    private String userTimezone;
    private ExecutorService executor;
    private SharedPreferences prefs;
    
    public CloudBackupService(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.userTimezone = TimeZone.getDefault().getID(); // Automatically gets EDT
        this.executor = Executors.newSingleThreadExecutor();
        this.deviceId = getOrCreateDeviceId();
        
        Log.d(TAG, "Initialized with device ID: " + deviceId + ", timezone: " + userTimezone);
    }
    
    /**
     * Generate or retrieve unique device ID
     */
    private String getOrCreateDeviceId() {
        String existingId = prefs.getString(DEVICE_ID_KEY, null);
        
        if (existingId != null) {
            return existingId;
        }
        
        // Create new device ID
        String androidId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
        String newDeviceId = "android_" + androidId.substring(0, Math.min(androidId.length(), 16));
        
        // Save for future use
        prefs.edit().putString(DEVICE_ID_KEY, newDeviceId).apply();
        
        return newDeviceId;
    }
    
    /**
     * Backup trip to cloud (async, non-blocking)
     * Integrates with existing Trip.java model
     */
    public void backupTrip(Trip trip) {
        executor.execute(() -> {
            try {
                JSONObject tripJson = new JSONObject();
                tripJson.put("id", trip.getId());
                tripJson.put("deviceId", deviceId);
                tripJson.put("timezone", userTimezone);
                tripJson.put("startAddress", trip.getStartAddress());
                tripJson.put("endAddress", trip.getEndAddress());
                tripJson.put("startLatitude", trip.getStartLatitude());
                tripJson.put("startLongitude", trip.getStartLongitude());
                tripJson.put("endLatitude", trip.getEndLatitude());
                tripJson.put("endLongitude", trip.getEndLongitude());
                tripJson.put("distance", trip.getDistance());
                tripJson.put("duration", trip.getDuration());
                tripJson.put("startTime", trip.getStartTime());
                tripJson.put("endTime", trip.getEndTime());
                tripJson.put("category", trip.getCategory());
                tripJson.put("isAutoDetected", trip.isAutoDetected());
                
                String response = postToAPI("/trips", tripJson.toString());
                Log.d(TAG, "Trip backed up successfully: " + response);
                
            } catch (Exception e) {
                Log.w(TAG, "Backup failed (continuing with local storage): " + e.getMessage());
                // Graceful failure - app continues working with local storage
            }
        });
    }
    
    /**
     * Update trip addresses when geocoding completes
     * Call this after address lookup finishes
     */
    public void updateTripAddresses(long tripId, String startAddress, String endAddress) {
        executor.execute(() -> {
            try {
                JSONObject updateJson = new JSONObject();
                updateJson.put("deviceId", deviceId);
                updateJson.put("startAddress", startAddress);
                updateJson.put("endAddress", endAddress);
                
                String response = patchToAPI("/trips/" + tripId + "/addresses", updateJson.toString());
                Log.d(TAG, "Addresses updated: " + response);
                
            } catch (Exception e) {
                Log.w(TAG, "Address update failed: " + e.getMessage());
            }
        });
    }
    
    /**
     * HTTP POST helper
     */
    private String postToAPI(String endpoint, String jsonData) throws Exception {
        URL url = new URL(API_BASE_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "MileTracker-Pro-Android");
        conn.setDoOutput(true);
        conn.setConnectTimeout(5000); // 5 second timeout
        conn.setReadTimeout(10000);   // 10 second timeout
        
        // Send JSON data
        try (OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream())) {
            writer.write(jsonData);
            writer.flush();
        }
        
        // Read response
        StringBuilder response = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
        }
        
        return response.toString();
    }
    
    /**
     * HTTP PATCH helper
     */
    private String patchToAPI(String endpoint, String jsonData) throws Exception {
        URL url = new URL(API_BASE_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        conn.setRequestMethod("PATCH");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "MileTracker-Pro-Android");
        conn.setDoOutput(true);
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10000);
        
        try (OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream())) {
            writer.write(jsonData);
            writer.flush();
        }
        
        StringBuilder response = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
        }
        
        return response.toString();
    }
    
    /**
     * Clean up resources
     */
    public void shutdown() {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdown();
        }
    }
}
