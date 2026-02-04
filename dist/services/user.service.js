import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { Follower } from "../models/follower.model.js";
import { MembershipUser } from "../models/membership_user.model.js";
import { Membership } from "../models/membership.model.js";
import { CreditPurchaseLog } from "../models/creditPurchaseLog.model.js";
import { CreditDeductionLog } from "../models/creditDeductionLog.model.js";
import { UserSocialMedia } from "../models/userSocialMedia.model.js";
import { SocialMedia } from "../models/socialMedia.model.js";
import { Shipment } from "../models/shipment.model.js";
import { Address } from "../models/address.model.js";
import { CategoryShippingRate } from "../models/categoryShippingRates.model.js";
import { BuySellCard, BuyOfferStatus, BuyOfferProduct, TradeProposal, TradeProposalStatus, TradeTransaction, TradeNotification, ReviewCollection, Review, Support } from "../models/index.js";
import { setTradeProposalStatus } from '../services/tradeStatus.service.js';
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";
export class UserService {
    static formatAddedOnDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "01.01.2024 12:00 AM";
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = String(hours);
            return `${day}.${month}.${year} ${hoursStr}:${minutes} ${ampm}`;
        }
        catch (error) {
            console.error('Error formatting added_on date:', error);
            return "01.01.2024 12:00 AM";
        }
    }
    static formatFollowedOnDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "01-01-2024 12:00 AM";
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = String(hours).padStart(2, '0');
            return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
        }
        catch (error) {
            console.error('Error formatting followed_on date:', error);
            return "01-01-2024 12:00 AM";
        }
    }
    static formatDateToMMDDYY(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "01.01.25 12:00 AM";
            }
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = String(hours);
            return `${month}.${day}.${year} ${hoursStr}:${minutes} ${ampm}`;
        }
        catch (error) {
            console.error('Error formatting date to MM.DD.YY:', error);
            return "01.01.25 12:00 AM";
        }
    }
    static async getUserById(id) {
        return await User.findByPk(id);
    }
    static async getUserSocialMedia(userId) {
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
            const socialLinks = [];
            socialMediaData.forEach((item) => {
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
        }
        catch (error) {
            console.error('❌ Error getting user social media:', error);
            return [];
        }
    }
    static async updateUserSocialMedia(userId, socialMediaData) {
        try {
            const results = [];
            for (const [platformKey, platformData] of Object.entries(socialMediaData)) {
                if (platformData && typeof platformData === 'object' && 'url' in platformData) {
                    const url = platformData.url;
                    if (url && url.trim() !== '') {
                        let socialMediaPlatform = await SocialMedia.findOne({
                            where: {
                                social_media_name: {
                                    [Op.like]: `%${platformKey}%`
                                },
                                social_media_status: '1'
                            }
                        });
                        if (!socialMediaPlatform) {
                            socialMediaPlatform = await SocialMedia.create({
                                social_media_name: platformKey.charAt(0).toUpperCase() + platformKey.slice(1),
                                social_media_link: `https://${platformKey}.com`,
                                social_media_icon: `${platformKey}-icon.png`,
                                social_media_status: '1'
                            });
                        }
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
                            }
                        });
                        if (!created) {
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
                    }
                    else {
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
        }
        catch (error) {
            console.error('❌ Error updating user social media:', error);
            return {
                success: false,
                message: "Failed to update social media links",
                error: error.message
            };
        }
    }
    static async getUserProfile(userId, loggedInUserId = null) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return null;
            }
            const user = await User.findByPk(userId, {
                attributes: [
                    'id', 'first_name', 'last_name', 'username', 'profile_picture',
                    'email', 'followers', 'trade_transactions', 'trading_cards', 'ratings',
                    'ebay_store_url', 'created_at', 'updated_at', 'about_user', 'bio'
                ]
            });
            if (!user) {
                return null;
            }
            const cardStats = await this.getCardStats(userId);
            const reviews = await this.getReviews(userId);
            const interestedCardsCount = await this.getInterestedCardsCount(userId);
            const tradeCount = await this.getTradeCount(userId);
            const followingCount = await this.getFollowingCount(userId);
            let following = false;
            if (loggedInUserId && loggedInUserId !== userId) {
                following = await this.isFollowing(loggedInUserId, userId);
            }
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
        }
        catch (error) {
            return null;
        }
    }
    static async getCardStats(userId) {
        try {
            const { TradingCardService } = await import('./tradingcard.service.js');
            const tradingCardService = new TradingCardService();
            const allProductsResult = await tradingCardService.getAllTradingCards(1, 1, undefined, userId);
            const allProducts = allProductsResult?.count || 0;
            const ongoingTradesResult = await this.getOngoingTrades(userId, {}, 1, 100);
            const ongoingDeals = ongoingTradesResult.success ? (ongoingTradesResult.pagination?.totalCount || 0) : 0;
            const completedTradesResult = await this.getCompletedTrades(userId, {}, 1, 100);
            const successfulTrades = completedTradesResult.success ? (completedTradesResult.pagination?.totalCount || 0) : 0;
            const soldProductsResult = await this.getBoughtAndSoldProducts(userId, { trade_type: 'sold' }, 1, 100);
            const productsSold = soldProductsResult.success ? (soldProductsResult.pagination?.totalCount || 0) : 0;
            const boughtProductsResult = await this.getBoughtAndSoldProducts(userId, { trade_type: 'purchased' }, 1, 100);
            const productsBought = boughtProductsResult.success ? (boughtProductsResult.pagination?.totalCount || 0) : 0;
            return {
                'all_products': allProducts,
                'ongoing_deals': ongoingDeals,
                'successful_trades': successfulTrades,
                'products_sold': productsSold,
                'products_bought': productsBought
            };
        }
        catch (error) {
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
    static async getReviews(userId) {
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
        }
        catch (error) {
            console.error('Error fetching reviews:', error);
            return [];
        }
    }
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
    static async isFollowing(followerId, followingId) {
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
            const count = result[0]?.count || 0;
            const isFollowing = count > 0;
            return isFollowing;
        }
        catch (error) {
            console.error('Error checking following status:', error);
            return false;
        }
    }
    static async getTradeRatings(tradeProposalId) {
        try {
            if (!tradeProposalId) {
                return [];
            }
            const review = await Review.findOne({
                where: {
                    trade_proposal_id: tradeProposalId
                }
            });
            if (!review) {
                return [];
            }
            const reviewData = review.toJSON();
            const ratings = [];
            if (reviewData.trader_id && reviewData.trader_rating) {
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
            if (reviewData.user_id && reviewData.user_rating) {
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
        }
        catch (error) {
            console.error('Error getting trade ratings:', error);
            return [];
        }
    }
    static async getInterestedCategories(userId) {
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
        }
        catch (error) {
            console.error('Error getting interested categories:', error);
            return [];
        }
    }
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
    static async updateUserProfile(userId, profileData) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    message: "Valid user ID is required"
                };
            }
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }
            const { username, ...allowedFields } = profileData;
            const validationErrors = [];
            if (allowedFields.first_name !== undefined) {
                if (typeof allowedFields.first_name !== 'string') {
                    validationErrors.push('First name must be a string');
                }
                else if (allowedFields.first_name.trim().length === 0) {
                    validationErrors.push('First name cannot be empty');
                }
            }
            if (allowedFields.last_name !== undefined) {
                if (typeof allowedFields.last_name !== 'string') {
                    validationErrors.push('Last name must be a string');
                }
                else if (allowedFields.last_name.trim().length === 0) {
                    validationErrors.push('Last name cannot be empty');
                }
            }
            if (allowedFields.email !== undefined) {
                if (typeof allowedFields.email !== 'string') {
                    validationErrors.push('Email must be a string');
                }
                else if (allowedFields.email.trim().length === 0) {
                    validationErrors.push('Email cannot be empty');
                }
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedFields.email.trim())) {
                    validationErrors.push('Email format is invalid');
                }
                else {
                    const trimmedEmail = allowedFields.email.trim();
                    if (user.email !== trimmedEmail) {
                        console.log("successs===Email");
                        allowedFields.is_email_verified = "0";
                        allowedFields.email_verified_at = null;
                    }
                    const existingUser = await User.findOne({
                        where: {
                            email: trimmedEmail,
                            id: { [Op.ne]: userId }
                        }
                    });
                    if (existingUser) {
                        validationErrors.push('Email is already in use by another account');
                    }
                    else {
                    }
                }
            }
            if (allowedFields.phone_number !== undefined) {
                if (allowedFields.phone_number && typeof allowedFields.phone_number !== 'string') {
                    validationErrors.push('Phone number must be a string');
                }
                else if (allowedFields.phone_number && allowedFields.phone_number.trim().length > 0) {
                    const phoneDigits = allowedFields.phone_number.replace(/\D/g, '');
                    if (phoneDigits.length < 3) {
                        validationErrors.push('Phone number must have at least 3 digits');
                    }
                    else if (phoneDigits.length > 12) {
                        validationErrors.push('Phone number must not exceed 12 digits');
                    }
                    else if (!/^[\+]?[0-9\s\-\(\)]+$/.test(allowedFields.phone_number.trim())) {
                        validationErrors.push('Phone number contains invalid characters');
                    }
                }
            }
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors
                };
            }
            const allowedUpdateFields = [
                'first_name', 'last_name', 'email', 'is_email_verified', 'email_verified_at', 'profile_picture', 'phone_number',
                'country_code', 'about_user', 'bio', 'shipping_address',
                'shipping_city', 'shipping_state', 'shipping_zip_code',
                'ebay_store_url', 'paypal_business_email', 'is_free_shipping', "is_ebay_store_verified",
                'shipping_flat_rate'
            ];
            const filteredData = {};
            Object.keys(allowedFields).forEach(key => {
                if (allowedUpdateFields.includes(key)) {
                    if (key === 'profile_picture') {
                        if (allowedFields[key] === null || allowedFields[key] === '' || allowedFields[key] === 'null') {
                            filteredData[key] = null;
                        }
                        else {
                            filteredData[key] = allowedFields[key];
                        }
                    }
                    else {
                        if (typeof allowedFields[key] === 'string') {
                            filteredData[key] = allowedFields[key].trim();
                        }
                        else {
                            filteredData[key] = allowedFields[key];
                        }
                    }
                }
            });
            const emailUpdated = allowedFields.email !== undefined && user.email !== allowedFields.email.trim();
            try {
                await user.update(filteredData);
            }
            catch (updateError) {
                console.error('❌ Database update error:', updateError);
                console.error('❌ Update data that caused error:', filteredData);
                throw updateError;
            }
            try {
                const { EmailHelperService } = await import('./emailHelper.service.js');
                if (emailUpdated) {
                    await EmailHelperService.sendEmailUpdatedVerificationEmail(allowedFields.verifyLink, allowedFields.email.trim(), user.first_name || '', user.last_name || '', user.id);
                    console.log('✅ Email verification email sent to NEW email address:', allowedFields.email.trim());
                }
            }
            catch (emailError) {
                console.error('❌ Email sending failed:', emailError);
            }
            return {
                success: true,
                message: "Profile updated successfully",
                data: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    email: user.email,
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
                    is_ebay_store_verified: user.is_ebay_store_verified,
                    paypal_business_email: user.paypal_business_email,
                    is_free_shipping: user.is_free_shipping,
                    shipping_flat_rate: user.shipping_flat_rate,
                    updated_at: user.updatedAt
                }
            };
        }
        catch (error) {
            console.error('❌ Error updating user profile:', error);
            return {
                success: false,
                message: "Failed to update profile",
                error: error.message
            };
        }
    }
    static async getMyProfile(userId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return null;
            }
            const user = await User.findByPk(userId, {
                attributes: [
                    'id', 'first_name', 'last_name', 'username', 'profile_picture',
                    'email', 'phone_number', 'country_code', 'about_user', 'bio',
                    'shipping_address', 'shipping_city', 'shipping_state', 'shipping_zip_code',
                    'followers', 'trade_transactions', 'trading_cards', 'ratings',
                    'is_email_verified', 'email_verified_at', 'user_status', 'user_role',
                    'ebay_store_url', 'is_ebay_store_verified', 'ebay_store_verified_at',
                    'paypal_business_email', 'is_free_shipping', 'shipping_flat_rate',
                    'cxp_coins', 'credit', 'is_veteran_user', 'gmail_login',
                    'created_at', 'updated_at'
                ]
            });
            if (!user) {
                return null;
            }
            const interestedCardsCount = await this.getInterestedCardsCount(userId);
            const interestedCategories = await this.getInterestedCategories(userId);
            const socialLinks = await this.getUserSocialMedia(userId);
            const { Address } = await import('../models/index.js');
            const addressCount = await Address.count({ where: { user_id: userId, is_deleted: '0' } });
            const address_exist = addressCount > 0 ? 1 : 0;
            const userData = user.toJSON();
            const createdAtValue = userData.created_at;
            let joinedDate;
            if (createdAtValue) {
                const date = new Date(createdAtValue);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                joinedDate = `${day}-${month}-${year}`;
            }
            else {
                joinedDate = "01-01-2024";
            }
            const now = new Date().toISOString();
            const activeMembership = await MembershipUser.findOne({
                where: sequelize.and({ user_id: userId }, { status: '1' }, sequelize.or({ expired_date: null }, sequelize.where(sequelize.col('expired_date'), '>', now))),
                include: [{
                        model: Membership,
                        as: 'membership',
                        required: false
                    }],
                order: [['created_at', 'DESC']]
            });
            const membershipData = activeMembership ? {
                type: activeMembership.type,
                expired_date: activeMembership.expired_date,
                status: activeMembership.status,
                membership_id: activeMembership.membership_id,
                membership_details: activeMembership.membership
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
        }
        catch (error) {
            console.error('Error in getMyProfile:', error);
            return null;
        }
    }
    static async getTopTraders(page = 1, perPage = 10) {
        try {
            const offset = (page - 1) * perPage;
            const limit = perPage;
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
            const totalCount = countResult[0].total;
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
        }
        catch (error) {
            console.error('Error getting top traders:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get top traders'
                }
            };
        }
    }
    static async deleteUser(id) {
        const user = await User.findByPk(id);
        if (!user)
            return null;
        await User.destroy();
        return true;
    }
    static async getTradersList(page = 1, perPage = 10, excludeUserId, searchTerm) {
        try {
            const offset = (page - 1) * perPage;
            const searchQuery = searchTerm ? `%${searchTerm}%` : null;
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
          COALESCE(tc_stats.trading_cards_count, 0) AS trading_cards_count,
          COALESCE(tc_stats.active_cards_count, 0) AS active_cards_count,
          COALESCE(tc_stats.completed_trades_count, 0) AS completed_trades_count,
          CASE 
            WHEN f.id IS NOT NULL AND f.follower_status = '1' THEN 1 
            ELSE 0 
          END AS following
        FROM users u
        INNER JOIN (
          SELECT
            trader_id,
            COUNT(*) AS trading_cards_count,
            SUM(CASE WHEN is_traded = '0' AND trading_card_status = '1' AND mark_as_deleted IS NULL THEN 1 ELSE 0 END) AS active_cards_count,
            SUM(CASE WHEN is_traded = '1' THEN 1 ELSE 0 END) AS completed_trades_count
          FROM trading_cards
          WHERE mark_as_deleted IS NULL
            AND trading_card_status = '1'
            AND is_traded = '0'
            AND (can_trade = 1 OR can_buy = 1)
          GROUP BY trader_id
        ) tc_stats ON u.id = tc_stats.trader_id
        LEFT JOIN followers f ON u.id = f.trader_id 
          AND f.user_id = ${excludeUserId || 'NULL'} 
          AND f.follower_status = '1'
        WHERE u.user_status = '1'
          AND u.user_role = 'user'
          ${excludeUserId ? `AND u.id != ${excludeUserId}` : ''}
          ${searchQuery ? `AND (u.username LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search)` : ''}
        ORDER BY
          u.created_at DESC,
          tc_stats.trading_cards_count DESC
        LIMIT :perPage OFFSET :offset
      `;
            const countQuery = `
        SELECT COUNT(*) AS total
        FROM users u
        INNER JOIN (
          SELECT DISTINCT trader_id
          FROM trading_cards
          WHERE mark_as_deleted IS NULL
            AND trading_card_status = '1'
            AND is_traded = '0'
            AND (can_trade = 1 OR can_buy = 1)
        ) tc_stats ON u.id = tc_stats.trader_id
        LEFT JOIN followers f ON u.id = f.trader_id 
          AND f.user_id = ${excludeUserId || 'NULL'} 
          AND f.follower_status = '1'
        WHERE u.user_status = '1'
          AND u.user_role = 'user'
          ${excludeUserId ? `AND u.id != ${excludeUserId}` : ''}
          ${searchQuery ? `AND (u.username LIKE :search OR u.first_name LIKE :search OR u.last_name LIKE :search)` : ''}
      `;
            const replacements = {
                perPage,
                offset,
                ...(searchQuery && { search: searchQuery }),
            };
            const result = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT,
            });
            const countResult = await sequelize.query(countQuery, {
                replacements,
                type: QueryTypes.SELECT,
            });
            const total = countResult[0]?.total ?? 0;
            const tradersWithStats = await Promise.all(result.map(async (trader) => {
                const cardStats = await this.getCardStats(trader.id);
                return {
                    ...trader,
                    successful_trades: cardStats.successful_trades || 0,
                };
            }));
            return {
                data: tradersWithStats,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
                hasNextPage: page < Math.ceil(total / perPage),
                hasPrevPage: page > 1,
            };
        }
        catch (error) {
            console.error("Error getting traders list:", error);
            return {
                data: [],
                total: 0,
                page: 1,
                perPage: 10,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
            };
        }
    }
    static async toggleFollow(traderId, userId) {
        try {
            if (traderId === userId) {
                throw new Error("Cannot follow yourself");
            }
            const existingFollower = await Follower.findOne({
                where: {
                    trader_id: traderId,
                    user_id: userId
                }
            });
            const trader = await User.findByPk(traderId);
            if (!trader) {
                throw new Error("Trader not found");
            }
            let response = {
                status: 'success',
                follower: null
            };
            if (existingFollower && existingFollower.id > 0) {
                await Follower.destroy({
                    where: {
                        trader_id: traderId,
                        user_id: userId
                    }
                });
                await trader.update({
                    followers: Math.max(0, (trader.followers || 0) - 1)
                });
                response.sub_status = false;
                response.follower = existingFollower;
            }
            else {
                const newFollower = await Follower.create({
                    trader_id: traderId,
                    user_id: userId,
                    follower_status: '1'
                });
                await trader.update({
                    followers: (trader.followers ?? 0) + 1
                });
                response.sub_status = true;
                response.follower = newFollower;
            }
            return response;
        }
        catch (error) {
            console.error('Error in toggleFollow:', error);
            throw error;
        }
    }
    static async getLikesAndFollowing(userId, page, perPage) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { favoriteProducts: [], followingUsers: [], pagination: null };
            }
            const hasPagination = page !== undefined && perPage !== undefined;
            const pageNum = hasPagination ? page : 1;
            const perPageNum = hasPagination ? perPage : 10;
            const offset = (pageNum - 1) * perPageNum;
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
            const total = totalResult[0].total;
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
            if (hasPagination) {
                query += ` LIMIT :limit OFFSET :offset`;
            }
            const replacements = { userId };
            if (hasPagination) {
                replacements.limit = perPageNum;
                replacements.offset = offset;
            }
            const result = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });
            const products = result.map((card) => {
                let canTradeOrOffer = true;
                if (card.trader_id === userId) {
                    canTradeOrOffer = false;
                }
                if (card.is_traded === '1') {
                    canTradeOrOffer = false;
                }
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
            const transformedFollowingUsers = followingUsers.map((user) => ({
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
        }
        catch (error) {
            console.error('Error getting favorite products:', error);
            throw error;
        }
    }
    static async getCoinPurchaseHistory(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { purchases: [], pagination: null };
            }
            const offset = (page - 1) * perPage;
            const totalCount = await CreditPurchaseLog.count({
                where: { user_id: userId }
            });
            const purchases = await CreditPurchaseLog.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']],
                limit: perPage,
                offset: offset
            });
            const transformedPurchases = purchases.map((purchase) => ({
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
        }
        catch (error) {
            console.error('Error getting coin purchase history:', error);
            throw error;
        }
    }
    static async getCoinDeductionHistory(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { deductions: [], pagination: null };
            }
            const offset = (page - 1) * perPage;
            const totalCount = await CreditDeductionLog.count({
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
            const transformedDeductions = deductions.map((deduction) => ({
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
        }
        catch (error) {
            console.error('Error getting coin deduction history:', error);
            throw error;
        }
    }
    static async getCoinTransactionHistory(userId, type, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { transactions: [], pagination: null };
            }
            if (!['purchase', 'deduction', 'all'].includes(type)) {
                throw new Error('Invalid type parameter. Must be "purchase", "deduction", or "all"');
            }
            const offset = (page - 1) * perPage;
            let transactions = [];
            let totalCount = 0;
            if (type === 'purchase' || type === 'all') {
                const purchaseCount = await CreditPurchaseLog.count({
                    where: { user_id: userId }
                });
                const purchases = await CreditPurchaseLog.findAll({
                    where: { user_id: userId },
                    order: [['created_at', 'DESC']],
                    limit: type === 'all' ? perPage : perPage,
                    offset: type === 'all' ? offset : offset
                });
                const transformedPurchases = purchases.map((purchase) => ({
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
                }
                else {
                    transactions = [...transformedPurchases];
                    totalCount += purchaseCount;
                }
            }
            if (type === 'deduction' || type === 'all') {
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
                const transformedDeductions = deductions.map((deduction) => ({
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
                }
                else {
                    transactions = [...transactions, ...transformedDeductions];
                    totalCount += deductionCount;
                }
            }
            if (type === 'all') {
                transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                transactions = transactions.slice(offset, offset + perPage);
            }
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
        }
        catch (error) {
            console.error('Error getting coin transaction history:', error);
            throw error;
        }
    }
    static async getPayPalTransactions(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { coinPurchaseHistory: [], coinDeductionHistory: [], pagination: null };
            }
            const offset = (page - 1) * perPage;
            const totalPurchaseCount = await CreditPurchaseLog.count({
                where: { user_id: userId }
            });
            const purchases = await CreditPurchaseLog.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']],
                limit: perPage,
                offset: offset
            });
            const transformedPurchases = purchases.map((purchase) => ({
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
            const transformedDeductions = deductions.map((deduction) => ({
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
        }
        catch (error) {
            console.error('Error getting PayPal transactions:', error);
            throw error;
        }
    }
    static async getShipmentLog(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const offset = (page - 1) * perPage;
            const limit = perPage;
            const totalCount = await Shipment.count({
                where: {
                    user_id: userId,
                    tracking_id: {
                        [Op.ne]: null
                    }
                }
            });
            const shipments = await Shipment.findAll({
                where: {
                    user_id: userId,
                    tracking_id: {
                        [Op.ne]: null
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
            const transformedShipments = shipments.map((shipment) => {
                const shipmentData = shipment.toJSON();
                let rateCondition = null;
                let finalRate = null;
                let itemLabel = null;
                let insured = false;
                if (shipmentData.selected_rate && shipmentData.shipment_response) {
                    try {
                        let shipmentResponse;
                        if (typeof shipmentData.shipment_response === 'string') {
                            const trimmedResponse = shipmentData.shipment_response.trim();
                            if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
                                shipmentResponse = JSON.parse(shipmentData.shipment_response);
                            }
                            else {
                                shipmentResponse = null;
                            }
                        }
                        else {
                            shipmentResponse = shipmentData.shipment_response;
                        }
                        if (shipmentResponse && shipmentResponse.rates && Array.isArray(shipmentResponse.rates)) {
                            const desiredRate = shipmentResponse.rates.find((rate) => rate.id === shipmentData.selected_rate);
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
                                finalRate = desiredRate.rate || desiredRate.retail_rate || desiredRate.list_rate || null;
                            }
                        }
                    }
                    catch (error) {
                        console.error('Error parsing shipment_response:', error);
                        console.error('Shipment response content:', shipmentData.shipment_response);
                    }
                }
                if (shipmentData.postage_label) {
                    try {
                        let postageLabel;
                        if (typeof shipmentData.postage_label === 'string') {
                            const trimmedLabel = shipmentData.postage_label.trim();
                            if (trimmedLabel.startsWith('{') || trimmedLabel.startsWith('[')) {
                                postageLabel = JSON.parse(shipmentData.postage_label);
                            }
                            else {
                                itemLabel = shipmentData.postage_label;
                                postageLabel = null;
                            }
                        }
                        else {
                            postageLabel = shipmentData.postage_label;
                        }
                        if (postageLabel) {
                            if (Array.isArray(postageLabel)) {
                                if (postageLabel.length > 0 && postageLabel[0] && postageLabel[0].object) {
                                    itemLabel = postageLabel.map(item => item.object).join(' | ');
                                }
                            }
                            else if (postageLabel && postageLabel.object) {
                                itemLabel = postageLabel.object;
                            }
                        }
                    }
                    catch (error) {
                        console.error('Error parsing postage_label:', error);
                        console.error('Postage label content:', shipmentData.postage_label);
                        itemLabel = typeof shipmentData.postage_label === 'string'
                            ? shipmentData.postage_label
                            : null;
                    }
                }
                if (shipmentData.is_insured === 1) {
                    insured = true;
                }
                else if (shipmentData.is_insured === 0 || shipmentData.is_insured === null) {
                    insured = false;
                }
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
        }
        catch (error) {
            console.error('Error getting shipment log:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get shipment log'
                }
            };
        }
    }
    static async trackShipment(trackingId) {
        try {
            const apiKey = process.env.EASYPOST_API_KEY;
            const apiMode = process.env.EASYPOST_MODE;
            if (!apiKey) {
                throw new Error('EasyPost API key not configured');
            }
            let finalTrackingId = trackingId;
            if (apiMode === 'test') {
                finalTrackingId = 'EZ2000000002';
            }
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
                let trackingData = {};
                if (responseData.tracking_details && responseData.tracking_details.length > 0) {
                    responseData.tracking_details.forEach((details) => {
                        const trackingLocation = [];
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
            }
            else {
                return {
                    success: false,
                    error: responseData
                };
            }
        }
        catch (error) {
            console.error('Error tracking shipment:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to track shipment'
                }
            };
        }
    }
    static async getShippingLabel(trackingId) {
        try {
            const apiKey = process.env.EASYPOST_API_KEY;
            if (!apiKey) {
                throw new Error('EasyPost API key not configured');
            }
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
            if (!shipment.shipment_response) {
                return {
                    success: false,
                    error: {
                        message: 'Shipment response not available'
                    }
                };
            }
            let shipmentResponse;
            try {
                shipmentResponse = typeof shipment.shipment_response === 'string'
                    ? JSON.parse(shipment.shipment_response)
                    : shipment.shipment_response;
            }
            catch (parseError) {
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
            }
            else {
                return {
                    success: false,
                    error: responseData
                };
            }
        }
        catch (error) {
            console.error('Error getting shipping label:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get shipping label'
                }
            };
        }
    }
    static async getCategoryLog(userId, categoryId, specificId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const categories = await Category.findAll({
                where: {
                    grades_ungraded_status: true
                },
                attributes: ['id', 'category_name', 'grades_ungraded_status']
            });
            let whereClause = {
                user_id: userId
            };
            if (categoryId && !isNaN(categoryId) && categoryId > 0) {
                whereClause.category_id = categoryId;
            }
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
        }
        catch (error) {
            console.error('Error getting category log:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get category log'
                }
            };
        }
    }
    static async getCategoryShippingRateHistory(userId, categoryId, specificId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            let categories = await Category.findAll({
                where: {
                    grades_ungraded_status: true
                },
                attributes: ['id', 'sport_name']
            });
            categories = categories.filter((c) => String(c.sport_name).trim() !== 'Sports Memorabilia');
            let whereClause = {
                user_id: userId
            };
            if (categoryId && !isNaN(categoryId) && categoryId > 0) {
                whereClause.category_id = categoryId;
            }
            let shippingRates = [];
            let flattenedShippingRates = [];
            let totalCount = 0;
            let totalPages = 0;
            let hasNextPage = false;
            let hasPrevPage = false;
            if (!specificId || isNaN(specificId) || specificId <= 0) {
                const offset = (page - 1) * perPage;
                const limit = perPage;
                totalCount = await CategoryShippingRate.count({
                    where: whereClause
                });
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
                flattenedShippingRates = shippingRates.map((rate) => {
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
                totalPages = Math.ceil(totalCount / perPage);
                hasNextPage = page < totalPages;
                hasPrevPage = page > 1;
            }
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
                const rateData = specificRate.toJSON();
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
        }
        catch (error) {
            console.error('Error getting category shipping rate history:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get category shipping rate history'
                }
            };
        }
    }
    static async updateCategoryShippingRate(userId, rateId, updateData) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!rateId || isNaN(rateId) || rateId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid rate ID is required'
                    }
                };
            }
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
            const allowedFields = ['category_id', 'usa_rate', 'canada_rate'];
            const updateFields = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updateFields[field] = updateData[field];
                }
            }
            if (Object.keys(updateFields).length === 0) {
                return {
                    success: false,
                    error: {
                        message: 'No valid fields provided for update'
                    }
                };
            }
            await CategoryShippingRate.update(updateFields, {
                where: {
                    id: rateId,
                    user_id: userId
                }
            });
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
            const rateData = updatedRate?.toJSON();
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
        }
        catch (error) {
            console.error('Error updating category shipping rate:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to update category shipping rate'
                }
            };
        }
    }
    static async createCategoryShippingRate(userId, createData) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const requiredFields = ['category_id', 'usa_rate', 'canada_rate'];
            const missingFields = requiredFields.filter(field => createData[field] === undefined || createData[field] === null || createData[field] === '');
            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: {
                        message: `Required fields are missing: ${missingFields.join(', ')}`
                    }
                };
            }
            if (!createData.category_id || isNaN(createData.category_id) || createData.category_id <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid category ID is required'
                    }
                };
            }
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
            const newRate = await CategoryShippingRate.create({
                user_id: userId,
                category_id: parseInt(createData.category_id),
                usa_rate: parseFloat(createData.usa_rate),
                canada_rate: parseFloat(createData.canada_rate)
            });
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
            const rateData = createdRate?.toJSON();
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
        }
        catch (error) {
            console.error('Error creating category shipping rate:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to create category shipping rate'
                }
            };
        }
    }
    static async deleteCategoryShippingRate(userId, shippingRateId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!shippingRateId || isNaN(shippingRateId) || shippingRateId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid shipping rate ID is required'
                    }
                };
            }
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
            await shippingCategory.destroy();
            return {
                success: true,
                message: 'Category deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting category shipping rate:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to delete category shipping rate'
                }
            };
        }
    }
    static async getAddresses(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const offset = (page - 1) * perPage;
            const limit = perPage;
            const totalCount = await Address.count({
                where: {
                    user_id: userId,
                    is_deleted: '0'
                }
            });
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
        }
        catch (error) {
            console.error('Error getting addresses:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get addresses'
                }
            };
        }
    }
    static async getAddressById(userId, addressId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!addressId || isNaN(addressId) || addressId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid address ID is required'
                    }
                };
            }
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
        }
        catch (error) {
            console.error('Error getting address by ID:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get address'
                }
            };
        }
    }
    static async createAddress(userId, addressData) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const requiredFields = ['name', 'phone', 'email', 'street1', 'city', 'state', 'country', 'zip'];
            const missingFields = requiredFields.filter(field => !addressData[field] || addressData[field].toString().trim() === '');
            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: {
                        message: `Required fields are missing: ${missingFields.join(', ')}`
                    }
                };
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(addressData.email)) {
                return {
                    success: false,
                    error: {
                        message: 'Valid email address is required'
                    }
                };
            }
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(addressData.phone.replace(/[\s\-\(\)]/g, ''))) {
                return {
                    success: false,
                    error: {
                        message: 'Valid phone number is required'
                    }
                };
            }
            const { Address } = await import('../models/index.js');
            await Address.update({ mark_default: 2 }, { where: { user_id: userId } });
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
                mark_default: 1
            });
            return {
                success: true,
                data: {
                    message: 'Address created successfully',
                    address: newAddress
                }
            };
        }
        catch (error) {
            console.error('Error creating address:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to create address'
                }
            };
        }
    }
    static async updateAddress(userId, addressId, updateData) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!addressId || isNaN(addressId) || addressId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid address ID is required'
                    }
                };
            }
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
            if (updateData.mark_default === 1) {
                await Address.update({ mark_default: 2 }, { where: { user_id: userId } });
            }
            const allowedFields = [
                'name', 'phone', 'email', 'street1', 'street2', 'city', 'state',
                'country', 'zip', 'is_sender', 'latitude', 'longitude', 'adr_id', 'mark_default'
            ];
            const updateFields = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (field === 'street2' && updateData[field] === '') {
                        updateFields[field] = null;
                    }
                    else if (field === 'latitude' || field === 'longitude') {
                        updateFields[field] = updateData[field] ? parseFloat(updateData[field]) : null;
                    }
                    else if (typeof updateData[field] === 'string') {
                        updateFields[field] = updateData[field].trim();
                    }
                    else {
                        updateFields[field] = updateData[field];
                    }
                }
            }
            if (Object.keys(updateFields).length === 0) {
                return {
                    success: false,
                    error: {
                        message: 'No valid fields provided for update'
                    }
                };
            }
            await Address.update(updateFields, {
                where: {
                    id: addressId,
                    user_id: userId
                }
            });
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
        }
        catch (error) {
            console.error('Error updating address:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to update address'
                }
            };
        }
    }
    static async deleteAddress(userId, addressId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!addressId || isNaN(addressId) || addressId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid address ID is required'
                    }
                };
            }
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
            await Address.update({ is_deleted: '1' }, { where: { id: addressId, user_id: userId } });
            return {
                success: true,
                data: {
                    message: 'Address deleted successfully'
                }
            };
        }
        catch (error) {
            console.error('Error deleting address:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to delete address'
                }
            };
        }
    }
    static async markAddressAsDefault(userId, addressId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!addressId || isNaN(addressId) || addressId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid address ID is required'
                    }
                };
            }
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
            await Address.update({ mark_default: 2 }, { where: { user_id: userId } });
            await Address.update({ mark_default: 1 }, { where: { id: addressId, user_id: userId } });
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
        }
        catch (error) {
            console.error('Error marking address as default:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to mark address as default'
                }
            };
        }
    }
    static async getBoughtAndSoldProducts(userId, filters = {}, page = 1, perPage = 5) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return { success: false, error: { message: 'Valid user ID is required' } };
            }
            let whereClause = { id: { [Op.ne]: 0 } };
            let requestData = 'all';
            const filterData = {};
            if (filters.trade_type === 'purchased') {
                whereClause.buyer = userId;
                whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
                requestData = 'purchased';
            }
            else if (filters.trade_type === 'sold') {
                whereClause.seller = userId;
                whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
                requestData = 'sold';
            }
            else if (filters.trade_type === 'cancelled') {
                whereClause.buying_status = { [Op.in]: ['declined', 'cancelled'] };
                requestData = 'cancelled';
            }
            else {
                whereClause[Op.or] = [{ buyer: userId }, { seller: userId }];
                whereClause.buying_status = { [Op.notIn]: ['declined', 'cancelled'] };
            }
            if (filters.id && filters.id > 0)
                whereClause.id = filters.id;
            if (filters.buy_sell_id && filters.buy_sell_id > 0)
                whereClause.id = filters.buy_sell_id;
            if (filters.code && filters.code.trim() !== '')
                whereClause.code = { [Op.like]: `%${filters.code}%` };
            if (filters.status_id && filters.status_id > 0)
                whereClause.buy_offer_status_id = filters.status_id;
            const offset = (page - 1) * perPage;
            const limit = perPage;
            const totalCount = await BuySellCard.count({ where: whereClause });
            const buySellCards = await BuySellCard.findAll({
                where: whereClause,
                include: [
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
                ],
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
                limit,
                offset
            });
            const transformedBuySellCards = await Promise.all(buySellCards.map(async (card) => {
                const cardData = card.toJSON();
                let seller_name = cardData.sellerUser
                    ? cardData.sellerUser.username ||
                        `${cardData.sellerUser.first_name || ''} ${cardData.sellerUser.last_name || ''}`.trim()
                    : null;
                let buyer_name = cardData.buyerUser
                    ? cardData.buyerUser.username ||
                        `${cardData.buyerUser.first_name || ''} ${cardData.buyerUser.last_name || ''}`.trim()
                    : null;
                const shipments = await Shipment.findAll({
                    where: { buy_sell_id: cardData.id },
                    attributes: ['id', 'user_id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'cron_shipment_date', 'created_at'],
                    order: [['created_at', 'DESC']]
                });
                const shipmentDetail = shipments.map((shipment) => ({
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
                let tradingCardData = null;
                if (cardData.main_card === 0) {
                    const buyOfferProducts = await BuyOfferProduct.findAll({
                        where: { buy_sell_id: cardData.id },
                        include: [
                            {
                                model: TradingCard,
                                as: 'tradingCard',
                                attributes: ['id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 'search_param', 'category_id', 'title'],
                                required: false
                            }
                        ]
                    });
                    tradingCardData = await Promise.all(buyOfferProducts.map(async (bop) => {
                        const bopData = bop.toJSON();
                        let category_name = null;
                        if (bopData.tradingCard && bopData.tradingCard.category_id) {
                            const category = await Category.findByPk(bopData.tradingCard.category_id);
                            category_name = category ? category.sport_name : null;
                        }
                        return {
                            id: bopData.tradingCard?.id || null,
                            trading_card_img: bopData.tradingCard?.trading_card_img || null,
                            trading_card_slug: bopData.tradingCard?.trading_card_slug || null,
                            trading_card_asking_price: bopData.tradingCard?.trading_card_asking_price || 0,
                            search_param: bopData.tradingCard?.search_param || null,
                            title: bopData.tradingCard?.title || null,
                            category_name
                        };
                    }));
                }
                else if (cardData.main_card) {
                    const mainTradingCard = await TradingCard.findByPk(cardData.main_card);
                    if (mainTradingCard) {
                        const category = await Category.findByPk(mainTradingCard.category_id);
                        const category_name = category ? category.sport_name : null;
                        tradingCardData = [
                            {
                                id: mainTradingCard.id,
                                trading_card_img: mainTradingCard.trading_card_img,
                                trading_card_slug: mainTradingCard.trading_card_slug,
                                trading_card_asking_price: mainTradingCard.trading_card_asking_price,
                                search_param: mainTradingCard.search_param,
                                title: mainTradingCard.title,
                                category_name
                            }
                        ];
                    }
                }
                return {
                    id: cardData.id,
                    code: cardData.code,
                    seller: cardData.seller,
                    buyer: cardData.buyer,
                    seller_name,
                    buyer_name,
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
                    buy_offer_status: cardData.buyOfferStatus
                        ? {
                            id: cardData.buyOfferStatus.id,
                            to_sender: cardData.buyOfferStatus.to_sender,
                            to_receiver: cardData.buyOfferStatus.to_receiver
                        }
                        : null,
                    shipmentDetail,
                    tradingCards: tradingCardData,
                    payment_detail: {
                        products_offer_amount: cardData.products_offer_amount || 0,
                        shipment_amount: cardData.shipment_amount || 0,
                        total_amount: cardData.total_amount || 0,
                        paid_amount: cardData.paid_amount || 0
                    },
                    ratings: (() => {
                        const ratingsArr = [];
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
            const totalPages = Math.ceil(totalCount / perPage);
            return {
                success: true,
                data: {
                    buySellCards: transformedBuySellCards,
                    requestData,
                    filterData
                },
                pagination: {
                    currentPage: page,
                    perPage,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error getting bought and sold products:', error);
            return { success: false, error: { message: error.message || 'Failed to get bought and sold products' } };
        }
    }
    static async getOngoingTrades(userId, filters = {}, page = 1, perPage = 5) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            let whereClause = {
                trade_status: { [Op.notIn]: ['cancel', 'declined', 'counter_declined', 'complete'] },
                [Op.or]: [
                    { trade_sent_by: userId },
                    { trade_sent_to: userId }
                ]
            };
            const filterData = {};
            if (filters.filter === 'partially_completed') {
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
                delete whereClause[Op.or];
                filterData.filter = 'partially_completed';
            }
            else {
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
                delete whereClause[Op.or];
            }
            if (filters.id && filters.id > 0) {
                whereClause.id = filters.id;
            }
            if (filters.trade_id && filters.trade_id > 0) {
                whereClause.id = filters.trade_id;
            }
            if (filters.trade_id && filters.trade_id > 0) {
                whereClause.id = filters.trade_id;
                filterData.trade_id = filters.trade_id;
            }
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                filterData.trade_with = filters.trade_with;
            }
            if (filters.code && filters.code.trim() !== '') {
                whereClause.code = { [Op.like]: `%${filters.code}%` };
                filterData.code = filters.code;
            }
            if (filters.trade_type === 'sent') {
                whereClause.trade_sent_by = userId;
                filterData.trade_type = 'sent';
            }
            else if (filters.trade_type === 'received') {
                whereClause.trade_sent_to = userId;
                filterData.trade_type = 'received';
            }
            if (filters.status_id && filters.status_id > 0) {
                whereClause.trade_proposal_status_id = filters.status_id;
                filterData.status_id = filters.status_id;
            }
            if (filters.from_date && filters.from_date.trim() !== '') {
                try {
                    const fromDate = new Date(filters.from_date);
                    if (!isNaN(fromDate.getTime())) {
                        fromDate.setHours(0, 0, 0, 0);
                        whereClause.created_at = { [Op.gte]: fromDate };
                        filterData.from_date = filters.from_date;
                    }
                }
                catch (error) {
                    console.error('Invalid from_date format:', filters.from_date);
                }
            }
            if (filters.to_date && filters.to_date.trim() !== '') {
                try {
                    const toDate = new Date(filters.to_date);
                    if (!isNaN(toDate.getTime())) {
                        toDate.setHours(23, 59, 59, 999);
                        if (whereClause.created_at) {
                            whereClause.created_at[Op.lte] = toDate;
                        }
                        else {
                            whereClause.created_at = { [Op.lte]: toDate };
                        }
                        filterData.to_date = filters.to_date;
                    }
                }
                catch (error) {
                    console.error('Invalid to_date format:', filters.to_date);
                }
            }
            const offset = (page - 1) * perPage;
            const limit = perPage;
            const totalCount = await TradeProposal.count({
                where: whereClause
            });
            const includes = [
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
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                const tradeWithPattern = `%${filters.trade_with}%`;
                includes[1].where = { username: { [Op.like]: tradeWithPattern } };
                includes[1].required = true;
            }
            const ongoingTrades = await TradeProposal.findAll({
                where: whereClause,
                include: includes,
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            });
            const transformedOngoingTrades = await Promise.all(ongoingTrades.map(async (trade) => {
                const tradeData = trade.toJSON();
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
                const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards);
                const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards);
                let finalSendCards = sendCardsDetails;
                let finalReceiveCards = receiveCardsDetails;
                if (tradeData.trade_sent_by === userId) {
                    finalSendCards = sendCardsDetails;
                    finalReceiveCards = receiveCardsDetails;
                }
                else if (tradeData.trade_sent_to === userId) {
                    finalSendCards = receiveCardsDetails;
                    finalReceiveCards = sendCardsDetails;
                }
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
                        user_message: tradeData.trade_sent_by === userId
                            ? tradeData.tradeProposalStatus.to_sender
                            : tradeData.tradeProposalStatus.to_receiver,
                        user_role: tradeData.trade_sent_by === userId ? 'sender' : 'receiver'
                    } : null,
                    shipmenttrader: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 ?
                        tradeData.shipmenttrader.filter((shipment) => shipment.user_id !== userId).map((shipment) => ({
                            id: shipment.id,
                            tracking_id: shipment.tracking_id,
                            shipment_status: shipment.shipment_status,
                            estimated_delivery_date: shipment.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipment.estimated_delivery_date) : null,
                            paymentId: shipment.paymentId || null,
                            selected_rate: shipment.selected_rate || null
                        }))[0] || null : null,
                    shipmentself: tradeData.shipmentself && tradeData.shipmentself.length > 0 ?
                        tradeData.shipmentself.filter((shipment) => shipment.user_id === userId).map((shipment) => ({
                            id: shipment.id,
                            tracking_id: shipment.tracking_id || null,
                            shipment_status: shipment.shipment_status,
                            estimated_delivery_date: shipment.estimated_delivery_date ? UserService.formatDateToMMDDYY(shipment.estimated_delivery_date) : (shipment.cron_shipment_date ? UserService.formatDateToMMDDYY(shipment.cron_shipment_date) : null),
                            paymentId: shipment.paymentId || null,
                            selected_rate: shipment.selected_rate || null
                        }))[0] || null : null,
                    tracking_id_self: tradeData.shipmentself && tradeData.shipmentself.length > 0 ?
                        tradeData.shipmentself.filter((shipment) => shipment.user_id === userId)[0]?.tracking_id || null : null,
                    tracking_id: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 ?
                        (tradeData.shipmenttrader.filter((shipment) => shipment.user_id !== userId)[0]?.tracking_id ||
                            tradeData.shipmentself.filter((shipment) => shipment.user_id === userId)[0]?.tracking_id || null) : null,
                    has_shipment_trader: tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 &&
                        tradeData.shipmenttrader.some((shipment) => shipment.user_id !== userId),
                    has_shipment_self: tradeData.shipmentself && tradeData.shipmentself.length > 0 &&
                        tradeData.shipmentself.some((shipment) => shipment.user_id === userId),
                    has_any_shipment: (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 &&
                        tradeData.shipmenttrader.some((shipment) => shipment.user_id !== userId)) ||
                        (tradeData.shipmentself && tradeData.shipmentself.length > 0 &&
                            tradeData.shipmentself.some((shipment) => shipment.user_id === userId)),
                    shipment_status_message: (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0) || (tradeData.shipmentself && tradeData.shipmentself.length > 0)
                        ? "Shipment information available"
                        : (tradeData.trade_sender_track_id || tradeData.trade_receiver_track_id || tradeData.admin_sender_track_id || tradeData.admin_receiver_track_id)
                            ? "Tracking information available from trade proposal"
                            : "Shipment pending - tracking information will be available once shipment is initiated",
                    payment_detail: {
                        products_offer_amount: tradeData.add_cash || 0,
                        shipment_amount: tradeData.proxy_fee_amt || 0,
                        total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
                        paid_amount: tradeData.trade_amount_amount ? parseFloat(tradeData.trade_amount_amount) : 0,
                        amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
                    }
                };
            }));
            const totalPages = Math.ceil(totalCount / perPage);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;
            return {
                success: true,
                data: {
                    ongoing_trades: transformedOngoingTrades,
                    buy_sel_cards: [],
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
        }
        catch (error) {
            console.error('Error getting ongoing trades:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get ongoing trades'
                }
            };
        }
    }
    static getTradeButtonActions(tradeData, userId) {
        const actions = {
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
        const hasTrackingId = (tradeData.shipmenttrader && tradeData.shipmenttrader.length > 0 && tradeData.shipmenttrader[0].tracking_id) ||
            (tradeData.shipmentself && tradeData.shipmentself.length > 0 && tradeData.shipmentself[0].tracking_id);
        const hasPayment = tradeAmountPaidOn && (askCash > 0 || addCash > 0);
        const canCancelTrade = !hasTrackingId && !hasPayment && tradeData.is_payment_init === 0;
        if (isSender) {
            actions.showSentBadge = true;
        }
        else if (isReceiver) {
            actions.showReceivedBadge = true;
        }
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
                }
                else {
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
        }
        else if (tradeStatus === 'counter_offer') {
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
                }
                else {
                    actions.showAcceptButton = true;
                    actions.buttonText = 'Accept Counter Offer';
                    actions.buttonClass = 'light-grey-bg-black-text-btn';
                    actions.buttonAction = 'chngtrade_status';
                    actions.canAccept = true;
                }
                actions.showDeclineButton = true;
                actions.canDecline = true;
            }
            else if (isReceiver) {
                actions.showCancelButton = true;
                actions.canCancel = true;
            }
        }
        else if (tradeStatus === 'accepted' || tradeStatus === 'counter_accepted') {
            actions.showViewButton = true;
            actions.buttonText = 'VIEW';
            actions.buttonClass = 'counter-btn';
            actions.buttonAction = 'viewtrade';
            if ((tradeStatus === 'accepted' && askCash > 0 && !tradeAmountPaidOn) ||
                (tradeStatus === 'counter_accepted' && addCash > 0 && !tradeAmountPaidOn)) {
                actions.showPaymentButton = true;
                actions.buttonText = 'Pay to Continue Trade';
                actions.buttonClass = 'light-grey-bg-black-text-btn';
                actions.buttonAction = 'chngtrade_status_confirm_pay_ow';
                actions.canPay = true;
            }
            else {
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
        }
        else if (tradeStatus === 'complete') {
            if (senderConfirmation === '1' && receiverConfirmation === '1') {
                actions.showViewButton = true;
                actions.buttonText = 'COMPLETED';
                actions.buttonClass = 'btn-primary';
                actions.buttonAction = 'viewtrade';
            }
            else {
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
                    }
                    else {
                        actions.showViewButton = true;
                        actions.buttonText = 'Trade Marked Completed';
                        actions.buttonClass = 'btn-dark';
                        actions.buttonAction = 'viewtrade';
                    }
                }
            }
        }
        else if (tradeStatus === 'cancel' || tradeStatus === 'declined' || tradeStatus === 'counter_declined') {
            actions.showViewButton = true;
            actions.buttonText = 'VIEW';
            actions.buttonClass = 'counter-btn';
            actions.buttonAction = 'viewtrade';
        }
        if (canCancelTrade) {
            if (isSender) {
                if (tradeStatus === 'counter_offer') {
                    actions.showDeclineButton = true;
                    actions.canDecline = true;
                    actions.declineText = 'Decline Offer';
                }
                else {
                    actions.showCancelButton = true;
                    actions.canCancel = true;
                    actions.cancelText = 'Cancel Trade';
                }
            }
            else if (isReceiver) {
                if (tradeStatus === 'counter_offer') {
                    actions.showCancelButton = true;
                    actions.canCancel = true;
                    actions.cancelText = 'Cancel Offer';
                }
                else {
                    actions.showDeclineButton = true;
                    actions.canDecline = true;
                    actions.declineText = 'Decline Trade';
                }
            }
        }
        return actions;
    }
    static async getTradeDetail(tradeId, userId, cardId = null) {
        try {
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
            if (tradeData.trade_sent_by !== userId && tradeData.trade_sent_to !== userId) {
                return {
                    success: false,
                    error: {
                        message: 'Access denied to this trade'
                    }
                };
            }
            const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards || '');
            const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards || '');
            let finalSendCards = sendCardsDetails;
            let finalReceiveCards = receiveCardsDetails;
            if (tradeData.trade_sent_by === userId) {
                finalSendCards = sendCardsDetails;
                finalReceiveCards = receiveCardsDetails;
            }
            else if (tradeData.trade_sent_to === userId) {
                finalSendCards = receiveCardsDetails;
                finalReceiveCards = sendCardsDetails;
            }
            let tradeProposalStatus = '';
            if (tradeData.tradeProposalStatus) {
                if (tradeData.trade_sent_by === userId) {
                    tradeProposalStatus = tradeData.tradeProposalStatus.to_sender;
                }
                else if (tradeData.trade_sent_to === userId) {
                    tradeProposalStatus = tradeData.tradeProposalStatus.to_receiver;
                }
            }
            const buttonActions = UserService.getTradeButtonActions(tradeData, userId);
            const shipments = await Shipment.findAll({
                where: { trade_id: tradeId },
                include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture'],
                        required: false
                    }]
            });
            const transformedShipments = shipments.map((shipment) => {
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
                tradereceivername: tradeData.tradeReceiver ? {
                    id: tradeData.tradeReceiver.id,
                    username: tradeData.tradeReceiver.username,
                    first_name: tradeData.tradeReceiver.first_name,
                    last_name: tradeData.tradeReceiver.last_name,
                    profile_picture: tradeData.tradeReceiver.profile_picture
                } : null,
                tradesendername: tradeData.tradeSender ? {
                    id: tradeData.tradeSender.id,
                    username: tradeData.tradeSender.username,
                    first_name: tradeData.tradeSender.first_name,
                    last_name: tradeData.tradeSender.last_name,
                    profile_picture: tradeData.tradeSender.profile_picture
                } : null,
                trade_proposal_status: tradeData.tradeProposalStatus ? {
                    id: tradeData.tradeProposalStatus.id,
                    alias: tradeData.tradeProposalStatus.alias,
                    name: tradeData.tradeProposalStatus.name,
                    to_sender: tradeData.tradeProposalStatus.to_sender,
                    to_receiver: tradeData.tradeProposalStatus.to_receiver
                } : null,
                shipments: transformedShipments,
                buttonActions: buttonActions,
                tradeProposalStatus: tradeProposalStatus
            };
            return {
                success: true,
                data: responseData
            };
        }
        catch (error) {
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
    static async getCancelledTrades(userId, filters = {}, page = 1, perPage = 5) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            let whereClause = {
                trade_status: { [Op.in]: ['declined', 'cancel', 'counter_declined'] },
                [Op.or]: [
                    { trade_sent_by: userId },
                    { trade_sent_to: userId }
                ]
            };
            const filterData = {};
            if (filters.id && filters.id > 0) {
                whereClause.id = filters.id;
            }
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                filterData.trade_with = filters.trade_with;
            }
            if (filters.code && filters.code.trim() !== '') {
                whereClause.code = { [Op.like]: `%${filters.code}%` };
                filterData.code = filters.code;
            }
            if (filters.trade_type === 'sent') {
                whereClause.trade_sent_by = userId;
                filterData.trade_type = 'sent';
            }
            else if (filters.trade_type === 'received') {
                whereClause.trade_sent_to = userId;
                filterData.trade_type = 'received';
            }
            if (filters.from_date && filters.from_date.trim() !== '') {
                try {
                    const fromDate = new Date(filters.from_date);
                    whereClause.created_at = { [Op.gte]: fromDate };
                    filterData.from_date = filters.from_date;
                }
                catch (error) {
                    console.error('Invalid from_date format:', filters.from_date);
                }
            }
            if (filters.to_date && filters.to_date.trim() !== '') {
                try {
                    const toDate = new Date(filters.to_date);
                    toDate.setHours(23, 59, 59, 999);
                    if (whereClause.created_at) {
                        whereClause.created_at[Op.lte] = toDate;
                    }
                    else {
                        whereClause.created_at = { [Op.lte]: toDate };
                    }
                    filterData.to_date = filters.to_date;
                }
                catch (error) {
                    console.error('Invalid to_date format:', filters.to_date);
                }
            }
            const limit = perPage;
            const offset = (page - 1) * perPage;
            const totalCount = await TradeProposal.count({
                where: whereClause
            });
            const includes = [
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
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                const tradeWithPattern = `%${filters.trade_with}%`;
                includes[1].where = { username: { [Op.like]: tradeWithPattern } };
                includes[1].required = true;
            }
            const cancelledTrades = await TradeProposal.findAll({
                where: whereClause,
                include: includes,
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            });
            const transformedCancelledTrades = await Promise.all(cancelledTrades.map(async (trade) => {
                const tradeData = trade.toJSON();
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
                const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards, true);
                const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards, true);
                let finalSendCards = sendCardsDetails;
                let finalReceiveCards = receiveCardsDetails;
                if (tradeData.trade_sent_by === userId) {
                    finalSendCards = sendCardsDetails;
                    finalReceiveCards = receiveCardsDetails;
                }
                else if (tradeData.trade_sent_to === userId) {
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
                    payment_detail: {
                        products_offer_amount: tradeData.add_cash || 0,
                        shipment_amount: tradeData.proxy_fee_amt || 0,
                        total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
                        paid_amount: tradeData.trade_amount_amount ? parseFloat(tradeData.trade_amount_amount) : 0,
                        amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
                    }
                };
            }));
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
        }
        catch (error) {
            console.error('Error getting cancelled trades:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get cancelled trades'
                }
            };
        }
    }
    static async getNotifications(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const limit = perPage;
            const offset = (page - 1) * perPage;
            const totalCount = await TradeNotification.count({
                where: {
                    notification_sent_to: userId
                }
            });
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
            const transformedNotifications = notifications.map((notification) => {
                const notificationData = notification.toJSON();
                let received_from = null;
                if (notificationData.sender) {
                    received_from = notificationData.sender.username ||
                        `${notificationData.sender.first_name || ''} ${notificationData.sender.last_name || ''}`.trim();
                }
                return {
                    id: notificationData.id,
                    title: notificationData.message || 'Trade Notification',
                    received_from: received_from,
                    received_on: notificationData.created_at ? UserService.formatDateToMMDDYY(notificationData.created_at) : null,
                    received_on_date: notificationData.created_at,
                    seen_date: notificationData.seen ? (notificationData.updated_at ? UserService.formatDateToMMDDYY(notificationData.updated_at) : null) : null,
                    seen: notificationData.seen || 0,
                    trade_proposal_id: notificationData.trade_proposal_id,
                    buy_sell_card_id: notificationData.buy_sell_card_id
                };
            });
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
        }
        catch (error) {
            console.error('Error getting notifications:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get notifications'
                }
            };
        }
    }
    static calculateDaysDifference(dateString) {
        if (!dateString)
            return null;
        try {
            const targetDate = new Date(dateString);
            const currentDate = new Date();
            const diffTime = Math.abs(currentDate.getTime() - targetDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0)
                return 'Today';
            if (diffDays === 1)
                return '1 day ago';
            return `${diffDays} days ago`;
        }
        catch (error) {
            console.error('Error calculating days difference:', error);
            return null;
        }
    }
    static calculateTradeDuration(date1, date2) {
        if (!date1 || !date2)
            return null;
        try {
            const parseCustomFormat = (dateString) => {
                try {
                    if (typeof dateString === 'string' && dateString.includes('.') && (dateString.includes('AM') || dateString.includes('PM'))) {
                        const parts = dateString.split(' ');
                        const datePart = parts[0];
                        const timePart = parts.slice(1).join(' ');
                        if (datePart && datePart.includes('.')) {
                            const dateComponents = datePart.split('.');
                            if (dateComponents.length === 3) {
                                const month = dateComponents[0];
                                const day = dateComponents[1];
                                const year = dateComponents[2];
                                if (month && day && year) {
                                    const fullYear = parseInt('20' + year);
                                    const dateString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;
                                    return new Date(dateString);
                                }
                            }
                        }
                    }
                    return new Date(dateString);
                }
                catch (error) {
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
            if (isNaN(date1Parsed.getTime()) || isNaN(date2Parsed.getTime())) {
                console.error('Invalid parsed dates:', { date1Parsed, date2Parsed });
                return null;
            }
            const diffTime = Math.abs(date2Parsed.getTime() - date1Parsed.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0)
                return 'Same day';
            if (diffDays === 1)
                return '1 day';
            return `${diffDays} days`;
        }
        catch (error) {
            console.error('Error calculating trade duration:', error);
            return null;
        }
    }
    static async getTradingCardDetails(cardIdsString, excludeFields = false) {
        if (!cardIdsString || cardIdsString.trim() === '') {
            return [];
        }
        try {
            let cardIds = [];
            try {
                const parsed = JSON.parse(cardIdsString);
                if (Array.isArray(parsed)) {
                    cardIds = parsed.filter(id => typeof id === 'number' && !isNaN(id));
                }
            }
            catch (jsonError) {
            }
            if (cardIds.length === 0) {
                const commaSeparated = cardIdsString.split(',').map(id => {
                    const num = parseInt(id.trim());
                    return isNaN(num) ? null : num;
                }).filter(id => id !== null);
                if (commaSeparated.length > 0) {
                    cardIds = commaSeparated;
                }
            }
            if (cardIds.length === 0) {
                const spaceSeparated = cardIdsString.split(' ').map(id => {
                    const num = parseInt(id.trim());
                    return isNaN(num) ? null : num;
                }).filter(id => id !== null);
                if (spaceSeparated.length > 0) {
                    cardIds = spaceSeparated;
                }
            }
            if (cardIds.length === 0) {
                const semicolonSeparated = cardIdsString.split(';').map(id => {
                    const num = parseInt(id.trim());
                    return isNaN(num) ? null : num;
                }).filter(id => id !== null);
                if (semicolonSeparated.length > 0) {
                    cardIds = semicolonSeparated;
                }
            }
            if (cardIds.length === 0) {
                const pipeSeparated = cardIdsString.split('|').map(id => {
                    const num = parseInt(id.trim());
                    return isNaN(num) ? null : num;
                }).filter(id => id !== null);
                if (pipeSeparated.length > 0) {
                    cardIds = pipeSeparated;
                }
            }
            if (cardIds.length === 0) {
                return [];
            }
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
            const cardsWithCategories = await Promise.all(tradingCards.map(async (card) => {
                let category_name = null;
                if (card.category_id) {
                    try {
                        const category = await Category.findByPk(card.category_id);
                        category_name = category ? category.sport_name : null;
                    }
                    catch (error) {
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
                    title: card.title || null,
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
        }
        catch (error) {
            console.error('Error parsing card IDs:', error);
            return [];
        }
    }
    static async getCompletedTrades(userId, filters = {}, page = 1, perPage = 5) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            let whereClause = {
                [Op.or]: [
                    { trade_sent_by_key: userId },
                    { trade_sent_to_key: userId }
                ]
            };
            const filterData = {};
            if (filters.id && filters.id > 0) {
                whereClause.trade_proposal_id = filters.id;
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
            if (filters.trade_id && filters.trade_id > 0) {
                whereClause.trade_proposal_id = filters.trade_id;
            }
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                filterData.trade_with = filters.trade_with;
            }
            if (filters.code && filters.code.trim() !== '') {
                whereClause.order_id = { [Op.like]: `%${filters.code}%` };
                filterData.code = filters.code;
            }
            if (filters.trade_type === 'sent') {
                whereClause.trade_sent_by_key = userId;
                filterData.trade_type = 'sent';
            }
            else if (filters.trade_type === 'received') {
                whereClause.trade_sent_to_key = userId;
                filterData.trade_type = 'received';
            }
            if (filters.from_date && filters.from_date.trim() !== '') {
                try {
                    const fromDate = new Date(filters.from_date);
                    if (!isNaN(fromDate.getTime())) {
                        fromDate.setHours(0, 0, 0, 0);
                        whereClause.created_at = { [Op.gte]: fromDate };
                        filterData.from_date = filters.from_date;
                    }
                }
                catch (error) {
                    console.error('Invalid from_date format:', filters.from_date);
                }
            }
            if (filters.to_date && filters.to_date.trim() !== '') {
                try {
                    const toDate = new Date(filters.to_date);
                    if (!isNaN(toDate.getTime())) {
                        toDate.setHours(23, 59, 59, 999);
                        if (whereClause.created_at) {
                            whereClause.created_at[Op.lte] = toDate;
                        }
                        else {
                            whereClause.created_at = { [Op.lte]: toDate };
                        }
                        filterData.to_date = filters.to_date;
                    }
                }
                catch (error) {
                    console.error('Invalid to_date format:', filters.to_date);
                }
            }
            const offset = (page - 1) * perPage;
            const limit = perPage;
            const totalCount = await TradeTransaction.count({
                where: whereClause
            });
            const includes = [
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
            if (filters.trade_with && filters.trade_with.trim() !== '') {
                const tradeWithPattern = `%${filters.trade_with}%`;
                includes[1].where = { username: { [Op.like]: tradeWithPattern } };
                includes[1].required = true;
            }
            const completedTrades = await TradeTransaction.findAll({
                where: whereClause,
                include: includes,
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            });
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
            const transformedCompletedTrades = await Promise.all(completedTrades.map(async (trade) => {
                const tradeData = trade.toJSON();
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
                const sendCardsDetails = await UserService.getTradingCardDetails(tradeData.send_cards);
                const receiveCardsDetails = await UserService.getTradingCardDetails(tradeData.receive_cards);
                let finalSendCards = sendCardsDetails;
                let finalReceiveCards = receiveCardsDetails;
                if (tradeData.trade_sent_by_key === userId) {
                    finalSendCards = sendCardsDetails;
                    finalReceiveCards = receiveCardsDetails;
                }
                else if (tradeData.trade_sent_to_key === userId) {
                    finalSendCards = receiveCardsDetails;
                    finalReceiveCards = sendCardsDetails;
                }
                const ratings = await UserService.getTradeRatings(tradeData.trade_proposal_id);
                const shipmenttrader = await Shipment.findAll({
                    where: {
                        trade_id: tradeData.trade_proposal_id,
                        user_id: userId
                    },
                    attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id']
                });
                const shipmentself = await Shipment.findAll({
                    where: {
                        trade_id: tradeData.trade_proposal_id,
                        user_id: tradeData.trade_sent_by_key === userId ? tradeData.trade_sent_to_key : tradeData.trade_sent_by_key
                    },
                    attributes: ['id', 'tracking_id', 'shipment_status', 'estimated_delivery_date', 'user_id']
                });
                if (tradeData.send_cards || tradeData.receive_cards) {
                }
                return {
                    id: tradeData.id,
                    code: tradeData.order_id,
                    trade_id: tradeData.trade_proposal_id,
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
                    counter_offer: null,
                    is_new: 0,
                    trade_status: 'complete',
                    accepted_on: tradeData.trade_created_at ? UserService.formatDateToMMDDYY(tradeData.trade_created_at) : null,
                    is_payment_received: tradeData.trade_amount_pay_status === 'completed' ? 1 : 0,
                    payment_received_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
                    shipped_by_trade_sent_by: tradeData.confirmation_from_sender,
                    shipped_on_by_trade_sent_by: tradeData.confirmation_from_sender ? UserService.formatDateToMMDDYY(tradeData.created_at) : null,
                    shipped_by_trade_sent_to: tradeData.confirmation_from_receiver,
                    shipped_on_by_trade_sent_to: tradeData.confirmation_from_receiver ? UserService.formatDateToMMDDYY(tradeData.created_at) : null,
                    is_payment_init: tradeData.trade_amount_pay_status ? 1 : 0,
                    payment_init_date: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null,
                    trade_proposal_status_id: null,
                    created_at: UserService.formatDateToMMDDYY(tradeData.created_at),
                    updated_at: tradeData.updated_at,
                    completed_trade_duration: UserService.calculateTradeDuration(tradeData.trade_created_at ? UserService.formatDateToMMDDYY(tradeData.trade_created_at) : null, tradeData.updated_at ? UserService.formatDateToMMDDYY(tradeData.updated_at) : null),
                    mainTradingCard: tradeData.main_card_id ? {
                        id: tradeData.main_card_id,
                        trading_card_img: null,
                        trading_card_slug: null,
                        trading_card_asking_price: null
                    } : null,
                    payment_detail: {
                        products_offer_amount: tradeData.add_cash || 0,
                        shipment_amount: tradeData.proxy_fee_amt || 0,
                        total_amount: (tradeData.add_cash || 0) + (tradeData.proxy_fee_amt || 0),
                        paid_amount: tradeData.trade_amount_amount || 0,
                        amount_paid_on: tradeData.trade_amount_paid_on ? UserService.formatDateToMMDDYY(tradeData.trade_amount_paid_on) : null
                    },
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
                    ratings: ratings
                };
            }));
            const totalPages = Math.ceil(totalCount / perPage);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;
            return {
                success: true,
                data: {
                    ongoing_trades: transformedCompletedTrades,
                    buy_sel_cards: [],
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
        }
        catch (error) {
            console.error('Error getting completed trades:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get completed trades'
                }
            };
        }
    }
    static async confirmPayment(userId, tradeProposalId) {
        try {
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
            if (tradeData.trade_sent_by !== userId && tradeData.trade_sent_to !== userId) {
                return {
                    success: false,
                    error: {
                        message: 'You are not authorized to confirm payment for this trade'
                    }
                };
            }
            await TradeProposal.update({
                is_payment_received: 1,
                payment_received_on: new Date()
            }, {
                where: { id: tradeProposalId }
            });
            const statusResult = await setTradeProposalStatus(tradeProposalId, 'payment-confirmed');
            if (!statusResult.success) {
                console.error('❌ Failed to update trade status:', statusResult.error);
                const paymentConfirmedStatus = await TradeProposalStatus.findOne({
                    where: { alias: 'payment-confirmed' }
                });
                if (paymentConfirmedStatus) {
                    await TradeProposal.update({ trade_proposal_status_id: paymentConfirmedStatus.id }, { where: { id: tradeProposalId } });
                }
                else {
                    console.error('❌ Payment confirmed status not found in database');
                }
            }
            const sender = await User.findByPk(tradeData.trade_sent_by, {
                attributes: ['id', 'first_name', 'last_name', 'email']
            });
            const receiver = await User.findByPk(tradeData.trade_sent_to, {
                attributes: ['id', 'first_name', 'last_name', 'email']
            });
            const tradeAmountAmount = tradeData.trade_amount_amount;
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
            const itemsSend = sendCards.map(card => card.search_param).filter(Boolean);
            const itemsReceived = receiveCards.map(card => card.search_param).filter(Boolean);
            const itemsSendList = itemsSend.map((cardName, index) => `${index + 1}. ${cardName}`).join('\n');
            const itemsReceivedList = itemsReceived.map((cardName, index) => `${index + 1}. ${cardName}`).join('\n');
            const { setTradersNotificationOnVariousActionBasis } = await import('./notification.service.js');
            const { EmailHelperService } = await import('../services/emailHelper.service.js');
            if (tradeData.trade_sent_to === userId) {
                const act = 'payment-received';
                const sentBy = tradeData.trade_sent_to;
                const sentTo = tradeData.trade_sent_by;
                if (sentBy && sentTo) {
                    await setTradersNotificationOnVariousActionBasis(act, sentBy, sentTo, tradeProposalId, 'Trade');
                }
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
                    }
                    catch (emailError) {
                        console.error('❌ Failed to send payment confirmed email to sender:', emailError);
                    }
                }
            }
            else if (tradeData.trade_sent_by === userId) {
                const act = 'payment-received';
                const sentBy = tradeData.trade_sent_to;
                const sentTo = tradeData.trade_sent_by;
                if (sentBy && sentTo) {
                    await setTradersNotificationOnVariousActionBasis(act, sentBy, sentTo, tradeProposalId, 'Trade');
                }
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
                    }
                    catch (emailError) {
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
        }
        catch (error) {
            console.error('Error confirming payment:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to confirm payment'
                }
            };
        }
    }
    static async getMyTickets(userId, page = 1, perPage = 10) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const validPage = Math.max(1, parseInt(page.toString()) || 1);
            const validPerPage = Math.min(100, Math.max(1, parseInt(perPage.toString()) || 10));
            const offset = (validPage - 1) * validPerPage;
            const { count: totalCount, rows: tickets } = await Support.findAndCountAll({
                where: {
                    user_id: userId
                },
                order: [['id', 'DESC']],
                limit: validPerPage,
                offset: offset
            });
            const transformedTickets = tickets.map((ticket) => {
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
        }
        catch (error) {
            console.error('Error getting my tickets:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to get tickets'
                }
            };
        }
    }
    static async markAllNotificationsAsRead(userId) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            const updatedCount = await TradeNotification.update({ seen: 1 }, {
                where: {
                    notification_sent_to: userId
                }
            });
            return {
                success: true,
                data: {
                    message: 'All notifications marked as read successfully',
                    updated_count: updatedCount[0],
                    user_id: userId
                }
            };
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to mark notifications as read'
                }
            };
        }
    }
    static async submitRating(userId, tradeId, rating, data) {
        try {
            if (!userId || isNaN(userId) || userId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid user ID is required'
                    }
                };
            }
            if (!tradeId || isNaN(tradeId) || tradeId <= 0) {
                return {
                    success: false,
                    error: {
                        message: 'Valid trade ID is required'
                    }
                };
            }
            if (!rating || isNaN(rating) || rating < 1 || rating > 10) {
                return {
                    success: false,
                    error: {
                        message: 'Rating must be between 1 and 10'
                    }
                };
            }
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
            const existingReview = await Review.findOne({
                where: {
                    trade_proposal_id: tradeId
                }
            });
            let reviewRecord;
            const normalizedRating = rating;
            if (existingReview) {
                if (isSender) {
                    const updateData = {
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
                }
                else {
                    const updateData = {
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
            }
            else {
                if (isSender) {
                    const createData = {
                        trader_id: userId,
                        trader_rating: normalizedRating,
                        trader_review: data,
                        trade_proposal_id: tradeId
                    };
                    if (tradeData.main_card) {
                        createData.card_id = tradeData.main_card;
                    }
                    reviewRecord = await Review.create(createData);
                }
                else {
                    const createData = {
                        user_id: userId,
                        user_rating: normalizedRating,
                        user_review: data,
                        trade_proposal_id: tradeId
                    };
                    if (tradeData.main_card) {
                        createData.card_id = tradeData.main_card;
                    }
                    reviewRecord = await Review.create(createData);
                }
            }
            const reviewCollectionRecord = await ReviewCollection.create({
                review_id: reviewRecord.id,
                buy_sell_card_id: 0,
                user_id: isSender ? tradeData.trade_sent_to : tradeData.trade_sent_by,
                sender_id: isSender ? tradeData.trade_sent_by : tradeData.trade_sent_to,
                rating: normalizedRating,
                content: data
            });
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
        }
        catch (error) {
            console.error('Error submitting rating:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to submit rating'
                }
            };
        }
    }
    static async cancelShippingPayment(tradeId, userId) {
        try {
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
            const updatedShipment = await Shipment.update({
                shipment_payment_status: 3,
                updated_at: new Date()
            }, {
                where: { trade_id: tradeId }
            });
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
            }
            else {
                return {
                    success: false,
                    error: {
                        message: 'Failed to update shipment payment status'
                    }
                };
            }
        }
        catch (error) {
            console.error('Cancel shipping payment error:', error);
            return {
                success: false,
                error: {
                    message: error.message || 'Failed to cancel shipping payment'
                }
            };
        }
    }
    static async getUsersGroupedByCategories() {
        try {
            const query = `
        SELECT 
          c.id as category_id,
          c.sport_name as category_name,
          c.slug as category_slug,
          c.sport_icon as category_icon,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.username,
          u.profile_picture,
          u.email,
          u.ratings,
          u.followers,
          u.trade_transactions,
          u.trading_cards,
          COUNT(DISTINCT tc.id) as card_count
        FROM categories c
        INNER JOIN trading_cards tc ON tc.category_id = c.id
        INNER JOIN users u ON u.id = tc.trader_id
        WHERE c.sport_status = '1'
          AND u.user_status = '1'
          AND u.user_role = 'user'
          AND (tc.mark_as_deleted IS NULL OR tc.mark_as_deleted = 0)
          AND tc.trading_card_status = '1'
          AND (tc.is_traded IS NULL OR tc.is_traded = '0' OR tc.is_traded = 0)
          AND tc.trader_id IS NOT NULL
          AND tc.category_id IS NOT NULL
          AND c.id IS NOT NULL
          AND u.id IS NOT NULL
        GROUP BY 
          c.id, c.sport_name, c.slug, c.sport_icon,
          u.id, u.first_name, u.last_name, u.username, u.profile_picture,
          u.email, u.ratings, u.followers, u.trade_transactions, u.trading_cards
        ORDER BY c.sport_name ASC, u.first_name ASC
      `;
            const results = await sequelize.query(query.trim(), {
                type: QueryTypes.SELECT,
                raw: true
            });
            const categoriesMap = new Map();
            results.forEach((row) => {
                const categoryId = row.category_id;
                if (!categoriesMap.has(categoryId)) {
                    categoriesMap.set(categoryId, {
                        category_id: row.category_id,
                        category_name: row.category_name,
                        category_slug: row.category_slug,
                        category_icon: row.category_icon,
                        users: [],
                        user_count: 0
                    });
                }
                const category = categoriesMap.get(categoryId);
                const userExists = category.users.find((u) => u.user_id === row.user_id);
                if (!userExists) {
                    category.users.push({
                        user_id: row.user_id,
                        first_name: row.first_name || null,
                        last_name: row.last_name || null,
                        username: row.username || null,
                        profile_picture: row.profile_picture || null,
                        email: row.email || null,
                        ratings: row.ratings || null,
                        followers: row.followers || 0,
                        trade_transactions: row.trade_transactions || 0,
                        trading_cards: row.trading_cards || 0,
                        card_count: Number(row.card_count) || 0
                    });
                    category.user_count++;
                }
            });
            const categories = Array.from(categoriesMap.values());
            return {
                success: true,
                data: {
                    categories: categories,
                    total_categories: categories.length,
                    total_users: categories.reduce((sum, cat) => sum + cat.user_count, 0)
                }
            };
        }
        catch (error) {
            console.error('Error getting users grouped by categories:', error);
            console.error('Error details:', {
                message: error.message,
                sql: error.sql,
                sqlMessage: error.sqlMessage,
                original: error.original
            });
            return {
                success: false,
                error: {
                    message: error.message || error.sqlMessage || 'Failed to get users grouped by categories',
                    details: process.env.NODE_ENV === 'development' ? {
                        sql: error.sql,
                        original: error.original
                    } : undefined
                }
            };
        }
    }
}
