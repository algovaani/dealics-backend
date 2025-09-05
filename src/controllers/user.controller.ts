import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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
      phone_number: profileData.user.phone_number,
      country_code: profileData.user.country_code,
      about_user: profileData.user.about_user,
      bio: profileData.user.bio,
      ratings: profileData.user.ratings,
      ebay_store_url: profileData.user.ebay_store_url,
      cxp_coins: profileData.user.cxp_coins,
      joined_date: profileData.user.createdAt,
      updated_at: profileData.user.updatedAt,
      social_links: null, // Field doesn't exist in current schema - can be added later
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

    // Get user profile data
    const profileData = await UserService.getUserProfile(userId);

    if (!profileData) {
      return sendApiResponse(res, 404, false, "User not found");
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
      joined_date: profileData.user.createdAt,
      updated_at: profileData.user.updatedAt,
      cardStats: profileData.cardStats,
      reviews: profileData.reviews,
      interestedCardsCount: profileData.interestedCardsCount,
      tradeCount: profileData.tradeCount,
      followingCount: profileData.followingCount
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
    const limitParam = req.query.limit as string;
    const limit = limitParam && !isNaN(Number(limitParam)) ? parseInt(limitParam) : 10;
    
    // Validate limit
    if (limit < 1 || limit > 100) {
      return sendApiResponse(res, 400, false, "Limit must be between 1 and 100", []);
    }

    const topTraders = await UserService.getTopTraders(limit);

    if (!topTraders || topTraders.length === 0) {
      return sendApiResponse(res, 200, true, "No top traders found", []);
    }

    // Transform the response to include only necessary fields
    const response = topTraders.map((trader: any) => ({
      trader_id: trader.id,
      profile_picture: trader.profile_picture,
      first_name: trader.first_name,
      last_name: trader.last_name,
      ratings: trader.ratings,
      username: trader.username,
      joinedDate: trader.created_at
    }));

    return sendApiResponse(res, 200, true, "Top traders retrieved successfully", response);

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
        joined_date: joinedDateFormatted
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

    // Get user ID from middleware (already verified by userAuth)
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "Valid user ID is required", []);
    }

    // Call service method
    const result = await UserService.toggleFollow(parseInt(trader_id), userId);

    // Return response in Laravel format
    return res.status(200).json(result);

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

