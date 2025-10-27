import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { uploadOne } from "../utils/fileUpload.js";
import jwt from "jsonwebtoken";
import { decodeJWTToken } from "../utils/jwt.js";
import { BuySellCard } from "../models/buySellCard.model.js";
import { ReviewCollection } from "../models/reviewCollection.model.js";
import { QueryTypes } from "sequelize";
import { Op } from 'sequelize';
import { Dictionary } from "../models/dictionary.model.js";
import { CategoryShippingRate } from "../models/categoryShippingRates.model.js";
const { EmailHelperService } = await import('../services/emailHelper.service.js');
// POST /api/common/check-word-quality
export const checkWordQuality = async (req: Request, res: Response) => {
  try {
    const wordInput = (req.body?.word ?? '').toString();
    if (!wordInput || !wordInput.trim()) {
      return sendApiResponse(res, 400, false, "'word' is required in body", []);
    }

    const lowered = wordInput.toLowerCase();
    const words = Array.from(new Set(lowered.split(/\s+/).filter(Boolean)));

    if (words.length === 0) {
      return sendApiResponse(res, 200, true, "OK", { status: true });
    }

    const data = await Dictionary.findAll({
      where: {
        // Cast to any to satisfy Sequelize TS typing for Op.in with string[]
        name: { [Op.in]: words as any },
        status: '0'
      } as any,
      attributes: ['name']
    });

    if (data && data.length > 0) {
      const inAppropriateWords = data.map((d: any) => d.name);
      return sendApiResponse(res, 200, false, "Inappropriate words found", { inAppropriateWords });
    }

    return sendApiResponse(res, 200, true, "OK", []);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, error.message || 'Internal server error', []);
  }
};

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

// GET /api/user/my-profile - Get authenticated user's profile details
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Get user profile data
    const profileData = await UserService.getMyProfile(userId);

    if (!profileData) {
      return sendApiResponse(res, 404, false, "User profile not found", []);
    }


    // Transform the response to include only required user details
    const response = {
      id: profileData.user.id,
      first_name: profileData.user.first_name,
      last_name: profileData.user.last_name,
      username: profileData.user.username,
      profile_picture: profileData.user.profile_picture,
      email: profileData.user.email,
      paypal_business_email: (profileData.user as any).paypal_business_email,
      phone_number: profileData.user.phone_number,
      country_code: profileData.user.country_code,
      about_user: profileData.user.about_user,
      bio: profileData.user.bio,
      ratings: profileData.user.ratings,
      ebay_store_url: profileData.user.ebay_store_url,
      cxp_coins: profileData.user.cxp_coins,
      joined_date: profileData.user.joined_date,
      updated_at: profileData.user.updatedAt,
      address_exist: (profileData.user as any).address_exist,
      social_links: profileData.socialLinks,
      interestedCardsCount: profileData.interestedCardsCount,
      interested_categories: profileData.interestedCategories
    };

    return sendApiResponse(res, 200, true, "User profile retrieved successfully", [response]);

  } catch (error: any) {
    console.error("Get my profile error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/user/profile/:userId - Get user profile details without authentication
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userIdParam = req.params.userId as string;

    // Validate required parameters
    if (!userIdParam || isNaN(Number(userIdParam)) || Number(userIdParam) <= 0) {
      return sendApiResponse(res, 400, false, "Valid user ID is required");
    }

    const userId = parseInt(userIdParam, 10);

    // Get logged-in user ID from token (optional - for following status)
    let loggedInUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        loggedInUserId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
      } catch (jwtError) {
        // Token is invalid or expired, but we still proceed without following status
        loggedInUserId = null;
      }
    }

    // Get user profile data
    const profileData = await UserService.getUserProfile(userId, loggedInUserId);

    if (!profileData) {
      return sendApiResponse(res, 404, false, "User not found");
    }

    // Format joined_date to 'Aug, 2025' format
    let formattedJoinedDate = '';
    if (profileData.user.createdAt) {
      const date = new Date(profileData.user.createdAt);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      formattedJoinedDate = `${month}, ${year}`;
    } else {
      // Fallback to current date if createdAt is missing
      const currentDate = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      formattedJoinedDate = `${month}, ${year}`;
    }

    // Transform the response to match the Laravel structure
    const response = {
      id: profileData.user.id,
      first_name: profileData.user.first_name,
      last_name: profileData.user.last_name,
      username: profileData.user.username,
      profile_picture: profileData.user.profile_picture,
      email: profileData.user.email,
      followers: profileData.user.followers,
      trade_transactions: profileData.user.trade_transactions,
      trading_cards: profileData.user.trading_cards,
      ratings: profileData.user.ratings,
      ebay_url: profileData.user.ebay_store_url,
      joined_date: formattedJoinedDate,
      updated_at: profileData.user.updatedAt,
      cardStats: profileData.cardStats,
      reviews: profileData.reviews,
      interestedCardsCount: profileData.interestedCardsCount,
      tradeCount: profileData.tradeCount,
      followingCount: profileData.followingCount,
      following: profileData.following || false,  // ✅ NEW: Following status
      social_links: profileData.socialLinks  // ✅ NEW: Social media links
    };

    return sendApiResponse(res, 200, true, "User profile retrieved successfully", [response]);

  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/user/:id - Get user by ID (existing method)
