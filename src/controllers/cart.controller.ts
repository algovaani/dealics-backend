import { Request, Response } from "express";
import { Cart, CartDetail, TradingCard, User, BuyOfferAttempt, CreditDeductionLog, Address, Category, BuySellCard, BuyOfferStatus, Follower } from "../models/index.js";
import { sequelize } from "../config/db.js";
import { QueryTypes, Op } from "sequelize";

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
    // Check if the new offer is lower than the previous one
    if (offerAmtBuyer < buyOfferAttempts.offer_amount!) {
      return {
        status: false,
        inValidOfferCounts: buyOfferAttempts.attempts,
        remaining: 0,
        message: `You cannot submit an offer lower than your previous amount of $${buyOfferAttempts.offer_amount}`
      };
    }

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

        await buyOfferAttempts.update({
          attempts,
          offer_amount: offerAmount
        });

        return {
          status: false,
          inValidOfferCounts: attempts,
          remaining: remainingAttempts - attempts,
          message: `Insufficient amount.<br>Offer Limit: ${attempts < remainingAttempts ? `${attempts}/3` : 'Exceeded, buy at asking price.'}`
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
        message: 'Insufficient amount.<br>Offer Limit: 1/3'
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

// Helper function to calculate cart amounts
const calcCartAmounts = async (cartId: number, userId: number) => {
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
      const userDefaultAddress = await sequelize.query(`
        SELECT country FROM addresses 
        WHERE mark_default = '1' 
        AND user_id = ${userId} 
        AND is_deleted = '0'
        LIMIT 1
      `, { type: QueryTypes.SELECT }) as any[];

      if (userDefaultAddress.length > 0 && userDefaultAddress[0].country) {
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

    // Check seller's coins
    if (seller.cxp_coins! <= 0) {
      return sendApiResponse(res, 400, false, "You can not submit this offer. The seller needs more els coins for this transaction.", [], {
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
      // Add product to cart
      cartDetail = await CartDetail.create({
        cart_id: currentCart.id,
        user_id: userId,
        product_id: tradingCardId,
        product_amount: offerAmount
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
    const cartAmounts = await calcCartAmounts(currentCart.id, userId);
    await currentCart.update(cartAmounts);

    // Deduct seller's coins
    await seller.update({ cxp_coins: seller.cxp_coins! - 1 });

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

    return sendApiResponse(res, 200, true, "Successful offer, item added to cart.", [], {
      remaining_coins: seller.cxp_coins! - 1
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
            'id', 'trading_card_img', 'trading_card_slug', 'trading_card_asking_price', 
            'trading_card_offer_accept_above', 'trader_id', 'free_shipping',
            'usa_shipping_flat_rate', 'usa_add_product_flat_rate', 
            'canada_shipping_flat_rate', 'canada_add_product_flat_rate'
          ]
        }]
      }]
    });

    // If cart exists, calculate and update cart amounts
    if (cart && cart.id) {
      const cartAmounts = await calcCartAmounts(cart.id, userId);
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
              'canada_shipping_flat_rate', 'canada_add_product_flat_rate'
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
      attributes: ['id', 'street1', 'street2', 'city', 'state', 'zip', 'country', 'mark_default']
    });

    // Transform cart data for frontend
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
        cartDetails: (cart as any).cartDetails?.map((detail: any) => ({
          id: detail.id,
          cart_id: detail.cart_id,
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
            sport_name: detail.product.parentCategory ? detail.product.parentCategory.sport_name : null
          } : null
        })) || []
      };
    }

    // Transform addresses data for frontend
    const addressesData = addresses.map((address: any) => ({
      id: address.id,
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
  
  return `ESW-${year}${month}${day}${randomNum}${hours}${minutes}${seconds}`;
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
    }
  } catch (error) {
    console.error('Error setting trade and offer status:', error);
  }
};

// Helper function to create notifications
const setTradersNotificationOnVariousActionBasis = async (act: string, sentBy: number, sentTo: number, dataSetId: number, setFor: string) => {
  try {
    // This is a simplified version - you may need to implement the full notification logic
    // For now, we'll create basic notifications
    const notificationData = {
      notification_sent_by: sentBy,
      notification_sent_to: sentTo,
      message: `Action: ${act}`,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (setFor === 'Trade') {
      (notificationData as any).trade_proposal_id = dataSetId;
    } else if (setFor === 'Offer') {
      (notificationData as any).buy_sell_card_id = dataSetId;
    }

    // You can implement the actual notification creation here
    console.log('Notification created:', notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
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
        mark_default: '1',
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
      console.log('Multiple products checkout - BuyOfferproduct model needed');
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
      console.log(`Main card ${mainCard} purchased - trade cancellation logic would go here`);
    } else {
      // Handle multiple products
      const buyOfferWithProducts = buyOffer as any;
      if (buyOfferWithProducts.buy_offer_product && buyOfferWithProducts.buy_offer_product.length > 0) {
        for (const product of buyOfferWithProducts.buy_offer_product) {
          // Cancel related trade proposals for each product
          console.log(`Product ${product.main_card} purchased - trade cancellation logic would go here`);
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
          cardName = cardNamesArray.join('<br/>');
        }
      }
    }

    // Send email notifications (simplified - would need email service implementation)
    console.log('Email notifications would be sent here for purchase success');

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
      await buyOffer.update({
        buying_status: 'cancelled',
        is_payment_init: 0
      });

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
          cxp_coins: (seller.cxp_coins || 0) + 1
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

    if (remainingItems.length === 0) {
      await Cart.destroy({
        where: {
          user_id: userId,
          id: cartId
        }
      });
    } else {
      // Recalculate cart amounts
      const cartAmounts = await calcCartAmounts(cartId, userId);
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
        is_traded: { [Op.ne]: '1' },
        mark_as_deleted: null
      },
      attributes: [
        'id',
        'trader_id',
        'search_param',
        'trading_card_img',
        'category_id',
        'trading_card_estimated_value'
      ],
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: Category,
          as: 'categoryname',
          attributes: ['id', 'category_name']
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
        is_traded: { [Op.ne]: '1' }
      },
      attributes: [
        'id',
        'trader_id',
        'search_param',
        'trading_card_img',
        'category_id',
        'trading_card_estimated_value'
      ],
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: Category,
          as: 'categoryname',
          attributes: ['id', 'category_name']
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
        product_count: productCount
      },
      user_closets: userClosets.map(card => ({
        id: card.id,
        trader_id: card.trader_id,
        search_param: card.search_param,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).categoryname?.category_name || null
      })),
      interested_closets: interestedClosets.map(card => ({
        id: card.id,
        trader_id: card.trader_id,
        search_param: card.search_param,
        trading_card_img: card.trading_card_img,
        category_id: card.category_id,
        trading_card_estimated_value: card.trading_card_estimated_value,
        category_name: (card as any).categoryname?.category_name || null
      })),
      is_following: !!follower,
      trade_config: {
        open_text: "Edit Trade",
        next_text: "Continue Trade",
        btn: "<a><button>Update</button></a>"
      }
    };

    return sendApiResponse(res, 200, true, "Trade proposal data retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Trade proposal error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
