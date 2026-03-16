PaywallScreen paywall = new PaywallScreen(this, new PaywallScreen.PaywallListener() {
    @Override
    public void onYearlySelected() {
        // your existing yearly purchase flow from BillingManager
    }
    @Override
    public void onMonthlySelected() {
        // your existing monthly purchase flow from BillingManager
    }
    @Override
    public void onDismissed() {
        // dismiss dialog
    }
});
paywall.setUserData(userMiles, userSavings, tripsUsed);
View paywallView = paywall.build();
// show paywallView in your existing dialog container