export const getUserById = async (req: Request, res: Response) => {
  try {
    
    const idParam = req.params.id;
    
    if (!idParam || isNaN(Number(idParam))) {
      return sendApiResponse(res, 400, false, "Valid user ID is required");
    }
    const id = parseInt(idParam);
    const user = await UserService.getUserById(id);
    
    if (!user) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }
    
    return sendApiResponse(res, 200, true, "User retrieved successfully", [user]);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// PUT /api/user/:id - Update user (existing method)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam || isNaN(Number(idParam))) {
      return sendApiResponse(res, 400, false, "Valid user ID is required");
    }
    const id = parseInt(idParam);
    const data = req.body;
    
    const user = await UserService.updateUser(id, data);
    
    if (!user) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }
    
    return sendApiResponse(res, 200, true, "User updated successfully", [user]);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/users/top-traders - Get top traders based on ratings and trading cards
export const getTopTraders = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;
    
    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    const result = await UserService.getTopTraders(page, perPage);

    if (result.success && result.data) {
      // Transform the response to include only necessary fields
      const response = result.data.traders.map((trader: any) => ({
        trader_id: trader.id,
        profile_picture: trader.profile_picture,
        first_name: trader.first_name,
        last_name: trader.last_name,
        ratings: trader.ratings,
        username: trader.username,
        joinedDate: trader.created_at
      }));

      return sendApiResponse(res, 200, true, "Top traders retrieved successfully", response, result.data.pagination);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get top traders", []);
    }

  } catch (error: any) {
    console.error("Get top traders error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/users/traders-list - Get traders list with pagination (excludes authenticated user if token provided)
export const getTradersList = async (req: Request, res: Response) => {
  try {
    // Get pagination parameters
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;
    
    const page = pageParam && !isNaN(Number(pageParam)) ? parseInt(pageParam) : 1;
    const perPage = perPageParam && !isNaN(Number(perPageParam)) ? parseInt(perPageParam) : 10;

    // Validate pagination parameters
    if (page < 1) {
      return sendApiResponse(res, 400, false, "Page must be greater than 0", [], {
        current_page: 1,
        per_page: 10,
        total: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false
      });
    }

    if (perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "PerPage must be between 1 and 100", [], {
        current_page: 1,
        per_page: 10,
        total: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false
      });
    }

    // Get user ID from token if available (optional authentication)
    // Try to extract user from token if Authorization header is provided
    let excludeUserId: number | undefined;
    
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        
        excludeUserId = decoded.user_id;  // Changed from decoded.id to decoded.user_id
      }
    } catch (error: any) {
      // Token is invalid or not provided, continue without excluding any user
      excludeUserId = undefined;
    }

    const result = await UserService.getTradersList(page, perPage, excludeUserId);

    if (!result.data || result.data.length === 0) {
      return sendApiResponse(res, 200, true, "No traders found", [], {
        current_page: page,
        per_page: perPage,
        total: result.total,
        total_pages: result.totalPages,
        has_next_page: result.hasNextPage,
        has_prev_page: result.hasPrevPage
      });
    }

    // Transform the response to include only necessary fields
    const response = result.data.map((trader: any) => {
      // Extract only filename from profile_picture path
      let profilePictureName = '';
      if (trader.profile_picture) {
        const pathParts = trader.profile_picture.split('/');
        profilePictureName = pathParts[pathParts.length - 1];
      }

      // Format joined_date to "Month Year" format
      let joinedDateFormatted = '';
      if (trader.created_at) {
        const date = new Date(trader.created_at);
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        joinedDateFormatted = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      }

      return {
        id: trader.id,
        first_name: trader.first_name,
        last_name: trader.last_name,
        username: trader.username,
        profile_picture: profilePictureName,
        email: trader.email,
        ratings: trader.ratings,
        followers: trader.followers,
        successful_trades: trader.completed_trades_count || 0,
        products_count: trader.active_cards_count || 0,
        joined_date: joinedDateFormatted,
        following: trader.following === 1 ? true : false
      };
    });

    return sendApiResponse(res, 200, true, "Traders list retrieved successfully", response, {
      current_page: result.page,
      per_page: result.perPage,
      total: result.total,
      total_pages: result.totalPages,
      has_next_page: result.hasNextPage,
      has_prev_page: result.hasPrevPage
    });

  } catch (error: any) {
    console.error("Get traders list error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", [], {
      current_page: 1,
      per_page: 10,
      total: 0,
      total_pages: 0,
      has_next_page: false,
      has_prev_page: false
    });
  }
};

// DELETE /api/user/:id - Delete user (existing method)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam || isNaN(Number(idParam))) {
      return sendApiResponse(res, 400, false, "Valid user ID is required");
    }
    const id = parseInt(idParam);
    const result = await UserService.deleteUser(id);
    
    if (!result) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }
    
    return sendApiResponse(res, 200, true, "User deleted successfully", []);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Follow/Unfollow user
