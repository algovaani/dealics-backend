import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category } from "../models/category.model.js";

const tradingcardService = new TradingCardService();
// Get trading cards by category name
export const getTradingCardsByCategoryName = async (req: Request, res: Response) => {
  try {
    const { categoryName } = req.params;
    const loggedInUserId = req.user?.id;

    if (!categoryName) return res.status(400).json({ message: "Category name (slug) is required" });

    // Use slug for category lookup
  const cards = await tradingcardService.getTradingCardsByCategoryId(categoryName, loggedInUserId);
    if (!cards || cards.length === 0) return res.status(404).json({ message: "Category not found or no trading cards" });

    res.json(cards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const getTradingCards = async (req: Request, res: Response) => {
  const TradingCards = await tradingcardService.getAllTradingCards();
  res.json(TradingCards);
};

export const getTradingCard = async (req: Request, res: Response) => {
  const TradingCards = await tradingcardService.getTradingCardById(Number(req.params.id));
  if (!TradingCards) return res.status(404).json({ message: "Trading Card not found" });
  res.json(TradingCards);
};

export const createTradingCard = async (req: Request, res: Response) => {
//   const { name, email } = req.body;
//   const TradingCards = await tradingcardService.createTradingCard(name, email);
//   res.status(201).json(TradingCards);
};

export const updateTradingCard = async (req: Request, res: Response) => {
//   const { name, email } = req.body;
//   const TradingCards = await tradingcardService.updateTradingCard(Number(req.params.id), name, email);
//   if (!TradingCards) return res.status(404).json({ message: "Trading Card not found" });
//   res.json(TradingCards);
};

export const deleteTradingCard = async (req: Request, res: Response) => {
  const success = await tradingcardService.deleteTradingCard(Number(req.params.id));
  if (!success) return res.status(404).json({ message: "Trading Card not found" });
  res.json({ message: "Trading Card deleted" });
};
