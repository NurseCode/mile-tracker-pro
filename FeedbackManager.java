package com.miletrackerpro.app.utils;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.InputType;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import com.google.android.gms.tasks.Task;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONObject;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class FeedbackManager {
    private static final String TAG = "FeedbackManager";
    private static final String PREFS_NAME = "FeedbackPrefs";
    private static final String KEY_LAST_PROMPT_TIME = "last_prompt_time";
    private static final String KEY_TOTAL_TRIPS_AT_PROMPT = "trips_at_last_prompt";
    private static final String KEY_HAS_GIVEN_FEEDBACK = "has_given_feedback";
    private static final String KEY_PROMPT_COUNT = "prompt_count";
    private static final String KEY_NOTIFICATION_SENT_TIME = "feedback_notification_sent_time";
    private static final String KEY_NOTIFICATION_COUNT = "feedback_notification_count";
    private static final String API_URL = "https://mileage-tracker-codenurse.replit.app/api/feedback";
    
    private static final int MIN_TRIPS_BEFORE_PROMPT = 3;
    private static final int MIN_DAYS_BETWEEN_PROMPTS = 30;
    private static final int MAX_PROMPTS = 3;
    private static final int MIN_TRIPS_BEFORE_NOTIFICATION = 5;
    private static final int MIN_DAYS_BETWEEN_NOTIFICATIONS = 45;
    private static final int MAX_NOTIFICATIONS = 2;
    private static final String NOTIFICATION_CHANNEL_ID = "feedback_channel";
    private static final int NOTIFICATION_ID = 9001;
    public static final String ACTION_SHOW_FEEDBACK = "com.miletrackerpro.app.ACTION_SHOW_FEEDBACK";
    
    private Context context;
    private SharedPreferences prefs;
    private String userEmail;
    private OkHttpClient httpClient;
    private ReviewManager reviewManager;
    
    private int colorPrimary = 0xFF818CF8;
    private int colorSurface = 0xFFFFFFFF;
    private int colorTextPrimary = 0xFF374151;
    private int colorTextSecondary = 0xFF6B7280;
    private int colorSuccess = 0xFF34D399;
    private int colorWarning = 0xFFFBBF24;
    
    public FeedbackManager(Context context, String userEmail) {
        this.context = context;
        this.userEmail = userEmail;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
        this.reviewManager = ReviewManagerFactory.create(context);
    }
    
    public void setThemeColors(int primary, int surface, int textPrimary, int textSecondary, int success, int warning) {
        this.colorPrimary = primary;
        this.colorSurface = surface;
        this.colorTextPrimary = textPrimary;
        this.colorTextSecondary = textSecondary;
        this.colorSuccess = success;
        this.colorWarning = warning;
    }
    
    public boolean shouldShowFeedbackPrompt(int totalTrips) {
        if (prefs.getBoolean(KEY_HAS_GIVEN_FEEDBACK, false)) {
            return false;
        }
        
        int promptCount = prefs.getInt(KEY_PROMPT_COUNT, 0);
        if (promptCount >= MAX_PROMPTS) {
            return false;
        }
        
        if (totalTrips < MIN_TRIPS_BEFORE_PROMPT) {
            return false;
        }
        
        long lastPromptTime = prefs.getLong(KEY_LAST_PROMPT_TIME, 0);
        long daysSinceLastPrompt = (System.currentTimeMillis() - lastPromptTime) / (1000 * 60 * 60 * 24);
        
        if (lastPromptTime > 0 && daysSinceLastPrompt < MIN_DAYS_BETWEEN_PROMPTS) {
            return false;
        }
        
        int tripsAtLastPrompt = prefs.getInt(KEY_TOTAL_TRIPS_AT_PROMPT, 0);
        if (totalTrips <= tripsAtLastPrompt) {
            return false;
        }
        
        return true;
    }
    
    public void showFeedbackPrompt(Activity activity) {
        prefs.edit()
            .putLong(KEY_LAST_PROMPT_TIME, System.currentTimeMillis())
            .putInt(KEY_PROMPT_COUNT, prefs.getInt(KEY_PROMPT_COUNT, 0) + 1)
            .apply();
        
        showSatisfactionDialog(activity);
    }
    
    private void showSatisfactionDialog(Activity activity) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(60, 50, 60, 40);
        layout.setBackgroundColor(colorSurface);
        
        TextView title = new TextView(activity);
        title.setText("We'd Love Your Feedback!");
        title.setTextSize(20);
        title.setTextColor(colorTextPrimary);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);
        
        TextView subtitle = new TextView(activity);
        subtitle.setText("\nWe hope you're enjoying MileTracker Pro. Your opinion means the world to us and helps make the app better for everyone.\n");
        subtitle.setTextSize(15);
        subtitle.setTextColor(colorTextSecondary);
        subtitle.setGravity(Gravity.CENTER);
        layout.addView(subtitle);
        
        TextView question = new TextView(activity);
        question.setText("How has your experience been so far?");
        question.setTextSize(16);
        question.setTextColor(colorTextPrimary);
        question.setGravity(Gravity.CENTER);
        question.setPadding(0, 20, 0, 30);
        layout.addView(question);
        
        LinearLayout emojiRow = new LinearLayout(activity);
        emojiRow.setOrientation(LinearLayout.HORIZONTAL);
        emojiRow.setGravity(Gravity.CENTER);
        emojiRow.setPadding(0, 0, 0, 30);
        
        String[] emojis = {"😞", "😐", "🙂", "😊", "🤩"};
        int[] ratings = {1, 2, 3, 4, 5};
        
        final int[] selectedRating = {0};
        final Button[] emojiButtons = new Button[5];
        
        for (int i = 0; i < 5; i++) {
            final int rating = ratings[i];
            Button emojiBtn = new Button(activity);
            emojiBtn.setText(emojis[i]);
            emojiBtn.setTextSize(24);
            emojiBtn.setBackgroundColor(Color.TRANSPARENT);
            emojiBtn.setPadding(8, 8, 8, 8);
            emojiBtn.setMinWidth(0);
            emojiBtn.setMinimumWidth(0);
            LinearLayout.LayoutParams emojiParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
            emojiBtn.setLayoutParams(emojiParams);
            emojiButtons[i] = emojiBtn;
            
            emojiBtn.setOnClickListener(v -> {
                selectedRating[0] = rating;
                for (int j = 0; j < 5; j++) {
                    if (ratings[j] <= rating) {
                        emojiButtons[j].setAlpha(1.0f);
                        emojiButtons[j].setScaleX(1.2f);
                        emojiButtons[j].setScaleY(1.2f);
                    } else {
                        emojiButtons[j].setAlpha(0.4f);
                        emojiButtons[j].setScaleX(1.0f);
                        emojiButtons[j].setScaleY(1.0f);
                    }
                }
            });
            
            emojiRow.addView(emojiBtn);
        }
        layout.addView(emojiRow);
        
        builder.setView(layout);
        
        AlertDialog dialog = builder.create();
        
        LinearLayout buttonRow = new LinearLayout(activity);
        buttonRow.setOrientation(LinearLayout.VERTICAL);
        buttonRow.setGravity(Gravity.CENTER);
        buttonRow.setPadding(0, 20, 0, 0);
        
        Button submitBtn = createStyledButton(activity, "Continue", Color.WHITE, colorPrimary);
        submitBtn.setOnClickListener(v -> {
            if (selectedRating[0] == 0) {
                Toast.makeText(activity, "Please select a rating", Toast.LENGTH_SHORT).show();
                return;
            }
            dialog.dismiss();
            
            if (selectedRating[0] >= 4) {
                showPlayStoreReviewPrompt(activity, selectedRating[0]);
            } else {
                showDetailedFeedbackDialog(activity, selectedRating[0]);
            }
        });
        buttonRow.addView(submitBtn);
        
        View spacer = new View(activity);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 12));
        buttonRow.addView(spacer);
        
        Button laterBtn = createStyledButton(activity, "Maybe Later", colorTextSecondary, Color.TRANSPARENT);
        laterBtn.setOnClickListener(v -> dialog.dismiss());
        buttonRow.addView(laterBtn);
        
        layout.addView(buttonRow);
        
        dialog.show();
    }
    
    private void showPlayStoreReviewPrompt(Activity activity, int rating) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(60, 50, 60, 40);
        layout.setBackgroundColor(colorSurface);
        
        TextView title = new TextView(activity);
        title.setText("Thank You So Much! 🎉");
        title.setTextSize(20);
        title.setTextColor(colorTextPrimary);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);
        
        TextView message = new TextView(activity);
        message.setText("\nWe're thrilled you're enjoying MileTracker Pro!\n\nWould you be willing to share your experience on the Play Store? Your review helps other drivers discover us and means so much to our small team.\n");
        message.setTextSize(15);
        message.setTextColor(colorTextSecondary);
        message.setGravity(Gravity.CENTER);
        layout.addView(message);
        
        builder.setView(layout);
        AlertDialog dialog = builder.create();
        
        LinearLayout buttonRow = new LinearLayout(activity);
        buttonRow.setOrientation(LinearLayout.VERTICAL);
        buttonRow.setGravity(Gravity.CENTER);
        buttonRow.setPadding(0, 30, 0, 0);
        
        Button yesBtn = createStyledButton(activity, "Leave Review", Color.WHITE, colorSuccess);
        yesBtn.setOnClickListener(v -> {
            dialog.dismiss();
            prefs.edit().putBoolean(KEY_HAS_GIVEN_FEEDBACK, true).apply();
            launchPlayStoreReview(activity);
        });
        buttonRow.addView(yesBtn);
        
        View spacer = new View(activity);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 12));
        buttonRow.addView(spacer);
        
        Button noThanks = createStyledButton(activity, "Not Now", colorTextSecondary, Color.TRANSPARENT);
        noThanks.setOnClickListener(v -> {
            dialog.dismiss();
            submitFeedback(rating, "", "", "", "declined_play_store");
        });
        buttonRow.addView(noThanks);
        
        layout.addView(buttonRow);
        dialog.show();
    }
    
    private void showDetailedFeedbackDialog(Activity activity, int rating) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        
        ScrollView scrollView = new ScrollView(activity);
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(60, 50, 60, 40);
        layout.setBackgroundColor(colorSurface);
        scrollView.addView(layout);
        
        TextView title = new TextView(activity);
        title.setText("We're Sorry to Hear That");
        title.setTextSize(20);
        title.setTextColor(colorTextPrimary);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);
        
        TextView subtitle = new TextView(activity);
        subtitle.setText("\nThank you for being honest with us. We truly want to make MileTracker Pro better for you. Would you mind sharing a bit more about your experience?\n");
        subtitle.setTextSize(15);
        subtitle.setTextColor(colorTextSecondary);
        subtitle.setGravity(Gravity.CENTER);
        layout.addView(subtitle);
        
        TextView uiLabel = new TextView(activity);
        uiLabel.setText("How do you feel about the app's look and colors?");
        uiLabel.setTextSize(14);
        uiLabel.setTextColor(colorTextPrimary);
        uiLabel.setPadding(0, 30, 0, 10);
        layout.addView(uiLabel);
        
        RadioGroup uiGroup = new RadioGroup(activity);
        String[] uiOptions = {"Love it!", "It's okay", "Could be better", "Not my style"};
        for (String option : uiOptions) {
            RadioButton rb = new RadioButton(activity);
            rb.setText(option);
            rb.setTextColor(colorTextSecondary);
            rb.setButtonTintList(android.content.res.ColorStateList.valueOf(colorPrimary));
            uiGroup.addView(rb);
        }
        layout.addView(uiGroup);
        
        TextView funcLabel = new TextView(activity);
        funcLabel.setText("\nAre any features not working well for you?");
        funcLabel.setTextSize(14);
        funcLabel.setTextColor(colorTextPrimary);
        funcLabel.setPadding(0, 20, 0, 10);
        layout.addView(funcLabel);
        
        RadioGroup funcGroup = new RadioGroup(activity);
        String[] funcOptions = {"Everything works great", "GPS tracking issues", "Trip detection problems", "Syncing issues", "Other"};
        for (String option : funcOptions) {
            RadioButton rb = new RadioButton(activity);
            rb.setText(option);
            rb.setTextColor(colorTextSecondary);
            rb.setButtonTintList(android.content.res.ColorStateList.valueOf(colorPrimary));
            funcGroup.addView(rb);
        }
        layout.addView(funcGroup);
        
        TextView commentsLabel = new TextView(activity);
        commentsLabel.setText("\nAnything else you'd like to share? (Optional)");
        commentsLabel.setTextSize(14);
        commentsLabel.setTextColor(colorTextPrimary);
        commentsLabel.setPadding(0, 20, 0, 10);
        layout.addView(commentsLabel);
        
        EditText commentsInput = new EditText(activity);
        commentsInput.setHint("Your thoughts help us improve...");
        commentsInput.setMinLines(3);
        commentsInput.setMaxLines(5);
        commentsInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        commentsInput.setBackgroundColor(0xFFFFFFFF);
        commentsInput.setPadding(30, 30, 30, 30);
        commentsInput.setTextColor(0xFF000000);
        commentsInput.setHintTextColor(0xFF888888);
        layout.addView(commentsInput);
        
        builder.setView(scrollView);
        AlertDialog dialog = builder.create();
        
        LinearLayout buttonRow = new LinearLayout(activity);
        buttonRow.setOrientation(LinearLayout.VERTICAL);
        buttonRow.setGravity(Gravity.CENTER);
        buttonRow.setPadding(0, 40, 0, 0);
        
        Button submitBtn = createStyledButton(activity, "Send Feedback", Color.WHITE, colorPrimary);
        submitBtn.setOnClickListener(v -> {
            String uiFeedback = getSelectedRadioText(uiGroup);
            String funcFeedback = getSelectedRadioText(funcGroup);
            String comments = commentsInput.getText().toString().trim();
            
            dialog.dismiss();
            prefs.edit().putBoolean(KEY_HAS_GIVEN_FEEDBACK, true).apply();
            submitFeedback(rating, uiFeedback, funcFeedback, comments, "detailed");
            
            showThankYouDialog(activity);
        });
        buttonRow.addView(submitBtn);
        
        View spacer = new View(activity);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 12));
        buttonRow.addView(spacer);
        
        Button skipBtn = createStyledButton(activity, "Skip", colorTextSecondary, Color.TRANSPARENT);
        skipBtn.setOnClickListener(v -> {
            dialog.dismiss();
            submitFeedback(rating, "", "", "", "skipped");
        });
        buttonRow.addView(skipBtn);
        
        layout.addView(buttonRow);
        dialog.show();
    }
    
    private void showThankYouDialog(Activity activity) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(60, 50, 60, 40);
        layout.setBackgroundColor(colorSurface);
        
        TextView title = new TextView(activity);
        title.setText("Thank You! 💜");
        title.setTextSize(22);
        title.setTextColor(colorTextPrimary);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);
        
        TextView message = new TextView(activity);
        message.setText("\nYour feedback is incredibly valuable to us. We read every response and use it to make MileTracker Pro better.\n\nThank you for helping us improve!");
        message.setTextSize(15);
        message.setTextColor(colorTextSecondary);
        message.setGravity(Gravity.CENTER);
        layout.addView(message);
        
        builder.setView(layout);
        builder.setPositiveButton("Close", (d, w) -> d.dismiss());
        builder.show();
    }
    
    private String getSelectedRadioText(RadioGroup group) {
        int selectedId = group.getCheckedRadioButtonId();
        if (selectedId != -1) {
            RadioButton selected = group.findViewById(selectedId);
            if (selected != null) {
                return selected.getText().toString();
            }
        }
        return "";
    }
    
    private Button createStyledButton(Activity activity, String text, int textColor, int bgColor) {
        Button btn = new Button(activity);
        btn.setText(text);
        btn.setTextColor(textColor);
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setPadding(40, 25, 40, 25);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        btn.setLayoutParams(params);
        btn.setSingleLine(true);
        
        GradientDrawable drawable = new GradientDrawable();
        drawable.setCornerRadius(25);
        if (bgColor == Color.TRANSPARENT) {
            drawable.setColor(Color.TRANSPARENT);
            drawable.setStroke(2, colorTextSecondary);
        } else {
            drawable.setColor(bgColor);
        }
        btn.setBackground(drawable);
        
        return btn;
    }
    
    private void launchPlayStoreReview(Activity activity) {
        Task<ReviewInfo> request = reviewManager.requestReviewFlow();
        request.addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                ReviewInfo reviewInfo = task.getResult();
                Task<Void> flow = reviewManager.launchReviewFlow(activity, reviewInfo);
                flow.addOnCompleteListener(flowTask -> {
                    Log.d(TAG, "Review flow completed");
                });
            } else {
                Log.e(TAG, "Failed to get review info: " + task.getException());
            }
        });
    }
    
    private void submitFeedback(int rating, String uiFeedback, String funcFeedback, String comments, String feedbackType) {
        try {
            JSONObject json = new JSONObject();
            json.put("email", userEmail);
            json.put("rating", rating);
            json.put("ui_feedback", uiFeedback);
            json.put("functionality_feedback", funcFeedback);
            json.put("comments", comments);
            json.put("feedback_type", feedbackType);
            json.put("app_version", getAppVersion());
            json.put("device_info", getDeviceInfo());
            
            RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json")
            );
            
            Request request = new Request.Builder()
                .url(API_URL)
                .post(body)
                .build();
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    Log.e(TAG, "Failed to submit feedback: " + e.getMessage());
                    // Show visible error to user for debugging
                    if (context instanceof Activity) {
                        ((Activity) context).runOnUiThread(() -> {
                            Toast.makeText(context, "Feedback send failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        });
                    }
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        Log.d(TAG, "Feedback submitted successfully");
                        // Show success confirmation
                        if (context instanceof Activity) {
                            ((Activity) context).runOnUiThread(() -> {
                                Toast.makeText(context, "Thank you! Feedback received.", Toast.LENGTH_SHORT).show();
                            });
                        }
                    } else {
                        Log.e(TAG, "Feedback submission failed: " + response.code());
                        // Show error with status code
                        if (context instanceof Activity) {
                            ((Activity) context).runOnUiThread(() -> {
                                Toast.makeText(context, "Feedback error: HTTP " + response.code(), Toast.LENGTH_LONG).show();
                            });
                        }
                    }
                    response.close();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error creating feedback request: " + e.getMessage());
        }
    }
    
    private String getAppVersion() {
        try {
            return context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "unknown";
        }
    }
    
    private String getDeviceInfo() {
        return android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL + 
               " (Android " + android.os.Build.VERSION.RELEASE + ")";
    }
    
    public void recordTripCompleted(int totalTrips) {
        prefs.edit().putInt(KEY_TOTAL_TRIPS_AT_PROMPT, totalTrips).apply();
    }
    
    /**
     * Force show feedback dialog for testing purposes.
     * Bypasses all cooldown and trip count checks.
     * Call this from Settings or a hidden test option.
     */
    public void showFeedbackForTesting(Activity activity) {
        Log.d(TAG, "Showing feedback dialog for testing");
        Toast.makeText(context, "Opening test feedback...", Toast.LENGTH_SHORT).show();
        showFeedbackPrompt(activity);
    }
    
    /**
     * Reset all feedback preferences for testing.
     * Allows the feedback prompt to show again.
     */
    public void resetForTesting() {
        prefs.edit()
            .remove(KEY_LAST_PROMPT_TIME)
            .remove(KEY_HAS_GIVEN_FEEDBACK)
            .remove(KEY_PROMPT_COUNT)
            .remove(KEY_NOTIFICATION_COUNT)
            .remove(KEY_NOTIFICATION_SENT_TIME)
            .apply();
        Log.d(TAG, "Feedback preferences reset for testing");
        Toast.makeText(context, "Feedback settings reset", Toast.LENGTH_SHORT).show();
    }
    
    // ==================== PUSH NOTIFICATION METHODS ====================
    
    public void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Feedback Requests";
            String description = "Gentle reminders to share your experience";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(false);
            
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
    
    public boolean shouldSendFeedbackNotification(int totalTrips) {
        // Don't send if user already gave feedback
        if (prefs.getBoolean(KEY_HAS_GIVEN_FEEDBACK, false)) {
            return false;
        }
        
        // Limit number of notifications (max 2 gentle reminders)
        int notificationCount = prefs.getInt(KEY_NOTIFICATION_COUNT, 0);
        if (notificationCount >= MAX_NOTIFICATIONS) {
            return false;
        }
        
        // Need at least 5 trips before first notification
        if (totalTrips < MIN_TRIPS_BEFORE_NOTIFICATION) {
            return false;
        }
        
        // Wait 45 days between notifications
        long lastNotificationTime = prefs.getLong(KEY_NOTIFICATION_SENT_TIME, 0);
        if (lastNotificationTime > 0) {
            long daysSinceLastNotification = (System.currentTimeMillis() - lastNotificationTime) / (1000 * 60 * 60 * 24);
            if (daysSinceLastNotification < MIN_DAYS_BETWEEN_NOTIFICATIONS) {
                return false;
            }
        }
        
        return true;
    }
    
    public void sendGentleFeedbackNotification(Class<?> mainActivityClass) {
        try {
            createNotificationChannel();
            
            Intent intent = new Intent(context, mainActivityClass);
            intent.setAction(ACTION_SHOW_FEEDBACK);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Quick question for you")
                .setContentText("We'd love to hear how MileTracker Pro is working for you!")
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText("We'd love to hear how MileTracker Pro is working for you! Your feedback helps us make the app even better. Tap to share your thoughts."))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            try {
                notificationManager.notify(NOTIFICATION_ID, builder.build());
                
                // Track notification count and time
                int currentCount = prefs.getInt(KEY_NOTIFICATION_COUNT, 0);
                prefs.edit()
                    .putInt(KEY_NOTIFICATION_COUNT, currentCount + 1)
                    .putLong(KEY_NOTIFICATION_SENT_TIME, System.currentTimeMillis())
                    .apply();
                
                Log.d(TAG, "Gentle feedback notification sent (count: " + (currentCount + 1) + "/" + MAX_NOTIFICATIONS + ")");
            } catch (SecurityException e) {
                Log.w(TAG, "Notification permission not granted: " + e.getMessage());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sending feedback notification: " + e.getMessage());
        }
    }
    
    public void checkAndSendNotificationAfterTrip(int totalTrips, Class<?> mainActivityClass) {
        if (shouldSendFeedbackNotification(totalTrips)) {
            sendGentleFeedbackNotification(mainActivityClass);
        }
    }
    
    public boolean wasOpenedFromNotification(Intent intent) {
        return intent != null && ACTION_SHOW_FEEDBACK.equals(intent.getAction());
    }
    
    public void clearNotificationFlag() {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(NOTIFICATION_ID);
    }
}