export const toggleFollow = async (req: Request, res: Response) => {
  try {
    const { trader_id } = req.body;

    // Validate trader_id
    if (!trader_id) {
      return sendApiResponse(res, 400, false, "Trader ID is required", []);
    }

    // Extract user ID directly from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let userId: number | undefined;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // Try different possible field names for user ID
      userId = decoded.user_id || decoded.sub || decoded.id;
      
      if (!userId) {
        return sendApiResponse(res, 401, false, "Invalid token - no user ID found", []);
      }
    } catch (error: any) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    // Call service method
    const result = await UserService.toggleFollow(parseInt(trader_id), userId);

    // Return response in standardized API format
    const responseData = [{
      sub_status: result.sub_status
    }];

    // Set message based on action
    const message = result.sub_status ? "Followed successfully" : "Unfollowed successfully";

    return sendApiResponse(res, 200, true, message, responseData);

  } catch (error: any) {
    console.error('Error in toggleFollow controller:', error);
    
    if (error.message === "Cannot follow yourself") {
      return sendApiResponse(res, 400, false, "Cannot follow yourself", []);
    }
    
    if (error.message === "Trader not found") {
      return sendApiResponse(res, 404, false, "Trader not found", []);
    }

    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get user's likes and following data (favorite products + following users)
export const getLikesAndFollowing = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Parse pagination parameters (optional)
    const page = req.query.page ? parseInt(String(req.query.page)) : undefined;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : undefined;

    // Validate pagination parameters only if they are provided
    if (page !== undefined && (page < 1 || isNaN(page))) {
      return sendApiResponse(res, 400, false, "Invalid page parameter", []);
    }
    if (perPage !== undefined && (perPage < 1 || perPage > 100 || isNaN(perPage))) {
      return sendApiResponse(res, 400, false, "Invalid perPage parameter", []);
    }

    // Call service method
    const result = await UserService.getLikesAndFollowing(userId, page, perPage);

    // Structure the response data
    const responseData = {
      favoriteProducts: result.favoriteProducts,
      followingUsers: result.followingUsers
    };

    return sendApiResponse(res, 200, true, "Likes and following data retrieved successfully", responseData, result.pagination);

  } catch (error: any) {
    console.error("Get favorite products error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get user's coin purchase history
export const getCoinPurchaseHistory = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Parse pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    // Call service method
    const result = await UserService.getCoinPurchaseHistory(userId, page, perPage);

    return sendApiResponse(res, 200, true, "Coin purchase history retrieved successfully", result.purchases, result.pagination);

  } catch (error: any) {
    console.error("Get coin purchase history error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get user's coin deduction history
export const getCoinDeductionHistory = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Parse pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    // Call service method
    const result = await UserService.getCoinDeductionHistory(userId, page, perPage);

    return sendApiResponse(res, 200, true, "Coin deduction history retrieved successfully", result.deductions, result.pagination);

  } catch (error: any) {
    console.error("Get coin deduction history error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get unified coin transaction history (purchase, deduction, or all)
export const getCoinTransactionHistory = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get query parameters
    const typeParam = req.query.type as string;
    const pageParam = req.query.page as string;
    const perPageParam = req.query.perPage as string;

    // Validate type parameter
    const type = typeParam && ['purchase', 'deduction', 'all'].includes(typeParam) 
      ? typeParam as 'purchase' | 'deduction' | 'all' 
      : 'all'; // Default to 'all' if not specified or invalid

    // Parse pagination parameters
    const page = pageParam ? parseInt(String(pageParam)) : 1;
    const perPage = perPageParam ? parseInt(String(perPageParam)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    // Call service method
    const result = await UserService.getCoinTransactionHistory(userId, type, page, perPage);

    // Transform pagination to match API response format
    const pagination = result.pagination ? {
      current_page: result.pagination.currentPage,
      per_page: result.pagination.perPage,
      total: result.pagination.total,
      total_pages: result.pagination.totalPages,
      has_next_page: result.pagination.hasNextPage,
      has_prev_page: result.pagination.hasPrevPage
    } : null;

    const message = type === 'all' 
      ? "Coin transaction history retrieved successfully" 
      : `Coin ${type} history retrieved successfully`;

    return sendApiResponse(res, 200, true, message, result.transactions, pagination);

  } catch (error: any) {
    console.error("Get coin transaction history error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get user's PayPal transactions (coin purchase + deduction history)
export const getPayPalTransactions = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Parse pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Validate pagination parameters
    if (page < 1 || perPage < 1 || perPage > 100) {
      return sendApiResponse(res, 400, false, "Invalid pagination parameters", []);
    }

    // Call service method
    const result = await UserService.getPayPalTransactions(userId, page, perPage);

    // Structure the response data
    const responseData = {
      coinPurchaseHistory: result.coinPurchaseHistory,
      coinDeductionHistory: result.coinDeductionHistory
    };

    return sendApiResponse(res, 200, true, "PayPal transactions retrieved successfully", responseData, result.pagination);

  } catch (error: any) {
    console.error("Get PayPal transactions error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// PUT /api/users/profile - Update user profile (email and username not editable)
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    // Import EmailHelperService at the top   
    
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Get profile data from request body (FormData)
    const profileData = req.body || {};

    // Check if there's any data to update (either in body or file upload)
    const hasBodyData = profileData && Object.keys(profileData).length > 0;
    const hasFileUpload = req.file !== undefined;
    
    if (!hasBodyData && !hasFileUpload) {
      return sendApiResponse(res, 400, false, "Profile data is required", []);
    }


    // Handle profile picture update
    
    if (req.file) {
      // File upload - validate and upload new image
      
      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (req.file.size > maxSize) {
        return sendApiResponse(res, 400, false, "Profile picture size must not exceed 10MB", []);
      }
      
      // Validate file type (only images)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return sendApiResponse(res, 400, false, "Profile picture must be a valid image file (JPEG, PNG, GIF, WebP)", []);
      }
      
      // Validate file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return sendApiResponse(res, 400, false, "Profile picture must have a valid image extension (.jpg, .jpeg, .png, .gif, .webp)", []);
      }
      
      // Upload the profile picture
      try {
        const filename = uploadOne(req.file, 'users');
        
        if (filename) {
          profileData.profile_picture = filename;
        } else {
          return sendApiResponse(res, 400, false, "Failed to upload profile picture - no filename generated", []);
        }
      } catch (uploadError: any) {
        console.error('File upload error:', uploadError);
        return sendApiResponse(res, 500, false, `Error uploading profile picture: ${uploadError.message}`, []);
      }
    } else if (profileData.profile_picture !== undefined) {
      // Handle profile_picture field from form data (for blank/empty updates)
      if (profileData.profile_picture === '' || profileData.profile_picture === null || profileData.profile_picture === 'null') {
        // Set profile picture to blank/null
        profileData.profile_picture = null;
      } else if (profileData.profile_picture && typeof profileData.profile_picture === 'string') {
        // Keep existing profile picture (just a string value)
      }
    }

    // Extract social media data from FormData (dynamic approach)
    
    // Common social media platforms
    const socialMediaPlatforms = ['facebook', 'instagram', 'whatsapp', 'twitter', 'linkedin', 'youtube', 'tiktok', 'snapchat'];
    
    const socialMediaData: any = {};
    
    // Extract social media URLs dynamically
    socialMediaPlatforms.forEach(platform => {
      const urlField = `${platform}_url`;
      const directField = platform;
      
      const url = profileData[urlField] || profileData[directField] || '';
      
      if (url) {
        socialMediaData[platform] = { url };
      }
    });
    
    // Also check for any other fields that might be social media URLs
    Object.keys(profileData).forEach(key => {
      if (key.includes('_url') || key.includes('url')) {
        const platform = key.replace('_url', '').replace('url', '');
        if (!socialMediaData[platform] && profileData[key]) {
          socialMediaData[platform] = { url: profileData[key] };
        }
      }
    });


    // Update user profile (excluding social media fields)
    const socialMediaFields = [
      'facebook_url', 'instagram_url', 'whatsapp_url', 'twitter_url', 'linkedin_url', 'youtube_url', 'tiktok_url', 'snapchat_url',
      'facebook', 'instagram', 'whatsapp', 'twitter', 'linkedin', 'youtube', 'tiktok', 'snapchat'
    ];
    
    const userProfileData = { ...profileData };
    socialMediaFields.forEach(field => {
      delete userProfileData[field];
    });

    try {
      const profileResult = await UserService.updateUserProfile(userId, userProfileData);

      if (!profileResult.success) {
        // If there are validation errors, return them
        if (profileResult.errors && profileResult.errors.length > 0) {
          const message = Array.isArray(profileResult.message) 
            ? profileResult.message.join(', ') 
            : String(profileResult.message);
          return sendApiResponse(res, 400, false, message, profileResult.errors);
        }
        const message = Array.isArray(profileResult.message) 
          ? profileResult.message.join(', ') 
          : String(profileResult.message);
        return sendApiResponse(res, 400, false, message, []);
      }

      // Update social media links
      // Check if there are any social media URLs to update
      const hasSocialMediaUrls = Object.values(socialMediaData).some((platform: any) => 
        platform.url && platform.url.trim() !== ''
      );
      
      let socialMediaResult = null;
      if (hasSocialMediaUrls) {
        socialMediaResult = await UserService.updateUserSocialMedia(userId, socialMediaData);
      }

      // Get updated profile data with social media links
      const updatedProfileData = await UserService.getMyProfile(userId);

      if (!updatedProfileData) {
        return sendApiResponse(res, 404, false, "Updated profile not found", []);
      }

      // Send profile updated email
      try {
        if (updatedProfileData.user.email) {
          await EmailHelperService.sendProfileUpdatedEmail(
            updatedProfileData.user.email,
            updatedProfileData.user.first_name || '',
            updatedProfileData.user.last_name || ''
          );
          console.log('✅ Profile updated email sent successfully');
        }
      } catch (emailError: any) {
        console.error('❌ Failed to send profile updated email:', emailError);
        // Don't fail the request if email sending fails
      }

      // Transform the response to include only required user details
      const response = {
        id: updatedProfileData.user.id,
        first_name: updatedProfileData.user.first_name,
        last_name: updatedProfileData.user.last_name,
        username: updatedProfileData.user.username,
        profile_picture: updatedProfileData.user.profile_picture,
        email: updatedProfileData.user.email,
        paypal_business_email: (updatedProfileData.user as any).paypal_business_email,
        phone_number: updatedProfileData.user.phone_number,
        country_code: updatedProfileData.user.country_code,
        about_user: updatedProfileData.user.about_user,
        bio: updatedProfileData.user.bio,
        ratings: updatedProfileData.user.ratings,
        ebay_store_url: updatedProfileData.user.ebay_store_url,
        cxp_coins: updatedProfileData.user.cxp_coins,
        joined_date: updatedProfileData.user.createdAt,
        updated_at: updatedProfileData.user.updatedAt,
        address_exist: (updatedProfileData.user as any).address_exist,
        social_links: updatedProfileData.socialLinks,
        interestedCardsCount: updatedProfileData.interestedCardsCount,
        interested_categories: updatedProfileData.interestedCategories
      };

      return sendApiResponse(res, 200, true, "Profile updated successfully", [response]);

    } catch (serviceError: any) {
      console.error('❌ Service error in updateUserProfile:', serviceError);
      return sendApiResponse(res, 500, false, "Failed to update profile", []);
    }

  } catch (error: any) {
    console.error("Update user profile error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get user's shipment log with pagination
export const getShipmentLog = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Call service method
    const result = await UserService.getShipmentLog(userId, page, perPage);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Shipment log retrieved successfully", result.data, result.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get shipment log", result.error);
    }

  } catch (error: any) {
    console.error("Get shipment log error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Track shipment using EasyPost API
export const trackShipment = async (req: Request, res: Response) => {
  try {
    const { tracking_id } = req.params;

    // Validate tracking ID
    if (!tracking_id || tracking_id.trim() === '') {
      return sendApiResponse(res, 400, false, "Tracking ID is required", []);
    }

    // Call service method
    const result = await UserService.trackShipment(tracking_id.trim());

    if (result.success) {
      return sendApiResponse(res, 200, true, "Shipment tracked successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to track shipment", result.error);
    }

  } catch (error: any) {
    console.error("Track shipment error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get shipping label using EasyPost API
export const getShippingLabel = async (req: Request, res: Response) => {
  try {
    const { tracking_id } = req.params;

    // Validate tracking ID
    if (!tracking_id || tracking_id.trim() === '') {
      return sendApiResponse(res, 400, false, "Tracking ID is required", []);
    }

    // Call service method
    const result = await UserService.getShippingLabel(tracking_id.trim());

    if (result.success) {
      return sendApiResponse(res, 200, true, "Shipping label retrieved successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get shipping label", result.error);
    }

  } catch (error: any) {
    console.error("Get shipping label error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get category shipping rate history for authenticated user
export const getCategoryShippingRateHistory = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get query parameters
    const categoryId = req.query.category_id ? parseInt(String(req.query.category_id)) : undefined;
    const specificId = req.params.id ? parseInt(req.params.id) : undefined;
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Call service method
    const result = await UserService.getCategoryShippingRateHistory(userId, categoryId, specificId, page, perPage);

    if (result.success && result.data) {
      // Behavior differs by route prefix:
      // - /api/user/... => return only shippingRates array
      // - /api/users/... => return original full payload with pagination
      const base = req.baseUrl || '';
      const isLegacySingleArray = /^\/api\/user(\/|$)/.test(base);
      if (isLegacySingleArray) {
        const ratesOnly = specificId && result.data.specificShippingRate
          ? [result.data.specificShippingRate]
          : (result.data.shippingRates || []);
        return sendApiResponse(res, 200, true, "Category shipping rate history retrieved successfully", ratesOnly);
      }
      return sendApiResponse(res, 200, true, "Category shipping rate history retrieved successfully", result.data, result.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get category shipping rate history", result.error);
    }

  } catch (error: any) {
    console.error("Get category shipping rate history error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// GET /api/user/category-shipping-rate?category_id=ID
// Returns the authenticated user's category shipping rate for a given category
export const getCategoryShippingRate = async (req: Request, res: Response) => {
  try {
    // Require authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    const categoryIdParam = req.query.category_id as string;
    if (!categoryIdParam || isNaN(Number(categoryIdParam))) {
      return sendApiResponse(res, 400, false, "Valid category_id is required", []);
    }
    const categoryId = parseInt(categoryIdParam);

    // In Laravel view they skip category id 26; caller can also skip, but we return no data for 26
    if (categoryId === 26) {
      return sendApiResponse(res, 200, true, "No shipping rate for this category", { exists: false });
    }

    const rate = await CategoryShippingRate.findOne({
      where: { user_id: userId, category_id: categoryId },
      attributes: ['id', 'usa_rate', 'canada_rate']
    });

    if (!rate) {
      return sendApiResponse(res, 200, true, "Shipping rate not found", { exists: false });
    }

    const data = {
      id: (rate as any).id,
      usa_rate: (rate as any).usa_rate,
      canada_rate: (rate as any).canada_rate,
      exists: true
    };

    return sendApiResponse(res, 200, true, "Category shipping rate retrieved successfully", data);
  } catch (error: any) {
    console.error("Get category shipping rate error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Update category shipping rate for authenticated user
export const updateCategoryShippingRate = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get rate ID from params
    const rateId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!rateId || isNaN(rateId) || rateId <= 0) {
      return sendApiResponse(res, 400, false, "Valid rate ID is required", []);
    }

    // Get update data from request body
    const updateData = req.body;

    // Call service method
    const result = await UserService.updateCategoryShippingRate(userId, rateId, updateData);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Category shipping rate updated successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to update category shipping rate", result.error);
    }

  } catch (error: any) {
    console.error("Update category shipping rate error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Create category shipping rate for authenticated user
export const createCategoryShippingRate = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get create data from request body
    const createData = req.body;

    // Call service method
    const result = await UserService.createCategoryShippingRate(userId, createData);

    if (result.success) {
      return sendApiResponse(res, 201, true, "Category shipping rate created successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to create category shipping rate", result.error);
    }

  } catch (error: any) {
    console.error("Create category shipping rate error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get all addresses for authenticated user
export const getAddresses = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get pagination parameters
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 10;

    // Call service method
    const result = await UserService.getAddresses(userId, page, perPage);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Addresses retrieved successfully", result.data, result.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get addresses", result.error);
    }

  } catch (error: any) {
    console.error("Get addresses error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get address by ID for authenticated user
export const getAddressById = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get address ID from params
    const addressId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!addressId || isNaN(addressId) || addressId <= 0) {
      return sendApiResponse(res, 400, false, "Valid address ID is required", []);
    }

    // Call service method
    const result = await UserService.getAddressById(userId, addressId);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Address retrieved successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get address", result.error);
    }

  } catch (error: any) {
    console.error("Get address by ID error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Create address for authenticated user
export const createAddress = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get address data from request body
    const addressData = req.body;

    // Call service method
    const result = await UserService.createAddress(userId, addressData);

    if (result.success) {
      return sendApiResponse(res, 201, true, "Address created successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to create address", result.error);
    }

  } catch (error: any) {
    console.error("Create address error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Update address for authenticated user
export const updateAddress = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get address ID from params
    const addressId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!addressId || isNaN(addressId) || addressId <= 0) {
      return sendApiResponse(res, 400, false, "Valid address ID is required", []);
    }

    // Get update data from request body
    const updateData = req.body;

    // Call service method
    const result = await UserService.updateAddress(userId, addressId, updateData);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Address updated successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to update address", result.error);
    }

  } catch (error: any) {
    console.error("Update address error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Delete address for authenticated user
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get address ID from params
    const addressId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!addressId || isNaN(addressId) || addressId <= 0) {
      return sendApiResponse(res, 400, false, "Valid address ID is required", []);
    }

    // Call service method
    const result = await UserService.deleteAddress(userId, addressId);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Address deleted successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to delete address", result.error);
    }

  } catch (error: any) {
    console.error("Delete address error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Mark address as default for authenticated user
export const markAddressAsDefault = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get address ID from params
    const addressId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!addressId || isNaN(addressId) || addressId <= 0) {
      return sendApiResponse(res, 400, false, "Valid address ID is required", []);
    }

    // Call service method
    const result = await UserService.markAddressAsDefault(userId, addressId);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Address marked as default successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to mark address as default", result.error);
    }

  } catch (error: any) {
    console.error("Mark address as default error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Delete category shipping rate for authenticated user
export const deleteCategoryShippingRate = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get shipping rate ID from params
    const shippingRateId = req.params.id ? parseInt(req.params.id) : undefined;
    if (!shippingRateId || isNaN(shippingRateId) || shippingRateId <= 0) {
      return sendApiResponse(res, 400, false, "Valid shipping rate ID is required", []);
    }

    // Call service method
    const result = await UserService.deleteCategoryShippingRate(userId, shippingRateId);

    if (result.success) {
      return sendApiResponse(res, 200, true, result.message || "Category deleted successfully", []);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to delete category", []);
    }

  } catch (error: any) {
    console.error("Delete category shipping rate error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get bought and sold products for authenticated user
export const getBoughtAndSoldProducts = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Get query parameters
    const filters = {
      trade_type: req.query.trade_type as string,
      trade_with: req.query.trade_with as string,
      code: req.query.code as string,
      status_id: req.query.status_id ? parseInt(String(req.query.status_id)) : undefined,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      id: req.params.id ? parseInt(req.params.id) : undefined,
      buy_sell_id: req.query.buy_sell_id ? parseInt(String(req.query.buy_sell_id)) : undefined
    };

    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 5;

    // Call service method
    const result = await UserService.getBoughtAndSoldProducts(userId, filters, page, perPage);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Bought and sold products retrieved successfully", result.data, result.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get bought and sold products", result.error);
    }

  } catch (error: any) {
    console.error("Get bought and sold products error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get ongoing trades for authenticated user
export const getOngoingTrades = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Extract filters from query parameters
    const filters = {
      filter: req.query.filter as string,
      trade_with: req.query.trade_with as string,
      code: req.query.code as string,
      trade_type: req.query.trade_type as string,
      status_id: req.query.status_id ? parseInt(String(req.query.status_id)) : undefined,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      id: req.params.id ? parseInt(req.params.id) : undefined,
      trade_id: req.query.trade_id ? parseInt(String(req.query.trade_id)) : undefined
    };

    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const perPage = req.query.perPage ? parseInt(String(req.query.perPage)) : 5;

    // Call service method
    const result = await UserService.getOngoingTrades(userId, filters, page, perPage);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Ongoing trades retrieved successfully", result.data, result.pagination);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get ongoing trades", result.error);
    }

  } catch (error: any) {
    console.error("Get ongoing trades error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get trade detail for modal (Laravel get_receive_trade_detail equivalent)
export const getTradeDetail = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    const { trade_id, card_id } = req.query;

    if (!trade_id) {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    // Call service method
    const result = await UserService.getTradeDetail(parseInt(trade_id as string), userId, card_id ? parseInt(card_id as string) : null);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, "Trade detail retrieved successfully", [result.data]);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get trade detail", result.error);
    }

  } catch (error: any) {
    console.error("Get trade detail error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get completed trades for authenticated user
export const getCompletedTrades = async (req: Request, res: Response) => {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Extract filters from query parameters
    const filters = {
      id: req.params.id ? parseInt(req.params.id) : null,
      trade_with: req.query.trade_with as string,
      code: req.query.code as string,
      trade_type: req.query.trade_type as string,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      trade_id: req.query.trade_id ? parseInt(String(req.query.trade_id)) : undefined
    };

    // Extract pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 5;

    // Call service method
    const result = await UserService.getCompletedTrades(userId, filters, page, perPage);

    if (!result.success) {
      if (result.error?.redirect === 'ongoing-trades') {
        return sendApiResponse(res, 404, false, result.error.message, [], { redirect: 'ongoing-trades' });
      }
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get completed trades", []);
    }

    // Send successful response with pagination metadata at top level
    return sendApiResponse(res, 200, true, "Completed trades retrieved successfully", result.data, result.pagination);

  } catch (error: any) {
    console.error("Get completed trades error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get cancelled trades for authenticated user
export const getCancelledTrades = async (req: Request, res: Response) => {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Extract filters from query parameters
    const filters = {
      id: req.params.id ? parseInt(req.params.id) : null,
      trade_with: req.query.trade_with as string,
      code: req.query.code as string,
      trade_type: req.query.trade_type as string,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      trade_id: req.query.trade_id ? parseInt(String(req.query.trade_id)) : undefined
    };

    // Extract pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 5;

    // Call service method
    const result = await UserService.getCancelledTrades(userId, filters, page, perPage);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get cancelled trades", []);
    }

    // Send successful response with pagination metadata at top level
    return sendApiResponse(res, 200, true, "Cancelled trades retrieved successfully", result.data, result.pagination);

  } catch (error: any) {
    console.error("Get cancelled trades error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Get notifications list for authenticated user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendApiResponse(res, 401, false, "Authorization token required", []);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      return sendApiResponse(res, 401, false, "Invalid or expired token", []);
    }

    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID not found in token", []);
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 10;

    // Call service method
    const result = await UserService.getNotifications(userId, page, perPage);

    if (!result.success) {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to get notifications", []);
    }

    // Send successful response with pagination metadata at top level
    return sendApiResponse(res, 200, true, "Notifications retrieved successfully", result.data, result.pagination);

  } catch (error: any) {
    console.error("Get notifications error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// Confirm payment for a trade proposal
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    // Use common JWT token decoding utility
    const jwtResult = decodeJWTToken(req, res);
    if (!jwtResult.success) {
      return sendApiResponse(res, 401, false, jwtResult.error!, []);
    }

    const userId = jwtResult.userId!;
    const { trade_proposal_id } = req.body;

    if (!trade_proposal_id) {
      return sendApiResponse(res, 400, false, 'Trade proposal ID is required', []);
    }

    const result = await UserService.confirmPayment(userId, parseInt(trade_proposal_id));

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, result.data.message, [result.data]);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || 'Failed to confirm payment', []);
    }

  } catch (error: any) {
    console.error('Error in confirmPayment controller:', error);
    return sendApiResponse(res, 500, false, 'Internal server error', []);
  }
};

// Get my tickets
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    // Use common JWT token decoding utility
    const jwtResult = decodeJWTToken(req, res);
    if (!jwtResult.success) {
      return sendApiResponse(res, 401, false, jwtResult.error!, []);
    }

    const userId = jwtResult.userId!;
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 10;

    const result = await UserService.getMyTickets(userId, page, perPage);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, 'Tickets retrieved successfully', [result.data]);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || 'Failed to get tickets', []);
    }

  } catch (error: any) {
    console.error('Error in getMyTickets controller:', error);
    return sendApiResponse(res, 500, false, 'Internal server error', []);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    // Use common JWT token decoding utility
    const jwtResult = decodeJWTToken(req, res);
    if (!jwtResult.success) {
      return sendApiResponse(res, 401, false, jwtResult.error!, []);
    }

    const userId = jwtResult.userId!;
    const result = await UserService.markAllNotificationsAsRead(userId);

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, result.data.message, [result.data]);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || 'Failed to mark notifications as read', []);
    }

  } catch (error: any) {
    console.error('Error in markAllNotificationsAsRead controller:', error);
    return sendApiResponse(res, 500, false, 'Internal server error', []);
  }
};

// Submit rating for a buy/sell transaction
export const submitRating = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return sendApiResponse(res, 401, false, 'Authorization token is required', []);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;

    if (!userId) {
      return sendApiResponse(res, 400, false, 'Valid user ID is required', []);
    }

    const { trade_id, rating, data } = req.body;

    // Validate required fields
    if (!trade_id) {
      return sendApiResponse(res, 400, false, 'Trade ID is required', []);
    }
    if (!rating) {
      return sendApiResponse(res, 400, false, 'Rating is required', []);
    }
    if (rating < 1 || rating > 10) {
      return sendApiResponse(res, 400, false, 'Rating must be between 1 and 10', []);
    }

    const result = await UserService.submitRating(
      userId,
      parseInt(trade_id),
      parseInt(rating),
      data || ''
    );

    if (result.success && result.data) {
      return sendApiResponse(res, 200, true, result.data.message, result.data);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || 'Failed to submit rating', []);
    }

  } catch (error: any) {
    console.error('Error in submitRating controller:', error);
    return sendApiResponse(res, 500, false, 'Internal server error', []);
  }
};

