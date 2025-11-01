import { Router } from "express";
import { getEarnCreditsList, getEarnCreditsListForUser } from "../controllers/earnCredit.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - accessible without authentication
router.get("/", getEarnCreditsList);

// Authenticated: returns same list but includes is_claim per item for the logged-in user
router.get("/user", userAuth, getEarnCreditsListForUser);

export default router;