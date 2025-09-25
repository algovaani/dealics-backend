import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { TradeProposal } from '../models/tradeProposal.model.js';
import { User } from '../models/user.model.js';
import { TradingCard } from '../models/tradingcard.model.js';
import { TradeNotification } from '../models/tradeNotification.model.js';
import { sendApiResponse } from '../utils/apiResponse.js';
import { setTradeProposalStatus } from '../services/tradeStatus.service.js';

// Pay to Change Trade Status API (matches Laravel payto_chngtrade_status_ow)
export const payToChangeTradeStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { modelid, amount } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!modelid || !amount) {
      return sendApiResponse(res, 400, false, "Trade proposal ID and amount are required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(modelid);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Check CXP coins before trade status update
    const cxpCoinsCheck = await checkCXPCoinsBeforeTradeStatusUpdate(
      tradeProposal.trade_sent_by!,
      tradeProposal.trade_sent_to!,
      modelid
    );

    if (!cxpCoinsCheck.success) {
      if (cxpCoinsCheck.action === 'buycoin') {
        return sendApiResponse(res, 400, false, cxpCoinsCheck.message, [], {
          action: 'buycoin',
          redirect_url: '/ongoing-trades'
        });
      } else if (cxpCoinsCheck.action === 'chat-now') {
        return sendApiResponse(res, 400, false, cxpCoinsCheck.message, [], {
          action: 'chat-now',
          chat_id: modelid
        });
      } else {
        return sendApiResponse(res, 400, false, cxpCoinsCheck.message || 'CXP coins validation failed', [], {
          redirect_url: '/ongoing-trades'
        });
      }
    }

    // Parse send and receive cards based on user perspective (same logic as ongoing-trades API)
    let sendCards: number[] = [];
    let receiveCards: number[] = [];
    
    if (tradeProposal.send_cards) {
      const originalSendCards = tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim()));
      const originalReceiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
      
      if (tradeProposal.trade_sent_by === userId) {
        // User is the sender: Sending = send_cards, Receiving = receive_cards
        sendCards = originalSendCards;
        receiveCards = originalReceiveCards;
      } else if (tradeProposal.trade_sent_to === userId) {
        // User is the receiver: Sending = receive_cards, Receiving = send_cards
        sendCards = originalReceiveCards;
        receiveCards = originalSendCards;
      }
    }

    // Check if cards are already traded
    const cardValidation = await validateCardsNotTraded(sendCards, receiveCards, tradeProposal, userId);
    if (!cardValidation.success) {
      return sendApiResponse(res, 400, false, cardValidation.message || 'Card validation failed', [], {
        redirect_url: '/ongoing-trades'
      });
    }

    // Mark cards as traded and cancel conflicting trades
    await markCardsAsTradedAndCancelConflicts(sendCards, receiveCards, modelid);

    // Get PayPal business email from trading partner
    const tradingPartner = tradeProposal.trade_sent_by === userId 
      ? await User.findByPk(tradeProposal.trade_sent_to, {
          attributes: ['id', 'paypal_business_email', 'email', 'first_name', 'last_name']
        })
      : await User.findByPk(tradeProposal.trade_sent_by, {
          attributes: ['id', 'paypal_business_email', 'email', 'first_name', 'last_name']
        });

    if (!tradingPartner) {
      return sendApiResponse(res, 404, false, "Trading partner not found", []);
    }

    const paypalBusinessEmail = tradingPartner.paypal_business_email;

    if (paypalBusinessEmail && paypalBusinessEmail.trim() !== '') {
      // Set payment initialization
      await tradeProposal.update({
        is_payment_init: 1,
        payment_init_date: new Date(),
        is_payment_received: 2
        // COMMENTED OUT: payment_received_on should only be set in confirm-payment API
        // payment_received_on: new Date()
      });

      // Generate PayPal payment data
      const itemName = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}-${modelid}`;
      const paypalData = await generatePayPalPaymentData(modelid, itemName, amount, paypalBusinessEmail);

      return sendApiResponse(res, 200, true, "PayPal payment data generated successfully", {
        paypal_form_data: paypalData.formData,
        paypal_url: paypalData.paypalUrl,
        item_name: itemName,
        amount: amount,
        business_email: paypalBusinessEmail,
        trade_proposal_id: modelid
      });

    } else {
      // Send notification about missing PayPal business email
      await sendMissingPayPalNotification(userId, tradeProposal);

      // Send email notification (if email service is available)
      await sendMissingPayPalEmail(tradingPartner);

      return sendApiResponse(res, 400, false, "The trader's PayPal business email address is not available. A notification has been sent successfully to the trader.", [], {
        action: 'missing_paypal_email',
        redirect_url: '/ongoing-trades'
      });
    }

  } catch (error: any) {
    console.error('Pay to change trade status error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to check CXP coins before trade status update
const checkCXPCoinsBeforeTradeStatusUpdate = async (tradeSentBy: number, tradeSentTo: number, tradeProposalId: number) => {
  try {
    // Get both users' CXP coins
    const sender = await User.findByPk(tradeSentBy, { attributes: ['id', 'cxp_coins'] });
    const receiver = await User.findByPk(tradeSentTo, { attributes: ['id', 'cxp_coins'] });

    if (!sender || !receiver) {
      return { success: false, message: "User not found", action: "error" };
    }

    // Check if both users have sufficient coins
    const requiredCoins = 1; // Assuming 1 coin per trade

    if ((sender.cxp_coins || 0) < requiredCoins) {
      return {
        success: false,
        message: `You need ${requiredCoins} CXP coins to complete this trade. Please purchase coins to continue.`,
        action: "buycoin"
      };
    }

    if ((receiver.cxp_coins || 0) < requiredCoins) {
      return {
        success: false,
        message: `The trading partner needs ${requiredCoins} CXP coins to complete this trade. Please contact them to purchase coins.`,
        action: "chat-now"
      };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error checking CXP coins:', error);
    return { success: false, message: "Error checking CXP coins", action: "error" };
  }
};

// Helper function to validate cards are not already traded
const validateCardsNotTraded = async (sendCards: number[], receiveCards: number[], tradeProposal: any, userId: number) => {
  try {
    const allCards = [...sendCards, ...receiveCards];
    
    for (const cardId of allCards) {
      const card = await TradingCard.findByPk(cardId);
      if (!card) continue;

      // Only check if card is traded AND payment is already completed
      if (card.is_traded === '1' && tradeProposal.trade_amount_pay_id) {
        return {
          success: false,
          message: `${card.search_param} product is already traded and payment completed. Cannot process again.`
        };
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error validating cards:', error);
    return { success: false, message: "Error validating cards" };
  }
};

// Helper function to mark cards as traded and cancel conflicting trades
const markCardsAsTradedAndCancelConflicts = async (sendCards: number[], receiveCards: number[], currentTradeId: number) => {
  try {
    const allCards = [...sendCards, ...receiveCards];

    for (const cardId of allCards) {
      // Mark card as traded
      await TradingCard.update(
        { is_traded: '1' },
        { where: { id: cardId } }
      );

      // Find and cancel conflicting trades
      const conflictingTrades = await TradeProposal.findAll({
        where: {
          id: { [Op.ne]: currentTradeId },
          trade_status: 'new',
          [Op.or]: [
            {
              send_cards: {
                [Op.like]: `%${cardId}%`
              }
            },
            {
              receive_cards: {
                [Op.like]: `%${cardId}%`
              }
            }
          ]
        }
      });

      // Cancel conflicting trades
      for (const conflictingTrade of conflictingTrades) {
        await conflictingTrade.update({ trade_status: 'cancel' });
      }
    }

  } catch (error: any) {
    console.error('Error marking cards as traded:', error);
    throw error;
  }
};

// Helper function to generate PayPal payment data
const generatePayPalPaymentData = async (refId: number, itemName: string, itemAmount: string, businessEmail: string) => {
  try {
    const enableSandbox = process.env.PAYPAL_SANDBOX === 'true';
    const paypalUrl = enableSandbox 
      ? 'https://www.sandbox.paypal.com/cgi-bin/webscr' 
      : 'https://www.paypal.com/cgi-bin/webscr';

    const returnUrl = `${process.env.FRONTEND_URL}/api/users/payment-success/${refId}/${itemName}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/api/users/payment-cancel/${refId}`;

    const formData = {
      cmd: '_xclick',
      business: businessEmail,
      return: returnUrl,
      cancel_return: cancelUrl,
      notify_url: '',
      refid: refId.toString(),
      item_name: itemName,
      amount: itemAmount,
      currency_code: 'USD',
      rm: '2'
    };

    const queryString = new URLSearchParams(formData).toString();
    const fullPayPalUrl = `${paypalUrl}?${queryString}`;

    return {
      paypalUrl: fullPayPalUrl,
      formData: formData,
      queryString: queryString
    };

  } catch (error: any) {
    console.error('Error generating PayPal payment data:', error);
    throw error;
  }
};

// Helper function to send missing PayPal notification
const sendMissingPayPalNotification = async (userId: number, tradeProposal: any) => {
  try {
    const sentTo = tradeProposal.trade_sent_by === userId 
      ? tradeProposal.trade_sent_to 
      : tradeProposal.trade_sent_by;

    await TradeNotification.create({
      notification_sent_by: userId,
      notification_sent_to: sentTo,
      trade_proposal_id: tradeProposal.id,
      message: "PayPal business email address is not available. Please update your PayPal business email to continue with the trade."
    } as any);

  } catch (error: any) {
    console.error('Error sending missing PayPal notification:', error);
  }
};

// Helper function to send missing PayPal email
const sendMissingPayPalEmail = async (user: any) => {
  try {
    const emailData = {
      to: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      subject: 'PayPal Business Email Required',
      message: 'Please update your PayPal business email address to continue with trades.'
    };

    // Send email (implement your email service)
    // await emailService.sendEmail('missing-paypal-business-email-address', emailData);
    console.log('Missing PayPal email:', emailData);

  } catch (error: any) {
    console.error('Error sending missing PayPal email:', error);
  }
};

// Helper function to send counter accept and payment notifications
const sendCounterAcceptAndPaymentNotifications = async (tradeProposal: any, userId: number): Promise<void> => {
  try {
    const sentBy = userId;
    const sentTo = tradeProposal.trade_sent_by === userId ? tradeProposal.trade_sent_to : tradeProposal.trade_sent_by;

    // Notification 1: accept-trade-counter-and-initiate-payment
    await TradeNotification.create({
      notification_sent_by: sentTo,
      notification_sent_to: sentBy,
      trade_proposal_id: tradeProposal.id,
      message: "Counter offer accepted and payment initiated."
    } as any);

    // Notification 2: pay-to-continue-counter-trade
    await TradeNotification.create({
      notification_sent_by: sentBy,
      notification_sent_to: sentTo,
      trade_proposal_id: tradeProposal.id,
      message: "Payment required to continue counter trade."
    } as any);

    console.log('Counter accept and payment notifications sent successfully');

  } catch (error: any) {
    console.error('Error sending counter accept notifications:', error);
  }
};

// Helper function to send counter offer acceptance emails
const sendCounterOfferAcceptanceEmails = async (tradeProposal: any, tradingPartner: any, userId: number): Promise<void> => {
  try {
    // Get card details
    const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map((id: string) => parseInt(id.trim())) : [];
    const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map((id: string) => parseInt(id.trim())) : [];

    // Get card names
    const sendCardNames = await getCardNames(sendCards);
    const receiveCardNames = await getCardNames(receiveCards);

    // Determine user roles
    const isSender = tradeProposal.trade_sent_by === userId;
    const sender = isSender ? (tradeProposal as any).tradeSender : tradingPartner;
    const receiver = isSender ? tradingPartner : (tradeProposal as any).tradeReceiver;

    // Determine proposed amount and captions
    const askCash = parseFloat(tradeProposal.ask_cash || '0');
    const addCash = parseFloat(tradeProposal.add_cash || '0');
    let proposedAmount = '0';
    let proposedAmountCaptionTo = '';
    let proposedAmountCaptionBy = '';

    if (askCash > 0) {
      proposedAmount = askCash.toString();
      proposedAmountCaptionTo = " (You pay)";
      proposedAmountCaptionBy = " (You get)";
    } else if (addCash > 0) {
      proposedAmount = addCash.toString();
      proposedAmountCaptionTo = " (You get)";
      proposedAmountCaptionBy = " (You pay)";
    }

    const message = tradeProposal.counter_personalized_message || 'N/A';

    // Email to receiver (trade_sent_to)
    console.log('Counter offer acceptance email to receiver:', {
      to: receiver.email,
      tradebyname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      tradetoname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      cardyousend: sendCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
      cardyoureceive: receiveCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
      proposedamount: `${proposedAmount}${proposedAmountCaptionTo}`,
      message: message,
      reviewtradelink: `/ongoing-trades/${tradeProposal.id}`,
      transaction_id: tradeProposal.code
    });

    // Email to sender (trade_sent_by)
    console.log('Counter offer acceptance email to sender:', {
      to: sender.email,
      tradebyname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
      tradetoname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
      cardyousend: receiveCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
      cardyoureceive: sendCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
      proposedamount: `${proposedAmount}${proposedAmountCaptionBy}`,
      message: message,
      reviewtradelink: `/ongoing-trades/${tradeProposal.id}`,
      transaction_id: tradeProposal.code
    });

    // Pay-to-continue emails based on cash requirements
    if (addCash > 0 && !tradeProposal.trade_amount_paid_on) {
      // Email to sender (who needs to pay)
      console.log('Pay-to-continue email to sender:', {
        to: sender.email,
        tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
        tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
        cardyousend: sendCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
        cardyoureceive: receiveCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
        proposedamount: proposedAmount,
        reviewtradelink: `/ongoing-trades/${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      });
    } else if (askCash > 0 && !tradeProposal.trade_amount_paid_on) {
      // Email to receiver (who needs to pay)
      console.log('Pay-to-continue email to receiver:', {
        to: receiver.email,
        tradebyname: `${sender.first_name || ''} ${sender.last_name || ''}`.trim(),
        tradetoname: `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim(),
        cardyousend: receiveCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
        cardyoureceive: sendCardNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
        proposedamount: proposedAmount,
        message: message,
        reviewtradelink: `/ongoing-trades/${tradeProposal.id}`,
        transaction_id: tradeProposal.code
      });
    }

  } catch (error: any) {
    console.error('Error sending counter offer acceptance emails:', error);
  }
};

// Helper function to get card names by IDs
const getCardNames = async (cardIds: number[]): Promise<string[]> => {
  try {
    if (cardIds.length === 0) return [];
    
    const cards = await TradingCard.findAll({
      where: { id: cardIds },
      attributes: ['search_param']
    });
    
    return cards.map(card => card.search_param || 'Unknown Card');
  } catch (error: any) {
    console.error('Error getting card names:', error);
    return [];
  }
};

// Counter Offer Accept and Pay API (based on Laravel payto_chngtrade_status_co)
export const payToChangeTradeStatusCounterOffer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { modelid, amount } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!modelid || !amount) {
      return sendApiResponse(res, 400, false, "Trade proposal ID and amount are required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(modelid, {
      include: [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'paypal_business_email', 'email', 'first_name', 'last_name', 'cxp_coins']
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'paypal_business_email', 'email', 'first_name', 'last_name', 'cxp_coins']
        }
      ]
    });

    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Verify user has permission to update this trade
    if (tradeProposal.trade_sent_by !== userId && tradeProposal.trade_sent_to !== userId) {
      return sendApiResponse(res, 403, false, "You don't have permission to update this trade", []);
    }

    // Check if trade status is counter_offer or counter_accepted
    if (tradeProposal.trade_status !== 'counter_offer' && tradeProposal.trade_status !== 'counter_accepted') {
      return sendApiResponse(res, 400, false, "Trade status must be counter_offer or counter_accepted to process counter offer payment", []);
    }

    // Get PayPal business email from trading partner
    let paypalBusinessEmail = '';
    let tradingPartner: any = null;

    if (tradeProposal.trade_sent_by === userId) {
      tradingPartner = (tradeProposal as any).tradeReceiver;
    } else if (tradeProposal.trade_sent_to === userId) {
      tradingPartner = (tradeProposal as any).tradeSender;
    }

    if (tradingPartner && tradingPartner.paypal_business_email) {
      paypalBusinessEmail = tradingPartner.paypal_business_email;
    }

    // Check CXP coins before proceeding
    const cxpCoinsCheck = await checkCXPCoinsBeforeTradeStatusUpdate(
      tradeProposal.trade_sent_by || 0, 
      tradeProposal.trade_sent_to || 0, 
      modelid
    );

    if (!cxpCoinsCheck.success) {
      return sendApiResponse(res, 400, false, cxpCoinsCheck.message || 'CXP coins validation failed', [], {
        redirect_url: '/ongoing-trades',
        action: cxpCoinsCheck.action || 'buycoin'
      });
    }

    if (paypalBusinessEmail && paypalBusinessEmail.trim() !== '') {
      // Set payment initialization
      await tradeProposal.update({
        is_payment_init: 1,
        payment_init_date: new Date()
      });

      // Update trade status to counter_accepted (only if not already)
      if (tradeProposal.trade_status !== 'counter_accepted') {
        await tradeProposal.update({
          trade_status: 'counter_accepted',
          accepted_on: new Date()
        });
      }

      // Set trade proposal status based on cash requirements
      if ((tradeProposal.add_cash || 0) > 0 && !tradeProposal.trade_amount_paid_on) {
        await setTradeProposalStatus(tradeProposal.id, 'counter-offer-accepted-sender-pay');
      } else if ((tradeProposal.ask_cash || 0) > 0 && !tradeProposal.trade_amount_paid_on) {
        await setTradeProposalStatus(tradeProposal.id, 'counter-offer-accepted-receiver-pay');
      }

      // Send counter accept and payment notifications
      await sendCounterAcceptAndPaymentNotifications(tradeProposal, userId);

      // Generate PayPal payment data
      const itemName = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}-${modelid}`;
      const paypalData = await generatePayPalPaymentData(modelid, itemName, amount, paypalBusinessEmail);

      // Send email notifications
      await sendCounterOfferAcceptanceEmails(tradeProposal, tradingPartner, userId);

      return sendApiResponse(res, 200, true, "Counter offer accepted and PayPal payment data generated successfully", {
        paypal_form_data: paypalData.formData,
        paypal_url: paypalData.paypalUrl,
        item_name: itemName,
        amount: amount,
        business_email: paypalBusinessEmail,
        trade_proposal_id: modelid,
        trade_status: 'counter_accepted'
      });

    } else {
      // Send notification about missing PayPal business email
      await sendMissingPayPalNotification(userId, tradeProposal);

      // Send email notification (if email service is available)
      await sendMissingPayPalEmail(tradingPartner);

      return sendApiResponse(res, 400, false, "The trader's PayPal business email address is not available. A notification has been sent successfully to the trader.", []);
    }

  } catch (error: any) {
    console.error('Counter offer accept and pay error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Handle PayPal Payment Response (for frontend integration)
export const handlePayPalResponse = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      trade_proposal_id,
      payment_id,
      payer_id,
      amount,
      status,
      item_name,
      business_email
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_proposal_id || !payment_id || !amount) {
      return sendApiResponse(res, 400, false, "Trade proposal ID, payment ID, and amount are required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(trade_proposal_id);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Verify user has permission to update this trade
    if (tradeProposal.trade_sent_by !== userId && tradeProposal.trade_sent_to !== userId) {
      return sendApiResponse(res, 403, false, "You don't have permission to update this trade", []);
    }

    if (status === 'success' || status === 'completed') {
      // Update payment status
      await tradeProposal.update({
        trade_amount_pay_id: payment_id,
        trade_amount_payer_id: payer_id || '',
        trade_amount_amount: amount,
        trade_amount_pay_status: 'approved',
        trade_amount_paid_on: new Date(),
        // COMMENTED OUT: These fields should only be set in confirm-payment API
        // is_payment_received: 1,
        // payment_received_on: new Date(),
        trade_status: 'accepted'
      });

      // Set trade status
      await setTradeProposalStatus(tradeProposal.id, 'trade-accepted');

      // Send notifications
      await TradeNotification.create({
        notification_sent_by: tradeProposal.trade_sent_to!,
        notification_sent_to: tradeProposal.trade_sent_by!,
        trade_proposal_id: tradeProposal.id,
        message: "Trade payment has been completed successfully."
      } as any);

      return sendApiResponse(res, 200, true, "Payment completed successfully", {
        trade_proposal_id: tradeProposal.id,
        payment_status: 'completed',
        redirect_url: `/ongoing-trades/${tradeProposal.id}`
      });

    } else if (status === 'cancelled' || status === 'failed') {
      // Reset payment initialization
      await tradeProposal.update({
        is_payment_init: 0,
        payment_init_date: new Date(),
        trade_amount_pay_status: 'cancelled'
      });

      return sendApiResponse(res, 200, true, "Payment was cancelled", {
        trade_proposal_id: tradeProposal.id,
        payment_status: 'cancelled',
        redirect_url: `/ongoing-trades/${tradeProposal.id}`
      });

    } else {
      return sendApiResponse(res, 400, false, "Invalid payment status", []);
    }

  } catch (error: any) {
    console.error('PayPal response handling error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// PayPal Payment Success Handler (Legacy - for direct PayPal redirects)
export const payPalPaymentSuccess = async (req: Request, res: Response) => {
  try {
    const { refId, itemName } = req.params;
    const paymentData = req.query;

    // Update trade proposal with payment information
    const tradeProposal = await TradeProposal.findByPk(refId);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Update payment status
    await tradeProposal.update({
      trade_amount_pay_id: String((Array.isArray(paymentData.payment_id) ? paymentData.payment_id[0] : paymentData.payment_id) || ''),
      trade_amount_payer_id: String((Array.isArray(paymentData.payer_id) ? paymentData.payer_id[0] : paymentData.payer_id) || ''),
      trade_amount_amount: String((Array.isArray(paymentData.amount) ? paymentData.amount[0] : paymentData.amount) || ''),
      trade_amount_pay_status: 'approved',
      trade_amount_paid_on: new Date(),
      // COMMENTED OUT: These fields should only be set in confirm-payment API
      // is_payment_received: 1,
      // payment_received_on: new Date(),
      trade_status: 'accepted'
    });

    // Set trade status
    await setTradeProposalStatus(tradeProposal.id, 'trade-accepted');

    // Send notifications
    await TradeNotification.create({
      notification_sent_by: tradeProposal.trade_sent_to!,
      notification_sent_to: tradeProposal.trade_sent_by!,
      trade_proposal_id: tradeProposal.id,
      message: "Trade payment has been completed successfully."
    } as any);

    return sendApiResponse(res, 200, true, "Payment completed successfully", {
      trade_proposal_id: tradeProposal.id,
      redirect_url: `/ongoing-trades/${tradeProposal.id}`
    });

  } catch (error: any) {
    console.error('PayPal payment success error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// PayPal Payment Cancel Handler
export const payPalPaymentCancel = async (req: Request, res: Response) => {
  try {
    const { refId } = req.params;

    const tradeProposal = await TradeProposal.findByPk(refId);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Reset payment initialization
    await tradeProposal.update({
      is_payment_init: 0,
      payment_init_date: new Date()
    });

    return sendApiResponse(res, 200, true, "Payment cancelled", {
      trade_proposal_id: tradeProposal.id,
      redirect_url: `/ongoing-trades/${tradeProposal.id}`
    });

  } catch (error: any) {
    console.error('PayPal payment cancel error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};