// Cancel shipping payment for trade transaction (Laravel equivalent)
export const cancelShippingPayment = async (req: Request, res: Response) => {
  try {
    // Extract user ID from middleware (userAuth already validated the token)
    const userId = (req as any).user?.id;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Extract trade_id from request body
    const { trade_id } = req.body;

    // Validate required fields
    if (!trade_id) {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    if (isNaN(parseInt(trade_id))) {
      return sendApiResponse(res, 400, false, "Trade ID must be a valid number", []);
    }

    // Call service method to cancel shipping payment
    const result = await UserService.cancelShippingPayment(parseInt(trade_id), userId);

    if (result.success) {
      return sendApiResponse(res, 200, true, "Shipment payment cancelled successfully", [result.data]);
    } else {
      return sendApiResponse(res, 400, false, result.error?.message || "Failed to cancel shipment payment", []);
    }

  } catch (error: any) {
    console.error("Cancel shipping payment error:", error);
    return sendApiResponse(res, 500, false, "Internal server error", []);
  }
};

// POST /api/users/boughtsoldfeedback - Submit review for buy/sell collection (optimized)
export const buyCardCollectionReview = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return sendApiResponse(res, 401, false, 'Authorization token is required', []);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userId = decoded.user_id || decoded.sub || decoded.id || decoded.userId;
    if (!userId) {
      return sendApiResponse(res, 401, false, 'Valid user ID not found in token', []);
    }

    const { buy_sell_id, rating, review } = req.body as { buy_sell_id?: number; rating?: number; review?: string };

    if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 10) {
      return sendApiResponse(res, 400, false, 'Rating must be between 1 and 10', []);
    }
    if (!buy_sell_id || isNaN(Number(buy_sell_id))) {
      return sendApiResponse(res, 400, false, 'Valid buy_sell_id is required', []);
    }

    const tx = await (BuySellCard.sequelize as any).transaction();
    try {
      const card = await BuySellCard.findByPk(buy_sell_id, { transaction: tx });
      if (!card) {
        await tx.rollback();
        return sendApiResponse(res, 404, false, 'Buy/Sell record not found', []);
      }

      const normalizedRating = Number(rating);

      // Determine role of current user relative to this record
      const isBuyer = card.buyer === userId;
      const isSeller = card.seller === userId;
      if (!isBuyer && !isSeller) {
        await tx.rollback();
        return sendApiResponse(res, 403, false, 'Not authorized to review this transaction', []);
      }

      // Update BuySellCard columns per role
      if (isBuyer) {
        await card.update({
          buyer_rating: normalizedRating,
          buyer_review: review || undefined,
          reviewed_on: new Date()
        } as any, { transaction: tx });

        await ReviewCollection.create({
          buy_sell_card_id: card.id,
          user_id: card.buyer ?? null,
          sender_id: card.seller ?? null,
          rating: normalizedRating,
          content: review || null
        } as any, { transaction: tx });

        // TODO: optional notification hook
      }

      if (isSeller) {
        await card.update({
          seller_rating: normalizedRating,
          seller_review: review || undefined,
          reviewed_by_seller_on: new Date()
        } as any, { transaction: tx });

        await ReviewCollection.create({
          buy_sell_card_id: card.id,
          user_id: card.seller ?? null,
          sender_id: card.buyer ?? null,
          rating: normalizedRating,
          content: review || null
        } as any, { transaction: tx });

        // TODO: optional notification hook
      }

      // Recompute aggregate rating for the seller (optimized):
      // average of: Reviews(trader_id), Reviews(user_id), BuySellCard(buyer_rating where seller=this), BuySellCard(seller_rating where buyer=this)
      const sellerId = card.seller as number;
      const [agg] = await (User.sequelize as any).query(`
        SELECT
          (SELECT AVG(user_rating) FROM reviews WHERE trader_id = :sellerId) AS avg_trader_rating,
          (SELECT AVG(trader_rating) FROM reviews WHERE user_id = :sellerId) AS avg_user_rating,
          (SELECT AVG(buyer_rating) FROM buy_sell_cards WHERE seller = :sellerId) AS avg_buyer_rating,
          (SELECT AVG(seller_rating) FROM buy_sell_cards WHERE buyer = :sellerId) AS avg_seller_rating
      `, { replacements: { sellerId }, type: QueryTypes.SELECT, transaction: tx });

      const avgTrader = Number((agg as any)?.avg_trader_rating) || 0;
      const avgUser = Number((agg as any)?.avg_user_rating) || 0;
      const avgBuyer = Number((agg as any)?.avg_buyer_rating) || 0;
      const avgSeller = Number((agg as any)?.avg_seller_rating) || 0;

      const parts = [avgTrader, avgUser, avgBuyer, avgSeller].filter(v => v > 0);
      const finalRating = parts.length > 0 ? Number((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(1)) : 0;

      await User.update({ ratings: String(finalRating) }, { where: { id: sellerId }, transaction: tx });

      await tx.commit();

      // Send Laravel-style review-added notification
      try {
        const { setTradersNotificationOnVariousActionBasis } = await import('../services/notification.service.js');
        await setTradersNotificationOnVariousActionBasis(
          'review-added',
          card.buyer!,
          card.seller!,
          card.id,
          'Offer'
        );
      } catch (notificationError: any) {
        console.error('❌ Failed to send review-added notification:', notificationError);
        // Don't fail the request if notification fails
      }

      return sendApiResponse(res, 200, true, 'Review submitted successfully', { id: card.id, rating: normalizedRating });
    } catch (err: any) {
      await tx.rollback();
      return sendApiResponse(res, 500, false, err.message || 'Internal server error', []);
    }
  } catch (error: any) {
    return sendApiResponse(res, 500, false, error.message || 'Internal server error', []);
  }
};

