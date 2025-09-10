import { Router } from "express";
import { getUserProfile, getUserById, updateUser, deleteUser, getMyProfile, getTopTraders, getTradersList, toggleFollow, getUserDashboard, getCoinPurchaseHistory, getCoinDeductionHistory, getCoinTransactionHistory, getPayPalTransactions, updateUserProfile, getShipmentLog, trackShipment, getShippingLabel, getCategoryShippingRateHistory, deleteCategoryShippingRate } from "../controllers/user.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../utils/fileUpload.js";

const router = Router();

// Authenticated user profile API (requires token)
router.get("/my-profile", userAuth, getMyProfile);

// Update user profile API (requires token) - supports file upload and social media links
router.put("/profile", userAuth, upload.single('profile_picture'), updateUserProfile);

// Public profile API (no authentication required)
router.get("/profile/:userId", getUserProfile);

// Top traders API (public, no authentication required)
router.get("/top-traders", getTopTraders);

// Traders list API (optional authentication - excludes authenticated user if token provided)
router.get("/traders-list", getTradersList);

// Follow/Unfollow API (requires authentication - handled in controller)
router.post("/follow", toggleFollow);

// User dashboard API (requires authentication - handled in controller)
router.get("/mydashboard", getUserDashboard);

// Coin purchase history API (requires authentication - handled in controller)
router.get("/coin-purchase-history", getCoinPurchaseHistory);

// Coin deduction history API (requires authentication - handled in controller)
router.get("/coin-deduction-history", getCoinDeductionHistory);

// Unified coin transaction history API (requires authentication - handled in controller)
router.get("/coin-transaction-history", getCoinTransactionHistory);

// PayPal transactions API (requires authentication - handled in controller)
router.get("/paypal-transactions", getPayPalTransactions);

// Shipment log API (requires authentication - handled in controller)
router.get("/shipment-log", getShipmentLog);

// Track shipment API (public - no authentication required)
router.get("/track-shipment/:tracking_id", trackShipment);

// Get shipping label API (public - no authentication required)
router.get("/shipping-label/:tracking_id", getShippingLabel);

// Category shipping rate history API (requires authentication - handled in controller)
router.get("/category-shipping-rate-history", getCategoryShippingRateHistory);
router.get("/category-shipping-rate-history/:id", getCategoryShippingRateHistory);

// Delete category shipping rate API (requires authentication - handled in controller)
router.delete("/category-shipping-rate-history/:id", deleteCategoryShippingRate);

// Other user routes (must be after specific routes to avoid conflicts)
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;