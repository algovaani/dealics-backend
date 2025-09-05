import { Router } from "express";
import { getUserProfile, getUserById, updateUser, deleteUser, getMyProfile, getTopTraders, getTradersList, toggleFollow } from "../controllers/user.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Authenticated user profile API (requires token)
router.get("/my-profile", userAuth, getMyProfile);

// Public profile API (no authentication required)
router.get("/profile/:userId", getUserProfile);

// Top traders API (public, no authentication required)
router.get("/top-traders", getTopTraders);

// Traders list API (optional authentication - excludes authenticated user if token provided)
router.get("/traders-list", getTradersList);

// Follow/Unfollow API (requires authentication)
router.post("/follow", userAuth, toggleFollow);

// Other user routes (must be after specific routes to avoid conflicts)
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;