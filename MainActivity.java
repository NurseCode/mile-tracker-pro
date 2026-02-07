Params);
          irsCard.setElevation(4);

          TextView irsHeader = new TextView(this);
          irsHeader.setText("💰 IRS Mileage Rates");
          irsHeader.setTextSize(16);
          irsHeader.setTextColor(COLOR_TEXT_PRIMARY);
          irsHeader.setTypeface(null, Typeface.BOLD);
          irsHeader.setPadding(0, 0, 0, 8);
          irsCard.addView(irsHeader);

          TextView irsRatesText = new TextView(this);
          irsRatesText.setText(String.format("Business: $%.2f/mile\nMedical: $%.2f/mile\nCharity: $%.2f/mile",
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
