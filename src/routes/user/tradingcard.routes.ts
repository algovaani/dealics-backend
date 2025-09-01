import { Router } from "express";
import { 
  getTradingCards, 
  getTradingCard, 
  getTradingCardsByCategoryName, 
  getMyTradingCardsByCategory, 
  getFormFieldsByCategory, 
  saveTradingCard,
  updateTradingCard
} from "../../controllers/tradingcard.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../utils/fileUpload.js";

const router = Router();

console.log("🔧 Registering user trading card routes...");

router.use(userAuth);

// Define specific routes first (before catch-all)
router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/my-products/:categoryName", getMyTradingCardsByCategory);
router.get("/form-fields/:categorySlug", getFormFieldsByCategory);
router.get("/form-fields/trading-cards", getFormFieldsByCategory);
router.post("/save/:categoryId", saveTradingCard);
router.patch("/:cardId", upload.fields([
  { name: 'trading_card_img', maxCount: 1 },
  { name: 'trading_card_img_back', maxCount: 1 },
  { name: 'icon1', maxCount: 1 },
  { name: 'icon2', maxCount: 1 },
  { name: 'icon3', maxCount: 1 },
  { name: 'icon4', maxCount: 1 }
]), (req: any, res: any) => updateTradingCard(req, res));

// Catch-all route must be last
router.get("/:id", getTradingCard);

console.log("  ✅ All routes registered successfully");

export default router;
