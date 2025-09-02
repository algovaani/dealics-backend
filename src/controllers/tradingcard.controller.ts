import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Sequelize, QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { uploadOne, getFileUrl } from "../utils/fileUpload.js";

// Extend Request interface to include files property
interface RequestWithFiles extends Request {
  files?: { [fieldname: string]: any[] };
}

const tradingcardService = new TradingCardService();

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any, pagination?: any) => {
  const response: any = {
    status,
    message,
    data: data || []
  };
  
  // Only add pagination if it's provided
  if (pagination) {
    response.pagination = pagination;
  }
  
  return res.status(statusCode).json(response);
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
    // Get pagination parameters from query
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    const categoryIdParam = req.query.category_id as string;
    const loggedInUserIdParam = req.query.loggedInUserId as string;
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const perPage = perPageParam ? parseInt(perPageParam, 10) : 100;
    const categoryId: number | undefined = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;
    const loggedInUserId: number | undefined = loggedInUserIdParam ? parseInt(loggedInUserIdParam, 10) : undefined;

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return sendApiResponse(res, 400, false, "Page must be a valid number greater than 0", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be a valid number between 1 and 100", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (categoryIdParam && (isNaN(categoryId) || categoryId < 1)) {
      return sendApiResponse(res, 400, false, "Category ID must be a valid positive number", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    const result = await tradingcardService.getAllTradingCards(page, perPage, categoryId || undefined, loggedInUserId);

    // Transform the data - now result.rows contains raw SQL results array
    const tradingCards = (result.rows || []).map((card: any) => {
      const baseResponse = {
        id: card.id,
        category_id: card.category_id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_slug: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param || null,
        sport_name: card.sport_name || null
      };

      // Only add interested_in field if loggedInUserId is provided
      if (loggedInUserId) {
        return {
          ...baseResponse,
          interested_in: Boolean(card.interested_in)
        };
      }

      return baseResponse;
    });

    // Only include pagination if pagination parameters were provided
    const hasPaginationParams = pageParam || perPageParam;
    
    if (hasPaginationParams) {
      return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", tradingCards, {
        current_page: page,
        per_page: perPage,
        total: result.count,
        total_pages: Math.ceil(result.count / perPage),
        has_next_page: page < Math.ceil(result.count / perPage),
        has_prev_page: page > 1
      });
    } else {
      return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", tradingCards);
    }
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
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
 * Populate search parameters for existing trading cards
 * POST /api/tradingcards/populate-search-params
 */
export const populateSearchParams = async (req: Request, res: Response) => {
  try {
    await tradingcardService.populateSearchParams();
    return sendApiResponse(
      res, 
      200, 
      true, 
      "Search parameters populated successfully", 
      { success: true }
    );
  } catch (error: any) {
    console.error("Error populating search parameters:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error");
  }
};

/**
 * Update search parameters for existing trading cards
 * POST /api/tradingcards/update-search-params
 */
export const updateSearchParams = async (req: Request, res: Response) => {
  try {
    const updatedCount = await tradingcardService.updateSearchParamsForExistingCards();
    return sendApiResponse(
      res, 
      200, 
      true, 
      `Updated search parameters for ${updatedCount} trading cards`, 
      { updatedCount }
    );
  } catch (error: any) {
    console.error("Error updating search parameters:", error);
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

// Interested in card API - Add/Remove interest
export const interestedInCard = async (req: Request, res: Response) => {
  try {
    const { card_id } = req.body;
    const userId = req.user?.id;
    // Check if user is authenticated
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Check if card_id is provided
    if (!card_id || isNaN(Number(card_id))) {
      return sendApiResponse(res, 400, false, "Valid Card ID is required", []);
    }

    const cardId = Number(card_id);

    // Get trading card to get trader_id
    const tradingCard = await TradingCard.findByPk(cardId, {
      attributes: ['trader_id']
    });

    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading card not found", []);
    }

    const traderId = tradingCard.trader_id;

    // Check if user already interested in this card
    const existingInterest = await sequelize.query(`
      SELECT id FROM interested_in 
      WHERE trading_card_id = ${cardId} 
      AND trader_id = ${traderId} 
      AND user_id = ${userId}
    `, {
      type: Sequelize.QueryTypes.SELECT
    });

    let action = false;
    let favCounts = 0;

    if (existingInterest && existingInterest.length > 0) {
      // Remove interest (delete record)
      await sequelize.query(`
        DELETE FROM interested_in 
        WHERE trading_card_id = ${cardId} 
        AND trader_id = ${traderId} 
        AND user_id = ${userId}
      `, {
        type: Sequelize.QueryTypes.DELETE
      });

      action = false; // Removed
    } else {
      // Add interest (insert record)
      await sequelize.query(`
        INSERT INTO interested_in (trading_card_id, trader_id, user_id, created_at) 
        VALUES (${cardId}, ${traderId}, ${userId}, NOW())
      `, {
        type: Sequelize.QueryTypes.INSERT
      });

      action = true; // Added
    }

    // Get updated favorite count
    const favCountResult = await sequelize.query(`
      SELECT COUNT(*) as count FROM interested_in WHERE user_id = ${userId}
    `, {
      type: Sequelize.QueryTypes.SELECT
    });

    favCounts = favCountResult[0]?.count || 0;

    return sendApiResponse(res, 200, true, "Interest updated successfully", {
      action: action, 
      fav_counts: favCounts
    });

  } catch (error: any) {
    console.error('Interested in card error:', error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};