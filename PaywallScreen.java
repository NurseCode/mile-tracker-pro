package com.miletrackerpro.app;

import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.cardview.widget.CardView;

/**
 * MileTracker Pro — UI Factory
 * Reusable component builders that pull from DesignSystem tokens.
 *
 * Usage:
 *   TextView heading = UIFactory.makeHeading(ctx, "MileTracker Pro");
 *   CardView card = UIFactory.makeCard(ctx);
 *   TextView btn = UIFactory.makeButtonPrimary(ctx, "Export");
 */
public class UIFactory {

    // ─────────────────────────────────────────────────────────
    // TYPOGRAPHY
    // ─────────────────────────────────────────────────────────

    /**
     * Screen title — serif, large
     * Use for: tab headers, screen names, "MileTracker Pro"
     */
    public static TextView makeHeading(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(DesignSystem.colorText());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textDisplay());
        tv.setTypeface(DesignSystem.fontDisplay());
        tv.setIncludeFontPadding(false);
        return tv;
    }

    /**
     * Section heading — serif, medium
     * Use for: card titles, dialog titles
     */
    public static TextView makeSectionHeading(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(DesignSystem.colorText());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textLarge());
        tv.setTypeface(DesignSystem.fontDisplay());
        tv.setIncludeFontPadding(false);
        return tv;
    }

    /**
     * Hero number — serif, very large
     * Use for: tax savings, big stats ($213.36)
     */
    public static TextView makeHeroNumber(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(DesignSystem.colorText());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textHero());
        tv.setTypeface(DesignSystem.fontDisplay());
        tv.setIncludeFontPadding(false);
        return tv;
    }

    /**
     * Hero number — white, for dark gradient cards
     */
    public static TextView makeHeroNumberWhite(Context ctx, String text) {
        TextView tv = makeHeroNumber(ctx, text);
        tv.setTextColor(0xFFFFFFFF);
        return tv;
    }

    /**
     * Body text — sans, standard size
     * Use for: descriptions, trip details, general copy
     */
    public static TextView makeBody(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(DesignSystem.colorTextSub());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textBody());
        tv.setTypeface(DesignSystem.fontBody());
        tv.setLineSpacing(0, 1.5f);
        return tv;
    }

    /**
     * Body text — primary color (darker)
     */
    public static TextView makeBodyPrimary(Context ctx, String text) {
        TextView tv = makeBody(ctx, text);
        tv.setTextColor(DesignSystem.colorText());
        return tv;
    }

    /**
     * Small body text
     */
    public static TextView makeBodySmall(Context ctx, String text) {
        TextView tv = makeBody(ctx, text);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        return tv;
    }

    /**
     * ALL CAPS label — sans bold
     * Use for: "RECENT TRIPS", "IRS RATES", section headers above cards
     */
    public static TextView makeLabel(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text.toUpperCase());
        tv.setTextColor(DesignSystem.colorMuted());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textXS());
        tv.setTypeface(DesignSystem.fontBodyBold());
        tv.setLetterSpacing(0.12f);
        return tv;
    }

    /**
     * Accent label — colored ALL CAPS
     * Use for: "AUTO DETECTION", "POTENTIAL TAX DEDUCTIONS"
     */
    public static TextView makeLabelAccent(Context ctx, String text, int color) {
        TextView tv = makeLabel(ctx, text);
        tv.setTextColor(color);
        return tv;
    }

    /**
     * Muted caption — smallest text
     * Use for: timestamps, secondary metadata
     */
    public static TextView makeCaption(Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(DesignSystem.colorMuted());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        tv.setTypeface(DesignSystem.fontBody());
        return tv;
    }

    // ─────────────────────────────────────────────────────────
    // BUTTONS
    // ─────────────────────────────────────────────────────────

    /**
     * Primary button — solid accent color
     * Use for: main CTA, "Export", "Start Trip"
     */
    public static TextView makeButtonPrimary(Context ctx, String label) {
        TextView btn = new TextView(ctx);
        btn.setText(label);
        btn.setTextColor(0xFFFFFFFF);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textMedium());
        btn.setTypeface(DesignSystem.fontBodyBold());
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, 13),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, 13)
        );
        btn.setBackground(DesignSystem.roundedBg(
            DesignSystem.colorAccent(),
            DesignSystem.radiusButton()
        ));
        btn.setClickable(true);
        btn.setFocusable(true);
        return btn;
    }

    /**
     * Secondary button — tinted accent background
     * Use for: "Merge", "Edit", secondary actions
     */
    public static TextView makeButtonSecondary(Context ctx, String label) {
        TextView btn = makeButtonPrimary(ctx, label);
        btn.setTextColor(DesignSystem.colorAccent());
        btn.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorAccentLight(),
            DesignSystem.colorAccent(),
            1,
            DesignSystem.radiusButton()
        ));
        return btn;
    }

    /**
     * Success button — green
     * Use for: "Start Trip", "Confirmed", positive actions
     */
    public static TextView makeButtonSuccess(Context ctx, String label) {
        TextView btn = makeButtonPrimary(ctx, label);
        btn.setBackground(DesignSystem.roundedBg(
            DesignSystem.colorSuccess(),
            DesignSystem.radiusButton()
        ));
        return btn;
    }

    /**
     * Ghost button — muted background, subtle
     * Use for: "Refresh", "Cancel", neutral actions
     */
    public static TextView makeButtonGhost(Context ctx, String label) {
        TextView btn = makeButtonPrimary(ctx, label);
        btn.setTextColor(DesignSystem.colorTextSub());
        btn.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorMutedBg(),
            DesignSystem.colorBorder(),
            1,
            DesignSystem.radiusButton()
        ));
        return btn;
    }

    /**
     * Destructive button — red tint
     * Use for: "Delete", "Log Out", dangerous actions
     */
    public static TextView makeButtonDestructive(Context ctx, String label) {
        TextView btn = makeButtonPrimary(ctx, label);
        btn.setTextColor(DesignSystem.colorDestructive());
        btn.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorDestructiveLight(),
            DesignSystem.colorDestructive(),
            1,
            DesignSystem.radiusButton()
        ));
        return btn;
    }

    /**
     * Small button — reduced padding, smaller text
     * Use for: inline actions (Edit, Split, Delete on trip cards)
     */
    public static TextView makeButtonSmall(Context ctx, String label, int variant) {
        TextView btn = new TextView(ctx);
        btn.setText(label);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        btn.setTypeface(DesignSystem.fontBodyBold());
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space8())
        );
        btn.setClickable(true);
        btn.setFocusable(true);

        switch (variant) {
            case VARIANT_PRIMARY:
                btn.setTextColor(0xFFFFFFFF);
                btn.setBackground(DesignSystem.roundedBg(
                    DesignSystem.colorAccent(), DesignSystem.radiusButton()));
                break;
            case VARIANT_SUCCESS:
                btn.setTextColor(0xFFFFFFFF);
                btn.setBackground(DesignSystem.roundedBg(
                    DesignSystem.colorSuccess(), DesignSystem.radiusButton()));
                break;
            case VARIANT_DESTRUCTIVE:
                btn.setTextColor(DesignSystem.colorDestructive());
                btn.setBackground(DesignSystem.roundedBgWithBorder(
                    DesignSystem.colorDestructiveLight(),
                    DesignSystem.colorDestructive(), 1,
                    DesignSystem.radiusButton()));
                break;
            default: // VARIANT_GHOST
                btn.setTextColor(DesignSystem.colorTextSub());
                btn.setBackground(DesignSystem.roundedBgWithBorder(
                    DesignSystem.colorMutedBg(),
                    DesignSystem.colorBorder(), 1,
                    DesignSystem.radiusButton()));
        }
        return btn;
    }

    // Button variant constants
    public static final int VARIANT_PRIMARY     = 0;
    public static final int VARIANT_SECONDARY   = 1;
    public static final int VARIANT_SUCCESS     = 2;
    public static final int VARIANT_GHOST       = 3;
    public static final int VARIANT_DESTRUCTIVE = 4;

    /**
     * Full-width CTA button with gradient background
     * Use for: "Activate My Tracker", "Start Pro — $34.99/year"
     */
    public static TextView makeButtonHero(Context ctx, String label) {
        TextView btn = makeButtonPrimary(ctx, label);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textMedium());
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );
        btn.setBackground(DesignSystem.gradientBg(
            DesignSystem.colorHeroStart(),
            DesignSystem.colorHeroEnd(),
            GradientDrawable.Orientation.TL_BR,
            DesignSystem.radiusButton()
        ));
        return btn;
    }

    // ─────────────────────────────────────────────────────────
    // CARDS & CONTAINERS
    // ─────────────────────────────────────────────────────────

    /**
     * Standard card — white/dark surface with shadow
     * Use for: most content cards throughout the app
     */
    public static CardView makeCard(Context ctx) {
        CardView card = new CardView(ctx);
        card.setRadius(DesignSystem.dp(ctx, DesignSystem.radiusCard()));
        card.setCardBackgroundColor(DesignSystem.colorCard());
        card.setCardElevation(DesignSystem.dp(ctx, DesignSystem.elevationCard()));
        card.setUseCompatPadding(true);
        card.setPreventCornerOverlap(true);
        return card;
    }

    /**
     * Card with accent left border — for trip cards
     * accentColor: DesignSystem.colorSuccess() for Business,
     *              DesignSystem.colorMuted() for Uncategorized
     *
     * Note: CardView doesn't support left-only borders natively.
     * This wraps the card in a LinearLayout with a colored left strip.
     */
    public static LinearLayout makeAccentCard(Context ctx, int accentColor) {
        LinearLayout wrapper = new LinearLayout(ctx);
        wrapper.setOrientation(LinearLayout.HORIZONTAL);
        wrapper.setBackground(DesignSystem.roundedBg(
            DesignSystem.colorCard(), DesignSystem.radiusCard()));

        // Left accent strip
        View strip = new View(ctx);
        LinearLayout.LayoutParams stripParams = new LinearLayout.LayoutParams(
            DesignSystem.dp(ctx, 3),
            LinearLayout.LayoutParams.MATCH_PARENT
        );
        strip.setLayoutParams(stripParams);
        strip.setBackgroundColor(accentColor);

        // Content area
        LinearLayout content = new LinearLayout(ctx);
        content.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
        );
        contentParams.setMargins(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );
        content.setLayoutParams(contentParams);

        wrapper.addView(strip);
        wrapper.addView(content);
        return wrapper;
    }

    /**
     * Hero card — blue gradient
     * Use for: "Auto Detection Active", tracking status
     */
    public static LinearLayout makeHeroCard(Context ctx) {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20())
        );
        card.setBackground(DesignSystem.gradientBg(
            DesignSystem.colorHeroStart(),
            DesignSystem.colorHeroEnd(),
            GradientDrawable.Orientation.TL_BR,
            DesignSystem.radiusLarge()
        ));
        return card;
    }

    /**
     * Money card — green gradient
     * Use for: tax savings, deduction totals
     */
    public static LinearLayout makeMoneyCard(Context ctx) {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20()),
            DesignSystem.dp(ctx, DesignSystem.space20())
        );
        card.setBackground(DesignSystem.gradientBg(
            DesignSystem.colorMoneyStart(),
            DesignSystem.colorMoneyEnd(),
            GradientDrawable.Orientation.TL_BR,
            DesignSystem.radiusLarge()
        ));
        return card;
    }

    /**
     * Warning card — amber tint
     * Use for: permission warnings, battery notices, trip limit alerts
     */
    public static LinearLayout makeWarningCard(Context ctx) {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        card.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorWarningLight(),
            DesignSystem.colorWarning(),
            1,
            DesignSystem.radiusSmall()
        ));
        return card;
    }

    /**
     * Success card — green tint
     * Use for: active status, confirmed states
     */
    public static LinearLayout makeSuccessCard(Context ctx) {
        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        card.setBackground(DesignSystem.roundedBgWithBorder(
            DesignSystem.colorSuccessLight(),
            DesignSystem.colorSuccess(),
            1,
            DesignSystem.radiusSmall()
        ));
        return card;
    }

    // ─────────────────────────────────────────────────────────
    // TAGS & PILLS
    // ─────────────────────────────────────────────────────────

    /**
     * Category tag / pill
     * Use for: "Business", "Uncat.", subscription tier badges
     */
    public static TextView makeTag(Context ctx, String label, int textColor) {
        TextView tag = new TextView(ctx);
        tag.setText(label.toUpperCase());
        tag.setTextColor(textColor);
        tag.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textXS());
        tag.setTypeface(DesignSystem.fontBodyBold());
        tag.setLetterSpacing(0.08f);
        tag.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space4()),
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space4())
        );
        int bgColor = DesignSystem.withOpacity(textColor, 0.12f);
        tag.setBackground(DesignSystem.roundedBgWithBorder(
            bgColor, DesignSystem.withOpacity(textColor, 0.25f),
            1, DesignSystem.radiusPill()
        ));
        return tag;
    }

    /**
     * Business trip tag
     */
    public static TextView makeTagBusiness(Context ctx) {
        return makeTag(ctx, "Business", DesignSystem.colorSuccess());
    }

    /**
     * Uncategorized trip tag
     */
    public static TextView makeTagUncat(Context ctx) {
        return makeTag(ctx, "Uncat.", DesignSystem.colorMuted());
    }

    /**
     * Active status badge — pulsing green dot + text
     * Returns a horizontal LinearLayout
     */
    public static LinearLayout makeStatusBadge(Context ctx, String label, boolean active) {
        LinearLayout badge = new LinearLayout(ctx);
        badge.setOrientation(LinearLayout.HORIZONTAL);
        badge.setGravity(Gravity.CENTER_VERTICAL);

        // Dot
        View dot = new View(ctx);
        int dotSize = DesignSystem.dp(ctx, 8);
        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dotSize, dotSize);
        dotParams.setMarginEnd(DesignSystem.dp(ctx, DesignSystem.space8()));
        dot.setLayoutParams(dotParams);
        dot.setBackground(DesignSystem.roundedBg(
            active ? DesignSystem.colorSuccess() : DesignSystem.colorMuted(),
            DesignSystem.radiusPill()
        ));

        // Label
        TextView tv = new TextView(ctx);
        tv.setText(label);
        tv.setTextColor(active ? DesignSystem.colorSuccess() : DesignSystem.colorMuted());
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textSmall());
        tv.setTypeface(DesignSystem.fontBodyBold());

        badge.addView(dot);
        badge.addView(tv);
        return badge;
    }

    // ─────────────────────────────────────────────────────────
    // DIVIDERS & SPACING
    // ─────────────────────────────────────────────────────────

    /**
     * Horizontal divider line
     */
    public static View makeDivider(Context ctx) {
        View divider = new View(ctx);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            DesignSystem.dp(ctx, 1)
        );
        params.setMargins(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );
        divider.setLayoutParams(params);
        divider.setBackgroundColor(DesignSystem.colorBorder());
        return divider;
    }

    /**
     * Vertical spacer — fixed height
     */
    public static View makeSpacer(Context ctx, int heightDp) {
        View spacer = new View(ctx);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            DesignSystem.dp(ctx, heightDp)
        ));
        return spacer;
    }

    // ─────────────────────────────────────────────────────────
    // LAYOUT HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * Standard vertical LinearLayout — for stacking cards/content
     */
    public static LinearLayout makeColumn(Context ctx) {
        LinearLayout col = new LinearLayout(ctx);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        return col;
    }

    /**
     * Standard horizontal LinearLayout — for rows
     */
    public static LinearLayout makeRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));
        return row;
    }

    /**
     * Row with space-between layout
     * Use for: label + value rows, trip header rows
     */
    public static LinearLayout makeRowSpaceBetween(Context ctx) {
        LinearLayout row = makeRow(ctx);
        row.setGravity(Gravity.CENTER_VERTICAL);
        // Children should use weight or WRAP_CONTENT with a spacer
        return row;
    }

    /**
     * Scrollable content wrapper
     * Use for: tab content that may exceed screen height
     */
    public static ScrollView makeScrollContainer(Context ctx) {
        ScrollView scroll = new ScrollView(ctx);
        scroll.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.MATCH_PARENT
        ));
        scroll.setFillViewport(true);
        scroll.setVerticalScrollBarEnabled(false);
        return scroll;
    }

    /**
     * Card inner padding wrapper
     * Use for: content inside a CardView
     */
    public static LinearLayout makeCardContent(Context ctx) {
        LinearLayout content = makeColumn(ctx);
        content.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16()),
            DesignSystem.dp(ctx, DesignSystem.space16())
        );
        return content;
    }

    // ─────────────────────────────────────────────────────────
    // IRS RATE ROW
    // ─────────────────────────────────────────────────────────

    /**
     * IRS rate display row — label on left, colored value on right
     * Use for: Settings screen IRS rates section
     */
    public static LinearLayout makeIrsRateRow(
            Context ctx, String label, String value, int valueColor) {

        LinearLayout row = makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );

        TextView labelTv = makeBody(ctx, label);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        labelTv.setLayoutParams(labelParams);

        TextView valueTv = new TextView(ctx);
        valueTv.setText(value);
        valueTv.setTextColor(valueColor);
        valueTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textMedium());
        valueTv.setTypeface(DesignSystem.fontDisplay());

        row.addView(labelTv);
        row.addView(valueTv);
        return row;
    }

    // ─────────────────────────────────────────────────────────
    // TRIP CARD ROW
    // ─────────────────────────────────────────────────────────

    /**
     * Recent trip row — for Home screen "Recent Trips" list
     * Returns a LinearLayout row with trip info + category tag
     */
    public static LinearLayout makeTripRow(
            Context ctx,
            String dateTime,
            String milesAndType,
            String category,
            int categoryColor,
            boolean isLast) {

        LinearLayout row = makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );

        // Left: date + miles
        LinearLayout left = makeColumn(ctx);
        LinearLayout.LayoutParams leftParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        left.setLayoutParams(leftParams);

        TextView dateTv = makeBodyPrimary(ctx, dateTime);
        dateTv.setTypeface(DesignSystem.fontBodyBold());

        TextView milesTv = makeCaption(ctx, milesAndType);
        LinearLayout.LayoutParams milesParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        milesParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space2());
        milesTv.setLayoutParams(milesParams);

        left.addView(dateTv);
        left.addView(milesTv);

        // Right: category tag
        TextView tag = makeTag(ctx, category, categoryColor);

        row.addView(left);
        row.addView(tag);

        // Bottom divider (not on last row)
        if (!isLast) {
            LinearLayout wrapper = makeColumn(ctx);
            wrapper.addView(row);
            wrapper.addView(makeDivider(ctx));
            return wrapper;
        }

        return row;
    }

    // ─────────────────────────────────────────────────────────
    // PERMISSION STATUS ROW
    // ─────────────────────────────────────────────────────────

    /**
     * Permission status row — label + colored dot + status text
     * Use for: onboarding verification screen
     */
    public static LinearLayout makePermissionRow(
            Context ctx, String label, boolean granted) {

        LinearLayout row = makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space8()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space8())
        );

        TextView labelTv = makeBody(ctx, label);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        labelTv.setLayoutParams(lp);

        LinearLayout statusBadge = makeStatusBadge(
            ctx,
            granted ? "Active" : "Missing",
            granted
        );

        row.addView(labelTv);
        row.addView(statusBadge);
        return row;
    }

    // ─────────────────────────────────────────────────────────
    // THEME SWITCHER BUTTONS
    // ─────────────────────────────────────────────────────────

    /**
     * Theme selection button — for Settings appearance section
     * themeId: DesignSystem.THEME_LIGHT / THEME_DIM / THEME_DARK
     * active: whether this theme is currently selected
     */
    public static LinearLayout makeThemeButton(
            Context ctx, String emoji, String label,
            int bgColor, boolean active) {

        LinearLayout btn = makeColumn(ctx);
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space12()),
            DesignSystem.dp(ctx, DesignSystem.space8()),
            DesignSystem.dp(ctx, DesignSystem.space12())
        );
        btn.setClickable(true);
        btn.setFocusable(true);
        btn.setBackground(DesignSystem.roundedBgWithBorder(
            bgColor,
            active ? DesignSystem.colorAccent() : DesignSystem.colorBorder(),
            active ? 2 : 1,
            DesignSystem.radiusCard()
        ));

        TextView emojiTv = new TextView(ctx);
        emojiTv.setText(emoji);
        emojiTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        emojiTv.setGravity(Gravity.CENTER);

        TextView labelTv = new TextView(ctx);
        labelTv.setText(label);
        labelTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, DesignSystem.textXS());
        labelTv.setTypeface(DesignSystem.fontBodyBold());
        labelTv.setTextColor(bgColor == 0xFFF7F8FC ? 0xFF111827 : 0xFFFFFFFF);
        labelTv.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space4());
        labelTv.setLayoutParams(labelParams);

        btn.addView(emojiTv);
        btn.addView(labelTv);
        return btn;
    }

    // ─────────────────────────────────────────────────────────
    // TOGGLE ROW
    // ─────────────────────────────────────────────────────────

    /**
     * Settings toggle row — label on left, toggle switch on right
     * Note: returns a LinearLayout; you must add a real Switch
     * or handle toggle state yourself
     */
    public static LinearLayout makeToggleRow(Context ctx, String label, String sublabel) {
        LinearLayout row = makeRow(ctx);
        row.setPadding(0,
            DesignSystem.dp(ctx, DesignSystem.space4()),
            0,
            DesignSystem.dp(ctx, DesignSystem.space4())
        );

        LinearLayout textCol = makeColumn(ctx);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textCol.setLayoutParams(textParams);

        TextView labelTv = makeBodyPrimary(ctx, label);
        labelTv.setTypeface(DesignSystem.fontBodyBold());
        textCol.addView(labelTv);

        if (sublabel != null && !sublabel.isEmpty()) {
            TextView subTv = makeCaption(ctx, sublabel);
            LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            subParams.topMargin = DesignSystem.dp(ctx, DesignSystem.space2());
            subTv.setLayoutParams(subParams);
            textCol.addView(subTv);
        }

        row.addView(textCol);
        // Caller adds their Switch widget after this row is returned
        return row;
    }
}
