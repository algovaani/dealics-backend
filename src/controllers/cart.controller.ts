import { Request, Response } from "express";
import { Cart, CartDetail, TradingCard, User, BuyOfferAttempt, CreditDeductionLog, Address, Category, BuySellCard, BuyOfferStatus, Follower, TradeProposal, TradeProposalStatus, TradeNotification, Shipment, TradeTransaction, CardCondition, BuyOfferProduct } from "../models/index.js";
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";
import { exit } from "process";
import { EmailHelperService } from "../services/emailHelper.service.js";
import { setTradersNotificationOnVariousActionBasis, setNotificationContext } from '../services/notification.service.js';
import { time } from "console";

/**
 * Timezone utility functions for server-native time handling
 * Uses server's timezone for both storage and display
 */
const TimezoneUtils = {
  /**
   * Get current server time
   * Uses server's native timezone
   */
  getCurrentServerTime: (): Date => {
    return new Date();
  },

  /**
   * Add minutes to current server time
   * Returns server time for database storage
   */
  addMinutesToServerTime: (minutes: number): Date => {
    const now = new Date(); // Server's native time
    return new Date(now.getTime() + minutes * 60 * 1000);
  },

  /**
   * Format server time for display
   * Returns server time in YYYY-MM-DD HH:mm:ss format
   */
  formatServerTime: (input: any): string | null => {
    if (!input) return null;
    const dt = new Date(input);
    if (isNaN(dt.getTime())) return null;
    
    // Use server's native timezone
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = dt.getFullYear();
    const m = pad(dt.getMonth() + 1);
    const d = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    const ss = pad(dt.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  },

  /**
   * Get current server time for display
   * Shows server's current time
   */
  getCurrentServerTimeFormatted: (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
};

/**
 * Helper function to prepare card names for email
 * Optimized for better performance and reusability
 */
const prepareCardNamesForEmail = async (buySellCard: any): Promise<string> => {
  try {
    // Check if main card exists
    if (buySellCard.main_card && buySellCard.main_card > 0) {
      const card = await TradingCard.findByPk(buySellCard.main_card, {
        attributes: ['search_param']
      });
      return card?.search_param ? `1. ${card.search_param}` : 'Trading card';
    }

    // Get multiple cards from buy offer products
    const buyOfferProducts = await BuyOfferProduct.findAll({
      where: { buy_sell_id: buySellCard.id },
      include: [{
        model: TradingCard,
        as: 'product',
        attributes: ['search_param']
      }],
      attributes: ['id']
    });

    if (buyOfferProducts.length > 0) {
      const cardNamesArray = buyOfferProducts
        .map((item: any, index: number) => {
          return item.product?.search_param 
            ? `${index + 1}. ${item.product.search_param}` 
            : null;
        })
        .filter(Boolean);
      
      return cardNamesArray.length > 0 
        ? cardNamesArray.join('<br/>') 
        : 'Trading cards';
    }

    return 'Trading cards';
  } catch (error) {
    console.error('Error preparing card names:', error);
    return 'Trading cards';
  }
};

/**
 * Helper function to send shipment completion emails
 * Optimized for performance and maintainability
 */
const sendShipmentCompletionEmails = async (
  currentUser: any, 
  otherUser: any, 
  cardNames: string, 
  trackingId: string, 
  shipmentStatus: string = 'Pre-Transit'
): Promise<void> => {
  // Validate required parameters
  if (!currentUser?.email || !otherUser?.email || !trackingId) {
    console.warn('⚠️ Missing required data for shipment emails:', {
      currentUserEmail: !!currentUser?.email,
      otherUserEmail: !!otherUser?.email,
      trackingId: !!trackingId
    });
    return;
  }

  try {
    // Prepare user names once
    const currentUserName = EmailHelperService.setName(
      currentUser.first_name || '', 
      currentUser.last_name || ''
    );
    const otherUserName = EmailHelperService.setName(
      otherUser.first_name || '', 
      otherUser.last_name || ''
    );

    // Prepare common email data
    const commonData = {
      card_names: cardNames || 'Trading cards',
      items_shipped: cardNames || 'Trading cards', // For product-shipped-by-other template
      tracking_id: trackingId,
      tracking_info: trackingId, // For email template
      transaction_id: trackingId, // For product-shipped-by-other template
      shipment_status: shipmentStatus || 'Pre-Transit'
    };

    // Email to current user (shipper) - "product-shipped-by-you"
    const mailInputsToShipper = {
      to: currentUser.email,
      name: currentUserName,
      other_user_name: otherUserName,
      ...commonData
    };
    
    // Email to other user (receiver) - "product-shipped-by-other"
    const mailInputsToReceiver = {
      to: otherUser.email,
      name: otherUserName,
      other_user_name: currentUserName,
      ...commonData
    };

    // Send both emails in parallel for better performance
    await Promise.all([
      EmailHelperService.executeMailSender('product-shipped-by-you', mailInputsToShipper),
      EmailHelperService.executeMailSender('product-shipped-by-other', mailInputsToReceiver)
    ]);

    console.log('✅ Shipment completion emails sent successfully');

  } catch (emailError) {
    console.error('❌ Failed to send shipment completion emails:', emailError);
    // Don't throw error to avoid breaking the main operation
  }
};

// Helper function to send standardized API responses
const sendApiResponse = (res: Response, statusCode: number, status: boolean, message: string, data?: any, extra?: any) => {
  const response: any = {
    status,
    message,
    data: data || []
  };
  
  if (extra) {
    Object.assign(response, extra);
  }
  
  return res.status(statusCode).json(response);
};

// Helper function to validate offer attempts
const makeOfferAttempts = async (
  productId: number,
  offerAmtBuyer: number,
  tradingCardOfferAcceptAbove: number,
  tradingCardAskingPrice: number,
  userId: number
) => {
  const remainingAttempts = 3;
  const returnData = {
    status: true,
    inValidOfferCounts: 0,
    remaining: remainingAttempts
  };

  // Retrieve previous offer attempts
  const buyOfferAttempts = await BuyOfferAttempt.findOne({
    where: {
      user_id: userId,
      product_id: productId
    },
    attributes: ['id', 'attempts', 'offer_amount']
  });

  let inValidOfferCounts = 0;
  let remaining = remainingAttempts;
  
  if (buyOfferAttempts && buyOfferAttempts.id) {
    inValidOfferCounts = buyOfferAttempts.attempts;
    remaining = remainingAttempts - buyOfferAttempts.attempts;
  }

  // Check if offer exceeds asking price
  if (offerAmtBuyer > tradingCardAskingPrice) {
    return {
      status: false,
      inValidOfferCounts,
      remaining,
      message: `Invalid offer! The asking price is $${tradingCardAskingPrice}. Your entered amount exceeds the maximum allowed. Please pay $${tradingCardAskingPrice}.`
    };
  }

  // If there are previous offer attempts, validate the new offer
  if (buyOfferAttempts && buyOfferAttempts.id) {    

    // Check if the offer limit is exceeded
    if (buyOfferAttempts.attempts >= 3) {
      // If the offer exceeds the asking price, reject it
      if (offerAmtBuyer > tradingCardAskingPrice) {
        return {
          status: false,
          inValidOfferCounts: 1,
          remaining: remainingAttempts - 1,
          message: `Invalid offer! The asking price is $${tradingCardAskingPrice}. Your entered amount exceeds the maximum allowed. Please pay $${tradingCardAskingPrice}.`
        };
      }

      // If the offer exceeds the acceptable threshold, reject it
      if (offerAmtBuyer >= tradingCardOfferAcceptAbove && offerAmtBuyer < tradingCardAskingPrice) {
        return {
          status: false,
          inValidOfferCounts: buyOfferAttempts.attempts,
          remaining: 0,
          message: 'Offer limit exceeded, buy at asking price.'
        };
      }
    }
  }

  // Case when the offer is below the acceptable threshold
  if (offerAmtBuyer < tradingCardOfferAcceptAbove) {
    if (buyOfferAttempts && buyOfferAttempts.id) {
      // If offer attempts exceed the limit
      if (buyOfferAttempts.attempts >= 3) {
        return {
          status: false,
          inValidOfferCounts: buyOfferAttempts.attempts,
          remaining: 0,
          message: 'Offer limit exceeded, buy at asking price.'
        };
      } else {
        // Update the attempts and offer amount
        const preOfferAmount = buyOfferAttempts.offer_amount!;
        const attempts = buyOfferAttempts.attempts + 1;

        let offerAmount = offerAmtBuyer;
        if (preOfferAmount > offerAmtBuyer) offerAmount = preOfferAmount;

        // Check if the new offer is lower than the previous one
        if (offerAmtBuyer < buyOfferAttempts.offer_amount!) {
          return {
            status: false,
            inValidOfferCounts: buyOfferAttempts.attempts,
            remaining: 0,
            message: `You cannot submit an offer lower than your previous amount of $${buyOfferAttempts.offer_amount}`
          };
        }

        await buyOfferAttempts.update({
          attempts,
          offer_amount: offerAmount
        });

        return {
          status: false,
          inValidOfferCounts: attempts,
          remaining: remainingAttempts - attempts,
          message: `Insufficient amount. Offer Limit: ${attempts < remainingAttempts ? `${attempts}/3` : 'Exceeded, buy at asking price.'}`
        };
      }
    } else {
      // If no previous attempts, create a new offer attempt
      await BuyOfferAttempt.create({
        user_id: userId,
        product_id: productId,
        attempts: 1,
        offer_amount: offerAmtBuyer
      } as any);

      return {
        status: false,
        inValidOfferCounts: 1,
        remaining: remainingAttempts - 1,
        message: 'Insufficient amount. Offer Limit: 1/3'
      };
    }
  } else {
    // Case when the offer is greater than or equal to the threshold but less than the asking price
    if (offerAmtBuyer > tradingCardOfferAcceptAbove && offerAmtBuyer < tradingCardAskingPrice) {
      if (buyOfferAttempts && buyOfferAttempts.id) {
        // Check if the offer limit is exceeded
        if (buyOfferAttempts.attempts >= 3) {
          return {
            status: false,
            inValidOfferCounts: buyOfferAttempts.attempts,
            remaining: 0,
            message: 'Offer limit exceeded, buy at asking price.'
          };
        } else {
          // Update the attempt count and offer amount
          const preOfferAmount = buyOfferAttempts.offer_amount!;
          const attempts = buyOfferAttempts.attempts + 1;

          let offerAmount = offerAmtBuyer;
          if (preOfferAmount > offerAmtBuyer) offerAmount = preOfferAmount;

          // Check if the new offer is lower than the previous one
          if (offerAmtBuyer < buyOfferAttempts.offer_amount!) {
            return {
              status: false,
              inValidOfferCounts: buyOfferAttempts.attempts,
              remaining: 0,
              message: `You cannot submit an offer lower than your previous amount of $${buyOfferAttempts.offer_amount}`
            };
          }
          await buyOfferAttempts.update({
            attempts,
            offer_amount: offerAmount
          });
        }
      } else {
        // Create a new offer attempt if none exists
        await BuyOfferAttempt.create({
          user_id: userId,
          product_id: productId,
          attempts: 1,
          offer_amount: offerAmtBuyer
        } as any);
      }
    }

    return returnData;
  }

  // If the offer is equal to or greater than the asking price
  if (offerAmtBuyer >= tradingCardAskingPrice) {
    return {
      status: true,
      message: 'Successful offer, item added to cart.',
      remaining_coins: 0 // This will be updated with actual user coins
    };
  }

  return returnData;
};

const makeOfferDealzoneAttempts = async (
  productId: number,
  offerAmtBuyer: number,
  tradingCardOfferAcceptAbove: number,
  userId: number
) => {
  const remainingAttempts = 3;
  const returnData = {
    status: true,
    inValidOfferCounts: 0,
    remaining: remainingAttempts
  };

  // Retrieve previous offer attempts
  const buyOfferAttempts = await BuyOfferAttempt.findOne({
    where: {
      user_id: userId,
      product_id: productId
    },
    attributes: ['id', 'attempts', 'offer_amount']
  });

  let inValidOfferCounts = 0;
  let remaining = remainingAttempts;
  
  if (buyOfferAttempts && buyOfferAttempts.id) {
    inValidOfferCounts = buyOfferAttempts.attempts;
    remaining = remainingAttempts - buyOfferAttempts.attempts;
  }

   // If there are previous offer attempts, validate the new offer
  if (buyOfferAttempts && buyOfferAttempts.id) {    

    // Check if the offer limit is exceeded
    if (buyOfferAttempts.attempts >= 3) {
        return {
          status: false,
          inValidOfferCounts: buyOfferAttempts.attempts,
          remaining: 0,
          message: 'No more attempts left — this deal can’t accept any more offers.'
        };
    }
  }

  // Case when the offer is below the acceptable threshold
  if (offerAmtBuyer < tradingCardOfferAcceptAbove) {
    if (buyOfferAttempts && buyOfferAttempts.id) {
      // If offer attempts exceed the limit
      if (buyOfferAttempts.attempts >= 3) {
        return {
          status: false,
          inValidOfferCounts: buyOfferAttempts.attempts,
          remaining: 0,
          message: 'No more attempts left — this deal can’t accept any more offers.'
        };
      } else {
        // Update the attempts and offer amount
        const preOfferAmount = buyOfferAttempts.offer_amount!;
        const attempts = buyOfferAttempts.attempts + 1;

        let offerAmount = offerAmtBuyer;
        if (preOfferAmount > offerAmtBuyer) offerAmount = preOfferAmount;

        // Check if the new offer is lower than the previous one
        if (offerAmtBuyer < buyOfferAttempts.offer_amount!) {
          return {
            status: false,
            inValidOfferCounts: buyOfferAttempts.attempts,
            remaining: 0,
            message: `You cannot submit an offer lower than your previous amount of $${buyOfferAttempts.offer_amount}`
          };
        }

        await buyOfferAttempts.update({
          attempts,
          offer_amount: offerAmount
        });

        return {
          status: false,
          inValidOfferCounts: attempts,
          remaining: remainingAttempts - attempts,
          message: `Your offer is below the seller's deal price. Try a higher amount.`
        };
      }
    } else {
      // If no previous attempts, create a new offer attempt
      await BuyOfferAttempt.create({
        user_id: userId,
        product_id: productId,
        attempts: 1,
        offer_amount: offerAmtBuyer
      } as any);

      return {
        status: false,
        inValidOfferCounts: 1,
        remaining: remainingAttempts - 1,
        message: 'Insufficient amount. Offer Limit: 1/3'
      };
    }
  } else {
    // Case when the offer is greater than or equal to the threshold but less than the asking price
    if (offerAmtBuyer >= tradingCardOfferAcceptAbove) {
      if (buyOfferAttempts && buyOfferAttempts.id) {
        // Check if the offer limit is exceeded
        if (buyOfferAttempts.attempts >= 3) {
          return {
            status: false,
            inValidOfferCounts: buyOfferAttempts.attempts,
            remaining: 0,
            message: 'No more attempts left — this deal can’t accept any more offers.'
          };
        } else {
          // Update the attempt count and offer amount
          const preOfferAmount = buyOfferAttempts.offer_amount!;
          const attempts = buyOfferAttempts.attempts + 1;

          let offerAmount = offerAmtBuyer;
          if (preOfferAmount > offerAmtBuyer) offerAmount = preOfferAmount;

          // Check if the new offer is lower than the previous one
          if (offerAmtBuyer < buyOfferAttempts.offer_amount!) {
            return {
              status: false,
              inValidOfferCounts: buyOfferAttempts.attempts,
              remaining: 0,
              message: `You cannot submit an offer lower than your previous amount of $${buyOfferAttempts.offer_amount}`
            };
          }
          await buyOfferAttempts.update({
            attempts,
            offer_amount: offerAmount
          });
        }
      } else {
        // Create a new offer attempt if none exists
        await BuyOfferAttempt.create({
          user_id: userId,
          product_id: productId,
          attempts: 1,
          offer_amount: offerAmtBuyer
        } as any);        
      }
    }
  }
    // If the offer is equal to or greater than the asking price
  if (offerAmtBuyer >= tradingCardOfferAcceptAbove) {
    return {
      status: true,
      message: 'Successful offer, item added to cart.',
      remaining_coins: 0 // This will be updated with actual user coins
    };
  }
  return returnData;
};

// Helper function to calculate cart amounts
const calcCartAmounts = async (cartId: number, userId: number, addressId: any) => {
  let cartAmount = 0;
  let shippingFee = 0;
  let totalAmount = 0;

  const shippingFlatFeeArr: { [key: number]: { [key: number]: number } } = {};
  const shippingAddProductFlatFeeArr: { [key: number]: { [key: number]: number } } = {};

  let country = '';

  if (cartId > 0) {
    const cart = await Cart.findOne({
      where: {
        id: cartId,
        user_id: userId
      }
    });

    if (cart && cart.id) {
      // Get user default address
      let userDefaultAddress: any[] = [];
      if (addressId as any !== "") {
        userDefaultAddress = await sequelize.query(`
          SELECT country FROM addresses 
          WHERE id = ${addressId} 
          LIMIT 1
        `, { type: QueryTypes.SELECT }) as any[];
      } else {
        userDefaultAddress = await sequelize.query(`
          SELECT country FROM addresses 
          WHERE mark_default = 1 
          AND user_id = ${userId} 
          AND is_deleted = '0'
          LIMIT 1
        `, { type: QueryTypes.SELECT }) as any[];
      }

      if (userDefaultAddress && userDefaultAddress.length > 0 && userDefaultAddress[0]?.country) {
        country = userDefaultAddress[0].country;
      }

      // Get cart details with product information
      const cartDetails = await CartDetail.findAll({
        where: {
          cart_id: cartId,
          user_id: userId
        },
        include: [{
          model: TradingCard,
          as: 'product',
          attributes: ['id', 'category_id', 'free_shipping', 'usa_shipping_flat_rate', 'usa_add_product_flat_rate', 'canada_shipping_flat_rate', 'canada_add_product_flat_rate']
        }]
      });

      if (cartDetails && cartDetails.length > 0) {
        for (const data of cartDetails) {
          cartAmount = cartAmount + data.product_amount;
          const product = (data as any).product;
          
          if (country === 'United States') {
            if (product && product.id && product.free_shipping !== '1') {
              if (product.usa_shipping_flat_rate && parseFloat(product.usa_shipping_flat_rate) > 0) {
                shippingFlatFeeArr[product.category_id!] = {
                  ...shippingFlatFeeArr[product.category_id!],
                  [product.id]: parseFloat(product.usa_shipping_flat_rate)
                };
              }
              
              if (product.usa_add_product_flat_rate && parseFloat(product.usa_add_product_flat_rate) > 0) {
                shippingAddProductFlatFeeArr[product.category_id!] = {
                  ...shippingAddProductFlatFeeArr[product.category_id!],
                  [product.id]: parseFloat(product.usa_add_product_flat_rate)
                };
              }
            }
          } else if (country === 'Canada') {
            if (product && product.id && product.free_shipping !== '1') {
              if (product.canada_shipping_flat_rate && parseFloat(product.canada_shipping_flat_rate) > 0) {
                shippingFlatFeeArr[product.category_id!] = {
                  ...shippingFlatFeeArr[product.category_id!],
                  [product.id]: parseFloat(product.canada_shipping_flat_rate)
                };
              }
              
              if (product.canada_add_product_flat_rate && parseFloat(product.canada_add_product_flat_rate) > 0) {
                shippingAddProductFlatFeeArr[product.category_id!] = {
                  ...shippingAddProductFlatFeeArr[product.category_id!],
                  [product.id]: parseFloat(product.canada_add_product_flat_rate)
                };
              }
            }
          }
        }
      }
    }

    // Calculate shipping fees
    if (Object.keys(shippingFlatFeeArr).length > 0) {
      for (const catId in shippingFlatFeeArr) {
        const catData = shippingFlatFeeArr[catId];
        if (catData) {
          const sortedEntries = Object.entries(catData).sort(([,a], [,b]) => b - a);
          
          if (sortedEntries.length > 0) {
            const firstEntry = sortedEntries[0];
            if (firstEntry) {
              const [, rate] = firstEntry;
              shippingFee = shippingFee + rate;
              
              // Remove the highest rate entry
              const keyToDelete = firstEntry[0];
              if (shippingFlatFeeArr[catId] && keyToDelete) {
                delete shippingFlatFeeArr[catId][parseInt(keyToDelete)];
                
                // Remove category if empty
                if (Object.keys(shippingFlatFeeArr[catId]).length === 0) {
                  delete shippingFlatFeeArr[catId];
                }
              }
            }
          }
        }
      }
    }

    // Calculate additional shipping fees
    if (Object.keys(shippingFlatFeeArr).length > 0) {
      for (const catId in shippingFlatFeeArr) {
        const catData = shippingFlatFeeArr[catId];
        
        if (catData && Object.keys(catData).length > 0) {
          for (const pId in catData) {
            const productId = parseInt(pId);
            if (shippingAddProductFlatFeeArr[catId] && shippingAddProductFlatFeeArr[catId][productId] && shippingAddProductFlatFeeArr[catId][productId] > 0) {
              shippingFee = shippingFee + shippingAddProductFlatFeeArr[catId][productId];
            } else {
              // Get category shipping rate
              const categoryShippingRate = await sequelize.query(`
                SELECT usa_rate, canada_rate FROM category_shipping_rates 
                WHERE category_id = ${catId} AND user_id = ${cart?.seller_id}
                LIMIT 1
              `, { type: QueryTypes.SELECT }) as any[];

              if (categoryShippingRate.length > 0) {
                if (country === 'United States' && categoryShippingRate[0].usa_rate > 0) {
                  shippingFee = shippingFee + categoryShippingRate[0].usa_rate;
                } else if (country === 'Canada' && categoryShippingRate[0].canada_rate > 0) {
                  shippingFee = shippingFee + categoryShippingRate[0].canada_rate;
                }
              }
            }
          }
        }
      }
    }

    totalAmount = cartAmount + shippingFee;
  }

  return {
    shipping_fee: shippingFee,
    cart_amount: cartAmount,
    total_amount: totalAmount
  };
};


// Main cart offer function
export const cartOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { offer_amt_buyer } = req.body;
    const userId = req.user?.id;

    // Check if user is authenticated
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate input
    if (!id || !offer_amt_buyer) {
      return sendApiResponse(res, 400, false, "Trading card ID and offer amount are required", []);
    }

    const tradingCardId = parseInt(id);
    const offerAmount = parseFloat(offer_amt_buyer);

    if (isNaN(tradingCardId) || isNaN(offerAmount)) {
      return sendApiResponse(res, 400, false, "Invalid trading card ID or offer amount", []);
    }

    // Get trading card
    const tradingCard = await TradingCard.findByPk(tradingCardId);
    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading card not found", []);
    }

    // Get user's cart
    const cart = await Cart.findOne({
      where: { user_id: userId }
    });

    const cartProductCount = await CartDetail.count({
      where: { user_id: userId }
    });

    // Get seller
    const seller = await User.findByPk(tradingCard.trader_id!);
    if (!seller) {
      return sendApiResponse(res, 404, false, "Seller not found", []);
    }

    // Check seller's credit
    if (seller.credit! <= 0) {
      return sendApiResponse(res, 400, false, "You can not submit this offer. The seller needs more credits for this transaction.", [], {
        action: 'contact_seller',
        seller_id: seller.id
      });
    }

    // Validate offer attempts
    const makeOfferAttemptsResult = await makeOfferAttempts(
      tradingCardId,
      offerAmount,
      tradingCard.trading_card_offer_accept_above!,
      tradingCard.trading_card_asking_price!,
      userId
    );

    if (!makeOfferAttemptsResult.status) {
      const message = 'message' in makeOfferAttemptsResult ? makeOfferAttemptsResult.message : 'Offer validation failed';
      return sendApiResponse(res, 400, false, message, [], {
        inValidOfferCounts: makeOfferAttemptsResult.inValidOfferCounts,
        tradingCardId: tradingCardId,
        remaining: makeOfferAttemptsResult.remaining
      });
    }

    // Check if user is trying to buy their own product
    if (tradingCard.trader_id === userId) {
      return sendApiResponse(res, 400, false, "You can't buy your own product.", []);
    }

    // Check if product is available for sale
    if (tradingCard.can_buy !== '1') {
      return sendApiResponse(res, 400, false, "The product is not available for sale.", []);
    }

    // Check if product is already traded
    if (tradingCard.is_traded === '1') {
      return sendApiResponse(res, 400, false, "This product is already in a transaction.", []);
    }

    // Check cart seller consistency
    if (cart && cart.id && cart.seller_id !== tradingCard.trader_id) {
      return sendApiResponse(res, 400, false, "You cannot add this product to your cart. You have already added a product from another seller.", []);
    }

    let currentCart = cart;

    // Create cart if it doesn't exist
    if (!currentCart) {
      currentCart = await Cart.create({
        user_id: userId,
        seller_id: tradingCard.trader_id!,
        cart_amount: 0,
        shipping_fee: 0,
        total_amount: 0
      } as any);
    }

    // Check if product is already in cart
    const existingCartDetail = await CartDetail.findOne({
      where: {
        user_id: userId,
        product_id: tradingCardId
      }
    });

    let cartDetail;

    if (!existingCartDetail) {
      // Add product to cart - previous (UTC-based) timer behavior
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      cartDetail = await CartDetail.create({
        cart_id: currentCart.id,
        user_id: userId,
        product_id: tradingCardId,
        product_amount: offerAmount,
        hold_expires_at: holdExpiresAt
      } as any);

      // Mark trading card as traded
      await tradingCard.update({ is_traded: '1' });

      // Update or create buy offer attempt
      const existingOfferAttempt = await BuyOfferAttempt.findOne({
        where: {
          user_id: userId,
          product_id: tradingCardId
        }
      });

      if (existingOfferAttempt) {
        await existingOfferAttempt.update({ offer_amount: offerAmount });
      } else {
        await BuyOfferAttempt.create({
          user_id: userId,
          product_id: tradingCardId,
          attempts: 1,
          offer_amount: offerAmount
        } as any);
      }
    }

    // Calculate cart amounts
    const cartAmounts = await calcCartAmounts(currentCart.id, userId, null);
    await currentCart.update(cartAmounts);

    // Deduct seller's credits
    await seller.update({ credit: seller.credit! - 1 });

    // Create credit deduction log
    await CreditDeductionLog.create({
      trade_status: 'Completed',
      sent_to: seller.id,
      coin: 1,
      buy_sell_id: 0,
      cart_detail_id: cartDetail?.id,
      status: 'Success',
      deduction_from: 'Seller'
    } as any);

    // Send emails to buyer and seller
    try {
      // Get buyer details
      const buyer = await User.findByPk(userId);
      if (buyer && seller) {
        // Generate card name for email
        const cardName = tradingCard.title || `Trading Card #${tradingCard.id}`;
        
        // Calculate amounts
        const itemAmount = offerAmount;
        const shippingFee = 0; // Default shipping fee, can be updated based on business logic
        const totalAmount = itemAmount + shippingFee;
        
        // Generate transaction ID (using cart detail ID or trading card code)
        const transactionId = cartDetail?.id?.toString() || tradingCard.code || `TXN-${Date.now()}`;
        
        // Generate transaction list URL
        const transactionListUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/coin-purchase-history`;
        
        // Send email to buyer (purchase successful)
        await EmailHelperService.sendPurchaseSuccessfulEmail(
          buyer.email || '',
          buyer.first_name || '',
          buyer.last_name || '',
          cardName,
          itemAmount,
          shippingFee,
          totalAmount,
          transactionId,
          EmailHelperService.setName(seller.first_name || '', seller.last_name || ''),
          transactionListUrl
        );
        
        // Send email to seller (card sold)
        await EmailHelperService.sendCardSoldEmail(
          seller.email || '',
          seller.first_name || '',
          seller.last_name || '',
          EmailHelperService.setName(buyer.first_name || '', buyer.last_name || ''),
          cardName,
          itemAmount,
          shippingFee,
          totalAmount,
          transactionId,
          transactionListUrl
        );
        
        console.log('✅ Offer emails sent successfully to buyer and seller');
      }

      // Send Laravel-style payment completed notification
      if (cartDetail?.id) {
        await setTradersNotificationOnVariousActionBasis(
          'payment-completed',
          userId, // buyer
          seller.id, // seller
          cartDetail.id, // buy_offer->id
          'Offer'
        );
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send offer emails:', emailError);
      // Don't fail the request if email sending fails
    }

    return sendApiResponse(res, 200, true, "Successful offer, item added to cart.", [], {
      remaining_coins: seller.credit! - 1
    });

  } catch (error: any) {
    console.error('Cart offer error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};


export const cartOfferDealzone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { offer_amt_buyer } = req.body;
    const userId = req.user?.id;

    // Check if user is authenticated
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate input
    if (!id || !offer_amt_buyer) {
      return sendApiResponse(res, 400, false, "Trading card ID and offer amount are required", []);
    }

    const tradingCardId = parseInt(id);
    const offerAmount = parseFloat(offer_amt_buyer);

    if (isNaN(tradingCardId) || isNaN(offerAmount)) {
      return sendApiResponse(res, 400, false, "Invalid trading card ID or offer amount", []);
    }

    // Get trading card
    const tradingCard = await TradingCard.findByPk(tradingCardId);
    if (!tradingCard) {
      return sendApiResponse(res, 404, false, "Trading card not found", []);
    }

    // Get user's cart
    const cart = await Cart.findOne({
      where: { user_id: userId }
    });

    const cartProductCount = await CartDetail.count({
      where: { user_id: userId }
    });

    // Get seller
    const seller = await User.findByPk(tradingCard.trader_id!);
    if (!seller) {
      return sendApiResponse(res, 404, false, "Seller not found", []);
    }

    // Check seller's coins
    // if (seller.credit! <= 0) {
    //   return sendApiResponse(res, 400, false, "You can not submit this offer. The seller needs more credit for this transaction.", [], {
    //     action: 'contact_seller',
    //     seller_id: seller.id
    //   });
    // }

    // Validate offer attempts
    const makeOfferAttemptsResult = await makeOfferDealzoneAttempts(
      tradingCardId,
      offerAmount,
      tradingCard.dealzone_price ?? 0,
      userId
    );

    if (!makeOfferAttemptsResult.status) {
      const message = 'message' in makeOfferAttemptsResult ? makeOfferAttemptsResult.message : 'Offer validation failed';
      return sendApiResponse(res, 400, false, message, [], {
        inValidOfferCounts: makeOfferAttemptsResult.inValidOfferCounts,
        tradingCardId: tradingCardId,
        remaining: makeOfferAttemptsResult.remaining
      });
    }

    // Check if user is trying to buy their own product
    if (tradingCard.trader_id === userId) {
      return sendApiResponse(res, 400, false, "You can't buy your own product.", []);
    }

    // Check if product is available for sale
    if (tradingCard.can_buy !== '1') {
      return sendApiResponse(res, 400, false, "The product is not available for sale.", []);
    }

    // Check if product is already traded
    if (tradingCard.is_traded === '1') {
      return sendApiResponse(res, 400, false, "This product is already in a transaction.", []);
    }

    // Check cart seller consistency
    if (cart && cart.id && cart.seller_id !== tradingCard.trader_id) {
      return sendApiResponse(res, 400, false, "You cannot add this product to your cart. You have already added a product from another seller.", []);
    }

    let currentCart = cart;

    // Create cart if it doesn't exist
    if (!currentCart) {
      currentCart = await Cart.create({
        user_id: userId,
        seller_id: tradingCard.trader_id!,
        cart_amount: 0,
        shipping_fee: 0,
        total_amount: 0
      } as any);
    }

    // Check if product is already in cart
    const existingCartDetail = await CartDetail.findOne({
      where: {
        user_id: userId,
        product_id: tradingCardId
      }
    });

    let cartDetail;

    if (!existingCartDetail) {
      // Add product to cart - previous (UTC-based) timer behavior
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      cartDetail = await CartDetail.create({
        cart_id: currentCart.id,
        user_id: userId,
        product_id: tradingCardId,
        product_amount: offerAmount,
        hold_expires_at: holdExpiresAt
      } as any);

      // Mark trading card as traded
      await tradingCard.update({ is_traded: '1' });

      // Update or create buy offer attempt
      const existingOfferAttempt = await BuyOfferAttempt.findOne({
        where: {
          user_id: userId,
          product_id: tradingCardId
        }
      });

      if (existingOfferAttempt) {
        await existingOfferAttempt.update({ offer_amount: offerAmount });
      } else {
        await BuyOfferAttempt.create({
          user_id: userId,
          product_id: tradingCardId,
          attempts: 1,
          offer_amount: offerAmount
        } as any);
      }
    }

    // Calculate cart amounts
    const cartAmounts = await calcCartAmounts(currentCart.id, userId, null);
    await currentCart.update(cartAmounts);

    // Deduct seller's credits
    await seller.update({ credit: seller.credit! - 1 });

    // Create credit deduction log
    await CreditDeductionLog.create({
      trade_status: 'Completed',
      sent_to: seller.id,
      coin: 1,
      buy_sell_id: 0,
      cart_detail_id: cartDetail?.id,
      status: 'Success',
      deduction_from: 'Seller'
    } as any);

    // Send emails to buyer and seller
    try {
      // Get buyer details
      const buyer = await User.findByPk(userId);
      if (buyer && seller) {
        // Generate card name for email
        const cardName = tradingCard.title || `Trading Card #${tradingCard.id}`;
        
        // Calculate amounts
        const itemAmount = offerAmount;
        const shippingFee = 0; // Default shipping fee, can be updated based on business logic
        const totalAmount = itemAmount + shippingFee;
        
        // Generate transaction ID (using cart detail ID or trading card code)
        const transactionId = cartDetail?.id?.toString() || tradingCard.code || `TXN-${Date.now()}`;
        
        // Generate transaction list URL
        const transactionListUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/coin-purchase-history`;
        
        // Send email to buyer (purchase successful)
        await EmailHelperService.sendPurchaseSuccessfulEmail(
          buyer.email || '',
          buyer.first_name || '',
          buyer.last_name || '',
          cardName,
          itemAmount,
          shippingFee,
          totalAmount,
          transactionId,
          EmailHelperService.setName(seller.first_name || '', seller.last_name || ''),
          transactionListUrl
        );
        
        // Send email to seller (card sold)
        await EmailHelperService.sendCardSoldEmail(
          seller.email || '',
          seller.first_name || '',
          seller.last_name || '',
          EmailHelperService.setName(buyer.first_name || '', buyer.last_name || ''),
          cardName,
          itemAmount,
          shippingFee,
          totalAmount,
          transactionId,
          transactionListUrl
        );
        
        console.log('✅ Offer emails sent successfully to buyer and seller');
      }

      // Send Laravel-style payment completed notification
      if (cartDetail?.id) {
        await setTradersNotificationOnVariousActionBasis(
          'payment-completed',
          userId, // buyer
          seller.id, // seller
          cartDetail.id, // buy_offer->id
          'Offer'
        );
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send offer emails:', emailError);
      // Don't fail the request if email sending fails
    }

    return sendApiResponse(res, 200, true, "Successful offer, item added to cart.", [], {
      remaining_coins: seller.credit! - 1
    });

  } catch (error: any) {
    console.error('Cart offer error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get user's cart with details and addresses
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { addressId } = req.query;
    const addrId = addressId ? Number(addressId) : null;

    // Check if user is authenticated
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Get user's cart with cart details and products
    let cart = await Cart.findOne({
      where: { user_id: userId },
      include: [{
        model: CartDetail,
        as: 'cartDetails',
        include: [{
          model: TradingCard,
          as: 'product',
          include: [{
            model: Category,
            as: 'parentCategory',
            attributes: ['id', 'sport_name']
          }],
          attributes: [
            'id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 'title', 
            'trading_card_offer_accept_above', 'trader_id', 'free_shipping',
            'usa_shipping_flat_rate', 'usa_add_product_flat_rate', 
            'canada_shipping_flat_rate', 'canada_add_product_flat_rate', 'search_param'
          ]
        }]
      }]
    });

    // If cart exists, calculate and update cart amounts
    if (cart && cart.id) {
      const cartAmounts = await calcCartAmounts(cart.id, userId, addrId);
      await cart.update(cartAmounts);

      // Get updated cart with fresh data
      cart = await Cart.findOne({
        where: { user_id: userId },
        include: [{
          model: CartDetail,
          as: 'cartDetails',
          include: [{
            model: TradingCard,
            as: 'product',
            include: [{
              model: Category,
              as: 'parentCategory',
              attributes: ['id', 'sport_name']
            }],
            attributes: [
              'id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 
              'trading_card_offer_accept_above', 'trader_id', 'free_shipping',
              'usa_shipping_flat_rate', 'usa_add_product_flat_rate', 
              'canada_shipping_flat_rate', 'canada_add_product_flat_rate', 'search_param'
            ]
          }]
        }]
      });
    }

    // Get user's addresses
    const addresses = await Address.findAll({
      where: {
        user_id: userId,
        is_deleted: '0'
      },
      attributes: [
        'id', 'user_id', 'name', 'phone', 'email', 'street1', 'street2', 
        'city', 'state', 'country', 'zip', 'is_sender', 'is_deleted', 
        'latitude', 'longitude', 'adr_id', 'mark_default', 'created_at', 'updated_at'
      ]
    });

    // Transform cart data for frontend - previous (UTC-based) formatting
    const formatDateTime = (input: any): string | null => {
      if (!input) return null;
      const dt = new Date(input);
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = dt.getUTCFullYear();
      const mm = pad(dt.getUTCMonth() + 1);
      const dd = pad(dt.getUTCDate());
      const hh = pad(dt.getUTCHours());
      const mi = pad(dt.getUTCMinutes());
      const ss = pad(dt.getUTCSeconds());
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    };
    let cartData = null;
    if (cart && cart.id) {
      cartData = {
        id: cart.id,
        user_id: cart.user_id,
        seller_id: cart.seller_id,
        cart_amount: cart.cart_amount,
        shipping_fee: cart.shipping_fee,
        total_amount: cart.total_amount,
        created_at: cart.created_at,
        updated_at: cart.updated_at,
        cartDetails: (cart as any).cartDetails?.map((detail: any) => {
          const formattedTime = formatDateTime(detail.hold_expires_at);
          
          return {
            id: detail.id,
            cart_id: detail.cart_id,
            hold_expires_at: formattedTime,
            product_amount: detail.product_amount,
            product: detail.product ? {
              id: detail.product.id,
              trading_card_img: detail.product.trading_card_img,
              trading_card_slug: detail.product.trading_card_slug,
              trading_card_asking_price: detail.product.trading_card_asking_price,
              trading_card_offer_accept_above: detail.product.trading_card_offer_accept_above,
              trader_id: detail.product.trader_id,
              free_shipping: detail.product.free_shipping,
              usa_shipping_flat_rate: detail.product.usa_shipping_flat_rate,
              usa_add_product_flat_rate: detail.product.usa_add_product_flat_rate,
              canada_shipping_flat_rate: detail.product.canada_shipping_flat_rate,
              canada_add_product_flat_rate: detail.product.canada_add_product_flat_rate,
              search_param: detail.product.search_param,
              title: detail.product.title,
              sport_name: detail.product.parentCategory ? detail.product.parentCategory.sport_name : null
            } : null
          };
        }) || []
      };
    }

    // Transform addresses data for frontend
    const addressesData = addresses.map((address: any) => ({
      id: address.id,
      user_id: address.user_id,
      name: address.name,
      phone: address.phone,
      email: address.email,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      mark_default: address.mark_default
    }));

    return sendApiResponse(res, 200, true, "Cart data retrieved successfully", {
      cart: cartData,
      addresses: addressesData
    });

  } catch (error: any) {
    console.error('Get cart error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to generate code for trade and make offer request
const generateCodeForTradeAndMakeOfferRequest = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `DLX-${year}${month}${day}${randomNum}${hours}${minutes}${seconds}`;
};

// Helper function to set trade and offer status
const setTradeAndOfferStatus = async (alias: string, setFor: string, triggerId: number) => {
  try {
    if (setFor === 'offer') {
      const buyOfferStatus = await BuyOfferStatus.findOne({
        where: { alias: alias }
      });
      
      if (buyOfferStatus) {
        await BuySellCard.update(
          { buy_offer_status_id: buyOfferStatus.id },
          { where: { id: triggerId } }
        );
      }
    } else if (setFor === 'trade') {
      // Update TradeProposal status by alias
      const { TradeProposalStatus } = await import('../models/tradeProposalStatus.model.js');
      const { TradeProposal } = await import('../models/tradeProposal.model.js');

      const tradeStatus = await TradeProposalStatus.findOne({
        where: { alias }
      });

      if (tradeStatus) {
        const [affected] = await TradeProposal.update(
          { trade_proposal_status_id: tradeStatus.id },
          { where: { id: triggerId } }
        );
      } else {
        console.warn(`TradeProposalStatus alias not found: ${alias}`);
      }
    }
  } catch (error) {
    console.error('Error setting trade and offer status:', error);
  }
};

// Helper function to create notifications (Enhanced based on Laravel __setTradersNotificationOnVariousActionBasis)
// Fallback map if no template found (kept for safety)
const getNotificationData = (act: string, setFor: string) => {
  const notificationMap: any = {
    // Trade notifications
    'trade-sent': {
      status: true,
      messages: {
        sender: 'You have sent a trade proposal',
        receiver: 'You have received a new trade proposal'
      }
    },
    'trade-accepted': {
      status: true,
      messages: {
        sender: 'Your trade proposal has been accepted',
        receiver: 'You have accepted a trade proposal'
      }
    },
    'trade-declined': {
      status: true,
      messages: {
        sender: 'Your trade proposal has been declined',
        receiver: 'You have declined a trade proposal'
      }
    },
    'trade-cancelled': {
      status: true,
      messages: {
        sender: 'Your trade proposal has been cancelled',
        receiver: 'A trade proposal has been cancelled'
      }
    },
    'mark-completed-proposal': {
      status: true,
      messages: {
        sender: 'You have marked the trade as completed',
        receiver: 'The other party has marked the trade as completed'
      }
    },
    'give-review-to-trader': {
      status: true,
      messages: {
        sender: 'Please give a review to the trader',
        receiver: 'Please give a review to the trader'
      }
    },
    'shipped-by-sender': {
      status: true,
      messages: {
        sender: 'You have shipped your cards',
        receiver: 'The sender has shipped their cards'
      }
    },
    'shipped-by-receiver': {
      status: true,
      messages: {
        sender: 'The receiver has shipped their cards',
        receiver: 'You have shipped your cards'
      }
    },
    'both-traders-shipped': {
      status: true,
      messages: {
        sender: 'Both parties have shipped their cards',
        receiver: 'Both parties have shipped their cards'
      }
    },

    // Offer notifications
    'offer-sent': {
      status: true,
      messages: {
        sender: 'You have sent a buy offer',
        receiver: 'You have received a new buy offer'
      }
    },
    'offer-accepted': {
      status: true,
      messages: {
        sender: 'Your buy offer has been accepted',
        receiver: 'You have accepted a buy offer'
      }
    },
    'offer-declined': {
      status: true,
      messages: {
        sender: 'Your buy offer has been declined',
        receiver: 'You have declined a buy offer'
      }
    },
    'payment-made': {
      status: true,
      messages: {
        sender: 'You have made a payment',
        receiver: 'You have received a payment'
      }
    },
    'payment-received': {
      status: true,
      messages: {
        sender: 'Your payment has been received',
        receiver: 'You have received a payment'
      }
    },
    'payment-confirmed': {
      status: true,
      messages: {
        sender: 'Your payment has been confirmed',
        receiver: 'Payment has been confirmed'
      }
    },
    'paypal-business-details-not-available': {
      status: true,
      messages: {
        sender: 'PayPal business email is not available',
        receiver: 'Your PayPal business email is not available'
      }
    },
    'pay-to-continue-buy-sell-trade': {
      status: true,
      messages: {
        sender: 'Please pay to continue the buy/sell trade',
        receiver: 'Payment is required to continue the buy/sell trade'
      }
    },
    'submit-buy-offer': {
      status: true,
      messages: {
        sender: 'You have submitted a buy offer',
        receiver: 'You have received a new buy offer'
      }
    }
  };

  return notificationMap[act] || { status: false, messages: { sender: '', receiver: '' } };
};

// Process checkout function
export const processCheckout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check if user is authenticated
    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Get user's cart
    const cart = await Cart.findOne({
      where: { user_id: userId },
      include: [{
        model: CartDetail,
        as: 'cartDetails',
        include: [{
          model: TradingCard,
          as: 'product'
        }]
      }]
    });

    if (!cart || !cart.id) {
      return sendApiResponse(res, 400, false, "Your cart is empty", []);
    }

    // Check if user has default address
    const userDefaultAddress = await Address.findOne({
      where: {
        mark_default: 1,
        is_deleted: '0',
        user_id: userId
      }
    });

    if (!userDefaultAddress || !userDefaultAddress.id) {
      return sendApiResponse(res, 400, false, "Please add your shipping address, without shipping address you can not proceed for checkout", []);
    }

    // Get buyer and seller information
    const buyer = await User.findByPk(userId);
    const seller = await User.findByPk(cart.seller_id!);

    if (!buyer || !seller) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }

    // Process cart details
    let mainCard = 0;
    let tradingCardAskingPrice = 0;
    let tradingCardOfferAcceptAbove = 0;
    let offerAmtBuyer = 0;
    const buyOfferAttemptProducts: number[] = [];
    const cartWithDetails = cart as any;

    if (cartWithDetails.cartDetails && cartWithDetails.cartDetails.length === 1) {
      // Single item checkout
      const cartDetail = cartWithDetails.cartDetails[0];
      mainCard = cartDetail.product_id;
      tradingCardAskingPrice = cartDetail.product.trading_card_asking_price;
      tradingCardOfferAcceptAbove = cartDetail.product.trading_card_offer_accept_above;
      offerAmtBuyer = cartDetail.product_amount;

      // Mark trading card as traded
      await TradingCard.update(
        { is_traded: '1' },
        { where: { id: cartDetail.product_id } }
      );
    } else if (cartWithDetails.cartDetails && cartWithDetails.cartDetails.length > 1) {
      // Multiple items checkout
      for (const cartDetail of cartWithDetails.cartDetails) {
        buyOfferAttemptProducts.push(cartDetail.product_id);
      }
    }

    // Create buy offer record
    const buyOffer = await BuySellCard.create({
      code: generateCodeForTradeAndMakeOfferRequest(),
      seller: cart.seller_id,
      buyer: userId,
      main_card: mainCard,
      trading_card_asking_price: tradingCardAskingPrice,
      trading_card_offer_accept_above: tradingCardOfferAcceptAbove,
      offer_amt_buyer: offerAmtBuyer,
      products_offer_amount: cart.cart_amount,
      shipment_amount: cart.shipping_fee,
      total_amount: cart.total_amount,
      buying_status: 'new'
    } as any);

    // Update credit deduction logs
    await CreditDeductionLog.update(
      { buy_sell_id: buyOffer.id },
      { 
        where: { 
          sent_to: seller.id,
          status: 'Success'
        } 
      }
    );

    // Create buy offer products for multiple items
    if (buyOfferAttemptProducts.length > 0) {
      // Note: You'll need to create BuyOfferproduct model for this
      // For now, we'll skip this part as the model doesn't exist
    }

    // Create notifications
    await setTradersNotificationOnVariousActionBasis('submit-buy-offer', userId, cart.seller_id!, buyOffer.id, 'Offer');
    await setTradersNotificationOnVariousActionBasis('pay-to-continue-buy-sell-trade', cart.seller_id!, userId, buyOffer.id, 'Offer');

    // Set offer status
    await setTradeAndOfferStatus('offer-sent', 'offer', buyOffer.id);

    // Clean up cart and related data
    if (cartWithDetails.cartDetails) {
      await CartDetail.destroy({ where: { cart_id: cart.id } });
    }
    await cart.destroy();

    // Delete buy offer attempts
    if (buyOfferAttemptProducts.length > 0) {
      await BuyOfferAttempt.destroy({
        where: {
          user_id: userId,
          product_id: buyOfferAttemptProducts
        }
      });
    }

    return sendApiResponse(res, 200, true, "Your offer has been submitted successfully. Please proceed with the payment to complete the process.", {
      buy_offer_id: buyOffer.id
    });

  } catch (error: any) {
    console.error('Process checkout error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to format name
const setName = (fName?: string, lName?: string): string => {
  const nameArr: string[] = [];
  if (fName && fName.trim()) nameArr.push(fName.charAt(0).toUpperCase() + fName.slice(1).toLowerCase());
  if (lName && lName.trim()) nameArr.push(lName.charAt(0).toUpperCase() + lName.slice(1).toLowerCase());
  return nameArr.length > 0 ? nameArr.join(' ') : '';
};

// Helper function to feed PayPal payment submission
const feedPayPalPaymentSubmit = (refId: number, itemName: string, itemAmount: number, businessEmail: string) => {
  const enableSandbox = process.env.PAYPAL_SANDBOX === 'true' || process.env.PAYPAL_SANDBOX === '1';
  const paypalUrl = enableSandbox 
    ? (process.env.PAYPAL_SANDBOX_URL || 'https://www.sandbox.paypal.com/cgi-bin/webscr')
    : (process.env.PAYPAL_LIVE_URL || 'https://www.paypal.com/cgi-bin/webscr');
  
  // Use environment variables for all URLs with fallbacks
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const paypalReturnUrl = process.env.PAYPAL_RETURN_URL || `${frontendUrl}/feed-paypal-payment-buysell/thanks/${refId}`;
  const paypalCancelUrl = process.env.PAYPAL_CANCEL_URL || `${frontendUrl}/feed-paypal-payment-buysell/cancel/${refId}`;
  const paypalNotifyUrl = process.env.PAYPAL_NOTIFY_URL || `${frontendUrl}/notify/feed-paypal-payment-buysell/${refId}`;
  
  const paypalConfig = {
    email: businessEmail,
    return_url: paypalReturnUrl,
    cancel_url: paypalCancelUrl,
    notify_url: paypalNotifyUrl
  };

  // Return PayPal form data for frontend to submit
  return {
    paypal_url: paypalUrl,
    form_data: {
      cmd: '_xclick',
      business: paypalConfig.email,
      return: paypalConfig.return_url,
      cancel_return: paypalConfig.cancel_url,
      notify_url: paypalConfig.notify_url,
      item_name: itemName,
      amount: itemAmount,
      currency_code: 'USD',
      no_shipping: '1',
      no_note: '1',
      custom: refId.toString()
    }
  };
};

// Pay Now API
export const payNowPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    const { buy_offer_id } = req.body;

    if (!buy_offer_id) {
      return sendApiResponse(res, 400, false, "Buy offer ID is required", []);
    }

    // Find the buy sell card
    const buySellCard = await BuySellCard.findByPk(buy_offer_id);

    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "Buy offer not found", []);
    }

    // Check if trade is cancelled
    if (buySellCard.buying_status === 'cancel') {
      return sendApiResponse(res, 400, false, "Trade is cancelled", []);
    }

    // Check if main card exists and is available
    if (buySellCard.main_card && buySellCard.main_card > 0) {
      const allBuySellCards = await BuySellCard.findOne({
        where: {
          main_card: buySellCard.main_card,
          seller: buySellCard.seller,
          buyer: userId,
          buying_status: 'new'
        }
      });

      if (!allBuySellCards) {
        return sendApiResponse(res, 400, false, "The product is not available for sell!", []);
      }
    }

    const amount = buySellCard.total_amount;

    if (!buySellCard || !amount) {
      return sendApiResponse(res, 400, false, "Something went wrong!", []);
    }

    // Update payment initiation
    await buySellCard.update({
      is_payment_init: 1,
      payment_init_date: new Date()
    });

    // Update trading card status if main card exists
    if (buySellCard.main_card && buySellCard.main_card > 0) {
      await TradingCard.update(
        { 
          // can_trade: '0',
          // can_buy: '0'
        },
        { where: { id: buySellCard.main_card } }
      );
    }

    // Get seller profile
    if (!buySellCard.seller) {
      return sendApiResponse(res, 400, false, "Seller information not found", []);
    }

    const sellerProfile = await User.findByPk(buySellCard.seller);

    if (!sellerProfile) {
      return sendApiResponse(res, 404, false, "Seller not found", []);
    }

    // Check if seller has PayPal business email
    if (sellerProfile.paypal_business_email && sellerProfile.paypal_business_email.trim()) {
      // Generate PayPal payment configuration
      const itemName = `offer-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}-${buySellCard.code}`;
      const paypalConfig = feedPayPalPaymentSubmit(buySellCard.id, itemName, amount, sellerProfile.paypal_business_email);

      return sendApiResponse(res, 200, true, "Payment configuration ready", {
        paypal_url: paypalConfig.paypal_url,
        form_data: paypalConfig.form_data,
        amount: amount,
        item_name: itemName,
        payment_continue: true
      });
    } else {
      // Send notification about missing PayPal business email
      await setTradersNotificationOnVariousActionBasis('paypal-business-details-not-available', userId, buySellCard.seller, buySellCard.id, 'Offer');

      return sendApiResponse(res, 400, false, "The trader's PayPal business email address is not available. A notification has been sent successfully to the trader.", {
        payment_continue: false,
        error_type: 'paypal_email_missing'
      });
    }

  } catch (error: any) {
    console.error('Pay now payment error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to send payment completion notifications
const sendPaymentCompletionNotifications = async (buyOffer: any) => {
  try {
    // Send notification to buyer
    await setTradersNotificationOnVariousActionBasis('payment-made', buyOffer.buyer, buyOffer.seller, buyOffer.id, 'Offer');
    
    // Send notification to seller
    await setTradersNotificationOnVariousActionBasis('payment-received', buyOffer.seller, buyOffer.buyer, buyOffer.id, 'Offer');
  } catch (error) {
    console.error('Error sending payment completion notifications:', error);
  }
};

/**
 * Send payment confirmation emails for buy/sell transactions
 * Optimized and clean implementation based on Laravel requirements
 */
const sendPaymentConfirmationEmailsForBuySell = async (
  buyOffer: any, 
  buyer: any, 
  seller: any, 
  cardName: string
): Promise<void> => {
  try {
    // Validate required parameters
    if (!buyOffer || !buyer || !seller) {
      console.warn('⚠️ Missing required data for payment confirmation emails:', {
        buyOffer: !!buyOffer,
        buyer: !!buyer,
        seller: !!seller
      });
      return;
    }

    if (!buyer.email || !seller.email) {
      console.warn('⚠️ Missing email addresses for payment confirmation emails:', {
        buyerEmail: !!buyer.email,
        sellerEmail: !!seller.email
      });
      return;
    }

    // Prepare transaction data
    const proposedAmount = buyOffer.total_amount || 0;
    const transactionListUrl = `${process.env.FRONTEND_URL}/profile/deals/bought-sold`;

    // Prepare user names using EmailHelperService.setName (Laravel equivalent)
    const buyerName = EmailHelperService.setName(
      buyer.first_name || '', 
      buyer.last_name || ''
    );
    const sellerName = EmailHelperService.setName(
      seller.first_name || '', 
      seller.last_name || ''
    );

    // Email to buyer - "payment-confirmed-email-to-buyer"
    const buyerMailInputs = {
      to: buyer.email,
      tradebyname: buyerName,
      tradetoname: sellerName,
      cardyoureceive: cardName || 'Trading card',
      proposedamount: proposedAmount,
      transactionListUrl: transactionListUrl,
    };

    // Email to seller - "payment-confirmed-email-to-seller"
    const sellerMailInputs = {
      to: seller.email,
      tradebyname: buyerName,
      tradetoname: sellerName,
      cardyousend: cardName || 'Trading card',
      proposedamount: proposedAmount,
      transactionListUrl: transactionListUrl,
    };

    // Send both emails in parallel for better performance
    await Promise.all([
      EmailHelperService.executeMailSender('payment-confirmed-email-to-buyer', buyerMailInputs),
      EmailHelperService.executeMailSender('payment-confirmed-email-to-seller', sellerMailInputs)
    ]);

    console.log('✅ Payment confirmation emails sent successfully');

  } catch (emailError) {
    console.error('❌ Failed to send payment confirmation emails:', emailError);
    // Don't throw error to avoid breaking the main operation
  }
};

// Make offer payment function (internal)
const makeOfferPayment = async (id: number) => {
  try {
    const buyOffer = await BuySellCard.findByPk(id);

    if (!buyOffer) {
      return { error: 'Buy offer not found' };
    }

    // Update buy offer with payment details
    await buyOffer.update({
      paid_amount: buyOffer.total_amount || 0,
      amount_paid_on: new Date(),
      amount_pay_id: '',
      amount_payer_id: '',
      amount_pay_status: 'approved',
      paypal_response: '',
      buying_status: 'purchased',
      shiping_address: '',
      is_payment_received: 2
    } as any);

    // Update offer status
    await setTradeAndOfferStatus('payment-made', 'offer', buyOffer.id);

    // Handle main card or multiple products
    if (buyOffer.main_card && buyOffer.main_card > 0) {
      // Cancel related trade proposals for main card
      const mainCard = buyOffer.main_card;
      
      // Note: TradeProposals model would need to be implemented for this functionality
      // For now, we'll skip the trade cancellation logic
    } else {
      // Handle multiple products
      const buyOfferWithProducts = buyOffer as any;
      if (buyOfferWithProducts.buy_offer_product && buyOfferWithProducts.buy_offer_product.length > 0) {
        for (const product of buyOfferWithProducts.buy_offer_product) {
          // Cancel related trade proposals for each product
        }
      }
    }

    // Get buyer and seller details
    const buyer = await User.findByPk(buyOffer.buyer);
    const seller = await User.findByPk(buyOffer.seller);

    if (!buyer || !seller) {
      return { error: 'User not found' };
    }

    // Generate card name for email
    let cardName = '';
    if (buyOffer.main_card && buyOffer.main_card > 0) {
      const tradingCard = await TradingCard.findByPk(buyOffer.main_card);
      if (tradingCard && tradingCard.search_param) {
        cardName = `1. ${tradingCard.search_param}`;
      }
    } else {
      // Handle multiple products for email
      const buyOfferProducts = await BuyOfferAttempt.findAll({
        where: { product_id: buyOffer.id } as any,
        include: [{ model: TradingCard, as: 'product' }]
      });

      if (buyOfferProducts && buyOfferProducts.length > 0) {
        const cardNamesArray: string[] = [];
        let cnt = 1;
        for (const item of buyOfferProducts) {
          const itemWithProduct = item as any;
          if (itemWithProduct.product && itemWithProduct.product.search_param) {
            cardNamesArray.push(`${cnt}. ${itemWithProduct.product.search_param}`);
            cnt++;
          }
        }
        if (cardNamesArray.length > 0) {
          cardName = cardNamesArray.join(', ');
        }
      }
    }

    // Send email notifications (simplified - would need email service implementation)

    // Send payment completion notifications
    await sendPaymentCompletionNotifications(buyOffer);

    return {
      url: `/bought-and-sold-products/${buyOffer.id}`,
      success: 'Thank you for your purchase. Your payment has been processed successfully.'
    };

  } catch (error: any) {
    console.error('Make offer payment error:', error);
    return { error: error.message || 'Internal server error' };
  }
};

// Unified PayPal Payment Return API (handles both success and cancel)
export const feedPayPalPaymentReturn = async (req: Request, res: Response) => {
  try {
    const { refId, type } = req.params; // type can be 'thanks' or 'cancel'

    // Cache headers are now handled globally by noCache middleware

    // Check for conditional requests (If-None-Match, If-Modified-Since)
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    const currentETag = `"${refId}-${type}-${Date.now()}"`;
    
    // Check if this is a duplicate request (same refId and type within short time)
    const requestKey = `${refId}-${type}`;
    const now = Date.now();
    
    // For payment processing, we should not return 304 as it's a critical operation
    // But we can implement conditional logic for non-critical responses
    if (ifNoneMatch && ifNoneMatch === currentETag) {
      // For payment processing, we'll still process but log the conditional request
    }

    // Optional: Return 304 for duplicate requests within 5 seconds
    // Uncomment the following block if you want to return 304 for duplicate requests
    /*
    if (global.requestCache && global.requestCache[requestKey]) {
      const timeDiff = now - global.requestCache[requestKey];
      if (timeDiff < 5000) { // 5 seconds
        return res.status(304).end();
      }
    }
    global.requestCache = global.requestCache || {};
    global.requestCache[requestKey] = now;
    */

    if (!refId) {
      return sendApiResponse(res, 400, false, "Reference ID is required", []);
    }

    if (!type || !['thanks', 'cancel'].includes(type)) {
      return sendApiResponse(res, 400, false, "Invalid return type. Must be 'thanks' or 'cancel'", []);
    }

    const buyOffer = await BuySellCard.findByPk(refId);

    if (!buyOffer) {
      return sendApiResponse(res, 404, false, "Buy offer not found", []);
    }

    if (type === 'thanks') {
      // Handle success case
      const returnData = await makeOfferPayment(parseInt(refId));

      if (returnData.error) {
        return sendApiResponse(res, 400, false, returnData.error, []);
      }

      if (returnData.url) {
        return sendApiResponse(res, 200, true, returnData.success, {
          redirect_url: returnData.url
        });
      } else {
        return sendApiResponse(res, 200, true, "Your offer has been submitted successfully. Check Email for more info.", {
          transaction_list_url: `/bought-and-sold-products`,
          buy_sell_card_id: refId
        });
      }
    } else if (type === 'cancel') {
      // Handle cancel case
      // await buyOffer.update({
      //   buying_status: 'cancelled',
      //   is_payment_init: 0
      // });

      return sendApiResponse(res, 200, true, "User declined the payment", {
        redirect_url: `/bought-and-sold-products`
      });
    }

  } catch (error: any) {
    console.error('PayPal payment return error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// PayPal Payment Notify API
export const feedPayPalPaymentNotify = async (req: Request, res: Response) => {
  try {
    const { refId } = req.params;

    if (!refId) {
      return sendApiResponse(res, 400, false, "Reference ID is required", []);
    }

    const buyOffer = await BuySellCard.findByPk(refId);

    if (!buyOffer) {
      return sendApiResponse(res, 404, false, "Buy offer not found", []);
    }
console.log("shipment Cancel1");
    // Update buy offer status to cancelled
    await buyOffer.update({
      buying_status: 'cancelled',
      is_payment_init: 0
    });

    return sendApiResponse(res, 200, true, "User declined the payment", {
      redirect_url: `/bought-and-sold-products`
    });

  } catch (error: any) {
    console.error('PayPal payment notify error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Complete Trade Sender API (based on Laravel complete_trade_sender function)
export const completeTradeSender = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trade_proposal_id } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_proposal_id) {
      return sendApiResponse(res, 400, false, "Trade proposal ID is required", []);
    }

    // Find trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_proposal_id);

    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }


    // Check if user is the sender
    if (tradeProposal.trade_sent_by === userId) {
      
      // Update sender confirmation
      await tradeProposal.update({
        trade_sender_confrimation: '1'
      });

      // Send notification
      await setTradersNotificationOnVariousActionBasis('mark-completed-proposal', tradeProposal.trade_sent_by!, tradeProposal.trade_sent_to!, tradeProposal.id, 'Trade');

      // Get products for trading card updates
      const sendProducts = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveProducts = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      const allProducts = [...sendProducts, ...receiveProducts];

      // Reload trade proposal to get updated confirmation status
      await tradeProposal.reload();

      // Check if both parties have confirmed
      if (tradeProposal.receiver_confirmation === '1') {
        // Mark trade as complete
        await tradeProposal.update({
          trade_status: 'complete'
        });

        // Create TradeTransaction record and handle all completion tasks
        await tradeTransactionInsert(tradeProposal.id);

        // Send review notification
        await setTradersNotificationOnVariousActionBasis('give-review-to-trader', tradeProposal.trade_sent_to!, tradeProposal.trade_sent_by!, tradeProposal.id, 'Trade');

        // Update trading cards status (keep as is_traded = '0' for availability)
        if (allProducts.length > 0) {
          await TradingCard.update(
            { is_traded: '0' },
            { where: { id: { [Op.in]: allProducts } } }
          );
        }
      }

    // Send completion email per Laravel logic
    await sendMarkedAsCompletedEmails(userId, tradeProposal);

      // Set trade status
      await setTradeAndOfferStatus('marked-trade-completed-by-sender', 'trade', tradeProposal.id);

      // Determine response based on confirmation status
      if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation === '1') {
        return sendApiResponse(res, 200, true, "Trade completed successfully", {
          redirect_url: `/completed-trades?id=${trade_proposal_id}`,
          status: 'completed'
        });
      } else if (tradeProposal.trade_sender_confrimation !== '1' && tradeProposal.receiver_confirmation === '1') {
        return sendApiResponse(res, 200, true, "You have marked this trade as completed", {
          redirect_url: `/ongoing-trades?id=${tradeProposal.id}&filter=partially_completed`,
          status: 'partially_completed'
        });
      } else if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation !== '1') {
        return sendApiResponse(res, 200, true, "You have marked this trade as completed", {
          redirect_url: `/ongoing-trades?id=${tradeProposal.id}&filter=partially_completed`,
          status: 'partially_completed'
        });
      }

    } else if (tradeProposal.trade_sent_to === userId) {
      
      // Update receiver confirmation
      await tradeProposal.update({
        receiver_confirmation: '1'
      });

      // Send notification
      await setTradersNotificationOnVariousActionBasis('mark-completed-proposal', tradeProposal.trade_sent_to!, tradeProposal.trade_sent_by!, tradeProposal.id, 'Trade');

      // Reload trade proposal to get updated confirmation status
      await tradeProposal.reload();

      // Check if both parties have confirmed
      if (tradeProposal.trade_sender_confrimation === '1') {
        // Mark trade as complete
        await tradeProposal.update({
          trade_status: 'complete'
        });

        // Create TradeTransaction record and handle all completion tasks
        await tradeTransactionInsert(tradeProposal.id);

        // Send review notification
        await setTradersNotificationOnVariousActionBasis('give-review-to-trader', tradeProposal.trade_sent_by!, tradeProposal.trade_sent_to!, tradeProposal.id, 'Trade');

        // Get products for trading card updates
        const sendProducts = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
        const receiveProducts = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
        const allProducts = [...sendProducts, ...receiveProducts];

        // Update trading cards status (keep as is_traded = '0' for availability)
        if (allProducts.length > 0) {
          await TradingCard.update(
            { is_traded: '0' },
            { where: { id: { [Op.in]: allProducts } } }
          );
        }
      }

    // Send completion email per Laravel logic
    await sendMarkedAsCompletedEmails(userId, tradeProposal);

      // Set trade status
      await setTradeAndOfferStatus('marked-trade-completed-by-receiver', 'trade', tradeProposal.id);

      // Determine response based on confirmation status
      if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation === '1') {
        return sendApiResponse(res, 200, true, "Trade completed successfully", {
          redirect_url: `/completed-trades?id=${trade_proposal_id}`,
          status: 'completed'
        });
      } else if (tradeProposal.trade_sender_confrimation !== '1' && tradeProposal.receiver_confirmation === '1') {
        return sendApiResponse(res, 200, true, "You have marked this trade as completed", {
          redirect_url: `/ongoing-trades?id=${tradeProposal.id}&filter=partially_completed`,
          status: 'partially_completed'
        });
      } else if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation !== '1') {
        return sendApiResponse(res, 200, true, "You have marked this trade as completed", {
          redirect_url: `/ongoing-trades?id=${tradeProposal.id}&filter=partially_completed`,
          status: 'partially_completed'
        });
      }

    } else {
      return sendApiResponse(res, 403, false, "You are not authorized to complete this trade", []);
    }

  } catch (error: any) {
    console.error('Complete trade sender error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Trade Transaction Insert Function (based on Laravel trade_transcation_insert)
export const tradeTransactionInsert = async (tradeProposalId: number): Promise<boolean> => {
  try {
    // Check if TradeTransaction already exists
    const existingTransaction = await TradeTransaction.findOne({
      where: { trade_proposal_id: tradeProposalId }
    });

    if (existingTransaction) {
      return true; // Return true since transaction exists
    }

    // Get trade proposal data
    const tradeProposal = await TradeProposal.findByPk(tradeProposalId, {
      include: [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'tradeReceiver', 
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!tradeProposal) {
      return false;
    }

    // Get main card name
    let mainCardName = '';
    if (tradeProposal.main_card) {
      const mainCard = await TradingCard.findByPk(tradeProposal.main_card, {
        attributes: ['search_param']
      });
      mainCardName = mainCard?.search_param || '';
    }

    // Check if notification exists for use_request_card_first
    const notificationExists = await TradeNotification.count({
      where: { trade_proposal_id: tradeProposalId }
    });
    const useRequestCardFirst = notificationExists > 0 ? '1' : '0';

    // Prepare TradeTransaction data
    const transactionData = {
      order_id: tradeProposal.code,
      trade_proposal_id: tradeProposalId,
      trade_sent_by_key: tradeProposal.trade_sent_by,
      trade_sent_by_value: (tradeProposal as any).tradeSender?.username || '',
      trade_sent_to_key: tradeProposal.trade_sent_to,
      trade_sent_to_value: (tradeProposal as any).tradeReceiver?.username || '',
      trade_amount_paid_on: tradeProposal.trade_amount_paid_on,
      trade_amount_pay_id: tradeProposal.trade_amount_pay_id,
      trade_amount_payer_id: tradeProposal.trade_amount_payer_id,
      trade_amount_amount: tradeProposal.trade_amount_amount,
      trade_amount_pay_status: tradeProposal.trade_amount_pay_status,
      main_card_id: tradeProposal.main_card,
      main_card_name: mainCardName,
      receive_cards: tradeProposal.receive_cards,
      send_cards: tradeProposal.send_cards,
      use_request_card_first: useRequestCardFirst,
      add_cash: tradeProposal.add_cash,
      ask_cash: tradeProposal.ask_cash,
      message: tradeProposal.message,
      counter_personalized_message: tradeProposal.counter_personalized_message,
      sender_track_id: tradeProposal.trade_sender_track_id,
      receiver_track_id: tradeProposal.trade_receiver_track_id,
      admin_sender_track_id: tradeProposal.admin_sender_track_id,
      admin_receiver_track_id: tradeProposal.admin_receiver_track_id,
      confirmation_from_sender: tradeProposal.trade_sender_confrimation,
      confirmation_from_receiver: tradeProposal.receiver_confirmation,
      trade_created_at: tradeProposal.created_at,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Create TradeTransaction record
    await TradeTransaction.create(transactionData as any);

    // Transfer card ownership
    await transferCardOwnership(tradeProposal);

    // Update users as veteran users
    await User.update(
      { is_veteran_user: true },
      { where: { id: [tradeProposal.trade_sent_by!, tradeProposal.trade_sent_to!] } }
    );

    // Send completion emails
    await sendTradeCompletionEmails(tradeProposal);

    return true;

  } catch (error: any) {
    console.error('Error in tradeTransactionInsert:', error);
    return false;
  }
};

// Helper function to transfer card ownership
const transferCardOwnership = async (tradeProposal: any): Promise<void> => {
  try {
    const sendCards = tradeProposal.send_cards ? 
      tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id)) : [];
    const receiveCards = tradeProposal.receive_cards ? 
      tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id)) : [];

    // Transfer send_cards ownership: from sender to receiver
    if (sendCards.length > 0) {
      await TradingCard.update({
        trader_id: tradeProposal.trade_sent_to,
        previous_owner_id: tradeProposal.trade_sent_by,
        trading_card_status: '0',
        // seller_notes: '',
        // shipping_details: '',
        updated_at: new Date()
      }, {
        where: { id: { [Op.in]: sendCards } }
      });
    }

    // Transfer receive_cards ownership: from receiver to sender  
    if (receiveCards.length > 0) {
      await TradingCard.update({
        trader_id: tradeProposal.trade_sent_by,
        previous_owner_id: tradeProposal.trade_sent_to,
        trading_card_status: '0',
        // seller_notes: '',
        // shipping_details: '',
        updated_at: new Date()
      }, {
        where: { id: { [Op.in]: receiveCards } }
      });
    }

  } catch (error: any) {
    console.error('❌ Error transferring card ownership:', error);
  }
};

// Helper function to send trade completion emails
const sendTradeCompletionEmails = async (tradeProposal: any): Promise<void> => {
  try {
    const senderUser = (tradeProposal as any).tradeSender;
    const receiverUser = (tradeProposal as any).tradeReceiver;

    if (!senderUser || !receiverUser) {
      console.error('❌ Sender or receiver user data not found for emails');
      return;
    }

    const transactionListUrl = `${process.env.FRONTEND_URL}/profile/deals/complete?id=${tradeProposal.id}`;
    const senderName = `${senderUser.first_name || ''} ${senderUser.last_name || ''}`.trim() || senderUser.username;
    const receiverName = `${receiverUser.first_name || ''} ${receiverUser.last_name || ''}`.trim() || receiverUser.username;

    // Email to sender
    const senderMailInputs = {
      to: senderUser.email,
      name: senderName,
      transaction_id: tradeProposal.code,
      leavefeedbacklink: transactionListUrl,
    };

    // Email to receiver
    const receiverMailInputs = {
      to: receiverUser.email,
      name: receiverName,
      transaction_id: tradeProposal.code,
      leavefeedbacklink: transactionListUrl,
    };

    // Send emails using EmailHelperService
    await EmailHelperService.executeMailSender('share-your-feedback-trade', senderMailInputs);
    await EmailHelperService.executeMailSender('share-your-feedback-trade', receiverMailInputs);


  } catch (error: any) {
    console.error('❌ Error sending trade completion emails:', error);
  }
};


// Payment Confirmation API (based on Laravel ___isPaymentReceive function)
export const confirmPaymentReceived = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendApiResponse(res, 400, false, "Buy offer ID is required", []);
    }

    // Find the buy offer
    const buyOffer = await BuySellCard.findByPk(id);

    if (!buyOffer) {
      return sendApiResponse(res, 404, false, "Buy offer not found", []);
    }

    // Update payment received status
    await buyOffer.update({
      is_payment_received: 1,
      payment_received_on: new Date()
    });

    // Set trade and offer status
    await setTradeAndOfferStatus('payment-confirmed', 'offer', buyOffer.id);

    // Send notification
    await setTradersNotificationOnVariousActionBasis('payment-received', buyOffer.buyer!, buyOffer.seller!, buyOffer.id, 'Offer');

    // Send payment confirmation emails
    const buyer = await User.findByPk(buyOffer.buyer);
    const seller = await User.findByPk(buyOffer.seller);
    
    if (buyer && seller) {
      // Get card name for email
      let cardName = 'Trading card';
      if (buyOffer.main_card && buyOffer.main_card > 0) {
        const tradingCard = await TradingCard.findByPk(buyOffer.main_card);
        if (tradingCard && tradingCard.title) {
          cardName = `1. ${tradingCard.title}`;
        }
      }
      
      await sendPaymentConfirmationEmailsForBuySell(buyOffer, buyer, seller, cardName);
    }

    return sendApiResponse(res, 200, true, "Payment confirmation received", []);

  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Remove item from cart API
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!id) {
      return sendApiResponse(res, 400, false, "Cart item ID is required", []);
    }

    // Find the cart item
    const cartItem = await CartDetail.findOne({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!cartItem) {
      return sendApiResponse(res, 404, false, "Cart item not found", []);
    }

    const cartId = cartItem.cart_id;

    // Get the product and seller information
    const product = await TradingCard.findByPk(cartItem.product_id);
    
    if (product) {
      const seller = await User.findByPk(product.trader_id);
      
      if (seller) {
        // Refund 1 coin to seller
        await seller.update({
          credit: (seller.credit || 0) + 1
        });

        // Update credit deduction log to refund status
        const creditLog = await CreditDeductionLog.findOne({
          where: {
            sent_to: seller.id,
            status: 'Success',
            cart_detail_id: cartItem.id
          }
        });

        if (creditLog) {
          await creditLog.update({
            status: 'Refund',
            coin: 1
          });
        }
      }
    }

    // Delete the cart item
    await cartItem.destroy();

    // Update trading card status
    await TradingCard.update(
      { is_traded: '0' },
      { where: { id: cartItem.product_id } }
    );

    // Check if cart is empty and delete if so
    const remainingItems = await CartDetail.findAll({
      where: {
        user_id: userId,
        cart_id: cartId
      }
    });

    // Get addressId from request if available, otherwise set to null
    const addressId = (req as any).addressId?.id || null;

    if (remainingItems.length === 0) {
      await Cart.destroy({
        where: {
          user_id: userId,
          id: cartId
        }
      });
    } else {
      // Recalculate cart amounts
      const cartAmounts = await calcCartAmounts(cartId, userId, addressId);
      await Cart.update(cartAmounts, {
        where: { id: cartId }
      });
    }

    return sendApiResponse(res, 200, true, "Product removed successfully from cart", []);

  } catch (error: any) {
    console.error('Remove cart item error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Trade proposal API
export const tradeProposal = async (req: Request, res: Response) => {
  try {
    const { card_id, interested_user } = req.params;
    const userId = (req as any).user?.id;
    const user = (req as any).user;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!card_id || !interested_user) {
      return sendApiResponse(res, 400, false, "Card ID and interested user are required", []);
    }

    // Check if user is trying to trade with themselves
    if (interested_user === user.username) {
      return sendApiResponse(res, 400, false, "You can't trade with yourself", []);
    }

    // Find the interested user
    const interestedUser = await User.findOne({
      where: { username: interested_user }
    });

    if (!interestedUser) {
      return sendApiResponse(res, 404, false, "Interested user not found", []);
    }

    // Get user's trading cards (available for trade)
    const userClosets = await TradingCard.findAll({
      where: {
        trader_id: userId,
        can_trade: '1',
        trading_card_status: '1',
        is_traded: '0',
        on_dealzone: '0',
        mark_as_deleted: null
      },
      attributes: [
        'id',
        'trader_id',
        'search_param',
        'title',
        'trading_card_img',
        'category_id',
        'trading_card_estimated_value'
      ],
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }
      ]
    });

    if (!userClosets || userClosets.length === 0) {
      return sendApiResponse(res, 400, false, "Sorry! You can't trade without having any items in your locker. Please add items.", []);
    }

    // Get interested user's trading cards (available for trade)
    const interestedClosets = await TradingCard.findAll({
      where: {
        trader_id: interestedUser.id,
        can_trade: '1',
        trading_card_status: '1',
        is_traded: '0',
        on_dealzone: '0',
        mark_as_deleted: null
      },
      attributes: [
        'id',
        'trader_id',
        'search_param',
        'title',
        'trading_card_img',
        'category_id',
        'trading_card_estimated_value'
      ],
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }
      ]
    });

    // Count interested user's available products (for trade or buy)
    const productCount = await TradingCard.count({
      where: {
        trader_id: interestedUser.id,
        trading_card_status: '1',
        is_traded: '0',
        mark_as_deleted: null,
        [Op.or]: [
          { can_trade: '1' },
          { can_buy: '1' }
        ]
      }
    });

    // Get total trades count for interested user
    const totalTradesCount = await sequelize.query(`
      SELECT COUNT(*) as total_trades
      FROM trade_transactions tt
      WHERE tt.trade_sent_by_key = :interestedUserId 
         OR tt.trade_sent_to_key = :interestedUserId
    `, {
      replacements: { interestedUserId: interestedUser.id },
      type: QueryTypes.SELECT
    }) as any[];

    const totalTrades = totalTradesCount[0]?.total_trades || 0;

    // Check if current user follows the interested user
    const follower = await Follower.findOne({
      where: {
        trader_id: interestedUser.id,
        user_id: userId
      }
    });

    // Prepare response data
    const responseData = {
      main_card_id: parseInt(card_id),
      interested_user: {
        id: interestedUser.id,
        username: interestedUser.username,
        first_name: interestedUser.first_name,
        last_name: interestedUser.last_name,
        profile_picture: interestedUser.profile_picture,
        product_count: productCount,
        total_trades_count: totalTrades
      },
      user_closets: userClosets.map(card => ({
        id: card.id,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || null
      })),
      interested_closets: interestedClosets.map(card => ({
        id: card.id,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || null
      })),
      is_following: !!follower
    };

    return sendApiResponse(res, 200, true, "Trade proposal data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Trade proposal error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to generate trade code
const generateTradeCode = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `DLX-${year}${month}${day}${random}${hours}${minutes}${seconds}`;
};


// Propose Trade API
export const proposeTrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = (req as any).user;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    const {
      sendcard,
      receivecard,
      trader_id_r,
      main_card,
      add_cash,
      ask_cash,
      message
    } = req.body;

    // Validation
    if (!sendcard || !receivecard || !trader_id_r) {
      return sendApiResponse(res, 400, false, "Please select products you want to send and receive, and select trader you want to trade with.", []);
    }

    if (!Array.isArray(sendcard) || !Array.isArray(receivecard)) {
      return sendApiResponse(res, 400, false, "Send cards and receive cards must be arrays", []);
    }

    if (sendcard.length === 0 || receivecard.length === 0) {
      return sendApiResponse(res, 400, false, "Please select at least one card to send and receive", []);
    }

    // Check if user is trying to trade with themselves
    if (parseInt(trader_id_r) === userId) {
      return sendApiResponse(res, 400, false, "You can't trade with yourself", []);
    }

    // Check if cards are already traded
    const allProducts = [...sendcard, ...receivecard];
    const tradedCards = await TradingCard.findAll({
      where: {
        id: { [Op.in]: allProducts },
        is_traded: '1',
        mark_as_deleted: null
      },
      attributes: ['id', 'title']
    });

    if (tradedCards.length > 0) {
      const tradedProducts = tradedCards.map(card => card.title).join(', ');
      return sendApiResponse(res, 400, false, `You can not continue this trade. Below products are already in trade or buy/sell: ${tradedProducts}`, []);
    }

    // Check user's CXP coins
    const userCoins = await User.findByPk(userId, {
      attributes: ['id', 'credit']
    });

    if (!userCoins) {
      return sendApiResponse(res, 404, false, "User not found", []);
    }

    // Check if user has made any transactions this month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = await CreditDeductionLog.count({
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('created_at')), currentMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('created_at')), currentYear),
          { status: 'Success' },
          {
            [Op.or]: [
              { sent_by: userId },
              { sent_to: userId }
            ]
          }
        ]
      }
    });

    if (monthlyTransactions > 0) {
      if (!userCoins.credit || userCoins.credit <= 0) {
        return sendApiResponse(res, 400, false, "You need more credits to complete this trade.", []);
      }
    }

    // Validate cash fields
    let finalAddCash = null;
    let finalAskCash = null;

    if (add_cash && add_cash !== '0' && add_cash !== 0) {
      finalAddCash = parseFloat(add_cash.toString().replace(/,/g, ''));
    }

    if (ask_cash && ask_cash !== '0' && ask_cash !== 0) {
      finalAskCash = parseFloat(ask_cash.toString().replace(/,/g, ''));
    }

    if (finalAddCash && finalAskCash) {
      return sendApiResponse(res, 400, false, "You can't trade with both (Amount you will get & Amount you will pay).", []);
    }

    // Mark cards as traded
    for (const cardId of sendcard) {
      const card = await TradingCard.findByPk(cardId);
      if (card) {
        if (card.is_traded === '1') {
          return sendApiResponse(res, 400, false, "This trade cannot be modified as it has already been accepted.", []);
        }
        await card.update({ is_traded: '1' });
      }
    }

    for (const cardId of receivecard) {
      const card = await TradingCard.findByPk(cardId);
      if (card) {
        if (card.is_traded === '1') {
          return sendApiResponse(res, 400, false, "This trade cannot be modified as it has already been accepted.", []);
        }
        await card.update({ is_traded: '1' });
      }
    }

    // Create trade proposal
    const tradeProposal = await TradeProposal.create({
      code: generateTradeCode(),
      trade_sent_by: userId,
      trade_sent_to: parseInt(trader_id_r),
      main_card: parseInt(main_card),
      send_cards: sendcard.join(','),
      receive_cards: receivecard.join(','),
      add_cash: finalAddCash,
      ask_cash: finalAskCash,
      message: message || null,
      trade_status: 'new',
      is_new: '1',
      trade_sender_confrimation: '0',
      receiver_confirmation: '0',
      created_at: new Date(),
      updated_at: new Date()
    } as any);

    // Set trade proposal status
    await setTradeProposalStatus(tradeProposal.id, 'trade-sent');

    // Deduct user's credits if needed
    if (monthlyTransactions > 0 && userCoins.credit && userCoins.credit > 0) {
      await userCoins.update({ credit: userCoins.credit - 1 });

      // Create credit deduction log
      await CreditDeductionLog.create({
        trade_status: 'Completed',
        sent_to: parseInt(trader_id_r),
        coin: 1,
        buy_sell_id: 0,
        cart_detail_id: 0,
        status: 'Success',
        deduction_from: 'Sender'
      } as any);
    }

    // Send notifications
    await sendTradeNotifications('send-proposal', userId, parseInt(trader_id_r), tradeProposal.id);

    // Send initial trade emails (Laravel parity)
    await sendNewTradeProposalEmails(tradeProposal);

    // Prepare response data
    const responseData = {
      trade_proposal_id: tradeProposal.id,
      code: tradeProposal.code,
      trade_sent_by: userId,
      trade_sent_to: parseInt(trader_id_r),
      main_card: parseInt(main_card),
      send_cards: sendcard,
      receive_cards: receivecard,
      add_cash: finalAddCash,
      ask_cash: finalAskCash,
      message: message,
      trade_status: 'new',
      created_at: tradeProposal.created_at
    };

    return sendApiResponse(res, 200, true, "New trade proposed successfully!", responseData);

  } catch (error: any) {
    console.error('Propose trade error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to set trade proposal status
const setTradeProposalStatus = async (tradeProposalId: number, statusAlias: string): Promise<void> => {
  try {
    const tradeProposalStatus = await TradeProposalStatus.findOne({
      where: { alias: statusAlias }
    });

    if (tradeProposalStatus) {
      await TradeProposal.update(
        { trade_proposal_status_id: tradeProposalStatus.id },
        { where: { id: tradeProposalId } }
      );
    }
  } catch (error) {
    console.error('Error setting trade proposal status:', error);
  }
};

// Helper function to send trade notifications
const sendTradeNotifications = async (action: string, sentBy: number, sentTo: number, tradeProposalId: number, senderAlias: string = 'The', receiverAlias: string = 'The', senderStatus: string = 'cancelled', receiverStatus: string = 'cancelled'): Promise<void> => {
  try {
    // Get sender and receiver user details
    const sender = await User.findByPk(sentBy);
    const receiver = await User.findByPk(sentTo);

    if (!sender || !receiver) return;

    // Create notification for receiver
    await TradeNotification.create({
      notification_sent_by: sentBy,
      notification_sent_to: sentTo,
      trade_proposal_id: tradeProposalId,
      message: `${senderAlias} trade has been ${receiverStatus} by ${sender.first_name} ${sender.last_name}.`
    } as any);

    // Create notification for sender
    await TradeNotification.create({
      notification_sent_by: sentTo,
      notification_sent_to: sentBy,
      trade_proposal_id: tradeProposalId,
      message: `Your trade has been ${senderStatus} successfully.`
    } as any);
  } catch (error) {
    console.error('Error sending trade notifications:', error);
  }
};

// Helper function to send trade email notifications (matches Laravel email functionality)
const sendTradeEmailNotifications = async (tradeProposal: any, status: string, action: string): Promise<void> => {
  try {
    const sender = tradeProposal.tradeSender;
    const receiver = tradeProposal.tradeReceiver;
    
    if (!sender || !receiver) return;

    // Get card details
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    const sentCards = await TradingCard.findAll({
      where: { id: { [Op.in]: sendCards } },
      attributes: ['title']
    });

    const receivedCards = await TradingCard.findAll({
      where: { id: { [Op.in]: receiveCards } },
      attributes: ['title']
    });

    const itemsSend = sentCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');
    const itemsReceived = receivedCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');

    const proposedAmount = tradeProposal.add_cash || tradeProposal.ask_cash || 0;
    const message = tradeProposal.message || 'N/A';

    // Determine cash captions
    let proposedAmountCaptionBy = '';
    let proposedAmountCaptionTo = '';
    
    if (tradeProposal.add_cash && tradeProposal.add_cash > 0) {
      proposedAmountCaptionTo = ' (You get)';
      proposedAmountCaptionBy = ' (You pay)';
    } else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) {
      proposedAmountCaptionTo = ' (You pay)';
      proposedAmountCaptionBy = ' (You get)';
    }

    // Send email to receiver
    const receiverEmailData = {
      to: receiver.email,
      tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      cardyousend: itemsReceived.replace(/\n/g, '<br>'),
      cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
      proposedamount: `${proposedAmount}${proposedAmountCaptionTo}`,
      message: message,
      reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
      transaction_id: tradeProposal.code
    };

    // Send email to sender
    const senderEmailData = {
      to: sender.email,
      tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      cardyousend: itemsSend.replace(/\n/g, '<br>'),
      cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
      proposedamount: `${proposedAmount}${proposedAmountCaptionBy}`,
      message: message,
      reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
      transaction_id: tradeProposal.code
    };

    // Determine email template based on status
    let receiverTemplate = '';
    let senderTemplate = '';

    if (status === 'accepted') {
      receiverTemplate = 'trade-offer-accepted-receiver';
      senderTemplate = 'trade-offer-accepted-sender';
    } else if (status === 'counter_accepted') {
      receiverTemplate = 'counter-trade-offer-accepted-receiver';
      senderTemplate = 'counter-trade-offer-accepted-sender';
    }

    // Send emails (you'll need to implement your email service)
    if (receiverTemplate) {
      // await emailService.sendEmail(receiverTemplate, receiverEmailData);
    }
    
    if (senderTemplate) {
      // await emailService.sendEmail(senderTemplate, senderEmailData);
    }

  } catch (error) {
    console.error('Error sending trade email notifications:', error);
  }
};

// Helper: send emails for new trade proposal (propose-trade)
const sendNewTradeProposalEmails = async (tradeProposal: any): Promise<void> => {
  try {
    const userBy = await User.findByPk(tradeProposal.trade_sent_by, { attributes: ['first_name','last_name','email'] });
    const userTo = await User.findByPk(tradeProposal.trade_sent_to, { attributes: ['first_name','last_name','email'] });
    if (!userBy || !userTo) return;

    const sentIds = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receivedIds = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    const sentCards = await TradingCard.findAll({ where: { id: { [Op.in]: sentIds } }, attributes: ['title'] });
    const receivedCards = await TradingCard.findAll({ where: { id: { [Op.in]: receivedIds } }, attributes: ['title'] });

    const itemsSend = sentCards.map((card, idx) => `${idx + 1}. ${card.title}`).join('\n');
    const itemsReceived = receivedCards.map((card, idx) => `${idx + 1}. ${card.title}`).join('\n');

    let proposedamount = 0;
    if (tradeProposal.add_cash && tradeProposal.add_cash > 0) proposedamount = tradeProposal.add_cash;
    else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) proposedamount = tradeProposal.ask_cash;

    let proposedAmountCaptionTo = '';
    let proposedAmountCaptionBy = '';
    if (tradeProposal.add_cash && tradeProposal.add_cash > 0) {
      proposedAmountCaptionTo = ' (You get)';
      proposedAmountCaptionBy = ' (You pay)';
    } else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) {
      proposedAmountCaptionTo = ' (You pay)';
      proposedAmountCaptionBy = ' (You get)';
    }

    const message = tradeProposal.message || 'N/A';
    const reviewLink = `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`;

    // new-trade-offer → receiver
    const toReceiver = {
      to: userTo.email,
      tradebyname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
      tradetoname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
      cardyousend: itemsReceived.replace(/\n/g, '<br>'),
      cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
      proposedamount: `${proposedamount}${proposedAmountCaptionTo}`,
      message,
      reviewtradelink: reviewLink,
      transaction_id: tradeProposal.code
    };

    // trade-offer-sent → sender
    const toSender = {
      to: userBy.email,
      tradebyname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
      tradetoname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
      cardyousend: itemsSend.replace(/\n/g, '<br>'),
      cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
      proposedamount: `${proposedamount}${proposedAmountCaptionBy}`,
      message,
      reviewtradelink: reviewLink,
      transaction_id: tradeProposal.code
    };

    try { await EmailHelperService.executeMailSender('new-trade-offer', toReceiver); } catch {}
    try { await EmailHelperService.executeMailSender('trade-offer-sent', toSender); } catch {}
  } catch (err) {
    console.error('Error sending new trade proposal emails:', err);
  }
};

// Helper: send emails when trade marked as completed by either party
const sendMarkedAsCompletedEmails = async (currentUserId: number, tradeProposal: any): Promise<void> => {
  try {
    // Load users
    const sentByUser = await User.findByPk(tradeProposal.trade_sent_by);
    const sentToUser = await User.findByPk(tradeProposal.trade_sent_to);
    if (!sentByUser || !sentToUser) return;

    const leavefeedbacklink = `${process.env.FRONTEND_URL}/profile/deals/complete?trade_id=${tradeProposal.id}`;

    // Case 1: mimic Laravel condition for receiver mail
    if (currentUserId === sentByUser.id || tradeProposal.receiver_confirmation !== '1') {
      const mailInputsReceiver = {
        to: sentToUser.email,
        name: EmailHelperService.setName(sentToUser.first_name || '', sentToUser.last_name || ''),
        other_user_name: EmailHelperService.setName(sentByUser.first_name || '', sentByUser.last_name || ''),
        leavefeedbacklink,
        transaction_id: tradeProposal.code
      };
      try { await EmailHelperService.executeMailSender('trade-marked-as-completed-by-receiver', mailInputsReceiver); } catch {}
    } 
    // Case 2: mimic Laravel condition for sender mail
    else if (currentUserId === sentByUser.id || tradeProposal.trade_sender_confrimation !== '1') {
      const mailInputsSender = {
        to: sentByUser.email,
        name: EmailHelperService.setName(sentByUser.first_name || '', sentByUser.last_name || ''),
        other_user_name: EmailHelperService.setName(sentToUser.first_name || '', sentToUser.last_name || ''),
        leavefeedbacklink,
        transaction_id: tradeProposal.code
      };
      try { await EmailHelperService.executeMailSender('trade-marked-as-completed-by-sender', mailInputsSender); } catch {}
    }
  } catch (err) {
    console.error('Error sending marked-as-completed emails:', err);
  }
};

// Helper: send emails for cancel/decline statuses
const sendCancelOrDeclineEmails = async (tradeProposal: any, tradeStatus: string): Promise<void> => {
  try {
    // Load related users if not eager loaded
    const sender = tradeProposal.tradeSender || await User.findByPk(tradeProposal.trade_sent_by);
    const receiver = tradeProposal.tradeReceiver || await User.findByPk(tradeProposal.trade_sent_to);

    if (!sender || !receiver) return;

    // Build card lists
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    const sentCards = await TradingCard.findAll({ where: { id: { [Op.in]: sendCards } }, attributes: ['title'] });
    const receivedCards = await TradingCard.findAll({ where: { id: { [Op.in]: receiveCards } }, attributes: ['title'] });

    const itemsSend = sentCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');
    const itemsReceived = receivedCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');

    const proposedAmount = tradeProposal.add_cash || tradeProposal.ask_cash || 0;
    const message = tradeProposal.message || tradeProposal.counter_personalized_message || 'N/A';

    const reviewCancelledLink = `${process.env.FRONTEND_URL}/profile/deals/cancelled?trade_id=${tradeProposal.id}`;
    const reviewOngoingLink = `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`;

    // Common payloads
    const toSenderBase = {
      to: sender.email,
      tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      cardyousend: itemsSend.replace(/\n/g, '<br>'),
      cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
      proposedamount: proposedAmount,
      transaction_id: tradeProposal.code,
      message: message
    } as any;

    const toReceiverBase = {
      to: receiver.email,
      tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      cardyousend: itemsReceived.replace(/\n/g, '<br>'),
      cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
      proposedamount: proposedAmount,
      transaction_id: tradeProposal.code,
      message: message
    } as any;

    // Branch by status
    if (tradeStatus === 'declined') {
      // trade-offer-declined-sender (to sender)
      try {
        await EmailHelperService.executeMailSender('trade-offer-declined-sender', { ...toSenderBase, reviewtradelink: reviewCancelledLink });
      } catch (e) { /* swallow */ }

      // Send Laravel-style notification for decline proposal
      await setTradersNotificationOnVariousActionBasis(
        'decline-proposal',
        tradeProposal.trade_sent_to,
        tradeProposal.trade_sent_by,
        tradeProposal.id,
        'Trade'
      );
    } else if (tradeStatus === 'counter_declined') {
      // counter-trade-declined-sender (to receiver), with cancelled-trades link
      try {
        await EmailHelperService.executeMailSender('counter-trade-declined-sender', { ...toReceiverBase, reviewtradelink: reviewCancelledLink });
      } catch (e) { /* swallow */ }
    } else if (tradeStatus === 'cancel') {
      if (tradeProposal.trade_status === 'counter_offer') {
        // counter-offer-proposal-cancel-receiver (to sender) for counter offer cancel
        try {
          await EmailHelperService.executeMailSender('counter-offer-proposal-cancel-receiver', { ...toSenderBase, reviewtradelink: reviewCancelledLink });
        } catch (e) { /* swallow */ }
      } else {
        // trade-cancelled-by-sender-to-receiver (to receiver)
        try {
          await EmailHelperService.executeMailSender('trade-cancelled-by-sender-to-receiver', { ...toReceiverBase, reviewtradelink: reviewCancelledLink });
        } catch (e) { /* swallow */ }
        // trade-cancelled-by-sender (to sender)
        try {
          await EmailHelperService.executeMailSender('trade-cancelled-by-sender', { ...toSenderBase, reviewtradelink: reviewCancelledLink });
        } catch (e) { /* swallow */ }
      }
    }

    // Counter accepted extras and pay-to-continue are handled elsewhere in accept flow

  } catch (err) {
    console.error('Error sending cancel/decline emails:', err);
  }
};

// Helper function to send pay-to-continue email notifications
const sendPayToContinueEmail = async (tradeProposal: any, payerType: 'sender' | 'receiver'): Promise<void> => {
  try {
    const sender = tradeProposal.tradeSender;
    const receiver = tradeProposal.tradeReceiver;
    
    if (!sender || !receiver) return;

    // Get card details
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    const sentCards = await TradingCard.findAll({
      where: { id: { [Op.in]: sendCards } },
      attributes: ['search_param','title']
    });

    const receivedCards = await TradingCard.findAll({
      where: { id: { [Op.in]: receiveCards } },
      attributes: ['search_param','title']
    });

    const itemsSend = sentCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');
    const itemsReceived = receivedCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');

    const proposedAmount = tradeProposal.add_cash || tradeProposal.ask_cash || 0;
    const message = tradeProposal.message || tradeProposal.counter_personalized_message || 'N/A';

    // Determine who pays and send appropriate email
    if (payerType === 'sender') {
      const senderEmailData = {
        to: sender.email,
        tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
        tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
        cardyousend: itemsSend.replace(/\n/g, '<br>'),
        cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
        proposedamount: proposedAmount,
        message: message,
        reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      };

      const template = tradeProposal.trade_status === 'counter_accepted' 
        ? 'pay-to-continue-email-trade-counter-sender'
        : 'pay-to-continue-email-trade-sender';

      // Send email using EmailHelperService
      try {
        await EmailHelperService.executeMailSender(template, senderEmailData);
        console.log('✅ Pay-to-continue email sent to sender successfully');
      } catch (error) {
        console.error('❌ Failed to send pay-to-continue email to sender:', error);
      }
    } else {
      const receiverEmailData = {
        to: receiver.email,
        tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
        tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
        cardyousend: itemsReceived.replace(/\n/g, '<br>'),
        cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
        proposedamount: proposedAmount,
        message: message,
        reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      };

      const template = tradeProposal.trade_status === 'counter_accepted' 
        ? 'pay-to-continue-email-trade-counter-receiver'
        : 'pay-to-continue-email-trade-receiver';

      // Send email using EmailHelperService
      try {
        await EmailHelperService.executeMailSender(template, receiverEmailData);
        console.log('✅ Pay-to-continue email sent to receiver successfully');
      } catch (error) {
        console.error('❌ Failed to send pay-to-continue email to receiver:', error);
      }
    }

  } catch (error) {
    console.error('Error sending pay-to-continue email:', error);
  }
};

// Helper: send emails for edit-trade-proposal (counter or regular)
const sendEditTradeEmails = async (tradeProposal: any, mode: 'Counter Trade' | 'Regular'): Promise<void> => {
  try {
    const userBy = await User.findByPk(tradeProposal.trade_sent_by);
    const userTo = await User.findByPk(tradeProposal.trade_sent_to);
    if (!userBy || !userTo) return;

    // Build cards list
    const sendIds = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveIds = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    const sentCards = await TradingCard.findAll({ where: { id: { [Op.in]: sendIds } }, attributes: ['search_param','title'] });
    const receivedCards = await TradingCard.findAll({ where: { id: { [Op.in]: receiveIds } }, attributes: ['search_param','title'] });

    const itemsSend = sentCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');
    const itemsReceived = receivedCards.map((card, index) => `${index + 1}. ${card.title}`).join('\n');

    let proposedamount = 0;
    if (tradeProposal.add_cash && tradeProposal.add_cash > 0) proposedamount = tradeProposal.add_cash;
    else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) proposedamount = tradeProposal.ask_cash;

    let proposedAmountCaptionTo = '';
    let proposedAmountCaptionBy = '';
    if (tradeProposal.add_cash && tradeProposal.add_cash > 0) {
      proposedAmountCaptionTo = ' (You get)';
      proposedAmountCaptionBy = ' (You pay)';
    } else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) {
      proposedAmountCaptionTo = ' (You pay)';
      proposedAmountCaptionBy = ' (You get)';
    }

    const message = tradeProposal.counter_personalized_message || tradeProposal.message || 'N/A';

    if (mode === 'Counter Trade') {
      // new-counter-offer (to userBy)
      const toSender = {
        to: userBy.email,
        tradetoname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
        tradebyname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
        cardyousend: itemsReceived.replace(/\n/g, '<br>'),
        cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
        additionalamount: `${proposedamount}${proposedAmountCaptionBy}`,
        message,
        reviewcountertradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      };
      // counter-offer-sent (to userTo)
      const toReceiver = {
        to: userTo.email,
        tradebyname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
        tradetoname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
        cardyousend: itemsSend.replace(/\n/g, '<br>'),
        cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
        proposedamount: `${proposedamount}${proposedAmountCaptionTo}`,
        message,
        viewcounterofferlink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      };
      try { await EmailHelperService.executeMailSender('new-counter-offer', toSender); } catch {}
      try { await EmailHelperService.executeMailSender('counter-offer-sent', toReceiver); } catch {}

      // Send Laravel-style notification for counter offer received
      await setTradersNotificationOnVariousActionBasis(
        'counter-offer-proposal-receive',
        userTo.id,
        userBy.id,
        tradeProposal.id,
        'Trade'
      );
    } else {
      // trade-offer-updated-receiver (to userTo)
      const toReceiver = {
        to: userTo.email,
        tradebyname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
        tradetoname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
        cardyousend: itemsReceived.replace(/\n/g, '<br>'),
        cardyoureceive: itemsSend.replace(/\n/g, '<br>'),
        proposedamount: `${proposedamount}${proposedAmountCaptionTo}`,
        message,
        reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      };
      // trade-offer-updated-sender (to userBy)
      const toSender = {
        to: userBy.email,
        tradebyname: EmailHelperService.setName(userBy.first_name || '', userBy.last_name || ''),
        tradetoname: EmailHelperService.setName(userTo.first_name || '', userTo.last_name || ''),
        cardyousend: itemsSend.replace(/\n/g, '<br>'),
        cardyoureceive: itemsReceived.replace(/\n/g, '<br>'),
        proposedamount: `${proposedamount}${proposedAmountCaptionBy}`,
        message,
        transaction_id: tradeProposal.code,
        reviewtradelink: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`
      };
      try { await EmailHelperService.executeMailSender('trade-offer-updated-receiver', toReceiver); } catch {}
      try { await EmailHelperService.executeMailSender('trade-offer-updated-sender', toSender); } catch {}

      // Send Laravel-style notification for edit proposal
      await setTradersNotificationOnVariousActionBasis(
        'edit-proposal',
        userTo.id,
        userBy.id,
        tradeProposal.id,
        'Trade'
      );
    }
  } catch (err) {
    console.error('Error sending edit trade emails:', err);
  }
};

