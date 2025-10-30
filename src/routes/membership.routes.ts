import express from "express";
import { getMemberships, getMembershipById } from "../controllers/membership.controller.js";

const router = express.Router();

// Public: list memberships. Optional query: ?active=false to include inactive
router.get("/", getMemberships);
router.get("/:id", getMembershipById);

export default router;
