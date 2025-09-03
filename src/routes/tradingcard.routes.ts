import { Router } from "express";
import { 
  getTradingCards, 
  getTradingCard, 
  getTradingCardsByCategoryName,
  getAllCardConditions,
  getCardConditionById,
  updateSearchParams,
  populateSearchParams,
  interestedInCard,
  getPublicProfileTradingCards
} from "../controllers/tradingcard.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/public-profile", getPublicProfileTradingCards);
router.get("/card-conditions", getAllCardConditions);
router.get("/card-conditions/:id", getCardConditionById);
router.post("/update-search-params", updateSearchParams);
router.post("/populate-search-params", populateSearchParams);
router.post("/interested-in-card", userAuth, interestedInCard);
router.get("/:id", getTradingCard);
// router.post("/", createTradingCard);
// router.put("/:id", updateTradingCard);
// router.delete("/:id", deleteTradingCard);

export default router;