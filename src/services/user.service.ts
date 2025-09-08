import { User } from "../models/user.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Follower } from "../models/follower.model.js";
import { InterestedIn } from "../models/interestedIn.model.js";
import { CreditPurchaseLog } from "../models/creditPurchaseLog.model.js";
import { CreditDeductionLog } from "../models/creditDeductionLog.model.js";
import { UserSocialMedia } from "../models/userSocialMedia.model.js";
import { SocialMedia } from "../models/socialMedia.model.js";
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";

export class UserService {
  // Get user by ID
  static async getUserById(id: number) {
    return await User.findByPk(id);
  }

  // Get user's social media links (original format)
  static async getUserSocialMedia(userId: number) {
    try {
      console.log('🔍 Getting social media for user ID:', userId);
      
      const socialMediaData = await UserSocialMedia.findAll({
        where: { 
          user_id: userId,
          social_media_url_status: '1'
        },
        include: [{
          model: SocialMedia,
          as: 'SocialMedia',
          where: { social_media_status: '1' },
          required: true
        }],
        order: [['created_at', 'ASC']]
      });

      console.log('✅ Social media data found:', socialMediaData.length, 'records');
      console.log('📋 Social media data:', JSON.stringify(socialMediaData, null, 2));

      // Transform to original array format
      const socialLinks: any[] = [];
      socialMediaData.forEach((item: any) => {
        console.log('🔄 Processing item:', item.dataValues);
        if (item.SocialMedia && item.social_media_url) {
          const platformName = item.SocialMedia.social_media_name?.toLowerCase();
          console.log('📱 Platform name:', platformName, 'URL:', item.social_media_url);
          if (platformName) {
            socialLinks.push({
              platform: platformName,
              url: item.social_media_url,
              name: item.SocialMedia.social_media_name
            });
          }
        }
      });

      console.log('🎯 Final social links:', socialLinks);
      return socialLinks;
    } catch (error: any) {
      console.error('❌ Error getting user social media:', error);
      return [];
    }
  }

