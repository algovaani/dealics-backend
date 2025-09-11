import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Follower } from "../models/follower.model.js";
import { InterestedIn } from "../models/interestedIn.model.js";
import { CreditPurchaseLog } from "../models/creditPurchaseLog.model.js";
import { CreditDeductionLog } from "../models/creditDeductionLog.model.js";
import { UserSocialMedia } from "../models/userSocialMedia.model.js";
import { SocialMedia } from "../models/socialMedia.model.js";
import { Shipment } from "../models/shipment.model.js";
import { Address } from "../models/address.model.js";
import { CategoryShippingRate } from "../models/categoryShippingRates.model.js";
import { BuySellCard } from "../models/index.js";
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";

export class UserService {
  // Format added_on date to DD.MM.YYYY H:MM AM/PM format
  private static formatAddedOnDate(dateString: string | Date): string {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "01.01.2024 12:00 AM"; // Fallback
      }
      
      // Get day, month, year
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      // Get hours and minutes
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Convert to 12-hour format
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const hoursStr = String(hours);
      
      return `${day}.${month}.${year} ${hoursStr}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting added_on date:', error);
      return "01.01.2024 12:00 AM"; // Fallback
    }
  }

  // Format followed_on date to DD-MM-YYYY HH:MM AM/PM format
  private static formatFollowedOnDate(dateString: string | Date): string {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "01-01-2024 12:00 AM"; // Fallback
      }
      
      // Get day, month, year
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      // Get hours and minutes
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Convert to 12-hour format
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const hoursStr = String(hours).padStart(2, '0'); // Always 2 digits for hours
      
      return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting followed_on date:', error);
      return "01-01-2024 12:00 AM"; // Fallback
    }
  }

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
          'ebay_store_url', 'created_at', 'updated_at'
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
        'all_products': (allProducts[0] as any)?.count || 0,
        'ongoing_deals': (ongoingDeals[0] as any)?.count || 0,
        'successful_trades': user?.trade_transactions || 0,
        'products_sold': productsSold,
        'products_bought': productsBought
      };
    } catch (error) {
      return {
        'all_products': 0,
        'ongoing_deals': 0,
        'successful_trades': 0,
        'products_sold': 0,
        'products_bought': 0
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

      // Format user data with joined_date
      const userData = user.toJSON();
      
      // Get the created date from userData (raw database field)
      const createdAtValue = (userData as any).created_at;
      
      // Format joined_date as DD-MM-YYYY
      let joinedDate;
      if (createdAtValue) {
        const date = new Date(createdAtValue);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        joinedDate = `${day}-${month}-${year}`;
      } else {
        joinedDate = "01-01-2024"; // Fallback
      }
      
      // Debug: Log the values
      console.log('createdAtValue from userData:', createdAtValue);
      console.log('formatted joinedDate:', joinedDate);
      
      // Create formatted user object with joined_date
      const formattedUser = {
        ...userData,
        joined_date: joinedDate
      };
      
      console.log('formattedUser joined_date:', formattedUser.joined_date);

      return {
        user: formattedUser,
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
          COALESCE(tc_stats.completed_trades_count, 0) as completed_trades_count,
          CASE 
            WHEN f.id IS NOT NULL AND f.follower_status = '1' THEN 1 
            ELSE 0 
          END as following
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
        LEFT JOIN followers f ON u.id = f.trader_id AND f.user_id = ${excludeUserId || 'NULL'} AND f.follower_status = '1'
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
        LEFT JOIN followers f ON u.id = f.trader_id AND f.user_id = ${excludeUserId || 'NULL'} AND f.follower_status = '1'
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

  // Get user's likes and following data (favorite products + following users)
  static async getLikesAndFollowing(userId: number, page?: number, perPage?: number) {
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
          ii.created_at as added_on,
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
          interested_in: Boolean(card.interested_in),
          added_on: card.added_on ? UserService.formatAddedOnDate(card.added_on) : null
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
        followed_on: UserService.formatFollowedOnDate(user.followed_on)
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

  // Get unified coin transaction history (purchase or deduction based on type parameter)
  static async getCoinTransactionHistory(userId: number, type: 'purchase' | 'deduction' | 'all', page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { transactions: [], pagination: null };
      }

      // Validate type parameter
      if (!['purchase', 'deduction', 'all'].includes(type)) {
        throw new Error('Invalid type parameter. Must be "purchase", "deduction", or "all"');
      }

      // Calculate offset for pagination
      const offset = (page - 1) * perPage;

      let transactions: any[] = [];
      let totalCount = 0;

      if (type === 'purchase' || type === 'all') {
        console.log('Fetching purchase logs for type:', type);
        // Get coin purchase history
        const purchaseCount = await CreditPurchaseLog.count({
          where: { user_id: userId }
        });

        const purchases = await CreditPurchaseLog.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          limit: type === 'all' ? perPage : perPage,
          offset: type === 'all' ? offset : offset
        });

        const transformedPurchases = purchases.map((purchase: any) => ({
          transaction_id: purchase.transaction_id,
          merchant_id: purchase.merchant_id,
          coins: purchase.coins,
          amount: purchase.amount,
          payment_status: purchase.payment_status,
          payment_source: purchase.payment_source,
          created_at: UserService.formatFollowedOnDate(purchase.created_at)
        }));

        if (type === 'purchase') {
          transactions = transformedPurchases;
          totalCount = purchaseCount;
        } else {
          transactions = [...transformedPurchases];
          totalCount += purchaseCount;
        }
      }

      if (type === 'deduction' || type === 'all') {
        console.log('Fetching deduction logs for type:', type);
        // Get coin deduction history
        const deductionCount = await CreditDeductionLog.count({
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
          limit: type === 'all' ? perPage : perPage,
          offset: type === 'all' ? offset : offset
        });

        const transformedDeductions = deductions.map((deduction: any) => ({
          id: deduction.id,
          type: 'deduction',
          trade_id: deduction.trade_id,
          buy_sell_id: deduction.buy_sell_id,
          cart_detail_id: deduction.cart_detail_id,
          trade_status: deduction.trade_status,
          sent_to: deduction.sent_to,
          sent_by: deduction.sent_by,
          coin: deduction.coin,
          status: deduction.status,
          deduction_from: deduction.deduction_from,
          created_at: UserService.formatFollowedOnDate(deduction.created_at),
        }));

        if (type === 'deduction') {
          transactions = transformedDeductions;
          totalCount = deductionCount;
        } else {
          transactions = [...transactions, ...transformedDeductions];
          totalCount += deductionCount;
        }
      }

      // Sort by created_at if type is 'all'
      if (type === 'all') {
        transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        // Apply pagination to the combined results
        transactions = transactions.slice(offset, offset + perPage);
      }

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

      return { transactions, pagination };
    } catch (error: any) {
      console.error('Error getting coin transaction history:', error);
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

  // Get user's shipment log with pagination
  static async getShipmentLog(userId: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return { 
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await Shipment.count({
        where: {
          user_id: userId,
          tracking_id: {
            [Op.ne]: null // whereNotNull equivalent
          }
        }
      });

      // Get shipments with tracking_id and include address relationships
      const shipments = await Shipment.findAll({
        where: {
          user_id: userId,
          tracking_id: {
            [Op.ne]: null // whereNotNull equivalent
          }
        },
        include: [
          {
            model: Address,
            as: 'toAddress',
            attributes: ['id', 'name', 'phone', 'email', 'street1', 'street2', 'city', 'state', 'country', 'zip']
          },
          {
            model: Address,
            as: 'fromAddress',
            attributes: ['id', 'name', 'phone', 'email', 'street1', 'street2', 'city', 'state', 'country', 'zip']
          }
        ],
        order: [['updated_at', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Transform shipments to include rate condition and final rate
      const transformedShipments = shipments.map((shipment: any) => {
        const shipmentData = shipment.toJSON();
        
        // Initialize rate condition, final rate, item label, and insured status
        let rateCondition = null;
        let finalRate = null;
        let itemLabel = null;
        let insured = false;
        
        // Check if selected_rate and shipment_response exist
        if (shipmentData.selected_rate && shipmentData.shipment_response) {
          try {
            let shipmentResponse;
            
            if (typeof shipmentData.shipment_response === 'string') {
              // Check if the string looks like valid JSON
              const trimmedResponse = shipmentData.shipment_response.trim();
              if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
                shipmentResponse = JSON.parse(shipmentData.shipment_response);
              } else {
                // If it's not JSON, skip processing
                shipmentResponse = null;
              }
            } else {
              shipmentResponse = shipmentData.shipment_response;
            }
            
            // Check if rates array exists in the response
            if (shipmentResponse && shipmentResponse.rates && Array.isArray(shipmentResponse.rates)) {
              // Find the desired rate based on selected_rate
              const desiredRate = shipmentResponse.rates.find((rate: any) => rate.id === shipmentData.selected_rate);
              
              if (desiredRate) {
                rateCondition = {
                  id: desiredRate.id,
                  service: desiredRate.service || null,
                  service_code: desiredRate.service_code || null,
                  rate: desiredRate.rate || null,
                  currency: desiredRate.currency || null,
                  retail_rate: desiredRate.retail_rate || null,
                  list_rate: desiredRate.list_rate || null,
                  delivery_days: desiredRate.delivery_days || null,
                  delivery_date: desiredRate.delivery_date || null,
                  delivery_date_guaranteed: desiredRate.delivery_date_guaranteed || null,
                  estimated_delivery_date: desiredRate.estimated_delivery_date || null
                };
                
                // Set final rate (you can customize this logic based on your needs)
                finalRate = desiredRate.rate || desiredRate.retail_rate || desiredRate.list_rate || null;
              }
            }
          } catch (error) {
            console.error('Error parsing shipment_response:', error);
            console.error('Shipment response content:', shipmentData.shipment_response);
            // Keep rateCondition and finalRate as null if parsing fails
          }
        }
        
        // Process item_label from postage_label
        if (shipmentData.postage_label) {
          try {
            let postageLabel;
            
            if (typeof shipmentData.postage_label === 'string') {
              // Check if the string looks like valid JSON
              const trimmedLabel = shipmentData.postage_label.trim();
              if (trimmedLabel.startsWith('{') || trimmedLabel.startsWith('[')) {
                postageLabel = JSON.parse(shipmentData.postage_label);
              } else {
                // If it's not JSON, treat it as a plain string
                itemLabel = shipmentData.postage_label;
                postageLabel = null;
              }
            } else {
              postageLabel = shipmentData.postage_label;
            }
            
            if (postageLabel) {
              if (Array.isArray(postageLabel)) {
                if (postageLabel.length > 0 && postageLabel[0] && postageLabel[0].object) {
                  // Multiple objects (buy/sell) - join with ' | '
                  itemLabel = postageLabel.map(item => item.object).join(' | ');
                }
              } else if (postageLabel && postageLabel.object) {
                // Single object structure (trade)
                itemLabel = postageLabel.object;
              }
            }
          } catch (error) {
            console.error('Error parsing postage_label:', error);
            console.error('Postage label content:', shipmentData.postage_label);
            // If JSON parsing fails, use the raw string as itemLabel
            itemLabel = typeof shipmentData.postage_label === 'string' 
              ? shipmentData.postage_label 
              : null;
          }
        }
        
        // Determine insured status
        if (shipmentData.is_insured === 1) {
          insured = true;
        } else if (shipmentData.is_insured === 0 || shipmentData.is_insured === null) {
          // Check if current user is the recipient (to_address user_id matches current user)
          // This would require additional logic to compare with current user ID
          // For now, we'll set it based on the is_insured field
          insured = false;
        }
        
        // Format created_at to 'Y-m-d H:i:s' format
        let formattedCreatedAt = null;
        if (shipmentData.created_at) {
          const date = new Date(shipmentData.created_at);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedCreatedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          }
        }

        return {
          parcel: shipmentData.parcel,
          parcel_weight_unit: shipmentData.parcel_weight_unit,
          postage_label: shipmentData.postage_label,
          tracking_id: shipmentData.tracking_id,
          is_completed: shipmentData.is_completed,
          shipment_status: shipmentData.shipment_status,
          is_insured: shipmentData.is_insured,
          toAddress: shipmentData.toAddress,
          fromAddress: shipmentData.fromAddress,
          final_rate: finalRate,
          created_at: formattedCreatedAt
        };
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return { 
        success: true,
        data: {
          shipments: transformedShipments,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting shipment log:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get shipment log'
        }
      };
    }
  }

  // Track shipment using EasyPost API
  static async trackShipment(trackingId: string) {
    try {
      // Get API credentials from environment
      const apiKey = process.env.EASYPOST_API_KEY;
      const apiMode = process.env.EASYPOST_MODE;
      
      if (!apiKey) {
        throw new Error('EasyPost API key not configured');
      }

      // Use test tracking ID if in test mode
      let finalTrackingId = trackingId;
      if (apiMode === 'test') {
        finalTrackingId = 'EZ2000000002';
      }

      // Make request to EasyPost API
      const response = await fetch('https://api.easypost.com/v2/trackers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracker: {
            tracking_code: finalTrackingId,
            carrier: 'USPS'
          }
        })
      });

      const responseData = await response.json();

      if (response.status === 200 || response.status === 201) {
        // Process tracking details
        let trackingData: any = {};
        
        if (responseData.tracking_details && responseData.tracking_details.length > 0) {
          responseData.tracking_details.forEach((details: any) => {
            const trackingLocation: string[] = [];
            
            // Build location string
            if (details.tracking_location?.city) {
              trackingLocation.push(details.tracking_location.city);
            }
            if (details.tracking_location?.state) {
              trackingLocation.push(details.tracking_location.state);
            }
            if (details.tracking_location?.country) {
              trackingLocation.push(details.tracking_location.country);
            }
            if (details.tracking_location?.zip) {
              trackingLocation.push(details.tracking_location.zip);
            }

            const locationString = trackingLocation.join(', ');
            
            // Format date and time
            const date = new Date(details.datetime);
            const dateKey = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            });
            const timeKey = date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });

            // Initialize nested structure if not exists
            if (!trackingData[dateKey]) {
              trackingData[dateKey] = {};
            }

            trackingData[dateKey][timeKey] = {
              message: details.message,
              tracking_location: locationString
            };
          });
        }

        return {
          success: true,
          data: {
            ...responseData,
            TrackingData: trackingData
          }
        };
      } else {
        return {
          success: false,
          error: responseData
        };
      }

    } catch (error: any) {
      console.error('Error tracking shipment:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to track shipment'
        }
      };
    }
  }

  // Get shipping label using EasyPost API
  static async getShippingLabel(trackingId: string) {
    try {
      // Get API credentials from environment
      const apiKey = process.env.EASYPOST_API_KEY;
      
      if (!apiKey) {
        throw new Error('EasyPost API key not configured');
      }

      // Find shipment by tracking_id
      const shipment = await Shipment.findOne({
        where: {
          tracking_id: trackingId
        },
        attributes: ['id', 'shipment_response']
      });

      if (!shipment) {
        return {
          success: false,
          error: {
            message: 'Shipment not found with this tracking ID'
          }
        };
      }

      // Check if shipment_response exists and is valid
      if (!shipment.shipment_response) {
        return {
          success: false,
          error: {
            message: 'Shipment response not available'
          }
        };
      }

      // Parse shipment_response to get shipment ID
      let shipmentResponse;
      try {
        shipmentResponse = typeof shipment.shipment_response === 'string' 
          ? JSON.parse(shipment.shipment_response) 
          : shipment.shipment_response;
      } catch (parseError) {
        return {
          success: false,
          error: {
            message: 'Invalid shipment response data'
          }
        };
      }

      if (!shipmentResponse || !shipmentResponse.id) {
        return {
          success: false,
          error: {
            message: 'Shipment ID not found in response'
          }
        };
      }

      // Make request to EasyPost API to get shipping label
      const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentResponse.id}/label?file_format=ZPL`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData
        };
      } else {
        return {
          success: false,
          error: responseData
        };
      }

    } catch (error: any) {
      console.error('Error getting shipping label:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get shipping label'
        }
      };
    }
  }

  // Get category log (shipping rates) for authenticated user
  static async getCategoryLog(userId: number, categoryId?: number, specificId?: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Get categories with grades_ungraded_status = true
      const categories = await Category.findAll({
        where: {
          grades_ungraded_status: true
        },
        attributes: ['id', 'category_name', 'grades_ungraded_status']
      });

      // Build query for shipping rates
      let whereClause: any = {
        user_id: userId
      };

      // Add category filter if provided
      if (categoryId && !isNaN(categoryId) && categoryId > 0) {
        whereClause.category_id = categoryId;
      }

      // Get shipping rates with user relationship
      const shippingRates = await CategoryShippingRate.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'username', 'email']
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'category_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Get specific shipping rate if ID is provided
      let specificShippingRate = null;
      if (specificId && !isNaN(specificId) && specificId > 0) {
        specificShippingRate = await CategoryShippingRate.findByPk(specificId, {
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name', 'username', 'email']
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'category_name']
            }
          ]
        });

        if (!specificShippingRate) {
          return {
            success: false,
            error: {
              message: 'Shipping Category not found'
            }
          };
        }
      }

      return {
        success: true,
        data: {
          categories,
          shippingRates,
          specificShippingRate,
          filterData: {
            category_id: categoryId || null
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting category log:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get category log'
        }
      };
    }
  }

  // Get category shipping rate history for authenticated user
  static async getCategoryShippingRateHistory(userId: number, categoryId?: number, specificId?: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Get categories with grades_ungraded_status = true
      const categories = await Category.findAll({
        where: {
          grades_ungraded_status: true
        },
        attributes: ['id', 'sport_name']
      });

      // Build query for shipping rates
      let whereClause: any = {
        user_id: userId
      };

      // Add category filter if provided
      if (categoryId && !isNaN(categoryId) && categoryId > 0) {
        whereClause.category_id = categoryId;
      }

      // Initialize variables
      let shippingRates: any[] = [];
      let flattenedShippingRates: any[] = [];
      let totalCount = 0;
      let totalPages = 0;
      let hasNextPage = false;
      let hasPrevPage = false;

      // Only get paginated list if no specific ID is provided
      if (!specificId || isNaN(specificId) || specificId <= 0) {
        // Calculate pagination
        const offset = (page - 1) * perPage;
        const limit = perPage;

        // Get total count for pagination
        totalCount = await CategoryShippingRate.count({
          where: whereClause
        });

        // Get shipping rates with pagination (no user relationship)
        shippingRates = await CategoryShippingRate.findAll({
          where: whereClause,
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['sport_name']
            }
          ],
          order: [['created_at', 'DESC']],
          limit: limit,
          offset: offset,
          attributes: ['id', 'category_id', 'user_id', 'usa_rate', 'canada_rate']
        });

        // Flatten category relationship to only include category_name
        flattenedShippingRates = shippingRates.map((rate: any) => {
          const rateData = rate.toJSON();
          return {
            id: rateData.id,
            category_id: rateData.category_id,
            user_id: rateData.user_id,
            usa_rate: rateData.usa_rate,
            canada_rate: rateData.canada_rate,
            category_name: rateData.category?.sport_name || null
          };
        });

        // Calculate pagination metadata
        totalPages = Math.ceil(totalCount / perPage);
        hasNextPage = page < totalPages;
        hasPrevPage = page > 1;
      }

      // Get specific shipping rate if ID is provided
      let specificShippingRate = null;
      if (specificId && !isNaN(specificId) && specificId > 0) {
        const specificRate = await CategoryShippingRate.findOne({
          where: {
            id: specificId,
            user_id: userId
          },
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['sport_name']
            }
          ],
          attributes: ['id', 'category_id', 'user_id', 'usa_rate', 'canada_rate']
        });

        if (!specificRate) {
          return {
            success: false,
            error: {
              message: 'Shipping Category not found'
            }
          };
        }

        // Flatten category relationship for specific rate
        const rateData = specificRate.toJSON() as any;
        specificShippingRate = {
          id: rateData.id,
          category_id: rateData.category_id,
          user_id: rateData.user_id,
          usa_rate: rateData.usa_rate,
          canada_rate: rateData.canada_rate,
          category_name: rateData.category?.sport_name || null
        };
      }

      return {
        success: true,
        data: {
          categories,
          shippingRates: flattenedShippingRates,
          specificShippingRate,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting category shipping rate history:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get category shipping rate history'
        }
      };
    }
  }

  // Update category shipping rate for authenticated user
  static async updateCategoryShippingRate(userId: number, rateId: number, updateData: any) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate rateId
      if (!rateId || isNaN(rateId) || rateId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid rate ID is required'
          }
        };
      }

      // Check if the shipping rate exists and belongs to the user
      const existingRate = await CategoryShippingRate.findOne({
        where: {
          id: rateId,
          user_id: userId
        }
      });

      if (!existingRate) {
        return {
          success: false,
          error: {
            message: 'Shipping rate not found or you do not have permission to update it'
          }
        };
      }

      // Prepare update data (only allow specific fields)
      const allowedFields = ['category_id', 'usa_rate', 'canada_rate'];
      const updateFields: any = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      }

      // Check if there's anything to update
      if (Object.keys(updateFields).length === 0) {
        return {
          success: false,
          error: {
            message: 'No valid fields provided for update'
          }
        };
      }

      // Update the shipping rate
      await CategoryShippingRate.update(updateFields, {
        where: {
          id: rateId,
          user_id: userId
        }
      });

      // Get the updated rate with category information
      const updatedRate = await CategoryShippingRate.findOne({
        where: {
          id: rateId,
          user_id: userId
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['sport_name']
          }
        ],
        attributes: ['id', 'category_id', 'user_id', 'usa_rate', 'canada_rate']
      });

      // Flatten category relationship
      const rateData = updatedRate?.toJSON() as any;
      const flattenedRate = {
        id: rateData.id,
        category_id: rateData.category_id,
        user_id: rateData.user_id,
        usa_rate: rateData.usa_rate,
        canada_rate: rateData.canada_rate,
        category_name: rateData.category?.sport_name || null
      };

      return {
        success: true,
        data: {
          message: 'Category shipping rate updated successfully',
          shippingRate: flattenedRate
        }
      };

    } catch (error: any) {
      console.error('Error updating category shipping rate:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to update category shipping rate'
        }
      };
    }
  }

  // Create category shipping rate for authenticated user
  static async createCategoryShippingRate(userId: number, createData: any) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate required fields
      const requiredFields = ['category_id', 'usa_rate', 'canada_rate'];
      const missingFields = requiredFields.filter(field => 
        createData[field] === undefined || createData[field] === null || createData[field] === ''
      );

      if (missingFields.length > 0) {
        return {
          success: false,
          error: {
            message: `Required fields are missing: ${missingFields.join(', ')}`
          }
        };
      }

      // Validate category_id
      if (!createData.category_id || isNaN(createData.category_id) || createData.category_id <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid category ID is required'
          }
        };
      }

      // Validate rates
      if (isNaN(parseFloat(createData.usa_rate)) || parseFloat(createData.usa_rate) < 0) {
        return {
          success: false,
          error: {
            message: 'Valid USA rate is required (must be a number >= 0)'
          }
        };
      }

      if (isNaN(parseFloat(createData.canada_rate)) || parseFloat(createData.canada_rate) < 0) {
        return {
          success: false,
          error: {
            message: 'Valid Canada rate is required (must be a number >= 0)'
          }
        };
      }

      // Check if category exists and has grades_ungraded_status = true
      const category = await Category.findOne({
        where: {
          id: createData.category_id,
          grades_ungraded_status: true
        }
      });

      if (!category) {
        return {
          success: false,
          error: {
            message: 'Category not found or not eligible for shipping rates'
          }
        };
      }

      // Check if user already has a shipping rate for this category
      const existingRate = await CategoryShippingRate.findOne({
        where: {
          user_id: userId,
          category_id: createData.category_id
        }
      });

      if (existingRate) {
        return {
          success: false,
          error: {
            message: 'You already have a shipping rate for this category. Use update instead.'
          }
        };
      }

      // Create the shipping rate
      const newRate = await CategoryShippingRate.create({
        user_id: userId,
        category_id: parseInt(createData.category_id),
        usa_rate: parseFloat(createData.usa_rate),
        canada_rate: parseFloat(createData.canada_rate)
      } as any);

      // Get the created rate with category information
      const createdRate = await CategoryShippingRate.findOne({
        where: {
          id: newRate.id
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['sport_name']
          }
        ],
        attributes: ['id', 'category_id', 'user_id', 'usa_rate', 'canada_rate']
      });

      // Flatten category relationship
      const rateData = createdRate?.toJSON() as any;
      const flattenedRate = {
        id: rateData.id,
        category_id: rateData.category_id,
        user_id: rateData.user_id,
        usa_rate: rateData.usa_rate,
        canada_rate: rateData.canada_rate,
        category_name: rateData.category?.sport_name || null
      };

      return {
        success: true,
        data: {
          message: 'Category shipping rate created successfully',
          shippingRate: flattenedRate
        }
      };

    } catch (error: any) {
      console.error('Error creating category shipping rate:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to create category shipping rate'
        }
      };
    }
  }

  // Delete category shipping rate for authenticated user
  static async deleteCategoryShippingRate(userId: number, shippingRateId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate shippingRateId
      if (!shippingRateId || isNaN(shippingRateId) || shippingRateId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid shipping rate ID is required'
          }
        };
      }

      // Find the shipping rate belonging to the user
      const shippingCategory = await CategoryShippingRate.findOne({
        where: {
          user_id: userId,
          id: shippingRateId
        }
      });

      if (!shippingCategory) {
        return {
          success: false,
          error: {
            message: 'Category not found or you do not have permission to delete this Category'
          }
        };
      }

      // Delete the shipping rate
      await shippingCategory.destroy();

      return {
        success: true,
        message: 'Category deleted successfully'
      };

    } catch (error: any) {
      console.error('Error deleting category shipping rate:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to delete category shipping rate'
        }
      };
    }
  }

  // Get all addresses for authenticated user
  static async getAddresses(userId: number, page: number = 1, perPage: number = 10) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await Address.count({
        where: {
          user_id: userId,
          is_deleted: '0'
        }
      });

      // Get addresses with pagination
      const addresses = await Address.findAll({
        where: {
          user_id: userId,
          is_deleted: '0'
        },
        order: [['mark_default', 'ASC'], ['created_at', 'DESC']],
        limit: limit,
        offset: offset,
        attributes: [
          'id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2',
          'city', 'state', 'country', 'zip', 'is_sender', 'is_deleted',
          'latitude', 'longitude', 'adr_id', 'mark_default', 'created_at', 'updated_at'
        ]
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          addresses,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting addresses:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get addresses'
        }
      };
    }
  }

  // Get address by ID for authenticated user
  static async getAddressById(userId: number, addressId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate addressId
      if (!addressId || isNaN(addressId) || addressId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid address ID is required'
          }
        };
      }

      // Get address
      const address = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId,
          is_deleted: '0'
        },
        attributes: [
          'id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2',
          'city', 'state', 'country', 'zip', 'is_sender', 'is_deleted',
          'latitude', 'longitude', 'adr_id', 'mark_default', 'created_at', 'updated_at'
        ]
      });

      if (!address) {
        return {
          success: false,
          error: {
            message: 'Address not found or you do not have permission to view it'
          }
        };
      }

      return {
        success: true,
        data: {
          address
        }
      };

    } catch (error: any) {
      console.error('Error getting address by ID:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get address'
        }
      };
    }
  }

  // Create address for authenticated user
  static async createAddress(userId: number, addressData: any) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate required fields
      const requiredFields = ['name', 'phone', 'email', 'street1', 'city', 'state', 'country', 'zip'];
      const missingFields = requiredFields.filter(field => 
        !addressData[field] || addressData[field].toString().trim() === ''
      );

      if (missingFields.length > 0) {
        return {
          success: false,
          error: {
            message: `Required fields are missing: ${missingFields.join(', ')}`
          }
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(addressData.email)) {
        return {
          success: false,
          error: {
            message: 'Valid email address is required'
          }
        };
      }

      // Validate phone format (basic validation)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(addressData.phone.replace(/[\s\-\(\)]/g, ''))) {
        return {
          success: false,
          error: {
            message: 'Valid phone number is required'
          }
        };
      }

      // If this is being set as default, unset other defaults
      if (addressData.mark_default === 1) {
        await Address.update(
          { mark_default: 2 },
          { where: { user_id: userId } }
        );
      }

      // Create the address
      const newAddress = await Address.create({
        user_id: userId,
        name: addressData.name.trim(),
        phone: addressData.phone.trim(),
        email: addressData.email.trim(),
        street1: addressData.street1.trim(),
        street2: addressData.street2 ? addressData.street2.trim() : null,
        city: addressData.city.trim(),
        state: addressData.state.trim(),
        country: addressData.country.trim(),
        zip: addressData.zip.trim(),
        is_sender: addressData.is_sender || '0',
        latitude: addressData.latitude ? parseFloat(addressData.latitude) : null,
        longitude: addressData.longitude ? parseFloat(addressData.longitude) : null,
        adr_id: addressData.adr_id ? addressData.adr_id.trim() : null,
        mark_default: addressData.mark_default || 2
      } as any);

      return {
        success: true,
        data: {
          message: 'Address created successfully',
          address: newAddress
        }
      };

    } catch (error: any) {
      console.error('Error creating address:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to create address'
        }
      };
    }
  }

  // Update address for authenticated user
  static async updateAddress(userId: number, addressId: number, updateData: any) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate addressId
      if (!addressId || isNaN(addressId) || addressId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid address ID is required'
          }
        };
      }

      // Check if address exists and belongs to user
      const existingAddress = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId,
          is_deleted: '0'
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          error: {
            message: 'Address not found or you do not have permission to update it'
          }
        };
      }

      // Validate email format if provided
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return {
            success: false,
            error: {
              message: 'Valid email address is required'
            }
          };
        }
      }

      // Validate phone format if provided
      if (updateData.phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(updateData.phone.replace(/[\s\-\(\)]/g, ''))) {
          return {
            success: false,
            error: {
              message: 'Valid phone number is required'
            }
          };
        }
      }

      // If this is being set as default, unset other defaults
      if (updateData.mark_default === 1) {
        await Address.update(
          { mark_default: 2 },
          { where: { user_id: userId } }
        );
      }

      // Prepare update data
      const allowedFields = [
        'name', 'phone', 'email', 'street1', 'street2', 'city', 'state',
        'country', 'zip', 'is_sender', 'latitude', 'longitude', 'adr_id', 'mark_default'
      ];
      const updateFields: any = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'street2' && updateData[field] === '') {
            updateFields[field] = null;
          } else if (field === 'latitude' || field === 'longitude') {
            updateFields[field] = updateData[field] ? parseFloat(updateData[field]) : null;
          } else if (typeof updateData[field] === 'string') {
            updateFields[field] = updateData[field].trim();
          } else {
            updateFields[field] = updateData[field];
          }
        }
      }

      // Check if there's anything to update
      if (Object.keys(updateFields).length === 0) {
        return {
          success: false,
          error: {
            message: 'No valid fields provided for update'
          }
        };
      }

      // Update the address
      await Address.update(updateFields, {
        where: {
          id: addressId,
          user_id: userId
        }
      });

      // Get the updated address
      const updatedAddress = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId
        },
        attributes: [
          'id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2',
          'city', 'state', 'country', 'zip', 'is_sender', 'is_deleted',
          'latitude', 'longitude', 'adr_id', 'mark_default', 'created_at', 'updated_at'
        ]
      });

      return {
        success: true,
        data: {
          message: 'Address updated successfully',
          address: updatedAddress
        }
      };

    } catch (error: any) {
      console.error('Error updating address:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to update address'
        }
      };
    }
  }

  // Delete address for authenticated user (soft delete)
  static async deleteAddress(userId: number, addressId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate addressId
      if (!addressId || isNaN(addressId) || addressId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid address ID is required'
          }
        };
      }

      // Check if address exists and belongs to user
      const existingAddress = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId,
          is_deleted: '0'
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          error: {
            message: 'Address not found or you do not have permission to delete it'
          }
        };
      }

      // Soft delete the address
      await Address.update(
        { is_deleted: '1' },
        { where: { id: addressId, user_id: userId } }
      );

      return {
        success: true,
        data: {
          message: 'Address deleted successfully'
        }
      };

    } catch (error: any) {
      console.error('Error deleting address:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to delete address'
        }
      };
    }
  }

  // Mark address as default for authenticated user
  static async markAddressAsDefault(userId: number, addressId: number) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Validate addressId
      if (!addressId || isNaN(addressId) || addressId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid address ID is required'
          }
        };
      }

      // Check if address exists and belongs to user
      const existingAddress = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId,
          is_deleted: '0'
        }
      });

      if (!existingAddress) {
        return {
          success: false,
          error: {
            message: 'Address not found or you do not have permission to modify it'
          }
        };
      }

      // Unset all other addresses as default
      await Address.update(
        { mark_default: 2 },
        { where: { user_id: userId } }
      );

      // Set this address as default
      await Address.update(
        { mark_default: 1 },
        { where: { id: addressId, user_id: userId } }
      );

      // Get the updated address
      const updatedAddress = await Address.findOne({
        where: {
          id: addressId,
          user_id: userId
        },
        attributes: [
          'id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2',
          'city', 'state', 'country', 'zip', 'is_sender', 'is_deleted',
          'latitude', 'longitude', 'adr_id', 'mark_default', 'created_at', 'updated_at'
        ]
      });

      return {
        success: true,
        data: {
          message: 'Address marked as default successfully',
          address: updatedAddress
        }
      };

    } catch (error: any) {
      console.error('Error marking address as default:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to mark address as default'
        }
      };
    }
  }

  // Get bought and sold products for authenticated user
  static async getBoughtAndSoldProducts(userId: number, filters: any = {}, page: number = 1, perPage: number = 5) {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Build where clause based on trade_type
      let whereClause: any = {
        id: { [Op.ne]: 0 }
      };

      let requestData = 'all';
      const filterData: any = {};

      // Handle trade_type filtering
      if (filters.trade_type === 'purchased') {
        whereClause.buyer = userId;
        whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
        requestData = 'purchased';
        filterData.trade_type = filters.trade_type;
      } else if (filters.trade_type === 'sold') {
        whereClause.seller = userId;
        whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
        whereClause[Op.or] = [
          { buyer: userId },
          { seller: userId }
        ];
        requestData = 'sold';
        filterData.trade_type = filters.trade_type;
      } else if (filters.trade_type === 'cancelled') {
        whereClause.buying_status = { [Op.in]: ['declined', 'cancelled'] };
        requestData = 'cancelled';
        filterData.trade_type = filters.trade_type;
      } else {
        // Default: all offers where user is buyer or seller, excluding cancelled
        whereClause[Op.or] = [
          { buyer: userId },
          { seller: userId }
        ];
        whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
        requestData = 'all';
      }

      // Handle specific ID filter
      if (filters.id && filters.id > 0) {
        whereClause.id = filters.id;
      } else {
        whereClause.buying_status = { [Op.ne]: '' };
      }

      // Handle trade_with filter (username search)
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        // This would require joins with user table - simplified for now
        filterData.trade_with = filters.trade_with;
      }

      // Handle code filter
      if (filters.code && filters.code.trim() !== '') {
        whereClause.code = { [Op.like]: `%${filters.code}%` };
        filterData.code = filters.code;
      }

      // Handle status_id filter
      if (filters.status_id && filters.status_id > 0) {
        whereClause.buy_offer_status_id = filters.status_id;
        filterData.status_id = filters.status_id;
      }

      // Handle date filters
      if (filters.from_date && filters.from_date.trim() !== '') {
        whereClause.created_at = { [Op.gte]: new Date(filters.from_date) };
        filterData.from_date = filters.from_date;
      }

      if (filters.to_date && filters.to_date.trim() !== '') {
        if (whereClause.created_at) {
          whereClause.created_at[Op.lte] = new Date(filters.to_date);
        } else {
          whereClause.created_at = { [Op.lte]: new Date(filters.to_date) };
        }
        filterData.to_date = filters.to_date;
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await BuySellCard.count({
        where: whereClause
      });

      // Get buy/sell cards with pagination
      const buySellCards = await BuySellCard.findAll({
        where: whereClause,
        order: [['id', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Check if amount_paid_on is null for specific ID (buyer only)
      let amountPaidOn = false;
      if (filters.id && filters.id > 0) {
        const specificCard = await BuySellCard.findOne({
          where: {
            id: filters.id,
            buyer: userId
          }
        });
        // Check if amount_paid_on is null
        amountPaidOn = specificCard ? !specificCard.amount_paid_on : false;
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          buySellCards,
          requestData,
          amountPaidOn,
          filterData,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting bought and sold products:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get bought and sold products'
        }
      };
    }
  }
}
