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
 * MileTracker Pro — Paywall Screen
 * Replaces showTripLimitReachedDialog (line 10298 in MainActivity.java)
 * and showUpgradeOptionsDialog (line 10060 in MainActivity.java)
 *
 * Usage:
 *   PaywallScreen paywall = new PaywallScreen(context, listener);
 *   paywall.setUserData(294.3, 213.36, 38); // miles, savings, trips used
 *   View view = paywall.build();
 *   // Add view to your dialog or container
 */
public class PaywallScreen {

    // ── INTERFACE ─────────────────────────────────────────────

    public interface PaywallListener {
        void onYearlySelected();
        void onMonthlySelected();
        void onDismissed();
    }

    // ── STATE ─────────────────────────────────────────────────

    private final Context ctx;
    private final PaywallListener listener;

    private double userMiles    = 294.3;
    private double userSavings  = 213.36;
    private int    tripsUsed    = 38;
    private int    tripsLimit   = 40;
    private boolean yearlySelected = true;

    // Plan pricing
    private static final String YEARLY_PRICE   = "$39.99";
    private static final String MONTHLY_PRICE  = "$4.99";
    private static final String YEARLY_MONTHLY = "$3.33/mo";
    private static final String YEARLY_SAVING  = "Save 33%";
    private static final String TRIAL_LABEL    = "7-day free trial";

    // ── CONSTRUCTOR ───────────────────────────────────────────

    public PaywallScreen(Context ctx, PaywallListener listener) {
        this.ctx      = ctx;
        this.listener = listener;
    }

    // ── DATA SETTERS ──────────────────────────────────────────

    public PaywallScreen setUserData(double miles, double savings, int tripsUsed) {
        this.userMiles   = miles;
        this.userSavings = savings;
        this.tripsUsed   = tripsUsed;
        return this;
    }

    public PaywallScreen setTripsLimit(int limit) {
        this.tripsLimit = limit;
        return this;
    }

    // ── BUILD ─────────────────────────────────────────────────

