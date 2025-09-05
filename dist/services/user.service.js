import { User } from "../models/user.model.js";
import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";
export class UserService {
    // Get user by ID
    static async getUserById(id) {
        return await User.findByPk(id);
    }
    // Get user profile details without authentication
    static async getUserProfile(userId) {
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
        }
        catch (error) {
            return null;
        }
    }
    // Get card statistics
    static async getCardStats(userId) {
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
                'All Products': allProducts[0]?.count || 0,
                'Ongoing Deals': ongoingDeals[0]?.count || 0,
                'Successful Trades': user?.trade_transactions || 0,
                'Products Sold': productsSold,
                'Products Bought': productsBought
            };
        }
        catch (error) {
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
    static async getTradingCards(userId, categoryId, page = 1, perPage = 12) {
        try {
            const offset = (page - 1) * perPage;
            let whereClause = `
        WHERE tc.trader_id = :userId 
        AND tc.mark_as_deleted IS NULL 
        AND tc.trading_card_status = '1' 
        AND tc.is_traded = '0' 
        AND (tc.can_trade = '1' OR tc.can_buy = '1')
      `;
            const replacements = { userId };
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
            const total = totalResult[0]?.total || 0;
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
        }
        catch (error) {
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
    static async getReviews(userId) {
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
        }
        catch (error) {
            return [];
        }
    }
    // Get interested cards count
    static async getInterestedCardsCount(userId) {
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
            return result[0]?.count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    // Get trade count
    static async getTradeCount(userId) {
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
            return result[0]?.count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    // Get following count from followers table
    static async getFollowingCount(userId) {
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
            return result[0]?.count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    // Update user
    static async updateUser(id, data) {
        try {
            const user = await User.findByPk(id);
            if (!user)
                return null;
            await user.update(data);
            return user;
        }
        catch (err) {
            throw err;
        }
    }
    // Delete user
    static async deleteUser(id) {
        const user = await User.findByPk(id);
        if (!user)
            return null;
        await User.destroy();
        return true;
    }
}
//# sourceMappingURL=user.service.js.map