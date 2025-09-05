import { User } from "../models/user.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Follower } from "../models/follower.model.js";
import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";

export class UserService {
  // Get user by ID
  static async getUserById(id: number) {
    return await User.findByPk(id);
  }

  // Get user profile details without authentication
  static async getUserProfile(userId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return null;
      }

      // Get user details
      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'first_name', 'last_name', 'username', 'profile_picture', 
          'email', 'followers', 'trade_transactions', 'trading_cards', 'ratings',
          'created_at', 'updated_at'
        ]
      });

      if (!user) {
        return null;
      }

      // Calculate card statistics
      const cardStats = await this.getCardStats(userId);

      // Get reviews (if you have a reviews table)
      const reviews = await this.getReviews(userId);

      // Get interested cards count
      const interestedCardsCount = await this.getInterestedCardsCount(userId);

      // Get trade count
      const tradeCount = await this.getTradeCount(userId);

      // Get following count from followers table
      const followingCount = await this.getFollowingCount(userId);

      return {
        user,
        cardStats,
        reviews,
        interestedCardsCount,
        tradeCount,
        followingCount
      };
    } catch (error) {
      return null;
    }
  }

  // Get card statistics
  private static async getCardStats(userId: number) {
    try {
      const allProductsQuery = `
        SELECT COUNT(*) as count
        FROM trading_cards 
        WHERE trader_id = :userId 
        AND mark_as_deleted IS NULL 
        AND trading_card_status = '1' 
        AND is_traded = '0' 
        AND (can_trade = '1' OR can_buy = '1')
      `;

      const ongoingDealsQuery = `
        SELECT COUNT(*) as count
        FROM trading_cards 
        WHERE trader_id = :userId 
        AND trading_card_status = '1' 
        AND is_traded = '1' 
        AND mark_as_deleted IS NULL
      `;

      const allProducts = await sequelize.query(allProductsQuery, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      const ongoingDeals = await sequelize.query(ongoingDealsQuery, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      // Get user data for other stats
      const user = await User.findByPk(userId, {
        attributes: ['trade_transactions']
      });

      // For now, we'll set these to 0 as we don't have the BuySellCards table
      const productsSold = 0;
      const productsBought = 0;

      return {
        'All Products': (allProducts[0] as any)?.count || 0,
        'Ongoing Deals': (ongoingDeals[0] as any)?.count || 0,
        'Successful Trades': user?.trade_transactions || 0,
        'Products Sold': productsSold,
        'Products Bought': productsBought
      };
    } catch (error) {
      return {
        'All Products': 0,
        'Ongoing Deals': 0,
        'Successful Trades': 0,
        'Products Sold': 0,
        'Products Bought': 0
      };
    }
  }

  // Get trading cards with pagination
  private static async getTradingCards(userId: number, categoryId?: number, page: number = 1, perPage: number = 12) {
    try {
      const offset = (page - 1) * perPage;
      
      let whereClause = `
        WHERE tc.trader_id = :userId 
        AND tc.mark_as_deleted IS NULL 
        AND tc.trading_card_status = '1' 
        AND tc.is_traded = '0' 
        AND (tc.can_trade = '1' OR tc.can_buy = '1')
      `;

      const replacements: any = { userId };

      if (categoryId && categoryId > 0) {
        whereClause += ` AND tc.category_id = :categoryId`;
        replacements.categoryId = categoryId;
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM trading_cards tc
        ${whereClause}
      `;

      const dataQuery = `
        SELECT 
          tc.id, tc.code, tc.trading_card_status, tc.category_id, 
          tc.search_param, tc.trading_card_img, tc.trading_card_img_back, 
          tc.trading_card_slug, tc.is_traded, tc.created_at, tc.is_demo, 
          tc.trader_id, tc.trading_card_asking_price, tc.trading_card_estimated_value,
          tc.trading_card_recent_sell_link, tc.trading_card_recent_trade_value,
          tc.can_trade, tc.can_buy, tc.updated_at,
          c.sport_name as category_name
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        ${whereClause}
        ORDER BY tc.updated_at DESC
        LIMIT :limit OFFSET :offset
      `;

      const totalResult = await sequelize.query(countQuery, {
        replacements,
        type: QueryTypes.SELECT
      });

      const total = (totalResult[0] as any)?.total || 0;

      const cardsResult = await sequelize.query(dataQuery, {
        replacements: { ...replacements, limit: perPage, offset },
        type: QueryTypes.SELECT
      });

      return {
        data: cardsResult,
        pagination: {
          current_page: page,
          per_page: perPage,
          total: total,
          total_pages: Math.ceil(total / perPage),
          has_next_page: page < Math.ceil(total / perPage),
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      return {
        data: [],
        pagination: {
          current_page: page,
          per_page: perPage,
          total: 0,
          total_pages: 0,
          has_next_page: false,
          has_prev_page: false
        }
      };
    }
  }



  // Get reviews from buy_sell_cards table
  private static async getReviews(userId: number) {
    try {
      const query = `
        SELECT 
          bsc.buyer_review as trader_review,
          bsc.buyer_rating as user_rating,
          u.profile_picture as user_image,
          u.username as userName,
          DATE(bsc.reviewed_on) as date,
          TIME(bsc.reviewed_on) as time
        FROM buy_sell_cards bsc
        LEFT JOIN users u ON bsc.buyer = u.id
        WHERE bsc.buyer = :userId 
        AND bsc.buyer_review IS NOT NULL 
        AND bsc.buyer_review != ''
        AND bsc.buyer_rating IS NOT NULL
        
        UNION ALL
        
        SELECT 
          bsc.seller_review as trader_review,
          bsc.seller_rating as user_rating,
          u.profile_picture as user_image,
          u.username as userName,
          DATE(bsc.reviewed_by_seller_on) as date,
          TIME(bsc.reviewed_by_seller_on) as time
        FROM buy_sell_cards bsc
        LEFT JOIN users u ON bsc.seller = u.id
        WHERE bsc.seller = :userId 
        AND bsc.seller_review IS NOT NULL 
        AND bsc.seller_review != ''
        AND bsc.seller_rating IS NOT NULL
        
        ORDER BY bsc.reviewed_on DESC, bsc.reviewed_by_seller_on DESC
        LIMIT 10
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      return [];
    }
  }

  // Get interested cards count
  private static async getInterestedCardsCount(userId: number) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM interested_in 
        WHERE user_id = :userId 
        AND interested_status = 1
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return (result[0] as any)?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get trade count
  private static async getTradeCount(userId: number) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM trade_transactions 
        WHERE trade_sent_by_key = :userId 
        OR trade_sent_to_key = :userId
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return (result[0] as any)?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get following count from followers table
  private static async getFollowingCount(userId: number) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM followers 
        WHERE user_id = :userId 
        AND follower_status = '1'
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return (result[0] as any)?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get interested categories for user
  private static async getInterestedCategories(userId: number) {
    try {
      const query = `
        SELECT DISTINCT c.id, c.sport_name, c.slug, c.sport_icon
        FROM interested_in ii
        LEFT JOIN trading_cards tc ON ii.trading_card_id = tc.id
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE ii.user_id = :userId 
        AND ii.interested_status = '1'
        AND c.id IS NOT NULL
        ORDER BY c.sport_name
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('Error getting interested categories:', error);
      return [];
    }
  }



  // Update user
  static async updateUser(id: number, data: any) {
    try {
      const user = await User.findByPk(id);
      if (!user) return null;

      await user.update(data);
      return user;
    } catch (err) {
      throw err;
    }
  }

  // Get authenticated user's profile details
  static async getMyProfile(userId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return null;
      }

      // Get user details with all relevant fields
      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'first_name', 'last_name', 'username', 'profile_picture', 
          'email', 'phone_number', 'country_code', 'about_user', 'bio',
          'shipping_address', 'shipping_city', 'shipping_state', 'shipping_zip_code',
          'followers', 'trade_transactions', 'trading_cards', 'ratings',
          'is_email_verified', 'email_verified_at', 'user_status', 'user_role',
          'ebay_store_url', 'is_ebay_store_verified', 'ebay_store_verified_at',
          'paypal_business_email', 'is_free_shipping', 'shipping_flat_rate',
          'cxp_coins', 'is_veteran_user', 'gmail_login',
          'created_at', 'updated_at'
        ]
      });

      if (!user) {
        return null;
      }

      // Calculate additional statistics
      const interestedCardsCount = await this.getInterestedCardsCount(userId);
      const interestedCategories = await this.getInterestedCategories(userId);

      return {
        user,
        interestedCardsCount,
        interestedCategories
      };
    } catch (error) {
      console.error('Error in getMyProfile:', error);
      return null;
    }
  }

  // Get top traders based on ratings and trading cards
  static async getTopTraders(limit: number = 10) {
    try {
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.username,
          u.profile_picture,
          u.email,
          u.ratings,
          u.followers,
          u.trade_transactions,
          u.trading_cards,
          u.created_at,
          u.updated_at,
          COALESCE(tc_stats.trading_cards_count, 0) as trading_cards_count,
          COALESCE(tc_stats.active_cards_count, 0) as active_cards_count,
          COALESCE(tc_stats.completed_trades_count, 0) as completed_trades_count
        FROM users u
        LEFT JOIN (
          SELECT 
            trader_id,
            COUNT(*) as trading_cards_count,
            SUM(CASE WHEN is_traded = '0' AND trading_card_status = '1' AND mark_as_deleted IS NULL THEN 1 ELSE 0 END) as active_cards_count,
            SUM(CASE WHEN is_traded = '1' THEN 1 ELSE 0 END) as completed_trades_count
          FROM trading_cards 
          WHERE mark_as_deleted IS NULL
          GROUP BY trader_id
        ) tc_stats ON u.id = tc_stats.trader_id
        WHERE u.user_status = '1' 
        AND u.user_role = 'user'
        AND (u.ratings IS NOT NULL AND u.ratings != '' AND u.ratings != '0')
        AND (tc_stats.trading_cards_count > 0 OR u.trading_cards > 0)
        ORDER BY 
          CAST(u.ratings AS DECIMAL(3,2)) DESC,
          tc_stats.trading_cards_count DESC,
          u.trade_transactions DESC,
          u.followers DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { limit },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('Error getting top traders:', error);
      return [];
    }
  }

  // Delete user
  static async deleteUser(id: number) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await User.destroy();
    return true;
  }

  // Get traders list with pagination (excludes authenticated user if token provided)
  static async getTradersList(page: number = 1, perPage: number = 10, excludeUserId?: number) {
    try {
      const offset = (page - 1) * perPage;

      const query = `
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.username,
          u.profile_picture,
          u.email,
          u.ratings,
          u.followers,
          u.trade_transactions,
          u.trading_cards,
          u.created_at,
          u.updated_at,
          COALESCE(tc_stats.trading_cards_count, 0) as trading_cards_count,
          COALESCE(tc_stats.active_cards_count, 0) as active_cards_count,
          COALESCE(tc_stats.completed_trades_count, 0) as completed_trades_count
        FROM users u
        LEFT JOIN (
          SELECT
            trader_id,
            COUNT(*) as trading_cards_count,
            SUM(CASE WHEN is_traded = '0' AND trading_card_status = '1' AND mark_as_deleted IS NULL THEN 1 ELSE 0 END) as active_cards_count,
            SUM(CASE WHEN is_traded = '1' THEN 1 ELSE 0 END) as completed_trades_count
          FROM trading_cards
          WHERE mark_as_deleted IS NULL
          GROUP BY trader_id
        ) tc_stats ON u.id = tc_stats.trader_id
        WHERE u.user_status = '1'
        AND u.user_role = 'user'
        ${excludeUserId ? `AND u.id != ${excludeUserId}` : ''}
        ORDER BY
          u.created_at DESC,
          tc_stats.trading_cards_count DESC
        LIMIT :perPage OFFSET :offset
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.user_status = '1'
        AND u.user_role = 'user'
        ${excludeUserId ? `AND u.id != ${excludeUserId}` : ''}
      `;

      const result = await sequelize.query(query, {
        replacements: { perPage, offset },
        type: QueryTypes.SELECT
      });

      const countResult = await sequelize.query(countQuery, {
        replacements: { excludeUserId },
        type: QueryTypes.SELECT
      });

      const total = (countResult[0] as any)?.total ?? 0;

      return {
        data: result,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasNextPage: page < Math.ceil(total / perPage),
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error getting traders list:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        perPage: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
  }

  // Follow/Unfollow user
  static async toggleFollow(traderId: number, userId: number) {
    try {
      // Check if user is trying to follow themselves
      if (traderId === userId) {
        throw new Error("Cannot follow yourself");
      }

      // Find existing follow relationship
      const existingFollower = await Follower.findOne({
        where: {
          trader_id: traderId,
          user_id: userId
        }
      });

      // Get the trader user to update followers count
      const trader = await User.findByPk(traderId);
      if (!trader) {
        throw new Error("Trader not found");
      }

      let response: any = {
        status: 'success',
        follower: null
      };

      if (existingFollower && existingFollower.id > 0) {
        // Unfollow: Delete the follow relationship
        await Follower.destroy({
          where: {
            trader_id: traderId,
            user_id: userId
          }
        });

        // Decrease followers count
        await trader.update({
          followers: Math.max(0, (trader.followers || 0) - 1)
        });

        response.follower = existingFollower;
      } else {
        // Follow: Create new follow relationship
        const newFollower = await Follower.create({
          trader_id: traderId,
          user_id: userId,
          follower_status: '1'
        } as any); // Type assertion to bypass type error

        // Increase followers count
        await trader.update({
          followers: (trader.followers ?? 0) + 1
        });

        response.sub_status = '1';
        response.follower = newFollower;
      }

      return response;
    } catch (error: any) {
      console.error('Error in toggleFollow:', error);
      throw error;
    }
  }
}