    /**
     * Builds and returns the complete paywall view.
     * Add this to a dialog, FrameLayout, or ScrollView container.
     */
    public View build() {
        ScrollView scroll = UIFactory.makeScrollContainer(ctx);
        LinearLayout content = UIFactory.makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space32())
        );
        content.setBackgroundColor(DesignSystem.colorBackground());

        // ── ABOVE THE FOLD ─────────────────────────────────────────────────────
        // Plan selector and CTA must be immediately visible — no scrolling needed.
        content.addView(buildHeader());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space12()));
        content.addView(buildPlanSelector());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space12()));
        content.addView(buildCtaButton());
        content.addView(buildSecurityNote());

        // ── BELOW THE FOLD ─────────────────────────────────────────────────────
        // Supporting detail for users who want to learn more before deciding.
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
        content.addView(buildSavingsCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
        content.addView(buildRoiCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
        content.addView(buildFeaturesCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
        content.addView(buildSocialProofCard());
        content.addView(UIFactory.makeSpacer(ctx, DesignSystem.space16()));
        content.addView(buildFooter());

        scroll.addView(content);
        return scroll;
    }

    // ── COMPACT HEADER ────────────────────────────────────────────────────────
    // Replaces the large savings card at the top so the plan selector is
    // visible without any scrolling on typical phone screens.

    private View buildHeader() {
        LinearLayout card = UIFactory.makeColumn(ctx);
        card.setBackground(DesignSystem.roundedBg(
            DesignSystem.colorCard(), DesignSystem.radiusCard()
        ));
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );

        // Title
        TextView title = new TextView(ctx);
        title.setText("Upgrade to Premium");
        title.setTextColor(DesignSystem.colorText());
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, DesignSystem.textLarge());
        title.setTypeface(DesignSystem.fontDisplayBold());
        card.addView(title);

        // One-line savings summary
        String savingsText = String.format(
            java.util.Locale.US,
            "💰 $%.0f in tax savings · %,.0f miles · 7-day free trial",
            userSavings, userMiles
        );
        TextView summary = new TextView(ctx);
        summary.setText(savingsText);
        summary.setTextColor(DesignSystem.colorSuccess());
        summary.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        summary.setTypeface(DesignSystem.fontBodyBold());
        LinearLayout.LayoutParams summaryParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        summaryParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        summary.setLayoutParams(summaryParams);
        card.addView(summary);

        // Trip usage line
        String tripText = String.format(
            java.util.Locale.US,
            "🎯 %d of %d free trips used this month",
            tripsUsed, tripsLimit
        );
        TextView tripTv = new TextView(ctx);
        tripTv.setText(tripText);
        tripTv.setTextColor(DesignSystem.colorMuted());
        tripTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        tripTv.setTypeface(DesignSystem.fontBody());
        LinearLayout.LayoutParams tripParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        tripParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space2());
        tripTv.setLayoutParams(tripParams);
        card.addView(tripTv);

        return card;
    }

    // ── SAVINGS CARD ──────────────────────────────────────────

    private View buildSavingsCard() {
        LinearLayout card = UIFactory.makeMoneyCard(ctx);

        // Label
        TextView label = UIFactory.makeLabelAccent(
            ctx, "💰 Your Tax Savings This Month",
            DesignSystem.colorSuccess()
        );
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        label.setLayoutParams(labelParams);
        card.addView(label);

        // Big savings number
        String savingsFormatted = String.format("$%.2f", userSavings);
        TextView savingsNumber = UIFactory.makeHeroNumberWhite(ctx, savingsFormatted);
        LinearLayout.LayoutParams numParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        numParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        savingsNumber.setLayoutParams(numParams);
        card.addView(savingsNumber);

        // Miles + trips subtitle
        String subtitle = String.format("%.1f miles · %d trips", userMiles, tripsUsed);
        TextView subtitleTv = UIFactory.makeCaption(ctx, subtitle);
        subtitleTv.setTextColor(DesignSystem.withOpacity(DesignSystem.colorSuccess(), 0.85f));
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space16());
        subtitleTv.setLayoutParams(subParams);
        card.addView(subtitleTv);

        // Warning box
        LinearLayout warningBox = new LinearLayout(ctx);
        warningBox.setOrientation(LinearLayout.VERTICAL);
        warningBox.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        warningBox.setBackground(DesignSystem.roundedBgWithBorder(
            0x33000000, // semi-transparent dark
            0x33FFFFFF,
            1,
            DesignSystem.radiusSmall()
        ));

        String warningText = String.format(
            "🎉  You've used %d of %d free trips. " +
            "Start your 7-day free trial — no charge today, cancel anytime.",
            tripsUsed, tripsLimit
        );
        TextView warningTv = UIFactory.makeBodySmall(ctx, warningText);
        warningTv.setTextColor(0xCCFFFFFF); // white at 80%
        warningTv.setLineSpacing(0, 1.5f);
        warningBox.addView(warningTv);
        card.addView(warningBox);

        return card;
    }

    // ── ROI CARD ──────────────────────────────────────────────

    private View buildRoiCard() {
        CardView card = UIFactory.makeCard(ctx);
        LinearLayout content = UIFactory.makeCardContent(ctx);

        // Section label
        TextView label = UIFactory.makeLabel(ctx, "The Math Is Simple");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        content.addView(label);

        // ROI rows
        String savingsFormatted = String.format("$%.2f", userSavings);
        double netGain = userSavings - 2.92;
        String netFormatted = String.format("$%.2f/mo", netGain);

        addRoiRow(content, "Your monthly tax savings", savingsFormatted,
            DesignSystem.colorSuccess(), false);
        addRoiRow(content, "Cost of Pro (yearly plan)", YEARLY_MONTHLY,
            DesignSystem.colorAccent(), false);
        addRoiRow(content, "Your net gain", netFormatted,
            DesignSystem.colorWarning(), true);

        card.addView(content);
        return card;
    }

    private void addRoiRow(LinearLayout parent, String label,
                           String value, int valueColor, boolean isLast) {
        LinearLayout row = UIFactory.makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );
        if (isLast) {
            row.setBackground(DesignSystem.roundedBgWithBorder(
                DesignSystem.colorMutedBg(),
                DesignSystem.colorBorder(), 1,
                DesignSystem.radiusSmall()
            ));
            row.setPadding(
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space8())
            );
        }

        TextView labelTv = UIFactory.makeBody(ctx, label);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        labelTv.setLayoutParams(lp);

        TextView valueTv = new TextView(ctx);
        valueTv.setText(value);
        valueTv.setTextColor(valueColor);
        valueTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textMedium()
        );
        valueTv.setTypeface(DesignSystem.fontDisplayBold());

        row.addView(labelTv);
        row.addView(valueTv);

        parent.addView(row);
        if (!isLast) parent.addView(UIFactory.makeDivider(ctx));
    }

    // ── PLAN SELECTOR ─────────────────────────────────────────

    private View buildPlanSelector() {
        LinearLayout container = UIFactory.makeColumn(ctx);

        TextView label = UIFactory.makeLabel(ctx, "Choose Your Plan");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        container.addView(label);

        // Yearly plan button
        LinearLayout yearlyBtn = buildPlanButton(
            "Yearly", "BEST VALUE",
            YEARLY_PRICE, "per year",
            TRIAL_LABEL + " · " + YEARLY_MONTHLY + " · " + YEARLY_SAVING,
            true, yearlySelected
        );
        yearlyBtn.setOnClickListener(v -> {
            yearlySelected = true;
            refreshPlanSelector(container);
        });

        // Monthly plan button
        LinearLayout monthlyBtn = buildPlanButton(
            "Monthly", null,
            MONTHLY_PRICE, "per month",
            TRIAL_LABEL + " · Cancel anytime",
            false, !yearlySelected
        );
        monthlyBtn.setOnClickListener(v -> {
            yearlySelected = false;
            refreshPlanSelector(container);
        });

        // Tag them so we can find them later
        yearlyBtn.setTag("yearly_btn");
        monthlyBtn.setTag("monthly_btn");

        LinearLayout.LayoutParams monthlyParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        monthlyParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        monthlyBtn.setLayoutParams(monthlyParams);

        container.addView(yearlyBtn);
        container.addView(monthlyBtn);

        return container;
    }

    private LinearLayout buildPlanButton(
            String title, String badge,
            String price, String period,
            String subtitle,
            boolean isYearly, boolean selected) {

        LinearLayout btn = UIFactory.makeRow(ctx);
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );
        btn.setClickable(true);
        btn.setFocusable(true);

        // Background
        if (selected && isYearly) {
            btn.setBackground(DesignSystem.gradientBg(
                DesignSystem.colorHeroStart(),
                DesignSystem.colorHeroEnd(),
                GradientDrawable.Orientation.TL_BR,
                DesignSystem.radiusCard()
            ));
        } else {
            btn.setBackground(DesignSystem.roundedBgWithBorder(
                selected ? DesignSystem.colorAccentLight() : DesignSystem.colorCard(),
                selected ? DesignSystem.colorAccent() : DesignSystem.colorBorder(),
                selected ? 2 : 1,
                DesignSystem.radiusCard()
            ));
        }

        // Radio dot
        View radioDot = buildRadioDot(selected);
        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(
            DesignSystem.dp(ctx, 20), DesignSystem.dp(ctx, 20));
        dotParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space12()));
        radioDot.setLayoutParams(dotParams);
        btn.addView(radioDot);

        // Text column
        LinearLayout textCol = UIFactory.makeColumn(ctx);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textCol.setLayoutParams(textParams);

        // Title row (title + badge)
        LinearLayout titleRow = UIFactory.makeRow(ctx);
        int titleColor = (selected && isYearly) ? 0xFFFFFFFF : DesignSystem.colorText();

        TextView titleTv = new TextView(ctx);
        titleTv.setText(title);
        titleTv.setTextColor(titleColor);
        titleTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textMedium()
        );
        titleTv.setTypeface(DesignSystem.fontBodyBold());
        titleRow.addView(titleTv);

        if (badge != null) {
            TextView badgeTv = new TextView(ctx);
            badgeTv.setText(badge);
            badgeTv.setTextColor(0xFFFFFFFF);
            badgeTv.setTextSize(
                android.util.TypedValue.COMPLEX_UNIT_SP,
                DesignSystem.textXS()
            );
            badgeTv.setTypeface(DesignSystem.fontBodyBold());
            badgeTv.setPadding(
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space2()),
                DesignSystem.dp(ctx, DesignSystem.space8()),
                DesignSystem.dp(ctx, DesignSystem.space2())
            );
            badgeTv.setBackground(DesignSystem.roundedBg(
                DesignSystem.colorWarning(),
                DesignSystem.radiusPill()
            ));
            LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            badgeParams.setMarginStart(DesignSystem.dp(ctx, DesignSystem.space8()));
            badgeTv.setLayoutParams(badgeParams);
            titleRow.addView(badgeTv);
        }

        textCol.addView(titleRow);

        // Subtitle
        TextView subTv = new TextView(ctx);
        subTv.setText(subtitle);
        subTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textSmall()
        );
        subTv.setTypeface(DesignSystem.fontBody());
        subTv.setTextColor(
            (selected && isYearly)
                ? 0xAAFFFFFF
                : DesignSystem.colorMuted()
        );
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space2());
        subTv.setLayoutParams(subParams);
        textCol.addView(subTv);
        btn.addView(textCol);

        // Price column (right) — MUST use WRAP_CONTENT width so the text column
        // (weight=1) can expand to fill the remaining space in this horizontal row.
        // Using makeColumn()'s default MATCH_PARENT width would collapse textCol to 0.
        LinearLayout priceCol = new LinearLayout(ctx);
        priceCol.setOrientation(LinearLayout.VERTICAL);
        priceCol.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        priceCol.setGravity(Gravity.END);

        TextView priceTv = new TextView(ctx);
        priceTv.setText(price);
        priceTv.setTextColor(
            (selected && isYearly) ? 0xFFFFFFFF : DesignSystem.colorText()
        );
        priceTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textLarge()
        );
        priceTv.setTypeface(DesignSystem.fontDisplay());
        priceTv.setGravity(Gravity.END);
        priceCol.addView(priceTv);

        TextView periodTv = new TextView(ctx);
        periodTv.setText(period);
        periodTv.setTextColor(
            (selected && isYearly) ? 0x88FFFFFF : DesignSystem.colorMuted()
        );
        periodTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textXS()
        );
        periodTv.setTypeface(DesignSystem.fontBody());
        periodTv.setGravity(Gravity.END);
        priceCol.addView(periodTv);

        btn.addView(priceCol);
        return btn;
    }

    private View buildRadioDot(boolean selected) {
        LinearLayout outer = new LinearLayout(ctx);
        outer.setGravity(Gravity.CENTER);
        outer.setBackground(DesignSystem.roundedBgWithBorder(
            selected ? DesignSystem.colorAccent() : 0x00000000,
            selected ? DesignSystem.colorAccent() : DesignSystem.colorMuted(),
            2,
            DesignSystem.radiusPill()
        ));

        if (selected) {
            View inner = new View(ctx);
            int innerSize = DesignSystem.dp(ctx, 8);
            LinearLayout.LayoutParams innerParams =
                new LinearLayout.LayoutParams(innerSize, innerSize);
            inner.setLayoutParams(innerParams);
            inner.setBackground(DesignSystem.roundedBg(0xFFFFFFFF, DesignSystem.radiusPill()));
            outer.addView(inner);
        }
        return outer;
    }

    private void refreshPlanSelector(LinearLayout container) {
        // Rebuild plan buttons with updated selection state
        // Find and replace the two plan buttons (indices 1 and 2, after label)
        if (container.getChildCount() >= 3) {
            View oldYearly  = container.getChildAt(1);
            View oldMonthly = container.getChildAt(2);

            LinearLayout newYearly = buildPlanButton(
                "Yearly", "BEST VALUE",
                YEARLY_PRICE, "per year",
                TRIAL_LABEL + " · " + YEARLY_MONTHLY + " · " + YEARLY_SAVING,
                true, yearlySelected
            );
            newYearly.setTag("yearly_btn");
            newYearly.setOnClickListener(v -> {
                yearlySelected = true;
                refreshPlanSelector(container);
            });
            LinearLayout.LayoutParams yearlyParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            newYearly.setLayoutParams(yearlyParams);

            LinearLayout newMonthly = buildPlanButton(
                "Monthly", null,
                MONTHLY_PRICE, "per month",
                TRIAL_LABEL + " · Cancel anytime",
                false, !yearlySelected
            );
            newMonthly.setTag("monthly_btn");
            newMonthly.setOnClickListener(v -> {
                yearlySelected = false;
                refreshPlanSelector(container);
            });
            LinearLayout.LayoutParams monthlyParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            monthlyParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space8());
            newMonthly.setLayoutParams(monthlyParams);

            container.removeView(oldYearly);
            container.removeView(oldMonthly);
            container.addView(newYearly, 1);
            container.addView(newMonthly, 2);

            // Refresh CTA button text
            refreshCtaButton();
        }
    }

    // ── CTA BUTTON ────────────────────────────────────────────

    private TextView ctaButton;

    private View buildCtaButton() {
        ctaButton = UIFactory.makeButtonHero(ctx, getCtaLabel());
        ctaButton.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        ctaButton.setOnClickListener(v -> {
            if (yearlySelected) {
                if (listener != null) listener.onYearlySelected();
            } else {
                if (listener != null) listener.onMonthlySelected();
            }
        });
        return ctaButton;
    }

    private void refreshCtaButton() {
        if (ctaButton != null) {
            ctaButton.setText(getCtaLabel());
        }
    }

    private String getCtaLabel() {
        return yearlySelected
            ? "Try 7 Days Free — then " + YEARLY_PRICE + "/year"
            : "Try 7 Days Free — then " + MONTHLY_PRICE + "/month";
    }

    // ── SECURITY NOTE ─────────────────────────────────────────

    private View buildSecurityNote() {
        TextView note = UIFactory.makeCaption(ctx,
            "🔒  7-day free trial · No charge today · Cancel anytime");
        note.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.topMargin    = DesignSystem.dp(ctx, DesignSystem.space8());
        params.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        note.setLayoutParams(params);
        return note;
    }

    // ── FEATURES CARD ─────────────────────────────────────────

    private View buildFeaturesCard() {
        CardView card = UIFactory.makeCard(ctx);
        LinearLayout content = UIFactory.makeCardContent(ctx);

        TextView label = UIFactory.makeLabel(ctx, "Everything in Pro");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        content.addView(label);

        String[] proFeatures = {
            "Unlimited trip tracking",
            "CSV & PDF export for taxes",
            "Business / personal categories",
            "Vehicle expense logging",
            "Work hours auto-classification",
            "IRS rate auto-updates",
            "Cloud backup & sync"
        };

        String[] freeLimitations = {
            "40 trips per month only",
            "No export",
            "No categories"
        };

        for (int i = 0; i < proFeatures.length; i++) {
            content.addView(buildFeatureRow(
                proFeatures[i], true,
                i < proFeatures.length - 1
            ));
        }

        content.addView(UIFactory.makeDivider(ctx));

        TextView limLabel = UIFactory.makeLabel(ctx, "Free Plan Limitations");
        LinearLayout.LayoutParams limParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        limParams.topMargin    = DesignSystem.dp(ctx, DesignSystem.space8());
        limParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        limLabel.setLayoutParams(limParams);
        content.addView(limLabel);

        for (int i = 0; i < freeLimitations.length; i++) {
            content.addView(buildFeatureRow(
                freeLimitations[i], false,
                i < freeLimitations.length - 1
            ));
        }

        card.addView(content);
        return card;
    }

    private LinearLayout buildFeatureRow(String text, boolean included, boolean showDivider) {
        LinearLayout wrapper = UIFactory.makeColumn(ctx);

        LinearLayout row = UIFactory.makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );

        // Icon circle
        LinearLayout iconCircle = new LinearLayout(ctx);
        iconCircle.setGravity(Gravity.CENTER);
        int circleSize = DesignSystem.dp(ctx, 22);
        LinearLayout.LayoutParams circleParams =
            new LinearLayout.LayoutParams(circleSize, circleSize);
        circleParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space12()));
        iconCircle.setLayoutParams(circleParams);
        iconCircle.setBackground(DesignSystem.roundedBg(
            included
                ? DesignSystem.colorSuccessLight()
                : DesignSystem.colorDestructiveLight(),
            DesignSystem.radiusPill()
        ));

        TextView iconTv = new TextView(ctx);
        iconTv.setText(included ? "✓" : "✕");
        iconTv.setTextColor(
            included ? DesignSystem.colorSuccess() : DesignSystem.colorDestructive()
        );
        iconTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textSmall()
        );
        iconTv.setTypeface(DesignSystem.fontBodyBold());
        iconTv.setGravity(Gravity.CENTER);
        iconCircle.addView(iconTv);

        row.addView(iconCircle);

        TextView featureTv = UIFactory.makeBody(ctx, text);
        featureTv.setTextColor(
            included ? DesignSystem.colorText() : DesignSystem.colorMuted()
        );
        row.addView(featureTv);

        wrapper.addView(row);
        if (showDivider) wrapper.addView(UIFactory.makeDivider(ctx));
        return wrapper;
    }

    // ── SOCIAL PROOF CARD ─────────────────────────────────────

    private View buildSocialProofCard() {
        CardView card = UIFactory.makeCard(ctx);
        LinearLayout content = UIFactory.makeCardContent(ctx);

        TextView label = UIFactory.makeLabel(ctx, "What Drivers Say");
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        label.setLayoutParams(labelParams);
        content.addView(label);

        addReview(content, "Paid for itself in the first week of tax season.",
            "Sarah M.", true);
        content.addView(UIFactory.makeDivider(ctx));
        addReview(content, "Finally an app that just works. Set it and forget it.",
            "James K.", false);

        card.addView(content);
        return card;
    }

    private void addReview(LinearLayout parent,
                           String quote, String name, boolean showDivider) {
        LinearLayout reviewBlock = UIFactory.makeColumn(ctx);
        reviewBlock.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );

        // Quote
        TextView quoteTv = UIFactory.makeBody(ctx, "\"" + quote + "\"");
        quoteTv.setTextColor(DesignSystem.colorText());
        LinearLayout.LayoutParams quoteParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        quoteParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space8());
        quoteTv.setLayoutParams(quoteParams);
        reviewBlock.addView(quoteTv);

        // Stars + name row
        LinearLayout starsRow = UIFactory.makeRow(ctx);

        TextView starsTv = new TextView(ctx);
        starsTv.setText("★★★★★");
        starsTv.setTextColor(DesignSystem.colorWarning());
        starsTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textSmall()
        );
        LinearLayout.LayoutParams starsParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        starsParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space8()));
        starsTv.setLayoutParams(starsParams);

        TextView nameTv = UIFactory.makeCaption(ctx, name);

        starsRow.addView(starsTv);
        starsRow.addView(nameTv);
        reviewBlock.addView(starsRow);

        parent.addView(reviewBlock);
    }

    // ── FOOTER ────────────────────────────────────────────────

    private View buildFooter() {
        LinearLayout footer = UIFactory.makeColumn(ctx);
        footer.setGravity(Gravity.CENTER);

        // Restore purchase
        TextView restoreTv = new TextView(ctx);
        restoreTv.setText("Restore Purchase");
        restoreTv.setTextColor(DesignSystem.colorAccent());
        restoreTv.setTextSize(
            android.util.TypedValue.COMPLEX_UNIT_SP,
            DesignSystem.textBody()
        );
        restoreTv.setTypeface(DesignSystem.fontBodyBold());
        restoreTv.setGravity(Gravity.CENTER);
        restoreTv.setClickable(true);
        restoreTv.setFocusable(true);
        restoreTv.setOnClickListener(v -> {
            // Hook into your existing BillingManager restore flow
        });

        LinearLayout.LayoutParams restoreParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        restoreParams.bottomMargin = DesignSystem.dp(ctx, DesignSystem.space12());
        restoreTv.setLayoutParams(restoreParams);
        footer.addView(restoreTv);

        // Legal
        TextView legalTv = UIFactory.makeCaption(ctx,
            "Subscriptions renew automatically. Cancel anytime in " +
            "Google Play settings. Terms & Privacy Policy apply."
        );
        legalTv.setGravity(Gravity.CENTER);
        legalTv.setLineSpacing(0, 1.5f);
        footer.addView(legalTv);

        return footer;
    }
}
