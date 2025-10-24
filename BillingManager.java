package com.miletrackerpro.app.utils;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.android.billingclient.api.*;
import com.miletrackerpro.app.storage.TripStorage;
import java.util.ArrayList;
import java.util.List;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.MediaType;
import okhttp3.RequestBody;
import org.json.JSONObject;

public class BillingManager implements PurchasesUpdatedListener {
    private static final String TAG = "BillingManager";
    private static final String API_URL = "https://mileage-tracker-codenurse.replit.app/api/subscription/verify-purchase";
    
    // Product IDs (must match Google Play Console configuration)
    public static final String PRODUCT_ID_MONTHLY = "premium_monthly";
    public static final String PRODUCT_ID_YEARLY = "premium_yearly";
    
    private BillingClient billingClient;
    private Context context;
    private TripStorage tripStorage;
    private BillingCallback billingCallback;
    private String userEmail;
    
    public interface BillingCallback {
        void onPurchaseSuccess(String productId);
        void onPurchaseFailure(String error);
        void onBillingSetupFinished(boolean success);
    }
    
    public BillingManager(Context context, TripStorage tripStorage, BillingCallback callback, String userEmail) {
        this.context = context;
        this.tripStorage = tripStorage;
        this.billingCallback = callback;
        this.userEmail = userEmail;
        
        // Initialize billing client
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build();
        
        // Connect to Google Play
        connectToGooglePlay();
    }
    
    private void connectToGooglePlay() {
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing client connected successfully");
                    if (billingCallback != null) {
                        billingCallback.onBillingSetupFinished(true);
                    }
                    // Check for existing purchases
                    queryPurchases();
                } else {
                    Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                    if (billingCallback != null) {
                        billingCallback.onBillingSetupFinished(false);
                    }
                }
            }
            
            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected. Attempting to reconnect...");
                // Try to restart the connection
                connectToGooglePlay();
            }
        });
    }
    
    // Query existing purchases (for restore functionality)
    public void queryPurchases() {
        if (!billingClient.isReady()) {
            Log.w(TAG, "Billing client not ready for purchase query");
            return;
        }
        
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Found " + purchases.size() + " existing purchases");
                    handlePurchases(purchases);
                } else {
                    Log.e(TAG, "Error querying purchases: " + billingResult.getDebugMessage());
                }
            }
        );
    }
    
    // Launch purchase flow
    public void launchPurchaseFlow(Activity activity, String productId) {
        if (!billingClient.isReady()) {
            Log.e(TAG, "Billing client not ready");
            Toast.makeText(context, "Billing system not ready. Please try again.", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Query product details first
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );
        
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build();
        
        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && productDetailsList != null && !productDetailsList.isEmpty()) {
                ProductDetails productDetails = productDetailsList.get(0);
                
                // Get subscription offer token
                List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
                if (offers == null || offers.isEmpty()) {
                    Log.e(TAG, "No subscription offers available");
                    if (billingCallback != null) {
                        billingCallback.onPurchaseFailure("No subscription offers available");
                    }
                    return;
                }
                
                String offerToken = offers.get(0).getOfferToken();
                
                // Build billing flow params
                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                productDetailsParamsList.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerToken)
                        .build()
                );
                
                BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productDetailsParamsList)
                    .build();
                
                // Launch billing flow
                BillingResult result = billingClient.launchBillingFlow(activity, billingFlowParams);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    Log.e(TAG, "Failed to launch billing flow: " + result.getDebugMessage());
                    if (billingCallback != null) {
                        billingCallback.onPurchaseFailure(result.getDebugMessage());
                    }
                }
            } else {
                Log.e(TAG, "Error querying product details: " + billingResult.getDebugMessage());
                if (billingCallback != null) {
                    billingCallback.onPurchaseFailure("Product not found");
                }
            }
        });
    }
    
    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            Log.d(TAG, "Purchase successful. Processing " + purchases.size() + " purchases.");
            handlePurchases(purchases);
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d(TAG, "User canceled the purchase");
            if (billingCallback != null) {
                billingCallback.onPurchaseFailure("Purchase canceled");
            }
        } else {
            Log.e(TAG, "Purchase error: " + billingResult.getDebugMessage());
            if (billingCallback != null) {
                billingCallback.onPurchaseFailure(billingResult.getDebugMessage());
            }
        }
    }
    
    private void handlePurchases(List<Purchase> purchases) {
        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                // Verify and acknowledge purchase
                if (!purchase.isAcknowledged()) {
                    acknowledgePurchase(purchase);
                }
                
                // Update subscription tier
                List<String> products = purchase.getProducts();
                if (!products.isEmpty()) {
                    String productId = products.get(0);
                    String purchaseToken = purchase.getPurchaseToken();
                    
                    // Save premium status locally
                    tripStorage.setSubscriptionTier("premium");
                    tripStorage.setPurchaseToken(purchaseToken);
                    
                    Log.d(TAG, "Premium subscription activated locally: " + productId);
                    
                    // Sync with backend API (in background)
                    syncSubscriptionWithBackend(productId, purchaseToken);
                    
                    if (billingCallback != null) {
                        billingCallback.onPurchaseSuccess(productId);
                    }
                }
            }
        }
    }
    
    private void syncSubscriptionWithBackend(final String productId, final String purchaseToken) {
        if (userEmail == null || userEmail.isEmpty()) {
            Log.w(TAG, "No user email - skipping backend sync");
            return;
        }
        
        // Run in background thread
        new Thread(() -> {
            try {
                OkHttpClient client = new OkHttpClient();
                MediaType JSON = MediaType.parse("application/json; charset=utf-8");
                
                JSONObject json = new JSONObject();
                json.put("email", userEmail);
                json.put("purchaseToken", purchaseToken);
                json.put("productId", productId);
                
                RequestBody body = RequestBody.create(JSON, json.toString());
                Request request = new Request.Builder()
                    .url(API_URL)
                    .post(body)
                    .build();
                
                Response response = client.newCall(request).execute();
                String responseBody = response.body().string();
                
                if (response.isSuccessful()) {
                    Log.d(TAG, "✅ Subscription synced with backend: " + responseBody);
                } else {
                    Log.w(TAG, "Backend sync failed (non-critical): " + responseBody);
                }
                
            } catch (Exception e) {
                Log.w(TAG, "Backend sync error (non-critical): " + e.getMessage());
                // Don't fail the purchase if backend sync fails - it's not critical
            }
        }).start();
    }
    
    private void acknowledgePurchase(Purchase purchase) {
        AcknowledgePurchaseParams acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();
        
        billingClient.acknowledgePurchase(acknowledgePurchaseParams, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged successfully");
            } else {
                Log.e(TAG, "Failed to acknowledge purchase: " + billingResult.getDebugMessage());
            }
        });
    }
    
    public void endConnection() {
        if (billingClient != null && billingClient.isReady()) {
            billingClient.endConnection();
            Log.d(TAG, "Billing connection closed");
        }
    }
    
    public boolean isReady() {
        return billingClient != null && billingClient.isReady();
    }
    
    // Check if user has premium subscription
    public boolean isPremium() {
        if (tripStorage == null) {
            return false;
        }
        String tier = tripStorage.getSubscriptionTier();
        return "premium".equalsIgnoreCase(tier);
    }
}
