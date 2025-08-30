import { Router } from "express";
import { getActiveSliders } from "../controllers/slider.controller.js";

const router = Router();

router.get("/", getActiveSliders);

export default router;
