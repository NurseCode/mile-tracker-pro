package com.miletrackerpro.app; // ← verify this matches your package

import android.content.Context;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.cardview.widget.CardView;

/**
 * MileTracker Pro — Onboarding Screen
 * Replaces the following methods in MainActivity.java:
 *   showOnboardingWelcome       (line 5923)
 *   showOnboardingNotifications (line 5986)
 *   showOnboardingComplete      (line 6058)
 *   startFriendlyOnboarding     (line 5918)
 *   showSetupChecklistIfNeeded  (line 12190)
 *
 * Four screens in sequence:
 *   SCREEN_WELCOME  → value prop before asking anything
 *   SCREEN_SETUP    → guided permission checklist
 *   SCREEN_VERIFY   → live confirmation tracking works
 *   SCREEN_COMPLETE → celebration + dashboard entry
 *
 * Usage:
 *   OnboardingScreen onboarding = new OnboardingScreen(context, listener);
 *   onboarding.setUserSavings(213.36, 294.3); // optional — for complete screen
 *   View view = onboarding.buildWelcome();     // or buildSetup(), etc.
 *   // Add view to your dialog or full-screen container
 */
public class OnboardingScreen {

    // ── SCREEN CONSTANTS ──────────────────────────────────────
    public static final int SCREEN_WELCOME  = 0;
    public static final int SCREEN_SETUP    = 1;
    public static final int SCREEN_VERIFY   = 2;
    public static final int SCREEN_COMPLETE = 3;

    // ── STEP CONSTANTS ────────────────────────────────────────
    public static final int STEP_LOCATION = 0;
    public static final int STEP_BATTERY  = 1;
    public static final int STEP_AUTO     = 2;

    // ── DEVICE CONSTANTS ──────────────────────────────────────
    public static final int DEVICE_SAMSUNG = 0;
    public static final int DEVICE_PIXEL   = 1;
    public static final int DEVICE_OTHER   = 2;

    // ── STEP STATUS CONSTANTS ─────────────────────────────────
    public static final int STATUS_PENDING = 0;
    public static final int STATUS_ACTIVE  = 1;
    public static final int STATUS_DONE    = 2;

    // ── INTERFACE ─────────────────────────────────────────────

    public interface OnboardingListener {
        // Welcome screen
        void onActivateClicked();

        // Setup screen
        void onLocationStepConfirmed();
        void onBatteryStepConfirmed();
        void onAutoStepConfirmed();
        void onSetupComplete();

        // Device selector
        void onDeviceChanged(int device);

        // Verify screen
        void onVerifyComplete();

        // Complete screen
        void onGoToDashboard();

        // General
        void onStepExpanded(int step);
    }

    // ── STATE ─────────────────────────────────────────────────

    private final Context ctx;
    private final OnboardingListener listener;

    private double userSavings = 213.36;
    private double userMiles   = 294.3;

    private int selectedDevice = DEVICE_SAMSUNG;

    // Setup step states
    private int[] stepStatuses = {
        STATUS_ACTIVE,
        STATUS_PENDING,
        STATUS_PENDING
    };
    private int expandedStep = 0;

    // Verify screen state
    private int verifyPhase = 0; // 0=waiting, 1=detected, 2=confirmed

    // Permission states for verify screen
    private boolean locationGranted = false;
    private boolean batteryGranted  = false;
    private boolean autoEnabled     = false;

    // ── CONSTRUCTOR ───────────────────────────────────────────

    public OnboardingScreen(Context ctx, OnboardingListener listener) {
        this.ctx      = ctx;
        this.listener = listener;
    }

    // ── DATA SETTERS ──────────────────────────────────────────

    public OnboardingScreen setUserSavings(double savings, double miles) {
        this.userSavings = savings;
        this.userMiles   = miles;
        return this;
    }

    public OnboardingScreen setStepStatus(int step, int status) {
        if (step >= 0 && step < stepStatuses.length) {
            stepStatuses[step] = status;
        }
        return this;
    }

    public OnboardingScreen setExpandedStep(int step) {
        this.expandedStep = step;
        return this;
    }

    public OnboardingScreen setSelectedDevice(int device) {
        this.selectedDevice = device;
        return this;
    }

    public OnboardingScreen setVerifyPhase(int phase) {
        this.verifyPhase = phase;
        return this;
    }

