import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";
import { uploadOne } from "../utils/fileUpload.js";
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

    console.log('Profile data received:', JSON.stringify(profileData, null, 2));

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

    // Get user profile data
    const profileData = await UserService.getUserProfile(userId);

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

// Get user's dashboard data (favorite products + following users)
export const getUserDashboard = async (req: Request, res: Response) => {
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
    const result = await UserService.getUserDashboard(userId, page, perPage);

    // Structure the response data
    const responseData = {
      favoriteProducts: result.favoriteProducts,
      followingUsers: result.followingUsers
    };

    return sendApiResponse(res, 200, true, "Dashboard data retrieved successfully", responseData, result.pagination);

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
    // Get user ID from authenticated token
    const userId = req.user?.id || req.user?.user_id || req.user?.sub;
    
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Get profile data from request body (FormData)
    const profileData = req.body;

    if (!profileData || Object.keys(profileData).length === 0) {
      return sendApiResponse(res, 400, false, "Profile data is required", []);
    }

    console.log('📝 Update profile request for user:', userId);
    console.log('📋 Request data:', profileData);
    console.log('📋 Request data type:', typeof profileData);
    console.log('📋 Request data keys:', Object.keys(profileData));
    console.log('📋 Request body raw:', req.body);
    console.log('📋 Request files:', req.file);

    // Handle profile picture update
    console.log('📸 Profile picture handling - req.file:', req.file);
    console.log('📸 Profile picture handling - profileData.profile_picture:', profileData.profile_picture);
    
    if (req.file) {
      // File upload - validate and upload new image
      console.log('📸 Profile picture file received:', req.file.originalname);
      console.log('📏 File size:', req.file.size, 'bytes');
      
      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (req.file.size > maxSize) {
        console.log('❌ File size exceeds 10MB limit');
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
        console.log('❌ Invalid file type:', req.file.mimetype);
        return sendApiResponse(res, 400, false, "Profile picture must be a valid image file (JPEG, PNG, GIF, WebP)", []);
      }
      
      // Validate file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        console.log('❌ Invalid file extension:', fileExtension);
        return sendApiResponse(res, 400, false, "Profile picture must have a valid image extension (.jpg, .jpeg, .png, .gif, .webp)", []);
      }
      
      console.log('✅ File validation passed - Size:', req.file.size, 'bytes, Type:', req.file.mimetype, 'Extension:', fileExtension);
      
      // Upload the profile picture
      try {
        console.log('📸 Attempting to upload file...');
        console.log('📸 File details:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        });
        
        const filename = uploadOne(req.file, 'users');
        console.log('📸 Upload result:', filename);
        
        if (filename) {
          profileData.profile_picture = filename;
          console.log('✅ Profile picture uploaded successfully:', filename);
        } else {
          console.log('❌ Profile picture upload failed - no filename returned');
          return sendApiResponse(res, 400, false, "Failed to upload profile picture - no filename generated", []);
        }
      } catch (uploadError: any) {
        console.error('❌ File upload error:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          code: uploadError.code,
          errno: uploadError.errno
        });
        return sendApiResponse(res, 500, false, `Error uploading profile picture: ${uploadError.message}`, []);
      }
    } else if (profileData.profile_picture !== undefined) {
      // Handle profile_picture field from form data (for blank/empty updates)
      console.log('📸 Profile picture field received:', profileData.profile_picture);
      
      if (profileData.profile_picture === '' || profileData.profile_picture === null || profileData.profile_picture === 'null') {
        // Set profile picture to blank/null
        profileData.profile_picture = null;
        console.log('✅ Profile picture set to blank');
      } else if (profileData.profile_picture && typeof profileData.profile_picture === 'string') {
        // Keep existing profile picture (just a string value)
        console.log('✅ Profile picture kept as:', profileData.profile_picture);
      }
    }
    
    console.log('📸 Final profile_picture value:', profileData.profile_picture);

    // Extract social media data from FormData (dynamic approach)
    console.log('📱 Checking for social media fields:');
    console.log('📱 All profileData keys:', Object.keys(profileData));
    
    // Common social media platforms
    const socialMediaPlatforms = ['facebook', 'instagram', 'whatsapp', 'twitter', 'linkedin', 'youtube', 'tiktok', 'snapchat'];
    
    const socialMediaData: any = {};
    
    // Extract social media URLs dynamically
    socialMediaPlatforms.forEach(platform => {
      const urlField = `${platform}_url`;
      const directField = platform;
      
      const url = profileData[urlField] || profileData[directField] || '';
      
      if (url) {
        console.log(`📱 Found ${platform}:`, url);
        socialMediaData[platform] = { url };
      }
    });
    
    // Also check for any other fields that might be social media URLs
    Object.keys(profileData).forEach(key => {
      if (key.includes('_url') || key.includes('url')) {
        const platform = key.replace('_url', '').replace('url', '');
        if (!socialMediaData[platform] && profileData[key]) {
          console.log(`📱 Found additional social media ${platform}:`, profileData[key]);
          socialMediaData[platform] = { url: profileData[key] };
        }
      }
    });

    console.log('📱 Social media data extracted:', socialMediaData);
    console.log('📱 Original profileData keys:', Object.keys(profileData));

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
          return sendApiResponse(res, 400, false, profileResult.message, profileResult.errors);
        }
        return sendApiResponse(res, 400, false, profileResult.message, []);
      }

      // Update social media links
      console.log('📱 Calling updateUserSocialMedia with:', socialMediaData);
      
      // Check if there are any social media URLs to update
      const hasSocialMediaUrls = Object.values(socialMediaData).some((platform: any) => 
        platform.url && platform.url.trim() !== ''
      );
      
      console.log('📱 Has social media URLs to update:', hasSocialMediaUrls);
      
      let socialMediaResult = null;
      if (hasSocialMediaUrls) {
        socialMediaResult = await UserService.updateUserSocialMedia(userId, socialMediaData);
        console.log('📱 Social media update result:', socialMediaResult);
        
        if (!socialMediaResult.success) {
          console.log('⚠️ Social media update failed, but profile updated successfully');
          console.log('⚠️ Social media error:', socialMediaResult.error);
        } else {
          console.log('✅ Social media updated successfully:', socialMediaResult.data);
        }
      } else {
        console.log('📱 No social media URLs provided, skipping social media update');
      }

      // Get updated profile data with social media links
      const updatedProfileData = await UserService.getMyProfile(userId);

      if (!updatedProfileData) {
        return sendApiResponse(res, 404, false, "Updated profile not found", []);
      }

      // Transform the response to include only required user details
      const response = {
        id: updatedProfileData.user.id,
        first_name: updatedProfileData.user.first_name,
        last_name: updatedProfileData.user.last_name,
        username: updatedProfileData.user.username,
        profile_picture: updatedProfileData.user.profile_picture,
        email: updatedProfileData.user.email,
        phone_number: updatedProfileData.user.phone_number,
        country_code: updatedProfileData.user.country_code,
        about_user: updatedProfileData.user.about_user,
        bio: updatedProfileData.user.bio,
        ratings: updatedProfileData.user.ratings,
        ebay_store_url: updatedProfileData.user.ebay_store_url,
        cxp_coins: updatedProfileData.user.cxp_coins,
        joined_date: updatedProfileData.user.createdAt,
        updated_at: updatedProfileData.user.updatedAt,
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

// Get user's shipment log
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

    // Call service method
    const result = await UserService.getShipmentLog(userId);

    return sendApiResponse(res, 200, true, "Shipment log retrieved successfully", result.shipments);

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

    if (result.success) {
      return sendApiResponse(res, 200, true, "Category shipping rate history retrieved successfully", result.data);
    } else {
      return sendApiResponse(res, 400, false, "Failed to get category shipping rate history", result.error);
    }

  } catch (error: any) {
    console.error("Get category shipping rate history error:", error);
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

