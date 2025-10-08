import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { TradeProposal } from '../models/tradeProposal.model.js';
import { User } from '../models/user.model.js';
import { TradingCard } from '../models/tradingcard.model.js';
import { TradeNotification } from '../models/tradeNotification.model.js';
import { CreditDeductionLog } from '../models/creditDeductionLog.model.js';
import { sendApiResponse } from '../utils/apiResponse.js';
import { setTradeProposalStatus } from '../services/tradeStatus.service.js';
import { setTradersNotificationOnVariousActionBasis } from '../services/notification.service.js';
import { EmailHelperService } from '../services/emailHelper.service.js';

// Unified Payment Processor API (Based on Laravel unifiedPaymentProcessor)
export const payToChangeTradeStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { modelid, amount, paymentType = 'ongoing_trade' } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!modelid || !amount) {
      return sendApiResponse(res, 400, false, "Trade proposal ID and amount are required", []);
    }

    // Get trade proposal
    const tradeProposal = await TradeProposal.findByPk(modelid);
    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade not found", [], {
        redirect_url: '/ongoing-trades'
      });
    }


    // Get PayPal business email
    const paypalEmailData = await getUnifiedPayPalEmail(tradeProposal, userId);
    const paypalBusinessEmail = paypalEmailData.email;
    const paypalAccountDetails = paypalEmailData.details;

    if (!paypalBusinessEmail || paypalBusinessEmail.trim() === '') {
      return await handleUnifiedMissingPayPal(paypalAccountDetails, tradeProposal, userId, res);
    }

    // Validate prerequisites based on payment type
    const validationResult = await validateUnifiedPrerequisites(tradeProposal, req.body, paymentType, userId, res);
    if (validationResult !== true) {
      return validationResult;
    }

    // Process cards and cancel conflicting trades
    await processUnifiedTradingCards(tradeProposal, modelid);

    // Update trade status and send notifications
    await updateUnifiedTradeStatus(tradeProposal, paymentType, userId);
    
    // Verify status update by fetching fresh data
    const updatedTradeProposal = await TradeProposal.findByPk(tradeProposal.id);
    console.log(`🔍 Final trade proposal status after update:`, {
      id: updatedTradeProposal?.id,
      trade_status: updatedTradeProposal?.trade_status,
      trade_proposal_status_id: updatedTradeProposal?.trade_proposal_status_id,
      add_cash: updatedTradeProposal?.add_cash,
      ask_cash: updatedTradeProposal?.ask_cash,
      trade_amount_paid_on: updatedTradeProposal?.trade_amount_paid_on
    });

    // Initialize payment
    await tradeProposal.update({
      is_payment_init: 1,
      payment_init_date: new Date(),
      // is_payment_received: 2
    });

    // Submit payment to PayPal
    const itemName = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}-${modelid}`;
    const paypalPaymentData = await generatePayPalPaymentData(modelid, itemName, amount, paypalBusinessEmail);

    return sendApiResponse(res, 200, true, "PayPal payment data generated successfully", {
      paypal_form_data: paypalPaymentData.formData,
      paypal_url: paypalPaymentData.paypalUrl,
      item_name: itemName,
      amount: amount,
      business_email: paypalBusinessEmail,
      trade_proposal_id: modelid
    });

  } catch (error: any) {
    console.error('Unified payment processor error:', error);
    return sendApiResponse(res, 500, false, `Payment processing failed: ${error.message}`, [], {
      redirect_url: '/ongoing-trades'
    });
  }
};

// Get PayPal business email for unified function
const getUnifiedPayPalEmail = async (tradeProposal: any, userId: number) => {
  let paypalBusinessEmail = '';
  let paypalAccountDetails = null;

  if (tradeProposal.trade_sent_by === userId) {
    paypalAccountDetails = await User.findByPk(tradeProposal.trade_sent_to, {
      attributes: ['paypal_business_email', 'email', 'first_name', 'last_name']
    });
  } else if (tradeProposal.trade_sent_to === userId) {
    paypalAccountDetails = await User.findByPk(tradeProposal.trade_sent_by, {
      attributes: ['paypal_business_email', 'email', 'first_name', 'last_name']
    });
  }

  if (paypalAccountDetails && paypalAccountDetails.paypal_business_email && paypalAccountDetails.paypal_business_email.trim() !== '') {
    paypalBusinessEmail = paypalAccountDetails.paypal_business_email;
  }

  return {
    email: paypalBusinessEmail,
    details: paypalAccountDetails
  };
};

// Handle missing PayPal email for unified function
const handleUnifiedMissingPayPal = async (paypalAccountDetails: any, tradeProposal: any, userId: number, res: Response) => {
  const act = 'paypal-business-details-not-available';
  const sentBy = userId;
  const sentTo = (tradeProposal.trade_sent_by === sentBy) ? tradeProposal.trade_sent_to : tradeProposal.trade_sent_by;
  
  // Send notification
  await setTradersNotificationOnVariousActionBasis(act, sentBy, sentTo, tradeProposal.id, 'Trade');

  return sendApiResponse(res, 400, false, "The trader's PayPal business email address is not available. A notification has been sent successfully to the trader.", [], {
    redirect_url: '/ongoing-trades'
  });
};

// Validate prerequisites for unified function
const validateUnifiedPrerequisites = async (tradeProposal: any, requestData: any, paymentType: string, userId: number, res: Response) => {
  // Validate coins based on payment type
  if (paymentType === 'counter_offer') {
    // For counter offer, deduct coins from both users
    const deductCoinsStatus = await deductCoins(tradeProposal.trade_sent_to, tradeProposal.trade_sent_by, tradeProposal);
    if (deductCoinsStatus.status === false) {
      return handleUnifiedCoinError(deductCoinsStatus, tradeProposal, res);
    }
  } else {
    // For ongoing trade, check CXP coins
    const cxpCoinsStatus = await checkCXPCoinsBeforeTradeStatusUpdate(
      tradeProposal.trade_sent_by,
      tradeProposal.trade_sent_to,
      requestData.modelid
    );
    if (cxpCoinsStatus.success === false) {
      return handleUnifiedCoinError(cxpCoinsStatus, tradeProposal, res);
    }
  }

  // Validate trading cards availability
  return await validateUnifiedCards(tradeProposal, res);
};

// Handle coin validation errors for unified function
const handleUnifiedCoinError = (coinStatus: any, tradeProposal: any, res: Response) => {
  if (coinStatus.action === 'buycoin') {
    return sendApiResponse(res, 400, false, coinStatus.message, [], {
      action: 'buycoin',
      redirect_url: '/ongoing-trades'
    });
  } else if (coinStatus.action === 'chat-now') {
    return sendApiResponse(res, 400, false, coinStatus.message, [], {
      action: 'chat-now',
      chat_id: tradeProposal.id,
      redirect_url: '/ongoing-trades'
    });
  } else {
    return sendApiResponse(res, 400, false, coinStatus.message, [], {
      redirect_url: '/ongoing-trades'
    });
  }
};

// Validate trading cards for unified function
const validateUnifiedCards = async (tradeProposal: any, res: Response) => {
  console.log(`🔍 Validating trading cards for trade proposal: ${tradeProposal.id}`);
  
  const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
  const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
  const allCards = [...sendCards, ...receiveCards];

  console.log(`📋 Cards to validate:`, { sendCards, receiveCards, allCards });

  for (const cardId of allCards) {
    const tradeCard = await TradingCard.findByPk(cardId.trim());
    console.log(`🔍 Checking card ${cardId}:`, {
      id: tradeCard?.id,
      search_param: tradeCard?.search_param,
      is_traded: tradeCard?.is_traded,
      trader_id: tradeCard?.trader_id
    });
    
    // Commented out is_traded check as requested
    // if (tradeCard && tradeCard.is_traded === '1') {
    //   console.log(`❌ Card ${cardId} (${tradeCard.search_param}) is already traded`);
    //   console.log(`🔍 Card details:`, {
    //     id: tradeCard.id,
    //     search_param: tradeCard.search_param,
    //     is_traded: tradeCard.is_traded,
    //     trader_id: tradeCard.trader_id,
    //     trading_card_status: tradeCard.trading_card_status
    //   });
    //   
    //   const errorMessage = `${tradeCard.search_param} product is in a Pending Trade with another user. Please select a different product to continue.`;
    //   return sendApiResponse(res, 400, false, errorMessage, [], {
    //     redirect_url: '/ongoing-trades'
    //   });
    // }
  }

  console.log(`✅ All cards validated successfully`);
  return true;
};

// Process trading cards for unified function
const processUnifiedTradingCards = async (tradeProposal: any, tradeId: number) => {
  const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
  const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
  const allCards = [...sendCards, ...receiveCards];

  for (const cardId of allCards) {
    await markUnifiedCardAsTraded(cardId.trim());
    await cancelUnifiedConflictingTrades(cardId.trim(), tradeId);
  }
};

// Mark card as traded for unified function
const markUnifiedCardAsTraded = async (cardId: string) => {
  const tradeCard = await TradingCard.findByPk(cardId);
  if (tradeCard) {
    await tradeCard.update({ is_traded: '1' });
  }
};

// Cancel conflicting trades for unified function
const cancelUnifiedConflictingTrades = async (cardId: string, currentTradeId: number) => {
  const cancelTrades = await TradeProposal.findAll({
    where: {
      id: { [Op.ne]: currentTradeId },
      [Op.or]: [
        { send_cards: { [Op.like]: `%${cardId}%` } },
        { receive_cards: { [Op.like]: `%${cardId}%` } }
      ]
    }
  });

  for (const cancelTrade of cancelTrades) {
    if (cancelTrade.trade_status === 'new') {
      await cancelTrade.update({ trade_status: 'cancel' });
    }
  }
};

// Update trade status for unified function
const updateUnifiedTradeStatus = async (tradeProposal: any, paymentType: string, userId: number) => {
  if (paymentType === 'counter_offer' && tradeProposal.trade_status === 'counter_offer') {
    await tradeProposal.update({
      trade_status: 'counter_accepted',
      accepted_on: new Date()
    });

    // Send counter offer notifications and emails
    await sendCounterAcceptAndPaymentNotifications(tradeProposal, userId);
    await sendUnifiedCounterEmails(tradeProposal);
  } else if (paymentType === 'ongoing_trade' && tradeProposal.trade_status !== 'accepted') {
    await tradeProposal.update({
      trade_status: 'accepted',
      accepted_on: new Date()
    });

    // Send trade acceptance notifications and emails
    await sendAcceptAndPaymentNotifications(tradeProposal, userId);
    await sendUnifiedTradeEmails(tradeProposal);
  }

  // Set trade status based on cash requirements
  console.log(`🔍 Checking cash requirements:`, {
    add_cash: tradeProposal.add_cash,
    ask_cash: tradeProposal.ask_cash,
    trade_amount_paid_on: tradeProposal.trade_amount_paid_on,
    paymentType: paymentType
  });

  if (tradeProposal.add_cash > 0 && !tradeProposal.trade_amount_paid_on) {
    const status = paymentType === 'counter_offer' ? 'counter-offer-accepted-sender-pay' : 'trade-offer-accepted-sender-pay';
    console.log(`🔄 Setting trade status to ${status} for trade proposal:`, tradeProposal.id);
    console.log(`🔍 Trade proposal details before status update:`, {
      id: tradeProposal.id,
      trade_proposal_status_id: tradeProposal.trade_proposal_status_id,
      add_cash: tradeProposal.add_cash,
      ask_cash: tradeProposal.ask_cash,
      trade_amount_paid_on: tradeProposal.trade_amount_paid_on
    });
    
    const statusResult = await setTradeProposalStatus(tradeProposal.id, status);
    console.log(`📊 Status update result for ${status}:`, statusResult);
    
    if (!statusResult.success) {
      console.error(`❌ Failed to update trade status to ${status}:`, statusResult.error);
    } else {
      console.log(`✅ Trade status updated successfully to ${status}`);
    }
  } else if (tradeProposal.ask_cash > 0 && !tradeProposal.trade_amount_paid_on) {
    const status = paymentType === 'counter_offer' ? 'counter-offer-accepted-receiver-pay' : 'trade-offer-accepted-receiver-pay';
    console.log(`🔄 Setting trade status to ${status} for trade proposal:`, tradeProposal.id);
    console.log(`🔍 Trade proposal details before status update:`, {
      id: tradeProposal.id,
      trade_proposal_status_id: tradeProposal.trade_proposal_status_id,
      add_cash: tradeProposal.add_cash,
      ask_cash: tradeProposal.ask_cash,
      trade_amount_paid_on: tradeProposal.trade_amount_paid_on
    });
    
    const statusResult = await setTradeProposalStatus(tradeProposal.id, status);
    console.log(`📊 Status update result for ${status}:`, statusResult);
    
    if (!statusResult.success) {
      console.error(`❌ Failed to update trade status to ${status}:`, statusResult.error);
    } else {
      console.log(`✅ Trade status updated successfully to ${status}`);
    }
  } else {
    console.log(`⚠️ No status update needed. Conditions not met:`, {
      add_cash_condition: tradeProposal.add_cash > 0,
      ask_cash_condition: tradeProposal.ask_cash > 0,
      payment_not_paid: !tradeProposal.trade_amount_paid_on
    });
  }
};

// Send counter offer emails for unified function
const sendUnifiedCounterEmails = async (tradeProposal: any) => {
  const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
  const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
  const userTo = await User.findByPk(tradeProposal.trade_sent_to);
  const userBy = await User.findByPk(tradeProposal.trade_sent_by);

  const proposedAmount = tradeProposal.add_cash > 0 ? tradeProposal.add_cash : (tradeProposal.ask_cash > 0 ? tradeProposal.ask_cash : '0');
  const message = tradeProposal.counter_personalized_message || 'N/A';

  const cardData = await prepareUnifiedCardData(sendCards, receiveCards);
  const amountCaptions = getUnifiedAmountCaptions(tradeProposal.ask_cash, tradeProposal.add_cash);

  // Send counter offer emails
  await sendUnifiedCounterOfferEmails(userTo, userBy, cardData, proposedAmount, amountCaptions, message, tradeProposal);
};

// Send trade acceptance emails for unified function
const sendUnifiedTradeEmails = async (tradeProposal: any) => {
  const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
  const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
  const userTo = await User.findByPk(tradeProposal.trade_sent_to);
  const userBy = await User.findByPk(tradeProposal.trade_sent_by);

  const proposedAmount = tradeProposal.add_cash || tradeProposal.ask_cash;
  const message = tradeProposal.message || 'N/A';

  const cardData = await prepareUnifiedCardData(sendCards, receiveCards);
  const amountCaptions = getUnifiedAmountCaptions(tradeProposal.ask_cash, tradeProposal.add_cash);

  // Send trade acceptance emails
  await sendUnifiedTradeAcceptanceEmails(userTo, userBy, cardData, proposedAmount, amountCaptions, message, tradeProposal);
};

// Prepare card data for unified function
const prepareUnifiedCardData = async (sendCards: string[], receiveCards: string[]) => {
  const sentCards = await TradingCard.findAll({
    where: { id: { [Op.in]: sendCards.map(id => parseInt(id.trim())) } },
    attributes: ['search_param']
  });
  const receivedCards = await TradingCard.findAll({
    where: { id: { [Op.in]: receiveCards.map(id => parseInt(id.trim())) } },
    attributes: ['search_param']
  });

  const sentCardNames = sentCards.map(card => card.search_param).filter(Boolean);
  const receivedCardNames = receivedCards.map(card => card.search_param).filter(Boolean);

  let itemsSend = '';
  sentCardNames.forEach((cardName, index) => {
    itemsSend += `${index + 1}. ${cardName}\n`;
  });

  let itemsReceived = '';
  receivedCardNames.forEach((cardName, index) => {
    itemsReceived += `${index + 1}. ${cardName}\n`;
  });

  return {
    itemsSend,
    itemsReceived
  };
};

// Get amount captions for unified function
const getUnifiedAmountCaptions = (askCash: number, addCash: number) => {
  let proposedAmountCaptionTo = '';
  let proposedAmountCaptionBy = '';

  if (askCash > 0) {
    proposedAmountCaptionTo = " (You pay)";
    proposedAmountCaptionBy = " (You get)";
  } else if (addCash > 0) {
    proposedAmountCaptionTo = " (You get)";
    proposedAmountCaptionBy = " (You pay)";
  }

  return {
    to: proposedAmountCaptionTo,
    by: proposedAmountCaptionBy
  };
};

// Send counter offer emails for unified function
const sendUnifiedCounterOfferEmails = async (userTo: any, userBy: any, cardData: any, proposedAmount: any, amountCaptions: any, message: string, tradeProposal: any) => {
  // Email to receiver
  const mailInputsTo = {
    to: userTo.email,
    tradebyname: `${userTo.first_name} ${userTo.last_name}`,
    tradetoname: `${userBy.first_name} ${userBy.last_name}`,
    cardyousend: cardData.itemsSend.replace(/\n/g, '<br>'),
    cardyoureceive: cardData.itemsReceived.replace(/\n/g, '<br>'),
    proposedamount: `${proposedAmount}${amountCaptions.to}`,
    message: message,
    reviewtradelink: `${process.env.BASE_URL}/ongoing-trades/${tradeProposal.id}`,
    transaction_id: tradeProposal.code,
  };

  // Email to sender
  const mailInputsBy = {
    to: userBy.email,
    tradebyname: `${userTo.first_name} ${userTo.last_name}`,
    tradetoname: `${userBy.first_name} ${userBy.last_name}`,
    cardyousend: cardData.itemsReceived.replace(/\n/g, '<br>'),
    cardyoureceive: cardData.itemsSend.replace(/\n/g, '<br>'),
    proposedamount: `${proposedAmount}${amountCaptions.by}`,
    message: message,
    reviewtradelink: `${process.env.BASE_URL}/ongoing-trades/${tradeProposal.id}`,
    transaction_id: tradeProposal.code,
  };

  // Send emails using EmailHelperService
  try {
    await Promise.all([
      EmailHelperService.executeMailSender('counter-trade-offer-accepted-receiver', mailInputsTo),
      EmailHelperService.executeMailSender('counter-trade-offer-accepted-sender', mailInputsBy)
    ]);
    console.log('✅ Counter offer emails sent successfully');
  } catch (error) {
    console.error('❌ Failed to send counter offer emails:', error);
  }
};

// Send trade acceptance emails for unified function
const sendUnifiedTradeAcceptanceEmails = async (userTo: any, userBy: any, cardData: any, proposedAmount: any, amountCaptions: any, message: string, tradeProposal: any) => {
  // Email to receiver
  const mailInputsTo = {
    to: userTo.email,
    tradebyname: `${userBy.first_name} ${userBy.last_name}`,
    tradetoname: `${userTo.first_name} ${userTo.last_name}`,
    cardyousend: cardData.itemsReceived.replace(/\n/g, '<br>'),
    cardyoureceive: cardData.itemsSend.replace(/\n/g, '<br>'),
    proposedamount: `${proposedAmount}${amountCaptions.to}`,
    message: message,
    reviewtradelink: `${process.env.BASE_URL}/ongoing-trades/${tradeProposal.id}`,
    transaction_id: tradeProposal.code,
  };

  // Email to sender
  const mailInputsBy = {
    to: userBy.email,
    tradebyname: `${userBy.first_name} ${userBy.last_name}`,
    tradetoname: `${userTo.first_name} ${userTo.last_name}`,
    cardyousend: cardData.itemsSend.replace(/\n/g, '<br>'),
    cardyoureceive: cardData.itemsReceived.replace(/\n/g, '<br>'),
    proposedamount: `${proposedAmount}${amountCaptions.by}`,
    message: message,
    reviewtradelink: `${process.env.BASE_URL}/ongoing-trades/${tradeProposal.id}`,
    transaction_id: tradeProposal.code,
  };

  // Send emails using EmailHelperService
  try {
    await Promise.all([
      EmailHelperService.executeMailSender('trade-offer-accepted-receiver', mailInputsTo),
      EmailHelperService.executeMailSender('trade-offer-accepted-sender', mailInputsBy)
    ]);
    console.log('✅ Trade acceptance emails sent successfully');
  } catch (error) {
    console.error('❌ Failed to send trade acceptance emails:', error);
  }
};


// Send accept and payment notifications
const sendAcceptAndPaymentNotifications = async (tradeProposal: any, userId: number): Promise<void> => {
  // Implement notification logic here
  console.log('Sending accept and payment notifications for trade:', tradeProposal.id);
};

// Deduct coins helper function
const deductCoins = async (tradeSentTo: number, tradeSentBy: number, tradeProposal: any) => {
  console.log(`🪙 Deducting coins for trade proposal: ${tradeProposal.id}`);
  
  try {
    // Get both users' coin information
    const [userTo, userBy] = await Promise.all([
      User.findByPk(tradeSentTo, { attributes: ['id', 'cxp_coins'] }),
      User.findByPk(tradeSentBy, { attributes: ['id', 'cxp_coins'] })
    ]);

    if (!userTo || !userBy) {
      console.error(`❌ Users not found: tradeSentTo=${tradeSentTo}, tradeSentBy=${tradeSentBy}`);
      return { status: false, message: 'Users not found', action: 'error' };
    }

    console.log(`📊 User coin status:`, {
      userTo: { id: userTo.id, coins: userTo.cxp_coins },
      userBy: { id: userBy.id, coins: userBy.cxp_coins }
    });

    // Check if both users have enough coins
    if ((userTo.cxp_coins || 0) < 1) {
      console.log(`❌ User ${tradeSentTo} doesn't have enough coins`);
      return { 
        status: false, 
        message: 'You don\'t have enough coins to proceed with this trade. Please purchase coins to continue.', 
        action: 'buycoin' 
      };
    }

    if ((userBy.cxp_coins || 0) < 1) {
      console.log(`❌ User ${tradeSentBy} doesn't have enough coins`);
      return { 
        status: false, 
        message: 'The other trader doesn\'t have enough coins to proceed with this trade.', 
        action: 'chat-now' 
      };
    }

    // Deduct coins from both users
    await Promise.all([
      userTo.update({ cxp_coins: Math.max(0, (userTo.cxp_coins || 0) - 1) }),
      userBy.update({ cxp_coins: Math.max(0, (userBy.cxp_coins || 0) - 1) })
    ]);

    // Create credit deduction logs for both users
    await Promise.all([
      CreditDeductionLog.create({
        trade_id: tradeProposal.id,
        sent_to: tradeSentTo,
        sent_by: tradeSentBy,
        coin: 1,
        trade_status: 'In Progress',
        status: 'Success',
        deduction_from: 'Receiver'
      } as any),
      CreditDeductionLog.create({
        trade_id: tradeProposal.id,
        sent_to: tradeSentBy,
        sent_by: tradeSentTo,
        coin: 1,
        trade_status: 'In Progress',
        status: 'Success',
        deduction_from: 'Sender'
      } as any)
    ]);

    console.log(`✅ Coins deducted successfully for both users`);
  return { status: true };

  } catch (error: any) {
    console.error(`❌ Error deducting coins:`, error);
    return { status: false, message: 'Error processing coin deduction', action: 'error' };
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

// Helper function to send counter accept and payment notifications (Laravel-equivalent aliases via common helper)
const sendCounterAcceptAndPaymentNotifications = async (tradeProposal: any, userId: number): Promise<void> => {
  try {
    const sentBy = userId;
    const sentTo = tradeProposal.trade_sent_by === userId ? tradeProposal.trade_sent_to : tradeProposal.trade_sent_by;

    // Alias 1: accept-trade-and-initiate-payment (for non-counter accept)
    await setTradersNotificationOnVariousActionBasis(
      'accept-trade-and-initiate-payment',
      sentBy,
      sentTo,
      tradeProposal.id,
      'Trade'
    );

    // Alias 2: pay-to-continue (generic)
    await setTradersNotificationOnVariousActionBasis(
      'pay-to-continue',
      sentBy,
      sentTo,
      tradeProposal.id,
      'Trade'
    );

    console.log('Counter accept and payment notifications sent successfully (via templates)');
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

// Unified Payment Success Processor API (Based on Laravel unifiedPaymentSuccessProcessor)
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
      business_email,
      paymentType = 'ongoing_trade',
      id = null
    } = req.body;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    let tradeProposal = null;
    let tradeAmountAmount = 0;
    let transactionId = '';

    if (paymentType === 'counter_offer') {
      // Handle counter-offer payment success
      if (payment_id && payer_id) {
        // Simulate PayPal gateway response (in real implementation, use actual PayPal gateway)
        const paypalResponse = {
          isSuccessful: () => true,
          getData: () => ({
            id: payment_id,
            payer: {
              payer_info: {
                payer_id: payer_id
              }
            },
            transactions: [{
              amount: {
                total: amount
              }
            }],
            state: 'approved'
          })
        };

        if (paypalResponse.isSuccessful()) {
          const responseData = paypalResponse.getData();
          tradeProposal = await TradeProposal.findByPk(id || trade_proposal_id);
          
          if (!tradeProposal) {
            return sendApiResponse(res, 404, false, "Trade proposal not found", []);
          }

          await tradeProposal.update({
            trade_status: 'counter_accepted',
            is_payment_received: 2,
            trade_amount_pay_id: responseData.id,
            trade_amount_payer_id: responseData.payer.payer_info.payer_id,
            trade_amount_amount: responseData.transactions?.[0]?.amount?.total || '0',
            trade_amount_pay_status: responseData.state,
            trade_amount_paid_on: new Date()
          });

          await setTradeProposalStatus(tradeProposal.id, 'payment-made');

          tradeAmountAmount = parseFloat(tradeProposal.trade_amount_amount || '0');
          transactionId = responseData.id;
        } else {
          return sendApiResponse(res, 400, false, "Payment failed", []);
        }
      } else {
        tradeProposal = await TradeProposal.findByPk(id || trade_proposal_id);
        if (!tradeProposal) {
          return sendApiResponse(res, 404, false, "Trade proposal not found", []);
        }

        if (userId === tradeProposal.trade_sent_to) {
          return sendApiResponse(res, 400, false, "Payment declined!", []);
        } else if (userId === tradeProposal.trade_sent_by) {
          return sendApiResponse(res, 400, false, "Payment declined!", []);
        }
      }
    } else {
      // Handle ongoing trade payment success
      let itemName = null;
      let tradeId = null;

      // Extract item_name from request
      for (const [key, value] of Object.entries(req.body)) {
        if (key === 'PayerID') continue;
        if (key.includes('-')) {
          itemName = key;
          break;
        }
      }

      // If item_name found, extract trade ID
      if (itemName) {
        const refItemName = itemName.split('-');
        tradeId = refItemName[1];
      } else if (trade_proposal_id) {
        // Use trade_proposal_id directly if item_name not found
        tradeId = trade_proposal_id;
      }

      if (tradeId) {
        tradeProposal = await TradeProposal.findByPk(tradeId);
        
        if (!tradeProposal) {
          return sendApiResponse(res, 404, false, "Trade proposal not found", []);
        }

        if ((tradeProposal.add_cash || 0) > 0) {
          tradeAmountAmount = tradeProposal.add_cash || 0;
        } else if ((tradeProposal.ask_cash || 0) > 0) {
          tradeAmountAmount = tradeProposal.ask_cash || 0;
        }

        await tradeProposal.update({
          trade_amount_pay_id: '',
          trade_amount_payer_id: '',
          trade_amount_amount: tradeAmountAmount.toString(),
          trade_amount_pay_status: 'approved',
          trade_amount_paid_on: new Date(),
          trade_status: 'accepted',
          is_payment_received: 2
        });

        console.log('🔄 Setting trade status to payment-made for trade proposal:', tradeProposal.id);
        const statusResult = await setTradeProposalStatus(tradeProposal.id, 'payment-made');
        console.log('📊 Status update result for payment-made:', statusResult);
        
        if (!statusResult.success) {
          console.error('❌ Failed to update trade status to payment-made:', statusResult.error);
          
          // Fallback: Direct status update
          console.log('🔄 Attempting direct status update for payment-made...');
          const { TradeProposalStatus } = await import('../models/tradeProposalStatus.model.js');
          const paymentMadeStatus = await TradeProposalStatus.findOne({
            where: { alias: 'payment-made' }
          });
          
          if (paymentMadeStatus) {
            await TradeProposal.update(
              { trade_proposal_status_id: paymentMadeStatus.id },
              { where: { id: tradeProposal.id } }
            );
            console.log('✅ Direct status update completed for payment-made');
          } else {
            console.error('❌ Payment-made status not found in database');
          }
        } else {
          console.log('✅ Trade status updated successfully to payment-made');
        }
      } else {
        return sendApiResponse(res, 400, false, "Some error occurred in payment. Missing trade ID.", []);
      }
    }

    if (tradeProposal) {
      // Process trading cards and cancel conflicting trades
      await processUnifiedTradingCardsSuccess(tradeProposal);

      // Send email notifications
      await sendUnifiedPaymentSuccessEmails(tradeProposal, tradeAmountAmount, transactionId, userId);

      // Send notifications
      if (paymentType === 'counter_offer' && tradeProposal.trade_status === 'counter_accepted') {
        await setTradersNotificationOnVariousActionBasis('payamount-proposal', tradeProposal.trade_sent_by!, tradeProposal.trade_sent_to!, tradeProposal.id!, 'Trade');
      }

      // Return success response
      const successMessage = paymentType === 'counter_offer' 
        ? `Payment Successful. Your Trans Id is: ${transactionId}`
        : 'Payment Successful.';

      return sendApiResponse(res, 200, true, successMessage, {
        trade_proposal_id: tradeProposal.id,
        payment_status: 'completed',
        transaction_id: transactionId,
        trade_amount: tradeAmountAmount,
        redirect_url: `/ongoing-trades/${tradeProposal.id}`
      });
    }

  } catch (error: any) {
    console.error('Unified payment success processor error:', error);
    return sendApiResponse(res, 500, false, `Payment processing failed: ${error.message}`, [], {
      redirect_url: '/ongoing-trades'
    });
  }
};

