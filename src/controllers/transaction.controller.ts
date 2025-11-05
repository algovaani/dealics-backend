import { Request, Response } from 'express';
import { Transaction } from '../models/transactions.model.js';
import { User } from '../models/user.model.js';
import { MembershipUser } from '../models/membership_user.model.js';
import { Membership } from '../models/membership.model.js';
import { UserSocialMedia } from '../models/userSocialMedia.model.js';
import { TradingCard } from '../models/tradingcard.model.js';
import { EarnCredit } from '../models/earn_credits.model.js';
import { Op } from 'sequelize';
import { sendApiResponse } from '../utils/apiResponse.js';
import { sequelize } from '../config/db.js';
import { HelperService } from '../services/helper.service.js';

interface AuthRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

// Define an interface for creating a transaction
interface CreateTransactionAttributes {
  burn_address?: string;
  transaction_hash?: string;
  amount: number;
  type: string;
  note?: string;
  block_no?: string;
  user_id: number;
  status?: '1' | '0';
}

class TransactionController {
  // Add new transaction
  async addTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendApiResponse(res, 401, false, "User not authenticated");
      }

      const { burn_address, transaction_hash, amount, type, note, block_no } = req.body;

      // Validate required fields
      if (!amount || !type) {
        return sendApiResponse(res, 400, false, "Amount and type are required");
      }

      // Create transaction
      const transaction = await Transaction.create({
        burn_address,
        transaction_hash,
        amount,
        type,
        note,
        block_no,
        user_id: userId,
        status: '1' // Default to active
      } as any);

      return sendApiResponse(res, 201, true, "Transaction created successfully", transaction);
    } catch (error) {
      console.error('Error in addTransaction:', error);
      return sendApiResponse(res, 500, false, "Internal server error");
    }
  }

  // Claim earn credit based on type (Profile or First Listing)
  async claim(req: AuthRequest, res: Response) {
    const t = await sequelize.transaction();
    try {
      const userId = req.user?.id;
      if (!userId) return sendApiResponse(res, 401, false, 'User not authenticated');

      const typeRaw = (req.body?.type || '').toString().trim();
      if (!typeRaw) return sendApiResponse(res, 400, false, 'Type is required');

      const type = typeRaw.toLowerCase();

      // Validate criteria
      if (type === 'profile') {
        const user = await User.findByPk(userId);
        if (!user) {
          await t.rollback();
          return sendApiResponse(res, 404, false, 'User not found');
        }

        // Check required profile fields
        const hasBio = !!(user.bio && user.bio.toString().trim());
        const hasAbout = !!(user.about_user && user.about_user.toString().trim());
        const isEbayVerified = (user.is_ebay_store_verified == '1');

        const socialCount = await UserSocialMedia.count({ where: { user_id: userId, social_media_url_status: '1' } });

        if (!hasBio || !hasAbout || !isEbayVerified || socialCount < 1) {
          await t.rollback();
          return sendApiResponse(res, 400, false, 'Profile incomplete. Ensure bio, about_user, ebay store verified and at least one social media link.');
        }
      } else if (type === 'first listing' || type === 'firstlisting' || type === 'first_listing') {
        // Check trading cards existence for this user
        const cardCount = await TradingCard.count({ where: { [Op.or]: [{ trader_id: userId }, { creator_id: userId }] } });
        if (cardCount < 1) {
          await t.rollback();
          return sendApiResponse(res, 400, false, 'No trading card listing found for this user');
        }
      } else {
        await t.rollback();
        return sendApiResponse(res, 400, false, 'Invalid type. Allowed: Profile, First Listing');
      }

      // Get credit amount from earn_credits by title
      const amount = await HelperService.getEarnCreditAmount(req.body.type);
      if (!amount || Number(amount) <= 0) {
        await t.rollback();
        return sendApiResponse(res, 500, false, 'Earn credit configuration not found for this type');
      }

      // Prevent duplicate claims: check existing transaction for this claim type
      const existingClaim = await Transaction.findOne({
        where: {
          user_id: userId,
          type: 'DLX Redemption',
          note: { [Op.like]: `%Earned credit for ${typeRaw}%` }
        }
      });

      if (existingClaim) {
        await t.rollback();
        return sendApiResponse(res, 400, false, 'You have already claimed this reward');
      }

      // Update user credit
      const user = await User.findByPk(userId);
      if (!user) {
        await t.rollback();
        return sendApiResponse(res, 404, false, 'User not found');
      }

      const currentCredit = Number(user.credit) || 0;
      const newCredit = currentCredit + Number(amount);
      await user.update({ credit: newCredit }, { transaction: t } as any);

      // Create transaction record (use Purchase type to satisfy enum if needed)
      const tx = await Transaction.create({
        payment_id: null,
        amount: amount,
        type: 'DLX Redemption',
        note: `Earned credit for ${req.body.type}`,
        status: '1',
        transaction_status: 'Completed',
        user_id: userId
      } as any, { transaction: t });

      await t.commit();
      return sendApiResponse(res, 200, true, 'Credit claimed successfully', { credit: newCredit, transaction: tx });
    } catch (error) {
      console.error('Error in claim:', error);
      await t.rollback();
      return sendApiResponse(res, 500, false, 'Internal server error');
    }
  }

  // Get user's own transactions with pagination and filters
  async getUserTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const type = req.query.type as 'Purchase' | 'DLX Redemption' | 'Listing Fee';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const status = req.query.status as '1' | '0';

      const whereClause: any = {
        user_id: userId // Only get transactions for the current user
      };
      
      // Apply filters if provided
      if (type) {
        whereClause.type = type;
      }
      if (status) {
        whereClause.status = status;
      }
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const paginationOffset = (page - 1) * limit;

      const { count, rows } = await Transaction.findAndCountAll({
        where: whereClause,
        limit: limit,
        offset: paginationOffset,
        order: [['createdAt', 'DESC']],        
      });

      return res.status(200).json({
        success: true,
        data: {
          transactions: rows,
          pagination: {
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's specific transaction by ID
  async getTransactionById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { id } = req.params;
      const transaction = await Transaction.findOne({
        where: {
          id,
          user_id: userId // Only allow access to user's own transactions
        },      
        
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new TransactionController();