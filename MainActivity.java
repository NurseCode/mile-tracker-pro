          package com.miletrackerpro.app;

          import android.Manifest;
          import android.app.ActivityManager;
          import android.app.AlertDialog;
          import android.app.DatePickerDialog;
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
          import android.os.Build;
          import android.os.Bundle;
          import android.os.Handler;
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

          import com.miletrackerpro.app.auth.UserAuthManager;
          import com.miletrackerpro.app.services.AutoDetectionService;
          import com.miletrackerpro.app.services.ManualTripService;
          import com.miletrackerpro.app.services.BluetoothVehicleService;
          import com.miletrackerpro.app.services.BluetoothWorker;
          import com.miletrackerpro.app.storage.Trip;
          import com.miletrackerpro.app.storage.TripStorage;
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

              // Main layout
              private LinearLayout mainContentLayout;
              private LinearLayout bottomTabLayout;

              // Tab content
              private LinearLayout dashboardContent;
              private ScrollView dashboardScroll;
              private LinearLayout tripsContent;
              private LinearLayout classifyContent;
              private LinearLayout categorizedContent;
              private Button homeTabButton;
              private Button categorizedTabButton;
              private Button classifyMergeButton;
              private String currentTab = "home";

              // Dashboard UI Elements
              private TextView statusText;
              private TextView speedText;
              private TextView realTimeDistanceText;
              private TextView statsText;
              private TextView bluetoothStatusText;
              private TextView connectedVehicleText;
              private BroadcastReceiver bluetoothUpdateReceiver;
              private Button autoToggle;
              private Button apiToggle;
              private Button manualStartButton;
              private Button manualStopButton;
              private Button addTripButton;
              private Button periodButton;
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
              private boolean bluetoothServiceStarted = false;
              private boolean autoDetectionEnabled = false;
              private boolean manualTripInProgress = false;
              
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

              @Override
              protected void onCreate(Bundle savedInstanceState) {
                  super.onCreate(savedInstanceState);

                  try {
                      Log.d(TAG, "MainActivity onCreate starting - v4.9.147 BLUETOOTH VEHICLE RECOGNITION...");

                      tripStorage = new TripStorage(this);
                      locationPrefs = getSharedPreferences("location_classification", MODE_PRIVATE);
                      initializeGestureDetector();
                      createCleanLayout();
                      initializeGPS();
                      setupSpeedMonitoring();
                      requestPermissions();
                      updateStats();
                      registerBroadcastReceiver();
                      registerBluetoothUpdateReceiver();
                      initializeBluetoothBackgroundService();
                      restoreAutoDetectionState();

                      // TRIGGER DOWNLOAD OF ALL USER TRIPS
                      triggerAllUserTripsDownload();

                      Log.d(TAG, "MainActivity onCreate completed successfully");

                  } catch (Exception e) {
                      Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
                      Toast.makeText(this, "App initialization error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }

              @Override
              protected void onResume() {
                  super.onResume();
                  // Refresh trips from API when user returns to app
                  if (tripStorage.isApiSyncEnabled()) {
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
              }

              // Download ALL user trips (not just device-specific)
              private void triggerAllUserTripsDownload() {
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
                      mainLayout.setBackgroundColor(0xFFF5F5F5);

                      // MAIN HEADER with car emoji, app title, and settings gear
                      LinearLayout mainHeader = new LinearLayout(this);
                      mainHeader.setOrientation(LinearLayout.HORIZONTAL);
                      mainHeader.setBackgroundColor(0xFF667eea); // Periwinkle matching active tab
                      mainHeader.setPadding(20, 15, 20, 15);
                      mainHeader.setGravity(Gravity.CENTER_VERTICAL);
                      
                      TextView mainHeaderText = new TextView(this);
                      mainHeaderText.setText("🚗 MileTracker Pro");
                      mainHeaderText.setTextSize(16); // Reduced from 20 to 16 to prevent wrapping
                      mainHeaderText.setTextColor(0xFFFFFFFF); // White text
                      mainHeaderText.setTypeface(null, Typeface.BOLD);
                      
                      LinearLayout.LayoutParams headerTextParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                      mainHeaderText.setLayoutParams(headerTextParams);
                      mainHeader.addView(mainHeaderText);
                      
                      // Settings gear icon in top-right corner
                      Button settingsButton = new Button(this);
                      settingsButton.setText("⚙");
                      settingsButton.setTextSize(18);
                      settingsButton.setTextColor(0xFFFFFFFF); // White gear
                      settingsButton.setBackgroundColor(0x00000000); // Transparent background
                      settingsButton.setPadding(15, 8, 15, 8);
                      LinearLayout.LayoutParams settingsParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                      settingsButton.setLayoutParams(settingsParams);
                      
                      settingsButton.setOnClickListener(v -> {
                          showSettingsDialog();
                      });
                      
                      mainHeader.addView(settingsButton);

                      // MAIN CONTENT AREA
                      mainContentLayout = new LinearLayout(this);
                      mainContentLayout.setOrientation(LinearLayout.VERTICAL);
                      LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
                          LinearLayout.LayoutParams.MATCH_PARENT, 
                          0, 
                          1.0f
                      );
                      mainContentLayout.setLayoutParams(contentParams);

                      // BOTTOM TAB BAR
                      bottomTabLayout = new LinearLayout(this);
                      bottomTabLayout.setOrientation(LinearLayout.HORIZONTAL);
                      bottomTabLayout.setBackgroundColor(0xFFFFFFFF);
                      bottomTabLayout.setPadding(0, 10, 0, 20);
                      bottomTabLayout.setGravity(Gravity.CENTER);

                      // HOME TAB BUTTON
                      homeTabButton = new Button(this);
                      homeTabButton.setText("🏠\nHome");
                      homeTabButton.setTextSize(12);
                      homeTabButton.setBackgroundColor(0xFF667eea); // MUTED PERIWINKLE
                      homeTabButton.setTextColor(0xFFFFFFFF);
                      homeTabButton.setOnClickListener(v -> switchToTab("home"));
                      LinearLayout.LayoutParams homeParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
                      homeParams.setMargins(20, 0, 10, 0);
                      homeTabButton.setLayoutParams(homeParams);
                      bottomTabLayout.addView(homeTabButton);

                      // TRIPS TAB BUTTON (second tab - all trips with category filtering)
                      categorizedTabButton = new Button(this);
                      categorizedTabButton.setText("📋\nTrips");
                      categorizedTabButton.setTextSize(12);
                      categorizedTabButton.setBackgroundColor(0xFF9CA3AF); // MUTED GRAY
                      categorizedTabButton.setTextColor(0xFFFFFFFF);
                      categorizedTabButton.setOnClickListener(v -> switchToTab("categorized"));
                      LinearLayout.LayoutParams categorizedParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
                      categorizedParams.setMargins(10, 0, 20, 0);
                      categorizedTabButton.setLayoutParams(categorizedParams);
                      bottomTabLayout.addView(categorizedTabButton);

                      // CREATE TAB CONTENT
                      createDashboardContent();
                      createCategorizedContent();
                      
                      // Create persistent ScrollView for dashboard
                      dashboardScroll = new ScrollView(this);
                      dashboardScroll.addView(dashboardContent);

                      // Add to main layout in correct order
                      mainLayout.addView(mainHeader);
                      mainLayout.addView(mainContentLayout);
                      mainLayout.addView(bottomTabLayout);

                      switchToTab("home");
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



                  // Status
                  statusText = new TextView(this);
                  statusText.setText("Initializing...");
                  statusText.setTextSize(14);
                  statusText.setTextColor(0xFF495057);
                  statusText.setPadding(15, 15, 15, 15);
                  statusText.setBackgroundColor(0xFFe3f2fd);
                  dashboardContent.addView(statusText);

                  // Speed
                  speedText = new TextView(this);
                  speedText.setText("Speed: -- mph");
                  speedText.setTextSize(12);
                  speedText.setTextColor(0xFF6C757D);
                  speedText.setPadding(15, 5, 15, 5);
                  dashboardContent.addView(speedText);
                  
                  // Real-time Distance
                  realTimeDistanceText = new TextView(this);
                  realTimeDistanceText.setText("Distance: 0.0 miles");
                  realTimeDistanceText.setTextSize(12);
                  realTimeDistanceText.setTextColor(0xFF6C757D);
                  realTimeDistanceText.setPadding(15, 5, 15, 10);
                  dashboardContent.addView(realTimeDistanceText);



                  // AUTO DETECTION SECTION
                  TextView autoSectionHeader = new TextView(this);
                  autoSectionHeader.setText("🚗 Auto Detection");
                  autoSectionHeader.setTextSize(16);
                  autoSectionHeader.setTextColor(0xFF495057);
                  autoSectionHeader.setPadding(0, 10, 0, 5);
                  dashboardContent.addView(autoSectionHeader);

                  autoToggle = new Button(this);
                  autoToggle.setText("Auto Detection: OFF");
                  autoToggle.setTextSize(14);
                  autoToggle.setBackgroundColor(0xFF9CA3AF);
                  autoToggle.setTextColor(0xFFFFFFFF);
                  autoToggle.setOnClickListener(v -> toggleAutoDetection());
                  dashboardContent.addView(autoToggle);

                  // BLUETOOTH STATUS SECTION
                  TextView bluetoothStatusLabel = new TextView(this);
                  bluetoothStatusLabel.setText("📶 Bluetooth Status");
                  bluetoothStatusLabel.setTextSize(16);
                  bluetoothStatusLabel.setTextColor(0xFF495057);
                  bluetoothStatusLabel.setPadding(0, 10, 0, 5);
                  dashboardContent.addView(bluetoothStatusLabel);

                  bluetoothStatusText = new TextView(this);
                  bluetoothStatusText.setText("🔘 Bluetooth: Checking...");
                  bluetoothStatusText.setTextSize(14);
                  bluetoothStatusText.setTextColor(0xFF6C757D);
                  bluetoothStatusText.setPadding(10, 5, 10, 5);
                  bluetoothStatusText.setBackgroundColor(0xFFF8F9FA);
                  LinearLayout.LayoutParams bluetoothParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  bluetoothParams.setMargins(0, 5, 0, 5);
                  bluetoothStatusText.setLayoutParams(bluetoothParams);
                  
                  // Make Bluetooth status clickable for diagnostics
                  bluetoothStatusText.setOnClickListener(v -> showBluetoothDiagnostics());
                  
                  dashboardContent.addView(bluetoothStatusText);

                  connectedVehicleText = new TextView(this);
                  connectedVehicleText.setText("🚗 Vehicle: None connected");
                  connectedVehicleText.setTextSize(14);
                  connectedVehicleText.setTextColor(0xFF6C757D);
                  connectedVehicleText.setPadding(10, 5, 10, 5);
                  connectedVehicleText.setBackgroundColor(0xFFF8F9FA);
                  LinearLayout.LayoutParams vehicleParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  vehicleParams.setMargins(0, 5, 0, 10);
                  connectedVehicleText.setLayoutParams(vehicleParams);
                  dashboardContent.addView(connectedVehicleText);

                  // MANUAL CONTROLS SECTION
                  TextView manualSectionHeader = new TextView(this);
                  manualSectionHeader.setText("✋ Manual Trip Controls");
                  manualSectionHeader.setTextSize(16);
                  manualSectionHeader.setTextColor(0xFF495057);
                  manualSectionHeader.setPadding(0, 10, 0, 5);
                  dashboardContent.addView(manualSectionHeader);

                  LinearLayout manualButtonLayout = new LinearLayout(this);
                  manualButtonLayout.setOrientation(LinearLayout.HORIZONTAL);

                  manualStartButton = new Button(this);
                  manualStartButton.setText("START");
                  manualStartButton.setTextSize(12);
                  manualStartButton.setBackgroundColor(0xFF28a745);
                  manualStartButton.setTextColor(0xFFFFFFFF);
                  manualStartButton.setOnClickListener(v -> startManualTrip());
                  LinearLayout.LayoutParams startParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
                  startParams.setMargins(0, 0, 5, 0);
                  manualStartButton.setLayoutParams(startParams);
                  manualButtonLayout.addView(manualStartButton);

                  manualStopButton = new Button(this);
                  manualStopButton.setText("STOP");
                  manualStopButton.setTextSize(12);
                  manualStopButton.setBackgroundColor(0xFFdc3545);
                  manualStopButton.setTextColor(0xFFFFFFFF);
                  manualStopButton.setEnabled(false);
                  manualStopButton.setOnClickListener(v -> stopManualTrip());
                  LinearLayout.LayoutParams stopParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
                  stopParams.setMargins(5, 0, 0, 0);
                  manualStopButton.setLayoutParams(stopParams);
                  manualButtonLayout.addView(manualStopButton);

                  dashboardContent.addView(manualButtonLayout);

                  // ADD TRIP MANUALLY
                  addTripButton = new Button(this);
                  addTripButton.setText("➕ Add Trip");
                  addTripButton.setTextSize(14);
                  addTripButton.setBackgroundColor(0xFF667eea); // MUTED PERIWINKLE
                  addTripButton.setTextColor(0xFFFFFFFF);
                  addTripButton.setOnClickListener(v -> showAddTripDialog());
                  LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  addParams.setMargins(0, 10, 0, 0);
                  addTripButton.setLayoutParams(addParams);
                  dashboardContent.addView(addTripButton);



                  // Period selector button
                  periodButton = new Button(this);
                  periodButton.setText("View: " + getPeriodLabel() + " (tap to change)");
                  periodButton.setTextSize(12);
                  periodButton.setBackgroundColor(0xFFE3F2FD);
                  periodButton.setTextColor(0xFF1976D2);
                  periodButton.setPadding(10, 5, 10, 5);
                  periodButton.setOnClickListener(v -> showPeriodSelector());
                  dashboardContent.addView(periodButton);

                  // Stats - Enhanced visibility
                  statsText = new TextView(this);
                  statsText.setText("Loading stats...");
                  statsText.setTextSize(14);
                  statsText.setTextColor(0xFF495057);
                  statsText.setPadding(15, 15, 15, 15);
                  statsText.setBackgroundColor(0xFFfafafa);
                  LinearLayout.LayoutParams statsParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  statsParams.setMargins(0, 10, 0, 10);
                  statsText.setLayoutParams(statsParams);
                  dashboardContent.addView(statsText);

                  // Recent Trips
                  TextView recentTripsHeader = new TextView(this);
                  recentTripsHeader.setText("📋 Recent Trips");
                  recentTripsHeader.setTextSize(16);
                  recentTripsHeader.setTextColor(Color.WHITE);
                  recentTripsHeader.setPadding(16, 16, 16, 16);
                  recentTripsHeader.setTypeface(null, Typeface.BOLD);
                  recentTripsHeader.setBackgroundColor(Color.parseColor("#667eea"));
                  dashboardContent.addView(recentTripsHeader);

                  ScrollView recentTripsScroll = new ScrollView(this);
                  recentTripsLayout = new LinearLayout(this);
                  recentTripsLayout.setOrientation(LinearLayout.VERTICAL);
                  recentTripsScroll.addView(recentTripsLayout);

                  LinearLayout.LayoutParams recentScrollParams = new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.MATCH_PARENT, 
                      500
                  );
                  recentTripsScroll.setLayoutParams(recentScrollParams);
                  dashboardContent.addView(recentTripsScroll);
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
                  refreshButton.setTextSize(11);
                  refreshButton.setBackgroundColor(0xFF6C757D); // Muted gray color
                  refreshButton.setTextColor(0xFFFFFFFF);
                  refreshButton.setPadding(15, 0, 15, 0);
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
                  classifyMergeButton.setBackgroundColor(0xFF007bff);
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
                  exportButton.setTextSize(11);
                  exportButton.setBackgroundColor(0xFF28a745);
                  exportButton.setTextColor(0xFFFFFFFF);
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
                          Toast.makeText(MainActivity.this, "📋 Select trips to merge, then tap Merge Trips again (or long-press to cancel)", Toast.LENGTH_SHORT).show();
                      } else {
                          // In merge mode - show options
                          if (selectedTripIds.size() < 2) {
                              // Show cancel option when no trips selected
                              new AlertDialog.Builder(MainActivity.this)
                                  .setTitle("🔀 Merge Options")
                                  .setMessage("Select at least 2 trips to merge, or cancel to exit merge mode.")
                                  .setPositiveButton("❌ Cancel Merge", (dialog, which) -> {
                                      // Cancel merge mode
                                      mergeMode = false;
                                      selectedTripIds.clear();
                                      classifyMergeButton.setText("MERGE");
                                      updateClassifyTrips();
                                      Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
                                  })
                                  .setNegativeButton("Continue", null)
                                  .show();
                              return;
                          }
                          
                          // Confirm merge
                          new AlertDialog.Builder(MainActivity.this)
                              .setTitle("🔀 Confirm Merge")
                              .setMessage("Merge " + selectedTripIds.size() + " selected trips?\n\nThis will combine them into one trip and delete the originals.")
                              .setPositiveButton("✅ Merge", (dialog, which) -> {
                                  executeClassifyMerge();
                              })
                              .setNegativeButton("❌ Cancel", (dialog, which) -> {
                                  // Cancel merge mode
                                  mergeMode = false;
                                  selectedTripIds.clear();
                                  classifyMergeButton.setText("MERGE");
                                  updateClassifyTrips();
                                  Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
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
                          Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
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
                  headerText.setText("Categorized Trips");
                  headerText.setTextSize(18);
                  headerText.setTextColor(0xFF333333);
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
                  refreshButton.setTextSize(11);
                  refreshButton.setBackgroundColor(0xFF6C757D); // Muted gray color
                  refreshButton.setTextColor(0xFFFFFFFF);
                  refreshButton.setPadding(15, 0, 15, 0);
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
                  mergeButton.setTextSize(11);
                  mergeButton.setBackgroundColor(0xFF007bff);
                  mergeButton.setTextColor(0xFFFFFFFF);
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
                  exportButton.setTextSize(11);
                  exportButton.setBackgroundColor(0xFF28a745);
                  exportButton.setTextColor(0xFFFFFFFF);
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
                          Toast.makeText(MainActivity.this, "📋 Select trips to merge, then tap Merge Trips again (or long-press to cancel)", Toast.LENGTH_SHORT).show();
                      } else {
                          // In merge mode - show options
                          if (selectedTripIds.size() < 2) {
                              // Show cancel option when no trips selected
                              new AlertDialog.Builder(MainActivity.this)
                                  .setTitle("🔀 Merge Options")
                                  .setMessage("Select at least 2 trips to merge, or cancel to exit merge mode.")
                                  .setPositiveButton("❌ Cancel Merge", (dialog, which) -> {
                                      // Cancel merge mode
                                      mergeMode = false;
                                      selectedTripIds.clear();
                                      mergeButton.setText("MERGE");
                                      updateCategorizedTrips();
                                      Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
                                  })
                                  .setNegativeButton("Continue", null)
                                  .show();
                              return;
                          }
                          
                          // Confirm merge
                          new AlertDialog.Builder(MainActivity.this)
                              .setTitle("🔀 Confirm Merge")
                              .setMessage("Merge " + selectedTripIds.size() + " selected trips?\n\nThis will combine them into one trip and delete the originals.")
                              .setPositiveButton("✅ Merge", (dialog, which) -> {
                                  executeCategorizedMerge();
                              })
                              .setNegativeButton("❌ Cancel", (dialog, which) -> {
                                  // Cancel merge mode
                                  mergeMode = false;
                                  selectedTripIds.clear();
                                  mergeButton.setText("MERGE");
                                  updateCategorizedTrips();
                                  Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
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
                          Toast.makeText(MainActivity.this, "Merge cancelled", Toast.LENGTH_SHORT).show();
                          return true;
                      }
                      return false;
                  });
                  
                  categorizedContent.addView(buttonContainer);

                  // Search and filter controls - compact layout
                  LinearLayout searchSortLayout = new LinearLayout(this);
                  searchSortLayout.setOrientation(LinearLayout.VERTICAL);
                  searchSortLayout.setPadding(10, 5, 10, 10);
                  
                  // Search box
                  LinearLayout searchRowLayout = new LinearLayout(this);
                  searchRowLayout.setOrientation(LinearLayout.HORIZONTAL);
                  searchRowLayout.setGravity(Gravity.CENTER_VERTICAL);
                  searchRowLayout.setPadding(0, 0, 0, 5);
                  
                  TextView searchLabel = new TextView(this);
                  searchLabel.setText("Search:");
                  searchLabel.setTextSize(11);
                  searchLabel.setTextColor(0xFF333333);
                  searchLabel.setPadding(0, 0, 10, 0);
                  searchRowLayout.addView(searchLabel);
                  
                  EditText searchBox = new EditText(this);
                  searchBox.setHint("Address, distance, category...");
                  searchBox.setTextSize(11);
                  searchBox.setPadding(8, 4, 8, 4);
                  searchBox.setBackgroundColor(0xFFFFFFFF);
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
                  sortLabel.setTextColor(0xFF333333);
                  sortLabel.setPadding(0, 0, 5, 0);
                  controlsRowLayout.addView(sortLabel);
                  
                  Button sortButton = new Button(this);
                  sortButton.setText("Newest");
                  sortButton.setTextSize(10);
                  sortButton.setBackgroundColor(0xFF667eea);
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
                  categoryLabel.setTextColor(0xFF333333);
                  categoryLabel.setPadding(0, 0, 5, 0);
                  controlsRowLayout.addView(categoryLabel);
                  
                  Button categoryFilterButton = new Button(this);
                  categoryFilterButton.setText("All");
                  categoryFilterButton.setTextSize(10);
                  categoryFilterButton.setBackgroundColor(0xFF9CA3AF);
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
                  try {
                      boolean currentState = tripStorage.isApiSyncEnabled();
                      tripStorage.setApiSyncEnabled(!currentState);
                      updateApiToggleUI();
                      updateStats();

                      String message = tripStorage.isApiSyncEnabled() ? 
                          "API sync ON - downloading ALL your trips..." : 
                          "API sync OFF - local storage only";
                      Toast.makeText(this, message, Toast.LENGTH_SHORT).show();

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
                          apiToggle.setText("🌐 API ON");
                          apiToggle.setBackgroundColor(0xFF28a745);
                          apiToggle.setTextColor(0xFFFFFFFF);
                      } else {
                          apiToggle.setText("🌐 API OFF");
                          apiToggle.setBackgroundColor(0xFF9CA3AF);
                          apiToggle.setTextColor(0xFFFFFFFF);
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error updating API toggle UI: " + e.getMessage(), e);
                  }
              }

              private void switchToTab(String tabName) {
                  try {
                      currentTab = tabName;
                      mainContentLayout.removeAllViews();

                      if ("home".equals(tabName)) {
                          // Use persistent ScrollView for dashboard
                          mainContentLayout.addView(dashboardScroll);
                          homeTabButton.setBackgroundColor(0xFF667eea); // MUTED PERIWINKLE ACTIVE
                          categorizedTabButton.setBackgroundColor(0xFF9CA3AF); // MUTED GRAY INACTIVE
                          updateRecentTrips();
                      } else if ("categorized".equals(tabName)) {
                          mainContentLayout.addView(categorizedContent);
                          homeTabButton.setBackgroundColor(0xFF9CA3AF); // MUTED GRAY INACTIVE
                          categorizedTabButton.setBackgroundColor(0xFF667eea); // MUTED PERIWINKLE ACTIVE
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
                      categorizedTripsContainer.removeAllViews();
                      
                      List<Trip> allTrips = tripStorage.getAllTrips();
                      List<Trip> categorizedTrips = new ArrayList<>();
                      
                      // Filter trips based on selected category
                      for (Trip trip : allTrips) {
                          if (trip.getCategory() != null && !trip.getCategory().isEmpty()) {
                              if ("All".equals(currentCategoryFilter) || 
                                  currentCategoryFilter.equals(trip.getCategory())) {
                                  categorizedTrips.add(trip);
                              }
                          }
                      }
                      
                      // Apply search filter
                      if (!currentSearchQuery.isEmpty()) {
                          List<Trip> filteredTrips = new ArrayList<>();
                          String query = currentSearchQuery.toLowerCase();
                          for (Trip trip : categorizedTrips) {
                              String startAddr = trip.getStartAddress() != null ? trip.getStartAddress().toLowerCase() : "";
                              String endAddr = trip.getEndAddress() != null ? trip.getEndAddress().toLowerCase() : "";
                              String clientName = trip.getClientName() != null ? trip.getClientName().toLowerCase() : "";
                              String notes = trip.getNotes() != null ? trip.getNotes().toLowerCase() : "";
                              String category = trip.getCategory() != null ? trip.getCategory().toLowerCase() : "";
                              
                              if (startAddr.contains(query) || endAddr.contains(query) || 
                                  clientName.contains(query) || notes.contains(query) || category.contains(query)) {
                                  filteredTrips.add(trip);
                              }
                          }
                          categorizedTrips = filteredTrips;
                      }
                      
                      // Apply sorting
                      switch (currentSortOrder) {
                          case "Newest":
                              categorizedTrips.sort((a, b) -> Long.compare(b.getStartTime(), a.getStartTime()));
                              break;
                          case "Oldest":
                              categorizedTrips.sort((a, b) -> Long.compare(a.getStartTime(), b.getStartTime()));
                              break;
                          case "Distance":
                              categorizedTrips.sort((a, b) -> Double.compare(b.getDistance(), a.getDistance()));
                              break;
                          case "Duration":
                              categorizedTrips.sort((a, b) -> Long.compare(b.getDuration(), a.getDuration()));
                              break;
                          default:
                              categorizedTrips.sort((a, b) -> Long.compare(b.getStartTime(), a.getStartTime()));
                              break;
                      }
                      
                      if (categorizedTrips.isEmpty()) {
                          TextView emptyText = new TextView(this);
                          emptyText.setText("No categorized trips found.\nSwipe trips left/right in the 'Classify' tab to categorize them.");
                          emptyText.setTextSize(16);
                          emptyText.setTextColor(0xFF666666);
                          emptyText.setGravity(Gravity.CENTER);
                          emptyText.setPadding(0, 40, 0, 40);
                          categorizedTripsContainer.addView(emptyText);
                          return;
                      }
                      
                      // Create trip cards
                      for (Trip trip : categorizedTrips) {
                          addTripCard(categorizedTripsContainer, trip, false);
                      }
                      
                  } catch (Exception e) {
                      Log.e("MainActivity", "Error updating categorized trips", e);
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
                              noTripsText.setText("No trips recorded yet.\n\n✅ NEW FEATURE v4.9.71:\n• DATABASE FIELD MAPPING FIXED\n• PROPER TIMESTAMP PARSING\n• AUTO-DETECTION STATUS RESTORED\n• DURATION & DATE CALCULATIONS\n• ENCRYPTED DATA HANDLING\n\nTurn ON API sync to see ALL your historic trips!");
                          } else {
                              noTripsText.setText("🔍 No trips match your search\n\nTry different keywords or change the category filter");
                          }
                          noTripsText.setTextSize(14);
                          noTripsText.setTextColor(0xFF6C757D);
                          noTripsText.setPadding(15, 30, 15, 15);
                          allTripsLayout.addView(noTripsText);
                      } else {
                          // Add result count header
                          TextView tripCount = new TextView(this);
                          tripCount.setText(String.format("📊 Showing %d trip%s", trips.size(), trips.size() == 1 ? "" : "s"));
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
                      Toast.makeText(this, "✅ Successfully merged " + selectedTripIds.size() + " trips!", Toast.LENGTH_SHORT).show();
                      
                      // Exit merge mode and refresh
                      mergeMode = false;
                      selectedTripIds.clear();
                      updateAllTrips();
                      updateStats();
                      
                      // Reset merge button - for classify tab only
                      Button mergeButton = (Button) ((LinearLayout) tripsContent.getChildAt(0)).getChildAt(1);
                      mergeButton.setText("🔀 Merge");
                      mergeButton.setBackgroundColor(0xFF007bff);
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error merging trips: " + e.getMessage(), e);
                      Toast.makeText(this, "❌ Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }

              private void executeCategorizedMerge() {
                  try {
                      tripStorage.mergeUserTrips(selectedTripIds);
                      Toast.makeText(this, "✅ Successfully merged " + selectedTripIds.size() + " trips!", Toast.LENGTH_SHORT).show();
                      
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
                      Toast.makeText(this, "❌ Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }

              private void executeClassifyMerge() {
                  try {
                      tripStorage.mergeUserTrips(selectedTripIds);
                      Toast.makeText(this, "✅ Successfully merged " + selectedTripIds.size() + " trips!", Toast.LENGTH_SHORT).show();
                      
                      // Exit merge mode and refresh
                      mergeMode = false;
                      selectedTripIds.clear();
                      
                      // Reset merge button text
                      classifyMergeButton.setText("MERGE");
                      
                      updateClassifyTrips();
                      updateStats();
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error merging trips: " + e.getMessage(), e);
                      Toast.makeText(this, "❌ Error merging trips: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }

              private void addTripCard(LinearLayout parentLayout, Trip trip, boolean compact) {
                  try {
                      Log.d(TAG, "Adding trip card for: " + trip.getStartAddress() + " -> " + trip.getEndAddress());
                      
                      // Create container for checkbox + trip info
                      LinearLayout cardContainer = new LinearLayout(this);
                      cardContainer.setOrientation(LinearLayout.VERTICAL); // Changed to vertical for better icon attachment
                      cardContainer.setPadding(15, 15, 15, 15);
                      
                      // Add border for clear card separation with special styling for uncategorized trips
                      GradientDrawable border = new GradientDrawable();
                      
                      // Check if trip is uncategorized and apply white background with thicker border
                      if ("Uncategorized".equals(trip.getCategory())) {
                          cardContainer.setBackgroundColor(0xFFffffff); // Bright white background for uncategorized
                          border.setColor(0xFFffffff);
                          border.setStroke(3, 0xFF007bff); // Thicker blue border for uncategorized trips
                      } else {
                          cardContainer.setBackgroundColor(0xFFffffff); // White background for categorized trips
                          border.setColor(0xFFffffff);
                          border.setStroke(2, 0xFFd0d0d0); // Normal border for categorized trips
                      }
                      
                      border.setCornerRadius(8);
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
                                      mergeButton.setText("✅ Execute Merge (" + selectedTripIds.size() + ")");
                                  } else if (currentTab.equals("classify")) {
                                      classifyMergeButton.setText("✅ Execute Merge (" + selectedTripIds.size() + ")");
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
                      String tripType = trip.isAutoDetected() ? "🤖" : "✋";
                      String apiStatus = "";

                      if (compact) {
                          tripView.setText(String.format(
                              "%s • %s • %.1f mi",
                              trip.getCompactDateTime(),
                              tripType,
                              trip.getDistance()
                          ));
                          tripView.setTextSize(11);
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
                          
                          tripDetails.append(String.format(
                              "%s • %s\n%.2f miles • %s • %s%s\nFrom: %s\nTo: %s",
                              tripType,
                              trip.getFormattedDateTime(),
                              trip.getDistance(),
                              trip.getFormattedDuration(),
                              trip.getCategory(),
                              swipeHint,
                              trip.getStartAddress() != null ? trip.getStartAddress() : "Unknown",
                              trip.getEndAddress() != null ? trip.getEndAddress() : "Unknown"
                          ));

                          // ADD CLIENT AND NOTES TO TRIP DISPLAY
                          if (trip.getClientName() != null && !trip.getClientName().trim().isEmpty()) {
                              tripDetails.append("\nClient: ").append(trip.getClientName());
                          }
                          if (trip.getNotes() != null && !trip.getNotes().trim().isEmpty()) {
                              tripDetails.append("\nNotes: ").append(trip.getNotes());
                          }
                          
                          // ADD DIAGNOSTIC INFORMATION
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
                          
                          // Sync status (simple check - if trip has proper formatting, likely synced)
                          String syncStatus = "Unknown";
                          if (trip.getMethod() != null && !trip.getMethod().isEmpty()) {
                              syncStatus = "API Ready";
                          } else {
                              syncStatus = "Local Only";
                          }
                          tripDetails.append("Sync: ").append(syncStatus).append("]");
                          
                          // Swipe instructions removed - they're already shown at the top of the page

                          tripView.setText(tripDetails.toString());
                          tripView.setTextSize(12);
                      }

                      tripView.setTextColor(0xFF495057);
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
                                                      performSwipeClassification(trip, "Business", 0xFF28A745);
                                                  } else {
                                                      // Left swipe - Personal
                                                      Log.d(TAG, "Left swipe detected - Personal");
                                                      performSwipeClassification(trip, "Personal", 0xFF0044FF);
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
                          iconsRow.setBackgroundColor(0xFFF5F5F5); // Light gray background to visually attach icons to trip
                          
                          // Create rounded corners for icon area
                          GradientDrawable iconBorder = new GradientDrawable();
                          iconBorder.setColor(0xFFF5F5F5);
                          iconBorder.setCornerRadius(6);
                          iconsRow.setBackground(iconBorder);
                          
                          LinearLayout.LayoutParams iconsRowParams = new LinearLayout.LayoutParams(
                              LinearLayout.LayoutParams.MATCH_PARENT,
                              LinearLayout.LayoutParams.WRAP_CONTENT
                          );
                          iconsRowParams.setMargins(0, 15, 0, 0); // Top margin to separate from trip details
                          iconsRow.setLayoutParams(iconsRowParams);
                          
                          // Edit icon - clean, no background
                          TextView editIcon = new TextView(this);
                          editIcon.setText("✏️");
                          editIcon.setTextSize(24);
                          editIcon.setPadding(12, 8, 12, 8);
                          editIcon.setGravity(Gravity.CENTER);
                          editIcon.setClickable(true);
                          editIcon.setOnClickListener(v -> showEditTripDialog(trip));
                          
                          LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(
                              LinearLayout.LayoutParams.WRAP_CONTENT,
                              LinearLayout.LayoutParams.WRAP_CONTENT
                          );
                          iconParams.setMargins(15, 0, 15, 0); // Space between icons
                          
                          // Split icon - clean, no background
                          TextView splitIcon = new TextView(this);
                          splitIcon.setText("✂️");
                          splitIcon.setTextSize(24);
                          splitIcon.setPadding(12, 8, 12, 8);
                          splitIcon.setGravity(Gravity.CENTER);
                          splitIcon.setClickable(true);
                          splitIcon.setOnClickListener(v -> showSplitTripDialog(trip));
                          
                          // Delete icon - clean, no background
                          TextView deleteIcon = new TextView(this);
                          deleteIcon.setText("🗑️");
                          deleteIcon.setTextSize(24);
                          deleteIcon.setPadding(12, 8, 12, 8);
                          deleteIcon.setGravity(Gravity.CENTER);
                          deleteIcon.setClickable(true);
                          deleteIcon.setOnClickListener(v -> showDeleteConfirmationDialog(trip));
                          
                          iconsRow.addView(editIcon, iconParams);
                          iconsRow.addView(splitIcon, iconParams);
                          iconsRow.addView(deleteIcon, iconParams);
                          
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
                      dateLabel.setTextColor(0xFF495057);
                      dateLabel.setPadding(0, 0, 0, 5);
                      layout.addView(dateLabel);

                      Button datePickerButton = new Button(this);
                      datePickerButton.setText("Select Date");
                      datePickerButton.setBackgroundColor(0xFFe9ecef);
                      datePickerButton.setTextColor(0xFF495057);
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
                      durationLabel.setTextColor(0xFF495057);
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
                      clientLabel.setTextColor(0xFF495057);
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
                      notesLabel.setTextColor(0xFF495057);
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
                              Toast.makeText(this, "Please fill all required fields including duration", Toast.LENGTH_SHORT).show();
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
                              Toast.makeText(this, "Invalid distance or duration format", Toast.LENGTH_SHORT).show();
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
                          Toast.makeText(this, "Client name cannot be empty", Toast.LENGTH_SHORT).show();
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
                          Toast.makeText(this, String.format("Trip saved (%dm)%s%s and synced!", durationMinutes, clientInfo, notesInfo), Toast.LENGTH_SHORT).show();
                      } else {
                          Toast.makeText(this, String.format("Trip saved locally (%dm)!", durationMinutes), Toast.LENGTH_SHORT).show();
                      }

                      updateStats();

                      if ("home".equals(currentTab)) {
                          updateRecentTrips();
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
                          Toast.makeText(this, "Manual trip already in progress", Toast.LENGTH_SHORT).show();
                          return;
                      }
                      
                      // Pause auto detection during manual trip to prevent duplicates
                      if (autoDetectionEnabled) {
                          SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", Context.MODE_PRIVATE);
                          prefs.edit().putBoolean("auto_detection_was_enabled", true).apply();
                          autoDetectionEnabled = false;
                          if (autoToggle != null) {
                              autoToggle.setText("Auto Detection: OFF");
                              autoToggle.setBackgroundColor(0xFF9CA3AF);
                          }
                          Toast.makeText(this, "Auto detection paused during manual trip", Toast.LENGTH_SHORT).show();
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
                      manualStopButton.setEnabled(true);
                      statusText.setText("Manual trip recording...");

                      String apiStatus = tripStorage.isApiSyncEnabled() ? " with API sync" : " (local only)";
                      Toast.makeText(this, "Manual trip started" + apiStatus, Toast.LENGTH_SHORT).show();
                  } catch (Exception e) {
                      Log.e(TAG, "Error starting manual trip: " + e.getMessage(), e);
                  }
              }

              private void stopManualTrip() {
                  try {
                      if (!manualTripInProgress) {
                          Toast.makeText(this, "No manual trip in progress", Toast.LENGTH_SHORT).show();
                          return;
                      }

                      Intent serviceIntent = new Intent(this, ManualTripService.class);
                      serviceIntent.setAction("STOP_MANUAL_TRIP");
                      startService(serviceIntent);

                      manualTripInProgress = false;
                      manualStartButton.setEnabled(true);
                      manualStopButton.setEnabled(false);
                      statusText.setText("Manual trip completed");

                      // Resume auto detection if it was enabled before manual trip
                      SharedPreferences prefs = getSharedPreferences("MileTrackerPrefs", Context.MODE_PRIVATE);
                      boolean wasAutoEnabled = prefs.getBoolean("auto_detection_was_enabled", false);
                      if (wasAutoEnabled) {
                          autoDetectionEnabled = true;
                          if (autoToggle != null) {
                              autoToggle.setText("Auto Detection: ON");
                              autoToggle.setBackgroundColor(0xFF667eea);
                          }
                          prefs.edit().remove("auto_detection_was_enabled").apply();
                          Toast.makeText(this, "Auto detection resumed", Toast.LENGTH_SHORT).show();
                      }

                      String apiStatus = tripStorage.isApiSyncEnabled() ? " and synced!" : " (saved locally)!";
                      Toast.makeText(this, "Trip saved" + apiStatus, Toast.LENGTH_SHORT).show();
                  } catch (Exception e) {
                      Log.e(TAG, "Error stopping manual trip: " + e.getMessage(), e);
                  }
              }

              private void toggleAutoDetection() {
                  try {
                      autoDetectionEnabled = !autoDetectionEnabled;
                      
                      // Save auto detection state to SharedPreferences
                      SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
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
                          sendDebugNotification("Bluetooth Service: Starting consolidated Bluetooth scanning");
                          try {
                              // Start periodic connection checking directly in MainActivity
                              startPeriodicBluetoothConnectionCheck();
                              bluetoothServiceStarted = true;
                              sendDebugNotification("Bluetooth Service: Consolidated scanning started successfully");
                              Log.d(TAG, "Bluetooth vehicle scanning enabled");
                          } catch (Exception e) {
                              sendDebugNotification("Bluetooth Service: FAILED to start - " + e.getMessage());
                              Log.e(TAG, "Error starting BluetoothVehicleService: " + e.getMessage(), e);
                              // Fall back to MainActivity's built-in Bluetooth discovery
                              startBuiltInBluetoothDiscovery();
                          }

                          autoToggle.setText("Auto Detection: ON");
                          autoToggle.setBackgroundColor(0xFF667eea);
                          statusText.setText("Auto detection active - Monitoring for trips");

                          String apiStatus = tripStorage.isApiSyncEnabled() ? " with API sync" : " (local only)";
                          Toast.makeText(this, "Auto detection started" + apiStatus, Toast.LENGTH_SHORT).show();
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

                          autoToggle.setText("Auto Detection: OFF");
                          autoToggle.setBackgroundColor(0xFF9CA3AF);
                          statusText.setText("Auto detection stopped");
                          Toast.makeText(this, "Auto detection stopped", Toast.LENGTH_SHORT).show();
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
                  builder.setTitle("📱 Device Management");
                  
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
                  currentDeviceHeader.setTextColor(0xFF495057);
                  currentDeviceHeader.setTypeface(null, Typeface.BOLD);
                  currentDeviceHeader.setPadding(0, 0, 0, 10);
                  dialogLayout.addView(currentDeviceHeader);
                  
                  UserAuthManager authManager = new UserAuthManager(this);
                  String deviceEmail = authManager.getDeviceEmail();
                  String deviceName = authManager.getDeviceName();
                  
                  TextView currentDeviceInfo = new TextView(this);
                  currentDeviceInfo.setText("Email: " + deviceEmail + "\nModel: " + deviceName + "\nStatus: Active");
                  currentDeviceInfo.setTextSize(14);
                  currentDeviceInfo.setTextColor(0xFF2E7D32);
                  currentDeviceInfo.setPadding(10, 5, 10, 15);
                  currentDeviceInfo.setBackgroundColor(0xFFE8F5E8);
                  dialogLayout.addView(currentDeviceInfo);
                  
                  // Family Device Slots
                  TextView familyDevicesHeader = new TextView(this);
                  familyDevicesHeader.setText("👨‍👩‍👧‍👦 Family Device Slots");
                  familyDevicesHeader.setTextSize(16);
                  familyDevicesHeader.setTextColor(0xFF495057);
                  familyDevicesHeader.setTypeface(null, Typeface.BOLD);
                  familyDevicesHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(familyDevicesHeader);
                  
                  TextView familyInfo = new TextView(this);
                  familyInfo.setText("Professional tier: 3 devices maximum\n\n" +
                      "🔵 Device 1: " + deviceEmail + " (This device)\n" +
                      "⚪ Device 2: Available\n" +
                      "⚪ Device 3: Available\n\n" +
                      "Perfect for couples tracking separate vehicles!");
                  familyInfo.setTextSize(14);
                  familyInfo.setTextColor(0xFF1976D2);
                  familyInfo.setPadding(10, 5, 10, 15);
                  familyInfo.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(familyInfo);
                  
                  // Instructions
                  TextView instructionsHeader = new TextView(this);
                  instructionsHeader.setText("ℹ️ How It Works");
                  instructionsHeader.setTextSize(16);
                  instructionsHeader.setTextColor(0xFF495057);
                  instructionsHeader.setTypeface(null, Typeface.BOLD);
                  instructionsHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(instructionsHeader);
                  
                  TextView instructions = new TextView(this);
                  instructions.setText("• Install MileTracker Pro on spouse's phone\n" +
                      "• Login with same account credentials\n" +
                      "• Each device automatically registers\n" +
                      "• When 4th device tries to login, choose which to deactivate\n" +
                      "• Perfect for families with multiple vehicles");
                  instructions.setTextSize(14);
                  instructions.setTextColor(0xFF495057);
                  instructions.setPadding(10, 5, 10, 15);
                  instructions.setBackgroundColor(0xFFF0F8FF);
                  dialogLayout.addView(instructions);
                  
                  scrollView.addView(dialogLayout);
                  builder.setView(scrollView);
                  
                  builder.setPositiveButton("OK", (dialog, which) -> {
                      dialog.dismiss();
                  });
                  
                  AlertDialog dialog = builder.create();
                  dialog.show();
              }

              private void showSettingsDialog() {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("⚙️ Settings");
                  
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
                  accountHeader.setTextColor(0xFF495057);
                  accountHeader.setTypeface(null, Typeface.BOLD);
                  accountHeader.setPadding(0, 0, 0, 10);
                  dialogLayout.addView(accountHeader);
                  
                  TextView userInfo = new TextView(this);
                  UserAuthManager authManager = new UserAuthManager(this);
                  String userEmail = authManager.getCurrentUserEmail();
                  if (userEmail == null || userEmail.isEmpty()) {
                      userEmail = "Not authenticated";
                  }
                  String userAccess = "Professional"; // Multi-device family sharing tier
                  userInfo.setText("User: " + userEmail + "\n\nTier: " + userAccess + " (Multi-device support)");
                  userInfo.setTextSize(14);
                  userInfo.setTextColor(0xFF1976D2);
                  userInfo.setPadding(10, 5, 10, 15);
                  userInfo.setBackgroundColor(0xFFE8F5E8);
                  dialogLayout.addView(userInfo);
                  
                  // Device Management Section (Professional tier feature)
                  TextView deviceHeader = new TextView(this);
                  deviceHeader.setText("📱 Device Management");
                  deviceHeader.setTextSize(16);
                  deviceHeader.setTextColor(0xFF495057);
                  deviceHeader.setTypeface(null, Typeface.BOLD);
                  deviceHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(deviceHeader);
                  
                  TextView deviceInfo = new TextView(this);
                  String deviceEmail = authManager.getDeviceEmail();
                  String deviceName = authManager.getDeviceName();
                  deviceInfo.setText("This Device: " + deviceEmail + "\nModel: " + deviceName + "\n\nProfessional tier allows up to 3 devices per family");
                  deviceInfo.setTextSize(14);
                  deviceInfo.setTextColor(0xFF2E7D32);
                  deviceInfo.setPadding(10, 5, 10, 10);
                  deviceInfo.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(deviceInfo);
                  
                  // Device Management Button
                  Button deviceManagementButton = new Button(this);
                  deviceManagementButton.setText("📱 Manage Family Devices");
                  deviceManagementButton.setBackgroundColor(0xFF667eea);
                  deviceManagementButton.setTextColor(0xFFFFFFFF);
                  deviceManagementButton.setOnClickListener(v -> {
                      showDeviceManagementDialog();
                  });
                  dialogLayout.addView(deviceManagementButton);
                  
                  // Backup Status Section
                  TextView backupHeader = new TextView(this);
                  backupHeader.setText("☁️ Backup Status");
                  backupHeader.setTextSize(16);
                  backupHeader.setTextColor(0xFF495057);
                  backupHeader.setTypeface(null, Typeface.BOLD);
                  backupHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(backupHeader);
                  
                  String apiStatus = this.tripStorage.isApiSyncEnabled() ? "Active" : "Disabled";
                  String autoStatus = this.autoDetectionEnabled ? "Active" : "Disabled";
                  
                  TextView backupInfo = new TextView(this);
                  backupInfo.setText("Auto Detection: " + autoStatus);
                  backupInfo.setTextSize(14);
                  backupInfo.setTextColor(0xFF2E7D32);
                  backupInfo.setPadding(10, 5, 10, 5);
                  backupInfo.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(backupInfo);
                  
                  // Cloud Backup Toggle Button
                  Button cloudBackupToggle = new Button(this);
                  if (this.tripStorage.isApiSyncEnabled()) {
                      cloudBackupToggle.setText("☁️ Cloud Backup: ON");
                      cloudBackupToggle.setBackgroundColor(0xFF28a745);
                      cloudBackupToggle.setTextColor(0xFFFFFFFF);
                  } else {
                      cloudBackupToggle.setText("☁️ Cloud Backup: OFF");
                      cloudBackupToggle.setBackgroundColor(0xFF9CA3AF);
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
                          cloudBackupToggle.setText("☁️ Cloud Backup: ON");
                          cloudBackupToggle.setBackgroundColor(0xFF28a745);
                          cloudBackupToggle.setTextColor(0xFFFFFFFF);
                          Toast.makeText(this, "Cloud backup enabled", Toast.LENGTH_SHORT).show();
                          
                          // Sync custom categories when enabling cloud backup
                          CloudBackupService cloudService = new CloudBackupService(this);
                          cloudService.syncCustomCategoriesWithAPI();
                      } else {
                          cloudBackupToggle.setText("☁️ Cloud Backup: OFF");
                          cloudBackupToggle.setBackgroundColor(0xFF9CA3AF);
                          cloudBackupToggle.setTextColor(0xFFFFFFFF);
                          Toast.makeText(this, "Cloud backup disabled", Toast.LENGTH_SHORT).show();
                      }
                  });
                  dialogLayout.addView(cloudBackupToggle);
                  
                  // IRS Tax Rates Section
                  TextView irsHeader = new TextView(this);
                  irsHeader.setText("IRS Tax Rates (" + getIrsYear() + ")");
                  irsHeader.setTextSize(16);
                  irsHeader.setTextColor(0xFF495057);
                  irsHeader.setTypeface(null, Typeface.BOLD);
                  irsHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(irsHeader);
                  
                  TextView irsInfo = new TextView(this);
                  String irsText = String.format(
                      "Business: $%.2f per mile\nMedical: $%.2f per mile\nCharity: $%.2f per mile",
                      getIrsBusinessRate(), getIrsMedicalRate(), getIrsCharityRate());
                  irsInfo.setText(irsText);
                  irsInfo.setTextSize(14);
                  irsInfo.setTextColor(0xFF2E7D32);
                  irsInfo.setPadding(10, 5, 10, 5);
                  irsInfo.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(irsInfo);
                  
                  // Update IRS Rates Button
                  Button updateIrsButton = new Button(this);
                  updateIrsButton.setText("📝 Update IRS Rates");
                  updateIrsButton.setBackgroundColor(0xFF667eea);
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
                  appHeader.setText("📱 App Information");
                  appHeader.setTextSize(16);
                  appHeader.setTextColor(0xFF495057);
                  appHeader.setTypeface(null, Typeface.BOLD);
                  appHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(appHeader);
                  
                  TextView appInfo = new TextView(this);
                  appInfo.setText("Version: v4.9.150\nHome Address Configuration UI");
                  appInfo.setTextSize(14);
                  appInfo.setTextColor(0xFF6C757D);
                  appInfo.setPadding(10, 5, 10, 15);
                  appInfo.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(appInfo);
                  
                  // Manage Categories Button
                  TextView categoriesHeader = new TextView(this);
                  categoriesHeader.setText("🏷️ Categories");
                  categoriesHeader.setTextSize(16);
                  categoriesHeader.setTextColor(0xFF495057);
                  categoriesHeader.setTypeface(null, Typeface.BOLD);
                  categoriesHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(categoriesHeader);
                  
                  Button manageCategoriesButton = new Button(this);
                  manageCategoriesButton.setText("Manage Categories");
                  manageCategoriesButton.setTextSize(14);
                  manageCategoriesButton.setTextColor(0xFFFFFFFF);
                  manageCategoriesButton.setBackgroundColor(0xFF667eea);
                  manageCategoriesButton.setPadding(20, 15, 20, 15);
                  manageCategoriesButton.setOnClickListener(v -> {
                      showManageCategoriesDialog();
                  });
                  dialogLayout.addView(manageCategoriesButton);
                  
                  // Home Address Configuration Section
                  TextView homeAddressHeader = new TextView(this);
                  homeAddressHeader.setText("🏠 Home Address Configuration");
                  homeAddressHeader.setTextSize(16);
                  homeAddressHeader.setTextColor(0xFF495057);
                  homeAddressHeader.setTypeface(null, Typeface.BOLD);
                  homeAddressHeader.setPadding(0, 15, 0, 10);
                  dialogLayout.addView(homeAddressHeader);
                  
                  // Home Address Status Display
                  TextView homeAddressStatus = new TextView(this);
                  SharedPreferences homePrefs = getSharedPreferences("AddressLookupPrefs", MODE_PRIVATE);
                  String homeAddress = homePrefs.getString("home_address", "");
                  double homeLat = Double.longBitsToDouble(homePrefs.getLong("home_latitude", 0));
                  double homeLng = Double.longBitsToDouble(homePrefs.getLong("home_longitude", 0));
                  
                  String homeAddressText;
                  if (homeAddress.isEmpty() || (homeLat == 0 && homeLng == 0)) {
                      homeAddressText = "Status: NOT SET\nThe system will automatically learn your home address from trip patterns.\nYou can manually set it below for immediate use.";
                  } else {
                      homeAddressText = String.format("Status: CONFIGURED\nAddress: %s\nCoordinates: %.4f, %.4f\nDetection radius: 0.1 miles (330 feet)", 
                          homeAddress, homeLat, homeLng);
                  }
                  homeAddressStatus.setText(homeAddressText);
                  homeAddressStatus.setTextSize(14);
                  homeAddressStatus.setTextColor(0xFF6C757D);
                  homeAddressStatus.setPadding(10, 5, 10, 15);
                  homeAddressStatus.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(homeAddressStatus);
                  
                  // Set Home Address Button
                  Button setHomeAddressButton = new Button(this);
                  setHomeAddressButton.setText("Set Home Address");
                  setHomeAddressButton.setTextSize(14);
                  setHomeAddressButton.setTextColor(0xFFFFFFFF);
                  setHomeAddressButton.setBackgroundColor(0xFF667eea);
                  setHomeAddressButton.setPadding(20, 15, 20, 15);
                  LinearLayout.LayoutParams homeAddressParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  homeAddressParams.setMargins(0, 5, 0, 15);
                  setHomeAddressButton.setLayoutParams(homeAddressParams);
                  setHomeAddressButton.setOnClickListener(v -> {
                      showSetHomeAddressDialog();
                  });
                  dialogLayout.addView(setHomeAddressButton);
                  
                  // Work Hours Auto-Classification Section
                  TextView workHoursHeader = new TextView(this);
                  workHoursHeader.setText("⏰ Work Hours Auto-Classification");
                  workHoursHeader.setTextSize(16);
                  workHoursHeader.setTextColor(0xFF495057);
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
                  workHoursStatus.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(workHoursStatus);
                  
                  // Configure Work Hours Button
                  Button configureWorkHoursButton = new Button(this);
                  configureWorkHoursButton.setText("Configure Work Hours");
                  configureWorkHoursButton.setTextSize(14);
                  configureWorkHoursButton.setTextColor(0xFFFFFFFF);
                  configureWorkHoursButton.setBackgroundColor(0xFF667eea);
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
                  roundTripHeader.setText("🔄 Round-Trip Detection");
                  roundTripHeader.setTextSize(16);
                  roundTripHeader.setTextColor(0xFF495057);
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
                  roundTripStatus.setBackgroundColor(0xFFF8F9FA);
                  dialogLayout.addView(roundTripStatus);
                  
                  // Manual Round-Trip Detection Button
                  Button detectRoundTripsButton = new Button(this);
                  detectRoundTripsButton.setText("🔍 Detect Round-Trips");
                  detectRoundTripsButton.setTextSize(14);
                  detectRoundTripsButton.setTextColor(0xFFFFFFFF);
                  detectRoundTripsButton.setBackgroundColor(0xFF667eea);
                  detectRoundTripsButton.setPadding(20, 15, 20, 15);
                  LinearLayout.LayoutParams detectParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  detectParams.setMargins(0, 5, 0, 15);
                  detectRoundTripsButton.setLayoutParams(detectParams);
                  detectRoundTripsButton.setOnClickListener(v -> {
                      // Run round-trip detection in background
                      detectRoundTripsButton.setEnabled(false);
                      detectRoundTripsButton.setText("🔄 Detecting...");
                      
                      new Thread(() -> {
                          try {
                              tripStorage.detectRoundTrips();
                              runOnUiThread(() -> {
                                  detectRoundTripsButton.setEnabled(true);
                                  detectRoundTripsButton.setText("🔍 Detect Round-Trips");
                                  int newCount = tripStorage.getRoundTripGroups().size();
                                  Toast.makeText(this, "Round-trip detection completed. Found " + newCount + " groups.", Toast.LENGTH_SHORT).show();
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
                                  detectRoundTripsButton.setText("🔍 Detect Round-Trips");
                                  Toast.makeText(this, "Detection error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                              });
                          }
                      }).start();
                  });
                  dialogLayout.addView(detectRoundTripsButton);
                  
                  scrollView.addView(dialogLayout);
                  builder.setView(scrollView);
                  builder.setPositiveButton("Close", null);
                  builder.show();
              }

              private void showSetHomeAddressDialog() {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("🏠 Set Home Address");
                  
                  // Create scrollable dialog layout
                  ScrollView scrollView = new ScrollView(this);
                  scrollView.setLayoutParams(new LinearLayout.LayoutParams(
                      LinearLayout.LayoutParams.MATCH_PARENT,
                      LinearLayout.LayoutParams.WRAP_CONTENT
                  ));
                  
                  LinearLayout dialogLayout = new LinearLayout(this);
                  dialogLayout.setOrientation(LinearLayout.VERTICAL);
                  dialogLayout.setPadding(30, 20, 30, 20);
                  
                  // Instructions
                  TextView instructions = new TextView(this);
                  instructions.setText("Enter your home address to enable automatic home detection. Trips starting or ending within 0.1 miles will show 'Home' instead of your full address.");
                  instructions.setTextSize(14);
                  instructions.setTextColor(0xFF6C757D);
                  instructions.setPadding(0, 0, 0, 15);
                  dialogLayout.addView(instructions);
                  
                  // Address input
                  TextView addressLabel = new TextView(this);
                  addressLabel.setText("Home Address:");
                  addressLabel.setTextSize(16);
                  addressLabel.setTextColor(0xFF495057);
                  addressLabel.setTypeface(null, Typeface.BOLD);
                  addressLabel.setPadding(0, 0, 0, 5);
                  dialogLayout.addView(addressLabel);
                  
                  EditText addressInput = new EditText(this);
                  SharedPreferences homePrefs = getSharedPreferences("AddressLookupPrefs", MODE_PRIVATE);
                  String currentAddress = homePrefs.getString("home_address", "");
                  addressInput.setText(currentAddress);
                  addressInput.setHint("123 Main St, City, State 12345");
                  addressInput.setInputType(InputType.TYPE_TEXT_VARIATION_POSTAL_ADDRESS);
                  addressInput.setMaxLines(3);
                  LinearLayout.LayoutParams addressParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  addressParams.setMargins(0, 0, 0, 15);
                  addressInput.setLayoutParams(addressParams);
                  dialogLayout.addView(addressInput);
                  
                  // Use Current Location Button
                  Button useCurrentLocationButton = new Button(this);
                  useCurrentLocationButton.setText("📍 Use Current Location");
                  useCurrentLocationButton.setTextSize(14);
                  useCurrentLocationButton.setTextColor(0xFFFFFFFF);
                  useCurrentLocationButton.setBackgroundColor(0xFF28A745);
                  useCurrentLocationButton.setPadding(20, 15, 20, 15);
                  LinearLayout.LayoutParams currentLocationParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  currentLocationParams.setMargins(0, 0, 0, 15);
                  useCurrentLocationButton.setLayoutParams(currentLocationParams);
                  useCurrentLocationButton.setOnClickListener(v -> {
                      useCurrentLocationButton.setText("📍 Getting location...");
                      useCurrentLocationButton.setEnabled(false);
                      
                      // Get current location and address
                      getCurrentLocationForHomeAddress(new LocationCallback() {
                          @Override
                          public void onLocationReceived(double latitude, double longitude, String address) {
                              runOnUiThread(() -> {
                                  addressInput.setText(address);
                                  useCurrentLocationButton.setText("📍 Use Current Location");
                                  useCurrentLocationButton.setEnabled(true);
                                  Toast.makeText(MainActivity.this, "Current location set as home address", Toast.LENGTH_SHORT).show();
                              });
                          }
                          
                          @Override
                          public void onLocationError(String error) {
                              runOnUiThread(() -> {
                                  useCurrentLocationButton.setText("📍 Use Current Location");
                                  useCurrentLocationButton.setEnabled(true);
                                  Toast.makeText(MainActivity.this, "Error getting location: " + error, Toast.LENGTH_SHORT).show();
                              });
                          }
                      });
                  });
                  dialogLayout.addView(useCurrentLocationButton);
                  
                  // Clear Home Address Button
                  Button clearHomeAddressButton = new Button(this);
                  clearHomeAddressButton.setText("🗑️ Clear Home Address");
                  clearHomeAddressButton.setTextSize(14);
                  clearHomeAddressButton.setTextColor(0xFFFFFFFF);
                  clearHomeAddressButton.setBackgroundColor(0xFFDC3545);
                  clearHomeAddressButton.setPadding(20, 15, 20, 15);
                  LinearLayout.LayoutParams clearParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  clearParams.setMargins(0, 0, 0, 15);
                  clearHomeAddressButton.setLayoutParams(clearParams);
                  clearHomeAddressButton.setOnClickListener(v -> {
                      SharedPreferences.Editor editor = homePrefs.edit();
                      editor.remove("home_address");
                      editor.remove("home_latitude");
                      editor.remove("home_longitude");
                      editor.apply();
                      
                      addressInput.setText("");
                      Toast.makeText(MainActivity.this, "Home address cleared", Toast.LENGTH_SHORT).show();
                  });
                  dialogLayout.addView(clearHomeAddressButton);
                  
                  scrollView.addView(dialogLayout);
                  builder.setView(scrollView);
                  
                  builder.setPositiveButton("Save", (dialog, which) -> {
                      String address = addressInput.getText().toString().trim();
                      if (!address.isEmpty()) {
                          // Geocode the address to get coordinates
                          geocodeAddressForHome(address, new GeocodeCallback() {
                              @Override
                              public void onGeocodeReceived(double latitude, double longitude, String fullAddress) {
                                  // Save to SharedPreferences
                                  SharedPreferences.Editor editor = homePrefs.edit();
                                  editor.putString("home_address", fullAddress);
                                  editor.putLong("home_latitude", Double.doubleToLongBits(latitude));
                                  editor.putLong("home_longitude", Double.doubleToLongBits(longitude));
                                  editor.apply();
                                  
                                  runOnUiThread(() -> {
                                      Toast.makeText(MainActivity.this, "Home address saved successfully", Toast.LENGTH_SHORT).show();
                                  });
                              }
                              
                              @Override
                              public void onGeocodeError(String error) {
                                  runOnUiThread(() -> {
                                      Toast.makeText(MainActivity.this, "Error geocoding address: " + error, Toast.LENGTH_SHORT).show();
                                  });
                              }
                          });
                      }
                  });
                  
                  builder.setNegativeButton("Cancel", null);
                  builder.show();
              }

              private void getCurrentLocationForHomeAddress(LocationCallback callback) {
                  if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                      callback.onLocationError("Location permission not granted");
                      return;
                  }
                  
                  new Thread(() -> {
                      try {
                          LocationManager locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
                          if (locationManager == null) {
                              callback.onLocationError("Location service not available");
                              return;
                          }
                          
                          android.location.Location location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                          if (location == null) {
                              location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                          }
                          
                          if (location != null) {
                              double latitude = location.getLatitude();
                              double longitude = location.getLongitude();
                              
                              // Get address from coordinates
                              try {
                                  Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                                  List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);
                                  
                                  if (addresses != null && !addresses.isEmpty()) {
                                      Address address = addresses.get(0);
                                      String fullAddress = getFullAddressString(address);
                                      callback.onLocationReceived(latitude, longitude, fullAddress);
                                  } else {
                                      callback.onLocationError("Could not get address from coordinates");
                                  }
                              } catch (Exception e) {
                                  Log.e(TAG, "Error geocoding current location", e);
                                  callback.onLocationError("Error geocoding location: " + e.getMessage());
                              }
                          } else {
                              callback.onLocationError("Could not get current location");
                          }
                      } catch (Exception e) {
                          Log.e(TAG, "Error getting current location", e);
                          callback.onLocationError("Error getting location: " + e.getMessage());
                      }
                  }).start();
              }

              private void geocodeAddressForHome(String addressText, GeocodeCallback callback) {
                  new Thread(() -> {
                      try {
                          Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                          List<Address> addresses = geocoder.getFromLocationName(addressText, 1);
                          
                          if (addresses != null && !addresses.isEmpty()) {
                              Address address = addresses.get(0);
                              double latitude = address.getLatitude();
                              double longitude = address.getLongitude();
                              String fullAddress = getFullAddressString(address);
                              
                              callback.onGeocodeReceived(latitude, longitude, fullAddress);
                          } else {
                              callback.onGeocodeError("Could not find coordinates for this address");
                          }
                      } catch (Exception e) {
                          Log.e(TAG, "Error geocoding address", e);
                          callback.onGeocodeError("Error geocoding address: " + e.getMessage());
                      }
                  }).start();
              }

              private String getFullAddressString(Address address) {
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
                  
                  return finalAddress;
              }

              // Callback interfaces for home address configuration
              interface LocationCallback {
                  void onLocationReceived(double latitude, double longitude, String address);
                  void onLocationError(String error);
              }

              interface GeocodeCallback {
                  void onGeocodeReceived(double latitude, double longitude, String fullAddress);
                  void onGeocodeError(String error);
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
                  yearLabel.setTextColor(0xFF495057);
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
                  businessLabel.setTextColor(0xFF495057);
                  businessLabel.setPadding(0, 0, 0, 5);
                  dialogLayout.addView(businessLabel);
                  
                  EditText businessInput = new EditText(this);
                  businessInput.setText(String.format("%.2f", getIrsBusinessRate()));
                  businessInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
                  businessInput.setHint("0.70");
                  LinearLayout.LayoutParams businessParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  businessParams.setMargins(0, 0, 0, 15);
                  businessInput.setLayoutParams(businessParams);
                  dialogLayout.addView(businessInput);
                  
                  // Medical rate input
                  TextView medicalLabel = new TextView(this);
                  medicalLabel.setText("Medical Rate (per mile):");
                  medicalLabel.setTextSize(14);
                  medicalLabel.setTextColor(0xFF495057);
                  medicalLabel.setPadding(0, 0, 0, 5);
                  dialogLayout.addView(medicalLabel);
                  
                  EditText medicalInput = new EditText(this);
                  medicalInput.setText(String.format("%.2f", getIrsMedicalRate()));
                  medicalInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
                  medicalInput.setHint("0.21");
                  LinearLayout.LayoutParams medicalParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                  medicalParams.setMargins(0, 0, 0, 15);
                  medicalInput.setLayoutParams(medicalParams);
                  dialogLayout.addView(medicalInput);
                  
                  // Charity rate input
                  TextView charityLabel = new TextView(this);
                  charityLabel.setText("Charity Rate (per mile):");
                  charityLabel.setTextSize(14);
                  charityLabel.setTextColor(0xFF495057);
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
                          
                          Toast.makeText(this, "IRS tax rates updated successfully!", Toast.LENGTH_SHORT).show();
                      } catch (NumberFormatException e) {
                          Toast.makeText(this, "Please enter valid numbers for year and all rates", Toast.LENGTH_SHORT).show();
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

              // IRS mileage rates for 2025 (user-configurable)
              private double getIrsBusinessRate() {
                  SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
                  return (double) prefs.getFloat("irs_business_rate", 0.70f);
              }
              
              private double getIrsMedicalRate() {
                  SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
                  return (double) prefs.getFloat("irs_medical_rate", 0.21f);
              }
              
              private double getIrsCharityRate() {
                  SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
                  return (double) prefs.getFloat("irs_charity_rate", 0.14f);
              }
              
              private int getIrsYear() {
                  SharedPreferences prefs = getSharedPreferences("miletracker_settings", MODE_PRIVATE);
                  return prefs.getInt("irs_year", 2025);
              }
              
              private void updateStats() {
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
                      double personalDeduction = 0.00; // Personal trips are not tax deductible
                      double medicalDeduction = medicalMiles * getIrsMedicalRate();
                      double charityDeduction = charityMiles * getIrsCharityRate();
                      double totalDeduction = businessDeduction + personalDeduction + medicalDeduction + charityDeduction;

                      String apiStatus = tripStorage.isApiSyncEnabled() ? "API ON" : "API OFF";
                      String autoStatus = autoDetectionEnabled ? "Auto Detection: ON" : "Auto Detection: OFF";

                      // Get authenticated user info
                      UserAuthManager authManager = new UserAuthManager(this);
                      String userEmail = authManager.getCurrentUserEmail();
                      String authUserId = authManager.getUserId();
                      String displayUserId = authUserId.isEmpty() ? tripStorage.getUserId() : authUserId;
                      
                      String userInfo = userEmail.isEmpty() ? "Not signed in" : userEmail;
                      if (!authUserId.isEmpty()) {
                          userInfo += " (Admin ID: " + authUserId + ")";
                      }
                      
                      String periodLabel = getPeriodLabel();
                      String stats = String.format(
                          "%s\n• Total Trips: %d\n• Total Miles: %s\n• Business: %s ($%.2f)\n• Personal: %s ($%.2f)\n• Medical: %s ($%.2f)\n• Charity: %s ($%.2f)\n• Total Deduction: $%.2f",
                          periodLabel,
                          trips.size(), formatMiles(totalMiles),
                          formatMiles(businessMiles), businessDeduction,
                          formatMiles(personalMiles), personalDeduction,
                          formatMiles(medicalMiles), medicalDeduction,
                          formatMiles(charityMiles), charityDeduction,
                          totalDeduction
                      );

                      if (statsText != null) {
                          statsText.setText(stats);
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error updating stats: " + e.getMessage(), e);
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
                          periodButton.setText("View: " + getPeriodLabel() + " (tap to change)");
                      }
                      
                      Toast.makeText(this, "Updated to " + periods[which], Toast.LENGTH_SHORT).show();
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
                                          float speed = lastKnownLocation.getSpeed() * 2.237f; // Convert m/s to mph
                                          
                                          // Update real-time distance
                                          updateRealTimeDistance(lastKnownLocation);
                                          
                                          // Process enhanced auto detection if enabled
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
                      
                      // Get start address
                      getAddressFromCoordinates(latitude, longitude, new AddressCallback() {
                          @Override
                          public void onAddressReceived(String address) {
                              currentTripStartAddress = address;
                              Log.d(TAG, "Trip started at: " + address);
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
                      
                      // Get end address
                      getAddressFromCoordinates(latitude, longitude, new AddressCallback() {
                          @Override
                          public void onAddressReceived(String endAddress) {
                              // Save the completed trip
                              Trip completedTrip = new Trip();
                              completedTrip.setStartTime(currentTripStartTime);
                              completedTrip.setEndTime(timestamp);
                              completedTrip.setStartLatitude(currentTripStartLatitude);
                              completedTrip.setStartLongitude(currentTripStartLongitude);
                              completedTrip.setEndLatitude(latitude);
                              completedTrip.setEndLongitude(longitude);
                              completedTrip.setStartAddress(currentTripStartAddress != null ? currentTripStartAddress : "Unknown");
                              completedTrip.setEndAddress(endAddress != null ? endAddress : "Unknown");
                              completedTrip.setDistance(finalTotalDistance);
                              completedTrip.setAutoDetected(true);
                              completedTrip.setCategory("Business");
                              
                              tripStorage.saveTrip(completedTrip);
                              
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
                  lastDistanceLocation = null;
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
                              Toast.makeText(this, "Enhanced " + finalUpdatedCount + " trip addresses with zip codes", Toast.LENGTH_LONG).show();
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
              
              private String getEnhancedAddress(double latitude, double longitude) {
                  try {
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
                          
                          return finalAddress.isEmpty() ? null : finalAddress;
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Geocoding error: " + e.getMessage());
                  }
                  return null;
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
                              }
                          }
                      };

                      IntentFilter filter = new IntentFilter("MANUAL_TRIP_UPDATE");
                      registerReceiver(manualTripReceiver, filter);
                  } catch (Exception e) {
                      Log.e(TAG, "Error registering broadcast receiver: " + e.getMessage(), e);
                  }
              }

              private void restoreAutoDetectionState() {
                  try {
                      // Restore auto detection state from SharedPreferences
                      SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
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
                          
                          autoToggle.setText("Auto Detection: ON");
                          autoToggle.setBackgroundColor(0xFF667eea);
                          statusText.setText("Auto detection active");
                      } else {
                          autoToggle.setText("Auto Detection: OFF");
                          autoToggle.setBackgroundColor(0xFF9CA3AF);
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
                  SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
                  boolean autoDetectionEnabled = prefs.getBoolean("auto_detection_enabled", false);
                  
                  return bluetoothServiceStarted && autoDetectionEnabled;
              }

              private void updateVehicleRegistrationCount() {
                  try {
                      SharedPreferences prefs = getSharedPreferences("BluetoothVehiclePrefs", MODE_PRIVATE);
                      String vehiclesJson = prefs.getString("vehicle_registry", "{}");
                      
                      sendDebugNotification("UI Update: Registry JSON = " + (vehiclesJson.equals("{}") ? "empty" : "has data"));
                      
                      if (vehiclesJson.equals("{}")) {
                          connectedVehicleText.setText("🚗 No vehicles registered");
                          connectedVehicleText.setTextColor(0xFF6C757D);
                          sendDebugNotification("UI Update: Set 'No vehicles registered' text");
                      } else {
                          // Parse JSON to count vehicles
                          try {
                              org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
                              int count = vehiclesObject.length();
                              
                              if (count > 0) {
                                  String displayText = "🚗 " + count + " vehicle" + (count > 1 ? "s" : "") + " registered - Ready for auto-detection";
                                  connectedVehicleText.setText(displayText);
                                  connectedVehicleText.setTextColor(0xFF28A745);
                                  sendDebugNotification("UI Update: Set text to " + count + " vehicles registered");
                              } else {
                                  connectedVehicleText.setText("🚗 No vehicles registered - Bluetooth won't detect trips");
                                  connectedVehicleText.setTextColor(0xFFDC3545);
                                  sendDebugNotification("UI Update: Count is 0, set 'No vehicles registered' text");
                              }
                          } catch (Exception e) {
                              connectedVehicleText.setText("🚗 Vehicle registry error");
                              connectedVehicleText.setTextColor(0xFFDC3545);
                              sendDebugNotification("UI Update ERROR: " + e.getMessage());
                          }
                      }
                  } catch (Exception e) {
                      connectedVehicleText.setText("🚗 Vehicle status unknown");
                      connectedVehicleText.setTextColor(0xFF6C757D);
                      sendDebugNotification("UI Update CRITICAL ERROR: " + e.getMessage());
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
                      
                      diagnostics.append("📱 BLUETOOTH DIAGNOSTICS:\n\n");
                      
                      if (bluetoothAdapter == null) {
                          diagnostics.append("❌ Bluetooth adapter: Not supported\n");
                      } else {
                          diagnostics.append("✅ Bluetooth adapter: Available\n");
                          diagnostics.append("📡 Bluetooth enabled: ").append(bluetoothAdapter.isEnabled() ? "Yes" : "No").append("\n");
                      }
                      
                      // Check service status
                      boolean serviceRunning = isBluetoothServiceRunning();
                      diagnostics.append("🔧 BluetoothVehicleService: ").append(serviceRunning ? "Running" : "Not running").append("\n");
                      
                      // Check registered vehicles
                      SharedPreferences prefs = getSharedPreferences("bluetooth_vehicles", MODE_PRIVATE);
                      String vehiclesJson = prefs.getString("registered_vehicles", "[]");
                      
                      try {
                          org.json.JSONArray vehiclesArray = new org.json.JSONArray(vehiclesJson);
                          int count = vehiclesArray.length();
                          diagnostics.append("🚗 Registered vehicles: ").append(count).append("\n");
                          
                          if (count > 0) {
                              diagnostics.append("\nVehicles:\n");
                              for (int i = 0; i < count; i++) {
                                  org.json.JSONObject vehicle = vehiclesArray.getJSONObject(i);
                                  diagnostics.append("• ").append(vehicle.getString("deviceName"))
                                            .append(" (").append(vehicle.getString("vehicleType")).append(")\n");
                              }
                          }
                      } catch (Exception e) {
                          diagnostics.append("❌ Vehicle registry error: ").append(e.getMessage()).append("\n");
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
                      if (vehiclesJson.equals("[]")) {
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

              private void updateConnectedVehicleUI(String deviceName, String vehicleType) {
                  try {
                      String vehicleIcon = getVehicleIcon(vehicleType);
                      connectedVehicleText.setText("🟢 CONNECTED: " + vehicleIcon + " " + deviceName + " (" + vehicleType + ")");
                      connectedVehicleText.setTextColor(0xFF28A745);
                      connectedVehicleText.setBackgroundColor(0xFFE8F5E8);
                      connectedVehicleText.setTypeface(null, Typeface.BOLD);
                      
                      // Also update the status text to show vehicle connection
                      if (statusText != null) {
                          statusText.setText("🚗 Vehicle connected - Ready for automatic trip detection");
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
                      connectedVehicleText.setBackgroundColor(0xFFF8F9FA);
                      connectedVehicleText.setTypeface(null, Typeface.NORMAL);
                      
                      // Update status text to show disconnection
                      if (statusText != null && autoDetectionEnabled) {
                          statusText.setText("Auto detection active - Waiting for vehicle connection");
                          statusText.setTextColor(0xFF667eea);
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error updating disconnected vehicle UI: " + e.getMessage(), e);
                  }
              }

              private String getVehicleIcon(String vehicleType) {
                  switch (vehicleType.toLowerCase()) {
                      case "personal": return "🚗";
                      case "business": return "🚐";
                      case "rental": return "🚙";
                      case "borrowed": return "🚘";
                      default: return "🚗";
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
                                      Toast.makeText(MainActivity.this, "🟢 Vehicle connected: " + deviceName, Toast.LENGTH_LONG).show();
                                  } else if ("com.miletrackerpro.VEHICLE_DISCONNECTED".equals(action)) {
                                      String deviceName = intent.getStringExtra("deviceName");
                                      Log.d(TAG, "VEHICLE_DISCONNECTED broadcast received: " + deviceName);
                                      updateDisconnectedVehicleUI();
                                      updateBluetoothStatus(); // Update Bluetooth status indicators
                                      Toast.makeText(MainActivity.this, "🔴 Vehicle disconnected: " + deviceName, Toast.LENGTH_LONG).show();
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
                      registerReceiver(bluetoothUpdateReceiver, filter);
                  } catch (Exception e) {
                      Log.e(TAG, "Error registering Bluetooth update receiver: " + e.getMessage(), e);
                  }
              }

              private void showVehicleRegistrationDialog(String deviceName, String macAddress) {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("🚗 New Vehicle Detected");
                  
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
                      
                      Toast.makeText(this, "✅ Vehicle registered: " + finalDeviceName, Toast.LENGTH_SHORT).show();
                      
                      // Update the UI immediately
                      updateBluetoothStatus();
                  });
                  
                  builder.setNegativeButton("Not Now", (dialog, which) -> {
                      dialog.dismiss();
                  });
                  
                  builder.setCancelable(false);
                  builder.show();
              }
              
              private void registerVehicleLocally(String deviceName, String macAddress, String vehicleType) {
                  try {
                      // PHASE 1 DEBUG: Use Toast notifications instead of logcat
                      Toast.makeText(this, "DEBUG: Starting vehicle registration for " + deviceName, Toast.LENGTH_LONG).show();
                      
                      SharedPreferences prefs = getSharedPreferences("BluetoothVehiclePrefs", MODE_PRIVATE);
                      String vehiclesJson = prefs.getString("vehicle_registry", "{}");
                      
                      Toast.makeText(this, "DEBUG: Current registry: " + (vehiclesJson.equals("{}") ? "empty" : "has data"), Toast.LENGTH_LONG).show();
                      
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
                      
                      Toast.makeText(this, "DEBUG: Save to preferences: " + (saveSuccess ? "SUCCESS" : "FAILED"), Toast.LENGTH_LONG).show();
                      
                      // Verify the save worked
                      String verifyJson = prefs.getString("vehicle_registry", "{}");
                      org.json.JSONObject verifyObject = new org.json.JSONObject(verifyJson);
                      int vehicleCount = verifyObject.length();
                      
                      Toast.makeText(this, "DEBUG: Verification - Total vehicles: " + vehicleCount, Toast.LENGTH_LONG).show();
                      
                      // Send debug notification
                      sendDebugNotification("Vehicle registered: " + deviceName + " | Count: " + vehicleCount + " | Save: " + saveSuccess);
                      
                  } catch (Exception e) {
                      sendDebugNotification("ERROR registering vehicle: " + e.getMessage());
                      Toast.makeText(this, "DEBUG: Registration error - " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }

              private void initializeBluetoothBackgroundService() {
                  try {
                      // Register the broadcast receiver FIRST
                      registerBluetoothUpdateReceiver();
                      
                      // Only start monitoring if auto detection is enabled
                      SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
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
                                      
                                      sendDebugNotification("BLUETOOTH SCAN FOUND: " + (deviceName != null ? deviceName : "Unknown") + " (" + deviceAddress + ")");
                                      
                                      // Check if this is a new vehicle that should trigger registration
                                      if (deviceName != null && isVehicleDevice(deviceName)) {
                                          sendDebugNotification("Vehicle Device Detected: " + deviceName + " - checking if registered...");
                                          
                                          // Check if already registered
                                          if (!isVehicleAlreadyRegistered(deviceAddress)) {
                                              sendDebugNotification("New Vehicle: " + deviceName + " - should trigger registration dialog");
                                              
                                              runOnUiThread(() -> {
                                                  showVehicleRegistrationDialog(deviceAddress, deviceName);
                                              });
                                          } else {
                                              sendDebugNotification("Known Vehicle: " + deviceName + " - already registered");
                                          }
                                      } else {
                                          sendDebugNotification("Non-Vehicle Device: " + (deviceName != null ? deviceName : "Unknown") + " - skipping");
                                      }
                                  }
                              } else if (BluetoothAdapter.ACTION_DISCOVERY_STARTED.equals(action)) {
                                  sendDebugNotification("Bluetooth Discovery: Started scanning for devices");
                              } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                                  sendDebugNotification("Bluetooth Discovery: Finished scanning - will resume in 30 seconds");
                              } else if ("com.miletrackerpro.app.VEHICLE_DETECTED".equals(action)) {
                                  String deviceName = intent.getStringExtra("device_name");
                                  String deviceAddress = intent.getStringExtra("device_address");
                                  
                                  sendDebugNotification("Legacy Vehicle Detected: " + deviceName);
                                  
                                  runOnUiThread(() -> {
                                      connectedVehicleText.setText("Vehicle: " + deviceName);
                                      bluetoothStatusText.setText("Bluetooth: Connected");
                                      bluetoothStatusText.setTextColor(Color.GREEN);
                                      
                                      Toast.makeText(MainActivity.this, "Vehicle detected: " + deviceName, Toast.LENGTH_SHORT).show();
                                  });
                              } else if ("com.miletrackerpro.app.NEW_VEHICLE_DETECTED".equals(action)) {
                                  String deviceName = intent.getStringExtra("device_name");
                                  String deviceAddress = intent.getStringExtra("device_address");
                                  String source = intent.getStringExtra("source");
                                  
                                  sendDebugNotification("WorkManager New Vehicle: " + deviceName + " from " + source);
                                  
                                  runOnUiThread(() -> {
                                      showVehicleRegistrationDialog(deviceAddress, deviceName);
                                  });
                              } else if ("com.miletrackerpro.app.VEHICLE_CONNECTED".equals(action)) {
                                  String deviceName = intent.getStringExtra("device_name");
                                  String deviceAddress = intent.getStringExtra("device_address");
                                  String source = intent.getStringExtra("source");
                                  
                                  sendDebugNotification("WorkManager Vehicle Connected: " + deviceName + " from " + source);
                                  
                                  runOnUiThread(() -> {
                                      connectedVehicleText.setText("Vehicle: " + deviceName);
                                      bluetoothStatusText.setText("Bluetooth: Connected");
                                      bluetoothStatusText.setTextColor(Color.GREEN);
                                      
                                      Toast.makeText(MainActivity.this, "Vehicle connected: " + deviceName, Toast.LENGTH_SHORT).show();
                                      
                                      // Start auto detection if enabled
                                      if (isAutoDetectionEnabled()) {
                                          startAutoDetection();
                                      }
                                  });
                              } else if ("com.miletrackerpro.app.VEHICLE_DISCONNECTED".equals(action)) {
                                  String deviceName = intent.getStringExtra("device_name");
                                  String deviceAddress = intent.getStringExtra("device_address");
                                  String source = intent.getStringExtra("source");
                                  
                                  sendDebugNotification("WorkManager Vehicle Disconnected: " + deviceName + " from " + source);
                                  
                                  runOnUiThread(() -> {
                                      connectedVehicleText.setText("Vehicle: None connected");
                                      bluetoothStatusText.setText("Bluetooth: Enabled");
                                      bluetoothStatusText.setTextColor(Color.parseColor("#667eea"));
                                      
                                      Toast.makeText(MainActivity.this, "Vehicle disconnected: " + deviceName, Toast.LENGTH_SHORT).show();
                                      
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
                      registerReceiver(bluetoothDiscoveryReceiver, filter);
                      
                      sendDebugNotification("Bluetooth Discovery: Receiver registered for device discovery");
                      
                      // IMMEDIATE TEST: Check already paired devices first
                      checkPairedDevices();
                      
                      // Start periodic scanning
                      startPeriodicBluetoothScan();
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error initializing Bluetooth discovery: " + e.getMessage(), e);
                  }
              }
              
              private void checkPairedDevices() {
                  sendDebugNotification("DEBUG: checkPairedDevices() method called");
                  
                  try {
                      if (bluetoothAdapter == null) {
                          sendDebugNotification("DEBUG: Bluetooth adapter is null - cannot check paired devices");
                          return;
                      }
                      
                      sendDebugNotification("DEBUG: Bluetooth adapter exists, checking Android 12+ permissions...");
                      
                      // Check Android 12+ permissions more thoroughly
                      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                          boolean hasBluetoothConnect = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
                          boolean hasBluetoothScan = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
                          
                          sendDebugNotification("DEBUG: BLUETOOTH_CONNECT permission: " + hasBluetoothConnect);
                          sendDebugNotification("DEBUG: BLUETOOTH_SCAN permission: " + hasBluetoothScan);
                          
                          if (!hasBluetoothConnect) {
                              sendDebugNotification("DEBUG: Missing BLUETOOTH_CONNECT - requesting permission");
                              ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_CONNECT}, 2);
                              return;
                          }
                          
                          if (!hasBluetoothScan) {
                              sendDebugNotification("DEBUG: Missing BLUETOOTH_SCAN - requesting permission");
                              ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_SCAN}, 3);
                              return;
                          }
                      }
                      
                      sendDebugNotification("DEBUG: All permissions OK, getting paired devices...");
                      
                      Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
                      sendDebugNotification("DEBUG: Found " + pairedDevices.size() + " paired devices total");
                      
                      if (pairedDevices.size() == 0) {
                          sendDebugNotification("DEBUG: No paired devices found! Android 12+ issue - user needs to enable 'Nearby devices' permission in app settings manually");
                          sendDebugNotification("SOLUTION: Go to Settings > Apps > MileTracker Pro > Permissions > Allow 'Nearby devices' permission");
                          return;
                      }
                      
                      // Show ALL paired devices for debugging
                      int deviceCount = 0;
                      for (BluetoothDevice device : pairedDevices) {
                          deviceCount++;
                          String deviceName = device.getName();
                          String deviceAddress = device.getAddress();
                          
                          sendDebugNotification("📱 Device " + deviceCount + ": " + (deviceName != null ? deviceName : "Unknown") + " (" + deviceAddress + ")");
                          
                          // Test vehicle detection specifically
                          if (deviceName != null) {
                              boolean isVehicle = isVehicleDevice(deviceName);
                              sendDebugNotification("🚗 Is '" + deviceName + "' a vehicle? " + isVehicle);
                              
                              // Show why it's not a vehicle if it isn't
                              if (!isVehicle) {
                                  sendDebugNotification("❌ '" + deviceName + "' not recognized as vehicle - doesn't match patterns");
                              } else {
                                  sendDebugNotification("✅ VEHICLE FOUND: " + deviceName);
                                  
                                  if (!isVehicleAlreadyRegistered(deviceAddress)) {
                                      sendDebugNotification("🆕 Vehicle not registered - showing dialog");
                                      runOnUiThread(() -> {
                                          showVehicleRegistrationDialog(deviceAddress, deviceName);
                                      });
                                  } else {
                                      sendDebugNotification("✅ Vehicle already registered: " + deviceName);
                                  }
                              }
                          } else {
                              sendDebugNotification("❓ Device has no name - cannot detect if vehicle");
                          }
                      }
                      
                      sendDebugNotification("DEBUG: Finished checking all " + deviceCount + " paired devices");
                      
                  } catch (SecurityException e) {
                      sendDebugNotification("DEBUG: SecurityException - need 'Nearby devices' permission in app settings: " + e.getMessage());
                      sendDebugNotification("SOLUTION: Settings > Apps > MileTracker Pro > Permissions > Allow 'Nearby devices'");
                  } catch (Exception e) {
                      sendDebugNotification("DEBUG: Exception in checkPairedDevices: " + e.getMessage());
                      Log.e(TAG, "Error checking paired devices: " + e.getMessage(), e);
                  }
              }
              
              private void startPeriodicBluetoothScan() {
                  if (bluetoothAdapter == null) {
                      sendDebugNotification("WorkManager: Cannot start - Bluetooth adapter is null");
                      return;
                  }
                  
                  sendDebugNotification("WorkManager: Starting background Bluetooth monitoring...");
                  
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
                  
                  sendDebugNotification("WorkManager: Background Bluetooth monitoring started successfully");
                  
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
                      sendDebugNotification("Auto Detection: Starting service...");
                      
                      // Start the AutoDetectionService
                      Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                      serviceIntent.setAction("START_AUTO_DETECTION");
                      startService(serviceIntent);
                      
                      // Update UI
                      runOnUiThread(() -> {
                          // Update auto detection button if it exists
                          if (autoToggle != null) {
                              autoToggle.setText("Auto Detection: ON");
                              autoToggle.setTextColor(Color.parseColor("#28a745"));
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
                      
                      // Stop the AutoDetectionService
                      Intent serviceIntent = new Intent(this, AutoDetectionService.class);
                      serviceIntent.setAction("STOP_AUTO_DETECTION");
                      stopService(serviceIntent);
                      
                      // Update UI
                      runOnUiThread(() -> {
                          // Update auto detection button if it exists
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
              
              private void startBluetoothDiscovery() {
                  try {
                      if (bluetoothAdapter == null) {
                          sendDebugNotification("Bluetooth Discovery: Adapter is null - device not supported");
                          return;
                      }
                      
                      if (!bluetoothAdapter.isEnabled()) {
                          sendDebugNotification("Bluetooth Discovery: Bluetooth is disabled - need to enable in settings");
                          return;
                      }
                      
                      // Check permissions for Android 12+
                      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                          if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                              sendDebugNotification("Bluetooth Discovery: Permission denied - need BLUETOOTH_SCAN permission");
                              return;
                          }
                      }
                      
                      // Cancel any ongoing discovery
                      if (bluetoothAdapter.isDiscovering()) {
                          bluetoothAdapter.cancelDiscovery();
                          sendDebugNotification("Bluetooth Discovery: Cancelled previous discovery");
                      }
                      
                      // Start discovery
                      boolean started = bluetoothAdapter.startDiscovery();
                      if (started) {
                          sendDebugNotification("BLUETOOTH SCAN STARTED: Now actively scanning for ALL devices in range...");
                          
                          runOnUiThread(() -> {
                              bluetoothStatusText.setText("Bluetooth: Scanning...");
                              bluetoothStatusText.setTextColor(Color.BLUE);
                          });
                      } else {
                          sendDebugNotification("Bluetooth Discovery: Failed to start - unknown error");
                      }
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error starting Bluetooth discovery: " + e.getMessage(), e);
                  }
              }

              @Override
              public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
                  super.onRequestPermissionsResult(requestCode, permissions, grantResults);

                  if (requestCode == LOCATION_PERMISSION_REQUEST) {
                      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                          Toast.makeText(this, "Location permission granted", Toast.LENGTH_SHORT).show();
                          initializeGPS();

                          // Continue with next permission request
                          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                              requestPermissions(); // This will check background location next
                          } else {
                              // If no background location needed, go straight to Bluetooth
                              requestBluetoothPermissions();
                          }
                      } else {
                          Toast.makeText(this, "Location permission required for trip tracking", Toast.LENGTH_LONG).show();
                          // Still try to request Bluetooth permissions even if location denied
                          requestBluetoothPermissions();
                      }
                  } else if (requestCode == BACKGROUND_LOCATION_PERMISSION_REQUEST) {
                      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                          Toast.makeText(this, "Background location permission granted", Toast.LENGTH_SHORT).show();
                      } else {
                          Toast.makeText(this, "Background location permission recommended for auto detection", Toast.LENGTH_LONG).show();
                      }
                      // Always request Bluetooth permissions after background location
                      requestBluetoothPermissions();
                  } else if (requestCode == BLUETOOTH_PERMISSION_REQUEST) {
                      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                          Toast.makeText(this, "Bluetooth permissions granted - Vehicle recognition enabled", Toast.LENGTH_SHORT).show();
                          Log.d(TAG, "Bluetooth permissions granted, vehicle recognition should now work");
                          
                          // Initialize Bluetooth discovery after permissions are granted
                          initializeBluetoothDiscovery();
                      } else {
                          Toast.makeText(this, "Bluetooth permissions required for vehicle recognition", Toast.LENGTH_LONG).show();
                          Log.w(TAG, "Bluetooth permissions denied, vehicle recognition disabled");
                      }
                  }
              }

              @Override
              public void onLocationChanged(Location location) {
                  // Handle location updates if needed
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
                  
                  // Cancel WorkManager tasks when app is destroyed
                  try {
                      WorkManager.getInstance(this).cancelUniqueWork("bluetooth_vehicle_monitoring");
                      sendDebugNotification("WorkManager: Background monitoring cancelled");
                  } catch (Exception e) {
                      Log.e(TAG, "Error cancelling WorkManager tasks: " + e.getMessage(), e);
                  }
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
                      removeButton.setBackgroundColor(0xFFFF5722);
                      removeButton.setTextColor(0xFFFFFFFF);
                      removeButton.setPadding(20, 8, 20, 8);
                      removeButton.setOnClickListener(v -> {
                          // Remove from both local storage and API
                          tripStorage.removeCustomCategory(category);
                          CloudBackupService cloudService = new CloudBackupService(this);
                          cloudService.removeCustomCategoryFromAPI(category);
                          Toast.makeText(this, "Removed category: " + category, Toast.LENGTH_SHORT).show();
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
                              Toast.makeText(this, "Cannot add default category", Toast.LENGTH_SHORT).show();
                              return;
                          }
                          
                          // Add to both local storage and API
                          tripStorage.addCustomCategory(newCategory);
                          CloudBackupService cloudService = new CloudBackupService(this);
                          cloudService.addCustomCategoryToAPI(newCategory);
                          Toast.makeText(this, "Added category: " + newCategory, Toast.LENGTH_SHORT).show();
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
                  startTimeLabel.setTextColor(0xFF495057);
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
                  endTimeLabel.setTextColor(0xFF495057);
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
                  workDaysLabel.setTextColor(0xFF495057);
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
                          
                          Toast.makeText(this, "Work hours configuration saved", Toast.LENGTH_SHORT).show();
                          
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
                  refreshButton.setBackgroundColor(0xFF5A6268); // Darker gray when pressed
                  
                  Toast.makeText(this, "Refreshing trips from API...", Toast.LENGTH_SHORT).show();
                  
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
                              refreshButton.setText("Refresh Trips");
                              refreshButton.setEnabled(true);
                              refreshButton.setBackgroundColor(0xFF6C757D); // Original muted gray
                              
                              // Update displays
                              if ("home".equals(currentTab)) {
                                  updateRecentTrips();
                              } else {
                                  updateAllTrips();
                              }
                              updateStats();
                              
                              // Show success feedback
                              Toast.makeText(MainActivity.this, "✅ Trips refreshed successfully!", Toast.LENGTH_SHORT).show();
                          });
                          
                      } catch (Exception e) {
                          Log.e(TAG, "Error during refresh: " + e.getMessage(), e);
                          
                          runOnUiThread(() -> {
                              // Reset button to original gray color
                              refreshButton.setText("Refresh Trips");
                              refreshButton.setEnabled(true);
                              refreshButton.setBackgroundColor(0xFF6C757D); // Original muted gray
                              
                              // Show error feedback
                              Toast.makeText(MainActivity.this, "⚠️ Refresh failed - using local data", Toast.LENGTH_SHORT).show();
                          });
                      }
                  }).start();
              }

              // ENHANCED: Complete edit dialog for all trip fields
              private void showEditTripDialog(Trip trip) {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("✏️ Edit Trip - All Fields");

                  // Create scrollable layout
                  ScrollView scrollView = new ScrollView(this);
                  LinearLayout layout = new LinearLayout(this);
                  layout.setOrientation(LinearLayout.VERTICAL);
                  layout.setPadding(50, 20, 50, 20);

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
                  dateButton.setBackgroundColor(0xFFE5E7EB);
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
                  layout.addView(notesLabel);
                  layout.addView(notesEdit);

                  scrollView.addView(layout);
                  builder.setView(scrollView);

                  builder.setPositiveButton("💾 Save Changes", (dialog, which) -> {
                      try {
                          // Parse and validate all fields
                          String startLocation = startLocationEdit.getText().toString().trim();
                          String endLocation = endLocationEdit.getText().toString().trim();
                          double distance = Double.parseDouble(distanceEdit.getText().toString());
                          long durationMins = Long.parseLong(durationEdit.getText().toString());
                          String startTimeStr = startTimeEdit.getText().toString().trim();
                          
                          // Validation
                          if (startLocation.isEmpty() || endLocation.isEmpty()) {
                              Toast.makeText(this, "Start and end locations are required", Toast.LENGTH_SHORT).show();
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
                          
                          Toast.makeText(this, "✅ All trip details updated successfully!", Toast.LENGTH_SHORT).show();
                          if ("home".equals(currentTab)) {
                              updateRecentTrips();
                          } else {
                              updateAllTrips();
                          }
                          updateStats();
                          
                          Log.d(TAG, "Trip fully updated: " + trip.getStartAddress() + " to " + trip.getEndAddress() + 
                                " on " + dateFormat.format(new Date(trip.getStartTime())));
                          
                      } catch (NumberFormatException e) {
                          Toast.makeText(this, "Please enter valid numbers for distance and duration", Toast.LENGTH_SHORT).show();
                      } catch (Exception e) {
                          Log.e(TAG, "Error updating trip: " + e.getMessage(), e);
                          Toast.makeText(this, "Error updating trip: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                      }
                  });

                  builder.setNegativeButton("❌ Cancel", null);
                  
                  AlertDialog editDialog = builder.create();
                  editDialog.show();
              }

              private void showDeleteConfirmationDialog(Trip trip) {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("🗑️ Delete Trip - Permanent Action");
                  
                  String message = String.format(
                      "⚠️ Delete this trip?\n\n" +
                      "📍 From: %s\n" +
                      "📍 To: %s\n" +
                      "📏 Distance: %.1f miles\n" +
                      "📅 Date: %s\n" +
                      "🏢 Client: %s\n" +
                      "📝 Purpose: %s\n\n" +
                      "❗ This action cannot be undone.\n" +
                      "💾 Trip will be permanently deleted from both local storage and cloud backup.",
                      trip.getStartAddress(),
                      trip.getEndAddress(),
                      trip.getDistance(),
                      trip.getFormattedDateTime(),
                      trip.getClientName() != null ? trip.getClientName() : "Personal",
                      trip.getNotes() != null ? trip.getNotes() : "Not specified"
                  );
                  
                  builder.setMessage(message);
                  
                  builder.setPositiveButton("🗑️ DELETE PERMANENTLY", (dialog, which) -> {
                      try {
                          // Delete trip using TripStorage's delete method
                          tripStorage.deleteTrip(trip.getId());
                          
                          // Refresh display
                          updateRecentTrips();
                          updateAllTrips();
                          updateStats();
                          
                          Toast.makeText(this, "🗑️ Trip deleted successfully", Toast.LENGTH_SHORT).show();
                      } catch (Exception e) {
                          Log.e(TAG, "Error deleting trip: " + e.getMessage(), e);
                          Toast.makeText(this, "❌ Error deleting trip", Toast.LENGTH_SHORT).show();
                      }
                  });
                  
                  builder.setNegativeButton("❌ Cancel", null);
                  
                  AlertDialog deleteDialog = builder.create();
                  deleteDialog.show();
              }

              // Export functionality with date range picker
              private void showExportDialog() {
                  AlertDialog.Builder builder = new AlertDialog.Builder(this);
                  builder.setTitle("📤 Export Trips");
                  
                  ScrollView scrollView = new ScrollView(this);
                  LinearLayout layout = new LinearLayout(this);
                  layout.setOrientation(LinearLayout.VERTICAL);
                  layout.setPadding(40, 20, 40, 20);
                  
                  // Category filter selection
                  TextView categoryLabel = new TextView(this);
                  categoryLabel.setText("🏷️ Filter by Category:");
                  categoryLabel.setTextSize(16);
                  categoryLabel.setTextColor(0xFF495057);
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
                  dateRangeLabel.setText("📅 Select Date Range:");
                  dateRangeLabel.setTextSize(16);
                  dateRangeLabel.setTextColor(0xFF495057);
                  dateRangeLabel.setPadding(0, 10, 0, 10);
                  layout.addView(dateRangeLabel);
                  
                  // Start date picker
                  Button startDateButton = new Button(this);
                  startDateButton.setText("📅 Start Date: Tap to select");
                  startDateButton.setBackgroundColor(0xFF007bff);
                  startDateButton.setTextColor(0xFFFFFFFF);
                  startDateButton.setPadding(20, 15, 20, 15);
                  layout.addView(startDateButton);
                  
                  // End date picker  
                  Button endDateButton = new Button(this);
                  endDateButton.setText("📅 End Date: Tap to select");
                  endDateButton.setBackgroundColor(0xFF007bff);
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
                  formatLabel.setText("📄 Export Format:");
                  formatLabel.setTextSize(16);
                  formatLabel.setTextColor(0xFF495057);
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
                  methodLabel.setText("📤 Export Method:");
                  methodLabel.setTextSize(16);
                  methodLabel.setTextColor(0xFF495057);
                  methodLabel.setPadding(0, 20, 0, 10);
                  layout.addView(methodLabel);
                  
                  // Email button
                  Button emailButton = new Button(this);
                  emailButton.setText("📧 Send via Email");
                  emailButton.setBackgroundColor(0xFF6f42c1);
                  emailButton.setTextColor(0xFFFFFFFF);
                  emailButton.setPadding(20, 15, 20, 15);
                  layout.addView(emailButton);
                  
                  // Cloud storage button
                  Button cloudButton = new Button(this);
                  cloudButton.setText("☁️ Share to Cloud (Drive, Dropbox, OneDrive)");
                  cloudButton.setBackgroundColor(0xFF17a2b8);
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
                          startDateButton.setText("📅 Start: " + (month + 1) + "/" + dayOfMonth + "/" + year);
                          startDateSet[0] = true;
                      }, startCal.get(Calendar.YEAR), startCal.get(Calendar.MONTH), startCal.get(Calendar.DAY_OF_MONTH)).show();
                  });
                  
                  // End date picker click handler
                  endDateButton.setOnClickListener(v -> {
                      new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                          endCal.set(year, month, dayOfMonth);
                          endDateButton.setText("📅 End: " + (month + 1) + "/" + dayOfMonth + "/" + year);
                          endDateSet[0] = true;
                      }, endCal.get(Calendar.YEAR), endCal.get(Calendar.MONTH), endCal.get(Calendar.DAY_OF_MONTH)).show();
                  });
                  
                  // Export handlers
                  emailButton.setOnClickListener(v -> {
                      if (!startDateSet[0] || !endDateSet[0]) {
                          Toast.makeText(this, "❌ Please select both start and end dates", Toast.LENGTH_SHORT).show();
                          return;
                      }
                      String selectedCategory = categorySpinner.getSelectedItem().toString();
                      int formatIndex = formatSpinner.getSelectedItemPosition(); // 0=CSV, 1=TXT, 2=PDF
                      exportAndEmail(startCal.getTime(), endCal.getTime(), selectedCategory, formatIndex);
                  });
                  
                  cloudButton.setOnClickListener(v -> {
                      if (!startDateSet[0] || !endDateSet[0]) {
                          Toast.makeText(this, "❌ Please select both start and end dates", Toast.LENGTH_SHORT).show();
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
                          Toast.makeText(this, "❌ No " + categoryText + " found", Toast.LENGTH_SHORT).show();
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
                          
                          // Try email-specific apps first, fallback to general sharing
                          try {
                              emailIntent.setPackage("com.google.android.gm"); // Try Gmail first
                              if (emailIntent.resolveActivity(getPackageManager()) != null) {
                                  startActivity(emailIntent);
                                  Toast.makeText(this, "✅ Opening Gmail with " + tripsInRange.size() + " trips attached as " + fileName, Toast.LENGTH_LONG).show();
                              } else {
                                  // Try Outlook
                                  emailIntent.setPackage("com.microsoft.office.outlook");
                                  if (emailIntent.resolveActivity(getPackageManager()) != null) {
                                      startActivity(emailIntent);
                                      Toast.makeText(this, "✅ Opening Outlook with " + tripsInRange.size() + " trips attached as " + fileName, Toast.LENGTH_LONG).show();
                                  } else {
                                      // Fallback to any email app
                                      emailIntent.setPackage(null);
                                      emailIntent.setType("message/rfc822");
                                      if (emailIntent.resolveActivity(getPackageManager()) != null) {
                                          startActivity(Intent.createChooser(emailIntent, "Send via email..."));
                                          Toast.makeText(this, "✅ Email created with " + tripsInRange.size() + " trips attached as " + fileName, Toast.LENGTH_LONG).show();
                                      } else {
                                          Toast.makeText(this, "❌ No email app available", Toast.LENGTH_SHORT).show();
                                      }
                                  }
                              }
                          } catch (Exception e) {
                              Log.e(TAG, "Error launching email: " + e.getMessage(), e);
                              Toast.makeText(this, "❌ Failed to open email app", Toast.LENGTH_SHORT).show();
                          }
                      } catch (IOException e) {
                          Log.e(TAG, "Error creating export file: " + e.getMessage(), e);
                          Toast.makeText(this, "❌ Failed to create export file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error exporting to email: " + e.getMessage(), e);
                      Toast.makeText(this, "❌ Export failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
              }
              
              private void exportToCloud(Date startDate, Date endDate, String category, int formatIndex) {
                  try {
                      List<Trip> tripsInRange = getTripsInDateRange(startDate, endDate, category);
                      if (tripsInRange.isEmpty()) {
                          String categoryText = category.equals("All Categories") ? "selected date range" : category + " trips in selected date range";
                          Toast.makeText(this, "❌ No " + categoryText + " found", Toast.LENGTH_SHORT).show();
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
                              startActivity(Intent.createChooser(shareIntent, "Share to cloud storage..."));
                              String formatName = "";
                              switch (formatIndex) {
                                  case 0: formatName = "CSV"; break;
                                  case 1: formatName = "TXT"; break;
                                  case 2: formatName = "PDF"; break;
                                  default: formatName = "CSV"; break;
                              }
                              Toast.makeText(this, "✅ Sharing " + tripsInRange.size() + " trips (" + formatName + ") to cloud", Toast.LENGTH_SHORT).show();
                          } else {
                              Toast.makeText(this, "❌ No sharing apps available", Toast.LENGTH_SHORT).show();
                          }
                      } catch (IOException e) {
                          Log.e(TAG, "Error creating export file: " + e.getMessage(), e);
                          Toast.makeText(this, "❌ Failed to create export file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                      }
                  } catch (Exception e) {
                      Log.e(TAG, "Error exporting to cloud: " + e.getMessage(), e);
                      Toast.makeText(this, "❌ Export failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                  }
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
                  csv.append("Business Deduction (IRS $").append(String.format("%.2f", getIrsBusinessRate())).append("/mi),\"$").append(String.format("%.2f", totalMiles * getIrsBusinessRate())).append("\"\n");
                  
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
                  txt.append("Business Deduction (IRS $").append(String.format("%.2f", getIrsBusinessRate())).append("/mi): $").append(String.format("%.2f", totalMiles * getIrsBusinessRate())).append("\n");
                  
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
                      canvas.drawText("Business Deduction (IRS $" + String.format("%.2f", getIrsBusinessRate()) + "/mi): $" + String.format("%.2f", totalMiles * getIrsBusinessRate()), 50, yPosition, paint);
                      
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
                  builder.setTitle("✂️ Split Trip");
                  
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
                  tripInfo.setTextColor(0xFF495057);
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
                  
                  builder.setPositiveButton("✂️ Split Trip", (dialog, which) -> {
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
                                      Toast.makeText(this, "⚠️ Split distances don't match total: " + 
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
                                  Toast.makeText(this, "⚠️ Please enter valid numbers for distances", Toast.LENGTH_SHORT).show();
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
                          
                          Toast.makeText(this, "✂️ Trip split successfully into 2 trips", Toast.LENGTH_SHORT).show();
                          
                      } catch (Exception e) {
                          Log.e(TAG, "Error splitting trip: " + e.getMessage(), e);
                          Toast.makeText(this, "❌ Error splitting trip", Toast.LENGTH_SHORT).show();
                      }
                  });
                  
                  builder.setNegativeButton("❌ Cancel", null);
                  
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
                                      performSwipeClassification(currentSwipeTrip, "Business", 0xFF28A745);
                                  } else {
                                      // Left swipe - Personal
                                      Log.d(TAG, "Left swipe detected - Personal");
                                      performSwipeClassification(currentSwipeTrip, "Personal", 0xFF0044FF);
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
                                      Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                                      Log.d(TAG, "Success toast shown: " + message);
                                      
                                      // Clear swipe state
                                      swipeInProgress = false;
                                      currentSwipeTrip = null;
                                      currentSwipeView = null;
                                      
                                      // Refresh display to completely remove the swiped item and clean up containers
                                      if ("classify".equals(currentTab)) {
                                          updateClassifyTrips();
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
                          return 0xFFE8F5E8; // Light green background
                      case "personal":
                          return 0xFFE3F2FD; // Light blue background
                      case "medical":
                          return 0xFFFFF3E0; // Light yellow background
                      case "charity":
                          return 0xFFFFEBEE; // Light red background
                      case "uncategorized":
                          return 0xFFF8F9FA; // Light gray background for uncategorized
                      default:
                          return 0xFFFFFFFF; // White background
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
                          String message = "🤖 Auto-classified " + similarTrips.size() + " similar trip" + (similarTrips.size() == 1 ? "" : "s") + " as " + category;
                          Toast.makeText(this, message, Toast.LENGTH_LONG).show();
                          
                          Log.d(TAG, "Auto-classified " + similarTrips.size() + " similar trips as " + category);
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
                      
                      Toast.makeText(this, "✅ Reset " + resetCount + " trips to Uncategorized", Toast.LENGTH_LONG).show();
                      Log.d(TAG, "Reset " + resetCount + " trips to Uncategorized");
                      
                      // Refresh display
                      updateAllTrips();
                      updateStats();
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error resetting trips: " + e.getMessage(), e);
                      Toast.makeText(this, "❌ Error resetting trips", Toast.LENGTH_SHORT).show();
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
                      SharedPreferences prefs = getSharedPreferences("BluetoothVehiclePrefs", MODE_PRIVATE);
                      String vehiclesJson = prefs.getString("vehicle_registry", "{}");
                      
                      if (vehiclesJson.equals("{}")) {
                          return false;
                      }
                      
                      org.json.JSONObject vehiclesObject = new org.json.JSONObject(vehiclesJson);
                      return vehiclesObject.has(deviceAddress);
                      
                  } catch (Exception e) {
                      sendDebugNotification("Error checking vehicle registration: " + e.getMessage());
                      return false;
                  }
              }
              
              // Debug notification system for Phase 1 testing
              private static int debugNotificationId = 1000;
              private void sendDebugNotification(String message) {
                  try {
                      NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                      
                      // Check if notifications are enabled
                      if (!notificationManager.areNotificationsEnabled()) {
                          // Request notification permission
                          requestNotificationPermission();
                          // Fallback to toast for now
                          Toast.makeText(this, "DEBUG: " + message, Toast.LENGTH_LONG).show();
                          return;
                      }
                      
                      // Create notification channel for Android 8.0+
                      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                          String channelId = "debug_channel";
                          String channelName = "Debug Notifications";
                          String channelDescription = "Phase 1 debugging notifications";
                          int importance = NotificationManager.IMPORTANCE_DEFAULT;
                          
                          NotificationChannel channel = new NotificationChannel(channelId, channelName, importance);
                          channel.setDescription(channelDescription);
                          notificationManager.createNotificationChannel(channel);
                      }
                      
                      // Build notification
                      NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "debug_channel")
                          .setSmallIcon(android.R.drawable.ic_dialog_info)
                          .setContentTitle("Phase 1 Debug")
                          .setContentText(message)
                          .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                          .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                          .setAutoCancel(true);
                      
                      // Show notification
                      notificationManager.notify(debugNotificationId++, builder.build());
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error sending debug notification: " + e.getMessage(), e);
                      // Fallback to toast if notification fails
                      Toast.makeText(this, "DEBUG: " + message, Toast.LENGTH_LONG).show();
                  }
              }
              
              private void requestNotificationPermission() {
                  try {
                      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                          // Android 13+ requires runtime permission
                          if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                              ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
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
                              Toast.makeText(this, "Please enable notifications in Android Settings", Toast.LENGTH_LONG).show();
                          }
                      })
                      .setNegativeButton("Use Toast Messages", (dialog, which) -> {
                          Toast.makeText(this, "Debug messages will appear as toast notifications", Toast.LENGTH_LONG).show();
                      })
                      .show();
              }
              
              // Fallback method if BluetoothVehicleService fails to start
              private void startBuiltInBluetoothDiscovery() {
                  sendDebugNotification("Bluetooth Fallback: Starting built-in Bluetooth discovery");
                  try {
                      if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                          sendDebugNotification("Bluetooth Discovery: Starting periodic scanning for vehicles");
                          startPeriodicBluetoothScan();
                      } else {
                          sendDebugNotification("Bluetooth Error: Adapter not available or disabled");
                      }
                  } catch (Exception e) {
                      sendDebugNotification("Bluetooth Fallback: Error - " + e.getMessage());
                  }
              }

              // Core Bluetooth connection checking method from BluetoothVehicleService
              private void checkBluetoothConnections() {
                  Log.d(TAG, "Checking Bluetooth connections");
                  sendDebugNotification("🔍 Checking Bluetooth connections...");
                  
                  if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                      Log.d(TAG, "Bluetooth not available or disabled");
                      sendDebugNotification("🔴 Bluetooth not available or disabled");
                      return;
                  }
                  
                  Set<BluetoothDevice> bondedDevices = bluetoothAdapter.getBondedDevices();
                  Log.d(TAG, "Found " + bondedDevices.size() + " bonded devices");
                  sendDebugNotification("📱 Found " + bondedDevices.size() + " bonded devices");
                  
                  for (BluetoothDevice device : bondedDevices) {
                      String deviceName = device.getName();
                      String macAddress = device.getAddress();
                      
                      Log.d(TAG, "Checking device: " + deviceName + " (" + macAddress + ")");
                      
                      // UConnect debug logging
                      if (deviceName != null && deviceName.toLowerCase().contains("uconnect")) {
                          Log.d(TAG, "🚗 UCONNECT DEVICE FOUND: " + deviceName + " (" + macAddress + ")");
                          sendDebugNotification("🚗 UCONNECT DEVICE FOUND: " + deviceName);
                      }
                      
                      SharedPreferences prefs = getSharedPreferences("BluetoothVehiclePrefs", MODE_PRIVATE);
                      String registryJson = prefs.getString("vehicle_registry", "{}");
                      
                      try {
                          org.json.JSONObject registry = new org.json.JSONObject(registryJson);
                          
                          if (registry.has(macAddress)) {
                              // Handle registered vehicles
                              try {
                                  boolean isConnected = (boolean) device.getClass().getMethod("isConnected").invoke(device);
                                  Log.d(TAG, "Registered vehicle " + deviceName + " connected: " + isConnected);
                                  sendDebugNotification("✅ Registered vehicle " + deviceName + " connected: " + isConnected);
                                  
                                  if (isConnected) {
                                      handleVehicleConnected(device, registry.getJSONObject(macAddress));
                                  }
                              } catch (Exception e) {
                                  Log.d(TAG, "Could not check connection status for registered vehicle");
                                  sendDebugNotification("⚠️ Could not check connection status for registered vehicle");
                              }
                          } else {
                              // Handle potential new vehicles
                              if (deviceName != null && isLikelyVehicleDevice(device)) {
                                  Log.d(TAG, "Found potential new vehicle: " + deviceName);
                                  sendDebugNotification("🔍 Found potential new vehicle: " + deviceName);
                                  
                                  try {
                                      boolean isConnected = (boolean) device.getClass().getMethod("isConnected").invoke(device);
                                      Log.d(TAG, "New vehicle " + deviceName + " connected: " + isConnected);
                                      sendDebugNotification("📶 New vehicle " + deviceName + " connected: " + isConnected);
                                      
                                      if (isConnected) {
                                          Log.d(TAG, "New vehicle device connected and bonded: " + deviceName);
                                          sendDebugNotification("🎯 New vehicle device connected and bonded: " + deviceName);
                                          showVehicleRegistrationDialog(deviceName, macAddress);
                                      }
                                  } catch (Exception e) {
                                      Log.d(TAG, "Could not check connection status for new vehicle, treating as connected");
                                      sendDebugNotification("⚠️ Could not check connection status, treating as connected");
                                      // If we can't check connection status, assume it's connected since it's bonded
                                      showVehicleRegistrationDialog(deviceName, macAddress);
                                  }
                              } else {
                                  Log.d(TAG, "Non-vehicle device ignored: " + deviceName);
                              }
                          }
                      } catch (Exception e) {
                          Log.e(TAG, "Error processing vehicle registry: " + e.getMessage());
                          sendDebugNotification("❌ Error processing vehicle registry: " + e.getMessage());
                      }
                  }
              }

              // Vehicle connection handler
              private void handleVehicleConnected(BluetoothDevice device, org.json.JSONObject vehicleInfo) {
                  try {
                      String deviceName = vehicleInfo.getString("deviceName");
                      String vehicleType = vehicleInfo.getString("vehicleType");
                      
                      Log.d(TAG, "Vehicle connected: " + deviceName + " (" + vehicleType + ")");
                      sendDebugNotification("🚗 Vehicle connected: " + deviceName + " (" + vehicleType + ")");
                      
                      // Update UI to show connected vehicle
                      runOnUiThread(() -> {
                          if (connectedVehicleText != null) {
                              connectedVehicleText.setText("🚗 Vehicle: " + deviceName + " (" + vehicleType + ")");
                              connectedVehicleText.setBackgroundColor(Color.parseColor("#E8F5E8"));
                          }
                      });
                      
                      // Start auto detection if enabled
                      if (autoDetectionEnabled) {
                          startBluetoothTriggeredAutoDetection(deviceName, vehicleType);
                      }
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error handling vehicle connection: " + e.getMessage());
                      sendDebugNotification("❌ Error handling vehicle connection: " + e.getMessage());
                  }
              }

              // Start auto detection when vehicle connects
              private void startBluetoothTriggeredAutoDetection(String vehicleName, String vehicleType) {
                  try {
                      Log.d(TAG, "Starting Bluetooth-triggered auto detection for: " + vehicleName);
                      sendDebugNotification("🚀 Starting auto detection for: " + vehicleName);
                      
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
                      
                      sendDebugNotification("✅ Auto detection started for: " + vehicleName);
                      
                  } catch (Exception e) {
                      Log.e(TAG, "Error starting Bluetooth-triggered auto detection: " + e.getMessage());
                      sendDebugNotification("❌ Error starting auto detection: " + e.getMessage());
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
          }
