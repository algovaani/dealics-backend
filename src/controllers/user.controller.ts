import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";

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

