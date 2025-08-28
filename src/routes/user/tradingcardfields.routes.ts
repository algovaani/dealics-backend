import { Router } from "express";
import { getTradingCardFields } from "../../controllers/tradingcardfields.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(userAuth);
router.get("/", getTradingCardFields);

export default router;
