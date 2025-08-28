import { Router } from "express";
import { getTradingCards, getTradingCard, getTradingCardsByCategoryName } from "../../controllers/tradingcard.controller.js";
import { adminAuth } from "../../middlewares/admin.middleware.js";

const router = Router();

router.use(adminAuth);

router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/:id", getTradingCard);
// Add more admin-only trading card routes here

export default router;