// POST /api/users/change-password - Change password with old password check
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    const { old_password, new_password, confirm_password } = req.body || {};

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!old_password || !new_password || !confirm_password) {
      return sendApiResponse(res, 400, false, "Old, new and confirm password are required", []);
    }

    if (typeof new_password !== 'string' || new_password.length < 6) {
      return sendApiResponse(res, 400, false, "Password must be at least 6 characters long", []);
    }

    if (new_password !== confirm_password) {
      return sendApiResponse(res, 400, false, "New password and confirm password do not match", []);
    }

    const user = await User.findByPk(userId);
    if (!user || !(user as any).password) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }

    const matches = await bcrypt.compare(old_password, (user as any).password);
    if (!matches) {
      return sendApiResponse(res, 400, false, "Old password is incorrect", []);
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await User.update(
      { password: hashed, recover_password_token: '' },
      { where: { id: userId } }
    );

    // Send password changed email
    try {
      if (user.email) {
        await EmailHelperService.sendPasswordChangedEmail(
          user.email,
          user.first_name || '',
          user.last_name || '',
          user.username || ''
        );
        console.log('✅ Password changed email sent successfully');
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send password changed email:', emailError);
      // Don't fail the request if email sending fails
    }

    return sendApiResponse(res, 200, true, "Password changed successfully", []);
  } catch (error: any) {
    console.error("Change password error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

