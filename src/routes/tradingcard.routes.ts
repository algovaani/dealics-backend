import { Router } from "express";
import { getTradingCards, getTradingCard, getTradingCardsByCategoryName } from "../controllers/tradingcard.controller.js";

const router = Router();

router.get("/", getTradingCards);
router.get("/by-category/:categoryName", getTradingCardsByCategoryName);
router.get("/:id", getTradingCard);
// router.post("/", createTradingCard);
// router.put("/:id", updateTradingCard);
// router.delete("/:id", deleteTradingCard);

export default router;