import { Request, Response } from "express";
import { MembershipService } from "../services/membership.service.js";
import { sendApiResponse } from "../utils/apiResponse.js";

export const getMemberships = async (req: Request, res: Response) => {
  try {
    // Allow query param ?active=false to fetch all
    const activeQuery = String(req.query.active || 'true').toLowerCase();
    const activeOnly = activeQuery !== 'false' && activeQuery !== '0';

    const memberships = await MembershipService.getAll(activeOnly);
    return sendApiResponse(res, 200, true, "Memberships retrieved successfully", memberships);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const getMembershipById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id) || id <= 0) {
      return sendApiResponse(res, 400, false, "Valid membership ID is required");
    }

    const membership = await MembershipService.getById(id);
    if (!membership) return sendApiResponse(res, 404, false, "Membership not found");

    return sendApiResponse(res, 200, true, "Membership retrieved successfully", membership);
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};

export const purchaseMembership = async (req: Request, res: Response) => {
  try {
    // Require auth middleware to set req.user.id
    const userId = (req as any).user?.id;
    if (!userId) return sendApiResponse(res, 401, false, "User not authenticated");

    const { paymentId, membership_id, amount, months } = req.body;
    if (!paymentId || !membership_id || typeof amount === 'undefined') {
      return sendApiResponse(res, 400, false, "paymentId, membership_id and amount are required");
    }

    const membershipIdNum = Number(membership_id);
    const amountNum = Number(amount);
    const monthsNum = typeof months !== 'undefined' ? Number(months) : undefined;
    if (isNaN(membershipIdNum) || membershipIdNum <= 0) {
      return sendApiResponse(res, 400, false, "Valid membership_id is required");
    }
    if (isNaN(amountNum) || amountNum < 0) {
      return sendApiResponse(res, 400, false, "Valid amount is required");
    }
    if (typeof monthsNum !== 'undefined' && (isNaN(monthsNum) || monthsNum <= 0)) {
      return sendApiResponse(res, 400, false, "If provided, months must be a positive number");
    }
    const result = await MembershipService.purchaseMembership(userId, String(paymentId), membershipIdNum, amountNum, monthsNum);
    return sendApiResponse(res, 200, true, "Membership purchased successfully", { membership_user: result.membershipUser, transaction: result.transaction });
  } catch (error: any) {
    return sendApiResponse(res, 500, false, "Internal server error", { error: error.message || 'Unknown error' });
  }
};
