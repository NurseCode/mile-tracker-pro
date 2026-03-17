 package com.miletrackerpro.app;

import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;

/**
 * MileTracker Pro — Design System
 * Single source of truth for all visual tokens.
 * Three themes: LIGHT, DIM (default), DARK
 *
 * Usage:
 *   DesignSystem.setTheme(DesignSystem.THEME_DIM);
 *   int bg = DesignSystem.colorBackground();
 *   textView.setTextColor(DesignSystem.colorText());
 */
public class DesignSystem {

    // ── THEME CONSTANTS ───────────────────────────────────────
    public static final int THEME_LIGHT = 0;
    public static final int THEME_DIM   = 1;
    public static final int THEME_DARK  = 2;

    private static int currentTheme = THEME_DIM;

    public static void setTheme(int theme) {
        currentTheme = theme;
    }

    public static int getTheme() {
        return currentTheme;
    }

    public static int getCurrentTheme() {
        return currentTheme;
    }

    public static boolean isLight() {
        return currentTheme == THEME_LIGHT;
    }

    // ── BACKGROUND COLORS ─────────────────────────────────────

    /** Main screen background */
    public static int colorBackground() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFF7F8FC;
            case THEME_DARK:  return 0xFF0D1117;
            default:          return 0xFF1C2333; // DIM
        }
    }

    /** Card / surface background */
    public static int colorCard() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFFFFFFF;
            case THEME_DARK:  return 0xFF161B22;
            default:          return 0xFF242E42;
        }
    }

    /** Elevated card — slightly lighter than card */
    public static int colorCardElevated() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFF0F2FA;
            case THEME_DARK:  return 0xFF21262D;
            default:          return 0xFF2E3650;
        }
    }

    /** Header / nav bar background */
    public static int colorHeader() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFFFFFFF;
            case THEME_DARK:  return 0xFF0D1117;
            default:          return 0xFF181F2E;
        }
    }

    /** Muted background — for ghost buttons, input fields */
    public static int colorMutedBg() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFF3F4F6;
            case THEME_DARK:  return 0xFF21262D;
            default:          return 0xFF2A3347;
        }
    }

    // ── TEXT COLORS ───────────────────────────────────────────

    /** Primary text */
    public static int colorText() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF111827;
            case THEME_DARK:  return 0xFFF0F6FC;
            default:          return 0xFFEDF2FF;
        }
    }

    /** Secondary / subdued text */
    public static int colorTextSub() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF6B7280;
            case THEME_DARK:  return 0xFF8B949E;
            default:          return 0xFF94A3B8;
        }
    }

    /** Muted text — labels, captions, placeholders */
    public static int colorMuted() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF9CA3AF;
            case THEME_DARK:  return 0xFF8B949E;
            default:          return 0xFF64748B;
        }
    }

    // ── BRAND / ACCENT COLORS ─────────────────────────────────

    /** Primary accent — blue */
    public static int colorAccent() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF2563EB;
            case THEME_DARK:  return 0xFF58A6FF;
            default:          return 0xFF60A5FA;
        }
    }

    /** Accent at ~12% opacity — for tinted backgrounds */
    public static int colorAccentLight() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0x142563EB; // ~8% opacity
            case THEME_DARK:  return 0x1F58A6FF; // ~12%
            default:          return 0x1F60A5FA;
        }
    }

    /** Accent text on light tinted backgrounds */
    public static int colorAccentText() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF1D4ED8;
            case THEME_DARK:  return 0xFF79C0FF;
            default:          return 0xFF93C5FD;
        }
    }

    // ── SEMANTIC COLORS ───────────────────────────────────────

    /** Success — green (money, active, confirmed) */
    public static int colorSuccess() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF059669;
            case THEME_DARK:  return 0xFF3FB950;
            default:          return 0xFF34D399;
        }
    }

    /** Success at ~10% opacity */
    public static int colorSuccessLight() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0x14059669;
            case THEME_DARK:  return 0x1A3FB950;
            default:          return 0x1A34D399;
        }
    }

    /** Warning — amber (battery, limits approaching) */
    public static int colorWarning() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFD97706;
            case THEME_DARK:  return 0xFFD29922;
            default:          return 0xFFFCD34D;
        }
    }

    /** Warning at ~10% opacity */
    public static int colorWarningLight() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0x14D97706;
            case THEME_DARK:  return 0x1AD29922;
            default:          return 0x1AFCD34D;
        }
    }

    /** Destructive — red (delete, log out, errors) */
    public static int colorDestructive() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFDC2626;
            case THEME_DARK:  return 0xFFF85149;
            default:          return 0xFFF87171;
        }
    }

    /** Destructive at ~10% opacity */
    public static int colorDestructiveLight() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0x14DC2626;
            case THEME_DARK:  return 0x1AF85149;
            default:          return 0x1AF87171;
        }
    }

    // ── BORDER & DIVIDER ──────────────────────────────────────

    /** Standard border */
    public static int colorBorder() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFE5E7EB;
            case THEME_DARK:  return 0xFF30363D;
            default:          return 0xFF2D3A50;
        }
    }

    /** Subtle border — for card outlines */
    public static int colorBorderLight() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFFF3F4F6;
            case THEME_DARK:  return 0xFF21262D;
            default:          return 0xFF334155;
        }
    }

    // ── SPECIAL GRADIENTS (as start/end color pairs) ──────────

    /** Hero gradient start (blue) */
    public static int colorHeroStart() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF1D4ED8;
            case THEME_DARK:  return 0xFF0D2159;
            default:          return 0xFF1E3A8A;
        }
    }

    /** Hero gradient end (lighter blue) */
    public static int colorHeroEnd() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF3B82F6;
            case THEME_DARK:  return 0xFF1D4ED8;
            default:          return 0xFF2563EB;
        }
    }

    /** Money gradient start (dark green) */
    public static int colorMoneyStart() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF064E3B;
            case THEME_DARK:  return 0xFF031A0A;
            default:          return 0xFF052E16;
        }
    }

    /** Money gradient end (green) */
    public static int colorMoneyEnd() {
        switch (currentTheme) {
            case THEME_LIGHT: return 0xFF059669;
            case THEME_DARK:  return 0xFF052E16;
            default:          return 0xFF064E3B;
        }
    }

    // ── TYPOGRAPHY ────────────────────────────────────────────

    /**
     * Display font — Georgia serif
     * Use for: headings, big numbers, hero text, screen titles
     */
    public static Typeface fontDisplay() {
        return Typeface.SERIF;
    }

    /**
     * Display font bold weight
     */
    public static Typeface fontDisplayBold() {
        return Typeface.create(Typeface.SERIF, Typeface.BOLD);
    }

    /**
     * Body font — clean sans-serif
     * Use for: body text, labels, buttons, captions, UI copy
     */
    public static Typeface fontBody() {
        return Typeface.SANS_SERIF;
    }

    /**
     * Body font bold weight
     */
    public static Typeface fontBodyBold() {
        return Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD);
    }

    // ── TYPE SCALE (sp values) ────────────────────────────────

    public static float textXS()      { return 10f; } // labels, tags, captions
    public static float textSmall()   { return 12f; } // secondary body
    public static float textBody()    { return 14f; } // primary body
    public static float textMedium()  { return 16f; } // buttons, emphasized body
    public static float textLarge()   { return 20f; } // section headings
    public static float textDisplay() { return 26f; } // screen titles
    public static float textHero()    { return 38f; } // big numbers (savings $$$)
    public static float textMega()    { return 48f; } // celebration numbers

    // ── SHAPE / CORNER RADIUS (dp values) ─────────────────────

    public static int radiusSmall()  { return 8;  } // chips, small elements
    public static int radiusCard()   { return 16; } // cards, dialogs
    public static int radiusButton() { return 12; } // buttons
    public static int radiusPill()   { return 20; } // tags, pills, badges
    public static int radiusLarge()  { return 20; } // hero cards
    public static int radiusXL()     { return 24; } // bottom sheets, large modals

    // ── SPACING (dp values) ───────────────────────────────────

    public static int space2()  { return 2;  }
    public static int space4()  { return 4;  }
    public static int space8()  { return 8;  }
    public static int space12() { return 12; }
    public static int space16() { return 16; }
    public static int space20() { return 20; }
    public static int space24() { return 24; }
    public static int space32() { return 32; }
    public static int space48() { return 48; }

    // ── ELEVATION (dp values) ─────────────────────────────────

    public static int elevationCard()   { return 2; }
    public static int elevationDialog() { return 8; }
    public static int elevationNav()    { return 4; }

    // ── OPACITY HELPERS ───────────────────────────────────────

    /** Apply opacity to any color (0.0 - 1.0) */
    public static int withOpacity(int color, float opacity) {
        int alpha = Math.round(opacity * 255);
        return (color & 0x00FFFFFF) | (alpha << 24);
    }

    // ── DRAWABLE FACTORY ──────────────────────────────────────

    /**
     * Solid rounded background — the most common shape in the app
     * radiusDp: use radiusCard(), radiusButton(), etc.
     */
    public static GradientDrawable roundedBg(int color, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setShape(GradientDrawable.RECTANGLE);
        gd.setColor(color);
        gd.setCornerRadius(radiusDp * 3f);
        return gd;
    }

    /**
     * Rounded background with stroke border
     */
    public static GradientDrawable roundedBgWithBorder(
            int fillColor, int strokeColor, int strokeWidthDp, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setShape(GradientDrawable.RECTANGLE);
        gd.setColor(fillColor);
        gd.setStroke(Math.round(strokeWidthDp * 3f), strokeColor);
        gd.setCornerRadius(radiusDp * 3f);
        return gd;
    }

    /**
     * Linear gradient background — for hero and money cards
     * direction: GradientDrawable.Orientation.TL_BR (top-left to bottom-right)
     */
    public static GradientDrawable gradientBg(
            int startColor, int endColor,
            GradientDrawable.Orientation orientation,
            int radiusDp) {
        GradientDrawable gd = new GradientDrawable(
            orientation,
            new int[]{ startColor, endColor }
        );
        gd.setCornerRadius(radiusDp * 3f);
        return gd;
    }

    // ── DP CONVERSION ─────────────────────────────────────────

    /**
     * Convert dp to pixels — use everywhere you set sizes/padding
     * Example: card.setPadding(dp(ctx, space16()), dp(ctx, space16()), ...)
     */
    public static int dp(Context ctx, int dp) {
        return Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                ctx.getResources().getDisplayMetrics()
            )
        );
    }

    /**
     * Convert sp to pixels — use for setTextSize with UNIT_PX
     * Or just pass the float directly to setTextSize() which defaults to sp
     */
    public static float sp(Context ctx, float sp) {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP,
            sp,
            ctx.getResources().getDisplayMetrics()
        );
    }

    // ── THEME PERSISTENCE KEYS ────────────────────────────────

    /**
     * Use these keys with SharedPreferences to save/load theme
     * Example:
     *   prefs.putInt(DesignSystem.PREF_KEY_THEME, DesignSystem.THEME_DIM);
     *   DesignSystem.setTheme(prefs.getInt(DesignSystem.PREF_KEY_THEME, THEME_DIM));
     */
    public static final String PREF_KEY_THEME = "design_system_theme";
    public static final String PREF_FILE      = "miletracker_prefs";
}
