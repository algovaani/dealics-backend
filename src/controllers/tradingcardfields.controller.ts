import { Request, Response } from "express";
import { TradingCard } from "../models/tradingcard.model.js";

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
  });
};

export const getTradingCardFields = async (req: Request, res: Response) => {
  try {
    // Example: Only allow access if user is authenticated
    if (!req.user) {
      return sendApiResponse(res, 401, false, "Unauthorized", []);
    }

    // Get all field names from TradingCard model
    const fields = Object.keys(TradingCard.getAttributes());
    return sendApiResponse(res, 200, true, "Trading card fields retrieved successfully", [{ fields }]);
  } catch (error: any) {
    console.error("Error getting trading card fields:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
