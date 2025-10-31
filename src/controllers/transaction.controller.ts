import { Request, Response } from 'express';
import { Transaction } from '../models/transactions.model.js';
import { User } from '../models/user.model.js';
import { MembershipUser } from '../models/membership_user.model.js';
import { Membership } from '../models/membership.model.js';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}


// Define an interface for creating a transaction
interface CreateTransactionAttributes {
  payment_id?: string;
  amount?: number;
  type: 'Purchase' | 'DLX Redemption' | 'Listing Fee';
  note?: string;
  status: '1' | '0';
  user_id: number;
}

class TransactionController {
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