import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category, TradingCard, BuyOfferAttempt, CategoryField, ItemColumn } from "../models/index.js";
import { Sequelize, QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { uploadOne, getFileUrl } from "../utils/fileUpload.js";
import jwt from "jsonwebtoken";
import { decodeJWTToken } from "../utils/jwt.js";
// import { sendApiResponse } from "../utils/apiResponse.js"; // Already defined locally

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
    const { page, perPage } = req.query;
    
    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in getTradingCardsByCategoryName API:', jwtError);
      }
    }

    if (!categoryName) {
      return sendApiResponse(res, 400, false, "Category name (slug) is required");
    }

    // Get pagination parameters
    const pageNumber = page ? parseInt(String(page)) : 1;
    const perPageNumber = perPage ? parseInt(String(perPage)) : 10;

    // Validate pagination parameters
    if (pageNumber < 1 || perPageNumber < 1 || perPageNumber > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters");
    }

    // Use slug for category lookup
    const result = await tradingcardService.getTradingCardsByCategoryId(categoryName, authenticatedUserId, pageNumber, perPageNumber);
    
    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", result.data.cards, result.data.pagination);
    } else {
      return sendApiResponse(res, 404, false, result.error?.message || "Category not found or no trading cards");
    }
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const getUserTradingCards = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters from query
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    const categoryIdParam = (req.query.categoryId || req.query.category_id) as string;
    const gradedParam = req.query.graded as string;
    
    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in trading cards API:', jwtError);
      }
    }
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const perPage = perPageParam ? parseInt(perPageParam, 10) : 100;
    const categoryId: number | undefined = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;
    const graded: string | undefined = gradedParam;
    const loggedInUserId: number | undefined = authenticatedUserId;

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return sendApiResponse(res, 400, false, "Page must be a valid number greater than 0", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be a valid number between 1 and 100", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (categoryIdParam) {
      if (categoryId === undefined || isNaN(categoryId) || categoryId < 1) {
        return sendApiResponse(
          res,
          400,
          false,
          "Category ID must be a valid positive number",
          [],
          {
            current_page: 1,
            per_page: 100,
            total: 0,
            total_pages: 0,
            has_next_page: false,
            has_prev_page: false
          }
        );
      }
    }

    // Use the original method for user's own cards
    const result = await tradingcardService.getAllTradingCards(
      page,
      perPage,
      categoryId,
      loggedInUserId
    );

    // Transform the data - result.data contains the trading cards array
    const tradingCards = (result.data || []).map((card: any) => {
      // Add canTradeOrOffer logic
      let canTradeOrOffer = true;
      
      // If loggedInUserId is provided and matches the card's trader_id, user can't trade with themselves
      if (loggedInUserId && card.trader_id === loggedInUserId) {
        canTradeOrOffer = false;
      }
      
      // If card is already traded, user can't trade
      if (card.is_traded === '1') {
        canTradeOrOffer = false;
      }
      
      // If can_buy and can_trade are both 0, user can't trade or make offers
      if (card.can_buy === 0 && card.can_trade === 0) {
        canTradeOrOffer = false;
      }

      const baseResponse = {
        id: card.id,
        category_id: card.category_id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_slug: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param || null,
        sport_name: card.sport_name,
        sport_icon: card.sport_icon,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        creator_id: card.creator_id,
        is_traded: card.is_traded,
        can_trade: card.can_trade,
        can_buy: card.can_buy,
        trading_card_status: card.trading_card_status,
        interested_in: card.interested_in || false,
        trade_card_status: card.trade_card_status,
        card_condition: card.card_condition || null,
        canTradeOrOffer: canTradeOrOffer,
        trader: {
          first_name: card.first_name,
          last_name: card.last_name,
          username: card.username,
          profile_image: card.profile_image,
          verified_status: card.verified_status,
          rating: card.rating,
          total_reviews: card.total_reviews,
          location: card.location,
          country: card.country,
          state: card.state,
          city: card.city,
          zip_code: card.zip_code,
          phone_number: card.phone_number,
          email: card.email,
          created_at: card.user_created_at,
          updated_at: card.user_updated_at
        },
        created_at: card.created_at,
        updated_at: card.updated_at
      };

      return baseResponse;
    });

    // Only include pagination if pagination parameters were provided
    const hasPaginationParams = pageParam || perPageParam;
    
    if (hasPaginationParams) {
      return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", tradingCards, {
        current_page: page,
        per_page: perPage,
        total: result.count || 0,
        total_pages: Math.ceil((result.count || 0) / perPage),
        has_next_page: page < Math.ceil((result.count || 0) / perPage),
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

export const getTradingCards = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters from query
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    const categoryIdParam = (req.query.categoryId || req.query.category_id) as string;
    const gradedParam = req.query.graded as string;
    
    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in trading cards API:', jwtError);
      }
    }
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const perPage = perPageParam ? parseInt(perPageParam, 10) : 100;
    const categoryId: number | undefined = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;
    const graded: string | undefined = gradedParam;
    const loggedInUserId: number | undefined = authenticatedUserId;

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return sendApiResponse(res, 400, false, "Page must be a valid number greater than 0", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be a valid number between 1 and 100", [], { current_page: 1, per_page: 100, total: 0, total_pages: 0, has_next_page: false, has_prev_page: false });
    }

    if (categoryIdParam) {
      if (categoryId === undefined || isNaN(categoryId) || categoryId < 1) {
        return sendApiResponse(
          res,
          400,
          false,
          "Category ID must be a valid positive number",
          [],
          {
            current_page: 1,
            per_page: 100,
            total: 0,
            total_pages: 0,
            has_next_page: false,
            has_prev_page: false
          }
        );
      }
    }

    // Use the new method that excludes user's own cards
    const result = await tradingcardService.getAllTradingCardsExceptOwn(
      page,
      perPage,
      categoryId,
      loggedInUserId,
      graded
    );

    // Transform the data - result.data contains the trading cards array
    const tradingCards = (result.data || []).map((card: any) => {
      // Add canTradeOrOffer logic
      let canTradeOrOffer = true;
      
      // If loggedInUserId is provided and matches the card's trader_id, user can't trade with themselves
      if (loggedInUserId && card.trader_id === loggedInUserId) {
        canTradeOrOffer = false;
      }
      
      // If card is already traded, user can't trade
      if (card.is_traded === '1') {
        canTradeOrOffer = false;
      }
      
      // If can_buy and can_trade are both 0, user can't trade or make offers
      if (card.can_buy === 0 && card.can_trade === 0) {
        canTradeOrOffer = false;
      }

      const baseResponse = {
        id: card.id,
        category_id: card.category_id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_slug: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param || null,
        sport_name: card.sport_name || null,
        sport_icon: card.sport_icon || null,
        trade_card_status: card.trade_card_status || null,
        trader_id: card.trader_id || null,
        trader_name: card.trader_name || null,
        card_condition: card.card_condition || null,
        graded: card.graded || '0',
        canTradeOrOffer: canTradeOrOffer
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
        total: result.count || 0,
        total_pages: Math.ceil((result.count || 0) / perPage),
        has_next_page: page < Math.ceil((result.count || 0) / perPage),
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
    // Validate the ID parameter
    const cardId = Number(req.params.id);
    if (!req.params.id || isNaN(cardId) || cardId <= 0) {
      return sendApiResponse(res, 400, false, "Valid trading card ID is required");
    }
    
    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in getTradingCard API:', jwtError);
      }
    }
    
    console.log("Controller - cardId:", cardId);
    console.log("Controller - authenticatedUserId:", authenticatedUserId);
    
    const result = await tradingcardService.getTradingCardById(cardId, authenticatedUserId);
    
    if (!result) {
      return sendApiResponse(res, 404, false, "Trading Card not found");
    }
    
    const { tradingCard, additionalFields, cardImages, canTradeOrOffer, interested_in } = result;
    
    // Get offer attempts count for authenticated user
    let offerLimitText = null;
    if (authenticatedUserId) {
      // Check if user is trying to view their own card
      if (authenticatedUserId === tradingCard.trader_id) {
        offerLimitText = null; // No limit for own cards
      } else {
        const buyOfferAttempt = await BuyOfferAttempt.findOne({
          where: {
            user_id: authenticatedUserId,
            product_id: tradingCard.id
          }
        });

        // Get actual attempts count from database
        let attemptsCount = 0;
        if (buyOfferAttempt) {
          attemptsCount = buyOfferAttempt.attempts || 0;
        }
        
        console.log('=== OFFER LIMIT DEBUG ===');
        console.log('BuyOfferAttempt found:', !!buyOfferAttempt);
        console.log('Attempts count from DB:', attemptsCount);
        
        // Calculate remaining attempts
        let remainingAttempts = 3 - attemptsCount;
        
        console.log('Remaining attempts calculated:', remainingAttempts);
        
        // Ensure remaining attempts is not negative
        if (remainingAttempts < 0) {
          remainingAttempts = 0;
        }
        
        console.log('Final remaining attempts:', remainingAttempts);
        console.log('=== END DEBUG ===');

        // Generate offer limit text based on attempts count
        // Show used attempts out of total 3
        if (attemptsCount === 0) {
          offerLimitText = "Offer Limit: 0/3";
        } else if (attemptsCount === 1) {
          offerLimitText = "Offer Limit: 1/3";
        } else if (attemptsCount === 2) {
          offerLimitText = "Offer Limit: 2/3";
        } else if (attemptsCount >= 3) {
          offerLimitText = "Offer Limit: Exceeded, buy at asking price.";
        }

        console.log('Final offer limit text:', offerLimitText);
      }
    }
    
    // Transform the response to include trader_name
    const transformedCard = {
      id: tradingCard.id,
      code: tradingCard.code,
      trading_card_status: tradingCard.trading_card_status,
      category_id: tradingCard.category_id,
      search_param: tradingCard.search_param,
      trading_card_slug: tradingCard.trading_card_slug,
      is_traded: tradingCard.is_traded,
      created_at: tradingCard.createdAt,
      is_demo: tradingCard.is_demo,
      trader_id: tradingCard.trader_id,
      trader_name: tradingCard.trader ? tradingCard.trader.username : null,
      trading_card_asking_price: tradingCard.trading_card_asking_price,
      trading_card_estimated_value: tradingCard.trading_card_estimated_value,
      trading_card_recent_sell_link: tradingCard.trading_card_recent_sell_link,
      trading_card_recent_trade_value: tradingCard.trading_card_recent_trade_value,
      can_trade: tradingCard.can_trade,
      can_buy: tradingCard.can_buy,
      // Add all non-null additional fields from trading card
      additionalFields: additionalFields,
      // Add card images data (now includes trading_card_img and trading_card_img_back)
      cardImages: cardImages,
      // Add can trade or offer parameter
      canTradeOrOffer: canTradeOrOffer,
      // Add interested_in status
      interested_in: interested_in,
      // Add offer limit text for authenticated users
      offer_limit_text: offerLimitText,
      // Add eBay link search parameter
      ebayLinkSearch: tradingCard.search_param ? 
        `https://www.ebay.com/sch/i.html?_nkw=${tradingCard.search_param.replace(/\s+/g, '+')}&rt=nc&LH_Complete=1&LH_Sold=1` : 
        null
    };
    
    return sendApiResponse(res, 200, true, "Trading card retrieved successfully", transformedCard);
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
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate the ID parameter
    const cardId = Number(req.params.id);
    if (!req.params.id || isNaN(cardId) || cardId <= 0) {
      return sendApiResponse(res, 400, false, "Valid trading card ID is required", []);
    }
    
    // Check if the trading card belongs to the authenticated user
    const tradingCard = await TradingCard.findByPk(cardId);
    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading Card not found", []);
    }
    
    // Check if user owns this trading card (either as creator or trader)
    if (tradingCard.creator_id !== userId && tradingCard.trader_id !== userId) {
      return sendApiResponse(res, 403, false, "You can only delete your own trading cards", []);
    }
    
    const success = await tradingcardService.deleteTradingCard(cardId);
    
    if (!success) {
      return sendApiResponse(res, 500, false, "Failed to delete trading card", []);
    }
    
    return sendApiResponse(res, 200, true, "Trading Card deleted successfully", []);
  } catch (error: any) {
    console.error("Delete trading card error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// DELETE/RESTORE Trading Card - Toggle delete status based on query parameter
export const toggleTradingCardDeleteStatus = async (req: Request, res: Response) => {
  try {
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate the ID parameter
    const cardId = Number(req.params.id);
    if (!req.params.id || isNaN(cardId) || cardId <= 0) {
      return sendApiResponse(res, 400, false, "Valid trading card ID is required", []);
    }

    // Get action parameter from query
    const action = req.query.action as string;
    if (!action || !['delete', 'restore'].includes(action)) {
      return sendApiResponse(res, 400, false, "Action parameter is required. Use 'delete' or 'restore'", []);
    }
    
    // Check if the trading card exists
    const tradingCard = await TradingCard.findByPk(cardId);
    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading Card not found", []);
    }
    
    // Check if user owns this trading card (either as creator or trader)
    if (tradingCard.creator_id !== userId && tradingCard.trader_id !== userId) {
      return sendApiResponse(res, 403, false, "You can only modify your own trading cards", []);
    }
    
    // Update the mark_as_deleted status based on action
    if (action === 'delete') {
      await tradingCard.update({ mark_as_deleted: 1 });
      return sendApiResponse(res, 200, true, "Trading Card deleted successfully", []);
    } else if (action === 'restore') {
      await tradingCard.update({ mark_as_deleted: null });
      return sendApiResponse(res, 200, true, "Trading Card restored successfully", []);
    }
    
  } catch (error: any) {
    console.error("Toggle trading card delete status error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/user/tradingcards/deleted - Get deleted trading cards for authenticated user
export const getDeletedTradingCards = async (req: Request, res: Response) => {
  try {
    // Use common JWT token decoding utility
    const jwtResult = decodeJWTToken(req, res);
    if (!jwtResult.success) {
      return sendApiResponse(res, 401, false, jwtResult.error!, []);
    }

    const userId = jwtResult.userId!;
    
    console.log('🔍 getDeletedTradingCards controller - userId from JWT:', userId);

    // Get pagination parameters from query
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    const categoryIdParam = (req.query.categoryId || req.query.category_id) as string;
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const perPage = perPageParam ? parseInt(perPageParam, 10) : 100;
    const categoryId: number | undefined = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return sendApiResponse(res, 400, false, "Page must be a valid number greater than 0", [], { 
        current_page: 1, 
        per_page: 100, 
        total: 0, 
        total_pages: 0, 
        has_next_page: false, 
        has_prev_page: false 
      });
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be a valid number between 1 and 100", [], { 
        current_page: 1, 
        per_page: 100, 
        total: 0, 
        total_pages: 0, 
        has_next_page: false, 
        has_prev_page: false 
      });
    }

    if (categoryIdParam) {
      if (categoryId === undefined || isNaN(categoryId) || categoryId < 1) {
        return sendApiResponse(
          res,
          400,
          false,
          "Category ID must be a valid positive number",
          [],
          {
            current_page: 1,
            per_page: 100,
            total: 0,
            total_pages: 0,
            has_next_page: false,
            has_prev_page: false
          }
        );
      }
    }

    const result = await tradingcardService.getDeletedTradingCards(
      userId,
      page,
      perPage,
      categoryId
    );

    // Transform the data
    const deletedTradingCards = (result.data || []).map((card: any) => {
      const baseResponse = {
        id: card.id,
        category_id: card.category_id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_slug: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param || null,
        sport_name: card.sport_name || null,
        sport_icon: card.sport_icon || null,
        trade_card_status: card.trade_card_status || null,
        is_deleted: Boolean(card.mark_as_deleted),
        created_at: card.created_at,
        updated_at: card.updated_at
      };

      return baseResponse;
    });

    // Only include pagination if pagination parameters were provided
    const hasPaginationParams = pageParam || perPageParam;
    
    if (hasPaginationParams) {
      return sendApiResponse(res, 200, true, "Deleted trading cards retrieved successfully", deletedTradingCards, {
        current_page: page,
        per_page: perPage,
        total: result.count || 0,
        total_pages: Math.ceil((result.count || 0) / perPage),
        has_next_page: page < Math.ceil((result.count || 0) / perPage),
        has_prev_page: page > 1
      });
    } else {
      return sendApiResponse(res, 200, true, "Deleted trading cards retrieved successfully", deletedTradingCards);
    }
  } catch (error: any) {
    console.error("Get deleted trading cards error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", [], { 
      current_page: 1, 
      per_page: 100, 
      total: 0, 
      total_pages: 0, 
      has_next_page: false, 
      has_prev_page: false 
    });
  }
};

// GET /user/tradingcards/my-products/:categoryName?page=1&perPage=9&loggedInUserId=123
export const getMyTradingCardsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryName } = req.params;
    // Get userId from auth middleware or query parameter
    const userId = req.user?.id as number | undefined;
    // Get loggedInUserId from query parameter for trade/offer check
    const loggedInUserId = req.query.loggedInUserId ? Number(req.query.loggedInUserId) : undefined;
    const page = parseInt((req.query.page as string) || "1", 10);
    const perPage = parseInt((req.query.perPage as string) || "9", 10);

    console.log("getMyTradingCardsByCategory - categoryName:", categoryName);
    console.log("getMyTradingCardsByCategory - userId:", userId);
    console.log("getMyTradingCardsByCategory - loggedInUserId:", loggedInUserId);

    // Remove authentication requirement - allow access without login
    // if (!userId) {
    //   return sendApiResponse(res, 401, false, "Unauthorized");
    // }
    
    if (!categoryName) {
      return sendApiResponse(res, 400, false, "Category slug is required");
    }

    // Get all trading cards for the category without user filtering since we removed authentication
    const { rows, count } = await tradingcardService.getAllTradingCardsByCategorySlug(categoryName, page, perPage);

    // Add canTradeOrOffer logic to each trading card
    const tradingCardsWithTradeStatus = rows.map((card: any) => {
      let canTradeOrOffer = true;
      
      // If loggedInUserId is provided and matches the card's trader_id, user can't trade with themselves
      if (loggedInUserId && card.trader_id === loggedInUserId) {
        canTradeOrOffer = false;
        console.log(`Card ${card.id}: User ${loggedInUserId} owns this card, canTradeOrOffer = false`);
      }
      
      // If card is already traded, user can't trade
      if (card.is_traded === '1') {
        canTradeOrOffer = false;
        console.log(`Card ${card.id}: Card is already traded, canTradeOrOffer = false`);
      }
      
      return {
        ...card,
        canTradeOrOffer: canTradeOrOffer
      };
    });

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
      // Get categories filtered by user's active cards (if userId is provided)
      stagDatas = await tradingcardService.getCategoriesForUser(userId || undefined);
    }

    const payload = {
      tradingcards: tradingCardsWithTradeStatus,
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

// GET /api/tradingCards/card-conditions - Get all card conditions with pagination
export const getAllCardConditions = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters");
    }

    const result = await tradingcardService.getAllCardConditions(page, perPage);
    
    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Card conditions retrieved successfully", result.data.cardConditions, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get card conditions");
    }
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
export const saveTradingCard = async (req: RequestWithFiles, res: Response) => {
  try {
    const { categoryId } = req.params;
    const requestData = req.body;
    
    // Get user from auth middleware
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
      
      // Process additional images (multiple files in one field)
      if (files.additional_images && files.additional_images.length > 0) {
        const additionalImagePaths: string[] = [];
        for (const file of files.additional_images) {
          const uploadedPath = uploadOne(file as any, uploadPath);
          additionalImagePaths.push(uploadedPath);
        }
        requestData.additional_images = additionalImagePaths;
      }
    }

    // Validate that both front and back images are provided (mandatory)
    if (!requestData.trading_card_img) {
      return sendApiResponse(res, 400, false, "Front image is required");
    }
    
    if (!requestData.trading_card_img_back) {
      return sendApiResponse(res, 400, false, "Back image is required");
    }

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
 * PUT /api/user/tradingcards/:cardId
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
      if (files.additional_images && files.additional_images.length > 0) {
        const additionalImages: string[] = [];
        for (const file of files.additional_images) {
          const imagePath = uploadOne(file as any, uploadPath);
          additionalImages.push(imagePath);
        }
        requestData.additional_images = additionalImages;
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
      type: QueryTypes.SELECT
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
        type: QueryTypes.DELETE
      });

      action = false; // Removed
    } else {
      // Add interest (insert record)
      await sequelize.query(`
        INSERT INTO interested_in (trading_card_id, trader_id, user_id, created_at) 
        VALUES (${cardId}, ${traderId}, ${userId}, NOW())
      `, {
        type: QueryTypes.INSERT
      });

      action = true; // Added
    }

    // Get updated favorite count
    const favCountResult = await sequelize.query(`
      SELECT COUNT(*) as count FROM interested_in WHERE user_id = ${userId}
    `, {
      type: QueryTypes.SELECT
    });

    // Ensure count is parsed as a number, since it may be returned as a string
    favCounts = favCountResult[0] && ('count' in favCountResult[0]) && (typeof (favCountResult[0] as { count: any }).count === 'string' || typeof (favCountResult[0] as { count: any }).count === 'number')
      ? Number((favCountResult[0] as { count: any }).count)
      : 0;

    return sendApiResponse(res, 200, true, "Interest updated successfully", [
      {
        action: action,
        fav_counts: favCounts
      }
    ]);
  } catch (error: any) {
    console.error('Interested in card error:', error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/tradingCards/public-profile - Get public profile trading cards for a specific user
export const getPublicProfileTradingCards = async (req: Request, res: Response) => {
  try {
    // Get parameters from query params
    const userId = req.query.userId as string;
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    const categoryIdParam = req.query.categoryId as string;
    
    // Validate required parameters
    if (!userId || isNaN(Number(userId)) || Number(userId) <= 0) {
      return sendApiResponse(res, 400, false, "Valid user ID is required");
    }

    const page = pageParam ? parseInt(pageParam.toString(), 10) : 1;
    const perPage = perPageParam ? parseInt(perPageParam.toString(), 10) : 10;
    let categoryId: number | undefined = undefined;
    
    if (categoryIdParam && !isNaN(Number(categoryIdParam)) && Number(categoryIdParam) > 0) {
      categoryId = parseInt(categoryIdParam.toString(), 10);
    }

    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in public profile API:', jwtError);
      }
    }

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return sendApiResponse(res, 400, false, "Page must be a valid number greater than 0");
    }

    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be a valid number between 1 and 100");
    }
    
    // Additional validation to ensure no NaN values are passed
    if (isNaN(Number(userId)) || Number(userId) <= 0) {
      return sendApiResponse(res, 400, false, "Invalid user ID provided");
    }

    console.log("Debug - userId:", userId, "type:", typeof userId);
    console.log("Debug - page:", page, "type:", typeof page);
    console.log("Debug - perPage:", perPage, "type:", typeof perPage);
    console.log("Debug - authenticatedUserId:", authenticatedUserId, "type:", typeof authenticatedUserId);
    
    const result = await tradingcardService.getPublicProfileTradingCards(
      Number(userId),
      page,
      perPage,
      authenticatedUserId,
      categoryId
    );

    console.log("Service result:", result);

    // Check if service returned an error
    if (!result.status) {
      return sendApiResponse(res, 400, false, result.message || "Failed to fetch trading cards", []);
    }

    // Transform the data and add canTradeOrOffer logic
    const tradingCards = (result.data || []).map((card: any) => {
      // Add canTradeOrOffer logic
      let canTradeOrOffer = true;
      
      // If authenticatedUserId is provided and matches the card's trader_id, user can't trade with themselves
      if (authenticatedUserId && card.trader_id === authenticatedUserId) {
        canTradeOrOffer = false;
      }
      
      // If card is already traded, user can't trade
      if (card.is_traded === '1') {
        canTradeOrOffer = false;
      }
      
      // If can_buy and can_trade are both 0, user can't trade or make offers
      if (card.can_buy === 0 && card.can_trade === 0) {
        canTradeOrOffer = false;
      }

             const baseResponse = {
         id: card.id,
         category_id: card.category_id,
         trader_id: card.trader_id,
         creator_id: card.creator_id,
         trading_card_img: card.trading_card_img,
         trading_card_img_back: card.trading_card_img_back,
         trading_card_slug: card.trading_card_slug,
         trading_card_recent_trade_value: card.trading_card_recent_trade_value,
         trading_card_asking_price: card.trading_card_asking_price,
         search_param: card.search_param || null,
         sport_name: card.sport_name || null,
        sport_icon: card.sport_icon || null,
         card_condition: card.card_condition || null,
         trade_card_status: card.trade_card_status || null,
         canTradeOrOffer: canTradeOrOffer
       };

      // Only add interested_in field if authenticatedUserId is provided
      if (authenticatedUserId) {
        return {
          ...baseResponse,
          interested_in: Boolean(card.interested_in)
        };
      }

      return baseResponse;
    });

    return sendApiResponse(res, 200, true, "Public profile trading cards retrieved successfully", tradingCards, {
      current_page: page,
      per_page: perPage,
      total: result.count,
      total_pages: Math.ceil(result.count / perPage),
      has_next_page: page < Math.ceil(result.count / perPage),
      has_prev_page: page > 1
    });

  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

