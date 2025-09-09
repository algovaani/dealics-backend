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
  getPublicProfileTradingCards,
  getPopularTradingCards,
  mainSearch,
  getSimilarTradingCards,
  deleteTradingCard,
  toggleTradingCardDeleteStatus
} from "../controllers/tradingcard.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getTradingCards);
router.get("/popularTradingCards", getPopularTradingCards);
router.get("/similar-trading-cards", getSimilarTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/public-profile", getPublicProfileTradingCards);
router.get("/card-conditions", getAllCardConditions);
router.get("/card-conditions/:id", getCardConditionById);
router.post("/update-search-params", updateSearchParams);
router.post("/populate-search-params", populateSearchParams);
router.post("/interested-in-card", userAuth, interestedInCard);
router.post("/main-search", mainSearch);
router.get("/:id", getTradingCard);
// router.post("/", createTradingCard);
// router.put("/:id", updateTradingCard);
router.delete("/:id", userAuth, deleteTradingCard);
router.patch("/:id", userAuth, toggleTradingCardDeleteStatus);

export default router;