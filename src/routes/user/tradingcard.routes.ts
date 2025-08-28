import { Router } from "express";
import { getTradingCards, getTradingCard, getTradingCardsByCategoryName } from "../../controllers/tradingcard.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(userAuth);

router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/:id", getTradingCard);
// Add more user-only trading card routes here

export default router;
