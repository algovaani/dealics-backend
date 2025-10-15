import { Router } from "express";
import { getBlockByAlias } from "../controllers/block.controller.js";
import { noCache } from "../middlewares/noCache.middleware.js";

const router = Router();

// Public: no auth
router.use(noCache);
router.get("/:alias", getBlockByAlias);

export default router;


