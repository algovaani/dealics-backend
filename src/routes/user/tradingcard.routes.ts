import { Router } from "express";
import { getTradingCards, getTradingCard, getTradingCardsByCategoryName, getMyTradingCardsByCategory, getFormFieldsByCategory } from "../../controllers/tradingcard.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(userAuth);

router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/my-products/:categoryName", getMyTradingCardsByCategory);
router.get("/form-fields/:categorySlug", getFormFieldsByCategory);
router.get("/form-fields/trading-cards", getFormFieldsByCategory); // Specific route for trading-cards
router.get("/:id", getTradingCard);
// Add more user-only trading card routes here

export default router;
