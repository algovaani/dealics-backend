import { Request, Response } from "express";
import { SupportService } from "../services/support.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        user_id?: number;
        sub?: number;
        first_name?: string;
        last_name?: string;
        email?: string;
        user_name?: string;
        user_role?: string;
      };
    }
  }
}

const supportService = new SupportService();

/**
 * Create a new support ticket
 * POST /api/support/create
 */
export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    // Validation
    const { first_name, last_name, email, subject, comment } = req.body;

    // Required field validation
    if (!first_name || !first_name.trim()) {
      return sendApiResponse(res, 400, false, "Please enter first name.");
    }

    if (!last_name || !last_name.trim()) {
      return sendApiResponse(res, 400, false, "Please enter last name.");
    }

    if (!email || !email.trim()) {
      return sendApiResponse(res, 400, false, "Please enter email.");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendApiResponse(res, 400, false, "Please enter a valid email address.");
    }

    if (!subject || !subject.trim()) {
      return sendApiResponse(res, 400, false, "Please enter subject.");
    }

    if (!comment || !comment.trim()) {
      return sendApiResponse(res, 400, false, "Please enter comment.");
    }

    // Get user ID if authenticated
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    console.log('DEBUG: Support API - User object:', req.user);
    console.log('DEBUG: Support API - Extracted user_id:', userId);

    // Prepare support data
    const supportData: {
      first_name: string;
      last_name: string;
      email: string;
      subject: string;
      comment: string;
      user_id?: number;
    } = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      comment: comment.trim()
    };

    // Add user_id only if it exists
    if (userId) {
      supportData.user_id = userId;
    }

    // Create support ticket
    const result = await supportService.createSupportTicket(supportData);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to create support ticket");
    }

    return sendApiResponse(
      res,
      201,
      true,
      "Support request sent successfully! We will get back to you as soon as possible.",
      result.data
    );

  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};

/**
 * Get user's support tickets
 * GET /api/support/my-tickets
 */
export const getMySupportTickets = async (req: Request, res: Response) => {
  try {
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated");
    }

    const result = await supportService.getSupportTicketsByUserId(userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to fetch support tickets");
    }

    return sendApiResponse(
      res,
      200,
      true,
      "Support tickets retrieved successfully",
      result.data
    );

  } catch (error: any) {
    console.error("Error fetching support tickets:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};

/**
 * Get all support tickets (Admin only)
 * GET /api/support/all
 */
export const getAllSupportTickets = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userRole = req.user?.user_role;
    if (userRole !== 'admin') {
      return sendApiResponse(res, 403, false, "Access denied. Admin privileges required.");
    }

    const result = await supportService.getAllSupportTickets();

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to fetch support tickets");
    }

    return sendApiResponse(
      res,
      200,
      true,
      "All support tickets retrieved successfully",
      result.data
    );

  } catch (error: any) {
    console.error("Error fetching all support tickets:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};

/**
 * Update support ticket status (Admin only)
 * PATCH /api/support/:ticketId/status
 */
export const updateSupportTicketStatus = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userRole = req.user?.user_role;
    if (userRole !== 'admin') {
      return sendApiResponse(res, 403, false, "Access denied. Admin privileges required.");
    }

    const { ticketId } = req.params;
    const { status } = req.body;

    // Validate ticket ID
    if (!ticketId || isNaN(parseInt(ticketId))) {
      return sendApiResponse(res, 400, false, "Invalid ticket ID");
    }

    // Validate status
    const validStatuses = ['New', 'Resolved', 'On Hold'];
    if (!status || !validStatuses.includes(status)) {
      return sendApiResponse(res, 400, false, "Invalid status. Must be one of: New, Resolved, On Hold");
    }

    const result = await supportService.updateSupportTicketStatus(parseInt(ticketId), status);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to update support ticket status");
    }

    return sendApiResponse(
      res,
      200,
      true,
      "Support ticket status updated successfully",
      result.data
    );

  } catch (error: any) {
    console.error("Error updating support ticket status:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};
