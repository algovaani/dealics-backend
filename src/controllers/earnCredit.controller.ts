import { Request, Response } from "express";
import { EarnCredit } from "../models/earn_credits.model.js";
import { Transaction } from "../models/transactions.model.js";
import { sendApiResponse } from "../utils/apiResponse.js";
import { Op } from "sequelize";

/**
 * Get list of earn credits
 * GET /api/earn-credits
 * Public endpoint - accessible without authentication
 */
export const getEarnCreditsList = async (req: Request, res: Response) => {
  try {
    const { page = 1, perPage = 10 } = req.query;
    const pageNumber = parseInt(page as string);
    const limit = parseInt(perPage as string);
    const offset = (pageNumber - 1) * limit;

    // Only show active earn credits by default
    const whereClause: any = {
      status: '1'  // Only return active credits
    };

    // Optional: filter by type (partial match). Example: ?type=Refer Friend
    const typeQuery = (req.query.type as string | undefined)?.trim();
    if (typeQuery && typeQuery.length > 0) {
      // Use LIKE for partial matching. MySQL collation is usually case-insensitive.
      whereClause.type = { [Op.like]: `%${typeQuery}%` };
    }

    // Get earn credits with pagination
    const { count, rows: earnCredits } = await EarnCredit.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return sendApiResponse(res, 200, true, "Earn credits list retrieved successfully", {
      earnCredits,
      pagination: {
        currentPage: pageNumber,
        perPage: limit,
        totalItems: count,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching earn credits:", error);
    return sendApiResponse(res, 500, false, "Error retrieving earn credits list", null);
  }
};

/**
 * Get earn credits list for authenticated user and mark claimed status per item
 * GET /api/earn-credits/user
 */
export const getEarnCreditsListForUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return sendApiResponse(res, 401, false, "User not authenticated", []);

    const { page = 1, perPage = 50 } = req.query;
    const pageNumber = parseInt(page as string);
    const limit = parseInt(perPage as string);
    const offset = (pageNumber - 1) * limit;

    const whereClause: any = { status: '1' };

    const { count, rows: earnCredits } = await EarnCredit.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // For each earn credit, determine if user already claimed it
    const items = await Promise.all(earnCredits.map(async (rec: any) => {
      const type = (rec.type || '').toString();
      const existing = await Transaction.findOne({
        where: {
          user_id: userId,
          note: { [Op.like]: `%Earned credit for ${type}%` }
        }
      });
      const obj = rec.get ? rec.get({ plain: true }) : rec;
      return { ...obj, is_claim: existing ? 1 : 0 };
    }));

    const totalPages = Math.ceil(count / limit);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return sendApiResponse(res, 200, true, "Earn credits list retrieved successfully", {
      earnCredits: items,
      pagination: {
        currentPage: pageNumber,
        perPage: limit,
        totalItems: count,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching earn credits for user:", error);
    return sendApiResponse(res, 500, false, "Error retrieving earn credits list", null);
  }
};