  // Update user's social media links
  static async updateUserSocialMedia(userId: number, socialMediaData: any) {
    try {
      console.log('📱 Updating social media for user ID:', userId);
      console.log('📱 Social media data:', socialMediaData);

      const results = [];

      // Process each social media platform from FormData
      console.log('📱 Processing social media platforms:', Object.keys(socialMediaData));
      
      for (const [platformKey, platformData] of Object.entries(socialMediaData)) {
        console.log(`📱 Processing ${platformKey}:`, platformData);
        
        if (platformData && typeof platformData === 'object' && 'url' in platformData) {
          const url = platformData.url as string;
          console.log(`📱 ${platformKey} URL:`, url);
          
          if (url && url.trim() !== '') {
            // Find social media platform by name (MySQL compatible)
            let socialMediaPlatform = await SocialMedia.findOne({
              where: {
                social_media_name: {
                  [Op.like]: `%${platformKey}%`
                },
                social_media_status: '1'
              }
            });

            if (!socialMediaPlatform) {
              // Create platform if it doesn't exist
              socialMediaPlatform = await SocialMedia.create({
                social_media_name: platformKey.charAt(0).toUpperCase() + platformKey.slice(1),
                social_media_link: `https://${platformKey}.com`,
                social_media_icon: `${platformKey}-icon.png`,
                social_media_status: '1'
              } as any);
            }

            // Update or create user social media link
            const [userSocialMedia, created] = await UserSocialMedia.findOrCreate({
              where: {
                user_id: userId,
                social_media_id: socialMediaPlatform.id
              },
              defaults: {
                user_id: userId,
                social_media_id: socialMediaPlatform.id,
                social_media_url: url.trim(),
                social_media_url_status: '1'
              } as any
            });

            if (!created) {
              // Update existing record
              await userSocialMedia.update({
                social_media_url: url.trim(),
                social_media_url_status: '1'
              });
            }

            results.push({
              platform: platformKey.toLowerCase(),
              url: url.trim(),
              name: socialMediaPlatform.social_media_name
            });

            console.log(`✅ Updated ${platformKey}:`, url);
          } else {
            // Remove or deactivate social media link if URL is empty
            const socialMediaPlatform = await SocialMedia.findOne({
              where: {
                social_media_name: {
                  [Op.like]: `%${platformKey}%`
                }
              }
            });

            if (socialMediaPlatform) {
              const userSocialMedia = await UserSocialMedia.findOne({
                where: {
                  user_id: userId,
                  social_media_id: socialMediaPlatform.id
                }
              });

              if (userSocialMedia) {
                await userSocialMedia.update({
                  social_media_url_status: '0'
                });
                console.log(`❌ Deactivated ${platformKey} link`);
              }
            }
          }
        }
      }

      return {
        success: true,
        message: "Social media links updated successfully",
        data: results
      };
    } catch (error: any) {
      console.error('❌ Error updating user social media:', error);
      return {
        success: false,
        message: "Failed to update social media links",
        error: error.message
      };
    }
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

  // Update user profile (excludes email and username)
  static async updateUserProfile(userId: number, profileData: any) {
    try {
      console.log('🔍 Updating user profile for ID:', userId);
      console.log('📋 Profile data received:', profileData);

      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          message: "Valid user ID is required"
        };
      }

      // Find the user
      const user = await User.findByPk(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      // Remove email and username from update data (non-editable fields)
      const { email, username, ...allowedFields } = profileData;
      
      // Log what fields are being updated
      console.log('✅ Allowed fields to update:', Object.keys(allowedFields));
      console.log('🚫 Excluded fields (non-editable):', email ? 'email' : '', username ? 'username' : '');

      // Validate required fields
      const validationErrors: string[] = [];

      // Validate first_name
      if (allowedFields.first_name !== undefined) {
        if (!allowedFields.first_name || typeof allowedFields.first_name !== 'string') {
          validationErrors.push('First name is required and must be a string');
        } 
      }

      // Validate last_name
      if (allowedFields.last_name !== undefined) {
        if (!allowedFields.last_name || typeof allowedFields.last_name !== 'string') {
          validationErrors.push('Last name is required and must be a string');
        } 
      }

      // Validate phone_number
      if (allowedFields.phone_number !== undefined) {
        if (allowedFields.phone_number && typeof allowedFields.phone_number !== 'string') {
          validationErrors.push('Phone number must be a string');
        } else if (allowedFields.phone_number && allowedFields.phone_number.trim().length > 0) {
          // Remove all non-digit characters for validation
          const phoneDigits = allowedFields.phone_number.replace(/\D/g, '');
          if (phoneDigits.length < 3) {
            validationErrors.push('Phone number must have at least 3 digits');
          } else if (phoneDigits.length > 12) {
            validationErrors.push('Phone number must not exceed 12 digits');
          } else if (!/^[\+]?[0-9\s\-\(\)]+$/.test(allowedFields.phone_number.trim())) {
            validationErrors.push('Phone number contains invalid characters');
          }
        }
      }

      // Return validation errors if any
      if (validationErrors.length > 0) {
        return {
          success: false,
          message: "Validation failed",
          errors: validationErrors
        };
      }

      // Validate allowed fields
      const allowedUpdateFields = [
        'first_name', 'last_name', 'profile_picture', 'phone_number', 
        'country_code', 'about_user', 'bio', 'shipping_address', 
        'shipping_city', 'shipping_state', 'shipping_zip_code',
        'ebay_store_url', 'paypal_business_email', 'is_free_shipping',
        'shipping_flat_rate'
      ];

      const filteredData: any = {};
      Object.keys(allowedFields).forEach(key => {
        if (allowedUpdateFields.includes(key)) {
          // Special handling for profile_picture
          if (key === 'profile_picture') {
            // Allow null, empty string, or valid filename
            if (allowedFields[key] === null || allowedFields[key] === '' || allowedFields[key] === 'null') {
              filteredData[key] = null;
            } else {
              filteredData[key] = allowedFields[key];
            }
          } else {
            // Trim string values for other fields
            if (typeof allowedFields[key] === 'string') {
              filteredData[key] = allowedFields[key].trim();
            } else {
              filteredData[key] = allowedFields[key];
            }
          }
        }
      });

      console.log('📝 Final update data:', filteredData);

      // Update the user
      try {
        await user.update(filteredData);
        console.log('✅ User profile updated successfully');
      } catch (updateError: any) {
        console.error('❌ Database update error:', updateError);
        console.error('❌ Update data that caused error:', filteredData);
        throw updateError;
      }

      return {
        success: true,
        message: "Profile updated successfully",
        data: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username, // Non-editable
          email: user.email, // Non-editable
          profile_picture: user.profile_picture,
          phone_number: user.phone_number,
          country_code: user.country_code,
          about_user: user.about_user,
          bio: user.bio,
          shipping_address: user.shipping_address,
          shipping_city: user.shipping_city,
          shipping_state: user.shipping_state,
          shipping_zip_code: user.shipping_zip_code,
          ebay_store_url: user.ebay_store_url,
          paypal_business_email: user.paypal_business_email,
          is_free_shipping: user.is_free_shipping,
          shipping_flat_rate: user.shipping_flat_rate,
          updated_at: user.updatedAt
        }
      };
    } catch (error: any) {
      console.error('❌ Error updating user profile:', error);
      return {
        success: false,
        message: "Failed to update profile",
        error: error.message
      };
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

      // Get social media links from userSocialMedia table
      const socialLinks = await this.getUserSocialMedia(userId);

      return {
        user,
        interestedCardsCount,
        interestedCategories,
        socialLinks
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
        INNER JOIN (
          SELECT
            trader_id,
            COUNT(*) as trading_cards_count,
            SUM(CASE WHEN is_traded = '0' AND trading_card_status = '1' AND mark_as_deleted IS NULL THEN 1 ELSE 0 END) as active_cards_count,
            SUM(CASE WHEN is_traded = '1' THEN 1 ELSE 0 END) as completed_trades_count
          FROM trading_cards
          WHERE mark_as_deleted IS NULL
          AND trading_card_status = '1'
          AND is_traded = '0'
          AND (can_trade = 1 OR can_buy = 1)
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
        INNER JOIN (
          SELECT DISTINCT trader_id
          FROM trading_cards
          WHERE mark_as_deleted IS NULL
          AND trading_card_status = '1'
          AND is_traded = '0'
          AND (can_trade = 1 OR can_buy = 1)
        ) tc_stats ON u.id = tc_stats.trader_id
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

        response.sub_status = false;  // Unfollow = false
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

        response.sub_status = true;  // Follow = true
        response.follower = newFollower;
      }

      return response;
    } catch (error: any) {
      console.error('Error in toggleFollow:', error);
      throw error;
    }
  }

