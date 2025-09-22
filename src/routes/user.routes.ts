import { Router } from "express";
import { getUserProfile, getUserById, updateUser, deleteUser, getMyProfile, getTopTraders, getTradersList, toggleFollow, getLikesAndFollowing, getCoinPurchaseHistory, getCoinDeductionHistory, getCoinTransactionHistory, getPayPalTransactions, updateUserProfile, getShipmentLog, trackShipment, getShippingLabel, getCategoryShippingRateHistory, createCategoryShippingRate, updateCategoryShippingRate, deleteCategoryShippingRate, getBoughtAndSoldProducts, getOngoingTrades, getTradeDetail, getCompletedTrades, getCancelledTrades, getNotifications, getAddresses, getAddressById, createAddress, updateAddress, deleteAddress, markAddressAsDefault, submitRating, markAllNotificationsAsRead, getMyTickets, confirmPayment, cancelShippingPayment } from "../controllers/user.controller.js";
import { getTradeDetail as getTradeDetailNew } from "../controllers/tradeDetail.controller.js";
import { payToChangeTradeStatus, payPalPaymentSuccess, payPalPaymentCancel, handlePayPalResponse, payToChangeTradeStatusCounterOffer } from "../controllers/payment.controller.js";
import { getCopyProductFormFields } from "../controllers/tradingcard.controller.js";
import { cartOffer, getCart, processCheckout, payNowPayment, feedPayPalPaymentReturn, feedPayPalPaymentNotify, removeCartItem, tradeProposal, proposeTrade, cancelTrade, editTradeProposalDetail, editTradeProposal, reviewTradeProposal, acceptTrade, getShippingAddress, shipmentInitialize, getShippingParcel, saveParcel, getShippingCarrier, getShippingCheckout, shippingCheckout, shippingConfirmOrder, getTradeCounterDetail, shippingTradeSuccess } from "../controllers/cart.controller.js";
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

// Likes and following API (requires authentication - handled in controller)
router.get("/likes-and-following", getLikesAndFollowing);

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

// Create category shipping rate API (requires authentication - handled in controller)
router.post("/category-shipping-rate-history", createCategoryShippingRate);

// Update category shipping rate API (requires authentication - handled in controller)
router.put("/category-shipping-rate-history/:id", updateCategoryShippingRate);

// Delete category shipping rate API (requires authentication - handled in controller)
router.delete("/category-shipping-rate-history/:id", deleteCategoryShippingRate);

// Bought and sold products API (requires authentication - handled in controller)
router.get("/bought-and-sold-products", getBoughtAndSoldProducts);
router.get("/bought-and-sold-products/:id", getBoughtAndSoldProducts);

// Ongoing trades API (requires authentication - handled in controller)
router.get("/ongoing-trades", getOngoingTrades);
router.get("/ongoing-trades/:id", getOngoingTrades);

// Trade detail API for modal (requires authentication - handled in controller)
router.get("/trade-detail", getTradeDetail);

// Enhanced trade detail API (matches Laravel functionality)
router.get("/trade-detail-enhanced", userAuth, getTradeDetailNew);

// Completed trades API (requires authentication - handled in controller)
router.get("/completed-trades", getCompletedTrades);
router.get("/completed-trades/:id", getCompletedTrades);

// Address management APIs (requires authentication - handled in controller)
router.get("/addresses", getAddresses);
router.get("/addresses/:id", getAddressById);
router.post("/addresses", createAddress);
router.put("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);
router.put("/addresses/:id/mark-default", markAddressAsDefault);

// Cancelled trades routes
router.get("/cancelled-trades", userAuth, getCancelledTrades);
router.get("/cancelled-trades/:id", userAuth, getCancelledTrades);

// Notifications routes
router.get("/notifications", userAuth, getNotifications);
router.put("/notifications/mark-all-read", userAuth, markAllNotificationsAsRead);

// Support tickets routes
router.get("/my-tickets", userAuth, getMyTickets);

// Payment confirmation API
router.post("/confirm-payment", userAuth, confirmPayment);

// Rating submission API
router.post("/submit-rating", userAuth, submitRating);

// Make offer API (requires authentication)
router.post("/make-offer/:id", userAuth, cartOffer);

// Get cart API (requires authentication)
router.get("/my-cart", userAuth, getCart);

// Remove cart item API (requires authentication)
router.delete("/remove-cart-item/:id", userAuth, removeCartItem);

// Trade proposal API (requires authentication)
router.get("/trade-proposal/:card_id/:interested_user", userAuth, tradeProposal);

// Propose trade API (requires authentication - handled in controller)
router.post("/propose-trade", userAuth, proposeTrade);

// Cancel trade API (requires authentication - handled in controller)
router.post("/cancel-trade", userAuth, cancelTrade);

// Edit trade proposal detail API (requires authentication)
router.get("/edit-trade-proposal/:card_id", userAuth, editTradeProposalDetail);

// Edit trade proposal API (requires authentication)
router.post("/edit-trade-proposal", userAuth, editTradeProposal);

// Review trade proposal API (requires authentication)
router.get("/review-trade-proposal/:card_id", userAuth, reviewTradeProposal);

// Accept trade API (requires authentication)
router.post("/accept-trade", userAuth, acceptTrade);

// Get shipping address API (requires authentication)
router.get("/shipping-address", userAuth, getShippingAddress);

// Shipment initialize API (requires authentication)
router.post("/shipment-initialize", userAuth, shipmentInitialize);

// Get shipping parcel API (requires authentication)
router.get("/shipping-parcel", userAuth, getShippingParcel);

// Save parcel API (requires authentication)
router.post("/save-parcel", userAuth, saveParcel);

// Get shipping carrier API (requires authentication)
router.get("/shipping-carrier", userAuth, getShippingCarrier);

// Get shipping checkout data API (requires authentication)
router.get("/shipping-checkout", userAuth, getShippingCheckout);

// Shipping checkout API (requires authentication)
router.post("/shipping-checkout", userAuth, shippingCheckout);

// Shipping confirm order API (requires authentication)
router.post("/shipping-confirm-order", userAuth, shippingConfirmOrder);

// Process checkout API (requires authentication)
router.post("/checkout", userAuth, processCheckout);

// Pay now API (requires authentication)
router.post("/pay-now", userAuth, payNowPayment);

// PayPal Payment Return APIs (no authentication required - called by PayPal)
router.get("/feed-paypal-payment-buysell/:type/:refId", feedPayPalPaymentReturn);
router.post("/notify/feed-paypal-payment-buysell/:refId", feedPayPalPaymentNotify);

// Trade counter detail route
router.get("/trade-counter-detail/:card_id", userAuth, getTradeCounterDetail);

// Shipping trade success route
router.post("/shipping-trade-success/:trade_id", userAuth, shippingTradeSuccess);

// Cancel shipping payment route
router.post("/shipping-trade-cancel", userAuth, cancelShippingPayment);

// Payment processing routes
router.post("/pay-to-change-trade-status", userAuth, payToChangeTradeStatus);
router.post("/pay-to-change-trade-status-counter-offer", userAuth, payToChangeTradeStatusCounterOffer);
router.post("/handle-paypal-response", userAuth, handlePayPalResponse);
router.get("/payment-success/:refId/:itemName", payPalPaymentSuccess);
router.get("/payment-cancel/:refId", payPalPaymentCancel);

// Product copy/form routes
router.get("/copy-product-form-fields", userAuth, getCopyProductFormFields);

// Other user routes (must be after specific routes to avoid conflicts)
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;