// Cancel Trade API
export const cancelTrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id, st } = req.body; // st = status type (cancel, declined, counter_declined)

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!id) {
      return sendApiResponse(res, 400, false, "Trade proposal ID is required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check if user has access to this trade
    if (tradeProposal.trade_sent_by !== userId && tradeProposal.trade_sent_to !== userId) {
      return sendApiResponse(res, 403, false, "Invalid access", []);
    }

    // Check if trade is already cancelled/declined
    const cancelledStatuses = ['declined', 'cancel', 'cancelled', 'counter_declined'];
    if (cancelledStatuses.includes(tradeProposal.trade_status)) {
      // Get total active trades for user
      const totalActiveTrades = await TradeProposal.count({
        where: {
          [Op.and]: [
            { [Op.not]: { trade_status: cancelledStatuses } },
            { [Op.not]: { trade_status: 'complete' } },
            {
              [Op.or]: [
                { trade_sent_by: userId },
                { trade_sent_to: userId }
              ]
            }
          ]
        }
      });

      return sendApiResponse(res, 200, true, "This offer has already been cancelled by other trader.", [], {
        total: totalActiveTrades
      });
    }

    // Check if trade has payment and is under payment process
    if ((tradeProposal.add_cash && tradeProposal.add_cash > 0 || tradeProposal.ask_cash && tradeProposal.ask_cash > 0) && tradeProposal.trade_amount_paid_on) {
      return sendApiResponse(res, 400, false, "You cannot cancel this trade, this trade has been accepted and is under the payment process.", []);
    }

    // Check if trade is in shipment process
    const shipmentCount = await Shipment.count({
      where: { trade_id: tradeProposal.id }
    });

    if (shipmentCount > 0) {
      return sendApiResponse(res, 400, false, "You can not cancel this trade, this trade already in shipment process", []);
    }

    // Refund CXP coins
    const creditLog = await CreditDeductionLog.findOne({
      where: { trade_id: tradeProposal.id }
    });

    if (creditLog) {
      const userTo = await User.findByPk(creditLog.sent_to, { attributes: ['id', 'credit'] });
      const userBy = await User.findByPk(creditLog.sent_by, { attributes: ['id', 'credit'] });

      if (creditLog.deduction_from === 'Both') {
        if (userTo && userTo.credit && creditLog.coin) await userTo.update({ credit: userTo.credit + creditLog.coin });
        if (userBy && userBy.credit && creditLog.coin) await userBy.update({ credit: userBy.credit + creditLog.coin });
      } else if (creditLog.deduction_from === 'Sender') {
        if (userBy && userBy.credit && creditLog.coin) await userBy.update({ credit: userBy.credit + creditLog.coin });
      } else if (creditLog.deduction_from === 'Receiver') {
        if (userTo && userTo.credit && creditLog.coin) await userTo.update({ credit: userTo.credit + creditLog.coin });
      }

      // Update credit log status
      await creditLog.update({ status: 'Refund' });
    }

    // Set trade proposal status
    await setTradeProposalStatus(tradeProposal.id, 'trade-cancelled');

    // Mark cards as available for trade
    const sendCards = tradeProposal.send_cards?.split(',') || [];
    const receiveCards = tradeProposal.receive_cards?.split(',') || [];
    const allCards = [...sendCards, ...receiveCards];

    if (allCards.length > 0) {
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: allCards } } }
      );
    }

    // Determine trade status
    const tradeStatus = st || 'cancel';
    await tradeProposal.update({ trade_status: tradeStatus });

    // Send condition-wise emails for cancel/decline flows (matches Laravel)
    await sendCancelOrDeclineEmails(tradeProposal, tradeStatus);

    // Get total active trades for user
    const totalActiveTrades = await TradeProposal.count({
      where: {
        [Op.and]: [
          { [Op.not]: { trade_status: cancelledStatuses } },
          { [Op.not]: { trade_status: 'complete' } },
          {
            [Op.or]: [
              { trade_sent_by: userId },
              { trade_sent_to: userId }
            ]
          }
        ]
      }
    });

    // Set notification aliases based on trade status
    let senderAlias = 'The';
    let receiverAlias = 'The';
    let senderStatus = 'cancelled';
    let receiverStatus = 'cancelled';
    let returnMessage = 'cancelled';

    if (tradeStatus === 'cancel') {
      senderAlias = 'The';
      receiverAlias = 'The';
      senderStatus = 'cancelled';
      receiverStatus = 'cancelled';
      if (tradeProposal.trade_status === 'counter_offer') {
        senderAlias = 'Your counter';
        receiverAlias = 'The counter';
      }
    } else if (tradeStatus === 'declined') {
      senderAlias = 'Your';
      receiverAlias = 'The';
      senderStatus = 'declined';
      receiverStatus = 'declined';
      returnMessage = 'declined';
    } else if (tradeStatus === 'counter_declined') {
      senderAlias = 'The counter';
      receiverAlias = 'Your counter';
      senderStatus = 'declined';
      receiverStatus = 'declined';
      returnMessage = 'declined';
    }

    // Send notifications
    await sendTradeNotifications(
      'trade-cancel-decline',
      tradeProposal.trade_sent_by!,
      tradeProposal.trade_sent_to!,
      tradeProposal.id,
      senderAlias,
      receiverAlias,
      senderStatus,
      receiverStatus
    );

    // Send Laravel-style conditional notification based on trade status
    if (tradeStatus === 'declined' || tradeStatus === 'counter_declined') {
      // Send decline notification
      await setTradersNotificationOnVariousActionBasis(
        'trade-cancel-decline',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );
    } else if (tradeStatus === 'cancel') {
      // Send cancel notification
      await setTradersNotificationOnVariousActionBasis(
        'cancel',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );
    }

    return sendApiResponse(res, 200, true, `Trade successfully ${returnMessage}`, [], {
      total: totalActiveTrades
    });

  } catch (error: any) {
    console.error('Cancel trade error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Edit Trade Proposal Detail API
export const editTradeProposalDetail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { card_id } = req.params;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!card_id) {
      return sendApiResponse(res, 400, false, "Trade proposal ID is required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(card_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check if trade is cancelled or declined
    if (tradeProposal.trade_status === 'cancel' || tradeProposal.trade_status === 'declined') {
      const errorMessage = tradeProposal.trade_status === 'cancel' 
        ? 'Trade are cancelled.' 
        : 'Trade are declined.';
      return sendApiResponse(res, 400, false, errorMessage, []);
    }

    // Check if trade is already accepted or has counter offer
    if (tradeProposal.trade_status === 'accepted' || 
        tradeProposal.trade_status === 'counter_accepted' || 
        tradeProposal.trade_status === 'counter_offer') {
      const errorMessage = tradeProposal.trade_status === 'counter_offer'
        ? 'This trade already has counter offer, you can not edit this trade.'
        : 'This trade already accepted, you can not edit this trade.';
      return sendApiResponse(res, 400, false, errorMessage, []);
    }

    // Get interested user
    const interestedUserId = tradeProposal.trade_sent_to;
    if (interestedUserId === userId) {
      return sendApiResponse(res, 400, false, "You can't trade with yourself.", []);
    }

    const interestedUser = await User.findByPk(interestedUserId, {
      attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture', 'ebay_store_url']
    });

    if (!interestedUser) {
      return sendApiResponse(res, 404, false, "Interested user not found", []);
    }

    // Parse send and receive cards
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    // Get user closets (send cards) - include cards that are already selected or available for trade
    let userClosetsWhere: any = {
      trader_id: userId,
      mark_as_deleted: null,
      can_trade: '1',
      is_traded: '0',
      trading_card_status: '1'
    };

    // Add OR condition for already selected cards
    if (sendCards.length > 0) {
      userClosetsWhere = {
        [Op.or]: [
          userClosetsWhere,
          { id: { [Op.in]: sendCards } }
        ]
      };
    }

    const userClosets = await TradingCard.findAll({
      where: userClosetsWhere,
      attributes: [
        'id', 'code', 'trader_id', 'search_param', 'title','trading_card_img', 
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }]
    });

    // Get interested user closets (receive cards) - include cards that are already selected or available for trade
    let interestedClosetsWhere: any = {
      trader_id: interestedUserId,
      mark_as_deleted: null,
      can_trade: '1',
      is_traded: '0',
      trading_card_status: '1'
    };

    // Add OR condition for already selected cards
    if (receiveCards.length > 0) {
      interestedClosetsWhere = {
        [Op.or]: [
          interestedClosetsWhere,
          { id: { [Op.in]: receiveCards } }
        ]
      };
    }

    const interestedClosets = await TradingCard.findAll({
      where: interestedClosetsWhere,
      attributes: [
        'id', 'code', 'trader_id', 'search_param','title','trading_card_img', 
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }]
    });

    // Calculate product count for interested user
    const productCount = await TradingCard.count({
      where: {
        trader_id: interestedUserId,
        trading_card_status: '1',
        is_traded: '0',
        mark_as_deleted: null,
        [Op.or]: [
          { can_trade: '1' },
          { can_buy: '1' }
        ]
      }
    });

    // Check if user is following the interested user
    const follower = await Follower.findOne({
      where: {
        trader_id: interestedUserId,
        user_id: userId,
        follower_status: '1'
      }
    });

    // Get total trades count for interested user
    const totalTradesCount = await TradeTransaction.count({
      where: {
        [Op.or]: [
          { trade_sent_by_key: interestedUserId },
          { trade_sent_to_key: interestedUserId }
        ]
      }
    });

    // Format response data
    const responseData = {
      trade_proposal: {
        id: tradeProposal.id,
        code: tradeProposal.code,
        main_card: tradeProposal.main_card,
        send_cards: tradeProposal.send_cards,
        receive_cards: tradeProposal.receive_cards,
        add_cash: tradeProposal.add_cash,
        ask_cash: tradeProposal.ask_cash,
        message: tradeProposal.message,
        trade_status: tradeProposal.trade_status,
        trade_sent_by: tradeProposal.trade_sent_by,
        trade_sent_to: tradeProposal.trade_sent_to,
        created_at: tradeProposal.created_at,
        updated_at: tradeProposal.updated_at
      },
      interested_user: {
        id: interestedUser.id,
        username: interestedUser.username,
        first_name: interestedUser.first_name,
        last_name: interestedUser.last_name,
        profile_picture: interestedUser.profile_picture,
        ebay_store_url: interestedUser.ebay_store_url,
        total_trades_count: totalTradesCount,
        product_count: productCount
      },
      user_closets: userClosets.map(card => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || '',
        is_selected: sendCards.includes(card.id)
      })),
      interested_closets: interestedClosets.map(card => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || '',
        is_selected: receiveCards.includes(card.id)
      })),
      is_following: !!follower,
      send_cards_tp: sendCards,
      receive_cards_tp: receiveCards,
      all_products: [...sendCards, ...receiveCards],
      td: {
        open_text: "Edit Trade",
        next_text: "Continue Trade"
      }
    };

    return sendApiResponse(res, 200, true, "Trade proposal detail retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Edit trade proposal detail error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Edit Trade Proposal API
export const editTradeProposal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      sendcard,
      receivecard,
      trader_id_r,
      add_cash,
      ask_cash,
      message,
      counter_personalized_message,
      trades_proposal_id,
      main_card,
      change_method
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validation
    if (!sendcard || !receivecard || !trader_id_r) {
      return sendApiResponse(res, 400, false, "Please select products you want to send and receive, and select trader you want to trade with.", []);
    }

    if (!Array.isArray(sendcard) || !Array.isArray(receivecard)) {
      return sendApiResponse(res, 400, false, "Send cards and receive cards must be arrays", []);
    }

    if (sendcard.length === 0 || receivecard.length === 0) {
      return sendApiResponse(res, 400, false, "Please select at least one card to send and receive", []);
    }

    // Normalize cash inputs
    const askCash = ask_cash === '0' ? null : ask_cash;
    const addCash = add_cash === '0' ? null : add_cash;

    if (askCash !== null && addCash !== null) {
      return sendApiResponse(res, 400, false, "You can't trade with both (Amount you will get & Amount you will pay).", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trades_proposal_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    if (tradeProposal.trade_status === 'cancel') {
      return sendApiResponse(res, 400, false, "Trade offer already cancelled, you cannot send a counter offer on this trade.", []);
    }

    // Reset existing cards traded status
    const tpSendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
    const tpReceiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
    const existingCards = [...tpSendCards, ...tpReceiveCards];

    if (existingCards.length > 0) {
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: existingCards } } }
      );
    }

    // Update cards traded status for new proposal
    const allCards = [...sendcard, ...receivecard];
    await TradingCard.update(
      { is_traded: '1' },
      { where: { id: { [Op.in]: allCards } } }
    );

    const sendcards = sendcard.join(',');
    const receivecards = receivecard.join(',');

    // Detect if anything is changed in trade proposal
    let tradeEdited = false;
    const currentAddCash = tradeProposal.add_cash ? tradeProposal.add_cash.toString() : '0';
    const currentAskCash = tradeProposal.ask_cash ? tradeProposal.ask_cash.toString() : '0';
    const newAddCash = addCash ? addCash.toString().replace(/,/g, '') : '0';
    const newAskCash = askCash ? askCash.toString().replace(/,/g, '') : '0';

    if (
      currentAddCash !== newAddCash ||
      currentAskCash !== newAskCash ||
      tradeProposal.send_cards !== sendcards ||
      tradeProposal.receive_cards !== receivecards
    ) {
      tradeEdited = true;
    }

    if (tradeEdited) {
      if (change_method === 'Counter Trade') {
        // For Counter Trade, swap send and receive cards, and cash accordingly
        const updateData: any = {
          trade_status: 'counter_offer',
          send_cards: receivecards,
          receive_cards: sendcards,
          main_card: main_card,
          message: counter_personalized_message || message || tradeProposal.message
        };

        if (askCash) {
          updateData.add_cash = parseFloat(askCash.toString().replace(/,/g, ''));
        } else {
          updateData.add_cash = null;
        }

        if (addCash) {
          updateData.ask_cash = parseFloat(addCash.toString().replace(/,/g, ''));
        } else {
          updateData.ask_cash = null;
        }

        if (counter_personalized_message) {
          updateData.counter_personalized_message = counter_personalized_message;
        }

        await tradeProposal.update(updateData);

        // Send notifications for counter trade
        await sendTradeNotifications(
          'counter-offer-proposal-receive',
          userId,
          parseInt(trader_id_r),
          tradeProposal.id,
          'Trade'
        );

        // Set trade status
        await setTradeProposalStatus(tradeProposal.id, 'counter-trade-offer');

        // Send counter trade emails (Laravel parity)
        await sendEditTradeEmails(tradeProposal, 'Counter Trade');

        return sendApiResponse(res, 200, true, "Counter offer proposed successfully!", [], {
          trade_proposal_id: tradeProposal.id,
          redirect_url: `/ongoing-trades/${tradeProposal.id}`
        });

      } else {
        // For regular updates, set normally
        const updateData: any = {
          send_cards: sendcards,
          receive_cards: receivecards,
          main_card: main_card,
          message: message || tradeProposal.message,
          is_edited: 1
        };

        if (addCash) {
          updateData.add_cash = parseFloat(addCash.toString().replace(/,/g, ''));
        } else {
          updateData.add_cash = null;
        }

        if (askCash) {
          updateData.ask_cash = parseFloat(askCash.toString().replace(/,/g, ''));
        } else {
          updateData.ask_cash = null;
        }

        await tradeProposal.update(updateData);

        // Send notifications for regular trade update
        await sendTradeNotifications(
          'edit-proposal',
          userId,
          parseInt(trader_id_r),
          tradeProposal.id,
          'Trade'
        );

        // Set trade status
        await setTradeProposalStatus(tradeProposal.id, 'trade-offer-updated');

        // Send regular update emails (Laravel parity)
        await sendEditTradeEmails(tradeProposal, 'Regular');

        return sendApiResponse(res, 200, true, "Trade proposal updated successfully!", [], {
          trade_proposal_id: tradeProposal.id,
          redirect_url: `/ongoing-trades/${tradeProposal.id}`
        });
      }
    } else {
      return sendApiResponse(res, 200, true, "Nothing updated at this time!", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: '/ongoing-trades'
      });
    }

  } catch (error: any) {
    console.error('Edit trade proposal error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Review Trade Proposal API
export const reviewTradeProposal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { card_id } = req.params;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!card_id) {
      return sendApiResponse(res, 400, false, "Trade proposal ID is required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(card_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Get interested user (trade sender)
    const interestedUserId = tradeProposal.trade_sent_by;
    if (interestedUserId === userId) {
      return sendApiResponse(res, 400, false, "You can't trade with yourself.", []);
    }

    const interestedUser = await User.findByPk(interestedUserId, {
      attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture', 'ebay_store_url']
    });

    if (!interestedUser) {
      return sendApiResponse(res, 404, false, "Interested user not found", []);
    }

    // Parse send and receive cards
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    // Get interested user closets (cards they're sending)
    const interestedClosets = await TradingCard.findAll({
      where: {
        trader_id: interestedUserId,
        id: { [Op.in]: sendCards },
        mark_as_deleted: null
      },
      attributes: [
        'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img', 
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }],
      order: [['updated_at', 'DESC']]
    });

    // Get user closets (cards they're receiving)
    const userClosets = await TradingCard.findAll({
      where: {
        trader_id: userId,
        id: { [Op.in]: receiveCards },
        mark_as_deleted: null
      },
      attributes: [
        'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img', 
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }],
      order: [['updated_at', 'DESC']]
    });

    // Calculate product count for interested user
    const productCount = await TradingCard.count({
      where: {
        trader_id: interestedUserId,
        trading_card_status: '1',
        is_traded: '0',
        mark_as_deleted: null,
        [Op.or]: [
          { can_trade: '1' },
          { can_buy: '1' }
        ]
      }
    });

    // Check if user is following the interested user
    const follower = await Follower.findOne({
      where: {
        trader_id: interestedUserId,
        user_id: userId,
        follower_status: '1'
      }
    });

    // Get total trades count for interested user
    const totalTradesCount = await TradeTransaction.count({
      where: {
        [Op.or]: [
          { trade_sent_by_key: interestedUserId },
          { trade_sent_to_key: interestedUserId }
        ]
      }
    });

    // Format response data
    const responseData = {
      trade_proposal: {
        id: tradeProposal.id,
        code: tradeProposal.code,
        main_card: tradeProposal.main_card,
        send_cards: tradeProposal.send_cards,
        receive_cards: tradeProposal.receive_cards,
        add_cash: tradeProposal.add_cash,
        ask_cash: tradeProposal.ask_cash,
        message: tradeProposal.message,
        trade_status: tradeProposal.trade_status,
        trade_sent_by: tradeProposal.trade_sent_by,
        trade_sent_to: tradeProposal.trade_sent_to,
        created_at: tradeProposal.created_at,
        updated_at: tradeProposal.updated_at
      },
      interested_user: {
        id: interestedUser.id,
        username: interestedUser.username,
        first_name: interestedUser.first_name,
        last_name: interestedUser.last_name,
        profile_picture: interestedUser.profile_picture,
        ebay_store_url: interestedUser.ebay_store_url,
        total_trades_count: totalTradesCount
      },
      interested_closets: interestedClosets.map(card => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || ''
      })),
      user_closets: userClosets.map(card => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).parentCategory?.sport_name || ''
      })),
      product_count: productCount,
      is_following: !!follower,
      send_cards_tp: receiveCards, // Swapped for review
      receive_cards_tp: sendCards, // Swapped for review
      counter_trade: "This is Counter trade",
      td: {
        open_text: "Counter Trade",
        next_text: "Continue Trade"
      }
    };

    return sendApiResponse(res, 200, true, "Trade proposal review data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Review trade proposal error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Accept Trade API (Enhanced to match Laravel functionality)
export const acceptTrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      modelid,
      status,
      model_name,
      columnname = 'trade_status'
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!modelid || !status) {
      return sendApiResponse(res, 400, false, "Trade proposal ID and status are required", []);
    }

    // Get trade proposal with relations
    const tradeProposal = await TradeProposal.findByPk(modelid, {
      include: [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'first_name', 'last_name', 'email', 'username']
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'first_name', 'last_name', 'email', 'username']
        }
      ]
    });

    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check if trade is already in final state
    const finalStatuses = ['declined', 'cancel', 'cancelled'];
    if (finalStatuses.includes(tradeProposal.trade_status)) {
      return sendApiResponse(res, 400, false, `You can not ${status} this trade, this trade already ${tradeProposal.trade_status}`, []);
    }

    // Handle different status types
    if (status === 'accepted' || status === 'counter_accepted') {
      // Update trade status
      await tradeProposal.update({
        [columnname]: status,
        accepted_on: new Date()
      });

      // Set trade status
      const statusAlias = status === 'accepted' ? 'trade-accepted' : 'counter-offer-accepted';
      await setTradeProposalStatus(tradeProposal.id, statusAlias);

      // Send notifications
      const notificationAction = status === 'accepted' ? 'accept-proposal' : 'counter-offer-proposal-accept';
      await sendTradeNotifications(
        notificationAction,
        tradeProposal.trade_sent_to!,
        tradeProposal.trade_sent_by!,
        tradeProposal.id,
        'Trade'
      );

      // Send Laravel-style notification for counter offer acceptance
      if (status === 'counter_accepted') {
        await setTradersNotificationOnVariousActionBasis(
          'counter-offer-proposal-accept',
          tradeProposal.trade_sent_by!,
          tradeProposal.trade_sent_to!,
          tradeProposal.id,
          'Trade'
        );
      }

      // Update card statuses
      const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      
      const allCards = [...sendCards, ...receiveCards];
      await TradingCard.update(
        { is_traded: '1' },
        { where: { id: { [Op.in]: allCards } } }
      );

      // Send email notifications
      await sendTradeEmailNotifications(tradeProposal, status, 'accepted');

      // Handle payment notifications if cash is involved
      if (tradeProposal.add_cash && tradeProposal.add_cash > 0 && !tradeProposal.trade_amount_paid_on) {
        await setTradeProposalStatus(tradeProposal.id, status === 'accepted' ? 'trade-offer-accepted-sender-pay' : 'counter-offer-accepted-sender-pay');
        await sendPayToContinueEmail(tradeProposal, 'sender');
      } else if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0 && !tradeProposal.trade_amount_paid_on) {
        await setTradeProposalStatus(tradeProposal.id, status === 'accepted' ? 'trade-offer-accepted-receiver-pay' : 'counter-offer-accepted-receiver-pay');
        await sendPayToContinueEmail(tradeProposal, 'receiver');
      }

      return sendApiResponse(res, 200, true, "Trade accepted successfully as per your request.", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: `/ongoing-trades/${tradeProposal.id}`
      });

    } else if (status === 'declined' && model_name === 'Decline') {
      // Handle decline
      await tradeProposal.update({ [columnname]: status });
      await setTradeProposalStatus(tradeProposal.id, 'trade-cancelled');

      // Reset card statuses
      const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      const allCards = [...sendCards, ...receiveCards];
      
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: allCards } } }
      );

      // Send notifications
      await sendTradeNotifications(
        'decline-proposal',
        tradeProposal.trade_sent_to!,
        tradeProposal.trade_sent_by!,
        tradeProposal.id,
        'Trade'
      );

      return sendApiResponse(res, 200, true, "Trade cancelled successfully as per your request.", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: '/cancelled-trades'
      });

    } else if (status === 'declined' && model_name === 'Cancel') {
      // Handle counter offer cancel
      await tradeProposal.update({ [columnname]: status });
      await setTradeProposalStatus(tradeProposal.id, 'trade-cancelled');

      // Send Laravel-style notification for counter offer cancel
      await setTradersNotificationOnVariousActionBasis(
        'counter-offer-proposal-cancel',
        tradeProposal.trade_sent_to!,
        tradeProposal.trade_sent_by!,
        tradeProposal.id,
        'Trade'
      );

      // Reset card statuses
      const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      const allCards = [...sendCards, ...receiveCards];
      
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: allCards } } }
      );

      // Send notifications
      await sendTradeNotifications(
        'counter-offer-proposal-cancel',
        tradeProposal.trade_sent_to!,
        tradeProposal.trade_sent_by!,
        tradeProposal.id,
        'Trade'
      );

      return sendApiResponse(res, 200, true, "Trade cancelled successfully as per your request.", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: '/cancelled-trades'
      });

    } else if (status === 'cancel') {
      // Handle cancel
      await tradeProposal.update({ [columnname]: status });
      await setTradeProposalStatus(tradeProposal.id, 'trade-cancelled');

      // Reset card statuses
      const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      const allCards = [...sendCards, ...receiveCards];
      
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: allCards } } }
      );

      // Send notifications
      await sendTradeNotifications(
        'cancel',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );

      // Send Laravel-style cancellation notification
      await setTradersNotificationOnVariousActionBasis(
        'cancel',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );

      return sendApiResponse(res, 200, true, "Trade cancelled successfully as per your request.", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: '/cancelled-trades'
      });

    } else if (status === 'counter_declined') {
      // Handle counter declined
      await tradeProposal.update({ [columnname]: status });

      // Reset card statuses
      const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      const allCards = [...sendCards, ...receiveCards];
      
      await TradingCard.update(
        { is_traded: '0' },
        { where: { id: { [Op.in]: allCards } } }
      );

      // Send notifications
      await sendTradeNotifications(
        'counter-declined',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );

      // Send Laravel-style counter declined notification
      await setTradersNotificationOnVariousActionBasis(
        'counter-declined',
        tradeProposal.trade_sent_by!,
        tradeProposal.trade_sent_to!,
        tradeProposal.id,
        'Trade'
      );

      return sendApiResponse(res, 200, true, "Counter trade declined successfully.", [], {
        trade_proposal_id: tradeProposal.id,
        redirect_url: `/ongoing-trades/${tradeProposal.id}`
      });

    } else {
      return sendApiResponse(res, 400, false, "Invalid status provided", []);
    }

  } catch (error: any) {
    console.error('Accept trade error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get Shipping Address API
export const getShippingAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trade_id } = req.query;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_id || typeof trade_id !== 'string') {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    // Get user's sender addresses
    const addresses = await Address.findAll({
      where: {
        user_id: userId,
        is_sender: '1',
        is_deleted: '0'
      },
      order: [['updated_at', 'DESC']]
    });

    let deliveryAddress = 0;
    let sendTradeCards: any[] = [];
    let receiveTradeCards: any[] = [];

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check trade status
    if (tradeProposal.trade_status === 'cancel' || tradeProposal.trade_status === 'declined') {
      const errorMessage = tradeProposal.trade_status === 'cancel'
        ? 'Trade are cancelled.'
        : 'Trade are declined.';
      return sendApiResponse(res, 400, false, errorMessage, []);
    }

    // Check if shipment already exists with payment
    const existingShipment = await Shipment.findOne({
      where: {
        trade_id: parseInt(trade_id),
        user_id: userId
      }
    });

    if (existingShipment && existingShipment.paymentId && existingShipment.selected_rate) {
      return sendApiResponse(res, 400, false, "Shipment already processed", [], {
        redirect_url: `/ship-your-products/trade/${trade_id}/${existingShipment.id}`
      });
    }

    const tradeSentBy = tradeProposal.trade_sent_by;
    const tradeSentTo = tradeProposal.trade_sent_to;

    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    // Get trade cards based on user role
    if (tradeProposal.trade_sent_to === userId) {
      // User is receiver, so they send the cards they're receiving and receive the cards they're sending
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });
    } else {
      // User is sender, so they send their cards and receive the other's cards
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title','trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title','trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });
    }

    // Get delivery address from the other trader
    if (userId === tradeProposal.trade_sent_by) {
      // First try to get default address
      let delAddress = await Address.findOne({
        where: {
          user_id: tradeProposal.trade_sent_to,
          mark_default: 1,
          is_deleted: '0'
        }
      });
      
      // If no default address found, get any available address
      if (!delAddress) {
        delAddress = await Address.findOne({
          where: {
            user_id: tradeProposal.trade_sent_to,
            is_deleted: '0'
          },
          order: [['mark_default', 'ASC'], ['created_at', 'DESC']]
        });
      }
      
      if (delAddress) {
        deliveryAddress = delAddress.id;
      }
    } else if (userId === tradeProposal.trade_sent_to) {
      // First try to get default address
      let delAddress = await Address.findOne({
        where: {
          user_id: tradeProposal.trade_sent_by,
          mark_default: 1,
          is_deleted: '0'
        }
      });
      
      // If no default address found, get any available address
      if (!delAddress) {
        delAddress = await Address.findOne({
          where: {
            user_id: tradeProposal.trade_sent_by,
            is_deleted: '0'
          },
          order: [['mark_default', 'ASC'], ['created_at', 'DESC']]
        });
      }
      
      if (delAddress) {
        deliveryAddress = delAddress.id;
      }
    }

    // Format addresses for frontend
    const formattedAddresses = addresses.map(address => ({
      id: address.id,
      name: address.name,
      email: address.email,
      phone: address.phone,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      country: address.country,
      zip: address.zip,
      mark_default: address.mark_default,
      is_sender: address.is_sender,
      is_deleted: address.is_deleted,
      created_at: address.createdAt,
      updated_at: address.updatedAt
    }));

    // Format trade cards for frontend
    const formattedSendCards = sendTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      title: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const formattedReceiveCards = receiveTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      title: card.title,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const responseData = {
      addresses: formattedAddresses,
      delivery_address: deliveryAddress,
      send_trade_cards: formattedSendCards,
      receive_trade_cards: formattedReceiveCards,
      trade_id: parseInt(trade_id as string),
      trade_status: tradeProposal.trade_status,
      has_delivery_address: deliveryAddress > 0,
      can_proceed: deliveryAddress > 0 && addresses.length > 0
    };

    return sendApiResponse(res, 200, true, "Shipping address data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Get shipping address error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipment Initialize API
export const shipmentInitialize = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      trade_id,
      delivery_address,
      pickup_address
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_id || !delivery_address || !pickup_address) {
      return sendApiResponse(res, 400, false, "Trade ID, delivery address, and pickup address are required", []);
    }

    // Check if shipment already exists
    let shipment = await Shipment.findOne({
      where: {
        trade_id: trade_id,
        user_id: userId
      }
    });

    if (shipment && shipment.id > 0) {
      // Update existing shipment
      await shipment.update({
        to_address: parseInt(delivery_address),
        from_address: parseInt(pickup_address)
      });
    } else {
      // Create new shipment
      shipment = await Shipment.create({
        user_id: userId,
        to_address: parseInt(delivery_address),
        from_address: parseInt(pickup_address),
        trade_id: trade_id.toString()
      } as any);
    }

    // Validate shipment data
    if (!shipment) {
      return sendApiResponse(res, 400, false, "Please select address.", []);
    }

    // Check if shipment payment is already completed
    if (shipment.shipment_payment_status === 1) {
      return sendApiResponse(res, 400, false, "Shipment has already been completed.", [], {
        redirect_url: "/ongoing-trades"
      });
    }

    // Return success response with redirect URL
    return sendApiResponse(res, 200, true, "Pickup & Delivery address has been saved successfully.", [], {
      shipment_id: shipment.id,
      redirect_url: "/trade/shipping-parcel"
    });

  } catch (error: any) {
    console.error('Shipment initialize error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get Shipping Parcel API
export const getShippingParcel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trade_id } = req.query;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_id || typeof trade_id !== 'string') {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check trade status
    if (tradeProposal.trade_status === 'cancel' || tradeProposal.trade_status === 'declined') {
      const errorMessage = tradeProposal.trade_status === 'cancel'
        ? 'Trade are cancelled.'
        : 'Trade are declined.';
      return sendApiResponse(res, 400, false, errorMessage, []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        trade_id: trade_id,
        user_id: userId
      }
    });

    if (!shipment || !shipment.to_address || !shipment.from_address) {
      return sendApiResponse(res, 400, false, "First enter the address information.", [], {
        redirect_url: "/trade/shipping-address"
      });
    }

    // Determine which cards the user is sending
    let sendCards: number[] = [];
    let traderId = 0;

    if (tradeProposal.trade_sent_to === userId) {
      // User is receiver, so they send the cards they're receiving
      if (tradeProposal.receive_cards) {
        sendCards = tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim()));
        traderId = tradeProposal.trade_sent_to!;
      }
    } else if (tradeProposal.trade_sent_by === userId) {
      // User is sender, so they send their own cards
      if (tradeProposal.send_cards) {
        sendCards = tradeProposal.send_cards.split(',').map(id => parseInt(id.trim()));
        traderId = tradeProposal.trade_sent_by!;
      }
    }

    // Get trading cards that user is sending
    const tradingCards = await TradingCard.findAll({
      where: {
        trader_id: traderId,
        trading_card_status: '1',
        id: { [Op.in]: sendCards }
      },
      order: [['id', 'DESC']],
      attributes: [
        'id', 'code', 'trader_id', 'search_param', 'title', 'trading_card_img',
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }]
    });

    // Get trade cards for display (sending and receiving)
    const sendCardsArray = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
    const receiveCardsArray = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];

    let sendTradeCards: any[] = [];
    let receiveTradeCards: any[] = [];

    if (tradeProposal.trade_sent_to === userId) {
      // User is receiver
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCardsArray } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param', 'title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCardsArray } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param', 'title','trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });
    } else {
      // User is sender
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCardsArray } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param', 'title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCardsArray } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param', 'title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });
    }

    // Format trading cards for parcel selection
    const formattedTradingCards = tradingCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      title: card.title,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    // Format trade cards for display
    const formattedSendCards = sendTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      title: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const formattedReceiveCards = receiveTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      title: card.title,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const responseData = {
      trading_cards: formattedTradingCards,
      send_trade_cards: formattedSendCards,
      receive_trade_cards: formattedReceiveCards,
      trade_id: parseInt(trade_id),
      trade_status: tradeProposal.trade_status,
      shipment_id: shipment.id,
      has_shipment_data: true
    };

    return sendApiResponse(res, 200, true, "Shipping parcel data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Get shipping parcel error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Save Parcel API
export const saveParcel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      trade_id,
      lengthInput,
      widthInput,
      heightInput,
      weightInput_lbs,
      weightInput_oz,
      packageSelect,
      packageSelectName
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validation (allow weightInput_oz = 0)
    const ozMissingForTrade = (weightInput_oz === undefined || weightInput_oz === null || weightInput_oz === '');
    if (!trade_id || !lengthInput || !widthInput || !heightInput || !weightInput_lbs || ozMissingForTrade) {
      return sendApiResponse(res, 400, false, "Enter the required fields correctly.", []);
    }

    // Validate numeric values
    const length = parseFloat(lengthInput);
    const width = parseFloat(widthInput);
    const height = parseFloat(heightInput);
    const weightLbs = parseFloat(weightInput_lbs);
    const weightOz = parseFloat(weightInput_oz);

    if (isNaN(length) || isNaN(width) || isNaN(height) || isNaN(weightLbs) || isNaN(weightOz)) {
      return sendApiResponse(res, 400, false, "All dimensions and weight must be numeric values", []);
    }

    if (length < 0 || width < 0 || height < 0 || weightLbs < 0 || weightOz < 0) {
      return sendApiResponse(res, 400, false, "Dimensions and weight must be positive values", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        trade_id: trade_id,
        user_id: userId
      },
      include: [
        {
          model: Address,
          as: 'toAddress',
          attributes: ['id', 'name', 'email', 'phone', 'street1', 'street2', 'city', 'state', 'country', 'zip']
        },
        {
          model: Address,
          as: 'fromAddress',
          attributes: ['id', 'name', 'email', 'phone', 'street1', 'street2', 'city', 'state', 'country', 'zip']
        }
      ]
    });

    if (!shipment || !shipment.to_address || !shipment.from_address) {
      return sendApiResponse(res, 400, false, "First enter the address information.", [], {
        redirect_url: "/trade/shipping-address"
      });
    }

    // Calculate total weight in ounces
    const weightInputLbs = 16 * weightLbs;
    const totalWeight = weightInputLbs + weightOz;

    // Prepare parcel information
    const parcelInfo = {
      length: length,
      width: width,
      height: height,
      weight: totalWeight,
      parcel_weight_unit: 'oz',
      weight_lbs: weightLbs,
      weight_oz: weightOz,
      parcel_weight_unit_oz: 'oz',
      parcel_weight_unit_lbs: 'lbs'
    };

    // Prepare label information - EasyPost expects specific format
    const selectedPackageIds: string[] = [];
    const selectedPackageNames: string[] = [];

    if (packageSelect && Array.isArray(packageSelect) && packageSelect.length > 0) {
      packageSelect.forEach((psid: any) => {
        selectedPackageIds.push('pl_' + psid);
      });
    }

    if (packageSelectName && Array.isArray(packageSelectName) && packageSelectName.length > 0) {
      packageSelectName.forEach((psName: any) => {
        selectedPackageNames.push(psName);
      });
    }

    // EasyPost expects postage_label as a string, not an object
    const labelInfo = selectedPackageIds.join(' | ');

    // Update shipment
    await shipment.update({
      parcel_weight_unit: 'oz',
      parcel: parcelInfo as any,
      postage_label: labelInfo as any
    });

    // Prepare shipment data for EasyPost API
    const shipmentData = shipment as any;
    const shipmentForReq: any = {
      to_address: shipmentData.toAddress ? {
        name: shipmentData.toAddress.name,
        phone: shipmentData.toAddress.phone,
        email: shipmentData.toAddress.email,
        street1: shipmentData.toAddress.street1,
        street2: shipmentData.toAddress.street2 || '',
        city: shipmentData.toAddress.city,
        state: shipmentData.toAddress.state,
        country: shipmentData.toAddress.country,
        zip: shipmentData.toAddress.zip
      } : null,
      from_address: shipmentData.fromAddress ? {
        name: shipmentData.fromAddress.name,
        phone: shipmentData.fromAddress.phone,
        email: shipmentData.fromAddress.email,
        street1: shipmentData.fromAddress.street1,
        street2: shipmentData.fromAddress.street2 || '',
        city: shipmentData.fromAddress.city,
        state: shipmentData.fromAddress.state,
        country: shipmentData.fromAddress.country,
        zip: shipmentData.fromAddress.zip
      } : null,
      parcel: {
        length: parcelInfo.length,
        width: parcelInfo.width,
        height: parcelInfo.height,
        weight: parcelInfo.weight
      }
    };

    // Call EasyPost API
    const apiKey = process.env.EASYPOST_API_KEY;
    if (!apiKey) {
      console.error('EASYPOST_API_KEY not found in environment variables');
      return sendApiResponse(res, 500, false, "EasyPost API key not configured", []);
    }


    const shipPostData = { shipment: shipmentForReq };
    try {
      const response = await fetch('https://api.easypost.com/v2/shipments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipPostData)
      });

      const responseData = await response.json();

      if (response.status === 200 || response.status === 201) {
        // Update shipment with EasyPost response
        await shipment.update({
          shipment_response: responseData as any
        });

        return sendApiResponse(res, 200, true, "Parcel information has been saved successfully.", [], {
          shipment_id: shipment.id,
          redirect_url: "/trade/shipping-carrier"
        });
      } else {
        const errorMessage = responseData.error?.message || "EasyPost API error";
        return sendApiResponse(res, 400, false, errorMessage, []);
      }
    } catch (apiError: any) {
      console.error('EasyPost API error:', apiError);
      return sendApiResponse(res, 500, false, "Failed to create shipment with EasyPost", []);
    }

  } catch (error: any) {
    console.error('Save parcel error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get Shipping Carrier API
export const getShippingCarrier = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trade_id } = req.query;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_id || typeof trade_id !== 'string') {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        trade_id: trade_id,
        user_id: userId
      }
    });

    if (!shipment || !shipment.shipment_response) {
      return sendApiResponse(res, 400, false, "Enter the parcel information.", [], {
        redirect_url: "/trade/shipping-parcel"
      });
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check trade status
    if (tradeProposal.trade_status === 'cancel' || tradeProposal.trade_status === 'declined') {
      const errorMessage = tradeProposal.trade_status === 'cancel'
        ? 'Trade are cancelled.'
        : 'Trade are declined.';
      return sendApiResponse(res, 400, false, errorMessage, [], {
        redirect_url: `/cancelled-trades/${tradeProposal.id}`
      });
    }

    // Parse shipment response
    let shipmentResponse;
    try {
      shipmentResponse = JSON.parse(shipment.shipment_response as unknown as string);
    } catch (parseError) {
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }

    // Calculate actual amount
    let actualAmount = 0;
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    let sendTradeCards: any[] = [];
    let receiveTradeCards: any[] = [];

    // Determine user role and get trading cards
    if (tradeProposal.trade_sent_to === userId) {
      // User is receiver
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      // Calculate amount from receive cards (cards user is getting)
      if (receiveTradeCards.length > 0) {
        receiveTradeCards.forEach(card => {
          actualAmount += parseFloat(card.trading_card_estimated_value || '0');
        });
      }
    } else {
      // User is sender
      sendTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: sendCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title','trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      receiveTradeCards = await TradingCard.findAll({
        where: { id: { [Op.in]: receiveCards } },
        attributes: [
          'id', 'code', 'trader_id', 'search_param','title','trading_card_img',
          'category_id', 'trading_card_estimated_value'
        ],
        include: [{
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }]
      });

      // Calculate amount from receive cards (cards user is getting)
      if (receiveTradeCards.length > 0) {
        receiveTradeCards.forEach(card => {
          actualAmount += parseFloat(card.trading_card_estimated_value || '0');
        });
      }
    }

    // Determine which cards user is sending for shipment
    let traderId = 0;
    let sendCardsForShipment: number[] = [];

    if (tradeProposal.trade_sent_to === userId) {
      // User is receiver, so they send the cards they're receiving
      traderId = tradeProposal.trade_sent_to!;
      sendCardsForShipment = receiveCards;
    } else {
      // User is sender, so they send their own cards
      traderId = tradeProposal.trade_sent_by!;
      sendCardsForShipment = sendCards;
    }

    // Get trading cards for shipment
    const tradingCards = await TradingCard.findAll({
      where: {
        trader_id: traderId,
        trading_card_status: '1',
        id: { [Op.in]: sendCardsForShipment }
      },
      order: [['id', 'DESC']],
      attributes: [
        'id', 'code', 'trader_id', 'search_param','title', 'trading_card_img',
        'category_id', 'trading_card_estimated_value'
      ],
      include: [{
        model: Category,
        as: 'parentCategory',
        attributes: ['id', 'sport_name']
      }]
    });

    // Format trading cards for frontend
    const formattedSendCards = sendTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      title: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const formattedReceiveCards = receiveTradeCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      title: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    const formattedTradingCards = tradingCards.map(card => ({
      id: card.id,
      code: card.code,
      trader_id: card.trader_id,
      search_param: card.search_param,
      title: card.title,
      trading_card_img: card.trading_card_img,
      category_id: card.category_id,
      trading_card_estimated_value: card.trading_card_estimated_value,
      cardname: card.title,
      category_name: (card as any).parentCategory?.sport_name || ''
    }));

    // Process shipment response for frontend
    const rates = shipmentResponse.rates || [];
    const rateIds = rates.map((rate: any) => rate.id);
    const selectedRate = shipment.selected_rate || '';
    const rateIsPresent = rateIds.indexOf(selectedRate);
    
    // Find default selected rate (lowest price)
    let defSelectedRate = '0.00';
    let defSelectedRateId = '';
    
    if (rates.length > 0) {
      rates.forEach((rate: any) => {
        if (defSelectedRate === '0.00' || parseFloat(rate.rate) <= parseFloat(defSelectedRate)) {
          defSelectedRate = rate.rate;
          defSelectedRateId = rate.id;
        }
      });
    }

    const responseData = {
      send_trade_cards: formattedSendCards,
      receive_trade_cards: formattedReceiveCards,
      trading_cards: formattedTradingCards,
      actual_amount: actualAmount.toFixed(2),
      shipment_response: shipmentResponse,
      rates: rates,
      rate_ids: rateIds,
      rate_is_present: rateIsPresent,
      selected_rate: selectedRate,
      def_selected_rate: defSelectedRate,
      def_selected_rate_id: defSelectedRateId,
      shipment_details: {
        id: shipment.id,
        trade_id: shipment.trade_id,
        shipment_status: shipment.shipment_status,
        shipment_payment_status: shipment.shipment_payment_status,
        selected_rate: shipment.selected_rate
      },
      trade_id: parseInt(trade_id),
      trade_status: tradeProposal.trade_status,
      has_shipment_response: true,
      has_rates: rates.length > 0
    };

    return sendApiResponse(res, 200, true, "Shipping carrier data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Get shipping carrier error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// GET Shipping Checkout Data API
export const getShippingCheckout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { selected_rate_id, trade_id } = req.query;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate selected rate
    if (!selected_rate_id || selected_rate_id === '') {
      return sendApiResponse(res, 400, false, "Select a Carrier and Delivery Service.", [], {
        redirect_url: "/trade/shipping-carrier"
      });
    }

    // Validate and convert trade_id
    if (!trade_id || typeof trade_id !== 'string') {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    const tradeId = parseInt(trade_id, 10);
    if (isNaN(tradeId) || tradeId <= 0) {
      return sendApiResponse(res, 400, false, "Invalid trade ID", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        user_id: userId,
        trade_id: tradeId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 400, false, "Either shipment completed or shipment details not available. please try again to ship your product.", [], {
        redirect_url: "/ongoing-trades"
      });
    }

    // Debug logging

    // Parse shipment data with error handling
    let shipmentResponse;
    try {
      shipmentResponse = typeof shipment.shipment_response === 'string' 
        ? (shipment.shipment_response ? JSON.parse(shipment.shipment_response) : {}) 
        : shipment.shipment_response || {};
    } catch (error) {
      console.error('Error parsing shipment_response:', error);
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }
    
    let postageLabel;
    try {
      postageLabel = typeof shipment.postage_label === 'string' 
        ? (shipment.postage_label ? JSON.parse(shipment.postage_label) : {}) 
        : shipment.postage_label || {};
    } catch (error) {
      console.error('Error parsing postage_label:', error);
      postageLabel = {};
    }
    
    let shipParcelDetails;
    try {
      shipParcelDetails = typeof shipment.parcel === 'string' 
        ? (shipment.parcel ? JSON.parse(shipment.parcel) : {}) 
        : shipment.parcel || {};
    } catch (error) {
      console.error('Error parsing parcel:', error);
      return sendApiResponse(res, 400, false, "Invalid parcel data", []);
    }

    // Validate shipment response structure
    if (!shipmentResponse || !shipmentResponse.rates || !Array.isArray(shipmentResponse.rates)) {
      return sendApiResponse(res, 400, false, "Invalid shipment response structure", []);
    }

    // Find selected rate
    const rates = shipmentResponse.rates;
    const rateIds = rates.map((rate: any) => rate.id);
    const rateIndex = rateIds.indexOf(selected_rate_id);
    
    if (rateIndex === -1) {
      return sendApiResponse(res, 400, false, "Selected rate not found", []);
    }

    const rateData = rates[rateIndex];
    
    // Validate rate data
    if (!rateData || !rateData.id || !rateData.rate) {
      return sendApiResponse(res, 400, false, "Invalid rate data", []);
    }

    // Calculate amounts
    const insuranceAmount = '0.00';
    const insureShipment = false;
    const totalAmount = (parseFloat(insuranceAmount) + parseFloat(rateData.rate)).toFixed(2);

    // Format weight display
    const weightDisplay = [];
    if (shipParcelDetails.weight_lbs > 0) weightDisplay.push(`${shipParcelDetails.weight_lbs} lbs`);
    if (shipParcelDetails.weight_oz > 0) weightDisplay.push(`${shipParcelDetails.weight_oz} oz`);
    const finalWeight = weightDisplay.length > 0 
      ? weightDisplay.join(' ') 
      : `${shipParcelDetails.weight} ${shipment.parcel_weight_unit}`;

    // Build package details from trade cards being sent by the current user
    
    let packageDetails: string[][] = [];

    try {
      // Fetch trade proposal to determine which cards the current user is sending
      const tradeProposal = await TradeProposal.findByPk(tradeId);
      if (tradeProposal) {
        // Determine IDs of cards the current user is sending in this shipment
        let sendingCardIds: number[] = [];
        if (tradeProposal.trade_sent_to === userId) {
          // Current user is receiver; they send the cards listed in receive_cards
          sendingCardIds = tradeProposal.receive_cards
            ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())).filter((n: number) => !isNaN(n))
            : [];
        } else if (tradeProposal.trade_sent_by === userId) {
          // Current user is sender; they send the cards listed in send_cards
          sendingCardIds = tradeProposal.send_cards
            ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())).filter((n: number) => !isNaN(n))
            : [];
        }

        if (sendingCardIds.length > 0) {
          const sendingCards = await TradingCard.findAll({
            where: { id: { [Op.in]: sendingCardIds } },
            attributes: ['id', 'search_param','title','category_id']
          });
          // join categories for names
          const categoryIds = (sendingCards.map(c => c.category_id)
            .filter((id: any): id is number => typeof id === 'number'));
          const categories = await Category.findAll({ where: { id: { [Op.in]: categoryIds as number[] } }, attributes: ['id','sport_name'] });
          const catMap: Record<number, string> = {} as any;
          categories.forEach(cat => { (catMap as any)[cat.id] = cat.sport_name; });

          // Build detailed package details with only title and category_name
          packageDetails = (sendingCards as any[])
            .map(card => [
              card.category_id ? (catMap as any)[card.category_id] || '' : '',
              String(card.title || '').trim()
            ])
            .filter(item => item[1] && item[1].length > 0);
        }
      }
    } catch (pkgErr) {
      console.error('Error building package details from trade cards:', pkgErr);
    }

    // Fallbacks if no card names were found
    if (packageDetails.length === 0) {
      if (postageLabel && typeof postageLabel === 'object') {
        const possibleFields = ['object', 'description', 'contents', 'items', 'package_contents', 'label_object'];
        for (const field of possibleFields) {
          const val = postageLabel[field];
          if (typeof val === 'string' && val.trim() !== '') {
            packageDetails = val
              .split(' | ')
              .map((item: string) => ['', item ? item.trim() : ''])
              .filter((item: string[]) => Array.isArray(item) && typeof item[1] === 'string' && item[1].length > 0);
            break;
          }
        }
      }
      
      if (packageDetails.length === 0) {
        packageDetails = [['', 'Package contents not specified']];
      }
    }

    // Get trade proposal to determine sender/receiver roles
    const tradeProposal = await TradeProposal.findByPk(tradeId);
    if (!tradeProposal) {
      return sendApiResponse(res, 400, false, "Trade proposal not found", []);
    }

    // Determine who is sender and receiver based on logged-in user
    // Sender = logged-in user (current user shipping their cards)
    // Receiver = the other party in the trade
    let senderUserId = userId;
    let receiverUserId: number;
    
    if (tradeProposal.trade_sent_by === userId) {
      // Current user initiated the trade, receiver is trade_sent_to
      receiverUserId = tradeProposal.trade_sent_to!;
    } else if (tradeProposal.trade_sent_to === userId) {
      // Current user received the trade, receiver is trade_sent_by
      receiverUserId = tradeProposal.trade_sent_by!;
    } else {
      return sendApiResponse(res, 403, false, "Unauthorized access to this trade", []);
    }

    // Build sender address (logged-in user's address) - use from_address as it represents the current user
    let senderAddressData = {
      name: shipmentResponse.from_address?.name || '',
      street1: shipmentResponse.from_address?.street1 || '',
      street2: shipmentResponse.from_address?.street2 || '',
      city: shipmentResponse.from_address?.city || '',
      state: shipmentResponse.from_address?.state || '',
      zip: shipmentResponse.from_address?.zip || '',
      phone: shipmentResponse.from_address?.phone || '',
      email: shipmentResponse.from_address?.email || ''
    };

    // Build receiver address (other party's address) - use to_address as it represents the other user
    let receiverAddressData = {
      name: shipmentResponse.to_address?.name || '',
      street1: shipmentResponse.to_address?.street1 || '',
      street2: shipmentResponse.to_address?.street2 || '',
      city: shipmentResponse.to_address?.city || '',
      state: shipmentResponse.to_address?.state || '',
      zip: shipmentResponse.to_address?.zip || '',
      phone: shipmentResponse.to_address?.phone || '',
      email: shipmentResponse.to_address?.email || ''
    };

    try {
      // If missing critical fields, fallback to Address records stored on Shipment
      const needsSenderFallback = !senderAddressData.name || !senderAddressData.street1;
      const needsReceiverFallback = !receiverAddressData.name || !receiverAddressData.street1;

      // @ts-ignore: shipment may have numeric address ids
      const fromAddressId = (shipment as any).from_address;
      // @ts-ignore
      const toAddressId = (shipment as any).to_address;

      if (needsSenderFallback && fromAddressId) {
        const senderAddrRow = await Address.findByPk(Number(fromAddressId));
        if (senderAddrRow) {
          senderAddressData = {
            name: senderAddrRow.name || '',
            street1: senderAddrRow.street1 || '',
            street2: senderAddrRow.street2 || '',
            city: senderAddrRow.city || '',
            state: senderAddrRow.state || '',
            zip: senderAddrRow.zip || '',
            phone: senderAddrRow.phone || '',
            email: senderAddrRow.email || ''
          };
        }
      }

      if (needsReceiverFallback && toAddressId) {
        const receiverAddrRow = await Address.findByPk(Number(toAddressId));
        if (receiverAddrRow) {
          receiverAddressData = {
            name: receiverAddrRow.name || '',
            street1: receiverAddrRow.street1 || '',
            street2: receiverAddrRow.street2 || '',
            city: receiverAddrRow.city || '',
            state: receiverAddrRow.state || '',
            zip: receiverAddrRow.zip || '',
            phone: receiverAddrRow.phone || '',
            email: receiverAddrRow.email || ''
          };
        }
      }

      // If receiver still mirrors sender (or still missing), try to get receiver's address directly
      const receiverLooksSameAsSender = (
        receiverAddressData.name === senderAddressData.name &&
        receiverAddressData.street1 === senderAddressData.street1 &&
        receiverAddressData.city === senderAddressData.city &&
        receiverAddressData.state === senderAddressData.state &&
        receiverAddressData.zip === senderAddressData.zip
      );

      if (receiverLooksSameAsSender || !receiverAddressData.street1) {
        // Try to get receiver's address from their Address records
        const receiverAddress = await Address.findOne({
          where: {
            user_id: receiverUserId,
            is_deleted: '0',
            is_sender: '1' // Get their sender address (which becomes our receiver address)
          },
          order: [['mark_default', 'DESC'], ['created_at', 'DESC']]
        });

        if (receiverAddress) {
          receiverAddressData = {
            name: receiverAddress.name || receiverAddressData.name,
            street1: receiverAddress.street1 || receiverAddressData.street1,
            street2: receiverAddress.street2 || receiverAddressData.street2,
            city: receiverAddress.city || receiverAddressData.city,
            state: receiverAddress.state || receiverAddressData.state,
            zip: receiverAddress.zip || receiverAddressData.zip,
            phone: receiverAddress.phone || receiverAddressData.phone,
            email: receiverAddress.email || receiverAddressData.email
          };
        } else {
          // Fallback: try partner's shipment to resolve receiver details
          const partnerShipment = await Shipment.findOne({
            where: {
              trade_id: tradeId,
              user_id: receiverUserId
            },
            include: [{
              model: Address,
              as: 'toAddress',
              attributes: ['name','street1','street2','city','state','zip','phone','email']
            }]
          });

          const partnerToAddress: any = (partnerShipment as any)?.toAddress;
          if (partnerToAddress) {
            receiverAddressData = {
              name: partnerToAddress.name || receiverAddressData.name,
              street1: partnerToAddress.street1 || receiverAddressData.street1,
              street2: partnerToAddress.street2 || receiverAddressData.street2,
              city: partnerToAddress.city || receiverAddressData.city,
              state: partnerToAddress.state || receiverAddressData.state,
              zip: partnerToAddress.zip || receiverAddressData.zip,
              phone: partnerToAddress.phone || receiverAddressData.phone,
              email: partnerToAddress.email || receiverAddressData.email
            };
          }
        }
      }
    } catch (addrErr) {
      console.warn('Address fallback failed:', addrErr);
    }

    const responseData = {
      sender_address: senderAddressData,
      receiver_address: receiverAddressData,
      package_dimensions: {
        length: shipParcelDetails.length || 0,
        width: shipParcelDetails.width || 0,
        height: shipParcelDetails.height || 0,
        weight: finalWeight
      },
      package_details: packageDetails,
      shipment_details: {
        carrier: rateData.carrier || '',
        service: rateData.service || '',
        transit_days: rateData.service === 'Express' ? '1-2' : rateData.delivery_days || 0
      },
      shipment_cost: {
        carrier_cost: rateData.rate || '0.00',
        insurance_cost: insuranceAmount,
        insure_shipment: insureShipment,
        total_cost: totalAmount
      },
      rate_data: {
        id: rateData.id,
        rate: rateData.rate,
        carrier: rateData.carrier,
        service: rateData.service,
        delivery_days: rateData.delivery_days
      }
    };

    return sendApiResponse(res, 200, true, "Shipping checkout data retrieved successfully", [responseData]);

  } catch (error: any) {
    console.error("Get shipping checkout error:", error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipping Checkout API (POST)
export const shippingCheckout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      selected_rate_id,
      selected_rate,
      cart_amount,
      insure_shipment
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate selected rate
    if (!selected_rate_id || selected_rate_id === '') {
      return sendApiResponse(res, 400, false, "Select a Carrier and Delivery Service.", [], {
        redirect_url: "/trade/shipping-carrier"
      });
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        user_id: userId,
        trade_id: req.body.trade_id || req.query.trade_id
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 400, false, "Either shipment completed or shipment details not available. please try again to ship your product.", [], {
        redirect_url: "/ongoing-trades"
      });
    }

    // Update shipment with selected rate and insurance amount
    await shipment.update({
      cart_amount_for_insurance: cart_amount || null,
      selected_rate: selected_rate_id
    });

    // Parse shipment response
    let shipmentResponse;
    try {
      shipmentResponse = JSON.parse(shipment.shipment_response as unknown as string);
    } catch (parseError) {
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }

    // Parse postage label
    let postageLabel;
    try {
      postageLabel = JSON.parse(shipment.postage_label as unknown as string);
    } catch (parseError) {
      postageLabel = {};
    }

    // Parse parcel details
    let shipParcelDetails;
    try {
      shipParcelDetails = JSON.parse(shipment.parcel as unknown as string);
    } catch (parseError) {
      shipParcelDetails = {};
    }

    // Find selected rate data
    const rates = shipmentResponse.rates || [];
    const rateIds = rates.map((rate: any) => rate.id);
    const rateIsPresent = rateIds.indexOf(selected_rate_id);
    
    if (rateIsPresent === -1) {
      return sendApiResponse(res, 400, false, "Selected rate not found in available rates", []);
    }

    const rateData = rates[rateIsPresent];

    // Calculate insurance and total amounts
    const insuranceAmount = insure_shipment ? (cart_amount || '0.00') : '0.00';
    const totalAmount = (parseFloat(insuranceAmount) + parseFloat(rateData.rate)).toFixed(2);

    // Format addresses for frontend
    const senderAddress = shipmentResponse.to_address || {};
    const receiverAddress = shipmentResponse.from_address || {};

    // Format package details
    const packageDetails = {
      length: shipParcelDetails.length || 0,
      width: shipParcelDetails.width || 0,
      height: shipParcelDetails.height || 0,
      weight: shipParcelDetails.weight || 0,
      weight_lbs: shipParcelDetails.weight_lbs || 0,
      weight_oz: shipParcelDetails.weight_oz || 0,
      parcel_weight_unit: shipment.parcel_weight_unit || 'oz'
    };

    // Format postage label objects
    const postageLabelObjects = [];
    if (postageLabel.object) {
      const objectArray = postageLabel.object.split(' | ');
      postageLabelObjects.push(...objectArray);
    }

    const responseData = {
      shipment_response: shipmentResponse,
      postage_label: postageLabel,
      rate_data: rateData,
      insurance_amount: insuranceAmount,
      total_amount: totalAmount,
      insure_shipment: insure_shipment === '1' || insure_shipment === true,
      shipment_details: {
        id: shipment.id,
        trade_id: shipment.trade_id,
        selected_rate: shipment.selected_rate,
        cart_amount_for_insurance: shipment.cart_amount_for_insurance,
        parcel_weight_unit: shipment.parcel_weight_unit
      },
      ship_parcel_details: packageDetails,
      sender_address: {
        name: senderAddress.name || '',
        phone: senderAddress.phone || '',
        email: senderAddress.email || '',
        street1: senderAddress.street1 || '',
        street2: senderAddress.street2 || '',
        city: senderAddress.city || '',
        state: senderAddress.state || '',
        country: senderAddress.country || '',
        zip: senderAddress.zip || ''
      },
      receiver_address: {
        name: receiverAddress.name || '',
        phone: receiverAddress.phone || '',
        email: receiverAddress.email || '',
        street1: receiverAddress.street1 || '',
        street2: receiverAddress.street2 || '',
        city: receiverAddress.city || '',
        state: receiverAddress.state || '',
        country: receiverAddress.country || '',
        zip: receiverAddress.zip || ''
      },
      package_details: postageLabelObjects,
      carrier_info: {
        carrier: rateData.carrier,
        service: rateData.service,
        delivery_days: rateData.service === 'Express' ? '1-2' : (rateData.delivery_days || 'Unknown'),
        rate: rateData.rate
      },
      cost_breakdown: {
        carrier_cost: rateData.rate,
        insurance_cost: insuranceAmount,
        total_cost: totalAmount
      }
    };

    return sendApiResponse(res, 200, true, "Shipping checkout data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Shipping checkout error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipping Confirm Order API
export const shippingConfirmOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      selected_rate_id,
      selected_rate,
      amount,
      trade_id
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    // Validate required fields
    if (!selected_rate_id || !amount || !trade_id) {
      return sendApiResponse(res, 400, false, "Selected rate ID, amount, and trade ID are required", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        trade_id: trade_id,
        user_id: userId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    // Check if shipment is already completed
    if (shipment.tracking_id && shipment.tracking_id !== '') {
      return sendApiResponse(res, 400, false, "This shipment has already been completed.", [], {
        redirect_url: "/ongoing-trades"
      });
    }

    // Validate selected rate
    if (!selected_rate_id || selected_rate_id === '') {
      return sendApiResponse(res, 400, false, "Select carrier service", [], {
        redirect_url: "/trade/shipping-carrier"
      });
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade not available, please try again", [], {
        redirect_url: "/trade/shipping-carrier"
      });
    }

    // Validate user access to trade
    if (tradeProposal.trade_sent_by !== userId && tradeProposal.trade_sent_to !== userId) {
      return sendApiResponse(res, 403, false, "Invalid access", [], {
        redirect_url: "/trade/shipping-carrier"
      });
    }

    // Update shipment with selected rate
    await shipment.update({
      selected_rate: selected_rate_id
    });

    // Return simplified response without PayPal configuration
    const responseData = {
      shipment_id: shipment.id,
      trade_id: parseInt(trade_id),
      amount: parseFloat(amount),
      selected_rate_id: selected_rate_id,
      message: "Shipment order confirmed successfully"
    };

    return sendApiResponse(res, 200, true, "Shipment order confirmed successfully", [responseData]);

  } catch (error: any) {
    console.error('Shipping confirm order error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Get trade counter detail for editing trade proposal
 * GET /api/users/trade-counter-detail/:card_id
 */
export const getTradeCounterDetail = async (req: Request, res: Response) => {
  try {
    const { card_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return sendApiResponse(res, 401, false, "Authentication required", []);
    }

    if (!card_id) {
      return sendApiResponse(res, 400, false, "Trade proposal ID is required", []);
    }

    // Get trade proposal details
    const tradeProposal = await TradeProposal.findByPk(card_id);

    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Determine the interested user (the other party in the trade)
    // If current user is trade_sent_by, then interested user is trade_sent_to
    // If current user is trade_sent_to, then interested user is trade_sent_by
    let interestedUserId;
    if (userId === tradeProposal.trade_sent_by) {
      interestedUserId = tradeProposal.trade_sent_to;
    } else if (userId === tradeProposal.trade_sent_to) {
      interestedUserId = tradeProposal.trade_sent_by;
    } else {
      return sendApiResponse(res, 403, false, "You are not authorized to view this trade proposal", []);
    }
    
    // Check if user is trying to trade with themselves
    if (interestedUserId === userId) {
      return sendApiResponse(res, 400, false, "You can't trade with yourself", []);
    }

    // Get interested user details
    const interestedUser = await User.findByPk(interestedUserId, {
      attributes: ['id', 'username', 'first_name', 'last_name']
    });

    if (!interestedUser) {
      return sendApiResponse(res, 404, false, "Interested user not found", []);
    }

    // Get interested user's trading cards (closet) with category and condition
    // Determine which proposal IDs to force-include per closet based on current user's role
    const forceIncludeUserIds = (userId === tradeProposal.trade_sent_by)
      ? (tradeProposal.send_cards || '')
      : (tradeProposal.receive_cards || '');
    const forceIncludeInterestedIds = (userId === tradeProposal.trade_sent_by)
      ? (tradeProposal.receive_cards || '')
      : (tradeProposal.send_cards || '');

    const interestedClosetsQuery = `
      SELECT 
        tc.id,
        tc.code,
        tc.trader_id,
        tc.search_param,
        tc.title,
        tc.trading_card_img,
        tc.category_id,
        tc.trading_card_estimated_value,
        c.sport_name as category_name,
        CASE 
          WHEN FIND_IN_SET(tc.id, ?) > 0 THEN true 
          ELSE false 
        END as is_selected
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE tc.trader_id = ? 
        AND (
          (
            tc.trading_card_status = '1' 
        AND tc.can_trade = '1' 
            AND tc.is_traded = '0' 
        AND tc.mark_as_deleted IS NULL
          )
          OR FIND_IN_SET(tc.id, ?) > 0
        )
      ORDER BY tc.updated_at DESC
    `;

    const interestedClosets = await sequelize.query(interestedClosetsQuery, {
      replacements: [forceIncludeInterestedIds, interestedUserId, forceIncludeInterestedIds],
      type: QueryTypes.SELECT
    });

    // Get current user's trading cards (closet) with category and condition
    const userClosetsQuery = `
      SELECT 
        tc.id,
        tc.code,
        tc.trader_id,
        tc.search_param,
        tc.title,
        tc.trading_card_img,
        tc.category_id,
        tc.trading_card_estimated_value,
        c.sport_name as category_name,
        CASE 
          WHEN FIND_IN_SET(tc.id, ?) > 0 THEN true 
          ELSE false 
        END as is_selected
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE tc.trader_id = ? 
        AND (
          (
            tc.can_trade = '1' 
        AND tc.trading_card_status = '1' 
            AND tc.is_traded = '0' 
        AND tc.mark_as_deleted IS NULL
          )
          OR FIND_IN_SET(tc.id, ?) > 0
        )
      ORDER BY tc.updated_at DESC
    `;

    const userClosets = await sequelize.query(userClosetsQuery, {
      replacements: [forceIncludeUserIds, userId, forceIncludeUserIds],
      type: QueryTypes.SELECT
    });

    // Get product count for interested user
    const productCount = await TradingCard.count({
      where: {
        trader_id: interestedUserId,
        trading_card_status: '1',
        is_traded: '0',
        mark_as_deleted: null,
        [Op.or]: [
          { can_trade: '1' },
          { can_buy: '1' }
        ]
      }
    });

    // Check if current user follows the interested user
    const follower = await Follower.findOne({
      where: {
        trader_id: interestedUserId,
        user_id: userId
      }
    });

    // Parse send and receive cards from trade proposal
    const sendCardsTp = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
    const receiveCardsTp = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
    const allProducts = [...sendCardsTp, ...receiveCardsTp];

    // Calculate product count based on user role (like in Blade file)
    let finalProductCount = productCount;
    if (userId === tradeProposal.trade_sent_by) {
      // If current user is the one who sent the trade proposal
      if (receiveCardsTp.length > 0) {
        finalProductCount = productCount + receiveCardsTp.length;
      }
    } else {
      // If current user is the one who received the trade proposal
      if (sendCardsTp.length > 0) {
        finalProductCount = productCount + sendCardsTp.length;
      }
    }

    // Get trade transactions count for interested user
    const tradeTransactionsCount = await TradeTransaction.count({
      where: {
        [Op.or]: [
          { trade_sent_by_key: interestedUserId },
          { trade_sent_to_key: interestedUserId }
        ]
      }
    });

    // Prepare response data according to required format
    const responseData = {
      trade_proposal: {
        id: tradeProposal.id,
        code: tradeProposal.code,
        main_card: tradeProposal.main_card,
        send_cards: tradeProposal.send_cards,
        receive_cards: tradeProposal.receive_cards,
        add_cash: (tradeProposal.add_cash && Number(tradeProposal.add_cash) !== 0) ? tradeProposal.add_cash : '',
        ask_cash: (tradeProposal.ask_cash && Number(tradeProposal.ask_cash) !== 0) ? tradeProposal.ask_cash : '',
        message: tradeProposal.message,
        trade_status: tradeProposal.trade_status,
        trade_sent_by: tradeProposal.trade_sent_by,
        trade_sent_to: tradeProposal.trade_sent_to,
        created_at: tradeProposal.created_at,
        updated_at: tradeProposal.updated_at
      },
      interested_user: {
        id: interestedUser.id,
        username: interestedUser.username,
        first_name: interestedUser.first_name,
        last_name: interestedUser.last_name,
        profile_picture: interestedUser.profile_picture,
        ebay_store_url: interestedUser.ebay_store_url,
        total_trades_count: tradeTransactionsCount,
        product_count: finalProductCount
      },
      user_closets: userClosets.map((card: any) => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: card.category_name,
        is_selected: card.is_selected
      })),
      interested_closets: interestedClosets.map((card: any) => ({
        id: card.id,
        code: card.code,
        trader_id: card.trader_id,
        search_param: card.search_param,  
        title: card.title,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: card.category_name,
        is_selected: card.is_selected
      })),
      is_following: follower ? (follower.follower_status === '1') : false,
      send_cards_tp: sendCardsTp.map(id => parseInt(id)),
      receive_cards_tp: receiveCardsTp.map(id => parseInt(id)),
      all_products: allProducts.map(id => parseInt(id)),
      td: {
        open_text: "Counter Trade",
        next_text: "Continue Trade"
      }
    };

    return sendApiResponse(res, 200, true, "Trade proposal detail retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Trade counter detail error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

/**
 * Handle shipping payment success and complete shipment
 * POST /api/users/shipping-trade-success/:trade_id
 * Body: { shipment_id: 123, paymentId: "xxx", token: "xxx", PayerID: "xxx" }
 */
export const shippingTradeSuccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { trade_id } = req.params;
    const { shipment_id, paymentId, token, PayerID } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!shipment_id || !paymentId || !token || !PayerID) {
      return sendApiResponse(res, 400, false, "Missing payment details", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        id: parseInt(shipment_id as string),
        trade_id: parseInt(trade_id as string)
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    // Update shipment with payment details
    await shipment.update({
      paymentId: paymentId as string,
      token: token as string,
      PayerID: PayerID as string,
      shipment_payment_status: 1
    });

    // Create customs info (simplified)
    const customInfo = {
      status: true,
      data: {
        contents_type: 'merchandise',
        contents_explanation: 'Trading cards',
        customs_items: []
      }
    };

    if (!customInfo.status) {
      return sendApiResponse(res, 500, false, "Customs info creation failed", []);
    }

    // Prepare shipment data for EasyPost
    const shipmentResponse = JSON.parse(shipment.shipment_response as unknown as string);
    const shipmentData = {
      from_address: JSON.parse(shipment.from_address as unknown as string),
      to_address: JSON.parse(shipment.to_address as unknown as string),
      parcel: JSON.parse(shipment.parcel as unknown as string),
      customs_info: customInfo.data
    };

    // Remove unnecessary fields
    delete shipmentData.from_address.id;
    delete shipmentData.from_address.user_id;
    delete shipmentData.from_address.is_sender;
    delete shipmentData.from_address.created_at;
    delete shipmentData.from_address.updated_at;

    delete shipmentData.to_address.id;
    delete shipmentData.to_address.user_id;
    delete shipmentData.to_address.is_sender;
    delete shipmentData.to_address.created_at;
    delete shipmentData.to_address.updated_at;

    // Call EasyPost API to buy shipment
    const easyPostResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentResponse.id}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shipment: shipmentData,
        rate: { id: shipment.selected_rate }
      })
    });

    if (!easyPostResponse.ok) {
      const errorData = await easyPostResponse.json();
      return sendApiResponse(res, 500, false, errorData.error?.message || "Shipment purchase failed", []);
    }

    const easyPostData = await easyPostResponse.json();

    // Update shipment with tracking info
    await shipment.update({
      tracking_id: easyPostData.tracking_code || null,
      shipment_status: 'Pre-Transit'
    });

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Update trade proposal based on user role and set status
    if (tradeProposal.trade_sent_by === userId) {
      await tradeProposal.update({
        shipped_by_trade_sent_by: 1,
        shipped_on_by_trade_sent_by: new Date()
      });
      
      // Set status using HelperTradeAndOfferStatus equivalent
      await setTradeProposalStatus(tradeProposal.id, 'shipped-by-sender');
    } else if (tradeProposal.trade_sent_to === userId) {
      await tradeProposal.update({
        shipped_by_trade_sent_to: 1,
        shipped_on_by_trade_sent_to: new Date()
      });
      
      // Set status using HelperTradeAndOfferStatus equivalent
      await setTradeProposalStatus(tradeProposal.id, 'shipped-by-receiver');
    }

    // Check if both traders have shipped (Laravel HelperTradeAndOfferStatus logic)
    if (tradeProposal.shipped_by_trade_sent_by === 1 && tradeProposal.shipped_by_trade_sent_to === 1) {
      await setTradeProposalStatus(tradeProposal.id, 'both-traders-shipped');
    }

    // Get card names for email
    const cardIds = tradeProposal.trade_sent_by === userId 
      ? tradeProposal.send_cards?.split(',') || []
      : tradeProposal.receive_cards?.split(',') || [];

    const cards = await TradingCard.findAll({
      where: { id: cardIds },
      attributes: ['title']
    });

    const cardNames = cards
      .filter(card => card.title)
      .map((card, index) => `${index + 1}. ${card.title}`)
      .join('\n');

    // Send emails if tracking ID exists
    if (shipment.tracking_id) {
      const otherUserId = tradeProposal.trade_sent_by === userId 
        ? tradeProposal.trade_sent_to 
        : tradeProposal.trade_sent_by;

      const otherUser = await User.findByPk(otherUserId);
      const currentUser = await User.findByPk(userId);

      if (otherUser && currentUser) {
        // Format card names for email (replace newlines with HTML breaks)
        const formattedCardNames = cardNames.replace(/\n/g, '<br>');
        
        await sendShipmentCompletionEmails(
          currentUser,
          otherUser,
          formattedCardNames,
          shipment.tracking_id,
          shipment.shipment_status || 'Pre-Transit'
        );
      }
    }

    // Create notification using helper function (Laravel equivalent)
    await setTradersNotificationOnVariousActionBasis(
      'shipped-proposal',
      userId,
      tradeProposal.trade_sent_by === userId ? tradeProposal.trade_sent_to! : tradeProposal.trade_sent_by!,
      tradeProposal.id,
      'Trade'
    );

    const responseData = {
      shipment_id: shipment.id,
      trade_id: parseInt(trade_id as string),
      tracking_id: shipment.tracking_id,
      shipment_status: shipment.shipment_status,
      trade_code: tradeProposal.code,
      redirect_url: `${process.env.FRONTEND_URL}/profile/deals/ongoing?trade_id=${tradeProposal.id}`
    };

    return sendApiResponse(res, 200, true, "Shipment Successfully Completed", responseData);

  } catch (error: any) {
    console.error('Shipping trade success error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Debug API to check available trade proposal statuses
export const getTradeProposalStatuses = async (req: Request, res: Response) => {
  try {
    const { TradeProposalStatus } = await import("../models/tradeProposalStatus.model.js");
    
    const statuses = await TradeProposalStatus.findAll({
      attributes: ['id', 'alias', 'name', 'to_sender', 'to_receiver'],
      where: { status: '1' },
      order: [['alias', 'ASC']]
    });


    return sendApiResponse(res, 200, true, "Trade proposal statuses retrieved", statuses);
  } catch (error: any) {
    console.error('Error getting trade proposal statuses:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipping address details API based on Laravel shipping_address_buySell function
export const getShippingAddressDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return sendApiResponse(res, 400, false, "Invalid buy sell card ID", []);
    }

    // Get user addresses (sender addresses)
    const addresses = await Address.findAll({
      where: {
        user_id: userId,
        is_sender: '1',
        is_deleted: '0'
      },
      order: [['updated_at', 'DESC']],
      attributes: ['id', 'name', 'email', 'phone', 'street1', 'street2', 'city', 'state', 'country', 'zip', 'mark_default']
    });

    // Get buy sell card details
    const buySellCard = await BuySellCard.findByPk(id, {
      include: [
        {
          model: BuyOfferProduct,
          as: 'buyOfferProducts',
          include: [
            {
              model: TradingCard,
              as: 'product',
              attributes: ['id', 'search_param','title', 'trading_card_img', 'category_id'],
              include: [
                {
                  model: Category,
                  as: 'parentCategory',
                  attributes: ['id', 'sport_name']
                }
              ]
            }
          ]
        },
        {
          model: TradingCard,
          as: 'tradingCard',
          attributes: ['id', 'search_param','title', 'trading_card_img', 'category_id'],
          include: [
            {
              model: Category,
              as: 'parentCategory',
              attributes: ['id', 'sport_name']
            }
          ]
        }
      ]
    });

    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "Buy sell card not found", []);
    }

    // Get similar buy sell cards for sending trade cards
    const similarBuySellCards = await BuySellCard.findAll({
      where: {
        [Op.or]: [
          { buyer: buySellCard.buyer, seller: buySellCard.seller },
          { buyer: buySellCard.seller, seller: buySellCard.buyer }
        ],
        buying_status: 'purchased'
      },
      attributes: ['main_card']
    });

    const mainCardIds = similarBuySellCards.map((card: any) => card.main_card).filter((id: any) => id);

    // Get sending trade cards
    const sendTradeCards = await TradingCard.findAll({
      where: {
        id: { [Op.in]: mainCardIds }
      },
      attributes: ['id', 'category_id', 'search_param','title','trading_card_img'],
      include: [
        {
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }
      ]
    });

    // Check existing shipment
    const existingShipment = await Shipment.findOne({
      where: {
        buy_sell_id: buySellCard.id,
        user_id: userId
      }
    });

    // Determine delivery address based on user role
    let delivery_address = 0;
    if (userId === buySellCard.seller) {
      const delAddress = await Address.findOne({
        where: {
          user_id: buySellCard.buyer,
          mark_default: 1
        }
      });
      if (delAddress) {
        delivery_address = delAddress.id;
      }
    } else if (userId === buySellCard.buyer) {
      const delAddress = await Address.findOne({
        where: {
          user_id: buySellCard.seller,
          mark_default: 1
        }
      });
      if (delAddress) {
        delivery_address = delAddress.id;
      }
    }

    // Prepare response data according to Blade file structure
    const buySellCardData = buySellCard as any;
    const responseData = {
      addresses: addresses.map((address: any) => ({
        id: address.id,
        name: address.name,
        email: address.email,
        phone: address.phone,
        street1: address.street1,
        street2: address.street2,
        city: address.city,
        state: address.state,
        country: address.country,
        zip: address.zip,
        mark_default: address.mark_default
      })),
      delivery_address,
      sendTradeCards: sendTradeCards.map((card: any) => ({
        id: card.id,
        category_id: card.category_id,
        search_param: card.search_param,    
        title: card.title,
        trading_card_img: card.trading_card_img,
        categoryname: card.parentCategory ? {
          id: card.parentCategory.id,
          sport_name: card.parentCategory.sport_name
        } : null
      })),
      buy_id: Number(id),
      // Main object structure as expected by Blade file
      buySellCards: {
        id: buySellCardData.id,
        buyer: buySellCardData.buyer,
        seller: buySellCardData.seller,
        buying_status: buySellCardData.buying_status,
        // buy_offer_product structure as expected by Blade
        buy_offer_product: buySellCardData.buyOfferProducts ? buySellCardData.buyOfferProducts.map((product: any) => ({
          id: product.id,
          product: product.product ? {
            id: product.product.id,
            search_param: product.product.search_param, 
            title: product.product.title,
            trading_card_img: product.product.trading_card_img,
            categoryname: product.product.parentCategory ? {
              id: product.product.parentCategory.id,
              sport_name: product.product.parentCategory.sport_name
            } : null
          } : null
        })) : [],
        // tradingcard structure as expected by Blade
        tradingcard: buySellCardData.tradingCard ? {
          id: buySellCardData.tradingCard.id,
          search_param: buySellCardData.tradingCard.search_param,
          title: buySellCardData.tradingCard.title,
          trading_card_img: buySellCardData.tradingCard.trading_card_img,
          categoryname: buySellCardData.tradingCard.parentCategory ? {
            id: buySellCardData.tradingCard.parentCategory.id,
            sport_name: buySellCardData.tradingCard.parentCategory.sport_name
          } : null
        } : null
      },
      existingShipment: existingShipment ? {
        id: existingShipment.id,
        paymentId: existingShipment.paymentId,
        selected_rate: existingShipment.selected_rate,
        tracking_id: existingShipment.tracking_id
      } : null
    };

    return sendApiResponse(res, 200, true, "Shipping address details retrieved successfully", [responseData]);

  } catch (error: any) {
    console.error('Get shipping address details error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipping buysell initialize API based on Laravel shipmentInitialize_buySell function
export const shippingBuysellInitialize = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { buy_id, delivery_address, pickup_address } = req.body;

    // Validate required fields
    if (!buy_id || !delivery_address || !pickup_address) {
      return sendApiResponse(res, 400, false, "Missing required fields: buy_id, delivery_address, pickup_address", []);
    }

    // Check if buy_id is valid number
    if (isNaN(Number(buy_id))) {
      return sendApiResponse(res, 400, false, "Invalid buy_id format", []);
    }

    // Get BuySellCard
    const buySellCard = await BuySellCard.findByPk(buy_id);
    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "Buy sell card not found", []);
    }

    // Check existing shipment
    const existingShipment = await Shipment.findOne({
      where: {
        buy_sell_id: buy_id,
        user_id: userId
      }
    });

    let shipment;

    if (existingShipment) {
      // Update existing shipment
      await existingShipment.update({
        to_address: Number(delivery_address),
        from_address: Number(pickup_address)
      });
      shipment = existingShipment;
    } else {
      // Create new shipment
      shipment = await Shipment.create({
        user_id: userId,
        to_address: Number(delivery_address),
        from_address: Number(pickup_address),
        buy_sell_id: Number(buy_id)
      } as any);
    }

    // Update BuySellCard shipping address
    await buySellCard.update({
      shiping_address: delivery_address
    });

    // Prepare response data
    const responseData = {
      shipment_id: shipment.id,
      buy_id: Number(buy_id),
      delivery_address: delivery_address,
      pickup_address: pickup_address,
      message: "Pickup & Delivery address has been saved successfully"
    };

    return sendApiResponse(res, 200, true, "Shipping initialization completed successfully", [responseData]);

  } catch (error: any) {
    console.error('Shipping buysell initialize error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Mark Address as Default Delivery Address API
export const markAsDefaultDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { addressId } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!addressId) {
      return sendApiResponse(res, 400, false, "Address ID is required", []);
    }

    // Validate that the address belongs to the authenticated user
    const address = await Address.findOne({
      where: {
        id: addressId,
        user_id: userId,
        is_deleted: '0'
      }
    });

    if (!address) {
      return sendApiResponse(res, 404, false, "Address not found or does not belong to user", []);
    }

    // First, set all user's addresses to mark_default = 2 (not default)
    await Address.update(
      { mark_default: 2 },
      {
        where: {
          user_id: userId,
          is_deleted: '0'
        }
      }
    );

    // Then, set the selected address to mark_default = 1 (default)
    await Address.update(
      { mark_default: 1 },
      {
        where: {
          id: addressId,
          user_id: userId
        }
      }
    );

    return sendApiResponse(res, 200, true, "Address marked as the default delivery address successfully.", []);

  } catch (error: any) {
    console.error('Mark default address error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get shipping parcel buysell API based on Laravel shipping_parcel_buySell function
export const getShippingParcelBuysell = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { buy_id } = req.query;

    // Validate buy_id
    if (!buy_id || isNaN(Number(buy_id))) {
      return sendApiResponse(res, 400, false, "Invalid or missing buy_id", []);
    }

    const buyId = Number(buy_id);

    // Get BuySellCard with products
    const buySellCard = await BuySellCard.findByPk(buyId, {
      include: [
        {
          model: BuyOfferProduct,
          as: 'buyOfferProducts',
          include: [
            {
              model: TradingCard,
              as: 'product',
              attributes: ['id', 'search_param','title','trading_card_img', 'category_id']
            }
          ]
        }
      ]
    });

    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "Buy sell card not found", []);
    }

    // Determine user role and trade_id
    let trade_id = buySellCard.seller;
    let main_card = null;

    if (buySellCard.seller === userId) {
      // User is seller
      if (buySellCard.main_card) {
        main_card = buySellCard.main_card;
        trade_id = userId;
      }
    } else if (buySellCard.buyer === userId) {
      // User is buyer
      if (buySellCard.main_card) {
        main_card = buySellCard.main_card;
        trade_id = userId;
      }
    } else {
      return sendApiResponse(res, 403, false, "You are not authorized to access this shipment", []);
    }

    // Get similar BuySellCards
    const similarBuySellCards = await BuySellCard.findAll({
      where: {
        [Op.or]: [
          { buyer: buySellCard.buyer, seller: buySellCard.seller },
          { buyer: buySellCard.seller, seller: buySellCard.buyer }
        ],
        buying_status: 'purchased'
      },
      attributes: ['main_card']
    });

    const mainCardIds = similarBuySellCards.map((card: any) => card.main_card).filter((id: any) => id);

    // Get send trade cards - only the main card from this specific buy/sell transaction
    const sendTradeCards = await TradingCard.findAll({
      where: {
        id: buySellCard.main_card
      },
      attributes: ['id', 'category_id', 'search_param','title','trading_card_img']
    });

    // Get trading cards that are being shipped (only cards from this specific buy/sell transaction)
    const tradingcards = await TradingCard.findAll({
      where: {
        id: { [Op.in]: mainCardIds }
      },
      attributes: ['id', 'category_id', 'search_param','title','trading_card_img'],
      order: [['id', 'DESC']]
    });

    // Check if shipment has address information
    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: buyId,
        user_id: userId
      }
    });

    if (!shipment || !shipment.to_address || !shipment.from_address) {
      return sendApiResponse(res, 400, false, "First enter the address information", []);
    }

    // Get categories for trading cards
    const categoryIds = [...new Set([
      ...tradingcards.map((card: any) => card.category_id),
      ...sendTradeCards.map((card: any) => card.category_id),
      ...((buySellCard as any).buyOfferProducts || []).map((product: any) => product.product?.category_id).filter(Boolean)
    ])];

    const categories = await Category.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id', 'sport_name']
    });

    const categoryMap = categories.reduce((map: any, category: any) => {
      map[category.id] = category;
      return map;
    }, {});

    // Prepare response data according to Blade file structure
    const responseData = {
      buy_id: buyId,
      trade_id: trade_id,
      main_card: main_card,
      tradingcards: tradingcards.map((card: any) => ({
        id: card.id,
        category_id: card.category_id,
        search_param: card.search_param,  
        title: card.title,
        trading_card_img: card.trading_card_img,
        cardname: card.title, // Blade uses cardname
        product_copy_url: `#`, // Default URL
        categoryname: categoryMap[card.category_id] ? {
          id: categoryMap[card.category_id].id,
          sport_name: categoryMap[card.category_id].sport_name
        } : null
      })),
      sendTradeCards: sendTradeCards.map((card: any) => ({
        id: card.id,
        category_id: card.category_id,
        search_param: card.search_param,  
        title: card.title,
        trading_card_img: card.trading_card_img,
        cardname: card.title, // Blade uses cardname
        categoryname: categoryMap[card.category_id] ? {
          id: categoryMap[card.category_id].id,
          sport_name: categoryMap[card.category_id].sport_name
        } : null
      })),
      buySellCards: {
        id: buySellCard.id,
        seller: buySellCard.seller,
        buyer: buySellCard.buyer,
        main_card: buySellCard.main_card,
        buying_status: buySellCard.buying_status,
        buy_offer_product: (buySellCard as any).buyOfferProducts ? (buySellCard as any).buyOfferProducts.map((product: any) => ({
          id: product.id,
          product: product.product ? {
            id: product.product.id,
            search_param: product.product.search_param,
            title: product.product.title,
            trading_card_img: product.product.trading_card_img,
            category_id: product.product.category_id,
            cardname: product.product.title, // Blade uses cardname
            product_copy_url: `#`, // Default URL
            categoryname: categoryMap[product.product.category_id] ? {
              id: categoryMap[product.product.category_id].id,
              sport_name: categoryMap[product.product.category_id].sport_name
            } : null
          } : null
        })) : []
      },
      shipment: {
        id: shipment.id,
        to_address: shipment.to_address,
        from_address: shipment.from_address,
        parcel: shipment.parcel ? (typeof shipment.parcel === 'string' ? JSON.parse(shipment.parcel) : shipment.parcel) : null,
        postage_label: shipment.postage_label ? (typeof shipment.postage_label === 'string' ? JSON.parse(shipment.postage_label) : shipment.postage_label) : null
      }
    };

    return sendApiResponse(res, 200, true, "Shipping parcel data retrieved successfully", [responseData]);

  } catch (error: any) {
    console.error('Get shipping parcel buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Save parcel buysell API based on Laravel save_parcel_buySell function
export const saveParcelBuysell = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { 
      lengthInput, 
      widthInput, 
      heightInput, 
      weightInput_lbs, 
      weightInput_oz, 
      packageSelect,
      buy_id 
    } = req.body;

    // Validate required fields (allow weightInput_oz = 0)
    const ozMissing = (weightInput_oz === undefined || weightInput_oz === null || weightInput_oz === '');
    if (!lengthInput || !widthInput || !heightInput || !weightInput_lbs || ozMissing || !packageSelect || !buy_id) {
      return sendApiResponse(res, 400, false, "Enter the required fields correctly", []);
    }

    // Validate numeric values
    if (isNaN(Number(lengthInput)) || isNaN(Number(widthInput)) || isNaN(Number(heightInput)) || 
        isNaN(Number(weightInput_lbs)) || isNaN(Number(weightInput_oz))) {
      return sendApiResponse(res, 400, false, "All dimension and weight values must be numeric", []);
    }

    // Get shipment with addresses
    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: buy_id,
        user_id: userId
      },
      include: [
        {
          model: Address,
          as: 'toAddress',
          attributes: ['id', 'name', 'email', 'phone', 'street1', 'street2', 'city', 'state', 'country', 'zip']
        },
        {
          model: Address,
          as: 'fromAddress',
          attributes: ['id', 'name', 'email', 'phone', 'street1', 'street2', 'city', 'state', 'country', 'zip']
        }
      ]
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    if (!shipment.to_address || !shipment.from_address) {
      return sendApiResponse(res, 400, false, "First enter the address information", []);
    }

    // Create parcel info
    const parcel_info = {
      length: Number(lengthInput),
      width: Number(widthInput),
      height: Number(heightInput),
      weight: (Number(weightInput_lbs) * 16) + Number(weightInput_oz),
      parcel_weight_unit: 'oz',
      weight_lbs: Number(weightInput_lbs),
      weight_oz: Number(weightInput_oz),
      parcel_weight_unit_oz: 'oz',
      parcel_weight_unit_lbs: 'lbs'
    };

    // Get trading cards for labels
    const packageIds = Array.isArray(packageSelect) ? packageSelect : [packageSelect];
    const tradingCards = await TradingCard.findAll({
      where: { id: { [Op.in]: packageIds } },
      attributes: ['id', 'search_param','title']
    });

    // Create label info
    const label_info = tradingCards.map((card: any) => ({
      id: `pl_${card.id}`,
      object: card.title
    }));

    // Update shipment with parcel and label data
    await shipment.update({
      parcel: JSON.stringify(parcel_info) as any,
      postage_label: JSON.stringify(label_info) as any
    });

    // Prepare shipment data for EasyPost API
    const shipmentData = shipment as any;
    const shipment_for_req = {
      to_address: {
        name: shipmentData.toAddress?.name || '',
        email: shipmentData.toAddress?.email || '',
        phone: shipmentData.toAddress?.phone || '',
        street1: shipmentData.toAddress?.street1 || '',
        street2: shipmentData.toAddress?.street2 || '',
        city: shipmentData.toAddress?.city || '',
        state: shipmentData.toAddress?.state || '',
        country: shipmentData.toAddress?.country || '',
        zip: shipmentData.toAddress?.zip || ''
      },
      from_address: {
        name: shipmentData.fromAddress?.name || '',
        email: shipmentData.fromAddress?.email || '',
        phone: shipmentData.fromAddress?.phone || '',
        street1: shipmentData.fromAddress?.street1 || '',
        street2: shipmentData.fromAddress?.street2 || '',
        city: shipmentData.fromAddress?.city || '',
        state: shipmentData.fromAddress?.state || '',
        country: shipmentData.fromAddress?.country || '',
        zip: shipmentData.fromAddress?.zip || ''
      },
      parcel: parcel_info
    };

    // Call EasyPost API
    try {
      const apiKey = process.env.EASYPOST_API_KEY;
      if (!apiKey) {
        return sendApiResponse(res, 500, false, "EasyPost API key not configured", []);
      }

      const response = await fetch('https://api.easypost.com/v2/shipments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shipment: shipment_for_req })
      });

      const responseData = await response.json();

      if (response.status === 200 || response.status === 201) {
        // Update shipment with API response
        await shipment.update({
          shipment_response: JSON.stringify(responseData) as any
        });

        // Prepare response data
        const responseData_final = {
          shipment_id: shipment.id,
          buy_id: Number(buy_id),
          parcel_info: parcel_info,
          label_info: label_info,
          easypost_response: responseData,
          message: "Parcel details have been successfully saved"
        };

        return sendApiResponse(res, 200, true, "Parcel details saved successfully", [responseData_final]);
      } else {
        // Handle EasyPost API error
        const errorMessage = responseData.error?.message || "EasyPost API error";
        return sendApiResponse(res, 400, false, errorMessage, []);
      }
    } catch (apiError: any) {
      console.error('EasyPost API error:', apiError);
      return sendApiResponse(res, 500, false, "Failed to create shipment with EasyPost", []);
    }

  } catch (error: any) {
    console.error('Save parcel buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get shipment carrier buysell API based on Laravel shipping_carrier_buySell function
export const getShipmentCarrierBuysell = async (req: Request, res: Response) => {
  try {
    // Cache headers are now handled globally by noCache middleware

    const userId = (req as any).user?.id;
    const { buy_id } = req.query;

    // Validate buy_id
    if (!buy_id) {
      return sendApiResponse(res, 400, false, "buy_id parameter is required", []);
    }

    // Get shipment with shipment_response
    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: Number(buy_id),
        user_id: userId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    if (!shipment.shipment_response) {
      return sendApiResponse(res, 400, false, "Enter the parcel information", []);
    }

    // Parse shipment response - handle both object and string formats
    let shipmentResponse;
    try {
      if (typeof shipment.shipment_response === 'string') {
        // Handle string format (from saveParcelBuysell)
        try {
          const firstParse = JSON.parse(shipment.shipment_response);
          shipmentResponse = typeof firstParse === 'string' 
            ? JSON.parse(firstParse) 
            : firstParse;
        } catch {
          // If parsing fails, try direct parse
          shipmentResponse = JSON.parse(shipment.shipment_response);
        }
      } else if (typeof shipment.shipment_response === 'object' && shipment.shipment_response !== null) {
        // Handle object format (from saveParcel)
        shipmentResponse = shipment.shipment_response;
      } else {
        throw new Error('Invalid shipment response format');
      }
      
    } catch (parseError) {
      console.error('Shipment response parse error:', parseError);
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }

    // Get BuySellCard
    const buySellCard = await BuySellCard.findByPk(Number(buy_id), {
      include: [
        {
          model: BuyOfferProduct,
          as: 'buyOfferProducts',
          include: [
            {
              model: TradingCard,
              as: 'product',
              include: [
                {
                  model: Category,
                  as: 'parentCategory',
                  attributes: ['id', 'sport_name']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "BuySellCard not found", []);
    }

    // Get similar BuySellCards for same buyer/seller
    const similarBuySellCards = await BuySellCard.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { buyer: buySellCard.buyer },
              { seller: buySellCard.seller }
            ]
          },
          { buying_status: 'purchased' }
        ]
      },
      attributes: ['main_card']
    });

    const mainCardIds = similarBuySellCards
      .map((card: any) => card.main_card)
      .filter((id: any) => id && id > 0);

    // Get sendTradeCards - only the main card from this specific buy/sell transaction
    let sendTradeCards: any[] = [];
    if (buySellCard.main_card) {
      const tradingCards = await TradingCard.findAll({
        where: { id: buySellCard.main_card },
        attributes: ['id', 'category_id', 'search_param', 'title', 'trading_card_img']
      });

      // Get categories for sendTradeCards
      const categoryIds = tradingCards.map((card: any) => card.category_id).filter(Boolean);
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
        attributes: ['id', 'sport_name']
      });

      const categoryMap = categories.reduce((map: any, category: any) => {
        map[category.id] = category;
        return map;
      }, {});

      sendTradeCards = tradingCards.map((card: any) => ({
        id: card.id,
        category_id: card.category_id,
        search_param: card.search_param,
        title: card.title,
        trading_card_img: card.trading_card_img,
        cardname: card.title, // Blade uses cardname
        categoryname: categoryMap[card.category_id] ? {
          id: categoryMap[card.category_id].id,
          sport_name: categoryMap[card.category_id].sport_name
        } : null
      }));
    }

    // Prepare rates data
    const rates = shipmentResponse.rates || [];
    let defaultSelectedRate = '0.00';
    let defaultSelectedRateId = '';


    if (rates.length > 0) {
      // Find default rate (lowest cost)
      rates.forEach((rate: any) => {
        if (defaultSelectedRate === '0.00' || parseFloat(rate.rate) <= parseFloat(defaultSelectedRate)) {
          defaultSelectedRate = rate.rate;
          defaultSelectedRateId = rate.id;
        }
      });
    }

    // Prepare response data according to Blade file structure
    const responseData = {
      buy_id: Number(buy_id),
      shipment_id: shipment.id,
      selected_rate: shipment.selected_rate || defaultSelectedRateId,
      default_selected_rate: defaultSelectedRate,
      default_selected_rate_id: defaultSelectedRateId,
      rates: rates.map((rate: any) => ({
        id: rate.id,
        carrier: rate.carrier,
        service: rate.service,
        rate: rate.rate,
        delivery_days: rate.delivery_days,
        transit_days: rate.service === 'Express' ? '1-2' : (rate.delivery_days || 'Unknown')
      })),
      buySellCards: {
        id: buySellCard.id,
        offer_amt_buyer: buySellCard.offer_amt_buyer,
        buy_offer_product: (buySellCard as any).buyOfferProducts ? (buySellCard as any).buyOfferProducts.map((product: any) => ({
          id: product.id,
          product: product.product ? {
            id: product.product.id,
            search_param: product.product.search_param,
            title: product.product.title,
            trading_card_img: product.product.trading_card_img,
            category_id: product.product.category_id,
            categoryname: product.product.parentCategory ? {
              id: product.product.parentCategory.id,
              sport_name: product.product.parentCategory.sport_name
            } : null
          } : null
        })) : []
      },
      sendTradeCards: sendTradeCards,
      has_rates: rates.length > 0
    };

    return sendApiResponse(res, 200, true, "Shipment carrier data retrieved successfully", [responseData]);

  } catch (error: any) {
    console.error('Get shipment carrier buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// POST Shipping checkout buysell API based on Laravel shipping_checkout_buySell function
export const shippingCheckoutBuysell = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { 
      selected_rate_id, 
      selected_rate, 
      cart_amount,
      buy_id 
    } = req.body;

    // Validate selected_rate_id
    if (!selected_rate_id || selected_rate_id === '') {
      return sendApiResponse(res, 400, false, "Select carrier service", []);
    }

    // Validate buy_id
    if (!buy_id) {
      return sendApiResponse(res, 400, false, "buy_id is required", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: Number(buy_id),
        user_id: userId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Either shipment completed or shipment details not available. please try again to ship your product", []);
    }

    // Parse shipment response - handle both object and string formats
    let shipmentResponse;
    try {
      if (typeof shipment.shipment_response === 'string') {
        // Handle string format (from saveParcelBuysell)
        try {
          const firstParse = JSON.parse(shipment.shipment_response);
          shipmentResponse = typeof firstParse === 'string' 
            ? JSON.parse(firstParse) 
            : firstParse;
        } catch {
          // If parsing fails, try direct parse
          shipmentResponse = JSON.parse(shipment.shipment_response);
        }
      } else if (typeof shipment.shipment_response === 'object' && shipment.shipment_response !== null) {
        // Handle object format (from saveParcel)
        shipmentResponse = shipment.shipment_response;
      } else {
        throw new Error('Invalid shipment response format');
      }
    } catch (parseError) {
      console.error('Shipment response parse error:', parseError);
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }

    // Parse postage label
    let postageLabel;
    try {
      postageLabel = typeof shipment.postage_label === 'string' 
        ? JSON.parse(shipment.postage_label) 
        : shipment.postage_label;
    } catch (parseError) {
      return sendApiResponse(res, 400, false, "Invalid postage label data", []);
    }

    // Parse parcel details
    let shipParcelDetails;
    try {
      shipParcelDetails = typeof shipment.parcel === 'string' 
        ? JSON.parse(shipment.parcel) 
        : shipment.parcel;
    } catch (parseError) {
      shipParcelDetails = null;
    }

    // Find rate data
    const rates = shipmentResponse.rates || [];
    const rateIds = rates.map((rate: any) => rate.id);
    const rateIndex = rateIds.indexOf(selected_rate_id);

    if (rateIndex === -1) {
      return sendApiResponse(res, 400, false, "Selected rate not found in available rates", []);
    }

    const rateData = rates[rateIndex];

    // Calculate insurance amount (Laravel logic: always 0.00, insureShipment always false)
    const insuranceAmount = '0.00';
    const insureShipment = false;

    // Calculate total amount
    const totalAmount = parseFloat(insuranceAmount) + parseFloat(rateData.rate);
    const formattedTotalAmount = totalAmount.toFixed(2);

    // Update shipment with selected rate and insurance
    await shipment.update({
      selected_rate: selected_rate_id,
      cart_amount_for_insurance: cart_amount || null
    });

    // Get BuySellCard
    const buySellCard = await BuySellCard.findByPk(Number(buy_id));

    // Prepare response data according to Blade file structure
    const responseData = {
      buy_id: Number(buy_id),
      shipment_id: shipment.id,
      selected_rate_id: selected_rate_id,
      selected_rate: selected_rate || rateData.rate,
      shipment_response: shipmentResponse,
      postage_label: postageLabel,
      rate_data: {
        id: rateData.id,
        carrier: rateData.carrier,
        service: rateData.service,
        rate: rateData.rate,
        delivery_days: rateData.delivery_days,
        transit_days: rateData.service === 'Express' ? '1-2' : (rateData.delivery_days || 'Unknown')
      },
      insurance_amount: insuranceAmount,
      total_amount: formattedTotalAmount,
      insure_shipment: insureShipment,
      ship_parcel_details: shipParcelDetails,
      ship_details: {
        id: shipment.id,
        user_id: shipment.user_id,
        buy_sell_id: shipment.buy_sell_id,
        to_address: shipment.to_address,
        from_address: shipment.from_address,
        tracking_id: shipment.tracking_id,
        shipment_status: shipment.shipment_status,
        selected_rate: shipment.selected_rate,
        cart_amount_for_insurance: shipment.cart_amount_for_insurance,
        created_at: shipment.created_at,
        updated_at: shipment.updated_at
      },
      buy_sell_card: buySellCard ? {
        id: buySellCard.id,
        buyer: buySellCard.buyer,
        seller: buySellCard.seller,
        offer_amt_buyer: buySellCard.offer_amt_buyer
      } : null
    };

    return sendApiResponse(res, 200, true, "Shipping checkout data processed successfully", [responseData]);

  } catch (error: any) {
    console.error('Shipping checkout buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// GET Shipping checkout buysell API for display
export const getShippingCheckoutBuysell = async (req: Request, res: Response) => {
  try {
    // Set cache headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"shipping-checkout-buysell-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });

    const userId = (req as any).user?.id;
    const { buy_id } = req.query;

    // Validate buy_id
    if (!buy_id) {
      return sendApiResponse(res, 400, false, "buy_id parameter is required", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: Number(buy_id),
        user_id: userId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Either shipment completed or shipment details not available. please try again to ship your product", []);
    }

    // Parse shipment response - handle both object and string formats
    let shipmentResponse;
    try {
      if (typeof shipment.shipment_response === 'string') {
        // Handle string format (from saveParcelBuysell)
        try {
          const firstParse = JSON.parse(shipment.shipment_response);
          shipmentResponse = typeof firstParse === 'string' 
            ? JSON.parse(firstParse) 
            : firstParse;
        } catch {
          // If parsing fails, try direct parse
          shipmentResponse = JSON.parse(shipment.shipment_response);
        }
      } else if (typeof shipment.shipment_response === 'object' && shipment.shipment_response !== null) {
        // Handle object format (from saveParcel)
        shipmentResponse = shipment.shipment_response;
      } else {
        throw new Error('Invalid shipment response format');
      }
    } catch (parseError) {
      console.error('Shipment response parse error:', parseError);
      return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
    }

    // Parse postage label
    let postageLabel;
    try {
      postageLabel = typeof shipment.postage_label === 'string' 
        ? JSON.parse(shipment.postage_label) 
        : shipment.postage_label;
    } catch (parseError) {
      return sendApiResponse(res, 400, false, "Invalid postage label data", []);
    }

    // Parse parcel details
    let shipParcelDetails;
    try {
      shipParcelDetails = typeof shipment.parcel === 'string' 
        ? JSON.parse(shipment.parcel) 
        : shipment.parcel;
    } catch (parseError) {
      shipParcelDetails = null;
    }

    // Get rate data (use selected rate or first available rate)
    const rates = shipmentResponse.rates || [];
    let rateData;
    
    if (shipment.selected_rate) {
      const rateIndex = rates.findIndex((rate: any) => rate.id === shipment.selected_rate);
      rateData = rateIndex !== -1 ? rates[rateIndex] : rates[0];
    } else {
      rateData = rates[0];
    }

    if (!rateData) {
      return sendApiResponse(res, 400, false, "No rate data available", []);
    }

    // Calculate insurance amount (Laravel logic: always 0.00, insureShipment always false)
    const insuranceAmount = '0.00';
    const insureShipment = false;

    // Calculate total amount
    const totalAmount = parseFloat(insuranceAmount) + parseFloat(rateData.rate);
    const formattedTotalAmount = totalAmount.toFixed(2);

    // Get BuySellCard with trading card details
    const buySellCard = await BuySellCard.findByPk(Number(buy_id), {
      include: [
        {
          model: TradingCard,
          as: 'tradingCard',
          attributes: ['id', 'title']
        },
        {
          model: BuyOfferProduct,
          as: 'buyOfferProducts',
          include: [
            {
              model: TradingCard,
              as: 'product',
              attributes: ['id', 'title']
            }
          ]
        }
      ]
    });

    // Prepare response data matching getShippingCheckout format
    const responseData = {
      sender_address: {
        name: shipmentResponse.from_address?.name || '',
        street1: shipmentResponse.from_address?.street1 || '',
        street2: shipmentResponse.from_address?.street2 || '',
        city: shipmentResponse.from_address?.city || '',
        state: shipmentResponse.from_address?.state || '',
        zip: shipmentResponse.from_address?.zip || '',
        phone: shipmentResponse.from_address?.phone || '',
        email: shipmentResponse.from_address?.email || ''
      },
      receiver_address: {
        name: shipmentResponse.to_address?.name || '',
        street1: shipmentResponse.to_address?.street1 || '',
        street2: shipmentResponse.to_address?.street2 || '',
        city: shipmentResponse.to_address?.city || '',
        state: shipmentResponse.to_address?.state || '',
        zip: shipmentResponse.to_address?.zip || '',
        phone: shipmentResponse.to_address?.phone || '',
        email: shipmentResponse.to_address?.email || ''
      },
      package_dimensions: (() => {
        if (!shipParcelDetails) {
          return {
            length: 0,
            width: 0,
            height: 0,
            weight: 0
          };
        }

        const parcelData = typeof shipParcelDetails === 'string' 
          ? JSON.parse(shipParcelDetails) 
          : shipParcelDetails;

        // Format weight display like Laravel frontend
        const weightDisplay = [];
        if (parcelData.weight_lbs && parcelData.weight_lbs > 0) {
          weightDisplay.push(`${parcelData.weight_lbs} lbs`);
        }
        if (parcelData.weight_oz && parcelData.weight_oz > 0) {
          weightDisplay.push(`${parcelData.weight_oz} oz`);
        }

        let formattedWeight;
        if (weightDisplay.length > 0) {
          formattedWeight = weightDisplay.join(' ');
        } else {
          // Fallback to total weight with unit
          formattedWeight = parcelData.weight ? `${parcelData.weight} ${parcelData.parcel_weight_unit || 'oz'}` : '0 oz';
        }

        return {
          length: parcelData.length || 0,
          width: parcelData.width || 0,
          height: parcelData.height || 0,
          weight: formattedWeight
        };
      })(),
      package_details: await (async () => {
        const details: string[][] = [];
        // Collect product IDs for category lookup
        const ids: number[] = [];
        if ((buySellCard as any)?.tradingCard?.id) ids.push((buySellCard as any).tradingCard.id);
        if ((buySellCard as any)?.buyOfferProducts && (buySellCard as any).buyOfferProducts.length > 0) {
          (buySellCard as any).buyOfferProducts.forEach((product: any) => {
            if (product.product?.id) ids.push(product.product.id);
          });
        }

        if (ids.length > 0) {
          const cards = await TradingCard.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id','title','category_id'] });
          const categoryIds = cards.map(c => c.category_id).filter((id: any): id is number => typeof id === 'number');
          const categories = await Category.findAll({ where: { id: { [Op.in]: categoryIds } }, attributes: ['id','sport_name'] });
          const catMap: Record<number, string> = {} as any;
          categories.forEach(cat => { (catMap as any)[cat.id] = cat.sport_name; });
          cards.forEach(card => {
            const title = String((card as any).title || '').trim();
            const catName = card.category_id ? (catMap as any)[card.category_id] || '' : '';
            if (title) details.push([catName, title]);
          });
        }

        if (details.length === 0) {
          details.push(['Package contents not specified','']);
        }

        return details;
      })(),
      shipment_details: {
        carrier: rateData.carrier || '',
        service: rateData.service || '',
        transit_days: rateData.service === 'Express' ? '1-2' : rateData.delivery_days || 0
      },
      shipment_cost: {
        carrier_cost: rateData.rate || '0.00',
        insurance_cost: insuranceAmount,
        insure_shipment: insureShipment,
        total_cost: formattedTotalAmount
      },
      rate_data: {
        id: rateData.id,
        rate: rateData.rate,
        carrier: rateData.carrier,
        service: rateData.service,
        delivery_days: rateData.delivery_days
      },
      buy_sell_details: {
        buy_id: Number(buy_id),
        shipment_id: shipment.id,
        selected_rate_id: shipment.selected_rate || rateData.id,
      buy_sell_card: buySellCard ? {
        id: buySellCard.id,
        buyer: buySellCard.buyer,
        seller: buySellCard.seller,
        offer_amt_buyer: buySellCard.offer_amt_buyer
      } : null
      }
    };

    return sendApiResponse(res, 200, true, "Shipping checkout data retrieved successfully", [responseData]);

  } catch (error: any) {
    console.error('Get shipping checkout buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Make checkout buysell API based on Laravel make_checkout_buySell function
export const makeCheckoutBuysell = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { selected_rate_id, amount, buy_id } = req.body;

    // Validate required fields
    if (!buy_id || !selected_rate_id || !amount) {
      return sendApiResponse(res, 400, false, "Missing required fields: buy_id, selected_rate_id, amount", []);
    }

    // Get shipment data
    const shipment = await Shipment.findOne({
      where: { buy_sell_id: Number(buy_id), user_id: userId }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    // Check if shipment already completed
    if (shipment.tracking_id) {
      return sendApiResponse(res, 400, false, "This shipment has already been completed", []);
    }

    // Get BuySellCard and validate seller
    const offerDetail = await BuySellCard.findByPk(Number(buy_id));
    if (!offerDetail || offerDetail.seller !== userId) {
      return sendApiResponse(res, 403, false, "Invalid access", []);
    }

    // Update shipment with selected rate
    await shipment.update({ selected_rate: selected_rate_id });

    // PayPal configuration
    const paypalConfig = {
      client_id: process.env.PAYPAL_CLIENT_ID,
      client_secret: process.env.PAYPAL_CLIENT_SECRET,
      test_mode: process.env.PAYPAL_TEST_MODE === 'true'
    };

    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      return sendApiResponse(res, 500, false, "Account details not available", []);
    }

    // Prepare PayPal payment URLs
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const paymentUrls = {
      return_url: `${baseUrl}/api/users/shipment-cost-payment-success-buysell/${shipment.buy_sell_id}`,
      cancel_url: `${baseUrl}/api/users/shipment-cost-payment-cancel-buysell/${shipment.buy_sell_id}`
    };

    // Response data
    const responseData = {
      buy_id: Number(buy_id),
      shipment_id: shipment.id,
      selected_rate_id, 
      amount: parseFloat(amount),
      currency: process.env.PAYPAL_CURRENCY || 'USD',
      paypal_config: {
        client_id: paypalConfig.client_id,
        test_mode: paypalConfig.test_mode
      },
      payment_urls: paymentUrls
    };

    return sendApiResponse(res, 200, true, "Payment checkout initiated successfully", [responseData]);

  } catch (error: any) {
    console.error('Make checkout buysell error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Shipment cost payment success for buy sell API based on Laravel shipmentCostPaymentSuccessForBuySell function
export const shipmentCostPaymentSuccessForBuySell = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { buy_sell_id } = req.params;
    const { paymentId, token, PayerID, cancel } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!buy_sell_id) {
      return sendApiResponse(res, 400, false, "Buy sell ID is required", []);
    }

    // Check if this is a cancel request
    if (cancel === true || cancel === 'true') {
      // Handle cancel scenario
    const shipment = await Shipment.findOne({
      where: {
          buy_sell_id: Number(buy_sell_id),
        user_id: userId
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

      // Update shipment payment status to cancelled (3)
      await Shipment.update(
        { shipment_payment_status: 3 },
        { where: { buy_sell_id: Number(buy_sell_id) } }
      );


      return sendApiResponse(res, 200, true, "Shipment Payment cancelled", [{
        buy_sell_id: Number(buy_sell_id),
        shipment_payment_status: 3,
        message: "Payment has been cancelled successfully"
      }]);
    }

    // Handle success scenario
    if (!paymentId || !token || !PayerID) {
      return sendApiResponse(res, 400, false, "Payment parameters (paymentId, token, PayerID) are required", []);
    }

    // Get shipment data

    const shipment = await Shipment.findOne({
      where: {
        buy_sell_id: Number(buy_sell_id),
        user_id: userId
      }
    });


    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipment not found", []);
    }

    // Update shipment with payment details
    await shipment.update({
      paymentId: paymentId as string,
      token: token as string,
      PayerID: PayerID as string,
      shipment_payment_status: 1
    });

    // Create custom info (simplified version)
    const custom_info = {
      status: true,
      data: {
        contents_type: 'merchandise',
        contents_explanation: 'Trading cards',
        customs_certify: true,
        customs_signer: 'John Doe',
        eel_pfc: 'NOEEI 30.37(a)'
      }
    };

    if (custom_info.status) {
      // Parse shipment response
      let shipmentResponse;
      try {
        if (typeof shipment.shipment_response === 'string') {
          const firstParse = JSON.parse(shipment.shipment_response);
          
          if (typeof firstParse === 'string') {
            shipmentResponse = JSON.parse(firstParse);
          } else {
            shipmentResponse = firstParse;
          }
        } else {
          shipmentResponse = shipment.shipment_response;
        }
      } catch (parseError) {
        return sendApiResponse(res, 400, false, "Invalid shipment response data", []);
      }

      // Prepare shipment data for EasyPost API
      const shipmentData = {
        from_address: shipment.from_address,
        to_address: shipment.to_address,
        parcel: shipment.parcel,
        customs_info: custom_info.data
      };

      const rateData = { id: shipment.selected_rate };

      // Call EasyPost API to buy shipment
      try {
        const apiKey = process.env.EASYPOST_API_KEY;
        if (!apiKey) {
          return sendApiResponse(res, 500, false, "EasyPost API key not configured", []);
        }

        const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentResponse.id}/buy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shipment: shipmentData,
            rate: rateData
          })
        });


        if (response.status === 200 || response.status === 201) {
          const data = await response.json();

          // Update shipment with tracking info
          await shipment.update({
            tracking_id: data.tracking_code,
            shipment_status: 'Pre-Transit'
          });

          // Update BuySellCard
          const buySellCard = await BuySellCard.findByPk(Number(buy_sell_id));
          if (buySellCard) {
            await buySellCard.update({
              track_id: data.tracking_code,
              shipped_on: new Date(),
              buying_status: 'dispatched'
            });

            // Set trade status
            await setTradeProposalStatus(Number(buy_sell_id), 'shipment-completed');

            // Set buy offer status (equivalent to HelperTradeAndOfferStatus::___setStatus('shipment-completed', 'offer', $buy_sell_id))
            await setTradeAndOfferStatus('shipment-completed', 'offer', Number(buy_sell_id));

            // Get other user for notifications
            const otherUserId = buySellCard.buyer === userId ? buySellCard.seller : buySellCard.buyer;
            const notificationUser = await User.findByPk(otherUserId);

            // Prepare card names for email (optimized)
            const cardNames = await prepareCardNamesForEmail(buySellCard);

            // Send notifications
            if (notificationUser && buySellCard.seller && buySellCard.buyer) {
              await setTradersNotificationOnVariousActionBasis(
                'shipped-proposal',
                buySellCard.seller,
                buySellCard.buyer,
                buySellCard.id,
                'Offer'
              );
            }

            // Send shipment completion emails
            const currentUser = await User.findByPk(userId);
            const otherUser = await User.findByPk(otherUserId);

            if (currentUser && otherUser) {
              await sendShipmentCompletionEmails(
                currentUser,
                otherUser,
                cardNames,
                data.tracking_code,
                'Pre-Transit'
              );
            }

    // Prepare response data
    const responseData = {
              buy_sell_id: Number(buy_sell_id),
              tracking_id: data.tracking_code,
              shipment_status: 'Pre-Transit',
              buying_status: 'dispatched',
              shipped_on: new Date(),
              card_names: cardNames,
              message: "Shipment successfully completed"
            };

            return sendApiResponse(res, 200, true, "Shipment successfully completed", [responseData]);
          } else {
            const errorData = await response.json();
            return sendApiResponse(res, 400, false, errorData.error?.message || "Failed to process shipment", []);
          }
        } else {
          const errorData = await response.json();
          return sendApiResponse(res, 400, false, errorData.error?.message || "Failed to process shipment", []);
        }
      } catch (apiError: any) {
        console.error('EasyPost API error:', apiError);
        return sendApiResponse(res, 500, false, "Failed to process shipment with carrier", []);
      }
    } else {
      return sendApiResponse(res, 400, false, "Custom info validation failed", []);
    }

  } catch (error: any) {
    console.error('Shipment cost payment success error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Receive shipment API based on Laravel isReceiveShipment function
export const receiveShipment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!id || isNaN(Number(id))) {
      return sendApiResponse(res, 400, false, "Valid buy sell ID is required", []);
    }

    const buySellId = Number(id);

    // Get buy sell card
    const buySellCard = await BuySellCard.findByPk(buySellId);
    if (!buySellCard) {
      return sendApiResponse(res, 404, false, "Buy sell record not found", []);
    }

    // Verify user is the buyer
    if (buySellCard.buyer !== userId) {
      return sendApiResponse(res, 403, false, "Unauthorized access", []);
    }

    // Update buy sell card
    await buySellCard.update({
      is_received: 1,
      buying_status: 'delivered',
      received_on: new Date()
    });

    // Update trading card(s) based on main_card or buy_offer_products
    if (buySellCard.main_card && buySellCard.main_card > 0) {
      // Single card case
      const tradingCard = await TradingCard.findByPk(buySellCard.main_card);
      if (tradingCard && buySellCard.seller && buySellCard.buyer) {
        await tradingCard.update({
          is_traded: '0',
          trading_card_status: '0',
          previous_owner_id: buySellCard.seller,
          trader_id: buySellCard.buyer,
          // seller_notes: '',
          // shipping_details: ''
        });
      }
    } else {
      // Multiple cards case
      const buyOfferProducts = await BuyOfferProduct.findAll({
        where: { buy_sell_id: buySellId },
        attributes: ['main_card']
      });

      if (buyOfferProducts.length > 0 && buySellCard.seller && buySellCard.buyer) {
        const cardIds = buyOfferProducts.map(product => product.main_card).filter((id): id is number => id !== null && id !== undefined);
        
        if (cardIds.length > 0) {
          await TradingCard.update({
            is_traded: '0',
            trading_card_status: '0',
            previous_owner_id: buySellCard.seller,
            trader_id: buySellCard.buyer,
            // seller_notes: '',
            // shipping_details: ''
          }, {
            where: { id: { [Op.in]: cardIds } }
          });
        }
      }
    }

    // Update shipment status
    const shipment = await Shipment.findOne({
      where: { buy_sell_id: buySellId }
    });

    if (shipment) {
      await shipment.update({
        shipment_status: 'Delivered'
      });
    }

    // Set trade status
    await setTradeProposalStatus(buySellId, 'product-received');

    // Set buy offer status (equivalent to HelperTradeAndOfferStatus::___setStatus('product-received', 'offer', $request->buy_sell_id))
    await setTradeAndOfferStatus('product-received', 'offer', buySellId);

    // Send notifications
    if (buySellCard.seller && buySellCard.buyer) {
      // Card shipped confirmed notification
      await setTradersNotificationOnVariousActionBasis(
        'card-shipped-confirmed',
        buySellCard.buyer,
        buySellCard.seller,
        buySellCard.id,
        'Offer'
      );

      // Give review to seller notification
      await setTradersNotificationOnVariousActionBasis(
        'give-review-to-seller',
        buySellCard.seller,
        buySellCard.buyer,
        buySellCard.id,
        'Offer'
      );
    }

    // Send confirmation emails
    await sendShipmentConfirmationEmailsForBuySell(buySellId);

    const responseData = {
      buy_sell_id: buySellId,
      is_received: 1,
      buying_status: 'delivered',
      received_on: new Date(),
      shipment_status: 'Delivered',
      message: "Shipment Successfully Received"
    };

    return sendApiResponse(res, 200, true, "Shipment Successfully Received", [responseData]);

  } catch (error: any) {
    console.error('Receive shipment error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to send shipment confirmation emails
const sendShipmentConfirmationEmailsForBuySell = async (buySellId: number) => {
  try {
    const buySellCard = await BuySellCard.findByPk(buySellId);
    if (!buySellCard) return;

    const buyer = await User.findByPk(buySellCard.buyer);
    const seller = await User.findByPk(buySellCard.seller);
    
    if (!buyer || !seller) return;

    // Get card names
    let cardName = '';
    if (buySellCard.main_card && buySellCard.main_card > 0) {
      const tradingCard = await TradingCard.findByPk(buySellCard.main_card);
      if (tradingCard?.title) {
        cardName = `1. ${tradingCard.title}`;
      }
    } else {
      const buyOfferProducts = await BuyOfferProduct.findAll({
        where: { buy_sell_id: buySellId },
        include: [{
          model: TradingCard,
          as: 'product',
          attributes: ['search_param', 'title']
        }]
      });

      if (buyOfferProducts.length > 0) {
        const cardNamesArray = buyOfferProducts.map((item: any, index: number) => {
          return item.product?.title ? `${index + 1}. ${item.product.title}` : null;
        }).filter(Boolean);
        cardName = cardNamesArray.join('<br/>');
      }
    }

    const transactionListUrl = `${process.env.FRONTEND_URL}/profile/deals/bought-sold?buy_sell_id=${buySellId}`;

    // Email to seller
    const sellerMailInputs = {
      to: seller.email,
      tradebyname: `${buyer.first_name} ${buyer.last_name}`.trim(),
      tradetoname: `${seller.first_name} ${seller.last_name}`.trim(),
      cardyousend: cardName,
      proposedamount: buySellCard.total_amount,
      transaction_id: buySellCard.code,
      view_sale_details_link: transactionListUrl
    };

    // Email to buyer
    const buyerMailInputs = {
      to: buyer.email,
      name: `${buyer.first_name} ${buyer.last_name}`.trim(),
      other_user_name: `${seller.first_name} ${seller.last_name}`.trim(),
      transaction_id: buySellCard.code,
      leavefeedbacklink: transactionListUrl
    };

    // Send emails
    try {
      const { EmailHelperService } = await import('../services/emailHelper.service.js');
      
      await Promise.all([
        EmailHelperService.executeMailSender('shipment-confirmed-email-to-seller', sellerMailInputs),
        EmailHelperService.executeMailSender('share-your-feedback-buysell', buyerMailInputs)
      ]);
      
      console.log('✅ Shipment confirmation emails sent successfully');
    } catch (emailError: any) {
      console.error('❌ Failed to send shipment confirmation emails:', emailError);
    }

  } catch (error: any) {
    console.error('Error sending shipment confirmation emails:', error);
  }
};

// Shipment insure API based on Laravel insureYourShipment function
export const insureShipment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { shipment_id } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!shipment_id || isNaN(Number(shipment_id))) {
      return sendApiResponse(res, 400, false, "Valid shipment ID is required", []);
    }

    // Get shipment
    const shipment = await Shipment.findOne({
      where: { 
        id: Number(shipment_id),
        user_id: userId 
      }
    });

    if (!shipment) {
      return sendApiResponse(res, 404, false, "Shipping details not available", []);
    }

    // Parse shipment response
    let shipmentResponse;
    try {
      if (typeof shipment.shipment_response === 'string') {
        shipmentResponse = JSON.parse(shipment.shipment_response);
      } else {
        shipmentResponse = shipment.shipment_response;
      }
    } catch (parseError) {
      return sendApiResponse(res, 400, false, "Shipping details not available", []);
    }

    if (!shipmentResponse?.id) {
      return sendApiResponse(res, 400, false, "Shipping details not available", []);
    }

    const shipId = shipmentResponse.id;
    const rateIds = shipmentResponse.rates?.map((rate: any) => rate.id) || [];
    const rateIndex = rateIds.indexOf(shipment.selected_rate);
    
    if (rateIndex === -1) {
      return sendApiResponse(res, 400, false, "Selected rate not found", []);
    }

    const rateData = shipmentResponse.rates[rateIndex];

    // Retrieve shipment from EasyPost to get fees
    let insuranceFee = null;
    let isInsured = false;

    try {
      const apiKey = process.env.EASYPOST_API_KEY;
      if (!apiKey) {
        return sendApiResponse(res, 500, false, "EasyPost API key not configured", []);
      }

      const response = await fetch(`https://api.easypost.com/v2/shipments/${shipId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const retrieveData = await response.json();
        
        // Check for insurance fee in fees array
        if (retrieveData.fees && retrieveData.fees.length > 0) {
          const insuranceFeeData = retrieveData.fees.find((fee: any) => fee.type === 'InsuranceFee');
          if (insuranceFeeData) {
            insuranceFee = parseFloat(insuranceFeeData.amount);
            isInsured = true;
            
            // Update shipment as insured
            await shipment.update({ is_insured: 1 });
          }
        }
      }
    } catch (apiError) {
      console.error('EasyPost API error:', apiError);
    }

    // If no insurance fee from EasyPost, calculate manually
    if (!insuranceFee && shipment.insurance) {
      const insuranceAmount = parseFloat(shipment.insurance.toString());
      if (insuranceAmount > 0) {
        insuranceFee = insuranceAmount * 0.01; // 1% of insured amount
        isInsured = false;
      }
    }

    if (!insuranceFee) {
      return sendApiResponse(res, 400, false, "Insured amount not available", []);
    }

    const insuranceAmount = shipment.insurance ? parseFloat(shipment.insurance.toString()) : 0;
    const responseData = {
      insured_amount: `$${insuranceAmount.toFixed(2)}`,
      insurance_fee: `$${insuranceFee.toFixed(2)}`,
      is_insured: isInsured
    };

    return sendApiResponse(res, 200, true, "", [responseData]);

  } catch (error: any) {
    console.error('Insure shipment error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Get and update shipment status API based on Laravel GetAndUpdateShipmentStatus function
export const getAndUpdateShipmentStatus = async (req: Request, res: Response) => {
  try {
    const { tracking_id } = req.body;

    if (!tracking_id) {
      return sendApiResponse(res, 400, false, "Tracking ID is required", []);
    }

    const apiKey = process.env.EASYPOST_API_KEY;
    if (!apiKey) {
      return sendApiResponse(res, 500, false, "EasyPost API key not configured", []);
    }

    // Use test tracking ID if in test mode
    const apiMode = process.env.EASYPOST_MODE;
    const finalTrackingId = apiMode === 'test' ? 'EZ2000000002' : tracking_id;

    // Create tracker in EasyPost
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

    if (response.status === 200 || response.status === 201) {
      const data = await response.json();

      // Map EasyPost status to our status
      let shipmentStatus = '';
      switch (data.status) {
        case 'pre_transit':
          shipmentStatus = 'Pre-Transit';
          break;
        case 'in_transit':
          shipmentStatus = 'In Transit';
          break;
        case 'out_of_delivery':
          shipmentStatus = 'Out for Delivery';
          break;
        case 'delivered':
          shipmentStatus = 'Delivered';
          break;
        default:
          shipmentStatus = data.status || 'Unknown';
      }

      // Format estimated delivery date
      let estimatedDeliveryDate = null;
      if (data.est_delivery_date) {
        estimatedDeliveryDate = new Date(data.est_delivery_date).toISOString();
      }

      // Update shipment in database
      const updateData: any = {
        shipment_status: shipmentStatus,
        estimated_delivery_date: estimatedDeliveryDate
      };

      // Mark as completed if delivered
      if (data.status === 'delivered') {
        updateData.is_completed = 1;
      }

      await Shipment.update(updateData, {
        where: { tracking_id: tracking_id }
      });

      const responseData = {
        tracking_id: tracking_id,
        shipment_status: shipmentStatus,
        estimated_delivery_date: estimatedDeliveryDate,
        is_completed: data.status === 'delivered',
        easy_post_status: data.status,
        carrier: data.carrier || 'USPS'
      };

      return sendApiResponse(res, 200, true, "Shipment status updated successfully", [responseData]);

    } else {
      const errorData = await response.json();
      return sendApiResponse(res, 400, false, "Failed to track shipment", [errorData]);
    }

  } catch (error: any) {
    console.error('Get and update shipment status error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