// Process trading cards for unified payment success function
const processUnifiedTradingCardsSuccess = async (tradeProposal: any) => {
  const sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',') : [];
  const receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',') : [];
  const allCards = [...sendCards, ...receiveCards];

  for (const cardId of allCards) {
    await markUnifiedCardAsTradedSuccess(cardId.trim());
    await cancelUnifiedConflictingTradesSuccess(cardId.trim(), tradeProposal.id);
  }
};

// Mark card as traded for unified payment success function
const markUnifiedCardAsTradedSuccess = async (cardId: string) => {
  const tradeCard = await TradingCard.findByPk(cardId);
  if (tradeCard) {
    await tradeCard.update({ is_traded: '1' });
  }
};

// Cancel conflicting trades for unified payment success function
const cancelUnifiedConflictingTradesSuccess = async (cardId: string, currentTradeId: number) => {
  const cancelTrades = await TradeProposal.findAll({
    where: {
      id: { [Op.ne]: currentTradeId },
      [Op.or]: [
        { send_cards: { [Op.like]: `%${cardId}%` } },
        { receive_cards: { [Op.like]: `%${cardId}%` } }
      ]
    }
  });

  for (const cancelTrade of cancelTrades) {
    if (cancelTrade.trade_status === 'new') {
      await cancelTrade.update({ trade_status: 'cancel' });
    }
  }
};

