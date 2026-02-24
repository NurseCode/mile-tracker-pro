  package com.miletrackerpro.app;

  import android.Manifest;
  import android.app.ActivityManager;
  import android.app.AlertDialog;
  import android.app.DatePickerDialog;
  import android.app.PendingIntent;
  import android.content.BroadcastReceiver;
  import android.content.Context;
  import android.content.Intent;
  import android.content.IntentFilter;
  import android.content.SharedPreferences;
  import android.content.pm.PackageManager;
  import android.graphics.Color;
  import android.graphics.Typeface;
  import android.graphics.drawable.GradientDrawable;
  import android.location.Address;
  import android.location.Geocoder;
  import android.location.Location;
  import android.location.LocationListener;
  import android.location.LocationManager;
  import android.net.ConnectivityManager;
  import android.net.NetworkInfo;
  import android.os.Build;
  import android.os.Bundle;
  import android.os.Handler;
  import android.os.PowerManager;
  import android.provider.Settings;
  import android.bluetooth.BluetoothAdapter;
  import android.bluetooth.BluetoothDevice;
  import android.bluetooth.BluetoothManager;
  import android.text.Editable;
  import android.text.InputType;
  import android.text.TextUtils;
  import android.text.TextWatcher;
  import android.util.Log;
  import android.view.Gravity;
  import android.view.GestureDetector;
  import android.view.MotionEvent;
  import android.view.View;
  import android.widget.AdapterView;
  import android.widget.ArrayAdapter;
  import android.widget.Button;
  import android.widget.CheckBox;
  import android.widget.EditText;
  import android.widget.ImageButton;
  import android.widget.ImageView;
  import android.widget.LinearLayout;
  import android.widget.ScrollView;
  import android.widget.SearchView;
  import android.widget.SeekBar;
  import android.widget.Spinner;
  import android.widget.Switch;
  import android.widget.TextView;
  import android.widget.Toast;
  import androidx.appcompat.app.AppCompatActivity;
  import androidx.core.app.ActivityCompat;
  import androidx.core.content.ContextCompat;
  import androidx.work.WorkManager;
  import androidx.work.PeriodicWorkRequest;
  import androidx.work.ExistingPeriodicWorkPolicy;
  import java.util.concurrent.TimeUnit;
  import android.os.Looper;

  import okhttp3.OkHttpClient;
  import okhttp3.Request;
  import okhttp3.Response;
  import okhttp3.RequestBody;
  import okhttp3.MediaType;
  import okhttp3.Call;
  import okhttp3.Callback;

  import com.miletrackerpro.app.auth.UserAuthManager;
  import com.miletrackerpro.app.services.AutoDetectionService;
  import com.miletrackerpro.app.services.ManualTripService;
  import com.miletrackerpro.app.services.BluetoothVehicleService;
  import com.miletrackerpro.app.services.BluetoothWorker;
  import com.miletrackerpro.app.storage.Trip;
  import com.miletrackerpro.app.storage.TripStorage;
  import com.miletrackerpro.app.utils.BillingManager;
  import com.miletrackerpro.app.utils.EventTracker;
  import com.miletrackerpro.app.utils.FeedbackManager;
  import android.net.Uri;
  import java.io.File;
  import java.io.FileOutputStream;
  import java.io.ByteArrayOutputStream;
  import android.graphics.pdf.PdfDocument;
  import android.graphics.Canvas;
  import android.graphics.Paint;
  import android.graphics.Color;
  import android.graphics.Typeface;
  import android.app.NotificationChannel;
  import android.app.NotificationManager;
  import android.content.Context;
  import androidx.core.app.NotificationCompat;
  import java.io.FileWriter;
  import java.io.IOException;
  import java.text.SimpleDateFormat;
  import java.util.ArrayList;
  import java.util.Calendar;
  import java.util.Set;
  import java.util.Date;
  import java.util.List;
  import java.util.Locale;
  import androidx.core.content.FileProvider;

  public class MainActivity extends AppCompatActivity implements LocationListener {
      private static final String TAG = "MainActivity";
      private static final int LOCATION_PERMISSION_REQUEST = 1001;
      private static final int BACKGROUND_LOCATION_PERMISSION_REQUEST = 1002;
      private static final int BLUETOOTH_PERMISSION_REQUEST = 1003;
      private static final int NOTIFICATION_PERMISSION_REQUEST = 1004;

      // Light Theme Colors (2025 Soft Indigo - Default)
      private static final int LIGHT_PRIMARY = 0xFF818CF8;        // Soft Indigo
      private static final int LIGHT_ACCENT = 0xFF6366F1;         // Medium Indigo
      private static final int LIGHT_PRIMARY_LIGHT = 0xFFC7D2FE;  // Very Soft Lavender
      private static final int LIGHT_SUCCESS = 0xFF34D399;        // Soft Emerald
      private static final int LIGHT_ERROR = 0xFFF87171;          // Soft Coral Red
      private static final int LIGHT_WARNING = 0xFFFBBF24;        // Soft Amber
      private static final int LIGHT_SURFACE = 0xFFFFFFFF;        // White Surface
      private static final int LIGHT_BACKGROUND = 0xFFF0F0F0;     // Light Grey
      private static final int LIGHT_CARD_BG = 0xFFFFFFFF;        // Card White
      private static final int LIGHT_OUTLINE = 0xFFE5E7EB;        // Subtle Border
      private static final int LIGHT_TEXT_PRIMARY = 0xFF374151;   // Soft Dark Text
      private static final int LIGHT_TEXT_SECONDARY = 0xFF6B7280; // Medium Gray Text
      private static final int LIGHT_TEXT_LIGHT = 0xFF9CA3AF;     // Light Gray Text

      // Dark Theme Colors
      private static final int DARK_PRIMARY = 0xFF818CF8;         // Keep accent visible
      private static final int DARK_ACCENT = 0xFF6366F1;          // Medium Indigo
      private static final int DARK_PRIMARY_LIGHT = 0xFF4F46E5;   // Darker Indigo
      private static final int DARK_SUCCESS = 0xFF10B981;         // Emerald
      private static final int DARK_ERROR = 0xFFEF4444;           // Red
      private static final int DARK_WARNING = 0xFFF59E0B;         // Amber
      private static final int DARK_SURFACE = 0xFF1F2937;         // Dark Surface
      private static final int DARK_BACKGROUND = 0xFF111827;      // Very Dark Background
      private static final int DARK_CARD_BG = 0xFF1F2937;         // Dark Card
      private static final int DARK_OUTLINE = 0xFF374151;         // Dark Border
      private static final int DARK_TEXT_PRIMARY = 0xFFF9FAFB;    // Light Text
      private static final int DARK_TEXT_SECONDARY = 0xFFD1D5DB;  // Medium Light Text
      private static final int DARK_TEXT_LIGHT = 0xFF9CA3AF;      // Gray Text

      // Active theme colors (updated based on preference)
      private int COLOR_PRIMARY = LIGHT_PRIMARY;
      private int COLOR_ACCENT = LIGHT_ACCENT;
      private int COLOR_PRIMARY_LIGHT = LIGHT_PRIMARY_LIGHT;
      private int COLOR_SUCCESS = LIGHT_SUCCESS;
      private int COLOR_ERROR = LIGHT_ERROR;
      private int COLOR_WARNING = LIGHT_WARNING;
      private int COLOR_SURFACE = LIGHT_SURFACE;
      private int COLOR_BACKGROUND = LIGHT_BACKGROUND;
      private int COLOR_CARD_BG = LIGHT_CARD_BG;
      private int COLOR_OUTLINE = LIGHT_OUTLINE;
      private int COLOR_TEXT_PRIMARY = LIGHT_TEXT_PRIMARY;
      private int COLOR_TEXT_SECONDARY = LIGHT_TEXT_SECONDARY;
      private int COLOR_TEXT_LIGHT = LIGHT_TEXT_LIGHT;

      // Theme preference
      private boolean isDarkTheme = false;

      // Developer mode flag (hide diagnostic info from end users)
      private boolean developerMode = false;

      // Guest mode flag - allows users to try app before creating account
      private boolean isGuestMode = false;
      private int guestTripCount = 0;
      private static final int GUEST_TRIP_LIMIT_PROMPT = 3; // Prompt to register after 3 trips

      // What's New version - increment when adding new features to announce
      private static final int WHATS_NEW_VERSION = 1; // v1: Guest mode announcement

      // Battery optimization dialog reference for auto-dismiss
      private AlertDialog batteryOptimizationDialog = null;
      private AlertDialog upgradeDialog = null;
      private AlertDialog tripLimitDialog = null;

      // Onboarding flow tracking
      private static final String ONBOARDING_PREFS = "OnboardingPrefs";
      private static final String KEY_ONBOARDING_COMPLETE = "onboarding_complete";
      private static final String KEY_LOCATION_SKIPPED = "location_skipped";
      private static final String KEY_BACKGROUND_SKIPPED = "background_skipped";
      private static final String KEY_BATTERY_SKIPPED = "battery_skipped";
      private static final String KEY_NOTIFICATIONS_SKIPPED = "notifications_skipped";
      private int currentOnboardingStep = 0;
      private AlertDialog onboardingDialog = null;
      private LinearLayout trackingIncompleteBanner = null;
      private LinearLayout autoTrackOffBanner = null;

      // Main layout
      private LinearLayout mainContentLayout;
      private LinearLayout bottomTabLayout;

      // Tab content - 5 Tab Navigation
      private LinearLayout homeContent;
      private ScrollView homeScroll;
      private LinearLayout autoTrackContent;
      private ScrollView autoTrackScroll;
      private LinearLayout tripsContent;
      private ScrollView tripsScroll;
      private LinearLayout reportsContent;
      private ScrollView reportsScroll;
      private LinearLayout settingsContent;
      private ScrollView settingsScroll;

      // Legacy references for compatibility
      private LinearLayout dashboardContent;
      private ScrollView dashboardScroll;
      private LinearLayout classifyContent;
      private LinearLayout categorizedContent;

      // Tab buttons (5-tab navigation with icons)
      private LinearLayout homeTabButton;
      private LinearLayout autoTrackTabButton;
      private LinearLayout tripsTabButton;
      private LinearLayout reportsTabButton;
      private LinearLayout settingsTabButton;
      private Button classifyMergeButton;
      private String currentTab = "autotrack";

      // Dashboard UI Elements
      private TextView statusText;
      private TextView speedText;
      private TextView realTimeDistanceText;
      private TextView statsText;
      private TextView recentExportsText;
      private TextView bluetoothStatusText;
      private TextView connectedVehicleText;
      private BroadcastReceiver bluetoothUpdateReceiver;
      private Switch autoToggle;
      private Button apiToggle;
      private Button manualStartButton;
      private Button manualStopButton;
      private Button addTripButton;
      private Button periodButton;
      private Button registerVehicleButton;
      private LinearLayout recentTripsLayout;

      // Trips UI Elements
      private LinearLayout allTripsLayout;
      private ScrollView allTripsScroll;

      // Classify UI Elements
      private LinearLayout classifyTripsLayout;
      private ScrollView classifyTripsScroll;

      // Categorized UI Elements
      private ScrollView categorizedTripsScroll;
      private LinearLayout categorizedTripsContainer;
      private String currentCategoryFilter = "All";
      private String currentSortOrder = "Newest";
      private String currentSearchQuery = "";

      // Services and storage
      private LocationManager locationManager;
      private TripStorage tripStorage;
      private BillingManager billingManager;
      private FeedbackManager feedbackManager;
      private BroadcastReceiver tripLimitReceiver;
      private boolean bluetoothServiceStarted = false;
      private boolean autoDetectionEnabled = false;
      private boolean manualTripInProgress = false;
      private boolean isVehicleRegistrationDialogShowing = false;

      // Statistics period tracking
      private String currentStatsPeriod = "YTD"; // YTD, Quarter, Month
      private Handler speedHandler = new Handler();
      private Runnable speedRunnable;

      // Real-time distance tracking
      private double realTimeDistance = 0.0;
      private android.location.Location lastDistanceLocation = null;

      // Enhanced auto detection variables
      private boolean isCurrentlyTracking = false;
      private boolean currentTripPaused = false;
      private long currentTripStartTime = 0;
      private double currentTripStartLatitude = 0;
      private double currentTripStartLongitude = 0;
      private String currentTripStartAddress = null;

      // Swipe classification variables
      private GestureDetector gestureDetector;
      private Trip currentSwipeTrip = null;
      private View currentSwipeView = null;

      // Bluetooth discovery variables
      private BluetoothAdapter bluetoothAdapter;
      private BroadcastReceiver bluetoothDiscoveryReceiver;
      private Handler bluetoothScanHandler = new Handler();
      private Runnable bluetoothScanRunnable;
      private boolean swipeInProgress = false;

      // Auto-classification storage
      private SharedPreferences locationPrefs;
      private List<LocationPoint> currentTripPath = new ArrayList<>();
      private int movingReadingsCount = 0;
      private int stationaryReadingsCount = 0;
      private Long tripPauseStartTime = null;
      private LocationPoint pausedTripLocation = null;

      // Auto detection blinking animation
      private Handler blinkHandler = new Handler();
      private Runnable blinkRunnable;
      private boolean lightsOn = true;
      private boolean isBlinking = false;

      // Event tracking for analytics
      private static final String APP_VERSION = "4.9.150";

      // Track app events for analytics (app opens, guest mode, conversions)
      private void trackEvent(String eventType, String eventData, String userEmail) {
          new Thread(() -> {
              try {
                  // Get or create device ID
                  SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
                  String deviceId = prefs.getString("analytics_device_id", null);
                  if (deviceId == null) {
                      deviceId = java.util.UUID.randomUUID().toString();
                      prefs.edit().putString("analytics_device_id", deviceId).apply();
                  }

                  // Get attribution source if available
                  String attributionSource = prefs.getString("attribution_source", null);
                  String utmSource = prefs.getString("utm_source", null);
                  String utmMedium = prefs.getString("utm_medium", null);
                  String utmCampaign = prefs.getString("utm_campaign", null);

                  OkHttpClient client = new OkHttpClient.Builder()
                      .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .writeTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .build();

                  org.json.JSONObject json = new org.json.JSONObject();
                  json.put("device_id", deviceId);
                  json.put("event_type", eventType);
                  json.put("event_data", eventData);
                  json.put("user_email", userEmail);
                  json.put("app_version", APP_VERSION);

                  // Include attribution data
                  if (attributionSource != null) json.put("attribution_source", attributionSource);
                  if (utmSource != null) json.put("utm_source", utmSource);
                  if (utmMedium != null) json.put("utm_medium", utmMedium);
                  if (utmCampaign != null) json.put("utm_campaign", utmCampaign);

                  RequestBody body = RequestBody.create(
                      json.toString(),
                      okhttp3.MediaType.parse("application/json")
                  );

                  Request request = new Request.Builder()
                      .url("https://miletracker-pro-pcates.replit.app/api/events")
                      .post(body)
                      .build();

                  client.newCall(request).execute();
                  Log.d(TAG, "Event tracked: " + eventType);
              } catch (Exception e) {
                  Log.e(TAG, "Error tracking event: " + e.getMessage());
              }
          }).start();
      }

      // Capture install referrer for attribution tracking
      private void captureInstallReferrer() {
          SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
          boolean referrerCaptured = prefs.getBoolean("install_referrer_captured", false);

          // Only capture once on first install
          if (referrerCaptured) return;

          try {
              com.android.installreferrer.api.InstallReferrerClient referrerClient = 
                  com.android.installreferrer.api.InstallReferrerClient.newBuilder(this).build();

              referrerClient.startConnection(new com.android.installreferrer.api.InstallReferrerStateListener() {
                  @Override
                  public void onInstallReferrerSetupFinished(int responseCode) {
                      try {
                          if (responseCode == com.android.installreferrer.api.InstallReferrerClient.InstallReferrerResponse.OK) {
                              com.android.installreferrer.api.ReferrerDetails response = referrerClient.getInstallReferrer();
                              String referrerUrl = response.getInstallReferrer();
                              Log.d(TAG, "Install referrer: " + referrerUrl);

                              // Parse UTM parameters
                              SharedPreferences.Editor editor = prefs.edit();
                              editor.putBoolean("install_referrer_captured", true);
                              editor.putString("raw_referrer", referrerUrl);

                              if (referrerUrl != null && !referrerUrl.isEmpty()) {
                                  // Parse UTM parameters from referrer string
                                  String[] params = referrerUrl.split("&");
                                  for (String param : params) {
                                      String[] keyValue = param.split("=");
                                      if (keyValue.length == 2) {
                                          String key = keyValue[0];
                                          String value = java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                                          if ("utm_source".equals(key)) {
                                              editor.putString("utm_source", value);
                                              editor.putString("attribution_source", value);
                                          } else if ("utm_medium".equals(key)) {
                                              editor.putString("utm_medium", value);
                                          } else if ("utm_campaign".equals(key)) {
                                              editor.putString("utm_campaign", value);
                                          }
                                      }
                                  }

                                  // Determine attribution source category
                                  String source = prefs.getString("utm_source", "");
                                  String medium = prefs.getString("utm_medium", "");
                                  String attribution = "organic";

                                  if (source.contains("google") && medium.contains("cpc")) {
                                      attribution = "google_ads";
                                  } else if (source.contains("facebook") || source.contains("instagram")) {
                                      attribution = "social_meta";
                                  } else if (source.contains("twitter") || source.contains("x.com")) {
                                      attribution = "social_twitter";
                                  } else if (source.contains("tiktok")) {
                                      attribution = "social_tiktok";
                                  } else if (!source.isEmpty()) {
                                      attribution = source;
                                  }

                                  editor.putString("attribution_source", attribution);
                              } else {
                                  editor.putString("attribution_source", "organic");
                              }

                              editor.apply();

                              // Track install event with attribution
                              trackEvent("app_install", prefs.getString("attribution_source", "organic"), null);
                          } else {
                              Log.d(TAG, "Install referrer not available, marking as organic");
                              prefs.edit()
                                  .putBoolean("install_referrer_captured", true)
                                  .putString("attribution_source", "organic")
                                  .apply();
                          }
                          referrerClient.endConnection();
                      } catch (Exception e) {
                          Log.e(TAG, "Error getting install referrer: " + e.getMessage());
                      }
                  }

                  @Override
                  public void onInstallReferrerServiceDisconnected() {
                      Log.d(TAG, "Install referrer service disconnected");
                  }
              });
          } catch (Exception e) {
              Log.e(TAG, "Error starting install referrer client: " + e.getMessage());
              prefs.edit()
                  .putBoolean("install_referrer_captured", true)
                  .putString("attribution_source", "organic")
                  .apply();
          }
      }

      @Override
      protected void onCreate(Bundle savedInstanceState) {
          super.onCreate(savedInstanceState);

          // Hide the default Android ActionBar (we have our own custom header)
          if (getSupportActionBar() != null) {
              getSupportActionBar().hide();
          }

          try {
              Log.d(TAG, "MainActivity onCreate starting - v4.9.149 SECURE AUTHENTICATION...");

              // Load theme preference before creating UI
              loadThemePreference();

              // AUTHENTICATION CHECK - Show welcome/login screen if not logged in
              UserAuthManager authManager = new UserAuthManager(this);
              SharedPreferences appPrefs = getSharedPreferences("app_settings", MODE_PRIVATE);
              isGuestMode = appPrefs.getBoolean("guest_mode", false);

              if (!authManager.isLoggedIn() && !isGuestMode) {
                  Log.d(TAG, "User not logged in - showing welcome screen");
                  showWelcomeScreen(authManager);
                  return; // Stop here until user logs in
              }

              if (isGuestMode) {
                  Log.d(TAG, "User in guest mode - local tracking only");
                  // Restore guest trip count from preferences
                  guestTripCount = appPrefs.getInt("guest_trip_count", 0);
              } else {
                  Log.d(TAG, "User is logged in: " + authManager.getCurrentUserEmail());
              }

              tripStorage = new TripStorage(this);

              // Auto-upgrade IRS rates from 2025 to 2026 for existing users
              SharedPreferences irsPrefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
              int storedYear = irsPrefs.getInt("irs_year", 0);
              if (storedYear > 0 && storedYear < 2026) {
                  float storedBiz = irsPrefs.getFloat("irs_business_rate", 0f);
                  float storedMed = irsPrefs.getFloat("irs_medical_rate", 0f);
                  if (storedBiz > 0 && Math.abs(storedBiz - 0.70f) < 0.001f) {
                      irsPrefs.edit()
                          .putInt("irs_year", 2026)
                          .putFloat("irs_business_rate", 0.725f)
                          .putFloat("irs_medical_rate", 0.205f)
                          .putFloat("irs_charity_rate", 0.14f)
                          .apply();
                      Log.d(TAG, "Auto-upgraded IRS rates from 2025 to 2026");
                  }
              }

              // CRITICAL: Ensure API sync is disabled for guest mode users
              if (isGuestMode) {
                  tripStorage.setApiSyncEnabled(false);
              }

              // Only sync subscription and cloud features for logged-in users (not guest mode)
              if (!isGuestMode) {
                  // AUTOMATIC SUBSCRIPTION TIER SYNC - Sync tier from server on app launch
                  syncSubscriptionTierFromServer(authManager.getCurrentUserEmail());

                  // Initialize Google Play Billing for in-app purchases
                  initializeBillingManager();

                  // Check and send grace period notifications if needed
                  tripStorage.checkAndSendGracePeriodNotification();

                  // Stage 1: Migrate existing trips to have unique IDs for offline sync
                  tripStorage.migrateExistingTrips();
              }

              // Initialize in-app feedback system (available for all users including guests)
              initializeFeedbackManager();

              // Capture install referrer on first launch (for attribution tracking)
              captureInstallReferrer();

              // Track app open event for analytics
              String userEmail = isGuestMode ? null : authManager.getCurrentUserEmail();
              trackEvent("app_open", isGuestMode ? "guest" : "registered", userEmail);

              // Show "What's New" dialog for existing users after update (one-time)
              checkAndShowWhatsNew();

              // Check if app was opened from feedback notification
              handleFeedbackNotificationIntent(getIntent());

              locationPrefs = getSharedPreferences("location_classification", MODE_PRIVATE);
              initializeGestureDetector();
              createCleanLayout();
              setupSpeedMonitoring();

              // Check if user needs friendly onboarding or already completed it
              if (!isOnboardingComplete()) {
                  startFriendlyOnboarding();
              } else {
                  // Onboarding complete - use standard permission flow
                  initializeGPS();
                  requestPermissions();
              }

              updateStats();
              registerBroadcastReceiver();
              initializeBluetoothBackgroundService();
              restoreAutoDetectionState();

              // TRIGGER DOWNLOAD OF ALL USER TRIPS
              triggerAllUserTripsDownload();

              // Handle upgrade notification intent if app opened from notification
              handleUpgradeNotificationIntent(getIntent());
              handleTrackingReminderIntent(getIntent());

              Log.d(TAG, "MainActivity onCreate completed successfully");

          } catch (Exception e) {
              Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
              Toast.makeText(this, "App initialization error: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      @Override
      protected void onNewIntent(Intent intent) {
          super.onNewIntent(intent);
          setIntent(intent);
          // Handle feedback notification tap when app is already running
          handleFeedbackNotificationIntent(intent);
          // Handle upgrade notification tap
          handleUpgradeNotificationIntent(intent);
          // Handle tracking reminder notifications
          handleTrackingReminderIntent(intent);
      }

      private void handleTrackingReminderIntent(Intent intent) {
          if (intent == null) return;
          String action = intent.getAction();
          if ("TRACKING_REMINDER".equals(action) || "TRACKING_REMINDER_2".equals(action)) {
              showTrackingReminderNotification();
              intent.setAction(null);
          } else if ("OPEN_AUTOTRACK".equals(action)) {
              intent.setAction(null);
              runOnUiThread(() -> switchToTab("autotrack"));
          }
      }

      private void handleUpgradeNotificationIntent(Intent intent) {
          if (intent != null && intent.getBooleanExtra("show_upgrade_dialog", false)) {
              // Clear the extra so it doesn't trigger again
              intent.removeExtra("show_upgrade_dialog");
              // Show upgrade dialog
              runOnUiThread(() -> showUpgradeOptionsDialog());
          }
      }

      @Override
      protected void onStop() {
          super.onStop();
          EventTracker.trackAppBackground(this);
      }

      @Override
      protected void onResume() {
          super.onResume();

          SharedPreferences resumePrefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
          if (resumePrefs.getBoolean("awaiting_bg_permission_return", false)) {
              resumePrefs.edit().putBoolean("awaiting_bg_permission_return", false).apply();
              String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              long openedAt = resumePrefs.getLong("bg_permission_settings_opened_at", 0);
              long secondsInSettings = openedAt > 0 ? (System.currentTimeMillis() - openedAt) / 1000 : 0;

              boolean hasFineNow = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
              boolean hasBgNow = true;
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                  hasBgNow = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
              }

              if (hasFineNow && hasBgNow) {
                  trackEvent("bg_permission_granted_after_prompt", "granted_in_" + secondsInSettings + "s", userEmail);
                  Toast.makeText(this, "Background location enabled! You can now turn on Auto-Detection.", Toast.LENGTH_LONG).show();
                  if (autoToggle != null) {
                      autoToggle.setChecked(true);
                  }
              } else {
                  trackEvent("bg_permission_still_denied_after_prompt", "returned_after_" + secondsInSettings + "s", userEmail);
              }
          }

          // Check battery optimization status for reliable GPS tracking
          checkBatteryOptimization();

          // Refresh trips from API when user returns to app (NOT for guest mode)
          if (!isGuestMode && tripStorage.isApiSyncEnabled()) {
              new Thread(() -> {
                  try {
                      CloudBackupService cloudBackup = new CloudBackupService(this);
                      cloudBackup.downloadAllUserTrips();

                      // Update UI on main thread
                      runOnUiThread(() -> {
                          updateStats();
                          updateAllTrips();
                      });
                  } catch (Exception e) {
                      Log.e(TAG, "Error refreshing trips: " + e.getMessage());
                  }
              });
          }

          // Check if user should be prompted for feedback (works for all users)
          new Handler().postDelayed(() -> checkAndShowFeedbackPrompt(), 3000);

          // Update tracking incomplete banner visibility
          updateTrackingIncompleteBanner();
      }

      // Download ALL user trips (not just device-specific) - NOT for guest mode
      private void triggerAllUserTripsDownload() {
          // Block cloud operations for guest mode users
          if (isGuestMode) return;

          try {
              if (tripStorage.isApiSyncEnabled()) {
                  CloudBackupService cloudBackup = new CloudBackupService(this);
                  cloudBackup.downloadAllUserTrips();
                  Log.d(TAG, "Triggered download of ALL user trips (not device-specific)");

                  // Update UI after a short delay to allow download to complete
                  Handler handler = new Handler();
                  handler.postDelayed(() -> {
                      updateStats();
                      if ("home".equals(currentTab)) {
                          updateRecentTrips();
                      } else {
                          updateAllTrips();
                      }
                  }, 3000); // 3 second delay
              }
          } catch (Exception e) {
              Log.e(TAG, "Error triggering ALL user trips download: " + e.getMessage(), e);
          }
      }

      private void createCleanLayout() {
          try {
              // MAIN CONTAINER
              LinearLayout mainLayout = new LinearLayout(this);
              mainLayout.setOrientation(LinearLayout.VERTICAL);
              mainLayout.setBackgroundColor(COLOR_BACKGROUND);

              // MAIN HEADER with car emoji, app title, and settings gear
              LinearLayout mainHeader = new LinearLayout(this);
              mainHeader.setOrientation(LinearLayout.HORIZONTAL);
              mainHeader.setBackgroundColor(COLOR_PRIMARY);
              mainHeader.setPadding(20, 15, 20, 15);
              mainHeader.setGravity(Gravity.CENTER_VERTICAL);

              TextView mainHeaderText = new TextView(this);
              mainHeaderText.setText("MileTracker Pro");
              mainHeaderText.setTextSize(20);
              mainHeaderText.setTextColor(COLOR_SURFACE);
              mainHeaderText.setTypeface(null, Typeface.BOLD);
              mainHeaderText.setSingleLine(true);
              mainHeaderText.setEllipsize(android.text.TextUtils.TruncateAt.END);

              LinearLayout.LayoutParams headerTextParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
              mainHeaderText.setLayoutParams(headerTextParams);
              mainHeader.addView(mainHeaderText);

              // TRACKING INCOMPLETE BANNER (hidden by default)
              trackingIncompleteBanner = createTrackingIncompleteBanner();

              // MAIN CONTENT AREA
              mainContentLayout = new LinearLayout(this);
              mainContentLayout.setOrientation(LinearLayout.VERTICAL);
              LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
                  LinearLayout.LayoutParams.MATCH_PARENT, 
                  0, 
                  1.0f
              );
              mainContentLayout.setLayoutParams(contentParams);

              // BOTTOM TAB BAR - 5 Tab Navigation with Icons
              bottomTabLayout = new LinearLayout(this);
              bottomTabLayout.setOrientation(LinearLayout.HORIZONTAL);
              bottomTabLayout.setBackgroundColor(COLOR_CARD_BG);
              bottomTabLayout.setPadding(0, 8, 0, 16);
              bottomTabLayout.setGravity(Gravity.CENTER);
              bottomTabLayout.setElevation(8);

              // Create 5 tab buttons with Android system icons (clean, understated)
              homeTabButton = createTabButton(android.R.drawable.ic_menu_myplaces, "Home", "home");
              autoTrackTabButton = createTabButton(android.R.drawable.ic_menu_mylocation, "Track", "autotrack");
              tripsTabButton = createTabButton(android.R.drawable.ic_menu_sort_by_size, "Trips", "trips");
              reportsTabButton = createTabButton(android.R.drawable.ic_menu_agenda, "Reports", "reports");
              settingsTabButton = createTabButton(android.R.drawable.ic_menu_preferences, "Settings", "settings");

              bottomTabLayout.addView(homeTabButton);
              bottomTabLayout.addView(autoTrackTabButton);
              bottomTabLayout.addView(tripsTabButton);
              bottomTabLayout.addView(reportsTabButton);
              bottomTabLayout.addView(settingsTabButton);

              // CREATE TAB CONTENT - Create categorized first since Trips tab uses it
              createCategorizedContent();

              // Create the 5 new tabs (these use the shared UI fields)
              createHomeContent();
              createAutoTrackContent();
              createTripsContent();
              createReportsContent();
              createSettingsContent();

              // Add to main layout in correct order
              mainLayout.addView(mainHeader);
              mainLayout.addView(trackingIncompleteBanner);
              mainLayout.addView(mainContentLayout);
              mainLayout.addView(bottomTabLayout);

              // Restore saved tab (from theme change) or default to home
              String savedTab = loadCurrentTabPreference();
              switchToTab(savedTab);
              setContentView(mainLayout);

          } catch (Exception e) {
              Log.e(TAG, "Error creating layout: " + e.getMessage(), e);
              throw e;
          }
      }

      private void createDashboardContent() {
          dashboardContent = new LinearLayout(this);
          dashboardContent.setOrientation(LinearLayout.VERTICAL);
          dashboardContent.setPadding(20, 20, 20, 20);



          // === STATUS CARD ===
          LinearLayout statusCard = new LinearLayout(this);
          statusCard.setOrientation(LinearLayout.VERTICAL);
          statusCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          statusCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams statusCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          statusCardParams.setMargins(0, 0, 0, 16);
          statusCard.setLayoutParams(statusCardParams);
          statusCard.setElevation(4);

          // Status
          statusText = new TextView(this);
          statusText.setText("Initializing...");
          statusText.setTextSize(16);
          statusText.setTextColor(COLOR_TEXT_PRIMARY);
          statusText.setPadding(0, 0, 0, 8);
          statusCard.addView(statusText);

          // Speed
          speedText = new TextView(this);
          speedText.setText("Speed: -- mph");
          speedText.setTextSize(14);
          speedText.setTextColor(COLOR_TEXT_SECONDARY);
          speedText.setPadding(0, 4, 0, 4);
          statusCard.addView(speedText);

          // Real-time Distance
          realTimeDistanceText = new TextView(this);
          realTimeDistanceText.setText("Distance: 0.0 miles");
          realTimeDistanceText.setTextSize(14);
          realTimeDistanceText.setTextColor(COLOR_TEXT_SECONDARY);
          realTimeDistanceText.setPadding(0, 4, 0, 0);
          statusCard.addView(realTimeDistanceText);

          dashboardContent.addView(statusCard);



          // === AUTO DETECTION CARD ===
          LinearLayout autoDetectionCard = new LinearLayout(this);
          autoDetectionCard.setOrientation(LinearLayout.VERTICAL);
          autoDetectionCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          autoDetectionCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams autoCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          autoCardParams.setMargins(0, 0, 0, 16);
          autoDetectionCard.setLayoutParams(autoCardParams);
          autoDetectionCard.setElevation(4);

          TextView autoSectionHeader = new TextView(this);
          autoSectionHeader.setText("Auto Detection");
          autoSectionHeader.setTextSize(16);
          autoSectionHeader.setTextColor(COLOR_TEXT_PRIMARY);
          autoSectionHeader.setTypeface(null, Typeface.BOLD);
          autoSectionHeader.setPadding(0, 0, 0, 12);
          autoDetectionCard.addView(autoSectionHeader);

          // Auto Detection Toggle Switch
          LinearLayout autoToggleRow = new LinearLayout(this);
          autoToggleRow.setOrientation(LinearLayout.HORIZONTAL);
          autoToggleRow.setGravity(Gravity.CENTER_VERTICAL);
          autoToggleRow.setPadding(0, 0, 0, 0);

          TextView autoToggleLabel = new TextView(this);
          autoToggleLabel.setText("Auto Detection");
          autoToggleLabel.setTextSize(16);
          autoToggleLabel.setTextColor(COLOR_TEXT_PRIMARY);
          autoToggleLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          autoToggleRow.addView(autoToggleLabel);

          autoToggle = new Switch(this);
          autoToggle.setChecked(false);
          autoToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);

              if (isChecked) {
                  boolean hasFineLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                  boolean hasBackgroundLocation = true;
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                      hasBackgroundLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
                  }

                  if (!hasFineLocation || !hasBackgroundLocation) {
                      autoToggle.setChecked(false);
                      trackEvent("auto_detection_blocked_no_permission", hasBackgroundLocation ? "missing_fine_location" : "missing_background_location", userEmail);
                      showAutoDetectPermissionDialog(hasFineLocation);
                      return;
                  }
              }

              autoDetectionEnabled = isChecked;
              prefs.edit().putBoolean("auto_detection_enabled", autoDetectionEnabled).apply();
              updateAutoTrackBanner();
              if (autoDetectionEnabled) {
                  prefs.edit().putLong("auto_detection_on_time", System.currentTimeMillis()).apply();
                  trackEvent("auto_detection_on", null, userEmail);
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("START_AUTO_DETECTION");
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      startForegroundService(serviceIntent);
                  } else {
                      startService(serviceIntent);
                  }
                  statusText.setText("Auto detection active - Monitoring for trips");
                  statusText.setTextColor(COLOR_SUCCESS);
              } else {
                  long onTime = prefs.getLong("auto_detection_on_time", 0);
                  long durationMin = onTime > 0 ? (System.currentTimeMillis() - onTime) / 60000 : 0;
                  trackEvent("auto_detection_off", "duration_" + durationMin + "min", userEmail);
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("STOP_AUTO_DETECTION");
                  startService(serviceIntent);
                  statusText.setText("Ready");
                  statusText.setTextColor(COLOR_TEXT_PRIMARY);
              }
          });
          autoToggleRow.addView(autoToggle);
          autoDetectionCard.addView(autoToggleRow);
          dashboardContent.addView(autoDetectionCard);

          // === BLUETOOTH CARD ===
          LinearLayout bluetoothCard = new LinearLayout(this);
          bluetoothCard.setOrientation(LinearLayout.VERTICAL);
          bluetoothCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          bluetoothCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams bluetoothCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          bluetoothCardParams.setMargins(0, 0, 0, 16);
          bluetoothCard.setLayoutParams(bluetoothCardParams);
          bluetoothCard.setElevation(4);

          TextView bluetoothStatusLabel = new TextView(this);
          bluetoothStatusLabel.setText("Bluetooth & Vehicle");
          bluetoothStatusLabel.setTextSize(16);
          bluetoothStatusLabel.setTextColor(COLOR_TEXT_PRIMARY);
          bluetoothStatusLabel.setTypeface(null, Typeface.BOLD);
          bluetoothStatusLabel.setPadding(0, 0, 0, 12);
          bluetoothCard.addView(bluetoothStatusLabel);

          bluetoothStatusText = new TextView(this);
          bluetoothStatusText.setText("Bluetooth: Checking...");
          bluetoothStatusText.setTextSize(14);
          bluetoothStatusText.setTextColor(COLOR_TEXT_SECONDARY);
          bluetoothStatusText.setPadding(0, 4, 0, 4);
          bluetoothStatusText.setOnClickListener(v -> showBluetoothDiagnostics());
          bluetoothCard.addView(bluetoothStatusText);

          connectedVehicleText = new TextView(this);
          connectedVehicleText.setText("Vehicle: None connected");
          connectedVehicleText.setTextSize(14);
          connectedVehicleText.setTextColor(COLOR_TEXT_SECONDARY);
          connectedVehicleText.setPadding(0, 4, 0, 12);
          bluetoothCard.addView(connectedVehicleText);

          // Register Vehicle Button
          registerVehicleButton = new Button(this);
          registerVehicleButton.setText("Register Vehicle");
          registerVehicleButton.setTextSize(14);
          registerVehicleButton.setBackground(createRoundedBackground(COLOR_ACCENT, 14));
          registerVehicleButton.setTextColor(COLOR_SURFACE);
          registerVehicleButton.setOnClickListener(v -> showVehicleRegistrationDialog());
          bluetoothCard.addView(registerVehicleButton);

          dashboardContent.addView(bluetoothCard);

          // === MANUAL CONTROLS CARD ===
          LinearLayout manualCard = new LinearLayout(this);
          manualCard.setOrientation(LinearLayout.VERTICAL);
          manualCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          manualCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams manualCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          manualCardParams.setMargins(0, 0, 0, 16);
          manualCard.setLayoutParams(manualCardParams);
          manualCard.setElevation(4);

          TextView manualSectionHeader = new TextView(this);
          manualSectionHeader.setText("Manual Trip Controls");
          manualSectionHeader.setTextSize(16);
          manualSectionHeader.setTextColor(COLOR_TEXT_PRIMARY);
          manualSectionHeader.setTypeface(null, Typeface.BOLD);
          manualSectionHeader.setPadding(0, 0, 0, 12);
          manualCard.addView(manualSectionHeader);

          LinearLayout manualButtonLayout = new LinearLayout(this);
          manualButtonLayout.setOrientation(LinearLayout.HORIZONTAL);

          manualStartButton = new Button(this);
          manualStartButton.setText("START TRIP");
          manualStartButton.setTextSize(14);
          manualStartButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
          manualStartButton.setTextColor(COLOR_SURFACE);
          manualStartButton.setOnClickListener(v -> startManualTrip());
          LinearLayout.LayoutParams startParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          startParams.setMargins(0, 0, 8, 0);
          manualStartButton.setLayoutParams(startParams);
          manualButtonLayout.addView(manualStartButton);

          manualStopButton = new Button(this);
          manualStopButton.setText("END TRIP");
          manualStopButton.setTextSize(14);
          manualStopButton.setBackground(createRoundedBackground(COLOR_ERROR, 14));
          manualStopButton.setTextColor(COLOR_SURFACE);
          manualStopButton.setVisibility(View.GONE);
          manualStopButton.setOnClickListener(v -> stopManualTrip());
          LinearLayout.LayoutParams stopParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          stopParams.setMargins(8, 0, 0, 0);
          manualStopButton.setLayoutParams(stopParams);
          manualButtonLayout.addView(manualStopButton);

          manualCard.addView(manualButtonLayout);

          // ADD TRIP MANUALLY
          addTripButton = new Button(this);
          addTripButton.setText("Add Trip");
          addTripButton.setTextSize(14);
          addTripButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          addTripButton.setTextColor(COLOR_SURFACE);
          addTripButton.setOnClickListener(v -> showAddTripDialog());
          LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          addParams.setMargins(0, 12, 0, 0);
          addTripButton.setLayoutParams(addParams);
          manualCard.addView(addTripButton);

          dashboardContent.addView(manualCard);

          // === SUBSCRIPTION STATUS CARD ===
          LinearLayout subscriptionCard = new LinearLayout(this);
          subscriptionCard.setOrientation(LinearLayout.VERTICAL);
          subscriptionCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          subscriptionCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams subCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          subCardParams.setMargins(0, 0, 0, 16);
          subscriptionCard.setLayoutParams(subCardParams);
          subscriptionCard.setElevation(4);

          // Subscription status text (shows trip counter for free tier, or premium status)
          statsText = new TextView(this);
          statsText.setText("Loading...");
          statsText.setTextSize(15);
          statsText.setTextColor(COLOR_TEXT_PRIMARY);
          statsText.setPadding(0, 0, 0, 0);
          statsText.setClickable(true);
          statsText.setFocusable(true);
          statsText.setOnClickListener(v -> {
              if (billingManager != null && !billingManager.isPremium()) {
                  showUpgradeOptionsDialog();
              }
          });
          subscriptionCard.addView(statsText);

          dashboardContent.addView(subscriptionCard);

          // === RECENT TRIPS CARD ===
          LinearLayout recentTripsCard = new LinearLayout(this);
          recentTripsCard.setOrientation(LinearLayout.VERTICAL);
          recentTripsCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          recentTripsCard.setPadding(0, 0, 0, 0);
          LinearLayout.LayoutParams recentCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          recentCardParams.setMargins(0, 0, 0, 16);
          recentTripsCard.setLayoutParams(recentCardParams);
          recentTripsCard.setElevation(4);

          TextView recentTripsHeader = new TextView(this);
          recentTripsHeader.setText("Recent Trips");
          recentTripsHeader.setTextSize(16);
          recentTripsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          recentTripsHeader.setPadding(20, 16, 20, 12);
          recentTripsHeader.setTypeface(null, Typeface.BOLD);
          recentTripsCard.addView(recentTripsHeader);

          ScrollView recentTripsScroll = new ScrollView(this);
          recentTripsLayout = new LinearLayout(this);
          recentTripsLayout.setOrientation(LinearLayout.VERTICAL);
          recentTripsLayout.setPadding(20, 0, 20, 16);
          recentTripsScroll.addView(recentTripsLayout);

          LinearLayout.LayoutParams recentScrollParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, 
              500
          );
          recentTripsScroll.setLayoutParams(recentScrollParams);
          recentTripsCard.addView(recentTripsScroll);

          dashboardContent.addView(recentTripsCard);
      }

      private void createTripsContent() {
          tripsContent = new LinearLayout(this);
          tripsContent.setOrientation(LinearLayout.VERTICAL);
          tripsContent.setPadding(20, 20, 20, 20);

          // Header removed as requested

          // All Trips ScrollView
          allTripsScroll = new ScrollView(this);
          allTripsLayout = new LinearLayout(this);
          allTripsLayout.setOrientation(LinearLayout.VERTICAL);
          allTripsScroll.addView(allTripsLayout);

          // Full screen layout params - fill all available space above bottom tabs
          LinearLayout.LayoutParams allTripsParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, 
              0, // Use weight to fill remaining space
              1.0f // Weight 1 = take all remaining vertical space
          );
          allTripsScroll.setLayoutParams(allTripsParams);
          tripsContent.addView(allTripsScroll);
      }

      private void createClassifyContent() {
          classifyContent = new LinearLayout(this);
          classifyContent.setOrientation(LinearLayout.VERTICAL);
          classifyContent.setPadding(20, 20, 20, 20);

          // Header text
          TextView headerText = new TextView(this);
          headerText.setText("Classify Trips");
          headerText.setTextSize(18);
          headerText.setTextColor(0xFF333333);
          headerText.setGravity(Gravity.CENTER);
          headerText.setPadding(0, 0, 0, 10);
          classifyContent.addView(headerText);

          // Instructions text - ULTRA COMPACT TO FIT ONE LINE
          TextView instructionsText = new TextView(this);
          instructionsText.setText("Swipe right for Business, left for Personal");
          instructionsText.setTextSize(9); // Reduced from 12 to 9 for one-line fit
          instructionsText.setTextColor(0xFF666666);
          instructionsText.setGravity(Gravity.CENTER);
          instructionsText.setPadding(0, 0, 0, 10); // Reduced padding
          classifyContent.addView(instructionsText);

          // REFRESH, MERGE, EXPORT buttons for classify tab
          LinearLayout buttonContainer = new LinearLayout(this);
          buttonContainer.setOrientation(LinearLayout.VERTICAL);
          buttonContainer.setPadding(0, 10, 0, 10);

          // Button row with uniform height buttons  
          LinearLayout buttonLayout = new LinearLayout(this);
          buttonLayout.setOrientation(LinearLayout.HORIZONTAL);
          buttonLayout.setGravity(Gravity.CENTER);
          buttonLayout.setPadding(0, 0, 0, 20);

          int buttonHeight = (int) (50 * getResources().getDisplayMetrics().density);

          // Refresh button
          Button refreshButton = new Button(this);
          refreshButton.setText("REFRESH");
          refreshButton.setTextSize(10);
          refreshButton.setBackground(createRoundedBackground(COLOR_TEXT_SECONDARY, 14));
          refreshButton.setTextColor(COLOR_SURFACE);
          refreshButton.setPadding(8, 0, 8, 0);
          refreshButton.setSingleLine(true);
          refreshButton.setMaxLines(1);
          refreshButton.setOnClickListener(v -> performRefreshWithFeedback(refreshButton));
          LinearLayout.LayoutParams refreshParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          refreshParams.setMargins(0, 0, 15, 0);
          refreshButton.setLayoutParams(refreshParams);
          buttonLayout.addView(refreshButton);

          // Merge button
          classifyMergeButton = new Button(this);
          classifyMergeButton.setText("MERGE");
          classifyMergeButton.setTextSize(11);
          classifyMergeButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          classifyMergeButton.setTextColor(0xFFFFFFFF);
          classifyMergeButton.setPadding(15, 0, 15, 0);
          LinearLayout.LayoutParams mergeParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          mergeParams.setMargins(15, 0, 15, 0);
          classifyMergeButton.setLayoutParams(mergeParams);
          buttonLayout.addView(classifyMergeButton);

          // Export button
          Button exportButton = new Button(this);
          exportButton.setText("EXPORT");
          exportButton.setTextSize(12);
          exportButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
          exportButton.setTextColor(COLOR_SURFACE);
          exportButton.setPadding(15, 0, 15, 0);
          LinearLayout.LayoutParams exportParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          exportParams.setMargins(15, 0, 0, 0);
          exportButton.setLayoutParams(exportParams);
          buttonLayout.addView(exportButton);

          buttonContainer.addView(buttonLayout);

          // Add export button click handler
          exportButton.setOnClickListener(v -> showExportDialog());

          // Add merge button click handler for classify tab
          classifyMergeButton.setOnClickListener(v -> {
              if (!mergeMode) {
                  // Enter merge mode
                  mergeMode = true;
                  classifyMergeButton.setText("Merge Trips");
                  updateClassifyTrips(); // Refresh to show checkboxes
              } else {
                  // In merge mode - show options
                  if (selectedTripIds.size() < 2) {
                      // Show cancel option when no trips selected
                      new AlertDialog.Builder(MainActivity.this)
                          .setTitle("Merge Options")
                          .setMessage("Select at least 2 trips to merge, or cancel to exit merge mode.")
                          .setPositiveButton("Cancel Merge", (dialog, which) -> {
                              // Cancel merge mode
                              mergeMode = false;
                              selectedTripIds.clear();
                              classifyMergeButton.setText("MERGE");
                              updateClassifyTrips();
                          })
                          .setNegativeButton("Continue", null)
                          .show();
                      return;
                  }

                  // Confirm merge
                  new AlertDialog.Builder(MainActivity.this)
                      .setTitle("Confirm Merge")
                      .setMessage("Merge " + selectedTripIds.size() + " selected trips?\n\nThis will combine them into one trip and delete the originals.")
                      .setPositiveButton("Merge", (dialog, which) -> {
                          executeClassifyMerge();
                      })
                      .setNegativeButton("Cancel", (dialog, which) -> {
                          // Cancel merge mode
                          mergeMode = false;
                          selectedTripIds.clear();
                          classifyMergeButton.setText("MERGE");
                          updateClassifyTrips();
                      })
                      .show();
              }
          });

          // Add long-press cancel for classify merge button
          classifyMergeButton.setOnLongClickListener(v -> {
              if (mergeMode) {
                  // Cancel merge mode on long press
                  mergeMode = false;
                  selectedTripIds.clear();
                  classifyMergeButton.setText("MERGE");
                  updateClassifyTrips();
                  return true;
              }
              return false;
          });

          classifyContent.addView(buttonContainer);

          // Scrollable trips container
          classifyTripsScroll = new ScrollView(this);
          classifyTripsLayout = new LinearLayout(this);
          classifyTripsLayout.setOrientation(LinearLayout.VERTICAL);
          classifyTripsScroll.addView(classifyTripsLayout);

          LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              0,
              1.0f
          );
          classifyTripsScroll.setLayoutParams(scrollParams);
          classifyContent.addView(classifyTripsScroll);
      }

      private void createCategorizedContent() {
          categorizedContent = new LinearLayout(this);
          categorizedContent.setOrientation(LinearLayout.VERTICAL);
          categorizedContent.setPadding(20, 20, 20, 20);

          // Header text
          TextView headerText = new TextView(this);
          headerText.setText("All Trips");
          headerText.setTextSize(18);
          headerText.setTextColor(COLOR_TEXT_PRIMARY);
          headerText.setGravity(Gravity.CENTER);
          headerText.setPadding(0, 0, 0, 20);
          categorizedContent.addView(headerText);

          // REFRESH, MERGE, EXPORT buttons (moved from createTripsContent)
          LinearLayout buttonContainer = new LinearLayout(this);
          buttonContainer.setOrientation(LinearLayout.VERTICAL);
          buttonContainer.setPadding(0, 10, 0, 10);

          // Button row with uniform height buttons  
          LinearLayout buttonLayout = new LinearLayout(this);
          buttonLayout.setOrientation(LinearLayout.HORIZONTAL);
          buttonLayout.setPadding(20, 0, 20, 0);
          buttonLayout.setGravity(Gravity.CENTER);

          // Uniform button height (50dp converted to pixels)
          int buttonHeight = (int) (50 * getResources().getDisplayMetrics().density);

          // Refresh button
          Button refreshButton = new Button(this);
          refreshButton.setText("REFRESH");
          refreshButton.setTextSize(10);
          refreshButton.setBackground(createRoundedBackground(COLOR_TEXT_SECONDARY, 14));
          refreshButton.setTextColor(COLOR_SURFACE);
          refreshButton.setPadding(8, 0, 8, 0);
          refreshButton.setSingleLine(true);
          refreshButton.setMaxLines(1);
          refreshButton.setOnClickListener(v -> performRefreshWithFeedback(refreshButton));
          LinearLayout.LayoutParams refreshParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          refreshParams.setMargins(0, 0, 15, 0);
          refreshButton.setLayoutParams(refreshParams);
          buttonLayout.addView(refreshButton);

          // Merge button
          Button mergeButton = new Button(this);
          mergeButton.setText("MERGE");
          mergeButton.setTextSize(12);
          mergeButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          mergeButton.setTextColor(COLOR_SURFACE);
          mergeButton.setPadding(15, 0, 15, 0);
          LinearLayout.LayoutParams mergeParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          mergeParams.setMargins(15, 0, 15, 0);
          mergeButton.setLayoutParams(mergeParams);
          buttonLayout.addView(mergeButton);

          // Export button
          Button exportButton = new Button(this);
          exportButton.setText("EXPORT");
          exportButton.setTextSize(12);
          exportButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
          exportButton.setTextColor(COLOR_SURFACE);
          exportButton.setPadding(15, 0, 15, 0);
          LinearLayout.LayoutParams exportParams = new LinearLayout.LayoutParams(
              0, 
              buttonHeight,
              1.0f
          );
          exportParams.setMargins(15, 0, 0, 0);
          exportButton.setLayoutParams(exportParams);
          buttonLayout.addView(exportButton);

          buttonContainer.addView(buttonLayout);

          // Add export button click handler
          exportButton.setOnClickListener(v -> showExportDialog());

          // Add merge button click handler
          mergeButton.setOnClickListener(v -> {
              if (!mergeMode) {
                  // Enter merge mode
                  mergeMode = true;
                  mergeButton.setText("Merge Trips");
                  updateCategorizedTrips(); // Refresh to show checkboxes
              } else {
                  // In merge mode - show options
                  if (selectedTripIds.size() < 2) {
                      // Show cancel option when no trips selected
                      new AlertDialog.Builder(MainActivity.this)
                          .setTitle("Merge Options")
                          .setMessage("Select at least 2 trips to merge, or cancel to exit merge mode.")
                          .setPositiveButton("Cancel Merge", (dialog, which) -> {
                              // Cancel merge mode
                              mergeMode = false;
                              selectedTripIds.clear();
                              mergeButton.setText("MERGE");
                              updateCategorizedTrips();
                          })
                          .setNegativeButton("Continue", null)
                          .show();
                      return;
                  }

                  // Confirm merge
                  new AlertDialog.Builder(MainActivity.this)
                      .setTitle("Confirm Merge")
                      .setMessage("Merge " + selectedTripIds.size() + " selected trips?\n\nThis will combine them into one trip and delete the originals.")
                      .setPositiveButton("Merge", (dialog, which) -> {
                          executeCategorizedMerge();
                      })
                      .setNegativeButton("Cancel", (dialog, which) -> {
                          // Cancel merge mode
                          mergeMode = false;
                          selectedTripIds.clear();
                          mergeButton.setText("MERGE");
                          updateCategorizedTrips();
                      })
                      .show();
              }
          });

          // Add long-press cancel for categorized merge button
          mergeButton.setOnLongClickListener(v -> {
              if (mergeMode) {
                  // Cancel merge mode on long press
                  mergeMode = false;
                  selectedTripIds.clear();
                  mergeButton.setText("MERGE");
                  updateCategorizedTrips();
                  return true;
              }
              return false;
          });

          categorizedContent.addView(buttonContainer);

          // Search and filter controls - compact layout
          LinearLayout searchSortLayout = new LinearLayout(this);
          searchSortLayout.setOrientation(LinearLayout.VERTICAL);
          searchSortLayout.setPadding(10, 15, 10, 10);

          // Search box
          LinearLayout searchRowLayout = new LinearLayout(this);
          searchRowLayout.setOrientation(LinearLayout.HORIZONTAL);
          searchRowLayout.setGravity(Gravity.CENTER_VERTICAL);
          searchRowLayout.setPadding(0, 0, 0, 5);

          TextView searchLabel = new TextView(this);
          searchLabel.setText("Search:");
          searchLabel.setTextSize(11);
          searchLabel.setTextColor(COLOR_TEXT_PRIMARY);
          searchLabel.setPadding(0, 0, 10, 0);
          searchRowLayout.addView(searchLabel);

          EditText searchBox = new EditText(this);
          searchBox.setHint("Address, distance, category...");
          searchBox.setHintTextColor(COLOR_TEXT_SECONDARY);
          searchBox.setTextColor(COLOR_TEXT_PRIMARY);
          searchBox.setTextSize(11);
          searchBox.setPadding(16, 12, 16, 12);
          // Modern rounded search box styling
          GradientDrawable searchBackground = new GradientDrawable();
          searchBackground.setColor(COLOR_CARD_BG);
          searchBackground.setCornerRadius(16);
          searchBackground.setStroke(1, COLOR_OUTLINE);
          searchBox.setBackground(searchBackground);
          LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
          searchBox.setLayoutParams(searchParams);
          searchBox.addTextChangedListener(new TextWatcher() {
              @Override
              public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

              @Override
              public void onTextChanged(CharSequence s, int start, int before, int count) {
                  currentSearchQuery = s.toString();
                  updateCategorizedTrips();
              }

              @Override
              public void afterTextChanged(Editable s) {}
          });
          searchRowLayout.addView(searchBox);

          searchSortLayout.addView(searchRowLayout);

          // Sort and category controls row
          LinearLayout controlsRowLayout = new LinearLayout(this);
          controlsRowLayout.setOrientation(LinearLayout.HORIZONTAL);
          controlsRowLayout.setGravity(Gravity.CENTER_VERTICAL);
          controlsRowLayout.setPadding(0, 5, 0, 0);

          // Sort dropdown
          TextView sortLabel = new TextView(this);
          sortLabel.setText("Sort:");
          sortLabel.setTextSize(11);
          sortLabel.setTextColor(COLOR_TEXT_PRIMARY);
          sortLabel.setPadding(0, 0, 5, 0);
          controlsRowLayout.addView(sortLabel);

          Button sortButton = new Button(this);
          sortButton.setText("Newest");
          sortButton.setTextSize(10);
          sortButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          sortButton.setTextColor(0xFFFFFFFF);
          sortButton.setPadding(8, 2, 8, 2);
          LinearLayout.LayoutParams sortParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          sortParams.setMargins(0, 0, 10, 0);
          sortButton.setLayoutParams(sortParams);
          sortButton.setOnClickListener(v -> {
              String[] sortOptions = {"Newest", "Oldest", "Distance", "Duration"};
              AlertDialog.Builder builder = new AlertDialog.Builder(this);
              builder.setTitle("Sort by")
                  .setItems(sortOptions, (dialog, which) -> {
                      sortButton.setText(sortOptions[which]);
                      currentSortOrder = sortOptions[which];
                      updateCategorizedTrips();
                  })
                  .show();
          });
          controlsRowLayout.addView(sortButton);

          // Category filter
          TextView categoryLabel = new TextView(this);
          categoryLabel.setText("Category:");
          categoryLabel.setTextSize(11);
          categoryLabel.setTextColor(COLOR_TEXT_PRIMARY);
          categoryLabel.setPadding(0, 0, 5, 0);
          controlsRowLayout.addView(categoryLabel);

          Button categoryFilterButton = new Button(this);
          categoryFilterButton.setText("All");
          categoryFilterButton.setTextSize(10);
          categoryFilterButton.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
          categoryFilterButton.setTextColor(0xFFFFFFFF);
          categoryFilterButton.setPadding(8, 2, 8, 2);
          categoryFilterButton.setMaxLines(1);
          categoryFilterButton.setEllipsize(TextUtils.TruncateAt.END);
          categoryFilterButton.setOnClickListener(v -> {
              List<String> categoryList = new ArrayList<>();
              categoryList.add("All");
              categoryList.add("Uncategorized");
              categoryList.addAll(tripStorage.getAllCategories());
              String[] categories = categoryList.toArray(new String[0]);

              AlertDialog.Builder builder = new AlertDialog.Builder(this);
              builder.setTitle("Filter by Category")
                  .setItems(categories, (dialog, which) -> {
                      categoryFilterButton.setText(categories[which]);
                      currentCategoryFilter = categories[which];
                      updateCategorizedTrips();
                  })
                  .setNeutralButton("Manage Categories", (dialog, which) -> {
                      showManageCategoriesDialog();
                  })
                  .show();
          });
          controlsRowLayout.addView(categoryFilterButton);

          searchSortLayout.addView(controlsRowLayout);
          categorizedContent.addView(searchSortLayout);

          // Scrollable trips container
          categorizedTripsScroll = new ScrollView(this);
          categorizedTripsContainer = new LinearLayout(this);
          categorizedTripsContainer.setOrientation(LinearLayout.VERTICAL);
          categorizedTripsScroll.addView(categorizedTripsContainer);

          LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              0,
              1.0f
          );
          categorizedTripsScroll.setLayoutParams(scrollParams);
          categorizedContent.addView(categorizedTripsScroll);
      }

      private void toggleApiSync() {
          // Block guest mode users from enabling sync
          if (isGuestMode) {
              promptGuestToRegister("sync");
              return;
          }

          try {
              boolean currentState = tripStorage.isApiSyncEnabled();
              tripStorage.setApiSyncEnabled(!currentState);
              updateApiToggleUI();
              updateStats();

              String message = tripStorage.isApiSyncEnabled() ? 
                  "API sync ON - downloading ALL your trips..." : 
                  "API sync OFF - local storage only";

              // Trigger download when API sync is turned ON
              if (tripStorage.isApiSyncEnabled()) {
                  triggerAllUserTripsDownload();
              }

          } catch (Exception e) {
              Log.e(TAG, "Error toggling API sync: " + e.getMessage(), e);
          }
      }

      private void updateApiToggleUI() {
          try {
              if (tripStorage.isApiSyncEnabled()) {
                  apiToggle.setText("ON");
                  apiToggle.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
                  apiToggle.setTextColor(0xFFFFFFFF);
              } else {
                  apiToggle.setText("OFF");
                  apiToggle.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
                  apiToggle.setTextColor(0xFFFFFFFF);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating API toggle UI: " + e.getMessage(), e);
          }
      }

      private void switchToTab(String tabName) {
          try {
              currentTab = tabName;
              EventTracker.trackTabViewed(this, tabName);
              mainContentLayout.removeAllViews();

              // Update all tab button colors
              updateAllTabButtonStates();

              if ("home".equals(tabName)) {
                  // Detach homeScroll from any parent first
                  if (homeScroll.getParent() != null) {
                      ((android.view.ViewGroup) homeScroll.getParent()).removeView(homeScroll);
                  }
                  mainContentLayout.addView(homeScroll);
                  updateRecentTrips();
                  updateAutoTrackBanner();
              } else if ("autotrack".equals(tabName)) {
                  // Detach autoTrackScroll from any parent first
                  if (autoTrackScroll.getParent() != null) {
                      ((android.view.ViewGroup) autoTrackScroll.getParent()).removeView(autoTrackScroll);
                  }
                  mainContentLayout.addView(autoTrackScroll);
              } else if ("trips".equals(tabName)) {
                  // Simple approach matching backup - just add categorizedContent directly
                  mainContentLayout.addView(categorizedContent);
                  updateCategorizedTrips();
              } else if ("reports".equals(tabName)) {
                  // Detach reportsScroll from any parent first
                  if (reportsScroll.getParent() != null) {
                      ((android.view.ViewGroup) reportsScroll.getParent()).removeView(reportsScroll);
                  }
                  mainContentLayout.addView(reportsScroll);
                  updateStats();
              } else if ("settings".equals(tabName)) {
                  // Detach settingsScroll from any parent first
                  if (settingsScroll.getParent() != null) {
                      ((android.view.ViewGroup) settingsScroll.getParent()).removeView(settingsScroll);
                  }
                  mainContentLayout.addView(settingsScroll);
              } else if ("categorized".equals(tabName)) {
                  // Legacy support
                  if (categorizedContent.getParent() != null) {
                      ((android.view.ViewGroup) categorizedContent.getParent()).removeView(categorizedContent);
                  }
                  mainContentLayout.addView(categorizedContent);
                  updateCategorizedTrips();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error switching tabs: " + e.getMessage(), e);
          }
      }

      private void updateRecentTrips() {
          try {
              recentTripsLayout.removeAllViews();
              List<Trip> trips = tripStorage.getAllTrips();

              if (trips.isEmpty()) {
                  TextView noTripsText = new TextView(this);
                  noTripsText.setText("No trips yet. API sync will download ALL your historic trips!");
                  noTripsText.setTextSize(12);
                  noTripsText.setTextColor(0xFF6C757D);
                  noTripsText.setPadding(10, 10, 10, 10);
                  recentTripsLayout.addView(noTripsText);
              } else {
                  // Sort trips by date/time descending to show newest first
                  trips.sort((t1, t2) -> {
                      if (t1.getStartTime() != 0 && t2.getStartTime() != 0) {
                          return Long.compare(t2.getStartTime(), t1.getStartTime());
                      }
                      return Long.compare(t2.getId(), t1.getId());
                  });

                  int maxTrips = Math.min(3, trips.size());
                  for (int i = 0; i < maxTrips; i++) {
                      Trip trip = trips.get(i);
                      addTripCard(recentTripsLayout, trip, true);
                  }
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating recent trips: " + e.getMessage(), e);
          }
      }

      // Field to track selected trips for merging
      private final List<String> selectedTripIds = new ArrayList<>();
      private boolean mergeMode = false;

      private void updateAllTrips() {
          filterAndDisplayTrips("", "Newest First", "All Categories");
      }

      private void updateClassifyTrips() {
          try {
              classifyTripsLayout.removeAllViews();

              List<Trip> allTrips = tripStorage.getAllTrips();
              List<Trip> uncategorizedTrips = new ArrayList<>();

              // Filter to only uncategorized trips
              for (Trip trip : allTrips) {
                  if (trip.getCategory() == null || 
                      trip.getCategory().isEmpty() || 
                      "Uncategorized".equals(trip.getCategory())) {
                      uncategorizedTrips.add(trip);
                  }
              }

              if (uncategorizedTrips.isEmpty()) {
                  TextView noTripsText = new TextView(this);
                  noTripsText.setText("No trips need classification. All trips are categorized!");
                  noTripsText.setTextSize(14);
                  noTripsText.setTextColor(0xFF666666);
                  noTripsText.setGravity(Gravity.CENTER);
                  noTripsText.setPadding(20, 40, 20, 40);
                  classifyTripsLayout.addView(noTripsText);
                  return;
              }

              // Create trip cards with swipe gestures
              for (Trip trip : uncategorizedTrips) {
                  addTripCard(classifyTripsLayout, trip, false);
              }

          } catch (Exception e) {
              Log.e(TAG, "Error updating classify trips: " + e.getMessage(), e);
          }
      }

      private void updateCategorizedTrips() {
          try {
              if (categorizedTripsContainer == null) {
                  Log.e("MainActivity", "categorizedTripsContainer is null!");
                  return;
              }

              categorizedTripsContainer.removeAllViews();

              List<Trip> allTrips = tripStorage.getAllTrips();
              Log.d("MainActivity", "updateCategorizedTrips: found " + allTrips.size() + " trips");

              if (allTrips.isEmpty()) {
                  TextView emptyText = new TextView(this);
                  emptyText.setText("No trips found. Tap REFRESH to sync your trips from the server.");
                  emptyText.setTextSize(16);
                  emptyText.setTextColor(COLOR_TEXT_PRIMARY);
                  emptyText.setGravity(Gravity.CENTER);
                  emptyText.setPadding(20, 40, 20, 40);
                  categorizedTripsContainer.addView(emptyText);
                  return;
              }

              // Start with all trips
              List<Trip> displayTrips = new ArrayList<>(allTrips);

              // Apply category filter (only if not "All")
              if (currentCategoryFilter != null && !"All".equals(currentCategoryFilter)) {
                  List<Trip> filtered = new ArrayList<>();
                  for (Trip trip : displayTrips) {
                      if (trip.getCategory() != null && currentCategoryFilter.equals(trip.getCategory())) {
                          filtered.add(trip);
                      }
                  }
                  displayTrips = filtered;
              }

              // Apply search filter (only if search query is not empty)
              if (currentSearchQuery != null && !currentSearchQuery.isEmpty()) {
                  List<Trip> filtered = new ArrayList<>();
                  String query = currentSearchQuery.toLowerCase();
                  for (Trip trip : displayTrips) {
                      String startAddr = trip.getStartAddress() != null ? trip.getStartAddress().toLowerCase() : "";
                      String endAddr = trip.getEndAddress() != null ? trip.getEndAddress().toLowerCase() : "";
                      String clientName = trip.getClientName() != null ? trip.getClientName().toLowerCase() : "";
                      String notes = trip.getNotes() != null ? trip.getNotes().toLowerCase() : "";
                      String category = trip.getCategory() != null ? trip.getCategory().toLowerCase() : "";

                      if (startAddr.contains(query) || endAddr.contains(query) || 
                          clientName.contains(query) || notes.contains(query) || category.contains(query)) {
                          filtered.add(trip);
                      }
                  }
                  displayTrips = filtered;
              }

              // Sort by newest first (default)
              displayTrips.sort((a, b) -> Long.compare(b.getStartTime(), a.getStartTime()));

              // Apply custom sorting if set
              if (currentSortOrder != null) {
                  switch (currentSortOrder) {
                      case "Oldest":
                          displayTrips.sort((a, b) -> Long.compare(a.getStartTime(), b.getStartTime()));
                          break;
                      case "Distance":
                          displayTrips.sort((a, b) -> Double.compare(b.getDistance(), a.getDistance()));
                          break;
                      case "Duration":
                          displayTrips.sort((a, b) -> Long.compare(b.getDuration(), a.getDuration()));
                          break;
                  }
              }

              Log.d("MainActivity", "updateCategorizedTrips: displaying " + displayTrips.size() + " trips after filtering");

              if (displayTrips.isEmpty()) {
                  TextView emptyText = new TextView(this);
                  emptyText.setText("No trips match your filters. Try changing the category or search.");
                  emptyText.setTextSize(16);
                  emptyText.setTextColor(COLOR_TEXT_PRIMARY);
                  emptyText.setGravity(Gravity.CENTER);
                  emptyText.setPadding(20, 40, 20, 40);
                  categorizedTripsContainer.addView(emptyText);
                  return;
              }

              // Create trip cards - same as Recent Trips but not compact
              for (Trip trip : displayTrips) {
                  addTripCard(categorizedTripsContainer, trip, false);
              }

              Log.d("MainActivity", "updateCategorizedTrips: added " + displayTrips.size() + " trip cards to container");

          } catch (Exception e) {
              Log.e("MainActivity", "Error updating categorized trips: " + e.getMessage(), e);
              // Show error message to user
              TextView errorText = new TextView(this);
              errorText.setText("Error loading trips: " + e.getMessage());
              errorText.setTextSize(14);
              errorText.setTextColor(0xFFFF0000);
              errorText.setGravity(Gravity.CENTER);
              errorText.setPadding(20, 40, 20, 40);
              categorizedTripsContainer.addView(errorText);
          }
      }

      private void filterAndDisplayTrips(String searchQuery, String sortOption, String categoryFilter) {
          try {
              allTripsLayout.removeAllViews();
              selectedTripIds.clear(); // Clear selection when refreshing
              List<Trip> trips = tripStorage.getAllTrips();

              Log.d(TAG, "filterAndDisplayTrips() called - found " + trips.size() + " trips, search: '" + searchQuery + "', sort: '" + sortOption + "', category: '" + categoryFilter + "'");

              // Apply search filter with null safety
              if (!searchQuery.isEmpty()) {
                  List<Trip> filteredTrips = new ArrayList<>();
                  String query = searchQuery.toLowerCase();
                  for (Trip trip : trips) {
                      // Null-safe string checking
                      String startAddr = trip.getStartAddress() != null ? trip.getStartAddress().toLowerCase() : "";
                      String endAddr = trip.getEndAddress() != null ? trip.getEndAddress().toLowerCase() : "";
                      String clientName = trip.getClientName() != null ? trip.getClientName().toLowerCase() : "";
                      String notes = trip.getNotes() != null ? trip.getNotes().toLowerCase() : "";

                      if (startAddr.contains(query) || endAddr.contains(query) || 
                          clientName.contains(query) || notes.contains(query)) {
                          filteredTrips.add(trip);
                      }
                  }
                  trips = filteredTrips;
              }

              // Apply category filter
              if (!"All Categories".equals(categoryFilter)) {
                  List<Trip> filteredTrips = new ArrayList<>();
                  for (Trip trip : trips) {
                      if (categoryFilter.equals(trip.getCategory())) {
                          filteredTrips.add(trip);
                      }
                  }
                  trips = filteredTrips;
              }

              // Apply sorting
              switch (sortOption) {
                  case "Newest First":
                      trips.sort((a, b) -> Long.compare(b.getStartTime(), a.getStartTime()));
                      break;
                  case "Oldest First":
                      trips.sort((a, b) -> Long.compare(a.getStartTime(), b.getStartTime()));
                      break;
                  case "Distance High-Low":
                      trips.sort((a, b) -> Double.compare(b.getDistance(), a.getDistance()));
                      break;
                  case "Distance Low-High":
                      trips.sort((a, b) -> Double.compare(a.getDistance(), b.getDistance()));
                      break;
              }

              if (trips.isEmpty()) {
                  TextView noTripsText = new TextView(this);
                  if (searchQuery.isEmpty() && "All Categories".equals(categoryFilter)) {
                      noTripsText.setText("No trips recorded yet.\n\nNEW FEATURE v4.9.71:\n• DATABASE FIELD MAPPING FIXED\n• PROPER TIMESTAMP PARSING\n• AUTO-DETECTION STATUS RESTORED\n• DURATION & DATE CALCULATIONS\n• ENCRYPTED DATA HANDLING\n\nTurn ON API sync to see ALL your historic trips!");
                  } else {
                      noTripsText.setText("No trips match your search\n\nTry different keywords or change the category filter");
                  }
                  noTripsText.setTextSize(14);
                  noTripsText.setTextColor(0xFF6C757D);
                  noTripsText.setPadding(15, 30, 15, 15);
                  allTripsLayout.addView(noTripsText);
              } else {
                  // Add result count header
                  TextView tripCount = new TextView(this);
                  tripCount.setText(String.format("Showing %d trip%s", trips.size(), trips.size() == 1 ? "" : "s"));
                  tripCount.setTextSize(12);
                  tripCount.setTextColor(0xFF6C757D);
                  tripCount.setPadding(15, 5, 15, 10);
                  allTripsLayout.addView(tripCount);

                  for (Trip trip : trips) {
                      addTripCard(allTripsLayout, trip, false);
                  }
              }

              // Force UI refresh - critical fix for SearchView data display issue
              allTripsLayout.invalidate();
              allTripsLayout.requestLayout();
              allTripsScroll.invalidate();
              allTripsScroll.requestLayout();

          } catch (Exception e) {
              Log.e(TAG, "Error updating all trips: " + e.getMessage(), e);
          }
      }

      private void executeTripseMerge() {
          try {
              tripStorage.mergeUserTrips(selectedTripIds);

              // Exit merge mode and refresh
              mergeMode = false;
              selectedTripIds.clear();
              updateAllTrips();
              updateStats();

              // Reset merge button - for classify tab only
              Button mergeButton = (Button) ((LinearLayout) tripsContent.getChildAt(0)).getChildAt(1);
              mergeButton.setText("Merge");
              mergeButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));

          } catch (Exception e) {
              Log.e(TAG, "Error merging trips: " + e.getMessage(), e);
              Toast.makeText(this, "Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void executeCategorizedMerge() {
          try {
              tripStorage.mergeUserTrips(selectedTripIds);

              // Exit merge mode and refresh
              mergeMode = false;
              selectedTripIds.clear();
              updateCategorizedTrips();
              updateStats();

              // Reset merge button for categorized tab - access through categorizedContent
              LinearLayout buttonContainer = (LinearLayout) categorizedContent.getChildAt(1);
              LinearLayout buttonLayout = (LinearLayout) buttonContainer.getChildAt(0);
              Button mergeButton = (Button) buttonLayout.getChildAt(1);
              mergeButton.setText("MERGE");

          } catch (Exception e) {
              Log.e(TAG, "Error merging trips: " + e.getMessage(), e);
              Toast.makeText(this, "Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void executeClassifyMerge() {
          try {
              tripStorage.mergeUserTrips(selectedTripIds);

              // Exit merge mode and refresh
              mergeMode = false;
              selectedTripIds.clear();

              // Reset merge button text
              classifyMergeButton.setText("MERGE");

              updateClassifyTrips();
              updateStats();

          } catch (Exception e) {
              Log.e(TAG, "Error merging trips: " + e.getMessage(), e);
              Toast.makeText(this, "Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void addTripCard(LinearLayout parentLayout, Trip trip, boolean compact) {
          try {
              Log.d(TAG, "Adding trip card for: " + trip.getStartAddress() + " -> " + trip.getEndAddress());

              // Create container for checkbox + trip info
              LinearLayout cardContainer = new LinearLayout(this);
              cardContainer.setOrientation(LinearLayout.VERTICAL); // Changed to vertical for better icon attachment
              cardContainer.setPadding(15, 15, 15, 15);

              // Professional card styling with subtle borders
              GradientDrawable border = new GradientDrawable();
              border.setColor(COLOR_CARD_BG); // Clean white background

              // Subtle border - slightly thicker for uncategorized to draw attention
              if ("Uncategorized".equals(trip.getCategory())) {
                  border.setStroke(2, COLOR_PRIMARY); // Navy border for uncategorized
              } else {
                  border.setStroke(1, COLOR_OUTLINE); // Subtle gray border for categorized
              }

              border.setCornerRadius(16); // Modern rounded corners
              cardContainer.setBackground(border);

              // Add checkbox in merge mode
              if (mergeMode && !compact) {
                  CheckBox checkbox = new CheckBox(this);
                  checkbox.setChecked(selectedTripIds.contains(String.valueOf(trip.getId())));
                  checkbox.setOnCheckedChangeListener((buttonView, isChecked) -> {
                      String tripId = String.valueOf(trip.getId());
                      if (isChecked) {
                          if (!selectedTripIds.contains(tripId)) {
                              selectedTripIds.add(tripId);
                          }
                      } else {
                          selectedTripIds.remove(tripId);
                      }

                      // Update merge button text for categorized and classify tabs
                      try {
                          if (currentTab.equals("categorized")) {
                              LinearLayout buttonContainer = (LinearLayout) categorizedContent.getChildAt(1);
                              LinearLayout buttonLayout = (LinearLayout) buttonContainer.getChildAt(0);
                              Button mergeButton = (Button) buttonLayout.getChildAt(1);
                              mergeButton.setText("Execute Merge (" + selectedTripIds.size() + ")");
                          } else if (currentTab.equals("classify")) {
                              classifyMergeButton.setText("Execute Merge (" + selectedTripIds.size() + ")");
                          }
                      } catch (Exception e) {
                          Log.e(TAG, "Error updating merge button text", e);
                      }
                  });

                  LinearLayout.LayoutParams checkboxParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.WRAP_CONTENT, 
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  );
                  checkbox.setLayoutParams(checkboxParams);
                  cardContainer.addView(checkbox);
              }

              TextView tripView = new TextView(this);
              String tripType = trip.isAutoDetected() ? "AUTO" : "MANUAL";
              String apiStatus = "";

              if (compact) {
                  tripView.setText(String.format(
                      "%s • %s • %.2fmi",
                      trip.getCompactDateTime(),
                      tripType,
                      trip.getDistance()
                  ));
                  tripView.setTextSize(10);
                  tripView.setSingleLine(true);
                  tripView.setEllipsize(android.text.TextUtils.TruncateAt.END);
              } else {
                  StringBuilder tripDetails = new StringBuilder();

                  // Get auto-classification suggestion
                  String startSuggestion = getAutoClassificationSuggestion(trip.getStartAddress());
                  String endSuggestion = getAutoClassificationSuggestion(trip.getEndAddress());
                  String autoSuggestion = startSuggestion != null ? startSuggestion : endSuggestion;

                  // Add swipe hint if there's an auto-classification suggestion
                  String swipeHint = "";
                  if (autoSuggestion != null && !autoSuggestion.equals(trip.getCategory())) {
                      swipeHint = String.format(" (Suggest: %s)", autoSuggestion);
                  }

                  // Shorten category name for display
                  String displayCategory = trip.getCategory();
                  if ("Uncategorized".equals(displayCategory)) {
                      displayCategory = "Uncat.";
                  }

                  // Abbreviate state names in addresses
                  String startAddr = abbreviateState(trip.getStartAddress() != null && !trip.getStartAddress().trim().isEmpty() ? trip.getStartAddress() : "Unknown");
                  String endAddr = abbreviateState(trip.getEndAddress() != null && !trip.getEndAddress().trim().isEmpty() ? trip.getEndAddress() : "Unknown");

                  tripDetails.append(String.format(
                      "%s • %s\n%.2f mi • %s • %s%s\n\nFrom: %s\nTo: %s",
                      tripType,
                      trip.getFormattedDateTime(),
                      trip.getDistance(),
                      trip.getFormattedDuration(),
                      displayCategory,
                      swipeHint,
                      startAddr,
                      endAddr
                  ));

                  // ADD CLIENT AND NOTES TO TRIP DISPLAY
                  if (trip.getClientName() != null && !trip.getClientName().trim().isEmpty()) {
                      tripDetails.append("\nClient: ").append(trip.getClientName());
                  }
                  if (trip.getNotes() != null && !trip.getNotes().trim().isEmpty()) {
                      tripDetails.append("\nNotes: ").append(trip.getNotes());
                  }

                  // ADD DIAGNOSTIC INFORMATION (only in developer mode)
                  if (developerMode) {
                      tripDetails.append("\n[DIAGNOSTIC: ");

                  // Vehicle info
                  String vehicleInfo = "None";
                  if (trip.getVehicleName() != null && !trip.getVehicleName().trim().isEmpty()) {
                      vehicleInfo = trip.getVehicleName();
                  }
                  tripDetails.append("Vehicle: ").append(vehicleInfo).append(" | ");

                  // Detection method
                  String detectionMethod = "Manual";
                  if (trip.isAutoDetected()) {
                      if (vehicleInfo.equals("None")) {
                          detectionMethod = "AutoDetection";
                      } else {
                          detectionMethod = "Bluetooth";
                      }
                  }
                  tripDetails.append("Method: ").append(detectionMethod).append(" | ");

                  // Timestamp validation
                  String timeStatus = "Valid";
                  if (trip.getStartTime() < 946684800000L) { // Before Jan 1, 2000
                      timeStatus = "CORRUPTED (12/31/69)";
                  }
                  tripDetails.append("Time: ").append(timeStatus).append(" | ");

                  // Unique trip ID (for Stage 1 verification)
                  String uniqueId = trip.getUniqueTripId();
                  if (uniqueId != null && !uniqueId.isEmpty()) {
                      tripDetails.append("UUID: ").append(uniqueId.substring(0, 8)).append("... | ");
                  } else {
                      tripDetails.append("UUID: Missing | ");
                  }

                  // Sync status (simple check based on trip ID)
                  String syncStatus = "Unknown";
                  if (trip.getId() > 0 && trip.getId() < 1000000) {
                      syncStatus = "Local Only";
                  } else if (trip.getId() >= 1000000) {
                      syncStatus = "API Synced";
                  } else {
                      syncStatus = "Unknown";
                  }
                  tripDetails.append("Sync: ").append(syncStatus).append("]");
                  } // End developer mode diagnostic section

                  // Swipe instructions removed - they're already shown at the top of the page

                  tripView.setText(tripDetails.toString());
                  tripView.setTextSize(12);
              }

              tripView.setTextColor(COLOR_TEXT_PRIMARY);
              tripView.setPadding(10, 10, 10, 10);
              // Set background color based on trip category
              int backgroundColor = getPersistentCategoryColor(trip.getCategory());
              tripView.setBackgroundColor(backgroundColor);
              tripView.setMinHeight(60); // Ensure minimum height for visibility

              // Enable direct touch-based swipe detection (much more reliable)
              if (!compact && !mergeMode) {
                  tripView.setOnTouchListener(new View.OnTouchListener() {
                      private float startX, startY;
                      private long startTime;
                      private boolean touchStarted = false;

                      @Override
                      public boolean onTouch(View v, MotionEvent event) {
                          Log.d(TAG, "Direct touch event: " + event.getAction() + " on trip: " + trip.getId());

                          switch (event.getAction()) {
                              case MotionEvent.ACTION_DOWN:
                                  startX = event.getX();
                                  startY = event.getY();
                                  startTime = System.currentTimeMillis();
                                  touchStarted = true;
                                  currentSwipeTrip = trip;
                                  currentSwipeView = cardContainer;
                                  Log.d(TAG, "Touch started at: " + startX + ", " + startY);
                                  return true;

                              case MotionEvent.ACTION_MOVE:
                                  if (touchStarted && !swipeInProgress) {
                                      float deltaX = event.getX() - startX;
                                      float deltaY = event.getY() - startY;

                                      Log.d(TAG, "Touch move - deltaX: " + deltaX + ", deltaY: " + deltaY);

                                      // EXTREMELY SENSITIVE: Only need 8px movement and horizontal dominance
                                      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                                          swipeInProgress = true;

                                          if (deltaX > 0) {
                                              // Right swipe - Business
                                              Log.d(TAG, "Right swipe detected - Business");
                                              performSwipeClassification(trip, "Business", 0xFFC7D9F2);
                                          } else {
                                              // Left swipe - Personal
                                              Log.d(TAG, "Left swipe detected - Personal");
                                              performSwipeClassification(trip, "Personal", 0xFFD4E7D7);
                                          }
                                          return true;
                                      }
                                  }
                                  return true;

                              case MotionEvent.ACTION_UP:
                                  if (touchStarted && !swipeInProgress) {
                                      // Normal click - only if no swipe occurred
                                      long touchDuration = System.currentTimeMillis() - startTime;
                                      if (touchDuration < 300) { // Short tap
                                          Log.d(TAG, "Normal click detected on trip: " + trip.getId());
                                          v.performClick();
                                      }
                                  }
                                  touchStarted = false;
                                  return true;

                              case MotionEvent.ACTION_CANCEL:
                                  touchStarted = false;
                                  return true;
                          }
                          return false;
                      }
                  });

                  // Make sure the view is clickable to receive touch events
                  tripView.setClickable(true);
                  tripView.setFocusable(true);
                  tripView.setLongClickable(false); // Disable long click to avoid conflicts
                  Log.d(TAG, "Swipe gestures enabled for trip: " + trip.getId());
              }

              // Create vertical layout for trip content + icons FIRST
              LinearLayout tripContentLayout = new LinearLayout(this);
              tripContentLayout.setOrientation(LinearLayout.VERTICAL);
              tripContentLayout.addView(tripView);

              // Add icons row at the bottom of the trip content (non-compact view only)
              if (!compact) {
                  // Icons row positioned at bottom with background to clearly attach to trip
                  LinearLayout iconsRow = new LinearLayout(this);
                  iconsRow.setOrientation(LinearLayout.HORIZONTAL);
                  iconsRow.setGravity(Gravity.CENTER);
                  iconsRow.setPadding(10, 8, 10, 8);
                  iconsRow.setBackgroundColor(COLOR_BACKGROUND); // Theme-aware background to visually attach icons to trip

                  // Create rounded corners for icon area
                  GradientDrawable iconBorder = new GradientDrawable();
                  iconBorder.setColor(COLOR_BACKGROUND);
                  iconBorder.setCornerRadius(12);
                  iconsRow.setBackground(iconBorder);

                  LinearLayout.LayoutParams iconsRowParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.MATCH_PARENT,
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  );
                  iconsRowParams.setMargins(0, 15, 0, 0); // Top margin to separate from trip details
                  iconsRow.setLayoutParams(iconsRowParams);

                  // Edit button - professional text button
                  Button editButton = new Button(this);
                  editButton.setText("Edit");
                  editButton.setTextSize(12);
                  editButton.setTextColor(0xFFFFFFFF);
                  editButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
                  editButton.setPadding(20, 10, 20, 10);
                  editButton.setOnClickListener(v -> showEditTripDialog(trip));

                  LinearLayout.LayoutParams editParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.WRAP_CONTENT,
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  );
                  editParams.setMargins(10, 0, 10, 0);

                  // Split button - professional text button
                  Button splitButton = new Button(this);
                  splitButton.setText("Split");
                  splitButton.setTextSize(12);
                  splitButton.setTextColor(0xFFFFFFFF);
                  splitButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
                  splitButton.setPadding(20, 10, 20, 10);
                  splitButton.setOnClickListener(v -> showSplitTripDialog(trip));

                  LinearLayout.LayoutParams splitParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.WRAP_CONTENT,
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  );
                  splitParams.setMargins(10, 0, 10, 0);

                  // Delete button - professional text button
                  Button deleteButton = new Button(this);
                  deleteButton.setText("Delete");
                  deleteButton.setTextSize(12);
                  deleteButton.setTextColor(0xFFFFFFFF);
                  deleteButton.setBackground(createRoundedBackground(COLOR_ERROR, 14));
                  deleteButton.setPadding(20, 10, 20, 10);
                  deleteButton.setOnClickListener(v -> showDeleteConfirmationDialog(trip));

                  LinearLayout.LayoutParams deleteParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.WRAP_CONTENT,
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  );
                  deleteParams.setMargins(10, 0, 10, 0);

                  iconsRow.addView(editButton, editParams);
                  iconsRow.addView(splitButton, splitParams);
                  iconsRow.addView(deleteButton, deleteParams);

                  tripContentLayout.addView(iconsRow);
              }

              // Set layout params for trip content within container
              LinearLayout.LayoutParams tripContentParams = new LinearLayout.LayoutParams(
                  LinearLayout.LayoutParams.MATCH_PARENT, 
                  LinearLayout.LayoutParams.WRAP_CONTENT
              );
              tripContentLayout.setLayoutParams(tripContentParams);
              cardContainer.addView(tripContentLayout);

              // Set layout params with better spacing between cards
              LinearLayout.LayoutParams containerParams = new LinearLayout.LayoutParams(
                  LinearLayout.LayoutParams.MATCH_PARENT,
                  LinearLayout.LayoutParams.WRAP_CONTENT
              );
              containerParams.setMargins(0, 5, 0, 20); // Increased bottom margin for better separation
              cardContainer.setLayoutParams(containerParams);

              // Add the card container to parent layout AFTER everything is built
              parentLayout.addView(cardContainer);
              Log.d(TAG, "Trip card added successfully to parent layout");
          } catch (Exception e) {
              Log.e(TAG, "Error adding trip card: " + e.getMessage(), e);
          }
      }

      // ENHANCED ADD TRIP DIALOG WITH DURATION INPUT FIELD
      private void showAddTripDialog() {
          try {
              AlertDialog.Builder builder = new AlertDialog.Builder(this);
              builder.setTitle("Add Trip");

              ScrollView scrollView = new ScrollView(this);
              LinearLayout layout = new LinearLayout(this);
              layout.setOrientation(LinearLayout.VERTICAL);
              layout.setPadding(40, 15, 40, 15);

              // DATE PICKER FIELD
              TextView dateLabel = new TextView(this);
              dateLabel.setText("Trip Date:");
              dateLabel.setTextSize(14);
              dateLabel.setTextColor(COLOR_TEXT_PRIMARY);
              dateLabel.setPadding(0, 0, 0, 5);
              layout.addView(dateLabel);

              Button datePickerButton = new Button(this);
              datePickerButton.setText("Select Date");
              datePickerButton.setBackground(createRoundedBackground(COLOR_CARD_BG, 14));
              datePickerButton.setTextColor(COLOR_TEXT_PRIMARY);
              java.util.Calendar calendar = java.util.Calendar.getInstance();
              final int[] selectedYear = {calendar.get(java.util.Calendar.YEAR)};
              final int[] selectedMonth = {calendar.get(java.util.Calendar.MONTH)};
              final int[] selectedDay = {calendar.get(java.util.Calendar.DAY_OF_MONTH)};

              datePickerButton.setText(String.format("%d/%d/%d", selectedMonth[0] + 1, selectedDay[0], selectedYear[0]));

              datePickerButton.setOnClickListener(v -> {
                  android.app.DatePickerDialog datePickerDialog = new android.app.DatePickerDialog(
                      this,
                      (view, year, month, dayOfMonth) -> {
                          selectedYear[0] = year;
                          selectedMonth[0] = month;
                          selectedDay[0] = dayOfMonth;
                          datePickerButton.setText(String.format("%d/%d/%d", month + 1, dayOfMonth, year));
                      },
                      selectedYear[0], selectedMonth[0], selectedDay[0]
                  );
                  datePickerDialog.show();
              });
              layout.addView(datePickerButton);

              EditText startLocationInput = new EditText(this);
              startLocationInput.setHint("Start location (e.g., Home)");
              layout.addView(startLocationInput);

              EditText endLocationInput = new EditText(this);
              endLocationInput.setHint("End location (e.g., Client Office)");
              layout.addView(endLocationInput);

              EditText distanceInput = new EditText(this);
              distanceInput.setHint("Distance in miles (e.g., 12.5)");
              distanceInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
              layout.addView(distanceInput);

              // DURATION INPUT FIELD
              TextView durationLabel = new TextView(this);
              durationLabel.setText("Duration (enter your own time):");
              durationLabel.setTextSize(14);
              durationLabel.setTextColor(COLOR_TEXT_PRIMARY);
              durationLabel.setPadding(0, 10, 0, 5);
              layout.addView(durationLabel);

              EditText durationInput = new EditText(this);
              durationInput.setHint("Duration in minutes (e.g., 25)");
              durationInput.setInputType(InputType.TYPE_CLASS_NUMBER);
              layout.addView(durationInput);

              Spinner categorySpinner = new Spinner(this);
              List<String> allCategories = new ArrayList<>();
              allCategories.add("Uncategorized");
              allCategories.addAll(tripStorage.getAllCategories());
              String[] categories = allCategories.toArray(new String[0]);
              ArrayAdapter<String> categoryAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, categories);
              categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
              categorySpinner.setAdapter(categoryAdapter);
              categorySpinner.setSelection(0); // Default to "Uncategorized"
              layout.addView(categorySpinner);

              // CLIENT DROPDOWN
              TextView clientLabel = new TextView(this);
              clientLabel.setText("Client (Optional):");
              clientLabel.setTextSize(14);
              clientLabel.setTextColor(COLOR_TEXT_PRIMARY);
              clientLabel.setPadding(0, 10, 0, 5);
              layout.addView(clientLabel);

              Spinner clientSpinner = new Spinner(this);
              List<String> clientOptions = getClientOptions();
              ArrayAdapter<String> clientAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, clientOptions);
              clientAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
              clientSpinner.setAdapter(clientAdapter);
              layout.addView(clientSpinner);

              // NOTES FIELD
              TextView notesLabel = new TextView(this);
              notesLabel.setText("Notes/Description (Optional):");
              notesLabel.setTextSize(14);
              notesLabel.setTextColor(COLOR_TEXT_PRIMARY);
              notesLabel.setPadding(0, 10, 0, 5);
              layout.addView(notesLabel);

              EditText notesInput = new EditText(this);
              notesInput.setHint("Purpose, meeting details, project notes, etc.");
              notesInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
              notesInput.setMinLines(2);
              notesInput.setMaxLines(4);
              layout.addView(notesInput);

              scrollView.addView(layout);
              builder.setView(scrollView);

              builder.setPositiveButton("Save Trip", (dialog, which) -> {
                  String startLocation = startLocationInput.getText().toString().trim();
                  String endLocation = endLocationInput.getText().toString().trim();
                  String distanceStr = distanceInput.getText().toString().trim();
                  String durationStr = durationInput.getText().toString().trim();
                  String category = categorySpinner.getSelectedItem().toString();
                  String selectedClient = clientSpinner.getSelectedItem().toString();
                  String notes = notesInput.getText().toString().trim();

                  if (startLocation.isEmpty() || endLocation.isEmpty() || distanceStr.isEmpty() || durationStr.isEmpty()) {
                      return;
                  }

                  try {
                      double distance = Double.parseDouble(distanceStr);
                      int durationMinutes = Integer.parseInt(durationStr);

                      // Process client selection
                      String clientName = null;
                      if (!"None".equals(selectedClient) && !"+ Add New Client".equals(selectedClient)) {
                          clientName = selectedClient;
                      }

                      // Create selected date timestamp
                      java.util.Calendar selectedDate = java.util.Calendar.getInstance();
                      selectedDate.set(selectedYear[0], selectedMonth[0], selectedDay[0], 0, 0, 0);
                      selectedDate.set(java.util.Calendar.MILLISECOND, 0);
                      long selectedDateTimestamp = selectedDate.getTimeInMillis();

                      if ("+ Add New Client".equals(selectedClient)) {
                          // Show add new client dialog
                          showAddClientDialog(startLocation, endLocation, distance, durationMinutes, category, notes, selectedDateTimestamp);
                          return;
                      }

                      saveManualTripWithDuration(startLocation, endLocation, distance, durationMinutes, category, clientName, notes, selectedDateTimestamp);

                  } catch (NumberFormatException e) {
                  }
              });

              builder.setNegativeButton("Cancel", null);
              builder.show();
          } catch (Exception e) {
              Log.e(TAG, "Error showing add trip dialog: " + e.getMessage(), e);
          }
      }

      private List<String> getClientOptions() {
          List<String> options = new ArrayList<>();
          options.add("None");

          // Get existing clients from trips
          List<Trip> trips = tripStorage.getAllTrips();
          List<String> existingClients = new ArrayList<>();
          for (Trip trip : trips) {
              if (trip.getClientName() != null && !trip.getClientName().trim().isEmpty()) {
                  String clientName = trip.getClientName().trim();
                  if (!existingClients.contains(clientName)) {
                      existingClients.add(clientName);
                  }
              }
          }

          options.addAll(existingClients);
          options.add("+ Add New Client");

          return options;
      }

      private void showAddClientDialog(String startLocation, String endLocation, double distance, int durationMinutes, String category, String notes, long selectedDateTimestamp) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Add New Client");

          EditText clientInput = new EditText(this);
          clientInput.setHint("Client name (e.g., ABC Company)");
          builder.setView(clientInput);

          builder.setPositiveButton("Add Client", (dialog, which) -> {
              String newClientName = clientInput.getText().toString().trim();
              if (!newClientName.isEmpty()) {
                  saveManualTripWithDuration(startLocation, endLocation, distance, durationMinutes, category, newClientName, notes, selectedDateTimestamp);
              } else {
              }
          });

          builder.setNegativeButton("Cancel", null);
          builder.show();
      }

      // Use user-entered duration instead of calculated
      private void saveManualTripWithDuration(String startLocation, String endLocation, double distance, int durationMinutes, String category, String clientName, String notes, long selectedDateTimestamp) {
          try {
              Trip trip = new Trip();
              trip.setStartAddress(startLocation);
              trip.setEndAddress(endLocation);
              trip.setDistance(distance);
              trip.setCategory(category);
              trip.setAutoDetected(false);
              trip.setAutoDetected(false); // Fix labeling bug - manual trips

              // SET CLIENT AND NOTES
              trip.setClientName(clientName);
              trip.setNotes(notes);

              // Set approximate coordinates
              trip.setStartLatitude(40.7128);
              trip.setStartLongitude(-74.0060);
              trip.setEndLatitude(40.7589);
              trip.setEndLongitude(-73.9851);

              // USE USER-ENTERED DURATION AND SELECTED DATE
              long userDuration = durationMinutes * 60 * 1000; // Convert minutes to milliseconds
              trip.setStartTime(selectedDateTimestamp);
              trip.setEndTime(selectedDateTimestamp + userDuration);
              trip.setDuration(userDuration);

              // Generate unique ID
              long currentTime = System.currentTimeMillis();
              trip.setId(currentTime);

              Log.d(TAG, String.format("Manual trip with USER duration: %.2f miles, %d minutes", distance, durationMinutes));

              // Save locally
              tripStorage.saveTrip(trip);

              // Save to API if enabled
              if (tripStorage.isApiSyncEnabled()) {
                  CloudBackupService cloudBackup = new CloudBackupService(this);
                  cloudBackup.backupTrip(trip);
                  String clientInfo = clientName != null ? " for " + clientName : "";
                  String notesInfo = notes != null && !notes.isEmpty() ? " with notes" : "";
              } else {
              }

              // Check if we should send a gentle feedback notification
              checkAndSendFeedbackNotification();

              updateStats();

              if ("home".equals(currentTab)) {
                  updateRecentTrips();
              } else if ("trips".equals(currentTab) || "categorized".equals(currentTab)) {
                  updateCategorizedTrips();
              } else {
                  updateAllTrips();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error saving manual trip with duration: " + e.getMessage(), e);
          }
      }

      // Rest of methods - copy exactly from working version (no changes needed)
      private void startManualTrip() {
          try {
              if (manualTripInProgress) {
                  return;
              }

              // Pause auto detection during manual trip to prevent duplicates
              if (autoDetectionEnabled) {
                  SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", Context.MODE_PRIVATE);
                  prefs.edit().putBoolean("auto_detection_was_enabled", true).apply();
                  autoDetectionEnabled = false;
                  if (autoToggle != null) {
                      autoToggle.setChecked(false);
                  }
              }

              Intent serviceIntent = new Intent(this, ManualTripService.class);
              serviceIntent.setAction("START_MANUAL_TRIP");
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                  startForegroundService(serviceIntent);
              } else {
                  startService(serviceIntent);
              }

              manualTripInProgress = true;
              manualStartButton.setEnabled(false);
              manualStopButton.setVisibility(View.VISIBLE);
              manualStopButton.setEnabled(true);
              statusText.setText("Manual trip recording...");

              String apiStatus = tripStorage.isApiSyncEnabled() ? " with API sync" : " (local only)";
          } catch (Exception e) {
              Log.e(TAG, "Error starting manual trip: " + e.getMessage(), e);
          }
      }

      private void stopManualTrip() {
          try {
              if (!manualTripInProgress) {
                  return;
              }

              Intent serviceIntent = new Intent(this, ManualTripService.class);
              serviceIntent.setAction("STOP_MANUAL_TRIP");
              startService(serviceIntent);

              manualTripInProgress = false;
              manualStartButton.setEnabled(true);
              manualStopButton.setVisibility(View.GONE);
              manualStopButton.setEnabled(false);
              statusText.setText("Manual trip completed");

              // Resume auto detection if it was enabled before manual trip
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", Context.MODE_PRIVATE);
              boolean wasAutoEnabled = prefs.getBoolean("auto_detection_was_enabled", false);
              if (wasAutoEnabled) {
                  autoDetectionEnabled = true;
                  if (autoToggle != null) {
                      autoToggle.setChecked(true);
                  }
                  prefs.edit().remove("auto_detection_was_enabled").apply();
              }

              String apiStatus = tripStorage.isApiSyncEnabled() ? " and synced!" : " (saved locally)!";
          } catch (Exception e) {
              Log.e(TAG, "Error stopping manual trip: " + e.getMessage(), e);
          }
      }

      private void toggleAutoDetection() {
          try {
              autoDetectionEnabled = !autoDetectionEnabled;

              // Save auto detection state to SharedPreferences
              // FIXED: Use MileTrackerPrefs consistently
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              prefs.edit().putBoolean("auto_detection_enabled", autoDetectionEnabled).apply();

              if (autoDetectionEnabled) {
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("START_AUTO_DETECTION");

                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      startForegroundService(serviceIntent);
                  } else {
                      startService(serviceIntent);
                  }

                  // Enable Bluetooth vehicle scanning - using consolidated approach
                  try {
                      // Start periodic connection checking directly in MainActivity
                      startPeriodicBluetoothConnectionCheck();
                      bluetoothServiceStarted = true;
                      Log.d(TAG, "Bluetooth vehicle scanning enabled");
                  } catch (Exception e) {
                      Log.e(TAG, "Error starting BluetoothVehicleService: " + e.getMessage(), e);
                      // Fall back to MainActivity's built-in Bluetooth discovery
                      startBuiltInBluetoothDiscovery();
                  }

                  autoToggle.setChecked(true);
                  statusText.setText("Auto detection active - Monitoring for trips");

                  String apiStatus = tripStorage.isApiSyncEnabled() ? " with API sync" : " (local only)";
              } else {
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("STOP_AUTO_DETECTION");
                  startService(serviceIntent);

                  // Disable Bluetooth vehicle scanning
                  Intent bluetoothIntent = new Intent(this, BluetoothVehicleService.class);
                  bluetoothIntent.setAction("STOP_BLUETOOTH_MONITORING");
                  startService(bluetoothIntent);
                  bluetoothServiceStarted = false;
                  Log.d(TAG, "Bluetooth vehicle scanning disabled");

                  autoToggle.setChecked(false);
                  statusText.setText("Auto detection stopped");
              }

              updateStats();

              // Update Bluetooth status immediately after toggle
              updateBluetoothStatus();
          } catch (Exception e) {
              Log.e(TAG, "Error toggling auto detection: " + e.getMessage(), e);
          }
      }

      private void showDeviceManagementDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Device Management");

          // Create scrollable dialog layout
          ScrollView scrollView = new ScrollView(this);
          scrollView.setLayoutParams(new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT
          ));

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(30, 20, 30, 20);

          // Current Device Info
          TextView currentDeviceHeader = new TextView(this);
          currentDeviceHeader.setText("🔵 Current Device");
          currentDeviceHeader.setTextSize(16);
          currentDeviceHeader.setTextColor(COLOR_TEXT_PRIMARY);
          currentDeviceHeader.setTypeface(null, Typeface.BOLD);
          currentDeviceHeader.setPadding(0, 0, 0, 10);
          dialogLayout.addView(currentDeviceHeader);

          UserAuthManager authManager = new UserAuthManager(this);
          String deviceEmail = authManager.getDeviceEmail();
          String deviceName = authManager.getDeviceName();

          TextView currentDeviceInfo = new TextView(this);
          currentDeviceInfo.setText("Email: " + deviceEmail + "\nModel: " + deviceName + "\nStatus: Active");
          currentDeviceInfo.setTextSize(14);
          currentDeviceInfo.setTextColor(COLOR_SUCCESS);
          currentDeviceInfo.setPadding(10, 5, 10, 15);
          currentDeviceInfo.setBackgroundColor(0xFFE8F5E8);
          dialogLayout.addView(currentDeviceInfo);

          // Family Device Slots - Coming Soon
          TextView familyDevicesHeader = new TextView(this);
          familyDevicesHeader.setText("👨‍👩‍👧‍👦 Family Sharing (Coming Soon)");
          familyDevicesHeader.setTextSize(16);
          familyDevicesHeader.setTextColor(COLOR_TEXT_PRIMARY);
          familyDevicesHeader.setTypeface(null, Typeface.BOLD);
          familyDevicesHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(familyDevicesHeader);

          TextView familyInfo = new TextView(this);
          familyInfo.setText("Family plan coming soon!\n\n" +
              "Share your subscription with up to 3 devices - perfect for couples or families tracking separate vehicles.\n\n" +
              "Currently: Your trips sync to your account and are accessible when you log in on any device.");
          familyInfo.setTextSize(14);
          familyInfo.setTextColor(COLOR_TEXT_SECONDARY);
          familyInfo.setPadding(10, 5, 10, 15);
          familyInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(familyInfo);

          scrollView.addView(dialogLayout);
          builder.setView(scrollView);

          builder.setPositiveButton("OK", (dialog, which) -> {
              dialog.dismiss();
          });

          AlertDialog dialog = builder.create();
          dialog.show();
      }

      private void showSettingsDialog() {
          EventTracker.trackFeatureUsed(this, "settings_opened");
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Settings");

          // Create scrollable dialog layout
          ScrollView scrollView = new ScrollView(this);
          scrollView.setLayoutParams(new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT
          ));

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(30, 20, 30, 20);

          // Account Information Section
          TextView accountHeader = new TextView(this);
          accountHeader.setText("👤 Account Information");
          accountHeader.setTextSize(16);
          accountHeader.setTextColor(COLOR_TEXT_PRIMARY);
          accountHeader.setTypeface(null, Typeface.BOLD);
          accountHeader.setPadding(0, 0, 0, 10);
          dialogLayout.addView(accountHeader);

          TextView userInfo = new TextView(this);
          UserAuthManager authManager = new UserAuthManager(this);
          String userEmail = authManager.getCurrentUserEmail();
          if (userEmail == null || userEmail.isEmpty()) {
              userEmail = "Not authenticated";
          }
          String userTier = tripStorage.getSubscriptionTier();
          String tierDisplay = userTier.toUpperCase();
          userInfo.setText("User: " + userEmail + "\n\nTier: " + tierDisplay);
          userInfo.setTextSize(14);
          userInfo.setTextColor(0xFF1976D2);
          userInfo.setPadding(10, 5, 10, 15);
          userInfo.setBackgroundColor(0xFFE8F5E8);
          dialogLayout.addView(userInfo);

          // Device Management Section
          TextView deviceHeader = new TextView(this);
          deviceHeader.setText("📱 This Device");
          deviceHeader.setTextSize(16);
          deviceHeader.setTextColor(COLOR_TEXT_PRIMARY);
          deviceHeader.setTypeface(null, Typeface.BOLD);
          deviceHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(deviceHeader);

          TextView deviceInfo = new TextView(this);
          String deviceEmail = authManager.getDeviceEmail();
          String deviceName = authManager.getDeviceName();
          deviceInfo.setText("Email: " + deviceEmail + "\nModel: " + deviceName + "\n\nYour trips sync automatically across devices when you log in.");
          deviceInfo.setTextSize(14);
          deviceInfo.setTextColor(COLOR_SUCCESS);
          deviceInfo.setPadding(10, 5, 10, 10);
          deviceInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(deviceInfo);

          // Backup Status Section
          TextView backupHeader = new TextView(this);
          backupHeader.setText("Backup Status");
          backupHeader.setTextSize(16);
          backupHeader.setTextColor(COLOR_TEXT_PRIMARY);
          backupHeader.setTypeface(null, Typeface.BOLD);
          backupHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(backupHeader);

          String apiStatus = this.tripStorage.isApiSyncEnabled() ? "Active" : "Disabled";
          String autoStatus = this.autoDetectionEnabled ? "Active" : "Disabled";

          TextView backupInfo = new TextView(this);
          backupInfo.setText("Auto Detection: " + autoStatus);
          backupInfo.setTextSize(14);
          backupInfo.setTextColor(COLOR_SUCCESS);
          backupInfo.setPadding(10, 5, 10, 5);
          backupInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(backupInfo);

          // Cloud Backup Toggle Button
          Button cloudBackupToggle = new Button(this);
          if (this.tripStorage.isApiSyncEnabled()) {
              cloudBackupToggle.setText("Cloud Backup: ON");
              cloudBackupToggle.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
              cloudBackupToggle.setTextColor(0xFFFFFFFF);
          } else {
              cloudBackupToggle.setText("Cloud Backup: OFF");
              cloudBackupToggle.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
              cloudBackupToggle.setTextColor(0xFFFFFFFF);
          }
          cloudBackupToggle.setTextSize(14);
          cloudBackupToggle.setPadding(10, 10, 10, 10);
          LinearLayout.LayoutParams cloudParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          cloudParams.setMargins(0, 0, 0, 15);
          cloudBackupToggle.setLayoutParams(cloudParams);
          cloudBackupToggle.setOnClickListener(v -> {
              toggleApiSync();
              // Update button appearance immediately after toggle
              if (this.tripStorage.isApiSyncEnabled()) {
                  cloudBackupToggle.setText("Cloud Backup: ON");
                  cloudBackupToggle.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
                  cloudBackupToggle.setTextColor(0xFFFFFFFF);

                  // Sync custom categories when enabling cloud backup
                  CloudBackupService cloudService = new CloudBackupService(this);
                  cloudService.syncCustomCategoriesWithAPI();
              } else {
                  cloudBackupToggle.setText("Cloud Backup: OFF");
                  cloudBackupToggle.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
                  cloudBackupToggle.setTextColor(0xFFFFFFFF);
              }
          });
          dialogLayout.addView(cloudBackupToggle);

          // Theme Section
          TextView themeHeader = new TextView(this);
          themeHeader.setText("🎨 Appearance");
          themeHeader.setTextSize(16);
          themeHeader.setTextColor(COLOR_TEXT_PRIMARY);
          themeHeader.setTypeface(null, Typeface.BOLD);
          themeHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(themeHeader);

          // Theme toggle row
          LinearLayout themeRow = new LinearLayout(this);
          themeRow.setOrientation(LinearLayout.HORIZONTAL);
          themeRow.setGravity(Gravity.CENTER_VERTICAL);
          themeRow.setPadding(10, 5, 10, 5);
          themeRow.setBackgroundColor(COLOR_CARD_BG);

          TextView themeLabel = new TextView(this);
          themeLabel.setText("Dark Theme");
          themeLabel.setTextSize(14);
          themeLabel.setTextColor(COLOR_TEXT_PRIMARY);
          themeLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          themeRow.addView(themeLabel);

          Switch themeToggle = new Switch(this);
          themeToggle.setChecked(isDarkTheme);
          themeToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
              saveThemePreference(isChecked);
              // Save current tab so we can restore it after recreate
              saveCurrentTabPreference();
              Toast.makeText(this, isChecked ? "Applying dark theme..." : "Applying light theme...", Toast.LENGTH_SHORT).show();
              // Immediately recreate the activity to apply theme changes
              recreate();
          });
          themeRow.addView(themeToggle);

          LinearLayout.LayoutParams themeRowParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          themeRowParams.setMargins(0, 0, 0, 15);
          themeRow.setLayoutParams(themeRowParams);
          dialogLayout.addView(themeRow);

          // Statistics Section
          TextView statsHeader = new TextView(this);
          statsHeader.setText("📊 Trip Statistics");
          statsHeader.setTextSize(16);
          statsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          statsHeader.setTypeface(null, Typeface.BOLD);
          statsHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(statsHeader);

          // Period selector row
          LinearLayout periodRow = new LinearLayout(this);
          periodRow.setOrientation(LinearLayout.HORIZONTAL);
          periodRow.setGravity(Gravity.CENTER_VERTICAL);
          periodRow.setPadding(0, 0, 0, 10);

          TextView periodLabel = new TextView(this);
          periodLabel.setText("Period: ");
          periodLabel.setTextSize(14);
          periodLabel.setTextColor(COLOR_TEXT_PRIMARY);
          periodRow.addView(periodLabel);

          Button periodSelectorBtn = new Button(this);
          periodSelectorBtn.setText(getPeriodLabel());
          periodSelectorBtn.setTextSize(12);
          periodSelectorBtn.setBackground(createRoundedBackground(COLOR_ACCENT, 10));
          periodSelectorBtn.setTextColor(0xFFFFFFFF);
          periodSelectorBtn.setPadding(16, 8, 16, 8);
          periodRow.addView(periodSelectorBtn);

          dialogLayout.addView(periodRow);

          // Stats display
          TextView statsDisplay = new TextView(this);
          statsDisplay.setText(getDetailedStats());
          statsDisplay.setTextSize(14);
          statsDisplay.setTextColor(COLOR_SUCCESS);
          statsDisplay.setPadding(10, 10, 10, 10);
          statsDisplay.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(statsDisplay);

          // Period selector click handler
          periodSelectorBtn.setOnClickListener(v -> {
              String[] periods = {"Month", "Quarter", "YTD"};
              AlertDialog.Builder periodBuilder = new AlertDialog.Builder(this);
              periodBuilder.setTitle("Select Period");
              periodBuilder.setItems(periods, (d, which) -> {
                  currentStatsPeriod = periods[which];
                  periodSelectorBtn.setText(getPeriodLabel());
                  statsDisplay.setText(getDetailedStats());
                  updateStats();
              });
              periodBuilder.show();
          });

          // IRS Tax Rates Section
          TextView irsHeader = new TextView(this);
          irsHeader.setText("IRS Tax Rates (" + getIrsYear() + ")");
          irsHeader.setTextSize(16);
          irsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          irsHeader.setTypeface(null, Typeface.BOLD);
          irsHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(irsHeader);

          TextView irsInfo = new TextView(this);
          String irsText = String.format(
              "Business: $%.3f per mile\nMedical: $%.3f per mile\nCharity: $%.3f per mile",
              getIrsBusinessRate(), getIrsMedicalRate(), getIrsCharityRate());
          irsInfo.setText(irsText);
          irsInfo.setTextSize(14);
          irsInfo.setTextColor(COLOR_SUCCESS);
          irsInfo.setPadding(10, 5, 10, 5);
          irsInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(irsInfo);

          // Update IRS Rates Button
          Button updateIrsButton = new Button(this);
          updateIrsButton.setText("Update IRS Rates");
          updateIrsButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          updateIrsButton.setTextColor(0xFFFFFFFF);
          updateIrsButton.setTextSize(14);
          updateIrsButton.setPadding(10, 10, 10, 10);
          LinearLayout.LayoutParams irsParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          irsParams.setMargins(0, 5, 0, 15);
          updateIrsButton.setLayoutParams(irsParams);
          updateIrsButton.setOnClickListener(v -> showUpdateIrsRatesDialog());
          dialogLayout.addView(updateIrsButton);

          // App Information Section
          TextView appHeader = new TextView(this);
          appHeader.setText("App Information");
          appHeader.setTextSize(16);
          appHeader.setTextColor(COLOR_TEXT_PRIMARY);
          appHeader.setTypeface(null, Typeface.BOLD);
          appHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(appHeader);

          TextView appInfo = new TextView(this);
          String versionText = "Version: Unknown";
          try {
              android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
              versionText = "Version: v" + pInfo.versionName + " (Build " + pInfo.versionCode + ")\nSDK 35";
          } catch (Exception e) {
              Log.e(TAG, "Error getting version info", e);
          }
          appInfo.setText(versionText);
          appInfo.setTextSize(14);
          appInfo.setTextColor(COLOR_TEXT_SECONDARY);
          appInfo.setPadding(10, 5, 10, 15);
          appInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(appInfo);

          // Support & Contact Section
          TextView supportHeader = new TextView(this);
          supportHeader.setText("Support & Contact");
          supportHeader.setTextSize(16);
          supportHeader.setTextColor(COLOR_TEXT_PRIMARY);
          supportHeader.setTypeface(null, Typeface.BOLD);
          supportHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(supportHeader);

          TextView supportInfo = new TextView(this);
          supportInfo.setText("Developer: MileTracker Pro\nEmail: support@miletrackerpro.com");
          supportInfo.setTextSize(14);
          supportInfo.setTextColor(COLOR_SUCCESS);
          supportInfo.setPadding(10, 5, 10, 10);
          supportInfo.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(supportInfo);

          // Email Support Button
          Button emailSupportButton = new Button(this);
          emailSupportButton.setText("Email Support");
          emailSupportButton.setTextSize(14);
          emailSupportButton.setTextColor(0xFFFFFFFF);
          emailSupportButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          emailSupportButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams emailParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          emailParams.setMargins(0, 0, 0, 5);
          emailSupportButton.setLayoutParams(emailParams);
          emailSupportButton.setOnClickListener(v -> {
              Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
              emailIntent.setData(Uri.parse("mailto:support@miletrackerpro.com"));
              emailIntent.putExtra(Intent.EXTRA_SUBJECT, "MileTracker Pro Support Request");
              try {
                  startActivity(Intent.createChooser(emailIntent, "Send email"));
              } catch (Exception e) {
                  Toast.makeText(this, "No email app available", Toast.LENGTH_SHORT).show();
              }
          });
          dialogLayout.addView(emailSupportButton);

          // Privacy Policy Button
          Button privacyButton = new Button(this);
          privacyButton.setText("Privacy Policy");
          privacyButton.setTextSize(14);
          privacyButton.setTextColor(0xFF1A365D);
          privacyButton.setBackground(createRoundedBackground(0xFFE8F4FD, 14));
          privacyButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams privacyParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          privacyParams.setMargins(0, 0, 0, 15);
          privacyButton.setLayoutParams(privacyParams);
          privacyButton.setOnClickListener(v -> {
              Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://mileage-tracker-codenurse.replit.app/privacy-policy.html"));
              try {
                  startActivity(browserIntent);
              } catch (Exception e) {
                  Toast.makeText(this, "Unable to open browser", Toast.LENGTH_SHORT).show();
              }
          });
          dialogLayout.addView(privacyButton);

          // Subscription Status Section
          TextView subscriptionHeader = new TextView(this);
          subscriptionHeader.setText("💎 Subscription Status");
          subscriptionHeader.setTextSize(16);
          subscriptionHeader.setTextColor(COLOR_TEXT_PRIMARY);
          subscriptionHeader.setTypeface(null, Typeface.BOLD);
          subscriptionHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(subscriptionHeader);

          // Subscription Status Display
          TextView subscriptionStatus = new TextView(this);
          String tier = tripStorage.getSubscriptionTier();
          String subscriptionTierDisplay = tier.equals("free") ? "FREE" : "PREMIUM";
          int monthlyTrips = tripStorage.getMonthlyTripCount();
          int remainingTrips = tripStorage.getRemainingTrips();

          String statusText;
          int statusColor;

          if (tripStorage.isPremiumUser()) {
              statusText = String.format("Current Plan: %s ✓\nTrips This Month: %d\nLimit: UNLIMITED\n✓ Cloud sync enabled\n✓ Multi-device support", subscriptionTierDisplay, monthlyTrips);
              statusColor = COLOR_SUCCESS;
          } else if (tripStorage.isInGracePeriod()) {
              int daysRemaining = tripStorage.getGracePeriodDaysRemaining();
              int totalTrips = tripStorage.getAllTrips().size();
              statusText = String.format("⏰ GRACE PERIOD (View-Only)\n\nYou have %d day%s left to upgrade!\n\nYour %d trips are safe and viewable.\nUpgrade now to keep adding trips.", 
                  daysRemaining, 
                  daysRemaining == 1 ? "" : "s",
                  totalTrips);
              statusColor = 0xFFFF6B00; // Orange warning color
          } else {
              statusText = String.format("Current Plan: %s\nTrips This Month: %d / 40\nRemaining: %d trips\nCloud sync: Disabled (Premium only)", subscriptionTierDisplay, monthlyTrips, remainingTrips);
              statusColor = 0xFF6C757D;
          }

          subscriptionStatus.setText(statusText);
          subscriptionStatus.setTextSize(14);
          subscriptionStatus.setTextColor(statusColor);
          subscriptionStatus.setPadding(10, 5, 10, 10);
          subscriptionStatus.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(subscriptionStatus);

          // Upgrade to Premium button (for free users and grace period users)
          if (!tripStorage.isPremiumUser()) {
              Button upgradePremiumButton = new Button(this);

              // Different messaging for grace period users
              if (tripStorage.isInGracePeriod()) {
                  upgradePremiumButton.setText("🔥 Restore Premium Access Now");
                  upgradePremiumButton.setBackground(createRoundedBackground(0xFFFF6B00, 14)); // Urgent orange
              } else {
                  upgradePremiumButton.setText("⭐ Upgrade to Premium");
                  upgradePremiumButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
              }

              upgradePremiumButton.setTextSize(14);
              upgradePremiumButton.setTextColor(0xFFFFFFFF);
              upgradePremiumButton.setPadding(20, 15, 20, 15);
              LinearLayout.LayoutParams upgradeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
              upgradeParams.setMargins(0, 5, 0, 5);
              upgradePremiumButton.setLayoutParams(upgradeParams);
              upgradePremiumButton.setOnClickListener(v -> {
                  showUpgradeOptionsDialog();
              });
              dialogLayout.addView(upgradePremiumButton);
          }

          // Future plans teaser
          TextView higherTiersInfo = new TextView(this);
          higherTiersInfo.setText("📊 Family and Business plans coming soon!");
          higherTiersInfo.setTextSize(13);
          higherTiersInfo.setTextColor(COLOR_TEXT_SECONDARY);
          higherTiersInfo.setPadding(10, 10, 10, 15);
          dialogLayout.addView(higherTiersInfo);

          // Manage Categories Button
          TextView categoriesHeader = new TextView(this);
          categoriesHeader.setText("🏷️ Categories");
          categoriesHeader.setTextSize(16);
          categoriesHeader.setTextColor(COLOR_TEXT_PRIMARY);
          categoriesHeader.setTypeface(null, Typeface.BOLD);
          categoriesHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(categoriesHeader);

          Button manageCategoriesButton = new Button(this);
          manageCategoriesButton.setText("Manage Categories");
          manageCategoriesButton.setTextSize(14);
          manageCategoriesButton.setTextColor(0xFFFFFFFF);
          manageCategoriesButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          manageCategoriesButton.setPadding(20, 15, 20, 15);
          manageCategoriesButton.setOnClickListener(v -> {
              showManageCategoriesDialog();
          });
          dialogLayout.addView(manageCategoriesButton);



          // Work Hours Auto-Classification Section
          TextView workHoursHeader = new TextView(this);
          workHoursHeader.setText("⏰ Work Hours Auto-Classification");
          workHoursHeader.setTextSize(16);
          workHoursHeader.setTextColor(COLOR_TEXT_PRIMARY);
          workHoursHeader.setTypeface(null, Typeface.BOLD);
          workHoursHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(workHoursHeader);

          // Work Hours Status Display
          TextView workHoursStatus = new TextView(this);
          boolean isWorkHoursEnabled = tripStorage.isWorkHoursEnabled();
          String workHoursText = isWorkHoursEnabled ? 
              String.format("Status: ENABLED\nWork Hours: %s - %s\nWork Days: %s", 
                  tripStorage.getWorkStartTime(), 
                  tripStorage.getWorkEndTime(), 
                  getWorkDaysString(tripStorage.getWorkDays())) :
              "Status: DISABLED\nOptional feature for automatic trip classification";
          workHoursStatus.setText(workHoursText);
          workHoursStatus.setTextSize(14);
          workHoursStatus.setTextColor(0xFF6C757D);
          workHoursStatus.setPadding(10, 5, 10, 15);
          workHoursStatus.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(workHoursStatus);

          // Configure Work Hours Button
          Button configureWorkHoursButton = new Button(this);
          configureWorkHoursButton.setText("Configure Work Hours");
          configureWorkHoursButton.setTextSize(14);
          configureWorkHoursButton.setTextColor(0xFFFFFFFF);
          configureWorkHoursButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          configureWorkHoursButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams workHoursParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          workHoursParams.setMargins(0, 5, 0, 15);
          configureWorkHoursButton.setLayoutParams(workHoursParams);
          configureWorkHoursButton.setOnClickListener(v -> {
              showConfigureWorkHoursDialog();
          });
          dialogLayout.addView(configureWorkHoursButton);

          // Round-Trip Detection Section
          TextView roundTripHeader = new TextView(this);
          roundTripHeader.setText("Round-Trip Detection");
          roundTripHeader.setTextSize(16);
          roundTripHeader.setTextColor(COLOR_TEXT_PRIMARY);
          roundTripHeader.setTypeface(null, Typeface.BOLD);
          roundTripHeader.setPadding(0, 15, 0, 10);
          dialogLayout.addView(roundTripHeader);

          // Round-Trip Status Display
          TextView roundTripStatus = new TextView(this);
          int roundTripCount = tripStorage.getRoundTripGroups().size();
          String roundTripText = String.format(
              "Round-Trip Groups: %d\n" +
              "• Daily round-trips (A→B→A same day)\n" +
              "• Multi-day business trips (with airports)\n" +
              "• Complex trip groups (mixed activities)\n" +
              "Superior to MileIQ's primitive detection!", 
              roundTripCount);
          roundTripStatus.setText(roundTripText);
          roundTripStatus.setTextSize(14);
          roundTripStatus.setTextColor(0xFF6C757D);
          roundTripStatus.setPadding(10, 5, 10, 15);
          roundTripStatus.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(roundTripStatus);

          // Manual Round-Trip Detection Button
          Button detectRoundTripsButton = new Button(this);
          detectRoundTripsButton.setText("Detect Round-Trips");
          detectRoundTripsButton.setTextSize(14);
          detectRoundTripsButton.setTextColor(0xFFFFFFFF);
          detectRoundTripsButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          detectRoundTripsButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams detectParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          detectParams.setMargins(0, 5, 0, 15);
          detectRoundTripsButton.setLayoutParams(detectParams);
          detectRoundTripsButton.setOnClickListener(v -> {
              // Run round-trip detection in background
              detectRoundTripsButton.setEnabled(false);
              detectRoundTripsButton.setText("Detecting...");

              new Thread(() -> {
                  try {
                      tripStorage.detectRoundTrips();
                      runOnUiThread(() -> {
                          detectRoundTripsButton.setEnabled(true);
                          detectRoundTripsButton.setText("Detect Round-Trips");
                          int newCount = tripStorage.getRoundTripGroups().size();
                          roundTripStatus.setText(String.format(
                              "Round-Trip Groups: %d\n" +
                              "• Daily round-trips (A→B→A same day)\n" +
                              "• Multi-day business trips (with airports)\n" +
                              "• Complex trip groups (mixed activities)\n" +
                              "Superior to MileIQ's primitive detection!", 
                              newCount));
                      });
                  } catch (Exception e) {
                      Log.e(TAG, "Error in round-trip detection", e);
                      runOnUiThread(() -> {
                          detectRoundTripsButton.setEnabled(true);
                          detectRoundTripsButton.setText("Detect Round-Trips");
                          Toast.makeText(this, "Detection error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                      });
                  }
              }).start();
          });
          dialogLayout.addView(detectRoundTripsButton);

          // Logout Button
          Button logoutButton = new Button(this);
          logoutButton.setText("🚪 Logout");
          logoutButton.setTextSize(14);
          logoutButton.setTextColor(0xFFFFFFFF);
          logoutButton.setBackground(createRoundedBackground(0xFFDC3545, 14));
          logoutButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams logoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          logoutParams.setMargins(0, 20, 0, 10);
          logoutButton.setLayoutParams(logoutParams);
          logoutButton.setOnClickListener(v -> {
              authManager.logout();
              SharedPreferences appPrefs = getSharedPreferences("app_settings", MODE_PRIVATE);
              appPrefs.edit().remove("guest_mode").apply();
              Intent restartIntent = new Intent(this, MainActivity.class);
              restartIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
              startActivity(restartIntent);
              finish();
          });
          dialogLayout.addView(logoutButton);

          scrollView.addView(dialogLayout);
          builder.setView(scrollView);
          builder.setPositiveButton("Close", null);
          builder.show();
      }





      private void showUpdateIrsRatesDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Update IRS Tax Rates");

          // Create dialog layout
          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(30, 20, 30, 20);

          // Year input
          TextView yearLabel = new TextView(this);
          yearLabel.setText("Tax Year:");
          yearLabel.setTextSize(14);
          yearLabel.setTextColor(COLOR_TEXT_PRIMARY);
          yearLabel.setPadding(0, 0, 0, 5);
          dialogLayout.addView(yearLabel);

          EditText yearInput = new EditText(this);
          yearInput.setText(String.valueOf(getIrsYear()));
          yearInput.setInputType(InputType.TYPE_CLASS_NUMBER);
          yearInput.setHint("2025");
          LinearLayout.LayoutParams yearParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          yearParams.setMargins(0, 0, 0, 15);
          yearInput.setLayoutParams(yearParams);
          dialogLayout.addView(yearInput);

          // Business rate input
          TextView businessLabel = new TextView(this);
          businessLabel.setText("Business Rate (per mile):");
          businessLabel.setTextSize(14);
          businessLabel.setTextColor(COLOR_TEXT_PRIMARY);
          businessLabel.setPadding(0, 0, 0, 5);
          dialogLayout.addView(businessLabel);

          EditText businessInput = new EditText(this);
          businessInput.setText(String.format("%.3f", getIrsBusinessRate()));
          businessInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          businessInput.setHint("0.725");
          LinearLayout.LayoutParams businessParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          businessParams.setMargins(0, 0, 0, 15);
          businessInput.setLayoutParams(businessParams);
          dialogLayout.addView(businessInput);

          // Medical rate input
          TextView medicalLabel = new TextView(this);
          medicalLabel.setText("Medical Rate (per mile):");
          medicalLabel.setTextSize(14);
          medicalLabel.setTextColor(COLOR_TEXT_PRIMARY);
          medicalLabel.setPadding(0, 0, 0, 5);
          dialogLayout.addView(medicalLabel);

          EditText medicalInput = new EditText(this);
          medicalInput.setText(String.format("%.3f", getIrsMedicalRate()));
          medicalInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          medicalInput.setHint("0.205");
          LinearLayout.LayoutParams medicalParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          medicalParams.setMargins(0, 0, 0, 15);
          medicalInput.setLayoutParams(medicalParams);
          dialogLayout.addView(medicalInput);

          // Charity rate input
          TextView charityLabel = new TextView(this);
          charityLabel.setText("Charity Rate (per mile):");
          charityLabel.setTextSize(14);
          charityLabel.setTextColor(COLOR_TEXT_PRIMARY);
          charityLabel.setPadding(0, 0, 0, 5);
          dialogLayout.addView(charityLabel);

          EditText charityInput = new EditText(this);
          charityInput.setText(String.format("%.2f", getIrsCharityRate()));
          charityInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          charityInput.setHint("0.14");
          LinearLayout.LayoutParams charityParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          charityParams.setMargins(0, 0, 0, 15);
          charityInput.setLayoutParams(charityParams);
          dialogLayout.addView(charityInput);

          builder.setView(dialogLayout);

          builder.setPositiveButton("Save", (dialog, which) -> {
              try {
                  int year = Integer.parseInt(yearInput.getText().toString());
                  double businessRate = Double.parseDouble(businessInput.getText().toString());
                  double medicalRate = Double.parseDouble(medicalInput.getText().toString());
                  double charityRate = Double.parseDouble(charityInput.getText().toString());

                  // Save to SharedPreferences
                  SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
                  SharedPreferences.Editor editor = prefs.edit();
                  editor.putInt("irs_year", year);
                  editor.putFloat("irs_business_rate", (float) businessRate);
                  editor.putFloat("irs_medical_rate", (float) medicalRate);
                  editor.putFloat("irs_charity_rate", (float) charityRate);
                  editor.apply();

                  // Refresh statistics to reflect new rates
                  updateStats();

              } catch (NumberFormatException e) {
              }
          });

          builder.setNegativeButton("Cancel", null);
          builder.show();
      }

      private String formatMiles(double miles) {
          if (miles >= 100000) {
              return String.format("%.0fK+ mi", miles / 1000);
          } else if (miles >= 10000) {
              return String.format("%.1fK+ mi", miles / 1000);
          } else if (miles >= 1000) {
              return String.format("%.1fK+ mi", miles / 1000);
          } else {
              return String.format("%.1f mi", miles);
          }
      }

      // IRS mileage rates for 2026 (user-configurable)
      private double getIrsBusinessRate() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          return (double) prefs.getFloat("irs_business_rate", 0.725f);
      }

      private double getIrsMedicalRate() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          return (double) prefs.getFloat("irs_medical_rate", 0.205f);
      }

      private double getIrsCharityRate() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          return (double) prefs.getFloat("irs_charity_rate", 0.14f);
      }

      private int getIrsYear() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          return prefs.getInt("irs_year", 2026);
      }

      // Theme management methods
      private void loadThemePreference() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          isDarkTheme = prefs.getBoolean("dark_theme", false);
          applyThemeColors();
      }

      private void saveThemePreference(boolean darkTheme) {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          prefs.edit().putBoolean("dark_theme", darkTheme).apply();
          isDarkTheme = darkTheme;
          applyThemeColors();
      }

      private void saveCurrentTabPreference() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          prefs.edit().putString("current_tab", currentTab).apply();
      }

      private String loadCurrentTabPreference() {
          SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
          String savedTab = prefs.getString("current_tab", "autotrack");
          // Clear the saved tab after loading so it doesn't persist across normal app restarts
          prefs.edit().remove("current_tab").apply();
          return savedTab;
      }

      private void applyThemeColors() {
          if (isDarkTheme) {
              COLOR_PRIMARY = DARK_PRIMARY;
              COLOR_ACCENT = DARK_ACCENT;
              COLOR_PRIMARY_LIGHT = DARK_PRIMARY_LIGHT;
              COLOR_SUCCESS = DARK_SUCCESS;
              COLOR_ERROR = DARK_ERROR;
              COLOR_WARNING = DARK_WARNING;
              COLOR_SURFACE = DARK_SURFACE;
              COLOR_BACKGROUND = DARK_BACKGROUND;
              COLOR_CARD_BG = DARK_CARD_BG;
              COLOR_OUTLINE = DARK_OUTLINE;
              COLOR_TEXT_PRIMARY = DARK_TEXT_PRIMARY;
              COLOR_TEXT_SECONDARY = DARK_TEXT_SECONDARY;
              COLOR_TEXT_LIGHT = DARK_TEXT_LIGHT;
          } else {
              COLOR_PRIMARY = LIGHT_PRIMARY;
              COLOR_ACCENT = LIGHT_ACCENT;
              COLOR_PRIMARY_LIGHT = LIGHT_PRIMARY_LIGHT;
              COLOR_SUCCESS = LIGHT_SUCCESS;
              COLOR_ERROR = LIGHT_ERROR;
              COLOR_WARNING = LIGHT_WARNING;
              COLOR_SURFACE = LIGHT_SURFACE;
              COLOR_BACKGROUND = LIGHT_BACKGROUND;
              COLOR_CARD_BG = LIGHT_CARD_BG;
              COLOR_OUTLINE = LIGHT_OUTLINE;
              COLOR_TEXT_PRIMARY = LIGHT_TEXT_PRIMARY;
              COLOR_TEXT_SECONDARY = LIGHT_TEXT_SECONDARY;
              COLOR_TEXT_LIGHT = LIGHT_TEXT_LIGHT;
          }
      }

      private void updateStats() {
          try {
              // Get trip usage for current month (freemium system)
              int monthlyTripCount = tripStorage.getMonthlyTripCount();
              boolean hasGooglePlayPremium = (billingManager != null && billingManager.isPremium());
              boolean hasServerPremium = tripStorage.isPremiumUser();
              boolean isPremium = hasGooglePlayPremium || hasServerPremium;
              String userTierName = tripStorage.getSubscriptionTier().toUpperCase();

              String subscriptionStatus;
              if (isPremium) {
                  subscriptionStatus = String.format("⭐ %s Tier • Unlimited trips", userTierName);
              } else {
                  subscriptionStatus = String.format("🆓 Free: %d/40 trips this month\nTap to upgrade →", monthlyTripCount);
              }

              if (statsText != null) {
                  statsText.setText(subscriptionStatus);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating stats: " + e.getMessage(), e);
          }
      }

      // Full statistics for Settings dialog
      private String getDetailedStats() {
          try {
              List<Trip> trips = getTripsForCurrentPeriod();
              double totalMiles = 0;
              double businessMiles = 0;
              double personalMiles = 0;
              double medicalMiles = 0;
              double charityMiles = 0;

              for (Trip trip : trips) {
                  totalMiles += trip.getDistance();

                  if ("Business".equals(trip.getCategory())) {
                      businessMiles += trip.getDistance();
                  } else if ("Personal".equals(trip.getCategory())) {
                      personalMiles += trip.getDistance();
                  } else if ("Medical".equals(trip.getCategory())) {
                      medicalMiles += trip.getDistance();
                  } else if ("Charity".equals(trip.getCategory())) {
                      charityMiles += trip.getDistance();
                  }
              }

              double businessDeduction = businessMiles * getIrsBusinessRate();
              double personalDeduction = 0.00;
              double medicalDeduction = medicalMiles * getIrsMedicalRate();
              double charityDeduction = charityMiles * getIrsCharityRate();
              double totalDeduction = businessDeduction + personalDeduction + medicalDeduction + charityDeduction;

              String periodLabel = getPeriodLabel();
              return String.format(
                  "%s Statistics\n\n• Total Trips: %d\n• Total Miles: %s\n• Business: %s ($%.2f)\n• Personal: %s ($%.2f)\n• Medical: %s ($%.2f)\n• Charity: %s ($%.2f)\n\nTotal Deduction: $%.2f",
                  periodLabel,
                  trips.size(), formatMiles(totalMiles),
                  formatMiles(businessMiles), businessDeduction,
                  formatMiles(personalMiles), personalDeduction,
                  formatMiles(medicalMiles), medicalDeduction,
                  formatMiles(charityMiles), charityDeduction,
                  totalDeduction
              );
          } catch (Exception e) {
              Log.e(TAG, "Error getting detailed stats: " + e.getMessage(), e);
              return "Error loading statistics";
          }
      }

      private List<Trip> getTripsForCurrentPeriod() {
          List<Trip> allTrips = tripStorage.getAllTrips();
          Calendar cal = Calendar.getInstance();
          long currentTime = cal.getTimeInMillis();

          // Calculate start of period based on currentStatsPeriod
          Calendar periodStart = Calendar.getInstance();

          switch (currentStatsPeriod) {
              case "Month":
                  periodStart.set(Calendar.DAY_OF_MONTH, 1);
                  periodStart.set(Calendar.HOUR_OF_DAY, 0);
                  periodStart.set(Calendar.MINUTE, 0);
                  periodStart.set(Calendar.SECOND, 0);
                  periodStart.set(Calendar.MILLISECOND, 0);
                  break;
              case "Quarter":
                  int currentMonth = cal.get(Calendar.MONTH);
                  int quarterStartMonth = (currentMonth / 3) * 3; // 0, 3, 6, or 9
                  periodStart.set(Calendar.MONTH, quarterStartMonth);
                  periodStart.set(Calendar.DAY_OF_MONTH, 1);
                  periodStart.set(Calendar.HOUR_OF_DAY, 0);
                  periodStart.set(Calendar.MINUTE, 0);
                  periodStart.set(Calendar.SECOND, 0);
                  periodStart.set(Calendar.MILLISECOND, 0);
                  break;
              case "YTD":
              default:
                  periodStart.set(Calendar.MONTH, Calendar.JANUARY);
                  periodStart.set(Calendar.DAY_OF_MONTH, 1);
                  periodStart.set(Calendar.HOUR_OF_DAY, 0);
                  periodStart.set(Calendar.MINUTE, 0);
                  periodStart.set(Calendar.SECOND, 0);
                  periodStart.set(Calendar.MILLISECOND, 0);
                  break;
          }

          long periodStartTime = periodStart.getTimeInMillis();

          // Filter trips to current period
          List<Trip> periodTrips = new ArrayList<>();
          for (Trip trip : allTrips) {
              if (trip.getStartTime() >= periodStartTime) {
                  periodTrips.add(trip);
              }
          }

          return periodTrips;
      }

      private String getPeriodLabel() {
          Calendar cal = Calendar.getInstance();
          switch (currentStatsPeriod) {
              case "Month":
                  return String.format("Current Month (%d/%d)", 
                      cal.get(Calendar.MONTH) + 1, cal.get(Calendar.YEAR));
              case "Quarter":
                  int quarter = (cal.get(Calendar.MONTH) / 3) + 1;
                  return String.format("Q%d %d", quarter, cal.get(Calendar.YEAR));
              case "YTD":
              default:
                  return String.format("Year to Date (%d)", cal.get(Calendar.YEAR));
          }
      }

      private void showPeriodSelector() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Select Time Period");

          String[] periods = {"Year to Date", "Current Quarter", "Current Month"};
          String[] periodValues = {"YTD", "Quarter", "Month"};

          int currentSelection = 0;
          for (int i = 0; i < periodValues.length; i++) {
              if (periodValues[i].equals(currentStatsPeriod)) {
                  currentSelection = i;
                  break;
              }
          }

          builder.setSingleChoiceItems(periods, currentSelection, (dialog, which) -> {
              currentStatsPeriod = periodValues[which];
              updateStats();
              dialog.dismiss();

              // Update period button text
              if (periodButton != null) {
                  periodButton.setText("VIEW: " + getPeriodLabel().toUpperCase() + "\n(TAP TO CHANGE)");
              }

          });

          builder.setNegativeButton("Cancel", null);
          builder.show();
      }

      private void initializeGPS() {
          try {
              locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
              if (locationManager != null && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                  statusText.setText("GPS ready");
              }
          } catch (Exception e) {
              Log.e(TAG, "Error initializing GPS: " + e.getMessage(), e);
          }
      }

      private void setupSpeedMonitoring() {
          try {
              speedRunnable = new Runnable() {
                  @Override
                  public void run() {
                      if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED && locationManager != null) {
                          try {
                              android.location.Location lastKnownLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                              if (lastKnownLocation != null && speedText != null) {
                                  // GPS Signal Quality Validation (Priority 2)
                                  if (!isLocationAccurateEnough(lastKnownLocation)) {
                                      // Log poor quality GPS reading but continue displaying speed for user feedback
                                      Log.d(TAG, String.format("Rejecting poor quality GPS reading - Accuracy: %.1fm", 
                                          lastKnownLocation.hasAccuracy() ? lastKnownLocation.getAccuracy() : -1));
                                      if (speedText != null) {
                                          speedText.setText("Speed: GPS signal weak");
                                      }
                                      return; // Skip trip detection for poor quality readings
                                  }

                                  float speed = lastKnownLocation.getSpeed() * 2.237f; // Convert m/s to mph

                                  // Update real-time distance
                                  updateRealTimeDistance(lastKnownLocation);

                                  // Process enhanced auto detection if enabled (only with quality GPS)
                                  if (autoDetectionEnabled) {
                                      processEnhancedAutoDetection(
                                          (double) speed, 
                                          lastKnownLocation.getLatitude(), 
                                          lastKnownLocation.getLongitude(), 
                                          System.currentTimeMillis()
                                      );
                                  } else {
                                      speedText.setText(String.format("Speed: %.1f mph", speed));
                                  }
                              }
                          } catch (Exception e) {
                              Log.w(TAG, "Error getting speed: " + e.getMessage());
                          }
                      }
                      speedHandler.postDelayed(this, 5000); // Update every 5 seconds
                  }
              };
              speedHandler.post(speedRunnable);
          } catch (Exception e) {
              Log.e(TAG, "Error setting up speed monitoring: " + e.getMessage(), e);
          }
      }

      private void updateRealTimeDistance(android.location.Location currentLocation) {
          try {
              if (lastDistanceLocation != null) {
                  double distance = calculateDistance(
                      lastDistanceLocation.getLatitude(), lastDistanceLocation.getLongitude(),
                      currentLocation.getLatitude(), currentLocation.getLongitude()
                  );
                  realTimeDistance += distance;

                  if (realTimeDistanceText != null) {
                      realTimeDistanceText.setText(String.format("Distance: %.1f miles", realTimeDistance));
                  }
              }
              lastDistanceLocation = currentLocation;
          } catch (Exception e) {
              Log.w(TAG, "Error updating real-time distance: " + e.getMessage());
          }
      }

      private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
          final int R = 3959; // Earth's radius in miles
          double latDistance = Math.toRadians(lat2 - lat1);
          double lonDistance = Math.toRadians(lon2 - lon1);
          double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                  + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                  * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
          double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
      }

      // Enhanced trip segmentation for better stop detection
      private void processEnhancedAutoDetection(double speed, double latitude, double longitude, long timestamp) {
          // Validate timestamp to prevent 1969 phantom trips
          if (timestamp <= 0) {
              timestamp = System.currentTimeMillis();
              Log.w(TAG, "Invalid timestamp detected, using current time: " + timestamp);
          }

          final double DRIVING_SPEED_THRESHOLD = 4.6; // mph to consider driving (matches MileIQ for better start location accuracy)
          final double STATIONARY_SPEED_THRESHOLD = 2.0; // mph to consider stationary
          final int DRIVING_READINGS_TO_START = 3; // consecutive readings to start trip
          final int STATIONARY_READINGS_TO_PAUSE = 4; // consecutive readings to pause trip
          final long TRIP_END_TIMEOUT = 8 * 60 * 1000; // 8 minutes to end trip
          final long PAUSE_DETECTION_TIME = 3 * 60 * 1000; // 3 minutes to detect meaningful pause
          final double LOCATION_CHANGE_THRESHOLD = 0.05; // miles to detect location change

          try {
              if (speed >= DRIVING_SPEED_THRESHOLD) {
                  // Driving detected
                  movingReadingsCount++;
                  stationaryReadingsCount = 0;

                  if (currentTripPaused && movingReadingsCount >= DRIVING_READINGS_TO_START) {
                      // Resume paused trip or start new trip if location changed significantly
                      if (pausedTripLocation != null) {
                          double distanceFromPause = calculateDistance(
                              pausedTripLocation.latitude, pausedTripLocation.longitude,
                              latitude, longitude
                          );

                          if (distanceFromPause > LOCATION_CHANGE_THRESHOLD) {
                              // Location changed significantly - end previous trip and start new one
                              endCurrentTrip(pausedTripLocation.latitude, pausedTripLocation.longitude, timestamp);
                              startNewTrip(latitude, longitude, speed, timestamp);
                          } else {
                              // Resume same trip
                              resumeCurrentTrip(latitude, longitude, speed, timestamp);
                          }
                      } else {
                          startNewTrip(latitude, longitude, speed, timestamp);
                      }
                  } else if (!isCurrentlyTracking && movingReadingsCount >= DRIVING_READINGS_TO_START) {
                      // Start new trip
                      startNewTrip(latitude, longitude, speed, timestamp);
                  }

                  // Update trip path if actively tracking
                  if (isCurrentlyTracking && !currentTripPaused) {
                      currentTripPath.add(new LocationPoint(latitude, longitude, speed, timestamp));
                  }

              } else if (speed <= STATIONARY_SPEED_THRESHOLD && isCurrentlyTracking) {
                  // Stationary detected during active trip
                  stationaryReadingsCount++;
                  movingReadingsCount = 0;

                  if (!currentTripPaused && stationaryReadingsCount >= STATIONARY_READINGS_TO_PAUSE) {
                      // Pause the current trip
                      pauseCurrentTrip(latitude, longitude, timestamp);
                  }

                  // Check if we should end the trip after extended pause
                  if (currentTripPaused && tripPauseStartTime != null) {
                      long pauseDuration = timestamp - tripPauseStartTime;
                      if (pauseDuration > TRIP_END_TIMEOUT) {
                          endCurrentTrip(latitude, longitude, timestamp);
                      }
                  }
              }

              // Update status display
              updateTripStatus(speed, timestamp);

          } catch (Exception e) {
              Log.e(TAG, "Error in enhanced auto detection", e);
          }
      }

      private void startNewTrip(double latitude, double longitude, double speed, long timestamp) {
          try {
              // Validate timestamp to prevent corrupted trip data
              if (timestamp <= 0) {
                  timestamp = System.currentTimeMillis();
                  Log.w(TAG, "Invalid timestamp in startNewTrip, using current time: " + timestamp);
              }

              isCurrentlyTracking = true;
              currentTripPaused = false;
              currentTripStartTime = timestamp;
              currentTripStartLatitude = latitude;
              currentTripStartLongitude = longitude;
              currentTripPath.clear();
              currentTripPath.add(new LocationPoint(latitude, longitude, speed, timestamp));

              // Reset counters
              movingReadingsCount = 0;
              stationaryReadingsCount = 0;
              tripPauseStartTime = null;
              pausedTripLocation = null;

              // Set immediate fallback start address (coordinates) in case geocoding is slow
              currentTripStartAddress = String.format("%.4f, %.4f", latitude, longitude);

              // Get start address (async - will overwrite fallback when resolved)
              getAddressFromCoordinates(latitude, longitude, new AddressCallback() {
                  @Override
                  public void onAddressReceived(String address) {
                      if (address != null && !address.trim().isEmpty()) {
                          currentTripStartAddress = address;
                      }
                      Log.d(TAG, "Trip started at: " + currentTripStartAddress);
                  }
              });

              Log.d(TAG, "New trip started - Speed: " + speed + " mph");

          } catch (Exception e) {
              Log.e(TAG, "Error starting new trip", e);
          }
      }

      private void pauseCurrentTrip(double latitude, double longitude, long timestamp) {
          try {
              currentTripPaused = true;
              tripPauseStartTime = timestamp;
              pausedTripLocation = new LocationPoint(latitude, longitude, 0, timestamp);

              Log.d(TAG, "Trip paused - Stationary detected");

          } catch (Exception e) {
              Log.e(TAG, "Error pausing trip", e);
          }
      }

      private void resumeCurrentTrip(double latitude, double longitude, double speed, long timestamp) {
          try {
              currentTripPaused = false;
              tripPauseStartTime = null;
              pausedTripLocation = null;

              // Add resume point to path
              currentTripPath.add(new LocationPoint(latitude, longitude, speed, timestamp));

              Log.d(TAG, "Trip resumed - Movement detected");

          } catch (Exception e) {
              Log.e(TAG, "Error resuming trip", e);
          }
      }

      private void endCurrentTrip(double latitude, double longitude, long timestamp) {
          try {
              if (!isCurrentlyTracking) return;

              isCurrentlyTracking = false;
              currentTripPaused = false;

              // Calculate trip distance from path
              double totalDistance = 0;
              for (int i = 1; i < currentTripPath.size(); i++) {
                  LocationPoint prev = currentTripPath.get(i - 1);
                  LocationPoint curr = currentTripPath.get(i);
                  totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
              }

              // Make totalDistance final for use in inner class
              final double finalTotalDistance = totalDistance;

              if (finalTotalDistance < 0.1) {
                  Log.d(TAG, "Trip too short (" + String.format("%.2f", finalTotalDistance) + " mi), not saving");
                  resetTripTracking();
                  return;
              }

              // Get end address
              getAddressFromCoordinates(latitude, longitude, new AddressCallback() {
                  @Override
                  public void onAddressReceived(String endAddress) {
                      // Validate timestamps before saving trip to prevent corruption
                      long validatedEndTime = timestamp;
                      if (validatedEndTime <= 0) {
                          validatedEndTime = System.currentTimeMillis();
                          Log.w(TAG, "Invalid end timestamp, using current time: " + validatedEndTime);
                      }
                      if (currentTripStartTime <= 0) {
                          currentTripStartTime = validatedEndTime - (5 * 60 * 1000); // Default 5-minute trip if start time corrupted
                          Log.w(TAG, "Invalid start timestamp, using estimated time: " + currentTripStartTime);
                      }

                      // Calculate actual driving duration (excluding pause times)
                      long actualDrivingDuration = calculateActualDrivingTime();

                      // Save the completed trip
                      Trip completedTrip = new Trip();
                      completedTrip.setStartTime(currentTripStartTime);
                      completedTrip.setEndTime(validatedEndTime);
                      completedTrip.setStartLatitude(currentTripStartLatitude);
                      completedTrip.setStartLongitude(currentTripStartLongitude);
                      completedTrip.setEndLatitude(latitude);
                      completedTrip.setEndLongitude(longitude);
                      completedTrip.setStartAddress(currentTripStartAddress != null && !currentTripStartAddress.trim().isEmpty() ? currentTripStartAddress : "Unknown");
                      completedTrip.setEndAddress(endAddress != null ? endAddress : "Unknown");
                      completedTrip.setDistance(finalTotalDistance);
                      completedTrip.setDuration(actualDrivingDuration); // Only actual driving time
                      completedTrip.setAutoDetected(true);
                      completedTrip.setAutoDetected(true); // Fix labeling bug - auto trips
                      completedTrip.setCategory("Business");

                      tripStorage.saveTrip(completedTrip);

                      // Track guest mode trip completion for registration prompts
                      onGuestTripCompleted();

                      // Run round-trip detection after saving new trip
                      new Thread(() -> {
                          try {
                              tripStorage.detectRoundTrips();
                          } catch (Exception e) {
                              Log.e(TAG, "Error detecting round trips", e);
                          }
                      }).start();

                      Log.d(TAG, "Trip completed - Distance: " + String.format("%.1f", finalTotalDistance) + " miles");

                      // Reset for next trip
                      resetTripTracking();
                      refreshTripDisplay();
                  }
              });

          } catch (Exception e) {
              Log.e(TAG, "Error ending trip", e);
          }
      }

      private void resetTripTracking() {
          currentTripStartTime = 0;
          currentTripStartLatitude = 0;
          currentTripStartLongitude = 0;
          currentTripStartAddress = null;
          currentTripPath.clear();
          movingReadingsCount = 0;
          stationaryReadingsCount = 0;
          tripPauseStartTime = null;
          pausedTripLocation = null;
          realTimeDistance = 0.0;
      }

      // Calculate actual driving time by excluding pause periods
      private long calculateActualDrivingTime() {
          try {
              long totalTime = System.currentTimeMillis() - currentTripStartTime;
              long pauseTime = 0;

              // Estimate pause time based on stationary periods in trip path
              long lastDrivingTime = currentTripStartTime;
              boolean wasPaused = false;
              long pauseStartTime = 0;

              for (LocationPoint point : currentTripPath) {
                  if (point.speed <= 1.0) { // Stationary speed threshold
                      if (!wasPaused) {
                          wasPaused = true;
                          pauseStartTime = point.timestamp;
                      }
                  } else { // Driving speed
                      if (wasPaused) {
                          pauseTime += (point.timestamp - pauseStartTime);
                          wasPaused = false;
                      }
                      lastDrivingTime = point.timestamp;
                  }
              }

              // Handle if still paused at end
              if (wasPaused && pauseStartTime > 0) {
                  pauseTime += (System.currentTimeMillis() - pauseStartTime);
              }

              long drivingTime = totalTime - pauseTime;
              Log.d(TAG, "Calculated driving time: " + (drivingTime / 60000) + " minutes (excluded " + (pauseTime / 60000) + " minutes of stops)");

              return Math.max(drivingTime, 60000); // Minimum 1 minute driving time

          } catch (Exception e) {
              Log.e(TAG, "Error calculating driving time, using total time", e);
              return System.currentTimeMillis() - currentTripStartTime;
          }
      }

      private void updateTripStatus(double speed, long timestamp) {
          try {
              String statusText;
              if (isCurrentlyTracking) {
                  if (currentTripPaused) {
                      long pauseDuration = timestamp - tripPauseStartTime;
                      long remainingTime = (8 * 60 * 1000) - pauseDuration; // 8 minutes timeout
                      long remainingMinutes = remainingTime / (60 * 1000);
                      statusText = String.format("Trip paused (ends in %dm)", remainingMinutes);
                  } else {
                      long tripDuration = timestamp - currentTripStartTime;
                      long minutes = tripDuration / (60 * 1000);
                      statusText = String.format("Tracking trip - %dm, %.1f mph", minutes, speed);
                  }
              } else {
                  statusText = String.format("Monitoring - %.1f mph", speed);
              }

              if (speedText != null) {
                  speedText.setText(statusText);
              }

          } catch (Exception e) {
              Log.e(TAG, "Error updating trip status", e);
          }
      }

      // Helper classes
      private static class LocationPoint {
          double latitude;
          double longitude;
          double speed;
          long timestamp;

          LocationPoint(double lat, double lon, double spd, long time) {
              latitude = lat;
              longitude = lon;
              speed = spd;
              timestamp = time;
          }
      }

      private interface AddressCallback {
          void onAddressReceived(String address);
      }

      private void getAddressFromCoordinates(double latitude, double longitude, AddressCallback callback) {
          new Thread(() -> {
              try {
                  // Check network connectivity before geocoding
                  if (!isNetworkAvailable()) {
                      runOnUiThread(() -> {
                          callback.onAddressReceived(String.format("%.6f, %.6f", latitude, longitude));
                      });
                      return;
                  }

                  Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                  List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);

                  if (addresses != null && !addresses.isEmpty()) {
                      Address address = addresses.get(0);
                      StringBuilder fullAddress = new StringBuilder();

                      // Build complete address with all components
                      if (address.getSubThoroughfare() != null) {
                          fullAddress.append(address.getSubThoroughfare()).append(" ");
                      }
                      if (address.getThoroughfare() != null) {
                          fullAddress.append(address.getThoroughfare()).append(", ");
                      }
                      if (address.getLocality() != null) {
                          fullAddress.append(address.getLocality()).append(", ");
                      }
                      if (address.getAdminArea() != null) {
                          fullAddress.append(address.getAdminArea()).append(" ");
                      }
                      if (address.getPostalCode() != null) {
                          fullAddress.append(address.getPostalCode());
                      }

                      String addressResult = fullAddress.toString().trim();
                      if (addressResult.endsWith(",")) {
                          addressResult = addressResult.substring(0, addressResult.length() - 1);
                      }

                      final String finalAddress = addressResult;
                      runOnUiThread(() -> {
                          callback.onAddressReceived(finalAddress.isEmpty() ? 
                              String.format("%.4f, %.4f", latitude, longitude) : finalAddress);
                      });
                  } else {
                      runOnUiThread(() -> {
                          callback.onAddressReceived(String.format("%.4f, %.4f", latitude, longitude));
                      });
                  }
              } catch (Exception e) {
                  Log.e(TAG, "Geocoding error: " + e.getMessage(), e);
                  runOnUiThread(() -> {
                      callback.onAddressReceived(String.format("%.4f, %.4f", latitude, longitude));
                  });
              }
          }).start();
      }

      private void batchUpdateAddresses() {
          new Thread(() -> {
              try {
                  List<Trip> allTrips = tripStorage.getAllTrips();
                  int updatedCount = 0;

                  for (Trip trip : allTrips) {
                      // Check if trip needs address update (has coordinates but incomplete address)
                      boolean needsStartUpdate = isAddressIncomplete(trip.getStartAddress()) && 
                                                trip.getStartLatitude() != 0 && trip.getStartLongitude() != 0;
                      boolean needsEndUpdate = isAddressIncomplete(trip.getEndAddress()) && 
                                              trip.getEndLatitude() != 0 && trip.getEndLongitude() != 0;

                      if (needsStartUpdate || needsEndUpdate) {
                          final Trip currentTrip = trip;

                          if (needsStartUpdate) {
                              try {
                                  String enhancedStartAddress = getEnhancedAddress(trip.getStartLatitude(), trip.getStartLongitude());
                                  if (enhancedStartAddress != null && !enhancedStartAddress.contains("GPS")) {
                                      currentTrip.setStartAddress(enhancedStartAddress);
                                  }
                              } catch (Exception e) {
                                  Log.w(TAG, "Failed to update start address for trip: " + trip.getId());
                              }
                          }

                          if (needsEndUpdate) {
                              try {
                                  String enhancedEndAddress = getEnhancedAddress(trip.getEndLatitude(), trip.getEndLongitude());
                                  if (enhancedEndAddress != null && !enhancedEndAddress.contains("GPS")) {
                                      currentTrip.setEndAddress(enhancedEndAddress);
                                  }
                              } catch (Exception e) {
                                  Log.w(TAG, "Failed to update end address for trip: " + trip.getId());
                              }
                          }

                          tripStorage.saveTrip(currentTrip);
                          updatedCount++;

                          // Small delay to avoid overwhelming the geocoding service
                          Thread.sleep(500);
                      }
                  }

                  final int finalUpdatedCount = updatedCount;
                  runOnUiThread(() -> {
                      refreshTripDisplay();
                  });

              } catch (Exception e) {
                  Log.e(TAG, "Error in batch address update", e);
                  runOnUiThread(() -> {
                      Toast.makeText(this, "Address update completed with some errors", Toast.LENGTH_SHORT).show();
                  });
              }
          }).start();
      }

      private boolean isAddressIncomplete(String address) {
          if (address == null || address.isEmpty() || address.equals("Unknown")) {
              return true;
          }
          // Check if address lacks zip code (no 5-digit number at end)
          return !address.matches(".*\\b\\d{5}\\b.*");
      }

      // GPS Signal Quality Validation (Priority 2)
      private boolean isLocationAccurateEnough(Location location) {
          if (location == null) {
              return false;
          }

          // Check if location has accuracy information
          if (!location.hasAccuracy()) {
              Log.d(TAG, "GPS reading lacks accuracy information - rejecting");
              return false;
          }

          float accuracy = location.getAccuracy();
          final float MAX_ACCURACY_METERS = 50.0f; // Reject readings with accuracy >50 meters
          final long MAX_AGE_MS = 30000; // Reject readings older than 30 seconds

          // Check GPS accuracy threshold
          if (accuracy > MAX_ACCURACY_METERS) {
              Log.d(TAG, String.format("GPS accuracy too poor: %.1fm (threshold: %.1fm) - rejecting", 
                  accuracy, MAX_ACCURACY_METERS));
              return false;
          }

          // Check reading age (prevent stale GPS data from causing false trip detection)
          long locationAge = System.currentTimeMillis() - location.getTime();
          if (locationAge > MAX_AGE_MS) {
              Log.d(TAG, String.format("GPS reading too old: %.1fs (threshold: %.1fs) - rejecting", 
                  locationAge / 1000.0, MAX_AGE_MS / 1000.0));
              return false;
          }

          // Check for obviously invalid coordinates
          double lat = location.getLatitude();
          double lon = location.getLongitude();
          if (lat == 0.0 && lon == 0.0) {
              Log.d(TAG, "GPS reading shows null island (0,0) coordinates - rejecting");
              return false;
          }

          // Additional validation: check for reasonable coordinate ranges
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
              Log.d(TAG, String.format("GPS coordinates out of valid range: %.6f,%.6f - rejecting", lat, lon));
              return false;
          }

          Log.d(TAG, String.format("GPS reading accepted - Accuracy: %.1fm, Age: %.1fs", 
              accuracy, locationAge / 1000.0));
          return true;
      }

      // Network connectivity check for geocoding
      private boolean isNetworkAvailable() {
          try {
              ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
              if (connectivityManager != null) {
                  NetworkInfo networkInfo = connectivityManager.getActiveNetworkInfo();
                  return networkInfo != null && networkInfo.isConnected();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error checking network connectivity: " + e.getMessage());
          }
          return false;
      }

      private String getEnhancedAddress(double latitude, double longitude) {
          try {
              // Check network connectivity before attempting geocoding
              if (!isNetworkAvailable()) {
                  Log.d(TAG, "Network unavailable, using coordinates fallback");
                  return String.format("%.6f, %.6f", latitude, longitude);
              }

              Geocoder geocoder = new Geocoder(this, Locale.getDefault());
              List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);

              if (addresses != null && !addresses.isEmpty()) {
                  Address address = addresses.get(0);
                  StringBuilder fullAddress = new StringBuilder();

                  // Build complete address with all components
                  if (address.getSubThoroughfare() != null) {
                      fullAddress.append(address.getSubThoroughfare()).append(" ");
                  }
                  if (address.getThoroughfare() != null) {
                      fullAddress.append(address.getThoroughfare()).append(", ");
                  }
                  if (address.getLocality() != null) {
                      fullAddress.append(address.getLocality()).append(", ");
                  }
                  if (address.getAdminArea() != null) {
                      fullAddress.append(address.getAdminArea()).append(" ");
                  }
                  if (address.getPostalCode() != null) {
                      fullAddress.append(address.getPostalCode());
                  }

                  String finalAddress = fullAddress.toString().trim();
                  if (finalAddress.endsWith(",")) {
                      finalAddress = finalAddress.substring(0, finalAddress.length() - 1);
                  }

                  return finalAddress.isEmpty() ? String.format("%.6f, %.6f", latitude, longitude) : finalAddress;
              }
          } catch (Exception e) {
              Log.e(TAG, "Geocoding error: " + e.getMessage());
          }
          // Fallback to coordinates when geocoding fails
          return String.format("%.6f, %.6f", latitude, longitude);
      }

      private void refreshTripDisplay() {
          try {
              // Refresh the trips display
              updateStats();

          } catch (Exception e) {
              Log.e(TAG, "Error refreshing trip display", e);
          }
      }

      private void resetRealTimeDistance() {
          realTimeDistance = 0.0;
          lastDistanceLocation = null;
          if (realTimeDistanceText != null) {
              realTimeDistanceText.setText("Distance: 0.0 miles");
          }
      }

      private void registerBroadcastReceiver() {
          try {
              BroadcastReceiver manualTripReceiver = new BroadcastReceiver() {
                  @Override
                  public void onReceive(Context context, Intent intent) {
                      String status = intent.getStringExtra("status");
                      double distance = intent.getDoubleExtra("distance", 0);
                      long duration = intent.getLongExtra("duration", 0);

                      if ("started".equals(status)) {
                          statusText.setText("Manual trip recording...");
                      } else if ("recording".equals(status)) {
                          statusText.setText(String.format("Recording: %.2f miles", distance));
                      } else if ("completed".equals(status)) {
                          statusText.setText("Manual trip completed");
                          updateStats();
                          if ("home".equals(currentTab)) {
                              updateRecentTrips();
                          } else {
                              updateAllTrips();
                          }
                          // Check if we should send a gentle feedback notification
                          checkAndSendFeedbackNotification();
                      }
                  }
              };

              IntentFilter filter = new IntentFilter("MANUAL_TRIP_UPDATE");
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  registerReceiver(manualTripReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
              } else {
                  registerReceiver(manualTripReceiver, filter);
              }

              // Register trip limit receiver for freemium notifications
              tripLimitReceiver = new BroadcastReceiver() {
                  @Override
                  public void onReceive(Context context, Intent intent) {
                      int tripCount = intent.getIntExtra("trip_count", 0);
                      int tripLimit = intent.getIntExtra("trip_limit", 40);

                      Log.d(TAG, "Trip limit reached: " + tripCount + "/" + tripLimit);

                      // Show notification
                      showTripLimitNotification(tripCount, tripLimit);

                      // Show upgrade prompt immediately
                      runOnUiThread(() -> {
                          showTripLimitReachedDialog();
                      });
                  }
              };

              IntentFilter tripLimitFilter = new IntentFilter("com.miletrackerpro.TRIP_LIMIT_REACHED");
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  registerReceiver(tripLimitReceiver, tripLimitFilter, Context.RECEIVER_NOT_EXPORTED);
              } else {
                  registerReceiver(tripLimitReceiver, tripLimitFilter);
              }

          } catch (Exception e) {
              Log.e(TAG, "Error registering broadcast receiver: " + e.getMessage(), e);
          }
      }

      private void restoreAutoDetectionState() {
          try {
              // Restore auto detection state from SharedPreferences
              // FIXED: Use same preference file as the toggle listener (was "app_prefs", now "MileTrackerPrefs")
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              autoDetectionEnabled = prefs.getBoolean("auto_detection_enabled", false);
              if (autoDetectionEnabled) {
                  // MINIMAL FIX: Start the actual service when user previously enabled it
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("START_AUTO_DETECTION");

                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      startForegroundService(serviceIntent);
                  } else {
                      startService(serviceIntent);
                  }

                  autoToggle.setChecked(true);
                  statusText.setText("Auto detection active");
              } else {
                  autoToggle.setChecked(false);
                  statusText.setText("Ready");
              }

              // Update Bluetooth status on startup
              updateBluetoothStatus();

              // Start periodic status updates to ensure indicators work
              startStatusUpdater();
          } catch (Exception e) {
              Log.e(TAG, "Error restoring auto detection state: " + e.getMessage(), e);
          }
      }

      private void updateBluetoothStatus() {
          try {
              BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
              BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();

              if (bluetoothAdapter == null) {
                  bluetoothStatusText.setText("🔘 Bluetooth: Not supported");
                  bluetoothStatusText.setTextColor(0xFF6C757D);
              } else if (!bluetoothAdapter.isEnabled()) {
                  bluetoothStatusText.setText("🔴 Bluetooth: Disabled");
                  bluetoothStatusText.setTextColor(0xFFDC3545);
              } else {
                  // Check if BluetoothVehicleService is running
                  boolean serviceRunning = isBluetoothServiceRunning();
                  if (serviceRunning) {
                      bluetoothStatusText.setText("🟢 Bluetooth: Active & Monitoring");
                      bluetoothStatusText.setTextColor(0xFF28A745);
                  } else {
                      bluetoothStatusText.setText("🟡 Bluetooth: Enabled but not monitoring");
                      bluetoothStatusText.setTextColor(0xFFFFC107);
                  }
              }

              // Update vehicle registration count
              updateVehicleRegistrationCount();
          } catch (Exception e) {
              Log.e(TAG, "Error updating Bluetooth status: " + e.getMessage(), e);
              bluetoothStatusText.setText("🔘 Bluetooth: Error checking status");
              bluetoothStatusText.setTextColor(0xFF6C757D);
          }
      }

      private boolean isBluetoothServiceRunning() {
          // Check if service was started by checking if bluetoothServiceStarted flag is true
          // and verify auto detection is enabled
          // FIXED: Use MileTrackerPrefs consistently
          SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
          boolean autoDetectionEnabled = prefs.getBoolean("auto_detection_enabled", false);

          return bluetoothServiceStarted && autoDetectionEnabled;
      }

      private void updateVehicleRegistrationCount() {
          try {
              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");


              if (vehiclesJson.equals("{}")) {
                  connectedVehicleText.setText("No vehicles registered");
                  connectedVehicleText.setTextColor(0xFF6C757D);
              } else {
                  // Parse JSON to count vehicles
                  try {
                      org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
                      int count = vehiclesObject.length();

                      if (count > 0) {
                          String displayText = count + " vehicle" + (count > 1 ? "s" : "") + " registered - Ready for auto-detection";
                          connectedVehicleText.setText(displayText);
                          connectedVehicleText.setTextColor(0xFF28A745);
                      } else {
                          connectedVehicleText.setText("No vehicles registered - Bluetooth won't detect trips");
                          connectedVehicleText.setTextColor(0xFFDC3545);
                      }
                  } catch (Exception e) {
                      connectedVehicleText.setText("Vehicle registry error");
                      connectedVehicleText.setTextColor(0xFFDC3545);
                  }
              }
          } catch (Exception e) {
              connectedVehicleText.setText("Vehicle status unknown");
              connectedVehicleText.setTextColor(0xFF6C757D);
          }
      }

      // Add method to refresh status indicators periodically
      private void startStatusUpdater() {
          Handler statusHandler = new Handler();
          Runnable statusUpdater = new Runnable() {
              @Override
              public void run() {
                  updateBluetoothStatus();
                  statusHandler.postDelayed(this, 30000); // Update every 30 seconds
              }
          };
          statusHandler.post(statusUpdater);
      }

      private void showBluetoothDiagnostics() {
          try {
              StringBuilder diagnostics = new StringBuilder();

              // Check Bluetooth adapter
              BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
              BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();

              diagnostics.append("BLUETOOTH DIAGNOSTICS:\n\n");

              if (bluetoothAdapter == null) {
                  diagnostics.append("Bluetooth adapter: Not supported\n");
              } else {
                  diagnostics.append("Bluetooth adapter: Available\n");
                  diagnostics.append("Bluetooth enabled: ").append(bluetoothAdapter.isEnabled() ? "Yes" : "No").append("\n");
              }

              // Check service status
              boolean serviceRunning = isBluetoothServiceRunning();
              diagnostics.append("🔧 BluetoothVehicleService: ").append(serviceRunning ? "Running" : "Not running").append("\n");

              // Check registered vehicles
              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");

              try {
                  org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
                  int count = vehiclesObject.length();
                  diagnostics.append("Registered vehicles: ").append(count).append("\n");

                  if (count > 0) {
                      diagnostics.append("\nVehicles:\n");
                      java.util.Iterator<String> keys = vehiclesObject.keys();
                      while (keys.hasNext()) {
                          String macAddress = keys.next();
                          org.json.JSONObject vehicle = vehiclesObject.getJSONObject(macAddress);
                          String name = vehicle.optString("deviceName", "Unknown");
                          String type = vehicle.optString("vehicleType", "Unknown");
                          diagnostics.append("• ").append(name).append(" (").append(type).append(")\n");
                      }
                  }
              } catch (Exception e) {
                  diagnostics.append("Vehicle registry error: ").append(e.getMessage()).append("\n");
              }

              // Check auto detection status
              boolean autoDetectionEnabled = prefs.getBoolean("auto_detection_enabled", false);
              diagnostics.append("🎯 Auto detection: ").append(autoDetectionEnabled ? "Enabled" : "Disabled").append("\n");

              diagnostics.append("\n💡 TROUBLESHOOTING:\n");
              if (!bluetoothAdapter.isEnabled()) {
                  diagnostics.append("• Enable Bluetooth in Android settings\n");
              }
              if (!serviceRunning) {
                  diagnostics.append("• Turn ON Auto Detection to start Bluetooth monitoring\n");
              }
              if (vehiclesJson.equals("{}")) {
                  diagnostics.append("• Register vehicles by connecting to them when Auto Detection is ON\n");
              }

              new AlertDialog.Builder(this)
                  .setTitle("Bluetooth Status Diagnostics")
                  .setMessage(diagnostics.toString())
                  .setPositiveButton("OK", null)
                  .show();

          } catch (Exception e) {
              Log.e(TAG, "Error showing Bluetooth diagnostics: " + e.getMessage(), e);
              Toast.makeText(this, "Error showing diagnostics: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void showVehicleRegistrationDialog() {
          try {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                  boolean hasBluetoothConnect = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
                  boolean hasBluetoothScan = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
                  if (!hasBluetoothConnect || !hasBluetoothScan) {
                      showBluetoothPermissionDialog();
                      return;
                  }
              }

              BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();

              if (bluetoothAdapter == null) {
                  Toast.makeText(this, "Bluetooth not supported on this device", Toast.LENGTH_LONG).show();
                  return;
              }

              if (!bluetoothAdapter.isEnabled()) {
                  AlertDialog.Builder btBuilder = new AlertDialog.Builder(this);
                  btBuilder.setTitle("Bluetooth is Off");
                  btBuilder.setMessage("Bluetooth needs to be turned on to detect your vehicle.\n\nWould you like to open Bluetooth settings?");
                  btBuilder.setPositiveButton("Open Settings", (dialog, which) -> {
                      Intent intent = new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
                      startActivity(intent);
                  });
                  btBuilder.setNegativeButton("Not Now", null);
                  btBuilder.show();
                  return;
              }

              AlertDialog.Builder builder = new AlertDialog.Builder(this);
              builder.setTitle("Register Vehicle");

              LinearLayout layout = new LinearLayout(this);
              layout.setOrientation(LinearLayout.VERTICAL);
              layout.setPadding(40, 20, 40, 20);

              // Instructions
              TextView instructions = new TextView(this);
              instructions.setText("Select a paired Bluetooth device to register as your vehicle:");
              instructions.setTextSize(14);
              instructions.setTextColor(COLOR_TEXT_PRIMARY);
              instructions.setPadding(0, 0, 0, 20);
              layout.addView(instructions);

              // Get paired devices
              Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();

              if (pairedDevices.isEmpty()) {
                  TextView noDevices = new TextView(this);
                  noDevices.setText("No paired Bluetooth devices found.\n\nPair your vehicle's Bluetooth in Android Settings first.");
                  noDevices.setTextSize(14);
                  noDevices.setTextColor(0xFFDC3545);
                  noDevices.setPadding(0, 10, 0, 10);
                  layout.addView(noDevices);

                  builder.setView(layout);
                  builder.setPositiveButton("OK", null);
                  builder.show();
                  return;
              }

              // Device selection
              String[] deviceNames = new String[pairedDevices.size()];
              String[] deviceAddresses = new String[pairedDevices.size()];
              int index = 0;

              for (BluetoothDevice device : pairedDevices) {
                  String name = device.getName();
                  deviceNames[index] = name != null ? name : "Unknown Device";
                  deviceAddresses[index] = device.getAddress();
                  index++;
              }

              Spinner deviceSpinner = new Spinner(this);
              ArrayAdapter<String> deviceAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, deviceNames);
              deviceAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
              deviceSpinner.setAdapter(deviceAdapter);
              layout.addView(deviceSpinner);

              // Vehicle type selection
              TextView typeLabel = new TextView(this);
              typeLabel.setText("Vehicle Type:");
              typeLabel.setTextSize(14);
              typeLabel.setTextColor(COLOR_TEXT_PRIMARY);
              typeLabel.setPadding(0, 20, 0, 5);
              layout.addView(typeLabel);

              String[] vehicleTypes = {"Personal", "Business", "Rental", "Borrowed"};
              Spinner typeSpinner = new Spinner(this);
              ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, vehicleTypes);
              typeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
              typeSpinner.setAdapter(typeAdapter);
              layout.addView(typeSpinner);

              builder.setView(layout);
              builder.setPositiveButton("Register", (dialog, which) -> {
                  try {
                      int selectedDeviceIndex = deviceSpinner.getSelectedItemPosition();
                      String selectedDeviceName = deviceNames[selectedDeviceIndex];
                      String selectedDeviceAddress = deviceAddresses[selectedDeviceIndex];
                      String selectedVehicleType = vehicleTypes[typeSpinner.getSelectedItemPosition()];

                      // Save vehicle registration
                      saveVehicleRegistration(selectedDeviceName, selectedDeviceAddress, selectedVehicleType);


                      // Update UI
                      updateVehicleRegistrationUI();

                  } catch (Exception e) {
                      Log.e(TAG, "Error registering vehicle: " + e.getMessage(), e);
                      Toast.makeText(this, "Registration failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              });

              builder.setNegativeButton("Cancel", null);
              builder.show();

          } catch (Exception e) {
              Log.e(TAG, "Error showing vehicle registration dialog: " + e.getMessage(), e);
              Toast.makeText(this, "Error opening registration: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void saveVehicleRegistration(String deviceName, String deviceAddress, String vehicleType) {
          try {
              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");

              org.json.JSONObject vehiclesObject;
              if (vehiclesJson.equals("{}")) {
                  vehiclesObject = new org.json.JSONObject();
              } else {
                  vehiclesObject = new org.json.JSONObject(vehiclesJson);
              }

              // Create vehicle entry
              org.json.JSONObject vehicleEntry = new org.json.JSONObject();
              vehicleEntry.put("deviceName", deviceName);
              vehicleEntry.put("vehicleType", vehicleType);
              vehicleEntry.put("registeredAt", System.currentTimeMillis());

              // Use device address as key
              vehiclesObject.put(deviceAddress, vehicleEntry);

              // Save to preferences
              prefs.edit().putString("vehicle_registry", vehiclesObject.toString()).apply();

              Log.d(TAG, "Vehicle registered successfully: " + deviceName + " (" + vehicleType + ") at " + deviceAddress);

          } catch (Exception e) {
              Log.e(TAG, "Error saving vehicle registration: " + e.getMessage(), e);
              throw new RuntimeException("Failed to save vehicle registration: " + e.getMessage());
          }
      }

      private void updateVehicleRegistrationUI() {
          try {
              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");

              if (vehiclesJson.equals("{}")) {
                  connectedVehicleText.setText("No vehicles registered");
                  connectedVehicleText.setTextColor(0xFF6C757D);
              } else {
                  org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
                  int count = vehiclesObject.length();

                  if (count > 0) {
                      String displayText = count + " vehicle" + (count > 1 ? "s" : "") + " registered - Ready for auto-detection";
                      connectedVehicleText.setText(displayText);
                      connectedVehicleText.setTextColor(0xFF28A745);
                  } else {
                      connectedVehicleText.setText("No vehicles registered");
                      connectedVehicleText.setTextColor(0xFF6C757D);
                  }
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating vehicle registration UI: " + e.getMessage(), e);
              connectedVehicleText.setText("Vehicle status error");
              connectedVehicleText.setTextColor(0xFFDC3545);
          }
      }

      private void updateConnectedVehicleUI(String deviceName, String vehicleType) {
          try {
              String vehicleIcon = getVehicleIcon(vehicleType);
              connectedVehicleText.setText("🟢 CONNECTED: " + vehicleIcon + " " + deviceName + " (" + vehicleType + ")");
              connectedVehicleText.setTextColor(0xFF28A745);
              connectedVehicleText.setBackgroundColor(0xFFE8F5E8);
              connectedVehicleText.setTypeface(null, Typeface.BOLD);

              // Also update the status text to show vehicle connection
              if (statusText != null) {
                  statusText.setText("Vehicle connected - Ready for automatic trip detection");
                  statusText.setTextColor(0xFF28A745);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating connected vehicle UI: " + e.getMessage(), e);
          }
      }

      private void updateDisconnectedVehicleUI() {
          try {
              connectedVehicleText.setText("🔴 DISCONNECTED: No vehicle connected");
              connectedVehicleText.setTextColor(0xFF6C757D);
              connectedVehicleText.setBackgroundColor(COLOR_CARD_BG);
              connectedVehicleText.setTypeface(null, Typeface.NORMAL);

              // Update status text to show disconnection
              if (statusText != null && autoDetectionEnabled) {
                  statusText.setText("Auto detection active - Waiting for vehicle connection");
                  statusText.setTextColor(COLOR_PRIMARY);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error updating disconnected vehicle UI: " + e.getMessage(), e);
          }
      }

      private String getVehicleIcon(String vehicleType) {
          switch (vehicleType.toLowerCase()) {
              case "personal": return "";
              case "business": return "";
              case "rental": return "";
              case "borrowed": return "";
              default: return "";
          }
      }

      private void registerBluetoothUpdateReceiver() {
          try {
              bluetoothUpdateReceiver = new BroadcastReceiver() {
                  @Override
                  public void onReceive(Context context, Intent intent) {
                      try {
                          String action = intent.getAction();
                          if ("com.miletrackerpro.VEHICLE_CONNECTED".equals(action)) {
                              String deviceName = intent.getStringExtra("deviceName");
                              String vehicleType = intent.getStringExtra("vehicleType");
                              Log.d(TAG, "VEHICLE_CONNECTED broadcast received: " + deviceName + " (" + vehicleType + ")");
                              updateConnectedVehicleUI(deviceName, vehicleType);
                              updateBluetoothStatus(); // Update Bluetooth status indicators
                          } else if ("com.miletrackerpro.VEHICLE_DISCONNECTED".equals(action)) {
                              String deviceName = intent.getStringExtra("deviceName");
                              Log.d(TAG, "VEHICLE_DISCONNECTED broadcast received: " + deviceName);
                              updateDisconnectedVehicleUI();
                              updateBluetoothStatus(); // Update Bluetooth status indicators
                          } else if ("com.miletrackerpro.NEW_VEHICLE_DETECTED".equals(action)) {
                              String deviceName = intent.getStringExtra("deviceName");
                              String macAddress = intent.getStringExtra("macAddress");
                              showVehicleRegistrationDialog(deviceName, macAddress);
                          } else if ("com.miletrackerpro.BLUETOOTH_SERVICE_STARTED".equals(action)) {
                              Log.d(TAG, "BLUETOOTH_SERVICE_STARTED broadcast received");
                              updateBluetoothStatus(); // Update to show service is active
                          } else if ("com.miletrackerpro.BLUETOOTH_SERVICE_STOPPED".equals(action)) {
                              Log.d(TAG, "BLUETOOTH_SERVICE_STOPPED broadcast received");
                              updateBluetoothStatus(); // Update to show service is inactive
                          }
                      } catch (Exception e) {
                          Log.e(TAG, "Error handling Bluetooth update: " + e.getMessage(), e);
                      }
                  }
              };

              IntentFilter filter = new IntentFilter();
              filter.addAction("com.miletrackerpro.VEHICLE_CONNECTED");
              filter.addAction("com.miletrackerpro.VEHICLE_DISCONNECTED");
              filter.addAction("com.miletrackerpro.NEW_VEHICLE_DETECTED");
              filter.addAction("com.miletrackerpro.BLUETOOTH_SERVICE_STARTED");
              filter.addAction("com.miletrackerpro.BLUETOOTH_SERVICE_STOPPED");
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  registerReceiver(bluetoothUpdateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
              } else {
                  registerReceiver(bluetoothUpdateReceiver, filter);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error registering Bluetooth update receiver: " + e.getMessage(), e);
          }
      }

      private void showVehicleRegistrationDialog(String deviceName, String macAddress) {
          // Prevent multiple dialogs from stacking
          if (isVehicleRegistrationDialogShowing) {
              Log.d(TAG, "Vehicle registration dialog already showing, skipping duplicate");
              return;
          }

          isVehicleRegistrationDialogShowing = true;

          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("New Vehicle Detected");

          // Create main layout
          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 30, 50, 30);

          // Device info with MAC address for identification
          TextView deviceInfo = new TextView(this);
          String shortMac = macAddress.substring(macAddress.length() - 5); // Show last 5 chars
          deviceInfo.setText("Device: " + deviceName + "\nID: ..." + shortMac + "\n\nWould you like to register this vehicle for automatic trip detection?");
          deviceInfo.setTextSize(14);
          deviceInfo.setPadding(0, 0, 0, 20);
          layout.addView(deviceInfo);

          // Vehicle type selection
          TextView typeLabel = new TextView(this);
          typeLabel.setText("Vehicle Type:");
          typeLabel.setTextSize(16);
          typeLabel.setTypeface(null, Typeface.BOLD);
          layout.addView(typeLabel);

          String[] vehicleTypes = {"Personal", "Business", "Rental", "Borrowed"};
          final String[] selectedVehicleType = {"Personal"};

          Spinner vehicleTypeSpinner = new Spinner(this);
          ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, vehicleTypes);
          adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
          vehicleTypeSpinner.setAdapter(adapter);
          vehicleTypeSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
              @Override
              public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                  selectedVehicleType[0] = vehicleTypes[position];
              }
              @Override
              public void onNothingSelected(AdapterView<?> parent) {}
          });
          layout.addView(vehicleTypeSpinner);

          // Vehicle name input
          TextView nicknameLabel = new TextView(this);
          nicknameLabel.setText("\nVehicle Name (optional - helps you identify this specific vehicle):");
          nicknameLabel.setTextSize(16);
          nicknameLabel.setTypeface(null, Typeface.BOLD);
          nicknameLabel.setPadding(0, 20, 0, 10);
          layout.addView(nicknameLabel);

          EditText nicknameInput = new EditText(this);
          nicknameInput.setHint("e.g., 'Ford Truck Rental', 'Husband's Truck', 'My Ram 1500', 'Work Van'");
          nicknameInput.setTextSize(14);
          nicknameInput.setPadding(10, 10, 10, 10);
          nicknameInput.setBackgroundResource(android.R.drawable.edit_text);
          layout.addView(nicknameInput);

          builder.setView(layout);

          builder.setPositiveButton("Register Vehicle", (dialog, which) -> {
              String nickname = nicknameInput.getText().toString().trim();
              String finalDeviceName = nickname.isEmpty() ? deviceName : nickname;

              // Register the vehicle directly in MainActivity
              registerVehicleLocally(finalDeviceName, macAddress, selectedVehicleType[0]);

              // Also send to BluetoothVehicleService if it's running
              try {
                  Intent serviceIntent = new Intent(this, BluetoothVehicleService.class);
                  serviceIntent.setAction("REGISTER_VEHICLE");
                  serviceIntent.putExtra("deviceName", finalDeviceName);
                  serviceIntent.putExtra("macAddress", macAddress);
                  serviceIntent.putExtra("vehicleType", selectedVehicleType[0]);
                  startService(serviceIntent);
              } catch (Exception e) {
                  Log.w(TAG, "Could not send to service, but vehicle registered locally");
              }

              Toast.makeText(this, "Vehicle registered successfully", Toast.LENGTH_SHORT).show();

              // Update the UI immediately
              updateBluetoothStatus();

              // Reset the dialog flag
              isVehicleRegistrationDialogShowing = false;

              // Dismiss the dialog
              dialog.dismiss();
          });

          builder.setNegativeButton("Dismiss", (dialog, which) -> {
              // Reset the dialog flag
              isVehicleRegistrationDialogShowing = false;
              dialog.dismiss();
          });

          builder.setCancelable(false);
          builder.show();
      }

      private void registerVehicleLocally(String deviceName, String macAddress, String vehicleType) {
          try {
              // PHASE 1 DEBUG: Use Toast notifications instead of logcat

              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");


              org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);

              // Create vehicle info JSON object
              org.json.JSONObject vehicleInfo = new org.json.JSONObject();
              vehicleInfo.put("macAddress", macAddress);
              vehicleInfo.put("deviceName", deviceName);
              vehicleInfo.put("vehicleType", vehicleType);
              vehicleInfo.put("registrationTime", System.currentTimeMillis());

              // Add to registry
              vehiclesObject.put(macAddress, vehicleInfo);

              // Save back to preferences
              SharedPreferences.Editor editor = prefs.edit();
              editor.putString("vehicle_registry", vehiclesObject.toString());
              boolean saveSuccess = editor.commit(); // Use commit() instead of apply() for immediate verification


              // Verify the save worked
              String verifyJson = prefs.getString("vehicle_registry", "{}");
              org.json.JSONObject verifyObject = new org.json.JSONObject(verifyJson);
              int vehicleCount = verifyObject.length();


              // Send debug notification

          } catch (Exception e) {
          }
      }

      private void initializeBluetoothBackgroundService() {
          try {
              // Register the broadcast receiver FIRST
              registerBluetoothUpdateReceiver();

              // Only start monitoring if auto detection is enabled
              // FIXED: Use MileTrackerPrefs consistently
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              boolean autoDetectionEnabled = prefs.getBoolean("auto_detection_enabled", false);

              if (autoDetectionEnabled) {
                  Log.d(TAG, "Starting BluetoothVehicleService background service (auto detection enabled)");

                  // Start the background service
                  Intent serviceIntent = new Intent(this, BluetoothVehicleService.class);
                  serviceIntent.setAction("START_BLUETOOTH_MONITORING");

                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      startForegroundService(serviceIntent);
                  } else {
                      startService(serviceIntent);
                  }

                  bluetoothServiceStarted = true;
                  Log.d(TAG, "BluetoothVehicleService background service started successfully");
              } else {
                  Log.d(TAG, "Auto detection disabled, not starting Bluetooth monitoring");
                  bluetoothServiceStarted = false;
              }

              // Update Bluetooth status immediately after checking state
              updateBluetoothStatus();

          } catch (Exception e) {
              Log.e(TAG, "Error initializing BluetoothVehicleService", e);
              bluetoothServiceStarted = false;
          }
      }

      private void requestPermissions() {
          try {
              // Request location permissions first
              if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                  EventTracker.trackPermissionRequested(this, "ACCESS_FINE_LOCATION");
                  ActivityCompat.requestPermissions(this, 
                      new String[]{
                          Manifest.permission.ACCESS_FINE_LOCATION,
                          Manifest.permission.ACCESS_COARSE_LOCATION
                      }, 
                      LOCATION_PERMISSION_REQUEST);
                  return; // Exit early, will continue in onRequestPermissionsResult
              }

              // Request background location if location already granted
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && 
                  ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                  EventTracker.trackPermissionRequested(this, "ACCESS_BACKGROUND_LOCATION");
                  ActivityCompat.requestPermissions(this,
                      new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                      BACKGROUND_LOCATION_PERMISSION_REQUEST);
                  return; // Exit early, will continue in onRequestPermissionsResult
              }

              // Request Bluetooth permissions (independent of location permissions)
              requestBluetoothPermissions();

          } catch (Exception e) {
              Log.e(TAG, "Error requesting permissions: " + e.getMessage(), e);
          }
      }

      private void showBluetoothPermissionDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Bluetooth Permission Needed");
          builder.setMessage("To detect your vehicle automatically, MileTracker Pro needs Bluetooth access.\n\n" +
              "This lets the app:\n\n" +
              "\u2022 See when you connect to your car's Bluetooth\n" +
              "\u2022 Automatically start tracking your trip\n" +
              "\u2022 Stop tracking when you disconnect\n\n" +
              "Your Bluetooth data is never shared or sold.");

          builder.setPositiveButton("Allow Bluetooth", (dialog, which) -> {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                  ActivityCompat.requestPermissions(this,
                      new String[]{
                          Manifest.permission.BLUETOOTH_SCAN,
                          Manifest.permission.BLUETOOTH_CONNECT
                      },
                      BLUETOOTH_PERMISSION_REQUEST);
              }
          });

          builder.setNegativeButton("Not Now", (dialog, which) -> {
              Toast.makeText(this, "You can still track trips manually or with auto-detection.", Toast.LENGTH_LONG).show();
          });

          builder.setCancelable(true);
          builder.show();
      }

      private void requestBluetoothPermissions() {
          try {
              // Android 12+ Bluetooth permissions
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                  if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
                      ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {

                      Log.d(TAG, "Requesting Bluetooth permissions for Android 12+");
                      ActivityCompat.requestPermissions(this,
                          new String[]{
                              Manifest.permission.BLUETOOTH_SCAN,
                              Manifest.permission.BLUETOOTH_CONNECT
                          },
                          BLUETOOTH_PERMISSION_REQUEST);
                  } else {
                      Log.d(TAG, "Bluetooth permissions already granted");
                  }
              } else {
                  Log.d(TAG, "Android version < 12, Bluetooth permissions not required");
              }
          } catch (Exception e) {
              Log.e(TAG, "Error requesting Bluetooth permissions: " + e.getMessage(), e);
          }
      }

      private void initializeBluetoothDiscovery() {
          try {
              BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
              bluetoothAdapter = bluetoothManager.getAdapter();

              if (bluetoothAdapter == null) {
                  Log.w(TAG, "Bluetooth not supported on this device");
                  return;
              }

              // Initialize the discovery receiver
              bluetoothDiscoveryReceiver = new BroadcastReceiver() {
                  @Override
                  public void onReceive(Context context, Intent intent) {
                      String action = intent.getAction();

                      if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                          BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                          if (device != null) {
                              String deviceName = device.getName();
                              String deviceAddress = device.getAddress();


                              // Check if this is a new vehicle that should trigger registration
                              if (deviceName != null && isVehicleDevice(deviceName)) {

                                  // Check if already registered
                                  if (!isVehicleAlreadyRegistered(deviceAddress)) {

                                      runOnUiThread(() -> {
                                          showVehicleRegistrationDialog(deviceAddress, deviceName);
                                      });
                                  } else {
                                  }
                              } else {
                              }
                          }
                      } else if (BluetoothAdapter.ACTION_DISCOVERY_STARTED.equals(action)) {
                      } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                      } else if ("com.miletrackerpro.app.VEHICLE_DETECTED".equals(action)) {
                          String deviceName = intent.getStringExtra("device_name");
                          String deviceAddress = intent.getStringExtra("device_address");


                          runOnUiThread(() -> {
                              connectedVehicleText.setText("Vehicle: " + deviceName);
                              bluetoothStatusText.setText("Bluetooth: Connected");
                              bluetoothStatusText.setTextColor(Color.GREEN);

                          });
                      } else if ("com.miletrackerpro.app.NEW_VEHICLE_DETECTED".equals(action)) {
                          String deviceName = intent.getStringExtra("device_name");
                          String deviceAddress = intent.getStringExtra("device_address");
                          String source = intent.getStringExtra("source");


                          runOnUiThread(() -> {
                              showVehicleRegistrationDialog(deviceAddress, deviceName);
                          });
                      } else if ("com.miletrackerpro.app.VEHICLE_CONNECTED".equals(action)) {
                          String deviceName = intent.getStringExtra("device_name");
                          String deviceAddress = intent.getStringExtra("device_address");
                          String source = intent.getStringExtra("source");


                          runOnUiThread(() -> {
                              connectedVehicleText.setText("Vehicle: " + deviceName);
                              bluetoothStatusText.setText("Bluetooth: Connected");
                              bluetoothStatusText.setTextColor(Color.GREEN);


                              // Start auto detection if enabled
                              if (isAutoDetectionEnabled()) {
                                  startAutoDetection();
                              }
                          });
                      } else if ("com.miletrackerpro.app.VEHICLE_DISCONNECTED".equals(action)) {
                          String deviceName = intent.getStringExtra("device_name");
                          String deviceAddress = intent.getStringExtra("device_address");
                          String source = intent.getStringExtra("source");


                          runOnUiThread(() -> {
                              connectedVehicleText.setText("Vehicle: None connected");
                              bluetoothStatusText.setText("Bluetooth: Enabled");
                              bluetoothStatusText.setTextColor(COLOR_PRIMARY);


                              // Stop auto detection if running
                              if (isAutoDetectionEnabled()) {
                                  stopAutoDetection();
                              }
                          });
                      }
                  }
              };

              // Register the receiver
              IntentFilter filter = new IntentFilter();
              filter.addAction(BluetoothDevice.ACTION_FOUND);
              filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED);
              filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
              filter.addAction("com.miletrackerpro.app.VEHICLE_DETECTED");
              filter.addAction("com.miletrackerpro.app.NEW_VEHICLE_DETECTED");
              filter.addAction("com.miletrackerpro.app.VEHICLE_CONNECTED");
              filter.addAction("com.miletrackerpro.app.VEHICLE_DISCONNECTED");
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  registerReceiver(bluetoothDiscoveryReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
              } else {
                  registerReceiver(bluetoothDiscoveryReceiver, filter);
              }


              // IMMEDIATE TEST: Check already paired devices first
              checkPairedDevices();

              // Start periodic scanning
              startPeriodicBluetoothScan();

          } catch (Exception e) {
              Log.e(TAG, "Error initializing Bluetooth discovery: " + e.getMessage(), e);
          }
      }

      private void checkPairedDevices() {

          try {
              if (bluetoothAdapter == null) {
                  return;
              }


              // Check Android 12+ permissions more thoroughly
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                  boolean hasBluetoothConnect = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
                  boolean hasBluetoothScan = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;


                  if (!hasBluetoothConnect) {
                      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_CONNECT}, 2);
                      return;
                  }

                  if (!hasBluetoothScan) {
                      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_SCAN}, 3);
                      return;
                  }
              }


              Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();

              if (pairedDevices.size() == 0) {
                  return;
              }

              // Show ALL paired devices for debugging
              int deviceCount = 0;
              for (BluetoothDevice device : pairedDevices) {
                  deviceCount++;
                  String deviceName = device.getName();
                  String deviceAddress = device.getAddress();


                  // Test vehicle detection specifically
                  if (deviceName != null) {
                      boolean isVehicle = isVehicleDevice(deviceName);

                      // Show why it's not a vehicle if it isn't
                      if (!isVehicle) {
                      } else {

                          if (!isVehicleAlreadyRegistered(deviceAddress)) {
                              runOnUiThread(() -> {
                                  showVehicleRegistrationDialog(deviceAddress, deviceName);
                              });
                          } else {
                          }
                      }
                  } else {
                  }
              }


          } catch (SecurityException e) {
          } catch (Exception e) {
              Log.e(TAG, "Error checking paired devices: " + e.getMessage(), e);
          }
      }

      private void startPeriodicBluetoothScan() {
          if (bluetoothAdapter == null) {
              return;
          }


          // Create periodic work request for every 15 minutes (minimum allowed interval)
          PeriodicWorkRequest bluetoothWork = new PeriodicWorkRequest.Builder(
              BluetoothWorker.class, 15, TimeUnit.MINUTES)
              .setInitialDelay(3, TimeUnit.SECONDS)
              .addTag("bluetooth_vehicle_monitoring")
              .build();

          // Enqueue the work
          WorkManager.getInstance(this).enqueueUniquePeriodicWork(
              "bluetooth_vehicle_monitoring",
              ExistingPeriodicWorkPolicy.REPLACE,
              bluetoothWork
          );


          // Do one immediate check for testing
          checkPairedDevices();
      }

      // Auto Detection Methods (required for WorkManager integration)
      private boolean isAutoDetectionEnabled() {
          try {
              // Check if auto detection is enabled in trip storage
              TripStorage tripStorage = new TripStorage(this);
              return tripStorage.isAutoDetectionEnabled();
          } catch (Exception e) {
              Log.e(TAG, "Error checking auto detection status: " + e.getMessage(), e);
              return false;
          }
      }

      private void startAutoDetection() {
          try {

              // Start the AutoDetectionService
              Intent serviceIntent = new Intent(this, AutoDetectionService.class);
              serviceIntent.setAction("START_AUTO_DETECTION");
              startService(serviceIntent);

              // Update UI
              runOnUiThread(() -> {
                  // Update auto detection toggle if it exists
                  if (autoToggle != null) {
                      autoToggle.setChecked(true);
                  }
              });

          } catch (Exception e) {
              Log.e(TAG, "Error starting auto detection: " + e.getMessage(), e);
          }
      }

      private void stopAutoDetection() {
          try {

              // Stop the AutoDetectionService
              Intent serviceIntent = new Intent(this, AutoDetectionService.class);
              serviceIntent.setAction("STOP_AUTO_DETECTION");
              stopService(serviceIntent);

              // Update UI
              runOnUiThread(() -> {
                  // Update auto detection toggle if it exists
                  if (autoToggle != null) {
                      autoToggle.setChecked(false);
                  }
              });

          } catch (Exception e) {
              Log.e(TAG, "Error stopping auto detection: " + e.getMessage(), e);
          }
      }

      private void startBluetoothDiscovery() {
          try {
              if (bluetoothAdapter == null) {
                  return;
              }

              if (!bluetoothAdapter.isEnabled()) {
                  return;
              }

              // Check permissions for Android 12+
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                  if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                      return;
                  }
              }

              // Cancel any ongoing discovery
              if (bluetoothAdapter.isDiscovering()) {
                  bluetoothAdapter.cancelDiscovery();
              }

              // Start discovery
              boolean started = bluetoothAdapter.startDiscovery();
              if (started) {

                  runOnUiThread(() -> {
                      bluetoothStatusText.setText("Bluetooth: Scanning...");
                      bluetoothStatusText.setTextColor(Color.BLUE);
                  });
              } else {
              }

          } catch (Exception e) {
              Log.e(TAG, "Error starting Bluetooth discovery: " + e.getMessage(), e);
          }
      }

      @Override
      public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
          super.onRequestPermissionsResult(requestCode, permissions, grantResults);

          boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;

          for (int i = 0; i < permissions.length; i++) {
              String perm = permissions[i];
              boolean permGranted = grantResults.length > i && grantResults[i] == PackageManager.PERMISSION_GRANTED;
              if (permGranted) {
                  EventTracker.trackPermissionGranted(this, perm);
              } else {
                  EventTracker.trackPermissionDenied(this, perm);
              }
          }

          // If still in onboarding, continue the flow
          if (!isOnboardingComplete()) {
              continueOnboardingAfterPermission(requestCode, granted);
              return;
          }

          // Standard permission handling for users who already completed onboarding
          if (requestCode == LOCATION_PERMISSION_REQUEST) {
              if (granted) {
                  initializeGPS();

                  // ANDROID 11+ COMPLIANCE: Show educational UI before requesting background permission
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                      showBackgroundPermissionEducation();
                  } else {
                      // Android 9 and below don't have background location permission
                      requestBluetoothPermissions();
                  }
              } else {
                  // Foreground location denied - show explanation and Settings option
                  showLocationPermissionDeniedDialog();
              }
          } else if (requestCode == BACKGROUND_LOCATION_PERMISSION_REQUEST) {
              if (granted) {
                  Log.d(TAG, "Background location permission granted");
                  Toast.makeText(this, "✓ Automatic trip tracking enabled", Toast.LENGTH_LONG).show();
              } else {
                  // Background permission denied - show explanation and Settings option
                  showBackgroundPermissionDeniedDialog();
              }
              // Always request Bluetooth permissions after background location
              requestBluetoothPermissions();
          } else if (requestCode == BLUETOOTH_PERMISSION_REQUEST) {
              if (granted) {
                  Log.d(TAG, "Bluetooth permissions granted, vehicle recognition should now work");
                  initializeBluetoothDiscovery();
              } else {
                  Log.w(TAG, "Bluetooth permissions denied, vehicle recognition disabled");
              }
          }
      }

      // ANDROID 11+ COMPLIANCE: Educational dialog before background permission request
      private void showBackgroundPermissionEducation() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Enable Automatic Trip Tracking");
          builder.setMessage("MileTracker Pro needs permission to track your location in the background to automatically detect trips.\n\n" +
                  "This allows the app to:\n" +
                  "• Automatically start tracking when you begin driving\n" +
                  "• Record trips even when the app is closed\n" +
                  "• Track your full trip from start to finish\n\n" +
                  "Your location data is stored securely and only used for trip tracking.");

          builder.setPositiveButton("Continue", (dialog, which) -> {
              // User acknowledged, now request background permission
              if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                  ActivityCompat.requestPermissions(this,
                      new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                      BACKGROUND_LOCATION_PERMISSION_REQUEST);
              } else {
                  requestBluetoothPermissions();
              }
          });

          builder.setNegativeButton("Not Now", (dialog, which) -> {
              Toast.makeText(this, "Automatic tracking disabled. Enable in Settings anytime.", Toast.LENGTH_LONG).show();
              requestBluetoothPermissions();
          });

          builder.setCancelable(false);
          builder.show();
      }

      // Handle foreground location permission denied
      private void showLocationPermissionDeniedDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Location Permission Required");
          builder.setMessage("MileTracker Pro needs location access to track your trips and calculate mileage.\n\n" +
                  "Without location permission, the app cannot function.");

          builder.setPositiveButton("Open Settings", (dialog, which) -> {
              Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
              intent.setData(android.net.Uri.parse("package:" + getPackageName()));
              startActivity(intent);
          });

          builder.setNegativeButton("Cancel", (dialog, which) -> {
              Toast.makeText(this, "Location permission is required for trip tracking", Toast.LENGTH_LONG).show();
              requestBluetoothPermissions();
          });

          builder.show();
      }

      // Handle background location permission denied
      private void showBackgroundPermissionDeniedDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Automatic Tracking Disabled");
          builder.setMessage("Background location permission was not granted.\n\n" +
                  "You can still:\n" +
                  "• Manually start/stop trips\n" +
                  "• Track trips while the app is open\n\n" +
                  "To enable automatic tracking, go to Settings and allow \"Allow all the time\" for location.");

          builder.setPositiveButton("Open Settings", (dialog, which) -> {
              Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
              intent.setData(android.net.Uri.parse("package:" + getPackageName()));
              startActivity(intent);
          });

          builder.setNegativeButton("OK", (dialog, which) -> {
              // User declined, continue with limited functionality
          });

          builder.show();
      }

      private void showAutoDetectPermissionDialog(boolean hasFineLocation) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);

          if (!hasFineLocation) {
              builder.setTitle("Location Permission Needed");
              builder.setMessage("To automatically detect your trips, MileTracker Pro needs access to your location.\n\n" +
                      "We want to be upfront with you:\n\n" +
                      "\u2022 Your location is used ONLY to track your mileage\n" +
                      "\u2022 We never sell, share, or use your data for advertising\n" +
                      "\u2022 Your trip data stays on your device unless you choose to sync it\n\n" +
                      "Without location access, auto-detection cannot work.");

              boolean canAskDirectly = ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION);

              if (canAskDirectly) {
                  builder.setPositiveButton("Allow Location", (dialog, which) -> {
                      String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
                      trackEvent("auto_detect_permission_dialog", "allow_location", userEmail);
                      ActivityCompat.requestPermissions(this,
                          new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                          LOCATION_PERMISSION_REQUEST);
                  });
              } else {
                  builder.setPositiveButton("Open App Settings", (dialog, which) -> {
                      String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
                      trackEvent("auto_detect_permission_dialog", "open_settings", userEmail);
                      Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                      intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                      startActivity(intent);
                  });
              }

          } else {
              builder.setTitle("Background Location Needed");
              builder.setMessage("Almost there! Auto-detection needs background location to track trips while you drive \u2014 even when the app isn't open.\n\n" +
                      "\u2022 Your location is used ONLY to record your mileage\n" +
                      "\u2022 We never sell, share, or use your data for advertising\n\n" +
                      "Tap below to open location settings, then select \"Allow all the time\".");

              builder.setPositiveButton("Open Location Settings", (dialog, which) -> {
                  String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
                  trackEvent("auto_detect_permission_dialog", "open_settings", userEmail);
                  getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE).edit()
                      .putBoolean("awaiting_bg_permission_return", true)
                      .putLong("bg_permission_settings_opened_at", System.currentTimeMillis())
                      .apply();
                  Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                  intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                  startActivity(intent);
              });
          }

          builder.setNegativeButton("Not Now", (dialog, which) -> {
              String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              trackEvent("auto_detect_permission_dialog", "not_now", userEmail);
          });

          builder.setCancelable(true);
          builder.show();
      }

      // ==================== FRIENDLY ONBOARDING FLOW ====================

      private boolean isOnboardingComplete() {
          SharedPreferences prefs = getSharedPreferences(ONBOARDING_PREFS, MODE_PRIVATE);
          return prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false);
      }

      private void markOnboardingComplete() {
          SharedPreferences prefs = getSharedPreferences(ONBOARDING_PREFS, MODE_PRIVATE);
          prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETE, true).apply();
      }

      private void markStepSkipped(String key) {
          SharedPreferences prefs = getSharedPreferences(ONBOARDING_PREFS, MODE_PRIVATE);
          prefs.edit().putBoolean(key, true).apply();
      }

      private boolean wasStepSkipped(String key) {
          SharedPreferences prefs = getSharedPreferences(ONBOARDING_PREFS, MODE_PRIVATE);
          return prefs.getBoolean(key, false);
      }

      private boolean hasAnySkippedPermissions() {
          return wasStepSkipped(KEY_LOCATION_SKIPPED) || 
                 wasStepSkipped(KEY_BACKGROUND_SKIPPED) || 
                 wasStepSkipped(KEY_BATTERY_SKIPPED) ||
                 wasStepSkipped(KEY_NOTIFICATIONS_SKIPPED);
      }

      private void startFriendlyOnboarding() {
          currentOnboardingStep = 0;
          showOnboardingWelcome();
      }

      private void showOnboardingWelcome() {
          if (onboardingDialog != null && onboardingDialog.isShowing()) {
              onboardingDialog.dismiss();
          }

          AlertDialog.Builder builder = new AlertDialog.Builder(this);

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 40, 50, 30);
          layout.setGravity(Gravity.CENTER_HORIZONTAL);

          TextView title = new TextView(this);
          title.setText("Welcome to MileTracker Pro");
          title.setTextSize(22);
          title.setTextColor(COLOR_PRIMARY);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          title.setGravity(Gravity.CENTER);
          layout.addView(title);

          TextView savingsIcon = new TextView(this);
          savingsIcon.setText("💰");
          savingsIcon.setTextSize(48);
          savingsIcon.setGravity(Gravity.CENTER);
          savingsIcon.setPadding(0, 20, 0, 10);
          layout.addView(savingsIcon);

          TextView savingsText = new TextView(this);
          savingsText.setText("The average driver saves\n$6,500/year in tax deductions");
          savingsText.setTextSize(18);
          savingsText.setTextColor(COLOR_SUCCESS);
          savingsText.setTypeface(null, android.graphics.Typeface.BOLD);
          savingsText.setGravity(Gravity.CENTER);
          savingsText.setPadding(0, 0, 0, 16);
          layout.addView(savingsText);

          TextView subtitle = new TextView(this);
          subtitle.setText("Track your miles automatically.\nClassify trips with one swipe.\nExport IRS-ready reports.");
          subtitle.setTextSize(15);
          subtitle.setTextColor(COLOR_TEXT_PRIMARY);
          subtitle.setGravity(Gravity.CENTER);
          subtitle.setPadding(0, 0, 0, 24);
          layout.addView(subtitle);

          TextView rateInfo = new TextView(this);
          rateInfo.setText(String.format("2026 IRS Rate: $%.3f per business mile", getIrsBusinessRate()));
          rateInfo.setTextSize(13);
          rateInfo.setTextColor(COLOR_TEXT_SECONDARY);
          rateInfo.setGravity(Gravity.CENTER);
          rateInfo.setPadding(0, 0, 0, 10);
          layout.addView(rateInfo);

          builder.setView(layout);
          builder.setCancelable(false);

          builder.setPositiveButton("Get Started", (dialog, which) -> {
              showOnboardingNotifications();
          });

          onboardingDialog = builder.create();
          onboardingDialog.show();
      }

      private void showOnboardingNotifications() {
          if (onboardingDialog != null && onboardingDialog.isShowing()) {
              onboardingDialog.dismiss();
          }

          if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
              showOnboardingComplete();
              return;
          }

          if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
              showOnboardingComplete();
              return;
          }

          AlertDialog.Builder builder = new AlertDialog.Builder(this);

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 40, 50, 30);
          layout.setGravity(Gravity.CENTER_HORIZONTAL);

          TextView bellIcon = new TextView(this);
          bellIcon.setText("🔔");
          bellIcon.setTextSize(42);
          bellIcon.setGravity(Gravity.CENTER);
          bellIcon.setPadding(0, 0, 0, 16);
          layout.addView(bellIcon);

          TextView title = new TextView(this);
          title.setText("Stay on Track");
          title.setTextSize(20);
          title.setTextColor(COLOR_PRIMARY);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          title.setGravity(Gravity.CENTER);
          layout.addView(title);

          TextView explanation = new TextView(this);
          explanation.setText("\nWe'll send you a quick reminder to set up auto-tracking so you never miss a deductible trip.\n\nAlso get notified when trips end so you can classify them instantly.");
          explanation.setTextSize(15);
          explanation.setTextColor(COLOR_TEXT_PRIMARY);
          explanation.setGravity(Gravity.CENTER);
          explanation.setPadding(0, 10, 0, 20);
          layout.addView(explanation);

          TextView privacyNote = new TextView(this);
          privacyNote.setText("No spam, ever. You can turn these off anytime.");
          privacyNote.setTextSize(13);
          privacyNote.setTextColor(COLOR_TEXT_SECONDARY);
          privacyNote.setGravity(Gravity.CENTER);
          privacyNote.setPadding(0, 0, 0, 10);
          layout.addView(privacyNote);

          builder.setView(layout);
          builder.setCancelable(false);

          builder.setPositiveButton("Enable Notifications", (dialog, which) -> {
              currentOnboardingStep = 4;
              ActivityCompat.requestPermissions(this, 
                  new String[]{Manifest.permission.POST_NOTIFICATIONS}, 
                  NOTIFICATION_PERMISSION_REQUEST);
          });

          builder.setNegativeButton("Not Now", (dialog, which) -> {
              markStepSkipped(KEY_NOTIFICATIONS_SKIPPED);
              showOnboardingComplete();
          });

          onboardingDialog = builder.create();
          onboardingDialog.show();
      }

      private void showOnboardingComplete() {
          if (onboardingDialog != null && onboardingDialog.isShowing()) {
              onboardingDialog.dismiss();
          }

          markOnboardingComplete();
          scheduleTrackingReminder();

          AlertDialog.Builder builder = new AlertDialog.Builder(this);

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 40, 50, 30);
          layout.setGravity(Gravity.CENTER_HORIZONTAL);

          TextView checkmark = new TextView(this);
          checkmark.setText("🚗");
          checkmark.setTextSize(48);
          checkmark.setGravity(Gravity.CENTER);
          checkmark.setPadding(0, 0, 0, 20);
          layout.addView(checkmark);

          TextView title = new TextView(this);
          title.setText("You're In!");
          title.setTextSize(22);
          title.setTextColor(COLOR_PRIMARY);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          title.setGravity(Gravity.CENTER);
          layout.addView(title);

          String message;
          message = "\nExplore the app and see how easy mileage tracking can be.\n\nWhen you're ready, tap the Track tab to enable auto-tracking - it takes 30 seconds and you'll never miss a trip again.";

          TextView subtitle = new TextView(this);
          subtitle.setText(message);
          subtitle.setTextSize(15);
          subtitle.setTextColor(COLOR_TEXT_PRIMARY);
          subtitle.setGravity(Gravity.CENTER);
          subtitle.setPadding(0, 10, 0, 20);
          layout.addView(subtitle);

          TextView autoTrackNote = new TextView(this);
          autoTrackNote.setText("Auto-tracking is OFF until you set it up");
          autoTrackNote.setTextSize(13);
          autoTrackNote.setTextColor(0xFFE65100);
          autoTrackNote.setGravity(Gravity.CENTER);
          autoTrackNote.setTypeface(null, android.graphics.Typeface.BOLD);
          autoTrackNote.setPadding(0, 0, 0, 10);
          layout.addView(autoTrackNote);

          builder.setView(layout);
          builder.setCancelable(false);

          builder.setPositiveButton("Set Up Auto-Tracking", (dialog, which) -> {
              updateAutoTrackBanner();
              switchToTab("autotrack");
          });

          builder.setNeutralButton("Explore First", (dialog, which) -> {
              updateAutoTrackBanner();
          });

          onboardingDialog = builder.create();
          onboardingDialog.show();
      }

      // Continue onboarding after permission result
      private void continueOnboardingAfterPermission(int requestCode, boolean granted) {
          if (!isOnboardingComplete()) {
              if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
                  if (!granted) {
                      markStepSkipped(KEY_NOTIFICATIONS_SKIPPED);
                  }
                  showOnboardingComplete();
              }
          }
      }

      private void updateAutoTrackBanner() {
          if (autoTrackOffBanner == null) return;
          SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
          boolean autoDetectionOn = prefs.getBoolean("auto_detection_enabled", false);
          if (autoDetectionOn) {
              autoTrackOffBanner.setVisibility(View.GONE);
          } else {
              autoTrackOffBanner.setVisibility(View.VISIBLE);
          }
      }

      private void scheduleTrackingReminder() {
          try {
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              boolean alreadyScheduled = prefs.getBoolean("tracking_reminder_scheduled", false);
              if (alreadyScheduled) return;

              prefs.edit().putBoolean("tracking_reminder_scheduled", true)
                         .putLong("app_install_time", System.currentTimeMillis())
                         .apply();

              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                  NotificationChannel channel = new NotificationChannel(
                      "tracking_reminders", "Tracking Reminders", NotificationManager.IMPORTANCE_DEFAULT);
                  channel.setDescription("Reminders to set up auto-tracking");
                  NotificationManager nm = getSystemService(NotificationManager.class);
                  if (nm != null) nm.createNotificationChannel(channel);
              }

              android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
              if (alarmManager != null) {
                  Intent reminderIntent = new Intent(this, MainActivity.class);
                  reminderIntent.setAction("TRACKING_REMINDER");
                  android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                      this, 9001, reminderIntent,
                      android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

                  long triggerTime = System.currentTimeMillis() + (24 * 60 * 60 * 1000);
                  alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error scheduling tracking reminder: " + e.getMessage());
          }
      }

      private void showTrackingReminderNotification() {
          try {
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              boolean autoDetectionOn = prefs.getBoolean("auto_detection_enabled", false);
              if (autoDetectionOn) return;

              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                      return;
                  }
              }

              Intent openIntent = new Intent(this, MainActivity.class);
              openIntent.setAction("OPEN_AUTOTRACK");
              openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
              android.app.PendingIntent openPending = android.app.PendingIntent.getActivity(
                  this, 9002, openIntent,
                  android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

              String channelId = "tracking_reminders";
              android.app.Notification.Builder notifBuilder;
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                  notifBuilder = new android.app.Notification.Builder(this, channelId);
              } else {
                  notifBuilder = new android.app.Notification.Builder(this);
              }

              notifBuilder.setSmallIcon(android.R.drawable.ic_menu_mylocation)
                  .setContentTitle("You're missing tax deductions!")
                  .setContentText("Enable auto-tracking to start saving. Takes 30 seconds.")
                  .setContentIntent(openPending)
                  .setAutoCancel(true);

              NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
              if (nm != null) {
                  nm.notify(9001, notifBuilder.build());
              }

              long secondReminderTime = System.currentTimeMillis() + (6 * 24 * 60 * 60 * 1000);
              boolean sentSecondReminder = prefs.getBoolean("second_reminder_sent", false);
              if (!sentSecondReminder) {
                  prefs.edit().putBoolean("second_reminder_sent", true).apply();
                  android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
                  if (alarmManager != null) {
                      Intent secondIntent = new Intent(this, MainActivity.class);
                      secondIntent.setAction("TRACKING_REMINDER_2");
                      android.app.PendingIntent secondPending = android.app.PendingIntent.getActivity(
                          this, 9003, secondIntent,
                          android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
                      alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, secondReminderTime, secondPending);
                  }
              }
          } catch (Exception e) {
              Log.e(TAG, "Error showing tracking reminder: " + e.getMessage());
          }
      }

      // Create the tracking incomplete warning banner
      private LinearLayout createTrackingIncompleteBanner() {
          LinearLayout banner = new LinearLayout(this);
          banner.setOrientation(LinearLayout.HORIZONTAL);
          banner.setBackgroundColor(0xFFFFF3CD); // Warning yellow background
          banner.setPadding(20, 12, 20, 12);
          banner.setGravity(Gravity.CENTER_VERTICAL);
          banner.setVisibility(View.GONE); // Hidden by default

          TextView warningIcon = new TextView(this);
          warningIcon.setText("⚠️");
          warningIcon.setTextSize(16);
          warningIcon.setPadding(0, 0, 10, 0);
          banner.addView(warningIcon);

          TextView messageText = new TextView(this);
          messageText.setText("Tracking may miss trips.");
          messageText.setTextSize(14);
          messageText.setTextColor(0xFF856404); // Dark warning text
          messageText.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          banner.addView(messageText);

          TextView fixButton = new TextView(this);
          fixButton.setText("Tap to fix");
          fixButton.setTextSize(14);
          fixButton.setTextColor(COLOR_PRIMARY);
          fixButton.setTypeface(null, android.graphics.Typeface.BOLD);
          fixButton.setPadding(10, 5, 10, 5);
          fixButton.setOnClickListener(v -> showPermissionFixDialog());
          banner.addView(fixButton);

          return banner;
      }

      // Check if banner should be shown and update visibility
      private void updateTrackingIncompleteBanner() {
          if (trackingIncompleteBanner == null) return;

          // Only show banner if onboarding is complete and permissions were skipped
          if (isOnboardingComplete() && hasIncompleteTrackingPermissions()) {
              trackingIncompleteBanner.setVisibility(View.VISIBLE);
          } else {
              trackingIncompleteBanner.setVisibility(View.GONE);
          }
      }

      // Check if critical tracking permissions are missing (not just skipped in preferences)
      private boolean hasIncompleteTrackingPermissions() {
          // Check actual permission status, not just what was skipped
          boolean locationMissing = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED;

          boolean backgroundMissing = false;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              backgroundMissing = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED;
          }

          boolean batteryOptimizationOn = false;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
              PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
              if (pm != null) {
                  batteryOptimizationOn = !pm.isIgnoringBatteryOptimizations(getPackageName());
              }
          }

          return locationMissing || backgroundMissing || batteryOptimizationOn;
      }

      // Show dialog to fix missing permissions
      private void showPermissionFixDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Fix Trip Tracking");

          StringBuilder issues = new StringBuilder();
          issues.append("The following settings need attention:\n\n");

          boolean locationMissing = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED;
          if (locationMissing) {
              issues.append("• Location permission not granted\n");
          }

          boolean backgroundMissing = false;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              backgroundMissing = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED;
              if (backgroundMissing) {
                  issues.append("• Background location not set to \"Allow all the time\"\n");
              }
          }

          boolean batteryOptimizationOn = false;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
              PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
              if (pm != null) {
                  batteryOptimizationOn = !pm.isIgnoringBatteryOptimizations(getPackageName());
                  if (batteryOptimizationOn) {
                      issues.append("• Battery optimization not disabled\n");
                  }
              }
          }

          issues.append("\nWould you like to fix these now?");

          builder.setMessage(issues.toString());
          builder.setPositiveButton("Open Settings", (dialog, which) -> {
              Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
              intent.setData(android.net.Uri.parse("package:" + getPackageName()));
              startActivity(intent);
          });
          builder.setNegativeButton("Later", null);
          builder.show();
      }

      @Override
      public void onLocationChanged(Location location) {
          // GPS Signal Quality Validation for location listener
          if (location != null && isLocationAccurateEnough(location)) {
              // Process high-quality location updates for trip detection
              if (autoDetectionEnabled) {
                  float speed = location.getSpeed() * 2.237f; // Convert m/s to mph
                  processEnhancedAutoDetection(
                      (double) speed,
                      location.getLatitude(),
                      location.getLongitude(),
                      location.getTime()
                  );
              }
          } else if (location != null) {
              Log.d(TAG, "LocationListener: Rejecting poor quality GPS reading - Accuracy: " + 
                  (location.hasAccuracy() ? location.getAccuracy() + "m" : "unknown"));
          }
      }

      @Override
      public void onStatusChanged(String provider, int status, Bundle extras) {}

      @Override
      public void onProviderEnabled(String provider) {}

      @Override
      public void onProviderDisabled(String provider) {}

      @Override
      protected void onDestroy() {
          super.onDestroy();
          if (speedHandler != null && speedRunnable != null) {
              speedHandler.removeCallbacks(speedRunnable);
          }
          if (bluetoothUpdateReceiver != null) {
              try {
                  unregisterReceiver(bluetoothUpdateReceiver);
              } catch (Exception e) {
                  Log.e(TAG, "Error unregistering Bluetooth update receiver: " + e.getMessage(), e);
              }
          }
          if (bluetoothDiscoveryReceiver != null) {
              try {
                  unregisterReceiver(bluetoothDiscoveryReceiver);
              } catch (Exception e) {
                  Log.e(TAG, "Error unregistering Bluetooth discovery receiver: " + e.getMessage(), e);
              }
          }
          if (bluetoothScanHandler != null && bluetoothScanRunnable != null) {
              bluetoothScanHandler.removeCallbacks(bluetoothScanRunnable);
          }

          // Unregister trip limit receiver
          if (tripLimitReceiver != null) {
              try {
                  unregisterReceiver(tripLimitReceiver);
              } catch (Exception e) {
                  Log.e(TAG, "Error unregistering trip limit receiver: " + e.getMessage(), e);
              }
          }

          // Cancel WorkManager tasks when app is destroyed
          try {
              WorkManager.getInstance(this).cancelUniqueWork("bluetooth_vehicle_monitoring");
          } catch (Exception e) {
              Log.e(TAG, "Error cancelling WorkManager tasks: " + e.getMessage(), e);
          }

          // Clean up billing connection
          if (billingManager != null) {
              billingManager.endConnection();
          }
      }

      // What's New Dialog - Shows once after app update to announce new features
      private void checkAndShowWhatsNew() {
          SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
          int lastSeenVersion = prefs.getInt("whats_new_version_seen", 0);

          // Only show if user hasn't seen this version's announcement
          // and they're not a brand new user (who just installed)
          boolean isExistingUser = prefs.contains("guest_mode") || 
              new UserAuthManager(this).isLoggedIn() ||
              tripStorage != null && tripStorage.getAllTrips().size() > 0;

          if (lastSeenVersion < WHATS_NEW_VERSION && isExistingUser) {
              showWhatsNewDialog();
              prefs.edit().putInt("whats_new_version_seen", WHATS_NEW_VERSION).apply();
          }
      }

      private void showWhatsNewDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("What's New");

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 40, 50, 20);

          TextView titleText = new TextView(this);
          titleText.setText("Try Before You Register!");
          titleText.setTextSize(18);
          titleText.setTextColor(COLOR_PRIMARY);
          titleText.setTypeface(null, android.graphics.Typeface.BOLD);
          titleText.setPadding(0, 0, 0, 30);
          layout.addView(titleText);

          TextView messageText = new TextView(this);
          messageText.setText("You can now track trips without creating an account.\n\n" +
              "Your trips are stored safely on your phone. When you're ready, " +
              "create a free account to unlock:\n\n" +
              "  \u2022  Cloud backup (never lose your data)\n" +
              "  \u2022  40 free trips per month\n" +
              "  \u2022  Sync across devices\n" +
              "  \u2022  CSV export for tax time\n\n" +
              "Upgrade to Premium anytime for unlimited trips.");
          messageText.setTextSize(15);
          messageText.setTextColor(COLOR_TEXT_PRIMARY);
          messageText.setLineSpacing(0, 1.3f);
          layout.addView(messageText);

          builder.setView(layout);
          builder.setPositiveButton("Got It", (dialog, which) -> dialog.dismiss());
          builder.setCancelable(true);

          AlertDialog dialog = builder.create();
          dialog.show();

          // Style the button
          dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(COLOR_PRIMARY);
      }

      // Manage Categories Dialog
      private void showManageCategoriesDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Manage Categories");

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(50, 20, 50, 20);

          // Instructions
          TextView instructionsText = new TextView(this);
          instructionsText.setText("Default categories (Business, Personal, Medical, Charity) cannot be removed.\n\nCustom categories:");
          instructionsText.setTextSize(14);
          instructionsText.setTextColor(0xFF666666);
          instructionsText.setPadding(0, 0, 0, 20);
          layout.addView(instructionsText);

          // Current custom categories list
          LinearLayout categoriesListLayout = new LinearLayout(this);
          categoriesListLayout.setOrientation(LinearLayout.VERTICAL);

          List<String> customCategories = tripStorage.getCustomCategories();
          for (String category : customCategories) {
              LinearLayout categoryRow = new LinearLayout(this);
              categoryRow.setOrientation(LinearLayout.HORIZONTAL);
              categoryRow.setGravity(Gravity.CENTER_VERTICAL);
              categoryRow.setPadding(10, 5, 10, 5);

              TextView categoryText = new TextView(this);
              categoryText.setText(category);
              categoryText.setTextSize(16);
              categoryText.setTextColor(0xFF333333);
              LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
                  0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
              categoryText.setLayoutParams(textParams);
              categoryRow.addView(categoryText);

              Button removeButton = new Button(this);
              removeButton.setText("Remove");
              removeButton.setTextSize(12);
              removeButton.setBackground(createRoundedBackground(0xFFFF5722, 14));
              removeButton.setTextColor(0xFFFFFFFF);
              removeButton.setPadding(20, 8, 20, 8);
              removeButton.setOnClickListener(v -> {
                  // Remove from both local storage and API
                  tripStorage.removeCustomCategory(category);
                  CloudBackupService cloudService = new CloudBackupService(this);
                  cloudService.removeCustomCategoryFromAPI(category);
                  showManageCategoriesDialog(); // Refresh dialog
              });
              categoryRow.addView(removeButton);

              categoriesListLayout.addView(categoryRow);
          }

          if (customCategories.isEmpty()) {
              TextView emptyText = new TextView(this);
              emptyText.setText("No custom categories yet.");
              emptyText.setTextSize(14);
              emptyText.setTextColor(0xFF999999);
              emptyText.setGravity(Gravity.CENTER);
              emptyText.setPadding(0, 20, 0, 20);
              categoriesListLayout.addView(emptyText);
          }

          layout.addView(categoriesListLayout);

          // Add new category section
          TextView addNewLabel = new TextView(this);
          addNewLabel.setText("Add New Category:");
          addNewLabel.setTextSize(16);
          addNewLabel.setTextColor(0xFF333333);
          addNewLabel.setPadding(0, 30, 0, 10);
          layout.addView(addNewLabel);

          EditText newCategoryInput = new EditText(this);
          newCategoryInput.setHint("Enter category name");
          newCategoryInput.setTextSize(16);
          newCategoryInput.setPadding(20, 20, 20, 20);
          layout.addView(newCategoryInput);

          builder.setView(layout);

          builder.setPositiveButton("Add Category", (dialog, which) -> {
              String newCategory = newCategoryInput.getText().toString().trim();
              if (!newCategory.isEmpty()) {
                  // Check if it's a default category
                  if (newCategory.equals("Business") || newCategory.equals("Personal") || 
                      newCategory.equals("Medical") || newCategory.equals("Charity")) {
                      return;
                  }

                  // Add to both local storage and API
                  tripStorage.addCustomCategory(newCategory);
                  CloudBackupService cloudService = new CloudBackupService(this);
                  cloudService.addCustomCategoryToAPI(newCategory);
                  updateCategorizedTrips(); // Refresh the trips view
              }
          });

          builder.setNegativeButton("Close", null);
          builder.show();
      }

      // Helper method to format work days for display
      private String getWorkDaysString(List<Integer> workDays) {
          if (workDays == null || workDays.isEmpty()) {
              return "None";
          }

          StringBuilder sb = new StringBuilder();
          String[] dayNames = {"", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

          for (int i = 0; i < workDays.size(); i++) {
              if (i > 0) sb.append(", ");
              int day = workDays.get(i);
              if (day >= 1 && day <= 7) {
                  sb.append(dayNames[day]);
              }
          }

          return sb.toString();
      }

      // Work Hours Configuration Dialog
      private void showConfigureWorkHoursDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Configure Work Hours");

          ScrollView scrollView = new ScrollView(this);
          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(30, 20, 30, 20);

          // Enable/Disable Checkbox
          CheckBox enableCheckbox = new CheckBox(this);
          enableCheckbox.setText("Enable Work Hours Auto-Classification");
          enableCheckbox.setChecked(tripStorage.isWorkHoursEnabled());
          enableCheckbox.setTextSize(16);
          enableCheckbox.setPadding(0, 0, 0, 20);
          layout.addView(enableCheckbox);

          // Work Start Time
          TextView startTimeLabel = new TextView(this);
          startTimeLabel.setText("Work Start Time:");
          startTimeLabel.setTextSize(14);
          startTimeLabel.setTextColor(COLOR_TEXT_PRIMARY);
          startTimeLabel.setPadding(0, 0, 0, 5);
          layout.addView(startTimeLabel);

          EditText startTimeInput = new EditText(this);
          startTimeInput.setText(tripStorage.getWorkStartTime());
          startTimeInput.setHint("09:00");
          startTimeInput.setInputType(InputType.TYPE_CLASS_DATETIME | InputType.TYPE_DATETIME_VARIATION_TIME);
          LinearLayout.LayoutParams startTimeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          startTimeParams.setMargins(0, 0, 0, 15);
          startTimeInput.setLayoutParams(startTimeParams);
          layout.addView(startTimeInput);

          // Work End Time
          TextView endTimeLabel = new TextView(this);
          endTimeLabel.setText("Work End Time:");
          endTimeLabel.setTextSize(14);
          endTimeLabel.setTextColor(COLOR_TEXT_PRIMARY);
          endTimeLabel.setPadding(0, 0, 0, 5);
          layout.addView(endTimeLabel);

          EditText endTimeInput = new EditText(this);
          endTimeInput.setText(tripStorage.getWorkEndTime());
          endTimeInput.setHint("17:00");
          endTimeInput.setInputType(InputType.TYPE_CLASS_DATETIME | InputType.TYPE_DATETIME_VARIATION_TIME);
          LinearLayout.LayoutParams endTimeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          endTimeParams.setMargins(0, 0, 0, 15);
          endTimeInput.setLayoutParams(endTimeParams);
          layout.addView(endTimeInput);

          // Work Days Selection
          TextView workDaysLabel = new TextView(this);
          workDaysLabel.setText("Work Days:");
          workDaysLabel.setTextSize(14);
          workDaysLabel.setTextColor(COLOR_TEXT_PRIMARY);
          workDaysLabel.setPadding(0, 0, 0, 10);
          layout.addView(workDaysLabel);

          List<Integer> currentWorkDays = tripStorage.getWorkDays();
          CheckBox[] dayCheckboxes = new CheckBox[7];
          String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

          for (int i = 0; i < 7; i++) {
              dayCheckboxes[i] = new CheckBox(this);
              dayCheckboxes[i].setText(dayNames[i]);
              dayCheckboxes[i].setChecked(currentWorkDays.contains(i + 1));
              dayCheckboxes[i].setTextSize(14);
              dayCheckboxes[i].setPadding(10, 5, 10, 5);
              layout.addView(dayCheckboxes[i]);
          }

          scrollView.addView(layout);
          builder.setView(scrollView);

          builder.setPositiveButton("Save", (dialog, which) -> {
              try {
                  // Save enabled state
                  tripStorage.setWorkHoursEnabled(enableCheckbox.isChecked());

                  // Save work times
                  String startTime = startTimeInput.getText().toString().trim();
                  String endTime = endTimeInput.getText().toString().trim();

                  if (!startTime.isEmpty() && startTime.matches("^\\d{2}:\\d{2}$")) {
                      tripStorage.setWorkStartTime(startTime);
                  }

                  if (!endTime.isEmpty() && endTime.matches("^\\d{2}:\\d{2}$")) {
                      tripStorage.setWorkEndTime(endTime);
                  }

                  // Save work days
                  List<Integer> selectedDays = new ArrayList<>();
                  for (int i = 0; i < 7; i++) {
                      if (dayCheckboxes[i].isChecked()) {
                          selectedDays.add(i + 1);
                      }
                  }
                  tripStorage.setWorkDays(selectedDays);


              } catch (Exception e) {
                  Log.e(TAG, "Error saving work hours configuration", e);
                  Toast.makeText(this, "Error saving configuration", Toast.LENGTH_SHORT).show();
              }
          });

          builder.setNegativeButton("Cancel", null);
          builder.show();
      }

      // ENHANCED: Refresh with visual feedback and API sync
      private void performRefreshWithFeedback(Button refreshButton) {
          // Show loading state with pressed color
          refreshButton.setText("Loading...");
          refreshButton.setEnabled(false);
          refreshButton.setBackground(createRoundedBackground(0xFF5A6268, 14)); // Darker gray when pressed


          new Thread(() -> {
              try {
                  // Download latest trips from API if sync enabled
                  if (tripStorage.isApiSyncEnabled()) {
                      try {
                          CloudBackupService cloudService = new CloudBackupService(MainActivity.this);
                          cloudService.downloadAllUserTrips();
                          cloudService.syncCustomCategoriesWithAPI();
                      } catch (Exception e) {
                          Log.e(TAG, "API download failed: " + e.getMessage());
                      }
                  }

                  // Update UI on main thread
                  runOnUiThread(() -> {
                      // Reset button to original gray color
                      refreshButton.setText("REFRESH");
                      refreshButton.setEnabled(true);
                      refreshButton.setBackground(createRoundedBackground(COLOR_TEXT_SECONDARY, 14));

                      // Update displays
                      if ("home".equals(currentTab)) {
                          updateRecentTrips();
                      } else {
                          updateAllTrips();
                      }
                      updateStats();

                      // Show success feedback
                      Toast.makeText(MainActivity.this, "✓ Trips refreshed", Toast.LENGTH_SHORT).show();
                  });

              } catch (Exception e) {
                  Log.e(TAG, "Error during refresh: " + e.getMessage(), e);

                  runOnUiThread(() -> {
                      // Reset button to original state
                      refreshButton.setText("REFRESH");
                      refreshButton.setEnabled(true);
                      refreshButton.setBackground(createRoundedBackground(COLOR_TEXT_SECONDARY, 14));

                      // Show error feedback
                      Toast.makeText(MainActivity.this, "Refresh failed - using local data", Toast.LENGTH_SHORT).show();
                  });
              }
          }).start();
      }

      // ENHANCED: Complete edit dialog for all trip fields
      private void showEditTripDialog(Trip trip) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Edit Trip - All Fields");

          // Main container with scrollable content + fixed button bar
          LinearLayout mainContainer = new LinearLayout(this);
          mainContainer.setOrientation(LinearLayout.VERTICAL);
          mainContainer.setPadding(20, 20, 20, 20);

          // Scrollable content area (60% of screen height)
          ScrollView scrollView = new ScrollView(this);
          int maxHeight = (int) (getResources().getDisplayMetrics().heightPixels * 0.55); // 55% for content
          LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              maxHeight
          );
          scrollView.setLayoutParams(scrollParams);

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(20, 10, 20, 10);

          // Trip Date
          TextView dateLabel = new TextView(this);
          dateLabel.setText("Trip Date:");
          dateLabel.setTextSize(14);
          dateLabel.setTypeface(null, Typeface.BOLD);

          Button dateButton = new Button(this);
          SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);
          Calendar tripDate = Calendar.getInstance();
          tripDate.setTimeInMillis(trip.getStartTime());
          dateButton.setText(dateFormat.format(tripDate.getTime()));
          dateButton.setBackground(createRoundedBackground(0xFFE5E7EB, 14));
          dateButton.setTextColor(0xFF374151);

          dateButton.setOnClickListener(v -> {
              DatePickerDialog datePicker = new DatePickerDialog(this,
                  (view, year, month, dayOfMonth) -> {
                      tripDate.set(year, month, dayOfMonth);
                      dateButton.setText(dateFormat.format(tripDate.getTime()));
                  },
                  tripDate.get(Calendar.YEAR),
                  tripDate.get(Calendar.MONTH),
                  tripDate.get(Calendar.DAY_OF_MONTH));
              datePicker.show();
          });

          // Start Time
          TextView startTimeLabel = new TextView(this);
          startTimeLabel.setText("Start Time:");
          startTimeLabel.setTextSize(14);
          startTimeLabel.setTypeface(null, Typeface.BOLD);
          startTimeLabel.setPadding(0, 10, 0, 0);

          EditText startTimeEdit = new EditText(this);
          SimpleDateFormat timeFormat = new SimpleDateFormat("h:mm a", Locale.US);
          startTimeEdit.setText(timeFormat.format(new Date(trip.getStartTime())));
          startTimeEdit.setHint("9:00 AM");

          // Duration (minutes)
          TextView durationLabel = new TextView(this);
          durationLabel.setText("Duration (minutes):");
          durationLabel.setTextSize(14);
          durationLabel.setTypeface(null, Typeface.BOLD);
          durationLabel.setPadding(0, 10, 0, 0);

          EditText durationEdit = new EditText(this);
          long durationMinutes = trip.getDuration() / (60 * 1000); // Convert ms to minutes
          durationEdit.setText(String.valueOf(durationMinutes));
          durationEdit.setInputType(InputType.TYPE_CLASS_NUMBER);
          durationEdit.setHint("30");

          // Start Location
          TextView startLabel = new TextView(this);
          startLabel.setText("Start Location:");
          startLabel.setTextSize(14);
          startLabel.setTypeface(null, Typeface.BOLD);
          startLabel.setPadding(0, 10, 0, 0);

          EditText startLocationEdit = new EditText(this);
          startLocationEdit.setText(trip.getStartAddress());
          startLocationEdit.setHint("Home, office, client address, etc.");

          // End Location
          TextView endLabel = new TextView(this);
          endLabel.setText("End Location:");
          endLabel.setTextSize(14);
          endLabel.setTypeface(null, Typeface.BOLD);
          endLabel.setPadding(0, 10, 0, 0);

          EditText endLocationEdit = new EditText(this);
          endLocationEdit.setText(trip.getEndAddress());
          endLocationEdit.setHint("Meeting location, store, etc.");

          // Distance
          TextView distanceLabel = new TextView(this);
          distanceLabel.setText("Distance (miles):");
          distanceLabel.setTextSize(14);
          distanceLabel.setTypeface(null, Typeface.BOLD);
          distanceLabel.setPadding(0, 10, 0, 0);

          EditText distanceEdit = new EditText(this);
          distanceEdit.setText(String.valueOf(trip.getDistance()));
          distanceEdit.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          distanceEdit.setHint("0.0");

          // Category
          TextView categoryLabel = new TextView(this);
          categoryLabel.setText("Category:");
          categoryLabel.setTextSize(14);
          categoryLabel.setTypeface(null, Typeface.BOLD);
          categoryLabel.setPadding(0, 10, 0, 0);

          Spinner categorySpinner = new Spinner(this);
          List<String> allCategories = tripStorage.getAllCategories();
          String[] categories = allCategories.toArray(new String[0]);
          ArrayAdapter<String> categoryAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, categories);
          categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
          categorySpinner.setAdapter(categoryAdapter);

          // Set current category
          for (int i = 0; i < categories.length; i++) {
              if (categories[i].equals(trip.getCategory())) {
                  categorySpinner.setSelection(i);
                  break;
              }
          }

          // Auto-Detected Toggle
          TextView autoDetectedLabel = new TextView(this);
          autoDetectedLabel.setText("Auto-Detected:");
          autoDetectedLabel.setTextSize(14);
          autoDetectedLabel.setTypeface(null, Typeface.BOLD);
          autoDetectedLabel.setPadding(0, 10, 0, 0);

          LinearLayout autoDetectedLayout = new LinearLayout(this);
          autoDetectedLayout.setOrientation(LinearLayout.HORIZONTAL);
          autoDetectedLayout.setGravity(Gravity.CENTER_VERTICAL);

          Switch autoDetectedSwitch = new Switch(this);
          autoDetectedSwitch.setChecked(trip.isAutoDetected());

          TextView autoDetectedInfo = new TextView(this);
          autoDetectedInfo.setText("Auto vs Manual");
          autoDetectedInfo.setTextSize(12);
          autoDetectedInfo.setTextColor(0xFF6B7280);
          autoDetectedInfo.setPadding(10, 0, 0, 0);

          autoDetectedLayout.addView(autoDetectedSwitch);
          autoDetectedLayout.addView(autoDetectedInfo);

          // Client Name
          TextView clientLabel = new TextView(this);
          clientLabel.setText("Client Name (optional):");
          clientLabel.setTextSize(14);
          clientLabel.setTypeface(null, Typeface.BOLD);
          clientLabel.setPadding(0, 10, 0, 0);

          EditText clientEdit = new EditText(this);
          clientEdit.setText(trip.getClientName() != null ? trip.getClientName() : "");
          clientEdit.setHint("Client or company name");

          // Start Display Name
          TextView startDisplayLabel = new TextView(this);
          startDisplayLabel.setText("Start Display Name (optional):");
          startDisplayLabel.setTextSize(14);
          startDisplayLabel.setTypeface(null, Typeface.BOLD);
          startDisplayLabel.setPadding(0, 10, 0, 0);

          EditText startDisplayEdit = new EditText(this);
          startDisplayEdit.setText(trip.getStartDisplayName() != null ? trip.getStartDisplayName() : "");
          startDisplayEdit.setHint("Home, Office, Client Name, etc.");

          // End Display Name
          TextView endDisplayLabel = new TextView(this);
          endDisplayLabel.setText("End Display Name (optional):");
          endDisplayLabel.setTextSize(14);
          endDisplayLabel.setTypeface(null, Typeface.BOLD);
          endDisplayLabel.setPadding(0, 10, 0, 0);

          EditText endDisplayEdit = new EditText(this);
          endDisplayEdit.setText(trip.getEndDisplayName() != null ? trip.getEndDisplayName() : "");
          endDisplayEdit.setHint("Meeting Location, Store, etc.");

          // Notes
          TextView notesLabel = new TextView(this);
          notesLabel.setText("Notes (optional):");
          notesLabel.setTextSize(14);
          notesLabel.setTypeface(null, Typeface.BOLD);
          notesLabel.setPadding(0, 10, 0, 0);

          EditText notesEdit = new EditText(this);
          notesEdit.setText(trip.getNotes() != null ? trip.getNotes() : "");
          notesEdit.setHint("Trip purpose, meeting details, etc.");
          notesEdit.setMaxLines(3);

          // Add all components to layout
          layout.addView(dateLabel);
          layout.addView(dateButton);
          layout.addView(startTimeLabel);
          layout.addView(startTimeEdit);
          layout.addView(durationLabel);
          layout.addView(durationEdit);
          layout.addView(startLabel);
          layout.addView(startLocationEdit);
          layout.addView(endLabel);
          layout.addView(endLocationEdit);
          layout.addView(distanceLabel);
          layout.addView(distanceEdit);
          layout.addView(categoryLabel);
          layout.addView(categorySpinner);
          layout.addView(autoDetectedLabel);
          layout.addView(autoDetectedLayout);
          layout.addView(clientLabel);
          layout.addView(clientEdit);
          layout.addView(startDisplayLabel);
          layout.addView(startDisplayEdit);
          layout.addView(endDisplayLabel);
          layout.addView(endDisplayEdit);
          layout.addView(notesLabel);
          layout.addView(notesEdit);

          scrollView.addView(layout);
          mainContainer.addView(scrollView);

          // Fixed button bar at bottom (always visible)
          LinearLayout buttonBar = new LinearLayout(this);
          buttonBar.setOrientation(LinearLayout.HORIZONTAL);
          buttonBar.setPadding(0, 20, 0, 0);
          buttonBar.setGravity(Gravity.CENTER);

          // CANCEL button
          Button cancelButton = new Button(this);
          cancelButton.setText("CANCEL");
          cancelButton.setTextSize(14);
          cancelButton.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
          cancelButton.setTextColor(0xFFFFFFFF);
          LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(
              0, 
              LinearLayout.LayoutParams.WRAP_CONTENT,
              1.0f
          );
          cancelParams.setMargins(0, 0, 10, 0);
          cancelButton.setLayoutParams(cancelParams);

          // SAVE button  
          Button saveButton = new Button(this);
          saveButton.setText("SAVE CHANGES");
          saveButton.setTextSize(14);
          saveButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          saveButton.setTextColor(0xFFFFFFFF);
          LinearLayout.LayoutParams saveParams = new LinearLayout.LayoutParams(
              0,
              LinearLayout.LayoutParams.WRAP_CONTENT,
              1.0f
          );
          saveParams.setMargins(10, 0, 0, 0);
          saveButton.setLayoutParams(saveParams);

          buttonBar.addView(cancelButton);
          buttonBar.addView(saveButton);
          mainContainer.addView(buttonBar);

          builder.setView(mainContainer);

          final AlertDialog editDialog = builder.create();

          // Cancel button action
          cancelButton.setOnClickListener(v -> editDialog.dismiss());

          // Save button action
          saveButton.setOnClickListener(v -> {
              try {
                  // Parse and validate all fields
                  String startLocation = startLocationEdit.getText().toString().trim();
                  String endLocation = endLocationEdit.getText().toString().trim();
                  double distance = Double.parseDouble(distanceEdit.getText().toString());
                  long durationMins = Long.parseLong(durationEdit.getText().toString());
                  String startTimeStr = startTimeEdit.getText().toString().trim();

                  // Validation
                  if (startLocation.isEmpty() || endLocation.isEmpty()) {
                      return;
                  }

                  // Update trip date and time
                  Calendar updatedDate = Calendar.getInstance();
                  updatedDate.setTimeInMillis(tripDate.getTimeInMillis());

                  // Parse start time (simplified - assumes format like "9:00 AM")
                  try {
                      Date startTime = timeFormat.parse(startTimeStr);
                      if (startTime != null) {
                          Calendar timeCalendar = Calendar.getInstance();
                          timeCalendar.setTime(startTime);
                          updatedDate.set(Calendar.HOUR_OF_DAY, timeCalendar.get(Calendar.HOUR_OF_DAY));
                          updatedDate.set(Calendar.MINUTE, timeCalendar.get(Calendar.MINUTE));
                      }
                  } catch (Exception e) {
                      Log.w(TAG, "Could not parse start time, keeping original time");
                  }

                  // Update all trip fields
                  trip.setStartAddress(startLocation);
                  trip.setEndAddress(endLocation);
                  trip.setDistance(distance);
                  trip.setDuration(durationMins * 60 * 1000); // Convert minutes to milliseconds
                  trip.setCategory(categorySpinner.getSelectedItem().toString());
                  trip.setAutoDetected(autoDetectedSwitch.isChecked());
                  trip.setClientName(clientEdit.getText().toString().trim());
                  trip.setStartDisplayName(startDisplayEdit.getText().toString().trim());
                  trip.setEndDisplayName(endDisplayEdit.getText().toString().trim());
                  trip.setNotes(notesEdit.getText().toString().trim());

                  // Update timestamps
                  trip.setStartTime(updatedDate.getTimeInMillis());
                  trip.setEndTime(updatedDate.getTimeInMillis() + trip.getDuration());

                  // Save trip and sync to API
                  tripStorage.saveTrip(trip);
                  if (tripStorage.isApiSyncEnabled()) {
                      try {
                          CloudBackupService cloudService = new CloudBackupService(MainActivity.this);
                          cloudService.backupTrip(trip);
                      } catch (Exception e) {
                          Log.e(TAG, "API backup failed: " + e.getMessage());
                      }
                  }

                  if ("home".equals(currentTab)) {
                      updateRecentTrips();
                  } else if ("trips".equals(currentTab) || "categorized".equals(currentTab)) {
                      updateCategorizedTrips();
                  } else {
                      updateAllTrips();
                  }
                  updateStats();

                  Log.d(TAG, "Trip fully updated: " + trip.getStartAddress() + " to " + trip.getEndAddress() + 
                        " on " + dateFormat.format(new Date(trip.getStartTime())));

              } catch (NumberFormatException e) {
              } catch (Exception e) {
                  Log.e(TAG, "Error updating trip: " + e.getMessage(), e);
                  Toast.makeText(MainActivity.this, "Error updating trip: " + e.getMessage(), Toast.LENGTH_SHORT).show();
              }
              editDialog.dismiss();
          });

          editDialog.show();
      }

      private void showDeleteConfirmationDialog(Trip trip) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Delete Trip - Permanent Action");

          // Main container with scrollable message + fixed button bar
          LinearLayout mainContainer = new LinearLayout(this);
          mainContainer.setOrientation(LinearLayout.VERTICAL);
          mainContainer.setPadding(20, 20, 20, 20);

          // Scrollable message area (40% of screen height)
          ScrollView scrollView = new ScrollView(this);
          int maxHeight = (int) (getResources().getDisplayMetrics().heightPixels * 0.4); // 40% for message
          LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              maxHeight
          );
          scrollView.setLayoutParams(scrollParams);

          TextView messageView = new TextView(this);
          messageView.setPadding(20, 10, 20, 10);
          messageView.setTextSize(14);

          String message = String.format(
              "Delete this trip?\n\n" +
              "From: %s\n" +
              "To: %s\n" +
              "Distance: %.1f miles\n" +
              "Date: %s\n" +
              "Client: %s\n" +
              "Purpose: %s\n\n" +
              "This action cannot be undone.\n" +
              "Trip will be permanently deleted from both local storage and cloud backup.",
              trip.getStartAddress(),
              trip.getEndAddress(),
              trip.getDistance(),
              trip.getFormattedDateTime(),
              trip.getClientName() != null ? trip.getClientName() : "Personal",
              trip.getNotes() != null ? trip.getNotes() : "Not specified"
          );

          messageView.setText(message);
          scrollView.addView(messageView);
          mainContainer.addView(scrollView);

          // Fixed button bar at bottom (always visible)
          LinearLayout buttonBar = new LinearLayout(this);
          buttonBar.setOrientation(LinearLayout.HORIZONTAL);
          buttonBar.setPadding(0, 20, 0, 0);
          buttonBar.setGravity(Gravity.CENTER);

          // CANCEL button
          Button cancelButton = new Button(this);
          cancelButton.setText("CANCEL");
          cancelButton.setTextSize(14);
          cancelButton.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
          cancelButton.setTextColor(0xFFFFFFFF);
          LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(
              0, 
              LinearLayout.LayoutParams.WRAP_CONTENT,
              1.0f
          );
          cancelParams.setMargins(0, 0, 10, 0);
          cancelButton.setLayoutParams(cancelParams);

          // DELETE button  
          Button deleteButton = new Button(this);
          deleteButton.setText("DELETE");
          deleteButton.setTextSize(14);
          deleteButton.setBackground(createRoundedBackground(0xFFDC3545, 14));
          deleteButton.setTextColor(0xFFFFFFFF);
          LinearLayout.LayoutParams deleteParams = new LinearLayout.LayoutParams(
              0,
              LinearLayout.LayoutParams.WRAP_CONTENT,
              1.0f
          );
          deleteParams.setMargins(10, 0, 0, 0);
          deleteButton.setLayoutParams(deleteParams);

          buttonBar.addView(cancelButton);
          buttonBar.addView(deleteButton);
          mainContainer.addView(buttonBar);

          builder.setView(mainContainer);

          final AlertDialog deleteDialog = builder.create();

          // Cancel button action
          cancelButton.setOnClickListener(v -> deleteDialog.dismiss());

          // Delete button action
          deleteButton.setOnClickListener(v -> {
              try {
                  // Delete trip using TripStorage's delete method
                  tripStorage.deleteTrip(trip.getId());

                  // Refresh display
                  updateRecentTrips();
                  updateAllTrips();
                  updateStats();

                  deleteDialog.dismiss();
              } catch (Exception e) {
                  Log.e(TAG, "Error deleting trip: " + e.getMessage(), e);
                  Toast.makeText(MainActivity.this, "Error deleting trip", Toast.LENGTH_SHORT).show();
              }
          });

          deleteDialog.show();
      }

      // Export functionality with date range picker
      private void showExportDialog() {
          EventTracker.trackFeatureUsed(this, "csv_export");
          // Check if user is in guest mode - prompt to register for export
          if (isGuestMode) {
              promptGuestToRegister("export");
              return;
          }

          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Export Trips");

          ScrollView scrollView = new ScrollView(this);
          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(40, 20, 40, 20);

          // Category filter selection
          TextView categoryLabel = new TextView(this);
          categoryLabel.setText("Filter by Category:");
          categoryLabel.setTextSize(16);
          categoryLabel.setTextColor(COLOR_TEXT_PRIMARY);
          categoryLabel.setPadding(0, 10, 0, 10);
          layout.addView(categoryLabel);

          Spinner categorySpinner = new Spinner(this);
          List<String> categoryOptionsList = new ArrayList<>();
          categoryOptionsList.add("All Categories");
          categoryOptionsList.addAll(tripStorage.getAllCategories());
          String[] categoryOptions = categoryOptionsList.toArray(new String[0]);
          ArrayAdapter<String> categoryAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, categoryOptions);
          categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
          categorySpinner.setAdapter(categoryAdapter);
          categorySpinner.setPadding(20, 10, 20, 20);
          layout.addView(categorySpinner);

          // Date range selection
          TextView dateRangeLabel = new TextView(this);
          dateRangeLabel.setText("Select Date Range:");
          dateRangeLabel.setTextSize(16);
          dateRangeLabel.setTextColor(COLOR_TEXT_PRIMARY);
          dateRangeLabel.setPadding(0, 10, 0, 10);
          layout.addView(dateRangeLabel);

          // Start date picker
          Button startDateButton = new Button(this);
          startDateButton.setText("Start Date: Tap to select");
          startDateButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          startDateButton.setTextColor(0xFFFFFFFF);
          startDateButton.setPadding(20, 15, 20, 15);
          layout.addView(startDateButton);

          // End date picker  
          Button endDateButton = new Button(this);
          endDateButton.setText("End Date: Tap to select");
          endDateButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          endDateButton.setTextColor(0xFFFFFFFF);
          endDateButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams endDateParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, 
              LinearLayout.LayoutParams.WRAP_CONTENT
          );
          endDateParams.setMargins(0, 10, 0, 20);
          endDateButton.setLayoutParams(endDateParams);
          layout.addView(endDateButton);

          // Export format selection
          TextView formatLabel = new TextView(this);
          formatLabel.setText("Export Format:");
          formatLabel.setTextSize(16);
          formatLabel.setTextColor(COLOR_TEXT_PRIMARY);
          formatLabel.setPadding(0, 20, 0, 10);
          layout.addView(formatLabel);

          Spinner formatSpinner = new Spinner(this);
          String[] formatOptions = {"CSV Spreadsheet (.csv)", "Text File (.txt)", "PDF Report (.pdf)"};
          ArrayAdapter<String> formatAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, formatOptions);
          formatAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
          formatSpinner.setAdapter(formatAdapter);
          formatSpinner.setPadding(20, 10, 20, 20);
          layout.addView(formatSpinner);

          // Export method selection
          TextView methodLabel = new TextView(this);
          methodLabel.setText("Export Method:");
          methodLabel.setTextSize(16);
          methodLabel.setTextColor(COLOR_TEXT_PRIMARY);
          methodLabel.setPadding(0, 20, 0, 10);
          layout.addView(methodLabel);

          // Email button
          Button emailButton = new Button(this);
          emailButton.setText("Send via Email");
          emailButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          emailButton.setTextColor(0xFFFFFFFF);
          emailButton.setPadding(20, 15, 20, 15);
          layout.addView(emailButton);

          // Cloud storage button
          Button cloudButton = new Button(this);
          cloudButton.setText("Share to Cloud");
          cloudButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          cloudButton.setTextColor(0xFFFFFFFF);
          cloudButton.setPadding(20, 15, 20, 15);
          LinearLayout.LayoutParams cloudParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, 
              LinearLayout.LayoutParams.WRAP_CONTENT
          );
          cloudParams.setMargins(0, 10, 0, 0);
          cloudButton.setLayoutParams(cloudParams);
          layout.addView(cloudButton);

          scrollView.addView(layout);
          builder.setView(scrollView);

          // Date picker state
          final Calendar startCal = Calendar.getInstance();
          final Calendar endCal = Calendar.getInstance();
          final boolean[] startDateSet = {false};
          final boolean[] endDateSet = {false};

          // Start date picker click handler
          startDateButton.setOnClickListener(v -> {
              new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                  startCal.set(year, month, dayOfMonth);
                  startDateButton.setText("Start: " + (month + 1) + "/" + dayOfMonth + "/" + year);
                  startDateSet[0] = true;
              }, startCal.get(Calendar.YEAR), startCal.get(Calendar.MONTH), startCal.get(Calendar.DAY_OF_MONTH)).show();
          });

          // End date picker click handler
          endDateButton.setOnClickListener(v -> {
              new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                  endCal.set(year, month, dayOfMonth);
                  endDateButton.setText("End: " + (month + 1) + "/" + dayOfMonth + "/" + year);
                  endDateSet[0] = true;
              }, endCal.get(Calendar.YEAR), endCal.get(Calendar.MONTH), endCal.get(Calendar.DAY_OF_MONTH)).show();
          });

          // Export handlers
          emailButton.setOnClickListener(v -> {
              if (!startDateSet[0] || !endDateSet[0]) {
                  Toast.makeText(this, "Please select both start and end dates", Toast.LENGTH_SHORT).show();
                  return;
              }
              String selectedCategory = categorySpinner.getSelectedItem().toString();
              int formatIndex = formatSpinner.getSelectedItemPosition(); // 0=CSV, 1=TXT, 2=PDF
              exportAndEmail(startCal.getTime(), endCal.getTime(), selectedCategory, formatIndex);
          });

          cloudButton.setOnClickListener(v -> {
              if (!startDateSet[0] || !endDateSet[0]) {
                  Toast.makeText(this, "Please select both start and end dates", Toast.LENGTH_SHORT).show();
                  return;
              }
              String selectedCategory = categorySpinner.getSelectedItem().toString();
              int formatIndex = formatSpinner.getSelectedItemPosition(); // 0=CSV, 1=TXT, 2=PDF
              exportToCloud(startCal.getTime(), endCal.getTime(), selectedCategory, formatIndex);
          });

          builder.setNegativeButton("Cancel", null);
          builder.create().show();
      }

      private void exportAndEmail(Date startDate, Date endDate, String category, int formatIndex) {
          try {
              List<Trip> tripsInRange = getTripsInDateRange(startDate, endDate, category);
              if (tripsInRange.isEmpty()) {
                  String categoryText = category.equals("All Categories") ? "selected date range" : category + " trips in selected date range";
                  Toast.makeText(this, "No " + categoryText + " found", Toast.LENGTH_SHORT).show();
                  return;
              }

              String exportContent = null;
              byte[] binaryContent = null;
              String fileExtension;
              String mimeType;
              boolean isBinaryFile = false;

              switch (formatIndex) {
                  case 0: // CSV
                      exportContent = generateCSV(tripsInRange, startDate, endDate, category);
                      fileExtension = ".csv";
                      mimeType = "text/csv";
                      break;
                  case 1: // TXT
                      exportContent = generateTXT(tripsInRange, startDate, endDate, category);
                      fileExtension = ".txt";
                      mimeType = "text/plain";
                      break;
                  case 2: // PDF
                      binaryContent = generatePDF(tripsInRange, startDate, endDate, category);
                      fileExtension = ".pdf";
                      mimeType = "application/pdf";
                      isBinaryFile = true;
                      break;
                  default:
                      exportContent = generateCSV(tripsInRange, startDate, endDate, category);
                      fileExtension = ".csv";
                      mimeType = "text/csv";
                      break;
              }

              // Create temporary file
              SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
              String fileName = "MileTracker_Export_" + dateFormat.format(startDate) + "_to_" + dateFormat.format(endDate);
              if (!category.equals("All Categories")) {
                  fileName += "_" + category.replace(" ", "_");
              }
              fileName += fileExtension;

              try {
                  // Create file in external cache directory
                  File exportFile = new File(getExternalCacheDir(), fileName);

                  if (isBinaryFile) {
                      // For PDF files, write binary data
                      // Use binaryContent instead of generating PDF again
                      FileOutputStream fos = new FileOutputStream(exportFile);
                      fos.write(binaryContent);
                      fos.close();
                  } else {
                      // For text files (CSV, TXT), write as text
                      FileWriter writer = new FileWriter(exportFile);
                      writer.write(exportContent);
                      writer.close();
                  }

                  // Create URI for the file
                  Uri fileUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", exportFile);

                  String categoryFilter = category.equals("All Categories") ? "" : " (" + category + ")";

                  Intent emailIntent = new Intent(Intent.ACTION_SEND);
                  emailIntent.setType("message/rfc822"); // Force email apps instead of text apps
                  emailIntent.putExtra(Intent.EXTRA_SUBJECT, "MileTracker Pro - Trip Export" + categoryFilter + " " + 
                      new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(startDate) + " to " +
                      new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(endDate));
                  String formatDescription = "";
                  String openingInfo = "";
                  switch (formatIndex) {
                      case 0: // CSV
                          formatDescription = "CSV Spreadsheet";
                          openingInfo = "This file can be opened in Excel, Google Sheets, or any spreadsheet application.";
                          break;
                      case 1: // TXT
                          formatDescription = "Text Document";
                          openingInfo = "This file can be opened in any text editor or word processor.";
                          break;
                      case 2: // PDF
                          formatDescription = "PDF Report";
                          openingInfo = "This file can be opened in any PDF reader, printed, or shared professionally.";
                          break;
                      default:
                          formatDescription = "CSV Spreadsheet";
                          openingInfo = "This file can be opened in Excel, Google Sheets, or any spreadsheet application.";
                          break;
                  }

                  emailIntent.putExtra(Intent.EXTRA_TEXT, "Please find your MileTracker Pro trip data attached as " + fileName + ".\n\n" +
                      "Export Summary:\n" +
                      "Date Range: " + new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(startDate) + " to " + new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(endDate) + "\n" +
                      "Category: " + category + "\n" +
                      "Total Trips: " + tripsInRange.size() + "\n" +
                      "File Format: " + formatDescription + "\n\n" +
                      openingInfo + "\n\n" +
                      "Generated by MileTracker Pro");
                  emailIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                  emailIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                  // Log the export
                  String formatName = formatIndex == 0 ? "CSV" : formatIndex == 1 ? "TXT" : "PDF";
                  logExportHistory(formatName, "Email", tripsInRange.size());

                  // Try email-specific apps first, fallback to general sharing
                  try {
                      emailIntent.setPackage("com.google.android.gm"); // Try Gmail first
                      if (emailIntent.resolveActivity(getPackageManager()) != null) {
                          startActivity(emailIntent);
                      } else {
                          // Try Outlook
                          emailIntent.setPackage("com.microsoft.office.outlook");
                          if (emailIntent.resolveActivity(getPackageManager()) != null) {
                              startActivity(emailIntent);
                          } else {
                              // Fallback to any email app
                              emailIntent.setPackage(null);
                              emailIntent.setType("message/rfc822");
                              if (emailIntent.resolveActivity(getPackageManager()) != null) {
                                  startActivity(Intent.createChooser(emailIntent, "Send via email..."));
                              } else {
                                  Toast.makeText(this, "No email app available", Toast.LENGTH_SHORT).show();
                              }
                          }
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error launching email: " + e.getMessage(), e);
                      Toast.makeText(this, "Failed to open email app", Toast.LENGTH_SHORT).show();
                  }
              } catch (IOException e) {
                  Log.e(TAG, "Error creating export file: " + e.getMessage(), e);
                  Toast.makeText(this, "Failed to create export file: " + e.getMessage(), Toast.LENGTH_LONG).show();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error exporting to email: " + e.getMessage(), e);
              Toast.makeText(this, "Error exporting: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      private void exportToCloud(Date startDate, Date endDate, String category, int formatIndex) {
          try {
              List<Trip> tripsInRange = getTripsInDateRange(startDate, endDate, category);
              if (tripsInRange.isEmpty()) {
                  String categoryText = category.equals("All Categories") ? "selected date range" : category + " trips in selected date range";
                  Toast.makeText(this, "No " + categoryText + " found", Toast.LENGTH_SHORT).show();
                  return;
              }

              String exportContent = null;
              byte[] binaryContent = null;
              String fileExtension;
              String mimeType;
              boolean isBinaryFile = false;

              switch (formatIndex) {
                  case 0: // CSV
                      exportContent = generateCSV(tripsInRange, startDate, endDate, category);
                      fileExtension = ".csv";
                      mimeType = "text/csv";
                      break;
                  case 1: // TXT
                      exportContent = generateTXT(tripsInRange, startDate, endDate, category);
                      fileExtension = ".txt";
                      mimeType = "text/plain";
                      break;
                  case 2: // PDF
                      binaryContent = generatePDF(tripsInRange, startDate, endDate, category);
                      fileExtension = ".pdf";
                      mimeType = "application/pdf";
                      isBinaryFile = true;
                      break;
                  default:
                      exportContent = generateCSV(tripsInRange, startDate, endDate, category);
                      fileExtension = ".csv";
                      mimeType = "text/csv";
                      break;
              }

              // Create temporary file
              SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
              String fileName = "MileTracker_Export_" + dateFormat.format(startDate) + "_to_" + dateFormat.format(endDate);
              if (!category.equals("All Categories")) {
                  fileName += "_" + category.replace(" ", "_");
              }
              fileName += fileExtension;

              try {
                  // Create file in external cache directory
                  File exportFile = new File(getExternalCacheDir(), fileName);

                  if (isBinaryFile) {
                      // For PDF files, write binary data
                      // Use binaryContent instead of generating PDF again
                      FileOutputStream fos = new FileOutputStream(exportFile);
                      fos.write(binaryContent);
                      fos.close();
                  } else {
                      // For text files (CSV, TXT), write as text
                      FileWriter writer = new FileWriter(exportFile);
                      writer.write(exportContent);
                      writer.close();
                  }

                  // Create URI for the file
                  Uri fileUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", exportFile);

                  String categoryFilter = category.equals("All Categories") ? "" : " (" + category + ")";

                  Intent shareIntent = new Intent(Intent.ACTION_SEND);
                  shareIntent.setType(mimeType);
                  shareIntent.putExtra(Intent.EXTRA_SUBJECT, "MileTracker Pro - Trip Export" + categoryFilter);
                  shareIntent.putExtra(Intent.EXTRA_TEXT, "MileTracker Pro trip data export file attached.\n\n" +
                      "File: " + fileName + "\n" +
                      "Date Range: " + new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(startDate) + " to " + new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(endDate) + "\n" +
                      "Category: " + category + "\n" +
                      "Total Trips: " + tripsInRange.size());
                  shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                  shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                  if (shareIntent.resolveActivity(getPackageManager()) != null) {
                      // Log the export
                      String formatName = formatIndex == 0 ? "CSV" : formatIndex == 1 ? "TXT" : "PDF";
                      logExportHistory(formatName, "Cloud/Share", tripsInRange.size());
                      startActivity(Intent.createChooser(shareIntent, "Share to cloud storage..."));
                  } else {
                      Toast.makeText(this, "No sharing apps available", Toast.LENGTH_SHORT).show();
                  }
              } catch (IOException e) {
                  Log.e(TAG, "Error creating export file: " + e.getMessage(), e);
                  Toast.makeText(this, "Failed to create export file: " + e.getMessage(), Toast.LENGTH_LONG).show();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error exporting to cloud: " + e.getMessage(), e);
              Toast.makeText(this, "Error exporting: " + e.getMessage(), Toast.LENGTH_LONG).show();
          }
      }

      // Export history logging and display
      private void logExportHistory(String format, String destination, int tripCount) {
          SharedPreferences prefs = getSharedPreferences("export_history", MODE_PRIVATE);
          String history = prefs.getString("history", "");

          SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yy h:mma", Locale.getDefault());
          String entry = sdf.format(new Date()) + "|" + format + "|" + destination + "|" + tripCount;

          // Prepend new entry, keep max 5
          String[] entries = history.isEmpty() ? new String[0] : history.split("\n");
          StringBuilder newHistory = new StringBuilder(entry);
          for (int i = 0; i < Math.min(entries.length, 4); i++) {
              newHistory.append("\n").append(entries[i]);
          }

          prefs.edit().putString("history", newHistory.toString()).apply();

          // Update display if visible
          runOnUiThread(() -> updateRecentExportsDisplay());
      }

      private void updateRecentExportsDisplay() {
          if (recentExportsText == null) return;

          SharedPreferences prefs = getSharedPreferences("export_history", MODE_PRIVATE);
          String history = prefs.getString("history", "");

          if (history.isEmpty()) {
              recentExportsText.setText("No exports yet. Use the Export button above to generate reports.");
              return;
          }

          StringBuilder display = new StringBuilder();
          String[] entries = history.split("\n");
          for (int i = 0; i < entries.length; i++) {
              String[] parts = entries[i].split("\\|");
              if (parts.length >= 4) {
                  if (i > 0) display.append("\n\n");
                  display.append("• ").append(parts[0]).append("\n   ")
                         .append(parts[1]).append(" → ").append(parts[2])
                         .append(" (").append(parts[3]).append(" trips)");
              }
          }

          recentExportsText.setText(display.toString());
      }

      // Abbreviate US state names to 2-letter codes
      private String abbreviateState(String address) {
          if (address == null || address.isEmpty()) return address;

          String[][] states = {
              {"Alabama", "AL"}, {"Alaska", "AK"}, {"Arizona", "AZ"}, {"Arkansas", "AR"},
              {"California", "CA"}, {"Colorado", "CO"}, {"Connecticut", "CT"}, {"Delaware", "DE"},
              {"Florida", "FL"}, {"Georgia", "GA"}, {"Hawaii", "HI"}, {"Idaho", "ID"},
              {"Illinois", "IL"}, {"Indiana", "IN"}, {"Iowa", "IA"}, {"Kansas", "KS"},
              {"Kentucky", "KY"}, {"Louisiana", "LA"}, {"Maine", "ME"}, {"Maryland", "MD"},
              {"Massachusetts", "MA"}, {"Michigan", "MI"}, {"Minnesota", "MN"}, {"Mississippi", "MS"},
              {"Missouri", "MO"}, {"Montana", "MT"}, {"Nebraska", "NE"}, {"Nevada", "NV"},
              {"New Hampshire", "NH"}, {"New Jersey", "NJ"}, {"New Mexico", "NM"}, {"New York", "NY"},
              {"North Carolina", "NC"}, {"North Dakota", "ND"}, {"Ohio", "OH"}, {"Oklahoma", "OK"},
              {"Oregon", "OR"}, {"Pennsylvania", "PA"}, {"Rhode Island", "RI"}, {"South Carolina", "SC"},
              {"South Dakota", "SD"}, {"Tennessee", "TN"}, {"Texas", "TX"}, {"Utah", "UT"},
              {"Vermont", "VT"}, {"Virginia", "VA"}, {"Washington", "WA"}, {"West Virginia", "WV"},
              {"Wisconsin", "WI"}, {"Wyoming", "WY"}, {"District of Columbia", "DC"}
          };

          String result = address;
          for (String[] state : states) {
              if (result.contains(state[0])) {
                  result = result.replace(state[0], state[1]);
                  break;
              }
          }
          return result;
      }

      private List<Trip> getTripsInDateRange(Date startDate, Date endDate, String category) {
          List<Trip> allTrips = tripStorage.getAllTrips();
          List<Trip> filteredTrips = new ArrayList<>();

          for (Trip trip : allTrips) {
              Date tripDate = new Date(trip.getStartTime());
              if (!tripDate.before(startDate) && !tripDate.after(endDate)) {
                  // Apply category filter
                  if (category.equals("All Categories") || trip.getCategory().equals(category)) {
                      filteredTrips.add(trip);
                  }
              }
          }

          return filteredTrips;
      }

      private String generateCSV(List<Trip> trips, Date startDate, Date endDate, String category) {
          StringBuilder csv = new StringBuilder();
          SimpleDateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault());
          SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

          // Header
          csv.append("MileTracker Pro - Trip Export\n");
          csv.append("Export Date Range: ").append(dateFormat.format(startDate))
             .append(" to ").append(dateFormat.format(endDate)).append("\n");
          csv.append("Category Filter: ").append(category).append("\n");
          csv.append("Generated: ").append(dateFormat.format(new Date())).append("\n\n");

          // CSV Headers
          csv.append("Date,Start Time,End Time,Start Location,End Location,Distance (mi),Duration,Category,Client,Notes,Type\n");

          // Data rows
          double totalMiles = 0;
          for (Trip trip : trips) {
              Date tripDate = new Date(trip.getStartTime());
              Date endTime = new Date(trip.getEndTime());

              csv.append("\"").append(dateFormat.format(tripDate)).append("\",");
              csv.append("\"").append(timeFormat.format(tripDate)).append("\",");
              csv.append("\"").append(timeFormat.format(endTime)).append("\",");
              csv.append("\"").append(trip.getStartAddress() != null ? trip.getStartAddress() : "Unknown").append("\",");
              csv.append("\"").append(trip.getEndAddress() != null ? trip.getEndAddress() : "Unknown").append("\",");
              csv.append(String.format("%.2f", trip.getDistance())).append(",");
              csv.append("\"").append(trip.getFormattedDuration()).append("\",");
              csv.append("\"").append(trip.getCategory()).append("\",");
              csv.append("\"").append(trip.getClientName() != null ? trip.getClientName() : "").append("\",");
              csv.append("\"").append(trip.getNotes() != null ? trip.getNotes() : "").append("\",");
              csv.append("\"").append(trip.isAutoDetected() ? "Auto" : "Manual").append("\"\n");

              totalMiles += trip.getDistance();
          }

          // Summary
          csv.append("\nSUMMARY\n");
          csv.append("Total Trips,").append(trips.size()).append("\n");
          csv.append("Total Miles,").append(String.format("%.2f", totalMiles)).append("\n");
          csv.append("Business Deduction (IRS $").append(String.format("%.3f", getIrsBusinessRate())).append("/mi),\"$").append(String.format("%.2f", totalMiles * getIrsBusinessRate())).append("\"\n");

          return csv.toString();
      }

      private String generateTXT(List<Trip> trips, Date startDate, Date endDate, String category) {
          StringBuilder txt = new StringBuilder();
          SimpleDateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault());
          SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

          // Header
          txt.append("MileTracker Pro - Trip Export\n");
          txt.append("================================\n\n");
          txt.append("Export Date Range: ").append(dateFormat.format(startDate))
             .append(" to ").append(dateFormat.format(endDate)).append("\n");
          txt.append("Category Filter: ").append(category).append("\n");
          txt.append("Generated: ").append(dateFormat.format(new Date())).append("\n\n");

          // Trip details
          double totalMiles = 0;
          int tripNumber = 1;

          for (Trip trip : trips) {
              Date tripDate = new Date(trip.getStartTime());
              Date endTime = new Date(trip.getEndTime());

              txt.append("TRIP #").append(tripNumber++).append("\n");
              txt.append("--------\n");
              txt.append("Date: ").append(dateFormat.format(tripDate)).append("\n");
              txt.append("Time: ").append(timeFormat.format(tripDate))
                 .append(" - ").append(timeFormat.format(endTime)).append("\n");
              txt.append("From: ").append(trip.getStartAddress() != null ? trip.getStartAddress() : "Unknown").append("\n");
              txt.append("To: ").append(trip.getEndAddress() != null ? trip.getEndAddress() : "Unknown").append("\n");
              txt.append("Distance: ").append(String.format("%.2f", trip.getDistance())).append(" miles\n");
              txt.append("Duration: ").append(trip.getFormattedDuration()).append("\n");
              txt.append("Category: ").append(trip.getCategory()).append("\n");
              if (trip.getClientName() != null && !trip.getClientName().isEmpty()) {
                  txt.append("Client: ").append(trip.getClientName()).append("\n");
              }
              if (trip.getNotes() != null && !trip.getNotes().isEmpty()) {
                  txt.append("Notes: ").append(trip.getNotes()).append("\n");
              }
              txt.append("Type: ").append(trip.isAutoDetected() ? "Auto-detected" : "Manual entry").append("\n\n");

              totalMiles += trip.getDistance();
          }

          // Summary
          txt.append("SUMMARY\n");
          txt.append("=======\n");
          txt.append("Total Trips: ").append(trips.size()).append("\n");
          txt.append("Total Miles: ").append(String.format("%.2f", totalMiles)).append("\n");
          txt.append("Business Deduction (IRS $").append(String.format("%.3f", getIrsBusinessRate())).append("/mi): $").append(String.format("%.2f", totalMiles * getIrsBusinessRate())).append("\n");

          return txt.toString();
      }

      private byte[] generatePDF(List<Trip> trips, Date startDate, Date endDate, String category) {
          try {
              // Create PDF document
              android.graphics.pdf.PdfDocument document = new android.graphics.pdf.PdfDocument();
              android.graphics.pdf.PdfDocument.PageInfo pageInfo = new android.graphics.pdf.PdfDocument.PageInfo.Builder(595, 842, 1).create(); // A4 size
              android.graphics.pdf.PdfDocument.Page page = document.startPage(pageInfo);

              Canvas canvas = page.getCanvas();
              Paint paint = new Paint();
              paint.setAntiAlias(true);

              // Set up text formatting
              paint.setTextSize(16);
              paint.setColor(Color.BLACK);
              paint.setTypeface(Typeface.DEFAULT_BOLD);

              SimpleDateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault());
              SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

              // Title
              canvas.drawText("MileTracker Pro - Professional Mileage Report", 50, 50, paint);

              // Header info
              paint.setTextSize(12);
              paint.setTypeface(Typeface.DEFAULT);
              canvas.drawText("Export Date Range: " + dateFormat.format(startDate) + " to " + dateFormat.format(endDate), 50, 80, paint);
              canvas.drawText("Category Filter: " + category, 50, 100, paint);
              canvas.drawText("Generated: " + dateFormat.format(new Date()), 50, 120, paint);

              // Table headers
              paint.setTypeface(Typeface.DEFAULT_BOLD);
              paint.setTextSize(10);
              int yPosition = 160;
              canvas.drawText("Date", 40, yPosition, paint);
              canvas.drawText("Time", 100, yPosition, paint);
              canvas.drawText("From", 140, yPosition, paint);
              canvas.drawText("To", 280, yPosition, paint);
              canvas.drawText("Dist", 420, yPosition, paint);
              canvas.drawText("Cat", 460, yPosition, paint);

              // Draw line under headers
              paint.setStrokeWidth(1);
              canvas.drawLine(40, yPosition + 5, 520, yPosition + 5, paint);

              // Trip data
              paint.setTypeface(Typeface.DEFAULT);
              paint.setTextSize(9);
              yPosition += 20;
              double totalMiles = 0;

              for (Trip trip : trips) {
                  if (yPosition > 800) { // Start new page if needed
                      document.finishPage(page);
                      page = document.startPage(pageInfo);
                      canvas = page.getCanvas();
                      yPosition = 50;
                  }

                  Date tripDate = new Date(trip.getStartTime());
                  Date endTime = new Date(trip.getEndTime());

                  canvas.drawText(dateFormat.format(tripDate), 40, yPosition, paint);
                  canvas.drawText(timeFormat.format(tripDate), 100, yPosition, paint);

                  // Draw wrapped text for addresses
                  int fromLines = drawWrappedText(canvas, paint, trip.getStartAddress(), 140, yPosition, 135);
                  int toLines = drawWrappedText(canvas, paint, trip.getEndAddress(), 280, yPosition, 135);

                  canvas.drawText(String.format("%.2f", trip.getDistance()), 420, yPosition, paint);
                  canvas.drawText(trip.getCategory(), 460, yPosition, paint);

                  totalMiles += trip.getDistance();

                  // Adjust row height based on maximum lines used
                  int maxLines = Math.max(fromLines, toLines);
                  yPosition += (maxLines * 12) + 3; // Line height + small padding
              }

              // Summary section
              yPosition += 20;
              paint.setTypeface(Typeface.DEFAULT_BOLD);
              paint.setTextSize(12);
              canvas.drawText("SUMMARY", 50, yPosition, paint);

              paint.setTypeface(Typeface.DEFAULT);
              paint.setTextSize(10);
              yPosition += 20;
              canvas.drawText("Total Trips: " + trips.size(), 50, yPosition, paint);
              yPosition += 15;
              canvas.drawText("Total Miles: " + String.format("%.2f", totalMiles), 50, yPosition, paint);
              yPosition += 15;
              canvas.drawText("Business Deduction (IRS $" + String.format("%.3f", getIrsBusinessRate()) + "/mi): $" + String.format("%.2f", totalMiles * getIrsBusinessRate()), 50, yPosition, paint);

              document.finishPage(page);

              // Write PDF to byte array
              ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
              document.writeTo(outputStream);
              document.close();

              return outputStream.toByteArray();

          } catch (Exception e) {
              Log.e(TAG, "Error generating PDF", e);
              return null;
          }
      }

      private String truncateText(String text, int maxLength) {
          if (text == null || text.length() <= maxLength) {
              return text;
          }
          return text.substring(0, maxLength - 3) + "...";
      }

      private int drawWrappedText(Canvas canvas, Paint paint, String text, float x, float y, float maxWidth) {
          if (text == null || text.isEmpty()) {
              canvas.drawText("Unknown", x, y, paint);
              return 1; // Return number of lines drawn
          }

          String[] words = text.split(" ");
          StringBuilder line = new StringBuilder();
          float currentY = y;
          int linesDrawn = 0;

          for (String word : words) {
              String testLine = line.length() == 0 ? word : line + " " + word;
              float textWidth = paint.measureText(testLine);

              if (textWidth > maxWidth && line.length() > 0) {
                  canvas.drawText(line.toString(), x, currentY, paint);
                  line = new StringBuilder(word);
                  currentY += 12; // Line height
                  linesDrawn++;
              } else {
                  line = new StringBuilder(testLine);
              }
          }

          if (line.length() > 0) {
              canvas.drawText(line.toString(), x, currentY, paint);
              linesDrawn++;
          }

          return linesDrawn;
      }

      private void showSplitTripDialog(Trip trip) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Split Trip");

          // Create scrollable layout with proper sizing
          ScrollView scrollView = new ScrollView(this);
          scrollView.setLayoutParams(new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, 
              700 // Increased height for better button visibility
          ));
          scrollView.setPadding(0, 0, 0, 50); // Bottom padding for buttons

          LinearLayout layout = new LinearLayout(this);
          layout.setOrientation(LinearLayout.VERTICAL);
          layout.setPadding(30, 20, 30, 20);

          // Trip info header
          TextView tripInfo = new TextView(this);
          tripInfo.setText(String.format("Split Trip: %.1f miles\n%s → %s", 
              trip.getDistance(), trip.getStartAddress(), trip.getEndAddress()));
          tripInfo.setTextSize(14);
          tripInfo.setTextColor(COLOR_TEXT_PRIMARY);
          tripInfo.setPadding(0, 0, 0, 20);
          layout.addView(tripInfo);

          // Split method toggle
          TextView splitMethodLabel = new TextView(this);
          splitMethodLabel.setText("Split Method:");
          splitMethodLabel.setTextSize(14);
          splitMethodLabel.setTypeface(null, android.graphics.Typeface.BOLD);
          layout.addView(splitMethodLabel);

          // Radio button group for split method
          LinearLayout radioGroup = new LinearLayout(this);
          radioGroup.setOrientation(LinearLayout.HORIZONTAL);
          radioGroup.setPadding(0, 5, 0, 15);

          CheckBox percentageRadio = new CheckBox(this);
          percentageRadio.setText("Percentage");
          percentageRadio.setChecked(false);
          percentageRadio.setPadding(0, 0, 20, 0);

          CheckBox exactMilesRadio = new CheckBox(this);
          exactMilesRadio.setText("Exact Miles");
          exactMilesRadio.setChecked(true); // Default to exact miles

          radioGroup.addView(percentageRadio);
          radioGroup.addView(exactMilesRadio);
          layout.addView(radioGroup);

          // Percentage split section
          LinearLayout percentageSection = new LinearLayout(this);
          percentageSection.setOrientation(LinearLayout.VERTICAL);
          percentageSection.setVisibility(View.GONE); // Hidden by default

          SeekBar splitSlider = new SeekBar(this);
          splitSlider.setMax(80); // 20% to 100%
          splitSlider.setProgress(30); // Default 50%
          splitSlider.setPadding(0, 10, 0, 10);

          TextView splitPercentage = new TextView(this);
          splitPercentage.setText("50% split");
          splitPercentage.setTextSize(12);
          splitPercentage.setTextColor(0xFF6C757D);

          percentageSection.addView(splitSlider);
          percentageSection.addView(splitPercentage);
          layout.addView(percentageSection);

          // Exact miles section
          LinearLayout exactMilesSection = new LinearLayout(this);
          exactMilesSection.setOrientation(LinearLayout.VERTICAL);

          TextView firstMilesLabel = new TextView(this);
          firstMilesLabel.setText("First Trip Distance (miles):");
          firstMilesLabel.setTextSize(12);
          exactMilesSection.addView(firstMilesLabel);

          EditText firstMilesInput = new EditText(this);
          firstMilesInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          firstMilesInput.setHint("e.g., 25.5");
          firstMilesInput.setText(String.format("%.1f", trip.getDistance() / 2.0)); // Default to half
          exactMilesSection.addView(firstMilesInput);

          TextView secondMilesLabel = new TextView(this);
          secondMilesLabel.setText("Second Trip Distance (miles):");
          secondMilesLabel.setTextSize(12);
          secondMilesLabel.setPadding(0, 10, 0, 0);
          exactMilesSection.addView(secondMilesLabel);

          EditText secondMilesInput = new EditText(this);
          secondMilesInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
          secondMilesInput.setHint("e.g., 75.0");
          secondMilesInput.setText(String.format("%.1f", trip.getDistance() / 2.0)); // Default to half
          exactMilesSection.addView(secondMilesInput);

          TextView totalCheck = new TextView(this);
          totalCheck.setText(String.format("Total should equal: %.1f miles", trip.getDistance()));
          totalCheck.setTextSize(11);
          totalCheck.setTextColor(0xFF6C757D);
          totalCheck.setPadding(0, 5, 0, 0);
          exactMilesSection.addView(totalCheck);

          layout.addView(exactMilesSection);

          // Radio button toggle logic
          percentageRadio.setOnClickListener(v -> {
              if (percentageRadio.isChecked()) {
                  exactMilesRadio.setChecked(false);
                  percentageSection.setVisibility(View.VISIBLE);
                  exactMilesSection.setVisibility(View.GONE);
              }
          });

          exactMilesRadio.setOnClickListener(v -> {
              if (exactMilesRadio.isChecked()) {
                  percentageRadio.setChecked(false);
                  percentageSection.setVisibility(View.GONE);
                  exactMilesSection.setVisibility(View.VISIBLE);
              }
          });

          // Update percentage display
          splitSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
              @Override
              public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                  int percentage = progress + 20; // 20% to 100%
                  splitPercentage.setText(percentage + "% split");
              }

              @Override
              public void onStartTrackingTouch(SeekBar seekBar) {}

              @Override
              public void onStopTrackingTouch(SeekBar seekBar) {}
          });

          // Intermediate location
          TextView intermediateLabelx = new TextView(this);
          intermediateLabelx.setText("Intermediate Stop Location:");
          intermediateLabelx.setTextSize(14);
          intermediateLabelx.setTypeface(null, android.graphics.Typeface.BOLD);
          intermediateLabelx.setPadding(0, 20, 0, 5);
          layout.addView(intermediateLabelx);

          EditText intermediateLocation = new EditText(this);
          intermediateLocation.setHint("Gas station, restaurant, etc.");
          intermediateLocation.setText("Intermediate Stop");
          layout.addView(intermediateLocation);

          // Categories for each trip part
          TextView categoriesLabel = new TextView(this);
          categoriesLabel.setText("Categories for Split Trips:");
          categoriesLabel.setTextSize(14);
          categoriesLabel.setTypeface(null, android.graphics.Typeface.BOLD);
          categoriesLabel.setPadding(0, 20, 0, 10);
          layout.addView(categoriesLabel);

          // First trip category
          TextView firstLabel = new TextView(this);
          firstLabel.setText("First Trip Category:");
          firstLabel.setTextSize(12);
          layout.addView(firstLabel);

          Spinner firstCategorySpinner = new Spinner(this);
          List<String> allCategories = new ArrayList<>();
          allCategories.add("Uncategorized");
          allCategories.addAll(tripStorage.getAllCategories());
          String[] categories = allCategories.toArray(new String[0]);
          ArrayAdapter<String> categoryAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, categories);
          categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
          firstCategorySpinner.setAdapter(categoryAdapter);

          // Set current category as default
          String currentCategory = trip.getCategory();
          for (int i = 0; i < categories.length; i++) {
              if (categories[i].equals(currentCategory)) {
                  firstCategorySpinner.setSelection(i);
                  break;
              }
          }
          layout.addView(firstCategorySpinner);

          // Second trip category
          TextView secondLabel = new TextView(this);
          secondLabel.setText("Second Trip Category:");
          secondLabel.setTextSize(12);
          secondLabel.setPadding(0, 10, 0, 0);
          layout.addView(secondLabel);

          Spinner secondCategorySpinner = new Spinner(this);
          secondCategorySpinner.setAdapter(categoryAdapter);
          for (int i = 0; i < categories.length; i++) {
              if (categories[i].equals(currentCategory)) {
                  secondCategorySpinner.setSelection(i);
                  break;
              }
          }
          layout.addView(secondCategorySpinner);

          scrollView.addView(layout);
          builder.setView(scrollView);

          builder.setPositiveButton("Split Trip", (dialog, which) -> {
              try {
                  double firstDistance, secondDistance;
                  long firstDuration, secondDuration;

                  if (exactMilesRadio.isChecked()) {
                      // Use exact miles input
                      try {
                          firstDistance = Double.parseDouble(firstMilesInput.getText().toString());
                          secondDistance = Double.parseDouble(secondMilesInput.getText().toString());

                          // Validate totals match approximately
                          double totalInput = firstDistance + secondDistance;
                          if (Math.abs(totalInput - trip.getDistance()) > 0.1) {
                              Toast.makeText(this, "Split distances don't match total: " + 
                                  String.format("%.1f + %.1f = %.1f (should be %.1f)", 
                                  firstDistance, secondDistance, totalInput, trip.getDistance()), 
                                  Toast.LENGTH_LONG).show();
                              return;
                          }

                          // Calculate proportional durations
                          double firstPercent = firstDistance / trip.getDistance();
                          firstDuration = (long)(trip.getDuration() * firstPercent);
                          secondDuration = trip.getDuration() - firstDuration;

                      } catch (NumberFormatException e) {
                          Toast.makeText(this, "Please enter valid numbers for distances", Toast.LENGTH_SHORT).show();
                          return;
                      }
                  } else {
                      // Use percentage slider
                      int splitPercent = splitSlider.getProgress() + 20;
                      firstDistance = (trip.getDistance() * splitPercent) / 100.0;
                      secondDistance = trip.getDistance() - firstDistance;

                      firstDuration = (trip.getDuration() * splitPercent) / 100;
                      secondDuration = trip.getDuration() - firstDuration;
                  }

                  String intermediateStop = intermediateLocation.getText().toString().trim();
                  if (intermediateStop.isEmpty()) {
                      intermediateStop = "Intermediate Stop";
                  }

                  // Create first trip
                  Trip firstTrip = new Trip();
                  firstTrip.setId(System.currentTimeMillis());
                  firstTrip.setStartAddress(trip.getStartAddress());
                  firstTrip.setEndAddress(intermediateStop);
                  firstTrip.setStartLatitude(trip.getStartLatitude());
                  firstTrip.setStartLongitude(trip.getStartLongitude());
                  firstTrip.setEndLatitude(trip.getEndLatitude()); // Will be updated with intermediate coords
                  firstTrip.setEndLongitude(trip.getEndLongitude());
                  firstTrip.setDistance(firstDistance);
                  firstTrip.setDuration(firstDuration);
                  firstTrip.setStartTime(trip.getStartTime());
                  firstTrip.setEndTime(trip.getStartTime() + firstDuration);
                  firstTrip.setCategory(firstCategorySpinner.getSelectedItem().toString());
                  firstTrip.setAutoDetected(false);
                  firstTrip.setAutoDetected(false); // Fix labeling bug - manual trips
                  firstTrip.setClientName(trip.getClientName());
                  firstTrip.setNotes("Split from original trip - First part");

                  // Create second trip  
                  Trip secondTrip = new Trip();
                  secondTrip.setId(System.currentTimeMillis() + 1);
                  secondTrip.setStartAddress(intermediateStop);
                  secondTrip.setEndAddress(trip.getEndAddress());
                  secondTrip.setStartLatitude(trip.getEndLatitude()); // Will be updated with intermediate coords
                  secondTrip.setStartLongitude(trip.getEndLongitude());
                  secondTrip.setEndLatitude(trip.getEndLatitude());
                  secondTrip.setEndLongitude(trip.getEndLongitude());
                  secondTrip.setDistance(secondDistance);
                  secondTrip.setDuration(secondDuration);
                  secondTrip.setStartTime(trip.getStartTime() + firstDuration);
                  secondTrip.setEndTime(trip.getEndTime());
                  secondTrip.setCategory(secondCategorySpinner.getSelectedItem().toString());
                  secondTrip.setAutoDetected(false);
                  secondTrip.setAutoDetected(false); // Fix labeling bug - manual trips
                  secondTrip.setClientName(trip.getClientName());
                  secondTrip.setNotes("Split from original trip - Second part");

                  // Delete original trip and save new ones
                  tripStorage.deleteTrip(trip.getId());
                  tripStorage.saveTrip(firstTrip);
                  tripStorage.saveTrip(secondTrip);

                  // Backup to API if enabled
                  if (tripStorage.isApiSyncEnabled()) {
                      try {
                          CloudBackupService cloudService = new CloudBackupService(MainActivity.this);
                          cloudService.backupTrip(firstTrip);
                          cloudService.backupTrip(secondTrip);
                      } catch (Exception e) {
                          Log.e(TAG, "API backup failed for split trips: " + e.getMessage());
                      }
                  }

                  // Refresh display
                  updateRecentTrips();
                  updateAllTrips();
                  updateStats();


              } catch (Exception e) {
                  Log.e(TAG, "Error splitting trip: " + e.getMessage(), e);
                  Toast.makeText(this, "Error splitting trip", Toast.LENGTH_SHORT).show();
              }
          });

          builder.setNegativeButton("Cancel", null);

          AlertDialog splitDialog = builder.create();
          splitDialog.show();
      }

      // Initialize gesture detector for swipe classification
      private void initializeGestureDetector() {
          gestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
              @Override
              public boolean onDown(MotionEvent e) {
                  Log.d(TAG, "Gesture detector onDown called");
                  return true;
              }

              @Override
              public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
                  Log.d(TAG, "Gesture detector onFling called");
                  try {
                      if (currentSwipeTrip == null || currentSwipeView == null) {
                          Log.d(TAG, "Swipe ignored - no current trip or view");
                          return false;
                      }

                      if (swipeInProgress) {
                          Log.d(TAG, "Swipe ignored - already in progress");
                          return false;
                      }

                      float deltaX = e2.getX() - e1.getX();
                      float deltaY = e2.getY() - e1.getY();

                      Log.d(TAG, "Swipe detected - deltaX: " + deltaX + ", deltaY: " + deltaY + ", velocityX: " + velocityX);

                      // ULTRA-SENSITIVE swipe detection - minimal thresholds, no velocity requirement
                      if (Math.abs(deltaX) > 3 && Math.abs(deltaX) > Math.abs(deltaY) * 0.1) {
                          swipeInProgress = true;

                          if (deltaX > 0) {
                              // Right swipe - Business
                              Log.d(TAG, "Right swipe detected - Business");
                              performSwipeClassification(currentSwipeTrip, "Business", 0xFFC7D9F2);
                          } else {
                              // Left swipe - Personal
                              Log.d(TAG, "Left swipe detected - Personal");
                              performSwipeClassification(currentSwipeTrip, "Personal", 0xFFD4E7D7);
                          }

                          return true;
                      } else {
                          Log.d(TAG, "Swipe requirements not met - deltaX: " + deltaX + ", deltaY: " + deltaY);
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error handling swipe gesture: " + e.getMessage());
                  }
                  return false;
              }
          });
          Log.d(TAG, "Gesture detector initialized successfully");
      }

      // Perform swipe classification with enhanced off-screen animation
      private void performSwipeClassification(Trip trip, String newCategory, int color) {
          try {
              Log.d(TAG, "Performing enhanced swipe classification to: " + newCategory);

              // Flash the new category color first on the container's background
              GradientDrawable flashBorder = new GradientDrawable();
              flashBorder.setColor(color);
              flashBorder.setStroke(2, 0xFFd0d0d0);
              flashBorder.setCornerRadius(8);
              currentSwipeView.setBackground(flashBorder);
              Log.d(TAG, "Container background flashed to: " + Integer.toHexString(color));

              // ENHANCED ANIMATION: Move item off-screen like typical swipe-to-dismiss
              float screenWidth = getResources().getDisplayMetrics().widthPixels;
              float targetX = newCategory.equals("Business") ? screenWidth : -screenWidth;

              // Create pronounced slide-out animation with proper container cleanup
              currentSwipeView.animate()
                  .translationX(targetX)
                  .alpha(0.1f)
                  .setDuration(400)
                  .setListener(new android.animation.AnimatorListenerAdapter() {
                      @Override
                      public void onAnimationEnd(android.animation.Animator animation) {
                          try {
                              // IMMEDIATE CONTAINER CLEANUP - Hide the view completely
                              currentSwipeView.setVisibility(android.view.View.GONE);

                              // Update trip category
                              String oldCategory = trip.getCategory();
                              trip.setCategory(newCategory);
                              tripStorage.saveTrip(trip);
                              EventTracker.trackTripCategorized(MainActivity.this, newCategory);
                              Log.d(TAG, "Trip category updated from " + oldCategory + " to " + newCategory);

                              // Auto-classification learning - apply to similar uncategorized trips
                              performLocationBasedLearning(trip, newCategory);

                              // Backup to API if enabled
                              if (tripStorage.isApiSyncEnabled()) {
                                  CloudBackupService cloudService = new CloudBackupService(MainActivity.this);
                                  cloudService.backupTrip(trip);
                                  Log.d(TAG, "Trip backed up to API");
                              }

                              // Show success message indicating movement to Filed Trips
                              String message = String.format("✓ Moved to %s → Filed Trips", newCategory);
                              Log.d(TAG, "Success toast shown: " + message);

                              // Clear swipe state
                              swipeInProgress = false;
                              currentSwipeTrip = null;
                              currentSwipeView = null;

                              // Refresh display to completely remove the swiped item and clean up containers
                              if ("classify".equals(currentTab)) {
                                  updateClassifyTrips();
                              } else if ("trips".equals(currentTab) || "categorized".equals(currentTab)) {
                                  updateCategorizedTrips();
                              } else if ("home".equals(currentTab)) {
                                  updateRecentTrips();
                              } else {
                                  updateAllTrips();
                              }
                              updateStats();
                              Log.d(TAG, "Enhanced swipe classification completed with complete container cleanup");
                          } catch (Exception e) {
                              Log.e(TAG, "Error in swipe animation completion: " + e.getMessage());
                          }
                      }
                  })
                  .start();

          } catch (Exception e) {
              Log.e(TAG, "Error performing enhanced swipe classification: " + e.getMessage());
              Toast.makeText(this, "Error updating trip category", Toast.LENGTH_SHORT).show();
              swipeInProgress = false;
          }
      }

      // Get persistent background color for category
      private int getPersistentCategoryColor(String category) {
          switch (category.toLowerCase()) {
              case "business":
                  return isDarkTheme ? 0xFF3B5998 : 0xFFC7D9F2; // Navy blue background
              case "personal":
                  return isDarkTheme ? 0xFF2D5016 : 0xFFD4E7D7; // Soft sage green background
              case "medical":
                  return isDarkTheme ? 0xFF4A4A4A : 0xFFE8ECEF; // Light gray background
              case "charity":
                  return isDarkTheme ? 0xFF8B3A3A : 0xFFF3D6D6; // Soft red background
              case "uncategorized":
                  return COLOR_CARD_BG; // Theme-aware background for uncategorized
              default:
                  return COLOR_CARD_BG; // Theme-aware background
          }
      }

      // LEARNING SYSTEM: Auto-classify similar uncategorized trips after user establishes patterns
      private void performLocationBasedLearning(Trip trip, String category) {
          try {
              // Get all uncategorized trips to check for similar locations
              List<Trip> uncategorizedTrips = tripStorage.getAllTrips();
              List<Trip> similarTrips = new ArrayList<>();

              String startLocationKey = normalizeLocationForClassification(trip.getStartAddress());
              String endLocationKey = normalizeLocationForClassification(trip.getEndAddress());

              for (Trip uncategorizedTrip : uncategorizedTrips) {
                  if (uncategorizedTrip.getId() == trip.getId()) continue; // Skip current trip
                  if (!"Uncategorized".equals(uncategorizedTrip.getCategory())) continue; // Only process uncategorized trips

                  String uncategorizedStartKey = normalizeLocationForClassification(uncategorizedTrip.getStartAddress());
                  String uncategorizedEndKey = normalizeLocationForClassification(uncategorizedTrip.getEndAddress());

                  // Check if this uncategorized trip matches the location pattern
                  if (startLocationKey.equals(uncategorizedStartKey) || endLocationKey.equals(uncategorizedEndKey)) {
                      similarTrips.add(uncategorizedTrip);
                  }
              }

              // Auto-classify similar trips
              if (!similarTrips.isEmpty()) {
                  for (Trip similarTrip : similarTrips) {
                      similarTrip.setCategory(category);
                      tripStorage.saveTrip(similarTrip);
                  }

                  // Notify user about auto-classifications
                  String message = "Auto-classified " + similarTrips.size() + " similar trip" + (similarTrips.size() == 1 ? "" : "s") + " as " + category;

                  Log.d(TAG, "Auto-classified " + similarTrips.size() + " similar trips as " + category);

                  // Refresh the view to show auto-classified trips
                  if ("trips".equals(currentTab) || "categorized".equals(currentTab)) {
                      updateCategorizedTrips();
                  } else if ("home".equals(currentTab)) {
                      updateRecentTrips();
                  }
              }

          } catch (Exception e) {
              Log.e(TAG, "Error in location-based learning: " + e.getMessage(), e);
          }
      }

      // Normalize location strings for consistent matching
      private String normalizeLocationForClassification(String location) {
          if (location == null || location.trim().isEmpty()) return "";

          // Normalize location string for consistent matching
          String normalized = location.toLowerCase().trim();

          // Remove common prefixes/suffixes that vary
          normalized = normalized.replaceAll("^\\d+\\s*", ""); // Remove leading numbers
          normalized = normalized.replaceAll("\\s*,.*$", ""); // Remove everything after first comma
          normalized = normalized.replaceAll("\\s+", " "); // Normalize whitespace

          // Handle common location patterns
          if (normalized.contains("home") || normalized.contains("house") || normalized.contains("residence")) {
              return "home";
          }

          // Business location keywords
          if (normalized.contains("office") || normalized.contains("corp") || normalized.contains("company") || 
              normalized.contains("business") || normalized.contains("workplace") || normalized.contains("work")) {
              return "business_location";
          }

          // Medical location keywords
          if (normalized.contains("hospital") || normalized.contains("clinic") || normalized.contains("medical") || 
              normalized.contains("doctor") || normalized.contains("dentist") || normalized.contains("pharmacy")) {
              return "medical_location";
          }

          // Return first meaningful part of address for matching
          String[] parts = normalized.split(" ");
          return parts.length > 0 ? parts[0] : normalized;
      }

      // Simplify address for classification matching
      private String simplifyAddress(String address) {
          if (address == null) return "";

          // Extract key location identifiers
          String simplified = address.toLowerCase()
              .replaceAll("\\d+", "") // Remove numbers
              .replaceAll("[^a-z\\s]", "") // Remove special characters
              .replaceAll("\\s+", " ") // Normalize spaces
              .trim();

          // Take first 3 words for location matching
          String[] words = simplified.split("\\s+");
          StringBuilder result = new StringBuilder();
          for (int i = 0; i < Math.min(3, words.length); i++) {
              if (i > 0) result.append(" ");
              result.append(words[i]);
          }

          return result.toString();
      }

      // Get auto-classification suggestion for a location
      private String getAutoClassificationSuggestion(String address) {
          try {
              if (address == null || address.isEmpty()) return null;

              String key = "location_" + simplifyAddress(address);
              int count = locationPrefs.getInt(key + "_count", 0);

              // Only suggest if location has been visited 2+ times
              if (count >= 2) {
                  return locationPrefs.getString(key + "_category", null);
              }

              // Check for common business indicators
              String lowerAddress = address.toLowerCase();
              if (lowerAddress.contains("office") || lowerAddress.contains("corp") ||
                  lowerAddress.contains("company") || lowerAddress.contains("business") ||
                  lowerAddress.contains("suite") || lowerAddress.contains("building")) {
                  return "Business";
              }

              // Check for medical indicators
              if (lowerAddress.contains("hospital") || lowerAddress.contains("clinic") ||
                  lowerAddress.contains("medical") || lowerAddress.contains("doctor") ||
                  lowerAddress.contains("pharmacy")) {
                  return "Medical";
              }

              return null;
          } catch (Exception e) {
              Log.e(TAG, "Error getting auto-classification: " + e.getMessage());
              return null;
          }
      }

      // Reset all trips to Uncategorized
      private void resetAllTripsToUncategorized() {
          try {
              List<Trip> allTrips = tripStorage.getAllTrips();
              int resetCount = 0;

              for (Trip trip : allTrips) {
                  if (!"Uncategorized".equals(trip.getCategory())) {
                      trip.setCategory("Uncategorized");
                      tripStorage.saveTrip(trip);
                      resetCount++;
                  }
              }

              // Sync to API if enabled
              if (tripStorage.isApiSyncEnabled()) {
                  CloudBackupService cloudService = new CloudBackupService(this);
                  for (Trip trip : allTrips) {
                      cloudService.backupTrip(trip);
                  }
              }

              Log.d(TAG, "Reset " + resetCount + " trips to Uncategorized");

              // Refresh display
              updateAllTrips();
              updateStats();

          } catch (Exception e) {
              Log.e(TAG, "Error resetting trips: " + e.getMessage(), e);
              Toast.makeText(this, "Error resetting trips", Toast.LENGTH_SHORT).show();
          }
      }

      // Helper methods for vehicle detection
      private boolean isVehicleDevice(String deviceName) {
          if (deviceName == null) return false;

          String lowerName = deviceName.toLowerCase();
          return lowerName.contains("uconnect") || lowerName.contains("sync") || 
                 lowerName.contains("carplay") || lowerName.contains("android auto") ||
                 lowerName.contains("infotainment") || lowerName.contains("multimedia") ||
                 lowerName.contains("car") || lowerName.contains("vehicle") ||
                 lowerName.contains("honda") || lowerName.contains("toyota") ||
                 lowerName.contains("ford") || lowerName.contains("chevy") ||
                 lowerName.contains("bmw") || lowerName.contains("audi") ||
                 lowerName.contains("mercedes") || lowerName.contains("benz") ||
                 lowerName.contains("lexus") || lowerName.contains("acura") ||
                 lowerName.contains("nissan") || lowerName.contains("infiniti") ||
                 lowerName.contains("hyundai") || lowerName.contains("kia") ||
                 lowerName.contains("mazda") || lowerName.contains("subaru") ||
                 lowerName.contains("volkswagen") || lowerName.contains("vw") ||
                 lowerName.contains("jeep") || lowerName.contains("chrysler") ||
                 lowerName.contains("dodge") || lowerName.contains("ram") ||
                 lowerName.contains("cadillac") || lowerName.contains("buick") ||
                 lowerName.contains("gmc") || lowerName.contains("lincoln") ||
                 lowerName.contains("volvo") || lowerName.contains("tesla") ||
                 lowerName.contains("prius") || lowerName.contains("camry") ||
                 lowerName.contains("corolla") || lowerName.contains("accord") ||
                 lowerName.contains("civic") || lowerName.contains("pilot") ||
                 lowerName.contains("cr-v") || lowerName.contains("rav4") ||
                 lowerName.contains("highlander") || lowerName.contains("4runner") ||
                 lowerName.contains("tacoma") || lowerName.contains("tundra") ||
                 lowerName.contains("f-150") || lowerName.contains("silverado") ||
                 lowerName.contains("sierra") || lowerName.contains("tahoe") ||
                 lowerName.contains("suburban") || lowerName.contains("yukon") ||
                 lowerName.contains("escalade") || lowerName.contains("navigator") ||
                 lowerName.contains("expedition") || lowerName.contains("explorer") ||
                 lowerName.contains("edge") || lowerName.contains("escape") ||
                 lowerName.contains("focus") || lowerName.contains("fusion") ||
                 lowerName.contains("mustang") || lowerName.contains("wrangler") ||
                 lowerName.contains("grand cherokee") || lowerName.contains("compass") ||
                 lowerName.contains("patriot") || lowerName.contains("renegade") ||
                 lowerName.contains("cherokee") || lowerName.contains("durango") ||
                 lowerName.contains("charger") || lowerName.contains("challenger") ||
                 lowerName.contains("300") || lowerName.contains("pacifica") ||
                 lowerName.contains("audio") || lowerName.contains("stereo") ||
                 lowerName.contains("radio") || lowerName.contains("head unit") ||
                 lowerName.contains("handsfree") || lowerName.contains("hands-free") ||
                 lowerName.contains("bluetooth") || lowerName.contains("bt") ||
                 lowerName.contains("mercedes") || lowerName.contains("lexus") ||
                 lowerName.contains("acura") || lowerName.contains("infiniti") ||
                 lowerName.contains("cadillac") || lowerName.contains("buick") ||
                 lowerName.contains("gmc") || lowerName.contains("jeep") ||
                 lowerName.contains("dodge") || lowerName.contains("ram") ||
                 lowerName.contains("chrysler") || lowerName.contains("subaru") ||
                 lowerName.contains("mazda") || lowerName.contains("nissan") ||
                 lowerName.contains("hyundai") || lowerName.contains("kia") ||
                 lowerName.contains("volvo") || lowerName.contains("volkswagen") ||
                 lowerName.contains("tesla") || lowerName.contains("porsche");
      }

      private boolean isVehicleAlreadyRegistered(String deviceAddress) {
          try {
              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String vehiclesJson = prefs.getString("vehicle_registry", "{}");

              if (vehiclesJson.equals("{}")) {
                  return false;
              }

              org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
              return vehiclesObject.has(deviceAddress);

          } catch (Exception e) {
              return false;
          }
      }

      private void requestNotificationPermission() {
          try {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                  // Android 13+ requires runtime permission
                  if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
                  }
              } else {
                  // For older versions, direct user to settings
                  showNotificationPermissionDialog();
              }
          } catch (Exception e) {
              Log.e(TAG, "Error requesting notification permission: " + e.getMessage());
          }
      }

      private void showNotificationPermissionDialog() {
          new AlertDialog.Builder(this)
              .setTitle("Enable Notifications")
              .setMessage("MileTracker Pro needs notification permission to show vehicle registration debugging information.\n\nPlease enable notifications in Settings > Apps > MileTracker Pro > Notifications")
              .setPositiveButton("Open Settings", (dialog, which) -> {
                  try {
                      Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                      intent.setData(Uri.parse("package:" + getPackageName()));
                      startActivity(intent);
                  } catch (Exception e) {
                  }
              })
              .setNegativeButton("Use Toast Messages", (dialog, which) -> {
              })
              .show();
      }

      // Fallback method if BluetoothVehicleService fails to start
      private void startBuiltInBluetoothDiscovery() {
          try {
              if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                  startPeriodicBluetoothScan();
              } else {
              }
          } catch (Exception e) {
          }
      }

      // Core Bluetooth connection checking method from BluetoothVehicleService
      private void checkBluetoothConnections() {
          Log.d(TAG, "Checking Bluetooth connections");

          if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
              Log.d(TAG, "Bluetooth not available or disabled");
              return;
          }

          Set<BluetoothDevice> bondedDevices = bluetoothAdapter.getBondedDevices();
          Log.d(TAG, "Found " + bondedDevices.size() + " bonded devices");

          for (BluetoothDevice device : bondedDevices) {
              String deviceName = device.getName();
              String macAddress = device.getAddress();

              Log.d(TAG, "Checking device: " + deviceName + " (" + macAddress + ")");

              // UConnect debug logging
              if (deviceName != null && deviceName.toLowerCase().contains("uconnect")) {
                  Log.d(TAG, "UCONNECT DEVICE FOUND: " + deviceName + " (" + macAddress + ")");
              }

              SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
              String registryJson = prefs.getString("vehicle_registry", "{}");

              try {
                  org.json.JSONObject registry = new org.json.JSONObject(registryJson);

                  if (registry.has(macAddress)) {
                      // Handle registered vehicles
                      try {
                          boolean isConnected = (boolean) device.getClass().getMethod("isConnected").invoke(device);
                          Log.d(TAG, "Registered vehicle " + deviceName + " connected: " + isConnected);

                          if (isConnected) {
                              handleVehicleConnected(device, registry.getJSONObject(macAddress));
                          }
                      } catch (Exception e) {
                          Log.d(TAG, "Could not check connection status for registered vehicle");
                      }
                  } else {
                      // Handle potential new vehicles
                      if (deviceName != null && isLikelyVehicleDevice(device)) {
                          Log.d(TAG, "Found potential new vehicle: " + deviceName);

                          try {
                              boolean isConnected = (boolean) device.getClass().getMethod("isConnected").invoke(device);
                              Log.d(TAG, "New vehicle " + deviceName + " connected: " + isConnected);

                              if (isConnected) {
                                  Log.d(TAG, "New vehicle device connected and bonded: " + deviceName);
                                  showVehicleRegistrationDialog(deviceName, macAddress);
                              }
                          } catch (Exception e) {
                              Log.d(TAG, "Could not check connection status for new vehicle, treating as connected");
                              // If we can't check connection status, assume it's connected since it's bonded
                              showVehicleRegistrationDialog(deviceName, macAddress);
                          }
                      } else {
                          Log.d(TAG, "Non-vehicle device ignored: " + deviceName);
                      }
                  }
              } catch (Exception e) {
                  Log.e(TAG, "Error processing vehicle registry: " + e.getMessage());
              }
          }
      }

      // Vehicle connection handler
      private void handleVehicleConnected(BluetoothDevice device, org.json.JSONObject vehicleInfo) {
          try {
              String deviceName = vehicleInfo.getString("deviceName");
              String vehicleType = vehicleInfo.getString("vehicleType");

              Log.d(TAG, "Vehicle connected: " + deviceName + " (" + vehicleType + ")");

              // Update UI to show connected vehicle
              runOnUiThread(() -> {
                  if (connectedVehicleText != null) {
                      connectedVehicleText.setText("Vehicle: " + deviceName + " (" + vehicleType + ")");
                      connectedVehicleText.setBackgroundColor(Color.parseColor("#E8F5E8"));
                  }
              });

              // Start auto detection if enabled
              if (autoDetectionEnabled) {
                  startBluetoothTriggeredAutoDetection(deviceName, vehicleType);
              }

          } catch (Exception e) {
              Log.e(TAG, "Error handling vehicle connection: " + e.getMessage());
          }
      }

      // Start auto detection when vehicle connects
      private void startBluetoothTriggeredAutoDetection(String vehicleName, String vehicleType) {
          try {
              Log.d(TAG, "Starting Bluetooth-triggered auto detection for: " + vehicleName);

              Intent serviceIntent = new Intent(this, AutoDetectionService.class);
              serviceIntent.setAction("START_AUTO_DETECTION");
              serviceIntent.putExtra("trigger_source", "bluetooth_vehicle");
              serviceIntent.putExtra("vehicle_name", vehicleName);
              serviceIntent.putExtra("vehicle_type", vehicleType);
              serviceIntent.putExtra("bluetooth_triggered", true);

              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                  startForegroundService(serviceIntent);
              } else {
                  startService(serviceIntent);
              }


          } catch (Exception e) {
              Log.e(TAG, "Error starting Bluetooth-triggered auto detection: " + e.getMessage());
          }
      }

      // Enhanced periodic scanning with connection checking
      private void startPeriodicBluetoothConnectionCheck() {
          Handler handler = new Handler(Looper.getMainLooper());
          Runnable scanRunnable = new Runnable() {
              @Override
              public void run() {
                  if (autoDetectionEnabled) {
                      checkBluetoothConnections();
                      handler.postDelayed(this, 30000); // Check every 30 seconds
                  }
              }
          };
          handler.post(scanRunnable);
      }

      // Vehicle device detection method from BluetoothVehicleService
      private boolean isLikelyVehicleDevice(BluetoothDevice device) {
          if (device == null) return false;

          // PRIMARY METHOD: Check Bluetooth device class for car audio
          if (device.getBluetoothClass() != null) {
              int deviceClass = device.getBluetoothClass().getDeviceClass();
              Log.d(TAG, "Device class for " + device.getName() + ": " + deviceClass);

              // Check for car audio device class
              if (deviceClass == android.bluetooth.BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO) {
                  Log.d(TAG, "Device " + device.getName() + " identified as car audio via device class");
                  return true;
              }
          }

          // SECONDARY METHOD: Check device name for vehicle indicators
          String deviceName = device.getName();
          if (deviceName != null) {
              deviceName = deviceName.toLowerCase();

              // Direct UConnect check (highest priority)
              if (deviceName.contains("uconnect")) {
                  Log.d(TAG, "Device " + device.getName() + " identified as UConnect vehicle system");
                  return true;
              }

              // Other vehicle system names
              String[] vehicleIndicators = {
                  "car", "ford", "chevy", "toyota", "honda", "nissan", "hyundai", "kia", "mazda", 
                  "subaru", "volkswagen", "audi", "bmw", "mercedes", "lexus", "acura", "infiniti",
                  "cadillac", "buick", "gmc", "chrysler", "jeep", "dodge", "ram", "lincoln",
                  "volvo", "jaguar", "land rover", "porsche", "maserati", "ferrari", "lamborghini",
                  "bentley", "rolls-royce", "tesla", "rivian", "lucid", "polestar", "genesis",
                  "sync", "entune", "infotainment", "carplay", "android auto", "harman", "bose",
                  "premium audio", "navigation", "gps", "radio", "stereo", "audio system"
              };

              for (String indicator : vehicleIndicators) {
                  if (deviceName.contains(indicator)) {
                      Log.d(TAG, "Device " + device.getName() + " identified as vehicle via name: " + indicator);
                      return true;
                  }
              }
          }

          Log.d(TAG, "Device " + device.getName() + " does not appear to be a vehicle");
          return false;
      }

      // Battery optimization check for reliable GPS tracking
      private void checkBatteryOptimization() {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
              PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
              if (pm != null) {
                  boolean isOptimizationDisabled = pm.isIgnoringBatteryOptimizations(getPackageName());

                  if (isOptimizationDisabled) {
                      // Battery optimization is disabled - dismiss dialog if showing
                      if (batteryOptimizationDialog != null && batteryOptimizationDialog.isShowing()) {
                          batteryOptimizationDialog.dismiss();
                          batteryOptimizationDialog = null;
                          Toast.makeText(this, "Battery optimization disabled - GPS tracking will work reliably!", Toast.LENGTH_SHORT).show();
                      }
                  } else {
                      // Battery optimization is still enabled - show dialog if not already showing
                      showBatteryOptimizationDialog();
                  }
              }
          }
      }

      private void showBatteryOptimizationDialog() {
          // Don't show if already showing
          if (batteryOptimizationDialog != null && batteryOptimizationDialog.isShowing()) {
              return;
          }

          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Important: Battery Optimization")
                 .setMessage("For accurate trip tracking, please disable battery optimization:\n\n" +
                            "1. Find 'MileTracker Pro' in the list\n" +
                            "2. Select it\n" +
                            "3. Choose 'Don't optimize' or 'Unrestricted'\n\n" +
                            "This prevents Android from stopping GPS tracking.")
                 .setPositiveButton("Open Settings", (dialog, which) -> {
                     try {
                         Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                         startActivity(intent);
                     } catch (Exception e) {
                     }
                 })
                 .setNegativeButton("Later", (dialog, which) -> {
                     batteryOptimizationDialog = null;
                 })
                 .setCancelable(true)
                 .setOnDismissListener(dialog -> {
                     batteryOptimizationDialog = null;
                 });

          batteryOptimizationDialog = builder.create();
          batteryOptimizationDialog.show();
      }

      // Welcome and authentication screen for first-time users and logged-out users
      private void showWelcomeScreen(UserAuthManager authManager) {
          // Wrap in ScrollView so content is visible on smaller screens
          ScrollView scrollView = new ScrollView(this);
          scrollView.setBackgroundColor(0xFFFFFFFF);
          scrollView.setFillViewport(true);

          LinearLayout welcomeLayout = new LinearLayout(this);
          welcomeLayout.setOrientation(LinearLayout.VERTICAL);
          welcomeLayout.setBackgroundColor(0xFFFFFFFF);
          welcomeLayout.setPadding(40, 60, 40, 40);
          welcomeLayout.setGravity(Gravity.CENTER);

          // App Logo/Title
          TextView logoText = new TextView(this);
          logoText.setText("MileTracker Pro");
          logoText.setTextSize(32);
          logoText.setTextColor(COLOR_PRIMARY);
          logoText.setTypeface(null, Typeface.BOLD);
          logoText.setGravity(Gravity.CENTER);
          logoText.setPadding(0, 0, 0, 20);
          welcomeLayout.addView(logoText);

          // Welcome Message
          TextView welcomeMessage = new TextView(this);
          welcomeMessage.setText("Professional Mileage Tracking\n\nAutomatically track your trips, categorize for taxes, and export reports.\n\nYour data syncs across all your devices.");
          welcomeMessage.setTextSize(16);
          welcomeMessage.setTextColor(COLOR_TEXT_PRIMARY);
          welcomeMessage.setGravity(Gravity.CENTER);
          welcomeMessage.setPadding(20, 20, 20, 40);
          welcomeMessage.setLineSpacing(8, 1.0f);
          welcomeLayout.addView(welcomeMessage);

          // Feature List
          LinearLayout featuresLayout = new LinearLayout(this);
          featuresLayout.setOrientation(LinearLayout.VERTICAL);
          featuresLayout.setPadding(20, 0, 20, 40);

          String[] features = {
              "✓ Automatic trip detection",
              "✓ Cloud backup & sync",
              "✓ Tax deduction tracking",
              "✓ CSV/PDF export",
              "✓ Multi-device support"
          };

          for (String feature : features) {
              TextView featureText = new TextView(this);
              featureText.setText(feature);
              featureText.setTextSize(14);
              featureText.setTextColor(COLOR_TEXT_SECONDARY);
              featureText.setPadding(0, 8, 0, 8);
              featuresLayout.addView(featureText);
          }

          welcomeLayout.addView(featuresLayout);

          // Login Button
          Button loginButton = new Button(this);
          loginButton.setText("Sign In");
          loginButton.setTextSize(18);
          loginButton.setTextColor(0xFFFFFFFF);
          loginButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          loginButton.setPadding(40, 20, 40, 20);
          LinearLayout.LayoutParams loginParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT
          );
          loginParams.setMargins(0, 20, 0, 15);
          loginButton.setLayoutParams(loginParams);
          loginButton.setOnClickListener(v -> showLoginDialog(authManager));
          welcomeLayout.addView(loginButton);

          // Sign Up Button
          Button signupButton = new Button(this);
          signupButton.setText("Create Account");
          signupButton.setTextSize(18);
          signupButton.setTextColor(COLOR_PRIMARY);
          GradientDrawable signupBorder = new GradientDrawable();
          signupBorder.setColor(0xFFFFFFFF);
          signupBorder.setStroke(3, COLOR_PRIMARY);
          signupBorder.setCornerRadius(dpToPx(14));
          signupButton.setBackground(signupBorder);
          signupButton.setPadding(40, 20, 40, 20);
          LinearLayout.LayoutParams signupParams = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT
          );
          signupParams.setMargins(0, 0, 0, 20);
          signupButton.setLayoutParams(signupParams);
          signupButton.setOnClickListener(v -> showSignupDialog(authManager));
          welcomeLayout.addView(signupButton);

          // Try Without Account Button - Guest Mode
          TextView tryWithoutAccountBtn = new TextView(this);
          tryWithoutAccountBtn.setText("Try Without Account");
          tryWithoutAccountBtn.setTextSize(16);
          tryWithoutAccountBtn.setTextColor(COLOR_TEXT_SECONDARY);
          tryWithoutAccountBtn.setGravity(Gravity.CENTER);
          tryWithoutAccountBtn.setPadding(20, 30, 20, 20);
          tryWithoutAccountBtn.setOnClickListener(v -> startGuestMode());
          welcomeLayout.addView(tryWithoutAccountBtn);

          // Guest mode explanation
          TextView guestModeNote = new TextView(this);
          guestModeNote.setText("No registration required. Free account includes\n40 trips/month with cloud backup - upgrade anytime.");
          guestModeNote.setTextSize(12);
          guestModeNote.setTextColor(0xFF888888);
          guestModeNote.setGravity(Gravity.CENTER);
          guestModeNote.setPadding(20, 5, 20, 20);
          welcomeLayout.addView(guestModeNote);

          // Add welcomeLayout to scrollView, then set scrollView as content
          scrollView.addView(welcomeLayout);
          setContentView(scrollView);
      }

      // Start Guest Mode - Allow user to try app without account
      private void startGuestMode() {
          Log.d(TAG, "Starting guest mode - user trying app without account");
          isGuestMode = true;

          // Save guest mode preference and reset trip count
          SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
          prefs.edit()
              .putBoolean("guest_mode", true)
              .putInt("guest_trip_count", 0)
              .putBoolean("guest_prompt_shown", false)
              .apply();
          guestTripCount = 0;

          // Initialize the app in guest mode (local storage only)
          tripStorage = new TripStorage(this);

          // CRITICAL: Explicitly disable API sync for guest mode
          tripStorage.setApiSyncEnabled(false);

          // Initialize feedback manager for guest users too
          initializeFeedbackManager();

          locationPrefs = getSharedPreferences("location_classification", MODE_PRIVATE);
          initializeGestureDetector();
          createCleanLayout();
          initializeGPS();
          setupSpeedMonitoring();
          requestPermissions();
          updateStats();
          registerBroadcastReceiver();
          initializeBluetoothBackgroundService();
          restoreAutoDetectionState();

          // Track guest mode start event
          trackEvent("guest_mode_start", null, null);

          // Navigate to Track tab so user sees auto-detection toggle
          switchToTab("autotrack");

          // Show guest mode welcome message pointing to auto-detection
          Toast.makeText(this, "Welcome! Toggle Auto-Detection ON to start tracking trips automatically.", Toast.LENGTH_LONG).show();
      }

      // Check if user is in guest mode and prompt registration at key moments
      private void promptGuestToRegister(String reason) {
          if (!isGuestMode) return;

          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Get More From Your Trips");

          String message;
          switch (reason) {
              case "export":
                  message = "Exporting requires a free account (takes 30 seconds!).\n\nYou'll also get:\n" +
                           "• Cloud backup & sync\n• Access from any device\n• Never lose your data";
                  break;
              case "sync":
                  message = "Cloud sync requires a free account. It's quick and free!\n\n" +
                           "• Backup your trips automatically\n• Access from any device\n• Keep your data safe";
                  break;
              case "trips":
                  message = "Nice! You've tracked " + guestTripCount + " trips already.\n\n" +
                           "Create a free account to:\n• Get 40 trips/month with cloud backup\n• Export reports anytime\n• Upgrade to unlimited when ready";
                  break;
              default:
                  message = "Create a free account to unlock all features:\n\n" +
                           "• 40 trips/month with cloud backup\n• Export to CSV/PDF\n• Upgrade to unlimited anytime";
          }

          builder.setMessage(message);
          builder.setPositiveButton("Create Free Account", (dialog, which) -> {
              trackEvent("guest_prompt_response", "create_account_from_" + reason, null);
              UserAuthManager authManager = new UserAuthManager(this);
              showSignupDialog(authManager);
          });
          builder.setNeutralButton("Sign In", (dialog, which) -> {
              trackEvent("guest_prompt_response", "sign_in_from_" + reason, null);
              UserAuthManager authManager = new UserAuthManager(this);
              showLoginDialog(authManager);
          });
          builder.setNegativeButton("Maybe Later", (dialog, which) -> {
              trackEvent("guest_prompt_response", "maybe_later_from_" + reason, null);
              dialog.dismiss();
          });

          trackEvent("guest_prompt_shown", reason, null);
          builder.create().show();
      }

      // Called when a trip is completed in guest mode
      private void onGuestTripCompleted() {
          if (!isGuestMode) return;
          guestTripCount++;

          // Track trip completed event
          trackEvent("trip_completed", "guest_trip_" + guestTripCount, null);

          // Persist guest trip count
          SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
          prefs.edit().putInt("guest_trip_count", guestTripCount).apply();

          // Check if prompt was already shown to avoid spamming
          boolean promptShown = prefs.getBoolean("guest_prompt_shown", false);

          // Prompt after reaching trip limit (only once)
          if (guestTripCount >= GUEST_TRIP_LIMIT_PROMPT && !promptShown) {
              prefs.edit().putBoolean("guest_prompt_shown", true).apply();
              new Handler(Looper.getMainLooper()).postDelayed(() -> {
                  promptGuestToRegister("trips");
              }, 2000); // Delay to let user see their completed trip first
          }
      }

      // Sync all local trips to cloud after guest user registers/logs in
      private void syncLocalTripsToCloud() {
          new Thread(() -> {
              try {
                  // Enable API sync
                  tripStorage.setApiSyncEnabled(true);

                  // Get all local trips and upload them
                  List<Trip> localTrips = tripStorage.getAllTrips();
                  if (localTrips != null && !localTrips.isEmpty()) {
                      CloudBackupService cloudService = new CloudBackupService(this);
                      for (Trip trip : localTrips) {
                          try {
                              cloudService.backupTrip(trip);
                          } catch (Exception e) {
                              Log.e(TAG, "Error syncing trip: " + e.getMessage());
                          }
                      }
                      Log.d(TAG, "Synced " + localTrips.size() + " local trips to cloud");
                  }
              } catch (Exception e) {
                  Log.e(TAG, "Error syncing local trips to cloud: " + e.getMessage());
              }
          }).start();
      }

      // Login Dialog
      private void showLoginDialog(UserAuthManager authManager) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Sign In to MileTracker Pro");

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(20, 20, 20, 20);

          TextView emailLabel = new TextView(this);
          emailLabel.setText("Email Address:");
          emailLabel.setTextColor(COLOR_TEXT_PRIMARY);
          emailLabel.setPadding(0, 10, 0, 5);
          dialogLayout.addView(emailLabel);

          EditText emailInput = new EditText(this);
          emailInput.setHint("your.email@example.com");
          emailInput.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
          dialogLayout.addView(emailInput);

          TextView passwordLabel = new TextView(this);
          passwordLabel.setText("Password:");
          passwordLabel.setTextColor(COLOR_TEXT_PRIMARY);
          passwordLabel.setPadding(0, 20, 0, 5);
          dialogLayout.addView(passwordLabel);

          // Password field with visibility toggle
          LinearLayout passwordContainer = new LinearLayout(this);
          passwordContainer.setOrientation(LinearLayout.HORIZONTAL);
          passwordContainer.setGravity(Gravity.CENTER_VERTICAL);

          EditText passwordInput = new EditText(this);
          passwordInput.setHint("Enter your password");
          passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
          LinearLayout.LayoutParams passwordParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
          passwordInput.setLayoutParams(passwordParams);
          passwordContainer.addView(passwordInput);

          ImageButton togglePwdBtn = new ImageButton(this);
          togglePwdBtn.setImageResource(android.R.drawable.ic_menu_view);
          togglePwdBtn.setBackgroundColor(0x00000000);
          togglePwdBtn.setPadding(16, 8, 16, 8);
          final boolean[] pwdVisible = {false};
          togglePwdBtn.setOnClickListener(v -> {
              pwdVisible[0] = !pwdVisible[0];
              if (pwdVisible[0]) {
                  passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
              } else {
                  passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
              }
              passwordInput.setSelection(passwordInput.getText().length());
          });
          passwordContainer.addView(togglePwdBtn);
          dialogLayout.addView(passwordContainer);

          // Forgot Password link
          TextView forgotPasswordLink = new TextView(this);
          forgotPasswordLink.setText("Forgot Password?");
          forgotPasswordLink.setTextColor(COLOR_PRIMARY);
          forgotPasswordLink.setTextSize(14);
          forgotPasswordLink.setPadding(0, 20, 0, 10);
          forgotPasswordLink.setGravity(Gravity.END);
          forgotPasswordLink.setOnClickListener(v -> {
              showForgotPasswordDialog(authManager);
          });
          dialogLayout.addView(forgotPasswordLink);

          builder.setView(dialogLayout);
          builder.setPositiveButton("Sign In", null);
          builder.setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());

          AlertDialog dialog = builder.create();
          dialog.setOnShowListener(dialogInterface -> {
              Button signInButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
              signInButton.setOnClickListener(view -> {
                  String email = emailInput.getText().toString().trim();
                  String password = passwordInput.getText().toString();

                  if (email.isEmpty() || password.isEmpty()) {
                      Toast.makeText(this, "Please enter both email and password", Toast.LENGTH_SHORT).show();
                      return;
                  }

                  // Attempt login in background thread
                  new Thread(() -> {
                      boolean success = authManager.loginWithOkHttp(email, password);
                      runOnUiThread(() -> {
                          if (success) {
                              // Clear guest mode when user logs in
                              SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
                              boolean wasGuestMode = prefs.getBoolean("guest_mode", false);
                              prefs.edit()
                                  .putBoolean("guest_mode", false)
                                  .remove("guest_trip_count")
                                  .remove("guest_prompt_shown")
                                  .apply();
                              isGuestMode = false;

                              // Sync local trips if user was in guest mode
                              if (wasGuestMode) {
                                  syncLocalTripsToCloud();
                                  Toast.makeText(this, "Welcome back! Syncing your trips...", Toast.LENGTH_SHORT).show();
                              } else {
                                  Toast.makeText(this, "Login successful! Welcome back!", Toast.LENGTH_SHORT).show();
                              }
                              dialog.dismiss();
                              recreate(); // Restart MainActivity to load main app
                          } else {
                              Toast.makeText(this, "Login failed. Please check your credentials.", Toast.LENGTH_LONG).show();
                          }
                      });
                  }).start();
              });
          });

          dialog.show();
      }

      // Signup Dialog
      private void showSignupDialog(UserAuthManager authManager) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Create Your Account");

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(20, 20, 20, 20);

          TextView nameLabel = new TextView(this);
          nameLabel.setText("Full Name:");
          nameLabel.setTextColor(COLOR_TEXT_PRIMARY);
          nameLabel.setPadding(0, 10, 0, 5);
          dialogLayout.addView(nameLabel);

          EditText nameInput = new EditText(this);
          nameInput.setHint("John Doe");
          nameInput.setInputType(InputType.TYPE_TEXT_VARIATION_PERSON_NAME);
          dialogLayout.addView(nameInput);

          TextView emailLabel = new TextView(this);
          emailLabel.setText("Email Address:");
          emailLabel.setTextColor(COLOR_TEXT_PRIMARY);
          emailLabel.setPadding(0, 20, 0, 5);
          dialogLayout.addView(emailLabel);

          EditText emailInput = new EditText(this);
          emailInput.setHint("your.email@example.com");
          emailInput.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
          dialogLayout.addView(emailInput);

          TextView passwordLabel = new TextView(this);
          passwordLabel.setText("Password:");
          passwordLabel.setTextColor(COLOR_TEXT_PRIMARY);
          passwordLabel.setPadding(0, 20, 0, 5);
          dialogLayout.addView(passwordLabel);

          // Password field with visibility toggle
          LinearLayout signupPasswordContainer = new LinearLayout(this);
          signupPasswordContainer.setOrientation(LinearLayout.HORIZONTAL);
          signupPasswordContainer.setGravity(Gravity.CENTER_VERTICAL);

          EditText passwordInput = new EditText(this);
          passwordInput.setHint("Choose a strong password");
          passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
          LinearLayout.LayoutParams signupPwdParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
          passwordInput.setLayoutParams(signupPwdParams);
          signupPasswordContainer.addView(passwordInput);

          ImageButton toggleSignupPwd = new ImageButton(this);
          toggleSignupPwd.setImageResource(android.R.drawable.ic_menu_view);
          toggleSignupPwd.setBackgroundColor(0x00000000);
          toggleSignupPwd.setPadding(16, 8, 16, 8);
          final boolean[] signupPwdVisible = {false};
          toggleSignupPwd.setOnClickListener(v -> {
              signupPwdVisible[0] = !signupPwdVisible[0];
              if (signupPwdVisible[0]) {
                  passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
              } else {
                  passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
              }
              passwordInput.setSelection(passwordInput.getText().length());
          });
          signupPasswordContainer.addView(toggleSignupPwd);
          dialogLayout.addView(signupPasswordContainer);

          builder.setView(dialogLayout);
          builder.setPositiveButton("Create Account", null);
          builder.setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());

          AlertDialog dialog = builder.create();
          dialog.setOnShowListener(dialogInterface -> {
              Button createButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
              createButton.setOnClickListener(view -> {
                  String name = nameInput.getText().toString().trim();
                  String email = emailInput.getText().toString().trim();
                  String password = passwordInput.getText().toString();

                  if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                      Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show();
                      return;
                  }

                  if (password.length() < 6) {
                      Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show();
                      return;
                  }

                  // Attempt registration in background thread
                  new Thread(() -> {
                      boolean success = authManager.registerWithOkHttp(email, password, name);
                      runOnUiThread(() -> {
                          if (success) {
                              // Clear guest mode when user creates account
                              SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
                              boolean wasGuestMode = prefs.getBoolean("guest_mode", false);
                              prefs.edit()
                                  .putBoolean("guest_mode", false)
                                  .remove("guest_trip_count")
                                  .remove("guest_prompt_shown")
                                  .apply();
                              isGuestMode = false;

                              // Track registration event
                              trackEvent("registration_complete", wasGuestMode ? "from_guest" : "direct", email);
                              if (wasGuestMode) {
                                  trackEvent("guest_to_registered", null, email);
                              }

                              // Sync local trips to the cloud
                              syncLocalTripsToCloud();

                              Toast.makeText(this, "Account created! Your trips are being backed up.", Toast.LENGTH_SHORT).show();
                              dialog.dismiss();
                              recreate(); // Restart MainActivity to load main app
                          } else {
                              Toast.makeText(this, "Registration failed. Email may already be in use.", Toast.LENGTH_LONG).show();
                          }
                      });
                  }).start();
              });
          });

          dialog.show();
      }

      // Forgot Password Dialog
      private void showForgotPasswordDialog(UserAuthManager authManager) {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("Reset Your Password");

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(20, 20, 20, 20);

          TextView instructionText = new TextView(this);
          instructionText.setText("Enter your email address and we'll send you a link to reset your password.");
          instructionText.setTextColor(COLOR_TEXT_SECONDARY);
          instructionText.setTextSize(14);
          instructionText.setPadding(0, 0, 0, 20);
          dialogLayout.addView(instructionText);

          TextView emailLabel = new TextView(this);
          emailLabel.setText("Email Address:");
          emailLabel.setTextColor(COLOR_TEXT_PRIMARY);
          emailLabel.setPadding(0, 10, 0, 5);
          dialogLayout.addView(emailLabel);

          EditText emailInput = new EditText(this);
          emailInput.setHint("your.email@example.com");
          emailInput.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
          dialogLayout.addView(emailInput);

          builder.setView(dialogLayout);
          builder.setPositiveButton("Send Reset Link", null);
          builder.setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());

          AlertDialog dialog = builder.create();
          dialog.setOnShowListener(dialogInterface -> {
              Button sendButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
              sendButton.setOnClickListener(view -> {
                  String email = emailInput.getText().toString().trim();

                  if (email.isEmpty()) {
                      Toast.makeText(this, "Please enter your email address", Toast.LENGTH_SHORT).show();
                      return;
                  }

                  // Send password reset request in background thread
                  new Thread(() -> {
                      try {
                          String apiUrl = "https://mileage-tracker-codenurse.replit.app/api/auth/password-reset/request";

                          okhttp3.OkHttpClient client = new okhttp3.OkHttpClient();
                          okhttp3.MediaType JSON = okhttp3.MediaType.parse("application/json; charset=utf-8");

                          org.json.JSONObject json = new org.json.JSONObject();
                          json.put("email", email);

                          okhttp3.RequestBody body = okhttp3.RequestBody.create(JSON, json.toString());
                          okhttp3.Request request = new okhttp3.Request.Builder()
                              .url(apiUrl)
                              .post(body)
                              .build();

                          okhttp3.Response response = client.newCall(request).execute();
                          String responseBody = response.body().string();

                          runOnUiThread(() -> {
                              if (response.isSuccessful()) {
                                  Toast.makeText(this, "Password reset email sent! Check your inbox.", Toast.LENGTH_LONG).show();
                                  dialog.dismiss();
                              } else {
                                  Toast.makeText(this, "Error sending reset email. Please try again.", Toast.LENGTH_LONG).show();
                              }
                          });

                      } catch (Exception e) {
                          Log.e(TAG, "Error requesting password reset", e);
                          runOnUiThread(() -> {
                              Toast.makeText(this, "Network error. Please check your connection.", Toast.LENGTH_LONG).show();
                          });
                      }
                  }).start();
              });
          });

          dialog.show();
      }

      // Initialize Google Play Billing
      private void initializeBillingManager() {
          try {
              UserAuthManager authManager = new UserAuthManager(this);
              String userEmail = authManager != null ? authManager.getCurrentUserEmail() : "";
              billingManager = new BillingManager(this, tripStorage, new BillingManager.BillingCallback() {
                  @Override
                  public void onPurchaseSuccess(String productId) {
                      runOnUiThread(() -> {
                          if (upgradeDialog != null && upgradeDialog.isShowing()) {
                              upgradeDialog.dismiss();
                              upgradeDialog = null;
                          }
                          Toast.makeText(MainActivity.this, "✅ Premium activated! Unlimited trips unlocked!", Toast.LENGTH_LONG).show();
                          updateStats();
                      });
                  }

                  @Override
                  public void onPurchaseFailure(String error) {
                      runOnUiThread(() -> {
                          if (!error.equals("Purchase canceled")) {
                              Toast.makeText(MainActivity.this, "Purchase failed: " + error, Toast.LENGTH_SHORT).show();
                          }
                      });
                  }

                  @Override
                  public void onBillingSetupFinished(boolean success) {
                      if (success) {
                          Log.d(TAG, "Billing system ready");
                      } else {
                          Log.w(TAG, "Billing setup failed - purchases will not be available");
                      }
                  }

                  public void onSubscriptionExpired() {
                      runOnUiThread(() -> {
                          // Check and send grace period notification
                          tripStorage.checkAndSendGracePeriodNotification();
                          // Refresh UI to show grace period status
                          updateStats();
                          Log.d(TAG, "Subscription expired - grace period activated");
                      });
                  }
              }, userEmail);

              Log.d(TAG, "BillingManager initialized successfully");
          } catch (Exception e) {
              Log.e(TAG, "Error initializing BillingManager", e);
          }
      }

      private void initializeFeedbackManager() {
          try {
              UserAuthManager authManager = new UserAuthManager(this);
              String userEmail = authManager != null ? authManager.getCurrentUserEmail() : "";
              feedbackManager = new FeedbackManager(this, userEmail);
              feedbackManager.setThemeColors(
                  COLOR_PRIMARY,
                  COLOR_SURFACE,
                  COLOR_TEXT_PRIMARY,
                  COLOR_TEXT_SECONDARY,
                  COLOR_SUCCESS,
                  COLOR_WARNING
              );
              Log.d(TAG, "FeedbackManager initialized successfully");
          } catch (Exception e) {
              Log.e(TAG, "Error initializing FeedbackManager", e);
          }
      }

      private void checkAndShowFeedbackPrompt() {
          if (feedbackManager == null) return;
          try {
              int totalTrips = tripStorage.getAllTrips().size();
              if (feedbackManager.shouldShowFeedbackPrompt(totalTrips)) {
                  new Handler().postDelayed(() -> {
                      feedbackManager.showFeedbackPrompt(this);
                  }, 2000);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error checking feedback prompt", e);
          }
      }

      private void handleFeedbackNotificationIntent(Intent intent) {
          if (feedbackManager == null) return;
          try {
              if (feedbackManager.wasOpenedFromNotification(intent)) {
                  Log.d(TAG, "App opened from feedback notification - showing feedback dialog");
                  feedbackManager.clearNotificationFlag();
                  new Handler().postDelayed(() -> {
                      feedbackManager.showFeedbackPrompt(this);
                  }, 1500);
              }
          } catch (Exception e) {
              Log.e(TAG, "Error handling feedback notification intent", e);
          }
      }

      private void checkAndSendFeedbackNotification() {
          if (feedbackManager == null) return;
          try {
              int totalTrips = tripStorage.getAllTrips().size();
              feedbackManager.checkAndSendNotificationAfterTrip(totalTrips, MainActivity.class);
          } catch (Exception e) {
              Log.e(TAG, "Error checking feedback notification", e);
          }
      }

      // Sync subscription tier from server on app launch
      // This ensures tier changes (upgrades/downgrades) are reflected immediately
      // Lifetime users will never be downgraded
      private void syncSubscriptionTierFromServer(String userEmail) {
          if (userEmail == null || userEmail.isEmpty()) {
              Log.w(TAG, "Cannot sync tier - no user email");
              return;
          }

          new Thread(() -> {
              try {
                  Log.d(TAG, "🔄 Syncing subscription tier from server for: " + userEmail);

                  okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                      .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .readTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .build();

                  String encodedEmail = java.net.URLEncoder.encode(userEmail, "UTF-8");
                  String url = "https://miletracker-pro.replit.app/api/subscription/status/" + encodedEmail;

                  okhttp3.Request request = new okhttp3.Request.Builder()
                      .url(url)
                      .get()
                      .build();

                  okhttp3.Response response = client.newCall(request).execute();
                  String responseBody = response.body().string();
                  Log.d(TAG, "📊 Tier sync response: " + responseBody);

                  if (response.isSuccessful()) {
                      org.json.JSONObject json = new org.json.JSONObject(responseBody);
                      boolean success = json.optBoolean("success", false);

                      if (success) {
                          String serverTier = json.optString("tier", "free");
                          boolean isLifetime = json.optBoolean("is_lifetime", false);
                          String currentTier = tripStorage.getSubscriptionTier();

                          Log.d(TAG, "📊 Server tier: " + serverTier + ", Current tier: " + currentTier + ", Lifetime: " + isLifetime);

                          // Determine tier priority for comparison (higher = better)
                          int serverTierPriority = getTierPriority(serverTier);
                          int currentTierPriority = getTierPriority(currentTier);

                          if (isLifetime) {
                              // Lifetime users: only allow upgrades, never downgrades
                              if (serverTierPriority > currentTierPriority) {
                                  Log.d(TAG, "⬆️ Lifetime user upgrade: " + currentTier + " → " + serverTier);
                                  tripStorage.setSubscriptionTier(serverTier);
                              } else {
                                  Log.d(TAG, "🛡️ Lifetime user protected - keeping tier: " + currentTier);
                              }
                          } else {
                              // Normal users: sync whatever the server says
                              if (!serverTier.equals(currentTier)) {
                                  Log.d(TAG, "🔄 Tier changed: " + currentTier + " → " + serverTier);
                                  tripStorage.setSubscriptionTier(serverTier);

                                  // Notify user of tier change on main thread
                                  final String fromTier = currentTier;
                                  final String toTier = serverTier;
                                  runOnUiThread(() -> {
                                      if (serverTierPriority > currentTierPriority) {
                                          Toast.makeText(this, "🎉 Upgraded to " + toTier + "!", Toast.LENGTH_SHORT).show();
                                      } else if (serverTierPriority < currentTierPriority) {
                                          Toast.makeText(this, "Subscription changed to " + toTier, Toast.LENGTH_SHORT).show();
                                      }
                                      updateStats();
                                  });
                              }
                          }
                      }
                  }
              } catch (Exception e) {
                  Log.e(TAG, "Error syncing subscription tier: " + e.getMessage());
                  // Don't show error to user - just keep existing tier
              }
          }).start();
      }

      // Get tier priority for comparison (higher number = better tier)
      private int getTierPriority(String tier) {
          if (tier == null) return 0;
          switch (tier.toLowerCase()) {
              case "free": return 1;
              case "premium": return 2;
              case "family": return 3;
              case "business": return 4;
              case "enterprise": return 5;
              default: return 0;
          }
      }

      // Show upgrade options dialog (monthly vs yearly)
      private void showUpgradeOptionsDialog() {
          EventTracker.trackUpgradeDialogViewed(this);
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("⭐ Upgrade to Premium");

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(30, 20, 30, 20);

          // Benefits section
          TextView benefitsText = new TextView(this);
          benefitsText.setText("Premium Benefits:\n\n✓ Unlimited trips per month\n✓ Cloud sync & backup\n✓ Multi-device support\n✓ Priority support\n✓ All future features");
          benefitsText.setTextSize(15);
          benefitsText.setTextColor(COLOR_TEXT_PRIMARY);
          benefitsText.setPadding(10, 10, 10, 20);
          benefitsText.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(benefitsText);

          // Monthly option button
          Button monthlyButton = new Button(this);
          monthlyButton.setText("Monthly - $4.99/month");
          monthlyButton.setTextSize(16);
          monthlyButton.setTextColor(0xFFFFFFFF);
          monthlyButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          monthlyButton.setPadding(20, 20, 20, 20);
          LinearLayout.LayoutParams monthlyParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          monthlyParams.setMargins(0, 20, 0, 10);
          monthlyButton.setLayoutParams(monthlyParams);
          monthlyButton.setOnClickListener(v -> {
              String email = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              trackEvent("upgrade_option_selected", "monthly_4.99", email);
              if (billingManager != null && billingManager.isReady()) {
                  billingManager.launchPurchaseFlow(MainActivity.this, BillingManager.PRODUCT_ID_MONTHLY);
              } else {
                  Toast.makeText(this, "Billing system not ready. Please try again in a moment.", Toast.LENGTH_SHORT).show();
              }
          });
          dialogLayout.addView(monthlyButton);

          // Yearly option button
          Button yearlyButton = new Button(this);
          yearlyButton.setText("Yearly - $50/year (Save $9.88!)");
          yearlyButton.setTextSize(16);
          yearlyButton.setTextColor(0xFFFFFFFF);
          yearlyButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
          yearlyButton.setPadding(20, 20, 20, 20);
          LinearLayout.LayoutParams yearlyParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          yearlyParams.setMargins(0, 0, 0, 10);
          yearlyButton.setLayoutParams(yearlyParams);
          yearlyButton.setOnClickListener(v -> {
              String email = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              trackEvent("upgrade_option_selected", "yearly_50", email);
              if (billingManager != null && billingManager.isReady()) {
                  billingManager.launchPurchaseFlow(MainActivity.this, BillingManager.PRODUCT_ID_YEARLY);
              } else {
                  Toast.makeText(this, "Billing system not ready. Please try again in a moment.", Toast.LENGTH_SHORT).show();
              }
          });
          dialogLayout.addView(yearlyButton);

          // Info text
          TextView infoText = new TextView(this);
          infoText.setText("\n💳 Secure payment via Google Play\n🔒 Cancel anytime\n📧 Questions? support@miletrackerpro.com");
          infoText.setTextSize(12);
          infoText.setTextColor(COLOR_TEXT_SECONDARY);
          infoText.setGravity(Gravity.CENTER);
          infoText.setPadding(10, 10, 10, 10);
          dialogLayout.addView(infoText);

          builder.setView(dialogLayout);
          builder.setNegativeButton("Maybe Later", (dialog, which) -> {
              String email = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              trackEvent("upgrade_dismissed", "maybe_later", email);
              dialog.dismiss();
          });
          upgradeDialog = builder.create();
          upgradeDialog.show();
      }

      // Show trip usage warning notification (at 30 and 35 trips)
      private void showTripUsageWarning(int tripCount, int tripLimit) {
          // Create notification channel if needed
          createNotificationChannel();

          String title = String.format("📊 %d of %d trips used", tripCount, tripLimit);
          String message = tripCount == 30 ? 
              "You have 10 trips remaining this month. Upgrade to Premium for unlimited trips!" :
              "Only 5 trips left! Upgrade to Premium for unlimited trips and cloud sync.";

          NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "freemium_channel")
              .setSmallIcon(android.R.drawable.ic_dialog_info)
              .setContentTitle(title)
              .setContentText(message)
              .setPriority(NotificationCompat.PRIORITY_HIGH)
              .setAutoCancel(true);

          NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
          if (notificationManager != null) {
              notificationManager.notify(tripCount, builder.build());
          }
      }

      // Show trip limit reached notification
      private void showTripLimitNotification(int tripCount, int tripLimit) {
          createNotificationChannel();

          String title = "🚫 Trip Limit Reached";
          String message = String.format("You've used all %d free trips this month. Tap to upgrade!", tripLimit);

          // Create intent to open app and show upgrade dialog
          Intent intent = new Intent(this, MainActivity.class);
          intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
          intent.putExtra("show_upgrade_dialog", true);

          PendingIntent pendingIntent = PendingIntent.getActivity(
              this, 
              9999, 
              intent, 
              PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
          );

          NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "freemium_channel")
              .setSmallIcon(android.R.drawable.ic_dialog_alert)
              .setContentTitle(title)
              .setContentText(message)
              .setPriority(NotificationCompat.PRIORITY_MAX)
              .setAutoCancel(true)
              .setContentIntent(pendingIntent);

          NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
          if (notificationManager != null) {
              notificationManager.notify(9999, builder.build());
          }
      }

      // Show trip limit reached dialog with upgrade options
      private void showTripLimitReachedDialog() {
          AlertDialog.Builder builder = new AlertDialog.Builder(this);
          builder.setTitle("🚫 Trip Limit Reached");
          builder.setCancelable(false);

          LinearLayout dialogLayout = new LinearLayout(this);
          dialogLayout.setOrientation(LinearLayout.VERTICAL);
          dialogLayout.setPadding(30, 20, 30, 20);

          // Message
          TextView messageText = new TextView(this);
          messageText.setText("You've reached your limit of 40 free trips this month.\n\nUpgrade to Premium to unlock:");
          messageText.setTextSize(16);
          messageText.setTextColor(COLOR_TEXT_PRIMARY);
          messageText.setPadding(10, 10, 10, 10);
          dialogLayout.addView(messageText);

          // Benefits
          TextView benefitsText = new TextView(this);
          benefitsText.setText("\n✓ Unlimited trips per month\n✓ Cloud sync & backup\n✓ Multi-device support\n✓ Priority support");
          benefitsText.setTextSize(15);
          benefitsText.setTextColor(COLOR_TEXT_PRIMARY);
          benefitsText.setPadding(10, 5, 10, 20);
          benefitsText.setBackgroundColor(COLOR_CARD_BG);
          dialogLayout.addView(benefitsText);

          // Upgrade button
          Button upgradeButton = new Button(this);
          upgradeButton.setText("⭐ Upgrade to Premium");
          upgradeButton.setTextSize(16);
          upgradeButton.setTextColor(0xFFFFFFFF);
          upgradeButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
          upgradeButton.setPadding(20, 20, 20, 20);
          LinearLayout.LayoutParams upgradeParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          upgradeParams.setMargins(0, 20, 0, 10);
          upgradeButton.setLayoutParams(upgradeParams);
          upgradeButton.setOnClickListener(v -> {
              showUpgradeOptionsDialog();
              builder.create().dismiss();
          });
          dialogLayout.addView(upgradeButton);

          builder.setView(dialogLayout);
          builder.setPositiveButton("OK", (dialog, which) -> dialog.dismiss());
          builder.show();
      }

      // Create notification channel for Android O+
      private void createNotificationChannel() {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              CharSequence name = "Freemium Notifications";
              String description = "Trip usage and upgrade notifications";
              int importance = NotificationManager.IMPORTANCE_HIGH;
              NotificationChannel channel = new NotificationChannel("freemium_channel", name, importance);
              channel.setDescription(description);

              NotificationManager notificationManager = getSystemService(NotificationManager.class);
              if (notificationManager != null) {
                  notificationManager.createNotificationChannel(channel);
              }
          }
      }

      // Helper method to create tab button with icon and label
      private LinearLayout createTabButton(int iconResId, String label, String tabName) {
          LinearLayout tabButton = new LinearLayout(this);
          tabButton.setOrientation(LinearLayout.VERTICAL);
          tabButton.setGravity(Gravity.CENTER);
          tabButton.setPadding(2, 10, 2, 6);
          LinearLayout.LayoutParams tabParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          tabButton.setLayoutParams(tabParams);

          // Use ImageView for cleaner icon rendering
          ImageView iconView = new ImageView(this);
          iconView.setImageResource(iconResId);
          iconView.setColorFilter(COLOR_TEXT_SECONDARY);
          LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dpToPx(24), dpToPx(24));
          iconParams.gravity = Gravity.CENTER;
          iconView.setLayoutParams(iconParams);
          iconView.setTag("icon");
          tabButton.addView(iconView);

          TextView labelText = new TextView(this);
          labelText.setText(label);
          labelText.setTextSize(9);
          labelText.setGravity(Gravity.CENTER);
          labelText.setPadding(0, 2, 0, 0);
          labelText.setSingleLine(true);
          labelText.setTag("label");
          tabButton.addView(labelText);

          // Set initial colors based on whether this is the active tab
          updateTabButtonColors(tabButton, tabName.equals(currentTab));

          tabButton.setOnClickListener(v -> switchToTab(tabName));

          return tabButton;
      }

      // Helper method to update tab button colors
      private void updateTabButtonColors(LinearLayout tabButton, boolean isActive) {
          for (int i = 0; i < tabButton.getChildCount(); i++) {
              View child = tabButton.getChildAt(i);
              if (child instanceof TextView) {
                  ((TextView) child).setTextColor(isActive ? COLOR_PRIMARY : COLOR_TEXT_SECONDARY);
              } else if (child instanceof ImageView) {
                  ((ImageView) child).setColorFilter(isActive ? COLOR_PRIMARY : COLOR_TEXT_SECONDARY);
              }
          }
      }

      // Update all tab button states
      private void updateAllTabButtonStates() {
          updateTabButtonColors(homeTabButton, "home".equals(currentTab));
          updateTabButtonColors(autoTrackTabButton, "autotrack".equals(currentTab));
          updateTabButtonColors(tripsTabButton, "trips".equals(currentTab));
          updateTabButtonColors(reportsTabButton, "reports".equals(currentTab));
          updateTabButtonColors(settingsTabButton, "settings".equals(currentTab));
      }

      // ==================== HOME TAB CONTENT ====================
      private void createHomeContent() {
          homeContent = new LinearLayout(this);
          homeContent.setOrientation(LinearLayout.VERTICAL);
          homeContent.setPadding(20, 20, 20, 20);
          homeContent.setBackgroundColor(COLOR_BACKGROUND);

          // === WELCOME / STATUS HERO CARD ===
          LinearLayout statusHeroCard = new LinearLayout(this);
          statusHeroCard.setOrientation(LinearLayout.VERTICAL);
          statusHeroCard.setBackground(createRoundedBackground(COLOR_PRIMARY, 20));
          statusHeroCard.setPadding(24, 24, 24, 24);
          LinearLayout.LayoutParams heroParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          heroParams.setMargins(0, 0, 0, 20);
          statusHeroCard.setLayoutParams(heroParams);
          statusHeroCard.setElevation(6);

          // Status icon and text
          TextView heroIcon = new TextView(this);
          heroIcon.setText("🚗");
          heroIcon.setTextSize(48);
          heroIcon.setGravity(Gravity.CENTER);
          statusHeroCard.addView(heroIcon);

          statusText = new TextView(this);
          statusText.setText("Ready to Track");
          statusText.setTextSize(20);
          statusText.setTextColor(0xFFFFFFFF);
          statusText.setTypeface(null, Typeface.BOLD);
          statusText.setGravity(Gravity.CENTER);
          statusText.setPadding(0, 8, 0, 4);
          statusHeroCard.addView(statusText);

          speedText = new TextView(this);
          speedText.setText("Speed: -- mph");
          speedText.setTextSize(14);
          speedText.setTextColor(0xDDFFFFFF);
          speedText.setGravity(Gravity.CENTER);
          statusHeroCard.addView(speedText);

          realTimeDistanceText = new TextView(this);
          realTimeDistanceText.setText("Distance: 0.0 miles");
          realTimeDistanceText.setTextSize(14);
          realTimeDistanceText.setTextColor(0xDDFFFFFF);
          realTimeDistanceText.setGravity(Gravity.CENTER);
          statusHeroCard.addView(realTimeDistanceText);

          homeContent.addView(statusHeroCard);

          // === AUTO-TRACKING OFF BANNER ===
          autoTrackOffBanner = new LinearLayout(this);
          autoTrackOffBanner.setOrientation(LinearLayout.VERTICAL);
          autoTrackOffBanner.setBackground(createRoundedBackground(0xFFFFF3E0, 16));
          autoTrackOffBanner.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams bannerParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          bannerParams.setMargins(0, 0, 0, 16);
          autoTrackOffBanner.setLayoutParams(bannerParams);
          autoTrackOffBanner.setElevation(4);
          autoTrackOffBanner.setVisibility(View.GONE);

          LinearLayout bannerTopRow = new LinearLayout(this);
          bannerTopRow.setOrientation(LinearLayout.HORIZONTAL);
          bannerTopRow.setGravity(Gravity.CENTER_VERTICAL);

          TextView bannerIcon = new TextView(this);
          bannerIcon.setText("⚠️");
          bannerIcon.setTextSize(20);
          bannerIcon.setPadding(0, 0, 12, 0);
          bannerTopRow.addView(bannerIcon);

          TextView bannerTitle = new TextView(this);
          bannerTitle.setText("Auto-tracking is OFF");
          bannerTitle.setTextSize(15);
          bannerTitle.setTextColor(0xFFE65100);
          bannerTitle.setTypeface(null, Typeface.BOLD);
          bannerTitle.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          bannerTopRow.addView(bannerTitle);

          autoTrackOffBanner.addView(bannerTopRow);

          TextView bannerMessage = new TextView(this);
          bannerMessage.setText("You're not tracking miles yet. Tap below to enable auto-tracking and start saving on your taxes.");
          bannerMessage.setTextSize(13);
          bannerMessage.setTextColor(0xFF795548);
          bannerMessage.setPadding(0, 8, 0, 12);
          autoTrackOffBanner.addView(bannerMessage);

          Button enableAutoTrackBtn = new Button(this);
          enableAutoTrackBtn.setText("Enable Auto-Tracking");
          enableAutoTrackBtn.setTextSize(14);
          enableAutoTrackBtn.setTextColor(0xFFFFFFFF);
          enableAutoTrackBtn.setBackground(createRoundedBackground(0xFFE65100, 24));
          enableAutoTrackBtn.setPadding(24, 12, 24, 12);
          enableAutoTrackBtn.setOnClickListener(v -> {
              String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
              trackEvent("home_banner_enable_autotrack_tap", null, userEmail);
              switchToTab("autotrack");
          });
          autoTrackOffBanner.addView(enableAutoTrackBtn);

          homeContent.addView(autoTrackOffBanner);

          // === SUBSCRIPTION STATUS CARD ===
          LinearLayout subscriptionCard = new LinearLayout(this);
          subscriptionCard.setOrientation(LinearLayout.VERTICAL);
          subscriptionCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          subscriptionCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams subCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          subCardParams.setMargins(0, 0, 0, 16);
          subscriptionCard.setLayoutParams(subCardParams);
          subscriptionCard.setElevation(4);

          TextView subHeader = new TextView(this);
          subHeader.setText("Subscription");
          subHeader.setTextSize(16);
          subHeader.setTextColor(COLOR_TEXT_PRIMARY);
          subHeader.setTypeface(null, Typeface.BOLD);
          subscriptionCard.addView(subHeader);

          TextView subStatusText = new TextView(this);
          String tier = tripStorage != null ? tripStorage.getSubscriptionTier() : "free";
          int monthlyTrips = tripStorage != null ? tripStorage.getMonthlyTripCount() : 0;
          if (tier.equals("free")) {
              subStatusText.setText(String.format("FREE Plan • %d/40 trips this month", monthlyTrips));
              subStatusText.setTextColor(COLOR_TEXT_SECONDARY);
          } else if (tier.equals("enterprise") || tier.equals("admin")) {
              subStatusText.setText("ENTERPRISE ADMIN • Unlimited");
              subStatusText.setTextColor(COLOR_PRIMARY);
          } else {
              subStatusText.setText("PREMIUM • Unlimited trips");
              subStatusText.setTextColor(COLOR_SUCCESS);
          }
          subStatusText.setTextSize(14);
          subStatusText.setPadding(0, 8, 0, 0);
          subscriptionCard.addView(subStatusText);

          homeContent.addView(subscriptionCard);

          // === RECENT TRIPS CARD ===
          LinearLayout recentCard = new LinearLayout(this);
          recentCard.setOrientation(LinearLayout.VERTICAL);
          recentCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          recentCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams recentCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          recentCardParams.setMargins(0, 0, 0, 16);
          recentCard.setLayoutParams(recentCardParams);
          recentCard.setElevation(4);

          TextView recentHeader = new TextView(this);
          recentHeader.setText("Recent Trips");
          recentHeader.setTextSize(16);
          recentHeader.setTextColor(COLOR_TEXT_PRIMARY);
          recentHeader.setTypeface(null, Typeface.BOLD);
          recentHeader.setPadding(0, 0, 0, 12);
          recentCard.addView(recentHeader);

          recentTripsLayout = new LinearLayout(this);
          recentTripsLayout.setOrientation(LinearLayout.VERTICAL);
          recentCard.addView(recentTripsLayout);

          homeContent.addView(recentCard);

          // Create scroll view for home
          homeScroll = new ScrollView(this);
          homeScroll.addView(homeContent);
      }

      // ==================== AUTOTRACK TAB CONTENT ====================
      private void createAutoTrackContent() {
          autoTrackContent = new LinearLayout(this);
          autoTrackContent.setOrientation(LinearLayout.VERTICAL);
          autoTrackContent.setPadding(20, 20, 20, 20);
          autoTrackContent.setBackgroundColor(COLOR_BACKGROUND);

          // === HERO EXPLANATION CARD ===
          LinearLayout heroCard = new LinearLayout(this);
          heroCard.setOrientation(LinearLayout.VERTICAL);
          heroCard.setBackground(createRoundedBackground(COLOR_SUCCESS, 20));
          heroCard.setPadding(24, 24, 24, 24);
          LinearLayout.LayoutParams heroParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          heroParams.setMargins(0, 0, 0, 20);
          heroCard.setLayoutParams(heroParams);
          heroCard.setElevation(6);

          TextView heroIcon = new TextView(this);
          heroIcon.setText("✨");
          heroIcon.setTextSize(40);
          heroIcon.setGravity(Gravity.CENTER);
          heroCard.addView(heroIcon);

          TextView heroTitle = new TextView(this);
          heroTitle.setText("Hands-Free Tracking");
          heroTitle.setTextSize(22);
          heroTitle.setTextColor(0xFFFFFFFF);
          heroTitle.setTypeface(null, Typeface.BOLD);
          heroTitle.setGravity(Gravity.CENTER);
          heroTitle.setPadding(0, 8, 0, 8);
          heroCard.addView(heroTitle);

          TextView heroExplanation = new TextView(this);
          heroExplanation.setText("When Auto-Detection is ON, just drive!\nTrips are automatically recorded.\nNo buttons to press. No manual entry needed.");
          heroExplanation.setTextSize(14);
          heroExplanation.setTextColor(0xEEFFFFFF);
          heroExplanation.setGravity(Gravity.CENTER);
          heroExplanation.setLineSpacing(4, 1);
          heroCard.addView(heroExplanation);

          autoTrackContent.addView(heroCard);

          // === AUTO DETECTION TOGGLE CARD ===
          LinearLayout autoDetectionCard = new LinearLayout(this);
          autoDetectionCard.setOrientation(LinearLayout.VERTICAL);
          autoDetectionCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          autoDetectionCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams autoCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          autoCardParams.setMargins(0, 0, 0, 16);
          autoDetectionCard.setLayoutParams(autoCardParams);
          autoDetectionCard.setElevation(4);

          TextView autoHeader = new TextView(this);
          autoHeader.setText("📡 Auto Detection");
          autoHeader.setTextSize(16);
          autoHeader.setTextColor(COLOR_TEXT_PRIMARY);
          autoHeader.setTypeface(null, Typeface.BOLD);
          autoHeader.setPadding(0, 0, 0, 12);
          autoDetectionCard.addView(autoHeader);

          // Auto Detection Toggle Row
          LinearLayout autoToggleRow = new LinearLayout(this);
          autoToggleRow.setOrientation(LinearLayout.HORIZONTAL);
          autoToggleRow.setGravity(Gravity.CENTER_VERTICAL);

          TextView autoToggleLabel = new TextView(this);
          autoToggleLabel.setText("Auto Detection");
          autoToggleLabel.setTextSize(16);
          autoToggleLabel.setTextColor(COLOR_TEXT_PRIMARY);
          autoToggleLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          autoToggleRow.addView(autoToggleLabel);

          autoToggle = new Switch(this);
          autoToggle.setChecked(autoDetectionEnabled);
          autoToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
              SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", MODE_PRIVATE);
              String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);

              if (isChecked) {
                  boolean hasFineLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                  boolean hasBackgroundLocation = true;
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                      hasBackgroundLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
                  }

                  if (!hasFineLocation || !hasBackgroundLocation) {
                      autoToggle.setChecked(false);
                      trackEvent("auto_detection_blocked_no_permission", hasBackgroundLocation ? "missing_fine_location" : "missing_background_location", userEmail);
                      showAutoDetectPermissionDialog(hasFineLocation);
                      return;
                  }
              }

              autoDetectionEnabled = isChecked;
              prefs.edit().putBoolean("auto_detection_enabled", autoDetectionEnabled).apply();
              updateAutoTrackBanner();
              if (autoDetectionEnabled) {
                  prefs.edit().putLong("auto_detection_on_time", System.currentTimeMillis()).apply();
                  trackEvent("auto_detection_on", null, userEmail);
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  serviceIntent.setAction("START_AUTO_DETECTION");
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      startForegroundService(serviceIntent);
                  } else {
                      startService(serviceIntent);
                  }
                  if (statusText != null) statusText.setText("Auto-detection enabled - Just drive!");
              } else {
                  long onTime = prefs.getLong("auto_detection_on_time", 0);
                  long durationMin = onTime > 0 ? (System.currentTimeMillis() - onTime) / 60000 : 0;
                  trackEvent("auto_detection_off", "duration_" + durationMin + "min", userEmail);
                  Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                  stopService(serviceIntent);
                  if (statusText != null) statusText.setText("Auto-detection disabled");
              }
          });
          autoToggleRow.addView(autoToggle);

          autoDetectionCard.addView(autoToggleRow);

          // Status indicator
          TextView autoStatusHint = new TextView(this);
          autoStatusHint.setText("💡 When ON, trips start/stop automatically based on your movement");
          autoStatusHint.setTextSize(12);
          autoStatusHint.setTextColor(COLOR_TEXT_SECONDARY);
          autoStatusHint.setPadding(0, 12, 0, 0);
          autoDetectionCard.addView(autoStatusHint);

          autoTrackContent.addView(autoDetectionCard);

          // === BLUETOOTH VEHICLE CARD ===
          LinearLayout bluetoothCard = new LinearLayout(this);
          bluetoothCard.setOrientation(LinearLayout.VERTICAL);
          bluetoothCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          bluetoothCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams btCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          btCardParams.setMargins(0, 0, 0, 16);
          bluetoothCard.setLayoutParams(btCardParams);
          bluetoothCard.setElevation(4);

          TextView btHeader = new TextView(this);
          btHeader.setText("🚙 Vehicle Bluetooth");
          btHeader.setTextSize(16);
          btHeader.setTextColor(COLOR_TEXT_PRIMARY);
          btHeader.setTypeface(null, Typeface.BOLD);
          btHeader.setPadding(0, 0, 0, 8);
          bluetoothCard.addView(btHeader);

          bluetoothStatusText = new TextView(this);
          bluetoothStatusText.setText("No vehicle connected");
          bluetoothStatusText.setTextSize(14);
          bluetoothStatusText.setTextColor(COLOR_TEXT_SECONDARY);
          bluetoothCard.addView(bluetoothStatusText);

          connectedVehicleText = new TextView(this);
          connectedVehicleText.setText("");
          connectedVehicleText.setTextSize(13);
          connectedVehicleText.setTextColor(COLOR_TEXT_SECONDARY);
          connectedVehicleText.setVisibility(View.GONE);
          bluetoothCard.addView(connectedVehicleText);

          registerVehicleButton = new Button(this);
          registerVehicleButton.setText("Register Vehicle");
          registerVehicleButton.setTextSize(14);
          registerVehicleButton.setTextColor(0xFFFFFFFF);
          registerVehicleButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 12));
          registerVehicleButton.setPadding(16, 12, 16, 12);
          LinearLayout.LayoutParams regBtnParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          regBtnParams.setMargins(0, 12, 0, 0);
          registerVehicleButton.setLayoutParams(regBtnParams);
          registerVehicleButton.setOnClickListener(v -> showVehicleRegistrationDialog());
          bluetoothCard.addView(registerVehicleButton);

          autoTrackContent.addView(bluetoothCard);

          // === MANUAL CONTROLS CARD (Secondary) ===
          LinearLayout manualCard = new LinearLayout(this);
          manualCard.setOrientation(LinearLayout.VERTICAL);
          manualCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          manualCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams manualCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          manualCardParams.setMargins(0, 0, 0, 16);
          manualCard.setLayoutParams(manualCardParams);
          manualCard.setElevation(4);

          TextView manualHeader = new TextView(this);
          manualHeader.setText("🎛️ Manual Override (Optional)");
          manualHeader.setTextSize(16);
          manualHeader.setTextColor(COLOR_TEXT_PRIMARY);
          manualHeader.setTypeface(null, Typeface.BOLD);
          manualHeader.setPadding(0, 0, 0, 8);
          manualCard.addView(manualHeader);

          TextView manualHint = new TextView(this);
          manualHint.setText("Use these only if you need to manually control a trip");
          manualHint.setTextSize(12);
          manualHint.setTextColor(COLOR_TEXT_SECONDARY);
          manualHint.setPadding(0, 0, 0, 12);
          manualCard.addView(manualHint);

          LinearLayout manualButtonRow = new LinearLayout(this);
          manualButtonRow.setOrientation(LinearLayout.HORIZONTAL);
          manualButtonRow.setGravity(Gravity.CENTER);

          manualStartButton = new Button(this);
          manualStartButton.setText("▶ Start Trip");
          manualStartButton.setTextSize(14);
          manualStartButton.setTextColor(0xFFFFFFFF);
          manualStartButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 12));
          manualStartButton.setPadding(20, 12, 20, 12);
          LinearLayout.LayoutParams startParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          startParams.setMargins(0, 0, 8, 0);
          manualStartButton.setLayoutParams(startParams);
          manualStartButton.setOnClickListener(v -> startManualTrip());
          manualButtonRow.addView(manualStartButton);

          manualStopButton = new Button(this);
          manualStopButton.setText("⏹ End Trip");
          manualStopButton.setTextSize(14);
          manualStopButton.setTextColor(0xFFFFFFFF);
          manualStopButton.setBackground(createRoundedBackground(COLOR_ERROR, 12));
          manualStopButton.setPadding(20, 12, 20, 12);
          manualStopButton.setVisibility(View.GONE);
          LinearLayout.LayoutParams stopParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          stopParams.setMargins(8, 0, 0, 0);
          manualStopButton.setLayoutParams(stopParams);
          manualStopButton.setOnClickListener(v -> stopManualTrip());
          manualButtonRow.addView(manualStopButton);

          manualCard.addView(manualButtonRow);

          // Add Trip button
          addTripButton = new Button(this);
          addTripButton.setText("➕ Add Past Trip");
          addTripButton.setTextSize(14);
          addTripButton.setTextColor(COLOR_PRIMARY);
          addTripButton.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          addTripButton.setPadding(20, 12, 20, 12);
          LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          addParams.setMargins(0, 12, 0, 0);
          addTripButton.setLayoutParams(addParams);
          addTripButton.setOnClickListener(v -> showAddTripDialog());
          manualCard.addView(addTripButton);

          autoTrackContent.addView(manualCard);

          // Create scroll view
          autoTrackScroll = new ScrollView(this);
          autoTrackScroll.addView(autoTrackContent);
      }

      // ==================== REPORTS TAB CONTENT ====================
      private void createReportsContent() {
          reportsContent = new LinearLayout(this);
          reportsContent.setOrientation(LinearLayout.VERTICAL);
          reportsContent.setPadding(20, 20, 20, 20);
          reportsContent.setBackgroundColor(COLOR_BACKGROUND);

          // === STATISTICS CARD ===
          LinearLayout statsCard = new LinearLayout(this);
          statsCard.setOrientation(LinearLayout.VERTICAL);
          statsCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          statsCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams statsCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          statsCardParams.setMargins(0, 0, 0, 16);
          statsCard.setLayoutParams(statsCardParams);
          statsCard.setElevation(4);

          TextView statsHeader = new TextView(this);
          statsHeader.setText("📊 Statistics");
          statsHeader.setTextSize(16);
          statsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          statsHeader.setTypeface(null, Typeface.BOLD);
          statsHeader.setPadding(0, 0, 0, 12);
          statsCard.addView(statsHeader);

          statsText = new TextView(this);
          statsText.setText("Loading statistics...");
          statsText.setTextSize(14);
          statsText.setTextColor(COLOR_TEXT_SECONDARY);
          statsCard.addView(statsText);

          reportsContent.addView(statsCard);

          // === EXPORT CARD ===
          LinearLayout exportCard = new LinearLayout(this);
          exportCard.setOrientation(LinearLayout.VERTICAL);
          exportCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          exportCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams exportCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          exportCardParams.setMargins(0, 0, 0, 16);
          exportCard.setLayoutParams(exportCardParams);
          exportCard.setElevation(4);

          TextView exportHeader = new TextView(this);
          exportHeader.setText("📁 Export Trips");
          exportHeader.setTextSize(16);
          exportHeader.setTextColor(COLOR_TEXT_PRIMARY);
          exportHeader.setTypeface(null, Typeface.BOLD);
          exportHeader.setPadding(0, 0, 0, 12);
          exportCard.addView(exportHeader);

          TextView exportHint = new TextView(this);
          exportHint.setText("Export your trips for tax records or expense reports");
          exportHint.setTextSize(12);
          exportHint.setTextColor(COLOR_TEXT_SECONDARY);
          exportHint.setPadding(0, 0, 0, 12);
          exportCard.addView(exportHint);

          Button exportButton = new Button(this);
          exportButton.setText("📁 Export");
          exportButton.setTextSize(14);
          exportButton.setTextColor(0xFFFFFFFF);
          exportButton.setBackground(createRoundedBackground(COLOR_PRIMARY, 12));
          exportButton.setPadding(20, 12, 20, 12);
          exportButton.setOnClickListener(v -> showExportDialog());
          exportCard.addView(exportButton);

          reportsContent.addView(exportCard);

          // === RECENT EXPORTS CARD ===
          LinearLayout recentExportsCard = new LinearLayout(this);
          recentExportsCard.setOrientation(LinearLayout.VERTICAL);
          recentExportsCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          recentExportsCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams recentCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          recentCardParams.setMargins(0, 0, 0, 16);
          recentExportsCard.setLayoutParams(recentCardParams);
          recentExportsCard.setElevation(4);

          TextView recentHeader = new TextView(this);
          recentHeader.setText("📋 Recent Exports");
          recentHeader.setTextSize(16);
          recentHeader.setTextColor(COLOR_TEXT_PRIMARY);
          recentHeader.setTypeface(null, Typeface.BOLD);
          recentHeader.setPadding(0, 0, 0, 12);
          recentExportsCard.addView(recentHeader);

          recentExportsText = new TextView(this);
          recentExportsText.setTextSize(13);
          recentExportsText.setTextColor(COLOR_TEXT_SECONDARY);
          updateRecentExportsDisplay();
          recentExportsCard.addView(recentExportsText);

          reportsContent.addView(recentExportsCard);

          // Create scroll view
          reportsScroll = new ScrollView(this);
          reportsScroll.addView(reportsContent);
      }

      // ==================== SETTINGS TAB CONTENT ====================
      private void createSettingsContent() {
          settingsContent = new LinearLayout(this);
          settingsContent.setOrientation(LinearLayout.VERTICAL);
          settingsContent.setPadding(20, 20, 20, 20);
          settingsContent.setBackgroundColor(COLOR_BACKGROUND);

          // === ACCOUNT CARD ===
          LinearLayout accountCard = new LinearLayout(this);
          accountCard.setOrientation(LinearLayout.VERTICAL);
          accountCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          accountCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams accountCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          accountCardParams.setMargins(0, 0, 0, 16);
          accountCard.setLayoutParams(accountCardParams);
          accountCard.setElevation(4);

          TextView accountHeader = new TextView(this);
          accountHeader.setText("👤 Account");
          accountHeader.setTextSize(16);
          accountHeader.setTextColor(COLOR_TEXT_PRIMARY);
          accountHeader.setTypeface(null, Typeface.BOLD);
          accountHeader.setPadding(0, 0, 0, 12);
          accountCard.addView(accountHeader);

          TextView accountEmail = new TextView(this);
          UserAuthManager authMgr = new UserAuthManager(this);
          String userEmail = isGuestMode ? "Guest Mode (Local Only)" : 
                             (authMgr.isLoggedIn() ? authMgr.getCurrentUserEmail() : "Not logged in");
          accountEmail.setText(userEmail);
          accountEmail.setTextSize(14);
          accountEmail.setTextColor(isGuestMode ? COLOR_WARNING : COLOR_TEXT_SECONDARY);
          accountCard.addView(accountEmail);

          // Guest mode: Show "Create Account" button
          if (isGuestMode) {
              Button createAccountBtn = new Button(this);
              createAccountBtn.setText("Create Account for Cloud Sync");
              createAccountBtn.setTextSize(14);
              createAccountBtn.setTextColor(0xFFFFFFFF);
              createAccountBtn.setBackground(createRoundedBackground(COLOR_PRIMARY, 14));
              createAccountBtn.setPadding(20, 14, 20, 14);
              LinearLayout.LayoutParams createAcctParams = new LinearLayout.LayoutParams(
                  LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
              createAcctParams.setMargins(0, 12, 0, 0);
              createAccountBtn.setLayoutParams(createAcctParams);
              createAccountBtn.setOnClickListener(v -> {
                  UserAuthManager guestAuthMgr = new UserAuthManager(this);
                  showSignupDialog(guestAuthMgr);
              });
              accountCard.addView(createAccountBtn);

              TextView guestNote = new TextView(this);
              guestNote.setText("Your trips are stored locally. Create an account to backup and sync across devices.");
              guestNote.setTextSize(12);
              guestNote.setTextColor(COLOR_TEXT_LIGHT);
              guestNote.setPadding(0, 8, 0, 0);
              accountCard.addView(guestNote);
          }

          // Cloud sync toggle (only for logged-in users, not guest mode)
          if (!isGuestMode) {
              LinearLayout syncRow = new LinearLayout(this);
              syncRow.setOrientation(LinearLayout.HORIZONTAL);
              syncRow.setGravity(Gravity.CENTER_VERTICAL);
              syncRow.setPadding(0, 12, 0, 0);

              TextView syncLabel = new TextView(this);
              syncLabel.setText("Cloud Sync");
              syncLabel.setTextSize(14);
              syncLabel.setTextColor(COLOR_TEXT_PRIMARY);
              syncLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
              syncRow.addView(syncLabel);

              apiToggle = new Button(this);
              // Initialize with correct state from preferences
              if (tripStorage.isApiSyncEnabled()) {
                  apiToggle.setText("ON");
                  apiToggle.setBackground(createRoundedBackground(COLOR_SUCCESS, 14));
              } else {
                  apiToggle.setText("OFF");
                  apiToggle.setBackground(createRoundedBackground(0xFF9CA3AF, 14));
              }
              apiToggle.setTextSize(12);
              apiToggle.setTextColor(0xFFFFFFFF);
              apiToggle.setPadding(16, 8, 16, 8);
              apiToggle.setOnClickListener(v -> toggleApiSync());
              syncRow.addView(apiToggle);

              accountCard.addView(syncRow);
          }

          settingsContent.addView(accountCard);

          // === APPEARANCE CARD ===
          LinearLayout appearanceCard = new LinearLayout(this);
          appearanceCard.setOrientation(LinearLayout.VERTICAL);
          appearanceCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          appearanceCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams appearCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          appearCardParams.setMargins(0, 0, 0, 16);
          appearanceCard.setLayoutParams(appearCardParams);
          appearanceCard.setElevation(4);

          TextView appearHeader = new TextView(this);
          appearHeader.setText("🎨 Appearance");
          appearHeader.setTextSize(16);
          appearHeader.setTextColor(COLOR_TEXT_PRIMARY);
          appearHeader.setTypeface(null, Typeface.BOLD);
          appearHeader.setPadding(0, 0, 0, 12);
          appearanceCard.addView(appearHeader);

          LinearLayout themeRow = new LinearLayout(this);
          themeRow.setOrientation(LinearLayout.HORIZONTAL);
          themeRow.setGravity(Gravity.CENTER_VERTICAL);

          TextView themeLabel = new TextView(this);
          themeLabel.setText("Dark Theme");
          themeLabel.setTextSize(14);
          themeLabel.setTextColor(COLOR_TEXT_PRIMARY);
          themeLabel.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
          themeRow.addView(themeLabel);

          Switch themeToggle = new Switch(this);
          themeToggle.setChecked(isDarkTheme);
          themeToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
              isDarkTheme = isChecked;
              saveThemePreference(isChecked);
              // Save current tab so we stay on Settings after recreate
              saveCurrentTabPreference();
              applyThemeColors();
              recreate();
          });
          themeRow.addView(themeToggle);

          appearanceCard.addView(themeRow);

          settingsContent.addView(appearanceCard);

          // === WORK HOURS CARD ===
          LinearLayout workHoursCard = new LinearLayout(this);
          workHoursCard.setOrientation(LinearLayout.VERTICAL);
          workHoursCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          workHoursCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams workCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          workCardParams.setMargins(0, 0, 0, 16);
          workHoursCard.setLayoutParams(workCardParams);
          workHoursCard.setElevation(4);

          TextView workHeader = new TextView(this);
          workHeader.setText("🕐 Work Hours");
          workHeader.setTextSize(16);
          workHeader.setTextColor(COLOR_TEXT_PRIMARY);
          workHeader.setTypeface(null, Typeface.BOLD);
          workHeader.setPadding(0, 0, 0, 8);
          workHoursCard.addView(workHeader);

          TextView workHint = new TextView(this);
          workHint.setText("Auto-classify trips during work hours as Business");
          workHint.setTextSize(12);
          workHint.setTextColor(COLOR_TEXT_SECONDARY);
          workHint.setPadding(0, 0, 0, 12);
          workHoursCard.addView(workHint);

          Button workHoursButton = new Button(this);
          workHoursButton.setText("Configure Work Hours");
          workHoursButton.setTextSize(14);
          workHoursButton.setTextColor(COLOR_PRIMARY);
          workHoursButton.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          workHoursButton.setPadding(20, 12, 20, 12);
          workHoursButton.setOnClickListener(v -> showConfigureWorkHoursDialog());
          workHoursCard.addView(workHoursButton);

          settingsContent.addView(workHoursCard);

          // === SUBSCRIPTION CARD ===
          LinearLayout subscriptionCard = new LinearLayout(this);
          subscriptionCard.setOrientation(LinearLayout.VERTICAL);
          subscriptionCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          subscriptionCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams subCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          subCardParams.setMargins(0, 0, 0, 16);
          subscriptionCard.setLayoutParams(subCardParams);
          subscriptionCard.setElevation(4);

          TextView subHeader = new TextView(this);
          subHeader.setText("Subscription");
          subHeader.setTextSize(16);
          subHeader.setTextColor(COLOR_TEXT_PRIMARY);
          subHeader.setTypeface(null, Typeface.BOLD);
          subHeader.setPadding(0, 0, 0, 12);
          subscriptionCard.addView(subHeader);

          String tier = tripStorage != null ? tripStorage.getSubscriptionTier() : "free";
          TextView subStatus = new TextView(this);
          boolean showUpgrade = false;
          if (tier.equals("free")) {
              subStatus.setText("Current Plan: FREE");
              subStatus.setTextColor(COLOR_TEXT_SECONDARY);
              showUpgrade = true;
          } else if (tier.equals("enterprise") || tier.equals("admin")) {
              subStatus.setText("Current Plan: ENTERPRISE ADMIN");
              subStatus.setTextColor(COLOR_PRIMARY);
          } else {
              subStatus.setText("Current Plan: PREMIUM");
              subStatus.setTextColor(COLOR_SUCCESS);
          }
          subStatus.setTextSize(14);
          subStatus.setPadding(0, 0, 0, 12);
          subscriptionCard.addView(subStatus);

          if (showUpgrade) {
              Button upgradeButton = new Button(this);
              upgradeButton.setText("Upgrade to Premium");
              upgradeButton.setTextSize(14);
              upgradeButton.setTextColor(0xFFFFFFFF);
              upgradeButton.setBackground(createRoundedBackground(COLOR_SUCCESS, 12));
              upgradeButton.setPadding(20, 12, 20, 12);
              upgradeButton.setOnClickListener(v -> showUpgradeOptionsDialog());
              subscriptionCard.addView(upgradeButton);
          }

          settingsContent.addView(subscriptionCard);

          // === IRS RATES CARD ===
          LinearLayout irsCard = new LinearLayout(this);
          irsCard.setOrientation(LinearLayout.VERTICAL);
          irsCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          irsCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams irsCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          irsCardParams.setMargins(0, 0, 0, 16);
          irsCard.setLayoutParams(irsCardParams);
          irsCard.setElevation(4);

          TextView irsHeader = new TextView(this);
          irsHeader.setText("💰 IRS Mileage Rates");
          irsHeader.setTextSize(16);
          irsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          irsHeader.setTypeface(null, Typeface.BOLD);
          irsHeader.setPadding(0, 0, 0, 8);
          irsCard.addView(irsHeader);

          TextView irsRatesText = new TextView(this);
          irsRatesText.setText(String.format("Business: $%.3f/mile\nMedical: $%.3f/mile\nCharity: $%.3f/mile",
              getIrsBusinessRate(), getIrsMedicalRate(), getIrsCharityRate()));
          irsRatesText.setTextSize(13);
          irsRatesText.setTextColor(COLOR_TEXT_SECONDARY);
          irsRatesText.setPadding(0, 0, 0, 12);
          irsCard.addView(irsRatesText);

          Button configIrsButton = new Button(this);
          configIrsButton.setText("Update IRS Rates");
          configIrsButton.setTextSize(14);
          configIrsButton.setTextColor(COLOR_PRIMARY);
          configIrsButton.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          configIrsButton.setPadding(20, 12, 20, 12);
          configIrsButton.setOnClickListener(v -> showUpdateIrsRatesDialog());
          irsCard.addView(configIrsButton);

          settingsContent.addView(irsCard);

          // === CATEGORIES CARD ===
          LinearLayout categoriesCard = new LinearLayout(this);
          categoriesCard.setOrientation(LinearLayout.VERTICAL);
          categoriesCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          categoriesCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams catCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          catCardParams.setMargins(0, 0, 0, 16);
          categoriesCard.setLayoutParams(catCardParams);
          categoriesCard.setElevation(4);

          TextView catHeader = new TextView(this);
          catHeader.setText("🏷️ Trip Categories");
          catHeader.setTextSize(16);
          catHeader.setTextColor(COLOR_TEXT_PRIMARY);
          catHeader.setTypeface(null, Typeface.BOLD);
          catHeader.setPadding(0, 0, 0, 8);
          categoriesCard.addView(catHeader);

          TextView catHint = new TextView(this);
          catHint.setText("Add custom categories for your trips");
          catHint.setTextSize(12);
          catHint.setTextColor(COLOR_TEXT_SECONDARY);
          catHint.setPadding(0, 0, 0, 12);
          categoriesCard.addView(catHint);

          Button manageCatButton = new Button(this);
          manageCatButton.setText("Manage Categories");
          manageCatButton.setTextSize(14);
          manageCatButton.setTextColor(COLOR_PRIMARY);
          manageCatButton.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          manageCatButton.setPadding(20, 12, 20, 12);
          manageCatButton.setOnClickListener(v -> showManageCategoriesDialog());
          categoriesCard.addView(manageCatButton);

          settingsContent.addView(categoriesCard);

          // === SUPPORT CARD ===
          LinearLayout supportCard = new LinearLayout(this);
          supportCard.setOrientation(LinearLayout.VERTICAL);
          supportCard.setBackground(createRoundedBackground(COLOR_CARD_BG, 16));
          supportCard.setPadding(20, 16, 20, 16);
          LinearLayout.LayoutParams supportCardParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          supportCardParams.setMargins(0, 0, 0, 16);
          supportCard.setLayoutParams(supportCardParams);
          supportCard.setElevation(4);

          TextView supportHeader = new TextView(this);
          supportHeader.setText("ℹ️ About & Support");
          supportHeader.setTextSize(16);
          supportHeader.setTextColor(COLOR_TEXT_PRIMARY);
          supportHeader.setTypeface(null, Typeface.BOLD);
          supportHeader.setPadding(0, 0, 0, 8);
          supportCard.addView(supportHeader);

          TextView appVersion = new TextView(this);
          String versionText = "MileTracker Pro";
          try {
              android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
              versionText = "MileTracker Pro v" + pInfo.versionName + " (" + pInfo.versionCode + ")";
          } catch (Exception e) {
              versionText = "MileTracker Pro";
          }
          appVersion.setText(versionText);
          appVersion.setTextSize(13);
          appVersion.setTextColor(COLOR_TEXT_SECONDARY);
          appVersion.setPadding(0, 0, 0, 12);
          supportCard.addView(appVersion);

          Button contactButton = new Button(this);
          contactButton.setText("Contact Support");
          contactButton.setTextSize(14);
          contactButton.setTextColor(COLOR_PRIMARY);
          contactButton.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          contactButton.setPadding(20, 12, 20, 12);
          LinearLayout.LayoutParams contactParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          contactParams.setMargins(0, 0, 0, 8);
          contactButton.setLayoutParams(contactParams);
          contactButton.setOnClickListener(v -> {
              Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
              emailIntent.setData(Uri.parse("mailto:support@miletrackerpro.com"));
              try {
                  startActivity(emailIntent);
              } catch (Exception e) {
                  Toast.makeText(this, "Email: support@miletrackerpro.com", Toast.LENGTH_LONG).show();
              }
          });
          supportCard.addView(contactButton);

          Button privacyButton = new Button(this);
          privacyButton.setText("Privacy Policy");
          privacyButton.setTextSize(14);
          privacyButton.setTextColor(COLOR_TEXT_SECONDARY);
          privacyButton.setBackgroundColor(0x00000000);
          privacyButton.setPadding(20, 8, 20, 8);
          privacyButton.setOnClickListener(v -> {
              Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://mileage-tracker-codenurse.replit.app/privacy-policy.html"));
              try {
                  startActivity(browserIntent);
              } catch (Exception e) {
                  Toast.makeText(this, "Unable to open browser", Toast.LENGTH_SHORT).show();
              }
          });
          supportCard.addView(privacyButton);

          // === FEEDBACK BUTTON ===
          Button feedbackBtn = new Button(this);
          feedbackBtn.setText("Send Feedback");
          feedbackBtn.setTextSize(14);
          feedbackBtn.setTextColor(COLOR_PRIMARY);
          feedbackBtn.setBackground(createRoundedBackground(COLOR_PRIMARY_LIGHT, 12));
          feedbackBtn.setPadding(20, 12, 20, 12);
          LinearLayout.LayoutParams feedbackBtnParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          feedbackBtnParams.setMargins(0, 8, 0, 0);
          feedbackBtn.setLayoutParams(feedbackBtnParams);
          feedbackBtn.setOnClickListener(v -> {
              if (feedbackManager != null) {
                  feedbackManager.showFeedbackForTesting(this);
              } else {
                  Toast.makeText(this, "Please log in to send feedback", Toast.LENGTH_SHORT).show();
              }
          });
          supportCard.addView(feedbackBtn);

          settingsContent.addView(supportCard);

          // === LOGOUT BUTTON ===
          Button logoutButton = new Button(this);
          logoutButton.setText("Log Out");
          logoutButton.setTextSize(14);
          logoutButton.setTextColor(COLOR_ERROR);
          logoutButton.setBackground(createRoundedBackground(COLOR_CARD_BG, 12));
          logoutButton.setPadding(20, 12, 20, 12);
          LinearLayout.LayoutParams logoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          logoutParams.setMargins(0, 20, 0, 0);
          logoutButton.setLayoutParams(logoutParams);
          logoutButton.setOnClickListener(v -> {
              new AlertDialog.Builder(this)
                  .setTitle("Log Out")
                  .setMessage("Are you sure you want to log out?")
                  .setPositiveButton("Log Out", (dialog, which) -> {
                      UserAuthManager logoutAuth = new UserAuthManager(this);
                      logoutAuth.logout();
                      SharedPreferences appPrefs = getSharedPreferences("app_settings", MODE_PRIVATE);
                      appPrefs.edit().remove("guest_mode").apply();
                      Intent restartIntent = new Intent(this, MainActivity.class);
                      restartIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                      startActivity(restartIntent);
                      finish();
                  })
                  .setNegativeButton("Cancel", null)
                  .show();
          });
          settingsContent.addView(logoutButton);

          // Create scroll view
          settingsScroll = new ScrollView(this);
          settingsScroll.addView(settingsContent);
      }

      // Helper method to create rounded background drawable
      private GradientDrawable createRoundedBackground(int color, int radiusDp) {
          GradientDrawable drawable = new GradientDrawable();
          drawable.setShape(GradientDrawable.RECTANGLE);
          drawable.setColor(color);
          drawable.setCornerRadius(dpToPx(radiusDp));
          return drawable;
      }

      // Helper method to convert dp to pixels
      private int dpToPx(int dp) {
          float density = getResources().getDisplayMetrics().density;
          return Math.round(dp * density);
      }
  }
