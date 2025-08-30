import { Router } from "express";
import { getCategoryFields } from "../../controllers/categoryfields.controller.js";
import { userAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(userAuth);
router.get("/", getCategoryFields);

export default router;
