import { Router } from "express";
import { 
  createSupportTicket, 
  getMySupportTickets, 
  getAllSupportTickets, 
  updateSupportTicketStatus 
} from "../controllers/support.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";
import { adminAuth } from "../middlewares/admin.middleware.js";

const router = Router();

/**
 * Support Routes
 */

// Create support ticket (optional auth - will extract user_id if token provided)
router.post("/create", userAuth, createSupportTicket);

// Get user's own support tickets (auth required)
router.get("/my-tickets", userAuth, getMySupportTickets);

// Get all support tickets (admin only)
router.get("/all", userAuth, adminAuth, getAllSupportTickets);

// Update support ticket status (admin only)
router.patch("/:ticketId/status", userAuth, adminAuth, updateSupportTicketStatus);

export default router;
