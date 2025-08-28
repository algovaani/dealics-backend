import { Request, Response } from "express";
import { TradingCard } from "../models/tradingcard.model.js";

export const getTradingCardFields = async (req: Request, res: Response) => {
  // Example: Only allow access if user is authenticated
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  // Get all field names from TradingCard model
  const fields = Object.keys(TradingCard.getAttributes());
  res.json({ fields });
};
