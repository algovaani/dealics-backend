import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category } from "../models/category.model.js";
import { Sequelize } from "sequelize";

const tradingcardService = new TradingCardService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Get trading cards by category name
export const getTradingCardsByCategoryName = async (req: Request, res: Response) => {
  try {
    const { categoryName } = req.params;
    const loggedInUserId = req.user?.id;

    if (!categoryName) {
      return sendApiResponse(res, 400, false, "Category name (slug) is required");
    }

    // Use slug for category lookup
    const cards = await tradingcardService.getTradingCardsByCategoryId(categoryName, loggedInUserId);
    
    if (!cards || cards.length === 0) {
      return sendApiResponse(res, 404, false, "Category not found or no trading cards");
    }

    return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", cards);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const getTradingCards = async (req: Request, res: Response) => {
  try {
    const TradingCards = await tradingcardService.getAllTradingCards();
    return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", TradingCards);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const getTradingCard = async (req: Request, res: Response) => {
  try {
    const TradingCard = await tradingcardService.getTradingCardById(Number(req.params.id));
    
    if (!TradingCard) {
      return sendApiResponse(res, 404, false, "Trading Card not found");
    }
    
    return sendApiResponse(res, 200, true, "Trading card retrieved successfully", TradingCard);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const createTradingCard = async (req: Request, res: Response) => {
  try {
    // Implementation for creating trading card
    return sendApiResponse(res, 501, false, "Create trading card not implemented yet");
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const updateTradingCard = async (req: Request, res: Response) => {
  try {
    // Implementation for updating trading card
    return sendApiResponse(res, 501, false, "Update trading card not implemented yet");
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const deleteTradingCard = async (req: Request, res: Response) => {
  try {
    const success = await tradingcardService.deleteTradingCard(Number(req.params.id));
    
    if (!success) {
      return sendApiResponse(res, 404, false, "Trading Card not found");
    }
    
    return sendApiResponse(res, 200, true, "Trading Card deleted successfully");
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

// GET /user/tradingcards/my-products/:categoryName?page=1&perPage=9
export const getMyTradingCardsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryName } = req.params;
    const userId = req.user?.id as number | undefined;
    const page = parseInt((req.query.page as string) || "1", 10);
    const perPage = parseInt((req.query.perPage as string) || "9", 10);

    if (!userId) {
      return sendApiResponse(res, 401, false, "Unauthorized");
    }
    
    if (!categoryName) {
      return sendApiResponse(res, 400, false, "Category slug is required");
    }

    const { rows, count } = await tradingcardService.getMyTradingCardsByCategorySlug(categoryName, userId, page, perPage);

    // Stag-like data: categories available for this user
    // If category is "all", return all categories, otherwise return user's categories
    let stagDatas;
    if (categoryName === "all") {
      // Get all categories when showing all products
      const allCategories = await Category.findAll({
        where: { sport_status: "1" },
        order: [["sport_name", "ASC"]],
        attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug", "sport_icon"],
      });
      stagDatas = allCategories.map((c: any) => c.toJSON());
    } else {
      // Get categories filtered by user's active cards
      stagDatas = await tradingcardService.getCategoriesForUser(userId);
    }

    const payload = {
      tradingcards: rows,
      pagination: {
        page,
        perPage,
        total: count,
        totalPages: Math.ceil(count / perPage),
      },
      StagFilterForAllCategory: true,
      MyCards: true,
      stagDatas,
      stag_url_trader: "my-products/",
    };

    return sendApiResponse(res, 200, true, "My trading cards retrieved successfully", payload);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

// GET /user/tradingcards/form-fields/:categorySlug
export const getFormFieldsByCategory = async (req: Request, res: Response) => {
  try {
    let { categorySlug } = req.params;
    
    // If no category slug provided (for the specific route), use a default
    if (!categorySlug) {
      // You can set a default category slug here, or return an error
      // For now, let's use 'trading-cards' as default
      categorySlug = 'trading-cards';
    }
    
    if (!categorySlug) {
      return sendApiResponse(res, 400, false, "Category slug is required");
    }

    const formFields = await tradingcardService.getFormFieldsByCategory(categorySlug);
    
    if (!formFields) {
      return sendApiResponse(res, 404, false, "Category not found");
    }

    return sendApiResponse(res, 200, true, "Form fields retrieved successfully", formFields);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};