// Send payment success emails for unified function
const sendUnifiedPaymentSuccessEmails = async (tradeProposal: any, tradeAmountAmount: number, transactionId: string, userId: number) => {
  const sender = await User.findByPk(tradeProposal.trade_sent_by);
  const receiver = await User.findByPk(tradeProposal.trade_sent_to);

  if (!sender || !receiver) {
    console.error('Sender or receiver not found');
    return;
  }

  if (userId === sender.id) {
    // Email to sender - "payment-sent-for-trade"
    const mailInputsSender = {
      to: sender.email,
      name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      other_user_name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      trade_amount: tradeAmountAmount,
      transaction_id: tradeProposal.code,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
    };

    // Email to receiver - "payment-received-for-trade"
    const mailInputsReceiver = {
      to: receiver.email,
      name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      other_user_name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      trade_amount: tradeAmountAmount,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
      transaction_id: tradeProposal.code,
    };

    // Send emails using EmailHelperService
    try {
      await Promise.all([
        EmailHelperService.executeMailSender('payment-sent-for-trade', mailInputsSender),
        EmailHelperService.executeMailSender('payment-received-for-trade', mailInputsReceiver)
      ]);
      console.log('✅ Payment success emails sent (sender paid)');
    } catch (error) {
      console.error('❌ Failed to send payment success emails (sender paid):', error);
    }

    // Notification per Laravel __sendPaymentNotifications (act: payment-made-for-trade)
    await setTradersNotificationOnVariousActionBasis(
      'payment-made-for-trade',
      sender.id,
      receiver.id,
      tradeProposal.id,
      'Trade'
    );
  } else {
    // If receiver initiated payment (edge case), mirror emails and notification accordingly
    const mailInputsSender = {
      to: sender.email,
      name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      other_user_name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      trade_amount: tradeAmountAmount,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
      transaction_id: tradeProposal.code,
    };
    const mailInputsReceiver = {
      to: receiver.email,
      name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      other_user_name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      trade_amount: tradeAmountAmount,
      transaction_id: tradeProposal.code,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
    };
    try {
      await Promise.all([
        EmailHelperService.executeMailSender('payment-received-for-trade', mailInputsReceiver),
        EmailHelperService.executeMailSender('payment-sent-for-trade', mailInputsSender)
      ]);
      console.log('✅ Payment success emails sent (receiver paid)');
    } catch (error) {
      console.error('❌ Failed to send payment success emails (receiver paid):', error);
    }

    await setTradersNotificationOnVariousActionBasis(
      'payment-made-for-trade',
      receiver.id,
      sender.id,
      tradeProposal.id,
      'Trade'
    );
  }

  if (userId === receiver.id) {
    // Email to receiver - "payment-sent-for-trade"
    const mailInputsReceiver = {
      to: receiver.email,
      name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      other_user_name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      trade_amount: tradeAmountAmount,
      transaction_id: tradeProposal.code,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
    };

    // Email to sender - "payment-received-for-trade"
    const mailInputsSender = {
      to: sender.email,
      name: EmailHelperService.setName(sender.first_name || '', sender.last_name || ''),
      other_user_name: EmailHelperService.setName(receiver.first_name || '', receiver.last_name || ''),
      trade_amount: tradeAmountAmount,
      viewTransactionDeatilsLink: `${process.env.FRONTEND_URL}/ongoing-trades/${tradeProposal.id}`,
      transaction_id: tradeProposal.code,
    };

    // Send emails using EmailHelperService
    try {
      await Promise.all([
        EmailHelperService.executeMailSender('payment-sent-for-trade', mailInputsReceiver),
        EmailHelperService.executeMailSender('payment-received-for-trade', mailInputsSender)
      ]);
      console.log('✅ Payment success emails sent (receiver paid)');
    } catch (error) {
      console.error('❌ Failed to send payment success emails (receiver paid):', error);
    }
  }

  // Send payment notifications
  await sendPaymentNotifications(tradeProposal);
};

