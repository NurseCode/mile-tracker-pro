END FUEL WALLET ====================

      private void fetchAndMergeExpensesFromServer(LinearLayout listLayout, android.app.Dialog dialog) {
          String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
          if (userEmail == null || userEmail.isEmpty()) return;

          new Thread(() -> {
              try {
                  okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                      .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .readTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                      .build();

                  okhttp3.Request request = new okhttp3.Request.Builder()
                      .url("https://miletracker-pro.replit.app/api/vehicle-expenses")
                      .addHeader("x-user-email", userEmail)
                      .get()
                      .build();

                  okhttp3.Response response = client.newCall(request).execute();
                  if (!response.isSuccessful()) return;
                  String responseBody = response.body().string();

                  org.json.JSONObject json = new org.json.JSONObject(responseBody);
                  if (!json.optBoolean("success", false)) return;

                  org.json.JSONArray serverExpenses = json.getJSONArray("expenses");

                  // Build set of existing local IDs so we never overwrite local data
                  org.json.JSONArray localExpenses = tripStorage.getAllVehicleExpenses();
                  java.util.Set<String> localIds = new java.util.HashSet<>();
                  for (int i = 0; i < localExpenses.length(); i++) {
                      org.json.JSONObject le = localExpenses.getJSONObject(i);
                      String lid = le.optString("id", "");
                      String lloId = le.optString("local_id", "");
                      if (!lid.isEmpty()) localIds.add(lid);
                      if (!lloId.isEmpty()) localIds.add(lloId);
                  }

                  // Add only server expenses that are missing locally (additive, local always wins)
                  int added = 0;
                  for (int i = 0; i < serverExpenses.length(); i++) {
                      org.json.JSONObject se = serverExpenses.getJSONObject(i);
                      String servLocalId = se.optString("local_id", "");
                      String servDbId = String.valueOf(se.optInt("id", -1));

                      if (!localIds.contains(servLocalId) && !localIds.contains(servDbId)) {
                          org.json.JSONObject localExp = new org.json.JSONObject();
                          localExp.put("id", servLocalId.isEmpty() ? servDbId : servLocalId);
                          localExp.put("category", se.optString("category", "Other"));
                          localExp.put("amount", se.optDouble("amount", 0));
                          localExp.put("date", se.optString("expense_date", ""));
                          localExp.put("notes", se.optString("notes", ""));
                          localExp.put("vehicle_name", se.optString("vehicle_name", ""));
                          localExp.put("gallons", se.optDouble("gallons", 0));
                          localExp.put("price_per_gallon", se.optDouble("price_per_gallon", 0));
                          localExp.put("station_name", se.optString("station_name", ""));
                          localExp.put("prev_odometer", se.optDouble("prev_odometer", 0));
                          localExp.put("curr_odometer", se.optDouble("curr_odometer", 0));
                          localExp.put("miles_driven", se.optDouble("miles_driven", 0));
                          localExp.put("cost_per_mile", se.optDouble("cost_per_mile", 0));
                          tripStorage.saveVehicleExpense(localExp);
                          added++;
                      }
                  }

                  if (added > 0) {
                      final int addedCount = added;
                      runOnUiThread(() -> {
                          try {
                              if (dialog != null && dialog.isShowing() && listLayout != null) {
                                  listLayout.removeAllViews();
                                  org.json.JSONArray updated = tripStorage.getAllVehicleExpenses();
                                  if (updated.length() == 0) {
                                      TextView empty = new TextView(this);
                                      empty.setText("No expenses logged yet.\n\nTap '+ Add' to record gas fill-ups, oil changes, tires, car washes, and more — with optional receipt photos.");
                                      empty.setTextColor(0xFF888888);
                                      empty.setTextSize(15);
                                      empty.setGravity(android.view.Gravity.CENTER);
                                      empty.setPadding(32, 80, 32, 32);
                                      listLayout.addView(empty);
                                  } else {
                                      for (int i = updated.length() - 1; i >= 0; i--) {
                                          listLayout.addView(buildExpenseRowView(updated.getJSONObject(i), dialog));
                                      }
                                  }
                                  Toast.makeText(this,
                                      "✓ " + addedCount + " expense" + (addedCount == 1 ? "" : "s") + " restored from cloud",
                                      Toast.LENGTH_SHORT).show();
                              }
                          } catch (Exception e) {
                              Log.e(TAG, "Error refreshing expense list after restore: " + e.getMessage());
                          }
                      });
                  }

              } catch (Exception e) {
                  Log.e(TAG, "Expense cloud restore error: " + e.getMessage());
              }
          }).start();
      }

      private void syncExpenseWithServer(org.json.JSONObject expense) {
          String userEmail = getSharedPreferences("MileTrackerAuth", MODE_PRIVATE).getString("user_email", null);
          if (userEmail == null || userEmail.isEmpty()) return;
          String apiBase = "https://miletracker-pro.replit.app";

          new Thread(() -> {
              try {
                  org.json.JSONObject body = new org.json.JSONObject();
                  body.put("local_id", expense.optString("id"));
                  body.put("category", expense.optString("category"));
                  body.put("amount", expense.optDouble("amount", 0));
                  body.put("expense_date", expense.optString("date"));
                  body.put("notes", expense.optString("notes"));
                  body.put("vehicle_name", expense.optString("vehicle_name"));
                  body.put("gallons", expense.optDouble("gallons", 0));
                  body.put("price_per_gallon", expense.optDouble("price_per_gallon", 0));
                  body.put("station_name", expense.optString("station_name"));
                  body.put("prev_odometer", expense.optDouble("prev_odometer", 0));
                  body.put("curr_odometer", expense.optDouble("curr_odometer", 0));
                  body.put("miles_driven", expense.optDouble("miles_driven", 0));
                  body.put("cost_per_mile", expense.optDouble("cost_per_mile", 0));

                  okhttp3.RequestBody reqBody = okhttp3.RequestBody.create(
                      body.toString(), okhttp3.MediaType.get("application/json; charset=utf-8"));
                  okhttp3.Request request = new okhttp3.Request.Builder()
                      .url(apiBase + "/api/vehicle-expenses")
                      .post(reqBody)
                      .addHeader("x-user-email", userEmail)
                      .build();
                  okhttp3.OkHttpClient client = new okhttp3.OkHttpClient();
                  client.newCall(request).execute().close();
              } catch (Exception e) {
                  Log.e(TAG, "Expense sync error: " + e.getMessage());
              }
          }).start();
      }

      private String getExpenseCategoryEmoji(String category) {
          if (category == null) return "💸";
          switch (category) {
              case "Gas": return "⛽";
              case "Oil Change": return "🔧";
              case "Tires": return "🔘";
              case "Car Wash": return "🚿";
              case "Insurance": return "🛡️";
              case "Parking / Tolls": return "🅿️";
              case "Repairs": return "🔩";
              default: return "💸";
          }
      }

      private String getTodayDate() {
          return new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
      }

      private TextView makeFormLabel(String text) {
          TextView tv = new TextView(this);
          tv.setText(text);
          tv.setTextColor(0xFF888888);
          tv.setTextSize(12);
          LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
          lp.setMargins(0, 16, 0, 4);
          tv.setLayoutParams(lp);
          return tv;
      }

      private android.widget.EditText makeFormEditText(String hint) {
          android.widget.EditText et = new android.widget.EditText(this);
          et.setText(hint);
          et.setTextColor(0xFFFFFFFF);
          et.setHintTextColor(0xFF555555);
          et.setBackground(createRoundedBackground(0xFF2D2D2D, 8));
          et.setPadding(16, 12, 16, 12);
          et.setTextSize(15);
          et.setLayoutParams(new LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
          return et;
      }
      // ==================== END VEHICLE EXPENSES FEATURE ====================
  }
