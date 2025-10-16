import { Request, Response } from "express";
import { TradingCardService } from "../services/tradingcard.service.js";
import { Category, TradingCard, BuyOfferAttempt, CategoryField, ItemColumn, Year, Player, PublicationYear, VehicleYear, YearOfIssue, Publisher, Brand, Package, ConventionEvent, Country, CoinName, Denomination, Circulated, ItemType, Genre, Feature, SuperheroTeam, StorageCapacity, ConsoleModel, RegionCode, Edition, PlatformConsole, Speed, Type, RecordSize, MintMark, ExclusiveEventRetailer } from "../models/index.js";
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
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
    
    // Get user ID from req.user (set by userAuth middleware)
    const authenticatedUserId: number | undefined = (req as any).user?.id;
    
    // Validate that user ID is present (required for user endpoints)
    if (!authenticatedUserId) {
      return sendApiResponse(res, 401, false, "Valid user ID is required", []);
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

    // If source=myproduct, return ONLY the logged-in user's products
    const sourceParam = (req.query.source as string | undefined)?.toString().toLowerCase();
    if (sourceParam === 'myproduct') {
      if (!authenticatedUserId) {
        return sendApiResponse(res, 401, false, "Authorization token required", []);
      }
      const myResult = await tradingcardService.getUserOwnProducts(
        page,
        perPage,
        categoryId,
        authenticatedUserId
      );
      const tradingCards = (myResult.data || []).map((card: any) => {
        // Same transformation as the original method
        let canTradeOrOffer = true;
        
        // If loggedInUserId is provided and matches the card's trader_id, user can't trade with themselves
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
          trade_value: card.trading_card_estimated_value,
          search_param: card.search_param || null,
          title: card.title,
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
            first_name: card.first_name || null,
            last_name: card.last_name || null,
            username: card.trader_name || null,
            profile_image: card.profile_image || null,
            verified_status: card.verified_status || null,
            rating: card.rating || null,
            total_reviews: card.total_reviews || null,
            location: card.location || null,
            country: card.country || null,
            state: card.state || null,
            city: card.city || null,
            zip_code: card.zip_code || null,
            phone_number: card.phone_number || null,
            email: card.email || null,
            created_at: card.user_created_at || null,
            updated_at: card.user_updated_at || null
          }
        };

        return baseResponse;
      });
      return sendApiResponse(res, 200, true, "Trading cards retrieved successfully", tradingCards, {
        current_page: page,
        per_page: perPage,
        total: myResult.count || 0,
        total_pages: Math.ceil((myResult.count || 0) / perPage),
        has_next_page: page < Math.ceil((myResult.count || 0) / perPage),
        has_prev_page: page > 1
      });
    }

    // Default: original method for user's own cards (existing behavior)
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
        title: card.title ?? card.trading_card_slug,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_slug: card.trading_card_slug,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        trade_value: card.trading_card_estimated_value,
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
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

    // Duplicate flag: when true, include the logged-in user's own cards as well
    const duplicateParam = req.query.duplicate as string | undefined;
    const includeOwnCards = duplicateParam && duplicateParam.toString().toLowerCase() === 'true';

    // Use the method that normally excludes user's own cards. When duplicate=true, pass undefined to avoid exclusion.
    const result = await tradingcardService.getAllTradingCardsExceptOwn(
      page,
      perPage,
      categoryId,
      includeOwnCards ? undefined : loggedInUserId,
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
        trading_card_estimated_value: card.trading_card_estimated_value,
        search_param: card.search_param || null,
        title: card.title,
        sport_name: card.sport_name || null,
        sport_icon: card.sport_icon || null,
        trade_card_status: card.trade_card_status || null,
        trader_id: card.trader_id || null,
        trader_name: card.trader_name || null,
        card_condition: card.card_condition || null,
        graded: card.graded || '0',
        can_trade: card.can_trade,
        can_buy: card.can_buy,
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

// Common function for both public and user trading card endpoints
const getTradingCardCommon = async (req: Request, res: Response, isUserEndpoint: boolean = false) => {
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
      }
    }
    
    
    const result = await tradingcardService.getTradingCardById(cardId, authenticatedUserId);
    
    if (!result) {
      return sendApiResponse(res, 404, false, "Trading Card not found");
    }
    
    const { additionalFields, cardImages, canTradeOrOffer, interested_in, ...tradingCard } = result;
    
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
        
        
        // Calculate remaining attempts
        let remainingAttempts = 3 - attemptsCount;
        
        
        // Ensure remaining attempts is not negative
        if (remainingAttempts < 0) {
          remainingAttempts = 0;
        }
        

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

      }
    }
    
    // Transform the response to preserve existing structure and add missing non-null fields
    const cardData = tradingCard as any;
    
    // Get all non-null/non-empty fields that are not already included in the main response
    const additionalNonNullFields: any = {};
    Object.keys(cardData).forEach(key => {
      const value = cardData[key];
      // Skip if it's already included in the main response or if it's null/empty
      const alreadyIncluded = [
        'id', 'code', 'trading_card_status', 'category_id', 'search_param', 'trading_card_img', 
        'trading_card_img_back', 'trading_card_slug', 'is_traded', 'created_at', 'is_demo', 
        'trader_id', 'trading_card_asking_price', 'trading_card_estimated_value', 
        'trading_card_recent_sell_link', 'trading_card_recent_trade_value', 'can_trade', 
        'can_buy', 'usa_shipping_flat_rate', 'canada_shipping_flat_rate', 'trader'
      ];
      
      if (!alreadyIncluded.includes(key) && 
          value !== null && 
          value !== undefined && 
          value !== '' && 
          !(value === 0 && typeof value === 'number')) {
        additionalNonNullFields[key] = value;
      }
    });

    // Conditionally exclude some fields only when detail=true is passed
    const detailFlag = (req.query as any)?.productDetail ?? (req.query as any)?.detail;
    const isDetail = ['true', '1', 'yes'].includes(String(detailFlag || '').toLowerCase());
    const fieldsToExclude = [
      'publication_year_text',
      'trading_card_offer_accept_above',
      'seller_notes',
      'shipping_details',
      'usa_shipping_flat_rate',
      'usa_add_product_flat_rate',
      'canada_shipping_flat_rate',
      'creator_id',
      'vehicle_year_text',
      'included_missing_accessories',
      'updated_at',
      'certification_number',
      'certification',
      'is_certified',
      'coin_stamp_grade_rating',
      'release_year_text',
      'is_autograph_card',
      'player_id_text',
      'graded',
      'professional_grader_id',
      'grade_rating_id',
      'canada_add_product_flat_rate',
      'free_shipping',
      'title',
      'can_trade',  
      'can_buy'
    ];
    // For user endpoint, never exclude fields. For public endpoint, exclude fields when productDetail=true
    const filteredAdditionalFields = Array.isArray(additionalFields)
      ? (isUserEndpoint ? [...additionalFields] : (isDetail ? additionalFields.filter((f: any) => !fieldsToExclude.includes(f?.field_name)) : [...additionalFields]))
      : additionalFields;

    // Enrich master-backed fields in additionalFields (issue_number -> year_of_issues)
    if (Array.isArray(filteredAdditionalFields)) {
      try {
        const issueField = filteredAdditionalFields.find((f: any) => f?.field_name === 'issue_number' && f.field_value);
        if (issueField && !isNaN(Number(issueField.field_value))) {
          const issueRow = await YearOfIssue.findByPk(Number(issueField.field_value));
          if (issueRow) {
            issueField.field_label = issueField.field_label || 'Issue Number';
            issueField.related_field_name = 'year_of_issues';
            issueField.related_field_value = issueRow.name;
          }
        }

        // publisher -> publishers
        const publisherField = filteredAdditionalFields.find((f: any) => f?.field_name === 'publisher' && f.field_value);
        if (publisherField && !isNaN(Number(publisherField.field_value))) {
          const publisherRow = await Publisher.findByPk(Number(publisherField.field_value));
          if (publisherRow) {
            publisherField.field_label = publisherField.field_label || 'Publisher';
            publisherField.related_field_name = 'publishers';
            publisherField.related_field_value = publisherRow.name;
          }
        }

        // brand -> brands
        const brandField = filteredAdditionalFields.find((f: any) => f?.field_name === 'brand' && f.field_value);
        if (brandField && !isNaN(Number(brandField.field_value))) {
          const brandRow = await Brand.findByPk(Number(brandField.field_value));
          if (brandRow) {
            brandField.field_label = brandField.field_label || 'Brand';
            brandField.related_field_name = 'brands';
            brandField.related_field_value = brandRow.name;
          }
        }

        // packaging -> packages
        const packagingField = filteredAdditionalFields.find((f: any) => f?.field_name === 'packaging' && f.field_value);
        if (packagingField && !isNaN(Number(packagingField.field_value))) {
          const packageRow = await Package.findByPk(Number(packagingField.field_value));
          if (packageRow) {
            packagingField.field_label = packagingField.field_label || 'Packaging';
            packagingField.related_field_name = 'packages';
            packagingField.related_field_value = packageRow.name;
          }
        }

        // convention_event -> convention_events
        const convField = filteredAdditionalFields.find((f: any) => f?.field_name === 'convention_event' && f.field_value);
        if (convField && !isNaN(Number(convField.field_value))) {
          const convRow = await ConventionEvent.findByPk(Number(convField.field_value));
          if (convRow) {
            convField.field_label = convField.field_label || 'Convention/Event';
            convField.related_field_name = 'convention_events';
            convField.related_field_value = convRow.name;
          }
        }

        // country_id -> countries
        const countryField = filteredAdditionalFields.find((f: any) => f?.field_name === 'country_id' && f.field_value);
        if (countryField && !isNaN(Number(countryField.field_value))) {
          const countryRow = await Country.findByPk(Number(countryField.field_value));
          if (countryRow) {
            countryField.field_label = countryField.field_label || 'Country of Origin';
            countryField.related_field_name = 'countries';
            countryField.related_field_value = countryRow.name;
          }
        }

        // coin_name_slt -> coin_names
        const coinNameField = filteredAdditionalFields.find((f: any) => f?.field_name === 'coin_name_slt' && f.field_value);
        if (coinNameField && !isNaN(Number(coinNameField.field_value))) {
          const coinRow = await CoinName.findByPk(Number(coinNameField.field_value));
          if (coinRow) {
            coinNameField.field_label = coinNameField.field_label || 'Coin Name';
            coinNameField.related_field_name = 'coin_names';
            coinNameField.related_field_value = coinRow.name;
          }
        }

        // mint_mark_slt -> mint_marks
        const mintMarkField = filteredAdditionalFields.find((f: any) => f?.field_name === 'mint_mark_slt' && f.field_value);
        if (mintMarkField && !isNaN(Number(mintMarkField.field_value))) {
          const mmRow = await MintMark.findByPk(Number(mintMarkField.field_value));
          if (mmRow) {
            mintMarkField.field_label = mintMarkField.field_label || 'Mint Mark';
            mintMarkField.related_field_name = 'mint_marks';
            mintMarkField.related_field_value = mmRow.name;
          }
        }

        // exclusive_event_retailer -> exclusive_event_retailers
        const exclusiveEventRetailerField = filteredAdditionalFields.find((f: any) => f?.field_name === 'exclusive_event_retailer' && f.field_value);
        if (exclusiveEventRetailerField && !isNaN(Number(exclusiveEventRetailerField.field_value))) {
          const eerRow = await ExclusiveEventRetailer.findByPk(Number(exclusiveEventRetailerField.field_value));
          if (eerRow) {
            exclusiveEventRetailerField.field_label = exclusiveEventRetailerField.field_label || 'Exclusive Event/Retailers';
            exclusiveEventRetailerField.related_field_name = 'exclusive_event_retailers';
            exclusiveEventRetailerField.related_field_value = eerRow.name;
          }
        }

        // denomination_slt -> denominations
        const denomField = filteredAdditionalFields.find((f: any) => f?.field_name === 'denomination_slt' && f.field_value);
        if (denomField && !isNaN(Number(denomField.field_value))) {
          const denomRow = await Denomination.findByPk(Number(denomField.field_value));
          if (denomRow) {
            denomField.field_label = denomField.field_label || 'Denomination';
            denomField.related_field_name = 'denominations';
            denomField.related_field_value = denomRow.name;
          }
        }

        // circulated -> circulateds
        const circField = filteredAdditionalFields.find((f: any) => f?.field_name === 'circulated' && f.field_value !== undefined && f.field_value !== null);
        if (circField && !isNaN(Number(circField.field_value))) {
          const circRow = await Circulated.findByPk(Number(circField.field_value));
          if (circRow) {
            circField.field_label = circField.field_label || 'Circulated';
            circField.related_field_name = 'circulateds';
            circField.related_field_value = circRow.name;
          }
        }

        // storage_capacity -> storage_capacities
        const storageField = filteredAdditionalFields.find((f: any) => f?.field_name === 'storage_capacity' && f.field_value);
        if (storageField && !isNaN(Number(storageField.field_value))) {
          const scRow = await StorageCapacity.findByPk(Number(storageField.field_value));
          if (scRow) {
            storageField.field_label = storageField.field_label || 'Storage Capacity';
            storageField.related_field_name = 'storage_capacities';
            storageField.related_field_value = scRow.name;
          }
        }

        // console_name_model -> console_models
        const consoleModelField = filteredAdditionalFields.find((f: any) => f?.field_name === 'console_name_model' && f.field_value);
        if (consoleModelField && !isNaN(Number(consoleModelField.field_value))) {
          const cmRow = await ConsoleModel.findByPk(Number(consoleModelField.field_value));
          if (cmRow) {
            consoleModelField.field_label = consoleModelField.field_label || 'Console Model';
            consoleModelField.related_field_name = 'console_models';
            consoleModelField.related_field_value = cmRow.name;
          }
        }

        // region_code -> region_codes
        const regionCodeField = filteredAdditionalFields.find((f: any) => f?.field_name === 'region_code' && f.field_value);
        if (regionCodeField && !isNaN(Number(regionCodeField.field_value))) {
          const rcRow = await RegionCode.findByPk(Number(regionCodeField.field_value));
          if (rcRow) {
            regionCodeField.field_label = regionCodeField.field_label || 'Region Code';
            regionCodeField.related_field_name = 'region_codes';
            regionCodeField.related_field_value = rcRow.name;
          }
        }

        // edition -> editions
        const editionField = filteredAdditionalFields.find((f: any) => f?.field_name === 'edition' && f.field_value);
        if (editionField && !isNaN(Number(editionField.field_value))) {
          const edRow = await Edition.findByPk(Number(editionField.field_value));
          if (edRow) {
            editionField.field_label = editionField.field_label || 'Edition';
            editionField.related_field_name = 'editions';
            editionField.related_field_value = edRow.name;
          }
        }

        // platform_console -> platform_consoles
        const platformField = filteredAdditionalFields.find((f: any) => f?.field_name === 'platform_console' && f.field_value);
        if (platformField && !isNaN(Number(platformField.field_value))) {
          const pcRow = await PlatformConsole.findByPk(Number(platformField.field_value));
          if (pcRow) {
            platformField.field_label = platformField.field_label || 'Platform';
            platformField.related_field_name = 'platform_consoles';
            platformField.related_field_value = pcRow.name;
          }
        }

        // year_date_of_issue -> years (+ year_date_of_issue_text)
        const ydoiField = filteredAdditionalFields.find((f: any) => f?.field_name === 'year_date_of_issue' && f.field_value);
        if (ydoiField && !isNaN(Number(ydoiField.field_value))) {
          const yearRow = await Year.findByPk(Number(ydoiField.field_value));
          if (yearRow) {
            ydoiField.field_label = ydoiField.field_label || 'Release Year';
            ydoiField.related_field_name = 'years';
            ydoiField.related_field_value = yearRow.name;
            (ydoiField as any).year_date_of_issue_text = yearRow.name;
          }
        }

        // speed -> speeds
        const speedField = filteredAdditionalFields.find((f: any) => f?.field_name === 'speed' && f.field_value);
        if (speedField && !isNaN(Number(speedField.field_value))) {
          const spRow = await Speed.findByPk(Number(speedField.field_value));
          if (spRow) {
            speedField.field_label = speedField.field_label || 'Speed';
            speedField.related_field_name = 'speeds';
            speedField.related_field_value = spRow.name;
          }
        }

        // types -> types
        const typesField = filteredAdditionalFields.find((f: any) => f?.field_name === 'types' && f.field_value);
        if (typesField && !isNaN(Number(typesField.field_value))) {
          const tRow = await Type.findByPk(Number(typesField.field_value));
          if (tRow) {
            typesField.field_label = typesField.field_label || 'Type';
            typesField.related_field_name = 'types';
            typesField.related_field_value = tRow.name;
          }
        }

        // record_size -> record_sizes
        const rsField = filteredAdditionalFields.find((f: any) => f?.field_name === 'record_size' && f.field_value);
        if (rsField && !isNaN(Number(rsField.field_value))) {
          const rsRow = await RecordSize.findByPk(Number(rsField.field_value));
          if (rsRow) {
            rsField.field_label = rsField.field_label || 'Record Size';
            rsField.related_field_name = 'record_sizes';
            rsField.related_field_value = rsRow.name;
          }
        }

        // publication_year -> add publication_year_text with related_field_value
        const pubYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'publication_year');
        if (pubYearField) {
          // Ensure related_field_value is present; if not, try to resolve from master
          if (!pubYearField.related_field_value && pubYearField.field_value && !isNaN(Number(pubYearField.field_value))) {
            const py = await PublicationYear.findByPk(Number(pubYearField.field_value));
            if (py) {
              pubYearField.related_field_name = pubYearField.related_field_name || 'publication_years';
              pubYearField.related_field_value = pubYearField.related_field_value || py.name;
            }
          }
          if (pubYearField.related_field_value) {
            (pubYearField as any).publication_year_text = pubYearField.related_field_value;
          }
        }

        // release_year -> add release_year_text with related_field_value
        const relYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'release_year');
        if (relYearField) {
          if (!relYearField.related_field_value && relYearField.field_value && !isNaN(Number(relYearField.field_value))) {
            const yr = await Year.findByPk(Number(relYearField.field_value));
            if (yr) {
              relYearField.related_field_name = relYearField.related_field_name || 'years';
              relYearField.related_field_value = relYearField.related_field_value || yr.name;
            }
          }
          if (relYearField.related_field_value) {
            (relYearField as any).release_year_text = relYearField.related_field_value;
          }
        }

        // vehicle_year -> add vehicle_year_text with related_field_value
        const vehYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'vehicle_year');
        if (vehYearField) {
          if (!vehYearField.related_field_value && vehYearField.field_value && !isNaN(Number(vehYearField.field_value))) {
            const vy = await VehicleYear.findByPk(Number(vehYearField.field_value));
            if (vy) {
              vehYearField.related_field_name = vehYearField.related_field_name || 'vehicle_years';
              vehYearField.related_field_value = vehYearField.related_field_value || vy.name;
            }
          }
          if (vehYearField.related_field_value) {
            (vehYearField as any).vehicle_year_text = vehYearField.related_field_value;
          }
        }

        // item_type -> item_types
        const itemTypeField = filteredAdditionalFields.find((f: any) => f?.field_name === 'item_type' && f.field_value);
        if (itemTypeField && !isNaN(Number(itemTypeField.field_value))) {
          const itemTypeRow = await ItemType.findByPk(Number(itemTypeField.field_value));
          if (itemTypeRow) {
            itemTypeField.field_label = itemTypeField.field_label || 'Item Type';
            itemTypeField.related_field_name = 'item_types';
            itemTypeField.related_field_value = itemTypeRow.name;
          }
        }

        // genre -> genres
        const genreField = filteredAdditionalFields.find((f: any) => f?.field_name === 'genre' && f.field_value);
        if (genreField && !isNaN(Number(genreField.field_value))) {
          const genreRow = await Genre.findByPk(Number(genreField.field_value));
          if (genreRow) {
            genreField.field_label = genreField.field_label || 'Genre';
            genreField.related_field_name = 'genres';
            genreField.related_field_value = genreRow.name;
          }
        }

        // featured_person_artist -> features (fallback to superhero_teams if needed)
        const fpaField = filteredAdditionalFields.find((f: any) => f?.field_name === 'featured_person_artist' && f.field_value !== undefined && f.field_value !== null);
        if (fpaField) {
          const numericId = Number(fpaField.field_value);
          if (!isNaN(numericId)) {
            let relatedName: string | undefined;
            let relatedTable = 'features';
            const featureRow = await Feature.findByPk(numericId);
            if (featureRow) relatedName = featureRow.name;
            if (!relatedName) {
              const teamRow = await SuperheroTeam.findByPk(numericId);
              if (teamRow) {
                relatedName = teamRow.name;
                relatedTable = 'superhero_teams';
              }
            }
            if (relatedName) {
              fpaField.field_label = fpaField.field_label || 'Featured Person/Artist';
              fpaField.related_field_name = relatedTable;
              fpaField.related_field_value = relatedName;
            }
          } else if (typeof fpaField.field_value === 'string' && fpaField.field_value.trim()) {
            // If API sent text instead of ID, reflect as related value
            fpaField.field_label = fpaField.field_label || 'Featured Person/Artist';
            fpaField.related_field_name = 'features';
            fpaField.related_field_value = fpaField.field_value.trim();
          }
        }

        // Map enum 1/0 to human text for is_rookie_card
        const rookieField = filteredAdditionalFields.find((f: any) => f?.field_name === 'is_rookie_card');
        if (rookieField && (rookieField.field_value === '1' || rookieField.field_value === 1)) {
          rookieField.related_field_value = 'Yes';
        }

        // Map enum 1/0 for is_variant: 1 -> Yes, else -> 0
        const isVariantField = filteredAdditionalFields.find((f: any) => f?.field_name === 'is_variant');
        if (isVariantField) {
          if (isVariantField.field_value === '1' || isVariantField.field_value === 1) {
            isVariantField.related_field_value = 'Yes';
          } else {
            isVariantField.related_field_value = '0';
          }
        }

        // Map enum 1/0 for is_parallel: 1 -> Yes, 0 -> No
        const isParallelField = filteredAdditionalFields.find((f: any) => f?.field_name === 'is_parallel');
        if (isParallelField) {
          const v = isParallelField.field_value;
          if (v === '1' || v === 1) {
            isParallelField.related_field_value = 'Yes';
          } else if (v === '0' || v === 0) {
            isParallelField.related_field_value = 'No';
          }
        }
      } catch (e) {
        console.warn('issue_number enrichment failed:', e);
      }
    }

    // Ensure is_controllers_included appears last in additionalFields
    if (Array.isArray(filteredAdditionalFields) && filteredAdditionalFields.length > 0) {
      const idx = filteredAdditionalFields.findIndex((f: any) => f?.field_name === 'is_controllers_included');
      if (idx > -1) {
        const [ctrl] = filteredAdditionalFields.splice(idx, 1);
        filteredAdditionalFields.push(ctrl);
      }
    }

    const transformedCard = {
      id: tradingCard.id,
      code: tradingCard.code,
      trading_card_status: tradingCard.trading_card_status,
      category_id: tradingCard.category_id,
      search_param: tradingCard.search_param,
      title: tradingCard.title,
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
      usa_shipping_flat_rate: (tradingCard as any).usa_shipping_flat_rate,
      canada_shipping_flat_rate: (tradingCard as any).canada_shipping_flat_rate,
      year_date_of_issue_text: (() => {
        if (Array.isArray(filteredAdditionalFields)) {
          const ydoi = filteredAdditionalFields.find((f: any) => f?.field_name === 'year_date_of_issue');
          return ydoi?.related_field_value || (ydoi as any)?.year_date_of_issue_text || null;
        }
        return null;
      })(),
      // Add all non-null additional fields from trading card (filtered)
      additionalFields: filteredAdditionalFields,
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
        null,
      // Add all other non-null/non-empty fields from trading_cards table
      ...additionalNonNullFields
    };
    
    return sendApiResponse(res, 200, true, "Trading card retrieved successfully", transformedCard);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};


