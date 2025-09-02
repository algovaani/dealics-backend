import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Sequelize } from "sequelize";
import { uploadOne, getFileUrl } from "../utils/fileUpload.js";

// Extend Request interface to include files property
interface RequestWithFiles extends Request {
  files?: { [fieldname: string]: any[] };
}

const tradingcardService = new TradingCardService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any) => {
  return res.status(statusCode).json({
    status,
    message,
    data: data || []
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

// GET /api/tradingCards/card-conditions - Get all card conditions
export const getAllCardConditions = async (req: Request, res: Response) => {
  try {
    const cardConditions = await tradingcardService.getAllCardConditions();
    return sendApiResponse(res, 200, true, "Card conditions retrieved successfully", cardConditions);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

// GET /api/tradingCards/card-conditions/:id - Get card condition by ID
export const getCardConditionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return sendApiResponse(res, 400, false, "Card condition ID is required");
    }

    const cardCondition = await tradingcardService.getCardConditionById(Number(id));
    
    if (!cardCondition) {
      return sendApiResponse(res, 404, false, "Card condition not found");
    }

    return sendApiResponse(res, 200, true, "Card condition retrieved successfully", cardCondition);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

/**
 * Save trading card with master data processing (equivalent to Laravel saveProductData)
 * POST /api/user/tradingcards/save/:categoryId
 */
export const saveTradingCard = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const requestData = req.body;
    
    // Get user from auth middleware (assuming you have auth middleware)
    const user = (req as any).user;
    if (!user || !user.id) {
      return sendApiResponse(res, 401, false, "User not authenticated");
    }

    // Validate categoryId
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return sendApiResponse(res, 400, false, "Invalid category ID");
    }

    const categoryIdNum = parseInt(categoryId);
    const userId = user.id;

    // Call service to save trading card
    const result = await tradingcardService.saveTradingCard(requestData, categoryIdNum, userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to save trading card");
    }

    return sendApiResponse(
      res, 
      201, 
      true, 
      "Trading card saved successfully", 
      result.data
    );

  } catch (error: any) {
    console.error("Error saving trading card:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};

/**
 * Update trading card (equivalent to Laravel update_trade_card)
 * PATCH /api/user/tradingcards/:cardId
 */
export const updateTradingCard = async (req: RequestWithFiles, res: Response) => {
  try {
    const { cardId } = req.params;
    const requestData = req.body;
    
    // Get user from auth middleware
    const user = req.user;
    if (!user || !user.id) {
      return sendApiResponse(res, 401, false, "User not authenticated");
    }

    // Validate cardId
    if (!cardId || isNaN(parseInt(cardId))) {
      return sendApiResponse(res, 400, false, "Valid card ID is required");
    }

    const cardIdNum = parseInt(cardId);
    const userId = user.id;

    // Find the trading card
    const tradingCard = await TradingCard.findByPk(cardIdNum);
    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading card not found");
    }

    // Check if user owns this card
    if (tradingCard.trader_id !== userId) {
      return sendApiResponse(res, 403, false, "You don't have permission to update this card");
    }

    // Handle file uploads
    const uploadPath = process.cwd() + '/public/user/assets/images/trading_cards_img/';
    
    // Process main card images
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files.trading_card_img && files.trading_card_img[0]) {
        requestData.trading_card_img = uploadOne(files.trading_card_img[0] as any, uploadPath);
      }
      
      if (files.trading_card_img_back && files.trading_card_img_back[0]) {
        requestData.trading_card_img_back = uploadOne(files.trading_card_img_back[0] as any, uploadPath);
      }
      
      // Process additional card images
      if (files.icon1 && files.icon1[0]) {
        requestData.icon1 = uploadOne(files.icon1[0] as any, uploadPath);
      }
      if (files.icon2 && files.icon2[0]) {
        requestData.icon2 = uploadOne(files.icon2[0] as any, uploadPath);
      }
      if (files.icon3 && files.icon3[0]) {
        requestData.icon3 = uploadOne(files.icon3[0] as any, uploadPath);
      }
      if (files.icon4 && files.icon4[0]) {
        requestData.icon4 = uploadOne(files.icon4[0] as any, uploadPath);
      }
    }

    // Call service to update trading card
    const result = await tradingcardService.updateTradingCard(cardIdNum, requestData, userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to update trading card");
    }

    return sendApiResponse(
      res, 
      200, 
      true, 
      "Trading card updated successfully", 
      result.data
    );

  } catch (error: any) {
    console.error("Error updating trading card:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};