  // Get user's dashboard data (favorite products + following users)
  static async getUserDashboard(userId: number, page?: number, perPage?: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { favoriteProducts: [], followingUsers: [], pagination: null };
      }

      // Check if pagination parameters are provided
      const hasPagination = page !== undefined && perPage !== undefined;
      
      // Set default values only if pagination is requested
      const pageNum = hasPagination ? page : 1;
      const perPageNum = hasPagination ? perPage : 10;
      
      // Calculate offset for pagination
      const offset = (pageNum - 1) * perPageNum;

      // Get total count of favorite products
      const totalCountQuery = `
        SELECT COUNT(*) as total
        FROM interested_in ii
        INNER JOIN trading_cards tc ON ii.trading_card_id = tc.id
        INNER JOIN categories c ON tc.category_id = c.id
        WHERE ii.user_id = :userId
        AND ii.interested_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.trading_card_status = '1'
        AND c.sport_status = '1'
        AND tc.is_demo = '0'
        AND tc.is_traded != '1'
      `;

      const totalResult = await sequelize.query(totalCountQuery, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      const total = (totalResult[0] as any).total;

      // Get favorite products with conditional pagination
      let query = `
        SELECT DISTINCT
          tc.id,
          tc.category_id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.search_param,
          c.sport_name,
          tc.trader_id,
          tc.creator_id,
          tc.is_traded,
          tc.can_trade,
          tc.can_buy,
          CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in
        FROM interested_in ii
        INNER JOIN trading_cards tc ON ii.trading_card_id = tc.id
        INNER JOIN categories c ON tc.category_id = c.id
        WHERE ii.user_id = :userId
        AND ii.interested_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.trading_card_status = '1'
        AND c.sport_status = '1'
        AND tc.is_demo = '0'
        AND tc.is_traded != '1'
        ORDER BY ii.created_at DESC
      `;

      // Add pagination only if requested
      if (hasPagination) {
        query += ` LIMIT :limit OFFSET :offset`;
      }

      const replacements: any = { userId };
      if (hasPagination) {
        replacements.limit = perPageNum;
        replacements.offset = offset;
      }

      const result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      // Transform response to match /api/tradingCards format
      const products = result.map((card: any) => {
        // Add canTradeOrOffer logic (same as /api/tradingCards)
        let canTradeOrOffer = true;
        
        // If userId matches the card's trader_id, user can't trade with themselves
        if (card.trader_id === userId) {
          canTradeOrOffer = false;
        }
        
        // If card is already traded, user can't trade
        if (card.is_traded === '1') {
          canTradeOrOffer = false;
        }
        
        // If can_buy and can_trade are both 0, user can't trade or make offers
        if (card.can_buy === 0 && card.can_trade === 0) {
          canTradeOrOffer = false;
        }

        return {
          id: card.id,
          category_id: card.category_id,
          trading_card_img: card.trading_card_img,
          trading_card_img_back: card.trading_card_img_back,
          trading_card_slug: card.trading_card_slug,
          trading_card_recent_trade_value: card.trading_card_recent_trade_value,
          trading_card_asking_price: card.trading_card_asking_price,
          search_param: card.search_param || null,
          sport_name: card.sport_name || null,
          canTradeOrOffer: canTradeOrOffer,
          interested_in: Boolean(card.interested_in)
        };
      });

      // Calculate pagination info only if pagination was requested
      let pagination = null;
      if (hasPagination) {
        const totalPages = Math.ceil(total / perPageNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        pagination = {
          currentPage: pageNum,
          perPage: perPageNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        };
      }

      // Get following users
      const followingUsersQuery = `
        SELECT DISTINCT
          u.id as user_id,
          u.profile_picture,
          u.first_name,
          u.last_name,
          u.username,
          u.created_at,
          f.created_at as followed_on,
          COUNT(tc.id) as active_cards_count
        FROM followers f
        INNER JOIN users u ON f.trader_id = u.id
        LEFT JOIN trading_cards tc ON u.id = tc.trader_id 
          AND tc.mark_as_deleted IS NULL 
          AND tc.trading_card_status = '1'
        WHERE f.user_id = :userId
        AND f.follower_status = '1'
        AND u.user_status = '1'
        GROUP BY u.id, u.profile_picture, u.first_name, u.last_name, u.username, u.created_at, f.created_at
        ORDER BY f.created_at DESC
        LIMIT 10
      `;

      const followingUsers = await sequelize.query(followingUsersQuery, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      // Transform following users response
      const transformedFollowingUsers = followingUsers.map((user: any) => ({
        user_id: user.user_id,
        profile_picture: user.profile_picture ? user.profile_picture.split('/').pop() : null,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        followed_on: new Date(user.followed_on).toISOString()
      }));

      return { 
        favoriteProducts: products, 
        followingUsers: transformedFollowingUsers,
        pagination 
      };
    } catch (error: any) {
      console.error('Error getting favorite products:', error);
      throw error;
    }
  }

  // Get user's coin purchase history
  static async getCoinPurchaseHistory(userId: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { purchases: [], pagination: null };
      }

      // Calculate offset for pagination
      const offset = (page - 1) * perPage;

      // Get total count
      const totalCount = await CreditPurchaseLog.count({
        where: { user_id: userId }
      });

      // Get purchase history with pagination
      const purchases = await CreditPurchaseLog.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: perPage,
        offset: offset
      });

      // Transform response
      const transformedPurchases = purchases.map((purchase: any) => ({
        id: purchase.id,
        invoice_number: purchase.invoice_number,
        amount: purchase.amount,
        coins: purchase.coins,
        transaction_id: purchase.transaction_id,
        payment_status: purchase.payment_status,
        payee_email_address: purchase.payee_email_address,
        merchant_id: purchase.merchant_id,
        payment_source: purchase.payment_source,
        payer_id: purchase.payer_id,
        payer_full_name: purchase.payer_full_name,
        payer_email_address: purchase.payer_email_address,
        payer_address: purchase.payer_address,
        payer_country_code: purchase.payer_country_code,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const pagination = {
        currentPage: page,
        perPage: perPage,
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      };

      return { purchases: transformedPurchases, pagination };
    } catch (error: any) {
      console.error('Error getting coin purchase history:', error);
      throw error;
    }
  }

  // Get user's coin deduction history
  static async getCoinDeductionHistory(userId: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { deductions: [], pagination: null };
      }

      // Calculate offset for pagination
      const offset = (page - 1) * perPage;

      // Get total count
      const totalCount = await CreditDeductionLog.count({
        where: { 
          [Op.or]: [
            { sent_to: userId },
            { sent_by: userId }
          ]
        }
      });

      // Get deduction history with pagination
      const deductions = await CreditDeductionLog.findAll({
        where: { 
          [Op.or]: [
            { sent_to: userId },
            { sent_by: userId }
          ]
        },
        order: [['created_at', 'DESC']],
        limit: perPage,
        offset: offset
      });

      // Transform response
      const transformedDeductions = deductions.map((deduction: any) => ({
        id: deduction.id,
        trade_id: deduction.trade_id,
        buy_sell_id: deduction.buy_sell_id,
        cart_detail_id: deduction.cart_detail_id,
        trade_status: deduction.trade_status,
        sent_to: deduction.sent_to,
        sent_by: deduction.sent_by,
        coin: deduction.coin,
        status: deduction.status,
        deduction_from: deduction.deduction_from,
        created_at: deduction.created_at,
        updated_at: deduction.updated_at
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const pagination = {
        currentPage: page,
        perPage: perPage,
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      };

      return { deductions: transformedDeductions, pagination };
    } catch (error: any) {
      console.error('Error getting coin deduction history:', error);
      throw error;
    }
  }

  // Get user's PayPal transactions (coin purchase + deduction history)
  static async getPayPalTransactions(userId: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { coinPurchaseHistory: [], coinDeductionHistory: [], pagination: null };
      }

      // Calculate offset for pagination
      const offset = (page - 1) * perPage;

      // Get coin purchase history with pagination
      const totalPurchaseCount = await CreditPurchaseLog.count({
        where: { user_id: userId }
      });

      const purchases = await CreditPurchaseLog.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: perPage,
        offset: offset
      });

      const transformedPurchases = purchases.map((purchase: any) => ({
        id: purchase.id,
        invoice_number: purchase.invoice_number,
        amount: purchase.amount,
        coins: purchase.coins,
        transaction_id: purchase.transaction_id,
        payment_status: purchase.payment_status,
        payee_email_address: purchase.payee_email_address,
        merchant_id: purchase.merchant_id,
        payment_source: purchase.payment_source,
        payer_id: purchase.payer_id,
        payer_full_name: purchase.payer_full_name,
        payer_email_address: purchase.payer_email_address,
        payer_address: purchase.payer_address,
        payer_country_code: purchase.payer_country_code,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at
      }));

      // Get coin deduction history with pagination
      const totalDeductionCount = await CreditDeductionLog.count({
        where: { 
          [Op.or]: [
            { sent_to: userId },
            { sent_by: userId }
          ]
        }
      });

      const deductions = await CreditDeductionLog.findAll({
        where: { 
          [Op.or]: [
            { sent_to: userId },
            { sent_by: userId }
          ]
        },
        order: [['created_at', 'DESC']],
        limit: perPage,
        offset: offset
      });

      const transformedDeductions = deductions.map((deduction: any) => ({
        id: deduction.id,
        trade_id: deduction.trade_id,
        buy_sell_id: deduction.buy_sell_id,
        cart_detail_id: deduction.cart_detail_id,
        trade_status: deduction.trade_status,
        sent_to: deduction.sent_to,
        sent_by: deduction.sent_by,
        coin: deduction.coin,
        status: deduction.status,
        deduction_from: deduction.deduction_from,
        created_at: deduction.created_at,
        updated_at: deduction.updated_at
      }));

      // Calculate pagination info (use the larger of the two counts)
      const totalCount = Math.max(totalPurchaseCount, totalDeductionCount);
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const pagination = {
        currentPage: page,
        perPage: perPage,
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      };

      return { 
        coinPurchaseHistory: transformedPurchases, 
        coinDeductionHistory: transformedDeductions,
        pagination 
      };
    } catch (error: any) {
      console.error('Error getting PayPal transactions:', error);
      throw error;
    }
  }
}