const getTradingCardForEdit = async (req: Request, res: Response, isUserEndpoint: boolean = false) => {
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
      }
    }
    
    
    const result = await tradingcardService.getTradingCardById(cardId, authenticatedUserId);
    
    if (!result) {
      return sendApiResponse(res, 404, false, "Trading Card not found");
    }
    
    const { additionalFields, cardImages, canTradeOrOffer, interested_in, ...tradingCard } = result;
    
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
        
        
        // Calculate remaining attempts
        let remainingAttempts = 3 - attemptsCount;
        
        
        // Ensure remaining attempts is not negative
        if (remainingAttempts < 0) {
          remainingAttempts = 0;
        }
        

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

      }
    }
    
    // Transform the response to preserve existing structure and add missing non-null fields
    const cardData = tradingCard as any;
    
    // Get all non-null/non-empty fields that are not already included in the main response
    const additionalNonNullFields: any = {};
    Object.keys(cardData).forEach(key => {
      const value = cardData[key];
      // Skip if it's already included in the main response or if it's null/empty
      const alreadyIncluded = [
        'id', 'code', 'trading_card_status', 'category_id', 'search_param', 'trading_card_img', 
        'trading_card_img_back', 'trading_card_slug', 'is_traded', 'created_at', 'is_demo', 
        'trader_id', 'trading_card_asking_price', 'trading_card_estimated_value', 
        'trading_card_recent_sell_link', 'trading_card_recent_trade_value', 'can_trade', 
        'can_buy', 'usa_shipping_flat_rate', 'canada_shipping_flat_rate', 'trader'
      ];
      
      if (!alreadyIncluded.includes(key) && 
          value !== null && 
          value !== undefined && 
          value !== '' && 
          !(value === 0 && typeof value === 'number')) {
        additionalNonNullFields[key] = value;
      }
    });

    // For user endpoint, never exclude any fields - return all additionalFields as is
    const filteredAdditionalFields = Array.isArray(additionalFields) ? [...additionalFields] : additionalFields;

    // Enrich master-backed fields in additionalFields (issue_number -> year_of_issues)
    if (Array.isArray(filteredAdditionalFields)) {
      try {
        const issueField = filteredAdditionalFields.find((f: any) => f?.field_name === 'issue_number' && f.field_value);
        if (issueField && !isNaN(Number(issueField.field_value))) {
          const issueRow = await YearOfIssue.findByPk(Number(issueField.field_value));
          if (issueRow) {
            issueField.field_label = issueField.field_label || 'Issue Number';
            issueField.related_field_name = 'year_of_issues';
            issueField.related_field_value = issueRow.name;
          }
        }

        // publisher -> publishers
        const publisherField = filteredAdditionalFields.find((f: any) => f?.field_name === 'publisher' && f.field_value);
        if (publisherField && !isNaN(Number(publisherField.field_value))) {
          const publisherRow = await Publisher.findByPk(Number(publisherField.field_value));
          if (publisherRow) {
            publisherField.field_label = publisherField.field_label || 'Publisher';
            publisherField.related_field_name = 'publishers';
            publisherField.related_field_value = publisherRow.name;
          }
        }

        // brand -> brands
        const brandField = filteredAdditionalFields.find((f: any) => f?.field_name === 'brand' && f.field_value);
        if (brandField && !isNaN(Number(brandField.field_value))) {
          const brandRow = await Brand.findByPk(Number(brandField.field_value));
          if (brandRow) {
            brandField.field_label = brandField.field_label || 'Brand';
            brandField.related_field_name = 'brands';
            brandField.related_field_value = brandRow.name;
          }
        }

        // packaging -> packages
        const packagingField = filteredAdditionalFields.find((f: any) => f?.field_name === 'packaging' && f.field_value);
        if (packagingField && !isNaN(Number(packagingField.field_value))) {
          const packageRow = await Package.findByPk(Number(packagingField.field_value));
          if (packageRow) {
            packagingField.field_label = packagingField.field_label || 'Packaging';
            packagingField.related_field_name = 'packages';
            packagingField.related_field_value = packageRow.name;
          }
        }

        // convention_event -> convention_events
        const convField = filteredAdditionalFields.find((f: any) => f?.field_name === 'convention_event' && f.field_value);
        if (convField && !isNaN(Number(convField.field_value))) {
          const convRow = await ConventionEvent.findByPk(Number(convField.field_value));
          if (convRow) {
            convField.field_label = convField.field_label || 'Convention/Event';
            convField.related_field_name = 'convention_events';
            convField.related_field_value = convRow.name;
          }
        }

        // country_id -> countries
        const countryField = filteredAdditionalFields.find((f: any) => f?.field_name === 'country_id' && f.field_value);
        if (countryField && !isNaN(Number(countryField.field_value))) {
          const countryRow = await Country.findByPk(Number(countryField.field_value));
          if (countryRow) {
            countryField.field_label = countryField.field_label || 'Country of Origin';
            countryField.related_field_name = 'countries';
            countryField.related_field_value = countryRow.name;
          }
        }

        // coin_name_slt -> coin_names
        const coinNameField = filteredAdditionalFields.find((f: any) => f?.field_name === 'coin_name_slt' && f.field_value);
        if (coinNameField && !isNaN(Number(coinNameField.field_value))) {
          const coinRow = await CoinName.findByPk(Number(coinNameField.field_value));
          if (coinRow) {
            coinNameField.field_label = coinNameField.field_label || 'Coin Name';
            coinNameField.related_field_name = 'coin_names';
            coinNameField.related_field_value = coinRow.name;
          }
        }

        // mint_mark_slt -> mint_marks
        const mintMarkField = filteredAdditionalFields.find((f: any) => f?.field_name === 'mint_mark_slt' && f.field_value);
        if (mintMarkField && !isNaN(Number(mintMarkField.field_value))) {
          const mmRow = await MintMark.findByPk(Number(mintMarkField.field_value));
          if (mmRow) {
            mintMarkField.field_label = mintMarkField.field_label || 'Mint Mark';
            mintMarkField.related_field_name = 'mint_marks';
            mintMarkField.related_field_value = mmRow.name;
          }
        }

        // exclusive_event_retailer -> exclusive_event_retailers
        const exclusiveEventRetailerField = filteredAdditionalFields.find((f: any) => f?.field_name === 'exclusive_event_retailer' && f.field_value);
        if (exclusiveEventRetailerField && !isNaN(Number(exclusiveEventRetailerField.field_value))) {
          const eerRow = await ExclusiveEventRetailer.findByPk(Number(exclusiveEventRetailerField.field_value));
          if (eerRow) {
            exclusiveEventRetailerField.field_label = exclusiveEventRetailerField.field_label || 'Exclusive Event/Retailers';
            exclusiveEventRetailerField.related_field_name = 'exclusive_event_retailers';
            exclusiveEventRetailerField.related_field_value = eerRow.name;
          }
        }

        // denomination_slt -> denominations
        const denomField = filteredAdditionalFields.find((f: any) => f?.field_name === 'denomination_slt' && f.field_value);
        if (denomField && !isNaN(Number(denomField.field_value))) {
          const denomRow = await Denomination.findByPk(Number(denomField.field_value));
          if (denomRow) {
            denomField.field_label = denomField.field_label || 'Denomination';
            denomField.related_field_name = 'denominations';
            denomField.related_field_value = denomRow.name;
          }
        }

        // circulated -> circulateds
        const circField = filteredAdditionalFields.find((f: any) => f?.field_name === 'circulated' && f.field_value !== undefined && f.field_value !== null);
        if (circField && !isNaN(Number(circField.field_value))) {
          const circRow = await Circulated.findByPk(Number(circField.field_value));
          if (circRow) {
            circField.field_label = circField.field_label || 'Circulated';
            circField.related_field_name = 'circulateds';
            circField.related_field_value = circRow.name;
          }
        }

        // storage_capacity -> storage_capacities
        const storageField = filteredAdditionalFields.find((f: any) => f?.field_name === 'storage_capacity' && f.field_value);
        if (storageField && !isNaN(Number(storageField.field_value))) {
          const scRow = await StorageCapacity.findByPk(Number(storageField.field_value));
          if (scRow) {
            storageField.field_label = storageField.field_label || 'Storage Capacity';
            storageField.related_field_name = 'storage_capacities';
            storageField.related_field_value = scRow.name;
          }
        }

        // console_name_model -> console_models
        const consoleModelField = filteredAdditionalFields.find((f: any) => f?.field_name === 'console_name_model' && f.field_value);
        if (consoleModelField && !isNaN(Number(consoleModelField.field_value))) {
          const cmRow = await ConsoleModel.findByPk(Number(consoleModelField.field_value));
          if (cmRow) {
            consoleModelField.field_label = consoleModelField.field_label || 'Console Model';
            consoleModelField.related_field_name = 'console_models';
            consoleModelField.related_field_value = cmRow.name;
          }
        }

        // region_code -> region_codes
        const regionCodeField = filteredAdditionalFields.find((f: any) => f?.field_name === 'region_code' && f.field_value);
        if (regionCodeField && !isNaN(Number(regionCodeField.field_value))) {
          const rcRow = await RegionCode.findByPk(Number(regionCodeField.field_value));
          if (rcRow) {
            regionCodeField.field_label = regionCodeField.field_label || 'Region Code';
            regionCodeField.related_field_name = 'region_codes';
            regionCodeField.related_field_value = rcRow.name;
          }
        }

        // edition -> editions
        const editionField = filteredAdditionalFields.find((f: any) => f?.field_name === 'edition' && f.field_value);
        if (editionField && !isNaN(Number(editionField.field_value))) {
          const edRow = await Edition.findByPk(Number(editionField.field_value));
          if (edRow) {
            editionField.field_label = editionField.field_label || 'Edition';
            editionField.related_field_name = 'editions';
            editionField.related_field_value = edRow.name;
          }
        }

        // platform_console -> platform_consoles
        const platformField = filteredAdditionalFields.find((f: any) => f?.field_name === 'platform_console' && f.field_value);
        if (platformField && !isNaN(Number(platformField.field_value))) {
          const pcRow = await PlatformConsole.findByPk(Number(platformField.field_value));
          if (pcRow) {
            platformField.field_label = platformField.field_label || 'Platform';
            platformField.related_field_name = 'platform_consoles';
            platformField.related_field_value = pcRow.name;
          }
        }

        // year_date_of_issue -> years (+ year_date_of_issue_text)
        const ydoiField = filteredAdditionalFields.find((f: any) => f?.field_name === 'year_date_of_issue' && f.field_value);
        if (ydoiField && !isNaN(Number(ydoiField.field_value))) {
          const yearRow = await Year.findByPk(Number(ydoiField.field_value));
          if (yearRow) {
            ydoiField.field_label = ydoiField.field_label || 'Release Year';
            ydoiField.related_field_name = 'years';
            ydoiField.related_field_value = yearRow.name;
            (ydoiField as any).year_date_of_issue_text = yearRow.name;
          }
        }

        // speed -> speeds
        const speedField = filteredAdditionalFields.find((f: any) => f?.field_name === 'speed' && f.field_value);
        if (speedField && !isNaN(Number(speedField.field_value))) {
          const spRow = await Speed.findByPk(Number(speedField.field_value));
          if (spRow) {
            speedField.field_label = speedField.field_label || 'Speed';
            speedField.related_field_name = 'speeds';
            speedField.related_field_value = spRow.name;
          }
        }

        // types -> types
        const typesField = filteredAdditionalFields.find((f: any) => f?.field_name === 'types' && f.field_value);
        if (typesField && !isNaN(Number(typesField.field_value))) {
          const tRow = await Type.findByPk(Number(typesField.field_value));
          if (tRow) {
            typesField.field_label = typesField.field_label || 'Type';
            typesField.related_field_name = 'types';
            typesField.related_field_value = tRow.name;
          }
        }

        // record_size -> record_sizes
        const rsField = filteredAdditionalFields.find((f: any) => f?.field_name === 'record_size' && f.field_value);
        if (rsField && !isNaN(Number(rsField.field_value))) {
          const rsRow = await RecordSize.findByPk(Number(rsField.field_value));
          if (rsRow) {
            rsField.field_label = rsField.field_label || 'Record Size';
            rsField.related_field_name = 'record_sizes';
            rsField.related_field_value = rsRow.name;
          }
        }

        // publication_year -> add publication_year_text with related_field_value
        const pubYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'publication_year');
        if (pubYearField) {
          // Ensure related_field_value is present; if not, try to resolve from master
          if (!pubYearField.related_field_value && pubYearField.field_value && !isNaN(Number(pubYearField.field_value))) {
            const py = await PublicationYear.findByPk(Number(pubYearField.field_value));
            if (py) {
              pubYearField.related_field_name = pubYearField.related_field_name || 'publication_years';
              pubYearField.related_field_value = pubYearField.related_field_value || py.name;
            }
          }
          if (pubYearField.related_field_value) {
            (pubYearField as any).publication_year_text = pubYearField.related_field_value;
          }
        }

        // release_year -> add release_year_text with related_field_value
        const relYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'release_year');
        if (relYearField) {
          if (!relYearField.related_field_value && relYearField.field_value && !isNaN(Number(relYearField.field_value))) {
            const yr = await Year.findByPk(Number(relYearField.field_value));
            if (yr) {
              relYearField.related_field_name = relYearField.related_field_name || 'years';
              relYearField.related_field_value = relYearField.related_field_value || yr.name;
            }
          }
          if (relYearField.related_field_value) {
            (relYearField as any).release_year_text = relYearField.related_field_value;
          }
        }

        // vehicle_year -> add vehicle_year_text with related_field_value
        const vehYearField = filteredAdditionalFields.find((f: any) => f?.field_name === 'vehicle_year');
        if (vehYearField) {
          if (!vehYearField.related_field_value && vehYearField.field_value && !isNaN(Number(vehYearField.field_value))) {
            const vy = await VehicleYear.findByPk(Number(vehYearField.field_value));
            if (vy) {
              vehYearField.related_field_name = vehYearField.related_field_name || 'vehicle_years';
              vehYearField.related_field_value = vehYearField.related_field_value || vy.name;
            }
          }
          if (vehYearField.related_field_value) {
            (vehYearField as any).vehicle_year_text = vehYearField.related_field_value;
          }
        }

        // item_type -> item_types
        const itemTypeField = filteredAdditionalFields.find((f: any) => f?.field_name === 'item_type' && f.field_value);
        if (itemTypeField && !isNaN(Number(itemTypeField.field_value))) {
          const itemTypeRow = await ItemType.findByPk(Number(itemTypeField.field_value));
          if (itemTypeRow) {
            itemTypeField.field_label = itemTypeField.field_label || 'Item Type';
            itemTypeField.related_field_name = 'item_types';
            itemTypeField.related_field_value = itemTypeRow.name;
          }
        }

        // genre -> genres
        const genreField = filteredAdditionalFields.find((f: any) => f?.field_name === 'genre' && f.field_value);
        if (genreField && !isNaN(Number(genreField.field_value))) {
          const genreRow = await Genre.findByPk(Number(genreField.field_value));
          if (genreRow) {
            genreField.field_label = genreField.field_label || 'Genre';
            genreField.related_field_name = 'genres';
            genreField.related_field_value = genreRow.name;
          }
        }

        // featured_person_artist -> features (fallback to superhero_teams if needed)
        const fpaField = filteredAdditionalFields.find((f: any) => f?.field_name === 'featured_person_artist' && f.field_value !== undefined && f.field_value !== null);
        if (fpaField) {
          const numericId = Number(fpaField.field_value);
          if (!isNaN(numericId)) {
            let relatedName: string | undefined;
            let relatedTable = 'features';
            const featureRow = await Feature.findByPk(numericId);
            if (featureRow) relatedName = featureRow.name;
            if (!relatedName) {
              const teamRow = await SuperheroTeam.findByPk(numericId);
              if (teamRow) {
                relatedName = teamRow.name;
                relatedTable = 'superhero_teams';
              }
            }
            if (relatedName) {
              fpaField.field_label = fpaField.field_label || 'Featured Person/Artist';
              fpaField.related_field_name = relatedTable;
              fpaField.related_field_value = relatedName;
            }
          } else if (typeof fpaField.field_value === 'string' && fpaField.field_value.trim()) {
            // If API sent text instead of ID, reflect as related value
            fpaField.field_label = fpaField.field_label || 'Featured Person/Artist';
            fpaField.related_field_name = 'features';
            fpaField.related_field_value = fpaField.field_value.trim();
          }
        }

        // Map enum 1/0 to human text for is_rookie_card
        const rookieField = filteredAdditionalFields.find((f: any) => f?.field_name === 'is_rookie_card');
        if (rookieField && (rookieField.field_value === '1' || rookieField.field_value === 1)) {
          rookieField.related_field_value = 'Yes';
        }

        // Map enum 1/0 for is_variant: 1 -> Yes, else -> 0
        const isVariantField = filteredAdditionalFields.find((f: any) => f?.field_name === 'is_variant');
        if (isVariantField) {
          if (isVariantField.field_value === '1' || isVariantField.field_value === 1) {
            isVariantField.related_field_value = 'Yes';
          } else {
            isVariantField.related_field_value = '0';
          }
        }
      } catch (e) {
        console.warn('issue_number enrichment failed:', e);
      }
    }

    // Ensure is_controllers_included appears last in additionalFields
    if (Array.isArray(filteredAdditionalFields) && filteredAdditionalFields.length > 0) {
      const idx = filteredAdditionalFields.findIndex((f: any) => f?.field_name === 'is_controllers_included');
      if (idx > -1) {
        const [ctrl] = filteredAdditionalFields.splice(idx, 1);
        filteredAdditionalFields.push(ctrl);
      }
    }

    const transformedCard = {
      id: tradingCard.id,
      code: tradingCard.code,
      trading_card_status: tradingCard.trading_card_status,
      category_id: tradingCard.category_id,
      search_param: tradingCard.search_param,
      title: tradingCard.title,
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
      usa_shipping_flat_rate: (tradingCard as any).usa_shipping_flat_rate,
      canada_shipping_flat_rate: (tradingCard as any).canada_shipping_flat_rate,
      year_date_of_issue_text: (() => {
        if (Array.isArray(filteredAdditionalFields)) {
          const ydoi = filteredAdditionalFields.find((f: any) => f?.field_name === 'year_date_of_issue');
          return ydoi?.related_field_value || (ydoi as any)?.year_date_of_issue_text || null;
        }
        return null;
      })(),
      // Add all non-null additional fields from trading card (filtered)
      additionalFields: filteredAdditionalFields,
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
        null,
      // Add all other non-null/non-empty fields from trading_cards table
      ...additionalNonNullFields
    };
    
    return sendApiResponse(res, 200, true, "Trading card retrieved successfully", transformedCard);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};