    public OnboardingScreen setPermissionStates(
            boolean location, boolean battery, boolean auto) {
        this.locationGranted = location;
        this.batteryGranted  = battery;
        this.autoEnabled     = auto;
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // SCREEN 0 — WELCOME
    // ─────────────────────────────────────────────────────────

    /**
     * Welcome screen — shows value prop before asking for anything
     */
    public View buildWelcome() {
        ScrollView scroll = UIFactory.makeScrollContainer(ctx);
        LinearLayout content = UIFactory.makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space24()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space24())
        );
        content.setBackgroundColor(DesignSystem.colorBackground());
        content.setGravity(Gravity.CENTER_HORIZONTAL);

        // Skip button — top right corner
        TextView skipBtn = new TextView(ctx);
        skipBtn.setText("Skip");
        skipBtn.setTextColor(DesignSystem.colorMuted());
        skipBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, DesignSystem.textBody());
        skipBtn.setTypeface(DesignSystem.fontBody());
        skipBtn.setGravity(Gravity.END);
        skipBtn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space8())
        );
        skipBtn.setClickable(true);
        skipBtn.setFocusable(true);
        skipBtn.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        skipBtn.setOnClickListener(v -> {
            if (listener != null) listener.onGoToDashboard();
        });
        content.addView(skipBtn);

        // Car emoji
        TextView carEmoji = new TextView(ctx);
        carEmoji.setText("🚗");
        carEmoji.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP, 56f);
        carEmoji.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams carParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        carParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space20());
        carEmoji.setLayoutParams(carParams);
        content.addView(carEmoji);

        // Main heading
        TextView heading = UIFactory.makeHeading(ctx, "Let's activate\nyour tracker");
        heading.setGravity(Gravity.CENTER);
        heading.setLineSpacing(0, 1.25f);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headingParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        heading.setLayoutParams(headingParams);
        content.addView(heading);

        // Subtitle
        TextView subtitle = UIFactory.makeBody(ctx,
            "2 minutes to set up. Then just drive — every mile " +
            "and tax deduction tracks automatically."
        );
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setLineSpacing(0, 1.6f);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space24());
        subtitle.setLayoutParams(subParams);
        content.addView(subtitle);

        // Savings card
        content.addView(buildWelcomeSavingsCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space20()));

        // Feature bullets
        content.addView(buildWelcomeFeatureBullets());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space32()));

        // CTA button
        TextView ctaBtn = UIFactory.makeButtonHero(ctx, "Activate My Tracker →");
        ctaBtn.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        ctaBtn.setOnClickListener(v -> {
            if (listener != null) listener.onActivateClicked();
        });
        content.addView(ctaBtn);

        // Fine print
        TextView finePrint = UIFactory.makeCaption(ctx,
            "We'll guide you through each step");
        finePrint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams fpParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        fpParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        finePrint.setLayoutParams(fpParams);
        content.addView(finePrint);

        scroll.addView(content);
        return scroll;
    }

    private View buildWelcomeSavingsCard() {
        LinearLayout card = UIFactory.makeMoneyCard(ctx);

        TextView label = UIFactory.makeLabelAccent(
            ctx, "💰 Average Annual Savings",
            DesignSystem.colorSuccess()
        );
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        label.setLayoutParams(labelParams);
        card.addView(label);

        TextView number = UIFactory.makeHeroNumberWhite(ctx, "$3,200");
        LinearLayout.LayoutParams numParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        numParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        number.setLayoutParams(numParams);
        card.addView(number);

        TextView sub = UIFactory.makeCaption(ctx,
            "in business mileage tax deductions");
        sub.setTextColor(
            DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.85f));
        card.addView(sub);

        return card;
    }

    private View buildWelcomeFeatureBullets() {
        LinearLayout col = UIFactory.makeColumn(ctx);

        String[][] bullets = {
            { "🛰️", "Hands-free auto detection" },
            { "📊", "IRS-compliant reports"      },
            { "☁️", "Cloud backup & sync"        },
        };

        for (String[] bullet : bullets) {
            LinearLayout row = UIFactory.makeRow(ctx);
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            rowParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
            row.setLayoutParams(rowParams);

            TextView emoji = new TextView(ctx);
            emoji.setText(bullet[0]);
            emoji.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP, 18f);
            LinearLayout.LayoutParams emojiParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            emojiParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space12()));
            emoji.setLayoutParams(emojiParams);

            TextView text = UIFactory.makeBody(ctx, bullet[1]);

            row.addView(emoji);
            row.addView(text);
            col.addView(row);
        }
        return col;
    }

    // ─────────────────────────────────────────────────────────
    // SCREEN 1 — SETUP CHECKLIST
    // ─────────────────────────────────────────────────────────

    /**
     * Setup screen — guided permission checklist
     * Three expandable steps: Location, Battery, Auto Detection
     */
    public View buildSetup() {
        ScrollView scroll = UIFactory.makeScrollContainer(ctx);
        LinearLayout content = UIFactory.makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space24())
        );
        content.setBackgroundColor(DesignSystem.colorBackground());

        // Skip button — top right corner
        TextView skipBtn = new TextView(ctx);
        skipBtn.setText("Skip");
        skipBtn.setTextColor(DesignSystem.colorMuted());
        skipBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, DesignSystem.textBody());
        skipBtn.setTypeface(DesignSystem.fontBody());
        skipBtn.setGravity(Gravity.END);
        skipBtn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space8())
        );
        skipBtn.setClickable(true);
        skipBtn.setFocusable(true);
        skipBtn.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        skipBtn.setOnClickListener(v -> {
            if (listener != null) listener.onGoToDashboard();
        });
        content.addView(skipBtn);

        // Header
        content.addView(buildSetupHeader());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space20()));

        // Step cards
        content.addView(buildStepCard(STEP_LOCATION));
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space8()));
        content.addView(buildStepCard(STEP_BATTERY));
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space8()));
        content.addView(buildStepCard(STEP_AUTO));

        // Continue button — only shown when all steps done
        boolean allDone = stepStatuses[0] == STATUS_DONE
            && stepStatuses[1] == STATUS_DONE
            && stepStatuses[2] == STATUS_DONE;

        if (allDone) {
            content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
            TextView continueBtn = UIFactory.makeButtonHero(
                ctx, "Test My Tracker →");
            continueBtn.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            continueBtn.setOnClickListener(v -> {
                if (listener != null) listener.onSetupComplete();
            });
            content.addView(continueBtn);
        }

        scroll.addView(content);
        return scroll;
    }

    private View buildSetupHeader() {
        LinearLayout header = UIFactory.makeColumn(ctx);
        header.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView heading = UIFactory.makeSectionHeading(
            ctx, "Activate Your Superpowers");
        heading.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headingParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        heading.setLayoutParams(headingParams);
        header.addView(heading);

        TextView sub = UIFactory.makeBody(ctx,
            "3 quick steps — tap each one to expand");
        sub.setGravity(Gravity.CENTER);
        header.addView(sub);

        return header;
    }

    private View buildStepCard(int step) {
        int status   = stepStatuses[step];
        boolean isExpanded = (expandedStep == step)
            && (status != STATUS_PENDING);

        // Step metadata
        String emoji, title, subtitle;
        int accentColor;

        switch (step) {
            case STEP_BATTERY:
                emoji       = "⚡";
                title       = "Battery Unrestricted";
                subtitle    = "Prevents Android from stopping tracking";
                accentColor = DesignSystem.colorWarning();
                break;
            case STEP_AUTO:
                emoji       = "🛡️";
                title       = "Auto Detection On";
                subtitle    = "Your tracker is armed and ready";
                accentColor = DesignSystem.colorSuccess();
                break;
            default: // STEP_LOCATION
                emoji       = "📍";
                title       = "Always-On Location";
                subtitle    = "Detects every trip automatically";
                accentColor = DesignSystem.colorAccent();
        }

        // Card container
        LinearLayout card = UIFactory.makeColumn(ctx);
        card.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorCard(),
            status == STATUS_ACTIVE
                ? accentColor
                : status == STATUS_DONE
                ? DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.4f)
                : DesignSystem.colorBorder(),
            status == STATUS_ACTIVE ? 2 : 1,
            DesignSystem.radiusCard()
        ));

        // Header row (always visible)
        card.addView(buildStepCardHeader(
            step, emoji, title, subtitle,
            status, accentColor, isExpanded
        ));

        // Expanded content
        if (isExpanded) {
            card.addView(UIFactory.makeDivider(ctx));
            card.addView(buildStepCardBody(step, accentColor));
        }

        return card;
    }

    private View buildStepCardHeader(
            int step, String emoji, String title, String subtitle,
            int status, int accentColor, boolean isExpanded) {

        LinearLayout header = UIFactory.makeRow(ctx);
        header.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );
        header.setClickable(true);
        header.setFocusable(true);
        header.setOnClickListener(v -> {
            if (status == STATUS_PENDING) {
                android.widget.Toast.makeText(ctx,
                    "Complete the previous step first",
                    android.widget.Toast.LENGTH_SHORT).show();
                return;
            }
            if (listener != null) listener.onStepExpanded(step);
        });

        // Icon circle
        LinearLayout iconCircle = new LinearLayout(ctx);
        iconCircle.setGravity(Gravity.CENTER);
        int circleSize = DesignSystem.dp(ctx, 42);
        LinearLayout.LayoutParams circleParams =
            new LinearLayout.LayoutParams(circleSize, circleSize);
        circleParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space12()));
        iconCircle.setLayoutParams(circleParams);
        iconCircle.setBackground(DesignSystem.roundedBgWithBorder(
            status == STATUS_DONE
                ? DesignSystem.colorSuccessLight()
                : status == STATUS_ACTIVE
                ? DesignSystem.withOpacity(accentColor, 0.15f)
                : DesignSystem.colorMutedBg(),
            status == STATUS_DONE
                ? DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.4f)
                : status == STATUS_ACTIVE
                ? DesignSystem.withOpacity(accentColor, 0.4f)
                : DesignSystem.colorBorder(),
            1,
            DesignSystem.radiusCard()
        ));

        TextView iconTv = new TextView(ctx);
        iconTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18f);
        iconTv.setGravity(Gravity.CENTER);
        if (status == STATUS_DONE) {
            iconTv.setText("✓");
            iconTv.setTextColor(DesignSystem.colorSuccess());
            iconTv.setTypeface(DesignSystem.fontBodyBold());
        } else {
            iconTv.setText(emoji);
        }
        iconCircle.addView(iconTv);
        header.addView(iconCircle);

        // Text column
        LinearLayout textCol = UIFactory.makeColumn(ctx);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textCol.setLayoutParams(textParams);

        TextView titleTv = UIFactory.makeBodyPrimary(ctx, title);
        titleTv.setTypeface(DesignSystem.fontBodyBold());
        if (status == STATUS_PENDING) {
            titleTv.setTextColor(DesignSystem.colorMuted());
        }
        textCol.addView(titleTv);

        TextView subtitleTv = UIFactory.makeCaption(ctx, subtitle);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space2());
        subtitleTv.setLayoutParams(subParams);
        textCol.addView(subtitleTv);
        header.addView(textCol);

        // Chevron / status indicator
        TextView chevron = new TextView(ctx);
        chevron.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16f);
        chevron.setTypeface(DesignSystem.fontBodyBold());
        if (status == STATUS_DONE) {
            chevron.setText("✓");
            chevron.setTextColor(DesignSystem.colorSuccess());
        } else if (status == STATUS_ACTIVE) {
            chevron.setText(isExpanded ? "▲" : "▼");
            chevron.setTextColor(accentColor);
        } else {
            chevron.setText("○");
            chevron.setTextColor(DesignSystem.colorMuted());
        }
        header.addView(chevron);

        return header;
    }

    private View buildStepCardBody(int step, int accentColor) {
        LinearLayout body = UIFactory.makeColumn(ctx);
        body.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );

        // Why this matters box
        body.addView(buildWhyBox(step));
        body.addView(UIFactory.makeSpacer(ctx, DesignSystem.space12()));

        // Device selector only needed for location step
        // (battery now handled automatically — same flow on all devices)
        if (step == STEP_LOCATION) {
            body.addView(buildDeviceSelector());
            body.addView(UIFactory.makeSpacer(ctx, DesignSystem.space12()));
        }

        // Instructions
        body.addView(buildInstructionsBox(step));
        body.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));

        // Confirm button
        body.addView(buildStepConfirmButton(step, accentColor));

        return body;
    }

    private View buildWhyBox(int step) {
        LinearLayout box = UIFactory.makeWarningCard(ctx);

        String whyTitle, whyBody;
        switch (step) {
            case STEP_BATTERY:
                whyTitle = "🔋 The hidden trip-killer";
                whyBody  = "Battery optimization kills background apps. " +
                    "Without this setting you'll miss trips — this is " +
                    "the #1 cause of missing miles.";
                break;
            case STEP_AUTO:
                whyTitle = "✅ You're almost there";
                whyBody  = "Auto Detection is already enabled. " +
                    "Just confirm below and we'll verify everything " +
                    "is working together.";
                break;
            default: // STEP_LOCATION
                whyTitle = "⚠️ Why 'Allow all the time'?";
                whyBody  = "Android stops tracking when your screen " +
                    "locks unless you grant background access. This is " +
                    "how every mileage app works — we only use location " +
                    "for trip detection, never anything else.";
        }

        TextView titleTv = UIFactory.makeBodyPrimary(ctx, whyTitle);
        titleTv.setTypeface(DesignSystem.fontBodyBold());
        titleTv.setTextColor(DesignSystem.colorWarning());
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        titleParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        titleTv.setLayoutParams(titleParams);
        box.addView(titleTv);

        TextView bodyTv = UIFactory.makeBodySmall(ctx, whyBody);
        bodyTv.setLineSpacing(0, 1.5f);
        box.addView(bodyTv);

        return box;
    }

    private View buildDeviceSelector() {
        LinearLayout row = UIFactory.makeRow(ctx);
        row.setGravity(Gravity.CENTER_VERTICAL);

        String[] deviceLabels = { "Samsung", "Pixel", "Other" };
        int[] deviceIds = {
            DEVICE_SAMSUNG, DEVICE_PIXEL, DEVICE_OTHER };

        for (int i = 0; i < deviceLabels.length; i++) {
            final int deviceId = deviceIds[i];
            boolean active = selectedDevice == deviceId;

            TextView pill = new TextView(ctx);
            pill.setText(deviceLabels[i]);
            pill.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP,
                DesignSystem.textSmall()
            );
            pill.setTypeface(DesignSystem.fontBodyBold());
            pill.setGravity(Gravity.CENTER);
            pill.setPadding(
                DesignSystem.dp(ctx, DesignSystem.space12()),
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space12()),
                DesignSystem.dp(ctx, DesignSystem.space8())
            );
            pill.setTextColor(
                active ? DesignSystem.colorAccent() : DesignSystem.colorMuted()
            );
            pill.setBackground(DesignSystem.roundedBgWithBorder(
                active ? DesignSystem.colorAccentLight() : 0x00000000,
                active ? DesignSystem.colorAccent() : DesignSystem.colorBorder(),
                active ? 2 : 1,
                DesignSystem.radiusPill()
            ));
            pill.setClickable(true);
            pill.setFocusable(true);
            pill.setOnClickListener(v -> {
                if (listener != null) listener.onDeviceChanged(deviceId);
            });

            LinearLayout.LayoutParams pillParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            if (i > 0) {
                pillParams.setMarginStart(
                    DesignSystem.dp(ctx, DesignSystem.space8()));
            }
            pill.setLayoutParams(pillParams);
            row.addView(pill);
        }
        return row;
    }

    private View buildInstructionsBox(int step) {
        LinearLayout box = new LinearLayout(ctx);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        box.setBackground(DesignSystem.roundedBg(
            DesignSystem.colorMutedBg(),
            DesignSystem.radiusCard()
        ));

        String[] instructions = getInstructions(step);

        for (int i = 0; i < instructions.length; i++) {
            LinearLayout stepRow = UIFactory.makeRow(ctx);
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            if (i > 0) {
                rowParams.topMargin =
                    DesignSystem.dp(ctx, DesignSystem.space8());
            }
            stepRow.setLayoutParams(rowParams);

            // Step number circle
            LinearLayout numCircle = new LinearLayout(ctx);
            numCircle.setGravity(Gravity.CENTER);
            int circleSize = DesignSystem.dp(ctx, 22);
            LinearLayout.LayoutParams circleParams =
                new LinearLayout.LayoutParams(circleSize, circleSize);
            circleParams.setMarginEnd(
                DesignSystem.dp(ctx, DesignSystem.space12()));
            numCircle.setLayoutParams(circleParams);
            numCircle.setBackground(DesignSystem.roundedBgWithBorder(
                DesignSystem.colorAccentLight(),
                DesignSystem.colorAccent(),
                1,
                DesignSystem.radiusPill()
            ));

            TextView numTv = new TextView(ctx);
            numTv.setText(String.valueOf(i + 1));
            numTv.setTextColor(DesignSystem.colorAccent());
            numTv.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP,
                DesignSystem.textXS()
            );
            numTv.setTypeface(DesignSystem.fontBodyBold());
            numTv.setGravity(Gravity.CENTER);
            numCircle.addView(numTv);

            TextView instrTv = UIFactory.makeBodySmall(ctx, instructions[i]);
            instrTv.setLineSpacing(0, 1.4f);

            stepRow.addView(numCircle);
            stepRow.addView(instrTv);
            box.addView(stepRow);
        }
        return box;
    }

    private String[] getInstructions(int step) {
        switch (step) {
            case STEP_LOCATION:
                switch (selectedDevice) {
                    case DEVICE_PIXEL:
                        return new String[]{
                            "Android requires 2 location approvals — allow both",
                            "Open Settings",
                            "Tap Privacy → Permission Manager",
                            "Tap Location → MileTracker Pro",
                            "Select 'Allow all the time'",
                            "Return to app"
                        };
                    case DEVICE_OTHER:
                        return new String[]{
                            "Android requires 2 location approvals — allow both",
                            "Open Settings → Apps",
                            "Find MileTracker Pro → Permissions",
                            "Tap Location",
                            "Select 'Allow all the time'",
                            "Return to app"
                        };
                    default: // SAMSUNG
                        return new String[]{
                            "Android requires 2 location approvals — allow both",
                            "Open Settings",
                            "Tap Apps → MileTracker Pro",
                            "Tap Permissions → Location",
                            "Select 'Allow all the time'",
                            "Return to app"
                        };
                }
            case STEP_BATTERY:
                return new String[]{
                    "Tap the button below",
                    "Choose 'Allow' or 'Unrestricted' when prompted",
                    "Return here when done"
                };
            default: // STEP_AUTO
                return new String[]{
                    "Auto Detection is already enabled",
                    "Tap confirm below to continue",
                    "We'll verify everything works next"
                };
        }
    }

    private View buildStepConfirmButton(int step, int accentColor) {
        String label;
        switch (step) {
            case STEP_BATTERY: label = "Allow Battery Access →"; break;
            case STEP_AUTO:    label = "Enable Auto Detection →"; break;
            default:           label = "Grant Location Access →"; break;
        }

        TextView btn = new TextView(ctx);
        btn.setText(label);
        btn.setTextColor(step == STEP_BATTERY ? 0xFF0D1117 : 0xFFFFFFFF);
        btn.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textBody()
        );
        btn.setTypeface(DesignSystem.fontBodyBold());
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        btn.setBackground(DesignSystem.roundedBg(
            accentColor, DesignSystem.radiusButton()));
        btn.setClickable(true);
        btn.setFocusable(true);
        btn.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        btn.setOnClickListener(v -> {
            if (listener == null) return;
            switch (step) {
                case STEP_LOCATION: listener.onLocationStepConfirmed(); break;
                case STEP_BATTERY:  listener.onBatteryStepConfirmed();  break;
                case STEP_AUTO:     listener.onAutoStepConfirmed();     break;
            }
        });
        return btn;
    }

    // ─────────────────────────────────────────────────────────
    // SCREEN 2 — VERIFY
    // ─────────────────────────────────────────────────────────

    /**
     * Verify screen — live confirmation that tracking works
     * verifyPhase: 0=waiting, 1=detected, 2=confirmed
     */
    public View buildVerify() {
        ScrollView scroll = UIFactory.makeScrollContainer(ctx);
        LinearLayout content = UIFactory.makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space24())
        );
        content.setBackgroundColor(DesignSystem.colorBackground());

        // Header
        TextView heading = UIFactory.makeSectionHeading(
            ctx, "Confirming It Works");
        heading.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headingParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        heading.setLayoutParams(headingParams);
        content.addView(heading);

        TextView subheading = UIFactory.makeBody(ctx,
            "Watch your tracker in action");
        subheading.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space20());
        subheading.setLayoutParams(subParams);
        content.addView(subheading);

        // Status card
        content.addView(buildVerifyStatusCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));

        // Permission status card
        content.addView(buildPermissionStatusCard());

        // Continue button — only when confirmed
        if (verifyPhase == 2) {
            content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
            TextView continueBtn = UIFactory.makeButtonHero(
                ctx, "See My Dashboard →");
            continueBtn.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            continueBtn.setOnClickListener(v -> {
                if (listener != null) listener.onVerifyComplete();
            });
            content.addView(continueBtn);
        }

        scroll.addView(content);
        return scroll;
    }

    private View buildVerifyStatusCard() {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space24()),
            DesignSystem.dp(ctx, DesignSystem.space24()),
            DesignSystem.dp(ctx, DesignSystem.space24()),
            DesignSystem.dp(ctx, DesignSystem.space24())
        );

        switch (verifyPhase) {
            case 0: // Waiting
                card.setBackground(DesignSystem.roundedBgWithBorder(
                    DesignSystem.colorCard(),
                    DesignSystem.colorBorder(), 1,
                    DesignSystem.radiusLarge()
                ));
                TextView carEmoji = new TextView(ctx);
                carEmoji.setText("🚗");
                carEmoji.setTextSize(
                    android.util.TypedValue.COMPLEX_UNIT_SP, 48f);
                carEmoji.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams carParams =
                    new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                carParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space12());
                carEmoji.setLayoutParams(carParams);
                card.addView(carEmoji);

                TextView waitTitle = UIFactory.makeSectionHeading(
                    ctx, "Listening for movement...");
                waitTitle.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams waitTitleParams =
                    new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                waitTitleParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space8());
                waitTitle.setLayoutParams(waitTitleParams);
                card.addView(waitTitle);

                card.addView(UIFactory.makeStatusBadge(
                    ctx, "Monitoring active", true));
                break;

            case 1: // Detected
                card.setBackground(DesignSystem.gradientBg(
                    DesignSystem.colorHeroStart(),
                    DesignSystem.colorHeroEnd(),
                    GradientDrawable.Orientation.TL_BR,
                    DesignSystem.radiusLarge()
                ));
                TextView pinEmoji = new TextView(ctx);
                pinEmoji.setText("📍");
                pinEmoji.setTextSize(
                    android.util.TypedValue.COMPLEX_UNIT_SP, 48f);
                pinEmoji.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams pinParams =
                    new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                pinParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space12());
                pinEmoji.setLayoutParams(pinParams);
                card.addView(pinEmoji);

                TextView detectedTitle = UIFactory.makeHeroNumberWhite(
                    ctx, "Trip detected!");
                detectedTitle.setTextSize(
                    android.util.TypedValue.COMPLEX_UNIT_SP,
                    DesignSystem.textLarge()
                );
                detectedTitle.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams detParams =
                    new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                detParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space8());
                detectedTitle.setLayoutParams(detParams);
                card.addView(detectedTitle);

                TextView recordingTv = UIFactory.makeCaption(
                    ctx, "Recording your route...");
                recordingTv.setTextColor(0xAAFFFFFF);
                recordingTv.setGravity(Gravity.CENTER);
                card.addView(recordingTv);
                break;

            case 2: // Confirmed
                card.setBackground(DesignSystem.gradientBg(
                    DesignSystem.colorMoneyStart(),
                    DesignSystem.colorMoneyEnd(),
                    GradientDrawable.Orientation.TL_BR,
                    DesignSystem.radiusLarge()
                ));

                // Check circle
                LinearLayout checkCircle = new LinearLayout(ctx);
                checkCircle.setGravity(Gravity.CENTER);
                int circleSize = DesignSystem.dp(ctx, 64);
                LinearLayout.LayoutParams circleParams =
                    new LinearLayout.LayoutParams(circleSize, circleSize);
                circleParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space16());
                checkCircle.setLayoutParams(circleParams);
                checkCircle.setBackground(DesignSystem.roundedBgWithBorder(
                    DesignSystem.colorSuccessLight(),
                    DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.4f),
                    2, DesignSystem.radiusPill()
                ));

                TextView checkTv = new TextView(ctx);
                checkTv.setText("✓");
                checkTv.setTextColor(DesignSystem.colorSuccess());
                checkTv.setTextSize(
                    android.util.TypedValue.COMPLEX_UNIT_SP, 28f);
                checkTv.setTypeface(DesignSystem.fontBodyBold());
                checkTv.setGravity(Gravity.CENTER);
                checkCircle.addView(checkTv);
                card.addView(checkCircle);

                TextView confirmedTitle = new TextView(ctx);
                confirmedTitle.setText("Tracker confirmed!");
                confirmedTitle.setTextColor(DesignSystem.colorSuccess());
                confirmedTitle.setTextSize(
                    android.util.TypedValue.COMPLEX_UNIT_SP,
                    DesignSystem.textLarge()
                );
                confirmedTitle.setTypeface(DesignSystem.fontDisplay());
                confirmedTitle.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams confParams =
                    new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                confParams.bottomMargin =
                    DesignSystem.dp(ctx, DesignSystem.space8());
                confirmedTitle.setLayoutParams(confParams);
                card.addView(confirmedTitle);

                TextView confSubTv = UIFactory.makeCaption(
                    ctx, "Everything is working perfectly");
                confSubTv.setTextColor(0xAAFFFFFF);
                confSubTv.setGravity(Gravity.CENTER);
                card.addView(confSubTv);
                break;
        }
        return card;
    }

    private View buildPermissionStatusCard() {
        CardView card = UIFactory.makeCard(ctx);
        LinearLayout content = UIFactory.makeCardContent(ctx);

        TextView label = UIFactory.makeLabel(ctx, "Permission Status");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        content.addView(label);

        content.addView(UIFactory.makePermissionRow(
            ctx, "Location — Always On", locationGranted));
        content.addView(UIFactory.makeDivider(ctx));

        content.addView(UIFactory.makePermissionRow(
            ctx, "Battery — Unrestricted", batteryGranted));
        content.addView(UIFactory.makeDivider(ctx));

        content.addView(UIFactory.makePermissionRow(
            ctx, "Auto Detection", autoEnabled));

        card.addView(content);
        return card;
    }

    // ─────────────────────────────────────────────────────────
    // SCREEN 3 — COMPLETE
    // ─────────────────────────────────────────────────────────

    /**
     * Complete / celebration screen
     */
    public View buildComplete() {
        ScrollView scroll = UIFactory.makeScrollContainer(ctx);
        LinearLayout content = UIFactory.makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space24()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space32())
        );
        content.setBackgroundColor(DesignSystem.colorBackground());
        content.setGravity(Gravity.CENTER_HORIZONTAL);

        // Celebration emoji
        TextView celebEmoji = new TextView(ctx);
        celebEmoji.setText("🎉");
        celebEmoji.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP, 64f);
        celebEmoji.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams celebParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        celebParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space16());
        celebEmoji.setLayoutParams(celebParams);
        content.addView(celebEmoji);

        // Heading
        TextView heading = UIFactory.makeHeading(ctx, "You're all set!");
        heading.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headingParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        heading.setLayoutParams(headingParams);
        content.addView(heading);

        // Subtitle
        TextView subtitle = UIFactory.makeBody(ctx,
            "MileTracker Pro is fully activated.\nYour first trip is already waiting.");
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setLineSpacing(0, 1.5f);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space24());
        subtitle.setLayoutParams(subParams);
        content.addView(subtitle);

        // Savings card
        content.addView(buildCompleteSavingsCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));

        // What happens next
        content.addView(buildWhatNextCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space24()));

        // Dashboard button
        TextView dashBtn = UIFactory.makeButtonHero(ctx, "Go to My Dashboard");
        dashBtn.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        dashBtn.setOnClickListener(v -> {
            if (listener != null) listener.onGoToDashboard();
        });
        content.addView(dashBtn);

        scroll.addView(content);
        return scroll;
    }

    private View buildCompleteSavingsCard() {
        LinearLayout card = UIFactory.makeMoneyCard(ctx);

        TextView label = UIFactory.makeLabelAccent(
            ctx, "💰 This Month's Savings",
            DesignSystem.colorSuccess()
        );
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        label.setLayoutParams(labelParams);
        card.addView(label);

        String savingsText = String.format("$%.2f", userSavings);
        TextView savingsNum = UIFactory.makeHeroNumberWhite(ctx, savingsText);
        LinearLayout.LayoutParams numParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        numParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        savingsNum.setLayoutParams(numParams);
        card.addView(savingsNum);

        String milesText = String.format(
            "%.1f miles · grows as you drive", userMiles);
        TextView milesTv = UIFactory.makeCaption(ctx, milesText);
        milesTv.setTextColor(
            DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.85f));
        card.addView(milesTv);

        return card;
    }

    private View buildWhatNextCard() {
        CardView card = UIFactory.makeCard(ctx);
        LinearLayout content = UIFactory.makeCardContent(ctx);

        TextView label = UIFactory.makeLabel(ctx, "What Happens Next");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        content.addView(label);

        String[][] nextItems = {
            { "🚗", "Drive — trips record automatically"        },
            { "📂", "Categorize as Business or Personal"        },
            { "📊", "Export your log at tax time with one tap"  },
        };

        for (String[] item : nextItems) {
            LinearLayout row = UIFactory.makeRow(ctx);
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            rowParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
            row.setLayoutParams(rowParams);

            TextView emoji = new TextView(ctx);
            emoji.setText(item[0]);
            emoji.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP, 18f);
            LinearLayout.LayoutParams emojiParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            emojiParams.setMarginEnd(
                DesignSystem.dp(ctx, DesignSystem.space12()));
            emoji.setLayoutParams(emojiParams);

            TextView text = UIFactory.makeBody(ctx, item[1]);

            row.addView(emoji);
            row.addView(text);
            content.addView(row);
        }

        card.addView(content);
        return card;
    }
}