// GET /api/tradingCards/popular - Get popular trading cards based on interested_in count
export const getPopularTradingCards = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    const result = await TradingCardService.getPopularTradingCards(page, perPage);

    if (result.success && result.data) {
      // Transform the response to include only necessary fields
      const response = result.data.cards.map((card: any) => ({
        id: card.id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        title: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param,
        sport_name: card.sport_name,
        sport_icon: card.sport_icon,
        is_traded: card.is_traded,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        trade_card_status: card.trade_card_status,
        interested_in: true,
        card_condition: card.card_condition
      }));

      return sendApiResponse(res, 200, true, "Popular trading cards retrieved successfully", response, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get popular trading cards", []);
    }

  } catch (error: any) {
    console.error("Get popular trading cards error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// POST /api/tradingCards/main-search - Main search API with image upload and text search
export const mainSearch = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    let searchText = '';

    // Check if image is uploaded
    if ((req as any).files && (req as any).files.searchProductImage && (req as any).files.searchProductImage[0]) {
      try {
        const imageFile = (req as any).files.searchProductImage[0];
        
        // Create FormData for third-party API call
        const formData = new FormData();
        formData.append('searchProductImage', imageFile.buffer, imageFile.originalname);

        // Call third-party image search API
        const response = await fetch('https://magical2.elswap.com/nodered/image-search', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Image search API failed with status: ${response.status}`);
        }

        const imageSearchResult = await response.json();
        
        // Extract search text from the response
        if (imageSearchResult && imageSearchResult.text) {
          searchText = imageSearchResult.text;
        } else if (imageSearchResult && imageSearchResult.searchText) {
          searchText = imageSearchResult.searchText;
        } else {
          return sendApiResponse(res, 400, false, "No search text found in image search response", []);
        }

      } catch (imageError: any) {
        console.error("Image search error:", imageError);
        return sendApiResponse(res, 500, false, "Image search failed: " + imageError.message, []);
      }
    } 
    // Check if text search is provided
    else if (req.body.searchText && req.body.searchText.trim()) {
      searchText = req.body.searchText.trim();
    }
    // Check if text search is provided in query params
    else if (req.query.searchText && typeof req.query.searchText === 'string' && req.query.searchText.trim()) {
      searchText = req.query.searchText.trim();
    }
    else {
      return sendApiResponse(res, 400, false, "Either image file or search text is required", []);
    }

    if (!searchText) {
      return sendApiResponse(res, 400, false, "Search text cannot be empty", []);
    }

    // Perform search using the extracted or provided text
    const result = await TradingCardService.mainSearch(searchText, page, perPage);

    if (result.success && result.data) {
      // Transform the response to include only necessary fields
      const response = result.data.cards.map((card: any) => ({
        id: card.id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        title: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param,
        sport_name: card.sport_name,
        is_traded: card.is_traded,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        trade_card_status: card.trade_card_status,
        interested_in: true,
        card_condition: card.card_condition
      }));

      return sendApiResponse(res, 200, true, "Search completed successfully", response, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to perform search", []);
    }

  } catch (error: any) {
    console.error("Main search error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get similar trading cards based on categories
export const getSimilarTradingCards = async (req: Request, res: Response) => {
  try {
    const { categories, page, perPage, tradingCardId } = req.query;

    // Validate categories parameter
    if (!categories) {
      return sendApiResponse(res, 400, false, "Categories parameter is required", []);
    }

    // Parse categories (can be comma-separated string or array)
    let categoryIds: number[];
    try {
      if (typeof categories === 'string') {
        categoryIds = categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      } else if (Array.isArray(categories)) {
        categoryIds = categories.map(id => parseInt(String(id))).filter(id => !isNaN(id));
      } else {
        return sendApiResponse(res, 400, false, "Invalid categories format", []);
      }
    } catch (error) {
      return sendApiResponse(res, 400, false, "Invalid categories format", []);
    }

    if (categoryIds.length === 0) {
      return sendApiResponse(res, 400, false, "No valid category IDs provided", []);
    }

    // Get pagination parameters
    const pageNumber = page ? parseInt(String(page)) : 1;
    const perPageNumber = perPage ? parseInt(String(perPage)) : 10;
    const tradingCardIdNumber = tradingCardId ? parseInt(String(tradingCardId)) : undefined;

    // Validate pagination parameters
    if (pageNumber < 1 || perPageNumber < 1 || perPageNumber > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    // Extract user ID from JWT token if available
    let authenticatedUserId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticatedUserId = decoded.user_id || decoded.sub || decoded.id;
        console.log('JWT Token decoded - User ID:', authenticatedUserId);
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
        console.log('Invalid token in similar trading cards API:', jwtError);
      }
    }

    // Call service method
    const result = await TradingCardService.getSimilarTradingCards(categoryIds, pageNumber, perPageNumber, authenticatedUserId, tradingCardIdNumber);

    if (result.success && result.data) {
      // Transform response to match /api/tradingCards format
      const response = result.data.cards.map((card: any) => {
        // Add canTradeOrOffer logic (same as /api/tradingCards)
        let canTradeOrOffer = true;
        
        // If authenticatedUserId is provided and matches the card's trader_id, user can't trade with themselves
        if (authenticatedUserId && card.trader_id === authenticatedUserId) {
          canTradeOrOffer = false;
        }
        
        // If card is already traded, user can't trade
        if (card.is_traded === '1') {
          canTradeOrOffer = false;
        }
        
        // If can_buy and can_trade are both 0, user can't trade or make offers
        if (card.can_buy === 0 && card.can_trade === 0) {
          canTradeOrOffer = false;
        }

        const baseResponse = {
          id: card.id,
          category_id: card.category_id,
          trading_card_img: card.trading_card_img,
          trading_card_img_back: card.trading_card_img_back,
          trading_card_slug: card.trading_card_slug,
          trading_card_recent_trade_value: card.trading_card_recent_trade_value,
          trading_card_asking_price: card.trading_card_asking_price,
          search_param: card.search_param || null,
          sport_name: card.sport_name || null,
          sport_icon: card.sport_icon || null,
          card_condition: card.card_condition || null,
          trade_card_status: card.trade_card_status || null,
          canTradeOrOffer: canTradeOrOffer
        };

        // Only add interested_in field if authenticatedUserId is provided
        if (authenticatedUserId) {
          return {
            ...baseResponse,
            interested_in: Boolean(card.interested_in)
          };
        }

        return baseResponse;
      });

      return sendApiResponse(res, 200, true, "Similar trading cards retrieved successfully", response, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get similar trading cards", []);
    }

  } catch (error: any) {
    console.error("Similar trading cards error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

/**
 * Update trading card status (on/off switch)
 * PUT /api/user/tradingcards/:cardId/status
 */
export const updateTradingCardStatus = async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status_id } = req.body;
    
    // Get user from auth middleware
    const user = req.user;
    if (!user || !user.id) {
      return sendApiResponse(res, 401, false, "User not authenticated");
    }

    const userId = user.id;
    
    // Validate cardId
    if (!cardId) {
      return sendApiResponse(res, 400, false, "Card ID is required");
    }
    
    const cardIdNum = parseInt(cardId);
    if (isNaN(cardIdNum) || cardIdNum <= 0) {
      return sendApiResponse(res, 400, false, "Invalid card ID");
    }

    // Validate status_id
    if (status_id === undefined || status_id === null) {
      return sendApiResponse(res, 400, false, "status_id is required");
    }

    const statusIdNum = parseInt(status_id);
    if (isNaN(statusIdNum) || (statusIdNum !== 0 && statusIdNum !== 1)) {
      return sendApiResponse(res, 400, false, "status_id must be 0 (inactive) or 1 (active)");
    }

    // Call service to update trading card status
    const result = await tradingcardService.updateTradingCardStatus(cardIdNum, statusIdNum, userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to update trading card status");
    }

    return sendApiResponse(
      res, 
      200, 
      true, 
      "Trading card status updated successfully",
      result.data
    );

  } catch (error: any) {
    console.error("Update trading card status error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Copy Trading Card Complete API (Single API with all data - matches Laravel setFormFieldsByCategoryAndProductSlug)
export const getCopyProductFormFields = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { product_code } = req.query;
    const productCode = Array.isArray(product_code) ? product_code[0] : product_code;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!productCode) {
      return sendApiResponse(res, 400, false, "Product code is required", []);
    }

    // Get existing trading card
    const existingProduct = await TradingCard.findOne({
      where: {
        code: productCode,
        mark_as_deleted: null
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'sport_name', 'slug']
        }
      ]
    });

    if (!existingProduct) {
      return sendApiResponse(res, 404, false, "Trading card not found", []);
    }

    const categoryId = existingProduct.category_id;

    // Get category fields
    const categoryFields = await CategoryField.findAll({
      where: { category_id: categoryId },
      order: [['priority', 'ASC']],
      attributes: ['fields', 'is_required', 'additional_information']
    });

    // Get category details
    const category = await Category.findByPk(categoryId, {
      attributes: ['id', 'sport_name', 'slug']
    });

    // Get all active categories
    const categories = await Category.findAll({
      where: { sport_status: '1' },
      order: [['sport_name', 'ASC']],
      attributes: ['id', 'sport_name', 'slug']
    });

    // Get master data for common fields (brands, teams, players, conditions, years)
    const masterData = {
      brands: await getMasterData('brands', categoryId),
      teams: await getMasterData('teams', categoryId),
      players: await getMasterData('players', categoryId),
      conditions: await getMasterData('conditions', categoryId),
      years: await getMasterData('years', categoryId)
    };

    // Process category fields (simplified version without ItemColumn relationship)
    const categoryFieldCollection: any = {};
    const categoryAjaxFieldCollection: string[] = [];
    const categoryJSFieldCollection: string[] = [];
    const selectDownMasterDataId: any = {};

    // For now, we'll use a simplified approach without ItemColumn relationships
    // This can be enhanced later when the proper relationships are established

    // Prepare existing product data for copying (reset certain fields)
    const existingProductData = existingProduct.toJSON();
    const copyProductData = {
      ...existingProductData,
      can_buy: '0',
      can_trade: '0',
      trading_card_estimated_value: '0',
      trading_card_asking_price: '0',
      trading_card_status: '0',
      seller_notes: '',
      shipping_details: '',
      trading_card_recent_trade_value: '',
      trading_card_recent_sell_link: '',
      free_shipping: '0',
      // Remove user-specific fields
      user_id: null,
      created_at: null,
      updated_at: null,
      id: null
    };

    // Complete response with all data in one API
    const responseData = {
      // Basic info
      category_id: categoryId,
      
      // Category fields
      category_fields: categoryFields.map(field => ({
        fields: field.fields,
        is_required: field.is_required,
        additional_information: field.additional_information
      })),
      
      // Master data collections
      category_field_collection: categoryFieldCollection,
      category_ajax_field_collection: categoryAjaxFieldCollection,
      category_js_field_collection: categoryJSFieldCollection,
      select_down_master_data_id: selectDownMasterDataId,
      
      // Master data for dropdowns
      master_data: masterData,
      
      // Category info
      category: {
        id: category?.id,
        label: category?.sport_name,
        slug: category?.slug
      },
      
      // All categories
      categories: categories.map(cat => ({
        id: cat.id,
        label: cat.sport_name,
        slug: cat.slug
      })),
      
      // Existing product data (ready for copying)
      existing_product: copyProductData,
      
      // Additional useful data
      product_by_code: existingProduct, // Original product data
      
      // Form configuration
      form_config: {
        can_copy: true,
        reset_fields: ['can_buy', 'can_trade', 'trading_card_estimated_value', 'trading_card_asking_price', 'trading_card_status'],
        required_fields: categoryFields.filter(field => field.is_required).map(field => field.fields)
      }
    };

    return sendApiResponse(res, 200, true, "Complete copy product data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Get copy product form fields error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get Master Data for Fields API
export const getMasterDataForField = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { master_table, category_id } = req.query;
    const masterTable = Array.isArray(master_table) ? master_table[0] : master_table;
    const categoryId = Array.isArray(category_id) ? category_id[0] : category_id;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!masterTable) {
      return sendApiResponse(res, 400, false, "Master table name is required", []);
    }

    const masterData = await getMasterData(masterTable as string, categoryId ? parseInt(categoryId as string) : null);

    return sendApiResponse(res, 200, true, "Master data retrieved successfully", masterData);

  } catch (error: any) {
    console.error('Get master data error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get Product by Code API
export const getProductByCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { product_code } = req.query;
    const productCode = Array.isArray(product_code) ? product_code[0] : product_code;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!productCode) {
      return sendApiResponse(res, 400, false, "Product code is required", []);
    }

    const product = await TradingCard.findOne({
      where: {
        code: productCode,
        mark_as_deleted: null
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'sport_name', 'slug']
        }
      ]
    });

    if (!product) {
      return sendApiResponse(res, 404, false, "Product not found", []);
    }

    return sendApiResponse(res, 200, true, "Product retrieved successfully", product);

  } catch (error: any) {
    console.error('Get product by code error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to get master data (matches Laravel Helper::____getMasterDatas)
const getMasterData = async (masterTable: string, categoryId: number | null = null) => {
  try {
    // This is a simplified version - you'll need to implement based on your actual master tables
    // Common master tables might include: brands, teams, players, conditions, etc.
    
    switch (masterTable) {
      case 'brands':
        // Return brands data
        return await getBrandsData(categoryId);
      
      case 'teams':
        // Return teams data
        return await getTeamsData(categoryId);
      
      case 'players':
        // Return players data
        return await getPlayersData(categoryId);
      
      case 'conditions':
        // Return conditions data
        return await getConditionsData();
      
      case 'years':
        // Return years data
        return await getYearsData();
      
      default:
        // For unknown tables, return empty array
        return [];
    }

  } catch (error: any) {
    console.error(`Error getting master data for ${masterTable}:`, error);
    return [];
  }
};

// Helper functions for different master data types
const getBrandsData = async (categoryId: number | null) => {
  // Implement based on your brands table structure
  // This is a placeholder - replace with actual implementation
  return [
    { id: 1, name: 'Topps', slug: 'topps' },
    { id: 2, name: 'Panini', slug: 'panini' },
    { id: 3, name: 'Upper Deck', slug: 'upper-deck' }
  ];
};

const getTeamsData = async (categoryId: number | null) => {
  // Implement based on your teams table structure
  return [
    { id: 1, name: 'Los Angeles Lakers', slug: 'lakers' },
    { id: 2, name: 'Boston Celtics', slug: 'celtics' },
    { id: 3, name: 'Chicago Bulls', slug: 'bulls' }
  ];
};

const getPlayersData = async (categoryId: number | null) => {
  // Implement based on your players table structure
  return [
    { id: 1, name: 'LeBron James', slug: 'lebron-james' },
    { id: 2, name: 'Michael Jordan', slug: 'michael-jordan' },
    { id: 3, name: 'Kobe Bryant', slug: 'kobe-bryant' }
  ];
};

const getConditionsData = async () => {
  return [
    { id: 1, name: 'Mint', slug: 'mint' },
    { id: 2, name: 'Near Mint', slug: 'near-mint' },
    { id: 3, name: 'Excellent', slug: 'excellent' },
    { id: 4, name: 'Very Good', slug: 'very-good' },
    { id: 5, name: 'Good', slug: 'good' }
  ];
};

const getYearsData = async () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let year = currentYear; year >= 1950; year--) {
    years.push({ id: year, name: year.toString(), slug: year.toString() });
  }
  
  return years;
};