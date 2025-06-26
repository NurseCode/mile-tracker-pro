package com.miletrackerpro.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;
import org.json.JSONException;

public class MileTrackerGPSModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "MileTrackerGPS";
    private ReactApplicationContext reactContext;
    
    public MileTrackerGPSModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    @ReactMethod
    public void startBackgroundTracking(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
            serviceIntent.setAction(BackgroundLocationService.ACTION_START_TRACKING);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            promise.resolve("Background tracking started");
        } catch (Exception e) {
            promise.reject("GPS_ERROR", "Failed to start background tracking: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void stopBackgroundTracking(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
            serviceIntent.setAction(BackgroundLocationService.ACTION_STOP_TRACKING);
            context.startService(serviceIntent);
            
            promise.resolve("Background tracking stopped");
        } catch (Exception e) {
            promise.reject("GPS_ERROR", "Failed to stop background tracking: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void getTrackingStatus(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("MileTrackerGPS", Context.MODE_PRIVATE);
            boolean isTracking = prefs.getBoolean("isTracking", false);
            boolean hasActiveTrip = prefs.getBoolean("hasActiveTrip", false);
            
            WritableMap status = Arguments.createMap();
            status.putBoolean("isTracking", isTracking);
            status.putBoolean("hasActiveTrip", hasActiveTrip);
            
            promise.resolve(status);
        } catch (Exception e) {
            promise.reject("GPS_ERROR", "Failed to get tracking status: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void setAutoMode(boolean autoMode, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("MileTrackerGPS", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("autoMode", autoMode).apply();
            
            // If auto mode is disabled, stop tracking
            if (!autoMode) {
                Context context = getReactApplicationContext();
                Intent serviceIntent = new Intent(context, BackgroundLocationService.class);
                serviceIntent.setAction(BackgroundLocationService.ACTION_STOP_TRACKING);
                context.startService(serviceIntent);
            }
            
            promise.resolve("Auto mode updated");
        } catch (Exception e) {
            promise.reject("GPS_ERROR", "Failed to set auto mode: " + e.getMessage());
        }
    }
    
    // Send events to React Native
    public static void sendLocationUpdate(ReactApplicationContext reactContext, 
                                        double latitude, double longitude, 
                                        double speed, float accuracy) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putDouble("latitude", latitude);
            params.putDouble("longitude", longitude);
            params.putDouble("speed", speed);
            params.putDouble("accuracy", accuracy);
            params.putDouble("timestamp", System.currentTimeMillis());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("MileTrackerLocationUpdate", params);
        }
    }
    
    public static void sendTripEvent(ReactApplicationContext reactContext, 
                                   String eventType, String tripData) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("eventType", eventType);
            params.putString("tripData", tripData);
            params.putDouble("timestamp", System.currentTimeMillis());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("MileTrackerTripEvent", params);
        }
    }
    
    public static void sendStatusUpdate(ReactApplicationContext reactContext, String status) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("status", status);
            params.putDouble("timestamp", System.currentTimeMillis());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("MileTrackerStatusUpdate", params);
        }
    }
}