// Send payment notifications helper
const sendPaymentNotifications = async (tradeProposal: any) => {
  try {
    await TradeNotification.create({
      notification_sent_by: tradeProposal.trade_sent_by,
      notification_sent_to: tradeProposal.trade_sent_to,
      trade_proposal_id: tradeProposal.id,
      message: "Payment has been completed successfully for the trade."
    } as any);

    await TradeNotification.create({
      notification_sent_by: tradeProposal.trade_sent_to,
      notification_sent_to: tradeProposal.trade_sent_by,
      trade_proposal_id: tradeProposal.id,
      message: "Payment has been completed successfully for the trade."
    } as any);

    console.log('Payment notifications sent successfully');
  } catch (error: any) {
    console.error('Error sending payment notifications:', error);
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
    console.log('🔄 Setting trade status to trade-accepted for trade proposal:', tradeProposal.id);
    const statusResult = await setTradeProposalStatus(tradeProposal.id, 'trade-accepted');
    console.log('📊 Status update result for trade-accepted:', statusResult);
    
    if (!statusResult.success) {
      console.error('❌ Failed to update trade status to trade-accepted:', statusResult.error);
      
      // Fallback: Direct status update
      console.log('🔄 Attempting direct status update for trade-accepted...');
      const { TradeProposalStatus } = await import('../models/tradeProposalStatus.model.js');
      const tradeAcceptedStatus = await TradeProposalStatus.findOne({
        where: { alias: 'trade-accepted' }
      });
      
      if (tradeAcceptedStatus) {
        await TradeProposal.update(
          { trade_proposal_status_id: tradeAcceptedStatus.id },
          { where: { id: tradeProposal.id } }
        );
        console.log('✅ Direct status update completed for trade-accepted');
      } else {
        console.error('❌ Trade-accepted status not found in database');
      }
    } else {
      console.log('✅ Trade status updated successfully to trade-accepted');
    }

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
