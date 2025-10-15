import { Router } from "express";
import { 
  getTradingCards, 
  getUserTradingCards,
  getTradingCard,
  getUserTradingCard, 
  getTradingCardsByCategoryName, 
  getMyTradingCardsByCategory, 
  getFormFieldsByCategory, 
  saveTradingCard,
  updateTradingCard,
  updateTradingCardStatus,
  deleteTradingCard,
  getDeletedTradingCards
} from "../../controllers/tradingcard.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";
import { noCache } from "../../middlewares/noCache.middleware.js";
import { upload } from "../../utils/fileUpload.js";

const router = Router();
router.use(noCache);


router.use(userAuth);

// Define specific routes first (before catch-all)
router.get("/", getUserTradingCards);
router.get("/deleted", getDeletedTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/my-products/:categoryName", getMyTradingCardsByCategory);
router.get("/form-fields/:categorySlug", getFormFieldsByCategory);
router.get("/form-fields/trading-cards", getFormFieldsByCategory);
router.post("/save/:categoryId", upload.fields([
  { name: 'trading_card_img', maxCount: 1 },
  { name: 'trading_card_img_back', maxCount: 1 },
  { name: 'additional_images', maxCount: 10 }
]), (req: any, res: any) => saveTradingCard(req, res));
router.put("/:cardId", upload.fields([
  { name: 'trading_card_img', maxCount: 1 },
  { name: 'trading_card_img_back', maxCount: 1 },
  { name: 'additional_images', maxCount: 10 }
]), (req: any, res: any) => updateTradingCard(req, res));

// Update trading card status (on/off switch)
router.put("/:cardId/status", userAuth, updateTradingCardStatus);

router.delete("/:id", deleteTradingCard);

// Catch-all route must be last
router.get("/:id", getUserTradingCard);


export default router;