// Public endpoint for getting trading card details
export const getTradingCard = async (req: Request, res: Response) => {
  return getTradingCardCommon(req, res, false);
};

// User endpoint for getting trading card details (same functionality as public)

export const getUserTradingCard = async (req: Request, res: Response) => {
  return getTradingCardForEdit(req, res, true);
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
        title: card.title,
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
      }
      
      // If card is already traded, user can't trade
      if (card.is_traded === '1') {
        canTradeOrOffer = false;
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

    // If player_id_text is provided, ensure it exists in master (players) and set player_id
    if (requestData.player_id_text && String(requestData.player_id_text).trim()) {
      try {
        const [player] = await (Player as any).findOrCreate({
          where: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(categoryIdNum),
            player_status: '1'
          }
        });
        if (player && player.id) {
          (requestData as any).player_id = player.id;
        }
      } catch (e) {
        console.warn('player upsert failed (create):', e);
      }
    }

    // If publication_year_text is provided, ensure it exists in master (publication_years) and set publication_year id
    if (requestData.publication_year_text && String(requestData.publication_year_text).trim()) {
      try {
        const [pubYear] = await (PublicationYear as any).findOrCreate({
          where: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(categoryIdNum),
            status: '1'
          }
        });
        if (pubYear && pubYear.id) {
          (requestData as any).publication_year = pubYear.id;
        }
      } catch (e) {
        console.warn('publication_year upsert failed (create):', e);
      }
    }

    // If release_year_text is provided, ensure it exists in master (years) and set release_year id
    if (requestData.release_year_text && String(requestData.release_year_text).trim()) {
      try {
        const [relYear] = await (Year as any).findOrCreate({
          where: {
            name: String(requestData.release_year_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            name: String(requestData.release_year_text).trim(),
            category_id: String(categoryIdNum),
            status: '1'
          }
        });
        if (relYear && relYear.id) {
          (requestData as any).release_year = relYear.id;
        }
      } catch (e) {
        console.warn('release_year upsert failed (years):', e);
      }
    }

    // Handle field mapping for specific fields
    // Map mint_mark_slt to mint_mark
    if (requestData.mint_mark_slt !== undefined) {
      requestData.mint_mark = requestData.mint_mark_slt;
    }

    // Map year_date_of_issue_text to year_of_issue
    if (requestData.year_date_of_issue_text !== undefined) {
      requestData.year_of_issue = requestData.year_date_of_issue_text;
    }

    // Ensure option_values exist for how_many_controllers in item_columns and merge incoming value
    try {
      const defaultOptions: Record<string, string> = { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10" };
      const incomingValRaw = (requestData as any).how_many_controllers;
      const incomingVal = incomingValRaw !== undefined && incomingValRaw !== null ? String(incomingValRaw).trim() : '';

      const howManyColumn = await (ItemColumn as any).findOne({ where: { name: 'how_many_controllers' } });
      if (howManyColumn) {
        let parsed: Record<string, string> | null = null;
        const currentStr = (howManyColumn.option_values ?? '').toString();
        if (currentStr) {
          try { parsed = JSON.parse(currentStr); } catch { parsed = null; }
        }
        if (!parsed || typeof parsed !== 'object') {
          parsed = { ...defaultOptions };
        }
        let changed = false;
        if (incomingVal) {
          if (!Object.prototype.hasOwnProperty.call(parsed, incomingVal)) {
            parsed[incomingVal] = incomingVal;
            changed = true;
          }
        }
        // If option_values was empty, we initialized defaults
        if (!currentStr) {
          changed = true;
        }
        if (changed) {
          await howManyColumn.update({ option_values: JSON.stringify(parsed) });
        }
      }
    } catch (e) {
      console.warn('Failed to ensure/merge option_values for how_many_controllers:', e);
    }

    // how_many_controllers field is already correctly named, no mapping needed

    // Handle file uploads
    const uploadPath = process.cwd() + '/public/user/assets/images/trading_cards_img/';
    
    // Process main card images
    if (req.files) {
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

      // trading_card_img & trading_card_img_back
      if (!Array.isArray(filesMap)) {
        if (filesMap.trading_card_img && filesMap.trading_card_img[0]) {
          requestData.trading_card_img = uploadOne(filesMap.trading_card_img[0] as any, uploadPath);
        }
        if (filesMap.trading_card_img_back && filesMap.trading_card_img_back[0]) {
          requestData.trading_card_img_back = uploadOne(filesMap.trading_card_img_back[0] as any, uploadPath);
        }
      } else {
        const mainFront = (filesMap as Express.Multer.File[]).find(f => f.fieldname === 'trading_card_img');
        const mainBack = (filesMap as Express.Multer.File[]).find(f => f.fieldname === 'trading_card_img_back');
        if (mainFront) requestData.trading_card_img = uploadOne(mainFront as any, uploadPath);
        if (mainBack) requestData.trading_card_img_back = uploadOne(mainBack as any, uploadPath);
      }

      // Handle additional_images - can be both text filenames and actual file uploads
      const additionalImages: string[] = [];
      
      // First, check if additional_images is provided as text in request body
      if (requestData.additional_images) {
        if (typeof requestData.additional_images === 'string') {
          // Single image as text
          if (requestData.additional_images.trim()) {
            additionalImages.push(requestData.additional_images.trim());
          }
        } else if (Array.isArray(requestData.additional_images)) {
          // Multiple images as text array
          for (const img of requestData.additional_images) {
            if (typeof img === 'string' && img.trim()) {
              additionalImages.push(img.trim());
            }
          }
        }
      }
      
      // Then, collect additional_images from file uploads
      const collectedAdditional: Express.Multer.File[] = [];
      if (Array.isArray(filesMap)) {
        for (const f of filesMap as Express.Multer.File[]) {
          if (f.fieldname === 'additional_images' || f.fieldname === 'additional_images[]' || f.fieldname.startsWith('additional_images[')) {
            collectedAdditional.push(f);
          }
        }
      } else {
        // Known keys
        const keys = Object.keys(filesMap);
        for (const key of keys) {
          if (key === 'additional_images' || key === 'additional_images[]' || key.startsWith('additional_images[')) {
            const arr = (filesMap as any)[key] as Express.Multer.File[];
            if (Array.isArray(arr)) collectedAdditional.push(...arr);
          }
        }
      }

      // Upload actual files and add to additionalImages array
      if (collectedAdditional.length > 0) {
        for (const file of collectedAdditional) {
          const uploadedPath = uploadOne(file as any, uploadPath);
          if (uploadedPath && String(uploadedPath).trim()) {
            additionalImages.push(uploadedPath);
          }
        }
      }
      
      // Limit to maximum 4 images and set in requestData
      if (additionalImages.length > 0) {
        // Check if more than 4 images are provided
        if (additionalImages.length > 4) {
          console.log(`[DEBUG CONTROLLER SAVE] Error: ${additionalImages.length} images provided, maximum 4 allowed`);
          return sendApiResponse(res, 400, false, `Maximum 4 additional images allowed. You provided ${additionalImages.length} images.`);
        }
        
        requestData.additional_images = additionalImages.slice(0, 4);
      }
    }

    // Validate that both front and back images are provided (mandatory)
    if (!requestData.trading_card_img) {
      return sendApiResponse(res, 400, false, "Front image is required");
    }
    
    if (!requestData.trading_card_img_back) {
      return sendApiResponse(res, 400, false, "Back image is required");
    }

    // Find-or-create player if player_id_text provided
    if (requestData.player_id_text && String(requestData.player_id_text).trim()) {
      try {
        const [player] = await (Player as any).findOrCreate({
          where: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(categoryIdNum),
            player_status: '1'
          }
        });
        if (player && player.id) {
          (requestData as any).player_id = player.id;
        }
      } catch (e) {
        console.warn('player upsert failed (create):', e);
      }
    }

    // Find-or-create publication_year if publication_year_text provided
    if (requestData.publication_year_text && String(requestData.publication_year_text).trim()) {
      try {
        const [pubYear] = await (PublicationYear as any).findOrCreate({
          where: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(categoryIdNum),
            status: '1'
          }
        });
        if (pubYear && pubYear.id) {
          (requestData as any).publication_year = pubYear.id;
        }
      } catch (e) {
        console.warn('publication_year upsert failed (create):', e);
      }
    }

    // Find-or-create vehicle_year if vehicle_year_text provided
    if (requestData.vehicle_year_text && String(requestData.vehicle_year_text).trim()) {
      try {
        const [vehYear] = await (VehicleYear as any).findOrCreate({
          where: {
            name: String(requestData.vehicle_year_text).trim(),
            category_id: String(categoryIdNum)
          },
          defaults: {
            name: String(requestData.vehicle_year_text).trim(),
            category_id: String(categoryIdNum),
            status: '1'
          }
        });
        if (vehYear && vehYear.id) {
          (requestData as any).vehicle_year = vehYear.id;
        }
      } catch (e) {
        console.warn('vehicle_year upsert failed (create):', e);
      }
    }

    // Call service to save trading card
    const result = await tradingcardService.saveTradingCard(requestData, categoryIdNum, userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to save trading card");
    }

    // Get the created trading card with enhanced data (including _text fields)
    const createdCardData = await tradingcardService.getTradingCardById(result.data.tradingCard.id, userId);
    
    if (!createdCardData) {
      return sendApiResponse(res, 404, false, "Created trading card not found");
    }

    return sendApiResponse(
      res, 
      201, 
      true, 
      "Trading card saved successfully", 
      createdCardData
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

    // Handle field mapping for specific fields
    // Map mint_mark_slt to mint_mark
    if (requestData.mint_mark_slt !== undefined) {
      requestData.mint_mark = requestData.mint_mark_slt;
    }

    // Map year_date_of_issue_text to year_of_issue
    if (requestData.year_date_of_issue_text !== undefined) {
      requestData.year_of_issue = requestData.year_date_of_issue_text;
    }

    // how_many_controllers field is already correctly named, no mapping needed

    // Handle file uploads
    const uploadPath = process.cwd() + '/public/user/assets/images/trading_cards_img/';
    
    console.log(`[DEBUG CONTROLLER UPDATE] Starting file processing for cardId: ${cardId}`);
    console.log(`[DEBUG CONTROLLER UPDATE] Initial requestData.additional_images:`, requestData.additional_images);
    console.log(`[DEBUG CONTROLLER UPDATE] req.files exists:`, !!req.files);
    console.log(`[DEBUG CONTROLLER UPDATE] req.files:`, req.files);
    
    // Handle additional_images - can be both text filenames and actual file uploads
    const additionalImages: string[] = [];
    
    // First, check if additional_images is provided as text in request body
    if (requestData.additional_images) {
      console.log(`[DEBUG CONTROLLER UPDATE] Processing additional_images from request body:`, requestData.additional_images);
      if (typeof requestData.additional_images === 'string') {
        // Single image as text
        if (requestData.additional_images.trim()) {
          additionalImages.push(requestData.additional_images.trim());
          console.log(`[DEBUG CONTROLLER UPDATE] Added text image:`, requestData.additional_images.trim());
        }
      } else if (Array.isArray(requestData.additional_images)) {
        // Multiple images as text array
        for (const img of requestData.additional_images) {
          if (typeof img === 'string' && img.trim()) {
            additionalImages.push(img.trim());
            console.log(`[DEBUG CONTROLLER UPDATE] Added text image from array:`, img.trim());
          }
        }
      }
    }
    
    // Process main card images - only actual binary files
    if (req.files) {
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

      if (!Array.isArray(filesMap)) {
        // Only process if it's an actual binary file, not a text filename
        if (filesMap.trading_card_img && filesMap.trading_card_img[0] && 
            filesMap.trading_card_img[0].buffer && filesMap.trading_card_img[0].buffer.length > 0 && 
            filesMap.trading_card_img[0].size > 0) {
          requestData.trading_card_img = uploadOne(filesMap.trading_card_img[0] as any, uploadPath);
        }
        if (filesMap.trading_card_img_back && filesMap.trading_card_img_back[0] && 
            filesMap.trading_card_img_back[0].buffer && filesMap.trading_card_img_back[0].buffer.length > 0 && 
            filesMap.trading_card_img_back[0].size > 0) {
          requestData.trading_card_img_back = uploadOne(filesMap.trading_card_img_back[0] as any, uploadPath);
        }
      } else {
        const mainFront = (filesMap as Express.Multer.File[]).find(f => f.fieldname === 'trading_card_img');
        const mainBack = (filesMap as Express.Multer.File[]).find(f => f.fieldname === 'trading_card_img_back');
        
        // Only process if it's an actual binary file, not a text filename
        if (mainFront && mainFront.buffer && mainFront.buffer.length > 0 && mainFront.size > 0) {
          requestData.trading_card_img = uploadOne(mainFront as any, uploadPath);
        }
        if (mainBack && mainBack.buffer && mainBack.buffer.length > 0 && mainBack.size > 0) {
          requestData.trading_card_img_back = uploadOne(mainBack as any, uploadPath);
        }
      }

      // Then, collect additional_images from file uploads
      const collectedAdditional: Express.Multer.File[] = [];
      if (Array.isArray(filesMap)) {
        for (const f of filesMap as Express.Multer.File[]) {
          if (f.fieldname === 'additional_images' || f.fieldname === 'additional_images[]' || f.fieldname.startsWith('additional_images[')) {
            // Debug: Log file details
            console.log(`[DEBUG] Processing additional image file:`, {
              fieldname: f.fieldname,
              originalname: f.originalname,
              size: f.size,
              hasBuffer: !!f.buffer,
              bufferLength: f.buffer ? f.buffer.length : 0
            });
            
            // Check if it's a valid file (either has buffer or path for disk storage)
            if ((f.buffer && f.buffer.length > 0) || (f.path && f.size > 0)) {
              console.log(`[DEBUG] Adding valid file: ${f.originalname} (buffer: ${!!f.buffer}, path: ${!!f.path})`);
              collectedAdditional.push(f);
            } else {
              console.log(`[DEBUG] Skipping invalid file: ${f.originalname}`);
            }
          }
        }
      } else {
        const keys = Object.keys(filesMap);
        for (const key of keys) {
          if (key === 'additional_images' || key === 'additional_images[]' || key.startsWith('additional_images[')) {
            const arr = (filesMap as any)[key] as Express.Multer.File[];
            if (Array.isArray(arr)) {
              for (const file of arr) {
                // Debug: Log file details
                console.log(`[DEBUG] Processing additional image file (object):`, {
                  fieldname: file.fieldname,
                  originalname: file.originalname,
                  size: file.size,
                  hasBuffer: !!file.buffer,
                  bufferLength: file.buffer ? file.buffer.length : 0
                });
                
                // Check if it's a valid file (either has buffer or path for disk storage)
                if (file && ((file.buffer && file.buffer.length > 0) || (file.path && file.size > 0))) {
                  console.log(`[DEBUG] Adding valid file (object): ${file.originalname} (buffer: ${!!file.buffer}, path: ${!!file.path})`);
                  collectedAdditional.push(file);
                } else {
                  console.log(`[DEBUG] Skipping invalid file (object): ${file.originalname}`);
                }
              }
            }
          }
        }
      }

      console.log(`[DEBUG] Total collected additional images from files: ${collectedAdditional.length}`);
      
      // Upload actual files and add to additionalImages array
      if (collectedAdditional.length > 0) {
        console.log(`[DEBUG CONTROLLER UPDATE] Uploading ${collectedAdditional.length} additional files`);
        for (const file of collectedAdditional) {
          console.log(`[DEBUG CONTROLLER UPDATE] Uploading file: ${file.originalname}`);
          const imagePath = uploadOne(file as any, uploadPath);
          console.log(`[DEBUG CONTROLLER UPDATE] Upload result: ${imagePath}`);
          if (imagePath && String(imagePath).trim()) {
            additionalImages.push(imagePath);
            console.log(`[DEBUG CONTROLLER UPDATE] Added uploaded image: ${imagePath}`);
          }
        }
      }
      
    }
    
    // Final processing of additional images - always run this
    if (additionalImages.length > 0) {
      // Check if more than 4 images are provided
      if (additionalImages.length > 4) {
        console.log(`[DEBUG CONTROLLER UPDATE] Error: ${additionalImages.length} images provided, maximum 4 allowed`);
        return sendApiResponse(res, 400, false, `Maximum 4 additional images allowed. You provided ${additionalImages.length} images.`);
      }
      
      requestData.additional_images = additionalImages.slice(0, 4);
      console.log(`[DEBUG CONTROLLER UPDATE] Final additional images array (max 4):`, requestData.additional_images);
      console.log(`[DEBUG CONTROLLER UPDATE] Setting requestData.additional_images to:`, requestData.additional_images);
    } else {
      console.log(`[DEBUG CONTROLLER UPDATE] No additional images to process`);
      console.log(`[DEBUG CONTROLLER UPDATE] additionalImages array is empty:`, additionalImages);
    }

    // Call service to update trading card
    // If player_id_text is provided on update, ensure it exists in master (players) and set player_id
    if (requestData.player_id_text && String(requestData.player_id_text).trim()) {
      try {
        const effectiveCategoryId = tradingCard.category_id;
        const [player, createdP] = await (Player as any).findOrCreate({
          where: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(effectiveCategoryId)
          },
          defaults: {
            player_name: String(requestData.player_id_text).trim(),
            category_id: String(effectiveCategoryId),
            player_status: '1'
          }
        });
        if (player && player.id) {
          (requestData as any).player_id = player.id;
        }
      } catch (e) {
        console.warn('player upsert failed (update):', e);
      }
    }

    // If publication_year_text is provided on update, upsert into publication_years and set foreign key
    if (requestData.publication_year_text && String(requestData.publication_year_text).trim()) {
      try {
        const effectiveCategoryId = tradingCard.category_id;
        const [pubYear, createdY] = await (PublicationYear as any).findOrCreate({
          where: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(effectiveCategoryId)
          },
          defaults: {
            name: String(requestData.publication_year_text).trim(),
            category_id: String(effectiveCategoryId),
            status: '1'
          }
        });
        if (pubYear && pubYear.id) {
          (requestData as any).publication_year = pubYear.id;
        }
      } catch (e) {
        console.warn('publication_year upsert failed (update):', e);
      }
    }

    // If vehicle_year_text is provided on update, upsert into vehicle_years and set foreign key
    if (requestData.vehicle_year_text && String(requestData.vehicle_year_text).trim()) {
      try {
        const effectiveCategoryId = tradingCard.category_id;
        const [vehYear, createdV] = await (VehicleYear as any).findOrCreate({
          where: {
            name: String(requestData.vehicle_year_text).trim(),
            category_id: String(effectiveCategoryId)
          },
          defaults: {
            name: String(requestData.vehicle_year_text).trim(),
            category_id: String(effectiveCategoryId),
            status: '1'
          }
        });
        if (vehYear && vehYear.id) {
          (requestData as any).vehicle_year = vehYear.id;
        }
      } catch (e) {
        console.warn('vehicle_year upsert failed (update):', e);
      }
    }

    // If release_year_text is provided on update, upsert into years and set foreign key
    if (requestData.release_year_text && String(requestData.release_year_text).trim()) {
      try {
        const effectiveCategoryId = tradingCard.category_id;
        console.log(`[DEBUG] Upserting release_year_text: "${requestData.release_year_text}" for category: ${effectiveCategoryId}`);
        
        const [relYear, created] = await (Year as any).findOrCreate({
          where: {
            name: String(requestData.release_year_text).trim(),
            category_id: String(effectiveCategoryId)
          },
          defaults: {
            name: String(requestData.release_year_text).trim(),
            category_id: String(effectiveCategoryId),
            status: '1'
          }
        });
        
        console.log(`[DEBUG] findOrCreate result - ID: ${relYear.id}, Created: ${created}, Name: ${relYear.name}`);
        
        if (relYear && relYear.id) {
          (requestData as any).release_year = relYear.id;
          console.log(`[DEBUG] Set requestData.release_year to: ${relYear.id}`);
        }
      } catch (e) {
        console.warn('release_year upsert failed (update, years):', e);
      }
    }

    console.log(`[DEBUG CONTROLLER UPDATE] About to call service with requestData:`, JSON.stringify(requestData, null, 2));
    console.log(`[DEBUG CONTROLLER UPDATE] Specifically checking additional_images:`, requestData.additional_images);
    const result = await tradingcardService.updateTradingCard(cardIdNum, requestData, userId);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error || "Failed to update trading card");
    }

    // Get the updated trading card with enhanced data (including _text fields)
    const updatedCardData = await tradingcardService.getTradingCardById(cardIdNum, userId);
    
    if (!updatedCardData) {
      return sendApiResponse(res, 404, false, "Updated trading card not found");
    }

    return sendApiResponse(
      res, 
      200, 
      true, 
      "Trading card updated successfully", 
      updatedCardData
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
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

    
    const result = await tradingcardService.getPublicProfileTradingCards(
      Number(userId),
      page,
      perPage,
      authenticatedUserId,
      categoryId
    );


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
              title: (card as any).title ?? card.trading_card_slug,
         trader_id: card.trader_id,
         creator_id: card.creator_id,
         trading_card_img: card.trading_card_img,
         trading_card_img_back: card.trading_card_img_back,
         trading_card_slug: card.trading_card_slug,
         trading_card_recent_trade_value: card.trading_card_recent_trade_value,
         trading_card_asking_price: card.trading_card_asking_price,
         search_param: card.search_param  || null,
         sport_name: card.sport_name || null,
        sport_icon: card.sport_icon || null,
         card_condition: card.card_condition || null,
         trade_card_status: card.trade_card_status || null,
              can_trade: card.can_trade,
              can_buy: card.can_buy,
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
      // Optionally determine user-specific interested_in if JWT provided
      let interestedIds = new Set<number>();
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
          if (userId) {
            const cardIds = result.data.cards.map((c: any) => c.id);
            if (cardIds.length > 0) {
              const rows = await sequelize.query(
                `SELECT trading_card_id FROM interested_in WHERE user_id = :userId AND trading_card_id IN (:ids)`,
                { replacements: { userId, ids: cardIds }, type: QueryTypes.SELECT }
              );
              interestedIds = new Set((rows as any[]).map(r => Number((r as any).trading_card_id)));
            }
          }
        }
      } catch {}

      // Transform the response to include only necessary fields
      const response = result.data.cards.map((card: any) => ({
        id: card.id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        title: card.title,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param,
        sport_name: card.sport_name,
        sport_icon: card.sport_icon,
        is_traded: card.is_traded,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        trade_card_status: card.trade_card_status,
        can_trade: card.can_trade,
        can_buy: card.can_buy,
        interested_in: interestedIds.size > 0 ? interestedIds.has(card.id) : false,
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

// GET /api/tradingCards/popularTradingCards (Latest 8 trading cards, same response shape/conditions)
export const getLatestTradingCards = async (req: Request, res: Response) => {
  try {
    // Always limit to latest 8
    const page = 1;
    const perPage = 8;
    
    // If JWT present, exclude own cards
    let excludeUserIdCondition = '';
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
        if (userId && !isNaN(Number(userId))) {
          excludeUserIdCondition = `\n        AND tc.trader_id != ${Number(userId)}\n    `;
        }
      }
    } catch {}

    // Build latest cards query (same base conditions as public listings)
    const whereClause = `
      WHERE tc.mark_as_deleted IS NULL
        AND c.sport_status = 1
        AND tc.is_demo = 0
        AND tc.is_traded != 1
        AND tc.trading_card_status = '1'
        ${excludeUserIdCondition}
    `;
    
    const dataQuery = `
      SELECT 
        tc.id,
        tc.title,
        tc.trading_card_img,
        tc.trading_card_img_back,
        tc.trading_card_slug,
        tc.trading_card_recent_trade_value,
        tc.trading_card_asking_price,
        tc.search_param, 
        c.sport_name,
        c.sport_icon,
        tc.can_trade,
        tc.can_buy,
        tc.is_traded,
        tc.trader_id,
        u.username as trader_name,
        CASE 
          WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
          WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
          WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
          WHEN tc.is_traded = '0' THEN 'Offer Accepted'
          WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
          ELSE 'Not Available'
        END as trade_card_status,
        CASE 
          WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
          WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
          WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
          WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
          ELSE NULL
        END as card_condition
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      LEFT JOIN users u ON tc.trader_id = u.id
      LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
      ${whereClause}
      ORDER BY tc.created_at DESC
      LIMIT ${perPage} OFFSET 0
    `;

    const rows = await sequelize.query(dataQuery, { type: QueryTypes.SELECT });

    if (rows && Array.isArray(rows)) {
      let interestedIds = new Set<number>();
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
          if (userId) {
            const cardIds = (rows as any[]).map((c: any) => c.id);
            if (cardIds.length > 0) {
              const rows = await sequelize.query(
                `SELECT trading_card_id FROM interested_in WHERE user_id = :userId AND trading_card_id IN (:ids)`,
                { replacements: { userId, ids: cardIds }, type: QueryTypes.SELECT }
              );
              interestedIds = new Set((rows as any[]).map(r => Number((r as any).trading_card_id)));
            }
          }
        }
      } catch {}

      const response = (rows as any[]).map((card: any) => ({
        id: card.id,
        title: card.title ?? card.trading_card_slug,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param,
        sport_name: card.sport_name,
        sport_icon: card.sport_icon,
        can_trade: card.can_trade,
        can_buy: card.can_buy,
        is_traded: card.is_traded,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        trade_card_status: card.trade_card_status,
        interested_in: interestedIds.size > 0 ? interestedIds.has(card.id) : false,
        card_condition: card.card_condition
      }));

      return sendApiResponse(res, 200, true, "Popular trading cards retrieved successfully", response, {
        current_page: 1,
        per_page: perPage,
        total: response.length,
        total_pages: 1,
        has_next_page: false,
        has_prev_page: false
      });
    } else {
      return sendApiResponse(res, 400, false, "Failed to get latest trading cards", []);
    }
  } catch (error: any) {
    console.error("Get latest trading cards error:", error);
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
      // Determine interested_in only if user is logged in
      let interestedIds = new Set<number>();
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
          if (userId) {
            const cardIds = result.data.cards.map((c: any) => c.id);
            if (cardIds.length > 0) {
              const rows = await sequelize.query(
                `SELECT trading_card_id FROM interested_in WHERE user_id = :userId AND trading_card_id IN (:ids)`,
                { replacements: { userId, ids: cardIds }, type: QueryTypes.SELECT }
              );
              interestedIds = new Set((rows as any[]).map(r => Number((r as any).trading_card_id)));
            }
          }
        }
      } catch {}

      const response = result.data.cards.map((card: any) => ({
        id: card.id,
        trading_card_img: card.trading_card_img,
        trading_card_img_back: card.trading_card_img_back,
        title: card.title,
        trading_card_recent_trade_value: card.trading_card_recent_trade_value,
        trading_card_asking_price: card.trading_card_asking_price,
        search_param: card.search_param,
        sport_name: card.sport_name,
        can_trade: (card as any).can_trade ?? 0,
        can_buy: (card as any).can_buy ?? 0,
        is_traded: card.is_traded,
        trader_id: card.trader_id,
        trader_name: card.trader_name,
        trade_card_status: card.trade_card_status,
        interested_in: interestedIds.size > 0 ? interestedIds.has(card.id) : false,
        card_condition: card.card_condition
      }));
// console.log("response==============",response);
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
      } catch (jwtError) {
        // Token is invalid, but we'll continue without authentication
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
          title: card.title ?? card.trading_card_slug,
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
          can_trade: card.can_trade,
          can_buy: card.can_buy,
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
