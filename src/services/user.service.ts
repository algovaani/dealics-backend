import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Follower } from "../models/follower.model.js";
import { InterestedIn } from "../models/interestedIn.model.js";
import { MembershipUser, IMembershipUser } from "../models/membership_user.model.js";
import { Membership } from "../models/membership.model.js";
import { CreditPurchaseLog } from "../models/creditPurchaseLog.model.js";
import { CreditDeductionLog } from "../models/creditDeductionLog.model.js";
import { UserSocialMedia } from "../models/userSocialMedia.model.js";
import { SocialMedia } from "../models/socialMedia.model.js";
import { Shipment } from "../models/shipment.model.js";
import { Address } from "../models/address.model.js";
import { CategoryShippingRate } from "../models/categoryShippingRates.model.js";
import { BuySellCard, BuyOfferStatus, TradeProposal, TradeProposalStatus, TradeTransaction, TradeNotification, ReviewCollection, Review, Support } from "../models/index.js";
import { setTradeProposalStatus } from '../services/tradeStatus.service.js';
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";
import { request } from "http";

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

  // Format date to MM.DD.YY H:MM AM/PM format (for created_at and estimated_delivery_date)
  private static formatDateToMMDDYY(dateString: string | Date): string {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "01.01.25 12:00 AM"; // Fallback
      }
      
      // Get month, day, year (2 digits)
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      
      // Get hours and minutes
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Convert to 12-hour format
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const hoursStr = String(hours);
      
      return `${month}.${day}.${year} ${hoursStr}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting date to MM.DD.YY:', error);
      return "01.01.25 12:00 AM"; // Fallback
    }
  }

  // Get user by ID
  static async getUserById(id: number) {
    return await User.findByPk(id);
  }

  // Get user's social media links (original format)
  static async getUserSocialMedia(userId: number) {
    try {
      
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


      // Transform to original array format
      const socialLinks: any[] = [];
      socialMediaData.forEach((item: any) => {
        if (item.SocialMedia && item.social_media_url) {
          const platformName = item.SocialMedia.social_media_name?.toLowerCase();
          if (platformName) {
            socialLinks.push({
              platform: platformName,
              url: item.social_media_url,
              name: item.SocialMedia.social_media_name
            });
          }
        }
      });

      return socialLinks;
    } catch (error: any) {
      console.error('❌ Error getting user social media:', error);
      return [];
    }
  }

  // Update user's social media links
  static async updateUserSocialMedia(userId: number, socialMediaData: any) {
    try {

      const results = [];

      // Process each social media platform from FormData
      
      for (const [platformKey, platformData] of Object.entries(socialMediaData)) {
        
        if (platformData && typeof platformData === 'object' && 'url' in platformData) {
          const url = platformData.url as string;
          
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
  static async getUserProfile(userId: number, loggedInUserId: number | null = null) {
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
          'ebay_store_url', 'created_at', 'updated_at','about_user', 'bio'
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

      // Check if logged-in user is following this user
      let following = false;
      if (loggedInUserId && loggedInUserId !== userId) {
        following = await this.isFollowing(loggedInUserId, userId);
      }

      // Get social media links from userSocialMedia table
      const socialLinks = await this.getUserSocialMedia(userId);

      return {
        user,
        cardStats,
        reviews,
        interestedCardsCount,
        tradeCount,
        followingCount,
        following,
        socialLinks
      };
    } catch (error) {
      return null;
    }
  }

  // Get card statistics
  private static async getCardStats(userId: number) {
    try {
      // 1. all_products: Match exact logic of GET /api/user/tradingcards
      // Use the same service and count to keep numbers aligned with that API
      const { TradingCardService } = await import('./tradingcard.service.js');
      const tradingCardService = new TradingCardService();
      const allProductsResult = await tradingCardService.getAllTradingCards(1, 1, undefined, userId);
      const allProducts = (allProductsResult as any)?.count || 0;

      // 2. ongoing_deals: Get count from /api/users/ongoing-trades
      const ongoingTradesResult = await this.getOngoingTrades(userId, {}, 1, 100);
      const ongoingDeals = ongoingTradesResult.success ? (ongoingTradesResult.pagination?.totalCount || 0) : 0;

      // 3. successful_trades: Get count from /api/users/completed-trades
      const completedTradesResult = await this.getCompletedTrades(userId, {}, 1, 100);
      const successfulTrades = completedTradesResult.success ? (completedTradesResult.pagination?.totalCount || 0) : 0;

      // 4. products_sold: Get count from /api/users/bought-and-sold-products?trade_type=sold
      const soldProductsResult = await this.getBoughtAndSoldProducts(userId, { trade_type: 'sold' }, 1, 100);
      const productsSold = soldProductsResult.success ? (soldProductsResult.pagination?.totalCount || 0) : 0;

      // 5. products_bought: Get count from /api/users/bought-and-sold-products?trade_type=purchased
      const boughtProductsResult = await this.getBoughtAndSoldProducts(userId, { trade_type: 'purchased' }, 1, 100);
      const productsBought = boughtProductsResult.success ? (boughtProductsResult.pagination?.totalCount || 0) : 0;

      return {
        'all_products': allProducts,
        'ongoing_deals': ongoingDeals,
        'successful_trades': successfulTrades,
        'products_sold': productsSold,
        'products_bought': productsBought
      };
    } catch (error) {
      console.error('Error getting card stats:', error);
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



  // Get reviews from review_collections table
  private static async getReviews(userId: number) {
    try {
      const query = `
        SELECT 
          rc.content as trader_review,
          rc.rating as user_rating,
          u.profile_picture as user_image,
          u.username as userName,
          DATE(rc.created_at) as date,
          TIME(rc.created_at) as time
        FROM review_collections rc
        LEFT JOIN users u ON rc.sender_id = u.id
        WHERE rc.user_id = :userId 
        AND rc.content IS NOT NULL 
        AND rc.content != ''
        AND rc.rating IS NOT NULL
        
        ORDER BY rc.id ASC
        LIMIT 5
      `;

      const result = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('Error fetching reviews:', error);
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

  // Check if one user is following another user
  private static async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM followers 
        WHERE trader_id = :followingId AND user_id = :followerId AND follower_status = '1'
      `;


      const result = await sequelize.query(query, {
        replacements: { followerId, followingId },
        type: QueryTypes.SELECT
      });

      const count = (result[0] as any)?.count || 0;
      const isFollowing = count > 0;
      

      return isFollowing;
    } catch (error) {
      console.error('Error checking following status:', error);
      return false;
    }
  }

  // Get trade ratings (Laravel reference: sender_review_count_get)
  private static async getTradeRatings(tradeProposalId: number | null): Promise<any[]> {
    try {
      if (!tradeProposalId) {
        return [];
      }

      // Laravel reference: Reviews::where('trade_proposal_id', $id)->first()
      const review = await Review.findOne({
        where: {
          trade_proposal_id: tradeProposalId
        }
      });

      if (!review) {
        return [];
      }

      const reviewData = review.toJSON();

      // Build ratings array with sender and receiver ratings
      const ratings = [];

      // Add sender rating if available
      if (reviewData.trader_id && reviewData.trader_rating) {
        // Get username for trader_id
        const traderUser = await User.findByPk(reviewData.trader_id, {
          attributes: ['username']
        });
        
        ratings.push({
          user_id: reviewData.trader_id,
          username: traderUser?.username || null,
          rating: reviewData.trader_rating,
          review: reviewData.trader_review,
          type: 'sender'
        });
      }

      // Add receiver rating if available
      if (reviewData.user_id && reviewData.user_rating) {
        // Get username for user_id
        const receiverUser = await User.findByPk(reviewData.user_id, {
          attributes: ['username']
        });
        
        ratings.push({
          user_id: reviewData.user_id,
          username: receiverUser?.username || null,
          rating: reviewData.user_rating,
          review: reviewData.user_review,
          type: 'receiver'
        });
      }

      return ratings;
    } catch (error) {
      console.error('Error getting trade ratings:', error);
      return [];
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

      // Remove username from update data (non-editable field)
      const { username, ...allowedFields } = profileData;
      
      // Log what fields are being updated

      // Validate required fields
      const validationErrors: string[] = [];

      // Validate first_name
      if (allowedFields.first_name !== undefined) {
        if (typeof allowedFields.first_name !== 'string') {
          validationErrors.push('First name must be a string');
        } else if (allowedFields.first_name.trim().length === 0) {
          validationErrors.push('First name cannot be empty');
        }
      }

      // Validate last_name
      if (allowedFields.last_name !== undefined) {
        if (typeof allowedFields.last_name !== 'string') {
          validationErrors.push('Last name must be a string');
        } else if (allowedFields.last_name.trim().length === 0) {
          validationErrors.push('Last name cannot be empty');
        }
      }

      // Validate email
      if (allowedFields.email !== undefined) {
        if (typeof allowedFields.email !== 'string') {
          validationErrors.push('Email must be a string');
        } else if (allowedFields.email.trim().length === 0) {
          validationErrors.push('Email cannot be empty');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedFields.email.trim())) {
          validationErrors.push('Email format is invalid');
        } else {
          // Check if email is being changed
          const trimmedEmail = allowedFields.email.trim();
          if (user.email !== trimmedEmail) {
            console.log("successs===Email");
            // Email is being changed, set verification status to unverified
            allowedFields.is_email_verified = "0";
            allowedFields.email_verified_at = null;
            // console.log('Email changed, setting is_email_verified to 0 for user:', userId);
          }
          
          // Check if email already exists for another user
          const existingUser = await User.findOne({
            where: {
              email: trimmedEmail,
              id: { [Op.ne]: userId } // Exclude current user
            }
          });
          
          if (existingUser) {
            validationErrors.push('Email is already in use by another account');
          }else{
            
          }
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
        'first_name', 'last_name', 'email', 'is_email_verified', 'email_verified_at', 'profile_picture', 'phone_number', 
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


      // Check if email is being updated before the update
      const emailUpdated = allowedFields.email !== undefined && user.email !== allowedFields.email.trim();
      
      // Update the user
      try {
        await user.update(filteredData);
      } catch (updateError: any) {
        console.error('❌ Database update error:', updateError);
        console.error('❌ Update data that caused error:', filteredData);
        throw updateError;
      }

      // Send emails after successful update
      try {
        const { EmailHelperService } = await import('./emailHelper.service.js');
        
        // // Always send profile updated email (to current email - could be old or new)
        // await EmailHelperService.sendProfileUpdatedEmail(
        //   user.email || '',
        //   user.first_name || '',
        //   user.last_name || ''
        // );
        // console.log('✅ Profile updated email sent successfully');

        // If email was updated, also send email verification to NEW email address
        if (emailUpdated) {
          await EmailHelperService.sendEmailUpdatedVerificationEmail(
            allowedFields.verifyLink,
            allowedFields.email.trim(), // NEW email address
            user.first_name || '',
            user.last_name || '',
            user.id
          );
          console.log('✅ Email verification email sent to NEW email address:', allowedFields.email.trim());
        }
      } catch (emailError: any) {
        console.error('❌ Email sending failed:', emailError);
        // Don't fail the request if email sending fails
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

      // Determine if address exists for the user
      const { Address } = await import('../models/index.js');
      const addressCount = await Address.count({ where: { user_id: userId, is_deleted: '0' } });
      const address_exist = addressCount > 0 ? 1 : 0;

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
      
      // Get active membership with membership details
      const now = new Date().toISOString();
      const activeMembership = await MembershipUser.findOne({
        where: sequelize.and(
          { user_id: userId },
          { status: '1' },
          sequelize.or(
            { expired_date: null },
            sequelize.where(sequelize.col('expired_date'), '>', now)
          )
        ),
        include: [{
          model: Membership,
          as: 'membership',
          required: false
        }],
        order: [['created_at', 'DESC']]
      });

      // Create formatted user object with joined_date, address_exist and membership
      const membershipData = activeMembership ? {
        type: (activeMembership as IMembershipUser).type,
        expired_date: (activeMembership as IMembershipUser).expired_date,
        status: (activeMembership as IMembershipUser).status,
        membership_id: (activeMembership as IMembershipUser).membership_id,
        membership_details: (activeMembership as IMembershipUser).membership
      } : {
        type: 'Free',
        expired_date: null,
        status: '1',
        membership_id: null,
        membership_details: null
      };
      
      const formattedUser = {
        ...userData,
        joined_date: joinedDate,
        address_exist,
        membership: membershipData
      };
      

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

  // Get top traders based on ratings and trading cards with pagination
  static async getTopTraders(page: number = 1, perPage: number = 10) {
    try {
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
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
      `;

      const countResult = await sequelize.query(countQuery, {
        type: QueryTypes.SELECT
      });
      const totalCount = (countResult[0] as any).total;

      // Get traders with pagination
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
        LIMIT :limit OFFSET :offset
      `;

      const result = await sequelize.query(query, {
        replacements: { limit, offset },
        type: QueryTypes.SELECT
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          traders: result,
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
    } catch (error) {
      console.error('Error getting top traders:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message || 'Failed to get top traders'
        }
      };
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
            attributes: ['id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2', 'city', 'state', 'country', 'zip']
          },
          {
            model: Address,
            as: 'fromAddress',
            attributes: ['id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2', 'city', 'state', 'country', 'zip']
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
          id: shipmentData.id,
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
          shipments: transformedShipments
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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
      let categories = await Category.findAll({
        where: {
          grades_ungraded_status: true
        },
        attributes: ['id', 'sport_name']
      });

      // Exclude "Sports Memorabilia" from categories list for plural users route response
      categories = categories.filter((c: any) => String(c.sport_name).trim() !== 'Sports Memorabilia');

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
          specificShippingRate
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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
        data: addresses,
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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

      // Always unset other defaults for this user before creating a new one
      const { Address } = await import('../models/index.js');
      await Address.update(
        { mark_default: 2 },
        { where: { user_id: userId } }
      );

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
        is_sender: '1',
        latitude: addressData.latitude ? parseFloat(addressData.latitude) : null,
        longitude: addressData.longitude ? parseFloat(addressData.longitude) : null,
        adr_id: addressData.adr_id ? addressData.adr_id.trim() : null,
        mark_default: 1 // New address is default
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

      // Handle trade_type filtering (following Laravel logic)
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

      // Handle buy_sell_id filter
      if (filters.buy_sell_id && filters.buy_sell_id > 0) {
        whereClause.id = filters.buy_sell_id;
        filterData.buy_sell_id = filters.buy_sell_id;
      }

      // Handle trade_with filter (username search)
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        filterData.trade_with = filters.trade_with;
        // This will be handled in the include section with User associations
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
        try {
          const fromDate = new Date(filters.from_date);
          if (!isNaN(fromDate.getTime())) {
            // Normalize to start of day
            fromDate.setHours(0, 0, 0, 0);
            whereClause.created_at = { [Op.gte]: fromDate };
            filterData.from_date = filters.from_date;
          }
        } catch (error) {
          console.error('Invalid from_date format:', filters.from_date);
        }
      }

      if (filters.to_date && filters.to_date.trim() !== '') {
        try {
          const toDate = new Date(filters.to_date);
          if (!isNaN(toDate.getTime())) {
            // Normalize to end of day
            toDate.setHours(23, 59, 59, 999);
            if (whereClause.created_at) {
              whereClause.created_at[Op.lte] = toDate;
            } else {
              whereClause.created_at = { [Op.lte]: toDate };
            }
            filterData.to_date = filters.to_date;
          }
        } catch (error) {
          console.error('Invalid to_date format:', filters.to_date);
        }
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await BuySellCard.count({
        where: whereClause
      });

      // Prepare includes with conditional where clauses for trade_with filter
      const includes: any[] = [
        {
          model: User,
          as: 'sellerUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'buyerUser',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        // Removed Shipment include - using separate query instead
        {
          model: TradingCard,
          as: 'tradingCard',
          attributes: ['id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 'search_param', 'category_id', 'title'],
          required: false
        },
        {
          model: BuyOfferStatus,
          as: 'buyOfferStatus',
          attributes: ['id', 'to_sender', 'to_receiver'],
          required: false
        },
        {
          model: Shipment,
          as: 'shipmentDetails',
          attributes: ['id', 'estimated_delivery_date', 'cron_shipment_date', 'tracking_id', 'shipment_status', 'created_at'],
          required: false
        }
      ];

      // Add trade_with filter to user associations if needed
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        const tradeWithPattern = `%${filters.trade_with}%`;
        
        // Update seller and buyer includes to include username search
        includes[0].where = { username: { [Op.like]: tradeWithPattern } };
        includes[1].where = { username: { [Op.like]: tradeWithPattern } };
        
        // Add OR condition to main where clause for trade_with
        whereClause[Op.or] = [
          ...(whereClause[Op.or] || []),
          { '$sellerUser.username$': { [Op.like]: tradeWithPattern } },
          { '$buyerUser.username$': { [Op.like]: tradeWithPattern } }
        ];
      }

      // Get buy/sell cards with all required associations
      const buySellCards = await BuySellCard.findAll({
        where: whereClause,
        include: includes,
        attributes: [
          'id', 'code', 'seller', 'buyer', 'main_card', 'trading_card_asking_price', 
          'offer_amt_buyer', 'paid_amount', 'amount_paid_on', 'amount_pay_id', 
          'amount_payer_id', 'amount_pay_status', 'buying_status', 'track_id', 
          'shipped_on', 'buyer_rating', 'buyer_review', 'reviewed_on', 'seller_rating', 
          'seller_review', 'reviewed_by_seller_on', 'is_received', 'received_on', 
          'is_payment_received', 'payment_received_on', 'invalid_offer_count', 
          'is_payment_init', 'payment_init_date', 'buy_offer_status_id', 
          'products_offer_amount', 'shipment_amount', 'total_amount', 'created_at', 'updated_at'
        ],
        order: [['id', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Transform the data according to requirements
      const transformedBuySellCards = await Promise.all(buySellCards.map(async (card: any) => {
        const cardData = card.toJSON();
        
        // Determine seller_name or buyer_name based on user role
        let seller_name = null;
        let buyer_name = null;
        
        if (cardData.sellerUser) {
          seller_name = cardData.sellerUser.username || 
            `${cardData.sellerUser.first_name || ''} ${cardData.sellerUser.last_name || ''}`.trim();
        }
        
        if (cardData.buyerUser) {
          buyer_name = cardData.buyerUser.username || 
            `${cardData.buyerUser.first_name || ''} ${cardData.buyerUser.last_name || ''}`.trim();
        }

        // Get shipment details separately to avoid duplicates
        const shipments = await Shipment.findAll({
          where: { buy_sell_id: cardData.id },
          attributes: ['id', 'user_id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'cron_shipment_date', 'created_at'],
          order: [['created_at', 'DESC']]
        });

        // Format shipment details according to Laravel structure
        const shipmentDetail = shipments.map((shipment: any) => ({
          id: shipment.id,
          estimated_delivery_date: shipment.estimated_delivery_date 
            ? UserService.formatDateToMMDDYY(shipment.estimated_delivery_date) 
            : shipment.cron_shipment_date 
              ? UserService.formatDateToMMDDYY(shipment.cron_shipment_date)
              : shipment.created_at 
                ? UserService.formatDateToMMDDYY(shipment.created_at)
                : null,
          tracking_number: shipment.tracking_id,
          status: shipment.shipment_status,
          user_id: shipment.user_id
        }));

        // Get category name if trading card exists
        let category_name = null;
        if (cardData.tradingCard && cardData.tradingCard.category_id) {
          try {
            const category = await Category.findByPk(cardData.tradingCard.category_id);
            category_name = category ? category.sport_name : null;
          } catch (error) {
            console.error('Error fetching category:', error);
            category_name = null;
          }
        }

        return {
          id: cardData.id,
          code: cardData.code,
          seller: cardData.seller,
          buyer: cardData.buyer,
          seller_name: seller_name,
          buyer_name: buyer_name,
          trading_card_asking_price: cardData.trading_card_asking_price,
          offer_amt_buyer: cardData.offer_amt_buyer,
          paid_amount: cardData.paid_amount,
          amount_paid_on: cardData.amount_paid_on ? UserService.formatDateToMMDDYY(cardData.amount_paid_on) : null,
          buying_status: cardData.buying_status,
          track_id: cardData.track_id,
          shipped_on: cardData.shipped_on,
          is_received: cardData.is_received,
          received_on: cardData.received_on,
          is_payment_received: cardData.is_payment_received,
          payment_received_on: cardData.payment_received_on,
          created_at: UserService.formatDateToMMDDYY(cardData.created_at),
          updated_at: cardData.updated_at,
          buy_offer_status_id: cardData.buy_offer_status_id,
          buy_offer_status: cardData.buyOfferStatus ? {
            id: cardData.buyOfferStatus.id,
            to_sender: cardData.buyOfferStatus.to_sender,
            to_receiver: cardData.buyOfferStatus.to_receiver
          } : null,
          shipmentDetail: shipmentDetail,
          tradingCard: cardData.tradingCard ? {
            id: cardData.tradingCard.id,
            trading_card_img: cardData.tradingCard.trading_card_img,
            trading_card_slug: cardData.tradingCard.trading_card_slug,
            trading_card_asking_price: cardData.tradingCard.trading_card_asking_price,
            search_param: cardData.tradingCard.search_param,
            title: cardData.tradingCard.title || null,
            category_name: category_name
          } : null,
          payment_detail: {
            products_offer_amount: cardData.products_offer_amount || 0,
            shipment_amount: cardData.shipment_amount || 0,
            total_amount: cardData.total_amount || 0,
            paid_amount: cardData.paid_amount || 0,
            amount_paid_on: cardData.amount_paid_on ? UserService.formatDateToMMDDYY(cardData.amount_paid_on) : null
          },
          // Ratings array in requested format (omit entries with 0 or missing rating)
          ratings: (() => {
            const ratingsArr: any[] = [];
            const sellerRatingVal = (cardData.seller_rating !== null && cardData.seller_rating !== undefined) ? Number(cardData.seller_rating) : 0;
            const buyerRatingVal = (cardData.buyer_rating !== null && cardData.buyer_rating !== undefined) ? Number(cardData.buyer_rating) : 0;

            if (sellerRatingVal > 0) {
              ratingsArr.push({
                user_id: cardData.seller || null,
                username: seller_name,
                rating: sellerRatingVal,
                review: cardData.seller_review || '',
                type: 'sender'
              });
            }

            if (buyerRatingVal > 0) {
              ratingsArr.push({
                user_id: cardData.buyer || null,
                username: buyer_name,
                rating: buyerRatingVal,
                review: cardData.buyer_review || '',
                type: 'receiver'
              });
            }

            return ratingsArr;
          })()
        };
      }));

      // Check if amount_paid_on is null for specific ID (buyer only)
      let amountPaidOn = false;
      if (filters.id && filters.id > 0) {
        const specificCard = await BuySellCard.findOne({
          where: {
            id: filters.id,
            buyer: userId
          }
        });
        amountPaidOn = specificCard ? !specificCard.amount_paid_on : false;
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          buySellCards: transformedBuySellCards,
          requestData,
          amountPaidOn,
          filterData
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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

  // Get ongoing trades for authenticated user
  static async getOngoingTrades(userId: number, filters: any = {}, page: number = 1, perPage: number = 5) {
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

      // Build where clause - exclude cancelled, declined, counter_declined, complete
      let whereClause: any = {
        trade_status: { [Op.notIn]: ['cancel', 'declined', 'counter_declined', 'complete'] },
        [Op.or]: [
          { trade_sent_by: userId },
          { trade_sent_to: userId }
        ]
      };

      const filterData: any = {};

      // Handle filter parameter (partially_completed vs ongoing) - Laravel logic
      if (filters.filter === 'partially_completed') {
        // Show trades where exactly one party has confirmed (either receiver OR sender, but not both)
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { trade_sent_by: userId },
              { trade_sent_to: userId }
            ]
          },
          {
            [Op.or]: [
              {
                [Op.and]: [
                  { receiver_confirmation: 1 },
                  { trade_sender_confrimation: { [Op.ne]: 1 } }
                ]
              },
              {
                [Op.and]: [
                  { receiver_confirmation: { [Op.ne]: 1 } },
                  { trade_sender_confrimation: 1 }
                ]
              }
            ]
          }
        ];
        delete whereClause[Op.or]; // Remove the base OR condition
        filterData.filter = 'partially_completed';
      } else {
        // Default: show ongoing trades where neither party has confirmed
        // Exclude trades where either receiver_confirmation OR trade_sender_confrimation is 1
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { trade_sent_by: userId },
              { trade_sent_to: userId }
            ]
          },
          {
            [Op.and]: [
              { receiver_confirmation: { [Op.ne]: 1 } },
              { trade_sender_confrimation: { [Op.ne]: 1 } }
            ]
          }
        ];
        delete whereClause[Op.or]; // Remove the base OR condition
      }

      // Handle specific ID filter
      if (filters.id && filters.id > 0) {
        whereClause.id = filters.id;
      }

      // Handle trade_id filter
      if (filters.trade_id && filters.trade_id > 0) {
        whereClause.id = filters.trade_id;
      }

      // Handle trade_id filter - when provided, only return that specific trade proposal
      if (filters.trade_id && filters.trade_id > 0) {
        whereClause.id = filters.trade_id;
        filterData.trade_id = filters.trade_id;
      }

      // Handle trade_with filter (username search) - Laravel logic
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        filterData.trade_with = filters.trade_with;
        // This will be handled in the includes section below
      }

      // Handle code filter
      if (filters.code && filters.code.trim() !== '') {
        whereClause.code = { [Op.like]: `%${filters.code}%` };
        filterData.code = filters.code;
      }

      // Handle trade_type filter
      if (filters.trade_type === 'sent') {
        whereClause.trade_sent_by = userId;
        filterData.trade_type = 'sent';
      } else if (filters.trade_type === 'received') {
        whereClause.trade_sent_to = userId;
        filterData.trade_type = 'received';
      }

      // Handle status_id filter
      if (filters.status_id && filters.status_id > 0) {
        whereClause.trade_proposal_status_id = filters.status_id;
        filterData.status_id = filters.status_id;
      }

      // Handle date filters
      if (filters.from_date && filters.from_date.trim() !== '') {
        try {
          const fromDate = new Date(filters.from_date);
          if (!isNaN(fromDate.getTime())) {
            // Normalize to start of day
            fromDate.setHours(0, 0, 0, 0);
            whereClause.created_at = { [Op.gte]: fromDate };
            filterData.from_date = filters.from_date;
          }
        } catch (error) {
          console.error('Invalid from_date format:', filters.from_date);
        }
      }

      if (filters.to_date && filters.to_date.trim() !== '') {
        try {
          const toDate = new Date(filters.to_date);
          if (!isNaN(toDate.getTime())) {
            // Normalize to end of day
            toDate.setHours(23, 59, 59, 999);
            if (whereClause.created_at) {
              whereClause.created_at[Op.lte] = toDate;
            } else {
              whereClause.created_at = { [Op.lte]: toDate };
            }
            filterData.to_date = filters.to_date;
          }
        } catch (error) {
          console.error('Invalid to_date format:', filters.to_date);
        }
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await TradeProposal.count({
        where: whereClause
      });

      // Prepare includes - Laravel logic
      const includes: any[] = [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: TradingCard,
          as: 'mainTradingCard',
          attributes: ['id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 'title', 'search_param'],
          required: false
        },
        {
          model: TradeProposalStatus,
          as: 'tradeProposalStatus',
          attributes: ['id', 'alias', 'name', 'to_sender', 'to_receiver'],
          required: false
        },
        {
          model: Shipment,
          as: 'shipmenttrader',
          attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id', 'paymentId', 'selected_rate'],
          required: false
        },
        {
          model: Shipment,
          as: 'shipmentself',
          attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id', 'paymentId', 'selected_rate'],
          required: false
        }
      ];

      // Handle trade_with filter - Laravel logic (search in receiver username)
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        const tradeWithPattern = `%${filters.trade_with}%`;
        
        // Add whereHas condition for tradeReceiver username search
        includes[1].where = { username: { [Op.like]: tradeWithPattern } };
        includes[1].required = true;
      }

      // Get ongoing trades with all required associations
      const ongoingTrades = await TradeProposal.findAll({
        where: whereClause,
        include: includes,
        order: [['id', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Transform the data according to requirements
      const transformedOngoingTrades = await Promise.all(ongoingTrades.map(async (trade: any) => {
        const tradeData = trade.toJSON();
        
        // Determine sender_name and receiver_name
        let sender_name = null;
        let receiver_name = null;
        
        if (tradeData.tradeSender) {
          sender_name = tradeData.tradeSender.username || 
            `${tradeData.tradeSender.first_name || ''} ${tradeData.tradeSender.last_name || ''}`.trim();
        }
        
        if (tradeData.tradeReceiver) {
          receiver_name = tradeData.tradeReceiver.username || 
            `${tradeData.tradeReceiver.first_name || ''} ${tradeData.tradeReceiver.last_name || ''}`.trim();
        }

        // Get trading card details for send_cards and receive_cards
        const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards);
        const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards);

        // Apply Laravel logic: __getSendingAndReceivingCardNames
        let finalSendCards = sendCardsDetails;
        let finalReceiveCards = receiveCardsDetails;

        if (tradeData.trade_sent_by === userId) {
          // User is the sender: Sending = send_cards, Receiving = receive_cards
          finalSendCards = sendCardsDetails;
          finalReceiveCards = receiveCardsDetails;
        } else if (tradeData.trade_sent_to === userId) {
          // User is the receiver: Sending = receive_cards, Receiving = send_cards
          finalSendCards = receiveCardsDetails;
          finalReceiveCards = sendCardsDetails;
        }

        // Debug: Log shipment data to help identify the issue

        return {
          id: tradeData.id,
          code: tradeData.code,
          trade_sent_by: tradeData.trade_sent_by,
          trade_sent_to: tradeData.trade_sent_to,
          sender_name: sender_name,
          receiver_name: receiver_name,
          main_card: tradeData.main_card,
          send_cards: finalSendCards,
          receive_cards: finalReceiveCards,
          add_cash: tradeData.add_cash,
          ask_cash: tradeData.ask_cash,
          trade_amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
          trade_amount_pay_id: tradeData.trade_amount_pay_id,
          trade_amount_payer_id: tradeData.trade_amount_payer_id,
          trade_amount_amount: tradeData.trade_amount_amount,
          trade_amount_pay_status: tradeData.trade_amount_pay_status,
          message: tradeData.message,
          counter_personalized_message: tradeData.counter_personalized_message,
          counter_offer: tradeData.counter_offer,
          is_new: tradeData.is_new,
          is_edited: tradeData.is_edited,
          trade_status: tradeData.trade_status,
          accepted_on: tradeData.accepted_on ? UserService.formatDateToMMDDYY(tradeData.accepted_on) : null,
          is_payment_received: tradeData.is_payment_received,
          payment_received_on: tradeData.payment_received_on ? UserService.formatDateToMMDDYY(tradeData.payment_received_on) : null,
          shipped_by_trade_sent_by: tradeData.shipped_by_trade_sent_by,
          shipped_on_by_trade_sent_by: tradeData.shipped_on_by_trade_sent_by ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_by) : null,
          shipped_by_trade_sent_to: tradeData.shipped_by_trade_sent_to,
          shipped_on_by_trade_sent_to: tradeData.shipped_on_by_trade_sent_to ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_to) : null,
          is_payment_init: tradeData.is_payment_init,
          payment_init_date: tradeData.payment_init_date ? UserService.formatDateToMMDDYY(tradeData.payment_init_date) : null,
          trade_proposal_status_id: tradeData.trade_proposal_status_id,
          receiver_confirmation: tradeData.receiver_confirmation,
          trade_sender_confrimation: tradeData.trade_sender_confrimation,
          created_at: UserService.formatDateToMMDDYY(tradeData.created_at),
          updated_at: tradeData.updated_at,
          mainTradingCard: tradeData.mainTradingCard ? {
            id: tradeData.mainTradingCard.id,
            trading_card_img: tradeData.mainTradingCard.trading_card_img,
            trading_card_slug: tradeData.mainTradingCard.trading_card_slug,
            trading_card_asking_price: tradeData.mainTradingCard.trading_card_asking_price,
            title: tradeData.mainTradingCard.title || null,
            search_param: tradeData.mainTradingCard.search_param || null
          } : null,
          tradeProposalStatus: tradeData.tradeProposalStatus ? {
            id: tradeData.tradeProposalStatus.id,
            alias: tradeData.tradeProposalStatus.alias,
            name: tradeData.tradeProposalStatus.name,
            to_sender: tradeData.tradeProposalStatus.to_sender,
            to_receiver: tradeData.tradeProposalStatus.to_receiver,
            // Add user-specific message based on role
            user_message: tradeData.trade_sent_by === userId 
              ? tradeData.tradeProposalStatus.to_sender 
              : tradeData.tradeProposalStatus.to_receiver,
            user_role: tradeData.trade_sent_by === userId ? 'sender' : 'receiver'
          } : null,
          // Shipment data - Laravel structure
          // Filter shipments by user_id to distinguish between trader and self shipments
          shipmenttrader: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 ? 
            tradeData.shipmenttrader.filter((shipment: any) => shipment.user_id !== userId).map((shipment: any) => ({
              id: shipment.id,
              tracking_id: shipment.tracking_id,
              shipment_status: shipment.shipment_status,
              estimated_delivery_date: shipment.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipment.estimated_delivery_date) : null,
              paymentId: shipment.paymentId || null,
              selected_rate: shipment.selected_rate || null
            }))[0] || null : null,
          shipmentself: tradeData.shipmentself && tradeData.shipmentself.length > 0 ? 
            tradeData.shipmentself.filter((shipment: any) => shipment.user_id === userId).map((shipment: any) => ({
              id: shipment.id,
              tracking_id: shipment.tracking_id || null,
              shipment_status: shipment.shipment_status,
              estimated_delivery_date: shipment.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipment.estimated_delivery_date) : (shipment.cron_shipment_date ? UserService.formatDateToMMDDYY(shipment.cron_shipment_date) : null),
              paymentId: shipment.paymentId || null,
              selected_rate: shipment.selected_rate || null
            }))[0] || null : null,
          // Direct tracking IDs for easier access (from filtered shipments)
          tracking_id_self: tradeData.shipmentself && tradeData.shipmentself.length > 0 ? 
            tradeData.shipmentself.filter((shipment: any) => shipment.user_id === userId)[0]?.tracking_id || null : null,
          // Combined tracking ID (prefer trader, fallback to self)
          tracking_id: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 ? 
            (tradeData.shipmenttrader.filter((shipment: any) => shipment.user_id !== userId)[0]?.tracking_id || 
             tradeData.shipmentself.filter((shipment: any) => shipment.user_id === userId)[0]?.tracking_id || null) : null,
          // Shipment status indicators
          has_shipment_trader: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 && 
                               tradeData.shipmenttrader.some((shipment: any) => shipment.user_id !== userId),
          has_shipment_self: tradeData.shipmentself && tradeData.shipmentself.length > 0 && 
                             tradeData.shipmentself.some((shipment: any) => shipment.user_id === userId),
          has_any_shipment: (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 && 
                             tradeData.shipmenttrader.some((shipment: any) => shipment.user_id !== userId)) || 
                            (tradeData.shipmentself && tradeData.shipmentself.length > 0 && 
                             tradeData.shipmentself.some((shipment: any) => shipment.user_id === userId)),
          // Shipment status message
          shipment_status_message: (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0) || (tradeData.shipmentself && tradeData.shipmentself.length > 0) 
            ? "Shipment information available" 
            : (tradeData.trade_sender_track_id || tradeData.trade_receiver_track_id || tradeData.admin_sender_track_id || tradeData.admin_receiver_track_id)
            ? "Tracking information available from trade proposal"
            : "Shipment pending - tracking information will be available once shipment is initiated",
          // Payment details for ongoing trades
          payment_detail: {
            products_offer_amount: tradeData.add_cash || 0,
            shipment_amount: tradeData.proxy_fee_amt || 0,
            total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
            paid_amount: tradeData.trade_amount_amount ? parseFloat(tradeData.trade_amount_amount) : 0,
            amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
          }
        };
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          ongoing_trades: transformedOngoingTrades,
          buy_sel_cards: [], // Empty array as per Laravel
          filterData,
          trade_id: filters.id || 0
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      };

    } catch (error: any) {
      console.error('Error getting ongoing trades:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get ongoing trades'
        }
      };
    }
  }

  // Get trade button actions based on Laravel logic
  static getTradeButtonActions(tradeData: any, userId: number) {
    const actions: any = {
      showViewButton: false,
      showChatButton: true,
      showSentBadge: false,
      showReceivedBadge: false,
      showCancelButton: false,
      showDeclineButton: false,
      showAcceptButton: false,
      showCounterButton: false,
      showCompleteButton: false,
      showPaymentButton: false,
      buttonText: '',
      buttonClass: '',
      buttonAction: '',
      canCancel: false,
      canDecline: false,
      canAccept: false,
      canCounter: false,
      canComplete: false,
      canPay: false
    };

    const isSender = tradeData.trade_sent_by === userId;
    const isReceiver = tradeData.trade_sent_to === userId;
    const tradeStatus = tradeData.trade_status;
    const isPaymentReceived = tradeData.is_payment_received;
    const tradeAmountPaidOn = tradeData.trade_amount_paid_on;
    const askCash = tradeData.ask_cash || 0;
    const addCash = tradeData.add_cash || 0;
    const receiverConfirmation = tradeData.receiver_confirmation;
    const senderConfirmation = tradeData.trade_sender_confrimation;

    // Determine if user can cancel trade
    const hasTrackingId = (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 && tradeData.shipmenttrader[0].tracking_id) ||
                         (tradeData.shipmentself && tradeData.shipmentself.length > 0 && tradeData.shipmentself[0].tracking_id);
    const hasPayment = tradeAmountPaidOn && (askCash > 0 || addCash > 0);
    const canCancelTrade = !hasTrackingId && !hasPayment && tradeData.is_payment_init === 0;

    // Set badges
    if (isSender) {
      actions.showSentBadge = true;
    } else if (isReceiver) {
      actions.showReceivedBadge = true;
    }

    // Button logic based on trade status and user role
    if (tradeStatus === 'new') {
      actions.showViewButton = true;
      actions.buttonText = 'VIEW';
      actions.buttonClass = 'counter-btn';
      actions.buttonAction = 'viewtrade';
      
      if (isReceiver) {
        if (askCash > 0) {
          actions.showAcceptButton = true;
          actions.showPaymentButton = true;
          actions.buttonText = 'Accept & Pay';
          actions.buttonClass = 'light-grey-bg-black-text-btn';
          actions.buttonAction = 'chngtrade_status_confirm_pay';
          actions.canPay = true;
        } else {
          actions.showAcceptButton = true;
          actions.buttonText = 'Accept Trade';
          actions.buttonClass = 'light-grey-bg-black-text-btn';
          actions.buttonAction = 'chngtrade_status';
          actions.canAccept = true;
        }
        
        actions.showDeclineButton = true;
        actions.canDecline = true;
        actions.showCounterButton = true;
        actions.canCounter = true;
      }
    } else if (tradeStatus === 'counter_offer') {
      actions.showViewButton = true;
      actions.buttonText = 'VIEW COUNTER';
      actions.buttonClass = 'counter-btn';
      actions.buttonAction = 'viewcounter';
      
      if (isSender) {
        if (addCash > 0) {
          actions.showAcceptButton = true;
          actions.showPaymentButton = true;
          actions.buttonText = 'Accept Counter Offer';
          actions.buttonClass = 'light-grey-bg-black-text-btn';
          actions.buttonAction = 'chngtrade_status_confirm_pay_co';
          actions.canPay = true;
        } else {
          actions.showAcceptButton = true;
          actions.buttonText = 'Accept Counter Offer';
          actions.buttonClass = 'light-grey-bg-black-text-btn';
          actions.buttonAction = 'chngtrade_status';
          actions.canAccept = true;
        }
        
        actions.showDeclineButton = true;
        actions.canDecline = true;
      } else if (isReceiver) {
        actions.showCancelButton = true;
        actions.canCancel = true;
      }
    } else if (tradeStatus === 'accepted' || tradeStatus === 'counter_accepted') {
      actions.showViewButton = true;
      actions.buttonText = 'VIEW';
      actions.buttonClass = 'counter-btn';
      actions.buttonAction = 'viewtrade';
      
      // Check if payment is required
      if ((tradeStatus === 'accepted' && askCash > 0 && !tradeAmountPaidOn) ||
          (tradeStatus === 'counter_accepted' && addCash > 0 && !tradeAmountPaidOn)) {
        actions.showPaymentButton = true;
        actions.buttonText = 'Pay to Continue Trade';
        actions.buttonClass = 'light-grey-bg-black-text-btn';
        actions.buttonAction = 'chngtrade_status_confirm_pay_ow';
        actions.canPay = true;
      } else {
        // Check if shipment is needed
        const hasShipment = (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0) ||
                           (tradeData.shipmentself && tradeData.shipmentself.length > 0);
        
        if (!hasShipment) {
          actions.showShipButton = true;
          actions.buttonText = 'Ship Product(s)';
          actions.buttonClass = 'light-grey-bg-black-text-btn';
          actions.buttonAction = 'ship_products';
          actions.canShip = true;
        }
      }
    } else if (tradeStatus === 'complete') {
      if (senderConfirmation === '1' && receiverConfirmation === '1') {
        actions.showViewButton = true;
        actions.buttonText = 'COMPLETED';
        actions.buttonClass = 'btn-primary';
        actions.buttonAction = 'viewtrade';
      } else {
        // Check if both shipments have tracking IDs
        const hasBothTrackingIds = (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 && tradeData.shipmenttrader[0].tracking_id) &&
                                  (tradeData.shipmentself && tradeData.shipmentself.length > 0 && tradeData.shipmentself[0].tracking_id);
        
        if (hasBothTrackingIds) {
          const markedAsCompleted = isSender ? senderConfirmation === '1' : receiverConfirmation === '1';
          
          if (!markedAsCompleted) {
            actions.showCompleteButton = true;
            actions.buttonText = 'Complete Trade';
            actions.buttonClass = 'new-green-btn-1';
            actions.buttonAction = 'complete_trade_proposal_check';
            actions.canComplete = true;
          } else {
            actions.showViewButton = true;
            actions.buttonText = 'Trade Marked Completed';
            actions.buttonClass = 'btn-dark';
            actions.buttonAction = 'viewtrade';
          }
        }
      }
    } else if (tradeStatus === 'cancel' || tradeStatus === 'declined' || tradeStatus === 'counter_declined') {
      actions.showViewButton = true;
      actions.buttonText = 'VIEW';
      actions.buttonClass = 'counter-btn';
      actions.buttonAction = 'viewtrade';
    }

    // Set cancel/decline button
    if (canCancelTrade) {
      if (isSender) {
        if (tradeStatus === 'counter_offer') {
          actions.showDeclineButton = true;
          actions.canDecline = true;
          actions.declineText = 'Decline Offer';
        } else {
          actions.showCancelButton = true;
          actions.canCancel = true;
          actions.cancelText = 'Cancel Trade';
        }
      } else if (isReceiver) {
        if (tradeStatus === 'counter_offer') {
          actions.showCancelButton = true;
          actions.canCancel = true;
          actions.cancelText = 'Cancel Offer';
        } else {
          actions.showDeclineButton = true;
          actions.canDecline = true;
          actions.declineText = 'Decline Trade';
        }
      }
    }

    return actions;
  }

  // Get trade detail for modal (Laravel get_receive_trade_detail equivalent)
  static async getTradeDetail(tradeId: number, userId: number, cardId: number | null = null) {
    try {
      // Validate inputs
      if (!tradeId || isNaN(tradeId) || tradeId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid trade ID is required'
          }
        };
      }

      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Get trade proposal with all required associations
      const tradeProposal = await TradeProposal.findOne({
        where: { id: tradeId },
        include: [
          {
            model: User,
            as: 'tradeSender',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture'],
            required: false
          },
          {
            model: User,
            as: 'tradeReceiver',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture'],
            required: false
          },
          {
            model: TradingCard,
            as: 'mainTradingCard',
            attributes: ['id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 'search_param', 'trading_card_estimated_value'],
            required: false,
            include: [{
              model: Category,
              as: 'parentCategory',
              attributes: ['id', 'sport_name'],
              required: false
            }]
          },
          {
            model: TradeProposalStatus,
            as: 'tradeProposalStatus',
            attributes: ['id', 'alias', 'name', 'to_sender', 'to_receiver'],
            required: false
          },
          {
            model: Shipment,
            as: 'shipmenttrader',
            attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id', 'paymentId', 'selected_rate'],
            required: false
          },
          {
            model: Shipment,
            as: 'shipmentself',
            attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id', 'paymentId', 'selected_rate'],
            required: false
          }
        ]
      });

      if (!tradeProposal) {
        return {
          success: false,
          error: {
            message: 'Trade proposal not found'
          }
        };
      }

      const tradeData = tradeProposal.toJSON();

      // Check if user has access to this trade
      if (tradeData.trade_sent_by !== userId && tradeData.trade_sent_to !== userId) {
        return {
          success: false,
          error: {
            message: 'Access denied to this trade'
          }
        };
      }

      // Get trading card details for send_cards and receive_cards
      const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards || '');
      const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards || '');

      // Apply Laravel logic: __getSendingAndReceivingCardNames
      let finalSendCards = sendCardsDetails;
      let finalReceiveCards = receiveCardsDetails;

      if (tradeData.trade_sent_by === userId) {
        // User is the sender: Sending = send_cards, Receiving = receive_cards
        finalSendCards = sendCardsDetails;
        finalReceiveCards = receiveCardsDetails;
      } else if (tradeData.trade_sent_to === userId) {
        // User is the receiver: Sending = receive_cards, Receiving = send_cards
        finalSendCards = receiveCardsDetails;
        finalReceiveCards = sendCardsDetails;
      }

      // Determine trade status display (Laravel trade-status.blade.php logic)
      let tradeProposalStatus = '';
      if ((tradeData as any).tradeProposalStatus) {
        if (tradeData.trade_sent_by === userId) {
          tradeProposalStatus = (tradeData as any).tradeProposalStatus.to_sender;
        } else if (tradeData.trade_sent_to === userId) {
          tradeProposalStatus = (tradeData as any).tradeProposalStatus.to_receiver;
        }
      }

      // Determine button actions based on Laravel logic
      const buttonActions = UserService.getTradeButtonActions(tradeData, userId);

      // Get shipments for both users
      const shipments = await Shipment.findAll({
        where: { trade_id: tradeId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture'],
          required: false
        }]
      });

      // Transform shipment data
      const transformedShipments = shipments.map((shipment: any) => {
        const shipmentData = shipment.toJSON();
        return {
          id: shipmentData.id,
          user_id: shipmentData.user_id,
          tracking_id: shipmentData.tracking_id,
          shipment_status: shipmentData.shipment_status,
          estimated_delivery_date: shipmentData.estimated_delivery_date,
          paymentId: shipmentData.paymentId,
          selected_rate: shipmentData.selected_rate,
          user: shipmentData.user
        };
      });

      // Build response data
      const responseData = {
        id: tradeData.id,
        code: tradeData.code,
        trade_sent_by: tradeData.trade_sent_by,
        trade_sent_to: tradeData.trade_sent_to,
        main_card: tradeData.main_card,
        send_cards: finalSendCards,
        receive_cards: finalReceiveCards,
        add_cash: tradeData.add_cash,
        ask_cash: tradeData.ask_cash,
        trade_amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
        trade_amount_pay_id: tradeData.trade_amount_pay_id,
        trade_amount_payer_id: tradeData.trade_amount_payer_id,
        trade_amount_amount: tradeData.trade_amount_amount,
        trade_amount_pay_status: tradeData.trade_amount_pay_status,
        message: tradeData.message,
        counter_personalized_message: tradeData.counter_personalized_message,
        counter_offer: tradeData.counter_offer,
        is_new: tradeData.is_new,
        trade_status: tradeData.trade_status,
        accepted_on: tradeData.accepted_on ? UserService.formatDateToMMDDYY(tradeData.accepted_on) : null,
        is_payment_received: tradeData.is_payment_received,
        payment_received_on: tradeData.payment_received_on ? UserService.formatDateToMMDDYY(tradeData.payment_received_on) : null,
        shipped_by_trade_sent_by: tradeData.shipped_by_trade_sent_by,
        shipped_on_by_trade_sent_by: tradeData.shipped_on_by_trade_sent_by ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_by) : null,
        shipped_by_trade_sent_to: tradeData.shipped_by_trade_sent_to,
        shipped_on_by_trade_sent_to: tradeData.shipped_on_by_trade_sent_to ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_to) : null,
        is_payment_init: tradeData.is_payment_init,
        payment_init_date: tradeData.payment_init_date ? UserService.formatDateToMMDDYY(tradeData.payment_init_date) : null,
        trade_proposal_status_id: tradeData.trade_proposal_status_id,
        receiver_confirmation: tradeData.receiver_confirmation,
        trade_sender_confrimation: tradeData.trade_sender_confrimation,
        created_at: tradeData.created_at ? UserService.formatDateToMMDDYY(tradeData.created_at) : null,
        updated_at: tradeData.updated_at,
        // Laravel aliases
        tradereceivername: (tradeData as any).tradeReceiver ? {
          id: (tradeData as any).tradeReceiver.id,
          username: (tradeData as any).tradeReceiver.username,
          first_name: (tradeData as any).tradeReceiver.first_name,
          last_name: (tradeData as any).tradeReceiver.last_name,
          profile_picture: (tradeData as any).tradeReceiver.profile_picture
        } : null,
        tradesendername: (tradeData as any).tradeSender ? {
          id: (tradeData as any).tradeSender.id,
          username: (tradeData as any).tradeSender.username,
          first_name: (tradeData as any).tradeSender.first_name,
          last_name: (tradeData as any).tradeSender.last_name,
          profile_picture: (tradeData as any).tradeSender.profile_picture
        } : null,
        trade_proposal_status: (tradeData as any).tradeProposalStatus ? {
          id: (tradeData as any).tradeProposalStatus.id,
          alias: (tradeData as any).tradeProposalStatus.alias,
          name: (tradeData as any).tradeProposalStatus.name,
          to_sender: (tradeData as any).tradeProposalStatus.to_sender,
          to_receiver: (tradeData as any).tradeProposalStatus.to_receiver
        } : null,
        // Shipment data
        shipments: transformedShipments,
        // Button actions for frontend
        buttonActions: buttonActions,
        // Trade status display
        tradeProposalStatus: tradeProposalStatus
      };

      return {
        success: true,
        data: responseData
      };

    } catch (error: any) {
      console.error('Get trade detail error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to get trade detail',
          details: error.message
        }
      };
    }
  }


  // Get cancelled trades for authenticated user
  static async getCancelledTrades(userId: number, filters: any = {}, page: number = 1, perPage: number = 5) {
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

      // Build where clause - include declined, cancel, counter_declined
      let whereClause: any = {
        trade_status: { [Op.in]: ['declined', 'cancel', 'counter_declined'] },
        [Op.or]: [
          { trade_sent_by: userId },
          { trade_sent_to: userId }
        ]
      };

      const filterData: any = {};

      // Handle specific ID filter
      if (filters.id && filters.id > 0) {
        whereClause.id = filters.id;
      }

      // Handle trade_with filter (username search) - Laravel logic
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        filterData.trade_with = filters.trade_with;
        // This will be handled in the includes section below
      }

      // Handle code filter
      if (filters.code && filters.code.trim() !== '') {
        whereClause.code = { [Op.like]: `%${filters.code}%` };
        filterData.code = filters.code;
      }

      // Handle trade_type filter
      if (filters.trade_type === 'sent') {
        whereClause.trade_sent_by = userId;
        filterData.trade_type = 'sent';
      } else if (filters.trade_type === 'received') {
        whereClause.trade_sent_to = userId;
        filterData.trade_type = 'received';
      }

      // Handle date filters
      if (filters.from_date && filters.from_date.trim() !== '') {
        try {
          const fromDate = new Date(filters.from_date);
          whereClause.created_at = { [Op.gte]: fromDate };
          filterData.from_date = filters.from_date;
        } catch (error) {
          console.error('Invalid from_date format:', filters.from_date);
        }
      }

      if (filters.to_date && filters.to_date.trim() !== '') {
        try {
          const toDate = new Date(filters.to_date);
          toDate.setHours(23, 59, 59, 999); // End of day
          if (whereClause.created_at) {
            whereClause.created_at[Op.lte] = toDate;
          } else {
            whereClause.created_at = { [Op.lte]: toDate };
          }
          filterData.to_date = filters.to_date;
        } catch (error) {
          console.error('Invalid to_date format:', filters.to_date);
        }
      }

      // Calculate pagination
      const limit = perPage;
      const offset = (page - 1) * perPage;

      // Get total count for pagination
      const totalCount = await TradeProposal.count({
        where: whereClause
      });

      // Build includes array
      const includes: any[] = [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: TradingCard,
          as: 'mainTradingCard',
          attributes: ['id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price'],
          required: false
        },
        {
          model: TradeProposalStatus,
          as: 'tradeProposalStatus',
          attributes: ['id', 'alias', 'name', 'to_sender', 'to_receiver'],
          required: false
        }
      ];

      // Handle trade_with filter - Laravel logic (search in receiver username)
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        const tradeWithPattern = `%${filters.trade_with}%`;
        
        // Add whereHas condition for tradeReceiver username search
        includes[1].where = { username: { [Op.like]: tradeWithPattern } };
        includes[1].required = true;
      }

      // Get cancelled trades with all required associations
      const cancelledTrades = await TradeProposal.findAll({
        where: whereClause,
        include: includes,
        order: [['id', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Transform the data according to requirements
      const transformedCancelledTrades = await Promise.all(cancelledTrades.map(async (trade: any) => {
        const tradeData = trade.toJSON();
        
        // Determine sender_name and receiver_name
        let sender_name = null;
        let receiver_name = null;
        
        if (tradeData.tradeSender) {
          sender_name = tradeData.tradeSender.username || 
            `${tradeData.tradeSender.first_name || ''} ${tradeData.tradeSender.last_name || ''}`.trim();
        }
        
        if (tradeData.tradeReceiver) {
          receiver_name = tradeData.tradeReceiver.username || 
            `${tradeData.tradeReceiver.first_name || ''} ${tradeData.tradeReceiver.last_name || ''}`.trim();
        }

        // Get trading card details for send_cards and receive_cards (excluding image, trading_card_estimated_value)
        const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards, true);
        const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards, true);

        // Apply Laravel logic: __getSendingAndReceivingCardNames
        let finalSendCards = sendCardsDetails;
        let finalReceiveCards = receiveCardsDetails;

        if (tradeData.trade_sent_by === userId) {
          // User is the sender: Sending = send_cards, Receiving = receive_cards
          finalSendCards = sendCardsDetails;
          finalReceiveCards = receiveCardsDetails;
        } else if (tradeData.trade_sent_to === userId) {
          // User is the receiver: Sending = receive_cards, Receiving = send_cards
          finalSendCards = receiveCardsDetails;
          finalReceiveCards = sendCardsDetails;
        }

        return {
          id: tradeData.id,
          code: tradeData.code,
          trade_sent_by: tradeData.trade_sent_by === userId ? tradeData.trade_sent_by : tradeData.trade_sent_to,
          trade_sent_to: tradeData.trade_sent_by === userId ? tradeData.trade_sent_to : tradeData.trade_sent_by,
          sender_name: sender_name,
          receiver_name: receiver_name,
          main_card: tradeData.main_card,
          send_cards: finalSendCards,
          receive_cards: finalReceiveCards,
          trade_amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
          trade_amount_pay_id: tradeData.trade_amount_pay_id,
          trade_amount_payer_id: tradeData.trade_amount_payer_id,
          trade_amount_amount: tradeData.trade_amount_amount,
          trade_amount_pay_status: tradeData.trade_amount_pay_status,
          message: tradeData.message,
          counter_personalized_message: tradeData.counter_personalized_message,
          counter_offer: tradeData.counter_offer,
          is_new: tradeData.is_new,
          trade_status: tradeData.trade_status,
          accepted_on: tradeData.accepted_on ? UserService.formatDateToMMDDYY(tradeData.accepted_on) : null,
          is_payment_received: tradeData.is_payment_received,
          payment_received_on: tradeData.payment_received_on ? UserService.formatDateToMMDDYY(tradeData.payment_received_on) : null,
          shipped_by_trade_sent_by: tradeData.shipped_by_trade_sent_by,
          shipped_on_by_trade_sent_by: tradeData.shipped_on_by_trade_sent_by ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_by) : null,
          shipped_by_trade_sent_to: tradeData.shipped_by_trade_sent_to,
          shipped_on_by_trade_sent_to: tradeData.shipped_on_by_trade_sent_to ? UserService.formatDateToMMDDYY(tradeData.shipped_on_by_trade_sent_to) : null,
          is_payment_init: tradeData.is_payment_init,
          payment_init_date: tradeData.payment_init_date ? UserService.formatDateToMMDDYY(tradeData.payment_init_date) : null,
          trade_proposal_status_id: tradeData.trade_proposal_status_id,
          created_at: UserService.formatDateToMMDDYY(tradeData.created_at),
          updated_at: tradeData.updated_at,
          mainTradingCard: tradeData.mainTradingCard ? {
            id: tradeData.mainTradingCard.id,
            trading_card_slug: tradeData.mainTradingCard.trading_card_slug
          } : null,
          tradeProposalStatus: tradeData.tradeProposalStatus ? {
            id: tradeData.tradeProposalStatus.id,
            alias: tradeData.tradeProposalStatus.alias,
            name: tradeData.tradeProposalStatus.name,
            to_sender: tradeData.tradeProposalStatus.to_sender,
            to_receiver: tradeData.tradeProposalStatus.to_receiver
          } : null,
          // Payment details for cancelled trades
          payment_detail: {
            products_offer_amount: tradeData.add_cash || 0,
            shipment_amount: tradeData.proxy_fee_amt || 0,
            total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
            paid_amount: tradeData.trade_amount_amount ? parseFloat(tradeData.trade_amount_amount) : 0,
            amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
          }
        };
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          cancelled_trades: transformedCancelledTrades,
          filterData,
          trade_id: filters.id || 0
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      };

    } catch (error: any) {
      console.error('Error getting cancelled trades:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get cancelled trades'
        }
      };
    }
  }

  // Get notifications list for authenticated user
  static async getNotifications(userId: number, page: number = 1, perPage: number = 10) {
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
      const limit = perPage;
      const offset = (page - 1) * perPage;

      // Get total count for pagination
      const totalCount = await TradeNotification.count({
        where: {
          notification_sent_to: userId
        }
      });

      // Get notifications with sender information
      const notifications = await TradeNotification.findAll({
        where: {
          notification_sent_to: userId
        },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Transform the data according to requirements
      const transformedNotifications = notifications.map((notification: any) => {
        const notificationData = notification.toJSON();
        
        // Determine received_from name
        let received_from = null;
        if (notificationData.sender) {
          received_from = notificationData.sender.username || 
            `${notificationData.sender.first_name || ''} ${notificationData.sender.last_name || ''}`.trim();
        }

        return {
          id: notificationData.id,
          title: notificationData.message || 'Trade Notification', // Use message as title
          received_from: received_from,
          received_on: notificationData.created_at ? UserService.formatDateToMMDDYY(notificationData.created_at) : null,
          received_on_date: notificationData.created_at,
          seen_date: notificationData.seen ? (notificationData.updated_at ? UserService.formatDateToMMDDYY(notificationData.updated_at) : null) : null,
          seen: notificationData.seen || 0, // Add seen parameter
          trade_proposal_id: notificationData.trade_proposal_id,
          buy_sell_card_id: notificationData.buy_sell_card_id
        };
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: transformedNotifications,
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      };

    } catch (error: any) {
      console.error('Error getting notifications:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get notifications'
        }
      };
    }
  }

  // Helper function to calculate days difference from current date
  private static calculateDaysDifference(dateString: string | Date | null): string | null {
    if (!dateString) return null;
    
    try {
      const targetDate = new Date(dateString);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - targetDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch (error) {
      console.error('Error calculating days difference:', error);
      return null;
    }
  }

  // Helper function to calculate trade duration between two dates in MM.DD.YY HH:MM AM/PM format
  private static calculateTradeDuration(date1: string | Date | null, date2: string | Date | null): string | null {
    if (!date1 || !date2) return null;
    
    try {
      // Helper function to parse MM.DD.YY HH:MM AM/PM format
      const parseCustomFormat = (dateString: string): Date | null => {
        try {
          if (typeof dateString === 'string' && dateString.includes('.') && (dateString.includes('AM') || dateString.includes('PM'))) {
            const parts = dateString.split(' ');
            const datePart = parts[0]; // "06.16.25"
            const timePart = parts.slice(1).join(' '); // "12:57 AM"
            
            if (datePart && datePart.includes('.')) {
              const dateComponents = datePart.split('.');
              if (dateComponents.length === 3) {
                const month = dateComponents[0];
                const day = dateComponents[1];
                const year = dateComponents[2];
                
                if (month && day && year) {
                  const fullYear = parseInt('20' + year); // Convert 25 to 2025
                  const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;
                  return new Date(dateString);
                }
              }
            }
          }
          return new Date(dateString);
        } catch (error) {
          console.error('Error parsing date:', dateString, error);
          return null;
        }
      };
      
      const date1Parsed = parseCustomFormat(date1.toString());
      const date2Parsed = parseCustomFormat(date2.toString());
      
      if (!date1Parsed || !date2Parsed) {
        console.error('Invalid date format:', { date1, date2 });
        return null;
      }
      
      // Validate dates
      if (isNaN(date1Parsed.getTime()) || isNaN(date2Parsed.getTime())) {
        console.error('Invalid parsed dates:', { date1Parsed, date2Parsed });
        return null;
      }
      
      // Calculate difference in milliseconds
      const diffTime = Math.abs(date2Parsed.getTime() - date1Parsed.getTime());
      
      // Convert to days
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Same day';
      if (diffDays === 1) return '1 day';
      return `${diffDays} days`;
    } catch (error) {
      console.error('Error calculating trade duration:', error);
      return null;
    }
  }

  // Helper function to parse card IDs and fetch trading card details
  private static async getTradingCardDetails(cardIdsString: string | null, excludeFields: boolean = false): Promise<any[]> {
    if (!cardIdsString || cardIdsString.trim() === '') {
      return [];
    }

    try {
      let cardIds: number[] = [];

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(cardIdsString);
        if (Array.isArray(parsed)) {
          cardIds = parsed.filter(id => typeof id === 'number' && !isNaN(id));
        }
      } catch (jsonError) {
        // Not JSON format, continue to other formats
      }

      // If JSON parsing failed, try comma-separated values
      if (cardIds.length === 0) {
        const commaSeparated = cardIdsString.split(',').map(id => {
          const num = parseInt(id.trim());
          return isNaN(num) ? null : num;
        }).filter(id => id !== null);
        
        if (commaSeparated.length > 0) {
          cardIds = commaSeparated as number[];
        }
      }

      // If still no valid IDs, try space-separated
      if (cardIds.length === 0) {
        const spaceSeparated = cardIdsString.split(' ').map(id => {
          const num = parseInt(id.trim());
          return isNaN(num) ? null : num;
        }).filter(id => id !== null);
        
        if (spaceSeparated.length > 0) {
          cardIds = spaceSeparated as number[];
        }
      }

      // If still no valid IDs, try semicolon-separated
      if (cardIds.length === 0) {
        const semicolonSeparated = cardIdsString.split(';').map(id => {
          const num = parseInt(id.trim());
          return isNaN(num) ? null : num;
        }).filter(id => id !== null);
        
        if (semicolonSeparated.length > 0) {
          cardIds = semicolonSeparated as number[];
        }
      }

      // If still no valid IDs, try pipe-separated
      if (cardIds.length === 0) {
        const pipeSeparated = cardIdsString.split('|').map(id => {
          const num = parseInt(id.trim());
          return isNaN(num) ? null : num;
        }).filter(id => id !== null);
        
        if (pipeSeparated.length > 0) {
          cardIds = pipeSeparated as number[];
        }
      }

      if (cardIds.length === 0) {
        return [];
      }

      // Fetch trading card details
      const attributes = excludeFields 
        ? [
            'id', 
            'card_name', 
            'trading_card_slug', 
            'trading_card_status',
            'code',
            'search_param',
            'title',
            'category_id'
          ]
        : [
          'id', 
          'card_name', 
          'trading_card_img', 
          'trading_card_slug', 
          'trading_card_asking_price',
          'trading_card_estimated_value',
          'trading_card_status',
          'code',
          'search_param',
          'title',
          'category_id'
          ];

      const tradingCards = await TradingCard.findAll({
        where: {
          id: { [Op.in]: cardIds }
        },
        attributes: attributes
      });

      // Transform cards with category names
      const cardsWithCategories = await Promise.all(tradingCards.map(async (card) => {
        let category_name = null;
        if (card.category_id) {
          try {
            const category = await Category.findByPk(card.category_id);
            category_name = category ? category.sport_name : null;
          } catch (error) {
            console.error('Error fetching category for card:', card.id, error);
            category_name = null;
          }
        }

        const baseCard = {
          id: card.id,
          name: card.card_name,
          slug: card.trading_card_slug,
          status: card.trading_card_status,
          code: card.code,
          search_param: card.search_param,
          title: (card as any).title || null,
          category_id: card.category_id,
          category_name: category_name
        };

        if (!excludeFields) {
          return {
            ...baseCard,
            image: card.trading_card_img,
            asking_price: card.trading_card_asking_price,
            trading_card_estimated_value: card.trading_card_estimated_value
          };
        }

        return baseCard;
      }));

      return cardsWithCategories;
    } catch (error) {
      console.error('Error parsing card IDs:', error);
      return [];
    }
  }

  // Get completed trades for authenticated user
  static async getCompletedTrades(userId: number, filters: any = {}, page: number = 1, perPage: number = 5) {
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

      // Build base where clause - Laravel logic
      let whereClause: any = {
        [Op.or]: [
          { trade_sent_by_key: userId },
          { trade_sent_to_key: userId }
        ]
      };

      const filterData: any = {};

      // Handle specific ID filter
      if (filters.id && filters.id > 0) {
        whereClause.trade_proposal_id = filters.id;
        // Check if trade transaction exists, if not redirect to ongoing trades
        const tradeExists = await TradeTransaction.count({
          where: { trade_proposal_id: filters.id }
        });
        if (tradeExists === 0) {
          return {
            success: false,
            error: {
              message: 'Trade transaction not found',
              redirect: 'ongoing-trades'
            }
          };
        }
      }

      // Handle trade_id filter (alias for trade_proposal_id)
      if (filters.trade_id && filters.trade_id > 0) {
        whereClause.trade_proposal_id = filters.trade_id;
      }

      // Handle trade_with filter (username search) - Laravel logic
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        filterData.trade_with = filters.trade_with;
      }

      // Handle code filter
      if (filters.code && filters.code.trim() !== '') {
        whereClause.order_id = { [Op.like]: `%${filters.code}%` };
        filterData.code = filters.code;
      }

      // Handle trade_type filter
      if (filters.trade_type === 'sent') {
        whereClause.trade_sent_by_key = userId;
        filterData.trade_type = 'sent';
      } else if (filters.trade_type === 'received') {
        whereClause.trade_sent_to_key = userId;
        filterData.trade_type = 'received';
      }

      // Handle date filters
      if (filters.from_date && filters.from_date.trim() !== '') {
        try {
          const fromDate = new Date(filters.from_date);
          if (!isNaN(fromDate.getTime())) {
            // Normalize to start of day
            fromDate.setHours(0, 0, 0, 0);
            whereClause.created_at = { [Op.gte]: fromDate };
            filterData.from_date = filters.from_date;
          }
        } catch (error) {
          console.error('Invalid from_date format:', filters.from_date);
        }
      }

      if (filters.to_date && filters.to_date.trim() !== '') {
        try {
          const toDate = new Date(filters.to_date);
          if (!isNaN(toDate.getTime())) {
            // Normalize to end of day
            toDate.setHours(23, 59, 59, 999);
            if (whereClause.created_at) {
              whereClause.created_at[Op.lte] = toDate;
            } else {
              whereClause.created_at = { [Op.lte]: toDate };
            }
            filterData.to_date = filters.to_date;
          }
        } catch (error) {
          console.error('Invalid to_date format:', filters.to_date);
        }
      }

      // Calculate pagination
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await TradeTransaction.count({
        where: whereClause
      });

      // Prepare includes - Laravel logic
      const includes: any[] = [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'username', 'first_name', 'last_name'],
          required: false
        },
        {
          model: TradeProposal,
          as: 'tradeProposal',
          attributes: ['id', 'code', 'trade_status', 'trade_sender_confrimation', 'receiver_confirmation'],
          required: false,
          include: [
            {
              model: Shipment,
              as: 'shipmenttrader',
              attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id'],
              required: false
            },
            {
              model: Shipment,
              as: 'shipmentself',
              attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id'],
              required: false
            }
          ]
        }
      ];

      // Handle trade_with filter - Laravel logic (search in receiver username)
      if (filters.trade_with && filters.trade_with.trim() !== '') {
        const tradeWithPattern = `%${filters.trade_with}%`;
        
        // Add whereHas condition for tradeReceiver username search
        includes[1].where = { username: { [Op.like]: tradeWithPattern } };
        includes[1].required = true;
      }

      // Get completed trades with all required associations
      const completedTrades = await TradeTransaction.findAll({
        where: whereClause,
        include: includes,
        order: [['id', 'DESC']],
        limit: limit,
        offset: offset
      });

      // Get one-sided completed trades (Laravel logic)
      const oneSidedCompletedTrades = await TradeProposal.findAll({
        where: {
          [Op.or]: [
            {
              trade_sent_by: userId,
              trade_sender_confrimation: 1
            },
            {
              trade_sent_to: userId,
              receiver_confirmation: 1
            }
          ],
          id: {
            [Op.notIn]: await TradeTransaction.findAll({
              attributes: ['trade_proposal_id'],
              raw: true
            }).then(results => results.map(r => r.trade_proposal_id).filter(id => id !== null && id !== undefined))
          }
        },
        attributes: ['id', 'code', 'trade_sent_by', 'trade_sent_to', 'trade_status'],
        limit: 10
      });

      // Get completed trades for search params (Laravel logic)
      const completedTradesForSearch = await TradeProposal.findAll({
        where: {
          trade_status: 'complete',
          [Op.or]: [
            { trade_sent_by: userId },
            { trade_sent_to: userId }
          ]
        },
        attributes: ['id', 'code', 'trade_sent_by', 'trade_sent_to', 'send_cards', 'receive_cards'],
        limit: 50
      });

      // Transform the data according to requirements
      const transformedCompletedTrades = await Promise.all(completedTrades.map(async (trade: any) => {
        const tradeData = trade.toJSON();
        
        // Determine sender_name and receiver_name
        let sender_name = null;
        let receiver_name = null;
        
        if (tradeData.tradeSender) {
          sender_name = tradeData.tradeSender.username || 
            `${tradeData.tradeSender.first_name || ''} ${tradeData.tradeSender.last_name || ''}`.trim();
        }
        
        if (tradeData.tradeReceiver) {
          receiver_name = tradeData.tradeReceiver.username || 
            `${tradeData.tradeReceiver.first_name || ''} ${tradeData.tradeReceiver.last_name || ''}`.trim();
        }

        // Get trading card details for send_cards and receive_cards
        const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards);
        const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards);

        // Apply Laravel logic: __getSendingAndReceivingCardNames
        let finalSendCards = sendCardsDetails;
        let finalReceiveCards = receiveCardsDetails;

        if (tradeData.trade_sent_by_key === userId) {
          // User is the sender: Sending = send_cards, Receiving = receive_cards
          finalSendCards = sendCardsDetails;
          finalReceiveCards = receiveCardsDetails;
        } else if (tradeData.trade_sent_to_key === userId) {
          // User is the receiver: Sending = receive_cards, Receiving = send_cards
          finalSendCards = receiveCardsDetails;
          finalReceiveCards = sendCardsDetails;
        }

        // Get ratings for this trade (Laravel reference: sender_review_count_get)
        const ratings = await UserService.getTradeRatings(tradeData.trade_proposal_id);
        
        // Get shipment data directly from database
        // shipmenttrader: shipments where user_id = trade_sent_by_key (the person who sent the trade)
        // shipmenttrader: logged in user's shipment details
        const shipmenttrader = await Shipment.findAll({
          where: {
            trade_id: tradeData.trade_proposal_id,
            user_id: userId // logged in user's shipment
          },
          attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id']
        });
        
        // shipmentself: other user's shipment details
        const shipmentself = await Shipment.findAll({
          where: {
            trade_id: tradeData.trade_proposal_id,
            user_id: tradeData.trade_sent_by_key === userId ? tradeData.trade_sent_to_key : tradeData.trade_sent_by_key // other user's shipment
          },
          attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id']
        });
        
        // Debug: Log the raw data to help identify the issue
        if (tradeData.send_cards || tradeData.receive_cards) {
        }


        return {
          id: tradeData.id,
          code: tradeData.order_id, // Use order_id as code for completed trades
          trade_id: tradeData.trade_proposal_id, // expose underlying trade proposal id
          trade_sent_by: tradeData.trade_sent_by_key,
          trade_sent_to: tradeData.trade_sent_to_key,
          sender_name: sender_name,
          receiver_name: receiver_name,
          main_card: tradeData.main_card_id,
          send_cards: finalSendCards,
          receive_cards: finalReceiveCards,
          add_cash: tradeData.add_cash,
          ask_cash: tradeData.ask_cash,
          trade_amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
          trade_amount_pay_id: tradeData.trade_amount_pay_id,
          trade_amount_payer_id: tradeData.trade_amount_payer_id,
          trade_amount_amount: tradeData.trade_amount_amount,
          trade_amount_pay_status: tradeData.trade_amount_pay_status,
          message: tradeData.message,
          counter_personalized_message: tradeData.counter_personalized_message,
          counter_offer: null, // Not applicable for completed trades
          is_new: 0, // Completed trades are not new
          trade_status: 'complete', // All completed trades have complete status
          accepted_on: tradeData.trade_created_at ? UserService.formatDateToMMDDYY(tradeData.trade_created_at) : null,
          is_payment_received: tradeData.trade_amount_pay_status === 'completed' ? 1 : 0,
          payment_received_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
          shipped_by_trade_sent_by: tradeData.confirmation_from_sender,
          shipped_on_by_trade_sent_by: tradeData.confirmation_from_sender ? UserService.formatDateToMMDDYY(tradeData.created_at) : null,
          shipped_by_trade_sent_to: tradeData.confirmation_from_receiver,
          shipped_on_by_trade_sent_to: tradeData.confirmation_from_receiver ? UserService.formatDateToMMDDYY(tradeData.created_at) : null,
          is_payment_init: tradeData.trade_amount_pay_status ? 1 : 0,
          payment_init_date: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
          trade_proposal_status_id: null, // Not applicable for completed trades
          created_at: UserService.formatDateToMMDDYY(tradeData.created_at),
          updated_at: tradeData.updated_at,
          completed_trade_duration: UserService.calculateTradeDuration(
            tradeData.trade_created_at ? UserService.formatDateToMMDDYY(tradeData.trade_created_at) : null,
            tradeData.updated_at ? UserService.formatDateToMMDDYY(tradeData.updated_at) : null
          ),
          mainTradingCard: tradeData.main_card_id ? {
            id: tradeData.main_card_id,
            trading_card_img: null, // Would need to fetch from trading_cards table
            trading_card_slug: null,
            trading_card_asking_price: null
          } : null,
          // Payment details for completed trades
          payment_detail: {
            products_offer_amount: tradeData.add_cash || 0,
            shipment_amount: tradeData.proxy_fee_amt || 0,
            total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
            paid_amount: tradeData.trade_amount_amount || 0,
            amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
          },
          // Shipment data - Direct database query (as objects, not arrays)
          shipmenttrader: shipmenttrader.length > 0 ? {
            id: shipmenttrader[0]?.dataValues?.id || shipmenttrader[0]?.id || 0,
            tracking_id: shipmenttrader[0]?.dataValues?.tracking_id || shipmenttrader[0]?.tracking_id || '',
            shipment_status: shipmenttrader[0]?.dataValues?.shipment_status || shipmenttrader[0]?.shipment_status || 'Pending',
            estimated_delivery_date: shipmenttrader[0]?.dataValues?.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipmenttrader[0].dataValues.estimated_delivery_date) : UserService.formatDateToMMDDYY(new Date()),
            user_id: shipmenttrader[0]?.dataValues?.user_id || shipmenttrader[0]?.user_id || 0
          } : null,
          shipmentself: shipmentself.length > 0 ? {
            id: shipmentself[0]?.dataValues?.id || shipmentself[0]?.id || 0,
            tracking_id: shipmentself[0]?.dataValues?.tracking_id || shipmentself[0]?.tracking_id || '',
            shipment_status: shipmentself[0]?.dataValues?.shipment_status || shipmentself[0]?.shipment_status || 'Pending',
            estimated_delivery_date: shipmentself[0]?.dataValues?.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipmentself[0].dataValues.estimated_delivery_date) : UserService.formatDateToMMDDYY(new Date()),
            user_id: shipmentself[0]?.dataValues?.user_id || shipmentself[0]?.user_id || 0
          } : null,
          // Ratings for this trade
          ratings: ratings
        };
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          ongoing_trades: transformedCompletedTrades, // Use same structure as ongoing trades
          buy_sel_cards: [], // Empty array as per ongoing trades
          filterData,
          trade_id: filters.id || 0
        },
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      };

    } catch (error: any) {
      console.error('Error getting completed trades:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get completed trades'
        }
      };
    }
  }

  // Confirm payment for a trade proposal (Enhanced Laravel reference implementation)
  static async confirmPayment(userId: number, tradeProposalId: number) {
    try {
      // Validate inputs
      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      if (!tradeProposalId || isNaN(tradeProposalId) || tradeProposalId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid trade proposal ID is required'
          }
        };
      }

      // Find the trade proposal
      const tradeProposal = await TradeProposal.findByPk(tradeProposalId, {
        include: [
          {
            model: TradeProposalStatus,
            as: 'tradeProposalStatus'
          }
        ]
      });

      if (!tradeProposal) {
        return {
          success: false,
          error: {
            message: 'Trade proposal not found'
          }
        };
      }

      const tradeData = tradeProposal.toJSON();

      // Check if user is authorized to confirm payment
      if (tradeData.trade_sent_by !== userId && tradeData.trade_sent_to !== userId) {
        return {
          success: false,
          error: {
            message: 'You are not authorized to confirm payment for this trade'
          }
        };
      }

      // Update trade proposal with payment confirmation (Laravel: is_payment_received = '1', payment_received_on = now())
      await TradeProposal.update(
        {
          is_payment_received: 1,
          //trade_status: "counter_accepted",
          payment_received_on: new Date()
        },
        {
          where: { id: tradeProposalId }
        }
      );

      // Set trade status using helper function (Laravel: HelperTradeAndOfferStatus::___setStatus('payment-confirmed', 'trade', $trade_proposal->id))
      const statusResult = await setTradeProposalStatus(tradeProposalId, 'payment-confirmed');
      
      if (!statusResult.success) {
        console.error('❌ Failed to update trade status:', statusResult.error);
        
        // Fallback: Direct status update
      const paymentConfirmedStatus = await TradeProposalStatus.findOne({
        where: { alias: 'payment-confirmed' }
      });

      if (paymentConfirmedStatus) {
        await TradeProposal.update(
          { trade_proposal_status_id: paymentConfirmedStatus.id },
          { where: { id: tradeProposalId } }
        );
        } else {
          console.error('❌ Payment confirmed status not found in database');
        }
      }

      // Get sender and receiver details (Laravel: $receiver = User::find($trade_proposal->trade_sent_to); $sender = User::find($trade_proposal->trade_sent_by))
      const sender = await User.findByPk(tradeData.trade_sent_by, {
        attributes: ['id', 'first_name', 'last_name', 'email']
      });
      const receiver = await User.findByPk(tradeData.trade_sent_to, {
        attributes: ['id', 'first_name', 'last_name', 'email']
      });

      const tradeAmountAmount = tradeData.trade_amount_amount;

      // Get trading cards details (Laravel: TradingCard::whereIn('id', [$trade_proposal->send_cards])->get(['search_param']))
      const sendCardsIds = tradeData.send_cards ? tradeData.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCardsIds = tradeData.receive_cards ? tradeData.receive_cards.split(',').map(id => parseInt(id.trim())) : [];

      const sendCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCardsIds } },
        attributes: ['search_param']
      });

      const receiveCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCardsIds } },
        attributes: ['search_param']
      });

      // Format card lists (Laravel: foreach($sentCards as $card) { $itemsSend[] = $card->search_param; })
      const itemsSend = sendCards.map(card => card.search_param).filter(Boolean);
      const itemsReceived = receiveCards.map(card => card.search_param).filter(Boolean);

      // Create numbered lists (Laravel: foreach ($itemsSend as $index => $cardName) { $itemsSendList .= ($index + 1) . '. ' . $cardName . "\n"; })
      const itemsSendList = itemsSend.map((cardName, index) => `${index + 1}. ${cardName}`).join('\n');
      const itemsReceivedList = itemsReceived.map((cardName, index) => `${index + 1}. ${cardName}`).join('\n');

      // Import helper functions
      const { setTradersNotificationOnVariousActionBasis } = await import('./notification.service.js');
      const { EmailHelperService } = await import('../services/emailHelper.service.js');

      // Handle notifications and emails based on user role (Laravel: if ($trade_proposal->trade_sent_to == auth()->user()->id))
      if (tradeData.trade_sent_to === userId) {
        // User is receiver - send notifications and emails
        const act = 'payment-received';
        const sentBy = tradeData.trade_sent_to;
        const sentTo = tradeData.trade_sent_by;
        
        // Send notification (Laravel: Helper::__setTradersNotificationOnVariousActionBasis($act, $sent_by, $sent_to, $trade_proposal->id, 'Trade'))
        if (sentBy && sentTo) {
          await setTradersNotificationOnVariousActionBasis(act, sentBy, sentTo, tradeProposalId, 'Trade');
        }

        // Send email to sender (Laravel: HelperEmailSender::executeMailSender('payment-confirmed-to-sender', $mailInputs))
        if (sender) {
          const mailInputs = {
            to: sender.email,
            name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
            other_user_name: EmailHelperService.setName(receiver?.first_name || '', receiver?.last_name || ''),
            cardyousend: itemsSendList.replace(/\n/g, '<br>'),
            cardyoureceive: itemsReceivedList.replace(/\n/g, '<br>'),
            proposedamount: tradeAmountAmount,
            viewTransactionDeatilsLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/deals/ongoing?trade_id=${tradeProposalId}`,
            transaction_id: tradeData.code
          };
          
          try {
            await EmailHelperService.executeMailSender('payment-confirmed-to-sender', mailInputs);
          } catch (emailError) {
            console.error('❌ Failed to send payment confirmed email to sender:', emailError);
          }
        }
      } else if (tradeData.trade_sent_by === userId) {
        // User is sender - send notifications and emails
        const act = 'payment-received';
        // Laravel pattern: $sent_by = $trade_proposal->trade_sent_to; $sent_to = $trade_proposal->trade_sent_by;
        const sentBy = tradeData.trade_sent_to;
        const sentTo = tradeData.trade_sent_by;
        
        // Send notification (Laravel: Helper::__setTradersNotificationOnVariousActionBasis($act, $sent_by, $sent_to, $trade_proposal->id, 'Trade'))
        if (sentBy && sentTo) {
          await setTradersNotificationOnVariousActionBasis(act, sentBy, sentTo, tradeProposalId, 'Trade');
        }

        // Send email to receiver (Laravel: HelperEmailSender::executeMailSender('payment-received-confirmed-by-sender', $mailInputs))
        if (receiver) {
          const mailInputs = {
            to: receiver.email,
            name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
            other_user_name: EmailHelperService.setName(sender?.first_name || '', sender?.last_name || ''),
            cardyousend: itemsReceivedList.replace(/\n/g, '<br>'),
            cardyoureceive: itemsSendList.replace(/\n/g, '<br>'),
            proposedamount: tradeAmountAmount,
            viewTransactionDeatilsLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/deals/ongoing?trade_id=${tradeProposalId}`,
            transaction_id: tradeData.code
          };
          
          try {
            await EmailHelperService.executeMailSender('payment-received-confirmed-by-sender', mailInputs);
          } catch (emailError) {
            console.error('❌ Failed to send payment received confirmed email to receiver:', emailError);
          }
        }
      }

      return {
        success: true,
        data: {
          message: 'Payment confirmation received',
          trade_proposal_id: tradeProposalId,
          trade_code: tradeData.code,
          payment_confirmed_by: userId,
          payment_confirmed_at: new Date(),
          sender: sender ? {
            id: sender.id,
            name: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
            email: sender.email
          } : null,
          receiver: receiver ? {
            id: receiver.id,
            name: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
            email: receiver.email
          } : null,
          send_cards: itemsSend,
          receive_cards: itemsReceived,
          trade_amount: tradeAmountAmount
        }
      };

    } catch (error: any) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to confirm payment'
        }
      };
    }
  }

  // Get my tickets (Laravel reference implementation)
  static async getMyTickets(userId: number, page: number = 1, perPage: number = 10) {
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

      // Validate pagination parameters
      const validPage = Math.max(1, parseInt(page.toString()) || 1);
      const validPerPage = Math.min(100, Math.max(1, parseInt(perPage.toString()) || 10));
      const offset = (validPage - 1) * validPerPage;

      // Laravel reference: DB::table('support')->where('user_id', auth()->user()->id)->orderBy('id', 'DESC')->paginate(10)
      const { count: totalCount, rows: tickets } = await Support.findAndCountAll({
        where: {
          user_id: userId
        },
        order: [['id', 'DESC']],
        limit: validPerPage,
        offset: offset
      });

      // Transform tickets data
      const transformedTickets = tickets.map((ticket: any) => {
        const ticketData = ticket.toJSON();
        return {
          id: ticketData.id,
          user_id: ticketData.user_id,
          first_name: ticketData.first_name,
          last_name: ticketData.last_name,
          email: ticketData.email,
          subject: ticketData.subject,
          comment: ticketData.comment,
          support_request_status: ticketData.support_request_status,
          support_status: ticketData.support_status,
          created_at: ticketData.created_at,
          updated_at: ticketData.updated_at
        };
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / validPerPage);
      const hasNextPage = validPage < totalPages;
      const hasPrevPage = validPage > 1;

      return {
        success: true,
        data: {
          tickets: transformedTickets,
          pagination: {
            currentPage: validPage,
            perPage: validPerPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };

    } catch (error: any) {
      console.error('Error getting my tickets:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to get tickets'
        }
      };
    }
  }

  // Mark all notifications as read (Laravel reference implementation)
  static async markAllNotificationsAsRead(userId: number) {
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

      // Laravel reference: NotificationModel::where('notification_sent_to', Auth::user()->id)->update(['seen' => 1])
      const updatedCount = await TradeNotification.update(
        { seen: 1 },
        {
          where: {
            notification_sent_to: userId
          }
        }
      );

      return {
        success: true,
        data: {
          message: 'All notifications marked as read successfully',
          updated_count: updatedCount[0], // Sequelize returns [affectedCount, affectedRows]
          user_id: userId
        }
      };

    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to mark notifications as read'
        }
      };
    }
  }

  // Submit rating for a trade proposal (Laravel reference implementation)
  static async submitRating(userId: number, tradeId: number, rating: number, data: string) {
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

      // Validate tradeId
      if (!tradeId || isNaN(tradeId) || tradeId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid trade ID is required'
          }
        };
      }

      // Validate rating (1-10)
      if (!rating || isNaN(rating) || rating < 1 || rating > 10) {
        return {
          success: false,
          error: {
            message: 'Rating must be between 1 and 10'
          }
        };
      }

      // Find the trade proposal
      const tradeProposal = await TradeProposal.findByPk(tradeId, {
        attributes: ['id', 'main_card', 'trade_sent_by', 'trade_sent_to']
      });

      if (!tradeProposal) {
        return {
          success: false,
          error: {
            message: 'Trade proposal not found'
          }
        };
      }

      const tradeData = tradeProposal.toJSON();

      // Check if user is authorized to rate this trade
      const isSender = tradeData.trade_sent_by === userId;
      const isReceiver = tradeData.trade_sent_to === userId;

      if (!isSender && !isReceiver) {
        return {
          success: false,
          error: {
            message: 'You are not authorized to rate this trade'
          }
        };
      }

      // Find existing review
      const existingReview = await Review.findOne({
        where: {
          trade_proposal_id: tradeId
        }
      });

      let reviewRecord: any;
      const normalizedRating = rating; // store exact rating provided (1..10)

      if (existingReview) {
        // Update existing review
        if (isSender) {
          const updateData: any = {
            trader_id: userId,
            trader_rating: normalizedRating,
            trader_review: data,
            trade_proposal_id: tradeId
          };
          if (tradeData.main_card) {
            updateData.card_id = tradeData.main_card;
          }
          await Review.update(updateData, {
            where: { id: existingReview.id }
          });
        } else {
          const updateData: any = {
            user_id: userId,
            user_rating: normalizedRating,
            user_review: data,
            trade_proposal_id: tradeId
          };
          if (tradeData.main_card) {
            updateData.card_id = tradeData.main_card;
          }
          await Review.update(updateData, {
            where: { id: existingReview.id }
          });
        }
        reviewRecord = await Review.findByPk(existingReview.id);
      } else {
        // Create new review
        if (isSender) {
          const createData: any = {
            trader_id: userId,
            trader_rating: normalizedRating,
            trader_review: data,
            trade_proposal_id: tradeId
          };
          if (tradeData.main_card) {
            createData.card_id = tradeData.main_card;
          }
          reviewRecord = await Review.create(createData as any);
        } else {
          const createData: any = {
            user_id: userId,
            user_rating: normalizedRating,
            user_review: data,
            trade_proposal_id: tradeId
          };
          if (tradeData.main_card) {
            createData.card_id = tradeData.main_card;
          }
          reviewRecord = await Review.create(createData as any);
        }
      }

      // Create review collection record
      const reviewCollectionRecord = await ReviewCollection.create({
        review_id: reviewRecord.id,
        buy_sell_card_id: 0,
        user_id: isSender ? tradeData.trade_sent_to : tradeData.trade_sent_by,
        sender_id: isSender ? tradeData.trade_sent_by : tradeData.trade_sent_to,
        rating: normalizedRating,
        content: data
      } as any);

      // TODO: Send notification (implement notification system)
      // TODO: Send review email (implement email system)

      return {
        success: true,
        data: {
          message: 'Rating submitted successfully',
          review_id: reviewRecord.id,
          review_collection_id: reviewCollectionRecord.id,
          trade_id: tradeId,
          rating: normalizedRating,
          review: data,
          user_type: isSender ? 'sender' : 'receiver',
          submitted_at: reviewRecord.created_at
        }
      };

    } catch (error: any) {
      console.error('Error submitting rating:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to submit rating'
        }
      };
    }
  }

  // Cancel shipping payment for trade transaction (Laravel equivalent)
  static async cancelShippingPayment(tradeId: number, userId: number) {
    try {
      // Validate inputs
      if (!tradeId || isNaN(tradeId) || tradeId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid trade ID is required'
          }
        };
      }

      if (!userId || isNaN(userId) || userId <= 0) {
        return {
          success: false,
          error: {
            message: 'Valid user ID is required'
          }
        };
      }

      // Check if shipment exists for this trade_id
      const existingShipment = await Shipment.findOne({
        where: { trade_id: tradeId }
      });

      if (!existingShipment) {
        return {
          success: false,
          error: {
            message: 'No shipment found for this trade transaction'
          }
        };
      }

      // Update shipment payment status to cancelled (3) - Laravel equivalent
      const updatedShipment = await Shipment.update(
        { 
          shipment_payment_status: 3,
          updated_at: new Date()
        },
        { 
          where: { trade_id: tradeId }
        }
      );

      if (updatedShipment[0] > 0) {
        return {
          success: true,
          data: {
            trade_id: tradeId,
            shipment_payment_status: 3,
            message: 'Shipment payment cancelled successfully',
            updated_at: new Date()
          }
        };
      } else {
        return {
          success: false,
          error: {
            message: 'Failed to update shipment payment status'
          }
        };
      }

    } catch (error: any) {
      console.error('Cancel shipping payment error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to cancel shipping payment'
        }
      };
    }
  }
}
